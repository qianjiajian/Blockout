import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Prototype-only Lv20 candidate. The opening combines a four-block sealed
// terminal core with an independent two-H2 pocket (4 + 1). The cover cohort
// then uses all six non-terminal bodies to seal the terminal shaft (6). These
// disjoint relaxed cores add to the authored lower bound of eleven.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index < 0 ? fallback : args[index + 1];
};
const inputRelative = option(
  "--input",
  ".codex-temp/video-parity-v6-lv14-17-18-20-baseline-r35/runtime.generated.ts",
);
const contractRelative = option(
  "--contract",
  "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v6.json",
);
const outputDirRelative = option(
  "--output-dir",
  ".codex-temp/video-parity-v6-lv20-cover-dual-stage-candidate",
);

const inputPath = resolve(root, inputRelative);
const contractPath = resolve(root, contractRelative);
const [inputText, contractText] = await Promise.all([
  readFile(inputPath, "utf8"),
  readFile(contractPath, "utf8"),
]);
const contract = JSON.parse(contractText);
const target = contract.levels.find((entry) => entry.level_id === "Lv020")?.our_design_target;
if (!target) throw new Error("Lv20 is missing from the active design contract");

const bundle = await build({
  stdin: {
    contents: `
      export { VIDEO_PARITY_LEVELS as levels } from ${JSON.stringify(inputPath)};
      export { PuzzleModel, validateLevel } from ${JSON.stringify(resolve(root, "src/core/PuzzleModel.ts"))};
    `,
    resolveDir: root,
    sourcefile: "lv20-cover-dual-stage-candidate-runtime.ts",
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
const source = runtime.levels.find((level) => level.id === 20);
if (!source) throw new Error("Lv20 is missing from the input runtime");

const mask = [
  "####.",
  "#####",
  "#####",
  "#####",
  "##...",
  "##...",
  "####.",
  "#####",
];
const playable = mask.flatMap((row, y) => [...row].flatMap((cell, x) => (
  cell === "#" ? [[x, y]] : []
)));
if (source.width !== 5 || source.height !== 8 || playable.length !== 32
  || source.blocks.length !== 14 || source.gates.length !== 8) {
  throw new Error("Lv20 source no longer matches the expected scalar contract");
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
const applyDrag = (model, drag, label) => {
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
const replay = (level, route) => {
  const model = new runtime.PuzzleModel(level);
  let repositions = 0;
  let clears = 0;
  route.forEach((drag, index) => {
    applyDrag(model, drag, `action ${index + 1}`);
    if (drag.exitSide) clears += 1;
    else repositions += 1;
  });
  const snapshot = model.snapshot();
  if (!snapshot.complete) throw new Error(`route ended incomplete with ${snapshot.blocks.length} blocks`);
  return { repositions, actions: route.length, clear_layers: clears };
};

const level = structuredClone(source);
level.name = `${source.name} connector spine and cover reprise`;
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
const [A, B, C, D, E] = target.design_palette;
if (new Set([A, B, C, D, E]).size !== 5) throw new Error("Lv20 requires five colours");
const blocks = new Map(level.blocks.map((block) => [block.id, block]));
const b = (id) => {
  const block = blocks.get(id);
  if (!block) throw new Error(`missing Lv20 block ${id}`);
  return block;
};
const H2 = [[0, 0], [1, 0]];
const V3 = [[0, 0], [0, 1], [0, 2]];

const openingH2Ids = Array.from({ length: 6 }, (_value, index) => `cc-020-b1-0${index + 1}`);
// Opening: A terminal, three B shaft blockers, a D/E opposed pocket, and a C
// vertical blocker. This is exactly five visible colours.
const openingH2Colors = [A, D, B, C, D, E];
assign(b(openingH2Ids[0]), 0, 0, H2, openingH2Colors[0]);
for (const index of [1, 2, 3]) assign(b(openingH2Ids[index]), 1, index, H2, openingH2Colors[index]);
assign(b(openingH2Ids[4]), 0, 7, H2, D);
assign(b(openingH2Ids[5]), 2, 7, H2, E);
assign(b("cc-020-b1-07"), 0, 1, V3, D);

const hiddenH2Ids = Array.from({ length: 6 }, (_value, index) => `cc-020-b2-0${index + 1}`);
assign(b(hiddenH2Ids[0]), 0, 0, H2, A, true);
for (const index of [1, 2, 3]) assign(b(hiddenH2Ids[index]), 1, index, H2, B, true);
assign(b(hiddenH2Ids[4]), 0, 4, H2, B, true);
assign(b(hiddenH2Ids[5]), 0, 5, H2, B, true);
assign(b("cc-020-b2-07"), 0, 1, V3, B, true);

const cover = level.shutters?.find((entry) => entry.id === "vp-020-cover-1");
if (!cover || level.shutters.length !== 1) throw new Error("Lv20 cover changed unexpectedly");
Object.assign(cover, { x: 4, y: 7, width: 1, height: 1, count: 6, skin: "shutter" });

// One ordinary A mouth and frozen [1,2,3,6,7,8,10]. C opens at one, the shared
// two-cell D top mouth serves both V3 and H2 at two, B opens at three and E at
// six. The remaining mouths retain the exact frozen multiset without creating
// a new shortcut in either strict stage core.
const gateSpecs = [
  { side: "bottom", offset: 0, size: 2, color: A },
  { side: "right", offset: 1, size: 1, color: C, frozen: 1 },
  { side: "top", offset: 2, size: 2, color: D, frozen: 2 },
  { side: "top", offset: 0, size: 2, color: B, frozen: 3 },
  { side: "left", offset: 7, size: 1, color: E, frozen: 6 },
  { side: "left", offset: 0, size: 3, color: C, frozen: 7 },
  { side: "right", offset: 7, size: 1, color: D, frozen: 8 },
  { side: "bottom", offset: 2, size: 1, color: E, frozen: 10 },
];
level.gates.forEach((gate, index) => {
  Object.assign(gate, gateSpecs[index]);
  if (gateSpecs[index].frozen === undefined) delete gate.frozen;
  delete gate.star;
});
level.designTargets = {
  formulaVersion: "blockout-d1",
  calibratedDifficulty: target.target_d1_difficulty.calibrated_score,
  minimumRepositionOverhead: 11,
};

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
const route = [];

const parkUpperShaft = (h2Ids, v3Id) => [
  { blockId: b(h2Ids[1]).id, path: [[2, 1], [2, 0]] },
  { blockId: b(h2Ids[3]).id, path: [[2, 3], [3, 3], [3, 2], [3, 1]] },
  { blockId: b(h2Ids[2]).id, path: [[1, 3], [2, 3], [3, 3]] },
  { blockId: b(v3Id).id, path: [[1, 1], [2, 1]] },
];
const clearTerminal = (h2Ids) => ({
  blockId: b(h2Ids[0]).id,
  path: descend(0, 0, 7),
  exitSide: "bottom",
});
const clearOpeningV3 = (v3Id) => ({
  blockId: b(v3Id).id,
  path: [[1, 1], [0, 1], [0, 0]],
  exitSide: "left",
});
const clearParkedTopH2 = (h2Ids, index) => {
  return {
    blockId: b(h2Ids[index]).id,
    path: [...horizontal(3, 0, index), ...ascend(0, index, 0)],
    exitSide: "top",
  };
};
const parkHiddenCohort = (h2Ids, v3Id) => [
  ...[1, 2, 3].map((y) => ({ blockId: b(h2Ids[y]).id, path: [[2, y], [3, y]] })),
  { blockId: b(h2Ids[5]).id, path: [[0, 6], [1, 6], [2, 6]] },
  { blockId: b(h2Ids[4]).id, path: [[0, 5], [0, 6], [0, 7], [1, 7], [2, 7]] },
  { blockId: b(v3Id).id, path: [[1, 1], [2, 1]] },
];
const clearHiddenV3 = (v3Id) => ({
  blockId: b(v3Id).id,
  path: [[1, 1], [0, 1], [0, 0]],
  exitSide: "top",
});
const clearHiddenLowerH2 = (h2Ids, index, parkedY) => ({
  blockId: b(h2Ids[index]).id,
  path: [...horizontal(2, 0, parkedY), ...ascend(0, parkedY, 0)],
  exitSide: "top",
});
const hiddenCoreRoute = [
  ...parkHiddenCohort(hiddenH2Ids, "cc-020-b2-07"),
  clearTerminal(hiddenH2Ids),
  clearHiddenV3("cc-020-b2-07"),
  ...[1, 2, 3].map((index) => clearParkedTopH2(hiddenH2Ids, index)),
  clearHiddenLowerH2(hiddenH2Ids, 5, 6),
  clearHiddenLowerH2(hiddenH2Ids, 4, 7),
];

const openingV3Id = "cc-020-b1-07";
const hiddenV3Id = "cc-020-b2-07";
// Opening: four sealed-spine relocations plus the one-move opposed pocket.
const openingCompleteRoute = [
  ...parkUpperShaft(openingH2Ids, openingV3Id),
  { blockId: b(openingH2Ids[5]).id, path: [[2, 6]] },
  { blockId: b(openingH2Ids[4]).id, path: [[1, 7], [2, 7]] },
  clearTerminal(openingH2Ids),
  { blockId: b(openingH2Ids[3]).id, path: [], exitSide: "right" },
  { blockId: b(openingH2Ids[1]).id, path: [], exitSide: "top" },
  { blockId: b(openingV3Id).id, path: [[2, 0]], exitSide: "top" },
  {
    blockId: b(openingH2Ids[4]).id,
    path: [...horizontal(2, 0, 7), ...ascend(0, 7, 0), ...horizontal(0, 2, 0)],
    exitSide: "top",
  },
  {
    blockId: b(openingH2Ids[2]).id,
    path: [...horizontal(3, 0, 3), ...ascend(0, 3, 0)],
    exitSide: "top",
  },
  // Six clears release the cover; the parked E body then clears at frozen six.
  { blockId: b(openingH2Ids[5]).id, path: [[2, 7], [1, 7], [0, 7]], exitSide: "left" },
];
route.push(...openingCompleteRoute);

route.push(...parkHiddenCohort(hiddenH2Ids, hiddenV3Id));
route.push(clearTerminal(hiddenH2Ids));
route.push(clearHiddenV3(hiddenV3Id));
for (const index of [1, 2, 3]) route.push(clearParkedTopH2(hiddenH2Ids, index));
route.push(clearHiddenLowerH2(hiddenH2Ids, 5, 6));
route.push(clearHiddenLowerH2(hiddenH2Ids, 4, 7));

try {
  runtime.validateLevel(level);
} catch (error) {
  console.error(`Lv20 validateLevel failed: ${error.message}`);
  process.exit(1);
}
let witnessMetrics;
try {
  witnessMetrics = replay(level, route);
} catch (error) {
  console.error(`Lv20 route replay failed: ${error.message}`);
  process.exit(1);
}
if (witnessMetrics.repositions !== 12 || witnessMetrics.clear_layers !== 14) {
  throw new Error(`unexpected Lv20 witness metrics ${JSON.stringify(witnessMetrics)}`);
}
level.parMoves = witnessMetrics.actions;

const coreGroups = [
  {
    id: "opening-sealed-shaft-and-opposed-pocket",
    stage_key: "opening",
    block_ids: [...openingH2Ids, openingV3Id],
    floor: 5,
    proof_method: "exact_gameplay_frontier",
    route: openingCompleteRoute,
  },
  {
    id: "cover-six-blockers-behind-h2-terminal",
    stage_key: "shutter:vp-020-cover-1",
    block_ids: [...hiddenH2Ids, "cc-020-b2-07"],
    floor: 6,
    proof_method: "infinite_parking_relaxation",
    route: hiddenCoreRoute,
  },
];
const candidateTarget = structuredClone(target);
candidateTarget.board.playable_mask = mask;
candidateTarget.board.connected_component_count = 1;
candidateTarget.board.originality_status = "generated_v6_opening_split_core_and_cover_sealed_spine";
const entry = {
  level_id: "Lv020",
  search_attempt: "crafted-opening-split-core-plus-cover-sealed-spine",
  target: candidateTarget,
  level,
  route,
  routeSemantics: "fully_assembled_runtime",
  witness_metrics: witnessMetrics,
  core_groups: coreGroups,
};
const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const artifact = {
  schema_version: "blockout-video-parity-lv20-cover-dual-stage-candidate-v1",
  prototype_only: true,
  applied_to_live_campaign: false,
  source: {
    path: inputRelative,
    sha256: sha256(inputText),
    contract: { path: contractRelative, sha256: sha256(contractText) },
  },
  board_mask: mask,
  board_mask_override_pending_contract_update: {
    level_id: "Lv020",
    active_contract_mask: target.board.playable_mask,
    proposed_mask: mask,
    status: JSON.stringify(target.board.playable_mask) === JSON.stringify(mask)
      ? "applied"
      : "pending_contract_update",
  },
  contract_scalars: {
    rows: 8,
    cols: 5,
    playable_cell_count: 32,
    block_count: 14,
    occupied_cell_count: 30,
    shape_histogram: { H2: 12, V3: 2 },
    opening_piece_count: 7,
    hidden_piece_count: 7,
    opening_color_count: 5,
    full_color_count: 5,
    ordinary_exit_count: 1,
    frozen_values: [1, 2, 3, 6, 7, 8, 10],
    cover_values: [6],
    required_reposition_floor: 11,
  },
  levels: [entry],
};
const witnesses = [{ level_id: "Lv020", drags: route, metrics: witnessMetrics }];
const corePlans = [{
  level_id: "Lv020",
  source: "crafted disjoint opening and cover-stage cores",
  proof_scope: "disjoint relaxed-core lower bound across exact reveal stages",
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
}, null, 2));
