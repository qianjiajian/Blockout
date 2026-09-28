import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'deliverables/campaign121-130-v146-20260924/agent121-124');
fs.mkdirSync(OUT, { recursive: true });

const truthPath = path.join(ROOT, 'deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-truth-v1.json');
const truth = JSON.parse(fs.readFileSync(truthPath, 'utf8'));
const source = (truth.records ?? truth.levels).find((r) => Number(r.level ?? r.id) === 124);
if (!source) throw new Error('source record 124 missing');

// Deterministic source-shaped q0 reconstruction. Shapes and mechanism counts are
// copied from the reviewed video facts; anchors are authored here because the
// source record deliberately leaves anchor coordinates unresolved.
const shapes = [
  ...Array.from({ length: 11 }, () => [[0, 0]]),
  ...Array.from({ length: 3 }, () => [[0, 0], [1, 0]]),
  ...Array.from({ length: 2 }, () => [[0, 0], [0, 1]]),
  [[0, 0], [0, 1], [0, 2]],
  ...Array.from({ length: 4 }, () => [[0, 0], [1, 0], [0, 1]]),
  [[0, 0], [0, 1], [1, 1], [1, 2]],
  [[0, 0], [1, 0], [2, 0], [1, 1]],
];
const colors = ['red', 'green', 'blue', 'yellow', 'orange', 'purple', 'cyan'];
const occupied = new Set();
const blocks = [];
const fits = (shape, x, y) => shape.every(([dx, dy]) => {
  const xx = x + dx; const yy = y + dy;
  return xx >= 0 && xx < 7 && yy >= 0 && yy < 7 && !occupied.has(`${xx},${yy}`);
});
// Place larger source shapes first; this deterministic packing leaves only the
// five cells that the reviewed 23-piece histogram does not account for.
const order = shapes.map((shape, i) => ({ shape, i })).sort((a, b) => b.shape.length - a.shape.length || a.i - b.i);
for (const { shape, i } of order) {
  let placed = false;
  for (let y = 0; y < 7 && !placed; y++) for (let x = 0; x < 7 && !placed; x++) {
    if (!fits(shape, x, y)) continue;
    for (const [dx, dy] of shape) occupied.add(`${x + dx},${y + dy}`);
    blocks.push({ id: `v166-124-b${String(i + 1).padStart(2, '0')}`, x, y, shape, color: colors[i % colors.length] });
    placed = true;
  }
  if (!placed) throw new Error(`cannot place source shape ${i}`);
}
blocks.sort((a, b) => a.id.localeCompare(b.id));

const gates = [
  { id: 'frozen-top-18', side: 'top', offset: 0, size: 3, color: null, frozen: 18 },
  { id: 'frozen-top-14', side: 'top', offset: 4, size: 3, color: null, frozen: 14 },
  { id: 'frozen-left-24', side: 'left', offset: 2, size: 3, color: null, frozen: 24 },
  { id: 'frozen-right-12', side: 'right', offset: 3, size: 3, color: null, frozen: 12 },
  { id: 'green', side: 'right', offset: 0, size: 3, color: 'green' },
  { id: 'yellow', side: 'bottom', offset: 2, size: 3, color: 'yellow' },
];
const level = {
  id: 124,
  name: '源重建 Lv124',
  mechanismRules: 'revised-2026-09-23-v1.4',
  width: 7,
  height: 7,
  playable: Array.from({ length: 7 }, (_, y) => Array.from({ length: 7 }, (_, x) => [x, y])).flat(),
  blocked: [], seams: [], gates, blocks,
  shutters: [], generators: [], elevators: [], conveyors: [], flipDoors: [], coloredGrids: [],
  timeSeconds: 95, reward: 200, parMoves: 47,
  sourceMechanisms: {
    numericIce: [{ value: 5, shape: 'vertical' }, { value: 7, shape: 'L-like/large' }],
    shells: [
      { layers: ['green', 'blue'] }, { layers: ['orange', 'blue'] }, { layers: ['red', 'blue'] },
    ],
    bomb: { value: 60, shape: 'square-like' },
  },
};
const empty = 49 - occupied.size;
const candidate = {
  candidateVersion: 'campaign-v145-agent121-124-v166',
  ruleVersion: '1.66.0',
  generatedAt: new Date().toISOString(),
  level,
  source: {
    truthPath: path.relative(ROOT, truthPath).replaceAll('\\', '/'),
    evidenceSha256: source.provenance.evidence_sha256,
    openingFrame: source.provenance.opening_frame,
    sourceShapeHistogram: source.composition.opening_shape_histogram,
    sourceMechanisms: source.mechanisms,
  },
  q0Audit: {
    nativeShapeRotationViolations: 0,
    placedCellCount: occupied.size,
    playableCellCount: 49,
    uncoveredCells: empty,
    openingCoverage: empty === 0 ? 'PASS' : 'FAIL_NEEDS_COVERAGE_REVIEW',
  },
  route: { status: 'NOT_RUN', lowerBound: null, upperBound: null, pointer: 'NOT_RUN', naturalClock: 'NOT_RUN' },
  status: 'GENERATED_CANDIDATE_NEEDS_ROUTE_AND_COVERAGE_REVIEW',
};
const out = path.join(OUT, 'candidate124-v166.json');
fs.writeFileSync(out, JSON.stringify(candidate, null, 2) + '\n');
const report = {
  level: 124,
  ruleVersion: '1.66.0',
  candidate: path.relative(ROOT, out).replaceAll('\\', '/'),
  sourceEvidence: source.provenance.evidence_sha256,
  sourceShapeHistogram: source.composition.opening_shape_histogram,
  sourceMechanismCounts: { ice: 2, shells: 3, bombs: 1, frozen: 4, ordinary: 2 },
  q0Audit: candidate.q0Audit,
  route: candidate.route,
  status: candidate.status,
  blockers: [
    'source anchors are unresolved in truth record',
    `${empty} playable cells are uncovered by the exact 23-piece histogram; opening coverage requires reviewed frame reconciliation`,
    'fresh model route, lower bound, Pointer and natural-clock evidence not run',
  ],
};
fs.writeFileSync(path.join(OUT, 'candidate124-v166-report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
