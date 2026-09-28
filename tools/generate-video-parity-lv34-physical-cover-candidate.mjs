import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Prototype-only Lv34 construction. The real 4x6 and 3x5 physical covers
// retain the competitor's countdown timing while compressing the opening into
// its 24-cell visible bay. An exact first-clear prefix proof establishes the
// campaign floor without relaxing the covers, frozen exits, or hidden batches.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index < 0 ? fallback : args[index + 1];
};
const inputRelative = option(
  "--input",
  ".codex-temp/video-parity-v6-lv34-baseline-r28/runtime.generated.ts",
);
const contractRelative = option(
  "--contract",
  "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v6.json",
);
const outputDirRelative = option(
  "--output-dir",
  ".codex-temp/video-parity-v6-lv34-physical-cover-candidate",
);

const inputPath = resolve(root, inputRelative);
const contractPath = resolve(root, contractRelative);
const [inputText, contractText] = await Promise.all([
  readFile(inputPath, "utf8"),
  readFile(contractPath, "utf8"),
]);
const contract = JSON.parse(contractText);
const target = contract.levels.find((entry) => entry.level_id === "Lv034")?.our_design_target;
if (!target) throw new Error("Lv34 is missing from the active design contract");

const bundle = await build({
  stdin: {
    contents: `
      export { VIDEO_PARITY_LEVELS as levels } from ${JSON.stringify(inputPath)};
      export { PuzzleModel, validateLevel } from ${JSON.stringify(resolve(root, "src/core/PuzzleModel.ts"))};
    `,
    resolveDir: root,
    sourcefile: "lv34-physical-cover-candidate-runtime.ts",
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
const source = runtime.levels.find((level) => level.id === 34);
if (!source) throw new Error("Lv34 is missing from the input runtime");

const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().flatMap((key) => (
    value[key] === undefined ? [] : [[key, canonicalize(value[key])]]
  )));
};
const canonicalJson = (value) => JSON.stringify(canonicalize(value));
const levelSpecSha256 = (level) => sha256(canonicalJson(level));

const mask = target.board.playable_mask;
const playable = mask.flatMap((row, y) => [...row].flatMap((cell, x) => (
  cell === "#" ? [[x, y]] : []
)));
if (source.width !== 7 || source.height !== 9 || playable.length !== 63
  || source.blocks.length !== 30 || source.gates.length !== 6
  || (source.shutters?.length ?? 0) !== 2) {
  throw new Error("Lv34 source no longer matches the expected competitor scalar contract");
}

const SINGLE = [[0, 0]];
const H2 = [[0, 0], [1, 0]];
const V2 = [[0, 0], [0, 1]];
const V3 = [[0, 0], [0, 1], [0, 2]];
const shapeKind = (block) => {
  if (block.shape.length === 1) return "SINGLE";
  if (block.shape.length === 2 && block.shape.every(([x]) => x === 0)) return "V2";
  if (block.shape.length === 2 && block.shape.every(([, y]) => y === 0)) return "H2";
  if (block.shape.length === 3 && block.shape.every(([x]) => x === 0)) return "V3";
  return `OTHER_${block.shape.length}`;
};
const histogram = (blocks) => Object.fromEntries(
  [...blocks.reduce((map, block) => {
    const kind = shapeKind(block);
    map.set(kind, (map.get(kind) ?? 0) + 1);
    return map;
  }, new Map())].sort(([left], [right]) => left.localeCompare(right)),
);

const level = structuredClone(source);
level.name = "双舱开闸";
level.difficulty = "super";
level.timeSeconds = target.time_seconds;
level.reward = 95;
level.width = 7;
level.height = 9;
level.playable = playable;
delete level.blocked;
delete level.generators;
delete level.elevators;
delete level.conveyors;
delete level.onboardingHint;
delete level.strategyNudge;
delete level.strategyFocus;
delete level.featureIntro;

const blocks = new Map(level.blocks.map((block) => [block.id, block]));
const b = (id) => {
  const block = blocks.get(`cc-034-${id}`);
  if (!block) throw new Error(`missing Lv34 block cc-034-${id}`);
  return block;
};
const clearRuleFields = (block) => {
  delete block.layers;
  delete block.frozen;
  delete block.shutterId;
  delete block.movementAxis;
  delete block.keyId;
  delete block.lockedBy;
  delete block.lockCount;
  delete block.star;
};
const assign = (id, x, y, shape, color, options = {}) => {
  const block = b(id);
  clearRuleFields(block);
  Object.assign(block, {
    x,
    y,
    shape: shape.map((point) => [...point]),
    color,
  });
  if (options.layers) {
    block.layers = [...options.layers];
    block.color = block.layers[0];
  }
  if (options.shutterId) block.shutterId = options.shutterId;
  return block;
};

const coverOne = level.shutters.find((cover) => cover.id === "vp-034-cover-1");
const coverTwo = level.shutters.find((cover) => cover.id === "vp-034-cover-2");
if (!coverOne || !coverTwo) throw new Error("Lv34 cover ids changed unexpectedly");
Object.assign(coverOne, { x: 0, y: 0, width: 4, height: 6, count: 12, skin: "shutter" });
Object.assign(coverTwo, { x: 4, y: 0, width: 3, height: 5, count: 22, skin: "shutter" });
delete coverOne.triggerBlockIds;
delete coverTwo.triggerBlockIds;

// Opening: 13 SINGLE, one H2 and three V2 pieces exactly occupy 21 cells of
// the visible lower bay. Only orange, pink and cyan are visible at start.
const openingSingles = [
  ["b1-01", 5, 6, "orange"], ["b1-02", 6, 6, "orange"],
  ["b1-03", 3, 7, "pink"], ["b1-04", 4, 7, "pink"],
  ["b1-05", 5, 7, "orange"], ["b1-06", 6, 7, "orange"],
  ["b1-07", 0, 8, "pink"], ["b1-08", 1, 8, "pink"],
  ["b1-09", 2, 8, "pink"], ["b1-10", 3, 8, "pink"],
  ["b1-11", 4, 8, "pink"], ["b1-12", 5, 8, "orange"],
  ["b1-13", 6, 8, "orange"],
];
for (const [id, x, y, color] of openingSingles) assign(id, x, y, SINGLE, color);
assign("b1-14", 3, 6, H2, "orange");
assign("b1-15", 0, 6, V2, "cyan");
assign("b1-16", 1, 6, V2, "cyan");
assign("b1-17", 2, 6, V2, "cyan");

// Cover 1 is a complete 4x6 V3 packing. Its first seven bodies carry one
// additional shell; each shell uses distinct outer/core colors so the runtime
// assembler can preserve these exact authored carrier assignments.
const coverOneId = coverOne.id;
const coverOneBlocks = [
  ["b2-01", 0, 0, "red", ["red", "green"]],
  ["b2-02", 1, 0, "red", ["red", "green"]],
  ["b2-03", 2, 0, "yellow", ["yellow", "green"]],
  ["b2-04", 3, 0, "green", ["green", "cyan"]],
  ["b2-05", 0, 3, "cyan", ["cyan", "yellow"]],
  ["b2-06", 1, 3, "cyan", ["cyan", "green"]],
  ["b2-07", 2, 3, "cyan", ["cyan", "red"]],
  ["b2-08", 3, 3, "cyan", null],
];
const shellCarrierAssignments = coverOneBlocks.flatMap(([id, , , , layers], requirementIndex) => (
  layers ? [{
    block_id: `cc-034-${id}`,
    shape: "V3",
    layers: [...layers],
    requirement_index: requirementIndex,
  }] : []
));
for (const [id, x, y, color, layers] of coverOneBlocks) {
  assign(id, x, y, V3, color, { shutterId: coverOneId, ...(layers ? { layers } : {}) });
}

// Cover 2 keeps the observed five-V3 batch. The lower pair extends one row
// below the 3x5 cover art, but remains hidden by shutterId until count 22 and
// never overlaps another active body when released.
const coverTwoId = coverTwo.id;
for (const [id, x, y, color] of [
  ["b3-01", 4, 0, "green"],
  ["b3-02", 5, 0, "yellow"],
  ["b3-03", 6, 0, "yellow"],
  ["b3-04", 4, 3, "green"],
  ["b3-05", 5, 3, "yellow"],
]) assign(id, x, y, V3, color, { shutterId: coverTwoId });

const gateSpecs = [
  { side: "left", offset: 8, size: 1, color: "orange" },
  { side: "right", offset: 8, size: 1, color: "pink", frozen: 7 },
  { side: "bottom", offset: 2, size: 1, color: "cyan", frozen: 13 },
  { side: "top", offset: 3, size: 1, color: "green", frozen: 14 },
  { side: "top", offset: 0, size: 1, color: "red", frozen: 22 },
  { side: "top", offset: 6, size: 1, color: "yellow", frozen: 22 },
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

const drag = (id, path, exitSide) => ({
  blockId: b(id).id,
  path,
  ...(exitSide ? { exitSide } : {}),
});
const route = [
  drag("b1-01", [[5, 5], [6, 5]]),
  drag("b1-14", [[4, 6], [4, 5]]),
  drag("b1-02", [[5, 6], [4, 6], [3, 6]]),
  drag("b1-04", [[4, 6], [5, 6], [6, 6]]),
  drag("b1-03", [[4, 7], [4, 6], [5, 6]]),
  drag("b1-10", [[3, 7], [4, 7], [4, 6]]),
  drag("b1-09", [[3, 8], [3, 7], [4, 7]]),
  drag("b1-02", [[3, 7], [3, 8]]),
  drag("b1-17", [[3, 6]]),
  drag("b1-08", [[2, 8], [2, 7], [2, 6]]),
  drag("b1-07", [[1, 8], [2, 8], [2, 7]]),
  drag("b1-02", [[2, 8], [1, 8], [0, 8]], "left"),
  drag("b1-07", [[2, 8], [1, 8], [0, 8]]),
  drag("b1-11", [[3, 8], [2, 8], [1, 8]]),
  drag("b1-12", [[4, 8], [3, 8], [2, 8], [2, 7]]),
  drag("b1-11", [[2, 8], [3, 8], [4, 8]]),
  drag("b1-07", [[1, 8], [2, 8], [3, 8]]),
  drag("b1-12", [[2, 8], [1, 8], [0, 8]], "left"),
  drag("b1-05", [[5, 8]]),
  drag("b1-07", [[2, 8], [2, 7]]),
  drag("b1-09", [[5, 7]]),
  drag("b1-11", [[4, 7]]),
  drag("b1-05", [[4, 8], [3, 8], [2, 8], [1, 8], [0, 8]], "left"),
  drag("b1-13", [[5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]], "left"),
  drag("b1-06", [[6, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]], "left"),
  drag("b1-04", [[6, 7], [6, 8]]),
  drag("b1-01", [[6, 6], [6, 7]]),
  drag("b1-03", [[6, 6]]),
  drag("b1-09", [[5, 6]]),
  drag("b1-01", [[5, 7], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]], "left"),
  drag("b1-09", [[5, 7]]),
  drag("b1-03", [[6, 7]]),
  drag("b1-14", [[5, 5], [5, 6]]),
  drag("b1-10", [[4, 5], [5, 5], [6, 5]]),
  drag("b1-11", [[4, 6], [4, 5], [5, 5]]),
  drag("b1-09", [[4, 7], [4, 6], [4, 5]]),
  drag("b1-14", [[4, 6], [4, 7], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]], "left"),
  drag("b1-04", [], "right"),
  drag("b1-03", [[6, 8]], "right"),
  drag("b1-10", [[6, 6], [6, 7], [6, 8]], "right"),
  drag("b1-11", [[6, 5], [6, 6], [6, 7], [6, 8]], "right"),
  drag("b1-07", [[2, 8], [3, 8], [4, 8], [5, 8], [6, 8]], "right"),
  drag("b1-09", [[5, 5], [6, 5], [6, 6], [6, 7], [6, 8]], "right"),
  drag("b1-08", [[2, 7], [2, 8], [3, 8], [4, 8], [5, 8], [6, 8]], "right"),
  drag("b1-16", [[2, 6], [2, 7]], "bottom"),
  drag("b1-17", [[3, 7], [2, 7]], "bottom"),
  drag("b1-15", [[1, 6], [2, 6], [2, 7]], "bottom"),
  drag("b2-04", [], "top"),
  drag("b2-08", [[3, 4], [3, 5], [3, 6], [2, 6]], "bottom"),
  drag("b2-04", [[3, 1], [3, 2], [3, 3], [3, 4], [3, 5], [3, 6], [2, 6]], "bottom"),
  drag("b2-07", [[2, 4], [2, 5], [2, 6]], "bottom"),
  drag("b2-07", [[3, 6], [4, 6]]),
  drag("b2-06", [[1, 4], [1, 5], [1, 6], [2, 6]], "bottom"),
  drag("b2-06", [[3, 6], [3, 5], [3, 4], [3, 3], [3, 2], [3, 1], [3, 0]], "top"),
  drag("b2-05", [[0, 4], [0, 5], [0, 6], [1, 6], [2, 6]], "bottom"),
  drag("b2-05", [[2, 5], [2, 4], [2, 3]]),
  drag("b3-03", [], "top"),
  drag("b3-02", [[6, 0]], "top"),
  drag("b3-05", [[6, 3], [6, 2], [6, 1], [6, 0]], "top"),
  drag("b3-01", [[3, 0]], "top"),
  drag("b3-04", [[3, 3], [3, 2], [3, 1], [3, 0]], "top"),
  drag("b2-01", [], "top"),
  drag("b2-01", [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [1, 6], [2, 6], [3, 6], [3, 5], [3, 4], [3, 3], [3, 2], [3, 1], [3, 0]], "top"),
  drag("b2-02", [[0, 0]], "top"),
  drag("b2-02", [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [1, 6], [2, 6], [3, 6], [3, 5], [3, 4], [3, 3], [3, 2], [3, 1], [3, 0]], "top"),
  drag("b2-03", [[3, 0], [4, 0], [5, 0], [6, 0]], "top"),
  drag("b2-03", [[5, 0], [4, 0], [3, 0]], "top"),
  drag("b2-07", [[3, 6], [2, 6], [1, 6], [0, 6], [0, 5], [0, 4], [0, 3], [0, 2], [0, 1], [0, 0]], "top"),
  drag("b2-05", [[2, 2], [2, 1], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0]], "top"),
];
level.parMoves = route.length;

const replay = (candidate, drags) => {
  const model = new runtime.PuzzleModel(candidate);
  let repositions = 0;
  let clearLayers = 0;
  let firstClearAction = null;
  const checkpoints = [];
  for (const [dragIndex, action] of drags.entries()) {
    const before = model.snapshot();
    model.beginAction();
    for (const [x, y] of action.path ?? []) {
      if (!model.moveBlockStep(action.blockId, x, y)) {
        throw new Error(`route action ${dragIndex + 1} move failed for ${action.blockId} at ${x},${y}`);
      }
    }
    if (action.exitSide) {
      const result = model.tryExit(action.blockId, action.exitSide);
      if (!result.ok) throw new Error(`route action ${dragIndex + 1} exit failed for ${action.blockId}`);
      clearLayers += 1;
    } else {
      repositions += 1;
    }
    if (!model.commitAction(true)) throw new Error(`route action ${dragIndex + 1} commit failed`);
    const after = model.snapshot();
    if (firstClearAction === null && after.cleared > before.cleared) firstClearAction = dragIndex + 1;
    if ([12, 22].includes(after.cleared) && !checkpoints.some((entry) => entry.cleared === after.cleared)) {
      checkpoints.push({
        action: dragIndex + 1,
        cleared: after.cleared,
        shutters: after.shutters.map(({ id, count }) => ({ id, count })),
      });
    }
  }
  const snapshot = model.snapshot();
  if (!snapshot.complete || snapshot.blocks.length || snapshot.queuedBlocks.length) {
    throw new Error(`route ended incomplete with ${snapshot.blocks.length} active blocks`);
  }
  return {
    repositions,
    actions: drags.length,
    clear_layers: clearLayers,
    first_clear_action: firstClearAction,
    repositions_before_first_clear: firstClearAction === null
      ? null
      : drags.slice(0, firstClearAction - 1).filter((action) => !action.exitSide).length,
    checkpoints,
    final_snapshot_sha256: sha256(canonicalJson(snapshot)),
  };
};

runtime.validateLevel(level);
const witnessMetrics = replay(level, route);
const independentWitnessMetrics = replay(structuredClone(level), structuredClone(route));
if (canonicalJson(witnessMetrics) !== canonicalJson(independentWitnessMetrics)) {
  throw new Error("independent PuzzleModel replay disagrees with the primary replay");
}
if (witnessMetrics.repositions !== 32 || witnessMetrics.actions !== 69
  || witnessMetrics.clear_layers !== 37 || witnessMetrics.first_clear_action !== 12
  || witnessMetrics.repositions_before_first_clear !== 11) {
  throw new Error(`unexpected Lv34 witness metrics ${JSON.stringify(witnessMetrics)}`);
}
const checkpoint12 = witnessMetrics.checkpoints.find((entry) => entry.cleared === 12);
const checkpoint22 = witnessMetrics.checkpoints.find((entry) => entry.cleared === 22);
if (checkpoint12?.action !== 42
  || checkpoint12.shutters.find((cover) => cover.id === coverOneId)?.count !== 0
  || checkpoint12.shutters.find((cover) => cover.id === coverTwoId)?.count !== 10
  || checkpoint22?.action !== 53
  || checkpoint22.shutters.some((cover) => cover.count !== 0)) {
  throw new Error(`unexpected cover timing ${JSON.stringify(witnessMetrics.checkpoints)}`);
}

const stageBlocks = (shutterId) => level.blocks.filter((block) => block.shutterId === shutterId);
const openingBlocks = level.blocks.filter((block) => !block.shutterId);
const fullColors = new Set(level.blocks.flatMap((block) => block.layers ?? [block.color]));
const openingColors = new Set(openingBlocks.flatMap((block) => block.layers ?? [block.color]));
const shellBlocks = level.blocks.filter((block) => (block.layers?.length ?? 1) > 1);
const occupiedCellCount = level.blocks.reduce((sum, block) => sum + block.shape.length, 0);
const ordinaryGateCount = level.gates.filter((gate) => (gate.frozen ?? 0) === 0).length;
const frozenValues = level.gates.flatMap((gate) => gate.frozen ? [gate.frozen] : []).sort((a, b) => a - b);
const exactChecks = {
  board: level.width === target.board.cols && level.height === target.board.rows
    && level.playable.length === target.board.playable_cell_count,
  time: level.timeSeconds === target.time_seconds,
  blocks: level.blocks.length === target.full_level_block_count,
  occupied_cells: occupiedCellCount === target.full_level_occupied_cell_count,
  shapes: canonicalJson(histogram(level.blocks)) === canonicalJson(target.full_level_shape_histogram),
  opening_stage: openingBlocks.length === target.stage_partitions[0].count
    && canonicalJson(histogram(openingBlocks)) === canonicalJson(target.stage_partitions[0].shape_histogram),
  cover_1_stage: stageBlocks(coverOneId).length === target.stage_partitions[1].count
    && canonicalJson(histogram(stageBlocks(coverOneId))) === canonicalJson(target.stage_partitions[1].shape_histogram),
  cover_2_stage: stageBlocks(coverTwoId).length === target.stage_partitions[2].count
    && canonicalJson(histogram(stageBlocks(coverTwoId))) === canonicalJson(target.stage_partitions[2].shape_histogram),
  colors: openingColors.size === target.opening_color_count && fullColors.size === target.full_level_color_count,
  gates: ordinaryGateCount === target.mechanism_contract.directional_exits.ordinary_count
    && canonicalJson(frozenValues) === canonicalJson([...target.mechanism_contract.directional_exits.frozen_values].sort((a, b) => a - b)),
  shells: shellBlocks.length === target.mechanism_contract.shells.count
    && shellBlocks.every((block) => shapeKind(block) === "V3" && block.layers.length === 2
      && block.layers[0] !== block.layers[1] && block.shutterId === coverOneId),
  covers: coverOne.count === 12 && coverTwo.count === 22
    && stageBlocks(coverOneId).length === 8 && stageBlocks(coverTwoId).length === 5,
  floor: level.designTargets.minimumRepositionOverhead === target.campaign_reposition_floor,
};
const exactFailures = Object.entries(exactChecks).filter(([, passed]) => !passed).map(([name]) => name);
if (exactFailures.length) throw new Error(`Lv34 exact contract checks failed: ${exactFailures.join(", ")}`);

const candidateLevelSpecSha256 = levelSpecSha256(level);
const searchAttempt = "crafted-real-physical-covers-first-clear-floor";
const prefixSymmetryClasses = [
  ["b1-01", "b1-02", "b1-05", "b1-06", "b1-12", "b1-13"].map((id) => b(id).id),
  ["b1-03", "b1-04", "b1-07", "b1-08", "b1-09", "b1-10", "b1-11"].map((id) => b(id).id),
  ["b1-15", "b1-16", "b1-17"].map((id) => b(id).id),
];
const proofPlan = {
  level_id: "Lv034",
  source: "exact initial PuzzleModel prefix with both authored physical covers and all frozen exits retained",
  proof_scope: "whole-level lower bound from exhaustive first-clear prefix",
  proof_method: "physical_cover_prefix",
  level_spec_sha256: candidateLevelSpecSha256,
  target_reposition_overhead: target.campaign_reposition_floor,
  prefix_event: "first_clear_or_layer_removal",
  interchangeable_block_id_groups: prefixSymmetryClasses,
  groups: [],
};
const entry = {
  level_id: "Lv034",
  search_attempt: searchAttempt,
  target: structuredClone(target),
  level,
  route,
  route_semantics: "fully_assembled_runtime",
  carrier_assignments: {
    numeric_ice: [],
    shells: shellCarrierAssignments,
  },
  witness_metrics: witnessMetrics,
  proof_plan: proofPlan,
};
const artifact = {
  schema_version: "blockout-video-parity-lv34-physical-cover-candidate-v1",
  prototype_only: true,
  applied_to_live_campaign: false,
  source: {
    path: inputRelative,
    sha256: sha256(inputText),
    contract: { path: contractRelative, sha256: sha256(contractText) },
  },
  contract_scalars: {
    rows: 9,
    cols: 7,
    playable_cell_count: 63,
    block_count: 30,
    occupied_cell_count: 60,
    shape_histogram: target.full_level_shape_histogram,
    opening_color_count: 3,
    full_color_count: 6,
    ordinary_exit_count: 1,
    frozen_values: [7, 13, 14, 22, 22],
    cover_values: [12, 22],
    hidden_batch_counts: [8, 5],
    shell_extra_layers: [1, 1, 1, 1, 1, 1, 1],
    required_reposition_floor: 11,
  },
  board_mask: mask,
  exact_contract_checks: exactChecks,
  levels: [entry],
};
const witnesses = [{
  level_id: "Lv034",
  source: searchAttempt,
  proof_scope: "complete PuzzleModel replay; upper bound only",
  drags: route,
  metrics: witnessMetrics,
}];
const corePlans = [proofPlan];

const outputDir = resolve(root, outputDirRelative);
await mkdir(outputDir, { recursive: true });
const artifactText = `${JSON.stringify(artifact, null, 2)}\n`;
const witnessesText = `${JSON.stringify(witnesses, null, 2)}\n`;
const corePlansText = `${JSON.stringify(corePlans, null, 2)}\n`;
await Promise.all([
  writeFile(resolve(outputDir, "proof-input.json"), artifactText, "utf8"),
  writeFile(resolve(outputDir, "proof-witness.json"), witnessesText, "utf8"),
  writeFile(resolve(outputDir, "core-plan.json"), corePlansText, "utf8"),
]);

console.log(JSON.stringify({
  output: relative(root, outputDir).replaceAll("\\", "/"),
  contract_sha256: sha256(contractText),
  candidate_level_spec_sha256: candidateLevelSpecSha256,
  proof_input_sha256: sha256(artifactText),
  proof_witness_sha256: sha256(witnessesText),
  core_plan_sha256: sha256(corePlansText),
  board_mask: mask,
  shape_histogram: histogram(level.blocks),
  exact_contract_checks: exactChecks,
  witness_metrics: witnessMetrics,
  independent_replay_matches: true,
}, null, 2));
