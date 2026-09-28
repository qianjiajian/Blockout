import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, "playtest-results", "strategy-focus");
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 496, height: 1078 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));
await page.goto(playtestUrl, { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready === true);

for (const levelId of [70, 80, 98]) {
  await page.evaluate((id) => {
    window.__COLOR_ESCAPE__.loadLevel(id, true);
    // Exercise the post-threshold rendering branch. Formal v5 levels removed
    // obsolete route-specific hints, so no phantom focus may appear.
    window.__COLOR_ESCAPE__.noClearMoveStreak = 20;
  }, levelId);
  await page.waitForTimeout(180);
  const state = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
  if (
    state.screen !== "playing"
    || state.level.id !== levelId
    || state.strategyFocus.configuredBlockId
    || state.strategyFocus.visible
    || state.strategyNudge.visible
  ) {
    throw new Error(`Strategy focus E2E: Lv${levelId} exposed an obsolete route-specific hint ${JSON.stringify({
      strategyFocus: state.strategyFocus,
      strategyNudge: state.strategyNudge,
    })}`);
  }
  await page.screenshot({ path: resolve(output, `formal-lv${levelId}-no-stale-focus.png`) });
}

await browser.close();
if (errors.length) throw new Error(`Strategy focus browser errors:\n${errors.join("\n")}`);
console.log("Formal strategy-focus threshold compatibility passed on Lv70, Lv80, and Lv98.");
