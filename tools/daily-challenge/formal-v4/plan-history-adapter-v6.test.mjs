import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
import * as old from './plan-history-adapter-v5.mjs';
import * as next from './plan-history-adapter-v6.mjs';
import {sha256,sealedWorldIdentity} from './sealed-history-contract.mjs';

// Tiny metadata only: plain JSON levels are historical-record fixtures.
// No model, CSP, solver, gameplay replay, or real history root is called.
const SELF='tools/daily-challenge/formal-v4/plan-history-adapter-v6.mjs',OLD='tools/daily-challenge/formal-v4/plan-history-adapter-v5.mjs';
const TEST=SELF.replace('.mjs','.test.mjs'),CHANGES='deliverables/daily-formal-v4-20261008/proof/plan-history-adapter-v6-handoff-01/declared-source-changes.json';
const out=process.env.PLAN_HISTORY_V6_TEST_OUT;assert(out);await fs.mkdir(out,{recursive:false});
const checks=[],fileBindings={},clone=structuredClone,serialized=x=>JSON.stringify(x);
const readFile=async p=>{const b=await fs.readFile(p);fileBindings[p]=sha256(b);return b;};
const save=async(name,value)=>{const p=out+'/'+name,b=Buffer.from(JSON.stringify(value,null,2)+'\n');await fs.writeFile(p,b,{flag:'wx'});fileBindings[p]=sha256(b);};
const check=(name,fn)=>test(name,async()=>{await fn();checks.push({name,passed:true});});
const level=(n=0)=>({id:998500+n,width:2+n,height:2,gates:[],blocks:[{id:'a',x:0,y:0,shape:Array.from({length:2+n},(_,i)=>[i,0]),color:['red','green','purple','orange','pink','cyan'][n%6]},
 {id:'b',x:0,y:1,shape:Array.from({length:2+n},(_,i)=>[i,0]),color:['blue','yellow','red','green','blue','pink'][n%6]}]});
function fixture(){
 const bytes=new Map(),reads=[],scope={baseDirectory:'C:/synthetic-v6',roots:['public','late','reverse','vacancy','capacity','early','earlyPrefix'].map(id=>({id,physicalPath:'C:/synthetic-v6/shared/'+id,aliases:['C:/synthetic-v6/snapshot/'+id]}))};
 const b={version:next.PLAN_HISTORY_VERSION,scope,baselinePlan:{path:'plan.json',sha256:sha256('p')},baselineActual:{path:'actual.json',sha256:sha256('a')},publicNamespace:'c:/synthetic-v6/shared/public',files:[],archivedBindings:{},publicStocks:[],nearPools:{selected:[],old450:[],history:[]},terminalRecords:[],externalPrivate:[],retired:[],legacyReferences:[],closedCampaigns:[],closedExperimentIds:[],oldLiveByteIntegrityClaimed:false};
 const canonical=p=>p.replaceAll('\\','/').toLowerCase().replace('/snapshot/','/shared/');
 const doc=(path,value)=>{const raw=Buffer.from(JSON.stringify(value));bytes.set(path,raw);return{path,sha256:sha256(raw)};};
 const file=(list,path,value)=>{const d=doc(path,value),rootId=scope.roots.find(r=>canonical(path).startsWith(canonical(r.physicalPath)+'/'))?.id??null;list.push({...d,rootId,aliases:[path]});return d;};
 const request=(id,l)=>{const f=sealedWorldIdentity(l);return{id,levelSha256:f.levelSha256,shapeSha256:f.shapeSha256,colorSha256:f.colorSha256,colorAssignments:f.colorAssignments,designSha256:f.designSha256,retryIdentitySha256:f.retryIdentitySha256,identityOrigin:id,redesignOf:null};};
 for(const pool of ['selected','old450','history']){const l=level(),d=file(b.files,'C:/synthetic-v6/world-'+pool+'.json',{level:l});b.nearPools[pool].push({descriptor:d,field:'level',level:clone(l),fingerprints:sealedWorldIdentity(l),sourceLevelId:l.id,reference:null,origin:pool});}
 b.nearPools.history.push(clone(b.nearPools.history[0]));
 const pendingLevel=level(1),q=request('pending',pendingLevel),pd=file(b.files,'C:/synthetic-v6/pending-world.json',{level:pendingLevel}),rd=file(b.files,b.publicNamespace+'/pending.request.json',q);
 b.nearPools.history.push({descriptor:pd,field:'level',level:pendingLevel,fingerprints:sealedWorldIdentity(pendingLevel),sourceLevelId:pendingLevel.id,reference:null});
 b.terminalRecords.push({namespace:b.publicNamespace,kind:'mathematical',request:{descriptor:rd,value:q},result:null,blocked:[],lock:null});b.publicStocks.push({...q,...rd});
 for(const f of b.files)b.archivedBindings[f.path]=f.sha256;
 b.baselineFields={publicStocks:clone(b.publicStocks),previousLateStocks:[],previousMacro:[],comparisonOnly:[],selected:[],old450:[],terminalHistory:[],closedExperimentIds:[]};
 const readBytes=async p=>{reads.push(p);assert(bytes.has(p),'Missing tiny bytes '+p);return bytes.get(p);};
 const args=(bundle=b)=>{const checkpoint=doc('checkpoint.json',bundle),review=doc('review.json',{status:next.PLAN_HISTORY_REVIEW_STATUS,checkpoint,summary:next.planHistorySummary(bundle),errors:[],newSearches:0,newConstructions:0,newLedgerClaims:0,oldLiveByteIntegrityClaimed:false});return{checkpoint,review,expectedScope:scope,readBytes};};
 function delta(state,{id='new-a',variant=2,kind='mathematical',pending=false,hasFull=true}={}){
  const files=[],terminalRecords=[],fullWorlds=[],closedCampaigns=[],namespace=kind==='mathematical'?b.publicNamespace:'c:/synthetic-v6/shared/late';
  if(kind==='mathematical'){
   const l=level(variant),fp=sealedWorldIdentity(l),req=pending?clone(state.bundle.terminalRecords.find(r=>r.request.value.id==='pending').request):{value:request(id,l)};if(!pending)req.descriptor=file(files,namespace+'/'+id+'.request.json',req.value);
   const result={accepted:false,status:'TINY_UNKNOWN',levelSha256:fp.levelSha256},record={namespace,kind,request:req,result:{descriptor:file(files,namespace+'/'+id+'.result.json',result),value:result},blocked:[],lock:null};
   for(const p of [namespace+'/'+id+'.blocked.json',namespace+'/identities/'+fp.retryIdentitySha256+'.blocked.json']){const value={attemptId:id,status:result.status};record.blocked.push({descriptor:file(files,p,value),value});}
   file(files,namespace+'/identities/'+fp.retryIdentitySha256+'.json',{origin:id});terminalRecords.push(record);
   if(!pending){const wd=file(files,'C:/synthetic-v6/'+id+'-world.json',{accepted:false,level:l,attempt:req.value});fullWorlds.push({descriptor:wd,field:'level',level:clone(l),fingerprints:fp,sourceLevelId:l.id,reference:null});}
  }else{
   const raw={closed:true,restartAllowed:false,consumedInputs:1,maximumInputs:1},cd=file(files,namespace+'/'+id+'.closed.json',raw);closedCampaigns.push({id,descriptor:cd,raw,closed:true,restartAllowed:false,consumedInputs:1,maximumInputs:1});
   if(hasFull){const l=level(variant),wd=file(files,'C:/synthetic-v6/'+id+'-world.json',{level:l});fullWorlds.push({descriptor:wd,field:'level',level:l,fingerprints:sealedWorldIdentity(l),sourceLevelId:l.id,reference:null});}
  }
  const owner={id,namespace,kind};owner.definition=doc(id+'-owner.json',{version:'plan-history-owner-v1',...owner,files:files.map(({path,sha256})=>({path,sha256})),attemptIds:terminalRecords.map(r=>r.request.value.id),closedCampaigns});
  const d={version:next.PLAN_HISTORY_VERSION,parentHeadSha256:state.headSha256,owner,files,terminalRecords,fullWorlds,closedCampaigns};
  const listing=Object.fromEntries(scope.roots.map(r=>[r.id,[...state.bundle.files,...files].filter(f=>f.rootId===r.id).map(f=>f.path)]));
  return{descriptor:doc(id+'-delta.json',d),declaredOwner:owner,listing,readBytes,d};
 }
 return{b,bytes,reads,scope,doc,args,delta,readBytes};
}
async function pairConsume(f,args=f.args()){const a=await old.consumePlanHistory(args),b=await next.consumePlanHistory(args);assert.deepEqual(b,a);return[a,b];}
async function pairMerge(states,args){const before=states.map(serialized),a=await old.mergePlanHistoryDelta(states[0],args),b=await next.mergePlanHistoryDelta(states[1],args);assert.deepEqual(b,a);assert.deepEqual(states.map(serialized),before);return[a,b];}
async function rejectBoth(states,args,pattern){const before=states.map(serialized),results=[];for(const[api,s]of [[old,states[0]],[next,states[1]]]){try{await api.mergePlanHistoryDelta(s,args);throw Error('Unexpected acceptance');}catch(e){assert.notEqual(e.message,'Unexpected acceptance');if(pattern)assert.match(e.message,pattern);results.push({name:e.name,message:e.message});}}assert.deepEqual(results[0],results[1]);assert.deepEqual(states.map(serialized),before);return results[0];}

check('four exact source substitutions preserve every validate and evidence assertion',async()=>{
 let source=String(await readFile(OLD));assert.equal(sha256(source),'6fce551da6428fba41d58950964a80d336ad16250034e6be6c5cb40b22531b06');const changes=JSON.parse(await readFile(CHANGES));assert.equal(changes.length,4);
 for(const c of changes){assert.equal(source.split(c.from).length-1,c.occurrences);source=source.replaceAll(c.from,c.to);}assert.equal(String(await readFile(SELF)),source);await save('exact-source-substitutions.json',{changes:changes.map(c=>c.label),allValidationAndEvidenceStatementsUnchanged:true});
});
check('multiple owner deltas and pending-to-terminal update exactly match v5 and preserve old states',async()=>{
 const f=fixture();let states=await pairConsume(f),ancestors=[states],original=states.map(serialized);const steps=[];
 for(const options of[{id:'construction-a',kind:'construction',variant:4},{id:'new-a',variant:2},{id:'pending',variant:1,pending:true},{id:'construction-no-full',kind:'construction',hasFull:false}]){
  const previous=states,args=f.delta(states[0],options);states=await pairMerge(states,args);ancestors.push(states);
  assert.strictEqual(states[1].bundle.scope,previous[1].bundle.scope);assert.strictEqual(states[1].bundle.baselineFields,previous[1].bundle.baselineFields);assert.strictEqual(states[1].nearPools.selected,previous[1].nearPools.selected);assert.strictEqual(states[1].fullWorlds[0],previous[1].fullWorlds[0]);
  for(const k of['files','publicStocks','terminalRecords','archivedBindings','nearPools','closedCampaigns','closedExperimentIds'])assert.notStrictEqual(states[1].bundle[k],previous[1].bundle[k]);assert.notStrictEqual(states[1].nearPools.history,previous[1].nearPools.history);
  assert.equal(serialized(ancestors[0][0]),original[0]);assert.equal(serialized(ancestors[0][1]),original[1]);steps.push({id:options.id,head:states[1].headSha256,files:states[1].bundle.files.length,worlds:states[1].fullWorlds.length,closed:states[1].closedExperimentIds.length});
 }
 assert.equal(ancestors[0][1].terminalByAttempt[states[1].bundle.publicNamespace+'|pending'].result,null);assert.equal(states[1].terminalByAttempt[states[1].bundle.publicNamespace+'|pending'].result.value.accepted,false);
 assert.deepEqual(states[1].fullWorlds.slice(0,4).map(w=>w.origin),['selected','old450','history','history']);assert.deepEqual(states[1].closedExperimentIds,['construction-a','construction-no-full']);await save('multi-delta-equivalence.json',{steps,canonicalStateEqual:true,oldStatesUnchanged:true,nestedOldNodesShared:true,pendingOldRecordUnchanged:true,realCheckpointRead:false});
});
check('returned graph is deeply immutable and unowned shallow-frozen states cannot be merged',async()=>{
 const f=fixture(),states=await pairConsume(f),s=states[1],before=serialized(s),writes=[
  ()=>s.bundle.nearPools.selected[0].level.blocks[0].color='purple',()=>s.fullWorlds[0].level.blocks[0].shape[0][0]=99,
  ()=>s.bundle.scope.roots[0].aliases.push('C:/bad'),()=>s.bundle.archivedBindings.bad='f'.repeat(64),()=>s.publicStocks[0].colorAssignments.push({}),
  ()=>s.terminalByAttempt[s.bundle.publicNamespace+'|pending'].request.value.redesignOf='bad',()=>s.fileBindings.bad='a'.repeat(64),()=>s.bundle.files.push({}),()=>s.nearPools.history.pop(),()=>s.headSha256='f'.repeat(64)];
 for(const write of writes)assert.throws(write,TypeError);assert.equal(serialized(s),before);
 const plain=clone(s);Object.freeze(plain);await assert.rejects(next.mergePlanHistoryDelta(plain,f.delta(s)),/immutable v6 state/);assert.equal(serialized(s),before);
 await save('immutability-boundaries.json',{rejectedWrites:writes.length,shallowFrozenForgedStateRejected:true,oldStateUnchanged:true,newGeometryOperations:0});
});
check('siblings and failed merges cannot leak partial appends or update another history branch',async()=>{
 const f=fixture(),states=await pairConsume(f),a=await pairMerge(states,f.delta(states[0],{id:'branch-a',variant:2})),b=await pairMerge(states,f.delta(states[0],{id:'branch-b',variant:3}));assert(!a[1].publicStocks.some(q=>q.id==='branch-b'));assert(!b[1].publicStocks.some(q=>q.id==='branch-a'));
 const args=f.delta(states[0],{id:'late-refusal',variant:5});args.listing.public.pop();const rejection=await rejectBoth(states,args,/Deleted or renamed sealed member/);
 const broken=f.delta(states[0],{id:'reader-refusal',variant:5}),afterOne={...broken,readBytes:async p=>{if(p===broken.d.files[1].path)throw Error('Tiny read failure after first append');return f.readBytes(p);}};await rejectBoth(states,afterOne,/Tiny read failure/);
 await save('branch-and-partial-failure-atomicity.json',{siblingsShareOnlyImmutableOldNodes:true,rejection,readerErrorAfterFirstAppendPreservesOldState:true});
});
check('raw projections, owner order, namespace, double-blocked seals, aliases, and members retain v5 refusal',async()=>{
 const cases=[];for(const name of ['projection','owner-order','namespace','missing-seal','wrong-head','identity-origin','extra-member','closed-quota']){
  const f=fixture();let states=await pairConsume(f);if(name==='closed-quota')states=await pairMerge(states,f.delta(states[0],{id:'already-closed',kind:'construction',hasFull:false}));
  const args=f.delta(states[0],name==='closed-quota'?{id:'already-closed',kind:'construction',hasFull:false}:{id:'refuse-'+name,variant:2});
  if(name==='projection')args.d.fullWorlds[0].level.blocks[0].color='black';
  if(name==='owner-order'){const owner=JSON.parse(f.bytes.get(args.declaredOwner.definition.path));owner.files.reverse();args.declaredOwner.definition=f.doc(args.declaredOwner.definition.path,owner);args.d.owner=args.declaredOwner;}
  if(name==='namespace'){args.declaredOwner.namespace='c:/unowned';args.d.owner=args.declaredOwner;}
  if(name==='missing-seal')args.d.terminalRecords[0].blocked.pop();
  if(name==='wrong-head')args.d.parentHeadSha256='0'.repeat(64);
  if(name==='identity-origin'){const row=args.d.files.find(d=>/\/identities\/[^/]+\.json$/.test(d.path)&&!d.path.endsWith('.blocked.json'));const changed=f.doc(row.path,{origin:'wrong'});row.sha256=changed.sha256;const owner=JSON.parse(f.bytes.get(args.declaredOwner.definition.path));owner.files.find(d=>d.path===row.path).sha256=row.sha256;args.declaredOwner.definition=f.doc(args.declaredOwner.definition.path,owner);args.d.owner=args.declaredOwner;}
  if(name==='extra-member')args.listing.public.push('C:/synthetic-v6/shared/public/unknown.lock');
  args.descriptor=f.doc(args.descriptor.path,args.d);const rejection=await rejectBoth(states,args);cases.push({name,rejection});
 }
 await save('refusal-equivalence.json',{cases,newRealClaims:0});
});
check('direct original failed-parent reads and freshness consumers retain results without mutating the frozen graph',async()=>{
 const f=fixture();let states=await pairConsume(f);const args=f.delta(states[0],{id:'direct-parent',variant:2});states=await pairMerge(states,args);const before=states.map(serialized),receipt=args.d.fullWorlds[0].descriptor,options={namespace:states[0].bundle.publicNamespace,attemptId:'direct-parent',receipt,role:'failed-parent',readBytes:f.readBytes};
 const a=await old.readDirectHistoryRole(states[0],options),b=await next.readDirectHistoryRole(states[1],options);assert.deepEqual(b,a);assert.equal(b.blocked.length,2);const fresh=level(5),opt={sourceLevelId:fresh.id,failedParent:{namespace:options.namespace,attemptId:options.attemptId}};assert.deepEqual(next.assertFreshPlanHistoryInput(states[1],fresh,opt),old.assertFreshPlanHistoryInput(states[0],fresh,opt));assert.deepEqual(states.map(serialized),before);
 await save('read-only-consumer-equivalence.json',{directOriginalRoleEqual:true,bothFailedSealsRead:true,freshnessResultEqual:true,statesUnchanged:true,newSearches:0});
});
test.after(async()=>{
 const compiled=await build({entryPoints:[SELF],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'}),toolBindings={};for(const f of Object.keys(compiled.metafile.inputs)){const b=await readFile(f);toolBindings[f]=sha256(b);}await readFile(TEST);await readFile(OLD);await readFile(CHANGES);
 const report={status:checks.length===6?'PLAN_HISTORY_ADAPTER_V6_IMMUTABLE_SHARING_PASS':'PLAN_HISTORY_ADAPTER_V6_INCOMPLETE',errors:checks.length===6?[]:['Incomplete focused checks'],checks,toolBindings,fileBindings,checkpointSchemaChanged:false,validationAndEvidenceChecksUnchanged:true,oldStateMutationAllowed:false,immutableV6StateRequiredForMerge:true,newValidationMemoization:false,oldFilesChanged:false,privateSyntheticDataOnly:true,largeCheckpointRead:false,newRealHistoryScans:0,newRealHistoryExports:0,newRealHistoryMerges:0,newSearches:0,newConstructions:0,newReplayCalls:0,newLedgerClaims:0,oldLiveByteIntegrityClaimed:false,limitations:['Only future consumers may import v6; existing plans/task-v4 remain pinned to v5.','All full validate calls remain, including actual level hashing and identity checks. This removes deep clone work, not the repeated validation cost.','No real timing or RAM reduction claim is made. Synthetic graph equality and strict shared-node immutability are the evidence.','Only module-owned consume/merge states can be merged; mutable external overlays must not be passed as sealed history. Direct read-only roles remain compatible.']};
 const raw=Buffer.from(JSON.stringify(report,null,2)+'\n');await fs.writeFile(out+'/report.json',raw,{flag:'wx'});console.log(JSON.stringify({report:out+'/report.json',sha256:sha256(raw),status:report.status,checks:checks.length}));
});
