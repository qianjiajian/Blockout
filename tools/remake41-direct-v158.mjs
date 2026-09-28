import fs from 'node:fs';
import assert from 'node:assert/strict';
import { loadApi as loadBase } from './remake41to50-v146.mjs';
import { verifyRulesLock } from './verify-rules-lock.mjs';
import { digest } from './revised-preview-validation-v160.mjs';
import { auditOpeningCoverage } from './revised-opening-coverage.mjs';
import { auditHiddenCoverage } from './revised-hidden-coverage.mjs';
import { auditGateSpanLimits } from './revised-gate-span-limits.mjs';
import { auditGeneratorQueueColors } from './revised-generator-queue-colors.mjs';
import { measureRoute } from './remake21to30-quality.mjs';

export const VERSION = '1.58.0';
export const OUTPUT = 'deliverables/remake41-v158-20260926';
export const BASELINE = 'deliverables/remake41-50-v146-20260924/baseline.json';
export const TARGET = Object.freeze({ id: 41, difficulty: 'normal', min: 11, max: 15 });

export function ruleGate() {
  const lock = verifyRulesLock();
  assert(lock.ok, lock.errors.join('\n'));
  assert.equal(lock.activeVersion, VERSION, `Expected active ${VERSION}`);
  return lock;
}

export async function loadApi() { return loadBase(); }

export function checkCandidate(data, baseline, api) {
  ruleGate();
  const { level, drags } = data;
  assert.equal(level.id, TARGET.id);
  assert.equal(level.difficulty, TARGET.difficulty);
  assert.equal(level.mechanismRules, 'revised-2026-09-23-v1.4');
  const old = baseline.levels[level.id - 1];
  assert.deepEqual([level.width, level.height, level.playable, level.blocked, level.seams, level.id, level.timeSeconds, level.reward, level.parMoves],
    [old.level.width, old.level.height, old.level.playable, old.level.blocked, old.level.seams, old.level.id, old.level.timeSeconds, old.level.reward, old.level.parMoves]);
  assert.deepEqual(api.levelStarTargets(level), api.levelStarTargets(old.level));
  api.validateLevel(level);
  assert(!level.flipDoors?.length && !level.coloredGrids?.length && !level.elevators?.length && !level.conveyors?.length);
  assert(level.blocks.every(b => !b.star && !b.rotationBadge && b.timedBombSeconds === undefined));
  assert(level.blocks.every(b => api.matchFormalBlockShape(b.shape, 'native-only')?.quarterTurns === 0));
  const model = new api.PuzzleModel(structuredClone(level));
  const checks = {
    opening: auditOpeningCoverage(model.snapshot()),
    hidden: auditHiddenCoverage(level),
    gates: auditGateSpanLimits(level),
    queue: auditGeneratorQueueColors(level),
    art: api.auditCandidateBlockArt(level),
  };
  for (const [name, result] of Object.entries(checks)) assert(result.passed, `${name}: ${JSON.stringify(result)}`);
  const replay = api.replayRevisedRoute(level, drags);
  assert(replay.valid && replay.complete, JSON.stringify(replay));
  assert.equal(replay.nonClearingDrags, 15);
  assert(replay.nonClearingDrags <= TARGET.max);
  return {
    id: 41, ruleVersion: VERSION, levelSha256: digest(level), routeSha256: digest(drags),
    lowerBound: null, upperBound: replay.nonClearingDrags, lowerBoundValidated: false,
    difficultyCertified: false, adoptionBasis: 'USER_DIRECT_WRITE_LOWER_BOUND_UNVERIFIED',
    checks, replay, measurements: measureRoute(level, drags, api), formalPointerValidated: false,
    naturalClockValidated: false, releaseApproved: false,
  };
}

if (process.argv[1]?.endsWith('remake41-direct-v158.mjs')) {
  const candidate = process.argv[2];
  assert(candidate, 'Usage: node tools/remake41-direct-v158.mjs CANDIDATE.json');
  const data = JSON.parse(fs.readFileSync(candidate));
  const baseline = JSON.parse(fs.readFileSync(BASELINE));
  const { api } = await loadApi();
  const result = checkCandidate(data, baseline, api);
  console.log(JSON.stringify({ status: 'PASS_CANDIDATE_ONLY', ...result }));
}
