import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Prototype-only Lv75 construction. Six opening SINGLE blocks plus one V2 form
// a sealed west spine (floor six), while two opening H2 blocks form a disjoint
// pocket handle (floor one). The staged-frame gallery reuses the same twelve
// cells as the authoritative five-piece front cohort and preserves the exact
// competitor composition.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index < 0 ? fallback : args[index + 1];
};
const inputRelative = option(
  "--input",
  ".codex-temp/video-parity-v6-lv75-baseline-r33/runtime.generated.ts",
);
const contractRelative = option(
  "--contract",
  "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v6.json",
);
const outputDirRelative = option(
  "--output-dir",
  ".codex-temp/video-parity-v6-lv75-dual-handle-candidate",
);

const inputPath = resolve(root, inputRelative);
const contractPath = resolve(root, contractRelative);
const [inputText, contractText] = await Promise.all([
  readFile(inputPath, "utf8"),
  readFile(contractPath, "utf8"),
]);
const contract = JSON.parse(contractText);
const target = contract.levels.find((entry) => entry.level_id === "Lv075")?.our_design_target;
if (!target) throw new Error("Lv75 is missing from the active design contract");

const bundle = await build({
  stdin: {
    contents: `
      export { VIDEO_PARITY_LEVELS as levels } from ${JSON.stringify(inputPath)};
      export { PuzzleModel, validateLevel } from ${JSON.stringify(resolve(root, "src/core/PuzzleModel.ts"))};
    `,
    resolveDir: root,
    sourcefile: "lv75-dual-handle-candidate-runtime.ts",
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
const source = runtime.levels.find((level) => level.id === 75);
if (!source) throw new Error("Lv75 is missing from the input runtime");

// Kept explicit so the candidate can be validated in isolation while another
// proof process has the shared contract pinned. It is copied into Lv075's
// contract target only after that process releases the file.
const mask = [
  "#......",
  "#...#..",
  "#.###..",
  "#.#####",
  "#.#####",
  "#.#####",
  "#######",
  "#######",
  "#######",
  "#.##...",
  "#######",
];
const playable = mask.flatMap((row, y) => [...row].flatMap((cell, x) => (
  cell === "#" ? [[x, y]] : []
)));
if (source.width !== 7 || source.height !== 11 || playable.length !== 56
  || source.blocks.length !== 24 || source.gates.length !== 10) {
  throw new Error("Lv75 source no longer matches the expected competitor scalar contract");
}

const shapeKind = (block) => {
  const points = block.shape;
  const xs = new Set(points.map((point) => point[0]));
  const ys = new Set(points.map((point) => point[1]));
  if (points.length === 1) return "SINGLE";
  if (points.length === 2 && ys.size === 1) return "H2";
  if (points.length === 2 && xs.size === 1) return "V2";
  if (points.length === 3 && ys.size === 1) return "H3";
  if (points.length === 4 && xs.size === 2 && ys.size === 2) return "SQ2";
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
const expectedHistogram = { H2: 4, H3: 4, L3: 4, SINGLE: 7, SQ2: 2, V2: 3 };
if (JSON.stringify(histogram(source.blocks)) !== JSON.stringify(expectedHistogram)) {
  throw new Error(`unexpected Lv75 inventory ${JSON.stringify(histogram(source.blocks))}`);
}

const clearRules = (block, preserveStage = false) => {
  delete block.frozen;
  if (!preserveStage) delete block.shutterId;
  delete block.movementAxis;
  delete block.keyId;
  delete block.lockedBy;
  delete block.lockCount;
  delete block.star;
  delete block.layers;
};
const assign = (block, x, y, shape, color, preserveStage = false) => {
  block.x = x;
  block.y = y;
  block.shape = shape.map((point) => [...point]);
  block.color = color;
  clearRules(block, preserveStage);
};
const applyDrag = (model, drag, label = "route") => {
  model.beginAction();
  for (const [x, y] of drag.path ?? []) {
    if (!model.moveBlockStep(drag.blockId, x, y)) {
      throw new Error(`${label} move failed for ${drag.blockId} at ${x},${y}`);
    }
  }
  if (drag.exitSide) {
    const result = model.tryExit(drag.blockId, drag.exitSide);
    if (!result.ok) throw new Error(`${label} exit failed for ${drag.blockId} on ${drag.exitSide}`);
  }
  if (!model.commitAction(true)) throw new Error(`${label} commit failed for ${drag.blockId}`);
};
const replay = (level, drags) => {
  const model = new runtime.PuzzleModel(level);
  let repositions = 0;
  let clearLayers = 0;
  for (const [index, drag] of drags.entries()) {
    applyDrag(model, drag, `route action ${index + 1}`);
    if (drag.exitSide) clearLayers += 1;
    else repositions += 1;
  }
  const snapshot = model.snapshot();
  if (!snapshot.complete) throw new Error(`route ended incomplete with ${snapshot.blocks.length} blocks`);
  return { repositions, actions: drags.length, clear_layers: clearLayers };
};

const level = structuredClone(source);
level.name = `${source.name} sealed spine, H2 pocket, and staged gallery`;
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

const [A, B, C, D, E, F] = target.design_palette;
if (new Set([A, B, C, D, E, F]).size !== 6) {
  throw new Error("Lv75 requires six unique colours");
}
const blocks = new Map(level.blocks.map((block) => [block.id, block]));
const b = (id) => {
  const block = blocks.get(id);
  if (!block) throw new Error(`missing Lv75 block ${id}`);
  return block;
};
const SINGLE = [[0, 0]];
const H2 = [[0, 0], [1, 0]];
const V2 = [[0, 0], [0, 1]];
const H3 = [[0, 0], [1, 0], [2, 0]];
const SQ2 = [[0, 0], [1, 0], [0, 1], [1, 1]];
const L3_LEFT = [[0, 0], [1, 0], [0, 1]];
const L3_RIGHT = [[0, 0], [1, 0], [1, 1]];

// Mixed west-spine core: an A terminal above five B SINGLE blockers and one B
// V2 blocker. Every blocker must be parked before the terminal can leave.
const coreSingles = [
  "strategy-guard-s1-01",
  "cc-piece-s1-02",
  "cc-piece-s1-03",
  "strategy-guard-s1-04",
  "cc-piece-s1-05",
  "cc-piece-s1-06",
];
coreSingles.forEach((id, index) => assign(b(id), 0, index, SINGLE, index === 0 ? A : B));

// The authoritative Lv75 frame front is SINGLE x1 + H2 x1 + H3 x3. It tiles
// the 3x4 frame exactly, so no unrelated opening block occupies its rectangle.
assign(b("cc-piece-s1-07"), 2, 5, SINGLE, F);
assign(b("strategy-guard-s1-13"), 3, 5, H2, F);
assign(b("cc-piece-s1-08"), 2, 2, H3, F);
b("cc-piece-s1-08").layers = [F, E];
assign(b("cc-piece-s1-10"), 2, 3, H3, F);
b("cc-piece-s1-10").layers = [F, E];
assign(b("strategy-guard-s1-12"), 2, 4, H3, F);

// Two-H2 core: D must enter the one-row pocket before C can cross row ten.
assign(b("cc-piece-s1-09"), 0, 10, H2, C);
assign(b("cc-piece-s1-11"), 2, 10, H2, D);

// The V2 at the foot of the west spine is its sixth mandatory blocker.
assign(b("strategy-guard-s1-14"), 0, 6, V2, B);
assign(b("cc-piece-s1-17"), 1, 6, V2, E);

// Remaining opening inventory tiles the lower gallery without entering frame.
assign(b("cc-piece-s1-15"), 2, 6, SQ2, F);
assign(b("cc-piece-s1-18"), 4, 6, L3_LEFT, F);
assign(b("strategy-guard-s1-20"), 5, 7, L3_RIGHT, F);
assign(b("cc-piece-s1-16"), 0, 8, H3, F);
assign(b("cc-piece-s1-19"), 3, 8, H2, F);

const shutter = level.shutters?.find((item) => item.id === "vp-075-staged-frame-1");
if (!shutter || level.shutters.length !== 1) throw new Error("Lv75 staged frame changed unexpectedly");
const triggerIds = [
  "cc-piece-s1-07",
  "strategy-guard-s1-13",
  "cc-piece-s1-08",
  "cc-piece-s1-10",
  "strategy-guard-s1-12",
];
Object.assign(shutter, {
  x: 2,
  y: 2,
  width: 3,
  height: 4,
  count: triggerIds.length,
  skin: "staged-frame",
  triggerBlockIds: triggerIds,
});

// Hidden V2/SQ2/L3/L3 batch tiles those same twelve cells exactly.
assign(b("cc-piece-s2-01"), 2, 2, SQ2, F, true);
assign(b("cc-piece-s2-02"), 4, 2, V2, F, true);
assign(b("cc-piece-s2-03"), 2, 4, [[0, 0], [0, 1], [1, 1]], F, true);
assign(b("cc-piece-s2-04"), 3, 4, L3_RIGHT, F, true);

// Exact gate multiset: one ordinary plus frozen [1,2,3,11x6].
const gateSpecs = [
  { side: "right", offset: 6, size: 3, color: F },
  { side: "left", offset: 7, size: 2, color: E, frozen: 1 },
  { side: "right", offset: 10, size: 1, color: C, frozen: 2 },
  { side: "left", offset: 10, size: 1, color: D, frozen: 3 },
  { side: "bottom", offset: 0, size: 1, color: A, frozen: 11 },
  { side: "top", offset: 0, size: 1, color: B, frozen: 11 },
  { side: "bottom", offset: 2, size: 3, color: F, frozen: 11 },
  { side: "left", offset: 3, size: 3, color: F, frozen: 11 },
  { side: "right", offset: 3, size: 3, color: F, frozen: 11 },
  { side: "bottom", offset: 5, size: 2, color: F, frozen: 11 },
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

const route = [
  // Peel the lower gallery without disturbing either proof core.
  { blockId: b("strategy-guard-s1-20").id, path: [], exitSide: "right" },
  { blockId: b("cc-piece-s1-18").id, path: [[5, 6]], exitSide: "right" },
  { blockId: b("cc-piece-s1-19").id, path: [[4, 8], [5, 8]], exitSide: "right" },
  { blockId: b("cc-piece-s1-16").id, path: [[1, 8], [2, 8], [3, 8], [4, 8]], exitSide: "right" },
  { blockId: b("cc-piece-s1-15").id, path: [[3, 6], [4, 6], [5, 6]], exitSide: "right" },
];
const descend = (x, fromY, toY) => Array.from(
  { length: Math.max(0, toY - fromY) },
  (_value, index) => [x, fromY + index + 1],
);
const ascend = (x, fromY, toY) => Array.from(
  { length: Math.max(0, fromY - toY) },
  (_value, index) => [x, fromY - index - 1],
);
const horizontal = (fromX, toX, y) => Array.from(
  { length: Math.abs(toX - fromX) },
  (_value, index) => [fromX + Math.sign(toX - fromX) * (index + 1), y],
);

// H2 pocket core: one committed internal drag, followed by two direct exits.
// It must be cleared before the gallery descends through row nine.
const h2CoreStart = route.length;
route.push({ blockId: b("cc-piece-s1-11").id, path: [[2, 9]] });
route.push({ blockId: b("cc-piece-s1-09").id, path: horizontal(0, 5, 10), exitSide: "right" });
route.push({ blockId: b("cc-piece-s1-11").id, path: [[2, 10], [1, 10], [0, 10]], exitSide: "left" });
const h2CoreRoute = route.slice(h2CoreStart);

// Move the non-core V2 out of the west-spine foot, then park the core V2. These
// two actions also open the frame cohort's exit lane.
route.push(
  { blockId: b("cc-piece-s1-17").id, path: [...horizontal(1, 6, 6), [6, 5], [6, 4]] },
);
const spineV2Move = {
  blockId: b("strategy-guard-s1-14").id,
  path: [[1, 6], [2, 6], [2, 7], [2, 8]],
};
route.push(spineV2Move);

// Clear the SINGLE/H2 front row, then the three H3 trigger bodies bottom-up;
// two H3 bodies have one extra shell.
route.push(
  { blockId: b("strategy-guard-s1-13").id, path: [[3, 6], ...horizontal(3, 5, 6)], exitSide: "right" },
  { blockId: b("cc-piece-s1-07").id, path: [[2, 6], ...horizontal(2, 6, 6)], exitSide: "right" },
);
for (const [id, y, layers] of [
  ["strategy-guard-s1-12", 4, 1],
  ["cc-piece-s1-10", 3, 2],
  ["cc-piece-s1-08", 2, 2],
]) {
  route.push({
    blockId: b(id).id,
    path: [...descend(2, y, 6), ...horizontal(2, 4, 6)],
    exitSide: "right",
  });
  if (layers === 2) route.push({
    blockId: b(id).id,
    path: [[4, 7], ...horizontal(4, 0, 7)],
    exitSide: "left",
  });
}

// Newly released second batch peels down the same cleared gallery.
route.push({
  blockId: b("cc-piece-s2-03").id,
  path: [...descend(2, 4, 6), ...horizontal(2, 5, 6)],
  exitSide: "right",
});
route.push({
  blockId: b("cc-piece-s2-04").id,
  path: [...descend(3, 4, 6), ...horizontal(3, 5, 6)],
  exitSide: "right",
});
route.push({
  blockId: b("cc-piece-s2-02").id,
  path: [...descend(4, 2, 6), ...horizontal(4, 6, 6)],
  exitSide: "right",
});
route.push({
  blockId: b("cc-piece-s2-01").id,
  path: [...descend(2, 2, 6), ...horizontal(2, 5, 6)],
  exitSide: "right",
});

// Park the five SINGLE blockers deepest-first along the bottom row, clear the
// terminal, then return each blocker to the west exit lane. Together with the
// already parked V2 this is a strict floor-six relaxed core.
const singleCoreStart = route.length;
for (let y = 5; y >= 1; y -= 1) {
  const id = coreSingles[y];
  route.push({
    blockId: b(id).id,
    path: [...descend(0, y, 10), ...horizontal(0, y, 10)],
  });
}
route.push({ blockId: b(coreSingles[0]).id, path: descend(0, 0, 10), exitSide: "bottom" });
for (let x = 1; x <= 5; x += 1) {
  route.push({
    blockId: b(coreSingles[x]).id,
    path: [...horizontal(x, 0, 10), ...ascend(0, 10, 0)],
    exitSide: "top",
  });
}
route.push({
  blockId: b("strategy-guard-s1-14").id,
  path: [[2, 7], [2, 6], [1, 6], [0, 6], ...ascend(0, 6, 0)],
  exitSide: "top",
});
const singleCoreRoute = [spineV2Move, ...route.slice(singleCoreStart)];
route.push({
  blockId: b("cc-piece-s1-17").id,
  path: [[6, 5], [6, 6], [6, 7], ...horizontal(6, 0, 7)],
  exitSide: "left",
});

try {
  runtime.validateLevel(level);
} catch (error) {
  console.error(`Lv75 validateLevel failed: ${error.message}`);
  process.exit(1);
}
let witnessMetrics;
try {
  witnessMetrics = replay(level, route);
} catch (error) {
  console.error(`Lv75 route replay failed: ${error.message}`);
  process.exit(1);
}
if (witnessMetrics.repositions !== 8 || witnessMetrics.actions !== 34 || witnessMetrics.clear_layers !== 26) {
  throw new Error(`unexpected Lv75 witness metrics ${JSON.stringify(witnessMetrics)}`);
}
level.parMoves = witnessMetrics.actions;

const h2Ids = [b("cc-piece-s1-09").id, b("cc-piece-s1-11").id];
const coreGroups = [
  {
      id: "opening-west-six-single-plus-v2-spine",
      stage_key: "opening",
      block_ids: [...coreSingles, b("strategy-guard-s1-14").id],
      floor: 6,
      proof_method: "infinite_parking_relaxation",
      interchangeable_block_id_groups: [coreSingles.slice(1)],
      route: singleCoreRoute,
  },
  {
    id: "opening-two-h2-pocket",
    stage_key: "opening",
    block_ids: h2Ids,
    floor: 1,
    proof_method: "infinite_parking_relaxation",
    route: h2CoreRoute,
  },
];
const entry = {
  level_id: "Lv075",
  search_attempt: "crafted-authoritative-five-piece-frame-plus-three-disjoint-floor-cores",
  target: structuredClone(target),
  level,
  route,
  routeSemantics: "fully_assembled_runtime",
  witness_metrics: witnessMetrics,
  core_groups: coreGroups,
};

const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const artifact = {
  schema_version: "blockout-video-parity-lv75-dual-handle-candidate-v1",
  prototype_only: true,
  applied_to_live_campaign: false,
  source: {
    path: inputRelative,
    sha256: sha256(inputText),
    contract: { path: contractRelative, sha256: sha256(contractText) },
  },
  contract_scalars: {
    rows: 11,
    cols: 7,
    playable_cell_count: 56,
    block_count: 24,
    occupied_cell_count: 53,
    shape_histogram: target.full_level_shape_histogram,
    opening_piece_count: 20,
    opening_shape_histogram: target.stage_partitions[0].shape_histogram,
    opening_color_count: 6,
    full_color_count: 6,
    ordinary_exit_count: 1,
    frozen_values: [1, 2, 3, 11, 11, 11, 11, 11, 11],
    staged_frame_count: 1,
    hidden_batch_count: 4,
    hidden_shape_histogram: target.stage_partitions[1].shape_histogram,
    shell_count: 2,
    shell_extra_layers: [1, 1],
    required_reposition_floor: 7,
  },
  board_mask: mask,
  board_mask_override_pending_contract_update: {
    level_id: "Lv075",
    active_contract_mask: target.board.playable_mask,
    proposed_mask: mask,
    status: JSON.stringify(target.board.playable_mask) === JSON.stringify(mask)
      ? "applied"
      : "pending_contract_update",
  },
  levels: [entry],
};
const witnesses = [{
  level_id: "Lv075",
  drags: route,
  metrics: witnessMetrics,
  source_attempt: entry.search_attempt,
}];
const corePlans = [{
  level_id: "Lv075",
  source: "authoritative five-piece frame plus disjoint mixed-spine/H2 relaxed cores",
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
