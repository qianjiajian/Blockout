import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = path.join(root, 'deliverables/competitor-dataset/blockout-lv001-lv100.json');
const v1Path = path.join(root, 'deliverables/competitor-dataset/blockout-difficulty-score-distribution.json');
const outputDir = path.join(root, 'deliverables/competitor-dataset');
const outputJson = path.join(outputDir, 'blockout-difficulty-score-v2.json');
const outputCsv = path.join(outputDir, 'blockout-difficulty-score-v1-v2.csv');

const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const v1 = JSON.parse(fs.readFileSync(v1Path, 'utf8'));
const numericLevelId = (value) => Number(String(value).replace(/^Level\s+/i, ''));
const sourceById = new Map(source.map((x) => [numericLevelId(x.level_id), x]));
const labelIds = new Set(source.filter((x) => x.difficulty_tag !== 'normal').map((x) => numericLevelId(x.level_id)));

const v2Weights = {
  solve_time: 0.18,
  coins: 0.10,
  time_pressure: 0.12,
  colors: 0.10,
  number_elements: 0.30,
  mechanisms: 0.20,
};

const sigmoid = (x) => 1 / (1 + Math.exp(-x));
const numberCenter = 7;
const numberSlope = 1.25;
const maxNumberCount = v1.constants.max_number_element_count;
const numberLow = sigmoid(-numberCenter * numberSlope);
const numberHigh = sigmoid((maxNumberCount - numberCenter) * numberSlope);
const numberComponentV2 = (count) => 100 * (sigmoid((count - numberCenter) * numberSlope) - numberLow) / (numberHigh - numberLow);

const round = (value, digits = 2) => Number(value.toFixed(digits));
const mean = (values) => values.reduce((sum, x) => sum + x, 0) / values.length;
const median = (values) => {
  const a = [...values].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
};

const perLevel = v1.per_level.map((row) => {
  const src = sourceById.get(row.level_id);
  const componentsV2 = {
    solve_time: row.components.solve_time,
    coins: row.components.coins,
    time_pressure: row.components.time_pressure,
    colors: row.components.colors,
    number_elements: numberComponentV2(row.number_element_count),
    mechanisms: row.components.mechanisms,
  };
  const Dv2 = Object.entries(v2Weights).reduce((sum, [key, weight]) => sum + componentsV2[key] * weight, 0);
  return {
    level_id: row.level_id,
    chapter: row.chapter,
    chapter_position: row.chapter_position,
    difficulty_tag: src.difficulty_tag,
    color_count: src.color_count,
    number_element_count: row.number_element_count,
    D_v1: row.D,
    D_v2: round(Dv2),
    delta: round(Dv2 - row.D),
    components_v2: Object.fromEntries(Object.entries(componentsV2).map(([k, v]) => [k, round(v)])),
  };
});

const byId = new Map(perLevel.map((x) => [x.level_id, x]));

function calibration(scoreKey) {
  const labels = perLevel.filter((x) => labelIds.has(x.level_id));
  const details = labels.map((label) => {
    const neighbors = [label.level_id - 1, label.level_id + 1]
      .map((id) => byId.get(id))
      .filter((x) => x && x.chapter === label.chapter && !labelIds.has(x.level_id));
    const adjacentMean = mean(neighbors.map((x) => x[scoreKey]));
    const chapterValues = perLevel.filter((x) => x.chapter === label.chapter).map((x) => x[scoreKey]);
    const chapterMedian = median(chapterValues);
    return {
      level_id: label.level_id,
      difficulty_tag: label.difficulty_tag,
      D: label[scoreKey],
      adjacent_normal_levels: neighbors.map((x) => x.level_id),
      adjacent_normal_mean: round(adjacentMean),
      adjacent_lift: round(label[scoreKey] - adjacentMean),
      chapter_median: round(chapterMedian),
      above_chapter_median: label[scoreKey] > chapterMedian,
    };
  });
  const labelMean = mean(details.map((x) => x.D));
  const adjacentMean = mean(details.map((x) => x.adjacent_normal_mean));
  const normals = perLevel.filter((x) => !labelIds.has(x.level_id));
  const hard = details.filter((x) => x.difficulty_tag === 'hard');
  const superHard = details.filter((x) => x.difficulty_tag === 'super_hard');
  return {
    label_count: details.length,
    label_mean: round(labelMean),
    adjacent_normal_mean: round(adjacentMean),
    label_vs_adjacent_lift: round(labelMean - adjacentMean),
    all_normal_mean: round(mean(normals.map((x) => x[scoreKey]))),
    label_vs_all_normal_lift: round(labelMean - mean(normals.map((x) => x[scoreKey]))),
    above_chapter_median_count: details.filter((x) => x.above_chapter_median).length,
    above_chapter_median_levels: details.filter((x) => x.above_chapter_median).map((x) => x.level_id),
    not_above_chapter_median_levels: details.filter((x) => !x.above_chapter_median).map((x) => x.level_id),
    hard_mean: round(mean(hard.map((x) => x.D))),
    super_hard_mean: round(mean(superHard.map((x) => x.D))),
    details,
  };
}

const chapterSummary = Array.from({ length: 10 }, (_, index) => index + 1).map((chapter) => {
  const rows = perLevel.filter((x) => x.chapter === chapter);
  return {
    chapter,
    levels: `${rows[0].level_id}-${rows.at(-1).level_id}`,
    D_v1_mean: round(mean(rows.map((x) => x.D_v1))),
    D_v2_min: round(Math.min(...rows.map((x) => x.D_v2))),
    D_v2_mean: round(mean(rows.map((x) => x.D_v2))),
    D_v2_median: round(median(rows.map((x) => x.D_v2))),
    D_v2_max: round(Math.max(...rows.map((x) => x.D_v2))),
  };
});

const result = {
  source: sourcePath,
  formula_version: 'D-v2.0',
  formula: 'D_v2 = 0.18E + 0.10G + 0.12P + 0.10C + 0.30N2 + 0.20M',
  notes: [
    'difficulty_tag 仅用于校准验证，不作为公式输入。',
    'E、G、P、C、M 沿用 D-v1 定义。',
    'N2 使用数字元素数量的饱和 S 曲线，突出 7 个以上数字元素带来的结构负担。',
  ],
  old_weights: v1.weights,
  new_weights: v2Weights,
  grouped_weights: {
    D_v1: { time_total: 0.50, coins: 0.10, structure_total: 0.40 },
    D_v2: { time_total: 0.30, coins: 0.10, structure_total: 0.60 },
  },
  N2_definition: {
    sigma: 'sigma(x)=1/(1+exp(-x))',
    formula: `100*(sigma(${numberSlope}*(n-${numberCenter}))-sigma(${-numberCenter * numberSlope}))/(sigma(${numberSlope}*(${maxNumberCount}-${numberCenter}))-sigma(${-numberCenter * numberSlope}))`,
    center: numberCenter,
    slope: numberSlope,
    observed_max_number_element_count: maxNumberCount,
  },
  color_count_audit: [
    { level_id: 35, original: 1, corrected: 1, result: '保持', evidence: '棋盘内仅见蓝色色块；红/黄为出口，紫色为侧边装置。' },
    { level_id: 70, original: 1, corrected: 1, result: '保持', evidence: '棋盘内仅见绿色色块；其余有色区域属于出口、数字边栏或形状计数装置。' },
  ],
  calibration: {
    definition: '每个标签关与同章前后紧邻的普通关均值比较；再对16个标签关取均值。章节中位数按该章10关计算。',
    D_v1: calibration('D_v1'),
    D_v2: calibration('D_v2'),
  },
  chapter_summary: chapterSummary,
  per_level: perLevel,
};

fs.writeFileSync(outputJson, `${JSON.stringify(result, null, 2)}\n`, 'utf8');

const csvHeader = ['level_id', 'chapter', 'chapter_position', 'difficulty_tag', 'color_count', 'number_element_count', 'D_v1', 'D_v2', 'delta'];
const csvRows = perLevel.map((x) => [x.level_id, x.chapter, x.chapter_position, x.difficulty_tag, x.color_count, x.number_element_count, x.D_v1, x.D_v2, x.delta]);
fs.writeFileSync(outputCsv, `${[csvHeader, ...csvRows].map((x) => x.join(',')).join('\n')}\n`, 'utf8');

console.log(JSON.stringify({ outputJson, outputCsv, calibration: result.calibration, chapterSummary }, null, 2));
