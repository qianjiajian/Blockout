import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, "playtest-results", "strategy-nudge");
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
const ids = [60, 70, 78, 80, 88, 90, 98];
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 496, height: 1078 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));
await page.goto(playtestUrl, { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready === true);

const stale = await page.evaluate(async (levelIds) => {
  const { LEVELS } = await import("/src/core/levels.ts");
  return LEVELS.filter((level) => levelIds.includes(level.id))
    .filter((level) => level.strategyNudge || level.strategyFocus)
    .map((level) => ({
      id: level.id,
      strategyNudge: level.strategyNudge,
      strategyFocus: level.strategyFocus,
    }));
}, ids);
if (stale.length) {
  throw new Error(`Strategy nudge E2E: formal campaign retained stale authored hints ${JSON.stringify(stale)}`);
}

for (const sample of [
  { id: 80, width: 496, height: 1078, suffix: "standard" },
  { id: 98, width: 320, height: 568, suffix: "mobile" },
]) {
  await page.setViewportSize({ width: sample.width, height: sample.height });
  await page.evaluate((levelId) => window.__COLOR_ESCAPE__.loadLevel(levelId, true), sample.id);
  await page.waitForTimeout(180);
  const state = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
  if (
    state.screen !== "playing"
    || state.level.id !== sample.id
    || state.strategyNudge.visible
    || state.strategyNudge.guide
    || state.strategyFocus.visible
    || state.strategyFocus.configuredBlockId
  ) {
    throw new Error(`Strategy nudge E2E: Lv${sample.id} rendered a stale formal guide ${JSON.stringify({
      screen: state.screen,
      strategyNudge: state.strategyNudge,
      strategyFocus: state.strategyFocus,
    })}`);
  }
  await page.screenshot({ path: resolve(output, `formal-lv${sample.id}-${sample.suffix}.png`) });
}

await browser.close();
if (errors.length) throw new Error(`Strategy nudge browser errors:\n${errors.join("\n")}`);
console.log("Formal Lv11-Lv100 strategy-nudge compatibility passed with no stale route IDs.");
