import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const baseDir = resolve(root, "playtest-results/current-campaign-solver-2026-09-18");
const deepPartialDir = resolve(root, "playtest-results/current-campaign-solver-2026-09-18-deep");
const deepDirs = [
  resolve(root, "playtest-results/current-campaign-solver-2026-09-18-deep-a"),
  resolve(root, "playtest-results/current-campaign-solver-2026-09-18-deep-b"),
];
const outputDir = resolve(root, "playtest-results/current-campaign-solver-2026-09-18-final");

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));
const readJsonl = async (path) => (await readFile(path, "utf8"))
  .split(/\r?\n/u)
  .filter(Boolean)
  .map((line) => JSON.parse(line));

const base = await readJson(resolve(baseDir, "report.json"));
const rawBaseById = new Map((await readJsonl(resolve(baseDir, "results.jsonl"))).map((row) => [row.levelId, row]));
const deepRows = [];
for (const dir of deepDirs) {
  const report = await readJson(resolve(dir, "report.json"));
  if (report.campaign_semantic_sha256 !== base.campaign_semantic_sha256) {
    throw new Error(`Campaign SHA mismatch in ${dir}`);
  }
  deepRows.push(...report.levels);
}
for (const raw of await readJsonl(resolve(deepPartialDir, "results.jsonl"))) {
  deepRows.push({
    level_id: raw.levelId,
    status: "inconclusive",
    termination: raw.wallTimeout ? "wall_timeout" : raw.workerError ? "worker_error" : raw.solver?.termination ?? "unknown",
    explored_states: raw.solver?.exploredStates ?? null,
    wall_duration_ms: raw.wallDurationMs ?? null,
    error: raw.error ?? raw.replay?.detail ?? null,
  });
}
const deepById = new Map(deepRows.map((row) => [row.level_id, row]));

const finalRows = base.levels.map((baseRow) => {
  const raw = rawBaseById.get(baseRow.level_id);
  const deep = deepById.get(baseRow.level_id) ?? null;
  const promoted = deep && deep.status !== "inconclusive" ? deep : null;
  const row = promoted ? { ...baseRow, ...promoted } : { ...baseRow };
  row.static_unsat_reasons = raw?.solver?.staticUnsatReasons ?? [];
  row.initial_attempt = {
    status: baseRow.status,
    termination: baseRow.termination,
    explored_states: baseRow.explored_states,
    wall_duration_ms: baseRow.wall_duration_ms,
    error: baseRow.error,
  };
  row.deep_attempt = deep ? {
    status: deep.status,
    termination: deep.termination,
    explored_states: deep.explored_states,
    wall_duration_ms: deep.wall_duration_ms,
    error: deep.error,
  } : null;
  return row;
});

const count = (status) => finalRows.filter((row) => row.status === status).length;
const reasonSummary = {};
for (const row of finalRows) {
  for (const reason of row.static_unsat_reasons) {
    reasonSummary[reason.code] ??= { instances: 0, level_ids: [] };
    reasonSummary[reason.code].instances += 1;
    if (!reasonSummary[reason.code].level_ids.includes(row.level_id)) reasonSummary[reason.code].level_ids.push(row.level_id);
  }
}

const report = {
  generated_at: new Date().toISOString(),
  scope: { from_level: 1, to_level: 200, level_count: 200 },
  campaign_semantic_sha256: base.campaign_semantic_sha256,
  source_sha256: base.source_sha256,
  policy: base.policy,
  staged_settings: {
    initial: { max_states: 120_000, wall_timeout_ms: 30_000, concurrency: 3, levels: 200 },
    deep: { max_states: 500_000, wall_timeout_ms: 120_000, concurrency: 2, level_ids: [...deepById.keys()].sort((a, b) => a - b) },
  },
  summary: {
    solved: count("solved"),
    proven_unsat: count("proven_unsat"),
    inconclusive: count("inconclusive"),
    total: finalRows.length,
    static_reason_summary: reasonSummary,
  },
  levels: finalRows,
};

if (report.summary.solved + report.summary.proven_unsat + report.summary.inconclusive !== 200) {
  throw new Error("Final status count does not equal 200");
}

const groups = Object.fromEntries(["solved", "proven_unsat", "inconclusive"].map((status) => [
  status,
  finalRows.filter((row) => row.status === status).map((row) => row.level_id),
]));
const formatIds = (ids) => ids.join("、") || "无";
const tableRows = finalRows.map((row) => {
  const reasonCodes = [...new Set(row.static_unsat_reasons.map((reason) => reason.code))].join("；");
  return `| ${row.level_id} | ${row.status} | ${row.termination} | ${row.explored_states ?? "—"} | ${row.minimum_drags ?? "—"} | ${row.reposition_overhead ?? "—"} | ${reasonCodes || row.error || "—"} |`;
});
const markdown = `# 当前正式 Lv1–200 最终求解审计\n\n` +
  `- Campaign semantic SHA-256：\`${report.campaign_semantic_sha256}\`\n` +
  `- 已解且 PuzzleModel 回放通过：**${report.summary.solved}/200**\n` +
  `- 已证明无解：**${report.summary.proven_unsat}/200**\n` +
  `- 暂未定：**${report.summary.inconclusive}/200**\n` +
  `- 首轮：12万状态、30秒、并发3；暂未定关加深为50万状态、120秒、并发2。\n\n` +
  `## 关卡分组\n\n` +
  `- 已解：${formatIds(groups.solved)}\n` +
  `- 已证明无解：${formatIds(groups.proven_unsat)}\n` +
  `- 暂未定：${formatIds(groups.inconclusive)}\n\n` +
  `## 无解原因汇总\n\n` +
  Object.entries(reasonSummary).map(([code, value]) => `- ${code}：${value.level_ids.length}关 / ${value.instances}项`).join("\n") +
  `\n\n## 逐关结果\n\n` +
  `| Lv | 状态 | 终止原因 | 状态数 | 拖数 | 必要腾挪 | 原因/备注 |\n|---:|---|---|---:|---:|---:|---|\n${tableRows.join("\n")}\n`;

await mkdir(outputDir, { recursive: true });
await writeFile(resolve(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
await writeFile(resolve(outputDir, "report.md"), markdown, "utf8");
console.log(JSON.stringify({ outputDir, campaignSemanticSha256: report.campaign_semantic_sha256, summary: report.summary }, null, 2));
