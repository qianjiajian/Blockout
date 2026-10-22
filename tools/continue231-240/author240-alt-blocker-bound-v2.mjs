// Algorithm-identical terminology wrapper. The qualified v1 implementation
// already derives the sole ordinary color from the level, never from a name.
import {blockerBound240 as original} from './author240-alt-blocker-bound.mjs';
export {unionPaths,popcount} from './author240-alt-blocker-bound.mjs';
export function blockerBound240(level,api,options){
 const result=original(level,api,options);
 if(result.proof)result.proof=result.proof.replaceAll('nonpurple','nonordinary-color').replaceAll('purple','ordinary-color');
 return result;
}
