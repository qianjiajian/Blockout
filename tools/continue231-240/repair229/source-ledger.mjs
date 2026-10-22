import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

// Video observations only. This is not a generated LevelSpec or acceptance proof.
const out = 'deliverables/continue231-240-20261019/repair229';
const sha = value => createHash('sha256').update(value).digest('hex');
const shapes = {
  S: [[0, 0]], H2: [[0, 0], [1, 0]], V2: [[0, 0], [0, 1]],
  H3: [[0, 0], [1, 0], [2, 0]], V3: [[0, 0], [0, 1], [0, 2]],
  SQ2: [[0, 0], [1, 0], [0, 1], [1, 1]],
  SQ3: Array.from({ length: 9 }, (_, i) => [i % 3, Math.floor(i / 3)]),
  L3bottom: [[0, 0], [0, 1], [1, 1]],
  L3right: [[0, 0], [1, 0], [1, 1]],
};
const b = (id, color, shapeName, x, y, extra = {}) => ({ id, color, shapeName, x, y, shape: shapes[shapeName], ...extra });
const opening = [
  b('o01', 'purple', 'SQ2', 0, 7),
  b('o02', 'blue', 'SQ3', 3, 5, { lockedBy: 'red-key', lockCount: 3 }),
  b('o03', 'red', 'S', 2, 8), b('o04', 'purple', 'H2', 3, 8),
  b('o05', 'purple', 'V2', 5, 8, { keyId: 'red-key' }),
  b('o06', 'orange', 'V2', 6, 8), b('o07', 'yellow', 'V3', 7, 7),
  b('o08', 'yellow', 'L3bottom', 0, 9), b('o09', 'cyan', 'L3right', 1, 9),
  b('o10', 'yellow', 'V2', 3, 9), b('o11', 'red', 'V2', 4, 9),
  b('o12', 'cyan', 'S', 5, 10), b('o13', 'purple', 'H2', 6, 10),
  b('o14', 'pink', 'H2', 0, 11), b('o15', 'orange', 'H2', 2, 11),
  b('o16', 'green', 'S', 4, 11), b('o17', 'pink', 'H3', 5, 11),
];
const center = [
  b('c01', 'green', 'V2', 2, 0), b('c02', 'blue', 'H2', 3, 0, { keyId: 'red-key' }),
  b('c03', 'red', 'S', 5, 0), b('c04', 'green', 'S', 6, 0),
  b('c05', 'lime', 'S', 3, 1), b('c06', 'cyan', 'S', 4, 1),
  b('c07', 'orange', 'V2', 5, 1), b('c08', 'red', 'V2', 6, 1),
  b('c09', 'purple', 'H3', 2, 2), b('c10', 'blue', 'V2', 2, 3),
  b('c11', 'cyan', 'L3right', 3, 3),
  b('c12', 'green', 'V2', 5, 3, { keyId: 'red-key' }),
  b('c13', 'cyan', 'V2', 6, 3), b('c14', 'purple', 'S', 3, 4),
];
const left = [
  b('l01', 'pink', 'H2', 0, 0), b('l02', 'lime', 'H2', 0, 1),
  b('l03', 'cyan', 'H2', 0, 2), b('l04', 'lime', 'H2', 0, 3),
  b('l05', 'orange', 'V2', 0, 4), b('l06', 'red', 'V2', 1, 4),
];
const right = [
  b('r01', 'lime', 'V2', 7, 0), b('r02', 'blue', 'S', 7, 2),
  b('r03', 'red', 'V2', 7, 3), b('r04', 'lime', 'S', 7, 5),
];
const shutters = [
  { id: 'left', x: 0, y: 0, width: 2, height: 6, count: 17, revealedBySeconds: 200, blocks: left },
  { id: 'center', x: 2, y: 0, width: 5, height: 5, count: 11, revealedBySeconds: 166, blocks: center },
  { id: 'right', x: 7, y: 0, width: 1, height: 6, count: 11, revealedBySeconds: 166, blocks: right },
];
const blocked = [[2, 5], [6, 5], [0, 6], [1, 6], [2, 6], [6, 6], [7, 6], [2, 7], [6, 7]];
const gates = [
  { id: 'top-left', side: 'top', offset: 0, size: 2, color: 'lime', frozen: 35, colorStatus: 'INFERRED_FROM_EXCLUSIVE_REMAINING_COLOR_AND_MATCHING_BLOCKS', colorNote: 'Never thawed in this failed run; source color mapping is an inference, not directly observed gate art.' },
  { id: 'top-right', side: 'top', offset: 6, size: 2, color: 'cyan', frozen: 14, colorObservedAtSeconds: 180 },
  { id: 'left-upper', side: 'left', offset: 0, size: 3, color: 'blue', frozen: 18, colorObservedAtSeconds: 205 },
  { id: 'left-middle', side: 'left', offset: 4, size: 2, color: 'green', frozen: 21, colorObservedAtSeconds: 215 },
  { id: 'left-lower', side: 'left', offset: 7, size: 2, color: 'purple', frozen: 0, colorObservedAtSeconds: 92.4 },
  { id: 'right-middle', side: 'right', offset: 3, size: 3, color: 'red', frozen: 11, colorObservedAtSeconds: 166 },
  { id: 'right-lower', side: 'right', offset: 7, size: 2, color: 'pink', frozen: 9, colorObservedAtSeconds: 166 },
  { id: 'bottom-left', side: 'bottom', offset: 0, size: 2, color: 'orange', frozen: 2, colorObservedAtSeconds: 140 },
  { id: 'bottom-right', side: 'bottom', offset: 6, size: 2, color: 'yellow', frozen: 5, colorObservedAtSeconds: 160 },
];
const key = (x, y) => `${x},${y}`;
const footprint = block => block.shape.map(([dx, dy]) => key(block.x + dx, block.y + dy));
const unavailable = new Set(blocked.map(([x, y]) => key(x, y)));
const occupied = new Map();
const all = [...opening, ...shutters.flatMap(s => s.blocks)];
for (const block of all) for (const xy of footprint(block)) {
  const [x, y] = xy.split(',').map(Number);
  assert(x >= 0 && y >= 0 && x < 8 && y < 12, `${block.id} out of source grid`);
  assert(!unavailable.has(xy), `${block.id} enters source void`);
  assert(!occupied.has(xy), `${block.id} overlaps ${occupied.get(xy)}`);
  occupied.set(xy, block.id);
}
assert.equal(occupied.size, 87);
assert.equal(all.length, 41);
for (const s of shutters) {
  const cells = s.blocks.flatMap(footprint);
  assert.equal(cells.length, s.width * s.height);
  for (const xy of cells) {
    const [x, y] = xy.split(',').map(Number);
    assert(x >= s.x && x < s.x + s.width && y >= s.y && y < s.y + s.height);
  }
}
const evidenceFrames = fs.readdirSync(path.join(out, 'frames')).filter(f => /\.png$/.test(f)).map(file => ({
  file: `${out}/frames/${file}`, sha256: sha(fs.readFileSync(path.join(out, 'frames', file))),
}));
const videoPath = 'C:/Users/Administrator/Desktop/block out/参考视频/228-229.mp4';
const videoSha256 = sha(fs.readFileSync(videoPath));
assert.equal(videoSha256, '4cd8426433fd410e30054c3f34efb54055eff9ed2bbe3a79189bbc8cd790443b');
const report = {
  schemaVersion: 1, status: 'SOURCE_TRANSCRIPTION_GEOMETRY_CHECKED_NOT_FORMAL', levelId: 229,
  activeRuleVersion: '1.198.0', observedOn: '2026-10-19',
  sourceVideo: { path: videoPath, sha256: videoSha256 },
  firstStableOpening: { seconds: [92.4, 92.6], timeText: '02:30', observedBeforeFirstExit: true,
    note: '92.2 timer overlay is still entering; 92.4 and 92.6 show settled identical geometry/counts. At 93.0 the first purple SQ2 is already leaving and all ice/shutter counts have decremented once.' },
  correctionsToHistoricalObservation: [
    '95.0 seconds was after the first purple SQ2 removal and red singleton movement; its counters are not initial values.',
    'The measured cell grid is 8 by 12 with 87 playable cells, not 6 by 8 or approximate 9 by 13.',
    'There is one ordinary purple exit. The orange exit is the bottom-left frozen-2 exit after thawing, not an additional ordinary exit.',
    'Opening has 17 bodies over 44 cells plus three real shutter regions over 43 cells; the untouched source opening is fully covered.',
    'All three hidden regions reveal 24 bodies in total. Two hidden key carriers plus the opening purple key provide three distinct keys for the blue lock-3.',
  ],
  board: { width: 8, height: 12, playableCells: 87, blocked, classification: 'IRREGULAR_ASYMMETRIC_SOURCE_WITH_INWARD_BOUNDARY_NOTCHES' },
  opening, shutters, gates,
  mechanismInventory: { frozenGates: 8, ordinaryGates: 1, shutters: 3, keys: 3, lockedBodies: 1, lockCount: 3,
    shells: 0, numericIceBlocks: 0, flipDoors: 0, generators: 0, lifts: 0, coloredGrids: 0, axisBlocks: 0,
    absenceBoundary: 'No instances visible in the fully transcribed opening and all three revealed single layers; no further release appears before the failed run ends.' },
  statistics: { openingBodies: opening.length, openingArea: opening.flatMap(footprint).length,
    hiddenBodies: shutters.reduce((sum, s) => sum + s.blocks.length, 0), hiddenArea: 43,
    totalBodies: all.length, totalArea: occupied.size, sourceColors: [...new Set(all.map(b => b.color))].sort(),
    sourceShapeHistogram: Object.fromEntries(Object.keys(shapes).map(n => [n, all.filter(b => b.shapeName === n).length]).filter(([, n]) => n)),
    minimumTotalDragsPreservingBodiesAndNormalLowerBound: 52 },
  checks: { sourcePartitionCoverage: 'PASS_87_OF_87', sourceHiddenLayerCoverage: 'PASS_12_25_6',
    sourceOverlaps: 0, sourceOutOfBounds: 0, exactGameCandidateGenerated: false, lowerBoundSolved: false,
    completeRouteProved: false, pointerValidated: false, formalAdopted: false },
  designConflicts: [
    { kind: 'NINE_SOURCE_COLORS_AND_NINE_NONSTAR_EXITS',
      source: 'Nine source colors, eight frozen gates and one ordinary purple gate.',
      gameRule: 'Eight colors, one non-star exit per color, no invented stars.',
      applicableRule: 'docs/mechanism-rules-v1.11.0.md section v1.11 item 4, inherited by current continuation contracts.',
      minimumAdaptation: 'At least one source color/exit must be reassigned; retain the ordinary exit bootstrap and at most seven frozen gates. Preserve initial values of retained frozen gates. No concrete gate removal is accepted yet.' },
    { kind: 'SOURCE_GEOMETRY_VS_ORIGINAL_SYMMETRIC_BOARD',
      source: '8 by 12 asymmetric notched source tray.',
      minimumAdaptation: 'Use an original permitted symmetric board; this transcription is source-only and must not be copied as the final board.' },
    { kind: 'SOURCE_SHAPE_ORIENTATION_VS_Q0_ART', source: 'Two cyan right-hand L triominoes have cells [[0,0],[1,0],[1,1]].',
      minimumAdaptation: 'Both require actual source-oriented art support or permitted physical retiling; never rotate bitmap art to match.' },
    { kind: 'EXISTING_33_DRAG_STAR_TARGET',
      source: '41 single-layer bodies plus normal lower bound of at least 11 non-clearing drags requires at least 52 total drags.',
      existingContract: { starMoves: 33, timeStarSeconds: 151, timeSeconds: 210 },
      implication: 'Preserving this source body inventory cannot earn the existing 33-drag star target. No score field has been changed. A new scored candidate needs the applicable user authorization resolved by the parent task.' },
  ],
  unknowns: ['Top-left frozen-35 gate never opens in the video; lime association is inferred, not directly observed.',
    'The video run fails on time; it is not a complete no-tool solution certificate.',
    'No generated original candidate, valid L/U, q0 asset audit, or fresh Pointer evidence exists for this source revision.'],
  evidenceFrames,
  previousEvidencePreserved: ['deliverables/video-analysis-228-230/source229-new.json', 'deliverables/video-analysis-228-230.md'],
  protectedFormalData: { file: 'src/core/formal221to230Data.ts', sha256: sha(fs.readFileSync('src/core/formal221to230Data.ts')), unchangedByThisTool: true },
  outputBoundary: { productionCampaignBoundary: 200, playerSaveTouched: false, releaseApproved: false },
};
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'source-ledger.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: report.status, statistics: report.statistics, checks: report.checks, output: `${out}/source-ledger.json` }));
