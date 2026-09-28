import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createServer } from "vite";

const root = path.resolve(import.meta.dirname, "..");
const baseline = JSON.parse(fs.readFileSync(path.join(root, "tools", "level-freeze-baseline.json"), "utf8"));
const revision = baseline.baseline.match(/(?:^|-)r(\d+)(?:-|$)/)?.[1] ?? "current";
const outputDir = path.join(root, "deliverables", `difficulty-curve-current-r${revision}`);
fs.mkdirSync(outputDir, { recursive: true });

const vite = await createServer({
  root,
  logLevel: "silent",
  appType: "custom",
  server: { middlewareMode: true },
});

let LEVELS;
let difficultyModule;
let starModule;
try {
  [{ LEVELS }, difficultyModule, starModule] = await Promise.all([
    vite.ssrLoadModule("/src/core/levels.ts"),
    vite.ssrLoadModule("/src/core/blockOutDifficulty.ts"),
    vite.ssrLoadModule("/src/core/levelStarConditions.ts"),
  ]);
} finally {
  await vite.close();
}

if (!Array.isArray(LEVELS) || LEVELS.length !== 200) {
  throw new Error(`Expected 200 effective levels, received ${LEVELS?.length ?? 0}`);
}

const bandFor = (score) => {
  if (score < 45) return { id: "below", label: "未入档（<45）" };
  return difficultyModule.blockOutDifficultyBand(score)
    ?? { id: "outside", label: "超出范围" };
};

const records = LEVELS.map((level) => {
  const scored = difficultyModule.scoreBlockOutLevel(level);
  const actual = difficultyModule.calibratedBlockOutDifficulty(scored.score);
  const target = Number.isFinite(level.designTargets?.calibratedDifficulty)
    ? level.designTargets.calibratedDifficulty
    : null;
  const repositionFloor = Number.isFinite(level.designTargets?.minimumRepositionOverhead)
    ? level.designTargets.minimumRepositionOverhead
    : null;
  return {
    level: level.id,
    name: level.name,
    actualRaw: scored.score,
    actualD1: actual,
    actualBand: bandFor(actual).id,
    actualBandLabel: bandFor(actual).label,
    targetD1: target,
    targetGap: target === null ? null : Number((actual - target).toFixed(2)),
    uiDifficulty: level.difficulty,
    timeSeconds: level.timeSeconds,
    parMoves: Number.isFinite(level.parMoves) ? level.parMoves : null,
    moveTarget: starModule.moveTargetForLevel(level),
    clearLoad: starModule.levelClearLoad(level),
    repositionFloor,
    visibleBlocks: level.blocks.filter((block) => !block.shutterId
      && !(level.generators ?? []).some((generator) => generator.queueBlockIds.includes(block.id))).length,
    mechanismCount: scored.evidence.mechanisms.length,
    mechanisms: scored.evidence.mechanisms,
    components: scored.components,
  };
});

const mean = (values) => values.length
  ? values.reduce((sum, value) => sum + value, 0) / values.length
  : null;
const min = (values) => Math.min(...values);
const max = (values) => Math.max(...values);
const countBy = (values, keyOf) => values.reduce((result, value) => {
  const key = keyOf(value);
  result[key] = (result[key] ?? 0) + 1;
  return result;
}, {});

const actualValues = records.map((record) => record.actualD1);
const targetValues = records.flatMap((record) => record.targetD1 === null ? [] : [record.targetD1]);
const targetGaps = records.flatMap((record) => record.targetGap === null ? [] : [record.targetGap]);
const summary = {
  actualD1: {
    min: min(actualValues),
    max: max(actualValues),
    average: Number(mean(actualValues).toFixed(2)),
    bandCounts: countBy(records, (record) => record.actualBand),
  },
  authoredTarget: {
    coverage: targetValues.length,
    min: min(targetValues),
    max: max(targetValues),
    average: Number(mean(targetValues).toFixed(2)),
    averageActualMinusTarget: Number(mean(targetGaps).toFixed(2)),
  },
  uiDifficultyCounts: countBy(records, (record) => record.uiDifficulty),
};

const movingAverage = (values, radius = 2) => values.map((_, index) => {
  const start = Math.max(0, index - radius);
  const end = Math.min(values.length, index + radius + 1);
  return mean(values.slice(start, end));
});
const actualSmooth = movingAverage(actualValues);

const width = 1900;
const height = 940;
const plot = { left: 110, right: 58, top: 165, bottom: 92 };
const plotWidth = width - plot.left - plot.right;
const plotHeight = height - plot.top - plot.bottom;
const plotBottom = plot.top + plotHeight;
const x = (level) => plot.left + ((level - 1) / 199) * plotWidth;
const y = (score) => plot.top + ((100 - score) / 100) * plotHeight;
const n = (value) => Number(value).toFixed(2);
const escapeXml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&apos;");
const linePath = (values) => values.map((value, index) => (
  value === null || value === undefined
    ? null
    : `${index === 0 || values[index - 1] === null || values[index - 1] === undefined ? "M" : "L"}${n(x(index + 1))},${n(y(value))}`
)).filter(Boolean).join(" ");

const bands = [
  { from: 0, to: 45, color: "#151a36", label: "<45 未入档" },
  { from: 45, to: 50, color: "#173149", label: "入门" },
  { from: 50, to: 60, color: "#153f47", label: "普通" },
  { from: 60, to: 70, color: "#414527", label: "进阶" },
  { from: 70, to: 80, color: "#513b25", label: "困难" },
  { from: 80, to: 100, color: "#512735", label: "极难" },
];

const bandRects = bands.map((band) => `
  <rect x="${plot.left}" y="${n(y(band.to))}" width="${plotWidth}" height="${n(y(band.from) - y(band.to))}" fill="${band.color}"/>
  <text x="${width - plot.right - 10}" y="${n((y(band.from) + y(band.to)) / 2 + 5)}" text-anchor="end" class="band-label">${escapeXml(band.label)}</text>`).join("");
const chapterBands = Array.from({ length: 20 }, (_, index) => {
  const left = x(index * 10 + 1);
  const right = index === 19 ? width - plot.right : x((index + 1) * 10 + 1);
  return `<rect x="${n(left)}" y="${plot.top}" width="${n(right - left)}" height="${plotHeight}" fill="${index % 2 ? "#ffffff" : "#b9c8ff"}" opacity="${index % 2 ? "0.018" : "0.035"}"/>`;
}).join("");
const yGrid = Array.from({ length: 11 }, (_, index) => {
  const value = index * 10;
  return `<line x1="${plot.left}" y1="${n(y(value))}" x2="${width - plot.right}" y2="${n(y(value))}" class="grid"/>
    <text x="${plot.left - 18}" y="${n(y(value) + 5)}" text-anchor="end" class="axis-label">${value}</text>`;
}).join("");
const xTicks = Array.from({ length: 21 }, (_, index) => index === 0 ? 1 : index * 10)
  .map((level) => `<line x1="${n(x(level))}" y1="${plotBottom}" x2="${n(x(level))}" y2="${plotBottom + 8}" class="tick"/>
    <text x="${n(x(level))}" y="${plotBottom + 31}" text-anchor="middle" class="axis-label">${level}</text>`)
  .join("");
const chapterDividers = Array.from({ length: 19 }, (_, index) => {
  const level = (index + 1) * 10 + 0.5;
  return `<line x1="${n(x(level))}" y1="${plot.top}" x2="${n(x(level))}" y2="${plotBottom}" class="chapter-divider"/>`;
}).join("");
const actualPath = linePath(actualValues);
const smoothPath = linePath(actualSmooth);
const targetPath = linePath(records.map((record) => record.targetD1));
const pointMarkers = records.map((record) => `
  <circle class="data-hit" cx="${n(x(record.level))}" cy="${n(y(record.actualD1))}" r="7"
    data-level="${record.level}" data-name="${escapeXml(record.name)}" data-actual="${record.actualD1.toFixed(2)}"
    data-target="${record.targetD1 === null ? "—" : record.targetD1.toFixed(2)}"
    data-band="${escapeXml(record.actualBandLabel)}" data-ui="${record.uiDifficulty}"
    data-time="${record.timeSeconds}" data-moves="${record.moveTarget}" data-floor="${record.repositionFloor ?? "—"}"/>`).join("");

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="7" stdDeviation="14" flood-color="#050718" flood-opacity="0.42"/></filter>
    <clipPath id="plot-clip"><rect x="${plot.left}" y="${plot.top}" width="${plotWidth}" height="${plotHeight}" rx="18"/></clipPath>
    <style>
      text { font-family: "Microsoft YaHei", "PingFang SC", Arial, sans-serif; fill: #edf2ff; }
      .title { font-size: 38px; font-weight: 800; }
      .subtitle { font-size: 18px; fill: #aeb9de; }
      .grid { stroke: #91a0d0; stroke-width: 1; opacity: .20; }
      .chapter-divider { stroke: #94a0c9; stroke-width: 1; stroke-dasharray: 4 8; opacity: .30; }
      .axis { stroke: #a9b5df; stroke-width: 1.5; opacity: .70; }
      .tick { stroke: #a9b5df; stroke-width: 1.2; }
      .axis-label { font-size: 14px; fill: #aeb9de; }
      .band-label { font-size: 13px; fill: #cbd4f4; opacity: .72; }
      .actual-raw { fill: none; stroke: #71cfff; stroke-width: 2; opacity: .36; }
      .actual-smooth { fill: none; stroke: #28b9ff; stroke-width: 5; stroke-linecap: round; stroke-linejoin: round; }
      .target { fill: none; stroke: #ffb54a; stroke-width: 4; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 9 8; }
      .data-hit { fill: transparent; stroke: transparent; pointer-events: all; cursor: crosshair; }
      .legend { font-size: 16px; font-weight: 700; }
      .note { font-size: 14px; fill: #f6c877; }
    </style>
  </defs>
  <rect width="${width}" height="${height}" fill="#111530"/>
  <text x="${plot.left}" y="55" class="title">Block Out! Lv1–200 当前难度曲线</text>
  <text x="${plot.left}" y="88" class="subtitle">基线 ${escapeXml(baseline.baseline)} · 实际结构 D1 与作者目标 D1 分开显示</text>
  <g transform="translate(${plot.left},120)">
    <line x1="0" y1="0" x2="44" y2="0" class="actual-smooth"/><text x="56" y="6" class="legend">实际 D1（5关均线）</text>
    <line x1="265" y1="0" x2="309" y2="0" class="actual-raw"/><text x="321" y="6" class="legend">逐关实际 D1</text>
    <line x1="500" y1="0" x2="544" y2="0" class="target"/><text x="556" y="6" class="legend">作者目标 D1（仅 Lv1–100）</text>
  </g>
  <text x="${width - plot.right}" y="124" text-anchor="end" class="note">Lv101–200 当前没有 authored target / parMoves / 腾挪下限字段</text>
  <rect x="${plot.left}" y="${plot.top}" width="${plotWidth}" height="${plotHeight}" rx="18" fill="#171c3d" filter="url(#shadow)"/>
  <g clip-path="url(#plot-clip)">
    ${bandRects}
    ${chapterBands}
    ${yGrid}
    ${chapterDividers}
    <line x1="${n(x(100.5))}" y1="${plot.top}" x2="${n(x(100.5))}" y2="${plotBottom}" stroke="#ffcf7d" stroke-width="2" stroke-dasharray="6 7" opacity=".70"/>
    <path d="${actualPath}" class="actual-raw"/>
    <path d="${smoothPath}" class="actual-smooth"/>
    <path d="${targetPath}" class="target"/>
    ${pointMarkers}
  </g>
  <line x1="${plot.left}" y1="${plotBottom}" x2="${width - plot.right}" y2="${plotBottom}" class="axis"/>
  <line x1="${plot.left}" y1="${plot.top}" x2="${plot.left}" y2="${plotBottom}" class="axis"/>
  ${xTicks}
  <text x="35" y="${plot.top + plotHeight / 2}" text-anchor="middle" class="legend" transform="rotate(-90 35 ${plot.top + plotHeight / 2})">D1 校准难度值</text>
  <text x="${plot.left + plotWidth / 2}" y="${height - 25}" text-anchor="middle" class="legend">关卡编号</text>
</svg>`;

const chapterRows = Array.from({ length: 20 }, (_, chapterIndex) => {
  const group = records.slice(chapterIndex * 10, chapterIndex * 10 + 10);
  const actual = group.map((record) => record.actualD1);
  const targets = group.flatMap((record) => record.targetD1 === null ? [] : [record.targetD1]);
  return {
    range: `Lv${chapterIndex * 10 + 1}–${chapterIndex * 10 + 10}`,
    actualAverage: mean(actual),
    actualMin: min(actual),
    actualMax: max(actual),
    targetAverage: targets.length ? mean(targets) : null,
  };
});

const htmlRows = records.map((record) => `<tr data-level="${record.level}">
  <td>Lv${record.level}</td><td>${escapeXml(record.name)}</td>
  <td>${record.actualD1.toFixed(2)}</td><td>${escapeXml(record.actualBandLabel)}</td>
  <td>${record.targetD1 === null ? "—" : record.targetD1.toFixed(2)}</td>
  <td>${record.targetGap === null ? "—" : `${record.targetGap > 0 ? "+" : ""}${record.targetGap.toFixed(2)}`}</td>
  <td>${record.uiDifficulty}</td><td>${record.timeSeconds}s</td>
  <td>${record.clearLoad}</td><td>${record.moveTarget}</td><td>${record.repositionFloor ?? "—"}</td>
</tr>`).join("");
const chapterHtmlRows = chapterRows.map((row) => `<tr>
  <td>${row.range}</td><td>${row.actualAverage.toFixed(2)}</td><td>${row.actualMin.toFixed(2)}–${row.actualMax.toFixed(2)}</td>
  <td>${row.targetAverage === null ? "—" : row.targetAverage.toFixed(2)}</td>
</tr>`).join("");

const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Lv1–200 当前难度曲线</title>
<style>
  :root{color-scheme:dark;font-family:"Microsoft YaHei","PingFang SC",Arial,sans-serif;background:#0c1027;color:#eff3ff}
  *{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 30% -10%,#262d68 0,#0c1027 42%);min-height:100vh}
  main{width:min(1900px,100%);margin:auto;padding:28px 28px 64px}h1{font-size:32px;margin:0 0 8px}.muted{color:#aeb9de}
  .cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin:22px 0}.card{background:#171c3d;border:1px solid #333b7a;border-radius:16px;padding:18px;box-shadow:0 12px 30px #05071855}.card b{display:block;font-size:26px;margin-top:7px}.card span{color:#aeb9de}
  .chart{position:relative;background:#111530;border:1px solid #333b7a;border-radius:20px;overflow:hidden}.chart svg{display:block;width:100%;height:auto}.tooltip{position:fixed;z-index:10;display:none;pointer-events:none;background:#080b1ef2;border:1px solid #5968b5;border-radius:12px;padding:10px 12px;font-size:13px;line-height:1.7;box-shadow:0 10px 28px #0009;min-width:190px}
  .warning{margin:18px 0;padding:14px 17px;border:1px solid #775e2f;background:#332a1d;border-radius:12px;color:#f5d18c}
  details{margin-top:20px;background:#151a36;border:1px solid #30386e;border-radius:15px;padding:15px}summary{cursor:pointer;font-weight:700;font-size:18px}
  .table-wrap{overflow:auto;max-height:620px;margin-top:14px;border-radius:12px;border:1px solid #30386e}table{border-collapse:collapse;width:100%;font-size:14px}th,td{padding:9px 12px;border-bottom:1px solid #272e5e;text-align:right;white-space:nowrap}th{position:sticky;top:0;background:#242b5d;z-index:1}th:nth-child(2),td:nth-child(2){text-align:left}tr:hover td{background:#202752}input{width:260px;max-width:100%;margin:14px 0 0;padding:10px 12px;border-radius:10px;border:1px solid #485393;background:#0d1230;color:#fff}
  .chapter-table{max-height:none}.formula{line-height:1.8;color:#c9d3f6}.formula code{color:#7bd5ff}
  @media(max-width:900px){main{padding:18px 12px 48px}.cards{grid-template-columns:1fr 1fr}.chart{overflow-x:auto}.chart svg{width:1500px;max-width:none}}
</style></head><body><main>
  <h1>Lv1–200 当前难度曲线</h1>
  <div class="muted">${escapeXml(baseline.baseline)} · campaign SHA ${baseline.campaignSha256}</div>
  <section class="cards">
    <div class="card"><span>实际结构 D1 范围</span><b>${summary.actualD1.min.toFixed(2)}–${summary.actualD1.max.toFixed(2)}</b></div>
    <div class="card"><span>实际结构 D1 平均</span><b>${summary.actualD1.average.toFixed(2)}</b></div>
    <div class="card"><span>作者目标覆盖</span><b>${summary.authoredTarget.coverage}/200</b></div>
    <div class="card"><span>Lv1–100 实际－目标均值</span><b>${summary.authoredTarget.averageActualMinusTarget > 0 ? "+" : ""}${summary.authoredTarget.averageActualMinusTarget.toFixed(2)}</b></div>
  </section>
  <div class="warning">蓝线是按当前棋盘与机制重新计算的实际结构 D1；橙线是作者规划目标。Lv101–200 当前没有 authored target、parMoves 或必要腾挪下限，因此橙线在 Lv100 截止。</div>
  <section class="chart">${svg}<div id="tooltip" class="tooltip"></div></section>
  <details open><summary>每10关曲线摘要</summary><div class="table-wrap chapter-table"><table><thead><tr><th>区间</th><th>实际D1均值</th><th>实际D1范围</th><th>目标D1均值</th></tr></thead><tbody>${chapterHtmlRows}</tbody></table></div></details>
  <details><summary>逐关难度参数</summary><input id="filter" placeholder="输入关卡编号或名称"><div class="table-wrap"><table><thead><tr><th>关卡</th><th>名称</th><th>实际D1</th><th>实际档位</th><th>目标D1</th><th>实际-目标</th><th>界面标签</th><th>时间</th><th>清除负载</th><th>三星步数</th><th>腾挪下限</th></tr></thead><tbody id="rows">${htmlRows}</tbody></table></div></details>
  <details><summary>计算口径</summary><div class="formula"><p><code>raw = 100 × (空间紧张度×0.35 + 隐藏信息×0.20 + 机制多样度×0.20 + 出口竞争度×0.25)</code></p><p><code>calibrated = 13.161835 + 0.826935 × raw</code></p><p>倒计时、parMoves 与必要腾挪下限不直接进入结构 D1；它们作为独立参数列出。</p></div></details>
</main><script>
  const tooltip=document.getElementById('tooltip');
  document.querySelectorAll('.data-hit').forEach((point)=>{
    const show=(event)=>{const d=point.dataset;tooltip.innerHTML='<b>Lv'+d.level+' · '+d.name+'</b><br>实际 D1：'+d.actual+'（'+d.band+'）<br>目标 D1：'+d.target+'<br>界面：'+d.ui+' · '+d.time+'s<br>三星步数：'+d.moves+' · 腾挪下限：'+d.floor;tooltip.style.display='block';tooltip.style.left=Math.min(innerWidth-220,event.clientX+16)+'px';tooltip.style.top=Math.min(innerHeight-170,event.clientY+16)+'px'};
    point.addEventListener('pointermove',show);point.addEventListener('pointerleave',()=>tooltip.style.display='none');
  });
  document.getElementById('filter').addEventListener('input',(event)=>{const q=event.target.value.trim().toLowerCase();document.querySelectorAll('#rows tr').forEach((row)=>row.hidden=q&&!row.textContent.toLowerCase().includes(q))});
</script></body></html>`;

const svgPath = path.join(outputDir, "difficulty-curve-lv001-200.svg");
const htmlPath = path.join(outputDir, "index.html");
const dataPath = path.join(outputDir, "difficulty-curve-lv001-200.json");
const pngPath = path.join(outputDir, "difficulty-curve-lv001-200.png");
fs.writeFileSync(svgPath, svg, "utf8");
fs.writeFileSync(htmlPath, html, "utf8");
fs.writeFileSync(dataPath, `${JSON.stringify({
  generatedAt: new Date().toISOString(),
  baseline: baseline.baseline,
  campaignSha256: baseline.campaignSha256,
  formula: {
    weights: difficultyModule.BLOCK_OUT_DIFFICULTY_WEIGHTS,
    calibration: difficultyModule.BLOCK_OUT_DIFFICULTY_CALIBRATION,
    bands: difficultyModule.BLOCK_OUT_DIFFICULTY_BANDS,
  },
  summary,
  levels: records,
}, null, 2)}\n`, "utf8");

let pngWritten = false;
try {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(svgPath).href, { waitUntil: "load" });
  await page.screenshot({ path: pngPath, type: "png", omitBackground: false });
  await browser.close();
  pngWritten = true;
} catch (error) {
  console.warn(`PNG export skipped: ${error.message}`);
}

console.log(JSON.stringify({
  baseline: baseline.baseline,
  campaignSha256: baseline.campaignSha256,
  outputDir,
  htmlPath,
  svgPath,
  pngPath: pngWritten ? pngPath : null,
  dataPath,
  summary,
}, null, 2));
