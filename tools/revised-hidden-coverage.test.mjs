import test from 'node:test';
import assert from 'node:assert/strict';
import { auditHiddenCoverage as audit } from './revised-hidden-coverage.mjs';

const profile = 'revised-2026-09-23-v1.4';
const shutter = (id = 's', extra = {}) => ({ id, x: 0, y: 0, width: 2, height: 2, count: 3, ...extra });
const block = (id = 'b', extra = {}) => ({ id, x: 0, y: 0, color: 'red', shape: [[0, 0], [1, 0], [0, 1], [1, 1]], shutterId: 's', ...extra });
const scene = (extra = {}) => ({ id: 21, width: 4, height: 4, mechanismRules: profile, blocks: [block()], shutters: [shutter()], ...extra });
const has = (result, code) => result.issues.some(issue => issue.code === code);

test('ordinary hidden batch is measured independently, without claiming solvability', () => {
  const result = audit(scene());
  assert.equal(result.passed, true);
  assert.equal(result.regionCount, 1);
  assert.equal(result.totalCells, 4);
  assert.equal(result.coveredCells, 4);
  assert.equal(result.missingCells, 0);
  assert.equal(result.releaseApproved, false);
  assert.equal(result.solvabilityValidated, false);
  assert.deepEqual(result.regions[0].cells, [[0, 0], [1, 0], [0, 1], [1, 1]]);
});
test('a concave shape cannot use its bounding box to fill the missing cell', () => {
  const result = audit(scene({ blocks: [block('L', { shape: [[0, 0], [1, 0], [0, 1]] })] }));
  assert.equal(result.passed, false);
  assert.equal(result.coveredCells, 3);
  assert.deepEqual(result.regions[0].missing, [[1, 1]]);
});
test('a complementary real piece completes the concave footprint', () => {
  assert.equal(audit(scene({ blocks: [block('L', { shape: [[0, 0], [1, 0], [0, 1]] }),
    block('corner', { x: 1, y: 1, shape: [[0, 0]] })] })).passed, true);
});
test('area sum equal to region area cannot conceal overlap and a hole', () => {
  const result = audit(scene({ blocks: [block('left', { shape: [[0, 0], [0, 1]] }),
    block('duplicate-left', { shape: [[0, 0], [0, 1]] })] }));
  assert(has(result, 'hidden-cell-overlap'));
  assert.equal(result.coveredCells, 2);
  assert.equal(result.missingCells, 2);
});
test('full union still fails when another piece overlaps it', () => {
  const result = audit(scene({ blocks: [block(), block('extra', { shape: [[0, 0]] })] }));
  assert.equal(result.coveredCells, 4);
  assert.equal(result.passed, false);
});
test('visible upper blocks do not fill the empty hidden layer', () => {
  const result = audit(scene({ blocks: [block('upper', { shutterId: undefined })] }));
  assert(has(result, 'empty-hidden-batch'));
  assert.equal(result.missingCells, 4);
});
test('revised lifts accept multiple full layers occupying the same rectangle', () => {
  const result = audit(scene({ shutters: [shutter('s', { skin: 'lift' }), shutter('second', { skin: 'lift' })],
    blocks: [block(), block('lower', { shutterId: 'second' }), block('upper', { shutterId: undefined })] }));
  assert.equal(result.passed, true);
  assert.deepEqual(result.regions.map(region => region.kind), ['lift', 'lift']);
  assert.equal(result.totalCells, 8);
});
test('complementary cells in different lift layers never combine into a pass', () => {
  const result = audit(scene({ shutters: [shutter('s', { skin: 'lift' }), shutter('second', { skin: 'lift' })],
    blocks: [block('left', { shape: [[0, 0], [0, 1]] }),
      block('right', { shutterId: 'second', x: 1, shape: [[0, 0], [0, 1]] })] }));
  assert.equal(result.passed, false);
  assert.deepEqual(result.regions.map(region => region.missingCells), [2, 2]);
});
test('later empty lift layer is not skipped', () => {
  const result = audit(scene({ shutters: [shutter('s', { skin: 'lift' }), shutter('later', { skin: 'lift' })] }));
  assert.equal(result.regions[0].passed, true);
  assert.equal(result.regions[1].passed, false);
  assert(has(result, 'empty-hidden-batch'));
});
test('zero countdown and revealed metadata do not skip authored layer validation', () => {
  const result = audit(scene({ shutters: [shutter('s', { count: 0, revealed: true })],
    blocks: [block('one', { shape: [[0, 0]] })] }));
  assert.equal(result.missingCells, 3);
  assert.equal(result.passed, false);
});
test('shells and hidden ice preserve one actual footprint per body', () => {
  assert.equal(audit(scene({ blocks: [block('shell', { layers: ['red', 'blue'], frozen: 4 })] })).coveredCells, 4);
});
test('generator queue is sequential external cargo, not a region to fill', () => {
  const result = audit(scene({ shutters: [], blocks: [block('cargo', { shutterId: undefined, x: 3, y: 3, shape: [[0, 0]] })],
    generators: [{ id: 'g', spawn: [0, 0], queueBlockIds: ['cargo'] }] }));
  assert.equal(result.passed, true);
  assert.equal(result.regionCount, 0);
});
test('generator cargo cannot count as hidden region content', () => {
  const result = audit(scene({ generators: [{ id: 'g', queueBlockIds: ['b'] }] }));
  assert(has(result, 'queued-and-hidden-block'));
  assert.equal(result.coveredCells, 0);
  assert.equal(result.missingCells, 4);
});
test('missing and duplicate queue references fail closed', () => {
  const result = audit(scene({ generators: [{ id: 'g', queueBlockIds: ['missing', 'missing'] }] }));
  assert(has(result, 'unknown-queued-block'));
  assert(has(result, 'duplicate-queued-block'));
});
test('legacy and unsupported hidden representations do not silently pass', () => {
  for (const skin of ['staging', 'staged-frame', 'generator', 'future-hidden']) {
    assert(has(audit(scene({ shutters: [shutter('s', { skin })] })), 'unsupported-hidden-region'));
  }
  assert(has(audit(scene({ mechanismRules: undefined, shutters: [shutter('s', { skin: 'lift' })] })), 'unsupported-hidden-region'));
  assert(has(audit(scene({ elevators: [{ id: 'old-platform', blockId: 'b' }] })), 'legacy-moving-elevator-not-hidden-layer'));
});
test('legacy ordinary curtains can be reported without silently migrating profiles', () => {
  assert.equal(audit(scene({ mechanismRules: undefined })).passed, true);
});
test('unknown profile cannot opt into revised lift support by prefix', () => {
  const result = audit(scene({ mechanismRules: 'revised-future', shutters: [shutter('s', { skin: 'lift' })] }));
  assert(has(result, 'unknown-mechanism-profile'));
  assert(has(result, 'unsupported-hidden-region'));
});
test('revised exact-cohort metadata cannot masquerade as supported lift semantics', () => {
  assert(has(audit(scene({ shutters: [shutter('s', { skin: 'lift', triggerBlockIds: ['b'] })] })), 'unsupported-hidden-trigger-cohort'));
});
test('missing, blank, numeric or duplicate region IDs fail closed', () => {
  for (const shutterId of ['missing', '', 42, null]) {
    assert(has(audit(scene({ blocks: [block('b', { shutterId })] })), 'unknown-hidden-region'));
  }
  const result = audit(scene({ shutters: [shutter(), shutter()] }));
  assert(has(result, 'duplicate-entity-id'));
  assert(has(result, 'ambiguous-hidden-region'));
});
test('duplicate block IDs fail even when their footprints are disjoint', () => {
  const result = audit(scene({ blocks: [block('same', { shape: [[0, 0], [0, 1]] }),
    block('same', { x: 1, shape: [[0, 0], [0, 1]] })] }));
  assert(has(result, 'duplicate-entity-id'));
  assert(has(result, 'ambiguous-hidden-block-id'));
});
test('block and shutter can share an ID in their separate namespaces', () => {
  const result = audit(scene({ shutters: [shutter('lift1', { skin: 'lift' })],
    blocks: [block('lift1', { shutterId: 'lift1' })] }));
  assert.equal(result.passed, true);
  assert.equal(result.regions[0].passed, true);
  assert.equal(result.coveredCells, 4);
});
test('shape extending outside its own region fails, even if full region is covered', () => {
  const result = audit(scene({ blocks: [block('wide', { shape: [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1]] })] }));
  assert.equal(result.coveredCells, 4);
  assert(has(result, 'hidden-cell-outside-region'));
});
test('mask holes and blocked cells remain invalid even if covered by hidden blocks', () => {
  for (const extra of [{ playable: [[0, 0], [1, 0], [0, 1]] }, { blocked: [[1, 1]] }, { playable: [] }]) {
    const result = audit(scene(extra));
    assert(has(result, 'hidden-region-outside-playable'));
    assert(has(result, 'hidden-cell-outside-playable'));
  }
});
test('explicit playable does not override an explicit blocked cell', () => {
  assert(has(audit(scene({ playable: [[0, 0], [1, 0], [0, 1], [1, 1]], blocked: [[1, 1]] })), 'hidden-region-outside-playable'));
});
test('absolute region outside board fails instead of clipping expected area', () => {
  const result = audit(scene({ shutters: [shutter('s', { x: -1 })] }));
  assert.equal(result.totalCells, 4);
  assert(has(result, 'hidden-region-outside-playable'));
});
test('invalid shapes, fractional coordinates and duplicate cells fail closed', () => {
  for (const shape of [[], null, [[0]], [[0, 0.5]], [[NaN, 0]], [[0, 0, 1]]]) {
    assert(has(audit(scene({ blocks: [block('bad', { shape })] })), 'invalid-hidden-block-shape'));
  }
  assert(has(audit(scene({ blocks: [block('bad', { x: 0.5 })] })), 'invalid-hidden-block-shape'));
  assert(has(audit(scene({ blocks: [block('bad', { shape: [[0, 0], [0, 0]] })] })), 'duplicate-hidden-shape-cell'));
  assert(has(audit(scene({ blocks: [block('bad', { shape: [[0, 0], [1, 1]] })] })), 'disconnected-hidden-block-shape'));
});
test('offset footprints are measured at the authored anchor, not normalized or relocated', () => {
  const result = audit(scene({ blocks: [block('offset', { x: 1, y: 1, shape: [[-1, -1], [0, -1], [-1, 0], [0, 0]] })] }));
  assert.equal(result.passed, true);
});
test('malformed collections, geometry, dimensions and counts return diagnostics', () => {
  for (const value of [null, {}, { width: Infinity, height: 4, blocks: [] }]) assert.equal(audit(value).passed, false);
  for (const field of ['shutters', 'generators', 'elevators', 'playable', 'blocked']) {
    assert(has(audit(scene({ [field]: {} })), 'invalid-collection'));
  }
  for (const extra of [{ width: 0 }, { height: 1.2 }, { x: NaN }, { width: Infinity }]) {
    assert(has(audit(scene({ shutters: [shutter('s', extra)] })), 'invalid-hidden-region-geometry'));
  }
  for (const count of [-1, 0.5, NaN]) assert(has(audit(scene({ shutters: [shutter('s', { count })] })), 'invalid-region-count'));
  assert(has(audit(scene({ width: 1_000_000, height: 1_000_000 })), 'hidden-coverage-resource-limit'));
});
test('pure subcheck leaves authored input unchanged and returns detached coordinates', () => {
  const input = scene(), before = JSON.stringify(input);
  const freeze = value => { if (value && typeof value === 'object') { Object.freeze(value); Object.values(value).forEach(freeze); } };
  freeze(input);
  const result = audit(input);
  assert.equal(result.passed, true);
  result.regions[0].cells[0][0] = 99;
  assert.equal(JSON.stringify(input), before);
});
