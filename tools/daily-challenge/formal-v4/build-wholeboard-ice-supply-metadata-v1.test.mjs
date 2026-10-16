/** Pure declaration regression; never invokes the filesystem builder or task. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {levelSha256} from '../formal-v2/contract.mjs';
import {boardBaselineSha256} from '../formal-v2/geometry.mjs';
import {SELF,DRAFT,QUALIFICATION,SELECTION,SOURCE_IDS,inheritPost31History,composeIceSupplyProposal,composeIceSupplyContext} from './build-wholeboard-ice-supply-metadata-v1.mjs';
import {PROPOSAL_REVIEW_STATUS,SELF as TASK,VERSION} from './wholeboard-ice-supply-batch-task-v1.mjs';
const TEST='tools/daily-challenge/formal-v4/build-wholeboard-ice-supply-metadata-v1.test.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex'),clone=structuredClone;
const d=n=>({path:'synthetic-metadata/'+n+'.json',sha256:sha(n)});
const delta=n=>({descriptor:d(n),declaredOwner:{id:n,namespace:'synthetic-metadata',kind:'construction',definition:d(n+'-owner')}});
function fixture(){const prior=[delta('old-a'),delta('old-b')],next=[delta('new-post-31-151')],head=next[0].descriptor.sha256;
 return{status:'NONAXIS_MAJOR_REGION_HISTORY_DELTAS_EXPORTED_AND_V6_VALIDATED',errors:[],headSha256:head,
  previousHeadSha256:prior.at(-1).descriptor.sha256,checkpoint:d('checkpoint'),checkpointReview:d('checkpoint-review'),
  checkpointReexported:false,oldFilesChanged:false,newConstructions:0,newSearches:0,newLedgerClaims:0,newReplayCalls:0,
  selection:clone(SELECTION),summary:{consumedInputs:2,maximumInputs:2},candidateStatuses:[{sourceLevelId:31},{sourceLevelId:151}],
  historyScope:{roots:Array.from({length:7},(_,i)=>({id:'root'+i,physicalPath:'synthetic-metadata/root'+i}))},
  priorHistoryDeltas:prior,historyDeltas:next,completeHistoryDeltas:[...prior,...next],
  comparisonEvidence:{provenance:d('comparison'),review:d('comparison-review'),authenticatedCurrentHead:'historical-value-not-current-head'},
  futureParents:{historyHeadSha256:head,requestedSourceLevelIds:[29,118,31,58,100,109,115,120,124],newHistoryTraversal:false,newModelCalls:0,newSearches:0,mathematicalProofRevalidated:false,
   resolved:SOURCE_IDS.map(sourceLevelId=>({sourceLevelId,status:'RESOLVED_ORIGINAL_FAILED_PARENT',receipt:d('receipt'+sourceLevelId),
    attemptId:sha('attempt'+sourceLevelId),startedAt:'2026-10-09T01:00:00.000Z',namespace:'synthetic-metadata',blocked:[d('attemptblocked'+sourceLevelId),d('identityblocked'+sourceLevelId)],readDirectHistoryRolePassed:true,mathematicalProofRevalidated:false})),unresolved:[]}};
}
const out=process.argv[2];assert(out,'New immutable evidence directory required');await fs.mkdir(out);
const rows=[],bindings={};async function bind(p,h){const b=await fs.readFile(p);bindings[p]=sha(b);if(h)assert.equal(bindings[p],h,p);return JSON.parse(b);}
async function test(name,fn){try{await fn();rows.push({name,pass:true});}catch(e){rows.push({name,pass:false,error:e.stack});}}
const draft=await bind(DRAFT.path,DRAFT.sha256);
await test('post-31-151 report preserves complete ordered chain, lexical parents, comparison descriptors only',()=>{const h=fixture(),{inherited,parents}=inheritPost31History(h);assert.deepEqual(inherited.historyDeltas,h.completeHistoryDeltas);assert.deepEqual(inherited.failedParents,parents.map(r=>({sourceLevelId:r.sourceLevelId,receipt:r.receipt})));assert.deepEqual(Object.keys(inherited.comparison),['provenance','review']);assert.equal(inherited.historyHeadSha256,h.headSha256);});
await test('missing/reordered/truncated history and non-post-31-151 facts refuse',()=>{for(const change of [h=>h.completeHistoryDeltas.reverse(),h=>h.completeHistoryDeltas.pop(),h=>h.headSha256=sha('wrong'),h=>h.previousHeadSha256=sha('wrong'),h=>h.summary.consumedInputs=1,h=>h.candidateStatuses[0].sourceLevelId=58,h=>h.oldFilesChanged=true]){const h=fixture();change(h);assert.throws(()=>inheritPost31History(h));}});
await test('missing, duplicate, wrong-head, unsealed or revalidated parent declarations refuse',()=>{for(const change of [h=>h.futureParents.resolved.pop(),h=>h.futureParents.resolved.push(h.futureParents.resolved[0]),h=>h.futureParents.historyHeadSha256=sha('wrong'),h=>h.futureParents.resolved[0].blocked.pop(),h=>h.futureParents.resolved[0].readDirectHistoryRolePassed=false,h=>h.futureParents.resolved[0].mathematicalProofRevalidated=true]){const h=fixture();change(h);assert.throws(()=>inheritPost31History(h));}});
await test('all 24 original recipe objects remain exact, with fixed source order and tool qualification',()=>{const p=composeIceSupplyProposal(draft,d('post-31-151-report'),fixture());assert.deepEqual(p.recipes,draft.recipes);assert.deepEqual(p.qualification,QUALIFICATION);assert.equal(p.executable,false);assert.equal(p.metadataPreparation.newFullWorlds,0);const wrong=clone(draft);[wrong.recipes[0],wrong.recipes[1]]=[wrong.recipes[1],wrong.recipes[0]];assert.throws(()=>composeIceSupplyProposal(wrong,d('post-31-151-report'),fixture()));});
await test('context requires exact external proposal review; current head and all deltas are inherited',()=>{const p=composeIceSupplyProposal(draft,d('post-31-151-report'),fixture()),pd=d('proposal'),rd=d('review'),r={status:PROPOSAL_REVIEW_STATUS,proposal:pd,errors:[],newConstructions:0,newSearches:0,newClaims:0};const c=composeIceSupplyContext(p,pd,r,rd);assert.equal(c.version,VERSION);assert.equal(c.maximumInputs,24);assert.equal(c.historyHeadSha256,fixture().headSha256);assert.deepEqual(c.historyDeltas,fixture().completeHistoryDeltas);assert.deepEqual(c.proposalReview,rd);for(const change of [x=>x.proposal=d('wrong'),x=>x.status='PASS',x=>x.newClaims=1,x=>x.errors=['bad']]){const bad=clone(r);change(bad);assert.throws(()=>composeIceSupplyContext(p,pd,bad,rd));}});
await test('24 fixed recipes bind three saved mainline rectangles, balanced profiles and finite original limits',async()=>{
 const catalogue=draft.recipes[0].source.catalogue,cat=await bind(catalogue.path,catalogue.sha256),seen=new Set();
 for(const [j,id]of SOURCE_IDS.entries()){const recipes=draft.recipes.filter(r=>r.sourceLevelId===id),row=cat.rows.find(r=>r.sourceLevelId===id);assert.equal(recipes.length,8);assert.equal(row.inventory.rectangularBoard,true);assert.equal(row.inventory.playableCells,row.width*row.height);assert.equal(row.level.seams?.length??0,0);assert.equal(levelSha256(row.level),row.sourceLevelSha256);const centre=[22,20,17][j];
  for(const r of recipes){assert.equal(r.source.levelSha256,row.sourceLevelSha256);assert.equal(r.source.maskSha256,row.maskSha256);assert.equal(r.source.boardBaselineSha256,boardBaselineSha256(row.level));assert.equal(r.source.playableCells,row.inventory.playableCells);assert(r.bodyCount>=centre-1&&r.bodyCount<=centre+1);assert.deepEqual(r.gateIceCounts,[7,10]);assert.equal(r.searchFloor,31);assert.equal(r.searchUpper,128);for(const k of ['seed','colourSeed']){assert(!seen.has(r[k]));seen.add(r[k]);}assert(!('level' in r));}
  for(const profile of ['bar-mix','axial-bars'])assert.equal(recipes.filter(r=>r.shapeProfile===profile).length,4);
 }
 assert.equal(seen.size,48);const qualification=await bind(QUALIFICATION.path,QUALIFICATION.sha256);assert.equal(qualification.toolBindings[TASK],bindings[TASK]??qualification.toolBindings[TASK]);assert.deepEqual(qualification.errors,[]);
});
const closure=await build({entryPoints:[SELF,TEST],bundle:true,packages:'external',write:false,metafile:true,outdir:'unused-ice-metadata-build',platform:'node',format:'esm',logLevel:'silent'});const toolBindings={};for(const p of Object.keys(closure.metafile.inputs)){const b=await fs.readFile(p);bindings[p]=sha(b);toolBindings[p]=sha(b);}
for(const p of [SELF,TEST,TASK])bindings[p]=sha(await fs.readFile(p));
const report={status:rows.every(r=>r.pass)?'ICE_SUPPLY_METADATA_BUILDER_PRIVATE_PASS':'ICE_SUPPLY_METADATA_BUILDER_PRIVATE_FAIL',tests:rows,fileBindings:bindings,toolBindings,
 scope:'Pure synthetic report/descriptor fields plus the original fixed 24 declaration; buildIceSupplyMetadata was not called.',newHistoryLoads:0,newHistoryMerges:0,newDomains:0,newFullWorlds:0,newModels:0,newSearches:0,newReplayCalls:0,newClaims:0,errors:rows.filter(r=>!r.pass)};
for(const[p,h]of Object.entries(bindings))assert.equal(sha(await fs.readFile(p)),h,p);
const b=Buffer.from(JSON.stringify(report,null,2)+'\n');await fs.writeFile(out+'/report.json',b,{flag:'wx'});console.log(JSON.stringify({report:{path:out+'/report.json',sha256:sha(b)},tests:rows.length,failures:report.errors.length}));if(report.errors.length)process.exitCode=1;
