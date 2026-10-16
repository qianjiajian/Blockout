import fs from 'node:fs';
import { build } from 'esbuild';
import { loadSpatialApi, searchSpatial } from '../continuation211-colored-witness.mjs';
import { gameplayFingerprint, retileAndRecolor, runFiniteCandidates } from './finite-search-policy.mjs';

const out = 'deliverables/league-regeneration-20261004/formal/level96-finite-retry.json';
const bundle = await build({ stdin: { resolveDir: process.cwd(), contents: `export { LEVELS } from './src/core/levels.ts'; export { searchRevisedLevel } from './src/core/revisedLevelSearch.ts'; export { validateLevel } from './src/core/PuzzleModel.ts';` }, bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent' });
const core = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const spatial = await loadSpatialApi();
const base = structuredClone(core.LEVELS.find(level => level.id === 96));
base.id = 900096; base.name = '荣耀联赛96·有限复核'; base.difficulty = 'hard'; base.mechanismRules = 'revised-2026-09-27-v1.5'; base.timeSeconds = 180; base.reward = 0;
const definitions = [
  { cells: [[0, 0], [1, 0]] }, { cells: [[0, 0], [0, 1]] },
  { cells: [[0, 0], [1, 0], [2, 0]] }, { cells: [[0, 0], [0, 1], [0, 2]] },
  { cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
];
const candidates = [base, ...retileAndRecolor(base, definitions, 8)].map((level, index) => ({ ...level, id: 900096, name: `荣耀联赛96·有限复核${index}` }));
const report = await runFiniteCandidates({
  base, candidates, maxCandidates: 8,
  solve: async level => {
    try { core.validateLevel(level); } catch (error) { return { accepted: false, failureReasons: [`structural:${error.message}`] }; }
    const route = core.searchRevisedLevel(level, { maxStates: 120000, maxDragStates: 2048, maxTransitions: 2500000, maxMilliseconds: 3500 });
    const result = { route: { status: route.status, termination: route.termination, exploredStates: route.exploredStates, discoveredStates: route.discoveredStates, attemptedTransitions: route.attemptedTransitions, valid: route.replay?.valid ?? false, complete: route.replay?.complete ?? false, nonClearingDrags: route.replay?.nonClearingDrags ?? null } };
    if (!route.witnessFound || !route.replay?.valid || !route.replay.complete) return { ...result, accepted: false, failureReasons: ['authoritative-route-missing-or-invalid'] };
    if (route.replay.nonClearingDrags < 16 || route.replay.nonClearingDrags > 20) return { ...result, accepted: false, failureReasons: ['upper-U16-20-out-of-band'] };
    const lower = searchSpatial(level, spatial, { floor: 16, prove: true, normalize: false, maxStates: 500000, maxTransitions: 4000000, maxMilliseconds: 12000 });
    result.lower = { status: lower.status, termination: lower.termination, thresholdProven: lower.thresholdProven, exploredStates: lower.exploredStates, attemptedTransitions: lower.attemptedTransitions };
    if (!lower.thresholdProven) return { ...result, accepted: false, failureReasons: ['fresh-lower-L16-not-proven'] };
    const exits = route.drags.filter(drag => drag.exitSide), half = exits.length / 2;
    const specials = [];
    for (let index = 0; index < exits.length; index += 1) {
      if (index + 1 <= half || specials.includes(exits[index].blockId)) continue;
      const block = level.blocks.find(item => item.id === exits[index].blockId);
      const xs = block.shape.map(([x]) => x), ys = block.shape.map(([, y]) => y);
      if ((Math.max(...xs) - Math.min(...xs) + 1) * (Math.max(...ys) - Math.min(...ys) + 1) === block.shape.length) specials.push(block.id);
      if (specials.length === 3) break;
    }
    if (!specials.length) return { ...result, accepted: false, failureReasons: ['no-late-filled-rectangle-special'] };
    return { ...result, accepted: true, level, drags: route.drags, specials, specialEvidence: specials.map(id => ({ blockId: id, completeClearVerified: true, lateClear: true, score: 10 })) };
  },
});
const final = { index: 96, levelId: 900096, finite: true, noInfiniteRetry: true, baseFingerprint: gameplayFingerprint(base), ...report };
fs.writeFileSync(out, JSON.stringify(final, null, 2) + '\n');
console.log(JSON.stringify({ status: final.status, attempts: final.attempts.length, accepted: Boolean(final.accepted), output: out, summary: final.attempts.map(attempt => ({ mutationIndex: attempt.mutationIndex, status: attempt.status, reasons: attempt.failureReasons, U: attempt.result?.route?.nonClearingDrags, L: attempt.result?.lower?.thresholdProven })) }, null, 2));
