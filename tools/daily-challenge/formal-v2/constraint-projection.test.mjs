import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSpatialApi } from '../../continuation211-colored-witness.mjs';
import { projectStaticConstraints } from './constraint-projection.mjs';

const api = await loadSpatialApi();
const fixture = () => ({ id: 999, name: 'qualification', difficulty: 'hard', reward: 0,
  mechanismRules: 'revised-2026-09-27-v1.5', width: 3, height: 2, timeSeconds: 60,
  gates: [{ id: 'red-out', side: 'right', offset: 0, size: 2, color: 'red' },
    { id: 'blue-out', side: 'left', offset: 0, size: 2, color: 'blue' }],
  blocks: [{ id: 'r', x: 1, y: 0, shape: [[0,0]], color: 'red' },
    { id: 'b', x: 1, y: 1, shape: [[0,0]], color: 'blue' }],
});
const spatial = snapshot => snapshot.blocks.map(b => [b.id,b.x,b.y,b.color]).sort().map(JSON.stringify).join('|');

// Enumerate each legal move/exit of the real model, retaining a paired relaxed
// model reached by exactly the same operations. This qualifies action inclusion
// at every small-fixture state, including post-clear ice/key/flip changes.
function compareGraph(level) {
  const projected = projectStaticConstraints(level).projectedLevel;
  api.validateLevel(level); api.validateLevel(projected);
  const original = new api.PuzzleModel(level), relaxed = new api.PuzzleModel(projected);
  const queue = [[original, relaxed]], seen = new Set();
  let checked = 0;
  for (let at = 0; at < queue.length; at++) {
    assert.ok(queue.length < 8000, 'qualification graph must remain finite');
    const [real, loose] = queue[at];
    const snapshot = real.snapshot();
    const { moves, ...identity } = snapshot;
    const k = JSON.stringify(identity);
    if (seen.has(k)) continue;
    seen.add(k);
    assert.equal(spatial(snapshot), spatial(loose.snapshot()));
    for (const b of snapshot.blocks) {
      const actions = [[0,-1],[1,0],[0,1],[-1,0]].map(([dx,dy]) => m => m.moveBlockStep(b.id,b.x+dx,b.y+dy));
      actions.push(...['top','right','bottom','left'].map(side => m => m.tryExit(b.id,side).ok));
      for (const action of actions) {
        const rr = real.clone(), ll = loose.clone();
        rr.beginAction(); ll.beginAction();
        if (!action(rr)) continue;
        assert.equal(action(ll), true, 'every original legal action must exist after erasure');
        assert.equal(rr.commitAction(), true); assert.equal(ll.commitAction(), true);
        const rs = rr.snapshot(), ls = ll.snapshot();
        assert.equal(rs.cleared - snapshot.cleared, ls.cleared - loose.snapshot().cleared);
        assert.equal(spatial(rs), spatial(ls));
        checked++; queue.push([rr,ll]);
      }
    }
  }
  assert.ok(checked > 0);
  return { states: seen.size, checked };
}

for (const [name, decorate] of Object.entries({
  ice: l => { l.blocks[0].frozen = 1; l.gates[0].frozen = 1; },
  keys: l => { l.blocks[0].lockedBy = 'blue-key'; l.blocks[1].keyId = 'blue-key'; },
  axis: l => { l.blocks[0].movementAxis = 'horizontal'; },
  stars: l => { l.blocks[0].star = true; l.gates[0].star = true; },
  grid: l => { l.coloredGrids = [{ id: 'grid', color: 'red', cells: [[2,0]] }]; },
  flip: l => { l.flipDoors = [{ ...l.gates.shift(), initiallyOpen: false }]; },
  bombs: l => { l.blocks[0].timedBombSeconds = 15; },
})) test(`all legal small-model actions survive ${name} erasure`, () => {
  const level = fixture(); decorate(level); const before = JSON.stringify(level);
  compareGraph(level); assert.equal(JSON.stringify(level), before);
});

test('physical gate order and body identities are retained', () => {
  const level = fixture(); level.flipDoors = [{ ...level.gates.pop(), initiallyOpen: false }];
  const out = projectStaticConstraints(level);
  assert.deepEqual(out.projectedLevel.gates.map(g=>g.id), ['red-out','blue-out']);
  assert.deepEqual(out.projectedLevel.blocks.map(b=>b.id), level.blocks.map(b=>b.id));
  assert.equal(out.upperBoundTransfer, false);
});
test('hidden inventory, shells, special rescues, and unknown semantics are refused', () => {
  for (const change of [
    l => { l.blocks[0].layers = ['red','blue']; },
    l => { l.blocks[0].shutterId = 'hidden'; },
    l => { l.shutters = [{}]; }, l => { l.generators = [{}]; },
    l => { l.pulseRescue = {}; }, l => { l.dailyProof = {}; },
    l => { l.blocks[0].teleport = true; }, l => { l.unknownRule = true; },
  ]) { const level = fixture(); change(level); assert.throws(() => projectStaticConstraints(level), /unsupported/); }
});
