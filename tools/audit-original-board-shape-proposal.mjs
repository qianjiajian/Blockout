import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const proposalPath = path.join(
  projectRoot,
  'deliverables',
  'original-board-shape-proposal',
  'blockout-original-lv001-lv100-board-shape-proposal.json',
);
const competitorPath = path.join(
  projectRoot,
  'deliverables',
  'competitor-board-shapes',
  'blockout-lv001-lv100-board-shapes.json',
);
const outputPath = path.join(
  projectRoot,
  'deliverables',
  'original-board-shape-proposal',
  'blockout-original-lv001-lv100-board-shape-validation.json',
);

function toMatrix(rows) {
  return rows.map((row) => [...row].map((cell) => cell === '#'));
}

function toRows(matrix) {
  return matrix.map((row) => row.map((cell) => cell ? '#' : '.').join(''));
}

function trim(matrix) {
  const active = [];
  for (let y = 0; y < matrix.length; y += 1) {
    for (let x = 0; x < matrix[0].length; x += 1) if (matrix[y][x]) active.push([x, y]);
  }
  if (!active.length) return [[]];
  const minX = Math.min(...active.map(([x]) => x));
  const maxX = Math.max(...active.map(([x]) => x));
  const minY = Math.min(...active.map(([, y]) => y));
  const maxY = Math.max(...active.map(([, y]) => y));
  return matrix.slice(minY, maxY + 1).map((row) => row.slice(minX, maxX + 1));
}

function rotate(matrix) {
  const height = matrix.length;
  const width = matrix[0].length;
  return Array.from({ length: width }, (_, y) => (
    Array.from({ length: height }, (_, x) => matrix[height - 1 - x][y])
  ));
}

function mirror(matrix) {
  return matrix.map((row) => [...row].reverse());
}

function transforms(rows) {
  const result = [];
  let current = trim(toMatrix(rows));
  for (let index = 0; index < 4; index += 1) {
    result.push(trim(current));
    result.push(trim(mirror(current)));
    current = rotate(current);
  }
  const unique = new Map(result.map((matrix) => [`${matrix[0].length}x${matrix.length}:${toRows(matrix).join('/')}`, matrix]));
  return [...unique.values()];
}

function canonical(rows) {
  return transforms(rows)
    .map((matrix) => `${matrix[0].length}x${matrix.length}:${toRows(matrix).join('/')}`)
    .toSorted()[0];
}

function scale(matrix, target = 32) {
  const source = trim(matrix);
  const height = source.length;
  const width = source[0].length;
  return Array.from({ length: target }, (_, y) => (
    Array.from({ length: target }, (_, x) => source[Math.min(height - 1, Math.floor(y * height / target))][Math.min(width - 1, Math.floor(x * width / target))])
  ));
}

function iou(left, right) {
  if (left.length !== right.length || left[0].length !== right[0].length) return null;
  let intersection = 0;
  let union = 0;
  for (let y = 0; y < left.length; y += 1) {
    for (let x = 0; x < left[0].length; x += 1) {
      if (left[y][x] && right[y][x]) intersection += 1;
      if (left[y][x] || right[y][x]) union += 1;
    }
  }
  return union ? intersection / union : 1;
}

function bestRawD4Iou(leftRows, rightRows) {
  const left = trim(toMatrix(leftRows));
  return Math.max(-1, ...transforms(rightRows)
    .map((right) => iou(left, right))
    .filter(Number.isFinite));
}

function bestScaledD4Iou(leftRows, rightRows) {
  const left = scale(toMatrix(leftRows));
  return Math.max(...transforms(rightRows).map((right) => iou(left, scale(right))));
}

function connectedComponents(rows) {
  const matrix = toMatrix(rows);
  const height = matrix.length;
  const width = matrix[0].length;
  const remaining = new Set();
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) if (matrix[y][x]) remaining.add(`${x},${y}`);
  }
  const components = [];
  const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  while (remaining.size) {
    const first = remaining.values().next().value;
    remaining.delete(first);
    const queue = [first];
    const cells = [];
    for (let index = 0; index < queue.length; index += 1) {
      const current = queue[index];
      cells.push(current);
      const [x, y] = current.split(',').map(Number);
      for (const [dx, dy] of directions) {
        const neighbor = `${x + dx},${y + dy}`;
        if (!remaining.has(neighbor)) continue;
        remaining.delete(neighbor);
        queue.push(neighbor);
      }
    }
    components.push(cells);
  }
  return components;
}

function maxBoundaryRun(component, width, height) {
  const cells = new Set(component);
  const lines = [
    Array.from({ length: width }, (_, x) => `${x},0`),
    Array.from({ length: width }, (_, x) => `${x},${height - 1}`),
    Array.from({ length: height }, (_, y) => `0,${y}`),
    Array.from({ length: height }, (_, y) => `${width - 1},${y}`),
  ];
  let best = 0;
  for (const line of lines) {
    let run = 0;
    for (const cell of line) {
      if (cells.has(cell)) {
        run += 1;
        best = Math.max(best, run);
      } else run = 0;
    }
  }
  return best;
}

const proposal = JSON.parse(fs.readFileSync(proposalPath, 'utf8'));
const competitor = JSON.parse(fs.readFileSync(competitorPath, 'utf8'));
const competitorLevels = competitor.levels
  .filter((level) => Array.isArray(level.playable_mask) && !level.playable_mask.some((row) => row.includes('?')))
  .map((level) => ({
    levelNumber: Number(level.level_id.match(/\d+/u)?.[0]),
    family: level.shape_family,
    rows: level.playable_mask,
    canonical: canonical(level.playable_mask),
  }));

const hardIssues = [];
const warnings = [];
const proposalCanonicals = new Map();
const nonRegularProposalCanonicals = new Map();
const comparisons = [];
for (const level of proposal.levels) {
  const rows = level.board.playable_mask;
  const canonicalMask = canonical(rows);
  const nonRegular = level.shape.family_group !== '规整盘面';
  if (nonRegular && nonRegularProposalCanonicals.has(canonicalMask)) {
    hardIssues.push({
      type: 'self_d4_exact_duplicate',
      levels: [nonRegularProposalCanonicals.get(canonicalMask), level.level_number],
    });
  } else if (nonRegular) nonRegularProposalCanonicals.set(canonicalMask, level.level_number);
  if (!proposalCanonicals.has(canonicalMask)) proposalCanonicals.set(canonicalMask, level.level_number);

  const rivals = competitorLevels.filter((candidate) => candidate.family !== '完整矩形');
  let closest = null;
  for (const candidate of rivals) {
    const rawIou = bestRawD4Iou(rows, candidate.rows);
    const scaledIou = bestScaledD4Iou(rows, candidate.rows);
    const score = Math.max(rawIou, scaledIou);
    if (!closest || score > closest.score) closest = {
      level: candidate.levelNumber,
      family: candidate.family,
      raw_d4_iou: rawIou < 0 ? null : Number(rawIou.toFixed(4)),
      scaled_d4_iou: Number(scaledIou.toFixed(4)),
      score,
      exact_d4: canonicalMask === candidate.canonical,
    };
  }
  if (nonRegular && closest?.exact_d4) hardIssues.push({ type: 'competitor_d4_exact_match', level: level.level_number, competitor_level: closest.level });
  if (nonRegular && closest?.raw_d4_iou !== null && closest.raw_d4_iou >= (level.board.playable_cell_count <= 40 ? 0.8 : 0.85)) {
    warnings.push({ type: 'competitor_raw_iou_high', level: level.level_number, competitor_level: closest.level, value: closest.raw_d4_iou });
  }
  if (nonRegular && closest?.scaled_d4_iou >= 0.92) {
    warnings.push({ type: 'competitor_scaled_iou_high', level: level.level_number, competitor_level: closest.level, value: closest.scaled_d4_iou });
  }

  const components = connectedComponents(rows);
  const boundaryRuns = components.map((component) => maxBoundaryRun(component, level.board.cols, level.board.rows));
  if (level.shape.family_group === '多分区' && boundaryRuns.some((run) => run < 2)) {
    hardIssues.push({ type: 'component_without_two_cell_boundary_run', level: level.level_number, boundary_runs: boundaryRuns });
  }
  comparisons.push({
    level: level.level_number,
    canonical_d4: canonicalMask,
    closest_non_rectangular_competitor: closest ? {
      level: closest.level,
      family: closest.family,
      raw_d4_iou: closest.raw_d4_iou,
      scaled_d4_iou: closest.scaled_d4_iou,
      exact_d4: closest.exact_d4,
    } : null,
    component_boundary_runs: boundaryRuns,
  });
}

const selfNearPairs = [];
for (let leftIndex = 0; leftIndex < proposal.levels.length; leftIndex += 1) {
  const left = proposal.levels[leftIndex];
  if (left.shape.family_group === '规整盘面') continue;
  for (let rightIndex = leftIndex + 1; rightIndex < proposal.levels.length; rightIndex += 1) {
    const right = proposal.levels[rightIndex];
    if (right.shape.family !== left.shape.family) continue;
    const scaledIou = bestScaledD4Iou(left.board.playable_mask, right.board.playable_mask);
    if (scaledIou >= 0.9) selfNearPairs.push({
      levels: [left.level_number, right.level_number],
      family: left.shape.family,
      scaled_d4_iou: Number(scaledIou.toFixed(4)),
    });
  }
}
selfNearPairs.sort((left, right) => right.scaled_d4_iou - left.scaled_d4_iou);

const result = {
  dataset: 'Block Out 原创棋盘造型确认稿原创性审计',
  proposal: path.relative(projectRoot, proposalPath).replaceAll('\\', '/'),
  competitor: path.relative(projectRoot, competitorPath).replaceAll('\\', '/'),
  rules: {
    exact_d4_duplicate: 'hard fail',
    competitor_raw_d4_iou: '<0.85；≤40格时<0.80（完整/近矩形豁免）',
    competitor_scaled_d4_iou: '<0.92（完整/近矩形豁免）',
    self_same_family_scaled_d4_iou: '<0.90 recommended',
    multi_section_boundary_run: '每区至少触达外框连续2格',
  },
  summary: {
    proposal_levels: proposal.levels.length,
    competitor_clear_masks_compared: competitorLevels.length,
    unique_d4_canonical_masks: proposalCanonicals.size,
    unique_non_regular_d4_canonical_masks: nonRegularProposalCanonicals.size,
    hard_issue_count: hardIssues.length,
    warning_count: warnings.length,
    self_near_pair_count: selfNearPairs.length,
  },
  hard_issues: hardIssues,
  warnings,
  self_near_pairs: selfNearPairs,
  levels: comparisons,
};

fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ outputPath, summary: result.summary, hardIssues, warnings: warnings.slice(0, 30), selfNearPairs: selfNearPairs.slice(0, 30) }, null, 2));
if (hardIssues.length) process.exitCode = 1;
