import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Prototype-only Lv47 construction. Fourteen opening SINGLE blocks form a
// sealed perimeter spine. Thirteen blockers must be moved into the generator gallery
// before the terminal reaches its side exit. The two move-triggered H3 queues
// are drained through one shared chute and both numeric-ice V3 values retain
// the competitor's exact deadlines.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index < 0 ? fallback : args[index + 1];
};
const inputRelative = option(
  "--input",
  ".codex-temp/video-parity-v6-lv47-baseline-r30/runtime.generated.ts",
);
const contractRelative = option(
  "--contract",
  "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v6.json",
);
const outputDirRelative = option(
  "--output-dir",
  ".codex-temp/video-parity-v6-lv47-generator-spine-candidate",
);

const inputPath = resolve(root, inputRelative);
const contractPath = resolve(root, contractRelative);
const [inputText, contractText] = await Promise.all([
  readFile(inputPath, "utf8"),
  readFile(contractPath, "utf8"),
]);
const contract = JSON.parse(contractText);
const target = contract.levels.find((entry) => entry.level_id === "Lv047")?.our_design_target;
if (!target) throw new Error("Lv47 is missing from the active design contract");

const bundle = await build({
  stdin: {
    contents: `
      export { VIDEO_PARITY_LEVELS as levels } from ${JSON.stringify(inputPath)};
      export { PuzzleModel, validateLevel } from ${JSON.stringify(resolve(root, "src/core/PuzzleModel.ts"))};
    `,
    resolveDir: root,
    sourcefile: "lv47-generator-spine-candidate-runtime.ts",
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
const source = runtime.levels.find((level) => level.id === 47);
if (!source) throw new Error("Lv47 is missing from the input runtime");

const mask = target.board.playable_mask;
const playable = mask.flatMap((row, y) => [...row].flatMap((cell, x) => (
  cell === "#" ? [[x, y]] : []
)));
if (source.width !== 6 || source.height !== 8 || playable.length !== 33
  || source.blocks.length !== 29 || source.gates.length !== 5
  || source.generators?.length !== 2) {
  throw new Error("Lv47 source no longer matches the expected competitor scalar contract");
}

const shapeKind = (block) => {
  const points = block.shape;
  if (points.length === 1) return "SINGLE";
  if (points.length === 2 && points.every((point) => point[1] === points[0][1])) return "H2";
  if (points.length === 3 && points.every((point) => point[1] === points[0][1])) return "H3";
  if (points.length === 3 && points.every((point) => point[0] === points[0][0])) return "V3";
  return `OTHER_${points.length}`;
};
const histogram = (blocks) => Object.fromEntries(
  [...blocks.reduce((map, block) => {
    const kind = shapeKind(block);
    map.set(kind, (map.get(kind) ?? 0) + 1);
    return map;
  }, new Map())].sort(([left], [right]) => left.localeCompare(right)),
);
if (JSON.stringify(histogram(source.blocks)) !== JSON.stringify({ H2: 4, H3: 7, SINGLE: 16, V3: 2 })) {
  throw new Error(`unexpected Lv47 inventory ${JSON.stringify(histogram(source.blocks))}`);
}

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
const assign = (block, x, y, shape, color) => {
  block.x = x;
  block.y = y;
  block.shape = shape.map((point) => [...point]);
  block.color = color;
  clearRules(block);
};

const level = structuredClone(source);
level.name = `${source.name} generator gallery and thirteen-block spine`;
level.playable = playable;
level.timeSeconds = target.time_seconds;
delete level.blocked;
delete level.shutters;
delete level.elevators;
delete level.conveyors;
delete level.onboardingHint;
delete level.strategyNudge;
delete level.strategyFocus;
delete level.featureIntro;

const [A, B, C, D, E] = target.design_palette;
if (new Set([A, B, C, D, E]).size !== 5) throw new Error("Lv47 requires five unique colours");
const blocks = new Map(level.blocks.map((block) => [block.id, block]));
const b = (id) => {
  const block = blocks.get(`cc-047-${id}`);
  if (!block) throw new Error(`missing Lv47 block cc-047-${id}`);
  return block;
};
const SINGLE = [[0, 0]];
const H2 = [[0, 0], [1, 0]];
const H3 = [[0, 0], [1, 0], [2, 0]];
const V3 = [[0, 0], [0, 1], [0, 2]];

const handleIds = [
  "b1-01", "b1-02", "b1-03", "b1-04", "b1-05", "b1-06", "b1-07",
  "b1-08", "b1-09", "b1-13", "b1-16", "b1-17", "b1-19", "b1-20",
];
const spine = [
  [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7],
  [1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [5, 6],
];
handleIds.forEach((id, index) => assign(b(id), ...spine[index], SINGLE, index === 0 ? D : B));

// The 4x5 gallery is exactly tiled at opening: two numeric V3, four H2,
// one H3 over the shared generator spawn, and two SINGLE cells.
assign(b("b1-10"), 2, 2, V3, C);
b("b1-10").frozen = 14;
assign(b("b1-11"), 3, 2, V3, C);
b("b1-11").frozen = 9;
assign(b("b1-12"), 4, 2, H2, A);
assign(b("b1-15"), 4, 3, H2, A);
assign(b("b1-18"), 4, 4, H2, A);
assign(b("b1-21"), 2, 5, H2, E);
assign(b("b1-14"), 3, 1, H3, A);
assign(b("b1-22"), 5, 5, SINGLE, A);
assign(b("b1-23"), 4, 5, SINGLE, E);

const cargoIds = ["b2-01", "b2-02", "b2-03", "b3-01", "b3-02", "b3-03"];
cargoIds.forEach((id) => assign(b(id), 3, 1, H3, A));
Object.assign(level.generators[0], {
  side: "top",
  offset: 3,
  spawn: [3, 1],
  queueBlockIds: [b("b2-01").id, b("b2-02").id, b("b2-03").id],
  trigger: "move",
});
Object.assign(level.generators[1], {
  side: "right",
  offset: 1,
  spawn: [3, 1],
  queueBlockIds: [b("b3-01").id, b("b3-02").id, b("b3-03").id],
  trigger: "move",
});

// Exact descriptor order: ordinary, frozen(12), frozen(4), frozen(9), frozen(23).
const gateSpecs = [
  { side: "right", offset: 1, size: 1, color: A },
  { side: "right", offset: 6, size: 1, color: D, frozen: 12 },
  { side: "top", offset: 0, size: 1, color: B, frozen: 4 },
  { side: "right", offset: 2, size: 3, color: C, frozen: 9 },
  { side: "right", offset: 5, size: 1, color: E, frozen: 23 },
];
level.gates.forEach((gate, index) => {
  Object.assign(gate, gateSpecs[index]);
  if (gateSpecs[index].frozen === undefined) delete gate.frozen;
  delete gate.star;
});
level.designTargets = {
  formulaVersion: "blockout-d1",
  calibratedDifficulty: target.target_d1_difficulty.calibrated_score,
  minimumRepositionOverhead: 13,
};

try {
  runtime.validateLevel(level);
} catch (error) {
  console.error(`Lv47 validateLevel failed: ${error.message}`);
  process.exit(1);
}

const route = [];
const model = new runtime.PuzzleModel(level);
let constructionRepositions = 0;
let constructionClearLayers = 0;
const pushAction = (drag) => {
  const actionIndex = route.length + 1;
  model.beginAction();
  for (const [x, y] of drag.path ?? []) {
    if (!model.moveBlockStep(drag.blockId, x, y)) {
      throw new Error(`route action ${actionIndex} move failed for ${drag.blockId} at ${x},${y}`);
    }
  }
  if (drag.exitSide) {
    const result = model.tryExit(drag.blockId, drag.exitSide);
    if (!result.ok) throw new Error(`route action ${actionIndex} exit failed for ${drag.blockId}: ${result.reason}`);
    constructionClearLayers += 1;
  } else {
    constructionRepositions += 1;
  }
  if (!model.commitAction(true)) throw new Error(`route action ${actionIndex} did not commit`);
  route.push(drag);
};
const pointKey = ([x, y]) => `${x},${y}`;
const findPath = (blockId, targetPoint) => {
  const block = model.snapshot().blocks.find((entry) => entry.id === blockId);
  if (!block) throw new Error(`active block ${blockId} missing while planning`);
  const start = [block.x, block.y];
  if (start[0] === targetPoint[0] && start[1] === targetPoint[1]) return [];
  const queue = [start];
  const predecessor = new Map([[pointKey(start), null]]);
  const pointByKey = new Map([[pointKey(start), start]]);
  let found = null;
  while (queue.length && !found) {
    const [x, y] = queue.shift();
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      const key = `${nx},${ny}`;
      if (predecessor.has(key) || !model.canPlace(block, nx, ny)) continue;
      predecessor.set(key, `${x},${y}`);
      pointByKey.set(key, [nx, ny]);
      if (nx === targetPoint[0] && ny === targetPoint[1]) {
        found = key;
        break;
      }
      queue.push([nx, ny]);
    }
  }
  if (!found) throw new Error(`no path for ${blockId} to ${targetPoint}`);
  const reverse = [];
  for (let key = found; predecessor.get(key) !== null; key = predecessor.get(key)) {
    reverse.push(pointByKey.get(key));
  }
  return reverse.reverse();
};

// Open and drain the shared generator chute, then remove the three A H2 guards.
pushAction({ blockId: b("b1-14").id, path: [], exitSide: "right" });
for (const id of cargoIds) pushAction({ blockId: b(id).id, path: [], exitSide: "right" });
pushAction({ blockId: b("b1-12").id, path: [[4, 1]], exitSide: "right" });
pushAction({ blockId: b("b1-15").id, path: [[4, 2], [4, 1]], exitSide: "right" });
pushAction({ blockId: b("b1-18").id, path: [[4, 3], [4, 2], [4, 1]], exitSide: "right" });
pushAction({ blockId: b("b1-11").id, path: [[4, 2], [5, 2]], exitSide: "right" });
pushAction({
  blockId: b("b1-22").id,
  path: [[5, 4], [5, 3], [5, 2], [5, 1]],
  exitSide: "right",
});

if (constructionClearLayers !== 12) {
  throw new Error(`Lv47 expected 12 clear layers before the spine, got ${constructionClearLayers}`);
}

const blockerIds = handleIds.slice(1).map((id) => b(id).id);
const parkingTargets = [
  [3, 1], [4, 1], [5, 1],
  [3, 2], [4, 2], [5, 2],
  [3, 3], [4, 3], [5, 3],
  [3, 4], [4, 4], [5, 4], [5, 5],
];
const movedDeepestFirst = [...blockerIds].reverse();
movedDeepestFirst.forEach((blockId, index) => {
  pushAction({ blockId, path: findPath(blockId, parkingTargets[index]) });
});
const handleRouteStart = 12;
pushAction({ blockId: b(handleIds[0]).id, path: findPath(b(handleIds[0]).id, [5, 6]), exitSide: "right" });
for (const blockId of [...movedDeepestFirst].reverse()) {
  pushAction({ blockId, path: findPath(blockId, [0, 0]), exitSide: "top" });
}
const handleRouteEnd = route.length;

pushAction({ blockId: b("b1-10").id, path: findPath(b("b1-10").id, [5, 2]), exitSide: "right" });
pushAction({ blockId: b("b1-23").id, path: [[5, 5]], exitSide: "right" });
pushAction({ blockId: b("b1-21").id, path: [[3, 5], [4, 5]], exitSide: "right" });

const completed = model.snapshot();
if (!completed.complete) throw new Error(`Lv47 construction ended with ${completed.blocks.length} active blocks`);
const witnessMetrics = {
  repositions: constructionRepositions,
  actions: route.length,
  clear_layers: constructionClearLayers,
};
if (witnessMetrics.repositions !== 13 || witnessMetrics.actions !== 42 || witnessMetrics.clear_layers !== 29) {
  throw new Error(`unexpected Lv47 witness metrics ${JSON.stringify(witnessMetrics)}`);
}
level.parMoves = witnessMetrics.actions;

const coreHandleIds = handleIds.map((id) => b(id).id);
const handleRoute = route.slice(handleRouteStart, handleRouteEnd);
const coreGroups = [{
  id: "opening-fourteen-single-perimeter-spine",
  stage_key: "opening",
  block_ids: coreHandleIds,
  floor: 13,
  proof_method: "infinite_parking_relaxation",
  interchangeable_block_id_groups: [coreHandleIds.slice(1)],
  route: handleRoute,
}];
const entry = {
  level_id: "Lv047",
  search_attempt: "crafted-generator-gallery-plus-fourteen-single-perimeter-spine",
  target: structuredClone(target),
  level,
  route,
  routeSemantics: "fully_assembled_runtime",
  witness_metrics: witnessMetrics,
  core_groups: coreGroups,
};

const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const artifact = {
  schema_version: "blockout-video-parity-lv47-generator-spine-candidate-v1",
  prototype_only: true,
  applied_to_live_campaign: false,
  source: {
    path: inputRelative,
    sha256: sha256(inputText),
    contract: { path: contractRelative, sha256: sha256(contractText) },
  },
  contract_scalars: {
    rows: 8,
    cols: 6,
    playable_cell_count: 33,
    block_count: 29,
    occupied_cell_count: 51,
    shape_histogram: target.full_level_shape_histogram,
    opening_color_count: 5,
    full_color_count: 5,
    ordinary_exit_count: 1,
    frozen_values: [12, 4, 9, 23],
    numeric_ice_values: [9, 14],
    generator_queue_lengths: [3, 3],
    required_reposition_floor: 13,
  },
  board_mask: mask,
  levels: [entry],
};
const witnesses = [{
  level_id: "Lv047",
  drags: route,
  metrics: witnessMetrics,
  source_attempt: entry.search_attempt,
}];
const corePlans = [{
  level_id: "Lv047",
  source: "crafted SINGLE perimeter spine; verifier independently rebuilds the relaxed opening core",
  proof_scope: "single relaxed-core lower bound",
  groups: coreGroups,
}];
const outputDir = resolve(root, outputDirRelative);
await mkdir(outputDir, { recursive: true });
const artifactText = `${JSON.stringify(artifact, null, 2)}\n`;
await Promise.all([
  writeFile(resolve(outputDir, "proof-input.json"), artifactText, "utf8"),
  writeFile(resolve(outputDir, "proof-witness.json"), `${JSON.stringify(witnesses, null, 2)}\n`, "utf8"),
  writeFile(resolve(outputDir, "core-plan.json"), `${JSON.stringify(corePlans, null, 2)}\n`, "utf8"),
]);
console.log(JSON.stringify({
  output: relative(root, outputDir).replaceAll("\\", "/"),
  contract_sha256: sha256(contractText),
  proof_input_sha256: sha256(artifactText),
  board_mask: mask,
  witness_metrics: witnessMetrics,
  core_floor_sum: 13,
  shape_histogram: histogram(level.blocks),
}, null, 2));
