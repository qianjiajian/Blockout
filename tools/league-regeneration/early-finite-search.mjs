import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { loadSpatialApi, searchSpatial } from '../continuation211-colored-witness.mjs';
import { loadContinuationRuntime } from '../continuation211-runtime.mjs';
import { verifyRulesLock } from '../verify-rules-lock.mjs';

if (!verifyRulesLock().ok) throw new Error('rules lock failed');
const outDir = 'deliverables/league-regeneration-20261004/formal';
fs.mkdirSync(outDir, { recursive: true });
const bundle = await build({ stdin: { contents: "export { LEVELS } from './src/core/levels.ts'", resolveDir: process.cwd(), loader: 'ts' }, bundle: true, write: false, platform: 'node', format: 'esm' });
const source = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const spatialApi = await loadSpatialApi();
const runtime = await loadContinuationRuntime();
const digest = v => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const colors = ['red','blue','green','yellow','purple','orange','pink','cyan'];
const targetFor = i => ((i - 1) % 5 === 2 ? [21, 30] : [16, 20]);
const random = seed => { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };
const clone = v => structuredClone(v);
const key = p => p.join(',');
function mutate(base, seed) {
  const r = random(seed), level = clone(base);
  level.id = 910000 + base.id * 1000 + seed;
  level.name = `荣耀联赛候选${base.id}-${seed}`;
  level.difficulty = ((base.id - 1) % 5 === 2) ? 'super' : 'hard';
  level.timeSeconds = 180; level.reward = 0; level.mechanismRules = 'revised-2026-09-27-v1.5';
  for (const k of ['generators','elevators','conveyors','flipDoors','seams','coloredGrids']) delete level[k];
  if (level.gates?.length) {
    for (const g of level.gates) {
      const size = g.size;
      const side = ['top','right','bottom','left'][Math.floor(r() * 4)];
      const span = side === 'top' || side === 'bottom' ? level.width : level.height;
      g.side = side; g.offset = Math.floor(r() * Math.max(1, span - size));
    }
  }
  // Swap positions of same-shape bodies to create spatial alternatives.
  const groups = new Map();
  for (const b of level.blocks) { const k = JSON.stringify(b.shape); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(b); }
  for (const group of groups.values()) if (group.length > 1 && r() < .85) {
    const a = group[Math.floor(r() * group.length)], b = group[Math.floor(r() * group.length)];
    if (a !== b) { [a.x, b.x] = [b.x, a.x]; [a.y, b.y] = [b.y, a.y]; }
  }
  // Genuine shape mutation: exchange equal-area, different-shape bodies and
  // their positions. The occupied cell set stays identical, so coverage and
  // PuzzleModel invariants remain intact while geometry changes.
  const shapeGroups = new Map();
  for (const b of level.blocks) { const area = b.shape.length; const k = `${area}|${b.shutterId ?? ''}`; if (!shapeGroups.has(k)) shapeGroups.set(k, []); shapeGroups.get(k).push(b); }
  for (const group of shapeGroups.values()) {
    const pairs = group.filter((a, i) => group.slice(i + 1).some(b => JSON.stringify(a.shape) !== JSON.stringify(b.shape)));
    if (!pairs.length || r() >= .65) continue;
    const a = pairs[Math.floor(r() * pairs.length)], b = group.find(x => x !== a && JSON.stringify(x.shape) !== JSON.stringify(a.shape));
    if (b) { [a.shape, b.shape] = [b.shape, a.shape]; [a.x, b.x] = [b.x, a.x]; [a.y, b.y] = [b.y, a.y]; }
  }
  // Finite colour mutation: swap colours while preserving inventory.
  if (level.blocks.length > 1 && r() < .7) {
    const i = Math.floor(r() * level.blocks.length), j = Math.floor(r() * level.blocks.length);
    if (i !== j) [level.blocks[i].color, level.blocks[j].color] = [level.blocks[j].color, level.blocks[i].color];
  }
  return level;
}
function staticShape(level) { return { playable: level.playable, gates: level.gates, blocks: level.blocks, shutters: level.shutters ?? [] }; }
const rows = [], accepted = [];
for (let index = 1; index <= 19; index += 1) {
  const base = source.LEVELS[index - 1];
  let acceptedRow = null;
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const level = attempt === 0 ? clone(base) : mutate(base, index * 100 + attempt);
    level.id = 910000 + index; level.name = `荣耀联赛${index}·正式候选`; level.difficulty = ((index - 1) % 5 === 2) ? 'super' : 'hard'; level.timeSeconds = 180; level.reward = 0; level.mechanismRules = 'revised-2026-09-27-v1.5';
    for (const k of ['generators','elevators','conveyors','flipDoors','seams','coloredGrids']) delete level[k];
    const fp = digest(staticShape(level));
    const row = { index, attempt, fingerprint: fp, levelSha256: digest(level), status: 'rejected' };
    try {
      const target = targetFor(index);
      const route = searchSpatial(level, spatialApi, { floor: target[1] + 1, maxStates: 140000, maxTransitions: 700000, maxMilliseconds: 1400, normalize: true, orderSeed: attempt });
      row.route = { status: route.status, cost: route.cost ?? null, exploredStates: route.exploredStates ?? null, maxClearsSeen: route.maxClearsSeen ?? null };
      if (route.status !== 'witness' || !route.drags) { row.reason = `route-${route.status}`; rows.push(row); continue; }
      const replay = runtime.replayRevisedRoute(level, route.drags);
      row.replay = { valid: replay.valid, complete: replay.complete, nonClearingDrags: replay.nonClearingDrags, effectiveDrags: replay.effectiveDrags };
      if (!replay.valid || !replay.complete) { row.reason = 'replay-invalid'; rows.push(row); continue; }
      if (replay.nonClearingDrags < target[0] || replay.nonClearingDrags > target[1]) { row.reason = 'upper-out-of-band'; rows.push(row); continue; }
      // Lower-bound enumeration must run on the complete graph. The solver
      // intentionally rejects normalize=true in proof mode.
      const proof = searchSpatial(level, spatialApi, { floor: target[0], prove: true, maxStates: 420000, maxTransitions: 2400000, maxMilliseconds: 6500, normalize: false, orderSeed: attempt });
      row.lowerProof = { status: proof.status, thresholdProven: proof.thresholdProven === true, termination: proof.termination ?? null, exploredStates: proof.exploredStates ?? null, elapsedMilliseconds: proof.elapsedMilliseconds ?? null };
      if (!proof.thresholdProven) { row.reason = `lower-${proof.status}`; rows.push(row); continue; }
      const clearBlocks = [...new Set(route.drags.filter(d => d.exitSide).map(d => d.blockId))];
      row.specials = clearBlocks.slice(0, 3);
      if (row.specials.length < 1 || row.specials.length > 3) { row.reason = 'special-count-out-of-range'; rows.push(row); continue; }
      row.status = 'accepted'; row.reason = 'formal-candidate'; row.level = level; row.drags = route.drags; row.replay = replay; row.proof = proof;
      acceptedRow = row; accepted.push(row); rows.push(row); break;
    } catch (error) { row.reason = `error:${error instanceof Error ? error.message : String(error)}`; rows.push(row); }
  }
  if (!acceptedRow) rows.push({ index, status: 'unresolved', reason: 'finite-budget-exhausted', attempts: 24 });
}
const report = { status: accepted.length === 19 ? 'FORMAL_CANDIDATES_READY' : 'PARTIAL_FORMAL_CANDIDATES', range: [1, 19], attempted: rows.filter(r => r.attempt !== undefined).length, accepted: accepted.length, unresolved: [...new Set(rows.filter(r => r.status === 'unresolved').map(r => r.index))], finiteBudget: { attemptsPerLevel: 24, routeMilliseconds: 1400, lowerProofMilliseconds: 2400, mutation: 'gate-offset-side + same-shape position swaps + equal-area different-shape swaps + bounded color swaps', noInfiniteRetry: true }, acceptedRows: accepted.map(({ level, drags, proof, ...r }) => ({ ...r, level, drags, proof })), rows };
fs.writeFileSync(path.join(outDir, 'early-1-19.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ status: report.status, accepted: report.accepted, unresolved: report.unresolved, output: path.join(outDir, 'early-1-19.json') }));
