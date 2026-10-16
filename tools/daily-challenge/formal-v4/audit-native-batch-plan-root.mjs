import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {assertNativeBatchPlan,NATIVE_BATCH_REVIEW_STATUS} from './native-batch-contract.mjs';
import {checkLedgerSnapshot,assertReviewedNativeQualification,HISTORY_LEDGER_ROOTS} from './native-batch-io.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';

// Root's read-only review of the actual fixed plan against its explicit input
// and separately checked physical reference regions. No constructor or solver.
const [pp,ph,cp,ch,out]=process.argv.slice(2);assert(out);
const planDescriptor={path:pp,sha256:ph},contextDescriptor={path:cp,sha256:ch};
const own='tools/daily-challenge/formal-v4/audit-native-batch-plan-root.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex'),fileBindings={},cache=new Map(),errors=[],results=[];
const publicDir='deliverables/daily-formal-v3-20261008/proof/attempts';
const requests=async()=> (await fs.readdir(publicDir)).filter(n=>n.endsWith('.request.json')).sort();
const before=await requests();let plan;
async function bind(p,h){const b=await fs.readFile(p),actual=sha(b);if(h)assert.equal(actual,h,p);if(fileBindings[p])assert.equal(actual,fileBindings[p]);fileBindings[p]=actual;cache.set(path.resolve(p).toLowerCase(),actual);return b;}
const read=async d=>JSON.parse(await bind(d.path,d.sha256));
async function many(m){const pending=new Map();for(const[p,h]of Object.entries(m)){if(fileBindings[p])assert.equal(fileBindings[p],h);fileBindings[p]=h;
 const key=path.resolve(p).toLowerCase();if(cache.has(key)){assert.equal(cache.get(key),h);continue;}if(pending.has(key))assert.equal(pending.get(key)[1],h);pending.set(key,[p,h]);}
 const rows=[...pending.values()];for(let i=0;i<rows.length;i+=48)await Promise.all(rows.slice(i,i+48).map(([p,h])=>bind(p,h)));}
try{
 plan=await read(planDescriptor);assertNativeBatchPlan(plan);const ctx=await read(contextDescriptor);
 assert.equal(plan.bindings[contextDescriptor.path],contextDescriptor.sha256);await many(plan.bindings);
 assert.deepEqual(plan.selectedIndex,ctx.selection);assert.deepEqual(plan.selectionReview,ctx.selectionReview);
 assert.deepEqual(plan.historyCheckpoint,ctx.historyCheckpoint);assert.deepEqual(plan.nativeQualification,ctx.nativeQualification);
 assert.deepEqual(plan.sequence,ctx.sequence);assert.equal(plan.maximumStaticPartitionAttempts,ctx.maximumStaticPartitionAttempts);
 const proposed=await read(ctx.proposal),physicalReview=await read(ctx.proposalReview);
 assert.equal(physicalReview.status,'NATIVE120_FIVE_PROPOSAL_READONLY_PASS');assert.deepEqual(physicalReview.errors,[]);assert.deepEqual(physicalReview.proposal,ctx.proposal);
  assert.deepEqual(plan.selectedIndex,proposed.selectedIndex);assert.deepEqual(plan.historyCheckpoint,proposed.latestCompletedMathReview);
  assert.equal(plan.maximumStaticPartitionAttempts,proposed.maximumStaticPartitionAttempts);
  assert.deepEqual(plan.blueprints.map(b=>({blueprintId:b.recipeId,sourceLevelId:b.sourceLevelId,maximumStocks:b.maximumStocks})),
   proposed.recipes.map(b=>({...b,blueprintId:'native120-'+b.blueprintId})), 'Each proposed source keeps its one explicit quota');
 await many(physicalReview.fileBindings);assert.equal(plan.previousMacro64ActualInputs,proposed.previousMacro64ActualInputs);
 assert.equal(plan.maximumAfterThisBatch,proposed.maximumAfterThisBatch);assert.deepEqual(plan.futureUpperBudget,proposed.futureUpperBudget);assert.deepEqual(plan.futureLowerBudget,proposed.futureLowerBudget);
 const originals=await read(proposed.blueprintSource),selected=await read(plan.selectedIndex),review=await read(plan.selectionReview);
 assert.equal(review.status,'INDEPENDENT_150_MERGE_QUICK_CHECK_PASS');assert.deepEqual(review.errors,[]);assert.deepEqual(review.selection,plan.selectedIndex);
 await many(review.inputBindings);assert.equal(selected.files.length,review.candidates);assert.equal(plan.selectedCount,selected.files.length);
 assert.deepEqual(plan.selected.map(d=>d.path),selected.files);for(const d of plan.selected){const r=await read(d);assert(r.accepted&&!r.qualificationOnly);assert.equal(levelSha256(r.level),d.levelSha256);}
 const qual=await read(plan.nativeQualification);await assertReviewedNativeQualification(qual);await many(qual.fileBindings);
 assert.deepEqual(plan.ledgerSnapshot.roots.map(r=>r.directory).toSorted(),[...HISTORY_LEDGER_ROOTS].sort());await checkLedgerSnapshot(plan.ledgerSnapshot);
 const parentBySource=new Map();for(const d of ctx.failedParents){const q=await read(d),a=await read({path:`${publicDir}/${q.attempt.id}.request.json`}),r=await read({path:`${publicDir}/${q.attempt.id}.result.json`});
  assert.equal(q.accepted,false);assert.deepEqual(q.attempt,a);assert.equal(r.accepted,false);assert.equal(r.levelSha256,q.levelSha256);
  for(const suffix of [`${a.id}.blocked.json`,`identities/${a.retryIdentitySha256}.blocked.json`]){const b=await read({path:`${publicDir}/${suffix}`});assert.equal(b.attemptId,a.id);assert.equal(b.status,r.status);}
  const bound=plan.failedParents.find(p=>p.source===q.sourceLevelId);assert(bound);assert.equal(bound.file,d.path);assert.equal(bound.sha256,d.sha256);assert.equal(bound.id,a.id);assert.deepEqual(bound.fingerprints,designFingerprints(q.level));parentBySource.set(q.sourceLevelId,a.id);
 }
 assert.equal(plan.blueprints.length,ctx.recipes.length);for(const [i,b]of plan.blueprints.entries()){
  const spec=ctx.recipes[i],old=originals.blueprints.find(x=>x.sourceLevelId===spec.sourceLevelId&&x.prefixDrags.length===spec.cut);
  assert(old);assert.equal(b.recipeId,spec.recipeId);assert.equal(b.maximumStocks,spec.maximumStocks);assert.deepEqual(b.reference,spec.reference);
  const ref=await read(spec.reference);assert.deepEqual(b.level,ref.level);assert.deepEqual(b.level,old.level);
  assert.equal(b.referenceLevelSha256,levelSha256(ref.level));assert.equal(b.referenceRouteSha256,routeSha256(ref.drags));
  assert.deepEqual(b.prefixDrags,ref.drags.slice(0,spec.cut));assert.deepEqual(b.prefixDrags,old.prefixDrags);assert.deepEqual(b.changedBodies,old.changedBodies);assert.deepEqual(b.fixedBlocks,old.fixedBlocks);
  assert.deepEqual([...b.region.bodyIds].sort(),[...spec.regionBodyIds].sort());
  assert.deepEqual(b.region.cells.map(p=>p.join(',')).sort(),old.region.cells.map(p=>p.join(',')).sort());
  assert.equal(b.prefixFacts.parking,old.prefixFacts.parking);assert.equal(b.prefixFacts.clears,old.prefixFacts.clears);
  const rr=physicalReview.rows.find(r=>r.sourceLevelId===b.sourceLevelId);assert(rr);assert.deepEqual(rr.reference,b.reference);assert.equal(rr.untouchedAtEveryUnitPose,true);
  results.push({recipeId:b.recipeId,sourceLevelId:b.sourceLevelId,maximumStocks:b.maximumStocks,reference:b.reference,regionArea:b.region.area,
   fixedPrefixDrags:b.prefixDrags.length,physicalReferenceReview:ctx.proposalReview,failedParent:parentBySource.get(b.sourceLevelId),newCandidateMade:false,newL:null,newU:null});
 }
 const compiled=await build({entryPoints:[own],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
 for(const file of Object.keys(compiled.metafile.inputs))await bind(file);
 const after=await requests();assert.deepEqual(after,before);assert.equal(plan.publicStocks.length,after.length);
}catch(e){errors.push(e.stack??e.message);}
const report={status:errors.length?'INDEPENDENT_FINITE_NATIVE_BATCH_PLAN_FAIL':NATIVE_BATCH_REVIEW_STATUS,plan:planDescriptor,context:contextDescriptor,errors,results,recipeCount:results.length,
 previousMacroInputs:plan?.previousMacro64ActualInputs,maximumAdditionalInputs:plan?.maximumStocksEnteringColourCspIncludingFailed,maximumCumulativeInputs:plan?.maximumAfterThisBatch,
 selectedCandidates:plan?.selectedCount,publicRequestsBefore:before.length,publicRequestsAfter:(await requests()).length,fileBindings,
 newSearches:0,newConstructions:0,publicLedgerWrites:0,currentRuntimeValidationClaimed:false,formalReady:false,
 limitations:['Existing reference geometry replay is reused by exact descriptor; no new level has been constructed, solved or admitted.','Every actual new candidate still requires independent static and Canvas checks before its first bounded U and original L31.']};
await fs.mkdir(path.dirname(out),{recursive:true});await fs.writeFile(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:report.status,recipeCount:results.length,errors,path:out,sha256:sha(await fs.readFile(out))}));if(errors.length)process.exitCode=1;
