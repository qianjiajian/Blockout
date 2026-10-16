/** Pure declaration regression; never invokes the filesystem builder or task. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {SELF,DRAFT,QUALIFICATION,SELECTION,SOURCE_IDS,inheritPostTwoHistory,composePlainSupplyProposal,composePlainSupplyContext} from './build-wholeboard-plain-supply-metadata-v1.mjs';
import {PROPOSAL_REVIEW_STATUS,SELF as TASK,VERSION} from './wholeboard-plain-supply-batch-task-v1.mjs';
const TEST='tools/daily-challenge/formal-v4/build-wholeboard-plain-supply-metadata-v1.test.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex'),clone=structuredClone;
const d=n=>({path:'synthetic-metadata/'+n+'.json',sha256:sha(n)});
const delta=n=>({descriptor:d(n),declaredOwner:{id:n,namespace:'synthetic-metadata',kind:'construction',definition:d(n+'-owner')}});
function fixture(){const prior=[delta('old-a'),delta('old-b')],next=[delta('new-post-two')],head=next[0].descriptor.sha256;
 return{status:'NONAXIS_MAJOR_REGION_HISTORY_DELTAS_EXPORTED_AND_V6_VALIDATED',errors:[],headSha256:head,
  previousHeadSha256:prior.at(-1).descriptor.sha256,checkpoint:d('checkpoint'),checkpointReview:d('checkpoint-review'),
  checkpointReexported:false,oldFilesChanged:false,newConstructions:0,newSearches:0,newLedgerClaims:0,newReplayCalls:0,
  selection:clone(SELECTION),summary:{consumedInputs:2,maximumInputs:2},candidateStatuses:[{sourceLevelId:115},{sourceLevelId:100}],
  historyScope:{roots:Array.from({length:7},(_,i)=>({id:'root'+i,physicalPath:'synthetic-metadata/root'+i}))},
  priorHistoryDeltas:prior,historyDeltas:next,completeHistoryDeltas:[...prior,...next],
  comparisonEvidence:{provenance:d('comparison'),review:d('comparison-review'),authenticatedCurrentHead:'historical-value-not-current-head'},
  futureParents:{historyHeadSha256:head,requestedSourceLevelIds:[58,100,109,115,120,124],newHistoryTraversal:false,newModelCalls:0,newSearches:0,mathematicalProofRevalidated:false,
   resolved:SOURCE_IDS.map(sourceLevelId=>({sourceLevelId,status:'RESOLVED_ORIGINAL_FAILED_PARENT',receipt:d('receipt'+sourceLevelId),
    attemptId:sha('attempt'+sourceLevelId),startedAt:'2026-10-09T01:00:00.000Z',namespace:'synthetic-metadata',blocked:[d('attemptblocked'+sourceLevelId),d('identityblocked'+sourceLevelId)],readDirectHistoryRolePassed:true,mathematicalProofRevalidated:false})),unresolved:[]}};
}
const out=process.argv[2];assert(out,'New immutable evidence directory required');await fs.mkdir(out);
const rows=[],bindings={};async function bind(p,h){const b=await fs.readFile(p);bindings[p]=sha(b);if(h)assert.equal(bindings[p],h,p);return JSON.parse(b);}
async function test(name,fn){try{await fn();rows.push({name,pass:true});}catch(e){rows.push({name,pass:false,error:e.stack});}}
const draft=await bind(DRAFT.path,DRAFT.sha256);
await test('post-two report preserves complete ordered chain, lexical parents, comparison descriptors only',()=>{const h=fixture(),{inherited,parents}=inheritPostTwoHistory(h);assert.deepEqual(inherited.historyDeltas,h.completeHistoryDeltas);assert.deepEqual(inherited.failedParents,parents.map(r=>({sourceLevelId:r.sourceLevelId,receipt:r.receipt})));assert.deepEqual(Object.keys(inherited.comparison),['provenance','review']);assert.equal(inherited.historyHeadSha256,h.headSha256);});
await test('missing/reordered/truncated history and non-post-two facts refuse',()=>{for(const change of [h=>h.completeHistoryDeltas.reverse(),h=>h.completeHistoryDeltas.pop(),h=>h.headSha256=sha('wrong'),h=>h.previousHeadSha256=sha('wrong'),h=>h.summary.consumedInputs=1,h=>h.candidateStatuses[0].sourceLevelId=58,h=>h.oldFilesChanged=true]){const h=fixture();change(h);assert.throws(()=>inheritPostTwoHistory(h));}});
await test('missing, duplicate, wrong-head, unsealed or revalidated parent declarations refuse',()=>{for(const change of [h=>h.futureParents.resolved.pop(),h=>h.futureParents.resolved.push(h.futureParents.resolved[0]),h=>h.futureParents.historyHeadSha256=sha('wrong'),h=>h.futureParents.resolved[0].blocked.pop(),h=>h.futureParents.resolved[0].readDirectHistoryRolePassed=false,h=>h.futureParents.resolved[0].mathematicalProofRevalidated=true]){const h=fixture();change(h);assert.throws(()=>inheritPostTwoHistory(h));}});
await test('all 48 original recipe objects remain exact, with fixed source order and tool qualification',()=>{const p=composePlainSupplyProposal(draft,d('post-two-report'),fixture());assert.deepEqual(p.recipes,draft.recipes);assert.deepEqual(p.qualification,QUALIFICATION);assert.equal(p.executable,false);assert.equal(p.metadataPreparation.newFullWorlds,0);const wrong=clone(draft);[wrong.recipes[0],wrong.recipes[1]]=[wrong.recipes[1],wrong.recipes[0]];assert.throws(()=>composePlainSupplyProposal(wrong,d('post-two-report'),fixture()));});
await test('context requires exact external proposal review; current head and all deltas are inherited',()=>{const p=composePlainSupplyProposal(draft,d('post-two-report'),fixture()),pd=d('proposal'),rd=d('review'),r={status:PROPOSAL_REVIEW_STATUS,proposal:pd,errors:[],newConstructions:0,newSearches:0,newClaims:0};const c=composePlainSupplyContext(p,pd,r,rd);assert.equal(c.version,VERSION);assert.equal(c.maximumInputs,48);assert.equal(c.historyHeadSha256,fixture().headSha256);assert.deepEqual(c.historyDeltas,fixture().completeHistoryDeltas);assert.deepEqual(c.proposalReview,rd);for(const change of [x=>x.proposal=d('wrong'),x=>x.status='PASS',x=>x.newClaims=1,x=>x.errors=['bad']]){const bad=clone(r);change(bad);assert.throws(()=>composePlainSupplyContext(p,pd,bad,rd));}});
for(const p of [SELF,TEST,TASK])bindings[p]=sha(await fs.readFile(p));
const report={status:rows.every(r=>r.pass)?'PLAIN_SUPPLY_METADATA_BUILDER_PRIVATE_PASS':'PLAIN_SUPPLY_METADATA_BUILDER_PRIVATE_FAIL',tests:rows,fileBindings:bindings,
 scope:'Pure synthetic report/descriptor fields plus the original fixed 48 declaration; buildPlainSupplyMetadata was not called.',newHistoryLoads:0,newHistoryMerges:0,newDomains:0,newFullWorlds:0,newModels:0,newSearches:0,newReplayCalls:0,newClaims:0,errors:rows.filter(r=>!r.pass)};
const b=Buffer.from(JSON.stringify(report,null,2)+'\n');await fs.writeFile(out+'/report.json',b,{flag:'wx'});console.log(JSON.stringify({report:{path:out+'/report.json',sha256:sha(b)},tests:rows.length,failures:report.errors.length}));if(report.errors.length)process.exitCode=1;
