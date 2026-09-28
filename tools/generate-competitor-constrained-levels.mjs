import { build } from "esbuild";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const contractRelative = process.env.FORMAL_CONTRACT_RELATIVE
  ?? "deliverables/level-generation-blueprint/blockout-lv001-lv100-competitor-constrained-design-contract-v4.json";
const generatedRelative = process.env.FORMAL_GENERATED_RELATIVE
  ?? "src/core/competitorConstrainedLevels.generated.ts";
const reportDirRelative = process.env.FORMAL_REPORT_DIR_RELATIVE
  ?? "playtest-results/experiments/competitor-composition-r140";
const r139SeedRelative = "playtest-results/experiments/competitor-composition-r139/selected-candidates-lv001-lv020.json";
const contractPath = resolve(root, contractRelative);
const generatedPath = resolve(root, generatedRelative);
const reportDir = resolve(root, reportDirRelative);
const previousFormalPath = resolve(reportDir, "formal-candidates.json");
const strictProofScript = resolve(
  root,
  process.env.FORMAL_PROOF_SCRIPT_RELATIVE
    ?? "playtest-results/experiments/competitor-composition-r140/prove-reposition-lower-bound.mjs",
);
const hardSearchFrom = Math.max(1, Number.parseInt(process.env.FORMAL_LEVEL_FROM ?? "1", 10) || 1);
const hardSearchTo = Math.min(100, Number.parseInt(process.env.FORMAL_LEVEL_TO ?? "100", 10) || 100);
const requestedHardIds = new Set((process.env.FORMAL_LEVEL_IDS ?? "").split(",")
  .map((value) => Number.parseInt(value.trim(), 10))
  .filter((value) => Number.isInteger(value) && value >= 1 && value <= 100));
const requestedGenerationIds = new Set((process.env.FORMAL_GENERATE_IDS ?? "").split(",")
  .map((value) => Number.parseInt(value.trim(), 10))
  .filter((value) => Number.isInteger(value) && value >= 1 && value <= 100));
const forcedStagingIds = new Set((process.env.FORMAL_FORCE_STAGE_IDS ?? "").split(",")
  .map((value) => Number.parseInt(value.trim(), 10))
  .filter((value) => Number.isInteger(value) && value >= 1 && value <= 100));
// Five simultaneous source covers plus a side-generator queue require seven
// opening/hidden packing batches (Lv44). Keep headroom for later video levels.
const MAX_DENSE_STAGE_BATCH_COUNT = 10;
const forcedStageBatchCount = Math.min(MAX_DENSE_STAGE_BATCH_COUNT, Math.max(2,
  Number.parseInt(process.env.FORMAL_FORCE_STAGE_BATCH_COUNT ?? "2", 10) || 2));
const configuredTargetStageBatchCount = process.env.FORMAL_TARGET_STAGE_BATCH_COUNT === undefined
  ? null
  : Math.min(MAX_DENSE_STAGE_BATCH_COUNT, Math.max(2,
    Number.parseInt(process.env.FORMAL_TARGET_STAGE_BATCH_COUNT, 10) || 2));
const configuredTrials = Math.max(0, Number.parseInt(process.env.FORMAL_TRIALS ?? "", 10) || 0);
const configuredTrialStart = Math.max(0, Number.parseInt(process.env.FORMAL_TRIAL_START ?? "0", 10) || 0);
const configuredSeedOffset = Math.max(0, Number.parseInt(process.env.FORMAL_SEED_OFFSET ?? "0", 10) || 0);
const configuredValidationCap = Math.max(0, Number.parseInt(process.env.FORMAL_VALIDATION_CAP ?? "0", 10) || 0);
const configuredGateExtra = Math.max(0, Number.parseInt(process.env.FORMAL_GATE_EXTRA ?? "0", 10) || 0);
const configuredDuplicateGateCount = Math.max(0, Number.parseInt(process.env.FORMAL_DUPLICATE_GATE_COUNT ?? "0", 10) || 0);
const configuredGateLayoutJitter = Math.max(0, Number.parseInt(process.env.FORMAL_GATE_LAYOUT_JITTER ?? "0", 10) || 0);
const configuredStageDensity = Math.min(1, Math.max(0.25, Number.parseFloat(process.env.FORMAL_STAGE_DENSITY ?? "0.60") || 0.60));
const configuredStagingSkin = process.env.FORMAL_STAGING_SKIN;
const configuredMaximizeForeign = process.env.FORMAL_MAXIMIZE_FOREIGN === "1";
const configuredPackPreferEdges = process.env.FORMAL_PACK_PREFER_EDGES === "1";
const configuredOptimizeStageColors = process.env.FORMAL_OPTIMIZE_STAGE_COLORS === "1";
const configuredAllowStageColorSubsets = process.env.FORMAL_ALLOW_STAGE_COLOR_SUBSETS === "1";
const configuredRecombineStageVariants = process.env.FORMAL_RECOMBINE_STAGE_VARIANTS === "1";
const configuredRecombineStageVariantLimit = Math.max(6,
  Number.parseInt(process.env.FORMAL_RECOMBINE_STAGE_VARIANT_LIMIT ?? "48", 10) || 48);
const configuredExactColorVariants = Math.max(0,
  Number.parseInt(process.env.FORMAL_EXACT_COLOR_VARIANTS ?? "0", 10) || 0);
const configuredExactColorCap = Math.max(1,
  Number.parseInt(process.env.FORMAL_EXACT_COLOR_CAP ?? "3000", 10) || 3_000);
const configuredKeepBestUnderFloor = process.env.FORMAL_KEEP_BEST_UNDER_FLOOR === "1";
const configuredFixedGateLayoutPath = process.env.FORMAL_FIXED_GATE_LAYOUT_PATH
  ? resolve(root, process.env.FORMAL_FIXED_GATE_LAYOUT_PATH)
  : null;
const configuredFixedGateLayout = configuredFixedGateLayoutPath
  ? JSON.parse(await readFile(configuredFixedGateLayoutPath, "utf8"))
  : null;
if (configuredFixedGateLayout !== null && !Array.isArray(configuredFixedGateLayout)) {
  throw new Error("FORMAL_FIXED_GATE_LAYOUT_PATH must contain a JSON gate array");
}
const configuredFixedStagePartitionPath = process.env.FORMAL_FIXED_STAGE_PARTITION_PATH
  ? resolve(root, process.env.FORMAL_FIXED_STAGE_PARTITION_PATH)
  : null;
const configuredFixedStagePartition = configuredFixedStagePartitionPath
  ? JSON.parse(await readFile(configuredFixedStagePartitionPath, "utf8"))
  : null;
if (configuredFixedStagePartition !== null && !Array.isArray(configuredFixedStagePartition)) {
  throw new Error("FORMAL_FIXED_STAGE_PARTITION_PATH must contain a JSON array of shape histograms");
}
const repackHardSearch = process.env.FORMAL_REPACK === "1";
const configuredBalancedRepack = process.env.FORMAL_BALANCED_REPACK === "1";
const configuredStagedOwnMouth = process.env.FORMAL_STAGED_DESIRED_OWN_MOUTH === undefined
  ? null
  : Math.max(0, Number.parseInt(process.env.FORMAL_STAGED_DESIRED_OWN_MOUTH, 10) || 0);
const refreshCached = process.env.FORMAL_REFRESH_CACHED === "1";
const externalStrictSearch = process.env.FORMAL_EXTERNAL_STRICT_SEARCH === "1";
const stageScreenCap = Math.max(0, Number.parseInt(process.env.FORMAL_STAGE_SCREEN_CAP ?? "0", 10) || 0);
// Strict acceptance is the safe default. The legacy report-only bulk emitter is
// retained solely for reproducibility and requires an explicit opt-out.
const strictAcceptance = process.env.FORMAL_STRICT_ACCEPT !== "0";
const strictSelfTest = process.env.FORMAL_STRICT_SELF_TEST === "1";
const strictOutputRelative = process.env.FORMAL_STRICT_OUTPUT_DIR
  ?? `${reportDirRelative}/strict-acceptance`;
const strictOutputDir = resolve(root, strictOutputRelative);
const strictProofMaxStates = Math.max(1, Number.parseInt(process.env.FORMAL_PROOF_MAX_STATES ?? "250000", 10) || 250_000);
const strictProofMaxMemoryMb = Math.max(1, Number.parseInt(process.env.FORMAL_PROOF_MAX_MEMORY_MB ?? "700", 10) || 700);
const strictProofTranspositionCap = Math.max(1, Number.parseInt(process.env.FORMAL_PROOF_TRANSPOSITION_CAP ?? "100000", 10) || 100_000);
const strictProofTopK = Math.min(5, Math.max(1, Number.parseInt(process.env.FORMAL_STRICT_PROOF_TOP_K ?? "3", 10) || 3));
const strictProofCandidateOffset = Math.max(0, Number.parseInt(process.env.FORMAL_STRICT_PROOF_OFFSET ?? "0", 10) || 0);
const strictFreezeVariantBudget = Math.max(0, Number.parseInt(process.env.FORMAL_STRICT_FREEZE_VARIANTS ?? "0", 10) || 0);
const strictProofRelaxedBound = process.env.FORMAL_PROOF_RELAXED_BOUND === "1";
const strictProofRelaxedMaxStates = Math.max(1, Number.parseInt(process.env.FORMAL_PROOF_RELAXED_MAX_STATES ?? "5000", 10) || 5_000);
const strictProofSymmetryReduction = process.env.FORMAL_PROOF_SYMMETRY_REDUCTION === "1";
const strictStageDecomposition = process.env.FORMAL_PROOF_STAGE_DECOMPOSITION !== "0";
const strictStageSplitBias = Number.parseInt(process.env.FORMAL_STAGE_SPLIT_BIAS ?? "0", 10) || 0;
const hardSearchRangeLabel = requestedHardIds.size
  ? `ids-${[...requestedHardIds].sort((a, b) => a - b).map((id) => String(id).padStart(3, "0")).join("-")}`
  : `${String(hardSearchFrom).padStart(3, "0")}-${String(hardSearchTo).padStart(3, "0")}`;
const hardSearchRequested = (levelId) => requestedHardIds.size
  ? requestedHardIds.has(levelId)
  : levelId >= hardSearchFrom && levelId <= hardSearchTo;

if (strictAcceptance && !strictSelfTest && requestedHardIds.size === 0) {
  throw new Error("FORMAL_STRICT_ACCEPT=1 requires an explicit FORMAL_LEVEL_IDS list; bulk all-level strict runs are disabled.");
}
if (strictAcceptance && requestedHardIds.size > 20) {
  throw new Error("Strict acceptance is limited to at most 20 explicit IDs per incremental run.");
}
if (strictAcceptance && repackHardSearch && requestedHardIds.size > 1) {
  throw new Error("Strict repack search is single-level only; use one FORMAL_LEVEL_IDS value per process.");
}
if (strictProofMaxMemoryMb > 900) {
  throw new Error("FORMAL_PROOF_MAX_MEMORY_MB may not exceed 900 in strict acceptance mode.");
}
if (strictProofTranspositionCap > 250_000) {
  throw new Error("FORMAL_PROOF_TRANSPOSITION_CAP may not exceed 250000.");
}

const SHAPE_VARIANTS = {
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
  SQ3: [[
    [0, 0], [1, 0], [2, 0],
    [0, 1], [1, 1], [2, 1],
    [0, 2], [1, 2], [2, 2],
  ]],
};

const SHAPE_ORDER = Object.keys(SHAPE_VARIANTS);
const SIDES = ["top", "right", "bottom", "left"];
const stagedSkinFor = (levelId) => configuredStagingSkin
  ?? ([17, 28].includes(levelId) ? "staging" : levelId === 77 ? "shutter" : "generator");
const keyOf = (x, y) => `${x},${y}`;
const pointOf = (key) => key.split(",").map(Number);
const shapeArea = (shapeId) => SHAPE_VARIANTS[shapeId][0].length;
const pacingForTarget = (target, targetD1) => ({
  difficulty: targetD1 >= 80 ? "super" : targetD1 >= 70 ? "hard" : "normal",
  // Video-parity contracts lock the observed countdown independently from D1.
  // Older contracts omit this field and retain the historical D1 mapping.
  timeSeconds: target.time_seconds ?? (targetD1 >= 80 ? 120 : targetD1 >= 70 ? 150 : 180),
});
const shapeBounds = (shape) => ({
  width: Math.max(...shape.map(([x]) => x)) + 1,
  height: Math.max(...shape.map(([, y]) => y)) + 1,
});
const isSolidBarOrRectangle = (shape) => {
  const bounds = shapeBounds(shape);
  return bounds.width * bounds.height === shape.length;
};
const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();

const readJsonOr = async (path, fallback) => readFile(path, "utf8").then(JSON.parse).catch((error) => {
  if (error?.code === "ENOENT") return fallback;
  throw error;
});

const runNodeProcess = (args) => new Promise((resolveProcess, rejectProcess) => {
  const child = spawn(process.execPath, args, {
    cwd: root,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
  child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
  child.on("error", rejectProcess);
  child.on("close", (code, signal) => {
    if (code === 0) {
      resolveProcess({ stdout, stderr });
      return;
    }
    const detail = [stdout.trim(), stderr.trim()].filter(Boolean).join("\n");
    rejectProcess(new Error(`Strict proof child exited with code ${code ?? "null"}${signal ? ` (${signal})` : ""}${detail ? `:\n${detail}` : ""}`));
  });
});

const runStrictProofArtifact = async ({ inputPath, witnessPath, reportTag, levelId }) => {
  const proofReportPath = resolve(dirname(strictProofScript), `reposition-lower-bound-report-${reportTag}-lv${String(levelId).padStart(3, "0")}.json`);
  const proofArgs = [
    `--max-old-space-size=${Math.min(800, strictProofMaxMemoryMb + 100)}`,
    "--expose-gc",
    strictProofScript,
    "--input", inputPath,
    "--witnesses", witnessPath,
    "--report-tag", reportTag,
    "--levels", String(levelId),
    "--algorithm", "bounded-dfs",
    "--max-states", String(strictProofMaxStates),
    "--max-memory-mb", String(strictProofMaxMemoryMb),
    "--transposition-cap", String(strictProofTranspositionCap),
    "--validation-max-states", "1000",
    "--skip-official",
    "--stop-after-floor",
  ];
  if (strictProofRelaxedBound) proofArgs.push("--relaxed-bound-pruning", "--relaxed-bound-max-states", String(strictProofRelaxedMaxStates));
  else proofArgs.push("--no-relaxed-bound-pruning");
  proofArgs.push(strictProofSymmetryReduction ? "--symmetry-reduction" : "--no-symmetry-reduction");
  const childResult = await runNodeProcess(proofArgs);
  if (childResult.stdout.trim()) process.stdout.write(childResult.stdout);
  if (childResult.stderr.trim()) process.stderr.write(childResult.stderr);
  const proofReport = await readJsonOr(proofReportPath, null);
  const levelKey = `Lv${String(levelId).padStart(3, "0")}`;
  return {
    proofReportPath,
    proofReport,
    proofEntry: proofReport?.reports?.find((entry) => entry.level_id === levelKey) ?? null,
  };
};

const classifyStrictProof = (entry) => {
  if (!entry?.available) return { accepted: false, status: "rejected_missing_proof_candidate" };
  const proof = entry.proof ?? {};
  const witnessReplayed = entry.selected_solution_witness?.replay?.replayed === true;
  const certified = entry.certification?.target_floor_certified_for_playable_level === true;
  if (certified && proof.lower_bound_statement_proven === true && proof.floor_disproven !== true && witnessReplayed) {
    return { accepted: true, status: "strict_floor_certified" };
  }
  if (proof.floor_disproven === true) return { accepted: false, status: "rejected_floor_disproven" };
  if (["inconclusive_state_cap", "inconclusive_memory_cap"].includes(proof.status)
    || proof.lower_bound_statement_proven !== true) {
    return { accepted: false, status: "rejected_inconclusive" };
  }
  if (!witnessReplayed) return { accepted: false, status: "rejected_missing_replayed_completion_witness" };
  return { accepted: false, status: "rejected_uncertified" };
};

const assertStrictClassifierSelfTest = () => {
  const certified = classifyStrictProof({
    available: true,
    proof: { status: "floor_lower_bound_proven_minimum_inconclusive", lower_bound_statement_proven: true, floor_disproven: false },
    selected_solution_witness: { replay: { replayed: true } },
    certification: { target_floor_certified_for_playable_level: true },
  });
  const disproven = classifyStrictProof({
    available: true,
    proof: { status: "floor_disproven_counterexample", lower_bound_statement_proven: false, floor_disproven: true },
    selected_solution_witness: { replay: { replayed: true } },
    certification: { target_floor_certified_for_playable_level: false },
  });
  const inconclusive = classifyStrictProof({
    available: true,
    proof: { status: "inconclusive_state_cap", lower_bound_statement_proven: false, floor_disproven: false },
    selected_solution_witness: { replay: { replayed: true } },
    certification: { target_floor_certified_for_playable_level: false },
  });
  const edgePlacement = { x: 1, y: 0, shape: [[0, 0], [1, 0], [0, 1], [1, 1]] };
  const directGate = { side: "top", offset: 1, size: 2 };
  const partialOverlapGate = { side: "top", offset: 0, size: 2 };
  if (!certified.accepted || certified.status !== "strict_floor_certified"
    || disproven.accepted || disproven.status !== "rejected_floor_disproven"
    || inconclusive.accepted || inconclusive.status !== "rejected_inconclusive"
    || !placementCanExitAtGate(edgePlacement, directGate, 4, 4)
    || placementCanExitAtGate(edgePlacement, partialOverlapGate, 4, 4)
    || placementCanExitAtGate({ ...edgePlacement, y: 1 }, directGate, 4, 4)) {
    throw new Error("Strict proof classifier self-test failed.");
  }
};

if (strictSelfTest) {
  assertStrictClassifierSelfTest();
  const proofSelfTest = await runNodeProcess([
    "--max-old-space-size=512",
    strictProofScript,
    "--self-test",
    "--no-write",
  ]);
  if (proofSelfTest.stderr.trim()) process.stderr.write(proofSelfTest.stderr);
  process.stdout.write(proofSelfTest.stdout);
  console.log(JSON.stringify({
    strict_acceptance_classifier: "pass",
    direct_exit_gate_mouth_classifier: "pass",
    canonical_outputs_written: false,
  }, null, 2));
  process.exit(0);
}

const contractText = await readFile(contractPath, "utf8");
const contract = JSON.parse(contractText);
if (!Array.isArray(contract.levels) || contract.levels.length !== 100) {
  throw new Error(`Expected a 100-level v4 contract, got ${contract.levels?.length ?? "missing"}.`);
}

const bundle = await build({
  stdin: {
    contents: `
      import { LEVELS } from "./src/core/levels.ts";
      import { PuzzleModel, validateLevel } from "./src/core/PuzzleModel.ts";
      import { solveLevelForValidation, solveLevelOptimally } from "./src/core/levelSolver.ts";
      import { scoreBlockOutLevel, calibratedBlockOutDifficulty } from "./src/core/blockOutDifficulty.ts";
      export { LEVELS, PuzzleModel, validateLevel, solveLevelForValidation, solveLevelOptimally, scoreBlockOutLevel, calibratedBlockOutDifficulty };
    `,
    resolveDir: root,
    sourcefile: "competitor-constrained-generator-entry.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
const moduleUrl = `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`;
const {
  LEVELS,
  PuzzleModel,
  validateLevel,
  solveLevelForValidation,
  solveLevelOptimally,
  scoreBlockOutLevel,
  calibratedBlockOutDifficulty,
} = await import(moduleUrl);
const currentById = new Map(LEVELS.map((level) => [level.id, level]));
const r139Seed = JSON.parse(await readFile(resolve(root, r139SeedRelative), "utf8"));
const r139SeedById = new Map((r139Seed.levels ?? []).map((entry) => [entry.level.id, entry.level]));
const previousFormal = await readFile(previousFormalPath, "utf8").then(JSON.parse).catch(() => ({ levels: [] }));
const previousEntryById = new Map((previousFormal.levels ?? []).map((entry) => [entry.level.id, entry]));
const previousHardById = new Map((previousFormal.levels ?? [])
  .filter((entry) => entry.validation?.generation_mode && entry.validation.generation_mode !== "contract_pack_with_authored_peel_route")
  .map((entry) => [entry.level.id, entry.level]));
const previousHardEntryById = new Map((previousFormal.levels ?? [])
  .filter((entry) => entry.validation?.generation_mode && entry.validation.generation_mode !== "contract_pack_with_authored_peel_route")
  .map((entry) => [entry.level.id, entry]));

const makeRng = (seed) => {
  let state = (seed >>> 0) || 0x9e3779b9;
  return () => {
    state = Math.imul(state ^ (state >>> 16), 0x21f0aaad);
    state = Math.imul(state ^ (state >>> 15), 0x735a2d97);
    state ^= state >>> 15;
    return (state >>> 0) / 0x100000000;
  };
};

const shuffled = (items, seed) => {
  const result = [...items];
  const rng = makeRng(seed);
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(rng() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
};

const maskPoints = (rows) => rows.flatMap((row, y) => [...row].flatMap((cell, x) => (
  cell === "#" ? [[x, y]] : []
)));

const maskRows = (width, height, points) => {
  const cells = new Set(points.map(([x, y]) => keyOf(x, y)));
  return Array.from({ length: height }, (_, y) => Array.from(
    { length: width },
    (__, x) => cells.has(keyOf(x, y)) ? "#" : ".",
  ).join(""));
};

const connectedAndFourEdge = (width, height, points) => {
  if (!points.length) return false;
  const cells = new Set(points.map(([x, y]) => keyOf(x, y)));
  const queue = [points[0]];
  const seen = new Set([keyOf(points[0][0], points[0][1])]);
  for (let index = 0; index < queue.length; index += 1) {
    const [x, y] = queue[index];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const key = keyOf(x + dx, y + dy);
      if (cells.has(key) && !seen.has(key)) {
        seen.add(key);
        queue.push([x + dx, y + dy]);
      }
    }
  }
  return seen.size === cells.size
    && points.some(([, y]) => y === 0)
    && points.some(([x]) => x === width - 1)
    && points.some(([, y]) => y === height - 1)
    && points.some(([x]) => x === 0);
};

const expandHistogram = (histogram) => SHAPE_ORDER.flatMap((shapeId) => Array.from(
  { length: histogram[shapeId] ?? 0 },
  (_, index) => ({ shapeId, ordinal: index + 1 }),
));

const fixedStageBatchesFor = ({ levelId, target }) => {
  const sourcePartition = Array.isArray(target.stage_partitions)
    ? target.stage_partitions.map((stage) => stage?.shape_histogram ?? stage)
    : configuredFixedStagePartition;
  if (sourcePartition === null || sourcePartition === undefined) return null;
  if (sourcePartition.length === 1) return null;
  if (sourcePartition.length < 2
    || sourcePartition.length > MAX_DENSE_STAGE_BATCH_COUNT) {
    throw new Error(
      `Lv${String(levelId).padStart(3, "0")}: fixed stage partition must contain 2..${MAX_DENSE_STAGE_BATCH_COUNT} batches`,
    );
  }
  const totals = Object.fromEntries(SHAPE_ORDER.map((shapeId) => [shapeId, 0]));
  // Video-derived partitions may legitimately contain a one-piece generator
  // queue or final Lift layer. The former density-search minimum is only for
  // synthetic partitions and must not rewrite source mechanism quantities.
  const minimumPiecesPerBatch = Array.isArray(target.stage_partitions) ? 1
    : levelId >= 21 || sourcePartition.length > 4 ? 4 : 2;
  const batches = sourcePartition.map((histogram, batchIndex) => {
    if (!histogram || typeof histogram !== "object" || Array.isArray(histogram)) {
      throw new Error(`Lv${String(levelId).padStart(3, "0")}: fixed batch ${batchIndex + 1} must be a shape histogram`);
    }
    for (const [shapeId, count] of Object.entries(histogram)) {
      if (!SHAPE_ORDER.includes(shapeId)) {
        throw new Error(`Lv${String(levelId).padStart(3, "0")}: fixed batch ${batchIndex + 1} uses unknown shape ${shapeId}`);
      }
      if (!Number.isSafeInteger(count) || count < 0) {
        throw new Error(`Lv${String(levelId).padStart(3, "0")}: fixed batch ${batchIndex + 1} has invalid ${shapeId} count`);
      }
      totals[shapeId] += count;
    }
    const pieces = expandHistogram(histogram);
    if (pieces.length < minimumPiecesPerBatch) {
      throw new Error(
        `Lv${String(levelId).padStart(3, "0")}: fixed batch ${batchIndex + 1} has ${pieces.length} blocks; minimum is ${minimumPiecesPerBatch}`,
      );
    }
    const area = pieces.reduce((sum, piece) => sum + shapeArea(piece.shapeId), 0);
    const capacity = batchIndex === sourcePartition.length - 1 || configuredStagingSkin === "staging"
      ? target.board.playable_cell_count
      : target.board.playable_cell_count - 1;
    if (area > capacity) {
      throw new Error(
        `Lv${String(levelId).padStart(3, "0")}: fixed batch ${batchIndex + 1} occupies ${area} cells; capacity is ${capacity}`,
      );
    }
    return pieces;
  });
  for (const shapeId of SHAPE_ORDER) {
    const expected = target.full_level_shape_histogram[shapeId] ?? 0;
    if (totals[shapeId] !== expected) {
      throw new Error(
        `Lv${String(levelId).padStart(3, "0")}: fixed stage partition totals ${totals[shapeId]} ${shapeId}; expected ${expected}`,
      );
    }
  }
  return batches;
};

const HIGH_DENSITY_STAGED_LEVELS = new Set(
  (process.env.FORMAL_DENSE_REPACK_LEVEL_IDS ?? "35,38,77")
    .split(",")
    .map((value) => Number.parseInt(value.trim(), 10))
    .filter(Number.isSafeInteger),
);

const partitionBatches = (pieces, playableCount, requiresStaging, density = 0.60) => {
  if (!requiresStaging) return [pieces];
  // One cell remains free for the closed stage cover. The base candidate uses
  // a conservative density; hard-search may explicitly request denser waves.
  const capacity = Math.max(1, Math.min(playableCount - 1, Math.floor((playableCount - 1) * density)));
  const sorted = [...pieces].sort((a, b) => shapeArea(b.shapeId) - shapeArea(a.shapeId));
  const totalArea = sorted.reduce((sum, piece) => sum + shapeArea(piece.shapeId), 0);
  for (let batchCount = Math.max(2, Math.ceil(totalArea / capacity)); batchCount <= sorted.length; batchCount += 1) {
    const batches = Array.from({ length: batchCount }, () => ({ area: 0, pieces: [] }));
    let failed = false;
    for (const piece of sorted) {
      const area = shapeArea(piece.shapeId);
      const batch = batches
        .filter((candidate) => candidate.area + area <= capacity)
        .sort((left, right) => left.area - right.area || left.pieces.length - right.pieces.length)[0];
      if (!batch) {
        failed = true;
        break;
      }
      batch.area += area;
      batch.pieces.push(piece);
    }
    if (!failed && batches.every((batch) => batch.pieces.length)) {
      return batches.map((batch) => batch.pieces);
    }
  }
  throw new Error("Unable to partition staged pieces under the configured density cap.");
};

const partitionBalancedStageBatches = (
  pieces,
  batchCount,
  playableCount,
  seed = 0,
  minimumPiecesPerBatch = 2,
) => {
  const count = Math.max(2, batchCount);
  const batches = Array.from({ length: count }, (_, index) => ({
    area: 0,
    capacity: Math.max(1, index === count - 1 ? playableCount : playableCount - 1),
    pieces: [],
  }));
  const sorted = shuffled(pieces, seed).sort((left, right) => (
    shapeArea(right.shapeId) - shapeArea(left.shapeId)
  ));
  const suffixArea = Array(sorted.length + 1).fill(0);
  for (let index = sorted.length - 1; index >= 0; index -= 1) {
    suffixArea[index] = suffixArea[index + 1] + shapeArea(sorted[index].shapeId);
  }
  const memo = new Set();
  let nodes = 0;
  const visit = (pieceIndex) => {
    nodes += 1;
    if (nodes > 500_000) return false;
    if (pieceIndex === sorted.length) {
      return batches.every((batch) => batch.pieces.length >= minimumPiecesPerBatch);
    }
    const remainingCapacity = batches.reduce((sum, batch) => sum + batch.capacity - batch.area, 0);
    if (suffixArea[pieceIndex] > remainingCapacity) return false;
    const remainingPieces = sorted.length - pieceIndex;
    const minimumStillNeeded = batches.reduce(
      (sum, batch) => sum + Math.max(0, minimumPiecesPerBatch - batch.pieces.length),
      0,
    );
    if (remainingPieces < minimumStillNeeded) return false;
    const state = `${pieceIndex}|${batches.map((batch) => `${batch.area}:${batch.pieces.length}`).join("|")}`;
    if (memo.has(state)) return false;
    memo.add(state);

    const piece = sorted[pieceIndex];
    const area = shapeArea(piece.shapeId);
    const candidates = batches
      .map((batch, index) => ({ batch, index }))
      .filter(({ batch }) => batch.area + area <= batch.capacity)
      // Preserve each stage's shape mixture where possible. The recursive
      // fallback, unlike the former one-pass greedy allocator, can still
      // rebalance pieces when a capacity edge would otherwise dead-end.
      .sort((left, right) => Number(right.batch.pieces.length < minimumPiecesPerBatch)
        - Number(left.batch.pieces.length < minimumPiecesPerBatch)
        || (left.batch.area / left.batch.capacity) - (right.batch.area / right.batch.capacity)
        || left.batch.pieces.length - right.batch.pieces.length
        || left.index - right.index);
    const symmetric = new Set();
    for (const { batch } of candidates) {
      const signature = `${batch.capacity}:${batch.area}:${batch.pieces.length}`;
      if (symmetric.has(signature)) continue;
      symmetric.add(signature);
      batch.area += area;
      batch.pieces.push(piece);
      if (visit(pieceIndex + 1)) return true;
      batch.pieces.pop();
      batch.area -= area;
    }
    return false;
  };
  return visit(0) ? batches.map((batch) => batch.pieces) : undefined;
};

const ensureDenseOpeningBatch = (sourceBatches, playableCount, minimumRatio = 0.5) => {
  if (!sourceBatches || sourceBatches.length < 2) return sourceBatches;
  const batches = sourceBatches.map((batch) => [...batch]);
  const areaOf = (batch) => batch.reduce((sum, piece) => sum + shapeArea(piece.shapeId), 0);
  const targetArea = Math.ceil(playableCount * minimumRatio);
  const capacity = playableCount - 1;
  while (areaOf(batches[0]) < targetArea) {
    const donorIndex = batches
      .map((batch, index) => ({ index, batch }))
      .filter(({ index, batch }) => index > 0 && batch.length > 2)
      .sort((left, right) => areaOf(right.batch) - areaOf(left.batch) || right.batch.length - left.batch.length)[0]?.index;
    if (donorIndex === undefined) return undefined;
    const needed = targetArea - areaOf(batches[0]);
    const candidates = batches[donorIndex].map((piece, index) => ({ piece, index, area: shapeArea(piece.shapeId) }))
      .filter(({ area }) => areaOf(batches[0]) + area <= capacity)
      .sort((left, right) => Math.abs(left.area - needed) - Math.abs(right.area - needed)
        || right.area - left.area || left.index - right.index);
    const selected = candidates[0];
    if (!selected) return undefined;
    batches[0].push(selected.piece);
    batches[donorIndex].splice(selected.index, 1);
  }
  return batches;
};

const enumeratePlacements = (shapeId, playable, width, height, reservedKey) => {
  const placements = [];
  const seen = new Set();
  for (const shape of SHAPE_VARIANTS[shapeId]) {
    const { width: shapeWidth, height: shapeHeight } = shapeBounds(shape);
    for (let y = 0; y <= height - shapeHeight; y += 1) {
      for (let x = 0; x <= width - shapeWidth; x += 1) {
        const keys = shape.map(([dx, dy]) => keyOf(x + dx, y + dy));
        if (keys.some((key) => !playable.has(key) || key === reservedKey)) continue;
        const signature = keys.slice().sort().join("|");
        if (seen.has(signature)) continue;
        seen.add(signature);
        placements.push({ x, y, shape, keys, signature });
      }
    }
  }
  return placements;
};

const packBatch = ({
  pieces,
  points,
  width,
  height,
  reservedKey,
  seed,
  maxNodes = 350_000,
  deadlineMs = 2_500,
  preferEdges = false,
  preferFillers = false,
}) => {
  const playable = new Set(points.map(([x, y]) => keyOf(x, y)));
  const counts = Object.fromEntries(SHAPE_ORDER.map((shapeId) => [shapeId, 0]));
  for (const piece of pieces) counts[piece.shapeId] += 1;
  const placementsByShape = Object.fromEntries(SHAPE_ORDER.map((shapeId) => {
    const placements = shuffled(
      enumeratePlacements(shapeId, playable, width, height, reservedKey),
      seed ^ sha256(shapeId).charCodeAt(0),
    ).map((placement, randomizedRank) => ({ ...placement, randomizedRank }));
    if (preferEdges) placements.sort((a, b) => {
      const edgeCells = (placement) => placement.shape.filter(([dx, dy]) => (
        placement.x + dx === 0 || placement.x + dx === width - 1
        || placement.y + dy === 0 || placement.y + dy === height - 1
      )).length;
      return edgeCells(b) - edgeCells(a) || a.randomizedRank - b.randomizedRank;
    });
    return [shapeId, placements];
  }));
  const impossibleShape = SHAPE_ORDER.find((shapeId) => counts[shapeId] > 0 && !placementsByShape[shapeId].length);
  if (impossibleShape) return { ok: false, reason: `shape ${impossibleShape} has no legal placement`, nodes: 0 };

  const occupied = new Set();
  const chosen = [];
  let nodes = 0;
  const deadline = Date.now() + deadlineMs;

  const recurse = () => {
    nodes += 1;
    if (nodes > maxNodes || Date.now() > deadline) return false;
    const remainingCount = Object.values(counts).reduce((sum, count) => sum + count, 0);
    if (!remainingCount) return true;

    let selectedShape;
    let selectedAvailable;
    let singleAvailable;
    for (const shapeId of SHAPE_ORDER) {
      if (!counts[shapeId]) continue;
      const available = placementsByShape[shapeId].filter((placement) => (
        placement.keys.every((key) => !occupied.has(key))
      ));
      if (available.length < counts[shapeId]) return false;
      if (shapeId === "SINGLE") singleAvailable = available;
      const pressure = available.length / counts[shapeId];
      const selectedPressure = selectedAvailable ? selectedAvailable.length / counts[selectedShape] : Number.POSITIVE_INFINITY;
      if (!selectedShape || pressure < selectedPressure || (
        pressure === selectedPressure && shapeArea(shapeId) > shapeArea(selectedShape)
      )) {
        selectedShape = shapeId;
        selectedAvailable = available;
      }
    }
    // Near-exact tilings made mostly from fixed-orientation bars can have a
    // parity requirement on the leftover singleton cells. Explore that small
    // filler choice first on alternating geometry trials; the ordinary
    // pressure-first order remains available on the other trials.
    if (preferFillers && counts.SINGLE > 0 && singleAvailable?.length) {
      selectedShape = "SINGLE";
      selectedAvailable = singleAvailable;
    }

    const options = selectedAvailable.sort((a, b) => {
      const adjacency = (placement) => placement.keys.reduce((sum, key) => {
        const [x, y] = pointOf(key);
        return sum + [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => (
          occupied.has(keyOf(x + dx, y + dy))
        )).length;
      }, 0);
      return adjacency(b) - adjacency(a) || a.randomizedRank - b.randomizedRank;
    });
    counts[selectedShape] -= 1;
    for (const placement of options) {
      for (const key of placement.keys) occupied.add(key);
      chosen.push({ shapeId: selectedShape, ...placement });
      if (recurse()) return true;
      chosen.pop();
      for (const key of placement.keys) occupied.delete(key);
    }
    counts[selectedShape] += 1;
    return false;
  };

  const ok = recurse();
  return ok
    ? { ok: true, placements: chosen.map((placement) => ({ ...placement, shape: placement.shape.map((point) => [...point]) })), nodes }
    : { ok: false, reason: nodes > maxNodes ? "packing node limit" : "no simultaneous packing found", nodes };
};

const requiredSpan = (shape, side) => {
  const bounds = shapeBounds(shape);
  return side === "top" || side === "bottom" ? bounds.width : bounds.height;
};

const gateSlots = (points, width, height) => {
  const playable = new Set(points.map(([x, y]) => keyOf(x, y)));
  const slots = [];
  for (const side of SIDES) {
    const limit = side === "top" || side === "bottom" ? width : height;
    for (let size = 3; size >= 1; size -= 1) {
      for (let offset = 0; offset + size <= limit; offset += 1) {
        const cells = Array.from({ length: size }, (_, index) => {
          const coordinate = offset + index;
          if (side === "top") return keyOf(coordinate, 0);
          if (side === "bottom") return keyOf(coordinate, height - 1);
          if (side === "left") return keyOf(0, coordinate);
          return keyOf(width - 1, coordinate);
        });
        if (cells.every((key) => playable.has(key))) slots.push({ side, offset, size });
      }
    }
  }
  return slots;
};

const slotsOverlap = (a, b) => a.side === b.side
  && a.offset < b.offset + b.size
  && b.offset < a.offset + a.size;

const hasDistinctShapeAssignment = (slots, shapes) => {
  const matchedPieceBySlot = Array(slots.length).fill(-1);
  const visit = (pieceIndex, seen) => {
    for (let slotIndex = 0; slotIndex < slots.length; slotIndex += 1) {
      if (seen.has(slotIndex) || requiredSpan(shapes[pieceIndex], slots[slotIndex].side) > slots[slotIndex].size) continue;
      seen.add(slotIndex);
      if (matchedPieceBySlot[slotIndex] < 0 || visit(matchedPieceBySlot[slotIndex], seen)) {
        matchedPieceBySlot[slotIndex] = pieceIndex;
        return true;
      }
    }
    return false;
  };
  for (let pieceIndex = 0; pieceIndex < shapes.length; pieceIndex += 1) visit(pieceIndex, new Set());
  return matchedPieceBySlot.every((pieceIndex) => pieceIndex >= 0);
};

const chooseGates = ({ points, width, height, colorCount, pieces }) => {
  const shapes = pieces.map((piece) => SHAPE_VARIANTS[piece.shapeId][0]);
  const slots = gateSlots(points, width, height).sort((a, b) => (
    b.size - a.size || SIDES.indexOf(a.side) - SIDES.indexOf(b.side) || a.offset - b.offset
  ));
  let nodes = 0;
  let selected;
  const recurse = (start, chosen) => {
    nodes += 1;
    if (nodes > 250_000) return false;
    if (chosen.length === colorCount) {
      if (!shapes.every((shape) => chosen.some((slot) => requiredSpan(shape, slot.side) <= slot.size))) return false;
      if (!hasDistinctShapeAssignment(chosen, shapes)) return false;
      selected = [...chosen];
      return true;
    }
    for (let index = start; index < slots.length; index += 1) {
      const slot = slots[index];
      if (chosen.some((other) => slotsOverlap(slot, other))) continue;
      chosen.push(slot);
      if (recurse(index + 1, chosen)) return true;
      chosen.pop();
    }
    return false;
  };
  recurse(0, []);
  return selected ? { ok: true, slots: selected, nodes } : { ok: false, reason: "cannot allocate non-overlapping gates for every palette color", nodes };
};

const blockOrigins = (shape, playable, occupied, width, height, reservedKey) => {
  const { width: shapeWidth, height: shapeHeight } = shapeBounds(shape);
  const origins = [];
  for (let y = 0; y <= height - shapeHeight; y += 1) {
    for (let x = 0; x <= width - shapeWidth; x += 1) {
      const keys = shape.map(([dx, dy]) => keyOf(x + dx, y + dy));
      if (keys.every((key) => playable.has(key) && !occupied.has(key) && key !== reservedKey)) origins.push([x, y]);
    }
  }
  return origins;
};

const pathToGate = ({ block, blocks, gates, points, width, height, reservedKey }) => {
  const playable = new Set(points.map(([x, y]) => keyOf(x, y)));
  const occupied = new Set();
  for (const other of blocks) {
    if (other.id === block.id) continue;
    for (const [dx, dy] of other.shape) occupied.add(keyOf(other.x + dx, other.y + dy));
  }
  const validOrigins = new Set(blockOrigins(block.shape, playable, occupied, width, height, reservedKey).map(([x, y]) => keyOf(x, y)));
  const start = keyOf(block.x, block.y);
  if (!validOrigins.has(start)) return undefined;
  const queue = [[block.x, block.y]];
  const parent = new Map([[start, null]]);
  const exitAt = (x, y) => gates.find((gate) => {
    if (gate.color !== block.color || requiredSpan(block.shape, gate.side) > gate.size) return false;
    const cells = block.shape.map(([dx, dy]) => [x + dx, y + dy]);
    const xs = cells.map(([cellX]) => cellX);
    const ys = cells.map(([, cellY]) => cellY);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const atEdge = gate.side === "top" ? minY === 0
      : gate.side === "bottom" ? maxY === height - 1
        : gate.side === "left" ? minX === 0
          : maxX === width - 1;
    if (!atEdge) return false;
    return gate.side === "top" || gate.side === "bottom"
      ? minX >= gate.offset && maxX < gate.offset + gate.size
      : minY >= gate.offset && maxY < gate.offset + gate.size;
  });
  for (let index = 0; index < queue.length; index += 1) {
    const [x, y] = queue[index];
    const gate = exitAt(x, y);
    if (gate) {
      const path = [];
      let cursor = keyOf(x, y);
      while (cursor !== start) {
        path.push(pointOf(cursor));
        cursor = parent.get(cursor);
      }
      path.reverse();
      return { path, exitSide: gate.side };
    }
    for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
      const next = keyOf(x + dx, y + dy);
      if (!validOrigins.has(next) || parent.has(next)) continue;
      parent.set(next, keyOf(x, y));
      queue.push([x + dx, y + dy]);
    }
  }
  return undefined;
};

const deadlineCapacitiesCanMatch = (capacities, requirements) => {
  if (!requirements.length) return true;
  if (capacities.length < requirements.length) return false;
  const available = [...capacities].sort((left, right) => right - left);
  const needed = requirements.map((requirement) => requirement.value).sort((left, right) => right - left);
  return needed.every((value, index) => available[index] >= value);
};

const deadlinePrefixAllows = ({
  shapeId,
  clearCapacity,
  capacitiesByShape,
  totalByShape,
  requirementsByShape,
}) => {
  const requirements = requirementsByShape.get(shapeId) ?? [];
  if (!requirements.length) return true;
  const after = [...(capacitiesByShape.get(shapeId) ?? []), clearCapacity];
  const total = totalByShape.get(shapeId) ?? 0;
  // Hall's condition for deadline matching: for every exact value V, at most
  // (all carriers - requirements needing >= V) carriers may be consumed below
  // V. This leaves enough same-shape pieces untouched until their countdown is
  // actually thawed, without prematurely assigning a particular piece as ice.
  return [...new Set(requirements.map((requirement) => requirement.value))].every((threshold) => (
    after.filter((capacity) => capacity < threshold).length
      <= total - requirements.filter((requirement) => requirement.value >= threshold).length
  ));
};

const assignColorsAndPeel = ({
  placements,
  gates,
  palette,
  points,
  width,
  height,
  reservedKey,
  levelId,
  batchIndex,
  requireAllColors = true,
  numericDeadlinePlan = null,
}) => {
  const blocks = placements.map((placement, index) => ({
    id: `cc-${String(levelId).padStart(3, "0")}-b${batchIndex + 1}-${String(index + 1).padStart(2, "0")}`,
    x: placement.x,
    y: placement.y,
    shape: placement.shape,
    color: palette[0],
    shapeId: placement.shapeId,
  }));
  const remaining = [...blocks];
  const route = [];
  const usedColors = new Set();
  const requirementsByShape = new Map();
  for (const requirement of numericDeadlinePlan?.requirements ?? []) {
    if (!requirementsByShape.has(requirement.shapeId)) requirementsByShape.set(requirement.shapeId, []);
    requirementsByShape.get(requirement.shapeId).push(requirement);
  }
  // An exact post_melt_shell=0 contract makes shell and numeric carriers
  // disjoint. The runtime assembler chooses generic shells from the route-latest
  // eligible blocks, so reserve deterministic surplus pieces as that tail. This
  // prevents a correctly delayed numeric carrier from being selected as a shell
  // and then excluded during numeric assignment (Lv77/Lv87/Lv98).
  const disjointShellTailIds = new Set();
  const availableByShape = new Map();
  for (const block of blocks) availableByShape.set(block.shapeId, (availableByShape.get(block.shapeId) ?? 0) + 1);
  const reserveTail = (shapeId, amount) => {
    const candidates = blocks
      .filter((block) => !disjointShellTailIds.has(block.id) && (!shapeId || block.shapeId === shapeId))
      .sort((left, right) => left.shape.length - right.shape.length || left.id.localeCompare(right.id));
    let reserved = 0;
    for (const block of candidates) {
      if (reserved >= amount) break;
      const required = requirementsByShape.get(block.shapeId)?.length ?? 0;
      if ((availableByShape.get(block.shapeId) ?? 0) - 1 < required) continue;
      disjointShellTailIds.add(block.id);
      availableByShape.set(block.shapeId, (availableByShape.get(block.shapeId) ?? 0) - 1);
      reserved += 1;
    }
    return reserved;
  };
  for (const [shapeId, amount] of Object.entries(numericDeadlinePlan?.disjointShellTailByShape ?? {})) {
    reserveTail(shapeId, Number(amount));
  }
  let genericTailRemaining = Number(numericDeadlinePlan?.disjointGenericShellTailCount ?? 0);
  while (genericTailRemaining > 0) {
    const candidates = blocks.filter((block) => {
      if (disjointShellTailIds.has(block.id)) return false;
      const required = requirementsByShape.get(block.shapeId)?.length ?? 0;
      return (availableByShape.get(block.shapeId) ?? 0) - 1 >= required;
    }).sort((left, right) => (
      Number(requirementsByShape.has(left.shapeId)) - Number(requirementsByShape.has(right.shapeId))
      || ((availableByShape.get(right.shapeId) ?? 0) - (requirementsByShape.get(right.shapeId)?.length ?? 0))
        - ((availableByShape.get(left.shapeId) ?? 0) - (requirementsByShape.get(left.shapeId)?.length ?? 0))
      || left.shape.length - right.shape.length
      || left.id.localeCompare(right.id)
    ));
    if (!candidates.length) break;
    const block = candidates[0];
    disjointShellTailIds.add(block.id);
    availableByShape.set(block.shapeId, (availableByShape.get(block.shapeId) ?? 0) - 1);
    genericTailRemaining -= 1;
  }
  const totalByShape = new Map();
  for (const block of blocks) {
    if (disjointShellTailIds.has(block.id)) continue;
    totalByShape.set(block.shapeId, (totalByShape.get(block.shapeId) ?? 0) + 1);
  }
  const capacitiesByShape = new Map();
  const shellCapacitiesByShape = new Map();
  const shellCarrierCountByShape = new Map(Object.entries(numericDeadlinePlan?.shellCarrierCountByShape ?? {}));
  const shellBoundRequirementsByShape = new Map();
  for (const requirement of numericDeadlinePlan?.requirements ?? []) {
    if (!requirement.requiresShell) continue;
    if (!shellBoundRequirementsByShape.has(requirement.shapeId)) shellBoundRequirementsByShape.set(requirement.shapeId, []);
    shellBoundRequirementsByShape.get(requirement.shapeId).push(requirement);
  }
  let clearedLayers = Number(numericDeadlinePlan?.clearLayersBeforeBatch ?? 0);
  while (remaining.length) {
    const candidates = [];
    const nonTailRemaining = remaining.filter((block) => !disjointShellTailIds.has(block.id));
    const clearingReservedTail = nonTailRemaining.length === 0;
    for (const block of remaining) {
      if (!clearingReservedTail && disjointShellTailIds.has(block.id)) continue;
      const clearCapacity = clearedLayers;
      if (!disjointShellTailIds.has(block.id) && !deadlinePrefixAllows({
        shapeId: block.shapeId,
        clearCapacity,
        capacitiesByShape,
        totalByShape,
        requirementsByShape,
      })) continue;
      const remainingSameShapeAfter = remaining.filter((candidate) => candidate.shapeId === block.shapeId).length - 1;
      const guaranteedShellCarrier = remainingSameShapeAfter < (shellCarrierCountByShape.get(block.shapeId) ?? 0);
      if (guaranteedShellCarrier && !deadlinePrefixAllows({
        shapeId: block.shapeId,
        clearCapacity,
        capacitiesByShape: shellCapacitiesByShape,
        totalByShape: shellCarrierCountByShape,
        requirementsByShape: shellBoundRequirementsByShape,
      })) continue;
      for (let gateIndex = 0; gateIndex < gates.length; gateIndex += 1) {
        const gate = gates[gateIndex];
        if (!palette.includes(gate.color)) continue;
        if (requiredSpan(block.shape, gate.side) > gate.size) continue;
        block.color = gate.color;
        const result = pathToGate({ block, blocks: remaining, gates, points, width, height, reservedKey });
        if (result) candidates.push({ block, gate, result, gateIndex, clearCapacity, guaranteedShellCarrier });
      }
    }
    if (!candidates.length) return { ok: false, reason: `batch ${batchIndex + 1} has no peelable block with the selected gates` };
    candidates.sort((a, b) => (
      Number(usedColors.has(a.gate.color)) - Number(usedColors.has(b.gate.color))
      || a.result.path.length - b.result.path.length
      || a.block.shape.length - b.block.shape.length
      || a.block.id.localeCompare(b.block.id)
    ));
    const selected = candidates[0];
    selected.block.color = selected.gate.color;
    usedColors.add(selected.gate.color);
    route.push({ blockId: selected.block.id, path: selected.result.path, exitSide: selected.result.exitSide });
    if (!disjointShellTailIds.has(selected.block.id)) {
      if (!capacitiesByShape.has(selected.block.shapeId)) capacitiesByShape.set(selected.block.shapeId, []);
      capacitiesByShape.get(selected.block.shapeId).push(selected.clearCapacity);
    }
    if (selected.guaranteedShellCarrier) {
      if (!shellCapacitiesByShape.has(selected.block.shapeId)) shellCapacitiesByShape.set(selected.block.shapeId, []);
      shellCapacitiesByShape.get(selected.block.shapeId).push(selected.clearCapacity);
    }
    // Every base exit clears one layer. A carrier that is now guaranteed to
    // be among the route-latest contracted shell pieces contributes its one
    // additional runtime clear immediately after that exit.
    clearedLayers += 1 + Number(selected.guaranteedShellCarrier);
    remaining.splice(remaining.indexOf(selected.block), 1);
  }

  for (const [shapeId, requirements] of requirementsByShape) {
    if (!deadlineCapacitiesCanMatch(capacitiesByShape.get(shapeId) ?? [], requirements)) {
      return { ok: false, reason: `batch ${batchIndex + 1} cannot retain ${shapeId} numeric carriers to their exact thaw values` };
    }
  }
  for (const [shapeId, requirements] of shellBoundRequirementsByShape) {
    if (!deadlineCapacitiesCanMatch(shellCapacitiesByShape.get(shapeId) ?? [], requirements)) {
      return { ok: false, reason: `batch ${batchIndex + 1} cannot retain shell-bound ${shapeId} numeric carriers to their exact thaw values` };
    }
  }

  // A level must use exactly the contracted number of colors. If the greedy
  // peel did not exercise a gate, recolor a compatible drag without changing
  // its geometry, then rebuild that drag against its original board state.
  const missing = requireAllColors ? palette.filter((color) => !usedColors.has(color)) : [];
  for (const color of missing) {
    const gate = gates.find((candidate) => candidate.color === color);
    let replaced = false;
    for (let index = 0; index < route.length && !replaced; index += 1) {
      const block = blocks.find((candidate) => candidate.id === route[index].blockId);
      if (!block || requiredSpan(block.shape, gate.side) > gate.size) continue;
      const live = blocks.filter((candidate) => route.findIndex((drag) => drag.blockId === candidate.id) >= index);
      const previousColor = block.color;
      block.color = color;
      const result = pathToGate({ block, blocks: live, gates, points, width, height, reservedKey });
      if (result) {
        route[index] = { blockId: block.id, path: result.path, exitSide: result.exitSide };
        replaced = true;
      } else {
        block.color = previousColor;
      }
    }
    if (!replaced) return { ok: false, reason: `cannot exercise palette color ${color} in batch ${batchIndex + 1}` };
  }
  return { ok: true, blocks, route };
};

const replay = (level, drags) => {
  const model = new PuzzleModel(level);
  for (let dragIndex = 0; dragIndex < drags.length; dragIndex += 1) {
    const drag = drags[dragIndex];
    model.beginAction();
    for (let pathIndex = 0; pathIndex < drag.path.length; pathIndex += 1) {
      const [x, y] = drag.path[pathIndex];
      if (!model.moveBlock(drag.blockId, x, y)) {
        return { ok: false, error: `drag ${dragIndex + 1} step ${pathIndex + 1} cannot move ${drag.blockId} to ${x},${y}` };
      }
    }
    if (drag.exitSide) {
      const result = model.tryExit(drag.blockId, drag.exitSide);
      if (!result.ok) return { ok: false, error: `drag ${dragIndex + 1} cannot exit ${drag.blockId} via ${drag.exitSide}` };
    }
    if (!model.commitAction()) return { ok: false, error: `drag ${dragIndex + 1} did not mutate the puzzle` };
  }
  const snapshot = model.snapshot();
  return snapshot.complete
    ? { ok: true, moves: snapshot.moves, cleared: snapshot.cleared }
    : { ok: false, error: `${snapshot.blocks.length} blocks remain after authored route` };
};

const sameHistogram = (blocks, expected) => {
  const actual = {};
  for (const block of blocks) {
    const shapeId = block.shapeId ?? shapeIdOf(block.shape);
    actual[shapeId] = (actual[shapeId] ?? 0) + 1;
  }
  return SHAPE_ORDER.every((shapeId) => (actual[shapeId] ?? 0) === (expected[shapeId] ?? 0));
};

const normalizedShapeSignature = (shape) => {
  const minX = Math.min(...shape.map(([x]) => x));
  const minY = Math.min(...shape.map(([, y]) => y));
  return shape.map(([x, y]) => [x - minX, y - minY]).sort((a, b) => a[1] - b[1] || a[0] - b[0])
    .map(([x, y]) => `${x},${y}`).join("|");
};

const shapeSignatures = new Map(SHAPE_ORDER.flatMap((shapeId) => SHAPE_VARIANTS[shapeId].map((shape) => (
  [normalizedShapeSignature(shape), shapeId]
))));

function shapeIdOf(shape) {
  return shapeSignatures.get(normalizedShapeSignature(shape)) ?? "UNKNOWN";
}

const sameMask = (level, rows) => JSON.stringify(maskRows(level.width, level.height, level.playable)) === JSON.stringify(rows);

const baseBodyPaletteForTarget = (target) => {
  const partitions = target.stage_partitions ?? [];
  const openingCount = Number(target.opening_color_count ?? target.full_level_color_count);
  const fullCount = Number(target.full_level_color_count);
  // When the untouched source opening is also the only block stage, a larger
  // full-level palette can only come from a concealed mechanism carrier (for
  // example numeric ice or an inner shell layer). The base geometry layer has
  // no such mechanism slots yet, so it must preserve the visible palette and
  // defer the missing colors to the runtime assembler.
  const deferredToMechanism = partitions.length <= 1 && openingCount < fullCount;
  return target.design_palette.slice(0, deferredToMechanism ? openingCount : fullCount);
};

const baseStageSlices = (level, target) => {
  const partitions = target.stage_partitions?.length
    ? target.stage_partitions
    : [{ id: "opening", kind: "opening", count: level.blocks.length, shape_histogram: target.full_level_shape_histogram }];
  let cursor = 0;
  return partitions.map((partition, index) => {
    const blocks = level.blocks.slice(cursor, cursor + Number(partition.count));
    cursor += Number(partition.count);
    return { index, partition, blocks, end: cursor };
  });
};

const normalizedRuntimeShapeId = (shapeId) => {
  const normalized = String(shapeId ?? "").toUpperCase();
  return ["SQ3", "RECT3X3", "RECT3X2", "RECT2X3"].includes(normalized) ? "RECT2X3" : normalized;
};

const contractPartitionsForTarget = (target) => target.stage_partitions?.length
  ? target.stage_partitions
  : [{ id: "opening", kind: "opening", count: target.full_level_block_count }];

const contractStageIndex = (target, stageId) => {
  const partitions = contractPartitionsForTarget(target);
  if (!stageId) return partitions.length === 1 ? 0 : null;
  const exact = partitions.findIndex((partition) => partition.id === stageId);
  if (exact >= 0) return exact;
  // The runtime Lift calls its visible opening cohort layer 1 even though the
  // base geometry partition is named `opening`.
  if (/^lift-layer-1$/i.test(String(stageId))) {
    const opening = partitions.findIndex((partition) => partition.kind === "opening" || partition.id === "opening");
    return opening >= 0 ? opening : 0;
  }
  return null;
};

const numericRequirementsForTarget = (target) => {
  const numeric = target.mechanism_contract?.numeric_ice;
  if (!numeric?.count) return { mode: "none", requirements: [] };
  if (Array.isArray(numeric.items) && numeric.items.length) {
    return {
      mode: "exact_items",
      requirements: numeric.items.map((item, index) => ({
        index,
        shapeId: normalizedRuntimeShapeId(item.shape),
        value: Number(item.value),
        stageId: item.stage_id ?? null,
        opening: null,
      })),
    };
  }

  const values = [...(numeric.values ?? [])].map(Number).sort((left, right) => right - left);
  const shapes = expandHistogram(numeric.shape_histogram ?? {})
    .map((piece) => normalizedRuntimeShapeId(piece.shapeId));
  while (values.length < numeric.count) values.push(values.at(-1) ?? 1);
  while (shapes.length < numeric.count) shapes.push(null);
  const exactOpeningCount = Number.isInteger(numeric.opening_visible_count)
    ? Math.max(0, Math.min(Number(numeric.count), Number(numeric.opening_visible_count)))
    : null;
  return {
    mode: "aggregate",
    requirements: Array.from({ length: Number(numeric.count) }, (_, index) => ({
      index,
      shapeId: shapes[index],
      value: values[index],
      stageId: null,
      opening: numeric.stage_scope === "hidden_only" ? false
        : exactOpeningCount !== null ? index < exactOpeningCount
          : numeric.stage_scope === "opening_and_hidden" && index < 2 ? index === 0
            : null,
    })),
  };
};

const numericDeadlinePlansForTarget = ({ target, batches }) => {
  const normalized = numericRequirementsForTarget(target);
  const plans = batches.map(() => ({
    requirements: [],
    shellCarrierCountByShape: {},
    shellExtraLayerCount: 0,
    disjointShellTailByShape: {},
    disjointGenericShellTailCount: 0,
    clearLayersBeforeBatch: 0,
  }));
  if (!normalized.requirements.length) {
    return { plans, mode: normalized.mode, requirementCount: 0, plannedRequirementCount: 0 };
  }

  const shells = target.mechanism_contract?.shells;
  const postMeltShell = target.mechanism_contract?.numeric_ice?.post_melt_shell;
  const numericMustExcludeShells = postMeltShell !== null
    && postMeltShell !== undefined
    && postMeltShell !== "unclear"
    && Number.isFinite(Number(postMeltShell))
    && Number(postMeltShell) === 0;
  const shellEntries = [];
  if (Array.isArray(shells?.items) && shells.items.length) {
    for (const item of shells.items) {
      const batchIndex = contractStageIndex(target, item.stage_id);
      const shapeId = normalizedRuntimeShapeId(item.shape);
      if (batchIndex === null || !shapeId) continue;
      shellEntries.push({
        batchIndex,
        shapeId,
        extraLayers: 1,
        requiresNumericIce: Boolean(item.requires_numeric_ice),
        stageId: item.stage_id ?? null,
      });
    }
  } else if (shells?.count) {
    const shellBatchIndex = contractPartitionsForTarget(target).length === 1
      || Number(shells.opening_visible_count) === Number(shells.count)
      ? contractStageIndex(target, "opening")
      : null;
    if (shellBatchIndex !== null) {
      const shapedShells = expandHistogram(shells.shape_histogram ?? {});
      for (const piece of shapedShells) {
        shellEntries.push({
          batchIndex: shellBatchIndex,
          shapeId: normalizedRuntimeShapeId(piece.shapeId),
          extraLayers: 1,
          requiresNumericIce: false,
          stageId: shellBatchIndex === 0 ? "opening" : null,
        });
      }
      const unshapedShellCount = Math.max(0, Number(shells.count) - shapedShells.length);
      plans[shellBatchIndex].shellExtraLayerCount += unshapedShellCount;
      if (numericMustExcludeShells) {
        plans[shellBatchIndex].disjointGenericShellTailCount += unshapedShellCount;
      }
    }
  }

  for (const shell of shellEntries) {
    const counts = plans[shell.batchIndex].shellCarrierCountByShape;
    counts[shell.shapeId] = (counts[shell.shapeId] ?? 0) + 1;
    plans[shell.batchIndex].shellExtraLayerCount += 1;
    if (numericMustExcludeShells && normalized.mode === "aggregate" && !shell.requiresNumericIce) {
      const disjointCounts = plans[shell.batchIndex].disjointShellTailByShape;
      disjointCounts[shell.shapeId] = (disjointCounts[shell.shapeId] ?? 0) + 1;
    }
  }
  const numericShellBindingQuotaByKey = new Map();
  for (const shell of shellEntries.filter((entry) => entry.requiresNumericIce)) {
    const key = `${shell.shapeId}|${shell.stageId ?? ""}`;
    numericShellBindingQuotaByKey.set(key, (numericShellBindingQuotaByKey.get(key) ?? 0) + 1);
  }
  let priorClearLayers = 0;
  for (let batchIndex = 0; batchIndex < plans.length; batchIndex += 1) {
    plans[batchIndex].clearLayersBeforeBatch = priorClearLayers;
    priorClearLayers += batches[batchIndex].length + plans[batchIndex].shellExtraLayerCount;
  }

  const eligibleBatchIndices = (requirement) => {
    if (requirement.stageId) {
      const index = contractStageIndex(target, requirement.stageId);
      return index === null ? [] : [index];
    }
    if (requirement.opening === true) return [0];
    if (requirement.opening === false) return plans.map((_, index) => index).slice(1);
    return plans.map((_, index) => index);
  };
  const remainingShapeSlots = plans.map((_, batchIndex) => batches[batchIndex].reduce((counts, piece) => {
    const shapeId = normalizedRuntimeShapeId(piece.shapeId ?? shapeIdOf(piece.shape));
    counts[shapeId] = (counts[shapeId] ?? 0) + 1;
    return counts;
  }, {}));
  const usedShapeSlots = plans.map(() => ({}));
  let plannedRequirementCount = 0;
  const orderedRequirements = [...normalized.requirements].sort((left, right) => (
    right.value - left.value || left.index - right.index
  ));
  for (const requirement of orderedRequirements) {
    if (normalized.mode === "exact_items") {
      const batchIndex = contractStageIndex(target, requirement.stageId);
      if (batchIndex === null) continue;
      const shapeId = requirement.shapeId;
      const competingBroadOpeningValue = /^lift-layer-1$/i.test(String(requirement.stageId))
        ? Math.max(0, ...normalized.requirements.filter((candidate) => (
          candidate !== requirement
          && candidate.shapeId === shapeId
          && candidate.stageId === "opening"
        )).map((candidate) => candidate.value))
        : 0;
      const shellBindingKey = `${shapeId}|${requirement.stageId ?? ""}`;
      const remainingShellBindings = numericShellBindingQuotaByKey.get(shellBindingKey) ?? 0;
      plans[batchIndex].requirements.push({
        ...requirement,
        // Lift layer 1 is selected from the route-latest opening carriers. A
        // lower-valued Lift-only item therefore monopolizes that late slot and
        // forces any same-shape broad opening item onto the next carrier. Keep
        // both carriers until the broad deadline (Lv67 V3 10 + Lift V3 5).
        value: Math.max(requirement.value, competingBroadOpeningValue),
        originalValue: requirement.value,
        requiresShell: remainingShellBindings > 0,
      });
      if (remainingShellBindings > 0) {
        numericShellBindingQuotaByKey.set(shellBindingKey, remainingShellBindings - 1);
      }
      plannedRequirementCount += 1;
      continue;
    }
    const choices = eligibleBatchIndices(requirement).flatMap((batchIndex) => {
      const shapeId = requirement.shapeId;
      const available = shapeId
        ? (remainingShapeSlots[batchIndex][shapeId] ?? 0)
        : batches[batchIndex].length - Object.values(usedShapeSlots[batchIndex]).reduce((sum, count) => sum + count, 0);
      if (available <= 0) return [];
      const alreadyAssigned = shapeId ? (usedShapeSlots[batchIndex][shapeId] ?? 0) : 0;
      // Conservatively ignore shells within this same stage when deciding if
      // a deadline is attainable. Shells from every fully cleared prior stage
      // are already included in clearLayersBeforeBatch.
      const latestAvailableCapacity = plans[batchIndex].clearLayersBeforeBatch
        + batches[batchIndex].length - 1 - alreadyAssigned;
      return [{
        batchIndex,
        latestAvailableCapacity,
        deadlineFeasible: latestAvailableCapacity >= requirement.value,
      }];
    }).sort((left, right) => (
      Number(right.deadlineFeasible) - Number(left.deadlineFeasible)
      || right.latestAvailableCapacity - left.latestAvailableCapacity
      || right.batchIndex - left.batchIndex
    ));
    if (!choices.length) continue;
    const selectedChoice = choices[0];
    const batchIndex = selectedChoice.batchIndex;
    const shapeId = requirement.shapeId;
    if (shapeId) {
      remainingShapeSlots[batchIndex][shapeId] -= 1;
      usedShapeSlots[batchIndex][shapeId] = (usedShapeSlots[batchIndex][shapeId] ?? 0) + 1;
    }
    plans[batchIndex].requirements.push({
      ...requirement,
      originalValue: requirement.value,
      // Even an intrinsically unreachable aggregate value reserves its best
      // same-shape carrier late. This minimizes assembler squared deficit and
      // prevents the impossible high item from stealing the feasible lower
      // item (Lv72: 17/10 on two opening V3 pieces).
      value: Math.min(requirement.value, selectedChoice.latestAvailableCapacity),
      requiresShell: numericShellBindingKeys.has(`${shapeId}|${requirement.stageId ?? ""}`),
    });
    if (selectedChoice.deadlineFeasible) plannedRequirementCount += 1;
  }
  return {
    plans,
    mode: normalized.mode,
    requirementCount: normalized.requirements.length,
    plannedRequirementCount,
  };
};

const contractStageBlocks = ({ level, target, stageId }) => {
  const slices = baseStageSlices(level, target);
  const index = contractStageIndex(target, stageId);
  return index === null ? [] : (slices[index]?.blocks ?? []);
};

const routeLastRank = (route) => {
  const last = new Map();
  route.forEach((drag, index) => last.set(drag.blockId, index));
  return (block) => last.get(block.id) ?? Number.MAX_SAFE_INTEGER;
};

const selectRouteLatestCohort = ({ eligible, histogram, count, route }) => {
  const rank = routeLastRank(route);
  const selected = [];
  const used = new Set();
  const take = (shapeId, amount) => {
    const candidates = eligible
      .filter((block) => !used.has(block.id) && (!shapeId || shapeIdOf(block.shape) === shapeId))
      .sort((left, right) => rank(right) - rank(left) || left.id.localeCompare(right.id));
    for (const block of candidates.slice(0, amount)) {
      used.add(block.id);
      selected.push(block);
    }
  };
  if (histogram && typeof histogram === "object") {
    for (const shapeId of SHAPE_ORDER) take(normalizedRuntimeShapeId(shapeId), Number(histogram[shapeId] ?? 0));
  }
  take(null, Math.max(0, Number(count ?? 0) - selected.length));
  return selected;
};

// Runtime mechanism stage ids are not always one-to-one with the base stage
// partitions. In particular, Lift layer 1 is a route-latest sub-cohort of the
// opening partition. Numeric carrier eligibility must mirror the assembler's
// mechanismStageBlockIds, otherwise a broad opening item can steal the sole
// Lift carrier and leave a high countdown on an early block (Lv67).
const mechanismStageBlocksForRoute = ({ level, target, route, stageId }) => {
  if (!stageId) return null;
  const slices = baseStageSlices(level, target);
  const exact = slices.find((stage) => stage.partition.id === stageId);
  if (exact) return exact.blocks;
  const lift = String(stageId).match(/^lift-layer-(\d+)$/i);
  if (lift) {
    const layerIndex = Number(lift[1]) - 1;
    const liftSpec = target.mechanism_contract?.lifts?.layers?.[layerIndex];
    if (layerIndex === 0) {
      const opening = slices.find((stage) => stage.partition.kind === "opening")?.blocks ?? [];
      return selectRouteLatestCohort({
        eligible: opening,
        histogram: liftSpec?.histogram,
        count: liftSpec?.count ?? opening.length,
        route,
      });
    }
    const liftStages = slices.filter((stage) => stage.partition.kind === "lift");
    const stage = liftStages[layerIndex - 1];
    return stage ? selectRouteLatestCohort({
      eligible: stage.blocks,
      histogram: liftSpec?.histogram ?? stage.partition.shape_histogram,
      count: liftSpec?.count ?? stage.blocks.length,
      route,
    }) : [];
  }
  return [];
};

const exactShellCarriersForRoute = ({ level, target, route }) => {
  const spec = target.mechanism_contract?.shells;
  if (!spec?.count) return [];
  const rank = routeLastRank(route);
  const selected = [];
  const used = new Set();
  const takeLatest = ({ eligible, shapeId, amount, stageId = null, requiresNumericIce = false }) => {
    const candidates = eligible
      .filter((block) => !used.has(block.id) && (!shapeId || shapeIdOf(block.shape) === shapeId))
      .sort((left, right) => rank(right) - rank(left) || left.id.localeCompare(right.id));
    for (const block of candidates.slice(0, amount)) {
      used.add(block.id);
      selected.push({ blockId: block.id, shapeId: shapeIdOf(block.shape), stageId, requiresNumericIce });
    }
  };

  if (Array.isArray(spec.items) && spec.items.length) {
    const ordered = spec.items.map((item, index) => {
      const shapeId = normalizedRuntimeShapeId(item.shape);
      const eligible = mechanismStageBlocksForRoute({ level, target, route, stageId: item.stage_id }) ?? level.blocks;
      return { item, index, shapeId, eligible };
    }).sort((left, right) => (
      left.eligible.filter((block) => shapeIdOf(block.shape) === left.shapeId).length
        - right.eligible.filter((block) => shapeIdOf(block.shape) === right.shapeId).length
      || left.index - right.index
    ));
    for (const { item, shapeId, eligible } of ordered) {
      takeLatest({
        eligible,
        shapeId,
        amount: 1,
        stageId: item.stage_id ?? null,
        requiresNumericIce: Boolean(item.requires_numeric_ice),
      });
    }
    return selected;
  }

  const opening = contractStageBlocks({ level, target, stageId: "opening" });
  const openingIds = new Set(opening.map((block) => block.id));
  const eligible = Number(spec.opening_visible_count) === Number(spec.count)
    ? opening
    : Number(spec.opening_visible_count) === 0
      ? level.blocks.filter((block) => !openingIds.has(block.id))
      : level.blocks;
  const histogram = spec.shape_histogram ?? {};
  let selectedFromHistogram = 0;
  for (const sourceShapeId of SHAPE_ORDER) {
    const amount = Number(histogram[sourceShapeId] ?? 0);
    if (!amount) continue;
    takeLatest({ eligible, shapeId: normalizedRuntimeShapeId(sourceShapeId), amount });
    selectedFromHistogram += amount;
  }
  const remaining = Math.max(0, Number(spec.count) - selectedFromHistogram);
  if (remaining) takeLatest({ eligible, shapeId: null, amount: remaining });
  return selected;
};

const assignNumericRequirementsByCost = ({ requirements, candidatesFor, unmatchedCost = 1_000_000_000_000 }) => {
  const rows = requirements.map((requirement, index) => {
    const unique = new Map();
    for (const candidate of candidatesFor(requirement, index)) {
      if (!candidate.block?.id) continue;
      const normalized = { ...candidate, cost: Math.max(0, Math.trunc(Number(candidate.cost) || 0)) };
      const previous = unique.get(candidate.block.id);
      if (!previous || normalized.cost < previous.cost) unique.set(candidate.block.id, normalized);
    }
    return [...unique.values()].sort((left, right) => (
      left.cost - right.cost || left.block.id.localeCompare(right.block.id)
    ));
  });
  const carrierIds = [...new Set(rows.flatMap((row) => row.map((candidate) => candidate.block.id)))].sort();
  const source = 0;
  const requirementOffset = 1;
  const carrierOffset = requirementOffset + requirements.length;
  const dummyOffset = carrierOffset + carrierIds.length;
  const sink = dummyOffset + requirements.length;
  const graph = Array.from({ length: sink + 1 }, () => []);
  const addEdge = (from, to, capacity, cost) => {
    const forward = { to, reverse: graph[to].length, capacity, cost };
    const reverse = { to: from, reverse: graph[from].length, capacity: 0, cost: -cost };
    graph[from].push(forward);
    graph[to].push(reverse);
    return forward;
  };
  const carrierNodeById = new Map(carrierIds.map((id, index) => [id, carrierOffset + index]));
  const assignmentEdges = requirements.map(() => []);
  requirements.forEach((requirement, requirementIndex) => {
    const requirementNode = requirementOffset + requirementIndex;
    addEdge(source, requirementNode, 1, 0);
    for (const candidate of rows[requirementIndex]) {
      const edge = addEdge(requirementNode, carrierNodeById.get(candidate.block.id), 1, candidate.cost);
      assignmentEdges[requirementIndex].push({ edge, candidate });
    }
    const dummy = { requirement, unmatched: true };
    const edge = addEdge(requirementNode, dummyOffset + requirementIndex, 1, unmatchedCost);
    assignmentEdges[requirementIndex].push({ edge, candidate: dummy });
  });
  carrierIds.forEach((id) => addEdge(carrierNodeById.get(id), sink, 1, 0));
  requirements.forEach((_, index) => addEdge(dummyOffset + index, sink, 1, 0));

  for (let flow = 0; flow < requirements.length; flow += 1) {
    const distance = Array(graph.length).fill(Number.POSITIVE_INFINITY);
    const parentNode = Array(graph.length).fill(-1);
    const parentEdge = Array(graph.length).fill(-1);
    distance[source] = 0;
    for (let pass = 0; pass < graph.length - 1; pass += 1) {
      let changed = false;
      for (let node = 0; node < graph.length; node += 1) {
        if (!Number.isFinite(distance[node])) continue;
        for (let edgeIndex = 0; edgeIndex < graph[node].length; edgeIndex += 1) {
          const edge = graph[node][edgeIndex];
          if (edge.capacity <= 0) continue;
          const next = distance[node] + edge.cost;
          if (next >= distance[edge.to]) continue;
          distance[edge.to] = next;
          parentNode[edge.to] = node;
          parentEdge[edge.to] = edgeIndex;
          changed = true;
        }
      }
      if (!changed) break;
    }
    if (!Number.isFinite(distance[sink])) break;
    for (let node = sink; node !== source; node = parentNode[node]) {
      const edge = graph[parentNode[node]][parentEdge[node]];
      edge.capacity -= 1;
      graph[node][edge.reverse].capacity += 1;
    }
  }
  return requirements.map((_, requirementIndex) => {
    const selected = assignmentEdges[requirementIndex].find(({ edge }) => edge.capacity === 0);
    return selected && !selected.candidate.unmatched ? selected.candidate : null;
  });
};

const numericRouteTiming = ({ level, target, route }) => {
  const normalized = numericRequirementsForTarget(target);
  if (!normalized.requirements.length) {
    return { ok: true, mode: normalized.mode, total: 0, feasible: 0, debt: 0, debts: [] };
  }

  const shellCarriers = exactShellCarriersForRoute({ level, target, route });
  const shellIds = new Set(shellCarriers.map((entry) => entry.blockId));
  const postMeltShell = target.mechanism_contract?.numeric_ice?.post_melt_shell;
  const excludesShellCarriers = postMeltShell !== null
    && postMeltShell !== undefined
    && postMeltShell !== "unclear"
    && Number.isFinite(Number(postMeltShell))
    && Number(postMeltShell) === 0;
  const eligibleBlocks = excludesShellCarriers
    ? level.blocks.filter((block) => !shellIds.has(block.id))
    : level.blocks;
  const eligibleBlockIds = new Set(eligibleBlocks.map((block) => block.id));
  const firstTouchCapacity = new Map();
  let clearLayers = 0;
  for (const drag of route) {
    if (!firstTouchCapacity.has(drag.blockId)) firstTouchCapacity.set(drag.blockId, clearLayers);
    if (drag.exitSide) clearLayers += 1 + Number(shellIds.has(drag.blockId));
  }

  const opening = contractStageBlocks({ level, target, stageId: "opening" });
  const openingIds = new Set(opening.map((block) => block.id));
  const requirements = normalized.requirements;
  const candidatesByRequirement = requirements.map((requirement) => {
    const stageBlocks = requirement.stageId
      ? (mechanismStageBlocksForRoute({ level, target, route, stageId: requirement.stageId }) ?? level.blocks)
      : requirement.opening === true ? opening
        : requirement.opening === false ? level.blocks.filter((block) => !openingIds.has(block.id))
          : level.blocks;
    const requiredShellIds = new Set(shellCarriers.filter((shell) => (
      shell.requiresNumericIce
      && (!requirement.shapeId || shell.shapeId === requirement.shapeId)
      && (!requirement.stageId || shell.stageId === requirement.stageId)
    )).map((shell) => shell.blockId));
    return stageBlocks.filter((block) => eligibleBlockIds.has(block.id)).flatMap((block) => {
      if (requirement.shapeId && shapeIdOf(block.shape) !== requirement.shapeId) return [];
      if (requiredShellIds.size && !requiredShellIds.has(block.id)) return [];
      const clearCapacity = firstTouchCapacity.get(block.id);
      if (!Number.isFinite(clearCapacity)) return [];
      const deficit = Math.max(0, requirement.value - clearCapacity);
      const surplus = Math.max(0, clearCapacity - requirement.value);
      const routeFeasible = deficit === 0;
      return [{
        block,
        clearCapacity,
        routeFeasible,
        cost: Math.min(900_000_000_000, deficit * deficit * 1_000_000)
          + (routeFeasible ? 0 : 100_000)
          + Math.min(99_999, surplus * 1_000 + Math.max(0, clearLayers - clearCapacity)),
      }];
    });
  });
  const assignments = assignNumericRequirementsByCost({
    requirements,
    candidatesFor: (_requirement, index) => candidatesByRequirement[index],
  });
  const feasible = assignments.filter((assignment) => assignment?.routeFeasible).length;
  const debts = requirements.flatMap((requirement, index) => assignments[index]?.routeFeasible ? [] : [{
    ...requirement,
    assignedCarrierId: assignments[index]?.block?.id ?? null,
    assignedClearCapacity: assignments[index]?.clearCapacity ?? null,
    candidateCount: candidatesByRequirement[index].length,
  }]);
  return {
    ok: feasible === requirements.length,
    mode: normalized.mode,
    total: requirements.length,
    feasible,
    debt: requirements.length - feasible,
    debts,
  };
};

const numericTimingFloorForLevel = ({ level, target }) => {
  const batches = baseStageSlices(level, target).map((stage) => stage.blocks.map((block) => ({
    shapeId: shapeIdOf(block.shape),
  })));
  return numericDeadlinePlansForTarget({ target, batches }).plannedRequirementCount;
};

const numericRouteMeetsGeneratorFloor = ({ level, target, route }) => {
  const timing = numericRouteTiming({ level, target, route });
  const floor = numericTimingFloorForLevel({ level, target });
  return { ...timing, floor, meetsFloor: timing.feasible >= floor };
};

const concealedOpeningCarrierIds = (level, target, requiredCount) => {
  if (requiredCount <= 0) return [];
  const numeric = target.mechanism_contract?.numeric_ice;
  if (!numeric?.count) return [];
  const openingBlocks = baseStageSlices(level, target)[0]?.blocks ?? [];
  const itemRequirements = Array.isArray(numeric.items) && numeric.items.length
    ? numeric.items
      .filter((item) => item.stage_id == null || item.stage_id === "opening")
      .map((item) => normalizedRuntimeShapeId(item.shape))
    : expandHistogram(numeric.shape_histogram ?? {})
      .slice(0, Number(numeric.opening_visible_count ?? numeric.count))
      .map((item) => normalizedRuntimeShapeId(item.shapeId ?? item));
  const used = new Set();
  const selected = [];
  for (const requiredShape of itemRequirements) {
    const block = openingBlocks.find((candidate) => (
      !used.has(candidate.id)
      && (!requiredShape || shapeIdOf(candidate.shape) === requiredShape)
    ));
    if (!block) continue;
    used.add(block.id);
    selected.push(block.id);
    if (selected.length === requiredCount) break;
  }
  return selected;
};

const baseContractAnalysis = (level, target) => {
  const mismatches = [];
  if (level.width !== target.board.cols || level.height !== target.board.rows) mismatches.push("rows_cols");
  if (!sameMask(level, target.board.playable_mask)) mismatches.push("playable_mask");
  if (level.playable.length !== target.board.playable_cell_count) mismatches.push("playable_cell_count");
  if (level.timeSeconds !== target.time_seconds) mismatches.push("time_seconds");
  if (level.blocks.length !== target.full_level_block_count) mismatches.push("block_count");
  if (!sameHistogram(level.blocks, target.full_level_shape_histogram)) mismatches.push("shape_histogram");
  const occupiedCells = level.blocks.reduce((sum, block) => sum + block.shape.length, 0);
  if (occupiedCells !== target.full_level_occupied_cell_count) mismatches.push("occupied_cell_count");

  const slices = baseStageSlices(level, target);
  const partitions = target.stage_partitions ?? [];
  if (slices.at(-1)?.end !== level.blocks.length) mismatches.push("stage_partition_total");
  if ((level.shutters?.length ?? 0) !== Math.max(0, slices.length - 1)) mismatches.push("stage_count");
  const shutterIds = (level.shutters ?? []).map((shutter) => shutter.id);
  for (const slice of slices) {
    if (slice.blocks.length !== Number(slice.partition.count)) mismatches.push(`stage.${slice.partition.id}.count`);
    if (slice.partition.shape_histogram && !sameHistogram(slice.blocks, slice.partition.shape_histogram)) {
      mismatches.push(`stage.${slice.partition.id}.shape_histogram`);
    }
    const expectedShutterId = slice.index === 0 ? undefined : shutterIds[slice.index - 1];
    if (slice.blocks.some((block) => block.shutterId !== expectedShutterId)) {
      mismatches.push(`stage.${slice.partition.id}.membership`);
    }
  }

  const openingBlocks = slices[0]?.blocks ?? [];
  const openingPalette = [...new Set(openingBlocks.map((block) => block.color))].sort();
  const expectedOpeningPalette = target.design_palette.slice(0, target.opening_color_count).sort();
  if (JSON.stringify(openingPalette) !== JSON.stringify(expectedOpeningPalette)) mismatches.push("opening_palette");

  const bodyPalette = [...new Set(level.blocks.map((block) => block.color))].sort();
  const expectedBodyPalette = [...baseBodyPaletteForTarget(target)].sort();
  if (JSON.stringify(bodyPalette) !== JSON.stringify(expectedBodyPalette)) mismatches.push("base_body_palette");

  const deferredColorCount = Number(target.full_level_color_count) - expectedBodyPalette.length;
  const openingHiddenColorCarrierIds = concealedOpeningCarrierIds(level, target, deferredColorCount);
  if (openingHiddenColorCarrierIds.length !== deferredColorCount) {
    mismatches.push("opening_hidden_color_carrier_capacity");
  }
  return {
    mismatches,
    slices,
    openingPalette,
    bodyPalette,
    expectedBodyPalette,
    openingHiddenColorCarrierIds,
    deferredPaletteColors: target.design_palette.filter((color) => !expectedBodyPalette.includes(color)),
  };
};

const enforceBaseStageColorPlan = (placements, colors, target, seed) => {
  const result = [...colors];
  const groups = new Map();
  placements.forEach((placement, index) => {
    const key = placement.shutterId ?? "opening";
    const indices = groups.get(key) ?? [];
    indices.push(index);
    groups.set(key, indices);
  });
  const stageGroups = [...groups.values()];
  const openingIndices = stageGroups[0] ?? [];
  const openingPalette = target.design_palette.slice(0, target.opening_color_count);
  const shuffledOpening = shuffled(openingIndices, seed ^ 0x51ed270b);
  const shuffledOpeningPalette = shuffled(openingPalette, seed ^ 0x85ebca6b);
  shuffledOpening.forEach((index, order) => {
    result[index] = shuffledOpeningPalette[order % shuffledOpeningPalette.length];
  });

  if (stageGroups.length > 1) {
    const laterIndices = shuffled(stageGroups.slice(1).flat(), seed ^ 0xc2b2ae35);
    const counts = new Map(target.design_palette.map((color) => [
      color,
      result.filter((assigned) => assigned === color).length,
    ]));
    for (const missingColor of target.design_palette.filter((color) => (counts.get(color) ?? 0) === 0)) {
      const replacementIndex = laterIndices.find((index) => (counts.get(result[index]) ?? 0) > 1);
      if (replacementIndex === undefined) break;
      const replacedColor = result[replacementIndex];
      result[replacementIndex] = missingColor;
      counts.set(replacedColor, counts.get(replacedColor) - 1);
      counts.set(missingColor, 1);
    }
  }
  return result;
};

const randomColorAssignment = (placements, palette, seed) => {
  const colors = Array(placements.length);
  const stageGroups = new Map();
  placements.forEach((placement, index) => {
    const key = placement.shutterId ?? "opening";
    const group = stageGroups.get(key) ?? [];
    group.push(index);
    stageGroups.set(key, group);
  });
  let stageIndex = 0;
  for (const indices of stageGroups.values()) {
    const randomizedIndices = shuffled(indices, seed ^ ((stageIndex + 1) * 0x9e3779b1));
    const randomizedPalette = shuffled(palette, seed ^ ((stageIndex + 1) * 0x85ebca6b));
    const rng = makeRng(seed ^ ((stageIndex + 1) * 0xc2b2ae35));
    randomizedIndices.forEach((blockIndex, order) => {
      colors[blockIndex] = order < randomizedPalette.length
        ? randomizedPalette[order]
        : randomizedPalette[Math.floor(rng() * randomizedPalette.length)];
    });
    stageIndex += 1;
  }
  return colors;
};

function placementCanExitAtGate(placement, gate, width, height) {
  const cells = placement.shape.map(([dx, dy]) => [placement.x + dx, placement.y + dy]);
  if (gate.side === "top") {
    return Math.min(...cells.map(([, y]) => y)) === 0
      && cells.every(([x]) => x >= gate.offset && x < gate.offset + gate.size);
  }
  if (gate.side === "bottom") {
    return Math.max(...cells.map(([, y]) => y)) === height - 1
      && cells.every(([x]) => x >= gate.offset && x < gate.offset + gate.size);
  }
  if (gate.side === "left") {
    return Math.min(...cells.map(([x]) => x)) === 0
      && cells.every(([, y]) => y >= gate.offset && y < gate.offset + gate.size);
  }
  return Math.max(...cells.map(([x]) => x)) === width - 1
    && cells.every(([, y]) => y >= gate.offset && y < gate.offset + gate.size);
}

const bitCount = (value) => value.toString(2).replaceAll("0", "").length;

const feedbackVertexFloorForEdges = (palette, edges) => {
  const acyclicAfterRemoving = (removedMask) => {
    const indegree = new Map(palette.map((color) => [color, 0]));
    const outgoing = new Map(palette.map((color) => [color, []]));
    for (const edge of edges) {
      const [from, to] = edge.split("->");
      const fromIndex = palette.indexOf(from);
      const toIndex = palette.indexOf(to);
      if (fromIndex < 0 || toIndex < 0
        || (removedMask & (1 << fromIndex)) || (removedMask & (1 << toIndex))) continue;
      outgoing.get(from).push(to);
      indegree.set(to, indegree.get(to) + 1);
    }
    const queue = palette.filter((color, index) => !(removedMask & (1 << index)) && indegree.get(color) === 0);
    let visited = 0;
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const color = queue[cursor];
      visited += 1;
      for (const next of outgoing.get(color)) {
        indegree.set(next, indegree.get(next) - 1);
        if (indegree.get(next) === 0) queue.push(next);
      }
    }
    return visited === palette.length - bitCount(removedMask);
  };
  for (let removedCount = 0; removedCount <= palette.length; removedCount += 1) {
    for (let mask = 0; mask < (1 << palette.length); mask += 1) {
      if (bitCount(mask) === removedCount && acyclicAfterRemoving(mask)) return removedCount;
    }
  }
  return palette.length;
};

const optimizeColorsByStageDependencies = ({ placements, colors, gates, palette, width, height, seed }) => {
  const result = [...colors];
  const gateMouths = gates.map((gate) => ({
    gate,
    cells: new Set(Array.from({ length: gate.size }, (_, index) => {
      const coordinate = gate.offset + index;
      if (gate.side === "top") return keyOf(coordinate, 0);
      if (gate.side === "bottom") return keyOf(coordinate, height - 1);
      if (gate.side === "left") return keyOf(0, coordinate);
      return keyOf(width - 1, coordinate);
    })),
  }));
  const stageGroups = new Map();
  placements.forEach((placement, index) => {
    const key = placement.shutterId ?? "opening";
    const group = stageGroups.get(key) ?? [];
    group.push(index);
    stageGroups.set(key, group);
  });
  const assignmentScore = (indices, assignment) => {
    const edges = new Set();
    const edgeMultiplicity = new Map();
    let blockedGates = 0;
    let foreignTouches = 0;
    let ownTouches = 0;
    for (const { gate, cells: mouth } of gateMouths) {
      let blocked = false;
      for (let offset = 0; offset < indices.length; offset += 1) {
        const placement = placements[indices[offset]];
        const color = assignment[offset];
        const touches = placement.shape.some(([dx, dy]) => mouth.has(keyOf(placement.x + dx, placement.y + dy)));
        if (!touches) continue;
        if (color === gate.color) ownTouches += 1;
        else {
          blocked = true;
          foreignTouches += 1;
          const edge = `${color}->${gate.color}`;
          edges.add(edge);
          edgeMultiplicity.set(edge, (edgeMultiplicity.get(edge) ?? 0) + 1);
        }
      }
      if (blocked) blockedGates += 1;
    }
    const everyShapeHasExit = indices.every((placementIndex, offset) => gates.some((gate) => (
      gate.color === assignment[offset]
      && requiredSpan(placements[placementIndex].shape, gate.side) <= gate.size
    )));
    if (!everyShapeHasExit) return Number.NEGATIVE_INFINITY;
    const feedbackFloor = feedbackVertexFloorForEdges(palette, edges);
    let reciprocalEdges = 0;
    let reciprocalPairCapacity = 0;
    for (const edge of edges) {
      const [from, to] = edge.split("->");
      if (from < to && edges.has(`${to}->${from}`)) {
        reciprocalEdges += 1;
        reciprocalPairCapacity += Math.min(
          edgeMultiplicity.get(edge) ?? 0,
          edgeMultiplicity.get(`${to}->${from}`) ?? 0,
        );
      }
    }
    return feedbackFloor * 10_000_000
      + reciprocalPairCapacity * 3_000_000
      + reciprocalEdges * 500_000
      + blockedGates * 50_000
      + foreignTouches * 2_000
      + edges.size * 500
      - ownTouches * 25_000;
  };
  let stageIndex = 0;
  for (const indices of stageGroups.values()) {
    if (indices.length < palette.length && !configuredAllowStageColorSubsets) {
      stageIndex += 1;
      continue;
    }
    let best = indices.map((index) => result[index]);
    let bestScore = assignmentScore(indices, best);
    const rng = makeRng(seed ^ ((stageIndex + 1) * 0x27d4eb2d));
    for (let attempt = 0; attempt < 500; attempt += 1) {
      const assignment = configuredAllowStageColorSubsets
        ? Array.from({ length: indices.length }, () => palette[Math.floor(rng() * palette.length)])
        : shuffled(palette, Math.floor(rng() * 0xffffffff));
      while (assignment.length < indices.length) assignment.push(palette[Math.floor(rng() * palette.length)]);
      const randomized = shuffled(assignment, Math.floor(rng() * 0xffffffff));
      const score = assignmentScore(indices, randomized);
      if (score > bestScore) {
        best = randomized;
        bestScore = score;
      }
    }
    indices.forEach((placementIndex, offset) => { result[placementIndex] = best[offset]; });
    stageIndex += 1;
  }
  if (configuredAllowStageColorSubsets) {
    const colorCounts = new Map(palette.map((color) => [
      color,
      result.filter((assigned) => assigned === color).length,
    ]));
    for (const missingColor of palette.filter((color) => colorCounts.get(color) === 0)) {
      let bestReplacement = null;
      for (const indices of stageGroups.values()) {
        const assignment = indices.map((index) => result[index]);
        for (let offset = 0; offset < indices.length; offset += 1) {
          const placementIndex = indices[offset];
          const replacedColor = assignment[offset];
          if ((colorCounts.get(replacedColor) ?? 0) <= 1) continue;
          const hasCompatibleGate = gates.some((gate) => (
            gate.color === missingColor
            && requiredSpan(placements[placementIndex].shape, gate.side) <= gate.size
          ));
          if (!hasCompatibleGate) continue;
          const nextAssignment = [...assignment];
          nextAssignment[offset] = missingColor;
          const score = assignmentScore(indices, nextAssignment);
          if (!Number.isFinite(score)) continue;
          if (!bestReplacement || score > bestReplacement.score) {
            bestReplacement = { placementIndex, replacedColor, score };
          }
        }
      }
      if (!bestReplacement) continue;
      result[bestReplacement.placementIndex] = missingColor;
      colorCounts.set(bestReplacement.replacedColor, colorCounts.get(bestReplacement.replacedColor) - 1);
      colorCounts.set(missingColor, 1);
    }
  }
  return result;
};

const addDuplicateColorGates = ({ gates, placements, colors, palette, points, width, height, count, seed }) => {
  if (count <= 0) return gates;
  const playable = new Set(points.map(([x, y]) => keyOf(x, y)));
  const stageKeys = [...new Set(placements.map((placement) => placement.shutterId ?? "opening"))];
  const slotCells = (slot) => new Set(Array.from({ length: slot.size }, (_, index) => {
    const coordinate = slot.offset + index;
    if (slot.side === "top") return keyOf(coordinate, 0);
    if (slot.side === "bottom") return keyOf(coordinate, height - 1);
    if (slot.side === "left") return keyOf(0, coordinate);
    return keyOf(width - 1, coordinate);
  }));
  const chosen = gates.map((gate) => ({ ...gate }));
  const colorCounts = new Map(palette.map((color) => [color, chosen.filter((gate) => gate.color === color).length]));
  for (let duplicateIndex = 0; duplicateIndex < count; duplicateIndex += 1) {
    const candidates = [];
    for (const color of palette) {
      const coloredShapes = placements.filter((_, index) => colors[index] === color).map((placement) => placement.shape);
      for (const side of SIDES) {
        const limit = side === "top" || side === "bottom" ? width : height;
        const size = Math.max(...coloredShapes.map((shape) => requiredSpan(shape, side)));
        for (let offset = 0; offset + size <= limit; offset += 1) {
          const slot = { side, offset, size, color };
          if (chosen.some((gate) => slotsOverlap(gate, slot))) continue;
          const mouth = slotCells(slot);
          if (![...mouth].every((cell) => playable.has(cell))) continue;
          const stagesTouched = new Set();
          let foreignTouches = 0;
          let ownTouches = 0;
          placements.forEach((placement, index) => {
            if (!placement.shape.some(([dx, dy]) => mouth.has(keyOf(placement.x + dx, placement.y + dy)))) return;
            if (colors[index] === color) ownTouches += 1;
            else {
              foreignTouches += 1;
              stagesTouched.add(placement.shutterId ?? "opening");
            }
          });
          const jitter = Number.parseInt(sha256(`${seed}|${duplicateIndex}|${side}|${offset}|${size}|${color}`).slice(0, 8), 16) % 10_000;
          const score = stagesTouched.size * 2_000_000
            + foreignTouches * 20_000
            - ownTouches * 25_000
            - (colorCounts.get(color) ?? 0) * 40_000
            + jitter;
          candidates.push({ slot, score, stageCoverage: stagesTouched.size });
        }
      }
    }
    candidates.sort((left, right) => right.score - left.score
      || right.stageCoverage - left.stageCoverage
      || left.slot.side.localeCompare(right.slot.side)
      || left.slot.offset - right.slot.offset
      || left.slot.color.localeCompare(right.slot.color));
    const winner = candidates[0];
    if (!winner || winner.stageCoverage === 0) break;
    chosen.push({ id: `cc-hard-gate-${chosen.length + 1}`, ...winner.slot });
    colorCounts.set(winner.slot.color, (colorCounts.get(winner.slot.color) ?? 0) + 1);
  }
  return chosen.map((gate, index) => ({ ...gate, id: `cc-hard-gate-${index + 1}` }));
};

const allocateColorGates = ({
  placements,
  colors,
  palette,
  points,
  width,
  height,
  seed,
  maximizeForeign = false,
  extraGateSpan = 0,
  desiredOwnMouth = 1,
  layoutJitter = 0,
}) => {
  const playable = new Set(points.map(([x, y]) => keyOf(x, y)));
  const windowsFor = (side, size) => {
    const limit = side === "top" || side === "bottom" ? width : height;
    const windows = [];
    for (let offset = 0; offset + size <= limit; offset += 1) {
      const cells = Array.from({ length: size }, (_, index) => {
        const coordinate = offset + index;
        if (side === "top") return keyOf(coordinate, 0);
        if (side === "bottom") return keyOf(coordinate, height - 1);
        if (side === "left") return keyOf(0, coordinate);
        return keyOf(width - 1, coordinate);
      });
      if (cells.every((key) => playable.has(key))) windows.push({ side, offset, size });
    }
    return windows;
  };
  const gateCells = (slot) => new Set(Array.from({ length: slot.size }, (_, index) => {
    const coordinate = slot.offset + index;
    if (slot.side === "top") return keyOf(coordinate, 0);
    if (slot.side === "bottom") return keyOf(coordinate, height - 1);
    if (slot.side === "left") return keyOf(0, coordinate);
    return keyOf(width - 1, coordinate);
  }));
  const foreignScore = (slot, color) => {
    const mouth = gateCells(slot);
    let foreign = 0;
    let own = 0;
    placements.forEach((placement, index) => {
      const touches = placement.shape.some(([dx, dy]) => mouth.has(keyOf(placement.x + dx, placement.y + dy)));
      if (!touches) return;
      if (colors[index] === color) own += 1;
      else foreign += 1;
    });
    return foreign * 100 - own * 10;
  };
  const ownTouchCount = (slot, color) => {
    return placements.filter((placement, index) => (
      colors[index] === color
      && placementCanExitAtGate(placement, slot, width, height)
    )).length;
  };
  const stageKeys = [...new Set(placements.map((placement) => placement.shutterId ?? "opening"))];
  const stageTouchScore = (slot, color) => {
    const mouth = gateCells(slot);
    const touchedStages = new Set();
    for (let index = 0; index < placements.length; index += 1) {
      if (colors[index] === color) continue;
      if (placements[index].shape.some(([dx, dy]) => mouth.has(keyOf(
        placements[index].x + dx,
        placements[index].y + dy,
      )))) touchedStages.add(placements[index].shutterId ?? "opening");
    }
    return touchedStages.size;
  };
  const stageDependencyProfile = (gates) => stageKeys.map((stageKey) => {
    const stagePlacements = placements.map((placement, index) => ({ placement, index }))
      .filter(({ placement }) => (placement.shutterId ?? "opening") === stageKey);
    const edges = new Set();
    const foreignBlocks = new Set();
    let blockedGates = 0;
    for (const gate of gates) {
      const mouth = gateCells(gate);
      let blocked = false;
      for (const { placement, index } of stagePlacements) {
        if (colors[index] === gate.color) continue;
        if (!placement.shape.some(([dx, dy]) => mouth.has(keyOf(placement.x + dx, placement.y + dy)))) continue;
        blocked = true;
        foreignBlocks.add(index);
        edges.add(`${colors[index]}->${gate.color}`);
      }
      if (blocked) blockedGates += 1;
    }
    return {
      feedbackFloor: feedbackVertexFloorForEdges(palette, edges),
      blockedGates,
      foreignBlocks: foreignBlocks.size,
      edgeCount: edges.size,
    };
  });
  const needs = palette.map((color, colorIndex) => {
    const shapes = placements.filter((_, index) => colors[index] === color).map((placement) => placement.shape);
    const choices = [];
    for (const side of SIDES) {
      const sideLimit = side === "top" || side === "bottom" ? width : height;
      const size = Math.min(sideLimit, Math.max(...shapes.map((shape) => requiredSpan(shape, side))) + extraGateSpan);
      choices.push(...windowsFor(side, size));
    }
    const randomized = shuffled(choices, seed ^ (colorIndex + 1) * 0x9e3779b1);
    if (maximizeForeign) randomized.sort((a, b) => {
      const ownWeight = colorIndex < desiredOwnMouth ? 10_000 : -25;
      return (stageTouchScore(b, color) * 5_000 + foreignScore(b, color) + ownTouchCount(b, color) * ownWeight)
        - (stageTouchScore(a, color) * 5_000 + foreignScore(a, color) + ownTouchCount(a, color) * ownWeight);
    });
    return { color, colorIndex, choices: randomized };
  }).sort((a, b) => a.choices.length - b.choices.length);
  let chosen = [];
  if (maximizeForeign) {
    let best;
    let bestScore = Number.NEGATIVE_INFINITY;
    let nodes = 0;
    const visitBest = (index, score) => {
      nodes += 1;
      if (nodes > 1_200) return;
      if (index === needs.length) {
        const ownMouthBlocks = chosen.reduce((sum, gate) => {
          return sum + placements.filter((placement, placementIndex) => (
            colors[placementIndex] === gate.color
            && placementCanExitAtGate(placement, gate, width, height)
          )).length;
        }, 0);
        // Explore different solvable ingress counts across cheap geometry
        // trials instead of selecting the same maximally sealed arrangement.
        const layoutSignature = chosen.map((gate) => `${gate.side}:${gate.offset}:${gate.size}:${gate.color}`).join("|");
        const deterministicJitter = layoutJitter > 0
          ? Number.parseInt(sha256(`${seed}|${layoutSignature}`).slice(0, 8), 16) % (layoutJitter + 1)
          : 0;
        const dependencyProfile = stageDependencyProfile(chosen);
        const feedbackFloors = dependencyProfile.map((profile) => profile.feedbackFloor);
        const minimumFeedbackFloor = Math.min(...feedbackFloors);
        const feedbackFloorSum = feedbackFloors.reduce((sum, value) => sum + value, 0);
        const minimumBlockedGates = Math.min(...dependencyProfile.map((profile) => profile.blockedGates));
        const minimumForeignBlocks = Math.min(...dependencyProfile.map((profile) => profile.foreignBlocks));
        const adjustedScore = score
          + minimumFeedbackFloor * 2_000_000
          + feedbackFloorSum * 300_000
          + minimumBlockedGates * 20_000
          + minimumForeignBlocks * 5_000
          - Math.abs(ownMouthBlocks - desiredOwnMouth) * 100_000
          + deterministicJitter;
        if (adjustedScore > bestScore) {
          bestScore = adjustedScore;
          best = chosen.map((gate) => ({ ...gate }));
        }
        return;
      }
      for (const slot of needs[index].choices.slice(0, 10)) {
        if (chosen.some((gate) => slotsOverlap(gate, slot))) continue;
        chosen.push({ ...slot, color: needs[index].color });
        visitBest(index + 1, score + foreignScore(slot, needs[index].color));
        chosen.pop();
      }
    };
    visitBest(0, 0);
    if (!best) return undefined;
    chosen = best;
  } else {
    const visit = (index) => {
      if (index === needs.length) return true;
      for (const slot of needs[index].choices) {
        if (chosen.some((gate) => slotsOverlap(gate, slot))) continue;
        chosen.push({ ...slot, color: needs[index].color });
        if (visit(index + 1)) return true;
        chosen.pop();
      }
      return false;
    };
    if (!visit(0)) return undefined;
  }
  return chosen.map((gate, index) => ({ id: `cc-hard-gate-${index + 1}`, ...gate }));
};

const renameForeignGateGuards = (level, tag = "") => {
  const mouths = level.gates.map((gate) => ({
    gate,
    cells: new Set(Array.from({ length: gate.size }, (_, index) => {
      const coordinate = gate.offset + index;
      if (gate.side === "top") return keyOf(coordinate, 0);
      if (gate.side === "bottom") return keyOf(coordinate, level.height - 1);
      if (gate.side === "left") return keyOf(0, coordinate);
      return keyOf(level.width - 1, coordinate);
    })),
  }));
  level.blocks.forEach((block, index) => {
    const cells = block.shape.map(([dx, dy]) => keyOf(block.x + dx, block.y + dy));
    const foreign = mouths.some(({ gate, cells: mouth }) => gate.color !== block.color && cells.some((cell) => mouth.has(cell)));
    block.id = `${foreign ? "strategy-guard" : "cc-piece"}-${tag ? `${tag}-` : ""}${String(index + 1).padStart(2, "0")}`;
  });
};

const dependencyMetrics = (level) => {
  const foreignBlockIds = new Set();
  const foreignCells = new Set();
  const dependencyEdges = new Set();
  let blockedGates = 0;
  let ownMouthBlocks = 0;
  for (const gate of level.gates) {
    const mouth = new Set(Array.from({ length: gate.size }, (_, index) => {
      const coordinate = gate.offset + index;
      if (gate.side === "top") return keyOf(coordinate, 0);
      if (gate.side === "bottom") return keyOf(coordinate, level.height - 1);
      if (gate.side === "left") return keyOf(0, coordinate);
      return keyOf(level.width - 1, coordinate);
    }));
    let gateBlocked = false;
    for (const block of level.blocks) {
      const touched = block.shape.map(([dx, dy]) => keyOf(block.x + dx, block.y + dy)).filter((cell) => mouth.has(cell));
      if (!touched.length) continue;
      if (block.color === gate.color) {
        ownMouthBlocks += 1;
      } else {
        gateBlocked = true;
        foreignBlockIds.add(block.id);
        touched.forEach((cell) => foreignCells.add(cell));
        dependencyEdges.add(`${block.color}->${gate.color}`);
      }
    }
    if (gateBlocked) blockedGates += 1;
  }
  let reciprocalDependencies = 0;
  for (const edge of dependencyEdges) {
    const [from, to] = edge.split("->");
    if (from < to && dependencyEdges.has(`${to}->${from}`)) reciprocalDependencies += 1;
  }
  const deadlockPenalty = ownMouthBlocks > 0 ? 0 : 100_000;
  const score = foreignBlockIds.size * 10_000
    + reciprocalDependencies * 2_000
    + dependencyEdges.size * 500
    + blockedGates * 250
    + foreignCells.size * 25
    + ownMouthBlocks * 5
    - deadlockPenalty;
  return {
    score,
    foreignBlockCount: foreignBlockIds.size,
    foreignMouthCellCount: foreignCells.size,
    blockedGateCount: blockedGates,
    dependencyEdgeCount: dependencyEdges.size,
    reciprocalDependencyCount: reciprocalDependencies,
    ownMouthBlockCount: ownMouthBlocks,
  };
};

const remapSeedPalette = (source, palette, current) => {
  const oldColors = [...new Set(source.blocks.map((block) => block.color))];
  if (oldColors.length !== palette.length) return undefined;
  const mapping = new Map(oldColors.map((color, index) => [color, palette[index]]));
  const level = JSON.parse(JSON.stringify(source));
  level.name = current?.name ?? level.name;
  level.difficulty = current?.difficulty ?? level.difficulty;
  level.timeSeconds = current?.timeSeconds ?? level.timeSeconds;
  level.reward = current?.reward ?? level.reward;
  if (current?.parMoves !== undefined) level.parMoves = current.parMoves;
  else delete level.parMoves;
  level.blocks.forEach((block) => { block.color = mapping.get(block.color); });
  level.gates.forEach((gate) => { gate.color = mapping.get(gate.color); });
  return level;
};

const witnessGuidedFreezeDescriptors = (level, route) => {
  if (!Array.isArray(route) || !route.length) return [];

  const blocks = new Map(level.blocks.map((block) => [block.id, {
    ...block,
    x: block.x,
    y: block.y,
    layers: [...(block.layers ?? [block.color])],
  }]));
  const firstBlockActionAfterClears = new Map();
  const firstGateUseAfterClears = new Map();
  let clears = 0;

  for (const drag of route) {
    const block = blocks.get(drag.blockId);
    if (!block) return [];
    if (!firstBlockActionAfterClears.has(block.id)) firstBlockActionAfterClears.set(block.id, clears);
    for (const [x, y] of drag.path ?? []) {
      block.x = x;
      block.y = y;
    }
    if (!drag.exitSide) continue;

    const cells = block.shape.map(([dx, dy]) => [block.x + dx, block.y + dy]);
    const minX = Math.min(...cells.map(([x]) => x));
    const maxX = Math.max(...cells.map(([x]) => x));
    const minY = Math.min(...cells.map(([, y]) => y));
    const maxY = Math.max(...cells.map(([, y]) => y));
    const gate = level.gates.find((candidate) => {
      if (candidate.side !== drag.exitSide || candidate.color !== block.layers[0]) return false;
      return candidate.side === "top" || candidate.side === "bottom"
        ? minX >= candidate.offset && maxX < candidate.offset + candidate.size
        : minY >= candidate.offset && maxY < candidate.offset + candidate.size;
    });
    if (!gate) return [];
    if (!firstGateUseAfterClears.has(gate.id)) firstGateUseAfterClears.set(gate.id, clears);
    if (block.layers.length > 1) {
      block.layers.shift();
      block.color = block.layers[0];
    } else {
      blocks.delete(block.id);
    }
    clears += 1;
  }

  const gateTargets = level.gates.flatMap((gate, index) => {
    const count = firstGateUseAfterClears.get(gate.id) ?? 0;
    return count > 0 ? [{ kind: "gate", index, count }] : [];
  });
  const blockTargets = level.blocks.flatMap((block, index) => {
    const count = firstBlockActionAfterClears.get(block.id) ?? 0;
    return count > 0 && isSolidBarOrRectangle(block.shape) ? [{ kind: "block", index, count }] : [];
  });
  const all = [...gateTargets, ...blockTargets];
  if (!all.length) return [];

  const byDelay = [...all].sort((left, right) => right.count - left.count
    || left.kind.localeCompare(right.kind) || left.index - right.index);
  const half = Math.max(1, Math.ceil(byDelay.length / 2));
  const variants = [
    all,
    gateTargets,
    blockTargets,
    byDelay.slice(0, half),
    all.map((target) => ({ ...target, count: Math.max(1, target.count - 1) })),
    all.map((target) => ({ ...target, count: Math.min(4, target.count) })),
    [...gateTargets, ...byDelay.filter((target) => target.kind === "block").slice(0, Math.max(1, Math.ceil(blockTargets.length / 2)))],
    [...blockTargets, ...byDelay.filter((target) => target.kind === "gate").slice(0, Math.max(1, Math.ceil(gateTargets.length / 2)))],
  ].filter((descriptor) => descriptor.length);

  const seen = new Set();
  return variants.filter((descriptor) => {
    const key = descriptor
      .map((target) => `${target.kind}:${target.index}:${target.count}`)
      .sort()
      .join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const strictFreezeDescriptors = (level, budget, seed, route = []) => {
  if (budget <= 0) return [];
  const targets = [
    ...level.gates.map((_gate, index) => ({ kind: "gate", index })),
    ...level.blocks.map((block, index) => ({ kind: "block", index, eligible: isSolidBarOrRectangle(block.shape) }))
      .filter((target) => target.eligible)
      .map(({ eligible: _eligible, ...target }) => target),
  ];
  const singles = [];
  const pairs = [];
  for (const target of targets) {
    for (let count = 1; count <= 4; count += 1) singles.push([{ ...target, count }]);
  }
  for (let left = 0; left < targets.length; left += 1) {
    for (let right = left + 1; right < targets.length; right += 1) {
      for (let count = 1; count <= 4; count += 1) {
        pairs.push([
          { ...targets[left], count },
          { ...targets[right], count: 1 + ((count + right - left - 1) % 4) },
        ]);
      }
    }
  }
  const shuffledSingles = shuffled(singles, seed ^ 0x51f15e);
  const shuffledPairs = shuffled(pairs, seed ^ 0x9e3779b9);
  const result = witnessGuidedFreezeDescriptors(level, route).slice(0, budget);
  const descriptorKeys = new Set(result.map((descriptor) => descriptor
    .map((target) => `${target.kind}:${target.index}:${target.count}`)
    .sort()
    .join("|")));
  let singleIndex = 0;
  let pairIndex = 0;
  while (result.length < budget && (singleIndex < shuffledSingles.length || pairIndex < shuffledPairs.length)) {
    for (const pool of [shuffledSingles, shuffledPairs]) {
      const index = pool === shuffledSingles ? singleIndex++ : pairIndex++;
      if (index >= pool.length) continue;
      const descriptor = pool[index];
      const key = descriptor
        .map((target) => `${target.kind}:${target.index}:${target.count}`)
        .sort()
        .join("|");
      if (descriptorKeys.has(key)) continue;
      descriptorKeys.add(key);
      result.push(descriptor);
      if (result.length >= budget) break;
    }
  }
  return result;
};

const applyStrictFreezeDescriptor = (source, descriptor) => {
  const level = structuredClone(source);
  for (const target of descriptor) {
    if (target.kind === "gate") level.gates[target.index].frozen = target.count;
    else level.blocks[target.index].frozen = target.count;
  }
  return level;
};

const hardCandidateSearch = ({ entry, points, pieces, current, baseLevel, searchEnabled }) => {
  const target = entry.our_design_target;
  const levelId = Number(entry.level_id.slice(2));
  const width = target.board.cols;
  const height = target.board.rows;
  const floor = target.recommended_minimum_reposition_overhead ?? 0;
  const bodyPalette = baseBodyPaletteForTarget(target);
  const candidates = [];
  const rejectionCounts = new Map();
  let acceptedSearchCandidates = 0;
  const accept = (level, trial, source, dependency = null) => {
    const reject = (reason) => {
      if (trial === -1) console.error(`${entry.level_id} r139 seed rejected: ${reason}`);
      if (trial >= 0) rejectionCounts.set(reason, (rejectionCounts.get(reason) ?? 0) + 1);
    };
    try { validateLevel(level); } catch (error) { reject(`validateLevel: ${error}`); return; }
    const contractAnalysis = baseContractAnalysis(level, target);
    if (contractAnalysis.mismatches.length) {
      reject(`base contract mismatch: ${contractAnalysis.mismatches.join(",")}`);
      return;
    }
    const hardValidationCap = configuredValidationCap || (levelId <= 10 ? 8_000 : (baseLevel.shutters?.length ? 1_000 : 800));
    const validation = solveLevelForValidation(level, hardValidationCap);
    if (!validation.solved) { reject(`validation unsolved at ${validation.exploredStates} states`); return; }
    const replayed = replay(level, validation.drags);
    if (!replayed.ok) { reject(`validation route replay failed: ${replayed.error}`); return; }
    const numericTiming = numericRouteMeetsGeneratorFloor({ level, target, route: validation.drags });
    if (!numericTiming.meetsFloor) {
      reject(`numeric-ice route deadlines ${numericTiming.feasible}/${numericTiming.floor}: ${JSON.stringify(numericTiming.debts)}`);
      return;
    }
    let exact;
    if (levelId === 9) {
      exact = solveLevelOptimally(level, 12_000);
      if (!exact.solved || !replay(level, exact.drags).ok) { reject("Lv9 exact solve/replay inconclusive"); return; }
    }
    candidates.push({ level, validation, exact, trial, source, dependency });
    if (trial >= 0) acceptedSearchCandidates += 1;
    candidates.sort((a, b) => (b.exact?.repositionOverhead ?? b.validation.repositionOverhead)
      - (a.exact?.repositionOverhead ?? a.validation.repositionOverhead)
      || a.validation.minimumDrags - b.validation.minimumDrags);
    const candidatePoolCap = strictAcceptance ? Math.max(20, strictProofTopK * 4) : 5;
    if (candidates.length > candidatePoolCap) candidates.length = candidatePoolCap;
  };

  const previousEntry = previousHardEntryById.get(levelId);
  if (!strictAcceptance && previousEntry?.level && Array.isArray(previousEntry.route)
    && baseContractAnalysis(previousEntry.level, target).mismatches.length === 0
    && replay(previousEntry.level, previousEntry.route).ok
    && numericRouteMeetsGeneratorFloor({ level: previousEntry.level, target, route: previousEntry.route }).meetsFloor) {
    const previousAudit = previousEntry.validation;
    candidates.push({
      level: previousEntry.level,
      validation: {
        solved: true,
        minimumDrags: previousAudit.validation_solver_drags,
        clearLoad: previousAudit.validation_solver_drags - previousAudit.validation_solver_reposition_overhead,
        repositionOverhead: previousAudit.validation_solver_reposition_overhead,
        gridSteps: previousEntry.route.reduce((sum, drag) => sum + drag.path.length, 0),
        turns: 0,
        exploredStates: previousAudit.validation_solver_explored_states,
        drags: previousEntry.route,
      },
      trial: -2,
      source: "r140_previous_segment",
    });
  }

  const seedLevel = r139SeedById.get(levelId);
  if (!strictAcceptance && seedLevel) {
    const remapped = remapSeedPalette(seedLevel, bodyPalette, current);
    if (remapped) accept(remapped, -1, "r139_exact-mask_seed");
  }

  const seedAlreadyMeetsFloor = !strictAcceptance && (candidates[0]?.exact?.repositionOverhead
    ?? candidates[0]?.validation.repositionOverhead ?? -1) >= floor;
  const trialLimit = !searchEnabled || seedAlreadyMeetsFloor ? 0
    : (baseLevel.shutters?.length ? 0
      : configuredTrials || (levelId === 9 ? 180 : levelId <= 10 ? 16 : 3));
  const geometryTrialLimit = repackHardSearch ? trialLimit * 20 : trialLimit;
  const preSolveCandidates = [];
  const geometryRejections = { packing: 0, gates: 0 };
  for (let geometryTrial = 0; geometryTrial < geometryTrialLimit; geometryTrial += 1) {
    const searchTrial = configuredSeedOffset * 20 + geometryTrial;
    if (geometryTrial > 0 && geometryTrial % 32 === 0 && typeof global.gc === "function") global.gc();
    let placements;
    if (repackHardSearch) {
      const packed = packBatch({
        pieces,
        points,
        width,
        height,
        seed: levelId * 15_485_863 + searchTrial * 32_452_843,
        maxNodes: 60_000,
        deadlineMs: 600,
        preferEdges: true,
      });
      if (!packed.ok) {
        geometryRejections.packing += 1;
        continue;
      }
      placements = packed.placements.map((placement) => ({
        x: placement.x,
        y: placement.y,
        shape: placement.shape,
        shapeId: placement.shapeId,
      }));
    } else {
      placements = baseLevel.blocks.map((block) => ({
        x: block.x,
        y: block.y,
        shape: block.shape,
        shapeId: shapeIdOf(block.shape),
        shutterId: block.shutterId,
      }));
    }
    const colors = randomColorAssignment(placements, bodyPalette, levelId * 10_007 + searchTrial * 313);
    let gates = allocateColorGates({
      placements,
      colors,
      palette: target.design_palette,
      points,
      width,
      height,
      seed: levelId * 1009 + searchTrial * 7919,
      maximizeForeign: true,
      extraGateSpan: configuredGateExtra,
      desiredOwnMouth: strictAcceptance
        ? 1
        : repackHardSearch ? 1 + (searchTrial % Math.min(4, target.design_palette.length)) : 1,
      layoutJitter: configuredGateLayoutJitter,
    });
    if (!gates) {
      geometryRejections.gates += 1;
      continue;
    }
    gates = addDuplicateColorGates({
      gates,
      placements,
      colors,
      palette: target.design_palette,
      points: baseLevel.playable,
      width: baseLevel.width,
      height: baseLevel.height,
      count: configuredDuplicateGateCount,
      seed: levelId * 73_856_093 + searchTrial * 193,
    });
    const level = {
      ...baseLevel,
      gates,
      blocks: placements.map((placement, index) => ({
        id: `cc-piece-${String(index + 1).padStart(2, "0")}`,
        x: placement.x,
        y: placement.y,
        shape: placement.shape,
        color: colors[index],
        ...(placement.shutterId ? { shutterId: placement.shutterId } : {}),
      })),
    };
    renameForeignGateGuards(level);
    const dependency = dependencyMetrics(level);
    preSolveCandidates.push({ level, searchTrial, dependency });
    preSolveCandidates.sort((a, b) => b.dependency.score - a.dependency.score);
    const retainedPoolSize = repackHardSearch ? trialLimit * 8 : trialLimit;
    if (preSolveCandidates.length > retainedPoolSize) preSolveCandidates.length = retainedPoolSize;
  }

  let solveCandidates = preSolveCandidates;
  if (repackHardSearch && preSolveCandidates.length > trialLimit) {
    const ownMouthQuota = Math.max(2, Math.ceil(trialLimit / 4));
    const ownMouthCounts = new Map();
    solveCandidates = [];
    for (const candidate of preSolveCandidates) {
      const bucket = candidate.dependency.ownMouthBlockCount;
      const used = ownMouthCounts.get(bucket) ?? 0;
      if (used >= ownMouthQuota) continue;
      ownMouthCounts.set(bucket, used + 1);
      solveCandidates.push(candidate);
      if (solveCandidates.length === trialLimit) break;
    }
    if (solveCandidates.length < trialLimit) {
      for (const candidate of preSolveCandidates) {
        if (solveCandidates.includes(candidate)) continue;
        solveCandidates.push(candidate);
        if (solveCandidates.length === trialLimit) break;
      }
    }
  }

  for (const candidate of solveCandidates) {
    const beforeOverhead = candidates[0]?.validation.repositionOverhead ?? -1;
    accept(candidate.level, candidate.searchTrial, repackHardSearch
      ? "r140_random_layout_color_gate_search"
      : "r140_random_color_gate_search", candidate.dependency);
    const afterOverhead = candidates[0]?.validation.repositionOverhead ?? -1;
    if (repackHardSearch && afterOverhead > beforeOverhead) {
      console.error(`${entry.level_id} repack improved OH ${beforeOverhead} -> ${afterOverhead} at trial ${candidate.searchTrial}`);
    }
    const desired = levelId === 9 ? floor : floor + 4;
    const bestOverhead = candidates[0]?.exact?.repositionOverhead ?? candidates[0]?.validation.repositionOverhead ?? -1;
    if (!strictAcceptance && bestOverhead >= desired && candidates.length >= (levelId === 9 ? 1 : 3)) break;
    if (typeof global.gc === "function") global.gc();
  }
  if (strictFreezeVariantBudget > 0) {
    const unfrozenBases = candidates.filter((candidate) => candidate.trial >= 0
      && !candidate.level.gates.some((gate) => (gate.frozen ?? 0) > 0)
      && !candidate.level.blocks.some((block) => (block.frozen ?? 0) > 0));
    const baseCandidates = unfrozenBases.slice(0, Math.min(6, unfrozenBases.length));
    const perBaseBudget = Math.max(1, Math.ceil(strictFreezeVariantBudget / Math.max(1, baseCandidates.length)));
    let attemptedFreezeVariants = 0;
    for (let baseIndex = 0; baseIndex < baseCandidates.length && attemptedFreezeVariants < strictFreezeVariantBudget; baseIndex += 1) {
      const baseCandidate = baseCandidates[baseIndex];
      const descriptors = strictFreezeDescriptors(
        baseCandidate.level,
        Math.min(perBaseBudget, strictFreezeVariantBudget - attemptedFreezeVariants),
        levelId * 100_003 + configuredSeedOffset * 1009 + baseIndex,
        baseCandidate.validation.drags,
      );
      for (let descriptorIndex = 0; descriptorIndex < descriptors.length; descriptorIndex += 1) {
        const descriptor = descriptors[descriptorIndex];
        const frozenLevel = applyStrictFreezeDescriptor(baseCandidate.level, descriptor);
        const frozenKinds = [...new Set(descriptor.map((target) => target.kind))].sort().join("-");
        accept(
          frozenLevel,
          1_000_000 + baseCandidate.trial * 100 + descriptorIndex,
          `r140_strict_frozen_${frozenKinds}_search`,
          baseCandidate.dependency,
        );
        attemptedFreezeVariants += 1;
        if (attemptedFreezeVariants >= strictFreezeVariantBudget) break;
      }
      if (typeof global.gc === "function") global.gc();
    }
    console.error(`${entry.level_id} strict freeze variants attempted=${attemptedFreezeVariants}, budget=${strictFreezeVariantBudget}`);
  }
  if (repackHardSearch && trialLimit > 0) {
    const bestDependency = preSolveCandidates[0]?.dependency ?? null;
    const occupiedCells = baseLevel.blocks.reduce((sum, block) => sum + block.shape.length, 0);
    const ownMouthDistribution = Object.fromEntries([...solveCandidates.reduce((counts, candidate) => {
      const own = candidate.dependency.ownMouthBlockCount;
      counts.set(own, (counts.get(own) ?? 0) + 1);
      return counts;
    }, new Map()).entries()].sort((a, b) => a[0] - b[0]));
    console.error(`${entry.level_id} repack pool=${geometryTrialLimit}, retained=${preSolveCandidates.length}, shortlisted=${solveCandidates.length}, accepted=${acceptedSearchCandidates}, bestOH=${candidates[0]?.validation.repositionOverhead ?? null}, blocks=${baseLevel.blocks.length}, freeCells=${baseLevel.playable.length - occupiedCells}, ownMouthDistribution=${JSON.stringify(ownMouthDistribution)}, bestDependency=${JSON.stringify(bestDependency)}, geometryRejects=${JSON.stringify(geometryRejections)}, solverRejects=${JSON.stringify(Object.fromEntries(rejectionCounts))}`);
  }
  if (strictAcceptance) {
    const regenerated = candidates.filter((candidate) => candidate.trial >= 0);
    const alternatives = [];
    const add = (candidate) => {
      if (candidate && !alternatives.some((entry) => entry.trial === candidate.trial)) alternatives.push(candidate);
    };
    regenerated.slice(0, 2).forEach(add);
    add(regenerated.find((candidate) => candidate.level.gates.some((gate) => (gate.frozen ?? 0) > 0)));
    add(regenerated.find((candidate) => candidate.level.blocks.some((block) => (block.frozen ?? 0) > 0)));
    const dependencyOrders = [
      (candidate) => candidate.dependency?.reciprocalDependencyCount ?? -1,
      (candidate) => candidate.dependency?.dependencyEdgeCount ?? -1,
      (candidate) => candidate.dependency?.foreignMouthCellCount ?? -1,
    ];
    for (const metric of dependencyOrders) {
      add([...regenerated].sort((left, right) => metric(right) - metric(left)
        || right.validation.repositionOverhead - left.validation.repositionOverhead)[0]);
    }
    regenerated.forEach((candidate) => {
      if (alternatives.length < strictProofTopK) add(candidate);
    });
    const selected = alternatives.slice(0, strictProofTopK);
    if (selected.length) return { ...selected[0], strictAlternatives: selected };
  }
  return candidates[0];
};

const stagedHardCandidateSearch = ({ entry, baseLevel, searchEnabled }) => {
  if (!searchEnabled) return undefined;
  const target = entry.our_design_target;
  const levelId = Number(entry.level_id.slice(2));
  const floor = target.recommended_minimum_reposition_overhead ?? 0;
  const palette = target.design_palette;
  const denseRepartitionEachTrial = HIGH_DENSITY_STAGED_LEVELS.has(levelId);
  const balancedRepartitionEachTrial = (strictAcceptance || configuredBalancedRepack)
    && repackHardSearch && !denseRepartitionEachTrial;
  const repackEachTrial = denseRepartitionEachTrial || balancedRepartitionEachTrial;
  const baseStageKeys = [undefined, ...(baseLevel.shutters ?? []).map((shutter) => shutter.id)];
  const baseGroups = baseStageKeys.map((shutterId) => baseLevel.blocks.filter((block) => block.shutterId === shutterId));
  const fixedStageBatches = fixedStageBatchesFor({ levelId, target });
  let piecesByStage = fixedStageBatches ?? (denseRepartitionEachTrial
    ? partitionBatches(
      expandHistogram(target.full_level_shape_histogram),
      baseLevel.playable.length,
      true,
      0.90,
    )
    : balancedRepartitionEachTrial
      ? partitionBalancedStageBatches(
        expandHistogram(target.full_level_shape_histogram),
        forcedStagingIds.has(levelId)
          ? forcedStageBatchCount
          : Math.max(configuredTargetStageBatchCount ?? 0, baseGroups.length),
        baseLevel.playable.length,
        levelId * 1_000_003 + configuredSeedOffset * 104_729,
        levelId >= 21 ? 4 : 2,
      )
      : baseGroups.map((group) => group.map((block, index) => ({
        shapeId: shapeIdOf(block.shape),
        ordinal: index + 1,
      }))));
  if (forcedStagingIds.has(levelId) && fixedStageBatches === null) {
    piecesByStage = ensureDenseOpeningBatch(piecesByStage, baseLevel.playable.length);
  }
  if (!piecesByStage) return undefined;
  const fixedPartitionRepack = fixedStageBatches !== null;
  const shouldRepackEachTrial = repackEachTrial || fixedPartitionRepack;
  const stageKeys = shouldRepackEachTrial
    ? [undefined, ...piecesByStage.slice(1).map((_, index) => `cc-${String(levelId).padStart(3, "0")}-stage-${index + 2}`)]
    : baseStageKeys;
  const control = reserveCellFor(baseLevel.playable, baseLevel.width, baseLevel.height);
  const shutterTemplates = shouldRepackEachTrial
    ? piecesByStage.slice(1).map((_, index) => ({
      id: stageKeys[index + 1],
      x: control[0],
      y: control[1],
      width: 1,
      height: 1,
      count: piecesByStage.slice(0, index + 1).reduce((sum, batch) => sum + batch.length, 0),
      skin: stagedSkinFor(levelId),
    }))
    : (baseLevel.shutters ?? []);
  const trials = configuredTrials || 28;
  const candidates = [];
  let bestUnderFloor = null;
  const recombinationVariants = piecesByStage.map(() => []);
  const stagedRejections = {
    packing: 0,
    gates: 0,
    stage_validate_or_solve: 0,
    cover_layout: 0,
    full_validate: 0,
    full_replay: 0,
  };

  for (let trial = configuredTrialStart; trial < configuredTrialStart + trials; trial += 1) {
    const searchTrial = configuredSeedOffset * 20 + trial;
    if (shouldRepackEachTrial && typeof global.gc === "function") global.gc();
    let trialGroups = baseGroups;
    if (shouldRepackEachTrial) {
      trialGroups = [];
      let packingFailed = false;
      for (let stageIndex = 0; stageIndex < piecesByStage.length; stageIndex += 1) {
        const stageReservedKey = stageIndex === piecesByStage.length - 1 || !control
          ? undefined
          : keyOf(control[0], control[1]);
        const packed = packBatch({
          pieces: piecesByStage[stageIndex],
          points: baseLevel.playable,
          width: baseLevel.width,
          height: baseLevel.height,
          reservedKey: stageReservedKey,
          seed: levelId * 10_000_019 + searchTrial * 104_729 + stageIndex * 8191,
          maxNodes: 60_000,
          deadlineMs: 600,
          preferEdges: configuredPackPreferEdges,
          preferFillers: (balancedRepartitionEachTrial || fixedPartitionRepack)
            && (searchTrial + stageIndex) % 3 === 0,
        });
        if (!packed.ok) {
          packingFailed = true;
          break;
        }
        trialGroups.push(packed.placements.map((placement) => ({
          x: placement.x,
          y: placement.y,
          shape: placement.shape,
        })));
      }
      if (packingFailed) {
        stagedRejections.packing += 1;
        continue;
      }
    }

    const placements = trialGroups.flatMap((group, stageIndex) => group.map((block) => ({
      x: block.x,
      y: block.y,
      shape: block.shape,
      shapeId: shapeIdOf(block.shape),
      shutterId: stageKeys[stageIndex],
    })));
    let colors = enforceBaseStageColorPlan(
      placements,
      randomColorAssignment(placements, palette, levelId * 1_000_033 + searchTrial * 8191),
      target,
      levelId * 1_000_033 + searchTrial * 8191,
    );
    let gates = configuredFixedGateLayout
      ? structuredClone(configuredFixedGateLayout).map((gate, index) => ({
        ...gate,
        id: gate.id ?? `cc-hard-gate-${index + 1}`,
      }))
      : allocateColorGates({
        placements,
        colors,
        palette,
        points: baseLevel.playable,
        width: baseLevel.width,
        height: baseLevel.height,
        seed: levelId * 65_537 + searchTrial * 4099,
        maximizeForeign: strictAcceptance || configuredMaximizeForeign,
        desiredOwnMouth: configuredStagedOwnMouth ?? 1,
        layoutJitter: configuredGateLayoutJitter,
      });
    if (!gates) {
      stagedRejections.gates += 1;
      continue;
    }
    gates = addDuplicateColorGates({
      gates,
      placements,
      colors,
      palette,
      points: baseLevel.playable,
      width: baseLevel.width,
      height: baseLevel.height,
      count: configuredDuplicateGateCount,
      seed: levelId * 73_856_093 + searchTrial * 193,
    });
    if (configuredOptimizeStageColors) {
      colors = optimizeColorsByStageDependencies({
        placements,
        colors,
        gates,
        palette,
        width: baseLevel.width,
        height: baseLevel.height,
        seed: levelId * 32_452_843 + searchTrial * 499,
      });
      colors = enforceBaseStageColorPlan(
        placements,
        colors,
        target,
        levelId * 32_452_843 + searchTrial * 499,
      );
    }

    let globalIndex = 0;
    const stageBlocks = [];
    const route = [];
    const stageScreening = [];
    const stageLevelsForExactScreen = [];
    let exploredStates = 0;
    let failed = false;
    for (let stageIndex = 0; stageIndex < trialGroups.length; stageIndex += 1) {
      const shutterId = stageKeys[stageIndex];
      const group = trialGroups[stageIndex];
      const stagePalette = stageIndex === 0
        ? palette.slice(0, target.opening_color_count)
        : palette;
      let temp = {
        id: levelId,
        name: `${baseLevel.name} stage ${stageIndex + 1}`,
        difficulty: baseLevel.difficulty,
        timeSeconds: baseLevel.timeSeconds,
        reward: baseLevel.reward,
        width: baseLevel.width,
        height: baseLevel.height,
        playable: baseLevel.playable,
        ...(control && stageIndex < trialGroups.length - 1 ? { blocked: [control] } : {}),
        gates,
        blocks: group.map((block) => ({
          id: `cc-stage-${stageIndex + 1}-${String(globalIndex + 1).padStart(2, "0")}`,
          x: block.x,
          y: block.y,
          shape: block.shape,
          color: colors[globalIndex++],
        })),
      };
      renameForeignGateGuards(temp, `s${stageIndex + 1}`);
      let validation;
      try {
        validateLevel(temp);
        validation = solveLevelForValidation(temp, configuredValidationCap || (repackEachTrial ? 1_500 : 2_000));
      } catch {
        validation = null;
      }
      let selectedExact = null;
      if (configuredExactColorVariants > 0) {
        let best = null;
        for (let colorTrial = 0; colorTrial < configuredExactColorVariants; colorTrial += 1) {
          const variant = structuredClone(temp);
          if (colorTrial > 0) {
            const rng = makeRng(levelId * 15485863 + searchTrial * 32452843
              + stageIndex * 49979687 + colorTrial * 67867967);
            let assignment;
            if (configuredAllowStageColorSubsets && colorTrial % 2 === 1) {
              // Preserve most of the dependency-maximized assignment and
              // perturb a small rotating subset. Fully random recoloring can
              // make a dense stage solvable only by erasing the very blocker
              // cycles whose lower bound we are trying to certify.
              assignment = variant.blocks.map((block) => block.color);
              const mutationCount = Math.max(
                1,
                Math.min(
                  assignment.length,
                  Math.ceil(assignment.length * (0.10 + 0.08 * (colorTrial % 5))),
                ),
              );
              const mutationOrder = shuffled(
                Array.from({ length: assignment.length }, (_, index) => index),
                Math.floor(rng() * 0xffffffff),
              );
              for (const blockIndex of mutationOrder.slice(0, mutationCount)) {
                const alternatives = stagePalette.filter((color) => color !== assignment[blockIndex]);
                if (alternatives.length) assignment[blockIndex] = alternatives[Math.floor(rng() * alternatives.length)];
              }
            } else {
              assignment = configuredAllowStageColorSubsets
                ? Array.from({ length: variant.blocks.length }, () => stagePalette[Math.floor(rng() * stagePalette.length)])
                : randomColorAssignment(
                  variant.blocks.map((block) => ({ ...block, shutterId: undefined })),
                  stagePalette,
                  Math.floor(rng() * 0xffffffff),
                );
            }
            variant.blocks.forEach((block, index) => { block.color = assignment[index]; });
            renameForeignGateGuards(variant, `s${stageIndex + 1}`);
          }
          let exact;
          try {
            validateLevel(variant);
            exact = solveLevelOptimally(variant, configuredExactColorCap);
          } catch {
            continue;
          }
          if (!exact.solved || !replay(variant, exact.drags).ok) continue;
          if (!best || exact.repositionOverhead > best.exact.repositionOverhead
            || (exact.repositionOverhead === best.exact.repositionOverhead
              && exact.minimumDrags < best.exact.minimumDrags)) {
            best = { level: variant, exact };
          }
        }
        if (best) {
          temp = best.level;
          validation = best.exact;
          selectedExact = best.exact;
        }
      }
      if (!validation?.solved || !replay(temp, validation.drags).ok) {
        failed = true;
        break;
      }
      stageScreening.push({
        solved: Boolean(selectedExact),
        repositionOverhead: selectedExact?.repositionOverhead ?? null,
        validationRepositionOverhead: validation.repositionOverhead,
        exploredStates: selectedExact?.exploredStates ?? 0,
      });
      stageLevelsForExactScreen.push(temp);
      if (configuredRecombineStageVariants && configuredFixedGateLayout) {
        const variants = recombinationVariants[stageIndex];
        const signature = sha256(JSON.stringify(temp));
        if (!variants.some((variant) => variant.signature === signature)) {
          variants.push({
            signature,
            level: structuredClone(temp),
            blocks: structuredClone(temp.blocks),
            validation: structuredClone(validation),
            exact: selectedExact ? structuredClone(selectedExact) : null,
          });
          variants.sort((left, right) => right.validation.repositionOverhead - left.validation.repositionOverhead
            || left.validation.minimumDrags - right.validation.minimumDrags);
          if (variants.length > configuredRecombineStageVariantLimit) {
            variants.length = configuredRecombineStageVariantLimit;
          }
        }
      }
      exploredStates += validation.exploredStates;
      route.push(...validation.drags);
      stageBlocks.push(...temp.blocks.map((block) => ({
        ...block,
        ...(shutterId ? { shutterId } : {}),
      })));
      if (repackEachTrial && typeof global.gc === "function") global.gc();
    }
    if (failed) {
      stagedRejections.stage_validate_or_solve += 1;
      continue;
    }

    const finalStageKey = stageKeys.at(-1);
    const initialFootprints = new Set(stageBlocks
      .filter((block) => block.shutterId !== finalStageKey)
      .flatMap((block) => block.shape.map(([dx, dy]) => keyOf(block.x + dx, block.y + dy))));
    const routeFootprints = new Set();
    for (const drag of route) {
      const block = stageBlocks.find((candidate) => candidate.id === drag.blockId);
      if (!block || block.shutterId === finalStageKey) continue;
      for (const [x, y] of [[block.x, block.y], ...drag.path]) {
        for (const [dx, dy] of block.shape) routeFootprints.add(keyOf(x + dx, y + dy));
      }
    }
    const preferredCoverCells = [
      ...(control ? [control] : []),
      ...shutterTemplates.map((shutter) => [shutter.x, shutter.y]),
      ...baseLevel.playable,
    ];
    const sharedInternalControl = configuredStagingSkin === "staging" && control
      && !initialFootprints.has(keyOf(control[0], control[1]))
      && !routeFootprints.has(keyOf(control[0], control[1]));
    const coverCells = sharedInternalControl
      ? Array.from({ length: shutterTemplates.length }, () => [...control])
      : [];
    const seenCoverCells = new Set();
    if (!sharedInternalControl) {
      for (const cell of preferredCoverCells) {
        const key = keyOf(cell[0], cell[1]);
        if (seenCoverCells.has(key) || initialFootprints.has(key) || routeFootprints.has(key)) continue;
        seenCoverCells.add(key);
        coverCells.push(cell);
        if (coverCells.length === shutterTemplates.length) break;
      }
    }
    if (coverCells.length !== shutterTemplates.length) {
      stagedRejections.cover_layout += 1;
      continue;
    }

    const level = {
      ...baseLevel,
      gates,
      blocks: stageBlocks,
      shutters: shutterTemplates.map((shutter, index) => ({
        ...shutter,
        x: coverCells[index][0],
        y: coverCells[index][1],
      })),
    };
    const contractAnalysis = baseContractAnalysis(level, target);
    if (contractAnalysis.mismatches.length) {
      stagedRejections.base_contract = (stagedRejections.base_contract ?? 0) + 1;
      continue;
    }
    try { validateLevel(level); } catch {
      stagedRejections.full_validate += 1;
      continue;
    }
    const replayed = replay(level, route);
    if (!replayed.ok) {
      stagedRejections.full_replay += 1;
      continue;
    }
    const numericTiming = numericRouteMeetsGeneratorFloor({ level, target, route });
    if (!numericTiming.meetsFloor) {
      stagedRejections.numeric_ice_route_deadline = (stagedRejections.numeric_ice_route_deadline ?? 0) + 1;
      continue;
    }
    const clearLoad = level.blocks.length;
    const validation = {
      solved: true,
      minimumDrags: route.length,
      clearLoad,
      repositionOverhead: route.length - clearLoad,
      gridSteps: route.reduce((sum, drag) => sum + drag.path.length, 0),
      turns: 0,
      exploredStates,
      drags: route,
    };
    const provisionalExactFloor = stageScreening.every((screen) => screen.solved)
      ? stageScreening.reduce((sum, screen) => sum + screen.repositionOverhead, 0)
      : null;
    const provisionalCandidate = {
      level,
      validation,
      trial: searchTrial,
      source: "r141_staged_best_under_floor_diagnostic",
      stageScreening,
      exactScreenFloor: provisionalExactFloor,
      screenPriority: provisionalExactFloor ?? validation.repositionOverhead,
    };
    if (!bestUnderFloor
      || (provisionalExactFloor ?? validation.repositionOverhead)
        > (bestUnderFloor.exactScreenFloor ?? bestUnderFloor.validation.repositionOverhead)
      || ((provisionalExactFloor ?? validation.repositionOverhead)
          === (bestUnderFloor.exactScreenFloor ?? bestUnderFloor.validation.repositionOverhead)
        && validation.repositionOverhead > bestUnderFloor.validation.repositionOverhead)) {
      bestUnderFloor = provisionalCandidate;
    }
    stagedRejections.best_witness_reposition_overhead = Math.max(
      stagedRejections.best_witness_reposition_overhead ?? 0,
      validation.repositionOverhead,
    );
    // A replayed route is an unconditional upper bound on the true minimum.
    // Do not send a candidate to the expensive proof stage when that upper
    // bound is already below the requested necessary-reposition floor.
    if (validation.repositionOverhead < floor) {
      stagedRejections.witness_capacity_below_floor = (stagedRejections.witness_capacity_below_floor ?? 0) + 1;
      continue;
    }
    if (stageScreenCap > 0) {
      for (let stageIndex = 0; stageIndex < stageLevelsForExactScreen.length; stageIndex += 1) {
        if (stageScreening[stageIndex].solved) continue;
        const screened = solveLevelOptimally(stageLevelsForExactScreen[stageIndex], stageScreenCap);
        if (screened.solved && replay(stageLevelsForExactScreen[stageIndex], screened.drags).ok) {
          stageScreening[stageIndex] = {
            ...stageScreening[stageIndex],
            solved: true,
            repositionOverhead: screened.repositionOverhead,
            exploredStates: screened.exploredStates,
          };
        } else {
          stageScreening[stageIndex].exploredStates = screened.exploredStates;
        }
      }
    }
    const exactScreenFloor = stageScreening.every((screen) => screen.solved)
      ? stageScreening.reduce((sum, screen) => sum + screen.repositionOverhead, 0)
      : null;
    if (exactScreenFloor !== null) {
      stagedRejections.best_exact_screen_floor = Math.max(
        stagedRejections.best_exact_screen_floor ?? 0,
        exactScreenFloor,
      );
    }
    if (exactScreenFloor !== null && exactScreenFloor < floor) {
      stagedRejections.exact_screen_below_floor = (stagedRejections.exact_screen_below_floor ?? 0) + 1;
      continue;
    }
    const screenPriority = stageScreening.reduce((sum, screen) => sum + (
      screen.solved ? screen.repositionOverhead : screen.validationRepositionOverhead + 2
    ), 0);
    const candidate = {
      level,
      validation,
      trial: searchTrial,
      source: "r140_staged_batch_validation",
      stageScreening,
      exactScreenFloor,
      screenPriority,
    };
    candidates.push(candidate);
    candidates.sort((left, right) => Number((right.exactScreenFloor ?? -1) >= floor)
      - Number((left.exactScreenFloor ?? -1) >= floor)
      || right.screenPriority - left.screenPriority
      || right.validation.repositionOverhead - left.validation.repositionOverhead
      || left.validation.minimumDrags - right.validation.minimumDrags);
    const candidatePoolLimit = strictAcceptance || externalStrictSearch ? 20 : 1;
    if (candidates.length > candidatePoolLimit) candidates.length = candidatePoolLimit;
    if (!strictAcceptance && !externalStrictSearch && candidates[0].validation.repositionOverhead >= floor) break;
  }
  if (configuredRecombineStageVariants && configuredFixedGateLayout && configuredDuplicateGateCount === 0
    && recombinationVariants.every((variants) => variants.length > 0)) {
    const selectedStages = [];
    const recombinedStageChoices = [];
    for (let stageIndex = 0; stageIndex < recombinationVariants.length; stageIndex += 1) {
      const screenedVariants = recombinationVariants[stageIndex].map((variant) => {
        if (variant.exact) return variant;
        if (stageScreenCap <= 0) return { ...variant, exact: null };
        const exact = solveLevelOptimally(variant.level, stageScreenCap);
        return {
          ...variant,
          exact: exact.solved && replay(variant.level, exact.drags).ok ? exact : null,
        };
      });
      screenedVariants.sort((left, right) => Number(Boolean(right.exact)) - Number(Boolean(left.exact))
        || (right.exact?.repositionOverhead ?? right.validation.repositionOverhead)
          - (left.exact?.repositionOverhead ?? left.validation.repositionOverhead)
        || left.validation.minimumDrags - right.validation.minimumDrags);
      selectedStages.push(screenedVariants[0]);
      recombinedStageChoices.push({
        variants: screenedVariants.length,
        solved_variants: screenedVariants.filter((variant) => Boolean(variant.exact)).length,
        selected_exact_reposition_overhead: screenedVariants[0].exact?.repositionOverhead ?? null,
        selected_validation_reposition_overhead: screenedVariants[0].validation.repositionOverhead,
      });
      if (typeof global.gc === "function") global.gc();
    }

    const stageBlocks = [];
    const route = [];
    const recombinedScreening = [];
    selectedStages.forEach((selected, stageIndex) => {
      const shutterId = stageKeys[stageIndex];
      stageBlocks.push(...selected.blocks.map((block) => ({
        ...structuredClone(block),
        ...(shutterId ? { shutterId } : {}),
      })));
      const selectedRoute = selected.exact?.drags ?? selected.validation.drags;
      route.push(...structuredClone(selectedRoute));
      recombinedScreening.push({
        solved: Boolean(selected.exact),
        repositionOverhead: selected.exact?.repositionOverhead ?? null,
        validationRepositionOverhead: selected.validation.repositionOverhead,
        exploredStates: selected.exact?.exploredStates ?? stageScreenCap,
      });
    });
    const level = {
      ...baseLevel,
      gates: structuredClone(configuredFixedGateLayout).map((gate, index) => ({
        ...gate,
        id: gate.id ?? `cc-hard-gate-${index + 1}`,
      })),
      blocks: stageBlocks,
      shutters: shutterTemplates.map((shutter) => ({
        ...shutter,
        x: control[0],
        y: control[1],
      })),
    };
    try {
      const contractAnalysis = baseContractAnalysis(level, target);
      if (contractAnalysis.mismatches.length) throw new Error(contractAnalysis.mismatches.join(","));
      validateLevel(level);
      const replayed = replay(level, route);
      if (replayed.ok) {
        const numericTiming = numericRouteMeetsGeneratorFloor({ level, target, route });
        if (!numericTiming.meetsFloor) throw new Error("recombined route violates numeric-ice deadlines");
        const clearLoad = level.blocks.length;
        const validation = {
          solved: true,
          minimumDrags: route.length,
          clearLoad,
          repositionOverhead: route.length - clearLoad,
          gridSteps: route.reduce((sum, drag) => sum + drag.path.length, 0),
          turns: 0,
          exploredStates: selectedStages.reduce((sum, stage) => sum + stage.validation.exploredStates, 0),
          drags: route,
        };
        const exactScreenFloor = recombinedScreening.every((screen) => screen.solved)
          ? recombinedScreening.reduce((sum, screen) => sum + screen.repositionOverhead, 0)
          : null;
        stagedRejections.recombined_witness_reposition_overhead = validation.repositionOverhead;
        stagedRejections.recombined_exact_screen_floor = exactScreenFloor;
        stagedRejections.recombined_stage_choices = recombinedStageChoices;
        if (!bestUnderFloor
          || (exactScreenFloor ?? validation.repositionOverhead)
            > (bestUnderFloor.exactScreenFloor ?? bestUnderFloor.validation.repositionOverhead)) {
          bestUnderFloor = {
            level,
            validation,
            trial: 9_000_000 + configuredSeedOffset,
            source: "r141_fixed_gate_recombined_under_floor_diagnostic",
            stageScreening: recombinedScreening,
            exactScreenFloor,
            screenPriority: exactScreenFloor ?? validation.repositionOverhead,
          };
        }
        if (validation.repositionOverhead >= floor && (exactScreenFloor === null || exactScreenFloor >= floor)) {
          candidates.push({
            level,
            validation,
            trial: 9_000_000 + configuredSeedOffset,
            source: "r141_fixed_gate_independent_stage_recombination",
            stageScreening: recombinedScreening,
            exactScreenFloor,
            screenPriority: recombinedScreening.reduce((sum, screen) => sum
              + (screen.repositionOverhead ?? screen.validationRepositionOverhead), 0),
          });
          candidates.sort((left, right) => Number((right.exactScreenFloor ?? -1) >= floor)
            - Number((left.exactScreenFloor ?? -1) >= floor)
            || right.screenPriority - left.screenPriority
            || right.validation.repositionOverhead - left.validation.repositionOverhead
            || left.validation.minimumDrags - right.validation.minimumDrags);
          if (candidates.length > 20) candidates.length = 20;
        }
      }
    } catch {
      // Optional recombination failure leaves independently generated candidates intact.
    }
  }
  if (strictFreezeVariantBudget > 0 && (candidates.length || bestUnderFloor)) {
    const freezeSourceCandidates = candidates.length ? candidates : [bestUnderFloor];
    const baseCandidates = freezeSourceCandidates.filter((candidate) => !candidate.level.gates.some((gate) => (gate.frozen ?? 0) > 0)
      && !candidate.level.blocks.some((block) => (block.frozen ?? 0) > 0)).slice(0, Math.min(5, freezeSourceCandidates.length));
    const perBaseBudget = Math.max(1, Math.ceil(strictFreezeVariantBudget / Math.max(1, baseCandidates.length)));
    let attemptedFreezeVariants = 0;
    let solvedFreezeVariants = 0;
    for (let baseIndex = 0; baseIndex < baseCandidates.length && attemptedFreezeVariants < strictFreezeVariantBudget; baseIndex += 1) {
      const baseCandidate = baseCandidates[baseIndex];
      const descriptors = strictFreezeDescriptors(
        baseCandidate.level,
        Math.min(perBaseBudget, strictFreezeVariantBudget - attemptedFreezeVariants),
        levelId * 200_003 + configuredSeedOffset * 2017 + baseIndex,
        baseCandidate.validation.drags,
      );
      for (let descriptorIndex = 0; descriptorIndex < descriptors.length; descriptorIndex += 1) {
        const descriptor = descriptors[descriptorIndex];
        const level = applyStrictFreezeDescriptor(baseCandidate.level, descriptor);
        attemptedFreezeVariants += 1;
        let validation;
        try {
          validateLevel(level);
          validation = solveLevelForValidation(level, configuredValidationCap || 2_500);
        } catch {
          continue;
        }
        if (!validation.solved || !replay(level, validation.drags).ok) continue;
        if (!numericRouteMeetsGeneratorFloor({ level, target, route: validation.drags }).meetsFloor) continue;
        solvedFreezeVariants += 1;
        const frozenKinds = [...new Set(descriptor.map((target) => target.kind))].sort().join("-");
        candidates.push({
          level,
          validation,
          trial: 2_000_000 + baseCandidate.trial * 100 + descriptorIndex,
          source: `r140_staged_strict_frozen_${frozenKinds}_search`,
        });
        candidates.sort((left, right) => right.validation.repositionOverhead - left.validation.repositionOverhead
          || left.validation.minimumDrags - right.validation.minimumDrags);
        if (candidates.length > 20) candidates.length = 20;
      }
      if (typeof global.gc === "function") global.gc();
    }
    console.error(`${entry.level_id} staged strict freeze variants attempted=${attemptedFreezeVariants}, solved=${solvedFreezeVariants}, budget=${strictFreezeVariantBudget}`);
  }
  if (repackEachTrial && trials > 0) {
    console.error(`${entry.level_id} staged repack trials=${trials}, plannedStages=${piecesByStage.length}, candidates=${candidates.length}, rejects=${JSON.stringify(stagedRejections)}`);
  }
  if (strictAcceptance && candidates.length) {
    const alternatives = [];
    const add = (candidate) => {
      if (candidate && !alternatives.some((entry) => entry.trial === candidate.trial)) alternatives.push(candidate);
    };
    candidates.slice(0, 2).forEach(add);
    add(candidates.find((candidate) => candidate.level.gates.some((gate) => (gate.frozen ?? 0) > 0)));
    add(candidates.find((candidate) => candidate.level.blocks.some((block) => (block.frozen ?? 0) > 0)));
    candidates.forEach((candidate) => {
      if (alternatives.length < strictProofTopK) add(candidate);
    });
    alternatives.length = Math.min(alternatives.length, strictProofTopK);
    return { ...alternatives[0], strictAlternatives: alternatives };
  }
  return candidates[0] ?? (configuredKeepBestUnderFloor ? bestUnderFloor : undefined);
};

const reserveCellFor = (points, width, height) => [...points].sort((a, b) => {
  const edgeA = Number(a[0] === 0 || a[1] === 0 || a[0] === width - 1 || a[1] === height - 1);
  const edgeB = Number(b[0] === 0 || b[1] === 0 || b[0] === width - 1 || b[1] === height - 1);
  return edgeA - edgeB || Math.abs(a[0] - (width - 1) / 2) + Math.abs(a[1] - (height - 1) / 2)
    - Math.abs(b[0] - (width - 1) / 2) - Math.abs(b[1] - (height - 1) / 2);
})[0];

const proposeReplacementMask = ({ width, height, cellCount, batches, levelId }) => {
  const all = Array.from({ length: width * height }, (_, index) => [index % width, Math.floor(index / width)]);
  const removableCount = all.length - cellCount;
  if (removableCount <= 0) return undefined;
  for (let attempt = 0; attempt < 180; attempt += 1) {
    const rng = makeRng(levelId * 1009 + attempt * 9176);
    const points = [...all];
    while (points.length > cellCount) {
      const candidates = shuffled(points, Math.floor(rng() * 0xffffffff)).filter(([x, y]) => {
        const next = points.filter(([cellX, cellY]) => cellX !== x || cellY !== y);
        return connectedAndFourEdge(width, height, next);
      });
      let removed = false;
      for (const candidate of candidates.slice(0, 18)) {
        const next = points.filter(([x, y]) => x !== candidate[0] || y !== candidate[1]);
        const reserve = batches.length > 1 ? reserveCellFor(next, width, height) : undefined;
        const fits = batches.every((batch, batchIndex) => packBatch({
          pieces: batch,
          points: next,
          width,
          height,
          reservedKey: reserve ? keyOf(reserve[0], reserve[1]) : undefined,
          seed: levelId * 100_000 + attempt * 101 + batchIndex,
          maxNodes: 45_000,
        }).ok);
        if (!fits) continue;
        points.splice(points.findIndex(([x, y]) => x === candidate[0] && y === candidate[1]), 1);
        removed = true;
        break;
      }
      if (!removed) break;
    }
    if (points.length !== cellCount) continue;
    const reserve = batches.length > 1 ? reserveCellFor(points, width, height) : undefined;
    const packed = batches.every((batch, batchIndex) => packBatch({
      pieces: batch,
      points,
      width,
      height,
      reservedKey: reserve ? keyOf(reserve[0], reserve[1]) : undefined,
      seed: levelId * 100_000 + attempt * 101 + batchIndex,
      maxNodes: 120_000,
    }).ok);
    if (packed) return maskRows(width, height, points);
  }
  return undefined;
};

const generateLevel = (entry) => {
  const target = entry.our_design_target;
  const levelId = Number(entry.level_id.slice(2));
  if (!entry.__skipCache && (refreshCached || (requestedHardIds.size && !requestedHardIds.has(levelId)))) {
    const cached = previousEntryById.get(levelId);
    if (cached?.level && cached?.validation && Array.isArray(cached.route)) {
      const level = structuredClone(cached.level);
      if (level.shutters?.length) {
        level.shutters = level.shutters.map((shutter) => ({ ...shutter, skin: stagedSkinFor(levelId) }));
      }
      const targetD1 = target.target_d1_difficulty.calibrated_score;
      let pacingMapping = "Lv1-Lv3 tutorial pacing preserved";
      let parMovesSource = "tutorial pacing preserved";
      level.timeSeconds = target.time_seconds ?? level.timeSeconds;
      if (levelId >= 4) {
        const pacing = pacingForTarget(target, targetD1);
        const parMoves = cached.validation.optimal_solver_status === "exact_minimum_proven"
          ? cached.validation.optimal_solver_drags
          : cached.validation.validation_solver_drags;
        Object.assign(level, pacing, { parMoves });
        pacingMapping = `target D1 ${targetD1} + video timer -> ${pacing.difficulty}/${pacing.timeSeconds}s`;
        parMovesSource = cached.validation.optimal_solver_status === "exact_minimum_proven"
          ? "exact minimum drags"
          : "replayed validation-route drags";
      }
      try {
        validateLevel(level);
      } catch {
        // Fall through to a full regeneration if the cached candidate is no
        // longer valid against the current LevelSpec schema.
        return generateLevel({ ...entry, __skipCache: true });
      }
      const contractAnalysis = baseContractAnalysis(level, target);
      if (contractAnalysis.mismatches.length) return generateLevel({ ...entry, __skipCache: true });
      const replayed = replay(level, cached.route);
      if (!replayed.ok) return generateLevel({ ...entry, __skipCache: true });
      const cachedNumericTiming = numericRouteMeetsGeneratorFloor({ level, target, route: cached.route });
      if (!cachedNumericTiming.meetsFloor) {
        return generateLevel({ ...entry, __skipCache: true });
      }
      const rawDifficulty = scoreBlockOutLevel(level);
      const actualD1 = calibratedBlockOutDifficulty(rawDifficulty.score);
      const audit = {
        ...cached.validation,
        staged_reveal: Boolean(level.shutters?.length),
        stage_count: 1 + (level.shutters?.length ?? 0),
        validate_level: "pass",
        puzzle_model_replay: "pass",
        target_d1_calibrated_score: targetD1,
        actual_d1_raw_score: rawDifficulty.score,
        actual_d1_calibrated_score: actualD1,
        actual_d1_delta: Number((actualD1 - targetD1).toFixed(2)),
        target_d1_status: actualD1 >= targetD1 ? "met_or_above_target" : "below_target",
        pacing_mapping: pacingMapping,
        par_moves: level.parMoves ?? null,
        par_moves_source: parMovesSource,
        actual_d1_components: rawDifficulty.components,
        actual_d1_evidence: rawDifficulty.evidence,
        staged_cover_cells_distinct: level.shutters?.length
          ? new Set(level.shutters.map((shutter) => keyOf(shutter.x, shutter.y))).size === level.shutters.length
          : null,
        staged_skin: level.shutters?.length
          ? [...new Set(level.shutters.map((shutter) => shutter.skin ?? "shutter"))]
          : [],
        opening_color_count: contractAnalysis.openingPalette.length,
        opening_palette: contractAnalysis.openingPalette,
        base_body_color_count: contractAnalysis.bodyPalette.length,
        base_body_palette: contractAnalysis.bodyPalette,
        deferred_full_palette_colors: contractAnalysis.deferredPaletteColors,
        opening_hidden_color_carrier_ids: contractAnalysis.openingHiddenColorCarrierIds,
        numeric_ice_contract_mode: cachedNumericTiming.mode,
        numeric_ice_carrier_total: cachedNumericTiming.total,
        numeric_ice_base_route_feasible: cachedNumericTiming.feasible,
        numeric_ice_base_route_debt: cachedNumericTiming.debt,
        numeric_ice_generator_feasible_floor: cachedNumericTiming.floor,
        numeric_ice_deadline_status: cachedNumericTiming.debt === 0
          ? "all_carriers_route_feasible"
          : "maximum_sequential_base_feasibility_with_contract_debt",
        staging_skin_status: [17, 28].includes(levelId)
          ? (level.shutters?.every((shutter) => shutter.skin === "staging")
            ? "supported_internal_staging_skin"
            : "BLOCKED: Lv17/Lv28 must use internal staging skin")
          : "not_applicable_or_supported",
      };
      return {
        ok: true,
        level,
        route: cached.route,
        audit,
      };
    }
  }
  console.error(`Generating ${entry.level_id}...`);
  const current = currentById.get(levelId);
  const width = target.board.cols;
  const height = target.board.rows;
  const points = maskPoints(target.board.playable_mask);
  const pieces = expandHistogram(target.full_level_shape_histogram);
  const baseBodyPalette = baseBodyPaletteForTarget(target);
  const fixedStageBatches = fixedStageBatchesFor({ levelId, target });
  const staged = target.requires_staged_reveal || forcedStagingIds.has(levelId) || fixedStageBatches !== null;
  let batches = fixedStageBatches ?? (forcedStagingIds.has(levelId)
    ? partitionBalancedStageBatches(
      pieces,
      forcedStageBatchCount,
      points.length,
      levelId * 1_000_003 + configuredSeedOffset * 104_729,
      levelId >= 21 ? 4 : 2,
    )
    : partitionBatches(pieces, points.length, staged, configuredStageDensity));
  if (!batches) return { ok: false, levelId, phase: "staging", reason: "unable to partition forced stage batches" };
  if (forcedStagingIds.has(levelId) && fixedStageBatches === null) {
    batches = ensureDenseOpeningBatch(batches, points.length);
    if (!batches) return { ok: false, levelId, phase: "staging", reason: "unable to keep forced opening stage at 50% density" };
  }
  const numericDeadlinePlanBundle = numericDeadlinePlansForTarget({ target, batches });
  const numericDeadlinePlans = numericDeadlinePlanBundle.plans;
  const reserved = staged ? reserveCellFor(points, width, height) : undefined;
  const reservedKey = reserved ? keyOf(reserved[0], reserved[1]) : undefined;
  const gatesResult = chooseGates({ points, width, height, colorCount: target.full_level_color_count, pieces });
  if (!gatesResult.ok) return { ok: false, levelId, phase: "gates", reason: gatesResult.reason, batches };
  const gates = gatesResult.slots.map((slot, index) => ({
    id: `cc-${String(levelId).padStart(3, "0")}-gate-${index + 1}`,
    ...slot,
    color: target.design_palette[index],
  }));

  const packedBatches = [];
  const assignedColors = new Set();
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
    const batchReservedKey = batchIndex === batches.length - 1 || configuredStagingSkin === "staging"
      ? undefined
      : reservedKey;
    const laterPieceCapacity = batches.slice(batchIndex + 1)
      .reduce((sum, batch) => sum + batch.length, 0);
    const missingFullPalette = baseBodyPalette.filter((color) => !assignedColors.has(color));
    const mandatoryNewColorCount = Math.max(0, missingFullPalette.length - laterPieceCapacity);
    const batchPalette = batchIndex === 0
      ? baseBodyPalette.slice(0, target.opening_color_count)
      : mandatoryNewColorCount > 0
        ? missingFullPalette.slice(0, mandatoryNewColorCount)
        : baseBodyPalette;
    const requireBatchPalette = batchIndex === 0 || mandatoryNewColorCount > 0;
    if (!batchPalette.length || (requireBatchPalette && batches[batchIndex].length < batchPalette.length)) {
      return {
        ok: false,
        levelId,
        phase: "colors",
        reason: `stage ${batchIndex + 1} has ${batches[batchIndex].length} carriers for ${batchPalette.length} required colors`,
        batches,
      };
    }
    let packed;
    let peeled;
    let packReason;
    for (let attempt = 0; attempt < 24; attempt += 1) {
      packed = packBatch({
        pieces: batches[batchIndex],
        points,
        width,
        height,
        reservedKey: batchReservedKey,
        seed: levelId * 1_000_003 + configuredSeedOffset * 104_729 + batchIndex * 10_007 + attempt * 97,
        preferEdges: configuredPackPreferEdges,
      });
      if (!packed.ok) {
        packReason = packed.reason;
        continue;
      }
      peeled = assignColorsAndPeel({
        placements: packed.placements,
        gates,
        palette: batchPalette,
        points,
        width,
        height,
        reservedKey: batchReservedKey,
        levelId,
        batchIndex,
        requireAllColors: requireBatchPalette,
        numericDeadlinePlan: numericDeadlinePlans[batchIndex],
      });
      if (peeled.ok) break;
      if (process.env.FORMAL_DEBUG_LEVEL === String(levelId) && attempt === 0) {
        console.error(JSON.stringify({
          debug_level: levelId,
          batch_index: batchIndex,
          reserved,
          gates,
          placements: packed.placements.map(({ x, y, shapeId, shape }) => ({ x, y, shapeId, shape })),
          peel_reason: peeled.reason,
        }, null, 2));
      }
      packReason = peeled.reason;
    }
    if (!packed?.ok || !peeled?.ok) {
      const replacementMask = proposeReplacementMask({ width, height, cellCount: points.length, batches, levelId });
      return {
        ok: false,
        levelId,
        phase: packed?.ok ? "route" : "packing",
        reason: packReason ?? packed?.reason ?? "packing failed",
        replacementMask,
        batches,
      };
    }
    packedBatches.push(peeled);
    for (const block of peeled.blocks) assignedColors.add(block.color);
  }

  const routeFootprints = new Set();
  for (const batch of packedBatches) {
    for (const drag of batch.route) {
      const block = batch.blocks.find((candidate) => candidate.id === drag.blockId);
      if (!block) continue;
      const origins = [[block.x, block.y], ...drag.path];
      for (const [x, y] of origins) {
        for (const [dx, dy] of block.shape) routeFootprints.add(keyOf(x + dx, y + dy));
      }
    }
  }
  const initialFootprints = new Set(packedBatches.flatMap((batch) => batch.blocks.flatMap((block) => (
    block.shape.map(([dx, dy]) => keyOf(block.x + dx, block.y + dy))
  ))));
  const coverCells = staged
    ? configuredStagingSkin === "staging"
      ? Array.from({ length: batches.length - 1 }, () => [...reserved])
      : [reserved, ...points.filter(([x, y]) => {
        const key = keyOf(x, y);
        return key !== reservedKey && !initialFootprints.has(key) && !routeFootprints.has(key);
      })].slice(0, batches.length - 1)
    : [];
  if (staged && coverCells.length < batches.length - 1) {
    return { ok: false, levelId, phase: "cover-layout", reason: "not enough distinct route-safe cells for staged covers", batches };
  }
  const shutters = staged ? batches.slice(1).map((_, index) => ({
    id: `cc-${String(levelId).padStart(3, "0")}-stage-${index + 2}`,
    x: coverCells[index][0],
    y: coverCells[index][1],
    width: 1,
    height: 1,
    count: batches.slice(0, index + 1).reduce((sum, batch) => sum + batch.length, 0),
    skin: stagedSkinFor(levelId),
  })) : [];
  const blocks = packedBatches.flatMap((batch, batchIndex) => batch.blocks.map((block) => ({
    id: block.id,
    x: block.x,
    y: block.y,
    shape: block.shape,
    color: block.color,
    ...(batchIndex > 0 ? { shutterId: shutters[batchIndex - 1].id } : {}),
  })));
  let route = packedBatches.flatMap((batch) => batch.route);
  let level = {
    id: levelId,
    name: current?.name ?? `竞品同构原创 ${levelId}`,
    difficulty: current?.difficulty ?? "normal",
    timeSeconds: target.time_seconds ?? current?.timeSeconds ?? 180,
    reward: current?.reward ?? 20,
    ...(current?.parMoves !== undefined ? { parMoves: current.parMoves } : {}),
    width,
    height,
    playable: points,
    gates,
    blocks,
    ...(shutters.length ? { shutters } : {}),
  };

  try {
    validateLevel(level);
  } catch (error) {
    return { ok: false, levelId, phase: "validateLevel", reason: error instanceof Error ? error.message : String(error), batches };
  }
  const replayed = replay(level, route);
  if (!replayed.ok) return { ok: false, levelId, phase: "PuzzleModel replay", reason: replayed.error, batches };
  const numericTiming = numericRouteMeetsGeneratorFloor({ level, target, route });
  if (!numericTiming.meetsFloor) {
    return {
      ok: false,
      levelId,
      phase: "numeric-ice-deadline",
      reason: `authored peel route cannot preserve exact numeric carriers: ${JSON.stringify(numericTiming.debts)}`,
      batches,
    };
  }
  const colors = new Set(blocks.map((block) => block.color));
  const openingColors = new Set(packedBatches[0]?.blocks.map((block) => block.color) ?? []);
  const actualShapeHistogram = blocks.reduce((histogram, block) => {
    const shapeId = shapeIdOf(block.shape);
    histogram[shapeId] = (histogram[shapeId] ?? 0) + 1;
    return histogram;
  }, {});
  const initialContractAnalysis = baseContractAnalysis(level, target);
  if (initialContractAnalysis.mismatches.length) {
    return {
      ok: false,
      levelId,
      phase: "contract",
      reason: `generated composition differs from the selected contract: ${JSON.stringify({
        block_count: { expected: target.full_level_block_count, actual: blocks.length },
        shape_histogram: { expected: target.full_level_shape_histogram, actual: actualShapeHistogram },
        opening_color_count: { expected: target.opening_color_count, actual: openingColors.size },
        base_body_color_count: { expected: baseBodyPalette.length, actual: colors.size },
        missing_base_palette_colors: baseBodyPalette.filter((color) => !colors.has(color)),
        deferred_mechanism_palette_colors: initialContractAnalysis.deferredPaletteColors,
        mismatches: initialContractAnalysis.mismatches,
      })}`,
      batches,
    };
  }

  let solver;
  let validationSolverMode = "state_search";
  if (initialContractAnalysis.deferredPaletteColors.length) {
    // These single-stage layouts deliberately reserve a full-palette color for
    // a concealed numeric-ice/shell carrier. The ordinary base solver cannot
    // model that not-yet-installed visibility distinction and can explode its
    // drag frontier on the unused temporary gate. The authored peel route is
    // independently replayed above, so retain it as the base completion
    // witness and defer search to the fully assembled runtime level.
    const clearLoad = level.blocks.reduce((sum, block) => sum + (block.layers?.length ?? 1), 0);
    solver = {
      solved: true,
      minimumDrags: route.length,
      clearLoad,
      repositionOverhead: route.length - clearLoad,
      gridSteps: route.reduce((sum, drag) => sum + drag.path.length, 0),
      turns: 0,
      exploredStates: 0,
      drags: route,
    };
    validationSolverMode = "authored_replay_for_deferred_mechanism_palette";
  } else {
    try {
      solver = solveLevelForValidation(level, configuredValidationCap || (levelId <= 10 ? 80_000 : (staged ? 2_000 : 800)));
    } catch (error) {
      solver = { solved: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
  let generationMode = "contract_pack_with_authored_peel_route";
  let hardSearch;
  if (levelId >= 2) {
    const searchEnabled = hardSearchRequested(levelId)
      && initialContractAnalysis.deferredPaletteColors.length === 0;
    if (staged) {
      const previous = previousHardEntryById.get(levelId);
      if (!strictAcceptance && previous?.route
        && baseContractAnalysis(previous.level, target).mismatches.length === 0
        && replay(previous.level, previous.route).ok
        && numericRouteMeetsGeneratorFloor({ level: previous.level, target, route: previous.route }).meetsFloor) {
        hardSearch = {
          level: previous.level,
          validation: {
            solved: true,
            minimumDrags: previous.validation.validation_solver_drags,
            clearLoad: previous.validation.validation_solver_drags - previous.validation.validation_solver_reposition_overhead,
            repositionOverhead: previous.validation.validation_solver_reposition_overhead,
            gridSteps: previous.route.reduce((sum, drag) => sum + drag.path.length, 0),
            turns: 0,
            exploredStates: previous.validation.validation_solver_explored_states,
            drags: previous.route,
          },
          trial: -2,
          source: "r140_previous_segment",
        };
      }
      const searched = stagedHardCandidateSearch({ entry, baseLevel: level, searchEnabled });
      if (searched && (strictAcceptance || !hardSearch || searched.validation.repositionOverhead > hardSearch.validation.repositionOverhead)) {
        hardSearch = searched;
      }
    } else {
      hardSearch = hardCandidateSearch({ entry, points, pieces, current, baseLevel: level, searchEnabled });
    }
    if (hardSearch && (strictAcceptance || !solver.solved || hardSearch.validation.repositionOverhead > solver.repositionOverhead)) {
      level = hardSearch.level;
      route = hardSearch.validation.drags;
      solver = hardSearch.validation;
      generationMode = hardSearch.source;
    }
  }

  let optimal;
  if (levelId >= 2 && levelId <= 10) {
    try {
      const optimalStateCap = levelId <= 3 || levelId === 5 || levelId === 6 ? 80_000
        : levelId === 4 ? 20_000
          : 8_000;
      optimal = solveLevelOptimally(level, optimalStateCap);
      if (optimal.solved && !replay(level, optimal.drags).ok) {
        optimal = { ...optimal, solved: false, replay_error: "optimal route did not replay" };
      }
    } catch (error) {
      optimal = { solved: false, exploredStates: 0, error: error instanceof Error ? error.message : String(error) };
    }
  }

  const targetD1 = target.target_d1_difficulty.calibrated_score;
  const provenParMoves = optimal?.solved ? optimal.minimumDrags : solver.solved ? solver.minimumDrags : route.length;
  let pacingMapping = "Lv1-Lv3 tutorial pacing preserved";
  let parMovesSource = "tutorial pacing preserved";
  if (levelId >= 4) {
    const pacing = pacingForTarget(target, targetD1);
    level = { ...level, ...pacing, parMoves: provenParMoves };
    pacingMapping = `target D1 ${targetD1} + video timer -> ${pacing.difficulty}/${pacing.timeSeconds}s`;
    parMovesSource = optimal?.solved ? "exact minimum drags" : "replayed validation-route drags";
  }

  const finalContractAnalysis = baseContractAnalysis(level, target);
  if (finalContractAnalysis.mismatches.length) {
    return {
      ok: false,
      levelId,
      phase: "post-search-contract",
      reason: finalContractAnalysis.mismatches.join(","),
      batches,
    };
  }
  const finalNumericTiming = numericRouteMeetsGeneratorFloor({ level, target, route });
  if (!finalNumericTiming.meetsFloor) {
    return {
      ok: false,
      levelId,
      phase: "post-search-numeric-ice-deadline",
      reason: JSON.stringify(finalNumericTiming.debts),
      batches,
    };
  }

  const finalBlocks = level.blocks;
  const finalColors = new Set(finalBlocks.map((block) => block.color));
  const clearLoad = finalBlocks.reduce((sum, block) => sum + (block.layers?.length ?? 1), 0);
  const authoredOverhead = route.length - clearLoad;
  const minimumTarget = target.recommended_minimum_reposition_overhead;
  const rawDifficulty = scoreBlockOutLevel(level);
  const actualD1 = calibratedBlockOutDifficulty(rawDifficulty.score);
  const d1Delta = Number((actualD1 - targetD1).toFixed(2));
  const targetStatus = minimumTarget == null
    ? "not_applicable"
    : (optimal?.solved && optimal.repositionOverhead >= minimumTarget
      ? "proven_minimum_met"
      : (solver.solved && solver.repositionOverhead >= minimumTarget
        ? "validation_route_met_optimal_inconclusive"
        : "not_met"));
  return {
    ok: true,
    level,
    route,
    strictAlternatives: hardSearch?.strictAlternatives ?? [],
    audit: {
      level_id: entry.level_id,
      contract_mask_exact: JSON.stringify(maskRows(width, height, points)) === JSON.stringify(target.board.playable_mask),
      block_count: finalBlocks.length,
      shape_histogram: target.full_level_shape_histogram,
      occupied_cell_count: target.full_level_occupied_cell_count,
      color_count: finalColors.size,
      palette: [...finalColors],
      opening_color_count: finalContractAnalysis.openingPalette.length,
      opening_palette: finalContractAnalysis.openingPalette,
      base_body_color_count: finalContractAnalysis.bodyPalette.length,
      base_body_palette: finalContractAnalysis.bodyPalette,
      deferred_full_palette_colors: finalContractAnalysis.deferredPaletteColors,
      opening_hidden_color_carrier_ids: finalContractAnalysis.openingHiddenColorCarrierIds,
      numeric_ice_contract_mode: finalNumericTiming.mode,
      numeric_ice_carrier_total: finalNumericTiming.total,
      numeric_ice_base_route_feasible: finalNumericTiming.feasible,
      numeric_ice_base_route_debt: finalNumericTiming.debt,
      numeric_ice_generator_feasible_floor: finalNumericTiming.floor,
      numeric_ice_deadline_status: finalNumericTiming.debt === 0
        ? "all_carriers_route_feasible"
        : "maximum_sequential_base_feasibility_with_contract_debt",
      staged_reveal: Boolean(level.shutters?.length),
      stage_count: 1 + (level.shutters?.length ?? 0),
      validate_level: "pass",
      puzzle_model_replay: "pass",
      authored_route_drags: route.length,
      authored_route_clear_load: clearLoad,
      authored_route_reposition_overhead: authoredOverhead,
      validation_solver_solved: Boolean(solver.solved),
      validation_solver_mode: validationSolverMode,
      validation_solver_drags: solver.solved ? solver.minimumDrags : null,
      validation_solver_reposition_overhead: solver.solved ? solver.repositionOverhead : null,
      validation_solver_explored_states: solver.exploredStates ?? null,
      optimal_solver_status: optimal?.solved ? "exact_minimum_proven" : (optimal ? "inconclusive_at_configured_state_cap" : "not_run"),
      optimal_solver_drags: optimal?.solved ? optimal.minimumDrags : null,
      optimal_solver_reposition_overhead: optimal?.solved ? optimal.repositionOverhead : null,
      optimal_solver_explored_states: optimal?.exploredStates ?? null,
      certified_reposition_lower_bound: optimal?.solved ? optimal.repositionOverhead : 0,
      target_reposition_overhead: minimumTarget,
      target_reposition_status: targetStatus,
      target_d1_calibrated_score: targetD1,
      actual_d1_raw_score: rawDifficulty.score,
      actual_d1_calibrated_score: actualD1,
      actual_d1_delta: d1Delta,
      target_d1_status: actualD1 >= targetD1 ? "met_or_above_target" : "below_target",
      pacing_mapping: pacingMapping,
      par_moves: level.parMoves ?? null,
      par_moves_source: parMovesSource,
      actual_d1_components: rawDifficulty.components,
      actual_d1_evidence: rawDifficulty.evidence,
      generation_mode: generationMode,
      hard_search_trial: hardSearch?.trial ?? null,
      staged_cover_cells_distinct: staged
        ? new Set((level.shutters ?? []).map((shutter) => keyOf(shutter.x, shutter.y))).size === (level.shutters ?? []).length
        : null,
      staged_skin: staged ? [...new Set((level.shutters ?? []).map((shutter) => shutter.skin ?? "shutter"))] : [],
      staging_skin_status: [17, 28].includes(levelId)
        ? ((level.shutters ?? []).every((shutter) => shutter.skin === "staging")
          ? "supported_internal_staging_skin"
          : "BLOCKED: Lv17/Lv28 must use internal staging skin")
        : "not_applicable_or_supported",
      mechanics_port_status: staged
        ? "contract-required staged covers only; current authored devices deferred"
        : "current authored devices deferred",
    },
  };
};

const results = [];
await mkdir(strictAcceptance ? strictOutputDir : reportDir, { recursive: true });
const contractEntriesToGenerate = strictAcceptance
  ? contract.levels.filter((entry) => requestedHardIds.has(Number(entry.level_id.slice(2))))
  : requestedGenerationIds.size
    ? contract.levels.filter((entry) => requestedGenerationIds.has(Number(entry.level_id.slice(2))))
    : contract.levels;
for (const entry of contractEntriesToGenerate) {
  const generated = generateLevel(entry);
  results.push(generated);
  if (!generated.ok) {
    console.error(`${entry.level_id} generation failed at ${generated.phase}: ${generated.reason}`);
  }
  if (!strictAcceptance && results.length % 10 === 0) {
    const checkpoint = {
      generated_on: new Date().toISOString(),
      processed_through: entry.level_id,
      successes: results.filter((result) => result.ok).map((result) => ({
        level_id: result.audit.level_id,
        audit: result.audit,
        level: result.level,
        route: result.route,
      })),
      failures: results.filter((result) => !result.ok).map((result) => ({
        levelId: result.levelId,
        phase: result.phase,
        reason: result.reason,
        replacementMask: result.replacementMask ?? null,
      })),
    };
    await writeFile(resolve(reportDir, `generation-checkpoint-${hardSearchRangeLabel}.json`), `${JSON.stringify(checkpoint, null, 2)}\n`, "utf8");
  }
}
const successes = results.filter((result) => result.ok);
const failures = results.filter((result) => !result.ok);
const generatedLevels = successes.map((result) => result.level);
const failureRecords = failures.map((failure) => ({
  levelId: failure.levelId,
  phase: failure.phase,
  reason: failure.reason,
  replacementMask: failure.replacementMask ?? null,
}));

const normalizeStrictAlternative = (baseResult, alternative) => {
  const level = structuredClone(alternative.level);
  const levelId = level.id;
  const target = contract.levels[levelId - 1].our_design_target;
  const targetD1 = target.target_d1_difficulty.calibrated_score;
  let pacingMapping = "Lv1-Lv3 tutorial pacing preserved";
  let parMovesSource = "tutorial pacing preserved";
  level.timeSeconds = target.time_seconds ?? level.timeSeconds;
  if (levelId >= 4) {
    const pacing = pacingForTarget(target, targetD1);
    Object.assign(level, pacing, { parMoves: alternative.validation.minimumDrags });
    pacingMapping = `target D1 ${targetD1} + video timer -> ${pacing.difficulty}/${pacing.timeSeconds}s`;
    parMovesSource = "replayed validation-route drags";
  }
  validateLevel(level);
  const replayed = replay(level, alternative.validation.drags);
  if (!replayed.ok) throw new Error(`Strict alternative replay failed at Lv${levelId}: ${replayed.error}`);
  const finalColors = new Set(level.blocks.map((block) => block.color));
  const clearLoad = level.blocks.reduce((sum, block) => sum + (block.layers?.length ?? 1), 0);
  const rawDifficulty = scoreBlockOutLevel(level);
  const actualD1 = calibratedBlockOutDifficulty(rawDifficulty.score);
  const minimumTarget = target.recommended_minimum_reposition_overhead;
  const exact = alternative.exact;
  const targetStatus = minimumTarget == null
    ? "not_applicable"
    : exact?.solved && exact.repositionOverhead >= minimumTarget
      ? "proven_minimum_met"
      : alternative.validation.repositionOverhead >= minimumTarget
        ? "validation_route_met_optimal_inconclusive"
        : "not_met";
  return {
    ok: true,
    level,
    route: alternative.validation.drags,
    strictAlternatives: [],
    audit: {
      ...baseResult.audit,
      level_id: `Lv${String(levelId).padStart(3, "0")}`,
      contract_mask_exact: sameMask(level, target.board.playable_mask),
      block_count: level.blocks.length,
      shape_histogram: target.full_level_shape_histogram,
      occupied_cell_count: level.blocks.reduce((sum, block) => sum + block.shape.length, 0),
      color_count: finalColors.size,
      palette: [...finalColors],
      validate_level: "pass",
      puzzle_model_replay: "pass",
      authored_route_drags: alternative.validation.drags.length,
      authored_route_clear_load: clearLoad,
      authored_route_reposition_overhead: alternative.validation.drags.length - clearLoad,
      validation_solver_solved: true,
      validation_solver_drags: alternative.validation.minimumDrags,
      validation_solver_reposition_overhead: alternative.validation.repositionOverhead,
      validation_solver_explored_states: alternative.validation.exploredStates,
      optimal_solver_status: exact?.solved ? "exact_minimum_proven" : "not_run",
      optimal_solver_drags: exact?.solved ? exact.minimumDrags : null,
      optimal_solver_reposition_overhead: exact?.solved ? exact.repositionOverhead : null,
      optimal_solver_explored_states: exact?.exploredStates ?? null,
      certified_reposition_lower_bound: exact?.solved ? exact.repositionOverhead : 0,
      target_reposition_overhead: minimumTarget,
      target_reposition_status: targetStatus,
      target_d1_calibrated_score: targetD1,
      actual_d1_raw_score: rawDifficulty.score,
      actual_d1_calibrated_score: actualD1,
      actual_d1_delta: Number((actualD1 - targetD1).toFixed(2)),
      target_d1_status: actualD1 >= targetD1 ? "met_or_above_target" : "below_target",
      pacing_mapping: pacingMapping,
      par_moves: level.parMoves ?? null,
      par_moves_source: parMovesSource,
      actual_d1_components: rawDifficulty.components,
      actual_d1_evidence: rawDifficulty.evidence,
      generation_mode: alternative.source,
      hard_search_trial: alternative.trial,
    },
  };
};

const strictContractMismatches = (level, target) => {
  return baseContractAnalysis(level, target).mismatches;
};

const routeSummary = (route) => ({
  actions: route.length,
  exits: route.filter((drag) => Boolean(drag.exitSide)).length,
  repositions: route.filter((drag) => !drag.exitSide).length,
  grid_steps: route.reduce((sum, drag) => sum + drag.path.length, 0),
});

const sequentialStageProofPlan = (result) => {
  if (!strictStageDecomposition) return undefined;
  const level = result.level;
  const shutters = level.shutters ?? [];
  if (shutters.length !== 1 || level.elevators?.length || level.conveyors?.length) return undefined;
  if (level.gates.some((gate) => (gate.frozen ?? 0) > 0 || gate.star)) return undefined;
  if (level.blocks.some((block) => (block.frozen ?? 0) > 0 || block.star || (block.layers?.length ?? 1) !== 1)) return undefined;

  const [shutter] = shutters;
  const initialBlocks = level.blocks.filter((block) => !block.shutterId);
  const stagedBlocks = level.blocks.filter((block) => block.shutterId === shutter.id);
  if (!initialBlocks.length || !stagedBlocks.length || initialBlocks.length + stagedBlocks.length !== level.blocks.length) return undefined;
  if (shutter.count !== initialBlocks.length) return undefined;

  const initialIds = new Set(initialBlocks.map((block) => block.id));
  const stagedIds = new Set(stagedBlocks.map((block) => block.id));
  const routes = [[], []];
  let phase = 0;
  for (const drag of result.route) {
    if (initialIds.has(drag.blockId)) {
      if (phase !== 0) return undefined;
      routes[0].push(drag);
    } else if (stagedIds.has(drag.blockId)) {
      phase = 1;
      routes[1].push(drag);
    } else {
      return undefined;
    }
  }

  const baseBlocked = level.blocked ?? [];
  const shutterCells = [];
  for (let y = shutter.y; y < shutter.y + shutter.height; y += 1) {
    for (let x = shutter.x; x < shutter.x + shutter.width; x += 1) shutterCells.push([x, y]);
  }
  const uniqueBlocked = (points) => [...new Map(points.map(([x, y]) => [keyOf(x, y), [x, y]])).values()];
  const makeStage = (blocks, blocked, name) => {
    const stage = structuredClone(level);
    stage.name = `${level.name} ${name}`;
    stage.blocks = blocks.map((block) => {
      const copy = structuredClone(block);
      delete copy.shutterId;
      return copy;
    });
    if (blocked.length) stage.blocked = uniqueBlocked(blocked);
    else delete stage.blocked;
    delete stage.shutters;
    delete stage.elevators;
    delete stage.conveyors;
    delete stage.designTargets;
    delete stage.onboardingHint;
    delete stage.strategyNudge;
    return stage;
  };
  const stages = [
    { level: makeStage(initialBlocks, [...baseBlocked, ...shutterCells], "strict stage 1"), route: routes[0] },
    { level: makeStage(stagedBlocks, baseBlocked, "strict stage 2"), route: routes[1] },
  ];
  for (const stage of stages) {
    try { validateLevel(stage.level); } catch { return undefined; }
    if (!replay(stage.level, stage.route).ok) return undefined;
    stage.route_metrics = routeSummary(stage.route);
  }

  const target = result.audit.target_reposition_overhead;
  const totalWitnessOverhead = stages.reduce((sum, stage) => sum + stage.route_metrics.repositions, 0);
  if (!Number.isSafeInteger(target) || target <= 0 || totalWitnessOverhead < target) return undefined;
  const lower = Math.max(0, target - stages[1].route_metrics.repositions);
  const upper = Math.min(target, stages[0].route_metrics.repositions);
  if (lower > upper) return undefined;
  const proportional = Math.round(target * stages[0].route_metrics.repositions / totalWitnessOverhead) + strictStageSplitBias;
  const firstTarget = Math.max(lower, Math.min(upper, proportional));
  stages[0].target = firstTarget;
  stages[1].target = target - firstTarget;
  return {
    stages,
    target,
    total_witness_overhead: totalWitnessOverhead,
    conditions: {
      single_sequential_shutter: true,
      shutter_release_equals_initial_clear_load: true,
      deterministic_empty_boundary_between_stages: true,
      no_counter_or_dynamic_mechanism_carries_across_boundary: true,
      additive_cost: "reposition actions are counted independently before and after the deterministic empty-board stage boundary",
    },
  };
};

const runSequentialStageProof = async ({ result, preparedCandidate, attemptedOn, strictRunLabel, candidateReportTag, inputPath, witnessPath }) => {
  const plan = sequentialStageProofPlan(result);
  if (!plan || plan.stages.some((stage) => stage.target <= 0)) return undefined;
  const candidateTag = sha256(JSON.stringify(result.level)).slice(0, 12);
  const artifactCache = new Map();
  const runStageFloor = async (index, targetFloor) => {
    const cacheKey = `${index}:${targetFloor}`;
    if (artifactCache.has(cacheKey)) return artifactCache.get(cacheKey);
    const reusable = [...artifactCache.values()].find((artifact) => artifact.stage === index + 1
      && ((artifact.decision.accepted && artifact.target_reposition_overhead >= targetFloor)
        || (artifact.proof_entry?.proof?.floor_disproven === true
          && artifact.proof_entry.proof.counterexample_reposition_overhead < targetFloor)));
    if (reusable) return reusable;
    const stage = plan.stages[index];
    const stageNumber = index + 1;
    const stageTag = `${candidateReportTag}-stage-${stageNumber}-floor-${targetFloor}`;
    const stageInputPath = resolve(strictOutputDir, `strict-stage-proof-input-${strictRunLabel}-${candidateTag}-s${stageNumber}-floor-${targetFloor}.json`);
    const stageWitnessPath = resolve(strictOutputDir, `strict-stage-proof-witness-${strictRunLabel}-${candidateTag}-s${stageNumber}-floor-${targetFloor}.json`);
    const stageCandidate = {
      ...preparedCandidate,
      target: {
        ...preparedCandidate.target,
        recommended_minimum_reposition_overhead: targetFloor,
      },
      audit: {
        ...preparedCandidate.audit,
        target_reposition_overhead: targetFloor,
        staged_decomposition_component: stageNumber,
      },
      level: stage.level,
      route: stage.route,
    };
    await Promise.all([
      writeFile(stageInputPath, `${JSON.stringify({
        title: `Strict sequential-stage proof component ${stageNumber}; acceptance requires every component certificate`,
        generated_on: attemptedOn,
        candidate_layer: "base-sequential-stage-component",
        applied_to_live_campaign: false,
        levels: [stageCandidate],
      }, null, 2)}\n`, "utf8"),
      writeFile(stageWitnessPath, `${JSON.stringify([{
        level_id: preparedCandidate.level_id,
        drags: stage.route,
      }], null, 2)}\n`, "utf8"),
    ]);
    const artifact = await runStrictProofArtifact({
      inputPath: stageInputPath,
      witnessPath: stageWitnessPath,
      reportTag: stageTag,
      levelId: result.level.id,
    });
    const proofReportBytes = artifact.proofReportPath ? await readFile(artifact.proofReportPath) : undefined;
    const decision = classifyStrictProof(artifact.proofEntry);
    const stageArtifact = {
      stage: stageNumber,
      target_reposition_overhead: targetFloor,
      validation_witness_metrics: stage.route_metrics,
      level_spec_sha256: sha256(JSON.stringify(stage.level)),
      proof_input_sha256: artifact.proofReport?.input_sha256 ?? null,
      witness_input_sha256: artifact.proofReport?.witness_input_sha256 ?? null,
      level_solver_sha256: artifact.proofReport?.level_solver_sha256 ?? null,
      proof_report_sha256: proofReportBytes ? sha256(proofReportBytes) : null,
      proof_report: relative(root, artifact.proofReportPath).replaceAll("\\", "/"),
      proof_entry: artifact.proofEntry,
      decision,
    };
    artifactCache.set(cacheKey, stageArtifact);
    if (typeof global.gc === "function") global.gc();
    return stageArtifact;
  };

  const firstLower = Math.max(1, plan.target - plan.stages[1].route_metrics.repositions);
  const firstUpper = Math.min(plan.target - 1, plan.stages[0].route_metrics.repositions);
  const splitFloors = Array.from({ length: Math.max(0, firstUpper - firstLower + 1) }, (_, index) => firstLower + index)
    .sort((left, right) => Math.abs(left - plan.stages[0].target) - Math.abs(right - plan.stages[0].target)
      || left - right);
  if (!splitFloors.length) return undefined;
  const splitAttempts = [];
  let selectedStageArtifacts;
  const stageUpperBounds = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY];
  const disproofArtifacts = [undefined, undefined];
  for (const firstFloor of splitFloors) {
    const floors = [firstFloor, plan.target - firstFloor];
    const artifacts = [
      await runStageFloor(0, floors[0]),
      await runStageFloor(1, floors[1]),
    ];
    const accepted = artifacts.every((artifact) => artifact.decision.accepted);
    splitAttempts.push({ floors, accepted, artifacts });
    if (accepted) {
      selectedStageArtifacts = artifacts;
      break;
    }
    for (let index = 0; index < artifacts.length; index += 1) {
      const counterexample = artifacts[index].proof_entry?.proof?.counterexample_reposition_overhead;
      if (Number.isSafeInteger(counterexample) && counterexample < stageUpperBounds[index]) {
        stageUpperBounds[index] = counterexample;
        disproofArtifacts[index] = artifacts[index];
      }
    }
    const strongest = [1, 2].map((stageNumber) => [...artifactCache.values()]
      .filter((artifact) => artifact.stage === stageNumber && artifact.decision.accepted)
      .sort((left, right) => right.target_reposition_overhead - left.target_reposition_overhead)[0]);
    if (strongest.every(Boolean)
      && strongest.reduce((sum, artifact) => sum + artifact.target_reposition_overhead, 0) >= plan.target) {
      selectedStageArtifacts = strongest;
      break;
    }
    if (stageUpperBounds.every(Number.isFinite)
      && stageUpperBounds.reduce((sum, upperBound) => sum + upperBound, 0) < plan.target) break;
    const firstInconclusive = artifacts[0].decision.status === "rejected_inconclusive";
    const secondInconclusive = artifacts[1].decision.status === "rejected_inconclusive";
    if ((firstInconclusive && firstFloor === firstLower)
      || (secondInconclusive && firstFloor === firstUpper)) break;
  }

  const fullReplay = replay(result.level, result.route);
  let fullCounterexample;
  if (disproofArtifacts.every(Boolean)) {
    const route = disproofArtifacts.flatMap((artifact) => artifact.proof_entry.selected_solution_witness?.drags ?? []);
    const metrics = routeSummary(route);
    const replayed = replay(result.level, route);
    if (replayed.ok && metrics.repositions < plan.target) fullCounterexample = { route, metrics, replayed };
  }
  const allProofArtifacts = [...artifactCache.values()];
  const stageArtifacts = selectedStageArtifacts ?? splitAttempts[0].artifacts;
  const allCertified = fullReplay.ok && Boolean(selectedStageArtifacts);
  const strongestCertifiedByStage = [1, 2].map((stageNumber) => Math.max(0, ...allProofArtifacts
    .filter((artifact) => artifact.stage === stageNumber && artifact.decision.accepted)
    .map((artifact) => artifact.target_reposition_overhead)));
  const certifiedLowerBound = allCertified ? plan.target : strongestCertifiedByStage.reduce((sum, floor) => sum + floor, 0);
  const exploredStates = stageArtifacts.reduce((sum, artifact) => sum + (artifact.proof_entry?.proof?.explored_states ?? 0), 0);
  const totalExploredStates = allProofArtifacts.reduce((sum, artifact) => sum + (artifact.proof_entry?.proof?.explored_states ?? 0), 0);
  const peakRssMb = Math.max(0, ...allProofArtifacts.map((artifact) => artifact.proof_entry?.proof?.peak_rss_mb ?? 0));
  const fullRouteMetrics = routeSummary(result.route);
  const proofEntry = {
    level_id: preparedCandidate.level_id,
    available: true,
    target_reposition_overhead: plan.target,
    proof: {
      algorithm: "sequential-stage-additive-bounded-dfs",
      status: allCertified
        ? "floor_lower_bound_proven_by_sequential_stage_addition"
        : fullCounterexample
          ? "floor_disproven_by_sequential_stage_counterexamples"
        : (allProofArtifacts.some((artifact) => artifact.decision.status === "rejected_floor_disproven")
          ? "stage_component_floor_disproven"
          : "stage_component_inconclusive"),
      target_reposition_overhead: plan.target,
      searched_reposition_budget: plan.target - 1,
      exact_minimum_reposition_overhead: allCertified && plan.total_witness_overhead === plan.target ? plan.target : null,
      counterexample_reposition_overhead: fullCounterexample?.metrics.repositions ?? null,
      lower_bound_statement_proven: allCertified,
      lower_bound_proven_at_states: allCertified ? exploredStates : null,
      floor_disproven: Boolean(fullCounterexample),
      graph_exhausted: allCertified,
      halt_reason: allCertified
        ? "all_sequential_stage_lower_bounds_certified_and_summed"
        : "one_or_more_sequential_stage_proofs_rejected",
      explored_states: exploredStates,
      total_component_proof_states_across_split_attempts: totalExploredStates,
      peak_rss_mb: peakRssMb,
      certified_additive_lower_bound: certifiedLowerBound,
      stage_components: stageArtifacts.map((artifact) => ({
        stage: artifact.stage,
        target_reposition_overhead: artifact.target_reposition_overhead,
        level_spec_sha256: artifact.level_spec_sha256,
        proof_status: artifact.proof_entry?.proof?.status ?? "missing",
        lower_bound_statement_proven: artifact.proof_entry?.proof?.lower_bound_statement_proven === true,
        explored_states: artifact.proof_entry?.proof?.explored_states ?? 0,
        proof_report: artifact.proof_report,
        proof_report_sha256: artifact.proof_report_sha256,
      })),
      stage_split_attempts: splitAttempts.map((attempt) => ({
        floors: attempt.floors,
        accepted: attempt.accepted,
        component_statuses: attempt.artifacts.map((artifact) => artifact.proof_entry?.proof?.status ?? "missing"),
      })),
      route: fullCounterexample ? { metrics: fullCounterexample.metrics, drags: fullCounterexample.route } : null,
      replay: fullCounterexample ? {
        replayed: true,
        complete: true,
        failed_at: null,
        reason: null,
      } : null,
    },
    official_optimal_crosscheck: {
      solved: null,
      exact_minimum_reposition_overhead: null,
      minimum_drags: null,
      clear_load: null,
      explored_states: 0,
      cap: 0,
      termination: "not_run_sequential_stage_additive_certificate",
      route: null,
      replay: null,
      elapsed_ms: 0,
    },
    authored_solution_witness: {
      available: true,
      route: { metrics: fullRouteMetrics, drags: result.route },
      replay: {
        replayed: fullReplay.ok,
        complete: fullReplay.ok,
        failed_at: fullReplay.ok ? null : 0,
        reason: fullReplay.ok ? null : fullReplay.error,
      },
    },
    validation_solution_witness: {
      solved: null,
      route_reposition_overhead: null,
      drags: null,
      clear_load: null,
      explored_states: 0,
      cap: 0,
      termination: "not_run_replayed_authored_witness_available",
      route: null,
      replay: null,
      elapsed_ms: 0,
    },
    selected_solution_witness: {
      source: fullCounterexample ? "sequential_stage_counterexample" : "authored_validation_route",
      metrics: fullCounterexample?.metrics ?? fullRouteMetrics,
      drags: fullCounterexample?.route ?? result.route,
      replay: {
        replayed: fullCounterexample ? true : fullReplay.ok,
        complete: fullCounterexample ? true : fullReplay.ok,
        failed_at: fullCounterexample || fullReplay.ok ? null : 0,
        reason: fullCounterexample || fullReplay.ok ? null : fullReplay.error,
      },
    },
    crosscheck: {
      mismatch: false,
      note: "The full route is replayed independently; the lower bound is the sum of two separately certified sequential stage bounds.",
    },
    certification: {
      lower_bound_only: allCertified,
      has_authoritative_replayed_solution_witness: fullReplay.ok,
      target_floor_certified_for_playable_level: allCertified,
      note: allCertified
        ? "Each sequential stage excludes every completion below its assigned floor; the deterministic empty-board boundary makes the stage costs additive, and the full completion route replays through PuzzleModel."
        : "At least one sequential stage proof was disproven or inconclusive; the full candidate is rejected.",
    },
  };
  const fullInputBytes = await readFile(inputPath);
  const fullWitnessBytes = await readFile(witnessPath);
  const solverHashes = [...new Set(allProofArtifacts.map((artifact) => artifact.level_solver_sha256).filter(Boolean))];
  const proofReportPath = resolve(reportDir, `reposition-lower-bound-report-${candidateReportTag}-lv${String(result.level.id).padStart(3, "0")}.json`);
  const proofReport = {
    title: "Sequential-stage additive necessary reposition lower-bound proof",
    generated_on: new Date().toISOString(),
    input: relative(root, inputPath).replaceAll("\\", "/"),
    input_sha256: sha256(fullInputBytes),
    witness_input: relative(root, witnessPath).replaceAll("\\", "/"),
    witness_input_sha256: sha256(fullWitnessBytes),
    level_solver_sha256: solverHashes.length === 1 ? solverHashes[0] : null,
    stage_decomposition: {
      candidate_level_spec_sha256: sha256(JSON.stringify(result.level)),
      target_reposition_overhead: plan.target,
      certified_additive_lower_bound: certifiedLowerBound,
      conditions: plan.conditions,
      components: stageArtifacts.map((artifact) => ({
        stage: artifact.stage,
        target_reposition_overhead: artifact.target_reposition_overhead,
        validation_witness_metrics: artifact.validation_witness_metrics,
        level_spec_sha256: artifact.level_spec_sha256,
        proof_input_sha256: artifact.proof_input_sha256,
        witness_input_sha256: artifact.witness_input_sha256,
        level_solver_sha256: artifact.level_solver_sha256,
        proof_report: artifact.proof_report,
        proof_report_sha256: artifact.proof_report_sha256,
        proof_status: artifact.proof_entry?.proof?.status ?? "missing",
        witness_replayed: artifact.proof_entry?.selected_solution_witness?.replay?.replayed === true,
        decision: artifact.decision.status,
      })),
      split_attempts: splitAttempts.map((attempt) => ({
        floors: attempt.floors,
        accepted: attempt.accepted,
        components: attempt.artifacts.map((artifact) => ({
          stage: artifact.stage,
          target_reposition_overhead: artifact.target_reposition_overhead,
          level_spec_sha256: artifact.level_spec_sha256,
          proof_input_sha256: artifact.proof_input_sha256,
          witness_input_sha256: artifact.witness_input_sha256,
          level_solver_sha256: artifact.level_solver_sha256,
          proof_report: artifact.proof_report,
          proof_report_sha256: artifact.proof_report_sha256,
          proof_status: artifact.proof_entry?.proof?.status ?? "missing",
          witness_replayed: artifact.proof_entry?.selected_solution_witness?.replay?.replayed === true,
          decision: artifact.decision.status,
        })),
      })),
    },
    reports: [proofEntry],
  };
  await writeFile(proofReportPath, `${JSON.stringify(proofReport, null, 2)}\n`, "utf8");
  console.error(`${preparedCandidate.level_id}: sequential stage proof=${proofEntry.proof.status}, lowerBound=${certifiedLowerBound}/${plan.target}, states=${exploredStates}, peakRSS=${peakRssMb}MB`);
  return { proofReportPath, proofReport, proofEntry };
};

const runStrictAcceptance = async () => {
  assertStrictClassifierSelfTest();
  const attemptedOn = new Date().toISOString();
  const strictRunLabel = `${hardSearchRangeLabel}-seed-${configuredSeedOffset}-trials-${configuredTrials || "default"}-repack-${repackHardSearch ? 1 : 0}-freeze-${strictFreezeVariantBudget}-offset-${strictProofCandidateOffset}-stage-bias-${strictStageSplitBias}-relaxed-${strictProofRelaxedBound ? 1 : 0}-symmetry-${strictProofSymmetryReduction ? 1 : 0}`;
  const reportTag = `strict-generator-${strictRunLabel}`;
  const batchInputPath = resolve(strictOutputDir, `strict-attempt-candidates-${strictRunLabel}.json`);
  const proofCandidateResults = successes.flatMap((result) => {
    const alternatives = (result.strictAlternatives ?? []).map((alternative) => normalizeStrictAlternative(result, alternative));
    return alternatives.length ? alternatives.slice(strictProofCandidateOffset) : (strictProofCandidateOffset ? [] : [result]);
  });
  const preparedCandidates = proofCandidateResults.map((result) => {
    const target = contract.levels[result.level.id - 1].our_design_target;
    return {
      result,
      contract_mismatches: strictContractMismatches(result.level, target),
      candidate: {
        level_id: result.audit.level_id,
        target,
        audit: result.audit,
        level: result.level,
        route: result.route,
      },
    };
  });
  await writeFile(batchInputPath, `${JSON.stringify({
    title: "Strict acceptance batch checkpoint; candidates remain unaccepted until their individual proof passes",
    generated_on: attemptedOn,
    candidate_layer: "base",
    applied_to_live_campaign: false,
    levels: preparedCandidates.map((entry) => ({
      ...entry.candidate,
      contract_mismatches: entry.contract_mismatches,
    })),
  }, null, 2)}\n`, "utf8");

  const decisions = [];
  const acceptedInCurrentRun = new Set();
  for (const prepared of preparedCandidates) {
    const { result } = prepared;
    const id = result.level.id;
    const levelId = `Lv${String(id).padStart(3, "0")}`;
    const candidateHash = sha256(JSON.stringify(result.level));
    const attemptId = `${strictRunLabel}-${levelId}-${candidateHash.slice(0, 16)}`;
    if (acceptedInCurrentRun.has(levelId)) continue;
    if (prepared.contract_mismatches.length) {
      decisions.push({
        attempt_id: attemptId,
        attempted_on: attemptedOn,
        level_id: levelId,
        candidate_sha256: candidateHash,
        target_reposition_overhead: result.audit.target_reposition_overhead,
        validation_route_reposition_overhead: result.audit.validation_solver_reposition_overhead,
        playability_witness_replayed: result.audit.puzzle_model_replay === "pass",
        decision: "rejected_contract_mismatch",
        accepted: false,
        contract_mismatches: prepared.contract_mismatches,
        proof_report: null,
        proof: null,
        attempted_candidate: prepared.candidate,
      });
      continue;
    }
    const candidateTag = candidateHash.slice(0, 12);
    const candidateReportTag = `${reportTag}-${candidateTag}`;
    const inputPath = resolve(strictOutputDir, `strict-proof-input-${strictRunLabel}-${candidateTag}.json`);
    const witnessPath = resolve(strictOutputDir, `strict-proof-witness-${strictRunLabel}-${candidateTag}.json`);
    await Promise.all([
      writeFile(inputPath, `${JSON.stringify({
        title: "Single strict proof candidate; not accepted until proof passes",
        generated_on: attemptedOn,
        candidate_layer: "base",
        applied_to_live_campaign: false,
        levels: [prepared.candidate],
      }, null, 2)}\n`, "utf8"),
      writeFile(witnessPath, `${JSON.stringify([{
        level_id: levelId,
        drags: prepared.candidate.route,
      }], null, 2)}\n`, "utf8"),
    ]);
    const proofArtifact = await runSequentialStageProof({
      result,
      preparedCandidate: prepared.candidate,
      attemptedOn,
      strictRunLabel,
      candidateReportTag,
      inputPath,
      witnessPath,
    }) ?? await runStrictProofArtifact({
      inputPath,
      witnessPath,
      reportTag: candidateReportTag,
      levelId: id,
    });
    const { proofReportPath, proofReport, proofEntry } = proofArtifact;
    const decision = classifyStrictProof(proofEntry);
    decisions.push({
      attempt_id: attemptId,
      attempted_on: attemptedOn,
      level_id: levelId,
      candidate_sha256: candidateHash,
      target_reposition_overhead: result.audit.target_reposition_overhead,
      validation_route_reposition_overhead: result.audit.validation_solver_reposition_overhead,
      playability_witness_replayed: result.audit.puzzle_model_replay === "pass",
      decision: decision.status,
      accepted: decision.accepted,
      proof_report: relative(root, proofReportPath).replaceAll("\\", "/"),
      proof_input_sha256: proofReport?.input_sha256 ?? null,
      witness_input_sha256: proofReport?.witness_input_sha256 ?? null,
      level_solver_sha256: proofReport?.level_solver_sha256 ?? null,
      proof: proofEntry,
      attempted_candidate: prepared.candidate,
    });
    if (decision.accepted) acceptedInCurrentRun.add(levelId);
    if (typeof global.gc === "function") global.gc();
  }

  const acceptedPath = resolve(strictOutputDir, "strict-accepted-candidates.json");
  const latestAttemptsPath = resolve(strictOutputDir, "strict-latest-attempts.json");
  const attemptHistoryPath = resolve(strictOutputDir, "strict-attempt-history.json");
  const rejectedPath = resolve(strictOutputDir, "strict-rejected-attempts.json");
  const auditPath = resolve(strictOutputDir, "strict-acceptance-audit.json");
  const previousAccepted = await readJsonOr(acceptedPath, { levels: [] });
  const previousAttempts = await readJsonOr(latestAttemptsPath, { attempts: [] });
  const previousHistory = await readJsonOr(attemptHistoryPath, { attempts: [] });
  const acceptedById = new Map((previousAccepted.levels ?? []).map((entry) => [entry.level_id, entry]));
  const attemptsById = new Map((previousAttempts.attempts ?? []).map((entry) => [entry.level_id, entry]));
  const historyById = new Map((previousHistory.attempts ?? []).map((entry) => [entry.attempt_id, entry]));
  for (const accepted of acceptedById.values()) {
    if (accepted.strict_acceptance?.proof_input_sha256 || !accepted.strict_acceptance?.proof_report) continue;
    const archivedProof = await readJsonOr(resolve(root, accepted.strict_acceptance.proof_report), null);
    if (!archivedProof) continue;
    accepted.strict_acceptance.proof_input_sha256 = archivedProof.input_sha256 ?? null;
    accepted.strict_acceptance.witness_input_sha256 = archivedProof.witness_input_sha256 ?? null;
    accepted.strict_acceptance.level_solver_sha256 = archivedProof.level_solver_sha256 ?? null;
  }
  for (const decision of decisions) {
    attemptsById.set(decision.level_id, decision);
    historyById.set(decision.attempt_id, decision);
    if (decision.accepted) {
      acceptedById.set(decision.level_id, {
        ...decision.attempted_candidate,
        strict_acceptance: {
          status: decision.decision,
          candidate_sha256: decision.candidate_sha256,
          proof_report: decision.proof_report,
          proof_input_sha256: decision.proof_input_sha256,
          witness_input_sha256: decision.witness_input_sha256,
          level_solver_sha256: decision.level_solver_sha256,
          proof: decision.proof,
        },
      });
    }
  }
  const acceptedLevels = [...acceptedById.values()].sort((left, right) => left.level.id - right.level.id);
  const latestAttempts = [...attemptsById.values()].sort((left, right) => left.level_id.localeCompare(right.level_id));
  const attemptHistory = [...historyById.values()].sort((left, right) => left.attempted_on.localeCompare(right.attempted_on)
    || left.level_id.localeCompare(right.level_id));
  const rejectedAttempts = latestAttempts.filter((entry) => !entry.accepted);
  const requested = [...requestedHardIds].sort((left, right) => left - right).map((id) => `Lv${String(id).padStart(3, "0")}`);
  const currentRejected = decisions.filter((entry) => !entry.accepted);
  const currentAcceptedLevelIds = new Set(decisions.filter((entry) => entry.accepted).map((entry) => entry.level_id));
  const currentUnresolvedLevels = requested.filter((levelId) => !currentAcceptedLevelIds.has(levelId));
  const currentStatus = failureRecords.length || currentUnresolvedLevels.length
    ? "strict_incremental_run_rejected"
    : "strict_incremental_run_accepted";
  const generatedOn = new Date().toISOString();
  const strictAudit = {
    title: "Competitor-constrained strict lower-bound acceptance audit",
    generated_on: generatedOn,
    status: currentStatus,
    run_label: strictRunLabel,
    canonical_outputs_written: false,
    applied_to_live_campaign: false,
    requested_levels: requested,
    source_contract: { path: contractRelative, sha256: sha256(contractText) },
    parameters: {
      algorithm: "bounded-dfs",
      proof_max_states: strictProofMaxStates,
      proof_max_memory_mb: strictProofMaxMemoryMb,
      transposition_cap: strictProofTranspositionCap,
      one_proof_child_process_per_level: true,
      generation_seed_offset: configuredSeedOffset,
      generation_trials: configuredTrials || "generator_default",
      proof_candidate_offset: strictProofCandidateOffset,
      sequential_stage_split_bias: strictStageSplitBias,
      repack_search: repackHardSearch,
      freeze_variant_budget: strictFreezeVariantBudget,
      relaxed_bound_pruning: strictProofRelaxedBound,
      relaxed_bound_max_states: strictProofRelaxedMaxStates,
      symmetry_reduction: strictProofSymmetryReduction,
      sequential_stage_decomposition: strictStageDecomposition,
    },
    rules: {
      acceptance: "Accept only when bounded lower-bound proof excludes every completion below target and a completion witness replays through PuzzleModel.",
      validation_route: "A high-overhead validation route is a playability witness only and never satisfies the floor by itself.",
      rejection: "Counterexample, state/memory-cap inconclusive, missing proof, and missing replayed completion witness are all rejected.",
      exact_locks: ["rows", "cols", "playable_mask", "block_count", "shape_histogram", "occupied_cell_count", "color_count", "palette"],
      incremental: "FORMAL_LEVEL_IDS selects a bounded delta. Accepted candidates persist; a later rejected attempt never replaces a previously certified candidate.",
      sequential_stage_addition: "A single-shutter candidate may use additive component proofs only when the first stage fully clears to a deterministic empty board, no counter or dynamic mechanism carries state across the boundary, both stage witnesses replay, and both bounded-DFS component floors certify.",
    },
    current_run: {
      generated_candidates: successes.length,
      generation_failures: failureRecords.length,
      strict_accepted_levels: currentAcceptedLevelIds.size,
      strict_unresolved_levels: currentUnresolvedLevels,
      strict_rejected_attempts: currentRejected.length,
      rejected_contract_mismatch: currentRejected.filter((entry) => entry.decision === "rejected_contract_mismatch").length,
      rejected_floor_disproven: currentRejected.filter((entry) => entry.decision === "rejected_floor_disproven").length,
      rejected_inconclusive: currentRejected.filter((entry) => entry.decision === "rejected_inconclusive").length,
    },
    cumulative: {
      strict_accepted: acceptedLevels.length,
      latest_attempts: latestAttempts.length,
      latest_rejected: rejectedAttempts.length,
      recorded_attempts: attemptHistory.length,
    },
    decisions: decisions.map(({ attempted_candidate: _candidate, ...decision }) => decision),
    generation_failures: failureRecords,
  };
  await Promise.all([
    writeFile(acceptedPath, `${JSON.stringify({
      title: "Strictly certified incremental base candidates",
      generated_on: generatedOn,
      status: "strict_certified_candidates_only",
      applied_to_live_campaign: false,
      source_contract: strictAudit.source_contract,
      levels: acceptedLevels,
    }, null, 2)}\n`, "utf8"),
    writeFile(latestAttemptsPath, `${JSON.stringify({
      title: "Latest strict acceptance attempt per level",
      generated_on: generatedOn,
      attempts: latestAttempts,
    }, null, 2)}\n`, "utf8"),
    writeFile(attemptHistoryPath, `${JSON.stringify({
      title: "Append-only strict acceptance attempt checkpoints",
      generated_on: generatedOn,
      attempts: attemptHistory,
    }, null, 2)}\n`, "utf8"),
    writeFile(rejectedPath, `${JSON.stringify({
      title: "Rejected or inconclusive strict candidate attempts",
      generated_on: generatedOn,
      attempts: rejectedAttempts,
    }, null, 2)}\n`, "utf8"),
    writeFile(auditPath, `${JSON.stringify(strictAudit, null, 2)}\n`, "utf8"),
  ]);
  return strictAudit;
};

if (strictAcceptance) {
  const strictAudit = await runStrictAcceptance();
  console.log(JSON.stringify(strictAudit.current_run, null, 2));
  if (strictAudit.status !== "strict_incremental_run_accepted") process.exitCode = 3;
} else {
const generatedSource = `/* eslint-disable */
// AUTO-GENERATED by tools/generate-competitor-constrained-levels.mjs.
// Candidate data only: src/core/levels.ts does not import this module.
import type { LevelSpec } from "./types";

export const COMPETITOR_CONSTRAINED_LEVEL_CANDIDATES: LevelSpec[] = ${JSON.stringify(generatedLevels, null, 2)};

export const COMPETITOR_CONSTRAINED_GENERATION_FAILURES = ${JSON.stringify(failureRecords, null, 2)} as const;
`;

const report = {
  title: "Block Out! competitor-constrained base-candidate audit r140",
  generated_on: new Date().toISOString(),
  status: failures.length
    ? "base_candidate_incomplete"
    : successes.some((result) => result.audit.target_reposition_status === "not_met")
      ? "base_candidate_complete_with_unmet_constraints_not_applied"
      : "base_candidate_complete_not_applied",
  source_contract: {
    path: contractRelative,
    sha256: sha256(contractText),
  },
  output: {
    generated_typescript: generatedRelative,
    base_runtime_json: `${reportDirRelative}/formal-levels-lv001-lv100.json`,
    applied_to_levels_ts: false,
  },
  rules: {
    candidate_layer: "Base composition/layout candidate only; current campaign mechanisms are intentionally deferred to the integration wrapper.",
    exact_locks: ["rows", "cols", "playable_mask", "block_count", "shape_histogram", "color_count", "palette"],
    staged_reveal: "Only levels whose total shape area exceeds playable cells are split into non-overlapping active waves.",
    validation: "Every emitted candidate passes validateLevel and an authored route replay through PuzzleModel.",
    reposition_truthfulness: "A validation route is not an optimality proof. Targets are reported as unmet unless the validation solver actually returns a route at or above the requested overhead; no metric is overridden.",
    integration: "BASE-CANDIDATE ONLY: this module is intentionally not imported by levels.ts. The integration wrapper owns formal mechanism/device semantics and must revalidate runtime difficulty and routes after composition.",
  },
  summary: {
    contract_levels: contract.levels.length,
    emitted_candidates: successes.length,
    failed_candidates: failures.length,
    validate_level_pass: successes.length,
    puzzle_model_replay_pass: successes.length,
    validation_solver_solved: successes.filter((result) => result.audit.validation_solver_solved).length,
    staged_levels: successes.filter((result) => result.audit.staged_reveal).length,
    numeric_ice_aggregate_levels: successes.filter((result) => result.audit.numeric_ice_contract_mode === "aggregate").length,
    numeric_ice_aggregate_carrier_total: successes
      .filter((result) => result.audit.numeric_ice_contract_mode === "aggregate")
      .reduce((sum, result) => sum + result.audit.numeric_ice_carrier_total, 0),
    numeric_ice_aggregate_base_route_feasible: successes
      .filter((result) => result.audit.numeric_ice_contract_mode === "aggregate")
      .reduce((sum, result) => sum + result.audit.numeric_ice_base_route_feasible, 0),
    numeric_ice_aggregate_base_route_debt: successes
      .filter((result) => result.audit.numeric_ice_contract_mode === "aggregate")
      .reduce((sum, result) => sum + result.audit.numeric_ice_base_route_debt, 0),
    reposition_target_met: successes.filter((result) => [
      "proven_minimum_met",
      "validation_route_met_optimal_inconclusive",
    ].includes(result.audit.target_reposition_status)).length,
    reposition_target_proven: successes.filter((result) => result.audit.target_reposition_status === "proven_minimum_met").length,
    reposition_target_validation_only: successes.filter((result) => result.audit.target_reposition_status === "validation_route_met_optimal_inconclusive").length,
    reposition_target_not_met: successes.filter((result) => result.audit.target_reposition_status === "not_met").length,
    d1_target_met_or_above: successes.filter((result) => result.audit.target_d1_status === "met_or_above_target").length,
    d1_target_below: successes.filter((result) => result.audit.target_d1_status === "below_target").length,
    replacement_masks_suggested: failures.filter((result) => result.replacementMask).length,
  },
  levels: successes.map((result) => result.audit),
  failures: failureRecords,
};

const routeReport = successes.map((result) => ({
  level_id: result.audit.level_id,
  drags: result.route,
}));

const formalCandidates = {
  title: "Block Out! competitor-constrained base formal-level candidates r140",
  generated_on: report.generated_on,
  candidate_layer: "base",
  constraint_status: report.status,
  prototype_only: true,
  applied_to_live_campaign: false,
  source_contract: report.source_contract,
  levels: successes.map((result) => ({
    level_id: result.audit.level_id,
    target: contract.levels[result.level.id - 1].our_design_target,
    validation: result.audit,
    level: result.level,
    route: result.route,
  })),
  failures: failureRecords,
};

const candidateJson = {
  title: "Block Out! competitor-constrained base candidates r140",
  generated_on: report.generated_on,
  candidate_layer: "base",
  constraint_status: report.status,
  prototype_only: true,
  applied_to_live_campaign: false,
  source_contract: report.source_contract,
  levels: successes.map((result) => ({
    level_id: result.audit.level_id,
    target: contract.levels[result.level.id - 1].our_design_target,
    audit: result.audit,
    level: result.level,
    route: result.route,
  })),
};

const formalRuntime = {
  title: "Block Out! competitor-constrained base runtime data r140",
  generated_on: report.generated_on,
  status: report.status,
  candidate_layer: "base",
  applied_to_live_campaign: false,
  source_contract: report.source_contract,
  levels: successes.map((result) => ({
    level_id: result.audit.level_id,
    target_d1: result.audit.target_d1_calibrated_score,
    actual_base_d1: result.audit.actual_d1_calibrated_score,
    recommended_minimum_reposition_overhead: result.audit.target_reposition_overhead,
    validation: {
      solved: result.audit.validation_solver_solved,
      route_drags: result.audit.validation_solver_drags,
      clear_load: result.audit.validation_solver_drags == null || result.audit.validation_solver_reposition_overhead == null
        ? null
        : result.audit.validation_solver_drags - result.audit.validation_solver_reposition_overhead,
      reposition_overhead: result.audit.validation_solver_reposition_overhead,
      status: result.audit.target_reposition_status,
      proof_status: result.audit.target_reposition_status === "proven_minimum_met"
        ? "exact_minimum_proven"
        : result.audit.target_reposition_status === "not_met"
          ? "base_route_below_target"
          : result.audit.target_reposition_status === "not_applicable"
            ? "not_applicable"
            : "validation_route_only_not_a_minimum_proof",
      drags: result.route,
    },
    level: result.level,
  })),
};

const markdownRows = contractEntriesToGenerate.map((entry) => {
  const levelId = Number(entry.level_id.slice(2));
  const success = successes.find((result) => result.level.id === levelId);
  if (success) {
    const audit = success.audit;
    return `| ${entry.level_id} | emitted | ${audit.block_count} | ${audit.color_count} | ${audit.stage_count} | PASS | PASS | ${audit.validation_solver_solved ? "PASS" : "未找到"} | ${audit.target_reposition_overhead ?? "—"} | ${audit.validation_solver_reposition_overhead ?? "—"} | ${audit.target_reposition_status} | ${audit.target_d1_calibrated_score} | ${audit.actual_d1_calibrated_score} | ${audit.actual_d1_delta} | ${audit.target_d1_status} |`;
  }
  const failure = failures.find((result) => result.levelId === levelId);
  return `| ${entry.level_id} | failed:${failure.phase} | — | — | — | — | — | — | ${entry.our_design_target.recommended_minimum_reposition_overhead ?? "—"} | — | ${failure.reason.replaceAll("|", "/")} | ${entry.our_design_target.target_d1_difficulty.calibrated_score} | — | — | — |`;
}).join("\n");

const replacementText = failures.filter((failure) => failure.replacementMask).map((failure) => (
  `### Lv${String(failure.levelId).padStart(3, "0")} replacement mask\n\n` +
  `Failure: ${failure.reason}\n\n` +
  "```text\n" + failure.replacementMask.join("\n") + "\n```"
)).join("\n\n");

const readme = `# Competitor-constrained base formal-level candidates r140

This run consumes the v4 contract without editing it or applying candidates to the live campaign. It is the base composition/layout layer; formal mechanism integration remains owned by the wrapper.

## Result

- Emitted candidates: ${successes.length}/100
- Failed candidates: ${failures.length}/100
- validateLevel passes: ${successes.length}
- PuzzleModel authored-route replays: ${successes.length}
- Validation solver completions: ${report.summary.validation_solver_solved}
- Reposition targets met by returned validation routes: ${report.summary.reposition_target_met}
- Reposition targets proven as exact minima: ${report.summary.reposition_target_proven}
- Reposition targets not met: ${report.summary.reposition_target_not_met}
- D1 targets met or exceeded: ${report.summary.d1_target_met_or_above}
- D1 targets below target: ${report.summary.d1_target_below}

The authored route intentionally proves completion only. The heuristic validation solver is not an optimality proof. Only rows marked \`proven_minimum_met\` have a completed exact solve; \`validation_route_met_optimal_inconclusive\` is an upper-bound route and is not a guarantee that every solution needs that many parking drags.

This base candidate intentionally stops before mechanism composition. The integration wrapper must add the formal mechanism/device semantics, rerun runtime validation, and resolve every \`not_met\` row before production import. This candidate module is not imported by \`levels.ts\`.

## Per-level audit

| Level | Candidate | Blocks | Colors | Stages | validateLevel | PuzzleModel replay | Validation solver | Target overhead | Solver overhead | OH status | Target D1 | Actual D1 | Delta | D1 status |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---|
${markdownRows}

## Replacement-mask suggestions

These suggestions appear only when the exact v4 mask could not pack the locked histogram. They preserve rows, columns, playable-cell count, connectivity, and contact with all four edges. They are evidence for a later contract revision; this generator does not silently substitute them.

${replacementText || "No replacement mask was produced."}
`;

await mkdir(dirname(generatedPath), { recursive: true });
await mkdir(reportDir, { recursive: true });
await Promise.all([
  writeFile(generatedPath, generatedSource, "utf8"),
  writeFile(resolve(reportDir, "formal-candidates-lv001-lv100.json"), `${JSON.stringify(candidateJson, null, 2)}\n`, "utf8"),
  writeFile(resolve(reportDir, "candidate-audit.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8"),
  writeFile(resolve(reportDir, "formal-candidates.json"), `${JSON.stringify(formalCandidates, null, 2)}\n`, "utf8"),
  writeFile(resolve(reportDir, "formal-levels-lv001-lv100.json"), `${JSON.stringify(formalRuntime, null, 2)}\n`, "utf8"),
  writeFile(resolve(reportDir, "validation-routes.json"), `${JSON.stringify(routeReport, null, 2)}\n`, "utf8"),
  writeFile(resolve(reportDir, "README.md"), readme, "utf8"),
]);

console.log(JSON.stringify(report.summary, null, 2));
if (failures.length) process.exitCode = 2;
}
