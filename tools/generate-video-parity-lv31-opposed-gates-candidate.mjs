import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Isolated Lv31 exact-contract candidate. Four numeric SQ2 carriers preserve
// the competitor counters while opposed thaw order turns the dense V2 rows
// into a genuine routing puzzle. Nothing in this tool writes live campaign
// sources or the authoritative v6 contract.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index < 0 ? fallback : args[index + 1];
};
const inputRelative = option(
  "--input",
  ".codex-temp/video-parity-v6-early-floor-scan-r33/runtime.generated.ts",
);
const contractRelative = option(
  "--contract",
  "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v6.json",
);
const outputDirRelative = option(
  "--output-dir",
  ".codex-temp/video-parity-v6-lv31-opposed-gates-candidate-r1",
);
const inputPath = resolve(root, inputRelative);
const contractPath = resolve(root, contractRelative);
const [inputText, contractText] = await Promise.all([
  readFile(inputPath, "utf8"),
  readFile(contractPath, "utf8"),
]);
const contract = JSON.parse(contractText);
const target = contract.levels.find((entry) => entry.level_id === "Lv031")?.our_design_target;
if (!target) throw new Error("Lv31 is missing from the active design contract");

const bundle = await build({
  stdin: {
    contents: `
      export { VIDEO_PARITY_LEVELS as levels } from ${JSON.stringify(inputPath)};
      export { PuzzleModel, validateLevel } from ${JSON.stringify(resolve(root, "src/core/PuzzleModel.ts"))};
      export { solveLevelOptimally } from ${JSON.stringify(resolve(root, "src/core/levelSolver.ts"))};
    `,
    resolveDir: root,
    sourcefile: "lv31-opposed-gates-candidate-runtime.ts",
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
const source = runtime.levels.find((level) => level.id === 31);
if (!source) throw new Error("Lv31 is missing from the input runtime");

const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const canonicalize = (value) => Array.isArray(value) ? value.map(canonicalize)
  : value && typeof value === "object"
    ? Object.fromEntries(Object.keys(value).sort().flatMap((key) => (
      value[key] === undefined ? [] : [[key, canonicalize(value[key])]]
    )))
    : value;
const canonicalJson = (value) => JSON.stringify(canonicalize(value));
const same = (left, right) => canonicalJson(left) === canonicalJson(right);
const sortedNumbers = (values) => [...values].map(Number).sort((left, right) => left - right);
const levelSpecSha256 = (level) => sha256(canonicalJson(level));

const assignments = {
  "cc-031-b1-01": [0, 2, "orange"],
  "cc-031-b1-02": [1, 2, "pink"],
  "cc-031-b1-03": [2, 0, "pink"],
  "cc-031-b1-04": [1, 0, "yellow"],
  "cc-031-b1-05": [2, 2, "yellow"],
  "cc-031-b1-06": [5, 2, "red"],
  "cc-031-b1-07": [4, 2, "pink"],
  "cc-031-b1-08": [3, 2, "pink"],
  "cc-031-b1-09": [5, 4, "pink"],
  "cc-031-b1-10": [3, 0, "yellow"],
  "cc-031-b1-11": [4, 0, "red"],
  "cc-031-b1-12": [4, 4, "orange"],
  "cc-031-b1-13": [2, 4, "orange"],
  "cc-031-b1-14": [0, 4, "pink"],
  "cc-031-b1-15": [0, 0, "pink"],
  "cc-031-b1-16": [3, 6, "orange"],
  "cc-031-b1-17": [4, 6, "orange"],
  "cc-031-b1-18": [2, 6, "orange"],
};
const gateSpecs = [
  { side: "top", offset: 0, size: 3, color: "yellow", frozen: 2 },
  { side: "right", offset: 3, size: 3, color: "pink" },
  { side: "top", offset: 3, size: 3, color: "orange", frozen: 10 },
  { side: "right", offset: 0, size: 3, color: "red", frozen: 13 },
];

const level = structuredClone(source);
level.name = "冰值交错 · 对向门阵";
level.timeSeconds = target.time_seconds;
level.blocks.forEach((block) => {
  const assignment = assignments[block.id];
  if (!assignment) throw new Error(`missing Lv31 assignment for ${block.id}`);
  [block.x, block.y, block.color] = assignment;
});
level.gates.forEach((gate, index) => {
  const spec = gateSpecs[index];
  if (!spec) throw new Error(`unexpected Lv31 gate index ${index}`);
  Object.assign(gate, spec);
  if (spec.frozen === undefined) delete gate.frozen;
  delete gate.star;
});
level.designTargets = {
  formulaVersion: "blockout-d1",
  calibratedDifficulty: target.target_d1_difficulty.calibrated_score,
  minimumRepositionOverhead: target.campaign_reposition_floor,
};
delete level.blocked;
delete level.shutters;
delete level.generators;
delete level.elevators;
delete level.conveyors;
delete level.onboardingHint;
delete level.strategyNudge;
delete level.strategyFocus;
delete level.featureIntro;

const shapeKind = (block) => {
  if (block.shape.length === 2 && block.shape.every(([x]) => x === 0)) return "V2";
  if (block.shape.length === 4) {
    const cells = new Set(block.shape.map(([x, y]) => `${x},${y}`));
    if (["0,0", "1,0", "0,1", "1,1"].every((cell) => cells.has(cell))) return "SQ2";
  }
  return "UNKNOWN";
};
const histogram = (blocks) => blocks.reduce((result, block) => {
  const kind = shapeKind(block);
  result[kind] = (result[kind] ?? 0) + 1;
  return result;
}, {});
const mask = Array.from({ length: level.height }, (_row, y) => {
  const playable = new Set(level.playable.map(([x, cellY]) => `${x},${cellY}`));
  return Array.from({ length: level.width }, (_cell, x) => playable.has(`${x},${y}`) ? "#" : ".").join("");
});
const numeric = level.blocks.filter((block) => Number(block.frozen ?? 0) > 0);
const actual = {
  rows: level.height,
  cols: level.width,
  playable_cell_count: level.playable.length,
  playable_mask: mask,
  time_seconds: level.timeSeconds,
  block_count: level.blocks.length,
  occupied_cell_count: level.blocks.reduce((sum, block) => sum + block.shape.length, 0),
  shape_histogram: histogram(level.blocks),
  colors: [...new Set(level.blocks.map((block) => block.color))].sort(),
  ordinary_exit_count: level.gates.filter((gate) => Number(gate.frozen ?? 0) <= 0).length,
  frozen_exit_values: sortedNumbers(level.gates.filter((gate) => Number(gate.frozen ?? 0) > 0).map((gate) => gate.frozen)),
  numeric_count: numeric.length,
  numeric_values: sortedNumbers(numeric.map((block) => block.frozen)),
  numeric_shape_histogram: histogram(numeric),
};
const mechanism = target.mechanism_contract;
const checks = {
  board: actual.rows === target.board.rows && actual.cols === target.board.cols
    && actual.playable_cell_count === target.board.playable_cell_count
    && same(actual.playable_mask, target.board.playable_mask),
  time: actual.time_seconds === target.time_seconds,
  inventory: actual.block_count === target.full_level_block_count
    && actual.occupied_cell_count === target.full_level_occupied_cell_count
    && same(actual.shape_histogram, target.full_level_shape_histogram),
  colors: actual.colors.length === target.full_level_color_count
    && actual.colors.length === target.opening_color_count,
  gates: actual.ordinary_exit_count === mechanism.directional_exits.ordinary_count
    && same(actual.frozen_exit_values, sortedNumbers(mechanism.directional_exits.frozen_values)),
  numeric: actual.numeric_count === mechanism.numeric_ice.count
    && same(actual.numeric_values, sortedNumbers(mechanism.numeric_ice.values))
    && same(actual.numeric_shape_histogram, mechanism.numeric_ice.shape_histogram),
};
const failed = Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name);
if (failed.length) throw new Error(`Lv31 exact-contract checks failed: ${failed.join(", ")}`);
runtime.validateLevel(level);

const optimal = runtime.solveLevelOptimally(level, 100_000);
if (!optimal.solved || optimal.repositionOverhead < target.campaign_reposition_floor) {
  throw new Error(`Lv31 exact solver did not meet floor: ${JSON.stringify(optimal)}`);
}
const route = optimal.drags;
const replay = (spec, actions) => {
  const model = new runtime.PuzzleModel(spec);
  let repositions = 0;
  let clearLayers = 0;
  for (const [actionIndex, action] of actions.entries()) {
    model.beginAction();
    for (const [x, y] of action.path ?? []) {
      if (!model.moveBlockStep(action.blockId, x, y)) {
        throw new Error(`route action ${actionIndex + 1} move failed for ${action.blockId} at ${x},${y}`);
      }
    }
    if (action.exitSide) {
      const result = model.tryExit(action.blockId, action.exitSide);
      if (!result.ok) throw new Error(`route action ${actionIndex + 1} exit failed: ${result.reason}`);
      clearLayers += 1;
    } else {
      repositions += 1;
    }
    if (!model.commitAction(true)) throw new Error(`route action ${actionIndex + 1} commit failed`);
  }
  const snapshot = model.snapshot();
  if (!snapshot.complete) throw new Error(`Lv31 route ended incomplete with ${snapshot.blocks.length} blocks`);
  return { actions: actions.length, repositions, clear_layers: clearLayers };
};
const witnessMetrics = replay(level, route);
if (witnessMetrics.repositions !== optimal.repositionOverhead || witnessMetrics.clear_layers !== 18) {
  throw new Error(`Lv31 replay metrics drifted: ${JSON.stringify(witnessMetrics)}`);
}
level.parMoves = witnessMetrics.actions;
const levelSha = levelSpecSha256(level);
const entry = {
  level_id: "Lv031",
  search_attempt: "opposed-gate numeric thaw exact optimum",
  target: structuredClone(target),
  level,
  route,
  routeSemantics: "fully_assembled_runtime",
  witness_metrics: witnessMetrics,
  exact_solver: {
    solved: true,
    explored_states: optimal.exploredStates,
    minimum_drags: optimal.minimumDrags,
    reposition_overhead: optimal.repositionOverhead,
  },
};
const artifact = {
  schema_version: "blockout-video-parity-lv31-opposed-gates-candidate-v1",
  prototype_only: true,
  applied_to_live_campaign: false,
  source: {
    path: inputRelative,
    sha256: sha256(inputText),
    contract: { path: contractRelative, sha256: sha256(contractText) },
  },
  exact_contract: { checks, actual },
  levels: [entry],
};
const witnesses = [{
  level_id: "Lv031",
  source: "Lv31 opposed-gate exact solver route",
  drags: route,
  metrics: witnessMetrics,
  level_spec_sha256: levelSha,
}];
const outputDir = resolve(root, outputDirRelative);
await mkdir(outputDir, { recursive: true });
const artifactText = `${JSON.stringify(artifact, null, 2)}\n`;
await Promise.all([
  writeFile(resolve(outputDir, "proof-input.json"), artifactText, "utf8"),
  writeFile(resolve(outputDir, "proof-witness.json"), `${JSON.stringify(witnesses, null, 2)}\n`, "utf8"),
]);
console.log(JSON.stringify({
  output: relative(root, outputDir).replaceAll("\\", "/"),
  contract_sha256: sha256(contractText),
  proof_input_sha256: sha256(artifactText),
  level_spec_sha256: levelSha,
  exact_solver: entry.exact_solver,
  witness_metrics: witnessMetrics,
}, null, 2));
