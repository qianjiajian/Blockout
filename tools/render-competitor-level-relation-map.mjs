import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const inputPath = path.join(
  projectRoot,
  'deliverables',
  'competitor-level-relations',
  'blockout-lv001-lv100-shape-block-mechanism-relations.json',
);
const outputPath = path.join(
  projectRoot,
  'deliverables',
  'competitor-level-relations',
  'blockout-lv001-lv100-shape-block-mechanism-relation-map.png',
);

const dataset = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const levels = dataset.levels;

const width = 1800;
const height = 1180;
const plotLeft = 130;
const plotRight = 1730;
const plotWidth = plotRight - plotLeft;
const chartTop = 160;
const chartBottom = 560;
const chartHeight = chartBottom - chartTop;
const maxLoad = Math.max(60, ...levels.map((level) => level.colored_blocks.known_piece_load_lower_bound));
const matrixTop = 735;
const rowHeight = 36;
const cellWidth = plotWidth / 100;

const mechanismRows = [
  ['numbered_edge_gate', '数字边栏'],
  ['numbered_ice_block', '数字冰块'],
  ['nested_shell_block', '嵌套色块'],
  ['countdown_cover', '遮挡仓'],
  ['side_generator', '生成器'],
  ['arrow_block', '箭头色块'],
  ['pattern_block', '图案色块'],
  ['ice_frame', '冰框'],
  ['key_lock', '钥匙与锁'],
];
const colors = {
  opening: '#2563eb',
  knownLoad: '#f97316',
  full: '#86efac',
  irregular: '#60a5fa',
  split: '#c084fc',
  mechanism: '#334155',
  mechanismLight: '#cbd5e1',
  cover: '#a855f7',
};

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function xForLevel(levelNumber) {
  return plotLeft + (levelNumber - 0.5) * cellWidth;
}

function yForLoad(value) {
  return chartBottom - (value / maxLoad) * chartHeight;
}

function polyline(values, color, dash = '') {
  const points = values
    .map(({ level, value }) => `${xForLevel(level)},${yForLoad(value)}`)
    .join(' ');
  return `<polyline points="${points}" fill="none" stroke="${color}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
}

const svg = [];
svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`);
svg.push('<rect width="100%" height="100%" fill="#f8fafc"/>');
svg.push('<style>text{font-family:"Microsoft YaHei","Noto Sans CJK SC",sans-serif;fill:#0f172a}.small{font-size:18px}.axis{font-size:17px;fill:#475569}.label{font-size:20px;font-weight:600}.title{font-size:36px;font-weight:700}.subtitle{font-size:20px;fill:#475569}</style>');
svg.push('<text x="70" y="64" class="title">Block Out! Lv1–100：棋盘造型 × 色块数量 × 机制关系图</text>');
svg.push('<text x="70" y="102" class="subtitle">蓝线=开局可见普通色块下限；橙线=已知负载下限（再加数字锁定块与已确认生成队列，不含遮挡仓后不可见内容）</text>');

for (let value = 0; value <= maxLoad; value += 10) {
  const y = yForLoad(value);
  svg.push(`<line x1="${plotLeft}" x2="${plotRight}" y1="${y}" y2="${y}" stroke="#e2e8f0" stroke-width="1"/>`);
  svg.push(`<text x="${plotLeft - 22}" y="${y + 6}" text-anchor="end" class="axis">${value}</text>`);
}
for (let level = 10; level <= 100; level += 10) {
  const x = xForLevel(level);
  svg.push(`<line x1="${x}" x2="${x}" y1="${chartTop}" y2="${matrixTop + rowHeight * (mechanismRows.length + 1)}" stroke="#e2e8f0" stroke-width="1"/>`);
  svg.push(`<text x="${x}" y="${chartBottom + 34}" text-anchor="middle" class="axis">${level}</text>`);
}

svg.push(polyline(levels.map((level) => ({
  level: level.level_number,
  value: level.colored_blocks.known_piece_load_lower_bound,
})), colors.knownLoad, '9 7'));
svg.push(polyline(levels.map((level) => ({
  level: level.level_number,
  value: level.colored_blocks.opening_visible_min_count,
})), colors.opening));

for (const level of levels) {
  const x = xForLevel(level.level_number);
  const y = yForLoad(level.colored_blocks.opening_visible_min_count);
  const isUnclear = level.colored_blocks.opening_draggable_count === 'unclear';
  svg.push(`<circle cx="${x}" cy="${y}" r="${isUnclear ? 5 : 3.5}" fill="${isUnclear ? '#fff' : colors.opening}" stroke="${colors.opening}" stroke-width="${isUnclear ? 2.5 : 0}"/>`);
}

const callouts = [
  { levelNumber: 35, label: '2开局 + 16队列' },
  { levelNumber: 43, label: '6开局 + 48队列' },
  { levelNumber: 60, label: '35个图案块' },
  { levelNumber: 70, label: '1开局 + 17队列' },
  { levelNumber: 80, label: '钥匙锁首现' },
  { levelNumber: 100, label: '12块 + 图案机制', labelOffsetX: -115 },
];
for (const { levelNumber, label, labelOffsetX = 0 } of callouts) {
  const level = levels[levelNumber - 1];
  const x = xForLevel(levelNumber);
  const labelX = x + labelOffsetX;
  const targetY = yForLoad(level.colored_blocks.known_piece_load_lower_bound);
  const labelY = Math.max(chartTop + 20, targetY - 42 - (levelNumber % 2) * 22);
  svg.push(`<line x1="${x}" x2="${labelX}" y1="${targetY - 4}" y2="${labelY + 7}" stroke="#64748b" stroke-width="1.5"/>`);
  svg.push(`<text x="${labelX}" y="${labelY}" text-anchor="middle" class="small">Lv${levelNumber} ${escapeXml(label)}</text>`);
}

svg.push(`<line x1="85" x2="125" y1="630" y2="630" stroke="${colors.opening}" stroke-width="5"/><text x="140" y="637" class="small">开局可见色块下限</text>`);
svg.push(`<line x1="405" x2="445" y1="630" y2="630" stroke="${colors.knownLoad}" stroke-width="5" stroke-dasharray="9 7"/><text x="460" y="637" class="small">已知负载下限</text>`);
svg.push(`<circle cx="735" cy="630" r="6" fill="#fff" stroke="${colors.opening}" stroke-width="2.5"/><text x="750" y="637" class="small">开局总数因遮挡为 unclear</text>`);
svg.push('<text x="70" y="700" class="label">逐关结构与机制矩阵</text>');

const shapeY = matrixTop;
svg.push(`<text x="${plotLeft - 18}" y="${shapeY + 24}" text-anchor="end" class="axis">棋盘</text>`);
for (const level of levels) {
  const fill = level.board.geometry_group === '完整矩形'
    ? colors.full
    : level.board.geometry_group === '多分区'
      ? colors.split
      : colors.irregular;
  svg.push(`<rect x="${plotLeft + (level.level_number - 1) * cellWidth}" y="${shapeY + 4}" width="${cellWidth - 1}" height="${rowHeight - 8}" rx="2" fill="${fill}"/>`);
}

for (let rowIndex = 0; rowIndex < mechanismRows.length; rowIndex += 1) {
  const [type, label] = mechanismRows[rowIndex];
  const y = matrixTop + (rowIndex + 1) * rowHeight;
  svg.push(`<text x="${plotLeft - 18}" y="${y + 24}" text-anchor="end" class="axis">${label}</text>`);
  for (const level of levels) {
    const mechanism = level.mechanisms.find((item) => item.type === type);
    const x = plotLeft + (level.level_number - 1) * cellWidth;
    const fill = mechanism
      ? (type === 'countdown_cover' ? colors.cover : colors.mechanism)
      : colors.mechanismLight;
    const opacity = mechanism ? Math.min(1, 0.55 + mechanism.visible_count * 0.07) : 0.2;
    svg.push(`<rect x="${x}" y="${y + 4}" width="${cellWidth - 1}" height="${rowHeight - 8}" rx="2" fill="${fill}" opacity="${opacity}"/>`);
  }
}

const legendY = 1140;
svg.push(`<rect x="90" y="${legendY - 18}" width="26" height="20" rx="3" fill="${colors.full}"/><text x="125" y="${legendY}" class="small">完整矩形</text>`);
svg.push(`<rect x="280" y="${legendY - 18}" width="26" height="20" rx="3" fill="${colors.irregular}"/><text x="315" y="${legendY}" class="small">单区异形</text>`);
svg.push(`<rect x="470" y="${legendY - 18}" width="26" height="20" rx="3" fill="${colors.split}"/><text x="505" y="${legendY}" class="small">多分区</text>`);
svg.push(`<rect x="660" y="${legendY - 18}" width="26" height="20" rx="3" fill="${colors.mechanism}"/><text x="695" y="${legendY}" class="small">机制可见（颜色越深=实例越多）</text>`);
svg.push(`<rect x="1035" y="${legendY - 18}" width="26" height="20" rx="3" fill="${colors.cover}"/><text x="1070" y="${legendY}" class="small">遮挡仓：开局色块总数不可见</text>`);
svg.push('</svg>');

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.setContent(`<html><body style="margin:0;background:#f8fafc">${svg.join('')}</body></html>`);
  await page.screenshot({ path: outputPath, fullPage: true });
} finally {
  await browser.close();
}

console.log(outputPath);
