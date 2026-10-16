import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {SHELL_NATIVE_PROOF_VERSION,SHELL_NATIVE_PRIMITIVE as S,SHELL_PROVIDED_NATIVE_LOWER_BUDGET as B,SHELL_PROVIDED_NATIVE_ACCOUNTING_VERSION,
 assertShellProvidedNativeDomainV198,authoredShellProvidedNativeMathOptionsV198,assertShellProvidedNativeMathOptionsV198,assertShellProvidedNativeSearchPlanV198,
 assertShellNativeLowerEnvelopeV198,accountShellProvidedNativeSearchReceiptV198} from './shell-provided-native-search-budget-v198.mjs';
import {NATIVE_PRODUCTION_READY,qualifyShellProvidedNativeCandidateV198} from './bounded-qualify-shell-native-v198.mjs';

// Synthetic metadata only, explicitly not mathematical evidence. No runtime,
// model, replay, solver, actual candidate/history or public ledger is loaded.
const clone=structuredClone,canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const h=v=>createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex'),parent='a'.repeat(64),band={lower:13,upper:23};
function envelope(input){
 const original={method:S.method,inputLevelSha256:input,requiredFloor:13,budget:{...B},rawFullBoardStates:20,rawExploredStates:19,discoveredStates:20,visitedStates:20,exploredStates:19,
  thresholdProven:true,status:'threshold-proven',termination:'all-costs-below-floor-exhausted',L:13,certifiedFloor:13,elapsedMilliseconds:4,domain:{retainsAllBodies:true,retainsAllLayers:true,retainsAllHiddenBatches:true},catalogAcceptanceEnabled:false,retryLedgerValidated:false,formalReady:false};
 const g={version:S.guard,engine:{path:S.enginePath,sha256:S.engineSha256},adapter:{path:S.adapterPath,sha256:S.adapterSha256},registeredRawSetStates:20,registeredExpandedStates:19,registeredSetBudget:9999,unregisteredTerminalWorldAllowance:1,conservativeFullBoardStateUpperBound:21,hardWholeBoardLimit:10000,exactFullBoardVisitedCountClaimed:false,terminalBehavior:'first-unregistered-world-throws-and-returns-without-recovery'};
 return{version:S.version,method:S.method,inputLevelSha256:input,requiredFloor:13,difficultyPolicyVersion:'1.198.0',difficulty:1,band:{...band},projection:null,projectedLevelSha256:null,
  qualificationOnly:true,primitiveCalls:1,newPublicLedgerClaims:0,productionQualified:false,productionExecutionAllowed:false,catalogAcceptanceEnabled:false,retryLedgerValidated:false,formalReady:false,upperBoundCertified:false,solvabilityValidated:false,
  bindings:{[S.enginePath]:S.engineSha256,[S.adapterPath]:S.adapterSha256},error:null,originalResult:original,result:{...clone(original),guardAllowance:g}};
}
function metadata(){
 const drags=[...Array.from({length:13},(_,i)=>({blockId:'fixture-shell',path:[[i%2,0]]})),{blockId:'fixture-shell',path:[[1,0]],exitSide:'right'},{blockId:'fixture-shell',path:[[1,0]],exitSide:'right'}],route=h(drags),input='b'.repeat(64),o=authoredShellProvidedNativeMathOptionsV198(parent);
 const plan={strategy:{route:'provided',lower:'native-full-layers'},upperBudget:o.routeBudget,lowerBudget:o.lowerBudget,searchUpper:128,redesignOf:parent,providedRouteSha256:route,inputLevelSha256:input,
  mechanismBaseReceipt:null,acceptedBaseMechanismAdaptationRequested:false,sameExactObjectRevalidationAllowed:false,formedBeforeClaim:true,difficultyPolicyVersion:'1.198.0',nativePrimitiveAdapter:{path:S.adapterPath,sha256:S.adapterSha256}};
 const r={valid:true,complete:true,nonClearingDrags:13,effectiveDrags:15,clearEvents:2};
 return{contractVersion:SHELL_NATIVE_PROOF_VERSION,levelSha256:input,routeSha256:route,drags,attemptPlan:plan,band:{...band},executionCalls:{canonicalReplay:1,independentReplay:1,lower:1,lowerReturned:true},
  route:{search:null,inputLevelSha256:input,routeSha256:route,canonicalReplay:clone(r),independentReplay:{...r,failed:false,remainingBodies:0,remainingQueued:0},witnessValidation:{providedRoute:true,searchPerformed:false,fullBoardSearchStates:0,drags:15,unitSteps:15}},
  lowerBound:envelope(input),accepted:true,status:'FROZEN_MATH_V198_VERIFIED_AWAITING_DESIGN_AND_POINTER',attempt:{id:'c'.repeat(64)},L:13,U:13};
}
const options=q=>({entered:true,returned:true,failedParentId:parent,providedRouteSha256:q.routeSha256});
const account=q=>accountShellProvidedNativeSearchReceiptV198(q,options(q));

test('entry remains disabled before input/runtime/ledger IO',async()=>{
 assert.equal(NATIVE_PRODUCTION_READY,false);
 await assert.rejects(qualifyShellProvidedNativeCandidateV198(null,null,null),/not independently enabled/);
});
test('fixed native strategy and budgets reject alternate engine, revalidation and overrides',()=>{
 const q=metadata(),o=authoredShellProvidedNativeMathOptionsV198(parent);assertShellProvidedNativeMathOptionsV198(o,parent);assertShellProvidedNativeSearchPlanV198(q.attemptPlan,parent,q.routeSha256);
 for(const patch of [{lowerBudget:{...B,maxStates:10000}},{routeStrategy:'auto'},{ledgerDirectory:'private'},{qualificationOnly:true},{mechanismBaseReceipt:{}},{searchUpper:256}])assert.throws(()=>assertShellProvidedNativeMathOptionsV198({...clone(o),...patch},parent));
 for(const patch of [{strategy:{route:'provided',lower:'projected-plain'}},{sameExactObjectRevalidationAllowed:true},{redesignOf:'d'.repeat(64)}])assert.throws(()=>assertShellProvidedNativeSearchPlanV198({...clone(q.attemptPlan),...patch},parent,q.routeSha256));
});
test('pure shell domain excludes every extra mechanism even if its flag is zero',()=>{
 const level={id:2,mechanismRules:'revised-2026-09-27-v1.5',width:2,height:1,blocks:[{id:'s',x:0,y:0,shape:[[0,0]],color:'red',layers:['red','green']},{id:'b',x:1,y:0,shape:[[0,0]],color:'blue'}],gates:[{id:'r',side:'top',offset:0,size:1,color:'red'}]};
 const drags=[{blockId:'s',path:[],exitSide:'top'}],base={level,levelSha256:h(level),drags,routeSha256:h(drags),formalId:'daily-mechanisms-multilayer-shell-15-d1-01',stageKey:'mechanisms-multilayer-shell-15',newestMechanism:'multilayer-shell',sourceLevelId:2,difficulty:1,slot:1};
 assert.equal(assertShellProvidedNativeDomainV198(base).layers,3);
 for(const key of ['frozen','movementAxis','keyId','lockedBy','lockCount','star','shutterId','timedBombSeconds','rotationBadge']){const q=clone(base);q.level.blocks[0][key]=0;assert.throws(()=>assertShellProvidedNativeDomainV198(q),/Unsupported block/);}
 for(const key of ['shutters','generators','elevators','conveyors','flipDoors','seams','coloredGrids']){const q=clone(base);q.level[key]=[{}];assert.throws(()=>assertShellProvidedNativeDomainV198(q));}
 for(const key of ['pulseRescue','unknownMechanism']){const q=clone(base);q.level[key]={};assert.throws(()=>assertShellProvidedNativeDomainV198(q),/Unsupported level/);}
 for(const key of ['frozen','star']){const q=clone(base);q.level.gates[0][key]=0;assert.throws(()=>assertShellProvidedNativeDomainV198(q),/Unsupported gate/);}
 const q=clone(base);q.timeSchedule=[];assert.throws(()=>assertShellProvidedNativeDomainV198(q),/scheduled/);
});
test('accounting retains native schema and primitive-only flags',()=>{
 const q=metadata(),before=clone(q),a=account(q);assert.deepEqual(q,before);assert.equal(a.version,SHELL_PROVIDED_NATIVE_ACCOUNTING_VERSION);assert.equal(a.upper.calls,0);assert.equal(a.lower.calls,1);assert.equal(a.totalSearchCalls,1);assert.equal(a.conservativeFullWorlds,21);assert.deepEqual(a.replayCalls,{canonical:1,independent:1});
 for(const patch of [{qualificationOnly:false},{productionQualified:true},{projection:{}},{projectedLevelSha256:'d'.repeat(64)},{primitiveCalls:2},{inputLevelSha256:'d'.repeat(64)}])assert.throws(()=>assertShellNativeLowerEnvelopeV198({...clone(q.lowerBound),...patch},q.levelSha256,13));
 // Equal replay totals alone are insufficient: coordinated corruption must
 // still fail the independent arithmetic relation clear + park = all drags.
 const corrupt=clone(q);corrupt.route.canonicalReplay.clearEvents=3;corrupt.route.independentReplay.clearEvents=3;assert.throws(()=>account(corrupt));
});
test('whole-state guard, original result, retained layers and final deadline are strict',()=>{
 const base=metadata();
 const changes=[b=>b.result.guardAllowance.version='raw-set-9999-plus-one-terminal-candidate-v1',b=>b.result.guardAllowance.unregisteredTerminalWorldAllowance=2,b=>b.result.guardAllowance.adapter.sha256='f'.repeat(64),b=>b.result.rawFullBoardStates=10000,b=>b.result.termination='below-threshold-exhausted',b=>b.result.domain.retainsAllLayers=false,b=>b.result.elapsedMilliseconds=30000,b=>b.result.requiredFloor=12,b=>b.result.certifiedFloor=12];
 for(const change of changes){const q=clone(base);change(q.lowerBound);assert.throws(()=>account(q));}
 const q=clone(base);q.lowerBound.result.elapsedMilliseconds=30000;q.lowerBound.originalResult.elapsedMilliseconds=30000;assert.throws(()=>account(q),/deadline/i);
});
test('unknown adapter result keeps original diagnostic proof but cannot become accepted',()=>{
 const q=metadata();q.accepted=false;q.L=null;q.status='UNKNOWN_LOWER';q.lowerBound.error='adapter refused';q.lowerBound.result={status:'invalid',termination:'native-qualification-adapter-rejected',thresholdProven:false,L:null,requiredFloor:13,guardAllowance:null,accountingStatus:'UNKNOWN',reason:'adapter refused'};
 const a=account(q);assert.equal(q.lowerBound.originalResult.thresholdProven,true);assert.equal(a.lower.calls,1);assert.equal(a.totalSearchCalls,1);assert.equal(a.conservativeFullWorlds,null);assert.equal(a.registeredRawSetStatesSum,null);
 q.accepted=true;assert.throws(()=>account(q));
});
test('throwing adapter cannot be reported as zero or as one completed mathematical call',()=>{
 const q=metadata();q.accepted=false;q.L=null;q.status='INVALID_ATTEMPT';delete q.lowerBound;q.executionCalls.lowerReturned=false;
 const a=account(q);assert.equal(a.lower.adapterInvocations,1);assert.equal(a.lower.calls,null);assert.equal(a.totalSearchCalls,null);assert.equal(a.conservativeFullWorlds,null);
 const unfinished=accountShellProvidedNativeSearchReceiptV198(null,{...options(q),returned:false});assert.equal(unfinished.totalSearchCalls,null);assert.equal(unfinished.upper,null);assert.equal(unfinished.lower,null);
});
test('partial original replay and rejected upper use no lower; second calls and searched routes reject',()=>{
 const q=metadata();q.accepted=false;q.L=null;q.status='INVALID_ATTEMPT';delete q.lowerBound;q.executionCalls={canonicalReplay:1,independentReplay:0,lower:0,lowerReturned:false};q.route.canonicalReplay=null;q.route.independentReplay=null;
 const a=account(q);assert.equal(a.lower.calls,0);assert.equal(a.totalSearchCalls,0);assert.deepEqual(a.replayCalls,{canonical:1,independent:0});
 for(const key of ['canonicalReplay','independentReplay','lower']){const v=metadata();v.executionCalls[key]=2;assert.throws(()=>account(v));}
 const v=metadata();v.route.search={};assert.throws(()=>account(v),/upper search/);
 const unentered=accountShellProvidedNativeSearchReceiptV198(null,{...options(q),entered:false,returned:false});assert.equal(unentered.totalSearchCalls,0);assert.equal(unentered.conservativeFullWorlds,0);
});
