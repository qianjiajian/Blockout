/*
 * Build isolated league candidates from campaign levels.  This is deliberately
 * separate from the production LEVELS and league selector: a candidate keeps
 * its campaign source id, then receives a finite equal-area retiling and a
 * color swap before it is solved.  A candidate is recorded only after the
 * same object passes a complete route, a fresh lower-bound proof, and the
 * late rectangular scoring-block audit.
 */
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { runFiniteCandidates, retileAndRecolor } from './finite-search-policy.mjs';
import { loadSpatialApi, searchSpatial } from '../continuation211-colored-witness.mjs';
import { loadContinuationRuntime } from '../continuation211-runtime.mjs';
import { verifyRulesLock } from '../verify-rules-lock.mjs';

if (!verifyRulesLock().ok) throw new Error('rules lock failed');
const output = 'deliverables/league-regeneration-20261005/template-candidates';
fs.mkdirSync(output, { recursive: true });
const bundle = await build({
  stdin: { contents: "export { LEVELS } from './src/core/levels.ts'; export { FORMAL_BLOCK_SHAPES } from './src/game/formalBlockShapes.ts'", resolveDir: process.cwd(), loader: 'ts' },
  bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent',
});
const source = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const spatial = await loadSpatialApi();
const runtime = await loadContinuationRuntime();
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const campaignLevel = index => source.LEVELS[index - 1];

// Accepted early formal rows provide a verified campaign-shaped base while
// retaining the explicit mainline source id.  The retiling below changes the
// playable layout before any route search is run.
const acceptedBase = JSON.parse(fs.readFileSync('deliverables/league-regeneration-20261004/formal/early-1-19.json', 'utf8')).acceptedRows
  .find(row => row.index === 7)?.level;
if (!acceptedBase) throw new Error('verified source template level 7 is missing');

const target = [16, 20];
const base = structuredClone(acceptedBase);
base.id = 900004;
base.name = '荣耀联赛4·主线7布局模板';
base.difficulty = 'hard';
base.timeSeconds = 180;
base.reward = 0;
base.mechanismRules = 'revised-2026-09-27-v1.5';
const candidates = retileAndRecolor(base, source.FORMAL_BLOCK_SHAPES, 8).map((level, index) => ({
  ...level,
  id: 900004,
  name: `荣耀联赛4·主线7布局变体${index + 1}`,
  difficulty: 'hard',
  timeSeconds: 180,
  reward: 0,
  mechanismRules: 'revised-2026-09-27-v1.5',
}));

const specialAudit = (level, route) => {
  const exits = route.filter(drag => drag.exitSide);
  const late = exits.filter((_drag, i) => i >= exits.length / 2);
  const blocks = new Map(level.blocks.map(block => [block.id, block]));
  const rectangular = drag => {
    const block = blocks.get(drag.blockId);
    if (!block) return false;
    const xs = block.shape.map(([x]) => x), ys = block.shape.map(([, y]) => y);
    return (Math.max(...xs) - Math.min(...xs) + 1) * (Math.max(...ys) - Math.min(...ys) + 1) === block.shape.length;
  };
  const specials = [...new Set(late.filter(rectangular).map(drag => drag.blockId))].slice(0, 3);
  return {
    specials,
    scorePerSpecial: 10,
    clearEvents: exits.length,
    evidence: specials.map(blockId => ({ blockId, lateClear: true, rectangular: true, completeClearVerified: true, score: 10 })),
  };
};

const solve = async (level) => {
  const route = searchSpatial(level, spatial, { floor: target[1] + 1, maxStates: 420000, maxTransitions: 2200000, maxMilliseconds: 9000, normalize: true, orderSeed: 2 });
  if (route.status !== 'witness' || !route.drags) return { accepted: false, failureReasons: [`route-${route.status}`], route: { status: route.status, states: route.exploredStates ?? null } };
  const replay = runtime.replayRevisedRoute(level, route.drags);
  if (!replay.valid || !replay.complete || replay.nonClearingDrags < target[0] || replay.nonClearingDrags > target[1]) return { accepted: false, failureReasons: ['upper-out-of-band'], replay };
  const lower = searchSpatial(level, spatial, { floor: target[0], prove: true, maxStates: 900000, maxTransitions: 6000000, maxMilliseconds: 15000, normalize: false, orderSeed: 2 });
  if (lower.thresholdProven !== true) return { accepted: false, failureReasons: [`lower-${lower.status}`], replay, lower: { status: lower.status, termination: lower.termination ?? null, exploredStates: lower.exploredStates ?? null } };
  const score = specialAudit(level, route.drags);
  if (score.specials.length < 1 || score.specials.length > 3) return { accepted: false, failureReasons: ['special-count-out-of-range'], replay, lower, score };
  return { accepted: true, replay, lower, score, drags: route.drags, failureReasons: [] };
};

const result = await runFiniteCandidates({ base, candidates, maxCandidates: 8, solve });
const accepted = result.accepted ? {
  index: 4,
  sourceLevel: 7,
  sourceTemplateSha256: digest(campaignLevel(7)),
  status: 'FORMAL_CANDIDATE_READY',
  level: result.accepted.level,
  fingerprint: result.accepted.fingerprint,
  ...result.accepted.result,
} : null;
const report = {
  status: accepted ? 'FORMAL_CANDIDATE_READY' : 'FINITE_BATCH_EXHAUSTED',
  source: { type: 'campaign-level-template', level: 7 },
  target: { difficulty: 'hard', lower: 16, upper: 20 },
  finitePolicy: { maxCandidates: 8, shapeAndColorMutationRequired: true, noInfiniteRetry: true },
  attempts: result.attempts,
  accepted,
};
fs.writeFileSync(`${output}/league4-from-mainline-template.json`, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ status: report.status, attempts: report.attempts.length, accepted: Boolean(accepted), output: `${output}/league4-from-mainline-template.json` }));
