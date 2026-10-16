import fs from 'node:fs';
import crypto from 'node:crypto';

const outDir = 'deliverables/league-regeneration-20261004/formal';
const digest = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const isFilledRectangle = shape => {
  const keys = new Set(shape.map(cell => `${cell[0]},${cell[1]}`));
  const xs = shape.map(cell => cell[0]);
  const ys = shape.map(cell => cell[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  return shape.length > 0 && keys.size === shape.length && shape.length === (maxX - minX + 1) * (maxY - minY + 1) && [...Array(maxY - minY + 1)].every((_, y) => [...Array(maxX - minX + 1)].every((__, x) => keys.has(`${x + minX},${y + minY}`)));
};
const source71 = 'deliverables/remake71-80-v146-20260924/floor-review/71-author/candidate71-final-1790265617853.json';
const verification71 = 'deliverables/remake71-80-v146-20260924/formal71-verification-1790266507645.json';
const source81 = 'deliverables/remake81-90-v146-20260924/root81/candidate-mutation-2277-1790266176054.json';
const verification81 = 'deliverables/remake81-90-v146-20260924/formal-verification-1790267953298.json';

const raw71 = JSON.parse(fs.readFileSync(source71, 'utf8'));
const level71 = structuredClone(raw71.level);
level71.id = 900071;
level71.name = '荣耀联赛·71·分层调度';
level71.difficulty = 'hard';
level71.mechanismRules = 'revised-2026-09-27-v1.5';
level71.timeSeconds = 180;
level71.reward = 0;
const specials71 = ['r147-71-o3', 'r147-71-o6', 'r147-71-o14'];
const blockIds71 = new Set(level71.blocks.map(block => block.id));
if (specials71.some(id => !blockIds71.has(id))) throw new Error('level 71 special inventory mismatch');
if (specials71.some(id => !isFilledRectangle(level71.blocks.find(block => block.id === id).shape))) throw new Error('level 71 special must be a filled rectangle');
const entry71 = { index: 71, level: level71, specials: specials71, levelSha256: digest(level71), gameplayKey: digest({ level: level71, specials: specials71 }), packing: 0 };
fs.writeFileSync(`${outDir}/leagueCandidate-071.json`, JSON.stringify(entry71, null, 2) + '\n');

const entry81Path = `${outDir}/leagueCandidate-081.json`;
if (!fs.existsSync(entry81Path)) throw new Error(`missing ${entry81Path}; export candidate 81 before rebuilding report`);
const entry81 = JSON.parse(fs.readFileSync(entry81Path, 'utf8'));
if (entry81.specials.join(',') !== 'r147-81-6-1,r147-81-5-0,r147-81-5-1') throw new Error('level 81 special selection is stale');
if (entry81.specials.some(id => !isFilledRectangle(entry81.level.blocks.find(block => block.id === id).shape))) throw new Error('level 81 special must be a filled rectangle');

const old = JSON.parse(fs.readFileSync('deliverables/league-regeneration-20261004/late-experiments/late-summary.json', 'utf8'));
const blocked = old.rows.filter(row => ![71, 81].includes(row.index)).map(row => ({
  index: row.index,
  status: 'BLOCKED',
  difficulty: ((row.index - 1) % 5 === 2 ? 'super' : 'hard'),
  attempted: 3,
  mutationAttempts: 3,
  uniqueFingerprints: 0,
  finiteBudget: { mutationAttempts: 3, lowerMilliseconds: 2500, upperMilliseconds: 2500 },
  failureReasons: row.reasons ?? ['fresh-lower-or-upper-threshold-not-proven'],
  accepted: false
}));
const accepted = [
  {
    index: 71,
    status: 'FORMAL_CANDIDATE',
    difficulty: 'hard',
    sourceCandidate: source71,
    sourceId: 71,
    mutationIndex: 0,
    solverAttempt: 1,
    fingerprint: entry71.levelSha256,
    finiteBudget: { lowerMilliseconds: 30000, upperMilliseconds: 30000 },
    lowerBound: { status: 'threshold-proven', floor: 16, value: 16, source: verification71 },
    upperBound: { status: 'replay-complete', value: 20, source: verification71 },
    specials: entry71.specials,
    clearEvents: 30,
    specialShapePolicy: 'filled-axis-aligned-rectangle-only',
    specialEvidence: entry71.specials.map((blockId, index) => ({ blockId, completeClearVerified: true, routeStep: [19, 20, 23][index], clearEvents: 30, lateClear: true })),
    levelFile: `${outDir}/leagueCandidate-071.json`,
    mechanisms: { generators: (level71.generators ?? []).length, shutters: (level71.shutters ?? []).length, keys: level71.blocks.filter(block => block.keyId || block.lockedBy).length, stars: level71.blocks.filter(block => block.star).length },
    acceptedReason: 'source-certified shape/color-adapted candidate; fresh lower L16 and replay upper U20'
  },
  {
    index: 81,
    status: 'FORMAL_CANDIDATE',
    difficulty: 'hard',
    sourceCandidate: source81,
    sourceId: 81,
    mutationIndex: 2277,
    solverAttempt: 1,
    fingerprint: entry81.levelSha256,
    finiteBudget: { lowerMilliseconds: 30000, upperMilliseconds: 30000 },
    lowerBound: { status: 'threshold-proven', floor: 16, value: 16, source: verification81 },
    upperBound: { status: 'replay-complete', value: 20, source: verification81 },
    specials: entry81.specials,
    clearEvents: 18,
    specialShapePolicy: 'filled-axis-aligned-rectangle-only',
    specialEvidence: entry81.specials.map((blockId, index) => ({ blockId, completeClearVerified: true, routeEvidence: verification81, routeStep: [27, 30, 34][index], clearEvents: 18, lateClear: true })),
    levelFile: entry81Path,
    mechanisms: { generators: (entry81.level.generators ?? []).length, shutters: (entry81.level.shutters ?? []).length, keys: entry81.level.blocks.filter(block => block.keyId || block.lockedBy).length, stars: entry81.level.blocks.filter(block => block.star).length },
    acceptedReason: 'finite shape/color mutation candidate; fresh lower L16 and replay upper U20'
  }
];
const report = {
  status: 'PARTIAL_FORMAL_CANDIDATE',
  generatedAt: new Date().toISOString(),
  range: [65, 100],
  policy: {
    cadence: 'hard, hard, super, hard, hard repeating',
    hardBounds: { lower: 16, upper: 20 },
    superBounds: { lower: 21, upper: 30 },
    specials: { min: 1, max: 3, pointsEach: 10 },
    specialShapePolicy: 'filled-axis-aligned-rectangle-only',
    specialUnlockPolicy: 'every special routeStep must be strictly after half of total clearEvents',
    finiteOnly: true,
    mutateShapeOrColorAfterBoundFailure: true
  },
  counts: { total: 36, accepted: accepted.length, blocked: blocked.length },
  accepted,
  blocked,
  sourceEvidence: { candidate: source71, verification: verification71, candidate81: source81, verification81, pointerPending: true, humanBlindTested: false },
  selectorUpdated: false,
  releaseApproved: false
};
fs.writeFileSync(`${outDir}/late-65-100.json`, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ report: `${outDir}/late-65-100.json`, accepted: accepted.map(row => ({ index: row.index, specials: row.specials })), blocked: blocked.length }));
