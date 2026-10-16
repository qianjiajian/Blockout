import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {loadV4Runtime} from './runtime.mjs';
import {loadV4StageContract} from './static-contract.mjs';
import {prefixExecutionEnvironment} from './prefix-execution-environment.mjs';
import {assertLowBandBatchPlan,LOW_BAND_BATCH_REVIEW_STATUS} from './low-band-batch-contract.mjs';
import {readBound,mergeBindings,checkBindings,checkLedgerSnapshot,write,sha} from './low-band-batch-io.mjs';

const [planPath,planSha,output]=process.argv.slice(2),pd={path:planPath,sha256:planSha},bindings={};
const p=await readBound(pd,bindings);assertLowBandBatchPlan(p);
assert.equal(p.blueprints.length,32);assert.equal(p.selectedCount,150);assert.equal(p.campaign.maximumInputs,32);
assert.equal(p.campaign.previousActualInputs,58);assert.equal(p.maximumAfterThisBatch,90);
const qr={path:'deliverables/daily-formal-v4-20261008/proof/low-band-batch-root-review-02/report.json',sha256:'95a6245b00d20957f80a1743b13ea957b32380f342f9c3947943d2112497e8a9'};
const q=await readBound(qr,bindings);assert.equal(q.status,'ROOT_FINITE_LOW_BAND_ENTRY_REVIEW_PASS');assert.deepEqual(q.errors,[]);assert.equal(q.independentTestsPassed,9);
const proposal=await readBound(p.proposal,bindings);assert.equal(p.proposal.sha256,'3fc2664263438982a17d1c4d3168dc4f19fab631935d7044d4a1fc647a347afc');
const counts={},bands={1:0,2:0};
for(const b of p.blueprints){
 const r=proposal.inputs.find(x=>x.inputId===b.recipeId);assert(r);const ref=proposal.references.find(x=>x.referenceId===r.referenceId);assert(ref);
 assert.equal(b.seed,r.proposedSeed);assert.equal(b.sourceLevelId,r.sourceLevelId);assert.equal(b.targetDifficulty,r.targetDifficulty);
 assert.deepEqual(b.reference,ref.reference);assert.deepEqual(b.prefixDrags,r.prefixDrags);assert.deepEqual(b.region.cells.map(x=>x.join(',')).sort(),r.region.cells.map(x=>x.join(',')).sort());
 assert.equal(b.maximumStocks,1);assert.equal(b.maximumStaticPartitionAttempts,125);
 counts[b.sourceLevelId]=(counts[b.sourceLevelId]??0)+1;assert.equal(b.bodyCountDelta,[-2,-1,1,2][counts[b.sourceLevelId]-1]);bands[b.targetDifficulty]++;
}
assert.deepEqual(bands,{1:8,2:24});assert.equal(Object.keys(counts).length,8);assert(Object.values(counts).every(x=>x===4));
assert.equal(p.failedParents.find(x=>x.source===100).id,'0b79cb471b0bfe5c2e8a39699d682cd1bcc67d8c26eecf5a9a075bf026eee407');
const api=await loadV4StageContract();for(const d of [1,2]){const s=api.DAILY_CHALLENGE_V3_SLOTS.find(x=>x.stageKey==='basic-combined'&&x.difficulty===d&&x.slot===1);
 assert.deepEqual(p.staticSlots[d],{formalId:s.id,stageKey:s.stageKey,difficulty:s.difficulty,slot:s.slot,newestMechanism:s.newestMechanism});}
assert.equal(p.publicStocks.length,14759);assert.equal(p.ledgerSnapshot.roots.length,6);
assert(p.additionalHistoryReviews.length>=2);for(const d of p.additionalHistoryReviews){const a=await readBound(d,bindings);assert(/PASS$/.test(a.status));assert.deepEqual(a.errors,[]);mergeBindings(bindings,a.fileBindings);}
mergeBindings(bindings,p.bindings,q.fileBindings,api.bindings);await checkBindings(bindings);await checkLedgerSnapshot(p.ledgerSnapshot);
const rt=await loadV4Runtime();assert.deepEqual(prefixExecutionEnvironment(rt,p.executionEnvironment.descriptor),p.executionEnvironment);
const own='tools/daily-challenge/formal-v4/review-low-band-plan-root.mjs';bindings[own]=sha(await fs.readFile(own));
await write(output,{status:LOW_BAND_BATCH_REVIEW_STATUS,plan:pd,qualification:qr,recipeCount:32,plannedBands:bands,
 exactCurrentStaticSlotMetadata:true,oldMacroActualInputs:58,separateEarlyInputs:4,publicRequests:14759,
 errors:[],fileBindings:bindings,newConstructions:0,newSearches:0,newLedgerClaims:0,formalReady:false});
console.log(JSON.stringify({status:LOW_BAND_BATCH_REVIEW_STATUS,path:output,sha256:sha(await fs.readFile(output))}));
