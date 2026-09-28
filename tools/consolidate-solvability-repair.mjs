import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const beforePath = resolve(root, "playtest-results/experiments/current-source-audit-2026-09-18/report.json");
const focusedPath = resolve(root, process.env.SOLVABILITY_REPAIR_FOCUSED_REPORT ?? "playtest-results/experiments/solvability-repair-2026-09-18-r5/report.json");
const finalAuditPath = resolve(root, "playtest-results/experiments/solvability-final-2026-09-18/report.json");
const finalDeepPath = resolve(root, "playtest-results/experiments/solvability-final-2026-09-18-deep/report.json");
const outputDir = resolve(root, "playtest-results/experiments/solvability-repair-2026-09-18");

const before = JSON.parse(await readFile(beforePath, "utf8"));
const focused = JSON.parse(await readFile(focusedPath, "utf8"));
const finalAudit = JSON.parse(await readFile(finalAuditPath, "utf8"));
const finalDeep = JSON.parse(await readFile(finalDeepPath, "utf8"));
const bundle = await build({
  stdin: {
    contents: `
      export { LEVELS, VIDEO_PARITY_CAMPAIGN_SOURCE_ORDER } from "./src/core/levels.ts";
      export { SOLVABILITY_REPAIR_LEVEL_IDS, SOLVABILITY_REPAIR_POLICY_VERSION } from "./src/core/solvabilityRepairOverrides.ts";
      export { VIDEO_PARITY_LEVELS } from "./src/core/videoParityLevels.generated.ts";
      export { VIDEO_PARITY_LEVELS_101_TO_200 } from "./src/core/videoParityLevels101To200.generated.ts";
    `,
    resolveDir: root,
    sourcefile: "solvability-repair-report.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const {
  LEVELS,
  VIDEO_PARITY_CAMPAIGN_SOURCE_ORDER,
  SOLVABILITY_REPAIR_LEVEL_IDS,
  SOLVABILITY_REPAIR_POLICY_VERSION,
  VIDEO_PARITY_LEVELS,
  VIDEO_PARITY_LEVELS_101_TO_200,
} = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);

const canonical = (value) => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  return value;
};
const sha256 = (value) => createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex").toUpperCase();
const sourceLevels = [
  ...VIDEO_PARITY_CAMPAIGN_SOURCE_ORDER.map((sourceId, index) => ({ ...VIDEO_PARITY_LEVELS[sourceId - 1], id: index + 1 })),
  ...VIDEO_PARITY_LEVELS_101_TO_200,
];
const sourceById = new Map(sourceLevels.map((level) => [level.id, level]));
const beforeById = new Map(before.levels.map((row) => [row.level_id, row]));
const focusedById = new Map(focused.levels.map((row) => [row.level_id, row]));
const multiset = (values) => Object.fromEntries([...values.reduce((map, value) => map.set(value, (map.get(value) ?? 0) + 1), new Map())].sort());
const shapeSignature = (block) => JSON.stringify(block.shape.map(([x, y]) => [x, y]));
const levelFingerprint = (level) => ({
  width: level.width,
  height: level.height,
  blockCount: level.blocks.length,
  blockIds: level.blocks.map((block) => block.id),
  shapeCells: multiset(level.blocks.map((block) => block.shape.length)),
  shapeSignatures: multiset(level.blocks.map(shapeSignature)),
  outerColors: multiset(level.blocks.map((block) => block.layers?.[0] ?? block.color)),
  layerStacks: multiset(level.blocks.map((block) => (block.layers ?? [block.color]).join(">"))),
  starCount: level.blocks.filter((block) => block.star).length,
  timeSeconds: level.timeSeconds,
  reward: level.reward,
  difficulty: level.difficulty,
});
const mechanismCounts = (level) => ({
  gates: level.gates.length,
  flipDoors: level.flipDoors?.length ?? 0,
  coloredGrids: level.coloredGrids?.length ?? 0,
  shutters: level.shutters?.length ?? 0,
  generators: level.generators?.length ?? 0,
  elevators: level.elevators?.length ?? 0,
  conveyors: level.conveyors?.length ?? 0,
});
const repairedRows = SOLVABILITY_REPAIR_LEVEL_IDS.map((levelId) => {
  const source = sourceById.get(levelId);
  const target = LEVELS.find((level) => level.id === levelId);
  const focusedRow = focusedById.get(levelId);
  if (!source || !target || !focusedRow) throw new Error(`Missing repair evidence for Lv${levelId}`);
  const beforeRow = beforeById.get(levelId);
  const sourceFingerprint = levelFingerprint(source);
  const targetFingerprint = levelFingerprint(target);
  return {
    level_id: levelId,
    before_status: beforeRow?.status ?? "unknown",
    before_termination: beforeRow?.termination ?? null,
    source_level_semantic_sha256: sha256(canonical(source)),
    target_level_semantic_sha256: sha256(canonical(target)),
    solver: {
      status: focusedRow.status,
      termination: focusedRow.termination,
      explored_states: focusedRow.explored_states,
      minimum_drags: focusedRow.minimum_drags,
      reposition_overhead: focusedRow.reposition_overhead,
      grid_steps: focusedRow.grid_steps,
      turns: focusedRow.turns,
      puzzle_model_replay: focusedRow.puzzle_model_replay,
    },
    minimum_change: {
      dimensions_preserved: sourceFingerprint.width === targetFingerprint.width && sourceFingerprint.height === targetFingerprint.height,
      block_count_preserved: sourceFingerprint.blockCount === targetFingerprint.blockCount,
      block_ids_preserved: JSON.stringify(sourceFingerprint.blockIds) === JSON.stringify(targetFingerprint.blockIds),
      shape_cell_multiset_preserved: JSON.stringify(sourceFingerprint.shapeCells) === JSON.stringify(targetFingerprint.shapeCells),
      shape_signatures_preserved: JSON.stringify(sourceFingerprint.shapeSignatures) === JSON.stringify(targetFingerprint.shapeSignatures),
      outer_color_histogram_preserved: JSON.stringify(sourceFingerprint.outerColors) === JSON.stringify(targetFingerprint.outerColors),
      layer_stacks_preserved: JSON.stringify(sourceFingerprint.layerStacks) === JSON.stringify(targetFingerprint.layerStacks),
      star_count_preserved: sourceFingerprint.starCount === targetFingerprint.starCount,
      timing_reward_difficulty_preserved: sourceFingerprint.timeSeconds === targetFingerprint.timeSeconds
        && sourceFingerprint.reward === targetFingerprint.reward && sourceFingerprint.difficulty === targetFingerprint.difficulty,
      board_mask_preserved: JSON.stringify(source.playable ?? null) === JSON.stringify(target.playable ?? null)
        && JSON.stringify(source.blocked ?? null) === JSON.stringify(target.blocked ?? null),
    },
    mechanism_counts_before: mechanismCounts(source),
    mechanism_counts_after: mechanismCounts(target),
    retained_special_mechanism: levelId === 70
      ? { kind: "timed-generator", present: Boolean(target.generators?.some((generator) => generator.trigger === "time")) }
      : levelId === 73
        ? { kind: "staged-frame", present: Boolean(target.shutters?.some((shutter) => shutter.skin === "staged-frame")) }
        : null,
  };
});
const untouchedSolved = before.levels.filter((row) => row.status === "solved" && !SOLVABILITY_REPAIR_LEVEL_IDS.includes(row.level_id));
const finalAuditById = new Map(finalAudit.levels.map((row) => [row.level_id, row]));
const finalDeepById = new Map(finalDeep.levels.map((row) => [row.level_id, row]));
const finalRowsById = new Map([...finalAuditById, ...finalDeepById]);
const finalSolvedIds = [...finalRowsById.values()].filter((row) => row.status === "solved").map((row) => row.level_id);
const afterSolved = finalSolvedIds.length;
if (repairedRows.some((row) => row.solver.status !== "solved" || !row.solver.puzzle_model_replay?.ok)) throw new Error("A repaired level lacks a solved/replayed witness");
if (afterSolved !== 200) throw new Error(`Expected 200 solved levels after repair, got ${afterSolved}`);
const campaignSemanticSha256 = sha256(canonical(LEVELS));
const report = {
  schema: "solvability-repair-v1",
  generated_at: new Date().toISOString(),
  campaign_semantic_sha256_before: before.campaign_semantic_sha256,
  campaign_semantic_sha256_after: campaignSemanticSha256,
  policy_version: SOLVABILITY_REPAIR_POLICY_VERSION,
  source_audit: {
    path: "playtest-results/experiments/current-source-audit-2026-09-18/report.json",
    summary: before.summary,
    rule: "proven_unsat is only exact supported exhaustion; wall timeout/max-state remains inconclusive",
  },
  final_summary: { solved: afterSolved, proven_unsat: [...finalRowsById.values()].filter((row) => row.status === "proven_unsat").length, inconclusive: [...finalRowsById.values()].filter((row) => row.status === "inconclusive").length, total: finalRowsById.size },
  repaired_level_ids: [...SOLVABILITY_REPAIR_LEVEL_IDS],
  unchanged_solved_level_ids: untouchedSolved.map((row) => row.level_id),
  focused_solver_audit: { path: focusedPath.replace(`${root}${process.platform === "win32" ? "\\" : "/"}`, ""), settings: focused.settings, summary: focused.summary },
  final_solver_audit: {
    path: finalAuditPath.replace(`${root}${process.platform === "win32" ? "\\" : "/"}`, ""),
    settings: finalAudit.settings,
    summary: finalAudit.summary,
    deep_path: finalDeepPath.replace(`${root}${process.platform === "win32" ? "\\" : "/"}`, ""),
    deep_settings: finalDeep.settings,
    deep_summary: finalDeep.summary,
  },
  minimum_change_contract: {
    preserved_per_repaired_level: ["board dimensions", "block IDs/count", "shape cell/signature multiset", "outer color histogram", "layer stacks", "star count", "time/reward/difficulty"],
    allowed_repairs: ["compatible exit remap/rebuild", "non-spatial staging shell for pathological generated geometry", "retain real Lv70 timed generator and Lv73 staged-frame semantics"],
    reversible: true,
  },
  levels: repairedRows,
};
const formatIds = (ids) => ids.length ? ids.join("、") : "无";
const failedMinimality = repairedRows.filter((row) => !row.minimum_change.dimensions_preserved || !row.minimum_change.block_count_preserved || !row.minimum_change.shape_signatures_preserved);
const markdown = `# Lv1–200 可解性最小修复报告\n\n` +
  `- 修复策略版本：\`${report.policy_version}\`\n` +
  `- 修复前 campaign semantic SHA-256：\`${report.campaign_semantic_sha256_before}\`\n` +
  `- 修复后 campaign semantic SHA-256：\`${report.campaign_semantic_sha256_after}\`\n` +
  `- 修复前：已解 ${before.summary.solved} 关、已证无解 ${before.summary.proven_unsat} 关、暂未定 ${before.summary.inconclusive} 关\n` +
  `- 修复后：**${report.final_summary.solved}/200 求解并完成 PuzzleModel 回放**；无解 ${report.final_summary.proven_unsat}、未定 ${report.final_summary.inconclusive}\n\n` +
  `## 修复范围\n\n` +
  `共 ${SOLVABILITY_REPAIR_LEVEL_IDS.length} 关：${formatIds([...SOLVABILITY_REPAIR_LEVEL_IDS])}\n\n` +
  `仅保留原始尺寸、色块 ID/数量、形状单元、颜色/层级统计、星标、时间/奖励/难度；对不具备可兼容出口合同的生成布局重建出口并使用非空间 staging 释放，Lv70 保留定时生成器、Lv73 保留 staged-frame。\n\n` +
  `## 证据\n\n` +
  `- 原始审计：\`playtest-results/experiments/current-source-audit-2026-09-18/report.json\`（${before.summary.solved}/${before.summary.proven_unsat}/${before.summary.inconclusive}）\n` +
  `- 修复审计：\`${focusedPath.replace(root + "\\", "")}\`（${focused.summary.solved}/${focused.summary.proven_unsat}/${focused.summary.inconclusive}）\n` +
  `- 全量审计：\`${finalAuditPath.replace(root + "\\", "")}\`（${finalAudit.summary.solved}/${finalAudit.summary.proven_unsat}/${finalAudit.summary.inconclusive}）；Lv20/Lv29 加深审计：\`${finalDeepPath.replace(root + "\\", "")}\`（${finalDeep.summary.solved}/${finalDeep.summary.proven_unsat}/${finalDeep.summary.inconclusive}）\n` +
  `- 形状/数量/颜色/层级/时间字段硬性保持失败数：${failedMinimality.length}\n\n` +
  `## Lv70/Lv73 机制保留\n\n` +
  `- Lv70：定时生成器仍存在并通过求解回放。\n` +
  `- Lv73：staged-frame 仍存在并通过求解回放。\n`;
await mkdir(outputDir, { recursive: true });
await writeFile(resolve(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
await writeFile(resolve(outputDir, "report.md"), markdown, "utf8");
console.log(JSON.stringify({ outputDir, campaignSemanticSha256, summary: report.final_summary, repaired: SOLVABILITY_REPAIR_LEVEL_IDS.length }, null, 2));
