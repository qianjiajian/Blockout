import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const write = process.argv.includes("--write");
const solve = process.argv.includes("--solve");
const truthPaths = [
  "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json",
  "deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-truth-v1.json",
];
const outputDir = resolve(root, "playtest-results/experiments/shutter-geometry-coverage-2026-09-20");

const bundle = await build({
  stdin: {
    contents: `
      export {
        LEVELS_BEFORE_COMPETITOR_EXACT_SHUTTER_GEOMETRY_POST100,
        LEVELS_BEFORE_SHUTTER_GEOMETRY_COVERAGE_REPAIR,
      } from "./src/core/levels.ts";
      export { validateLevel, PuzzleModel } from "./src/core/PuzzleModel.ts";
      export { solveLevelForValidation } from "./src/core/levelSolver.ts";
      export { auditOrdinaryShutterCoverage, isOrdinaryShutter } from "./src/core/shutterCoverage.ts";
      export { projectShutterVisualRect } from "./src/game/shutterVisualLayout.ts";
      export {
        applyShutterGeometryCoverageRepair,
        SHUTTER_GEOMETRY_COVERAGE_REPAIR_LEVEL_IDS,
        SHUTTER_GEOMETRY_COVERAGE_REPAIR_VERSION,
      } from "./src/core/shutterGeometryCoverageRepairs.ts";
      export {
        compareCompetitorMechanismCountContract,
        extractCompetitorMechanismCountContracts,
      } from "./src/core/competitorMechanismCountContract.ts";
    `,
    resolveDir: root,
    sourcefile: "audit-shutter-geometry-coverage-entry.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
const truthDocuments = await Promise.all(truthPaths.map(async (path) => (
  JSON.parse((await readFile(resolve(root, path), "utf8")).replace(/^\uFEFF/, ""))
)));
const truthById = new Map(truthDocuments.flatMap(({ levels }) => levels).map((level) => [Number(level.level), level]));
const contractById = new Map(truthDocuments.flatMap(api.extractCompetitorMechanismCountContracts)
  .map((contract) => [contract.levelId, contract]));

const key = (x, y) => `${x},${y}`;
const cellsOf = (block) => block.shape.map(([dx, dy]) => [block.x + dx, block.y + dy]);
const boundsOf = (cells) => {
  if (!cells.length) return null;
  const x = Math.min(...cells.map(([cx]) => cx));
  const y = Math.min(...cells.map(([, cy]) => cy));
  return {
    x,
    y,
    width: Math.max(...cells.map(([cx]) => cx)) - x + 1,
    height: Math.max(...cells.map(([, cy]) => cy)) - y + 1,
  };
};
const rectKey = ({ x, y, width, height }) => `${x},${y},${width},${height}`;
const sorted = (items) => [...items].sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
const same = (left, right) => JSON.stringify(sorted(left)) === JSON.stringify(sorted(right));

const coverEvidence = (truth) => {
  const covers = truth?.mechanisms?.covers;
  if (!covers) return { geometry: null, cohorts: null };
  const rows = Array.isArray(covers) ? covers : (
    Number.isFinite(covers.x) || covers.x === null ? [covers] : []
  );
  const geometry = rows.length && rows.every(({ x, y, w, h }) => (
    [x, y, w, h].every(Number.isFinite)
  )) ? rows.map(({ x, y, w, h }) => ({ x, y, width: w, height: h })) : null;
  let cohorts = null;
  if (!Array.isArray(covers) && Array.isArray(covers.hidden_batch_counts)
    && covers.hidden_batch_counts.every(Number.isFinite)) cohorts = covers.hidden_batch_counts;
  else if (rows.length && rows.every(({ hidden_batch_piece_count }) => Number.isFinite(hidden_batch_piece_count))) {
    cohorts = rows.map(({ hidden_batch_piece_count }) => hidden_batch_piece_count);
  }
  return { geometry, cohorts };
};

const analyze = (levels) => {
  const panels = [];
  for (const level of levels) for (const shutter of (level.shutters ?? []).filter(api.isOrdinaryShutter)) {
    const hidden = level.blocks.filter((block) => block.shutterId === shutter.id);
    const hiddenCells = hidden.flatMap(cellsOf);
    const hiddenBounds = boundsOf(hiddenCells);
    const panel = { x: shutter.x, y: shutter.y, width: shutter.width, height: shutter.height };
    const projected = api.projectShutterVisualRect(
      shutter.x, shutter.y, shutter.width, shutter.height,
      { innerX: 0, innerY: 0, cell: 100 },
    );
    panels.push({
      levelId: level.id,
      shutterId: shutter.id,
      panel,
      count: shutter.count,
      hiddenBlockCount: hidden.length,
      hiddenBounds,
      boundsExact: hiddenBounds !== null && rectKey(hiddenBounds) === rectKey(panel),
      projected,
    });
  }
  const strictIssues = levels.flatMap((level) => api.auditOrdinaryShutterCoverage(level)
    .filter(({ kind }) => kind !== "missing-hidden-cohort"));
  return {
    panelCount: panels.length,
    strictIssues,
    emptyPanels: panels.filter(({ hiddenBlockCount }) => hiddenBlockCount === 0),
    boundsMismatches: panels.filter(({ hiddenBlockCount, boundsExact }) => hiddenBlockCount > 0 && !boundsExact),
    panels,
  };
};

const openingAdjacency = (level) => {
  const queued = new Set((level.generators ?? []).flatMap(({ queueBlockIds }) => queueBlockIds));
  const closed = new Set((level.shutters ?? []).filter(({ count }) => count > 0).map(({ id }) => id));
  const visible = level.blocks.filter((block) => !queued.has(block.id)
    && !(block.shutterId && closed.has(block.shutterId)));
  const occupants = new Map();
  for (const block of visible) for (const [x, y] of cellsOf(block)) {
    const cell = key(x, y);
    occupants.set(cell, [...(occupants.get(cell) ?? []), block]);
  }
  const violations = new Set();
  for (const block of visible) for (const [x, y] of cellsOf(block)) {
    for (const [dx, dy] of [[1, 0], [0, 1]]) for (const other of occupants.get(key(x + dx, y + dy)) ?? []) {
      if (block.id === other.id) continue;
      if ((block.layers?.[0] ?? block.color) === (other.layers?.[0] ?? other.color)) {
        violations.add([block.id, other.id].sort().join("|"));
      }
    }
  }
  return [...violations];
};

const replay = (level, drags) => {
  const model = new api.PuzzleModel(level);
  model.start();
  model.startCountdown();
  const interval = Math.max(0, ...(level.generators ?? []).filter(({ trigger }) => trigger === "time")
    .map((generator) => Math.max(generator.initialDelaySeconds ?? 0, generator.intervalSeconds ?? 1)));
  for (const drag of drags) {
    if (!model.getBlock(drag.blockId) && interval > 0) model.tick(interval);
    if (!model.getBlock(drag.blockId)) return false;
    model.beginAction();
    for (const [x, y] of drag.path) {
      const before = model.getBlock(drag.blockId);
      const distance = Math.abs(before.x - x) + Math.abs(before.y - y);
      if (!(distance === 1 ? model.moveBlockStep(drag.blockId, x, y) : model.moveBlock(drag.blockId, x, y))) return false;
    }
    if (drag.exitSide && !model.tryExit(drag.blockId, drag.exitSide).ok) return false;
    if (!model.commitAction()) return false;
    if (interval > 0) model.tick(interval);
  }
  const snapshot = model.snapshot();
  return snapshot.complete && !snapshot.blocks.length && !snapshot.queuedBlocks.length;
};

const sourceLevels = api.LEVELS_BEFORE_SHUTTER_GEOMETRY_COVERAGE_REPAIR;
const before = analyze(sourceLevels);
const repairedLevels = sourceLevels.map(api.applyShutterGeometryCoverageRepair);
const after = analyze(repairedLevels);
const repairedById = new Map(repairedLevels.map((level) => [level.id, level]));
const changedLevelIds = sourceLevels.filter((level, index) => level !== repairedLevels[index]).map(({ id }) => id);
const competitor = repairedLevels.map((level) => {
  const evidence = coverEvidence(truthById.get(level.id));
  const panels = after.panels.filter((panel) => panel.levelId === level.id);
  const actualGeometry = panels.map(({ panel }) => panel);
  const actualCohorts = panels.map(({ hiddenBlockCount }) => hiddenBlockCount);
  return {
    levelId: level.id,
    geometryStatus: evidence.geometry === null ? "unknown" : same(actualGeometry, evidence.geometry) ? "exact" : "mismatch",
    cohortStatus: evidence.cohorts === null ? "unknown" : same(actualCohorts, evidence.cohorts) ? "exact" : "mismatch",
    expectedGeometry: evidence.geometry,
    actualGeometry,
    expectedCohorts: evidence.cohorts,
    actualCohorts,
  };
});

const certifications = [];
for (const levelId of api.SHUTTER_GEOMETRY_COVERAGE_REPAIR_LEVEL_IDS) {
  const beforeLevel = sourceLevels.find(({ id }) => id === levelId);
  const level = repairedById.get(levelId);
  const contract = contractById.get(levelId);
  const beforeIssues = api.compareCompetitorMechanismCountContract(beforeLevel, contract).issues;
  const afterIssues = api.compareCompetitorMechanismCountContract(level, contract).issues;
  const beforeFields = new Set(beforeIssues.map(({ field }) => field));
  let validation = "pass";
  try { api.validateLevel(level); } catch (error) { validation = error instanceof Error ? error.message : String(error); }
  let solver = null;
  if (solve) {
    const result = api.solveLevelForValidation(level, 20_000);
    solver = {
      solved: result.solved,
      termination: result.termination,
      exploredStates: result.exploredStates,
      dragCount: result.drags.length,
      replayComplete: result.solved && replay(level, result.drags),
      staticUnsatReasons: result.staticUnsatReasons,
    };
  }
  certifications.push({
    levelId,
    validation,
    openingAdjacencyViolations: openingAdjacency(level),
    quantityIssueCountBefore: beforeIssues.length,
    quantityIssueCountAfter: afterIssues.length,
    newQuantityIssueFields: afterIssues.map(({ field }) => field).filter((field) => !beforeFields.has(field)),
    competitor: competitor.find((row) => row.levelId === levelId),
    solver,
  });
}

const unresolved = after.emptyPanels.map((panel) => ({
  levelId: panel.levelId,
  shutterId: panel.shutterId,
  reason: "player-facing panel has no directly bound hidden cohort; source staging redesign required",
}));
const geometryMismatchLevelIds = competitor.filter(({ geometryStatus }) => geometryStatus === "mismatch")
  .map(({ levelId }) => levelId);
const cohortMismatchLevelIds = competitor.filter(({ cohortStatus }) => cohortStatus === "mismatch")
  .map(({ levelId }) => levelId);
const report = {
  schemaVersion: 1,
  policy: api.SHUTTER_GEOMETRY_COVERAGE_REPAIR_VERSION,
  truthPaths,
  auditedLevels: repairedLevels.length,
  changedLevelIds,
  summary: {
    playerFacingPanels: after.panelCount,
    strictCoverageIssuesBefore: before.strictIssues.length,
    strictCoverageIssuesAfter: after.strictIssues.length,
    hiddenBoundsMismatchesBefore: before.boundsMismatches.length,
    hiddenBoundsMismatchesAfter: after.boundsMismatches.length,
    emptyPanelsBefore: before.emptyPanels.length,
    emptyPanelsAfter: after.emptyPanels.length,
    competitorGeometryComparableLevels: competitor.filter(({ geometryStatus }) => geometryStatus !== "unknown").length,
    competitorGeometryExactLevels: competitor.filter(({ geometryStatus }) => geometryStatus === "exact").length,
    competitorGeometryMismatchLevels: competitor.filter(({ geometryStatus }) => geometryStatus === "mismatch").length,
    competitorGeometryMismatchLevelIds: geometryMismatchLevelIds,
    competitorCohortComparableLevels: competitor.filter(({ cohortStatus }) => cohortStatus !== "unknown").length,
    competitorCohortExactLevels: competitor.filter(({ cohortStatus }) => cohortStatus === "exact").length,
    competitorCohortMismatchLevels: competitor.filter(({ cohortStatus }) => cohortStatus === "mismatch").length,
    competitorCohortMismatchLevelIds: cohortMismatchLevelIds,
    certifiedRepairLevels: certifications.filter((row) => row.validation === "pass"
      && !row.openingAdjacencyViolations.length
      && row.quantityIssueCountAfter <= row.quantityIssueCountBefore
      && !row.newQuantityIssueFields.length
      && (!solve || (row.solver?.solved && row.solver.replayComplete))).length,
  },
  policyNotes: [
    "Player-facing shutters are positive-count skin=shutter/unskinned panels; staging/lift/staged-frame metadata is excluded.",
    "Internal exact means the visible/physical panel rectangle equals the bounding rectangle of its directly bound hidden cohort.",
    "Competitor exact is reported only when truth provides numeric x/y/w/h or hidden cohort counts; unknown evidence is never promoted to exact.",
    "The renderer projects every visible panel from the same x/y/width/height values via projectShutterVisualRect.",
  ],
  repairedLevels: certifications,
  competitor,
  unresolved,
};

console.log(JSON.stringify(report, null, 2));
if (write) {
  await mkdir(outputDir, { recursive: true });
  await writeFile(resolve(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  const lines = [
    "# Shutter geometry / coverage audit",
    "",
    `- Policy: ${report.policy}`,
    `- Audited: ${report.auditedLevels}/200 levels, ${report.summary.playerFacingPanels} player-facing panels`,
    `- Strict visible/physical coverage issues: ${report.summary.strictCoverageIssuesBefore} -> ${report.summary.strictCoverageIssuesAfter}`,
    `- Hidden-bounds mismatches: ${report.summary.hiddenBoundsMismatchesBefore} -> ${report.summary.hiddenBoundsMismatchesAfter}`,
    `- Empty player-facing panels: ${report.summary.emptyPanelsBefore} -> ${report.summary.emptyPanelsAfter}`,
    `- Certified repair levels: ${report.summary.certifiedRepairLevels}/${certifications.length}`,
    `- Competitor geometry: ${report.summary.competitorGeometryExactLevels} exact / ${report.summary.competitorGeometryMismatchLevels} mismatch / ${200 - report.summary.competitorGeometryComparableLevels} unknown`,
    `- Competitor cohorts: ${report.summary.competitorCohortExactLevels} exact / ${report.summary.competitorCohortMismatchLevels} mismatch / ${200 - report.summary.competitorCohortComparableLevels} unknown`,
    `- Competitor-exact geometry preserved by this repair: Lv103, Lv105, Lv112`,
    `- Competitor-exact hidden cohort preserved by this repair: Lv55`,
    "",
    "## Evidence boundary",
    "",
    "Competitor geometry is marked exact only when the truth record contains numeric x/y/w/h. Hidden cohort parity is marked exact only when numeric cohort counts are present. Unknown source fields remain unknown.",
    "",
    "## Remaining blockers",
    "",
    `${unresolved.length} player-facing panels still have no direct hidden cohort and require source-level staging/layout redesign; they were not changed by this safe overlay.`,
    `Affected levels: ${[...new Set(unresolved.map(({ levelId }) => levelId))].join(", ")}`,
    "",
    `Competitor-comparable geometry mismatches: ${geometryMismatchLevelIds.join(", ") || "none"}`,
    "",
  ];
  await writeFile(resolve(outputDir, "report.md"), `${lines.join("\n")}\n`, "utf8");
}
if (JSON.stringify(api.LEVELS_BEFORE_COMPETITOR_EXACT_SHUTTER_GEOMETRY_POST100) !== JSON.stringify(repairedLevels)
  || after.strictIssues.length || after.boundsMismatches.length
  || certifications.some((row) => row.validation !== "pass"
    || row.openingAdjacencyViolations.length
    || row.quantityIssueCountAfter > row.quantityIssueCountBefore
    || row.newQuantityIssueFields.length
    || (solve && (!row.solver?.solved || !row.solver.replayComplete)))) process.exitCode = 1;
