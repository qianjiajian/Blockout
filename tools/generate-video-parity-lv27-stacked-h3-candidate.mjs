import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Prototype-only Lv27 construction. Nine opening singles fill a one-cell-wide
// opposed-colour handle. The countdown cover then reveals four H3 opposition
// pairs plus one ordinary-gate starter. The asymmetric top/right frozen exits
// turn the dense H3 room itself into a four-reposition relaxed core.
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
  ".codex-temp/video-parity-v6-lv27-stacked-h3-candidate",
);

const inputPath = resolve(root, inputRelative);
const contractPath = resolve(root, contractRelative);
const [inputText, contractText] = await Promise.all([
  readFile(inputPath, "utf8"),
  readFile(contractPath, "utf8"),
]);
const contract = JSON.parse(contractText);
const target = contract.levels.find((entry) => entry.level_id === "Lv027")?.our_design_target;
if (!target) throw new Error("Lv27 is missing from the active design contract");

const bundle = await build({
  stdin: {
    contents: `
      export { VIDEO_PARITY_LEVELS as levels } from ${JSON.stringify(inputPath)};
      export { PuzzleModel, validateLevel } from ${JSON.stringify(resolve(root, "src/core/PuzzleModel.ts"))};
    `,
    resolveDir: root,
    sourcefile: "lv27-stacked-h3-candidate-runtime.ts",
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
const source = runtime.levels.find((level) => level.id === 27);
if (!source) throw new Error("Lv27 is missing from the input runtime");

const mask = target.board.playable_mask;
const playable = mask.flatMap((row, y) => [...row].flatMap((cell, x) => (
  cell === "#" ? [[x, y]] : []
)));
if (source.width !== 6 || source.height !== 9 || playable.length !== 36
  || source.blocks.length !== 18 || source.gates.length !== 5) {
  throw new Error("Lv27 source no longer matches the expected competitor scalar contract");
}
const shapeKind = (block) => {
  if (block.shape.length === 1) return "SINGLE";
  if (block.shape.length === 3
    && block.shape.every((point) => point[1] === block.shape[0][1])) return "H3";
  return `OTHER_${block.shape.length}`;
};
const histogram = (blocks) => Object.fromEntries(
  [...blocks.reduce((map, block) => {
    const kind = shapeKind(block);
    map.set(kind, (map.get(kind) ?? 0) + 1);
    return map;
  }, new Map())].sort(([left], [right]) => left.localeCompare(right)),
);
if (JSON.stringify(histogram(source.blocks)) !== JSON.stringify({ H3: 9, SINGLE: 9 })) {
  throw new Error(`unexpected Lv27 inventory ${JSON.stringify(histogram(source.blocks))}`);
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
const clearBlockRules = (block, preserveCover = false) => {
  delete block.frozen;
  if (!preserveCover) delete block.shutterId;
  delete block.movementAxis;
  delete block.keyId;
  delete block.lockedBy;
  delete block.lockCount;
  delete block.star;
};
const assign = (block, x, y, shape, color, preserveCover = false) => {
  block.x = x;
  block.y = y;
  block.shape = shape.map((point) => [...point]);
  block.color = color;
  block.layers = [color];
  clearBlockRules(block, preserveCover);
};

const level = structuredClone(source);
level.name = `${source.name} stacked H3 handle`;
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

const palette = [...new Set(source.blocks.flatMap((block) => block.layers ?? [block.color]))].sort();
if (palette.length !== 5) throw new Error(`expected five colours, received ${palette.length}`);
const [a, b, c, d, e] = palette;
const covers = [...(level.shutters ?? [])];
if (covers.length !== 1 || covers[0].count !== 9) {
  throw new Error("Lv27 countdown cover changed unexpectedly");
}
const cover = covers[0];
Object.assign(cover, { x: 0, y: 0, width: 1, height: 1, count: 9, skin: "shutter" });

const opening = level.blocks.filter((block) => !block.shutterId)
  .sort((left, right) => left.id.localeCompare(right.id));
const hidden = level.blocks.filter((block) => block.shutterId === cover.id)
  .sort((left, right) => left.id.localeCompare(right.id));
if (JSON.stringify(histogram(opening)) !== JSON.stringify({ SINGLE: 9 })
  || JSON.stringify(histogram(hidden)) !== JSON.stringify({ H3: 9 })) {
  throw new Error("Lv27 stage partitions changed unexpectedly");
}

// One-cell-wide opening path. The right exit is at P8; the five cells beyond
// it are parking cells rather than another route to an edge.
const spine = [
  [0, 8], [1, 8], [2, 8], [2, 7], [3, 7],
  [4, 7], [5, 7], [5, 6], [5, 5],
];
const parking = [[5, 4], [5, 3], [4, 3], [3, 3], [2, 3]];
if (![...spine, ...parking].every((point) => mask[point[1]][point[0]] === "#")) {
  throw new Error("invalid Lv27 opening handle geometry");
}
const pathBetween = (from, to) => {
  const direction = Math.sign(to - from);
  if (!direction) return [];
  const result = [];
  for (let index = from + direction; index !== to + direction; index += direction) {
    result.push([...spine[index]]);
  }
  return result;
};
for (let position = 0; position < opening.length; position += 1) {
  assign(opening[position], ...spine[position], [[0, 0]], position < 4 ? a : b);
}

const H3 = [[0, 0], [1, 0], [2, 0]];
const p0 = hidden[0];
const p1 = hidden[1];
const p2 = hidden[2];
const p3 = hidden[3];
const p4 = hidden[4];
const p5 = hidden[5];
const p6 = hidden[6];
const p7 = hidden[7];
const starter = hidden[8];
assign(p0, 0, 0, H3, d, true);
assign(p1, 3, 0, H3, c, true);
assign(p2, 0, 1, H3, e, true);
assign(p3, 3, 1, H3, c, true);
assign(p4, 0, 2, H3, d, true);
assign(p5, 3, 2, H3, c, true);
assign(p6, 0, 3, H3, e, true);
assign(p7, 3, 3, H3, d, true);
assign(starter, 0, 8, H3, b, true);

// Keep this ordering aligned with the contract descriptor order: two ordinary
// exits, then frozen values [13, 13, 10].
const gateSpecs = [
  { side: "left", offset: 8, size: 1, color: b },
  { side: "right", offset: 5, size: 1, color: a },
  { side: "top", offset: 3, size: 3, color: d, frozen: 13 },
  { side: "right", offset: 0, size: 4, color: e, frozen: 13 },
  { side: "top", offset: 0, size: 3, color: c, frozen: 10 },
];
level.gates.forEach((gate, index) => {
  Object.assign(gate, gateSpecs[index]);
  if (gateSpecs[index].frozen === undefined) delete gate.frozen;
  delete gate.star;
});
level.designTargets = {
  formulaVersion: "blockout-d1",
  calibratedDifficulty: target.target_d1_difficulty.calibrated_score,
  minimumRepositionOverhead: 9,
};

const route = [];
// Park B blocks beyond the far exit, deepest first.
for (let position = 8; position >= 4; position -= 1) {
  const parkingIndex = position - 4;
  route.push({
    blockId: opening[position].id,
    path: [...pathBetween(position, 8), ...parking.slice(0, parkingIndex + 1)],
  });
}
// A blocks now have a direct route to their gate.
for (let position = 3; position >= 0; position -= 1) {
  route.push({ blockId: opening[position].id, path: pathBetween(position, 8), exitSide: "right" });
}
// Retrieve parked B blocks from the nearest parking cell outward.
for (let parkingIndex = 0; parkingIndex < parking.length; parkingIndex += 1) {
  route.push({
    blockId: opening[parkingIndex + 4].id,
    path: [
      ...parking.slice(0, parkingIndex).reverse(),
      [...spine[8]],
      ...pathBetween(8, 0),
    ],
    exitSide: "left",
  });
}

// The ordinary starter reaches ten clears and opens the C gate.
route.push({ blockId: starter.id, path: [], exitSide: "left" });
// Five staging moves expose the three C pieces in frozen-gate order. Once
// their clears reach thirteen, every parked D/E piece has a direct exit.
route.push({ blockId: p7.id, path: [[3, 4]] });
route.push({ blockId: p6.id, path: [[1, 3], [2, 3], [3, 3]] });
route.push({ blockId: p4.id, path: [[0, 3]] });
route.push({ blockId: p2.id, path: [[0, 2]] });
route.push({ blockId: p0.id, path: [[0, 1]] });
route.push({ blockId: p1.id, path: [[2, 0], [1, 0], [0, 0]], exitSide: "top" });
route.push({ blockId: p3.id, path: [[3, 0], [2, 0], [1, 0], [0, 0]], exitSide: "top" });
route.push({ blockId: p5.id, path: [[3, 1], [3, 0], [2, 0], [1, 0], [0, 0]], exitSide: "top" });
route.push({ blockId: p6.id, path: [], exitSide: "right" });
route.push({ blockId: p2.id, path: [[1, 2], [2, 2], [3, 2]], exitSide: "right" });
route.push({ blockId: p0.id, path: [[1, 1], [2, 1], [3, 1], [3, 0]], exitSide: "top" });
route.push({ blockId: p7.id, path: [[3, 3], [3, 2], [3, 1], [3, 0]], exitSide: "top" });
route.push({
  blockId: p4.id,
  path: [[1, 3], [2, 3], [3, 3], [3, 2], [3, 1], [3, 0]],
  exitSide: "top",
});

try {
  runtime.validateLevel(level);
} catch (error) {
  console.error(`Lv27 validateLevel failed: ${error.message}`);
  process.exit(1);
}
let witnessMetrics;
try {
  witnessMetrics = replay(level, route);
} catch (error) {
  console.error(`Lv27 route replay failed: ${error.message}`);
  process.exit(1);
}
if (witnessMetrics.repositions !== 10 || witnessMetrics.actions !== 28 || witnessMetrics.clear_layers !== 18) {
  throw new Error(`unexpected Lv27 witness metrics ${JSON.stringify(witnessMetrics)}`);
}
level.parMoves = witnessMetrics.actions;

const coreGroups = [
  {
    id: "opening-triple",
    stage_key: "opening",
    block_ids: [opening[0].id, opening[7].id, opening[8].id],
    floor: 2,
  },
  {
    id: "opening-pair-01",
    stage_key: "opening",
    block_ids: [opening[1].id, opening[6].id],
    floor: 1,
  },
  {
    id: "opening-pair-02",
    stage_key: "opening",
    block_ids: [opening[2].id, opening[5].id],
    floor: 1,
  },
  {
    id: "opening-pair-03",
    stage_key: "opening",
    block_ids: [opening[3].id, opening[4].id],
    floor: 1,
  },
  {
    id: "hidden-h3-core",
    stage_key: `shutter:${cover.id}`,
    block_ids: [p0.id, p1.id, p2.id, p3.id, p4.id, p5.id, p6.id, p7.id],
    floor: 4,
  },
];
const entry = {
  level_id: "Lv027",
  search_attempt: "crafted-stacked-h3-handle",
  target: structuredClone(target),
  level,
  route,
  routeSemantics: "fully_assembled_runtime",
  witness_metrics: witnessMetrics,
  core_groups: coreGroups,
};
const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const artifact = {
  schema_version: "blockout-video-parity-lv27-stacked-h3-candidate-v1",
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
    playable_cell_count: 36,
    block_count: 18,
    shape_histogram: target.full_level_shape_histogram,
    opening_color_count: 2,
    full_color_count: 5,
    ordinary_exit_count: 2,
    frozen_values: [13, 13, 10],
    cover_values: [9],
    hidden_batch_counts: [9],
    required_reposition_floor: 9,
  },
  board_mask: mask,
  levels: [entry],
};
const witnesses = [{
  level_id: "Lv027",
  drags: route,
  metrics: witnessMetrics,
  source_attempt: entry.search_attempt,
}];
const corePlans = [{
  level_id: "Lv027",
  source: "crafted Lv27 opening handle plus staged H3 top/right core; verifier rebuilds every relaxation",
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
  stage_key: `shutter:${cover.id}`,
}, null, 2));
