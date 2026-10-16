import fs from 'node:fs';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { loadContinuationRuntime } from '../continuation211-runtime.mjs';
import { loadSpatialApi, compileSpatial, searchSpatial } from '../continuation211-colored-witness.mjs';
import { verifyRulesLock } from '../verify-rules-lock.mjs';
import { createHash } from 'node:crypto';

assert.equal(verifyRulesLock().ok, true, 'rules lock failed');
const catalog = JSON.parse(fs.readFileSync('deliverables/league-regeneration-20261004/formal/early-1-19-formal-catalog.json'));
const sha = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const spatial = await loadSpatialApi();
const runtime = await loadContinuationRuntime();
assert.equal(catalog.range[0], 1); assert.equal(catalog.range[1], 19);
for (const entry of catalog.entries) {
  const { index, level, specials, route, replay, lowerProof } = entry;
  assert.equal(level.id, 900000 + index, `id mismatch ${index}`);
  assert.equal(level.difficulty, ((index - 1) % 5 === 2) ? 'super' : 'hard', `difficulty ${index}`);
  assert.equal(level.timeSeconds, 180); assert.equal(level.reward, 0);
  assert.ok(Array.isArray(specials) && specials.length >= 1 && specials.length <= 3, `special count ${index}`);
  const blockIds = new Set(level.blocks.map(b => b.id));
  const exits = new Set(route.filter(d => d.exitSide).map(d => d.blockId));
  for (const id of specials) {
    assert.ok(blockIds.has(id), `special block missing ${index}/${id}`); assert.ok(exits.has(id), `special not cleared ${index}/${id}`);
    const block = level.blocks.find(b => b.id === id); const w = Math.max(...block.shape.map(p => p[0])) - Math.min(...block.shape.map(p => p[0])) + 1; const h = Math.max(...block.shape.map(p => p[1])) - Math.min(...block.shape.map(p => p[1])) + 1;
    assert.equal(w * h, block.shape.length, `special must be rectangular ${index}/${id}`);
  }
  compileSpatial(level, spatial);
  const actual = runtime.replayRevisedRoute(level, route);
  assert.equal(actual.valid, true, `runtime invalid ${index}`); assert.equal(actual.complete, true, `runtime incomplete ${index}`);
  assert.equal(actual.nonClearingDrags, replay.nonClearingDrags);
  assert.equal(lowerProof.thresholdProven, true); assert.equal(lowerProof.status, 'threshold-proven');
  assert.equal(entry.levelSha256, sha(level), `level hash ${index}`);
  assert.equal(lowerProof.sourceLevelSha256, entry.levelSha256, `proof binding ${index}`);
}
console.log(JSON.stringify({ status: 'PASS', accepted: catalog.entries.map(x => x.index), specialScore: 10, finiteBudget: catalog.finiteBudget }));
