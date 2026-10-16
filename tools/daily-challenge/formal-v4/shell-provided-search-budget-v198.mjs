import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

// Metadata only. No model, projection, replay, solver or history imports.
// A route sealed before the unique claim bypasses upper search altogether.
// The unused upper options are the minimum accepted by the frozen API; they
// are not an allocation permitting an upper call or fallback.
export const SHELL_PROVIDED_LOWER_BUDGET=Object.freeze({maxStates:9999,maxTransitions:10000000,maxMicroStates:3000000,maxDragStates:10000,maxMilliseconds:30000});
export const SHELL_PROVIDED_UNUSED_UPPER_BUDGET=Object.freeze({maxStates:1,maxTransitions:1,maxMicroStates:1,maxDragStates:1,maxMilliseconds:1});
export const SHELL_PROVIDED_SEARCH_LIMITS=Object.freeze({upperCallsMaximum:0,lowerCallsMaximum:1,jointCallsMaximum:0,totalSearchCallsMaximum:1,registeredWorldsPerSearch:9999,terminalAllowancePerSearch:1,fullWorldsPerSearchMaximum:10000,combinedFullWorldsMaximum:10000,upperInternalCanonicalReplaysMaximum:0,finalCanonicalReplaysMaximum:1,finalIndependentReplaysMaximum:1,retryAllowed:false,fallbackAllowed:false,rebandAllowed:false});
const FROZEN='45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804',GUARD='raw-set-9999-plus-one-terminal-candidate-v1';
const isHash=h=>typeof h==='string'&&/^[a-f0-9]{64}$/.test(h);
const integer=(n,min,max,message)=>assert(Number.isSafeInteger(n)&&n>=min&&n<=max,message);
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().filter(k=>value[k]!==undefined).map(k=>[k,canonical(value[k])])):value;
const valueHash=value=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');

export function assertSealedShellProvidedRouteV198(candidate){
 assert(Array.isArray(candidate.drags)&&candidate.drags.length>0,'Nonempty route must be sealed before the claim');
 for(const drag of candidate.drags){
  assert(drag&&typeof drag==='object'&&!Array.isArray(drag));
  assert(Object.keys(drag).every(k=>['blockId','path','exitSide'].includes(k)));assert(typeof drag.blockId==='string'&&drag.blockId.length);
  assert(Array.isArray(drag.path));for(const point of drag.path)assert(Array.isArray(point)&&point.length===2&&point.every(Number.isSafeInteger));
  if(Object.hasOwn(drag,'exitSide'))assert(['top','right','bottom','left'].includes(drag.exitSide));
  assert(drag.path.length>0||drag.exitSide,'Empty non-exit gesture cannot form a route');
 }
 assert(isHash(candidate.routeSha256));assert.equal(valueHash(candidate.drags),candidate.routeSha256,'Whole original supplied-route hash');
 return candidate.routeSha256;
}
export function authoredShellProvidedMathOptionsV198(failedParentId){
 assert(isHash(failedParentId),'Actual failed-parent identity required');
 return{routeBudget:{...SHELL_PROVIDED_UNUSED_UPPER_BUDGET},lowerBudget:{...SHELL_PROVIDED_LOWER_BUDGET},redesignOf:failedParentId,routeStrategy:'native',searchUpper:128};
}
export function assertShellProvidedMathOptionsV198(options,failedParentId){
 assert.deepEqual(options,authoredShellProvidedMathOptionsV198(failedParentId),'No new budget, accepted-base exception, retry, alternative strategy or fallback');return options;
}
export function assertShellProvidedSearchPlanV198(plan,failedParentId,providedRouteSha256){
 assert(isHash(providedRouteSha256));assert(plan&&typeof plan==='object');
 assert.deepEqual(plan.strategy,{route:'provided',lower:'projected-plain'});
 assert.deepEqual(plan.upperBudget,SHELL_PROVIDED_UNUSED_UPPER_BUDGET);assert.deepEqual(plan.lowerBudget,SHELL_PROVIDED_LOWER_BUDGET);
 assert.equal(plan.searchUpper,128);assert.equal(plan.redesignOf,failedParentId);assert.equal(plan.providedRouteSha256,providedRouteSha256);
 assert.equal(plan.mechanismBaseReceipt,null);assert.equal(plan.acceptedBaseMechanismAdaptationRequested,false);assert.equal(plan.sameExactObjectRevalidationAllowed,false);
 assert.equal(plan.formedBeforeClaim,true);assert.equal(plan.difficultyPolicyVersion,'1.198.0');return plan;
}
function recordedLower(result){
 assert.deepEqual(result.budget,SHELL_PROVIDED_LOWER_BUDGET);
 integer(result.rawFullBoardStates,0,9999,'Raw lower state ceiling');integer(result.rawExploredStates,0,result.rawFullBoardStates,'Expanded lower states');
 for(const k of ['discoveredStates','visitedStates'])assert.equal(result[k],result.rawFullBoardStates);assert.equal(result.exploredStates,result.rawExploredStates);
 const g=result.guardAllowance;assert(g,'Original lower guard required');assert.equal(g.version,GUARD);assert.equal(g.frozenProofToolchainSha256,FROZEN);
 assert.deepEqual(g.wrapper,{path:'tools/daily-challenge/formal-v3/reserved-guard-budget.mjs',sha256:'9ee948a4bb195ee3d98bdbf8170ed8ab02c539926843d374dd213a855d135dd3'});
 assert.equal(g.registeredRawSetStates,result.rawFullBoardStates);assert.equal(g.registeredExpandedStates,result.rawExploredStates);assert.equal(g.registeredSetBudget,9999);
 assert.equal(g.unregisteredTerminalWorldAllowance,1);assert.equal(g.conservativeFullBoardStateUpperBound,result.rawFullBoardStates+1);assert.equal(g.hardWholeBoardLimit,10000);
 assert.equal(g.exactFullBoardVisitedCountClaimed,false);assert.equal(g.terminalBehavior,'first-unregistered-world-throws-and-immediately-returns-no-recovery-or-continuation');
 return{calls:1,registeredRawSetStates:result.rawFullBoardStates,conservativeFullWorlds:g.conservativeFullBoardStateUpperBound};
}
export function accountShellProvidedSearchReceiptV198(result,{entered,returned,failedParentId,providedRouteSha256}){
 assert.equal(typeof entered,'boolean');assert.equal(typeof returned,'boolean');assert(!returned||entered);assert(isHash(providedRouteSha256));
 const report={version:'shell-provided-original-route-single-lower-budget-v198',limits:SHELL_PROVIDED_SEARCH_LIMITS,qualifierEntered:entered,qualifierReturned:returned,providedRouteSha256,
  upper:null,lower:null,totalSearchCalls:null,registeredRawSetStatesSum:null,conservativeFullWorlds:null,replayCalls:{canonical:null,independent:null},
  combinedFullWorldsMaximum:10000,jointMathematicalCalls:0,exactFullWorldVisitedCountClaimed:false,
  note:'Supplied original route is replayed, never searched. One projected lower is permitted. Missing exceptional receipt fields remain UNKNOWN; no retry.'};
 const zero=()=>({calls:0,registeredRawSetStates:0,conservativeFullWorlds:0});
 if(!entered){assert.equal(result,null);report.upper=zero();report.lower=zero();report.replayCalls={canonical:0,independent:0};}
 else if(returned){
  assert(result&&typeof result==='object');assertShellProvidedSearchPlanV198(result.attemptPlan,failedParentId,providedRouteSha256);
  assert.equal(result.attemptPlan.inputLevelSha256,result.levelSha256);
  assert(result.route?.search===undefined||result.route.search===null,'Upper search is forbidden, including failed or empty search receipts');
  if(result.drags!==undefined){assertSealedShellProvidedRouteV198(result);assert.equal(result.routeSha256,providedRouteSha256);}
  const route=result.route,lower=result.lowerBound?.result;
  if(route){
   assert.equal(route.search,null);assert.equal(route.inputLevelSha256,result.levelSha256);assert.equal(route.routeSha256,providedRouteSha256);
   assert(route.canonicalReplay&&route.independentReplay,'Both original replay records must be preserved');
   assert.equal(route.witnessValidation?.providedRoute,true);assert.equal(route.witnessValidation.searchPerformed,false);assert.equal(route.witnessValidation.fullBoardSearchStates,0);
   assert.equal(route.witnessValidation.drags,result.drags.length);assert.equal(route.witnessValidation.unitSteps,result.drags.reduce((n,d)=>n+d.path.length,0));
   report.upper=zero();report.replayCalls={canonical:1,independent:1};
  }
  if(lower){
   assert(route,'Lower cannot precede original route validation');
   const b=result.lowerBound;assert.equal(b.method,'v3-opening-outer-bodies-inventory-erasure-v1');assert.equal(b.inputLevelSha256,result.levelSha256);
   assert.equal(b.projection?.method,'opening-outer-bodies-inventory-erasure-v1');assert.equal(b.projection.sourceLevelSha256,result.levelSha256);assert.equal(b.projection.upperBoundTransfer,false);
   assert.equal(b.projection.projectedLevelSha256,b.projectedLevelSha256);assert.equal(valueHash(b.projection.projectedLevel),b.projectedLevelSha256);assert.equal(lower.sourceLevelSha256,b.projectedLevelSha256);
   report.lower=recordedLower(lower);
  }
  if(!result.attempt&&['BLOCKED_STATIC','UNSUPPORTED_ROUTE_DOMAIN'].includes(result.status)){
   assert(!route&&!lower);assert.equal(result.accepted,false);report.upper=zero();report.lower=zero();report.replayCalls={canonical:0,independent:0};
  }else if(['REJECTED_ORIGINAL_ROUTE','COUNTEREXAMPLE_BELOW_BAND','UNKNOWN_UPPER_WITHIN_BAND'].includes(result.status)){
   assert(route&&!lower);assert.equal(result.accepted,false);report.lower=zero();
  }
  if(result.accepted){
   assert.equal(result.status,'FROZEN_MATH_V198_VERIFIED_AWAITING_DESIGN_AND_POINTER');assert(result.attempt&&route&&lower);
   // Frozen canonical reports have no top-level `failed` field; preserve the
   // producer's falsy-failed check. Independent replay explicitly records it.
   assert(!route.canonicalReplay.failed);assert.equal(route.independentReplay.failed,false);
   for(const r of [route.canonicalReplay,route.independentReplay]){assert(r.valid&&r.complete);assert.equal(r.nonClearingDrags,result.U);assert.equal(r.effectiveDrags,result.drags.length);}
   assert.equal(route.independentReplay.remainingBodies,0);assert.equal(route.independentReplay.remainingQueued,0);
   assert.equal(lower.status,'threshold-proven');assert.equal(lower.thresholdProven,true);assert.equal(lower.termination,'below-threshold-exhausted');
   assert.equal(lower.floor,result.band.lower);assert.equal(result.lowerBound.requiredFloor,result.band.lower);integer(lower.certifiedFloor,lower.floor,Number.MAX_SAFE_INTEGER,'Complete floor required');
   assert.equal(result.L,result.band.lower);integer(result.U,result.L,Number.MAX_SAFE_INTEGER,'Finite complete U required');if(result.band.upper!==null)assert(result.U<=result.band.upper);
  }
 }
 if(report.upper&&report.lower){report.totalSearchCalls=report.upper.calls+report.lower.calls;report.registeredRawSetStatesSum=report.upper.registeredRawSetStates+report.lower.registeredRawSetStates;report.conservativeFullWorlds=report.upper.conservativeFullWorlds+report.lower.conservativeFullWorlds;assert(report.totalSearchCalls<=1);assert(report.conservativeFullWorlds<=10000);}
 return report;
}
