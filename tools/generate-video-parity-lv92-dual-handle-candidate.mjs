import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Prototype-only Lv92 construction. The seven-SINGLE west spine forces six
// pieces into its lower gallery before its terminal can reach the bottom exit.
// The eight-H2 east spine independently forces seven pieces into the lower
// gallery before its terminal can reach the right exit. The two relaxed cores
// therefore contribute a sound 6 + 7 necessary-reposition lower bound while
// retaining the competitor's exact opening/hidden inventories and mechanisms.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index < 0 ? fallback : args[index + 1];
};
const inputRelative = option(
  "--input",
  ".codex-temp/video-parity-v6-lv92-baseline-r32/runtime.generated.ts",
);
const contractRelative = option(
  "--contract",
  "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v6.json",
);
const outputDirRelative = option(
  "--output-dir",
  ".codex-temp/video-parity-v6-lv92-dual-handle-candidate",
);

const inputPath = resolve(root, inputRelative);
const contractPath = resolve(root, contractRelative);
const [inputText, contractText] = await Promise.all([
  readFile(inputPath, "utf8"),
  readFile(contractPath, "utf8"),
]);
const contract = JSON.parse(contractText);
const target = contract.levels.find((entry) => entry.level_id === "Lv092")?.our_design_target;
if (!target) throw new Error("Lv92 is missing from the active design contract");

const bundle = await build({
  stdin: {
    contents: `
      export { VIDEO_PARITY_LEVELS as levels } from ${JSON.stringify(inputPath)};
      export { PuzzleModel, validateLevel } from ${JSON.stringify(resolve(root, "src/core/PuzzleModel.ts"))};
    `,
    resolveDir: root,
    sourcefile: "lv92-dual-handle-candidate-runtime.ts",
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
const source = runtime.levels.find((level) => level.id === 92);
if (!source) throw new Error("Lv92 is missing from the input runtime");

const mask = target.board.playable_mask;
const playable = mask.flatMap((row, y) => [...row].flatMap((cell, x) => (
  cell === "#" ? [[x, y]] : []
)));
if (source.width !== 7 || source.height !== 12 || playable.length !== 70
  || source.blocks.length !== 29 || source.gates.length !== 11) {
  throw new Error("Lv92 source no longer matches the expected competitor scalar contract");
}

const shapeKind = (block) => {
  const points = block.shape;
  const xs = new Set(points.map((point) => point[0]));
  const ys = new Set(points.map((point) => point[1]));
  if (points.length === 1) return "SINGLE";
  if (points.length === 2 && ys.size === 1) return "H2";
  if (points.length === 2 && xs.size === 1) return "V2";
  if (points.length === 3 && ys.size === 1) return "H3";
  if (points.length === 3 && xs.size === 1) return "V3";
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
const expectedHistogram = { H2: 11, H3: 2, L3: 3, SINGLE: 9, SQ2: 2, V2: 1, V3: 1 };
if (JSON.stringify(histogram(source.blocks)) !== JSON.stringify(expectedHistogram)) {
  throw new Error(`unexpected Lv92 inventory ${JSON.stringify(histogram(source.blocks))}`);
}

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
level.name = `${source.name} dual sealed spines and cover gallery`;
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
  throw new Error("Lv92 requires six unique colours");
}
const blocks = new Map(level.blocks.map((block) => [block.id, block]));
const b = (id) => {
  const block = blocks.get(`cc-092-${id}`);
  if (!block) throw new Error(`missing Lv92 block cc-092-${id}`);
  return block;
};
const SINGLE = [[0, 0]];
const H2 = [[0, 0], [1, 0]];
const V2 = [[0, 0], [0, 1]];
const H3 = [[0, 0], [1, 0], [2, 0]];
const V3 = [[0, 0], [0, 1], [0, 2]];
const SQ2 = [[0, 0], [1, 0], [0, 1], [1, 1]];
const L3_RIGHT = [[0, 0], [1, 0], [0, 1]];
const L3_LEFT = [[1, 0], [0, 1], [1, 1]];

// West SINGLE handle: A terminal, then six B blockers.
assign(b("b1-01"), 0, 0, SINGLE, A);
for (let y = 1; y <= 6; y += 1) {
  assign(b(`b1-${String(y + 1).padStart(2, "0")}`), 0, y, SINGLE, B);
}

// East H2 handle: C terminal, then seven D blockers.
assign(b("b1-08"), 5, 0, H2, C);
for (let y = 1; y <= 7; y += 1) {
  assign(b(`b1-${String(y + 8).padStart(2, "0")}`), 5, y, H2, D);
}

// The one opening H3 shell consumes two clear layers and opens the 17-count
// cover only after every opening body/layer is cleared.
assign(b("b1-16"), 2, 8, H3, E);
b("b1-16").layers = [E, A];

const cover = level.shutters?.find((item) => item.id === "vp-092-cover-1");
if (!cover || level.shutters.length !== 1) throw new Error("Lv92 cover changed unexpectedly");
Object.assign(cover, { x: 3, y: 6, width: 1, height: 1, count: 17, skin: "shutter" });

// Exact 13-piece hidden inventory. It is packed without overlap and peels
// into the lower-right three-cell exit after the opening cohort is gone.
assign(b("b2-01"), 4, 11, H2, F, true);
assign(b("b2-02"), 4, 9, SQ2, F, true);
assign(b("b2-03"), 4, 8, H2, F, true);
assign(b("b2-04"), 4, 7, SINGLE, F, true);
assign(b("b2-05"), 0, 6, H3, F, true);
assign(b("b2-06"), 5, 4, SQ2, F, true);
assign(b("b2-07"), 5, 7, H2, F, true);
assign(b("b2-08"), 6, 8, V3, F, true);
assign(b("b2-09"), 3, 4, V2, F, true);
assign(b("b2-10"), 2, 8, L3_LEFT, F, true);
assign(b("b2-11"), 3, 10, SINGLE, F, true);
assign(b("b2-12"), 2, 7, L3_RIGHT, F, true);
assign(b("b2-13"), 2, 1, L3_LEFT, F, true);

// Descriptor order must remain: three ordinary, then frozen
// [9,13,4,11,10,10,10,10]. The runtime assembler preserves this exact
// colour/geometry mapping and may only permute thaw values among frozen mouths.
const gateSpecs = [
  { side: "bottom", offset: 0, size: 1, color: A },
  { side: "top", offset: 0, size: 1, color: B },
  { side: "right", offset: 7, size: 1, color: C },
  { side: "top", offset: 5, size: 2, color: D, frozen: 9 },
  { side: "left", offset: 9, size: 3, color: F, frozen: 13 },
  { side: "left", offset: 8, size: 1, color: E, frozen: 4 },
  { side: "right", offset: 8, size: 1, color: A, frozen: 11 },
  { side: "left", offset: 4, size: 3, color: F, frozen: 10 },
  { side: "right", offset: 9, size: 3, color: F, frozen: 10 },
  { side: "top", offset: 2, size: 1, color: F, frozen: 10 },
  { side: "right", offset: 0, size: 3, color: F, frozen: 10 },
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

// Park six SINGLE blockers deepest-first along the bottom gallery.
for (let y = 6; y >= 1; y -= 1) {
  route.push({
    blockId: b(`b1-${String(y + 1).padStart(2, "0")}`).id,
    path: [...descend(0, y, 11), ...horizontal(0, y, 11)],
  });
}
route.push({ blockId: b("b1-01").id, path: descend(0, 0, 11), exitSide: "bottom" });
for (let x = 1; x <= 6; x += 1) {
  route.push({
    blockId: b(`b1-${String(x + 1).padStart(2, "0")}`).id,
    path: [...horizontal(x, 0, 11), ...ascend(0, 11, 0)],
    exitSide: "top",
  });
}
const singleCoreRoute = route.slice();

// Park seven H2 blockers in three lower rows, then clear their terminal.
const h2RouteStart = route.length;
const h2Parking = [
  { y: 7, destinationX: 0, destinationY: 11 },
  { y: 6, destinationX: 2, destinationY: 11 },
  { y: 5, destinationX: 4, destinationY: 11 },
  { y: 4, destinationX: 0, destinationY: 10 },
  { y: 3, destinationX: 2, destinationY: 10 },
  { y: 2, destinationX: 4, destinationY: 10 },
  { y: 1, destinationX: 0, destinationY: 9 },
];
for (const parking of h2Parking) {
  route.push({
    blockId: b(`b1-${String(parking.y + 8).padStart(2, "0")}`).id,
    path: [
      ...descend(5, parking.y, parking.destinationY),
      ...horizontal(5, parking.destinationX, parking.destinationY),
    ],
  });
}
route.push({ blockId: b("b1-08").id, path: descend(5, 0, 7), exitSide: "right" });
const h2PrefixRoute = route.slice(h2RouteStart);

// Eight prior clears leave the frozen(9) blocker mouth one pulse short. Clear
// the already-thawed outer H3 layer now; this is not part of either floor core.
route.push({
  blockId: b("b1-16").id,
  path: horizontal(2, 0, 8),
  exitSide: "left",
});

const h2ClearOrder = [
  { id: "b1-09", x: 0, y: 9 },
  { id: "b1-10", x: 4, y: 10 },
  { id: "b1-11", x: 2, y: 10 },
  { id: "b1-12", x: 0, y: 10 },
  { id: "b1-13", x: 4, y: 11 },
  { id: "b1-14", x: 2, y: 11 },
  { id: "b1-15", x: 0, y: 11 },
];
const h2ClearStart = route.length;
for (const item of h2ClearOrder) {
  route.push({
    blockId: b(item.id).id,
    path: [...horizontal(item.x, 5, item.y), ...ascend(5, item.y, 0)],
    exitSide: "top",
  });
}
const h2CoreRoute = [...h2PrefixRoute, ...route.slice(h2ClearStart)];

// The second H3 layer is now fully thawed and uses the adjacent right mouth.
route.push({
  blockId: b("b1-16").id,
  path: horizontal(0, 4, 8),
  exitSide: "right",
});

// Find collision-free one-action exits for the revealed hidden batch. The
// planner moves one selected block at a time while every other block remains
// fixed; therefore each emitted grid step is a directly replayable player drag.
const planningModel = new runtime.PuzzleModel(level);
for (const [index, drag] of route.entries()) applyDrag(planningModel, drag, `opening action ${index + 1}`);
const bfsPath = (model, blockId, goalX, goalY) => {
  const block = model.getBlock(blockId);
  if (!block) return null;
  const startKey = `${block.x},${block.y}`;
  const goalKey = `${goalX},${goalY}`;
  const queue = [[block.x, block.y]];
  const previous = new Map([[startKey, null]]);
  for (let head = 0; head < queue.length; head += 1) {
    const [x, y] = queue[head];
    if (`${x},${y}` === goalKey) {
      const reversed = [];
      let key = goalKey;
      while (key !== startKey) {
        const [px, py] = key.split(",").map(Number);
        reversed.push([px, py]);
        key = previous.get(key);
      }
      return reversed.reverse();
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      const key = `${nx},${ny}`;
      if (previous.has(key) || !model.canPlace(block, nx, ny)) continue;
      previous.set(key, `${x},${y}`);
      queue.push([nx, ny]);
    }
  }
  return null;
};
const hiddenIds = Array.from({ length: 13 }, (_value, index) => (
  b(`b2-${String(index + 1).padStart(2, "0")}`).id
));
const remainingHidden = new Set(hiddenIds);
while (remainingHidden.size) {
  let selected = null;
  for (const blockId of remainingHidden) {
    const block = planningModel.getBlock(blockId);
    if (!block || !planningModel.isBlockActive(block)) continue;
    const maxDx = Math.max(...block.shape.map(([dx]) => dx));
    const maxDy = Math.max(...block.shape.map(([, dy]) => dy));
    const goalX = level.width - 1 - maxDx;
    for (let goalY = 9; goalY <= 11 - maxDy; goalY += 1) {
      const path = bfsPath(planningModel, blockId, goalX, goalY);
      if (!path) continue;
      if (!selected || path.length < selected.path.length
        || (path.length === selected.path.length && blockId.localeCompare(selected.blockId) < 0)) {
        selected = { blockId, path };
      }
    }
  }
  if (!selected) {
    throw new Error(`hidden gallery has no right-exit peel with ${remainingHidden.size} blocks left`);
  }
  const drag = { ...selected, exitSide: "right" };
  applyDrag(planningModel, drag, `hidden peel ${route.length + 1}`);
  route.push(drag);
  remainingHidden.delete(selected.blockId);
}

try {
  runtime.validateLevel(level);
} catch (error) {
  console.error(`Lv92 validateLevel failed: ${error.message}`);
  process.exit(1);
}
let witnessMetrics;
try {
  witnessMetrics = replay(level, route);
} catch (error) {
  console.error(`Lv92 route replay failed: ${error.message}`);
  process.exit(1);
}
if (witnessMetrics.repositions !== 13 || witnessMetrics.actions !== 43 || witnessMetrics.clear_layers !== 30) {
  throw new Error(`unexpected Lv92 witness metrics ${JSON.stringify(witnessMetrics)}`);
}
level.parMoves = witnessMetrics.actions;

const singleIds = Array.from({ length: 7 }, (_value, index) => b(`b1-${String(index + 1).padStart(2, "0")}`).id);
const h2Ids = Array.from({ length: 8 }, (_value, index) => b(`b1-${String(index + 8).padStart(2, "0")}`).id);
const coreGroups = [
  {
    id: "opening-west-seven-single-spine",
    stage_key: "opening",
    block_ids: singleIds,
    floor: 6,
    proof_method: "infinite_parking_relaxation",
    interchangeable_block_id_groups: [singleIds.slice(1)],
    route: singleCoreRoute,
  },
  {
    id: "opening-east-eight-h2-spine",
    stage_key: "opening",
    block_ids: h2Ids,
    floor: 7,
    proof_method: "infinite_parking_relaxation",
    interchangeable_block_id_groups: [h2Ids.slice(1)],
    route: h2CoreRoute,
  },
];
const entry = {
  level_id: "Lv092",
  search_attempt: "crafted-dual-sealed-single-and-h2-spines-with-cover-gallery",
  target: structuredClone(target),
  level,
  route,
  routeSemantics: "fully_assembled_runtime",
  witness_metrics: witnessMetrics,
  core_groups: coreGroups,
};

const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const artifact = {
  schema_version: "blockout-video-parity-lv92-dual-handle-candidate-v1",
  prototype_only: true,
  applied_to_live_campaign: false,
  source: {
    path: inputRelative,
    sha256: sha256(inputText),
    contract: { path: contractRelative, sha256: sha256(contractText) },
  },
  contract_scalars: {
    rows: 12,
    cols: 7,
    playable_cell_count: 70,
    block_count: 29,
    occupied_cell_count: 59,
    shape_histogram: target.full_level_shape_histogram,
    opening_piece_count: 16,
    opening_shape_histogram: target.stage_partitions[0].shape_histogram,
    opening_color_count: 5,
    full_color_count: 6,
    ordinary_exit_count: 3,
    frozen_values: [9, 13, 4, 11, 10, 10, 10, 10],
    cover_values: [17],
    hidden_batch_count: 13,
    shell_count: 1,
    shell_extra_layers: [1],
    required_reposition_floor: 13,
  },
  board_mask: mask,
  levels: [entry],
};
const witnesses = [{
  level_id: "Lv092",
  drags: route,
  metrics: witnessMetrics,
  source_attempt: entry.search_attempt,
}];
const corePlans = [{
  level_id: "Lv092",
  source: "crafted disjoint SINGLE/H2 sealed spines; verifier independently rebuilds each relaxed core",
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
