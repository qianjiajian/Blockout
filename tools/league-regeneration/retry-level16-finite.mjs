import fs from 'node:fs';
import { build } from 'esbuild';
import { loadSpatialApi, searchSpatial } from '../continuation211-colored-witness.mjs';
import { gameplayFingerprint, retileAndRecolor, runFiniteCandidates } from './finite-search-policy.mjs';

const output = 'deliverables/league-regeneration-20261004/formal/level16-finite-retry.json';
const bundle = await build({ stdin: { resolveDir: process.cwd(), contents: `export { LEVELS } from './src/core/levels.ts';` }, bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent' });
const { LEVELS } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const spatial = await loadSpatialApi();
function sanitize(level) {
  level.mechanismRules = 'revised-2026-09-27-v1.5'; level.timeSeconds = 180; level.reward = 0;
  for (const key of ['generators', 'elevators', 'conveyors', 'flipDoors', 'seams', 'coloredGrids']) delete level[key];
  for (const block of level.blocks) { delete block.layers; delete block.movementAxis; delete block.keyId; delete block.lockedBy; delete block.lockCount; delete block.star; }
  delete level.shutters;
  for (const block of level.blocks) delete block.shutterId;
  return level;
}
const base = sanitize(structuredClone(LEVELS[15]));
base.id = 900016; base.name = '荣耀联赛16·有限复核'; base.difficulty = 'hard';
const definitions = [
  { cells: [[0, 0], [1, 0]] }, { cells: [[0, 0], [0, 1]] },
  { cells: [[0, 0], [1, 0], [2, 0]] }, { cells: [[0, 0], [0, 1], [0, 2]] },
  { cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
];
function fallbackVariants(seedCount = 5) {
  const variants = [];
  // Lv16's three area-3 bodies share one silhouette.  Include bounded native
  // silhouette changes even when no equal-area pair has a second source shape.
  const areaThree = base.blocks.filter(block => block.shape.length === 3);
  for (const first of areaThree) {
    const partnerSource = base.blocks.find(block => block.shape.length === 1 && block.color !== first.color);
    if (!partnerSource) continue;
    const level = structuredClone(base), target = level.blocks.find(item => item.id === first.id), partner = level.blocks.find(item => item.id === partnerSource.id);
    target.shape = [[0, 0], [1, 0], [2, 0]];
    [target.color, partner.color] = [partner.color, target.color];
    variants.push(level);
  }
  const byArea = new Map();
  for (const block of base.blocks) { const key = block.shape.length; if (!byArea.has(key)) byArea.set(key, []); byArea.get(key).push(block); }
  for (const group of byArea.values()) {
    const pairs = [];
    for (const a of group) for (const b of group) if (a !== b && JSON.stringify(a.shape) !== JSON.stringify(b.shape)) pairs.push([a, b]);
    for (const [a, b] of pairs) {
      const level = structuredClone(base), aa = level.blocks.find(item => item.id === a.id), bb = level.blocks.find(item => item.id === b.id);
      [aa.shape, bb.shape] = [structuredClone(bb.shape), structuredClone(aa.shape)];
      [aa.x, bb.x, aa.y, bb.y] = [bb.x, aa.x, bb.y, aa.y];
      [aa.color, bb.color] = [bb.color, aa.color];
      variants.push(level);
      if (variants.length >= seedCount) return variants;
    }
  }
  return variants;
}
const mutations = retileAndRecolor(base, definitions, 5);
const candidates = [base, ...(mutations.length ? mutations : fallbackVariants(5))].map((level, index) => ({ ...level, id: 900016, name: `荣耀联赛16·有限复核${index}`, difficulty: 'hard' }));
const runtimeBundle = await build({ stdin: { resolveDir: process.cwd(), contents: `export { replayRevisedRoute } from './src/core/revisedLevelSearch.ts';` }, bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent' });
const runtime = await import(`data:text/javascript;base64,${Buffer.from(runtimeBundle.outputFiles[0].text).toString('base64')}`);
function rectangle(shape) {
  const xs = shape.map(([x]) => x), ys = shape.map(([, y]) => y);
  return shape.length === (Math.max(...xs) - Math.min(...xs) + 1) * (Math.max(...ys) - Math.min(...ys) + 1);
}
const report = await runFiniteCandidates({
  base, candidates, maxCandidates: 6,
  solve: async level => {
    const route = searchSpatial(level, spatial, { floor: 16, prove: false, normalize: false, maxStates: 300000, maxTransitions: 2500000, maxMilliseconds: 4500, orderSeed: 16 });
    const result = { route: { status: route.status, termination: route.termination, reason: route.reason, exploredStates: route.exploredStates, attemptedTransitions: route.attemptedTransitions, valid: false, complete: false, nonClearingDrags: null } };
    if (route.status === 'unsupported') return { ...result, accepted: false, failureReasons: [`solver-unsupported:${route.reason ?? 'unknown'}`] };
    if (!route.drags || !route.drags.length) return { ...result, accepted: false, failureReasons: ['fresh-pointer-route-not-found'] };
    const replay = runtime.replayRevisedRoute(level, route.drags);
    result.route = { ...result.route, valid: replay.valid, complete: replay.complete, nonClearingDrags: replay.nonClearingDrags };
    if (!replay.valid || !replay.complete || replay.nonClearingDrags < 16 || replay.nonClearingDrags > 20) return { ...result, accepted: false, failureReasons: ['upper-U16-20-out-of-band-or-invalid'] };
    const lower = searchSpatial(level, spatial, { floor: 16, prove: true, normalize: false, maxStates: 700000, maxTransitions: 5000000, maxMilliseconds: 12000, orderSeed: 16 });
    result.lower = { status: lower.status, termination: lower.termination, thresholdProven: lower.thresholdProven, exploredStates: lower.exploredStates, attemptedTransitions: lower.attemptedTransitions };
    if (!lower.thresholdProven) return { ...result, accepted: false, failureReasons: ['fresh-lower-L16-not-proven'] };
    const exits = route.drags.filter(drag => drag.exitSide), half = exits.length / 2, specials = [];
    for (let index = 0; index < exits.length; index += 1) {
      if (index + 1 <= half) continue;
      const blockId = exits[index].blockId, block = level.blocks.find(item => item.id === blockId);
      if (block && rectangle(block.shape) && !specials.includes(blockId)) specials.push(blockId);
      if (specials.length === 3) break;
    }
    if (!specials.length) return { ...result, accepted: false, failureReasons: ['no-late-filled-rectangle-special'] };
    return { ...result, accepted: true, level, drags: route.drags, specials, specialEvidence: specials.map(blockId => ({ blockId, clearEvents: exits.length, lateClear: exits.findIndex(d => d.blockId === blockId) + 1 > half, score: 10, specialShape: 'filled-axis-aligned-rectangle', completeClearVerified: true })) };
  },
});
const final = { index: 16, levelId: 900016, finite: true, noInfiniteRetry: true, baseFingerprint: gameplayFingerprint(base), ...report };
fs.writeFileSync(output, JSON.stringify(final, null, 2) + '\n');
console.log(JSON.stringify({ status: final.status, attempts: final.attempts.length, accepted: Boolean(final.accepted), output, summary: final.attempts.map(attempt => ({ mutationIndex: attempt.mutationIndex, status: attempt.status, reasons: attempt.failureReasons, U: attempt.result?.route?.nonClearingDrags, L: attempt.result?.lower?.thresholdProven })) }, null, 2));
