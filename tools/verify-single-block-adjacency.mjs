import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const outputDir = resolve(root, "playtest-results/experiments/single-block-adjacency-2026-09-18");
const maxStates = 20_000;

const bundle = await build({
  stdin: {
    contents: `
      export { LEVELS, LEVELS_BEFORE_SINGLE_BLOCK_ADJACENCY } from "./src/core/levels.ts";
      export { solveLevelForValidation } from "./src/core/levelSolver.ts";
      export { PuzzleModel } from "./src/core/PuzzleModel.ts";
      export {
        SINGLE_BLOCK_ADJACENCY_LEVEL_IDS,
        SINGLE_BLOCK_ADJACENCY_POLICY_VERSION,
        SINGLE_BLOCK_COLOR_ONLY_SOLVED_LEVEL_IDS,
        SINGLE_BLOCK_COLOR_PATCHES,
      } from "./src/core/singleBlockAdjacencyOverrides.ts";
      export {
        SINGLE_BLOCK_OPENING_REPAIR_LEVEL_IDS,
        SINGLE_BLOCK_OPENING_REPAIR_POLICY_VERSION,
      } from "./src/core/singleBlockAdjacencyRepairs.ts";
    `,
    resolveDir: root,
    sourcefile: "verify-single-block-adjacency-runtime.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const runtime = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);

const stableValue = (value) => {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
};
const hashValue = (value) => createHash("sha256").update(JSON.stringify(stableValue(value))).digest("hex").toUpperCase();
const outerColor = (block) => block.layers?.[0] ?? block.color;
const singleton = (block) => block.shape.length === 1 && block.shape[0]?.[0] === 0 && block.shape[0]?.[1] === 0;
const cells = (block) => block.shape.map(([dx, dy]) => [block.x + dx, block.y + dy]);
const openingBlocks = (level) => {
  const queued = new Set((level.generators ?? []).flatMap((generator) => generator.queueBlockIds));
  const shutterById = new Map((level.shutters ?? []).map((shutter) => [shutter.id, shutter]));
  return level.blocks.filter((block) => !queued.has(block.id)
    && !(block.shutterId && (shutterById.get(block.shutterId)?.count ?? 0) > 0));
};
const adjacencyViolations = (level) => {
  const visible = openingBlocks(level);
  const occupants = new Map();
  for (const block of visible) for (const [x, y] of cells(block)) {
    const key = `${x},${y}`;
    occupants.set(key, [...(occupants.get(key) ?? []), block]);
  }
  const violations = new Set();
  for (const block of visible.filter(singleton)) {
    const [x, y] = cells(block)[0];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      for (const neighbour of occupants.get(`${x + dx},${y + dy}`) ?? []) {
        if (neighbour.id !== block.id && outerColor(neighbour) === outerColor(block)) {
          violations.add([block.id, neighbour.id].sort().join("|"));
        }
      }
    }
  }
  return [...violations].sort();
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

const modifiedIds = [...runtime.SINGLE_BLOCK_ADJACENCY_LEVEL_IDS];
const colorOnlySolvedIds = [...runtime.SINGLE_BLOCK_COLOR_ONLY_SOLVED_LEVEL_IDS];
const structuralFallbackIds = modifiedIds.filter((id) => !colorOnlySolvedIds.includes(id));
const openingRepairIds = [...runtime.SINGLE_BLOCK_OPENING_REPAIR_LEVEL_IDS];
const modifiedSet = new Set(modifiedIds);
const sourceAdjacencyRows = runtime.LEVELS_BEFORE_SINGLE_BLOCK_ADJACENCY.map((level) => ({
  levelId: level.id,
  violations: adjacencyViolations(level),
}));
const sourceAffectedIds = sourceAdjacencyRows.filter((row) => row.violations.length > 0).map((row) => row.levelId);
const sourceViolationCount = sourceAdjacencyRows.reduce((sum, row) => sum + row.violations.length, 0);
const adjacencyRows = runtime.LEVELS.map((level) => ({
  levelId: level.id,
  modified: modifiedSet.has(level.id),
  visibleSingletons: openingBlocks(level).filter(singleton).length,
  violations: adjacencyViolations(level),
}));
const openingCount = (level) => {
  const queued = new Set((level.generators ?? []).flatMap((generator) => generator.queueBlockIds));
  const shutters = new Map((level.shutters ?? []).map((shutter) => [shutter.id, shutter]));
  return level.blocks.filter((block) => !queued.has(block.id)
    && !(block.shutterId && (shutters.get(block.shutterId)?.count ?? 0) > 0)).length;
};
const openingRows = openingRepairIds.map((id) => {
  const level = runtime.LEVELS.find((candidate) => candidate.id === id);
  return {
    levelId: id,
    openingVisibleBlocks: openingCount(level),
    legacyStagingShutters: (level.shutters ?? []).filter((shutter) => shutter.id.startsWith("solvability-repair-stage-")).length,
  };
});
const solverRows = [];
for (const id of openingRepairIds) {
  const level = runtime.LEVELS.find((candidate) => candidate.id === id);
  const started = Date.now();
  const result = runtime.solveLevelForValidation(level, maxStates);
  solverRows.push({
    levelId: id,
    solved: result.solved,
    termination: result.termination,
    exploredStates: result.exploredStates,
    minimumDrags: result.minimumDrags,
    clearLoad: result.clearLoad,
    repositionOverhead: result.repositionOverhead,
    gridSteps: result.gridSteps,
    turns: result.turns,
    replayPassed: result.solved && replay(level, result.drags),
    staticUnsatReasons: result.staticUnsatReasons,
    unsupportedReasons: result.unsupportedReasons,
    elapsedMs: Date.now() - started,
  });
}

const violationCount = adjacencyRows.reduce((sum, row) => sum + row.violations.length, 0);
const solvedCount = solverRows.filter((row) => row.solved && row.replayPassed).length;
const colorPatchCount = Object.values(runtime.SINGLE_BLOCK_COLOR_PATCHES).flat().length;
const report = {
  generatedAt: new Date().toISOString(),
  policyVersion: runtime.SINGLE_BLOCK_ADJACENCY_POLICY_VERSION,
  openingRepairPolicyVersion: runtime.SINGLE_BLOCK_OPENING_REPAIR_POLICY_VERSION,
  campaignSemanticSha256: hashValue(runtime.LEVELS),
  scope: {
    auditedLevels: runtime.LEVELS.length,
    modifiedLevelIds: modifiedIds,
    modifiedLevelCount: modifiedIds.length,
    untouchedLevelCount: runtime.LEVELS.length - modifiedIds.length,
    solverScope: "opening-repair-levels-only",
    solverMaxStates: maxStates,
    colorOnlySolvedLevelIds: colorOnlySolvedIds,
    structuralFallbackLevelIds: structuralFallbackIds,
    openingRepairLevelIds: openingRepairIds,
  },
  summary: {
    sourceVisibleSameColourAdjacencyPairs: sourceViolationCount,
    colorPatches: colorPatchCount,
    finalVisibleSameColourAdjacencyPairs: violationCount,
    solvedOpeningRepairLevels: solvedCount,
    replayedOpeningRepairLevels: solverRows.filter((row) => row.replayPassed).length,
    colorOnlySolvedLevels: colorOnlySolvedIds.length,
    structuralFallbackLevels: structuralFallbackIds.length,
    openingRepairLevels: openingRepairIds.length,
    minimumOpeningVisibleBlocks: Math.min(...openingRows.map((row) => row.openingVisibleBlocks)),
  },
  adjacencyRows,
  openingRows,
  solverRows,
};

if (JSON.stringify(sourceAffectedIds) !== JSON.stringify(modifiedIds)) {
  throw new Error(`Modified scope drift: source=${sourceAffectedIds.join(",")}; overlay=${modifiedIds.join(",")}`);
}
if (colorOnlySolvedIds.some((id) => !modifiedSet.has(id)) || new Set(colorOnlySolvedIds).size !== colorOnlySolvedIds.length) {
  throw new Error("Color-only solved scope is not a unique subset of modified levels");
}
if (violationCount !== 0) throw new Error(`Singleton adjacency audit failed with ${violationCount} pair(s)`);
if (openingRepairIds.length !== structuralFallbackIds.length) throw new Error("Opening repair scope drift");
const collapsedOpeningRows = openingRows.filter((row) => (
  row.openingVisibleBlocks < 2 || row.legacyStagingShutters > 0
));
if (collapsedOpeningRows.length) {
  throw new Error(`Opening-preserving repair still collapsed structural levels: ${collapsedOpeningRows
    .map((row) => `Lv${row.levelId}(opening=${row.openingVisibleBlocks},staging=${row.legacyStagingShutters})`)
    .join(",")}`);
}
if (solvedCount !== openingRepairIds.length) {
  const failures = solverRows
    .filter((row) => !row.solved || !row.replayPassed)
    .map((row) => `Lv${row.levelId}(${row.termination}, states=${row.exploredStates}, replay=${row.replayPassed}, static=${row.staticUnsatReasons.join("|")})`)
    .join(", ");
  throw new Error(`Opening-repair solver audit passed ${solvedCount}/${openingRepairIds.length}; failures: ${failures}`);
}

const md = [
  "# 1×1 色块同色相邻修复报告",
  "",
  `- 策略：\`${report.policyVersion}\``,
  `- 全季审计：${runtime.LEVELS.length}/200 关`,
  `- 修改关卡：${modifiedIds.length} 关（${modifiedIds.join(", ")}）`,
  `- 改色记录：${colorPatchCount} 项`,
  `- 修复前可见同色相邻：${sourceViolationCount} 对；修复后：${violationCount} 对`,
  `- 求解范围：仅本轮重新生成的 ${openingRepairIds.length} 个兜底关，状态上限 ${maxStates.toLocaleString()}`,
  `- 求解与 PuzzleModel 回放：${solvedCount}/${openingRepairIds.length} 通过`,
  `- 纯改色且保留本批修复前棋盘/机制/出口：${colorOnlySolvedIds.length} 关（${colorOnlySolvedIds.join(", ")}）`,
  `- 颜色修复后采用 opening-preserving-v2 局部修复：${structuralFallbackIds.length} 关（${structuralFallbackIds.join(", ")}）`,
  `- 结构修复后最少开局可见色块：${report.summary.minimumOpeningVisibleBlocks}`,
  `- 未修改 ${runtime.LEVELS.length - modifiedIds.length} 关未重复求解（按本次范围）`,
  `- Campaign semantic SHA-256：\`${report.campaignSemanticSha256}\``,
  "",
  "规则只检查开局同时可见的色块；卷帘/暂存层内尚未出现的色块不与当前开局层计算相邻。",
  "",
].join("\n");

await mkdir(outputDir, { recursive: true });
await writeFile(resolve(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
await writeFile(resolve(outputDir, "report.md"), md, "utf8");
console.log(`single-block adjacency PASS: 200/200 audited, ${solvedCount}/${openingRepairIds.length} regenerated fallback levels solved and replayed`);
console.log(`campaign semantic SHA-256 ${report.campaignSemanticSha256}`);
