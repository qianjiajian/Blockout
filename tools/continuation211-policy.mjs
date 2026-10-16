/**
 * Pure acceptance policy for newly generated 211–220 objects.
 * A route is an upper-bound witness, never a lower-bound certificate.
 */
export const CONTINUATION_211_BANDS = Object.freeze({
  easy: Object.freeze([5, 10]),
  normal: Object.freeze([11, 15]),
  hard: Object.freeze([16, 20]),
  super: Object.freeze([21, 30]),
});

const DIFFICULTIES = Object.freeze([
  'easy', 'normal', 'normal', 'hard', 'easy',
  'normal', 'hard', 'easy', 'normal', 'super',
]);
const fingerprint = value => typeof value === 'string' && /^[a-f\d]{64}$/i.test(value);
const natural = value => Number.isSafeInteger(value) && value >= 0;

export function evaluateContinuationCandidate(input) {
  const { levelId, difficulty, levelSha256, route, lowerBound } = input ?? {};
  const result = (status, detail, extra = {}) => ({
    status, detail, levelId, levelSha256, acceptedSpatial: false,
    needsProof: false, ...extra,
  });
  if (!Number.isInteger(levelId) || levelId < 211 || levelId > 220
    || difficulty !== DIFFICULTIES[levelId - 211] || !fingerprint(levelSha256)) {
    return result('INVALID_CANDIDATE', 'Expected a 211–220 id, its fixed difficulty, and an exact SHA-256.');
  }
  const [minimum, maximum] = CONTINUATION_211_BANDS[difficulty];
  if (route?.valid !== true || route?.complete !== true
    || !natural(route.nonClearingDrags)) {
    return result('REJECTED_INCOMPLETE_ROUTE', 'A valid complete route with its actual non-clearing count is required.');
  }
  if (route.levelSha256 !== levelSha256) {
    return result('REJECTED_ROUTE_BINDING', 'The route must be bound to this exact candidate object.');
  }
  const U = route.nonClearingDrags;
  // A constructive below-band route already disproves the required floor.
  // Reject it before running any lower-bound search.
  if (U < minimum) return result('REJECTED_ROUTE_BELOW_BAND', 'The complete route disproves the required minimum.', { U, minimum, maximum });
  if (U > maximum) return result('REJECTED_ROUTE_ABOVE_BAND', 'The current complete witness exceeds the difficulty maximum.', { U, minimum, maximum });
  if (lowerBound?.status === 'relaxed-shortcut') {
    return result('REGENERATE_RELAXED_SHORTCUT', 'This abstraction cannot certify the target; regenerate within the finite policy.', { U, minimum, maximum });
  }
  if (lowerBound?.status !== 'threshold-proven') {
    return result('PENDING_LOWER_BOUND', 'Unknown, incomplete, or exhausted proof is not a certificate.', { U, minimum, maximum, needsProof: true });
  }
  if (lowerBound.levelSha256 !== levelSha256) {
    return result('REJECTED_PROOF_BINDING', 'The lower-bound certificate belongs to a different object.', { U, minimum, maximum });
  }
  const L = lowerBound.floor;
  if (!natural(L) || L < minimum) {
    return result('REJECTED_LOWER_BOUND_BELOW_BAND', 'The proved floor is weaker than the difficulty minimum.', { L, U, minimum, maximum });
  }
  if (L > U) {
    return result('REJECTED_CONTRADICTORY_BOUNDS', 'A sound lower bound cannot exceed a valid complete witness.', { L, U, minimum, maximum });
  }
  return result('SPATIAL_BOUNDS_PASSED', 'Fresh bound and complete route lie within the same required band.', {
    acceptedSpatial: true, L, U, minimum, maximum,
  });
}

/** Finite per-level attempt ledger. It never selects a failed candidate. */
export function createFiniteRegenerationController({ maxAttempts = 3 } = {}) {
  if (!Number.isSafeInteger(maxAttempts) || maxAttempts < 1) throw new RangeError('maxAttempts must be a positive integer');
  const attempts = new Map();
  let acceptedHash = null;
  return {
    begin(levelSha256) {
      if (!fingerprint(levelSha256)) throw new TypeError('A SHA-256 candidate fingerprint is required');
      if (acceptedHash) return { admitted: false, reason: 'ALREADY_ACCEPTED', acceptedHash };
      if (attempts.has(levelSha256)) return { admitted: false, reason: 'DUPLICATE_FINGERPRINT' };
      if (attempts.size >= maxAttempts) return { admitted: false, reason: 'ATTEMPT_CAP' };
      const attempt = attempts.size + 1;
      attempts.set(levelSha256, { attempt, levelSha256, status: 'RUNNING' });
      return { admitted: true, attempt };
    },
    finish(levelSha256, evaluation) {
      const row = attempts.get(levelSha256);
      if (!row || row.status !== 'RUNNING') throw new Error('Only an admitted unfinished fingerprint can be finished');
      if (evaluation?.levelSha256 !== levelSha256) throw new Error('Evaluation fingerprint mismatch');
      if (typeof evaluation.status !== 'string') throw new TypeError('Evaluation status is required');
      const accepted = evaluation.acceptedSpatial === true && evaluation.status === 'SPATIAL_BOUNDS_PASSED';
      row.status = evaluation.status;
      row.acceptedSpatial = accepted;
      if (accepted) acceptedHash = levelSha256;
      return { acceptedSpatial: accepted, acceptedHash, regenerate: !accepted && attempts.size < maxAttempts };
    },
    snapshot() {
      return {
        maxAttempts, acceptedHash,
        exhausted: acceptedHash === null && attempts.size >= maxAttempts
          && [...attempts.values()].every(row => row.status !== 'RUNNING'),
        attempts: [...attempts.values()].map(row => ({ ...row })),
      };
    },
  };
}

export const CONTINUATION_ADOPTION_GATES = Object.freeze([
  'openingCoverage', 'hiddenCoverage', 'mechanismContract', 'adjacency',
  'nativeArt', 'sourceReview', 'pointer320x568', 'pointer496x1078',
  'naturalClock', 'starSettlement',
]);

/**
 * Formal-data eligibility is separate from a spatial pass and campaign wiring.
 * Every runtime/static gate is bound to the candidate; omitted gates fail shut.
 */
export function continuationAdoptionEligibility({ evaluation, gates } = {}) {
  const failures = [];
  if (evaluation?.acceptedSpatial !== true || evaluation.status !== 'SPATIAL_BOUNDS_PASSED') failures.push('spatialBounds');
  for (const key of CONTINUATION_ADOPTION_GATES) {
    const gate = gates?.[key];
    if (gate?.passed !== true || !fingerprint(evaluation?.levelSha256)
      || gate.levelSha256 !== evaluation.levelSha256) failures.push(key);
  }
  return {
    eligible: failures.length === 0,
    levelSha256: evaluation?.levelSha256 ?? null,
    failures,
    // This function cannot authorize extending a non-contiguous campaign.
    productionCampaignWiringEvaluated: false,
  };
}
