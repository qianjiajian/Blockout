import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "esbuild";

const root = process.cwd();
const outputDir = resolve(root, "playtest-results/experiments/generator-spawn-alignment-2026-09-20");
const bundle = await build({
  stdin: {
    contents: `
      export { LEVELS, LEVELS_BEFORE_GENERATOR_SPAWN_ALIGNMENT_REPAIR, LEVELS_BEFORE_OPENING_BLOCK_COUNT_EXPANSION_REPAIR } from "./src/core/levels.ts";
      export * from "./src/core/generatorSpawnAlignmentRepairs.ts";
      export { validateGeneratorMouthSpawn } from "./src/core/generatorMouthSpawnGeometry.ts";
      export { solveLevelForValidation } from "./src/core/levelSolver.ts";
      export { PuzzleModel, validateLevel } from "./src/core/PuzzleModel.ts";
    `,
    resolveDir: root,
    sourcefile: "verify-generator-spawn-alignment-entry.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  target: "es2022",
  write: false,
  logLevel: "silent",
});
const runtime = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);

const expectedLevelIds = [
  35, 36, 37, 38, 39, 41, 43, 44, 46, 47, 49, 56, 57, 58, 62, 70, 71, 77,
  87, 88, 89, 90, 114, 116, 119, 127, 129, 132, 138, 139, 143, 156, 161, 177,
  183, 186,
];
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const sha256 = (text) => createHash("sha256").update(text).digest("hex").toUpperCase();
const normalizedShape = (shape) => {
  const minX = Math.min(...shape.map(([x]) => x));
  const minY = Math.min(...shape.map(([, y]) => y));
  return shape.map(([x, y]) => `${x - minX},${y - minY}`).sort().join(";");
};
const withoutSpawn = ({ spawn: _spawn, ...generator }) => generator;
const SOLVER_STATE_BUDGET = 30_000;
const replay = (level, drags) => {
  const model = new runtime.PuzzleModel(level);
  model.start();
  model.startCountdown();
  const timedInterval = Math.max(0, ...(level.generators ?? [])
    .filter((generator) => generator.trigger === "time")
    .map((generator) => Math.max(generator.initialDelaySeconds ?? 0, generator.intervalSeconds ?? 1)));
  for (const drag of drags) {
    if (!model.getBlock(drag.blockId) && timedInterval > 0) model.tick(timedInterval);
    if (!model.getBlock(drag.blockId)) return { ok: false, error: `missing ${drag.blockId}` };
    model.beginAction();
    for (const [x, y] of drag.path) {
      const before = model.getBlock(drag.blockId);
      if (!before) return { ok: false, error: `missing ${drag.blockId} during drag` };
      const distance = Math.abs(before.x - x) + Math.abs(before.y - y);
      const moved = distance === 1
        ? model.moveBlockStep(drag.blockId, x, y)
        : model.moveBlock(drag.blockId, x, y);
      if (!moved) return { ok: false, error: `move ${drag.blockId} -> ${x},${y}` };
    }
    if (drag.exitSide && !model.tryExit(drag.blockId, drag.exitSide).ok) {
      return { ok: false, error: `exit ${drag.blockId} ${drag.exitSide}` };
    }
    if (!model.commitAction()) return { ok: false, error: `commit ${drag.blockId}` };
    if (timedInterval > 0) model.tick(timedInterval);
  }
  const snapshot = model.snapshot();
  return {
    ok: snapshot.complete && snapshot.blocks.length === 0 && snapshot.queuedBlocks.length === 0,
    moves: snapshot.moves,
    cleared: snapshot.cleared,
    active: snapshot.blocks.length,
    queued: snapshot.queuedBlocks.length,
  };
};

const sourceById = new Map(runtime.LEVELS_BEFORE_GENERATOR_SPAWN_ALIGNMENT_REPAIR.map((level) => [level.id, level]));
const alignedById = new Map(runtime.LEVELS_BEFORE_OPENING_BLOCK_COUNT_EXPANSION_REPAIR.map((level) => [level.id, level]));
const productionById = new Map(runtime.LEVELS.map((level) => [level.id, level]));
const actualLevelIds = runtime.LEVELS.filter((level) => level.generators?.length).map((level) => level.id);
const rows = [];

for (const levelId of actualLevelIds) {
  const source = sourceById.get(levelId);
  const aligned = alignedById.get(levelId);
  const production = productionById.get(levelId);
  const queued = new Set(source.generators.flatMap((generator) => generator.queueBlockIds));
  const sourceBlocks = new Map(source.blocks.map((block) => [block.id, block]));
  const alignedBlocks = new Map(aligned.blocks.map((block) => [block.id, block]));
  const productionBlocks = new Map(production.blocks.map((block) => [block.id, block]));
  const pieceRows = (production.generators ?? []).flatMap((generator) => generator.queueBlockIds.map((blockId) => {
    const block = productionBlocks.get(blockId);
    const validation = block
      ? runtime.validateGeneratorMouthSpawn(generator, generator.spawn, block.shape, production)
      : { status: "invalid", reason: `missing queue block ${blockId}` };
    return {
      generatorId: generator.id,
      blockId,
      status: validation.status,
      touchesCenterMouth: validation.touchesCenterMouth ?? false,
      footprint: validation.footprint ?? [],
      reason: validation.status === "ok" ? null : validation.reason,
    };
  }));
  const sourceIssues = runtime.generatorSpawnAlignmentIssues(source);
  const alignedIssues = runtime.generatorSpawnAlignmentIssues(aligned);
  const productionIssues = runtime.generatorSpawnAlignmentIssues(production);
  let validationError = null;
  try { runtime.validateLevel(production); } catch (error) {
    validationError = error instanceof Error ? error.message : String(error);
  }
  const started = performance.now();
  const solver = runtime.solveLevelForValidation(production, SOLVER_STATE_BUDGET);
  const replayResult = solver.solved ? replay(production, solver.drags) : null;
  const nonQueuedBlocksPreserved = source.blocks.filter((block) => !queued.has(block.id))
    .every((block) => same(block, alignedBlocks.get(block.id)));
  const queuedSemanticsPreserved = [...queued].every((blockId) => {
    const before = sourceBlocks.get(blockId);
    const after = alignedBlocks.get(blockId);
    return normalizedShape(before.shape) === normalizedShape(after.shape)
      && same({ ...before, shape: undefined }, { ...after, shape: undefined });
  });
  const protectedLevelFieldsPreserved = same({
    ...source,
    blocks: undefined,
    generators: source.generators.map(withoutSpawn),
  }, {
    ...aligned,
    blocks: undefined,
    generators: aligned.generators.map(withoutSpawn),
  });
  // Later certified overlays may legitimately change a board, queue binding or
  // generator payload (for example the frozen-cargo and exact-mask repairs).
  // Integration therefore means that every authored machine still exists and
  // the final runtime level satisfies the center-mouth contract, rather than
  // byte-for-byte equality with this intermediate pipeline stage.
  const productionGeneratorIds = new Set((production.generators ?? []).map((generator) => generator.id));
  const productionIntegrated = (production.generators?.length ?? 0) === aligned.generators.length
    && aligned.generators.every((generator) => productionGeneratorIds.has(generator.id))
    && productionIssues.length === 0
    && pieceRows.every((row) => row.status === "ok" && row.touchesCenterMouth);
  const idempotent = same(runtime.applyGeneratorSpawnAlignmentRepair(aligned), aligned);
  const passed = alignedIssues.length === 0
    && pieceRows.every((row) => row.status === "ok" && row.touchesCenterMouth)
    && validationError === null && nonQueuedBlocksPreserved && queuedSemanticsPreserved
    && protectedLevelFieldsPreserved && productionIntegrated && idempotent
    && solver.solved && replayResult?.ok;
  rows.push({
    levelId,
    machines: production.generators?.length ?? 0,
    queuePieces: pieceRows.length,
    sourceIssueCount: sourceIssues.length,
    sourceIssues,
    alignedIssues,
    productionIssues,
    centerMouthValidated: pieceRows.filter((row) => row.status === "ok" && row.touchesCenterMouth).length,
    pieceRows,
    preserved: {
      nonQueuedBlocks: nonQueuedBlocksPreserved,
      queuedShapeAndSemantics: queuedSemanticsPreserved,
      boardExitsShuttersAndMachineContracts: protectedLevelFieldsPreserved,
    },
    productionIntegrated,
    idempotent,
    validationError,
    solver: {
      solved: solver.solved,
      termination: solver.termination,
      exploredStates: solver.exploredStates,
      drags: solver.drags.length,
      durationMs: Math.round((performance.now() - started) * 100) / 100,
      staticUnsatReasons: solver.staticUnsatReasons,
      unsupportedReasons: solver.unsupportedReasons,
    },
    puzzleModelReplay: replayResult,
    passed,
  });
}

const machineCount = rows.reduce((sum, row) => sum + row.machines, 0);
const queuePieceCount = rows.reduce((sum, row) => sum + row.queuePieces, 0);
const centerMouthValidated = rows.reduce((sum, row) => sum + row.centerMouthValidated, 0);
const failures = [
  ...(same(actualLevelIds, expectedLevelIds) ? [] : [`generator level ids [${actualLevelIds}] != [${expectedLevelIds}]`]),
  ...(machineCount === 62 ? [] : [`machine count ${machineCount} != 62`]),
  ...(queuePieceCount === 216 ? [] : [`queue piece count ${queuePieceCount} != 216`]),
  ...(centerMouthValidated === queuePieceCount ? [] : [`center-mouth validated ${centerMouthValidated}/${queuePieceCount}`]),
  ...rows.filter((row) => !row.passed).map((row) => `Lv${row.levelId}: static/preservation/solver/replay gate failed`),
];
const sourceText = await readFile(resolve(root, "src/core/generatorSpawnAlignmentRepairs.ts"), "utf8");
const report = {
  status: failures.length ? "FAIL" : "PASS",
  policy: runtime.GENERATOR_SPAWN_ALIGNMENT_VERSION,
  generatedAt: new Date().toISOString(),
  sourceSha256: sha256(sourceText),
  summary: {
    generatorLevels: rows.length,
    machines: machineCount,
    queuePieces: queuePieceCount,
    sourceMachinesWithAlignmentIssues: rows.reduce((sum, row) => sum + Number(row.sourceIssueCount > 0), 0),
    centerMouthValidated,
    solvedAndReplayed: rows.filter((row) => row.solver.solved && row.puzzleModelReplay?.ok).length,
    maxExploredStates: Math.max(...rows.map((row) => row.solver.exploredStates)),
    solverStateBudget: SOLVER_STATE_BUDGET,
  },
  definition: {
    machinePlacement: "three reserved rim rails, exposed board edge, no exit/rim overlap",
    spawnAnchor: "top-left of the inward axis-aligned 3x3 staging template",
    queueFootprint: "every queued shape remains fully playable and contains mouthCells[1], the center-axis mouth cell",
    blockedBehavior: "a blocked authored footprint is not relocated and does not consume queue inventory",
  },
  levelIds: actualLevelIds,
  levels: rows,
  failures,
};

await mkdir(outputDir, { recursive: true });
await writeFile(resolve(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
const markdown = [
  "# Generator center-mouth spawn alignment verification",
  "",
  `- Status: **${report.status}**`,
  `- Policy: \`${report.policy}\``,
  `- Audited: ${report.summary.generatorLevels} levels / ${report.summary.machines} machines / ${report.summary.queuePieces} queue pieces`,
  `- Center-mouth + playable validation: ${report.summary.centerMouthValidated}/${report.summary.queuePieces}`,
  `- Fresh solver + PuzzleModel replay: ${report.summary.solvedAndReplayed}/${report.summary.generatorLevels} (${report.summary.solverStateBudget.toLocaleString("en-US")}-state bound)`,
  `- Maximum explored states: ${report.summary.maxExploredStates}`,
  `- Overlay SHA-256: \`${report.sourceSha256}\``,
  "",
  "Every queued piece keeps its physical shape, colour, layers, order and trigger semantics. Only the common 3x3 template anchor and that piece's relative template offset change. A piece that touches only either outside mouth cell is invalid; the final footprint must contain the middle mouth cell.",
  "",
  "| Level | Machines | Queue pieces | Source issues | Center valid | States | Replay |",
  "|---:|---:|---:|---:|---:|---:|:---:|",
  ...rows.map((row) => `| ${row.levelId} | ${row.machines} | ${row.queuePieces} | ${row.sourceIssueCount} | ${row.centerMouthValidated} | ${row.solver.exploredStates} | ${row.puzzleModelReplay?.ok ? "PASS" : "FAIL"} |`),
  "",
];
if (failures.length) markdown.push("## Failures", "", ...failures.map((failure) => `- ${failure}`), "");
await writeFile(resolve(outputDir, "report.md"), `${markdown.join("\n")}\n`, "utf8");
console.log(JSON.stringify({
  status: report.status,
  summary: report.summary,
  sourceSha256: report.sourceSha256,
  outputDir,
  failures,
}, null, 2));
if (failures.length) process.exitCode = 1;
