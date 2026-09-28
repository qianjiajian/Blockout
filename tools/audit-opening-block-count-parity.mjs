import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const solve = process.argv.includes("--solve");
const truthPaths = [
  "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json",
  "deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-truth-v1.json",
];
const bundle = await build({
  stdin: {
    contents: `
      export { VIDEO_PARITY_LEVELS } from "./src/core/videoParityLevels.generated.ts";
      export { VIDEO_PARITY_LEVELS_101_TO_200 } from "./src/core/videoParityLevels101To200.generated.ts";
      export { repairLevelForSolvability } from "./src/core/solvabilityRepairOverrides.ts";
      export { applySingleBlockAdjacencyRepair } from "./src/core/singleBlockAdjacencyOverrides.ts";
      export { applyLevel19Regeneration } from "./src/core/level19Regeneration.ts";
      export { applyLevel20Regeneration } from "./src/core/level20Regeneration.ts";
      export { applyAllBlockAdjacencyRepair } from "./src/core/allBlockAdjacencyOverrides.ts";
      export { applyLevel21ShutterRepair } from "./src/core/level21ShutterRepair.ts";
      export { applyPost100ShutterCoverageRepair } from "./src/core/post100ShutterCoverageRepairs.ts";
      export { applyShutterRegionRepair } from "./src/core/shutterRegionRepairs.ts";
      export { applyMechanismParityRepair1To100 } from "./src/core/mechanismParityRepairs1To100.ts";
      export { applyMechanismParityRepair101To200 } from "./src/core/mechanismParityRepairs101To200.ts";
      export { applyMechanismParityShutterRegionRepair } from "./src/core/mechanismParityShutterRegions.ts";
      export { applyMechanismAttributeRepair } from "./src/core/mechanismAttributeRepairs.ts";
      export { applyPaletteAwareExitContracts } from "./src/core/paletteAwareExitContracts.ts";
      export { applyOpeningVisibilityCohortRepair } from "./src/core/openingVisibilityCohortRepairs.ts";
      export { applyFinalGeneratorContracts } from "./src/core/finalGeneratorContracts.ts";
      export { applyAllBlockOpeningSolvabilityRepair } from "./src/core/allBlockOpeningSolvabilityRepairs.ts";
      export {
        LEVELS, LEVELS_BEFORE_OPENING_BLOCK_COUNT_REPAIR,
        LEVELS_BEFORE_PLAYER_FACING_SHUTTER_COUNT_CONTRACT,
      } from "./src/core/levels.ts";
      export {
        applyOpeningBlockCountRepair, expectedOpeningBlockCount, openingVisibleBlockIds,
        OPENING_BLOCK_COUNT_REPAIR_LEVEL_IDS, OPENING_BLOCK_COUNT_REPAIR_VERSION,
      } from "./src/core/openingBlockCountRepairs.ts";
      export { extractRuntimeMechanismCountFacts } from "./src/core/competitorMechanismCountContract.ts";
      export { PuzzleModel, validateLevel } from "./src/core/PuzzleModel.ts";
      export { solveLevelForValidation } from "./src/core/levelSolver.ts";
    `,
    resolveDir: root,
    sourcefile: "audit-opening-block-count-parity-entry.ts",
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
const truthDocuments = await Promise.all(truthPaths.map(async (path) => JSON.parse(
  (await readFile(resolve(root, path), "utf8")).replace(/^\uFEFF/, ""),
)));
const truthById = new Map(truthDocuments.flatMap((document) => document.levels ?? []).map((level) => [
  Number(level.level),
  Number.isInteger(level.composition?.opening_piece_count) ? Number(level.composition.opening_piece_count) : null,
]));

const stages = [];
const stage = (name, levels) => {
  stages.push({ name, levels });
  return levels;
};
let levels = stage("canonical", [
  ...runtime.VIDEO_PARITY_LEVELS.map((level, index) => ({ ...level, id: index + 1 })),
  ...runtime.VIDEO_PARITY_LEVELS_101_TO_200,
]);
levels = stage("solvability", levels.map(runtime.repairLevelForSolvability));
levels = stage("singleBlockAdjacency", levels.map(runtime.applySingleBlockAdjacencyRepair));
levels = stage("level19Regeneration", levels.map(runtime.applyLevel19Regeneration));
levels = stage("level20Regeneration", levels.map(runtime.applyLevel20Regeneration));
levels = stage("allBlockAdjacency", levels.map(runtime.applyAllBlockAdjacencyRepair));
levels = stage("level21Shutter", levels.map(runtime.applyLevel21ShutterRepair));
levels = stage("post100Shutter", levels.map(runtime.applyPost100ShutterCoverageRepair));
levels = stage("shutterRegion", levels.map(runtime.applyShutterRegionRepair));
levels = stage("mechanismParity1To100", levels.map(runtime.applyMechanismParityRepair1To100));
levels = stage("mechanismParity101To200", levels.map(runtime.applyMechanismParityRepair101To200));
levels = stage("mechanismParityShutter", levels.map(runtime.applyMechanismParityShutterRegionRepair));
levels = stage("mechanismAttribute", levels.map(runtime.applyMechanismAttributeRepair));
levels = stage("openingVisibilityCohort", levels.map(runtime.applyOpeningVisibilityCohortRepair));
levels = stage("finalGenerator", levels.map(runtime.applyFinalGeneratorContracts));
levels = stage("paletteAwareExit", levels.map(runtime.applyPaletteAwareExitContracts));
levels = stage("allBlockOpeningSolvability", levels.map(runtime.applyAllBlockOpeningSolvabilityRepair));

const baseLevels = runtime.LEVELS_BEFORE_OPENING_BLOCK_COUNT_REPAIR;
const integratedLevels = runtime.LEVELS_BEFORE_PLAYER_FACING_SHUTTER_COUNT_CONTRACT;
const reconstructedCountById = new Map(levels.map((level) => [level.id, runtime.openingVisibleBlockIds(level).length]));
if (!baseLevels.every((level) => runtime.openingVisibleBlockIds(level).length === reconstructedCountById.get(level.id))) {
  throw new Error("Reconstructed opening counts differ from LEVELS_BEFORE_OPENING_BLOCK_COUNT_REPAIR");
}
const basePipelineMatches = baseLevels.every((level) => (
  JSON.stringify(level) === JSON.stringify(integratedLevels.find((candidate) => candidate.id === level.id))
));
const repairedPipeline = baseLevels.map(runtime.applyOpeningBlockCountRepair);
const repairedPipelineMatches = repairedPipeline.every((level) => (
  JSON.stringify(level) === JSON.stringify(integratedLevels.find((candidate) => candidate.id === level.id))
));
if (!basePipelineMatches && !repairedPipelineMatches) {
  throw new Error("Reconstructed pipeline differs from final LEVELS before and after the opening-count overlay");
}
const pipelineIntegration = repairedPipelineMatches && !basePipelineMatches ? "wired" : "not-wired";

const stageMaps = stages.map(({ name, levels: stageLevels }) => ({
  name,
  countById: new Map(stageLevels.map((level) => [level.id, runtime.openingVisibleBlockIds(level).length])),
}));
const integratedLevelById = new Map(integratedLevels.map((level) => [level.id, level]));
const finalRuntimeLevelById = new Map(runtime.LEVELS.map((level) => [level.id, level]));
const rows = baseLevels.map((level) => {
  const expected = truthById.get(level.id) ?? null;
  const before = runtime.openingVisibleBlockIds(level).length;
  const repaired = runtime.applyOpeningBlockCountRepair(level);
  const after = runtime.openingVisibleBlockIds(repaired).length;
  const production = integratedLevelById.get(level.id);
  const finalRuntime = finalRuntimeLevelById.get(level.id);
  const counts = Object.fromEntries(stageMaps.map(({ name, countById }) => [name, countById.get(level.id)]));
  let cause = expected === null || before === expected ? null : "canonical";
  if (expected !== null && counts.canonical === expected && before !== expected) {
    cause = stageMaps.slice(1).find(({ name, countById }, index) => (
      countById.get(level.id) !== stageMaps[index].countById.get(level.id)
    ))?.name ?? "unattributed";
  }
  return {
    levelId: level.id,
    expected,
    before,
    after,
    repaired: repaired !== level,
    production: runtime.openingVisibleBlockIds(production).length,
    finalRuntime: runtime.openingVisibleBlockIds(finalRuntime).length,
    cause,
    counts,
  };
});

const replay = (level, drags) => {
  const model = new runtime.PuzzleModel(level);
  model.start();
  model.startCountdown();
  for (const drag of drags) {
    model.beginAction();
    for (const [x, y] of drag.path) {
      const before = model.getBlock(drag.blockId);
      const distance = Math.abs(before.x - x) + Math.abs(before.y - y);
      const moved = distance === 1
        ? model.moveBlockStep(drag.blockId, x, y)
        : model.moveBlock(drag.blockId, x, y);
      if (!moved) throw new Error(`Lv${level.id}/${drag.blockId} move rejected`);
    }
    if (drag.exitSide && !model.tryExit(drag.blockId, drag.exitSide).ok) {
      throw new Error(`Lv${level.id}/${drag.blockId} exit rejected`);
    }
    if (!model.commitAction()) throw new Error(`Lv${level.id}/${drag.blockId} commit rejected`);
  }
  const snapshot = model.snapshot();
  if (!snapshot.complete || snapshot.blocks.length || snapshot.queuedBlocks.length) {
    throw new Error(`Lv${level.id}: replay incomplete`);
  }
};

const openingAdjacencyIssues = (level) => {
  const visibleIds = new Set(runtime.openingVisibleBlockIds(level));
  const visible = level.blocks.filter((block) => visibleIds.has(block.id));
  const cells = visible.map((block) => new Set(block.shape.map(([dx, dy]) => `${block.x + dx},${block.y + dy}`)));
  const issues = [];
  for (let left = 0; left < visible.length; left += 1) {
    for (let right = left + 1; right < visible.length; right += 1) {
      const leftBlock = visible[left];
      const rightBlock = visible[right];
      if ((leftBlock.layers?.[0] ?? leftBlock.color) !== (rightBlock.layers?.[0] ?? rightBlock.color)) continue;
      if ([...cells[left]].some((cell) => {
        const [x, y] = cell.split(",").map(Number);
        return cells[right].has(`${x + 1},${y}`) || cells[right].has(`${x - 1},${y}`)
          || cells[right].has(`${x},${y + 1}`) || cells[right].has(`${x},${y - 1}`);
      })) issues.push(`${leftBlock.id}:${rightBlock.id}`);
    }
  }
  return issues;
};

const repairEvidence = [];
for (const levelId of runtime.OPENING_BLOCK_COUNT_REPAIR_LEVEL_IDS) {
  const source = baseLevels.find((level) => level.id === levelId);
  const repaired = runtime.applyOpeningBlockCountRepair(source);
  const production = integratedLevelById.get(levelId);
  runtime.validateLevel(repaired);
  const expected = runtime.expectedOpeningBlockCount(levelId);
  const factsPreserved = JSON.stringify(runtime.extractRuntimeMechanismCountFacts(source))
    === JSON.stringify(runtime.extractRuntimeMechanismCountFacts(repaired));
  const evidence = {
    levelId,
    expected,
    before: runtime.openingVisibleBlockIds(source).length,
    after: runtime.openingVisibleBlockIds(repaired).length,
    factsPreserved,
    productionIntegrated: JSON.stringify(repaired) === JSON.stringify(production),
    adjacencyIssues: openingAdjacencyIssues(repaired),
    solver: null,
  };
  if (solve) {
    const solution = runtime.solveLevelForValidation(repaired, 20_000);
    let replayed = false;
    if (solution.solved) {
      replay(repaired, solution.drags);
      replayed = true;
    }
    evidence.solver = {
      solved: solution.solved,
      replayed,
      termination: solution.termination,
      exploredStates: solution.exploredStates,
      drags: solution.drags.length,
      staticUnsatReasons: solution.staticUnsatReasons,
      unsupportedReasons: solution.unsupportedReasons,
    };
  }
  repairEvidence.push(evidence);
}

const comparable = rows.filter((row) => row.expected !== null);
const beforeMismatches = comparable.filter((row) => row.before !== row.expected);
const afterMismatches = comparable.filter((row) => row.after !== row.expected);
const byCause = Object.values(beforeMismatches.reduce((groups, row) => {
  const group = groups[row.cause] ?? { cause: row.cause, levelIds: [] };
  group.levelIds.push(row.levelId);
  groups[row.cause] = group;
  return groups;
}, {}));
const targetedFailures = repairEvidence.filter((row) => row.after !== row.expected
  || !row.factsPreserved
  || (pipelineIntegration === "wired" && !row.productionIntegrated)
  || row.adjacencyIssues.length
  || (solve && (!row.solver?.solved || !row.solver?.replayed)));
const report = {
  schemaVersion: 1,
  policy: runtime.OPENING_BLOCK_COUNT_REPAIR_VERSION,
  status: targetedFailures.length ? "FAIL" : "PASS_SAFE_SUBSET",
  note: "PASS_SAFE_SUBSET certifies only the solver-certified non-overlapping staging releases; remaining mismatches require redesign.",
  truthPaths,
  summary: {
    pipelineIntegration,
    levelCount: rows.length,
    comparableCount: comparable.length,
    unknownTruthLevelIds: rows.filter((row) => row.expected === null).map((row) => row.levelId),
    matchingBefore: comparable.length - beforeMismatches.length,
    mismatchingBefore: beforeMismatches.length,
    matchingAfterSafeSubset: comparable.length - afterMismatches.length,
    remainingMismatchCount: afterMismatches.length,
    remainingMismatchLevelIds: afterMismatches.map((row) => row.levelId),
    byCause,
    repairedLevelIds: repairEvidence.map((row) => row.levelId),
    targetedFailures: targetedFailures.map((row) => row.levelId),
  },
  repairEvidence,
};
console.log(JSON.stringify(report, null, 2));
if (targetedFailures.length) process.exitCode = 1;
