import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {loadV4Runtime,FROZEN_MATH_SHA} from './runtime.mjs';
import {makeEarlyFrozenIcePlan,EARLY_FROZEN_BINDING} from './early-frozen-ice-joint.mjs';
import {assertEarlyConstructionPlan,realShapeColourChange,physicalRetry,EARLY_CONSTRUCTION_LEDGER,EARLY_EXPERIMENT_ID} from './early-frozen-construction-contract.mjs';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {guardAllowanceFor} from '../formal-v3/reserved-guard-budget.mjs';
import {PUBLIC_LEDGER} from './native-batch-io.mjs';

// Evidence verification and supplied route replay only. Never invokes an
// explorer, bounded primitive, constructor, attempt ledger or claim API.
const SELF='tools/daily-challenge/formal-v4/audit-early-frozen-actual-independent.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const exists=p=>fs.stat(p).then(()=>true).catch(e=>{if(e.code==='ENOENT')return false;throw e;});
const integer=(n,max)=>assert(Number.isSafeInteger(n)&&n>=0&&n<=max);
export async function auditEarlyFrozenActual(completionPath,out){
 await fs.mkdir(out,{recursive:false});
 const fileBindings={},errors=[],results=[],cache=new Map();let completion,index,batch,environment;
 const bytes=async(f,h)=>{const b=await fs.readFile(f),a=sha(b);if(h)assert.equal(a,h,f);if(fileBindings[f])assert.equal(a,fileBindings[f]);fileBindings[f]=a;return b;};
 const read=async(f,h)=>{const b=await bytes(f,h);if(!cache.has(f))cache.set(f,JSON.parse(b));return cache.get(f);};
 const bound=d=>{assert(d?.path&&/^[a-f0-9]{64}$/.test(d.sha256??''));return read(d.path,d.sha256);};
 const check=async m=>{const xs=Object.entries(m);for(let i=0;i<xs.length;i+=32)await Promise.all(xs.slice(i,i+32).map(([f,h])=>bytes(f,h)));};
 const names=async()=>(await fs.readdir(PUBLIC_LEDGER)).filter(f=>f.endsWith('.request.json')).sort();
 const before=await names();
 try{
  const rt=await loadV4Runtime();assert.equal(rt.toolchainSha256,FROZEN_MATH_SHA);await check(rt.toolchainBindings);
  const compiled=await build({entryPoints:[SELF],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
  for(const f of Object.keys(compiled.metafile.inputs))await bytes(f.replaceAll('\\','/'));
  completion=await read(completionPath);assert.equal(completion.status,'FINITE_EARLY_FROZEN_FIRST_JOINT_BATCH_FINISHED');
  index=await bound(completion.index);batch=await bound(completion.batchPlan);assertEarlyConstructionPlan(batch);await check(batch.bindings);environment=batch.executionEnvironment;
  const staticAudit=await bound(completion.audit),visual=await bound(completion.visual);assert.equal(staticAudit.status,'INDEPENDENT_EARLY_FROZEN_STATIC_PASS');assert.deepEqual(staticAudit.errors,[]);assert.deepEqual(staticAudit.index,completion.index);assert.equal(staticAudit.verifiedCandidates,index.candidates.length);assert.equal(staticAudit.publicClaimsStarted,0);assert.equal(staticAudit.newGameplaySearches,0);await check(staticAudit.fileBindings);
  assert.equal(visual.status,'ROOT_ALL_NEW_OPENINGS_VISUALLY_REVIEWED');assert.deepEqual(visual.index,completion.index);assert.equal(visual.viewedCandidates,index.candidates.length);assert.equal(visual.formalPointerValidation,false);await check(visual.fileBindings);
  assert.deepEqual(index.plan,completion.batchPlan);assert.equal(completion.oldMacroActualInputs,58);assert.equal(completion.separateExperimentActualInputs,index.fixedColourInputs);assert.equal(index.fixedColourInputs,4);
  assert.equal(completion.selectedCandidatesAdded,0);assert.equal(completion.selectionIndexUnchanged,true);assert.equal(completion.catalogEligible,false);assert.equal(completion.formalReady,false);
  const batchPlan=await read(path.join(path.dirname(completionPath),'plan.json'));assert.equal(batchPlan.status,'FIXED_ORIGINAL_ICE_JOINT_BATCH_BEFORE_CLAIMS');assert.deepEqual(batchPlan.index,completion.index);assert.deepEqual(batchPlan.audit,completion.audit);assert.deepEqual(batchPlan.visual,completion.visual);assert.deepEqual(batchPlan.batchPlan,completion.batchPlan);await check(batchPlan.bindings);
  const executionPath=path.join(EARLY_CONSTRUCTION_LEDGER,levelSha256({experimentId:EARLY_EXPERIMENT_ID})+'.math-execution.json');assert.equal(batchPlan.executionFile,executionPath);
  const execution=await read(executionPath);assert.deepEqual(execution.index,completion.index);assert.deepEqual(execution.plan,completion.batchPlan);assert.equal(execution.retryAllowed,false);
  assert.equal(completion.results.length,index.candidates.length);assert.equal(batchPlan.inputs.length,index.candidates.length);assert.equal(new Set(completion.results.map(r=>r.attemptId)).size,completion.results.length);
  const latest=new Map(batch.blueprints.map(b=>[b.sourceLevelId,b.failedParent.attemptId])),accepted=[],expectedRequests=batch.publicStocks.map(d=>path.basename(d.path));
  for(const [i,row]of completion.results.entries()){
   const candidateD=index.candidates[i],input=await bound(candidateD),q=await read(row.file,row.sha256);assert.deepEqual(q.input,candidateD);assert.deepEqual(row.input,candidateD);assert.deepEqual(q.level,input.level);assert.equal(q.levelSha256,levelSha256(input.level));assert.equal(q.sourceLevelId,input.sourceLevelId);
   const original=await bound(input.constructionEvidence),plain=await bound(input.plainConstructionEvidence);assert.deepEqual(original.level,q.level);assert.deepEqual(original.constructionAccounting,input.constructionAccounting);assert.deepEqual(original.plainConstructionEvidence,input.plainConstructionEvidence);assert.equal(levelSha256(plain.level),plain.levelSha256);
   assert.equal(q.accepted,row.accepted);assert.equal(q.L,row.L);assert.equal(q.U,row.U);assert.equal(q.status,row.status);assert.equal(q.attempt.id,row.attemptId);assert.deepEqual(q.batchPlan,completion.batchPlan);assert.deepEqual(q.preflightAudit,completion.audit);assert.deepEqual(q.visualReview,completion.visual);
   assert.equal(q.catalogEligible,false);assert.equal(q.formalReady,false);assert.equal(q.pointerValidated,false);assert.equal(q.timeValidated,false);assert.equal(q.qualificationOnly,false);assert.equal(q.currentRuntimeValidationClaimed,false);assert.equal(q.mechanismStrengthValidated,false);assert.equal(q.designValidated,false);assert.equal(q.toolchainSha256,FROZEN_MATH_SHA);assert.deepEqual(q.toolchainBindings,rt.toolchainBindings);assert.deepEqual(q.entry,EARLY_FROZEN_BINDING);await check(q.designBindings);assert.equal(q.designToolchainSha256,levelSha256(q.designBindings));
   assert.equal(q.jointSearchCalls,1);assert(q.proof&&q.lowerBound);assert.equal(q.lowerBound.inputLevelSha256,q.levelSha256);assert.equal(q.lowerBound.requiredFloor,31);assert.deepEqual(q.lowerBound.result,q.proof);assert.equal(q.lowerBound.method,'v3-native-static-ice-joint-search');
   const plan=makeEarlyFrozenIcePlan(rt,input,{floor:31,searchUpper:128,budget:batch.futureBudget});assert.deepEqual(q.plan,plan);assert.deepEqual(batchPlan.inputs[i],{descriptor:candidateD,plan});assert.equal(plan.jointSearchesMaximum,1);assert.equal(plan.alternativeSearchAllowed,false);
   const req=await read(`${PUBLIC_LEDGER}/${row.attemptId}.request.json`),res=await read(`${PUBLIC_LEDGER}/${row.attemptId}.result.json`),fp=designFingerprints(q.level);
   assert.deepEqual(req,q.attempt);assert.equal(req.id,fp.designSha256);assert.equal(req.identityOrigin,req.id);assert.equal(req.revalidates,undefined);assert.equal(req.levelSha256,q.levelSha256);for(const [k,v]of Object.entries(fp))assert.deepEqual(req[k],v);assert.equal(req.retryIdentitySha256,physicalRetry(fp));
   const parentId=latest.get(q.sourceLevelId);assert.equal(req.redesignOf,parentId);assert.equal(row.redesignOf,parentId);const parent=await read(`${PUBLIC_LEDGER}/${parentId}.request.json`),parentResult=await read(`${PUBLIC_LEDGER}/${parentId}.result.json`);assert.equal(parentResult.accepted,false);assert(realShapeColourChange(parent,fp));
   assert.equal(res.accepted,q.accepted);assert.equal(res.status,q.status);assert.equal(res.levelSha256,q.levelSha256);assert.deepEqual(res.lower,q.lowerBound.result);assert.deepEqual(res.upper,q.route?.search);
   const identity=await read(`${PUBLIC_LEDGER}/identities/${req.retryIdentitySha256}.json`);assert.equal(identity.origin,req.id);
   const side=await bound(q.planEvidence);assert.deepEqual(side.attempt,req);assert.deepEqual(side.plan,plan);assert.deepEqual(side.bindings,q.designBindings);
   const publicEvidence=await read(q.evidenceFile);const outer=structuredClone(q);for(const k of ['input','batchPlan','preflightAudit','visualReview','selectionIndexUnchanged','admissionStatus'])delete outer[k];assert.deepEqual(publicEvidence,outer);
   const p=q.proof,a=q.sharedAccounting,c=input.constructionAccounting;assert.equal(c.completeWorldReservations,3);assert.equal(c.placeholderWorldReservations,1);assert.equal(c.completedColourWorldReservations,1);assert.equal(c.icedWorldReservations,1);assert.equal(p.sourceLevelSha256,q.levelSha256);assert.equal(p.floor,31);assert.deepEqual(p.budget,plan.jointBudget);assert.equal(p.budget.maxStates,9996);assert.deepEqual(p.guardAllowance,guardAllowanceFor(p));
   integer(p.rawFullBoardStates,9996);integer(p.rawExploredStates,p.rawFullBoardStates);assert.equal(p.rawFullBoardStates,p.discoveredStates);assert.equal(p.rawFullBoardStates,p.visitedStates);assert.equal(p.rawExploredStates,p.exploredStates);integer(p.attemptedTransitions,plan.jointBudget.maxTransitions);integer(p.microDiscoveredStates,plan.jointBudget.maxMicroStates);integer(p.microExploredStates,p.microDiscoveredStates);
   assert.deepEqual(a.prior,c);assert.equal(a.registeredRaw,p.rawFullBoardStates);assert.equal(a.terminalAllowance,1);assert.equal(a.conservativeFullBoardStateUpperBound,3+p.rawFullBoardStates+1);assert(a.conservativeFullBoardStateUpperBound<=10000);assert.equal(row.sharedWorlds,a.conservativeFullBoardStateUpperBound);assert.equal(a.transitions,c.transitions+p.attemptedTransitions);assert.equal(a.microStates,c.microStates+p.microDiscoveredStates);assert(a.transitions<=10000000&&a.microStates<=3000000);assert.deepEqual(a.fullBudget,plan.fullBudget);assert(a.elapsedMilliseconds>=c.elapsedMilliseconds+p.elapsedMilliseconds);
   let canonical=null,independent=null;
   if(q.route){assert(Array.isArray(q.drags));assert.equal(q.routeSha256,routeSha256(q.drags));assert.deepEqual(q.drags,p.drags);assert.deepEqual(q.route.search,p);assert.equal(q.route.inputLevelSha256,q.levelSha256);assert.equal(q.route.routeSha256,q.routeSha256);
    canonical=rt.replayRevisedRoute(q.level,q.drags);independent=independentReplay(rt,q.level,q.drags);
    for(const r of [canonical,independent,q.route.canonicalReplay,q.route.independentReplay]){assert(r.valid&&r.complete&&!r.failed);assert.equal(r.nonClearingDrags,q.U);assert.equal(r.effectiveDrags,q.drags.length);assert.equal(r.clearEvents,q.level.blocks.length);}
    assert.equal(independent.remainingBodies,0);assert.equal(independent.remainingQueued,0);assert.equal(p.cost,q.U);
   }
   if(q.accepted){assert.equal(q.status,'EXPLORATORY_ORIGINAL_ICE_JOINT_LU');assert.equal(q.L,31);assert(q.U>=31&&canonical&&independent);assert.equal(p.status,'threshold-proven');assert.equal(p.thresholdProven,true);assert.equal(p.termination,'below-threshold-exhausted');assert.equal(q.mathematicalEvidenceValidated,true);assert(a.elapsedMilliseconds<30000);assert(p.elapsedMilliseconds<plan.jointBudget.maxMilliseconds);accepted.push({path:row.file,sha256:row.sha256});}
   else{assert.equal(q.L,null);assert.equal(q.mathematicalEvidenceValidated,false);assert.equal(q.redesignRequired,true);for(const f of [`${PUBLIC_LEDGER}/${req.identityOrigin}.blocked.json`,`${PUBLIC_LEDGER}/identities/${req.retryIdentitySha256}.blocked.json`]){const blocked=await read(f);assert.equal(blocked.attemptId,req.id);assert.equal(blocked.status,q.status);}latest.set(q.sourceLevelId,req.id);}
   results.push({file:row.file,sha256:row.sha256,accepted:q.accepted,status:q.status,L:q.L,U:q.U,sourceLevelId:q.sourceLevelId,attemptId:req.id,redesignOf:req.redesignOf,levelSha256:q.levelSha256,priorConstructionWorlds:3,jointRaw:p.rawFullBoardStates,jointExpanded:p.rawExploredStates,conservativeFullBoardStateUpperBound:a.conservativeFullBoardStateUpperBound,transitions:a.transitions,microStates:a.microStates,elapsedMilliseconds:a.elapsedMilliseconds,termination:p.termination,canonicalReplay:canonical,independentReplay:independent,failureSealed:!q.accepted});
   expectedRequests.push(req.id+'.request.json');
  }
  assert.deepEqual(completion.accepted,accepted);assert.equal(completion.mathematicalPoolAccepted,accepted.length);assert.deepEqual(await names(),expectedRequests.sort());assert.deepEqual(await names(),before);
  await bound(batch.selectedIndex);for(const d of batch.selected)await bound(d);await check(fileBindings);
 }catch(e){errors.push(e.message);errors.push(e.stack);}
 const report={status:errors.length?'INDEPENDENT_EARLY_FROZEN_ACTUAL_FAIL':'INDEPENDENT_EARLY_FROZEN_ACTUAL_PASS',completion:{path:completionPath,sha256:fileBindings[completionPath]},index:completion?.index??null,batchPlan:completion?.batchPlan??null,selection:batch?.selectedIndex??null,environment,results,accepted:results.filter(r=>r.accepted).length,verified:results.length,errors,fileBindings,publicRequestCountBefore:before.length,publicRequestCountAfter:(await names()).length,newSearches:0,newConstructionCalls:0,newLedgerClaims:0,publicClaimsStarted:0,originalLowerRecomputed:false,originalCompleteRoutesReplayed:results.filter(r=>r.independentReplay).length*2,selectedCandidatesAdded:0,formalReady:false,limitations:'Independent evidence/identity/budget verification and provided-route replay only; any mathematical acceptance remains an exploratory ice pool and has no stage, strength, Pointer or natural-clock qualification.'};
 await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){const[c,out]=process.argv.slice(2);assert(c&&out);const r=await auditEarlyFrozenActual(c,out);console.log(JSON.stringify({status:r.status,verified:r.verified,accepted:r.accepted,errors:r.errors,report:out+'/report.json',sha256:sha(await fs.readFile(out+'/report.json'))}));if(r.errors.length)process.exitCode=1;}
