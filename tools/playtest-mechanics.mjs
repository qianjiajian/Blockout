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

await page.goto(playtestUrl, { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.setItem("color-escape-save-v1", JSON.stringify({
  schemaVersion: 1,
  currentLevel: 10,
  highestLevel: 100,
  coins: 1000,
  sound: false,
  haptic: false,
  featureSeen: ["basics", "ice-door", "layer", "shutter", "generator"],
  boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: {},
  bestMoves: {},
  rewardedLevels: [],
  dailyStreak: 0,
  lastDailyCompletedDay: "",
})));
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(600);

const mechanicRoutes = await page.evaluate(async () => {
  const [{ getLevel }, { solveLevelForValidation }, { PuzzleModel }] = await Promise.all([
    import("/src/core/levels.ts"),
    import("/src/core/levelSolver.ts"),
    import("/src/core/PuzzleModel.ts"),
  ]);
  const routeUntil = (levelId, reached) => {
    const level = getLevel(levelId);
    const solution = solveLevelForValidation(level);
    if (!solution.solved) throw new Error(`No mechanic route for Lv${levelId}`);
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
    throw new Error(`Mechanic event was absent from Lv${levelId} route`);
  };
  return {
    ice: routeUntil(6, (before, after) => before.gates.find((gate) => (
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
      shutter.count > 0 && after.shutters.find((candidate) => candidate.id === shutter.id)?.count === 0
    ))?.id),
  };
});

const debug = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const logicalPoint = (board, x, y) => ({ x: board.innerX + (x + 0.5) * board.cell, y: board.innerY + (y + 0.5) * board.cell });
const screenPoint = (point) => {
  const viewport = page.viewportSize();
  const scale = Math.min(viewport.width / 496, viewport.height / 1078);
  return {
    x: (viewport.width - 496 * scale) / 2 + point.x * scale,
    y: (viewport.height - 1078 * scale) / 2 + point.y * scale,
  };
};

const dragBlockToGrid = async (blockId, targetX, targetY) => {
  const state = await debug();
  const block = state.puzzle.blocks.find((candidate) => candidate.id === blockId);
  if (!block) throw new Error(`Mechanic E2E: missing block ${blockId}`);
  const board = state.board;
  const [anchorX, anchorY] = block.shape[0];
  const startLogical = logicalPoint(board, block.x + anchorX, block.y + anchorY);
  const targetLogical = logicalPoint(board, targetX + anchorX, targetY + anchorY);
  const start = screenPoint(startLogical);
  const target = screenPoint(targetLogical);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(150);
};

const exitBlock = async (blockId, gateId, capture) => {
  const state = await debug();
  const block = state.puzzle.blocks.find((candidate) => candidate.id === blockId);
  const gate = state.puzzle.gates.find((candidate) => candidate.id === gateId);
  if (!block || !gate) throw new Error(`Mechanic E2E: missing block/gate ${blockId}/${gateId}`);
  const [anchorX, anchorY] = block.shape[0];
  const maxX = Math.max(...block.shape.map(([x]) => x));
  const maxY = Math.max(...block.shape.map(([, y]) => y));
  const targetX = gate.side === "left" ? 0
    : gate.side === "right" ? state.level.width - 1 - maxX
      : gate.offset;
  const targetY = gate.side === "top" ? 0
    : gate.side === "bottom" ? state.level.height - 1 - maxY
      : gate.offset;
  const start = screenPoint(logicalPoint(state.board, block.x + anchorX, block.y + anchorY));
  const alignedLogical = logicalPoint(state.board, targetX + anchorX, targetY + anchorY);
  const aligned = screenPoint(alignedLogical);
  const endpointLogical = {
    left: { x: state.board.innerX - state.board.cell, y: alignedLogical.y },
    right: { x: state.board.innerX + state.board.innerWidth + state.board.cell, y: alignedLogical.y },
    top: { x: alignedLogical.x, y: state.board.innerY - state.board.cell },
    bottom: { x: alignedLogical.x, y: state.board.innerY + state.board.innerHeight + state.board.cell },
  }[gate.side];
  const endpoint = screenPoint(endpointLogical);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(aligned.x, aligned.y, { steps: 8 });
  await page.mouse.move(endpoint.x, endpoint.y, { steps: 5 });
  await page.waitForTimeout(60);
  await page.mouse.up();
  if (capture) {
    await page.waitForTimeout(485);
    await page.screenshot({ path: shot(capture) });
  }
};

const replaySolverDrag = async (drag, capture) => {
  const state = await debug();
  const block = state.puzzle.blocks.find((candidate) => candidate.id === drag.blockId);
  if (!block) throw new Error(`Mechanic E2E: missing route block ${drag.blockId}`);
  const [anchorX, anchorY] = block.shape[0];
  const start = screenPoint(logicalPoint(state.board, block.x + anchorX, block.y + anchorY));
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (const [x, y] of drag.path) {
    const target = screenPoint(logicalPoint(state.board, x + anchorX, y + anchorY));
    await page.mouse.move(target.x, target.y, { steps: 3 });
  }
  if (drag.exitSide) {
    const held = await debug();
    const remaining = held.puzzle.blocks.find((candidate) => candidate.id === drag.blockId);
    const expectedLayers = Math.max(0, block.layers.length - 1);
    if (held.selectedId || held.activePointer !== undefined
      || (expectedLayers === 0 && remaining)
      || (expectedLayers > 0 && (!remaining || remaining.layers.length !== expectedLayers))) {
      throw new Error(`Mechanic E2E: ${drag.blockId} did not resolve while the pointer stayed down`);
    }
  }
  await page.mouse.up();
  if (capture) {
    await page.waitForTimeout(485);
    await page.screenshot({ path: shot(capture) });
  } else {
    await page.waitForTimeout(drag.exitSide ? 1_250 : 180);
  }
};

const replayMechanicPrefix = async (prefix, capture) => {
  for (let index = 0; index < prefix.length; index += 1) {
    await replaySolverDrag(prefix[index], index === prefix.length - 1 ? capture : undefined);
  }
};

await page.evaluate(() => {
  const game = window.__COLOR_ESCAPE__;
  game.loadLevel(10, false);
  game.beginSelectedChallenge();
});
await page.waitForTimeout(100);
if ((await debug()).screen !== "feature") throw new Error("Mechanic E2E: ice-block onboarding did not open");
await page.screenshot({ path: shot("round50-onboarding-ice-block.png") });
await page.mouse.click(248, 755);
await page.waitForTimeout(100);

await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(6, true));
await page.waitForTimeout(100);
await replayMechanicPrefix(mechanicRoutes.ice.prefix, "round50-mechanic-ice-unlock.png");
let state = await debug();
if (!state.mechanicPulses.some((pulse) => pulse.kind === "ice" && pulse.targetId === mechanicRoutes.ice.targetId && pulse.unlocked && pulse.phase === "visible")) {
  throw new Error(`Mechanic E2E: frozen gate unlock pulse was not exposed during its visible window: ${JSON.stringify({ blocks: state.puzzle.blocks, gates: state.puzzle.gates, pulses: state.mechanicPulses })}`);
}

await page.waitForTimeout(700);
await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(15, true));
await page.waitForTimeout(100);
const layeredBefore = (await debug()).puzzle.blocks.find((block) => block.id === mechanicRoutes.layer.targetId);
await replayMechanicPrefix(mechanicRoutes.layer.prefix, "round50-mechanic-layer-peel.png");
state = await debug();
if (!state.mechanicPulses.some((pulse) => pulse.kind === "layer" && pulse.targetId === mechanicRoutes.layer.targetId && pulse.phase === "visible")) {
  throw new Error("Mechanic E2E: layer peel pulse was not exposed during its visible window");
}
const layeredAfter = state.puzzle.blocks.find((block) => block.id === mechanicRoutes.layer.targetId);
if (!layeredBefore || !layeredAfter
  || layeredAfter.layers.length !== layeredBefore.layers.length - 1
  || layeredAfter.layers[0] === layeredBefore.layers[0]) {
  throw new Error("Mechanic E2E: layer feedback did not correspond to the revealed inner color");
}

await page.waitForTimeout(850);
await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(35, true));
await page.waitForTimeout(100);
await replayMechanicPrefix(mechanicRoutes.shutter.prefix, "round50-mechanic-shutter-open.png");
state = await debug();
if (!state.mechanicPulses.some((pulse) => pulse.kind === "shutter" && pulse.targetId === mechanicRoutes.shutter.targetId && pulse.unlocked && pulse.phase === "visible")) {
  throw new Error("Mechanic E2E: shutter opening pulse was not exposed during its visible window");
}
if (state.puzzle.shutters.find((shutter) => shutter.id === mechanicRoutes.shutter.targetId)?.count !== 0) {
  throw new Error("Mechanic E2E: shutter opening feedback did not match the countdown state");
}

await page.waitForTimeout(850);
await page.setViewportSize({ width: 320, height: 568 });

await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(6, true));
await page.waitForTimeout(100);
await replayMechanicPrefix(mechanicRoutes.ice.prefix, "round50-small-mechanic-ice-unlock-320x568.png");
state = await debug();
if (!state.mechanicPulses.some((pulse) => pulse.kind === "ice" && pulse.unlocked && pulse.phase === "visible")) {
  throw new Error("Mechanic E2E: small-screen ice unlock feedback missing");
}

await page.waitForTimeout(700);
await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(15, true));
await page.waitForTimeout(100);
await replayMechanicPrefix(mechanicRoutes.layer.prefix, "round50-small-mechanic-layer-peel-320x568.png");
state = await debug();
if (!state.mechanicPulses.some((pulse) => pulse.kind === "layer" && pulse.phase === "visible")) {
  throw new Error("Mechanic E2E: small-screen layer feedback missing");
}

await page.waitForTimeout(850);
await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(35, true));
await page.waitForTimeout(100);
await replayMechanicPrefix(mechanicRoutes.shutter.prefix, "round50-small-mechanic-shutter-open-320x568.png");
state = await debug();
if (!state.mechanicPulses.some((pulse) => pulse.kind === "shutter" && pulse.unlocked && pulse.phase === "visible")) {
  throw new Error("Mechanic E2E: small-screen shutter feedback missing");
}

await page.close();
await browser.close();
if (errors.length) throw new Error(`Browser errors:\n${errors.join("\n")}`);
console.log("Ice unlock, layer peel, and shutter opening feedback passed with real pointer input.");
