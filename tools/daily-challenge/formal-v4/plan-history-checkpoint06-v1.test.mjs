import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {SELF as AUTHOR,ORIGINAL,REVIEW,TOOLS,ADAPTER_QUALIFICATION,PREDECESSOR,assertPostN20ResealInput,membershipDigest,assertMergedCounts} from './reseal-plan-history-checkpoint06-v1.mjs';
import {SELF as REVIEWER,AUTHOR_SCRIPT,compareEveryCheckpointField} from './review-plan-history-checkpoint06-v1.mjs';

const SELF='tools/daily-challenge/formal-v4/plan-history-checkpoint06-v1.test.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex'),clone=x=>structuredClone(x);
// Deliberately synthetic declaration records, not game worlds or real future
// descriptors. Neither production reseal function nor the adapter is invoked.
function fixture({accepted=false,claim=true}={}){
 const d=n=>({path:'__synthetic_metadata_only__/'+n,sha256:sha(n)}),v='accepted-ice20-one-final-bomb-d3-v1';
 const delta=(n,kind)=>({descriptor:d('delta-'+n),declaredOwner:{id:'owner-'+n,kind,namespace:'__synthetic__',definition:d('owner-'+n)}});
 const old=[delta(1,'construction'),delta(2,'mathematical')],tail=[delta(3,'construction'),delta(4,'mathematical')];
 const h={status:'ACCEPTED_ICE20_BOMB_HISTORY_DELTAS_EXPORTED_AND_V7_VALIDATED',errors:[],checkpoint:clone(ORIGINAL),checkpointReview:clone(REVIEW),
  context:d('context'),plan:d('plan'),completion:d('completion'),actualAudit:d('actual'),planAudit:d('plan-audit'),priorHistoryReport:d('prior'),constructorOwner:tail[0].declaredOwner.definition,mathOwner:tail[1].declaredOwner.definition,selection:d('selection'),designDisposition:d('holds'),
  priorHistoryDeltas:old,historyDeltas:tail,completeHistoryDeltas:[...old,...tail],previousHeadSha256:old.at(-1).descriptor.sha256,headSha256:tail.at(-1).descriptor.sha256,
  checkpointReexported:false,oldFilesChanged:false,oldLiveByteIntegrityClaimed:false,comparisonOnlyFactsMergedIntoSealedBase:false,newSearches:0,newConstructions:0,newLedgerClaims:0,newCspCalls:0,newReplayCalls:0,
  historyScope:{roots:Array.from({length:7},(_,i)=>({id:'synthetic-root-'+i}))},candidates:[d('candidate')],persistedConstructionWorldFiles:[d('construction')],unpersistedInputs:[],before:{closedCampaigns:5},summary:{maximumInputs:1,consumedInputs:1,closedCampaigns:6},candidateStatuses:[{sourceLevelId:118,levelSha256:sha('synthetic-only'),accepted}]};
 const c={version:v,history:clone(ORIGINAL),historyReview:clone(REVIEW),historyDeltas:clone(old),historyHeadSha256:h.previousHeadSha256,historyScope:clone(h.historyScope),selection:h.selection,designDisposition:h.designDisposition,targetSlot:'daily-mechanisms-bomb-120-d3-03',acceptedBaseAdaptation:true};
 const p={version:v,contextDescriptor:h.context,historyHeadSha256:h.previousHeadSha256};
 const done={version:v,plan:h.plan,status:'ACCEPTED_ICE20_BOMB_TASK_CLOSED',closed:true,restartAllowed:false,finalizationError:null,unpersistedInputs:[],maximumInputs:1,consumedInputs:1,formedFullWorlds:1,constructionOwner:h.constructorOwner,mathOwner:h.mathOwner,receipt:h.candidates[0],persistedConstructionWorldFiles:h.persistedConstructionWorldFiles,publicClaimsStarted:Number(claim),accepted:Number(accepted)};
 const a={status:'INDEPENDENT_ACCEPTED_ICE20_BOMB_ACTUAL_PASS',mode:'actual',errors:[],completion:h.completion,plan:h.plan,candidate:done.receipt,accepted:Number(accepted)};
 const q={version:v,plan:h.plan,level:{syntheticMetadataOnly:true},levelSha256:sha('synthetic-only'),sourceLevelId:118,attempt:claim?{id:'synthetic-no-publication'}:null,accepted};
 return[h,c,p,done,a,q];
}

export async function runMetadataTests(out){
 assert.equal(path.basename(process.cwd()),'frozen-workspace-4588');assert(out.startsWith('deliverables/daily-formal-v4-20261008/proof/plan-history-checkpoint06-private-'));
 await fs.mkdir(out);const bindings={},tests=[],errors=[];
 const bind=async p=>{const b=await fs.readFile(p);bindings[p]=sha(b);return b;};
 const run=(name,fn)=>{try{const facts=fn();tests.push({name,pass:true,facts});}catch(e){tests.push({name,pass:false,error:e.stack??String(e)});errors.push(name+': '+e.message);}};
 try{
  for(const p of[SELF,AUTHOR,REVIEWER,PREDECESSOR.path,REVIEW.path,ADAPTER_QUALIFICATION.path])await bind(p);
  assert.equal(bindings[AUTHOR],AUTHOR_SCRIPT.sha256);assert.equal(bindings[REVIEW.path],REVIEW.sha256);assert.equal(bindings[PREDECESSOR.path],PREDECESSOR.sha256);assert.equal(bindings[ADAPTER_QUALIFICATION.path],ADAPTER_QUALIFICATION.sha256);
  const aq=JSON.parse(await fs.readFile(ADAPTER_QUALIFICATION.path));for(const[p,h]of Object.entries(aq.toolBindings)){await bind(p);assert.equal(bindings[p],h,p);}for(const d of Object.values(TOOLS))assert.equal(bindings[d.path],d.sha256);
  run('accepted, mathematical-failure and marker-only post-n20 declarations',()=>{
   const variants=[{accepted:true,claim:false},{accepted:true,claim:true},{accepted:false,claim:true},{accepted:false,claim:false}];
   for(const options of variants){const f=fixture(options);assert.deepEqual(assertPostN20ResealInput(...f),f[0].completeHistoryDeltas);}return{variants:4,syntheticOnly:true};
  });
  run('missing/reordered/duplicate chain, wrong original anchor or owner are refused',()=>{
   const mutations=[f=>f[0].completeHistoryDeltas.pop(),f=>f[0].completeHistoryDeltas.reverse(),f=>{f[0].historyDeltas[0].descriptor.path=f[0].priorHistoryDeltas[0].descriptor.path;},f=>f[0].headSha256=sha('bad-head'),f=>f[0].previousHeadSha256=sha('bad-prior-head'),f=>f[0].checkpoint.sha256=sha('unreviewed-checkpoint'),f=>f[0].historyDeltas[0].declaredOwner.kind='mathematical',f=>f[0].constructorOwner={path:'other',sha256:sha('other')},f=>f[1].historyDeltas.pop()];
   for(const mutate of mutations){const f=fixture();mutate(f);assert.throws(()=>assertPostN20ResealInput(...f));}return{refusals:mutations.length};
  });
  run('interrupted, unpersisted, wrong-candidate and non-metadata execution declarations refused',()=>{
   const mutations=[f=>f[3].finalizationError='I/O failure',f=>f[3].closed=false,f=>f[3].restartAllowed=true,f=>f[3].unpersistedInputs.push({synthetic:true}),f=>f[3].consumedInputs=0,f=>f[3].formedFullWorlds=0,f=>f[4].errors.push('bad actual'),f=>f[4].candidate={path:'other',sha256:sha('other')},f=>f[5].level=null,f=>f[5].sourceLevelId=29,f=>f[0].newSearches=1,f=>f[0].oldFilesChanged=true,f=>f[0].comparisonOnlyFactsMergedIntoSealedBase=true,f=>f[0].summary.closedCampaigns=5];
   for(const mutate of mutations){const f=fixture();mutate(f);assert.throws(()=>assertPostN20ResealInput(...f));}return{refusals:mutations.length};
  });
  run('every top-level field including unknown fields and every nested array preserved',()=>{
   const original={version:'synthetic',files:[{path:'a',sha256:sha('a')}],nearPools:{selected:[{x:1}],old450:[{x:2}],history:[{x:3}]},terminalRecords:[{legacyPrivateResultFailure:true},{id:2}],externalPrivate:[{raw:{nested:['first','second']}}],closedCampaigns:[{raw:{formedWorldFiles:['level','projection']}}],unknownFutureField:{mustRemain:[1,2]}};
   const fresh=clone(original),unchanged=clone(original),rows=compareEveryCheckpointField(fresh,original);assert.equal(rows.length,Object.keys(original).length);assert.deepEqual(fresh,original);
   const mutations=[q=>delete q.unknownFutureField,q=>q.extra=true,q=>q.nearPools.history.pop(),q=>q.terminalRecords.reverse(),q=>q.externalPrivate[0].raw.nested.reverse(),q=>q.closedCampaigns[0].raw.formedWorldFiles.pop(),q=>q.files[0].sha256=sha('changed'),q=>q.unknownFutureField.mustRemain[0]=9];
   for(const mutate of mutations){const q=clone(original);mutate(q);assert.throws(()=>compareEveryCheckpointField(q,original));}
   const reordered=Object.fromEntries(Object.entries(original).reverse());assert.throws(()=>compareEveryCheckpointField(reordered,original));
   assert.equal(compareEveryCheckpointField(fresh,original,{consume:true}).length,rows.length);assert.deepEqual(fresh,{});assert.deepEqual(original,unchanged);return{fields:rows.length,refusals:mutations.length+1,candidateOnlyReleasedAfterComparison:true};
  });
  run('membership includes non-JSON locks and is canonical-order independent',()=>{
   const canonical=p=>p.toLowerCase().replaceAll('\\','/'),a={r:['C:\\sealed\\a.json','C:\\sealed\\b.lock']},b={r:['c:/sealed/b.lock','c:/sealed/a.json']};assert.deepEqual(membershipDigest(a,canonical),membershipDigest(b,canonical));
   for(const changed of[{r:['c:/sealed/a.json']},{r:[...b.r,'c:/sealed/new.lock']},{r:['c:/sealed/a.json','c:/sealed/different.lock']},{other:b.r}])assert.notDeepEqual(membershipDigest(a,canonical),membershipDigest(changed,canonical));return{lockNamesIncluded:true,alterationsDetected:4};
  });
  run('merged public, full history, terminal and closed counts checked separately',()=>{
   const s={publicStocks:[{}],nearPools:{history:[{},{}]},bundle:{terminalRecords:[{},{},{}]},closedCampaigns:[{},{},{},{}]},h={summary:{publicStocks:1,historyWorlds:2,terminalRecords:3,closedCampaigns:4}};
   assertMergedCounts(s,h);for(const k of Object.keys(h.summary)){const x=clone(h);x.summary[k]--;assert.throws(()=>assertMergedCounts(s,x));}return{counters:4};
  });
 }catch(e){errors.push(e.stack??String(e));}
 for(const[p,h]of Object.entries(bindings))assert.equal(sha(await fs.readFile(p)),h,'Evidence drift '+p);
 const report={schemaVersion:1,status:errors.length?'CHECKPOINT06_METADATA_PRIVATE_FAILED':'CHECKPOINT06_METADATA_PRIVATE_PASS',generatedAt:new Date().toISOString(),bindingBaseDirectory:process.cwd(),author:{path:AUTHOR,sha256:bindings[AUTHOR]},reviewer:{path:REVIEWER,sha256:bindings[REVIEWER]},test:{path:SELF,sha256:bindings[SELF]},adapterQualification:ADAPTER_QUALIFICATION,originalCheckpointDescriptorOnly:ORIGINAL,originalReview:REVIEW,tests,errors,fileBindings:bindings,toolBindings:Object.fromEntries(Object.entries(bindings).filter(([p])=>p.startsWith('tools/'))),newRealHistoryLoads:0,newRealHistoryMerges:0,newRealHistoryExports:0,newCheckpointReseals:0,newModelCalls:0,newConstructions:0,newSearches:0,newReplayCalls:0,newLedgerClaims:0,newIndependentReviews:0,productionEntryPointsCalled:false,checkpointBytesRead:false,syntheticFixturesContainGameWorlds:false,oldFilesChanged:false,limitations:'Pure metadata refusal/equality helpers only. No real post-n20 report or future head supplied, no checkpoint bytes read, no production history reconstruction, no independent review signed. Full production equivalence and seven-root membership remain mandatory at actual execution.'};
 const bytes=JSON.stringify(report,null,2)+'\n';await fs.writeFile(out+'/report.json',bytes,{flag:'wx'});const d={path:out+'/report.json',sha256:sha(bytes)};console.log(JSON.stringify({report:d,status:report.status,passed:tests.filter(t=>t.pass).length,total:tests.length,errors}));assert.equal(errors.length,0);return d;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){assert.equal(process.argv.length,3);await runMetadataTests(process.argv[2]);}
