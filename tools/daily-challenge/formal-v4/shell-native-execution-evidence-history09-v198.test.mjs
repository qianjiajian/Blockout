import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {levelSha256 as hash} from '../formal-v2/contract.mjs';
import {SHELL_NATIVE_PROOF_VERSION,SHELL_NATIVE_PRIMITIVE as S,SHELL_PROVIDED_NATIVE_LOWER_BUDGET as B,authoredShellProvidedNativeMathOptionsV198,accountShellProvidedNativeSearchReceiptV198} from './shell-provided-native-search-budget-v198.mjs';
import {VERSION} from './run-authored-shell-provided-native-once-v198-history09.mjs';
import {assertNewShellProvidedNativeReceiptV198,assertOriginalNativeMathematicalEvidenceV198,assertShellProvidedNativeExecutionEvidenceV198,assertShellOriginalRouteMetadataV198,assertShellProvidedNativeCompletionMetadataV198,assertShellProvidedNativeWorldMetadataV198,shellNativeLowerBindingReadPathV198} from './shell-native-execution-evidence-history09-v198.mjs';

// Synthetic metadata, NOT playable route/proof evidence. Never load a runtime,
// model, saved candidate, history pack or public ledger. Fixed core bindings
// below are metadata only; no core file or historical fixture is read by tests.
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
const originalCheck=f=>assertOriginalNativeMathematicalEvidenceV198(f.q,f.math,{original:f.q,request:f.request,result:f.result});

test('synthetic native receipt preserves original world, primitive flags, layer trace and single-call budget',()=>{
 const {q}=fixture(),before=copy(q),v=assertNewShellProvidedNativeReceiptV198(q);assert.deepEqual(q,before);assert.equal(v.nativeLower.retainedLayers,3);assert.equal(v.nativeLower.retainedBodies,2);assert.equal(v.nativeLower.projection,null);assert.equal(v.accounting.conservativeFullWorlds,21);assert.equal(v.accounting.totalSearchCalls,1);
 const route=assertShellOriginalRouteMetadataV198(q);assert.equal(route.shells[0].clears.length,2);assert.deepEqual(route.shells[0].otherBodyActionsBetweenFirstPeelAndRemoval,[{drag:15,blockId:'fixture-body',clearDelta:1}]);
});
test('native original mathematics matches original public result exactly without schema translation',()=>{
 const f=fixture(),before=copy(f),r=originalCheck(f);assert.equal(r.nativeFullLayers,true);assert.equal(r.originalGuard,true);assert.equal(r.projectedLevelSha256,null);assert.equal(r.proofInputLevelSha256,f.q.levelSha256);assert.deepEqual(f,before);
});
test('receipt rejects projected strategy/schema, promoted primitive flags, unknown result and second calls',()=>{
 for(const change of [
  q=>q.contractVersion='daily-300-frozen-math-first-attempt-tolerance-v198',q=>q.attemptPlan.strategy.lower='projected-plain',q=>q.lowerBound.projection={},q=>q.lowerBound.projectedLevelSha256=P,
  q=>q.lowerBound.qualificationOnly=false,q=>q.lowerBound.productionQualified=true,q=>q.lowerBound.catalogAcceptanceEnabled=true,q=>q.lowerBound.result.catalogAcceptanceEnabled=true,
  q=>q.lowerBound.result.termination='below-threshold-exhausted',q=>q.lowerBound.result.requiredFloor=12,q=>q.lowerBound.result.inputLevelSha256=P,
  q=>{q.lowerBound.result.status='unknown';q.lowerBound.result.thresholdProven=false;q.lowerBound.result.L=null;},q=>q.executionCalls.lower=2,q=>q.route.search={},q=>q.qualificationOnly=true,q=>q.L=14,
 ]){const {q}=fixture();change(q);assert.throws(()=>assertNewShellProvidedNativeReceiptV198(q));}
});
test('native guard cannot be forged or charged as projected/zero-state proof',()=>{
 for(const change of [
  q=>q.lowerBound.result.guardAllowance.version='raw-set-9999-plus-one-terminal-candidate-v1',q=>q.lowerBound.result.guardAllowance.unregisteredTerminalWorldAllowance=0,q=>q.lowerBound.result.guardAllowance.conservativeFullBoardStateUpperBound=20,
  q=>{q.lowerBound.result.rawFullBoardStates=10000;q.lowerBound.originalResult.rawFullBoardStates=10000;},q=>q.lowerBound.result.guardAllowance.adapter.sha256=P,
  q=>{q.lowerBound.result.elapsedMilliseconds=30000;q.lowerBound.originalResult.elapsedMilliseconds=30000;},q=>{q.lowerBound.result.domain.retainsAllLayers=false;q.lowerBound.originalResult.domain.retainsAllLayers=false;},
 ]){const {q}=fixture();change(q);assert.throws(()=>assertNewShellProvidedNativeReceiptV198(q));}
});
test('receipt rejects missing inner clears and coordinated replay arithmetic corruption',()=>{
 for(const change of [q=>q.route.independentReplay.trace.pop(),q=>q.route.independentReplay.remainingBodies=1,q=>q.route.canonicalReplay.clearEvents=q.route.independentReplay.clearEvents=4,q=>q.route.independentReplay.trace[15].blockId='fixture-body',q=>q.route.witnessValidation.searchPerformed=true]){const {q}=fixture();change(q);assert.throws(()=>assertNewShellProvidedNativeReceiptV198(q));}
});
test('original admission rejects substituted raw proof, attempt, summary, layer inventory or nonzero upper search',()=>{
 for(const change of [f=>f.result.lower.certifiedFloor=14,f=>f.result.upper={},f=>f.result.accepted=false,f=>f.request.redesignOf=J,f=>f.math.guardAllowance.registeredRawSetStates=0,f=>f.math.projectedLevelSha256=P,f=>f.math.lowerEvidenceSha256=H,f=>f.math.proofInputLevelSha256=P,f=>f.math.mathematicalCalls=2,f=>f.math.completeOriginalInventory=false]){const f=fixture();change(f);assert.throws(()=>originalCheck(f));}
 const f=fixture(),q=copy(f.q);q.level.blocks[0].layers.pop();assert.throws(()=>assertOriginalNativeMathematicalEvidenceV198(q,f.math,{original:f.q,request:f.request,result:f.result}));
});
function completion(){return{version:VERSION,status:'AUTHORED_SHELL_SINGLE_INPUT_CLOSED',closed:true,normalExportAllowed:true,qualifierEntered:true,qualifierReturned:true,mathematicalReceiptPersisted:true,mathematicallyAccepted:true,restartAllowed:false,accepted:false,formalReady:false,consumedInputs:1,maximumInputs:1,formedFullWorlds:1,publicClaimsStarted:1,lowerProjectionWorlds:0,persistedLowerProjectionWorldFields:[],newConstructions:0,administrativeError:null,unpersistedOriginalMathematicalResult:null,unpersistedInputs:[],receipt:descriptor('synthetic/candidate.json')};}
test('native completion accepts exactly one original world and rejects projection/partial/administrative success',()=>{
 const c=descriptor('synthetic/candidate.json');assertShellProvidedNativeCompletionMetadataV198(completion(),c);
 for(const change of [d=>d.lowerProjectionWorlds=1,d=>d.persistedLowerProjectionWorldFields=[{field:'lowerBound.projection.projectedLevel'}],d=>d.formedFullWorlds=2,d=>d.closed=false,d=>d.qualifierReturned=false,d=>d.mathematicallyAccepted=false,d=>d.publicClaimsStarted=0,d=>d.administrativeError='interrupted',d=>d.unpersistedInputs=[{}],d=>d.version='single-authored-shell-provided-input-once-v198-history09']){const d=completion();change(d);assert.throws(()=>assertShellProvidedNativeCompletionMetadataV198(d,c));}
});
test('each native owner contains precisely the bound original inventory, never a second projected world',()=>{
 const {q}=fixture(),d=descriptor('synthetic/candidate.json'),reference=descriptor('synthetic/reference.json');
 const rows=[{descriptor:d,field:'level',level:copy(q.level),sourceLevelId:2,reference,fingerprints:copy(q.attempt)}];assertShellProvidedNativeWorldMetadataV198(rows,d,q,reference);
 for(const change of [r=>r.push(copy(r[0])),r=>r[0].field='lowerBound.projection.projectedLevel',r=>r[0].level.blocks[0].layers.pop(),r=>r[0].descriptor.sha256=P,r=>r[0].fingerprints.retryIdentitySha256=P]){const r=copy(rows);change(r);assert.throws(()=>assertShellProvidedNativeWorldMetadataV198(r,d,q,reference));}
});
test('unqualified execution evidence rejects before any caller IO',async()=>{
 let calls=0;await assert.rejects(assertShellProvidedNativeExecutionEvidenceV198(null,null,null,{read:async()=>{calls++;},bind:async()=>{calls++;}}),/qualification required before evidence IO/);assert.equal(calls,0);
});
test('native core reads resolve only exact historical keys to frozen runtime without changing metadata',()=>{
 const {q}=fixture(),before=copy(q),frozen=path.resolve('synthetic/frozen-workspace-4588'),p='src/core/PuzzleModel.ts',h=CORE_BINDINGS[p];
 assert.equal(shellNativeLowerBindingReadPathV198(p,h,q,frozen),path.join(frozen,p));
 const engine=path.resolve('synthetic/native/bounded-native-lower.mjs');assert.equal(shellNativeLowerBindingReadPathV198(engine,S.engineSha256,q,frozen),engine);assert.deepEqual(q,before);
 for(const[p,h]of [['src/core/PuzzleModel.ts',H],['src/core/../core/PuzzleModel.ts',CORE_BINDINGS['src/core/PuzzleModel.ts']],['src\\core\\PuzzleModel.ts',CORE_BINDINGS['src/core/PuzzleModel.ts']],['../src/core/PuzzleModel.ts',H],['unbound-relative.mjs',H]])assert.throws(()=>shellNativeLowerBindingReadPathV198(p,h,q,frozen));
 assert.throws(()=>shellNativeLowerBindingReadPathV198(p,h,q,'relative-workspace'));
 const changed=copy(q);changed.toolchainBindings[p]=H;assert.throws(()=>shellNativeLowerBindingReadPathV198(p,H,changed,frozen));
});
test('native receipt rejects dropped or changed frozen runtime proof bindings and altered accounting',()=>{
 for(const change of [q=>delete q.lowerBound.bindings['src/core/PuzzleModel.ts'],q=>q.lowerBound.bindings['src/core/PuzzleModel.ts']=H,q=>q.searchAccounting.conservativeFullWorlds=0,
  q=>{for(const r of [q.lowerBound.result,q.lowerBound.originalResult]){delete r.nativeToolchainBindings['src/core/PuzzleModel.ts'];r.nativeToolchainSha256=hash(r.nativeToolchainBindings);}},
 ]){const {q}=fixture();change(q);assert.throws(()=>assertNewShellProvidedNativeReceiptV198(q));}
});
