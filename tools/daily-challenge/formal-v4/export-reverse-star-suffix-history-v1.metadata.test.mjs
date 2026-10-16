import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {levelSha256} from '../formal-v2/contract.mjs';
import {assertStarOnlyProjection} from './reverse-star-suffix-lower-v1.mjs';
const draft='tools/daily-challenge/formal-v4/export-reverse-star-suffix-history-v1.mjs',self='tools/daily-challenge/formal-v4/export-reverse-star-suffix-history-v1.metadata.test.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex'),copy=structuredClone;
const source=await fs.readFile(draft,'utf8');
assert(source.includes('25bceb6da05762498a9efaaf9ecdbeee4f3c64ae970e46f0f020df05269f848d'));
assert(!source.includes('DRAFT_NOT_EXECUTABLE'));
assert(source.includes('INDEPENDENT_REVERSE_STAR_SUFFIX_PLAN_V2_PASS'));
assert(source.includes('INDEPENDENT_REVERSE_STAR_SUFFIX_ACTUAL_V2_PASS')); 
const begin=source.indexOf('// BEGIN PURE STAR LOWER TRANSPORT HELPERS');
const end=source.indexOf('// END PURE STAR LOWER TRANSPORT HELPERS');
assert(begin>=0&&end>begin);
// Evaluate only the exact two metadata function bodies. No draft import,
// task/runtime load, export entry point, history, projection constructor or I/O
// callback is available. Production paths are never used by these fixtures.
const helperSource=source.slice(begin,end).replaceAll('export ','');
const PUBLIC_LEDGER='synthetic-only-star-transport/public';
const descriptor=d=>assert(d&&typeof d.path==='string'&&/^[a-f0-9]{64}$/.test(d.sha256));
const {inspectStarLowerTransport,assertStarHistoryWorldAllowed}=new Function('assert','path','levelSha256','descriptor','PUBLIC_LEDGER','api',helperSource+'\nreturn {inspectStarLowerTransport,assertStarHistoryWorldAllowed};')(assert,path,levelSha256,descriptor,PUBLIC_LEDGER,undefined);
const canonical=p=>p.replaceAll('\\','/').toLowerCase(),hash='1'.repeat(64),id='2'.repeat(64),root='synthetic-only-star-transport/actual';
let envelopeCallbacks=0;
// Stub only the accounting envelope: that real helper already has separately
// saved tiny evidence. The actual pure drop-star field validator runs here.
const taskApi={assertReverseLowerReceipt(lower,level,target){
 envelopeCallbacks++;assert.equal(target,1);assert.equal(lower.inputLevelSha256,levelSha256(level));
 assert.equal(lower.requiredFloor,16);assert.equal(lower.upperBoundTransfer,false);
 if(lower.projection)assertStarOnlyProjection(level,lower.projection);
}};
const evidence=[];
async function check(name,fn){evidence.push({name,passed:true,detail:await fn()});}
function fixture(mode){
 // Tiny in-memory transport records only, never a production source or stock.
 const level={id:990021,mechanismRules:'revised-2026-09-27-v1.5',width:2,height:2,blocks:[{id:'s',x:0,y:0,color:'red',shape:[[0,0]],star:true}],gates:[{id:'r',side:'top',offset:0,size:1,color:'red',star:true},{id:'ordinary',side:'right',offset:0,size:1,color:'red'}]};
 const projected={id:990021,mechanismRules:'revised-2026-09-27-v1.5',width:2,height:2,blocks:[{id:'s',x:0,y:0,color:'red',shape:[[0,0]]}],gates:[{id:'r',side:'top',offset:0,size:1,color:'red'},{id:'ordinary',side:'right',offset:0,size:1,color:'red'}]};
 const recipe={sourceLevelId:990021,targetDifficulty:1,recipeSha256:hash},reference={path:'synthetic-only-star-transport/reference.json',sha256:hash};
 const receipt={path:root+'/candidate.json',sha256:'3'.repeat(64)},sidecar={path:path.join(PUBLIC_LEDGER,id+'.v4-reverse-fixed-stock-result.json'),sha256:'4'.repeat(64)};
 const q={level,levelSha256:levelSha256(level),attempt:{id},route:{},proof:null,lowerBound:null};
 const records=new Map(),math={files:[receipt,sidecar]};
 const owned=(owner,f)=>{const matches=owner.files.filter(x=>canonical(x.path)===canonical(f));assert.equal(matches.length,1);return copy(matches[0]);};
 const json=async d=>{const r=records.get(canonical(d.path));assert(r);assert.equal(r.descriptor.sha256,d.sha256);return copy(r.record);};
 if(mode!=='none'){
  const lower={version:'synthetic-envelope',inputLevelSha256:q.levelSha256,requiredFloor:16,upperBoundTransfer:false,result:null,archives:{original:null,projection:null},projection:null,projectedLevelSha256:null};q.lowerBound=lower;
  for(const kind of mode==='original'?['original']:['original','projection']){
   const original=kind==='original',body=original?level:projected;
   const record={version:lower.version,sourceLevelId:recipe.sourceLevelId,reference,recipeSha256:recipe.recipeSha256,kind,level:body,levelSha256:levelSha256(body),inputLevelSha256:q.levelSha256,upperBoundTransfer:false};
   const d={path:root+'/lower-'+kind+'.json',sha256:sha(JSON.stringify(record))};records.set(canonical(d.path),{descriptor:d,record});math.files.push(d);lower.archives[kind]=d;
  }
  if(mode!=='original'){
   lower.projectedLevelSha256=levelSha256(projected);
   lower.projection={method:'static-bodies-constraint-erasure-v1',sourceLevelSha256:q.levelSha256,projectedLevelSha256:lower.projectedLevelSha256,projectedLevel:projected,preservesBodies:true,preservesGateResolutionOrder:true,upperBoundTransfer:false,erased:[{owner:'s',field:'star',value:true},{owner:'r',field:'star',value:true}]};
   q.templateLevel=projected;q.templateLevelRole='LOWER_ONLY_STAR_ERASURE_NO_UPPER_TRANSFER';
   lower.result={status:mode==='success'?'threshold-proven':'unknown',sourceLevelSha256:lower.projectedLevelSha256};q.proof=lower.result;
  }
  q.lowerArchives=copy(lower.archives);
 }
 return{q,recipe,reference,actualDir:root,receipt,math,owned,json,canonical,taskApi,records,sidecar};
}
await check('no-lower-and-original-only-terminal',async()=>{
 const absent=fixture('none');assert.deepEqual(await inspectStarLowerTransport(absent),{worlds:[],archives:[]});
 const first=fixture('original'),r=await inspectStarLowerTransport(first);assert.equal(r.worlds.length,1);assert.equal(r.archives.length,1);assert.equal(r.worlds[0].role,'original');
 return{noLowerRows:0,originalOnlyRows:1,rawProof:null};
});
await check('unknown-and-success-retain-the-same-four-field-identities',async()=>{
 for(const mode of ['unknown','success']){const f=fixture(mode),r=await inspectStarLowerTransport(f);assert.equal(r.worlds.length,4);assert.equal(r.archives.length,2);
  for(const w of r.worlds)assertStarHistoryWorldAllowed({...w,archiveHashes:new Set([f.q.levelSha256]),lowerWorlds:r.worlds,canonical});
 }
 return{modes:['unknown','success'],archiveRows:2,projectionCopyRows:2,newPublicClaims:0};
});
await check('wrong-owner-descriptor-and-unexpected-copy-rejected',async()=>{
 const f=fixture('unknown'),r=await inspectStarLowerTransport(f),projection=r.worlds.find(w=>w.role==='projection');
 const changed=fixture('unknown');changed.math.files=changed.math.files.filter(d=>!d.path.endsWith('lower-projection.json'));await assert.rejects(()=>inspectStarLowerTransport(changed));
 const wrong=fixture('unknown');wrong.math.files.find(d=>d.path.endsWith('lower-projection.json')).sha256='f'.repeat(64);await assert.rejects(()=>inspectStarLowerTransport(wrong));
 for(const mutate of [w=>w.field='constructionTemplateLevel',w=>w.descriptor.path=root+'/foreign.json',w=>w.descriptor.sha256='e'.repeat(64)]){
  const w=copy(projection);mutate(w);assert.throws(()=>assertStarHistoryWorldAllowed({...w,archiveHashes:new Set([f.q.levelSha256]),lowerWorlds:r.worlds,canonical}));
 }
 return{missingOwnerRejected:true,wrongShaRejected:true,wrongFieldPathAndDigestRejected:3};
});
await check('drop-star-field-and-gate-order-mutations-rejected',async()=>{
 for(const mutate of [f=>f.q.lowerBound.projection.projectedLevel.gates.reverse(),f=>f.q.lowerBound.projection.projectedLevel.blocks[0].color='blue',f=>f.q.lowerBound.projection.projectedLevel.gates[0].offset=1]){
  const f=fixture('unknown');mutate(f);await assert.rejects(()=>inspectStarLowerTransport(f));
 }
 return{actualPureDropStarValidatorUsed:true,rejected:3,newProjectionCalls:0};
});
await check('proof-and-template-must-be-exact-original-records',async()=>{
 for(const mutate of [f=>f.q.proof={status:'other'},f=>f.q.templateLevel=copy(f.q.level),f=>f.q.lowerArchives.projection.sha256='a'.repeat(64),f=>f.q.attempt=null]){
  const f=fixture('unknown');mutate(f);await assert.rejects(()=>inspectStarLowerTransport(f));
 }
 return{rejected:4,projectedProofNeverOriginalUpper:true};
});
const report={status:'STAR_SUFFIX_EXPORT_TRANSPORT_METADATA_BRANCH_CHECKS_PASS',draft:{path:draft,sha256:sha(source)},test:{path:self,sha256:sha(await fs.readFile(self))},qualification:{"path":"deliverables/daily-formal-v4-20261008/proof/reverse-star-suffix-task-v2-independent-01/report.json","sha256":"25bceb6da05762498a9efaaf9ecdbeee4f3c64ae970e46f0f020df05269f848d"},evidence,envelopeCallbacks,limitations:['Final task qualification is byte-bound by the author report; the exporter actual entry point was not invoked.','Full lower accounting validator was a metadata stub; only real pure drop-star field validator was called.','Synthetic records are not source200 and confer no real-world acceptance or export authority.'],newModels:0,newSearches:0,newReplayCalls:0,newRealConstructions:0,newProjections:0,newHistoryLoads:0,newExports:0,errors:[]};
const out=process.argv[2];assert(out&&path.resolve(out).startsWith(path.resolve('deliverables/daily-formal-v4-20261008/proof')+path.sep));const b=JSON.stringify(report,null,2)+'\n';await fs.writeFile(out,b,{flag:'wx'});console.log(JSON.stringify({report:{path:out,sha256:sha(b)},passed:evidence.length}));
