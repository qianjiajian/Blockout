import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/", import.meta.url));
const shot = (name) => resolve(output, name);
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });

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

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 496, height: 1078 } });
const browserErrors = [];
page.on("console", (message) => { if (message.type() === "error") browserErrors.push(message.text()); });
page.on("pageerror", (error) => browserErrors.push(error.message));

await page.goto(playtestUrl, { waitUntil: "networkidle" });
await page.evaluate((value) => localStorage.setItem("color-escape-save-v1", JSON.stringify(value)), save);
await page.reload({ waitUntil: "networkidle" });
await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready, undefined, { timeout: 5_000 });

const debug = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const screenPoint = (logical) => {
  const viewport = page.viewportSize();
  const scale = Math.min(viewport.width / 496, viewport.height / 1078);
  return {
    x: (viewport.width - 496 * scale) / 2 + logical.x * scale,
    y: (viewport.height - 1078 * scale) / 2 + logical.y * scale,
  };
};
const anchorPoint = (state, block, x = block.x, y = block.y) => {
  const [anchorX, anchorY] = block.shape[0];
  return screenPoint({
    x: state.board.innerX + (x + anchorX + 0.5) * state.board.cell,
    y: state.board.innerY + (y + anchorY + 0.5) * state.board.cell,
  });
};
const blockAt = (state, id) => state.puzzle.blocks.find((block) => block.id === id);

// Resize while a real Pointer drag owns a partially moved block. The resize
// callback must cancel the action, and stale events from that physical pointer
// must remain harmless under the new coordinate transform.
const parking = await page.evaluate(async () => {
  const [{ LEVELS }, { solveLevelForValidation }] = await Promise.all([
    import("/src/core/levels.ts"),
    import("/src/core/levelSolver.ts"),
  ]);
  const drag = solveLevelForValidation(LEVELS[1]).drags.find((candidate) => !candidate.exitSide && candidate.path.length > 0);
  if (!drag) throw new Error("Drag-edge E2E: Lv2 has no parking drag");
  return drag;
});

await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(2, true));
await page.waitForTimeout(80);
let state = await debug();
let block = blockAt(state, parking.blockId);
assert(block, `Drag-edge E2E: missing resize block ${parking.blockId}`);
const origin = { x: block.x, y: block.y };
const firstStep = parking.path[0];
await page.mouse.move(...Object.values(anchorPoint(state, block)));
await page.mouse.down();
await page.mouse.move(...Object.values(anchorPoint(state, block, firstStep[0], firstStep[1])), { steps: 3 });
state = await debug();
block = blockAt(state, parking.blockId);
assert(block?.x === firstStep[0] && block?.y === firstStep[1] && state.activePointer != null,
  `Drag-edge E2E: resize fixture did not enter a partial drag ${JSON.stringify({ block, activePointer: state.activePointer })}`);

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(60);
state = await debug();
block = blockAt(state, parking.blockId);
assert(block?.x === origin.x && block?.y === origin.y
  && state.puzzle.moves === 0 && state.undoActions.length === 0
  && state.selectedId == null && state.activePointer == null && state.dragMotion == null,
`Drag-edge E2E: resize did not safely cancel and restore ${JSON.stringify({ block, moves: state.puzzle.moves, undo: state.undoActions, selectedId: state.selectedId, activePointer: state.activePointer, dragMotion: state.dragMotion })}`);

// This move/up belongs to the pointer that began before resize. It must not be
// reinterpreted using the new viewport scale.
await page.mouse.move(388, 842, { steps: 2 });
await page.mouse.up();
await page.waitForTimeout(50);
state = await debug();
block = blockAt(state, parking.blockId);
assert(block?.x === origin.x && block?.y === origin.y && state.puzzle.moves === 0 && state.undoActions.length === 0,
  "Drag-edge E2E: stale post-resize Pointer samples caused a coordinate jump");
await page.screenshot({ path: shot("round111-resize-drag-cancelled.png") });

// A fresh Pointer under the resized transform must still land exactly one
// intended cell away, proving the cancelled gesture left no coordinate debt.
state = await debug();
block = blockAt(state, parking.blockId);
await page.mouse.move(...Object.values(anchorPoint(state, block)));
await page.mouse.down();
await page.mouse.move(...Object.values(anchorPoint(state, block, firstStep[0], firstStep[1])), { steps: 3 });
await page.mouse.up();
await page.waitForTimeout(120);
state = await debug();
block = blockAt(state, parking.blockId);
assert(block?.x === firstStep[0] && block?.y === firstStep[1]
  && state.puzzle.moves === 1 && state.undoActions.length === 1
  && state.selectedId == null && state.activePointer == null,
`Drag-edge E2E: fresh post-resize drag did not land cleanly ${JSON.stringify({ block, moves: state.puzzle.moves, undo: state.undoActions })}`);

// Find a movable block that can legally reach a wrong-colour gate. Requiring a
// non-empty path gives us a known legal cell to move back to before re-arming.
const wrongExit = await page.evaluate(async () => {
  const { LEVELS } = await import("/src/core/levels.ts");
  const key = (x, y) => `${x},${y}`;
  for (const level of LEVELS) {
    if ((level.elevators?.length ?? 0) || (level.generators?.length ?? 0) || (level.conveyors?.length ?? 0)) continue;
    const playableCells = level.playable ?? Array.from({ length: level.width * level.height }, (_, index) => (
      [index % level.width, Math.floor(index / level.width)]
    ));
    const playable = new Set(playableCells.map(([x, y]) => key(x, y)));
    const closedShutters = new Set((level.shutters ?? []).filter((item) => item.count > 0).map((item) => item.id));
    const shutterCells = new Set();
    for (const shutter of level.shutters ?? []) {
      if (shutter.count <= 0) continue;
      for (let y = shutter.y; y < shutter.y + shutter.height; y += 1) {
        for (let x = shutter.x; x < shutter.x + shutter.width; x += 1) shutterCells.add(key(x, y));
      }
    }
    for (const block of level.blocks) {
      if ((block.frozen ?? 0) > 0 || (block.shutterId && closedShutters.has(block.shutterId))) continue;
      const color = block.layers?.[0] ?? block.color;
      const occupied = new Set([...(level.blocked ?? []).map(([x, y]) => key(x, y)), ...shutterCells]);
      for (const other of level.blocks) {
        if (other.id === block.id || (other.shutterId && closedShutters.has(other.shutterId))) continue;
        for (const [dx, dy] of other.shape) occupied.add(key(other.x + dx, other.y + dy));
      }
      const canPlace = (x, y) => block.shape.every(([dx, dy]) => playable.has(key(x + dx, y + dy)) && !occupied.has(key(x + dx, y + dy)));
      const wrongSideAt = (x, y) => {
        const cells = block.shape.map(([dx, dy]) => [x + dx, y + dy]);
        const xs = cells.map(([cellX]) => cellX); const ys = cells.map(([, cellY]) => cellY);
        const minX = Math.min(...xs); const maxX = Math.max(...xs);
        const minY = Math.min(...ys); const maxY = Math.max(...ys);
        for (const side of ["top", "right", "bottom", "left"]) {
          const atEdge = side === "top" ? minY === 0 : side === "bottom" ? maxY === level.height - 1 : side === "left" ? minX === 0 : maxX === level.width - 1;
          if (!atEdge) continue;
          const gate = level.gates.find((candidate) => candidate.side === side && (
            side === "top" || side === "bottom"
              ? minX >= candidate.offset && maxX < candidate.offset + candidate.size
              : minY >= candidate.offset && maxY < candidate.offset + candidate.size
          ));
          if (gate && gate.color !== color) return side;
        }
        return undefined;
      };
      const start = key(block.x, block.y);
      const queue = [[block.x, block.y]];
      const parent = new Map([[start, undefined]]);
      for (let cursor = 0; cursor < queue.length; cursor += 1) {
        const [x, y] = queue[cursor];
        const side = wrongSideAt(x, y);
        if (side) {
          const path = [];
          let current = key(x, y);
          while (current !== start) {
            path.push(current.split(",").map(Number));
            current = parent.get(current);
          }
          path.reverse();
          const [inwardX, inwardY] = side === "left" ? [x + 1, y]
            : side === "right" ? [x - 1, y]
              : side === "top" ? [x, y + 1]
                : [x, y - 1];
          if (path.length > 0 && canPlace(inwardX, inwardY)) {
            return { levelId: level.id, blockId: block.id, side, path, away: [inwardX, inwardY] };
          }
        }
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nextX = x + dx; const nextY = y + dy; const next = key(nextX, nextY);
          if (parent.has(next) || !canPlace(nextX, nextY)) continue;
          parent.set(next, key(x, y));
          queue.push([nextX, nextY]);
        }
      }
    }
  }
  throw new Error("Drag-edge E2E: no reachable wrong-colour gate fixture");
});

await page.setViewportSize({ width: 496, height: 1078 });
await page.evaluate((id) => window.__COLOR_ESCAPE__.loadLevel(id, true), wrongExit.levelId);
await page.waitForTimeout(80);
state = await debug();
block = blockAt(state, wrongExit.blockId);
assert(block, `Drag-edge E2E: missing wrong-exit block ${wrongExit.blockId}`);
await page.mouse.move(...Object.values(anchorPoint(state, block)));
await page.mouse.down();
for (const [x, y] of wrongExit.path) {
  await page.mouse.move(...Object.values(anchorPoint(state, block, x, y)), { steps: 3 });
}
state = await debug();
block = blockAt(state, wrongExit.blockId);
assert(block, "Drag-edge E2E: wrong-exit block disappeared before the invalid attempt");

const edgeAnchorLogical = {
  x: state.board.innerX + (block.x + block.shape[0][0] + 0.5) * state.board.cell,
  y: state.board.innerY + (block.y + block.shape[0][1] + 0.5) * state.board.cell,
};
const threshold = {
  top: { x: edgeAnchorLogical.x, y: state.board.innerY - 6 },
  bottom: { x: edgeAnchorLogical.x, y: state.board.innerY + state.board.innerHeight + 6 },
  left: { x: state.board.innerX - 6, y: edgeAnchorLogical.y },
  right: { x: state.board.innerX + state.board.innerWidth + 6, y: edgeAnchorLogical.y },
}[wrongExit.side];
const axis = wrongExit.side === "left" || wrongExit.side === "right" ? "x" : "y";
const outwardSign = wrongExit.side === "left" || wrongExit.side === "top" ? -1 : 1;
const logicalJitterPoint = (offset) => ({ ...threshold, [axis]: threshold[axis] + offset * outwardSign });

// First crossing triggers one failure. Crossing back inside/outside by one
// logical pixel keeps the block within the edge-contact tolerance, so the
// original 0.72 s feedback must expire rather than restart at the second crossing.
const outsideLogical = logicalJitterPoint(0.45);
await page.mouse.move(...Object.values(screenPoint(outsideLogical)));
await page.waitForTimeout(300);
state = await debug();
assert(state.exitFailure?.status === "wrong-color", "Drag-edge E2E: initial wrong-colour failure was not presented");
await page.mouse.move(...Object.values(screenPoint(logicalJitterPoint(-0.45))));
await page.mouse.move(...Object.values(screenPoint(outsideLogical)));
state = await debug();
block = blockAt(state, wrongExit.blockId);
assert(block && state.selectedId === wrongExit.blockId && state.activePointer != null,
  "Drag-edge E2E: boundary jitter released or removed the held block");
await page.waitForTimeout(470);
state = await debug();
assert(state.exitFailure == null,
  `Drag-edge E2E: same-side boundary jitter restarted failure feedback ${JSON.stringify(state.exitFailure)}`);

// Move one full legal path cell away from the edge, then return. Only that real
// block departure may clear the latch and permit another failure presentation.
const away = wrongExit.away;
const awayPointerLogical = {
  x: outsideLogical.x + (away[0] - block.x) * state.board.cell,
  y: outsideLogical.y + (away[1] - block.y) * state.board.cell,
};
await page.mouse.move(...Object.values(screenPoint(awayPointerLogical)), { steps: 4 });
state = await debug();
block = blockAt(state, wrongExit.blockId);
assert(block?.x === away[0] && block?.y === away[1],
  `Drag-edge E2E: block did not truly leave the failed edge ${JSON.stringify({ expected: away, block })}`);
await page.mouse.move(...Object.values(screenPoint(outsideLogical)), { steps: 4 });
await page.waitForTimeout(50);
state = await debug();
assert(state.exitFailure?.status === "wrong-color",
  `Drag-edge E2E: leaving and returning to the edge did not re-arm failure feedback ${JSON.stringify({ exitFailure: state.exitFailure, block: blockAt(state, wrongExit.blockId), dragMotion: state.dragMotion, side: wrongExit.side, outsideLogical })}`);
await page.screenshot({ path: shot("round111-wrong-exit-jitter-rearmed.png") });
await page.mouse.up();

await browser.close();
if (browserErrors.length) throw new Error(`Drag-edge browser errors:\n${browserErrors.join("\n")}`);
console.log("Drag edge regressions passed: resize cancellation/stale Pointer isolation and same-edge failure latch/re-arm.");
