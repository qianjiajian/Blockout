import test from 'node:test';
import assert from 'node:assert/strict';
import {levelSha256 as hash} from '../formal-v2/contract.mjs';
import {SHELL_NATIVE_PROOF_VERSION,SHELL_NATIVE_PRIMITIVE as S,SHELL_PROVIDED_NATIVE_LOWER_BUDGET as B,authoredShellProvidedNativeMathOptionsV198,accountShellProvidedNativeSearchReceiptV198} from './shell-provided-native-search-budget-v198.mjs';
import {VERSION as EXEC_VERSION,NATIVE_PRODUCTION_REVIEW} from './compact-shell-provided-native-route-v198.mjs';
import {COMPACT_NATIVE_EVIDENCE_READY,assertCompactShellProvidedNativeExecutionEvidenceV198,assertCompactNativeCompletionMetadataV198,assertCompactNativeClosureMetadataV198,assertCompactNativeSuccessorMetadataV198,assertCompactNativeConstructionMetadataV198,assertCompactNativeUnsealedWorldV198} from './compact-shell-provided-native-execution-evidence-v198.mjs';
import {COMPACT_NATIVE_QUALIFICATION_READY,VERSION as QUAL_VERSION,qualifyCompactShellProvidedNativeV198,assertCompactShellProvidedNativeQualificationConfigV198} from './qualify-compact-shell-provided-native-v198.mjs';
import {COMPACT_NATIVE_ADMISSION_READY,admitIncrementalCompactShellNativeEntryV198,assertCompactNativeAdmissionQualificationV198,NATIVE_QUALIFICATION_STATUS} from './admit-incremental-compact-shell-native-entry-v198.mjs';
import {assertCompactNativePointerSettlementV198,compactNativeRegistryBaselineV198,buildCompactNativeRegistryAppendV198,NATIVE_REGISTRY_PATH} from './compact-shell-native-admission-contract-v198.mjs';
import {assertNewShellProvidedNativeReceiptV198,assertOriginalNativeMathematicalEvidenceV198} from './shell-native-execution-evidence-history10-v198.mjs';
import {projectCompactShellHistoryV198,appendCompactShellResultV198} from './compact-shell-execution-v198.mjs';
// Synthetic metadata only: no physical candidate, game runtime, solver,
// replay, ledger, actual qualification or registry mutation is used.
const CORE_BINDINGS={
  "src/core/PuzzleModel.ts": "88a4c65fdac42af8048ffb3ac30f6cf66ad99274e0ccf755b7f1f13b6f9713b5",
  "src/core/blockExitFrontier.ts": "7dac798d2a067c6cfdbed9b94f44555fa411a8cef0c488150ae951525154b4db",
  "src/core/blockShape.ts": "b35baca699e3d77ef0eacfa864770d611f937104201cbe6de575b329e7f42a36",
  "src/core/boardSeams.ts": "3983d86d7fa70f5d1c02230778492177c037158cbfa488d502575a922dbf306d",
  "src/core/boardTopology.ts": "be0e2b07e63b1564f15360cbcd0dbc5467762541233af26db8d63ca32a456d53",
  "src/core/gatePortals.ts": "db7b67759a947e63b2f0fdc36cdb9fbd0e6983b66210738cf379fe6b48bb3669",
  "src/core/generatorMountContract.ts": "160623805ce9843c9f56159036b6f25f7137304b21bdaf9d304a7962845e39bb",
  "src/core/generatorMouthSpawnGeometry.ts": "7257e5c578733e936978e6e77317b92c79c3bec774ed91b7f10f0a380c2b6217",
  "src/core/mechanismCatalog.ts": "fae7a5324f73b9c52ca4e5758364098e2773100d6ae111f1f890f9d0ab0d51bc",
  "src/core/mechanismRules.ts": "3c1ebfab9dac83e518f240a6281dd726cfeb87fff789ad356499c4339e070422",
  "src/core/revisedCandidateAudit.ts": "7cc5db701bbf748608538c5ab498ac9b321db868c0dbacfdc7e07e75f3341c30",
  "src/core/revisedLevelSearch.ts": "94bbb19477d0629affeb7e42eb06e7a52cc3fdbe89a59f88e47c0b985bfc2752",
  "src/core/revisedMechanismContract.ts": "770e4dc84adce3ed3fcfb4bcad1bf24e542547f639aef550f044d81194c985b5",
  "src/core/revisedRepositionFloor.ts": "a217550d2413944da080a7757069191f0ecc85feda34c4faf981876c4b9dfae5",
  "src/core/shutterCoverage.ts": "2ce68a668cebf29ba93af6f25da2b416567ee14257ac862143a5cdb889567520",
  "src/core/types.ts": "7a1e50543890ca064bfccc29cca2e03aab319ddffceeb2526ef61c04bae3754e",
  "src/game/ColorEscapeGame.ts": "2a59877eab3b89e5d599d34eacf7dcf797b588be29cdd49b9832ac0ec691b90a",
  "src/game/artManifest.ts": "202b797c5c6b525806f4af1ca053459e21c6234e53d84f46cd553ebce3588db6",
  "src/game/continuousDrag.ts": "81db6819fdb6cc28434cfa5efebd3b9e7fcb62674cd6f3fb627511ff558f6f5a",
  "src/game/exitMaterialAnimation.ts": "1a57b77e0e2eaa4d292b97b9a938e1b4eb367a121a093bd3b1948a50b191394d",
  "src/game/formalBlockShapes.ts": "ed814635b71e20183c09e93acc9005b9775cc09e98b7658ec8981be74b681d5d",
  "tools/continuation211-colored-witness.mjs": "6b8070cc9caceb782b9aaddddd2151ee24a7c24154a39ed92bba0787d94b1885",
  "tools/daily-challenge/formal-v2/constraint-projection.mjs": "97006369720564f0a2139f01137650e1406ff1927814c46142b1aa51f94514a8",
  "tools/daily-challenge/formal-v2/inventory-projection.mjs": "a8072bc7756e07657822a2aa10d3a8f818708414ad92c6ee67dddaf12ea14015",
  "tools/daily-challenge/formal-v2/proof-plain.mjs": "422ad9bdb12d3ffaf5e148ca4c98bf7ef930858a037de7d15fda772621f9294c",
  "tools/daily-challenge/formal-v2/proof-scheduled-route.mjs": "356f73be8ed8007853f4e95a0ec9ed18060077a0ae64131bfb75fe9d71ee99b2",
  "tools/daily-challenge/formal-v2/shutter-materialization-projection.mjs": "99a065bbbcdc3a6e8f5d555b0add68e982843afbd9dd5e5965047e04155d32a2",
  "tools/revised-generator-queue-colors.mjs": "567a122a5ac60eb0a6a3bce58089a783872157ceb77ae1219485fda94a4419ab",
  "tools/revised-hidden-coverage.mjs": "760d043fc0a6f605f15b8307c2185f2de2b708c6c0f9913b3b51555b12dab2f8",
  "tools/revised-preview-source-v160.mjs": "515355a82083b2e99d3c8b2e3ff2dce6423aaf8fa028bf4ce8b35c6531687559",
  "tools/revised-preview-validation-v160.mjs": "2f174c6cc78cc1d94bd6ddc8d4a74f7938b590c2785a1aed71b051711db36e8d",
  "tools/verify-rules-lock.mjs": "8ea46f5d0eae18ffd676b331904aea1730e978bea8e70a45ce4938e8b25ec079",
  "tools/daily-challenge/formal-v2/contract.mjs": "9545c9303c54d5c78a8be6c34e7853c7a43c67c0057c4fd5e550a362f9687c3a",
  "tools/daily-challenge/formal-v3/bounded-proof.mjs": "ebf6522ed5a6c8b3c5bc4e217a8026f68f05894cc07ebc54f190efc941360054",
  "tools/daily-challenge/formal-v3/bounded-ice-proof.mjs": "3d6bd7894b185ee69715b4c677986a564864d2c8b590fcc96b4526ff153a80ab",
  "tools/daily-challenge/formal-v3/ice-preserving-projection.mjs": "90897f75a65ed7f9c02501f1b2d1a2a3e846d5d94458861174a692c115b4217d"
};
const H='a'.repeat(64),P='b'.repeat(64),J='c'.repeat(64),copy=structuredClone;
const descriptor=path=>({path,sha256:H});
function fixture(){
 const level={id:2,mechanismRules:'revised-2026-09-27-v1.5',width:2,height:1,blocks:[{id:'fixture-shell',x:0,y:0,shape:[[0,0]],color:'red',layers:['red','green']},{id:'fixture-body',x:1,y:0,shape:[[0,0]],color:'blue'}],gates:[{id:'r',side:'top',offset:0,size:1,color:'red'},{id:'g',side:'bottom',offset:0,size:1,color:'green'},{id:'b',side:'right',offset:0,size:1,color:'blue'}]};
 const drags=[...Array.from({length:13},(_,i)=>({blockId:'fixture-shell',path:[[i%2,0]]})),{blockId:'fixture-shell',path:[],exitSide:'top'},{blockId:'fixture-body',path:[],exitSide:'right'},{blockId:'fixture-shell',path:[],exitSide:'bottom'}];
 const input=hash(level),route=hash(drags),band={lower:13,upper:23},o=authoredShellProvidedNativeMathOptionsV198(P);
 const plan={strategy:{route:'provided',lower:'native-full-layers'},upperBudget:o.routeBudget,lowerBudget:o.lowerBudget,searchUpper:128,redesignOf:P,providedRouteSha256:route,inputLevelSha256:input,band,
  mechanismBaseReceipt:null,acceptedBaseMechanismAdaptationRequested:false,sameExactObjectRevalidationAllowed:false,formedBeforeClaim:true,difficultyPolicyVersion:'1.198.0',nativePrimitiveAdapter:{path:S.adapterPath,sha256:S.adapterSha256}};
 const nativeBindings={...CORE_BINDINGS,[S.enginePath]:S.engineSha256};
 const nativeResult={method:S.method,inputLevelSha256:input,requiredFloor:13,nativeToolchainBindings:copy(nativeBindings),nativeToolchainSha256:hash(nativeBindings),budget:{...B},rawFullBoardStates:20,rawExploredStates:19,discoveredStates:20,visitedStates:20,exploredStates:19,
  thresholdProven:true,status:'threshold-proven',termination:'all-costs-below-floor-exhausted',L:13,certifiedFloor:13,elapsedMilliseconds:4,domain:{retainsAllBodies:true,retainsAllLayers:true,retainsAllHiddenBatches:true},catalogAcceptanceEnabled:false,retryLedgerValidated:false,formalReady:false};
 const guard={version:S.guard,engine:{path:S.enginePath,sha256:S.engineSha256},adapter:{path:S.adapterPath,sha256:S.adapterSha256},registeredRawSetStates:20,registeredExpandedStates:19,registeredSetBudget:9999,unregisteredTerminalWorldAllowance:1,conservativeFullBoardStateUpperBound:21,hardWholeBoardLimit:10000,exactFullBoardVisitedCountClaimed:false,terminalBehavior:'first-unregistered-world-throws-and-returns-without-recovery'};
 const lowerBound={version:S.version,method:S.method,inputLevelSha256:input,requiredFloor:13,difficultyPolicyVersion:'1.198.0',difficulty:1,band:copy(band),projection:null,projectedLevelSha256:null,
  qualificationOnly:true,primitiveCalls:1,newPublicLedgerClaims:0,productionQualified:false,productionExecutionAllowed:false,catalogAcceptanceEnabled:false,retryLedgerValidated:false,formalReady:false,upperBoundCertified:false,solvabilityValidated:false,
  bindings:{...nativeBindings,[S.adapterPath]:S.adapterSha256},error:null,originalResult:copy(nativeResult),result:{...copy(nativeResult),guardAllowance:guard}};
 const replay={valid:true,complete:true,nonClearingDrags:13,effectiveDrags:16,clearEvents:3};
 const trace=drags.map((d,i)=>({index:i,moves:i+1,blockId:d.blockId,clearDelta:d.exitSide?1:0,complete:i===15,stateSha256:i===15?J:H}));
 const policyBindings={synthetic:'d'.repeat(64)};
 const q={schemaVersion:4,contractVersion:SHELL_NATIVE_PROOF_VERSION,difficultyPolicyVersion:'1.198.0',formalId:'daily-mechanisms-multilayer-shell-15-d1-01',stageKey:'mechanisms-multilayer-shell-15',newestMechanism:'multilayer-shell',slot:1,sourceLevelId:2,difficulty:1,
  level,levelSha256:input,routeSha256:route,drags,attemptPlan:plan,attemptPlanSha256:hash(plan),band:copy(band),executionCalls:{canonicalReplay:1,independentReplay:1,lower:1,lowerReturned:true},
  route:{search:null,inputLevelSha256:input,routeSha256:route,canonicalReplay:{...replay,finalStateKey:JSON.stringify({complete:true,failed:false,blocks:[],queuedBlocks:[],cleared:3})},independentReplay:{...replay,failed:false,remainingBodies:0,remainingQueued:0,trace,finalStateSha256:J},witnessValidation:{providedRoute:true,searchPerformed:false,fullBoardSearchStates:0,drags:16,unitSteps:13}},
  lowerBound,accepted:true,catalogEligible:true,qualificationOnly:false,formalReady:false,redesignRequired:false,reasons:[],status:'FROZEN_MATH_V198_VERIFIED_AWAITING_DESIGN_AND_POINTER',
  attempt:{id:H,identityOrigin:H,retryIdentitySha256:J,redesignOf:P,levelSha256:input,designSha256:H,shapeSha256:P,colorSha256:J,colorAssignments:{'fixture-shell':['red','green'],'fixture-body':['blue']}},L:13,U:13,
  toolchainSha256:'45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804',toolchainBindings:copy(CORE_BINDINGS),policyBindings,policyToolchainSha256:hash(policyBindings)};
 q.searchAccounting=accountShellProvidedNativeSearchReceiptV198(q,{entered:true,returned:true,failedParentId:P,providedRouteSha256:route});
 const math={attemptId:H,method:S.method,lowerStatus:nativeResult.status,lowerTermination:nativeResult.termination,lowerEvidenceSha256:hash(lowerBound),rawFullBoardStates:20,proofInputLevelSha256:input,projectedLevelSha256:null,guardAllowance:copy(guard),canonicalValidComplete:true,independentValidComplete:true,completeOriginalInventory:true,providedOriginalRoute:true,originalValuesUnchanged:true,upperSearchCalls:0,mathematicalCalls:1};
 return{q,math,request:copy(q.attempt),result:{accepted:true,status:q.status,levelSha256:input,lower:copy(lowerBound.result),upper:null}};
}

test('all three new IO entries fail closed before reading any path',async()=>{
 assert.equal(COMPACT_NATIVE_EVIDENCE_READY,false);assert.equal(COMPACT_NATIVE_QUALIFICATION_READY,false);assert.equal(COMPACT_NATIVE_ADMISSION_READY,false);
 await assert.rejects(()=>assertCompactShellProvidedNativeExecutionEvidenceV198(null,null,null,null,null,{}),/SOURCE ONLY/);
 await assert.rejects(()=>qualifyCompactShellProvidedNativeV198(null),/SOURCE ONLY/);
 await assert.rejects(()=>admitIncrementalCompactShellNativeEntryV198([]),/not independently enabled/);
});
function completion(){const{q}=fixture(),candidate=descriptor('metadata-fixture/candidate.json');return{q,candidate,done:{version:EXEC_VERSION,proofKind:'native-full-layers',nativeProductionReview:copy(NATIVE_PRODUCTION_REVIEW),receipt:candidate,providedRouteSha256:q.routeSha256,failedParentId:P,entered:true,returned:true,error:null,originalResultPreserved:true,indexUpdateRequired:true,nextExecutionBlockedUntilReviewedIndexRefresh:true,restartAllowed:false,formalReady:false,registryWrites:0,accounting:copy(q.searchAccounting)}};}
test('native exact original math and completion pass without changing primitive flags',()=>{
 const f=fixture(),before=copy(f);assertNewShellProvidedNativeReceiptV198(f.q);assertOriginalNativeMathematicalEvidenceV198(f.q,f.math,{original:f.q,request:f.request,result:f.result});assert.deepEqual(f,before);
 const x=completion(),a=assertCompactNativeCompletionMetadataV198(x.q,x.done,x.candidate);assert.equal(a.upper.calls,0);assert.equal(a.lower.calls,1);assert.deepEqual(a.replayCalls,{canonical:1,independent:1});
});
test('native completion rejects projected, failed, repeated and interrupted evidence',()=>{
 for(const change of [x=>x.q.lowerBound.projection={},x=>x.q.lowerBound.projectedLevelSha256=H,x=>x.q.accepted=false,x=>x.done.error='interrupted',x=>x.done.returned=false,x=>x.done.restartAllowed=true,x=>x.done.registryWrites=1,x=>x.done.nativeProductionReview.sha256=J,x=>x.q.executionCalls.canonicalReplay=2,x=>x.q.executionCalls.independentReplay=2,x=>x.q.executionCalls.lower=2,x=>x.q.route.search={},x=>x.q.lowerBound.result.guardAllowance.registeredSetBudget=10000,x=>x.q.lowerBound.result.guardAllowance.unregisteredTerminalWorldAllowance=2]){const x=completion();change(x);assert.throws(()=>assertCompactNativeCompletionMetadataV198(x.q,x.done,x.candidate));}
});
test('closure requires exactly all 54 independently reviewed files and bytes',()=>{
 const files=Array.from({length:54},(_,i)=>'synthetic/tool-'+i),bindings=Object.fromEntries(files.map(p=>[p,H])),r={status:'INDEPENDENT_COMPACT_SHELL_PROVIDED_NATIVE_EXECUTION_SOURCE_PASS',errors:[],checks:{completeEsbuildStaticAndDynamicClosure:54},toolBindings:copy(bindings)};
 assertCompactNativeClosureMetadataV198(files,bindings,r);
 for(const change of [x=>x.files.pop(),x=>x.files.push('extra'),x=>x.files[1]=x.files[0],x=>x.bindings[x.files[0]]=J,x=>x.r.checks.completeEsbuildStaticAndDynamicClosure=53,x=>x.r.errors.push('unreviewed')]){const x=copy({files,bindings,r});change(x);assert.throws(()=>assertCompactNativeClosureMetadataV198(x.files,x.bindings,x.r));}
});
function successor(){
 const{q}=fixture(),sourceReference=descriptor('C:/native-fixture/source.json'),completion=descriptor('C:/native-fixture/completion.json'),parentIndex=descriptor('C:/native-fixture/index.json');
 const old={id:2,width:3,height:2,gates:[],blocks:[{id:'old',x:0,y:0,color:'yellow',shape:[[0,0],[1,0]]}]};
 const state={bundle:{scope:{baseDirectory:'C:/native-fixture',roots:Array.from({length:7},(_,i)=>({id:String(i),physicalPath:'C:/native-fixture/r'+i,aliases:[]}))},publicNamespace:'C:/native-fixture/public',files:[{path:'C:/native-fixture/old.json',sha256:H,rootId:null}],terminalRecords:[]},headSha256:H,fullWorlds:[{level:old,sourceLevelId:2,reference:sourceReference}],retired:[],closedExperimentIds:[]};
 const parent=projectCompactShellHistoryV198(state,{headSha256:H}),input={level:q.level,sourceLevelId:2},args={input,sourceReference,receipt:q,completion,experimentId:'metadata-native',parentIndex},next=appendCompactShellResultV198(parent,{input,sourceReference,result:q,files:[{path:'C:/native-fixture/new.json',sha256:J,rootId:null}],completion,experimentId:args.experimentId});
 next.records.push({kind:'mathematical',namespace:parent.publicNamespace,request:{descriptor:descriptor('C:/native-fixture/request.json'),value:copy(q.attempt)},result:{descriptor:descriptor('C:/native-fixture/result.json'),value:{accepted:true,status:q.status,levelSha256:q.levelSha256}},blocked:[],lock:null,legacyPrivateResultFailure:false});next.parentCompactIndex=parentIndex;
 return{parent,next,args};
}
test('successor appends one full original world and preserves all old fields',()=>{
 const x=successor(),before=copy(x);assert.equal(assertCompactNativeSuccessorMetadataV198(x.parent,x.next,x.args).length,1);assert.deepEqual(x,before);
 for(const change of [x=>x.next.worlds.push(copy(x.next.worlds.at(-1))),x=>x.next.worlds.shift(),x=>x.next.files[0].sha256=J,x=>x.next.retired.push({kind:'design'}),x=>x.next.records.at(-1).request.value.id=J,x=>x.next.records.at(-1).result.value.accepted=false,x=>x.next.records.at(-1).blocked.push({}),x=>x.next.records.at(-1).lock={},x=>x.next.records.at(-1).namespace='foreign',x=>x.args.receipt.lowerBound.projection={}]){const x=successor();change(x);assert.throws(()=>assertCompactNativeSuccessorMetadataV198(x.parent,x.next,x.args));}
});
test('construction closure neither invents acceptance nor adds inputs or restarts',()=>{
 const p=descriptor('synthetic/preflight.json'),input=descriptor('synthetic/input.json'),candidate=descriptor('synthetic/candidate.json'),claim={plan:p,qualificationOnly:false,failedPlanContinuationAllowed:false},closed={plan:p,status:'COMPACT_SHELL_PROVIDED_NATIVE_CONSTRUCTION_CLOSED',experimentId:'one',closed:true,restartAllowed:false,consumedInputs:1,maximumInputs:1,qualificationOnly:false,catalogEligible:false,formalReady:false,mathematicalAcceptance:false,formedWorldFiles:[input],receipts:[candidate]};
 const check=(a,b)=>assertCompactNativeConstructionMetadataV198(a,b,p,input,candidate,'one');check(claim,closed);
 for(const mutate of [x=>x.closed.maximumInputs=2,x=>x.closed.mathematicalAcceptance=true,x=>x.closed.formedWorldFiles.push(input),x=>x.closed.restartAllowed=true,x=>x.claim.failedPlanContinuationAllowed=true,x=>x.closed.plan.sha256=J]){const x=copy({claim,closed});mutate(x);assert.throws(()=>check(x.claim,x.closed));}
});
test('unsealed metadata rejects ID aliases, same partition and same-source colour-only edits',()=>{
 const old={sourceLevelId:2,level:{id:2,width:3,height:2,gates:[],blocks:[{id:'old',x:0,y:0,color:'yellow',shape:[[0,0],[1,0]]}]}},input={sourceLevelId:2,level:{id:2,width:3,height:2,gates:[],blocks:[{id:'new',x:1,y:0,color:'green',shape:[[0,0],[0,1]]}]}};
 assertCompactNativeUnsealedWorldV198(input,old);
 const alias=copy(old);alias.level.id=999;alias.level.blocks[0].id='renamed';assert.throws(()=>assertCompactNativeUnsealedWorldV198(alias,old));
 const recolor=copy(old);recolor.level.blocks[0].color='blue';assert.throws(()=>assertCompactNativeUnsealedWorldV198(recolor,old));
 recolor.level.blocks[0].y=1;assert.throws(()=>assertCompactNativeUnsealedWorldV198(recolor,old));
});
function config(){const c={version:QUAL_VERSION,output:'deliverables/daily-formal-v4-20261008/proof/synthetic-native.json'};for(const k of ['candidate','rootDesign','pointer','visual','completion','mechanismReview','successorIndex','successorIndexReview','compatibilityReview'])c[k]=descriptor('synthetic/'+k+'.json');return c;}
test('qualification config requires native version and distinct safe new proof output',()=>{
 assertCompactShellProvidedNativeQualificationConfigV198(config());
 for(const change of [c=>c.version='projected',c=>delete c.compatibilityReview,c=>c.output='src/core/registry.json',c=>c.output='deliverables/daily-formal-v4-20261008/proof/../bad.json',c=>c.candidate.path=c.output,c=>c.candidate.extra=true]){const c=config();change(c);assert.throws(()=>assertCompactShellProvidedNativeQualificationConfigV198(c));}
});
function pointer(difficulty=1){
 const{q}=fixture();q.difficulty=difficulty;const reward={1:{coins:50,inspiration:20},2:{coins:100,inspiration:50},3:{coins:200,inspiration:100}}[difficulty],baseline={coins:7,inspiration:9,currentLevel:1,highestLevel:200,bestStars:{},bestMoves:{},rewardedLevels:[],boosters:{time:0,rocket:0,pulse:0},lifeState:{lives:5,nextLifeAtMs:0,unlimitedLivesUntilMs:0},attemptsRemaining:5,dailyMode:true};
 const p={status:'CANDIDATE_CURRENT_UI_POINTER_NATURAL_TIME_PASS',candidateInjection:true,formalRegistryIdentity:false,playerSaveTouched:false,naturalClock:true,clockMocked:false,pointerValidated:true,timeValidated:true,settlementValidated:true,levelSha256:q.levelSha256,routeSha256:q.routeSha256,U:q.U,totalDrags:q.drags.length,initialInventory:{bodies:q.level.blocks.length,queued:0,generators:[]},finalPuzzle:{complete:true,failed:false,blocks:0,queuedBlocks:0,moves:q.drags.length,remainingSeconds:30},naturalClockProbe:{before:60,after:59.8},drawAudit:{calls:10,rotated:0,canvasRotationCalls:0},errors:[],storageViolations:[],entryBaseline:baseline,settlement:{...copy(baseline),screen:'win',win:{difficulty,...reward},debug:{status:'committed',kind:'dailyChallenge',levelId:q.level.id,operation:'settle',rewardPresented:true,retryAvailable:false,coinReward:reward.coins,inspirationReward:reward.inspiration,earnedStars:0,pendingCoinDelta:0},coins:baseline.coins+reward.coins,inspiration:baseline.inspiration+reward.inspiration,activeRun:null,daily:{completed:{[difficulty]:true},rewarded:{[difficulty]:true},attemptsRemaining:5}}};return{q,p};
}
test('both runtime check sites use real daily rewards and natural countdown metadata',()=>{for(const n of [1,2,3]){const{p,q}=pointer(n);const r=assertCompactNativePointerSettlementV198(p,q);assert.equal(r.formalEntryDebitVerified,false);assert.equal(r.naturalClockMeasured,true);}});
test('runtime refuses forged clocks, wrong rewards, remaining bodies, changed mainline or inventory',()=>{
 for(const change of [p=>p.clockMocked=true,p=>p.naturalClockProbe.after=p.naturalClockProbe.before,p=>p.playerSaveTouched=true,p=>p.initialInventory.bodies++,p=>p.finalPuzzle.queuedBlocks=1,p=>p.finalPuzzle.moves--,p=>p.finalPuzzle.remainingSeconds=0,p=>p.settlement.coins++,p=>p.settlement.inspiration++,p=>p.settlement.debug.earnedStars=3,p=>p.settlement.debug.kind='mainline',p=>p.settlement.highestLevel++,p=>p.settlement.boosters.time++,p=>p.settlement.daily.rewarded[1]=false,p=>p.settlement.daily.attemptsRemaining=4,p=>p.drawAudit.rotated=1]){const{p,q}=pointer();change(p);assert.throws(()=>assertCompactNativePointerSettlementV198(p,q));}
});
const registryText=entries=>'// preserved prefix\nexport const FORMAL_DAILY_300_REVISION = "'+hash(entries)+'";\nexport const FORMAL_DAILY_300_ENTRIES: readonly FormalDaily300Entry[] = Object.freeze('+JSON.stringify(entries,null,2)+');\n// preserved suffix\n';
const entry=(n=1)=>{const level={id:n,blocks:[]};return{formalId:'synthetic-'+n,stageKey:'synthetic',difficulty:1,slot:n,layoutSha256:hash(level),level};};
test('pure registry append preserves old entry objects, order, unrelated source and checked revision',()=>{
 const old=[entry()],text=registryText(old),baseline=compactNativeRegistryBaselineV198(text),before=copy(old),result=buildCompactNativeRegistryAppendV198(text,entry(2),baseline);
 assert.deepEqual(old,before);assert.deepEqual(result.entries.slice(0,-1),old);assert.equal(result.entries.length,2);assert(result.next.startsWith('// preserved prefix'));assert(result.next.endsWith('// preserved suffix\n'));assert.deepEqual(result.previousEntryHashes,baseline.entryHashes);
});
test('pure registry rejects drift, duplicate layout or slot, corrupt revision, extra declaration and full table',()=>{
 const text=registryText([entry()]),baseline=compactNativeRegistryBaselineV198(text);
 assert.throws(()=>buildCompactNativeRegistryAppendV198(text+' ',entry(2),baseline));
 assert.throws(()=>buildCompactNativeRegistryAppendV198(text,entry(),baseline));
 const occupied=entry(2);occupied.slot=1;assert.throws(()=>buildCompactNativeRegistryAppendV198(text,occupied,baseline));
 const bad=entry(2);bad.layoutSha256=H;assert.throws(()=>buildCompactNativeRegistryAppendV198(text,bad,baseline));
 assert.throws(()=>compactNativeRegistryBaselineV198(text.replace(hash([entry()]),H)));
 assert.throws(()=>compactNativeRegistryBaselineV198(text+text));
 const full=registryText(Array.from({length:300},(_,i)=>entry(i+1)));assert.throws(()=>buildCompactNativeRegistryAppendV198(full,entry(301),compactNativeRegistryBaselineV198(full)));
});
function qualification(){const{q,math}=fixture(),candidate=descriptor('synthetic/candidate.json'),design=descriptor('synthetic/design.json'),runtime=descriptor('synthetic/pointer.json'),baseline=compactNativeRegistryBaselineV198(registryText([entry()]));const row={qualified:true,candidate,...Object.fromEntries(['formalId','levelSha256','routeSha256','L','U','sourceLevelId','stageKey','difficulty','slot','toolchainSha256'].map(k=>[k,q[k]])),totalDrags:q.drags.length,designAcceptance:{rootDisposition:design,status:'DESIGN_ACCEPTED_WITHIN_CURRENT_SELECTION'},difficultyPolicy:{version:'1.198.0',actualProofValuesUnchanged:true,band:q.band},mathematicalEvidence:math};const report={schemaVersion:1,version:QUAL_VERSION,status:NATIVE_QUALIFICATION_STATUS,activeRuleVersion:'1.198.0',proofKind:'native-full-layers',errors:[],rows:[row],formalReady:false,registrationPerformed:false,oldEvidenceChanged:false,newSearches:0,newModels:0,newReplays:0,newClaims:0,candidatePointer:runtime,registryBaseline:baseline,formalCountObserved:baseline.count,fileBindings:{[NATIVE_REGISTRY_PATH]:baseline.sha256},execution:{status:'COMPACT_SHELL_PROVIDED_NATIVE_ORIGINAL_EXECUTION_METADATA_VERIFIED',lowerProjectionWorlds:0,originalFullLayerWorldsPreserved:true,nativeExecutionClosureFiles:54}};return{report,q,candidate,design,runtime};}
test('admission metadata requires exact native qualification and same source, route and registry',()=>{
 const check=x=>assertCompactNativeAdmissionQualificationV198(x.report,x.q,x.candidate,x.design,x.runtime);check(qualification());
 for(const change of [x=>x.report.version='legacy',x=>x.report.proofKind='projected',x=>x.report.newModels=1,x=>x.report.rows[0].L++,x=>x.report.rows[0].candidate.sha256=J,x=>x.report.candidatePointer.sha256=J,x=>x.report.registryBaseline.count++,x=>x.report.fileBindings[NATIVE_REGISTRY_PATH]=J,x=>x.report.execution.lowerProjectionWorlds=1,x=>x.report.execution.nativeExecutionClosureFiles=53,x=>x.report.rows[0].mathematicalEvidence.projectedLevelSha256=H]){const x=qualification();x.report=copy(x.report);change(x);assert.throws(()=>check(x));}
});
