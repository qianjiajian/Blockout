import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const rootPath = fileURLToPath(new URL("../playtest-results/", import.meta.url));
const shot = (name) => resolve(rootPath, name);
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(rootPath, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 496, height: 1078 } });
const page = await context.newPage();
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));

const state = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const openFreshLevelOne = async () => {
  await page.goto(playtestUrl, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(250);
  await page.mouse.click(248, 852);
  await page.waitForTimeout(120);
};

await openFreshLevelOne();
let current = await state();
if (current.screen !== "playing" || current.onboarding.basicsSeen || current.puzzle.started) {
  throw new Error("Onboarding E2E: fresh level one did not show an unconsumed idle tutorial");
}
await page.screenshot({ path: shot("round14-onboarding-idle.png") });

// Level layouts are intentionally re-authored during difficulty iteration.
// Follow the first verified route instead of assuming a color or grid cell.
const openingDrag = await page.evaluate(async () => {
  const [{ LEVELS }, { solveLevelForValidation }] = await Promise.all([
    import("/src/core/levels.ts"),
    import("/src/core/levelSolver.ts"),
  ]);
  return solveLevelForValidation(LEVELS[0]).drags.find((drag) => drag.path.length > 0);
});
if (!openingDrag) throw new Error("Onboarding E2E: level one has no legal opening movement");

const guide = current.onboarding.guide;
if (!guide || guide.blockId !== openingDrag.blockId) {
  throw new Error("Onboarding E2E: rendered guide does not target the verified opening block");
}
if (JSON.stringify(guide.origins.slice(1)) !== JSON.stringify(openingDrag.path)) {
  throw new Error("Onboarding E2E: rendered guide path is stale relative to the verified opening drag");
}
const start = guide.start;
const target = guide.end;
const firstGuideStep = guide.points[1];

// A tap is not proof of understanding: the hand and instruction must survive it.
await page.mouse.click(start.x, start.y);
await page.waitForTimeout(100);
current = await state();
if (current.onboarding.basicsSeen || current.puzzle.started || current.puzzle.moves !== 0) {
  throw new Error("Onboarding E2E: a no-move tap consumed the tutorial");
}
await page.screenshot({ path: shot("round14-onboarding-after-tap.png") });

// The first real grid movement dismisses and persists the contextual tutorial.
await page.mouse.move(start.x, start.y);
await page.mouse.down();
await page.mouse.move(
  start.x + (firstGuideStep.x - start.x) * 0.5,
  start.y + (firstGuideStep.y - start.y) * 0.5,
  { steps: 3 },
);
await page.waitForTimeout(80);
current = await state();
if (current.onboarding.basicsSeen || current.puzzle.started || current.puzzle.moves !== 0 || !current.onboarding.guide) {
  throw new Error("Onboarding E2E: a half-cell drag consumed the tutorial before the first legal grid move");
}
await page.mouse.move(target.x, target.y, { steps: 5 });
await page.waitForTimeout(80);
current = await state();
if (!current.onboarding.basicsSeen || !current.puzzle.started || current.onboarding.guide) {
  throw new Error("Onboarding E2E: first valid movement did not consume the tutorial");
}
await page.screenshot({ path: shot("round14-onboarding-after-first-move.png") });
await page.mouse.up();

await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(200);
await page.mouse.click(248, 852);
await page.waitForTimeout(120);
current = await state();
if (current.screen !== "playing" || !current.onboarding.basicsSeen || current.puzzle.started || current.onboarding.guide) {
  throw new Error("Onboarding E2E: tutorial completion did not persist cleanly across reload");
}
await page.screenshot({ path: shot("round14-onboarding-returning-player.png") });

// The same no-move behavior must hold at the minimum supported viewport.
const small = await browser.newPage({ viewport: { width: 320, height: 568 } });
await small.goto(playtestUrl, { waitUntil: "networkidle" });
await small.evaluate(() => localStorage.clear());
await small.reload({ waitUntil: "networkidle" });
await small.waitForTimeout(220);
const scale = 568 / 1078;
const offsetX = (320 - 496 * scale) / 2;
await small.mouse.click(offsetX + 248 * scale, 852 * scale);
await small.waitForTimeout(120);
const smallState = await small.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const smallBlock = smallState.puzzle.blocks.find((block) => block.id === openingDrag.blockId);
if (!smallBlock) throw new Error(`Onboarding E2E: 320x568 is missing ${openingDrag.blockId}`);
const smallGuide = smallState.onboarding.guide;
if (!smallGuide || smallGuide.blockId !== openingDrag.blockId) {
  throw new Error("Onboarding E2E: 320x568 guide does not target the verified opening block");
}
const smallStartX = offsetX + smallGuide.start.x * scale;
const smallStartY = smallGuide.start.y * scale;
await small.mouse.click(smallStartX, smallStartY);
await small.waitForTimeout(100);
const smallAfterTap = await small.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
if (smallAfterTap.onboarding.basicsSeen || smallAfterTap.puzzle.started) {
  throw new Error("Onboarding E2E: 320x568 no-move tap consumed the tutorial");
}
await small.screenshot({ path: shot("round14-onboarding-after-tap-320x568.png") });
await small.close();

await context.close();
await browser.close();
if (errors.length) throw new Error(`Onboarding browser errors:\n${errors.join("\n")}`);
console.log("Idle tap retention, first-move dismissal, reload persistence, and 320x568 onboarding passed.");
