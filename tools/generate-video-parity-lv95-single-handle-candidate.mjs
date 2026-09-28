import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Prototype-only Lv95 construction. Nine opening SINGLE blocks form a sealed
// vertical handle: eight yellow blocks must leave the spine through the lower
// gallery before the pink terminal can reach its bottom exit. Their matching
// yellow exit sits behind the terminal at the top, so each departure is a
// necessary committed reposition. The remaining opening/key-lock and hidden
// cover inventory keeps the competitor's exact composition and timing.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index < 0 ? fallback : args[index + 1];
};
const inputRelative = option(
  "--input",
  ".codex-temp/video-parity-v6-lv95-baseline-r29/runtime.generated.ts",
);
const contractRelative = option(
  "--contract",
  "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v6.json",
);
const outputDirRelative = option(
  "--output-dir",
  ".codex-temp/video-parity-v6-lv95-single-handle-candidate",
);

const inputPath = resolve(root, inputRelative);
const contractPath = resolve(root, contractRelative);
const [inputText, contractText] = await Promise.all([
  readFile(inputPath, "utf8"),
  readFile(contractPath, "utf8"),
]);
const contract = JSON.parse(contractText);
const target = contract.levels.find((entry) => entry.level_id === "Lv095")?.our_design_target;
if (!target) throw new Error("Lv95 is missing from the active design contract");

const bundle = await build({
  stdin: {
    contents: `
      export { VIDEO_PARITY_LEVELS as levels } from ${JSON.stringify(inputPath)};
      export { PuzzleModel, validateLevel } from ${JSON.stringify(resolve(root, "src/core/PuzzleModel.ts"))};
    `,
    resolveDir: root,
    sourcefile: "lv95-single-handle-candidate-runtime.ts",
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
const source = runtime.levels.find((level) => level.id === 95);
if (!source) throw new Error("Lv95 is missing from the input runtime");

const mask = target.board.playable_mask;
const playable = mask.flatMap((row, y) => [...row].flatMap((cell, x) => (
  cell === "#" ? [[x, y]] : []
)));
if (source.width !== 8 || source.height !== 11 || playable.length !== 64
  || source.blocks.length !== 30 || source.gates.length !== 14) {
  throw new Error("Lv95 source no longer matches the expected competitor scalar contract");
}

const shapeKind = (block) => {
  const points = block.shape;
  if (points.length === 1) return "SINGLE";
  if (points.length === 2 && points.every((point) => point[1] === points[0][1])) return "H2";
  if (points.length === 2 && points.every((point) => point[0] === points[0][0])) return "V2";
  if (points.length === 3 && points.every((point) => point[1] === points[0][1])) return "H3";
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
if (JSON.stringify(histogram(source.blocks)) !== JSON.stringify({ H2: 2, H3: 2, L3: 2, SINGLE: 23, V2: 1 })) {
  throw new Error(`unexpected Lv95 inventory ${JSON.stringify(histogram(source.blocks))}`);
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
level.name = `${source.name} nine-single sealed spine`;
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

const [A, B, C, D, E, F, G] = target.design_palette;
if (new Set([A, B, C, D, E, F, G]).size !== 7) {
  throw new Error("Lv95 requires seven unique colours");
}
const blocks = new Map(level.blocks.map((block) => [block.id, block]));
const b = (id) => {
  const block = blocks.get(`cc-095-${id}`);
  if (!block) throw new Error(`missing Lv95 block cc-095-${id}`);
  return block;
};
const SINGLE = [[0, 0]];
const H2 = [[0, 0], [1, 0]];
const V2 = [[0, 0], [0, 1]];
const H3 = [[0, 0], [1, 0], [2, 0]];
const L3_RIGHT = [[0, 0], [1, 0], [1, 1]];
const L3_LEFT = [[1, 0], [0, 1], [1, 1]];

// Opening handle: terminal A at the top, eight B blockers below it.
assign(b("b1-01"), 0, 0, SINGLE, A);
for (let index = 1; index <= 8; index += 1) {
  assign(b(`b1-${String(index + 1).padStart(2, "0")}`), 0, index, SINGLE, B);
}

// Two H3 keys, their two SINGLE locks, three ordinary singles, and one V2.
assign(b("b1-13"), 2, 3, H3, C);
b("b1-13").keyId = "vp-095-key-group-1";
assign(b("b1-15"), 2, 4, H3, D);
b("b1-15").keyId = "vp-095-key-group-2";
assign(b("b1-10"), 7, 5, SINGLE, F);
Object.assign(b("b1-10"), { lockedBy: "vp-095-key-group-1", lockCount: 1 });
assign(b("b1-11"), 7, 6, SINGLE, E);
Object.assign(b("b1-11"), { lockedBy: "vp-095-key-group-2", lockCount: 1 });
assign(b("b1-12"), 7, 7, SINGLE, C);
assign(b("b1-14"), 7, 8, SINGLE, D);
assign(b("b1-17"), 7, 9, SINGLE, F);
assign(b("b1-16"), 2, 5, V2, E);

const cover = level.shutters?.find((item) => item.id === "vp-095-cover-1");
if (!cover || level.shutters.length !== 1) throw new Error("Lv95 cover changed unexpectedly");
Object.assign(cover, { x: 6, y: 9, width: 1, height: 1, count: 17, skin: "shutter" });

// Hidden batch: two L3 and two H2 pieces guard the lower purple exits; nine
// SINGLE pieces then peel through the right column and one inner lane.
assign(b("b2-12"), 3, 9, L3_RIGHT, G, true);
assign(b("b2-13"), 5, 9, L3_LEFT, G, true);
assign(b("b2-08"), 3, 8, H2, G, true);
assign(b("b2-10"), 5, 8, H2, G, true);
const columnSingleIds = ["b2-01", "b2-02", "b2-03", "b2-04", "b2-05", "b2-06", "b2-07", "b2-09"];
columnSingleIds.forEach((id, index) => assign(b(id), 7, index + 3, SINGLE, G, true));
assign(b("b2-11"), 4, 7, SINGLE, G, true);

// Twelve ordinary exits followed by frozen(9) and frozen(14).
const gateSpecs = [
  { side: "bottom", offset: 0, size: 1, color: A },
  { side: "top", offset: 0, size: 1, color: B },
  { side: "right", offset: 3, size: 1, color: C },
  { side: "right", offset: 4, size: 1, color: D },
  { side: "bottom", offset: 2, size: 1, color: E },
  { side: "right", offset: 5, size: 1, color: F },
  { side: "right", offset: 6, size: 1, color: E },
  { side: "right", offset: 7, size: 1, color: C },
  { side: "right", offset: 8, size: 1, color: D },
  { side: "right", offset: 9, size: 1, color: F },
  { side: "bottom", offset: 3, size: 2, color: G },
  { side: "bottom", offset: 5, size: 2, color: G },
  { side: "right", offset: 10, size: 1, color: G, frozen: 9 },
  { side: "bottom", offset: 7, size: 1, color: G, frozen: 14 },
];
level.gates.forEach((gate, index) => {
  Object.assign(gate, gateSpecs[index]);
  if (gateSpecs[index].frozen === undefined) delete gate.frozen;
  delete gate.star;
});
level.designTargets = {
  formulaVersion: "blockout-d1",
  calibratedDifficulty: target.target_d1_difficulty.calibrated_score,
  minimumRepositionOverhead: 8,
};

const route = [
  { blockId: b("b1-13").id, path: [[3, 3], [4, 3], [5, 3]], exitSide: "right" },
  { blockId: b("b1-15").id, path: [[3, 4], [4, 4], [5, 4]], exitSide: "right" },
  { blockId: b("b1-10").id, path: [], exitSide: "right" },
  { blockId: b("b1-11").id, path: [], exitSide: "right" },
  { blockId: b("b1-12").id, path: [], exitSide: "right" },
  { blockId: b("b1-14").id, path: [], exitSide: "right" },
  { blockId: b("b1-17").id, path: [], exitSide: "right" },
  { blockId: b("b1-16").id, path: [[2, 6], [2, 7], [2, 8], [2, 9]], exitSide: "bottom" },
];

const descend = (fromY) => Array.from({ length: 10 - fromY }, (_value, index) => [0, fromY + index + 1]);
// Deepest blocker first goes above the gallery; the other seven park far-to-near.
route.push({
  blockId: b("b1-09").id,
  path: [...descend(8), [1, 10], [2, 10], [2, 9]],
});
for (let position = 6; position >= 0; position -= 1) {
  const y = position + 1;
  const destinationX = position + 1;
  route.push({
    blockId: b(`b1-${String(position + 2).padStart(2, "0")}`).id,
    path: [
      ...descend(y),
      ...Array.from({ length: destinationX }, (_value, index) => [index + 1, 10]),
    ],
  });
}
route.push({
  blockId: b("b1-01").id,
  path: Array.from({ length: 10 }, (_value, index) => [0, index + 1]),
  exitSide: "bottom",
});

const ascendSpine = Array.from({ length: 10 }, (_value, index) => [0, 9 - index]);
for (let position = 0; position <= 6; position += 1) {
  const sourceX = position + 1;
  route.push({
    blockId: b(`b1-${String(position + 2).padStart(2, "0")}`).id,
    path: [
      ...Array.from({ length: sourceX }, (_value, index) => [sourceX - index - 1, 10]),
      ...ascendSpine,
    ],
    exitSide: "top",
  });
}
route.push({
  blockId: b("b1-09").id,
  path: [[2, 10], [1, 10], [0, 10], ...ascendSpine],
  exitSide: "top",
});

// Cover batch, all purple. Clear bottom guards, the inner single, then peel
// the right column from bottom to top.
route.push({ blockId: b("b2-12").id, path: [], exitSide: "bottom" });
route.push({ blockId: b("b2-13").id, path: [], exitSide: "bottom" });
route.push({ blockId: b("b2-08").id, path: [[3, 9], [3, 10]], exitSide: "bottom" });
route.push({ blockId: b("b2-10").id, path: [[5, 9], [5, 10]], exitSide: "bottom" });
route.push({ blockId: b("b2-11").id, path: [[4, 8], [4, 9], [4, 10]], exitSide: "bottom" });
for (let index = columnSingleIds.length - 1; index >= 0; index -= 1) {
  const y = index + 3;
  route.push({
    blockId: b(columnSingleIds[index]).id,
    path: Array.from({ length: 10 - y }, (_value, step) => [7, y + step + 1]),
    exitSide: "bottom",
  });
}

try {
  runtime.validateLevel(level);
} catch (error) {
  console.error(`Lv95 validateLevel failed: ${error.message}`);
  process.exit(1);
}
let witnessMetrics;
try {
  witnessMetrics = replay(level, route);
} catch (error) {
  console.error(`Lv95 route replay failed: ${error.message}`);
  process.exit(1);
}
if (witnessMetrics.repositions !== 8 || witnessMetrics.actions !== 38 || witnessMetrics.clear_layers !== 30) {
  throw new Error(`unexpected Lv95 witness metrics ${JSON.stringify(witnessMetrics)}`);
}
level.parMoves = witnessMetrics.actions;

const handleIds = Array.from({ length: 9 }, (_value, index) => b(`b1-${String(index + 1).padStart(2, "0")}`).id);
const handleRoute = route.slice(8, 25);
const coreGroups = [{
  id: "opening-nine-single-sealed-spine",
  stage_key: "opening",
  block_ids: handleIds,
  floor: 8,
  proof_method: "infinite_parking_relaxation",
  interchangeable_block_id_groups: [handleIds.slice(1)],
  route: handleRoute,
}];
const entry = {
  level_id: "Lv095",
  search_attempt: "crafted-nine-single-sealed-spine-with-key-lock-gallery",
  target: structuredClone(target),
  level,
  route,
  routeSemantics: "fully_assembled_runtime",
  witness_metrics: witnessMetrics,
  core_groups: coreGroups,
};

const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const artifact = {
  schema_version: "blockout-video-parity-lv95-single-handle-candidate-v1",
  prototype_only: true,
  applied_to_live_campaign: false,
  source: {
    path: inputRelative,
    sha256: sha256(inputText),
    contract: { path: contractRelative, sha256: sha256(contractText) },
  },
  contract_scalars: {
    rows: 11,
    cols: 8,
    playable_cell_count: 64,
    block_count: 30,
    occupied_cell_count: 41,
    shape_histogram: target.full_level_shape_histogram,
    opening_color_count: 6,
    full_color_count: 7,
    ordinary_exit_count: 12,
    frozen_values: [9, 14],
    cover_values: [17],
    key_count: 2,
    lock_count: 2,
    required_reposition_floor: 8,
  },
  board_mask: mask,
  levels: [entry],
};
const witnesses = [{
  level_id: "Lv095",
  drags: route,
  metrics: witnessMetrics,
  source_attempt: entry.search_attempt,
}];
const corePlans = [{
  level_id: "Lv095",
  source: "crafted sealed SINGLE spine; verifier independently rebuilds its relaxed opening core",
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
  core_floor_sum: 8,
  shape_histogram: histogram(level.blocks),
}, null, 2));
