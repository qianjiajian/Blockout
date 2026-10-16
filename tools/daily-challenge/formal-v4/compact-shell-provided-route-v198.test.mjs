import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {auditProvidedRouteCyclesV198} from './provided-route-cycle-audit-v198.mjs';
import {assertCompactShellProvidedCycleAuditV198 as checkCycle,assertCompactShellProvidedSelectionV198 as checkSelection} from './compact-shell-provided-route-v198.mjs';
import {assertCompactShellSelectionV198 as checkNativeSelection} from './compact-shell-execution-v198.mjs';
import {authoredShellProvidedMathOptionsV198,assertShellProvidedMathOptionsV198,assertShellProvidedSearchPlanV198,accountShellProvidedSearchReceiptV198} from './shell-provided-search-budget-v198.mjs';

// Small synthetic metadata fixtures only. They are not legal-level claims,
// complete routes, searches, game-model instances, or production identities.
const hash='a'.repeat(64),other='b'.repeat(64);
const inputDescriptor={path:'C:/fixture/input.json',sha256:hash};
const auditTool={path:'C:/fixture/provided-route-cycle-audit-v198.mjs',sha256:hash};
const seal=q=>({...q,levelSha256:levelSha256(q.level),routeSha256:routeSha256(q.drags)});
function fixture(){
 const level={id:5,width:4,height:4,mechanismRules:'revised-2026-09-27-v1.5',blocks:[{id:'shell',x:1,y:2,shape:[[0,0]],color:'red',layers:['red','blue']}],gates:[]};
 const source={...structuredClone(level),blocks:[{id:'source',x:0,y:0,shape:[[0,0],[1,0],[2,0],[3,0]],color:'yellow'}]};
 const held={...structuredClone(level),id:6,blocks:[{id:'held',x:0,y:0,shape:[[0,0],[1,0]],color:'cyan'}]};
 const formalLevel={...structuredClone(level),id:7,blocks:[{id:'formal',x:0,y:0,shape:[[0,0],[1,0],[2,0]],color:'pink'}]};
 const q=seal({level,sourceLevelId:5,sourceLevelSha256:levelSha256(source),stageKey:'mechanisms-multilayer-shell-15',difficulty:2,slot:1,newestMechanism:'multilayer-shell',unlockLevel:15,formalId:'daily-mechanisms-multilayer-shell-15-d2-01',accepted:false,formalReady:false,drags:[{blockId:'shell',path:[[1,1],[2,1]]}]});
 const representatives=[{level:held,formalId:'held',stageKey:q.stageKey,difficulty:2}],formal=[{level:formalLevel,formalId:'formal',stageKey:q.stageKey,difficulty:1}];
 return{q,source,representatives,formal};
}
const report=q=>({...auditProvidedRouteCyclesV198(q,{sourceFile:inputDescriptor}),auditTool});

test('sealed route and exact zero-closed audit pass metadata without certifying gameplay',()=>{
 const {q}=fixture(),before=structuredClone(q),r=checkCycle(q,report(q),inputDescriptor,auditTool);
 assert.equal(r.completeRouteValidated,false);assert.equal(r.mathematicalAcceptance,false);assert.equal(r.closedNonClearingGestures,0);assert.deepEqual(q,before);
});

test('source input binding remains exact from a different frozen working directory',()=>{
 const oldCwd=process.cwd(),root=fs.mkdtempSync(path.join(os.tmpdir(),'blockout-cycle-source-path-')),frozen=path.join(root,'frozen-workspace-4588');
 fs.mkdirSync(frozen);
 try{
  const {q}=fixture(),relative={path:'deliverables/input.json',sha256:hash},absolute={...relative,path:path.resolve(root,relative.path)};
  const tool={path:path.resolve(root,'tools/cycle-audit.mjs'),sha256:hash};
  const saved={...auditProvidedRouteCyclesV198(q,{sourceFile:absolute}),auditTool:tool};
  process.chdir(frozen);
  assert.throws(()=>checkCycle(q,saved,relative,tool),/audit input path/,'Unqualified frozen-relative input must not pass');
  const normalized={...relative,path:path.resolve(root,relative.path)};
  assert.equal(checkCycle(q,saved,normalized,tool).closedNonClearingGestures,0);
  assert.throws(()=>checkCycle(q,saved,{...normalized,path:path.resolve(root,'other/input.json')},tool),/audit input path/);
  assert.throws(()=>checkCycle(q,saved,{...normalized,sha256:other},tool));
 }finally{process.chdir(oldCwd);fs.rmdirSync(frozen);fs.rmdirSync(root);}
});

test('closed parking and a forged zero-count report are both rejected',()=>{
 const {q}=fixture();q.drags[0].path=[[1,1],[1,2]];const closed=seal(q),r=report(closed);
 assert.throws(()=>checkCycle(closed,r,inputDescriptor,auditTool),/Closed or malformed/);
 const forged=structuredClone(r);forged.status='STATIC_NO_CLOSED_GESTURES_FOUND';forged.findings=[];forged.avoidableParkingDrags=0;
 assert.throws(()=>checkCycle(closed,forged,inputDescriptor,auditTool),/Exact static/);
});

test('input bytes, route identity and audit implementation are independently bound',()=>{
 const {q}=fixture(),r=report(q);
 for(const mutate of [x=>x.sourceFile.sha256=other,x=>x.sourceFile.path='C:/fixture/another.json',x=>x.auditTool.sha256=other,x=>x.auditTool.path='C:/fixture/another-tool.mjs']){
  const changed=structuredClone(r);mutate(changed);assert.throws(()=>checkCycle(q,changed,inputDescriptor,auditTool));
 }
 const changed=structuredClone(q);changed.drags[0].path.pop();assert.throws(()=>checkCycle(changed,r,inputDescriptor,auditTool),/route hash/);
});

test('unsupported active mechanisms and malformed unit steps cannot masquerade as clean routes',()=>{
 for(const mutate of [q=>q.level.blocks[0].frozen=1,q=>q.drags[0].path=[[3,2]],q=>q.drags[0].path=[],q=>q.timeSchedule=[]]){
  const {q}=fixture();mutate(q);const changed=seal(q);assert.throws(()=>checkCycle(changed,report(changed),inputDescriptor,auditTool));
 }
});

test('supplied selection keeps source, formal and retained comparisons while native rejects it',()=>{
 const {q,source,representatives,formal}=fixture();const selected=checkSelection(q,source,representatives,formal);
 assert.equal(selected.comparisons.length,2);assert.equal(selected.sourceSimilarity.footprintSimilarity,0);
 assert.throws(()=>checkNativeSelection(q,source,representatives,formal),/borrowed\/padded/);
});

test('empty pools, occupied slots and a registered exact layout cannot bypass selection',()=>{
 const {q,source,representatives,formal}=fixture();
 assert.throws(()=>checkSelection(q,source,[],formal),/retained pool/);
 assert.throws(()=>checkSelection(q,source,representatives,[]),/formal registry/);
 assert.throws(()=>checkSelection(q,source,representatives,[{...formal[0],formalId:q.formalId}]),/occupied/);
 assert.throws(()=>checkSelection(q,source,representatives,[{...formal[0],level:q.level}]),/occupied/);
});

test('near retained geometry and near source layout remain blocked',()=>{
 const {q,source,representatives,formal}=fixture();
 assert.throws(()=>checkSelection(q,source,[{...representatives[0],level:q.level}],formal),/near layout/);
 const withSameSource={...q,sourceLevelSha256:q.levelSha256};
 assert.throws(()=>checkSelection(withSameSource,q.level,representatives,formal),/Source layout similarity/);
});

test('provided route does not permit imported L/U, proof or replay and cannot be absent',()=>{
 const {q,source,representatives,formal}=fixture();
 for(const k of ['L','U','proof','lowerBound','route','timeSchedule'])assert.throws(()=>checkSelection({...q,[k]:{}},source,representatives,formal),/borrowed mathematics/);
 const missing={...q};delete missing.drags;assert.throws(()=>checkSelection(missing,source,representatives,formal),/sealed before/);
});

test('provided mathematics fixes one lower allocation and disallows alternate options or upper plan',()=>{
 const o=authoredShellProvidedMathOptionsV198(hash);assertShellProvidedMathOptionsV198(o,hash);assert.equal(o.lowerBudget.maxStates,9999);assert.equal(o.routeBudget.maxStates,1);
 for(const mutate of [x=>x.lowerBudget.maxStates=10000,x=>x.routeBudget.maxStates=4999,x=>x.routeStrategy='auto',x=>x.redesignOf=other]){
  const changed=structuredClone(o);mutate(changed);assert.throws(()=>assertShellProvidedMathOptionsV198(changed,hash));
 }
 const plan={strategy:{route:'provided',lower:'projected-plain'},upperBudget:o.routeBudget,lowerBudget:o.lowerBudget,searchUpper:128,redesignOf:hash,providedRouteSha256:other,mechanismBaseReceipt:null,acceptedBaseMechanismAdaptationRequested:false,sameExactObjectRevalidationAllowed:false,formedBeforeClaim:true,difficultyPolicyVersion:'1.198.0'};
 assertShellProvidedSearchPlanV198(plan,hash,other);assert.throws(()=>assertShellProvidedSearchPlanV198({...plan,strategy:{route:'native',lower:'projected-plain'}},hash,other));
 const interrupted=accountShellProvidedSearchReceiptV198(null,{entered:true,returned:false,failedParentId:hash,providedRouteSha256:other});
 assert.equal(interrupted.upper,null);assert.equal(interrupted.lower,null);assert.equal(interrupted.totalSearchCalls,null);
});
