import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {SELF,assertActiveRegionParentSequence} from './export-axis-ice-active-region-history-v3.mjs';
import {BATCH_PARENT_POLICY} from './active-region-batch-parent-overlay-v1.mjs';
import {assertCompleteBatchDisposition,describeBatchDisposition} from './axis-ice-active-region-batch-task-v2_1.mjs';
const T='tools/daily-challenge/formal-v4/',P='deliverables/daily-formal-v4-20261008/proof/',OUT=process.env.ACTIVE_REGION_EXPORT_V3_TEST_OUT;assert(OUT);await fs.mkdir(OUT,{recursive:false});
const bindings={},checks=[],sha=b=>createHash('sha256').update(b).digest('hex');
async function read(p){const b=await fs.readFile(p);bindings[p]=sha(b);return b;}
async function save(n,q){const p=OUT+'/'+n,b=JSON.stringify(q,null,2)+'\n';await fs.writeFile(p,b,{flag:'wx'});bindings[p]=sha(b);}
const original={path:P+'active-region-fixed64-metadata-private-02/report.json',sha256:'7299ba70d771906efe0a230a85d2497d501711e801e288c4e8db0f778df44e37'},base=P+'active-region-fixed64-metadata-private-02/',report=JSON.parse(await read(original.path));assert.equal(bindings[original.path],original.sha256);
async function oldBytes(p){const b=await read(p);assert.equal(sha(b),report.fileBindings[p],'Saved original private evidence differs: '+p);return b;}
const chain=JSON.parse(await oldBytes(base+'chain/report.json')),events=chain.events;assert.equal(events.length,2);
const qs=await Promise.all(events.map(async e=>JSON.parse(await oldBytes(e.receipt.path)))),e=events[0].parent;
const seeds=[{sourceLevelId:e.sourceLevelId,namespace:e.namespace,request:{id:e.attemptId,startedAt:e.startedAt},receipt:{accepted:false,sourceLevelId:e.sourceLevelId,level:qs[1].level},evidence:e}];
const p={parentResolutionPolicy:BATCH_PARENT_POLICY,initialFailedParents:[e],recipes:qs.map(q=>({recipe:{recipeId:q.recipeId,sourceLevelId:q.sourceLevelId},initialFailedParent:e,parentResolutionPolicy:BATCH_PARENT_POLICY}))};
const owned=new Map();for(const row of events){const n=row.newParent;for(const d of [row.receipt,n.request,n.result,n.identity,n.sidecar,...n.blocked])owned.set(d.path,d);}
const args={p,qs,receipts:events.map(e=>e.receipt),seeds,scope:{baseDirectory:process.cwd(),roots:[]},ownerFiles:[...owned.values()],publicLedger:e.namespace,readBytes:oldBytes};

test('saved same-source mathematical failures reauthenticate in order from original owner descriptors',async()=>{
 const q=await assertActiveRegionParentSequence(args);assert.equal(q.report.committedInputs,2);assert(q.report.events.every(e=>e.advanced));assert.deepEqual(q.report.events,chain.events);assert.equal(q.report.historyStateMutated,false);assert.equal(q.report.dynamicRecipesAdded,0);await save('original-parent-chain.json',{original,report:q.report,fileBindings:q.fileBindings,newPublicationFiles:0});checks.push({name:'original-two-failure-parent-chain',pass:true});
});

test('forged candidate SHA, wrong owner SHA and omitted blocked owner entry reject',async()=>{
 const rows=[];const badReceipt=structuredClone(args.receipts);badReceipt[0].sha256='0'.repeat(64);await assert.rejects(()=>assertActiveRegionParentSequence({...args,receipts:badReceipt}),/Candidate descriptor/);rows.push('candidate-sha');
 const wrongOwner=structuredClone(args.ownerFiles);wrongOwner.find(d=>d.path===args.receipts[0].path).sha256='0'.repeat(64);await assert.rejects(()=>assertActiveRegionParentSequence({...args,ownerFiles:wrongOwner}),/Candidate descriptor/);rows.push('candidate-owner-sha');
 const missing=args.ownerFiles.filter(d=>d.path!==events[0].newParent.blocked[1].path);await assert.rejects(()=>assertActiveRegionParentSequence({...args,ownerFiles:missing}),/original mathematical owner/);rows.push('blocked-owner-missing');
 const badResult=structuredClone(args.ownerFiles);badResult.find(d=>d.path===events[0].newParent.result.path).sha256='0'.repeat(64);await assert.rejects(()=>assertActiveRegionParentSequence({...args,ownerFiles:badResult}),/evidence bytes differ/);rows.push('publication-owner-sha');
 await save('wrong-evidence-rejections.json',{rejected:rows,newPublicationFiles:0});checks.push({name:'owner-and-exact-descriptor-rejections',pass:true,count:rows.length});
});

test('interrupted actual cannot enter the exporter normal closure gate',async()=>{
 const partial=describeBatchDisposition(p.recipes.map(r=>r.recipe),1,[0],'private IO boundary');assert.throws(()=>assertCompleteBatchDisposition(partial),/Interrupted/);const complete=describeBatchDisposition(p.recipes.map(r=>r.recipe),2,[0,1],null);assertCompleteBatchDisposition(complete);
 const source=(await read(SELF)).toString();assert(source.includes('api.assertCompleteBatchDisposition(done.disposition);'));assert(source.indexOf('api.assertCompleteBatchDisposition(done.disposition);')<source.indexOf('const initialListing=await listing();'));await save('interrupted-closure.json',{partial,complete,normalGateBeforeHistoryLoad:true,newHistoryLoads:0});checks.push({name:'interrupted-export-rejected',pass:true});
});

test.after(async()=>{const testPath=T+'export-axis-ice-active-region-history-v3.test.mjs',b=await build({entryPoints:[SELF,testPath],bundle:true,packages:'external',write:false,metafile:true,outdir:'unused-export-metadata',platform:'node',format:'esm',logLevel:'silent'}),toolBindings={};for(const p of Object.keys(b.metafile.inputs))toolBindings[p]=sha(await read(p));await save('report.json',{status:checks.length===3?'ACTIVE_REGION_HISTORY_EXPORT_V3_METADATA_PASS':'ACTIVE_REGION_HISTORY_EXPORT_V3_METADATA_INCOMPLETE',checks,original,toolBindings,fileBindings:{...bindings},newHistoryLoads:0,newConstructions:0,newDomains:0,newModels:0,newReplays:0,newSearches:0,newClaims:0,newOwnerOrPublicationFiles:0,actualExportCalled:false,oldEvidenceUnchanged:true});});
