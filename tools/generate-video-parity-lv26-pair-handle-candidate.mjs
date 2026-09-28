import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Prototype-only Lv26 construction. The competitor scalars and the two
// countdown-cover batches stay fixed. Sixteen opening singles form an opposed
// two-colour handle; its only connection to the lower parking room is beyond
// the second exit. Eight disjoint relaxed pairs therefore each require one
// non-exit drag, while the authored completion route parks every blocker once.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index < 0 ? fallback : args[index + 1];
};
const inputRelative = option(
  "--input",
  ".codex-temp/video-parity-v6-lv26-unified-r24/runtime.generated.ts",
);
const contractRelative = option(
  "--contract",
  "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v6.json",
);
const outputDirRelative = option(
  "--output-dir",
  ".codex-temp/video-parity-v6-lv26-pair-handle-candidate",
);

const inputPath = resolve(root, inputRelative);
const contractPath = resolve(root, contractRelative);
const [inputText, contractText] = await Promise.all([
  readFile(inputPath, "utf8"),
  readFile(contractPath, "utf8"),
]);
const contract = JSON.parse(contractText);
const target = contract.levels.find((entry) => entry.level_id === "Lv026")?.our_design_target;
if (!target) throw new Error("Lv26 is missing from the active design contract");

const bundle = await build({
  stdin: {
    contents: `
      export { VIDEO_PARITY_LEVELS as levels } from ${JSON.stringify(inputPath)};
      export { PuzzleModel, validateLevel } from ${JSON.stringify(resolve(root, "src/core/PuzzleModel.ts"))};
    `,
    resolveDir: root,
    sourcefile: "lv26-pair-handle-candidate-runtime.ts",
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
const source = runtime.levels.find((level) => level.id === 26);
if (!source) throw new Error("Lv26 is missing from the input runtime");

const keyOf = ([x, y]) => `${x},${y}`;
const mask = target.board.playable_mask;
const playable = mask.flatMap((row, y) => [...row].flatMap((cell, x) => (
  cell === "#" ? [[x, y]] : []
)));
if (source.width !== 7 || source.height !== 11 || playable.length !== 53
  || source.blocks.length !== 35 || source.gates.length !== 11) {
  throw new Error("Lv26 source no longer matches the expected competitor scalar contract");
}

const shapeKind = (block) => {
  if (block.shape.length === 1) return "SINGLE";
  if (block.shape.length === 2) {
    return block.shape[0][1] === block.shape[1][1] ? "H2" : "V2";
  }
  if (block.shape.length === 3) return "L3";
  if (block.shape.length === 4) return "T4";
  return `OTHER_${block.shape.length}`;
};
const histogram = (blocks) => Object.fromEntries(
  [...blocks.reduce((map, block) => {
    const kind = shapeKind(block);
    map.set(kind, (map.get(kind) ?? 0) + 1);
    return map;
  }, new Map())].sort(([left], [right]) => left.localeCompare(right)),
);
const expectedHistogram = { H2: 8, L3: 1, SINGLE: 20, T4: 1, V2: 5 };
if (JSON.stringify(histogram(source.blocks)) !== JSON.stringify(expectedHistogram)) {
  throw new Error(`unexpected Lv26 inventory ${JSON.stringify(histogram(source.blocks))}`);
}

const replay = (level, drags) => {
  const model = new runtime.PuzzleModel(level);
  let repositions = 0;
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
    } else {
      repositions += 1;
    }
    if (!model.commitAction(true)) throw new Error(`route commit failed for ${drag.blockId}`);
  }
  const snapshot = model.snapshot();
  if (!snapshot.complete) throw new Error(`route ended incomplete with ${snapshot.blocks.length} blocks`);
  return { repositions, actions: drags.length };
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
level.name = `${source.name} pair handle room`;
level.playable = playable;
delete level.blocked;
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

const covers = [...level.shutters].sort((left, right) => left.count - right.count);
if (covers.length !== 2 || covers[0].count !== 19 || covers[1].count !== 22) {
  throw new Error("Lv26 countdown covers changed unexpectedly");
}
Object.assign(covers[0], { x: 2, y: 7, width: 1, height: 1, count: 19, skin: "shutter" });
Object.assign(covers[1], { x: 3, y: 7, width: 1, height: 1, count: 22, skin: "shutter" });

const opening = level.blocks.filter((block) => !block.shutterId);
const coverOne = level.blocks.filter((block) => block.shutterId === covers[0].id);
const coverTwo = level.blocks.filter((block) => block.shutterId === covers[1].id);
if (JSON.stringify(histogram(opening)) !== JSON.stringify({ SINGLE: 19, V2: 1 })
  || JSON.stringify(histogram(coverOne)) !== JSON.stringify({ V2: 2 })
  || JSON.stringify(histogram(coverTwo)) !== JSON.stringify({ H2: 8, L3: 1, SINGLE: 1, T4: 1, V2: 2 })) {
  throw new Error("Lv26 stage partitions changed unexpectedly");
}

const spine = [
  ...Array.from({ length: 7 }, (_, x) => [x, 0]),
  [6, 1],
  ...Array.from({ length: 7 }, (_, index) => [6 - index, 2]),
  [0, 3],
];
const connector = [0, 4];
const parking = [[0, 5], [1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [5, 6], [4, 6]];
if (spine.length !== 16 || ![...spine, connector, ...parking].every((point) => mask[point[1]][point[0]] === "#")) {
  throw new Error("invalid Lv26 handle geometry");
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

const openingSingles = opening.filter((block) => shapeKind(block) === "SINGLE")
  .sort((left, right) => left.id.localeCompare(right.id));
const openingV2 = opening.find((block) => shapeKind(block) === "V2");
const blockAtSpine = new Map();
for (let position = 0; position < 16; position += 1) {
  const color = position < 8 ? a : b;
  assign(openingSingles[position], ...spine[position], [[0, 0]], color);
  blockAtSpine.set(position, openingSingles[position]);
}
assign(openingSingles[16], 0, 5, [[0, 0]], e);
assign(openingSingles[17], 6, 5, [[0, 0]], d);
assign(openingSingles[18], 6, 6, [[0, 0]], d);
assign(openingV2, 0, 7, [[0, 0], [0, 1]], c);

const stageTwo = [...coverOne].sort((left, right) => left.id.localeCompare(right.id));
assign(stageTwo[0], 6, 7, [[0, 0], [0, 1]], f, true);
assign(stageTwo[1], 0, 9, [[0, 0], [0, 1]], g, true);

const stageThreeH2 = coverTwo.filter((block) => shapeKind(block) === "H2")
  .sort((left, right) => left.id.localeCompare(right.id));
const stageThreeV2 = coverTwo.filter((block) => shapeKind(block) === "V2")
  .sort((left, right) => left.id.localeCompare(right.id));
const stageThreeSingle = coverTwo.find((block) => shapeKind(block) === "SINGLE");
const stageThreeL3 = coverTwo.find((block) => shapeKind(block) === "L3");
const stageThreeT4 = coverTwo.find((block) => shapeKind(block) === "T4");
const rightRows = [5, 6, 7, 8, 9];
const rightColors = [d, d, f, f, f];
rightRows.forEach((row, index) => assign(
  stageThreeH2[index], 5, row, [[0, 0], [1, 0]], rightColors[index], true,
));
[7, 8, 9].forEach((row, index) => assign(
  stageThreeH2[index + 5], 0, row, [[0, 0], [1, 0]], c, true,
));
assign(stageThreeV2[0], 0, 5, [[0, 0], [0, 1]], e, true);
assign(stageThreeV2[1], 2, 5, [[0, 0], [0, 1]], g, true);
assign(stageThreeSingle, 4, 7, [[0, 0]], f, true);
assign(stageThreeL3, 3, 5, [[0, 0], [1, 0], [0, 1]], d, true);
assign(stageThreeT4, 2, 8, [[0, 0], [1, 0], [2, 0], [1, 1]], c, true);

const gateSpecs = [
  { side: "top", offset: 0, size: 1, color: b },
  { side: "left", offset: 3, size: 1, color: a },
  { side: "left", offset: 5, size: 2, color: e },
  { side: "left", offset: 7, size: 3, color: c },
  { side: "right", offset: 5, size: 2, color: d },
  { side: "right", offset: 7, size: 2, color: f },
  { side: "bottom", offset: 0, size: 1, color: g },
  { side: "top", offset: 6, size: 1, color: c },
  { side: "top", offset: 2, size: 1, color: d, frozen: 5 },
  { side: "top", offset: 4, size: 1, color: e, frozen: 9 },
  { side: "right", offset: 9, size: 1, color: f, frozen: 14 },
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
  { blockId: openingSingles[16].id, path: [], exitSide: "left" },
  { blockId: openingSingles[17].id, path: [], exitSide: "right" },
  { blockId: openingSingles[18].id, path: [], exitSide: "right" },
  { blockId: openingV2.id, path: [], exitSide: "left" },
];
for (let position = 15; position >= 8; position -= 1) {
  const parkingIndex = position - 8;
  route.push({
    blockId: blockAtSpine.get(position).id,
    path: [
      ...pathBetween(position, 15),
      [...connector],
      ...parking.slice(0, parkingIndex + 1).map((point) => [...point]),
    ],
  });
}
for (let position = 7; position >= 0; position -= 1) {
  route.push({
    blockId: blockAtSpine.get(position).id,
    path: pathBetween(position, 15),
    exitSide: "left",
  });
}
for (let parkingIndex = 0; parkingIndex < 8; parkingIndex += 1) {
  const position = parkingIndex + 8;
  route.push({
    blockId: blockAtSpine.get(position).id,
    path: [
      ...parking.slice(0, parkingIndex).reverse().map((point) => [...point]),
      [...connector],
      [...spine[15]],
      ...pathBetween(15, 0),
    ],
    exitSide: "top",
  });
}
route.push(
  { blockId: stageTwo[0].id, path: [], exitSide: "right" },
  { blockId: stageTwo[1].id, path: [], exitSide: "bottom" },
);
for (let index = 0; index < 5; index += 1) {
  route.push({ blockId: stageThreeH2[index].id, path: [], exitSide: "right" });
}
for (let index = 5; index < 8; index += 1) {
  route.push({ blockId: stageThreeH2[index].id, path: [], exitSide: "left" });
}
route.push(
  { blockId: stageThreeV2[0].id, path: [], exitSide: "left" },
  { blockId: stageThreeSingle.id, path: [[5, 7], [6, 7]], exitSide: "right" },
  { blockId: stageThreeT4.id, path: [[1, 8], [0, 8]], exitSide: "left" },
  { blockId: stageThreeL3.id, path: [[4, 5], [5, 5]], exitSide: "right" },
  {
    blockId: stageThreeV2[1].id,
    path: [[1, 5], [0, 5], [0, 6], [0, 7], [0, 8], [0, 9]],
    exitSide: "bottom",
  },
);

try {
  runtime.validateLevel(level);
} catch (error) {
  console.error(`Lv26 validateLevel failed: ${error.message}`);
  process.exit(1);
}
let witnessMetrics;
try {
  witnessMetrics = replay(level, route);
} catch (error) {
  console.error(`Lv26 route replay failed: ${error.message}`);
  process.exit(1);
}
if (witnessMetrics.repositions !== 8 || witnessMetrics.actions !== 43) {
  throw new Error(`unexpected Lv26 witness metrics ${JSON.stringify(witnessMetrics)}`);
}
level.parMoves = witnessMetrics.actions;

const coreGroups = Array.from({ length: 8 }, (_, index) => ({
  id: `pair-core-${String(index + 1).padStart(2, "0")}`,
  stage_key: "opening",
  block_ids: [blockAtSpine.get(index).id, blockAtSpine.get(15 - index).id],
  floor: 1,
}));
const entry = {
  level_id: "Lv026",
  search_attempt: "crafted-pair-handle-room",
  target: structuredClone(target),
  level,
  route,
  witness_metrics: witnessMetrics,
  core_groups: coreGroups,
};
const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const artifact = {
  schema_version: "blockout-video-parity-lv26-pair-handle-candidate-v1",
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
    playable_cell_count: 53,
    block_count: 35,
    shape_histogram: target.full_level_shape_histogram,
    opening_color_count: 5,
    full_color_count: 7,
    ordinary_exit_count: 8,
    frozen_values: [5, 9, 14],
    cover_values: [19, 22],
    required_reposition_floor: 8,
  },
  board_mask: mask,
  levels: [entry],
};
const witnesses = [{
  level_id: "Lv026",
  drags: route,
  metrics: witnessMetrics,
  source_attempt: entry.search_attempt,
}];
const corePlans = [{
  level_id: "Lv026",
  source: "crafted Lv26 opposed handle pairs; verifier independently rebuilds every relaxed core",
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
