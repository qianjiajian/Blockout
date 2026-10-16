import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {VERSION,SELF,PREFLIGHT_REVIEW_STATUS,NATIVE_PRODUCTION_REVIEW,NATIVE_MATH_BINDINGS,
 assertCompactShellProvidedNativeAuthorityV198 as authorityCheck,
 assertCompactShellProvidedNativePreflightV198 as preflightCheck,
 assertCompactShellProvidedNativeCompletionV198 as completionCheck,
 assertCompactShellProvidedSelectionV198 as selectionCheck} from './compact-shell-provided-native-route-v198.mjs';
import {SHELL_NATIVE_PRIMITIVE as S,SHELL_NATIVE_PROOF_VERSION,SHELL_PROVIDED_NATIVE_LOWER_BUDGET as B,
 authoredShellProvidedNativeMathOptionsV198 as options,assertShellProvidedNativeDomainV198 as domainCheck,
 accountShellProvidedNativeSearchReceiptV198 as account} from './shell-provided-native-search-budget-v198.mjs';

// Synthetic metadata only. No runtime loader, model, search, replay, ledger,
// physical candidate construction or actual candidate evidence is used here.
const H='a'.repeat(64),J='b'.repeat(64),P='c'.repeat(64),clone=structuredClone;
const d=name=>({path:`metadata-fixture/${name}.json`,sha256:H});
function authority(){return{status:'INDEPENDENT_AUTHORED_SHELL_PROVIDED_NATIVE_ONCE_V198_HISTORY10_RUNNER_PASS',productionQualified:true,executionAllowed:true,errors:[],
 math:{path:'tools/daily-challenge/formal-v4/bounded-qualify-shell-native-v198.mjs',sha256:NATIVE_MATH_BINDINGS['tools/daily-challenge/formal-v4/bounded-qualify-shell-native-v198.mjs']},
 budget:{path:'tools/daily-challenge/formal-v4/shell-provided-native-search-budget-v198.mjs',sha256:NATIVE_MATH_BINDINGS['tools/daily-challenge/formal-v4/shell-provided-native-search-budget-v198.mjs']},toolBindings:{...NATIVE_MATH_BINDINGS},
 actualReviewedBudget:{nativeFullLayers:true,upperSearches:0,lowerSearchesMaximum:1,lowerRegisteredFullWorlds:9999,lowerTerminalAllowance:1,combinedFullWorldsMaximum:10000,finalCanonicalReplaysMaximum:1,finalIndependentReplaysMaximum:1,providedRouteRequiredBeforeClaim:true,noRouteRepairOrRetry:true}};}
function preflight(){const p={version:VERSION,newInputs:1,newSearches:0,experimentId:'metadata-fixture-only',outputDirectory:'metadata-fixture/output',nativeProductionReview:clone(NATIVE_PRODUCTION_REVIEW),historyHeadSha256:J,failedParentId:P,bindings:{'metadata-fixture/pinned':H},mathOptions:options(P)};
 for(const k of ['input','index','indexReview','historyReport','failedParentReceipt','sourceReference','staticPreflight','staticIndependentReview','staticVisualEvidence','rootVisualReview','formalRegistry','designPool','unsealedHistory','executionPolicy','closedGestureAudit'])p[k]=d(k);
 const descriptor=d('preflight'),r={status:PREFLIGHT_REVIEW_STATUS,preflight:descriptor,errors:[],executionAllowed:true,nativeProductionReview:clone(NATIVE_PRODUCTION_REVIEW),toolBindings:{[SELF]:H,...NATIVE_MATH_BINDINGS}};return{p,r,descriptor};}
function receipt(){
 const drags=[...Array.from({length:18},(_,i)=>({blockId:'synthetic',path:[[i%2,0]]})),{blockId:'synthetic',path:[],exitSide:'top'},{blockId:'synthetic',path:[],exitSide:'left'}],route=routeSha256(drags),o=options(P),band={lower:18,upper:33};
 const original={method:S.method,inputLevelSha256:H,requiredFloor:18,budget:{...B},rawFullBoardStates:20,rawExploredStates:19,discoveredStates:20,visitedStates:20,exploredStates:19,thresholdProven:true,status:'threshold-proven',termination:'all-costs-below-floor-exhausted',L:18,certifiedFloor:18,elapsedMilliseconds:1,domain:{retainsAllBodies:true,retainsAllLayers:true,retainsAllHiddenBatches:true},catalogAcceptanceEnabled:false,retryLedgerValidated:false,formalReady:false};
 const guard={version:S.guard,engine:{path:S.enginePath,sha256:S.engineSha256},adapter:{path:S.adapterPath,sha256:S.adapterSha256},registeredRawSetStates:20,registeredExpandedStates:19,registeredSetBudget:9999,unregisteredTerminalWorldAllowance:1,conservativeFullBoardStateUpperBound:21,hardWholeBoardLimit:10000,exactFullBoardVisitedCountClaimed:false,terminalBehavior:'first-unregistered-world-throws-and-returns-without-recovery'};
 const lower={version:S.version,method:S.method,inputLevelSha256:H,requiredFloor:18,difficultyPolicyVersion:'1.198.0',difficulty:2,band,projection:null,projectedLevelSha256:null,qualificationOnly:true,primitiveCalls:1,newPublicLedgerClaims:0,productionQualified:false,productionExecutionAllowed:false,catalogAcceptanceEnabled:false,retryLedgerValidated:false,formalReady:false,upperBoundCertified:false,solvabilityValidated:false,bindings:{[S.enginePath]:S.engineSha256,[S.adapterPath]:S.adapterSha256},error:null,originalResult:original,result:{...clone(original),guardAllowance:guard}};
 const replay={valid:true,complete:true,failed:false,nonClearingDrags:18,effectiveDrags:20,clearEvents:2};
 const q={contractVersion:SHELL_NATIVE_PROOF_VERSION,levelSha256:H,routeSha256:route,drags,attemptPlan:{strategy:{route:'provided',lower:'native-full-layers'},upperBudget:o.routeBudget,lowerBudget:o.lowerBudget,searchUpper:128,redesignOf:P,providedRouteSha256:route,inputLevelSha256:H,mechanismBaseReceipt:null,acceptedBaseMechanismAdaptationRequested:false,sameExactObjectRevalidationAllowed:false,formedBeforeClaim:true,difficultyPolicyVersion:'1.198.0',nativePrimitiveAdapter:{path:S.adapterPath,sha256:S.adapterSha256}},band,executionCalls:{canonicalReplay:1,independentReplay:1,lower:1,lowerReturned:true},route:{search:null,inputLevelSha256:H,routeSha256:route,canonicalReplay:clone(replay),independentReplay:{...replay,remainingBodies:0,remainingQueued:0},witnessValidation:{providedRoute:true,searchPerformed:false,fullBoardSearchStates:0,drags:20,unitSteps:18}},lowerBound:lower,accepted:true,status:'FROZEN_MATH_V198_VERIFIED_AWAITING_DESIGN_AND_POINTER',attempt:{id:J},L:18,U:18};
 const candidate=d('candidate'),done={version:VERSION,proofKind:'native-full-layers',nativeProductionReview:clone(NATIVE_PRODUCTION_REVIEW),receipt:candidate,providedRouteSha256:route,failedParentId:P,entered:true,returned:true,error:null,originalResultPreserved:true,indexUpdateRequired:true,nextExecutionBlockedUntilReviewedIndexRefresh:true,restartAllowed:false,formalReady:false,registryWrites:0};
 done.accounting=account(q,{entered:true,returned:true,failedParentId:P,providedRouteSha256:route});return{q,done,candidate};
}

test('original native authority and new exact compact preflight are separate',()=>{
 assert.deepEqual(authorityCheck(authority()),{originalNativeMathematicsReviewed:true,compactExecutionReviewed:false,qualificationEnabled:false,admissionEnabled:false});
 const {p,r,descriptor}=preflight();const v=preflightCheck(p,r,descriptor,p.outputDirectory);assert.equal(v.maximumFullWorlds,10000);assert.equal(v.maximumSearches,1);assert.equal(v.admissionEnabled,false);
 for(const mutate of [a=>a.productionQualified=false,a=>a.executionAllowed=false,a=>a.toolBindings[S.enginePath]=J,a=>a.actualReviewedBudget.lowerTerminalAllowance=2,a=>a.actualReviewedBudget.nativeFullLayers=false]){const a=authority();mutate(a);assert.throws(()=>authorityCheck(a));}
});

test('projected or stale source review cannot authorize native compact execution',()=>{
 for(const mutate of [x=>x.p.version='compact-shell-provided-route-projected-lower-v198-v1',x=>x.r.status='INDEPENDENT_COMPACT_SHELL_PROVIDED_EXECUTION_PREFLIGHT_PASS',x=>x.r.nativeProductionReview.sha256=J,x=>x.p.nativeProductionReview.sha256=J,x=>delete x.r.toolBindings[SELF],x=>x.r.toolBindings[S.adapterPath]=J,x=>x.p.bindings={}]){const x=preflight();mutate(x);assert.throws(()=>preflightCheck(x.p,x.r,x.descriptor,x.p.outputDirectory));}
 const x=preflight();assert.throws(()=>preflightCheck(x.p,x.r,x.descriptor,'metadata-fixture/other'));
});

test('native budgets exclude fallback, retries, alternate strategy and second searches',()=>{
 for(const mutate of [p=>p.mathOptions.routeStrategy='native',p=>p.mathOptions.lowerBudget.maxStates=10000,p=>p.mathOptions.routeBudget.maxStates=4999,p=>p.mathOptions.redesignOf=J,p=>p.mathOptions.allowRevalidation=true,p=>p.newInputs=2,p=>p.newSearches=1]){const x=preflight();mutate(x.p);assert.throws(()=>preflightCheck(x.p,x.r,x.descriptor,x.p.outputDirectory));}
});

test('new preflight requires exact descriptors for all existing evidence and cycle audit',()=>{
 for(const field of ['input','index','indexReview','sourceReference','staticPreflight','staticIndependentReview','staticVisualEvidence','rootVisualReview','formalRegistry','designPool','unsealedHistory','closedGestureAudit']){const x=preflight();delete x.p[field];assert.throws(()=>preflightCheck(x.p,x.r,x.descriptor,x.p.outputDirectory));}
 const x=preflight();x.p.input.extra=true;assert.throws(()=>preflightCheck(x.p,x.r,x.descriptor,x.p.outputDirectory));
});

test('native completion retains actual original envelope and does not qualify or admit',()=>{
 const {q,done,candidate}=receipt(),before=clone(q),result=completionCheck(q,done,candidate);
 assert.equal(result.mathematicalAcceptance,true);assert.equal(result.accounting.upper.calls,0);assert.equal(result.accounting.lower.calls,1);assert.equal(result.accounting.conservativeFullWorlds,21);assert.equal(result.qualificationEnabled,false);assert.equal(result.admissionEnabled,false);assert.deepEqual(q,before);
 const changed=clone(done);changed.error='post-binding drift';assert.equal(completionCheck(q,changed,candidate).mathematicalAcceptance,false);
});

test('projection substitution, rewritten native results and weakened guards fail',()=>{
 for(const mutate of [q=>q.lowerBound.projection={},q=>q.lowerBound.projectedLevelSha256=J,q=>q.lowerBound.inputLevelSha256=J,q=>q.lowerBound.result.rawFullBoardStates=19,q=>q.lowerBound.result.guardAllowance.hardWholeBoardLimit=20000,q=>q.lowerBound.originalResult.domain.retainsAllLayers=false,q=>q.lowerBound.result.termination='below-threshold-exhausted']){const x=receipt();mutate(x.q);assert.throws(()=>completionCheck(x.q,x.done,x.candidate));}
});

test('second lower or replays and searched upper cannot pass saved receipt accounting',()=>{
 for(const mutate of [q=>q.executionCalls.lower=2,q=>q.executionCalls.canonicalReplay=2,q=>q.executionCalls.independentReplay=2,q=>q.route.search={},q=>q.lowerBound.primitiveCalls=2,q=>q.lowerBound.productionQualified=true]){const x=receipt();mutate(x.q);assert.throws(()=>completionCheck(x.q,x.done,x.candidate));}
});

test('unknown native result remains unknown and cannot be promoted by a completion',()=>{
 const x=receipt();x.q.accepted=false;x.q.status='UNKNOWN_LOWER';x.q.L=null;
 for(const r of [x.q.lowerBound.originalResult,x.q.lowerBound.result])Object.assign(r,{status:'unknown',termination:'max-states',thresholdProven:false,L:null,certifiedFloor:3});
 x.done.accounting=account(x.q,{entered:true,returned:true,failedParentId:P,providedRouteSha256:x.q.routeSha256});assert.equal(completionCheck(x.q,x.done,x.candidate).mathematicalAcceptance,false);
 x.q.accepted=true;assert.throws(()=>completionCheck(x.q,x.done,x.candidate));
});

test('native domain retains full layers and rejects unsupported extras',()=>{
 const level={id:80,mechanismRules:'revised-2026-09-27-v1.5',width:2,height:2,blocks:[{id:'synthetic',x:0,y:0,shape:[[0,0]],color:'red',layers:['red','blue']}],gates:[{id:'red',side:'top',offset:0,size:1,color:'red'}]},drags=[{blockId:'synthetic',path:[],exitSide:'top'}];
 const seal=q=>({...q,levelSha256:levelSha256(q.level),routeSha256:routeSha256(q.drags)}),q=seal({level,drags,sourceLevelId:80,formalId:'daily-mechanisms-multilayer-shell-15-d2-05',stageKey:'mechanisms-multilayer-shell-15',newestMechanism:'multilayer-shell',difficulty:2,slot:5});assert.equal(domainCheck(q).layers,2);
 for(const mutate of [x=>x.level.blocks[0].frozen=0,x=>x.level.blocks[0].layers.push('green'),x=>x.level.shutters=[{}],x=>x.level.gates[0].frozen=0,x=>x.timeSchedule=[]]){const changed=clone(q);mutate(changed);assert.throws(()=>domainCheck(seal(changed)));}
});

test('selection is exactly the existing shared metadata function',async()=>{
 const old=await import('./compact-shell-provided-route-v198.mjs');assert.equal(selectionCheck,old.assertCompactShellProvidedSelectionV198);
});

test('all four original native math files still match immutable reviewed bytes',()=>{
 const sha=b=>createHash('sha256').update(b).digest('hex');for(const [p,h]of Object.entries(NATIVE_MATH_BINDINGS))assert.equal(sha(fs.readFileSync(p)),h,p);
});
