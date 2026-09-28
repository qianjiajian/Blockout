import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const truthPaths = [
  "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json",
  "deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-truth-v1.json",
];
const reportDir = resolve(root, "playtest-results/experiments/opening-block-count-expansion-2026-09-20");
const writeReport = process.argv.includes("--write-report");
const expectedRepairIds = [
  24, 25, 26, 27, 28, 30, 31, 32, 38, 39, 40, 44, 46, 47, 48, 49, 53, 54,
  55, 57, 59, 61, 62, 64, 66, 67, 68, 69, 72, 73, 74, 75, 77, 79, 89, 91,
  94, 98, 99, 100, 102, 110, 116, 118, 119, 120, 122, 123, 126, 132, 134, 135,
  137, 142, 146, 151, 153, 155, 162, 170, 172, 174, 175, 177, 179, 180, 184,
  186, 187, 188, 189, 194, 195, 196, 197, 198,
];

const runtimeBuild = await build({
  stdin: {
    contents: [
      "export { LEVELS, LEVELS_BEFORE_OPENING_BLOCK_COUNT_EXPANSION_REPAIR } from './src/core/levels.ts';",
      "export { PuzzleModel, validateLevel } from './src/core/PuzzleModel.ts';",
      "export { solveLevelForValidation } from './src/core/levelSolver.ts';",
      "export { openingVisibleBlockIds } from './src/core/openingBlockCountRepairs.ts';",
      "export { auditOrdinaryShutterCoverage } from './src/core/shutterCoverage.ts';",
      "export { extractRuntimeMechanismCountFacts } from './src/core/competitorMechanismCountContract.ts';",
      "export * from './src/core/openingBlockCountExpansionRepairs.ts';",
    ].join("\n"),
    resolveDir: root,
    sourcefile: "verify-opening-block-count-expansion.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  target: "es2022",
  write: false,
  logLevel: "silent",
});
const runtime = await import(`data:text/javascript;base64,${Buffer.from(runtimeBuild.outputFiles[0].text).toString("base64")}`);
const moduleBundle = await build({
  stdin: {
    contents: "export * from './src/core/openingBlockCountExpansionRepairs.ts';",
    resolveDir: root,
    sourcefile: "opening-block-count-expansion-entry.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "browser",
  format: "esm",
  target: "es2022",
  minify: true,
  treeShaking: true,
  write: false,
  logLevel: "silent",
});
const moduleBundleBytes = Buffer.byteLength(moduleBundle.outputFiles[0].text);

const truthDocuments = await Promise.all(truthPaths.map(async (path) => JSON.parse(
  (await readFile(resolve(root, path), "utf8")).replace(/^\uFEFF/, ""),
)));
const truthRows = truthDocuments.flatMap((document) => document.levels ?? []);
const truthById = new Map(truthRows.map((row) => {
  const count = row.composition?.opening_piece_count;
  return [Number(row.level), typeof count === "number" && Number.isFinite(count) ? count : undefined];
}));
const knownTruthIds = [...truthById].filter(([, expected]) => Number.isFinite(expected)).map(([id]) => id).sort((a, b) => a - b);

const sameJson = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const withoutPlacement = ({ x: _x, y: _y, shutterId: _stage, ...block }) => block;
const adjacencyIssues = (level) => {
  const opening = new Set(runtime.openingVisibleBlockIds(level));
  const blocks = level.blocks.filter((block) => opening.has(block.id));
  const occupants = new Map();
  for (const block of blocks) for (const [dx, dy] of block.shape) {
    const key = `${block.x + dx},${block.y + dy}`;
    occupants.set(key, [...(occupants.get(key) ?? []), block]);
  }
  const pairs = new Set();
  for (const block of blocks) for (const [dx, dy] of block.shape) {
    const x = block.x + dx, y = block.y + dy;
    for (const [sx, sy] of [[1, 0], [0, 1]]) for (const neighbour of occupants.get(`${x + sx},${y + sy}`) ?? []) {
      if (block.id !== neighbour.id && (block.layers?.[0] ?? block.color) === (neighbour.layers?.[0] ?? neighbour.color)) {
        pairs.add([block.id, neighbour.id].sort().join("|"));
      }
    }
  }
  return [...pairs];
};
const replay = (level, drags) => {
  const model = new runtime.PuzzleModel(level);
  model.start();
  model.startCountdown();
  const timedInterval = Math.max(0, ...(level.generators ?? [])
    .filter((generator) => generator.trigger === "time")
    .map((generator) => Math.max(generator.initialDelaySeconds ?? 0, generator.intervalSeconds ?? 1)));
  for (const drag of drags) {
    if (!model.getBlock(drag.blockId) && timedInterval > 0) model.tick(timedInterval);
    if (!model.getBlock(drag.blockId)) return false;
    model.beginAction();
    for (const [x, y] of drag.path) {
      const before = model.getBlock(drag.blockId);
      if (!before) return false;
      const distance = Math.abs(before.x - x) + Math.abs(before.y - y);
      const moved = distance === 1
        ? model.moveBlockStep(drag.blockId, x, y)
        : model.moveBlock(drag.blockId, x, y);
      if (!moved) return false;
    }
    if (drag.exitSide && !model.tryExit(drag.blockId, drag.exitSide).ok) return false;
    if (!model.commitAction()) return false;
    if (timedInterval > 0) model.tick(timedInterval);
  }
  const snapshot = model.snapshot();
  return snapshot.complete && snapshot.blocks.length === 0 && snapshot.queuedBlocks.length === 0;
};
const fileSha256 = async (path) => createHash("sha256").update(await readFile(resolve(root, path))).digest("hex").toUpperCase();

const repairedRows = [];
for (const levelId of runtime.OPENING_BLOCK_COUNT_EXPANSION_LEVEL_IDS) {
  const source = runtime.LEVELS_BEFORE_OPENING_BLOCK_COUNT_EXPANSION_REPAIR.find((level) => level.id === levelId);
  const repaired = runtime.applyOpeningBlockCountExpansionRepair(source);
  const production = runtime.LEVELS.find((level) => level.id === levelId);
  let validationError = null;
  try { runtime.validateLevel(repaired); } catch (error) { validationError = error instanceof Error ? error.message : String(error); }
  const expected = truthById.get(levelId);
  const sourceOpeningCount = runtime.openingVisibleBlockIds(source).length;
  const repairedOpeningCount = runtime.openingVisibleBlockIds(repaired).length;
  const changedBlocks = repaired.blocks.flatMap((block, index) => {
    const before = source.blocks[index];
    if (block.x === before.x && block.y === before.y && block.shutterId === before.shutterId) return [];
    return [{
      blockId: block.id,
      blockIndex: index,
      from: { x: before.x, y: before.y, shutterId: before.shutterId ?? null },
      to: { x: block.x, y: block.y, shutterId: block.shutterId ?? null },
      distance: Math.abs(block.x - before.x) + Math.abs(block.y - before.y),
    }];
  });
  const adjacency = adjacencyIssues(repaired);
  const generatorsPreserved = sameJson(repaired.generators ?? [], source.generators ?? []);
  const gatesPreserved = sameJson(repaired.gates ?? [], source.gates ?? []);
  const flipDoorsPreserved = sameJson(repaired.flipDoors ?? [], source.flipDoors ?? []);
  const blockContentPreserved = sameJson(repaired.blocks.map(withoutPlacement), source.blocks.map(withoutPlacement));
  const physicalShuttersPreserved = sameJson(
    (repaired.shutters ?? []).filter((shutter) => shutter.skin !== "staging"),
    (source.shutters ?? []).filter((shutter) => shutter.skin !== "staging"),
  );
  const coveragePreserved = sameJson(runtime.auditOrdinaryShutterCoverage(repaired), runtime.auditOrdinaryShutterCoverage(source));
  const mechanismFactsPreserved = sameJson(
    runtime.extractRuntimeMechanismCountFacts(repaired),
    runtime.extractRuntimeMechanismCountFacts(source),
  );
  const idempotent = runtime.applyOpeningBlockCountExpansionRepair(repaired) === repaired;
  const productionIntegrated = sameJson(production, repaired);
  const solver = runtime.solveLevelForValidation(repaired, 20_000);
  const replayed = solver.solved && replay(repaired, solver.drags);
  const passed = repairedOpeningCount === expected
    && adjacency.length === 0
    && validationError === null
    && generatorsPreserved && gatesPreserved && flipDoorsPreserved && blockContentPreserved
    && physicalShuttersPreserved && coveragePreserved && mechanismFactsPreserved && idempotent && productionIntegrated
    && solver.solved && solver.staticUnsatReasons.length === 0 && solver.unsupportedReasons.length === 0 && replayed;
  repairedRows.push({
    levelId,
    expectedOpeningCount: expected,
    sourceOpeningCount,
    repairedOpeningCount,
    changedBlocks: changedBlocks.length,
    unchangedPositionBlocks: changedBlocks.filter((row) => row.distance === 0).length,
    relocatedBlocks: changedBlocks.filter((row) => row.distance > 0).length,
    totalManhattanDistance: changedBlocks.reduce((total, row) => total + row.distance, 0),
    adjacencyViolations: adjacency,
    validationError,
    preserved: {
      generators: generatorsPreserved,
      gates: gatesPreserved,
      flipDoors: flipDoorsPreserved,
      blockContent: blockContentPreserved,
      playerFacingShutters: physicalShuttersPreserved,
      physicalShutterCoverage: coveragePreserved,
      runtimeMechanismFacts: mechanismFactsPreserved,
    },
    idempotent,
    productionIntegrated,
    solver: {
      solved: solver.solved,
      termination: solver.termination,
      exploredStates: solver.exploredStates,
      drags: solver.drags.length,
      staticUnsatReasons: solver.staticUnsatReasons,
      unsupportedReasons: solver.unsupportedReasons,
    },
    puzzleModelReplay: replayed,
    passed,
    changedBlockDetails: changedBlocks,
  });
}

const projectedById = new Map(runtime.LEVELS_BEFORE_OPENING_BLOCK_COUNT_EXPANSION_REPAIR.map((level) => {
  const projected = runtime.applyOpeningBlockCountExpansionRepair(level);
  return [level.id, runtime.openingVisibleBlockIds(projected).length];
}));
const inputMatchedKnownIds = knownTruthIds.filter((id) => runtime.openingVisibleBlockIds(
  runtime.LEVELS_BEFORE_OPENING_BLOCK_COUNT_EXPANSION_REPAIR[id - 1],
).length === truthById.get(id));
const projectedMatchedKnownIds = knownTruthIds.filter((id) => projectedById.get(id) === truthById.get(id));
const prerequisiteOverlapIds = [39, 55, 64, 73, 77, 110, 119, 132, 134, 137, 177, 179, 189, 194];
const failures = [];
if (!sameJson([...runtime.OPENING_BLOCK_COUNT_EXPANSION_LEVEL_IDS], expectedRepairIds)) failures.push("76-level repair cohort drifted");
if (repairedRows.some((row) => !row.passed)) failures.push("one or more repaired levels failed exact count/invariant/solver/replay certification");
if (moduleBundleBytes >= 4096) failures.push(`isolated minified overlay bundle is ${moduleBundleBytes} B, expected <4096 B`);
if (prerequisiteOverlapIds.some((id) => !repairedRows.find((row) => row.levelId === id)?.passed)) failures.push("prerequisite-repair overlap cohort is not fully certified");

const report = {
  schemaVersion: 1,
  policy: runtime.OPENING_BLOCK_COUNT_EXPANSION_VERSION,
  status: failures.length ? "FAIL" : "PASS",
  generatedAt: new Date().toISOString(),
  input: {
    truthPaths,
    runtimeLevelCount: runtime.LEVELS.length,
    sourceSha256: {
      levels: await fileSha256("src/core/levels.ts"),
      mechanismAttributeStructuralRepairs: await fileSha256("src/core/mechanismAttributeStructuralRepairs.ts"),
      boardTopologyRepairs: await fileSha256("src/core/boardTopologyRepairs.ts"),
      shutterGeometryCoverageRepairs: await fileSha256("src/core/shutterGeometryCoverageRepairs.ts"),
      competitorExactShutterGeometryRepairsPost100: await fileSha256("src/core/competitorExactShutterGeometryRepairsPost100.ts"),
      openingBlockCountExpansionRepairs: await fileSha256("src/core/openingBlockCountExpansionRepairs.ts"),
    },
  },
  summary: {
    knownCompetitorOpeningCounts: knownTruthIds.length,
    inputAlreadyMatchingKnown: inputMatchedKnownIds.length,
    repairedLevels: repairedRows.length,
    projectedMatchingKnown: projectedMatchedKnownIds.length,
    projectedRemainingKnownMismatches: knownTruthIds.length - projectedMatchedKnownIds.length,
    solvedAndReplayed: repairedRows.filter((row) => row.solver.solved && row.puzzleModelReplay).length,
    exactCountAndAdjacencyZero: repairedRows.filter((row) => row.repairedOpeningCount === row.expectedOpeningCount && row.adjacencyViolations.length === 0).length,
    changedOpeningBlocks: repairedRows.reduce((total, row) => total + row.changedBlocks, 0),
    unchangedPositionBlocks: repairedRows.reduce((total, row) => total + row.unchangedPositionBlocks, 0),
    relocatedBlocks: repairedRows.reduce((total, row) => total + row.relocatedBlocks, 0),
    totalManhattanDistance: repairedRows.reduce((total, row) => total + row.totalManhattanDistance, 0),
    maxExploredStates: Math.max(...repairedRows.map((row) => row.solver.exploredStates)),
    maxSolverDrags: Math.max(...repairedRows.map((row) => row.solver.drags)),
    isolatedMinifiedOverlayBundleBytes: moduleBundleBytes,
    isolatedBundleTargetBytesExclusive: 4096,
  },
  repairLevelIds: expectedRepairIds,
  prerequisiteRepairOverlapIds: prerequisiteOverlapIds,
  projectedRemainingKnownMismatchIds: knownTruthIds.filter((id) => projectedById.get(id) !== truthById.get(id)),
  repairedLevels: repairedRows,
  failures,
};

if (writeReport) {
  await mkdir(reportDir, { recursive: true });
  await writeFile(resolve(reportDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  const lines = [
    "# Opening block-count expansion certification",
    "",
    `- Status: **${report.status}**`,
    `- Policy: \`${report.policy}\``,
    `- Certified repairs: ${report.summary.solvedAndReplayed}/${report.summary.repairedLevels}`,
    `- Exact opening count + zero opening same-colour adjacency: ${report.summary.exactCountAndAdjacencyZero}/${report.summary.repairedLevels}`,
    `- Known competitor counts matched after projection: ${report.summary.projectedMatchingKnown}/${report.summary.knownCompetitorOpeningCounts}`,
    `- Blocks exposed: ${report.summary.changedOpeningBlocks} (${report.summary.unchangedPositionBlocks} kept their source coordinates; ${report.summary.relocatedBlocks} minimally repacked)`,
    `- Solver ceiling: 20,000 states; observed maximum: ${report.summary.maxExploredStates}; maximum route: ${report.summary.maxSolverDrags} drags`,
    `- Isolated minified overlay bundle: ${report.summary.isolatedMinifiedOverlayBundleBytes} B (< ${report.summary.isolatedBundleTargetBytesExclusive} B)`,
    "",
    "## Certified levels",
    "",
    expectedRepairIds.join(", "),
    "",
    "## Prerequisite-repair overlap re-certification",
    "",
    `Lv${prerequisiteOverlapIds.join(", Lv")} were regenerated from the current final LEVELS after the structural, board-topology, shutter-coverage and exact post-100 shutter layers, then independently passed the same exact-count, adjacency, validation, mechanism-preservation, 20k solver and PuzzleModel replay gates.`,
    "",
    "## Preservation contract",
    "",
    "The overlay only exposes blocks from positive internal staging and optionally repacks those blocks into verified playable cells. It does not modify generators, exits, player-facing shutters, flip doors, block colour/shape/layers, or runtime mechanism-count facts. Ordinary shutter physical-coverage audit output is byte-for-byte preserved for every repaired level.",
    "",
    "## Remaining scope",
    "",
    `This independent 76-level overlay raises projected exact opening-count parity from ${report.summary.inputAlreadyMatchingKnown}/${report.summary.knownCompetitorOpeningCounts} to ${report.summary.projectedMatchingKnown}/${report.summary.knownCompetitorOpeningCounts}. The ${report.summary.projectedRemainingKnownMismatches} remaining known mismatches are intentionally not changed by this certified batch.`,
    "",
  ];
  if (failures.length) lines.push("## Failures", "", ...failures.map((failure) => `- ${failure}`), "");
  await writeFile(resolve(reportDir, "report.md"), lines.join("\n"));
}
console.log(JSON.stringify({ status: report.status, summary: report.summary, failures }, null, 2));
if (report.status !== "PASS") process.exitCode = 1;
