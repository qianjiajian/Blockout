import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Prototype-only Lv30 construction. Two seven-SINGLE branches each require
// six parking actions. The countdown batch contributes a V3 exchange core,
// adding the thirteenth necessary reposition without changing any competitor
// scalar, stage partition, timer, or mechanism count.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index < 0 ? fallback : args[index + 1];
};
const inputRelative = option(
  "--input",
  ".codex-temp/video-parity-v6-lv30-baseline-r28/runtime.generated.ts",
);
const contractRelative = option(
  "--contract",
  "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v6.json",
);
const outputDirRelative = option(
  "--output-dir",
  ".codex-temp/video-parity-v6-lv30-dual-handle-candidate",
);

const inputPath = resolve(root, inputRelative);
const contractPath = resolve(root, contractRelative);
const [inputText, contractText] = await Promise.all([
  readFile(inputPath, "utf8"),
  readFile(contractPath, "utf8"),
]);
const contract = JSON.parse(contractText);
const target = contract.levels.find((entry) => entry.level_id === "Lv030")?.our_design_target;
if (!target) throw new Error("Lv30 is missing from the active design contract");

const bundle = await build({
  stdin: {
    contents: `
      export { VIDEO_PARITY_LEVELS as levels } from ${JSON.stringify(inputPath)};
      export { PuzzleModel, validateLevel } from ${JSON.stringify(resolve(root, "src/core/PuzzleModel.ts"))};
    `,
    resolveDir: root,
    sourcefile: "lv30-dual-handle-candidate-runtime.ts",
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
const source = runtime.levels.find((level) => level.id === 30);
if (!source) throw new Error("Lv30 is missing from the input runtime");

const mask = target.board.playable_mask;
const playable = mask.flatMap((row, y) => [...row].flatMap((cell, x) => (
  cell === "#" ? [[x, y]] : []
)));
if (source.width !== 8 || source.height !== 9 || playable.length !== 36
  || source.blocks.length !== 18 || source.gates.length !== 6) {
  throw new Error("Lv30 source no longer matches the expected competitor scalar contract");
}

const shapeKind = (block) => {
  const points = block.shape;
  if (points.length === 1) return "SINGLE";
  if (points.length === 3 && points.every((point) => point[0] === points[0][0])) return "V3";
  if (points.length === 4
    && new Set(points.map((point) => point[0])).size === 2
    && new Set(points.map((point) => point[1])).size === 2) return "SQ2";
  if (points.length === 3) return "L3";
  return `OTHER_${points.length}`;
};
const histogram = (blocks) => Object.fromEntries(
  [...blocks.reduce((map, block) => {
    const kind = shapeKind(block);
    map.set(kind, (map.get(kind) ?? 0) + 1);
    return map;
  }, new Map())].sort(([left], [right]) => left.localeCompare(right)),
);
if (JSON.stringify(histogram(source.blocks)) !== JSON.stringify({ L3: 1, SINGLE: 14, SQ2: 1, V3: 2 })) {
  throw new Error(`unexpected Lv30 inventory ${JSON.stringify(histogram(source.blocks))}`);
}

const replay = (level, drags) => {
  const model = new runtime.PuzzleModel(level);
  let repositions = 0;
  let clearLayers = 0;
  for (const [dragIndex, drag] of drags.entries()) {
    model.beginAction();
    for (const [x, y] of drag.path ?? []) {
      if (!model.moveBlockStep(drag.blockId, x, y)) {
        throw new Error(`route action ${dragIndex + 1} move failed for ${drag.blockId} at ${x},${y}`);
      }
    }
    if (drag.exitSide) {
      const result = model.tryExit(drag.blockId, drag.exitSide);
      if (!result.ok) {
        throw new Error(`route action ${dragIndex + 1} exit failed for ${drag.blockId}: ${result.reason}`);
      }
      clearLayers += 1;
    } else {
      repositions += 1;
    }
    if (!model.commitAction(true)) throw new Error(`route commit failed for ${drag.blockId}`);
  }
  const snapshot = model.snapshot();
  if (!snapshot.complete) throw new Error(`route ended incomplete with ${snapshot.blocks.length} blocks`);
  return { repositions, actions: drags.length, clear_layers: clearLayers };
};
const clearRules = (block, preserveCover = false) => {
  delete block.frozen;
  if (!preserveCover) delete block.shutterId;
  delete block.movementAxis;
  delete block.keyId;
  delete block.lockedBy;
  delete block.lockCount;
  delete block.star;
  delete block.layers;
};
const assign = (block, x, y, shape, color, preserveCover = false) => {
  block.x = x;
  block.y = y;
  block.shape = shape.map((point) => [...point]);
  block.color = color;
  clearRules(block, preserveCover);
};

const level = structuredClone(source);
level.name = `${source.name} dual handles and V3 exchange shaft`;
level.playable = playable;
level.timeSeconds = target.time_seconds;
delete level.blocked;
delete level.generators;
delete level.elevators;
delete level.conveyors;
delete level.onboardingHint;
delete level.strategyNudge;
delete level.strategyFocus;
delete level.featureIntro;

const [A, B, C, D] = target.design_palette;
if (new Set([A, B, C, D]).size !== 4) throw new Error("Lv30 requires four unique colours");
const blocks = new Map(level.blocks.map((block) => [block.id, block]));
const b = (id) => {
  const block = blocks.get(`cc-030-${id}`);
  if (!block) throw new Error(`missing Lv30 block cc-030-${id}`);
  return block;
};
const SINGLE = [[0, 0]];
const V3 = [[0, 0], [0, 1], [0, 2]];
const SQ2 = [[0, 0], [1, 0], [0, 1], [1, 1]];
const L3 = [[1, 0], [0, 1], [1, 1]];

// J is the only near-side access shared by both seven-piece handles.
const J = [3, 0];
const left = [[2, 0], [1, 0], [0, 0], [0, 1], [0, 2], [0, 3], [0, 4]];
const right = [[4, 0], [5, 0], [6, 0], [7, 0], [7, 1], [7, 2], [7, 3]];
for (let index = 0; index < 7; index += 1) {
  assign(b(`b1-${String(index + 1).padStart(2, "0")}`), ...left[index], SINGLE, index < 6 ? B : A);
  assign(b(`b1-${String(index + 8).padStart(2, "0")}`), ...right[index], SINGLE, index < 6 ? C : A);
}
assign(b("b1-15"), 5, 6, L3, A);

const cover = level.shutters?.find((item) => item.id === "vp-030-cover-1");
if (!cover || level.shutters.length !== 1) throw new Error("Lv30 cover changed unexpectedly");
Object.assign(cover, { x: 4, y: 5, width: 1, height: 1, count: 12, skin: "shutter" });
assign(b("b2-01"), 3, 0, V3, D, true);
assign(b("b2-02"), 1, 7, SQ2, D, true);
assign(b("b2-03"), 3, 3, V3, A, true);

// Contract descriptor order is five ordinary exits followed by frozen(9).
const gateSpecs = [
  { side: "top", offset: 3, size: 1, color: A },
  { side: "left", offset: 4, size: 1, color: B },
  { side: "right", offset: 3, size: 1, color: C },
  { side: "bottom", offset: 5, size: 2, color: A },
  { side: "bottom", offset: 3, size: 1, color: D },
  { side: "bottom", offset: 1, size: 2, color: D, frozen: 9 },
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

const route = [];
const pathToJ = (branch, position) => [...branch.slice(0, position).reverse(), [...J]];
const downTo = (y) => Array.from({ length: y }, (_value, index) => [3, index + 1]);
const upFrom = (y) => Array.from({ length: y - 1 }, (_value, index) => [3, y - index - 1]);

// Left handle: six pink pieces park deepest-first in the central shaft.
for (let position = 0; position < 6; position += 1) {
  const destinationY = 8 - position;
  route.push({
    blockId: b(`b1-${String(position + 1).padStart(2, "0")}`).id,
    path: [...pathToJ(left, position), ...downTo(destinationY)],
  });
}
route.push({ blockId: b("b1-07").id, path: pathToJ(left, 6), exitSide: "top" });
for (let position = 5; position >= 0; position -= 1) {
  const y = 8 - position;
  route.push({
    blockId: b(`b1-${String(position + 1).padStart(2, "0")}`).id,
    path: [...upFrom(y), [...J], ...left],
    exitSide: "left",
  });
}

// The opening L3 has its own bottom mouth outside both SINGLE handles.
route.push({ blockId: b("b1-15").id, path: [[5, 7]], exitSide: "bottom" });

// Right handle: six blue pieces park in the now-empty left branch.
for (let position = 0; position < 6; position += 1) {
  const destination = 6 - position;
  route.push({
    blockId: b(`b1-${String(position + 8).padStart(2, "0")}`).id,
    path: [...pathToJ(right, position), ...left.slice(0, destination + 1)],
  });
}
route.push({ blockId: b("b1-14").id, path: pathToJ(right, 6), exitSide: "top" });
const clearRightFromLeft = (position) => {
  const destination = 6 - position;
  return {
    blockId: b(`b1-${String(position + 8).padStart(2, "0")}`).id,
    path: [...left.slice(0, destination).reverse(), [...J], ...right],
    exitSide: "right",
  };
};
for (const position of [5, 4, 3]) route.push(clearRightFromLeft(position));

// At clear layer 12 the cover opens. The opposed V3s need one true exchange.
route.push({ blockId: b("b2-03").id, path: [[4, 3]] });
route.push({
  blockId: b("b2-01").id,
  path: [[3, 1], [3, 2], [3, 3], [3, 4], [3, 5], [3, 6]],
  exitSide: "bottom",
});
route.push({
  blockId: b("b2-03").id,
  path: [[3, 3], [3, 2], [3, 1], [3, 0]],
  exitSide: "top",
});
route.push({ blockId: b("b2-02").id, path: [], exitSide: "bottom" });

for (const position of [2, 1, 0]) route.push(clearRightFromLeft(position));

try {
  runtime.validateLevel(level);
} catch (error) {
  console.error(`Lv30 validateLevel failed: ${error.message}`);
  process.exit(1);
}
let witnessMetrics;
try {
  witnessMetrics = replay(level, route);
} catch (error) {
  console.error(`Lv30 route replay failed: ${error.message}`);
  process.exit(1);
}
if (witnessMetrics.repositions !== 13 || witnessMetrics.actions !== 31 || witnessMetrics.clear_layers !== 18) {
  throw new Error(`unexpected Lv30 witness metrics ${JSON.stringify(witnessMetrics)}`);
}
level.parMoves = witnessMetrics.actions;

const leftIds = Array.from({ length: 7 }, (_value, index) => b(`b1-${String(index + 1).padStart(2, "0")}`).id);
const rightIds = Array.from({ length: 7 }, (_value, index) => b(`b1-${String(index + 8).padStart(2, "0")}`).id);
const leftCoreRoute = route.slice(0, 13);
const rightCoreRoute = [...route.slice(14, 24), ...route.slice(28, 31)];
const hiddenCoreRoute = route.slice(24, 27);
const coreGroups = [
  {
    id: "opening-left-handle",
    stage_key: "opening",
    block_ids: leftIds,
    floor: 6,
    proof_method: "infinite_parking_relaxation",
    interchangeable_block_id_groups: [leftIds.slice(0, 6)],
    route: leftCoreRoute,
  },
  {
    id: "opening-right-handle",
    stage_key: "opening",
    block_ids: rightIds,
    floor: 6,
    proof_method: "infinite_parking_relaxation",
    interchangeable_block_id_groups: [rightIds.slice(0, 6)],
    route: rightCoreRoute,
  },
  {
    id: "cover-v3-exchange",
    stage_key: `shutter:${cover.id}`,
    block_ids: [b("b2-01").id, b("b2-03").id],
    floor: 1,
    proof_method: "infinite_parking_relaxation",
    route: hiddenCoreRoute,
  },
];
const entry = {
  level_id: "Lv030",
  search_attempt: "crafted-dual-seven-single-handles-plus-v3-exchange",
  target: structuredClone(target),
  level,
  route,
  routeSemantics: "fully_assembled_runtime",
  witness_metrics: witnessMetrics,
  core_groups: coreGroups,
};

const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const artifact = {
  schema_version: "blockout-video-parity-lv30-dual-handle-candidate-v1",
  prototype_only: true,
  applied_to_live_campaign: false,
  source: {
    path: inputRelative,
    sha256: sha256(inputText),
    contract: { path: contractRelative, sha256: sha256(contractText) },
  },
  contract_scalars: {
    rows: 9,
    cols: 8,
    playable_cell_count: 36,
    block_count: 18,
    occupied_cell_count: 27,
    shape_histogram: target.full_level_shape_histogram,
    opening_color_count: 3,
    full_color_count: 4,
    ordinary_exit_count: 5,
    frozen_values: [9],
    cover_values: [12],
    required_reposition_floor: 13,
  },
  board_mask: mask,
  levels: [entry],
};
const witnesses = [{
  level_id: "Lv030",
  drags: route,
  metrics: witnessMetrics,
  source_attempt: entry.search_attempt,
}];
const corePlans = [{
  level_id: "Lv030",
  source: "crafted dual handle and V3 exchange; verifier independently rebuilds each relaxed core",
  proof_scope: "disjoint relaxed-core lower bound",
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
  core_floor_sum: coreGroups.reduce((sum, group) => sum + group.floor, 0),
  shape_histogram: histogram(level.blocks),
}, null, 2));
