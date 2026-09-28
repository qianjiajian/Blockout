import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const write = process.argv.includes("--write");
const solve = process.argv.includes("--solve");
const truthPath = "deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-truth-v1.json";
const outputDir = resolve(root, "playtest-results/experiments/competitor-exact-shutter-geometry-post100-2026-09-20");

const bundle = await build({
  stdin: {
    contents: `
      export {
        LEVELS_BEFORE_COMPETITOR_EXACT_SHUTTER_GEOMETRY_POST100,
        LEVELS_BEFORE_OPENING_BLOCK_COUNT_EXPANSION_REPAIR,
      } from "./src/core/levels.ts";
      export { validateLevel, PuzzleModel } from "./src/core/PuzzleModel.ts";
      export { solveLevelForValidation } from "./src/core/levelSolver.ts";
      export { auditOrdinaryShutterCoverage, isOrdinaryShutter } from "./src/core/shutterCoverage.ts";
      export { finalGeneratorPlacementIssues } from "./src/core/finalGeneratorContracts.ts";
      export { compareCompetitorMechanismCountContract, extractCompetitorMechanismCountContracts } from "./src/core/competitorMechanismCountContract.ts";
      export {
        applyCompetitorExactShutterGeometryRepairPost100,
        COMPETITOR_EXACT_SHUTTER_GEOMETRY_POST100_LEVEL_IDS,
        COMPETITOR_EXACT_SHUTTER_GEOMETRY_POST100_VERSION,
      } from "./src/core/competitorExactShutterGeometryRepairsPost100.ts";
    `,
    resolveDir: root,
    sourcefile: "audit-competitor-exact-shutter-geometry-post100-entry.ts",
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
const truthById = new Map(truth.levels.map((row) => [Number(row.level), row]));
const contractById = new Map(api.extractCompetitorMechanismCountContracts(truth)
  .map((contract) => [contract.levelId, contract]));

const cellKey = (x, y) => `${x},${y}`;
const cellsOf = (block) => block.shape.map(([dx, dy]) => [block.x + dx, block.y + dy]);
const boundsOf = (blocks) => {
  const cells = blocks.flatMap(cellsOf);
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
const sorted = (items) => [...items].sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
const same = (left, right) => JSON.stringify(sorted(left)) === JSON.stringify(sorted(right));

const coverEvidence = (levelId) => {
  const source = truthById.get(levelId)?.mechanisms?.covers;
  const rows = Array.isArray(source) ? source : source ? [source] : [];
  return rows.length && rows.every(({ x, y, w, h }) => [x, y, w, h].every(Number.isFinite))
    ? rows.map(({ x, y, w, h, count }) => ({ x, y, width: w, height: h, count }))
    : null;
};
const geometryOf = (level) => (level.shutters ?? []).filter(api.isOrdinaryShutter)
  .map(({ x, y, width, height, count }) => ({ x, y, width, height, count }));
const rectanglesOf = (items) => items.map(({ x, y, width, height }) => ({ x, y, width, height }));
const openingAdjacency = (level) => {
  const queued = new Set((level.generators ?? []).flatMap(({ queueBlockIds }) => queueBlockIds));
  const closed = new Set((level.shutters ?? []).filter(({ count }) => count > 0).map(({ id }) => id));
  const visible = level.blocks.filter((block) => !queued.has(block.id)
    && !(block.shutterId && closed.has(block.shutterId)));
  const occupants = new Map();
  for (const block of visible) for (const [x, y] of cellsOf(block)) {
    const key = cellKey(x, y);
    occupants.set(key, [...(occupants.get(key) ?? []), block]);
  }
  const violations = new Set();
  for (const block of visible) for (const [x, y] of cellsOf(block)) {
    for (const [dx, dy] of [[1, 0], [0, 1]]) for (const other of occupants.get(cellKey(x + dx, y + dy)) ?? []) {
      if (block.id !== other.id && (block.layers?.[0] ?? block.color) === (other.layers?.[0] ?? other.color)) {
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
      if (!before) return false;
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

const beforeLevels = api.LEVELS_BEFORE_COMPETITOR_EXACT_SHUTTER_GEOMETRY_POST100;
const afterLevels = beforeLevels.map(api.applyCompetitorExactShutterGeometryRepairPost100);
const beforeById = new Map(beforeLevels.map((level) => [level.id, level]));
const afterById = new Map(afterLevels.map((level) => [level.id, level]));
const comparable = afterLevels.filter(({ id }) => id >= 101 && coverEvidence(id));
const mismatchesBefore = comparable.filter((level) => !same(
  rectanglesOf(geometryOf(beforeById.get(level.id))), rectanglesOf(coverEvidence(level.id)),
)).map(({ id }) => id);
const mismatchesAfter = comparable.filter((level) => !same(
  rectanglesOf(geometryOf(level)), rectanglesOf(coverEvidence(level.id)),
)).map(({ id }) => id);

const blockerGroups = {
  opening_block_crosses_competitor_boundary: [110, 121, 136, 166, 169, 171, 174, 175, 178, 179, 188, 192, 194],
  no_nonoverlapping_direct_cohort_can_span_exact_rectangle: [125, 126, 128, 139, 144, 145, 147, 157, 159, 160, 167, 168, 181, 182, 184, 189],
  competitor_rectangle_conflicts_current_playable_mask: [130, 140, 143, 148],
  solver_exhausted: [101, 142, 164, 165, 185, 193],
  solver_max_states_20000: [104, 135, 138, 172, 173, 176, 199],
  solver_resource_exhausted_8gb: [141, 149],
};
const blockerById = new Map(Object.entries(blockerGroups)
  .flatMap(([reason, levelIds]) => levelIds.map((levelId) => [levelId, reason])));
const blockers = mismatchesBefore.filter((levelId) => !api.COMPETITOR_EXACT_SHUTTER_GEOMETRY_POST100_LEVEL_IDS.includes(levelId))
  .map((levelId) => ({ levelId, reason: blockerById.get(levelId) ?? "not-certified" }));

const certifications = [];
for (const levelId of api.COMPETITOR_EXACT_SHUTTER_GEOMETRY_POST100_LEVEL_IDS) {
  const before = beforeById.get(levelId);
  const level = afterById.get(levelId);
  const expected = coverEvidence(levelId);
  const panels = (level.shutters ?? []).filter(api.isOrdinaryShutter);
  let validation = "pass";
  try { api.validateLevel(level); } catch (error) { validation = error instanceof Error ? error.message : String(error); }
  const beforeIssues = api.compareCompetitorMechanismCountContract(before, contractById.get(levelId)).issues;
  const afterIssues = api.compareCompetitorMechanismCountContract(level, contractById.get(levelId)).issues;
  const beforeFields = new Set(beforeIssues.map(({ field }) => field));
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
    expectedGeometry: expected,
    actualGeometry: geometryOf(level),
    directHiddenBounds: panels.map((panel) => boundsOf(level.blocks.filter((block) => block.shutterId === panel.id))),
    exactGeometry: same(rectanglesOf(geometryOf(level)), rectanglesOf(expected)),
    exactDirectHiddenBounds: panels.every((panel) => {
      const bounds = boundsOf(level.blocks.filter((block) => block.shutterId === panel.id));
      return bounds && same([bounds], [{ x: panel.x, y: panel.y, width: panel.width, height: panel.height }]);
    }),
    strictCoverageIssues: api.auditOrdinaryShutterCoverage(level),
    openingAdjacencyViolations: openingAdjacency(level),
    generatorIssues: api.finalGeneratorPlacementIssues(level),
    mechanismIssueCountBefore: beforeIssues.length,
    mechanismIssueCountAfter: afterIssues.length,
    newMechanismIssueFields: afterIssues.map(({ field }) => field).filter((field) => !beforeFields.has(field)),
    solver,
  });
}

const changedLevelIds = beforeLevels.filter((level, index) => level !== afterLevels[index]).map(({ id }) => id);
const certificationPass = (row) => row.validation === "pass"
  && row.exactGeometry && row.exactDirectHiddenBounds
  && !row.strictCoverageIssues.length && !row.openingAdjacencyViolations.length && !row.generatorIssues.length
  && row.mechanismIssueCountAfter <= row.mechanismIssueCountBefore && !row.newMechanismIssueFields.length
  && (!solve || (row.solver?.solved && row.solver.replayComplete));
const report = {
  schemaVersion: 1,
  policy: api.COMPETITOR_EXACT_SHUTTER_GEOMETRY_POST100_VERSION,
  integrationStatus: JSON.stringify(api.LEVELS_BEFORE_OPENING_BLOCK_COUNT_EXPANSION_REPAIR) === JSON.stringify(afterLevels)
    ? "wired-into-levels"
    : "production-layer-mismatch",
  truthPath,
  auditedLevels: 100,
  comparableGeometryLevels: comparable.length,
  geometryExactBefore: comparable.length - mismatchesBefore.length,
  geometryMismatchBefore: mismatchesBefore.length,
  geometryExactAfter: comparable.length - mismatchesAfter.length,
  geometryMismatchAfter: mismatchesAfter.length,
  changedLevelIds,
  certifiedLevelIds: certifications.filter(certificationPass).map(({ levelId }) => levelId),
  certifications,
  blockerGroups,
  blockers,
  notes: [
    "Unknown competitor x/y/w/h is excluded and is never promoted to exact.",
    "Every certified visible rectangle equals the bounding rectangle of its directly bound hidden cohort.",
    "The maximum safe set requires validation, strict coverage zero, opening adjacency zero, generator contract zero, no new mechanism-count issue field, 20k solver success and independent PuzzleModel replay.",
    "Resource exhaustion and max_states are inconclusive and are never counted as safe.",
  ],
};

console.log(JSON.stringify(report, null, 2));
if (write) {
  await mkdir(outputDir, { recursive: true });
  await writeFile(resolve(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  const lines = [
    "# Competitor-exact shutter geometry audit — Lv101–200",
    "",
    `- Policy: ${report.policy}`,
    `- Integration: ${report.integrationStatus}`,
    `- Numeric competitor geometry: ${report.comparableGeometryLevels}/100 levels`,
    `- Exact geometry: ${report.geometryExactBefore} -> ${report.geometryExactAfter}`,
    `- Remaining mismatches: ${report.geometryMismatchAfter}`,
    `- Certified exact repairs: ${report.certifiedLevelIds.join(", ") || "none"}`,
    `- Solver/replay bound: ${solve ? "20,000 states, executed" : "not executed"}`,
    "",
    "## Certified levels",
    "",
    ...certifications.map((row) => `- Lv${row.levelId}: geometry=${row.exactGeometry}, hiddenBounds=${row.exactDirectHiddenBounds}, coverage=${row.strictCoverageIssues.length}, adjacency=${row.openingAdjacencyViolations.length}, generator=${row.generatorIssues.length}, solver=${row.solver?.termination ?? "not-run"}/${row.solver?.exploredStates ?? "n/a"}, replay=${row.solver?.replayComplete ?? "n/a"}`),
    "",
    "## Blockers",
    "",
    ...Object.entries(blockerGroups).map(([reason, levelIds]) => `- ${reason}: ${levelIds.map((id) => `Lv${id}`).join(", ")}`),
    "",
    "Unknown source geometry remains unknown. max_states and 8 GB heap exhaustion are not success evidence and are excluded from the overlay.",
    "",
  ];
  await writeFile(resolve(outputDir, "report.md"), `${lines.join("\n")}\n`, "utf8");
}

const expectedChanged = [...api.COMPETITOR_EXACT_SHUTTER_GEOMETRY_POST100_LEVEL_IDS];
if (report.integrationStatus !== "wired-into-levels"
  || JSON.stringify(changedLevelIds) !== JSON.stringify(expectedChanged)
  || certifications.some((row) => !certificationPass(row))
  || blockers.length + certifications.length !== mismatchesBefore.length
  || mismatchesAfter.some((levelId) => expectedChanged.includes(levelId))) process.exitCode = 1;
