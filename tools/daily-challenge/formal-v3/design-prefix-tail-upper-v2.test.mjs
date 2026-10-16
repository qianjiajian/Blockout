import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {loadBoundedRuntime} from './bounded-proof.mjs';
import {prefixTailPlan,constructPrefixTailUpper,explorePrefixTailCandidate,recoverVacancyPrefix} from './design-prefix-tail-upper-v2.mjs';
import {singleVacancyGraph} from './design-single-vacancy.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';
const runtime=await loadBoundedRuntime(),evidence=[];
const out=process.env.PREFIX_TAIL_V2_OUT??fs.mkdtempSync('deliverables/daily-formal-v3-20261008/proof/prefix-tail-v2-');
if(process.env.PREFIX_TAIL_V2_OUT)fs.mkdirSync(out);
const level={id:999818,name:'New isolated native tail qualification',width:2,height:2,timeSeconds:100,reward:0,difficulty:'hard',mechanismRules:'revised-2026-09-27-v1.5',
 blocks:[{id:'r',x:0,y:0,shape:[[0,0]],color:'red'},{id:'b',x:1,y:0,shape:[[0,0]],color:'blue'},
  {id:'g',x:1,y:1,shape:[[0,0]],color:'green'},{id:'y',x:0,y:1,shape:[[0,0]],color:'yellow'}],
 gates:[{id:'gate-r',side:'top',offset:0,size:1,color:'red'},{id:'gate-b',side:'bottom',offset:1,size:1,color:'blue'},
  {id:'gate-g',side:'left',offset:1,size:1,color:'green'},{id:'gate-y',side:'top',offset:1,size:1,color:'yellow'}]};
const prefix=[{blockId:'r',path:[],exitSide:'top'}];
test('fixed original prefix + one native tail clears exact inventory in both real models',()=>{
 const before=levelSha256(level),plan=prefixTailPlan(level,prefix,{upperBudget:{maxStates:100,maxMilliseconds:5000},lowerBudget:{maxStates:100},floor:1});
 const r=constructPrefixTailUpper(runtime,level,prefix,{plan});assert(r.valid,r.reason);assert.equal(r.tailSearches,1);assert(r.U>=1);
 assert.equal(r.canonical.clearEvents,4);assert.equal(r.independent.clearEvents,4);assert.equal(levelSha256(level),before);
 assert.equal(r.conservativeFullBoardStateUpperBound,2+r.tailSearch.rawFullBoardStates+1);assert(r.conservativeFullBoardStateUpperBound<=100);
 evidence.push({test:'actual-complete-tail',passed:true,level,report:r});
});
test('terminal native world is reserved together with prefix; tiny cap stops without a second tail',()=>{
 const plan=prefixTailPlan(level,prefix,{upperBudget:{maxStates:4,maxMilliseconds:5000},lowerBudget:{maxStates:100},floor:1});
 assert.equal(plan.tailBudget.maxStates,1);
 const r=constructPrefixTailUpper(runtime,level,prefix,{plan});assert.equal(r.valid,false);assert.equal(r.tailSearches,1);
 assert.equal(r.tailSearch.rawFullBoardStates,1);assert.equal(r.conservativeFullBoardStateUpperBound,4);
 evidence.push({test:'prefix-plus-terminal-budget',passed:true,report:r});
});
test('prefix first-contact, skipped unit steps, active mechanisms and changed plans fail closed',()=>{
 const bad=[{blockId:'r',path:[[0,1]]}],r=constructPrefixTailUpper(runtime,level,bad);
 assert.equal(r.valid,false);assert.equal(r.tailSearches,0);assert.match(r.reason,/Pointer-down exit/);
 const jump=[...prefix,{blockId:'b',path:[[-1,0]]}],j=constructPrefixTailUpper(runtime,level,jump);
 assert.equal(j.valid,false);assert.equal(j.tailSearches,0);assert.match(j.reason,/unit step/);
 for(const field of ['frozen','lockedBy','shutterId','timedBombSeconds']){
  const changed=structuredClone(level);changed.blocks[0][field]=field==='frozen'?1:'x';assert.throws(()=>prefixTailPlan(changed,prefix));
 }
 for(const maxStates of [0,NaN,Infinity,10001,3])assert.throws(()=>prefixTailPlan(level,prefix,{upperBudget:{maxStates}}));
 const plan=prefixTailPlan(level,prefix);plan.tailBudget.maxStates++;
 assert.throws(()=>constructPrefixTailUpper(runtime,level,prefix,{plan}),/plan/);
 evidence.push({test:'domain-and-fixed-prefix-negative-cases',passed:true});
});
test('a complete fixed prefix needs no tail and a continuous turn is replayed as one held gesture',()=>{
 const input={...level,blocks:[{id:'o',x:1,y:0,shape:[[0,0],[0,1]],color:'blue'},
  {id:'r',x:0,y:0,shape:[[0,0]],color:'red'},{id:'g',x:0,y:1,shape:[[0,0]],color:'green'}],
 gates:[{id:'gate-b',side:'right',offset:0,size:2,color:'blue'},{id:'gate-r',side:'bottom',offset:1,size:1,color:'red'},
 {id:'gate-g',side:'left',offset:1,size:1,color:'green'}]};
 const drags=[{blockId:'o',path:[],exitSide:'right'},{blockId:'r',path:[[1,0],[1,1]],exitSide:'bottom'},{blockId:'g',path:[],exitSide:'left'}];
 const r=constructPrefixTailUpper(runtime,input,drags);assert(r.valid,r.reason);assert.equal(r.tailSearches,0);assert.equal(r.U,0);
 assert.equal(r.conservativeFullBoardStateUpperBound,4);evidence.push({test:'complete-prefix-and-turn',passed:true,report:r});
});
test('isolated ledger records method before search, blocks failed full input and never claims its tail separately',async()=>{
 const directory=`${out}/failed-toy-ledger`;
 const r=await explorePrefixTailCandidate(runtime,{level,sourceLevelId:999818},{prefixDrags:prefix,floor:1,upperBudget:{maxStates:4},ledgerDirectory:directory});
 assert.equal(r.accepted,false);assert.equal(r.lowerBound,null);assert(fs.existsSync(`${directory}/${r.attempt.id}.blocked.json`));
 const names=fs.readdirSync(directory);assert.equal(names.filter(p=>p.endsWith('.request.json')).length,1);
 const plan=JSON.parse(fs.readFileSync(r.planEvidence.path));assert.equal(plan.levelSha256,levelSha256(level));
 assert.equal(plan.plan.tailBudget.maxStates,1);
 await assert.rejects(()=>explorePrefixTailCandidate(runtime,{level,sourceLevelId:999818},{prefixDrags:prefix,floor:1,ledgerDirectory:directory}),/INPUT_ALREADY_ATTEMPTED/);
 evidence.push({test:'isolated-full-input-ledger-failure',passed:true,report:r});
});
test('new isolated input obtains separate original L and complete original U in one declared attempt',async()=>{
 const r=await explorePrefixTailCandidate(runtime,{level,sourceLevelId:999818},{prefixDrags:prefix,floor:1,
  upperBudget:{maxStates:100},lowerBudget:{maxStates:100},ledgerDirectory:`${out}/success-toy-ledger`});
 assert(r.accepted,r.error??r.status);assert.equal(r.L,1);assert.equal(r.lowerBound.result.sourceLevelSha256,levelSha256(level));
 assert.equal(r.formalReady,false);assert.equal(r.upperConstruction.tailSearches,1);
 evidence.push({test:'independent-original-lower',passed:true,report:r});
});
test('fixed geometry parent chain recovers a full turning hold and deducts its micro work from the same upper task',()=>{
 const input={...level,blocks:[{id:'opening',x:1,y:0,shape:[[0,0],[0,1]],color:'blue'},
  {id:'r',x:0,y:0,shape:[[0,0]],color:'red'},{id:'g',x:0,y:1,shape:[[0,0]],color:'green'}],
 gates:[{id:'gate-b',side:'right',offset:0,size:2,color:'blue'},{id:'gate-r',side:'bottom',offset:1,size:1,color:'red'},
 {id:'gate-g',side:'left',offset:1,size:1,color:'green'}]};
 const geometry={built:{blocks:input.blocks},result:singleVacancyGraph(input,input.blocks,{maxStates:100,maxDepth:4})};
 const targetNodeIndex=geometry.result.queue.findIndex(n=>n.positions[0][0]===1&&n.positions[0][1]===1&&n.positions[1][0]===0&&n.positions[1][1]===1);
 const args={targetNodeIndex,exitBlockId:'r',exitSide:'bottom',openingExitSide:'right'};
 const prefix=recoverVacancyPrefix(runtime,input,geometry,args);
 assert.deepEqual(prefix.drags[1],{blockId:'r',path:[[1,0],[1,1]],exitSide:'bottom'});
 const plan=prefixTailPlan(input,prefix.drags,{prefixRecovery:prefix.accounting,upperBudget:{maxStates:100}});
 assert.equal(plan.tailBudget.maxMicroStates,plan.fullUpperBudget.maxMicroStates-prefix.accounting.microDiscoveredStates);
 assert.equal(plan.tailBudget.maxTransitions,plan.fullUpperBudget.maxTransitions-prefix.accounting.attemptedTransitions);
 const r=constructPrefixTailUpper(runtime,input,prefix.drags,{plan});assert(r.valid,r.reason);assert.equal(r.U,0);
 assert.throws(()=>recoverVacancyPrefix(runtime,input,geometry,{...args,maxMicroStates:1}),/micro-budget/);
 const corrupt=structuredClone(geometry);corrupt.result.queue[targetNodeIndex].parent=targetNodeIndex;
 assert.throws(()=>recoverVacancyPrefix(runtime,input,corrupt,args),/cyclic/);
 evidence.push({test:'fixed-parent-unit-recovery',passed:true,recovery:prefix,report:r});
});
test('declared rectangular plain joint tail supplies only U; independent lower binds the full original',async()=>{
 const plan=prefixTailPlan(level,prefix,{tailStrategy:'plain-joint',floor:1,upperBudget:{maxStates:100},lowerBudget:{maxStates:100}});
 const r=constructPrefixTailUpper(runtime,level,prefix,{plan});assert(r.valid,r.reason);assert.equal(r.U,1);assert.equal(r.tailSearch.floor,1);
 assert.equal(r.tailSearch.sourceLevelSha256,r.tailLevelSha256);assert.notEqual(r.tailLevelSha256,r.levelSha256);
 assert.equal(r.conservativeFullBoardStateUpperBound,2+r.tailSearch.rawFullBoardStates+1);
 const qualified=await explorePrefixTailCandidate(runtime,{level,sourceLevelId:999818},{prefixDrags:prefix,tailStrategy:'plain-joint',floor:1,
  upperBudget:{maxStates:100},lowerBudget:{maxStates:100},ledgerDirectory:out+'/plain-success-toy-ledger'});
 assert(qualified.accepted,qualified.status);assert.equal(qualified.lowerBound.result.sourceLevelSha256,levelSha256(level));
 evidence.push({test:'plain-tail-complete-and-independent-L',passed:true,report:qualified});
});
test('plain tail shares prefix raw allowance and refuses nonrectangles/strategy changes before search',()=>{
 const plan=prefixTailPlan(level,prefix,{tailStrategy:'plain-joint',upperBudget:{maxStates:4},floor:1});
 const r=constructPrefixTailUpper(runtime,level,prefix,{plan});assert.equal(r.valid,false);assert.equal(r.tailSearches,1);assert.equal(r.conservativeFullBoardStateUpperBound,4);
 const changed=structuredClone(level);changed.blocks[0].shape=[[0,0],[1,0],[0,1]];
 assert.throws(()=>prefixTailPlan(changed,prefix,{tailStrategy:'plain-joint'}),/rectangular/);
 assert.throws(()=>prefixTailPlan(level,prefix,{tailStrategy:'fallback'}),/strategy/);
 plan.tailStrategy='native';assert.throws(()=>constructPrefixTailUpper(runtime,level,prefix,{plan}),/plan/);
 evidence.push({test:'plain-tail-domain-budget-negative',passed:true,report:r});
});
test('a threshold boolean without a complete tail is never treated as a witness',()=>{
 const input={...level,width:3,height:3,blocks:[{id:'o',x:0,y:0,shape:[[0,0]],color:'red'},
  {id:'a',x:1,y:0,shape:[[0,0],[1,0]],color:'blue'},{id:'b',x:0,y:1,shape:[[0,0],[0,1]],color:'green'},
  {id:'c',x:1,y:1,shape:[[0,0],[1,0]],color:'yellow'},{id:'d',x:1,y:2,shape:[[0,0],[1,0]],color:'purple'}],
 gates:[{id:'gate-o',side:'top',offset:0,size:1,color:'red'},{id:'gate-a',side:'bottom',offset:1,size:2,color:'blue'},
  {id:'gate-b',side:'top',offset:1,size:1,color:'green'},{id:'gate-c',side:'left',offset:0,size:1,color:'yellow'},
  {id:'gate-d',side:'right',offset:1,size:1,color:'purple'}]};
 const fixed=[{blockId:'o',path:[],exitSide:'top'}],plan=prefixTailPlan(input,fixed,{tailStrategy:'plain-joint',searchUpper:1,upperBudget:{maxStates:100}});
 const r=constructPrefixTailUpper(runtime,input,fixed,{plan});assert.equal(r.valid,false);assert.equal(r.tailSearch.thresholdProven,true);
 assert.equal(r.tailSearch.routeTermination,'search-upper-exhausted');assert.equal(r.U,null);assert.equal(r.tailSearches,1);
 evidence.push({test:'no-tail-witness-despite-threshold',passed:true,report:r});
});
test.after(()=>{
 const files=['tools/daily-challenge/formal-v3/design-prefix-tail-upper-v2.mjs','tools/daily-challenge/formal-v3/design-prefix-tail-upper-v2.test.mjs'];
 fs.writeFileSync(`${out}/report.json`,JSON.stringify({status:evidence.length===10?'QUALIFIED_ON_NEW_ISOLATED_FIXTURES':'INCOMPLETE',evidence,
  toolBindings:Object.fromEntries(files.map(p=>[p,createHash('sha256').update(fs.readFileSync(p)).digest('hex')])),
  proofToolchainSha256:runtime.toolchainSha256,realCandidateSolverCalls:0,publicLedgerWrites:0,productionChanged:false,formalReady:false},null,2)+'\n',{flag:'wx'});
});
