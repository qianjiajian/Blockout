import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {loadBoundedRuntime} from './bounded-proof.mjs';
import {guardedPlainTask,guardedIceTask,guardedNativeUpper,reservedGuardBudget,guardAllowanceFor} from './reserved-guard-budget.mjs';
const runtime=await loadBoundedRuntime(),evidence=[];
const out=process.env.RESERVED_GUARD_OUT??await fs.mkdtemp('deliverables/daily-formal-v3-20261008/proof/reserved-guard-test-');
if(process.env.RESERVED_GUARD_OUT)await fs.mkdir(out,{recursive:false});
const level={id:998742,name:'New isolated terminal guard fixture',width:2,height:2,timeSeconds:100,reward:0,difficulty:'hard',mechanismRules:'revised-2026-09-27-v1.5',
 blocks:[{id:'new-red',x:0,y:0,color:'red',shape:[[0,0]]},{id:'new-blue',x:1,y:0,color:'blue',shape:[[0,0]]}],
 gates:[{id:'red',side:'top',offset:0,size:1,color:'red'},{id:'blue',side:'top',offset:1,size:1,color:'blue'}]};
const ice=structuredClone(level);ice.blocks[1].frozen=1;
async function observedPrimitive(file,needle){
 const original=await fs.readFile(file,'utf8');assert.equal(original.split(needle).length,2);
 let source=original.replace(needle,needle+'globalThis.__observeGuardWorld(s);');
 source=source.replace(/from (['"])(\.[^'"]+)\1/g,(_m,_q,relative)=>`from ${JSON.stringify(pathToFileURL(path.resolve(path.dirname(file),relative)).href)}`);
 return import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
}
test('9999 raw registrations reserve one world; 10000 and forged counts are refused',()=>{
 assert.equal(reservedGuardBudget().maxStates,9999);assert.throws(()=>reservedGuardBudget({maxStates:10000}),/9999/);
 assert.throws(()=>guardAllowanceFor({budget:{maxStates:9999},rawFullBoardStates:10000}));
 evidence.push({test:'budget-input-guards',pass:true});
});
test('plain and ice stop at the first unregistered closure world, and successful counts stay separate from the bound',async()=>{
 for(const [domain,file,needle,input,fn]of [
  ['plain','tools/daily-challenge/formal-v3/bounded-proof.mjs','const recordRaw=s=>{',level,'boundedPlainTask'],
  ['ice','tools/daily-challenge/formal-v3/bounded-ice-proof.mjs','const record=s=>{',ice,'boundedIceTask']]){
  const instrumented=await observedPrimitive(file,needle),cases=[];
  for(const cap of [1,2,8]){
   const worlds=new Set();globalThis.__observeGuardWorld=s=>worlds.add(String.fromCharCode(...s));
   const result=instrumented[fn](input,runtime,{floor:1,searchUpper:8,maxStates:cap,maxMilliseconds:1000});
   const allowance=guardAllowanceFor(result);assert(worlds.size<=allowance.conservativeFullBoardStateUpperBound);
   if(cap<3){assert.equal(result.status,'unknown');assert.equal(worlds.size,cap+1);assert.equal(result.rawFullBoardStates,cap);}
   else{assert.equal(worlds.size,3);assert.equal(result.rawFullBoardStates,3);assert.equal(result.cost,0);}
   cases.push({cap,resultStatus:result.status,registered:result.rawFullBoardStates,observed:worlds.size,conservativeUpperBound:allowance.conservativeFullBoardStateUpperBound});
  }
  evidence.push({test:`${domain}-first-terminal-world`,pass:true,cases,instrumentation:'In-memory source observer at record entry only; frozen file unchanged'});
 }
 delete globalThis.__observeGuardWorld;
});
test('plain parking candidate guard also returns immediately after at most one new complete world',async()=>{
 const parked=structuredClone(level);parked.blocks.push({id:'new-green',x:0,y:1,color:'green',shape:[[0,0]]});
 parked.gates=[{id:'red',side:'bottom',offset:1,size:1,color:'red'},{id:'blue',side:'left',offset:0,size:1,color:'blue'},{id:'green',side:'right',offset:0,size:1,color:'green'}];
 const engine=await observedPrimitive('tools/daily-challenge/formal-v3/bounded-proof.mjs','const recordRaw=s=>{'),worlds=new Set();
 globalThis.__observeGuardWorld=s=>worlds.add(String.fromCharCode(...s));
 const r=engine.boundedPlainTask(parked,runtime,{floor:1,searchUpper:8,maxStates:1,maxMilliseconds:1000});
 assert.equal(r.parkingTransitions,1);assert.equal(r.status,'unknown');assert.equal(r.rawFullBoardStates,1);assert.equal(worlds.size,2);
 evidence.push({test:'plain-parking-first-terminal-world',pass:true,registered:1,observed:2});delete globalThis.__observeGuardWorld;
});
test('native committed worlds are bounded by raw registrations plus one and dynamic domains still have zero search',()=>{
 const worlds=new Set(),key=m=>{const {moves,...s}=m.snapshot();return JSON.stringify(s);};
 const track=m=>{const clone=m.clone.bind(m),commit=m.commitAction.bind(m),start=m.startCountdown.bind(m);m.clone=()=>track(clone());m.startCountdown=()=>{start();worlds.add(key(m));};m.commitAction=()=>{const ok=commit();if(ok)worlds.add(key(m));return ok;};return m;};
 class Tracked extends runtime.PuzzleModel{constructor(...args){super(...args);return track(this);}}
 const r=guardedNativeUpper({...runtime,PuzzleModel:Tracked},level,{maxStates:1,maxMilliseconds:1000});
 assert.equal(r.status,'unknown');assert.equal(worlds.size,2);assert.equal(r.guardAllowance.conservativeFullBoardStateUpperBound,2);
 const bomb=structuredClone(level);bomb.blocks[0].timedBombSeconds=99;const rejected=guardedNativeUpper(runtime,bomb);
 assert.equal(rejected.status,'unsupported');assert.equal(rejected.rawFullBoardStates,0);
 evidence.push({test:'native-commit-and-domain',pass:true,registered:r.rawFullBoardStates,observed:worlds.size,reportedConservativeUpperBound:2});
});
test('new wrappers keep success evidence and exact registered counts unchanged, without accepting a candidate',()=>{
 for(const [domain,r]of [['plain',guardedPlainTask(level,runtime,{floor:1,searchUpper:8,maxStates:8})],['ice',guardedIceTask(ice,runtime,{floor:1,searchUpper:8,maxStates:8})]]){
  assert.equal(r.rawFullBoardStates,3);assert.equal(r.guardAllowance.conservativeFullBoardStateUpperBound,4);assert.equal(r.guardAllowance.exactFullBoardVisitedCountClaimed,false);assert.equal(r.accepted,undefined);
  evidence.push({test:`${domain}-wrapper-separate-bound`,pass:true,registered:3,conservativeUpperBound:4});
 }
});
test.after(async()=>{const bindings={};for(const file of ['tools/daily-challenge/formal-v3/reserved-guard-budget.mjs','tools/daily-challenge/formal-v3/reserved-guard-budget.test.mjs','tools/daily-challenge/formal-v3/bounded-proof.mjs','tools/daily-challenge/formal-v3/bounded-ice-proof.mjs'])bindings[file]=createHash('sha256').update(await fs.readFile(file)).digest('hex');
 await fs.writeFile(`${out}/report.json`,JSON.stringify({status:evidence.length===7?'RESERVED_TERMINAL_WORLD_BOUND_QUALIFIED':'QUALIFICATION_INCOMPLETE',proofToolchainSha256:runtime.toolchainSha256,
  evidence,bindings,productionCandidatesSearched:0,publicLedgerWrites:0,frozenCoreChanged:false,formalReady:false},null,2)+'\n',{flag:'wx'});
});
