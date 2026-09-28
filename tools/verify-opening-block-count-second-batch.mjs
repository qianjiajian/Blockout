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
const reportDir = resolve(root, "playtest-results/experiments/opening-block-count-second-batch-2026-09-20");
const writeReport = process.argv.includes("--write-report");
const safeIds = [29, 51, 87, 152, 158, 200];
const initialMismatchIds = [
  19, 29, 41, 50, 51, 52, 71, 83, 84, 87, 107, 109, 111, 121, 127, 128,
  129, 130, 131, 133, 143, 144, 152, 158, 160, 163, 167, 168, 173, 178, 181, 183, 200,
];
const capacityShortageIds = [109, 111, 121, 128, 129, 131, 133, 143, 144, 160, 163, 167, 168, 173, 178, 181];
const boundedSearch = {
  41: "180 valid packings; 138 official 20k runs exhausted. The opening cohort exactly fills the 22 cells outside two preserved covers.",
  50: "280 valid packings; every official 20k run exhausted.",
  52: "280 exact 6x8 tilings; 279 official 20k runs exhausted and one worker timed out.",
  71: "23,880 valid packings; best direct-exit chain 2; five strongest candidates produced no 20k replay certificate.",
  83: "Five strongest valid layouts exceeded the bounded worker time; no 20k replay certificate.",
  84: "144 valid packings; best direct-exit chain 8; two strongest candidates produced no 20k replay certificate.",
  130: "Valid exact-count/adjacency-zero packing exists; sampled official 20k run reached max_states.",
  183: "200 valid static packings exist; best direct-exit chain 5; no official 20k replay certificate was obtained.",
};

const output = await build({
  stdin: {
    contents: [
      "export { LEVELS_BEFORE_OPENING_BLOCK_COUNT_SECOND_BATCH_REPAIR } from './src/core/levels.ts';",
      "export { PuzzleModel, validateLevel } from './src/core/PuzzleModel.ts';",
      "export { solveLevelForValidation } from './src/core/levelSolver.ts';",
      "export { openingVisibleBlockIds } from './src/core/openingBlockCountRepairs.ts';",
      "export { auditOrdinaryShutterCoverage } from './src/core/shutterCoverage.ts';",
      "export { extractRuntimeMechanismCountFacts } from './src/core/competitorMechanismCountContract.ts';",
      "export * from './src/core/openingBlockCountSecondBatchRepairs.ts';",
    ].join("\n"),
    resolveDir: root,
    sourcefile: "verify-opening-block-count-second-batch.ts",
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
const inputLevels = runtime.LEVELS_BEFORE_OPENING_BLOCK_COUNT_SECOND_BATCH_REPAIR;
const moduleBuild = await build({
  stdin: { contents: "export * from './src/core/openingBlockCountSecondBatchRepairs.ts';", resolveDir: root, sourcefile: "opening-second-entry.ts", loader: "ts" },
  bundle: true, platform: "browser", format: "esm", target: "es2022", minify: true, write: false, logLevel: "silent",
});
const moduleBundleBytes = Buffer.byteLength(moduleBuild.outputFiles[0].text);
const truthDocuments = await Promise.all(truthPaths.map(async (path) => JSON.parse(
  (await readFile(resolve(root, path), "utf8")).replace(/^\uFEFF/, ""),
)));
const truthById = new Map(truthDocuments.flatMap((document) => document.levels ?? []).map((row) => [
  Number(row.level), typeof row.composition?.opening_piece_count === "number" ? row.composition.opening_piece_count : undefined,
]));
const knownTruthIds = [...truthById].filter(([, count]) => Number.isFinite(count)).map(([id]) => id).sort((a, b) => a - b);
const sameJson = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const withoutPlacement = ({ x: _x, y: _y, shutterId: _stage, ...block }) => block;
const openingIds = (level) => runtime.openingVisibleBlockIds(level);
const adjacencyIssues = (level) => {
  const opening = new Set(openingIds(level));
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
  const model = new runtime.PuzzleModel(level); model.start(); model.startCountdown();
  const interval = Math.max(0, ...(level.generators ?? []).filter((generator) => generator.trigger === "time")
    .map((generator) => Math.max(generator.initialDelaySeconds ?? 0, generator.intervalSeconds ?? 1)));
  for (const drag of drags) {
    if (!model.getBlock(drag.blockId) && interval > 0) model.tick(interval);
    if (!model.getBlock(drag.blockId)) return false;
    model.beginAction();
    for (const [x, y] of drag.path) {
      const before = model.getBlock(drag.blockId);
      if (!before) return false;
      const distance = Math.abs(before.x - x) + Math.abs(before.y - y);
      if (!(distance === 1 ? model.moveBlockStep(drag.blockId, x, y) : model.moveBlock(drag.blockId, x, y))) return false;
    }
    if (drag.exitSide && !model.tryExit(drag.blockId, drag.exitSide).ok) return false;
    if (!model.commitAction()) return false;
    if (interval > 0) model.tick(interval);
  }
  const snapshot = model.snapshot();
  return snapshot.complete && snapshot.blocks.length === 0 && snapshot.queuedBlocks.length === 0;
};
const fileSha256 = async (path) => createHash("sha256").update(await readFile(resolve(root, path))).digest("hex").toUpperCase();
const internalStaging = (level) => {
  const queue = new Set((level.generators ?? []).flatMap((generator) => generator.queueBlockIds));
  const shutters = new Map((level.shutters ?? []).map((shutter) => [shutter.id, shutter]));
  return level.blocks.filter((block) => {
    const shutter = block.shutterId ? shutters.get(block.shutterId) : undefined;
    return !queue.has(block.id) && shutter?.skin === "staging" && shutter.count > 0;
  });
};

const repairedRows = [];
for (const levelId of runtime.OPENING_BLOCK_COUNT_SECOND_BATCH_LEVEL_IDS) {
  const source = inputLevels[levelId - 1];
  const repaired = runtime.applyOpeningBlockCountSecondBatchRepair(source);
  let validationError = null;
  try { runtime.validateLevel(repaired); } catch (error) { validationError = error instanceof Error ? error.message : String(error); }
  const physicalIds = new Set((source.shutters ?? []).filter((shutter) => shutter.skin !== "staging").map((shutter) => shutter.id));
  const physicalBindingsPreserved = source.blocks.every((block, index) => !block.shutterId || !physicalIds.has(block.shutterId)
    || repaired.blocks[index]?.shutterId === block.shutterId);
  const preserved = {
    generators: sameJson(repaired.generators ?? [], source.generators ?? []),
    gates: sameJson(repaired.gates ?? [], source.gates ?? []),
    flipDoors: sameJson(repaired.flipDoors ?? [], source.flipDoors ?? []),
    playerFacingShutters: sameJson((repaired.shutters ?? []).filter((shutter) => shutter.skin !== "staging"), (source.shutters ?? []).filter((shutter) => shutter.skin !== "staging")),
    playerFacingBindings: physicalBindingsPreserved,
    shutterCoverage: sameJson(runtime.auditOrdinaryShutterCoverage(repaired), runtime.auditOrdinaryShutterCoverage(source)),
    mechanismFacts: sameJson(runtime.extractRuntimeMechanismCountFacts(repaired), runtime.extractRuntimeMechanismCountFacts(source)),
    blockContent: sameJson(repaired.blocks.map(withoutPlacement), source.blocks.map(withoutPlacement)),
    boardTopology: repaired.width === source.width && repaired.height === source.height
      && sameJson(repaired.playable ?? [], source.playable ?? []) && sameJson(repaired.blocked ?? [], source.blocked ?? []),
    coloredGrids: sameJson(repaired.coloredGrids ?? [], source.coloredGrids ?? []),
  };
  const solver = runtime.solveLevelForValidation(repaired, 20_000);
  const replayed = solver.solved && replay(repaired, solver.drags);
  const changes = repaired.blocks.flatMap((block, index) => {
    const before = source.blocks[index];
    if (block.x === before.x && block.y === before.y && block.shutterId === before.shutterId) return [];
    return [{ blockIndex: index, blockId: block.id, from: [before.x, before.y], to: [block.x, block.y], removedInternalStaging: Boolean(before.shutterId && !block.shutterId) }];
  });
  const expected = truthById.get(levelId);
  const adjacency = adjacencyIssues(repaired);
  const passed = openingIds(repaired).length === expected && adjacency.length === 0 && validationError === null
    && Object.values(preserved).every(Boolean) && solver.solved && !solver.staticUnsatReasons.length
    && !solver.unsupportedReasons.length && replayed && runtime.applyOpeningBlockCountSecondBatchRepair(repaired) === repaired;
  repairedRows.push({
    levelId, expectedOpeningCount: expected, sourceOpeningCount: openingIds(source).length,
    repairedOpeningCount: openingIds(repaired).length, adjacencyViolations: adjacency, validationError,
    preserved, changes, solver: { solved: solver.solved, termination: solver.termination, exploredStates: solver.exploredStates, drags: solver.drags.length, staticUnsatReasons: solver.staticUnsatReasons, unsupportedReasons: solver.unsupportedReasons },
    puzzleModelReplay: replayed, passed,
  });
}

const currentMismatchIds = knownTruthIds.filter((id) => openingIds(inputLevels[id - 1]).length !== truthById.get(id));
const projected = inputLevels.map((level) => runtime.applyOpeningBlockCountSecondBatchRepair(level));
const projectedMismatchIds = knownTruthIds.filter((id) => openingIds(projected[id - 1]).length !== truthById.get(id));
const shortageRows = capacityShortageIds.map((levelId) => {
  const level = inputLevels[levelId - 1];
  const expected = truthById.get(levelId);
  const opening = openingIds(level).length;
  const staging = internalStaging(level).length;
  return { levelId, expected, opening, internalStaging: staging, safeCapacity: opening + staging, deficit: expected - opening - staging };
});
const level19 = inputLevels[18];
const level107 = inputLevels[106];
const level107Opening = new Set([...openingIds(level107), ...internalStaging(level107).map((block) => block.id)]);
const level107CellDemand = level107.blocks.filter((block) => level107Opening.has(block.id)).reduce((sum, block) => sum + block.shape.length, 0);
const level107Playable = new Set((level107.playable ?? Array.from({ length: level107.height }, (_, y) => Array.from({ length: level107.width }, (__, x) => [x, y])).flat()).map(([x, y]) => `${x},${y}`));
for (const [x, y] of level107.blocked ?? []) level107Playable.delete(`${x},${y}`);
for (const shutter of (level107.shutters ?? []).filter((entry) => entry.count > 0 && (entry.skin === undefined || entry.skin === "shutter"))) {
  for (let dy = 0; dy < shutter.height; dy += 1) for (let dx = 0; dx < shutter.width; dx += 1) level107Playable.delete(`${shutter.x + dx},${shutter.y + dy}`);
}
const level127 = inputLevels[126];
const level127Cohort = [...new Set([...openingIds(level127), ...internalStaging(level127).map((block) => block.id)])];
const level127Red = level127.blocks.filter((block) => level127Cohort.includes(block.id) && (block.layers?.[0] ?? block.color) === "red").length;
const level127Shutters = (level127.shutters ?? []).filter((entry) => entry.count > 0 && (entry.skin === undefined || entry.skin === "shutter"));

const structuralBlockers = {
  totalBlockInventory: [{ levelId: 19, expected: truthById.get(19), totalBlocks: level19.blocks.length, deficit: truthById.get(19) - level19.blocks.length }],
  internalStagingCapacity: shortageRows,
  legalBoardCellCapacity: [{ levelId: 107, openingCellDemand: level107CellDemand, legalCellsOutsidePlayerShutters: level107Playable.size, deficit: level107CellDemand - level107Playable.size }],
  preservedShutterDeadlock: [{ levelId: 127, playerShutters: level127Shutters, openingRedBlocks: level127Red, minimumCountdown: Math.min(...level127Shutters.map((shutter) => shutter.count)) }],
};
const failures = [];
if (!sameJson([...runtime.OPENING_BLOCK_COUNT_SECOND_BATCH_LEVEL_IDS], safeIds)) failures.push("safe level set drifted");
if (!sameJson(currentMismatchIds, initialMismatchIds)) failures.push("input 33-level mismatch set drifted");
if (!sameJson(projectedMismatchIds, initialMismatchIds.filter((id) => !safeIds.includes(id)))) failures.push("projected mismatch set drifted");
if (repairedRows.some((row) => !row.passed)) failures.push("one or more safe repairs failed exact-count/invariant/solver/replay certification");
if (shortageRows.some((row) => row.deficit <= 0)) failures.push("declared staging-capacity blocker no longer has a deficit");
if (truthById.get(19) <= level19.blocks.length) failures.push("Lv19 total inventory blocker drifted");
if (level107CellDemand <= level107Playable.size) failures.push("Lv107 legal-cell capacity blocker drifted");
if (level127Red >= Math.min(...level127Shutters.map((shutter) => shutter.count))) failures.push("Lv127 preserved-shutter deadlock blocker drifted");

const report = {
  schemaVersion: 1,
  policy: runtime.OPENING_BLOCK_COUNT_SECOND_BATCH_VERSION,
  status: failures.length ? "FAIL" : "PASS",
  generatedAt: new Date().toISOString(),
  input: {
    truthPaths,
    sourceSha256: {
      levels: await fileSha256("src/core/levels.ts"),
      firstBatch: await fileSha256("src/core/openingBlockCountExpansionRepairs.ts"),
      generatorSpawnAlignment: await fileSha256("src/core/generatorSpawnAlignmentRepairs.ts"),
      secondBatch: await fileSha256("src/core/openingBlockCountSecondBatchRepairs.ts"),
    },
  },
  summary: {
    mismatchLevelsBefore: currentMismatchIds.length,
    certifiedSafeRepairs: repairedRows.length,
    solvedAndReplayed: repairedRows.filter((row) => row.solver.solved && row.puzzleModelReplay).length,
    mismatchLevelsAfterProjection: projectedMismatchIds.length,
    knownCompetitorCountsMatchedAfterProjection: knownTruthIds.length - projectedMismatchIds.length,
    structurallyImpossibleUnderContract: 19,
    boundedSearchWithout20kProof: Object.keys(boundedSearch).length,
    isolatedMinifiedOverlayBundleBytes: moduleBundleBytes,
  },
  safeLevelIds: safeIds,
  repairedLevels: repairedRows,
  structuralBlockers,
  boundedSearchWithout20kProof: boundedSearch,
  remainingMismatchIds: projectedMismatchIds,
  failures,
};

if (writeReport) {
  await mkdir(reportDir, { recursive: true });
  await writeFile(resolve(reportDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  const lines = [
    "# Opening block-count expansion: second batch",
    "",
    `- Status: **${report.status}**`,
    `- Certified safe repairs: ${report.summary.certifiedSafeRepairs}/${report.summary.mismatchLevelsBefore} (${safeIds.join(", ")})`,
    `- Solver + PuzzleModel replay: ${report.summary.solvedAndReplayed}/${report.summary.certifiedSafeRepairs}`,
    `- Known competitor opening counts matched after projection: ${report.summary.knownCompetitorCountsMatchedAfterProjection}/${knownTruthIds.length}`,
    `- Remaining mismatches: ${report.summary.mismatchLevelsAfterProjection}`,
    `- Isolated minified overlay: ${moduleBundleBytes} B`,
    "",
    "## Contract-safe repairs",
    "",
    ...repairedRows.map((row) => `- Lv${row.levelId}: ${row.repairedOpeningCount}/${row.expectedOpeningCount}; ${row.solver.exploredStates} states, ${row.solver.drags} drags; ${row.changes.length} coordinate/staging changes.`),
    "",
    "Every certified repair preserves generators, gates, flip doors, player-facing shutter geometry and direct bindings, ordinary shutter coverage, block content, coloured grids, board topology and runtime mechanism facts. No force repair is used.",
    "",
    "## Structurally impossible under the allowed contract",
    "",
    `- Lv19: competitor needs ${truthById.get(19)} opening blocks, but the level has only ${level19.blocks.length} total blocks.`,
    `- Internal-staging shortage (${capacityShortageIds.length}): ${shortageRows.map((row) => `Lv${row.levelId} ${row.safeCapacity}/${row.expected}`).join("; ")}.`,
    `- Lv107: the exact opening cohort occupies ${level107CellDemand} cells, while preserving its player shutter leaves only ${level107Playable.size} legal cells.`,
    `- Lv127: preserved full-width shutters require at least ${Math.min(...level127Shutters.map((shutter) => shutter.count))} exits before release; only ${level127Red} opening red blocks can reach the sole initially accessible bottom exit.`,
    "",
    "## Valid layouts without a 20k certificate",
    "",
    ...Object.entries(boundedSearch).map(([id, reason]) => `- Lv${id}: ${reason}`),
    "",
    "These eight levels are not claimed unsatisfiable; they remain unchanged because no candidate met the required official 20,000-state solver and independent replay gate.",
    "",
  ];
  if (failures.length) lines.push("## Failures", "", ...failures.map((failure) => `- ${failure}`), "");
  await writeFile(resolve(reportDir, "report.md"), lines.join("\n"));
}
console.log(JSON.stringify({ status: report.status, summary: report.summary, failures }, null, 2));
if (report.status !== "PASS") process.exitCode = 1;
