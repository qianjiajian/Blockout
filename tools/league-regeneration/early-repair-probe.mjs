import { build } from 'esbuild';
import { loadSpatialApi, searchSpatial } from '../continuation211-colored-witness.mjs';
import { loadContinuationRuntime } from '../continuation211-runtime.mjs';

const bundle = await build({ stdin: { resolveDir: process.cwd(), loader: 'ts', contents: `export { LEVELS } from './src/core/levels.ts';` }, bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent' });
const { LEVELS } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const spatial = await loadSpatialApi();
const runtime = await loadContinuationRuntime();
const cellsOf = b => b.shape.map(([dx, dy]) => [b.x + dx, b.y + dy]);
const ck = p => `${p[0]},${p[1]}`;
const clone = x => structuredClone(x);
function strip(level, index) {
  const l = clone(level);
  for (const g of l.gates ?? []) delete g.frozen;
  for (const b of l.blocks ?? []) { delete b.frozen; delete b.layers; delete b.keyId; delete b.lockedBy; delete b.lockCount; delete b.shutterId; }
  delete l.shutters;
  l.mechanismRules = 'revised-2026-09-27-v1.5';
  l.id = 900000 + index;
  l.name = `league-repair-${index}`;
  l.timeSeconds = 180; l.reward = 0;
  return l;
}
function q0(level) {
  const legal = new Set((level.playable ?? []).map(ck)); const occ = new Map();
  for (const b of level.blocks ?? []) for (const p of cellsOf(b)) { const a = occ.get(ck(p)) ?? []; a.push(b.id); occ.set(ck(p), a); }
  const adjacent = [];
  for (let i = 0; i < level.blocks.length; i++) for (let j = i + 1; j < level.blocks.length; j++) {
    const a = level.blocks[i], b = level.blocks[j]; if (a.color !== b.color) continue;
    for (const p of cellsOf(a)) for (const z of cellsOf(b)) if (Math.abs(p[0] - z[0]) + Math.abs(p[1] - z[1]) === 1) adjacent.push([a.id, b.id]);
  }
  return { missing: [...legal].filter(k => !occ.has(k)), overlap: [...occ.values()].filter(x => x.length !== 1), adjacent };
}
function recolor(level, colors) {
  // Greedy DSATUR coloring of the block adjacency graph, with the existing
  // gate colors as the only palette. Each color remains exitable.
  const blocks = level.blocks; const adj = new Map(blocks.map(b => [b.id, new Set()]));
  for (let i = 0; i < blocks.length; i++) for (let j = i + 1; j < blocks.length; j++) {
    const a = blocks[i], b = blocks[j];
    if (cellsOf(a).some(p => cellsOf(b).some(z => Math.abs(p[0] - z[0]) + Math.abs(p[1] - z[1]) === 1))) { adj.get(a.id).add(b.id); adj.get(b.id).add(a.id); }
  }
  const assigned = new Map();
  while (assigned.size < blocks.length) {
    const rest = blocks.filter(b => !assigned.has(b.id));
    rest.sort((a, b) => {
      const da = new Set([...adj.get(a.id)].map(id => assigned.get(id)).filter(Boolean)).size;
      const db = new Set([...adj.get(b.id)].map(id => assigned.get(id)).filter(Boolean)).size;
      return db - da || adj.get(b.id).size - adj.get(a.id).size;
    });
    const b = rest[0]; const used = new Set([...adj.get(b.id)].map(id => assigned.get(id)).filter(Boolean));
    const color = colors.find(c => !used.has(c));
    if (!color) return null;
    assigned.set(b.id, color);
  }
  for (const b of blocks) b.color = assigned.get(b.id);
  return assigned;
}
function filledRect(shape) {
  const xs = shape.map(p => p[0]), ys = shape.map(p => p[1]);
  return shape.length === (Math.max(...xs) - Math.min(...xs) + 1) * (Math.max(...ys) - Math.min(...ys) + 1);
}
function score(level, drags) {
  const model = new runtime.PuzzleModel(level); model.startCountdown(); const events = []; let error = null;
  for (let i = 0; i < drags.length; i++) {
    const d = drags[i]; model.beginAction(); let ok = true;
    for (const p of d.path ?? []) if (!model.moveBlockStep(d.blockId, p[0], p[1])) { ok = false; break; }
    if (ok && d.exitSide) ok = model.tryExit(d.blockId, d.exitSide).ok;
    if (!ok || !model.commitAction()) { model.cancelAction(); error = `drag-${i}`; break; }
    if (d.exitSide && !model.getBlock(d.blockId)) events.push({ blockId: d.blockId, step: i + 1 });
  }
  const late = Math.floor(events.length / 2) + 1;
  const selected = events.filter(e => e.step >= late).map(e => level.blocks.find(b => b.id === e.blockId)).filter(Boolean).filter(b => filledRect(b.shape)).slice(0, 3).map(b => ({ blockId: b.id, points: 10, clearEvent: events.find(e => e.blockId === b.id).step }));
  return { status: !error && model.snapshot().complete && selected.length >= 1 ? 'PASS' : 'BLOCKED', selected, lateThreshold: late, totalPoints: selected.length * 10, replayComplete: !error && model.snapshot().complete, error };
}
for (const index of [1, 2, 4, 5, 13, 18]) {
  const source = index < 6 ? 158 : 198; const level = strip(LEVELS[source - 1], index);
  const colors = [...new Set(level.gates.map(g => g.color))]; const assigned = recolor(level, colors);
  console.log(JSON.stringify({ index, source, blocks: level.blocks.length, colors, recolor: Boolean(assigned), q0: q0(level), level }));
  if (!assigned || q0(level).missing.length || q0(level).overlap.length || q0(level).adjacent.length) continue;
  const target = index === 13 || index === 18 ? [21, 30] : [16, 20];
  const route = searchSpatial(level, spatial, { floor: target[1] + 1, maxStates: 300000, maxTransitions: 1800000, maxMilliseconds: 4000, normalize: true, orderSeed: index });
  console.log(JSON.stringify({ index, route: { status: route.status, cost: route.cost, termination: route.termination, states: route.exploredStates, transitions: route.attemptedTransitions } }));
  if (route.status !== 'witness') continue;
  const replay = runtime.replayRevisedRoute(level, route.drags);
  const proof = searchSpatial(level, spatial, { floor: target[0], prove: true, maxStates: 600000, maxTransitions: 3000000, maxMilliseconds: 10000, normalize: false, orderSeed: index });
  console.log(JSON.stringify({ index, replay: { valid: replay.valid, complete: replay.complete, U: replay.nonClearingDrags }, proof: { status: proof.status, thresholdProven: proof.thresholdProven, termination: proof.termination, sourceLevelSha256: proof.sourceLevelSha256 }, score: score(level, route.drags) }));
}
