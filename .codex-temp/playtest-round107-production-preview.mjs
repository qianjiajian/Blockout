import { chromium } from "playwright";

const url = "http://127.0.0.1:5178/";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 496, height: 1078 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));

await page.goto(url, { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle" });
await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready, undefined, { timeout: 5_000 });
await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(1, true, false));

let state = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
if (state.screen !== "playing" || state.level.id !== 1 || state.puzzle.playable.length !== 25
  || state.puzzle.blocked.length !== 0 || state.puzzle.blocks.length !== 2 || state.level.gates.length !== 2) {
  throw new Error(`Round107 production preview has the wrong Lv1 state: ${JSON.stringify(state.level)}`);
}
const guide = state.onboarding.guide;
if (!guide || guide.points.length < 2) throw new Error("Round107 production preview is missing the first-drag guide");

await page.mouse.move(guide.start.x, guide.start.y);
await page.mouse.down();
await page.mouse.move(
  guide.start.x + (guide.points[1].x - guide.start.x) * 0.5,
  guide.start.y + (guide.points[1].y - guide.start.y) * 0.5,
  { steps: 3 },
);
state = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
if (state.onboarding.basicsSeen || state.puzzle.started || state.puzzle.moves !== 0 || !state.onboarding.guide) {
  throw new Error("Round107 production preview consumed the guide on a half-cell drag");
}

await page.mouse.move(guide.end.x, guide.end.y, { steps: 6 });
state = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
if (!state.onboarding.basicsSeen || !state.puzzle.started || state.puzzle.moves !== 1 || state.onboarding.guide) {
  throw new Error("Round107 production preview did not consume the guide on the first valid grid drag");
}
await page.screenshot({ path: ".codex-temp/round107-production-preview-after-first-drag.png" });
await page.mouse.up();

await browser.close();
if (errors.length) throw new Error(`Round107 production preview browser errors:\n${errors.join("\n")}`);
console.log("Round107 production preview passed: Lv1 25/25 cells, 2 blocks/2 exits, half-cell retention, first-grid dismissal.");
