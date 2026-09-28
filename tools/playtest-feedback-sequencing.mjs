import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/", import.meta.url));
const shot = (name) => resolve(output, name);
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });

const save = (reducedMotion = false) => ({
  schemaVersion: 1,
  currentLevel: 1,
  highestLevel: 100,
  coins: 1000,
  sound: false,
  haptic: false,
  reducedMotion,
  featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter"],
  boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: {},
  bestMoves: {},
  rewardedLevels: [1, 2, 3],
  dailyStreak: 0,
  lastDailyCompletedDay: "",
});

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 496, height: 1078 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));

const debug = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const screenPoint = (logical) => {
  const viewport = page.viewportSize();
  const scale = Math.min(viewport.width / 496, viewport.height / 1078);
  return {
    x: (viewport.width - 496 * scale) / 2 + logical.x * scale,
    y: (viewport.height - 1078 * scale) / 2 + logical.y * scale,
  };
};
const cellPoint = (board, x, y) => ({
  x: board.innerX + (x + 0.5) * board.cell,
  y: board.innerY + (y + 0.5) * board.cell,
});
const seed = async (reducedMotion = false) => {
  await page.goto(playtestUrl, { waitUntil: "networkidle" });
  await page.evaluate((value) => localStorage.setItem("color-escape-save-v1", JSON.stringify(value)), save(reducedMotion));
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready, undefined, { timeout: 5_000 });
  await page.waitForTimeout(40);
};
const openLevel = async (levelId) => {
  await page.evaluate((id) => window.__COLOR_ESCAPE__.loadLevel(id, true), levelId);
  await page.waitForTimeout(90);
  const state = await debug();
  if (state.screen !== "playing" || state.level.id !== levelId) {
    throw new Error(`Feedback-sequencing E2E: expected playing Lv${levelId}`);
  }
};
const beginSolverDrag = async (drag) => {
  const state = await debug();
  const block = state.puzzle.blocks.find((candidate) => candidate.id === drag.blockId);
  if (!block) throw new Error(`Feedback-sequencing E2E: missing route block ${drag.blockId}`);
  const [anchorX, anchorY] = block.shape[0];
  const start = screenPoint(cellPoint(state.board, block.x + anchorX, block.y + anchorY));
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (const [x, y] of drag.path) {
    const target = screenPoint(cellPoint(state.board, x + anchorX, y + anchorY));
    await page.mouse.move(target.x, target.y, { steps: 3 });
  }
  if (drag.exitSide) {
    const held = await debug();
    const remaining = held.puzzle.blocks.find((candidate) => candidate.id === drag.blockId);
    const expectedLayers = Math.max(0, block.layers.length - 1);
    if (held.selectedId || held.activePointer !== undefined
      || (expectedLayers === 0 && remaining)
      || (expectedLayers > 0 && (!remaining || remaining.layers.length !== expectedLayers))) {
      throw new Error(`Feedback-sequencing E2E: ${drag.blockId} did not resolve while the pointer stayed down`);
    }
    return held;
  }
  return undefined;
};
const finishPointer = () => page.mouse.up();
const replayPrefixToHeldEvent = async (prefix) => {
  if (!prefix.length || !prefix.at(-1).exitSide) {
    throw new Error("Feedback-sequencing E2E: mechanic route does not end in an exit");
  }
  for (let index = 0; index < prefix.length - 1; index += 1) {
    await beginSolverDrag(prefix[index]);
    await finishPointer();
    await page.waitForTimeout(prefix[index].exitSide ? 1_250 : 180);
  }
  return beginSolverDrag(prefix.at(-1));
};
const mechanic = (state, kind, targetId) => state.mechanicPulses.find((pulse) => (
  pulse.kind === kind && pulse.targetId === targetId
));
const expectQueuedExitFirst = (state, kind, targetId, label) => {
  const pulse = mechanic(state, kind, targetId);
  if (!pulse || pulse.phase !== "queued" || pulse.delayRemaining <= 0) {
    throw new Error(`Feedback-sequencing E2E: ${label} was not queued behind exit confirmation: ${JSON.stringify({
      pulse,
      mechanicPulses: state.mechanicPulses,
      exitPulses: state.exitPulses,
      exitGhosts: state.exitGhosts,
      boardShakeTime: state.boardShakeTime,
    })}`);
  }
  if (state.exitPulses.length === 0 || state.boardShakeTime !== 0) {
    throw new Error(`Feedback-sequencing E2E: ${label} early frame mixed mechanic shake with the exit focus`);
  }
};
const expectMechanicSecond = (state, kind, targetId, label, allowShake = true) => {
  const pulse = mechanic(state, kind, targetId);
  if (!pulse || pulse.phase !== "visible" || pulse.age <= 0) {
    throw new Error(`Feedback-sequencing E2E: ${label} did not become the second causal beat`);
  }
  if (state.exitGhosts !== 0) {
    throw new Error(`Feedback-sequencing E2E: ${label} appeared before the exit ghost cleared`);
  }
  if (!allowShake && state.boardShakeTime !== 0) {
    throw new Error(`Feedback-sequencing E2E: ${label} ignored reduced-motion shake suppression`);
  }
};

await seed(false);

const mechanicRoutes = await page.evaluate(async () => {
  const [{ getLevel }, { solveLevelForValidation }, { PuzzleModel }] = await Promise.all([
    import("/src/core/levels.ts"),
    import("/src/core/levelSolver.ts"),
    import("/src/core/PuzzleModel.ts"),
  ]);
  const routeUntil = (levelId, reached) => {
    const level = getLevel(levelId);
    const solution = solveLevelForValidation(level);
    if (!solution.solved) throw new Error(`Feedback-sequencing E2E: no validation route for Lv${levelId}`);
    const model = new PuzzleModel(level);
    const prefix = [];
    for (const drag of solution.drags) {
      const before = model.snapshot();
      model.beginAction();
      for (const [x, y] of drag.path) model.moveBlock(drag.blockId, x, y);
      if (drag.exitSide) model.tryExit(drag.blockId, drag.exitSide);
      model.commitAction();
      const after = model.snapshot();
      prefix.push(drag);
      const targetId = reached(before, after, drag);
      if (targetId) return { prefix, targetId };
    }
    throw new Error(`Feedback-sequencing E2E: mechanic event absent from Lv${levelId}`);
  };
  return {
    ice: routeUntil(12, (before, after) => before.gates.find((gate) => (
      gate.frozen > 0 && after.gates.find((candidate) => candidate.id === gate.id)?.frozen === 0
    ))?.id),
    layer: routeUntil(15, (before, after, drag) => {
      const beforeBlock = before.blocks.find((block) => block.id === drag.blockId);
      const afterBlock = after.blocks.find((block) => block.id === drag.blockId);
      return beforeBlock && afterBlock && beforeBlock.layers.length > afterBlock.layers.length
        ? drag.blockId
        : undefined;
    }),
    shutter: routeUntil(35, (before, after) => before.shutters.find((shutter) => (
      shutter.count > 0
      && after.shutters.find((candidate) => candidate.id === shutter.id)?.count === 0
    ))?.id),
  };
});

// Ice: the colored block/gate exit owns the first frame, then the thaw response appears.
await openLevel(12);
let state = await replayPrefixToHeldEvent(mechanicRoutes.ice.prefix);
expectQueuedExitFirst(state, "ice", mechanicRoutes.ice.targetId, "ice unlock");
await page.screenshot({ path: shot("round44-ice-exit-first.png") });
await finishPointer();
await page.waitForTimeout(485);
state = await debug();
expectMechanicSecond(state, "ice", mechanicRoutes.ice.targetId, "ice unlock");
await page.screenshot({ path: shot("round44-ice-mechanic-second.png") });

// Layer: the removed outer color exits first; the revealed inner layer responds second.
await page.waitForTimeout(850);
await openLevel(15);
state = await replayPrefixToHeldEvent(mechanicRoutes.layer.prefix);
expectQueuedExitFirst(state, "layer", mechanicRoutes.layer.targetId, "layer peel");
if (state.exitGhosts !== 0) throw new Error("Feedback-sequencing E2E: layer peel incorrectly removed the whole block");
await page.screenshot({ path: shot("round44-layer-exit-first.png") });
await finishPointer();
await page.waitForTimeout(255);
state = await debug();
expectMechanicSecond(state, "layer", mechanicRoutes.layer.targetId, "layer peel");
await page.screenshot({ path: shot("round44-layer-mechanic-second.png") });

// Shutter: prime the countdown, clear old FX, then verify the opening beat after the second exit.
await page.waitForTimeout(900);
await openLevel(35);
state = await replayPrefixToHeldEvent(mechanicRoutes.shutter.prefix);
expectQueuedExitFirst(state, "shutter", mechanicRoutes.shutter.targetId, "shutter opening");
await page.screenshot({ path: shot("round44-shutter-exit-first.png") });
await finishPointer();
await page.waitForTimeout(485);
state = await debug();
expectMechanicSecond(state, "shutter", mechanicRoutes.shutter.targetId, "shutter opening");
if (state.puzzle.shutters.find((item) => item.id === mechanicRoutes.shutter.targetId)?.count !== 0) {
  throw new Error("Feedback-sequencing E2E: shutter visual beat did not match its open state");
}
await page.screenshot({ path: shot("round44-shutter-mechanic-second.png") });

// Minimum viewport + reduced motion keeps the causal order with a shorter delay and no shake.
await page.setViewportSize({ width: 320, height: 568 });
await seed(true);
await openLevel(12);
state = await replayPrefixToHeldEvent(mechanicRoutes.ice.prefix);
expectQueuedExitFirst(state, "ice", mechanicRoutes.ice.targetId, "reduced-motion ice unlock");
await page.screenshot({ path: shot("round44-reduced-small-exit-first-320x568.png") });
await finishPointer();
await page.waitForTimeout(165);
state = await debug();
expectMechanicSecond(state, "ice", mechanicRoutes.ice.targetId, "reduced-motion ice unlock", false);
await page.screenshot({ path: shot("round44-reduced-small-mechanic-second-320x568.png") });

await browser.close();
if (errors.length) throw new Error(`Feedback-sequencing browser errors:\n${errors.join("\n")}`);
console.log("Exit-first/mechanic-second sequencing passed for ice, layer, shutter, reduced motion, and 320x568.");
