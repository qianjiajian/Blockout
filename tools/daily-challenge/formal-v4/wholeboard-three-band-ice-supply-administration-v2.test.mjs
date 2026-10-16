// New checkpoint06 administration metadata tests; no production entry point.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import * as b from './build-wholeboard-three-band-ice-supply-metadata-v2.mjs';
import * as e from './export-wholeboard-three-band-ice-supply-history-v2.mjs';
import * as api from './wholeboard-three-band-ice-supply-batch-task-v2.mjs';
import {checkpoint06MetadataFixture} from './wholeboard-three-band-ice-supply-batch-v2.metadata.test.mjs';
const V='deliverables/daily-formal-v4-20261008/',T='tools/daily-challenge/formal-v4/',SELF=T+'wholeboard-three-band-ice-supply-administration-v2.test.mjs';
const out=process.argv[2];assert(out?.startsWith(V+'proof/wholeboard-three-band-ice-administration-v2-private-'));assert.equal(path.basename(process.cwd()),'frozen-workspace-4588');await fs.mkdir(out);
const sha=x=>createHash('sha256').update(x).digest('hex'),clone=structuredClone,bytes=x=>Buffer.from(JSON.stringify(x,null,2)+'\n'),d=n=>({path:'__synthetic_administration06_only__/'+n+'.json',sha256:sha(n)}),bindings={},tests=[],errors=[];
async function read(p,h){const q=await fs.readFile(p);bindings[p]=sha(q);if(h)assert.equal(bindings[p],h,p);return q;}
async function json(p,h){return JSON.parse(await read(p,h));}
async function run(name,fn){try{tests.push({name,pass:true,facts:await fn()});}catch(e){tests.push({name,pass:false,error:e.stack});errors.push(name+': '+e.message);}}
const oldBuilder={path:T+'build-wholeboard-three-band-ice-supply-metadata-v1.mjs',sha256:'bac0210cce91b82a41da430a30d3999969bd01ba67ddeaee5af063ed6cb6356c'},oldExporter={path:T+'export-wholeboard-three-band-ice-supply-history-v1.mjs',sha256:'47f5abde28c32949f7a0127551e4e2e9f45aae16ceef1724d80f88231f32d7e0'},oldReport={path:V+'proof/wholeboard-three-band-ice-administration-private-01/report.json',sha256:'f796e66fc18528ee85b7acc6d1cc31b670a22e0fe9b2adedc4444b68fcd36580'};
let originalReview,scope,draft,taskDescriptor;
function fixture(){
 const f=checkpoint06MetadataFixture(originalReview,scope),p=f.prior;
 p.selection=clone(b.SELECTION);p.before={closedCampaigns:3};Object.assign(p.summary,{consumedInputs:1,maximumInputs:1});p.candidateStatuses=[{sourceLevelId:118}];p.unpersistedInputs=[];p.persistedConstructionWorldFiles=[d('already-saved-original-full')];
 Object.assign(p.futureParents,{requestedSourceLevelIds:[115,118,124],newHistoryTraversal:false,newModelCalls:0,newSearches:0,mathematicalProofRevalidated:false,unresolved:[],resolved:b.SOURCE_IDS.map(sourceLevelId=>({sourceLevelId,status:'RESOLVED_ORIGINAL_FAILED_PARENT',receipt:d('receipt'+sourceLevelId),attemptId:sha('attempt'+sourceLevelId),namespace:'__synthetic_no_ledger__',startedAt:'2026-10-10T00:00:00.000Z',blocked:[d('origin'+sourceLevelId),d('retry'+sourceLevelId)],readDirectHistoryRolePassed:true,mathematicalProofRevalidated:false}))});
 f.priorDescriptor.sha256=sha(bytes(p));
 for(const q of[f.review,f.author,f.provenance])q.latestHistoryReport=clone(f.priorDescriptor);
 f.provenance.selection=clone(p.selection);f.author.fileBindings[f.priorDescriptor.path]=f.priorDescriptor.sha256;
 f.author.provenance.sha256=sha(bytes(f.provenance));f.review.provenance=clone(f.author.provenance);f.review.fileBindings[f.review.provenance.path]=f.review.provenance.sha256;
 f.review.authorReport.sha256=sha(bytes(f.author));f.review.fileBindings[f.review.authorReport.path]=f.review.authorReport.sha256;f.review.fileBindings[f.priorDescriptor.path]=f.priorDescriptor.sha256;f.reviewDescriptor.sha256=sha(bytes(f.review));return f;
}
const execution=f=>api.composeCheckpoint06History(f.priorDescriptor,f.prior,f.reviewDescriptor,f.review,f.author,f.provenance,f.originalReview);
const compose=f=>b.composeIceSupplyProposal(draft,d('source-draft'),b.QUALIFICATION_PIN,taskDescriptor,f.priorDescriptor,f.prior,execution(f));
try{
 const old=await json(oldReport.path,oldReport.sha256);assert.deepEqual(old.errors,[]);assert.equal(old.tests.length,8);assert(old.tests.every(t=>t.pass));await read(oldBuilder.path,oldBuilder.sha256);await read(oldExporter.path,oldExporter.sha256);
 const qual=await json(b.QUALIFICATION_PIN.path,b.QUALIFICATION_PIN.sha256);assert.equal(qual.status,api.QUALIFICATION_STATUS);assert.deepEqual(qual.errors,[]);taskDescriptor={path:api.SELF,sha256:b.TASK_SHA};await read(api.SELF,b.TASK_SHA);assert.equal(qual.toolBindings[api.SELF],b.TASK_SHA);
 originalReview=await json(api.ORIGINAL_CHECKPOINT05_REVIEW.path,api.ORIGINAL_CHECKPOINT05_REVIEW.sha256);scope=(await json(V+'proof/wholeboard-ice-twentyfour-history-delta-01/report.json')).historyScope;
 draft=await json(V+'design/wholeboard-three-band-ice-seventytwo-draft-01/proposal.json','24216ac9a9b3b9ff5d4ecc6d1eb847d1aaf2f66eb651b8906d1b349c1dff36fe');api.assertIceSupplyProposal(draft,72);
 await run('proposal/context preserve original report and exact recipes while executing06 with zero old deltas',()=>{
  const f=fixture(),snapshot=clone(f),originalDraft=clone(draft),proposal=compose(f),pd=d('proposal'),review={status:api.PROPOSAL_REVIEW_STATUS,proposal:pd,errors:[],newConstructions:0,newSearches:0,newClaims:0},c=b.composeIceSupplyContext(proposal,pd,review,d('review'));
  assert.deepEqual(f,snapshot);assert.deepEqual(draft,originalDraft);assert.deepEqual(proposal.recipes,draft.recipes);assert.deepEqual(c.historyDeltas,[]);assert.equal(c.historyHeadSha256,f.review.checkpoint.sha256);assert.notEqual(c.historyHeadSha256,f.prior.headSha256);assert.deepEqual(c.priorHistoryReport,f.priorDescriptor);assert.deepEqual(proposal.historyResealReview,f.reviewDescriptor);assert.deepEqual(proposal.exportedFailedParents,f.prior.futureParents.resolved);assert.deepEqual(c.failedParents,f.prior.futureParents.resolved.map(r=>({sourceLevelId:r.sourceLevelId,receipt:r.receipt})));api.assertCheckpoint06Bridge(c,f.prior,f.review,f.author,f.provenance,f.originalReview);return{recipesPreserved:72,sourceDeltasPreserved:4,executionDeltas:0};
 });
 await run('source chain/source-parent authority still refuses omission/reorder/new-head substitution',()=>{
  const changes=[f=>f.prior.completeHistoryDeltas.reverse(),f=>f.prior.completeHistoryDeltas.pop(),f=>f.prior.futureParents.resolved.pop(),f=>f.prior.futureParents.resolved[0].blocked.pop(),f=>f.prior.futureParents.historyHeadSha256=f.review.checkpoint.sha256,f=>f.prior.checkpoint=f.review.checkpoint,f=>f.prior.summary.consumedInputs=72];for(const change of changes){const f=fixture();change(f);assert.throws(()=>compose(f));}return{refusals:changes.length};
 });
 await run('execution overlay rejects source deltas/old head/rogue fields and context review mismatch',()=>{
  const f=fixture(),h=execution(f),mutations=[x=>x.historyDeltas=f.prior.completeHistoryDeltas,x=>x.historyHeadSha256=f.prior.headSha256,x=>x.historyBridge.sourceHeadSha256=sha('bad'),x=>x.historyScope={roots:[]},x=>x.failedParents=[]];for(const change of mutations){const wrong=clone(h);change(wrong);assert.throws(()=>b.composeIceSupplyProposal(draft,d('draft'),b.QUALIFICATION_PIN,taskDescriptor,f.priorDescriptor,f.prior,wrong));}
  const p=compose(f);p.historyResealReview=d('wrong-review');assert.throws(()=>b.composeIceSupplyContext(p,d('p'),{},d('r')));return{refusals:mutations.length+1};
 });
 await run('minimum21 exact holds preserve old16 and historical prior disposition remains unchanged',async()=>{
  const minimum=await json(api.HOLDS.path,api.HOLDS.sha256),prior=await json(api.PRIOR_HOLDS.path,api.PRIOR_HOLDS.sha256);assert.equal(prior.decisions.length,16);assert.deepEqual(minimum.decisions.slice(0,16),prior.decisions);b.assertDispositionMetadata(minimum,minimum);for(const mutate of[x=>{x.decisions.pop();x.heldCandidateCount--;},x=>x.decisions[20].formalAdoptionAllowed=true,x=>x.remainingAutomaticallyDesignApproved=true]){const bad=clone(minimum);mutate(bad);assert.throws(()=>b.assertDispositionMetadata(bad,minimum));}const f=fixture(),p=compose(f);assert.deepEqual(p.designDisposition,api.HOLDS);assert.notDeepEqual(f.provenance.designDisposition,p.designDisposition);return{minimum:21,preservedPrefix:16};
 });
 await run('v1 original-owner/parent/candidate/frozen-map transports byte-identical; only history entry changes',async()=>{
  const now=String(await read(e.SELF)),before=String(await read(oldExporter.path,oldExporter.sha256)),newB=String(await read(b.SELF)),oldB=String(await read(oldBuilder.path,oldBuilder.sha256));
  const tail=s=>s.slice(s.indexOf('const desc=d=>'),s.indexOf('\nif(process.argv[1]',s.indexOf('const desc=d=>')));assert.equal(tail(now),tail(before));
  const fn=(s,a,z)=>s.slice(s.indexOf(a),s.indexOf(z,s.indexOf(a)));assert.equal(fn(newB,'export function inheritPostN20History(', '\nexport function composeIceSupplyProposal('),fn(oldB,'export function inheritPostN20History(', '\nexport function composeIceSupplyProposal('));assert.equal(fn(newB,'export function assertParentPublicationDeclaration(', '\nasync function bindInputs('),fn(oldB,'export function assertParentPublicationDeclaration(', '\nasync function bindInputs('));
  assert(now.includes('api.readCheckpoint06Bridge('));assert(now.includes('sourceOrderedDeltas:prior.completeHistoryDeltas'));assert(now.includes('assert.deepEqual(ctx.historyDeltas,[])'));assert(now.includes('assert.equal(prior.futureParents.historyHeadSha256,prior.headSha256)'));assert(now.includes("const {PUBLIC_LEDGER}=await load(T+'low-twenty-io.mjs')"));assert(now.includes('assert.deepEqual(q.designDisposition,ctx.designDisposition)'));return{entireTransportTailEqual:true,originalParentDeclarationEqual:true,rawAndCertificateRecheckedByUnchangedFunctions:true,oldEightMetadataGroupsNotRerun:true};
 });
}catch(e){errors.push(e.stack??String(e));}
const closure=await build({entryPoints:[SELF,b.SELF,e.SELF],bundle:true,packages:'external',write:false,metafile:true,outdir:'unused-administration06-metadata',platform:'node',format:'esm',logLevel:'silent'}),toolBindings={};for(const p of Object.keys(closure.metafile.inputs))toolBindings[p]=sha(await read(p));for(const[p,h]of Object.entries(bindings))assert.equal(sha(await fs.readFile(p)),h,p);
const report={schemaVersion:1,status:errors.length?'THREE_BAND_ICE_ADMINISTRATION_V2_METADATA_FAIL':'THREE_BAND_ICE_ADMINISTRATION_V2_METADATA_PASS',tests,errors,bindingBaseDirectory:process.cwd(),task:taskDescriptor,qualification:b.QUALIFICATION_PIN,builder:{path:b.SELF,sha256:bindings[b.SELF]},exporter:{path:e.SELF,sha256:bindings[e.SELF]},test:{path:SELF,sha256:bindings[SELF]},priorMetadataEvidence:oldReport,toolBindings,fileBindings:bindings,newHistoryLoads:0,newHistoryMerges:0,newDomains:0,newFullWorlds:0,newModels:0,newSearches:0,newReplayCalls:0,newClaims:0,actualBuilderCalled:false,actualExporterCalled:false,actualCheckpoint06Read:false,actualPostN20Supplied:false,oldEightMetadataGroupsRerun:false,originalTinyMathReexecuted:false,actualDeclaredRecipeDraftReadOnly:true,newRecipeSeedsGenerated:false,oldFilesChanged:false};const buffer=bytes(report);await fs.writeFile(out+'/report.json',buffer,{flag:'wx'});console.log(JSON.stringify({report:{path:out+'/report.json',sha256:sha(buffer)},tests:tests.length,errors}));assert.equal(errors.length,0);
