import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Prototype-only Lv25 construction. The fully occupied board is split into a
// two-cell-high V2 handle, a central mechanism room, and a one-cell-high SINGLE
// handle. Two domino pairs plus three single pairs prove the floor of five;
// the two shell carriers are solved between the gate-deadline milestones.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index < 0 ? fallback : args[index + 1];
};
const inputRelative = option(
  "--input",
  ".codex-temp/video-parity-v6-runtime-r25-all/runtime.generated.ts",
);
const contractRelative = option(
  "--contract",
  "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v6.json",
);
const outputDirRelative = option(
  "--output-dir",
  ".codex-temp/video-parity-v6-lv25-dual-handle-candidate",
);

const inputPath = resolve(root, inputRelative);
const contractPath = resolve(root, contractRelative);
const [inputText, contractText] = await Promise.all([
  readFile(inputPath, "utf8"),
  readFile(contractPath, "utf8"),
]);
const contract = JSON.parse(contractText);
const target = contract.levels.find((entry) => entry.level_id === "Lv025")?.our_design_target;
if (!target) throw new Error("Lv25 is missing from the active design contract");

const bundle = await build({
  stdin: {
    contents: `
      export { VIDEO_PARITY_LEVELS as levels } from ${JSON.stringify(inputPath)};
      export { PuzzleModel, validateLevel } from ${JSON.stringify(resolve(root, "src/core/PuzzleModel.ts"))};
    `,
    resolveDir: root,
    sourcefile: "lv25-dual-handle-candidate-runtime.ts",
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
const source = runtime.levels.find((level) => level.id === 25);
if (!source) throw new Error("Lv25 is missing from the input runtime");

const mask = target.board.playable_mask;
const playable = mask.flatMap((row, y) => [...row].flatMap((cell, x) => (
  cell === "#" ? [[x, y]] : []
)));
if (source.width !== 6 || source.height !== 9 || playable.length !== 42
  || source.blocks.length !== 22 || source.gates.length !== 8) {
  throw new Error("Lv25 source no longer matches the expected competitor scalar contract");
}
const shapeKind = (block) => {
  if (block.shape.length === 1) return "SINGLE";
  if (block.shape.length === 2) return "V2";
  if (block.shape.length === 3) return "V3";
  return `OTHER_${block.shape.length}`;
};
const histogram = (blocks) => Object.fromEntries(
  [...blocks.reduce((map, block) => {
    const kind = shapeKind(block);
    map.set(kind, (map.get(kind) ?? 0) + 1);
    return map;
  }, new Map())].sort(([left], [right]) => left.localeCompare(right)),
);
if (JSON.stringify(histogram(source.blocks)) !== JSON.stringify({ SINGLE: 6, V2: 12, V3: 4 })) {
  throw new Error(`unexpected Lv25 inventory ${JSON.stringify(histogram(source.blocks))}`);
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
const assign = (block, x, y, shape, color, layers = [color]) => {
  block.x = x;
  block.y = y;
  block.shape = shape.map((point) => [...point]);
  block.color = layers[0];
  block.layers = [...layers];
  delete block.frozen;
  delete block.shutterId;
  delete block.movementAxis;
  delete block.keyId;
  delete block.lockedBy;
  delete block.lockCount;
  delete block.star;
};

const level = structuredClone(source);
level.name = `${source.name} dual handle room`;
level.playable = playable;
delete level.blocked;
delete level.shutters;
delete level.generators;
delete level.elevators;
delete level.conveyors;
delete level.onboardingHint;
delete level.strategyNudge;
delete level.strategyFocus;
delete level.featureIntro;

const palette = [...new Set(source.blocks.flatMap((block) => block.layers ?? [block.color]))].sort();
if (palette.length !== 7) throw new Error(`expected seven colours, received ${palette.length}`);
const [a, b, c, d, e, f, g] = palette;
const singles = level.blocks.filter((block) => shapeKind(block) === "SINGLE")
  .sort((left, right) => left.id.localeCompare(right.id));
const v2 = level.blocks.filter((block) => shapeKind(block) === "V2")
  .sort((left, right) => left.id.localeCompare(right.id));
const v3 = level.blocks.filter((block) => shapeKind(block) === "V3")
  .sort((left, right) => left.id.localeCompare(right.id));

// Top handle: A wants right, B wants left, and G peels at 8/13 clears.
assign(v2[0], 0, 0, [[0, 0], [0, 1]], a);
assign(v2[1], 1, 0, [[0, 0], [0, 1]], a);
assign(v2[2], 2, 0, [[0, 0], [0, 1]], b);
assign(v2[3], 3, 0, [[0, 0], [0, 1]], b);
assign(v2[4], 4, 0, [[0, 0], [0, 1]], g);
assign(v2[5], 5, 0, [[0, 0], [0, 1]], g);

// Central room: six dominoes and four triminoes exactly tile the 24 cells.
assign(v2[6], 0, 6, [[0, 0], [0, 1]], e);
assign(v2[7], 1, 3, [[0, 0], [0, 1]], e);
assign(v2[8], 1, 5, [[0, 0], [0, 1]], e);
assign(v2[9], 2, 3, [[0, 0], [0, 1]], e);
assign(v2[10], 2, 5, [[0, 0], [0, 1]], e);
assign(v2[11], 5, 2, [[0, 0], [0, 1]], f);
assign(v3[0], 0, 3, [[0, 0], [0, 1], [0, 2]], e);
assign(v3[1], 3, 3, [[0, 0], [0, 1], [0, 2]], e, [e, f]);
assign(v3[2], 4, 3, [[0, 0], [0, 1], [0, 2]], e, [e, f]);
assign(v3[3], 5, 4, [[0, 0], [0, 1], [0, 2]], f);

// Bottom handle: C wants right and D wants left.
assign(singles[0], 0, 8, [[0, 0]], c);
assign(singles[1], 1, 8, [[0, 0]], c);
assign(singles[2], 2, 8, [[0, 0]], c);
assign(singles[3], 3, 8, [[0, 0]], d);
assign(singles[4], 4, 8, [[0, 0]], d);
assign(singles[5], 5, 8, [[0, 0]], d);

const gateSpecs = [
  { side: "left", offset: 3, size: 4, color: e },
  { side: "right", offset: 3, size: 4, color: f, frozen: 4 },
  { side: "top", offset: 4, size: 1, color: g, frozen: 8 },
  { side: "right", offset: 8, size: 1, color: c, frozen: 21 },
  { side: "left", offset: 0, size: 2, color: b, frozen: 16 },
  { side: "right", offset: 0, size: 2, color: a, frozen: 14 },
  { side: "top", offset: 5, size: 1, color: g, frozen: 13 },
  { side: "left", offset: 8, size: 1, color: d, frozen: 17 },
];
level.gates.forEach((gate, index) => {
  Object.assign(gate, gateSpecs[index]);
  if (gateSpecs[index].frozen === undefined) delete gate.frozen;
  delete gate.star;
});
level.designTargets = {
  formulaVersion: "blockout-d1",
  calibratedDifficulty: target.target_d1_difficulty.calibrated_score,
  minimumRepositionOverhead: 5,
};

const route = [
  { blockId: v3[0].id, path: [], exitSide: "left" },
  { blockId: v2[6].id, path: [[0, 5]], exitSide: "left" },
  { blockId: v2[7].id, path: [[0, 3]], exitSide: "left" },
  { blockId: v2[8].id, path: [[0, 5]], exitSide: "left" },
  { blockId: v2[9].id, path: [[1, 3], [0, 3]], exitSide: "left" },
  { blockId: v2[10].id, path: [[1, 5], [0, 5]], exitSide: "left" },
  { blockId: v3[3].id, path: [], exitSide: "right" },
  { blockId: v2[11].id, path: [[5, 3]], exitSide: "right" },
  { blockId: v2[4].id, path: [], exitSide: "top" },
  { blockId: singles[0].id, path: [[0, 7], [0, 6], [1, 6], [2, 6]] },
  { blockId: v3[1].id, path: [[2, 3], [1, 3], [0, 3]], exitSide: "left" },
  { blockId: v3[1].id, path: [[0, 4], [0, 5], [0, 6]] },
  { blockId: v3[2].id, path: [[3, 3], [2, 3], [1, 3], [0, 3]], exitSide: "left" },
  { blockId: v3[2].id, path: [[1, 3], [2, 3], [3, 3], [4, 3], [5, 3]], exitSide: "right" },
  {
    blockId: v3[1].id,
    path: [[0, 5], [0, 4], [0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3]],
    exitSide: "right",
  },
  { blockId: v2[5].id, path: [], exitSide: "top" },
  {
    blockId: v2[3].id,
    path: [[4, 0], [5, 0], [5, 1], [5, 2], [5, 3], [5, 4], [5, 5]],
  },
  {
    blockId: v2[2].id,
    path: [[3, 0], [4, 0], [5, 0], [5, 1], [5, 2], [5, 3]],
  },
  { blockId: v2[1].id, path: [[2, 0], [3, 0], [4, 0], [5, 0]], exitSide: "right" },
  { blockId: v2[0].id, path: [[1, 0], [2, 0], [3, 0], [4, 0], [5, 0]], exitSide: "right" },
  {
    blockId: v2[2].id,
    path: [[5, 2], [5, 1], [5, 0], [4, 0], [3, 0], [2, 0], [1, 0], [0, 0]],
    exitSide: "left",
  },
  {
    blockId: v2[3].id,
    path: [[5, 4], [5, 3], [5, 2], [5, 1], [5, 0], [4, 0], [3, 0], [2, 0], [1, 0], [0, 0]],
    exitSide: "left",
  },
  { blockId: singles[1].id, path: [[0, 8], [0, 7], [0, 6], [1, 6]] },
  { blockId: singles[2].id, path: [[1, 8], [0, 8], [0, 7], [0, 6]] },
  { blockId: singles[3].id, path: [[2, 8], [1, 8], [0, 8]], exitSide: "left" },
  { blockId: singles[4].id, path: [[3, 8], [2, 8], [1, 8], [0, 8]], exitSide: "left" },
  { blockId: singles[5].id, path: [[4, 8], [3, 8], [2, 8], [1, 8], [0, 8]], exitSide: "left" },
  { blockId: singles[2].id, path: [[0, 7], [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8]], exitSide: "right" },
  {
    blockId: singles[1].id,
    path: [[0, 6], [0, 7], [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8]],
    exitSide: "right",
  },
  {
    blockId: singles[0].id,
    path: [[1, 6], [0, 6], [0, 7], [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8]],
    exitSide: "right",
  },
];

try {
  runtime.validateLevel(level);
} catch (error) {
  console.error(`Lv25 validateLevel failed: ${error.message}`);
  process.exit(1);
}
let witnessMetrics;
try {
  witnessMetrics = replay(level, route);
} catch (error) {
  console.error(`Lv25 route replay failed: ${error.message}`);
  process.exit(1);
}
if (witnessMetrics.repositions !== 6 || witnessMetrics.actions !== 30 || witnessMetrics.clear_layers !== 24) {
  throw new Error(`unexpected Lv25 witness metrics ${JSON.stringify(witnessMetrics)}`);
}
level.parMoves = witnessMetrics.actions;

const coreGroups = [
  { id: "v2-pair-01", stage_key: "opening", block_ids: [v2[0].id, v2[3].id], floor: 1 },
  { id: "v2-pair-02", stage_key: "opening", block_ids: [v2[1].id, v2[2].id], floor: 1 },
  { id: "single-pair-01", stage_key: "opening", block_ids: [singles[0].id, singles[5].id], floor: 1 },
  { id: "single-pair-02", stage_key: "opening", block_ids: [singles[1].id, singles[4].id], floor: 1 },
  { id: "single-pair-03", stage_key: "opening", block_ids: [singles[2].id, singles[3].id], floor: 1 },
];
const carrierAssignments = {
  shells: [
    { block_id: v3[1].id, requirement_index: 0, layers: [e, f] },
    { block_id: v3[2].id, requirement_index: 1, layers: [e, f] },
  ],
};
const entry = {
  level_id: "Lv025",
  search_attempt: "crafted-dual-handle-room",
  target: structuredClone(target),
  level,
  route,
  routeSemantics: "fully_assembled_runtime",
  carrierAssignments,
  witness_metrics: witnessMetrics,
  core_groups: coreGroups,
};
const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const artifact = {
  schema_version: "blockout-video-parity-lv25-dual-handle-candidate-v1",
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
    playable_cell_count: 42,
    block_count: 22,
    shape_histogram: target.full_level_shape_histogram,
    opening_color_count: 7,
    full_color_count: 7,
    ordinary_exit_count: 1,
    frozen_values: [4, 8, 13, 14, 16, 17, 21],
    shell_count: 2,
    shell_extra_layers: [1, 1],
    required_reposition_floor: 5,
  },
  board_mask: mask,
  levels: [entry],
};
const witnesses = [{
  level_id: "Lv025",
  drags: route,
  metrics: witnessMetrics,
  source_attempt: entry.search_attempt,
}];
const corePlans = [{
  level_id: "Lv025",
  source: "crafted Lv25 dual handles; verifier independently rebuilds every relaxed core",
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
  shell_carriers: carrierAssignments.shells,
}, null, 2));
