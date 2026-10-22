import assert from 'node:assert/strict';

export function countBits(mask) {
  let count = 0;
  for (mask >>>= 0; mask; mask &= mask - 1) count++;
  return count;
}

export function validateClosureProblem({ bodies, goalClears }) {
  assert(Array.isArray(bodies) && bodies.length > 0 && bodies.length <= 31);
  assert(Number.isInteger(goalClears) && goalClears >= 1 && goalClears <= bodies.length);
  const full = 2 ** bodies.length - 1;
  for (const [i, body] of bodies.entries()) {
    assert(Number.isInteger(body.gateCount) && body.gateCount >= 0);
    assert(Array.isArray(body.masks));
    for (const mask of body.masks) {
      assert(Number.isInteger(mask) && mask >= 0 && mask <= full);
      assert.equal(mask & (1 << i), 0, 'A body must not obstruct its own complete trajectory');
    }
  }
}

// A parked identity loses only its initial obstruction. It does not become
// cleared: every body still needs an entire initial-to-exit path and an open gate.
export function parkingClosure(problem, parked) {
  const { bodies, goalClears } = problem;
  let cleared = 0, count = 0, changed = true;
  const order = [];
  while (changed && count < goalClears) {
    changed = false;
    for (let i = 0; i < bodies.length && count < goalClears; i++) {
      if ((cleared & (1 << i)) || bodies[i].gateCount > count) continue;
      const available = parked | cleared;
      if (!bodies[i].masks.some(mask => (mask & available) === mask)) continue;
      cleared |= 1 << i;
      count++;
      order.push(i);
      changed = true;
    }
  }
  return { cleared, count, order };
}

export function minimalMissingMasks(problem, parked, closure) {
  const available = parked | closure.cleared;
  let missing = [];
  for (let i = 0; i < problem.bodies.length; i++) {
    const body = problem.bodies[i];
    if ((closure.cleared & (1 << i)) || body.gateCount > closure.count) continue;
    for (const mask of body.masks) {
      const add = mask & ~available;
      assert(add !== 0, 'Branching is only valid at a fixed-point closure');
      if (missing.some(prior => (prior & add) === prior)) continue;
      missing = missing.filter(prior => (prior & add) !== add);
      missing.push(add);
    }
  }
  return missing;
}

/** Exact search of the finite initial-footprint relaxation below threshold.
 * A bucket is the cardinality of the set P, so first success is its exact
 * relaxed minimum. Branches add all still-present initial blockers of a possible
 * next clear. Subset pruning is safe: a smaller addition remains inside every
 * completion set containing a larger one, and monotone closure cannot hurt it.
 * A budget stop is UNKNOWN, never a lower certificate.
 */
export function solveParkingClosure(problem, {
  threshold = 11, maxStates = 100000, maxMilliseconds = 5000,
} = {}) {
  validateClosureProblem(problem);
  assert(Number.isInteger(threshold) && threshold >= 1 && threshold <= problem.bodies.length + 1);
  assert(Number.isInteger(maxStates) && maxStates >= 1);
  assert(Number.isFinite(maxMilliseconds) && maxMilliseconds >= 0);
  const began = Date.now(), n = problem.bodies.length;
  const buckets = Array.from({ length: Math.min(threshold, n + 1) }, () => []);
  buckets[0].push(0);
  const seen = new Set([0]);
  let exploredStates = 0, branches = 0, maxClearsSeen = 0;
  const result = (status, extra = {}) => ({
    status, thresholdProven: false, provenLowerBound: null, threshold,
    goalClears: problem.goalClears, bodyCount: n,
    exploredStates, discoveredStates: seen.size, branches, maxClearsSeen,
    elapsedMilliseconds: Date.now() - began, ...extra,
  });
  // All identities parked is the largest relaxation; failure here proves the
  // prefix itself impossible even in this abstraction, not a usable difficulty.
  const maximal = parkingClosure(problem, 2 ** n - 1);
  if (maximal.count < problem.goalClears) return result('relaxation-unreachable', {
    reason: 'Even all initial footprints removed cannot reach the required clear prefix',
    maximalClosure: maximal,
  });
  for (let cost = 0; cost < buckets.length; cost++) {
    const bucket = buckets[cost];
    for (let head = 0; head < bucket.length; head++) {
      if (Date.now() - began >= maxMilliseconds) return result('unknown', { reason: 'deadline' });
      const parked = bucket[head], closure = parkingClosure(problem, parked);
      exploredStates++;
      maxClearsSeen = Math.max(maxClearsSeen, closure.count);
      if (closure.count >= problem.goalClears) return result('complete', {
        minimum: cost, provenLowerBound: cost, minimumIsExact: true,
        relaxedWitness: { parked, parkedIds: problem.bodies.filter((_, i) => parked & (1 << i)).map(b => b.id), ...closure },
      });
      for (const add of minimalMissingMasks(problem, parked, closure)) {
        branches++;
        const next = parked | add, nextCost = countBits(next);
        assert(nextCost > cost);
        if (nextCost >= threshold || seen.has(next)) continue;
        if (seen.size >= maxStates) return result('unknown', { reason: 'state-budget' });
        seen.add(next);
        buckets[nextCost].push(next);
      }
    }
  }
  return result('complete', {
    minimum: null, minimumIsExact: false, thresholdProven: true,
    provenLowerBound: threshold, exhaustedCosts: [0, threshold - 1],
  });
}
