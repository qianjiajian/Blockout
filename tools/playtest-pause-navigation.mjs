import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/", import.meta.url));
const shot = (name) => resolve(output, name);
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 496, height: 1078 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));
const debug = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const clickInteractionTarget = async (name, targetPage = page) => {
  const state = await targetPage.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
  const hit = state.interactionTargets?.targets?.[name]?.hit;
  const transform = state.viewportTransform;
  const canvas = await targetPage.locator("canvas").boundingBox();
  if (!hit || !transform || !canvas) throw new Error(`Pause E2E: missing ${name} target or canvas bounds`);
  await targetPage.mouse.click(
    canvas.x + transform.offsetX + (hit.x + hit.width / 2) * transform.scale,
    canvas.y + transform.offsetY + (hit.y + hit.height / 2) * transform.scale,
  );
};

await page.goto(playtestUrl, { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle" });
await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(2, true));
await page.waitForTimeout(120);

// Restart must restore a moved puzzle rather than only closing the modal.
let state = await debug();
const board = state.board;
const point = (x, y) => ({ x: board.innerX + (x + 0.5) * board.cell, y: board.innerY + (y + 0.5) * board.cell });
const openingDrag = await page.evaluate(async () => {
  const [{ getLevel }, { solveLevelForValidation }] = await Promise.all([
    import("/src/core/levels.ts"),
    import("/src/core/levelSolver.ts"),
  ]);
  return solveLevelForValidation(getLevel(2)).drags.find((drag) => !drag.exitSide && drag.path.length > 0);
});
if (!openingDrag) throw new Error("Pause E2E: level 2 has no setup drag for restart coverage");
const openingBlock = state.puzzle.blocks.find((block) => block.id === openingDrag.blockId);
if (!openingBlock) throw new Error(`Pause E2E: missing setup block ${openingDrag.blockId}`);
const openingOrigin = { x: openingBlock.x, y: openingBlock.y };
const [anchorX, anchorY] = openingBlock.shape[0];
const start = point(openingBlock.x + anchorX, openingBlock.y + anchorY);
await page.mouse.move(start.x, start.y);
await page.mouse.down();
for (const [targetX, targetY] of openingDrag.path) {
  const target = point(targetX + anchorX, targetY + anchorY);
  await page.mouse.move(target.x, target.y, { steps: 6 });
}
await page.mouse.up();
state = await debug();
if (state.puzzle.moves !== 1) throw new Error(`Pause E2E: setup move was not committed ${JSON.stringify({
  openingDrag,
  block: state.puzzle.blocks.find((candidate) => candidate.id === openingDrag.blockId),
  dragMotion: state.dragMotion,
  board,
  viewportTransform: state.viewportTransform,
})}`);

await clickInteractionTarget("pause");
state = await debug();
if (state.screen !== "paused") throw new Error("Pause E2E: pause modal did not open");
await page.screenshot({ path: shot("round16-pause-three-actions.png") });
await clickInteractionTarget("pauseRestart");
state = await debug();
const resetBlock = state.puzzle.blocks.find((block) => block.id === openingDrag.blockId);
if (state.screen !== "playing" || state.puzzle.moves !== 0
  || resetBlock?.x !== openingOrigin.x || resetBlock?.y !== openingOrigin.y) {
  throw new Error("Pause E2E: restart did not restore the current level");
}

// Normal play can always return to its selected level on the home screen.
await clickInteractionTarget("pause");
await clickInteractionTarget("pauseHome");
state = await debug();
if (state.screen !== "home" || state.level.id !== 2) {
  throw new Error("Pause E2E: normal return-home action is incorrect");
}

await page.close();

// Minimum viewport: all three actions must remain readable and the home target clickable.
const small = await browser.newPage({ viewport: { width: 320, height: 568 } });
await small.goto(playtestUrl, { waitUntil: "networkidle" });
await small.evaluate(() => localStorage.clear());
await small.reload({ waitUntil: "networkidle" });
await small.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(1, true));
await small.waitForTimeout(120);
await clickInteractionTarget("pause", small);
let smallState = await small.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
if (smallState.screen !== "paused") throw new Error("Pause E2E: 320x568 pause modal did not open");
await small.screenshot({ path: shot("round16-pause-three-actions-320x568.png") });
await clickInteractionTarget("pauseHome", small);
smallState = await small.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
if (smallState.screen !== "home") throw new Error("Pause E2E: 320x568 home action was not clickable");
await small.close();

await browser.close();
if (errors.length) throw new Error(`Pause navigation browser errors:\n${errors.join("\n")}`);
console.log("Pause resume/restart/home hierarchy and 320x568 navigation passed.");
