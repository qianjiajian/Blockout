import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

/**
 * Parameterised v6 necessary-reposition candidate migration/search harness.
 *
 * This tool deliberately does not edit production LevelSpec sources.  It can:
 *   1. migrate v5 layouts whose board and complete shape inventory still match
 *      the selected v6 contract;
 *   2. graft a certified-v5 pair/core/corridor layout as a *search seed* when
 *      its complete core inventory fits one v6 stage;
 *   3. perturb an already contract-exact runtime through inventory-preserving
 *      colour/gate/like-shape permutations; and
 *   4. run a cheap below-floor counterexample pass before delegating survivors
 *      to prove-video-parity-reposition-floors.mjs.
 *
 * No v5 proof is transferred.  Every emitted seed records its old provenance,
 * while every new proof must bind the current contract, final candidate bytes,
 * canonical LevelSpecs, PuzzleModel, levelSolver, and v6 verifier hashes.
 */

const toolPath = fileURLToPath(import.meta.url);
const root = resolve(dirname(toolPath), "..");
const verifierPath = resolve(root, "tools/prove-video-parity-reposition-floors.mjs");
const assemblerPath = resolve(root, "tools/assemble-video-parity-runtime.mjs");
const defaults = {
  contract: resolve(root, "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v6.json"),
  base: resolve(root, "playtest-results/experiments/video-parity-v6/base/formal-candidates.json"),
  baseRoutes: resolve(root, "playtest-results/experiments/video-parity-v6/base/validation-routes.json"),
  legacy: resolve(root, "playtest-results/experiments/competitor-composition-r141/assembled-expanded-density-candidates-v5.json"),
  runtime: resolve(root, "src/core/videoParityLevels.generated.ts"),
  runtimeAudit: resolve(root, "playtest-results/experiments/video-parity-v6/runtime-assembly-audit.json"),
  runtimeRoutes: resolve(root, "playtest-results/experiments/video-parity-v6/runtime-validation-routes.json"),
  outputDir: resolve(root, "playtest-results/experiments/video-parity-v6/search"),
};

const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const posixRelative = (path) => relative(root, path).replaceAll("\\", "/");
const exists = async (path) => {
  try { await access(path); return true; } catch { return false; }
};
const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().flatMap((key) => (
    value[key] === undefined ? [] : [[key, canonicalize(value[key])]]
  )));
};
const canonicalJson = (value) => JSON.stringify(canonicalize(value));
const same = (left, right) => canonicalJson(left) === canonicalJson(right);
const clone = (value) => structuredClone(value);
const levelLabel = (id) => `Lv${String(id).padStart(3, "0")}`;

const SHAPES = {
  SINGLE: [[[0, 0]]],
  H2: [[[0, 0], [1, 0]]],
  V2: [[[0, 0], [0, 1]]],
  H3: [[[0, 0], [1, 0], [2, 0]]],
  V3: [[[0, 0], [0, 1], [0, 2]]],
  H4: [[[0, 0], [1, 0], [2, 0], [3, 0]]],
  V4: [[[0, 0], [0, 1], [0, 2], [0, 3]]],
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
  S4: [
    [[1, 0], [2, 0], [0, 1], [1, 1]],
    [[0, 0], [0, 1], [1, 1], [1, 2]],
  ],
  T5: [
    [[0, 0], [1, 0], [2, 0], [1, 1], [1, 2]],
    [[0, 0], [0, 1], [1, 1], [2, 1], [0, 2]],
    [[1, 0], [1, 1], [0, 2], [1, 2], [2, 2]],
    [[2, 0], [0, 1], [1, 1], [2, 1], [2, 2]],
  ],
  L5: [
    [[0, 0], [0, 1], [0, 2], [0, 3], [1, 3]],
    [[0, 0], [1, 0], [2, 0], [3, 0], [0, 1]],
    [[0, 0], [1, 0], [1, 1], [1, 2], [1, 3]],
    [[3, 0], [0, 1], [1, 1], [2, 1], [3, 1]],
  ],
  CROSS5: [[[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]]],
  RECT2X3: [
    [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2]],
    [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]],
  ],
};
const SHAPE_ORDER = Object.keys(SHAPES);
const pointKey = ([x, y]) => `${x},${y}`;
const normalizeShape = (shape) => {
  const minX = Math.min(...shape.map(([x]) => x));
  const minY = Math.min(...shape.map(([, y]) => y));
  return shape.map(([x, y]) => [x - minX, y - minY])
    .sort((left, right) => left[1] - right[1] || left[0] - right[0])
    .map(([x, y]) => `${x},${y}`).join("|");
};
const shapeBySignature = new Map(Object.entries(SHAPES).flatMap(([id, variants]) => (
  variants.map((shape) => [normalizeShape(shape), id])
)));
const shapeIdOf = (shape) => shapeBySignature.get(normalizeShape(shape)) ?? "UNKNOWN";
const histogramOf = (blocks) => Object.fromEntries(SHAPE_ORDER.flatMap((shapeId) => {
  const count = blocks.filter((block) => shapeIdOf(block.shape) === shapeId).length;
  return count ? [[shapeId, count]] : [];
}));
const histogramSubset = (subset, inventory) => Object.entries(subset ?? {})
  .every(([shapeId, count]) => count <= Number(inventory?.[shapeId] ?? 0));
const maskRows = (level) => {
  const playable = new Set(level.playable.map(pointKey));
  return Array.from({ length: level.height }, (_row, y) => Array.from(
    { length: level.width }, (_cell, x) => playable.has(`${x},${y}`) ? "#" : ".",
  ).join(""));
};

function parseSelection(specification) {
  const selected = new Set();
  for (const token of String(specification).split(",").map((part) => part.trim()).filter(Boolean)) {
    const match = token.match(/^(\d+)(?:-(\d+))?$/);
    if (!match) throw new Error(`Invalid level selection: ${token}`);
    const from = Number(match[1]);
    const to = Number(match[2] ?? match[1]);
    if (!Number.isSafeInteger(from) || !Number.isSafeInteger(to) || from < 1 || to < from) {
      throw new Error(`Invalid level range: ${token}`);
    }
    for (let id = from; id <= to; id += 1) selected.add(id);
  }
  return [...selected].sort((left, right) => left - right);
}

function compactLevelSelection(ids) {
  const sorted = [...new Set(ids)].sort((left, right) => left - right);
  const ranges = [];
  for (let index = 0; index < sorted.length;) {
    const start = sorted[index];
    let end = start;
    while (index + 1 < sorted.length && sorted[index + 1] === end + 1) {
      index += 1;
      end = sorted[index];
    }
    ranges.push(start === end ? String(start) : `${start}-${end}`);
    index += 1;
  }
  return ranges.join(",");
}

function parseArgs(argv) {
  const options = {
    ...defaults,
    levels: "1-100",
    preserveExisting: "none",
    prepareLegacy: false,
    assemble: false,
    searchRuntime: false,
    strict: false,
    selfTest: false,
    attempts: 64,
    keepTop: 3,
    packMaxNodes: 1_000_000,
    quickSolverMaxStates: 40_000,
    quickProofMaxStates: 10_000,
    strictMaxStates: 250_000,
    coreMaxGroupSize: 6,
    coreMaxSubsets: 240,
    coreSolverMaxStates: 100_000,
    coreUpperBoundMaxStates: 100_000,
    coreSelectionMaxNodes: 50_000,
    maxMemoryMb: 900,
    maxSeconds: 120,
    seed: 0x5eed_0006,
  };
  const pathArgs = new Map([
    ["--contract", "contract"], ["--base", "base"], ["--base-routes", "baseRoutes"],
    ["--legacy", "legacy"], ["--runtime", "runtime"], ["--runtime-audit", "runtimeAudit"],
    ["--runtime-routes", "runtimeRoutes"], ["--output-dir", "outputDir"],
  ]);
  const numberArgs = new Map([
    ["--attempts", "attempts"], ["--keep-top", "keepTop"], ["--pack-max-nodes", "packMaxNodes"],
    ["--quick-solver-max-states", "quickSolverMaxStates"],
    ["--quick-proof-max-states", "quickProofMaxStates"], ["--strict-max-states", "strictMaxStates"],
    ["--core-max-group-size", "coreMaxGroupSize"], ["--core-max-subsets", "coreMaxSubsets"],
    ["--core-solver-max-states", "coreSolverMaxStates"],
    ["--core-upper-bound-max-states", "coreUpperBoundMaxStates"],
    ["--core-selection-max-nodes", "coreSelectionMaxNodes"],
    ["--max-memory-mb", "maxMemoryMb"], ["--max-seconds", "maxSeconds"], ["--seed", "seed"],
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (pathArgs.has(argument)) { options[pathArgs.get(argument)] = resolve(root, argv[++index]); }
    else if (numberArgs.has(argument)) { options[numberArgs.get(argument)] = Number(argv[++index]); }
    else if (argument === "--levels" || argument === "--level") options.levels = argv[++index];
    else if (argument === "--preserve-existing") options.preserveExisting = argv[++index];
    else if (argument === "--prepare-legacy") options.prepareLegacy = true;
    else if (argument === "--assemble") options.assemble = true;
    else if (argument === "--search-runtime") options.searchRuntime = true;
    else if (argument === "--strict") options.strict = true;
    else if (argument === "--self-test") options.selfTest = true;
    else if (argument === "--help") {
      console.log([
        "Usage: node tools/search-video-parity-reposition-candidates-v6.mjs [actions] [options]",
        "  --prepare-legacy       emit exact-layout and stage-compatible v5 core graft seeds",
        "  --assemble             run the v6 runtime assembler against migrated seeds",
        "  --search-runtime       search inventory-preserving variants of a contract-exact runtime",
        "  --strict               after cheap filtering, invoke the strict v6 lower-bound verifier",
        "  --contract <json>      authoritative, replaceable v6 contract path",
        "  --base <json>          v6 exact-composition base candidates",
        "  --legacy <json>        assembled v5 candidate/certificate source",
        "  --runtime <json|ts>    contract-exact runtime used by search",
        "  --runtime-audit <json> runtime assembly audit used as exactness authority",
        "  --runtime-routes <json> optional completion routes",
        "  --levels <spec>        e.g. 19,24,26 or 1-100",
        "  --preserve-existing <spec|none> explicitly excluded levels retained without search (default none)",
        "  --attempts <n>         colour/position variants per level (default 64)",
        "  --quick-proof-max-states <n> cheap below-floor search cap",
        "  --strict-max-states <n> exhaustive proof cap for survivors",
        "  --core-max-group-size <n> largest same-stage relaxed core to inspect (default 6)",
        "  --core-max-subsets <n> exact-core candidates inspected per LevelSpec (default 240)",
        "  --core-solver-max-states <n> exact optimum cap for candidate relaxed cores",
        "  --core-upper-bound-max-states <n> replayed core completion cap inside verifier",
        "  --core-selection-max-nodes <n> disjoint weighted-core packing cap",
        "  --output-dir <path>    defaults under video-parity-v6/search",
        "  --self-test            deterministic inventory/migration tests",
        "",
        "Old certificates are never accepted as current certificates. Contract or source SHA drift",
        "invalidates every generated search artifact.",
      ].join("\n"));
      process.exit(0);
    } else throw new Error(`Unknown argument: ${argument}`);
  }
  for (const field of [
    "attempts", "keepTop", "packMaxNodes", "quickSolverMaxStates", "quickProofMaxStates",
    "strictMaxStates", "coreMaxGroupSize", "coreMaxSubsets", "coreSolverMaxStates",
    "coreUpperBoundMaxStates", "coreSelectionMaxNodes", "maxMemoryMb", "maxSeconds", "seed",
  ]) {
    if (!Number.isSafeInteger(options[field]) || options[field] <= 0) throw new Error(`${field} must be a positive integer`);
  }
  options.requestedIds = parseSelection(options.levels);
  const preserveIds = options.preserveExisting.toLowerCase() === "none"
    ? []
    : parseSelection(options.preserveExisting);
  const requestedSet = new Set(options.requestedIds);
  options.preservedExistingIds = preserveIds.filter((id) => requestedSet.has(id));
  const preservedSet = new Set(options.preservedExistingIds);
  options.selectedIds = options.requestedIds.filter((id) => !preservedSet.has(id));
  if (!options.prepareLegacy && !options.searchRuntime && !options.selfTest) {
    throw new Error("Choose --prepare-legacy, --search-runtime, or --self-test");
  }
  if (options.assemble && !options.prepareLegacy) throw new Error("--assemble requires --prepare-legacy");
  return options;
}

const runtimeBundle = await build({
  stdin: {
    contents: `
      import { PuzzleModel, validateLevel } from "./src/core/PuzzleModel.ts";
      import { solveLevelForValidation, solveLevelOptimally } from "./src/core/levelSolver.ts";
      export { PuzzleModel, validateLevel, solveLevelForValidation, solveLevelOptimally };
    `,
    resolveDir: root,
    sourcefile: "video-parity-v6-candidate-search-runtime.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const runtimeBundleBytes = Buffer.from(runtimeBundle.outputFiles[0].contents);
const runtime = await import(`data:text/javascript;base64,${runtimeBundleBytes.toString("base64")}`);

async function loadLevels(path) {
  const text = await readFile(path, "utf8");
  if (extname(path).toLowerCase() === ".json") {
    const parsed = JSON.parse(text);
    const entries = Array.isArray(parsed) ? parsed
      : parsed.levels ?? parsed.candidates ?? parsed.results ?? [];
    const levels = entries.map((entry) => entry.level ?? entry.level_spec ?? entry)
      .filter((level) => Number.isSafeInteger(level?.id) && Array.isArray(level.blocks));
    return { text, parsed, entries, levels, exportName: null };
  }
  const bundle = await build({ entryPoints: [path], bundle: true, platform: "node", format: "esm", write: false, logLevel: "silent" });
  const bytes = Buffer.from(bundle.outputFiles[0].contents);
  const module = await import(`data:text/javascript;base64,${bytes.toString("base64")}`);
  for (const name of ["VIDEO_PARITY_LEVELS", "LEVELS", "GENERATED_LEVELS", "default", ...Object.keys(module)]) {
    const value = module[name];
    const entries = Array.isArray(value) ? value : value?.levels;
    if (!Array.isArray(entries)) continue;
    const levels = entries.map((entry) => entry.level ?? entry).filter((level) => Number.isSafeInteger(level?.id));
    if (levels.length) return { text, parsed: null, entries, levels, exportName: name, bundleSha256: sha256(bytes) };
  }
  throw new Error(`${path} does not export recognizable LevelSpecs`);
}

function normalizeRoute(route) {
  return (route ?? []).map((action) => {
    if (action.kind === "wait" || (!action.blockId && !action.block_id && action.seconds !== undefined)) {
      return {
        kind: "wait",
        seconds: Number(action.seconds ?? 0),
        event: action.event ?? "timed-generator",
      };
    }
    return {
      kind: "drag",
      blockId: action.blockId ?? action.block_id,
      path: (action.path ?? []).map(([x, y]) => [x, y]),
      ...(action.exitSide ?? action.exit_side ? { exitSide: action.exitSide ?? action.exit_side } : {}),
    };
  });
}

function routeMapFromArtifact(parsed) {
  const entries = Array.isArray(parsed) ? parsed : parsed?.levels ?? parsed?.routes ?? [];
  return new Map(entries.map((entry) => [
    Number(String(entry.level_id ?? entry.levelId ?? entry.id).replace(/^Lv/i, "")),
    normalizeRoute(entry.drags ?? entry.route ?? entry.actions ?? []),
  ]).filter(([id]) => Number.isSafeInteger(id)));
}

function replayRoute(level, route) {
  let model;
  try { model = new runtime.PuzzleModel(level); } catch (error) {
    return { replayed: false, complete: false, reason: `model: ${error.message}`, repositions: null };
  }
  let repositions = 0;
  for (let index = 0; index < route.length; index += 1) {
    const drag = route[index];
    if (drag.kind === "wait") {
      if (!Number.isFinite(drag.seconds) || drag.seconds < 0) {
        return { replayed: false, complete: false, reason: `invalid wait ${index}`, repositions };
      }
      const before = model.snapshot();
      if (!before.started) return { replayed: false, complete: false, reason: `wait before start ${index}`, repositions };
      model.tick(drag.seconds);
      if (model.snapshot().failed) return { replayed: false, complete: false, reason: `timer expired ${index}`, repositions };
      continue;
    }
    model.beginAction();
    for (const [x, y] of drag.path ?? []) {
      if (!model.moveBlockStep(drag.blockId, x, y)) {
        model.cancelAction();
        return { replayed: false, complete: false, reason: `move ${index}@${x},${y}`, repositions };
      }
    }
    if (drag.exitSide && !model.tryExit(drag.blockId, drag.exitSide).ok) {
      model.cancelAction();
      return { replayed: false, complete: false, reason: `exit ${index}`, repositions };
    }
    if (!model.commitAction(true)) return { replayed: false, complete: false, reason: `commit ${index}`, repositions };
    if (!drag.exitSide) repositions += 1;
  }
  const snapshot = model.snapshot();
  return {
    replayed: true,
    complete: snapshot.complete && snapshot.blocks.length === 0 && snapshot.queuedBlocks.length === 0,
    reason: snapshot.complete ? null : `${snapshot.blocks.length}+${snapshot.queuedBlocks.length} remain`,
    repositions,
    drags: route.filter((action) => action.kind !== "wait").length,
    waits: route.filter((action) => action.kind === "wait").length,
  };
}

const options = parseArgs(process.argv.slice(2));

const makeRng = (seed) => {
  let state = seed >>> 0 || 1;
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 2 ** 32;
  };
};
const shuffled = (values, random) => {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
};
const shapeBounds = (shape) => ({
  width: Math.max(...shape.map(([x]) => x)) + 1,
  height: Math.max(...shape.map(([, y]) => y)) + 1,
});
const cellsAt = (block, x = block.x, y = block.y) => block.shape.map(([dx, dy]) => [x + dx, y + dy]);

function exactLayoutCompatibility(legacyLevel, target) {
  const observedHistogram = histogramOf(legacyLevel.blocks);
  const observedOccupied = legacyLevel.blocks.reduce((sum, block) => sum + block.shape.length, 0);
  const checks = {
    rows: legacyLevel.height === target.board.rows,
    cols: legacyLevel.width === target.board.cols,
    playable_cell_count: legacyLevel.playable.length === target.board.playable_cell_count,
    playable_mask: same(maskRows(legacyLevel), target.board.playable_mask),
    full_level_block_count: legacyLevel.blocks.length === target.full_level_block_count,
    full_level_shape_histogram: same(observedHistogram, target.full_level_shape_histogram),
    full_level_occupied_cell_count: observedOccupied === target.full_level_occupied_cell_count,
  };
  return { pass: Object.values(checks).every(Boolean), checks, observedHistogram, observedOccupied };
}

/** Reorders, but never reshapes, blocks so assembler stage slices match v6. */
function partitionBlocksForTarget(blocks, partitions) {
  const remaining = blocks.map((block, index) => ({ block, index, shapeId: shapeIdOf(block.shape) }));
  const ordered = [];
  const stages = [];
  for (const partition of partitions) {
    const selected = [];
    for (const shapeId of SHAPE_ORDER) {
      const required = Number(partition.shape_histogram?.[shapeId] ?? 0);
      for (let count = 0; count < required; count += 1) {
        const index = remaining.findIndex((entry) => entry.shapeId === shapeId);
        if (index < 0) {
          return { pass: false, reason: `${partition.id}: missing ${shapeId}`, blocks, stages: [] };
        }
        selected.push(remaining.splice(index, 1)[0].block);
      }
    }
    if (selected.length !== partition.count) {
      return {
        pass: false,
        reason: `${partition.id}: histogram selected ${selected.length}, expected ${partition.count}`,
        blocks,
        stages: [],
      };
    }
    stages.push(selected);
    ordered.push(...selected);
  }
  if (remaining.length) return { pass: false, reason: `${remaining.length} unassigned blocks`, blocks, stages: [] };
  return { pass: true, reason: null, blocks: ordered, stages };
}

function coreSeedFor(legacyEntry, target) {
  const groups = legacyEntry.audit?.strict_core_floor_groups;
  if (!Array.isArray(groups) || !groups.length) return null;
  const allBlocksById = new Map(legacyEntry.level.blocks.map((block) => [block.id, block]));
  const cores = groups.map((group) => {
    const blocks = group.block_ids.map((id) => allBlocksById.get(id)).filter(Boolean);
    return {
      old_stage_index: group.stage_index,
      floor: group.target_reposition_overhead,
      blocks,
      histogram: histogramOf(blocks),
      route: normalizeRoute(group.route),
    };
  });
  if (cores.some((core, index) => core.blocks.length !== groups[index].block_ids.length)) return null;
  const combinedHistogram = {};
  for (const core of cores) for (const [shapeId, count] of Object.entries(core.histogram)) {
    combinedHistogram[shapeId] = (combinedHistogram[shapeId] ?? 0) + count;
  }
  const totalFloor = cores.reduce((sum, core) => sum + core.floor, 0);
  if (totalFloor < Number(target.campaign_reposition_floor ?? 0)
    || !histogramSubset(combinedHistogram, target.full_level_shape_histogram)) return null;

  // A core is a simultaneous-state object. It may not be split across v6
  // reveal stages merely because the union inventory is large enough. Multiple
  // independent cores may share one target stage, but only when their combined
  // inventory fits and their fixed legacy cells do not overlap. This remains a
  // search hint: neither the old per-core floor nor their sum is transferred as
  // a v6 certificate.
  const partitionHistograms = target.stage_partitions.map(() => ({}));
  const partitionCells = target.stage_partitions.map(() => new Set());
  const assignments = new Array(cores.length).fill(-1);
  const coreCells = cores.map((core) => new Set(core.blocks.flatMap((block) => cellsAt(block).map(pointKey))));
  const candidatePartitions = cores.map((core) => target.stage_partitions
    .map((partition, index) => ({ partition, index }))
    .filter(({ partition }) => histogramSubset(core.histogram, partition.shape_histogram))
    .map(({ index }) => index));
  if (candidatePartitions.some((candidates) => !candidates.length)) return null;
  const order = cores.map((_core, index) => index).sort((left, right) => (
    candidatePartitions[left].length - candidatePartitions[right].length
    || cores[right].blocks.length - cores[left].blocks.length
    || left - right
  ));
  const assign = (orderIndex) => {
    if (orderIndex === order.length) return true;
    const coreIndex = order[orderIndex];
    const core = cores[coreIndex];
    const candidates = [...candidatePartitions[coreIndex]].sort((left, right) => {
      const leftUsed = Object.values(partitionHistograms[left]).reduce((sum, count) => sum + count, 0);
      const rightUsed = Object.values(partitionHistograms[right]).reduce((sum, count) => sum + count, 0);
      // Prefer an unused stage, then the tightest compatible partition.
      return Number(leftUsed > 0) - Number(rightUsed > 0)
        || target.stage_partitions[left].count - target.stage_partitions[right].count
        || left - right;
    });
    for (const partitionIndex of candidates) {
      const combined = { ...partitionHistograms[partitionIndex] };
      for (const [shapeId, count] of Object.entries(core.histogram)) {
        combined[shapeId] = (combined[shapeId] ?? 0) + count;
      }
      if (!histogramSubset(combined, target.stage_partitions[partitionIndex].shape_histogram)) continue;
      if ([...coreCells[coreIndex]].some((cell) => partitionCells[partitionIndex].has(cell))) continue;
      const previousHistogram = partitionHistograms[partitionIndex];
      partitionHistograms[partitionIndex] = combined;
      for (const cell of coreCells[coreIndex]) partitionCells[partitionIndex].add(cell);
      assignments[coreIndex] = partitionIndex;
      if (assign(orderIndex + 1)) return true;
      assignments[coreIndex] = -1;
      for (const cell of coreCells[coreIndex]) partitionCells[partitionIndex].delete(cell);
      partitionHistograms[partitionIndex] = previousHistogram;
    }
    return false;
  };
  if (!assign(0)) return null;
  const placements = cores.map((core, index) => ({
    ...core,
    target_stage_index: assignments[index] + 1,
    target_stage_id: target.stage_partitions[assignments[index]].id,
  }));
  return { totalFloor, combinedHistogram, cores: placements };
}

function enumeratePlacements(block, level, random, scorePlacement = null) {
  const blocked = new Set((level.blocked ?? []).map(pointKey));
  const playable = new Set(level.playable.map(pointKey).filter((key) => !blocked.has(key)));
  const placements = [];
  const seen = new Set();
  const shapeId = shapeIdOf(block.shape);
  for (const shape of SHAPES[shapeId] ?? [block.shape]) {
    const bounds = shapeBounds(shape);
    for (let y = 0; y <= level.height - bounds.height; y += 1) {
      for (let x = 0; x <= level.width - bounds.width; x += 1) {
        const cells = shape.map(([dx, dy]) => [x + dx, y + dy]);
        if (!cells.every((cell) => playable.has(pointKey(cell)))) continue;
        const signature = cells.map(pointKey).sort().join("|");
        if (seen.has(signature)) continue;
        seen.add(signature);
        placements.push({ x, y, shape: clone(shape), cells });
      }
    }
  }
  const randomized = shuffled(placements, random);
  return scorePlacement
    ? randomized.sort((left, right) => scorePlacement(left) - scorePlacement(right))
    : randomized;
}

/** Packs one simultaneous stage around fixed legacy-core blocks. */
function packStageAroundCore(level, sourceBlocks, fixedBlocks, maxNodes, seed, placementScore = null) {
  const random = makeRng(seed);
  const fixedCells = new Set();
  const blocked = new Set((level.blocked ?? []).map(pointKey));
  const playable = new Set(level.playable.map(pointKey).filter((key) => !blocked.has(key)));
  for (const block of fixedBlocks) {
    for (const cell of cellsAt(block)) {
      const key = pointKey(cell);
      if (!playable.has(key) || fixedCells.has(key)) return { pass: false, reason: "invalid_or_overlapping_core", nodes: 0 };
      fixedCells.add(key);
    }
  }
  const candidates = new Map(sourceBlocks.map((block) => [
    block.id,
    enumeratePlacements(block, level, random, placementScore ? (placement) => placementScore(block, placement) : null),
  ]));
  const ordered = [...sourceBlocks].sort((left, right) => (
    candidates.get(left.id).length - candidates.get(right.id).length
    || right.shape.length - left.shape.length
    || left.id.localeCompare(right.id)
  ));
  const occupied = new Set(fixedCells);
  const assignments = new Map();
  let nodes = 0;
  const memo = new Set();
  const visit = (index) => {
    nodes += 1;
    if (nodes > maxNodes) return false;
    if (index === ordered.length) return true;
    const signature = `${index}|${[...occupied].sort().join(";")}`;
    if (memo.has(signature)) return false;
    const block = ordered[index];
    for (const placement of candidates.get(block.id)) {
      if (placement.cells.some((cell) => occupied.has(pointKey(cell)))) continue;
      placement.cells.forEach((cell) => occupied.add(pointKey(cell)));
      assignments.set(block.id, placement);
      if (visit(index + 1)) return true;
      assignments.delete(block.id);
      placement.cells.forEach((cell) => occupied.delete(pointKey(cell)));
    }
    memo.add(signature);
    return false;
  };
  if (!visit(0)) return { pass: false, reason: nodes > maxNodes ? "packing_node_cap" : "no_packing", nodes };
  return {
    pass: true,
    reason: null,
    nodes,
    blocks: sourceBlocks.map((source) => {
      const placement = assignments.get(source.id);
      return { ...clone(source), x: placement.x, y: placement.y, shape: placement.shape };
    }),
  };
}

function graftCoreIntoBase({ baseEntry, legacyEntry, target, seedPlan, packMaxNodes, seed }) {
  const partitioned = partitionBlocksForTarget(baseEntry.level.blocks, target.stage_partitions);
  if (!partitioned.pass) return { pass: false, reason: `base_partition: ${partitioned.reason}` };
  const resultStages = partitioned.stages.map((stage) => stage.map(clone));
  const graftedCoreIds = [];
  const legacyCoreIdMap = new Map();
  const packing = [];
  const coresByStage = new Map();
  seedPlan.cores.forEach((core, coreIndex) => {
    const stageIndex = core.target_stage_index - 1;
    const stageCores = coresByStage.get(stageIndex) ?? [];
    stageCores.push({ core, coreIndex });
    coresByStage.set(stageIndex, stageCores);
  });
  for (const [stageIndex, stageCores] of [...coresByStage.entries()].sort((left, right) => left[0] - right[0])) {
    const sourceStage = resultStages[stageIndex];
    const available = [...sourceStage];
    const fixed = [];
    for (const { core, coreIndex } of stageCores) {
      for (const coreBlock of core.blocks) {
        const shapeId = shapeIdOf(coreBlock.shape);
        const match = available.findIndex((block) => shapeIdOf(block.shape) === shapeId);
        if (match < 0) return { pass: false, reason: `stage_${stageIndex + 1}_missing_${shapeId}` };
        available.splice(match, 1);
      }
      const coreFixed = core.blocks.map((block, index) => ({
        ...clone(block),
        id: `v6-core-${String(baseEntry.level.id).padStart(3, "0")}-${String(coreIndex + 1).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`,
      }));
      core.blocks.forEach((block, index) => legacyCoreIdMap.set(block.id, coreFixed[index].id));
      fixed.push(...coreFixed);
    }
    const packed = packStageAroundCore(
      baseEntry.level,
      available,
      fixed,
      packMaxNodes,
      seed ^ Math.imul(baseEntry.level.id, 2_654_435_761) ^ (stageIndex + 1),
    );
    if (!packed.pass) return { pass: false, reason: `stage_${stageIndex + 1}_${packed.reason}`, nodes: packed.nodes };
    resultStages[stageIndex] = [...fixed, ...packed.blocks];
    graftedCoreIds.push(...fixed.map((block) => block.id));
    packing.push({
      stage_index: stageIndex + 1,
      nodes: packed.nodes,
      core_groups: stageCores.length,
      core_blocks: fixed.length,
      filler_blocks: packed.blocks.length,
    });
  }
  const level = clone(baseEntry.level);
  level.blocks = resultStages.flat();
  level.timeSeconds = target.time_seconds;
  // The assembler removes these legacy/base assignments and installs the
  // current contract mechanisms.  Keeping no fabricated proof metadata here
  // prevents a graft seed from masquerading as an accepted runtime.
  for (const block of level.blocks) {
    delete block.layers;
    delete block.frozen;
    delete block.shutterId;
    delete block.movementAxis;
    delete block.keyId;
    delete block.lockedBy;
    delete block.lockCount;
    delete block.star;
  }
  delete level.shutters;
  delete level.generators;
  delete level.elevators;
  delete level.conveyors;
  return {
    pass: true,
    level,
    packing,
    grafted_core_ids: graftedCoreIds,
    legacy_core_route: seedPlan.cores.flatMap((core) => normalizeRoute(core.route).map((drag) => ({
      ...drag,
      blockId: legacyCoreIdMap.get(drag.blockId) ?? drag.blockId,
    }))),
  };
}

const runProcess = (command, args, environment = {}) => new Promise((resolveProcess, rejectProcess) => {
  const child = spawn(command, args, {
    cwd: root,
    env: { ...process.env, ...environment },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
  child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
  child.on("error", rejectProcess);
  child.on("close", (code, signal) => resolveProcess({ code, signal, stdout, stderr }));
});

function planningWeight(target) {
  const floor = Number(target?.campaign_reposition_floor ?? 0);
  const blocks = Number(target?.full_level_block_count ?? 0);
  const playable = Number(target?.board?.playable_cell_count ?? 0);
  const stages = Math.max(1, target?.stage_partitions?.length ?? 1);
  const mechanismFamilies = Object.keys(target?.mechanism_contract ?? {}).length;
  return Math.max(1,
    floor * floor * 4
    + blocks * 3
    + playable
    + (stages - 1) * 24
    + mechanismFamilies * 8);
}

function balancedPlanningBatches(ids, contractById, decisionsById, workerCount = 4) {
  const batches = Array.from({ length: workerCount }, (_value, index) => ({
    worker: index + 1,
    estimated_load: 0,
    levels: [],
  }));
  const work = ids.map((id) => {
    const target = contractById.get(id)?.our_design_target;
    return {
      id,
      weight: planningWeight(target),
      floor: target?.campaign_reposition_floor ?? null,
      block_count: target?.full_level_block_count ?? null,
      stage_count: target?.stage_partitions?.length ?? null,
      mechanism_family_count: Object.keys(target?.mechanism_contract ?? {}).length,
      migration_source_kind: decisionsById.get(id)?.source_kind ?? "unknown",
    };
  }).sort((left, right) => right.weight - left.weight || left.id - right.id);
  for (const item of work) {
    const batch = [...batches].sort((left, right) => (
      left.estimated_load - right.estimated_load
      || left.levels.length - right.levels.length
      || left.worker - right.worker
    ))[0];
    batch.levels.push(item);
    batch.estimated_load += item.weight;
  }
  return batches.map((batch) => ({
    ...batch,
    level_ids: batch.levels.map((entry) => entry.id).sort((left, right) => left - right),
    level_selection: compactLevelSelection(batch.levels.map((entry) => entry.id)),
    levels: batch.levels.sort((left, right) => left.id - right.id),
  }));
}

function renderPreflightPlanMarkdown(plan) {
  const lines = [
    "# Video parity v6 reposition-floor preflight",
    "",
    `Status: **${plan.status}**. This is not a v6 certificate and the formal commands below must not run until the contract/runtime is declared stable.`,
    "",
    `Current preflight contract SHA-256: \`${plan.binding.contract.sha256}\``,
    "",
    "## Migration classification",
    "",
    `- Old disjoint cores reusable only as untrusted search seeds: ${plan.classification.legacy_disjoint_core_seed_only.level_selection || "none"} (${plan.classification.legacy_disjoint_core_seed_only.count})`,
    `- Exact full-layout seeds without a reusable old core: ${plan.classification.full_layout_seed_but_new_search_required.level_selection || "none"} (${plan.classification.full_layout_seed_but_new_search_required.count})`,
    `- No compatible legacy seed; fresh inventory-preserving search required: ${plan.classification.fresh_inventory_search_required.level_selection || "none"} (${plan.classification.fresh_inventory_search_required.count})`,
    `- New v6 strict proof required: ${plan.classification.new_v6_strict_proof_required.level_selection} (${plan.classification.new_v6_strict_proof_required.count})`,
    "",
    "No old certificate is transferred. A completion route is only an upper bound; a floor passes only after exhaustive exclusion of every route below the floor.",
    "",
    "## Commands safe to run now",
    "",
    ...plan.commands.safe_now.map((command) => `- \`${command}\``),
    "",
    "## Formal commands after stable contract/runtime",
    "",
    "Run the legacy-core seed reproof first, then the four fresh-search workers in parallel.",
    "",
    `- \`${plan.commands.after_stable.phase_a_legacy_core_seed_reproof}\``,
    "",
    "| Worker | Levels | Count | Estimated load | Minimal command |",
    "| ---: | --- | ---: | ---: | --- |",
    ...plan.commands.after_stable.phase_b_fresh_search_parallel.map((batch) => (
      `| ${batch.worker} | ${batch.level_selection} | ${batch.level_ids.length} | ${batch.estimated_load} | \`${batch.command}\` |`
    )),
    "",
    "The load is only a deterministic scheduling heuristic: 4*floor^2 + 3*blocks + playable cells + 24*(stages-1) + 8*mechanism families.",
    "",
    "After chosen candidates are assembled into one final runtime, merge their replay witnesses/core plans and run:",
    "",
    `- \`${plan.commands.after_stable.phase_c_final_merged_runtime_proof}\``,
    "",
    "Any state, time, memory, unsupported-semantics, or transition cap is inconclusive and must not be counted as a pass.",
    "",
  ];
  return `${lines.join("\n")}\n`;
}

async function prepareLegacyMigration(contract, contractText) {
  const [baseText, baseRoutesText, legacyText] = await Promise.all([
    readFile(options.base, "utf8"),
    readFile(options.baseRoutes, "utf8"),
    readFile(options.legacy, "utf8"),
  ]);
  const baseArtifact = JSON.parse(baseText);
  const baseRoutesArtifact = JSON.parse(baseRoutesText);
  const legacyArtifact = JSON.parse(legacyText);
  const baseEntries = Array.isArray(baseArtifact) ? baseArtifact : baseArtifact.levels ?? [];
  const legacyEntries = Array.isArray(legacyArtifact) ? legacyArtifact : legacyArtifact.levels ?? [];
  const baseById = new Map(baseEntries.map((entry) => [Number(entry.level?.id ?? entry.id), entry]));
  const legacyById = new Map(legacyEntries.map((entry) => [Number(entry.level?.id ?? entry.id), entry]));
  const contractById = new Map(contract.levels.map((entry) => [Number(String(entry.level_id).replace(/^Lv/i, "")), entry]));
  const baseRouteById = routeMapFromArtifact(baseRoutesArtifact);
  const selected = new Set(options.selectedIds);
  const decisions = [];
  const migratedEntries = [];
  const migratedRoutes = [];

  for (const originalBaseEntry of baseEntries) {
    const id = Number(originalBaseEntry.level?.id ?? originalBaseEntry.id);
    const contractEntry = contractById.get(id);
    const legacyEntry = legacyById.get(id);
    if (!contractEntry) continue;
    const target = contractEntry.our_design_target;
    let entry = clone(originalBaseEntry);
    let route = clone(baseRouteById.get(id) ?? entry.route ?? []);
    let decision = {
      level_id: levelLabel(id),
      selected: selected.has(id),
      preserved_existing_user_exclusion: options.preservedExistingIds.includes(id),
      source_kind: "v6_base_unchanged",
      old_certificate_transferred: false,
      old_certificate_role: "search provenance only",
    };

    if (selected.has(id) && legacyEntry?.level) {
      const compatibility = exactLayoutCompatibility(legacyEntry.level, target);
      const partitioned = compatibility.pass
        ? partitionBlocksForTarget(legacyEntry.level.blocks, target.stage_partitions)
        : { pass: false, reason: "full_geometry_or_inventory_mismatch" };
      const coreSeed = coreSeedFor(legacyEntry, target);
      if (compatibility.pass && partitioned.pass) {
        const level = clone(legacyEntry.level);
        level.blocks = partitioned.blocks;
        level.timeSeconds = target.time_seconds;
        entry = {
          ...entry,
          level_id: levelLabel(id),
          target: clone(target),
          level,
          route: clone(legacyEntry.route ?? []),
          validation: {
            migration_kind: "v5_exact_geometry_inventory_seed",
            old_level_spec_sha256: sha256(canonicalJson(legacyEntry.level)),
            old_contract_sha256: legacyArtifact.contract_sha256 ?? null,
            old_certificate_transferred: false,
          },
        };
        route = clone(legacyEntry.route ?? []);
        decision = {
          ...decision,
          source_kind: "v5_exact_geometry_inventory_seed",
          compatibility,
          stage_repartitioned: !same(
            legacyEntry.assembly?.stage_layout?.batches?.map((stage) => stage.shape_histogram) ?? [],
            target.stage_partitions.map((stage) => stage.shape_histogram),
          ),
          old_level_spec_sha256: sha256(canonicalJson(legacyEntry.level)),
          old_certified_lower_bound: legacyEntry.assembly?.strict_v5_certificates?.reduce(
            (sum, certificate) => sum + Number(certificate.certified_lower_bound ?? 0), 0,
          ) ?? null,
          legacy_disjoint_core_seed: coreSeed ? {
            old_certified_floor: coreSeed.totalFloor,
            current_target_floor: target.campaign_reposition_floor,
            combined_histogram: coreSeed.combinedHistogram,
            placements: coreSeed.cores.map((core) => ({
              target_stage_index: core.target_stage_index,
              target_stage_id: core.target_stage_id,
              floor_as_search_hint_only: core.floor,
              histogram: core.histogram,
              block_ids: core.blocks.map((block) => block.id),
            })),
          } : null,
        };
      } else if (coreSeed) {
        const graft = graftCoreIntoBase({
          baseEntry: originalBaseEntry,
          legacyEntry,
          target,
          seedPlan: coreSeed,
          packMaxNodes: options.packMaxNodes,
          seed: options.seed,
        });
        if (graft.pass) {
          const liveIds = new Set(graft.level.blocks.map((block) => block.id));
          const baseTail = route.filter((drag) => liveIds.has(drag.blockId));
          route = [...graft.legacy_core_route, ...baseTail];
          entry = {
            ...entry,
            level_id: levelLabel(id),
            target: clone(target),
            level: graft.level,
            route,
            validation: {
              migration_kind: "v5_stage_compatible_core_graft_seed",
              old_level_spec_sha256: sha256(canonicalJson(legacyEntry.level)),
              old_contract_sha256: legacyArtifact.contract_sha256 ?? null,
              old_certificate_transferred: false,
              grafted_core_ids: graft.grafted_core_ids,
              packing: graft.packing,
            },
          };
          decision = {
            ...decision,
            source_kind: "v5_stage_compatible_core_graft_seed",
            compatibility,
            old_level_spec_sha256: sha256(canonicalJson(legacyEntry.level)),
            core_seed: {
              old_certified_floor: coreSeed.totalFloor,
              current_target_floor: target.campaign_reposition_floor,
              combined_histogram: coreSeed.combinedHistogram,
              placements: coreSeed.cores.map((core) => ({
                target_stage_index: core.target_stage_index,
                target_stage_id: core.target_stage_id,
                floor_as_search_hint_only: core.floor,
                histogram: core.histogram,
              })),
            },
            packing: graft.packing,
          };
        } else {
          decision = { ...decision, compatibility, core_seed: coreSeed, graft_failure: graft.reason };
        }
      } else {
        decision = { ...decision, compatibility, core_seed: null };
      }
    }
    migratedEntries.push(entry);
    migratedRoutes.push({ level_id: levelLabel(id), drags: route });
    decisions.push(decision);
  }

  const migrationDir = resolve(options.outputDir, "legacy-migration");
  await mkdir(migrationDir, { recursive: true });
  const candidatesPath = resolve(migrationDir, "merged-base-candidates.json");
  const routesPath = resolve(migrationDir, "merged-base-routes.json");
  const auditPath = resolve(migrationDir, "migration-audit.json");
  const candidatesArtifact = {
    title: "Block Out! v6 proof-aware legacy layout/core search seeds",
    generated_on: new Date().toISOString(),
    candidate_layer: "search_seeds_not_accepted_levels",
    constraint_status: "requires_v6_runtime_assembly_replay_and_new_strict_proof",
    prototype_only: true,
    applied_to_live_campaign: false,
    source_contract: { path: posixRelative(options.contract), sha256: sha256(contractText) },
    sources: {
      v6_base: { path: posixRelative(options.base), sha256: sha256(baseText) },
      v6_base_routes: { path: posixRelative(options.baseRoutes), sha256: sha256(baseRoutesText) },
      v5_legacy: { path: posixRelative(options.legacy), sha256: sha256(legacyText) },
      migration_tool: { path: posixRelative(toolPath), sha256: sha256(await readFile(toolPath)) },
    },
    levels: migratedEntries,
    failures: [],
  };
  const candidatesBytes = Buffer.from(`${JSON.stringify(candidatesArtifact, null, 2)}\n`, "utf8");
  const routesBytes = Buffer.from(`${JSON.stringify(migratedRoutes, null, 2)}\n`, "utf8");
  await Promise.all([writeFile(candidatesPath, candidatesBytes), writeFile(routesPath, routesBytes)]);
  const chosen = decisions.filter((decision) => decision.source_kind !== "v6_base_unchanged");
  const audit = {
    schema: "blockout-video-parity-v6-legacy-seed-migration-v1",
    generated_at: new Date().toISOString(),
    accepted_proof_claims: 0,
    proof_policy: "All v5 certificates are provenance/search hints only. New final LevelSpecs require v6 proof.",
    binding: {
      contract: { path: posixRelative(options.contract), sha256: sha256(contractText) },
      base: { path: posixRelative(options.base), sha256: sha256(baseText) },
      base_routes: { path: posixRelative(options.baseRoutes), sha256: sha256(baseRoutesText) },
      legacy: { path: posixRelative(options.legacy), sha256: sha256(legacyText) },
      tool: { path: posixRelative(toolPath), sha256: sha256(await readFile(toolPath)) },
      PuzzleModel: { path: "src/core/PuzzleModel.ts", sha256: sha256(await readFile(resolve(root, "src/core/PuzzleModel.ts"))) },
      levelSolver: { path: "src/core/levelSolver.ts", sha256: sha256(await readFile(resolve(root, "src/core/levelSolver.ts"))) },
      blockShape: { path: "src/core/blockShape.ts", sha256: sha256(await readFile(resolve(root, "src/core/blockShape.ts"))) },
    },
    outputs: {
      candidates: { path: posixRelative(candidatesPath), sha256: sha256(candidatesBytes) },
      routes: { path: posixRelative(routesPath), sha256: sha256(routesBytes) },
    },
    summary: {
      requested: options.requestedIds.length,
      selected: options.selectedIds.length,
      preserved_existing_user_exclusion: options.preservedExistingIds.length,
      exact_layout_inventory_seeds: chosen.filter((entry) => entry.source_kind === "v5_exact_geometry_inventory_seed").length,
      stage_compatible_core_graft_seeds: chosen.filter((entry) => entry.source_kind === "v5_stage_compatible_core_graft_seed").length,
      legacy_disjoint_core_search_seeds: chosen.filter((entry) => (
        entry.source_kind === "v5_stage_compatible_core_graft_seed"
        || Boolean(entry.legacy_disjoint_core_seed)
      )).length,
      retained_v6_base: decisions.filter((entry) => entry.selected && entry.source_kind === "v6_base_unchanged").length,
    },
    decisions,
  };
  const auditBytes = Buffer.from(`${JSON.stringify(audit, null, 2)}\n`, "utf8");
  await writeFile(auditPath, auditBytes);

  const decisionById = new Map(decisions.map((decision) => [
    Number(String(decision.level_id).replace(/^Lv/i, "")), decision,
  ]));
  const selectedDecisions = decisions.filter((decision) => decision.selected);
  const exactCoreIds = selectedDecisions.filter((decision) => (
    decision.source_kind === "v5_exact_geometry_inventory_seed"
    && Boolean(decision.legacy_disjoint_core_seed)
  )).map((decision) => Number(decision.level_id.slice(2)));
  const graftCoreIds = selectedDecisions.filter((decision) => (
    decision.source_kind === "v5_stage_compatible_core_graft_seed"
  )).map((decision) => Number(decision.level_id.slice(2)));
  const reusableCoreIds = [...new Set([...exactCoreIds, ...graftCoreIds])].sort((left, right) => left - right);
  const fullLayoutNewSearchIds = selectedDecisions.filter((decision) => (
    decision.source_kind === "v5_exact_geometry_inventory_seed"
    && !decision.legacy_disjoint_core_seed
  )).map((decision) => Number(decision.level_id.slice(2))).sort((left, right) => left - right);
  const freshSearchIds = selectedDecisions.filter((decision) => (
    decision.source_kind === "v6_base_unchanged"
  )).map((decision) => Number(decision.level_id.slice(2))).sort((left, right) => left - right);
  const newSearchIds = [...fullLayoutNewSearchIds, ...freshSearchIds].sort((left, right) => left - right);
  const exactStageLayoutIds = selectedDecisions.filter((decision) => (
    decision.source_kind === "v5_exact_geometry_inventory_seed" && decision.stage_repartitioned === false
  )).map((decision) => Number(decision.level_id.slice(2))).sort((left, right) => left - right);
  const repartitionedLayoutIds = selectedDecisions.filter((decision) => (
    decision.source_kind === "v5_exact_geometry_inventory_seed" && decision.stage_repartitioned === true
  )).map((decision) => Number(decision.level_id.slice(2))).sort((left, right) => left - right);
  const selectionRecord = (ids) => ({
    count: ids.length,
    level_ids: ids,
    level_selection: compactLevelSelection(ids),
  });
  const freshBatches = balancedPlanningBatches(newSearchIds, contractById, decisionById, 4);
  const searchOutputRoot = "playtest-results/experiments/video-parity-v6/search";
  const directCoreSelection = compactLevelSelection(reusableCoreIds);
  const planPath = resolve(options.outputDir, "preflight-batch-plan.json");
  const planMarkdownPath = resolve(options.outputDir, "preflight-batch-plan.md");
  const preflightPlan = {
    schema: "blockout-video-parity-v6-reposition-preflight-plan-v1",
    generated_at: new Date().toISOString(),
    status: "preflight_only_not_a_v6_certificate",
    scope: {
      requested: selectionRecord(options.requestedIds),
      selected: selectionRecord(options.selectedIds),
      preserved_existing_user_exclusion: selectionRecord(options.preservedExistingIds),
      default_preserve_existing: "none",
    },
    binding: {
      contract: audit.binding.contract,
      base: audit.binding.base,
      base_routes: audit.binding.base_routes,
      legacy: audit.binding.legacy,
      migration_tool: audit.binding.tool,
      proof_tool: { path: posixRelative(verifierPath), sha256: sha256(await readFile(verifierPath)) },
      PuzzleModel: audit.binding.PuzzleModel,
      levelSolver: audit.binding.levelSolver,
      blockShape: audit.binding.blockShape,
      migration_audit: { path: posixRelative(auditPath), sha256: sha256(auditBytes) },
      migrated_candidates: audit.outputs.candidates,
      migrated_routes: audit.outputs.routes,
    },
    classification: {
      legacy_disjoint_core_seed_only: {
        ...selectionRecord(reusableCoreIds),
        exact_full_layout_level_ids: exactCoreIds.sort((left, right) => left - right),
        stage_compatible_graft_level_ids: graftCoreIds.sort((left, right) => left - right),
        certificate_transfer: false,
        required_next_step: "rebuild each relaxed core from the final LevelSpec and prove it again under v6 semantics",
      },
      full_layout_seed_but_new_search_required: selectionRecord(fullLayoutNewSearchIds),
      fresh_inventory_search_required: selectionRecord(freshSearchIds),
      all_levels_requiring_new_layout_search: selectionRecord(newSearchIds),
      exact_stage_full_layout_seeds: selectionRecord(exactStageLayoutIds),
      stage_repartitioned_full_layout_seeds: selectionRecord(repartitionedLayoutIds),
      new_v6_strict_proof_required: selectionRecord(options.selectedIds),
    },
    scheduling: {
      maximum_parallel_search_workers: 4,
      phase_order: [
        "wait_for_stable_contract_runtime_audit_and_routes",
        "reprove_legacy_disjoint_core_seeds",
        "run_four_fresh_search_workers_in_parallel",
        "assemble_chosen_candidates_and_run_one_final_bound_proof",
      ],
      planning_weight_formula: "4*floor^2 + 3*blocks + playable_cells + 24*(stages-1) + 8*mechanism_families",
      planning_weight_is_proof: false,
      fresh_search_batches: freshBatches,
    },
    commands: {
      safe_now: [
        "node tools/prove-video-parity-reposition-floors.mjs --self-test",
        "node tools/search-video-parity-reposition-candidates-v6.mjs --self-test",
        `node tools/search-video-parity-reposition-candidates-v6.mjs --prepare-legacy --output-dir ${posixRelative(options.outputDir)}`,
      ],
      after_stable: {
        must_not_run_during_preflight: true,
        default_path_assumptions: {
          contract: posixRelative(options.contract),
          runtime: posixRelative(options.runtime),
          runtime_audit: posixRelative(options.runtimeAudit),
          runtime_routes: posixRelative(options.runtimeRoutes),
        },
        phase_a_legacy_core_seed_reproof: directCoreSelection
          ? `node tools/search-video-parity-reposition-candidates-v6.mjs --search-runtime --strict --levels ${directCoreSelection} --attempts 1 --output-dir ${searchOutputRoot}/legacy-core-reproof`
          : "none",
        phase_b_fresh_search_parallel: freshBatches.map((batch) => ({
          worker: batch.worker,
          level_ids: batch.level_ids,
          level_selection: batch.level_selection,
          estimated_load: batch.estimated_load,
          command: `node tools/search-video-parity-reposition-candidates-v6.mjs --search-runtime --strict --levels ${batch.level_selection} --output-dir ${searchOutputRoot}/fresh-worker-${String(batch.worker).padStart(2, "0")}`,
        })),
        phase_c_final_merged_runtime_proof: "node tools/prove-video-parity-reposition-floors.mjs --runtime-audit <FINAL_RUNTIME_AUDIT.json> --witnesses <MERGED_FINAL_WITNESSES.json> --core-plan <MERGED_FINAL_CORE_PLANS.json> --expected-contract-sha256 <FINAL_CONTRACT_SHA256> --output-dir playtest-results/experiments/video-parity-v6/proofs",
      },
    },
    proof_policy: {
      old_certificates_transferred: false,
      completion_route_role: "upper_bound_only",
      below_floor_counterexample_order: "reject before strict proof",
      lower_bound_acceptance: "exhaust every gameplay state reachable below campaign_reposition_floor",
      cap_policy: "state, time, memory, transition, or unsupported-semantics caps are inconclusive and never pass",
      required_final_bindings: [
        "contract SHA-256",
        "final runtime source-byte SHA-256",
        "canonical final LevelSpec SHA-256",
        "runtime assembly audit SHA-256",
        "completion witness SHA-256",
        "core-plan SHA-256 when used",
        "PuzzleModel SHA-256",
        "levelSolver SHA-256",
        "blockShape SHA-256",
        "campaign floor source SHA-256",
        "search tool SHA-256",
        "proof tool SHA-256",
      ],
    },
    safety: {
      current_contract_may_still_change: true,
      formal_runtime_loaded_or_modified_by_this_preflight: false,
      production_level_sources_modified: false,
    },
  };
  const planBytes = Buffer.from(`${JSON.stringify(preflightPlan, null, 2)}\n`, "utf8");
  const planMarkdownBytes = Buffer.from(renderPreflightPlanMarkdown(preflightPlan), "utf8");
  await Promise.all([
    writeFile(planPath, planBytes),
    writeFile(planMarkdownPath, planMarkdownBytes),
  ]);
  console.log(JSON.stringify({
    migration: audit.summary,
    candidates: candidatesPath,
    routes: routesPath,
    audit: auditPath,
    preflight_plan: planPath,
    preflight_plan_markdown: planMarkdownPath,
  }, null, 2));

  if (!options.assemble) return {
    candidatesPath, routesPath, auditPath, planPath, planMarkdownPath, assembled: null,
  };
  const assembledDir = resolve(options.outputDir, "legacy-assembled");
  await mkdir(assembledDir, { recursive: true });
  const outputPath = resolve(assembledDir, "videoParityLevels.legacy-seeds.generated.ts");
  const assemblyAuditPath = resolve(assembledDir, "runtime-assembly-audit.json");
  const assemblyRoutesPath = resolve(assembledDir, "runtime-validation-routes.json");
  const processResult = await runProcess(process.execPath, [assemblerPath], {
    VIDEO_PARITY_CONTRACT_RELATIVE: posixRelative(options.contract),
    VIDEO_PARITY_BASE_CANDIDATES_RELATIVE: posixRelative(candidatesPath),
    VIDEO_PARITY_BASE_ROUTES_RELATIVE: posixRelative(routesPath),
    VIDEO_PARITY_OUTPUT_RELATIVE: posixRelative(outputPath),
    VIDEO_PARITY_AUDIT_RELATIVE: posixRelative(assemblyAuditPath),
    VIDEO_PARITY_ROUTE_OUTPUT_RELATIVE: posixRelative(assemblyRoutesPath),
    VIDEO_PARITY_LEVEL_IDS: options.selectedIds.join(","),
    VIDEO_PARITY_SOLVER_MAX_STATES: String(options.quickSolverMaxStates),
    VIDEO_PARITY_PROVE_FLOORS: "0",
  });
  if (processResult.code !== 0) {
    throw new Error(`v6 assembler failed (${processResult.code ?? processResult.signal}):\n${processResult.stderr}\n${processResult.stdout}`);
  }
  console.log(processResult.stderr.trim());
  return {
    candidatesPath,
    routesPath,
    auditPath,
    planPath,
    planMarkdownPath,
    assembled: { runtime: outputPath, audit: assemblyAuditPath, routes: assemblyRoutesPath },
  };
}

const stageKeyForBlock = (block, queuedByBlock) => block.shutterId ? `shutter:${block.shutterId}`
  : queuedByBlock.has(block.id) ? `generator:${queuedByBlock.get(block.id)}`
    : "opening";

const gateCorridorOverlap = (cells, gate) => cells.reduce((count, [x, y]) => {
  const aligned = gate.side === "top" || gate.side === "bottom"
    ? x >= gate.offset && x < gate.offset + gate.size
    : y >= gate.offset && y < gate.offset + gate.size;
  return count + Number(aligned);
}, 0);

const gateApproachDistance = (cells, gate, level) => {
  let best = Number.POSITIVE_INFINITY;
  for (const [x, y] of cells) {
    const edge = gate.side === "top" ? y
      : gate.side === "bottom" ? level.height - 1 - y
        : gate.side === "left" ? x
          : level.width - 1 - x;
    const coordinate = gate.side === "top" || gate.side === "bottom" ? x : y;
    const alignment = coordinate < gate.offset ? gate.offset - coordinate
      : coordinate >= gate.offset + gate.size ? coordinate - (gate.offset + gate.size - 1)
        : 0;
    best = Math.min(best, edge + alignment);
  }
  return best;
};

function heuristicPlacementScorer(level, mode, attempt) {
  const orderedColors = [...new Set(level.gates.filter((gate) => !gate.star).map((gate) => gate.color))];
  const targetColorFor = (color) => {
    const index = orderedColors.indexOf(color);
    if (index < 0 || orderedColors.length < 2) return null;
    if (mode === "pair") return orderedColors[index % 2 === 0
      ? Math.min(index + 1, orderedColors.length - 1) : index - 1];
    if (mode === "reverse") return orderedColors[orderedColors.length - 1 - index];
    const offset = mode === "random" ? 1 + attempt % (orderedColors.length - 1) : 1;
    return orderedColors[(index + offset) % orderedColors.length];
  };
  return (block, placement) => {
    const activeColor = block.layers?.[0] ?? block.color;
    const compatibleGates = level.gates.filter((gate) => (
      gate.color === activeColor && (!block.star || gate.star)
    ));
    const targetColor = targetColorFor(activeColor);
    const foreignGates = targetColor === null ? [] : level.gates.filter((gate) => (
      !gate.star && gate.color === targetColor
    ));
    const ownDistance = compatibleGates.length
      ? Math.min(...compatibleGates.map((gate) => gateApproachDistance(placement.cells, gate, level)))
      : 0;
    const foreignCorridor = foreignGates.length
      ? Math.max(...foreignGates.map((gate) => gateCorridorOverlap(placement.cells, gate)))
      : 0;
    const centerX = placement.cells.reduce((sum, [x]) => sum + x, 0) / placement.cells.length;
    const centerY = placement.cells.reduce((sum, [, y]) => sum + y, 0) / placement.cells.length;
    const centerDistance = Math.abs(centerX - (level.width - 1) / 2)
      + Math.abs(centerY - (level.height - 1) / 2);
    // Wrong-colour corridor occupancy establishes pair/cycle precedence
    // opportunities. Distance from the block's own exit and central density
    // are weaker tie-breaks; strict proof, never this score, decides the floor.
    return -foreignCorridor * 1_000 - ownDistance * 20
      + (mode === "corridor" ? centerDistance * 5 : centerDistance);
  };
}

function repackContractStages(level, mode, attempt, seed, maxNodes) {
  const queuedByBlock = new Map((level.generators ?? []).flatMap((generator) => (
    generator.queueBlockIds.map((id) => [id, generator.id])
  )));
  const immovableIds = new Set([
    ...(level.conveyors ?? []).map((conveyor) => conveyor.blockId),
    ...(level.elevators ?? []).map((elevator) => elevator.blockId),
  ]);
  const groups = new Map();
  for (const block of level.blocks) {
    const stage = stageKeyForBlock(block, queuedByBlock);
    if (stage.startsWith("generator:")) continue;
    const group = groups.get(stage) ?? [];
    group.push(block);
    groups.set(stage, group);
  }
  const scorer = heuristicPlacementScorer(level, mode, attempt);
  const reports = [];
  for (const [stage, blocks] of groups) {
    const fixed = blocks.filter((block) => immovableIds.has(block.id));
    const movable = blocks.filter((block) => !immovableIds.has(block.id));
    if (!movable.length) continue;
    const packed = packStageAroundCore(
      level,
      movable,
      fixed,
      maxNodes,
      seed ^ Math.imul(level.id, 2_654_435_761) ^ Math.imul(attempt + 1, 1_013_904_223)
        ^ [...stage].reduce((hash, character) => Math.imul(hash ^ character.charCodeAt(0), 16_777_619), 2_166_136_261),
      scorer,
    );
    if (!packed.pass) return { pass: false, stage, reason: packed.reason, nodes: packed.nodes, reports };
    const packedById = new Map(packed.blocks.map((block) => [block.id, block]));
    for (const block of movable) {
      const replacement = packedById.get(block.id);
      block.x = replacement.x;
      block.y = replacement.y;
      block.shape = clone(replacement.shape);
    }
    reports.push({ stage, movable: movable.length, fixed: fixed.length, nodes: packed.nodes });
  }
  return { pass: true, reports };
}

function mutableInvariant(level) {
  const queuedByBlock = new Map((level.generators ?? []).flatMap((generator) => (
    generator.queueBlockIds.map((id) => [id, generator.id])
  )));
  const stageShapeHistograms = {};
  for (const block of level.blocks) {
    const stage = stageKeyForBlock(block, queuedByBlock);
    const shapeId = shapeIdOf(block.shape);
    stageShapeHistograms[stage] ??= {};
    stageShapeHistograms[stage][shapeId] = (stageShapeHistograms[stage][shapeId] ?? 0) + 1;
  }
  return {
    id: level.id,
    width: level.width,
    height: level.height,
    timeSeconds: level.timeSeconds,
    playable: [...level.playable].sort((left, right) => left[1] - right[1] || left[0] - right[0]),
    blocked: [...(level.blocked ?? [])].sort((left, right) => left[1] - right[1] || left[0] - right[0]),
    stageShapeHistograms,
    blocks: [...level.blocks].sort((left, right) => left.id.localeCompare(right.id)).map((block) => ({
      id: block.id,
      shape_id: shapeIdOf(block.shape),
      layer_count: block.layers?.length ?? 1,
      frozen: block.frozen ?? 0,
      shutterId: block.shutterId ?? null,
      movementAxis: block.movementAxis ?? null,
      keyId: block.keyId ?? null,
      lockedBy: block.lockedBy ?? null,
      lockCount: block.lockCount ?? null,
      star: Boolean(block.star),
    })),
    gates: [...level.gates].sort((left, right) => left.id.localeCompare(right.id)).map((gate) => ({
      id: gate.id,
      side: gate.side,
      offset: gate.offset,
      size: gate.size,
      frozen_present: Object.hasOwn(gate, "frozen"),
      frozen: gate.frozen ?? null,
      star: Boolean(gate.star),
    })),
    shutters: level.shutters ?? [],
    generators: level.generators ?? [],
    elevators: level.elevators ?? [],
    conveyors: level.conveyors ?? [],
  };
}

function openingVisibleIds(level, auditEntry) {
  const queued = new Set((level.generators ?? []).flatMap((generator) => generator.queueBlockIds));
  const shutters = new Map((level.shutters ?? []).map((shutter) => [shutter.id, shutter]));
  const opaque = new Set(auditEntry?.exact_contract?.actual?.colors?.opening_hidden_color_carrier_ids ?? []);
  return new Set(level.blocks.filter((block) => (
    !queued.has(block.id)
    && (!block.shutterId || (shutters.get(block.shutterId)?.count ?? 0) <= 0)
    && !opaque.has(block.id)
  )).map((block) => block.id));
}

const blockColorPackage = (block) => ({ color: block.color, layers: block.layers ? [...block.layers] : null });
const applyColorPackage = (block, colorPackage) => {
  block.color = colorPackage.color;
  if (colorPackage.layers) block.layers = [...colorPackage.layers];
  else delete block.layers;
};

function permuteInPlace(items, packages, mode, random, offset = 1) {
  if (items.length < 2) return;
  let permuted;
  if (mode === "pair") {
    permuted = [...packages];
    for (let index = 0; index + 1 < permuted.length; index += 2) {
      [permuted[index], permuted[index + 1]] = [permuted[index + 1], permuted[index]];
    }
  } else if (mode === "reverse" || mode === "corridor") permuted = [...packages].reverse();
  else if (mode === "random") permuted = shuffled(packages, random);
  else permuted = packages.map((_value, index) => packages[(index + offset) % packages.length]);
  items.forEach((item, index) => applyColorPackage(item, permuted[index]));
}

function mutateRuntimeLevel(level, auditEntry, attempt, seed) {
  const result = clone(level);
  const random = makeRng(seed ^ Math.imul(level.id, 2_654_435_761) ^ Math.imul(attempt + 1, 1_013_904_223));
  const modes = ["pair", "cycle", "reverse", "corridor", "random"];
  const mode = modes[attempt % modes.length];
  const visibleIds = openingVisibleIds(result, auditEntry);
  const blockGroups = new Map();
  for (const block of result.blocks) {
    if (block.star) continue; // keep star-to-star-gate mapping untouched
    const key = `${visibleIds.has(block.id) ? "visible" : "concealed"}|layers:${block.layers?.length ?? 0}`;
    const group = blockGroups.get(key) ?? [];
    group.push(block);
    blockGroups.set(key, group);
  }
  for (const group of blockGroups.values()) {
    const ordered = mode === "corridor"
      ? [...group].sort((left, right) => left.y - right.y || left.x - right.x || left.id.localeCompare(right.id))
      : mode === "random" ? shuffled(group, random) : [...group].sort((left, right) => left.id.localeCompare(right.id));
    permuteInPlace(ordered, ordered.map(blockColorPackage), mode, random, 1 + attempt % Math.max(1, ordered.length - 1));
  }

  const gateGroups = new Map();
  for (const gate of result.gates) {
    if (gate.star) continue;
    const key = `frozen:${Object.hasOwn(gate, "frozen") ? gate.frozen : "none"}`;
    const group = gateGroups.get(key) ?? [];
    group.push(gate);
    gateGroups.set(key, group);
  }
  for (const group of gateGroups.values()) {
    if (group.length < 2 || attempt % 2 === 0) continue;
    const colors = group.map((gate) => gate.color);
    const next = mode === "random" ? shuffled(colors, random)
      : colors.map((_color, index) => colors[(index + 1 + attempt) % colors.length]);
    group.forEach((gate, index) => { gate.color = next[index]; });
  }
  const geometry = repackContractStages(result, mode, attempt, seed, options.packMaxNodes);
  return { level: result, heuristic: mode, geometry };
}

function contractPreservingMutationAudit(seed, candidate, target, auditEntry) {
  const errors = [];
  if (!same(mutableInvariant(seed), mutableInvariant(candidate))) errors.push("non-colour/non-like-position invariant changed");
  let validationError = null;
  try { runtime.validateLevel(candidate); } catch (error) { validationError = error.message; }
  if (validationError) errors.push(`validateLevel: ${validationError}`);
  const fullPalette = [...new Set(candidate.blocks.map((block) => block.color))].sort();
  const targetPalette = [...target.design_palette].sort();
  if (!same(fullPalette, targetPalette)) errors.push(`full palette mismatch ${fullPalette.join("/")} != ${targetPalette.join("/")}`);
  const visibleIds = openingVisibleIds(candidate, auditEntry);
  const openingColors = new Set(candidate.blocks.filter((block) => visibleIds.has(block.id)).map((block) => block.color));
  if (openingColors.size !== target.opening_color_count) {
    errors.push(`opening color count ${openingColors.size} != ${target.opening_color_count}`);
  }
  for (const block of candidate.blocks.filter((entry) => entry.star)) {
    const active = block.layers?.[0] ?? block.color;
    if (!candidate.gates.some((gate) => gate.star && gate.color === active)) {
      errors.push(`star block ${block.id} lost a same-colour star gate`);
    }
  }
  return {
    pass: errors.length === 0,
    errors,
    mutable_invariant_sha256: sha256(canonicalJson(mutableInvariant(candidate))),
    full_palette: fullPalette,
    opening_color_count: openingColors.size,
  };
}

const timedGeneratorProgressKey = (snapshot) => JSON.stringify({
  blocks: snapshot.blocks.map((block) => block.id).sort(),
  queued: snapshot.queuedBlocks.map((block) => block.id).sort(),
  generators: snapshot.generators.map((generator) => [
    generator.id, generator.head, generator.remaining, generator.nextBlockId ?? null, generator.elapsed,
  ]),
});

function nextTimedGeneratorDelta(snapshot) {
  let minimum = Number.POSITIVE_INFINITY;
  for (const generator of snapshot.generators) {
    if (generator.trigger !== "time" || generator.remaining <= 0) continue;
    const interval = generator.intervalSeconds ?? 1;
    const firstDelay = generator.head === 0 ? generator.initialDelaySeconds ?? interval : interval;
    const threshold = Math.max(0.05, firstDelay);
    const until = Math.max(0, threshold - generator.elapsed);
    if (until > 1e-12) minimum = Math.min(minimum, until);
  }
  return minimum;
}

/**
 * levelSolver intentionally treats a ready timed feeder as an eager abstract
 * release. Turn that abstract drag sequence into a concrete PuzzleModel route
 * by waiting only when the next referenced block is still in a timed queue.
 * The resulting route is accepted solely if a fresh full replay completes.
 */
function materializeTimedSolverRoute(level, solverRoute) {
  if (!(level.generators ?? []).some((generator) => generator.trigger === "time")) {
    const replay = replayRoute(level, solverRoute);
    return { route: solverRoute, replay, inserted_waits: 0, reason: replay.replayed ? null : replay.reason };
  }
  const model = new runtime.PuzzleModel(level);
  const route = [];
  let insertedWaits = 0;
  const waitForQueuedBlock = (blockId) => {
    let guard = 0;
    while (!model.getBlock(blockId)) {
      guard += 1;
      if (guard > 1_000) return "timed-wait-guard";
      let before = model.snapshot();
      if (before.failed) return "timer-expired";
      if (!before.started) return "queued-block-requested-before-start";
      if (!before.queuedBlocks.some((block) => block.id === blockId)) return "referenced-block-is-not-live-or-queued";

      const beforeProgress = timedGeneratorProgressKey(before);
      model.tick(0);
      let after = model.snapshot();
      if (after.failed) return "timer-expired";
      if (timedGeneratorProgressKey(after) !== beforeProgress) {
        route.push({ kind: "wait", seconds: 0, event: "timed-generator" });
        insertedWaits += 1;
        continue;
      }

      const delta = nextTimedGeneratorDelta(after);
      if (!Number.isFinite(delta) || delta <= 0 || delta >= after.remainingSeconds - 1e-12) {
        return "timed-head-cannot-release-before-another-player-action";
      }
      model.tick(delta);
      after = model.snapshot();
      route.push({ kind: "wait", seconds: delta, event: "timed-generator" });
      insertedWaits += 1;
      if (after.failed) return "timer-expired";
    }
    return null;
  };

  for (const drag of solverRoute) {
    if (drag.kind === "wait") {
      if (!model.snapshot().started) return { route: null, replay: null, inserted_waits: insertedWaits, reason: "wait-before-start" };
      model.tick(drag.seconds);
      route.push(drag);
      continue;
    }
    if (!model.getBlock(drag.blockId)) {
      const reason = waitForQueuedBlock(drag.blockId);
      if (reason) return { route: null, replay: null, inserted_waits: insertedWaits, reason };
    }
    model.beginAction();
    for (const [x, y] of drag.path ?? []) {
      if (!model.moveBlockStep(drag.blockId, x, y)) {
        model.cancelAction();
        return { route: null, replay: null, inserted_waits: insertedWaits, reason: `move:${drag.blockId}@${x},${y}` };
      }
    }
    if (drag.exitSide && !model.tryExit(drag.blockId, drag.exitSide).ok) {
      model.cancelAction();
      return { route: null, replay: null, inserted_waits: insertedWaits, reason: `exit:${drag.blockId}->${drag.exitSide}` };
    }
    if (!model.commitAction(true)) {
      return { route: null, replay: null, inserted_waits: insertedWaits, reason: `commit:${drag.blockId}` };
    }
    route.push(drag);
  }
  const replay = replayRoute(level, route);
  return { route: replay.replayed && replay.complete ? route : null, replay, inserted_waits: insertedWaits, reason: replay.complete ? null : replay.reason };
}

function quickSolverWitness(level, maxStates) {
  const startedAt = performance.now();
  let result;
  try { result = runtime.solveLevelForValidation(level, maxStates); } catch (error) {
    return { solved: false, error: error.message, elapsed_ms: performance.now() - startedAt };
  }
  if (!result.solved) {
    return { solved: false, explored_states: result.exploredStates, elapsed_ms: performance.now() - startedAt };
  }
  const solverRoute = normalizeRoute(result.drags);
  const materialized = materializeTimedSolverRoute(level, solverRoute);
  const route = materialized.route;
  const replay = materialized.replay;
  return {
    solved: Boolean(route && replay?.replayed && replay.complete),
    solver_solved: true,
    replay,
    route,
    timed_wait_materialization: {
      inserted_waits: materialized.inserted_waits,
      reason: materialized.reason,
    },
    reposition_overhead: route && replay?.replayed && replay.complete ? replay.repositions : null,
    explored_states: result.exploredStates,
    elapsed_ms: Math.round((performance.now() - startedAt) * 100) / 100,
  };
}

/**
 * Prefer the assembler's source-bound completion route for the unchanged
 * runtime LevelSpec.  If that route is absent or stale, fall back to the same
 * bounded solver used for mutated candidates.  This keeps exact legacy-layout
 * and core-graft seeds eligible for strict proof without first destroying
 * their geometry through a repack mutation.
 */
function identityCompletionWitness(level, originalRoute, maxStates) {
  const normalized = normalizeRoute(originalRoute);
  if (normalized.length) {
    const replay = replayRoute(level, normalized);
    if (replay.replayed && replay.complete) {
      return {
        solved: true,
        solver_solved: null,
        replay,
        route: normalized,
        reposition_overhead: replay.repositions,
        explored_states: 0,
        elapsed_ms: 0,
        source: "runtime-validation-route",
      };
    }
    const fallback = quickSolverWitness(level, maxStates);
    return {
      ...fallback,
      source: "bounded-solver-fallback",
      provided_route_replay: replay,
    };
  }
  return {
    ...quickSolverWitness(level, maxStates),
    source: "bounded-solver-no-runtime-route",
  };
}

function retainTopCandidatesWithIdentity(candidates, keepTop) {
  const identityCandidate = candidates.find((candidate) => candidate.search.heuristic === "identity");
  return identityCandidate
    ? [identityCandidate, ...candidates.filter((candidate) => candidate !== identityCandidate)].slice(0, keepTop)
    : candidates.slice(0, keepTop);
}

const coreStageContext = (level) => {
  const queuedByBlock = new Map((level.generators ?? []).flatMap((generator) => (
    generator.queueBlockIds.map((blockId) => [blockId, generator.id])
  )));
  const autonomousBlockIds = new Set([
    ...(level.elevators ?? []).map((elevator) => elevator.blockId),
    ...(level.conveyors ?? []).map((conveyor) => conveyor.blockId),
  ]);
  return {
    queuedByBlock,
    autonomousBlockIds,
    stageKey: (block) => block.shutterId ? `shutter:${block.shutterId}`
      : queuedByBlock.has(block.id) ? `generator:${queuedByBlock.get(block.id)}`
        : "opening",
  };
};

/**
 * Must stay semantically identical to the verifier's relaxedCoreLevel.  This
 * duplicate only discovers promising plans; prove-video-parity-reposition-
 * floors.mjs rebuilds every core independently before it certifies anything.
 */
function relaxedCoreForSearch(level, selectedBlocks, groupId) {
  const core = clone(level);
  core.name = `${level.name} disjoint relaxed core ${groupId}`;
  core.blocks = selectedBlocks.map((source) => {
    const block = clone(source);
    const activeColor = block.layers?.[0] ?? block.color;
    block.color = activeColor;
    block.layers = [activeColor];
    delete block.frozen;
    delete block.shutterId;
    delete block.keyId;
    delete block.lockedBy;
    delete block.lockCount;
    delete block.star;
    return block;
  });
  core.gates = core.gates.map((source) => {
    const gate = clone(source);
    delete gate.frozen;
    delete gate.star;
    return gate;
  });
  core.blocked = [];
  delete core.shutters;
  delete core.generators;
  delete core.elevators;
  delete core.conveyors;
  delete core.designTargets;
  delete core.onboardingHint;
  delete core.strategyNudge;
  delete core.strategyFocus;
  delete core.featureIntro;
  return core;
}

const routeInternalDragCounts = (route) => {
  const counts = new Map();
  for (const drag of route ?? []) {
    if (drag.kind === "wait") continue;
    if (drag.exitSide ?? drag.exit_side) continue;
    const id = drag.blockId ?? drag.block_id;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
};

function coreBlockPriority(level, block, internalCounts) {
  const cells = cellsAt(block);
  const activeColor = block.layers?.[0] ?? block.color;
  const own = level.gates.filter((gate) => gate.color === activeColor && (!block.star || gate.star));
  const foreign = level.gates.filter((gate) => gate.color !== activeColor && !gate.star);
  const foreignCorridor = foreign.length
    ? Math.max(...foreign.map((gate) => gateCorridorOverlap(cells, gate)))
    : 0;
  const ownDistance = own.length
    ? Math.min(...own.map((gate) => gateApproachDistance(cells, gate, level)))
    : 0;
  return (internalCounts.get(block.id) ?? 0) * 1_000_000
    + foreignCorridor * 10_000
    + ownDistance * 100
    + block.shape.length;
}

function enumerateCoreSubsets(level, route, maxGroupSize, maxSubsets) {
  const { queuedByBlock, autonomousBlockIds, stageKey } = coreStageContext(level);
  const internalCounts = routeInternalDragCounts(route);
  const stages = new Map();
  for (const block of level.blocks) {
    if (queuedByBlock.has(block.id) || autonomousBlockIds.has(block.id)) continue;
    const stage = stageKey(block);
    const entries = stages.get(stage) ?? [];
    entries.push(block);
    stages.set(stage, entries);
  }
  const result = [];
  const seen = new Set();
  const perStage = [];
  const add = (target, stage, blocks) => {
    if (target.length >= maxSubsets) return;
    if (!blocks.some((block) => (internalCounts.get(block.id) ?? 0) > 0)) return;
    const ids = blocks.map((block) => block.id).sort();
    const signature = `${stage}|${ids.join("|")}`;
    if (seen.has(signature)) return;
    seen.add(signature);
    target.push({ stage, blocks: ids.map((id) => blocks.find((block) => block.id === id)) });
  };
  for (const [stage, blocks] of [...stages.entries()].sort((left, right) => left[0].localeCompare(right[0]))) {
    const stageSubsets = [];
    const ordered = [...blocks].sort((left, right) => (
      coreBlockPriority(level, right, internalCounts) - coreBlockPriority(level, left, internalCounts)
      || left.id.localeCompare(right.id)
    ));
    const sizeLimit = Math.min(maxGroupSize, ordered.length);
    // Small exact pairs are cheapest to solve and are the dominant reusable
    // v5 pattern. Larger corridor/cycle cores follow only while the global cap
    // remains. Every subset contains a block parked by the full completion
    // witness; a positive core floor necessarily parks at least one member.
    for (let size = 2; size <= sizeLimit && stageSubsets.length < maxSubsets; size += 1) {
      const selected = [];
      const visit = (from) => {
        if (stageSubsets.length >= maxSubsets) return;
        if (selected.length === size) {
          add(stageSubsets, stage, selected);
          return;
        }
        const remaining = size - selected.length;
        for (let index = from; index <= ordered.length - remaining; index += 1) {
          selected.push(ordered[index]);
          visit(index + 1);
          selected.pop();
          if (stageSubsets.length >= maxSubsets) return;
        }
      };
      visit(0);
    }
    perStage.push(stageSubsets);
  }
  // Interleave stages so a dense opening batch cannot consume the global cap
  // before lift/staging/cover batches receive any exact-core inspection.
  for (let index = 0; result.length < maxSubsets; index += 1) {
    let appended = false;
    for (const stageSubsets of perStage) {
      if (!stageSubsets[index]) continue;
      result.push(stageSubsets[index]);
      appended = true;
      if (result.length >= maxSubsets) break;
    }
    if (!appended) break;
  }
  return {
    subsets: result,
    stage_count: stages.size,
    eligible_blocks: [...stages.values()].reduce((sum, blocks) => sum + blocks.length, 0),
    witness_internal_block_ids: [...internalCounts].filter(([, count]) => count > 0).map(([id]) => id).sort(),
    excluded_generator_cargo: [...queuedByBlock.keys()].sort(),
    excluded_autonomous_cargo: [...autonomousBlockIds].sort(),
  };
}

function solveRelaxedCoreCandidate(level, subset, maxStates, ordinal) {
  const core = relaxedCoreForSearch(level, subset.blocks, `${subset.stage}-${ordinal}`);
  try {
    runtime.validateLevel(core);
  } catch (error) {
    return { accepted: false, reason: `validateLevel: ${error.message}` };
  }
  const startedAt = performance.now();
  let solved;
  try {
    solved = runtime.solveLevelOptimally(core, maxStates);
  } catch (error) {
    return { accepted: false, reason: `solveLevelOptimally: ${error.message}` };
  }
  if (!solved.solved) {
    return {
      accepted: false,
      reason: solved.exploredStates >= maxStates ? "solver_state_cap" : "solver_unsolved",
      explored_states: solved.exploredStates,
      elapsed_ms: Math.round((performance.now() - startedAt) * 100) / 100,
    };
  }
  const route = normalizeRoute(solved.drags);
  const replay = replayRoute(core, route);
  if (!replay.replayed || !replay.complete || replay.repositions !== solved.repositionOverhead) {
    return {
      accepted: false,
      reason: `solver_replay_mismatch:${replay.reason ?? "incomplete"}`,
      explored_states: solved.exploredStates,
      replay,
    };
  }
  if (!Number.isSafeInteger(solved.repositionOverhead) || solved.repositionOverhead <= 0) {
    return {
      accepted: false,
      reason: "zero_reposition_relaxed_core",
      explored_states: solved.exploredStates,
      replay,
    };
  }
  return {
    accepted: true,
    stage: subset.stage,
    block_ids: subset.blocks.map((block) => block.id).sort(),
    floor: solved.repositionOverhead,
    route,
    relaxed_level_spec_sha256: sha256(canonicalJson(core)),
    exact_solver: {
      solver: "solveLevelOptimally",
      state_cap: maxStates,
      explored_states: solved.exploredStates,
      minimum_drags: solved.minimumDrags,
      clear_load: solved.clearLoad,
      reposition_overhead: solved.repositionOverhead,
      replay,
      elapsed_ms: Math.round((performance.now() - startedAt) * 100) / 100,
    },
  };
}

function selectDisjointCoreGroups(coreCandidates, targetFloor, maxNodes) {
  const blockIds = [...new Set(coreCandidates.flatMap((candidate) => candidate.block_ids))].sort();
  const bitById = new Map(blockIds.map((id, index) => [id, 1n << BigInt(index)]));
  const uniqueByMask = new Map();
  for (const candidate of coreCandidates) {
    const mask = candidate.block_ids.reduce((value, id) => value | bitById.get(id), 0n);
    const previous = uniqueByMask.get(mask);
    if (!previous || candidate.floor > previous.floor
      || (candidate.floor === previous.floor
        && candidate.relaxed_level_spec_sha256.localeCompare(previous.relaxed_level_spec_sha256) < 0)) {
      uniqueByMask.set(mask, { ...candidate, mask });
    }
  }
  const candidates = [...uniqueByMask.values()].sort((left, right) => (
    right.floor / right.block_ids.length - left.floor / left.block_ids.length
    || right.floor - left.floor
    || left.block_ids.length - right.block_ids.length
    || left.block_ids.join("|").localeCompare(right.block_ids.join("|"))
  ));
  let states = new Map([[0n, { floor: 0, selected: [] }]]);
  let best = states.get(0n);
  let nodes = 0;
  let capped = false;
  for (const candidate of candidates) {
    const additions = [];
    for (const [mask, state] of states) {
      nodes += 1;
      if (nodes > maxNodes) { capped = true; break; }
      if ((mask & candidate.mask) !== 0n) continue;
      const next = {
        floor: state.floor + candidate.floor,
        selected: [...state.selected, candidate],
      };
      const nextMask = mask | candidate.mask;
      const previous = states.get(nextMask);
      if (!previous || next.floor > previous.floor) additions.push([nextMask, next]);
      if (next.floor > best.floor
        || (next.floor === best.floor && next.selected.length < best.selected.length)) best = next;
      if (next.floor >= targetFloor) {
        return { achieved: true, capped: false, nodes, candidates: candidates.length, ...next };
      }
    }
    if (capped) break;
    for (const [mask, state] of additions) {
      const previous = states.get(mask);
      if (!previous || state.floor > previous.floor) states.set(mask, state);
    }
  }
  return { achieved: best.floor >= targetFloor, capped, nodes, candidates: candidates.length, ...best };
}

function deriveRelaxedCorePlan(level, route, campaignFloor, config = options) {
  if (!Number.isSafeInteger(campaignFloor) || campaignFloor <= 0) {
    return { plan: null, audit: { status: "not_applicable_non_positive_floor" } };
  }
  const enumeration = enumerateCoreSubsets(
    level,
    route,
    config.coreMaxGroupSize,
    config.coreMaxSubsets,
  );
  const positive = [];
  const rejectionCounts = {};
  let inspectedSubsets = 0;
  let selection = selectDisjointCoreGroups([], campaignFloor, config.coreSelectionMaxNodes);
  for (const [index, subset] of enumeration.subsets.entries()) {
    inspectedSubsets += 1;
    const result = solveRelaxedCoreCandidate(level, subset, config.coreSolverMaxStates, index + 1);
    if (result.accepted) positive.push(result);
    else rejectionCounts[result.reason] = (rejectionCounts[result.reason] ?? 0) + 1;
    if (result.accepted) {
      selection = selectDisjointCoreGroups(positive, campaignFloor, config.coreSelectionMaxNodes);
      if (selection.achieved) break;
    }
  }
  if (!selection.achieved) {
    selection = selectDisjointCoreGroups(positive, campaignFloor, config.coreSelectionMaxNodes);
  }
  const audit = {
    status: selection.achieved ? "candidate_plan_found_requires_independent_verifier" : "no_additive_plan_found",
    campaign_floor: campaignFloor,
    stage_count: enumeration.stage_count,
    eligible_blocks: enumeration.eligible_blocks,
    witness_internal_block_ids: enumeration.witness_internal_block_ids,
    excluded_generator_cargo: enumeration.excluded_generator_cargo,
    excluded_autonomous_cargo: enumeration.excluded_autonomous_cargo,
    subsets_enumerated: enumeration.subsets.length,
    subsets_exactly_solved_or_rejected: inspectedSubsets,
    stopped_after_sufficient_plan: selection.achieved && inspectedSubsets < enumeration.subsets.length,
    positive_exact_core_candidates: positive.length,
    exact_core_rejections: rejectionCounts,
    selection: {
      achieved: selection.achieved,
      capped: selection.capped,
      nodes: selection.nodes,
      candidate_count: selection.candidates,
      selected_floor_sum: selection.floor,
      selected_group_count: selection.selected.length,
    },
  };
  if (!selection.achieved) return { plan: null, audit };
  return {
    audit,
    plan: {
      source: "v6 candidate search; every group must be rebuilt and re-proven by the independent verifier",
      proof_scope: "candidate disjoint relaxed-core decomposition; not a certificate",
      groups: selection.selected.map((candidate, index) => {
        const id = `auto-core-${String(index + 1).padStart(2, "0")}`;
        const blocksById = new Map(level.blocks.map((block) => [block.id, block]));
        const verifierEquivalentCore = relaxedCoreForSearch(
          level,
          candidate.block_ids.map((blockId) => blocksById.get(blockId)),
          id,
        );
        return {
          id,
          stage_key: candidate.stage,
          block_ids: candidate.block_ids,
          floor: candidate.floor,
          route: candidate.route,
          relaxed_level_spec_sha256_expected_from_verifier: sha256(canonicalJson(verifierEquivalentCore)),
          discovery_relaxed_level_spec_sha256: candidate.relaxed_level_spec_sha256,
          exact_solver_discovery: candidate.exact_solver,
        };
      }),
    },
  };
}

async function readRuntimeAudit(runtimeInput, levels, contractText) {
  const text = await readFile(options.runtimeAudit, "utf8");
  const audit = JSON.parse(text);
  const inputText = await readFile(runtimeInput, "utf8");
  const contractSha = sha256(contractText);
  const canonicalLevelsSha = sha256(canonicalJson([...levels].sort((left, right) => left.id - right.id)));
  const declaredOutput = audit.outputs?.levels ? resolve(root, audit.outputs.levels) : null;
  const checks = {
    contract_sha: audit.inputs?.contract?.sha256?.toUpperCase?.() === contractSha,
    output_path: Boolean(declaredOutput && resolve(declaredOutput) === resolve(runtimeInput)),
    output_source_sha: audit.outputs?.levels_sha256?.toUpperCase?.() === sha256(inputText),
    canonical_levels_sha: audit.outputs?.canonical_level_specs_sha256?.toUpperCase?.() === canonicalLevelsSha,
    emitted_count: audit.summary?.emitted === levels.length,
    exact_count: audit.summary?.exact_contract === levels.length,
    validate_count: audit.summary?.validate_level_passed === levels.length,
  };
  const errors = Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name);
  if (errors.length) throw new Error(`Runtime audit is not a contract-exact, source-bound seed: ${errors.join(", ")}`);
  return {
    audit,
    text,
    sha256: sha256(text),
    entriesById: new Map((audit.levels ?? []).map((entry) => [
      Number(String(entry.level_id).replace(/^Lv/i, "")), entry,
    ])),
    inputText,
    inputSha256: sha256(inputText),
    canonicalLevelsSha256: canonicalLevelsSha,
  };
}

async function writeBoundCandidateBatch({
  directory,
  stem,
  records,
  contractText,
  runtimeInput,
  runtimeAudit,
}) {
  await mkdir(directory, { recursive: true });
  const candidatePath = resolve(directory, `${stem}-candidates.json`);
  const witnessPath = resolve(directory, `${stem}-witnesses.json`);
  const corePlanPath = resolve(directory, `${stem}-core-plans.json`);
  const auditPath = resolve(directory, `${stem}-binding-audit.json`);
  const artifact = {
    schema: "blockout-video-parity-v6-reposition-search-candidates-v1",
    generated_at: new Date().toISOString(),
    applied_to_live_campaign: false,
    proof_status: "pending_new_v6_verifier",
    sources: {
      contract: { path: posixRelative(options.contract), sha256: sha256(contractText) },
      seed_runtime: { path: posixRelative(runtimeInput), sha256: runtimeAudit.inputSha256 },
      seed_runtime_audit: { path: posixRelative(options.runtimeAudit), sha256: runtimeAudit.sha256 },
      search_tool: { path: posixRelative(toolPath), sha256: sha256(await readFile(toolPath)) },
      proof_tool: { path: posixRelative(verifierPath), sha256: sha256(await readFile(verifierPath)) },
      PuzzleModel: { path: "src/core/PuzzleModel.ts", sha256: sha256(await readFile(resolve(root, "src/core/PuzzleModel.ts"))) },
      levelSolver: { path: "src/core/levelSolver.ts", sha256: sha256(await readFile(resolve(root, "src/core/levelSolver.ts"))) },
      types: { path: "src/core/types.ts", sha256: sha256(await readFile(resolve(root, "src/core/types.ts"))) },
      blockShape: { path: "src/core/blockShape.ts", sha256: sha256(await readFile(resolve(root, "src/core/blockShape.ts"))) },
      campaign_floor_source: {
        path: "src/core/campaignDifficultyTargets.ts",
        sha256: sha256(await readFile(resolve(root, "src/core/campaignDifficultyTargets.ts"))),
      },
      search_runtime_bundle_sha256: sha256(runtimeBundleBytes),
    },
    levels: records.map((record) => ({
      level_id: levelLabel(record.level.id),
      search: record.search,
      core_plan_candidate: record.corePlan ?? null,
      level: record.level,
      route: record.route,
    })),
  };
  const candidateBytes = Buffer.from(`${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  const witnesses = records.map((record) => ({
    level_id: levelLabel(record.level.id),
    source: `v6 inventory-preserving ${record.search.heuristic} search`,
    proof_scope: "completion upper bound only",
    drags: record.route,
  }));
  const witnessBytes = Buffer.from(`${JSON.stringify(witnesses, null, 2)}\n`, "utf8");
  const canonicalLevelsSha256 = sha256(canonicalJson(records.map((record) => record.level).sort((a, b) => a.id - b.id)));
  const corePlanArtifact = {
    schema: "blockout-video-parity-v6-disjoint-core-plan-candidates-v1",
    generated_at: new Date().toISOString(),
    proof_status: "candidate_only_rebuild_and_reprove_in_verifier",
    binding: {
      contract: { path: posixRelative(options.contract), sha256: sha256(contractText) },
      candidate_levels: {
        path: posixRelative(candidatePath),
        sha256: sha256(candidateBytes),
        canonical_level_specs_sha256: canonicalLevelsSha256,
      },
      candidate_search_tool: artifact.sources.search_tool,
      proof_tool: artifact.sources.proof_tool,
      PuzzleModel: artifact.sources.PuzzleModel,
      levelSolver: artifact.sources.levelSolver,
      types: artifact.sources.types,
      blockShape: artifact.sources.blockShape,
      campaign_floor_source: artifact.sources.campaign_floor_source,
    },
    levels: records.filter((record) => record.corePlan).map((record) => ({
      level_id: levelLabel(record.level.id),
      level_spec_sha256: sha256(canonicalJson(record.level)),
      source: record.corePlan.source,
      proof_scope: record.corePlan.proof_scope,
      groups: record.corePlan.groups,
    })),
  };
  const corePlanBytes = Buffer.from(`${JSON.stringify(corePlanArtifact, null, 2)}\n`, "utf8");
  await Promise.all([
    writeFile(candidatePath, candidateBytes),
    writeFile(witnessPath, witnessBytes),
    writeFile(corePlanPath, corePlanBytes),
  ]);
  const bindingAudit = {
    schema_version: "blockout-video-parity-v6-search-binding-v1",
    generated_on: new Date().toISOString(),
    inputs: {
      contract: { path: posixRelative(options.contract), sha256: sha256(contractText) },
      seed_runtime: { path: posixRelative(runtimeInput), sha256: runtimeAudit.inputSha256 },
      seed_runtime_audit: { path: posixRelative(options.runtimeAudit), sha256: runtimeAudit.sha256 },
      candidate_search_tool: artifact.sources.search_tool,
      proof_tool: artifact.sources.proof_tool,
      PuzzleModel: artifact.sources.PuzzleModel,
      levelSolver: artifact.sources.levelSolver,
      types: artifact.sources.types,
      blockShape: artifact.sources.blockShape,
      campaign_floor_source: artifact.sources.campaign_floor_source,
    },
    outputs: {
      levels: posixRelative(candidatePath),
      levels_sha256: sha256(candidateBytes),
      canonical_level_specs_sha256: canonicalLevelsSha256,
      validation_routes: posixRelative(witnessPath),
      validation_routes_sha256: sha256(witnessBytes),
      core_plans: posixRelative(corePlanPath),
      core_plans_sha256: sha256(corePlanBytes),
    },
    proof_policy: {
      legacy_certificates_transferred: false,
      completion_witness: "upper bound only",
      necessary_reposition_floor: "requires new v6 strict verifier exhaustion below floor",
    },
    summary: {
      requested: records.length,
      assembled: records.length,
      emitted: records.length,
      exact_contract: records.length,
      validate_level_passed: records.length,
      completion_witness_replayed: records.length,
      candidate_core_plans: corePlanArtifact.levels.length,
    },
    levels: records.map((record) => ({
      level_id: levelLabel(record.level.id),
      level_spec_sha256: sha256(canonicalJson(record.level)),
      exact_contract_preservation: record.search.invariant_audit,
      completion_witness: record.search.quick_witness,
      candidate_core_plan_search: record.search.core_plan_search ?? null,
      candidate_core_plan_present: Boolean(record.corePlan),
    })),
  };
  const auditBytes = Buffer.from(`${JSON.stringify(bindingAudit, null, 2)}\n`, "utf8");
  await writeFile(auditPath, auditBytes);
  return { candidatePath, witnessPath, corePlanPath, auditPath, bindingAudit, artifact, corePlanArtifact };
}

async function runVerifierBatch({ batch, records, contractText, phase, maxStates }) {
  if (!records.length) return null;
  const proofDir = resolve(dirname(batch.candidatePath), `${phase}-proofs`);
  const ids = records.map((record) => record.level.id).sort((a, b) => a - b);
  const selection = compactLevelSelection(ids);
  const tag = `search-${phase}`;
  const args = [
    `--max-old-space-size=${Math.max(512, options.maxMemoryMb + 128)}`,
    verifierPath,
    "--input", batch.candidatePath,
    "--runtime-audit", batch.auditPath,
    "--witnesses", batch.witnessPath,
    "--core-plan", batch.corePlanPath,
    "--expected-contract-sha256", sha256(contractText),
    "--levels", selection,
    "--max-states", String(maxStates),
    "--max-memory-mb", String(options.maxMemoryMb),
    "--max-seconds", String(options.maxSeconds),
    "--core-upper-bound-max-states", String(options.coreUpperBoundMaxStates),
    "--skip-upper-bound",
    "--output-dir", proofDir,
    "--tag", tag,
  ];
  const result = await runProcess(process.execPath, args);
  if (![0, 2].includes(result.code)) {
    throw new Error(`${phase} verifier failed (${result.code ?? result.signal}):\n${result.stderr}\n${result.stdout}`);
  }
  const selectionTag = selection.replace(/[^a-zA-Z0-9_-]+/g, "-");
  const reportPath = resolve(proofDir, `reposition-floor-proof-${tag}-${selectionTag}.json`);
  const reportText = await readFile(reportPath, "utf8");
  return { reportPath, reportText, report: JSON.parse(reportText), process: result };
}

async function searchRuntimeCandidates(runtimeInput, contract, contractText) {
  const loaded = await loadLevels(runtimeInput);
  const seedAudit = await readRuntimeAudit(runtimeInput, loaded.levels, contractText);
  const contractById = new Map(contract.levels.map((entry) => [
    Number(String(entry.level_id).replace(/^Lv/i, "")), entry,
  ]));
  const levelById = new Map(loaded.levels.map((level) => [level.id, level]));
  const routeArtifact = JSON.parse(await readFile(options.runtimeRoutes, "utf8"));
  const sourceRoutes = routeMapFromArtifact(routeArtifact);
  const pools = [];

  for (const id of options.selectedIds) {
    const level = levelById.get(id);
    const target = contractById.get(id)?.our_design_target;
    const auditEntry = seedAudit.entriesById.get(id);
    if (!level || !target || !auditEntry) {
      pools.push({ level_id: levelLabel(id), status: "missing_seed_contract_or_audit", candidates: [] });
      continue;
    }
    if (!auditEntry.exact_contract?.exact || auditEntry.validate_level !== "pass") {
      pools.push({ level_id: levelLabel(id), status: "seed_not_contract_exact", candidates: [] });
      continue;
    }
    const expectedFloor = target.campaign_reposition_floor;
    if (level.designTargets?.minimumRepositionOverhead !== expectedFloor) {
      pools.push({
        level_id: levelLabel(id),
        status: "authored_floor_mismatch",
        expected: expectedFloor,
        actual: level.designTargets?.minimumRepositionOverhead ?? null,
        candidates: [],
      });
      continue;
    }
    const seen = new Set();
    const candidates = [];
    const cheapCounterexamples = [];
    let cheapCounterexampleCount = 0;
    const recordCheapCounterexample = (counterexample) => {
      cheapCounterexampleCount += 1;
      // The audit needs representative counterexamples, not dozens of large
      // duplicate routes retained for the whole mutation batch.
      if (cheapCounterexamples.length < 5) cheapCounterexamples.push(counterexample);
    };
    const candidateComparator = (left, right) => (
      right.search.quick_witness.reposition_overhead - left.search.quick_witness.reposition_overhead
      || left.search.quick_witness.explored_states - right.search.quick_witness.explored_states
      || left.search.level_spec_sha256.localeCompare(right.search.level_spec_sha256)
    );
    const pruneCandidates = () => {
      const limit = Math.max(options.keepTop * 4, 12);
      if (candidates.length <= limit) return;
      candidates.sort(candidateComparator);
      const identity = candidates.find((candidate) => candidate.search.heuristic === "identity");
      const retained = candidates.slice(0, limit);
      if (identity && !retained.includes(identity)) retained.push(identity);
      candidates.splice(0, candidates.length, ...retained);
      globalThis.gc?.();
    };
    const originalRoute = sourceRoutes.get(id);
    const identityAudit = contractPreservingMutationAudit(level, level, target, auditEntry);
    const identitySpecSha = sha256(canonicalJson(level));
    const identityWitness = identityCompletionWitness(level, originalRoute, options.quickSolverMaxStates);
    seen.add(identitySpecSha);
    if (identityWitness.solved && expectedFloor !== null
      && identityWitness.reposition_overhead < expectedFloor) {
      recordCheapCounterexample({
        attempt: "seed",
        heuristic: "identity",
        level_spec_sha256: identitySpecSha,
        reposition_overhead: identityWitness.reposition_overhead,
        route: identityWitness.route,
      });
    } else if (identityAudit.pass && identityWitness.solved) {
      candidates.push({
        level: clone(level),
        route: identityWitness.route,
        search: {
          attempt: "seed",
          heuristic: "identity",
          level_spec_sha256: identitySpecSha,
          legacy_certificate_transferred: false,
          geometry_repack: { pass: true, reports: [], identity: true },
          invariant_audit: identityAudit,
          quick_witness: identityWitness,
          floor_role: "completion upper bound only until strict verifier exhausts all lower-cost states",
        },
      });
    }
    for (let attempt = 0; attempt < options.attempts; attempt += 1) {
      const mutation = mutateRuntimeLevel(level, auditEntry, attempt, options.seed);
      if (!mutation.geometry.pass) continue;
      const invariantAudit = contractPreservingMutationAudit(level, mutation.level, target, auditEntry);
      if (!invariantAudit.pass) continue;
      const specSha = sha256(canonicalJson(mutation.level));
      if (seen.has(specSha)) continue;
      seen.add(specSha);
      const witness = quickSolverWitness(mutation.level, options.quickSolverMaxStates);
      if (witness.solved && expectedFloor !== null && witness.reposition_overhead < expectedFloor) {
        recordCheapCounterexample({
          attempt,
          heuristic: mutation.heuristic,
          level_spec_sha256: specSha,
          reposition_overhead: witness.reposition_overhead,
          route: witness.route,
        });
        continue;
      }
      if (!witness.solved) continue;
      candidates.push({
        level: mutation.level,
        route: witness.route,
        search: {
          attempt,
          heuristic: mutation.heuristic,
          level_spec_sha256: specSha,
          legacy_certificate_transferred: false,
          geometry_repack: mutation.geometry,
          invariant_audit: invariantAudit,
          quick_witness: witness,
          floor_role: "completion upper bound only until strict verifier exhausts all lower-cost states",
        },
      });
      if ((attempt + 1) % 8 === 0) pruneCandidates();
      globalThis.gc?.();
    }
    pruneCandidates();
    candidates.sort(candidateComparator);
    const retainedCandidates = retainTopCandidatesWithIdentity(candidates, options.keepTop);
    for (const candidate of retainedCandidates) {
      const coreSearch = deriveRelaxedCorePlan(candidate.level, candidate.route, expectedFloor);
      candidate.corePlan = coreSearch.plan;
      candidate.search.core_plan_search = coreSearch.audit;
    }
    pools.push({
      level_id: levelLabel(id),
      status: candidates.length ? "completion_witness_candidates" : "no_replaying_survivor",
      campaign_reposition_floor: expectedFloor,
      identity_checked: true,
      attempted_mutations: options.attempts,
      unique_contract_preserving: seen.size,
      cheap_below_floor_counterexamples: cheapCounterexampleCount,
      cheap_counterexample_samples: cheapCounterexamples,
      candidates: retainedCandidates,
    });
    console.log(`${levelLabel(id)}: variants=${seen.size}, below-floor=${cheapCounterexamples.length}, survivors=${candidates.length}, core-plans=${retainedCandidates.filter((candidate) => candidate.corePlan).length}`);
  }
  for (const id of options.preservedExistingIds) {
    pools.push({
      level_id: levelLabel(id),
      status: "preserved_existing_user_exclusion",
      user_exclusion: true,
      candidates: [],
    });
  }
  pools.sort((left, right) => Number(left.level_id.slice(2)) - Number(right.level_id.slice(2)));

  const searchDir = resolve(options.outputDir, "runtime-search");
  await mkdir(searchDir, { recursive: true });
  const poolPath = resolve(searchDir, "candidate-pool.json");
  const poolArtifact = {
    schema: "blockout-video-parity-v6-reposition-candidate-pool-v1",
    generated_at: new Date().toISOString(),
    applied_to_live_campaign: false,
    contract: { path: posixRelative(options.contract), sha256: sha256(contractText) },
    runtime: { path: posixRelative(runtimeInput), sha256: seedAudit.inputSha256 },
    runtime_audit: { path: posixRelative(options.runtimeAudit), sha256: seedAudit.sha256 },
    search_tool: { path: posixRelative(toolPath), sha256: sha256(await readFile(toolPath)) },
    proof_claim: "none; candidates require the bound verifier",
    preserved_existing_user_exclusion: options.preservedExistingIds.map(levelLabel),
    levels: pools,
  };
  await writeFile(poolPath, `${JSON.stringify(poolArtifact, null, 2)}\n`, "utf8");

  // Rank-by-rank: a cheap strict frontier first. A direct counterexample drops
  // the variant; a quick proof is accepted; an inconclusive survivor is sent
  // to the larger strict run only when requested.
  const finalById = new Map();
  const attempts = [];
  for (let rank = 0; rank < options.keepTop; rank += 1) {
    const records = pools.flatMap((pool) => {
      const id = Number(pool.level_id?.slice(2));
      if (finalById.has(id) || !pool.candidates?.[rank]) return [];
      return [pool.candidates[rank]];
    });
    if (!records.length) continue;
    const rankDir = resolve(searchDir, `rank-${String(rank + 1).padStart(2, "0")}`);
    const batch = await writeBoundCandidateBatch({
      directory: rankDir,
      stem: "preflight",
      records,
      contractText,
      runtimeInput,
      runtimeAudit: seedAudit,
    });
    const quick = await runVerifierBatch({
      batch,
      records,
      contractText,
      phase: "preflight",
      maxStates: options.quickProofMaxStates,
    });
    const quickById = new Map(quick.report.levels.map((entry) => [entry.level_id, entry]));
    const strictRecords = [];
    for (const record of records) {
      const proof = quickById.get(record.level.id);
      if (proof?.status?.startsWith("floor_lower_bound_proven")
        && proof.acceptance?.combined_playable_floor_acceptance === true) {
        finalById.set(record.level.id, {
          record, phase: "preflight", proof, reportPath: quick.reportPath, reportSha256: sha256(quick.reportText),
        });
      } else if (proof?.status !== "floor_disproven_counterexample" && options.strict) strictRecords.push(record);
      attempts.push({
        level_id: levelLabel(record.level.id), rank: rank + 1, phase: "preflight",
        status: proof?.status ?? "missing", report: posixRelative(quick.reportPath),
        report_sha256: sha256(quick.reportText),
      });
    }
    if (strictRecords.length) {
      const strictBatch = await writeBoundCandidateBatch({
        directory: rankDir,
        stem: "strict",
        records: strictRecords,
        contractText,
        runtimeInput,
        runtimeAudit: seedAudit,
      });
      const strict = await runVerifierBatch({
        batch: strictBatch,
        records: strictRecords,
        contractText,
        phase: "strict",
        maxStates: options.strictMaxStates,
      });
      const strictById = new Map(strict.report.levels.map((entry) => [entry.level_id, entry]));
      for (const record of strictRecords) {
        const proof = strictById.get(record.level.id);
        if (proof?.status?.startsWith("floor_lower_bound_proven")
          && proof.acceptance?.combined_playable_floor_acceptance === true) {
          finalById.set(record.level.id, {
            record, phase: "strict", proof, reportPath: strict.reportPath, reportSha256: sha256(strict.reportText),
          });
        }
        attempts.push({
          level_id: levelLabel(record.level.id), rank: rank + 1, phase: "strict",
          status: proof?.status ?? "missing", report: posixRelative(strict.reportPath),
          report_sha256: sha256(strict.reportText),
        });
      }
    }
  }

  const proofReportBindings = [...new Map(attempts.map((attempt) => [attempt.report, {
    path: attempt.report,
    sha256: attempt.report_sha256,
  }])).values()];
  for (const proofReport of proofReportBindings) {
    const current = sha256(await readFile(resolve(root, proofReport.path)));
    if (current !== proofReport.sha256) {
      throw new Error(`Proof report drifted before search audit capture: ${proofReport.path}`);
    }
  }
  const auditPath = resolve(searchDir, "search-and-proof-audit.json");
  const audit = {
    schema: "blockout-video-parity-v6-reposition-search-audit-v1",
    generated_at: new Date().toISOString(),
    binding: {
      contract: { path: posixRelative(options.contract), sha256: sha256(contractText) },
      runtime: { path: posixRelative(runtimeInput), sha256: seedAudit.inputSha256 },
      runtime_audit: { path: posixRelative(options.runtimeAudit), sha256: seedAudit.sha256 },
      runtime_canonical_level_specs_sha256: seedAudit.canonicalLevelsSha256,
      search_tool: { path: posixRelative(toolPath), sha256: sha256(await readFile(toolPath)) },
      verifier: { path: posixRelative(verifierPath), sha256: sha256(await readFile(verifierPath)) },
      PuzzleModel_sha256: sha256(await readFile(resolve(root, "src/core/PuzzleModel.ts"))),
      levelSolver_sha256: sha256(await readFile(resolve(root, "src/core/levelSolver.ts"))),
      types_sha256: sha256(await readFile(resolve(root, "src/core/types.ts"))),
      blockShape_sha256: sha256(await readFile(resolve(root, "src/core/blockShape.ts"))),
      campaign_floor_source_sha256: sha256(await readFile(resolve(root, "src/core/campaignDifficultyTargets.ts"))),
      proof_reports: proofReportBindings,
    },
    policy: {
      cheap_phase: "replayed completion below floor is immediate rejection; other candidates receive bounded strict preflight",
      strict_phase: "only exhaustive lower-cost frontier exhaustion certifies; every cap is inconclusive",
      additive_core_phase: "search may propose disjoint same-stage relaxed cores, but the independent verifier rebuilds every core, requires a replayed finite optimum, and exhausts each claimed lower-cost frontier",
      legacy_certificates_transferred: false,
    },
    limits: {
      attempts_per_level: options.attempts,
      retained_candidates_per_level: options.keepTop,
      quick_solver_max_states: options.quickSolverMaxStates,
      quick_proof_max_states: options.quickProofMaxStates,
      strict_proof_max_states: options.strictMaxStates,
      core_max_group_size: options.coreMaxGroupSize,
      core_max_subsets_per_level_spec: options.coreMaxSubsets,
      core_solver_max_states: options.coreSolverMaxStates,
      core_verifier_upper_bound_max_states: options.coreUpperBoundMaxStates,
      core_selection_max_nodes: options.coreSelectionMaxNodes,
    },
    summary: {
      requested: options.requestedIds.length,
      selected: options.selectedIds.length,
      preserved_existing_user_exclusion: options.preservedExistingIds.length,
      pools_with_completion_survivors: pools.filter((pool) => pool.candidates?.length).length,
      newly_floor_certified: finalById.size,
      unresolved: options.selectedIds.length - finalById.size,
      strict_enabled: options.strict,
    },
    attempts,
    certified: [...finalById.entries()].map(([id, result]) => ({
      level_id: levelLabel(id),
      phase: result.phase,
      level_spec_sha256: result.proof.level_spec_sha256,
      proof_report: posixRelative(result.reportPath),
      proof_report_sha256: result.reportSha256,
      status: result.proof.status,
      explored_states: result.proof.explored_states,
      completion_upper_bound: result.record.search.quick_witness.reposition_overhead,
      core_plan_used: Boolean(result.record.corePlan),
      core_plan_floor_sum: result.record.corePlan?.groups.reduce((sum, group) => sum + group.floor, 0) ?? null,
    })),
    levels: pools.map((pool) => ({
      level_id: pool.level_id,
      pool_status: pool.status,
      candidate_count: pool.candidates?.length ?? 0,
      final_status: pool.status === "preserved_existing_user_exclusion"
        ? "preserved_existing_user_exclusion"
        : finalById.has(Number(pool.level_id?.slice(2))) ? "floor_lower_bound_proven" : "unresolved",
    })),
  };
  await writeFile(auditPath, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ pool: poolPath, audit: auditPath, summary: audit.summary }, null, 2));
  return audit;
}

function runSelfTest() {
  const level = {
    id: 990101,
    name: "v6 search self test",
    difficulty: "normal",
    timeSeconds: 120,
    reward: 20,
    parMoves: 4,
    width: 4,
    height: 4,
    playable: Array.from({ length: 16 }, (_value, index) => [index % 4, Math.floor(index / 4)]),
    gates: [
      { id: "red", side: "top", offset: 0, size: 2, color: "red" },
      { id: "blue", side: "bottom", offset: 2, size: 2, color: "blue" },
    ],
    blocks: [
      { id: "a", x: 0, y: 0, shape: [[0, 0], [1, 0]], color: "red" },
      { id: "b", x: 2, y: 3, shape: [[0, 0], [1, 0]], color: "blue" },
    ],
    designTargets: { formulaVersion: "blockout-d1", calibratedDifficulty: 70, minimumRepositionOverhead: 1 },
  };
  runtime.validateLevel(level);
  const target = {
    board: { rows: 4, cols: 4, playable_cell_count: 16, playable_mask: ["####", "####", "####", "####"] },
    time_seconds: 120,
    full_level_block_count: 2,
    full_level_shape_histogram: { H2: 2 },
    full_level_occupied_cell_count: 4,
    opening_color_count: 2,
    full_level_color_count: 2,
    design_palette: ["red", "blue"],
    campaign_reposition_floor: 1,
    stage_partitions: [{ id: "opening", kind: "opening", count: 2, shape_histogram: { H2: 2 } }],
  };
  const auditEntry = {
    exact_contract: {
      exact: true,
      actual: { colors: { opening_hidden_color_carrier_ids: [] } },
    },
    validate_level: "pass",
  };
  const compatibility = exactLayoutCompatibility(level, target);
  const partition = partitionBlocksForTarget(level.blocks, target.stage_partitions);
  const mutations = Array.from({ length: 5 }, (_value, attempt) => (
    mutateRuntimeLevel(level, auditEntry, attempt, 12345)
  ));
  const mutationChecks = mutations.map((mutation) => (
    contractPreservingMutationAudit(level, mutation.level, target, auditEntry)
  ));
  const shapeChecks = ["S4", "H4", "L5", "T5"].map((id) => shapeIdOf(SHAPES[id][0]) === id);
  const packed = packStageAroundCore(
    level,
    [{ id: "fill", x: 0, y: 0, shape: [[0, 0]], color: "red" }],
    [{ id: "fixed", x: 0, y: 0, shape: [[0, 0], [1, 0]], color: "blue" }],
    10_000,
    9,
  );
  const sharedStageCoreSeed = coreSeedFor({
    level,
    audit: {
      strict_core_floor_groups: [
        { stage_index: 1, target_reposition_overhead: 1, block_ids: ["a"], route: [] },
        { stage_index: 2, target_reposition_overhead: 1, block_ids: ["b"], route: [] },
      ],
    },
  }, { ...target, campaign_reposition_floor: 2 });
  const additiveCoreLevel = {
    ...level,
    id: 990102,
    width: 6,
    height: 3,
    playable: Array.from({ length: 18 }, (_value, index) => [index % 6, Math.floor(index / 6)]),
    gates: [
      { id: "gate-a-red", side: "top", offset: 1, size: 1, color: "red" },
      { id: "gate-a-blue", side: "bottom", offset: 1, size: 1, color: "blue" },
      { id: "gate-b-green", side: "top", offset: 4, size: 1, color: "green" },
      { id: "gate-b-orange", side: "bottom", offset: 4, size: 1, color: "orange" },
    ],
    blocks: [
      { id: "a-red", x: 1, y: 2, shape: [[0, 0]], color: "red" },
      { id: "a-blue", x: 1, y: 0, shape: [[0, 0]], color: "blue" },
      { id: "b-green", x: 4, y: 2, shape: [[0, 0]], color: "green" },
      { id: "b-orange", x: 4, y: 0, shape: [[0, 0]], color: "orange" },
    ],
  };
  runtime.validateLevel(additiveCoreLevel);
  const additiveRoute = [
    { blockId: "a-red", path: [[0, 2]] },
    { blockId: "a-blue", path: [[1, 1], [1, 2]], exitSide: "bottom" },
    { blockId: "a-red", path: [[1, 2], [1, 1], [1, 0]], exitSide: "top" },
    { blockId: "b-green", path: [[5, 2]] },
    { blockId: "b-orange", path: [[4, 1], [4, 2]], exitSide: "bottom" },
    { blockId: "b-green", path: [[4, 2], [4, 1], [4, 0]], exitSide: "top" },
  ];
  const additiveRouteReplay = replayRoute(additiveCoreLevel, additiveRoute);
  const identityWitness = identityCompletionWitness(additiveCoreLevel, additiveRoute, 1);
  const retainedIdentity = retainTopCandidatesWithIdentity([
    { search: { heuristic: "corridor" } },
    { search: { heuristic: "identity" } },
  ], 1);
  const autoCorePlan = deriveRelaxedCorePlan(additiveCoreLevel, additiveRoute, 2, {
    ...options,
    coreMaxGroupSize: 2,
  });
  const timedLevel = {
    ...level,
    id: 990103,
    width: 3,
    height: 3,
    playable: Array.from({ length: 9 }, (_value, index) => [index % 3, Math.floor(index / 3)]),
    gates: [
      { id: "timed-blue-gate", side: "bottom", offset: 2, size: 1, color: "blue" },
      { id: "timed-red-gate", side: "top", offset: 0, size: 1, color: "red" },
    ],
    generators: [{
      id: "timed-gen", side: "top", offset: 0, spawn: [0, 0], queueBlockIds: ["timed-cargo"],
      trigger: "time", intervalSeconds: 1, initialDelaySeconds: 1,
    }],
    blocks: [
      { id: "timed-starter", x: 2, y: 2, shape: [[0, 0]], color: "blue" },
      { id: "timed-cargo", x: 0, y: 0, shape: [[0, 0]], color: "red" },
    ],
  };
  runtime.validateLevel(timedLevel);
  const materializedTimed = materializeTimedSolverRoute(timedLevel, normalizeRoute([
    { blockId: "timed-starter", path: [], exitSide: "bottom" },
    { blockId: "timed-cargo", path: [], exitSide: "top" },
  ]));
  const stagedFairnessLevel = clone(additiveCoreLevel);
  stagedFairnessLevel.id = 990104;
  stagedFairnessLevel.shutters = [{
    id: "later-stage", x: 0, y: 0, width: 1, height: 1, count: 1, skin: "staging",
  }];
  for (const block of stagedFairnessLevel.blocks.filter((block) => block.id.startsWith("b-"))) {
    block.shutterId = "later-stage";
  }
  runtime.validateLevel(stagedFairnessLevel);
  const fairSubsets = enumerateCoreSubsets(stagedFairnessLevel, [
    { kind: "drag", blockId: "a-red", path: [[0, 2]] },
    { kind: "drag", blockId: "b-green", path: [[5, 2]] },
  ], 2, 2);
  const checks = {
    exact_layout_compatibility: compatibility.pass,
    exact_stage_partition: partition.pass,
    all_inventory_preserving_mutations: mutationChecks.every((entry) => entry.pass),
    all_heuristic_stage_repacks_complete: mutations.every((mutation) => (
      mutation.geometry.pass && mutation.geometry.reports.some((report) => report.stage === "opening")
    )),
    new_shape_vocabulary: shapeChecks.every(Boolean),
    fixed_core_remainder_packing: packed.pass,
    multiple_cores_share_stage_with_cumulative_capacity:
      sharedStageCoreSeed?.cores.length === 2
      && sharedStageCoreSeed.cores.every((core) => core.target_stage_index === 1),
    automatic_disjoint_core_plan:
      additiveRouteReplay.replayed && additiveRouteReplay.complete
      && additiveRouteReplay.repositions === 2
      && autoCorePlan.plan?.groups.length === 2
      && autoCorePlan.plan.groups.reduce((sum, group) => sum + group.floor, 0) >= 2
      && new Set(autoCorePlan.plan.groups.flatMap((group) => group.block_ids)).size
        === autoCorePlan.plan.groups.flatMap((group) => group.block_ids).length,
    identity_candidate_prefers_bound_replaying_route:
      identityWitness.solved
      && identityWitness.source === "runtime-validation-route"
      && identityWitness.reposition_overhead === 2
      && identityWitness.explored_states === 0,
    identity_candidate_survives_top_k_truncation:
      retainedIdentity.length === 1 && retainedIdentity[0].search.heuristic === "identity",
    timed_solver_route_materialization:
      materializedTimed.replay?.replayed && materializedTimed.replay.complete
      && materializedTimed.inserted_waits === 1
      && materializedTimed.route.some((action) => action.kind === "wait" && action.seconds === 1),
    staged_core_enumeration_is_fair_under_global_cap:
      new Set(fairSubsets.subsets.map((subset) => subset.stage)).size === 2
      && fairSubsets.subsets.some((subset) => subset.stage === "opening")
      && fairSubsets.subsets.some((subset) => subset.stage === "shutter:later-stage"),
    compact_batch_level_selection:
      compactLevelSelection([1, 2, 3, 5, 7, 8, 8]) === "1-3,5,7-8",
  };
  const failures = Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name);
  if (failures.length) throw new Error(`Self-test failed: ${failures.join(", ")}`);
  return {
    self_test: "pass",
    checks,
    source_binding: {
      tool_sha256: sha256(awaitableToolBytes),
      PuzzleModel_sha256: sha256(sourceBytes.PuzzleModel),
      levelSolver_sha256: sha256(sourceBytes.levelSolver),
      blockShape_sha256: sha256(sourceBytes.blockShape),
      runtime_bundle_sha256: sha256(runtimeBundleBytes),
    },
  };
}

const sourceBytes = {
  PuzzleModel: await readFile(resolve(root, "src/core/PuzzleModel.ts")),
  levelSolver: await readFile(resolve(root, "src/core/levelSolver.ts")),
  blockShape: await readFile(resolve(root, "src/core/blockShape.ts")),
};
const awaitableToolBytes = await readFile(toolPath);

if (options.selfTest) {
  console.log(JSON.stringify(runSelfTest(), null, 2));
  process.exit(0);
}

const contractText = await readFile(options.contract, "utf8");
const contract = JSON.parse(contractText);
if (!Array.isArray(contract.levels)) throw new Error("Contract does not contain a levels array");
const initialBindings = new Map([
  [options.contract, sha256(contractText)],
  [toolPath, sha256(awaitableToolBytes)],
  [resolve(root, "src/core/PuzzleModel.ts"), sha256(sourceBytes.PuzzleModel)],
  [resolve(root, "src/core/levelSolver.ts"), sha256(sourceBytes.levelSolver)],
  [resolve(root, "src/core/blockShape.ts"), sha256(sourceBytes.blockShape)],
  [verifierPath, sha256(await readFile(verifierPath))],
]);
for (const path of [
  ...(options.prepareLegacy ? [options.base, options.baseRoutes, options.legacy] : []),
  ...(options.searchRuntime && !options.assemble ? [options.runtime, options.runtimeAudit, options.runtimeRoutes] : []),
  ...(options.assemble ? [assemblerPath] : []),
]) {
  if (await exists(path)) initialBindings.set(path, sha256(await readFile(path)));
}

let prepared = null;
if (options.prepareLegacy) prepared = await prepareLegacyMigration(contract, contractText);
if (prepared?.assembled && options.searchRuntime) {
  options.runtime = prepared.assembled.runtime;
  options.runtimeAudit = prepared.assembled.audit;
  options.runtimeRoutes = prepared.assembled.routes;
}
if (options.searchRuntime) await searchRuntimeCandidates(options.runtime, contract, contractText);

const drift = [];
for (const [path, expected] of initialBindings) {
  const current = sha256(await readFile(path));
  if (current !== expected) drift.push({ path: posixRelative(path), expected, current });
}
if (drift.length) {
  throw new Error(`Source binding drifted during candidate search; outputs are not certifiable: ${JSON.stringify(drift)}`);
}
