import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {loadV4Runtime} from './runtime.mjs';
import {makeLowBandPrefixTailPlan,LOW_BANDS} from './prefix-tail-low-band.mjs';
import {assertLowBandPlanSchema,assertLowBandCandidateIdentity,assertLowBandPrefixFacts} from './audit-low-band-prefix-static-independent.mjs';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {canonicalExit} from '../formal-v2/proof-scheduled-route.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {guardAllowanceFor} from '../formal-v3/reserved-guard-budget.mjs';
import {inspectSearchAccounting} from '../formal-v3/catalog-contract.mjs';

// Only inspects immutable recorded searches and replays provided gestures.
// No search, constructor, ledger creation, claim or finish function is called.
const own='tools/daily-challenge/formal-v4/audit-low-band-prefix-actual-independent.mjs';
const completionPath=process.argv[2]??'deliverables/daily-formal-v4-20261008/design/low-band-sixteen-math-01/completion.json';
const output=process.argv[3]??'deliverables/daily-formal-v4-20261008/proof/low-band-prefix-actual-independent-01';
const ledger='deliverables/daily-formal-v3-20261008/proof/attempts';
const sha=b=>createHash('sha256').update(b).digest('hex'),bindings={},results=[],errors=[];
async function bytes(file,expected){const absolute=path.resolve(file),b=await fs.readFile(absolute),actual=sha(b);
 if(expected)assert.equal(actual,expected,`File changed: ${file}`);if(bindings[absolute])assert.equal(actual,bindings[absolute]);bindings[absolute]=actual;return b;}
const read=async(file,expected)=>JSON.parse(await bytes(file,expected));
const bound=async descriptor=>{assert(descriptor?.path&&/^[a-f0-9]{64}$/.test(descriptor.sha256));return read(descriptor.path,descriptor.sha256);};
async function checkBindings(map){assert(map&&typeof map==='object');for(const [p,h]of Object.entries(map))await bytes(p,h);}
const exists=p=>fs.stat(p).then(()=>true).catch(e=>{if(e.code==='ENOENT')return false;throw e;});
const bodiesKey=blocks=>levelSha256(blocks.map(b=>({id:b.id,x:b.x,y:b.y,shape:b.shape,color:b.color})).sort((a,b)=>a.id.localeCompare(b.id)));
function providedTrace(runtime,level,drags){
 const model=new runtime.PuzzleModel(structuredClone(level));model.startCountdown();const trace=[],gateCounts={};
 for(const [index,drag]of drags.entries()){
  assert(model.getBlock(drag.blockId));const before=model.snapshot();model.beginAction();
  let side=canonicalExit(runtime,model,drag.blockId);assert(!side||drag.path.length===0,'Early pointer-down exit');
  for(const [step,p]of drag.path.entries()){
   const body=model.getBlock(drag.blockId),previous=[body.x,body.y];
   assert.equal(Math.abs(body.x-p[0])+Math.abs(body.y-p[1]),1);assert(model.moveBlockStep(drag.blockId,...p));
   side=canonicalExit(runtime,model,drag.blockId,previous);assert(!side||step===drag.path.length-1,'Early held-path exit');
  }
  assert.equal(side,drag.exitSide);let gateId=null;
  if(side){const exit=model.tryExit(drag.blockId,side);assert(exit.ok);assert(level.gates.some(g=>g.id===exit.gateId));
   gateId=exit.gateId;gateCounts[gateId]=(gateCounts[gateId]??0)+1;}
  assert(model.commitAction());const after=model.snapshot(),clearDelta=after.cleared-before.cleared;
  assert.equal(clearDelta,Number(!!side));assert.equal(after.moves,before.moves+1);
  trace.push({index,blockId:drag.blockId,gateId,clearDelta,remainingBodies:after.blocks.length,bodyStateSha256:bodiesKey(after.blocks)});
 }
 return{trace,gateCounts,snapshot:model.snapshot()};
}
function searchAccounting(search,label){
 assert.deepEqual(inspectSearchAccounting(search,label),[]);assert.deepEqual(search.guardAllowance,guardAllowanceFor(search));
 assert(search.budget.maxStates<=9999);assert(search.guardAllowance.conservativeFullBoardStateUpperBound<=10000);
}
let completion=null,runtime=null,publicLedgerObservation=null;
try{
 runtime=await loadV4Runtime();assert.equal(runtime.toolchainSha256,'45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804');
 await bytes(own);completion=await read(completionPath);assert.equal(completion.status,'FINITE_FIRST_PREFIX_TAIL_BATCH_FINISHED');
 const imports=await build({entryPoints:[own],bundle:true,packages:'external',metafile:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
 for(const file of Object.keys(imports.metafile.inputs))await bytes(file);
 assert.equal(completion.results.length,16);assert.equal(completion.mathematicalPoolAccepted,completion.results.filter(r=>r.accepted).length);assert.equal(completion.selectedCandidatesAdded,0);
 const index=await bound(completion.descriptors.index),staticAudit=await bound(completion.descriptors.audit),visual=await bound(completion.descriptors.visual);
 assert.equal(staticAudit.status,'INDEPENDENT_LOW_BAND_PREFIX_STATIC_PASS');assert.deepEqual(staticAudit.errors,[]);await checkBindings(staticAudit.fileBindings);
 assert.equal(visual.status,'ROOT_ALL_NEW_OPENINGS_VISUALLY_REVIEWED');await checkBindings(visual.fileBindings);
 assert.equal(index.stocksEnteringColourCspIncludingFailed,16);assert.equal(index.eligibleInputs,16);assert.equal(index.macro64ActualInputsIncludingThis,49);
 const fixedPlan=await bound(completion.batchPlan);await checkBindings(fixedPlan.bindings??fixedPlan.fileBindings??{});
 assertLowBandPlanSchema(fixedPlan);assert.equal(completion.batchPlan.sha256,'956f5f2e2bce5eac51c60b5511ba9bc1b443ba74ee476bbf9e24dca37f9c17a5');
 for(const blueprint of fixedPlan.blueprints)assert.equal(index.perRecipeColourCspInputs[blueprint.recipeId],blueprint.maximumStocks);
 const qualification=await bound(completion.descriptors.qualification);assert.equal(qualification.status,'INDEPENDENT_LOW_BAND_PREFIX_TAIL_PASS');assert.deepEqual(qualification.errors,[]);await checkBindings(qualification.toolBindings);
 assert.equal(index.plan.sha256,completion.batchPlan.sha256);
 assert.deepEqual(staticAudit.index,completion.descriptors.index);assert.deepEqual(staticAudit.plan,completion.batchPlan);
 assert.equal(staticAudit.verifiedCandidates,16);assert.equal(staticAudit.publicClaimsStarted,0);assert.equal(staticAudit.newGameplaySearches,0);
 assert.deepEqual(visual.index,completion.descriptors.index);assert.equal(visual.viewedCandidates,16);
 assert.deepEqual(completion.results.map(r=>r.input),index.candidates.map(r=>r.path));
 assert.deepEqual(completion.accepted,completion.results.filter(r=>r.accepted).map(r=>({path:r.file,sha256:r.sha256})));
 const latestFailure=new Map(fixedPlan.failedParents.map(p=>[p.source,p.id]));
 const requestNames=(await fs.readdir(ledger)).filter(n=>n.endsWith('.request.json')).sort(),requests=[];
 for(const name of requestNames)requests.push(await read(`${ledger}/${name}`));
 for(const row of completion.results){
  const q=await read(row.file,row.sha256),input=await bound(q.input),prior=await bound(q.plan.constructionEvidence);
  const bp=fixedPlan.blueprints.find(b=>b.recipeId===input.recipeId);assert(bp);
  const originalAttempt=index.attempts.find(a=>a.candidate?.path===q.input.path);assert(originalAttempt);
  assertLowBandCandidateIdentity(fixedPlan,bp,originalAttempt,q.input,input);
  assert.equal(q.targetDifficulty,input.targetDifficulty);assert.equal(row.targetDifficulty,input.targetDifficulty);const band=LOW_BANDS[input.targetDifficulty];assert(band);
  assert.deepEqual(q.level,input.level);assert.deepEqual(q.level,prior.level);assert.equal(levelSha256(q.level),q.levelSha256);
  assert.equal(q.levelSha256,row.accepted?q.route.inputLevelSha256:q.plan.levelSha256);assert.equal(q.plan.sourceLevelId,q.sourceLevelId);
  assert.deepEqual(q.plan.constructionAccounting,prior.constructionAccounting);assert.deepEqual(input.prefixDrags,prior.prefixDrags);
  assert.equal(routeSha256(input.prefixDrags),q.plan.prefixSha256);
  assert.deepEqual(q.plan,makeLowBandPrefixTailPlan(runtime,{...input,constructionEvidence:q.plan.constructionEvidence},
   {upperBudget:q.plan.fullUpperBudget,lowerBudget:q.plan.lowerBudget,targetDifficulty:q.targetDifficulty}));
  for(const k of ['accepted','status','L','U','sourceLevelId'])assert.equal(q[k],row[k]);
  for(const k of ['qualificationOnly','catalogEligible','formalReady','currentRuntimeValidationClaimed','productionChanged'])assert.equal(q[k],false);
  assert.deepEqual(q.toolchainBindings,runtime.toolchainBindings);await checkBindings(q.designBindings);await checkBindings(q.toolchainBindings);
  assert.equal(q.designToolchainSha256,levelSha256(q.designBindings));
  const batchPlan=await read(q.batchExecutionPlan);await checkBindings(batchPlan.bindings);
  const fixedInput=batchPlan.inputs.find(r=>r.descriptor.path===q.input.path);assert(fixedInput);assert.deepEqual(fixedInput.plan,q.plan);
  assert.deepEqual(fixedInput.descriptor,q.input);assert.equal(batchPlan.secondStrategyAllowed,false);assert.equal(batchPlan.secondBandAllowed,false);
  const planEvidence=await bound(q.planEvidence);assert.deepEqual(planEvidence.plan,q.plan);assert.deepEqual(planEvidence.attempt,q.attempt);
  assert.deepEqual(planEvidence.prefixDrags,input.prefixDrags);assert.deepEqual(planEvidence.bindings,q.designBindings);
  const saved=await read(q.evidenceFile);for(const [key,value]of Object.entries(saved))assert.deepEqual(q[key],value,`Original saved receipt ${key}`);
  const stem=`${ledger}/${q.attempt.id}`,request=await read(stem+'.request.json'),result=await read(stem+'.result.json');
  assert.deepEqual(request,q.attempt);assert.equal(request.id,row.attemptId);assert.equal(request.levelSha256,q.levelSha256);
  const fp=designFingerprints(q.level);for(const [key,value]of Object.entries(fp))assert.deepEqual(request[key],value);
  assert.equal(request.retryIdentitySha256,levelSha256({shapeSha256:fp.shapeSha256,colorSha256:fp.colorSha256}));
  const alias=await read(`${ledger}/identities/${request.retryIdentitySha256}.json`);assert.equal(alias.origin,request.id);
  assert.equal(request.identityOrigin,request.id);assert(!request.revalidates);assert.equal(request.redesignOf,row.redesignOf);
  assert.equal(request.redesignOf,latestFailure.get(q.sourceLevelId),'Sequential latest failure must bind each fresh input');
  assert.deepEqual(requests.filter(r=>r.id===request.id||r.shapeSha256===fp.shapeSha256&&r.colorSha256===fp.colorSha256).map(r=>r.id),[request.id],
   'Exactly one historical request for this physical design/retry identity');
  const parent=await read(`${ledger}/${request.redesignOf}.request.json`),parentResult=await read(`${ledger}/${request.redesignOf}.result.json`);
  for(const p of [`${ledger}/${request.redesignOf}.blocked.json`,`${ledger}/identities/${parent.retryIdentitySha256}.blocked.json`]){
   const blocked=await read(p);assert.equal(blocked.attemptId,parent.id);assert.equal(blocked.status,parentResult.status);}
  assert.equal(parentResult.accepted,false);assert.notEqual(parent.shapeSha256,fp.shapeSha256);assert.notEqual(parent.colorSha256,fp.colorSha256);
  const priorColors=new Map(parent.colorAssignments.map(b=>[b.id,JSON.stringify(b.colors)])),shared=fp.colorAssignments.filter(b=>priorColors.has(b.id));
  if(shared.length)assert(shared.some(b=>priorColors.get(b.id)!==JSON.stringify(b.colors)),'Actual shared body colour must change');
  else assert.notEqual(levelSha256(parent.colorAssignments.map(b=>b.colors).sort()),levelSha256(fp.colorAssignments.map(b=>b.colors).sort()),'Without shared IDs the actual full colour inventory must change');
  assert.equal(result.accepted,q.accepted);assert.equal(result.status,q.status);assert.equal(result.levelSha256,q.levelSha256);
  assert.deepEqual(result.lower,q.lowerBound?.result);assert.deepEqual(result.upper,q.route?.search);
  const prefix=providedTrace(runtime,q.level,input.prefixDrags),upper=q.upperConstruction,tail=upper.tailSearch;
  const prefixParking=prefix.trace.filter(t=>t.clearDelta===0).length;
  assertLowBandPrefixFacts(bp,{drags:prefix.trace.length,nonClearingDrags:prefixParking,clearEvents:prefix.trace.filter(t=>t.clearDelta===1).length});
  assert.equal(q.plan.prefixParking,prefixParking);assert.equal(upper.prefixParking,prefixParking);
  assert.equal(q.plan.floor,band.floor);assert.equal(q.plan.totalUpperLimit,band.upper);
  assert.equal(q.plan.tailParkingLimit,band.upper-prefixParking);assert.equal(upper.plan.searchUpper,q.plan.tailParkingLimit);
  assert.equal(q.plan.bandChangeAfterClaimAllowed,false);assert.equal(tail.floor,1);
  assert.equal(bodiesKey(prefix.snapshot.blocks),bodiesKey(upper.tailLevel.blocks));assert.deepEqual(upper.tailLevel.gates,q.level.gates);
  assert.equal(levelSha256(upper.tailLevel),upper.tailLevelSha256);assert.equal(tail.sourceLevelSha256,upper.tailLevelSha256);
  assert.notEqual(tail.sourceLevelSha256,q.levelSha256);assert.equal(upper.tailSearches,1);assert.equal(upper.lowerBoundClaimed,false);
  searchAccounting(tail,'recorded-tail');assert.equal(upper.prefixAudits.length,input.prefixDrags.length);
  for(const [i,a]of upper.prefixAudits.entries()){assert(a.valid);assert.equal(a.clearEvents,prefix.trace[i].clearDelta);assert.equal(a.remainingBodies,prefix.trace[i].remainingBodies);}
  const accounted=q.plan.constructionAccounting.completeWorldReservations+input.prefixDrags.length+1+tail.rawFullBoardStates+1;
  assert.equal(accounted,q.upperAccounting.conservativeFullBoardStateUpperBound);assert.equal(accounted,row.upperWorlds);assert(accounted<=10000);
  assert.equal(tail.budget.maxStates,10000-q.plan.constructionAccounting.completeWorldReservations-input.prefixDrags.length-1-1);
  assert.equal(tail.budget.maxTransitions,10000000-q.plan.constructionAccounting.transitions-upper.prefixTransitions);
  assert.equal(tail.budget.maxMicroStates,3000000-q.plan.constructionAccounting.microStates);
  assert(q.plan.constructionAccounting.elapsedMilliseconds+upper.elapsedMilliseconds<=30000);
  const detail={file:row.file,sha256:row.sha256,accepted:q.accepted,L:q.L,U:q.U,targetDifficulty:q.targetDifficulty,band,sourceLevelId:q.sourceLevelId,levelSha256:q.levelSha256,
   shapeSha256:fp.shapeSha256,colorSha256:fp.colorSha256,sharedParentIds:shared.length,
   sharedParentIdsRecoloured:shared.filter(b=>priorColors.get(b.id)!==JSON.stringify(b.colors)).map(b=>b.id),
   attemptId:request.id,redesignOf:request.redesignOf,upperWorlds:accounted,tailRegisteredRaw:tail.rawFullBoardStates,
   upperTransitions:q.plan.constructionAccounting.transitions+upper.prefixTransitions+tail.attemptedTransitions,
   upperMicro:q.plan.constructionAccounting.microStates+tail.microDiscoveredStates,
   upperElapsedMilliseconds:q.plan.constructionAccounting.elapsedMilliseconds+upper.elapsedMilliseconds,
   tailOutcome:{status:tail.status,termination:tail.termination,recordedCertifiedFloor:tail.certifiedFloor??null,notOriginalLowerEvidence:true},
   prefixVerifiedGestures:prefix.trace.length,prefixParking,tailParkingCeiling:q.plan.tailParkingLimit,lowerWorlds:null,failureSealed:false};
  if(q.route){
   assert(Number.isSafeInteger(q.U)&&q.U>=0);assert(upper.valid&&upper.complete);assert.equal(upper.U,q.U);
   assert.equal(routeSha256(q.drags),q.routeSha256);assert.deepEqual(q.drags,[...input.prefixDrags,...tail.drags]);
   assert.equal(q.U-prefixParking,tail.cost);assert(q.U-prefixParking<=q.plan.tailParkingLimit);
   const canonical=runtime.replayRevisedRoute(q.level,q.drags),independent=independentReplay(runtime,q.level,q.drags),actual=providedTrace(runtime,q.level,q.drags);
   assert.deepEqual(JSON.parse(JSON.stringify(canonical)),q.route.canonicalReplay);assert.deepEqual(JSON.parse(JSON.stringify(independent)),q.route.independentReplay);
   for(const replay of [canonical,independent]){assert(replay.valid&&replay.complete&&!replay.failed);assert.equal(replay.effectiveDrags,q.drags.length);
    assert.equal(replay.nonClearingDrags,q.U);assert.equal(replay.clearEvents,q.level.blocks.length);}
   assert.equal(independent.remainingBodies,0);assert.equal(independent.remainingQueued,0);assert(actual.snapshot.complete&&!actual.snapshot.failed);
   assert.equal(actual.trace.filter(t=>t.clearDelta===0).length,q.U);assert.equal(actual.trace.filter(t=>t.clearDelta===1).length,q.level.blocks.length);
   Object.assign(detail,{completeRouteGestures:q.drags.length,originalInventory:q.level.blocks.length,allGatesUsed:actual.gateCounts,
    freshCanonicalReplay:canonical,freshIndependentReplay:independent,actualGateTrace:actual.trace});
   if(q.U<band.floor||q.U>band.upper){
    assert(!q.accepted);assert.equal(q.L,null);assert.equal(q.lowerBound,null);assert.equal(row.lowerWorlds,null);
    assert.equal(q.status,q.U<band.floor?'KNOWN_UPPER_BELOW_PREDECLARED_FLOOR':'KNOWN_UPPER_ABOVE_PREDECLARED_CEILING');
    detail.lowerOutcome={notCalled:true,reason:'Complete U outside fixed band',notAReclassifiedDifficulty:true};
   }else{
    assert.equal(q.lowerBound.method,'v3-plain');assert.equal(q.lowerBound.requiredFloor,band.floor);
    assert.equal(q.lowerBound.inputLevelSha256,q.levelSha256);assert.deepEqual(q.proof,q.lowerBound.result);
    const lower=q.lowerBound.result;searchAccounting(lower,'recorded-original-lower');assert.equal(lower.sourceLevelSha256,q.levelSha256);
    assert.equal(lower.floor,band.floor);assert.deepEqual(lower.budget,q.plan.lowerBudget);
    if(q.accepted){assert.equal(q.L,band.floor);assert.equal(q.difficulty,q.targetDifficulty);assert.equal(q.status,'EXPLORATORY_PREFIX_TAIL_FULL_ORIGINAL_LU');
     assert.equal(lower.status,'threshold-proven');assert.equal(lower.termination,'below-threshold-exhausted');assert.equal(lower.thresholdProven,true);assert.equal(lower.certifiedFloor,band.floor);
     assert.equal(await exists(stem+'.blocked.json'),false);assert.equal(await exists(ledger+'/identities/'+request.retryIdentitySha256+'.blocked.json'),false);
    }else{
     assert.equal(q.L,null);assert.equal(q.status,'UNKNOWN_OR_SHORTCUT_ORIGINAL_LOWER_TERMINAL');assert.equal(lower.thresholdProven,false);
     if(lower.status==='relaxed-shortcut'){assert.equal(lower.termination,'relaxed-completion');assert(Number.isSafeInteger(lower.cost)&&lower.cost<band.floor);}
     else{assert.equal(lower.status,'unknown');assert(['max-raw-board-states','max-transitions','max-micro-states','max-milliseconds'].includes(lower.termination));}
    }
    Object.assign(detail,{lowerWorlds:lower.guardAllowance.conservativeFullBoardStateUpperBound,lowerRegisteredRaw:lower.rawFullBoardStates,
     lowerTransitions:lower.attemptedTransitions,lowerMicro:lower.microDiscoveredStates,
     lowerOutcome:{status:lower.status,termination:lower.termination,requiredFloor:band.floor,thresholdProven:lower.thresholdProven,
      relaxedCost:lower.cost??null,recordedCertifiedFloor:lower.certifiedFloor??null,notAReclassifiedDifficulty:true}});
    assert.equal(detail.lowerWorlds,row.lowerWorlds);
   }
  }else{
   assert(!upper.valid&&!upper.complete);assert.equal(q.status,'UNKNOWN_CONSTRUCTED_UPPER_TERMINAL');assert.equal(q.L,null);assert.equal(q.U,null);assert.equal(q.lowerBound,null);assert.equal(q.route,null);assert.equal(row.lowerWorlds,null);
   if(tail.status==='unknown'){
    assert(['max-raw-board-states','max-transitions','max-micro-states','max-milliseconds'].includes(tail.termination));
    if(tail.termination==='max-raw-board-states')assert.equal(accounted,10000);
   }else{
    assert.equal(tail.status,'threshold-proven');assert.equal(tail.termination,'below-threshold-exhausted');assert.equal(tail.routeTermination,'search-upper-exhausted');
    assert.equal(tail.cost,undefined);assert(!tail.drags?.length);
   }
   detail.upperFailureReason=upper.reason;detail.lowerOutcome={notCalled:true,reason:'No original full U in fixed tail window',notAReclassifiedDifficulty:true};
  }
  if(!q.accepted){
   for(const p of [stem+'.blocked.json',`${ledger}/identities/${request.retryIdentitySha256}.blocked.json`]){
    const blocked=await read(p);assert.equal(blocked.attemptId,request.id);assert.equal(blocked.status,q.status);}
   detail.failureSealed=true;
   latestFailure.set(q.sourceLevelId,request.id);
  }
  results.push(detail);
 }
 assert.equal(results.length,16);assert.equal(results.filter(r=>r.accepted).length,completion.mathematicalPoolAccepted);
 const finalNames=(await fs.readdir(ledger)).filter(n=>n.endsWith('.request.json')).sort();
 assert(requestNames.every(n=>finalNames.includes(n)),'An existing public request disappeared');
 const additions=finalNames.filter(n=>!requestNames.includes(n));
 for(const name of additions){const request=await read(`${ledger}/${name}`);
  assert(!results.some(r=>request.id===r.attemptId||request.shapeSha256===r.shapeSha256&&request.colorSha256===r.colorSha256),'A concurrent duplicate candidate claim appeared');}
 publicLedgerObservation={requestsBefore:requestNames.length,requestsAfter:finalNames.length,concurrentUnrelatedNewRequestFiles:additions,
  existingRequestsByteUnchanged:true,auditorPublicWrites:0};
 for(const [p,h]of Object.entries(bindings))assert.equal(sha(await fs.readFile(p)),h,`Final immutable check: ${p}`);
}catch(error){errors.push(error.stack??error.message);}
await fs.mkdir(output,{recursive:false});
const report={status:errors.length?'INDEPENDENT_PREFIX_TAIL_ACTUAL_BATCH_FAIL':'INDEPENDENT_PREFIX_TAIL_ACTUAL_BATCH_PASS',
 completion:{path:completionPath,sha256:bindings[path.resolve(completionPath)]},fileBindings:bindings,results,errors,publicLedgerObservation,
 accepted:results.filter(r=>r.accepted).length,newSearches:0,newConstructionCalls:0,newLedgerClaims:0,publicLedgerWrites:0,
 executionWorkspace:path.resolve('.'),proofToolchainSha256:runtime?.toolchainSha256,policyRuleVersion:runtime?.policyRuleVersion,
 currentRuntimeValidationClaimed:false,formalPointerValidated:false,naturalTimeValidated:false,productionChanged:false,
 admissionRecommendation:'Only independently accepted rows may be considered for an available slot after current stage/static/diversity/gate-geometry and preserved ancestry checks. Preserve the original LevelSpec and mathematical receipt; no new lower search or alternate failed-input attempt.',
 limitations:['Snapshot4588 models only; current UI compatibility and final production dual-screen Pointer/natural-clock acceptance remain separate.',
 'Search certificates are inspected and fully bound; this audit does not rerun or reclassify any search. Every failed result retains both public blocked records and cannot be retried unchanged.']};
const reportFile=path.join(output,'report.json');await fs.writeFile(reportFile,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:report.status,report:reportFile,sha256:sha(await fs.readFile(reportFile)),accepted:report.accepted,errors}));
if(errors.length)process.exitCode=1;
