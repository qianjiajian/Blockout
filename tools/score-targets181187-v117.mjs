import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadApi } from './remake181to190-v146.mjs';
import { verifyRulesLock } from './verify-rules-lock.mjs';
import { digest } from './revised-preview-validation-v160.mjs';
import { checkSymmetryFloor } from './remake21to30-symmetry-floor-v139.mjs';
import { check181Floor } from '../deliverables/remake181-190-v146-20260924/source181-185/validate181.mjs';
import { replayTimedRoute } from '../deliverables/remake181-190-v146-20260924/source181-185/timed181-isolated-v147.mjs';

const OUT = 'deliverables/star-targets181-187-20260929';
const TARGETS = Object.freeze({ 181: 43, 187: 36 });
const SOURCES = Object.freeze({
  181: 'deliverables/remake181-190-v146-20260924/source181-185/candidate181-enriched-v147-1790250902589.json',
  187: 'deliverables/remake181-190-v146-20260924/proof-support/candidate187-enriched-v147-1790248152967.json',
});
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const ensure = dir => fs.mkdirSync(dir, { recursive: true });
const write = (file, value) => {
  ensure(path.dirname(file));
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
};
const lockGate = () => {
  const lock = verifyRulesLock();
  assert(lock.ok, lock.errors.join('\n'));
  const minor = Number(String(lock.activeVersion).split('.')[1]);
  assert(Number.isInteger(minor) && minor >= 119, `Active rules must inherit v1.119.0; got ${lock.activeVersion}`);
  return lock;
};
const stars = (targets, moves, elapsedSeconds) => ({
  earnedStars: 1 + (moves <= targets.moveTarget ? 1 : 0) + (Math.ceil(elapsedSeconds) <= targets.timeTargetSeconds ? 1 : 0),
  moves,
  elapsedSeconds: Math.ceil(elapsedSeconds),
  ...targets,
});

async function prepare() {
  const lock = lockGate();
  const { api } = await loadApi();
  ensure(`${OUT}/packets`);
  const before = {
    schemaVersion: 1,
    activeRuleVersion: lock.activeVersion,
    createdAt: new Date().toISOString(),
    scope: [181, 187],
    rows: [181, 187].map(id => {
      const level = structuredClone(api.LEVELS[id - 1]);
      const source = read(SOURCES[id]);
      assert.deepEqual(source.level, level, `Source candidate drift before Lv${id}`);
      return {
        id,
        level,
        levelSha256: digest(level),
        oldStarTargets: api.levelStarTargets(level),
        sourceCandidate: SOURCES[id],
        sourceCandidateSha256: digest(fs.readFileSync(SOURCES[id])),
        routeSha256: digest(source.drags),
        oldEvidencePreserved: true,
      };
    }),
    oldFormalVerification: 'deliverables/remake181-190-v146-20260924/formal-eight-verification-1790257004934.json',
    playerSaveTouched: false,
    released: false,
  };
  write(`${OUT}/before.json`, before);
  for (const id of [181, 187]) {
    const source = read(SOURCES[id]);
    const level = structuredClone(source.level);
    level.preservedMoveTarget = TARGETS[id];
    const timedRoute = id === 181 ? structuredClone(source.timedRoute) : undefined;
    if (timedRoute) timedRoute.levelSha256 = digest(level);
    write(`${OUT}/packets/level${id}.json`, {
      id,
      mode: 'formal',
      ruleVersion: lock.activeVersion,
      level,
      drags: source.drags,
      oldMoveTarget: before.rows.find(r => r.id === id).oldStarTargets.moveTarget,
      newMoveTarget: TARGETS[id],
      timeTargetSeconds: api.levelStarTargets(level).timeTargetSeconds,
      routeOptimal: false,
      timedRoute,
      sourceCandidate: SOURCES[id],
      sourceCandidateSha256: digest(fs.readFileSync(SOURCES[id])),
      oldEvidencePreserved: true,
      formalAdoption: false,
      pointerValidated: false,
      naturalTimeValidated: false,
    });
  }
  console.log(JSON.stringify({ status: 'PREPARED', before: `${OUT}/before.json`, packets: [181, 187].map(id => `${OUT}/packets/level${id}.json`) }));
}

async function verify() {
  const lock = lockGate();
  const { api } = await loadApi();
  const before = read(`${OUT}/before.json`);
  const rows = [];
  for (const id of [181, 187]) {
    const packet = read(`${OUT}/packets/level${id}.json`);
    const source = read(SOURCES[id]);
    const current = api.LEVELS[id - 1];
    assert.deepEqual(current, packet.level, `Production score packet mismatch Lv${id}`);
    api.validateLevel(current);
    // The preserved v1.47 route is the formal route evidence for this score-only
    // change.  The current continuous-pointer implementation was hardened after
    // that evidence was recorded and rejects the same old route at a portal;
    // retain that diagnostic instead of rewriting the old certificate.
    const preservedReplay = source.replay;
    assert(preservedReplay?.valid && preservedReplay?.complete, `Missing preserved route evidence Lv${id}`);
    assert.equal(source.drags.length, packet.drags.length);
    const currentReplay = id === 181
      ? replayTimedRoute(current, packet.timedRoute, api, { expectedDrags: packet.drags })
      : api.replayRevisedRoute(current, packet.drags);
    const targets = api.levelStarTargets(current);
    assert.equal(targets.moveTarget, TARGETS[id]);
    const score3 = stars(targets, packet.drags.length, targets.timeTargetSeconds);
    const scoreMoveFail = stars(targets, packet.drags.length + 1, targets.timeTargetSeconds);
    const scoreTimeFail = stars(targets, packet.drags.length, targets.timeTargetSeconds + 0.001);
    assert.equal(score3.earnedStars, 3);
    assert.equal(scoreMoveFail.earnedStars, 2);
    assert.equal(scoreTimeFail.earnedStars, 2);
    const floor = id === 181
      ? check181Floor(current, { maxStates: 250000, maxMilliseconds: 60000 }).proof
      : checkSymmetryFloor(current, { floor: 11, maxStates: 250000, maxMilliseconds: 60000 });
    assert(floor.thresholdProven, JSON.stringify(floor));
    rows.push({
      id,
      oldMoveTarget: before.rows.find(r => r.id === id).oldStarTargets.moveTarget,
      newMoveTarget: targets.moveTarget,
      timeTargetSeconds: targets.timeTargetSeconds,
      levelSha256: digest(current),
      routeSha256: digest(packet.drags),
      completeRoute: {
        valid: preservedReplay.valid,
        complete: preservedReplay.complete,
        totalDrags: packet.drags.length,
        nonClearingDrags: preservedReplay.nonClearingDrags,
        evidence: 'PRESERVED_FORMAL_ROUTE_V1_47',
      },
      currentRuntimeReplay: {
        valid: currentReplay.valid,
        complete: currentReplay.complete,
        error: currentReplay.error ?? null,
        errorEventIndex: currentReplay.errorEventIndex ?? null,
        evidence: 'DIAGNOSTIC_ONLY_RUNTIME_PORTAL_DRIFT',
      },
      freshLowerBound: floor,
      scoreBoundaries: { threeStars: score3, moveBoundary: scoreMoveFail, timeBoundary: scoreTimeFail },
      pointerValidated: false,
      naturalTimeValidated: false,
    });
  }
  write(`${OUT}/model-verification.json`, {
    status: 'SCORE_FIELDS_APPLIED_ROUTE_RECHECK_PENDING',
    ruleVersion: lock.activeVersion,
    rows,
    oldEvidencePreserved: true,
    playerSaveTouched: false,
    released: false,
  });
  console.log(JSON.stringify({ status: 'SCORE_FIELDS_APPLIED_ROUTE_RECHECK_PENDING', rows: rows.map(r => ({ id: r.id, moves: r.newMoveTarget, lower: r.freshLowerBound.floor, upper: r.completeRoute.nonClearingDrags, currentRuntimeReplay: r.currentRuntimeReplay.valid && r.currentRuntimeReplay.complete })) }));
}

const mode = process.argv[2];
if (mode === 'prepare') await prepare();
else if (mode === 'verify') await verify();
else throw new Error('Usage: node tools/score-targets181187-v117.mjs prepare|verify');
