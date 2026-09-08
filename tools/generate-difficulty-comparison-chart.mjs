import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const projectRoot = path.resolve(import.meta.dirname, "..");
const inputPath = path.join(
  projectRoot,
  "deliverables",
  "original-levels",
  "pipeline",
  "blockout-original-difficulty-curve.json",
);
const outputDir = path.dirname(inputPath);
const svgPath = path.join(outputDir, "blockout-difficulty-comparison-lv1-100.svg");
const pngPath = path.join(outputDir, "blockout-difficulty-comparison-lv1-100.png");

const curve = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const levels = curve.per_level;

if (!Array.isArray(levels) || levels.length !== 100) {
  throw new Error(`Expected 100 level records, received ${levels?.length ?? 0}`);
}

const width = 1600;
const height = 900;
const plot = { left: 108, right: 70, top: 205, bottom: 112 };
const plotWidth = width - plot.left - plot.right;
const plotHeight = height - plot.top - plot.bottom;
const plotBottom = plot.top + plotHeight;

const x = (level) => plot.left + ((level - 1) / 99) * plotWidth;
const y = (score) => plot.top + ((100 - score) / 100) * plotHeight;
const n = (value) => Number(value).toFixed(2);
const linePath = (key) =>
  levels
    .map((item, index) => `${index === 0 ? "M" : "L"}${n(x(item.level_id))},${n(y(item[key]))}`)
    .join(" ");

const mean = (key) =>
  levels.reduce((sum, item) => sum + Number(item[key]), 0) / levels.length;

const competitorAverage = mean("competitor_score");
const originalAverage = mean("original_calibrated");
const competitorPath = linePath("competitor_score");
const competitorSmoothPath = linePath("competitor_smoothed");
const originalPath = linePath("original_calibrated");
const originalSmoothPath = linePath("original_smoothed");

const chapterBands = Array.from({ length: 10 }, (_, index) => {
  const bandX = plot.left + index * (plotWidth / 10);
  const bandWidth = plotWidth / 10;
  return `<rect x="${n(bandX)}" y="${plot.top}" width="${n(bandWidth)}" height="${plotHeight}"
    fill="${index % 2 === 0 ? "#F7F9FC" : "#FFFFFF"}"/>`;
}).join("");

const chapterLabels = Array.from({ length: 10 }, (_, index) => {
  const bandX = plot.left + index * (plotWidth / 10);
  const bandWidth = plotWidth / 10;
  return `<text x="${n(bandX + bandWidth / 2)}" y="190" text-anchor="middle"
    class="chapter">第${index + 1}章</text>`;
}).join("");

const yGrid = Array.from({ length: 11 }, (_, index) => {
  const score = index * 10;
  const gridY = y(score);
  return `<line x1="${plot.left}" y1="${n(gridY)}" x2="${width - plot.right}" y2="${n(gridY)}"
    class="grid"/>`;
}).join("");

const yLabels = Array.from({ length: 11 }, (_, index) => {
  const score = index * 10;
  return `<text x="88" y="${n(y(score) + 6)}" text-anchor="end" class="axis-label">${score}</text>`;
}).join("");

const xTicks = [1, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
  .map((level) => `
    <line x1="${n(x(level))}" y1="${plotBottom}" x2="${n(x(level))}" y2="${plotBottom + 8}"
      class="tick"/>
    <text x="${n(x(level))}" y="${plotBottom + 34}" text-anchor="middle" class="axis-label">${level}</text>`)
  .join("");

const chapterDividers = Array.from({ length: 9 }, (_, index) => {
  const dividerX = plot.left + ((index + 1) * plotWidth) / 10;
  return `<line x1="${n(dividerX)}" y1="${plot.top}" x2="${n(dividerX)}" y2="${plotBottom}" class="chapter-divider"/>`;
}).join("");

const smoothMarkers = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
  .map((level) => {
    const item = levels[level - 1];
    return `
      <circle cx="${n(x(level))}" cy="${n(y(item.competitor_smoothed))}" r="5.5" class="competitor-marker"/>
      <circle cx="${n(x(level))}" cy="${n(y(item.original_smoothed))}" r="5.5" class="original-marker"/>`;
  })
  .join("");

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="130%">
      <feDropShadow dx="0" dy="5" stdDeviation="12" flood-color="#1D2A44" flood-opacity="0.10"/>
    </filter>
    <clipPath id="plot-clip">
      <rect x="${plot.left}" y="${plot.top}" width="${plotWidth}" height="${plotHeight}" rx="14"/>
    </clipPath>
    <style>
      text { font-family: "Microsoft YaHei", "PingFang SC", Arial, sans-serif; fill: #25324A; }
      .title { font-size: 38px; font-weight: 700; letter-spacing: 0.5px; }
      .subtitle { font-size: 18px; fill: #718096; }
      .metric-label { font-size: 15px; fill: #718096; }
      .metric-value { font-size: 23px; font-weight: 700; }
      .chapter { font-size: 14px; font-weight: 600; fill: #7B879C; }
      .grid { stroke: #DCE3ED; stroke-width: 1; }
      .chapter-divider { stroke: #BCC7D6; stroke-width: 1; stroke-dasharray: 5 7; }
      .axis { stroke: #9BA9BC; stroke-width: 1.5; }
      .tick { stroke: #9BA9BC; stroke-width: 1.25; }
      .axis-label { font-size: 15px; fill: #718096; }
      .axis-title { font-size: 16px; font-weight: 600; fill: #52627A; }
      .raw-competitor { fill: none; stroke: #F59E0B; stroke-width: 1.8; opacity: 0.26; }
      .raw-original { fill: none; stroke: #2563EB; stroke-width: 1.8; opacity: 0.24; }
      .smooth-competitor { fill: none; stroke: #E87900; stroke-width: 5; stroke-linecap: round; stroke-linejoin: round; }
      .smooth-original { fill: none; stroke: #1769E0; stroke-width: 5; stroke-linecap: round; stroke-linejoin: round; }
      .competitor-marker { fill: #FFFFFF; stroke: #E87900; stroke-width: 3; }
      .original-marker { fill: #FFFFFF; stroke: #1769E0; stroke-width: 3; }
      .legend { font-size: 16px; font-weight: 600; }
      .note { font-size: 14px; fill: #7B879C; }
    </style>
  </defs>

  <rect width="${width}" height="${height}" fill="#F3F6FA"/>
  <text x="${plot.left}" y="58" class="title">Block Out 难度曲线对比（Lv1–100）</text>
  <text x="${plot.left}" y="91" class="subtitle">统一采用 Block Out 四维难度评分（0–100）；粗线为五关滑动平均</text>

  <g transform="translate(${plot.left}, 112)">
    <rect width="216" height="50" rx="12" fill="#FFF7E8"/>
    <circle cx="22" cy="25" r="7" fill="#E87900"/>
    <text x="40" y="21" class="metric-label">竞品平均难度</text>
    <text x="177" y="33" text-anchor="end" class="metric-value" fill="#C96800">${competitorAverage.toFixed(1)}</text>
  </g>
  <g transform="translate(${plot.left + 232}, 112)">
    <rect width="216" height="50" rx="12" fill="#EAF2FF"/>
    <circle cx="22" cy="25" r="7" fill="#1769E0"/>
    <text x="40" y="21" class="metric-label">本项目平均难度</text>
    <text x="177" y="33" text-anchor="end" class="metric-value" fill="#1769E0">${originalAverage.toFixed(1)}</text>
  </g>
  <g transform="translate(${plot.left + 464}, 112)">
    <rect width="270" height="50" rx="12" fill="#EEF2F7"/>
    <text x="20" y="21" class="metric-label">曲线显示</text>
    <text x="20" y="41" class="note">细线＝逐关值　粗线＝整体趋势</text>
  </g>

  <rect x="${plot.left}" y="${plot.top}" width="${plotWidth}" height="${plotHeight}" rx="14"
    fill="#FFFFFF" filter="url(#shadow)"/>
  ${chapterLabels}

  <g clip-path="url(#plot-clip)">
    ${chapterBands}
    ${yGrid}
    ${chapterDividers}
    <path d="${competitorPath}" class="raw-competitor"/>
    <path d="${originalPath}" class="raw-original"/>
    <path d="${competitorSmoothPath}" class="smooth-competitor"/>
    <path d="${originalSmoothPath}" class="smooth-original"/>
    ${smoothMarkers}
  </g>

  <line x1="${plot.left}" y1="${plotBottom}" x2="${width - plot.right}" y2="${plotBottom}" class="axis"/>
  <line x1="${plot.left}" y1="${plot.top}" x2="${plot.left}" y2="${plotBottom}" class="axis"/>
  ${yLabels}
  ${xTicks}

  <text x="35" y="${plot.top + plotHeight / 2}" text-anchor="middle" class="axis-title"
    transform="rotate(-90 35 ${plot.top + plotHeight / 2})">难度分</text>
  <text x="${plot.left + plotWidth / 2}" y="${height - 30}" text-anchor="middle" class="axis-title">关卡编号</text>

  <g transform="translate(${width - 505}, 132)">
    <line x1="0" y1="0" x2="38" y2="0" class="smooth-competitor"/>
    <text x="52" y="6" class="legend">竞品新版 Lv1–100</text>
    <line x1="245" y1="0" x2="283" y2="0" class="smooth-original"/>
    <text x="297" y="6" class="legend">本项目原创 Lv1–100</text>
  </g>
</svg>`;

fs.writeFileSync(svgPath, svg, "utf8");

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

console.log(JSON.stringify({ svgPath, pngPath: pngWritten ? pngPath : null }, null, 2));
