import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Prototype-only Lv24 construction. The competitor stage inventory and every
// mechanism scalar stay fixed. Ten disjoint opposed pairs are distributed over
// the opening and the two simultaneous cover batches; the one-cell-wide
// S-handle makes each relaxed pair require one genuine parking action.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index < 0 ? fallback : args[index + 1];
};
const inputRelative = option(
  "--input",
  ".codex-temp/video-parity-v6-lv24-baseline-r27/runtime.generated.ts",
);
const contractRelative = option(
  "--contract",
  "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v6.json",
);
const outputDirRelative = option(
  "--output-dir",
  ".codex-temp/video-parity-v6-lv24-s-handle-candidate",
);

const inputPath = resolve(root, inputRelative);
const contractPath = resolve(root, contractRelative);
const [inputText, contractText] = await Promise.all([
  readFile(inputPath, "utf8"),
  readFile(contractPath, "utf8"),
]);
const contract = JSON.parse(contractText);
const target = contract.levels.find((entry) => entry.level_id === "Lv024")?.our_design_target;
if (!target) throw new Error("Lv24 is missing from the active design contract");

const bundle = await build({
  stdin: {
    contents: `
      export { VIDEO_PARITY_LEVELS as levels } from ${JSON.stringify(inputPath)};
      export { PuzzleModel, validateLevel } from ${JSON.stringify(resolve(root, "src/core/PuzzleModel.ts"))};
    `,
    resolveDir: root,
    sourcefile: "lv24-s-handle-candidate-runtime.ts",
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
const source = runtime.levels.find((level) => level.id === 24);
if (!source) throw new Error("Lv24 is missing from the input runtime");

const mask = target.board.playable_mask;
const playable = mask.flatMap((row, y) => [...row].flatMap((cell, x) => (
  cell === "#" ? [[x, y]] : []
)));
if (source.width !== 5 || source.height !== 9 || playable.length !== 37
  || source.blocks.length !== 26 || source.gates.length !== 6) {
  throw new Error("Lv24 source no longer matches the expected competitor scalar contract");
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
if (JSON.stringify(histogram(source.blocks)) !== JSON.stringify({ SINGLE: 21, V2: 4, V3: 1 })) {
  throw new Error(`unexpected Lv24 inventory ${JSON.stringify(histogram(source.blocks))}`);
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
const clearRules = (block) => {
  delete block.frozen;
  delete block.movementAxis;
  delete block.keyId;
  delete block.lockedBy;
  delete block.lockCount;
  delete block.star;
};
const assign = (block, x, y, shape, color, layers = [color]) => {
  block.x = x;
  block.y = y;
  block.shape = shape.map((point) => [...point]);
  block.color = layers[0];
  block.layers = [...layers];
  clearRules(block);
};
const level = structuredClone(source);
level.name = `${source.name} S-handle mechanism room`;
level.playable = playable;
delete level.blocked;
delete level.generators;
delete level.elevators;
delete level.conveyors;
delete level.onboardingHint;
delete level.strategyNudge;
delete level.strategyFocus;
delete level.featureIntro;

const [A, B, C, D, E, F] = target.design_palette;
if (new Set([A, B, C, D, E, F]).size !== 6) throw new Error("Lv24 requires six unique design colours");
const blocks = new Map(level.blocks.map((block) => [block.id, block]));
const b = (id) => {
  const block = blocks.get(`cc-024-${id}`);
  if (!block) throw new Error(`missing Lv24 block cc-024-${id}`);
  return block;
};

const P = [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [4, 1],
  [4, 2], [3, 2], [2, 2], [1, 2], [0, 2], [0, 3]];
const Q = [[0, 4], [0, 5], [0, 6], [0, 7], [0, 8], [1, 8]];

// Opening: six opposed pairs exactly fill the S-handle. Five are blue/purple;
// the innermost pair is blue/cyan so the opening still exposes exactly 3 hues.
for (let index = 0; index < 6; index += 1) {
  assign(b(`b1-${String(index + 1).padStart(2, "0")}`), ...P[index], [[0, 0]], A);
}
assign(b("b1-07"), ...P[6], [[0, 0]], C);
for (let index = 7; index < 12; index += 1) {
  assign(b(`b1-${String(index + 1).padStart(2, "0")}`), ...P[index], [[0, 0]], B);
}

// Cover 1 contributes one more opposed pair; all three V2 pieces occupy the
// mechanism room below the handle.
assign(b("b2-01"), 1, 4, [[0, 0], [0, 1]], D);
assign(b("b2-02"), 2, 4, [[0, 0], [0, 1]], D, [D, F]);
assign(b("b2-03"), ...P[0], [[0, 0]], A);
assign(b("b2-04"), 3, 4, [[0, 0], [0, 1]], F, [F, D]);
assign(b("b2-05"), ...P[11], [[0, 0]], B);

// Cover 2 contributes three opposed pairs on unused handle cells. Its numeric
// SINGLE, V2 and shell V3 fill the rest of the mechanism room without any
// overlap with Cover 1 when both count-12 covers release together.
assign(b("b3-01"), ...P[1], [[0, 0]], A);
assign(b("b3-02"), ...P[10], [[0, 0]], B);
assign(b("b3-03"), ...P[2], [[0, 0]], A);
assign(b("b3-04"), ...P[9], [[0, 0]], B);
assign(b("b3-05"), 2, 8, [[0, 0]], D);
assign(b("b3-06"), 1, 6, [[0, 0], [0, 1], [0, 2]], D, [D, E]);
assign(b("b3-07"), ...P[3], [[0, 0]], A);
assign(b("b3-08"), 2, 6, [[0, 0], [0, 1]], D);
assign(b("b3-09"), ...P[8], [[0, 0]], B);

for (const id of ["b2-02", "b2-04", "b3-05", "b3-06"]) b(id).frozen = 6;

const covers = [...(level.shutters ?? [])].sort((left, right) => left.id.localeCompare(right.id));
if (covers.length !== 2) throw new Error(`expected two Lv24 covers, received ${covers.length}`);
const coverOne = covers.find((cover) => cover.id.endsWith("cover-1"));
const coverTwo = covers.find((cover) => cover.id.endsWith("cover-2"));
if (!coverOne || !coverTwo) throw new Error("Lv24 cover ids changed unexpectedly");
Object.assign(coverOne, { x: 4, y: 4, width: 1, height: 1, count: 12, skin: "shutter" });
Object.assign(coverTwo, { x: 4, y: 5, width: 1, height: 1, count: 12, skin: "shutter" });

const gateSpecs = [
  { side: "left", offset: 3, size: 1, color: A },
  { side: "left", offset: 0, size: 1, color: C, frozen: 6 },
  { side: "top", offset: 0, size: 1, color: B, frozen: 4 },
  { side: "right", offset: 4, size: 5, color: D, frozen: 15 },
  { side: "bottom", offset: 0, size: 5, color: F, frozen: 18 },
  { side: "left", offset: 4, size: 5, color: E, frozen: 18 },
];
level.gates.forEach((gate, index) => {
  Object.assign(gate, gateSpecs[index]);
  if (gateSpecs[index].frozen === undefined) delete gate.frozen;
  delete gate.star;
});
level.designTargets = {
  formulaVersion: "blockout-d1",
  calibratedDifficulty: target.target_d1_difficulty.calibrated_score,
  minimumRepositionOverhead: 10,
};

const openingIds = Array.from(
  { length: 12 },
  (_, index) => b(`b1-${String(index + 1).padStart(2, "0")}`).id,
);
const route = [];
// Park P11..P6 at Q5..Q0, exposing the six blue pieces.
for (let position = 11; position >= 6; position -= 1) {
  const parkingIndex = position - 6;
  route.push({
    blockId: openingIds[position],
    path: [...P.slice(position + 1), ...Q.slice(0, parkingIndex + 1)],
  });
}
// Clear P5..P0 through the blue terminal at P11.
for (let position = 5; position >= 0; position -= 1) {
  route.push({ blockId: openingIds[position], path: P.slice(position + 1), exitSide: "left" });
}
// Recover cyan first, then the five purple pieces through P0.
for (let parkingIndex = 0; parkingIndex < 6; parkingIndex += 1) {
  const position = 6 + parkingIndex;
  route.push({
    blockId: openingIds[position],
    path: [...Q.slice(0, parkingIndex).reverse(), ...P.slice().reverse()],
    exitSide: position === 6 ? "left" : "top",
  });
}

// Both covers now release. Park the four far-side blockers at Q3..Q0.
const hiddenFar = [
  [b("b2-05").id, 11],
  [b("b3-02").id, 10],
  [b("b3-04").id, 9],
  [b("b3-09").id, 8],
];
for (let index = 0; index < hiddenFar.length; index += 1) {
  const [blockId, position] = hiddenFar[index];
  const parkingIndex = 3 - index;
  route.push({ blockId, path: [...P.slice(position + 1), ...Q.slice(0, parkingIndex + 1)] });
}
for (const [blockId, position] of [
  [b("b3-07").id, 3],
  [b("b3-03").id, 2],
  [b("b3-01").id, 1],
  [b("b2-03").id, 0],
]) {
  route.push({ blockId, path: P.slice(position + 1), exitSide: "left" });
}
for (const [blockId, parkingIndex] of [
  [b("b3-09").id, 0],
  [b("b3-04").id, 1],
  [b("b3-02").id, 2],
  [b("b2-05").id, 3],
]) {
  route.push({
    blockId,
    path: [...Q.slice(0, parkingIndex).reverse(), ...P.slice().reverse()],
    exitSide: "top",
  });
}

// Mechanism-room finish: 9 clear actions for 6 bodies plus 3 shell layers.
route.push(
  { blockId: b("b2-04").id, path: [[3, 5], [3, 6], [3, 7]], exitSide: "bottom" },
  { blockId: b("b2-04").id, path: [[4, 7]], exitSide: "right" },
  { blockId: b("b2-02").id, path: [[3, 4], [4, 4]], exitSide: "right" },
  { blockId: b("b2-02").id, path: [[4, 5], [4, 6], [4, 7]], exitSide: "bottom" },
  { blockId: b("b2-01").id, path: [[2, 4], [3, 4], [4, 4]], exitSide: "right" },
  { blockId: b("b3-05").id, path: [[3, 8], [4, 8]], exitSide: "right" },
  { blockId: b("b3-08").id, path: [[3, 6], [4, 6]], exitSide: "right" },
  { blockId: b("b3-06").id, path: [[2, 6], [3, 6], [4, 6]], exitSide: "right" },
  { blockId: b("b3-06").id, path: [[3, 6], [2, 6], [1, 6], [0, 6]], exitSide: "left" },
);

try {
  runtime.validateLevel(level);
} catch (error) {
  console.error(`Lv24 validateLevel failed: ${error.message}`);
  process.exit(1);
}
let witnessMetrics;
try {
  witnessMetrics = replay(level, route);
} catch (error) {
  console.error(`Lv24 route replay failed: ${error.message}`);
  process.exit(1);
}
if (witnessMetrics.repositions !== 10 || witnessMetrics.actions !== 39 || witnessMetrics.clear_layers !== 29) {
  throw new Error(`unexpected Lv24 witness metrics ${JSON.stringify(witnessMetrics)}`);
}
level.parMoves = witnessMetrics.actions;

const pair = (id, stageKey, left, right) => ({
  id,
  stage_key: stageKey,
  block_ids: [b(left).id, b(right).id],
  floor: 1,
});
const coreGroups = [
  pair("opening-pair-01", "opening", "b1-01", "b1-12"),
  pair("opening-pair-02", "opening", "b1-02", "b1-11"),
  pair("opening-pair-03", "opening", "b1-03", "b1-10"),
  pair("opening-pair-04", "opening", "b1-04", "b1-09"),
  pair("opening-pair-05", "opening", "b1-05", "b1-08"),
  pair("opening-pair-06", "opening", "b1-06", "b1-07"),
  pair("cover-1-pair-01", `shutter:${coverOne.id}`, "b2-03", "b2-05"),
  pair("cover-2-pair-01", `shutter:${coverTwo.id}`, "b3-01", "b3-02"),
  pair("cover-2-pair-02", `shutter:${coverTwo.id}`, "b3-03", "b3-04"),
  pair("cover-2-pair-03", `shutter:${coverTwo.id}`, "b3-07", "b3-09"),
];
const carrierAssignments = {
  shells: [
    { block_id: b("b2-02").id, requirement_index: 0, layers: [D, F] },
    { block_id: b("b2-04").id, requirement_index: 1, layers: [F, D] },
    { block_id: b("b3-06").id, requirement_index: 2, layers: [D, E] },
  ],
  numeric_ice: [
    { block_id: b("b2-02").id, requirement_index: 0, value: 6, shape: "V2", stage_id: "cover-1" },
    { block_id: b("b2-04").id, requirement_index: 1, value: 6, shape: "V2", stage_id: "cover-1" },
    { block_id: b("b3-06").id, requirement_index: 2, value: 6, shape: "V3", stage_id: "cover-2" },
    { block_id: b("b3-05").id, requirement_index: 3, value: 6, shape: "SINGLE", stage_id: "cover-2" },
  ],
};
const entry = {
  level_id: "Lv024",
  search_attempt: "crafted-s-handle-mechanism-room",
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
  schema_version: "blockout-video-parity-lv24-s-handle-candidate-v1",
  prototype_only: true,
  applied_to_live_campaign: false,
  source: {
    path: inputRelative,
    sha256: sha256(inputText),
    contract: { path: contractRelative, sha256: sha256(contractText) },
  },
  contract_scalars: {
    rows: 9,
    cols: 5,
    playable_cell_count: 37,
    block_count: 26,
    occupied_cell_count: 32,
    shape_histogram: target.full_level_shape_histogram,
    opening_color_count: 3,
    full_color_count: 6,
    ordinary_exit_count: 1,
    frozen_values: [6, 4, 15, 18, 18],
    cover_values: [12, 12],
    numeric_ice_values: [6, 6, 6, 6],
    shell_extra_layers: [1, 1, 1],
    required_reposition_floor: 10,
  },
  board_mask: mask,
  levels: [entry],
};
const witnesses = [{
  level_id: "Lv024",
  drags: route,
  metrics: witnessMetrics,
  source_attempt: entry.search_attempt,
}];
const corePlans = [{
  level_id: "Lv024",
  source: "crafted Lv24 S-handle; verifier independently rebuilds every relaxed pair",
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
  numeric_ice_carriers: carrierAssignments.numeric_ice,
}, null, 2));
