import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
import * as prior from './plan-history-adapter-v4.mjs';
import * as next from './plan-history-adapter-v5.mjs';
import {sha256,sealedWorldIdentity} from './sealed-history-contract.mjs';
const SELF='tools/daily-challenge/formal-v4/plan-history-adapter-v5.mjs',OLD='tools/daily-challenge/formal-v4/plan-history-adapter-v4.mjs';
const CHANGES='deliverables/daily-formal-v4-20261008/proof/plan-history-adapter-v5-handoff-01/declared-source-changes.json';
const out=process.env.PLAN_HISTORY_V5_TEST_OUT;assert(out);await fs.mkdir(out,{recursive:false});const evidence=[];
const clone=structuredClone;
async function paired(name,...args){const results=[];for(const api of [prior,next]){try{results.push({value:await api[name](...args)});}catch(e){results.push({error:e.name,message:e.message});}}
 assert.deepEqual(results[0],results[1],name);if(results[0].error)throw Error(results[0].message);return results[0].value;}
const board=(n=0)=>({id:123,width:3+n,height:1,gates:[],blocks:[{id:'a',x:0,y:0,shape:Array.from({length:2+n},(_,i)=>[i,0]),color:n%2?'green':'red'},{id:'b',x:2+n,y:0,shape:[[0,0]],color:'blue'}]});
function fixture(){
 const bytes=new Map(),scope={baseDirectory:'C:/synthetic',roots:['public','late','reverse','vacancy','capacity','early','earlyPrefix'].map(id=>({id,physicalPath:'C:/synthetic/shared/'+id,aliases:['C:/synthetic/snapshot/'+id]}))};
 const b={version:next.PLAN_HISTORY_VERSION,scope,baselinePlan:{path:'plan.json',sha256:sha256('p')},baselineActual:{path:'actual.json',sha256:sha256('a')},publicNamespace:'c:/synthetic/shared/public',files:[],archivedBindings:{},publicStocks:[],nearPools:{selected:[],old450:[],history:[]},terminalRecords:[],externalPrivate:[],retired:[],legacyReferences:[],closedCampaigns:[],closedExperimentIds:[],oldLiveByteIntegrityClaimed:false};
 const doc=(path,value)=>{const raw=Buffer.from(JSON.stringify(value));bytes.set(path,raw);return{path,sha256:sha256(raw)};};
 const file=(list,path,value)=>{const d=doc(path,value),rootId=scope.roots.find(r=>path.startsWith(r.physicalPath.toLowerCase()+'/'))?.id??null;list.push({...d,rootId,aliases:[path]});return d;};
 const level=board();for(const pool of ['selected','old450','history']){const d=file(b.files,'C:/synthetic/world-'+pool+'.json',{level});b.nearPools[pool].push({descriptor:d,field:'level',level:clone(level),fingerprints:sealedWorldIdentity(level),sourceLevelId:123,reference:null,origin:pool});}
 // Within-pool duplicates and cross-pool duplicates must remain in their order.
 b.nearPools.history.push(clone(b.nearPools.history[0]));
 for(const f of b.files)b.archivedBindings[f.path]=f.sha256;
 b.baselineFields={publicStocks:[],previousLateStocks:[],previousMacro:[],comparisonOnly:[],selected:[],old450:[],terminalHistory:[],closedExperimentIds:[]};
 const readBytes=async path=>{assert(bytes.has(path),'Missing synthetic bytes: '+path);return bytes.get(path);};
 const args=(bundle=b)=>{const checkpoint=doc('checkpoint.json',bundle),review=doc('review.json',{status:next.PLAN_HISTORY_REVIEW_STATUS,checkpoint,summary:next.planHistorySummary(bundle),errors:[],newSearches:0,newConstructions:0,newLedgerClaims:0,oldLiveByteIntegrityClaimed:false});return{checkpoint,review,expectedScope:scope,readBytes};};
 function delta(state,{badRequestFingerprint=false,badAliasOrigin=false,badProjection=false}={}){
  const files=[],terminalRecords=[],fullWorlds=[],namespace=b.publicNamespace;
  for(const [i,l]of [board(),board(1)].entries()){
   const f=sealedWorldIdentity(l),id='private-new-'+i,request={id,levelSha256:f.levelSha256,shapeSha256:f.shapeSha256,colorSha256:f.colorSha256,colorAssignments:f.colorAssignments,designSha256:f.designSha256,redesignOf:null};
   if(i===1&&badRequestFingerprint)request.colorSha256='f'.repeat(64);
   const result={accepted:false,status:'UNKNOWN_PRIVATE_METADATA',levelSha256:f.levelSha256};
   const packet=file(files,'C:/synthetic/new-'+i+'.json',{level:l}),record={namespace,kind:'mathematical',request:{descriptor:file(files,namespace+'/'+id+'.request.json',request),value:request},result:{descriptor:file(files,namespace+'/'+id+'.result.json',result),value:result},blocked:[],lock:null};
   for(const p of [namespace+'/'+id+'.blocked.json',namespace+'/identities/'+f.retryIdentitySha256+'.blocked.json']){const value={attemptId:id,status:result.status};record.blocked.push({descriptor:file(files,p,value),value});}
   file(files,namespace+'/identities/'+f.retryIdentitySha256+'.json',{origin:badAliasOrigin&&i===1?'wrong':id});
   terminalRecords.push(record);fullWorlds.push({descriptor:packet,field:'level',level:clone(l),fingerprints:f,sourceLevelId:123,reference:null});
  }
  if(badProjection)fullWorlds[1].level.blocks[0].color='purple';
  const owner={id:'future-only-math',namespace,kind:'mathematical'};owner.definition=doc('owner.json',{version:'plan-history-owner-v1',...owner,files:files.map(({path,sha256})=>({path,sha256})),attemptIds:terminalRecords.map(r=>r.request.value.id),closedCampaigns:[]});
  const d={version:next.PLAN_HISTORY_VERSION,parentHeadSha256:state.headSha256,owner,files,terminalRecords,fullWorlds,closedCampaigns:[]};
  const listing=Object.fromEntries(scope.roots.map(r=>[r.id,[...state.bundle.files,...files].filter(f=>f.rootId===r.id).map(f=>f.path)]));
  return{descriptor:doc('delta.json',d),declaredOwner:owner,listing,readBytes};
 }
 return{b,bytes,scope,doc,file,args,readBytes,delta};
}

test('small consumes and math delta merges preserve duplicate worlds, first pool order, aliases and input immutability',async()=>{
 const f=fixture(),state=await paired('consumePlanHistory',f.args()),saved=JSON.stringify(state),merged=await paired('mergePlanHistoryDelta',state,f.delta(state));
 assert.equal(JSON.stringify(state),saved);assert.equal(merged.publicStocks.length,2);assert.equal(merged.fullWorlds.length,6);
 assert.deepEqual(merged.fullWorlds.slice(0,4).map(w=>w.origin),['selected','old450','history','history']);
 assert.equal(merged.bundle.terminalRecords[1].result.value.accepted,false);assert.equal(merged.completeCheckpointBytesAuthenticated,true);
 evidence.push({name:'v4-v5-full-small-state-equivalence-two-identities-duplicate-worlds',passed:true});
});

test('every repeated world still rehashes its actual level and validates all declared fingerprint fields',async()=>{
 const f=fixture(),original=await paired('consumePlanHistory',f.args());
 for(const edit of [b=>b.nearPools.history[1].level.blocks[0].color='purple',b=>b.nearPools.history[1].level.id=124,b=>b.nearPools.history[1].fingerprints.levelSha256='f'.repeat(64),b=>b.nearPools.history[1].fingerprints.colorSha256='e'.repeat(64),b=>b.nearPools.history[1].fingerprints.partitionSha256='d'.repeat(64),b=>b.nearPools.history[1].fingerprints.colorAssignments[0].colors=['yellow']]){const b=clone(f.b);edit(b);await assert.rejects(paired('consumePlanHistory',f.args(b)),/World fingerprint conflict/);}
 // Identical data in a later call cannot use a previous validation's identity.
 const changed=clone(f.b);changed.nearPools.history[1].level.blocks[0].color='purple';changed.nearPools.history[1].fingerprints=sealedWorldIdentity(changed.nearPools.history[1].level);
 const current=await paired('consumePlanHistory',f.args(changed));assert.notDeepEqual(current.nearPools.history[1].fingerprints,original.nearPools.history[1].fingerprints);
 const again=await paired('consumePlanHistory',f.args());assert.deepEqual(again,original);
 evidence.push({name:'actual-level-hash-not-declared-hash-local-memo-no-cross-call-state',passed:true});
});

test('raw delta projection, request fingerprints, alias origin and ledger members retain the same rejections',async()=>{
 for(const options of [{badProjection:true},{badRequestFingerprint:true},{badAliasOrigin:true}]){const f=fixture(),state=await paired('consumePlanHistory',f.args());await assert.rejects(paired('mergePlanHistoryDelta',state,f.delta(state,options)));}
 const f=fixture(),state=await paired('consumePlanHistory',f.args()),d=f.delta(state);d.listing.public.pop();await assert.rejects(paired('mergePlanHistoryDelta',state,d),/Deleted or renamed sealed member/);
 const wrong=f.args();wrong.checkpoint={...wrong.checkpoint,sha256:'0'.repeat(64)};await assert.rejects(paired('consumePlanHistory',wrong),/Descriptor bytes differ/);
 evidence.push({name:'raw-bytes-projection-identity-alias-member-negative-equivalence',passed:true});
});

test('complete source matches v4 with exactly the four published local substitutions',async()=>{
 let old=await fs.readFile(OLD,'utf8');assert.equal(sha256(old),'83600bed4229f4652afce9cea07a5235a1647968196929db8257d953e4c625a9');
 const raw=await fs.readFile(CHANGES);assert.equal(sha256(raw),'146d852b2d8fa033ec4629dbbaed0857288cf05c94cf10a8dc4befe0ca39d9e7');const changes=JSON.parse(raw);
 assert.equal(changes.length,4);for(const c of changes){assert.equal(old.split(c.from).length-1,c.occurrences);old=old.replaceAll(c.from,c.to);}assert.equal(await fs.readFile(SELF,'utf8'),old);
 evidence.push({name:'entire-source-declared-diff-equality-schema-and-deep-clone-preserved',passed:true,changes:changes.map(c=>c.label)});
});

test.after(async()=>{
 const compiled=await build({entryPoints:[SELF],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'}),toolBindings={};for(const f of Object.keys(compiled.metafile.inputs))toolBindings[f.replaceAll('\\','/')]=sha256(await fs.readFile(f));
 const fileBindings={...toolBindings};for(const f of [OLD,CHANGES,'tools/daily-challenge/formal-v4/plan-history-adapter-v5.test.mjs'])fileBindings[f]=sha256(await fs.readFile(f));
 await fs.writeFile(out+'/report.json',JSON.stringify({status:evidence.length===4?'PLAN_HISTORY_ADAPTER_V5_MEMORY_EQUIVALENCE_PASS':'INCOMPLETE',errors:evidence.length===4?[]:['Incomplete focused checks'],evidence,toolBindings,fileBindings,checkpointSchemaChanged:false,privateSyntheticDataOnly:true,largeCheckpointRead:false,newRealHistoryScans:0,newRealHistoryExports:0,newSearches:0,newConstructions:0,newReplayCalls:0,newLedgerClaims:0,oldLiveByteIntegrityClaimed:false,
  limitations:['No real checkpoint consumed and no production timing claim.','Each validate rehashes every actual level; only derived sealed identity is memoized within that call.','Merge world index preserves original Object.values(nearPools).flat() order and first matching hash; no cross-call cache.','All existing v4 consumers and current batch files remain unchanged.']},null,2)+'\n',{flag:'wx'});
});
