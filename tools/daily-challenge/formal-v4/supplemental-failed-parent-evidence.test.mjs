import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
import {levelSha256} from '../formal-v2/contract.mjs';
import {sha256,sealedWorldIdentity} from './sealed-history-contract.mjs';
import {consumePlanHistory,planHistorySummary,PLAN_HISTORY_VERSION,PLAN_HISTORY_REVIEW_STATUS,assertFreshPlanHistoryInput,readDirectHistoryRole,assertPlanHistoryMembers} from './plan-history-adapter-v4.mjs';
import {readSupplementalFailedParentEvidence as supplement,SUPPLEMENT_VERSION,SUPPLEMENT_REVIEW_STATUS} from './supplemental-failed-parent-evidence.mjs';
const out=process.env.SUPPLEMENTAL_FAILED_PARENT_TEST_OUT;assert(out);await fs.mkdir(out,{recursive:false});const passed=[];
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
test('read-only overlay binds old packet, preserves terminal/quota/head, and retains exact/partition deny',async()=>{
 const f=fixture(),{state,args}=await f.prepare(),before=JSON.stringify(state),got=await supplement(state,args);
 assert.equal(JSON.stringify(state),before);assert.equal(got.state.headSha256,state.headSha256);
 assert.strictEqual(got.state.bundle.terminalRecords,state.bundle.terminalRecords);assert.strictEqual(got.state.publicStocks,state.publicStocks);
 assert.strictEqual(got.state.closedCampaigns,state.closedCampaigns);assert.equal(got.supplementalEvidence.addedHistoricalFullWorlds,1);
 assert.equal(got.supplementalEvidence.addedHistoricalEvidenceFiles,1);assert.equal(got.state.fullWorlds.length,1);assert.deepEqual(got.parents[0].receipt,f.packet);
 const listing=Object.fromEntries(f.scope.roots.map(r=>[r.id,f.bundle.files.filter(x=>x.rootId===r.id).map(x=>x.path)]));assertPlanHistoryMembers(got.state,listing);
 assert.throws(()=>assertFreshPlanHistoryInput(got.state,f.level),/Existing public/);
 await assert.rejects(readDirectHistoryRole(got.state,{namespace:f.bundle.publicNamespace,attemptId:f.request.id,receipt:f.receipt,role:'reference',readBytes:f.readBytes}));
 await assert.rejects(supplement(state,{...args,role:'reference'}),/failed-parent only/);await assert.rejects(supplement(got.state,args),/Apply once/);
 passed.push('overlay-terminal-exact-role');
});
test('all declared byte digests, review checkpoint and scope pins are effective',async()=>{
 const f=fixture(),{state,args,record,seal}=await f.prepare();
 for(const p of f.bytes.keys())if(p!=='checkpoint.json'&&p!=='checkpoint-review.json'){
  await assert.rejects(supplement(state,{...args,readBytes:async file=>file===p?Buffer.concat([await f.readBytes(file),Buffer.from(' ') ]):f.readBytes(file)}));
 }
 const wrong={...record,checkpoint:{...record.checkpoint,sha256:sha256('other')}};await assert.rejects(supplement(state,seal(wrong)));
 await assert.rejects(supplement(state,{...args,qualificationOnly:false}));passed.push('all-byte-review-pins');
});
test('current failed/pending descendants and same-physical pending block; accepted descendant remains allowed',async()=>{
 for(const mode of ['FAILED','PENDING','PHYSICAL_PENDING','ACCEPTED']){const f=fixture(),{state,args}=await f.prepare();
  const descendant=structuredClone(f.terminal);descendant.request.value={...descendant.request.value,id:'later-child',redesignOf:mode==='PHYSICAL_PENDING'?null:f.request.id};
  if(mode!=='PHYSICAL_PENDING'){descendant.request.value.designSha256=sha256('different-design');descendant.request.value.shapeSha256=sha256('different-shape');}
  descendant.result=mode.includes('PENDING')?null:{descriptor:{path:'unused',sha256:sha256('unused')},value:{accepted:mode==='ACCEPTED'}};descendant.blocked=[];
  state.bundle.terminalRecords=[...state.bundle.terminalRecords,descendant];
  if(mode==='ACCEPTED')assert.equal((await supplement(state,args)).parents.length,1);else await assert.rejects(supplement(state,args),/Pending identity|Later failed\/pending/);
 }passed.push('latest-and-pending');
});
test('accepted packet, mismatched original source chain, missing/wrong seals and forged identity are rejected',async()=>{
 for(const mode of ['accepted','level','attempt','proof','source','creation','missing-seal','wrong-seal']){const f=fixture(),{state,record,seal}=await f.prepare(),r=structuredClone(record);
  if(mode==='missing-seal'){r.blocked=r.blocked.slice(0,1);state.bundle.terminalRecords[0].blocked=state.bundle.terminalRecords[0].blocked.slice(0,1);}
  else if(mode==='wrong-seal'){const t=state.bundle.terminalRecords[0];t.blocked[0].value={attemptId:'other',status:t.result.value.status};t.blocked[0].descriptor=f.doc(t.blocked[0].descriptor.path,t.blocked[0].value);r.blocked=t.blocked.map(b=>b.descriptor);}
  else{const q=structuredClone(f.packet);if(mode==='accepted')q.accepted=true;if(mode==='level')q.level.blocks[0].color='pink';if(mode==='attempt')q.attempt.id='false';if(mode==='proof')q.proof.status='threshold-proven';if(mode==='source')q.sourceLevelId=11;if(mode==='creation')q.provenance.inputLevelSha256=sha256('wrong');r.receipt=f.doc(f.receipt.path,q);}
  await assert.rejects(supplement(state,seal(r)),undefined,mode);
 }passed.push('raw-source-terminal-negatives');
});
test.after(async()=>{const entry='tools/daily-challenge/formal-v4/supplemental-failed-parent-evidence.mjs',compiled=await build({entryPoints:[entry],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'}),fileBindings={};
 for(const p of [...Object.keys(compiled.metafile.inputs),'tools/daily-challenge/formal-v4/supplemental-failed-parent-evidence.test.mjs'])fileBindings[p]=sha256(await fs.readFile(p));
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify({status:passed.length===4?'SUPPLEMENTAL_FAILED_PARENT_EVIDENCE_PRIVATE_PASS':'INCOMPLETE',tests:4,passed,errors:passed.length===4?[]:['One or more synthetic cases failed'],fileBindings,
  qualificationOnly:true,realHistoryConsumed:false,newRealCandidateConstructions:0,newSearches:0,newConstructions:0,newLedgerClaims:0,newReplayCalls:0,checkpointChanged:false,existingToolsChanged:false,acceptedEvidenceCreated:false,
  interface:'readSupplementalFailedParentEvidence(state,{supplements,review,role,readBytes,qualificationOnly})',limitations:['Private synthetic metadata only; no real checkpoint consumption or production supplement qualification.','Caller must authenticate current checkpoint/delta state and perform seven-root membership checks.','Supplement changes only a separate view; original sealed head, terminal identities and closed quotas remain authoritative.']},null,2)+'\n',{flag:'wx'});
});
