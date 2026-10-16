import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {loadV4CatalogRuntime,auditV4Diversity} from './catalog-contract.mjs';
import {auditV4StaticCandidate} from './static-contract.mjs';
import {verifyLowBandBatchAppend,inspectSubstantialRegionRedraft} from './low-band-advanced-batch-context.mjs';
import {assertLowBandAdvancedBatchPlan,LOW_BAND_ADVANCED_BATCH_REVIEW_STATUS,LOW_BAND_ADVANCED_BATCH_SLOT_VERSION,lowBandAdvancedStrategy} from './low-band-advanced-batch-contract.mjs';
import {auditRouteConstraint} from './route-constraint-construction.mjs';
import {assertReadonlyExpected} from './qualify-low-band-batch-slot.mjs';
import {CONSTRUCTION_LEDGER,inspectConstructionAccounting} from './capacity-construction-ledger.mjs';
import {PUBLIC_ATTEMPT_LEDGER} from './bounded-qualify.mjs';
import {prefixExecutionEnvironment,currentMainlineSourceBinding} from './prefix-execution-environment.mjs';
import {auditD2KeyRoute} from './d2-key-route-construction.mjs';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {replayDecorated} from '../formal-v2/mechanism-decorate.mjs';
import {projectStaticConstraints} from '../formal-v2/constraint-projection.mjs';
import {projectOpeningOuterBodies} from '../formal-v2/inventory-projection.mjs';
import {projectIcePreservingConstraints} from '../formal-v3/ice-preserving-projection.mjs';
import {auditCapacityIntensity} from '../formal-v3/capacity-intensity-policy.mjs';
import {mechanismInventory} from '../formal-v3/mechanism-intensity.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {inspectSearchAccounting} from '../formal-v3/catalog-contract.mjs';
import {guardAllowanceFor} from '../formal-v3/reserved-guard-budget.mjs';
import {compareLayouts} from '../formal-v3/diversity.mjs';

// Read immutable production evidence and replay recorded gestures only.
// No constructor, ledger loader/claim/finish, adaptation or solver is called.
const own='tools/daily-challenge/formal-v4/audit-low-band-advanced-batch-actual-independent.mjs';
const entry='tools/daily-challenge/formal-v4/qualify-low-band-batch-slot.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const clean=x=>JSON.parse(JSON.stringify(x));
const physical=level=>{const f=designFingerprints(level);return{...f,retryIdentitySha256:levelSha256({shapeSha256:f.shapeSha256,colorSha256:f.colorSha256})};};
const present=p=>fs.stat(p).then(()=>true).catch(e=>{if(e.code==='ENOENT')return false;throw e;});
const descriptor=(p,h)=>({path:p,sha256:h});

function fullReplay(r,level,drags,U){
 assert(r.valid&&r.complete&&!r.failed,'Complete original-object witness required');
 assert.equal(r.effectiveDrags,drags.length);assert.equal(r.nonClearingDrags,U);
 assert.equal(r.clearEvents,level.blocks.length,'Every original and queued body must clear');
 if(r.remainingBodies!==undefined)assert.equal(r.remainingBodies,0);
 if(r.remainingQueued!==undefined)assert.equal(r.remainingQueued,0);
}
function projectionFor(runtime,lower,level){
 const method=lower.projection?.method;
 if(lower.method.includes('ice-preserving'))return projectIcePreservingConstraints(level,runtime);
 if(method==='static-bodies-constraint-erasure-v1')return projectStaticConstraints(level);
 if(method==='opening-outer-bodies-inventory-erasure-v1')return projectOpeningOuterBodies(level,runtime);
 if(!method&&lower.method==='v3-plain')return null;
 throw Error(`Unreviewed advanced-batch lower projection: ${method??lower.method}`);
}

export function assertAdvancedBatchEnvelope({plan,completion,index,proposal,seed,review}){
 assert.equal(plan.status,'FIXED_FIRST_LOW_BAND_ADVANCED_BATCH_ADAPTATIONS');
 assert.equal(completion.status,'FINITE_LOW_BAND_ADVANCED_BATCH_FINISHED');
 assert.deepEqual(plan.selection,proposal.inputSelection);assert.deepEqual(plan.rows,proposal.rows);
 assert.equal(seed.files.length,proposal.inputSelectionCount);assert.equal(new Set(seed.files).size,seed.files.length);
 assert.equal(completion.outcomes.length,proposal.rows.length);assert.equal(proposal.maximumBaseAdaptations,proposal.rows.length);
 assert.deepEqual(completion.inputPlan,plan.inputPlan);assert.deepEqual(completion.qualificationReview,plan.qualificationReview);
 assert.equal(review.status,LOW_BAND_ADVANCED_BATCH_REVIEW_STATUS);assert.deepEqual(review.errors,[]);
 assert.equal(review.newSearches,0);assert.equal(review.newLedgerClaims,0);assert.deepEqual(review.plan,plan.inputPlan);
 assert.equal(index.status,'PARTIAL_LOW_BAND_ADVANCED_CANDIDATES_AWAITING_INDEPENDENT_REVIEW');
 assert.deepEqual(index.files.slice(0,seed.files.length),seed.files);assert.deepEqual(index.inputPlan,plan.inputPlan);
 const accepted=[];for(const [i,q]of completion.outcomes.entries()){
  const row=proposal.rows[i];assert.equal(q.formalId,row.slot.formalId);assert.equal(q.sourceLevelId,row.sourceLevelId);
  assert.equal(typeof q.accepted,'boolean');assert(q.file&&/^[a-f0-9]{64}$/.test(q.sha256??''));
  if(q.accepted){assert(q.finalProofStarted&&q.constructionAttemptStarted&&!q.terminalBlocked);assert.equal(q.L,row.band.lower);assert(q.U>=row.band.lower&&q.U<=row.band.upper);accepted.push(q.file);}
 }
 assert.equal(new Set(completion.outcomes.map(q=>q.file)).size,completion.outcomes.length);
 assert.deepEqual(index.files,[...seed.files,...accepted]);assert.equal(index.candidateCount,index.files.length);
 assert.equal(completion.accepted,accepted.length);assert.equal(completion.combinedCandidates,index.files.length);
 return{planned:proposal.rows.length,accepted:accepted.length,originalSelectedCount:seed.files.length};
}

/** Callable only after the fixed plan-sized runner has produced completion/index.
 * An honestly rejected, terminally sealed row is an audit success, not an
 * accepted candidate. This function cannot append to the selection. */
export async function auditLowBandAdvancedBatchActual({
 input='deliverables/daily-formal-v4-20261008/selection/low-band-advanced-batch-01',
 output='deliverables/daily-formal-v4-20261008/proof/low-band-advanced-batch-actual-independent-01',
}={}){
 assert(!(await present(output)),'A fresh independent report directory is required');
 // Missing/in-progress input is not an invitation to run construction.
 for(const name of ['plan.json','completion.json','index.json'])assert(await present(path.join(input,name)),`Finished runner evidence required: ${name}`);
 const fileBindings={},cache=new Map(),results=[],errors=[],acceptedFiles=[],records=[];
 let runtime=null,completion=null,index=null,environment=null,publicBefore=null,publicAfter=null;
 async function bytes(p,expected){const k=path.resolve(p),b=await fs.readFile(k),h=hash(b);
  if(expected)assert.equal(h,expected,`Changed bound bytes: ${p}`);
  if(fileBindings[k])assert.equal(h,fileBindings[k],`Changed during audit: ${p}`);
  fileBindings[k]=h;return b;}
 async function read(p,expected){const b=await bytes(p,expected),k=path.resolve(p);if(!cache.has(k))cache.set(k,JSON.parse(b));return cache.get(k);}
 async function bound(d){assert(d?.path&&/^[a-f0-9]{64}$/.test(d.sha256??''),'Exact file descriptor required');return read(d.path,d.sha256);}
 async function bindings(map){assert(map&&typeof map==='object'&&!Array.isArray(map));for(const[p,h]of Object.entries(map))await bytes(p,h);}
 async function absent(p){assert(!(await present(p)),`Unexpected live lock/failed accepted identity: ${p}`);}
 const desc=p=>descriptor(p,fileBindings[path.resolve(p)]??null);
 const requestCount=async()=> (await fs.readdir(PUBLIC_ATTEMPT_LEDGER)).filter(n=>n.endsWith('.request.json')).length;
 try{
  publicBefore=await requestCount();runtime=await loadV4CatalogRuntime();
  assert.equal(runtime.toolchainSha256,'45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804');
  await bytes(own);await bytes(entry);await bindings(runtime.toolchainBindings);await bindings(runtime.designBindings);
  const plan=await read(`${input}/plan.json`);completion=await read(`${input}/completion.json`);index=await read(`${input}/index.json`);
  assert.equal(plan.status,'FIXED_FIRST_LOW_BAND_ADVANCED_BATCH_ADAPTATIONS');
  assert.equal(completion.status,'FINITE_LOW_BAND_ADVANCED_BATCH_FINISHED');
  assert.deepEqual(completion.inputPlan,plan.inputPlan);assert.deepEqual(completion.qualificationReview,plan.qualificationReview);
  assert(plan.oneStagePerBase&&plan.noFallback&&!plan.failedInputRetry&&!plan.formalReady&&!plan.productionChanged);
  assert.deepEqual(plan.worldBudget,{maxStates:10000});
  const expectedBudget={maxStates:9999,maxTransitions:10000000,maxMicroStates:3000000,maxMilliseconds:30000};
  const normalizedBudget={...expectedBudget,maxDragStates:2000};
  assert.deepEqual(plan.proofOptions,{lowerBudget:expectedBudget,routeBudget:expectedBudget});
  const proposal=await bound(plan.inputPlan),seed=await bound(plan.selection),review=await bound(plan.qualificationReview);
  assertLowBandAdvancedBatchPlan(proposal,runtime.slots);
  assertAdvancedBatchEnvelope({plan,completion,index,proposal,seed,review});
  await bindings(plan.bindings);await bindings(review.fileBindings);await bindings(proposal.fileBindings??proposal.bindings??{});
  environment=prefixExecutionEnvironment(runtime,plan.executionEnvironment.descriptor);await bindings(environment.bindings);
  assert.deepEqual(environment,plan.executionEnvironment);
  const baseAudit=await bound(proposal.independentActualAudit);assert.deepEqual(baseAudit.errors,[]);assert.equal(baseAudit.newSearches,0);
  for(const file of seed.files){const h=plan.bindings[file]??plan.bindings[path.resolve(file)];assert(h,`Unbound original selected receipt: ${file}`);records.push(await read(file,h));}
  assert.equal(new Set(records.map(q=>q.formalId)).size,seed.files.length);assert.deepEqual(index.files.slice(0,seed.files.length),seed.files);
  const seenConstructions=new Set(),seenProofs=new Set();
  for(const [i,outcome]of completion.outcomes.entries()){
   const detail={file:outcome.file,sha256:outcome.sha256,accepted:false,reportedAccepted:outcome.accepted,L:null,U:null,issues:[]};
   try{
    const q=await read(outcome.file,outcome.sha256),row=proposal.rows[i],slot=runtime.slots.find(s=>s.formalId===row.slot.formalId);
    assert.deepEqual(row.slot,slot);for(const[k,v]of Object.entries(slot))assert.deepEqual(q[k],v);
    for(const k of ['formalId','sourceLevelId','accepted','status','L','U','constructionAttemptStarted','finalProofStarted','terminalBlocked'])assert.deepEqual(q[k],outcome[k]);
    assert.equal(q.qualificationOnly,false);assert.equal(q.formalReady,false);assert.equal(q.productionChanged,false);assert.equal(q.currentRuntimeValidationClaimed,false);
    assert.equal(q.catalogEligible,q.accepted);assert.deepEqual(q.toolchainBindings,runtime.toolchainBindings);assert.equal(q.toolchainSha256,runtime.toolchainSha256);
    for(const k of ['policyRuleVersion','policyRuleSha256','mathRuleVersion','mathRuleSha256'])assert.equal(q[k],runtime[k]);
    await bindings(q.toolchainBindings);await bindings(q.designBindings);await bindings(q.designInputBindings);await bindings(q.assetBindings??{});
    assert.equal(levelSha256(q.designBindings),q.designToolchainSha256);assert.deepEqual(q.declaredBatchPlan,plan.inputPlan);assert.equal(q.lowBandAdvancedSlotVersion,LOW_BAND_ADVANCED_BATCH_SLOT_VERSION);
    assert.deepEqual(q.executionEnvironment,environment);assert.equal(q.executionEnvironment.currentRuntimeValidationClaimed,false);
    const ctx=await bound(q.selectionContext);assert.deepEqual(ctx.seedIndex,proposal.inputSelection);assert.equal(ctx.scope,300);
    assert.deepEqual(ctx.files,[...seed.files,...acceptedFiles]);assert.deepEqual(Object.keys(ctx.fileBindings).sort(),[...ctx.files].sort());await bindings(ctx.fileBindings);
    const base=await bound(row.base);assert.deepEqual({path:q.baseReceipt.path,sha256:q.baseReceipt.sha256},row.base);
    assert(base.accepted&&!base.qualificationOnly);assert.equal(base.levelSha256,levelSha256(base.level));assert.equal(base.levelSha256,row.baseLevelSha256);
    assert.equal(routeSha256(base.drags),row.baseRouteSha256);assert.equal(q.baseLevelSha256,base.levelSha256);assert.equal(q.baseRouteSha256,row.baseRouteSha256);
    assert.equal(base.L,row.baseL);assert.equal(base.U,row.baseU);assert.equal(base.difficulty,row.slot.difficulty);
    const br=await bound(q.baseReceipt.request),bz=await bound(q.baseReceipt.result);assert.deepEqual(br,base.attempt);
    assert(bz.accepted);assert.equal(bz.status,base.status);assert.equal(bz.levelSha256,base.levelSha256);
    assert.deepEqual(bz.lower,base.lowerBound.result);assert.equal(bz.upper,null);
    const ready=q.acceptedBaseReadiness;assert.equal(ready.status,'AUDITED_LOW_BAND_BASE_READY_FOR_ONE_MECHANISM_CONSTRUCTION');
    assert.deepEqual(ready.baseReceipt,row.base);assert.deepEqual(ready.base,base);assert.deepEqual(ready.independentMathematicsAudit,proposal.independentActualAudit);
    await bindings(ready.fileBindings);assert.equal(ready.newSearches,0);assert.equal(ready.newLedgerClaims,0);assert.equal(ready.ledgerWrites,0);
    const originalInput=await bound(base.input),reference=await bound(originalInput.provenance.reference);
    const classification=inspectSubstantialRegionRedraft(row.base,base,originalInput,reference,proposal.independentActualAudit);
    for(const[k,v]of Object.entries(classification))assert.deepEqual(q.selectionContext.sourceClassification[k],v);
    fullReplay(runtime.replayRevisedRoute(base.level,base.drags),base.level,base.drags,base.U);
    fullReplay(independentReplay(runtime,base.level,base.drags),base.level,base.drags,base.U);
    const currentSource=await currentMainlineSourceBinding(runtime,environment,q.sourceLevelId);assert.deepEqual(currentSource,q.currentSourceBinding);await bindings(currentSource.bindings);
    const prior=await bound(q.priorBaseline),priorInventory=mechanismInventory(prior.level);
    assert.equal(levelSha256(prior.level),q.priorBaseline.levelSha256);assert.deepEqual(priorInventory,q.priorBaseline.inventory);
    const originalPrior=runtime.priorDailySlots.get(q.formalId);assert.equal(q.priorBaseline.path,originalPrior.sourceReport);
    assert.equal(q.priorBaseline.sha256,originalPrior.sourceReportSha256);assert.equal(q.priorBaseline.levelSha256,originalPrior.levelSha256);
    // First adaptation owns a single stage-independent construction request.
    assert(q.constructionAttemptStarted,'This fixed first-run plan must own its construction evidence');
    const c=q.construction,cr=c.constructionAttempt;assert(!seenConstructions.has(cr.id));seenConstructions.add(cr.id);
    const stem=path.join(CONSTRUCTION_LEDGER,cr.id),actualRequest=await read(stem+'.request.json'),actualResult=await read(stem+'.result.json');
    assert.deepEqual(actualRequest,cr);assert.equal(cr.levelSha256,base.levelSha256);
    for(const[k,v]of Object.entries(physical(base.level)))assert.deepEqual(cr[k],v);
    assert.deepEqual(await bound(q.constructionSidecar),c);assert.deepEqual(await bytes(outcome.file),await bytes(q.entryResultFile));
    assert.equal(actualResult.accepted,c.accepted);assert.equal(actualResult.status,c.status);assert.equal(actualResult.levelSha256,base.levelSha256);
    const cp=await bound(q.constructionPlan);assert.equal(levelSha256(cp),q.constructionPlan.canonicalSha256);
    assert.deepEqual(cp.slot,slot);assert.equal(cp.inputLevelSha256,base.levelSha256);assert.equal(cp.inputRouteSha256,routeSha256(base.drags));
    assert.equal(cp.hardWholeBoardLimit,10000);assert(cp.allFailuresTerminal&&cp.noStageOrMethodRetry);assert.equal(cp.mathematicalLowerSearchInvocations,0);await bindings(cp.bindings);
    assert.deepEqual(inspectConstructionAccounting(c.constructionAccounting),[]);assert.equal(c.constructionAccounting.maxStates,10000);
    assert.equal(c.mathematicalAcceptance,false);assert.equal(c.mathematicalLowerSearchInvocations,0);assert.equal(c.ok,c.accepted);
    const ci=await read(path.join(CONSTRUCTION_LEDGER,'identities',cr.retryIdentitySha256+'.json'));assert.equal(ci.origin,cr.identityOrigin);
    if(cr.lockFile)await absent(cr.lockFile);
    detail.construction={accepted:c.accepted,status:c.status,accounting:c.constructionAccounting,request:desc(stem+'.request.json'),result:desc(stem+'.result.json')};
    if(!c.ok){
     assert(!q.accepted&&!q.finalProofStarted&&q.terminalBlocked);assert.equal(q.mathematicalProof,undefined);
     await read(stem+'.blocked.json');await read(path.join(CONSTRUCTION_LEDGER,'identities',cr.retryIdentitySha256+'.blocked.json'));
    }else{
     assert.equal(q.levelSha256,levelSha256(q.level));assert.equal(q.routeSha256,routeSha256(q.drags));
     assert.deepEqual(q.level,c.level);assert.deepEqual(q.drags,c.drags);assert.equal(c.levelSha256,q.levelSha256);assert.equal(c.routeSha256,q.routeSha256);
     assert.equal(c.provenance.inputLevelSha256,base.levelSha256);assert.equal(c.provenance.inputRouteSha256,row.baseRouteSha256);
     assert.equal(c.provenance.outputLevelSha256,q.levelSha256);assert.equal(c.provenance.outputRouteSha256,q.routeSha256);
     assert.deepEqual(c.provenance.constructionAccounting,c.constructionAccounting);
     const alias=await read(path.join(CONSTRUCTION_LEDGER,'aliases',physical(q.level).retryIdentitySha256+'.json'));
     assert.equal(alias.constructionAttempt,cr.id);assert.equal(alias.finalLevelSha256,q.levelSha256);
     const canonical=runtime.replayRevisedRoute(q.level,q.drags),decorated=replayDecorated(runtime,q.level,q.drags),independent=independentReplay(runtime,q.level,q.drags);
     fullReplay(canonical,q.level,q.drags,q.actualConstructedU);fullReplay(decorated,q.level,q.drags,q.actualConstructedU);fullReplay(independent,q.level,q.drags,q.actualConstructedU);
     assert.deepEqual(clean(decorated),q.preProofReplay.canonical);assert.deepEqual(independent,q.preProofReplay.independent);
     let strength;const strategy=lowBandAdvancedStrategy(slot);assertReadonlyExpected(row,c,q.level);
     if(strategy==='d2-key'){
      const configuration=row.construction.configuration;
      assert.deepEqual(q.configuration,configuration);assert.deepEqual(q.drags,base.drags);
      assert.deepEqual(cp.configuration,configuration);assert.equal(c.provenance.configurationsAttempted,1);assert.equal(c.provenance.fullBoardSearches,0);
      assert.equal(c.provenance.heldSearches,0);assert.equal(c.provenance.routeRepairAllowed,false);
      const perReplay=1+base.drags.reduce((n,d)=>n+d.path.length+2+2*Number(!!d.exitSide),0);
      assert.equal(c.constructionAccounting.fullWorldReservations,3*perReplay+1,'All three complete key trace reservations');
      strength=auditD2KeyRoute(runtime,q.level,q.drags,slot,prior.level,{configuration,worldBudget:plan.worldBudget});
      assert.equal(strength.actualKeyBodies,6);assert.deepEqual(strength.actualCounters,[5,6]);assert.equal(strength.actualInstances,2);
      assert.equal(new Set(strength.details.map(x=>x.unlockDrag)).size,2);
     }else if(strategy==='d1-constraint'){
      assert.deepEqual(q.drags,base.drags);strength=auditRouteConstraint(runtime,q.level,q.drags,slot,prior.level);
     }else{
      strength=auditCapacityIntensity(runtime,q.level,q.drags,slot.newestMechanism,slot.difficulty,priorInventory);
      if(slot.newestMechanism==='generator')for(const g of q.level.generators){
       assert(g.queueBlockIds.length>=slot.difficulty+2,'FIFO count follows the reviewed band intensity');
       assert.equal(new Set(g.queueBlockIds).size,g.queueBlockIds.length);
       const colors=g.queueBlockIds.map(id=>{const body=q.level.blocks.find(body=>body.id===id);assert(body);return body.layers?.[0]??body.color;});
       for(let j=1;j<colors.length;j++)assert.notEqual(colors[j],colors[j-1],'Adjacent FIFO colours must differ');
      }
     }
     assert(strength.passed,JSON.stringify(strength.issues));assert.deepEqual(clean(strength),q.strength.participation);
     const inventory=mechanismInventory(q.level),old=priorInventory[slot.newestMechanism],now=inventory[slot.newestMechanism];
     assert.equal(q.strength.priorComparison.priorInstanceCount,old.length);assert.equal(q.strength.priorComparison.currentInstanceCount,now.length);
     assert.equal(q.strength.priorComparison.instanceIncrease,now.length-old.length);assert.deepEqual(q.strength.priorComparison.priorInstances,old);
     assert.deepEqual(q.strength.priorComparison.currentInstances,now);
     const statics=await auditV4StaticCandidate(runtime,q);assert(statics.passed,statics.issues.join(';'));assert.equal(statics.levelSha256,q.levelSha256);
     await bindings(Object.fromEntries(Object.entries(statics.assetBindings).map(([p,h])=>['public/'+p,h])));
     assert(q.design?.passed&&q.staticAudit.passed&&q.designValidated&&q.mechanismStrengthValidated);
     assert.deepEqual(q.design.diversity,auditV4Diversity([...records,q],runtime.slots));
     const source=runtime.LEVELS.find(x=>x.id===q.sourceLevelId),sourceSimilarity=compareLayouts(q.level,source).footprintSimilarity;
     assert(sourceSimilarity<=.55+1e-12);let maximumOld450=0;
     for(const oldSlot of runtime.priorDailySlots.values()){const oldReceipt=await read(oldSlot.sourceReport,oldSlot.sourceReportSha256);
      maximumOld450=Math.max(maximumOld450,compareLayouts(q.level,oldReceipt.level).footprintSimilarity);}
     assert(maximumOld450<=.75+1e-12,'Old450 whole-layout near rejection');
     detail.fullReplay={canonical,independent};detail.strength={passed:true,inventory,priorInventory,participation:strength};
     detail.freshStaticPassed=true;detail.sourceSimilarity=sourceSimilarity;detail.maximumOld450Similarity=maximumOld450;
     if(q.finalProofStarted){
      const m=q.mathematicalProof;assert(m&&m.attempt);assert(!seenProofs.has(m.attempt.id));seenProofs.add(m.attempt.id);
      for(const k of ['formalId','stageKey','newestMechanism','slot','difficulty','sourceLevelId','levelSha256','routeSha256','L','U'])assert.deepEqual(m[k],q[k]);
      for(const k of ['level','drags','lowerBound','route','attempt','attemptPlan','attemptPlanSha256'])assert.deepEqual(m[k],q[k]);
      assert.equal(m.qualificationOnly,false);assert.equal(m.formalReady,false);assert.deepEqual(m.toolchainBindings,runtime.toolchainBindings);
      await bindings(m.policyBindings);assert.equal(levelSha256(m.policyBindings),m.policyToolchainSha256);
      const mst=path.join(PUBLIC_ATTEMPT_LEDGER,m.attempt.id),mr=await read(mst+'.request.json'),mz=await read(mst+'.result.json');
      assert.deepEqual(mr,m.attempt);assert.equal(mz.levelSha256,q.levelSha256);assert.equal(mz.accepted,m.accepted);assert.equal(mz.status,m.status);
      assert.deepEqual(mz.lower,m.lowerBound?.result??null);assert.equal(mz.upper,null);
      for(const[k,v]of Object.entries(physical(q.level)))assert.deepEqual(mr[k],v);
      const mp=await read(mst+'.v4-plan.json');assert.deepEqual(mp.attempt,mr);assert.deepEqual(mp.plan,m.attemptPlan);
      assert.equal(levelSha256(m.attemptPlan),m.attemptPlanSha256);assert(m.attemptPlan.formedBeforeClaim);
      assert.equal(m.attemptPlan.sameExactObjectRevalidationAllowed,false);assert.equal(m.attemptPlan.strategy.route,'provided');
      assert.equal(m.attemptPlan.providedRouteSha256,q.routeSha256);assert.deepEqual(m.attemptPlan.lowerBudget,normalizedBudget);
      assert.deepEqual(m.attemptPlan.upperBudget,normalizedBudget);assert.equal(m.route.search,null);
      assert.equal(m.route.witnessValidation.searchPerformed,false);assert.equal(m.route.witnessValidation.fullBoardSearchStates,0);
      assert.deepEqual(m.route.canonicalReplay,canonical);assert.deepEqual(m.route.independentReplay,independent);
      if(physical(q.level).retryIdentitySha256===br.retryIdentitySha256){
       assert.deepEqual(m.attemptPlan.mechanismBaseReceipt,row.base);const a=m.acceptedBaseAdaptation;
       assert.deepEqual(await read(path.join(PUBLIC_ATTEMPT_LEDGER,'v4-mechanism-inputs',a.finalMechanismInputIdentity+'.json')),a);
       assert.equal(a.finalLevelSha256,q.levelSha256);assert.equal(a.baseLevelSha256,base.levelSha256);
       assert.notEqual(a.previousMechanismsSha256,a.finalMechanismsSha256);assert.equal(a.sameExactObjectRevalidation,false);
      }else{assert.equal(m.attemptPlan.mechanismBaseReceipt,null);assert.notEqual(mr.retryIdentitySha256,br.retryIdentitySha256);}
      if(mr.lockFile)await absent(mr.lockFile);
      if(m.lowerBound){const lower=m.lowerBound,s=lower.result;assert.deepEqual(inspectSearchAccounting(s,'advanced-lower'),[]);
       assert.deepEqual(s.guardAllowance,guardAllowanceFor(s));assert.equal(lower.inputLevelSha256,q.levelSha256);assert.equal(lower.requiredFloor,row.band.lower);
       const p=projectionFor(runtime,lower,q.level);if(p)assert.deepEqual(p,lower.projection);assert.equal(s.sourceLevelSha256,p?.projectedLevelSha256??q.levelSha256);
       assert.deepEqual(s.budget,normalizedBudget);assert(s.guardAllowance.conservativeFullBoardStateUpperBound<=10000);
       detail.lower={method:lower.method,raw:s.rawFullBoardStates,expanded:s.rawExploredStates,guardAllowance:s.guardAllowance,
        transitions:s.attemptedTransitions,micro:s.microDiscoveredStates,status:s.status,floor:s.floor,termination:s.termination};
      }
      if(!m.accepted){assert(q.terminalBlocked&&!q.accepted);await read(mst+'.blocked.json');await read(path.join(PUBLIC_ATTEMPT_LEDGER,'identities',mr.retryIdentitySha256+'.blocked.json'));}
      else {await absent(mst+'.blocked.json');await absent(path.join(PUBLIC_ATTEMPT_LEDGER,'identities',mr.retryIdentitySha256+'.blocked.json'));}
     }else assert(!q.accepted&&q.terminalBlocked,'No mathematical acceptance without a first final proof');
    }
    if(q.accepted){
     await verifyLowBandBatchAppend(runtime,q,async(d,json=true)=>{if(json){assert(d?.path);return d.sha256?bound(d):read(d.path);}return bytes(d.path,d.sha256);});
     const s=q.lowerBound.result;assert(q.mathematicalProof.accepted&&q.mathematicalEvidenceValidated);
     assert.equal(s.status,'threshold-proven');assert(s.thresholdProven);assert.equal(s.floor,row.band.lower);assert.equal(s.termination,'below-threshold-exhausted');
     assert.equal(q.L,row.band.lower);assert(q.U>=row.band.lower&&q.U<=row.band.upper);assert.equal(q.U,q.actualConstructedU);assert.equal(q.terminalBlocked,false);
     records.push(q);acceptedFiles.push(outcome.file);
    }else assert(!q.catalogEligible&&q.terminalBlocked&&!q.mathematicalEvidenceValidated);
    Object.assign(detail,{status:'ACTUAL_RESULT_AUTHENTICATED',accepted:q.accepted,L:q.L,U:q.U,formalId:q.formalId,sourceLevelId:q.sourceLevelId});
   }catch(error){detail.status='AUDIT_REJECTED';detail.issues.push(error.message);errors.push({file:outcome.file,message:error.message,stack:error.stack});}
   results.push(detail);
  }
  assert.deepEqual(index.files,[...seed.files,...acceptedFiles]);assert.equal(index.priorIndex,proposal.inputSelection.path);
  assert.deepEqual(index.inputSelection,proposal.inputSelection);assert.equal(index.candidateCount,records.length);assert.equal(index.missing,300-records.length);
  assert.equal(index.formalReady,false);assert.equal(index.productionChanged,false);assert.equal(completion.accepted,acceptedFiles.length);
  assert.equal(completion.combinedCandidates,records.length);assert.equal(completion.missing,300-records.length);
  const diversity=auditV4Diversity(records,runtime.slots);assert.deepEqual(diversity.reasons,[]);assert.deepEqual(diversity,completion.diversity);
  assert.equal(completion.ownFinalProofCalls,seenProofs.size);assert.equal(completion.publicRequestsAfter-completion.publicRequestsBefore,seenProofs.size);
  assert.equal(completion.currentRuntimeValidationClaimed,false);assert.equal(completion.formalReady,false);assert.equal(completion.productionChanged,false);
  publicAfter=await requestCount();assert.equal(publicAfter,publicBefore,'Independent audit creates no public attempt');
  for(const[p,h]of Object.entries(fileBindings))assert.equal(hash(await fs.readFile(p)),h,`Input drift after audit: ${p}`);
 }catch(error){errors.push({message:error.message,stack:error.stack});}
 const report={status:errors.length?'INDEPENDENT_LOW_BAND_ADVANCED_BATCH_ACTUAL_FAIL':'INDEPENDENT_LOW_BAND_ADVANCED_BATCH_ACTUAL_PASS',
  completion:desc(`${input}/completion.json`),index:desc(`${input}/index.json`),plan:desc(`${input}/plan.json`),
  results,errors,fileBindings,realAddedAccepted:results.filter(x=>x.accepted).length,combinedCandidates:index?.candidateCount??null,
  originalSelectedBytePreserved:errors.length===0,publicRequestsBeforeAudit:publicBefore,publicRequestsAfterAudit:publicAfter,
  environment,executionWorkspace:process.cwd(),mathematicalToolchainSha256:runtime?.toolchainSha256??null,
  currentRuntimeValidationClaimed:false,newSearches:0,newConstructions:0,newLedgerClaims:0,publicLedgerWrites:0,
  actualWitnessReplayOnly:true,pointerValidated:false,timeValidated:false,formalReady:false,productionChanged:false};
 await fs.mkdir(output,{recursive:false});await fs.writeFile(`${output}/report.json`,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 return{report,descriptor:descriptor(`${output}/report.json`,hash(await fs.readFile(`${output}/report.json`)))};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [input,output]=process.argv.slice(2);const {report,descriptor:written}=await auditLowBandAdvancedBatchActual({input,output});
 console.log(JSON.stringify({status:report.status,...written,accepted:report.realAddedAccepted,errors:report.errors.map(e=>e.message)}));
 if(report.errors.length)process.exitCode=1;
}
