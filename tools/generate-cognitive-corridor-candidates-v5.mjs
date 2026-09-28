import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CONTRACT_PATH = resolve(ROOT, "deliverables/level-generation-blueprint/blockout-lv001-lv100-expanded-density-contract-v5.json");
const SOURCE_PATH = resolve(ROOT, "playtest-results/experiments/competitor-composition-r140/formal-candidates-lv001-lv100.json");
const args = process.argv.slice(2);
const arg = (name, fallback = null) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};
const outputDir = resolve(ROOT, arg("--output-dir", "playtest-results/experiments/competitor-composition-r141/cognitive-corridor-v5"));
const maxPackSeeds = Number(arg("--max-pack-seeds", "200"));
const coreMaxStates = Number(arg("--core-max-states", "1000000"));
const mixedCore = args.includes("--mixed-core");
const allowAreaCoreShapes = args.includes("--allow-area-core-shapes");
const splitFloor = args.includes("--split-floor");
const splitTailBudget = Number(arg("--split-tail-budget", "4"));
const multiCore = args.includes("--multi-core");
const requestedCoreStages = Number(arg("--core-stages", "2"));
const coreFloorPlan = String(arg("--core-floor-plan", ""))
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean)
  .map(Number);
const coreOrientationPlan = String(arg("--core-orientation-plan", ""))
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const maxMixedCoreTilings = Number(arg("--max-mixed-core-tilings", "80"));
const maxMixedCoreSearchTrials = Number(arg("--max-mixed-core-search-trials", "2000"));
const packedCore = args.includes("--packed-core");
const maxPackedCoreTrials = Number(arg("--max-packed-core-trials", "1000"));
const maxPackedCoreBlocks = Number(arg("--max-packed-core-blocks", "10"));
const packedCoreTargetArea = Number(arg("--packed-core-target-area", "0"));
const packedCoreAreaPlan = String(arg("--packed-core-area-plan", ""))
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean)
  .map(Number);
const packedCoreExcludeSingles = args.includes("--packed-core-exclude-singles");
const coreThickness = Number(arg("--core-thickness", "2"));
const minimumCoreThickness = Number(arg("--min-core-thickness", "2"));
const coreColorOverride = String(arg("--core-colors", "")).split(",").map((value) => value.trim()).filter(Boolean);
const coreGateSize = Number(arg("--core-gate-size", "1"));
const maskedOnly = args.includes("--masked-only");
const optionOrientation = arg("--option-orientation", null);
const minimumLaneLength = Number(arg("--min-lane-length", "0"));
const maximumLaneLength = Number(arg("--max-lane-length", String(Number.MAX_SAFE_INTEGER)));
const allowRepeatedCoreOption = args.includes("--allow-repeated-core-option");
const allowOverlappingCoreOptions = args.includes("--allow-overlapping-core-options");
const coreEmptySlack = Number(arg("--core-empty-slack", "3"));
const resourceEfficientCore = args.includes("--resource-efficient-core");
const stagePieceOrder = arg("--stage-piece-order", "large");
const searchStagePieces = args.includes("--search-stage-pieces");
const maxStagePieceSearchTrials = Number(arg("--max-stage-piece-search-trials", "300"));
const stagePieceCandidateIndex = Number(arg("--stage-piece-candidate-index", "0"));
const minimumGeneralGateSize = Number(arg("--minimum-general-gate-size", "1"));
const parseIds = (text) => {
  const ids = new Set();
  for (const token of String(text ?? "").split(",").map((value) => value.trim()).filter(Boolean)) {
    const match = token.match(/^(\d+)(?:-(\d+))?$/);
    if (!match) throw new Error(`Invalid level selection ${token}`);
    for (let id = Number(match[1]); id <= Number(match[2] ?? match[1]); id += 1) ids.add(id);
  }
  return [...ids].sort((left, right) => left - right);
};
const selectedIds = parseIds(arg("--levels"));
if (!selectedIds.length) throw new Error("--levels is required");
if (coreFloorPlan.some((value) => !Number.isInteger(value) || value < 1)) {
  throw new Error("--core-floor-plan must be a comma-separated list of positive integers");
}
if (coreOrientationPlan.some((value) => !["horizontal", "vertical"].includes(value))) {
  throw new Error("--core-orientation-plan entries must be horizontal or vertical");
}
if (packedCoreAreaPlan.some((value) => !Number.isInteger(value) || value < 4)) {
  throw new Error("--packed-core-area-plan must contain integers of at least 4");
}
if (!["large", "small", "random"].includes(stagePieceOrder)) throw new Error("--stage-piece-order must be large, small, or random");

const SHAPES = {
  SINGLE: [[[0, 0]]],
  H2: [[[0, 0], [1, 0]]],
  V2: [[[0, 0], [0, 1]]],
  H3: [[[0, 0], [1, 0], [2, 0]]],
  V3: [[[0, 0], [0, 1], [0, 2]]],
  SQ2: [[[0, 0], [1, 0], [0, 1], [1, 1]]],
  L3: [
    [[0, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [0, 1]],
    [[0, 0], [1, 0], [1, 1]], [[1, 0], [0, 1], [1, 1]],
  ],
  T4: [
    [[0, 0], [1, 0], [2, 0], [1, 1]], [[1, 0], [0, 1], [1, 1], [1, 2]],
    [[1, 0], [0, 1], [1, 1], [2, 1]], [[0, 0], [0, 1], [1, 1], [0, 2]],
  ],
  L4: [
    [[0, 0], [0, 1], [0, 2], [1, 2]], [[0, 0], [1, 0], [2, 0], [0, 1]],
    [[0, 0], [1, 0], [1, 1], [1, 2]], [[2, 0], [0, 1], [1, 1], [2, 1]],
  ],
  CROSS5: [[[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]]],
  RECT2X3: [
    [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2]],
    [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]],
  ],
  SQ3: [[
    [0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2],
  ]],
};
const SHAPE_ORDER = Object.keys(SHAPES);
const CORE_PATTERNS = {
  4: [".B", "BB", "BR", "RR"],
  5: ["BB", "B.", "RB", "RR", "RR"],
  6: ["B.", "BB", "RB", "BB", "RR", "RR"],
  7: [".B", "BB", "BB", "BR", "RB", "RR", "RR"],
  // Extend the certified length-7 corridor with one directly exiting blue
  // block plus the terminal red blocker required by the length-8 pattern.
  // The extra empty cell stays playable, so no permanent obstacle is invented
  // and the contract's exact board mask remains intact.
  8: [".B", "BB", "BB", "BR", "RB", "RR", "RR", "RB"],
};

const runtimeBundle = await build({
  stdin: {
    contents: `
      import { PuzzleModel, validateLevel } from "./src/core/PuzzleModel.ts";
      import { solveLevelForValidation, solveLevelOptimally } from "./src/core/levelSolver.ts";
      export { PuzzleModel, validateLevel, solveLevelForValidation, solveLevelOptimally };
    `,
    resolveDir: ROOT,
    sourcefile: "cognitive-corridor-v5-runtime.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const runtime = await import(`data:text/javascript;base64,${Buffer.from(runtimeBundle.outputFiles[0].contents).toString("base64")}`);

const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const keyOf = (x, y) => `${x},${y}`;
const pointOf = (key) => key.split(",").map(Number);
const allPoints = (width, height) => Array.from({ length: width * height }, (_value, index) => [index % width, Math.floor(index / width)]);
const areaOf = (shapeId) => SHAPES[shapeId][0].length;
const boundsOf = (shape) => ({
  width: Math.max(...shape.map(([x]) => x)) + 1,
  height: Math.max(...shape.map(([, y]) => y)) + 1,
});
const makeRng = (seed) => {
  let state = seed >>> 0 || 1;
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 2 ** 32;
  };
};
const shuffled = (values, seed) => {
  const result = [...values];
  const random = makeRng(seed);
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
};
const replay = (level, route) => {
  const model = new runtime.PuzzleModel(level);
  for (let index = 0; index < route.length; index += 1) {
    const drag = route[index];
    model.beginAction();
    for (const [x, y] of drag.path ?? []) {
      if (!model.moveBlock(drag.blockId, x, y)) return { pass: false, reason: `move_${index}_${x}_${y}` };
    }
    if (drag.exitSide && !model.tryExit(drag.blockId, drag.exitSide).ok) return { pass: false, reason: `exit_${index}` };
    if (!model.commitAction()) return { pass: false, reason: `commit_${index}` };
  }
  const snapshot = model.snapshot();
  return { pass: snapshot.complete, reason: snapshot.complete ? null : `${snapshot.blocks.length}_remain` };
};

const inventoryFor = (histogram) => SHAPE_ORDER.flatMap((shapeId) => Array.from(
  { length: histogram[shapeId] ?? 0 },
  (_value, index) => ({ shapeId, inventoryId: `${shapeId}-${String(index + 1).padStart(2, "0")}` }),
));

const enumeratePlacements = (piece, points, width, height) => {
  const playable = new Set(points.map(([x, y]) => keyOf(x, y)));
  const placements = [];
  const seen = new Set();
  for (const shape of SHAPES[piece.shapeId]) {
    const bounds = boundsOf(shape);
    for (let y = 0; y <= height - bounds.height; y += 1) {
      for (let x = 0; x <= width - bounds.width; x += 1) {
        const cells = shape.map(([dx, dy]) => keyOf(x + dx, y + dy));
        if (!cells.every((cell) => playable.has(cell))) continue;
        const signature = cells.slice().sort().join("|");
        if (seen.has(signature)) continue;
        seen.add(signature);
        placements.push({ piece, x, y, shape, cells });
      }
    }
  }
  return placements;
};

const packPieces = ({ pieces, points, width, height, seed, maxNodes = 600_000 }) => {
  const byInventory = new Map(pieces.map((piece) => [
    piece.inventoryId,
    shuffled(enumeratePlacements(piece, points, width, height), seed ^ Number.parseInt(sha256(piece.inventoryId).slice(0, 8), 16)),
  ]));
  const ordered = [...pieces].sort((left, right) => (
    byInventory.get(left.inventoryId).length - byInventory.get(right.inventoryId).length
    || areaOf(right.shapeId) - areaOf(left.shapeId)
  ));
  const occupied = new Set();
  const chosen = [];
  let nodes = 0;
  const visit = (index) => {
    nodes += 1;
    if (nodes > maxNodes) return false;
    if (index === ordered.length) return true;
    const piece = ordered[index];
    const available = byInventory.get(piece.inventoryId).filter((placement) => (
      placement.cells.every((cell) => !occupied.has(cell))
    )).sort((left, right) => {
      const adjacency = (placement) => placement.cells.reduce((sum, key) => {
        const [x, y] = pointOf(key);
        return sum + [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => occupied.has(keyOf(x + dx, y + dy))).length;
      }, 0);
      return adjacency(right) - adjacency(left);
    });
    for (const placement of available) {
      placement.cells.forEach((cell) => occupied.add(cell));
      chosen.push(placement);
      if (visit(index + 1)) return true;
      chosen.pop();
      placement.cells.forEach((cell) => occupied.delete(cell));
    }
    return false;
  };
  return visit(0) ? { pass: true, placements: chosen, nodes } : { pass: false, nodes };
};

const requiredSpan = (shape, side) => {
  const bounds = boundsOf(shape);
  return side === "top" || side === "bottom" ? bounds.width : bounds.height;
};
const pathToGate = ({ block, remaining, gates, points, width, height }) => {
  const playable = new Set(points.map(([x, y]) => keyOf(x, y)));
  const occupied = new Set(remaining.filter((item) => item.id !== block.id).flatMap((item) => (
    item.shape.map(([dx, dy]) => keyOf(item.x + dx, item.y + dy))
  )));
  const valid = new Set();
  const bounds = boundsOf(block.shape);
  for (let y = 0; y <= height - bounds.height; y += 1) {
    for (let x = 0; x <= width - bounds.width; x += 1) {
      if (block.shape.every(([dx, dy]) => playable.has(keyOf(x + dx, y + dy)) && !occupied.has(keyOf(x + dx, y + dy)))) {
        valid.add(keyOf(x, y));
      }
    }
  }
  const exitAt = (x, y) => gates.find((gate) => {
    if (gate.color !== block.color || requiredSpan(block.shape, gate.side) > gate.size) return false;
    const cells = block.shape.map(([dx, dy]) => [x + dx, y + dy]);
    const xs = cells.map(([cellX]) => cellX);
    const ys = cells.map(([, cellY]) => cellY);
    const atEdge = gate.side === "top" ? Math.min(...ys) === 0
      : gate.side === "bottom" ? Math.max(...ys) === height - 1
        : gate.side === "left" ? Math.min(...xs) === 0
          : Math.max(...xs) === width - 1;
    if (!atEdge) return false;
    return gate.side === "top" || gate.side === "bottom"
      ? Math.min(...xs) >= gate.offset && Math.max(...xs) < gate.offset + gate.size
      : Math.min(...ys) >= gate.offset && Math.max(...ys) < gate.offset + gate.size;
  });
  const start = keyOf(block.x, block.y);
  if (!valid.has(start)) return null;
  const queue = [[block.x, block.y]];
  const parent = new Map([[start, null]]);
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const [x, y] = queue[cursor];
    const gate = exitAt(x, y);
    if (gate) {
      const path = [];
      let key = keyOf(x, y);
      while (key !== start) {
        path.push(pointOf(key));
        key = parent.get(key);
      }
      path.reverse();
      return { path, exitSide: gate.side };
    }
    for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
      const next = keyOf(x + dx, y + dy);
      if (!valid.has(next) || parent.has(next)) continue;
      parent.set(next, keyOf(x, y));
      queue.push([x + dx, y + dy]);
    }
  }
  return null;
};

const colorAndPeel = ({
  placements,
  gates,
  palette,
  points,
  width,
  height,
  levelId,
  stageIndex,
  requireAllColors,
  initialUsed = [],
  requiredColors = [],
}) => {
  const blocks = placements.map((placement, index) => ({
    id: `core-${String(levelId).padStart(3, "0")}-s${stageIndex}-f${String(index + 1).padStart(2, "0")}`,
    x: placement.x,
    y: placement.y,
    shape: placement.shape.map((point) => [...point]),
    color: palette[0],
  }));
  const remaining = [...blocks];
  const route = [];
  const used = new Set(initialUsed);
  while (remaining.length) {
    const candidates = [];
    for (const block of remaining) {
      for (const gate of gates) {
        if (!palette.includes(gate.color) || requiredSpan(block.shape, gate.side) > gate.size) continue;
        block.color = gate.color;
        const exit = pathToGate({ block, remaining, gates, points, width, height });
        if (exit) candidates.push({ block, gate, exit });
      }
    }
    if (!candidates.length) return { pass: false, reason: "no_peelable_block" };
    candidates.sort((left, right) => Number(used.has(left.gate.color)) - Number(used.has(right.gate.color))
      || left.exit.path.length - right.exit.path.length || left.block.shape.length - right.block.shape.length);
    const selected = candidates[0];
    selected.block.color = selected.gate.color;
    used.add(selected.gate.color);
    route.push({ blockId: selected.block.id, path: selected.exit.path, exitSide: selected.exit.exitSide });
    remaining.splice(remaining.indexOf(selected.block), 1);
  }
  const mustCover = requireAllColors ? palette : requiredColors;
  const colorCounts = new Map(palette.map((color) => [color, blocks.filter((block) => block.color === color).length]));
  for (const missingColor of mustCover.filter((color) => !used.has(color))) {
    let replaced = false;
    for (let index = 0; index < route.length && !replaced; index += 1) {
      const block = blocks.find((candidate) => candidate.id === route[index].blockId);
      if (!block) continue;
      const previousColor = block.color;
      if (!initialUsed.includes(previousColor) && (colorCounts.get(previousColor) ?? 0) <= 1) continue;
      for (const gate of gates.filter((candidate) => candidate.color === missingColor)) {
        if (requiredSpan(block.shape, gate.side) > gate.size) continue;
        const liveIds = new Set(route.slice(index).map((drag) => drag.blockId));
        const live = blocks.filter((candidate) => liveIds.has(candidate.id));
        block.color = missingColor;
        const exit = pathToGate({ block, remaining: live, gates, points, width, height });
        if (exit) {
          route[index] = { blockId: block.id, path: exit.path, exitSide: exit.exitSide };
          colorCounts.set(previousColor, (colorCounts.get(previousColor) ?? 0) - 1);
          colorCounts.set(missingColor, (colorCounts.get(missingColor) ?? 0) + 1);
          used.add(missingColor);
          replaced = true;
          break;
        }
        block.color = previousColor;
      }
    }
    if (!replaced) return { pass: false, reason: `required_color_${missingColor}` };
  }
  return { pass: true, blocks, route, usedColors: [...used] };
};

const gateCells = (gate, width, height) => Array.from({ length: gate.size }, (_value, index) => {
  const along = gate.offset + index;
  if (gate.side === "top") return [along, 0];
  if (gate.side === "bottom") return [along, height - 1];
  if (gate.side === "left") return [0, along];
  return [width - 1, along];
});
const gatesOverlap = (left, right) => left.side === right.side
  && left.offset < right.offset + right.size && right.offset < left.offset + left.size;

const corridorOptions = (mask, width, height, singleCount, allowMixedCore = false) => {
  const isPlayable = (x, y) => mask[y]?.[x] === "#";
  const options = [];
  const addHorizontal = (rows, wallRow, side) => {
    if ((!CORE_PATTERNS[width] && !allowMixedCore) || (!allowMixedCore && singleCount < 2 * width - 1)) return;
    if (![...rows, wallRow].every((y) => Array.from(
      { length: width },
      (_v, x) => isPlayable(x, y),
    ).every(Boolean))) return;
    options.push({ orientation: "horizontal", rows, wall: { x: 0, y: wallRow, width, height: 1 }, side, laneLength: width });
  };
  if (height >= 3) {
    addHorizontal([height - 2, height - 1], height - 3, "bottom");
    addHorizontal([0, 1], 2, "top");
  }
  const addVertical = (cols, wallCol, side) => {
    if ((!CORE_PATTERNS[height] && !allowMixedCore) || (!allowMixedCore && singleCount < 2 * height - 1)) return;
    if (![...cols, wallCol].every((x) => Array.from(
      { length: height },
      (_v, y) => isPlayable(x, y),
    ).every(Boolean))) return;
    options.push({ orientation: "vertical", cols, wall: { x: wallCol, y: 0, width: 1, height }, side, laneLength: height });
  };
  if (width >= 3) {
    addVertical([width - 2, width - 1], width - 3, "right");
    addVertical([0, 1], 2, "left");
  }
  if (allowMixedCore) {
    const playable = mask.flatMap((row, y) => [...row].flatMap((cell, x) => cell === "#" ? [[x, y]] : []));
    const playableKeys = new Set(playable.map(([x, y]) => keyOf(x, y)));
    const addMaskedChamber = ({ orientation, x, y, rectWidth, rectHeight }) => {
      const corePoints = Array.from({ length: rectWidth * rectHeight }, (_value, index) => [
        x + (index % rectWidth),
        y + Math.floor(index / rectWidth),
      ]);
      if (!corePoints.every(([cellX, cellY]) => isPlayable(cellX, cellY))) return;
      const coreKeys = new Set(corePoints.map(([cellX, cellY]) => keyOf(cellX, cellY)));
      const sideNeighbors = {
        top: Array.from({ length: rectWidth }, (_value, offset) => [x + offset, y - 1]),
        bottom: Array.from({ length: rectWidth }, (_value, offset) => [x + offset, y + rectHeight]),
        left: Array.from({ length: rectHeight }, (_value, offset) => [x - 1, y + offset]),
        right: Array.from({ length: rectHeight }, (_value, offset) => [x + rectWidth, y + offset]),
      };
      const connectedSides = Object.entries(sideNeighbors).filter(([, points]) => points.some(([cellX, cellY]) => (
        playableKeys.has(keyOf(cellX, cellY)) && !coreKeys.has(keyOf(cellX, cellY))
      )));
      if (connectedSides.length !== 1) return;
      const [connectionSide, wall] = connectedSides[0];
      if (!wall.every(([cellX, cellY]) => playableKeys.has(keyOf(cellX, cellY)))) return;
      const gateSlots = [];
      if (y === 0) for (let offset = 0; offset < rectWidth; offset += 1) gateSlots.push({ globalSide: "top", globalOffset: x + offset, localSide: "top", localOffset: offset });
      if (y + rectHeight === height) for (let offset = 0; offset < rectWidth; offset += 1) gateSlots.push({ globalSide: "bottom", globalOffset: x + offset, localSide: "bottom", localOffset: offset });
      if (x === 0) for (let offset = 0; offset < rectHeight; offset += 1) gateSlots.push({ globalSide: "left", globalOffset: y + offset, localSide: "left", localOffset: offset });
      if (x + rectWidth === width) for (let offset = 0; offset < rectHeight; offset += 1) gateSlots.push({ globalSide: "right", globalOffset: y + offset, localSide: "right", localOffset: offset });
      const movementSides = orientation === "vertical" ? new Set(["top", "bottom"]) : new Set(["left", "right"]);
      const gatePairs = [];
      for (let first = 0; first < gateSlots.length; first += 1) {
        for (let second = first + 1; second < gateSlots.length; second += 1) {
          const pair = [gateSlots[first], gateSlots[second]];
          if (!pair.every((slot) => movementSides.has(slot.globalSide))) continue;
          gatePairs.push(pair);
        }
      }
      if (!gatePairs.length) return;
      gatePairs.sort((left, right) => Number(right[0].globalSide !== right[1].globalSide) - Number(left[0].globalSide !== left[1].globalSide)
        || left[0].globalOffset - right[0].globalOffset || left[1].globalOffset - right[1].globalOffset);
      const wallBounds = {
        x: Math.min(...wall.map(([cellX]) => cellX)),
        y: Math.min(...wall.map(([, cellY]) => cellY)),
        width: Math.max(...wall.map(([cellX]) => cellX)) - Math.min(...wall.map(([cellX]) => cellX)) + 1,
        height: Math.max(...wall.map(([, cellY]) => cellY)) - Math.min(...wall.map(([, cellY]) => cellY)) + 1,
      };
      const wallKeys = new Set(wall.map(([cellX, cellY]) => keyOf(cellX, cellY)));
      options.push({
        orientation,
        side: connectionSide,
        laneLength: orientation === "vertical" ? rectHeight : rectWidth,
        wall: wallBounds,
        maskedChamber: true,
        rect: { x, y, width: rectWidth, height: rectHeight },
        corePoints,
        fillerPoints: playable.filter(([cellX, cellY]) => !coreKeys.has(keyOf(cellX, cellY)) && !wallKeys.has(keyOf(cellX, cellY))),
        gatePair: gatePairs[0],
      });
    };
    for (let laneLength = 4; laneLength <= Math.min(12, height); laneLength += 1) {
      for (let thickness = 2; thickness <= Math.min(coreThickness, width - 1); thickness += 1) {
        for (let y = 0; y + laneLength <= height; y += 1) {
          for (let x = 0; x + thickness <= width; x += 1) addMaskedChamber({ orientation: "vertical", x, y, rectWidth: thickness, rectHeight: laneLength });
        }
      }
    }
    for (let laneLength = 4; laneLength <= Math.min(12, width); laneLength += 1) {
      for (let thickness = 2; thickness <= Math.min(coreThickness, height - 1); thickness += 1) {
        for (let y = 0; y + thickness <= height; y += 1) {
          for (let x = 0; x + laneLength <= width; x += 1) addMaskedChamber({ orientation: "horizontal", x, y, rectWidth: laneLength, rectHeight: thickness });
        }
      }
    }
  }
  const signatures = new Set();
  return options.filter((option) => {
    const signature = `${option.orientation}:${option.rect ? `${option.rect.x},${option.rect.y},${option.rect.width},${option.rect.height}` : option.orientation === "vertical" ? option.cols.join(",") : option.rows.join(",")}:${JSON.stringify(option.gatePair ?? null)}`;
    if (signatures.has(signature)) return false;
    signatures.add(signature);
    return true;
  }).sort((left, right) => Number(left.maskedChamber) - Number(right.maskedChamber) || right.laneLength - left.laneLength);
};

const buildSingleCore = ({ levelId, option, colors }) => {
  const pattern = CORE_PATTERNS[option.laneLength];
  const localBlocks = [];
  for (let y = 0; y < pattern.length; y += 1) {
    for (let x = 0; x < 2; x += 1) {
      const marker = pattern[y][x];
      if (marker === ".") continue;
      localBlocks.push({
        id: `core-${String(levelId).padStart(3, "0")}-c${String(localBlocks.length + 1).padStart(2, "0")}`,
        x,
        y,
        shape: [[0, 0]],
        color: marker === "R" ? colors[0] : colors[1],
      });
    }
  }
  const localLevel = {
    id: 995000 + levelId,
    name: `cognitive corridor ${levelId}`,
    difficulty: "hard",
    timeSeconds: 999,
    reward: 1,
    width: 2,
    height: option.laneLength,
    playable: allPoints(2, option.laneLength),
    gates: [
      { id: "core-red", side: "top", offset: 1, size: 1, color: colors[0] },
      { id: "core-blue", side: "bottom", offset: 1, size: 1, color: colors[1] },
    ],
    blocks: localBlocks,
  };
  runtime.validateLevel(localLevel);
  let solved;
  if (option.laneLength === 8) {
    const baseBlocks = localBlocks.filter((block) => block.y < 7);
    const baseLevel = {
      ...localLevel,
      height: 7,
      playable: allPoints(2, 7),
      blocks: baseBlocks,
    };
    const baseSolved = runtime.solveLevelOptimally(baseLevel, coreMaxStates);
    if (baseSolved.solved) {
      const extensionRight = localBlocks.find((block) => block.x === 1 && block.y === 7);
      const extensionLeft = localBlocks.find((block) => block.x === 0 && block.y === 7);
      const drags = [
        { blockId: extensionRight.id, path: [], exitSide: "bottom" },
        ...baseSolved.drags.map((drag) => ({
          ...drag,
          path: drag.exitSide === "bottom" ? [...drag.path, [1, 7]] : drag.path,
        })),
        {
          blockId: extensionLeft.id,
          path: [[1, 7], [1, 6], [1, 5], [1, 4], [1, 3], [1, 2], [1, 1], [1, 0]],
          exitSide: "top",
        },
      ];
      const replayed = replay(localLevel, drags);
      solved = replayed.pass ? {
        ...baseSolved,
        solved: true,
        drags,
        moves: baseSolved.moves + 2,
        repositionOverhead: baseSolved.repositionOverhead,
      } : { solved: false };
    } else {
      solved = baseSolved;
    }
  } else {
    solved = runtime.solveLevelOptimally(localLevel, coreMaxStates);
  }
  if (!solved.solved) return { pass: false, reason: "core_solver_cap" };
  const transformPoint = ([x, y]) => option.orientation === "vertical"
    ? [option.cols[0] + x, y]
    : [option.laneLength - 1 - y, option.rows[0] + x];
  const transformSide = (side) => option.orientation === "vertical" ? side : ({ top: "right", right: "bottom", bottom: "left", left: "top" })[side];
  const blocks = localBlocks.map((block) => {
    const [x, y] = transformPoint([block.x, block.y]);
    return { ...block, x, y };
  });
  const route = solved.drags.map((drag) => ({
    ...drag,
    path: drag.path.map(transformPoint),
    ...(drag.exitSide ? { exitSide: transformSide(drag.exitSide) } : {}),
  }));
  const gates = option.orientation === "vertical"
    ? [
      { id: `core-${levelId}-red`, side: "top", offset: option.cols[1], size: 1, color: colors[0] },
      { id: `core-${levelId}-blue`, side: "bottom", offset: option.cols[1], size: 1, color: colors[1] },
    ]
    : [
      { id: `core-${levelId}-red`, side: "right", offset: option.rows[1], size: 1, color: colors[0] },
      { id: `core-${levelId}-blue`, side: "left", offset: option.rows[1], size: 1, color: colors[1] },
    ];
  return {
    pass: true,
    blocks,
    route,
    gates,
    floor: solved.repositionOverhead,
    exploredStates: solved.exploredStates,
    floorKind: option.laneLength >= 8 ? "witness_pending_strict_proof" : "exact_optimal_solver",
  };
};

const wallPoints = (wall) => Array.from(
  { length: wall.width * wall.height },
  (_value, index) => [wall.x + (index % wall.width), wall.y + Math.floor(index / wall.width)],
);

const coreGatesFor = ({ levelId, option, colors }) => option.gatePair
  ? option.gatePair.map((slot, index) => ({
    id: `core-${levelId}-${index + 1}`,
    side: slot.globalSide,
    offset: coreGateSize > 1 && option.rect
      ? (slot.globalSide === "top" || slot.globalSide === "bottom" ? option.rect.x : option.rect.y)
      : slot.globalOffset,
    size: coreGateSize,
    color: colors[index],
  }))
  : option.orientation === "vertical"
    ? [
      { id: `core-${levelId}-red`, side: "top", offset: option.cols[1], size: 1, color: colors[0] },
      { id: `core-${levelId}-blue`, side: "bottom", offset: option.cols[1], size: 1, color: colors[1] },
    ]
    : [
      { id: `core-${levelId}-red`, side: "right", offset: option.rows[1], size: 1, color: colors[0] },
      { id: `core-${levelId}-blue`, side: "left", offset: option.rows[1], size: 1, color: colors[1] },
    ];

const mixedCoreTilings = ({ option, inventory, colors }) => {
  const pattern = CORE_PATTERNS[option.laneLength];
  if (!pattern) return { tilings: [], colors };
  const markerByCell = new Map();
  const transformPoint = ([x, y]) => option.orientation === "vertical"
    ? [option.cols[0] + x, y]
    : [option.laneLength - 1 - y, option.rows[0] + x];
  for (let y = 0; y < pattern.length; y += 1) {
    for (let x = 0; x < 2; x += 1) {
      const marker = pattern[y][x];
      if (marker === ".") continue;
      markerByCell.set(keyOf(...transformPoint([x, y])), marker);
    }
  }
  const availableCounts = new Map(SHAPE_ORDER.map((shapeId) => [
    shapeId,
    inventory.filter((piece) => piece.shapeId === shapeId).length,
  ]));
  const placements = [];
  const seen = new Set();
  for (const shapeId of SHAPE_ORDER) {
    if (!(availableCounts.get(shapeId) > 0)) continue;
    for (const shape of SHAPES[shapeId]) {
      const bounds = boundsOf(shape);
      if (!allowAreaCoreShapes && (option.orientation === "horizontal" ? bounds.height !== 1 : bounds.width !== 1)) continue;
      for (const [anchorKey, marker] of markerByCell) {
        const [anchorX, anchorY] = pointOf(anchorKey);
        for (const [pivotX, pivotY] of shape) {
          const x = anchorX - pivotX;
          const y = anchorY - pivotY;
          const cells = shape.map(([dx, dy]) => keyOf(x + dx, y + dy));
          if (!cells.every((cell) => markerByCell.get(cell) === marker)) continue;
          const signature = `${shapeId}:${cells.slice().sort().join("|")}`;
          if (seen.has(signature)) continue;
          seen.add(signature);
          placements.push({ shapeId, shape: shape.map((point) => [...point]), x, y, cells, marker });
        }
      }
    }
  }
  const byCell = new Map([...markerByCell.keys()].map((cell) => [
    cell,
    placements.filter((placement) => placement.cells.includes(cell)),
  ]));
  const uncovered = new Set(markerByCell.keys());
  const usedCounts = new Map();
  const chosen = [];
  const tilings = [];
  const visit = () => {
    if (tilings.length >= maxMixedCoreTilings) return;
    if (!uncovered.size) {
      tilings.push(chosen.map((placement) => ({ ...placement, shape: placement.shape.map((point) => [...point]), cells: [...placement.cells] })));
      return;
    }
    const pivot = [...uncovered].sort((left, right) => {
      const count = (cell) => (byCell.get(cell) ?? []).filter((placement) => (
        (usedCounts.get(placement.shapeId) ?? 0) < (availableCounts.get(placement.shapeId) ?? 0)
        && placement.cells.every((candidate) => uncovered.has(candidate))
      )).length;
      return count(left) - count(right) || left.localeCompare(right);
    })[0];
    const candidates = (byCell.get(pivot) ?? []).filter((placement) => (
      (usedCounts.get(placement.shapeId) ?? 0) < (availableCounts.get(placement.shapeId) ?? 0)
      && placement.cells.every((candidate) => uncovered.has(candidate))
    )).sort((left, right) => left.shape.length - right.shape.length
      || left.shapeId.localeCompare(right.shapeId)
      || left.y - right.y || left.x - right.x);
    for (const placement of candidates) {
      chosen.push(placement);
      usedCounts.set(placement.shapeId, (usedCounts.get(placement.shapeId) ?? 0) + 1);
      placement.cells.forEach((cell) => uncovered.delete(cell));
      visit();
      placement.cells.forEach((cell) => uncovered.add(cell));
      usedCounts.set(placement.shapeId, usedCounts.get(placement.shapeId) - 1);
      chosen.pop();
      if (tilings.length >= maxMixedCoreTilings) break;
    }
  };
  visit();
  return { tilings, colors };
};

const buildMixedCore = ({ levelId, option, colors, inventory, playable, width, height, requiredFloor, additionalBlocked = [] }) => {
  const { tilings } = mixedCoreTilings({ option, inventory, colors });
  if (!tilings.length) return { pass: false, reason: "mixed_core_tiling" };
  const inventoryByShape = new Map(SHAPE_ORDER.map((shapeId) => [
    shapeId,
    inventory.filter((piece) => piece.shapeId === shapeId),
  ]));
  const gates = coreGatesFor({ levelId, option, colors });
  let best = null;
  for (let tilingIndex = 0; tilingIndex < tilings.length; tilingIndex += 1) {
    const shapeUse = new Map();
    const usedInventoryIds = [];
    const blocks = tilings[tilingIndex].map((placement, blockIndex) => {
      const shapeIndex = shapeUse.get(placement.shapeId) ?? 0;
      shapeUse.set(placement.shapeId, shapeIndex + 1);
      const inventoryPiece = inventoryByShape.get(placement.shapeId)[shapeIndex];
      usedInventoryIds.push(inventoryPiece.inventoryId);
      return {
        id: `core-${String(levelId).padStart(3, "0")}-m${String(blockIndex + 1).padStart(2, "0")}`,
        x: placement.x,
        y: placement.y,
        shape: placement.shape.map((point) => [...point]),
        color: placement.marker === "R" ? colors[0] : colors[1],
      };
    });
    const coreLevel = {
      id: 996000 + levelId,
      name: `mixed cognitive corridor ${levelId}`,
      difficulty: "hard",
      timeSeconds: 999,
      reward: 1,
      width,
      height,
      playable,
      blocked: [...new Map([...wallPoints(option.wall), ...additionalBlocked].map((point) => [keyOf(...point), point])).values()],
      gates,
      blocks,
    };
    try { runtime.validateLevel(coreLevel); } catch { continue; }
    const solved = runtime.solveLevelOptimally(coreLevel, coreMaxStates);
    if (!solved.solved || !replay(coreLevel, solved.drags).pass) continue;
    const candidate = {
      pass: true,
      blocks,
      route: solved.drags,
      gates,
      floor: solved.repositionOverhead,
      exploredStates: solved.exploredStates,
      floorKind: "exact_optimal_solver_mixed_linear_tiling",
      usedInventoryIds,
      tilingIndex,
    };
    if (!best || candidate.floor > best.floor
      || (candidate.floor === best.floor && candidate.blocks.length > best.blocks.length)) best = candidate;
    if (candidate.floor >= requiredFloor) return candidate;
    globalThis.gc?.();
  }
  return best ?? { pass: false, reason: "mixed_core_solver_cap" };
};

const buildSearchedMixedCore = ({ levelId, option, colors, inventory, requiredFloor, additionalBlocked = [] }) => {
  const horizontal = option.orientation === "horizontal";
  if (option.rect && (horizontal ? option.rect.height !== 2 : option.rect.width !== 2)) {
    return { pass: false, reason: "mixed_core_requires_two_cell_thickness" };
  }
  const linearShapes = horizontal ? [["SINGLE", 1], ["H2", 2], ["H3", 3]] : [["SINGLE", 1], ["V2", 2], ["V3", 3]];
  const inventoryByShape = new Map(linearShapes.map(([shapeId]) => [
    shapeId,
    inventory.filter((piece) => piece.shapeId === shapeId),
  ]));
  if (linearShapes.every(([shapeId]) => !(inventoryByShape.get(shapeId)?.length))) {
    return { pass: false, reason: "mixed_core_no_linear_inventory" };
  }
  const laneLength = option.laneLength;
  const localWidth = horizontal ? laneLength : 2;
  const localHeight = horizontal ? 2 : laneLength;
  const localPlayable = allPoints(localWidth, localHeight);
  const rng = makeRng(0x6d2b79f5 ^ (levelId * 2_654_435_761));
  const linearCapacity = linearShapes.reduce((sum, [shapeId, length]) => (
    sum + (inventoryByShape.get(shapeId)?.length ?? 0) * length
  ), 0);
  const minimumEmpty = Math.max(1, 2 * laneLength - linearCapacity);
  const maximumEmpty = Math.min(2 * laneLength - 4, minimumEmpty + coreEmptySlack);
  if (minimumEmpty > maximumEmpty) return { pass: false, reason: "mixed_core_linear_capacity" };
  let best = null;
  let efficientBest = null;
  for (let trial = 0; trial < maxMixedCoreSearchTrials; trial += 1) {
    const remaining = new Map(linearShapes.map(([shapeId]) => [shapeId, inventoryByShape.get(shapeId)?.length ?? 0]));
    const desiredEmpty = minimumEmpty + (trial % (maximumEmpty - minimumEmpty + 1));
    let emptyLeft = desiredEmpty;
    const placements = [];
    let failed = false;
    for (let lane = 0; lane < 2 && !failed; lane += 1) {
      let position = 0;
      while (position < laneLength) {
        const cellsLeft = (2 - lane - 1) * laneLength + (laneLength - position);
        const mustPlaceEmpty = emptyLeft >= cellsLeft;
        const chooseEmpty = emptyLeft > 0 && (mustPlaceEmpty || rng() < emptyLeft / cellsLeft);
        if (chooseEmpty) {
          emptyLeft -= 1;
          position += 1;
          continue;
        }
        const choices = linearShapes.filter(([shapeId, length]) => (
          (remaining.get(shapeId) ?? 0) > 0 && position + length <= laneLength
        ));
        if (!choices.length) {
          if (emptyLeft > 0) {
            emptyLeft -= 1;
            position += 1;
            continue;
          }
          failed = true;
          break;
        }
        choices.sort((left, right) => {
          const jitter = rng() - 0.5;
          return trial % 3 === 0 ? right[1] - left[1] + jitter
            : trial % 3 === 1 ? left[1] - right[1] + jitter : jitter;
        });
        const [shapeId, length] = choices[0];
        const coordinate = horizontal ? { x: position, y: lane } : { x: lane, y: position };
        const shape = SHAPES[shapeId][0].map((point) => [...point]);
        const progress = (position + (length - 1) / 2) / Math.max(1, laneLength - 1);
        const inversionColor = horizontal
          ? (progress < 0.5 ? colors[0] : colors[1])
          : (progress < 0.5 ? colors[1] : colors[0]);
        const color = rng() < 0.72 ? inversionColor : (inversionColor === colors[0] ? colors[1] : colors[0]);
        placements.push({ shapeId, shape, ...coordinate, color });
        remaining.set(shapeId, remaining.get(shapeId) - 1);
        position += length;
      }
    }
    if (failed || emptyLeft !== 0 || placements.length < 4
      || !colors.every((color) => placements.some((placement) => placement.color === color))) continue;
    const shapeUse = new Map();
    const usedInventoryIds = [];
    const blocks = placements.map((placement, index) => {
      const shapeIndex = shapeUse.get(placement.shapeId) ?? 0;
      shapeUse.set(placement.shapeId, shapeIndex + 1);
      usedInventoryIds.push(inventoryByShape.get(placement.shapeId)[shapeIndex].inventoryId);
      return {
        id: `core-${String(levelId).padStart(3, "0")}-s${String(index + 1).padStart(2, "0")}`,
        x: placement.x,
        y: placement.y,
        shape: placement.shape,
        color: placement.color,
      };
    });
    const localBlocked = option.rect
      ? additionalBlocked
        .filter(([x, y]) => x >= option.rect.x && x < option.rect.x + option.rect.width
          && y >= option.rect.y && y < option.rect.y + option.rect.height)
        .map(([x, y]) => [x - option.rect.x, y - option.rect.y])
      : [];
    const localGates = option.gatePair
      ? option.gatePair.map((slot, index) => ({
        id: `core-${levelId}-${index + 1}`,
        side: slot.localSide,
        offset: coreGateSize > 1 ? 0 : slot.localOffset,
        size: coreGateSize,
        color: colors[index],
      }))
      : horizontal
        ? [
          { id: `core-${levelId}-red`, side: "right", offset: 1, size: 1, color: colors[0] },
          { id: `core-${levelId}-blue`, side: "left", offset: 1, size: 1, color: colors[1] },
        ]
        : [
          { id: `core-${levelId}-red`, side: "top", offset: 1, size: 1, color: colors[0] },
          { id: `core-${levelId}-blue`, side: "bottom", offset: 1, size: 1, color: colors[1] },
        ];
    const localLevel = {
      id: 997000 + levelId,
      name: `searched mixed cognitive corridor ${levelId}`,
      difficulty: "hard",
      timeSeconds: 999,
      reward: 1,
      width: localWidth,
      height: localHeight,
      playable: localPlayable,
      blocked: localBlocked,
      gates: localGates,
      blocks,
    };
    try { runtime.validateLevel(localLevel); } catch { continue; }
    const solved = runtime.solveLevelOptimally(localLevel, Math.min(coreMaxStates, 300_000));
    if (!solved.solved || !replay(localLevel, solved.drags).pass) continue;
    const transformPoint = ([x, y]) => option.rect
      ? [option.rect.x + x, option.rect.y + y]
      : horizontal ? [x, option.rows[0] + y] : [option.cols[0] + x, y];
    const transformedBlocks = blocks.map((block) => {
      const [x, y] = transformPoint([block.x, block.y]);
      return { ...block, x, y };
    });
    const transformedRoute = solved.drags.map((drag) => ({
      ...drag,
      path: drag.path.map(transformPoint),
    }));
    const candidate = {
      pass: true,
      blocks: transformedBlocks,
      route: transformedRoute,
      gates: coreGatesFor({ levelId, option, colors }),
      floor: solved.repositionOverhead,
      exploredStates: solved.exploredStates,
      floorKind: "exact_optimal_solver_searched_mixed_linear_tiling",
      usedInventoryIds,
      tilingIndex: `search-${trial}`,
    };
    if (!best || candidate.floor > best.floor
      || (candidate.floor === best.floor && candidate.blocks.length > best.blocks.length)) best = candidate;
    if (candidate.floor >= requiredFloor) {
      if (!resourceEfficientCore) return candidate;
      if (!efficientBest || candidate.blocks.length < efficientBest.blocks.length
        || (candidate.blocks.length === efficientBest.blocks.length && candidate.floor > efficientBest.floor)) efficientBest = candidate;
      if (candidate.blocks.length === 4) return candidate;
    }
    globalThis.gc?.();
  }
  return efficientBest ?? best ?? { pass: false, reason: "searched_mixed_core_unresolved" };
};

const buildPackedMixedCore = ({ levelId, option, colors, inventory, requiredFloor, additionalBlocked = [], targetArea = packedCoreTargetArea }) => {
  const horizontal = option.orientation === "horizontal";
  const localWidth = option.rect?.width ?? (horizontal ? option.laneLength : 2);
  const localHeight = option.rect?.height ?? (horizontal ? 2 : option.laneLength);
  const originX = option.rect?.x ?? (horizontal ? 0 : option.cols?.[0] ?? 0);
  const originY = option.rect?.y ?? (horizontal ? option.rows?.[0] ?? 0 : 0);
  const localBlocked = additionalBlocked
    .filter(([x, y]) => x >= originX && x < originX + localWidth && y >= originY && y < originY + localHeight)
    .map(([x, y]) => [x - originX, y - originY]);
  const blockedKeys = new Set(localBlocked.map(([x, y]) => keyOf(x, y)));
  const packingPoints = allPoints(localWidth, localHeight).filter(([x, y]) => !blockedKeys.has(keyOf(x, y)));
  const pair = option.gatePair;
  if (!pair || pair.length !== 2 || pair[0].localSide === pair[1].localSide) {
    return { pass: false, reason: "packed_core_requires_opposite_gate_sides" };
  }
  const gateSize = horizontal ? localHeight : localWidth;
  const localGates = pair.map((slot, index) => ({
    id: `core-${levelId}-packed-${index + 1}`,
    side: slot.localSide,
    offset: 0,
    size: gateSize,
    color: colors[index],
  }));
  const globalGates = pair.map((slot, index) => ({
    id: `core-${levelId}-packed-${index + 1}`,
    side: slot.globalSide,
    offset: slot.globalSide === "top" || slot.globalSide === "bottom" ? originX : originY,
    size: gateSize,
    color: colors[index],
  }));
  const eligible = inventory.filter((piece) => (!packedCoreExcludeSingles || piece.shapeId !== "SINGLE") && SHAPES[piece.shapeId].some((shape) => {
    const bounds = boundsOf(shape);
    return bounds.width <= localWidth && bounds.height <= localHeight;
  }));
  const capacity = packingPoints.length;
  if (eligible.length < 4 || capacity < 5) return { pass: false, reason: "packed_core_capacity" };
  const rng = makeRng(0x91e10da5 ^ Math.imul(levelId, 2_654_435_761));
  let best = null;
  let solvedCount = 0;
  for (let trial = 0; trial < maxPackedCoreTrials; trial += 1) {
    if (trial > 0 && trial % 250 === 0) {
      console.log(`packed-core ${levelId}: trial ${trial}/${maxPackedCoreTrials}, solved ${solvedCount}, best floor ${best?.floor ?? "none"}`);
    }
    const order = shuffled(eligible, Math.floor(rng() * 0xffff_ffff) ^ trial);
    const emptyTarget = 1 + (trial % Math.max(1, Math.min(coreEmptySlack + 2, capacity - 4)));
    const desiredArea = targetArea > 0 ? Math.min(capacity - 1, targetArea) : capacity - emptyTarget;
    const selected = [];
    let selectedArea = 0;
    for (const piece of order) {
      if (selected.length >= maxPackedCoreBlocks) break;
      const area = areaOf(piece.shapeId);
      if (selectedArea + area > desiredArea) continue;
      if (selected.length < 4 || rng() < 0.82) {
        selected.push(piece);
        selectedArea += area;
      }
      if (selectedArea === desiredArea && selected.length >= 4) break;
    }
    const minimumSelectedArea = targetArea > 0
      ? Math.max(4, desiredArea - 2)
      : Math.ceil(capacity * 0.55);
    if (selected.length < 4 || selectedArea < minimumSelectedArea) continue;
    const packed = packPieces({
      pieces: selected,
      points: packingPoints,
      width: localWidth,
      height: localHeight,
      seed: levelId * 500_000 + trial,
      maxNodes: 120_000,
    });
    if (!packed.pass) continue;
    const distanceToSide = (placement, side) => {
      const xs = placement.shape.map(([dx]) => placement.x + dx);
      const ys = placement.shape.map(([, dy]) => placement.y + dy);
      if (side === "top") return Math.min(...ys);
      if (side === "bottom") return localHeight - 1 - Math.max(...ys);
      if (side === "left") return Math.min(...xs);
      return localWidth - 1 - Math.max(...xs);
    };
    const blocks = packed.placements.map((placement, index) => {
      const nearFirstGate = distanceToSide(placement, pair[0].localSide) <= distanceToSide(placement, pair[1].localSide);
      const inverted = nearFirstGate ? colors[1] : colors[0];
      const color = rng() < 0.82 ? inverted : (inverted === colors[0] ? colors[1] : colors[0]);
      return {
        id: `core-${String(levelId).padStart(3, "0")}-p${String(index + 1).padStart(2, "0")}`,
        x: placement.x,
        y: placement.y,
        shape: placement.shape.map((point) => [...point]),
        color,
      };
    });
    if (!colors.every((color) => blocks.some((block) => block.color === color))) continue;
    const localLevel = {
      id: 997500 + levelId,
      name: `packed cognitive corridor ${levelId}`,
      difficulty: "hard",
      timeSeconds: 999,
      reward: 1,
      width: localWidth,
      height: localHeight,
      playable: allPoints(localWidth, localHeight),
      blocked: localBlocked,
      gates: localGates,
      blocks,
    };
    try { runtime.validateLevel(localLevel); } catch { continue; }
    const solved = runtime.solveLevelOptimally(localLevel, coreMaxStates);
    if (!solved.solved || !replay(localLevel, solved.drags).pass) {
      globalThis.gc?.();
      continue;
    }
    solvedCount += 1;
    const transformPoint = ([x, y]) => [originX + x, originY + y];
    const candidate = {
      pass: true,
      blocks: blocks.map((block) => ({ ...block, x: originX + block.x, y: originY + block.y })),
      route: solved.drags.map((drag) => ({ ...drag, path: drag.path.map(transformPoint) })),
      gates: globalGates,
      floor: solved.repositionOverhead,
      exploredStates: solved.exploredStates,
      floorKind: "exact_optimal_solver_packed_mixed_core",
      usedInventoryIds: selected.map((piece) => piece.inventoryId),
      trial,
    };
    if (!best || candidate.floor > best.floor
      || (candidate.floor === best.floor && candidate.blocks.length < best.blocks.length)) {
      best = candidate;
      console.log(`packed-core ${levelId}: new best floor ${candidate.floor} with ${candidate.blocks.length} blocks at trial ${trial}`);
    }
    if (candidate.floor >= requiredFloor) return candidate;
    globalThis.gc?.();
  }
  return best ?? { pass: false, reason: "packed_core_solver_cap" };
};

const chamberPoints = (playable, option, kind) => playable.filter(([x, y]) => {
  if (option.corePoints && option.fillerPoints) {
    const selected = kind === "core" ? option.corePoints : option.fillerPoints;
    return selected.some(([cellX, cellY]) => cellX === x && cellY === y);
  }
  if (option.orientation === "horizontal") {
    if (kind === "core") return option.rows.includes(y);
    return option.side === "bottom" ? y < option.wall.y : y >= option.wall.y + option.wall.height;
  }
  if (kind === "core") return option.cols.includes(x);
  return option.side === "right" ? x < option.wall.x : x >= option.wall.x + option.wall.width;
});

const allocateGeneralGates = ({ sourceGates, coreGates, coreColors, palette, playable, width, height, option, coreOptions = [option] }) => {
  const playableSet = new Set(playable.map(([x, y]) => keyOf(x, y)));
  const sourceByColor = new Map();
  for (const color of palette) {
    const source = sourceGates.find((gate) => gate.color === color);
    sourceByColor.set(color, source ?? { size: 1 });
  }
  const accessibleToOption = (gate, corridorOption) => {
    if (corridorOption.corePoints) {
      const core = new Set(corridorOption.corePoints.map(([x, y]) => keyOf(x, y)));
      return gateCells(gate, width, height).some(([x, y]) => core.has(keyOf(x, y)));
    }
    if (corridorOption.orientation === "horizontal") {
      if (gate.side === corridorOption.side) return true;
      return (gate.side === "left" || gate.side === "right")
        && gate.offset < corridorOption.rows[1] + 1 && gate.offset + gate.size > corridorOption.rows[0];
    }
    if (gate.side === corridorOption.side) return true;
    return (gate.side === "top" || gate.side === "bottom")
      && gate.offset < corridorOption.cols[1] + 1 && gate.offset + gate.size > corridorOption.cols[0];
  };
  const accessibleToCore = (gate) => coreOptions.some((corridorOption) => accessibleToOption(gate, corridorOption));
  const slotCandidates = (size) => {
    const slots = [];
    for (const side of ["top", "right", "bottom", "left"]) {
      const limit = side === "top" || side === "bottom" ? width : height;
      for (let offset = 0; offset + size <= limit; offset += 1) {
        const slot = { side, offset, size };
        if (gateCells(slot, width, height).every(([x, y]) => playableSet.has(keyOf(x, y)))) slots.push(slot);
      }
    }
    return slots;
  };
  const specs = palette
    .filter((color) => coreOptions.length <= 1 || !coreColors.includes(color))
    .map((color) => ({ color, size: Math.max(minimumGeneralGateSize, sourceByColor.get(color).size ?? 1) }))
    .sort((left, right) => right.size - left.size || left.color.localeCompare(right.color));
  const chosen = [...coreGates];
  const result = [];
  const visit = (index) => {
    if (index === specs.length) return true;
    const spec = specs[index];
    const candidates = slotCandidates(spec.size).filter((slot) => (
      !chosen.some((gate) => gatesOverlap(slot, gate))
      && (!coreColors.includes(spec.color) || !accessibleToCore(slot))
    )).sort((left, right) => {
      const fillerBias = (slot) => Number(!accessibleToCore(slot));
      return fillerBias(right) - fillerBias(left)
        || ["top", "left", "right", "bottom"].indexOf(left.side) - ["top", "left", "right", "bottom"].indexOf(right.side)
        || left.offset - right.offset;
    });
    for (const slot of candidates) {
      const gate = { id: `core-${String(option.laneLength).padStart(2, "0")}-${spec.color}-general`, ...slot, color: spec.color };
      chosen.push(gate);
      result.push(gate);
      if (visit(index + 1)) return true;
      result.pop();
      chosen.pop();
    }
    return false;
  };
  return visit(0) ? { pass: true, gates: [...coreGates, ...result] } : { pass: false, reason: "gate_allocation" };
};

const selectStagePiecesFromOrder = ({ remaining, order, minimumArea, maximumArea, minimumTailBlocks }) => {
  const selected = [];
  let area = 0;
  for (const piece of order) {
    if (area >= minimumArea) break;
    if (remaining.length - selected.length <= minimumTailBlocks) break;
    if (area + areaOf(piece.shapeId) > maximumArea) continue;
    selected.push(piece);
    area += areaOf(piece.shapeId);
  }
  return area >= minimumArea ? selected : null;
};

const chooseStagePieces = ({ remaining, minimumArea, maximumArea, minimumTailBlocks }) => {
  const direction = stagePieceOrder === "small" ? 1 : -1;
  const order = stagePieceOrder === "random"
    ? shuffled(remaining, remaining.length * 7919 + minimumArea * 104729)
    : [...remaining].sort((left, right) => direction * (areaOf(left.shapeId) - areaOf(right.shapeId)) || left.inventoryId.localeCompare(right.inventoryId));
  return selectStagePiecesFromOrder({ remaining, order, minimumArea, maximumArea, minimumTailBlocks });
};

const choosePackableStagePieces = ({
  remaining,
  minimumArea,
  maximumArea,
  minimumTailBlocks,
  fillerPoints,
  playable,
  width,
  height,
  levelId,
}) => {
  const signatures = new Set();
  let packableCandidateIndex = 0;
  const orderedCandidates = [
    [...remaining].sort((left, right) => areaOf(right.shapeId) - areaOf(left.shapeId) || left.inventoryId.localeCompare(right.inventoryId)),
    [...remaining].sort((left, right) => areaOf(left.shapeId) - areaOf(right.shapeId) || left.inventoryId.localeCompare(right.inventoryId)),
    ...Array.from({ length: maxStagePieceSearchTrials }, (_value, index) => shuffled(remaining, levelId * 1_000_003 + index + 1)),
  ];
  for (let index = 0; index < orderedCandidates.length; index += 1) {
    const selected = selectStagePiecesFromOrder({
      remaining,
      order: orderedCandidates[index],
      minimumArea,
      maximumArea,
      minimumTailBlocks,
    });
    if (!selected) continue;
    const signature = selected.map((piece) => piece.inventoryId).sort().join("|");
    if (signatures.has(signature)) continue;
    signatures.add(signature);
    const selectedIds = new Set(selected.map((piece) => piece.inventoryId));
    const tail = remaining.filter((piece) => !selectedIds.has(piece.inventoryId));
    if (tail.length < minimumTailBlocks || tail.reduce((sum, piece) => sum + areaOf(piece.shapeId), 0) > playable.length) continue;
    const fillerPack = packPieces({ pieces: selected, points: fillerPoints, width, height, seed: levelId * 300_000 + index, maxNodes: 150_000 });
    if (!fillerPack.pass) continue;
    const tailPack = packPieces({ pieces: tail, points: playable, width, height, seed: levelId * 400_000 + index, maxNodes: 150_000 });
    if (tailPack.pass) {
      if (packableCandidateIndex === stagePieceCandidateIndex) return selected;
      packableCandidateIndex += 1;
    }
  }
  return null;
};

const wallSignature = (option) => new Set(wallPoints(option.wall).map(([x, y]) => keyOf(x, y)));
const orderedOptionSelections = (options, count) => {
  const results = [];
  const visit = (selected, usedWalls) => {
    if (selected.length === count) {
      results.push([...selected]);
      return;
    }
    for (const option of options) {
      if (selected.includes(option)) continue;
      const wall = wallSignature(option);
      if (!allowOverlappingCoreOptions && [...wall].some((cell) => usedWalls.has(cell))) continue;
      selected.push(option);
      visit(selected, new Set([...usedWalls, ...wall]));
      selected.pop();
    }
  };
  visit([], new Set());
  if (allowRepeatedCoreOption) {
    for (const option of options) results.push(Array.from({ length: count }, () => option));
  }
  return results;
};

const generateMultiCoreCandidate = ({
  levelId,
  contractEntry,
  sourceCandidate,
  target,
  mask,
  width,
  height,
  playable,
  inventory,
  options,
}) => {
  const stageCount = Math.max(2, Math.min(5, requestedCoreStages));
  if (coreFloorPlan.length && coreFloorPlan.length !== stageCount) {
    throw new Error(`--core-floor-plan requires exactly ${stageCount} entries`);
  }
  if (coreFloorPlan.length && coreFloorPlan.reduce((sum, value) => sum + value, 0) !== target.recommended_minimum_reposition_overhead) {
    throw new Error(`--core-floor-plan must sum to ${target.recommended_minimum_reposition_overhead}`);
  }
  if (coreOrientationPlan.length && coreOrientationPlan.length !== stageCount) {
    throw new Error(`--core-orientation-plan requires exactly ${stageCount} entries`);
  }
  if (packedCoreAreaPlan.length && packedCoreAreaPlan.length !== stageCount) {
    throw new Error(`--packed-core-area-plan requires exactly ${stageCount} entries`);
  }
  const optionSelections = orderedOptionSelections(options, stageCount).filter((selection) => (
    !coreOrientationPlan.length || selection.every((option, index) => option.orientation === coreOrientationPlan[index])
  ));
  if (!optionSelections.length) return { winner: null, attempts: [{ status: "multi_core_option_selection" }] };
  const paletteOrder = [...target.design_palette]
    .sort((left, right) => {
      const size = (color) => sourceCandidate.level.gates.find((gate) => gate.color === color)?.size ?? 1;
      return size(left) - size(right) || right.localeCompare(left);
    });
  const attempts = [];
  for (const selectedOptions of optionSelections) {
    const repeatedSequence = selectedOptions.every((option) => option === selectedOptions[0]);
    if (!repeatedSequence && paletteOrder.length < stageCount * 2) {
      attempts.push({ selectedOptions, status: "multi_core_distinct_colors" });
      continue;
    }
    let remainingInventory = [...inventory];
    let remainingFloor = target.recommended_minimum_reposition_overhead;
    const cores = [];
    let coreFailure = null;
    for (let stageIndex = 0; stageIndex < stageCount; stageIndex += 1) {
      const option = selectedOptions[stageIndex];
      const colors = repeatedSequence
        ? paletteOrder.slice(0, 2)
        : paletteOrder.slice(stageIndex * 2, stageIndex * 2 + 2);
      const stagesLeft = stageCount - stageIndex;
      const requestedFloor = coreFloorPlan.length
        ? coreFloorPlan[stageIndex]
        : Math.max(1, Math.ceil(remainingFloor / stagesLeft));
      const additionalBlocked = selectedOptions
        .slice(stageIndex + 1)
        .flatMap((futureOption) => wallPoints(futureOption.wall));
      let core = CORE_PATTERNS[option.laneLength] && !option.maskedChamber
        ? buildMixedCore({
          levelId: levelId * 10 + stageIndex,
          option,
          colors,
          inventory: remainingInventory,
          playable,
          width,
          height,
          requiredFloor: requestedFloor,
          additionalBlocked,
        })
        : { pass: false, reason: "no_fixed_pattern" };
      if (!core.pass || core.floor < requestedFloor) {
        const searched = buildSearchedMixedCore({
          levelId: levelId * 10 + stageIndex,
          option,
          colors,
          inventory: remainingInventory,
          requiredFloor: requestedFloor,
          additionalBlocked,
        });
        if (searched.pass && (!core.pass || searched.floor > core.floor)) core = searched;
      }
      if (packedCore && (!core.pass || core.floor < requestedFloor)) {
        const packed = buildPackedMixedCore({
          levelId: levelId * 10 + stageIndex,
          option,
          colors,
          inventory: remainingInventory,
          requiredFloor: requestedFloor,
          additionalBlocked,
          targetArea: packedCoreAreaPlan[stageIndex] ?? packedCoreTargetArea,
        });
        if (packed.pass && (!core.pass || packed.floor > core.floor)) core = packed;
      }
      if (!core.pass || core.floor < requestedFloor || core.blocks.length < 4) {
        coreFailure = { stage_index: stageIndex + 1, requested_floor: requestedFloor, best_floor: core.floor ?? null, reason: core.reason ?? "floor" };
        break;
      }
      const allocatedFloor = stageIndex === stageCount - 1
        ? remainingFloor
        : Math.min(core.floor, requestedFloor);
      remainingFloor -= allocatedFloor;
      const used = new Set(core.usedInventoryIds);
      remainingInventory = remainingInventory.filter((piece) => !used.has(piece.inventoryId));
      cores.push({ option, colors, core, allocatedFloor });
    }
    if (coreFailure || remainingFloor > 0) {
      attempts.push({ selectedOptions, status: "multi_core_floor", failure: coreFailure, remaining_floor: remainingFloor });
      continue;
    }
    const coreGates = [...new Map(cores.flatMap(({ core }) => core.gates).map((gate) => [
      `${gate.side}:${gate.offset}:${gate.size}:${gate.color}`,
      gate,
    ])).values()];
    if (coreGates.some((gate, index) => coreGates.slice(index + 1).some((other) => gatesOverlap(gate, other)))) {
      attempts.push({ selectedOptions, status: "multi_core_gate_overlap" });
      continue;
    }
    const gateAllocation = allocateGeneralGates({
      sourceGates: sourceCandidate.level.gates,
      coreGates,
      coreColors: cores.flatMap(({ colors }) => colors),
      palette: target.design_palette,
      playable,
      width,
      height,
      option: selectedOptions[0],
      coreOptions: selectedOptions,
    });
    if (!gateAllocation.pass) {
      attempts.push({ selectedOptions, status: gateAllocation.reason });
      continue;
    }
    const packDiagnostics = {};
    const recordPackFailure = (reason) => {
      packDiagnostics[reason] = (packDiagnostics[reason] ?? 0) + 1;
    };
    const stagePiecePlan = [];
    for (let seed = 1; seed <= maxPackSeeds; seed += 1) {
      let working = [...remainingInventory];
      const stageFillers = [];
      const usedColors = new Set(cores.flatMap(({ colors }) => colors));
      let packFailure = null;
      for (let stageIndex = 0; stageIndex < cores.length; stageIndex += 1) {
        const { option, core } = cores[stageIndex];
        const fillerPoints = chamberPoints(playable, option, "filler");
        const coreArea = core.blocks.reduce((sum, block) => sum + block.shape.length, 0);
        const remainingArea = working.reduce((sum, piece) => sum + areaOf(piece.shapeId), 0);
        let minimumArea = stageIndex === 0
          ? Math.max(0, Math.ceil(playable.length * 0.5) - coreArea)
          : 0;
        if (stageIndex === cores.length - 1) minimumArea = Math.max(minimumArea, remainingArea - playable.length);
        const maximumArea = Math.min(fillerPoints.length, playable.length - 1 - coreArea);
        let pieces = stagePiecePlan[stageIndex];
        if (pieces === undefined) {
          pieces = minimumArea > 0
            ? searchStagePieces
              ? choosePackableStagePieces({
                remaining: working,
                minimumArea,
                maximumArea,
                minimumTailBlocks: 4,
                fillerPoints,
                playable,
                width,
                height,
                levelId: levelId * 10 + stageIndex,
              })
              : chooseStagePieces({ remaining: working, minimumArea, maximumArea, minimumTailBlocks: 4 })
            : [];
          stagePiecePlan[stageIndex] = pieces;
        }
        if (!pieces) {
          packFailure = `multi_stage_${stageIndex + 1}_piece_allocation`;
          break;
        }
        const ids = new Set(pieces.map((piece) => piece.inventoryId));
        working = working.filter((piece) => !ids.has(piece.inventoryId));
        if (!pieces.length) {
          stageFillers.push({ blocks: [], route: [], usedColors: [...usedColors] });
          continue;
        }
        const packed = packPieces({
          pieces,
          points: fillerPoints,
          width,
          height,
          seed: levelId * 100_000 + stageIndex * 10_000 + seed,
        });
        if (!packed.pass) {
          packFailure = `multi_stage_${stageIndex + 1}_pack`;
          break;
        }
        const colored = colorAndPeel({
          placements: packed.placements,
          gates: gateAllocation.gates,
          palette: target.design_palette,
          points: fillerPoints,
          width,
          height,
          levelId,
          stageIndex: stageIndex + 1,
          requireAllColors: false,
          initialUsed: [...usedColors],
        });
        if (!colored.pass) {
          packFailure = `multi_stage_${stageIndex + 1}_peel:${colored.reason}`;
          break;
        }
        colored.usedColors.forEach((color) => usedColors.add(color));
        stageFillers.push(colored);
      }
      if (packFailure) {
        recordPackFailure(packFailure);
        continue;
      }
      const tailArea = working.reduce((sum, piece) => sum + areaOf(piece.shapeId), 0);
      if (working.length < 4 || tailArea > playable.length) {
        recordPackFailure(working.length < 4 ? "multi_tail_too_few_blocks" : "multi_tail_area");
        continue;
      }
      const tailPacked = packPieces({ pieces: working, points: playable, width, height, seed: levelId * 200_000 + seed });
      if (!tailPacked.pass) {
        recordPackFailure("multi_tail_pack");
        continue;
      }
      const tail = colorAndPeel({
        placements: tailPacked.placements,
        gates: gateAllocation.gates,
        palette: target.design_palette,
        points: playable,
        width,
        height,
        levelId,
        stageIndex: cores.length + 1,
        requireAllColors: false,
        initialUsed: [...usedColors],
        requiredColors: target.design_palette.filter((color) => !usedColors.has(color)),
      });
      if (!tail.pass) {
        recordPackFailure(`multi_tail_peel:${tail.reason}`);
        continue;
      }
      const shutters = cores.map(({ option }, stageIndex) => ({
        id: `multi-${String(levelId).padStart(3, "0")}-stage-${stageIndex + 2}`,
        ...option.wall,
        count: cores.slice(0, stageIndex + 1).reduce((sum, _entry, index) => (
          sum + cores[index].core.blocks.length + stageFillers[index].blocks.length
        ), 0),
        skin: "staging",
      }));
      const groups = cores.map(({ core }, stageIndex) => [
        ...stageFillers[stageIndex].blocks,
        ...core.blocks,
      ].map((block) => stageIndex === 0 ? block : ({ ...block, shutterId: shutters[stageIndex - 1].id })));
      const tailBlocks = tail.blocks.map((block) => ({ ...block, shutterId: shutters.at(-1).id }));
      const route = cores.flatMap(({ core }, stageIndex) => [...stageFillers[stageIndex].route, ...core.route]).concat(tail.route);
      const level = {
        ...structuredClone(sourceCandidate.level),
        id: levelId,
        name: `${sourceCandidate.level.name} multi cognitive corridor`,
        width,
        height,
        playable,
        gates: gateAllocation.gates,
        blocks: [...groups.flat(), ...tailBlocks],
        shutters,
        parMoves: route.length,
        designTargets: {
          formulaVersion: "blockout-d1",
          calibratedDifficulty: target.target_d1_difficulty.calibrated_score,
          minimumRepositionOverhead: target.recommended_minimum_reposition_overhead,
        },
      };
      delete level.blocked;
      delete level.elevators;
      delete level.conveyors;
      delete level.onboardingHint;
      delete level.strategyNudge;
      delete level.strategyFocus;
      try { runtime.validateLevel(level); } catch (error) {
        recordPackFailure(`multi_validate:${error instanceof Error ? error.message : String(error)}`);
        continue;
      }
      const replayResult = replay(level, route);
      if (!replayResult.pass) {
        recordPackFailure(`multi_replay:${replayResult.reason ?? "unknown"}`);
        continue;
      }
      const openingArea = groups[0].reduce((sum, block) => sum + block.shape.length, 0);
      return {
        winner: {
          level_id: contractEntry.level_id,
          target,
          audit: {
            generator: "dense_multi_cognitive_corridor_v5",
            target_reposition_overhead: target.recommended_minimum_reposition_overhead,
            approved_solver_staging_override: target.requires_staged_reveal ? undefined : "v5_nonstaged_floor_guarantee",
            strict_stage_floor_allocation: [...cores.map(({ allocatedFloor }) => allocatedFloor), 0],
            strict_core_floor_groups: cores.map(({ core, allocatedFloor }, stageIndex) => ({
              stage_index: stageIndex + 1,
              block_ids: core.blocks.map((block) => block.id),
              target_reposition_overhead: allocatedFloor,
              route: core.route,
            })),
            multi_corridor: {
              core_stage_count: cores.length,
              opening_occupied_ratio: Number((openingArea / playable.length).toFixed(4)),
              stages: cores.map(({ option, colors, core, allocatedFloor }, index) => ({
                stage_index: index + 1,
                orientation: option.orientation,
                lane_length: option.laneLength,
                core_colors: colors,
                core_block_count: core.blocks.length,
                exact_core_reposition_overhead: core.floor,
                allocated_floor: allocatedFloor,
                wall: option.wall,
              })),
            },
          },
          level,
          route,
        },
        attempts,
      };
    }
    attempts.push({
      selectedOptions,
      status: "multi_core_pack_or_replay",
      diagnostics: packDiagnostics,
      core_summary: cores.map(({ core, allocatedFloor }, index) => ({
        stage_index: index + 1,
        allocated_floor: allocatedFloor,
        exact_floor: core.floor,
        block_count: core.blocks.length,
        occupied_cells: core.blocks.reduce((sum, block) => sum + block.shape.length, 0),
        inventory_ids: core.usedInventoryIds,
      })),
      remaining_inventory: {
        block_count: remainingInventory.length,
        occupied_cells: remainingInventory.reduce((sum, piece) => sum + areaOf(piece.shapeId), 0),
      },
    });
  }
  return { winner: null, attempts };
};

const contract = JSON.parse(await readFile(CONTRACT_PATH, "utf8"));
const source = JSON.parse(await readFile(SOURCE_PATH, "utf8"));
const contractById = new Map(contract.levels.map((entry) => [Number(entry.level_id.slice(2)), entry]));
const sourceById = new Map(source.levels.map((entry) => [Number(entry.level_id.slice(2)), entry]));
const generated = [];
const failures = [];
await mkdir(outputDir, { recursive: true });

const writeProgress = async () => writeFile(resolve(outputDir, "generation-progress.json"), `${JSON.stringify({
  title: "Block Out! dense cognitive-corridor v5 generation progress",
  applied_to_live_campaign: false,
  preservation_scope: { preserved_current_levels: "Lv001-Lv010", generated_scope: "Lv011-Lv100" },
  requested_levels: selectedIds,
  completed_levels: [...generated.map((entry) => entry.level_id), ...failures.map((entry) => entry.level_id)],
  levels: generated,
  failures,
}, null, 2)}\n`, "utf8");

for (const levelId of selectedIds) {
  const contractEntry = contractById.get(levelId);
  const sourceCandidate = sourceById.get(levelId);
  if (!contractEntry || !sourceCandidate) {
    failures.push({ level_id: levelId, reason: "missing_contract_or_source" });
    continue;
  }
  const target = contractEntry.our_design_target;
  const mask = target.board.playable_mask;
  const width = target.board.cols;
  const height = target.board.rows;
  const playable = mask.flatMap((row, y) => [...row].flatMap((cell, x) => cell === "#" ? [[x, y]] : []));
  const inventory = inventoryFor(target.full_level_shape_histogram);
  const sourceGateSize = (color) => sourceCandidate.level.gates.find((gate) => gate.color === color)?.size ?? 1;
  const coreColors = coreColorOverride.length === 2 && coreColorOverride.every((color) => target.design_palette.includes(color))
    ? [...coreColorOverride]
    : [...target.design_palette]
      .sort((left, right) => sourceGateSize(left) - sourceGateSize(right) || right.localeCompare(left))
      .slice(0, 2);
  const options = corridorOptions(mask, width, height, target.full_level_shape_histogram.SINGLE ?? 0, mixedCore)
    .filter((option) => !maskedOnly || option.maskedChamber)
    .filter((option) => !optionOrientation || option.orientation === optionOrientation)
    .filter((option) => !option.rect || (option.orientation === "vertical" ? option.rect.width : option.rect.height) >= minimumCoreThickness)
    .filter((option) => option.laneLength >= minimumLaneLength && option.laneLength <= maximumLaneLength);
  if (multiCore) {
    const result = generateMultiCoreCandidate({
      levelId,
      contractEntry,
      sourceCandidate,
      target,
      mask,
      width,
      height,
      playable,
      inventory,
      options,
    });
    if (result.winner) {
      generated.push(result.winner);
      console.log(`${contractEntry.level_id}: generated ${result.winner.audit.multi_corridor.core_stage_count} cores, allocated floor ${result.winner.audit.strict_stage_floor_allocation.join("+")}`);
    } else {
      failures.push({ level_id: contractEntry.level_id, reason: "no_multi_corridor_candidate", attempts: result.attempts });
      console.log(`${contractEntry.level_id}: unresolved`);
    }
    await writeProgress();
    globalThis.gc?.();
    continue;
  }
  let winner = null;
  const attempts = [];
  const coreRequiredFloor = splitFloor
    ? Math.max(1, target.recommended_minimum_reposition_overhead - splitTailBudget)
    : target.recommended_minimum_reposition_overhead;
  for (const option of options) {
    let core = mixedCore && !option.maskedChamber
      ? buildMixedCore({
        levelId,
        option,
        colors: coreColors,
        inventory,
        playable,
        width,
        height,
        requiredFloor: coreRequiredFloor,
      })
      : mixedCore ? { pass: false, reason: "masked_chamber_requires_search" }
        : buildSingleCore({ levelId, option, colors: coreColors });
    if (mixedCore && (!core.pass || core.floor < coreRequiredFloor)) {
      const searchedCore = buildSearchedMixedCore({
        levelId,
        option,
        colors: coreColors,
        inventory,
        requiredFloor: coreRequiredFloor,
      });
      if (searchedCore.pass && (!core.pass || searchedCore.floor > core.floor)) core = searchedCore;
    }
    if (packedCore && (!core.pass || core.floor < coreRequiredFloor)) {
      const packed = buildPackedMixedCore({
        levelId,
        option,
        colors: coreColors,
        inventory,
        requiredFloor: coreRequiredFloor,
      });
      if (packed.pass && (!core.pass || packed.floor > core.floor)) core = packed;
    }
    if (!core.pass || (!splitFloor && core.floor < target.recommended_minimum_reposition_overhead) || (splitFloor && core.floor < 1)) {
      attempts.push({ option, status: core.reason ?? "core_floor_below_target", floor: core.floor ?? null });
      continue;
    }
    const gateAllocation = allocateGeneralGates({
      sourceGates: sourceCandidate.level.gates,
      coreGates: core.gates,
      coreColors,
      palette: target.design_palette,
      playable,
      width,
      height,
      option,
    });
    if (!gateAllocation.pass) {
      attempts.push({ option, status: gateAllocation.reason });
      continue;
    }
    const coreInventoryIds = new Set(core.usedInventoryIds
      ?? inventory.filter((piece) => piece.shapeId === "SINGLE").slice(0, core.blocks.length).map((piece) => piece.inventoryId));
    const remaining = inventory.filter((piece) => !coreInventoryIds.has(piece.inventoryId));
    const wallCells = option.wall.width * option.wall.height;
    const fillerPoints = chamberPoints(playable, option, "filler");
    const minimumOpeningArea = Math.max(
      Math.ceil(playable.length * 0.5),
      target.full_level_occupied_cell_count - playable.length,
    );
    const coreArea = core.blocks.reduce((sum, block) => sum + block.shape.length, 0);
    const minimumFillerArea = Math.max(0, minimumOpeningArea - coreArea);
    const maximumFillerArea = Math.min(fillerPoints.length, playable.length - 1 - coreArea);
    const minimumTailBlocks = 4;
    const fillerPieces = searchStagePieces
      ? choosePackableStagePieces({
        remaining,
        minimumArea: minimumFillerArea,
        maximumArea: maximumFillerArea,
        minimumTailBlocks,
        fillerPoints,
        playable,
        width,
        height,
        levelId,
      })
      : chooseStagePieces({ remaining, minimumArea: minimumFillerArea, maximumArea: maximumFillerArea, minimumTailBlocks });
    if (!fillerPieces) {
      attempts.push({ option, status: "stage_piece_allocation", minimumFillerArea, maximumFillerArea, wallCells });
      continue;
    }
    const fillerIds = new Set(fillerPieces.map((piece) => piece.inventoryId));
    const tailPieces = remaining.filter((piece) => !fillerIds.has(piece.inventoryId));
    if (tailPieces.length < minimumTailBlocks || tailPieces.reduce((sum, piece) => sum + areaOf(piece.shapeId), 0) > playable.length) {
      attempts.push({ option, status: "tail_capacity" });
      continue;
    }
    const rejectionCounts = {};
    const reject = (reason) => { rejectionCounts[reason] = (rejectionCounts[reason] ?? 0) + 1; };
    for (let seed = 1; seed <= maxPackSeeds && !winner; seed += 1) {
      const fillerPack = packPieces({ pieces: fillerPieces, points: fillerPoints, width, height, seed: levelId * 10_000 + seed });
      if (!fillerPack.pass) { reject("filler_pack"); continue; }
      const filler = colorAndPeel({
        placements: fillerPack.placements,
        gates: gateAllocation.gates,
        palette: target.design_palette,
        points: fillerPoints,
        width,
        height,
        levelId,
        stageIndex: 1,
        requireAllColors: false,
        initialUsed: coreColors,
      });
      if (!filler.pass) { reject(`filler_peel:${filler.reason}`); continue; }
      const tailPack = packPieces({ pieces: tailPieces, points: playable, width, height, seed: levelId * 20_000 + seed });
      if (!tailPack.pass) { reject("tail_pack"); continue; }
      const colorsBeforeTail = new Set([...coreColors, ...filler.usedColors]);
      const tail = colorAndPeel({
        placements: tailPack.placements,
        gates: gateAllocation.gates,
        palette: target.design_palette,
        points: playable,
        width,
        height,
        levelId,
        stageIndex: 2,
        requireAllColors: false,
        initialUsed: [...colorsBeforeTail],
        requiredColors: target.design_palette.filter((color) => !colorsBeforeTail.has(color)),
      });
      if (!tail.pass) { reject(`tail_peel:${tail.reason}`); continue; }
      const firstStageFloor = Math.min(core.floor, target.recommended_minimum_reposition_overhead);
      const tailFloorTarget = target.recommended_minimum_reposition_overhead - firstStageFloor;
      let tailRoute = tail.route;
      let tailValidation = null;
      if (tailFloorTarget > 0) {
        const tailLevel = {
          ...structuredClone(sourceCandidate.level),
          id: levelId,
          name: `${sourceCandidate.level.name} cognitive corridor tail probe`,
          width,
          height,
          playable,
          gates: gateAllocation.gates,
          blocks: tail.blocks,
        };
        delete tailLevel.blocked;
        delete tailLevel.shutters;
        delete tailLevel.elevators;
        delete tailLevel.conveyors;
        delete tailLevel.designTargets;
        delete tailLevel.onboardingHint;
        delete tailLevel.strategyNudge;
        delete tailLevel.strategyFocus;
        try { runtime.validateLevel(tailLevel); } catch { reject("tail_floor_validate"); continue; }
        tailValidation = runtime.solveLevelForValidation(tailLevel, 100_000);
        if (!tailValidation.solved || tailValidation.repositionOverhead < tailFloorTarget
          || !replay(tailLevel, tailValidation.drags).pass) {
          reject("tail_floor_witness_below_target");
          continue;
        }
        tailRoute = tailValidation.drags;
      }
      const usedColors = new Set([...coreColors, ...filler.usedColors, ...tail.usedColors]);
      if (target.design_palette.some((color) => !usedColors.has(color))) {
        reject("global_palette_not_covered");
        continue;
      }
      const openingBlocks = [...core.blocks, ...filler.blocks];
      const shutterId = `core-${String(levelId).padStart(3, "0")}-stage-2`;
      const blocks = [
        ...openingBlocks,
        ...tail.blocks.map((block) => ({ ...block, shutterId })),
      ];
      const route = [...filler.route, ...core.route, ...tailRoute];
      const level = {
        ...structuredClone(sourceCandidate.level),
        id: levelId,
        name: `${sourceCandidate.level.name} cognitive corridor`,
        width,
        height,
        playable,
        gates: gateAllocation.gates,
        blocks,
        shutters: [{ id: shutterId, ...option.wall, count: openingBlocks.length, skin: "staging" }],
        parMoves: route.length,
        designTargets: {
          formulaVersion: "blockout-d1",
          calibratedDifficulty: target.target_d1_difficulty.calibrated_score,
          minimumRepositionOverhead: target.recommended_minimum_reposition_overhead,
        },
      };
      delete level.blocked;
      delete level.elevators;
      delete level.conveyors;
      delete level.onboardingHint;
      delete level.strategyNudge;
      delete level.strategyFocus;
      try { runtime.validateLevel(level); } catch (error) {
        attempts.push({ option, seed, status: `validate:${error.message}` });
        continue;
      }
      const replayed = replay(level, route);
      if (!replayed.pass) {
        attempts.push({ option, seed, status: `replay:${replayed.reason}` });
        continue;
      }
      winner = {
        level_id: contractEntry.level_id,
        target,
        audit: {
          generator: "dense_cognitive_corridor_v5",
          target_reposition_overhead: target.recommended_minimum_reposition_overhead,
          approved_solver_staging_override: target.requires_staged_reveal ? undefined : "v5_nonstaged_floor_guarantee",
          strict_stage_floor_allocation: [firstStageFloor, tailFloorTarget],
          strict_core_floor_groups: [{
            stage_index: 1,
            block_ids: core.blocks.map((block) => block.id),
            target_reposition_overhead: firstStageFloor,
            route: core.route,
          }],
          corridor: {
            orientation: option.orientation,
            lane_length: option.laneLength,
            core_colors: coreColors,
            core_block_count: core.blocks.length,
            core_shape_histogram: Object.fromEntries(SHAPE_ORDER.map((shapeId) => [
              shapeId,
              core.blocks.filter((block) => SHAPES[shapeId].some((shape) => JSON.stringify(shape) === JSON.stringify(block.shape))).length,
            ]).filter(([, count]) => count > 0)),
            exact_core_reposition_overhead: core.floor,
            exact_core_solver_states: core.exploredStates,
            floor_kind: core.floorKind,
            tiling_index: core.tilingIndex ?? null,
            split_floor_enabled: splitFloor,
            first_stage_floor_allocation: firstStageFloor,
            tail_stage_floor_allocation: tailFloorTarget,
            tail_validation_reposition_overhead: tailValidation?.repositionOverhead ?? 0,
            wall: option.wall,
            opening_occupied_ratio: Number((openingBlocks.reduce((sum, block) => sum + block.shape.length, 0) / playable.length).toFixed(4)),
          },
        },
        level,
        route,
      };
    }
    if (winner) break;
    attempts.push({
      option,
      status: "pack_or_peel_exhausted",
      core_floor: core.floor,
      core_summary: {
        block_count: core.blocks.length,
        occupied_cells: core.blocks.reduce((sum, block) => sum + block.shape.length, 0),
        inventory_ids: [...coreInventoryIds],
      },
      filler_inventory_ids: fillerPieces.map((piece) => piece.inventoryId),
      tail_inventory_ids: tailPieces.map((piece) => piece.inventoryId),
      rejection_counts: rejectionCounts,
    });
  }
  if (winner) {
    generated.push(winner);
    console.log(`${contractEntry.level_id}: generated core floor ${winner.audit.corridor.exact_core_reposition_overhead}`);
  } else {
    failures.push({ level_id: contractEntry.level_id, reason: "no_corridor_candidate", attempts });
    console.log(`${contractEntry.level_id}: unresolved`);
  }
  await writeProgress();
  globalThis.gc?.();
}

const report = {
  title: "Block Out! dense cognitive-corridor v5 candidates",
  generated_at: new Date().toISOString(),
  applied_to_live_campaign: false,
  preservation_scope: { preserved_current_levels: "Lv001-Lv010", generated_scope: "Lv011-Lv100" },
  contract: relative(ROOT, CONTRACT_PATH).replaceAll("\\", "/"),
  contract_sha256: sha256(await readFile(CONTRACT_PATH)),
  source: relative(ROOT, SOURCE_PATH).replaceAll("\\", "/"),
  counts: { requested: selectedIds.length, generated: generated.length, failed: failures.length },
  failures,
  levels: generated,
};
await writeFile(resolve(outputDir, "formal-candidates.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ output: relative(ROOT, outputDir).replaceAll("\\", "/"), counts: report.counts, failed: failures.map((item) => item.level_id) }, null, 2));
if (failures.length) process.exitCode = 1;
