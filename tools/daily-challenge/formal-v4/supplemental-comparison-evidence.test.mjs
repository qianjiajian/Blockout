import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
import {levelSha256} from '../formal-v2/contract.mjs';
import {sha256,sealedWorldIdentity} from './sealed-history-contract.mjs';
import {consumePlanHistory,planHistorySummary,PLAN_HISTORY_VERSION,PLAN_HISTORY_REVIEW_STATUS,assertPlanHistoryMembers} from './plan-history-adapter-v5.mjs';
import {SUPPLEMENT_VERSION,SUPPLEMENT_REVIEW_STATUS} from './supplemental-failed-parent-evidence.mjs';
import {readSupplementalComparisonEvidence as compare,COMPARISON_REVIEW_STATUS} from './supplemental-comparison-evidence.mjs';
const out=process.env.SUPPLEMENTAL_COMPARISON_TEST_OUT;assert(out);await fs.mkdir(out,{recursive:false});const passed=[];
function fixture(){
 const bytes=new Map(),scope={baseDirectory:'C:/snapshot',roots:['public','late','reverse','vacancy','capacity','early','earlyPrefix'].map(id=>({id,physicalPath:'C:/shared/'+id,aliases:[]}))};
 const bundle={version:PLAN_HISTORY_VERSION,scope,baselinePlan:{path:'p.json',sha256:sha256('p')},baselineActual:{path:'a.json',sha256:sha256('a')},publicNamespace:'c:/shared/public',files:[],archivedBindings:{},publicStocks:[],nearPools:{selected:[],old450:[],history:[]},terminalRecords:[],externalPrivate:[],retired:[],legacyReferences:[],closedCampaigns:[],closedExperimentIds:[],oldLiveByteIntegrityClaimed:false};
 const doc=(p,q)=>{const b=Buffer.from(JSON.stringify(q));bytes.set(p,b);return{path:p,sha256:sha256(b)};};
 const put=(p,q)=>{const d=doc(p,q);bundle.files.push({...d,rootId:'public',aliases:[p]});bundle.archivedBindings[p]=d.sha256;return d;};
 const board=colour=>({id:7,width:2,height:1,blocks:[{id:'a',x:0,y:0,shape:[[0,0]],color:colour},{id:'b',x:1,y:0,shape:[[0,0]],color:'blue'}],gates:[]});
 const level=board('red'),fp=sealedWorldIdentity(level),ns=bundle.publicNamespace;
 const request={id:fp.designSha256,levelSha256:fp.levelSha256,shapeSha256:fp.shapeSha256,colorSha256:fp.colorSha256,colorAssignments:fp.colorAssignments,designSha256:fp.designSha256,retryIdentitySha256:fp.retryIdentitySha256,redesignOf:null};
 const proof={status:'unknown',termination:'synthetic-only'},result={accepted:false,status:'NEW_REFINED_INPUT_NOT_ACCEPTED',levelSha256:fp.levelSha256,lower:proof};
 const terminal={namespace:ns,kind:'mathematical',request:{descriptor:put(ns+'/'+request.id+'.request.json',request),value:request},result:{descriptor:put(ns+'/'+request.id+'.result.json',result),value:result},blocked:[],lock:null};
 for(const p of [ns+'/'+request.id+'.blocked.json',ns+'/identities/'+fp.retryIdentitySha256+'.blocked.json']){const value={attemptId:request.id,status:result.status};terminal.blocked.push({descriptor:put(p,value),value});}
 bundle.terminalRecords.push(terminal);bundle.publicStocks.push({...request,...terminal.request.descriptor});
 bundle.baselineFields={publicStocks:structuredClone(bundle.publicStocks),previousLateStocks:[],previousMacro:[],comparisonOnly:[],selected:[],old450:[],terminalHistory:[],closedExperimentIds:[]};
 const originalValue={level:board('green'),levelSha256:levelSha256(board('green')),provenance:{seed:7}},original=doc('C:/evidence/original.json',originalValue);
 const inspection=doc('C:/evidence/inspection.json',{selected:[{path:original.path,sha256:original.sha256,sourceLevelId:7,levelSha256:originalValue.levelSha256}]});
 const prior={originalCandidate:original,inspection,originalProvenance:originalValue.provenance};
 const seed=doc('C:/evidence/seed.json',{sourceLevelId:7,level:originalValue.level,levelSha256:originalValue.levelSha256,provenance:prior});
 const seedIndex=doc('C:/evidence/index.json',{files:[seed.path]});
 const packet={accepted:false,status:result.status,sourceLevelId:7,level,levelSha256:fp.levelSha256,attempt:request,proof,
  provenance:{input:seed.path,inputFileSha256:seed.sha256,inputLevelSha256:originalValue.levelSha256,importedReference:seedIndex.path,priorWholeBoardConstruction:prior}};
 const receipt=doc('C:/evidence/packet.json',packet),batchReport=doc('C:/evidence/batch.json',{status:'FINITE_NEARBAND_BATCH_FINISHED',rows:[{path:receipt.path,sourceLevelId:7,accepted:false}]});
 const readBytes=async p=>{assert(bytes.has(p),p);return bytes.get(p);};
 const prepare=async()=>{const checkpoint=doc('checkpoint.json',bundle),checkpointReview=doc('checkpoint-review.json',{status:PLAN_HISTORY_REVIEW_STATUS,checkpoint,summary:planHistorySummary(bundle),errors:[],newSearches:0,newConstructions:0,newLedgerClaims:0,oldLiveByteIntegrityClaimed:false});
  const state=await consumePlanHistory({checkpoint,review:checkpointReview,expectedScope:scope,readBytes});
  const record={version:SUPPLEMENT_VERSION,role:'failed-parent',qualificationOnly:true,checkpoint,sealedHeadSha256:checkpoint.sha256,sourceLevelId:7,namespace:ns,attemptId:request.id,receipt,request:terminal.request.descriptor,result:terminal.result.descriptor,blocked:terminal.blocked.map(b=>b.descriptor),creation:{batchReport,seed,seedIndex,originalCandidate:original,inspection},newSearches:0,newConstructions:0,newLedgerClaims:0};
  const seal=record=>{const sd=doc('supplement.json',record),review=doc('supplement-review.json',{status:SUPPLEMENT_REVIEW_STATUS,qualificationOnly:true,allowedRoles:['failed-parent'],checkpoint,reviewedHeadSha256:checkpoint.sha256,supplements:[sd],errors:[],newSearches:0,newConstructions:0,newLedgerClaims:0});return{supplements:[sd],review,readBytes,qualificationOnly:true};};
  return{state,record,args:seal(record),seal};};
 return{bytes,bundle,scope,doc,readBytes,prepare,level,packet,receipt,terminal,request};
}
async function setup({descendant=true}={}){
 const f=fixture(),pre=await f.prepare(),originalSupplement=f.doc('original-supplement.json',pre.record);
 const originalReview=f.doc('original-review.json',{status:SUPPLEMENT_REVIEW_STATUS,qualificationOnly:true,allowedRoles:['failed-parent'],checkpoint:pre.state.historyDescriptor,reviewedHeadSha256:pre.state.headSha256,supplements:[originalSupplement],errors:[],newSearches:0,newConstructions:0,newLedgerClaims:0});
 const currentCheckpoint={path:'checkpoint04.json',sha256:sha256('synthetic-reviewed-checkpoint04')},record={...pre.record,checkpoint:currentCheckpoint,sealedHeadSha256:currentCheckpoint.sha256},supplement=f.doc('supplement04.json',record);
 const review04=f.doc('review04.json',{status:SUPPLEMENT_REVIEW_STATUS,qualificationOnly:true,allowedRoles:['failed-parent'],checkpoint:currentCheckpoint,reviewedHeadSha256:currentCheckpoint.sha256,supplements:[supplement],originalReview,errors:[],newSearches:0,newConstructions:0,newLedgerClaims:0});
 const row={sourceLevelId:7,namespace:record.namespace,attemptId:record.attemptId,supplement,receipt:record.receipt,request:structuredClone(f.terminal.request),result:structuredClone(f.terminal.result),blocked:structuredClone(f.terminal.blocked),creation:record.creation,originalReceiptProvenance:f.packet.provenance,level:f.level,fingerprints:sealedWorldIdentity(f.level),reference:record.creation.seed,origin:'reviewed-supplemental-original-failed-packet'};
 const baseHeadSha256=sha256('sealed-prebatch-head'),supplementalHistoryEvidence={version:SUPPLEMENT_VERSION,supplements:[supplement],review:review04,baseHeadSha256,viewSha256:levelSha256({head:baseHeadSha256,supplements:[supplement],review:review04}),allowedRoles:['failed-parent'],qualificationOnly:true,addedHistoricalFullWorlds:1,addedHistoricalEvidenceFiles:1,newSearches:0,newConstructions:0,newLedgerClaims:0,oldLiveByteIntegrityClaimed:false,reviewedProjectionExcludesSupplement:true};
 const raw={version:'prebatch-supplemental-failed-parent-provenance-v1',checkpoint:currentCheckpoint,review:review04,sealedPreBatchHeadSha256:baseHeadSha256,supplementalHistoryEvidence,rows:[row],role:'failed-parent-at-sealed-prebatch-head-only',postBatchLatestParentClaimed:false,referenceUseAllowed:false,mathematicalProofRevalidated:false,oldLiveByteIntegrityClaimed:false,mergedIntoDeltaFiles:false,mergedIntoSealedComparisonPools:false,futureComparisonOnlyConsumerRequired:true,newFullWorlds:0,newClaims:0,newSearches:0,newConstructions:0,newLedgerClaims:0};
 // A genuinely sealed, different FAILED child exists in the current synthetic
 // checkpoint. The original role reader would call this parent stale.
 if(descendant){const level={...structuredClone(f.level),blocks:[{id:'new',x:0,y:0,shape:[[0,0],[1,0]],color:'yellow'}]},fp=sealedWorldIdentity(level),ns=f.bundle.publicNamespace;
  const request={...fp,id:fp.designSha256,redesignOf:f.request.id},put=(p,value)=>{const descriptor=f.doc(p,value);f.bundle.files.push({...descriptor,rootId:'public',aliases:[p]});f.bundle.archivedBindings[p]=descriptor.sha256;return{descriptor,value};};
  const result={accepted:false,status:'CHILD_FAILED',levelSha256:fp.levelSha256,lower:{status:'unknown'}},terminal={kind:'mathematical',namespace:ns,request:put(ns+'/'+request.id+'.request.json',request),result:put(ns+'/'+request.id+'.result.json',result),blocked:[],lock:null};
  for(const p of [ns+'/'+request.id+'.blocked.json',ns+'/identities/'+fp.retryIdentitySha256+'.blocked.json'])terminal.blocked.push(put(p,{attemptId:request.id,status:result.status}));
  f.bundle.terminalRecords.push(terminal);f.bundle.publicStocks.push({...request,...terminal.request.descriptor});}
 const checkpoint=f.doc('current-checkpoint.json',f.bundle),checkpointReview=f.doc('current-review.json',{status:PLAN_HISTORY_REVIEW_STATUS,checkpoint,summary:planHistorySummary(f.bundle),errors:[],newSearches:0,newConstructions:0,newLedgerClaims:0,oldLiveByteIntegrityClaimed:false});
 const state=await consumePlanHistory({checkpoint,review:checkpointReview,expectedScope:f.scope,readBytes:f.readBytes});
 const seal=(value=raw)=>{const provenance=f.doc('provenance.json',value),review=f.doc('comparison-review.json',{status:COMPARISON_REVIEW_STATUS,provenance,supplementalReview:value.review,facts:value.rows.map(r=>({sourceLevelId:r.sourceLevelId,namespace:r.namespace,attemptId:r.attemptId,receipt:r.receipt,levelSha256:r.fingerprints.levelSha256,fingerprints:r.fingerprints})),allowedRoles:['comparison-only'],qualificationOnly:true,failedParentAuthorization:false,referenceAuthorization:false,errors:[],newSearches:0,newConstructions:0,newLedgerClaims:0});return{provenance,review,readBytes:f.readBytes,qualificationOnly:true};};
 return{...f,state,raw,seal,args:seal()};
}
test('sealed failed descendant remains present; comparison view grants no role or mutable history',async()=>{
 const f=await setup(),before=JSON.stringify(f.state),got=await compare(f.state,f.args);assert.equal(JSON.stringify(f.state),before);assert.equal(f.state.bundle.terminalRecords.length,2);assert(!('state'in got)&&!('parents'in got));
 assert.equal(got.comparisonOnly,true);assert.equal(got.comparisonEvidence.failedParentAuthorization,false);assert.equal(got.comparisonEvidence.referenceAuthorization,false);assert.equal(got.comparisonEvidence.authenticatedCurrentHeadSha256,f.state.headSha256);assert.notEqual(f.state.headSha256,f.raw.sealedPreBatchHeadSha256);
 assert.equal(got.comparisonView.nearPools.history.length,1);assert.strictEqual(got.comparisonView.nearPools.selected,f.state.nearPools.selected);assert.equal(got.comparisonView.externalEvidenceFiles[0].rootId,null);assert.equal(got.comparisonEvidence.newOwnerFiles,false);assert.equal(got.comparisonEvidence.newClaims,0);
 const listing=Object.fromEntries(f.scope.roots.map(r=>[r.id,f.bundle.files.filter(x=>x.rootId===r.id).map(x=>x.path)]));assertPlanHistoryMembers(f.state,listing);
 passed.push('current-failed-descendant-preserved-comparison-only');
});
test('parent/reference roles, reapplication and same exact receipt conflicts are rejected',async()=>{
 const f=await setup(),got=await compare(f.state,f.args);
 for(const role of ['reference','failed-parent'])await assert.rejects(compare(f.state,{...f.args,role}),/Comparison only/);
 await assert.rejects(compare(got.comparisonView,f.args),/Authenticated/);
 const duplicate={...f.state,nearPools:got.comparisonView.nearPools};await assert.rejects(compare(duplicate,f.args),/duplicate application/);
 const bad=structuredClone(got.comparisonView.nearPools);bad.history[0].level.blocks[0].color='pink';await assert.rejects(compare({...f.state,nearPools:bad},f.args),/conflicting physical/);
 const unrelated={descriptor:{path:'C:/elsewhere/same-source.json',sha256:sha256('elsewhere')},field:'level',sourceLevelId:7,level:{...f.level,blocks:[{id:'unrelated',x:0,y:0,shape:[[0,0],[1,0]],color:'green'}]}};
 const allowed={...f.state,nearPools:{...f.state.nearPools,history:[unrelated]}};const extra=await compare(allowed,f.args);assert.strictEqual(extra.comparisonView.nearPools.history[0],unrelated);assert.equal(extra.comparisonView.nearPools.history.length,2);
 passed.push('role-repeat-conflict-and-normal-same-source');
});
test('every small evidence digest and original terminal/creation/whole-world binding remains mandatory',async()=>{
 const f=await setup();const good=await compare(f.state,f.args);
 for(const p of Object.keys(good.fileBindings))await assert.rejects(compare(f.state,{...f.args,readBytes:async key=>key===p?Buffer.concat([await f.readBytes(key),Buffer.from(' ')]):f.readBytes(key)}),undefined,p);
 for(const field of ['request','result','blocked']){const state=structuredClone(f.state),row=state.bundle.terminalRecords[0];if(field==='request')row.request.value.redesignOf='other';if(field==='result')row.result.value.accepted=true;if(field==='blocked')row.blocked.pop();state.terminalByAttempt[row.namespace+'|'+row.request.value.id]=row;await assert.rejects(compare(state,f.args),undefined,field);}
 for(const mode of ['world','fingerprint','creation','duplicate-source']){const x=await setup(),raw=structuredClone(x.raw);if(mode==='world')raw.rows[0].level.blocks[0].color='pink';if(mode==='fingerprint')raw.rows[0].fingerprints.partitionSha256=sha256('wrong');if(mode==='creation')raw.rows[0].creation.seed.sha256=sha256('wrong');if(mode==='duplicate-source'){raw.rows.push(structuredClone(raw.rows[0]));raw.supplementalHistoryEvidence.supplements.push(raw.rows[0].supplement);}await assert.rejects(compare(x.state,x.seal(raw)),undefined,mode);}
 passed.push('all-small-bytes-original-terminal-creation-fingerprint');
});
test('separate comparison review required; synthetic evidence cannot authorize production',async()=>{
 const f=await setup();await assert.rejects(compare(f.state,{...f.args,qualificationOnly:false}));
 for(const change of [{status:SUPPLEMENT_REVIEW_STATUS},{allowedRoles:['failed-parent']},{referenceAuthorization:true},{failedParentAuthorization:true},{provenance:{path:'wrong',sha256:sha256('wrong')}}]){
  const original=JSON.parse(await f.readBytes(f.args.review.path)),review=f.doc('changed-review.json',{...original,...change});await assert.rejects(compare(f.state,{...f.args,review}));}
 const code=await fs.readFile('tools/daily-challenge/formal-v4/supplemental-comparison-evidence.mjs','utf8');assert(!/\b(readDirectHistoryRole|readSupplementalFailedParentEvidence|mergePlanHistoryDelta)\s*\(/.test(code));
 passed.push('comparison-review-and-production-allowlist-boundary');
});
test.after(async()=>{
 const entry='tools/daily-challenge/formal-v4/supplemental-comparison-evidence.mjs',compiled=await build({entryPoints:[entry],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'}),fileBindings={};
 for(const p of [...Object.keys(compiled.metafile.inputs),'tools/daily-challenge/formal-v4/supplemental-comparison-evidence.test.mjs'])fileBindings[p]=sha256(await fs.readFile(p));
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify({status:passed.length===4?'SUPPLEMENTAL_COMPARISON_EVIDENCE_PRIVATE_PASS':'INCOMPLETE',tests:4,passed,errors:passed.length===4?[]:['Synthetic case failed'],fileBindings,qualificationOnly:true,realHistoryConsumed:false,realProvenanceRead:false,newRealCandidateConstructions:0,newSearches:0,newConstructions:0,newLedgerClaims:0,newCspCalls:0,newReplayCalls:0,existingToolsChanged:false,acceptedEvidenceCreated:false,scope:'In-memory synthetic checkpoint metadata only; no gameplay model, solver, public claim or production comparison admission.'},null,2)+'\n',{flag:'wx'});
});
