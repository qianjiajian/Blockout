import { spawn } from "node:child_process";
import crypto from "node:crypto";
import { build } from "esbuild";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const TOOL_PATH = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(TOOL_PATH), "..");
const DEFAULT_CONTRACT = resolve(ROOT, "deliverables/level-generation-blueprint/blockout-lv001-lv100-expanded-density-contract-v5.json");
const DEFAULT_OUTPUT_DIR = resolve(ROOT, "playtest-results/experiments/competitor-composition-r141/strict-acceptance-v5");
const UPSTREAM_PROOF = resolve(ROOT, "playtest-results/experiments/competitor-composition-r140/prove-reposition-lower-bound.mjs");
const UPSTREAM_REPORT_DIR = dirname(UPSTREAM_PROOF);

const SHAPES = {
  SINGLE: [[[0, 0]]],
  H2: [[[0, 0], [1, 0]]],
  V2: [[[0, 0], [0, 1]]],
  H3: [[[0, 0], [1, 0], [2, 0]]],
  V3: [[[0, 0], [0, 1], [0, 2]]],
  SQ2: [[[0, 0], [1, 0], [0, 1], [1, 1]]],
  L3: [
    [[0, 0], [0, 1], [1, 1]],
    [[0, 0], [1, 0], [0, 1]],
    [[0, 0], [1, 0], [1, 1]],
    [[1, 0], [0, 1], [1, 1]],
  ],
  T4: [
    [[0, 0], [1, 0], [2, 0], [1, 1]],
    [[1, 0], [0, 1], [1, 1], [1, 2]],
    [[1, 0], [0, 1], [1, 1], [2, 1]],
    [[0, 0], [0, 1], [1, 1], [0, 2]],
  ],
  L4: [
    [[0, 0], [0, 1], [0, 2], [1, 2]],
    [[0, 0], [1, 0], [2, 0], [0, 1]],
    [[0, 0], [1, 0], [1, 1], [1, 2]],
    [[2, 0], [0, 1], [1, 1], [2, 1]],
  ],
  CROSS5: [[[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]]],
  RECT2X3: [
    [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2]],
    [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]],
  ],
  SQ3: [[
    [0, 0], [1, 0], [2, 0],
    [0, 1], [1, 1], [2, 1],
    [0, 2], [1, 2], [2, 2],
  ]],
};
const SHAPE_ORDER = Object.keys(SHAPES);

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex").toUpperCase();
const clone = (value) => structuredClone(value);
const posixRelative = (path) => relative(ROOT, path).replaceAll("\\", "/");
const stableValue = (value) => {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  }
  return value;
};
const stableJson = (value) => JSON.stringify(stableValue(value));
const keyOf = (x, y) => `${x},${y}`;
const routeMetrics = (route) => ({
  actions: route.length,
  exits: route.filter((drag) => Boolean(drag.exitSide)).length,
  repositions: route.filter((drag) => !drag.exitSide).length,
  grid_steps: route.reduce((sum, drag) => sum + (drag.path?.length ?? 0), 0),
});

const parseSelection = (specification) => {
  if (!specification) return null;
  const ids = new Set();
  for (const token of specification.split(",").map((part) => part.trim()).filter(Boolean)) {
    const match = token.match(/^(\d+)(?:-(\d+))?$/);
    if (!match) throw new Error(`Invalid --levels token: ${token}`);
    const from = Number(match[1]);
    const to = Number(match[2] ?? match[1]);
    if (!Number.isSafeInteger(from) || !Number.isSafeInteger(to) || from < 1 || to < from) {
      throw new Error(`Invalid --levels range: ${token}`);
    }
    for (let id = from; id <= to; id += 1) ids.add(id);
  }
  return ids;
};

const parseArgs = (argv) => {
  const options = {
    input: process.env.V5_STRICT_INPUT ? resolve(ROOT, process.env.V5_STRICT_INPUT) : null,
    contract: resolve(ROOT, process.env.V5_STRICT_CONTRACT ?? DEFAULT_CONTRACT),
    outputDir: resolve(ROOT, process.env.V5_STRICT_OUTPUT_DIR ?? DEFAULT_OUTPUT_DIR),
    levels: process.env.V5_STRICT_LEVELS ?? null,
    maxStates: Number(process.env.V5_STRICT_MAX_STATES ?? 250_000),
    maxMemoryMb: Number(process.env.V5_STRICT_MAX_MEMORY_MB ?? 700),
    transpositionCap: Number(process.env.V5_STRICT_TRANSPOSITION_CAP ?? 100_000),
    symmetryReduction: process.env.V5_STRICT_SYMMETRY_REDUCTION === "1",
    relaxedBoundPruning: process.env.V5_STRICT_RELAXED_BOUND_PRUNING === "1",
    relaxedBoundRootOnly: process.env.V5_STRICT_RELAXED_BOUND_ROOT_ONLY === "1",
    relaxedBoundMaxStates: Number(process.env.V5_STRICT_RELAXED_BOUND_MAX_STATES ?? 5_000),
    keepUpstreamReports: process.env.V5_STRICT_KEEP_UPSTREAM_REPORTS === "1",
    write: true,
    selfTest: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const value = argv[index + 1];
    if (argument === "--input") { options.input = resolve(ROOT, value); index += 1; }
    else if (argument === "--contract") { options.contract = resolve(ROOT, value); index += 1; }
    else if (argument === "--output-dir") { options.outputDir = resolve(ROOT, value); index += 1; }
    else if (argument === "--levels") { options.levels = value; index += 1; }
    else if (argument === "--max-states") { options.maxStates = Number(value); index += 1; }
    else if (argument === "--max-memory-mb") { options.maxMemoryMb = Number(value); index += 1; }
    else if (argument === "--transposition-cap") { options.transpositionCap = Number(value); index += 1; }
    else if (argument === "--symmetry-reduction") options.symmetryReduction = true;
    else if (argument === "--no-symmetry-reduction") options.symmetryReduction = false;
    else if (argument === "--relaxed-bound-pruning") options.relaxedBoundPruning = true;
    else if (argument === "--no-relaxed-bound-pruning") options.relaxedBoundPruning = false;
    else if (argument === "--relaxed-bound-root-only") options.relaxedBoundRootOnly = true;
    else if (argument === "--no-relaxed-bound-root-only") options.relaxedBoundRootOnly = false;
    else if (argument === "--relaxed-bound-max-states") { options.relaxedBoundMaxStates = Number(value); index += 1; }
    else if (argument === "--keep-upstream-proof-reports") options.keepUpstreamReports = true;
    else if (argument === "--self-test") options.selfTest = true;
    else if (argument === "--no-write") options.write = false;
    else if (argument === "--help") {
      console.log([
        "Usage: node tools/strict-accept-expanded-density-v5.mjs [options]",
        "  --input <json>                  r141 checkpoint/catalog; or V5_STRICT_INPUT",
        "  --contract <json>               v5 contract path",
        "  --output-dir <dir>              certificate/audit destination",
        "  --levels <spec>                 e.g. 21-40,43",
        "  --max-states <n>                bounded-DFS state cap per positive component",
        "  --max-memory-mb <n>             bounded-DFS RSS guard (<=900)",
        "  --transposition-cap <n>         bounded-DFS transposition cap (<=250000)",
        "  --symmetry-reduction            opt in to upstream proof symmetry reduction",
        "  --relaxed-bound-pruning         opt in to the admissible relaxed-parking bound",
        "  --relaxed-bound-root-only       evaluate the relaxed bound only at each component root",
        "  --relaxed-bound-max-states <n>  per-call relaxed-state cap (<=100000)",
        "  --keep-upstream-proof-reports   keep temporary r140 JSON/CSV/MD reports",
        "  --self-test                     run synthetic three-stage end-to-end test",
        "  --no-write                      print audit only",
      ].join("\n"));
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  for (const [name, value] of Object.entries({
    maxStates: options.maxStates,
    maxMemoryMb: options.maxMemoryMb,
    transpositionCap: options.transpositionCap,
    relaxedBoundMaxStates: options.relaxedBoundMaxStates,
  })) {
    if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${name} must be a positive safe integer.`);
  }
  if (options.maxMemoryMb > 900) throw new Error("--max-memory-mb may not exceed 900.");
  if (options.transpositionCap > 250_000) throw new Error("--transposition-cap may not exceed 250000.");
  if (options.relaxedBoundMaxStates > 100_000) throw new Error("--relaxed-bound-max-states may not exceed 100000.");
  options.selectedIds = parseSelection(options.levels);
  return options;
};

const options = parseArgs(process.argv.slice(2));

const runtimeBundle = await build({
  stdin: {
    contents: `
      import { PuzzleModel, validateLevel } from "./src/core/PuzzleModel.ts";
      export { PuzzleModel, validateLevel };
    `,
    resolveDir: ROOT,
    sourcefile: "strict-expanded-density-v5-runtime.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const runtime = await import(`data:text/javascript;base64,${Buffer.from(runtimeBundle.outputFiles[0].contents).toString("base64")}`);

const normalizeShape = (shape) => {
  const minX = Math.min(...shape.map(([x]) => x));
  const minY = Math.min(...shape.map(([, y]) => y));
  return shape.map(([x, y]) => [x - minX, y - minY])
    .sort((left, right) => left[1] - right[1] || left[0] - right[0])
    .map(([x, y]) => `${x},${y}`).join("|");
};
const shapeIdsBySignature = new Map(SHAPE_ORDER.flatMap((shapeId) => (
  SHAPES[shapeId].map((shape) => [normalizeShape(shape), shapeId])
)));
const shapeIdOf = (shape) => shapeIdsBySignature.get(normalizeShape(shape)) ?? "UNKNOWN";

const playableFor = (level) => level.playable ?? Array.from(
  { length: level.width * level.height },
  (_, index) => [index % level.width, Math.floor(index / level.width)],
);
const maskRows = (level) => {
  const playable = new Set(playableFor(level).map(([x, y]) => keyOf(x, y)));
  return Array.from({ length: level.height }, (_, y) => Array.from(
    { length: level.width },
    (_, x) => playable.has(keyOf(x, y)) ? "#" : ".",
  ).join(""));
};
const histogramFor = (blocks) => {
  const histogram = {};
  for (const block of blocks) {
    const shapeId = shapeIdOf(block.shape);
    histogram[shapeId] = (histogram[shapeId] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(histogram).sort(([left], [right]) => (
    SHAPE_ORDER.indexOf(left) - SHAPE_ORDER.indexOf(right) || left.localeCompare(right)
  )));
};

const replayRoute = (level, route) => {
  if (!Array.isArray(route)) return { replayed: false, complete: false, failed_at: null, reason: "route_not_array" };
  let model;
  try {
    model = new runtime.PuzzleModel(level);
  } catch (error) {
    return { replayed: false, complete: false, failed_at: null, reason: `model_init: ${error.message}` };
  }
  for (let dragIndex = 0; dragIndex < route.length; dragIndex += 1) {
    const drag = route[dragIndex];
    if (!drag || typeof drag.blockId !== "string" || !Array.isArray(drag.path)) {
      return { replayed: false, complete: false, failed_at: dragIndex, reason: "invalid_drag_shape" };
    }
    model.beginAction();
    for (let pathIndex = 0; pathIndex < drag.path.length; pathIndex += 1) {
      const point = drag.path[pathIndex];
      if (!Array.isArray(point) || point.length !== 2 || !model.moveBlock(drag.blockId, point[0], point[1])) {
        return { replayed: false, complete: false, failed_at: dragIndex, reason: `move_failed_at_path_${pathIndex}` };
      }
    }
    if (drag.exitSide) {
      const exited = model.tryExit(drag.blockId, drag.exitSide);
      if (!exited.ok) return { replayed: false, complete: false, failed_at: dragIndex, reason: "exit_failed" };
    }
    if (!model.commitAction()) {
      return { replayed: false, complete: false, failed_at: dragIndex, reason: "action_did_not_mutate" };
    }
  }
  const snapshot = model.snapshot();
  return {
    replayed: snapshot.complete,
    complete: snapshot.complete,
    failed_at: snapshot.complete ? null : route.length,
    reason: snapshot.complete ? null : `${snapshot.blocks.length}_blocks_remain`,
    moves: snapshot.moves,
    cleared: snapshot.cleared,
  };
};

const structureLockAudit = (candidate, contractEntry) => {
  const errors = [];
  const checks = {};
  const check = (name, condition, detail) => {
    checks[name] = Boolean(condition);
    if (!condition) errors.push(`${name}: ${detail}`);
  };
  const level = candidate?.level;
  const target = contractEntry?.our_design_target;
  if (!candidate || !level || !target) {
    return { pass: false, checks, errors: ["candidate, level, or v5 contract target is missing"] };
  }
  const id = Number(contractEntry.level_id.slice(2));
  let validateError = null;
  try { runtime.validateLevel(level); } catch (error) { validateError = error.message; }
  const histogram = histogramFor(level.blocks ?? []);
  const occupied = (level.blocks ?? []).reduce((sum, block) => sum + (block.shape?.length ?? 0), 0);
  const palette = [...new Set((level.blocks ?? []).map((block) => block.color))].sort();
  const targetPalette = [...target.design_palette].sort();
  check("candidate_target_exact_v5", stableJson(candidate.target) === stableJson(target), "candidate.target differs from the authoritative v5 target");
  check("level_id_exact", candidate.level_id === contractEntry.level_id && level.id === id, "candidate/LevelSpec id mismatch");
  check("rows_exact", level.height === target.board.rows, `${level.height} != ${target.board.rows}`);
  check("cols_exact", level.width === target.board.cols, `${level.width} != ${target.board.cols}`);
  check("playable_mask_exact", stableJson(maskRows(level)) === stableJson(target.board.playable_mask), "playable mask mismatch");
  check("playable_cell_count_exact", playableFor(level).length === target.board.playable_cell_count, "playable cell count mismatch");
  check("block_count_exact", level.blocks?.length === target.full_level_block_count, "block count mismatch");
  check("shape_histogram_exact", stableJson(histogram) === stableJson(target.full_level_shape_histogram), "shape histogram mismatch");
  check("known_shape_set", !Object.hasOwn(histogram, "UNKNOWN"), "candidate contains an unsupported shape");
  check("occupied_cell_count_exact", occupied === target.full_level_occupied_cell_count, "occupied cell count mismatch");
  check("color_count_exact", palette.length === target.full_level_color_count, "color count mismatch");
  check("design_palette_exact", stableJson(palette) === stableJson(targetPalette), "palette mismatch");
  check("validate_level", validateError === null, validateError ?? "pass");
  const internalShutters = (level.shutters ?? []).filter((shutter) => shutter.skin === "staging");
  check(
    "required_staging_present",
    !target.requires_staged_reveal || internalShutters.length > 0,
    "v5 target requires staged reveal but no internal staging shutter is present",
  );
  return {
    pass: errors.length === 0,
    checks,
    errors,
    observed: {
      histogram,
      occupied_cell_count: occupied,
      palette,
      playable_mask: maskRows(level),
      internal_staging_shutter_count: internalShutters.length,
    },
  };
};

const uniquePoints = (points) => [...new Map(points.map(([x, y]) => [keyOf(x, y), [x, y]])).values()];
const shutterFootprint = (shutter) => {
  const points = [];
  for (let y = shutter.y; y < shutter.y + shutter.height; y += 1) {
    for (let x = shutter.x; x < shutter.x + shutter.width; x += 1) points.push([x, y]);
  }
  return points;
};

const buildInternalStagePlan = (candidate) => {
  const level = candidate.level;
  const allShutters = level.shutters ?? [];
  const internalShutters = allShutters.filter((shutter) => shutter.skin === "staging");
  const referencedShutters = new Set(level.blocks.filter((block) => block.shutterId).map((block) => block.shutterId));
  if (!internalShutters.length) return { kind: "whole", stages: null, conditions: { internal_staging: false } };
  const errors = [];
  if (internalShutters.length !== allShutters.length) errors.push("mixed internal staging and gameplay shutters are not additive-proof eligible");
  if (level.elevators?.length) errors.push("elevators carry state across stage boundaries");
  if (level.conveyors?.length) errors.push("conveyors carry state across stage boundaries");

  const shutters = [...internalShutters].sort((left, right) => left.count - right.count || left.id.localeCompare(right.id));
  const shutterIds = new Set(shutters.map((shutter) => shutter.id));
  if (shutterIds.size !== shutters.length) errors.push("duplicate internal shutter id");
  for (const shutterId of referencedShutters) {
    if (!shutterIds.has(shutterId)) errors.push(`block references non-internal or missing shutter ${shutterId}`);
  }
  const groups = [level.blocks.filter((block) => !block.shutterId)];
  for (const shutter of shutters) groups.push(level.blocks.filter((block) => block.shutterId === shutter.id));
  if (groups.some((group) => group.length === 0)) errors.push("every internal stage must contain at least one block");
  if (groups.reduce((sum, group) => sum + group.length, 0) !== level.blocks.length) {
    errors.push("some blocks are not assigned to the deterministic stage sequence");
  }
  const clearLoadFor = (group) => group.reduce((sum, block) => sum + (block.layers?.length ?? 1), 0);
  let cumulativeClearLoad = clearLoadFor(groups[0] ?? []);
  const cumulativeCounts = [];
  for (let index = 0; index < shutters.length; index += 1) {
    cumulativeCounts.push(cumulativeClearLoad);
    if (shutters[index].count !== cumulativeClearLoad) {
      errors.push(`${shutters[index].id} count ${shutters[index].count} != cumulative prior clear-load ${cumulativeClearLoad}`);
    }
    cumulativeClearLoad += clearLoadFor(groups[index + 1] ?? []);
  }

  const stageByBlockId = new Map();
  groups.forEach((group, stageIndex) => group.forEach((block) => {
    if (stageByBlockId.has(block.id)) errors.push(`duplicate block id ${block.id}`);
    stageByBlockId.set(block.id, stageIndex);
  }));
  const stageRoutes = groups.map(() => []);
  let phase = 0;
  for (const drag of candidate.route) {
    const stageIndex = stageByBlockId.get(drag.blockId);
    if (stageIndex === undefined) {
      errors.push(`route references unknown block ${drag.blockId}`);
      continue;
    }
    if (stageIndex < phase || stageIndex > phase + 1) {
      errors.push(`route is not a monotone consecutive stage sequence at block ${drag.blockId}`);
      continue;
    }
    if (stageIndex === phase + 1) phase = stageIndex;
    stageRoutes[stageIndex].push(drag);
  }

  if (errors.length) return { kind: "staged", pass: false, errors, stages: [], conditions: {} };
  const baseBlocked = level.blocked ?? [];
  const stages = groups.map((group, stageIndex) => {
    const cumulativePriorClearLoad = stageIndex === 0 ? 0 : cumulativeCounts[stageIndex - 1];
    const stillClosedShutters = shutters.slice(stageIndex);
    const futureCoverFootprint = stillClosedShutters.flatMap(shutterFootprint);
    const stageLevel = clone(level);
    stageLevel.name = `${level.name} strict v5 stage ${stageIndex + 1}`;
    stageLevel.gates = stageLevel.gates.map((gate) => ({
      ...gate,
      frozen: Math.max(0, (gate.frozen ?? 0) - cumulativePriorClearLoad),
    }));
    stageLevel.blocks = group.map((block) => {
      const copy = clone(block);
      delete copy.shutterId;
      copy.frozen = Math.max(0, (copy.frozen ?? 0) - cumulativePriorClearLoad);
      return copy;
    });
    const blocked = uniquePoints([...baseBlocked, ...futureCoverFootprint]);
    if (blocked.length) stageLevel.blocked = blocked;
    else delete stageLevel.blocked;
    delete stageLevel.shutters;
    delete stageLevel.elevators;
    delete stageLevel.conveyors;
    delete stageLevel.designTargets;
    delete stageLevel.onboardingHint;
    delete stageLevel.strategyNudge;
    delete stageLevel.strategyFocus;
    let validateError = null;
    try { runtime.validateLevel(stageLevel); } catch (error) { validateError = error.message; }
    const replay = validateError ? { replayed: false, complete: false, reason: validateError } : replayRoute(stageLevel, stageRoutes[stageIndex]);
    return {
      index: stageIndex + 1,
      source_shutter_id: stageIndex === 0 ? null : shutters[stageIndex - 1].id,
      block_count: group.length,
      counter_clear_load: clearLoadFor(group),
      cumulative_prior_clear_load: cumulativePriorClearLoad,
      still_closed_shutter_ids: stillClosedShutters.map((shutter) => shutter.id),
      still_closed_cover_footprint: uniquePoints(futureCoverFootprint),
      level: stageLevel,
      level_spec_sha256: sha256(stableJson(stageLevel)),
      route: stageRoutes[stageIndex],
      route_metrics: routeMetrics(stageRoutes[stageIndex]),
      route_sha256: sha256(stableJson(stageRoutes[stageIndex])),
      validate_level: validateError === null,
      validate_error: validateError,
      replay,
    };
  });
  for (const stage of stages) {
    if (!stage.validate_level) errors.push(`stage ${stage.index} validateLevel failed: ${stage.validate_error}`);
    if (!stage.replay.replayed) errors.push(`stage ${stage.index} route replay failed: ${stage.replay.reason}`);
  }
  return {
    kind: "staged",
    pass: errors.length === 0,
    errors,
    stages,
    ordered_shutters: shutters.map((shutter, index) => ({
      id: shutter.id,
      count: shutter.count,
      expected_cumulative_prior_clear_load: cumulativeCounts[index],
      footprint: shutterFootprint(shutter),
    })),
    conditions: {
      internal_staging_only: internalShutters.length === allShutters.length,
      cumulative_shutter_counts_equal_prior_clear_load: errors.every((error) => !error.includes("cumulative prior clear-load")),
      previous_stage_fully_clears: stages.every((stage) => stage.replay.complete),
      hidden_future_blocks_removed_from_component: true,
      every_still_closed_cover_footprint_blocked: true,
      opened_cover_footprints_not_blocked_by_stage_rule: true,
      shared_gate_counters_normalized_by_cumulative_prior_clear_load: true,
      hidden_block_counters_normalized_by_cumulative_prior_clear_load: true,
      dynamic_state_carriers_absent: !(level.elevators?.length || level.conveyors?.length),
      additive_objective: "non-exit drag counts are independent across deterministic empty-board stage boundaries",
    },
  };
};

const deterministicFloorAllocation = (target, stages, candidate) => {
  const capacities = stages.map((stage) => stage.route_metrics.repositions);
  const requested = candidate.audit?.strict_stage_floor_allocation;
  if (requested !== undefined) {
    if (!Array.isArray(requested) || requested.length !== stages.length
      || requested.some((value, index) => !Number.isSafeInteger(value) || value < 0 || value > capacities[index])
      || requested.reduce((sum, value) => sum + value, 0) < target) {
      return { pass: false, error: "candidate.audit.strict_stage_floor_allocation is invalid or below target", capacities };
    }
    return { pass: true, floors: [...requested], capacities, source: "candidate.audit.strict_stage_floor_allocation" };
  }
  const totalCapacity = capacities.reduce((sum, value) => sum + value, 0);
  if (totalCapacity < target) {
    return { pass: false, error: `replayed stage witnesses cap the floor at ${totalCapacity}, below target ${target}`, capacities };
  }
  if (target === 0) return { pass: true, floors: capacities.map(() => 0), capacities, source: "trivial_zero_target" };
  const floors = capacities.map((capacity) => Math.floor(target * capacity / totalCapacity));
  let remaining = target - floors.reduce((sum, value) => sum + value, 0);
  const ranking = capacities.map((capacity, index) => ({
    index,
    remainder: (target * capacity) % totalCapacity,
    spare: capacity - floors[index],
  })).filter((entry) => entry.spare > 0)
    .sort((left, right) => right.remainder - left.remainder || right.spare - left.spare || left.index - right.index);
  let cursor = 0;
  while (remaining > 0 && ranking.length) {
    const entry = ranking[cursor % ranking.length];
    if (floors[entry.index] < capacities[entry.index]) {
      floors[entry.index] += 1;
      remaining -= 1;
    }
    cursor += 1;
  }
  if (remaining !== 0) return { pass: false, error: "unable to allocate target within replayed stage capacities", capacities };
  return { pass: true, floors, capacities, source: "deterministic_largest_remainder_over_stage_witness_capacities" };
};

const runProcess = (args) => new Promise((resolveProcess, rejectProcess) => {
  const child = spawn(process.execPath, args, { cwd: ROOT, env: process.env, stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
  child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
  child.on("error", rejectProcess);
  child.on("close", (code, signal) => {
    if (code === 0) resolveProcess({ stdout, stderr });
    else rejectProcess(new Error(`bounded-DFS exited ${code ?? "null"}${signal ? ` (${signal})` : ""}\n${stdout}\n${stderr}`));
  });
});

const proofVerdict = (entry) => {
  if (!entry?.available) return { code: "I", accepted: false, status: "missing_proof_entry" };
  const proof = entry.proof ?? {};
  if (proof.floor_disproven === true) return { code: "D", accepted: false, status: "floor_disproven" };
  const certified = proof.lower_bound_statement_proven === true
    && entry.certification?.target_floor_certified_for_playable_level === true
    && entry.selected_solution_witness?.replay?.replayed === true;
  if (certified) return { code: "C", accepted: true, status: "floor_certified" };
  return { code: "I", accepted: false, status: proof.status ?? "inconclusive_or_uncertified" };
};

const trivialCertificate = ({ stage, targetFloor }) => ({
  component_index: stage.index,
  target_reposition_overhead: targetFloor,
  verdict: "C",
  accepted: true,
  certificate_kind: "trivial_zero_lower_bound",
  proof_status: "trivial_zero_lower_bound",
  lower_bound_statement_proven: true,
  level_spec_sha256: stage.level_spec_sha256,
  witness_route_sha256: stage.route_sha256,
  witness_metrics: stage.route_metrics,
  witness_replay: stage.replay,
  proof_tool_sha256: null,
  proof_report: null,
  proof_report_sha256: null,
  explored_states: 0,
});

const configuredCoreGroups = (candidate, stageIndex) => {
  const groups = candidate.audit?.strict_core_floor_groups;
  if (!Array.isArray(groups)) return [];
  return groups.filter((group) => group?.stage_index === stageIndex);
};

const relaxedCoreLevel = (stageLevel, blockIds) => {
  const selected = new Set(blockIds);
  const level = clone(stageLevel);
  level.name = `${stageLevel.name} monotone relaxed core`;
  level.blocks = level.blocks.filter((block) => selected.has(block.id)).map((block) => ({
    ...block,
    frozen: 0,
  }));
  level.gates = level.gates.map((gate) => ({ ...gate, frozen: 0 }));
  delete level.shutters;
  delete level.elevators;
  delete level.conveyors;
  delete level.designTargets;
  delete level.onboardingHint;
  delete level.strategyNudge;
  delete level.strategyFocus;
  return level;
};

const runBoundedProof = async ({ candidate, target, level, route, componentLabel, outputDir }) => {
  const levelId = candidate.level_id;
  const numericId = Number(levelId.slice(2));
  const levelHash = sha256(stableJson(level));
  const routeHash = sha256(stableJson(route));
  const safeComponent = componentLabel.replace(/[^a-zA-Z0-9_-]+/g, "-");
  const artifactStem = `${levelId.toLowerCase()}-${safeComponent}-floor-${target}-${levelHash.slice(0, 12)}`;
  const artifactDir = resolve(outputDir, "artifacts");
  await mkdir(artifactDir, { recursive: true });
  const inputPath = resolve(artifactDir, `${artifactStem}-input.json`);
  const witnessPath = resolve(artifactDir, `${artifactStem}-witness.json`);
  const proofCandidate = {
    level_id: levelId,
    target: {
      ...clone(candidate.target),
      recommended_minimum_reposition_overhead: target,
    },
    audit: {
      ...(candidate.audit ?? {}),
      target_reposition_overhead: target,
      strict_v5_component: componentLabel,
    },
    level,
    route,
  };
  const inputBytes = Buffer.from(`${JSON.stringify({
    title: "v5 strict component proof input",
    applied_to_live_campaign: false,
    levels: [proofCandidate],
  }, null, 2)}\n`, "utf8");
  const witnessBytes = Buffer.from(`${JSON.stringify([{ level_id: levelId, drags: route }], null, 2)}\n`, "utf8");
  await Promise.all([writeFile(inputPath, inputBytes), writeFile(witnessPath, witnessBytes)]);

  const reportTag = `v5-strict-${safeComponent}-${levelHash.slice(0, 10)}-${routeHash.slice(0, 8)}`;
  const selectionTag = `lv${String(numericId).padStart(3, "0")}`;
  const upstreamStem = `reposition-lower-bound-report-${reportTag}-${selectionTag}`;
  const upstreamJsonPath = resolve(UPSTREAM_REPORT_DIR, `${upstreamStem}.json`);
  const upstreamCsvPath = resolve(UPSTREAM_REPORT_DIR, `${upstreamStem}.csv`);
  const upstreamMarkdownPath = resolve(UPSTREAM_REPORT_DIR, `${upstreamStem}.md`);
  const args = [
    `--max-old-space-size=${Math.min(1_000, options.maxMemoryMb + 100)}`,
    "--expose-gc",
    UPSTREAM_PROOF,
    "--input", inputPath,
    "--witnesses", witnessPath,
    "--report-tag", reportTag,
    "--levels", String(numericId),
    "--algorithm", "bounded-dfs",
    "--max-states", String(options.maxStates),
    "--max-memory-mb", String(options.maxMemoryMb),
    "--transposition-cap", String(options.transpositionCap),
    "--validation-max-states", "1000",
    "--skip-official",
    "--stop-after-floor",
    options.symmetryReduction ? "--symmetry-reduction" : "--no-symmetry-reduction",
    options.relaxedBoundPruning ? "--relaxed-bound-pruning" : "--no-relaxed-bound-pruning",
  ];
  if (options.relaxedBoundPruning) {
    args.push("--relaxed-bound-max-states", String(options.relaxedBoundMaxStates));
    args.push(options.relaxedBoundRootOnly ? "--relaxed-bound-root-only" : "--no-relaxed-bound-root-only");
  }
  const child = await runProcess(args);
  const upstreamBytes = await readFile(upstreamJsonPath);
  const report = JSON.parse(upstreamBytes.toString("utf8"));
  const proofEntry = report.reports?.find((entry) => entry.level_id === levelId) ?? null;
  const verdict = proofVerdict(proofEntry);
  const copiedReportPath = resolve(artifactDir, `${artifactStem}-proof-report.json`);
  await writeFile(copiedReportPath, upstreamBytes);
  if (!options.keepUpstreamReports) {
    await Promise.all([
      rm(upstreamJsonPath, { force: true }),
      rm(upstreamCsvPath, { force: true }),
      rm(upstreamMarkdownPath, { force: true }),
    ]);
  }
  return {
    target_reposition_overhead: target,
    verdict: verdict.code,
    accepted: verdict.accepted,
    certificate_kind: "bounded_dfs_lower_bound",
    proof_status: proofEntry?.proof?.status ?? verdict.status,
    lower_bound_statement_proven: proofEntry?.proof?.lower_bound_statement_proven === true,
    level_spec_sha256: levelHash,
    witness_route_sha256: routeHash,
    witness_metrics: routeMetrics(route),
    witness_replay: replayRoute(level, route),
    proof_tool: posixRelative(UPSTREAM_PROOF),
    proof_tool_sha256: sha256(await readFile(UPSTREAM_PROOF)),
    proof_input: posixRelative(inputPath),
    proof_input_sha256: sha256(inputBytes),
    witness_input: posixRelative(witnessPath),
    witness_input_sha256: sha256(witnessBytes),
    proof_report: posixRelative(copiedReportPath),
    proof_report_sha256: sha256(upstreamBytes),
    explored_states: proofEntry?.proof?.explored_states ?? 0,
    peak_rss_mb: proofEntry?.proof?.peak_rss_mb ?? null,
    proof_entry: proofEntry,
    child_stdout: child.stdout.trim(),
    child_stderr: child.stderr.trim(),
  };
};

const runCoreGroupProof = async ({ candidate, stage, targetFloor, outputDir }) => {
  const requested = configuredCoreGroups(candidate, stage.index);
  if (!requested.length) return null;
  const stageBlockIds = new Set(stage.level.blocks.map((block) => block.id));
  const used = new Set();
  const errors = [];
  let requestedFloor = 0;
  for (let index = 0; index < requested.length; index += 1) {
    const group = requested[index];
    if (!Array.isArray(group.block_ids) || group.block_ids.length === 0
      || new Set(group.block_ids).size !== group.block_ids.length) {
      errors.push(`core group ${index + 1} block_ids must be a non-empty unique array`);
      continue;
    }
    if (!Number.isSafeInteger(group.target_reposition_overhead) || group.target_reposition_overhead <= 0) {
      errors.push(`core group ${index + 1} target_reposition_overhead must be positive`);
    }
    for (const blockId of group.block_ids) {
      if (!stageBlockIds.has(blockId)) errors.push(`core group ${index + 1} references non-stage block ${blockId}`);
      if (used.has(blockId)) errors.push(`core block ${blockId} appears in more than one additive group`);
      used.add(blockId);
    }
    requestedFloor += Number.isSafeInteger(group.target_reposition_overhead) ? group.target_reposition_overhead : 0;
  }
  if (requestedFloor < targetFloor) errors.push(`core group floor sum ${requestedFloor} is below component target ${targetFloor}`);
  if (stage.level.elevators?.length || stage.level.conveyors?.length || stage.level.shutters?.length) {
    errors.push("core relaxation does not support dynamic state carriers or shutters");
  }
  if (errors.length) {
    return {
      component_index: stage.index,
      target_reposition_overhead: targetFloor,
      verdict: "I",
      accepted: false,
      certificate_kind: "invalid_monotone_block_removal_core_sum",
      proof_status: "invalid_core_group_configuration",
      lower_bound_statement_proven: false,
      errors,
      core_groups: [],
    };
  }

  const coreGroups = [];
  for (let index = 0; index < requested.length; index += 1) {
    const group = requested[index];
    const blockIds = [...group.block_ids];
    const coreLevel = relaxedCoreLevel(stage.level, blockIds);
    let validateError = null;
    try { runtime.validateLevel(coreLevel); } catch (error) { validateError = error.message; }
    const coreRoute = Array.isArray(group.route)
      ? clone(group.route)
      : stage.route.filter((drag) => used.has(drag.blockId) && blockIds.includes(drag.blockId));
    const coreReplay = validateError ? { replayed: false, complete: false, reason: validateError } : replayRoute(coreLevel, coreRoute);
    if (!coreReplay.replayed) {
      coreGroups.push({
        group_index: index + 1,
        block_ids: blockIds,
        target_reposition_overhead: group.target_reposition_overhead,
        verdict: "I",
        accepted: false,
        proof_status: "core_projected_route_did_not_replay",
        validate_error: validateError,
        witness_replay: coreReplay,
      });
      break;
    }
    const proof = await runBoundedProof({
      candidate,
      target: group.target_reposition_overhead,
      level: coreLevel,
      route: coreRoute,
      componentLabel: `stage-${String(stage.index).padStart(2, "0")}-core-${String(index + 1).padStart(2, "0")}`,
      outputDir,
    });
    coreGroups.push({
      group_index: index + 1,
      block_ids: blockIds,
      relaxation: {
        all_non_core_blocks_removed: true,
        block_and_gate_frozen_counters_reset_to_zero: true,
        static_playable_mask_and_blocked_cells_preserved: true,
        shell_layers_and_star_constraints_preserved: true,
      },
      ...proof,
    });
    if (!proof.accepted) break;
  }
  const everyGroupCertified = coreGroups.length === requested.length && coreGroups.every((group) => group.verdict === "C");
  const certifiedFloor = coreGroups.filter((group) => group.verdict === "C")
    .reduce((sum, group) => sum + group.target_reposition_overhead, 0);
  const accepted = everyGroupCertified && certifiedFloor >= targetFloor;
  return {
    component_index: stage.index,
    target_reposition_overhead: targetFloor,
    verdict: accepted ? "C" : coreGroups.some((group) => group.verdict === "D") ? "D" : "I",
    accepted,
    certificate_kind: "monotone_block_removal_core_sum",
    proof_status: accepted ? "core_group_lower_bounds_certified" : coreGroups.some((group) => group.verdict === "D")
      ? "core_group_floor_disproven" : "core_group_inconclusive",
    lower_bound_statement_proven: accepted,
    certified_core_lower_bound: certifiedFloor,
    disjoint_core_block_ids: [...used].sort(),
    core_groups: coreGroups,
    explored_states: coreGroups.reduce((sum, group) => sum + (group.explored_states ?? 0), 0),
    proof_invariant: "Removing non-core blocks and thawing counters is a relaxation. Any full solution projects to each disjoint core with no more reposition actions; disjoint block-action counts therefore add.",
  };
};

const evaluateCandidate = async ({ candidate, contractEntry, outputDir }) => {
  const candidateSha = candidate?.level ? sha256(stableJson(candidate.level)) : null;
  const structure = structureLockAudit(candidate, contractEntry);
  const base = {
    level_id: contractEntry?.level_id ?? candidate?.level_id ?? "unknown",
    candidate_sha256: candidateSha,
    target_reposition_overhead: contractEntry?.our_design_target?.recommended_minimum_reposition_overhead ?? null,
    structure_lock: structure,
  };
  if (!structure.pass) return { ...base, accepted: false, status: "rejected_structure_lock" };
  const fullReplay = replayRoute(candidate.level, candidate.route);
  const fullRouteMetrics = routeMetrics(candidate.route);
  if (!fullReplay.replayed) {
    return { ...base, accepted: false, status: "rejected_full_route_replay", full_route: { metrics: fullRouteMetrics, replay: fullReplay } };
  }
  const targetValue = contractEntry.our_design_target.recommended_minimum_reposition_overhead;
  const target = targetValue === null ? 0 : targetValue;
  if (!Number.isSafeInteger(target) || target < 0) {
    return { ...base, accepted: false, status: "rejected_invalid_contract_floor", full_route: { metrics: fullRouteMetrics, replay: fullReplay } };
  }
  const plan = buildInternalStagePlan(candidate);
  if (plan.kind === "staged") {
    if (!plan.pass) {
      return { ...base, accepted: false, status: "rejected_internal_stage_plan", full_route: { metrics: fullRouteMetrics, replay: fullReplay }, stage_plan: plan };
    }
    const allocation = deterministicFloorAllocation(target, plan.stages, candidate);
    if (!allocation.pass) {
      return {
        ...base,
        accepted: false,
        status: "rejected_replayed_upper_bound_below_target",
        full_route: { metrics: fullRouteMetrics, replay: fullReplay },
        stage_plan: plan,
        floor_allocation: allocation,
      };
    }
    const components = [];
    for (let index = 0; index < plan.stages.length; index += 1) {
      const stage = plan.stages[index];
      const floor = allocation.floors[index];
      const coreComponent = floor > 0
        ? await runCoreGroupProof({ candidate, stage, targetFloor: floor, outputDir })
        : null;
      const component = floor === 0
        ? trivialCertificate({ stage, targetFloor: floor })
        : coreComponent ?? {
          component_index: stage.index,
          ...await runBoundedProof({
            candidate,
            target: floor,
            level: stage.level,
            route: stage.route,
            componentLabel: `stage-${String(stage.index).padStart(2, "0")}`,
            outputDir,
          }),
        };
      components.push(component);
      if (!component.accepted) break;
    }
    const everyComponentCertified = components.length === plan.stages.length && components.every((component) => component.verdict === "C");
    const certifiedLowerBound = components.filter((component) => component.verdict === "C")
      .reduce((sum, component) => sum + component.target_reposition_overhead, 0);
    const accepted = everyComponentCertified && certifiedLowerBound >= target && fullReplay.replayed;
    return {
      ...base,
      accepted,
      status: accepted ? "strict_v5_stage_additive_floor_certified" : components.some((component) => component.verdict === "D")
        ? "rejected_component_floor_disproven" : "rejected_component_inconclusive",
      full_route: { metrics: fullRouteMetrics, replay: fullReplay, route_sha256: sha256(stableJson(candidate.route)) },
      proof_mode: "internal_staging_additive",
      stage_plan: {
        ...plan,
        stages: plan.stages.map(({ level, route, ...stage }) => stage),
      },
      floor_allocation: allocation,
      certified_additive_lower_bound: certifiedLowerBound,
      components,
      certificate_rule: "Every component is C, component floors sum to at least the v5 target, every component witness replays, and the full route replays.",
    };
  }

  if (target === 0) {
    return {
      ...base,
      accepted: true,
      status: targetValue === null ? "strict_v5_structure_playability_certified_no_floor_target" : "strict_v5_trivial_zero_floor_certified",
      proof_mode: "whole_level_trivial_zero",
      certified_additive_lower_bound: 0,
      full_route: { metrics: fullRouteMetrics, replay: fullReplay, route_sha256: sha256(stableJson(candidate.route)) },
      components: [{
        component_index: 1,
        target_reposition_overhead: 0,
        verdict: "C",
        accepted: true,
        certificate_kind: "trivial_zero_lower_bound",
        proof_status: "trivial_zero_lower_bound",
        lower_bound_statement_proven: true,
        level_spec_sha256: candidateSha,
        witness_route_sha256: sha256(stableJson(candidate.route)),
        witness_metrics: fullRouteMetrics,
        witness_replay: fullReplay,
      }],
    };
  }

  const wholeCore = await runCoreGroupProof({
    candidate,
    stage: {
      index: 1,
      level: candidate.level,
      route: candidate.route,
      level_spec_sha256: candidateSha,
      route_sha256: sha256(stableJson(candidate.route)),
      route_metrics: fullRouteMetrics,
      replay: fullReplay,
    },
    targetFloor: target,
    outputDir,
  });
  if (wholeCore) {
    const accepted = wholeCore.verdict === "C" && wholeCore.accepted;
    return {
      ...base,
      accepted,
      status: accepted ? "strict_v5_whole_floor_certified_by_monotone_cores" : wholeCore.verdict === "D"
        ? "rejected_whole_core_floor_disproven" : "rejected_whole_core_floor_inconclusive",
      proof_mode: "whole_level_monotone_core_sum",
      certified_additive_lower_bound: accepted ? wholeCore.certified_core_lower_bound : 0,
      full_route: { metrics: fullRouteMetrics, replay: fullReplay, route_sha256: sha256(stableJson(candidate.route)) },
      components: [wholeCore],
      certificate_rule: "Every disjoint relaxed core lower bound is certified; removing non-core blocks and thawing counters cannot make the core harder, so projected block-action lower bounds add.",
    };
  }

  const proof = await runBoundedProof({
    candidate,
    target,
    level: candidate.level,
    route: candidate.route,
    componentLabel: "whole-level",
    outputDir,
  });
  return {
    ...base,
    accepted: proof.accepted,
    status: proof.accepted ? "strict_v5_whole_floor_certified" : proof.verdict === "D"
      ? "rejected_whole_floor_disproven" : "rejected_whole_floor_inconclusive",
    proof_mode: "whole_level_bounded_dfs",
    certified_additive_lower_bound: proof.accepted ? target : 0,
    full_route: { metrics: fullRouteMetrics, replay: fullReplay, route_sha256: sha256(stableJson(candidate.route)) },
    components: [{ component_index: 1, ...proof }],
  };
};

const syntheticThreeStageFixture = () => {
  const playable = [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]];
  const target = {
    generation_locks: [
      "board.rows", "board.cols", "board.playable_cell_count", "board.playable_mask",
      "full_level_block_count", "full_level_shape_histogram", "full_level_color_count", "design_palette",
    ],
    board: { rows: 2, cols: 3, playable_cell_count: 6, playable_mask: ["###", "###"] },
    full_level_block_count: 4,
    full_level_shape_histogram: { SINGLE: 3, SQ2: 1 },
    full_level_occupied_cell_count: 7,
    requires_staged_reveal: true,
    full_level_color_count: 3,
    design_palette: ["red", "blue", "yellow"],
    target_d1_difficulty: { calibrated_score: 70 },
    recommended_minimum_reposition_overhead: 1,
    field_provenance: {},
    solver_acceptance: { minimum_reposition_overhead: 1 },
  };
  const level = {
    id: 9001,
    name: "Synthetic three-stage additive proof",
    difficulty: "hard",
    timeSeconds: 150,
    reward: 1,
    width: 3,
    height: 2,
    playable,
    gates: [
      { id: "gate-blue", side: "top", offset: 0, size: 2, color: "blue" },
      { id: "gate-yellow", side: "top", offset: 2, size: 1, color: "yellow" },
      { id: "gate-red", side: "bottom", offset: 0, size: 1, color: "red" },
    ],
    blocks: [
      { id: "stage1-red", x: 0, y: 0, shape: [[0, 0]], color: "red" },
      { id: "stage1-blue", x: 0, y: 1, shape: [[0, 0]], color: "blue" },
      { id: "stage2-blue-square", x: 0, y: 0, shape: [[0, 0], [1, 0], [0, 1], [1, 1]], color: "blue", shutterId: "stage-2" },
      { id: "stage3-yellow", x: 2, y: 0, shape: [[0, 0]], color: "yellow", shutterId: "stage-3" },
    ],
    shutters: [
      { id: "stage-2", x: 1, y: 1, width: 1, height: 1, count: 2, skin: "staging" },
      { id: "stage-3", x: 2, y: 1, width: 1, height: 1, count: 3, skin: "staging" },
    ],
  };
  const route = [
    { blockId: "stage1-red", path: [[1, 0]] },
    { blockId: "stage1-blue", path: [[0, 0]], exitSide: "top" },
    { blockId: "stage1-red", path: [[0, 0], [0, 1]], exitSide: "bottom" },
    { blockId: "stage2-blue-square", path: [], exitSide: "top" },
    { blockId: "stage3-yellow", path: [], exitSide: "top" },
  ];
  return {
    contractEntry: { level_id: "Lv9001", our_design_target: target },
    candidate: { level_id: "Lv9001", target: clone(target), audit: {}, level, route },
  };
};

const runSelfTest = async () => {
  const fixture = syntheticThreeStageFixture();
  const outputDir = resolve(options.outputDir, "self-test-artifacts");
  const result = await evaluateCandidate({ ...fixture, outputDir });
  const coreCandidate = clone(fixture.candidate);
  coreCandidate.audit.strict_core_floor_groups = [{
    stage_index: 1,
    block_ids: ["stage1-red", "stage1-blue"],
    target_reposition_overhead: 1,
  }];
  const coreResult = await evaluateCandidate({ candidate: coreCandidate, contractEntry: fixture.contractEntry, outputDir });
  const overlappingCoreCandidate = clone(coreCandidate);
  overlappingCoreCandidate.audit.strict_core_floor_groups.push({
    stage_index: 1,
    block_ids: ["stage1-red"],
    target_reposition_overhead: 1,
  });
  const overlappingCoreResult = await evaluateCandidate({
    candidate: overlappingCoreCandidate,
    contractEntry: fixture.contractEntry,
    outputDir,
  });
  const frozenCounterCandidate = clone(fixture.candidate);
  frozenCounterCandidate.level.gates.find((gate) => gate.id === "gate-yellow").frozen = 3;
  frozenCounterCandidate.level.blocks.find((block) => block.id === "stage2-blue-square").frozen = 2;
  const frozenCounterResult = await evaluateCandidate({
    candidate: frozenCounterCandidate,
    contractEntry: fixture.contractEntry,
    outputDir,
  });
  const frozenCounterPlan = buildInternalStagePlan(frozenCounterCandidate);
  const plan = buildInternalStagePlan(fixture.candidate);
  const badCountCandidate = clone(fixture.candidate);
  badCountCandidate.level.shutters[1].count = 2;
  const badCountPlan = buildInternalStagePlan(badCountCandidate);
  const badStructureCandidate = clone(fixture.candidate);
  badStructureCandidate.level.blocks.pop();
  const badStructure = structureLockAudit(badStructureCandidate, fixture.contractEntry);
  const checks = {
    fixture_validate_level: result.structure_lock.checks.validate_level === true,
    fixture_full_route_replays: result.full_route?.replay?.replayed === true,
    exactly_three_stages: plan.stages?.length === 3,
    cumulative_counts_are_2_and_3: stableJson(plan.ordered_shutters?.map((shutter) => shutter.count)) === stableJson([2, 3]),
    future_covers_blocked_2_1_0: stableJson(plan.stages?.map((stage) => stage.still_closed_cover_footprint.length)) === stableJson([2, 1, 0]),
    every_stage_witness_replays: plan.stages?.every((stage) => stage.replay.replayed) === true,
    deterministic_floor_allocation_1_0_0: stableJson(result.floor_allocation?.floors) === stableJson([1, 0, 0]),
    positive_component_uses_bounded_dfs: result.components?.[0]?.certificate_kind === "bounded_dfs_lower_bound",
    zero_components_are_trivial: result.components?.slice(1).every((component) => component.certificate_kind === "trivial_zero_lower_bound") === true,
    every_component_certified: result.components?.every((component) => component.verdict === "C") === true,
    additive_floor_reaches_target: result.certified_additive_lower_bound === 1,
    candidate_strictly_accepted: result.accepted === true,
    monotone_core_candidate_strictly_accepted: coreResult.accepted === true
      && coreResult.components?.[0]?.certificate_kind === "monotone_block_removal_core_sum",
    overlapping_core_groups_rejected: overlappingCoreResult.accepted === false
      && overlappingCoreResult.components?.[0]?.proof_status === "invalid_core_group_configuration",
    deterministic_frozen_counters_are_stage_normalized: frozenCounterResult.accepted === true
      && frozenCounterPlan.pass === true
      && frozenCounterPlan.stages?.[2]?.level.gates.find((gate) => gate.id === "gate-yellow")?.frozen === 0
      && frozenCounterPlan.stages?.[1]?.level.blocks.find((block) => block.id === "stage2-blue-square")?.frozen === 0,
    malformed_cumulative_count_rejected: badCountPlan.pass === false,
    structure_mismatch_rejected: badStructure.pass === false,
  };
  const pass = Object.values(checks).every(Boolean);
  const report = {
    title: "Synthetic three-stage v5 strict acceptance self-test",
    generated_at: new Date().toISOString(),
    status: pass ? "pass" : "fail",
    checks,
    fixture: {
      candidate_sha256: sha256(stableJson(fixture.candidate.level)),
      route_sha256: sha256(stableJson(fixture.candidate.route)),
      target_reposition_overhead: 1,
    },
    certificate: result,
    negative_cases: {
      malformed_cumulative_count_errors: badCountPlan.errors,
      structure_mismatch_errors: badStructure.errors,
    },
    tool_sha256: sha256(await readFile(TOOL_PATH)),
    upstream_proof_sha256: sha256(await readFile(UPSTREAM_PROOF)),
  };
  if (options.write) {
    await mkdir(options.outputDir, { recursive: true });
    await writeFile(resolve(options.outputDir, "synthetic-three-stage-self-test.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }
  console.log(JSON.stringify({ status: report.status, checks, certificate_status: result.status }, null, 2));
  if (!pass) process.exitCode = 2;
};

const normalizeCandidates = (input) => {
  if (Array.isArray(input)) return input;
  if (input?.candidate) return [input.candidate];
  if (Array.isArray(input?.levels)) return input.levels;
  if (Array.isArray(input?.candidates)) return input.candidates.map((entry) => entry.candidate ?? entry);
  throw new Error("Input must be a checkpoint with candidate, an array, or an object with levels/candidates.");
};

const runMain = async () => {
  if (!options.input) throw new Error("--input or V5_STRICT_INPUT is required unless --self-test is used.");
  const [inputBytes, contractBytes, toolBytes, proofBytes] = await Promise.all([
    readFile(options.input),
    readFile(options.contract),
    readFile(TOOL_PATH),
    readFile(UPSTREAM_PROOF),
  ]);
  const input = JSON.parse(inputBytes.toString("utf8"));
  const contract = JSON.parse(contractBytes.toString("utf8"));
  if (!Array.isArray(contract.levels) || contract.levels.length !== 100) throw new Error("The authoritative v5 contract must contain 100 levels.");
  const contractById = new Map(contract.levels.map((entry) => [entry.level_id, entry]));
  const candidates = normalizeCandidates(input).filter((candidate) => {
    if (!options.selectedIds) return true;
    return options.selectedIds.has(Number(candidate.level_id?.slice(2)));
  });
  if (!candidates.length) throw new Error("No candidates matched the requested selection.");
  const duplicateIds = candidates.map((candidate) => candidate.level_id)
    .filter((levelId, index, ids) => ids.indexOf(levelId) !== index);
  if (duplicateIds.length) throw new Error(`Duplicate candidate levels: ${[...new Set(duplicateIds)].join(", ")}`);
  await mkdir(options.outputDir, { recursive: true });
  const decisions = [];
  for (const candidate of candidates) {
    const contractEntry = contractById.get(candidate.level_id);
    if (!contractEntry) {
      decisions.push({ level_id: candidate.level_id ?? "unknown", accepted: false, status: "rejected_missing_v5_contract_entry" });
      continue;
    }
    try {
      const decision = await evaluateCandidate({ candidate, contractEntry, outputDir: options.outputDir });
      decisions.push(decision);
      console.log(`${decision.level_id}: ${decision.status}`);
    } catch (error) {
      decisions.push({
        level_id: candidate.level_id,
        candidate_sha256: candidate.level ? sha256(stableJson(candidate.level)) : null,
        accepted: false,
        status: "rejected_tool_error",
        error: error.stack ?? error.message,
      });
      console.error(`${candidate.level_id}: ${error.message}`);
    }
  }

  const generatedAt = new Date().toISOString();
  const accepted = decisions.filter((decision) => decision.accepted);
  const catalog = {
    title: "Block Out! v5 strict necessary-reposition certificate catalog",
    generated_at: generatedAt,
    status: "strict_certificates_only",
    applied_to_live_campaign: false,
    source_candidate_input: { path: posixRelative(options.input), sha256: sha256(inputBytes) },
    source_contract: { path: posixRelative(options.contract), sha256: sha256(contractBytes) },
    verifier: { path: posixRelative(TOOL_PATH), sha256: sha256(toolBytes) },
    bounded_dfs: { path: posixRelative(UPSTREAM_PROOF), sha256: sha256(proofBytes) },
    levels: accepted.map((decision) => ({
      level_id: decision.level_id,
      candidate_sha256: decision.candidate_sha256,
      target_reposition_overhead: decision.target_reposition_overhead,
      proof_mode: decision.proof_mode,
      certified_lower_bound: decision.certified_additive_lower_bound,
      full_route: decision.full_route,
      stage_plan: decision.stage_plan,
      floor_allocation: decision.floor_allocation,
      components: decision.components,
      status: decision.status,
    })),
  };
  const catalogBytes = Buffer.from(`${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  const audit = {
    title: "Block Out! v5 strict acceptance audit",
    generated_at: generatedAt,
    status: decisions.every((decision) => decision.accepted) ? "pass" : "rejected_candidates_present",
    applied_to_live_campaign: false,
    source_candidate_input: catalog.source_candidate_input,
    source_contract: catalog.source_contract,
    verifier: catalog.verifier,
    bounded_dfs: catalog.bounded_dfs,
    parameters: {
      max_states_per_positive_component: options.maxStates,
      max_memory_mb: options.maxMemoryMb,
      transposition_cap: options.transpositionCap,
      symmetry_reduction: options.symmetryReduction,
      relaxed_bound_pruning: options.relaxedBoundPruning,
      relaxed_bound_root_only: options.relaxedBoundRootOnly,
      relaxed_bound_max_states: options.relaxedBoundMaxStates,
      zero_floor_certificate: "trivial and explicit",
      positive_floor_certificate: "existing bounded-DFS",
    },
    acceptance_rule: {
      structure: "All authoritative v5 locks, validateLevel and full PuzzleModel route replay must pass.",
      internal_staging: "Order stages by cumulative shutter clear-load; normalize frozen gate/block counters by prior clears; remove hidden blocks; block every still-closed cover footprint; replay every stage witness.",
      floor: "All selected component proofs must be C and their floors must sum to at least the contract target. Any D or I rejects.",
      whole_level: "Candidates without internal staging use the existing bounded-DFS proof over the whole LevelSpec.",
    },
    counts: {
      requested: decisions.length,
      accepted: accepted.length,
      rejected: decisions.length - accepted.length,
      staged_additive: decisions.filter((decision) => decision.proof_mode === "internal_staging_additive").length,
      whole_level: decisions.filter((decision) => decision.proof_mode?.startsWith("whole_level")).length,
      structure_rejected: decisions.filter((decision) => decision.status === "rejected_structure_lock").length,
      route_replay_rejected: decisions.filter((decision) => decision.status === "rejected_full_route_replay").length,
      floor_disproven: decisions.filter((decision) => decision.status?.includes("disproven")).length,
      inconclusive: decisions.filter((decision) => decision.status?.includes("inconclusive")).length,
    },
    catalog: {
      path: posixRelative(resolve(options.outputDir, "strict-v5-certificate-catalog.json")),
      sha256: sha256(catalogBytes),
    },
    decisions,
  };
  const auditBytes = Buffer.from(`${JSON.stringify(audit, null, 2)}\n`, "utf8");
  if (options.write) {
    const catalogPath = resolve(options.outputDir, "strict-v5-certificate-catalog.json");
    const auditPath = resolve(options.outputDir, "strict-v5-acceptance-audit.json");
    const markdownPath = resolve(options.outputDir, "strict-v5-acceptance-audit.md");
    const markdown = [
      "# Block Out! v5 strict acceptance audit",
      "",
      `- Status: **${audit.status}**`,
      `- Accepted: ${accepted.length}/${decisions.length}`,
      `- Contract SHA-256: \`${audit.source_contract.sha256}\``,
      `- Verifier SHA-256: \`${audit.verifier.sha256}\``,
      `- bounded-DFS SHA-256: \`${audit.bounded_dfs.sha256}\``,
      "- Any disproven or inconclusive component is rejected.",
      "",
      "| Level | Mode | Target | Certified | Decision |",
      "|---|---|---:|---:|---|",
      ...decisions.map((decision) => `| ${decision.level_id} | ${decision.proof_mode ?? "—"} | ${decision.target_reposition_overhead ?? "—"} | ${decision.certified_additive_lower_bound ?? "—"} | ${decision.status} |`),
      "",
    ].join("\n");
    await Promise.all([
      writeFile(catalogPath, catalogBytes),
      writeFile(auditPath, auditBytes),
      writeFile(markdownPath, markdown, "utf8"),
    ]);
  }
  console.log(JSON.stringify({ status: audit.status, counts: audit.counts }, null, 2));
  if (decisions.some((decision) => !decision.accepted)) process.exitCode = 2;
};

if (options.selfTest) await runSelfTest();
else await runMain();
