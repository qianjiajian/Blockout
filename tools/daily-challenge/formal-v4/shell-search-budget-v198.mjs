import assert from 'node:assert/strict';

// Metadata only. This module never imports a model, projection or search.
// The unchanged reserved guard engines each stop at 4999 registered worlds
// plus at most one terminal candidate. Preallocation, not shared counters,
// proves an upper bound of 10000 across two different searches.
export const SHELL_SEARCH_BUDGET=Object.freeze({maxStates:4999,maxTransitions:10000000,maxMicroStates:3000000,maxDragStates:10000,maxMilliseconds:30000});
export const SHELL_SEARCH_LIMITS=Object.freeze({upperCallsMaximum:1,lowerCallsMaximum:1,jointCallsMaximum:0,totalSearchCallsMaximum:2,registeredWorldsPerSearch:4999,terminalAllowancePerSearch:1,fullWorldsPerSearchMaximum:5000,combinedFullWorldsMaximum:10000,upperInternalCanonicalReplaysMaximum:1,finalCanonicalReplaysMaximum:1,finalIndependentReplaysMaximum:1,retryAllowed:false,fallbackAllowed:false,rebandAllowed:false});
export const SHELL_LOWER_METHOD='v3-opening-outer-bodies-inventory-erasure-v1';
const FROZEN='45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804';
const GUARD='raw-set-9999-plus-one-terminal-candidate-v1';
const integer=(n,min,max,message)=>assert(Number.isSafeInteger(n)&&n>=min&&n<=max,message);

export function authoredShellMathOptionsV198(failedParentId){
 assert(/^[a-f0-9]{64}$/.test(failedParentId),'Actual failed-parent identity required');
 return{routeBudget:{...SHELL_SEARCH_BUDGET},lowerBudget:{...SHELL_SEARCH_BUDGET},redesignOf:failedParentId,routeStrategy:'native',searchUpper:128};
}
export function assertShellMathOptionsV198(options,failedParentId){
 assert.deepEqual(options,authoredShellMathOptionsV198(failedParentId),'No custom budget, provided route, accepted-base exception, retry or alternative search');
 assert.equal((options.routeBudget.maxStates+1)+(options.lowerBudget.maxStates+1),10000);
 return options;
}
export function assertShellSearchPlanV198(plan,failedParentId){
 assert(plan&&typeof plan==='object');
 assert.deepEqual(plan.strategy,{route:'native',lower:'projected-plain'});
 assert.deepEqual(plan.upperBudget,SHELL_SEARCH_BUDGET);assert.deepEqual(plan.lowerBudget,SHELL_SEARCH_BUDGET);
 assert.equal(plan.searchUpper,128);assert.equal(plan.redesignOf,failedParentId);
 assert.equal(plan.providedRouteSha256,null);assert.equal(plan.mechanismBaseReceipt,null);
 assert.equal(plan.acceptedBaseMechanismAdaptationRequested,false);assert.equal(plan.sameExactObjectRevalidationAllowed,false);
 assert.equal(plan.formedBeforeClaim,true);assert.equal(plan.difficultyPolicyVersion,'1.198.0');
 return plan;
}
function recordedSearch(result){
 assert.deepEqual(result.budget,SHELL_SEARCH_BUDGET,'Original search budget must equal its preallocated half');
 integer(result.rawFullBoardStates,0,4999,'Raw registered world count outside shell half-budget');
 integer(result.rawExploredStates,0,result.rawFullBoardStates,'Expanded world count invalid');
 for(const k of ['discoveredStates','visitedStates'])assert.equal(result[k],result.rawFullBoardStates);
 assert.equal(result.exploredStates,result.rawExploredStates);
 const g=result.guardAllowance;assert(g,'Original guard receipt required');
 assert.equal(g.version,GUARD);assert.equal(g.frozenProofToolchainSha256,FROZEN);
 assert.deepEqual(g.wrapper,{path:'tools/daily-challenge/formal-v3/reserved-guard-budget.mjs',sha256:'9ee948a4bb195ee3d98bdbf8170ed8ab02c539926843d374dd213a855d135dd3'});
 assert.equal(g.registeredRawSetStates,result.rawFullBoardStates);assert.equal(g.registeredExpandedStates,result.rawExploredStates);
 assert.equal(g.registeredSetBudget,4999);assert.equal(g.unregisteredTerminalWorldAllowance,1);
 assert.equal(g.conservativeFullBoardStateUpperBound,result.rawFullBoardStates+1);assert.equal(g.hardWholeBoardLimit,10000);
 assert.equal(g.exactFullBoardVisitedCountClaimed,false);
 assert.equal(g.terminalBehavior,'first-unregistered-world-throws-and-immediately-returns-no-recovery-or-continuation');
 return{calls:1,registeredRawSetStates:result.rawFullBoardStates,conservativeFullWorlds:g.conservativeFullBoardStateUpperBound};
}

/** The original qualifier can catch an exception before saving its local
 * upper/lower result. Missing evidence on that path is UNKNOWN, never zero.
 * Caps remain fixed even when the actual call/count cannot be established. */
export function accountShellSearchReceiptV198(result,{entered,returned,failedParentId}){
 assert.equal(typeof entered,'boolean');assert.equal(typeof returned,'boolean');assert(!returned||entered);
 const report={version:'shell-native-projected-two-search-budget-v198',limits:SHELL_SEARCH_LIMITS,qualifierEntered:entered,qualifierReturned:returned,
  upper:null,lower:null,totalSearchCalls:null,registeredRawSetStatesSum:null,conservativeFullWorlds:null,
  combinedFullWorldsMaximum:10000,jointMathematicalCalls:0,exactFullWorldVisitedCountClaimed:false,
  note:'Native full-original upper and opening-outer projected lower are separate searches; missing exceptional evidence is unknown, with no retry.'};
 const zero={calls:0,registeredRawSetStates:0,conservativeFullWorlds:0};
 if(!entered){assert(result===null);report.upper={...zero};report.lower={...zero};}
 else if(returned){
  assert(result&&typeof result==='object');assertShellSearchPlanV198(result.attemptPlan,failedParentId);
  const upper=result.route?.search,lower=result.lowerBound?.result;
  if(upper)report.upper=recordedSearch(upper);
  if(lower){
   assert(upper,'Projected lower cannot precede original native upper');
   assert.equal(result.lowerBound.method,SHELL_LOWER_METHOD);assert.equal(result.lowerBound.inputLevelSha256,result.levelSha256);
   assert.equal(result.lowerBound.projection?.method,'opening-outer-bodies-inventory-erasure-v1');
   assert.equal(result.lowerBound.projection.sourceLevelSha256,result.levelSha256);
   assert.equal(result.lowerBound.projection.upperBoundTransfer,false);report.lower=recordedSearch(lower);
  }
  if(!result.attempt&&['BLOCKED_STATIC','UNSUPPORTED_ROUTE_DOMAIN'].includes(result.status)){
   assert(!upper&&!lower);assert.equal(result.accepted,false);report.upper={...zero};report.lower={...zero};
  }else if(['UNKNOWN_UPPER','UNSUPPORTED_UPPER','REJECTED_ORIGINAL_ROUTE','COUNTEREXAMPLE_BELOW_BAND','UNKNOWN_UPPER_WITHIN_BAND'].includes(result.status)){
   assert(upper&&!lower,'Normal native early return must preserve its upper receipt and must not search lower');assert.equal(result.accepted,false);report.lower={...zero};
  }
  if(result.accepted){
   assert.equal(result.status,'FROZEN_MATH_V198_VERIFIED_AWAITING_DESIGN_AND_POINTER');assert(result.attempt&&upper&&lower,'Accepted shell requires both original search receipts');
   assert.equal(upper.witnessFound,true);assert.equal(lower.status,'threshold-proven');assert.equal(lower.thresholdProven,true);
   assert.equal(lower.floor,result.band.lower);assert.equal(lower.termination,'below-threshold-exhausted');
   assert.equal(result.L,result.band.lower);integer(result.U,result.L,Number.MAX_SAFE_INTEGER,'Finite complete U required');
   if(result.band.upper!==null)assert(result.U<=result.band.upper);
  }
 }
 if(report.upper&&report.lower){
  report.totalSearchCalls=report.upper.calls+report.lower.calls;
  report.registeredRawSetStatesSum=report.upper.registeredRawSetStates+report.lower.registeredRawSetStates;
  report.conservativeFullWorlds=report.upper.conservativeFullWorlds+report.lower.conservativeFullWorlds;
  assert(report.totalSearchCalls<=2);assert(report.conservativeFullWorlds<=10000);
 }
 return report;
}
