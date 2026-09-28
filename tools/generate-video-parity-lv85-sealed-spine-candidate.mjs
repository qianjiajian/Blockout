import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Prototype-only Lv85 construction. A two-cell spine contains an orange H2
// terminal, four red H2 blockers and three red SINGLE blockers. Two SINGLEs
// occupy the first row below the H2 stack, so both must be parked before the
// lowest H2 can move. The third SINGLE then prevents the orange terminal from
// reaching its bottom gate until the four H2 blockers are parked as well.
// The red blockers can only leave through the top gate behind the terminal.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index < 0 ? fallback : args[index + 1];
};
const inputRelative = option(
  "--input",
  ".codex-temp/video-parity-v6-lv85-baseline-r33/runtime.generated.ts",
);
const contractRelative = option(
  "--contract",
  "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v6.json",
);
const outputDirRelative = option(
  "--output-dir",
  ".codex-temp/video-parity-v6-lv85-sealed-spine-candidate-r1",
);

const inputPath = resolve(root, inputRelative);
const contractPath = resolve(root, contractRelative);
const [inputText, contractText] = await Promise.all([
  readFile(inputPath, "utf8"),
  readFile(contractPath, "utf8"),
]);
const contract = JSON.parse(contractText);
const target = contract.levels.find((entry) => entry.level_id === "Lv085")?.our_design_target;
if (!target) throw new Error("Lv85 is missing from the active design contract");

const bundle = await build({
  stdin: {
    contents: `
      export { VIDEO_PARITY_LEVELS as levels } from ${JSON.stringify(inputPath)};
      export { PuzzleModel, validateLevel } from ${JSON.stringify(resolve(root, "src/core/PuzzleModel.ts"))};
    `,
    resolveDir: root,
    sourcefile: "lv85-sealed-spine-candidate-runtime.ts",
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
const source = runtime.levels.find((level) => level.id === 85);
if (!source) throw new Error("Lv85 is missing from the input runtime");

const mask = [
  "###.##", "###.##", "###.##", "###.##", "###.##", "###.##",
  "######", "######", "######",
];
const playable = mask.flatMap((row, y) => [...row].flatMap((cell, x) => (
  cell === "#" ? [[x, y]] : []
)));
if (source.width !== 6 || source.height !== 9 || playable.length !== 48
  || source.blocks.length !== 18 || source.gates.length !== 7) {
  throw new Error("Lv85 source no longer matches the expected competitor scalar contract");
}
if (target.time_seconds !== 165 || target.full_level_block_count !== 18
  || target.full_level_occupied_cell_count !== 46
  || target.full_level_color_count !== 6
  || target.campaign_reposition_floor !== 7) {
  throw new Error("Lv85 contract scalars drifted from the sealed-spine construction");
}
const mechanism = target.mechanism_contract;
if (mechanism?.directional_exits?.ordinary_count !== 2
  || JSON.stringify(mechanism.directional_exits.frozen_values) !== JSON.stringify([8, 6, 4, 2, 1])
  || mechanism?.axis_blocks?.count !== 1
  || mechanism.axis_blocks.items?.[0]?.axis !== "vertical"
  || mechanism.axis_blocks.items?.[0]?.shape !== "SQ2") {
  throw new Error("Lv85 mechanism contract drifted from the sealed-spine construction");
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
const SINGLE = [[0, 0]];
const H2 = [[0, 0], [1, 0]];
const V2 = [[0, 0], [0, 1]];
const SQ2 = [[0, 0], [1, 0], [0, 1], [1, 1]];
const L0 = [[0, 0], [1, 0], [0, 1]];
const L2 = [[0, 0], [0, 1], [1, 1]];
const L3 = [[1, 0], [0, 1], [1, 1]];

const level = structuredClone(source);
level.name = `${source.name} · 混合封闭脊柱`;
level.playable = playable;
level.timeSeconds = target.time_seconds;
delete level.blocked;
delete level.shutters;
delete level.generators;
delete level.elevators;
delete level.conveyors;
delete level.onboardingHint;
delete level.strategyNudge;
delete level.strategyFocus;
delete level.featureIntro;

const [RED, ORANGE, GREEN, CYAN, PURPLE, BLUE] = target.design_palette;
if (new Set([RED, ORANGE, GREEN, CYAN, PURPLE, BLUE]).size !== 6) {
  throw new Error("Lv85 requires six unique design colours");
}
const blocks = new Map(level.blocks.map((block) => [block.id, block]));
const block = (index) => {
  const id = `cc-085-b1-${String(index).padStart(2, "0")}`;
  const found = blocks.get(id);
  if (!found) throw new Error(`missing Lv85 block ${id}`);
  return found;
};

// Mixed sealed spine.
assign(block(1), 4, 0, H2, ORANGE);
assign(block(2), 4, 1, H2, RED);
assign(block(3), 4, 2, H2, RED);
assign(block(4), 4, 3, H2, RED);
assign(block(5), 4, 4, H2, RED);
assign(block(6), 4, 5, SINGLE, RED);
assign(block(7), 5, 5, SINGLE, RED);
assign(block(8), 4, 6, SINGLE, RED);

// The other ten blocks exactly tile all but two remaining playable cells.
assign(block(9), 0, 0, SQ2, BLUE);
assign(block(10), 2, 0, V2, CYAN);
assign(block(11), 0, 2, SQ2, BLUE);
assign(block(12), 1, 3, L3, CYAN);
assign(block(13), 0, 4, L2, BLUE);
assign(block(14), 2, 5, L2, PURPLE);
assign(block(15), 0, 6, L0, PURPLE);
assign(block(16), 0, 7, L3, GREEN);
assign(block(17), 2, 7, SQ2, GREEN);
assign(block(18), 4, 7, SQ2, ORANGE);
block(18).movementAxis = "vertical";

const gateSpecs = [
  { side: "bottom", offset: 4, size: 2, color: ORANGE },
  { side: "top", offset: 4, size: 2, color: RED },
  { side: "left", offset: 0, size: 6, color: BLUE, frozen: 1 },
  { side: "bottom", offset: 0, size: 4, color: GREEN, frozen: 2 },
  { side: "top", offset: 0, size: 3, color: CYAN, frozen: 4 },
  { side: "left", offset: 6, size: 3, color: PURPLE, frozen: 6 },
  { side: "right", offset: 6, size: 3, color: PURPLE, frozen: 8 },
];
level.gates.forEach((gate, index) => {
  Object.assign(gate, gateSpecs[index]);
  if (gateSpecs[index].frozen === undefined) delete gate.frozen;
  delete gate.star;
});
level.designTargets = {
  formulaVersion: "blockout-d1",
  calibratedDifficulty: target.target_d1_difficulty.calibrated_score,
  minimumRepositionOverhead: 7,
};

const id = (index) => block(index).id;
const route = [
  { blockId: id(18), path: [], exitSide: "bottom" },
  { blockId: id(11), path: [], exitSide: "left" },
  { blockId: id(13), path: [], exitSide: "left" },
  { blockId: id(9), path: [], exitSide: "left" },
  { blockId: id(10), path: [], exitSide: "top" },
  { blockId: id(12), path: [[1, 2], [1, 1], [1, 0]], exitSide: "top" },
  { blockId: id(15), path: [], exitSide: "left" },
  { blockId: id(16), path: [], exitSide: "bottom" },
  { blockId: id(17), path: [], exitSide: "bottom" },
  { blockId: id(14), path: [[2, 6], [1, 6], [0, 6]], exitSide: "left" },

  { blockId: id(8), path: [[4, 7], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]] },
  { blockId: id(6), path: [[4, 6], [4, 7], [4, 8], [3, 8], [2, 8], [1, 8]] },
  { blockId: id(7), path: [[5, 6], [5, 7], [5, 8], [4, 8], [3, 8], [2, 8]] },
  { blockId: id(5), path: [[4, 5], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6]] },
  { blockId: id(4), path: [[4, 4], [4, 5], [4, 6], [3, 6], [2, 6], [2, 7], [1, 7], [0, 7]] },
  { blockId: id(3), path: [[4, 3], [4, 4], [4, 5], [4, 6], [3, 6], [2, 6], [2, 7]] },
  { blockId: id(2), path: [[4, 2], [4, 3], [4, 4], [4, 5], [4, 6], [3, 6], [2, 6]] },
  { blockId: id(1), path: [[4, 1], [4, 2], [4, 3], [4, 4], [4, 5], [4, 6], [4, 7], [4, 8]], exitSide: "bottom" },
  { blockId: id(2), path: [[3, 6], [4, 6], [4, 5], [4, 4], [4, 3], [4, 2], [4, 1], [4, 0]], exitSide: "top" },
  { blockId: id(3), path: [[3, 7], [4, 7], [4, 6], [4, 5], [4, 4], [4, 3], [4, 2], [4, 1], [4, 0]], exitSide: "top" },
  { blockId: id(4), path: [[1, 7], [2, 7], [3, 7], [4, 7], [4, 6], [4, 5], [4, 4], [4, 3], [4, 2], [4, 1], [4, 0]], exitSide: "top" },
  { blockId: id(5), path: [[1, 6], [2, 6], [3, 6], [4, 6], [4, 5], [4, 4], [4, 3], [4, 2], [4, 1], [4, 0]], exitSide: "top" },
  { blockId: id(7), path: [[3, 8], [4, 8], [4, 7], [4, 6], [4, 5], [4, 4], [4, 3], [4, 2], [4, 1], [4, 0]], exitSide: "top" },
  { blockId: id(6), path: [[2, 8], [3, 8], [4, 8], [4, 7], [4, 6], [4, 5], [4, 4], [4, 3], [4, 2], [4, 1], [4, 0]], exitSide: "top" },
  { blockId: id(8), path: [[1, 8], [2, 8], [3, 8], [4, 8], [4, 7], [4, 6], [4, 5], [4, 4], [4, 3], [4, 2], [4, 1], [4, 0]], exitSide: "top" },
];

const replay = (spec, drags) => {
  const model = new runtime.PuzzleModel(spec);
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

runtime.validateLevel(level);
const witnessMetrics = replay(level, route);
if (witnessMetrics.repositions !== 7 || witnessMetrics.actions !== 25
  || witnessMetrics.clear_layers !== 18) {
  throw new Error(`unexpected Lv85 witness metrics ${JSON.stringify(witnessMetrics)}`);
}
level.parMoves = witnessMetrics.actions;

const canonicalize = (value) => Array.isArray(value) ? value.map(canonicalize)
  : value && typeof value === "object"
    ? Object.fromEntries(Object.keys(value).sort().flatMap((key) => (
      value[key] === undefined ? [] : [[key, canonicalize(value[key])]]
    )))
    : value;
const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const levelSpecSha256 = sha256(JSON.stringify(canonicalize(level)));
const handleIds = Array.from({ length: 8 }, (_value, index) => id(index + 1));
const coreGroup = {
  id: "opening-mixed-sealed-spine",
  stage_key: "opening",
  block_ids: handleIds,
  floor: 7,
  proof_method: "infinite_parking_relaxation",
  route: route.slice(10),
};
const entry = {
  level_id: "Lv085",
  search_attempt: "crafted-five-h2-three-single-sealed-spine",
  target: structuredClone(target),
  board_mask_override_pending_contract_update: mask,
  level,
  route,
  routeSemantics: "fully_assembled_runtime",
  witness_metrics: witnessMetrics,
  core_groups: [coreGroup],
};
const artifact = {
  schema_version: "blockout-video-parity-lv85-mixed-sealed-spine-candidate-v1",
  prototype_only: true,
  applied_to_live_campaign: false,
  source: {
    path: inputRelative,
    sha256: sha256(inputText),
    contract: { path: contractRelative, sha256: sha256(contractText) },
  },
  contract_scalars: {
    rows: 9,
    cols: 6,
    playable_cell_count: 48,
    block_count: 18,
    occupied_cell_count: 46,
    shape_histogram: { SINGLE: 3, H2: 5, V2: 1, SQ2: 4, L3: 5 },
    opening_color_count: 6,
    full_color_count: 6,
    ordinary_exit_count: 2,
    frozen_values: [8, 6, 4, 2, 1],
    axis_blocks: [{ shape: "SQ2", axis: "vertical" }],
    time_seconds: 165,
    required_reposition_floor: 7,
  },
  board_mask: mask,
  levels: [entry],
};
const witnesses = [{
  level_id: "Lv085",
  drags: route,
  metrics: witnessMetrics,
  source_attempt: entry.search_attempt,
}];
const corePlans = [{
  level_id: "Lv085",
  level_spec_sha256: levelSpecSha256,
  source: "crafted mixed H2/SINGLE sealed spine; verifier independently rebuilds its relaxed opening core",
  proof_scope: "single relaxed-core lower bound",
  groups: [coreGroup],
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
  level_spec_sha256: levelSpecSha256,
  board_mask: mask,
  witness_metrics: witnessMetrics,
}, null, 2));

