import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {digest, loadPreviewCore} from './revised-preview-validation-v160.mjs';
import {loadReviewedDesignSource, verifyReviewedDesign} from './revised-design-review-expanded-v190.mjs';

// These are tool tests, not new source reviews or qualified campaign candidates.
// Mutation fixtures bind one existing frame and live only in an isolated tempdir.
const {api} = await loadPreviewCore();
async function historicalSourceFixture(reviewFile, expectedSha, id) {
  const bytes = await readFile(reviewFile);
  assert.equal(digest(bytes), expectedSha, 'Original historical source review must remain immutable');
  const review = JSON.parse(bytes);
  // Only this test copy decouples non-source UI metadata. All original source,
  // frame, rule, truth and solver bindings stay exact; production loading of
  // the original review must continue to reject the stale UI binding below.
  assert.equal(review.bindings['src/game/artManifest.ts'], '5ece6b8c51f126d9a2174bb79359e05682db700565e090a898a821ce3acea3c9');
  delete review.bindings['src/game/artManifest.ts'];
  review.status = 'synthetic-not-certification-historical-source-regression';
  review.testOnlyHistoricalOrigin = {path: reviewFile, sha256: expectedSha,
    excludedNonSourceBinding: 'src/game/artManifest.ts'};
  const dir = await mkdtemp(path.join(os.tmpdir(), 'blockout-historical-review-test-'));
  try {
    const file = path.join(dir, `source-${id}.json`);
    const fixtureBytes = JSON.stringify(review);
    await writeFile(file, fixtureBytes);
    return await loadReviewedDesignSource(file, digest(fixtureBytes));
  } finally {
    assert(path.resolve(dir).startsWith(path.resolve(os.tmpdir()) + path.sep));
    assert(path.basename(dir).startsWith('blockout-historical-review-test-'));
    await rm(dir, {recursive: true, force: true});
  }
}
const reviews = new Map();
for (const [id, file, sha] of [
  [58, '.codex-temp/strict-alignment-v190/next-source-57-59/source-review-58.json', 'b45379731ba564926ee82ce057cab75755aef69a743a5c341e607496129372a2'],
  [59, '.codex-temp/strict-alignment-v190/next-source-57-59/source-review-59.json', '099772dfb49b108738369684de7b5cef10a38948c31004ce2f9210ca8df8c416'],
]) {
  const bytes = await readFile(file);
  assert.equal(digest(bytes), sha, `Reviewed fixture Lv${id} changed; independently inspect before updating`);
  reviews.set(id, {file, sha, review: JSON.parse(bytes)});
}
const originalCases = new Map();
for (const [id, file, reviewFile, sha, dragCount] of [
  [60, '.codex-temp/strict-alignment-v190/lv060/candidate-60.json', '.codex-temp/strict-alignment-v190/source-capacity-audit/source-review-lv060.json', '5fa488bf2f7b5fb23eb9351e0081c7c49cdad5b7308d33b0abb4d59d940dfab3', 35],
  [135, '.codex-temp/strict-alignment-v190/new-candidates/candidate-135.json', '.codex-temp/strict-alignment-v190/new-candidates/source-review-135.json', 'e50a69309602593cdf24ef7da4c4bd03b3f529286d72ec6b8e1c606b8f4d18a0', 24],
  [152, '.codex-temp/strict-alignment-v190/new-candidates/solved-candidate-152.json', '.codex-temp/strict-alignment-v190/new-candidates/source-review-152.json', 'dbe5ce55b79fc221af152a755c58383432eff251f06ae4b94ae798fcb56275f7', 30],
]) {
  const raw = JSON.parse(await readFile(file));
  const {source} = id === 60 ? await loadReviewedDesignSource(reviewFile, sha)
    : await historicalSourceFixture(reviewFile, sha, id);
  originalCases.set(id, {raw, source});
  test(`expanded companion preserves ${id === 60 ? 'reviewed' : 'isolated historical-source fixture'} Lv${id} ${dragCount}-drag replay`, () => {
    const checked = verifyReviewedDesign(raw, source, api);
    assert(checked.qualifiedPreview && checked.replay.valid && checked.replay.complete);
    assert.equal(checked.drags.length, dragCount);
    assert.equal(checked.pointerReplayValidated, false);
    assert.equal(checked.releaseApproved, false);
  });
}

test('original historical source still fails closed when its artManifest binding has drifted', async () => {
  const file = '.codex-temp/strict-alignment-v190/new-candidates/source-review-135.json';
  const sha = 'e50a69309602593cdf24ef7da4c4bd03b3f529286d72ec6b8e1c606b8f4d18a0';
  const original = JSON.parse(await readFile(file));
  const current = digest(await readFile('src/game/artManifest.ts'));
  if (current !== original.bindings['src/game/artManifest.ts']) {
    await assert.rejects(loadReviewedDesignSource(file, sha), /Source evidence drift src\/game\/artManifest\.ts/);
  } else {
    // A future exact restoration is not drift. The separate synthetic test
    // below still guarantees a rejected art binding regardless of UI version.
    assert((await loadReviewedDesignSource(file, sha)).source);
  }
});

async function loadMutation(t, id, change = () => {}) {
  const review = structuredClone(reviews.get(id).review);
  const frame = review.evidence[0];
  review.status = 'synthetic-loader-mutation-fixture-not-source-certification';
  review.bindings = {[frame.path]: frame.sha256};
  review.evidence = [frame];
  review.stableOpeningEvidence = frame.path;
  for (const row of Object.values(review.sourceInventory)) row.evidencePaths = [frame.path];
  change(review);
  const dir = await mkdtemp(path.join(os.tmpdir(), 'blockout-expanded-review-test-'));
  t.after(async () => {
    assert(path.resolve(dir).startsWith(path.resolve(os.tmpdir()) + path.sep));
    assert(path.basename(dir).startsWith('blockout-expanded-review-test-'));
    await rm(dir, {recursive: true, force: true});
  });
  const file = path.join(dir, 'synthetic-review.json');
  const bytes = JSON.stringify(review);
  await writeFile(file, bytes);
  return loadReviewedDesignSource(file, digest(bytes));
}

test('independent Lv58 review retains one generator and all five queue cargos', async () => {
  const fixture = reviews.get(58);
  const {source} = await loadReviewedDesignSource(fixture.file, fixture.sha);
  assert.deepEqual(source.facts.mechanisms.generators, {count: 1, queueLengths: [5]});
  assert.deepEqual(source.sourceContract.mechanisms.generatorQueueLengths, [5]);
  assert.equal(source.facts.opening, 18);
  assert.equal(source.facts.full, 23);
  assert.equal(source.sourceContract.mechanisms.shellBlocks, 2);
  assert.equal(source.sourceFacts.numericIce.items.filter(i => i.post_melt_shell).length, 2);
});
test('independent Lv59 review retains two distinct key/lock groups, not just total counts', async () => {
  const fixture = reviews.get(59);
  const {source} = await loadReviewedDesignSource(fixture.file, fixture.sha);
  assert.deepEqual(source.sourceContract.mechanisms.keyGroups, [
    {keyCount: 1, lockCounts: [1]}, {keyCount: 1, lockCounts: [1]},
  ]);
  assert.deepEqual(source.sourceContract.mechanisms.shutterClearCounts, [6, 12]);
  assert.deepEqual(source.sourceContract.mechanisms.shutterHiddenBatchCounts, [5, 4]);
});

for (const [label, change] of [
  ['missing queue lengths', r => { delete r.sourceNormalizedFacts.mechanisms.generators.queueLengths; }],
  ['unknown queue lengths', r => { r.sourceNormalizedFacts.mechanisms.generators.queueLengths = null; }],
  ['unknown cargo count', r => { r.sourceNormalizedFacts.mechanisms.generators.queueLengths = [null]; }],
  ['negative cargo count', r => { r.sourceNormalizedFacts.mechanisms.generators.queueLengths = [-1]; }],
  ['fractional cargo count', r => { r.sourceNormalizedFacts.mechanisms.generators.queueLengths = [2.5]; }],
  ['declared generator count differs from queue array length', r => { r.sourceNormalizedFacts.mechanisms.generators.queueLengths = [2, 3]; }],
  ['omitted generator count', r => { delete r.sourceNormalizedFacts.mechanisms.generators.count; }],
  ['queue observation differs from normalized queue lengths', r => { r.sourceInventory.generators.queue_lengths = [4]; }],
]) test(`loader rejects ${label}`, async t => {
  await assert.rejects(loadMutation(t, 58, change));
});

for (const [label, change] of [
  ['missing positive key/lock associations', r => { delete r.sourceNormalizedFacts.mechanisms.keysLocks.groups; }],
  ['unknown group', r => { r.sourceNormalizedFacts.mechanisms.keysLocks.groups[0] = null; }],
  ['unknown key count', r => { r.sourceNormalizedFacts.mechanisms.keysLocks.groups[0].keyCount = null; }],
  ['unknown lock initial value', r => { r.sourceNormalizedFacts.mechanisms.keysLocks.groups[0].lockValues = [null]; }],
  ['nonpositive lock initial value', r => { r.sourceNormalizedFacts.mechanisms.keysLocks.groups[0].lockValues = [0]; }],
  ['key group totals differ', r => { r.sourceNormalizedFacts.mechanisms.keysLocks.groups[0].keyCount = 2; }],
  ['lock group totals differ', r => { r.sourceNormalizedFacts.mechanisms.keysLocks.groups[0].lockValues = [1, 1]; }],
  ['group lock values differ from flat lock inventory', r => { r.sourceNormalizedFacts.mechanisms.keysLocks.groups[0].lockValues = [2]; }],
  ['group observation differs despite same key and lock totals', r => { r.sourceInventory.keyLocks.groups = [{keyCount: 2, lockValues: [1, 1]}]; }],
  ['lock observation value differs', r => { r.sourceInventory.keyLocks.lock_values = [1, 2]; }],
]) test(`loader rejects ${label}`, async t => {
  await assert.rejects(loadMutation(t, 59, change));
});

for (const name of ['unresolved', 'unsupported', 'blockingIssues', 'evidenceGaps']) {
  test(`positive ${name} cannot be silently ignored`, async t => {
    await assert.rejects(loadMutation(t, 58, r => { r[name] = ['unmapped circular-arrow badge']; }), /Unresolved source review/);
  });
}
test('missing one of the explicit fifteen mechanism observations is rejected', async t => {
  await assert.rejects(loadMutation(t, 58, r => { delete r.sourceInventory.axisBlocks; }));
});
test('known mechanism count cannot be replaced with a conflicting observation', async t => {
  await assert.rejects(loadMutation(t, 58, r => { r.sourceInventory.generators.count = 0; }), /Observation\/facts mismatch/);
});
test('duplicate M03 observation aliases cannot hide a second group inventory', async t => {
  await assert.rejects(loadMutation(t, 59, r => { r.sourceInventory.M03 = structuredClone(r.sourceInventory.keyLocks); }), /Duplicate/);
});
test('unbound key group evidence is rejected', async t => {
  await assert.rejects(loadMutation(t, 59, r => { r.sourceInventory.keyLocks.evidencePaths = ['unbound-frame.png']; }), /Unbound observation/);
});
test('a mismatched artManifest binding remains rejected by the production loader', async t => {
  await assert.rejects(loadMutation(t, 59, r => { r.bindings['src/game/artManifest.ts'] = '0'.repeat(64); }),
    /Source evidence drift src\/game\/artManifest\.ts/);
});

function syntheticKeyCase() {
  // Extend a solved layout only inside this test. This is not competitor Lv60.
  const {raw, source} = structuredClone(originalCases.get(60));
  raw.level.name = 'Synthetic key-group adapter test; not a campaign candidate';
  const byId = id => raw.level.blocks.find(b => b.id === id);
  byId(raw.drags[0].blockId).keyId = 'synthetic-A';
  byId(raw.drags[1].blockId).keyId = 'synthetic-B';
  Object.assign(byId(raw.drags.at(-2).blockId), {lockedBy: 'synthetic-A', lockCount: 1});
  Object.assign(byId(raw.drags.at(-1).blockId), {lockedBy: 'synthetic-B', lockCount: 1});
  source.facts.mechanisms.keysLocks = {keyCount: 2, lockCount: 2, lockValues: [1, 1],
    groups: [{keyCount: 1, lockValues: [1]}, {keyCount: 1, lockValues: [1]}]};
  source.sourceContract.mechanisms.keyGroups = [{keyCount: 1, lockCounts: [1]}, {keyCount: 1, lockCounts: [1]}];
  return {raw, source};
}
test('synthetic positive key groups survive complete actual-model replay', () => {
  const {raw, source} = syntheticKeyCase();
  const checked = verifyReviewedDesign(raw, source, api);
  assert(checked.replay.valid && checked.replay.complete);
  assert.deepEqual(checked.proposedFacts.mechanisms.keysLocks.groups, source.facts.mechanisms.keysLocks.groups);
});
test('consistent key-group ID renaming preserves the association contract', () => {
  const {raw, source} = syntheticKeyCase();
  for (const b of raw.level.blocks) {
    if (b.keyId) b.keyId = `renamed-${b.keyId}`;
    if (b.lockedBy) b.lockedBy = `renamed-${b.lockedBy}`;
  }
  assert(verifyReviewedDesign(raw, source, api).replay.complete);
});
test('merging key groups cannot pass by preserving only key and lock totals', () => {
  const {raw, source} = syntheticKeyCase();
  for (const b of raw.level.blocks) {
    if (b.keyId) b.keyId = 'merged';
    if (b.lockedBy) b.lockedBy = 'merged';
  }
  assert.equal(api.measureRevisedMechanismInventory(raw.level).keyGroups[0].keyCount, 2);
  assert.throws(() => verifyReviewedDesign(raw, source, api), /Source alignment/);
});
test('one orphan lock and a new key-only group are not equivalent to two working pairs', () => {
  const {raw, source} = syntheticKeyCase();
  raw.level.blocks.find(b => b.lockedBy === 'synthetic-B').lockedBy = 'unknown-group';
  assert.throws(() => verifyReviewedDesign(raw, source, api));
});
test('adding one generator cannot pass a source with zero generators', () => {
  const {raw, source} = structuredClone(originalCases.get(60));
  raw.level.generators = [{id: 'invented', side: 'top', offset: 2, spawn: [2, 0], queueBlockIds: []}];
  assert.throws(() => verifyReviewedDesign(raw, source, api));
});
