import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = resolve(root, "deliverables", "original-levels", "pipeline");
const competitorScorePath = resolve(root, "deliverables", "competitor-dataset", "blockout-difficulty-score-v2.json");
const competitorDataPath = resolve(root, "deliverables", "competitor-dataset", "blockout-lv001-lv100.json");
const latestPointerPath = resolve(root, "playtest-results", "latest-100-level-pointer-report.json");
const currentSolutionPath = resolve(root, "playtest-results", "round54-100-level-solution-report.json");
const stagingAuditPath = resolve(root, "playtest-results", "staging-collision", "staging-collision-audit.json");
const expandedDensityAssemblyPath = resolve(
  root,
  "playtest-results",
  "experiments",
  "competitor-composition-r141",
  "assembled-expanded-density-candidates-v5.json",
);

const round = (value, digits = 2) => Number(value.toFixed(digits));
const mean = (values) => values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
const smooth = (values, radius = 2) => values.map((_, index) => mean(
  values.slice(Math.max(0, index - radius), Math.min(values.length, index + radius + 1)),
));
// Frozen from the confirmed pre-uplift Lv1-Lv100 campaign. Re-fitting on every
// run would force the campaign mean back to the competitor mean and hide real
// difficulty gains, so all subsequent iterations use this stable yardstick.
const CALIBRATION = {
  version: "blockout-d1-baseline-2026-09-05",
  slope: 0.826935,
  intercept: 13.161835,
};

const bundle = await build({
  stdin: {
    contents: `
      import { LEVELS } from "./src/core/levels.ts";
      import { scoreBlockOutLevel } from "./src/core/blockOutDifficulty.ts";
      import { validateCampaignOriginality } from "./src/core/levelOriginality.ts";

      export const result = {
        levels: LEVELS,
        scores: LEVELS.map((level) => scoreBlockOutLevel(level)),
        originality: validateCampaignOriginality(LEVELS),
      };
    `,
    resolveDir: root,
    sourcefile: "blockout-original-pipeline-entry.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
const moduleUrl = `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`;
const { result } = await import(moduleUrl);

const [
  competitorScore,
  competitorData,
  latestPointer,
  currentSolution,
  stagingAudit,
  expandedDensityAssembly,
] = await Promise.all([
  readFile(competitorScorePath, "utf8").then(JSON.parse),
  readFile(competitorDataPath, "utf8").then(JSON.parse),
  readFile(latestPointerPath, "utf8").then(JSON.parse),
  readFile(currentSolutionPath, "utf8").then(JSON.parse),
  readFile(stagingAuditPath, "utf8").then(JSON.parse),
  readFile(expandedDensityAssemblyPath, "utf8").then(JSON.parse),
]);
if (result.levels.length !== 100 || result.scores.length !== 100) {
  throw new Error(`Expected 100 shipping original levels, found ${result.levels.length}`);
}
if (competitorData.length !== 100 || competitorScore.per_level?.length !== 100) {
  throw new Error("Competitor baseline must contain the confirmed new-version Lv1-Lv100 set");
}
if (latestPointer.levelsPassed !== 100) {
  throw new Error("Latest Pointer report is missing a current 100/100 campaign pass");
}
if (currentSolution.levelsPassed !== 100 || currentSolution.levels?.length !== 100) {
  throw new Error("Current staging-nonspatial solution report is missing a 100/100 campaign pass");
}
if (
  !stagingAudit.passed
  || stagingAudit.staging_semantics_version !== "nonspatial-block-removal-v1"
  || stagingAudit.counts?.current_solutions_passed !== 100
) {
  throw new Error("Current staging collision audit is incomplete");
}
if (
  !expandedDensityAssembly.applied_to_live_campaign
  || expandedDensityAssembly.counts?.selected !== 100
  || expandedDensityAssembly.counts?.witness_floor_met !== 100
  || expandedDensityAssembly.counts?.strict_v5_floor_certified !== 100
  || expandedDensityAssembly.counts?.missing !== 0
) {
  throw new Error("Historical expanded-density v5 acceptance provenance is incomplete");
}
if (!result.originality.passed) {
  throw new Error(`Originality guard failed: ${JSON.stringify(result.originality)}`);
}

const latestPointerById = new Map(latestPointer.levels.map((level) => [level.levelId, level]));
const currentSolutionById = new Map(currentSolution.levels.map((level) => [level.levelId, level]));
const stagingAuditById = new Map(stagingAudit.levels.map((level) => [level.level_id, level]));
const stagingLevelIds = new Set(stagingAudit.affected_level_ids);
const pointerEvidenceSources = ["playtest-results/latest-100-level-pointer-report.json"];
if (typeof latestPointer.incrementalRefresh?.source === "string") {
  pointerEvidenceSources.push(latestPointer.incrementalRefresh.source);
}
const assemblyLevelById = new Map(expandedDensityAssembly.levels.map((entry) => [entry.level.id, entry]));
const assemblyDecisionById = new Map(expandedDensityAssembly.decisions.map((entry) => [
  Number(entry.level_id.slice(2)),
  entry,
]));
const sourceLevelIdForRuntime = (levelId) => levelId === 2 ? 3 : levelId === 3 ? 2 : levelId;

for (const level of result.levels) {
  const sourceLevelId = sourceLevelIdForRuntime(level.id);
  const accepted = assemblyLevelById.get(sourceLevelId);
  const decision = assemblyDecisionById.get(sourceLevelId);
  const pointer = latestPointerById.get(level.id);
  const solved = currentSolutionById.get(level.id);
  const runtimeClearLoad = level.blocks.reduce((sum, block) => sum + (block.layers?.length ?? 1), 0);
  if (!accepted || !decision || !pointer || !solved) {
    throw new Error(`Lv${level.id} (source Lv${sourceLevelId}) is missing historical provenance, current solution, or Pointer evidence`);
  }
  const maximumCertifiedFloor = Math.max(
    ...decision.strict_v5_certificates.map((certificate) => certificate.certified_lower_bound),
  );
  if (
    !accepted.assembly?.witness_floor_met
    || !decision.witness_floor_met
    || !decision.strict_v5_floor_certified
    || accepted.assembly.route_metrics.actions !== accepted.route.length
    || accepted.assembly.route_metrics.reposition_overhead < decision.target_reposition_overhead
    || maximumCertifiedFloor < decision.target_reposition_overhead
  ) {
    throw new Error(`Lv${level.id} historical strict v5 witness/certificate provenance is invalid`);
  }
  if (
    !solved.solved
    || solved.name !== level.name
    || solved.difficulty !== level.difficulty
    || solved.clearLoad !== runtimeClearLoad
    || solved.routeDrags < runtimeClearLoad
  ) {
    throw new Error(`Lv${level.id} current staging-nonspatial solution drifted from the runtime level`);
  }
  if (
    pointer.name !== level.name
    || pointer.difficulty !== level.difficulty
    || pointer.parMoves !== level.parMoves
    || pointer.clearLoad !== runtimeClearLoad
    || pointer.committedMoves < runtimeClearLoad
  ) {
    throw new Error(`Lv${level.id} current Pointer replay drifted from the runtime level`);
  }
}
const target = result.levels.map((level) => Number(
  competitorScore.per_level[sourceLevelIdForRuntime(level.id) - 1].D_v2,
));
const raw = result.scores.map((score) => score.score);
const calibrated = raw.map((value) => Math.max(
  0,
  Math.min(100, CALIBRATION.intercept + CALIBRATION.slope * value),
));
const targetSmooth = smooth(target);
const originalSmooth = smooth(calibrated);

const levelRecords = result.levels.map((level, index) => {
  const sourceLevelId = sourceLevelIdForRuntime(level.id);
  const pointer = latestPointerById.get(level.id);
  const solved = currentSolutionById.get(level.id);
  const stagingEvidence = stagingAuditById.get(level.id);
  const accepted = assemblyLevelById.get(sourceLevelId);
  const decision = assemblyDecisionById.get(sourceLevelId);
  if (!pointer || !solved || !accepted || !decision) {
    throw new Error(`Lv${level.id} is missing current formal evidence`);
  }
  const historicalCertifiedFloor = Math.max(
    ...decision.strict_v5_certificates.map((certificate) => certificate.certified_lower_bound),
  );
  const currentCertificateStatus = stagingLevelIds.has(level.id)
    ? "invalidated_by_nonspatial_staging_semantics"
    : "retained_no_staging_collision_dependency";
  return {
    level_id: level.id,
    source_level_id: sourceLevelId,
    chapter: Math.floor((level.id - 1) / 10) + 1,
    chapter_position: (level.id - 1) % 10 + 1,
    name: level.name,
    difficulty_tag: level.difficulty,
    difficulty: {
      ...result.scores[index],
      calibrated_to_competitor: round(calibrated[index]),
      competitor_target: round(target[index]),
      curve_error: round(calibrated[index] - target[index]),
    },
    solver_validation: {
      solved: solved.solved,
      method: "current clear-first validation search under nonspatial-block-removal-v1 staging semantics",
      evidence_sources: [
        "playtest-results/round54-100-level-solution-report.json",
        "playtest-results/staging-collision/staging-collision-audit.json",
        "playtest-results/experiments/competitor-composition-r141/assembled-expanded-density-candidates-v5.json",
        ...pointerEvidenceSources,
      ],
      pointer_evidence_method: latestPointer.method,
      current_validation_route_drags: solved.routeDrags,
      current_validation_clear_load: solved.clearLoad,
      current_validation_reposition_overhead: solved.repositionOverhead,
      current_validation_grid_steps: solved.gridSteps,
      target_reposition_overhead: decision.target_reposition_overhead,
      current_validation_route_below_target: solved.repositionOverhead < decision.target_reposition_overhead,
      current_floor_proof_status: currentCertificateStatus,
      current_floor_certified: !stagingLevelIds.has(level.id) && decision.strict_v5_floor_certified,
      historical_v5_cover_evidence: {
        accepted_witness_drags: accepted.assembly.route_metrics.actions,
        accepted_witness_clear_load: accepted.assembly.route_metrics.clear_load,
        accepted_witness_reposition_overhead: accepted.assembly.route_metrics.reposition_overhead,
        certified_reposition_lower_bound: historicalCertifiedFloor,
        witness_floor_met: decision.witness_floor_met,
        strict_v5_floor_certified: decision.strict_v5_floor_certified,
        valid_under_current_semantics: !stagingLevelIds.has(level.id),
      },
      staging_audit: stagingEvidence ? {
        staging_shutters: stagingEvidence.staging_shutters.length,
        formerly_invisible_footprint_cells: stagingEvidence.unique_footprint_cells,
        opening_transitions_repaired: stagingEvidence.opening_transitions_previously_blocked_only_by_staging.length,
        pulse_isolated: stagingEvidence.pulse_isolated,
      } : null,
      pointer_replay: {
        passed: true,
        gestures: pointer.gestures,
        committed_moves: pointer.committedMoves,
        clear_load: pointer.clearLoad,
        reposition_overhead: pointer.repositionOverhead,
        grid_steps: pointer.gridSteps,
        turns: pointer.turns,
      },
    },
    level_spec: level,
  };
});

const chapters = Array.from({ length: 10 }, (_, chapterIndex) => {
  const start = chapterIndex * 10;
  const end = start + 10;
  const errors = calibrated.slice(start, end).map((value, index) => Math.abs(value - target[start + index]));
  return {
    chapter: chapterIndex + 1,
    levels: `${start + 1}-${end}`,
    competitor_mean: round(mean(target.slice(start, end))),
    original_mean: round(mean(calibrated.slice(start, end))),
    mean_absolute_error: round(mean(errors)),
  };
});

const curveReport = {
  formula_version: "blockout-d1",
  formula: "D = 100 × (0.35×缓冲紧张度 + 0.20×隐藏信息 + 0.20×机制多样性 + 0.25×出口竞争)",
  formula_scope: "The four components are computed from project LevelSpec data only. Competitor targets come from the separately source-grounded D-v2 dataset.",
  fit: {
    method: "fixed baseline calibration; not re-fitted after level changes",
    version: CALIBRATION.version,
    slope: CALIBRATION.slope,
    intercept: CALIBRATION.intercept,
    mean_absolute_error: round(mean(calibrated.map((value, index) => Math.abs(value - target[index])))),
  },
  chapters,
  per_level: levelRecords.map((record, index) => ({
    level_id: record.level_id,
    competitor_score: round(target[index]),
    competitor_smoothed: round(targetSmooth[index]),
    original_raw_score: round(raw[index]),
    original_calibrated: round(calibrated[index]),
    original_smoothed: round(originalSmooth[index]),
    error: round(calibrated[index] - target[index]),
  })),
};

const runtimeLevelsPath = resolve(outputDir, "blockout-original-levels-001-100-runtime.json");
const recordsPath = resolve(outputDir, "blockout-original-levels-001-100-scored.json");
const curvePath = resolve(outputDir, "blockout-original-difficulty-curve.json");
const originalityPath = resolve(outputDir, "blockout-originality-report.json");
await mkdir(outputDir, { recursive: true });
await Promise.all([
  writeFile(runtimeLevelsPath, `${JSON.stringify(result.levels, null, 2)}\n`, "utf8"),
  writeFile(recordsPath, `${JSON.stringify(levelRecords, null, 2)}\n`, "utf8"),
  writeFile(curvePath, `${JSON.stringify(curveReport, null, 2)}\n`, "utf8"),
  writeFile(originalityPath, `${JSON.stringify({
    ...result.originality,
    policy: {
      canonicalization: "ignores ids, names and colors; compares rotations and reflections",
      required: "100 unique layouts and 100 unique names",
      competitor_boundary: "competitor screenshots inform curve and mechanic cadence only; no competitor coordinates are imported into LevelSpec",
    },
  }, null, 2)}\n`, "utf8"),
]);

console.log(JSON.stringify({
  levels: result.levels.length,
  historical_v5_cover_certificates: expandedDensityAssembly.counts.strict_v5_floor_certified,
  current_semantics_certificates_retained: result.levels.length - stagingAudit.counts.historical_floor_certificates_invalidated,
  current_solutions_passed: currentSolution.levelsPassed,
  staging_certificates_invalidated: stagingAudit.counts.historical_floor_certificates_invalidated,
  current_validation_routes_below_authored_target:
    stagingAudit.counts.current_validation_routes_below_authored_reposition_target,
  pointer_replay_passed: latestPointer.levelsPassed,
  solver_sources: {
    levels_1_100: "current staging-nonspatial validation search + staging collision audit; historical v5 cover certificates retained as provenance only where unaffected",
  },
  unique_layouts: result.originality.uniqueCanonicalLayouts,
  curve_mae: curveReport.fit.mean_absolute_error,
  outputs: { runtimeLevelsPath, recordsPath, curvePath, originalityPath },
}, null, 2));
