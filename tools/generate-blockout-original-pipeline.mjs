import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = resolve(root, "deliverables", "original-levels", "pipeline");
const competitorScorePath = resolve(root, "deliverables", "competitor-dataset", "blockout-difficulty-score-v2.json");
const competitorDataPath = resolve(root, "deliverables", "competitor-dataset", "blockout-lv001-lv100.json");
const solutionPath = resolve(root, "playtest-results", "round54-100-level-solution-report.json");

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

const [competitorScore, competitorData, solution] = await Promise.all([
  readFile(competitorScorePath, "utf8").then(JSON.parse),
  readFile(competitorDataPath, "utf8").then(JSON.parse),
  readFile(solutionPath, "utf8").then(JSON.parse),
]);
if (result.levels.length !== 100 || result.scores.length !== 100) {
  throw new Error(`Expected 100 shipping original levels, found ${result.levels.length}`);
}
if (competitorData.length !== 100 || competitorScore.per_level?.length !== 100) {
  throw new Error("Competitor baseline must contain the confirmed new-version Lv1-Lv100 set");
}
if (solution.levelsPassed !== 100 || solution.levels?.some((level) => !level.solved)) {
  throw new Error("Original campaign is missing a current 100/100 solver-validation report");
}
if (!result.originality.passed) {
  throw new Error(`Originality guard failed: ${JSON.stringify(result.originality)}`);
}

const solutionById = new Map(solution.levels.map((level) => [level.levelId, level]));
const target = competitorScore.per_level.map((level) => Number(level.D_v2));
const raw = result.scores.map((score) => score.score);
const calibrated = raw.map((value) => Math.max(
  0,
  Math.min(100, CALIBRATION.intercept + CALIBRATION.slope * value),
));
const targetSmooth = smooth(target);
const originalSmooth = smooth(calibrated);

const levelRecords = result.levels.map((level, index) => {
  const solved = solutionById.get(level.id);
  return {
    level_id: level.id,
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
      method: "clear-first validation search with route replay in the test suite",
      minimum_drags: solved.routeDrags,
      reposition_overhead: solved.repositionOverhead,
      grid_steps: solved.gridSteps,
      turns: solved.turns,
      explored_states: solved.exploredStates,
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
  solver_passed: solution.levelsPassed,
  unique_layouts: result.originality.uniqueCanonicalLayouts,
  curve_mae: curveReport.fit.mean_absolute_error,
  outputs: { runtimeLevelsPath, recordsPath, curvePath, originalityPath },
}, null, 2));
