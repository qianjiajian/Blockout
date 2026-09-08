import fs from 'node:fs';

const v1 = JSON.parse(fs.readFileSync('C:/Users/Administrator/Documents/ChatGPT/Block Out!/deliverables/competitor-dataset/blockout-difficulty-score-distribution.json', 'utf8'));
const source = JSON.parse(fs.readFileSync('C:/Users/Administrator/Doubao/chats/2026-09-04/new-chat/blockout-final-100-levels.json', 'utf8')).levels;
const sourceById = new Map(source.map((x) => [x.level_id, x]));
const labelIds = new Set(source.filter((x) => x.difficulty_tag !== 'normal').map((x) => x.level_id));
const rows = v1.per_level.map((x) => ({ ...x, source: sourceById.get(x.level_id) }));

const median = (values) => {
  const a = [...values].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
};
const sigmoid = (x) => 1 / (1 + Math.exp(-x));
const scaledSigmoid = (n, center, slope) => {
  const lo = sigmoid(-center * slope);
  const hi = sigmoid((19 - center) * slope);
  return 100 * (sigmoid((n - center) * slope) - lo) / (hi - lo);
};

function evaluate(params) {
  const scored = rows.map((row) => {
    const hasNumericSystem = row.source.mechanism.includes('数字方块') && row.source.mechanism.includes('数字边栏');
    const nonBaseMechanismCount = new Set(row.source.mechanism.filter((x) => x !== '方向出口')).size;
    const numeric = scaledSigmoid(row.number_element_count, params.nCenter, params.nSlope);
    const mechanismRaw = row.mechanism_raw
      + (hasNumericSystem ? params.numericSystemBonus : 0)
      + Math.max(0, nonBaseMechanismCount - 2) * params.stackBonus;
    const mechanismBase = 100 * Math.min(mechanismRaw / params.mCap, 1);
    const mechanism = (1 - params.interaction) * mechanismBase
      + params.interaction * Math.sqrt(mechanismBase * numeric);
    const components = {
      solve_time: row.components.solve_time,
      coins: row.components.coins,
      time_pressure: row.components.time_pressure,
      colors: row.components.colors,
      number_elements: numeric,
      mechanisms: mechanism,
    };
    const D = Object.entries(params.weights).reduce((sum, [key, weight]) => sum + components[key] * weight, 0);
    return { ...row, componentsV2: components, D };
  });
  const byId = new Map(scored.map((x) => [x.level_id, x]));
  const labels = scored.filter((x) => labelIds.has(x.level_id));
  const neighborMeans = labels.map((label) => {
    const neighbors = [label.level_id - 1, label.level_id + 1]
      .map((id) => byId.get(id))
      .filter((x) => x && x.chapter === label.chapter && !labelIds.has(x.level_id));
    return neighbors.reduce((sum, x) => sum + x.D, 0) / neighbors.length;
  });
  const mean = (a) => a.reduce((sum, x) => sum + x, 0) / a.length;
  const labelMean = mean(labels.map((x) => x.D));
  const adjacentMean = mean(neighborMeans);
  const normals = scored.filter((x) => !labelIds.has(x.level_id));
  const aboveChapterMedian = labels.filter((label) => {
    const values = scored.filter((x) => x.chapter === label.chapter).map((x) => x.D);
    return label.D > median(values);
  }).length;
  return {
    params,
    labelMean,
    adjacentMean,
    adjacentLift: labelMean - adjacentMean,
    normalMean: mean(normals.map((x) => x.D)),
    overallLift: labelMean - mean(normals.map((x) => x.D)),
    aboveChapterMedian,
    scored,
  };
}

const candidates = [];
for (const e of [0.15, 0.18, 0.21]) {
  const p = 0.30 - e;
  for (const c of [0.05, 0.10]) {
    for (const n of [0.25, 0.30, 0.35, 0.40]) {
      const m = 0.60 - c - n;
      if (m < 0.15 || m > 0.35) continue;
      for (const nCenter of [7, 8, 9]) {
        for (const nSlope of [0.75, 1.0, 1.25]) {
          for (const numericSystemBonus of [0, 1, 2]) {
            for (const stackBonus of [0, 0.5]) {
              for (const mCap of [4, 5, 6]) {
                for (const interaction of [0, 0.5]) {
                  const params = {
                    weights: { solve_time: e, coins: 0.10, time_pressure: p, colors: c, number_elements: n, mechanisms: m },
                    nCenter, nSlope, numericSystemBonus, stackBonus, mCap, interaction,
                  };
                  const result = evaluate(params);
                  if (result.adjacentLift >= 10 && result.aboveChapterMedian >= 12) {
                    const regularization = Math.abs(e - 0.18) + Math.abs(c - 0.10) + Math.abs(n - 0.30) + Math.abs(m - 0.20)
                      + numericSystemBonus * 0.01 + stackBonus * 0.01 + Math.abs(mCap - 6) * 0.005 + interaction * 0.01
                      + Math.abs(nCenter - 8) * 0.003 + Math.abs(nSlope - 1) * 0.005;
                    const { scored, ...summary } = result;
                    candidates.push({ ...summary, regularization });
                    if (candidates.length > 5000) {
                      candidates.sort((a, b) => a.regularization - b.regularization || b.adjacentLift - a.adjacentLift || b.aboveChapterMedian - a.aboveChapterMedian);
                      candidates.length = 500;
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}

candidates.sort((a, b) => a.regularization - b.regularization || b.adjacentLift - a.adjacentLift || b.aboveChapterMedian - a.aboveChapterMedian);
console.log(JSON.stringify({
  feasibleCount: candidates.length,
  best: candidates.slice(0, 20),
}, null, 2));
