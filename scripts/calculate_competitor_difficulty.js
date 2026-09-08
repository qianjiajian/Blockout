import fs from 'node:fs';
import path from 'node:path';

const inputPath = 'C:/Users/Administrator/Doubao/chats/2026-09-04/new-chat/blockout-final-100-levels.json';
const outputDir = 'C:/Users/Administrator/Documents/ChatGPT/Block Out!/deliverables/competitor-dataset';
const outputJson = path.join(outputDir, 'blockout-difficulty-score-distribution.json');
const outputCsv = path.join(outputDir, 'blockout-difficulty-score-distribution.csv');

const source = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const levels = [...source.levels].sort((a, b) => a.level_id - b.level_id);

const mechanismWeights = {
  '方向出口': 0,
  '数字边栏': 1.0,
  '数字方块': 1.2,
  '侧边计数装置': 1.4,
  '形状计数装置': 1.5,
  '双向箭头方块': 1.0,
  '图案方块': 0.8,
  '嵌套方块': 1.2,
  '钥匙方块': 1.4,
  '钥匙与锁': 1.8,
  '冰冻效果': 0.8,
  '分离式双面板': 1.4,
  '分离式多面板': 1.6,
  '内嵌区域': 1.2,
  '环形通道': 1.4,
  '阶梯形通道': 1.3,
  '异形通道': 1.3,
  '异形方块': 0.9,
  '中部缺口通道': 1.2,
  '中部通道': 1.0,
  '中部狭窄通道': 1.3,
  '中央通道': 1.0,
  '纵向通道': 1.0,
  'T形通道': 1.3,
};

const weights = {
  solve_time: 0.30,
  coins: 0.10,
  time_pressure: 0.20,
  colors: 0.15,
  number_elements: 0.10,
  mechanisms: 0.15,
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const round = (value, digits = 2) => Number(value.toFixed(digits));
const median = (values) => {
  const a = [...values].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
};

const derived = levels.map((level, index) => {
  const chapter = Math.floor((level.level_id - 1) / 10) + 1;
  const isChapterStart = (level.level_id - 1) % 10 === 0;
  const solveTime = isChapterStart
    ? level.clear_time_s
    : level.clear_time_s - levels[index - 1].clear_time_s;
  return { level, chapter, solveTime };
});

const chapterLimitMedians = {};
for (let chapter = 1; chapter <= 10; chapter += 1) {
  const values = derived
    .filter((x) => x.chapter === chapter && Number.isFinite(x.level.time_limit_sec))
    .map((x) => x.level.time_limit_sec);
  chapterLimitMedians[chapter] = median(values);
}

const maxSolveTime = Math.max(...derived.map((x) => x.solveTime));
const minCoins = Math.min(...levels.map((x) => x.target_coins));
const maxCoins = Math.max(...levels.map((x) => x.target_coins));
const maxNumberElementCount = Math.max(...levels.map((x) => x.number_elements.length));

const perLevel = derived.map(({ level, chapter, solveTime }) => {
  const usedTimeLimit = Number.isFinite(level.time_limit_sec)
    ? level.time_limit_sec
    : chapterLimitMedians[chapter];
  const mechanismRaw = [...new Set(level.mechanism)]
    .reduce((sum, name) => sum + (mechanismWeights[name] ?? 0), 0);
  const components = {
    solve_time: 100 * Math.log1p(solveTime) / Math.log1p(maxSolveTime),
    coins: 100 * (level.target_coins - minCoins) / (maxCoins - minCoins),
    time_pressure: 100 * clamp(solveTime / usedTimeLimit, 0, 1),
    colors: 100 * clamp((level.color_count - 1) / 7, 0, 1),
    number_elements: 100 * Math.log1p(level.number_elements.length) / Math.log1p(maxNumberElementCount),
    mechanisms: 100 * clamp(mechanismRaw / 6, 0, 1),
  };
  const difficultyScore = Object.entries(weights)
    .reduce((sum, [key, weight]) => sum + components[key] * weight, 0);
  return {
    level_id: level.level_id,
    chapter,
    chapter_position: ((level.level_id - 1) % 10) + 1,
    difficulty_tag: level.difficulty_tag,
    solve_time_s: solveTime,
    time_limit_sec_original: level.time_limit_sec,
    time_limit_sec_used: usedTimeLimit,
    time_limit_imputed: !Number.isFinite(level.time_limit_sec),
    target_coins: level.target_coins,
    color_count: level.color_count,
    number_element_count: level.number_elements.length,
    mechanism_raw: round(mechanismRaw),
    components: Object.fromEntries(Object.entries(components).map(([k, v]) => [k, round(v)])),
    D: round(difficultyScore),
  };
});

const bins = [
  { label: '[0,20)', min: 0, max: 20 },
  { label: '[20,40)', min: 20, max: 40 },
  { label: '[40,60)', min: 40, max: 60 },
  { label: '[60,80)', min: 60, max: 80 },
  { label: '[80,100]', min: 80, max: 100.000001 },
].map((bin) => ({
  range: bin.label,
  count: perLevel.filter((x) => x.D >= bin.min && x.D < bin.max).length,
  levels: perLevel.filter((x) => x.D >= bin.min && x.D < bin.max).map((x) => x.level_id),
}));

const chapterSummary = Array.from({ length: 10 }, (_, i) => i + 1).map((chapter) => {
  const rows = perLevel.filter((x) => x.chapter === chapter);
  const values = rows.map((x) => x.D);
  return {
    chapter,
    levels: `${rows[0].level_id}-${rows[rows.length - 1].level_id}`,
    min_D: round(Math.min(...values)),
    mean_D: round(values.reduce((a, b) => a + b, 0) / values.length),
    median_D: round(median(values)),
    max_D: round(Math.max(...values)),
  };
});

const result = {
  source: inputPath,
  formula_version: 'D-v1.0',
  formula: 'D = 0.30E + 0.10G + 0.20P + 0.15C + 0.10N + 0.15M',
  weights,
  definitions: {
    per_level_solve_time: '章首：t_i=clear_time_s_i；同章其余关：t_i=clear_time_s_i-clear_time_s_(i-1)。每10关为一章。',
    E: `100*ln(1+t_i)/ln(1+${maxSolveTime})`,
    G: `100*(target_coins-${minCoins})/(${maxCoins}-${minCoins})`,
    P: '100*clip(t_i/time_limit_sec_used,0,1)',
    C: '100*clip((color_count-1)/7,0,1)',
    N: `100*ln(1+number_element_count)/ln(1+${maxNumberElementCount})`,
    M: '100*clip(sum(unique mechanism weights)/6,0,1)',
    missing_time_limit: '用同章非空 time_limit_sec 的中位数填补，仅用于计算 P；保留原始空值和 imputed 标记。',
  },
  constants: {
    max_solve_time_s: maxSolveTime,
    min_target_coins: minCoins,
    max_target_coins: maxCoins,
    max_number_element_count: maxNumberElementCount,
    chapter_time_limit_medians: chapterLimitMedians,
    mechanism_weights: mechanismWeights,
  },
  distribution_bins: bins,
  chapter_summary: chapterSummary,
  per_level: perLevel,
};

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputJson, `${JSON.stringify(result, null, 2)}\n`, 'utf8');

const csvHeader = [
  'level_id', 'chapter', 'chapter_position', 'difficulty_tag', 'solve_time_s',
  'time_limit_sec_original', 'time_limit_sec_used', 'time_limit_imputed',
  'target_coins', 'color_count', 'number_element_count', 'mechanism_raw',
  'E', 'G', 'P', 'C', 'N', 'M', 'D',
];
const csvRows = perLevel.map((x) => [
  x.level_id, x.chapter, x.chapter_position, x.difficulty_tag, x.solve_time_s,
  x.time_limit_sec_original ?? '', x.time_limit_sec_used, x.time_limit_imputed,
  x.target_coins, x.color_count, x.number_element_count, x.mechanism_raw,
  x.components.solve_time, x.components.coins, x.components.time_pressure,
  x.components.colors, x.components.number_elements, x.components.mechanisms, x.D,
]);
fs.writeFileSync(outputCsv, `${[csvHeader, ...csvRows].map((row) => row.join(',')).join('\n')}\n`, 'utf8');

console.log(JSON.stringify({
  outputJson,
  outputCsv,
  levelCount: perLevel.length,
  maxSolveTime,
  minCoins,
  maxCoins,
  maxNumberElementCount,
  chapterLimitMedians,
  bins,
  chapterSummary,
}, null, 2));
