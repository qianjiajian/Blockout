import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Prototype-only candidates for the Lv50-53 batch. Every emitted level has a
// complete PuzzleModel replay; production-qualified entries are additionally
// verified after the normal runtime assembler has reinstalled all mechanisms.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index < 0 ? fallback : args[index + 1];
};
const inputRelative = option(
  "--input",
  ".codex-temp/video-parity-v6-lv50-53-baseline-r35/runtime.generated.ts",
);
const contractRelative = option(
  "--contract",
  "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v6.json",
);
const outputDirRelative = option(
  "--output-dir",
  ".codex-temp/video-parity-v6-lv50-53-certified-candidates",
);
const lv51SearchRelative = option(
  "--lv51-search",
  ".codex-temp/lv50-53-hill/lv51-seed5102.json",
);
const lv52SearchRelative = option(
  "--lv52-search",
  ".codex-temp/lv50-53-hill/lv52-seed5202.json",
);
const lv53SearchRelative = option(
  "--lv53-search",
  ".codex-temp/lv50-53-hill/lv53-seed5302.json",
);

const inputPath = resolve(root, inputRelative);
const contractPath = resolve(root, contractRelative);
const [inputText, contractText] = await Promise.all([
  readFile(inputPath, "utf8"),
  readFile(contractPath, "utf8"),
]);
const contract = JSON.parse(contractText);
const lv51Search = JSON.parse(await readFile(resolve(root, lv51SearchRelative), "utf8"));
const lv52Search = JSON.parse(await readFile(resolve(root, lv52SearchRelative), "utf8"));
const lv53Search = JSON.parse(await readFile(resolve(root, lv53SearchRelative), "utf8"));
const bundle = await build({
  stdin: {
    contents: `
      export { VIDEO_PARITY_LEVELS as levels } from ${JSON.stringify(inputPath)};
      export { PuzzleModel, validateLevel } from ${JSON.stringify(resolve(root, "src/core/PuzzleModel.ts"))};
    `,
    resolveDir: root,
    sourcefile: "lv50-53-certified-candidate-runtime.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const runtime = await import(
  `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`
);

const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const SINGLE = [[0, 0]];
const H2 = [[0, 0], [1, 0]];
const V2 = [[0, 0], [0, 1]];
const V3 = [[0, 0], [0, 1], [0, 2]];
const SQ2 = [[0, 0], [1, 0], [0, 1], [1, 1]];

const shapeKind = (block) => {
  const xs = new Set(block.shape.map(([x]) => x));
  const ys = new Set(block.shape.map(([, y]) => y));
  if (block.shape.length === 1) return "SINGLE";
  if (block.shape.length === 2 && ys.size === 1) return "H2";
  if (block.shape.length === 2 && xs.size === 1) return "V2";
  if (block.shape.length === 3 && ys.size === 1) return "H3";
  if (block.shape.length === 3 && xs.size === 1) return "V3";
  if (block.shape.length === 4 && xs.size === 2 && ys.size === 2) return "SQ2";
  return `OTHER_${block.shape.length}`;
};
const histogram = (blocks) => Object.fromEntries(
  [...blocks.reduce((map, block) => {
    const kind = shapeKind(block);
    map.set(kind, (map.get(kind) ?? 0) + 1);
    return map;
  }, new Map())].sort(([left], [right]) => left.localeCompare(right)),
);
const clearRules = (block) => {
  delete block.frozen;
  delete block.shutterId;
  delete block.movementAxis;
  delete block.keyId;
  delete block.lockedBy;
  delete block.lockCount;
  delete block.star;
  delete block.layers;
};
const assign = (block, x, y, shape, color, extra = {}) => {
  clearRules(block);
  Object.assign(block, {
    x,
    y,
    shape: shape.map((point) => [...point]),
    color,
    ...extra,
  });
  return block;
};
const targetFor = (id) => {
  const target = contract.levels.find((entry) => entry.level_id === `Lv${String(id).padStart(3, "0")}`)
    ?.our_design_target;
  if (!target) throw new Error(`Lv${id} is missing from the active design contract`);
  return target;
};
const sourceFor = (id) => {
  const source = runtime.levels.find((level) => level.id === id);
  if (!source) throw new Error(`Lv${id} is missing from ${inputRelative}`);
  return source;
};
const normalizeLevel = (source, target, name) => {
  const level = structuredClone(source);
  level.name = name;
  level.timeSeconds = target.time_seconds;
  level.playable = target.board.playable_mask.flatMap((row, y) => [...row].flatMap((cell, x) => (
    cell === "#" ? [[x, y]] : []
  )));
  delete level.blocked;
  delete level.shutters;
  delete level.generators;
  delete level.elevators;
  delete level.conveyors;
  delete level.onboardingHint;
  delete level.strategyNudge;
  delete level.strategyFocus;
  delete level.featureIntro;
  return level;
};
const pointKey = ([x, y]) => `${x},${y}`;
const routeBuilder = (level) => {
  const model = new runtime.PuzzleModel(level);
  const route = [];
  let repositions = 0;
  let clearLayers = 0;
  const findPath = (blockId, target) => {
    const block = model.getBlock(blockId);
    if (!block || !model.isBlockActive(block)) throw new Error(`${blockId} is not active`);
    const start = [block.x, block.y];
    if (pointKey(start) === pointKey(target)) return [];
    const directions = block.movementAxis === "horizontal"
      ? [[1, 0], [-1, 0]]
      : block.movementAxis === "vertical"
        ? [[0, 1], [0, -1]]
        : [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const queue = [start];
    const parent = new Map([[pointKey(start), null]]);
    const points = new Map([[pointKey(start), start]]);
    let found = null;
    for (let cursor = 0; cursor < queue.length && !found; cursor += 1) {
      const [x, y] = queue[cursor];
      for (const [dx, dy] of directions) {
        const next = [x + dx, y + dy];
        const key = pointKey(next);
        if (parent.has(key) || !model.canPlace(block, ...next)) continue;
        parent.set(key, `${x},${y}`);
        points.set(key, next);
        if (key === pointKey(target)) { found = key; break; }
        queue.push(next);
      }
    }
    if (!found) throw new Error(`no path for ${blockId} to ${target}`);
    const reversed = [];
    for (let key = found; parent.get(key) !== null; key = parent.get(key)) reversed.push(points.get(key));
    return reversed.reverse();
  };
  const push = (blockId, target, exitSide = null) => {
    const drag = { blockId, path: findPath(blockId, target), ...(exitSide ? { exitSide } : {}) };
    model.beginAction();
    for (const [x, y] of drag.path) {
      if (!model.moveBlockStep(blockId, x, y)) throw new Error(`${blockId} failed at ${x},${y}`);
    }
    if (exitSide) {
      const result = model.tryExit(blockId, exitSide);
      if (!result.ok) throw new Error(`${blockId} ${exitSide} exit failed: ${result.reason}`);
      clearLayers += 1;
    } else {
      repositions += 1;
    }
    if (!model.commitAction(true)) throw new Error(`${blockId} action did not commit`);
    route.push(drag);
    return drag;
  };
  return {
    model,
    route,
    push,
    metrics: () => ({ repositions, actions: route.length, clear_layers: clearLayers }),
  };
};

const replayRoute = (level, route) => {
  const model = new runtime.PuzzleModel(level);
  let repositions = 0;
  let clearLayers = 0;
  for (const [index, action] of route.entries()) {
    model.beginAction();
    for (const [x, y] of action.path ?? []) {
      if (!model.moveBlockStep(action.blockId, x, y)) {
        throw new Error(`route ${index + 1} failed for ${action.blockId} at ${x},${y}`);
      }
    }
    if (action.exitSide) {
      const result = model.tryExit(action.blockId, action.exitSide);
      if (!result.ok) throw new Error(`route ${index + 1} exit failed for ${action.blockId}: ${result.reason}`);
      clearLayers += 1;
    } else {
      repositions += 1;
    }
    if (!model.commitAction(true)) throw new Error(`route ${index + 1} did not commit`);
  }
  if (!model.snapshot().complete) throw new Error(`route ended with ${model.snapshot().blocks.length} blocks`);
  return { repositions, actions: route.length, clear_layers: clearLayers };
};

const compatibleAxesForRoute = (level, route, blockId) => {
  const block = level.blocks.find((candidate) => candidate.id === blockId);
  const drags = route.filter((drag) => drag.blockId === blockId);
  if (!block || !drags.length) return [];
  let horizontal = true;
  let vertical = true;
  let x = block.x;
  let y = block.y;
  for (const drag of drags) {
    for (const [nextX, nextY] of drag.path ?? []) {
      if (nextY !== y) horizontal = false;
      if (nextX !== x) vertical = false;
      x = nextX;
      y = nextY;
    }
    if (drag.exitSide === "top" || drag.exitSide === "bottom") horizontal = false;
    if (drag.exitSide === "left" || drag.exitSide === "right") vertical = false;
  }
  return [horizontal ? "horizontal" : null, vertical ? "vertical" : null].filter(Boolean);
};

// The production assembler chooses axis carriers from the authored route.  A
// reversible two-dimensional loop inside a later clear drag leaves the puzzle
// state and action count unchanged, while making a non-carrier ineligible for
// either axis.  This pins the exact searched carrier set without modifying the
// assembler or the mechanism contract.
const pinAxisCarriersInRoute = (level, sourceRoute) => {
  const desired = new Map(level.blocks
    .filter((block) => block.movementAxis !== undefined)
    .map((block) => [block.id, block.movementAxis]));
  const needsLoop = new Set(level.blocks
    .filter((block) => !desired.has(block.id)
      && compatibleAxesForRoute(level, sourceRoute, block.id).length > 0)
    .map((block) => block.id));
  const model = new runtime.PuzzleModel(level);
  const route = [];
  const loopOrders = [
    [[1, 0], [0, 1]], [[1, 0], [0, -1]], [[-1, 0], [0, 1]], [[-1, 0], [0, -1]],
    [[0, 1], [1, 0]], [[0, 1], [-1, 0]], [[0, -1], [1, 0]], [[0, -1], [-1, 0]],
  ];
  for (const [index, original] of sourceRoute.entries()) {
    const action = structuredClone(original);
    const block = model.getBlock(action.blockId);
    if (!block || !model.isBlockActive(block)) throw new Error(`axis pin route ${index + 1}: inactive ${action.blockId}`);
    if (needsLoop.has(action.blockId)) {
      const x = block.x;
      const y = block.y;
      const compatible = compatibleAxesForRoute(level, sourceRoute, action.blockId);
      const excursionDirections = action.exitSide
        ? compatible.flatMap((axis) => axis === "horizontal"
          ? [[0, 1], [0, -1]]
          : [[1, 0], [-1, 0]])
        : [];
      for (const [dx, dy] of excursionDirections) {
        if (model.canPlace(block, x + dx, y + dy)) {
          action.path = [[x + dx, y + dy], [x, y], ...(action.path ?? [])];
          needsLoop.delete(action.blockId);
          break;
        }
      }
      for (const [[ax, ay], [bx, by]] of loopOrders) {
        if (!needsLoop.has(action.blockId)) break;
        const loop = [
          [x + ax, y + ay],
          [x + ax + bx, y + ay + by],
          [x + bx, y + by],
          [x, y],
        ];
        if (loop.every(([nextX, nextY]) => model.canPlace(block, nextX, nextY))) {
          action.path = [...loop, ...(action.path ?? [])];
          needsLoop.delete(action.blockId);
          break;
        }
      }
    }
    model.beginAction();
    for (const [x, y] of action.path ?? []) {
      if (!model.moveBlockStep(action.blockId, x, y)) {
        throw new Error(`axis pin route ${index + 1}: ${action.blockId} failed at ${x},${y}`);
      }
    }
    if (action.exitSide) {
      const result = model.tryExit(action.blockId, action.exitSide);
      if (!result.ok) throw new Error(`axis pin route ${index + 1}: ${action.blockId} exit ${result.reason}`);
    }
    if (!model.commitAction(true)) throw new Error(`axis pin route ${index + 1}: empty action`);
    route.push(action);
  }
  if (!model.snapshot().complete) throw new Error("axis pin route ended incomplete");
  for (const block of level.blocks) {
    const compatible = compatibleAxesForRoute(level, route, block.id);
    if (desired.has(block.id) && !compatible.includes(desired.get(block.id))) {
      throw new Error(`${block.id} lost desired ${desired.get(block.id)} compatibility`);
    }
    if (!desired.has(block.id) && compatible.length && !needsLoop.has(block.id)) {
      throw new Error(`${block.id} remains an unintended axis candidate: ${compatible.join(",")}`);
    }
  }
  return route;
};

function buildLv50() {
  const target = targetFor(50);
  const source = sourceFor(50);
  const level = normalizeLevel(source, target, "九轨交叉锁");
  if (level.width !== 5 || level.height !== 9 || level.playable.length !== 45
    || level.blocks.length !== 13 || level.gates.length !== 9) {
    throw new Error("Lv50 scalar source contract changed");
  }
  const blockSpecs = [
    [3, 7, H2, "orange", "horizontal"],
    [3, 3, H2, "orange", "horizontal"],
    [0, 6, H2, "red", "horizontal"],
    [1, 4, H2, "green", "horizontal"],
    [0, 5, [[0, 0], [1, 0], [2, 0]], "cyan", "horizontal"],
    [0, 3, [[0, 0], [1, 0], [2, 0]], "orange", "horizontal"],
    [1, 7, V2, "yellow", "vertical"],
    [4, 4, V2, "cyan", "vertical"],
    [2, 6, V3, "green", "vertical"],
    [2, 0, V3, "green", "vertical"],
    [3, 4, V3, "cyan", "vertical"],
    [0, 0, V3, "red", "vertical"],
    [3, 1, SQ2, "cyan", "vertical"],
  ];
  level.blocks.forEach((block, index) => assign(
    block,
    blockSpecs[index][0],
    blockSpecs[index][1],
    blockSpecs[index][2],
    blockSpecs[index][3],
    { movementAxis: blockSpecs[index][4] },
  ));
  const gateSpecs = [
    { side: "top", offset: 0, size: 1, color: "red" },
    { side: "top", offset: 1, size: 1, color: "yellow" },
    { side: "top", offset: 2, size: 1, color: "green" },
    { side: "bottom", offset: 3, size: 2, color: "cyan" },
    { side: "left", offset: 3, size: 1, color: "orange" },
    { side: "right", offset: 4, size: 1, color: "green" },
    { side: "right", offset: 5, size: 1, color: "cyan" },
    { side: "right", offset: 6, size: 1, color: "red" },
    { side: "left", offset: 7, size: 1, color: "orange" },
  ];
  level.gates.forEach((gate, index) => {
    Object.assign(gate, gateSpecs[index]);
    delete gate.frozen;
    delete gate.star;
  });
  level.designTargets = {
    formulaVersion: "blockout-d1",
    calibratedDifficulty: target.target_d1_difficulty.calibrated_score,
    minimumRepositionOverhead: target.campaign_reposition_floor,
  };
  runtime.validateLevel(level);
  const id = (index) => level.blocks[index - 1].id;
  const route = [
    { blockId: id(6), path: [], exitSide: "left" },
    { blockId: id(10), path: [], exitSide: "top" },
    { blockId: id(12), path: [], exitSide: "top" },
    { blockId: id(2), path: [[2, 3], [1, 3], [0, 3]], exitSide: "left" },
    { blockId: id(13), path: [[3, 0]] },
    { blockId: id(8), path: [[4, 3], [4, 2]] },
    { blockId: id(11), path: [[3, 3], [3, 2]] },
    { blockId: id(5), path: [[1, 5], [2, 5]], exitSide: "right" },
    { blockId: id(4), path: [[0, 4]] },
    { blockId: id(9), path: [[2, 5], [2, 4], [2, 3], [2, 2], [2, 1], [2, 0]], exitSide: "top" },
    { blockId: id(3), path: [[1, 6], [2, 6], [3, 6]], exitSide: "right" },
    { blockId: id(7), path: [[1, 6], [1, 5]] },
    { blockId: id(1), path: [[2, 7], [1, 7], [0, 7]], exitSide: "left" },
    { blockId: id(11), path: [[3, 3], [3, 4], [3, 5], [3, 6]], exitSide: "bottom" },
    { blockId: id(4), path: [[1, 4], [2, 4], [3, 4]], exitSide: "right" },
    { blockId: id(7), path: [[1, 4], [1, 3], [1, 2], [1, 1], [1, 0]], exitSide: "top" },
    { blockId: id(8), path: [[4, 3], [4, 4], [4, 5], [4, 6], [4, 7]], exitSide: "bottom" },
    { blockId: id(13), path: [[3, 1], [3, 2], [3, 3], [3, 4], [3, 5], [3, 6], [3, 7]], exitSide: "bottom" },
  ];
  const metrics = replayRoute(level, route);
  if (metrics.repositions !== 5 || metrics.actions !== 18 || metrics.clear_layers !== 13) {
    throw new Error(`unexpected Lv50 metrics ${JSON.stringify(metrics)}`);
  }
  if (JSON.stringify(histogram(level.blocks)) !== JSON.stringify({ H2: 4, H3: 2, SQ2: 1, V2: 2, V3: 4 })) {
    throw new Error(`unexpected Lv50 histogram ${JSON.stringify(histogram(level.blocks))}`);
  }
  level.parMoves = metrics.actions;
  return {
    level_id: "Lv050",
    search_attempt: "seed-5-trial-2066-all-axis-rush-hour-exact-optimum-five",
    target: structuredClone(target),
    level,
    route,
    routeSemantics: "fully_assembled_runtime",
    witness_metrics: metrics,
  };
}

function buildLv51() {
  const target = targetFor(51);
  if (lv51Search.level_id !== "Lv051" || lv51Search.seed !== 5102
    || lv51Search.evaluator !== "optimal_gameplay" || !lv51Search.best) {
    throw new Error(`unexpected Lv51 search artifact ${lv51SearchRelative}`);
  }
  const level = structuredClone(lv51Search.best.level);
  const route = pinAxisCarriersInRoute(level, lv51Search.best.route);
  runtime.validateLevel(level);
  const metrics = replayRoute(level, route);
  if (level.width !== 6 || level.height !== 6 || level.playable.length !== 36
    || level.blocks.length !== 12 || level.gates.length !== 7) {
    throw new Error("Lv51 scalar contract changed");
  }
  if (metrics.repositions !== 17 || metrics.actions !== 31 || metrics.clear_layers !== 14) {
    throw new Error(`unexpected Lv51 metrics ${JSON.stringify(metrics)}`);
  }
  if (JSON.stringify(histogram(level.blocks)) !== JSON.stringify({ H3: 9, V3: 3 })) {
    throw new Error(`unexpected Lv51 histogram ${JSON.stringify(histogram(level.blocks))}`);
  }
  const paletteSize = new Set(level.blocks.map((block) => block.color)).size;
  const frozenGates = level.gates.flatMap((gate) => gate.frozen === undefined ? [] : [gate.frozen])
    .sort((left, right) => left - right);
  const frozenBlocks = level.blocks.flatMap((block) => block.frozen === undefined ? [] : [block.frozen]);
  const shellShapes = level.blocks
    .filter((block) => (block.layers?.length ?? 1) > 1)
    .map(shapeKind)
    .sort();
  const axisCount = level.blocks.filter((block) => block.movementAxis !== undefined).length;
  if (paletteSize !== 6
    || JSON.stringify(frozenGates) !== JSON.stringify([3, 4, 5, 6, 8, 10])
    || JSON.stringify(frozenBlocks) !== JSON.stringify([7])
    || JSON.stringify(shellShapes) !== JSON.stringify(["H3", "V3"])
    || axisCount !== 6
    || level.timeSeconds !== 120) {
    throw new Error(`Lv51 mechanism contract mismatch ${JSON.stringify({
      paletteSize, frozenGates, frozenBlocks, shellShapes, axisCount, timeSeconds: level.timeSeconds,
    })}`);
  }
  level.designTargets = {
    formulaVersion: "blockout-d1",
    calibratedDifficulty: target.target_d1_difficulty.calibrated_score,
    minimumRepositionOverhead: target.campaign_reposition_floor,
  };
  level.parMoves = metrics.actions;
  return {
    level_id: "Lv051",
    search_attempt: `deterministic-hillclimb-seed-${lv51Search.seed}-attempt-${lv51Search.best.attempt}-exact-optimum-${lv51Search.best.reposition_overhead}`,
    search_source: lv51SearchRelative,
    target: structuredClone(target),
    level,
    route,
    routeSemantics: "fully_assembled_runtime",
    carrierAssignments: {
      shells: level.blocks
        .filter((block) => (block.layers?.length ?? 1) > 1)
        .map((block) => ({ blockId: block.id, layers: [...block.layers] })),
      numeric_ice: level.blocks
        .filter((block) => block.frozen !== undefined)
        .map((block) => ({ blockId: block.id, value: block.frozen, shape: shapeKind(block) })),
    },
    witness_metrics: metrics,
  };
}

function buildLv52Experimental() {
  const target = targetFor(52);
  const source = sourceFor(52);
  const level = normalizeLevel(source, target, "四通道满舱");
  if (level.width !== 6 || level.height !== 8 || level.playable.length !== 48
    || level.blocks.length !== 19 || level.gates.length !== 6) {
    throw new Error("Lv52 scalar source contract changed");
  }
  const byId = new Map(level.blocks.map((block) => [block.id, block]));
  const b = (index) => {
    const block = byId.get(`cc-052-b1-${String(index).padStart(2, "0")}`);
    if (!block) throw new Error(`missing Lv52 block ${index}`);
    return block;
  };
  const [O, R, Y, P, B, U] = target.design_palette;
  if (new Set([O, R, Y, P, B, U]).size !== 6) throw new Error("Lv52 requires six colours");

  // Core A: five H2 bodies in the west column; four blockers must park east.
  for (let index = 1; index <= 5; index += 1) {
    assign(b(index), 0, index - 1, H2, index === 1 ? Y : P);
  }
  // Core E: a two-H2 side handle in the upper gallery.
  assign(b(6), 2, 4, H2, U);
  assign(b(7), 4, 4, H2, O);
  // Core B: five V3 bodies span the lower bay; four blockers park upward.
  for (let index = 8; index <= 12; index += 1) {
    assign(b(index), index - 7, 5, V3, index === 8 ? U : B, index === 8 ? { movementAxis: "horizontal" } : {});
  }
  // A late blue V3 uses the high frozen counter after thirteen prior clears.
  assign(b(13), 0, 5, V3, B, { movementAxis: "horizontal" });
  // Core C: two SQ2 bodies occupy the top row and require one parking move.
  assign(b(14), 2, 0, SQ2, U, { movementAxis: "horizontal" });
  assign(b(15), 4, 0, SQ2, R);
  // Four ordinary orange peel pieces create the initial upper-gallery space.
  assign(b(16), 2, 2, SQ2, U, { movementAxis: "horizontal" });
  assign(b(17), 4, 2, V2, U, { movementAxis: "horizontal" });
  assign(b(18), 5, 2, SINGLE, U, { movementAxis: "horizontal" });
  assign(b(19), 5, 3, SINGLE, U, { movementAxis: "horizontal" });

  const gateSpecs = [
    { side: "right", offset: 0, size: 8, color: U },
    { side: "left", offset: 0, size: 2, color: R, frozen: 4 },
    { side: "left", offset: 4, size: 1, color: O, frozen: 2 },
    { side: "left", offset: 5, size: 3, color: B, frozen: 3 },
    { side: "bottom", offset: 0, size: 2, color: Y, frozen: 12 },
    { side: "top", offset: 0, size: 2, color: P, frozen: 14 },
  ];
  level.gates.forEach((gate, index) => {
    Object.assign(gate, gateSpecs[index]);
    if (gateSpecs[index].frozen === undefined) delete gate.frozen;
    delete gate.star;
  });
  level.designTargets = {
    formulaVersion: "blockout-d1",
    calibratedDifficulty: target.target_d1_difficulty.calibrated_score,
    minimumRepositionOverhead: target.campaign_reposition_floor,
  };
  try {
    runtime.validateLevel(level);
  } catch (error) {
    throw new Error(`Lv52 validateLevel failed: ${error.message}`);
  }

  const builder = routeBuilder(level);
  // Four direct exits open the upper gallery and thaw the red gate.
  builder.push(b(18).id, [5, 2], "right");
  builder.push(b(19).id, [5, 3], "right");
  builder.push(b(17).id, [5, 2], "right");
  builder.push(b(16).id, [4, 2], "right");
  builder.push(b(15).id, [4, 2]);
  builder.push(b(14).id, [4, 0], "right");
  builder.push(b(15).id, [2, 0]);
  builder.push(b(7).id, [4, 2]);
  builder.push(b(6).id, [4, 4], "right");
  builder.push(b(7).id, [4, 0]);
  builder.push(b(13).id, [0, 5], "left");
  const v3RouteStart = builder.route.length;
  for (let index = 12; index >= 9; index -= 1) builder.push(b(index).id, [index - 7, 2]);
  builder.push(b(8).id, [5, 5], "right");
  for (let index = 9; index <= 12; index += 1) builder.push(b(index).id, [0, 5], "left");
  const v3Route = builder.route.slice(v3RouteStart);
  // Hold the two upper red blockers in the now-empty lower gallery so the
  // west spine can use every row of its east parking lane.
  builder.push(b(7).id, [4, 7]);
  builder.push(b(15).id, [4, 5]);
  builder.push(b(5).id, [2, 4]);
  builder.push(b(7).id, [0, 4], "left");
  builder.push(b(2).id, [4, 1]);
  builder.push(b(1).id, [4, 0]);
  builder.push(b(15).id, [0, 0], "left");
  builder.push(b(1).id, [0, 0]);
  for (let index = 4; index >= 3; index -= 1) builder.push(b(index).id, [2, index - 1]);
  builder.push(b(1).id, [0, 7], "bottom");
  for (let index = 2; index <= 5; index += 1) builder.push(b(index).id, [0, 0], "top");

  const metrics = builder.metrics();
  if (!builder.model.snapshot().complete) throw new Error("Lv52 witness ended incomplete");
  if (metrics.repositions !== 16 || metrics.actions !== 35 || metrics.clear_layers !== 19) {
    throw new Error(`unexpected Lv52 metrics ${JSON.stringify(metrics)}`);
  }
  if (JSON.stringify(histogram(level.blocks)) !== JSON.stringify({ H2: 7, SINGLE: 2, SQ2: 3, V2: 1, V3: 6 })) {
    throw new Error(`unexpected Lv52 histogram ${JSON.stringify(histogram(level.blocks))}`);
  }
  level.parMoves = metrics.actions;
  const qRoute = [
    { blockId: b(15).id, path: [[4, 1], [4, 2]] },
    { blockId: b(14).id, path: [[3, 0], [4, 0]], exitSide: "right" },
    { blockId: b(15).id, path: [[4, 1], [4, 0], [3, 0], [2, 0], [1, 0], [0, 0]], exitSide: "left" },
  ];
  const h2Route = [
    { blockId: b(7).id, path: [[4, 3], [4, 2]] },
    { blockId: b(6).id, path: [[3, 4], [4, 4]], exitSide: "right" },
    { blockId: b(7).id, path: [[4, 3], [4, 4], [3, 4], [2, 4], [1, 4], [0, 4]], exitSide: "left" },
  ];
  const westRoute = [];
  for (let index = 5; index >= 2; index -= 1) {
    westRoute.push({ blockId: b(index).id, path: [[1, index - 1], [2, index - 1]] });
  }
  westRoute.push({
    blockId: b(1).id,
    path: Array.from({ length: 7 }, (_value, index) => [0, index + 1]),
    exitSide: "bottom",
  });
  for (let index = 2; index <= 5; index += 1) {
    westRoute.push({
      blockId: b(index).id,
      path: [[1, index - 1], [0, index - 1], ...Array.from({ length: index - 1 }, (_value, step) => [0, index - step - 2])],
      exitSide: "top",
    });
  }
  const groups = [
    {
      id: "opening-west-five-h2-spine",
      stage_key: "opening",
      block_ids: [1, 2, 3, 4, 5].map((index) => b(index).id),
      floor: 4,
      proof_method: "infinite_parking_relaxation",
      interchangeable_block_id_groups: [[2, 3, 4, 5].map((index) => b(index).id)],
      route: westRoute,
    },
    {
      id: "opening-south-five-v3-spine",
      stage_key: "opening",
      block_ids: [8, 9, 10, 11, 12].map((index) => b(index).id),
      floor: 4,
      proof_method: "infinite_parking_relaxation",
      interchangeable_block_id_groups: [[9, 10, 11, 12].map((index) => b(index).id)],
      route: v3Route,
    },
    {
      id: "opening-north-sq2-pair",
      stage_key: "opening",
      block_ids: [b(14).id, b(15).id],
      floor: 1,
      proof_method: "infinite_parking_relaxation",
      interchangeable_block_id_groups: [],
      route: qRoute,
    },
    {
      id: "opening-middle-h2-pair",
      stage_key: "opening",
      block_ids: [b(6).id, b(7).id],
      floor: 1,
      proof_method: "infinite_parking_relaxation",
      interchangeable_block_id_groups: [],
      route: h2Route,
    },
  ];
  return {
    level_id: "Lv052",
    search_attempt: "crafted-four-disjoint-spines-in-full-board-with-frozen-gate-peel",
    target: structuredClone(target),
    level,
    route: builder.route,
    routeSemantics: "fully_assembled_runtime",
    witness_metrics: metrics,
    core_groups: groups,
  };
}

function buildLv52() {
  const target = targetFor(52);
  if (lv52Search.level_id !== "Lv052" || lv52Search.seed !== 5202
    || lv52Search.evaluator !== "optimal_gameplay" || !lv52Search.best) {
    throw new Error(`unexpected Lv52 search artifact ${lv52SearchRelative}`);
  }
  const level = structuredClone(lv52Search.best.level);
  delete level.blocks.find((block) => block.id === "cc-052-b1-03").movementAxis;
  level.blocks.find((block) => block.id === "cc-052-b1-09").movementAxis = "horizontal";
  const route = pinAxisCarriersInRoute(level, lv52Search.best.route);
  runtime.validateLevel(level);
  const metrics = replayRoute(level, route);
  if (level.width !== 6 || level.height !== 8 || level.playable.length !== 48
    || level.blocks.length !== 19 || level.gates.length !== 6) {
    throw new Error("Lv52 scalar contract changed");
  }
  if (metrics.repositions !== 11 || metrics.actions !== 30 || metrics.clear_layers !== 19) {
    throw new Error(`unexpected Lv52 metrics ${JSON.stringify(metrics)}`);
  }
  if (JSON.stringify(histogram(level.blocks)) !== JSON.stringify({ H2: 7, SINGLE: 2, SQ2: 3, V2: 1, V3: 6 })) {
    throw new Error(`unexpected Lv52 histogram ${JSON.stringify(histogram(level.blocks))}`);
  }
  const paletteSize = new Set(level.blocks.map((block) => block.color)).size;
  const frozenGates = level.gates.flatMap((gate) => gate.frozen === undefined ? [] : [gate.frozen])
    .sort((left, right) => left - right);
  const numericIceCount = level.blocks.filter((block) => block.frozen !== undefined).length;
  const shellCount = level.blocks.filter((block) => (block.layers?.length ?? 1) > 1).length;
  const axisCount = level.blocks.filter((block) => block.movementAxis !== undefined).length;
  if (paletteSize !== 6
    || JSON.stringify(frozenGates) !== JSON.stringify([2, 3, 4, 12, 14])
    || numericIceCount !== 0
    || shellCount !== 0
    || axisCount !== 7
    || level.timeSeconds !== 105) {
    throw new Error(`Lv52 mechanism contract mismatch ${JSON.stringify({
      paletteSize, frozenGates, numericIceCount, shellCount, axisCount, timeSeconds: level.timeSeconds,
    })}`);
  }
  level.designTargets = {
    formulaVersion: "blockout-d1",
    calibratedDifficulty: target.target_d1_difficulty.calibrated_score,
    minimumRepositionOverhead: target.campaign_reposition_floor,
  };
  level.parMoves = metrics.actions;
  return {
    level_id: "Lv052",
    search_attempt: `deterministic-hillclimb-seed-${lv52Search.seed}-attempt-${lv52Search.best.attempt}-exact-optimum-${lv52Search.best.reposition_overhead}`,
    search_source: lv52SearchRelative,
    target: structuredClone(target),
    level,
    route,
    routeSemantics: "fully_assembled_runtime",
    witness_metrics: metrics,
  };
}

function buildLv53() {
  const target = targetFor(53);
  if (lv53Search.level_id !== "Lv053" || lv53Search.seed !== 5302
    || lv53Search.evaluator !== "optimal_gameplay" || !lv53Search.best) {
    throw new Error(`unexpected Lv53 search artifact ${lv53SearchRelative}`);
  }
  const level = structuredClone(lv53Search.best.level);
  const route = structuredClone(lv53Search.best.route);
  runtime.validateLevel(level);
  const metrics = replayRoute(level, route);
  if (level.width !== 5 || level.height !== 6 || level.playable.length !== 30
    || level.blocks.length !== 14 || level.gates.length !== 8) {
    throw new Error("Lv53 scalar contract changed");
  }
  if (metrics.repositions !== 14 || metrics.actions !== 30 || metrics.clear_layers !== 16) {
    throw new Error(`unexpected Lv53 metrics ${JSON.stringify(metrics)}`);
  }
  if (JSON.stringify(histogram(level.blocks)) !== JSON.stringify({ H2: 4, H3: 1, SINGLE: 3, SQ2: 2, V2: 4 })) {
    throw new Error(`unexpected Lv53 histogram ${JSON.stringify(histogram(level.blocks))}`);
  }
  const paletteSize = new Set(level.blocks.map((block) => block.color)).size;
  const frozenGates = level.gates.flatMap((gate) => gate.frozen === undefined ? [] : [gate.frozen])
    .sort((left, right) => left - right);
  const frozenBlocks = level.blocks
    .filter((block) => block.frozen !== undefined)
    .map((block) => `${shapeKind(block)}:${block.frozen}`)
    .sort();
  const shellShapes = level.blocks
    .filter((block) => (block.layers?.length ?? 1) > 1)
    .map(shapeKind)
    .sort();
  const axisCount = level.blocks.filter((block) => block.movementAxis !== undefined).length;
  if (paletteSize !== 7
    || JSON.stringify(frozenGates) !== JSON.stringify([1, 3, 5, 6, 7, 8, 8])
    || JSON.stringify(frozenBlocks) !== JSON.stringify(["H2:7", "H2:7", "SQ2:5"])
    || shellShapes.length !== 2
    || axisCount !== 2
    || level.timeSeconds !== 180) {
    throw new Error(`Lv53 mechanism contract mismatch ${JSON.stringify({
      paletteSize, frozenGates, frozenBlocks, shellShapes, axisCount, timeSeconds: level.timeSeconds,
    })}`);
  }
  level.designTargets = {
    formulaVersion: "blockout-d1",
    calibratedDifficulty: target.target_d1_difficulty.calibrated_score,
    minimumRepositionOverhead: target.campaign_reposition_floor,
  };
  level.parMoves = metrics.actions;
  return {
    level_id: "Lv053",
    search_attempt: `deterministic-hillclimb-seed-${lv53Search.seed}-attempt-${lv53Search.best.attempt}-exact-optimum-${lv53Search.best.reposition_overhead}`,
    search_source: lv53SearchRelative,
    target: structuredClone(target),
    level,
    route,
    routeSemantics: "fully_assembled_runtime",
    witness_metrics: metrics,
  };
}

const entries = [buildLv50(), buildLv51(), buildLv52(), buildLv53()];
const artifact = {
  schema_version: "blockout-video-parity-lv50-53-certified-candidates-v1",
  prototype_only: true,
  applied_to_live_campaign: false,
  source: {
    path: inputRelative,
    sha256: sha256(inputText),
    contract: { path: contractRelative, sha256: sha256(contractText) },
  },
  levels: entries,
};
const witnesses = entries.map((entry) => ({
  level_id: entry.level_id,
  drags: entry.route,
  metrics: entry.witness_metrics,
  source_attempt: entry.search_attempt,
}));
const productionQualifiedIds = new Set(["Lv050", "Lv051", "Lv053"]);
const productionQualifiedEntries = entries.filter((entry) => productionQualifiedIds.has(entry.level_id));
const productionQualifiedArtifact = {
  ...artifact,
  schema_version: "blockout-video-parity-lv50-53-production-qualified-overrides-v1",
  qualification: {
    scope: [...productionQualifiedIds],
    excluded: [{
      level_id: "Lv052",
      reason: "standalone floor passes, but the normal assembler gate-thaw permutation creates a 4-reposition counterexample",
    }],
  },
  levels: productionQualifiedEntries,
};
const productionQualifiedWitnesses = witnesses.filter((entry) => productionQualifiedIds.has(entry.level_id));
const plans = entries.flatMap((entry) => !entry.core_groups?.length ? [] : [({
  level_id: entry.level_id,
  source: "crafted disjoint sealed spines; verifier independently rebuilds every relaxed opening core",
  proof_scope: "disjoint relaxed-core lower bound",
  groups: entry.core_groups,
})]);
const wholeCorePlans = [];
const outputDir = resolve(root, outputDirRelative);
await mkdir(outputDir, { recursive: true });
const artifactText = `${JSON.stringify(artifact, null, 2)}\n`;
const productionQualifiedArtifactText = `${JSON.stringify(productionQualifiedArtifact, null, 2)}\n`;
await Promise.all([
  writeFile(resolve(outputDir, "proof-input.json"), artifactText, "utf8"),
  writeFile(resolve(outputDir, "proof-witness.json"), `${JSON.stringify(witnesses, null, 2)}\n`, "utf8"),
  writeFile(resolve(outputDir, "production-qualified-overrides.json"), productionQualifiedArtifactText, "utf8"),
  writeFile(resolve(outputDir, "production-qualified-witness.json"), `${JSON.stringify(productionQualifiedWitnesses, null, 2)}\n`, "utf8"),
  writeFile(resolve(outputDir, "core-plan.json"), `${JSON.stringify(plans, null, 2)}\n`, "utf8"),
  writeFile(resolve(outputDir, "core-plan-whole.json"), `${JSON.stringify(wholeCorePlans, null, 2)}\n`, "utf8"),
]);
console.log(JSON.stringify({
  output: relative(root, outputDir).replaceAll("\\", "/"),
  contract_sha256: sha256(contractText),
  proof_input_sha256: sha256(artifactText),
  production_qualified_sha256: sha256(productionQualifiedArtifactText),
  levels: entries.map((entry) => ({
    level_id: entry.level_id,
    witness_metrics: entry.witness_metrics,
    core_floor_sum: entry.core_groups?.reduce((sum, group) => sum + group.floor, 0) ?? null,
    shape_histogram: histogram(entry.level.blocks),
  })),
}, null, 2));
