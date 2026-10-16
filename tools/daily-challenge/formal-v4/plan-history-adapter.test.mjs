import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
import {levelSha256} from '../formal-v2/contract.mjs';
import {sha256,sealedWorldIdentity,canonicalHistoryPath} from './sealed-history-contract.mjs';
import {PLAN_HISTORY_VERSION as V,PLAN_HISTORY_REVIEW_STATUS,planHistorySummary,consumePlanHistory,assertPlanHistoryMembers,
 mergePlanHistoryDelta,readDirectHistoryRole,readLegacyPlanHistoryReference,assertFreshPlanHistoryInput} from './plan-history-adapter.mjs';

const out=process.env.PLAN_HISTORY_TEST_OUT;assert(out,'Explicit private output directory');await fs.mkdir(out,{recursive:false});const evidence=[];
const scope={baseDirectory:'C:/snapshot',roots:['public','late','reverse','vacancy','capacity','early','earlyPrefix'].map(id=>({id,physicalPath:'C:/shared/'+id,aliases:['C:/work/'+id,'C:/snapshot/'+id]}))};
const level=(n=0)=>({id:7,width:2+n,height:2,gates:[],blocks:[{id:'a',x:0,y:0,shape:Array.from({length:2+n},(_,i)=>[i,0]),color:['red','green','purple','orange','pink'][n%5]},
 {id:'b',x:0,y:1,shape:Array.from({length:2+n},(_,i)=>[i,0]),color:['blue','yellow','cyan','red','green'][n%5]}]});
const canon=p=>canonicalHistoryPath(p,scope);
function fixture(){
 const bytes=new Map(),b={version:V,baselinePlan:{path:'original-plan.json',sha256:sha256('original-plan')},baselineActual:{path:'original-actual.json',sha256:sha256('original-actual')},scope,
  publicNamespace:canon('public'),files:[],archivedBindings:{},publicStocks:[],nearPools:{selected:[],old450:[],history:[]},terminalRecords:[],externalPrivate:[{namespace:'c:/external/private',attemptId:'old-private'}],
  retired:[],legacyReferences:[],closedCampaigns:[],closedExperimentIds:[],oldLiveByteIntegrityClaimed:false};
 function put(p,q,{plain=false,rootId=scope.roots.find(r=>canon(p).startsWith(canon(r.physicalPath)+'/'))?.id??null}={}){
  const raw=Buffer.from(plain?q:JSON.stringify(q)),d={path:p,sha256:sha256(raw)};bytes.set(p,raw);b.files.push({...d,rootId,aliases:[p]});b.archivedBindings[p]=d.sha256;return d;
 }
 function attempt(id,board,state='FAILED',namespace=b.publicNamespace,kind='mathematical',parent=null){
  const f=sealedWorldIdentity(board),q={id,levelSha256:f.levelSha256,shapeSha256:f.shapeSha256,colorSha256:f.colorSha256,designSha256:f.designSha256,colorAssignments:f.colorAssignments,
   retryIdentitySha256:f.retryIdentitySha256,identityOrigin:id,redesignOf:parent};
  const r={kind,namespace,request:{descriptor:put(namespace+'/'+id+'.request.json',q),value:q},result:null,blocked:[],lock:null};
  if(state!=='PENDING'){const result={accepted:state==='ACCEPTED',status:state,levelSha256:f.levelSha256};r.result={descriptor:put(namespace+'/'+id+'.result.json',result),value:result};
   if(state==='FAILED')for(const p of [namespace+'/'+id+'.blocked.json',namespace+'/identities/'+f.retryIdentitySha256+'.blocked.json']){const value={attemptId:id,status:state};r.blocked.push({descriptor:put(p,value),value});}}
  const packet={accepted:state==='ACCEPTED',level:board,attempt:q};r.receipt=put('C:/external/'+id+'.json',packet);b.terminalRecords.push(r);
  if(namespace===b.publicNamespace)b.publicStocks.push({...q,...r.request.descriptor});
  b.nearPools.history.push({descriptor:r.receipt,level:board,sourceLevelId:7,reference:null});return r;
 }
 const failed=attempt('failed',level()),accepted=attempt('accepted',level(1),'ACCEPTED');
 const pending=attempt('pending',level(2),'PENDING'),capacity=attempt('capacity',level(3),'ACCEPTED',canon('capacity'),'construction');
 const closedRaw={closed:true,maximumInputs:4,consumedInputs:3},closedDescriptor=put('late/closed.json',closedRaw);
 b.closedExperimentIds.push('closed');b.closedCampaigns.push({id:'closed',descriptor:closedDescriptor,closed:true,restartAllowed:false,maximumInputs:4,consumedInputs:3});
 b.baselineFields={publicStocks:structuredClone(b.publicStocks),previousLateStocks:structuredClone(b.nearPools.history),previousMacro:[],comparisonOnly:[],selected:[],old450:[],terminalHistory:[],closedExperimentIds:['closed']};
 return{b,bytes,put,attempt,failed,accepted,pending,capacity};
}
const reader=bytes=>async p=>{assert(bytes.has(p),'Unexpected read '+p);return bytes.get(p);};
function doc(bytes,p,q){const raw=Buffer.from(JSON.stringify(q));bytes.set(p,raw);return{path:p,sha256:sha256(raw)};}
function args(f){const checkpoint=doc(f.bytes,'checkpoint.json',f.b),review=doc(f.bytes,'review.json',{status:PLAN_HISTORY_REVIEW_STATUS,checkpoint,summary:planHistorySummary(f.b),errors:[],
 newSearches:0,newConstructions:0,newLedgerClaims:0,oldLiveByteIntegrityClaimed:false});return{checkpoint,review,expectedScope:scope,readBytes:reader(f.bytes)};}
const listing=b=>Object.fromEntries(scope.roots.map(r=>[r.id,b.files.filter(f=>f.rootId===r.id).map(f=>f.path)]));
function delta(state,f,{id='new',board=level(4),parent='failed',accepted=false}={}){
 const nf=fixture();nf.b.files=[];nf.b.terminalRecords=[];nf.b.publicStocks=[];nf.b.nearPools.history=[];nf.b.archivedBindings={};
 const r=nf.attempt(id,board,accepted?'ACCEPTED':'FAILED',state.bundle.publicNamespace,'mathematical',parent);
 const stock=nf.b.nearPools.history[0],d={version:V,parentHeadSha256:state.headSha256,owner:null,files:nf.b.files,terminalRecords:[r],fullWorlds:[{...stock,field:'level'}],closedCampaigns:[]};
 for(const [p,v]of nf.bytes)if(d.files.some(x=>x.path===p))f.bytes.set(p,v);
 const owner={id:'future-batch',kind:'mathematical',namespace:state.bundle.publicNamespace,definition:null};
 owner.definition=doc(f.bytes,'new-owner.json',{version:'plan-history-owner-v1',id:owner.id,kind:owner.kind,namespace:owner.namespace,files:d.files.map(({path,sha256})=>({path,sha256})),attemptIds:[id],closedCampaigns:[]});d.owner=owner;
 const descriptor=doc(f.bytes,'delta.json',d),ls=listing(state.bundle);for(const file of d.files)if(file.rootId)ls[file.rootId].push(file.path);
 return{d,r,owner,descriptor,listing:ls,declaredOwner:owner,readBytes:reader(f.bytes)};
}
const check=(name,fn)=>test(name,async()=>{await fn();evidence.push({name,passed:true});});

check('reviewed exact projection, identity-only requests, seven aliases, original private namespace; no archived bytes read',async()=>{
 const f=fixture(),a=args(f);let reads=0;const s=await consumePlanHistory({...a,readBytes:async p=>{reads++;assert(['checkpoint.json','review.json'].includes(p));return f.bytes.get(p);}});
 assert.equal(reads,2);assert.deepEqual(s.publicStocks,f.b.publicStocks);assert.equal(s.publicStocks[0].level,undefined);assert.deepEqual(s.externalPrivate,f.b.externalPrivate);
 assert.equal(s.oldLiveByteIntegrityClaimed,false);assert.equal(canon('C:/work/late/a.json'),canon('late/a.json'));
 assert.notEqual(canon('C:/work/src/game.ts'),canon('C:/snapshot/src/game.ts'));assertPlanHistoryMembers(s,listing(f.b));
 const bad=JSON.parse(f.bytes.get('review.json'));bad.summary.publicStocks++;await assert.rejects(consumePlanHistory({...a,review:doc(f.bytes,'badreview.json',bad)}));
 f.bytes.set('checkpoint.json',Buffer.concat([f.bytes.get('checkpoint.json'),Buffer.from(' ')]));await assert.rejects(consumePlanHistory(a),/Descriptor bytes/);
});
check('complete names include locks; unknown additions, deletion, alias substitution and root omission fail',async()=>{
 const f=fixture();f.pending.request.value.revalidates='origin';f.pending.request.value.lockFile='public/origin.revalidation.lock';
 const bytes=Buffer.from(JSON.stringify(f.pending.request.value));f.bytes.set(f.pending.request.descriptor.path,bytes);f.pending.request.descriptor.sha256=sha256(bytes);
 const file=f.b.files.find(x=>x.path===f.pending.request.descriptor.path);file.sha256=sha256(bytes);f.b.archivedBindings[file.path]=file.sha256;
 Object.assign(f.b.publicStocks.find(x=>x.id==='pending'),f.pending.request.value,f.pending.request.descriptor);f.b.baselineFields.publicStocks=structuredClone(f.b.publicStocks);
 const ld=f.put('public/origin.revalidation.lock','pending',{plain:true});f.pending.lock={descriptor:ld,value:'pending'};
 const s=await consumePlanHistory(args(f)),ls=listing(f.b);assertPlanHistoryMembers(s,ls);
 const noLock=structuredClone(ls);noLock.public=noLock.public.filter(p=>!p.endsWith('.lock'));assert.throws(()=>assertPlanHistoryMembers(s,noLock),/Deleted/);
 const extra=structuredClone(ls);extra.late.push('late/unknown.json');assert.throws(()=>assertPlanHistoryMembers(s,extra),/Unknown/);
 const noRoot=structuredClone(ls);delete noRoot.reverse;assert.throws(()=>assertPlanHistoryMembers(s,noRoot));
 const alias=structuredClone(ls);alias.public.push('C:/work/public/failed.request.json');assert.throws(()=>assertPlanHistoryMembers(s,alias),/Duplicate/);
});
check('declared delta validates original request/result/doubleblocked and every formed world; no terminal/quota rewrite',async()=>{
 const f=fixture(),s=await consumePlanHistory(args(f)),a=delta(s,f),next=await mergePlanHistoryDelta(s,a);
 assert.equal(next.publicStocks.length,s.publicStocks.length+1);assert.equal(next.nearPools.history.length,s.nearPools.history.length+1);assert.equal(next.terminalByAttempt[canon('public')+'|new'].result.value.accepted,false);
 const mutate=async change=>{const x=structuredClone(a.d);change(x);const descriptor=doc(f.bytes,'negative-delta.json',x);await assert.rejects(mergePlanHistoryDelta(s,{...a,descriptor}));};
 await mutate(x=>{x.terminalRecords[0].result.value.accepted=true;});await mutate(x=>{x.fullWorlds=[];});await mutate(x=>{x.owner.id='unknown-writer';});
 await mutate(x=>{x.files[0].path=f.failed.request.descriptor.path;});await mutate(x=>{x.closedCampaigns=[f.b.closedCampaigns[0]];});
 const forged=structuredClone(a.d),request=forged.terminalRecords[0].request;request.value.designSha256=sha256('false-design');
 request.descriptor=doc(f.bytes,request.descriptor.path,request.value);Object.assign(forged.files.find(x=>x.path===request.descriptor.path),request.descriptor);
 forged.owner.definition=doc(f.bytes,'forged-owner.json',{version:'plan-history-owner-v1',id:forged.owner.id,kind:forged.owner.kind,namespace:forged.owner.namespace,
  files:forged.files.map(({path,sha256})=>({path,sha256})),attemptIds:['new'],closedCampaigns:[]});
 await assert.rejects(mergePlanHistoryDelta(s,{...a,declaredOwner:forged.owner,descriptor:doc(f.bytes,'forged-delta.json',forged)}),/fingerprint differs/);
 await assert.rejects(mergePlanHistoryDelta(next,{...a,descriptor:doc(f.bytes,'same-failure.json',{...a.d,parentHeadSha256:next.headSha256})}));
 const pending=structuredClone(f.pending),end={accepted:true,status:'accepted',levelSha256:pending.request.value.levelSha256};
 pending.result={descriptor:doc(f.bytes,pending.namespace+'/pending.result.json',end),value:end};
 const df={...pending.result.descriptor,aliases:[pending.result.descriptor.path],rootId:'public'},own={id:'complete-pending',kind:'mathematical',namespace:pending.namespace};
 own.definition=doc(f.bytes,'pending-owner.json',{version:'plan-history-owner-v1',...own,files:[pending.result.descriptor],attemptIds:['pending'],closedCampaigns:[]});
 const pd={version:V,parentHeadSha256:s.headSha256,owner:own,files:[df],terminalRecords:[pending],fullWorlds:[],closedCampaigns:[]},ls=listing(s.bundle);ls.public.push(df.path);
 const completed=await mergePlanHistoryDelta(s,{descriptor:doc(f.bytes,'pending-delta.json',pd),declaredOwner:own,listing:ls,readBytes:reader(f.bytes)});
 assert.equal(completed.terminalByAttempt[pending.namespace+'|pending'].result.value.accepted,true);assert.equal(s.terminalByAttempt[pending.namespace+'|pending'].result,null);
 assert.deepEqual(next.bundle.baselineFields,s.bundle.baselineFields);assert.equal(next.oldLiveByteIntegrityClaimed,false);
});
check('direct roles read original bytes; failed/pending/capacity/retired stay protected; legacy is explicit geometry-only',async()=>{
 const f=fixture(),legacyLevel=level(4),legacyReceipt=f.put('C:/external/legacy.json',{accepted:true,level:legacyLevel,drags:[]}),legacyReview=f.put('C:/external/legacy-review.json',{meaning:'exact V2 reference, no same-object public attempt'});
 const legacy={receipt:legacyReceipt,review:legacyReview,levelSha256:levelSha256(legacyLevel),referenceOnly:true};f.b.legacyReferences.push(legacy);
 const s=await consumePlanHistory(args(f)),use=(r,role)=>readDirectHistoryRole(s,{namespace:r.namespace,attemptId:r.request.value.id,receipt:r.receipt,role,readBytes:reader(f.bytes)});
 assert.equal((await use(f.accepted,'reference')).mathematicalProofRevalidated,false);assert.equal((await use(f.failed,'failed-parent')).result.accepted,false);
 await assert.rejects(use(f.capacity,'reference'),/Construction accepted/);await assert.rejects(use(f.pending,'reference'),/Pending/);await assert.rejects(use(f.failed,'reference'));
 assert.throws(()=>assertFreshPlanHistoryInput(s,{...level(),id:99,name:'new tool budget'}),/Existing/);
 const fresh=level(6);assertFreshPlanHistoryInput(s,fresh,{sourceLevelId:7,failedParent:{namespace:f.failed.namespace,attemptId:'failed'}});
 const legacyResult=await readLegacyPlanHistoryReference(s,{legacyReference:legacy,readBytes:reader(f.bytes)});assert.equal(legacyResult.lowerBoundBorrowed,false);assert.equal(legacyResult.completeDualReplayRequired,true);
 await assert.rejects(readLegacyPlanHistoryReference(s,{legacyReference:{...legacy,referenceOnly:false},readBytes:reader(f.bytes)}),/Unreviewed/);
 const retiredDescriptor=f.put('late/retired.json',{anchors:legacyLevel.blocks,gates:[]});f.b.retired.push({kind:'skeleton',descriptor:retiredDescriptor,anchors:legacyLevel.blocks,gates:[]});
 const retired=await consumePlanHistory(args(f));assert.throws(()=>assertFreshPlanHistoryInput(retired,legacyLevel),/Retired visible skeleton/);
 await assert.rejects(readLegacyPlanHistoryReference(retired,{legacyReference:legacy,readBytes:reader(f.bytes)}),/Retired visible skeleton/);
 f.bytes.set(f.accepted.receipt.path,Buffer.from('{}'));await assert.rejects(use(f.accepted,'reference'),/Descriptor bytes/);
});

test.after(async()=>{
 const entry='tools/daily-challenge/formal-v4/plan-history-adapter.mjs',testFile='tools/daily-challenge/formal-v4/plan-history-adapter.test.mjs';
 const compiled=await build({entryPoints:[entry],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'}),fileBindings={};
 for(const p of [...Object.keys(compiled.metafile.inputs),testFile])fileBindings[p.replaceAll('\\','/')]=sha256(await fs.readFile(p));
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify({status:evidence.length===4?'PLAN_HISTORY_ADAPTER_PRIVATE_PASS':'PLAN_HISTORY_ADAPTER_PRIVATE_INCOMPLETE',evidence,errors:[],fileBindings,
  newRealHistoryExports:0,newRealHistoryScans:0,newRealCandidateSearches:0,newRealCandidateConstructions:0,publicLedgerClaims:0,privateSyntheticDataOnly:true,oldLiveByteIntegrityClaimed:false,
  limitations:['Independent exporter/reviewer must establish exact baseline projection, raw schema coverage, actual canonical aliases, private namespaces and retirement extraction.',
   'The caller must completely enumerate seven roots without following links, including locks, and serialize writers. This module implements neither enumeration nor locks.',
   'Only immutable new files are merged. A sealed active-lock deletion, old pointer rewrite or unknown owner schema requires a new reviewed baseline, not silent mutation.',
   'Original current reference/parent bytes are re-read when used. Current sources/math/candidate and all geometric near thresholds remain caller checks; no proof is minted here.']},null,2)+'\n',{flag:'wx'});
});
