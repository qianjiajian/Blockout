import fs from 'node:fs';
import { build } from 'esbuild';
import { loadSpatialApi, searchSpatial } from '../continuation211-colored-witness.mjs';
import { gameplayFingerprint, mutationChanges, retileAndRecolor, runFiniteCandidates } from './finite-search-policy.mjs';

const input = JSON.parse(fs.readFileSync('deliverables/league-regeneration-20261004/mid-experiments/level63-variant7-rejected.json', 'utf8'));
const base = input.level;
const output = 'deliverables/league-regeneration-20261004/formal/mid-63-retile-retry.json';
const bundle = await build({ stdin: { resolveDir: process.cwd(), contents: `export { searchRevisedLevel, replayRevisedRoute } from './src/core/revisedLevelSearch.ts'; export { validateLevel } from './src/core/PuzzleModel.ts';` }, bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent' });
const core = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const spatial = await loadSpatialApi();
const definitions = [
  { cells: [[0, 0], [1, 0]] }, { cells: [[0, 0], [0, 1]] },
  { cells: [[0, 0], [1, 0], [2, 0]] }, { cells: [[0, 0], [0, 1], [0, 2]] },
  { cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
];
const candidates = retileAndRecolor(base, definitions, 8).map((level, index) => {
  level.id = 900063; level.name = `荣耀联赛63·有限局部重铺${index}`; level.difficulty = 'super';
  level.mechanismRules = 'revised-2026-09-27-v1.5'; level.timeSeconds = 180; level.reward = 0;
  return level;
});
const report = await runFiniteCandidates({
  base, candidates, maxCandidates: 8,
  solve: async (level, row) => {
    try { core.validateLevel(level); } catch (error) { return { accepted: false, failureReasons: [`structural:${error.message}`] }; }
    const route = core.searchRevisedLevel(level, { maxStates: 120000, maxDragStates: 2048, maxTransitions: 2500000, maxMilliseconds: 3500 });
    const result = { route: { status: route.status, termination: route.termination, exploredStates: route.exploredStates, discoveredStates: route.discoveredStates, attemptedTransitions: route.attemptedTransitions, witnessFound: route.witnessFound, valid: route.replay?.valid ?? false, complete: route.replay?.complete ?? false, nonClearingDrags: route.replay?.nonClearingDrags ?? null } };
    if (!route.witnessFound || !route.replay?.valid || !route.replay.complete) return { ...result, accepted: false, failureReasons: ['authoritative-route-missing-or-invalid'] };
    if (route.replay.nonClearingDrags < 21 || route.replay.nonClearingDrags > 30) return { ...result, accepted: false, failureReasons: ['upper-U21-30-out-of-band'] };
    const lower = searchSpatial(level, spatial, { floor: 21, prove: true, normalize: false, maxStates: 700000, maxTransitions: 5000000, maxMilliseconds: 12000 });
    result.lower = { status: lower.status, termination: lower.termination, thresholdProven: lower.thresholdProven, exploredStates: lower.exploredStates, attemptedTransitions: lower.attemptedTransitions };
    if (!lower.thresholdProven) return { ...result, accepted: false, failureReasons: ['fresh-lower-L21-not-proven'] };
    const exits = route.drags.filter(drag => drag.exitSide);
    const half = exits.length / 2;
    const specials = [];
    for (let index = 0; index < exits.length; index += 1) {
      if (index + 1 <= half || specials.includes(exits[index].blockId)) continue;
      const block = level.blocks.find(item => item.id === exits[index].blockId);
      const xs = block.shape.map(([x]) => x), ys = block.shape.map(([, y]) => y);
      const rectangular = (Math.max(...xs) - Math.min(...xs) + 1) * (Math.max(...ys) - Math.min(...ys) + 1) === block.shape.length;
      if (rectangular) specials.push(block.id);
      if (specials.length === 3) break;
    }
    if (!specials.length) return { ...result, accepted: false, failureReasons: ['no-late-filled-rectangle-special'] };
    const specialEvidence = specials.map(id => ({ blockId: id, routeStep: route.drags.findIndex(drag => drag.blockId === id && drag.exitSide) + 1, clearEvents: exits.length, completeClearVerified: true, lateClear: true, score: 10, specialShape: 'filled-axis-aligned-rectangle' }));
    return { ...result, accepted: true, level, drags: route.drags, specials, specialEvidence, mutationChanges: mutationChanges(base, level) };
  },
});
const out = { status: report.status, index: 63, levelId: 900063, finite: true, noInfiniteRetry: true, baseFingerprint: gameplayFingerprint(base), ...report };
fs.writeFileSync(output, JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify({ status: out.status, candidates: candidates.length, attempts: out.attempts.length, accepted: Boolean(out.accepted), output, summary: out.attempts.map(item => ({ mutationIndex: item.mutationIndex, status: item.status, reasons: item.failureReasons, route: item.result?.route?.termination, U: item.result?.route?.nonClearingDrags, L: item.result?.lower?.thresholdProven })) }, null, 2));
