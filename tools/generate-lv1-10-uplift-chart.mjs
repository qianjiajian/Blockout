import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(import.meta.dirname, "..");
const outputDir = path.join(root, "deliverables", "original-levels", "pipeline");
const levelSummaryPath = path.join(root, "playtest-results", "latest-level-design-summary.json");
const finalAuditPath = path.join(root, "playtest-results", "experiments", "lv1-10-competitor-composition", "lv1-10-final-audit.json");
const svgPath = path.join(outputDir, "blockout-lv1-10-difficulty-uplift.svg");
const pngPath = path.join(outputDir, "blockout-lv1-10-difficulty-uplift.png");
const reportPath = path.join(outputDir, "blockout-lv1-10-difficulty-uplift.json");

const before = [
  { level: 1, calibrated: 23.63, raw: 12.66, drags: 2, repositions: 0 },
  { level: 2, calibrated: 48.22, raw: 42.40, drags: 12, repositions: 6 },
  { level: 3, calibrated: 46.30, raw: 40.07, drags: 13, repositions: 8 },
  { level: 4, calibrated: 46.21, raw: 39.96, drags: 11, repositions: 3 },
  { level: 5, calibrated: 45.35, raw: 38.92, drags: 11, repositions: 1 },
  { level: 6, calibrated: 46.38, raw: 40.17, drags: 11, repositions: 3 },
  { level: 7, calibrated: 47.44, raw: 41.45, drags: 12, repositions: 3 },
  { level: 8, calibrated: 45.77, raw: 39.43, drags: 22, repositions: 11 },
  { level: 9, calibrated: 47.40, raw: 41.40, drags: 15, repositions: 4 },
  { level: 10, calibrated: 45.55, raw: 39.17, drags: 14, repositions: 7 },
];

const levelSummary = JSON.parse(fs.readFileSync(levelSummaryPath, "utf8")).summary.levels.slice(0, 10);
const finalAudit = JSON.parse(fs.readFileSync(finalAuditPath, "utf8"));
const verifiedById = new Map(finalAudit.levels.map((record) => [record.level_id, record]));
const after = levelSummary.map((record) => {
  const verified = verifiedById.get(record.id);
  const drags = verified?.exact.drags ?? record.parMoves;
  const repositions = verified?.exact.reposition_overhead ?? drags - record.clearLoad;
  return {
    level: record.id,
    name: record.name,
    calibrated: record.calibratedDifficulty,
    raw: (record.calibratedDifficulty - 13.161835) / 0.826935,
    drags,
    repositions,
    blocks: verified?.total_blocks ?? record.visibleBlocks,
  };
});

const mean = (items, key) => items.reduce((sum, item) => sum + item[key], 0) / items.length;
const sum = (items, key) => items.reduce((total, item) => total + item[key], 0);
const round = (value) => Number(value.toFixed(2));
const signed = (value, digits = 2) => `${value > 0 ? "+" : ""}${Number(value).toFixed(digits)}`;
const summary = {
  calibrated_mean: {
    before: round(mean(before, "calibrated")),
    after: round(mean(after, "calibrated")),
    delta: round(mean(after, "calibrated") - mean(before, "calibrated")),
  },
  raw_mean: {
    before: round(mean(before, "raw")),
    after: round(mean(after, "raw")),
    delta: round(mean(after, "raw") - mean(before, "raw")),
  },
  validation_route_drags: {
    before: sum(before, "drags"),
    after: sum(after, "drags"),
    delta: sum(after, "drags") - sum(before, "drags"),
    delta_percent: round((sum(after, "drags") / sum(before, "drags") - 1) * 100),
  },
  reposition_overhead: {
    before: sum(before, "repositions"),
    after: sum(after, "repositions"),
    delta: sum(after, "repositions") - sum(before, "repositions"),
  },
};

const perLevel = after.map((item, index) => ({
  level_id: item.level,
  name: item.name,
  before: before[index],
  after: item,
  calibrated_delta: round(item.calibrated - before[index].calibrated),
  drag_delta: item.drags - before[index].drags,
}));

fs.writeFileSync(reportPath, `${JSON.stringify({
  scope: "Block Out original Lv1-Lv10 competitor-composition redesign comparison",
  calibration: "blockout-d1-baseline-2026-09-05 (fixed)",
  solver_note: "Drag counts are solver-proven optima; Lv1–10 are replayed through PuzzleModel and real Pointer input.",
  summary,
  per_level: perLevel,
}, null, 2)}\n`, "utf8");

const width = 1600;
const height = 900;
const left = 105;
const right = 65;
const chartWidth = width - left - right;
const x = (level) => left + ((level - 1) / 9) * chartWidth;
const topA = 205;
const heightA = 310;
const yDifficulty = (value) => topA + heightA - (value / 90) * heightA;
const topB = 635;
const heightB = 160;
const dragCeiling = Math.ceil(Math.max(...before.map((item) => item.drags), ...after.map((item) => item.drags)) / 10) * 10;
const yDrags = (value) => topB + heightB - (value / dragCeiling) * heightB;
const n = (value) => Number(value).toFixed(2);
const pathFor = (items, key, yScale) => items.map((item, index) => (
  `${index === 0 ? "M" : "L"}${n(x(item.level))},${n(yScale(item[key]))}`
)).join(" ");

const difficultyGrid = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90].map((value) => `
  <line x1="${left}" y1="${n(yDifficulty(value))}" x2="${width - right}" y2="${n(yDifficulty(value))}" class="grid"/>
  <text x="84" y="${n(yDifficulty(value) + 6)}" text-anchor="end" class="axis-label">${value}</text>`).join("");
const dragGrid = Array.from({ length: dragCeiling / 10 + 1 }, (_, index) => index * 10).map((value) => `
  <line x1="${left}" y1="${n(yDrags(value))}" x2="${width - right}" y2="${n(yDrags(value))}" class="grid"/>
  <text x="84" y="${n(yDrags(value) + 6)}" text-anchor="end" class="axis-label">${value}</text>`).join("");

const pointLabels = perLevel.map((item) => `
  <line x1="${n(x(item.level_id))}" y1="${n(yDifficulty(item.before.calibrated))}" x2="${n(x(item.level_id))}" y2="${n(yDifficulty(item.after.calibrated))}" class="uplift-line"/>
  <circle cx="${n(x(item.level_id))}" cy="${n(yDifficulty(item.before.calibrated))}" r="5" class="before-point"/>
  <circle cx="${n(x(item.level_id))}" cy="${n(yDifficulty(item.after.calibrated))}" r="6" class="after-point"/>
  <text x="${n(x(item.level_id))}" y="${n(yDifficulty(item.after.calibrated) - 14)}" text-anchor="middle" class="delta">${signed(item.calibrated_delta)}</text>`).join("");

const bars = perLevel.map((item) => {
  const center = x(item.level_id);
  const beforeY = yDrags(item.before.drags);
  const afterY = yDrags(item.after.drags);
  return `
    <rect x="${n(center - 22)}" y="${n(beforeY)}" width="18" height="${n(topB + heightB - beforeY)}" rx="4" class="before-bar"/>
    <rect x="${n(center + 4)}" y="${n(afterY)}" width="18" height="${n(topB + heightB - afterY)}" rx="4" class="after-bar"/>
    <text x="${n(center - 13)}" y="${n(beforeY - 8)}" text-anchor="middle" class="bar-label">${item.before.drags}</text>
    <text x="${n(center + 13)}" y="${n(afterY - 8)}" text-anchor="middle" class="bar-label strong">${item.after.drags}</text>
    <text x="${n(center)}" y="832" text-anchor="middle" class="level-label">Lv${item.level_id}</text>`;
}).join("");

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <filter id="shadow"><feDropShadow dx="0" dy="4" stdDeviation="10" flood-color="#1D2A44" flood-opacity="0.10"/></filter>
    <style>
      text { font-family: "Microsoft YaHei", "PingFang SC", Arial, sans-serif; fill: #26344D; }
      .title { font-size: 38px; font-weight: 700; }
      .subtitle { font-size: 18px; fill: #718096; }
      .card-label { font-size: 15px; fill: #718096; }
      .card-value { font-size: 25px; font-weight: 700; }
      .panel-title { font-size: 18px; font-weight: 700; }
      .grid { stroke: #DCE3ED; stroke-width: 1; }
      .axis-label { font-size: 14px; fill: #718096; }
      .before-line { fill: none; stroke: #94A3B8; stroke-width: 3; stroke-dasharray: 7 7; }
      .after-line { fill: none; stroke: #1769E0; stroke-width: 5; stroke-linecap: round; stroke-linejoin: round; }
      .uplift-line { stroke: #43A36F; stroke-width: 3; opacity: 0.45; }
      .before-point { fill: #FFFFFF; stroke: #94A3B8; stroke-width: 3; }
      .after-point { fill: #FFFFFF; stroke: #1769E0; stroke-width: 4; }
      .delta { font-size: 13px; font-weight: 700; fill: #218653; }
      .before-bar { fill: #CBD5E1; }
      .after-bar { fill: #1769E0; }
      .bar-label { font-size: 13px; fill: #718096; }
      .bar-label.strong { fill: #1769E0; font-weight: 700; }
      .level-label { font-size: 15px; font-weight: 600; fill: #52627A; }
      .legend { font-size: 15px; font-weight: 600; }
    </style>
  </defs>
  <rect width="${width}" height="${height}" fill="#F3F6FA"/>
  <text x="${left}" y="55" class="title">Block Out Lv1–10 竞品构成重制对比</text>
  <text x="${left}" y="88" class="subtitle">固定基线标尺对比；调整后拖动次数为求解器证明的严格最优值</text>

  <g transform="translate(${left},110)">
    <rect width="280" height="64" rx="13" fill="#EAF2FF"/>
    <text x="20" y="25" class="card-label">章节平均难度</text>
    <text x="20" y="52" class="card-value" fill="#1769E0">${summary.calibrated_mean.before.toFixed(2)} → ${summary.calibrated_mean.after.toFixed(2)}</text>
    <text x="248" y="43" text-anchor="end" class="card-label" fill="#218653">${signed(summary.calibrated_mean.delta)}</text>
  </g>
  <g transform="translate(${left + 298},110)">
    <rect width="280" height="64" rx="13" fill="#EAF8F0"/>
    <text x="20" y="25" class="card-label">验证路线拖动合计</text>
    <text x="20" y="52" class="card-value" fill="#218653">${summary.validation_route_drags.before} → ${summary.validation_route_drags.after}</text>
    <text x="248" y="43" text-anchor="end" class="card-label" fill="#218653">${signed(summary.validation_route_drags.delta_percent, 1)}%</text>
  </g>
  <g transform="translate(${left + 596},110)">
    <rect width="280" height="64" rx="13" fill="#FFF7E8"/>
    <text x="20" y="25" class="card-label">必要换位合计</text>
    <text x="20" y="52" class="card-value" fill="#C96800">${summary.reposition_overhead.before} → ${summary.reposition_overhead.after}</text>
    <text x="248" y="43" text-anchor="end" class="card-label" fill="#218653">${signed(summary.reposition_overhead.delta, 0)}</text>
  </g>

  <rect x="${left}" y="${topA}" width="${chartWidth}" height="${heightA}" rx="14" fill="#FFFFFF" filter="url(#shadow)"/>
  <text x="${left + 18}" y="${topA + 28}" class="panel-title">校准难度分（0–90 显示区间）</text>
  ${difficultyGrid}
  <path d="${pathFor(before, "calibrated", yDifficulty)}" class="before-line"/>
  <path d="${pathFor(after, "calibrated", yDifficulty)}" class="after-line"/>
  ${pointLabels}
  <g transform="translate(${width - 410}, ${topA + 30})">
    <line x1="0" y1="0" x2="38" y2="0" class="before-line"/><text x="50" y="6" class="legend">调整前</text>
    <line x1="130" y1="0" x2="168" y2="0" class="after-line"/><text x="180" y="6" class="legend">调整后</text>
  </g>

  <rect x="${left}" y="${topB}" width="${chartWidth}" height="${heightB}" rx="14" fill="#FFFFFF" filter="url(#shadow)"/>
  <text x="${left + 18}" y="${topB + 28}" class="panel-title">最优路线拖动次数</text>
  ${dragGrid}
  ${bars}
</svg>`;

fs.writeFileSync(svgPath, svg, "utf8");

const { chromium } = await import("playwright");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(svgPath).href, { waitUntil: "load" });
await page.screenshot({ path: pngPath, type: "png", omitBackground: false });
await browser.close();

console.log(JSON.stringify({ reportPath, svgPath, pngPath, summary }, null, 2));
