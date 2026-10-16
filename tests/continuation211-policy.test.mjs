import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CONTINUATION_ADOPTION_GATES,
  continuationAdoptionEligibility,
  createFiniteRegenerationController,
  evaluateContinuationCandidate,
} from '../tools/continuation211-policy.mjs';

const A = 'a'.repeat(64);
const B = 'b'.repeat(64);
const C = 'c'.repeat(64);
const candidate = (overrides = {}) => ({
  levelId: 212, difficulty: 'normal', levelSha256: A,
  route: { valid: true, complete: true, nonClearingDrags: 13, levelSha256: A },
  lowerBound: { status: 'threshold-proven', floor: 11, levelSha256: A },
  ...overrides,
});

test('a complete zero-reposition route is rejected before requesting a lower-bound proof', () => {
  const result = evaluateContinuationCandidate(candidate({
    route: { valid: true, complete: true, nonClearingDrags: 0, levelSha256: A }, lowerBound: undefined,
  }));
  assert.equal(result.status, 'REJECTED_ROUTE_BELOW_BAND');
  assert.equal(result.needsProof, false);
  assert.equal(result.acceptedSpatial, false);
});

test('a complete witness within the band and fresh same-object lower bound can pass', () => {
  const result = evaluateContinuationCandidate(candidate());
  assert.equal(result.acceptedSpatial, true);
  assert.equal(result.status, 'SPATIAL_BOUNDS_PASSED');
  assert.equal(result.L, 11);
  assert.equal(result.U, 13);
});

test('over-maximum witnesses trigger regeneration without spending proof budget', () => {
  const result = evaluateContinuationCandidate(candidate({ route: { valid: true, complete: true, nonClearingDrags: 16, levelSha256: A } }));
  assert.equal(result.status, 'REJECTED_ROUTE_ABOVE_BAND');
  assert.equal(result.needsProof, false);
});

test('unknown and exhausted searches never count as proof', () => {
  for (const status of [undefined, 'unknown', 'interrupted', 'budget-exhausted']) {
    const result = evaluateContinuationCandidate(candidate({ lowerBound: { status, floor: 11, levelSha256: A } }));
    assert.equal(result.acceptedSpatial, false);
    assert.equal(result.needsProof, true);
  }
});

test('a relaxed shortcut triggers regeneration without certifying a lower bound', () => {
  assert.equal(evaluateContinuationCandidate(candidate({ lowerBound: { status: 'relaxed-shortcut' } })).status, 'REGENERATE_RELAXED_SHORTCUT');
});

test('incomplete route and wrong-object evidence cannot pass', () => {
  assert.equal(evaluateContinuationCandidate(candidate({ route: { valid: true, complete: false, nonClearingDrags: 13, levelSha256: A } })).status, 'REJECTED_INCOMPLETE_ROUTE');
  assert.equal(evaluateContinuationCandidate(candidate({ route: { valid: true, complete: true, nonClearingDrags: 13, levelSha256: B } })).status, 'REJECTED_ROUTE_BINDING');
  assert.equal(evaluateContinuationCandidate(candidate({ lowerBound: { status: 'threshold-proven', floor: 11, levelSha256: B } })).status, 'REJECTED_PROOF_BINDING');
});

test('weak or contradictory lower bounds cannot pass', () => {
  assert.equal(evaluateContinuationCandidate(candidate({ lowerBound: { status: 'threshold-proven', floor: 10, levelSha256: A } })).status, 'REJECTED_LOWER_BOUND_BELOW_BAND');
  assert.equal(evaluateContinuationCandidate(candidate({ lowerBound: { status: 'threshold-proven', floor: 14, levelSha256: A } })).status, 'REJECTED_CONTRADICTORY_BOUNDS');
});

test('difficulty rhythm and object identity are mandatory', () => {
  assert.equal(evaluateContinuationCandidate(candidate({ difficulty: 'easy' })).status, 'INVALID_CANDIDATE');
  assert.equal(evaluateContinuationCandidate(candidate({ levelSha256: 'missing' })).status, 'INVALID_CANDIDATE');
});

test('finite controller skips repeated failed fingerprints and never selects a failure', () => {
  const controller = createFiniteRegenerationController({ maxAttempts: 2 });
  assert.equal(controller.begin(A).admitted, true);
  const failed = evaluateContinuationCandidate(candidate({ lowerBound: undefined }));
  assert.equal(controller.finish(A, failed).acceptedHash, null);
  assert.equal(controller.begin(A).reason, 'DUPLICATE_FINGERPRINT');
  assert.equal(controller.begin(B).attempt, 2);
  controller.finish(B, { ...failed, levelSha256: B });
  assert.equal(controller.begin(C).reason, 'ATTEMPT_CAP');
  const snapshot = controller.snapshot();
  assert.equal(snapshot.acceptedHash, null);
  assert.equal(snapshot.exhausted, true);
  assert.equal(snapshot.attempts.length, 2);
});

test('finite controller selects an actual successful attempt and stops further search', () => {
  const controller = createFiniteRegenerationController({ maxAttempts: 3 });
  controller.begin(A);
  const result = controller.finish(A, evaluateContinuationCandidate(candidate()));
  assert.equal(result.acceptedHash, A);
  assert.equal(result.regenerate, false);
  assert.equal(controller.begin(B).reason, 'ALREADY_ACCEPTED');
  assert.equal(controller.snapshot().attempts.length, 1);
});

test('controller rejects unstarted, mismatched, and repeated completion', () => {
  const controller = createFiniteRegenerationController();
  assert.throws(() => controller.finish(A, evaluateContinuationCandidate(candidate())));
  controller.begin(A);
  assert.throws(() => controller.finish(A, { levelSha256: B, status: 'PENDING_LOWER_BOUND' }));
  controller.finish(A, evaluateContinuationCandidate(candidate()));
  assert.throws(() => controller.finish(A, evaluateContinuationCandidate(candidate())));
});

test('spatial pass alone is ineligible for formal adoption; all exact-object gates can pass', () => {
  const evaluation = evaluateContinuationCandidate(candidate());
  assert.equal(continuationAdoptionEligibility({ evaluation }).eligible, false);
  const gates = Object.fromEntries(CONTINUATION_ADOPTION_GATES.map(key => [key, { passed: true, levelSha256: A }]));
  assert.equal(continuationAdoptionEligibility({ evaluation, gates }).eligible, true);
  gates.pointer320x568.levelSha256 = B;
  assert.deepEqual(continuationAdoptionEligibility({ evaluation, gates }).failures, ['pointer320x568']);
});
