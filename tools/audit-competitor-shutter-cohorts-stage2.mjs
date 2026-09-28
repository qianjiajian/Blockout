import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const write = process.argv.includes("--write");
const truthPath = "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json";
const outputDir = resolve(root, "playtest-results/experiments/competitor-shutter-cohorts-stage2-2026-09-20");

const bundle = await build({
  stdin: {
    contents: `
      export { LEVELS } from "./src/core/levels.ts";
      export { auditOrdinaryShutterCoverage, isOrdinaryShutter } from "./src/core/shutterCoverage.ts";
      export { extractRuntimeMechanismCountFacts } from "./src/core/competitorMechanismCountContract.ts";
    `,
    resolveDir: root,
    sourcefile: "audit-competitor-shutter-cohorts-stage2.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
const truth = JSON.parse((await readFile(resolve(root, truthPath), "utf8")).replace(/^\uFEFF/, ""));
const truthById = new Map(truth.levels.map((level) => [Number(level.level), level]));

const expectedMismatchIds = [
  24, 26, 28, 29, 30, 34, 38, 39, 41, 46, 49, 54, 57, 59,
  62, 64, 69, 71, 73, 74, 79, 84, 89, 91, 92, 93, 94, 95,
];

const boundedCandidates = new Map([
  [41, { result: "max_states", exploredStates: 20_000, selection: "two independent packings" }],
  [49, { result: "max_states", exploredStates: 20_000, selection: "17-piece aggregate / three panels" }],
  [54, { result: "exhausted", exploredStates: 817, selection: "two independent packings" }],
  [57, { result: "max_states", exploredStates: 20_000, selection: "minimum-area packing" }],
  [71, { result: "max_states", exploredStates: 20_000, selection: "stage-nearest packing" }],
  [74, { result: "exhausted", exploredStates: 145, selection: "two independent packings" }],
  [79, { result: "exhausted", exploredStates: 14_413, selection: "minimum-area packing" }],
  [89, { result: "max_states", exploredStates: 20_000, selection: "minimum-area packing" }],
  [91, { result: "exhausted", exploredStates: 395, selection: "two independent 5/5 packings" }],
  [94, { result: "exhausted", exploredStates: 178, selection: "minimum-area packing" }],
]);

const structuralBlockers = new Map([
  [24, "bounded exact-count reconstruction found no packing in the current source-backed panel rectangles"],
  [26, "bounded exact-count reconstruction found no packing in the current source-backed panel rectangles"],
  [28, "bounded exact-count reconstruction found no packing across both current source-backed panel rectangles"],
  [29, "restored competitor panel intersects the certified current opening"],
  [30, "bounded exact-count reconstruction found no packing in the current source-backed panel rectangle"],
  [34, "restored competitor panel intersects the certified current opening"],
  [38, "bounded exact-count reconstruction found no packing in the current source-backed panel rectangle"],
  [39, "restored competitor panel intersects the certified current opening"],
  [46, "bounded exact-count reconstruction found no packing across all current source-backed panel rectangles"],
  [59, "restored competitor panel intersects the certified current opening"],
  [62, "bounded exact-count reconstruction found no packing in the current source-backed panel rectangle"],
  [64, "restored competitor panel intersects the certified current opening"],
  [69, "bounded exact-count reconstruction found no packing across all current source-backed panel rectangles"],
  [73, "bounded exact-count reconstruction found no packing in the current source-backed panel rectangle"],
  [84, "bounded exact-count reconstruction found no packing across all current source-backed panel rectangles"],
  [92, "bounded exact-count reconstruction found no packing in the current source-backed panel rectangle"],
  [93, "bounded exact-count reconstruction found no packing across both current source-backed panel rectangles"],
  [95, "bounded exact-count reconstruction found no packing in the current source-backed panel rectangle"],
]);

const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const expectedCohorts = (truthLevel) => {
  const covers = truthLevel?.mechanisms?.covers;
  if (Array.isArray(covers)) {
    return covers.length && covers.every(({ hidden_batch_piece_count: count }) => Number.isFinite(count))
      ? covers.map(({ hidden_batch_piece_count: count }) => count).sort((a, b) => a - b)
      : null;
  }
  return covers && Array.isArray(covers.hidden_batch_counts)
    && covers.hidden_batch_counts.every(Number.isFinite)
    ? [...covers.hidden_batch_counts].sort((a, b) => a - b)
    : null;
};
const rows = api.LEVELS.filter(({ id }) => id <= 100).map((level) => {
  const expectedCounts = expectedCohorts(truthById.get(level.id));
  const runtime = api.extractRuntimeMechanismCountFacts(level);
  const actualCounts = runtime.shutterCoveredCohortCounts;
  const comparable = expectedCounts !== null;
  const exact = comparable && same(expectedCounts, actualCounts);
  const panels = (level.shutters ?? []).filter(api.isOrdinaryShutter).map((shutter) => ({
    id: shutter.id,
    count: shutter.count,
    rect: [shutter.x, shutter.y, shutter.width, shutter.height],
    directHiddenCount: level.blocks.filter((block) => block.shutterId === shutter.id).length,
  }));
  return {
    levelId: level.id,
    comparable,
    expected: expectedCounts,
    actual: actualCounts,
    status: !comparable ? "unknown" : exact ? "exact" : "mismatch",
    panels,
  };
});
const mismatchIds = rows.filter(({ status }) => status === "mismatch").map(({ levelId }) => levelId);
const strictCoverageIssues = api.LEVELS.flatMap((level) => api.auditOrdinaryShutterCoverage(level)
  .filter(({ kind }) => kind !== "missing-hidden-cohort"));
const attempts = expectedMismatchIds.map((levelId) => ({
  levelId,
  ...(boundedCandidates.has(levelId)
    ? {
        gate: "solver-not-certified",
        ...boundedCandidates.get(levelId),
        replay: false,
        accepted: false,
      }
    : {
        gate: "structural-blocker",
        reason: structuralBlockers.get(levelId),
        accepted: false,
      }),
}));
const report = {
  schemaVersion: 1,
  policy: "competitor-exact-shutter-cohort-stage2-r1",
  truthPath,
  evidenceBoundary: "Only numeric hidden_batch_counts are comparable. No unknown field is promoted to exact.",
  summary: {
    auditedLevels: rows.length,
    comparableLevels: rows.filter(({ comparable }) => comparable).length,
    exactLevels: rows.filter(({ status }) => status === "exact").length,
    mismatchLevels: mismatchIds.length,
    strictCoverageIssues: strictCoverageIssues.length,
    certifiedRepairLevels: 0,
    solverRejectedCandidates: boundedCandidates.size,
    structuralBlockers: structuralBlockers.size,
  },
  mismatchIds,
  attempts,
  rows: rows.filter(({ comparable }) => comparable),
  decision: "No Lv1-100 cohort candidate passed all mandatory gates; no runtime overlay is emitted.",
};

console.log(JSON.stringify(report, null, 2));
if (write) {
  await mkdir(outputDir, { recursive: true });
  await writeFile(resolve(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  const lines = [
    "# Competitor-exact shutter cohort stage 2",
    "",
    `- Truth: \`${truthPath}\``,
    `- Comparable Lv1-100: ${report.summary.comparableLevels}`,
    `- Exact / mismatch: ${report.summary.exactLevels} / ${report.summary.mismatchLevels}`,
    `- Strict physical coverage issues: ${report.summary.strictCoverageIssues}`,
    `- Certified new cohort repairs: ${report.summary.certifiedRepairLevels}`,
    "",
    "## Safety result",
    "",
    "No Lv1-100 candidate passed the complete gate (numeric competitor cohort, panel/bounds fit, validation, opening adjacency 0, 20k solver and PuzzleModel replay). Therefore this batch intentionally emits no runtime overlay and does not claim the 28 mismatches are fixed.",
    "",
    "## Solver-rejected structural candidates",
    "",
    ...attempts.filter(({ gate }) => gate === "solver-not-certified")
      .map(({ levelId, result, exploredStates, selection }) => `- Lv${levelId}: ${selection}; ${result} at ${exploredStates} states; no replay certificate.`),
    "",
    "## Structural blockers",
    "",
    ...attempts.filter(({ gate }) => gate === "structural-blocker")
      .map(({ levelId, reason }) => `- Lv${levelId}: ${reason}.`),
    "",
    "## Evidence boundary",
    "",
    "The competitor truth does not provide numeric panel x/y/w/h for these Lv1-100 object-form cover records. This report compares only the numeric hidden cohort counts. A max_states result is inconclusive and is never accepted as solved.",
    "",
  ];
  await writeFile(resolve(outputDir, "report.md"), lines.join("\n"), "utf8");
}

if (!same(mismatchIds, expectedMismatchIds) || strictCoverageIssues.length
  || attempts.some(({ accepted }) => accepted)) process.exitCode = 1;
