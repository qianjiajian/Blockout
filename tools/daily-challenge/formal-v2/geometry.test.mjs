import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardBaselineKey, independentPartitionKey, auditIndependentLayouts } from './geometry.mjs';

const fixture = () => ({
  width: 4, height: 3, gates: [],
  blocks: [
    { id: 'a', x: 0, y: 0, color: 'red', shape: [[0, 0], [1, 0]] },
    { id: 'b', x: 2, y: 1, color: 'blue', shape: [[0, 0], [0, 1]] },
  ],
});
const mapWhole = (level, fn, width, height) => ({
  ...structuredClone(level), width, height,
  blocks: level.blocks.map((block) => {
    const cells = block.shape.map(([dx, dy]) => fn([block.x + dx, block.y + dy]));
    const x = Math.min(...cells.map(([cx]) => cx)), y = Math.min(...cells.map(([, cy]) => cy));
    return { ...block, x, y, shape: cells.map(([cx, cy]) => [cx - x, cy - y]) };
  }),
});

test('IDs, block order, colour and metadata do not count as a new partition', () => {
  const source = fixture(), changed = structuredClone(source);
  changed.blocks.reverse();
  for (const block of changed.blocks) { block.id += '-renamed'; block.color = 'yellow'; block.frozen = 99; }
  changed.parMoves = 500;
  assert.equal(independentPartitionKey(changed), independentPartitionKey(source));
});
test('mirrors and quarter turns do not count as independent layouts', () => {
  const source = fixture();
  const mirrored = mapWhole(source, ([x, y]) => [3 - x, y], 4, 3);
  const rotated = mapWhole(source, ([x, y]) => [2 - y, x], 3, 4);
  assert.equal(independentPartitionKey(source), independentPartitionKey(mirrored));
  assert.equal(independentPartitionKey(source), independentPartitionKey(rotated));
});
test('a true block rearrangement is distinct while preserving the source board', () => {
  const source = fixture(), changed = structuredClone(source);
  changed.blocks[1].x = 3;
  assert.equal(boardBaselineKey(changed), boardBaselineKey(source));
  assert.notEqual(independentPartitionKey(changed), independentPartitionKey(source));
});
test('splitting a shape changes the spatial partition', () => {
  const source = fixture(), changed = structuredClone(source);
  changed.blocks[0].shape = [[0, 0]];
  changed.blocks.push({ id: 'c', x: 1, y: 0, color: 'green', shape: [[0, 0]] });
  assert.notEqual(independentPartitionKey(changed), independentPartitionKey(source));
});
test('added seams, board holes, and tower geometry cannot retain a source baseline', () => {
  const source = fixture();
  for (const change of [
    { seams: [{ orientation: 'horizontal', offset: 1, start: 0, size: 4 }] },
    { blocked: [[1, 1]] }, { width: 2, height: 6 },
  ]) assert.notEqual(boardBaselineKey({ ...source, ...change }), boardBaselineKey(source));
});
test('cross-difficulty duplicates are reported, not silently deduplicated', () => {
  const level = fixture();
  const result = auditIndependentLayouts([
    { formalId: 'd1', level, sourceLevel: level }, { formalId: 'd3', level },
  ]);
  assert.equal(result.allIndependent, false);
  assert.equal(result.uniquePartitions, 1);
  assert.deepEqual(result.duplicates[0].formalIds, ['d1', 'd3']);
  assert.equal(result.rows[0].rearrangedSource, false);
});
