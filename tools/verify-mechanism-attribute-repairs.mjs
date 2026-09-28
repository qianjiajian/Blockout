import { readFile } from "node:fs/promises";
import { build } from "esbuild";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const truthPaths = [
  "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json",
  "deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-truth-v1.json",
];
const bundle = await build({
  stdin: {
    contents: `
      export { LEVELS_BEFORE_MECHANISM_ATTRIBUTE_REPAIR as LEVELS } from "./src/core/levels.ts";
      export {
        auditCompetitorMechanismCountContracts,
        extractCompetitorMechanismCountContracts,
      } from "./src/core/competitorMechanismCountContract.ts";
      export {
        applyMechanismAttributeRepair,
        AXIS_ATTRIBUTE_BLOCKED_LEVEL_IDS,
        COLORED_GRID_ATTRIBUTE_BLOCKED_LEVEL_IDS,
        LOCK_ATTRIBUTE_BLOCKED_LEVEL_IDS,
        MECHANISM_ATTRIBUTE_REPAIR_LEVEL_IDS,
        NUMERIC_ICE_ATTRIBUTE_BLOCKED_LEVEL_IDS,
      } from "./src/core/mechanismAttributeRepairs.ts";
      export { PuzzleModel, validateLevel } from "./src/core/PuzzleModel.ts";
      export { solveLevelForValidation } from "./src/core/levelSolver.ts";
    `,
    resolveDir: root,
    sourcefile: "verify-mechanism-attribute-repairs-entry.ts",
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
const contracts = truthDocuments.flatMap(runtime.extractCompetitorMechanismCountContracts);
const repairedLevels = runtime.LEVELS.map(runtime.applyMechanismAttributeRepair);
const repairedById = new Map(repairedLevels.map((level) => [level.id, level]));
const scopedFields = new Set([
  "numericIceCount", "numericIceValues", "axisBlockCount", "keyCount", "lockCount",
  "lockRequirements", "starBlockCount", "bombCount", "rotationBadgeCount", "coloredGridCellCount",
]);
const scopedIssues = (levels) => runtime.auditCompetitorMechanismCountContracts(levels, contracts)
  .flatMap((record) => record.issues)
  .filter((issue) => scopedFields.has(issue.field) && issue.levelId !== 19 && issue.levelId !== 20);

const beforeIssues = scopedIssues(runtime.LEVELS);
const afterIssues = scopedIssues(repairedLevels);
const sortedUniqueLevelIds = (issues) => [...new Set(issues.map((issue) => issue.levelId))]
  .sort((left, right) => left - right);
const residualGroups = {
  numericIce: sortedUniqueLevelIds(afterIssues.filter((issue) => (
    issue.field === "numericIceCount" || issue.field === "numericIceValues"
  ))),
  axis: sortedUniqueLevelIds(afterIssues.filter((issue) => issue.field === "axisBlockCount")),
  lock: sortedUniqueLevelIds(afterIssues.filter((issue) => (
    issue.field === "lockCount" || issue.field === "lockRequirements"
  ))),
  coloredGrid: sortedUniqueLevelIds(afterIssues.filter((issue) => issue.field === "coloredGridCellCount")),
};
const expectedResidualGroups = {
  numericIce: [...runtime.NUMERIC_ICE_ATTRIBUTE_BLOCKED_LEVEL_IDS],
  axis: [...runtime.AXIS_ATTRIBUTE_BLOCKED_LEVEL_IDS],
  lock: [...runtime.LOCK_ATTRIBUTE_BLOCKED_LEVEL_IDS],
  coloredGrid: [...runtime.COLORED_GRID_ATTRIBUTE_BLOCKED_LEVEL_IDS],
};
const blockerSetMismatches = Object.keys(expectedResidualGroups).filter((key) => (
  JSON.stringify(residualGroups[key]) !== JSON.stringify(expectedResidualGroups[key])
));

const openingVisibleBlocks = (level) => {
  const queued = new Set((level.generators ?? []).flatMap((generator) => generator.queueBlockIds));
  const closed = new Set((level.shutters ?? []).filter((shutter) => shutter.count > 0).map((shutter) => shutter.id));
  return level.blocks.filter((block) => !queued.has(block.id) && !(block.shutterId && closed.has(block.shutterId)));
};

const adjacencyViolations = (level) => {
  const occupants = new Map();
  const blocks = openingVisibleBlocks(level);
  for (const block of blocks) {
    for (const [dx, dy] of block.shape) {
      const key = `${block.x + dx},${block.y + dy}`;
      occupants.set(key, [...(occupants.get(key) ?? []), block]);
    }
  }
  const pairs = new Set();
  for (const block of blocks) {
    const color = block.layers?.[0] ?? block.color;
    for (const [sx, sy] of block.shape) {
      const x = block.x + sx;
      const y = block.y + sy;
      for (const [dx, dy] of [[1, 0], [0, 1]]) {
        for (const neighbour of occupants.get(`${x + dx},${y + dy}`) ?? []) {
          if (neighbour.id === block.id || (neighbour.layers?.[0] ?? neighbour.color) !== color) continue;
          pairs.add([block.id, neighbour.id].sort().join("|"));
        }
      }
    }
  }
  return [...pairs];
};

const replay = (level, drags) => {
  const model = new runtime.PuzzleModel(level);
  model.start();
  model.startCountdown();
  const timedIntervals = (level.generators ?? [])
    .filter((generator) => generator.trigger === "time")
    .map((generator) => Math.max(generator.intervalSeconds ?? 1, generator.initialDelaySeconds ?? 0));
  const tickDuration = timedIntervals.length ? Math.max(...timedIntervals) : 0;
  for (const drag of drags) {
    if (!model.getBlock(drag.blockId) && tickDuration > 0) model.tick(tickDuration);
    if (!model.getBlock(drag.blockId)) throw new Error(`${drag.blockId} is not active`);
    model.beginAction();
    for (const [x, y] of drag.path) {
      const before = model.getBlock(drag.blockId);
      if (!before) throw new Error(`${drag.blockId} disappeared during drag`);
      const moved = Math.abs(before.x - x) + Math.abs(before.y - y) === 1
        ? model.moveBlockStep(drag.blockId, x, y)
        : model.moveBlock(drag.blockId, x, y);
      if (!moved) throw new Error(`${drag.blockId} cannot move to ${x},${y}`);
    }
    if (drag.exitSide && !model.tryExit(drag.blockId, drag.exitSide).ok) {
      throw new Error(`${drag.blockId} cannot exit ${drag.exitSide}`);
    }
    if (!model.commitAction()) throw new Error(`${drag.blockId} action did not commit`);
    if (tickDuration > 0) model.tick(tickDuration);
  }
  const snapshot = model.snapshot();
  if (!snapshot.complete || snapshot.blocks.length || snapshot.queuedBlocks.length) {
    throw new Error("replay did not complete");
  }
};

const rows = [];
for (const levelId of runtime.MECHANISM_ATTRIBUTE_REPAIR_LEVEL_IDS) {
  const level = repairedById.get(levelId);
  const startedAt = performance.now();
  let validation = "pass";
  let staticUnsatReasons = [];
  let replayStatus = "not-run";
  let result;
  try {
    runtime.validateLevel(level);
    result = runtime.solveLevelForValidation(level, 20_000);
    staticUnsatReasons = result.staticUnsatReasons;
    if (result.solved) {
      replay(level, result.drags);
      replayStatus = "pass";
    }
  } catch (error) {
    validation = error instanceof Error ? error.message : String(error);
  }
  rows.push({
    levelId,
    validation,
    solved: Boolean(result?.solved),
    termination: result?.termination ?? "validation-error",
    exploredStates: result?.exploredStates ?? 0,
    staticUnsatReasons,
    replay: replayStatus,
    elapsedMs: Math.round(performance.now() - startedAt),
  });
}

const adjacency = repairedLevels.flatMap((level) => {
  const violations = adjacencyViolations(level);
  return violations.length ? [{ levelId: level.id, violations }] : [];
});
const byField = (issues) => Object.fromEntries([...new Set(issues.map((issue) => issue.field))]
  .sort()
  .map((field) => [field, issues.filter((issue) => issue.field === field).map((issue) => issue.levelId)]));
const staticUnsat = rows.filter((row) => row.staticUnsatReasons.length > 0);
const validationFailures = rows.filter((row) => row.validation !== "pass");
const replayFailures = rows.filter((row) => row.solved && row.replay !== "pass");
const maxStates = rows.filter((row) => !row.solved && row.termination === "max_states");
const solverFailures = rows.filter((row) => !row.solved);
const report = {
  policy: "solver-certified-mechanism-attributes-v2",
  status: blockerSetMismatches.length || adjacency.length || staticUnsat.length
    || validationFailures.length || replayFailures.length || solverFailures.length
    ? "FAIL"
    : "PASS",
  scope: {
    excludedSeparateOwnershipLevelIds: [19, 20],
    modifiedLevelCount: runtime.MECHANISM_ATTRIBUTE_REPAIR_LEVEL_IDS.length,
    modifiedLevelIds: runtime.MECHANISM_ATTRIBUTE_REPAIR_LEVEL_IDS,
  },
  quantities: {
    beforeIssueCount: beforeIssues.length,
    beforeByField: byField(beforeIssues),
    afterIssueCount: afterIssues.length,
    repairedIssueCount: beforeIssues.length - afterIssues.length,
    residualGroups,
    expectedResidualGroups,
    blockerSetMismatches,
    afterIssues,
  },
  validation: {
    passed: rows.length - validationFailures.length,
    failures: validationFailures,
  },
  adjacency: {
    levelCount: repairedLevels.length,
    violationCount: adjacency.reduce((sum, row) => sum + row.violations.length, 0),
    failures: adjacency,
  },
  solver: {
    budget: 20_000,
    solved: rows.filter((row) => row.solved).length,
    replayed: rows.filter((row) => row.replay === "pass").length,
    maxStatesLevelIds: maxStates.map((row) => row.levelId),
    failures: solverFailures,
    staticUnsat,
    replayFailures,
    rows,
  },
};

console.log(JSON.stringify(report, null, 2));
if (report.status !== "PASS") process.exitCode = 1;
