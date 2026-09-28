import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, "playtest-results", "boss-redesign");
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
const bossIds = [60, 70, 80, 90, 100];
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 496, height: 1078 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));
await page.goto(playtestUrl, { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready === true);

const bosses = await page.evaluate(async (ids) => {
  const { LEVELS } = await import("/src/core/levels.ts");
  return ids.map((id) => {
    const level = LEVELS[id - 1];
    return {
      id,
      name: level.name,
      target: level.designTargets?.calibratedDifficulty,
      floor: level.designTargets?.minimumRepositionOverhead,
      clearLoad: level.blocks.reduce((sum, block) => sum + (block.layers?.length ?? 1), 0),
      profile: JSON.stringify({
        board: [level.width, level.height, level.playable],
        blocks: level.blocks.map((block) => [block.x, block.y, block.shape]),
        stages: level.shutters?.map((shutter) => [shutter.skin, shutter.count]) ?? [],
        elevators: level.elevators?.length ?? 0,
        conveyors: level.conveyors?.length ?? 0,
        stars: level.blocks.filter((block) => block.star).length,
      }),
    };
  });
}, bossIds);

if (new Set(bosses.map((boss) => boss.profile)).size !== bossIds.length) {
  throw new Error("Boss redesign E2E: finale layouts are not distinct");
}
if (JSON.stringify(bosses.map((boss) => boss.clearLoad)) !== JSON.stringify([35, 36, 38, 40, 42])) {
  throw new Error(`Boss redesign E2E: clear-load ramp drifted ${JSON.stringify(bosses)}`);
}
for (let index = 0; index < bosses.length; index += 1) {
  const boss = bosses[index];
  if (boss.floor < 5 || (index > 0 && boss.target <= bosses[index - 1].target)) {
    throw new Error(`Boss redesign E2E: Lv${boss.id} target ramp drifted ${JSON.stringify(bosses)}`);
  }
  await page.evaluate((levelId) => window.__COLOR_ESCAPE__.loadLevel(levelId, true), boss.id);
  await page.waitForTimeout(180);
  const state = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
  if (state.screen !== "playing" || state.level.id !== boss.id || state.board.cell <= 0) {
    throw new Error(`Boss redesign E2E: Lv${boss.id} did not render`);
  }
  await page.screenshot({ path: resolve(output, `formal-lv${boss.id}.png`) });
}

await browser.close();
if (errors.length) throw new Error(`Boss redesign browser errors:\n${errors.join("\n")}`);
console.log("Five formal chapter finales passed distinct-layout, workload-ramp, and rendering checks.");
