import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {writeHistoryPack,readHistoryPack,hashJsonStream} from './plan-history-pack-v1.mjs';
import {VERSION,ORIGINAL,ORIGINAL_REVIEW,ZERO,MAX_BYTES,sha,assertConfiguration,assertClosedSource,READY,CONFIG_TEMPLATE,assertCheckpoint10Ready,assertSealedSourceContinuity,
 SOURCE_CONFIG,SOURCE_INPUT,MINIMUM_HISTORY,MINIMUM_HEAD,FAILED_PARENT,FAILED_PARENT_ID,SOURCE_REFERENCE,SOURCE_DIRECTORY,SOURCE_VERSION,SOURCE_EXPERIMENT,
 membershipDigest,assertBundleByteCount,compareEveryCheckpointField,bridgeFields,declaredMembers,expectedPackFiles,assertPackDirectory} from './reseal-plan-history-checkpoint10-v1.mjs';
import {reviewCheckpoint10} from './review-plan-history-checkpoint10-v1.mjs';

// Synthetic declarations only. No game world, actual report/checkpoint read,
// adapter import, consume/merge, production entrypoint, model, solver or claim.
const clone=x=>structuredClone(x),d=n=>({path:'__synthetic_metadata_only__/'+n,sha256:sha(n)});
function fixture({accepted=false}={}){
 const delta=(n,kind)=>({descriptor:d('delta-'+n),declaredOwner:{id:'owner-'+n,kind,namespace:'C:/synthetic/'+kind,definition:d('owner-'+n)}});
 const old=Array.from({length:38},(_,i)=>delta(i+1,i%2?'mathematical':'construction'));
 old[37].descriptor.sha256=MINIMUM_HEAD;
 const tail=[delta(39,'construction'),delta(40,'mathematical')];
 tail[0].declaredOwner.id=SOURCE_EXPERIMENT;tail[1].declaredOwner.id=SOURCE_EXPERIMENT+'-math';
 const c=clone(CONFIG_TEMPLATE);for(const k of ['latestHistoryReport','latestCompletion','latestExecutionExit','implementationReview'])c[k].sha256=sha(k);
 const historyScope={roots:Array.from({length:7},(_,i)=>({id:'synthetic-root-'+i,physicalPath:'C:/synthetic/root'+i,aliases:[]}))};
 const comparisonEvidence={provenance:d('comparison-provenance'),review:d('comparison-review')};
 const prior={status:'AUTHORED_SHELL_HISTORY_DELTAS_EXPORTED',checkpoint:clone(ORIGINAL),checkpointReview:clone(ORIGINAL_REVIEW),historyScope,errors:[],completeHistoryDeltas:old,headSha256:MINIMUM_HEAD,comparisonEvidence};
 const h={status:'AUTHORED_SHELL_HISTORY_DELTAS_EXPORTED',errors:[],checkpoint:clone(ORIGINAL),checkpointReview:clone(ORIGINAL_REVIEW),historyScope,
  priorHistoryReport:clone(MINIMUM_HISTORY),priorHistoryDeltas:old,historyDeltas:tail,completeHistoryDeltas:[...old,...tail],headSha256:tail.at(-1).descriptor.sha256,
  comparisonEvidence,previousUnsealedHistory:d('unsealed-stock'),oldLiveByteIntegrityClaimed:false,newSearches:0,newConstructions:0,newLedgerClaims:0};
 const actualPathDescriptor=(name)=>({path:SOURCE_DIRECTORY+'/'+name,sha256:sha('synthetic-'+name)});
 const done={version:SOURCE_VERSION,status:'AUTHORED_SHELL_SINGLE_INPUT_CLOSED',closed:true,normalExportAllowed:true,restartAllowed:false,administrativeError:null,newConstructions:0,
  unpersistedOriginalMathematicalResult:null,unpersistedInputs:[],consumedInputs:1,maximumInputs:1,formedFullWorlds:1,config:clone(SOURCE_CONFIG),plan:actualPathDescriptor('plan.json'),input:clone(SOURCE_INPUT),
  constructionOwner:tail[0].declaredOwner.definition,mathOwner:tail[1].declaredOwner.definition,historyExport:c.latestHistoryReport,experimentId:SOURCE_EXPERIMENT,qualifierEntered:true,qualifierReturned:true,
  publicClaimsStarted:1,receipt:actualPathDescriptor('candidate.json'),mathematicalReceiptPersisted:true,mathematicallyAccepted:accepted,accepted:false,formalReady:false,
  lowerProjectionWorlds:1,searchAccounting:{synthetic:'saved accounting only'},searchAccountingReceipt:actualPathDescriptor('search-accounting.json')};
 done.persistedConstructionWorldFiles=[done.input];done.persistedLowerProjectionWorldFields=[{descriptor:done.receipt,field:'lowerBound.projection.projectedLevel',sourceLevelSha256:sha('source'),levelSha256:sha('projection')}];
 h.parentExecution=Object.fromEntries(['qualifierEntered','qualifierReturned','publicClaimsStarted','receipt','searchAccounting','searchAccountingReceipt'].map(k=>[k,done[k]]));
 const plan={version:SOURCE_VERSION,config:done.config,input:done.input,experimentId:done.experimentId,historyReport:h.priorHistoryReport,historyHeadSha256:prior.headSha256,historyScope,
 sourceReference:clone(SOURCE_REFERENCE),failedParent:{receipt:clone(FAILED_PARENT),attemptId:FAILED_PARENT_ID},maximumInputs:1,newConstructions:0,upperCallsMaximum:0,lowerCallsMaximum:1,jointCallsMaximum:0,totalSearchCallsMaximum:1,registeredWorldsPerSearch:9999,terminalAllowancePerSearch:1,fullWorldsPerSearchMaximum:10000,combinedFullWorldsMaximum:10000,upperInternalCanonicalReplaysMaximum:0,finalCanonicalReplaysMaximum:1,finalIndependentReplaysMaximum:1,rawWholeBoardLimit:10000,retryAllowed:false,rebandAllowed:false,fallbackAllowed:false};
 return{c,h,done,plan,prior};
}
const verify=f=>assertClosedSource(f.c,f.h,f.done,f.plan,f.prior);
function rejectAll(mutations){for(const mutate of mutations){const f=fixture();mutate(f);assert.throws(()=>verify(f));}}

test('imports expose source-only entrypoints; pending configuration cannot become executable',()=>{
 assert.equal(typeof reviewCheckpoint10,'function');assert.equal(typeof READY,'boolean');if(!READY)assert.throws(assertCheckpoint10Ready,/SOURCE ONLY/);else assert.doesNotThrow(assertCheckpoint10Ready);
 assert.throws(()=>assertConfiguration(CONFIG_TEMPLATE));
});
test('exact completed source40 chain is metadata-sealable whether math accepted or failed',()=>{
 for(const accepted of [false,true]){const f=fixture({accepted});assert.deepEqual(verify(f),f.h.completeHistoryDeltas);assert.equal(f.done.mathematicallyAccepted,accepted);assert.equal(f.done.accepted,false);}
});
test('configuration pins the intended closed run and exact implementation review without self-hash recursion',()=>{
 const f=fixture();assert.deepEqual(assertConfiguration(f.c),f.c);
 for(const mutate of [q=>delete q.latestExecutionExit,q=>q.extra=true,q=>q.latestHistoryReport.sha256='PENDING',q=>q.latestCompletion.path='other.json',q=>q.implementationReview.path='other-review.json',q=>q.version='checkpoint08']){const q=clone(f.c);mutate(q);assert.throws(()=>assertConfiguration(q));}
});
test('prior38 and complete40 ordered owners cannot be omitted, substituted, reordered or forked',()=>rejectAll([
 f=>f.h.completeHistoryDeltas.pop(),f=>f.h.completeHistoryDeltas.reverse(),f=>f.h.historyDeltas.pop(),f=>f.h.priorHistoryDeltas.pop(),
 f=>f.h.headSha256=sha('wrong'),f=>f.prior.headSha256=sha('wrong'),f=>f.prior.completeHistoryDeltas=[],
 f=>f.h.checkpoint.sha256=sha('wrong'),f=>f.h.checkpointReview.sha256=sha('wrong'),f=>f.prior.historyScope={roots:[]},f=>f.h.historyScope.roots=[],
 f=>f.h.priorHistoryReport=d('rollback'),f=>f.h.comparisonEvidence={provenance:d('wrong'),review:d('wrong')},
 f=>f.h.historyDeltas[0].declaredOwner.id='other-owner',f=>f.h.historyDeltas[0].declaredOwner.kind='mathematical',
 f=>f.done.constructionOwner=d('wrong'),f=>f.done.mathOwner=null,f=>f.h.historyDeltas[0].declaredOwner.definition.sha256='bad'
]));
test('unclosed, ambiguous accounting, missing original/projection or relaxed budgets cannot be sealed',()=>rejectAll([
 f=>f.done.closed=false,f=>f.done.normalExportAllowed=false,f=>f.done.restartAllowed=true,f=>f.done.administrativeError='incomplete',
 f=>f.done.status='AUTHORED_SHELL_SINGLE_INPUT_ADMINISTRATIVE_FAILURE',f=>f.done.unpersistedInputs=[d('unsaved')],f=>f.done.unpersistedOriginalMathematicalResult={},
 f=>f.done.maximumInputs=2,f=>f.done.consumedInputs=0,f=>f.done.formedFullWorlds=2,f=>f.done.publicClaimsStarted=null,
 f=>f.done.qualifierReturned=false,f=>f.done.mathematicalReceiptPersisted=false,f=>f.done.persistedConstructionWorldFiles=[],
 f=>f.done.historyExport=d('wrong'),f=>f.plan.historyReport=d('wrong'),f=>f.plan.historyHeadSha256=sha('wrong'),f=>f.plan.input=d('wrong'),
 f=>f.plan.jointCallsMaximum=1,f=>f.plan.upperCallsMaximum=1,f=>f.plan.rawWholeBoardLimit=99999,f=>f.plan.registeredWorldsPerSearch=10000,
 f=>f.plan.retryAllowed=true,f=>f.plan.rebandAllowed=true,f=>f.plan.fallbackAllowed=true,
 f=>f.h.parentExecution.publicClaimsStarted=0,f=>f.h.parentExecution.searchAccounting=null,f=>f.h.parentExecution.receipt=d('wrong'),
 f=>f.h.newSearches=1,f=>f.h.newConstructions=1,f=>f.h.newLedgerClaims=1,f=>f.h.oldLiveByteIntegrityClaimed=true,f=>f.h.errors=['not closed'],
 f=>f.done.lowerProjectionWorlds=0,f=>f.done.persistedLowerProjectionWorldFields=[],f=>f.done.persistedLowerProjectionWorldFields[0].field='level',
 f=>f.plan.failedParent.attemptId=sha('stale'),f=>f.plan.failedParent.receipt=d('old0153'),f=>f.plan.sourceReference=d('wrong donor')
]));
// Opaque metadata values, deliberately not Level definitions or model inputs.
function continuityFixture({priorOnly=false}={}){
 const valueHash=v=>hashJsonStream(v,{canonical:true}).sha256,oldValue={synthetic:'old'},newValue={synthetic:'new'},projection={synthetic:'projection'};
 const row=(id,startedAt,value,redesignOf=null)=>({namespace:'__synthetic_math__',kind:'mathematical',request:{descriptor:d('request-'+id),value:{id,startedAt,levelSha256:valueHash(value),redesignOf}},
  result:{descriptor:d('result-'+id),value:{accepted:false}},blocked:[{descriptor:d('block-'+id)},{descriptor:d('identity-block-'+id)}],lock:null});
 const old=row(FAILED_PARENT_ID,'2026-01-01T00:00:00Z',oldValue),latest=row(sha('synthetic-new-failure'),'2026-01-02T00:00:00Z',newValue,FAILED_PARENT_ID),receipt=d('new-receipt');
 const world=(descriptor,field,level)=>({descriptor,field,level,sourceLevelId:2,reference:clone(SOURCE_REFERENCE)});
 const source={done:{receipt},receipt:{accepted:false,attempt:{id:latest.request.value.id},level:newValue,lowerBound:{projection:{projectedLevel:projection}}},h:{headSha256:sha('synthetic-new-head')}};
 const bundle={publicNamespace:'__synthetic_math__',nearPools:{history:[world(clone(FAILED_PARENT),'level',oldValue)]},terminalRecords:[old],archivedBindings:{synthetic:'original'}};
 if(!priorOnly){bundle.terminalRecords.push(latest);bundle.nearPools.history.push(world(receipt,'level',newValue),world(receipt,'lowerBound.projection.projectedLevel',projection));}
 return{state:{bundle,headSha256:priorOnly?MINIMUM_HEAD:source.h.headSha256},source};
}
test('source2 latest failure changes only when actual saved failed terminal is appended; both prior and new guards remain',()=>{
 const old=continuityFixture({priorOnly:true}),before=assertSealedSourceContinuity(old.state,old.source,{priorOnly:true});assert.equal(before.latestFailedAttemptId,FAILED_PARENT_ID);
 const current=continuityFixture(),after=assertSealedSourceContinuity(current.state,current.source);assert.equal(after.latestFailedAttemptId,current.source.receipt.attempt.id);
 assert.equal(after.failedParentAttemptId,FAILED_PARENT_ID);assert.equal(after.newTerminal.blocked.length,2);assert.equal(after.newMathematicalRoleGranted,false);
 assert.equal(after.projectedWorld.field,'lowerBound.projection.projectedLevel');assert.notEqual(after.originalWorld.sha256,after.projectedWorld.sha256);
});
test('accepted D110 terminal retains the prior D210 failed parent with both original blocked aliases',()=>{
 const f=continuityFixture();f.source.receipt.accepted=true;
 const accepted=f.state.bundle.terminalRecords[1];accepted.result.value.accepted=true;accepted.blocked=[];
 const result=assertSealedSourceContinuity(f.state,f.source);
 assert.equal(result.latestFailedAttemptId,FAILED_PARENT_ID);assert.equal(result.failedParentAttemptId,FAILED_PARENT_ID);
 assert.deepEqual(result.newTerminal.result,accepted.result.descriptor);assert.deepEqual(result.newTerminal.blocked,[]);
 assert.equal(result.newMathematicalRoleGranted,false);
 const missing=clone(f);missing.state.bundle.terminalRecords[0].blocked.pop();
 assert.throws(()=>assertSealedSourceContinuity(missing.state,missing.source));
});
test('the prior failed world retains its own donor rather than adopting the new D110 donor',()=>{
 for(const accepted of [false,true]){
  const f=continuityFixture();f.state.bundle.nearPools.history[0].reference=d('original-D210-donor');
  if(accepted){f.source.receipt.accepted=true;f.state.bundle.terminalRecords[1].result.value.accepted=true;f.state.bundle.terminalRecords[1].blocked=[];}
  const before=clone(f.state.bundle.nearPools.history[0]);assertSealedSourceContinuity(f.state,f.source);
  assert.deepEqual(f.state.bundle.nearPools.history[0],before);
  assert.notDeepEqual(before.reference,SOURCE_REFERENCE);
 }
});
test('missing projected world, deleted blocked aliases, stale latest role or altered donor cannot pass continuity',()=>{
 const mutations=[
  f=>f.state.bundle.nearPools.history.pop(),f=>f.state.bundle.nearPools.history.shift(),f=>f.state.bundle.terminalRecords.shift(),
  f=>f.state.bundle.terminalRecords[0].blocked.pop(),f=>f.state.bundle.terminalRecords[1].blocked=[],
  f=>f.state.bundle.terminalRecords[1].request.value.redesignOf=sha('wrong-parent'),f=>f.state.bundle.terminalRecords[1].request.value.startedAt='invalid',
  f=>f.state.bundle.terminalRecords[1].request.value.startedAt='2025-01-01T00:00:00Z',f=>f.state.bundle.terminalRecords[1].result.value.accepted=true,
  f=>f.state.bundle.nearPools.history[1].reference=d('wrong-donor'),f=>f.state.bundle.nearPools.history[2].field='level',
  f=>f.state.headSha256=MINIMUM_HEAD
 ];
 for(const mutate of mutations){const f=continuityFixture();mutate(f);assert.throws(()=>assertSealedSourceContinuity(f.state,f.source));}
});
function fullMetadata(){return{version:'synthetic',publicStocks:[{id:'failed',shapeSha256:sha('shape'),colorSha256:sha('color'),designSha256:sha('design'),retryIdentitySha256:sha('retry')}],
 nearPools:{selected:[{descriptor:d('selected')}],old450:[{descriptor:d('old450')}],history:[{descriptor:d('history')}]},
 terminalRecords:[{kind:'mathematical',namespace:'C:/synthetic/math',request:{value:{id:'failed'}},result:{value:{accepted:false}},blocked:[d('blocked1'),d('blocked2')],lock:null},
 {kind:'mathematical',namespace:'C:/synthetic/math',request:{value:{id:'pending'}},result:null,blocked:[],lock:{descriptor:d('lock'),value:'pending'}}],
 files:[{...d('non-json.lock'),rootId:'r',aliases:['C:/alias/non-json.lock']}],archivedBindings:{old:'immutable-hash'},externalPrivate:[{legacyPrivateResultFailure:true}],
 retired:[{kind:'design',designSha256:sha('retired')},{kind:'skeleton',anchors:['fixed']},{kind:'reference-family',references:[d('family')]}],
 constructionOwnerFacts:[{owner:'original',definition:{path:'owner-bytes',sha256:sha('owner')}}],closedExperimentIds:['old','new'],closedCampaigns:[{consumedInputs:1,maximumInputs:1}],
 unknownFuture:{first:{a:1,b:2},ordered:['old','new']}};}
test('complete bundle, failed/pending guards and unknown fields survive unchanged',()=>{
 const source=fullMetadata(),saved=clone(source),copy=clone(source),keys=Object.keys(source);assert.equal(compareEveryCheckpointField(copy,source).length,keys.length);assert.deepEqual(copy,source);
 assert.equal(compareEveryCheckpointField(copy,source,{consume:true}).length,keys.length);assert.deepEqual(copy,{});assert.deepEqual(source,saved);
});
test('dropping any field, guard, namespace, blocked alias, retired family or byte binding is refused',()=>{
 const original=fullMetadata(),mutations=[q=>delete q.unknownFuture,q=>q.extra=true,q=>q.publicStocks[0].retryIdentitySha256=sha('new'),q=>q.nearPools.history=[],q=>q.nearPools.old450=[],
 q=>q.terminalRecords.shift(),q=>q.terminalRecords[0].blocked.pop(),q=>q.terminalRecords[1].lock=null,q=>q.terminalRecords[0].namespace='C:/other',
 q=>q.files[0].sha256=sha('new'),q=>q.files[0].aliases=[],q=>q.archivedBindings.old='new',q=>q.retired.pop(),q=>q.externalPrivate=[],q=>q.constructionOwnerFacts=[],q=>q.closedCampaigns[0].consumedInputs=0];
 for(const mutate of mutations){const q=clone(original);mutate(q);assert.throws(()=>compareEveryCheckpointField(q,original));}
});
test('top-level, nested JSON key and array ordering are preserved exactly',()=>{
 const original=fullMetadata();assert.throws(()=>compareEveryCheckpointField(Object.fromEntries(Object.entries(original).reverse()),original));
 const nested=clone(original);nested.unknownFuture.first={b:2,a:1};assert.throws(()=>compareEveryCheckpointField(nested,original));
 const arrays=clone(original);arrays.unknownFuture.ordered.reverse();assert.throws(()=>compareEveryCheckpointField(arrays,original));
});
test('membership digest includes non-JSON locks and distinguishes missing/new/renamed roots or files',()=>{
 const canonical=p=>p.toLowerCase().replaceAll('\\','/'),a={r:['C:\\synthetic\\a.json','C:\\synthetic\\pending.lock']},b={r:['c:/synthetic/pending.lock','c:/synthetic/a.json']};
 assert.deepEqual(membershipDigest(a,canonical),membershipDigest(b,canonical));
 for(const changed of [{r:b.r.slice(1)},{r:[...b.r,'c:/synthetic/new']},{r:['c:/synthetic/renamed.lock',b.r[1]]},{other:b.r}])assert.notDeepEqual(membershipDigest(a,canonical),membershipDigest(changed,canonical));
});
test('declared metadata listing retains every old and delta member without aliases duplicating identity',()=>{
 const scope={roots:[{id:'r'}]},canonical=p=>p.toLowerCase(),state={bundle:{files:[{rootId:'r',path:'OLD.lock'},{rootId:null,path:'external'}]}},delta={files:[{rootId:'r',path:'new.json'}]};
 assert.deepEqual(declaredMembers(state,delta,scope,canonical),{r:['OLD.lock','new.json']});
 assert.throws(()=>declaredMembers(state,{files:[{rootId:'r',path:'old.LOCK'}]},scope,canonical));
 assert.throws(()=>declaredMembers(state,{files:[{rootId:'unknown',path:'new'}]},scope,canonical));
});
test('500MB cap is unchanged and rejects overflow, negative, unsafe, nonfinite values without allocation',()=>{
 assert.equal(assertBundleByteCount(MAX_BYTES),500000000);for(const n of [MAX_BYTES+1,-1,Infinity,NaN,1.5,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>assertBundleByteCount(n));
});
test('bridge changes checkpoint head only and carries immutable origin chain/comparison/unsealed references',()=>{
 const f=fixture(),cp=d('new-checkpoint'),p=d('provenance'),b=bridgeFields(f.c,f.h,cp,p);
 assert.equal(b.headSha256,cp.sha256);assert.equal(b.previousLogicalHeadSha256,f.h.headSha256);assert.notEqual(b.headSha256,b.previousLogicalHeadSha256);
 assert.deepEqual(b.completeHistoryDeltas,[]);assert.deepEqual(b.sourceOrderedDeltas,f.h.completeHistoryDeltas);assert.deepEqual(b.comparisonEvidence,f.h.comparisonEvidence);assert.deepEqual(b.previousUnsealedHistory,f.h.previousUnsealedHistory);
 assert.equal(b.unsealedHistoryRequiresNewBinding,true);assert.equal(b.failedParentRolesMustBeAuthenticatedByConsumer,true);assert.equal(b.comparisonOnlyFactsMergedIntoSealedBase,false);
 assert.deepEqual(b.minimumHistory,MINIMUM_HISTORY);assert.equal(b.minimumPrefixLength,38);assert.equal(b.minimumHeadSha256,MINIMUM_HEAD);assert.deepEqual(b.sourceExecutionExit,f.c.latestExecutionExit);
 assert.equal(b.checkpointReview,undefined,'Unsigned pure fields cannot claim independent review');for(const[k,v]of Object.entries(ZERO))assert.equal(b[k],v);
});

async function tempDirectory(t){
 const p=path.resolve(await fs.mkdtemp(path.join(os.tmpdir(),'checkpoint10-metadata-')));
 assert.equal(path.dirname(p),path.resolve(os.tmpdir()));assert(path.basename(p).startsWith('checkpoint10-metadata-'));
 t.after(()=>fs.rm(p,{recursive:true,force:true}));return p;
}
test('10 full-field comparison after bounded multi-shard storage preserves every unknown field and order',async t=>{
 const source=fullMetadata();source.unknownFuture.unicode='😀\ud800\u0000'.repeat(40);
 Object.defineProperty(source.unknownFuture,'__proto__',{value:{unknown:'original'},enumerable:true});
 const before=hashJsonStream(source),directory=path.join(await tempDirectory(t),'pack');
 const p=await writeHistoryPack(source,{directory,maxTotalBytes:2_000_000_000,chunkTargetBytes:128});assert(p.manifest.chunks.length>10);
 const saved=await readHistoryPack(p.descriptor,{maxTotalBytes:2_000_000_000});
 assert.equal(compareEveryCheckpointField(saved.value,source).length,Object.keys(source).length);
 assert.deepEqual(hashJsonStream(saved.value),before);assert.deepEqual(hashJsonStream(source),before);
 assert.equal(hashJsonStream(source,{canonical:true}).sha256,p.manifest.canonicalProjectionSha256);
 assert.deepEqual(await assertPackDirectory(directory,p.manifest),expectedPackFiles(p.manifest));
 assert.equal(compareEveryCheckpointField(saved.value,source,{consume:true}).length,Object.keys(source).length);assert.deepEqual(saved.value,{});
});
test('pack filename contract requires one manifest and contiguous exact chunk names',()=>{
 const manifest={chunks:[{file:'chunk-000000.json'},{file:'chunk-000001.json'}]};
 assert.deepEqual(expectedPackFiles(manifest),['chunk-000000.json','chunk-000001.json','manifest.json']);
 for(const files of [[],['chunk-000001.json'],['../chunk-000000.json'],['chunk-000000.json','chunk-000000.json']])
  assert.throws(()=>expectedPackFiles({chunks:files.map(file=>({file}))}));
});
test('pack directory validation rejects missing, extra and nonregular members',async t=>{
 const root=await tempDirectory(t),directory=path.join(root,'pack'),p=await writeHistoryPack({a:1},{directory,maxTotalBytes:100000,chunkTargetBytes:128});
 const extra=path.join(directory,'unexpected.lock');await fs.writeFile(extra,'extra');await assert.rejects(assertPackDirectory(directory,p.manifest),/Extra or missing/);await fs.unlink(extra);
 const first=path.join(directory,p.manifest.chunks[0].file),backup=path.join(root,'saved-chunk');await fs.rename(first,backup);
 await assert.rejects(assertPackDirectory(directory,p.manifest),/Extra or missing/);
 await fs.mkdir(first);await assert.rejects(assertPackDirectory(directory,p.manifest),/regular files/);await fs.rmdir(first);await fs.rename(backup,first);
 assert.deepEqual(await assertPackDirectory(directory,p.manifest),expectedPackFiles(p.manifest));
});
test('pack directory validation rejects directory junctions or symlinks as members and roots',async t=>{
 const root=await tempDirectory(t),directory=path.join(root,'pack'),target=path.join(root,'target');await fs.mkdir(target);
 const p=await writeHistoryPack(null,{directory,maxTotalBytes:100000,chunkTargetBytes:128});
 const first=path.join(directory,p.manifest.chunks[0].file);await fs.unlink(first);
 await fs.symlink(target,first,process.platform==='win32'?'junction':'dir');
 await assert.rejects(assertPackDirectory(directory,p.manifest),/regular files/);
 const alias=path.join(root,'pack-alias');await fs.symlink(directory,alias,process.platform==='win32'?'junction':'dir');
 await assert.rejects(assertPackDirectory(alias,p.manifest),/real directory/);
});
