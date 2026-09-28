import { build } from "esbuild";
import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";

/**
 * Strict necessary-reposition floor verifier for the video-parity campaign.
 *
 * Objective
 * ---------
 * A drag which clears one visible layer through a matching exit costs zero.
 * A committed drag which ends inside the board costs one.  The proof searches
 * every gameplay state reachable with cost < campaignRepositionFloor(levelId).
 * A floor is certified only when that entire bounded-cost frontier is empty.
 * Finding a completion is a counterexample (an upper-bound route), while any
 * state, memory, time, unsupported-semantics, or transition limit is strictly
 * inconclusive.
 *
 * Semantic authority
 * ------------------
 * All state mutation is executed by PuzzleModel.  This file enumerates legal
 * drag destinations with PuzzleModel.canPlace/isBlockActive and then replays
 * each transition through beginAction/moveBlockStep/tryExit/commitAction.
 * Timed generators are advanced by exact event-boundary PuzzleModel.tick calls
 * at zero reposition cost.  Movement axes, keys/locks, staging/lift counters,
 * move generators, conveyors, frozen counters, layers, and star exits therefore
 * use the same implementation as gameplay.  Legacy autonomous elevators are
 * rejected (inconclusive) because continuous wait/interleave enumeration is not
 * implemented here.  A declared physical_cover_prefix plan may instead prove a
 * whole-level floor by exhausting the exact initial physical-cover frontier up
 * to the first layer/body clear, an event every completion necessarily crosses.
 * An exact_first_clear_prefix plan applies the same implication while retaining
 * the complete snapshot frontier, including supported timed-generator events.
 */

const scriptPath = fileURLToPath(import.meta.url);
const root = resolve(dirname(scriptPath), "..");
const defaultOutputDir = resolve(root, "playtest-results/experiments/video-parity-v6/proofs");
const sourcePaths = {
  puzzleModel: resolve(root, "src/core/PuzzleModel.ts"),
  levelSolver: resolve(root, "src/core/levelSolver.ts"),
  types: resolve(root, "src/core/types.ts"),
  blockShape: resolve(root, "src/core/blockShape.ts"),
  floors: resolve(root, "src/core/campaignDifficultyTargets.ts"),
};

const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();

const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().flatMap((key) => (
    value[key] === undefined ? [] : [[key, canonicalize(value[key])]]
  )));
};

const canonicalJson = (value) => JSON.stringify(canonicalize(value));
const levelSpecSha256 = (level) => sha256(canonicalJson(level));

const pathExists = async (path) => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

const defaultInputPath = async () => {
  const candidates = [
    resolve(root, "src/core/videoParityLevels.generated.ts"),
    resolve(root, "src/core/levels.ts"),
  ];
  for (const candidate of candidates) if (await pathExists(candidate)) return candidate;
  return candidates[0];
};

function parseLevelSelection(specification) {
  const selected = new Set();
  for (const token of specification.split(",").map((part) => part.trim()).filter(Boolean)) {
    const match = token.match(/^(\d+)(?:-(\d+))?$/);
    if (!match) throw new Error(`Invalid level selection token: ${token}`);
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

async function parseArgs(argv) {
  const options = {
    input: null,
    witnesses: null,
    corePlan: null,
    runtimeAudit: null,
    expectedContractSha256: process.env.VIDEO_PARITY_EXPECTED_CONTRACT_SHA256?.toUpperCase() ?? null,
    levels: "1-100",
    preserveExisting: "none",
    outputDir: defaultOutputDir,
    tag: null,
    maxStates: Number(process.env.PROOF_MAX_STATES ?? 250_000),
    maxMemoryMb: Number(process.env.PROOF_MAX_MEMORY_MB ?? 1_000),
    maxSeconds: Number(process.env.PROOF_MAX_SECONDS ?? 120),
    upperBoundMaxStates: Number(process.env.PROOF_UPPER_BOUND_MAX_STATES ?? 0),
    coreUpperBoundMaxStates: Number(process.env.PROOF_CORE_UPPER_BOUND_MAX_STATES ?? 100_000),
    write: true,
    selfTest: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const value = argv[index + 1];
    if (argument === "--input") { options.input = resolve(root, value); index += 1; }
    else if (argument === "--witnesses") { options.witnesses = resolve(root, value); index += 1; }
    else if (argument === "--core-plan") { options.corePlan = resolve(root, value); index += 1; }
    else if (argument === "--runtime-audit") { options.runtimeAudit = resolve(root, value); index += 1; }
    else if (argument === "--expected-contract-sha256") { options.expectedContractSha256 = value.toUpperCase(); index += 1; }
    else if (argument === "--levels" || argument === "--level") { options.levels = value; index += 1; }
    else if (argument === "--preserve-existing") { options.preserveExisting = value; index += 1; }
    else if (argument === "--output-dir") { options.outputDir = resolve(root, value); index += 1; }
    else if (argument === "--tag") { options.tag = value.replace(/[^a-zA-Z0-9_-]+/g, "-"); index += 1; }
    else if (argument === "--max-states") { options.maxStates = Number(value); index += 1; }
    else if (argument === "--max-memory-mb") { options.maxMemoryMb = Number(value); index += 1; }
    else if (argument === "--max-seconds") { options.maxSeconds = Number(value); index += 1; }
    else if (argument === "--upper-bound-max-states") { options.upperBoundMaxStates = Number(value); index += 1; }
    else if (argument === "--core-upper-bound-max-states") { options.coreUpperBoundMaxStates = Number(value); index += 1; }
    else if (argument === "--skip-upper-bound") options.upperBoundMaxStates = 0;
    else if (argument === "--no-write") options.write = false;
    else if (argument === "--self-test") options.selfTest = true;
    else if (argument === "--help") {
      console.log([
        "Usage: node tools/prove-video-parity-reposition-floors.mjs [options]",
        "  --input <json|ts>                JSON candidates/levels or generated TypeScript module",
        "  --witnesses <json>               optional completion routes; replayed before proof search",
        "  --core-plan <json>                optional relaxed-core or exact first-clear-prefix lower-bound plan",
        "  --runtime-audit <json>            bind generated runtime to its assembly audit/contract",
        "  --expected-contract-sha256 <hex>  require this exact authoritative design-contract SHA",
        "  --levels <spec>                  e.g. 1-10,35,70 (default: 1-100)",
        "  --preserve-existing <spec|none>  report but do not prove explicitly excluded levels (default: none)",
        "  --max-states <n>                 expanded-state cap per level (default: 250000)",
        "  --max-memory-mb <n>              process RSS cap (default: 1000)",
        "  --max-seconds <n>                wall-clock cap per level (default: 120)",
        "  --upper-bound-max-states <n>     optional levelSolver completion search; never proves floor",
        "  --core-upper-bound-max-states <n> require each relaxed core to have a replayed completion",
        "  --skip-upper-bound               disable optional completion search (default)",
        "  --output-dir <path>              proof report directory",
        "  --tag <text>                     report filename tag",
        "  --self-test                      run deterministic semantic/proof tests",
        "  --no-write                       print summary without writing reports",
        "",
        "Exit code is non-zero when a selected playable level is disproven, inconclusive,",
        "missing, invalid, or bound to a mismatched authored floor.",
      ].join("\n"));
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  if (!options.input && !options.selfTest) options.input = await defaultInputPath();
  if (options.expectedContractSha256 && !/^[0-9A-F]{64}$/.test(options.expectedContractSha256)) {
    throw new Error("expectedContractSha256 must be a 64-character hexadecimal SHA-256");
  }
  for (const [name, value] of Object.entries({
    maxStates: options.maxStates,
    maxMemoryMb: options.maxMemoryMb,
    maxSeconds: options.maxSeconds,
  })) {
    if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be positive`);
  }
  if (!Number.isSafeInteger(options.maxStates)) throw new Error("maxStates must be a safe integer");
  if (!Number.isSafeInteger(options.upperBoundMaxStates) || options.upperBoundMaxStates < 0
    || !Number.isSafeInteger(options.coreUpperBoundMaxStates) || options.coreUpperBoundMaxStates <= 0) {
    throw new Error("upperBoundMaxStates must be non-negative and coreUpperBoundMaxStates must be positive safe integers");
  }
  return options;
}

const runtimeBundle = await build({
  stdin: {
    contents: `
      import { PuzzleModel, validateLevel } from "./src/core/PuzzleModel.ts";
      import { solveLevelForValidation, solveLevelOptimally } from "./src/core/levelSolver.ts";
      import { campaignRepositionFloor } from "./src/core/campaignDifficultyTargets.ts";
      export { PuzzleModel, validateLevel, solveLevelForValidation, solveLevelOptimally, campaignRepositionFloor };
      export function restoreProofModel(model, snapshot) {
        model.restore(snapshot);
        model.history = [];
        model.pendingHistory = undefined;
        model.pendingActionMutated = false;
        model.pendingGeneratorCheck = false;
        return model;
      }
    `,
    resolveDir: root,
    sourcefile: "video-parity-reposition-proof-runtime.ts",
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

const sourceTexts = Object.fromEntries(await Promise.all(Object.entries(sourcePaths).map(async ([name, path]) => (
  [name, await readFile(path, "utf8")]
))));

const semanticAnchorChecks = {
  puzzle_model_movement_axis: sourceTexts.puzzleModel.includes("block.movementAxis"),
  puzzle_model_key_release: sourceTexts.puzzleModel.includes("private releaseKey"),
  puzzle_model_lock_count: sourceTexts.puzzleModel.includes("block.lockCount ?? 1"),
  puzzle_model_lift_trigger_cohort: sourceTexts.puzzleModel.includes("shutter.triggerBlockIds"),
  puzzle_model_physical_cover: sourceTexts.puzzleModel.includes("shutterHasPhysicalFootprint"),
  puzzle_model_frozen_counters: sourceTexts.puzzleModel.includes("gate.frozen = Math.max(0, gate.frozen - 1)"),
  puzzle_model_conveyor: sourceTexts.puzzleModel.includes("advanceConveyors"),
  puzzle_model_star_gate: sourceTexts.puzzleModel.includes("block.star && !match.gate.star"),
  puzzle_model_move_generator_commit: sourceTexts.puzzleModel.includes("releaseOneFromEachReadyGenerator"),
  puzzle_model_timed_generator_tick: sourceTexts.puzzleModel.includes("advanceTimedGenerators"),
  level_solver_movement_axis: sourceTexts.levelSolver.includes("block.movementAxis"),
  level_solver_key_release: sourceTexts.levelSolver.includes("candidate.lockedBy !== block.keyId"),
  level_solver_lift_trigger_cohort: sourceTexts.levelSolver.includes("shutter.triggerBlockIds"),
  level_solver_physical_cover: sourceTexts.levelSolver.includes("shutterHasPhysicalFootprint"),
  level_solver_frozen_counters: sourceTexts.levelSolver.includes("gate.frozen = Math.max(0, gate.frozen - 1)"),
  level_solver_conveyor: sourceTexts.levelSolver.includes("advanceConveyors"),
  level_solver_star_gate: sourceTexts.levelSolver.includes("block.star && !match.gate.star"),
  level_solver_move_and_time_generators: sourceTexts.levelSolver.includes('releaseReadyGenerators(level, next, "move")')
    && sourceTexts.levelSolver.includes('releaseReadyGenerators(level, next, "time")'),
};
if (Object.values(semanticAnchorChecks).some((passed) => !passed)) {
  throw new Error(`Proof runtime semantic anchor audit failed: ${Object.entries(semanticAnchorChecks)
    .filter(([, passed]) => !passed).map(([name]) => name).join(", ")}`);
}

const sourceBinding = {
  puzzle_model_sha256: sha256(sourceTexts.puzzleModel),
  level_solver_sha256: sha256(sourceTexts.levelSolver),
  types_sha256: sha256(sourceTexts.types),
  block_shape_sha256: sha256(sourceTexts.blockShape),
  campaign_floor_source_sha256: sha256(sourceTexts.floors),
  bundled_runtime_sha256: sha256(runtimeBundleBytes),
  proof_tool_sha256: sha256(await readFile(scriptPath)),
  semantic_anchor_checks: semanticAnchorChecks,
};

const transitionSemanticsMatrix = {
  movement_axis: {
    proof: "reachable anchors are enumerated through PuzzleModel.canPlace and axis-specific directions",
    level_solver: "same horizontal/vertical direction restriction; source anchor checked",
    self_test: "horizontal block cannot receive a vertical successor",
  },
  key_lock_and_lock_count: {
    proof: "all removals execute PuzzleModel.tryExit/releaseKey, including queued cargo",
    level_solver: "same decrement/unlock loop; source anchor checked",
    self_test: "single-key and lockCount=2 completion routes replay",
  },
  staging_and_lift: {
    proof: "all layer/body removals execute PuzzleModel.advanceCounters and triggerBlockIds filtering",
    level_solver: "same blockRemoved and trigger cohort conditions; source anchor checked",
    self_test: "layer peel does not prematurely release staging; lift cohort release replays",
  },
  physical_cover: {
    proof: "PuzzleModel.canPlace applies shutterHasPhysicalFootprint until the live counter reaches zero; physical_cover_prefix retains the exact initial covers and stops at the first clear",
    level_solver: "placement constraints reserve the same closed-shutter rectangle",
    self_test: "cover cell is blocked before its trigger clear and available afterward; first-clear prefix pass/disproof/cap behavior is checked",
  },
  frozen_counters: {
    proof: "every exit/layer transition executes PuzzleModel.tryExit, which decrements live block/gate counters",
    level_solver: "same saturating counter decrement is source-audited; routes remain upper-bound only",
    self_test: "one completed block clear thaws both a frozen block and frozen gate",
  },
  conveyor: {
    proof: "PuzzleModel.advanceCounters performs the authoritative clear-triggered belt step before the successor snapshot is keyed",
    level_solver: "advanceConveyors is applied to the same clear transition",
    self_test: "belt rider advances one cell immediately after another block clears",
  },
  move_generator: {
    proof: "PuzzleModel.commitAction performs at most one release attempt per ready move generator; legal depart-and-return drags are enumerated because they commit even with no net anchor change",
    level_solver: "releaseReadyGenerators(move) model is source-audited but used only for upper comparison",
    self_test: "queued cargo releases after a committed action, including a no-net depart-and-return drag; a blocked head remains queued",
  },
  timed_generator: {
    proof: "PuzzleModel.tick at exact next event boundary, cost zero, only after started",
    level_solver: "known intentional abstraction eagerly materializes ready timed heads; routes must replay",
    self_test: "no pre-start wait; explicit zero-cost wait releases cargo; a blocked head retries at zero time after space opens",
  },
  star_exit: {
    proof: "PuzzleModel.tryExit is authoritative; candidate enumeration filters star blocks away from ordinary gates",
    level_solver: "same star-gate-required predicate; source implementation is bundled and hashed",
    self_test: "star block rejects an ordinary matching gate and exits through a matching star gate",
  },
};

const isLevelSpec = (value) => Boolean(value && typeof value === "object"
  && Number.isSafeInteger(value.id) && Array.isArray(value.blocks) && Array.isArray(value.gates));

function levelsFromJson(parsed) {
  const directArray = Array.isArray(parsed) ? parsed : null;
  const possibleArrays = [
    directArray,
    parsed?.levels,
    parsed?.LEVELS,
    parsed?.videoParityLevels,
    parsed?.generatedLevels,
    parsed?.candidates,
    parsed?.results,
  ].filter(Array.isArray);
  for (const entries of possibleArrays) {
    const levels = entries.map((entry) => entry?.level ?? entry?.level_spec ?? entry).filter(isLevelSpec);
    if (levels.length) return levels;
  }
  if (isLevelSpec(parsed)) return [parsed];
  throw new Error("JSON input does not contain recognizable LevelSpec records");
}

function levelsFromModule(module) {
  const priority = [
    "VIDEO_PARITY_LEVELS",
    "LEVELS",
    "GENERATED_LEVELS",
    "VIDEO_PARITY_BASE_LEVELS",
    "BASE_LEVELS",
    "default",
  ];
  const names = [...priority, ...Object.keys(module).filter((name) => !priority.includes(name))];
  for (const name of names) {
    const value = module[name];
    const arrays = [value, value?.levels, value?.LEVELS].filter(Array.isArray);
    for (const entries of arrays) {
      const levels = entries.map((entry) => entry?.level ?? entry).filter(isLevelSpec);
      if (levels.length) return { levels, exportName: name };
    }
  }
  throw new Error("TypeScript module does not export a recognizable LevelSpec array");
}

async function loadInput(inputPath) {
  const text = await readFile(inputPath, "utf8");
  const extension = extname(inputPath).toLowerCase();
  if (extension === ".json") {
    return { levels: levelsFromJson(JSON.parse(text)), inputText: text, exportName: null };
  }
  const bundle = await build({
    entryPoints: [inputPath],
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
    logLevel: "silent",
  });
  const bytes = Buffer.from(bundle.outputFiles[0].contents);
  const module = await import(`data:text/javascript;base64,${bytes.toString("base64")}`);
  const extracted = levelsFromModule(module);
  return { ...extracted, inputText: text, inputBundleSha256: sha256(bytes) };
}

function normalizeWitnessActions(route) {
  if (!Array.isArray(route)) return [];
  return route.map((action) => {
    if (action.kind === "wait") {
      return {
        kind: "wait",
        seconds: Number(action.seconds ?? 0),
        event: action.event ?? "timed-generator",
        cost: 0,
      };
    }
    return {
      kind: "drag",
      blockId: action.blockId ?? action.block_id,
      path: (action.path ?? []).map(([x, y]) => [x, y]),
      ...(action.exitSide ?? action.exit_side ? { exitSide: action.exitSide ?? action.exit_side } : {}),
      cost: action.exitSide ?? action.exit_side ? 0 : 1,
    };
  });
}

async function loadWitnesses(explicitPath, inputPath) {
  const inferred = [
    resolve(dirname(inputPath), "runtime-validation-routes.json"),
    resolve(root, "playtest-results/experiments/video-parity-v6/runtime-validation-routes.json"),
    resolve(dirname(inputPath), "validation-routes.json"),
  ];
  const path = explicitPath ?? await (async () => {
    for (const candidate of inferred) if (await pathExists(candidate)) return candidate;
    return null;
  })();
  if (!path) return { path: null, sha256: null, routes: new Map() };
  const text = await readFile(path, "utf8");
  const parsed = JSON.parse(text);
  const entries = Array.isArray(parsed) ? parsed : parsed.levels ?? parsed.routes ?? [];
  const routes = new Map();
  for (const entry of entries) {
    const levelId = Number(String(entry.level_id ?? entry.levelId ?? entry.id ?? "").replace(/^Lv/i, ""));
    const route = entry.drags ?? entry.actions ?? entry.route?.drags ?? entry.route ?? entry.validation?.drags;
    if (Number.isSafeInteger(levelId) && Array.isArray(route)) {
      routes.set(levelId, {
        source: entry.source ?? "provided-witness-file",
        proofScope: entry.proof_scope ?? null,
        actions: normalizeWitnessActions(route),
      });
    }
  }
  return { path, sha256: sha256(text), routes };
}

async function loadCorePlans(explicitPath) {
  if (!explicitPath) return { path: null, sha256: null, plans: new Map() };
  const text = await readFile(explicitPath, "utf8");
  const parsed = JSON.parse(text);
  const entries = Array.isArray(parsed) ? parsed : parsed.levels ?? parsed.plans ?? [];
  const plans = new Map();
  for (const entry of entries) {
    const levelId = Number(String(entry.level_id ?? entry.levelId ?? entry.id ?? "").replace(/^Lv/i, ""));
    const sourceGroups = entry.groups ?? entry.strict_core_floor_groups ?? entry.core_groups ?? [];
    if (!Number.isSafeInteger(levelId) || !Array.isArray(sourceGroups)) continue;
    plans.set(levelId, {
      source: entry.source ?? "provided-core-plan",
      proofScope: entry.proof_scope ?? "disjoint relaxed-core lower bound",
      levelSpecSha256: entry.level_spec_sha256?.toUpperCase?.() ?? null,
      proofMethod: entry.proof_method ?? entry.proofMethod ?? null,
      floor: entry.target_reposition_overhead === undefined && entry.floor === undefined
        ? null
        : Number(entry.target_reposition_overhead ?? entry.floor),
      prefixEvent: entry.prefix_event ?? entry.prefixEvent ?? "first_clear_or_layer_removal",
      interchangeableBlockIdGroups: (entry.interchangeable_block_id_groups
        ?? entry.interchangeableBlockIdGroups
        ?? entry.symmetry_classes
        ?? []).map((ids) => [...ids]),
      groups: sourceGroups.map((group, index) => ({
        id: group.id ?? `core-${index + 1}`,
        blockIds: [...(group.block_ids ?? group.blockIds ?? [])],
        floor: Number(group.target_reposition_overhead ?? group.floor),
        stageKey: group.stage_key ?? group.stageKey ?? null,
        proofMethod: group.proof_method ?? group.proofMethod ?? "exact_gameplay_frontier",
        interchangeableBlockIdGroups: (group.interchangeable_block_id_groups
          ?? group.interchangeableBlockIdGroups
          ?? group.symmetry_classes
          ?? []).map((ids) => [...ids]),
        relaxedLevelSpecSha256: (group.relaxed_level_spec_sha256_expected_from_verifier
          ?? group.relaxed_level_spec_sha256)?.toUpperCase?.() ?? null,
        route: normalizeWitnessActions(group.route ?? group.actions ?? group.drags ?? []),
      })),
    });
  }
  return { path: explicitPath, sha256: sha256(text), plans };
}

async function loadRuntimeContractBinding(
  explicitPath,
  inputPath,
  inputSourceSha256,
  inputCanonicalLevelSpecsSha256,
  expectedContractSha256,
  inputLevelCount,
) {
  const inferredPath = resolve(root, "playtest-results/experiments/video-parity-v6/runtime-assembly-audit.json");
  const path = explicitPath ?? (basename(inputPath) === "videoParityLevels.generated.ts" && await pathExists(inferredPath)
    ? inferredPath
    : null);
  if (!path) {
    return {
      requested: Boolean(expectedContractSha256),
      valid: expectedContractSha256 ? false : null,
      error: expectedContractSha256 ? "expected contract SHA was supplied but no runtime assembly audit was found" : null,
      path: null,
    };
  }
  const text = await readFile(path, "utf8");
  const audit = JSON.parse(text);
  const contractRelative = audit.inputs?.contract?.path;
  const contractPath = contractRelative ? resolve(root, contractRelative) : null;
  const actualContractSha256 = contractPath && await pathExists(contractPath)
    ? sha256(await readFile(contractPath))
    : null;
  const claimedContractSha256 = audit.inputs?.contract?.sha256?.toUpperCase?.() ?? null;
  const declaredOutput = audit.outputs?.levels ? resolve(root, audit.outputs.levels) : null;
  const declaredOutputSha256 = (audit.outputs?.levels_sha256
    ?? audit.outputs?.level_source_sha256
    ?? audit.outputs?.generated_levels_sha256)?.toUpperCase?.() ?? null;
  const declaredCanonicalLevelSpecsSha256 = audit.outputs?.canonical_level_specs_sha256?.toUpperCase?.() ?? null;
  const checks = {
    audit_has_contract_path: Boolean(contractPath),
    contract_file_exists: Boolean(actualContractSha256),
    audit_claim_matches_contract_file: Boolean(actualContractSha256 && claimedContractSha256 === actualContractSha256),
    expected_sha_matches_contract_file: expectedContractSha256
      ? expectedContractSha256 === actualContractSha256
      : null,
    audit_output_matches_input: Boolean(declaredOutput && resolve(declaredOutput) === resolve(inputPath)),
    audit_declares_output_sha256: Boolean(declaredOutputSha256),
    audit_output_sha_matches_input: Boolean(declaredOutputSha256 && declaredOutputSha256 === inputSourceSha256),
    audit_declares_canonical_level_specs_sha256: Boolean(declaredCanonicalLevelSpecsSha256),
    audit_canonical_level_specs_sha_matches_input: Boolean(
      declaredCanonicalLevelSpecsSha256
      && declaredCanonicalLevelSpecsSha256 === inputCanonicalLevelSpecsSha256
    ),
    emitted_level_count_matches_input: audit.summary?.emitted === inputLevelCount,
    exact_contract_count_matches_input: audit.summary?.exact_contract === inputLevelCount,
    validated_level_count_matches_input: audit.summary?.validate_level_passed === inputLevelCount,
  };
  const requiredChecks = Object.entries(checks)
    .filter(([name, value]) => value !== null && (name !== "expected_sha_matches_contract_file" || expectedContractSha256));
  const failures = requiredChecks.filter(([, value]) => !value).map(([name]) => name);
  return {
    requested: true,
    valid: failures.length === 0,
    error: failures.length ? `runtime/contract binding failed: ${failures.join(", ")}` : null,
    path,
    sha256: sha256(text),
    contract_path: contractPath,
    contract_sha256: actualContractSha256,
    audit_claimed_contract_sha256: claimedContractSha256,
    expected_contract_sha256: expectedContractSha256,
    declared_output_path: declaredOutput,
    declared_output_sha256: declaredOutputSha256,
    actual_input_source_sha256: inputSourceSha256,
    declared_canonical_level_specs_sha256: declaredCanonicalLevelSpecsSha256,
    actual_canonical_level_specs_sha256: inputCanonicalLevelSpecsSha256,
    checks,
    audit_summary: audit.summary ?? null,
  };
}

const numberKey = (value) => Number.isFinite(value) ? String(value) : String(value);

const blockKey = (block) => [
  block.id,
  `${block.x},${block.y}`,
  block.color,
  block.layers.join(","),
  block.frozen,
  block.shutterId ?? "-",
  block.movementAxis ?? "-",
  block.keyId ?? "-",
  block.lockedBy ?? "-",
  block.lockCount ?? 0,
  block.star ? 1 : 0,
].join("@");

const blockKeyWithoutId = (block) => [
  `${block.x},${block.y}`,
  block.color,
  block.layers.join(","),
  block.frozen,
  block.shutterId ?? "-",
  block.movementAxis ?? "-",
  block.keyId ?? "-",
  block.lockedBy ?? "-",
  block.lockCount ?? 0,
  block.star ? 1 : 0,
].join("@");

const immutableBlockSignature = (block) => {
  const copy = structuredClone(block);
  delete copy.id;
  delete copy.x;
  delete copy.y;
  return canonicalJson(copy);
};

function symmetryContextFor(level, declaredClasses) {
  if (!declaredClasses?.length) return { valid: true, errors: [], classes: [], idToClass: new Map() };
  const blocksById = new Map(level.blocks.map((block) => [block.id, block]));
  const idToClass = new Map();
  const classes = [];
  const errors = [];
  for (const [index, ids] of declaredClasses.entries()) {
    const label = `class-${index + 1}`;
    if (!Array.isArray(ids) || ids.length < 2 || new Set(ids).size !== ids.length) {
      errors.push(`${label}: interchangeable ids must be a unique array of at least two blocks`);
      continue;
    }
    const blocks = ids.map((id) => blocksById.get(id));
    if (blocks.some((block) => !block)) {
      errors.push(`${label}: references blocks outside the relaxed core`);
      continue;
    }
    if (ids.some((id) => idToClass.has(id))) {
      errors.push(`${label}: overlaps another interchangeable class`);
      continue;
    }
    const signatures = new Set(blocks.map(immutableBlockSignature));
    if (signatures.size !== 1) {
      errors.push(`${label}: blocks are not immutable-rule identical after relaxation`);
      continue;
    }
    for (const id of ids) idToClass.set(id, label);
    classes.push({
      label,
      block_ids: [...ids].sort(),
      immutable_signature_sha256: sha256([...signatures][0]),
    });
  }
  return { valid: errors.length === 0, errors, classes, idToClass };
}

/** Includes every mutable field used by PuzzleModel gameplay transitions. */
function stateKey(snapshot, symmetry = null) {
  const timedPending = snapshot.generators.some((generator) => (
    generator.trigger === "time" && generator.remaining > 0
  ));
  const ordinaryBlocks = [];
  const symmetricBlocks = new Map((symmetry?.classes ?? []).map((entry) => [entry.label, []]));
  for (const block of snapshot.blocks) {
    const label = symmetry?.idToClass?.get(block.id);
    if (label) symmetricBlocks.get(label).push(blockKeyWithoutId(block));
    else ordinaryBlocks.push(blockKey(block));
  }
  ordinaryBlocks.sort();
  const symmetricKey = [...symmetricBlocks.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([label, entries]) => `${label}:${entries.sort().join("~")}`)
    .join("|");
  return [
    `b:${ordinaryBlocks.join("|")}`,
    `sym:${symmetricKey}`,
    `q:${snapshot.queuedBlocks.map(blockKey).join("|")}`,
    `g:${snapshot.gates.map((gate) => `${gate.id}:${gate.frozen}`).join("|")}`,
    `s:${snapshot.shutters.map((shutter) => `${shutter.id}:${shutter.count}`).join("|")}`,
    `r:${snapshot.generators.map((generator) => [
      generator.id,
      generator.head,
      generator.remaining,
      generator.nextBlockId ?? "-",
      numberKey(generator.elapsed),
    ].join("@")).join("|")}`,
    `start:${snapshot.started ? 1 : 0}`,
    `failed:${snapshot.failed ? 1 : 0}`,
    `complete:${snapshot.complete ? 1 : 0}`,
    timedPending ? `time:${numberKey(snapshot.remainingSeconds)}` : "time:-",
  ].join(";");
}

const cellsAt = (block, x = block.x, y = block.y) => (
  block.shape.map(([dx, dy]) => [x + dx, y + dy])
);

function exitSidesAt(level, snapshot, block, x, y) {
  const cells = cellsAt(block, x, y);
  const minX = Math.min(...cells.map(([cellX]) => cellX));
  const maxX = Math.max(...cells.map(([cellX]) => cellX));
  const minY = Math.min(...cells.map(([, cellY]) => cellY));
  const maxY = Math.max(...cells.map(([, cellY]) => cellY));
  const activeColor = block.layers[0] ?? block.color;
  const sides = [];
  for (const side of ["top", "right", "bottom", "left"]) {
    const atEdge = side === "top" ? minY === 0
      : side === "bottom" ? maxY === level.height - 1
        : side === "left" ? minX === 0
          : maxX === level.width - 1;
    if (!atEdge) continue;
    const gate = snapshot.gates.find((candidate) => {
      if (candidate.side !== side) return false;
      return side === "top" || side === "bottom"
        ? minX >= candidate.offset && maxX < candidate.offset + candidate.size
        : minY >= candidate.offset && maxY < candidate.offset + candidate.size;
    });
    if (!gate || gate.frozen > 0 || gate.color !== activeColor) continue;
    if (block.star && !gate.star) continue;
    sides.push(side);
  }
  return sides;
}

const positionKey = (x, y) => `${x},${y}`;

function pathTo(reached, targetKey) {
  const path = [];
  let cursor = targetKey;
  while (cursor) {
    const entry = reached.get(cursor);
    if (!entry) break;
    path.push(entry.point);
    cursor = entry.parent;
  }
  path.reverse();
  return path.slice(1);
}

/**
 * Enumerates the same whole-drag destination set used by levelSolver: every
 * reachable internal anchor plus every matching exit, with traversal stopped
 * after a dragged block reaches an automatic exit anchor.
 */
function enumerateDrags(level, snapshot, model) {
  runtime.restoreProofModel(model, snapshot);
  const drags = [];
  for (const snapshotBlock of snapshot.blocks) {
    const block = model.getBlock(snapshotBlock.id);
    if (!block || !model.isBlockActive(block)) continue;
    const startKey = positionKey(block.x, block.y);
    const reached = new Map([[startKey, { point: [block.x, block.y], parent: null }]]);
    const queue = [[block.x, block.y]];
    const directions = block.movementAxis === "horizontal"
      ? [[1, 0], [-1, 0]]
      : block.movementAxis === "vertical"
        ? [[0, 1], [0, -1]]
        : [[1, 0], [0, 1], [-1, 0], [0, -1]];
    // PuzzleModel records an action as mutated once the piece leaves its
    // anchor; returning to the starting anchor before release still commits a
    // move and can release move-triggered generator cargo (or start a timed
    // feeder) without changing the piece's final position. A shortest-path
    // destination search cannot represent that cycle, so include one legal
    // two-step depart-and-return gesture. Matching exit anchors are excluded:
    // the live held-edge rule consumes the piece as soon as it re-enters one.
    const startHasExit = exitSidesAt(level, snapshot, snapshotBlock, block.x, block.y).length > 0;
    if (!startHasExit) {
      const loopStep = directions.map(([dx, dy]) => [block.x + dx, block.y + dy])
        .find(([nextX, nextY]) => model.canPlace(block, nextX, nextY)
          && exitSidesAt(level, snapshot, snapshotBlock, nextX, nextY).length === 0);
      if (loopStep) {
        drags.push({
          kind: "drag",
          blockId: block.id,
          path: [loopStep, [block.x, block.y]],
          cost: 1,
          noNetTrigger: true,
        });
      }
    }
    for (let index = 0; index < queue.length; index += 1) {
      const [x, y] = queue[index];
      const key = positionKey(x, y);
      const path = pathTo(reached, key);
      const exits = exitSidesAt(level, snapshot, snapshotBlock, x, y);
      for (const exitSide of exits) {
        drags.push({ kind: "drag", blockId: block.id, path, exitSide, cost: 0 });
      }
      const reachedByDragging = x !== block.x || y !== block.y;
      if (reachedByDragging && exits.length) continue;
      if (reachedByDragging) {
        drags.push({ kind: "drag", blockId: block.id, path, cost: 1 });
      }
      for (const [dx, dy] of directions) {
        const nextX = x + dx;
        const nextY = y + dy;
        const nextKey = positionKey(nextX, nextY);
        if (reached.has(nextKey) || !model.canPlace(block, nextX, nextY)) continue;
        reached.set(nextKey, { point: [nextX, nextY], parent: key });
        queue.push([nextX, nextY]);
      }
    }
  }
  return drags;
}

function applyDrag(level, snapshot, action, model) {
  runtime.restoreProofModel(model, snapshot);
  model.beginAction();
  for (const [x, y] of action.path) {
    if (!model.moveBlockStep(action.blockId, x, y)) {
      model.cancelAction();
      throw new Error(`PuzzleModel rejected enumerated step ${action.blockId}@${x},${y}`);
    }
  }
  if (action.exitSide) {
    const result = model.tryExit(action.blockId, action.exitSide);
    if (!result.ok) {
      model.cancelAction();
      throw new Error(`PuzzleModel rejected enumerated exit ${action.blockId}->${action.exitSide}`);
    }
  }
  if (!model.commitAction(true)) {
    throw new Error(`PuzzleModel rejected enumerated committed drag for ${action.blockId}`);
  }
  return model.snapshot();
}

function firstTimedEventDelta(snapshot) {
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
 * Produces at most one exact autonomous successor: first an event already due
 * at t=0, otherwise the next positive timed-generator event boundary.  Acting
 * now remains available as the ordinary drag expansion, so every ordering at
 * an event boundary is represented.
 */
function timedWaitTransition(level, snapshot, model) {
  if (!snapshot.started || snapshot.failed || snapshot.complete) return null;
  if (!snapshot.generators.some((generator) => generator.trigger === "time" && generator.remaining > 0)) return null;

  runtime.restoreProofModel(model, snapshot);
  model.tick(0);
  let next = model.snapshot();
  if (stateKey(next) !== stateKey(snapshot)) {
    return { action: { kind: "wait", seconds: 0, event: "timed-generator", cost: 0 }, snapshot: next };
  }

  const delta = firstTimedEventDelta(snapshot);
  if (!Number.isFinite(delta) || delta <= 0 || delta >= snapshot.remainingSeconds - 1e-12) return null;
  runtime.restoreProofModel(model, snapshot);
  model.tick(delta);
  next = model.snapshot();
  if (next.failed || stateKey(next) === stateKey(snapshot)) return null;
  return { action: { kind: "wait", seconds: delta, event: "timed-generator", cost: 0 }, snapshot: next };
}

function mechanicsOf(level) {
  return {
    movement_axis: level.blocks.some((block) => Boolean(block.movementAxis)),
    key_tokens: level.blocks.some((block) => Boolean(block.keyId)),
    locked_blocks: level.blocks.some((block) => Boolean(block.lockedBy)),
    multi_key_locks: level.blocks.some((block) => (block.lockCount ?? 1) > 1),
    physical_covers: (level.shutters ?? []).some((shutter) => (
      (shutter.skin ?? "shutter") !== "staging"
      && shutter.skin !== "lift"
      && shutter.skin !== "staged-frame"
    )),
    staging: (level.shutters ?? []).some((shutter) => shutter.skin === "staging"),
    lift: (level.shutters ?? []).some((shutter) => shutter.skin === "lift"),
    trigger_cohorts: (level.shutters ?? []).some((shutter) => Boolean(shutter.triggerBlockIds?.length)),
    move_generators: (level.generators ?? []).some((generator) => (generator.trigger ?? "move") === "move"),
    timed_generators: (level.generators ?? []).some((generator) => generator.trigger === "time"),
    shells: level.blocks.some((block) => (block.layers?.length ?? 1) > 1),
    frozen_blocks: level.blocks.some((block) => (block.frozen ?? 0) > 0),
    frozen_gates: level.gates.some((gate) => (gate.frozen ?? 0) > 0),
    conveyors: Boolean(level.conveyors?.length),
    elevators: Boolean(level.elevators?.length),
    stars: level.blocks.some((block) => Boolean(block.star)) || level.gates.some((gate) => Boolean(gate.star)),
  };
}

function reconstructRoute(parent, terminalKey, startKey) {
  const actions = [];
  let cursor = terminalKey;
  const guard = new Set();
  while (cursor !== startKey) {
    if (guard.has(cursor)) throw new Error("Counterexample parent chain contains a cycle");
    guard.add(cursor);
    const entry = parent.get(cursor);
    if (!entry) throw new Error("Counterexample parent chain is incomplete");
    actions.push(entry.action);
    cursor = entry.parentKey;
  }
  actions.reverse();
  return actions;
}

function replayRoute(level, actions) {
  const model = new runtime.PuzzleModel(level);
  let snapshot = model.snapshot();
  let repositions = 0;
  try {
    for (const action of actions) {
      if (action.kind === "wait") {
        if (!Number.isFinite(action.seconds) || action.seconds < 0) {
          return { replayed: false, complete: false, reason: "invalid-wait-duration", repositions };
        }
        if (!snapshot.started) return { replayed: false, complete: false, reason: "wait-before-start", repositions };
        runtime.restoreProofModel(model, snapshot);
        model.tick(action.seconds);
        snapshot = model.snapshot();
        if (snapshot.failed) return { replayed: false, complete: false, reason: "timer-expired", repositions };
      } else {
        snapshot = applyDrag(level, snapshot, action, model);
        repositions += action.exitSide ? 0 : 1;
      }
    }
  } catch (error) {
    return { replayed: false, complete: false, reason: error.message, repositions };
  }
  return {
    replayed: true,
    complete: snapshot.complete && snapshot.blocks.length === 0 && snapshot.queuedBlocks.length === 0,
    reason: null,
    repositions,
    total_drag_actions: actions.filter((action) => action.kind === "drag").length,
    waits: actions.filter((action) => action.kind === "wait").length,
    final_state_sha256: sha256(stateKey(snapshot)),
  };
}

function convertSolverDrags(drags) {
  return drags.map((drag) => ({
    kind: "drag",
    blockId: drag.blockId,
    path: drag.path.map(([x, y]) => [x, y]),
    ...(drag.exitSide ? { exitSide: drag.exitSide } : {}),
    cost: drag.exitSide ? 0 : 1,
  }));
}

function upperBoundCrosscheck(level, maxStates) {
  if (maxStates <= 0) return { run: false, role: "upper-bound-only; never a floor certificate" };
  const startedAt = performance.now();
  const result = runtime.solveLevelForValidation(level, maxStates);
  const actions = result.solved ? convertSolverDrags(result.drags) : [];
  const replay = result.solved ? replayRoute(level, actions) : null;
  return {
    run: true,
    role: "upper-bound-only; never a floor certificate",
    solver: "solveLevelForValidation",
    state_cap: maxStates,
    solved: result.solved,
    explored_states: result.exploredStates,
    reported_reposition_overhead: Number.isFinite(result.repositionOverhead) ? result.repositionOverhead : null,
    replay,
    accepted_upper_bound: Boolean(result.solved && replay?.replayed && replay.complete),
    actions: result.solved && replay?.replayed && replay.complete ? actions : null,
    elapsed_ms: Math.round((performance.now() - startedAt) * 100) / 100,
  };
}

function unsupportedReason(level) {
  const allowed = {
    level: new Set([
      "id", "name", "difficulty", "timeSeconds", "reward", "parMoves", "width", "height",
      "playable", "blocked", "gates", "blocks", "shutters", "generators", "elevators", "conveyors",
      "designTargets", "onboardingHint", "strategyNudge", "strategyFocus", "featureIntro",
    ]),
    gate: new Set(["id", "side", "offset", "size", "color", "frozen", "star"]),
    block: new Set([
      "id", "x", "y", "shape", "color", "layers", "frozen", "shutterId", "movementAxis",
      "keyId", "lockedBy", "lockCount", "star",
    ]),
    shutter: new Set(["id", "x", "y", "width", "height", "count", "skin", "triggerBlockIds"]),
    generator: new Set([
      "id", "side", "offset", "spawn", "queueBlockIds", "trigger", "intervalSeconds", "initialDelaySeconds",
    ]),
    conveyor: new Set(["id", "blockId", "x", "y", "width", "height", "direction"]),
  };
  const unknown = [];
  for (const key of Object.keys(level)) if (!allowed.level.has(key)) unknown.push(`level.${key}`);
  for (const [index, gate] of level.gates.entries()) {
    for (const key of Object.keys(gate)) if (!allowed.gate.has(key)) unknown.push(`gates[${index}].${key}`);
  }
  for (const [index, block] of level.blocks.entries()) {
    for (const key of Object.keys(block)) if (!allowed.block.has(key)) unknown.push(`blocks[${index}].${key}`);
  }
  for (const [index, shutter] of (level.shutters ?? []).entries()) {
    for (const key of Object.keys(shutter)) if (!allowed.shutter.has(key)) unknown.push(`shutters[${index}].${key}`);
  }
  for (const [index, generator] of (level.generators ?? []).entries()) {
    for (const key of Object.keys(generator)) if (!allowed.generator.has(key)) unknown.push(`generators[${index}].${key}`);
  }
  for (const [index, conveyor] of (level.conveyors ?? []).entries()) {
    for (const key of Object.keys(conveyor)) if (!allowed.conveyor.has(key)) unknown.push(`conveyors[${index}].${key}`);
  }
  if (unknown.length) {
    return `unknown LevelSpec fields may carry unmodeled gameplay semantics: ${unknown.join(", ")}`;
  }
  if (level.elevators?.length) {
    return "autonomous elevators require continuous wait/action phase enumeration; fail closed";
  }
  const timedQueuedIds = new Set((level.generators ?? [])
    .filter((generator) => generator.trigger === "time")
    .flatMap((generator) => generator.queueBlockIds));
  if (level.blocks.some((block) => timedQueuedIds.has(block.id) && (block.frozen ?? 0) > 0)) {
    return "frozen timed-generator cargo can thaw differently when a feeder event occurs mid-drag; fail closed";
  }
  return null;
}

function coreStageContext(level) {
  const queuedByBlock = new Map((level.generators ?? []).flatMap((generator) => (
    generator.queueBlockIds.map((blockId) => [blockId, generator.id])
  )));
  const autonomousBlockIds = new Set([
    ...(level.elevators ?? []).map((elevator) => elevator.blockId),
    ...(level.conveyors ?? []).map((conveyor) => conveyor.blockId),
  ]);
  const stageKey = (block) => block.shutterId ? `shutter:${block.shutterId}`
    : queuedByBlock.has(block.id) ? `generator:${queuedByBlock.get(block.id)}`
      : "opening";
  return { queuedByBlock, autonomousBlockIds, stageKey };
}

/**
 * Removes constraints and all non-core blocks. Keeping the original shape,
 * initial anchor, movementAxis and opening (outermost) colour makes every full
 * solution project to this easier puzzle until each selected block's first
 * visible body is removed. Generator cargo and autonomous-carried blocks are
 * deliberately ineligible because their initial anchor can change for free.
 */
function relaxedCoreLevel(level, selectedBlocks, groupId) {
  const core = structuredClone(level);
  core.name = `${level.name} disjoint relaxed core ${groupId}`;
  core.blocks = selectedBlocks.map((source) => {
    const block = structuredClone(source);
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
    const gate = structuredClone(source);
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

function exactCoreCompletionUpperBound(level, maxStates, providedRoute = []) {
  const startedAt = performance.now();
  if (providedRoute.length) {
    const replay = replayRoute(level, providedRoute);
    return {
      role: "provided relaxed-core completion replay; never itself a lower-bound certificate",
      solver: null,
      state_cap: null,
      solved: Boolean(replay.replayed && replay.complete),
      explored_states: 0,
      reported_reposition_overhead: replay.replayed && replay.complete ? replay.repositions : null,
      replay,
      accepted_upper_bound: Boolean(replay.replayed && replay.complete),
      actions: replay.replayed && replay.complete ? providedRoute : null,
      elapsed_ms: Math.round((performance.now() - startedAt) * 100) / 100,
    };
  }
  const solved = runtime.solveLevelOptimally(level, maxStates);
  const actions = solved.solved ? convertSolverDrags(solved.drags) : [];
  const replay = solved.solved ? replayRoute(level, actions) : null;
  return {
    role: "core playability/finite-optimum witness; never itself a lower-bound certificate",
    solver: "solveLevelOptimally",
    state_cap: maxStates,
    solved: solved.solved,
    explored_states: solved.exploredStates,
    reported_reposition_overhead: Number.isFinite(solved.repositionOverhead) ? solved.repositionOverhead : null,
    replay,
    accepted_upper_bound: Boolean(solved.solved && replay?.replayed && replay.complete),
    actions: solved.solved && replay?.replayed && replay.complete ? actions : null,
    elapsed_ms: Math.round((performance.now() - startedAt) * 100) / 100,
  };
}

/**
 * Exhaustive lower bound in a deliberately easier puzzle. A paid action may
 * erase any intact block into infinite off-board parking. Every block erased
 * this way ceases to obstruct immediately; every block that can reach a
 * matching exit without a prior internal release also clears for free.
 *
 * Map from real play: at the first paid/internal drag of a block, erase it in
 * the relaxation. Blocks never internally dragged remain at their authored
 * anchor until their one-drag exit. Thus every real route projects to a
 * relaxed route whose paid cost is no larger. Exhausting this relaxed frontier
 * below F therefore proves the real necessary-reposition floor F.
 */
function proveFloorByInfiniteParkingRelaxation(level, floor, options) {
  const base = proofResultSkeleton(level, floor, options);
  const startedAt = performance.now();
  const deadline = startedAt + options.maxSeconds * 1_000;
  const blockCount = level.blocks.length;
  if (blockCount > 52) {
    return {
      ...base,
      status: "inconclusive_infinite_parking_block_cap",
      lower_bound_statement_proven: false,
      target_floor_certified: false,
      counterexample: null,
      explored_states: 0,
      generated_transitions: 0,
      elapsed_ms: 0,
    };
  }
  const playable = new Set(level.playable.map(([x, y]) => `${x},${y}`));
  const bits = level.blocks.map((_block, index) => 1n << BigInt(index));
  const allMask = (1n << BigInt(blockCount)) - 1n;
  const occupiedAtAnchor = level.blocks.map((block) => (
    block.shape.map(([dx, dy]) => [block.x + dx, block.y + dy])
  ));
  const positionKey = (x, y) => `${x},${y}`;
  const activeColor = (block) => block.layers?.[0] ?? block.color;
  const gateAccepts = (block, x, y, gate) => {
    if (gate.color !== activeColor(block)) return false;
    const cells = block.shape.map(([dx, dy]) => [x + dx, y + dy]);
    const minX = Math.min(...cells.map(([cellX]) => cellX));
    const maxX = Math.max(...cells.map(([cellX]) => cellX));
    const minY = Math.min(...cells.map(([, cellY]) => cellY));
    const maxY = Math.max(...cells.map(([, cellY]) => cellY));
    if (gate.side === "top") return minY === 0 && minX >= gate.offset && maxX < gate.offset + gate.size;
    if (gate.side === "bottom") return maxY === level.height - 1 && minX >= gate.offset && maxX < gate.offset + gate.size;
    if (gate.side === "left") return minX === 0 && minY >= gate.offset && maxY < gate.offset + gate.size;
    return maxX === level.width - 1 && minY >= gate.offset && maxY < gate.offset + gate.size;
  };
  const reachabilityCache = new Map();
  const reachability = (blockIndex, removedMask) => {
    const cacheKey = `${blockIndex}:${removedMask}`;
    if (reachabilityCache.has(cacheKey)) return reachabilityCache.get(cacheKey);
    const block = level.blocks[blockIndex];
    const occupied = new Set();
    for (let otherIndex = 0; otherIndex < blockCount; otherIndex += 1) {
      if (otherIndex === blockIndex || (removedMask & bits[otherIndex]) !== 0n) continue;
      for (const [x, y] of occupiedAtAnchor[otherIndex]) occupied.add(positionKey(x, y));
    }
    const canPlace = (x, y) => block.shape.every(([dx, dy]) => {
      const key = positionKey(x + dx, y + dy);
      return playable.has(key) && !occupied.has(key);
    });
    const directions = block.movementAxis === "horizontal"
      ? [[1, 0], [-1, 0]]
      : block.movementAxis === "vertical"
        ? [[0, 1], [0, -1]]
        : [[1, 0], [0, 1], [-1, 0], [0, -1]];
    const queue = [[block.x, block.y]];
    const seen = new Set([positionKey(block.x, block.y)]);
    let canExit = false;
    let canPark = false;
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const [x, y] = queue[cursor];
      const reachedByDragging = x !== block.x || y !== block.y;
      const atMatchingExit = level.gates.some((gate) => gateAccepts(block, x, y, gate));
      if (atMatchingExit) canExit = true;
      if (reachedByDragging && !atMatchingExit) canPark = true;
      // A held block is consumed as soon as it reaches a matching edge anchor.
      if (reachedByDragging && atMatchingExit) continue;
      for (const [dx, dy] of directions) {
        const nextX = x + dx;
        const nextY = y + dy;
        const key = positionKey(nextX, nextY);
        if (seen.has(key) || !canPlace(nextX, nextY)) continue;
        seen.add(key);
        queue.push([nextX, nextY]);
      }
    }
    const result = { canExit, canPark };
    reachabilityCache.set(cacheKey, result);
    return result;
  };
  const closureCache = new Map();
  const closeZeroCost = (sourceMask) => {
    if (closureCache.has(sourceMask)) return closureCache.get(sourceMask);
    let removedMask = sourceMask;
    const zeroCostBlockIds = [];
    while (true) {
      let changed = false;
      for (let index = 0; index < blockCount; index += 1) {
        if ((removedMask & bits[index]) !== 0n || !reachability(index, removedMask).canExit) continue;
        removedMask |= bits[index];
        zeroCostBlockIds.push(level.blocks[index].id);
        changed = true;
      }
      if (!changed) break;
    }
    const result = { removedMask, zeroCostBlockIds };
    closureCache.set(sourceMask, result);
    return result;
  };

  const initial = closeZeroCost(0n);
  const seen = new Map([[initial.removedMask, 0]]);
  const parent = new Map();
  let frontier = [initial.removedMask];
  let exploredStates = 0;
  let generatedTransitions = 0;
  let peakFrontier = frontier.length;
  let halt = null;
  let relaxedCompletion = initial.removedMask === allMask
    ? { mask: initial.removedMask, cost: 0 }
    : null;
  for (let cost = 0; !relaxedCompletion && cost < floor - 1 && frontier.length; cost += 1) {
    const next = [];
    for (const mask of frontier) {
      exploredStates += 1;
      if (exploredStates > options.maxStates) { halt = "state_cap"; break; }
      if (performance.now() >= deadline) { halt = "time_cap"; break; }
      for (let index = 0; index < blockCount; index += 1) {
        if ((mask & bits[index]) !== 0n) continue;
        if (!reachability(index, mask).canPark) continue;
        generatedTransitions += 1;
        const closed = closeZeroCost(mask | bits[index]);
        const nextCost = cost + 1;
        if (seen.has(closed.removedMask)) continue;
        seen.set(closed.removedMask, nextCost);
        parent.set(closed.removedMask, {
          previous: mask,
          paid_block_id: level.blocks[index].id,
          zero_cost_block_ids: closed.zeroCostBlockIds,
        });
        if (closed.removedMask === allMask) {
          relaxedCompletion = { mask: closed.removedMask, cost: nextCost };
          break;
        }
        next.push(closed.removedMask);
      }
      if (relaxedCompletion || halt) break;
    }
    if (halt || relaxedCompletion) break;
    frontier = next;
    peakFrontier = Math.max(peakFrontier, frontier.length);
  }
  const elapsedMs = performance.now() - startedAt;
  const relaxation = {
    paid_action: "erase any intact core block that has a legal non-exit drag into infinite off-board parking at cost one",
    zero_cost_action: "clear any core block routeable from its unchanged authored anchor through a matching thawed gate",
    geometry: "authored playable mask and all intact original-anchor blockers retained",
    removed_constraints: ["non-core blocks", "blocked cells", "counters", "locks", "stars", "dynamic mechanisms", "parked-block geometry"],
    soundness: "Map each real block's first legal internal drag to one magic erase; all never-internally-dragged blocks stay at their authored anchor until a direct exit. Erasure frees at least as much geometry as the real drag, so relaxed paid cost is no greater than real committed internal drags.",
  };
  if (halt) {
    return {
      ...base,
      status: `inconclusive_infinite_parking_${halt}`,
      lower_bound_statement_proven: false,
      target_floor_certified: false,
      counterexample: null,
      relaxation,
      explored_states: exploredStates,
      visited_states: seen.size,
      generated_transitions: generatedTransitions,
      peak_frontier: peakFrontier,
      elapsed_ms: Math.round(elapsedMs * 100) / 100,
    };
  }
  if (relaxedCompletion && relaxedCompletion.cost < floor) {
    const paidBlockIds = [];
    let cursor = relaxedCompletion.mask;
    while (parent.has(cursor)) {
      const entry = parent.get(cursor);
      paidBlockIds.push(entry.paid_block_id);
      cursor = entry.previous;
    }
    paidBlockIds.reverse();
    return {
      ...base,
      status: "inconclusive_infinite_parking_bound_below_target",
      lower_bound_statement_proven: false,
      target_floor_certified: false,
      counterexample: null,
      relaxation,
      relaxed_completion: {
        role: "relaxation witness only; does not disprove the real gameplay floor",
        paid_cost: relaxedCompletion.cost,
        paid_block_ids: paidBlockIds,
      },
      explored_states: exploredStates,
      visited_states: seen.size,
      generated_transitions: generatedTransitions,
      peak_frontier: peakFrontier,
      elapsed_ms: Math.round(elapsedMs * 100) / 100,
    };
  }
  return {
    ...base,
    status: "floor_lower_bound_proven_by_infinite_parking_relaxation",
    lower_bound_statement_proven: true,
    target_floor_certified: true,
    proof_statement: `Every infinite-parking relaxed state reachable with fewer than ${floor} paid block erasures was exhausted without completion.`,
    counterexample: null,
    relaxation,
    explored_states: exploredStates,
    visited_states: seen.size,
    generated_transitions: generatedTransitions,
    peak_frontier: peakFrontier,
    elapsed_ms: Math.round(elapsedMs * 100) / 100,
  };
}

function proveFloorByCorePlan(level, floor, plan, options) {
  const base = proofResultSkeleton(level, floor, options);
  const blocksById = new Map(level.blocks.map((block) => [block.id, block]));
  const { queuedByBlock, autonomousBlockIds, stageKey } = coreStageContext(level);
  const usedBlockIds = new Set();
  const validationErrors = [];
  let requestedFloor = 0;
  if (plan?.levelSpecSha256 && plan.levelSpecSha256 !== levelSpecSha256(level)) {
    validationErrors.push(`declared level spec SHA ${plan.levelSpecSha256} != ${levelSpecSha256(level)}`);
  }
  if (!Array.isArray(plan?.groups) || !plan.groups.length) validationErrors.push("core plan contains no groups");
  for (const [index, group] of (plan?.groups ?? []).entries()) {
    const label = group.id ?? `core-${index + 1}`;
    if (!Number.isSafeInteger(group.floor) || group.floor <= 0) {
      validationErrors.push(`${label}: floor must be a positive safe integer`);
      continue;
    }
    const proofMethod = group.proofMethod ?? "exact_gameplay_frontier";
    if (!["exact_gameplay_frontier", "infinite_parking_relaxation"].includes(proofMethod)) {
      validationErrors.push(`${label}: unsupported proof method ${proofMethod}`);
    }
    requestedFloor += group.floor;
    if (!Array.isArray(group.blockIds) || !group.blockIds.length
      || new Set(group.blockIds).size !== group.blockIds.length) {
      validationErrors.push(`${label}: block ids must be a non-empty unique array`);
      continue;
    }
    const blocks = group.blockIds.map((id) => blocksById.get(id));
    if (blocks.some((block) => !block)) {
      validationErrors.push(`${label}: references missing block ids`);
      continue;
    }
    for (const block of blocks) {
      if (usedBlockIds.has(block.id)) validationErrors.push(`${label}: block ${block.id} overlaps another additive core`);
      usedBlockIds.add(block.id);
      if (queuedByBlock.has(block.id)) validationErrors.push(`${label}: generator cargo ${block.id} is not core-eligible`);
      if (autonomousBlockIds.has(block.id)) validationErrors.push(`${label}: autonomously carried block ${block.id} is not core-eligible`);
    }
    const stages = new Set(blocks.map(stageKey));
    if (stages.size !== 1) validationErrors.push(`${label}: blocks cross simultaneous reveal stages`);
    const actualStage = stages.size === 1 ? [...stages][0] : null;
    if (group.stageKey && actualStage && group.stageKey !== actualStage) {
      validationErrors.push(`${label}: declared stage ${group.stageKey} != ${actualStage}`);
    }
  }
  if (requestedFloor < floor) validationErrors.push(`core floor sum ${requestedFloor} is below campaign floor ${floor}`);
  if (validationErrors.length) {
    return {
      ...base,
      status: "inconclusive_invalid_core_plan",
      inconclusive_detail: validationErrors.join("; "),
      lower_bound_statement_proven: false,
      target_floor_certified: false,
      counterexample: null,
      core_decomposition: { source: plan?.source ?? null, requested_floor_sum: requestedFloor, validation_errors: validationErrors, groups: [] },
      explored_states: 0,
      generated_transitions: 0,
      elapsed_ms: 0,
    };
  }

  const startedAt = performance.now();
  const groupResults = [];
  let halt = null;
  for (const [index, group] of plan.groups.entries()) {
    const blocks = group.blockIds.map((id) => blocksById.get(id));
    const core = relaxedCoreLevel(level, blocks, group.id ?? `core-${index + 1}`);
    const rebuiltCoreSha256 = levelSpecSha256(core);
    const symmetry = symmetryContextFor(core, group.interchangeableBlockIdGroups);
    let upperBound;
    let proof;
    try {
      if (group.relaxedLevelSpecSha256 && group.relaxedLevelSpecSha256 !== rebuiltCoreSha256) {
        halt = `core_${index + 1}_relaxed_spec_binding_mismatch`;
      }
      if (!halt && !symmetry.valid) {
        halt = `core_${index + 1}_invalid_symmetry:${symmetry.errors.join("; ")}`;
      }
      runtime.validateLevel(core);
      if (!halt) upperBound = exactCoreCompletionUpperBound(core, options.coreUpperBoundMaxStates, group.route);
      if (!halt && !upperBound.accepted_upper_bound) {
        halt = `core_${index + 1}_completion_upper_bound_inconclusive`;
      } else if (!halt) {
        const proofMethod = group.proofMethod ?? "exact_gameplay_frontier";
        proof = proofMethod === "infinite_parking_relaxation"
          ? proveFloorByInfiniteParkingRelaxation(core, group.floor, options)
          : proveFloor(core, group.floor, options, symmetry);
        if (!proof.status.startsWith("floor_lower_bound_proven")) {
          halt = `core_${index + 1}_${proof.status}`;
        }
      }
    } catch (error) {
      halt = `core_${index + 1}_runtime_error:${error.message}`;
    }
    groupResults.push({
      id: group.id ?? `core-${index + 1}`,
      stage_key: stageKey(blocks[0]),
      block_ids: [...group.blockIds],
      target_floor: group.floor,
      proof_method: group.proofMethod ?? "exact_gameplay_frontier",
      relaxed_level_spec_sha256: rebuiltCoreSha256,
      declared_relaxed_level_spec_sha256: group.relaxedLevelSpecSha256,
      relaxed_level_spec_binding_matches: group.relaxedLevelSpecSha256
        ? group.relaxedLevelSpecSha256 === rebuiltCoreSha256
        : null,
      symmetry_reduction: {
        enabled: symmetry.classes.length > 0,
        validity: symmetry.valid,
        errors: symmetry.errors,
        classes: symmetry.classes,
        invariant: symmetry.classes.length
          ? "Each declared class has identical immutable relaxed rules. Permuting those block ids is a transition-graph automorphism, so quotienting permutations preserves reachability and minimum reposition cost."
          : null,
      },
      relaxation: {
        removed_non_core_blocks: true,
        removed_blocked_cells: true,
        thawed_gates_and_blocks: true,
        removed_locks_keys_stars_and_dynamic_mechanisms: true,
        retained_shape_anchor_movement_axis_and_outermost_color: true,
      },
      completion_upper_bound: upperBound ?? null,
      lower_bound_proof: proof ?? null,
    });
    if (halt) break;
  }
  const exploredStates = groupResults.reduce((sum, group) => sum + (group.lower_bound_proof?.explored_states ?? 0), 0);
  const generatedTransitions = groupResults.reduce((sum, group) => sum + (group.lower_bound_proof?.generated_transitions ?? 0), 0);
  const elapsedMs = performance.now() - startedAt;
  const decomposition = {
    source: plan.source,
    declared_proof_scope: plan.proofScope,
    requested_floor_sum: requestedFloor,
    disjoint_block_ids: [...usedBlockIds].sort(),
    proof_invariant: "Removing non-core blocks, blocked cells, counters, locks, stars and dynamic mechanisms is a relaxation. Each selected group belongs to one simultaneous stage and excludes queued/autonomous cargo. Every full solution projects to every core using no more internal drags of that core's disjoint block ids, so certified group lower bounds add.",
    groups: groupResults,
  };
  if (halt) {
    return {
      ...base,
      status: `inconclusive_${halt.split(":")[0]}`,
      inconclusive_detail: halt.includes(":") ? halt.slice(halt.indexOf(":") + 1) : null,
      lower_bound_statement_proven: false,
      target_floor_certified: false,
      counterexample: null,
      core_decomposition: decomposition,
      explored_states: exploredStates,
      generated_transitions: generatedTransitions,
      elapsed_ms: Math.round(elapsedMs * 100) / 100,
    };
  }
  return {
    ...base,
    status: "floor_lower_bound_proven_by_disjoint_relaxed_cores",
    lower_bound_statement_proven: true,
    target_floor_certified: true,
    proof_statement: `${groupResults.length} disjoint relaxed cores certify an additive lower bound of ${requestedFloor}, meeting campaign floor ${floor}.`,
    counterexample: null,
    core_decomposition: decomposition,
    explored_states: exploredStates,
    generated_transitions: generatedTransitions,
    elapsed_ms: Math.round(elapsedMs * 100) / 100,
  };
}

function proofResultSkeleton(level, floor, options, symmetry = null) {
  const specSha256 = levelSpecSha256(level);
  return {
    level_id: level.id,
    level_spec_sha256: specSha256,
    binding: {
      level_spec_sha256: specSha256,
      puzzle_model_sha256: sourceBinding.puzzle_model_sha256,
      level_solver_sha256: sourceBinding.level_solver_sha256,
      types_sha256: sourceBinding.types_sha256,
      block_shape_sha256: sourceBinding.block_shape_sha256,
      campaign_floor_source_sha256: sourceBinding.campaign_floor_source_sha256,
      bundled_runtime_sha256: sourceBinding.bundled_runtime_sha256,
      proof_tool_sha256: sourceBinding.proof_tool_sha256,
    },
    campaign_reposition_floor: floor,
    authored_reposition_floor: level.designTargets?.minimumRepositionOverhead ?? null,
    authored_floor_present: level.designTargets?.minimumRepositionOverhead !== undefined,
    authored_floor_matches_campaign: level.designTargets?.minimumRepositionOverhead === undefined
      ? null
      : level.designTargets.minimumRepositionOverhead === floor,
    mechanics: mechanicsOf(level),
    search: {
      algorithm: "exact-bounded-cost-0-1-frontier-v1",
      objective: "exit/layer-clear drag=0; committed internal drag=1; timed wait=0",
      searched_costs: floor === null ? null : floor > 0 ? `0..${floor - 1}` : "empty (<0)",
      max_states: options.maxStates,
      max_memory_mb: options.maxMemoryMb,
      max_seconds: options.maxSeconds,
      interchangeable_block_symmetry_quotient: symmetry?.classes?.length
        ? symmetry.classes.map((entry) => entry.block_ids)
        : [],
    },
  };
}

function replayProvidedWitness(level, floor, witness, options) {
  if (!witness) return null;
  const replay = replayRoute(level, witness.actions);
  const accepted = replay.replayed && replay.complete;
  return {
    source: witness.source,
    declared_proof_scope: witness.proofScope,
    role: "completion-route upper bound only",
    accepted_upper_bound: accepted,
    reposition_overhead: accepted ? replay.repositions : null,
    below_campaign_floor: accepted && floor !== null && replay.repositions < floor,
    replay,
    actions: accepted ? witness.actions : null,
    binding: {
      level_spec_sha256: levelSpecSha256(level),
      puzzle_model_sha256: sourceBinding.puzzle_model_sha256,
    },
    limits: { proof_search_bypassed_only_when_below_floor_counterexample_is_replayed: true },
  };
}

function witnessCounterexampleResult(level, floor, witnessResult, options) {
  const base = proofResultSkeleton(level, floor, options);
  return {
    ...base,
    status: "floor_disproven_counterexample",
    lower_bound_statement_proven: false,
    target_floor_certified: false,
    counterexample: {
      role: "completion-route upper bound; replayed below-floor witness disproves the requested lower bound",
      source: witnessResult.source,
      reposition_overhead: witnessResult.reposition_overhead,
      route_replay: witnessResult.replay,
      actions: witnessResult.actions,
    },
    explored_states: 0,
    visited_states: 0,
    generated_transitions: 0,
    duplicate_transitions: 0,
    peak_frontier: 0,
    peak_rss_mb: Math.round(process.memoryUsage().rss / 1024 / 1024 * 100) / 100,
    elapsed_ms: 0,
    proof_search_skipped: "replayed completion already disproves floor",
  };
}

/**
 * Proves a whole-level reposition floor from a necessary prefix event while
 * retaining the authored initial board verbatim.  Every completion must first
 * remove a visible layer/body.  Therefore, exhausting every real initial
 * PuzzleModel state below F without such an event proves the whole route also
 * costs at least F.
 *
 * This is intentionally not a completion search and never pins a physical
 * cover closed after its real counter would open.  Search stops at the first
 * clear, before any gate/shutter counter can have changed.  With autonomous
 * mechanisms rejected below, only active block anchors and `started` are
 * mutable in that prefix, so the frontier stores a compact exact projection;
 * every successor is still enumerated and executed by PuzzleModel.
 */
function proveFloorByPhysicalCoverPrefix(level, floor, plan, options) {
  const symmetry = symmetryContextFor(level, plan.interchangeableBlockIdGroups);
  const base = proofResultSkeleton(level, floor, options, symmetry);
  const validationErrors = [];
  if (plan.proofMethod !== "physical_cover_prefix") {
    validationErrors.push(`proof_method must be physical_cover_prefix, got ${plan.proofMethod ?? "missing"}`);
  }
  if (!plan.levelSpecSha256) {
    validationErrors.push("level_spec_sha256 is required for physical_cover_prefix");
  } else if (plan.levelSpecSha256 !== levelSpecSha256(level)) {
    validationErrors.push(`declared level spec SHA ${plan.levelSpecSha256} != ${levelSpecSha256(level)}`);
  }
  if (!Number.isSafeInteger(plan.floor) || plan.floor !== floor) {
    validationErrors.push(`declared target floor ${plan.floor ?? "missing"} != campaign floor ${floor}`);
  }
  if (!["first_clear", "first_clear_or_layer_removal"].includes(plan.prefixEvent)) {
    validationErrors.push(`unsupported prefix_event ${plan.prefixEvent}`);
  }
  if (!symmetry.valid) validationErrors.push(...symmetry.errors);
  if (level.generators?.length || level.elevators?.length || level.conveyors?.length) {
    validationErrors.push("physical_cover_prefix currently rejects generators, elevators, and conveyors");
  }
  if (floor === null || floor === undefined) {
    return {
      ...base,
      status: "not_applicable_no_campaign_floor",
      lower_bound_statement_proven: null,
      target_floor_certified: null,
      counterexample: null,
      explored_states: 0,
      generated_transitions: 0,
      elapsed_ms: 0,
    };
  }
  if (!Number.isSafeInteger(floor) || floor < 0) {
    validationErrors.push("campaign floor must be a non-negative safe integer");
  }
  const unsupported = unsupportedReason(level);
  if (unsupported) validationErrors.push(unsupported);

  try {
    runtime.validateLevel(level);
  } catch (error) {
    validationErrors.push(`invalid level: ${error.message}`);
  }
  if (validationErrors.length) {
    return {
      ...base,
      status: "inconclusive_invalid_physical_cover_prefix_plan",
      inconclusive_detail: validationErrors.join("; "),
      lower_bound_statement_proven: false,
      target_floor_certified: false,
      counterexample: null,
      physical_cover_prefix: {
        source: plan.source,
        declared_proof_scope: plan.proofScope,
        event: plan.prefixEvent,
        validation_errors: validationErrors,
      },
      explored_states: 0,
      generated_transitions: 0,
      elapsed_ms: 0,
    };
  }

  const model = new runtime.PuzzleModel(level);
  const start = model.snapshot();
  const physicalCovers = start.shutters.filter((shutter) => (
    shutter.count > 0
    && (shutter.skin ?? "shutter") !== "staging"
    && shutter.skin !== "lift"
    && shutter.skin !== "staged-frame"
  ));
  if (!physicalCovers.length || start.complete || start.blocks.length === 0) {
    const errors = [
      ...(!physicalCovers.length ? ["no initially closed physical cover is present"] : []),
      ...(start.complete || start.blocks.length === 0
        ? ["a completion is possible without a first clear event"]
        : []),
    ];
    return {
      ...base,
      status: "inconclusive_invalid_physical_cover_prefix_plan",
      inconclusive_detail: errors.join("; "),
      lower_bound_statement_proven: false,
      target_floor_certified: false,
      counterexample: null,
      physical_cover_prefix: {
        source: plan.source,
        declared_proof_scope: plan.proofScope,
        event: plan.prefixEvent,
        validation_errors: errors,
      },
      explored_states: 0,
      generated_transitions: 0,
      elapsed_ms: 0,
    };
  }

  runtime.restoreProofModel(model, start);
  const movableBlocks = start.blocks.filter((snapshotBlock) => {
    const block = model.getBlock(snapshotBlock.id);
    return Boolean(block && model.isBlockActive(block));
  });
  const movableIndexById = new Map(movableBlocks.map((block, index) => [block.id, index]));
  const startBlockIndexByMovableIndex = movableBlocks.map((block) => (
    start.blocks.findIndex((candidate) => candidate.id === block.id)
  ));
  const initiallyMovableIds = new Set(movableBlocks.map((block) => block.id));
  const inactiveSymmetryIds = symmetry.classes.flatMap((entry) => entry.block_ids)
    .filter((id) => !initiallyMovableIds.has(id));
  if (inactiveSymmetryIds.length) {
    return {
      ...base,
      status: "inconclusive_invalid_physical_cover_prefix_plan",
      inconclusive_detail: `symmetry classes may contain only initially movable blocks: ${inactiveSymmetryIds.join(", ")}`,
      lower_bound_statement_proven: false,
      target_floor_certified: false,
      counterexample: null,
      explored_states: 0,
      generated_transitions: 0,
      elapsed_ms: 0,
    };
  }

  const startPositions = new Uint16Array(movableBlocks.length * 2);
  for (let index = 0; index < movableBlocks.length; index += 1) {
    startPositions[index * 2] = movableBlocks[index].x;
    startPositions[index * 2 + 1] = movableBlocks[index].y;
  }
  const classByMovableIndex = movableBlocks.map((block) => symmetry.idToClass.get(block.id) ?? null);
  const classLabels = symmetry.classes.map((entry) => entry.label).sort();
  const compactKey = (compact) => {
    const ordinary = [];
    const grouped = new Map(classLabels.map((label) => [label, []]));
    for (let index = 0; index < movableBlocks.length; index += 1) {
      const encoded = compact.positions[index * 2 + 1] * level.width + compact.positions[index * 2];
      const label = classByMovableIndex[index];
      if (label) grouped.get(label).push(encoded);
      else ordinary.push(`${index}:${encoded}`);
    }
    const symmetric = classLabels.map((label) => (
      `${label}:${grouped.get(label).sort((left, right) => left - right).join(",")}`
    ));
    return `${compact.started ? 1 : 0}|${ordinary.join(";")}|${symmetric.join(";")}`;
  };
  const hydrate = (compact) => {
    const blocks = [...start.blocks];
    for (let movableIndex = 0; movableIndex < movableBlocks.length; movableIndex += 1) {
      const blockIndex = startBlockIndexByMovableIndex[movableIndex];
      blocks[blockIndex] = {
        ...start.blocks[blockIndex],
        x: compact.positions[movableIndex * 2],
        y: compact.positions[movableIndex * 2 + 1],
      };
    }
    return {
      ...start,
      blocks,
      started: compact.started,
      // `moves` is UI/history bookkeeping only for levels admitted above.
      // Keeping it constant prevents an unbounded non-semantic state axis.
      moves: start.moves,
    };
  };
  const project = (snapshot) => {
    const positions = new Uint16Array(movableBlocks.length * 2);
    const blockById = new Map(snapshot.blocks.map((block) => [block.id, block]));
    for (let index = 0; index < movableBlocks.length; index += 1) {
      const block = blockById.get(movableBlocks[index].id);
      if (!block) throw new Error(`prefix projection lost block ${movableBlocks[index].id} before a clear`);
      positions[index * 2] = block.x;
      positions[index * 2 + 1] = block.y;
    }
    return { positions, started: snapshot.started };
  };

  const prefixContract = {
    source: plan.source,
    declared_proof_scope: plan.proofScope,
    event: "first PuzzleModel cleared-counter increment (layer peel or body removal)",
    retained_level_spec_sha256: levelSpecSha256(level),
    initial_snapshot_sha256: sha256(canonicalJson(start)),
    initial_mutable_state_key_sha256: sha256(stateKey(start, symmetry)),
    retained_initial_blocks: start.blocks.length,
    initially_movable_blocks: movableBlocks.length,
    retained_frozen_gates: start.gates.filter((gate) => gate.frozen > 0).length,
    retained_physical_covers: physicalCovers.map((cover) => ({
      id: cover.id,
      x: cover.x,
      y: cover.y,
      width: cover.width,
      height: cover.height,
      count: cover.count,
      skin: cover.skin ?? "shutter",
    })),
    cover_rule: "covers remain under their real PuzzleModel counters; the search terminates at the first clear before a counter can change",
    completion_implication: "every whole-level completion removes at least one layer/body, so its reposition cost is at least the minimum cost of this prefix event",
    compact_state_invariant: "before the first clear and without autonomous mechanisms, only initially movable block anchors and started can affect subsequent gameplay; all other authored fields are restored from the hashed initial snapshot",
  };

  const startedAt = performance.now();
  const deadline = startedAt + options.maxSeconds * 1_000;
  const budget = floor - 1;
  const bucketCount = Math.max(1, floor);
  const buckets = Array.from({ length: bucketCount }, () => []);
  const bucketHeads = Array.from({ length: bucketCount }, () => 0);
  const startCompact = { positions: startPositions, started: start.started };
  const startKey = compactKey(startCompact);
  const best = new Map([[startKey, 0]]);
  buckets[0].push({ key: startKey, compact: startCompact });
  let frontierEntries = 1;
  let peakFrontier = 1;
  let exploredStates = 0;
  let generatedTransitions = 0;
  let duplicateTransitions = 0;
  let peakRssMb = process.memoryUsage().rss / 1024 / 1024;
  let halt = null;
  let prefixCounterexample = null;

  const shouldHalt = () => {
    if (exploredStates >= options.maxStates) return "state_cap";
    if (performance.now() >= deadline) return "time_cap";
    peakRssMb = Math.max(peakRssMb, process.memoryUsage().rss / 1024 / 1024);
    if (peakRssMb > options.maxMemoryMb) return "memory_cap";
    return null;
  };
  const enqueue = (compact, cost) => {
    if (cost > budget) return;
    const key = compactKey(compact);
    const previous = best.get(key);
    if (previous !== undefined && previous <= cost) {
      duplicateTransitions += 1;
      return;
    }
    best.set(key, cost);
    buckets[cost].push({ key, compact });
    frontierEntries += 1;
    peakFrontier = Math.max(peakFrontier, frontierEntries);
  };

  search:
  for (let cost = 0; cost <= budget; cost += 1) {
    const bucket = buckets[cost];
    while (bucketHeads[cost] < bucket.length) {
      const nodeIndex = bucketHeads[cost]++;
      const node = bucket[nodeIndex];
      bucket[nodeIndex] = null;
      frontierEntries -= 1;
      if (best.get(node.key) !== cost) continue;
      halt = shouldHalt();
      if (halt) break search;
      exploredStates += 1;
      const snapshot = hydrate(node.compact);
      try {
        const uniqueSuccessors = new Map();
        for (const action of enumerateDrags(level, snapshot, model)) {
          if (performance.now() >= deadline) { halt = "time_cap"; break; }
          const next = applyDrag(level, snapshot, action, model);
          generatedTransitions += 1;
          const nextCost = cost + action.cost;
          if (next.cleared > start.cleared && nextCost <= budget) {
            const before = snapshot.blocks.find((block) => block.id === action.blockId);
            const after = next.blocks.find((block) => block.id === action.blockId);
            prefixCounterexample = {
              role: "prefix-only counterexample; refutes this sufficient first-clear proof premise but does not by itself disprove the whole-level floor",
              reposition_overhead_before_first_clear: nextCost,
              event: !after ? "body_removal" : (after.layers.length < before.layers.length ? "layer_removal" : "clear"),
              cleared_before: start.cleared,
              cleared_after: next.cleared,
              triggering_action: action,
              source_compact_state_sha256: sha256(node.key),
              route_omitted: "compact exhaustive prefix search intentionally retains no parent chains; the triggering transition itself was executed by authoritative PuzzleModel",
            };
            break search;
          }
          if (next.cleared !== start.cleared || nextCost > budget) continue;
          const compact = project(next);
          const key = compactKey(compact);
          const previous = uniqueSuccessors.get(key);
          if (!previous || action.cost < previous.action.cost
            || (action.cost === previous.action.cost && action.path.length < previous.action.path.length)) {
            uniqueSuccessors.set(key, { action, compact });
          }
        }
        if (halt || prefixCounterexample) break search;
        for (const successor of uniqueSuccessors.values()) {
          enqueue(successor.compact, cost + successor.action.cost);
        }
        peakRssMb = Math.max(peakRssMb, process.memoryUsage().rss / 1024 / 1024);
        if (peakRssMb > options.maxMemoryMb) {
          halt = "memory_cap";
          break search;
        }
      } catch (error) {
        halt = `transition_error:${error.message}`;
        break search;
      }
    }
  }

  peakRssMb = Math.max(peakRssMb, process.memoryUsage().rss / 1024 / 1024);
  if (!prefixCounterexample && !halt && peakRssMb > options.maxMemoryMb) halt = "memory_cap";
  const elapsedMs = performance.now() - startedAt;
  if (prefixCounterexample) {
    return {
      ...base,
      status: "inconclusive_physical_cover_prefix_event_below_target",
      inconclusive_detail: `first clear reachable with ${prefixCounterexample.reposition_overhead_before_first_clear} repositions, below ${floor}`,
      lower_bound_statement_proven: false,
      target_floor_certified: false,
      counterexample: prefixCounterexample,
      physical_cover_prefix: prefixContract,
      explored_states: exploredStates,
      visited_states: best.size,
      generated_transitions: generatedTransitions,
      duplicate_transitions: duplicateTransitions,
      peak_frontier: peakFrontier,
      peak_rss_mb: Math.round(peakRssMb * 100) / 100,
      elapsed_ms: Math.round(elapsedMs * 100) / 100,
    };
  }
  if (halt) {
    const [reason, ...detail] = halt.split(":");
    return {
      ...base,
      status: `inconclusive_physical_cover_prefix_${reason}`,
      inconclusive_detail: detail.join(":") || null,
      lower_bound_statement_proven: false,
      target_floor_certified: false,
      counterexample: null,
      physical_cover_prefix: prefixContract,
      explored_states: exploredStates,
      visited_states: best.size,
      generated_transitions: generatedTransitions,
      duplicate_transitions: duplicateTransitions,
      peak_frontier: peakFrontier,
      peak_rss_mb: Math.round(peakRssMb * 100) / 100,
      elapsed_ms: Math.round(elapsedMs * 100) / 100,
    };
  }
  return {
    ...base,
    status: "floor_lower_bound_proven_by_physical_cover_prefix",
    lower_bound_statement_proven: true,
    target_floor_certified: true,
    proof_statement: `Every exact initial PuzzleModel state reachable with fewer than ${floor} committed internal drags was exhausted without a first layer/body clear; every completion therefore costs at least ${floor}.`,
    counterexample: null,
    physical_cover_prefix: prefixContract,
    explored_states: exploredStates,
    visited_states: best.size,
    generated_transitions: generatedTransitions,
    duplicate_transitions: duplicateTransitions,
    peak_frontier: peakFrontier,
    peak_rss_mb: Math.round(peakRssMb * 100) / 100,
    elapsed_ms: Math.round(elapsedMs * 100) / 100,
  };
}

/**
 * Proves a whole-level floor by exhausting the exact authored runtime frontier
 * only until the first visible layer/body removal.  Unlike the compact
 * physical-cover specialization above, this variant stores complete snapshots
 * and therefore keeps supported generators, their queue/head/timing state, and
 * every other PuzzleModel field represented by stateKey.
 *
 * Every completed route necessarily crosses this event.  Consequently, if no
 * first clear is reachable with cost < F, no completion can use fewer than F
 * committed internal drags.  A below-F event refutes only this sufficient
 * prefix premise; it is not by itself a below-F completion counterexample.
 */
function proveFloorByExactFirstClearPrefix(level, floor, plan, options) {
  const symmetry = symmetryContextFor(level, plan.interchangeableBlockIdGroups);
  const base = proofResultSkeleton(level, floor, options, symmetry);
  const validationErrors = [];
  if (plan.proofMethod !== "exact_first_clear_prefix") {
    validationErrors.push(`proof_method must be exact_first_clear_prefix, got ${plan.proofMethod ?? "missing"}`);
  }
  if (!plan.levelSpecSha256) {
    validationErrors.push("level_spec_sha256 is required for exact_first_clear_prefix");
  } else if (plan.levelSpecSha256 !== levelSpecSha256(level)) {
    validationErrors.push(`declared level spec SHA ${plan.levelSpecSha256} != ${levelSpecSha256(level)}`);
  }
  if (!Number.isSafeInteger(plan.floor) || plan.floor !== floor) {
    validationErrors.push(`declared target floor ${plan.floor ?? "missing"} != campaign floor ${floor}`);
  }
  if (!["first_clear", "first_clear_or_layer_removal"].includes(plan.prefixEvent)) {
    validationErrors.push(`unsupported prefix_event ${plan.prefixEvent}`);
  }
  if (!symmetry.valid) validationErrors.push(...symmetry.errors);
  if (floor === null || floor === undefined) {
    return {
      ...base,
      status: "not_applicable_no_campaign_floor",
      lower_bound_statement_proven: null,
      target_floor_certified: null,
      counterexample: null,
      explored_states: 0,
      generated_transitions: 0,
      elapsed_ms: 0,
    };
  }
  if (!Number.isSafeInteger(floor) || floor < 0) {
    validationErrors.push("campaign floor must be a non-negative safe integer");
  }
  const unsupported = unsupportedReason(level);
  if (unsupported) validationErrors.push(unsupported);
  try {
    runtime.validateLevel(level);
  } catch (error) {
    validationErrors.push(`invalid level: ${error.message}`);
  }
  if (validationErrors.length) {
    return {
      ...base,
      status: "inconclusive_invalid_exact_first_clear_prefix_plan",
      inconclusive_detail: validationErrors.join("; "),
      lower_bound_statement_proven: false,
      target_floor_certified: false,
      counterexample: null,
      exact_first_clear_prefix: {
        source: plan.source,
        declared_proof_scope: plan.proofScope,
        event: plan.prefixEvent,
        validation_errors: validationErrors,
      },
      explored_states: 0,
      generated_transitions: 0,
      elapsed_ms: 0,
    };
  }

  const model = new runtime.PuzzleModel(level);
  const start = model.snapshot();
  if (start.complete || (start.blocks.length === 0 && start.queuedBlocks.length === 0)) {
    const errors = ["a completion is possible without a first clear event"];
    return {
      ...base,
      status: "inconclusive_invalid_exact_first_clear_prefix_plan",
      inconclusive_detail: errors.join("; "),
      lower_bound_statement_proven: false,
      target_floor_certified: false,
      counterexample: null,
      exact_first_clear_prefix: {
        source: plan.source,
        declared_proof_scope: plan.proofScope,
        event: plan.prefixEvent,
        validation_errors: errors,
      },
      explored_states: 0,
      generated_transitions: 0,
      elapsed_ms: 0,
    };
  }

  const startKey = stateKey(start, symmetry);
  const prefixContract = {
    source: plan.source,
    declared_proof_scope: plan.proofScope,
    event: "first PuzzleModel cleared-counter increment (layer peel or body removal)",
    retained_level_spec_sha256: levelSpecSha256(level),
    initial_snapshot_sha256: sha256(canonicalJson(start)),
    initial_mutable_state_key_sha256: sha256(startKey),
    retained_initial_active_blocks: start.blocks.length,
    retained_initial_queued_blocks: start.queuedBlocks.length,
    retained_generators: start.generators.map((generator) => ({
      id: generator.id,
      trigger: generator.trigger,
      head: generator.head,
      remaining: generator.remaining,
      nextBlockId: generator.nextBlockId ?? null,
      intervalSeconds: generator.intervalSeconds ?? null,
    })),
    completion_implication: "every whole-level completion removes at least one visible layer/body, so its reposition cost is at least the minimum cost of this prefix event",
    state_invariant: "complete PuzzleModel snapshots are retained; stateKey includes active/queued blocks, counters, generator heads/timing, started/failed/complete flags, and remaining time whenever a timed event remains pending",
  };

  const startedAt = performance.now();
  const deadline = startedAt + options.maxSeconds * 1_000;
  const budget = floor - 1;
  const bucketCount = Math.max(1, floor);
  const buckets = Array.from({ length: bucketCount }, () => []);
  const bucketHeads = Array.from({ length: bucketCount }, () => 0);
  const best = new Map([[startKey, 0]]);
  const parent = new Map();
  buckets[0].push({ key: startKey, snapshot: start });
  let frontierEntries = 1;
  let peakFrontier = 1;
  let exploredStates = 0;
  let generatedTransitions = 0;
  let duplicateTransitions = 0;
  let peakRssMb = process.memoryUsage().rss / 1024 / 1024;
  let halt = null;
  let prefixCounterexample = null;

  const shouldHalt = () => {
    if (exploredStates >= options.maxStates) return "state_cap";
    if (performance.now() >= deadline) return "time_cap";
    peakRssMb = Math.max(peakRssMb, process.memoryUsage().rss / 1024 / 1024);
    if (peakRssMb > options.maxMemoryMb) return "memory_cap";
    return null;
  };
  const enqueue = (snapshot, cost, parentKey, action) => {
    if (cost > budget) return;
    const key = stateKey(snapshot, symmetry);
    const previous = best.get(key);
    if (previous !== undefined && previous <= cost) {
      duplicateTransitions += 1;
      return;
    }
    best.set(key, cost);
    parent.set(key, { parentKey, action });
    buckets[cost].push({ key, snapshot });
    frontierEntries += 1;
    peakFrontier = Math.max(peakFrontier, frontierEntries);
  };
  const eventFrom = (before, after, action, nextCost, nodeKey) => {
    if (after.cleared <= start.cleared || nextCost > budget) return null;
    const blockBefore = action.blockId
      ? before.blocks.find((block) => block.id === action.blockId)
      : null;
    const blockAfter = action.blockId
      ? after.blocks.find((block) => block.id === action.blockId)
      : null;
    const actions = [...reconstructRoute(parent, nodeKey, startKey), action];
    return {
      role: "prefix-only counterexample; refutes this sufficient first-clear proof premise but does not by itself disprove the whole-level floor",
      reposition_overhead_before_first_clear: nextCost,
      event: blockBefore && blockAfter && blockAfter.layers.length < blockBefore.layers.length
        ? "layer_removal"
        : "body_removal",
      cleared_before: start.cleared,
      cleared_after: after.cleared,
      triggering_action: action,
      actions,
      route_replay: (() => {
        const replayModel = new runtime.PuzzleModel(level);
        let snapshot = replayModel.snapshot();
        let repositions = 0;
        try {
          for (const replayAction of actions) {
            if (replayAction.kind === "wait") {
              runtime.restoreProofModel(replayModel, snapshot);
              replayModel.tick(replayAction.seconds);
              snapshot = replayModel.snapshot();
            } else {
              snapshot = applyDrag(level, snapshot, replayAction, replayModel);
              repositions += replayAction.exitSide ? 0 : 1;
            }
          }
          return {
            replayed: true,
            first_clear_reached: snapshot.cleared > start.cleared,
            repositions,
            final_state_sha256: sha256(stateKey(snapshot, symmetry)),
          };
        } catch (error) {
          return { replayed: false, first_clear_reached: false, repositions, reason: error.message };
        }
      })(),
    };
  };

  search:
  for (let cost = 0; cost <= budget; cost += 1) {
    const bucket = buckets[cost];
    while (bucketHeads[cost] < bucket.length) {
      const nodeIndex = bucketHeads[cost]++;
      const node = bucket[nodeIndex];
      bucket[nodeIndex] = null;
      frontierEntries -= 1;
      if (best.get(node.key) !== cost) continue;
      halt = shouldHalt();
      if (halt) break search;
      exploredStates += 1;
      try {
        const wait = timedWaitTransition(level, node.snapshot, model);
        if (wait) {
          generatedTransitions += 1;
          prefixCounterexample = eventFrom(node.snapshot, wait.snapshot, wait.action, cost, node.key);
          if (prefixCounterexample) break search;
          enqueue(wait.snapshot, cost, node.key, wait.action);
        }
        const uniqueSuccessors = new Map();
        for (const action of enumerateDrags(level, node.snapshot, model)) {
          if (performance.now() >= deadline) { halt = "time_cap"; break; }
          const next = applyDrag(level, node.snapshot, action, model);
          generatedTransitions += 1;
          const nextCost = cost + action.cost;
          prefixCounterexample = eventFrom(node.snapshot, next, action, nextCost, node.key);
          if (prefixCounterexample) break;
          if (next.cleared !== start.cleared || nextCost > budget) continue;
          const key = stateKey(next, symmetry);
          const previous = uniqueSuccessors.get(key);
          if (!previous || action.cost < previous.action.cost
            || (action.cost === previous.action.cost && action.path.length < previous.action.path.length)) {
            uniqueSuccessors.set(key, { action, snapshot: next });
          }
        }
        if (halt || prefixCounterexample) break search;
        for (const successor of uniqueSuccessors.values()) {
          enqueue(successor.snapshot, cost + successor.action.cost, node.key, successor.action);
        }
        peakRssMb = Math.max(peakRssMb, process.memoryUsage().rss / 1024 / 1024);
        if (peakRssMb > options.maxMemoryMb) {
          halt = "memory_cap";
          break search;
        }
      } catch (error) {
        halt = `transition_error:${error.message}`;
        break search;
      }
    }
  }

  peakRssMb = Math.max(peakRssMb, process.memoryUsage().rss / 1024 / 1024);
  if (!prefixCounterexample && !halt && peakRssMb > options.maxMemoryMb) halt = "memory_cap";
  const elapsedMs = performance.now() - startedAt;
  if (prefixCounterexample) {
    if (!prefixCounterexample.route_replay.replayed
      || !prefixCounterexample.route_replay.first_clear_reached
      || prefixCounterexample.route_replay.repositions
        !== prefixCounterexample.reposition_overhead_before_first_clear) {
      halt = `prefix_counterexample_replay_mismatch:${prefixCounterexample.route_replay.reason ?? "state mismatch"}`;
    } else {
      return {
        ...base,
        status: "inconclusive_exact_first_clear_prefix_event_below_target",
        inconclusive_detail: `first clear reachable with ${prefixCounterexample.reposition_overhead_before_first_clear} repositions, below ${floor}`,
        lower_bound_statement_proven: false,
        target_floor_certified: false,
        counterexample: prefixCounterexample,
        exact_first_clear_prefix: prefixContract,
        explored_states: exploredStates,
        visited_states: best.size,
        generated_transitions: generatedTransitions,
        duplicate_transitions: duplicateTransitions,
        peak_frontier: peakFrontier,
        peak_rss_mb: Math.round(peakRssMb * 100) / 100,
        elapsed_ms: Math.round(elapsedMs * 100) / 100,
      };
    }
  }
  if (halt) {
    const [reason, ...detail] = halt.split(":");
    return {
      ...base,
      status: `inconclusive_exact_first_clear_prefix_${reason}`,
      inconclusive_detail: detail.join(":") || null,
      lower_bound_statement_proven: false,
      target_floor_certified: false,
      counterexample: null,
      exact_first_clear_prefix: prefixContract,
      explored_states: exploredStates,
      visited_states: best.size,
      generated_transitions: generatedTransitions,
      duplicate_transitions: duplicateTransitions,
      peak_frontier: peakFrontier,
      peak_rss_mb: Math.round(peakRssMb * 100) / 100,
      elapsed_ms: Math.round(elapsedMs * 100) / 100,
    };
  }
  return {
    ...base,
    status: "floor_lower_bound_proven_by_exact_first_clear_prefix",
    lower_bound_statement_proven: true,
    target_floor_certified: true,
    proof_statement: `Every exact PuzzleModel state reachable with fewer than ${floor} committed internal drags was exhausted without a first layer/body clear; every completion therefore costs at least ${floor}.`,
    counterexample: null,
    exact_first_clear_prefix: prefixContract,
    explored_states: exploredStates,
    visited_states: best.size,
    generated_transitions: generatedTransitions,
    duplicate_transitions: duplicateTransitions,
    peak_frontier: peakFrontier,
    peak_rss_mb: Math.round(peakRssMb * 100) / 100,
    elapsed_ms: Math.round(elapsedMs * 100) / 100,
  };
}

function proveFloor(level, floor, options, symmetry = null) {
  const base = proofResultSkeleton(level, floor, options, symmetry);
  if (floor === null || floor === undefined) {
    return {
      ...base,
      status: "not_applicable_no_campaign_floor",
      lower_bound_statement_proven: null,
      target_floor_certified: null,
      counterexample: null,
      explored_states: 0,
      generated_transitions: 0,
      elapsed_ms: 0,
    };
  }
  if (!Number.isSafeInteger(floor) || floor < 0) {
    return {
      ...base,
      status: "inconclusive_invalid_campaign_floor",
      lower_bound_statement_proven: false,
      target_floor_certified: false,
      counterexample: null,
      explored_states: 0,
      generated_transitions: 0,
      elapsed_ms: 0,
    };
  }
  const unsupported = unsupportedReason(level);
  if (unsupported) {
    return {
      ...base,
      status: "inconclusive_unsupported_semantics",
      unsupported_reason: unsupported,
      lower_bound_statement_proven: false,
      target_floor_certified: false,
      counterexample: null,
      explored_states: 0,
      generated_transitions: 0,
      elapsed_ms: 0,
    };
  }

  runtime.validateLevel(level);
  const startedAt = performance.now();
  const deadline = startedAt + options.maxSeconds * 1_000;
  const model = new runtime.PuzzleModel(level);
  const start = model.snapshot();
  const startKey = stateKey(start, symmetry);
  const budget = floor - 1;
  const bucketCount = Math.max(1, floor);
  const buckets = Array.from({ length: bucketCount }, () => []);
  const bucketHeads = Array.from({ length: bucketCount }, () => 0);
  const best = new Map([[startKey, 0]]);
  const parent = new Map();
  buckets[0].push({ key: startKey, snapshot: start });
  let frontierEntries = 1;
  let peakFrontier = 1;
  let exploredStates = 0;
  let generatedTransitions = 0;
  let duplicateTransitions = 0;
  let peakRssMb = process.memoryUsage().rss / 1024 / 1024;
  let halt = null;
  let completionKey = null;
  let completionCost = null;

  const shouldHalt = () => {
    if (exploredStates >= options.maxStates) return "state_cap";
    if (performance.now() >= deadline) return "time_cap";
    peakRssMb = Math.max(peakRssMb, process.memoryUsage().rss / 1024 / 1024);
    if (peakRssMb > options.maxMemoryMb) return "memory_cap";
    return null;
  };

  const enqueue = (snapshot, cost, parentKey, action) => {
    if (cost > budget) return;
    const key = stateKey(snapshot, symmetry);
    const previous = best.get(key);
    if (previous !== undefined && previous <= cost) {
      duplicateTransitions += 1;
      return;
    }
    best.set(key, cost);
    parent.set(key, { parentKey, action });
    buckets[cost].push({ key, snapshot });
    frontierEntries += 1;
    peakFrontier = Math.max(peakFrontier, frontierEntries);
  };

  search:
  for (let cost = 0; cost <= budget; cost += 1) {
    const bucket = buckets[cost];
    while (bucketHeads[cost] < bucket.length) {
      const nodeIndex = bucketHeads[cost]++;
      const node = bucket[nodeIndex];
      bucket[nodeIndex] = null;
      frontierEntries -= 1;
      if (best.get(node.key) !== cost) continue;
      halt = shouldHalt();
      if (halt) break search;
      exploredStates += 1;
      if (node.snapshot.complete
        && node.snapshot.blocks.length === 0
        && node.snapshot.queuedBlocks.length === 0) {
        completionKey = node.key;
        completionCost = cost;
        break search;
      }

      try {
        const wait = timedWaitTransition(level, node.snapshot, model);
        if (wait) {
          generatedTransitions += 1;
          enqueue(wait.snapshot, cost, node.key, wait.action);
        }
        const uniqueSuccessors = new Map();
        for (const action of enumerateDrags(level, node.snapshot, model)) {
          if (performance.now() >= deadline) { halt = "time_cap"; break; }
          const next = applyDrag(level, node.snapshot, action, model);
          generatedTransitions += 1;
          const key = stateKey(next, symmetry);
          const previous = uniqueSuccessors.get(key);
          if (!previous || action.cost < previous.action.cost
            || (action.cost === previous.action.cost && action.path.length < previous.action.path.length)) {
            uniqueSuccessors.set(key, { action, snapshot: next });
          }
        }
        if (halt) break search;
        for (const successor of uniqueSuccessors.values()) {
          enqueue(successor.snapshot, cost + successor.action.cost, node.key, successor.action);
        }
        peakRssMb = Math.max(peakRssMb, process.memoryUsage().rss / 1024 / 1024);
        if (peakRssMb > options.maxMemoryMb) {
          halt = "memory_cap";
          break search;
        }
      } catch (error) {
        halt = `transition_error:${error.message}`;
        break search;
      }
    }
  }

  peakRssMb = Math.max(peakRssMb, process.memoryUsage().rss / 1024 / 1024);
  if (!completionKey && !halt && peakRssMb > options.maxMemoryMb) halt = "memory_cap";
  const elapsedMs = performance.now() - startedAt;
  if (completionKey !== null) {
    let actions;
    let replay;
    try {
      actions = reconstructRoute(parent, completionKey, startKey);
      replay = replayRoute(level, actions);
    } catch (error) {
      halt = `counterexample_replay_error:${error.message}`;
    }
    if (!halt && (!replay?.replayed || !replay.complete || replay.repositions !== completionCost)) {
      halt = `counterexample_replay_mismatch:${replay?.reason ?? "not-complete"}`;
    }
    if (!halt) {
      return {
        ...base,
        status: "floor_disproven_counterexample",
        lower_bound_statement_proven: false,
        target_floor_certified: false,
        counterexample: {
          role: "completion-route upper bound; disproves the requested lower bound",
          reposition_overhead: completionCost,
          route_replay: replay,
          actions,
        },
        explored_states: exploredStates,
        visited_states: best.size,
        generated_transitions: generatedTransitions,
        duplicate_transitions: duplicateTransitions,
        peak_frontier: peakFrontier,
        peak_rss_mb: Math.round(peakRssMb * 100) / 100,
        elapsed_ms: Math.round(elapsedMs * 100) / 100,
      };
    }
  }

  if (halt) {
    const [reason, ...detail] = halt.split(":");
    return {
      ...base,
      status: `inconclusive_${reason}`,
      inconclusive_detail: detail.join(":") || null,
      lower_bound_statement_proven: false,
      target_floor_certified: false,
      counterexample: null,
      explored_states: exploredStates,
      visited_states: best.size,
      generated_transitions: generatedTransitions,
      duplicate_transitions: duplicateTransitions,
      peak_frontier: peakFrontier,
      peak_rss_mb: Math.round(peakRssMb * 100) / 100,
      elapsed_ms: Math.round(elapsedMs * 100) / 100,
    };
  }

  return {
    ...base,
    status: "floor_lower_bound_proven",
    lower_bound_statement_proven: true,
    target_floor_certified: true,
    proof_statement: `Every gameplay state reachable with fewer than ${floor} committed internal drags was exhausted without a completion.`,
    counterexample: null,
    explored_states: exploredStates,
    visited_states: best.size,
    generated_transitions: generatedTransitions,
    duplicate_transitions: duplicateTransitions,
    peak_frontier: peakFrontier,
    peak_rss_mb: Math.round(peakRssMb * 100) / 100,
    elapsed_ms: Math.round(elapsedMs * 100) / 100,
  };
}

function selfTestLevelBase(id, width = 3, height = 3) {
  return {
    id,
    name: "reposition floor verifier self-test",
    difficulty: "normal",
    timeSeconds: 120,
    reward: 20,
    width,
    height,
    playable: Array.from({ length: height }, (_row, y) => (
      Array.from({ length: width }, (_cell, x) => [x, y])
    )).flat(),
    blocked: [],
  };
}

function runSelfTests() {
  const base = selfTestLevelBase(990001);
  const direct = {
    ...base,
    gates: [{ id: "direct-red", side: "top", offset: 1, size: 1, color: "red" }],
    blocks: [{ id: "direct", x: 1, y: 0, shape: [[0, 0]], color: "red" }],
  };
  const parking = {
    ...selfTestLevelBase(990002),
    gates: [
      { id: "parking-red", side: "top", offset: 1, size: 1, color: "red" },
      { id: "parking-blue", side: "bottom", offset: 1, size: 1, color: "blue" },
    ],
    blocks: [
      { id: "red", x: 1, y: 2, shape: [[0, 0]], color: "red" },
      { id: "blue", x: 1, y: 0, shape: [[0, 0]], color: "blue" },
    ],
  };
  const keyLock = {
    ...selfTestLevelBase(990003),
    gates: [
      { id: "key-red", side: "top", offset: 0, size: 1, color: "red" },
      { id: "lock-blue", side: "top", offset: 2, size: 1, color: "blue" },
    ],
    blocks: [
      { id: "key", x: 0, y: 0, shape: [[0, 0]], color: "red", keyId: "k" },
      { id: "lock", x: 2, y: 0, shape: [[0, 0]], color: "blue", lockedBy: "k" },
    ],
  };
  const lift = {
    ...selfTestLevelBase(990004),
    gates: [
      { id: "front-red", side: "left", offset: 0, size: 1, color: "red" },
      { id: "back-blue", side: "top", offset: 2, size: 1, color: "blue" },
    ],
    shutters: [{
      id: "lift-stage",
      x: 2,
      y: 0,
      width: 1,
      height: 1,
      count: 1,
      skin: "lift",
      triggerBlockIds: ["front"],
    }],
    blocks: [
      { id: "front", x: 0, y: 0, shape: [[0, 0]], color: "red" },
      { id: "back", x: 2, y: 0, shape: [[0, 0]], color: "blue", shutterId: "lift-stage" },
    ],
  };
  const cover = {
    ...selfTestLevelBase(990012),
    gates: [
      { id: "cover-trigger-red", side: "left", offset: 0, size: 1, color: "red" },
      { id: "cover-blue", side: "top", offset: 2, size: 1, color: "blue" },
    ],
    shutters: [{ id: "physical-cover", x: 2, y: 0, width: 1, height: 1, count: 1, skin: "shutter" }],
    blocks: [
      { id: "cover-trigger", x: 0, y: 0, shape: [[0, 0]], color: "red" },
      { id: "cover-blue-block", x: 2, y: 1, shape: [[0, 0]], color: "blue" },
    ],
  };
  const frozenCounters = {
    ...selfTestLevelBase(990015),
    gates: [
      { id: "thaw-trigger-red", side: "left", offset: 0, size: 1, color: "red" },
      { id: "thawed-blue", side: "top", offset: 2, size: 1, color: "blue", frozen: 1 },
    ],
    blocks: [
      { id: "thaw-trigger", x: 0, y: 0, shape: [[0, 0]], color: "red" },
      { id: "frozen-blue", x: 2, y: 0, shape: [[0, 0]], color: "blue", frozen: 1 },
    ],
  };
  const conveyor = {
    ...selfTestLevelBase(990016),
    gates: [
      { id: "belt-trigger-red", side: "left", offset: 0, size: 1, color: "red" },
      { id: "belt-blue", side: "right", offset: 1, size: 1, color: "blue" },
    ],
    conveyors: [{
      id: "belt", blockId: "belt-rider", x: 1, y: 1, width: 1, height: 1, direction: "right",
    }],
    blocks: [
      { id: "belt-trigger", x: 0, y: 0, shape: [[0, 0]], color: "red" },
      { id: "belt-rider", x: 1, y: 1, shape: [[0, 0]], color: "blue" },
    ],
  };
  const moveGenerator = {
    ...selfTestLevelBase(990005),
    gates: [
      { id: "blue-bottom", side: "bottom", offset: 2, size: 1, color: "blue" },
      { id: "red-top", side: "top", offset: 0, size: 1, color: "red" },
    ],
    generators: [{
      id: "move-gen",
      side: "top",
      offset: 0,
      spawn: [0, 0],
      queueBlockIds: ["cargo"],
      trigger: "move",
    }],
    blocks: [
      { id: "starter", x: 2, y: 2, shape: [[0, 0]], color: "blue" },
      { id: "cargo", x: 0, y: 0, shape: [[0, 0]], color: "red" },
    ],
  };
  const noNetMoveGenerator = {
    ...selfTestLevelBase(990017),
    gates: [
      { id: "jiggle-blue", side: "bottom", offset: 1, size: 1, color: "blue" },
      { id: "jiggle-red", side: "top", offset: 0, size: 1, color: "red" },
    ],
    generators: [{
      id: "jiggle-gen",
      side: "top",
      offset: 0,
      spawn: [0, 0],
      queueBlockIds: ["jiggle-cargo"],
      trigger: "move",
    }],
    blocks: [
      { id: "jiggle-starter", x: 1, y: 1, shape: [[0, 0]], color: "blue" },
      { id: "jiggle-cargo", x: 0, y: 0, shape: [[0, 0]], color: "red" },
    ],
  };
  const timedGenerator = {
    ...selfTestLevelBase(990006),
    gates: [
      { id: "blue-bottom", side: "bottom", offset: 2, size: 1, color: "blue" },
      { id: "red-top", side: "top", offset: 0, size: 1, color: "red" },
    ],
    generators: [{
      id: "time-gen",
      side: "top",
      offset: 0,
      spawn: [0, 0],
      queueBlockIds: ["timed-cargo"],
      trigger: "time",
      intervalSeconds: 1,
      initialDelaySeconds: 1,
    }],
    blocks: [
      { id: "starter", x: 2, y: 2, shape: [[0, 0]], color: "blue" },
      { id: "timed-cargo", x: 0, y: 0, shape: [[0, 0]], color: "red" },
    ],
  };
  const blockedTimedGenerator = {
    ...selfTestLevelBase(990013),
    gates: [
      { id: "timed-starter-blue", side: "bottom", offset: 2, size: 1, color: "blue" },
      { id: "timed-blocker-red", side: "left", offset: 0, size: 1, color: "red" },
      { id: "timed-cargo-orange", side: "top", offset: 0, size: 1, color: "orange" },
    ],
    generators: [{
      id: "blocked-time-gen",
      side: "top",
      offset: 0,
      spawn: [0, 0],
      queueBlockIds: ["blocked-timed-cargo"],
      trigger: "time",
      intervalSeconds: 1,
      initialDelaySeconds: 1,
    }],
    blocks: [
      { id: "timed-starter", x: 2, y: 2, shape: [[0, 0]], color: "blue" },
      { id: "timed-spawn-blocker", x: 0, y: 0, shape: [[0, 0]], color: "red" },
      { id: "blocked-timed-cargo", x: 0, y: 0, shape: [[0, 0]], color: "orange" },
    ],
  };
  const layeredMoveGenerator = {
    ...selfTestLevelBase(990010),
    gates: [
      { id: "purple-right", side: "right", offset: 2, size: 1, color: "purple" },
      { id: "blue-bottom", side: "bottom", offset: 2, size: 1, color: "blue" },
      { id: "red-top", side: "top", offset: 0, size: 1, color: "red" },
    ],
    generators: [{
      id: "move-gen",
      side: "top",
      offset: 0,
      spawn: [0, 0],
      queueBlockIds: ["cargo"],
      trigger: "move",
    }],
    blocks: [
      { id: "starter", x: 2, y: 2, shape: [[0, 0]], color: "blue", layers: ["purple", "blue"] },
      { id: "cargo", x: 0, y: 0, shape: [[0, 0]], color: "red" },
    ],
  };
  const axis = {
    ...selfTestLevelBase(990007),
    gates: [{ id: "axis-red", side: "top", offset: 1, size: 1, color: "red" }],
    blocks: [{ id: "axis", x: 1, y: 1, shape: [[0, 0]], color: "red", movementAxis: "horizontal" }],
  };
  const multiKey = {
    ...selfTestLevelBase(990008),
    gates: [
      { id: "key-red", side: "top", offset: 0, size: 1, color: "red" },
      { id: "key-orange", side: "top", offset: 1, size: 1, color: "orange" },
      { id: "lock-blue", side: "top", offset: 2, size: 1, color: "blue" },
    ],
    blocks: [
      { id: "key-a", x: 0, y: 0, shape: [[0, 0]], color: "red", keyId: "shared" },
      { id: "key-b", x: 1, y: 0, shape: [[0, 0]], color: "orange", keyId: "shared" },
      { id: "lock", x: 2, y: 0, shape: [[0, 0]], color: "blue", lockedBy: "shared", lockCount: 2 },
    ],
  };
  const stagingLayers = {
    ...selfTestLevelBase(990009),
    gates: [
      { id: "front-red", side: "left", offset: 0, size: 1, color: "red" },
      { id: "front-orange", side: "top", offset: 0, size: 1, color: "orange" },
      { id: "back-blue", side: "top", offset: 2, size: 1, color: "blue" },
    ],
    shutters: [{ id: "stage", x: 2, y: 0, width: 1, height: 1, count: 1, skin: "staging" }],
    blocks: [
      { id: "layered-front", x: 0, y: 0, shape: [[0, 0]], color: "red", layers: ["orange", "red"] },
      { id: "staged-back", x: 2, y: 0, shape: [[0, 0]], color: "blue", shutterId: "stage" },
    ],
  };
  const starExit = {
    ...selfTestLevelBase(990014),
    gates: [
      { id: "ordinary-red", side: "top", offset: 1, size: 1, color: "red" },
      { id: "star-red", side: "right", offset: 0, size: 1, color: "red", star: true },
    ],
    blocks: [{ id: "star-block", x: 1, y: 0, shape: [[0, 0]], color: "red", star: true }],
  };
  const additiveCores = {
    ...selfTestLevelBase(990011, 6, 3),
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
  const prefixParkingCover = {
    ...selfTestLevelBase(990018),
    gates: [
      { id: "prefix-red", side: "top", offset: 1, size: 1, color: "red" },
      { id: "prefix-blue", side: "bottom", offset: 1, size: 1, color: "blue" },
    ],
    shutters: [{ id: "prefix-cover", x: 0, y: 1, width: 1, height: 1, count: 2, skin: "shutter" }],
    blocks: [
      { id: "prefix-red-block", x: 1, y: 2, shape: [[0, 0]], color: "red" },
      { id: "prefix-blue-block", x: 1, y: 0, shape: [[0, 0]], color: "blue" },
    ],
  };
  const prefixLayerCover = {
    ...selfTestLevelBase(990019),
    gates: [{ id: "prefix-layer-red", side: "top", offset: 1, size: 1, color: "red" }],
    shutters: [{ id: "prefix-layer-cover", x: 0, y: 1, width: 1, height: 1, count: 2, skin: "shutter" }],
    blocks: [{
      id: "prefix-layer-block", x: 1, y: 0, shape: [[0, 0]], color: "red", layers: ["red", "blue"],
    }],
  };

  for (const level of [
    direct, parking, keyLock, lift, cover, frozenCounters, conveyor, moveGenerator, timedGenerator,
    blockedTimedGenerator, layeredMoveGenerator, noNetMoveGenerator, axis, multiKey, stagingLayers,
    starExit, additiveCores, prefixParkingCover, prefixLayerCover,
  ]) {
    try { runtime.validateLevel(level); } catch (error) {
      throw new Error(`Self-test level ${level.id} failed validation: ${error.message}`);
    }
  }
  const options = { maxStates: 20_000, maxMemoryMb: 4_096, maxSeconds: 10, coreUpperBoundMaxStates: 20_000 };
  const directDisproof = proveFloor(direct, 1, options);
  const parkingProof = proveFloor(parking, 1, options);
  const parkingDisproof = proveFloor(parking, 2, options);
  const parkingRelaxedProof = proveFloorByInfiniteParkingRelaxation(parking, 1, options);
  const directRelaxedInconclusive = proveFloorByInfiniteParkingRelaxation(direct, 1, options);
  const keyDisproof = proveFloor(keyLock, 1, options);
  const liftDisproof = proveFloor(lift, 1, options);
  const coverDisproof = proveFloor(cover, 1, options);
  const frozenCountersDisproof = proveFloor(frozenCounters, 1, options);
  const conveyorDisproof = proveFloor(conveyor, 1, options);
  const moveGeneratorDisproof = proveFloor(moveGenerator, 1, options);
  const noNetMoveGeneratorModel = new runtime.PuzzleModel(noNetMoveGenerator);
  const noNetMoveGeneratorStart = noNetMoveGeneratorModel.snapshot();
  const noNetMoveGeneratorAction = enumerateDrags(
    noNetMoveGenerator,
    noNetMoveGeneratorStart,
    noNetMoveGeneratorModel,
  ).find((action) => action.noNetTrigger && action.blockId === "jiggle-starter");
  const noNetMoveGeneratorAfter = noNetMoveGeneratorAction
    ? applyDrag(noNetMoveGenerator, noNetMoveGeneratorStart, noNetMoveGeneratorAction, noNetMoveGeneratorModel)
    : null;
  const timedGeneratorDisproof = proveFloor(timedGenerator, 1, options);
  const blockedTimedGeneratorDisproof = proveFloor(blockedTimedGenerator, 1, options);
  const cap = proveFloor(parking, 2, { ...options, maxStates: 1 });
  const memoryCap = proveFloor(parking, 2, { ...options, maxMemoryMb: 1 });
  const axisProof = proveFloor(axis, 1, options);
  const multiKeyDisproof = proveFloor(multiKey, 1, options);
  const stagingDisproof = proveFloor(stagingLayers, 1, options);
  const starDisproof = proveFloor(starExit, 1, options);
  const unknownField = proveFloor({ ...direct, futureMechanic: { enabled: true } }, 1, options);
  const additiveCoreProof = proveFloorByCorePlan(additiveCores, 2, {
    source: "self-test",
    proofScope: "disjoint relaxed-core lower bound",
    groups: [
      { id: "a", blockIds: ["a-red", "a-blue"], floor: 1, stageKey: "opening", route: [] },
      { id: "b", blockIds: ["b-green", "b-orange"], floor: 1, stageKey: "opening", route: [] },
    ],
  }, options);
  const overlappingCorePlan = proveFloorByCorePlan(additiveCores, 2, {
    source: "self-test-invalid",
    groups: [
      { id: "a", blockIds: ["a-red", "a-blue"], floor: 1, stageKey: "opening", route: [] },
      { id: "overlap", blockIds: ["a-blue", "b-orange"], floor: 1, stageKey: "opening", route: [] },
    ],
  }, options);
  const queuedCargoCorePlan = proveFloorByCorePlan(moveGenerator, 1, {
    source: "self-test-invalid-queued",
    groups: [{ id: "queued", blockIds: ["starter", "cargo"], floor: 1, stageKey: "opening", route: [] }],
  }, options);
  const crossStageCorePlan = proveFloorByCorePlan(stagingLayers, 1, {
    source: "self-test-invalid-cross-stage",
    groups: [{ id: "cross-stage", blockIds: ["layered-front", "staged-back"], floor: 1, route: [] }],
  }, options);
  const wrongLevelBindingCorePlan = proveFloorByCorePlan(additiveCores, 2, {
    source: "self-test-invalid-level-binding",
    levelSpecSha256: "0".repeat(64),
    groups: [
      { id: "a", blockIds: ["a-red", "a-blue"], floor: 1, stageKey: "opening", route: [] },
      { id: "b", blockIds: ["b-green", "b-orange"], floor: 1, stageKey: "opening", route: [] },
    ],
  }, options);
  const wrongRelaxedBindingCorePlan = proveFloorByCorePlan(additiveCores, 2, {
    source: "self-test-invalid-relaxed-binding",
    groups: [
      {
        id: "a", blockIds: ["a-red", "a-blue"], floor: 1, stageKey: "opening", route: [],
        relaxedLevelSpecSha256: "0".repeat(64),
      },
      { id: "b", blockIds: ["b-green", "b-orange"], floor: 1, stageKey: "opening", route: [] },
    ],
  }, options);
  const physicalPrefixPlan = (level, floor, overrides = {}) => ({
    source: "self-test",
    proofScope: "exact initial physical-cover first-clear prefix",
    proofMethod: "physical_cover_prefix",
    levelSpecSha256: levelSpecSha256(level),
    floor,
    prefixEvent: "first_clear_or_layer_removal",
    interchangeableBlockIdGroups: [],
    groups: [],
    ...overrides,
  });
  const physicalPrefixFloor = proveFloorByPhysicalCoverPrefix(
    prefixParkingCover, 1, physicalPrefixPlan(prefixParkingCover, 1), options,
  );
  const physicalPrefixBelowTarget = proveFloorByPhysicalCoverPrefix(
    prefixParkingCover, 2, physicalPrefixPlan(prefixParkingCover, 2), options,
  );
  const physicalPrefixLayerEvent = proveFloorByPhysicalCoverPrefix(
    prefixLayerCover, 1, physicalPrefixPlan(prefixLayerCover, 1), options,
  );
  const physicalPrefixCap = proveFloorByPhysicalCoverPrefix(
    prefixParkingCover, 2, physicalPrefixPlan(prefixParkingCover, 2), { ...options, maxStates: 1 },
  );
  const physicalPrefixWrongBinding = proveFloorByPhysicalCoverPrefix(
    prefixParkingCover,
    1,
    physicalPrefixPlan(prefixParkingCover, 1, { levelSpecSha256: "0".repeat(64) }),
    options,
  );
  const timedFirstClearPipeline = {
    ...selfTestLevelBase(990020, 4, 4),
    gates: [
      { id: "prefix-red", side: "top", offset: 1, size: 1, color: "red" },
      { id: "prefix-blue", side: "left", offset: 2, size: 1, color: "blue", frozen: 1 },
    ],
    generators: [{
      id: "prefix-timed-generator",
      side: "bottom",
      offset: 1,
      spawn: [1, 2],
      queueBlockIds: ["prefix-blue-cargo", "prefix-red-cargo"],
      trigger: "time",
      intervalSeconds: 1,
      initialDelaySeconds: 1,
    }],
    blocks: [
      { id: "prefix-starter", x: 3, y: 3, shape: [[0, 0]], color: "blue" },
      { id: "prefix-blue-cargo", x: 1, y: 2, shape: [[0, 0]], color: "blue" },
      { id: "prefix-red-cargo", x: 1, y: 2, shape: [[0, 0]], color: "red" },
    ],
  };
  const exactPrefixPlan = (level, floor, overrides = {}) => ({
    source: "self-test",
    proofScope: "exact complete-snapshot first-clear prefix",
    proofMethod: "exact_first_clear_prefix",
    levelSpecSha256: levelSpecSha256(level),
    floor,
    prefixEvent: "first_clear_or_layer_removal",
    interchangeableBlockIdGroups: [],
    groups: [],
    ...overrides,
  });
  const exactTimedPrefixFloor = proveFloorByExactFirstClearPrefix(
    timedFirstClearPipeline, 2, exactPrefixPlan(timedFirstClearPipeline, 2), options,
  );
  const exactTimedPrefixBelowTarget = proveFloorByExactFirstClearPrefix(
    timedFirstClearPipeline, 3, exactPrefixPlan(timedFirstClearPipeline, 3), options,
  );
  const exactPrefixWrongBinding = proveFloorByExactFirstClearPrefix(
    timedFirstClearPipeline,
    2,
    exactPrefixPlan(timedFirstClearPipeline, 2, { levelSpecSha256: "0".repeat(64) }),
    options,
  );
  const official = runtime.solveLevelOptimally(parking, 20_000);
  const initialTimed = new runtime.PuzzleModel(timedGenerator).snapshot();
  const initialTimedWait = timedWaitTransition(timedGenerator, initialTimed, new runtime.PuzzleModel(timedGenerator));
  const layeredModel = new runtime.PuzzleModel(layeredMoveGenerator);
  const layeredStart = layeredModel.snapshot();
  const afterLayerPeel = applyDrag(layeredMoveGenerator, layeredStart, {
    kind: "drag", blockId: "starter", path: [], exitSide: "right", cost: 0,
  }, layeredModel);
  const afterBodyRemoval = applyDrag(layeredMoveGenerator, afterLayerPeel, {
    kind: "drag", blockId: "starter", path: [], exitSide: "bottom", cost: 0,
  }, layeredModel);
  const coverModel = new runtime.PuzzleModel(cover);
  const coverInitiallyBlocks = !coverModel.canPlace(coverModel.getBlock("cover-blue-block"), 2, 0);
  const coverAfterTrigger = applyDrag(cover, coverModel.snapshot(), {
    kind: "drag", blockId: "cover-trigger", path: [], exitSide: "left", cost: 0,
  }, coverModel);
  runtime.restoreProofModel(coverModel, coverAfterTrigger);
  const coverReleased = coverAfterTrigger.shutters[0].count === 0
    && coverModel.canPlace(coverModel.getBlock("cover-blue-block"), 2, 0);
  const frozenModel = new runtime.PuzzleModel(frozenCounters);
  const frozenAfterTrigger = applyDrag(frozenCounters, frozenModel.snapshot(), {
    kind: "drag", blockId: "thaw-trigger", path: [], exitSide: "left", cost: 0,
  }, frozenModel);
  const countersThawedTogether = frozenAfterTrigger.gates.find((gate) => gate.id === "thawed-blue")?.frozen === 0
    && frozenAfterTrigger.blocks.find((block) => block.id === "frozen-blue")?.frozen === 0;
  const conveyorModel = new runtime.PuzzleModel(conveyor);
  const conveyorAfterTrigger = applyDrag(conveyor, conveyorModel.snapshot(), {
    kind: "drag", blockId: "belt-trigger", path: [], exitSide: "left", cost: 0,
  }, conveyorModel);
  const conveyorAdvanced = conveyorAfterTrigger.blocks.find((block) => block.id === "belt-rider")?.x === 2;
  const blockedTimedModel = new runtime.PuzzleModel(blockedTimedGenerator);
  blockedTimedModel.beginAction();
  const timedStarterExit = blockedTimedModel.tryExit("timed-starter", "bottom").ok;
  const timedStarterCommit = blockedTimedModel.commitAction(true);
  blockedTimedModel.tick(1);
  const timedBlockedSnapshot = blockedTimedModel.snapshot();
  blockedTimedModel.beginAction();
  const timedBlockerExit = blockedTimedModel.tryExit("timed-spawn-blocker", "left").ok;
  const timedBlockerCommit = blockedTimedModel.commitAction(true);
  const timedBeforeZeroTick = blockedTimedModel.snapshot();
  blockedTimedModel.tick(0);
  const timedAfterZeroTick = blockedTimedModel.snapshot();
  const starModel = new runtime.PuzzleModel(starExit);
  const ordinaryGateRejectedForStar = starModel.exitAttemptStatus("star-block", "top") === "star-gate-required";
  starModel.beginAction();
  const starMovedToDedicatedGate = starModel.moveBlockStep("star-block", 2, 0);
  const dedicatedStarGateAccepted = starModel.exitAttemptStatus("star-block", "right") === "ok";
  starModel.cancelAction();

  const checks = [
    [directDisproof.status === "floor_disproven_counterexample"
      && directDisproof.counterexample.reposition_overhead === 0,
    "direct exit must disprove floor 1 with a replayed zero-reposition route"],
    [parkingProof.status === "floor_lower_bound_proven" && parkingProof.target_floor_certified,
      "mandatory parking must prove floor 1"],
    [parkingDisproof.status === "floor_disproven_counterexample"
      && parkingDisproof.counterexample.reposition_overhead === 1,
    "mandatory parking must disprove floor 2 with cost 1"],
    [parkingRelaxedProof.status === "floor_lower_bound_proven_by_infinite_parking_relaxation"
      && parkingRelaxedProof.target_floor_certified,
    "movable infinite-parking relaxation must certify a known mandatory parking floor"],
    [directRelaxedInconclusive.status === "inconclusive_infinite_parking_bound_below_target"
      && !directRelaxedInconclusive.target_floor_certified,
    "a zero-cost relaxed completion must stay inconclusive instead of being mislabeled as a real counterexample"],
    [keyDisproof.status === "floor_disproven_counterexample", "key removal must unlock its target"],
    [liftDisproof.status === "floor_disproven_counterexample", "lift trigger cohort must release hidden cargo"],
    [coverDisproof.status === "floor_disproven_counterexample"
      && coverInitiallyBlocks && coverReleased,
    "physical cover must reserve cells until its counter reaches zero"],
    [frozenCountersDisproof.status === "floor_disproven_counterexample" && countersThawedTogether,
      "a full block clear must decrement both frozen block and frozen gate counters"],
    [conveyorDisproof.status === "floor_disproven_counterexample" && conveyorAdvanced,
      "a clear-triggered conveyor advance must be represented by PuzzleModel state mutation"],
    [moveGeneratorDisproof.status === "floor_disproven_counterexample", "move generator must release after a committed action"],
    [Boolean(noNetMoveGeneratorAction
      && noNetMoveGeneratorAfter?.blocks.some((block) => block.id === "jiggle-cargo")
      && noNetMoveGeneratorAfter.blocks.find((block) => block.id === "jiggle-starter")?.x === 1
      && noNetMoveGeneratorAfter.blocks.find((block) => block.id === "jiggle-starter")?.y === 1),
    "depart-and-return drag must commit and release move-generator cargo without changing the starter anchor"],
    [timedGeneratorDisproof.status === "floor_disproven_counterexample"
      && timedGeneratorDisproof.counterexample.actions.some((action) => action.kind === "wait"),
    "timed generator must release through an explicit zero-cost wait"],
    [initialTimedWait === null, "timed generator must not advance before gameplay has started"],
    [blockedTimedGeneratorDisproof.status === "floor_disproven_counterexample"
      && timedStarterExit && timedStarterCommit
      && timedBlockedSnapshot.queuedBlocks.some((block) => block.id === "blocked-timed-cargo")
      && !timedBlockedSnapshot.blocks.some((block) => block.id === "blocked-timed-cargo")
      && timedBlockerExit && timedBlockerCommit
      && timedBeforeZeroTick.queuedBlocks.some((block) => block.id === "blocked-timed-cargo")
      && timedAfterZeroTick.blocks.some((block) => block.id === "blocked-timed-cargo"),
    "blocked timed spawn must retain its head and release it on a later zero-time event after space opens"],
    [afterLayerPeel.queuedBlocks.length === 1 && afterLayerPeel.blocks.length === 1
      && afterBodyRemoval.queuedBlocks.length === 0 && afterBodyRemoval.blocks.some((block) => block.id === "cargo"),
    "stationary shell peel must not release a move generator before full body removal"],
    [cap.status === "inconclusive_state_cap" && !cap.target_floor_certified,
      "state cap must be inconclusive, never certified"],
    [axisProof.status === "floor_lower_bound_proven",
      "horizontal-only block must not receive an illegal vertical transition"],
    [multiKeyDisproof.status === "floor_disproven_counterexample"
      && multiKeyDisproof.counterexample.actions.filter((action) => action.exitSide).length === 3,
    "lockCount=2 must require both matching key removals before the locked target"],
    [stagingDisproof.status === "floor_disproven_counterexample"
      && stagingDisproof.counterexample.actions.filter((action) => action.exitSide).length === 3,
    "staging count must advance only when the layered front block is fully removed"],
    [starDisproof.status === "floor_disproven_counterexample"
      && ordinaryGateRejectedForStar && starMovedToDedicatedGate && dedicatedStarGateAccepted,
    "star blocks must reject ordinary gates and accept a matching star gate"],
    [memoryCap.status === "inconclusive_memory_cap" && !memoryCap.target_floor_certified,
      "memory cap must be inconclusive, never certified"],
    [unknownField.status === "inconclusive_unsupported_semantics" && !unknownField.target_floor_certified,
      "unknown potential mechanic fields must fail closed"],
    [additiveCoreProof.status === "floor_lower_bound_proven_by_disjoint_relaxed_cores"
      && additiveCoreProof.target_floor_certified
      && additiveCoreProof.core_decomposition.groups.length === 2,
    "two disjoint exact relaxed-core floors must add"],
    [overlappingCorePlan.status === "inconclusive_invalid_core_plan" && !overlappingCorePlan.target_floor_certified,
      "overlapping additive core groups must fail closed"],
    [queuedCargoCorePlan.status === "inconclusive_invalid_core_plan" && !queuedCargoCorePlan.target_floor_certified,
      "queued generator cargo must be ineligible for relaxed-core addition"],
    [crossStageCorePlan.status === "inconclusive_invalid_core_plan" && !crossStageCorePlan.target_floor_certified,
      "a single relaxed core may not cross reveal stages"],
    [wrongLevelBindingCorePlan.status === "inconclusive_invalid_core_plan"
      && !wrongLevelBindingCorePlan.target_floor_certified,
    "core plan declared against a different LevelSpec SHA must fail closed"],
    [wrongRelaxedBindingCorePlan.status.startsWith("inconclusive_core_1_relaxed_spec_binding_mismatch")
      && !wrongRelaxedBindingCorePlan.target_floor_certified,
    "rebuilt relaxed core must match the plan's declared core SHA"],
    [physicalPrefixFloor.status === "floor_lower_bound_proven_by_physical_cover_prefix"
      && physicalPrefixFloor.target_floor_certified
      && physicalPrefixFloor.physical_cover_prefix.retained_physical_covers.length === 1,
    "physical-cover prefix must certify a mandatory first-clear parking action while retaining the real cover"],
    [physicalPrefixBelowTarget.status === "inconclusive_physical_cover_prefix_event_below_target"
      && !physicalPrefixBelowTarget.target_floor_certified
      && physicalPrefixBelowTarget.counterexample.reposition_overhead_before_first_clear === 1,
    "a below-target first clear must refute only the prefix premise and remain inconclusive for the whole-level floor"],
    [physicalPrefixLayerEvent.status === "inconclusive_physical_cover_prefix_event_below_target"
      && physicalPrefixLayerEvent.counterexample.event === "layer_removal",
    "the physical-cover prefix goal must include a first visible layer peel, not only full body removal"],
    [physicalPrefixCap.status === "inconclusive_physical_cover_prefix_state_cap"
      && !physicalPrefixCap.target_floor_certified,
    "physical-cover prefix state cap must be inconclusive, never certified"],
    [physicalPrefixWrongBinding.status === "inconclusive_invalid_physical_cover_prefix_plan"
      && !physicalPrefixWrongBinding.target_floor_certified,
    "physical-cover prefix must require an exact LevelSpec SHA binding"],
    [exactTimedPrefixFloor.status === "floor_lower_bound_proven_by_exact_first_clear_prefix"
      && exactTimedPrefixFloor.target_floor_certified
      && exactTimedPrefixFloor.exact_first_clear_prefix.retained_generators.length === 1,
    "exact first-clear prefix must certify a timed-feeder parking pipeline using complete snapshots"],
    [exactTimedPrefixBelowTarget.status === "inconclusive_exact_first_clear_prefix_event_below_target"
      && !exactTimedPrefixBelowTarget.target_floor_certified
      && exactTimedPrefixBelowTarget.counterexample.reposition_overhead_before_first_clear === 2
      && exactTimedPrefixBelowTarget.counterexample.route_replay.first_clear_reached,
    "exact first-clear prefix must replay a below-target timed-feeder first-clear route"],
    [exactPrefixWrongBinding.status === "inconclusive_invalid_exact_first_clear_prefix_plan"
      && !exactPrefixWrongBinding.target_floor_certified,
    "exact first-clear prefix must require an exact LevelSpec SHA binding"],
    [official.solved && official.repositionOverhead === 1,
      "tiny PuzzleModel-frontier result must agree with levelSolver exact minimum"],
    [compactLevelSelection([1, 2, 3, 5, 7, 8, 8]) === "1-3,5,7-8",
      "100-level report selections must compact into Windows-safe range names"],
  ];
  const failed = checks.filter(([passed]) => !passed).map(([, message]) => message);
  if (failed.length) throw new Error(`Self-test failed: ${failed.join("; ")}`);
  return {
    self_test: "pass",
    checks: checks.length,
    statuses: {
      direct: directDisproof.status,
      mandatory_parking_floor: parkingProof.status,
      mandatory_parking_disproof: parkingDisproof.status,
      infinite_parking_floor: parkingRelaxedProof.status,
      infinite_parking_direct: directRelaxedInconclusive.status,
      key_lock: keyDisproof.status,
      lift: liftDisproof.status,
      physical_cover: coverDisproof.status,
      frozen_counters: frozenCountersDisproof.status,
      conveyor: conveyorDisproof.status,
      move_generator: moveGeneratorDisproof.status,
      timed_generator: timedGeneratorDisproof.status,
      blocked_timed_generator: blockedTimedGeneratorDisproof.status,
      axis: axisProof.status,
      cap: cap.status,
      memory_cap: memoryCap.status,
      multi_key: multiKeyDisproof.status,
      staging_layers: stagingDisproof.status,
      star_exit: starDisproof.status,
      unknown_field: unknownField.status,
      additive_cores: additiveCoreProof.status,
      overlapping_cores: overlappingCorePlan.status,
      queued_cargo_core: queuedCargoCorePlan.status,
      cross_stage_core: crossStageCorePlan.status,
      wrong_level_binding_core: wrongLevelBindingCorePlan.status,
      wrong_relaxed_binding_core: wrongRelaxedBindingCorePlan.status,
      physical_cover_prefix_floor: physicalPrefixFloor.status,
      physical_cover_prefix_below_target: physicalPrefixBelowTarget.status,
      physical_cover_prefix_layer_event: physicalPrefixLayerEvent.status,
      physical_cover_prefix_cap: physicalPrefixCap.status,
      physical_cover_prefix_wrong_binding: physicalPrefixWrongBinding.status,
      exact_timed_first_clear_prefix_floor: exactTimedPrefixFloor.status,
      exact_timed_first_clear_prefix_below_target: exactTimedPrefixBelowTarget.status,
      exact_first_clear_prefix_wrong_binding: exactPrefixWrongBinding.status,
    },
    exact_crosscheck: { proof_minimum: 1, level_solver_minimum: official.repositionOverhead },
    source_binding: sourceBinding,
    transition_semantics_matrix: transitionSemanticsMatrix,
  };
}

const csvEscape = (value) => {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

function markdownReport(report) {
  const lines = [
    "# Video-parity necessary-reposition floor proof",
    "",
    `- Input: \`${report.input.relative_path}\``,
    `- Input SHA-256: \`${report.input.sha256}\``,
    `- Campaign semantic SHA-256: \`${report.binding.campaign_level_specs_sha256}\``,
    `- PuzzleModel SHA-256: \`${report.binding.puzzle_model_sha256}\``,
    `- levelSolver SHA-256: \`${report.binding.level_solver_sha256}\``,
    "- Rule: a level passes only after every state reachable with fewer than its campaign floor is exhausted.",
    "- Limits: state/memory/time exhaustion is **inconclusive**, never pass.",
    `- Preserved user exclusion: ${report.summary.preserved_existing_level_ids.length ? report.summary.preserved_existing_level_ids.map((id) => `Lv${id}`).join(", ") : "none"}.`,
    "",
    "| Lv | floor | authored | status | states | transitions | counterexample | certified |",
    "|---:|---:|---:|---|---:|---:|---:|---|",
    ...report.levels.map((entry) => (
      `| ${entry.level_id} | ${entry.campaign_reposition_floor ?? "—"} | ${entry.authored_reposition_floor ?? "—"} | ${entry.status} | ${entry.explored_states ?? 0} | ${entry.generated_transitions ?? 0} | ${entry.counterexample?.reposition_overhead ?? "—"} | ${entry.target_floor_certified === null ? "n/a" : entry.target_floor_certified ? "yes" : "no"} |`
    )),
    "",
    "## Interpretation",
    "",
    "A completion route is only an upper bound. It disproves a requested floor when its internal-drag count is below that floor. A lower bound is reported only after exhaustive bounded-cost frontier exhaustion: for the complete level, for every member of a validated disjoint relaxed-core decomposition, or for an exact physical-cover first-clear prefix that every completion must cross. Each relaxed core must also have a replayed finite completion. Optional levelSolver routes never authorize certification.",
    "",
    "## Known fail-closed limitation",
    "",
    "Levels containing legacy autonomous elevators, frozen timed-feeder cargo, or unknown rule-bearing fields are marked inconclusive. Ordinary timed feeder waits are supported at exact event boundaries. The existing levelSolver is used only for optional upper-bound comparison because its timed-feeder search intentionally materializes ready cargo more aggressively than live PuzzleModel timing; every such route must replay through PuzzleModel.",
    "",
  ];
  return `${lines.join("\n")}\n`;
}

const options = await parseArgs(process.argv.slice(2));
if (options.selfTest) {
  console.log(JSON.stringify(runSelfTests(), null, 2));
  process.exit(0);
}

const selection = parseLevelSelection(options.levels);
const preserveExistingSelection = options.preserveExisting.toLowerCase() === "none"
  ? []
  : parseLevelSelection(options.preserveExisting);
const selectedSet = new Set(selection);
const preservedExistingSet = new Set(preserveExistingSelection.filter((id) => selectedSet.has(id)));
const input = await loadInput(options.input);
const inputSourceSha256 = sha256(input.inputText);
const allLevelSpecsSha256 = sha256(canonicalJson([...input.levels].sort((a, b) => a.id - b.id)));
const witnesses = await loadWitnesses(options.witnesses, options.input);
const corePlans = await loadCorePlans(options.corePlan);
const runtimeContractBinding = await loadRuntimeContractBinding(
  options.runtimeAudit,
  options.input,
  inputSourceSha256,
  allLevelSpecsSha256,
  options.expectedContractSha256,
  input.levels.length,
);
const levelsById = new Map(input.levels.map((level) => [level.id, level]));
const duplicateIds = input.levels.map((level) => level.id).filter((id, index, ids) => ids.indexOf(id) !== index);
if (duplicateIds.length) throw new Error(`Input contains duplicate level ids: ${[...new Set(duplicateIds)].join(", ")}`);
const results = [];

for (const levelId of selection) {
  const level = levelsById.get(levelId);
  if (!level) {
    results.push({
      level_id: levelId,
      status: "inconclusive_missing_level",
      campaign_reposition_floor: runtime.campaignRepositionFloor(levelId),
      lower_bound_statement_proven: false,
      target_floor_certified: false,
      explored_states: 0,
      generated_transitions: 0,
      counterexample: null,
    });
    console.log(`Lv${levelId}: missing -> inconclusive`);
    continue;
  }
  if (preservedExistingSet.has(levelId)) {
    const floor = runtime.campaignRepositionFloor(levelId);
    results.push({
      ...proofResultSkeleton(level, floor, options),
      status: "preserved_existing_user_exclusion",
      user_exclusion: true,
      proof_attempted: false,
        exclusion_reason: "Explicitly selected through --preserve-existing; no candidate search or lower-bound proof was attempted.",
      lower_bound_statement_proven: null,
      target_floor_certified: null,
      counterexample: null,
      explored_states: 0,
      generated_transitions: 0,
      provided_completion_witness: null,
      upper_bound_crosscheck: {
        run: false,
        role: "upper-bound-only; never a floor certificate",
        skipped: "preserved_existing_user_exclusion",
      },
      acceptance: {
        floor_proof: null,
        authored_floor_binding: null,
        playable_completion_upper_bound: null,
        combined_playable_floor_acceptance: null,
      },
    });
    console.log(`Lv${levelId}: preserved_existing_user_exclusion`);
    continue;
  }
  let proof;
  let providedWitness = null;
  try {
    const floor = runtime.campaignRepositionFloor(levelId);
    if (runtimeContractBinding.requested && !runtimeContractBinding.valid) {
      proof = {
        ...proofResultSkeleton(level, floor, options),
        status: "inconclusive_runtime_contract_binding",
        inconclusive_detail: runtimeContractBinding.error,
        lower_bound_statement_proven: false,
        target_floor_certified: false,
        counterexample: null,
        explored_states: 0,
        generated_transitions: 0,
      };
    } else {
      providedWitness = replayProvidedWitness(level, floor, witnesses.routes.get(levelId), options);
      // A fully replayed completion is a concrete counterexample even when
      // exhaustive search for this level would be unsupported. Unsupported
      // semantics can prevent certification; they cannot erase a witnessed
      // below-floor solution executed by the authoritative PuzzleModel.
      const proofPlan = corePlans.plans.get(levelId);
      proof = providedWitness?.below_campaign_floor
        ? witnessCounterexampleResult(level, floor, providedWitness, options)
        : proofPlan && !unsupportedReason(level)
          ? proofPlan.proofMethod === "physical_cover_prefix"
            ? proveFloorByPhysicalCoverPrefix(level, floor, proofPlan, options)
            : proofPlan.proofMethod === "exact_first_clear_prefix"
              ? proveFloorByExactFirstClearPrefix(level, floor, proofPlan, options)
              : proofPlan.proofMethod === "exact_gameplay_frontier" && proofPlan.groups.length === 0
                ? proveFloor(
                  level,
                  floor,
                  options,
                  symmetryContextFor(level, proofPlan.interchangeableBlockIdGroups),
                )
              : proveFloorByCorePlan(level, floor, proofPlan, options)
          : proveFloor(level, floor, options);
    }
  } catch (error) {
    proof = {
      ...proofResultSkeleton(level, runtime.campaignRepositionFloor(levelId), options),
      status: "inconclusive_invalid_level_or_runtime_error",
      inconclusive_detail: error.message,
      lower_bound_statement_proven: false,
      target_floor_certified: false,
      counterexample: null,
      explored_states: 0,
      generated_transitions: 0,
    };
  }
  proof.provided_completion_witness = providedWitness;
  try {
    proof.upper_bound_crosscheck = runtimeContractBinding.requested && !runtimeContractBinding.valid
      ? { run: false, role: "upper-bound-only; never a floor certificate", skipped: "runtime/contract binding invalid" }
      : unsupportedReason(level)
      ? { run: false, role: "upper-bound-only; never a floor certificate", skipped: "unsupported proof semantics" }
      : upperBoundCrosscheck(level, options.upperBoundMaxStates);
  } catch (error) {
    proof.upper_bound_crosscheck = {
      run: true,
      role: "upper-bound-only; never a floor certificate",
      accepted_upper_bound: false,
      error: error.message,
    };
  }
  const hasPlayabilityAttempt = Boolean(providedWitness || proof.upper_bound_crosscheck.run);
  const hasPlayableCompletion = Boolean(
    providedWitness?.accepted_upper_bound || proof.upper_bound_crosscheck.accepted_upper_bound
  );
  proof.acceptance = {
    floor_proof: proof.target_floor_certified,
    authored_floor_binding: proof.authored_floor_matches_campaign,
    playable_completion_upper_bound: hasPlayabilityAttempt ? hasPlayableCompletion : null,
    combined_playable_floor_acceptance: hasPlayabilityAttempt
      ? Boolean(proof.target_floor_certified
        && proof.authored_floor_matches_campaign !== false
        && hasPlayableCompletion)
      : null,
  };
  results.push(proof);
  console.log(`Lv${levelId}: floor=${proof.campaign_reposition_floor ?? "—"}, ${proof.status}, states=${proof.explored_states ?? 0}, counterexample=${proof.counterexample?.reposition_overhead ?? "—"}`);
}

const bindingDrift = [];
for (const [name, path] of Object.entries(sourcePaths)) {
  const current = sha256(await readFile(path));
  const expected = sourceBinding[`${name === "puzzleModel" ? "puzzle_model"
    : name === "levelSolver" ? "level_solver"
      : name === "blockShape" ? "block_shape"
      : name === "floors" ? "campaign_floor_source"
        : name}_sha256`];
  if (current !== expected) bindingDrift.push({ source: relative(root, path).replaceAll("\\", "/"), expected, current });
}
const currentToolSha = sha256(await readFile(scriptPath));
if (currentToolSha !== sourceBinding.proof_tool_sha256) {
  bindingDrift.push({ source: relative(root, scriptPath).replaceAll("\\", "/"), expected: sourceBinding.proof_tool_sha256, current: currentToolSha });
}
const currentInputSha = sha256(await readFile(options.input));
if (currentInputSha !== sha256(input.inputText)) {
  bindingDrift.push({ source: relative(root, options.input).replaceAll("\\", "/"), expected: sha256(input.inputText), current: currentInputSha });
}
if (witnesses.path) {
  const currentWitnessSha = sha256(await readFile(witnesses.path));
  if (currentWitnessSha !== witnesses.sha256) {
    bindingDrift.push({ source: relative(root, witnesses.path).replaceAll("\\", "/"), expected: witnesses.sha256, current: currentWitnessSha });
  }
}
if (corePlans.path) {
  const currentCorePlanSha = sha256(await readFile(corePlans.path));
  if (currentCorePlanSha !== corePlans.sha256) {
    bindingDrift.push({
      source: relative(root, corePlans.path).replaceAll("\\", "/"),
      expected: corePlans.sha256,
      current: currentCorePlanSha,
    });
  }
}
if (runtimeContractBinding.path) {
  const currentAuditSha = sha256(await readFile(runtimeContractBinding.path));
  if (currentAuditSha !== runtimeContractBinding.sha256) {
    bindingDrift.push({
      source: relative(root, runtimeContractBinding.path).replaceAll("\\", "/"),
      expected: runtimeContractBinding.sha256,
      current: currentAuditSha,
    });
  }
}
if (runtimeContractBinding.contract_path && runtimeContractBinding.contract_sha256) {
  const currentContractSha = sha256(await readFile(runtimeContractBinding.contract_path));
  if (currentContractSha !== runtimeContractBinding.contract_sha256) {
    bindingDrift.push({
      source: relative(root, runtimeContractBinding.contract_path).replaceAll("\\", "/"),
      expected: runtimeContractBinding.contract_sha256,
      current: currentContractSha,
    });
  }
}
if (bindingDrift.length) {
  for (const result of results) {
    if (result.campaign_reposition_floor === null || result.status === "preserved_existing_user_exclusion") continue;
    result.pre_binding_drift_status = result.status;
    result.status = "inconclusive_binding_drift_during_run";
    result.lower_bound_statement_proven = false;
    result.target_floor_certified = false;
    if (result.acceptance) {
      result.acceptance.floor_proof = false;
      result.acceptance.combined_playable_floor_acceptance = false;
    }
  }
}

const binding = {
  ...sourceBinding,
  campaign_level_specs_sha256: allLevelSpecsSha256,
  selected_level_specs_sha256: sha256(canonicalJson(selection.map((id) => levelsById.get(id) ?? { missing: id }))),
  stable_at_post_search_check: bindingDrift.length === 0,
  drift: bindingDrift,
  runtime_contract: runtimeContractBinding,
};
const proofScopeResults = results.filter((entry) => entry.status !== "preserved_existing_user_exclusion");
const summary = {
  binding_stable_at_post_search_check: bindingDrift.length === 0,
  runtime_contract_binding_valid: runtimeContractBinding.valid,
  selected: selection.length,
  proof_scope_selected: selection.length - preservedExistingSet.size,
  preserved_existing_user_exclusion: preservedExistingSet.size,
  preserved_existing_level_ids: [...preservedExistingSet].sort((left, right) => left - right),
  available: results.filter((entry) => entry.status !== "inconclusive_missing_level").length,
  applicable: proofScopeResults.filter((entry) => entry.campaign_reposition_floor !== null).length,
  floor_proven: proofScopeResults.filter((entry) => entry.status.startsWith("floor_lower_bound_proven")).length,
  floor_disproven: proofScopeResults.filter((entry) => entry.status === "floor_disproven_counterexample").length,
  inconclusive: proofScopeResults.filter((entry) => entry.status.startsWith("inconclusive_")).length,
  not_applicable: proofScopeResults.filter((entry) => entry.status.startsWith("not_applicable_")).length,
  authored_floor_mismatches: proofScopeResults.filter((entry) => entry.authored_floor_matches_campaign === false).length,
  replayed_playability_upper_bounds: proofScopeResults.filter((entry) => (
    entry.provided_completion_witness?.accepted_upper_bound || entry.upper_bound_crosscheck?.accepted_upper_bound
  )).length,
  combined_playable_floor_acceptance: options.upperBoundMaxStates > 0 || witnesses.routes.size > 0
    ? proofScopeResults.filter((entry) => entry.campaign_reposition_floor !== null)
      .every((entry) => entry.acceptance?.combined_playable_floor_acceptance)
    : null,
  all_applicable_floors_certified: proofScopeResults.filter((entry) => entry.campaign_reposition_floor !== null)
    .every((entry) => entry.target_floor_certified && entry.authored_floor_matches_campaign !== false),
};
const report = {
  schema: "blockout-video-parity-reposition-floor-proof-v1",
  generated_at: new Date().toISOString(),
  proof_contract: {
    campaign_floor_authority: "campaignRepositionFloor(level.id)",
    cost: { exit_or_layer_clear_drag: 0, committed_internal_drag: 1, timed_wait: 0 },
    timer_relaxation: "drag/thinking duration is zero; only explicit timed-feeder event waits consume time. This adds routes and is therefore conservative for a lower-bound proof.",
    certification_rule: "exhaust every reachable state with reposition cost < floor",
    additive_core_rule: "optionally exhaust every state below each requested relaxed-core floor; only same-stage, non-overlapping block groups may add, and each core also needs a replayed finite completion",
    physical_cover_prefix_rule: "an explicitly SHA-bound physical_cover_prefix plan retains the complete authored initial PuzzleModel state and proves the whole floor only after exhausting every state below the floor without a first layer/body clear; autonomous mechanisms fail closed",
    exact_first_clear_prefix_rule: "an explicitly SHA-bound exact_first_clear_prefix plan retains complete PuzzleModel snapshots, including supported timed-generator events, and proves the whole floor only after exhausting every state below the floor without a first layer/body clear",
    preserved_existing_rule: "Only levels explicitly supplied through --preserve-existing are reported as preserved_existing_user_exclusion; the default excludes none.",
    upper_bound_rule: "a completion route never proves a floor; below-floor completion disproves it",
    cap_rule: "state, memory, time, unsupported semantics, and transition errors are inconclusive",
    transition_authority: "PuzzleModel mutation; PuzzleModel canPlace/isBlockActive enumeration",
    level_solver_comparison: "tiny non-timed exact minima are cross-checked in --self-test; campaign solver routes are upper-bound evidence only and must replay through PuzzleModel",
    timed_wait_rule: "after gameplay start, enumerate exact next PuzzleModel timed-generator event boundary at zero reposition cost",
    unsupported: [
      "legacy autonomous elevator continuous phase interleavings",
      "frozen timed-generator cargo whose thaw timing can depend on a mid-drag feeder event",
      "unknown LevelSpec/mechanic fields (fail closed)",
    ],
  },
  transition_semantics_matrix: transitionSemanticsMatrix,
  input: {
    path: options.input,
    relative_path: relative(root, options.input).replaceAll("\\", "/"),
    sha256: sha256(input.inputText),
    bundled_module_sha256: input.inputBundleSha256 ?? null,
    selected_export: input.exportName,
    level_count: input.levels.length,
    witnesses: {
      path: witnesses.path,
      relative_path: witnesses.path ? relative(root, witnesses.path).replaceAll("\\", "/") : null,
      sha256: witnesses.sha256,
      route_count: witnesses.routes.size,
    },
    core_plans: {
      path: corePlans.path,
      relative_path: corePlans.path ? relative(root, corePlans.path).replaceAll("\\", "/") : null,
      sha256: corePlans.sha256,
      level_count: corePlans.plans.size,
    },
  },
  binding,
  limits: {
    max_states_per_level: options.maxStates,
    max_memory_mb_process_rss: options.maxMemoryMb,
    max_seconds_per_level: options.maxSeconds,
    upper_bound_max_states: options.upperBoundMaxStates,
    core_upper_bound_max_states: options.coreUpperBoundMaxStates,
    preserved_existing_selection: [...preservedExistingSet].sort((left, right) => left - right),
  },
  summary,
  levels: results,
};

if (options.write) {
  await mkdir(options.outputDir, { recursive: true });
  const selectionTag = compactLevelSelection(selection).replace(/[^a-zA-Z0-9_-]+/g, "-");
  const inferredTag = basename(options.input, extname(options.input)).replace(/[^a-zA-Z0-9_-]+/g, "-");
  const stem = `reposition-floor-proof-${options.tag ?? inferredTag}-${selectionTag}`;
  const jsonPath = resolve(options.outputDir, `${stem}.json`);
  const csvPath = resolve(options.outputDir, `${stem}.csv`);
  const mdPath = resolve(options.outputDir, `${stem}.md`);
  const columns = [
    "level_id", "campaign_reposition_floor", "authored_reposition_floor", "authored_floor_matches_campaign",
    "status", "lower_bound_statement_proven", "target_floor_certified", "explored_states", "visited_states",
    "generated_transitions", "peak_frontier", "peak_rss_mb", "elapsed_ms", "counterexample_reposition_overhead",
    "level_spec_sha256",
  ];
  const csv = [
    columns.join(","),
    ...results.map((entry) => columns.map((column) => csvEscape(
      column === "counterexample_reposition_overhead" ? entry.counterexample?.reposition_overhead : entry[column]
    )).join(",")),
  ].join("\n");
  await Promise.all([
    writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8"),
    writeFile(csvPath, `${csv}\n`, "utf8"),
    writeFile(mdPath, markdownReport(report), "utf8"),
  ]);
  console.log(JSON.stringify({ summary, reports: [jsonPath, csvPath, mdPath] }, null, 2));
} else {
  console.log(JSON.stringify({ summary, binding }, null, 2));
}

if (!summary.all_applicable_floors_certified || summary.inconclusive > 0 || summary.floor_disproven > 0) {
  process.exitCode = 2;
}
