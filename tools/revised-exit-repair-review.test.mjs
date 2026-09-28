import assert from 'node:assert/strict';
import test from 'node:test';
import { loadPreviewCore, digest } from './revised-preview-validation-v160.mjs';
import {
  EXIT_REPAIR_BASELINE, EXIT_REPAIR_BASELINE_SHA,
  verifyExitOnlyRepair, verifyReviewedLayout,
} from './revised-exit-repair-review.mjs';

const { api } = await loadPreviewCore();
const cells = (width, height) => Array.from({ length: width * height }, (_, i) => [i % width, Math.floor(i / width)]);

/** Self-contained geometry; no live candidates, source truth or generated reports are read. */
function fixture() {
  const level = {
    id: 31, name: 'Exit review fixture', difficulty: 'normal', timeSeconds: 120, reward: 5,
    mechanismRules: 'revised-2026-09-21-v1.2', width: 4, height: 2, playable: cells(4, 2),
    gates: [
      { id: 'red-gate', color: 'red', side: 'top', offset: 0, size: 4 },
      { id: 'blue-gate', color: 'blue', side: 'right', offset: 0, size: 1 },
      { id: 'green-gate', color: 'green', side: 'left', offset: 1, size: 1 },
      { id: 'yellow-gate', color: 'yellow', side: 'right', offset: 1, size: 1 },
    ],
    blocks: [
      { id: 'red', color: 'red', x: 0, y: 0, shape: [[0, 0], [1, 0]] },
      { id: 'blue', color: 'blue', x: 2, y: 0, shape: [[0, 0], [1, 0]] },
      { id: 'green', color: 'green', x: 0, y: 1, shape: [[0, 0], [1, 0]] },
      { id: 'yellow', color: 'yellow', x: 2, y: 1, shape: [[0, 0], [1, 0]] },
    ],
  };
  const baseline = {
    levelId: 31, level,
    source: { reference: 'self-contained-unknown-source', facts: { mechanisms: { covers: null } } },
    comparison: { sourceAligned: false, unresolved: ['mechanisms.covers'] },
    designDifferences: [{ field: 'mechanisms.covers', sourceValue: null, designValue: 0, status: 'source-unknown' }],
  };
  const raw = {
    ruleVersion: '1.8.0', level: structuredClone(level),
    baseline: { path: EXIT_REPAIR_BASELINE, sha256: EXIT_REPAIR_BASELINE_SHA, candidateSha256: digest(level) },
    source: structuredClone(baseline.source), comparison: structuredClone(baseline.comparison),
    designDifferences: structuredClone(baseline.designDifferences), qualifiedPreview: false,
    drags: [
      { blockId: 'red', path: [], exitSide: 'top' },
      { blockId: 'blue', path: [], exitSide: 'right' },
      { blockId: 'green', path: [], exitSide: 'left' },
      { blockId: 'yellow', path: [], exitSide: 'right' },
    ],
  };
  raw.level.gates[0].size = 2;
  return { raw, baseline };
}

function reviewedSource() {
  // Independently specified fixture truth; never obtained via measureDesignFacts(candidate).
  return {
    levelId: 31, sourceFrame: 'fixture-opening.png',
    sourceFrames: [{ path: 'fixture-opening.png', sha256: 'a'.repeat(64) }],
    board: { levelId: 31, kind: 'normal', width: 4, height: 2, cells: cells(4, 2), evidence: 'self-contained-reviewed-fixture' },
    facts: { width: 4, height: 2, opening: 4, full: 4, mechanisms: {
      exits: { ordinaryCount: 4, frozenCount: 0, frozenValues: [], starCount: 0, starFrozenCount: 0, starFrozenValues: [], flipCount: 0 },
      generators: { count: 0, queueLengths: [] }, covers: { count: 0, values: [], hiddenBatchCounts: [] },
      numericIce: { count: 0, values: [], postMeltShellCount: 0 }, shells: { count: 0 },
      axisBlocks: { count: 0, axes: [] }, keysLocks: { keyCount: 0, lockCount: 0, lockValues: [] },
      starBlocks: { count: 0 }, flipDoors: { count: 0, initialStates: [] },
      coloredGrid: { cellCount: 0, regionCount: 0 }, bombs: { count: 0, values: [] },
      elevators: { count: 0, hiddenBatchCounts: [] }, irregularBlocks: { openingCount: 0, fullCount: 0 },
    } },
    sourceFacts: { numericIce: { items: [] } },
    sourceContract: {
      levelId: 31, referenceId: 'self-contained-reviewed-fixture', sha256: 'b'.repeat(64), seed: 'fixture-31',
      width: 4, height: 2, openingBlockCount: 4, fullBlockCount: 4, originalMask: cells(4, 2),
      mechanisms: {
        generatorQueueLengths: [], axisHorizontalBlocks: 0, axisVerticalBlocks: 0, keyGroups: [], starBlocks: 0,
        flipDoorInitialOpen: [], coloredGridCellCounts: [], bombSeconds: [], shutterClearCounts: [],
        shutterHiddenBatchCounts: [], liftCount: 0, liftHiddenBatchCounts: [], numericIceValues: [], shellBlocks: 0,
        exits: Array.from({ length: 4 }, () => ({ kind: 'ordinary', frozen: 0, star: false })),
      },
    },
  };
}

test('a real shortened gate passes fresh model replay without granting a full source certificate', () => {
  const { raw, baseline } = fixture(), before = structuredClone({ raw, baseline });
  const checked = verifyExitOnlyRepair(raw, baseline, api);
  assert.equal(checked.ruleVersion, '1.8.0');
  assert.equal(checked.scope, 'exit-repair-only');
  assert(checked.exitSubtaskPassed && checked.gateSpanAudit.passed && checked.coverage.passed && checked.art.passed);
  assert(checked.replay.valid && checked.replay.complete);
  assert.equal(checked.replay.effectiveDrags, 4);
  assert.equal(checked.changes.length, 1);
  assert.deepEqual(checked.source, baseline.source);
  assert.deepEqual(checked.comparison, baseline.comparison);
  assert.deepEqual(checked.designDifferences, baseline.designDifferences);
  assert(checked.sourceChecksNotPerformed.length > 0);
  for (const key of ['sourceAligned', 'outlineAligned', 'qualifiedPreview', 'sourceParityCertified',
    'pointerReplayValidated', 'renderVerified', 'sourceFirstIntroductionCertified', 'lowerBoundCertified', 'timeValidated', 'releaseApproved']) {
    assert.equal(checked[key], false, key);
  }
  assert.deepEqual({ raw, baseline }, before, 'The verifier must not rewrite either input');
});

const nonGeometryMutations = [
  ['delete a gate', l => l.gates.pop()],
  ['add a gate', l => l.gates.push({ ...l.gates[0], id: 'extra' })],
  ['reorder gate identities', l => l.gates.reverse()],
  ['change color', l => { l.gates[0].color = 'pink'; }],
  ['change ice countdown', l => { l.gates[0].frozen = 9; }],
  ['add star status', l => { l.gates[0].star = true; }],
  ['rename gate identity', l => { l.gates[0].id = 'renamed'; }],
  ['add a portal to one logical gate', l => { l.gates[0].portals = [{ side: 'top', origin: [0, 0], size: 2 }]; }],
  ['change shape', l => { l.blocks[0].shape = [[0, 0]]; }],
  ['change block position', l => { l.blocks[0].x = 1; }],
  ['change block color', l => { l.blocks[0].color = 'pink'; }],
  ['remove block', l => l.blocks.pop()],
  ['change board width', l => { l.width = 5; }],
  ['change playable mask', l => l.playable.pop()],
  ['add blocking cell', l => { l.blocked = [[0, 0]]; }],
  ['add seam', l => { l.seams = [{ orientation: 'vertical', offset: 2, start: 0, size: 2 }]; }],
  ['add shutter', l => { l.shutters = [{ id: 'cover', x: 0, y: 0, width: 2, height: 1, count: 1 }]; }],
  ['add generator', l => { l.generators = [{ id: 'machine', side: 'top', offset: 1, spawn: [0, 0], queueBlockIds: ['red'] }]; }],
  ['change time target', l => { l.timeSeconds = 121; }],
  ['change reward', l => { l.reward = 6; }],
  ['change otherwise unrecognized metadata', l => { l.editorMetadata = { hiddenChanges: true }; }],
];
for (const [name, mutate] of nonGeometryMutations) test(`gate-only rejects ${name}`, () => {
  const { raw, baseline } = fixture(); mutate(raw.level);
  assert.throws(() => verifyExitOnlyRepair(raw, baseline, api), /Only gate side\/offset\/size may change/);
});

for (const key of ['source', 'comparison', 'designDifferences']) test(`cannot clear unresolved ${key}`, () => {
  const { raw, baseline } = fixture(); raw[key] = key === 'designDifferences' ? [] : {};
  assert.throws(() => verifyExitOnlyRepair(raw, baseline, api), new RegExp(`Preserve unresolved ${key}`));
});

test('cannot modify existing flip-door open state or replace fixed/flip gate kinds', () => {
  const { raw, baseline } = fixture();
  baseline.level.flipDoors = [{ ...baseline.level.gates.pop(), initiallyOpen: true }];
  raw.level.flipDoors = [{ ...raw.level.gates.pop(), initiallyOpen: false }];
  raw.baseline.candidateSha256 = digest(baseline.level);
  assert.throws(() => verifyExitOnlyRepair(raw, baseline, api), /Only gate side\/offset\/size may change/);
});

test('unknown source cannot be promoted by caller flags', () => {
  const { raw, baseline } = fixture(); raw.qualifiedPreview = true;
  assert.throws(() => verifyExitOnlyRepair(raw, baseline, api), /Do not relabel/);
});

test('changing gate side is allowed when the same complete route uses the new actual side', () => {
  const { raw, baseline } = fixture();
  Object.assign(raw.level.gates[0], { side: 'left', offset: 0, size: 1 });
  raw.drags[0].exitSide = 'left';
  const checked = verifyExitOnlyRepair(raw, baseline, api);
  assert(checked.replay.valid && checked.replay.complete);
  assert.equal(checked.changes[0].after.side, 'left');
});

test('changing gate offset is allowed only with a newly valid full route', () => {
  const { raw, baseline } = fixture(); raw.level.gates[0].offset = 2;
  raw.drags = [raw.drags[1], { blockId: 'red', path: [[1, 0], [2, 0]], exitSide: 'top' }, ...raw.drags.slice(2)];
  const checked = verifyExitOnlyRepair(raw, baseline, api);
  assert(checked.replay.valid && checked.replay.complete);
});

for (const key of ['path', 'sha256', 'candidateSha256']) test(`rejects stale baseline ${key}`, () => {
  const { raw, baseline } = fixture(); raw.baseline[key] = 'stale';
  assert.throws(() => verifyExitOnlyRepair(raw, baseline, api));
});

test('rejects unchanged old four-cell mouth despite a valid old route', () => {
  const { raw, baseline } = fixture(); raw.level.gates[0].size = 4;
  assert.throws(() => verifyExitOnlyRepair(raw, baseline, api), /Physical gate span cap/);
});

test('resized gate still must admit the block full width', () => {
  const { raw, baseline } = fixture(); raw.level.gates[0].size = 1;
  assert.throws(() => verifyExitOnlyRepair(raw, baseline, api), /Runtime\/spatial\/physical-colour quota/);
});

test('moving a valid short gate requires replaying the route instead of trusting its old certificate', () => {
  const { raw, baseline } = fixture();
  raw.level.gates[0].side = 'bottom'; raw.level.gates[0].offset = 2;
  raw.replay = { valid: true, complete: true };
  assert.throws(() => verifyExitOnlyRepair(raw, baseline, api), /Fresh complete model replay/);
});

test('rejects overlapping physical exits after changing a side and offset', () => {
  const { raw, baseline } = fixture();
  Object.assign(raw.level.gates[1], { side: 'top', offset: 1 });
  assert.throws(() => verifyExitOnlyRepair(raw, baseline, api), /Runtime\/spatial\/physical-colour quota/);
});

test('rejects a short mouth extending beyond the playable boundary', () => {
  const { raw, baseline } = fixture(); raw.level.gates[0].offset = 3;
  assert.throws(() => verifyExitOnlyRepair(raw, baseline, api), /Runtime\/spatial\/physical-colour quota/);
});

test('two physical mouths with the same logical ID still violate nonstar color quota', () => {
  const { raw, baseline } = fixture();
  const portals = [{ side: 'top', origin: [0, 0], size: 2 }, { side: 'bottom', origin: [0, 1], size: 2 }];
  for (const l of [raw.level, baseline.level]) Object.assign(l.gates[0], { size: 2, portals: structuredClone(portals) });
  raw.baseline.candidateSha256 = digest(baseline.level);
  assert.throws(() => verifyExitOnlyRepair(raw, baseline, api), /Runtime\/spatial\/physical-colour quota/);
});

for (const [name, mutate, expected] of [
  ['empty route', r => { r.drags = []; }, /Full route required/],
  ['incomplete route', r => r.drags.pop(), /Fresh complete model replay/],
  ['missing block', r => { r.drags[0].blockId = 'missing'; }, /Fresh complete model replay/],
  ['wrong exit side', r => { r.drags[0].exitSide = 'bottom'; }, /Fresh complete model replay/],
  ['movement after first-contact automatic exit', r => { r.drags[0].path = [[1, 0]]; }, /Fresh complete model replay/],
]) test(`rejects ${name} even with forged cached replay`, () => {
  const { raw, baseline } = fixture(); mutate(raw); raw.replay = { valid: true, complete: true };
  assert.throws(() => verifyExitOnlyRepair(raw, baseline, api), expected);
});

test('spatial-only witness cannot ignore a bomb deadline', () => {
  const { raw, baseline } = fixture();
  raw.level.blocks[0].timedBombSeconds = 10; baseline.level.blocks[0].timedBombSeconds = 10;
  raw.baseline.candidateSha256 = digest(baseline.level);
  assert.throws(() => verifyExitOnlyRepair(raw, baseline, api), /Timed bomb requires a dedicated timed witness/);
});

test('reviewed normal rectangle may match its independent source mask', () => {
  const { raw } = fixture(), source = reviewedSource(), before = structuredClone({ raw, source });
  const checked = verifyReviewedLayout(raw, source, api);
  assert(checked.sourceAligned && checked.outlineAligned && checked.qualifiedPreview && checked.replay.complete);
  assert.equal(checked.scope, 'reviewed-source-layout');
  assert.equal(checked.releaseApproved, false);
  assert.equal(checked.pointerReplayValidated, false);
  assert.deepEqual(checked.sourceChecksNotPerformed, []);
  assert.deepEqual({ raw, source }, before);
});

for (const [name, mutate, expected] of [
  ['unknown mechanism count', s => { s.facts.mechanisms.numericIce.count = null; }, /Unresolved\/mismatched source/],
  ['mismatched full count', s => { s.facts.full = 5; }, /source|Source/],
  ['mismatched stable opening count', s => { s.facts.opening = 3; }, /source|Source/],
  ['mismatched source width', s => { s.facts.width = 5; }, /source|Source/],
  ['mismatched source height', s => { s.facts.height = 3; }, /source|Source/],
  ['unknown full count', s => { s.facts.full = null; }, /source|Source/],
  ['unknown stable opening count', s => { s.facts.opening = null; }, /source|Source/],
  ['unknown source width', s => { delete s.facts.width; }, /source|Source/],
  ['unknown source height', s => { delete s.facts.height; }, /source|Source/],
  ['mismatched M11 count', s => { s.facts.mechanisms.irregularBlocks.fullCount = 1; }, /Unresolved\/mismatched source/],
  ['unknown outline classification', s => { s.board.kind = 'unknown'; }, /Independent source outline/],
  ['false rectangle with missing source cell', s => { s.board.cells.pop(); }, /Independent source outline/],
  ['missing reviewed frames', s => { s.sourceFrames = []; }, /Reviewed video frames required/],
  ['wrong source level', s => { s.levelId = 32; }, /Independent source level binding/],
  ['missing complete source inventory', s => { delete s.sourceContract.mechanisms; }, /Full independent source inventory/],
  ['invented ice-shell pairing', s => { s.sourceFacts.numericIce.items = [{ value: 1, post_melt_shell: false }]; }, /Ice\/shell colocation/],
]) test(`reviewed layout rejects ${name}`, () => {
  const { raw } = fixture(), source = reviewedSource(); mutate(source);
  assert.throws(() => verifyReviewedLayout(raw, source, api), expected);
});
