import {levelSha256} from '../formal-v2/contract.mjs';
import {assertPlainProofDomain} from '../formal-v2/proof-plain.mjs';
import {projectStaticConstraints} from '../formal-v2/constraint-projection.mjs';
import {projectOpeningOuterBodies} from '../formal-v2/inventory-projection.mjs';
import {projectFullPhysicalShutters} from '../formal-v2/shutter-materialization-projection.mjs';
import {selectBoundedStrategy} from '../formal-v3/bounded-proof.mjs';
import {projectIcePreservingConstraints,ICE_PRESERVING_LOWER_METHOD} from '../formal-v3/ice-preserving-projection.mjs';
import {reservedGuardBudget,guardedPlainTask,guardedIceTask} from '../formal-v3/reserved-guard-budget.mjs';

/** Same projection choice and frozen engines as the historical lower task.
 * Only its explicit policy floor changes. The caller owns the single ledger
 * claim; no fallback after a search, no retry and no altered physical object. */
export function boundedLowerTaskV198(runtime, level, difficulty, policy, budget = {}) {
  const band = policy.bands[difficulty];
  if (!band || policy.version !== '1.198.0') throw Error('Reviewed daily difficulty policy required');
  const options = reservedGuardBudget(budget), before = levelSha256(level);
  runtime.validateLevel(level);
  const strategy = selectBoundedStrategy(level).lower;
  let projection = null, method, input = level, engine;
  if (strategy === 'ice-native') {
    method = 'v3-native-static-ice'; engine = guardedIceTask;
  } else if (strategy === 'ice-preserving') {
    projection = projectIcePreservingConstraints(level, runtime);
    input = projection.projectedLevel; method = ICE_PRESERVING_LOWER_METHOD; engine = guardedIceTask;
  } else {
    let plain = false;
    try { assertPlainProofDomain(level); plain = true; } catch {}
    if (!plain) for (const project of [() => projectStaticConstraints(level), () => projectFullPhysicalShutters(level,runtime), () => projectOpeningOuterBodies(level,runtime)]) {
      try {
        const value = project(); runtime.validateLevel(value.projectedLevel); assertPlainProofDomain(value.projectedLevel);
        if (value.sourceLevelSha256 !== before || value.projectedLevelSha256 !== levelSha256(value.projectedLevel)) throw Error('Projection hash mismatch');
        projection = value; break;
      } catch {}
    }
    input = projection?.projectedLevel ?? level;
    method = projection ? `v3-${projection.method}` : 'v3-plain';
    if (plain || projection) engine = guardedPlainTask;
  }
  const result = engine ? engine(input,runtime,{floor:band.lower,...options}) : {
    status:'unsupported', thresholdProven:false, termination:'no-qualified-plain-projection', budget:options,
    discoveredStates:0, exploredStates:0, attemptedTransitions:0,
  };
  if (levelSha256(level) !== before) throw Error('Lower task mutated original');
  return {method,inputLevelSha256:before,projectedLevelSha256:projection?.projectedLevelSha256 ?? null,
    projection,requiredFloor:band.lower,result,difficultyPolicyVersion:policy.version};
}
