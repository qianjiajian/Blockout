import test from 'node:test';
import assert from 'node:assert/strict';
import {VERSION,ORIGINAL,ORIGINAL_REVIEW,ZERO,MAX_BYTES,sha,assertConfiguration,assertClosedSource,
 membershipDigest,assertBundleByteCount,compareEveryCheckpointField,bridgeFields,declaredMembers} from './reseal-plan-history-checkpoint07-v1.mjs';
import {reviewCheckpoint07} from './review-plan-history-checkpoint07-v1.mjs';

// Synthetic declarations only. No game world, actual report/checkpoint read,
// adapter import, consume/merge, production entrypoint, model, solver or claim.
const clone=x=>structuredClone(x),d=n=>({path:'__synthetic_metadata_only__/'+n,sha256:sha(n)});
function fixture({firstInput=false,accepted=false,unknownCallCount=false}={}){
 const delta=(n,kind)=>({descriptor:d('delta-'+n),declaredOwner:{id:'owner-'+n,kind,namespace:'C:/synthetic/'+kind,definition:d('owner-'+n)}});
 const old=[delta(1,'construction'),delta(2,'mathematical')],tail=[delta(3,'construction'),delta(4,'mathematical')];
 const c={version:VERSION,latestHistoryReport:d('current-history'),latestCompletion:d('current-completion'),implementationReview:d('independent-tool-review')};
 const historyScope={roots:Array.from({length:7},(_,i)=>({id:'synthetic-root-'+i,physicalPath:'C:/synthetic/root'+i,aliases:[]}))};
 const comparisonEvidence={provenance:d('comparison-provenance'),review:d('comparison-review')};
 const prior={checkpoint:clone(ORIGINAL),checkpointReview:clone(ORIGINAL_REVIEW),historyScope,errors:[],completeHistoryDeltas:old,headSha256:old.at(-1).descriptor.sha256,comparisonEvidence};
 const h={status:'AUTHORED_BASIC_HISTORY_DELTAS_EXPORTED',errors:[],checkpoint:clone(ORIGINAL),checkpointReview:clone(ORIGINAL_REVIEW),historyScope,
  priorHistoryReport:d('prior-history'),priorHistoryDeltas:old,historyDeltas:tail,completeHistoryDeltas:[...old,...tail],headSha256:tail.at(-1).descriptor.sha256,
  comparisonEvidence,previousUnsealedHistory:d('unsealed-stock'),oldLiveByteIntegrityClaimed:false,newSearches:0,newConstructions:0,newLedgerClaims:0};
 const version=firstInput?'single-authored-basic-input-once-v198-first-input':'single-authored-basic-input-once-v198';
 const done={version,status:'AUTHORED_BASIC_SINGLE_INPUT_CLOSED',closed:true,normalExportAllowed:true,restartAllowed:false,administrativeError:null,newConstructions:0,
  unpersistedOriginalMathematicalResult:null,unpersistedInputs:[],consumedInputs:1,maximumInputs:1,formedFullWorlds:1,config:d('execution-config'),plan:d('execution-plan'),input:d('authored-input'),
  constructionOwner:tail[0].declaredOwner.definition,mathOwner:tail[1].declaredOwner.definition,historyExport:c.latestHistoryReport,experimentId:'synthetic-owner',qualifierEntered:true,qualifierReturned:true,
  publicClaimsStarted:1,receipt:d('receipt'),mathematicalReceiptPersisted:true,mathematicallyAccepted:accepted,accepted:false,formalReady:false};
 done.persistedConstructionWorldFiles=[done.input];
 h.parentExecution={qualifierEntered:true,qualifierReturned:true,publicClaimsStarted:1,receipt:done.receipt,jointMathematicalCalls:unknownCallCount?null:1,nullCallCountMeaning:'Synthetic retained original uncertainty'};
 const plan={version,config:done.config,input:done.input,experimentId:done.experimentId,historyReport:h.priorHistoryReport,historyHeadSha256:prior.headSha256,historyScope,maximumInputs:1,jointCallsMaximum:1,rawWholeBoardLimit:10000,retryAllowed:false,rebandAllowed:false,fallbackAllowed:false};
 return{c,h,done,plan,prior};
}
const verify=f=>assertClosedSource(f.c,f.h,f.done,f.plan,f.prior);
function rejectAll(mutations){for(const mutate of mutations){const f=fixture();mutate(f);assert.throws(()=>verify(f));}}

test('imports expose entrypoints without executing real history',()=>assert.equal(typeof reviewCheckpoint07,'function'));
test('closed old-parent and first-input reports accepted as metadata, regardless of math acceptance',()=>{
 for(const firstInput of [false,true])for(const accepted of [false,true]){const f=fixture({firstInput,accepted});assert.deepEqual(verify(f),f.h.completeHistoryDeltas);assert.equal(f.done.mathematicallyAccepted,accepted);}
});
test('unknown original mathematical call count is retained, not rewritten as zero',()=>{
 const f=fixture({unknownCallCount:true});assert.deepEqual(verify(f),f.h.completeHistoryDeltas);assert.equal(f.h.parentExecution.jointMathematicalCalls,null);
 delete f.h.parentExecution.nullCallCountMeaning;assert.throws(()=>verify(f));
});
test('exact configuration schema requires explicit future source and completion descriptors',()=>{
 const f=fixture();assert.deepEqual(assertConfiguration(f.c),f.c);
 for(const mutation of [q=>delete q.latestCompletion,q=>q.extra=true,q=>q.latestHistoryReport.sha256='bad',q=>q.version='checkpoint06']){const q=clone(f.c);mutation(q);assert.throws(()=>assertConfiguration(q));}
});
test('partial, reordered, duplicate, detached or substituted delta chain is refused',()=>rejectAll([
 f=>f.h.completeHistoryDeltas.pop(),f=>f.h.completeHistoryDeltas.reverse(),f=>f.h.historyDeltas[0].descriptor.path=f.h.priorHistoryDeltas[0].descriptor.path,
 f=>f.h.headSha256=sha('wrong'),f=>f.prior.headSha256=sha('wrong'),f=>f.prior.completeHistoryDeltas=[],f=>f.h.checkpoint.sha256=sha('wrong'),
 f=>f.h.checkpointReview.sha256=sha('wrong'),f=>f.prior.checkpoint.sha256=sha('wrong'),f=>f.prior.historyScope={roots:[]},f=>f.h.historyScope.roots=[],
 f=>f.h.comparisonEvidence={provenance:d('substitute'),review:d('substitute-review')},f=>f.h.historyDeltas[0].declaredOwner.kind='mathematical',
 f=>f.done.constructionOwner=d('wrong'),f=>f.done.mathOwner=null,f=>f.h.historyDeltas[0].declaredOwner.definition.sha256='bad'
]));
test('unclosed execution, unknown claim, missing persisted result, changed budget and new computations refused',()=>rejectAll([
 f=>f.done.closed=false,f=>f.done.normalExportAllowed=false,f=>f.done.restartAllowed=true,f=>f.done.administrativeError='incomplete',
 f=>f.done.status='AUTHORED_BASIC_SINGLE_INPUT_ADMINISTRATIVE_FAILURE',f=>f.done.unpersistedInputs=[d('unsaved')],f=>f.done.unpersistedOriginalMathematicalResult={},
 f=>f.done.maximumInputs=2,f=>f.done.consumedInputs=0,f=>f.done.formedFullWorlds=2,f=>f.done.publicClaimsStarted=null,
 f=>f.done.qualifierReturned=false,f=>f.done.mathematicalReceiptPersisted=false,f=>f.done.persistedConstructionWorldFiles=[],
 f=>f.done.historyExport=d('wrong'),f=>f.plan.historyReport=d('wrong'),f=>f.plan.historyHeadSha256=sha('wrong'),f=>f.plan.input=d('wrong'),
 f=>f.plan.jointCallsMaximum=2,f=>f.plan.rawWholeBoardLimit=99999,f=>f.plan.retryAllowed=true,f=>f.plan.rebandAllowed=true,f=>f.plan.fallbackAllowed=true,
 f=>f.h.parentExecution.publicClaimsStarted=0,f=>f.h.parentExecution.jointMathematicalCalls=2,f=>f.h.parentExecution.receipt=d('wrong'),
 f=>f.h.newSearches=1,f=>f.h.newConstructions=1,f=>f.h.newLedgerClaims=1,f=>f.h.oldLiveByteIntegrityClaimed=true,f=>f.h.errors=['not closed']
]));
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
 assert.equal(b.checkpointReview,undefined,'Unsigned pure fields cannot claim independent review');for(const[k,v]of Object.entries(ZERO))assert.equal(b[k],v);
});
