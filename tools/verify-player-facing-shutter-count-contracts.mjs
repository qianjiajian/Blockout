import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const truthPaths = [
  "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json",
  "deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-truth-v1.json",
];
const reportDir = resolve(root, "playtest-results/experiments/player-facing-shutter-count-contracts-2026-09-20");
const writeReport = process.argv.includes("--write-report");
const SHUTTER_FIELDS = new Set([
  "shutterCount", "shutterCoverCounts", "shutterCoveredCohortCounts",
  "shutterCoveredCohortTotal", "shutterKnownCoveredCohorts",
]);
const STRUCTURAL_BLOCKERS = {
  "aggregate-cohort-source-conflict": [49],
  "physical-coverage-audit": [109, 126, 133, 143, 144, 167, 181],
  "hidden-shape-inventory-shortage": [24, 26, 28, 30, 34, 46, 57, 71, 74, 79, 84, 89, 91, 92, 93, 94, 95, 145],
  "missing-exact-panel-source": [102, 103, 131, 147, 154, 171, 172, 175, 178, 188, 189],
  "panel-outside-current-playable-mask": [113, 168, 174, 184],
  "panel-overlaps-current-opening": [29, 39, 59, 64, 67, 83, 101, 104, 119, 129, 134, 138, 148, 149, 157, 159, 164, 165, 166, 169, 176, 182, 194, 199],
  "physical-panel-capacity-insufficient": [38, 41, 44, 62, 73, 99, 139],
};
const SOLVER_BLOCKERS = {
  "solver-exhausted-proven-unsat": [54, 69, 142, 146],
  "solver-max-states-inconclusive": [98, 135],
};

const output = await build({
  stdin: {
    contents: [
      "export { LEVELS, LEVELS_BEFORE_PLAYER_FACING_SHUTTER_COUNT_CONTRACT as BASE_LEVELS, LEVELS_BEFORE_MECHANISM_ATTRIBUTE_STRUCTURAL_REPAIR as INTEGRATED_LEVELS } from './src/core/levels.ts';",
      "export { PuzzleModel, validateLevel } from './src/core/PuzzleModel.ts';",
      "export { solveLevelForValidation } from './src/core/levelSolver.ts';",
      "export { auditOrdinaryShutterCoverage } from './src/core/shutterCoverage.ts';",
      "export { extractCompetitorMechanismCountContracts, compareCompetitorMechanismCountContract } from './src/core/competitorMechanismCountContract.ts';",
      "export { applyPlayerFacingShutterCountContract, PLAYER_FACING_SHUTTER_COUNT_CONTRACT_LEVEL_IDS, PLAYER_FACING_SHUTTER_COUNT_CONTRACT_VERSION } from './src/core/playerFacingShutterCountContracts.ts';",
    ].join("\n"),
    resolveDir: root,
    sourcefile: "verify-player-facing-shutters.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  target: "es2022",
  write: false,
  logLevel: "silent",
});
const runtime = await import(`data:text/javascript;base64,${Buffer.from(output.outputFiles[0].text).toString("base64")}`);
const truthDocuments = await Promise.all(truthPaths.map(async (path) => JSON.parse(
  (await readFile(resolve(root, path), "utf8")).replace(/^\uFEFF/, ""),
)));
const contracts = truthDocuments.flatMap(runtime.extractCompetitorMechanismCountContracts);
const contractById = new Map(contracts.map((contract) => [contract.levelId, contract]));

const openingIds = (level) => {
  const queued = new Set((level.generators ?? []).flatMap((generator) => generator.queueBlockIds));
  const closed = new Set((level.shutters ?? []).filter((shutter) => shutter.count > 0).map((shutter) => shutter.id));
  return level.blocks.filter((block) => !queued.has(block.id)
    && !(block.shutterId && closed.has(block.shutterId))).map((block) => block.id);
};
const openingViolations = (level) => {
  const opening = new Set(openingIds(level));
  const blocks = level.blocks.filter((block) => opening.has(block.id));
  const occupants = new Map();
  for (const block of blocks) for (const [dx, dy] of block.shape) {
    const cell = `${block.x + dx},${block.y + dy}`;
    occupants.set(cell, [...(occupants.get(cell) ?? []), block]);
  }
  const pairs = new Set();
  for (const block of blocks) for (const [dx, dy] of block.shape) {
    const x = block.x + dx; const y = block.y + dy;
    for (const [sx, sy] of [[1, 0], [0, 1]]) for (const neighbour of occupants.get(`${x + sx},${y + sy}`) ?? []) {
      const color = block.layers?.[0] ?? block.color;
      const neighbourColor = neighbour.layers?.[0] ?? neighbour.color;
      if (block.id !== neighbour.id && color === neighbourColor) pairs.add([block.id, neighbour.id].sort().join("|"));
    }
  }
  return pairs.size;
};
const replay = (level, drags) => {
  const model = new runtime.PuzzleModel(level);
  for (const drag of drags) {
    model.beginAction();
    for (const [x, y] of drag.path) if (!model.moveBlockStep(drag.blockId, x, y)) return false;
    if (drag.exitSide && !model.tryExit(drag.blockId, drag.exitSide).ok) return false;
    if (!model.commitAction()) return false;
  }
  const snapshot = model.snapshot();
  return snapshot.complete && snapshot.blocks.length === 0 && snapshot.queuedBlocks.length === 0;
};
const shutterIssues = (level, contract) => runtime.compareCompetitorMechanismCountContract(level, contract).issues
  .filter((issue) => SHUTTER_FIELDS.has(issue.field));

const beforeMismatchIds = runtime.BASE_LEVELS.filter((level) => shutterIssues(level, contractById.get(level.id)).length).map((level) => level.id);
const repairedRows = [];
for (const levelId of runtime.PLAYER_FACING_SHUTTER_COUNT_CONTRACT_LEVEL_IDS) {
  const source = runtime.BASE_LEVELS.find((level) => level.id === levelId);
  const candidate = runtime.applyPlayerFacingShutterCountContract(source);
  const production = runtime.INTEGRATED_LEVELS.find((level) => level.id === levelId);
  runtime.validateLevel(candidate);
  const coverage = runtime.auditOrdinaryShutterCoverage(candidate);
  const openingPreserved = JSON.stringify(openingIds(source)) === JSON.stringify(openingIds(candidate));
  const generatorsPreserved = JSON.stringify(source.generators ?? []) === JSON.stringify(candidate.generators ?? []);
  const adjacencyViolations = openingViolations(candidate);
  const issues = shutterIssues(candidate, contractById.get(levelId));
  const solver = runtime.solveLevelForValidation(candidate, 20_000);
  const replayed = solver.solved && replay(candidate, solver.drags);
  repairedRows.push({
    levelId,
    openingPieceCount: openingIds(candidate).length,
    openingPreserved,
    productionIntegrated: JSON.stringify(candidate) === JSON.stringify(production),
    generatorsPreserved,
    generatorCount: candidate.generators?.length ?? 0,
    adjacencyViolations,
    physicalCoverageIssues: coverage.length,
    shutterContractIssues: issues.length,
    solver: { solved: solver.solved, termination: solver.termination, exploredStates: solver.exploredStates },
    puzzleModelReplay: replayed,
  });
}
const safeIds = repairedRows.filter((row) => row.productionIntegrated && row.openingPreserved && row.generatorsPreserved
  && row.adjacencyViolations === 0 && row.physicalCoverageIssues === 0 && row.shutterContractIssues === 0
  && row.solver.solved && row.puzzleModelReplay).map((row) => row.levelId);
const unresolvedIds = [...Object.values(STRUCTURAL_BLOCKERS), ...Object.values(SOLVER_BLOCKERS)].flat().sort((a, b) => a - b);
const expectedSafe = [...runtime.PLAYER_FACING_SHUTTER_COUNT_CONTRACT_LEVEL_IDS];
const expectedBefore = [...expectedSafe, ...unresolvedIds].sort((a, b) => a - b);
const invariantFailures = [];
if (JSON.stringify(safeIds) !== JSON.stringify(expectedSafe)) invariantFailures.push("safe certification set drifted");
if (JSON.stringify(beforeMismatchIds) !== JSON.stringify(expectedBefore)) invariantFailures.push("input shutter mismatch set drifted");
if (new Set(unresolvedIds).size !== unresolvedIds.length) invariantFailures.push("blocker groups overlap");

const report = {
  schemaVersion: 1,
  policy: runtime.PLAYER_FACING_SHUTTER_COUNT_CONTRACT_VERSION,
  status: invariantFailures.length ? "FAIL" : "PASS",
  input: { truthPaths, runtimeLevelCount: runtime.LEVELS.length },
  summary: {
    shutterMismatchLevelsBefore: beforeMismatchIds.length,
    safeRepairLevels: safeIds.length,
    blockedLevels: unresolvedIds.length,
    solvedAndReplayed: repairedRows.filter((row) => row.solver.solved && row.puzzleModelReplay).length,
  },
  safeLevelIds: safeIds,
  repairedLevels: repairedRows,
  blockers: {
    structural: STRUCTURAL_BLOCKERS,
    solver: SOLVER_BLOCKERS,
    semantics: {
      "solver-exhausted-proven-unsat": "The exact physical/cohort candidate exhausted its reachable state graph without completing.",
      "solver-max-states-inconclusive": "The exact candidate reached 20,000 states; it is not treated as solved or unsatisfiable.",
      "panel-overlaps-current-opening": "Restoring the exact panel would cover a currently opening-visible block, violating opening_piece_count preservation.",
      "panel-outside-current-playable-mask": "The exact panel rectangle contains cells outside the final playable mask.",
      "hidden-shape-inventory-shortage": "The current hidden pool lacks the competitor's exact per-cover shape histogram without hiding an opening block.",
      "physical-panel-capacity-insufficient": "The required cargo shapes cannot be packed without overlap inside the exact panel rectangle.",
      "missing-exact-panel-source": "The source does not provide a player-facing panel/count set matching the extracted competitor contract.",
      "physical-coverage-audit": "The source panel/cargo candidate fails the shared physical shutter coverage invariant.",
      "aggregate-cohort-source-conflict": "Known aggregate cargo total conflicts with the available exact per-panel source cohorts.",
    },
  },
  invariantFailures,
};

if (writeReport) {
  await mkdir(reportDir, { recursive: true });
  await writeFile(resolve(reportDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  const lines = [
    "# Player-facing shutter count contracts",
    "",
    `- Status: **${report.status}**`,
    `- Input mismatches: ${report.summary.shutterMismatchLevelsBefore}`,
    `- Safe exact repairs: ${report.summary.safeRepairLevels} (${safeIds.join(", ")})`,
    `- Blocked: ${report.summary.blockedLevels}`,
    "",
    "## Blockers",
    "",
    ...Object.entries({ ...STRUCTURAL_BLOCKERS, ...SOLVER_BLOCKERS }).map(([reason, ids]) => `- ${reason}: ${ids.join(", ")}`),
    "",
    "Every safe row preserves the exact opening block ids, keeps generators unchanged, has zero opening same-colour adjacency and zero physical coverage issues, matches all comparable shutter-count facts, and completes a fresh 20k solver route with independent PuzzleModel replay.",
    "",
  ];
  await writeFile(resolve(reportDir, "report.md"), lines.join("\n"));
}
console.log(JSON.stringify(report, null, 2));
if (report.status !== "PASS") process.exitCode = 1;
