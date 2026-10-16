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
const logicalToPage = async (targetPage, point) => {
  const current = await targetPage.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
  const bounds = await targetPage.locator("canvas").boundingBox();
  if (!bounds) throw new Error("Onboarding E2E: canvas bounds are unavailable");
  return {
    x: bounds.x + current.viewportTransform.offsetX + point.x * current.viewportTransform.scale,
    y: bounds.y + current.viewportTransform.offsetY + point.y * current.viewportTransform.scale,
  };
};
const clickTarget = async (targetPage, name) => {
  const current = await targetPage.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
  const hit = current.interactionTargets?.targets?.[name]?.hit;
  if (!hit) throw new Error(`Onboarding E2E: missing ${name} interaction target`);
  const point = await logicalToPage(targetPage, {
    x: hit.x + hit.width / 2,
    y: hit.y + hit.height / 2,
  });
  await targetPage.mouse.click(point.x, point.y);
};
const assertOpeningGuide = (guide, openingDrag, label) => {
  if (!guide?.points?.[1] || guide.blockId !== openingDrag.blockId) {
    throw new Error(`Onboarding E2E: ${label} guide does not target the verified opening block`);
  }
  if (guide.origins.length !== openingDrag.path.length + 1
    || guide.points.length !== openingDrag.path.length + 1
    || JSON.stringify(guide.origins.slice(1)) !== JSON.stringify(openingDrag.path)) {
    throw new Error(`Onboarding E2E: ${label} guide path does not match the verified opening route`);
  }
  if (openingDrag.exitSide && openingDrag.exitSide !== "right") {
    throw new Error(`Onboarding E2E: ${label} opening exit changed unexpectedly`);
  }
};
const performOpeningGesture = async (targetPage, guide, openingDrag) => {
  const start = await logicalToPage(targetPage, guide.start);
  if (openingDrag.path.length === 0) {
    await targetPage.mouse.click(start.x, start.y);
    return;
  }
  await targetPage.mouse.move(start.x, start.y);
  await targetPage.mouse.down();
  for (const point of guide.points.slice(1)) {
    const pagePoint = await logicalToPage(targetPage, point);
    await targetPage.mouse.move(pagePoint.x, pagePoint.y, { steps: 3 });
  }
  await targetPage.mouse.up();
};
const openFreshLevelOne = async () => {
  await page.goto(playtestUrl, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => {
    const current = window.__COLOR_ESCAPE__?.getDebugState();
    return current?.art.ready && current.screen === "playing";
  });
};

await openFreshLevelOne();
let current = await state();
if (current.screen !== "playing" || current.onboarding.basicsSeen || current.puzzle.started) {
  throw new Error("Onboarding E2E: fresh level one did not show an unconsumed idle tutorial");
}
await page.screenshot({ path: shot("round14-onboarding-idle.png") });

// Follow the first verified route instead of assuming a color or grid cell.
// The renderer exposes the authored origin path, so the browser can replay
// either a direct exit or a short opening reposition without guessing cells.
const openingDrag = await page.evaluate(async () => {
  const [{ LEVELS }, { solveLevelForValidation }] = await Promise.all([
    import("/src/core/levels.ts"),
    import("/src/core/levelSolver.ts"),
  ]);
  return solveLevelForValidation(LEVELS[0]).drags[0];
});
if (!openingDrag) throw new Error("Onboarding E2E: level one has no verified opening action");

const guide = current.onboarding.guide;
assertOpeningGuide(guide, openingDrag, "496x1078");
const openingBlockCount = current.puzzle.blocks.length;

await performOpeningGesture(page, guide, openingDrag);
await page.waitForTimeout(100);
current = await state();
if (!current.onboarding.basicsSeen || !current.puzzle.started || current.onboarding.guide
  || current.puzzle.moves !== 1 || current.puzzle.blocks.length !== openingBlockCount - 1
  || current.puzzle.blocks.some((block) => block.id === openingDrag.blockId)
  || current.activePointer != null || current.selectedId != null) {
  throw new Error("Onboarding E2E: guided opening did not complete and persist the tutorial");
}
await page.screenshot({ path: shot("round14-onboarding-after-opening.png") });

await page.reload({ waitUntil: "networkidle" });
await page.waitForFunction(() => {
  const current = window.__COLOR_ESCAPE__?.getDebugState();
  return current?.art.ready && current.screen === "playing";
});
current = await state();
if (current.screen !== "playing" || !current.onboarding.basicsSeen || current.onboarding.guide) {
  throw new Error("Onboarding E2E: tutorial completion did not persist cleanly across reload");
}
await page.screenshot({ path: shot("round14-onboarding-returning-player.png") });

// The direct-exit guide and its touch target must stay aligned at the minimum viewport.
const small = await browser.newPage({ viewport: { width: 320, height: 568 } });
await small.goto(playtestUrl, { waitUntil: "networkidle" });
await small.evaluate(() => localStorage.clear());
await small.reload({ waitUntil: "networkidle" });
await small.waitForFunction(() => {
  const current = window.__COLOR_ESCAPE__?.getDebugState();
  return current?.art.ready && current.screen === "playing";
});
const smallState = await small.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const smallBlock = smallState.puzzle.blocks.find((block) => block.id === openingDrag.blockId);
if (!smallBlock) throw new Error(`Onboarding E2E: 320x568 is missing ${openingDrag.blockId}`);
const smallGuide = smallState.onboarding.guide;
assertOpeningGuide(smallGuide, openingDrag, "320x568");
await small.screenshot({ path: shot("round14-onboarding-idle-320x568.png") });
const smallOpeningBlockCount = smallState.puzzle.blocks.length;
await performOpeningGesture(small, smallGuide, openingDrag);
await small.waitForTimeout(100);
const smallAfterExit = await small.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
if (!smallAfterExit.onboarding.basicsSeen || !smallAfterExit.puzzle.started || smallAfterExit.onboarding.guide
  || smallAfterExit.puzzle.moves !== 1 || smallAfterExit.puzzle.blocks.length !== smallOpeningBlockCount - 1
  || smallAfterExit.puzzle.blocks.some((block) => block.id === openingDrag.blockId)) {
  throw new Error("Onboarding E2E: 320x568 guided opening did not complete the tutorial");
}
await small.screenshot({ path: shot("round14-onboarding-after-opening-320x568.png") });
await small.close();

await context.close();
await browser.close();
if (errors.length) throw new Error(`Onboarding browser errors:\n${errors.join("\n")}`);
console.log("Guided opening gesture, completion persistence, reload behavior, and 320x568 onboarding passed.");
