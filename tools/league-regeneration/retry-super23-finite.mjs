/* Finite isolated retry for league Lv23 (super band). */
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { loadSpatialApi, searchSpatial } from '../continuation211-colored-witness.mjs';
import { runFiniteCandidates, gameplayFingerprint, retileAndRecolor } from './finite-search-policy.mjs';

const report = JSON.parse(fs.readFileSync('deliverables/league-regeneration-20261004/formal/mid-20-64.json', 'utf8'));
const source = report.rows.find(row => row.index === 23).level;
const output = 'deliverables/league-regeneration-20261004/formal/super23-finite-retry.json';
const runtimeBundle = await build({ stdin: { resolveDir: process.cwd(), contents: `
  export { replayRevisedRoute } from './src/core/revisedLevelSearch.ts';
` }, bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent' });
const runtime = await import(`data:text/javascript;base64,${Buffer.from(runtimeBundle.outputFiles[0].text).toString('base64')}`);
const spatial = await loadSpatialApi();
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const cellKey = ([x, y]) => `${x},${y}`;
const cellsOf = block => block.shape.map(([dx, dy]) => [block.x + dx, block.y + dy]);
const shapeRotate = shape => {
  const rotated = shape.map(([x, y]) => [-y, x]);
  const minX = Math.min(...rotated.map(([x]) => x)), minY = Math.min(...rotated.map(([, y]) => y));
  return rotated.map(([x, y]) => [x - minX, y - minY]);
};
const rectangle = shape => {
  const xs = shape.map(([x]) => x), ys = shape.map(([, y]) => y);
  return shape.length === (Math.max(...xs) - Math.min(...xs) + 1) * (Math.max(...ys) - Math.min(...ys) + 1)
    && new Set(shape.map(cellKey)).size === shape.length;
};
const legal = new Set((source.playable ?? []).map(cellKey));
const validPlacement = (level, changed) => {
  const occupied = new Set();
  for (const block of level.blocks) {
    const cells = cellsOf(block);
    if (!cells.every(cell => legal.has(cellKey(cell)))) return false;
    for (const cell of cells) { const key = cellKey(cell); if (occupied.has(key)) return false; occupied.add(key); }
  }
  return changed.shape.length > 1 || rectangle(changed.shape);
};
const mutate = (base, blockIndex, colorA, colorB) => {
  const next = structuredClone(base);
  const candidates = next.blocks.filter(block => !block.shutterId && !block.layers && block.shape.length > 1);
  const changed = candidates[blockIndex % candidates.length];
  if (!changed) return next;
  const rotated = shapeRotate(changed.shape);
  changed.shape = rotated;
  const a = next.blocks.find(block => block.color === colorA && block.id !== changed.id);
  const b = next.blocks.find(block => block.color === colorB && block.id !== changed.id);
  if (a && b) [a.color, b.color] = [b.color, a.color];
  next.id = 900023; next.name = `荣耀联赛23·有限形色复核${blockIndex}`; next.difficulty = 'super';
  return validPlacement(next, changed) ? next : null;
};
const candidates = [source];
const retiled = retileAndRecolor(source, [
  { cells: [[0, 0], [1, 0]] },
  { cells: [[0, 0], [0, 1]] },
], 8);
for (const level of retiled) candidates.push(level);
for (let i = 0; i < 12 && candidates.length < 9; i += 1) {
  const next = mutate(source, i, ['blue','purple','yellow','green'][i % 4], ['red','yellow','green','blue'][i % 4]);
  if (next && !candidates.some(item => gameplayFingerprint(item) === gameplayFingerprint(next))) candidates.push(next);
}

const solve = async level => {
  const route = searchSpatial(level, spatial, { floor: 21, normalize: true, maxStates: 260000, maxTransitions: 1400000, maxMilliseconds: 4500, orderSeed: 17 });
  const result = { route: { status: route.status, termination: route.termination ?? null, exploredStates: route.exploredStates ?? null, attemptedTransitions: route.attemptedTransitions ?? null, valid: false, complete: false, nonClearingDrags: null } };
  if (!route.drags) return { accepted: false, failureReasons: ['fresh-pointer-route-not-found'], ...result };
  const replay = runtime.replayRevisedRoute(level, route.drags);
  result.route = { ...result.route, valid: replay.valid, complete: replay.complete, nonClearingDrags: replay.nonClearingDrags, clearEvents: replay.clearEvents };
  if (!replay.valid || !replay.complete || replay.nonClearingDrags < 21 || replay.nonClearingDrags > 30) return { accepted: false, failureReasons: ['canonical-U21-30-out-of-band-or-invalid'], ...result };
  const lower = searchSpatial(level, spatial, { floor: 21, prove: true, normalize: false, maxStates: 360000, maxTransitions: 2400000, maxMilliseconds: 6500, orderSeed: 17 });
  result.lower = { status: lower.status, termination: lower.termination ?? null, thresholdProven: lower.thresholdProven, exploredStates: lower.exploredStates ?? null, attemptedTransitions: lower.attemptedTransitions ?? null };
  if (!lower.thresholdProven) return { accepted: false, failureReasons: ['fresh-L21-not-proven'], ...result };
  const exits = route.drags.filter(drag => drag.exitSide);
  const half = exits.length / 2;
  const specials = [];
  for (let i = 0; i < exits.length; i += 1) {
    if (i + 1 <= half || specials.includes(exits[i].blockId)) continue;
    const block = level.blocks.find(item => item.id === exits[i].blockId);
    if (block && rectangle(block.shape)) specials.push(block.id);
    if (specials.length === 3) break;
  }
  if (!specials.length) return { accepted: false, failureReasons: ['no-late-filled-rectangle-special'], ...result };
  const specialEvidence = specials.map(blockId => ({ blockId, routeStep: exits.findIndex(drag => drag.blockId === blockId) + 1, clearEvents: exits.length, completeClearVerified: true, lateClear: true, score: 10, specialShape: 'filled-axis-aligned-rectangle' }));
  return { accepted: true, level, drags: route.drags, specials, specialEvidence, ...result };
};
const result = await runFiniteCandidates({ base: source, candidates, maxCandidates: 9, solve });
const final = { generatedAt: new Date().toISOString(), index: 23, levelId: 900023, finite: true, noInfiniteRetry: true, maxCandidates: 9, baseFingerprint: gameplayFingerprint(source), ...result };
fs.writeFileSync(output, JSON.stringify(final, null, 2) + '\n');
console.log(JSON.stringify({ status: final.status, attempts: final.attempts.length, accepted: Boolean(final.accepted), output }, null, 2));
