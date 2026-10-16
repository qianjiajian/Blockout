import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSpatialApi } from '../../continuation211-colored-witness.mjs';
import { projectOpeningOuterBodies } from './inventory-projection.mjs';

const api = await loadSpatialApi();
const tiny = () => ({ id: 999, name: 'inventory qualification', difficulty: 'hard', reward: 0,
  mechanismRules: 'revised-2026-09-27-v1.5', width: 3, height: 3, timeSeconds: 60,
  gates: [{ id: 'r-out', side: 'right', offset: 0, size: 3, color: 'red' },
    { id: 'b-out', side: 'left', offset: 0, size: 3, color: 'blue' }],
  blocks: [{ id: 'r', x: 1, y: 0, shape: [[0,0]], color: 'red' },
    { id: 'b', x: 1, y: 2, shape: [[0,0]], color: 'blue' }],
});

function inclusion(level, maxStates = 30000) {
  const p = projectOpeningOuterBodies(level, api), initial = new Map(p.retainedOuterBodies.map(b => [b.id,b]));
  const real = new api.PuzzleModel(level), loose = new api.PuzzleModel(p.projectedLevel);
  const queue = [[real, loose]], seen = new Set(); let checked = 0;
  for (let at = 0; at < queue.length; at++) {
    assert.ok(seen.size < maxStates, 'bounded qualification graph');
    const [original, projected] = queue[at], snapshot = original.snapshot();
    const { moves, ...identity } = snapshot;
    const k = JSON.stringify(identity); if (seen.has(k)) continue; seen.add(k);
    for (const body of projected.snapshot().blocks) {
      const rb = original.getBlock(body.id); assert.ok(rb);
      assert.deepEqual([rb.x,rb.y,rb.layers[0],rb.layers.length], [body.x,body.y,body.color,initial.get(body.id).initialLayers]);
    }
    if (snapshot.complete) assert.equal(projected.snapshot().complete, true);
    for (const b of snapshot.blocks) {
      const actions = [[0,-1],[1,0],[0,1],[-1,0]].map(([dx,dy]) => m => m.moveBlockStep(b.id,b.x+dx,b.y+dy));
      actions.push(...['top','right','bottom','left'].map(side => m => m.tryExit(b.id,side).ok));
      for (const action of actions) {
        const rr = original.clone(), ll = projected.clone(); rr.beginAction(); ll.beginAction();
        if (!action(rr)) continue;
        const mapped = Boolean(ll.getBlock(b.id));
        if (mapped) assert.equal(action(ll), true, 'retained body action must remain legal');
        assert.equal(rr.commitAction(), true); assert.equal(ll.commitAction(), mapped);
        const rc = rr.snapshot().cleared - snapshot.cleared;
        const lc = ll.snapshot().cleared - projected.snapshot().cleared;
        const realCost = rc ? 0 : 1, projectedCost = mapped && !lc ? 1 : 0;
        assert.ok(projectedCost <= realCost, 'projected gesture cost may never increase');
        queue.push([rr,ll]); checked++;
      }
    }
  }
  assert.ok(checked > 0);
}

test('shell first peel removes the projected body; later inner actions are erased', () => {
  const level = tiny(); level.blocks[0].color = 'blue'; level.blocks[0].layers = ['red','blue'];
  inclusion(level);
});
test('shutter reveal and hidden cargo actions preserve the projection relation', () => {
  const level = tiny(); level.shutters = [{ id: 'cover', x: 1, y: 0, width: 1, height: 1, count: 1 }];
  level.blocks[0].shutterId = 'cover'; inclusion(level);
});
test('a real lift layer is discarded while all opening bodies are retained', () => {
  const level = tiny(); level.shutters = [{ id: 'lift', x: 1, y: 0, width: 1, height: 1, count: 1, skin: 'lift' }];
  level.blocks.push({ id: 'cargo', x: 1, y: 0, shape: [[0,0]], color: 'blue', shutterId: 'lift' });
  inclusion(level);
});
test('automatic FIFO release adds only discarded obstacles, never moves retained bodies', () => {
  const level = tiny();
  level.generators = [{ id: 'feeder', side: 'top', offset: 1, spawn: [1,0], queueBlockIds: ['cargo'], trigger: 'move' }];
  level.blocks.push({ id: 'cargo', x: 1, y: 0, shape: [[0,0]], color: 'red' });
  inclusion(level);
});
test('projection refuses autonomous motion and unknown body semantics', () => {
  const level = tiny(); level.blocks[0].futureMechanism = true;
  assert.throws(() => projectOpeningOuterBodies(level, api), /unknown block field/);
});
