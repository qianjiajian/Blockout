import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { build } from "esbuild";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(import.meta.dirname, "..");
const bundlePath = resolve(root, `.codex-temp/mechanism-attribute-structural-${process.pid}.mjs`);
const outputDir = resolve(root, "playtest-results/experiments/mechanism-attribute-structural-2026-09-20");
const truthPaths = [
  "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json",
  "deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-truth-v1.json",
];

await build({
  stdin: {
    contents: `
      export {
        LEVELS,
        LEVELS_BEFORE_MECHANISM_ATTRIBUTE_STRUCTURAL_REPAIR as BASE_LEVELS,
        LEVELS_BEFORE_BOARD_TOPOLOGY_REPAIR as INTEGRATED_LEVELS,
      } from "./src/core/levels.ts";
      export {
        auditCompetitorMechanismCountContracts,
        extractCompetitorMechanismCountContracts,
      } from "./src/core/competitorMechanismCountContract.ts";
      export {
        applyMechanismAttributeStructuralRepair,
        MECHANISM_ATTRIBUTE_STRUCTURAL_REPAIR_LEVEL_IDS,
        STRUCTURAL_NUMERIC_ICE_BLOCKED_LEVEL_IDS,
        STRUCTURAL_AXIS_BLOCKED_LEVEL_IDS,
        STRUCTURAL_LOCK_BLOCKED_LEVEL_IDS,
        STRUCTURAL_COLORED_GRID_BLOCKED_LEVEL_IDS,
      } from "./src/core/mechanismAttributeStructuralRepairs.ts";
      export { PuzzleModel, validateLevel } from "./src/core/PuzzleModel.ts";
      export { solveLevelForValidation } from "./src/core/levelSolver.ts";
    `,
    resolveDir: root,
    sourcefile: "mechanism-attribute-structural-verifier-entry.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  target: "es2022",
  outfile: bundlePath,
  logLevel: "silent",
});

const runtime = await import(`${pathToFileURL(bundlePath).href}?t=${Date.now()}`);
await rm(bundlePath, { force: true });
const contracts = (await Promise.all(truthPaths.map(async (path) => JSON.parse(
  (await readFile(resolve(root, path), "utf8")).replace(/^\uFEFF/, ""),
)))).flatMap(runtime.extractCompetitorMechanismCountContracts);
const repairedLevels = runtime.BASE_LEVELS.map(runtime.applyMechanismAttributeStructuralRepair);
const repairedById = new Map(repairedLevels.map((level) => [level.id, level]));
const sourceById = new Map(runtime.BASE_LEVELS.map((level) => [level.id, level]));
const productionById = new Map(runtime.INTEGRATED_LEVELS.map((level) => [level.id, level]));

const scopedFields = new Set([
  "numericIceCount", "numericIceValues", "axisBlockCount", "keyCount", "lockCount",
  "lockRequirements", "starBlockCount", "bombCount", "rotationBadgeCount", "coloredGridCellCount",
]);
const scopedIssues = (levels) => runtime.auditCompetitorMechanismCountContracts(levels, contracts)
  .flatMap((record) => record.issues)
  .filter((issue) => scopedFields.has(issue.field) && issue.levelId !== 19 && issue.levelId !== 20);
const beforeIssues = scopedIssues(runtime.BASE_LEVELS);
const afterIssues = scopedIssues(repairedLevels);
const sortedUnique = (issues) => [...new Set(issues.map((issue) => issue.levelId))].sort((a, b) => a - b);
const residualGroups = {
  numericIce: sortedUnique(afterIssues.filter((issue) => issue.field === "numericIceCount" || issue.field === "numericIceValues")),
  axis: sortedUnique(afterIssues.filter((issue) => issue.field === "axisBlockCount")),
  lock: sortedUnique(afterIssues.filter((issue) => issue.field === "lockCount" || issue.field === "lockRequirements")),
  coloredGrid: sortedUnique(afterIssues.filter((issue) => issue.field === "coloredGridCellCount")),
};
const expectedResidualGroups = {
  numericIce: [...runtime.STRUCTURAL_NUMERIC_ICE_BLOCKED_LEVEL_IDS],
  axis: [...runtime.STRUCTURAL_AXIS_BLOCKED_LEVEL_IDS],
  lock: [...runtime.STRUCTURAL_LOCK_BLOCKED_LEVEL_IDS],
  coloredGrid: [...runtime.STRUCTURAL_COLORED_GRID_BLOCKED_LEVEL_IDS],
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
  const blocks = openingVisibleBlocks(level);
  const occupied = new Map();
  for (const block of blocks) for (const [dx, dy] of block.shape) {
    const key = `${block.x + dx},${block.y + dy}`;
    occupied.set(key, [...(occupied.get(key) ?? []), block]);
  }
  const pairs = new Set();
  for (const block of blocks) {
    const color = block.layers?.[0] ?? block.color;
    for (const [sx, sy] of block.shape) for (const [dx, dy] of [[1, 0], [0, 1]]) {
      for (const neighbour of occupied.get(`${block.x + sx + dx},${block.y + sy + dy}`) ?? []) {
        if (block.id === neighbour.id || (neighbour.layers?.[0] ?? neighbour.color) !== color) continue;
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

const invariants = [];
const rows = [];
for (const levelId of runtime.MECHANISM_ATTRIBUTE_STRUCTURAL_REPAIR_LEVEL_IDS) {
  const before = sourceById.get(levelId);
  const level = repairedById.get(levelId);
  const invariant = {
    levelId,
    blockCount: before.blocks.length === level.blocks.length,
    blockIds: JSON.stringify(before.blocks.map((block) => block.id)) === JSON.stringify(level.blocks.map((block) => block.id)),
    openingPieceCount: openingVisibleBlocks(before).length === openingVisibleBlocks(level).length,
    gates: JSON.stringify(before.gates) === JSON.stringify(level.gates),
    flipDoors: JSON.stringify(before.flipDoors ?? []) === JSON.stringify(level.flipDoors ?? []),
    shutters: JSON.stringify(before.shutters ?? []) === JSON.stringify(level.shutters ?? []),
    generators: JSON.stringify(before.generators ?? []) === JSON.stringify(level.generators ?? []),
    productionIntegrated: JSON.stringify(level) === JSON.stringify(productionById.get(levelId)),
  };
  invariants.push(invariant);
  const startedAt = performance.now();
  let validation = "pass";
  let replayStatus = "not-run";
  let result;
  try {
    runtime.validateLevel(level);
    result = runtime.solveLevelForValidation(level, 20_000);
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
    minimumDrags: result?.minimumDrags ?? null,
    repositionOverhead: result?.repositionOverhead ?? null,
    staticUnsatReasons: result?.staticUnsatReasons ?? [],
    replay: replayStatus,
    elapsedMs: Math.round(performance.now() - startedAt),
  });
}

const adjacency = repairedLevels.flatMap((level) => {
  const violations = adjacencyViolations(level);
  return violations.length ? [{ levelId: level.id, violations }] : [];
});
const invariantFailures = invariants.filter((row) => Object.entries(row).some(([key, value]) => key !== "levelId" && !value));
const solverFailures = rows.filter((row) => !row.solved || row.replay !== "pass" || row.validation !== "pass");
const report = {
  policy: "mechanism-attribute-structural-safe-subset-v1",
  status: blockerSetMismatches.length || adjacency.length || invariantFailures.length || solverFailures.length ? "FAIL" : "PASS",
  scope: {
    modifiedLevelIds: runtime.MECHANISM_ATTRIBUTE_STRUCTURAL_REPAIR_LEVEL_IDS,
    modifiedLevelCount: runtime.MECHANISM_ATTRIBUTE_STRUCTURAL_REPAIR_LEVEL_IDS.length,
  },
  quantities: {
    beforeIssueCount: beforeIssues.length,
    afterIssueCount: afterIssues.length,
    repairedIssueCount: beforeIssues.length - afterIssues.length,
    residualGroups,
    expectedResidualGroups,
    blockerSetMismatches,
    afterIssues,
  },
  invariants: { failures: invariantFailures, rows: invariants },
  adjacency: {
    levelCount: repairedLevels.length,
    violationCount: adjacency.reduce((sum, row) => sum + row.violations.length, 0),
    failures: adjacency,
  },
  solver: { budget: 20_000, solved: rows.filter((row) => row.solved).length, failures: solverFailures, rows },
  blockers: {
    numericIce: {
      levelIds: expectedResidualGroups.numericIce,
      reasons: {
        11: "No 20k-certified binding; all tested exact bindings exhausted before a legal thaw route.",
        17: "No 20k-certified binding; exact 19/18/6 carrier sets exceeded the bounded solver and failed baseline-route replay.",
        115: "Six total clear events cannot thaw two value-9 blocks (at most five other clears per carrier).",
        161: "Thirteen total clear events cannot thaw value-20 blocks (at most twelve other clears per carrier).",
        183: "The final-runtime thawed baseline itself exceeds the 20,000-state certification budget; no bounded-safe binding is claimed.",
        198: "Thirty total clear events cannot thaw the canonical value-39 carrier (at most twenty-nine other clears).",
      },
    },
    axis: {
      levelIds: expectedResidualGroups.axis,
      reasons: {
        60: "Exact 35-axis full-board assignment has no adjacency-safe color/position arrangement compatible with the unchanged exits.",
      },
    },
    locks: {
      levelIds: expectedResidualGroups.lock,
      reason: "Canonical key counts are below the maximum simultaneous lock requirement; rebinding cannot create missing key clears.",
    },
  },
};

await mkdir(outputDir, { recursive: true });
await writeFile(resolve(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
const markdown = [
  "# Mechanism attribute structural repairs",
  "",
  `Status: **${report.status}**`,
  `Safe levels: ${report.scope.modifiedLevelIds.join(", ")}`,
  `Solver/replay: ${report.solver.solved}/${report.scope.modifiedLevelCount}`,
  `All-campaign opening adjacency violations: ${report.adjacency.violationCount}`,
  `Residual numeric blockers: ${report.quantities.residualGroups.numericIce.join(", ") || "none"}`,
  `Residual axis blockers: ${report.quantities.residualGroups.axis.join(", ") || "none"}`,
  `Residual lock blockers: ${report.quantities.residualGroups.lock.join(", ") || "none"}`,
  `Residual colored-grid blockers: ${report.quantities.residualGroups.coloredGrid.join(", ") || "none"}`,
  "",
  "| Level | States | Drags | Overhead | Replay |",
  "|---:|---:|---:|---:|:---:|",
  ...rows.map((row) => `| ${row.levelId} | ${row.exploredStates} | ${row.minimumDrags ?? "-"} | ${row.repositionOverhead ?? "-"} | ${row.replay} |`),
  "",
].join("\n");
await writeFile(resolve(outputDir, "report.md"), markdown, "utf8");
console.log(JSON.stringify(report, null, 2));
if (report.status !== "PASS") process.exitCode = 1;
