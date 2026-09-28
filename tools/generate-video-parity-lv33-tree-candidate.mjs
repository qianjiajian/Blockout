import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Prototype-only Lv33 construction. The competitor scalars stay fixed (7x9,
// 39 playable cells, 21 SINGLE + 2 T4 blocks, six colours, two ordinary and
// five frozen exits). The original outline is a tree: ten off-spine parking
// leaves make the intended route readable, while the unique path between each
// opposed colour pair gives the independent verifier ten disjoint floor-1
// relaxed cores.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index < 0 ? fallback : args[index + 1];
};
const inputRelative = option(
  "--input",
  ".codex-temp/video-parity-v6-runtime-r23-all/runtime.generated.ts",
);
const contractRelative = option(
  "--contract",
  "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v6.json",
);
const outputDirRelative = option(
  "--output-dir",
  ".codex-temp/video-parity-v6-lv33-tree-candidate",
);

const inputPath = resolve(root, inputRelative);
const contractPath = resolve(root, contractRelative);
const [inputText, contractText] = await Promise.all([
  readFile(inputPath, "utf8"),
  readFile(contractPath, "utf8"),
]);
const contract = JSON.parse(contractText);
const target = contract.levels.find((entry) => entry.level_id === "Lv033")?.our_design_target;
if (!target) throw new Error("Lv33 is missing from the active design contract");

const bundle = await build({
  stdin: {
    contents: `
      export { VIDEO_PARITY_LEVELS as levels } from ${JSON.stringify(inputPath)};
      export { PuzzleModel, validateLevel } from ${JSON.stringify(resolve(root, "src/core/PuzzleModel.ts"))};
    `,
    resolveDir: root,
    sourcefile: "lv33-tree-candidate-runtime.ts",
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
const source = runtime.levels.find((level) => level.id === 33);
if (!source) throw new Error("Lv33 is missing from the input runtime");

const shapeHistogram = (blocks) => Object.fromEntries(
  [...blocks.reduce((map, block) => {
    const signature = block.shape.length === 1 ? "SINGLE" : block.shape.length === 4 ? "T4" : "other";
    map.set(signature, (map.get(signature) ?? 0) + 1);
    return map;
  }, new Map())].sort(([left], [right]) => left.localeCompare(right)),
);
if (source.width !== 7 || source.height !== 9 || source.playable.length !== 39
  || source.blocks.length !== 23 || source.gates.length !== 7
  || JSON.stringify(shapeHistogram(source.blocks)) !== JSON.stringify({ SINGLE: 21, T4: 2 })) {
  throw new Error("Lv33 source no longer matches the expected competitor scalar contract");
}

const spine = [
  ...Array.from({ length: 7 }, (_, x) => [x, 0]),
  [6, 1],
  [6, 2],
  ...Array.from({ length: 7 }, (_, index) => [6 - index, 3]),
  [0, 4],
  [0, 5],
  ...Array.from({ length: 5 }, (_, x) => [x, 6]),
  [4, 7],
  [5, 7],
  [6, 7],
];
const topTBranch = [1, 1];
const rightTBranches = [[6, 6], [6, 8]];
const parkingLeafByAnchor = new Map([
  [4, [4, 1]],
  [9, [6, 4]],
  [11, [4, 4]],
  [12, [3, 2]],
  [13, [2, 4]],
  [15, [0, 2]],
  [18, [0, 7]],
  [20, [2, 7]],
  [21, [3, 5]],
  [23, [4, 8]],
]);
const playable = [
  ...spine,
  topTBranch,
  ...rightTBranches,
  ...parkingLeafByAnchor.values(),
].map((point) => [...point]);
const keyOf = ([x, y]) => `${x},${y}`;
if (spine.length !== 26 || playable.length !== 39
  || new Set(playable.map(keyOf)).size !== playable.length) {
  throw new Error("invalid Lv33 tree definition");
}
const playableSet = new Set(playable.map(keyOf));
const degrees = new Map(playable.map((point) => [
  keyOf(point),
  [[1, 0], [-1, 0], [0, 1], [0, -1]].reduce((count, [dx, dy]) => (
    count + Number(playableSet.has(`${point[0] + dx},${point[1] + dy}`))
  ), 0),
]));
const edgeCount = [...degrees.values()].reduce((sum, degree) => sum + degree, 0) / 2;
if (edgeCount !== playable.length - 1) {
  throw new Error(`Lv33 playable graph must be a tree; received ${edgeCount} edges`);
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
const clearRuleFields = (block) => {
  delete block.frozen;
  delete block.shutterId;
  delete block.movementAxis;
  delete block.keyId;
  delete block.lockedBy;
  delete block.lockCount;
  delete block.star;
};
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
      if (!result.ok) throw new Error(`route action ${dragIndex + 1} exit failed for ${drag.blockId}: ${result.reason}`);
    } else {
      repositions += 1;
    }
    if (!model.commitAction(true)) throw new Error(`route commit failed for ${drag.blockId}`);
  }
  const snapshot = model.snapshot();
  if (!snapshot.complete) throw new Error(`route ended incomplete with ${snapshot.blocks.length} blocks`);
  return { repositions, actions: drags.length };
};

const level = structuredClone(source);
level.name = `${source.name} tree parking pairs`;
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
if (palette.length !== 6) throw new Error(`expected six colours, received ${palette.length}`);
const [a, b, c, d, e, f] = palette;
const singles = level.blocks.filter((block) => block.shape.length === 1)
  .sort((left, right) => left.id.localeCompare(right.id));
const tBlocks = level.blocks.filter((block) => block.shape.length === 4)
  .sort((left, right) => left.id.localeCompare(right.id));
if (singles.length !== 21 || tBlocks.length !== 2) throw new Error("unexpected Lv33 block inventory");

const singleAssignments = [
  { position: 3, color: f, role: "ef-forward-1" },
  { position: 4, color: e, role: "ef-blocker-1" },
  { position: 5, color: f, role: "af-forward-1" },
  { position: 6, color: f, role: "af-forward-2" },
  { position: 7, color: f, role: "af-forward-3" },
  { position: 8, color: f, role: "af-forward-4" },
  { position: 9, color: a, role: "af-blocker-1" },
  { position: 10, color: b, role: "extra-b" },
  { position: 11, color: a, role: "af-blocker-2" },
  { position: 12, color: a, role: "af-blocker-3" },
  { position: 13, color: a, role: "af-blocker-4" },
  { position: 14, color: f, role: "af-forward-5" },
  { position: 15, color: a, role: "af-blocker-5" },
  { position: 16, color: f, role: "ef-forward-2" },
  { position: 17, color: f, role: "ef-forward-3" },
  { position: 18, color: e, role: "ef-blocker-2" },
  { position: 19, color: d, role: "cd-forward-d" },
  { position: 20, color: e, role: "ef-blocker-3" },
  { position: 21, color: c, role: "cd-blocker-c" },
  { position: 22, color: f, role: "ef-forward-4" },
  { position: 23, color: e, role: "ef-blocker-4" },
];
const blockAtPosition = new Map();
singleAssignments.forEach((assignment, index) => {
  const block = singles[index];
  [block.x, block.y] = spine[assignment.position];
  block.shape = [[0, 0]];
  block.color = assignment.color;
  block.layers = [assignment.color];
  clearRuleFields(block);
  blockAtPosition.set(assignment.position, block);
});

const topT = tBlocks[0];
topT.x = 0;
topT.y = 0;
topT.shape = [[0, 0], [1, 0], [2, 0], [1, 1]];
topT.color = e;
topT.layers = [e];
clearRuleFields(topT);
const rightT = tBlocks[1];
rightT.x = 5;
rightT.y = 6;
rightT.shape = [[1, 0], [0, 1], [1, 1], [1, 2]];
rightT.color = f;
rightT.layers = [f];
clearRuleFields(rightT);

const gateSpecs = [
  { side: "top", offset: 0, size: 3, color: e },
  { side: "right", offset: 6, size: 3, color: f },
  { side: "top", offset: 3, size: 1, color: b, frozen: 10 },
  { side: "bottom", offset: 4, size: 1, color: d, frozen: 18 },
  { side: "left", offset: 6, size: 1, color: c, frozen: 16 },
  { side: "left", offset: 3, size: 1, color: b, frozen: 10 },
  { side: "top", offset: 4, size: 1, color: a, frozen: 5 },
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

const route = [
  { blockId: topT.id, path: [], exitSide: "top" },
  { blockId: rightT.id, path: [], exitSide: "right" },
];
const park = (position) => route.push({
  blockId: blockAtPosition.get(position).id,
  path: [[...parkingLeafByAnchor.get(position)]],
});
for (const position of [4, 18, 20, 23]) park(position);
route.push({
  blockId: blockAtPosition.get(22).id,
  path: pathBetween(22, 25),
  exitSide: "right",
});
park(21);
route.push({
  blockId: blockAtPosition.get(19).id,
  path: [...pathBetween(19, 25), [...rightTBranches[0]]],
});
for (const position of [17, 16]) {
  route.push({
    blockId: blockAtPosition.get(position).id,
    path: pathBetween(position, 25),
    exitSide: "right",
  });
}
for (const position of [9, 11, 12, 13, 15]) park(position);
route.push({
  blockId: blockAtPosition.get(14).id,
  path: pathBetween(14, 25),
  exitSide: "right",
});
route.push({
  blockId: blockAtPosition.get(10).id,
  path: [...pathBetween(10, 25), [...rightTBranches[1]]],
});
for (const position of [8, 7, 6, 5]) {
  route.push({
    blockId: blockAtPosition.get(position).id,
    path: pathBetween(position, 25),
    exitSide: "right",
  });
}
route.push({
  blockId: blockAtPosition.get(10).id,
  path: [[...spine[25]], ...pathBetween(25, 15)],
  exitSide: "left",
});
route.push({
  blockId: blockAtPosition.get(3).id,
  path: pathBetween(3, 25),
  exitSide: "right",
});
for (const position of [4, 18, 20, 23]) {
  route.push({
    blockId: blockAtPosition.get(position).id,
    path: [[...spine[position]], ...pathBetween(position, 2)],
    exitSide: "top",
  });
}
for (const position of [9, 11]) {
  route.push({
    blockId: blockAtPosition.get(position).id,
    path: [[...spine[position]], ...pathBetween(position, 4)],
    exitSide: "top",
  });
}
route.push({
  blockId: blockAtPosition.get(19).id,
  path: [[...spine[25]], ...pathBetween(25, 23), [...parkingLeafByAnchor.get(23)]],
  exitSide: "bottom",
});
route.push({
  blockId: blockAtPosition.get(21).id,
  path: [[...spine[21]], ...pathBetween(21, 18)],
  exitSide: "left",
});
for (const position of [12, 13, 15]) {
  route.push({
    blockId: blockAtPosition.get(position).id,
    path: [[...spine[position]], ...pathBetween(position, 4)],
    exitSide: "top",
  });
}

try {
  runtime.validateLevel(level);
} catch (error) {
  console.error(`Lv33 validateLevel failed: ${error.message}`);
  process.exit(1);
}
let witnessMetrics;
try {
  witnessMetrics = replay(level, route);
} catch (error) {
  console.error(`Lv33 route replay failed: ${error.message}`);
  process.exit(1);
}
if (witnessMetrics.repositions !== 12 || witnessMetrics.actions !== 35) {
  throw new Error(`unexpected Lv33 witness metrics ${JSON.stringify(witnessMetrics)}`);
}
level.parMoves = witnessMetrics.actions;

const pairDefinitions = [
  ...[[3, 4], [16, 18], [17, 20], [22, 23]],
  ...[[5, 9], [6, 11], [7, 12], [8, 13], [14, 15]],
  [19, 21],
];
const coreGroups = pairDefinitions.map(([forward, blocker], index) => ({
  id: `pair-core-${String(index + 1).padStart(2, "0")}`,
  stage_key: "opening",
  block_ids: [blockAtPosition.get(forward).id, blockAtPosition.get(blocker).id],
  floor: 1,
}));
const entry = {
  level_id: "Lv033",
  search_attempt: "crafted-tree-parking-pairs",
  target: structuredClone(target),
  level,
  route,
  witness_metrics: witnessMetrics,
  core_groups: coreGroups,
};
const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const artifact = {
  schema_version: "blockout-video-parity-lv33-tree-candidate-v1",
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
    playable_cell_count: 39,
    block_count: 23,
    shape_histogram: { SINGLE: 21, T4: 2 },
    color_count: 6,
    ordinary_exit_count: 2,
    frozen_values: [5, 10, 10, 16, 18],
    required_reposition_floor: 10,
  },
  board_mask: Array.from({ length: 9 }, (_, y) => Array.from(
    { length: 7 },
    (_, x) => playableSet.has(`${x},${y}`) ? "#" : ".",
  ).join("")),
  levels: [entry],
};
const witnesses = [{
  level_id: "Lv033",
  drags: route,
  metrics: witnessMetrics,
  source_attempt: entry.search_attempt,
}];
const corePlans = [{
  level_id: "Lv033",
  source: "crafted Lv33 tree parking pairs; independent verifier rebuilds every relaxed core",
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
  board_mask: artifact.board_mask,
  witness_metrics: witnessMetrics,
  core_floor_sum: coreGroups.reduce((sum, group) => sum + group.floor, 0),
}, null, 2));
