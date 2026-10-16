import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
import * as old from './plan-history-adapter-v6.mjs';
import * as next from './plan-history-adapter-v7.mjs';
import {sha256,sealedWorldIdentity} from './sealed-history-contract.mjs';

// Tiny metadata only: plain JSON levels are historical-record fixtures.
// No model, CSP, solver, gameplay replay, or real history root is called.
const SELF='tools/daily-challenge/formal-v4/plan-history-adapter-v7.mjs',OLD='tools/daily-challenge/formal-v4/plan-history-adapter-v6.mjs';
const TEST=SELF.replace('.mjs','.test.mjs'),CHANGES='deliverables/daily-formal-v4-20261008/proof/plan-history-adapter-v7-handoff-01/declared-source-changes.json';
const out=process.env.PLAN_HISTORY_V7_TEST_OUT;assert(out);await fs.mkdir(out,{recursive:false});
const checks=[],fileBindings={},clone=structuredClone,serialized=x=>JSON.stringify(x);
const readFile=async p=>{const b=await fs.readFile(p);fileBindings[p]=sha256(b);return b;};
const save=async(name,value)=>{const p=out+'/'+name,b=Buffer.from(JSON.stringify(value,null,2)+'\n');await fs.writeFile(p,b,{flag:'wx'});fileBindings[p]=sha256(b);};
const check=(name,fn)=>test(name,async()=>{await fn();checks.push({name,passed:true});});

// Isolated test-only instrumentation: the production module has no counter,
// exported cache, trust bypass, or configuration switch. Compile its exact
// bytes with only import wrappers and a capture of successfully validated b.
const productionSource=String(await readFile(SELF));
let instrumentedSource=productionSource;
const instrumentation=[
 ["import {levelSha256} from", "import {levelSha256 as rawLevelSha256} from"],
 ["import {sha256,sealedWorldIdentity,changedHistoryShapeAndColour}", "import {sha256,sealedWorldIdentity as rawSealedWorldIdentity,changedHistoryShapeAndColour}"],
 ['pendingValidatedWorlds.set(b,pendingWorlds);','pendingValidatedWorlds.set(b,pendingWorlds);__validatedBundles.push(b);']
];
for(const[from,to]of instrumentation){assert.equal(instrumentedSource.split(from).length-1,1);instrumentedSource=instrumentedSource.replace(from,to);}
instrumentedSource+=`
const __hashCalls=new WeakMap(),__identityCalls=new WeakMap(),__validatedBundles=[];
function levelSha256(value){if(value&&typeof value==='object')__hashCalls.set(value,(__hashCalls.get(value)??0)+1);return rawLevelSha256(value);}
function sealedWorldIdentity(value){__identityCalls.set(value,(__identityCalls.get(value)??0)+1);return rawSealedWorldIdentity(value);}
export const __memoTest={has:value=>!!cachedWorld(value),hashCalls:value=>__hashCalls.get(value)??0,identityCalls:value=>__identityCalls.get(value)??0,
 hash:actualWorldHash,identity:actualWorldIdentity,sealUnvalidated:sealOwned,validateUntrusted:validate,lastValidated:()=>__validatedBundles.at(-1)};
`;
const instrumentedBuild=await build({stdin:{contents:instrumentedSource,resolveDir:path.resolve(path.dirname(SELF)),sourcefile:'v7-test-instrumentation.mjs',loader:'js'},bundle:true,packages:'external',write:false,platform:'node',format:'esm',logLevel:'silent'});
const instrumentedPath=out+'/instrumented-adapter.mjs';await fs.writeFile(instrumentedPath,instrumentedBuild.outputFiles[0].contents,{flag:'wx'});await readFile(instrumentedPath);
await save('test-only-instrumentation.json',{productionSourceSha256:sha256(productionSource),substitutions:instrumentation,scope:'Counters and private read-only cache probes exist only in the separate synthetic test bundle.',productionExportsAdded:false});
const measured=await import(pathToFileURL(path.resolve(instrumentedPath)).href),memo=measured.__memoTest;

const level=(n=0)=>({id:998500+n,width:2+n,height:2,gates:[],blocks:[{id:'a',x:0,y:0,shape:Array.from({length:2+n},(_,i)=>[i,0]),color:['red','green','purple','orange','pink','cyan'][n%6]},
 {id:'b',x:0,y:1,shape:Array.from({length:2+n},(_,i)=>[i,0]),color:['blue','yellow','red','green','blue','pink'][n%6]}]});
function fixture(){
 const bytes=new Map(),reads=[],scope={baseDirectory:'C:/synthetic-v7',roots:['public','late','reverse','vacancy','capacity','early','earlyPrefix'].map(id=>({id,physicalPath:'C:/synthetic-v7/shared/'+id,aliases:['C:/synthetic-v7/snapshot/'+id]}))};
 const b={version:next.PLAN_HISTORY_VERSION,scope,baselinePlan:{path:'plan.json',sha256:sha256('p')},baselineActual:{path:'actual.json',sha256:sha256('a')},publicNamespace:'c:/synthetic-v7/shared/public',files:[],archivedBindings:{},publicStocks:[],nearPools:{selected:[],old450:[],history:[]},terminalRecords:[],externalPrivate:[],retired:[],legacyReferences:[],closedCampaigns:[],closedExperimentIds:[],oldLiveByteIntegrityClaimed:false};
 const canonical=p=>p.replaceAll('\\','/').toLowerCase().replace('/snapshot/','/shared/');
 const doc=(path,value)=>{const raw=Buffer.from(JSON.stringify(value));bytes.set(path,raw);return{path,sha256:sha256(raw)};};
 const file=(list,path,value)=>{const d=doc(path,value),rootId=scope.roots.find(r=>canonical(path).startsWith(canonical(r.physicalPath)+'/'))?.id??null;list.push({...d,rootId,aliases:[path]});return d;};
 const request=(id,l)=>{const f=sealedWorldIdentity(l);return{id,levelSha256:f.levelSha256,shapeSha256:f.shapeSha256,colorSha256:f.colorSha256,colorAssignments:f.colorAssignments,designSha256:f.designSha256,retryIdentitySha256:f.retryIdentitySha256,identityOrigin:id,redesignOf:null};};
 for(const pool of ['selected','old450','history']){const l=level(),d=file(b.files,'C:/synthetic-v7/world-'+pool+'.json',{level:l});b.nearPools[pool].push({descriptor:d,field:'level',level:clone(l),fingerprints:sealedWorldIdentity(l),sourceLevelId:l.id,reference:null,origin:pool});}
 b.nearPools.history.push(clone(b.nearPools.history[0]));
 const pendingLevel=level(1),q=request('pending',pendingLevel),pd=file(b.files,'C:/synthetic-v7/pending-world.json',{level:pendingLevel}),rd=file(b.files,b.publicNamespace+'/pending.request.json',q);
 b.nearPools.history.push({descriptor:pd,field:'level',level:pendingLevel,fingerprints:sealedWorldIdentity(pendingLevel),sourceLevelId:pendingLevel.id,reference:null});
 b.terminalRecords.push({namespace:b.publicNamespace,kind:'mathematical',request:{descriptor:rd,value:q},result:null,blocked:[],lock:null});b.publicStocks.push({...q,...rd});
 for(const f of b.files)b.archivedBindings[f.path]=f.sha256;
 b.baselineFields={publicStocks:clone(b.publicStocks),previousLateStocks:[],previousMacro:[],comparisonOnly:[],selected:[],old450:[],terminalHistory:[],closedExperimentIds:[]};
 const readBytes=async p=>{reads.push(p);assert(bytes.has(p),'Missing tiny bytes '+p);return bytes.get(p);};
 const args=(bundle=b)=>{const checkpoint=doc('checkpoint.json',bundle),review=doc('review.json',{status:next.PLAN_HISTORY_REVIEW_STATUS,checkpoint,summary:next.planHistorySummary(bundle),errors:[],newSearches:0,newConstructions:0,newLedgerClaims:0,oldLiveByteIntegrityClaimed:false});return{checkpoint,review,expectedScope:scope,readBytes};};
 function delta(state,{id='new-a',variant=2,kind='mathematical',pending=false,hasFull=true}={}){
  const files=[],terminalRecords=[],fullWorlds=[],closedCampaigns=[],namespace=kind==='mathematical'?b.publicNamespace:'c:/synthetic-v7/shared/late';
  if(kind==='mathematical'){
   const l=level(variant),fp=sealedWorldIdentity(l),req=pending?clone(state.bundle.terminalRecords.find(r=>r.request.value.id==='pending').request):{value:request(id,l)};if(!pending)req.descriptor=file(files,namespace+'/'+id+'.request.json',req.value);
   const result={accepted:false,status:'TINY_UNKNOWN',levelSha256:fp.levelSha256},record={namespace,kind,request:req,result:{descriptor:file(files,namespace+'/'+id+'.result.json',result),value:result},blocked:[],lock:null};
   for(const p of [namespace+'/'+id+'.blocked.json',namespace+'/identities/'+fp.retryIdentitySha256+'.blocked.json']){const value={attemptId:id,status:result.status};record.blocked.push({descriptor:file(files,p,value),value});}
   file(files,namespace+'/identities/'+fp.retryIdentitySha256+'.json',{origin:id});terminalRecords.push(record);
   if(!pending){const wd=file(files,'C:/synthetic-v7/'+id+'-world.json',{accepted:false,level:l,attempt:req.value});fullWorlds.push({descriptor:wd,field:'level',level:clone(l),fingerprints:fp,sourceLevelId:l.id,reference:null});}
  }else{
   const raw={closed:true,restartAllowed:false,consumedInputs:1,maximumInputs:1},cd=file(files,namespace+'/'+id+'.closed.json',raw);closedCampaigns.push({id,descriptor:cd,raw,closed:true,restartAllowed:false,consumedInputs:1,maximumInputs:1});
   if(hasFull){const l=level(variant),wd=file(files,'C:/synthetic-v7/'+id+'-world.json',{level:l});fullWorlds.push({descriptor:wd,field:'level',level:l,fingerprints:sealedWorldIdentity(l),sourceLevelId:l.id,reference:null});}
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

check('nine declared substitutions preserve all evidence checks and add only private memo publication',async()=>{
 let source=String(await readFile(OLD));assert.equal(sha256(source),'4b62c5bdc954e3f4df1d45b6dbffa8fdfd2b8f29a1fca2e76e3376729a2d1bcf');const changes=JSON.parse(await readFile(CHANGES));assert.equal(changes.length,9);
 for(const c of changes){assert.equal(source.split(c.from).length-1,c.occurrences);source=source.replaceAll(c.from,c.to);}assert.equal(String(await readFile(SELF)),source);await save('exact-source-substitutions.json',{changes:changes.map(c=>c.label),allValidationAndEvidenceStatementsUnchanged:true});
});
check('multiple owner deltas and pending-to-terminal update exactly match v6 and preserve old states',async()=>{
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
check('raw projections, owner order, namespace, double-blocked seals, aliases, and members retain v6 refusal',async()=>{
 const cases=[];for(const name of ['projection','owner-order','namespace','missing-seal','wrong-head','identity-origin','extra-member','closed-quota']){
  const f=fixture();let states=await pairConsume(f);if(name==='closed-quota')states=await pairMerge(states,f.delta(states[0],{id:'already-closed',kind:'construction',hasFull:false}));
  const args=f.delta(states[0],name==='closed-quota'?{id:'already-closed',kind:'construction',hasFull:false}:{id:'refuse-'+name,variant:2});
  if(name==='projection')args.d.fullWorlds[0].level.blocks[0].color='black';
  if(name==='owner-order'){const owner=JSON.parse(f.bytes.get(args.declaredOwner.definition.path));owner.files.reverse();args.declaredOwner.definition=f.doc(args.declaredOwner.definition.path,owner);args.d.owner=args.declaredOwner;}
  if(name==='namespace'){args.declaredOwner.namespace='c:/unowned';args.d.owner=args.declaredOwner;}
  if(name==='missing-seal')args.d.terminalRecords[0].blocked.pop();
  if(name==='wrong-head')args.d.parentHeadSha256='0'.repeat(64);
  if(name==='identity-origin'){const row=args.d.files.find(d=>/\/identities\/[^/]+\.json$/.test(d.path)&&!d.path.endsWith('.blocked.json'));const changed=f.doc(row.path,{origin:'wrong'});row.sha256=changed.sha256;const owner=JSON.parse(f.bytes.get(args.declaredOwner.definition.path));owner.files.find(d=>d.path===row.path).sha256=row.sha256;args.declaredOwner.definition=f.doc(args.declaredOwner.definition.path,owner);args.d.owner=args.declaredOwner;}
  if(name==='extra-member')args.listing.public.push('C:/synthetic-v7/shared/public/unknown.lock');
  args.descriptor=f.doc(args.descriptor.path,args.d);const rejection=await rejectBoth(states,args);cases.push({name,rejection});
 }
 await save('refusal-equivalence.json',{cases,newRealClaims:0});
});
check('direct original failed-parent reads and freshness consumers retain results without mutating the frozen graph',async()=>{
 const f=fixture();let states=await pairConsume(f);const args=f.delta(states[0],{id:'direct-parent',variant:2});states=await pairMerge(states,args);const before=states.map(serialized),receipt=args.d.fullWorlds[0].descriptor,options={namespace:states[0].bundle.publicNamespace,attemptId:'direct-parent',receipt,role:'failed-parent',readBytes:f.readBytes};
 const a=await old.readDirectHistoryRole(states[0],options),b=await next.readDirectHistoryRole(states[1],options);assert.deepEqual(b,a);assert.equal(b.blocked.length,2);const fresh=level(5),opt={sourceLevelId:fresh.id,failedParent:{namespace:options.namespace,attemptId:options.attemptId}};assert.deepEqual(next.assertFreshPlanHistoryInput(states[1],fresh,opt),old.assertFreshPlanHistoryInput(states[0],fresh,opt));assert.deepEqual(states.map(serialized),before);
 await save('read-only-consumer-equivalence.json',{directOriginalRoleEqual:true,bothFailedSealsRead:true,freshnessResultEqual:true,statesUnchanged:true,newSearches:0});
});

check('only successfully validated and module-frozen actual old worlds reuse computed values',async()=>{
 const f=fixture(),args=f.args(),baseline=await old.consumePlanHistory(args),state=await measured.consumePlanHistory(args);assert.deepEqual(state,baseline);
 const originals=state.fullWorlds.map(w=>w.level),before=originals.map(l=>({hash:memo.hashCalls(l),identity:memo.identityCalls(l)}));
 assert(before.every(c=>c.hash>=1));assert(originals.every(l=>memo.has(l)&&Object.isFrozen(l.blocks[0].shape[0])));
 const d=f.delta(state,{id:'memo-new',kind:'construction',variant:4}),nextState=await measured.mergePlanHistoryDelta(state,d),oldNext=await old.mergePlanHistoryDelta(baseline,d);assert.deepEqual(nextState,oldNext);
 assert.deepEqual(originals.map(l=>({hash:memo.hashCalls(l),identity:memo.identityCalls(l)})),before);
 const added=nextState.fullWorlds.at(-1).level;assert(memo.hashCalls(added)>=1);assert(memo.identityCalls(added)>=1);assert(memo.has(added));
 const fresh=level(5),options={sourceLevelId:fresh.id};assert.deepEqual(measured.assertFreshPlanHistoryInput(nextState,fresh,options),old.assertFreshPlanHistoryInput(oldNext,fresh,options));
 assert.deepEqual(originals.map(l=>({hash:memo.hashCalls(l),identity:memo.identityCalls(l)})),before);
 const after={hash:memo.hashCalls(added),identity:memo.identityCalls(added)};memo.hash(added);memo.identity(added);assert.deepEqual({hash:memo.hashCalls(added),identity:memo.identityCalls(added)},after);
 assert(!memo.has(fresh));await save('cache-eligibility-and-reuse.json',{oldWorlds:originals.length,oldActualAdapterHashAndIdentityCallsUnchanged:true,newWorldActuallyHashedAndIdentified:true,newWorldCachedOnlyAfterReturn:true,freshInputNotCached:true,allReturnedFieldsEqual:true,noTimingClaim:true});
});
check('caller freezing and module sealing without successful validation cannot counterfeit cached facts',async()=>{
 const raw=level(3),frozen=clone(raw);const freeze=o=>{if(o&&typeof o==='object'){Object.values(o).forEach(freeze);Object.freeze(o);}return o;};freeze(frozen);
 assert(Object.isFrozen(frozen.blocks[0].shape[0]));assert(!memo.has(frozen));memo.hash(frozen);memo.hash(frozen);memo.identity(frozen);memo.identity(frozen);assert.equal(memo.hashCalls(frozen),2);assert.equal(memo.identityCalls(frozen),2);assert(!memo.has(frozen));
 const owned=memo.sealUnvalidated(clone(raw));assert(Object.isFrozen(owned));assert(!memo.has(owned));memo.hash(owned);memo.hash(owned);assert.equal(memo.hashCalls(owned),2);
 const f=fixture(),mutable=clone(f.b);memo.validateUntrusted(mutable,f.scope);const l=mutable.nearPools.selected[0].level;assert(!memo.has(l));const original=l.blocks[0].color;l.blocks[0].color='black';assert.throws(()=>memo.validateUntrusted(mutable,f.scope),/World fingerprint conflict/);assert(!memo.has(l));
 l.blocks[0].color=original;const state=await measured.consumePlanHistory(f.args(mutable));assert(memo.has(state.fullWorlds[0].level));assert(!memo.has(l));
 const forged=clone(state);freeze(forged);await assert.rejects(measured.mergePlanHistoryDelta(forged,f.delta(state)),/immutable v6 state/);
 await save('freeze-is-not-validation.json',{callerDeepFreezeNeverEligible:true,moduleSealWithoutValidationNeverEligible:true,mutableValidatedObjectNotPublished:true,mutableCorruptionRejected:true,parseProducesDifferentOwnedObject:true,forgedDeepFrozenStateRejected:true});
});
check('failed validate and late membership refusal publish no new world memo and cannot poison a later branch',async()=>{
 const f=fixture(),states=await pairConsume(f),state=await measured.consumePlanHistory(f.args()),before=serialized(state),args=f.delta(state,{id:'postvalidate-fail',kind:'construction',variant:4});args.listing.late.pop();
 await rejectBoth(states,args,/Deleted or renamed sealed member/);await assert.rejects(measured.mergePlanHistoryDelta(state,args),/Deleted or renamed sealed member/);
 const failedBundle=memo.lastValidated(),failedLevel=failedBundle.nearPools.history.at(-1).level;assert.notStrictEqual(failedBundle,state.bundle);assert(!memo.has(failedLevel));assert(!Object.isFrozen(failedLevel));
 failedLevel.blocks[0].color='black';assert.throws(()=>memo.validateUntrusted(failedBundle,f.scope),/World fingerprint conflict/);assert(!memo.has(failedLevel));assert.equal(serialized(state),before);
 const nextArgs=f.delta(state,{id:'unpoisoned-branch',kind:'construction',variant:4}),merged=await measured.mergePlanHistoryDelta(state,nextArgs),expected=await old.mergePlanHistoryDelta(states[0],nextArgs);assert.deepEqual(merged,expected);assert(!memo.has(failedLevel));assert(memo.has(merged.fullWorlds.at(-1).level));
 const bad=clone(f.b);bad.nearPools.selected[0].level.blocks[0].color='black';const badArgs=f.args(bad);for(const api of [old,next,measured])await assert.rejects(api.consumePlanHistory(badArgs),/World fingerprint conflict/);
 const validAgain=await measured.consumePlanHistory(f.args());assert.deepEqual(validAgain,await old.consumePlanHistory(f.args()));
 await save('memo-failure-atomicity.json',{lateFailureAfterFullValidationNotPublished:true,failedWorldRemainsMutableAndUntrusted:true,subsequentActualFingerprintRechecked:true,failedCheckpointRejectedAllAdapters:true,nextBranchAndNewConsumeFieldEqual:true,oldStateUnchanged:true});
});
check('cached historical world does not bypass original receipt byte re-read and SHA authentication',async()=>{
 const f=fixture(),base=await measured.consumePlanHistory(f.args()),args=f.delta(base,{id:'reread-parent',variant:2}),state=await measured.mergePlanHistoryDelta(base,args),receipt=args.d.fullWorlds[0].descriptor;
 const options={namespace:state.bundle.publicNamespace,attemptId:'reread-parent',receipt,role:'failed-parent',readBytes:f.readBytes};await measured.readDirectHistoryRole(state,options);
 const bytes=f.bytes.get(receipt.path),changed=JSON.parse(bytes);changed.level.blocks[0].color='black';f.bytes.set(receipt.path,Buffer.from(JSON.stringify(changed)));await assert.rejects(measured.readDirectHistoryRole(state,options),/Descriptor bytes differ/);
 f.bytes.set(receipt.path,bytes);const result=await measured.readDirectHistoryRole(state,options);assert.equal(result.blocked.length,2);
 await save('direct-read-remains-authenticated.json',{cachedWorldDidNotAuthorizeChangedOriginalReceipt:true,restoredOriginalBytesReadSuccessfully:true,bothBlockedAliasesStillRead:true});
});

test.after(async()=>{
 const compiled=await build({entryPoints:[SELF],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'}),toolBindings={};for(const f of Object.keys(compiled.metafile.inputs)){const b=await readFile(f);toolBindings[f]=sha256(b);}await readFile(TEST);await readFile(OLD);await readFile(CHANGES);
 const report={status:checks.length===10?'PLAN_HISTORY_ADAPTER_V7_VALIDATED_WORLD_MEMO_PASS':'PLAN_HISTORY_ADAPTER_V7_INCOMPLETE',errors:checks.length===10?[]:['Incomplete focused checks'],checks,toolBindings,fileBindings,checkpointSchemaChanged:false,validationAndEvidenceChecksUnchanged:true,oldStateMutationAllowed:false,moduleOwnedImmutableStateRequiredForMerge:true,newValidationMemoization:true,memoEligibleOnlyAfterSuccessfulValidationAndRecursiveSeal:true,failedOperationMemoPublication:false,oldFilesChanged:false,privateSyntheticDataOnly:true,largeCheckpointRead:false,newRealHistoryScans:0,newRealHistoryExports:0,newRealHistoryMerges:0,newSearches:0,newConstructions:0,newReplayCalls:0,newLedgerClaims:0,oldLiveByteIntegrityClaimed:false,limitations:['Only future consumers may import v7; existing v6 consumers and all current batches remain unchanged.','Every validate/owner/member/parent check remains. Only module-validated recursively frozen actual old level hashes/identities are reused; new inputs and direct original reads are checked anew.','No real timing or RAM reduction claim is made. Synthetic graph equality and strict shared-node immutability are the evidence.','Only module-owned consume/merge states can be merged; mutable external overlays must not be passed as sealed history. Direct read-only roles remain compatible.']};
 const raw=Buffer.from(JSON.stringify(report,null,2)+'\n');await fs.writeFile(out+'/report.json',raw,{flag:'wx'});console.log(JSON.stringify({report:out+'/report.json',sha256:sha256(raw),status:report.status,checks:checks.length}));
});
