import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {compileCanonicalHistoryPath} from './canonical-history-path-compiled.mjs';

const T='tools/daily-challenge/formal-v4/',V='deliverables/daily-formal-v4-20261008/';
const SELF=T+'plan-history-adapter-v15.mjs',OLD=T+'plan-history-adapter-v14.mjs',TEST=T+'plan-history-adapter-v15.metadata.test.mjs';
const SOURCE=V+'proof/plan-history-owner-extra-index-v15-source-01/source-changes.json';
const sha=b=>createHash('sha256').update(b).digest('hex'),copy=structuredClone;
const sourceBlock=s=>{const start=s.indexOf('  const owned=new Map(owner.files.map'),end=s.indexOf('  const recipe=p.recipe,{recipeSha256,...core}=recipe;',start);assert(start>0&&end>start);return s.slice(start,end);};
const scope={baseDirectory:'C:/v15-descriptor-only',roots:Array.from({length:7},(_,i)=>({id:'r'+i,physicalPath:'C:/v15-descriptor-only/root'+i,aliases:['C:/v15-descriptor-alias/root'+i]}))};
const normalized=compileCanonicalHistoryPath(scope).canonical;
const descriptor=d=>{assert(typeof d?.path==='string'&&d.path.length);assert(/^[a-f0-9]{64}$/.test(d.sha256??''),'Invalid SHA256');};
function fixture(N){
 const members=new Map(),bytes=new Map(),plan={path:'C:/v15-descriptor-only/plan.json',sha256:sha('synthetic original plan descriptor')};
 const add=(name,value)=>{const p='C:/v15-descriptor-only/root1/'+name,b=Buffer.from(JSON.stringify(value)),d={path:p,sha256:sha(b)};bytes.set(normalized(p),b);members.set(normalized(p),d.sha256);return d;};
 const worlds=Array.from({length:N},(_,i)=>add('packet-'+i+'.json',{syntheticMetadataOnly:true,ordinal:i}));
 const closureD=add('closure.json',{syntheticClosedMetadataOnly:true}),index=add('index.json',{syntheticIndexMetadataOnly:true});
 const claim=add('claim.json',{plan,failedPlanContinuationAllowed:false}),recipe=add('recipe.json',{version:'fixed-reverse-physical-recipe-once-v1',plan,recipeIdentity:sha('synthetic recipe'),experimentId:'synthetic',maximumInputs:1,restartAllowed:false}),experiment=add('experiment.json',{plan,experimentId:'synthetic',maximumInputs:1,restartAllowed:false});
 const receipt=add('external-candidate.json',{syntheticCandidateMetadataOnly:true});members.delete(normalized(receipt.path));
 const owner={files:[claim,recipe,experiment,...worlds,closureD,index]},math={files:[receipt]},q={formedWorlds:worlds},done={plan,index},closure={descriptor:closureD};
 function rewrite(d,fn){const k=normalized(d.path),value=JSON.parse(bytes.get(k));fn(value);const b=Buffer.from(JSON.stringify(value));d.sha256=sha(b);bytes.set(k,b);if(members.has(k))members.set(k,d.sha256);}
 return{members,bytes,owner,math,q,done,closure,p:{experimentId:'synthetic'},locks:{claim,recipe,experiment},rewrite};
}
function evaluator(s){const segment=sourceBlock(s);const fn=new Function('assert','canonical','bound','raw','json','sameDescriptor','hash','unique','b','owner','math','q','closure','done','p',`return (async()=>{for(const o of [owner,math])unique(o.files.map(d=>canonical(b,d.path)));\n${segment}\nreturn extra;})();`);return async f=>{
 const calls=[],canonical=(b,p)=>normalized(p),bound=(b,d)=>{descriptor(d);assert.equal(f.members.get(canonical(b,d.path)),d.sha256,'Unbound historical file');};
 const raw=async d=>{descriptor(d);calls.push(d.path);const b=f.bytes.get(normalized(d.path));assert(b,'Missing original bytes');assert.equal(sha(b),d.sha256,'Partial evidence SHA mismatch');return b;};
 const json=async d=>JSON.parse(await raw(d)),sameDescriptor=(a,c)=>{descriptor(a);descriptor(c);assert.equal(normalized(a.path),normalized(c.path));assert.equal(a.sha256,c.sha256);};
 try{return{ok:true,extra:await fn(assert,canonical,bound,raw,json,sameDescriptor,h=>assert(/^[a-f0-9]{64}$/.test(h??'')),xs=>assert.equal(new Set(xs).size,xs.length,'Duplicate history identity'),{},f.owner,f.math,f.q,f.closure,f.done,f.p),reads:calls};}catch(e){return{ok:false,error:{name:e.name,code:e.code??null,message:e.message},reads:calls};}
 };}
const alias=p=>p.replace('C:/v15-descriptor-only/','c:/V15-DESCRIPTOR-ALIAS/').replaceAll('/','\\');
export async function run(out){
 assert(path.resolve(out).startsWith(path.resolve(V+'proof')+path.sep));await fs.mkdir(out,{recursive:false});const bindings={},checks=[];
 const read=async(p,h)=>{const b=await fs.readFile(p);if(h)assert.equal(sha(b),h,p);bindings[p]=sha(b);return b;};
 const save=async(name,q)=>{const p=out+'/'+name+'.json',b=Buffer.from(JSON.stringify(q,null,2)+'\n');await fs.writeFile(p,b,{flag:'wx'});bindings[p]=sha(b);return{path:p,sha256:sha(b)};};
 try{
  const source=(await read(SELF)).toString(),old=(await read(OLD,'81460505400d77e1c0f889f9b19429d2cb0131b0dc063ffee6da08b479c5d020')).toString(),diff=JSON.parse(await read(SOURCE));
  assert.equal(sha(source),diff.next.sha256);assert.equal(sha(old),diff.prior.sha256);let forward=old;for(const c of diff.changes){assert.equal(forward.split(c.from).length,2);forward=forward.replace(c.from,c.to);}assert.equal(forward,source);let inverse=source;for(const c of [...diff.changes].reverse())inverse=inverse.replace(c.to,c.from);assert.equal(inverse,old);assert.equal(diff.changes.length,2);for(const d of diff.snapshots)await read(d.path,d.sha256);
  checks.push({name:'exact-two-substitution-reconstruction-and-snapshots',passed:true,evidence:await save('source-equality',{sourceChanges:SOURCE,forwardAndReverseExact:true,onlyAlgorithmChange:'one nested path-existence expression',otherChange:'top-level production-disabled guard',allOtherProductionBytesUnchanged:true})});
  await assert.rejects(import(pathToFileURL(path.resolve(SELF)).href),/Adapter v15 production remains disabled/);
  checks.push({name:'production-module-import-is-disabled',passed:true,evidence:await save('disabled',{productionDisabled:true,importRejected:true,noProductionEntryInvoked:true,noEnvironmentOrArgumentBypass:true,testOnlyEnabledModuleCreated:false})});
  const previous=evaluator(old),next=evaluator(source),positive=[];
  for(const N of [1,2,4,9,31])for(const order of ['original','reverse','rotate'])for(const useAliases of [false,true]){
   const f=fixture(N);if(order==='reverse')f.owner.files.reverse();if(order==='rotate')f.owner.files=[...f.owner.files.slice(2),...f.owner.files.slice(0,2)];if(useAliases){f.owner.files=f.owner.files.map(d=>({...d,path:alias(d.path)}));f.math.files=f.math.files.map(d=>({...d,path:alias(d.path)}));}
   const before=JSON.stringify({owner:f.owner,math:f.math,q:f.q,done:f.done,closure:f.closure});const a=await previous(f),b=await next(f);assert.deepEqual(b,a);assert.equal(a.ok,true);assert.equal(a.extra.length,3);assert.equal(JSON.stringify({owner:f.owner,math:f.math,q:f.q,done:f.done,closure:f.closure}),before);positive.push({N,order,useAliases,extraOrder:a.extra.map(d=>normalized(d.path)),rawReadCalls:a.reads.length});
  }
  checks.push({name:'thirty-owner-orders-aliases-and-empty-only-cases-equivalent',passed:true,evidence:await save('positive',{cases:positive,source:'Production owner-extra/lock-validation segment extracted byte-for-byte. Existing canonical duplicate check and metadata callbacks surround it; no history is consumed.',newLevelSpecs:0,originalOrderedExtraDescriptorsAndReadsEqual:true})});
  const negative=[];
  const mutators={
   'wrong-owned-sha':f=>{f.owner.files=f.owner.files.map((d,i)=>i===3?{...d,sha256:sha('wrong')}:d);},
   'missing-fixed-owner':f=>{f.owner.files=f.owner.files.filter(d=>d!==f.q.formedWorlds[1]);},
   'missing-history-member':f=>{f.members.delete(normalized(f.q.formedWorlds[1].path));},
   'changed-original-bytes':f=>{f.bytes.set(normalized(f.q.formedWorlds[1].path),Buffer.from('changed original'));},
   'duplicate-owner-alias':f=>{f.owner.files.push({...f.owner.files[3],path:alias(f.owner.files[3].path)});},
   'fourth-extra':f=>{const d={path:'C:/v15-descriptor-only/root1/other.json',sha256:sha('{}')};f.members.set(normalized(d.path),d.sha256);f.bytes.set(normalized(d.path),Buffer.from('{}'));f.owner.files.push(d);},
   'missing-extra':f=>{f.owner.files=f.owner.files.filter(d=>d!==f.locks.claim);},
   'wrong-lock-plan':f=>f.rewrite(f.locks.claim,x=>{x.plan={...x.plan,sha256:sha('another plan')};}),
   'restart-allowed':f=>f.rewrite(f.locks.experiment,x=>{x.restartAllowed=true;}),
   'missing-recipe-lock-role':f=>f.rewrite(f.locks.recipe,x=>{x.version='other';}),
   'malformed-descriptor':f=>{f.owner.files[3]={path:'',sha256:sha('x')};},
   'duplicate-fixed-invalid-owner-count':f=>{f.q.formedWorlds.push(f.q.formedWorlds[0]);}
  };
  for(const [name,mutate]of Object.entries(mutators)){const f=fixture(4);if(name!=='missing-recipe-lock-role')f.rewrite(f.locks.recipe,x=>{x.version='fixed-reverse-physical-recipe-once-v1';});mutate(f);const a=await previous(f),b=await next(f);assert.deepEqual(b,a,name);assert.equal(a.ok,false,name);negative.push({name,...a});}
  checks.push({name:'twelve-original-rejection-and-read-order-boundaries',passed:true,evidence:await save('negative',{cases:negative,bothVersionsRejectAll:true,noMissingRowOrWrongShaTolerance:true})});
  // Isolate exactly the two production existence expressions for counters and
  // duplicate semantics; the owner validation tests above keep all prechecks.
  const oldLine=diff.changes[1].from,newLine=diff.changes[1].to;
  const membership=line=>new Function('canonical','b','fixed','owner',line+';return extra;');
  const selectOld=membership(oldLine),selectNew=membership(newLine),f=fixture(256),fixed=[...f.q.formedWorlds,f.closure.descriptor,f.done.index];let oldCalls=0,newCalls=0;
  const a=selectOld((b,p)=>{oldCalls++;return normalized(p);},{},fixed,f.owner),b=selectNew((b,p)=>{newCalls++;return normalized(p);},{},fixed,f.owner);assert.deepEqual(b,a);const M=fixed.length;assert.equal(oldCalls,2*(M*(M+1)/2+3*M));assert.equal(newCalls,M+f.owner.files.length);
  const duplicateFixed=[...fixed,fixed[0],{...fixed[1],path:alias(fixed[1].path)}];assert.deepEqual(selectOld((b,p)=>normalized(p),{},duplicateFixed,f.owner),selectNew((b,p)=>normalized(p),{},duplicateFixed,f.owner));
  checks.push({name:'linear-local-work-and-existential-duplicate-semantics',passed:true,evidence:await save('operation-counts',{syntheticFormedDescriptors:256,fixedDescriptors:M,ownerDescriptors:f.owner.files.length,oldCanonicalCalls:oldCalls,newCanonicalCalls:newCalls,orderedExtrasEqual:true,duplicateFixedMembershipSemanticsEqual:true,duplicateOwnerStillRejectedByOriginalCheck:true,realBenchmark:false,actualPrepareSpeedupClaimed:false})});
  const priorReport={path:V+'proof/plan-history-star-producer7-protocol-private-02/report.json',sha256:'4ac23f2e1a68f713cdaf77dbc443d08b834599fb895fa4e9d260a119479d4dbc'},prior=JSON.parse(await read(priorReport.path,priorReport.sha256));assert.equal(prior.fileBindings[OLD],sha(old));for(const c of prior.checks)await read(c.evidence.path,c.evidence.sha256);
  checks.push({name:'original-complete-protocol-and-epoch-evidence-retained',passed:true,evidence:await save('inheritance',{priorReport,priorChecks:prior.checks.map(c=>c.name),priorTestsRerun:false,entireCodeOutsideTwoSubstitutionsByteEqual:true,ownerMemberRawFieldAndEpochAllUnchanged:true,productionMappingsUnchanged:{4:10,5:12,6:13,7:14},noProducer15ProtocolAdded:true,limitations:'Local descriptor-segment tests do not independently re-execute full history authentication. Existing exact-byte protocol and atomic-failure evidence is inherited; no real history has been loaded.'})});
  const closure=await build({entryPoints:[SELF],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'}),toolBindings={};for(const p of Object.keys(closure.metafile.inputs))toolBindings[p]=sha(await read(p));await read(TEST);for(const[p,h]of Object.entries(bindings))assert.equal(sha(await fs.readFile(p)),h,p);
  return{report:await save('report',{status:'PLAN_HISTORY_V15_DISABLED_OWNER_EXTRA_INDEX_METADATA_PASS',productionDisabled:true,productionQualified:false,errors:[],checks,fileBindings:bindings,toolBindings,bindingWorkingDirectory:process.cwd(),newHistoryLoads:0,newHistoryMerges:0,newHistoryExports:0,newModels:0,newConstructions:0,newSearches:0,newReplayCalls:0,newLedgerClaims:0,actualHistoryAuthenticationExecuted:false,actualPrepareSpeedupClaimed:false,oldFilesChanged:false,limitations:['Only descriptor/owner metadata was synthesized; no LevelSpec, board positions, runtime model, or real checkpoint was loaded.','All protocol/owner/member/raw/epoch code outside the declared local membership replacement and disabled guard is byte-identical to v14.','The production module intentionally refuses import. No current consumer has been changed.']}),checks:checks.length};
 }catch(e){await save('failed-report',{status:'PLAN_HISTORY_V15_METADATA_FAIL',error:e.stack,checks,fileBindings:bindings});await fs.writeFile(out+'/test-at-failure.mjs',await fs.readFile(TEST),{flag:'wx'});throw e;}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await run(process.argv[2])));
