import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "esbuild";

const root = process.cwd();
const outputDir = resolve(root, "playtest-results/experiments/board-topology-repairs-2026-09-20");
const bundle = await build({
  stdin: {
    contents: `
      export {
        LEVELS,
        LEVELS_BEFORE_BOARD_TOPOLOGY_REPAIR,
        LEVELS_BEFORE_SHUTTER_GEOMETRY_COVERAGE_REPAIR,
      } from "./src/core/levels.ts";
      export { BOARD_TOPOLOGY_REPAIR_LEVEL_IDS, BOARD_TOPOLOGY_REPAIR_VERSION, applyBoardTopologyRepair } from "./src/core/boardTopologyRepairs.ts";
      export { boardCellsSeparatedBySeam } from "./src/core/boardSeams.ts";
      export { extractGeneratorTruthContracts, finalGeneratorPlacementIssues, finalGeneratorTruthIssues } from "./src/core/finalGeneratorContracts.ts";
      export { solveLevelForValidation } from "./src/core/levelSolver.ts";
      export { PuzzleModel, validateLevel } from "./src/core/PuzzleModel.ts";
    `,
    resolveDir: root,
    sourcefile: "verify-board-topology-repairs-entry.ts",
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

const key = (x, y) => `${x},${y}`;
const point = (value) => value.split(",").map(Number);
const neighbours = (x, y) => [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
const fullRectangle = (level) => Array.from({ length: level.height }, (_, y) => (
  Array.from({ length: level.width }, (_, x) => [x, y])
)).flat();
const canonical = (value) => {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().filter((field) => value[field] !== undefined)
    .map((field) => [field, canonical(value[field])]));
};
const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();

const components = (level, cells) => {
  const remaining = new Set(cells);
  const result = [];
  while (remaining.size) {
    const first = remaining.values().next().value;
    remaining.delete(first);
    const queue = [first];
    const component = [];
    while (queue.length) {
      const current = queue.shift();
      component.push(current);
      const [x, y] = point(current);
      for (const [nx, ny] of neighbours(x, y)) {
        const next = key(nx, ny);
        if (runtime.boardCellsSeparatedBySeam(level, [x, y], [nx, ny])) continue;
        if (remaining.delete(next)) queue.push(next);
      }
    }
    result.push(component);
  }
  return result.sort((left, right) => right.length - left.length);
};

const topologyAudit = (level, expectedComponents = 1, enforceComponentCount = true) => {
  const rawPlayable = new Set((level.playable ?? fullRectangle(level)).map(([x, y]) => key(x, y)));
  const blocked = new Set((level.blocked ?? []).map(([x, y]) => key(x, y)));
  const playable = new Set([...rawPlayable].filter((cell) => !blocked.has(cell)));
  const exterior = new Set([key(-1, -1)]);
  const queue = [key(-1, -1)];
  while (queue.length) {
    const [x, y] = point(queue.shift());
    for (const [nx, ny] of neighbours(x, y)) {
      if (nx < -1 || ny < -1 || nx > level.width || ny > level.height) continue;
      const next = key(nx, ny);
      const outside = nx < 0 || ny < 0 || nx >= level.width || ny >= level.height;
      if ((outside || !playable.has(next)) && !exterior.has(next)) {
        exterior.add(next);
        queue.push(next);
      }
    }
  }
  const enclosedVoidCells = fullRectangle(level).filter(([x, y]) => (
    !playable.has(key(x, y)) && !exterior.has(key(x, y))
  ));
  const playableComponents = components(level, playable);
  return {
    levelId: level.id,
    dimensions: `${level.width}x${level.height}`,
    blockedCells: [...blocked].map(point).sort((left, right) => left[1] - right[1] || left[0] - right[0]),
    enclosedVoidCells,
    playableComponentSizes: playableComponents.map((component) => component.length),
    expectedComponentCount: expectedComponents,
    violates: blocked.size > 0
      || enclosedVoidCells.length > 0
      || (enforceComponentCount && playableComponents.length !== expectedComponents),
  };
};

const outerColor = (block) => block.layers?.[0] ?? block.color;
const openingAdjacency = (level) => {
  const queued = new Set((level.generators ?? []).flatMap((generator) => generator.queueBlockIds));
  const closed = new Set((level.shutters ?? []).filter((shutter) => shutter.count > 0).map((shutter) => shutter.id));
  const blocks = level.blocks.filter((block) => !queued.has(block.id) && !(block.shutterId && closed.has(block.shutterId)));
  const occupants = new Map();
  for (const block of blocks) for (const [dx, dy] of block.shape) {
    const cell = key(block.x + dx, block.y + dy);
    occupants.set(cell, [...(occupants.get(cell) ?? []), block]);
  }
  const violations = new Set();
  for (const block of blocks) for (const [dx, dy] of block.shape) {
    const x = block.x + dx;
    const y = block.y + dy;
    for (const [stepX, stepY] of [[1, 0], [0, 1]]) for (const neighbour of occupants.get(key(x + stepX, y + stepY)) ?? []) {
      if (block.id !== neighbour.id && outerColor(block) === outerColor(neighbour)) {
        violations.add([block.id, neighbour.id].sort().join("|"));
      }
    }
  }
  return [...violations];
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
    if (!model.getBlock(drag.blockId)) return { ok: false, error: `missing ${drag.blockId}` };
    model.beginAction();
    for (const [x, y] of drag.path ?? []) {
      const before = model.getBlock(drag.blockId);
      const distance = before ? Math.abs(before.x - x) + Math.abs(before.y - y) : 0;
      const moved = distance === 1 ? model.moveBlockStep(drag.blockId, x, y) : model.moveBlock(drag.blockId, x, y);
      if (!moved) return { ok: false, error: `move ${drag.blockId} -> ${x},${y}` };
    }
    if (drag.exitSide && !model.tryExit(drag.blockId, drag.exitSide).ok) {
      return { ok: false, error: `exit ${drag.blockId} ${drag.exitSide}` };
    }
    if (!model.commitAction()) return { ok: false, error: `commit ${drag.blockId}` };
    if (tickDuration > 0) model.tick(tickDuration);
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

const sourceLevels = runtime.LEVELS_BEFORE_BOARD_TOPOLOGY_REPAIR;
const repairedLevels = sourceLevels.map(runtime.applyBoardTopologyRepair);
const sourceTopology = sourceLevels.map((level) => topologyAudit(level));
const repairedTopology = repairedLevels.map((level) => topologyAudit(level));
const sourceById = new Map(sourceLevels.map((level) => [level.id, level]));
const repairedById = new Map(repairedLevels.map((level) => [level.id, level]));
const validationIssues = [];
for (const level of repairedLevels) {
  try { runtime.validateLevel(level); } catch (error) {
    validationIssues.push(`Lv${level.id}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
const adjacencyIssues = repairedLevels.flatMap((level) => {
  const violations = openingAdjacency(level);
  return violations.length ? [{ levelId: level.id, violations }] : [];
});
const generatorPlacementIssues = repairedLevels.flatMap((level) => runtime.finalGeneratorPlacementIssues(level));
const truthPaths = [
  "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json",
  "deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-truth-v1.json",
];
const truths = await Promise.all(truthPaths.map(async (path) => (
  JSON.parse((await readFile(resolve(root, path), "utf8")).replace(/^\uFEFF/, ""))
)));
const expectedFinalComponentCounts = new Map(truths.flatMap(({ levels = [] }) => levels).map((record) => [
  Number(record.level),
  Number(record.board?.source_component_count) || 1,
]));
const finalTopology = runtime.LEVELS.map((level) => topologyAudit(
  level,
  expectedFinalComponentCounts.get(level.id) ?? 1,
  false,
));
const generatorTruthIssues = runtime.finalGeneratorTruthIssues(
  repairedLevels,
  truths.flatMap(runtime.extractGeneratorTruthContracts),
);

const solverRows = [];
for (const levelId of runtime.BOARD_TOPOLOGY_REPAIR_LEVEL_IDS) {
  // The final runtime is authoritative for solvability. Later certified
  // overlays intentionally refine several repaired boards (notably Lv156),
  // while the immediate boundary below still proves this layer's integration.
  const level = runtime.LEVELS[levelId - 1];
  const started = performance.now();
  const solver = runtime.solveLevelForValidation(level, 30_000);
  const replayResult = solver.solved ? replay(level, solver.drags) : null;
  solverRows.push({
    levelId,
    solved: solver.solved,
    termination: solver.termination,
    exploredStates: solver.exploredStates,
    dragCount: solver.drags.length,
    replay: replayResult,
    durationMs: Math.round((performance.now() - started) * 100) / 100,
  });
}

const structuralRows = runtime.BOARD_TOPOLOGY_REPAIR_LEVEL_IDS.map((levelId) => {
  const source = sourceById.get(levelId);
  const repaired = repairedById.get(levelId);
  const sourcePlayable = new Set((source.playable ?? fullRectangle(source)).map(([x, y]) => key(x, y)));
  const repairedPlayable = new Set((repaired.playable ?? fullRectangle(repaired)).map(([x, y]) => key(x, y)));
  return {
    levelId,
    beforeDimensions: `${source.width}x${source.height}`,
    afterDimensions: `${repaired.width}x${repaired.height}`,
    addedPlayableCells: [...repairedPlayable].filter((cell) => !sourcePlayable.has(cell)).map(point),
    removedPlayableCells: [...sourcePlayable].filter((cell) => !repairedPlayable.has(cell)).map(point),
    removedBlockedCells: source.blocked ?? [],
    blocksUnchanged: JSON.stringify(source.blocks) === JSON.stringify(repaired.blocks),
    exitsUnchanged: JSON.stringify([source.gates, source.flipDoors]) === JSON.stringify([repaired.gates, repaired.flipDoors]),
    shuttersUnchanged: JSON.stringify(source.shutters) === JSON.stringify(repaired.shutters),
    generatorCounts: [source.generators?.length ?? 0, repaired.generators?.length ?? 0],
    generatorQueueLengths: [source, repaired].map((level) => (level.generators ?? []).map((generator) => generator.queueBlockIds.length)),
  };
});

const sourceAffected = sourceTopology.filter((row) => row.violates).map((row) => row.levelId);
const expectedAffected = [...runtime.BOARD_TOPOLOGY_REPAIR_LEVEL_IDS];
const boardSignature = (level) => canonical({
  width: level.width,
  height: level.height,
  playable: level.playable,
  blocked: level.blocked,
  generators: level.generators?.map(({ spawn: _spawn, ...generator }) => generator),
});
const productionById = new Map(runtime.LEVELS_BEFORE_SHUTTER_GEOMETRY_COVERAGE_REPAIR
  .map((level) => [level.id, level]));
const failures = [
  ...repairedLevels.filter((level) => (
    JSON.stringify(boardSignature(productionById.get(level.id))) !== JSON.stringify(boardSignature(level))
  )).map((level) => `Lv${level.id}: production LEVELS does not contain the certified board-topology overlay`),
  ...(JSON.stringify(sourceAffected) === JSON.stringify(expectedAffected) ? [] : [`source scope ${sourceAffected} != ${expectedAffected}`]),
  ...repairedTopology.filter((row) => row.violates).map((row) => `Lv${row.levelId}: topology still violates`),
  ...finalTopology.filter((row) => row.violates).map((row) => `Lv${row.levelId}: final runtime topology violates`),
  ...validationIssues,
  ...adjacencyIssues.map((row) => `Lv${row.levelId}: adjacency ${row.violations.join(",")}`),
  ...generatorPlacementIssues,
  ...generatorTruthIssues,
  ...structuralRows.filter((row) => !row.blocksUnchanged || !row.exitsUnchanged || !row.shuttersUnchanged
    || row.generatorCounts[0] !== row.generatorCounts[1]
    || JSON.stringify(row.generatorQueueLengths[0]) !== JSON.stringify(row.generatorQueueLengths[1]))
    .map((row) => `Lv${row.levelId}: protected gameplay contract drifted`),
  ...solverRows.filter((row) => !row.solved || !row.replay?.ok).map((row) => `Lv${row.levelId}: solver/replay failed`),
];
const sourceText = await readFile(resolve(root, "src/core/boardTopologyRepairs.ts"), "utf8");
const report = {
  status: failures.length ? "FAIL" : "PASS",
  policy: runtime.BOARD_TOPOLOGY_REPAIR_VERSION,
  definition: {
    blocked: "LevelSpec.blocked must be empty in formal levels",
    enclosedVoid: "non-playable cells unreachable from an exterior flood-fill are forbidden",
    splitBoard: "the base repair joins accidental islands; source-proven disconnected final rooms remain allowed",
    allowedIrregularity: "exterior-connected outline protrusions and indentations remain allowed",
  },
  sourceSha256: sha256(sourceText),
  sourceCampaignSemanticSha256: sha256(JSON.stringify(canonical(sourceLevels))),
  repairedCampaignSemanticSha256: sha256(JSON.stringify(canonical(repairedLevels))),
  auditedLevelCount: repairedLevels.length,
  affectedLevelCount: expectedAffected.length,
  affectedLevelIds: expectedAffected,
  sourceTopologyIssues: sourceTopology.filter((row) => row.violates),
  repairedTopologyIssueCount: repairedTopology.filter((row) => row.violates).length,
  finalTopologyIssueCount: finalTopology.filter((row) => row.violates).length,
  finalTopologyIssues: finalTopology.filter((row) => row.violates),
  structuralRows,
  solver: { maxStates: 30_000, passed: solverRows.filter((row) => row.solved && row.replay?.ok).length, rows: solverRows },
  validationIssueCount: validationIssues.length,
  adjacencyIssueCount: adjacencyIssues.length,
  generatorPlacementIssueCount: generatorPlacementIssues.length,
  generatorTruthIssueCount: generatorTruthIssues.length,
  failures,
};

await mkdir(outputDir, { recursive: true });
await writeFile(resolve(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
const markdown = [
  "# Board topology repair verification",
  "",
  `- Status: **${report.status}**`,
  `- Policy: \`${report.policy}\``,
  `- Audited campaign: ${report.auditedLevelCount}/200`,
  `- Repaired scope: ${report.affectedLevelCount} levels (${report.affectedLevelIds.join(", ")})`,
  `- Solver + PuzzleModel replay: ${report.solver.passed}/${report.affectedLevelCount} at ${report.solver.maxStates.toLocaleString()} states`,
  `- Remaining repaired/final topology / adjacency / generator-placement / generator-truth issues: ${report.repairedTopologyIssueCount} / ${report.finalTopologyIssueCount} / ${report.adjacencyIssueCount} / ${report.generatorPlacementIssueCount} / ${report.generatorTruthIssueCount}`,
  `- Overlay SHA-256: \`${report.sourceSha256}\``,
  `- Candidate campaign semantic SHA-256: \`${report.repairedCampaignSemanticSha256}\``,
  "",
  "Lv43 is the only dimension adjustment: its former 3-cell internal wall is removed, and a 3-cell bottom protrusion supplies the sixth legal non-exit generator mount. Blocks, exits, shutters, generator count, queue order and spawn points remain unchanged.",
  "",
  "| Level | Before → after | Added playable cells | Removed blocked cells | States | Replay |",
  "|---:|:---:|:---|:---|---:|:---:|",
  ...structuralRows.map((row) => {
    const solver = solverRows.find((candidate) => candidate.levelId === row.levelId);
    return `| ${row.levelId} | ${row.beforeDimensions} → ${row.afterDimensions} | ${row.addedPlayableCells.map(([x, y]) => `(${x},${y})`).join(" ") || "—"} | ${row.removedBlockedCells.map(([x, y]) => `(${x},${y})`).join(" ") || "—"} | ${solver.exploredStates} | ${solver.replay?.ok ? "PASS" : "FAIL"} |`;
  }),
  "",
];
await writeFile(resolve(outputDir, "report.md"), `${markdown.join("\n")}\n`, "utf8");
console.log(JSON.stringify({
  status: report.status,
  auditedLevelCount: report.auditedLevelCount,
  affectedLevelCount: report.affectedLevelCount,
  solverReplayPassed: report.solver.passed,
  repairedTopologyIssueCount: report.repairedTopologyIssueCount,
  finalTopologyIssueCount: report.finalTopologyIssueCount,
  adjacencyIssueCount: report.adjacencyIssueCount,
  generatorPlacementIssueCount: report.generatorPlacementIssueCount,
  generatorTruthIssueCount: report.generatorTruthIssueCount,
  sourceSha256: report.sourceSha256,
  repairedCampaignSemanticSha256: report.repairedCampaignSemanticSha256,
  outputDir,
  failures,
}, null, 2));
if (failures.length) process.exitCode = 1;
