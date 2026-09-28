import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

/**
 * Finalize the isolated Lv17/Lv32 last-gate repairs.
 *
 * The input gate searches run against complete mechanism LevelSpecs. This
 * finalizer emits two deliberately separate layers:
 *   - a mechanism-free R9-geometry base seed with a fresh one-exit-per-block
 *     witness; and
 *   - the exact complete runtime LevelSpec with its shell/numeric-aware route.
 *
 * Nothing is written to formal campaign sources.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaults = {
  contract: "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v6.json",
  baseCandidates: ".codex-temp/numeric-deadline-peel-full-r9/report/formal-candidates.json",
  runtimeInputs: ".codex-temp/video-parity-lv17-lv32-last-gate-seeds/input/runtime-candidates.json",
  lv17Seed: ".codex-temp/video-parity-lv17-last-gate-probe/base-overrides.json",
  lv17Audit: ".codex-temp/video-parity-lv17-last-gate-probe/audit.json",
  lv32Seed: ".codex-temp/video-parity-lv32-last-gate-probe/base-overrides.json",
  lv32Audit: ".codex-temp/video-parity-lv32-last-gate-probe/audit.json",
  outputDir: ".codex-temp/video-parity-lv17-lv32-last-gate-seeds/final",
};

const parseArgs = (argv) => {
  const options = { ...defaults };
  const names = new Map([
    ["--contract", "contract"],
    ["--base-candidates", "baseCandidates"],
    ["--runtime-inputs", "runtimeInputs"],
    ["--lv17-seed", "lv17Seed"],
    ["--lv17-audit", "lv17Audit"],
    ["--lv32-seed", "lv32Seed"],
    ["--lv32-audit", "lv32Audit"],
    ["--output-dir", "outputDir"],
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const name = names.get(argv[index]);
    if (!name) throw new Error(`Unknown option: ${argv[index]}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${argv[index]}`);
    options[name] = value;
    index += 1;
  }
  return options;
};

const options = parseArgs(process.argv.slice(2));
const absolute = (path) => resolve(root, path);
const display = (path) => relative(root, path).replaceAll("\\", "/");
const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const clone = (value) => structuredClone(value);
const canonical = (value) => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
};
const same = (left, right) => JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
const sortedNumbers = (values) => [...values].map(Number).sort((left, right) => left - right);
const sortedStrings = (values) => [...values].map(String).sort();
const label = (id) => `Lv${String(id).padStart(3, "0")}`;
const selectedIds = [17, 32];

const SHAPE_VARIANTS = {
  SINGLE: [[[0, 0]]],
  H2: [[[0, 0], [1, 0]]],
  V2: [[[0, 0], [0, 1]]],
  H3: [[[0, 0], [1, 0], [2, 0]]],
  V3: [[[0, 0], [0, 1], [0, 2]]],
  SQ2: [[[0, 0], [1, 0], [0, 1], [1, 1]]],
  L4: [
    [[0, 0], [0, 1], [0, 2], [1, 2]],
    [[0, 0], [1, 0], [2, 0], [0, 1]],
    [[0, 0], [1, 0], [1, 1], [1, 2]],
    [[2, 0], [0, 1], [1, 1], [2, 1]],
  ],
};
const shapeSignature = (shape) => {
  const minX = Math.min(...shape.map(([x]) => x));
  const minY = Math.min(...shape.map(([, y]) => y));
  return shape.map(([x, y]) => [x - minX, y - minY])
    .sort(([leftX, leftY], [rightX, rightY]) => leftY - rightY || leftX - rightX)
    .map(([x, y]) => `${x},${y}`).join("|");
};
const shapeBySignature = new Map(Object.entries(SHAPE_VARIANTS)
  .flatMap(([shapeId, variants]) => variants.map((shape) => [shapeSignature(shape), shapeId])));
const shapeIdOf = (shape) => shapeBySignature.get(shapeSignature(shape)) ?? "UNKNOWN";
const histogram = (blocks) => Object.fromEntries(Object.entries(blocks.reduce((result, block) => {
  const shapeId = shapeIdOf(block.shape);
  result[shapeId] = (result[shapeId] ?? 0) + 1;
  return result;
}, {})).sort(([left], [right]) => left.localeCompare(right)));
const maskRows = (level) => {
  const playable = new Set(level.playable.map(([x, y]) => `${x},${y}`));
  return Array.from({ length: level.height }, (_, y) => Array.from(
    { length: level.width },
    (_, x) => playable.has(`${x},${y}`) ? "#" : ".",
  ).join(""));
};
const layerColours = (block) => block.layers?.length ? [...block.layers] : [block.color];

const paths = Object.fromEntries(Object.entries(options)
  .filter(([key]) => key !== "outputDir")
  .map(([key, path]) => [key, absolute(path)]));
const outputDir = absolute(options.outputDir);
const outputPaths = {
  base: resolve(outputDir, "base-overrides.json"),
  runtime: resolve(outputDir, "runtime-overrides.json"),
  levels: resolve(outputDir, "runtime.generated.ts"),
  seedRoutes: resolve(outputDir, "seed-routes.json"),
  emptyRoutes: resolve(outputDir, "empty-routes.json"),
  audit: resolve(outputDir, "seed-audit.json"),
};
const sources = Object.fromEntries(await Promise.all(Object.entries(paths).map(async ([key, path]) => (
  [key, await readFile(path, "utf8")]
))));
const contractSha = sha256(sources.contract);
const contract = JSON.parse(sources.contract);
const baseArtifact = JSON.parse(sources.baseCandidates);
const runtimeInputArtifact = JSON.parse(sources.runtimeInputs);
const seedArtifacts = new Map([
  [17, JSON.parse(sources.lv17Seed)],
  [32, JSON.parse(sources.lv32Seed)],
]);
const seedAuditArtifacts = new Map([
  [17, JSON.parse(sources.lv17Audit)],
  [32, JSON.parse(sources.lv32Audit)],
]);

const puzzleBundle = await build({
  stdin: {
    contents: `export { PuzzleModel, validateLevel } from "./src/core/PuzzleModel.ts";`,
    resolveDir: root,
    sourcefile: "lv17-lv32-last-gate-finalizer-entry.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const puzzleBundleSource = puzzleBundle.outputFiles[0].text;
const puzzleUrl = `data:text/javascript;base64,${Buffer.from(puzzleBundleSource).toString("base64")}`;
const { PuzzleModel, validateLevel } = await import(puzzleUrl);
const puzzleSourcePath = absolute("src/core/PuzzleModel.ts");
const puzzleSource = await readFile(puzzleSourcePath, "utf8");

const execute = (model, event) => {
  const block = model.getBlock(event.blockId);
  if (!block) return { ok: false, reason: `missing block ${event.blockId}` };
  model.beginAction();
  for (const [x, y] of event.path ?? []) {
    const before = model.getBlock(event.blockId);
    const distance = before ? Math.abs(before.x - x) + Math.abs(before.y - y) : 0;
    const moved = distance === 1
      ? model.moveBlockStep(event.blockId, x, y)
      : model.moveBlock(event.blockId, x, y);
    const after = model.getBlock(event.blockId);
    if (!moved || !after || after.x !== x || after.y !== y) {
      model.cancelAction();
      return { ok: false, reason: `cannot move ${event.blockId} to ${x},${y}` };
    }
  }
  if (event.exitSide && !model.tryExit(event.blockId, event.exitSide).ok) {
    const status = model.exitAttemptStatus(event.blockId, event.exitSide);
    model.cancelAction();
    return { ok: false, reason: `cannot exit ${event.blockId} via ${event.exitSide}: ${status}` };
  }
  if (!model.commitAction()) return { ok: false, reason: `no-op ${event.blockId}` };
  return { ok: true };
};
const replay = (level, events) => {
  const model = new PuzzleModel(level);
  let clearLayers = 0;
  for (const [index, event] of events.entries()) {
    const before = model.snapshot().cleared;
    const applied = execute(model, event);
    if (!applied.ok) return { ok: false, reason: `event ${index + 1}: ${applied.reason}` };
    clearLayers += model.snapshot().cleared - before;
  }
  const snapshot = model.snapshot();
  return snapshot.complete ? {
    ok: true,
    drags: events.length,
    moves: snapshot.moves,
    clear_layers: clearLayers,
    final_board_blocks: snapshot.blocks.length,
    final_queued_blocks: snapshot.queuedBlocks.length,
  } : {
    ok: false,
    reason: `${snapshot.blocks.length} board / ${snapshot.queuedBlocks.length} queued remain`,
  };
};

const geometryProjection = (level) => ({
  id: level.id,
  width: level.width,
  height: level.height,
  playable: level.playable,
  blocks: level.blocks.map((block) => ({ id: block.id, x: block.x, y: block.y, shape: block.shape })),
});
const mechanismImmutableProjection = (level) => {
  const projected = clone(level);
  delete projected.gates;
  projected.blocks = projected.blocks.map((block) => {
    const copy = { ...block, layer_count: block.layers?.length ?? 1 };
    delete copy.color;
    delete copy.layers;
    return copy;
  });
  return projected;
};

const runtimeEntries = [];
const baseEntries = [];
const levelAudits = [];
for (const id of selectedIds) {
  const levelId = label(id);
  const target = contract.levels.find((entry) => entry.level_id === levelId)?.our_design_target;
  const baseSource = baseArtifact.levels?.find((entry) => entry.level_id === levelId);
  const inheritedRuntime = runtimeInputArtifact.levels?.find((entry) => entry.level_id === levelId)?.level;
  const seedArtifact = seedArtifacts.get(id);
  const seedEntry = seedArtifact.levels?.find((entry) => entry.level_id === levelId);
  const seedAudit = seedAuditArtifacts.get(id);
  if (!target || !baseSource || !inheritedRuntime || !seedEntry || !seedAudit) {
    throw new Error(`${levelId} is missing a finalizer input`);
  }
  if (seedArtifact.source?.contract?.sha256 !== contractSha || !same(seedEntry.target, target)
    || !same(baseSource.target, target)) {
    throw new Error(`${levelId} is not bound exactly to the active contract ${contractSha}`);
  }
  const level = clone(seedEntry.level);
  const route = clone(seedEntry.route);
  validateLevel(level);
  const firstRuntimeReplay = replay(level, route);
  const secondRuntimeReplay = replay(clone(level), clone(route));
  if (!firstRuntimeReplay.ok || !secondRuntimeReplay.ok) {
    throw new Error(`${levelId} runtime route failed independent replay: ${JSON.stringify({ firstRuntimeReplay, secondRuntimeReplay })}`);
  }
  if (!same(geometryProjection(level), geometryProjection(baseSource.level))) {
    throw new Error(`${levelId} runtime seed changed the R9 board/block geometry`);
  }
  if (!same(mechanismImmutableProjection(level), mechanismImmutableProjection(inheritedRuntime))) {
    throw new Error(`${levelId} runtime seed changed data outside gates or block colour-layer contents`);
  }

  const mechanism = target.mechanism_contract;
  const numericBlocks = level.blocks.filter((block) => Number(block.frozen ?? 0) > 0);
  const shellBlocks = level.blocks.filter((block) => (block.layers?.length ?? 1) > 1);
  const fullPalette = sortedStrings(new Set(level.blocks.flatMap(layerColours)));
  const numericPalette = new Set(numericBlocks.flatMap(layerColours));
  const nonNumericPalette = new Set(level.blocks.filter((block) => !numericBlocks.includes(block)).flatMap(layerColours));
  const concealedOnlyColours = new Set([...numericPalette].filter((colour) => !nonNumericPalette.has(colour)));
  const hiddenCarrierIds = numericBlocks
    .filter((block) => layerColours(block).some((colour) => concealedOnlyColours.has(colour)))
    .map((block) => block.id);
  const visiblePalette = sortedStrings(new Set(level.blocks
    .filter((block) => !hiddenCarrierIds.includes(block.id))
    .flatMap(layerColours)));
  const gateFrozenValues = sortedNumbers(level.gates.filter((gate) => Number(gate.frozen ?? 0) > 0)
    .map((gate) => gate.frozen));
  const numericValues = sortedNumbers(numericBlocks.map((block) => block.frozen));
  const numericHistogram = histogram(numericBlocks);
  const shellHistogram = histogram(shellBlocks);
  const shellExtras = sortedNumbers(shellBlocks.map((block) => block.layers.length - 1));
  const mismatches = [];
  const check = (field, expected, actual) => {
    if (!same(expected, actual)) mismatches.push({ field, expected, actual });
  };
  check("board.rows", target.board.rows, level.height);
  check("board.cols", target.board.cols, level.width);
  check("board.playable_cell_count", target.board.playable_cell_count, level.playable.length);
  check("board.playable_mask", target.board.playable_mask, maskRows(level));
  check("time_seconds", target.time_seconds, level.timeSeconds);
  check("full_level_block_count", target.full_level_block_count, level.blocks.length);
  check("full_level_shape_histogram", target.full_level_shape_histogram, histogram(level.blocks));
  check("full_level_occupied_cell_count", target.full_level_occupied_cell_count,
    level.blocks.reduce((sum, block) => sum + block.shape.length, 0));
  check("full_level_color_count", target.full_level_color_count, fullPalette.length);
  check("opening_color_count", target.opening_color_count, visiblePalette.length);
  check("stage_partitions", target.stage_partitions.map((stage) => ({
    id: stage.id,
    kind: stage.kind,
    count: stage.count,
    shape_histogram: stage.shape_histogram,
  })), [{
    id: "opening",
    kind: "opening",
    count: level.blocks.length,
    shape_histogram: histogram(level.blocks),
  }]);
  check("mechanism.directional_exits.ordinary_count", mechanism.directional_exits.ordinary_count,
    level.gates.filter((gate) => Number(gate.frozen ?? 0) <= 0 && !gate.star).length);
  check("mechanism.directional_exits.frozen_values", sortedNumbers(mechanism.directional_exits.frozen_values),
    gateFrozenValues);
  check("mechanism.directional_exits.star_count", mechanism.directional_exits.star_count,
    level.gates.filter((gate) => gate.star).length);
  check("mechanism.numeric_ice.count", mechanism.numeric_ice.count, numericBlocks.length);
  check("mechanism.numeric_ice.values", sortedNumbers(mechanism.numeric_ice.values), numericValues);
  check("mechanism.numeric_ice.shape_histogram", mechanism.numeric_ice.shape_histogram, numericHistogram);
  check("mechanism.numeric_ice.opening_visible_count", mechanism.numeric_ice.opening_visible_count,
    numericBlocks.length);
  check("mechanism.numeric_ice.post_melt_shell", mechanism.numeric_ice.post_melt_shell ?? 0,
    numericBlocks.filter((block) => (block.layers?.length ?? 1) > 1).length);
  check("mechanism.shells.count", mechanism.shells.count, shellBlocks.length);
  check("mechanism.shells.extra_layers", sortedNumbers(mechanism.shells.extra_layers), shellExtras);
  check("mechanism.shells.shape_histogram", mechanism.shells.shape_histogram, shellHistogram);
  check("mechanism.shells.outer_core_distinct", true,
    shellBlocks.every((block) => new Set(block.layers).size === block.layers.length));
  check("runtime_source_sq3_count", 0, level.blocks.filter((block) => shapeIdOf(block.shape) === "SQ3").length);
  if (mismatches.length) throw new Error(`${levelId} exact contract mismatch: ${JSON.stringify(mismatches)}`);

  const baseLevel = clone(baseSource.level);
  baseLevel.gates = level.gates.map((gate) => {
    const copy = clone(gate);
    delete copy.frozen;
    return copy;
  });
  const runtimeBlockById = new Map(level.blocks.map((block) => [block.id, block]));
  for (const block of baseLevel.blocks) {
    const runtimeBlock = runtimeBlockById.get(block.id);
    block.color = runtimeBlock.layers?.[0] ?? runtimeBlock.color;
    delete block.frozen;
    delete block.layers;
  }
  const baseExited = new Set();
  const baseRoute = route.flatMap((event) => {
    if (baseExited.has(event.blockId)) return [];
    if (event.exitSide) baseExited.add(event.blockId);
    return [{
      blockId: event.blockId,
      path: clone(event.path ?? []),
      ...(event.exitSide ? { exitSide: event.exitSide } : {}),
      purpose: event.exitSide
        ? "lv17-lv32-mechanism-free-base-peel"
        : "lv17-lv32-mechanism-free-base-reposition",
    }];
  });
  validateLevel(baseLevel);
  const baseReplay = replay(baseLevel, baseRoute);
  if (!baseReplay.ok || baseRoute.filter((event) => event.exitSide).length !== baseLevel.blocks.length) {
    throw new Error(`${levelId} projected base route failed: ${JSON.stringify(baseReplay)}`);
  }

  const timeline = clone(seedEntry.gate_deadline_timeline);
  runtimeEntries.push({
    level_id: levelId,
    target: clone(target),
    level,
    route,
    gate_deadline_timeline: timeline,
  });
  baseEntries.push({
    level_id: levelId,
    target: clone(target),
    level: baseLevel,
    route: baseRoute,
    validation: {
      validate_level: "pass",
      puzzle_model_replay: baseReplay,
      r9_geometry_exact: true,
      opening_hidden_color_carrier_ids: hiddenCarrierIds,
      seed_role: "mechanism-free assembler input; frozen exits, numeric ice and shells live in runtime override",
    },
  });
  levelAudits.push({
    level_id: levelId,
    exact_contract: {
      exact: true,
      mismatches: [],
      actual: {
        colors: {
          full_logical_count: fullPalette.length,
          full_clear_layer_colors: fullPalette,
          opening_visible_count: visiblePalette.length,
          opening_visible_colors: visiblePalette,
          opening_hidden_color_carrier_ids: hiddenCarrierIds,
        },
      },
    },
    validate_level: "pass",
    r9_base_geometry_exact: true,
    unchanged_outside_gate_and_colour_layer_assignment: true,
    base_fresh_replay: baseReplay,
    runtime_fresh_replay_first: firstRuntimeReplay,
    runtime_fresh_replay_second: secondRuntimeReplay,
    completion_upper_bound: {
      drags: firstRuntimeReplay.drags,
      clear_layers: firstRuntimeReplay.clear_layers,
      reposition_overhead: firstRuntimeReplay.drags - firstRuntimeReplay.clear_layers,
    },
    colors: {
      full_palette: fullPalette,
      opening_visible_palette: visiblePalette,
      numeric_concealed_only_colours: sortedStrings(concealedOnlyColours),
      opening_hidden_numeric_carrier_ids: hiddenCarrierIds,
    },
    gates: {
      ordinary_count: mechanism.directional_exits.ordinary_count,
      frozen_values: gateFrozenValues,
      first_available_and_first_use: timeline,
    },
    numeric_ice: {
      count: numericBlocks.length,
      values: numericValues,
      shape_histogram: numericHistogram,
      post_melt_shell: numericBlocks.filter((block) => (block.layers?.length ?? 1) > 1).length,
    },
    shells: {
      count: shellBlocks.length,
      extra_layers: shellExtras,
      shape_histogram: shellHistogram,
      outer_core_distinct: true,
    },
    search: seedAudit.levels?.find((entry) => entry.level_id === levelId)?.validation ?? null,
  });
}

const generatedOn = new Date().toISOString();
const sourceBinding = {
  contract: { path: display(paths.contract), sha256: contractSha },
  r9_base_candidates: { path: display(paths.baseCandidates), sha256: sha256(sources.baseCandidates) },
  inherited_runtime_inputs: { path: display(paths.runtimeInputs), sha256: sha256(sources.runtimeInputs) },
  lv17_gate_seed: { path: display(paths.lv17Seed), sha256: sha256(sources.lv17Seed) },
  lv32_gate_seed: { path: display(paths.lv32Seed), sha256: sha256(sources.lv32Seed) },
  runtime_authority: {
    path: display(puzzleSourcePath),
    source_sha256: sha256(puzzleSource),
    bundled_with_dependencies_sha256: sha256(puzzleBundleSource),
  },
};
const baseOutput = {
  schema_version: "blockout-video-parity-lv17-lv32-mechanism-free-base-overrides-v1",
  generated_on: generatedOn,
  prototype_only: true,
  applied_to_live_campaign: false,
  source: sourceBinding,
  policy: {
    scope: "Lv17/Lv32 R9 geometry, gate geometry/colour and one-exit-per-block base peel only",
    mechanism_boundary: "gate frozen values, numeric ice, shells and their repeated peels are represented only by runtime-overrides.json",
  },
  levels: baseEntries,
};
const runtimeOutput = {
  schema_version: "blockout-video-parity-lv17-lv32-exact-runtime-overrides-v1",
  generated_on: generatedOn,
  prototype_only: true,
  applied_to_live_campaign: false,
  source: sourceBinding,
  levels: runtimeEntries,
};
const levelsSource = `/* eslint-disable */
// AUTO-GENERATED by tools/finalize-video-parity-lv17-lv32-last-gate-seeds.mjs.
// Contract SHA-256: ${contractSha}
// Isolated evidence only; this file is not a formal campaign source.
export const VIDEO_PARITY_LEVELS = ${JSON.stringify(runtimeEntries.map((entry) => entry.level), null, 2)};
`;
const levelsSha = sha256(levelsSource);
const canonicalLevelsSha = sha256(JSON.stringify(canonical(
  runtimeEntries.map((entry) => entry.level).sort((left, right) => left.id - right.id),
)));
const seedRoutes = runtimeEntries.map((entry) => ({
  level_id: entry.level_id,
  source: "lv17-lv32-exact-runtime-gate-seed",
  proof_scope: "completion_upper_bound_only",
  replayed: true,
  events: clone(entry.route),
  drags: clone(entry.route),
  source_binding: {
    declared_contract_sha256: contractSha,
    levels: { path: display(outputPaths.levels), sha256: levelsSha },
    seed: entry.level_id === "Lv017" ? sourceBinding.lv17_gate_seed : sourceBinding.lv32_gate_seed,
    runtime_authority: sourceBinding.runtime_authority,
  },
}));
const emptyRoutes = selectedIds.map((id) => ({ level_id: label(id), events: [] }));

const baseText = `${JSON.stringify(baseOutput, null, 2)}\n`;
const runtimeText = `${JSON.stringify(runtimeOutput, null, 2)}\n`;
const seedRoutesText = `${JSON.stringify(seedRoutes, null, 2)}\n`;
const emptyRoutesText = `${JSON.stringify(emptyRoutes, null, 2)}\n`;
const audit = {
  schema_version: "blockout-video-parity-lv17-lv32-last-gate-seed-audit-v1",
  generated_on: generatedOn,
  inputs: {
    ...sourceBinding,
    contract: sourceBinding.contract,
  },
  outputs: {
    levels: display(outputPaths.levels),
    levels_sha256: levelsSha,
    canonical_level_specs_sha256: canonicalLevelsSha,
    base_overrides: { path: display(outputPaths.base), sha256: sha256(baseText) },
    runtime_overrides: { path: display(outputPaths.runtime), sha256: sha256(runtimeText) },
    runtime_levels: { path: display(outputPaths.levels), sha256: levelsSha },
    seed_routes: { path: display(outputPaths.seedRoutes), sha256: sha256(seedRoutesText) },
    empty_routes: { path: display(outputPaths.emptyRoutes), sha256: sha256(emptyRoutesText) },
  },
  summary: {
    emitted: selectedIds.length,
    levels: selectedIds.length,
    exact_contract: levelAudits.filter((entry) => entry.exact_contract.exact).length,
    validate_level_passed: levelAudits.filter((entry) => entry.validate_level === "pass").length,
    base_fresh_replay_passed: levelAudits.filter((entry) => entry.base_fresh_replay.ok).length,
    runtime_double_fresh_replay_passed: levelAudits.filter((entry) => (
      entry.runtime_fresh_replay_first.ok && entry.runtime_fresh_replay_second.ok
    )).length,
    level_ids: levelAudits.map((entry) => entry.level_id),
  },
  levels: levelAudits,
};
const auditText = `${JSON.stringify(audit, null, 2)}\n`;

const writeAtomic = async (path, value) => {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  await writeFile(temporary, value, "utf8");
  await rm(path, { force: true });
  await rename(temporary, path);
};
await Promise.all([
  writeAtomic(outputPaths.base, baseText),
  writeAtomic(outputPaths.runtime, runtimeText),
  writeAtomic(outputPaths.levels, levelsSource),
  writeAtomic(outputPaths.seedRoutes, seedRoutesText),
  writeAtomic(outputPaths.emptyRoutes, emptyRoutesText),
  writeAtomic(outputPaths.audit, auditText),
]);
console.log(JSON.stringify({
  output_dir: display(outputDir),
  contract_sha256: contractSha,
  summary: audit.summary,
  outputs: audit.outputs,
  completion_upper_bounds: Object.fromEntries(levelAudits.map((entry) => [
    entry.level_id,
    entry.completion_upper_bound,
  ])),
}, null, 2));
