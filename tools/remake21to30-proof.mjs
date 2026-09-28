import {checkFreezeBarrierFloor} from './remake21to30-freeze-bound.mjs';
import {checkFastFloor} from './level21-reposition-floor.mjs';
import {digest} from './revised-preview-validation-v160.mjs';

// Two independent, restricted-domain proofs. Neither accepts an agent's
// supplied certificate. A complete authoritative-model witness is mandatory
// separately; a dead end or an exhausted search budget is never a pass.
export function proveRemakeFloor(level,api,{floor,maxStates=200000,maxMilliseconds=30000}={}){
  const barrier=checkFreezeBarrierFloor(level,api,{floor});
  if(barrier.thresholdProven)return barrier;
  // This audited historical algorithm already requires explicit v1.4. It
  // permits optional gate contact and unbounded time, so its action graph is
  // a SUPERSET of current inputs. Exhausting all costs < floor is a bound.
  const graph=checkFastFloor(level,{floor,maxStates,maxMilliseconds});
  return {method:'optional-exit-gesture-superset-v1',levelSha256:digest(level),
    floor,lowerBound:graph.thresholdProven?floor:barrier.lowerBound,
    status:graph.status,thresholdProven:graph.thresholdProven,graph,barrier,
    solvabilityValidated:false,pointerValidated:false};
}
