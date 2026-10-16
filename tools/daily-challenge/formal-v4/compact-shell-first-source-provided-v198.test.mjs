import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {levelSha256} from '../formal-v2/contract.mjs';
import {sealedWorldIdentity} from './sealed-history-contract.mjs';
import {VERSION as HISTORY_VERSION,assertCompactHistoryMembersV198,appendCompactShellResultV198} from './compact-shell-execution-v198.mjs';
import {SHELL_PROVIDED_LOWER_BUDGET,SHELL_PROVIDED_UNUSED_UPPER_BUDGET,assertShellProvidedSearchPlanV198,accountShellProvidedSearchReceiptV198} from './shell-provided-search-budget-v198.mjs';
import {VERSION,assertCompactShellFirstSourceHistoryV198 as history,assertCompactShellFirstSourceFreshV198 as fresh,authoredShellFirstSourceProvidedMathOptionsV198 as options,assertCompactShellFirstSourcePreflightV198 as preflight} from './compact-shell-first-source-provided-v198.mjs';

// Synthetic metadata only: no game model, route replay, solver, ledger claim,
// full-history consumer, execution entrypoint, or actual source51 mutation.
const H=n=>n.toString(16).padStart(64,'0');
const d=n=>({path:`C:/fixture/file-${n}.json`,sha256:H(n)});
const clone=x=>structuredClone(x);
function addRecord(index,identity,n,{namespace='c:/fixture/public',kind='mathematical',accepted=true}={}){
 const r={kind,namespace,request:{descriptor:d(n),value:{...clone(identity),id:H(n+1000),redesignOf:null,startedAt:'2026-10-16T00:00:00Z'}},result:{descriptor:d(n+1),value:{accepted,status:accepted?'ACCEPTED':'UNKNOWN_LOWER',levelSha256:identity.levelSha256}},blocked:[],lock:null,legacyPrivateResultFailure:false};
 index.records.push(r);index.files.push({...d(n),rootId:null},{...d(n+1),rootId:null});return r;
}
function fixture(){
 const old={id:5,width:4,height:3,gates:[],blocks:[{id:'a',x:0,y:0,color:'red',shape:[[0,0],[1,0]]},{id:'b',x:2,y:0,color:'blue',shape:[[0,0]]}]};
 const next={id:5,width:4,height:3,gates:[],blocks:[{id:'a',x:0,y:1,color:'green',shape:[[0,0],[0,1]]},{id:'b',x:1,y:1,color:'pink',shape:[[0,0],[1,0]]}]};
 const reference=d(1),index={version:HISTORY_VERSION,headSha256:H(900),publicNamespace:'c:/fixture/public',scope:{baseDirectory:'C:/fixture',roots:Array.from({length:7},(_,n)=>({id:String(n),physicalPath:`C:/fixture/root-${n}`,aliases:[]}))},files:[{...reference,rootId:null}],worlds:[{identity:sealedWorldIdentity(old),sourceLevelId:5,levelId:5,reference:null}],records:[],retired:[],closedExperimentIds:[],historyReport:d(999),exactWorldCount:1,uniqueReferenceWorldCount:1};
 const record=addRecord(index,sealedWorldIdentity(old),10),q={sourceLevelId:5,level:next,levelSha256:levelSha256(next)},receipt={sourceLevelId:5,level:old,accepted:true};
 return{index,old,next,q,record,reference,receipt};
}
const check=f=>fresh(f.index,f.q,f.reference,f.receipt);

test('accepted-only source metadata permits explicit null parent without authorizing execution',()=>{
 const f=fixture(),before=clone(f.index),r=history(f.index,5);assert.equal(r.matchedRecordCount,1);assert.equal(r.failedParent,null);assert.equal(r.redesignOfOmitted,true);assert.equal(r.acceptedIdentityRevalidationAllowed,false);assert.deepEqual(f.index,before);
 const a=check(f);assert.equal(a.parent,null);assert.equal(a.mathematicalAcceptance,false);assert(a.freshIdentity);
});
test('an authenticated stock without records may be inventoried but is not an accepted reference',()=>{
 const f=fixture();f.index.records=[];assert.equal(history(f.index,5).matchedRecordCount,0);assert.throws(()=>check(f),/no accepted historical/);
});
test('missing source evidence and an incomplete root scope do not imply absence',()=>{
 const f=fixture();assert.throws(()=>history(f.index,6),/Authenticated source/);f.index.scope.roots.pop();assert.throws(()=>history(f.index,5));
});
for(const namespace of ['c:/fixture/public','c:/fixture/private','c:/fixture/construction'])test('failed source identity rejects across namespace '+namespace,()=>{
 const f=fixture();addRecord(f.index,f.index.worlds[0].identity,20,{namespace,accepted:false});assert.throws(()=>history(f.index,5),/failed attempt/);
});
test('construction failure, pending, blocked, and legacy flags each prevent a first-source run',()=>{
 for(const mutate of [r=>{r.kind='construction';r.result.value.accepted=false;},r=>r.result=null,r=>r.lock={descriptor:d(300)},r=>r.blocked=[{descriptor:d(300)}],r=>r.legacyPrivateResultFailure=true]){
  const f=fixture();mutate(f.record);assert.throws(()=>history(f.index,5));
 }
});
test('same design alias with changed level identity cannot hide a failure',()=>{
 const f=fixture(),v={...f.index.worlds[0].identity,levelSha256:H(88),shapeSha256:H(89),colorSha256:H(90)};addRecord(f.index,v,20,{namespace:'c:/fixture/private',accepted:false});assert.throws(()=>history(f.index,5),/failed attempt/);
});
test('same physical alias with changed design and level cannot hide a failure',()=>{
 const f=fixture(),v={...f.index.worlds[0].identity,levelSha256:H(88),designSha256:H(89)};addRecord(f.index,v,20,{namespace:'c:/fixture/private',accepted:false});assert.throws(()=>history(f.index,5),/failed attempt/);
});
test('transitive reverse-ordered aliases are closed before deciding absence',()=>{
 const f=fixture(),a={...f.index.worlds[0].identity,levelSha256:H(88),shapeSha256:H(89),colorSha256:H(90)},b={...a,levelSha256:H(91),designSha256:H(92)};
 const pending=addRecord(f.index,b,30,{namespace:'c:/fixture/other'});pending.result=null;addRecord(f.index,a,20,{namespace:'c:/fixture/private'});assert.throws(()=>history(f.index,5),/pending/);
});
test('world identity seeds find aliases even when no record has its original level hash',()=>{
 const f=fixture();f.index.records=[];const a={...f.index.worlds[0].identity,levelSha256:H(88)};addRecord(f.index,a,20,{accepted:false});assert.throws(()=>history(f.index,5),/failed attempt/);
});
test('levelId aliases are included when sourceLevelId differs',()=>{
 const f=fixture();f.index.worlds[0].sourceLevelId=6;f.record.result.value.accepted=false;assert.throws(()=>history(f.index,5),/failed attempt/);
});
test('unrelated source failure does not impersonate the selected source',()=>{
 const f=fixture(),v=sealedWorldIdentity({...f.next,id:6});addRecord(f.index,v,20,{accepted:false});assert.equal(history(f.index,5).matchedRecordCount,1);
});
test('missing or malformed identity, result, lock, descriptor and kind cannot prove absence',()=>{
 for(const mutate of [r=>delete r.lock,r=>delete r.request.value.colorSha256,r=>r.result.value.accepted=undefined,r=>r.result.value.levelSha256=H(800),r=>r.kind='unknown',r=>r.request.descriptor.sha256='bad']){
  const f=fixture();mutate(f.record);assert.throws(()=>history(f.index,5));
 }
 const f=fixture();f.index.files=f.index.files.filter(x=>x.path!==f.record.result.descriptor.path);assert.throws(()=>history(f.index,5),/descriptor missing/);
});
test('old accepted physical identity remains forbidden under new names',()=>{
 const f=fixture();f.q.level=clone(f.old);f.q.level.name='different';f.q.level.blocks.forEach(x=>x.id+='renamed');f.q.levelSha256=levelSha256(f.q.level);assert.throws(()=>check(f),/physical|partition/);
});
test('global identical partition is rejected despite different source and colours',()=>{
 const f=fixture(),other=clone(f.next);other.id=6;other.blocks[0].color='orange';f.index.worlds.push({identity:sealedWorldIdentity(other),sourceLevelId:6,levelId:6,reference:null});assert.throws(()=>check(f),/Existing partition/);
});
test('same shape inventory moved and recoloured remains forbidden for this source',()=>{
 const f=fixture(),moved=clone(f.old);moved.blocks[0].y=1;moved.blocks[0].color='yellow';f.q.level=moved;f.q.levelSha256=levelSha256(moved);assert.throws(()=>check(f),/shape AND true colour/);
});
test('renaming colours IDs while preserving real palette assignments is not a true colour change',()=>{
 const f=fixture();f.q.level.blocks.forEach((b,n)=>{b.id='new-'+n;b.color=f.old.blocks[n].color;});f.q.levelSha256=levelSha256(f.q.level);assert.throws(()=>check(f),/shape AND true colour/);
});
test('freshness rejects a cross-namespace record absent from world inventory',()=>{
 const f=fixture();addRecord(f.index,sealedWorldIdentity(f.next),20,{namespace:'c:/fixture/private'});assert.throws(()=>check(f),/cross-namespace/);
});
test('reference must be accepted, directly bound, authenticated and of the actual source',()=>{
 for(const mutate of [f=>f.receipt.accepted=false,f=>f.receipt.sourceLevelId=6,f=>f.reference.sha256=H(700),f=>f.receipt.level=f.next]){
  const f=fixture();mutate(f);assert.throws(()=>check(f));
 }
});
for(const type of ['design','skeleton','reference-family'])test('global retired '+type+' remains blocked',()=>{
 const f=fixture();f.index.retired=[type==='design'?{kind:type,designSha256:sealedWorldIdentity(f.next).designSha256}:type==='skeleton'?{kind:type,gates:f.next.gates,anchors:[f.next.blocks[0]]}:{kind:type,references:[f.reference]}];assert.throws(()=>check(f),/Retired/);
});
test('a retired accepted reference and unknown retirement classifier both reject',()=>{
 const f=fixture();f.index.retired=[{kind:'design',designSha256:sealedWorldIdentity(f.old).designSha256}];assert.throws(()=>check(f),/Retired/);f.index.retired=[{kind:'unknown'}];assert.throws(()=>check(f),/Unknown retired/);
});
test('missing global partition cannot silently weaken freshness',()=>{
 const f=fixture();delete f.index.worlds[0].identity.partitionSha256;assert.throws(()=>check(f),/partition/);
});
const p=()=>({version:VERSION,newInputs:1,newSearches:0,failedParentId:null,failedParentReceipt:null,firstSourceHistory:{status:'NO_FAILED_PENDING_OR_BLOCKED_SOURCE_HISTORY'},mathOptions:options()});
test('first-source options preserve original provided budgets and omit redesign and exceptions',()=>{
 const o=options();assert.deepEqual(o.lowerBudget,SHELL_PROVIDED_LOWER_BUDGET);assert.deepEqual(o.routeBudget,SHELL_PROVIDED_UNUSED_UPPER_BUDGET);assert.equal(o.lowerBudget.maxStates,9999);assert.equal(o.routeBudget.maxStates,1);assert.equal(o.routeStrategy,'native');assert.equal(o.searchUpper,128);assert(!Object.hasOwn(o,'redesignOf'));assert.equal(preflight(p()).failedParentId,null);
 o.lowerBudget.maxStates=10000;assert.equal(options().lowerBudget.maxStates,9999);
});
test('null parent is explicit, and preflight cannot authorize alternate options or exceptions',()=>{
 for(const mutate of [x=>delete x.failedParentId,x=>delete x.failedParentReceipt,x=>x.failedParentId=H(1),x=>x.failedParentReceipt=d(1),x=>x.mathOptions.redesignOf=null,x=>x.mathOptions.lowerBudget.maxStates=10000,x=>x.mathOptions.routeBudget.maxStates=4999,x=>x.mathOptions.routeStrategy='auto',x=>x.mathOptions.ledgerDirectory='private',x=>x.firstInputApproved=true,x=>x.allowRevalidation=true,x=>x.mechanismBaseReceipt=d(1),x=>x.qualificationOnly=true]){const x=p();mutate(x);assert.throws(()=>preflight(x));}
});
test('original plan/accounting accepts only literal null and does not invent calls after static refusal',()=>{
 const o=options(),plan={strategy:{route:'provided',lower:'projected-plain'},upperBudget:o.routeBudget,lowerBudget:o.lowerBudget,searchUpper:128,redesignOf:null,providedRouteSha256:H(6),mechanismBaseReceipt:null,acceptedBaseMechanismAdaptationRequested:false,sameExactObjectRevalidationAllowed:false,formedBeforeClaim:true,difficultyPolicyVersion:'1.198.0',inputLevelSha256:H(7)};
 assertShellProvidedSearchPlanV198(plan,null,H(6));assert.throws(()=>assertShellProvidedSearchPlanV198({...plan,redesignOf:H(1)},null,H(6)));
 const report=accountShellProvidedSearchReceiptV198({attemptPlan:plan,levelSha256:H(7),status:'BLOCKED_STATIC',accepted:false},{entered:true,returned:true,failedParentId:null,providedRouteSha256:H(6)});assert.equal(report.totalSearchCalls,0);assert.equal(report.conservativeFullWorlds,0);assert.deepEqual(report.replayCalls,{canonical:0,independent:0});
 assert.throws(()=>accountShellProvidedSearchReceiptV198({attemptPlan:plan,levelSha256:H(7),route:{search:{}},accepted:false},{entered:true,returned:true,failedParentId:null,providedRouteSha256:H(6)}),/Upper search/);
 const interrupted=accountShellProvidedSearchReceiptV198(null,{entered:true,returned:false,failedParentId:null,providedRouteSha256:H(6)});assert.equal(interrupted.totalSearchCalls,null);assert.equal(interrupted.lower,null);
});
test('static refusal still appends original world and closed construction while preserving all old prefixes',()=>{
 const f=fixture(),before=clone(f.index),s=appendCompactShellResultV198(f.index,{input:f.q,sourceReference:f.reference,result:{accepted:false,status:'BLOCKED_STATIC'},files:[],completion:d(700),experimentId:'private-static-refusal'});
 assert.deepEqual(f.index,before);assert.deepEqual(s.files.slice(0,before.files.length),before.files);assert.deepEqual(s.worlds.slice(0,before.worlds.length),before.worlds);assert.deepEqual(s.records,before.records);assert(s.closedExperimentIds.includes('private-static-refusal'));assert(s.worlds.some(w=>w.identity.levelSha256===f.q.levelSha256));assert.throws(()=>fresh(s,f.q,f.reference,f.receipt),/physical/);
});
test('saved projected world is preserved separately without replacing original world',()=>{
 const f=fixture(),projection=clone(f.next);projection.blocks[0].color='yellow';const s=appendCompactShellResultV198(f.index,{input:f.q,sourceReference:f.reference,result:{accepted:false,lowerBound:{projection:{projectedLevel:projection}}},files:[],completion:d(700),experimentId:'private-projection'});assert(s.worlds.some(w=>w.identity.levelSha256===f.q.levelSha256));assert(s.worlds.some(w=>w.identity.levelSha256===levelSha256(projection)));assert.equal(s.worlds.length,f.index.worlds.length+2);
});
test('seven actual temporary root listings reject an unsealed new file and accept an exact successor member',async()=>{
 if(process.platform!=='win32')return;const directory=await fs.mkdtemp(path.join(os.tmpdir(),'blockout-first-source-history-')),roots=Array.from({length:7},(_,n)=>({id:String(n),physicalPath:path.join(directory,String(n)),aliases:[]}));
 for(const r of roots)await fs.mkdir(r.physicalPath);const f=path.join(roots[3].physicalPath,'metadata.json'),index={scope:{baseDirectory:directory,roots},files:[]};
 try{await assertCompactHistoryMembersV198(index);await fs.writeFile(f,'{}',{flag:'wx'});await assert.rejects(()=>assertCompactHistoryMembersV198(index),/stale/);await assertCompactHistoryMembersV198({...index,files:[{path:f,sha256:H(1),rootId:'3'}]});}
 finally{await fs.unlink(f).catch(()=>{});for(const r of roots)await fs.rmdir(r.physicalPath);await fs.rmdir(directory);}
});
