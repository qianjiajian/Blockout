import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/", import.meta.url));
const shot = (name) => resolve(output, name);
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const errors = [];
const context = await browser.newContext({
  viewport: { width: 496, height: 1078 },
  reducedMotion: "reduce",
});
const page = await context.newPage();
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));
const debug = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const clickInteractionTarget = async (name, targetPage = page) => {
  const state = await targetPage.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
  const hit = state.interactionTargets?.targets?.[name]?.hit;
  const canvas = await targetPage.locator("canvas").boundingBox();
  if (!hit || !canvas) throw new Error(`Reduced-motion E2E: missing ${name} target or canvas bounds`);
  await targetPage.mouse.click(
    canvas.x + state.viewportTransform.offsetX + (hit.x + hit.width / 2) * state.viewportTransform.scale,
    canvas.y + state.viewportTransform.offsetY + (hit.y + hit.height / 2) * state.viewportTransform.scale,
  );
};
const waitForArtReady = (target = page) => target.waitForFunction(
  () => window.__COLOR_ESCAPE__?.getDebugState().art.ready,
  undefined,
  { timeout: 5_000 },
);
const activeBlockPoint = (state) => {
  const block = state.puzzle.blocks.find((candidate) => candidate.frozen === 0 && !candidate.shutterId);
  if (!block) throw new Error("Reduced-motion E2E: no active rocket target");
  const [anchorX, anchorY] = block.shape[0];
  return {
    x: state.board.innerX + (block.x + anchorX + 0.5) * state.board.cell,
    y: state.board.innerY + (block.y + anchorY + 0.5) * state.board.cell,
  };
};

await page.goto(playtestUrl, { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle" });
await waitForArtReady();
const levelOneSolution = await page.evaluate(async () => {
  const [{ getLevel }, { solveLevelForValidation }] = await Promise.all([
    import("/src/core/levels.ts"),
    import("/src/core/levelSolver.ts"),
  ]);
  return solveLevelForValidation(getLevel(1));
});
if (!levelOneSolution.solved) throw new Error("Reduced-motion E2E: current level 1 has no verified completion route");
let state = await debug();
if (!state.settings.reducedMotion) {
  throw new Error("Reduced-motion E2E: a fresh install did not inherit the browser preference");
}
// Preserve the fresh-install preference while advancing to a legitimate
// rocket-unlocked account. The test is about presentation budgets, not the
// progressive Lv 7 booster gate covered by playtest-booster-unlocks.mjs.
await page.evaluate(() => {
  const key = "color-escape-save-v1";
  const save = JSON.parse(localStorage.getItem(key));
  save.currentLevel = 1;
  save.highestLevel = 10;
  // Keep Lv 1 unclaimed so the same fixture can still verify the first-clear
  // reduced-motion transition after the rocket presentation checks.
  save.rewardedLevels = Array.from({ length: 8 }, (_, index) => index + 2);
  save.bestStars = Object.fromEntries(save.rewardedLevels.map((level) => [String(level), 3]));
  save.bestMoves = Object.fromEntries(save.rewardedLevels.map((level) => [String(level), 8]));
  localStorage.setItem(key, JSON.stringify(save));
});
await page.reload({ waitUntil: "networkidle" });
await waitForArtReady();
state = await debug();
if (!state.settings.reducedMotion || state.progression.highestLevel !== 10) {
  throw new Error("Reduced-motion E2E: unlocked fixture did not preserve the inherited preference");
}

// The pause surface exposes the preference and a manual override survives reload.
await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(1, true));
await clickInteractionTarget("pause");
state = await debug();
if (state.screen !== "paused") throw new Error("Reduced-motion E2E: pause modal did not open");
await page.screenshot({ path: shot("round20-reduced-motion-pause.png") });
await clickInteractionTarget("pause.reducedMotion");
state = await debug();
if (state.settings.reducedMotion) throw new Error("Reduced-motion E2E: manual opt-out failed");
await page.reload({ waitUntil: "networkidle" });
await waitForArtReady();
state = await debug();
if (state.settings.reducedMotion) {
  throw new Error("Reduced-motion E2E: system preference overrode the persisted manual choice");
}

await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(1, true));
await clickInteractionTarget("pause");
await clickInteractionTarget("pause.reducedMotion");
state = await debug();
if (!state.settings.reducedMotion) throw new Error("Reduced-motion E2E: manual opt-in failed");
await page.reload({ waitUntil: "networkidle" });
await waitForArtReady();
state = await debug();
if (!state.settings.reducedMotion) throw new Error("Reduced-motion E2E: manual opt-in did not persist");

// The same causal rocket feedback remains visible with substantially fewer particles.
await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(1, true));
await clickInteractionTarget("booster.rocket");
state = await debug();
await page.mouse.click(...Object.values(activeBlockPoint(state)));
state = await debug();
const reducedParticles = state.particles;
if (reducedParticles < 2 || reducedParticles > 7 || state.boardShakeTime !== 0) {
  throw new Error(`Reduced-motion E2E: reduced effect budget is incorrect (${reducedParticles} particles)`);
}
await page.screenshot({ path: shot("round20-reduced-motion-rocket.png") });

// Turning the preference off restores the full presentation budget.
await page.reload({ waitUntil: "networkidle" });
await waitForArtReady();
await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(1, true));
await clickInteractionTarget("pause");
await clickInteractionTarget("pause.reducedMotion");
await clickInteractionTarget("pauseResume");
await clickInteractionTarget("booster.rocket");
state = await debug();
await page.mouse.click(...Object.values(activeBlockPoint(state)));
state = await debug();
if (state.particles < 26) {
  throw new Error(`Reduced-motion E2E: full effect budget was not restored (${state.particles} particles)`);
}

// Reduced mode keeps the required Lv1→2 direct transition, but compresses it
// to the accessibility timing budget instead of opening a result modal.
await page.reload({ waitUntil: "networkidle" });
await waitForArtReady();
await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(1, true));
await clickInteractionTarget("pause");
await clickInteractionTarget("pause.reducedMotion");
await clickInteractionTarget("pauseResume");
  const performDrag = async (drag, settleDelay) => {
  const live = await debug();
  const block = live.puzzle.blocks.find((candidate) => candidate.id === drag.blockId);
  if (!block) throw new Error(`Reduced-motion E2E: missing route block ${drag.blockId}`);
  const directExit = drag.path.length === 0 && Boolean(drag.exitSide);
  const [anchorX, anchorY] = directExit
    ? [
      block.shape.reduce((sum, [x]) => sum + x, 0) / block.shape.length,
      block.shape.reduce((sum, [, y]) => sum + y, 0) / block.shape.length,
    ]
    : block.shape[0];
  const canvas = await page.locator("canvas").boundingBox();
  if (!canvas) throw new Error("Reduced-motion E2E: game canvas has no browser bounds");
  const point = (x, y) => {
    const logicalX = live.board.innerX + (x + anchorX + 0.5) * live.board.cell;
    const logicalY = live.board.innerY + (y + anchorY + 0.5) * live.board.cell;
    return {
      x: canvas.x + live.viewportTransform.offsetX + logicalX * live.viewportTransform.scale,
      y: canvas.y + live.viewportTransform.offsetY + logicalY * live.viewportTransform.scale,
    };
  };
  const start = point(block.x, block.y);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (const [x, y] of drag.path) {
    const target = point(x, y);
    await page.mouse.move(target.x, target.y, { steps: 3 });
  }
  if (drag.exitSide) {
    const held = await debug();
    const remaining = held.puzzle.blocks.find((candidate) => candidate.id === drag.blockId);
    const expectedLayers = Math.max(0, block.layers.length - 1);
    if (held.selectedId || held.activePointer !== undefined
      || (expectedLayers === 0 && remaining)
      || (expectedLayers > 0 && (!remaining || remaining.layers.length !== expectedLayers))) {
      throw new Error(`Reduced-motion E2E: ${drag.blockId} did not resolve while the pointer stayed down: ${JSON.stringify({
        drag,
        screenBefore: live.screen,
        artReadyBefore: live.art.ready,
        completeBefore: live.puzzle.complete,
        exitGhostsBefore: live.exitGhosts,
        pendingCelebrationBefore: live.pendingCelebration,
        boosterUnlockBefore: live.boosterUnlock,
        boardBefore: live.board,
        viewportTransformBefore: live.viewportTransform,
        start,
        selectedId: held.selectedId,
        activePointer: held.activePointer,
        dragMotion: held.dragMotion,
        remaining,
      })}`);
    }
  }
  await page.mouse.up();
  await page.waitForTimeout(settleDelay ?? (drag.exitSide ? 150 : 30));
};
for (const [index, drag] of levelOneSolution.drags.entries()) {
  await performDrag(drag, index === levelOneSolution.drags.length - 1 ? 20 : undefined);
}
await page.waitForFunction(() => {
  const state = window.__COLOR_ESCAPE__?.getDebugState();
  return state?.screen === "playing" && state.completionFlow.directTransition?.fromLevel === 1
    && state.settlement.status === "committed";
}, undefined, { timeout: 10_000 });
state = await debug();
if (state.screen !== "playing" || state.level.id !== 1 || !state.settings.reducedMotion
  || !state.completionFlow.directTransition.reducedMotion
  || state.completionFlow.directTransition.toLevel !== 2 || state.art.win.ready) {
  throw new Error(`Reduced-motion E2E: compressed direct transition is incorrect (${state.screen}, Lv${state.level.id})`);
}
await page.waitForFunction(() => {
  const state = window.__COLOR_ESCAPE__?.getDebugState();
  return state?.screen === "playing" && state.level.id === 2
    && !state.completionFlow.directTransition;
}, undefined, { timeout: 5_000 });
state = await debug();
if (!state.settings.reducedMotion || state.puzzle.moves !== 0 || state.activeRun?.levelId !== 2) {
  throw new Error(`Reduced-motion E2E: direct transition did not start a clean level 2 run (${state.screen}, Lv${state.level.id})`);
}

await context.close();

// Minimum viewport: the third setting remains legible and clickable.
const small = await browser.newPage({ viewport: { width: 320, height: 568 } });
small.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
small.on("pageerror", (error) => errors.push(error.message));
await small.goto(playtestUrl, { waitUntil: "networkidle" });
await small.evaluate(() => localStorage.clear());
await small.reload({ waitUntil: "networkidle" });
await waitForArtReady(small);
await small.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(1, true));
await small.waitForTimeout(100);
await clickInteractionTarget("pause", small);
let smallState = await small.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
if (smallState.screen !== "paused") throw new Error("Reduced-motion E2E: 320x568 pause modal did not open");
await small.screenshot({ path: shot("round20-reduced-motion-pause-320x568.png") });
await clickInteractionTarget("pause.reducedMotion", small);
smallState = await small.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
if (!smallState.settings.reducedMotion) throw new Error("Reduced-motion E2E: 320x568 toggle was not clickable");
await small.close();

await browser.close();
if (errors.length) throw new Error(`Reduced-motion browser errors:\n${errors.join("\n")}`);
console.log("System default, manual persistence, effect budgets, compressed Lv1→2 transition, and 320x568 reduced motion passed.");
