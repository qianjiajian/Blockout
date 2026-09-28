import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL(`../playtest-results/timeout-recovery-time-freeze-${new Date().toISOString().replaceAll(":", "-")}/`, import.meta.url));
const shot = (name) => resolve(output, name);
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const errors = [];
const save = (currentLevel = 1) => ({
  schemaVersion: 1,
  currentLevel,
  highestLevel: Math.max(4, currentLevel),
  coins: 2000,
  sound: false,
  haptic: false,
  reducedMotion: true,
  featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter"],
  boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: {},
  bestMoves: {},
  rewardedLevels: [],
});

const attachErrors = (page) => {
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
};

const openWithSave = async (page, value) => {
  await page.goto(playtestUrl, { waitUntil: "networkidle" });
  await page.evaluate((nextSave) => localStorage.setItem("color-escape-save-v1", JSON.stringify(nextSave)), value);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(120);
};

const clickInteractionTarget = async (page, name) => {
  const state = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
  const hit = state.interactionTargets?.targets?.[name]?.hit;
  const bounds = await page.locator("canvas").boundingBox();
  if (!hit || !bounds) throw new Error(`Timeout E2E: missing interaction target ${name}`);
  await page.mouse.click(
    bounds.x + state.viewportTransform.offsetX + (hit.x + hit.width / 2) * state.viewportTransform.scale,
    bounds.y + state.viewportTransform.offsetY + (hit.y + hit.height / 2) * state.viewportTransform.scale,
  );
};

const pointerDownInteractionTarget = async (page, name) => {
  const state = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
  const hit = state.interactionTargets?.targets?.[name]?.hit;
  const bounds = await page.locator("canvas").boundingBox();
  if (!hit || !bounds) throw new Error(`Timeout E2E: missing interaction target ${name}`);
  await page.mouse.move(
    bounds.x + state.viewportTransform.offsetX + (hit.x + hit.width / 2) * state.viewportTransform.scale,
    bounds.y + state.viewportTransform.offsetY + (hit.y + hit.height / 2) * state.viewportTransform.scale,
  );
  await page.mouse.down();
};

const installFailureRenderProbe = async (page) => {
  await page.evaluate(() => {
    const game = window.__COLOR_ESCAPE__;
    const methods = ["drawHome", "drawHud", "drawBoard", "drawBoosters", "drawFailed"];
    const originals = {};
    const trace = [];
    for (const method of methods) {
      originals[method] = game[method];
      game[method] = function (...args) {
        trace.push({ method, screen: this.screen });
        return originals[method].apply(this, args);
      };
    }
    window.__TIMEOUT_FAILURE_RENDER_PROBE__ = {
      trace,
      restore: () => {
        for (const method of methods) game[method] = originals[method];
      },
    };
  });
};

const assertAndRestoreFailureRender = async (page, context) => {
  const trace = await page.evaluate(() => {
    const probe = window.__TIMEOUT_FAILURE_RENDER_PROBE__;
    const result = [...(probe?.trace ?? [])];
    probe?.restore();
    delete window.__TIMEOUT_FAILURE_RENDER_PROBE__;
    return result;
  });
  const failedMethods = new Set(trace.filter(({ screen }) => screen === "failed").map(({ method }) => method));
  for (const method of ["drawHud", "drawBoard", "drawBoosters", "drawFailed"]) {
    if (!failedMethods.has(method)) {
      throw new Error(`Timeout E2E: ${context} failed frame did not render ${method} (${JSON.stringify(trace)})`);
    }
  }
  if (failedMethods.has("drawHome")) {
    throw new Error(`Timeout E2E: ${context} failed frame rendered the Home scene behind the modal`);
  }
};

const puzzleFingerprint = (state) => JSON.stringify({
  screen: state.screen,
  remainingSeconds: state.puzzle.remainingSeconds,
  moves: state.puzzle.moves,
  blocks: state.puzzle.blocks.map(({ id, x, y, layers }) => ({ id, x, y, layers })),
  boosters: state.economy.boosters,
});

const attemptFailedBoardDrag = async (page, mapper, failedState) => {
  const block = failedState.puzzle.blocks[0];
  if (!block) throw new Error("Timeout E2E: failed-state board has no block to probe");
  const [anchorX, anchorY] = block.shape[0];
  const start = mapper.point(
    failedState.board.innerX + (block.x + anchorX + 0.5) * failedState.board.cell,
    failedState.board.innerY + (block.y + anchorY + 0.5) * failedState.board.cell,
  );
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + failedState.board.cell * failedState.viewportTransform.scale, start.y, { steps: 4 });
  await page.mouse.up();
  await page.waitForTimeout(40);
};

const runFinalTimerTick = async (page) => {
  await page.evaluate(() => {
    const model = window.__COLOR_ESCAPE__.model;
    // This is a deliberate timeout fixture, not natural-clock freeze evidence.
    // Spend only an active freeze balance before forcing the final live tick.
    const frozen = model.snapshot().timeFreezeSeconds;
    if (frozen > 0) model.tick(frozen);
    model.remainingSeconds = 0.001;
  });
  await page.waitForTimeout(120);
};

const viewportMapper = (width, height) => {
  const scale = Math.min(width / 496, height / 1078);
  const offsetX = (width - 496 * scale) / 2;
  const offsetY = (height - 1078 * scale) / 2;
  return {
    click: (page, x, y) => page.mouse.click(offsetX + x * scale, offsetY + y * scale),
    point: (x, y) => ({ x: offsetX + x * scale, y: offsetY + y * scale }),
  };
};

const standard = await browser.newPage({ viewport: { width: 496, height: 1078 } });
attachErrors(standard);
const normalMap = viewportMapper(496, 1078);
const normalState = () => standard.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
await openWithSave(standard, save());
await standard.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(1, true));
await standard.waitForTimeout(20);
let state = await normalState();
const initialBlockCount = state.puzzle.blocks.length;
const levelOneSolution = await standard.evaluate(async () => {
  const [{ getLevel }, { solveLevelForValidation }] = await Promise.all([
    import("/src/core/levels.ts"),
    import("/src/core/levelSolver.ts"),
  ]);
  return solveLevelForValidation(getLevel(1));
});
if (!levelOneSolution.solved) throw new Error("Timeout E2E: current level 1 has no verified route");

const performDrag = async (targetPage, mapper, drag) => {
  const live = await targetPage.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
  const block = live.puzzle.blocks.find((candidate) => candidate.id === drag.blockId);
  if (!block) throw new Error(`Timeout E2E: missing route block ${drag.blockId}`);
  const [anchorX, anchorY] = block.shape[0];
  const logical = (x, y) => ({
    x: live.board.innerX + (x + anchorX + 0.5) * live.board.cell,
    y: live.board.innerY + (y + anchorY + 0.5) * live.board.cell,
  });
  const startLogical = logical(block.x, block.y);
  const start = mapper.point(startLogical.x, startLogical.y);
  await targetPage.mouse.move(start.x, start.y);
  await targetPage.mouse.down();
  for (const [x, y] of drag.path) {
    const targetLogical = logical(x, y);
    const target = mapper.point(targetLogical.x, targetLogical.y);
    await targetPage.mouse.move(target.x, target.y, { steps: 3 });
  }
  if (drag.exitSide) {
    const held = await targetPage.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
    const remaining = held.puzzle.blocks.find((candidate) => candidate.id === drag.blockId);
    const expectedLayers = Math.max(0, block.layers.length - 1);
    if (held.selectedId || held.activePointer !== undefined
      || (expectedLayers === 0 && remaining)
      || (expectedLayers > 0 && (!remaining || remaining.layers.length !== expectedLayers))) {
      throw new Error(`Timeout E2E: ${drag.blockId} did not resolve while the pointer stayed down`);
    }
  }
  await targetPage.mouse.up();
  await targetPage.waitForTimeout(drag.exitSide ? 180 : 25);
};
const performUntilOneBlock = async (targetPage, mapper) => {
  for (const drag of levelOneSolution.drags) {
    const live = await targetPage.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
    if (live.puzzle.blocks.length <= 1) return;
    await performDrag(targetPage, mapper, drag);
  }
  throw new Error("Timeout E2E: verified route did not reach a one-block-left state");
};
const performOpeningMove = (targetPage, mapper) => performDrag(targetPage, mapper, levelOneSolution.drags[0]);

await performUntilOneBlock(standard, normalMap);
state = await normalState();
if (!state.puzzle.started || state.puzzle.blocks.length !== 1) {
  throw new Error("Timeout E2E: real pointer setup did not start the clock with one block remaining");
}
await clickInteractionTarget(standard, "booster.time");
state = await normalState();
if (state.economy.boosters.time !== 2 || state.activeRun?.boosterSpent.time !== 1) {
  throw new Error(`Timeout E2E: pre-timeout booster spend was not journaled (${JSON.stringify({
    time: state.economy.boosters.time,
    spent: state.activeRun?.boosterSpent.time,
    ghosts: state.exitGhosts,
    screen: state.screen,
    feedback: state.boosterFeedback,
  })})`);
}
await installFailureRenderProbe(standard);
await pointerDownInteractionTarget(standard, "pause");
state = await normalState();
if (state.buttonPress?.key !== "pause") {
  throw new Error("Timeout E2E: pause pointer-down did not create the expected pending press");
}
await runFinalTimerTick(standard);
state = await normalState();
if (state.screen !== "failed" || state.puzzle.blocks.length !== 1 || state.puzzle.remainingSeconds !== 0) {
  throw new Error(`Timeout E2E: final timer tick did not reach the normal failure state (${state.screen})`);
}
if (state.selectedId || state.activePointer != null || state.boosterTarget || state.boosterFeedback || state.hudFeedback
  || state.buttonPress
  || state.particles !== 0 || state.exitGhosts !== 0 || state.exitPulses.length !== 0
  || state.mechanicPulses.length !== 0 || state.boardShakeTime !== 0) {
  throw new Error("Timeout E2E: failure transition left stale input or effects behind");
}
await standard.mouse.up();
await assertAndRestoreFailureRender(standard, "496x1078");
if (state.failureActions?.primary !== "重新挑战" || state.failureActions?.secondary !== "返回主页") {
  throw new Error("Timeout E2E: failure actions are unclear");
}
const frozenFingerprint = puzzleFingerprint(state);
await attemptFailedBoardDrag(standard, normalMap, state);
await clickInteractionTarget(standard, "pause");
await clickInteractionTarget(standard, "booster.time");
state = await normalState();
if (puzzleFingerprint(state) !== frozenFingerprint || state.selectedId || state.activePointer != null) {
  throw new Error("Timeout E2E: failed-state gameplay surface accepted input behind the modal");
}
await standard.screenshot({ path: shot("round23-timeout-one-block-left.png") });

await clickInteractionTarget(standard, "failedReplay");
state = await normalState();
if (state.screen !== "playing" || state.puzzle.started || state.puzzle.moves !== 0 || state.puzzle.blocks.length !== initialBlockCount
  || state.economy.boosters.time !== 2 || state.activeRun?.boosterSpent.time !== 0) {
  throw new Error("Timeout E2E: retry did not create a clean run while settling the prior spend");
}
await performOpeningMove(standard, normalMap);
await runFinalTimerTick(standard);
state = await normalState();
if (state.screen !== "failed") throw new Error("Timeout E2E: retry did not fail through the real timer");
await clickInteractionTarget(standard, "failedHome");
state = await normalState();
if (state.screen !== "home" || state.level.id !== 1 || state.activeRun || state.economy.boosters.time !== 2) {
  throw new Error("Timeout E2E: normal failure exit did not settle to its home state");
}
await standard.close();

// Minimum viewport keeps progress and both recovery actions inside the modal.
const small = await browser.newPage({ viewport: { width: 320, height: 568 } });
attachErrors(small);
const compact = viewportMapper(320, 568);
await openWithSave(small, save());
await small.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(1, true));
await small.waitForTimeout(20);
state = await small.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
await performUntilOneBlock(small, compact);
await installFailureRenderProbe(small);
await runFinalTimerTick(small);
state = await small.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
if (state.screen !== "failed" || state.puzzle.blocks.length !== 1) {
  throw new Error("Timeout E2E: 320x568 failure state is incorrect");
}
await assertAndRestoreFailureRender(small, "320x568");
await small.screenshot({ path: shot("round23-timeout-one-block-left-320x568.png") });
await clickInteractionTarget(small, "failedHome");
state = await small.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
if (state.screen !== "home") throw new Error("Timeout E2E: 320x568 home action was not clickable");
await small.close();

await browser.close();
if (errors.length) throw new Error(`Timeout browser errors:\n${errors.join("\n")}`);
console.log("Real-input campaign timeout, contextual progress, retry settlement, home return, and 320x568 passed.");
