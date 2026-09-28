import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DEFAULT_SOURCE =
  "deliverables/level-generation-blueprint/blockout-lv001-lv100-competitor-constrained-design-contract-v4.json";
const DEFAULT_PLAN =
  "playtest-results/experiments/competitor-composition-r141/density-and-staging-plan.json";
const DEFAULT_V5_CANDIDATES = [
  "deliverables/level-generation-blueprint/blockout-lv001-lv100-expanded-density-contract-v5.json",
  "deliverables/level-generation-blueprint/blockout-lv001-lv100-competitor-constrained-design-contract-v5.json",
  "playtest-results/experiments/competitor-composition-r141/competitor-constrained-design-contract-v5.json",
];
const SHAPE_AREA = {
  SINGLE: 1,
  H2: 2,
  V2: 2,
  H3: 3,
  V3: 3,
  SQ2: 4,
  L3: 3,
  T4: 4,
  L4: 4,
  CROSS5: 5,
  RECT2X3: 6,
  SQ3: 9,
};
const SEGMENT_BASELINES = [24, 28, 32, 36];
const WAVE_OFFSETS = [0, 1, 2, 2, 3];
const MAX_SHAPE_RATIO_DELTA = 0.08;
const MAX_SHAPE_TOTAL_VARIATION = 0.1;

function argument(name) {
  const exact = process.argv.indexOf(name);
  if (exact >= 0) return process.argv[exact + 1] ?? null;
  const prefix = `${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? null;
}

const sourceRelative = argument("--source") ?? DEFAULT_SOURCE;
const planRelative = argument("--plan") ?? DEFAULT_PLAN;
const explicitContract = argument("--contract");
const strictFinalCountPeaks = process.argv.includes("--strict-final-count-peaks");
const sourcePath = path.resolve(ROOT, sourceRelative);
const planPath = path.resolve(ROOT, planRelative);

const errors = [];
const advisories = [];
const checks = { plan: 0, contract: 0 };
const check = (condition, message, scope = "plan") => {
  checks[scope] += 1;
  if (!condition) errors.push(message);
};
const advise = (condition, message) => {
  if (!condition) advisories.push(message);
};
const canonical = (value) => JSON.stringify(value);
const levelNumber = (level) => Number(String(level.level_id).replace(/^Lv/i, ""));
const histogramCount = (histogram) =>
  Object.values(histogram ?? {}).reduce((sum, count) => sum + count, 0);
const histogramArea = (histogram, scope = "plan", levelId = "unknown") =>
  Object.entries(histogram ?? {}).reduce((sum, [shape, count]) => {
    check(Boolean(SHAPE_AREA[shape]), `${levelId}: unknown shape ${shape}.`, scope);
    return sum + (SHAPE_AREA[shape] ?? 0) * count;
  }, 0);
const maskCells = (mask) =>
  (mask ?? []).reduce(
    (sum, row) => sum + [...row].filter((cell) => cell === "#").length,
    0,
  );
const sha256 = (buffer) =>
  crypto.createHash("sha256").update(buffer).digest("hex").toUpperCase();

function scheduleForLevel(number) {
  const segmentIndex = Math.floor((number - 21) / 20);
  const index = (number - 21) % 20;
  const group = Math.floor(index / 5);
  const position = index % 5;
  return {
    minimum: SEGMENT_BASELINES[segmentIndex] + group + WAVE_OFFSETS[position],
    position,
  };
}

function byLevel(levels) {
  return new Map((levels ?? []).map((level) => [levelNumber(level), level]));
}

function shapeRatioMetrics(original, candidate) {
  const originalTotal = histogramCount(original);
  const candidateTotal = histogramCount(candidate);
  let maxAbsoluteDelta = 0;
  let absoluteDeltaSum = 0;
  for (const shape of Object.keys(original)) {
    const delta = Math.abs(
      original[shape] / originalTotal - candidate[shape] / candidateTotal,
    );
    maxAbsoluteDelta = Math.max(maxAbsoluteDelta, delta);
    absoluteDeltaSum += delta;
  }
  return {
    maxAbsoluteDelta,
    totalVariation: absoluteDeltaSum / 2,
  };
}

check(fs.existsSync(sourcePath), `Missing source contract: ${sourceRelative}`);
check(fs.existsSync(planPath), `Missing density/staging plan: ${planRelative}`);
if (errors.length > 0) {
  console.error(JSON.stringify({ status: "failed", errors }, null, 2));
  process.exit(1);
}

const sourceBuffer = fs.readFileSync(sourcePath);
const source = JSON.parse(sourceBuffer.toString("utf8"));
const plan = JSON.parse(fs.readFileSync(planPath, "utf8"));
const sourceLevels = byLevel(source.levels);
const planLevels = byLevel(plan.levels);
const planContractRelative = explicitContract
  ?? DEFAULT_V5_CANDIDATES.find((candidate) => fs.existsSync(path.resolve(ROOT, candidate)));
check(Boolean(planContractRelative), "Missing v5 contract for staging-policy verification.");
const planContract = planContractRelative
  ? JSON.parse(fs.readFileSync(path.resolve(ROOT, planContractRelative), "utf8"))
  : { levels: [] };
const planContractLevels = byLevel(planContract.levels);

check(plan.schema_version === "blockout-v5-density-staging-plan-1", "Unexpected plan schema version.");
check(plan.scope?.first_level === 21 && plan.scope?.last_level === 100, "Plan scope must be Lv21-Lv100.");
check(planLevels.size === 80, `Plan must contain 80 unique levels; received ${planLevels.size}.`);
check(plan.source_contract?.sha256 === sha256(sourceBuffer), "Plan source SHA-256 no longer matches the v4 contract.");

for (let number = 21; number <= 100; number += 1) {
  const sourceLevel = sourceLevels.get(number);
  const plannedLevel = planLevels.get(number);
  check(Boolean(sourceLevel), `Lv${number}: missing from v4 source.`);
  check(Boolean(plannedLevel), `Lv${number}: missing from plan.`);
  if (!sourceLevel || !plannedLevel) continue;

  const id = sourceLevel.level_id;
  const original = sourceLevel.our_design_target;
  const locked = planContractLevels.get(number)?.our_design_target;
  check(Boolean(locked), `${id}: missing from the v5 contract.`);
  if (!locked) continue;
  const schedule = scheduleForLevel(number);
  const expectedCount = Math.max(original.full_level_block_count, schedule.minimum);
  const plannedComposition = plannedLevel.v5_composition_plan;
  const staging = plannedLevel.staging_plan;

  check(plannedLevel.board_lock.rows === original.board.rows, `${id}: plan changed board.rows.`);
  check(plannedLevel.board_lock.cols === original.board.cols, `${id}: plan changed board.cols.`);
  check(
    plannedLevel.board_lock.playable_cell_count === original.board.playable_cell_count,
    `${id}: plan changed playable_cell_count.`,
  );
  check(
    canonical(plannedLevel.board_lock.playable_mask) === canonical(original.board.playable_mask),
    `${id}: plan changed playable_mask.`,
  );
  check(
    maskCells(plannedLevel.board_lock.playable_mask) === original.board.playable_cell_count,
    `${id}: plan mask does not contain the locked playable-cell total.`,
  );
  check(
    plannedLevel.color_lock.full_level_color_count === original.full_level_color_count,
    `${id}: plan changed color count.`,
  );
  check(
    canonical(plannedLevel.color_lock.design_palette) === canonical(original.design_palette),
    `${id}: plan changed palette.`,
  );
  check(
    plannedLevel.v5_count_schedule.minimum_block_count === schedule.minimum,
    `${id}: minimum block schedule mismatch.`,
  );
  check(plannedComposition.block_count === expectedCount, `${id}: final count must equal max(v4, minimum)=${expectedCount}.`);
  check(plannedComposition.block_count >= original.full_level_block_count, `${id}: planned block count decreased.`);
  check(histogramCount(plannedComposition.shape_histogram) === expectedCount, `${id}: planned histogram/count mismatch.`);
  check(
    canonical(Object.keys(plannedComposition.shape_histogram).sort()) ===
      canonical(Object.keys(original.full_level_shape_histogram).sort()),
    `${id}: planned shape set differs from v4.`,
  );
  for (const [shape, count] of Object.entries(original.full_level_shape_histogram)) {
    check(
      plannedComposition.shape_histogram[shape] >= count,
      `${id}: planned ${shape} count shrank from ${count} to ${plannedComposition.shape_histogram[shape]}.`,
    );
  }
  const plannedArea = histogramArea(plannedComposition.shape_histogram, "plan", id);
  check(plannedComposition.occupied_cell_count === plannedArea, `${id}: planned occupied cells do not match shapes.`);
  const ratioMetrics = shapeRatioMetrics(
    original.full_level_shape_histogram,
    plannedComposition.shape_histogram,
  );
  check(
    ratioMetrics.maxAbsoluteDelta <= MAX_SHAPE_RATIO_DELTA + Number.EPSILON,
    `${id}: max shape-ratio delta ${ratioMetrics.maxAbsoluteDelta.toFixed(4)} exceeds ${MAX_SHAPE_RATIO_DELTA}.`,
  );
  check(
    ratioMetrics.totalVariation <= MAX_SHAPE_TOTAL_VARIATION + Number.EPSILON,
    `${id}: shape total variation ${ratioMetrics.totalVariation.toFixed(4)} exceeds ${MAX_SHAPE_TOTAL_VARIATION}.`,
  );

  check(staging.required_stage_batch_count === staging.batches.length, `${id}: stage batch count mismatch.`);
  check(staging.hidden_reveal_batch_count === staging.batches.length - 1, `${id}: hidden batch count mismatch.`);
  check(
    staging.contract_requires_staged_reveal === locked.requires_staged_reveal,
    `${id}: staging flag differs from the locked contract.`,
  );
  const expectedBatchCount = locked.requires_staged_reveal
    ? Math.max(2, Math.ceil((plannedArea - 1) / (original.board.playable_cell_count - 1)))
    : 1;
  check(
    staging.required_stage_batch_count === expectedBatchCount,
    `${id}: expected minimal ${expectedBatchCount}-batch plan, received ${staging.required_stage_batch_count}.`,
  );
  const stagedHistogram = {};
  let stagedBlockCount = 0;
  let stagedArea = 0;
  for (const batch of staging.batches) {
    const batchCount = histogramCount(batch.shape_histogram);
    const batchArea = histogramArea(batch.shape_histogram, "plan", id);
    stagedBlockCount += batchCount;
    stagedArea += batchArea;
    for (const [shape, count] of Object.entries(batch.shape_histogram)) {
      stagedHistogram[shape] = (stagedHistogram[shape] ?? 0) + count;
    }
    check(batch.block_count === batchCount, `${id}: stage ${batch.stage_index} block total mismatch.`);
    check(batch.occupied_cell_count === batchArea, `${id}: stage ${batch.stage_index} occupied total mismatch.`);
    const isFinalBatch = batch.stage_index === staging.batches.length;
    const expectedOccupiedCap = locked.requires_staged_reveal && !isFinalBatch
      ? original.board.playable_cell_count - 1
      : original.board.playable_cell_count;
    check(
      batch.occupied_cell_cap === expectedOccupiedCap,
      `${id}: stage ${batch.stage_index} records the wrong occupied-cell cap.`,
    );
    check(
      batch.occupied_cell_count <= expectedOccupiedCap,
      `${id}: stage ${batch.stage_index} exceeds occupied-cell cap.`,
    );
    check(
      batch.free_playable_cells >= (locked.requires_staged_reveal && !isFinalBatch ? 1 : 0),
      `${id}: stage ${batch.stage_index} does not reserve the shared control cell.`,
    );
    check(
      batch.required_control_cells === (locked.requires_staged_reveal && !isFinalBatch ? 1 : 0),
      `${id}: stage ${batch.stage_index} control-cell declaration is wrong.`,
    );
  }
  check(stagedBlockCount === expectedCount, `${id}: staged block sum mismatch.`);
  check(stagedArea === plannedArea, `${id}: staged occupied sum mismatch.`);
  check(
    canonical(Object.fromEntries(Object.entries(stagedHistogram).sort())) ===
      canonical(Object.fromEntries(Object.entries(plannedComposition.shape_histogram).sort())),
    `${id}: staged shape histogram does not reconstruct the planned histogram.`,
  );
}

for (let start = 21; start <= 100; start += 5) {
  const group = Array.from({ length: 5 }, (_, offset) => planLevels.get(start + offset));
  if (group.some((level) => !level)) continue;
  const formulaMinimums = group.map((level) => level.v5_count_schedule.minimum_block_count);
  check(
    canonical(formulaMinimums.map((count) => count - formulaMinimums[0])) === canonical(WAVE_OFFSETS),
    `Lv${start}-Lv${start + 4}: minimum schedule does not follow [0,1,2,2,3].`,
  );
  const scores = group.map((level) => level.difficulty_wave_lock.calibrated_score);
  check(scores.every(Number.isFinite), `Lv${start}-Lv${start + 4}: missing calibrated D1 score.`);
  check(
    Number.isFinite(scores[4]) && scores[4] === Math.max(...scores),
    `Lv${start}-Lv${start + 4}: fifth level is not the D1 peak.`,
  );
  const counts = group.map((level) => level.v5_composition_plan.block_count);
  const fifthIsCountPeak = counts[4] === Math.max(...counts);
  if (strictFinalCountPeaks) {
    check(fifthIsCountPeak, `Lv${start}-Lv${start + 4}: fifth level is not the final block-count peak.`);
  } else {
    advise(
      fifthIsCountPeak,
      `Lv${start}-Lv${start + 4}: exact no-decrease formula retains an earlier v4 block-count peak (${counts.join("/")}).`,
    );
  }
}

let contractRelative = explicitContract;
if (!contractRelative) {
  contractRelative = DEFAULT_V5_CANDIDATES.find((candidate) => fs.existsSync(path.resolve(ROOT, candidate))) ?? null;
}

if (contractRelative) {
  const contractPath = path.resolve(ROOT, contractRelative);
  check(fs.existsSync(contractPath), `Missing requested v5 contract: ${contractRelative}`, "contract");
  if (fs.existsSync(contractPath)) {
    const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"));
    const contractLevels = byLevel(contract.levels);
    check(contractLevels.size >= 80, `V5 contract has only ${contractLevels.size} unique levels.`, "contract");

    for (let number = 21; number <= 100; number += 1) {
      const sourceLevel = sourceLevels.get(number);
      const plannedLevel = planLevels.get(number);
      const contractLevel = contractLevels.get(number);
      check(Boolean(contractLevel), `Lv${number}: missing from v5 contract.`, "contract");
      if (!sourceLevel || !plannedLevel || !contractLevel) continue;
      const id = sourceLevel.level_id;
      const original = sourceLevel.our_design_target;
      const candidate = contractLevel.our_design_target ?? contractLevel;
      const expectedCount = plannedLevel.v5_composition_plan.block_count;

      check(candidate.board?.rows === original.board.rows, `${id}: v5 changed board.rows.`, "contract");
      check(candidate.board?.cols === original.board.cols, `${id}: v5 changed board.cols.`, "contract");
      check(
        candidate.board?.playable_cell_count === original.board.playable_cell_count,
        `${id}: v5 changed playable_cell_count.`,
        "contract",
      );
      check(
        canonical(candidate.board?.playable_mask) === canonical(original.board.playable_mask),
        `${id}: v5 changed playable_mask.`,
        "contract",
      );
      check(
        candidate.full_level_color_count === original.full_level_color_count,
        `${id}: v5 changed color count.`,
        "contract",
      );
      check(
        canonical(candidate.design_palette) === canonical(original.design_palette),
        `${id}: v5 changed palette.`,
        "contract",
      );
      check(
        candidate.full_level_block_count === expectedCount,
        `${id}: v5 block count ${candidate.full_level_block_count} must equal planned ${expectedCount}.`,
        "contract",
      );
      check(
        candidate.full_level_block_count >= original.full_level_block_count,
        `${id}: v5 block count decreased.`,
        "contract",
      );
      const candidateHistogram = candidate.full_level_shape_histogram ?? {};
      check(
        histogramCount(candidateHistogram) === expectedCount,
        `${id}: v5 histogram/count mismatch.`,
        "contract",
      );
      check(
        canonical(candidateHistogram) ===
          canonical(plannedLevel.v5_composition_plan.shape_histogram),
        `${id}: v5 histogram differs from the deterministic Hamilton plan.`,
        "contract",
      );
      check(
        canonical(Object.keys(candidateHistogram).sort()) ===
          canonical(Object.keys(original.full_level_shape_histogram).sort()),
        `${id}: v5 shape set differs from v4.`,
        "contract",
      );
      if (Object.keys(candidateHistogram).length === Object.keys(original.full_level_shape_histogram).length) {
        const metrics = shapeRatioMetrics(original.full_level_shape_histogram, candidateHistogram);
        check(
          metrics.maxAbsoluteDelta <= MAX_SHAPE_RATIO_DELTA + Number.EPSILON,
          `${id}: v5 max shape-ratio delta ${metrics.maxAbsoluteDelta.toFixed(4)} exceeds ${MAX_SHAPE_RATIO_DELTA}.`,
          "contract",
        );
        check(
          metrics.totalVariation <= MAX_SHAPE_TOTAL_VARIATION + Number.EPSILON,
          `${id}: v5 shape total variation ${metrics.totalVariation.toFixed(4)} exceeds ${MAX_SHAPE_TOTAL_VARIATION}.`,
          "contract",
        );
      }
      const candidateArea = histogramArea(candidateHistogram, "contract", id);
      check(
        candidate.full_level_occupied_cell_count === candidateArea,
        `${id}: v5 occupied cells do not match its histogram.`,
        "contract",
      );
    }

    for (let start = 21; start <= 100; start += 5) {
      const group = Array.from({ length: 5 }, (_, offset) => contractLevels.get(start + offset));
      if (group.some((level) => !level)) continue;
      const scores = group.map((level) => {
        const target = level.our_design_target ?? level;
        return target.target_d1_difficulty?.calibrated_score ?? target.difficulty_value ?? null;
      });
      check(scores.every(Number.isFinite), `Lv${start}-Lv${start + 4}: v5 lacks numeric D1 scores.`, "contract");
      check(
        Number.isFinite(scores[4]) && scores[4] === Math.max(...scores),
        `Lv${start}-Lv${start + 4}: v5 fifth level is not the D1 peak (${scores.join("/")}).`,
        "contract",
      );
    }
  }
}

const result = {
  status: errors.length === 0 ? "pass" : "failed",
  mode: contractRelative ? "plan_and_v5_contract" : "plan_only_waiting_for_v5_contract",
  source: sourceRelative.replaceAll("\\", "/"),
  plan: planRelative.replaceAll("\\", "/"),
  v5_contract: contractRelative?.replaceAll("\\", "/") ?? null,
  checks,
  thresholds: {
    max_shape_ratio_delta: MAX_SHAPE_RATIO_DELTA,
    max_shape_total_variation: MAX_SHAPE_TOTAL_VARIATION,
  },
  advisories,
  errors,
};

console.log(JSON.stringify(result, null, 2));
if (errors.length > 0) process.exitCode = 1;
