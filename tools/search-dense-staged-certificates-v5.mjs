import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const GENERATOR = resolve(ROOT, "tools/generate-competitor-constrained-levels.mjs");
const ALLOCATION_SEARCH = resolve(ROOT, "tools/search-stage-floor-allocation-v5.mjs");
const CONTRACT_RELATIVE = "deliverables/level-generation-blueprint/blockout-lv001-lv100-expanded-density-contract-v5.json";
const PLAN_RELATIVE = "playtest-results/experiments/competitor-composition-r141/density-and-staging-plan.json";

const args = process.argv.slice(2);
const optional = (name, fallback = null) => {
  const index = args.indexOf(name);
  return index < 0 ? fallback : args[index + 1];
};
const required = (name) => {
  const value = optional(name);
  if (!value) throw new Error(`${name} is required`);
  return value;
};
const parseIds = (specification) => {
  const ids = new Set();
  for (const token of specification.split(",").map((part) => part.trim()).filter(Boolean)) {
    const match = token.match(/^(\d+)(?:-(\d+))?$/);
    if (!match) throw new Error(`Invalid level selection: ${token}`);
    const from = Number(match[1]);
    const to = Number(match[2] ?? match[1]);
    if (!Number.isSafeInteger(from) || !Number.isSafeInteger(to) || from < 1 || to > 100 || from > to) {
      throw new Error(`Invalid level range: ${token}`);
    }
    for (let id = from; id <= to; id += 1) ids.add(id);
  }
  return [...ids].sort((left, right) => left - right);
};
const numeric = (name, fallback) => {
  const value = Number(optional(name, String(fallback)));
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer`);
  return value;
};
const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const stableValue = (value) => {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  }
  return value;
};
const stableJson = (value) => JSON.stringify(stableValue(value));

const ids = parseIds(required("--levels"));
const outputDir = resolve(ROOT, required("--output-dir"));
const seedFrom = numeric("--seed-from", 1);
const seedTo = numeric("--seed-to", seedFrom);
const trials = numeric("--trials", 120);
const trialStart = Number(optional("--trial-start", "0"));
if (!Number.isSafeInteger(trialStart) || trialStart < 0) throw new Error("--trial-start must be a non-negative integer");
const validationCap = numeric("--validation-cap", 120_000);
const maxStates = numeric("--max-states", 300_000);
const maxAttempts = numeric("--max-allocation-attempts", 40);
const freezeVariants = Number(optional("--freeze-variants", "0"));
if (!Number.isSafeInteger(freezeVariants) || freezeVariants < 0) throw new Error("--freeze-variants must be a non-negative integer");
const gateLayoutJitter = Number(optional("--gate-layout-jitter", "1500"));
if (!Number.isSafeInteger(gateLayoutJitter) || gateLayoutJitter < 0) throw new Error("--gate-layout-jitter must be a non-negative integer");
const stageScreenCap = Number(optional("--stage-screen-cap", "1000"));
if (!Number.isSafeInteger(stageScreenCap) || stageScreenCap < 0) throw new Error("--stage-screen-cap must be a non-negative integer");
const optimizeStageColors = args.includes("--optimize-stage-colors");
const allowStageColorSubsets = args.includes("--allow-stage-color-subsets");
const duplicateGateCount = Number(optional("--duplicate-gates", "0"));
if (!Number.isSafeInteger(duplicateGateCount) || duplicateGateCount < 0) throw new Error("--duplicate-gates must be a non-negative integer");
const fixedGateLayout = optional("--fixed-gate-layout");
const fixedStagePartition = optional("--fixed-stage-partition");
const recombineStageVariants = args.includes("--recombine-stage-variants");
const recombineStageVariantLimit = numeric("--recombine-stage-variant-limit", 48);
const exactColorVariants = Number(optional("--exact-color-variants", "0"));
if (!Number.isSafeInteger(exactColorVariants) || exactColorVariants < 0) throw new Error("--exact-color-variants must be a non-negative integer");
const exactColorCap = numeric("--exact-color-cap", 3_000);
const keepBestUnderFloor = args.includes("--keep-best-under-floor");
const relaxedBoundPruning = args.includes("--relaxed-bound-pruning");
const relaxedBoundMaxStates = numeric("--relaxed-bound-max-states", 5_000);
const configuredOwnMouth = optional("--desired-own-mouth");
if (configuredOwnMouth !== null
  && (!Number.isSafeInteger(Number(configuredOwnMouth)) || Number(configuredOwnMouth) < 0)) {
  throw new Error("--desired-own-mouth must be a non-negative integer");
}
const forceNonstaged = args.includes("--force-nonstaged");
const forceStageCountOverride = args.includes("--forced-stage-count");
const MAX_DENSE_STAGE_BATCH_COUNT = 6;
const forcedStageCount = Math.min(MAX_DENSE_STAGE_BATCH_COUNT, numeric("--forced-stage-count", 2));
if (seedTo < seedFrom) throw new Error("--seed-to must be >= --seed-from");

const contractPath = resolve(ROOT, CONTRACT_RELATIVE);
const planPath = resolve(ROOT, PLAN_RELATIVE);
const contract = JSON.parse(await readFile(contractPath, "utf8"));
const plan = JSON.parse(await readFile(planPath, "utf8"));
const contractByNumber = new Map(contract.levels.map((entry) => [Number(entry.level_id.slice(2)), entry]));
const planByNumber = new Map(plan.levels.map((entry) => [entry.level_number, entry]));

const run = (commandArgs, environment = process.env) => new Promise((resolveRun, rejectRun) => {
  const child = spawn(process.execPath, commandArgs, {
    cwd: ROOT,
    env: environment,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
  child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
  child.on("error", rejectRun);
  child.on("close", (code, signal) => resolveRun({ code, signal, stdout, stderr }));
});

const stageQuality = (candidate, expected) => {
  const level = candidate.level;
  const shutters = [...(level.shutters ?? [])]
    .filter((shutter) => shutter.skin === "staging")
    .sort((left, right) => left.count - right.count || left.id.localeCompare(right.id));
  const groups = [
    level.blocks.filter((block) => !block.shutterId),
    ...shutters.map((shutter) => level.blocks.filter((block) => block.shutterId === shutter.id)),
  ];
  const playableCount = level.playable?.length ?? level.width * level.height;
  const observed = groups.map((blocks) => ({
    block_count: blocks.length,
    occupied_cells: blocks.reduce((sum, block) => sum + block.shape.length, 0),
    density: Number((blocks.reduce((sum, block) => sum + block.shape.length, 0) / playableCount).toFixed(4)),
  }));
  const expectedCount = expected?.staging_plan?.batch_count ?? expected?.staging_plan?.batches?.length ?? null;
  const errors = [];
  if (shutters.length !== (level.shutters?.length ?? 0)) errors.push("non-staging shutter present");
  if (groups.length < 2 || groups.length > MAX_DENSE_STAGE_BATCH_COUNT) {
    errors.push(`stage count ${groups.length} is outside 2..${MAX_DENSE_STAGE_BATCH_COUNT}`);
  }
  // The blueprint count is the minimum batch count required by occupied-cell
  // capacity. A generator may use additional dense batches (up to six) when
  // the shared control cell or a high necessary-reposition floor needs more
  // independent empty-board phases; using fewer than the blueprint is invalid.
  if (expectedCount !== null && groups.length < expectedCount) errors.push(`stage count ${groups.length} < plan minimum ${expectedCount}`);
  const minimumBlocksPerBatch = Number(level.id ?? 1) >= 21 || groups.length > 4 ? 4 : 2;
  if (groups.some((group) => group.length < minimumBlocksPerBatch)) {
    errors.push(`stage below ${minimumBlocksPerBatch} blocks`);
  }
  if (observed[0].density < 0.5) errors.push(`opening density ${observed[0].density} < 0.5`);
  return { pass: errors.length === 0, errors, expected_stage_count: expectedCount, stages: observed };
};

await mkdir(outputDir, { recursive: true });
const accepted = [];
const rows = [];

for (const id of ids) {
  const levelId = `Lv${String(id).padStart(3, "0")}`;
  const contractEntry = contractByNumber.get(id);
  if (!contractEntry) throw new Error(`${levelId} is missing from v5 contract`);
  if (!contractEntry.our_design_target.requires_staged_reveal && !forceNonstaged) {
    rows.push({ level_id: levelId, status: "skipped_nonstaged" });
    console.log(`${levelId}: skipped (nonstaged)`);
    continue;
  }
  let winner = null;
  const attempts = [];
  for (let seed = seedFrom; seed <= seedTo && !winner; seed += 1) {
    const attemptDir = resolve(outputDir, levelId, `seed-${String(seed).padStart(3, "0")}`);
    await mkdir(attemptDir, { recursive: true });
    const relativeAttempt = relative(ROOT, attemptDir).replaceAll("\\", "/");
    console.log(`${levelId}: generating seed ${seed}`);
    const generated = await run(["--expose-gc", GENERATOR], {
      ...process.env,
      FORMAL_CONTRACT_RELATIVE: CONTRACT_RELATIVE,
      FORMAL_GENERATED_RELATIVE: `${relativeAttempt}/competitorConstrainedLevels.generated.ts`,
      FORMAL_REPORT_DIR_RELATIVE: relativeAttempt,
      FORMAL_LEVEL_IDS: String(id),
      FORMAL_GENERATE_IDS: String(id),
      FORMAL_TRIALS: String(trials),
      FORMAL_TRIAL_START: String(trialStart),
      FORMAL_SEED_OFFSET: String(seed),
      FORMAL_VALIDATION_CAP: String(validationCap),
      FORMAL_STAGE_DENSITY: "1",
      FORMAL_STAGING_SKIN: "staging",
      FORMAL_DENSE_REPACK_LEVEL_IDS: "",
      FORMAL_MAXIMIZE_FOREIGN: "1",
      FORMAL_PACK_PREFER_EDGES: seed % 2 === 1 ? "1" : "0",
      FORMAL_REPACK: "1",
      FORMAL_BALANCED_REPACK: "1",
      FORMAL_TARGET_STAGE_BATCH_COUNT: String(
        planByNumber.get(id)?.staging_plan?.required_stage_batch_count
          ?? planByNumber.get(id)?.staging_plan?.batches?.length
          ?? 2,
      ),
      FORMAL_STAGED_DESIRED_OWN_MOUTH: String(configuredOwnMouth ?? seed % 3),
      FORMAL_GATE_LAYOUT_JITTER: String(gateLayoutJitter),
      FORMAL_EXTERNAL_STRICT_SEARCH: "1",
      FORMAL_STAGE_SCREEN_CAP: String(stageScreenCap),
      FORMAL_OPTIMIZE_STAGE_COLORS: optimizeStageColors ? "1" : "0",
      FORMAL_ALLOW_STAGE_COLOR_SUBSETS: allowStageColorSubsets ? "1" : "0",
      FORMAL_DUPLICATE_GATE_COUNT: String(duplicateGateCount),
      FORMAL_FIXED_GATE_LAYOUT_PATH: fixedGateLayout ?? "",
      FORMAL_FIXED_STAGE_PARTITION_PATH: fixedStagePartition ?? "",
      FORMAL_RECOMBINE_STAGE_VARIANTS: recombineStageVariants ? "1" : "0",
      FORMAL_RECOMBINE_STAGE_VARIANT_LIMIT: String(recombineStageVariantLimit),
      FORMAL_EXACT_COLOR_VARIANTS: String(exactColorVariants),
      FORMAL_EXACT_COLOR_CAP: String(exactColorCap),
      FORMAL_KEEP_BEST_UNDER_FLOOR: keepBestUnderFloor ? "1" : "0",
      FORMAL_STRICT_FREEZE_VARIANTS: String(freezeVariants),
      FORMAL_FORCE_STAGE_IDS: forceNonstaged || forceStageCountOverride ? String(id) : "",
      FORMAL_FORCE_STAGE_BATCH_COUNT: String(forcedStageCount),
      FORMAL_STRICT_ACCEPT: "0",
    });
    const attempt = { seed, generator_exit_code: generated.code, generator_signal: generated.signal, generator_stderr: generated.stderr.trim() };
    if (generated.code !== 0) {
      attempt.status = "generator_failed";
      attempts.push(attempt);
      console.log(`${levelId}: seed ${seed} generator failed`);
      continue;
    }
    const candidatePath = resolve(attemptDir, "formal-candidates.json");
    const artifact = JSON.parse(await readFile(candidatePath, "utf8"));
    const candidate = artifact.levels?.find((entry) => entry.level_id === levelId);
    if (!candidate) {
      attempt.status = "missing_candidate";
      attempts.push(attempt);
      continue;
    }
    if (forceNonstaged && !contractEntry.our_design_target.requires_staged_reveal) {
      candidate.audit = {
        ...(candidate.audit ?? {}),
        approved_solver_staging_override: "v5_nonstaged_floor_guarantee",
      };
      await writeFile(candidatePath, `${JSON.stringify({ ...artifact, levels: artifact.levels.map((entry) => (
        entry.level_id === levelId ? candidate : entry
      )) }, null, 2)}\n`, "utf8");
    }
    const expectedPlan = forceNonstaged && !contractEntry.our_design_target.requires_staged_reveal
      ? { staging_plan: { batch_count: forcedStageCount } }
      : planByNumber.get(id);
    const quality = stageQuality(candidate, expectedPlan);
    attempt.stage_quality = quality;
    attempt.candidate_sha256 = sha256(stableJson(candidate.level));
    if (!quality.pass) {
      attempt.status = "quality_rejected";
      attempts.push(attempt);
      console.log(`${levelId}: seed ${seed} quality rejected: ${quality.errors.join("; ")}`);
      continue;
    }
    const allocationDir = resolve(attemptDir, "allocation");
    console.log(`${levelId}: proving seed ${seed}`);
    const allocationArgs = [
      ALLOCATION_SEARCH,
      "--input", candidatePath,
      "--output-dir", allocationDir,
      "--level", String(id),
      "--max-states", String(maxStates),
      "--max-attempts", String(maxAttempts),
    ];
    if (relaxedBoundPruning) allocationArgs.push(
      "--relaxed-bound-pruning",
      "--relaxed-bound-root-only",
      "--relaxed-bound-max-states", String(relaxedBoundMaxStates),
    );
    const proved = await run(allocationArgs);
    let allocation;
    try {
      allocation = JSON.parse(await readFile(resolve(allocationDir, "stage-floor-allocation-search.json"), "utf8"));
    } catch {
      attempt.status = proved.code === 0 ? "missing_allocation_report" : "witness_capacity_below_target_or_proof_failed";
      attempt.proof_exit_code = proved.code;
      attempt.proof_signal = proved.signal;
      attempt.proof_stderr = proved.stderr.trim();
      attempts.push(attempt);
      console.log(`${levelId}: seed ${seed} not certified (${attempt.status})`);
      continue;
    }
    attempt.status = allocation.status;
    attempt.proof_exit_code = proved.code;
    attempt.proof_signal = proved.signal;
    attempt.allocation = {
      target: allocation.target,
      capacities: allocation.capacities,
      certified_lower_bounds: allocation.certified_lower_bounds,
      counterexample_upper_bounds: allocation.counterexample_upper_bounds,
      attempts: allocation.attempts?.length ?? 0,
    };
    attempts.push(attempt);
    if (allocation.status === "accepted" && proved.code === 0) {
      const acceptedArtifact = JSON.parse(await readFile(resolve(allocationDir, "strict-accepted-candidates.json"), "utf8"));
      const acceptedCandidate = acceptedArtifact.levels?.[0];
      if (!acceptedCandidate) throw new Error(`${levelId} accepted without a persisted candidate`);
      winner = {
        ...acceptedCandidate,
        dense_certificate_search: {
          seed,
          candidate_source: relative(ROOT, candidatePath).replaceAll("\\", "/"),
          allocation_audit: relative(ROOT, resolve(allocationDir, "stage-floor-allocation-search.json")).replaceAll("\\", "/"),
          candidate_sha256: attempt.candidate_sha256,
          stage_quality: quality,
        },
      };
      accepted.push(winner);
      console.log(`${levelId}: ACCEPTED seed ${seed}`);
    } else {
      console.log(`${levelId}: seed ${seed} not certified (${allocation.status})`);
    }
  }
  rows.push({
    level_id: levelId,
    status: winner ? "accepted" : "unresolved",
    accepted_seed: winner?.dense_certificate_search.seed ?? null,
    attempts,
  });
  await writeFile(resolve(outputDir, "search-progress.json"), `${JSON.stringify({
    schema_version: "blockout-v5-dense-staged-certificate-search-1",
    contract: CONTRACT_RELATIVE,
    contract_sha256: sha256(await readFile(contractPath)),
    requested_levels: ids,
    rows,
    levels: accepted,
  }, null, 2)}\n`, "utf8");
}

const report = {
  schema_version: "blockout-v5-dense-staged-certificate-search-1",
  generated_at: new Date().toISOString(),
  applied_to_live_campaign: false,
  contract: CONTRACT_RELATIVE,
  contract_sha256: sha256(await readFile(contractPath)),
  plan: PLAN_RELATIVE,
  configuration: { seed_from: seedFrom, seed_to: seedTo, trials, trial_start: trialStart, validation_cap: validationCap, max_states: maxStates, force_nonstaged: forceNonstaged, forced_stage_count: forcedStageCount, gate_layout_jitter: gateLayoutJitter, stage_screen_cap: stageScreenCap, optimize_stage_colors: optimizeStageColors, allow_stage_color_subsets: allowStageColorSubsets, duplicate_gate_count: duplicateGateCount, fixed_gate_layout: fixedGateLayout, fixed_stage_partition: fixedStagePartition, recombine_stage_variants: recombineStageVariants, recombine_stage_variant_limit: recombineStageVariantLimit, exact_color_variants: exactColorVariants, exact_color_cap: exactColorCap, keep_best_under_floor: keepBestUnderFloor },
  counts: {
    requested: ids.length,
    accepted: rows.filter((row) => row.status === "accepted").length,
    unresolved: rows.filter((row) => row.status === "unresolved").length,
    skipped_nonstaged: rows.filter((row) => row.status === "skipped_nonstaged").length,
  },
  rows,
  levels: accepted,
};
await writeFile(resolve(outputDir, "strict-accepted-candidates.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
await writeFile(resolve(outputDir, "search-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  output: relative(ROOT, outputDir).replaceAll("\\", "/"),
  counts: report.counts,
  unresolved: rows.filter((row) => row.status === "unresolved").map((row) => row.level_id),
}, null, 2));
if (report.counts.unresolved) process.exitCode = 1;
