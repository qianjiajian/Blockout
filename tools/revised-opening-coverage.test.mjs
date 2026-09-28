import test from 'node:test';
import assert from 'node:assert/strict';
import { auditOpeningCoverage as audit } from './revised-opening-coverage.mjs';
const block = (id, x, y, extra = {}) => ({ id, x, y, shape: [[0, 0]], ...extra });
const scene = (extra = {}) => ({ playable: [[0, 0], [1, 0]], blocks: [block('a', 0, 0), block('b', 1, 0)], shutters: [], queuedBlocks: [], ...extra });
test('visible frozen blocks count; shell does not double count', () => {
  const s = scene(); s.blocks[0].frozen = 6; s.blocks[1].layers = ['red', 'blue'];
  assert.equal(audit(s).passed, true); assert.equal(audit(s).visibleBlockCells, 2);
});
test('a real closed curtain covers its full region, without adding hidden block cells', () => {
  const s = scene({ playable: [[0, 0], [1, 0], [2, 0]], shutters: [{ id: 's', x: 1, y: 0, width: 2, height: 1, count: 4, revealed: false }] });
  s.blocks[1].shutterId = 's';
  const r = audit(s); assert.equal(r.passed, true); assert.equal(r.shutterCells, 2); assert.equal(r.visibleBlockCells, 1);
});
test('revealed curtain no longer covers an empty cell', () => {
  const s = scene({ playable: [[0, 0], [1, 0], [2, 0]], shutters: [{ id: 's', x: 1, y: 0, width: 2, height: 1, count: 0, revealed: true }] });
  s.blocks[1].shutterId = 's';
  assert.deepEqual(audit(s).uncoveredCells, [[2, 0]]);
});
test('legacy zero-count or nonphysical staging cannot fill holes', () => {
  for (const extra of [{ count: 0 }, { skin: 'staging' }, { skin: 'lift' }, { skin: 'generator' }]) {
    const s = scene({ shutters: [{ id: 's', x: 1, y: 0, width: 1, height: 1, count: 4, ...extra }] });
    s.blocks[1].shutterId = 's'; assert.equal(audit(s).passed, false);
  }
});
test('revised zero-count curtain follows authoritative unrevealed state, still rejecting overlap', () => {
  const s = scene({ shutters: [{ id: 's', x: 1, y: 0, width: 1, height: 1, count: 0, revealed: false }] });
  s.blocks[1].shutterId = 's'; assert.equal(audit(s).passed, true);
  s.blocks.push(block('blocking-guest', 1, 0));
  assert(audit(s).issues.some(i => i.code === 'opening-coverage-overlap'));
});
test('queued cargo never covers board cells', () => {
  const s = scene(); s.queuedBlocks.push(s.blocks.pop());
  assert.deepEqual(audit(s).uncoveredCells, [[1, 0]]);
});
test('irregular blocks use actual footprint, not bounding box', () => {
  const s = scene({ playable: [[0, 0], [1, 0], [0, 1], [1, 1]], blocks: [block('L', 0, 0, { shape: [[0, 0], [1, 0], [0, 1]] })] });
  assert.deepEqual(audit(s).uncoveredCells, [[1, 1]]);
});
test('nonplayable outline cells are not holes', () => {
  assert.equal(audit(scene({ playable: [[0, 0]], blocks: [block('a', 0, 0)] })).passed, true);
});
test('block overlap is rejected even when union covers all cells', () => {
  const s = scene(); s.blocks.push(block('duplicate', 0, 0));
  assert.equal(audit(s).coverageRatio, 1); assert.equal(audit(s).passed, false);
});
test('unrelated visible block cannot overlap a closed shutter', () => {
  const s = scene({ shutters: [{ id: 's', x: 1, y: 0, width: 1, height: 1, count: 3 }] });
  s.blocks.push(block('h', 1, 0, { shutterId: 's' }));
  assert(audit(s).issues.some(i => i.code === 'opening-coverage-overlap'));
});
test('fake empty shutter cannot mask bare cells', () => {
  const s = scene({ blocks: [block('a', 0, 0)], shutters: [{ id: 's', x: 1, y: 0, width: 1, height: 1, count: 4 }] });
  assert(audit(s).issues.some(i => i.code === 'empty-coverage-shutter'));
});
test('out-of-board footprints and invalid snapshots fail', () => {
  assert.equal(audit(null).passed, false);
  const s = scene(); s.blocks[1].x = 2;
  assert(audit(s).issues.some(i => i.code === 'coverage-outside-playable'));
});
