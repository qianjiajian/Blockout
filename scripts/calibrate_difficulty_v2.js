import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const v1Path = path.join(root, 'deliverables/competitor-dataset/blockout-difficulty-score-distribution.json');
const sourcePath = path.join(root, 'deliverables/competitor-dataset/blockout-lv001-lv100.json');
const v1 = JSON.parse(fs.readFileSync(v1Path, 'utf8'));
const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const numericLevelId = (value) => Number(String(value).replace(/^Level\s+/i, ''));
const tagById = new Map(source.map((x) => [numericLevelId(x.level_id), x.difficulty_tag]));
const rows = v1.per_level.map((x) => ({ ...x, difficulty_tag: tagById.get(x.level_id) }));
const labelIds = new Set(rows.filter((x) => x.difficulty_tag !== 'normal').map((x) => x.level_id));

const median = (values) => {
  const a = [...values].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
};

function evaluate(weights) {
  const scored = rows.map((row) => {
    const D = Object.entries(weights).reduce((sum, [key, weight]) => sum + row.components[key] * weight, 0);
    return { ...row, D };
  });
  const byId = new Map(scored.map((x) => [x.level_id, x]));
  const labels = scored.filter((x) => labelIds.has(x.level_id));
  const neighborMeans = labels.map((label) => {
    const candidates = [label.level_id - 1, label.level_id + 1]
      .map((id) => byId.get(id))
      .filter((x) => x && x.chapter === label.chapter && !labelIds.has(x.level_id));
    return candidates.reduce((sum, x) => sum + x.D, 0) / candidates.length;
  });
  const labelMean = labels.reduce((sum, x) => sum + x.D, 0) / labels.length;
  const adjacentMean = neighborMeans.reduce((sum, x) => sum + x, 0) / neighborMeans.length;
  const aboveChapterMedian = labels.filter((label) => {
    const chapterValues = scored.filter((x) => x.chapter === label.chapter).map((x) => x.D);
    return label.D > median(chapterValues);
  }).length;
  const normalMean = scored.filter((x) => !labelIds.has(x.level_id)).reduce((sum, x) => sum + x.D, 0)
    / scored.filter((x) => !labelIds.has(x.level_id)).length;
  return {
    weights,
    labelMean,
    adjacentMean,
    adjacentLift: labelMean - adjacentMean,
    normalMean,
    overallLift: labelMean - normalMean,
    aboveChapterMedian,
  };
}

const preferred = {
  solve_time: 0.18,
  coins: 0.10,
  time_pressure: 0.12,
  colors: 0.10,
  number_elements: 0.20,
  mechanisms: 0.30,
};

const candidates = [];
for (let e = 0.02; e <= 0.28 + 1e-9; e += 0.01) {
  const p = 0.30 - e;
  for (let c = 0.02; c <= 0.25 + 1e-9; c += 0.01) {
    for (let n = 0.10; n <= 0.35 + 1e-9; n += 0.01) {
      const m = 0.60 - c - n;
      if (m < 0.20 - 1e-9 || m > 0.48 + 1e-9) continue;
      const weights = {
        solve_time: Number(e.toFixed(2)),
        coins: 0.10,
        time_pressure: Number(p.toFixed(2)),
        colors: Number(c.toFixed(2)),
        number_elements: Number(n.toFixed(2)),
        mechanisms: Number(m.toFixed(2)),
      };
      const metrics = evaluate(weights);
      const distance = Math.sqrt(Object.keys(preferred)
        .reduce((sum, key) => sum + (weights[key] - preferred[key]) ** 2, 0));
      candidates.push({ ...metrics, distance });
    }
  }
}

const feasible = candidates
  .filter((x) => x.adjacentLift >= 10 && x.aboveChapterMedian >= 12)
  .sort((a, b) => a.distance - b.distance || b.adjacentLift - a.adjacentLift);

const bestMargins = [...candidates]
  .sort((a, b) => b.aboveChapterMedian - a.aboveChapterMedian || b.adjacentLift - a.adjacentLift)
  .slice(0, 20);

console.log(JSON.stringify({
  labelIds: [...labelIds],
  candidateCount: candidates.length,
  feasibleCount: feasible.length,
  closestFeasible: feasible.slice(0, 20),
  bestMargins,
  v1Metrics: evaluate(v1.weights),
}, null, 2));
