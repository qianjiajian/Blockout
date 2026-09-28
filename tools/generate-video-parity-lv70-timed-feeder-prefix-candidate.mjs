import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Isolated Lv70 candidate.  The opening V2 starts the timed feeder but cannot
// clear through its frozen gate.  Four same-colour V2 heads must then leave the
// shared chute before the first ordinary-colour cargo can spawn.  This makes
// five committed parking drags necessary before any layer/body removal while
// preserving the exact competitor inventory, colours, gates, timer and queue.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index < 0 ? fallback : args[index + 1];
};
const inputRelative = option(
  "--input",
  ".codex-temp/video-parity-v6-lv70-baseline-r36/runtime.generated.ts",
);
const contractRelative = option(
  "--contract",
  "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v6.json",
);
const outputDirRelative = option(
  "--output-dir",
  ".codex-temp/video-parity-v6-lv70-timed-feeder-prefix-candidate-r1",
);
const inputPath = resolve(root, inputRelative);
const contractPath = resolve(root, contractRelative);
const [inputText, contractText] = await Promise.all([
  readFile(inputPath, "utf8"),
  readFile(contractPath, "utf8"),
]);
const contract = JSON.parse(contractText);
const target = contract.levels.find((entry) => entry.level_id === "Lv070")?.our_design_target;
if (!target) throw new Error("Lv70 is missing from the active design contract");

const bundle = await build({
  stdin: {
    contents: `
      export { VIDEO_PARITY_LEVELS as levels } from ${JSON.stringify(inputPath)};
      export { PuzzleModel, validateLevel } from ${JSON.stringify(resolve(root, "src/core/PuzzleModel.ts"))};
    `,
    resolveDir: root,
    sourcefile: "lv70-timed-feeder-prefix-candidate-runtime.ts",
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
const source = runtime.levels.find((level) => level.id === 70);
if (!source) throw new Error("Lv70 is missing from the input runtime");

const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const canonicalize = (value) => Array.isArray(value) ? value.map(canonicalize)
  : value && typeof value === "object"
    ? Object.fromEntries(Object.keys(value).sort().flatMap((key) => (
      value[key] === undefined ? [] : [[key, canonicalize(value[key])]]
    )))
    : value;
const canonicalJson = (value) => JSON.stringify(canonicalize(value));
const levelSpecSha256 = (level) => sha256(canonicalJson(level));
const same = (left, right) => canonicalJson(left) === canonicalJson(right);
const sortedNumbers = (values) => [...values].map(Number).sort((left, right) => left - right);
const SINGLE = [[0, 0]];
const V2 = [[0, 0], [0, 1]];
const shapeKind = (block) => block.shape.length === 1 ? "SINGLE"
  : block.shape.length === 2 && block.shape.every(([x]) => x === 0) ? "V2"
    : "UNKNOWN";
const histogram = (blocks) => blocks.reduce((result, block) => {
  const kind = shapeKind(block);
  result[kind] = (result[kind] ?? 0) + 1;
  return result;
}, {});

const level = structuredClone(source);
level.name = "定时投放 · 五步清槽";
level.timeSeconds = target.time_seconds;
level.playable = Array.from({ length: 6 }, (_row, y) => (
  Array.from({ length: 5 }, (_cell, x) => [x, y])
)).flat();
delete level.blocked;
delete level.shutters;
delete level.elevators;
delete level.conveyors;
delete level.onboardingHint;
delete level.strategyNudge;
delete level.strategyFocus;
delete level.featureIntro;

const [yellow, pink, blue, purple] = target.design_palette;
if (new Set([yellow, pink, blue, purple]).size !== 4) throw new Error("Lv70 requires four colours");
const clearRules = (block) => {
  delete block.layers;
  delete block.frozen;
  delete block.shutterId;
  delete block.movementAxis;
  delete block.keyId;
  delete block.lockedBy;
  delete block.lockCount;
  delete block.star;
};
for (const block of level.blocks) clearRules(block);

const generator = level.generators?.[0];
if (!generator || level.generators.length !== 1) throw new Error("Lv70 timed feeder changed unexpectedly");
const queuedIds = new Set(generator.queueBlockIds);
const opening = level.blocks.find((block) => !queuedIds.has(block.id));
const queued = level.blocks.filter((block) => queuedIds.has(block.id));
if (!opening || queued.length !== 17 || shapeKind(opening) !== "V2") {
  throw new Error("Lv70 opening/queue partition changed unexpectedly");
}
const v2Queue = queued.filter((block) => shapeKind(block) === "V2");
const singleQueue = queued.filter((block) => shapeKind(block) === "SINGLE");
if (v2Queue.length !== 8 || singleQueue.length !== 9) {
  throw new Error(`Lv70 queue inventory changed: ${JSON.stringify(histogram(queued))}`);
}

Object.assign(opening, { x: 4, y: 4, shape: V2.map((point) => [...point]), color: pink });
const firstFour = v2Queue.slice(0, 4);
const firstClear = singleQueue[0];
const tail = [...v2Queue.slice(4), ...singleQueue.slice(1)];
generator.queueBlockIds = [...firstFour, firstClear, ...tail].map((block) => block.id);
Object.assign(generator, {
  side: "top",
  offset: 0,
  spawn: [0, 0],
  trigger: "time",
  intervalSeconds: 1,
  initialDelaySeconds: 1,
});
firstFour.forEach((block) => Object.assign(block, {
  // Queued anchors are inert at runtime. Keeping them away from the authored
  // spawn also lets the production assembler's collision heuristic preserve
  // that spawn instead of mistaking queued templates for active occupants.
  x: 4, y: 0, shape: V2.map((point) => [...point]), color: pink,
}));
Object.assign(firstClear, { x: 4, y: 0, shape: SINGLE.map((point) => [...point]), color: yellow });
const tailColours = [blue, purple, yellow, pink];
tail.forEach((block, index) => Object.assign(block, {
    x: 4,
    y: 0,
  color: tailColours[index % tailColours.length],
}));

const gateSpecs = [
  { side: "left", offset: 0, size: 2, color: yellow },
  { side: "top", offset: 4, size: 1, color: pink, frozen: 1 },
  { side: "left", offset: 2, size: 2, color: blue, frozen: 1 },
  { side: "right", offset: 2, size: 2, color: purple, frozen: 1 },
];
level.gates.forEach((gate, index) => {
  const spec = gateSpecs[index];
  if (!spec) throw new Error(`unexpected Lv70 gate ${index}`);
  Object.assign(gate, spec);
  if (spec.frozen === undefined) delete gate.frozen;
  delete gate.star;
});
level.designTargets = {
  formulaVersion: "blockout-d1",
  calibratedDifficulty: target.target_d1_difficulty.calibrated_score,
  minimumRepositionOverhead: target.campaign_reposition_floor,
};
runtime.validateLevel(level);

const activeColour = (block) => block.layers?.[0] ?? block.color;
const cellsAt = (block, x, y) => block.shape.map(([dx, dy]) => [x + dx, y + dy]);
const matchingExitSides = (snapshot, block, x, y) => {
  const cells = cellsAt(block, x, y);
  const xs = cells.map(([cellX]) => cellX);
  const ys = cells.map(([, cellY]) => cellY);
  const minX = Math.min(...xs); const maxX = Math.max(...xs);
  const minY = Math.min(...ys); const maxY = Math.max(...ys);
  return ["top", "right", "bottom", "left"].filter((side) => {
    const edge = side === "top" ? minY === 0
      : side === "bottom" ? maxY === level.height - 1
        : side === "left" ? minX === 0
          : maxX === level.width - 1;
    if (!edge) return false;
    const gate = snapshot.gates.find((candidate) => candidate.side === side
      && candidate.frozen === 0
      && candidate.color === activeColour(block)
      && (side === "top" || side === "bottom"
        ? minX >= candidate.offset && maxX < candidate.offset + candidate.size
        : minY >= candidate.offset && maxY < candidate.offset + candidate.size));
    return Boolean(gate);
  });
};
const pathTo = (reached, key) => {
  const path = [];
  let cursor = key;
  while (cursor) {
    const node = reached.get(cursor);
    path.push(node.point);
    cursor = node.parent;
  }
  return path.reverse().slice(1);
};
const findPath = (model, blockId, target = null, requireExit = false) => {
  const snapshot = model.snapshot();
  const block = model.getBlock(blockId);
  if (!block || !model.isBlockActive(block)) throw new Error(`inactive route block ${blockId}`);
  const startKey = `${block.x},${block.y}`;
  const reached = new Map([[startKey, { point: [block.x, block.y], parent: null }]]);
  const queue = [[block.x, block.y]];
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const [x, y] = queue[cursor];
    const key = `${x},${y}`;
    const exits = matchingExitSides(snapshot, block, x, y);
    if (requireExit && exits.length) return { path: pathTo(reached, key), exitSide: exits[0] };
    if (target && x === target[0] && y === target[1]) return { path: pathTo(reached, key) };
    for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
      const nextX = x + dx; const nextY = y + dy; const nextKey = `${nextX},${nextY}`;
      if (reached.has(nextKey) || !model.canPlace(block, nextX, nextY)) continue;
      reached.set(nextKey, { point: [nextX, nextY], parent: key });
      queue.push([nextX, nextY]);
    }
  }
  throw new Error(`no ${requireExit ? "exit" : `path to ${target}`} for ${blockId}`);
};

const model = new runtime.PuzzleModel(level);
const route = [];
let repositionCount = 0;
let clearCount = 0;
const drag = (blockId, destination, exit = false) => {
  const action = findPath(model, blockId, destination, exit);
  model.beginAction();
  for (const [x, y] of action.path) {
    if (!model.moveBlockStep(blockId, x, y)) throw new Error(`route step rejected ${blockId}@${x},${y}`);
  }
  if (action.exitSide) {
    const result = model.tryExit(blockId, action.exitSide);
    if (!result.ok) throw new Error(`route exit rejected ${blockId}->${action.exitSide}: ${result.reason}`);
    clearCount += 1;
  } else repositionCount += 1;
  if (!model.commitAction(true)) throw new Error(`route commit rejected ${blockId}`);
  route.push({ kind: "drag", blockId, path: action.path, ...(action.exitSide ? { exitSide: action.exitSide } : {}) });
};
const waitForNextHead = (expectedId) => {
  model.tick(1);
  route.push({ kind: "wait", seconds: 1, event: "timed-generator" });
  if (!model.snapshot().blocks.some((block) => block.id === expectedId)) {
    throw new Error(`timed feeder did not release ${expectedId}`);
  }
};

// First paid move starts the feeder; four blocked-colour heads then vacate its
// shared spawn.  The fifth head is the first block with an ordinary exit.
drag(opening.id, [3, 4]);
const parking = [[1, 0], [2, 0], [3, 0], [4, 0]];
firstFour.forEach((block, index) => {
  waitForNextHead(block.id);
  drag(block.id, parking[index]);
});
waitForNextHead(firstClear.id);
drag(firstClear.id, null, true);

// All three countdown-one gates are now thawed.  Empty the parked prefix in
// reverse order, clear the starter, then consume each remaining feeder head.
for (const block of [...firstFour].reverse()) drag(block.id, null, true);
drag(opening.id, null, true);
for (const block of tail) {
  waitForNextHead(block.id);
  drag(block.id, null, true);
}
const finalSnapshot = model.snapshot();
if (!finalSnapshot.complete || finalSnapshot.blocks.length || finalSnapshot.queuedBlocks.length) {
  throw new Error(`Lv70 route incomplete: active=${finalSnapshot.blocks.length}, queued=${finalSnapshot.queuedBlocks.length}`);
}
if (repositionCount !== 5 || clearCount !== 18) {
  throw new Error(`Lv70 route metrics drifted: repositions=${repositionCount}, clears=${clearCount}`);
}
level.parMoves = route.filter((action) => action.kind === "drag").length;

const openingBlocks = level.blocks.filter((block) => !queuedIds.has(block.id));
const actual = {
  rows: level.height,
  cols: level.width,
  playable_cell_count: level.playable.length,
  time_seconds: level.timeSeconds,
  block_count: level.blocks.length,
  occupied_cell_count: level.blocks.reduce((sum, block) => sum + block.shape.length, 0),
  shape_histogram: histogram(level.blocks),
  opening_count: openingBlocks.length,
  opening_shape_histogram: histogram(openingBlocks),
  opening_color_count: new Set(openingBlocks.map((block) => block.color)).size,
  full_color_count: new Set(level.blocks.map((block) => block.color)).size,
  ordinary_exit_count: level.gates.filter((gate) => !gate.frozen).length,
  frozen_exit_values: sortedNumbers(level.gates.filter((gate) => gate.frozen).map((gate) => gate.frozen)),
  generator_count: level.generators.length,
  generator_trigger: generator.trigger,
  queue_length: generator.queueBlockIds.length,
  queue_histogram: histogram(queued),
};
const mechanisms = target.mechanism_contract;
const checks = {
  board: actual.rows === target.board.rows && actual.cols === target.board.cols
    && actual.playable_cell_count === target.board.playable_cell_count,
  time: actual.time_seconds === target.time_seconds,
  full_inventory: actual.block_count === target.full_level_block_count
    && actual.occupied_cell_count === target.full_level_occupied_cell_count
    && same(actual.shape_histogram, target.full_level_shape_histogram),
  opening_inventory: actual.opening_count === target.stage_partitions[0].count
    && same(actual.opening_shape_histogram, target.stage_partitions[0].shape_histogram),
  colours: actual.opening_color_count === target.opening_color_count
    && actual.full_color_count === target.full_level_color_count,
  gates: actual.ordinary_exit_count === mechanisms.directional_exits.ordinary_count
    && same(actual.frozen_exit_values, sortedNumbers(mechanisms.directional_exits.frozen_values)),
  feeder: actual.generator_count === mechanisms.generators.count
    && actual.generator_trigger === mechanisms.generators.trigger
    && actual.queue_length === mechanisms.generators.queue_lengths[0]
    && same(actual.queue_histogram, mechanisms.generators.queue_histograms[0]),
};
const failed = Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name);
if (failed.length) throw new Error(`Lv70 exact-contract checks failed: ${failed.join(", ")}`);

const entry = {
  level_id: "Lv070",
  search_attempt: "timed-feeder-four-head-blockage-plus-opening-starter",
  target: structuredClone(target),
  level,
  // The assembler advances timed feeders once after every committed drag, so
  // its base override route contains only player actions.  The separate strict
  // witness below retains every explicit wait for authoritative proof replay.
  route: route.filter((action) => action.kind === "drag").map(({ kind, ...action }) => action),
  routeSemantics: "fully_assembled_runtime",
  witness_metrics: {
    actions: level.parMoves,
    waits: route.filter((action) => action.kind === "wait").length,
    repositions: repositionCount,
    clear_layers: clearCount,
  },
};
const artifact = {
  schema_version: "blockout-video-parity-lv70-timed-feeder-prefix-candidate-v1",
  prototype_only: true,
  applied_to_live_campaign: false,
  source: {
    path: inputRelative,
    sha256: sha256(inputText),
    contract: { path: contractRelative, sha256: sha256(contractText) },
  },
  exact_contract: { checks, actual },
  levels: [entry],
};
const witness = [{
  level_id: "Lv070",
  source: "timed-feeder five-parking complete PuzzleModel replay",
  proof_scope: "completion upper bound only",
  drags: route,
  metrics: entry.witness_metrics,
  level_spec_sha256: levelSpecSha256(level),
}];
const prefixPlan = [{
  level_id: "Lv070",
  source: "exact timed-feeder first-clear frontier",
  proof_scope: "whole-level lower bound implied by the necessary first layer/body removal",
  proof_method: "exact_first_clear_prefix",
  level_spec_sha256: levelSpecSha256(level),
  floor: target.campaign_reposition_floor,
  prefix_event: "first_clear_or_layer_removal",
  interchangeable_block_id_groups: [[opening.id, ...firstFour.map((block) => block.id)]],
  groups: [],
}];
const outputDir = resolve(root, outputDirRelative);
await mkdir(outputDir, { recursive: true });
const artifactText = `${JSON.stringify(artifact, null, 2)}\n`;
await Promise.all([
  writeFile(resolve(outputDir, "proof-input.json"), artifactText, "utf8"),
  writeFile(resolve(outputDir, "overrides.json"), artifactText, "utf8"),
  writeFile(resolve(outputDir, "proof-witness.json"), `${JSON.stringify(witness, null, 2)}\n`, "utf8"),
  writeFile(resolve(outputDir, "prefix-plan.json"), `${JSON.stringify(prefixPlan, null, 2)}\n`, "utf8"),
]);
console.log(JSON.stringify({
  output: relative(root, outputDir).replaceAll("\\", "/"),
  contract_sha256: sha256(contractText),
  proof_input_sha256: sha256(artifactText),
  level_spec_sha256: levelSpecSha256(level),
  exact_contract: checks,
  witness_metrics: entry.witness_metrics,
  queue_prefix: generator.queueBlockIds.slice(0, 5),
}, null, 2));
