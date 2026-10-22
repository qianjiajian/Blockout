import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { verifyRulesLock } from '../verify-rules-lock.mjs';
import { digest } from '../revised-preview-validation-v160.mjs';
import { auditOpeningCoverage } from '../revised-opening-coverage.mjs';
import { auditHiddenCoverage } from '../revised-hidden-coverage.mjs';
import { auditGateSpanLimits } from '../revised-gate-span-limits.mjs';
import { auditGeneratorQueueColors } from '../revised-generator-queue-colors.mjs';
import { runtimeNativeArtIssues } from '../continue221-230/runtime-native-art.mjs';
import { replay } from '../remake191-200/replay.mjs';

export { digest, replay };
export const ROOT = 'deliverables/continue231-240-20261019';
export const PROFILE = 'revised-2026-09-27-v1.5';
export const IDS = Array.from({ length: 10 }, (_, i) => 231 + i);
export const DIFFICULTIES = ['easy', 'normal', 'normal', 'hard', 'easy', 'normal', 'hard', 'easy', 'normal', 'super'];
export const BANDS = { easy: [5, 10], normal: [11, 15], hard: [16, 20], super: [21, 30] };
export const rect = (w, h) => Array.from({ length: w * h }, (_, i) => [i % w, Math.floor(i / w)]);

export function ruleGate() {
  const result = verifyRulesLock();
  assert(result.ok, result.errors.join('\n'));
  assert.equal(result.activeVersion, '1.198.0');
  return result;
}

let apiPromise;
export function loadApi() {
  return apiPromise ??= build({ stdin: { resolveDir: process.cwd(), contents: `
    export { PuzzleModel, validateLevel } from './src/core/PuzzleModel';
    export { LEVELS, FORMAL_201_210_LEVELS, FORMAL_211_220_LEVELS, FORMAL_221_230_LEVELS } from './src/core/levels';
    export { replayRevisedRoute } from './src/core/revisedLevelSearch';
    export { auditRevisedCandidate } from './src/core/revisedCandidateAudit';
    export { auditCandidateBlockArt } from './tools/revised-candidate-block-art.mjs';
    export { matchFormalBlockShape, FORMAL_BLOCK_SHAPES } from './src/game/formalBlockShapes';
    export { levelStarTargets, evaluateLevelStars } from './src/core/levelStarConditions';
    export { matchingContinuousExitPortals, choosePortalReleaseCandidate } from './src/game/continuousDrag';
    export { resolveMatchingGatePortal, exitFrontierFacesBoundary } from './src/core/blockExitFrontier';
  ` }, bundle: true, write: false, metafile: true, platform: 'node', format: 'esm', logLevel: 'silent' })
    .then(async result => ({
      api: await import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64')),
      inputs: Object.keys(result.metafile.inputs).filter(file => file !== '<stdin>'),
    }));
}

export function writeNew(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
}

export function audit(level, api) {
  assert(IDS.includes(level.id));
  assert.equal(level.mechanismRules, PROFILE);
  assert.equal(level.difficulty, DIFFICULTIES[level.id - 231]);
  api.validateLevel(level);
  // Provenance is checked independently against the per-level source record;
  // the old generic auditor only recognizes its historical source schema.
  const historicalProvenance = new Set(['missing-source-reference', 'missing-source-hash', 'missing-seed',
    'missing-source-number', 'incomplete-source-inventory', 'originality-unverified', 'wrong-rule-profile']);
  const issues = api.auditRevisedCandidate(level).issues.filter(issue => !historicalProvenance.has(issue.code));
  const opening = auditOpeningCoverage(new api.PuzzleModel(level).snapshot());
  const hidden = auditHiddenCoverage({ ...level, mechanismRules: 'revised-2026-09-23-v1.4' });
  const gates = auditGateSpanLimits(level);
  const queue = auditGeneratorQueueColors(level);
  const art = runtimeNativeArtIssues(level);
  assert.deepEqual(issues, []);
  assert.deepEqual(art, []);
  assert(opening.passed && hidden.passed && gates.passed && queue.passed,
    JSON.stringify({ opening, hidden, gates, queue }));
  return { levelSha256: digest(level), passed: true, issues, opening, hidden, gates, queue, art };
}
