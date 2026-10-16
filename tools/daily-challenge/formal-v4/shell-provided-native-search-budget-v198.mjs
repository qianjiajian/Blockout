import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {assertSealedShellProvidedRouteV198} from './shell-provided-search-budget-v198.mjs';
export {assertSealedShellProvidedRouteV198};

// Pure metadata contract. No engine, model, replay, history consumer or ledger.
export const SHELL_PROVIDED_NATIVE_LOWER_BUDGET=Object.freeze({maxStates:9999,maxTransitions:10000000,maxMicroStates:3000000,maxDragStates:10000,maxMilliseconds:30000});
export const SHELL_PROVIDED_NATIVE_UNUSED_UPPER_BUDGET=Object.freeze({maxStates:1,maxTransitions:1,maxMicroStates:1,maxDragStates:1,maxMilliseconds:1});
export const SHELL_PROVIDED_NATIVE_SEARCH_LIMITS=Object.freeze({upperCallsMaximum:0,lowerCallsMaximum:1,jointCallsMaximum:0,totalSearchCallsMaximum:1,registeredWorldsPerSearch:9999,terminalAllowancePerSearch:1,fullWorldsPerSearchMaximum:10000,combinedFullWorldsMaximum:10000,upperInternalCanonicalReplaysMaximum:0,finalCanonicalReplaysMaximum:1,finalIndependentReplaysMaximum:1,retryAllowed:false,fallbackAllowed:false,rebandAllowed:false});
export const SHELL_NATIVE_PROOF_VERSION='daily-300-shell-provided-native-full-layers-v198';
export const SHELL_PROVIDED_NATIVE_ACCOUNTING_VERSION='shell-provided-native-full-layers-single-lower-budget-v198';
export const SHELL_NATIVE_PRIMITIVE=Object.freeze({method:'native-optional-held-static-world-v1',version:'native-full-layers-lower-v198-qualification-v1',guard:'native-labelled-9999-plus-one-terminal-v1',enginePath:'tools/daily-challenge/formal-v3/bounded-native-lower.mjs',engineSha256:'3b998cd21345f3cb78a27fd74c4cd58926d9ef09d9d955288ba90a3ce5b13056',adapterPath:'tools/daily-challenge/formal-v4/native-lower-v198.mjs',adapterSha256:'ab7c43658e8e5ff888f2f284374c7347bbfeab798bd2a430e5ef77f977757279'});
const isHash=h=>typeof h==='string'&&/^[a-f0-9]{64}$/.test(h);
const integer=(n,min,max,label)=>assert(Number.isSafeInteger(n)&&n>=min&&n<=max,label);
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().filter(k=>v[k]!==undefined).map(k=>[k,canonical(v[k])])):v;
const valueHash=v=>createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');
const colors=new Set(['red','blue','green','yellow','purple','orange','pink','cyan']);
const sides=new Set(['top','right','bottom','left']);
const levelFields=new Set(['id','name','difficulty','timeSeconds','reward','parMoves','preservedMoveTarget','mechanismRules','width','height','playable','blocked','gates','blocks','bombFailurePolicy','designTargets','onboardingHint','strategyNudge','strategyFocus','featureIntro','mechanismAdaptation','shutters','generators','elevators','conveyors','flipDoors','seams','coloredGrids']);
function fields(o,allowed,label){assert(o&&typeof o==='object'&&!Array.isArray(o));for(const k of Object.keys(o))assert(allowed.has(k),'Unsupported '+label+' field '+k);}

/** Narrow production domain; the research primitive's broader domains are NOT
 * implicitly authorized here. This does not construct or validate a model. */
export function assertShellProvidedNativeDomainV198(q){
 assert.equal(q.stageKey,'mechanisms-multilayer-shell-15');assert.equal(q.newestMechanism,'multilayer-shell');
 integer(q.difficulty,1,3,'Daily difficulty');integer(q.slot,1,10,'Shell slot');integer(q.sourceLevelId,1,200,'Source id');
 assert.equal(q.formalId,`daily-mechanisms-multilayer-shell-15-d${q.difficulty}-${String(q.slot).padStart(2,'0')}`);
 assert(!Object.hasOwn(q,'timeSchedule')&&!Object.hasOwn(q,'timeScheduleSha256'),'No scheduled route');
 const l=q.level;fields(l,levelFields,'level');assert.equal(l.id,q.sourceLevelId);assert.equal(l.mechanismRules,'revised-2026-09-27-v1.5');
 for(const k of ['shutters','generators','elevators','conveyors','flipDoors','seams','coloredGrids'])if(Object.hasOwn(l,k))assert(Array.isArray(l[k])&&l[k].length===0,'Only opening shells and ordinary gates: '+k);
 assert(Array.isArray(l.blocks)&&l.blocks.length>0);assert(Array.isArray(l.gates)&&l.gates.length>0);
 const ids=new Set();let shells=0;
 for(const b of l.blocks){fields(b,new Set(['id','x','y','shape','color','layers']),'block');assert(typeof b.id==='string'&&b.id&&!ids.has(b.id));ids.add(b.id);assert(colors.has(b.color));
  assert(Number.isSafeInteger(b.x)&&Number.isSafeInteger(b.y));assert(Array.isArray(b.shape)&&b.shape.length>0);for(const p of b.shape)assert(Array.isArray(p)&&p.length===2&&p.every(Number.isSafeInteger));
  const ls=b.layers??[b.color];assert(Array.isArray(ls)&&ls.length>=1&&ls.length<=2&&ls.every(c=>colors.has(c)));assert.equal(ls[0],b.color);if(ls.length>1){assert.notEqual(ls[0],ls[1]);shells++;}}
 assert(shells>0,'At least one real shell required');
 for(const g of l.gates){fields(g,new Set(['id','side','offset','size','color','portals']),'gate');assert(sides.has(g.side)&&colors.has(g.color));
  if(g.portals!==undefined){assert(Array.isArray(g.portals));for(const p of g.portals){fields(p,new Set(['side','origin','size']),'portal');assert(sides.has(p.side));}}}
 assert(isHash(q.levelSha256));assert.equal(valueHash(l),q.levelSha256);assertSealedShellProvidedRouteV198(q);
 return{bodies:l.blocks.length,shells,layers:l.blocks.reduce((n,b)=>n+(b.layers?.length??1),0),domain:'opening-shells-ordinary-gates-only'};
}
export function authoredShellProvidedNativeMathOptionsV198(failedParentId){
 assert(isHash(failedParentId),'Actual failed-parent identity required');
 return{routeBudget:{...SHELL_PROVIDED_NATIVE_UNUSED_UPPER_BUDGET},lowerBudget:{...SHELL_PROVIDED_NATIVE_LOWER_BUDGET},redesignOf:failedParentId,routeStrategy:'native-full-layers',searchUpper:128};
}
export function assertShellProvidedNativeMathOptionsV198(options,failedParentId){assert.deepEqual(options,authoredShellProvidedNativeMathOptionsV198(failedParentId),'Fixed native-only budget/strategy; no fallback, revalidation or custom ledger');return options;}
export function assertShellProvidedNativeSearchPlanV198(plan,parent,route){
 assert(isHash(parent)&&isHash(route));assert.deepEqual(plan.strategy,{route:'provided',lower:'native-full-layers'});
 assert.deepEqual(plan.upperBudget,SHELL_PROVIDED_NATIVE_UNUSED_UPPER_BUDGET);assert.deepEqual(plan.lowerBudget,SHELL_PROVIDED_NATIVE_LOWER_BUDGET);
 assert.equal(plan.searchUpper,128);assert.equal(plan.redesignOf,parent);assert.equal(plan.providedRouteSha256,route);
 assert.equal(plan.mechanismBaseReceipt,null);assert.equal(plan.acceptedBaseMechanismAdaptationRequested,false);assert.equal(plan.sameExactObjectRevalidationAllowed,false);
 assert.equal(plan.formedBeforeClaim,true);assert.equal(plan.difficultyPolicyVersion,'1.198.0');assert.equal(plan.nativePrimitiveAdapter.sha256,SHELL_NATIVE_PRIMITIVE.adapterSha256);assert.equal(plan.nativePrimitiveAdapter.path,SHELL_NATIVE_PRIMITIVE.adapterPath);return plan;
}
function primitiveDescriptor(d,p,h,bindings){assert(d&&Object.keys(d).sort().join(',')==='path,sha256');assert.equal(d.sha256,h);const v=d.path.replaceAll('\\','/');assert(v===p||v.endsWith('/'+p));assert.equal(bindings[d.path],h);}
export function assertShellNativeLowerEnvelopeV198(b,inputSha,floor){
 const s=SHELL_NATIVE_PRIMITIVE;assert.equal(b.version,s.version);assert.equal(b.method,s.method);assert.equal(b.inputLevelSha256,inputSha);assert.equal(b.requiredFloor,floor);assert.equal(b.projection,null);assert.equal(b.projectedLevelSha256,null);
 assert.equal(b.difficultyPolicyVersion,'1.198.0');const bands={1:{lower:13,upper:23},2:{lower:18,upper:33},3:{lower:28,upper:null}};assert(bands[b.difficulty]);assert.deepEqual(b.band,bands[b.difficulty]);assert.equal(b.band.lower,floor);
 assert.equal(b.qualificationOnly,true);assert.equal(b.primitiveCalls,1);assert.equal(b.newPublicLedgerClaims,0);
 for(const k of ['productionQualified','productionExecutionAllowed','catalogAcceptanceEnabled','retryLedgerValidated','formalReady','upperBoundCertified','solvabilityValidated'])assert.equal(b[k],false,k);
 const r=b.result;assert(r&&typeof r==='object');
 if(r.accountingStatus==='UNKNOWN'){assert.equal(r.status,'invalid');assert.equal(r.thresholdProven,false);assert.equal(r.L,null);assert.equal(r.guardAllowance,null);assert.equal(r.requiredFloor,floor);assert.equal(typeof b.error,'string');return{calls:1,registeredRawSetStates:null,conservativeFullWorlds:null,accountingStatus:'UNKNOWN'};}
 assert.equal(b.error,null);assert.equal(r.method,s.method);assert.equal(r.inputLevelSha256,inputSha);assert.equal(r.requiredFloor,floor);assert.deepEqual(r.budget,SHELL_PROVIDED_NATIVE_LOWER_BUDGET);
 const {guardAllowance:g,...original}=r;assert.deepEqual(original,b.originalResult,'Original native result is immutable, not normalized into projected schema');
 integer(r.rawFullBoardStates,0,9999,'Native raw state ceiling');integer(r.rawExploredStates,0,r.rawFullBoardStates,'Expanded states');
 assert.equal(r.discoveredStates,r.rawFullBoardStates);assert.equal(r.visitedStates,r.rawFullBoardStates);assert.equal(r.exploredStates,r.rawExploredStates);
 assert.equal(g.version,s.guard);primitiveDescriptor(g.engine,s.enginePath,s.engineSha256,b.bindings);primitiveDescriptor(g.adapter,s.adapterPath,s.adapterSha256,b.bindings);
 assert.equal(g.registeredRawSetStates,r.rawFullBoardStates);assert.equal(g.registeredExpandedStates,r.rawExploredStates);assert.equal(g.registeredSetBudget,9999);assert.equal(g.unregisteredTerminalWorldAllowance,1);
 assert.equal(g.conservativeFullBoardStateUpperBound,r.rawFullBoardStates+1);assert.equal(g.hardWholeBoardLimit,10000);assert.equal(g.exactFullBoardVisitedCountClaimed,false);assert.equal(g.terminalBehavior,'first-unregistered-world-throws-and-returns-without-recovery');
 for(const k of ['catalogAcceptanceEnabled','retryLedgerValidated','formalReady'])assert.equal(r[k],false);
 integer(r.certifiedFloor,0,floor,'Certified floor');
 if(r.thresholdProven){assert.equal(r.thresholdProven,true);assert.equal(r.status,'threshold-proven');assert.equal(r.termination,'all-costs-below-floor-exhausted');assert.equal(r.L,floor);assert.equal(r.certifiedFloor,floor);integer(r.elapsedMilliseconds,0,r.budget.maxMilliseconds-1,'Final deadline');for(const k of ['retainsAllBodies','retainsAllLayers','retainsAllHiddenBatches'])assert.equal(r.domain[k],true);}
 else{assert.equal(r.thresholdProven,false);assert.equal(r.L,null);assert(['unknown','unsupported','invalid','relaxed-shortcut'].includes(r.status));if(r.status==='relaxed-shortcut'){assert.equal(r.termination,'minimum-optional-completion');integer(r.minimumOptionalCost,0,floor-1,'Native relaxed shortcut');assert(Array.isArray(r.drags));}}
 return{calls:1,registeredRawSetStates:r.rawFullBoardStates,conservativeFullWorlds:g.conservativeFullBoardStateUpperBound,accountingStatus:'RECORDED'};
}
export function accountShellProvidedNativeSearchReceiptV198(q,{entered,returned,failedParentId,providedRouteSha256}){
 assert.equal(typeof entered,'boolean');assert.equal(typeof returned,'boolean');assert(!returned||entered);assert(isHash(providedRouteSha256));
 const zero=()=>({calls:0,registeredRawSetStates:0,conservativeFullWorlds:0});
 const a={version:SHELL_PROVIDED_NATIVE_ACCOUNTING_VERSION,limits:SHELL_PROVIDED_NATIVE_SEARCH_LIMITS,qualifierEntered:entered,qualifierReturned:returned,providedRouteSha256,upper:null,lower:null,totalSearchCalls:null,registeredRawSetStatesSum:null,conservativeFullWorlds:null,replayCalls:{canonical:null,independent:null},combinedFullWorldsMaximum:10000,jointMathematicalCalls:0,exactFullWorldVisitedCountClaimed:false};
 if(!entered){assert.equal(q,null);a.upper=zero();a.lower=zero();a.replayCalls={canonical:0,independent:0};}
 else if(returned){
  assert.equal(q.contractVersion,SHELL_NATIVE_PROOF_VERSION);assertShellProvidedNativeSearchPlanV198(q.attemptPlan,failedParentId,providedRouteSha256);assert.equal(q.attemptPlan.inputLevelSha256,q.levelSha256);
  const c=q.executionCalls;assert.deepEqual(Object.keys(c).sort(),['canonicalReplay','independentReplay','lower','lowerReturned'].sort());for(const k of ['canonicalReplay','independentReplay','lower'])integer(c[k],0,1,k);assert.equal(typeof c.lowerReturned,'boolean');assert(!c.lowerReturned||c.lower===1);assert(c.independentReplay<=c.canonicalReplay);
  a.upper=zero();a.replayCalls={canonical:c.canonicalReplay,independent:c.independentReplay};assert(q.route?.search===undefined||q.route.search===null,'No upper search');
  if(q.drags!==undefined){assertSealedShellProvidedRouteV198(q);assert.equal(q.routeSha256,providedRouteSha256);}
  if(q.route){assert.equal(q.route.search,null);assert.equal(q.route.inputLevelSha256,q.levelSha256);assert.equal(q.route.routeSha256,providedRouteSha256);if(q.route.canonicalReplay)assert.equal(c.canonicalReplay,1);if(q.route.independentReplay)assert.equal(c.independentReplay,1);}
  if(q.lowerBound){assert(c.lowerReturned&&c.lower===1);assert(q.route?.canonicalReplay&&q.route?.independentReplay);a.lower=assertShellNativeLowerEnvelopeV198(q.lowerBound,q.levelSha256,q.band.lower);}
  // `executionCalls.lower` counts adapter invocations, not proof that its
  // primitive was entered: binding checks can throw before or after the engine.
  else{assert.equal(c.lowerReturned,false);a.lower=c.lower===0?zero():{calls:null,adapterInvocations:1,callsMaximum:1,registeredRawSetStates:null,conservativeFullWorlds:null,accountingStatus:'UNKNOWN'};}
  if(c.lower){const r=q.route;assert(r?.canonicalReplay?.valid&&r.canonicalReplay.complete&&!r.canonicalReplay.failed&&r.independentReplay?.valid&&r.independentReplay.complete&&r.independentReplay.failed===false);assert.equal(r.independentReplay.remainingBodies,0);assert.equal(r.independentReplay.remainingQueued,0);assert.equal(c.canonicalReplay,1);assert.equal(c.independentReplay,1);}
  if(q.accepted){assert.equal(q.status,'FROZEN_MATH_V198_VERIFIED_AWAITING_DESIGN_AND_POINTER');assert(q.attempt&&q.lowerBound&&c.lowerReturned);assert.equal(q.lowerBound.result.thresholdProven,true);assert.equal(a.lower.accountingStatus,'RECORDED');assert.equal(q.L,q.band.lower);integer(q.U,q.L,Number.MAX_SAFE_INTEGER,'Complete U');if(q.band.upper!==null)assert(q.U<=q.band.upper);
   const r=q.route;for(const v of [r.canonicalReplay,r.independentReplay]){assert.equal(v.nonClearingDrags,q.U);assert.equal(v.effectiveDrags,q.drags.length);assert.equal(v.clearEvents+v.nonClearingDrags,v.effectiveDrags);}assert.equal(r.canonicalReplay.clearEvents,r.independentReplay.clearEvents);assert.equal(r.witnessValidation.providedRoute,true);assert.equal(r.witnessValidation.searchPerformed,false);assert.equal(r.witnessValidation.fullBoardSearchStates,0);assert.equal(r.witnessValidation.drags,q.drags.length);assert.equal(r.witnessValidation.unitSteps,q.drags.reduce((n,d)=>n+d.path.length,0));}
 }
 if(a.upper&&a.lower){if(a.lower.calls!==null){a.totalSearchCalls=a.upper.calls+a.lower.calls;assert(a.totalSearchCalls<=1);}if(a.lower.registeredRawSetStates!==null&&a.lower.conservativeFullWorlds!==null){a.registeredRawSetStatesSum=a.lower.registeredRawSetStates;a.conservativeFullWorlds=a.lower.conservativeFullWorlds;assert(a.conservativeFullWorlds<=10000);}}
 return a;
}
