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
const removedTailRequests = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));
page.on("request", (request) => {
  if (request.url().includes("exit-suction-trail-v1.png")) removedTailRequests.push(request.url());
});

const save = {
  schemaVersion: 1,
  currentLevel: 1,
  highestLevel: 100,
  coins: 1000,
  sound: false,
  haptic: false,
  reducedMotion: false,
  featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter"],
  boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: {},
  bestMoves: {},
  rewardedLevels: [],
  dailyStreak: 0,
  lastDailyCompletedDay: "",
};

await page.goto(playtestUrl, { waitUntil: "networkidle" });
await page.evaluate((value) => localStorage.setItem("color-escape-save-v1", JSON.stringify(value)), save);
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(160);

const debug = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const openLevel = async (levelId) => {
  await page.evaluate((id) => window.__COLOR_ESCAPE__.loadLevel(id, true), levelId);
  await page.waitForTimeout(100);
  return debug();
};
const cellPoint = (state, block, x = block.x, y = block.y) => {
  const [anchorX, anchorY] = block.shape[0];
  return {
    x: state.board.innerX + (x + anchorX + 0.5) * state.board.cell,
    y: state.board.innerY + (y + anchorY + 0.5) * state.board.cell,
  };
};
const activeColor = (block) => block.layers?.[0] ?? block.color;
const alignedAtGate = (state, block, gate, x, y) => {
  const cells = block.shape.map(([dx, dy]) => [x + dx, y + dy]);
  const xs = cells.map(([cellX]) => cellX);
  const ys = cells.map(([, cellY]) => cellY);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  if (gate.side === "top") return minY === 0 && minX >= gate.offset && maxX < gate.offset + gate.size;
  if (gate.side === "bottom") return maxY === state.puzzle.height - 1 && minX >= gate.offset && maxX < gate.offset + gate.size;
  if (gate.side === "left") return minX === 0 && minY >= gate.offset && maxY < gate.offset + gate.size;
  return maxX === state.puzzle.width - 1 && minY >= gate.offset && maxY < gate.offset + gate.size;
};
const pathToGate = (state, block, gate) => {
  const playable = new Set(state.puzzle.playable.map(([x, y]) => `${x},${y}`));
  const occupied = new Set();
  for (const shutter of state.puzzle.shutters) {
    if (shutter.count <= 0) continue;
    for (let y = shutter.y; y < shutter.y + shutter.height; y += 1) {
      for (let x = shutter.x; x < shutter.x + shutter.width; x += 1) occupied.add(`${x},${y}`);
    }
  }
  for (const other of state.puzzle.blocks) {
    if (other.id === block.id) continue;
    for (const [dx, dy] of other.shape) occupied.add(`${other.x + dx},${other.y + dy}`);
  }
  const canPlace = (x, y) => block.shape.every(([dx, dy]) => (
    playable.has(`${x + dx},${y + dy}`) && !occupied.has(`${x + dx},${y + dy}`)
  ));
  const startKey = `${block.x},${block.y}`;
  const queue = [[block.x, block.y]];
  const previous = new Map([[startKey, null]]);
  let goalKey;
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const [x, y] = queue[cursor];
    const key = `${x},${y}`;
    if (alignedAtGate(state, block, gate, x, y)) {
      goalKey = key;
      break;
    }
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const nextX = x + dx;
      const nextY = y + dy;
      const nextKey = `${nextX},${nextY}`;
      if (previous.has(nextKey) || !canPlace(nextX, nextY)) continue;
      previous.set(nextKey, key);
      queue.push([nextX, nextY]);
    }
  }
  if (!goalKey) return undefined;
  const reverse = [];
  for (let key = goalKey; key !== startKey; key = previous.get(key)) {
    reverse.push(key.split(",").map(Number));
  }
  return reverse.reverse();
};
const findDirectFixture = (state, blockPredicate, gatePredicate) => {
  for (const block of state.puzzle.blocks) {
    if (block.frozen > 0 || block.shutterId || !blockPredicate(block)) continue;
    for (const gate of state.puzzle.gates) {
      if (gate.color !== activeColor(block) || !gatePredicate(gate, block)) continue;
      const path = pathToGate(state, block, gate);
      if (path?.length) return { block, gate, path };
    }
  }
  return undefined;
};
const openFixture = async (levelIds, blockPredicate, gatePredicate, label) => {
  for (const levelId of levelIds) {
    const state = await openLevel(levelId);
    const fixture = findDirectFixture(state, blockPredicate, gatePredicate);
    if (fixture) return { state, levelId, ...fixture };
  }
  throw new Error(`Edge-release E2E: no direct ${label} fixture found`);
};
const openWrongColorEdgeFixture = async (levelIds) => {
  for (const levelId of levelIds) {
    const state = await openLevel(levelId);
    const closedShutters = state.puzzle.shutters.filter((shutter) => shutter.count > 0);
    for (const block of state.puzzle.blocks) {
      if (block.frozen > 0 || block.shutterId) continue;
      const covered = block.shape.some(([dx, dy]) => closedShutters.some((shutter) => (
        block.x + dx >= shutter.x && block.x + dx < shutter.x + shutter.width
        && block.y + dy >= shutter.y && block.y + dy < shutter.y + shutter.height
      )));
      if (covered) continue;
      const alignedGates = state.puzzle.gates.filter((candidate) => (
        candidate.frozen === 0 && alignedAtGate(state, block, candidate, block.x, block.y)
      ));
      if (alignedGates.some((candidate) => candidate.color !== activeColor(block))
        && !alignedGates.some((candidate) => candidate.color === activeColor(block))) {
        return { state, levelId, block };
      }
    }
  }
  throw new Error("Edge-release E2E: no selectable wrong-color edge fixture found");
};
const findRoutedFixture = async (levelIds, layered, label, targetSide) => {
  const plan = await page.evaluate(async ({ levelIds, layered, targetSide }) => {
    const [{ getLevel }, { solveLevelForValidation }, { PuzzleModel }] = await Promise.all([
      import("/src/core/levels.ts"),
      import("/src/core/levelSolver.ts"),
      import("/src/core/PuzzleModel.ts"),
    ]);
    const alignedAt = (snapshot, block, gate, x, y) => {
      const cells = block.shape.map(([dx, dy]) => [x + dx, y + dy]);
      const xs = cells.map(([cellX]) => cellX);
      const ys = cells.map(([, cellY]) => cellY);
      const minX = Math.min(...xs); const maxX = Math.max(...xs);
      const minY = Math.min(...ys); const maxY = Math.max(...ys);
      if (gate.side === "top") return minY === 0 && minX >= gate.offset && maxX < gate.offset + gate.size;
      if (gate.side === "bottom") return maxY === snapshot.height - 1 && minX >= gate.offset && maxX < gate.offset + gate.size;
      if (gate.side === "left") return minX === 0 && minY >= gate.offset && maxY < gate.offset + gate.size;
      return maxX === snapshot.width - 1 && minY >= gate.offset && maxY < gate.offset + gate.size;
    };
    for (const levelId of levelIds) {
      const level = getLevel(levelId);
      const solution = solveLevelForValidation(level);
      if (!solution.solved) continue;
      const model = new PuzzleModel(level);
      for (let index = 0; index < solution.drags.length; index += 1) {
        const drag = solution.drags[index];
        const snapshot = model.snapshot();
        const block = snapshot.blocks.find((candidate) => candidate.id === drag.blockId);
        const [targetX, targetY] = drag.path.at(-1) ?? [block?.x, block?.y];
        const gate = block && drag.exitSide
          ? snapshot.gates.find((candidate) => candidate.side === drag.exitSide
            && candidate.frozen === 0
            && candidate.color === (block.layers[0] ?? block.color)
            && alignedAt(snapshot, block, candidate, targetX, targetY))
          : undefined;
        if (block && gate && (block.layers.length > 1) === layered && (!targetSide || gate.side === targetSide)) {
          return { levelId, prefix: solution.drags.slice(0, index), drag, gateId: gate.id };
        }
        model.beginAction();
        for (const [x, y] of drag.path) {
          if (!model.moveBlockStep(drag.blockId, x, y)) throw new Error(`Cannot replay ${drag.blockId} in Lv${levelId}`);
        }
        if (drag.exitSide && !model.tryExit(drag.blockId, drag.exitSide).ok) throw new Error(`Cannot exit ${drag.blockId} in Lv${levelId}`);
        model.commitAction();
      }
    }
    return undefined;
  }, { levelIds, layered, targetSide });
  if (!plan) throw new Error(`Edge-release E2E: no routed ${label} fixture found`);
  let state = await openLevel(plan.levelId);
  for (const drag of plan.prefix) {
    const block = state.puzzle.blocks.find((candidate) => candidate.id === drag.blockId);
    if (!block) throw new Error(`Edge-release E2E: routed prefix lost ${drag.blockId}`);
    state = await dragAlongPath(state, block, drag.path, 340);
  }
  const block = state.puzzle.blocks.find((candidate) => candidate.id === plan.drag.blockId);
  const gate = state.puzzle.gates.find((candidate) => candidate.id === plan.gateId);
  if (!block || !gate) throw new Error(`Edge-release E2E: routed ${label} fixture diverged at runtime`);
  return { state, levelId: plan.levelId, block, gate, path: plan.drag.path };
};
const dragAlongPath = async (state, block, path, waitMs = 180) => {
  const start = cellPoint(state, block);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (const [x, y] of path) {
    const point = cellPoint(state, block, x, y);
    await page.mouse.move(point.x, point.y, { steps: 4 });
  }
  await page.mouse.up();
  await page.waitForTimeout(waitMs);
  return debug();
};
const dragHeldAlongPath = async (state, block, path, waitMs = 180) => {
  const start = cellPoint(state, block);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (const [x, y] of path) {
    const point = cellPoint(state, block, x, y);
    await page.mouse.move(point.x, point.y, { steps: 4 });
  }
  await page.waitForTimeout(waitMs);
  return debug();
};
const releaseInsideBoard = async (state, block) => {
  const point = cellPoint(state, block);
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.mouse.up();
  return debug();
};

// Campaign blocks no longer start at matching exits. Move one there through a
// legal in-board path and keep holding: alignment itself must complete the exit.
let fixture = await findRoutedFixture(Array.from({ length: 30 }, (_, index) => index + 1), false, "normal open-gate");
let { state, block, gate } = fixture;
let beforeMoves = state.puzzle.moves;
state = await dragHeldAlongPath(state, block, fixture.path);
if (state.puzzle.blocks.some((candidate) => candidate.id === block.id)
  || state.puzzle.moves !== beforeMoves + 1
  || state.selectedId || state.activePointer !== undefined
  || !state.exitPulses.some((pulse) => pulse.side === gate.side && pulse.color === gate.color)
  || state.exitGhosts !== 1) {
  throw new Error(`Edge-release E2E: held matching block did not auto-exit on alignment (${JSON.stringify(state)})`);
}
await page.screenshot({ path: shot("round50-edge-release-matching.png") });
await page.screenshot({ path: shot("round121-auto-exit-without-tail.png") });
await page.mouse.up();

// Real fingers rarely enter an exit lane on a pixel-perfect axis. Use an
// isolated fixture so authored campaign block names/positions can evolve while
// this input invariant stays fixed.
await page.evaluate(async () => {
  const { PuzzleModel } = await import("/src/core/PuzzleModel.ts");
  const game = window.__COLOR_ESCAPE__;
  const playable = Array.from({ length: 5 }, (_, y) => (
    Array.from({ length: 5 }, (__, x) => [x, y])
  )).flat();
  game.loadLevel(1, true);
  game.model = new PuzzleModel({
    id: 994,
    name: "Offset held gate contact",
    difficulty: "normal",
    timeSeconds: 180,
    reward: 0,
    parMoves: 1,
    width: 5,
    height: 5,
    playable,
    blocked: [],
    gates: [{ id: "red-top", side: "top", offset: 1, size: 1, color: "red" }],
    blocks: [
      { id: "red-offset", x: 1, y: 4, shape: [[0, 0]], color: "red" },
      { id: "blue-remains", x: 4, y: 4, shape: [[0, 0]], color: "blue" },
    ],
  });
  game.selectedId = undefined;
  game.activePointer = undefined;
  game.dragVisual = undefined;
  game.pendingCelebration = 0;
  game.dirty = true;
  game.render();
});
state = await debug();
block = state.puzzle.blocks.find((candidate) => candidate.id === "red-offset");
if (!block) throw new Error("Edge-release E2E: offset fixture block is missing");
gate = state.puzzle.gates.find((candidate) => candidate.side === "top" && candidate.color === activeColor(block));
if (!gate) throw new Error("Edge-release E2E: offset fixture gate is missing");
beforeMoves = state.puzzle.moves;
const offsetStart = cellPoint(state, block);
await page.mouse.move(offsetStart.x, offsetStart.y);
await page.mouse.down();
for (const [x, y] of [[1, 3], [1, 2], [1, 1]]) {
  const point = cellPoint(state, block, x, y);
  await page.mouse.move(point.x, point.y, { steps: 4 });
}
const offsetEdgePoint = cellPoint(state, block, 1, 0);
await page.mouse.move(
  offsetEdgePoint.x + state.board.cell * 0.18,
  offsetEdgePoint.y + state.board.cell * 0.3,
  { steps: 4 },
);
await page.waitForTimeout(180);
state = await debug();
if (state.puzzle.blocks.some((candidate) => candidate.id === block.id)
  || state.puzzle.moves !== beforeMoves + 1
  || state.selectedId || state.activePointer !== undefined
  || !state.exitPulses.some((pulse) => pulse.side === gate.side && pulse.color === gate.color)) {
  throw new Error(`Edge-release E2E: offset held block waited for pointerup (${JSON.stringify(state)})`);
}
await page.mouse.up();
state = await debug();
if (state.puzzle.moves !== beforeMoves + 1) {
  throw new Error("Edge-release E2E: terminal pointerup double-counted an already resolved held exit");
}

// One input event can cover many cells on a fast finger or a loaded device.
// This fixture reaches the top gate at x=3, then wall-slides to x=4 before the
// event ends. The chronological sweep must consume the block at the first gate
// contact instead of rebuilding movement solely from the final pose.
await page.evaluate(async () => {
  const { PuzzleModel } = await import("/src/core/PuzzleModel.ts");
  const game = window.__COLOR_ESCAPE__;
  const playable = Array.from({ length: 5 }, (_, y) => (
    Array.from({ length: 5 }, (_, x) => [x, y])
  )).flat();
  game.loadLevel(1, true);
  game.model = new PuzzleModel({
    id: 995,
    name: "Sparse diagonal gate contact",
    difficulty: "normal",
    timeSeconds: 180,
    reward: 0,
    parMoves: 1,
    width: 5,
    height: 5,
    playable,
    blocked: [],
    gates: [{ id: "red-top", side: "top", offset: 3, size: 1, color: "red" }],
    blocks: [{ id: "red-sparse", x: 0, y: 4, shape: [[0, 0]], color: "red" }],
  });
  game.selectedId = undefined;
  game.activePointer = undefined;
  game.dragVisual = undefined;
  game.pendingCelebration = 0;
  game.dirty = true;
  game.render();
});
state = await debug();
block = state.puzzle.blocks.find((candidate) => candidate.id === "red-sparse");
if (!block) throw new Error("Edge-release E2E: sparse diagonal fixture did not initialize");
const sparseStart = cellPoint(state, block);
const sparseEnd = cellPoint(state, block, 4, -4);
await page.mouse.move(sparseStart.x, sparseStart.y);
await page.mouse.down();
await page.mouse.move(sparseEnd.x, sparseEnd.y);
await page.waitForTimeout(80);
state = await debug();
if (state.puzzle.blocks.some((candidate) => candidate.id === "red-sparse")
  || state.puzzle.moves !== 1
  || state.selectedId
  || state.activePointer !== undefined
  || !state.exitPulses.some((pulse) => pulse.side === "top" && pulse.color === "red")) {
  throw new Error(`Edge-release E2E: sparse diagonal sweep skipped its first gate contact (${JSON.stringify(state)})`);
}
await page.mouse.up();

// Removing the tail image must not change held auto-exit on any gate side.
// Exercise every orientation with real held Pointer movement.
for (const side of ["top", "right", "bottom", "left"]) {
  const directional = await findRoutedFixture(
    Array.from({ length: 100 }, (_, index) => index + 1),
    false,
    `${side} exit-without-tail`,
    side,
  );
  const directionalState = await dragHeldAlongPath(directional.state, directional.block, directional.path);
  if (directionalState.puzzle.blocks.some((candidate) => candidate.id === directional.block.id)
    || !directionalState.exitPulses.some((pulse) => pulse.side === side && pulse.color === directional.gate.color)) {
    throw new Error(`Edge-release E2E: ${side} held auto-exit regressed after tail removal`);
  }
  await page.screenshot({ path: shot(`round121-exit-without-tail-${side}.png`) });
  await page.mouse.up();
}

// A layered block follows the same rule but peels only its current outer layer.
fixture = await findRoutedFixture(Array.from({ length: 60 }, (_, index) => index + 1), true, "layered open-gate");
({ state, block, gate } = fixture);
const beforeLayerCount = block.layers.length;
beforeMoves = state.puzzle.moves;
state = await dragHeldAlongPath(state, block, fixture.path);
block = state.puzzle.blocks.find((candidate) => candidate.id === fixture.block.id);
if (!block || block.layers.length !== beforeLayerCount - 1
  || state.puzzle.moves !== beforeMoves + 1
  || state.selectedId || state.activePointer !== undefined
  || state.exitGhosts !== 0
  || !state.exitPulses.some((pulse) => pulse.side === gate.side && pulse.color === gate.color)) {
  throw new Error("Edge-release E2E: held layered block did not peel exactly one matching layer on alignment");
}
await page.mouse.up();

// Merely touching a border must never bypass color or frozen-gate rules.
({ state, block } = await openWrongColorEdgeFixture(Array.from({ length: 100 }, (_, index) => index + 1)));
const wrongColorBlockId = block.id;
state = await releaseInsideBoard(state, block);
if (!state.puzzle.blocks.some((candidate) => candidate.id === wrongColorBlockId)
  || state.puzzle.moves !== 0 || state.exitPulses.length !== 0) {
  throw new Error("Edge-release E2E: wrong-color edge release was incorrectly accepted");
}

// The two authored frozen exits are intentionally crowded and require other
// clears before their lanes open. Use an isolated interaction fixture to test
// the frozen-gate guard itself without weakening those production layouts.
await page.evaluate(async () => {
  const { PuzzleModel } = await import("/src/core/PuzzleModel.ts");
  const game = window.__COLOR_ESCAPE__;
  const playable = Array.from({ length: 5 }, (_, y) => (
    Array.from({ length: 5 }, (__, x) => [x, y])
  )).flat();
  game.loadLevel(1, true);
  game.model = new PuzzleModel({
    id: 996,
    name: "Frozen gate guard",
    difficulty: "normal",
    timeSeconds: 180,
    reward: 0,
    parMoves: 1,
    width: 5,
    height: 5,
    playable,
    blocked: [],
    gates: [{ id: "red-top-frozen", side: "top", offset: 2, size: 1, color: "red", frozen: 2 }],
    blocks: [
      { id: "red-frozen-guard", x: 2, y: 4, shape: [[0, 0]], color: "red" },
      { id: "blue-remains", x: 4, y: 4, shape: [[0, 0]], color: "blue" },
    ],
  });
  game.selectedId = undefined;
  game.activePointer = undefined;
  game.dragVisual = undefined;
  game.pendingCelebration = 0;
  game.dirty = true;
  game.render();
});
state = await debug();
block = state.puzzle.blocks.find((candidate) => candidate.id === "red-frozen-guard");
gate = state.puzzle.gates.find((candidate) => candidate.id === "red-top-frozen");
if (!block || !gate) throw new Error("Edge-release E2E: isolated frozen-gate fixture did not initialize");
const frozenPath = [[2, 3], [2, 2], [2, 1], [2, 0]];
state = await dragAlongPath(state, block, frozenPath);
if (!state.puzzle.blocks.some((candidate) => candidate.id === block.id)
  || state.puzzle.moves !== 1 || state.exitPulses.length !== 0) {
  throw new Error(`Edge-release E2E: frozen matching gate was incorrectly bypassed (${JSON.stringify({
    levelId: 996,
    blockId: block.id,
    gate,
    path: frozenPath,
    moves: state.puzzle.moves,
    pulses: state.exitPulses,
    blockPresent: state.puzzle.blocks.some((candidate) => candidate.id === block.id),
  })})`);
}
await page.screenshot({ path: shot("round50-edge-release-guards.png") });

if (removedTailRequests.length) {
  throw new Error(`Edge-release E2E: removed exit-tail art was still requested: ${removedTailRequests.join(",")}`);
}
await browser.close();
if (errors.length) throw new Error(`Edge-release browser errors:\n${errors.join("\n")}`);
console.log("Held edge-cell alignment passed without exit-tail art: four-side normal/layered blocks auto-exit before release; wrong-color and frozen gates remain blocked.");
