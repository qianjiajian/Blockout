import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import * as old from './plan-history-adapter-v7.mjs';
import * as next from './plan-history-adapter-v8.mjs';
import {sha256} from './sealed-history-contract.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';
import {compileCanonicalHistoryPath} from './canonical-history-path-compiled.mjs';

// Synthetic historical JSON metadata only. No runtime/PuzzleModel, constructor,
// route, solver, real history root, or real checkpoint is loaded by this test.
const T='tools/daily-challenge/formal-v4/',OLD=T+'plan-history-adapter-v7.mjs',SELF=T+'plan-history-adapter-v8.mjs',TEST=T+'plan-history-adapter-v8.test.mjs';
const clone=structuredClone;
const tiny=(id=997800)=>({id,width:2,height:1,gates:[],blocks:[{id:'a',x:0,y:0,shape:[[0,0]],color:'red'},{id:'b',x:1,y:0,shape:[[0,0]],color:'blue'}]});
function fixture(){
 const bytes=new Map(),scope={baseDirectory:'C:/delta-index-fixture',roots:['public','late','reverse','vacancy','capacity','early','earlyPrefix'].map(id=>({id,physicalPath:'C:/delta-index-fixture/shared/'+id,aliases:['C:/delta-index-fixture/alias/'+id]}))};
 const canonical=compileCanonicalHistoryPath(scope).canonical;
 const b={version:next.PLAN_HISTORY_VERSION,scope,baselinePlan:{path:'original-plan.json',sha256:sha256('plan')},baselineActual:{path:'original-actual.json',sha256:sha256('actual')},publicNamespace:canonical(scope.roots[0].physicalPath),files:[],archivedBindings:{},publicStocks:[],nearPools:{selected:[],old450:[],history:[]},terminalRecords:[],externalPrivate:[],retired:[],legacyReferences:[],closedCampaigns:[],closedExperimentIds:[],oldLiveByteIntegrityClaimed:false,baselineFields:{publicStocks:[],previousLateStocks:[],previousMacro:[],comparisonOnly:[],selected:[],old450:[],terminalHistory:[],closedExperimentIds:[]}};
 const doc=(p,q)=>{const value=Buffer.from(JSON.stringify(q));bytes.set(p,value);return{path:p,sha256:sha256(value)};};
 const readBytes=async p=>{assert(bytes.has(p),'Only fixture map reads allowed');return bytes.get(p);};
 const checkpoint=doc('checkpoint.json',b),review=doc('review.json',{status:next.PLAN_HISTORY_REVIEW_STATUS,checkpoint,summary:old.planHistorySummary(b),errors:[],newSearches:0,newConstructions:0,newLedgerClaims:0,oldLiveByteIntegrityClaimed:false});
 const args={checkpoint,review,expectedScope:scope,readBytes};
 function delta(head,mode){
  const p='C:/delta-index-fixture/shared/late/packet.json',alias='C:/delta-index-fixture/alias/late/packet.json',l=tiny(),l2=tiny(997801),packet={level:l};
  if(['multi-field','missing-field'].includes(mode))packet.placeholderWorld=l2;
  const wd=doc(p,packet),files=[{...wd,rootId:'late',aliases:[p,alias]}],row={descriptor:clone(wd),field:'level',level:clone(l),sourceLevelId:l.id,reference:null},fullWorlds=[row];
  if(mode==='alias')row.descriptor.path=alias;
  if(mode==='multi-field')fullWorlds.push({...clone(row),field:'placeholderWorld',level:clone(l2),sourceLevelId:l2.id});
  if(mode==='duplicate-row')fullWorlds.push(clone(row));
  if(mode==='omitted-world')fullWorlds.length=0;
  if(mode==='unknown-field')row.field='unknown.level';
  if(mode==='wrong-sha')row.descriptor.sha256='0'.repeat(64);
  if(mode==='projection-mismatch')row.level.blocks[0].color='pink';
  const owner={id:'synthetic-index-owner',namespace:canonical(scope.roots[1].physicalPath),kind:'construction'};
  owner.definition=doc('owner.json',{version:'plan-history-owner-v1',...owner,files:files.map(({path,sha256})=>({path,sha256})),attemptIds:[],closedCampaigns:[]});
  const d={version:next.PLAN_HISTORY_VERSION,parentHeadSha256:mode==='wrong-head'?'0'.repeat(64):head,owner,files,terminalRecords:[],fullWorlds,closedCampaigns:[]};
  const listing=Object.fromEntries(scope.roots.map(r=>[r.id,r.id==='late'?[p]:[]]));if(mode==='extra-member')listing.late.push('C:/delta-index-fixture/shared/late/unknown.lock');
  return{descriptor:doc('delta.json',d),declaredOwner:owner,listing,readBytes};
 }
 return{args,delta,scope};
}

export async function run(out){
 assert(path.resolve(out).startsWith(path.resolve('deliverables/daily-formal-v4-20261008/proof')+path.sep));await fs.mkdir(out,{recursive:false});
 const fileBindings={},checks=[],read=async p=>{const b=await fs.readFile(p);fileBindings[p]=sha256(b);return String(b);};
 const save=async(name,q)=>{const p=out+'/'+name+'.json',b=Buffer.from(JSON.stringify(q,null,2)+'\n');await fs.writeFile(p,b,{flag:'wx'});fileBindings[p]=sha256(b);return{path:p,sha256:sha256(b)};};
 try{
  const a=await read(OLD),b=await read(SELF);
  assert.equal(sha256(a),'c0172b125bbf34bd4be2d39c66c0b209a4230828909b85baf1622830efda99dc');
  const aStart=a.indexOf(' for(const w of d.fullWorlds){'),aEnd=a.indexOf(' // Preserve the original flat/find',aStart),bStart=b.indexOf(' // Delta-local index:'),bEnd=b.indexOf(' // Preserve the original flat/find',bStart);
  const oldCheck="assert(d.fullWorlds.some(w=>canonical(b,w.descriptor.path)===p&&w.field===field&&levelSha256(w.level)===levelSha256(level)),'Omitted formed world/placeholder');",newCheck="assert(deltaWorldHashes.get(p)?.get(field)?.has(levelSha256(level)),'Omitted formed world/placeholder');";
  assert(aStart>0&&bStart>0&&aEnd>aStart&&bEnd>bStart);assert.equal(a.split(oldCheck).length,2);assert.equal(b.split(newCheck).length,2);
  assert.equal(a.replace(a.slice(aStart,aEnd),b.slice(bStart,bEnd)).replace(oldCheck,newCheck),b,'Only the two local substitutions are allowed');
  checks.push({name:'exact-two-local-substitutions',passed:true,evidence:await save('source-diff',{old:{path:OLD,sha256:sha256(a)},candidate:{path:SELF,sha256:sha256(b)},substitutions:[{from:a.slice(aStart,aEnd),to:b.slice(bStart,bEnd)},{from:oldCheck,to:newCheck}],otherSourceBytesIdentical:true,versionAndSchemaUnchanged:next.PLAN_HISTORY_VERSION===old.PLAN_HISTORY_VERSION})});
  const outcomes=[];
  for(const mode of ['ordinary','alias','multi-field','duplicate-row','missing-field','omitted-world','unknown-field','wrong-sha','projection-mismatch','wrong-head','extra-member']){
   const f=fixture(),left=await old.consumePlanHistory(f.args),right=await next.consumePlanHistory(f.args);assert.deepEqual(right,left);
   const before=[JSON.stringify(left),JSON.stringify(right)],args=f.delta(left.headSha256,mode),results=[];
   for(const [api,state]of [[old,left],[next,right]])try{results.push({accepted:true,state:await api.mergePlanHistoryDelta(state,args)});}catch(e){results.push({accepted:false,name:e.name,message:e.message});}
   assert.deepEqual(results[1],results[0],mode);assert.deepEqual([JSON.stringify(left),JSON.stringify(right)],before,'Original state changed');
   const expected=['ordinary','alias','multi-field','duplicate-row'].includes(mode);assert.equal(results[0].accepted,expected,mode);
   outcomes.push({mode,accepted:results[0].accepted,...(expected?{preservedWorldRows:results[0].state.fullWorlds.length}:{name:results[0].name,message:results[0].message})});
  }
  checks.push({name:'eleven-complete-api-metadata-equivalence-cases',passed:true,evidence:await save('behavior-equivalence',{outcomes,allReturnedFieldsEqual:true,oldStatesUnchanged:true,realCheckpointReads:0})});
  // Execute the exact two production loops with counter-only wrappers. Paths
  // are pre-normalized once with the actual compiler. This measures logical
  // calls, not filesystem latency, elapsed performance, or production speed.
  const closureLoop=s=>s.slice(s.indexOf(' for(const f of d.files){const p=canonical(b,f.path),bytes=raw.get(p);'),s.indexOf(' validate(b,state.bundle.scope);assertPlanHistoryMembers'));
  const runLoops=(source,validation)=>new Function('assert','sha256','rawLevelSha256','clone','d','raw','canonicalPaths',`
   let canonicalCalls=0,levelHashCalls=0;const b={nearPools:{history:[]}},used=new Set(),firstWorldByLevelSha256=new Map();
   const fields=new Set(['level','placeholderWorld','plain.level','built.level','built.placeholderWorld','built.plain.level','constructionTemplateLevel','templateLevel','constructionTemplatePacket.level','input.level','construction.level']);
   const at=(o,f)=>f.split('.').reduce((x,k)=>x?.[k],o),canonical=(_,p)=>{canonicalCalls++;assert(canonicalPaths.has(p));return canonicalPaths.get(p);},levelSha256=x=>{levelHashCalls++;return rawLevelSha256(x);};
   ${validation}\n${closureLoop(source)}
   return{canonicalCalls,levelHashCalls,worldRows:b.nearPools.history.length};`);
  const oldLoops=runLoops(a,a.slice(aStart,aEnd)),newLoops=runLoops(b,b.slice(bStart,bEnd)),benchmarks=[];
  for(const n of [100,1000,3000]){
   const f=fixture(),canonical=compileCanonicalHistoryPath(f.scope).canonical,canonicalPaths=new Map(),raw=new Map(),d={files:[],fullWorlds:[],terminalRecords:[]},level=tiny();
   for(let i=0;i<n;i++){const p='C:/delta-index-fixture/shared/late/row-'+i+'.json',bytes=Buffer.from(JSON.stringify({level})),descriptor={path:p,sha256:sha256(bytes)};canonicalPaths.set(p,canonical(p));raw.set(canonical(p),bytes);d.files.push(descriptor);d.fullWorlds.push({descriptor,field:'level',level:clone(level)});}
   const x=oldLoops(assert,sha256,levelSha256,clone,d,raw,canonicalPaths),y=newLoops(assert,sha256,levelSha256,clone,d,raw,canonicalPaths);
   assert.equal(x.worldRows,n);assert.equal(y.worldRows,n);assert.equal(x.levelHashCalls,y.levelHashCalls);assert.equal(x.canonicalCalls,2*n+n*(n+1)/2);assert.equal(y.canonicalCalls,2*n);
   benchmarks.push({rows:n,old:x,candidate:y,oldMembershipScanRows:x.canonicalCalls-2*n,newMembershipLookups:n,wallTimeMeasured:false});
  }
  checks.push({name:'exact-loop-operation-counts-100-1000-3000',passed:true,evidence:await save('operation-counts',{benchmarks,productionSpeedClaimed:false,noFilesystemWorkInBenchmark:true,sourceLoopsExtractedVerbatim:true})});
  const compiled=await build({entryPoints:[SELF],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'}),toolBindings={};for(const p of Object.keys(compiled.metafile.inputs))toolBindings[p]=sha256(await read(p));await read(TEST);
  for(const[p,h]of Object.entries(fileBindings))assert.equal(sha256(await fs.readFile(p)),h);
  const report={status:'PLAN_HISTORY_DELTA_WORLD_INDEX_CANDIDATE_METADATA_PASS',errors:[],checks,fileBindings,toolBindings,oldAdapterUnchanged:true,otherValidationSourceUnchanged:true,checkpointSchemaChanged:false,newFramework:false,productionQualified:false,largeCheckpointRead:false,newRealHistoryLoads:0,newRealHistoryMerges:0,newRealHistoryExports:0,newConstructions:0,newModels:0,newSearches:0,newReplayCalls:0,newLedgerClaims:0,limitations:['Only synthetic historical JSON and exact local-loop operation counts were tested.','Original byte hashes, projections, owner/member checks and all fields remain required.','Current running consumers/exporters still import unchanged v7.','No elapsed-time or total-batch performance improvement is claimed.']};
  const descriptor=await save('report',report);return{report:descriptor,checks:checks.length};
 }catch(e){await save('failed-report',{status:'PLAN_HISTORY_DELTA_WORLD_INDEX_CANDIDATE_METADATA_FAIL',error:e.stack,checks,fileBindings});throw e;}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await run(process.argv[2])));
