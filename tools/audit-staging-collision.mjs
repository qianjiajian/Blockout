import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = resolve(ROOT, "playtest-results/staging-collision");
const OUTPUT_PATH = resolve(OUTPUT_DIR, "staging-collision-audit.json");
const ASSEMBLY_PATH = resolve(
  ROOT,
  "playtest-results/experiments/competitor-composition-r141/assembled-expanded-density-candidates-v5.json",
);
const SOLUTION_PATH = resolve(ROOT, "playtest-results/round54-100-level-solution-report.json");

const bundle = await build({
  stdin: {
    contents: `
      import { LEVELS } from "./src/core/levels.ts";
      import { PuzzleModel } from "./src/core/PuzzleModel.ts";
      import { calibratedBlockOutDifficulty, scoreBlockOutLevel } from "./src/core/blockOutDifficulty.ts";
      import { STAGING_SEMANTICS_VERSION, shutterHasPhysicalFootprint } from "./src/core/types.ts";
      export { LEVELS, PuzzleModel, calibratedBlockOutDifficulty, scoreBlockOutLevel, STAGING_SEMANTICS_VERSION, shutterHasPhysicalFootprint };
    `,
    resolveDir: ROOT,
    sourcefile: "staging-collision-audit-entry.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const runtime = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].contents).toString("base64")}`);
const [assembly, solutionReport] = await Promise.all([
  readFile(ASSEMBLY_PATH, "utf8").then(JSON.parse),
  readFile(SOLUTION_PATH, "utf8").then(JSON.parse),
]);

const pointKey = (x, y) => `${x},${y}`;
const directions = [
  { id: "R", dx: 1, dy: 0 },
  { id: "L", dx: -1, dy: 0 },
  { id: "D", dx: 0, dy: 1 },
  { id: "U", dx: 0, dy: -1 },
];
const assemblyById = new Map(assembly.levels.map((entry) => [entry.level.id, entry]));
const decisionById = new Map(assembly.decisions.map((entry) => [Number(entry.level_id.slice(2)), entry]));
const solutionById = new Map(solutionReport.levels.map((entry) => [entry.levelId, entry]));
const rows = [];
const footprintKeys = new Set();
let stagingShutterCount = 0;
let invisibleFootprintCellCount = 0;
let uniqueOpeningBlockedTransitions = 0;
let releaseInvariantFailures = 0;
let pulseIsolationFailures = 0;

for (const level of runtime.LEVELS) {
  const staging = (level.shutters ?? []).filter((shutter) => shutter.skin === "staging");
  if (!staging.length) continue;
  stagingShutterCount += staging.length;
  const model = new runtime.PuzzleModel(level);
  const snapshot = model.snapshot();
  const stageFootprint = new Set();
  for (const shutter of staging) {
    if (runtime.shutterHasPhysicalFootprint(shutter)) releaseInvariantFailures += 1;
    for (let y = shutter.y; y < shutter.y + shutter.height; y += 1) {
      for (let x = shutter.x; x < shutter.x + shutter.width; x += 1) {
        stageFootprint.add(pointKey(x, y));
        footprintKeys.add(`${level.id}:${x},${y}`);
      }
    }
  }
  const active = snapshot.blocks.filter((block) => model.isBlockActive(model.getBlock(block.id)));
  const activeCells = new Set(active.flatMap((block) => (
    block.shape.map(([dx, dy]) => pointKey(block.x + dx, block.y + dy))
  )));
  const invisibleCells = [...stageFootprint].filter((key) => !activeCells.has(key));
  invisibleFootprintCellCount += invisibleCells.length;

  const openingBlockedTransitions = [];
  for (const block of active) {
    for (const direction of directions) {
      const x = block.x + direction.dx;
      const y = block.y + direction.dy;
      const destination = block.shape.map(([dx, dy]) => pointKey(x + dx, y + dy));
      if (!destination.some((key) => stageFootprint.has(key))) continue;
      if (!model.canPlace(model.getBlock(block.id), x, y)) continue;
      openingBlockedTransitions.push({ block_id: block.id, direction: direction.id, to: [x, y] });
    }
  }
  uniqueOpeningBlockedTransitions += openingBlockedTransitions.length;

  const countById = new Map((level.shutters ?? []).map((shutter) => [shutter.id, shutter.count]));
  const releaseChecks = [];
  for (const shutter of staging) {
    const predecessors = level.blocks.filter((block) => (
      !block.shutterId || (countById.get(block.shutterId) ?? Number.POSITIVE_INFINITY) < shutter.count
    ));
    const ownCells = new Set();
    let ownStageOverlap = false;
    for (const block of level.blocks.filter((candidate) => candidate.shutterId === shutter.id)) {
      for (const [dx, dy] of block.shape) {
        const key = pointKey(block.x + dx, block.y + dy);
        if (ownCells.has(key)) ownStageOverlap = true;
        ownCells.add(key);
      }
    }
    const passed = predecessors.length === shutter.count && !ownStageOverlap;
    if (!passed) releaseInvariantFailures += 1;
    releaseChecks.push({
      shutter_id: shutter.id,
      count: shutter.count,
      predecessor_blocks: predecessors.length,
      own_stage_overlap: ownStageOverlap,
      passed,
    });
  }

  const stagingBeforePulse = model.snapshot().shutters
    .filter((shutter) => shutter.skin === "staging")
    .map((shutter) => [shutter.id, shutter.count]);
  model.thawAll(2);
  const stagingAfterPulse = model.snapshot().shutters
    .filter((shutter) => shutter.skin === "staging")
    .map((shutter) => [shutter.id, shutter.count]);
  const pulseIsolated = JSON.stringify(stagingBeforePulse) === JSON.stringify(stagingAfterPulse);
  if (!pulseIsolated) pulseIsolationFailures += 1;

  const solution = solutionById.get(level.id);
  const target = level.designTargets?.minimumRepositionOverhead ?? null;
  const historical = assemblyById.get(level.id);
  const historicalDecision = decisionById.get(level.id);
  const currentScore = runtime.calibratedBlockOutDifficulty(runtime.scoreBlockOutLevel(level).score);
  const legacyPhysicalLevel = {
    ...level,
    shutters: (level.shutters ?? []).map((shutter) => (
      shutter.skin === "staging" ? { ...shutter, skin: "shutter" } : shutter
    )),
  };
  const legacyPhysicalScore = runtime.calibratedBlockOutDifficulty(runtime.scoreBlockOutLevel(legacyPhysicalLevel).score);
  rows.push({
    level_id: level.id,
    staging_shutters: staging.map(({ id, x, y, width, height, count }) => ({ id, x, y, width, height, count })),
    unique_footprint_cells: stageFootprint.size,
    invisible_opening_cells: invisibleCells.length,
    opening_transitions_previously_blocked_only_by_staging: openingBlockedTransitions,
    release_checks: releaseChecks,
    pulse_isolated: pulseIsolated,
    difficulty_evidence: {
      target_minimum_reposition_overhead: target,
      historical_accepted_witness_reposition_overhead: historical?.assembly?.route_metrics?.reposition_overhead ?? null,
      historical_certified_lower_bound: historicalDecision
        ? Math.max(...historicalDecision.strict_v5_certificates.map((certificate) => certificate.certified_lower_bound))
        : null,
      historical_certificate_status: "invalidated_by_nonspatial_staging_semantics",
      current_validation_route_reposition_overhead: solution?.repositionOverhead ?? null,
      current_validation_route_below_target: target != null && solution != null
        ? solution.repositionOverhead < target
        : null,
      legacy_physical_staging_d1: legacyPhysicalScore,
      current_nonspatial_staging_d1: currentScore,
      d1_delta: Number((currentScore - legacyPhysicalScore).toFixed(2)),
    },
  });
}

const affectedOpeningLevelIds = rows
  .filter((row) => row.opening_transitions_previously_blocked_only_by_staging.length > 0)
  .map((row) => row.level_id);
const belowTargetLevelIds = rows
  .filter((row) => row.difficulty_evidence.current_validation_route_below_target)
  .map((row) => row.level_id);
const allSolutionsPassed = solutionReport.levelsPassed === 100
  && solutionReport.levels.length === 100
  && solutionReport.levels.every((level) => level.solved);

const report = {
  schema_version: "blockout-staging-collision-audit-1",
  generated_at: new Date().toISOString(),
  staging_semantics_version: runtime.STAGING_SEMANTICS_VERSION,
  passed: allSolutionsPassed
    && rows.length === 80
    && stagingShutterCount === 107
    && footprintKeys.size === 325
    && invisibleFootprintCellCount === 325
    && affectedOpeningLevelIds.length === 73
    && uniqueOpeningBlockedTransitions === 310
    && releaseInvariantFailures === 0
    && pulseIsolationFailures === 0,
  root_cause: "Internal staging counters were hidden by rendering but their rectangles were included in movement collision.",
  fix_contract: {
    spatial_footprint: false,
    decremented_by_pulse: false,
    decremented_by_outer_shell_clear: false,
    decremented_by_whole_block_removal: true,
    player_facing_shutter_and_generator_remain_physical: true,
  },
  counts: {
    campaign_levels: runtime.LEVELS.length,
    staging_levels: rows.length,
    staging_shutters: stagingShutterCount,
    unique_invisible_footprint_cells: footprintKeys.size,
    invisible_opening_cells: invisibleFootprintCellCount,
    opening_affected_levels: affectedOpeningLevelIds.length,
    opening_transitions_previously_blocked_only_by_staging: uniqueOpeningBlockedTransitions,
    release_invariant_failures: releaseInvariantFailures,
    pulse_isolation_failures: pulseIsolationFailures,
    current_solutions_passed: solutionReport.levelsPassed,
    historical_floor_certificates_invalidated: rows.length,
    current_validation_routes_below_authored_reposition_target: belowTargetLevelIds.length,
  },
  affected_level_ids: rows.map((row) => row.level_id),
  opening_affected_level_ids: affectedOpeningLevelIds,
  current_validation_routes_below_authored_reposition_target_level_ids: belowTargetLevelIds,
  lv17_regression: rows.find((row) => row.level_id === 17),
  levels: rows,
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
if (!report.passed) throw new Error(`Staging collision audit failed: ${JSON.stringify(report.counts)}`);
console.log(JSON.stringify({ output: OUTPUT_PATH, counts: report.counts, lv17: report.lv17_regression }, null, 2));
