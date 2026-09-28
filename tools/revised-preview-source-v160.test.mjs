import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizePreviewSourceLevel as normalize, comparePreviewDesignToSource as compare, loadPreviewSourceCatalog, PREVIEW_TRUTH_FILES, flattenPreviewFacts } from './revised-preview-source-v160.mjs';

const earlyTruth = JSON.parse(readFileSync(PREVIEW_TRUTH_FILES.early, 'utf8'));
const lateTruth = JSON.parse(readFileSync(PREVIEW_TRUTH_FILES.late, 'utf8'));
const raw = id => structuredClone([...earlyTruth.levels, ...lateTruth.levels].find(row => row.level === id));
const level = id => normalize(raw(id));

test('normalizer is pure and does not use runtime/design-filled totals', () => {
  const a = raw(44), before = structuredClone(a);
  const n = normalize(a);
  assert.deepEqual(a, before);
  assert.equal(n.facts.full, 16);
  assert.deepEqual(n.facts.mechanisms.covers.hiddenBatchCounts, [null, null, null, null, null]);
  assert.equal(n.records.stageSeeds.find(s => s.kind === 'countdown_cover').count, 1);
  assert(n.qualityNotes.some(v => v.code === 'source-includes-labelled-design-stage-fills'));
  a.composition.source_full_piece_count = null;
  a.composition.effective_design_piece_count = 999;
  assert.equal(normalize(a).facts.full, null);
});

test('early omitted families are unknown, not implicitly zero', () => {
  const n = level(31);
  assert.equal(n.facts.mechanisms.numericIce.count, 4);
  assert.deepEqual(n.facts.mechanisms.numericIce.values, [5, 9, 10, 13]);
  assert.equal(n.facts.mechanisms.generators.count, null);
  assert.equal(n.presence.generators, null);
});

test('late explicit empty families are zero and absent/null remains unknown', () => {
  const n = level(135);
  assert.equal(n.facts.mechanisms.generators.count, 0);
  assert.deepEqual(n.facts.mechanisms.generators.queueLengths, []);
  assert.equal(n.facts.mechanisms.bombs.count, null);
  assert.equal(n.presence.bombs, null);
});

test('Lv190/191 source missing is not silently filled', () => {
  for (const id of [190, 191]) {
    const n = level(id);
    assert.deepEqual([n.facts.width, n.facts.height, n.facts.opening, n.facts.full], [null, null, null, null]);
    assert.equal(n.facts.mechanisms.exits.ordinaryCount, null);
    assert(n.qualityNotes.some(n => n.code === 'local-video-source-missing'));
    assert.equal(n.reconfigurationPolicy.allowsWholesaleMechanismRemoval, false);
  }
});

test('early star frozen is a subset, not an extra set of doors', () => {
  const n = level(100).facts.mechanisms.exits;
  assert.deepEqual([n.ordinaryCount, n.frozenCount, n.starCount, n.starFrozenCount], [1, 1, 2, 2]);
  assert.equal(n.ordinaryCount + n.frozenCount + n.starCount, 4);
});

test('late flagged ordinary star excluded from nonstar subtotal; unknown star inventory retained', () => {
  const n = level(170);
  assert.equal(n.facts.mechanisms.exits.ordinaryCount, 1);
  assert.equal(n.facts.mechanisms.exits.starCount, null);
  assert.equal(n.lowerBounds['mechanisms.exits.starCount'], 1);
  assert.equal(n.conflicts.find(c => c.code === 'recorded-nonstar-exit-capacity').knownNonstar, 11);
});

test('independent flip doors are preserved and included in capacity record', () => {
  const n = level(163);
  assert.equal(n.facts.mechanisms.exits.flipCount, 3);
  assert.equal(n.facts.mechanisms.flipDoors.count, 3);
  assert.deepEqual(n.facts.mechanisms.flipDoors.initialStates, ['open', 'closed', 'closed']);
  assert.equal(n.conflicts.find(c => c.code === 'recorded-nonstar-exit-capacity').knownNonstar, 10);
});

test('late star gate frozen attribute missing stays unknown', () => {
  assert.equal(level(163).facts.mechanisms.exits.starFrozenCount, null);
  assert.equal(level(101).facts.mechanisms.exits.starFrozenCount, 0);
});

test('count wrappers and per-entity arrays both normalize without counting studs or labels', () => {
  assert.equal(level(103).facts.mechanisms.numericIce.count, 4);
  assert.deepEqual(level(103).facts.mechanisms.numericIce.values, [11, 11, 11, 11]);
  assert.equal(level(161).facts.mechanisms.numericIce.count, 2);
  assert.deepEqual(level(161).facts.mechanisms.numericIce.values, [20, 20]);
  assert.equal(level(125).facts.mechanisms.shells.count, 5);
});

test('shell/ice simultaneous relationship retained separately from shell count', () => {
  const n = level(32);
  assert.equal(n.facts.mechanisms.shells.count, 6);
  assert.equal(n.facts.mechanisms.numericIce.postMeltShellCount, 6);
  assert.equal(n.records.mechanisms.shells.items.filter(i => i.requires_numeric_ice).length, 6);
});

test('aggregate lock count differs from numeric badge requirement', () => {
  const n = level(134).facts.mechanisms.keysLocks;
  assert.equal(n.lockCount, 1);
  assert.equal(n.keyCount, null);
  assert.deepEqual(n.lockValues, [3]);
});

test('per-carrier late lock array counts carriers, not sum of counters', () => {
  const n = level(192).facts.mechanisms.keysLocks;
  assert.equal(n.lockCount, 3);
  assert.deepEqual(n.lockValues, [2, 1, 2]);
  assert.equal(n.keyCount, null);
});

test('visible keys remain only a lower bound for full key count', () => {
  const n = level(141);
  assert.equal(n.facts.mechanisms.keysLocks.keyCount, null);
  assert.equal(n.lowerBounds['mechanisms.keysLocks.keyCount'], 1);
  assert.equal(n.facts.mechanisms.keysLocks.lockCount, 1);
  assert.deepEqual(n.facts.mechanisms.keysLocks.lockValues, [4]);
  const unknown = level(165);
  assert.equal(unknown.facts.mechanisms.keysLocks.lockCount, null);
  assert.equal(unknown.lowerBounds['mechanisms.keysLocks.keyCount'], 2);
});

test('at-least star inventories do not become exact totals', () => {
  for (const [id, count] of [[118, 1], [131, 4]]) {
    const n = level(id);
    assert.equal(n.facts.mechanisms.starBlocks.count, null);
    assert.equal(n.lowerBounds['mechanisms.starBlocks.count'], count);
    assert.equal(n.presence.starBlocks, true);
  }
  assert.equal(level(163).facts.mechanisms.starBlocks.count, 2);
});

test('grid region count is distinct from colored cell count', () => {
  const n = level(200).facts.mechanisms.coloredGrid;
  assert.deepEqual(n, { regionCount: 1, cellCount: 12 });
});

test('cover counters are not cover instance counts; batch aliases preserve unknowns', () => {
  const a = level(101).facts.mechanisms.covers, b = level(135).facts.mechanisms.covers;
  assert.equal(a.count, 2);
  assert.deepEqual(a.values, [9, 4]);
  assert.deepEqual(a.hiddenBatchCounts, [null, null]);
  assert.equal(b.count, 1);
  assert.deepEqual(b.values, [10]);
  assert.deepEqual(b.hiddenBatchCounts, [4]);
  const combined = level(49);
  assert.equal(combined.facts.mechanisms.covers.count, 3);
  assert.deepEqual(combined.facts.mechanisms.covers.hiddenBatchCounts, [null, null, null]);
  assert.equal(combined.sourceAggregates.coverHiddenCount, 17);
  assert.equal(level(99).sourceAggregates.coverHiddenCount, 14);
});

test('generator counts and queues do not infer full/opening counts', () => {
  const n = level(35);
  assert.equal(n.facts.mechanisms.generators.count, 2);
  assert.deepEqual(n.facts.mechanisms.generators.queueLengths, [8, 8]);
  assert.equal(n.records.mechanisms.generators.queue_shape_sequences[0].length, 8);
  assert.deepEqual(level(156).facts.mechanisms.generators.queueLengths, [4, 4, 4, 4]);
  assert.equal(level(156).facts.opening, 4);
  assert.equal(level(156).facts.full, 20);
});

test('lift alias includes only hidden layers, not opening layer again', () => {
  const n = level(66);
  assert.equal(n.facts.mechanisms.elevators.count, 1);
  assert.deepEqual(n.facts.mechanisms.elevators.hiddenBatchCounts, [[5, 4]]);
  assert.equal(level(73).facts.mechanisms.elevators.count, null);
  assert(level(73).qualityNotes.some(n => n.code === 'unmapped-legacy-staged-frame'));
});

test('explicit count/dimension source contradictions remain unknown and retain recorded values', () => {
  const a = level(48), b = level(106);
  assert.equal(a.facts.height, null); assert.equal(a.recordedValues.height, 9);
  assert.equal(b.facts.opening, null); assert.equal(b.recordedValues.opening, 33);
  assert.equal(b.facts.full, null); assert.equal(b.recordedValues.full, 33);
  assert.equal(level(170).facts.opening, 22); // partial shape histogram != unknown count.
});

test('source-fps corrections win over historical raw evidence', () => {
  const a = level(39), b = level(71);
  assert.equal(a.facts.opening, 11); assert.equal(a.records.rawEvidence.opening_piece_count, 10);
  assert.equal(b.facts.mechanisms.exits.frozenCount, 9);
  assert.equal(a.facts.mechanisms.covers.hiddenBatchCounts.reduce((a, b) => a + b), 21);
});

test('differences do not label null/null or invented values equal', () => {
  const n = level(190), proposed = structuredClone(n.facts);
  proposed.width = 6;
  const d = compare(n, proposed);
  assert.equal(d.rows.find(r => r.field === 'width').status, 'source-unknown');
  assert.equal(d.rows.find(r => r.field === 'height').status, 'source-unknown');
  assert(!d.knownEqualFields.includes('width'));
  assert(d.unexplainedFields.includes('width'));
});

test('differences keep partially unknown arrays unknown per instance', () => {
  const n = level(101), proposed = structuredClone(n.facts);
  proposed.mechanisms.covers.hiddenBatchCounts = [4, 7];
  const d = compare(n, proposed, { adjustmentReasons: { 'mechanisms.covers.hiddenBatchCounts[0]': { reason: '原创假设', evidence: 'source missing' } } });
  assert.equal(d.rows.find(r => r.field === 'mechanisms.covers.hiddenBatchCounts[0]').status, 'source-unknown');
  assert(!d.unexplainedFields.includes('mechanisms.covers.hiddenBatchCounts[0]'));
  assert(d.unexplainedFields.includes('mechanisms.covers.hiddenBatchCounts[1]'));
});

test('unknown unrelated fields do not blanket-authorize known mechanism removal', () => {
  const n = level(31), proposed = structuredClone(n.facts);
  proposed.mechanisms.numericIce.count = 0;
  const d = compare(n, proposed);
  assert(d.knownMechanismRemovals.includes('mechanisms.numericIce.count'));
  assert(d.unexplainedFields.includes('mechanisms.numericIce.count'));
  assert.equal(d.releaseApproved, false);
});

test('type mismatch in design is changed, not unknown source', () => {
  const n = level(31), proposed = structuredClone(n.facts);
  proposed.width = { value: 6 };
  assert.equal(compare(n, proposed).rows.find(r => r.field === 'width').status, 'changed');
});

test('flatten retains array length and null slots', () => {
  assert.deepEqual(flattenPreviewFacts({ a: [3, null], b: null }), { 'a.length': 2, 'a[0]': 3, 'a[1]': null, b: null });
});

test('catalog binds two source files and active locked rules without generating anything', () => {
  const catalog = loadPreviewSourceCatalog();
  assert.equal(catalog.levels.length, 170);
  assert.equal(catalog.ruleVersion, '1.6.0');
  assert.equal(catalog.sourceBindings.length, 2);
  assert(catalog.sourceBindings.every(b => /^[a-f0-9]{64}$/.test(b.sha256)));
  assert.equal(catalog.activeRule.sha256, '6d5d63d070d0c622b5023f0ab04e820f2eb994c4b0c64e6aaa7005af3366faec');
  assert.equal(loadPreviewSourceCatalog({ minLevel: 35, maxLevel: 39 }).levels.length, 5);
  assert.throws(() => loadPreviewSourceCatalog({ minLevel: 1 }), /range/);
  assert.throws(() => normalize({ level: 26 }), /31–200/);
});
