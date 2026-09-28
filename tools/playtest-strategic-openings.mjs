import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, "playtest-results", "strategic-openings");
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
const sampleIds = [19, 20, 39, 49, 58, 68, 78, 88, 98, 100];
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 496, height: 1078 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));
await page.goto(playtestUrl, { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready === true);

const audits = await page.evaluate(async (ids) => {
  const [{ LEVELS }, { openingStrategyMetrics }] = await Promise.all([
    import("/src/core/levels.ts"),
    import("/src/core/levelStrategyMetrics.ts"),
  ]);
  return ids.map((id) => {
    const level = LEVELS[id - 1];
    const clearLoad = level.blocks.reduce((sum, block) => sum + (block.layers?.length ?? 1), 0);
    return {
      id,
      metrics: openingStrategyMetrics(level),
      clearLoad,
      parMoves: level.parMoves,
      target: level.designTargets?.calibratedDifficulty,
      floor: level.designTargets?.minimumRepositionOverhead,
    };
  });
}, sampleIds);

for (const audit of audits) {
  if (
    audit.metrics.active < 8
    || audit.metrics.contacts < 5
    || audit.metrics.directClearable >= audit.metrics.active
    || audit.metrics.directClearable + audit.metrics.oneStepMovable < 1
    || audit.floor < 5
    || audit.parMoves - audit.clearLoad < audit.floor
  ) {
    throw new Error(`Strategic openings E2E: Lv${audit.id} failed the formal opening contract ${JSON.stringify(audit)}`);
  }
}

for (const id of [19, 58, 78, 98, 100]) {
  await page.evaluate((levelId) => window.__COLOR_ESCAPE__.loadLevel(levelId, true), id);
  await page.waitForTimeout(160);
  const state = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
  if (state.screen !== "playing" || state.level.id !== id || state.board.cell <= 0) {
    throw new Error(`Strategic openings E2E: Lv${id} failed to render`);
  }
  await page.screenshot({ path: resolve(output, `formal-lv${String(id).padStart(3, "0")}.png`) });
}

await browser.close();
if (errors.length) throw new Error(`Strategic openings browser errors:\n${errors.join("\n")}`);
console.log(`Formal strategic openings passed ${audits.length}/${sampleIds.length} sampled levels.`);
