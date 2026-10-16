import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadV4CatalogRuntime,auditV4Diversity} from './catalog-contract.mjs';
import {auditV4StaticCandidate} from './static-contract.mjs';
import {auditRouteConstraint} from './route-constraint-construction.mjs';
import {CONSTRAINT_SEED139} from './constraint-design-context.mjs';
import {CONSTRUCTION_LEDGER,inspectConstructionAccounting} from './capacity-construction-ledger.mjs';
import {PUBLIC_ATTEMPT_LEDGER} from './bounded-qualify.mjs';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {replayDecorated} from '../formal-v2/mechanism-decorate.mjs';
import {projectStaticConstraints} from '../formal-v2/constraint-projection.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {mechanismInventory} from '../formal-v3/mechanism-intensity.mjs';
import {inspectSearchAccounting} from '../formal-v3/catalog-contract.mjs';
import {guardAllowanceFor} from '../formal-v3/reserved-guard-budget.mjs';

// Read immutable receipts and replay their already recorded gestures only.
// No constructors, search functions, claim/finish or ledger-loading APIs run.
const own='tools/daily-challenge/formal-v4/audit-constraint-seven-actual-independent.mjs';
const input=process.argv[2]??'deliverables/daily-formal-v4-20261008/selection/constraint-six-after-context-fix-01';
const output=process.argv[3]??'deliverables/daily-formal-v4-20261008/proof/constraint-seven-actual-independent-01';
const hash=b=>createHash('sha256').update(b).digest('hex'),fileBindings={},cached=new Map(),results=[],errors=[];
const clean=x=>JSON.parse(JSON.stringify(x));
async function bytes(p,h){const absolute=path.resolve(p);let b=cached.get(absolute);if(!b){b=await fs.readFile(absolute);cached.set(absolute,b);fileBindings[absolute]=hash(b);}
 if(h)assert.equal(fileBindings[absolute],h,`Changed bytes: ${p}`);return b;}
const read=async(p,h)=>JSON.parse(await bytes(p,h));
const bound=async d=>{assert(d?.path&&/^[a-f0-9]{64}$/.test(d.sha256??''),'Complete file descriptor required');return read(d.path,d.sha256);};
const checkBindings=async map=>{assert(map&&typeof map==='object');for(const[p,h]of Object.entries(map))await bytes(p,h);};
const present=p=>fs.stat(p).then(()=>true).catch(e=>{if(e.code==='ENOENT')return false;throw e;});
const physical=level=>{const f=designFingerprints(level);return{...f,retryIdentitySha256:levelSha256({shapeSha256:f.shapeSha256,colorSha256:f.colorSha256})};};
function checkReplay(r,level,drags,U){assert(r.valid&&r.complete&&!r.failed);assert.equal(r.effectiveDrags,drags.length);assert.equal(r.nonClearingDrags,U);
 assert.equal(r.clearEvents,level.blocks.length);if(r.remainingBodies!==undefined)assert.equal(r.remainingBodies,0);if(r.remainingQueued!==undefined)assert.equal(r.remainingQueued,0);}
let completion=null,index=null,runtime=null;
try{
 runtime=await loadV4CatalogRuntime();assert.equal(runtime.toolchainSha256,'45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804');
 await bytes(own);completion=await read(`${input}/completion.json`);index=await read(`${input}/index.json`);
 assert.equal(completion.status,'FINITE_SEVEN_CONSTRAINT_PLAN_FINISHED');assert.equal(completion.outcomes.length,7);
 const execution=await read(`${input}/plan.json`),proposal=await bound(execution.inputPlan),review=await bound(execution.qualificationReview),qualification=await bound(execution.independentReview);
 assert.equal(qualification.status,'INDEPENDENT_CONSTRAINT_ENTRY_QUALIFICATION_PASS');assert.equal(qualification.tests,6);assert(qualification.evidence.every(e=>e.passed));
 assert.equal(review.status,'CONSTRAINT_SEVEN_ENTRY_READY_NOT_EXECUTED');assert.deepEqual(review.plan,execution.inputPlan);
 await checkBindings(execution.bindings);await checkBindings(review.toolBindings);await checkBindings(qualification.bindings);
 assert.equal(execution.firstSuccessfulRowReexecuted,false);assert.equal(execution.sameBaseStageFallback,false);assert.equal(execution.sameInputRetry,false);
 const interrupted=await bound(execution.interruptedProgress);assert.equal(interrupted.completed,1);assert.equal(interrupted.accepted,1);
 assert.deepEqual(execution.reusedAcceptedReceipt,{path:interrupted.outcomes[0].file,sha256:interrupted.outcomes[0].sha256});
 const interruption=await read('deliverables/daily-formal-v4-20261008/proof/constraint-seven-interruption-boundary-01.json');
 assert.equal(interruption.status,'INDEPENDENT_CONSTRAINT_INTERRUPTION_BOUNDARY_VERIFIED');assert.equal(interruption.remainingRows.length,6);
 assert(interruption.remainingRows.every(r=>r.constructionRequestResultAndSidecarAbsent&&r.constructionAliasAbsent&&r.newConstraintClaimsObserved===0));
 const seed=await bound(CONSTRAINT_SEED139),previousFiles=[...seed.files],records=[];
 assert.equal(seed.files.length,139);assert.deepEqual(index.files.slice(0,139),seed.files);assert.equal(index.priorIndex,CONSTRAINT_SEED139.path);
 for(const p of seed.files){assert(execution.bindings[p],`Original139 byte binding: ${p}`);records.push(await read(p,execution.bindings[p]));}
 assert.deepEqual(proposal.rows,execution.rows);assert.equal(proposal.rows.length,7);
 for(const [i,row]of completion.outcomes.entries()){
  const q=await read(row.file,row.sha256),planned=proposal.rows[i],slot=runtime.slots.find(s=>s.formalId===planned.slot.formalId);
  assert.deepEqual(planned.slot,slot);for(const[k,v]of Object.entries(slot))assert.deepEqual(q[k],v);
  for(const k of ['accepted','status','L','U','sourceLevelId','constructionAttemptStarted','finalProofStarted','terminalBlocked'])assert.deepEqual(q[k],row[k]);
  assert.equal(q.qualificationOnly,false);assert.equal(q.formalReady,false);assert.equal(q.productionChanged,false);assert.equal(q.currentRuntimeValidationClaimed,false);
  assert.deepEqual(q.toolchainBindings,runtime.toolchainBindings);assert.equal(q.toolchainSha256,runtime.toolchainSha256);
  await checkBindings(q.toolchainBindings);await checkBindings(q.designBindings);await checkBindings(q.designInputBindings);if(q.assetBindings)await checkBindings(q.assetBindings);
  assert.equal(q.designToolchainSha256,levelSha256(q.designBindings));
  const context=await bound(q.selectionContext);assert.deepEqual(context.files,previousFiles);assert.equal(context.scope,300);assert.deepEqual(context.seedIndex,CONSTRAINT_SEED139);
  assert.deepEqual(Object.keys(context.fileBindings).sort(),[...previousFiles].sort());await checkBindings(context.fileBindings);
  const base=await bound(planned.baseReceipt);assert.equal(levelSha256(base.level),planned.baseLevelSha256);assert.equal(routeSha256(base.drags),planned.baseRouteSha256);
  assert.equal(q.baseLevelSha256,base.levelSha256);assert.equal(q.baseRouteSha256,routeSha256(base.drags));
  const source=runtime.LEVELS.find(l=>l.id===q.sourceLevelId);assert(source);assert.equal(levelSha256(source),planned.sourceLevelSha256);
  const prior=await bound(q.priorBaseline);assert.equal(levelSha256(prior.level),q.priorBaseline.levelSha256);assert.deepEqual(mechanismInventory(prior.level),q.priorBaseline.inventory);
  assert(q.constructionAttemptStarted);const c=q.construction,fp=physical(base.level),cstem=`${CONSTRUCTION_LEDGER}/${c.constructionAttempt.id}`;
  const crequest=await read(cstem+'.request.json'),cresult=await read(cstem+'.result.json');assert.deepEqual(crequest,c.constructionAttempt);
  assert.equal(crequest.levelSha256,q.baseLevelSha256);for(const[k,v]of Object.entries(fp))assert.deepEqual(crequest[k],v);
  assert.deepEqual(await bound(q.constructionSidecar),c);assert.deepEqual(await read(q.entryResultFile),q);
  const cplan=await bound(q.constructionPlan);assert.equal(levelSha256(cplan),q.constructionPlan.canonicalSha256);assert.equal(cplan.inputLevelSha256,q.baseLevelSha256);
  assert.deepEqual(cplan.slot,slot);assert(cplan.allFailuresTerminal&&cplan.noStageOrMethodRetry);assert.equal(cplan.mathematicalLowerSearchInvocations,0);
  assert.equal(cresult.accepted,c.accepted);assert.equal(cresult.status,c.status);assert.equal(cresult.levelSha256,q.baseLevelSha256);
  assert.deepEqual(inspectConstructionAccounting(c.constructionAccounting),[]);assert.equal(c.constructionAccounting.maxStates,10000);
  assert.equal(c.mathematicalAcceptance,false);assert.equal(c.mathematicalLowerSearchInvocations,0);assert.equal(c.provenance.fullBoardSearches,0);
  assert.equal(c.provenance.heldSearches,0);assert.equal(c.provenance.routeRepairAllowed,false);assert.equal(c.provenance.configurationsAttempted,1);
  const detail={file:row.file,sha256:row.sha256,formalId:q.formalId,sourceLevelId:q.sourceLevelId,accepted:q.accepted,L:q.L,U:q.U,
   constructionWorlds:c.constructionAccounting.fullWorldReservations,lowerRegisteredWorlds:null,lowerConservativeWorlds:null};
  if(c.ok){
   assert.equal(c.constructionAccounting.fullWorldReservations,3+2*base.drags.reduce((n,d)=>n+d.path.length+Number(!!d.exitSide)+1,0));
   assert.deepEqual(q.drags,base.drags);assert.equal(q.levelSha256,levelSha256(q.level));assert.equal(q.routeSha256,routeSha256(q.drags));
   assert.equal(c.levelSha256,q.levelSha256);assert.equal(c.routeSha256,q.routeSha256);assert.deepEqual(c.level,q.level);assert.deepEqual(c.drags,q.drags);
   assert.deepEqual(c.provenance.constructionAccounting,c.constructionAccounting);assert.equal(c.provenance.inputLevelSha256,base.levelSha256);
   assert.equal(c.provenance.outputLevelSha256,q.levelSha256);assert.equal(c.provenance.outputRouteSha256,q.routeSha256);
   const alias=await read(`${CONSTRUCTION_LEDGER}/aliases/${physical(q.level).retryIdentitySha256}.json`);assert.equal(alias.constructionAttempt,crequest.id);assert.equal(alias.finalLevelSha256,q.levelSha256);
   const fresh=auditRouteConstraint(runtime,q.level,q.drags,slot,prior.level),canonical=runtime.replayRevisedRoute(q.level,q.drags),independent=independentReplay(runtime,q.level,q.drags);
   assert(fresh.passed,JSON.stringify(fresh.issues));checkReplay(canonical,q.level,q.drags,q.actualConstructedU);checkReplay(independent,q.level,q.drags,q.actualConstructedU);
   assert.deepEqual(clean(fresh),q.strength.participation);assert.deepEqual(independent,q.preProofReplay.independent);
   assert.deepEqual(clean(replayDecorated(runtime,q.level,q.drags)),q.preProofReplay.canonical);
   const priorInstances=mechanismInventory(prior.level)[q.newestMechanism],now=mechanismInventory(q.level)[q.newestMechanism];
   assert.deepEqual(q.strength.priorComparison,{priorLevelSha256:q.priorBaseline.levelSha256,priorInstances,currentInstances:now,
    priorInstanceCount:priorInstances.length,currentInstanceCount:now.length,instanceIncrease:now.length-priorInstances.length,
    priorCounters:q.newestMechanism==='key-lock'?priorInstances.map(x=>x.value):null,currentCounters:q.newestMechanism==='key-lock'?now.map(x=>x.value):null,
    numericCounterApplicable:q.newestMechanism==='key-lock'});
   detail.mechanism=fresh.mechanism;detail.priorInstances=priorInstances.length;detail.currentInstances=now.length;detail.participation=fresh.details;
   detail.fullReplay={canonical,independent};
   if(q.finalProofStarted){
    const m=q.mathematicalProof,request=await read(`${PUBLIC_ATTEMPT_LEDGER}/${q.attempt.id}.request.json`),result=await read(`${PUBLIC_ATTEMPT_LEDGER}/${q.attempt.id}.result.json`);
    assert.deepEqual(q.attempt,m.attempt);assert.deepEqual(request,q.attempt);assert.equal(request.levelSha256,q.levelSha256);
    assert.equal(result.levelSha256,q.levelSha256);assert.equal(result.accepted,m.accepted);assert.equal(result.status,m.status);assert.deepEqual(result.lower,q.lowerBound?.result);assert.equal(result.upper,null);
    for(const[k,v]of Object.entries(physical(q.level)))assert.deepEqual(request[k],v);
    const originalRequest=await bound(q.baseReceipt.request),originalResult=await bound(q.baseReceipt.result);assert.deepEqual(originalRequest,base.attempt);assert(originalResult.accepted);
    assert.equal(originalResult.levelSha256,base.levelSha256);assert.equal(originalResult.status,base.status);if(base.proof){assert.deepEqual(originalResult.lower,base.proof);if(base.status.startsWith('EXPLORATORY_'))assert.deepEqual(originalResult.upper,base.proof);}
    const savedPlan=await read(`${PUBLIC_ATTEMPT_LEDGER}/${request.id}.v4-plan.json`);assert.deepEqual(savedPlan.attempt,request);assert.deepEqual(savedPlan.plan,q.attemptPlan);
    assert.equal(q.attemptPlanSha256,levelSha256(q.attemptPlan));assert(q.attemptPlan.formedBeforeClaim);assert.equal(q.attemptPlan.strategy.route,'provided');
    assert.equal(q.attemptPlan.sameExactObjectRevalidationAllowed,false);assert.deepEqual(q.attemptPlan.mechanismBaseReceipt,planned.baseReceipt);
    assert.equal(m.levelSha256,q.levelSha256);assert.deepEqual(m.level,q.level);assert.deepEqual(m.drags,q.drags);assert.deepEqual(q.route,m.route);
    assert.deepEqual(m.toolchainBindings,runtime.toolchainBindings);assert.equal(m.toolchainSha256,runtime.toolchainSha256);await checkBindings(m.policyBindings);
    assert.equal(m.policyToolchainSha256,levelSha256(m.policyBindings));for(const k of ['formalId','stageKey','newestMechanism','slot','sourceLevelId','difficulty','policyRuleVersion','policyRuleSha256'])assert.deepEqual(m[k],q[k]);
    assert.equal(q.route.search,null);assert.equal(q.route.witnessValidation.searchPerformed,false);assert.equal(q.route.witnessValidation.fullBoardSearchStates,0);
    assert.deepEqual(q.route.canonicalReplay,canonical);assert.deepEqual(q.route.independentReplay,independent);
    const adaptation=await read(`${PUBLIC_ATTEMPT_LEDGER}/v4-mechanism-inputs/${m.acceptedBaseAdaptation.finalMechanismInputIdentity}.json`);
    assert.deepEqual(adaptation,m.acceptedBaseAdaptation);assert.equal(adaptation.finalLevelSha256,q.levelSha256);assert.equal(adaptation.baseLevelSha256,base.levelSha256);
    assert.notEqual(adaptation.previousMechanismsSha256,adaptation.finalMechanismsSha256);assert.equal(adaptation.sameExactObjectRevalidation,false);
    if(q.lowerBound){const lower=q.lowerBound.result,projection=projectStaticConstraints(q.level);assert.equal(q.lowerBound.method,'v3-static-bodies-constraint-erasure-v1');
     assert.deepEqual(q.lowerBound.projection,projection);assert.equal(q.lowerBound.inputLevelSha256,q.levelSha256);assert.equal(lower.sourceLevelSha256,projection.projectedLevelSha256);
     assert.equal(q.lowerBound.requiredFloor,16);assert.deepEqual(inspectSearchAccounting(lower,'actual-constraint-lower'),[]);assert.deepEqual(lower.guardAllowance,guardAllowanceFor(lower));
     assert(lower.budget.maxStates<=9999&&lower.guardAllowance.conservativeFullBoardStateUpperBound<=10000);assert.equal(lower.budget.maxTransitions,10000000);assert.equal(lower.budget.maxMicroStates,3000000);
     assert.equal(lower.budget.maxMilliseconds,30000);detail.lowerRegisteredWorlds=lower.rawFullBoardStates;detail.lowerConservativeWorlds=lower.guardAllowance.conservativeFullBoardStateUpperBound;
     detail.lowerExpanded=lower.rawExploredStates;detail.lowerTransitions=lower.attemptedTransitions;detail.lowerMicro=lower.microDiscoveredStates;
     if(q.accepted){assert.equal(lower.status,'threshold-proven');assert(lower.thresholdProven);assert.equal(lower.floor,16);assert.equal(lower.termination,'below-threshold-exhausted');}
    }
    if(!m.accepted){assert(await present(`${PUBLIC_ATTEMPT_LEDGER}/identities/${request.retryIdentitySha256}.blocked.json`));detail.publicFailureSealed=true;}
   }
  }else{assert(!q.accepted&&q.terminalBlocked&&!q.finalProofStarted);assert(await present(cstem+'.blocked.json'));detail.constructionFailureSealed=true;}
  if(q.accepted){assert(q.catalogEligible&&q.mathematicalEvidenceValidated&&q.mechanismStrengthValidated&&q.designValidated);assert.equal(q.L,16);assert(q.U>=16&&q.U<=20);
   assert(q.mathematicalProof.accepted&&q.mathematicalProof.catalogEligible);assert.equal(q.mathematicalProof.L,q.L);assert.equal(q.mathematicalProof.U,q.U);
   const staticAudit=await auditV4StaticCandidate(runtime,q);assert(staticAudit.passed,JSON.stringify(staticAudit.issues));assert.equal(staticAudit.sourceLevelSha256,levelSha256(source));detail.freshStaticPassed=true;
   assert(q.staticAudit.passed&&q.design.passed);assert.deepEqual(q.design.diversity,auditV4Diversity([...records,q],runtime.slots));
   previousFiles.push(row.file);records.push(q);
  }else assert(!q.catalogEligible&&q.terminalBlocked);
  results.push(detail);
 }
 const diversity=auditV4Diversity(records,runtime.slots);assert.deepEqual(diversity.reasons,[]);assert.deepEqual(diversity,completion.diversity);
 assert.deepEqual(index.files,previousFiles);assert.equal(completion.accepted,results.filter(r=>r.accepted).length);assert.equal(completion.combinedCandidates,records.length);
 assert.equal(index.candidateCount,records.length);assert.equal(index.missing,300-records.length);assert.equal(index.formalReady,false);
}catch(error){errors.push({message:error.message,stack:error.stack});}
await fs.mkdir(output,{recursive:false});
const report={status:errors.length?'INDEPENDENT_CONSTRAINT_ACTUAL_BATCH_AUDIT_FAIL':'INDEPENDENT_CONSTRAINT_ACTUAL_BATCH_AUDIT_COMPLETE',
 completion:{path:`${input}/completion.json`,sha256:fileBindings[path.resolve(`${input}/completion.json`)]??null},
 index:{path:`${input}/index.json`,sha256:fileBindings[path.resolve(`${input}/index.json`)]??null},results,errors,fileBindings,
 selection:{path:`${input}/index.json`,sha256:fileBindings[path.resolve(`${input}/index.json`)]??null},inputBindings:fileBindings,
 realAddedAccepted:results.filter(r=>r.accepted).length,combinedCandidateCount:index?.candidateCount??null,
 combinedCandidates:index?.candidateCount??null,
 old139Preserved:!errors.length,interruptedFirstRowReexecuted:false,newSearches:0,newConstruction:0,publicLedgerWrites:0,
 executionWorkspace:process.cwd(),mathematicalToolchainSha256:runtime?.toolchainSha256,currentRuntimeValidationClaimed:false,pointerValidated:false,formalReady:false};
const data=JSON.stringify(report,null,2)+'\n';await fs.writeFile(`${output}/report.json`,data,{flag:'wx'});
console.log(JSON.stringify({status:report.status,path:`${output}/report.json`,sha256:hash(data),accepted:report.realAddedAccepted,errors:errors.map(e=>e.message)}));
if(errors.length)process.exitCode=1;
