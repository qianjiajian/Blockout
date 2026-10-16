import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {loadV4Runtime,FROZEN_MATH_SHA} from './runtime.mjs';
import {makeEarlyFrozenPrefixTailPlan,auditThawedPrefixBridge,EARLY_PREFIX_TAIL_BINDING} from './early-frozen-prefix-tail.mjs';
import {assertEarlyPrefixStaticMetadata} from './audit-early-prefix-static-independent.mjs';
import {assertEarlyConstructionPlan,realShapeColourChange,physicalRetry,EARLY_CONSTRUCTION_LEDGER,EARLY_EXPERIMENT_ID} from './early-prefix-four-contract.mjs';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {guardAllowanceFor} from '../formal-v3/reserved-guard-budget.mjs';
import {PUBLIC_LEDGER} from './native-batch-io.mjs';

// Evidence verification and supplied route replay only. Never invokes an
// explorer, bounded primitive, constructor, attempt ledger or claim API.
const SELF='tools/daily-challenge/formal-v4/audit-early-prefix-actual-independent.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const exists=p=>fs.stat(p).then(()=>true).catch(e=>{if(e.code==='ENOENT')return false;throw e;});
const integer=(n,max)=>assert(Number.isSafeInteger(n)&&n>=0&&n<=max);
export function assertEarlyPrefixActualMetadata(completion,index){
 assert.equal(completion.status,'FINITE_EARLY_PREFIX_TAIL_BATCH_FINISHED');
 assert.equal(completion.results.length,index.candidates.length);assert(completion.results.length<=4);
 assert.equal(completion.separateExperimentActualInputs,index.fixedColourInputs);assert.equal(completion.oldMacroActualInputs,58);
 assert.equal(completion.selectedCandidatesAdded,0);assert.equal(completion.selectionIndexUnchanged,true);
 assert.equal(completion.catalogEligible,false);assert.equal(completion.formalReady,false);
 assert.equal(new Set(completion.results.map(r=>r.attemptId)).size,completion.results.length);return true;
}
function rawSearch(p){
 assert.deepEqual(p.guardAllowance,guardAllowanceFor(p));integer(p.budget.maxStates,9999);
 integer(p.rawFullBoardStates,p.budget.maxStates);integer(p.rawExploredStates,p.rawFullBoardStates);
 assert.equal(p.rawFullBoardStates,p.discoveredStates);assert.equal(p.rawFullBoardStates,p.visitedStates);assert.equal(p.rawExploredStates,p.exploredStates);
 integer(p.attemptedTransitions,p.budget.maxTransitions);integer(p.microDiscoveredStates,p.budget.maxMicroStates);integer(p.microExploredStates,p.microDiscoveredStates);
 integer(p.elapsedMilliseconds,Number.MAX_SAFE_INTEGER);
}
function assertFullReplay(r,level,drags,U){
 assert(r.valid&&r.complete&&!r.failed);assert.equal(r.nonClearingDrags,U);assert.equal(r.effectiveDrags,drags.length);assert.equal(r.clearEvents,level.blocks.length);
 if(r.remainingBodies!==undefined)assert.equal(r.remainingBodies,0);if(r.remainingQueued!==undefined)assert.equal(r.remainingQueued,0);
}
/** Pure evidence checks. Deliberately no runtime, filesystem or solver calls. */
export function assertEarlyPrefixReceiptAccounting(q,input){
 const plan=q.plan,c=input.constructionAccounting,u=q.upperConstruction,a=q.upperAccounting,p=q.proof;
 assert.equal(plan.levelSha256,levelSha256(input.level));assert.equal(q.levelSha256,plan.levelSha256);assert.deepEqual(q.level,input.level);
 assert.deepEqual(plan.constructionAccounting,c);assert.equal(c.placeholderWorldReservations,1);assert.equal(c.icedWorldReservations,1);
 integer(c.completedColourWorldReservations,9997);assert(c.completedColourWorldReservations>=1);
 assert.equal(c.completeWorldReservations,c.placeholderWorldReservations+c.completedColourWorldReservations+c.icedWorldReservations);
 for(const k of ['completeWorldReservations','transitions','microStates','elapsedMilliseconds'])integer(c[k],Number.MAX_SAFE_INTEGER);
 const P=input.prefixDrags.length+1,T=input.prefixDrags.reduce((n,d)=>n+d.path.length+1,0),full=plan.fullUpperBudget;
 assert.equal(plan.bridgePrefixWorlds,P);assert.equal(plan.bridgeTransitions,3*T);assert.equal(plan.tailSearchesMaximum,1);assert.equal(plan.lowerSearchesMaximum,1);
 assert.equal(plan.alternativeSearchAllowed,false);assert.equal(plan.failedInputContinuationAllowed,false);assert.equal(plan.tailBoundTransferAllowed,false);
 assert.equal(plan.upperTask,'fixed-iced-to-plain-cut-bridge-one-plain-tail-original-iced-double-replay');assert.equal(plan.lowerTask,'original-full-iced-floor-only');
 assert.equal(plan.innerPlan.tailStrategy,'plain-joint');assert.equal(plan.innerPlan.tailBudget.maxStates,full.maxStates-c.completeWorldReservations-2*P-1);
 integer(full.maxStates,10000);integer(plan.lowerBudget.maxStates,9999);
 assert.equal(q.lowerSearchCalls,p?1:0);
 if(q.bridge){assert(q.bridge.valid&&q.bridge.allSurvivingIceZero);assert.equal(q.bridge.icedCutSha256,q.bridge.plainCutSha256);assert.equal(q.bridge.cleared,input.iceDeclaration.count);assert.equal(q.bridge.trace.length,input.prefixDrags.length);}
 if(u){
  assert(q.bridge?.valid);const inner=q.actualInnerPlan;assert(inner);assert.deepEqual(u.plan,inner);
  assert(inner.fullUpperBudget.maxMilliseconds>0&&inner.fullUpperBudget.maxMilliseconds<=plan.innerPlan.fullUpperBudget.maxMilliseconds);
  const wanted=structuredClone(plan.innerPlan);wanted.fullUpperBudget.maxMilliseconds=inner.fullUpperBudget.maxMilliseconds;wanted.tailBudget.maxMilliseconds=inner.fullUpperBudget.maxMilliseconds;
  assert.deepEqual(inner,wanted);assert.equal(u.levelSha256,plan.plainLevelSha256);assert.equal(u.prefixSha256,plan.prefixSha256);
  integer(u.tailSearches,1);assert.equal(u.tailSearches,u.tailSearch?1:0);integer(u.prefixCommittedWorldUpperBound,P);assert(u.prefixCommittedWorldUpperBound>=1);
  assert.equal(u.lowerBoundClaimed,false);assert.equal(u.exactFullBoardVisitedCountClaimed,false);
  const tail=u.tailSearch;
  if(tail){
   assert.equal(u.prefixCommittedWorldUpperBound,P);assert.equal(u.prefixTransitions,T);assert.equal(u.prefixAudits.length,input.prefixDrags.length);assert(u.prefixAudits.every(x=>x.valid));
   assert.equal(tail.sourceLevelSha256,u.tailLevelSha256);assert.equal(u.tailLevelSha256,levelSha256(u.tailLevel));assert.equal(tail.floor,1);rawSearch(tail);
   const tailImage=structuredClone(q.level);for(const b of tailImage.blocks)if(input.iceDeclaration.regionBlockIds.includes(b.id))delete b.frozen;
   assert.equal(levelSha256(tailImage),plan.plainLevelSha256);
   for(const d of input.prefixDrags){if(d.exitSide)tailImage.blocks=tailImage.blocks.filter(b=>b.id!==d.blockId);else{const b=tailImage.blocks.find(b=>b.id===d.blockId);assert(b&&d.path.length);[b.x,b.y]=d.path.at(-1);}}
   assert.deepEqual(u.tailLevel,tailImage,'Tail coordinates and retained full inventory differ from the fixed prefix');
   const expected={...inner.tailBudget,maxTransitions:inner.tailBudget.maxTransitions-T,maxMilliseconds:tail.budget.maxMilliseconds};assert.deepEqual(tail.budget,expected);
   assert(tail.budget.maxMilliseconds>0&&tail.budget.maxMilliseconds<=inner.tailBudget.maxMilliseconds);
   assert.equal(u.conservativeFullBoardStateUpperBound,P+tail.rawFullBoardStates+1);
  }else assert.equal(u.conservativeFullBoardStateUpperBound,u.prefixCommittedWorldUpperBound);
  integer(c.completeWorldReservations+P+u.conservativeFullBoardStateUpperBound,full.maxStates);
  integer(c.transitions+3*T+(u.prefixTransitions??0)+(u.tailSearch?.attemptedTransitions??0),full.maxTransitions);
  integer(c.microStates+(u.tailSearch?.microDiscoveredStates??0),full.maxMicroStates);
  integer(u.elapsedMilliseconds,Number.MAX_SAFE_INTEGER);
  if(u.valid){assert.equal(u.status,'COMPLETE_ORIGINAL_UPPER_WITNESS');assert.equal(u.complete,true);assert(tail);
   assert(['relaxed-shortcut','threshold-proven'].includes(tail.status));assert(['minimum-relaxed-route-found','relaxed-completion'].includes(tail.routeTermination??tail.termination));
   assert.deepEqual(u.drags,[...input.prefixDrags,...tail.drags]);assert.equal(u.routeSha256,routeSha256(u.drags));integer(u.U,Number.MAX_SAFE_INTEGER);
  }
 }
 if(a){
  assert(u);assert.deepEqual(a.prior,c);assert.equal(a.icedBridgePrefixWorlds,P);assert.equal(a.plainHelperPrefixWorlds,u.prefixCommittedWorldUpperBound);
  assert.equal(a.tailRegistered,u.tailSearch?.rawFullBoardStates??0);assert.equal(a.terminalAllowance,u.tailSearch?1:0);
  assert.equal(a.conservativeFullBoardStateUpperBound,c.completeWorldReservations+P+u.conservativeFullBoardStateUpperBound);integer(a.conservativeFullBoardStateUpperBound,full.maxStates);
  assert.equal(a.transitions,c.transitions+3*T+(u.prefixTransitions??0)+(u.tailSearch?.attemptedTransitions??0));integer(a.transitions,full.maxTransitions);
  assert.equal(a.microStates,c.microStates+(u.tailSearch?.microDiscoveredStates??0));integer(a.microStates,full.maxMicroStates);
  assert.deepEqual(a.maximum,full);assert.equal(a.exactWorldCountClaimed,false);integer(a.elapsedMilliseconds,Number.MAX_SAFE_INTEGER);assert(a.elapsedMilliseconds>=c.elapsedMilliseconds+u.elapsedMilliseconds);
 }
 if(q.route){
  assert(u?.valid&&a);assert.equal(q.route.search,null);assert.deepEqual(q.drags,u.drags);assert.equal(q.routeSha256,routeSha256(q.drags));assert.equal(q.route.routeSha256,q.routeSha256);
  assert.equal(q.route.inputLevelSha256,q.levelSha256);assert.equal(q.U,u.U);assert(a.elapsedMilliseconds<full.maxMilliseconds);
  assert(u.tailSearch.elapsedMilliseconds<u.tailSearch.budget.maxMilliseconds);
  for(const r of [q.route.canonicalReplay,q.route.independentReplay])assertFullReplay(r,q.level,q.drags,q.U);
 }else{assert.equal(q.U,null);assert.equal(q.lowerSearchCalls,0);assert.equal(p,null);assert.equal(q.lowerBound,null);}
 if(p){
  assert(q.route&&q.U>=plan.floor);assert.equal(p.sourceLevelSha256,q.levelSha256);assert.equal(p.floor,plan.floor);assert.deepEqual(p.budget,plan.lowerBudget);rawSearch(p);
  assert.equal(q.lowerBound.method,'v3-native-static-ice');assert.equal(q.lowerBound.inputLevelSha256,q.levelSha256);assert.equal(q.lowerBound.requiredFloor,plan.floor);assert.deepEqual(q.lowerBound.result,p);
 }else assert.equal(q.lowerBound,null);
 if(q.accepted){assert.equal(q.status,'EXPLORATORY_THAWED_PREFIX_ORIGINAL_ICE_LU');assert.equal(q.L,plan.floor);assert(q.U>=plan.floor);assert(p);
  assert.equal(p.status,'threshold-proven');assert.equal(p.thresholdProven,true);assert.equal(p.termination,'below-threshold-exhausted');assert(p.elapsedMilliseconds<plan.lowerBudget.maxMilliseconds);assert.equal(q.mathematicalEvidenceValidated,true);
 }else{assert.equal(q.L,null);assert.equal(q.mathematicalEvidenceValidated,false);assert.equal(q.redesignRequired,true);}
 assert.equal(q.catalogEligible,false);assert.equal(q.formalReady,false);return true;
}
export async function auditEarlyPrefixActual(completionPath,out){
 await fs.mkdir(out,{recursive:false});
 const fileBindings={},errors=[],results=[],cache=new Map();let completion,index,batch,environment;
 const bytes=async(f,h)=>{const b=await fs.readFile(f),a=sha(b);if(h)assert.equal(a,h,f);for(const key of [f,path.resolve(f)]){if(fileBindings[key])assert.equal(a,fileBindings[key]);fileBindings[key]=a;}return b;};
 const read=async(f,h)=>{const b=await bytes(f,h);if(!cache.has(f))cache.set(f,JSON.parse(b));return cache.get(f);};
 const bound=d=>{assert(d?.path&&/^[a-f0-9]{64}$/.test(d.sha256??''));return read(d.path,d.sha256);};
 const check=async(m,{fresh=false}={})=>{const pairs=Object.entries(m),seen=new Map();for(let i=0;i<pairs.length;i+=32)await Promise.all(pairs.slice(i,i+32).map(async([f,h])=>{
  if(fileBindings[f])assert.equal(fileBindings[f],h,'Conflicting repeated binding '+f);
  const absolute=path.resolve(f);if(fileBindings[absolute])assert.equal(fileBindings[absolute],h,'Conflicting path alias '+f);
  if(seen.has(absolute)){assert.equal(seen.get(absolute),h);return;}seen.set(absolute,h);
  if(!fresh&&fileBindings[absolute]){fileBindings[f]=h;return;}await bytes(f,h);
 }));};
 const names=async()=>(await fs.readdir(PUBLIC_LEDGER)).filter(f=>f.endsWith('.request.json')).sort();
 const before=await names();
 try{
  const rt=await loadV4Runtime();assert.equal(rt.toolchainSha256,FROZEN_MATH_SHA);await check(rt.toolchainBindings);
  const compiled=await build({entryPoints:[SELF],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
  for(const f of Object.keys(compiled.metafile.inputs))await bytes(f.replaceAll('\\','/'));
  completion=await read(completionPath);assert.equal(completion.status,'FINITE_EARLY_PREFIX_TAIL_BATCH_FINISHED');
  index=await bound(completion.index);batch=await bound(completion.batchPlan);assertEarlyConstructionPlan(batch);await check(batch.bindings);environment=batch.executionEnvironment;
  const staticAudit=await bound(completion.audit),visual=await bound(completion.visual);assert.equal(staticAudit.status,'INDEPENDENT_EARLY_PREFIX_STATIC_PASS');assert.deepEqual(staticAudit.errors,[]);assert.deepEqual(staticAudit.index,completion.index);assert.equal(staticAudit.verifiedCandidates,index.candidates.length);assert.equal(staticAudit.publicClaimsStarted,0);assert.equal(staticAudit.newGameplaySearches,0);await check(staticAudit.fileBindings);
  assert.equal(visual.status,'ROOT_ALL_NEW_OPENINGS_VISUALLY_REVIEWED');assert.deepEqual(visual.index,completion.index);assert.equal(visual.viewedCandidates,index.candidates.length);assert.equal(visual.formalPointerValidation,false);await check(visual.fileBindings);
  assert.deepEqual(index.plan,completion.batchPlan);assert.equal(completion.oldMacroActualInputs,58);assert.equal(completion.separateExperimentActualInputs,index.fixedColourInputs);assertEarlyPrefixStaticMetadata(index,batch);assertEarlyPrefixActualMetadata(completion,index);
  assert.equal(completion.selectedCandidatesAdded,0);assert.equal(completion.selectionIndexUnchanged,true);assert.equal(completion.catalogEligible,false);assert.equal(completion.formalReady,false);
  const batchPlan=await read(path.join(path.dirname(completionPath),'plan.json'));assert.equal(batchPlan.status,'FIXED_EARLY_PREFIX_TAIL_BATCH_BEFORE_CLAIMS');assert.deepEqual(batchPlan.index,completion.index);assert.deepEqual(batchPlan.audit,completion.audit);assert.deepEqual(batchPlan.visual,completion.visual);assert.deepEqual(batchPlan.batchPlan,completion.batchPlan);await check(batchPlan.bindings);
  const executionPath=path.join(EARLY_CONSTRUCTION_LEDGER,levelSha256({experimentId:EARLY_EXPERIMENT_ID})+'.math-execution.json');assert.equal(batchPlan.executionFile,executionPath);
  const execution=await read(executionPath);assert.deepEqual(execution.index,completion.index);assert.deepEqual(execution.plan,completion.batchPlan);assert.equal(execution.retryAllowed,false);
  assert.equal(execution.experimentId,EARLY_EXPERIMENT_ID);assert.equal(path.resolve(execution.outputDirectory),path.resolve(path.dirname(completionPath)));
  assert.equal(completion.results.length,index.candidates.length);assert.equal(batchPlan.inputs.length,index.candidates.length);assert.equal(new Set(completion.results.map(r=>r.attemptId)).size,completion.results.length);
  const latest=new Map(batch.blueprints.map(b=>[b.sourceLevelId,b.failedParent.attemptId])),accepted=[],expectedRequests=batch.publicStocks.map(d=>path.basename(d.path));
  for(const [i,row]of completion.results.entries()){
   const candidateD=index.candidates[i],input=await bound(candidateD),q=await read(row.file,row.sha256);assert.deepEqual(q.input,candidateD);assert.deepEqual(row.input,candidateD);assert.deepEqual(q.level,input.level);assert.equal(q.levelSha256,levelSha256(input.level));assert.equal(q.sourceLevelId,input.sourceLevelId);
   const original=await bound(input.constructionEvidence),plain=await bound(input.plainConstructionEvidence);assert.deepEqual(original.level,q.level);assert.deepEqual(original.constructionAccounting,input.constructionAccounting);assert.deepEqual(original.plainConstructionEvidence,input.plainConstructionEvidence);assert.equal(levelSha256(plain.level),plain.levelSha256);
   assert.equal(q.accepted,row.accepted);assert.equal(q.L,row.L);assert.equal(q.U,row.U);assert.equal(q.status,row.status);assert.equal(q.attempt.id,row.attemptId);assert.deepEqual(q.batchPlan,completion.batchPlan);assert.deepEqual(q.preflightAudit,completion.audit);assert.deepEqual(q.visualReview,completion.visual);
   assert.equal(q.catalogEligible,false);assert.equal(q.formalReady,false);assert.equal(q.pointerValidated,false);assert.equal(q.timeValidated,false);assert.equal(q.qualificationOnly,false);assert.equal(q.currentRuntimeValidationClaimed,false);assert.equal(q.mechanismStrengthValidated,false);assert.equal(q.designValidated,false);assert.equal(q.toolchainSha256,FROZEN_MATH_SHA);assert.deepEqual(q.toolchainBindings,rt.toolchainBindings);assert.deepEqual(q.entry,EARLY_PREFIX_TAIL_BINDING);await check(q.designBindings);assert.equal(q.designToolchainSha256,levelSha256(q.designBindings));
   const plan=makeEarlyFrozenPrefixTailPlan(rt,input,{floor:31,searchUpper:128,upperBudget:batch.futureUpperBudget,lowerBudget:batch.futureLowerBudget});assert.deepEqual(q.plan,plan);assert.deepEqual(input.predeclaredMathematics,plan);assert.deepEqual(batchPlan.inputs[i],{descriptor:candidateD,plan});
   assertEarlyPrefixReceiptAccounting(q,input);
   const bridge=auditThawedPrefixBridge(rt,q.level,plain.level,input.prefixDrags,input.iceDeclaration);assert.deepEqual(bridge,input.thawedPrefixBridge);if(q.bridge)assert.deepEqual(q.bridge,bridge);
   const req=await read(`${PUBLIC_LEDGER}/${row.attemptId}.request.json`),res=await read(`${PUBLIC_LEDGER}/${row.attemptId}.result.json`),fp=designFingerprints(q.level);
   assert.deepEqual(req,q.attempt);assert.equal(req.id,fp.designSha256);assert.equal(req.identityOrigin,req.id);assert.equal(req.revalidates,undefined);assert.equal(req.levelSha256,q.levelSha256);for(const [k,v]of Object.entries(fp))assert.deepEqual(req[k],v);assert.equal(req.retryIdentitySha256,physicalRetry(fp));
   const parentId=latest.get(q.sourceLevelId);assert.equal(req.redesignOf,parentId);assert.equal(row.redesignOf,parentId);const parent=await read(`${PUBLIC_LEDGER}/${parentId}.request.json`),parentResult=await read(`${PUBLIC_LEDGER}/${parentId}.result.json`);assert.equal(parentResult.accepted,false);assert(realShapeColourChange(parent,fp));
   assert.equal(res.accepted,q.accepted);assert.equal(res.status,q.status);assert.equal(res.levelSha256,q.levelSha256);assert.deepEqual(res.lower,q.lowerBound?.result);assert.deepEqual(res.upper,q.route?.search);
   const identity=await read(`${PUBLIC_LEDGER}/identities/${req.retryIdentitySha256}.json`);assert.equal(identity.origin,req.id);
   const side=await bound(q.planEvidence);assert.deepEqual(side.attempt,req);assert.deepEqual(side.plan,plan);assert.deepEqual(side.bindings,q.designBindings);
   const publicEvidence=await read(q.evidenceFile);const outer=structuredClone(q);for(const k of ['input','batchPlan','preflightAudit','visualReview','selectionIndexUnchanged','admissionStatus'])delete outer[k];assert.deepEqual(publicEvidence,outer);
   const p=q.proof,a=q.upperAccounting,c=input.constructionAccounting,u=q.upperConstruction;
   assert.equal(row.upperSharedWorlds,a?.conservativeFullBoardStateUpperBound??null);assert.equal(row.lowerWorlds,p?.guardAllowance?.conservativeFullBoardStateUpperBound??null);
   if(u?.tailSearch){await check(u.tailSearch.guardAllowance.wrapper?{[u.tailSearch.guardAllowance.wrapper.path]:u.tailSearch.guardAllowance.wrapper.sha256}:{});}
   if(p){assert.equal(p.iceProofSha256,FROZEN_MATH_SHA);assert.deepEqual(p.iceBindings,rt.toolchainBindings);await check(p.iceBindings);}
   let canonical=null,independent=null;
   if(u?.valid){const plainCanonical=rt.replayRevisedRoute(plain.level,u.drags),plainIndependent=independentReplay(rt,plain.level,u.drags);
    for(const r of [plainCanonical,plainIndependent,u.canonical,u.independent])assertFullReplay(r,plain.level,u.drags,u.U);
    assert.deepEqual(plainCanonical,u.canonical);assert.deepEqual(plainIndependent,u.independent);}
   if(q.route){canonical=rt.replayRevisedRoute(q.level,q.drags);independent=independentReplay(rt,q.level,q.drags);
    for(const r of [canonical,independent,q.route.canonicalReplay,q.route.independentReplay])assertFullReplay(r,q.level,q.drags,q.U);
    assert.deepEqual(canonical,q.route.canonicalReplay);assert.deepEqual(independent,q.route.independentReplay);}
   if(q.accepted){accepted.push({path:row.file,sha256:row.sha256});}
   else{for(const f of [`${PUBLIC_LEDGER}/${req.identityOrigin}.blocked.json`,`${PUBLIC_LEDGER}/identities/${req.retryIdentitySha256}.blocked.json`]){const blocked=await read(f);assert.equal(blocked.attemptId,req.id);assert.equal(blocked.status,q.status);}latest.set(q.sourceLevelId,req.id);}
   results.push({file:row.file,sha256:row.sha256,accepted:q.accepted,status:q.status,L:q.L,U:q.U,sourceLevelId:q.sourceLevelId,attemptId:req.id,redesignOf:req.redesignOf,levelSha256:q.levelSha256,priorConstructionWorlds:c.completeWorldReservations,icedPrefixWorlds:plan.bridgePrefixWorlds,plainPrefixWorlds:u?.prefixCommittedWorldUpperBound??null,tailRaw:u?.tailSearch?.rawFullBoardStates??null,upperAccounting:a,lowerRaw:p?.rawFullBoardStates??null,lowerAllowance:p?.guardAllowance??null,lowerTermination:p?.termination??null,originalIcedPrefixBridge:bridge,canonicalReplay:canonical,independentReplay:independent,failureSealed:!q.accepted});
   expectedRequests.push(req.id+'.request.json');
  }
  assert.deepEqual(completion.accepted,accepted);assert.equal(completion.mathematicalPoolAccepted,accepted.length);assert.deepEqual(await names(),expectedRequests.sort());assert.deepEqual(await names(),before);
  await bound(batch.selectedIndex);for(const d of batch.selected)await bound(d);await check(fileBindings,{fresh:true});
 }catch(e){errors.push(e.message);errors.push(e.stack);}
 const report={status:errors.length?'INDEPENDENT_EARLY_PREFIX_ACTUAL_FAIL':'INDEPENDENT_EARLY_PREFIX_ACTUAL_PASS',completion:{path:completionPath,sha256:fileBindings[completionPath]},index:completion?.index??null,batchPlan:completion?.batchPlan??null,selection:batch?.selectedIndex??null,environment,results,accepted:results.filter(r=>r.accepted).length,verified:results.length,errors,fileBindings,publicRequestCountBefore:before.length,publicRequestCountAfter:(await names()).length,newSearches:0,newConstructionCalls:0,newLedgerClaims:0,publicClaimsStarted:0,originalLowerRecomputed:false,originalCompleteRoutesReplayed:results.filter(r=>r.independentReplay).length*2,selectedCandidatesAdded:0,formalReady:false,limitations:'Independent evidence/identity/budget verification and provided-route replay only; any mathematical acceptance remains an exploratory ice pool and has no stage, strength, Pointer or natural-clock qualification.'};
 await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){const[c,out]=process.argv.slice(2);assert(c&&out);const r=await auditEarlyPrefixActual(c,out);console.log(JSON.stringify({status:r.status,verified:r.verified,accepted:r.accepted,errors:r.errors,report:out+'/report.json',sha256:sha(await fs.readFile(out+'/report.json'))}));if(r.errors.length)process.exitCode=1;}
