import test from 'node:test';
import assert from 'node:assert/strict';
import { auditStrictMechanismAlignment as audit, countIrregularBlockShapes } from './strict-mechanism-alignment-v170.mjs';

function facts() {
  return { width: 6, height: 8, opening: 20, full: 30, mechanisms: {
    exits: { ordinaryCount: 2, frozenCount: 1, frozenValues: [3], starCount: 0, starFrozenCount: 0, starFrozenValues: [], flipCount: 0 },
    generators: { count: 0, queueLengths: [] }, covers: { count: 0, values: [], hiddenBatchCounts: [] },
    numericIce: { count: 0, values: [], postMeltShellCount: 0 }, shells: { count: 0 },
    axisBlocks: { count: 0, axes: [] }, keysLocks: { keyCount: 0, lockCount: 0, lockValues: [] },
    starBlocks: { count: 0 }, flipDoors: { count: 0, initialStates: [] },
    coloredGrid: { cellCount: 0, regionCount: 0 }, bombs: { count: 0, values: [] },
    elevators: { count: 0, hiddenBatchCounts: [] }, irregularBlocks: { openingCount: 0, fullCount: 0 },
  } };
}
const clone = structuredClone;
const compare = (s, d, extra = {}) => audit(s, d, { levelId: 31, ...extra });
const has = (result, code) => result.blockedIssues.some(i => i.code === code);
function lv26() {
  const s = facts();
  s.mechanisms.exits = { ordinaryCount: 8, frozenCount: 3, frozenValues: [5, 9, 14],
    starCount: 0, starFrozenCount: 0, starFrozenValues: [], flipCount: 0 };
  const d = clone(s); d.mechanisms.exits.ordinaryCount = 4;
  return [s, d];
}

test('complete equal independent facts align, but never certify gameplay, board, or release', () => {
  const result = compare(facts(), facts());
  assert.equal(result.sourceAligned, true); assert.equal(result.exactMatch, true);
  assert.deepEqual(result.blockedIssues, []); assert.deepEqual(result.unresolved, []);
  assert.equal(result.gameplayValidated, false); assert.equal(result.boardAligned, false); assert.equal(result.releaseApproved, false);
});
test('v1.6 reasons never excuse a known count difference', () => {
  const s = facts(), d = facts(); d.mechanisms.exits.ordinaryCount = 1;
  const result = compare({ levelId: 31, facts: s, ruleVersion: '1.6.0' }, d,
    { adjustmentReasons: { 'mechanisms.exits.ordinaryCount': 'authorized in old preview' } });
  assert.equal(result.sourceAligned, false); assert(has(result, 'mechanism-count-mismatch'));
});
test('adding a known-absent mechanism is rejected just like removing one', () => {
  const s = facts(), d = facts(); d.mechanisms.shells.count = 1;
  assert(has(compare(s, d), 'mechanism-count-mismatch'));
});
test('unknown is not zero and is never filled from design measurements', () => {
  const s = facts(), d = facts(); s.mechanisms.shells.count = null;
  const before = JSON.stringify(s), result = compare(s, d);
  assert.equal(result.sourceAligned, false); assert.equal(result.knownFieldsMatch, true);
  assert(result.unresolved.some(i => i.field === 'mechanisms.shells.count' && i.side === 'source'));
  assert.equal(JSON.stringify(s), before);
});
test('partial source still compares its known fields; absent families remain unresolved', () => {
  const result = compare({ mechanisms: { shells: { count: 2 } } }, facts());
  assert(has(result, 'mechanism-count-mismatch')); assert(result.unresolved.length > 0); assert.equal(result.sourceAligned, false);
});
test('unknown measurement cannot certify a known source', () => {
  const s = facts(), d = facts(); delete d.mechanisms.bombs;
  const result = compare(s, d);
  assert.equal(result.sourceAligned, false); assert(result.unresolved.some(i => i.side === 'design'));
});
test('Lv26 exception is explicitly approved-exception, never exact source equality', () => {
  const [s, d] = lv26(), result = compare(s, d, { levelId: 26 });
  assert.equal(result.sourceAligned, true); assert.equal(result.exactMatch, false);
  assert.equal(result.approvedExceptions.length, 1);
  assert.equal(result.approvedExceptions[0].status, 'approved-exception');
  assert.equal(s.mechanisms.exits.ordinaryCount, 8);
});
test('Lv26 permits only 1–5 ordinary gates', () => {
  for (const ordinary of [0, 6, 8]) {
    const [s, d] = lv26(); d.mechanisms.exits.ordinaryCount = ordinary;
    const result = compare(s, d, { levelId: 26 });
    assert.equal(result.sourceAligned, false); assert.equal(result.approvedExceptions.length, 0);
  }
});
test('Lv26 cannot change frozen values or categories to claim its exception', () => {
  const [s, d] = lv26(); d.mechanisms.exits.frozenValues[2] = 13;
  const result = compare(s, d, { levelId: 26 });
  assert.equal(result.approvedExceptions.length, 0); assert(has(result, 'mechanism-parameter-mismatch'));
});
test('Lv26 exception requires its known source facts, not arbitrary source inflation', () => {
  const [s, d] = lv26(); s.mechanisms.exits.ordinaryCount = 9;
  assert.equal(compare(s, d, { levelId: 26 }).approvedExceptions.length, 0);
});
test('Lv26 exception never extends to Lv101 or other levels', () => {
  const [s, d] = lv26(), result = compare(s, d, { levelId: 101 });
  assert.equal(result.approvedExceptions.length, 0); assert(has(result, 'source-exit-capacity-conflict'));
});
test('same source counts above eight nonstar gates remain a capacity conflict', () => {
  const s = facts(); s.mechanisms.exits.ordinaryCount = 8;
  const result = compare(s, clone(s));
  assert(has(result, 'source-exit-capacity-conflict')); assert(has(result, 'design-exit-capacity-conflict'));
});
test('same total gates and ice values do not excuse a nonstar-to-star ice conversion', () => {
  const s = facts(), d = facts();
  d.mechanisms.exits.frozenCount = 0; d.mechanisms.exits.frozenValues = [];
  d.mechanisms.exits.starCount = 1; d.mechanisms.exits.starFrozenCount = 1; d.mechanisms.exits.starFrozenValues = [3];
  const result = compare(s, d);
  assert.equal(result.sourceAligned, false); assert(has(result, 'mechanism-count-mismatch'));
});
test('known numerical key parameters cannot be changed with counts unchanged', () => {
  const s = facts(), d = facts(); s.mechanisms.numericIce = { count: 4, values: [3, 9, 3, 9], postMeltShellCount: 0 };
  d.mechanisms.numericIce = { count: 4, values: [1, 2, 3, 4], postMeltShellCount: 0 };
  assert(has(compare(s, d), 'mechanism-parameter-mismatch'));
});
test('independent generators and numeric ice can be reordered as whole scalar instances', () => {
  const s = facts(), d = facts();
  s.mechanisms.generators = { count: 2, queueLengths: [3, 5] }; d.mechanisms.generators = { count: 2, queueLengths: [5, 3] };
  assert.equal(compare(s, d).sourceAligned, true);
});
test('curtain count and cohort may be permuted only as a pair', () => {
  const s = facts(), d = facts();
  s.mechanisms.covers = { count: 2, values: [4, 9], hiddenBatchCounts: [6, 12] };
  d.mechanisms.covers = { count: 2, values: [9, 4], hiddenBatchCounts: [12, 6] };
  assert.equal(compare(s, d).sourceAligned, true);
  d.mechanisms.covers.hiddenBatchCounts = [6, 12];
  assert(has(compare(s, d), 'mechanism-parameter-mismatch'));
});
test('unknown curtain cohort preserves known initial value checks without certifying pairing', () => {
  const s = facts(), d = facts();
  s.mechanisms.covers = { count: 2, values: [4, 9], hiddenBatchCounts: [null, 12] };
  d.mechanisms.covers = { count: 2, values: [9, 4], hiddenBatchCounts: [12, 6] };
  const result = compare(s, d);
  assert.equal(result.knownFieldsMatch, true); assert.equal(result.sourceAligned, false);
  d.mechanisms.covers.hiddenBatchCounts = [6, 12];
  assert(has(compare(s, d), 'mechanism-parameter-mismatch'));
});
test('elevator regions may reorder but layers within each region cannot', () => {
  const s = facts(), d = facts();
  s.mechanisms.elevators = { count: 2, hiddenBatchCounts: [[2, 5], [3]] };
  d.mechanisms.elevators = { count: 2, hiddenBatchCounts: [[3], [2, 5]] };
  assert.equal(compare(s, d).sourceAligned, true);
  d.mechanisms.elevators.hiddenBatchCounts[1] = [5, 2];
  assert(has(compare(s, d), 'mechanism-parameter-mismatch'));
});
test('optional known key groups retain associations, not just grand totals', () => {
  const s = facts(), d = facts();
  const group = { keyCount: 3, lockCount: 2, lockValues: [1, 2], groups: [{ keyCount: 1, lockValues: [1] }, { keyCount: 2, lockValues: [2] }] };
  s.mechanisms.keysLocks = clone(group); d.mechanisms.keysLocks = clone(group);
  d.mechanisms.keysLocks.groups.reverse(); assert.equal(compare(s, d).sourceAligned, true);
  d.mechanisms.keysLocks.groups[0].lockValues = [1]; d.mechanisms.keysLocks.groups[1].lockValues = [2];
  assert(has(compare(s, d), 'mechanism-parameter-mismatch'));
});
test('count/parameter-array contradiction cannot pass because both snapshots share it', () => {
  const s = facts(); s.mechanisms.numericIce.count = 1;
  const result = compare(s, clone(s)); assert(has(result, 'source-count-array-inconsistent'));
});
test('M11 compares both opening and full counts independently', () => {
  const s = facts(), d = facts(); s.mechanisms.irregularBlocks = { openingCount: 2, fullCount: 3 };
  d.mechanisms.irregularBlocks = { openingCount: 2, fullCount: 2 };
  const result = compare(s, d); assert(result.blockedIssues.some(i => i.field === 'mechanisms.irregularBlocks.fullCount'));
});
test('M11 may be supplied separately but missing M11 is never zero', () => {
  const s = facts(), d = facts(); delete s.mechanisms.irregularBlocks; delete d.mechanisms.irregularBlocks;
  assert.equal(compare(s, d).sourceAligned, false);
  assert.equal(compare(s, d, { sourceIrregular: { openingCount: 1, fullCount: 2 }, designIrregular: { openingCount: 1, fullCount: 2 } }).sourceAligned, true);
});
test('equal M11 counts conflicting with the 30% cap fail on both source and design', () => {
  const s = facts(); s.opening = 23; s.full = 23; s.mechanisms.irregularBlocks = { openingCount: 8, fullCount: 8 };
  const result = compare(s, clone(s));
  assert(has(result, 'source-irregular-ratio-conflict')); assert(has(result, 'design-irregular-ratio-conflict'));
});
test('M11 ratio checks the two denominators separately and accepts exactly 30%', () => {
  const s = facts(); s.opening = 10; s.full = 20; s.mechanisms.irregularBlocks = { openingCount: 3, fullCount: 6 };
  assert.equal(compare(s, clone(s)).sourceAligned, true);
  const d = clone(s); d.opening = 9;
  assert(has(compare(s, d), 'design-irregular-ratio-conflict'));
});
test('shape measurement counts actual offset rectangles, L shapes, and empty cavities correctly', () => {
  assert.equal(countIrregularBlockShapes([
    { shape: [[2, -1], [3, -1]] }, { shape: [[0, 0], [0, 1], [1, 1]] },
    { shape: [[0, 0], [1, 0], [2, 0], [0, 1], [2, 1], [0, 2], [1, 2], [2, 2]] },
  ]), 2);
  assert.throws(() => countIrregularBlockShapes([{ shape: [[0, 0], [0, 0]] }]), /Duplicate/);
});
test('unsupported source mechanism families remain unresolved', () => {
  const s = facts(); s.mechanisms.legacyFrame = { count: 1 };
  assert.equal(compare(s, facts()).sourceAligned, false);
});
test('invalid values, enum states and source identity cannot create a pass', () => {
  const s = facts(), d = facts(); s.mechanisms.flipDoors = { count: 1, initialStates: ['maybe'] };
  assert.equal(compare(s, d).sourceAligned, false);
  assert.throws(() => compare({ levelId: 31, facts: facts() }, facts(), { levelId: 26 }), /identity/);
  d.mechanisms.shells.count = -1; assert(has(compare(facts(), d), 'invalid-measurement-count'));
});
test('nested objects cannot masquerade as scalar parameter lists', () => {
  const s = facts(); s.mechanisms.exits.frozenValues = [[3]];
  const result = compare(s, clone(s));
  assert(has(result, 'invalid-source-scalar-parameter')); assert.equal(result.sourceAligned, false);
});
test('same malformed elevator layers or key group totals do not self-certify', () => {
  const s = facts(); s.mechanisms.elevators = { count: 1, hiddenBatchCounts: [[[3]]] };
  assert.equal(compare(s, clone(s)).sourceAligned, false);
  const k = facts(); k.mechanisms.keysLocks.groups = [{ keyCount: 1, lockValues: [] }];
  assert(has(compare(k, clone(k)), 'source-key-group-total-inconsistent'));
});
test('known opening irregulars must be part of the full count even below both ratios', () => {
  const s = facts(); s.mechanisms.irregularBlocks = { openingCount: 3, fullCount: 2 };
  assert(has(compare(s, clone(s)), 'source-irregular-opening-subset-conflict'));
});
