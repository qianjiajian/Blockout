import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {boundedPlainTask} from './bounded-proof.mjs';
import {loadNativeLowerRuntime,boundedNativeLowerTask,assertNativeLowerDomain,heldWorldChanged,nativeBoardKey} from './bounded-native-lower.mjs';

const runtime=await loadNativeLowerRuntime();
const tiny=()=>({id:996408,name:'new native lower qualification only',difficulty:'hard',reward:0,timeSeconds:90,
  mechanismRules:'revised-2026-09-27-v1.5',width:2,height:2,
  blocks:[{id:'r',x:0,y:0,shape:[[0,0]],color:'red'},{id:'b',x:1,y:0,shape:[[0,0]],color:'blue'}],
  gates:[{id:'r-out',side:'top',offset:0,size:1,color:'red'},{id:'b-out',side:'left',offset:0,size:1,color:'blue'}]});
export function nativeQualificationFixtures(){
  const plain=tiny(),iceGate=tiny();iceGate.gates[0].frozen=1;
  const iceBody=tiny();iceBody.blocks.push({id:'green',x:0,y:1,shape:[[0,0]],color:'green',frozen:1});
  iceBody.gates.push({id:'green-out',side:'bottom',offset:0,size:1,color:'green'});
  const key=tiny();key.blocks[0].keyId='native-key';key.blocks[1].lockedBy='native-key';key.blocks[1].lockCount=1;
  const shell=tiny();shell.blocks[0].color='green';shell.blocks[0].layers=['red','green'];
  shell.gates.push({id:'green-out',side:'bottom',offset:0,size:1,color:'green'});
  const star=tiny();star.blocks[0].star=true;star.gates[0].star=true;
  const axis=tiny();axis.blocks[0].movementAxis='horizontal';
  const grid=structuredClone(iceGate);grid.coloredGrids=[{id:'blue-cell',color:'blue',cells:[[1,1]]}];
  const shutter=tiny();shutter.shutters=[{id:'physical-cover',x:0,y:1,width:1,height:1,count:1}];
  shutter.blocks.push({id:'hidden',x:0,y:1,shape:[[0,0]],color:'green',shutterId:'physical-cover'});
  shutter.gates.push({id:'green-out',side:'bottom',offset:0,size:1,color:'green'});
  const heldTurn=tiny();heldTurn.blocks=[{id:'b',x:1,y:1,shape:[[0,0]],color:'blue'}];heldTurn.gates=heldTurn.gates.slice(1);
  return {plain,iceGate,iceBody,key,shell,star,axis,grid,shutter,heldTurn};
}

/** Independent unit-step oracle, with selected ID + dirty hold explicitly in
 * its state. Selection and unit moves cost 0, release costs 1, exits cost 0
 * and terminate the hold. It does not call the new gesture enumerator, its
 * keys, its classifier, projections, free-clear closure or body quotient.
 * Only the authoritative model's local legal actions are shared.
 */
export function heldStepOracle(level){
  const base=new runtime.PuzzleModel(level);base.start();
  const key=(s,id,dirty)=>{const {moves,...physical}=s;return JSON.stringify([physical,id,dirty]);};
  const start={s:base.snapshot(),held:null,dirty:false,cost:0};
  const open=[start],best=new Map([[key(start.s,null,false),0]]),settled=new Set();let expanded=0,actions=0;
  const add=(s,held,dirty,cost)=>{
    const k=key(s,held,dirty);if((best.get(k)??Infinity)<=cost)return;
    assert(best.has(k)||best.size<10000,'independent tiny oracle hard state budget');
    best.set(k,cost);open.push({s,held,dirty,cost});
  };
  while(open.length){
    open.sort((a,b)=>b.cost-a.cost);const node=open.pop(),k=key(node.s,node.held,node.dirty);
    if(best.get(k)!==node.cost||settled.has(k))continue;settled.add(k);
    assert(++expanded<=10000);assert(++actions<=100000);
    if(node.s.complete)return {cost:node.cost,discovered:best.size,expanded,actions};
    const model=new runtime.PuzzleModel(level);model.restore(node.s);
    if(node.held===null){
      for(const body of node.s.blocks)if(model.isBlockActive(body))add(node.s,body.id,false,node.cost);
      continue;
    }
    if(node.dirty)add(node.s,null,false,node.cost+1);
    const body=model.getBlock(node.held);
    for(const [dx,dy]of [[-1,0],[0,1],[1,0],[0,-1]]){
      assert(++actions<=100000);const next=new runtime.PuzzleModel(level);next.restore(node.s);next.beginAction();
      if(next.moveBlockStep(body.id,body.x+dx,body.y+dy))add(next.snapshot(),body.id,true,node.cost);
    }
    for(const side of ['left','bottom','right','top']){
      assert(++actions<=100000);const next=new runtime.PuzzleModel(level);next.restore(node.s);next.beginAction();
      if(next.tryExit(body.id,side).ok){assert(next.commitAction());add(next.snapshot(),null,false,node.cost);}
    }
  }
  return {cost:null,discovered:best.size,expanded,actions,exhausted:true};
}

const results=[];
test('new tiny full native mechanism graphs agree with independent held-step 0/1 oracle',()=>{
  for(const [name,level]of Object.entries(nativeQualificationFixtures())){
    const oracle=heldStepOracle(level),proof=boundedNativeLowerTask(runtime,level,{floor:4});
    if(oracle.cost===null||oracle.cost>=4)assert.equal(proof.thresholdProven,true,name);
    else {assert.equal(proof.status,'relaxed-shortcut',name);assert.equal(proof.minimumOptionalCost,oracle.cost,name);}
    assert(proof.discoveredStates<=10000&&proof.exploredStates<=proof.discoveredStates);
    assert.equal(proof.rawFullBoardStates,proof.discoveredStates);assert.equal(proof.rawExploredStates,proof.exploredStates);
    assert.equal(proof.catalogAcceptanceEnabled,false);assert.equal(proof.retryLedgerValidated,false);
    results.push({name,level,oracle,proof});
  }
});
test('ice itself increases fresh native lower from zero to one; original complete route agrees',()=>{
  const {plain,iceGate}=nativeQualificationFixtures();
  const loose=boundedPlainTask(plain,runtime,{floor:1});assert.equal(loose.cost,0);
  const lower=boundedNativeLowerTask(runtime,iceGate,{floor:1});assert.equal(lower.thresholdProven,true);assert.equal(lower.L,1);
  const diagnostic=results.find(r=>r.name==='iceGate').proof;
  assert.equal(diagnostic.minimumOptionalCost,1);
  const replay=runtime.replayRevisedRoute(iceGate,diagnostic.drags);
  assert.equal(replay.valid,true);assert.equal(replay.complete,true);assert.equal(replay.nonClearingDrags,1);
  results.push({name:'mechanism-adds-cost',level:iceGate,lower,knownDiagnosticReplay:replay});
});
test('one sustained held turn ending in a clear costs zero, not per segment',()=>{
  const found=results.find(r=>r.name==='heldTurn');
  assert.equal(found.oracle.cost,0);assert.equal(found.proof.minimumOptionalCost,0);
  assert.equal(found.proof.drags.length,1);assert(found.proof.drags[0].path.length>=2);
  assert.equal(runtime.replayRevisedRoute(found.level,found.proof.drags).nonClearingDrags,0);
});
test('all labelled two-body placements with independent body/gate ice agree, including unsolvable orders',()=>{
  let graphs=0;
  for(let red=0;red<4;red++)for(let blue=0;blue<4;blue++)if(red!==blue)
    for(const variant of ['plain','gate','body','shell']){
      const level=tiny();Object.assign(level.blocks[0],{x:red%2,y:Math.floor(red/2)});
      Object.assign(level.blocks[1],{x:blue%2,y:Math.floor(blue/2)});
      if(variant==='gate')level.gates[0].frozen=1;
      if(variant==='body')level.blocks[0].frozen=1;
      if(variant==='shell'){level.blocks[0].color='blue';level.blocks[0].layers=['red','blue'];}
      const oracle=heldStepOracle(level),proof=boundedNativeLowerTask(runtime,level,{floor:4});
      assert.equal(proof.status,oracle.cost===null||oracle.cost>=4?'threshold-proven':'relaxed-shortcut',`${red}/${blue}/${variant}`);
      if(oracle.cost!==null&&oracle.cost<4)assert.equal(proof.minimumOptionalCost,oracle.cost);
      graphs++;
    }
  assert.equal(graphs,48);results.push({name:'all-labelled-two-body-configurations',independentOracleGraphs:graphs});
});
test('any exhausted board, micro, per-drag or transition budget remains UNKNOWN within the cap',()=>{
  const level=nativeQualificationFixtures().iceGate;
  for(const budget of [{maxStates:1},{maxMicroStates:1},{maxDragStates:1},{maxTransitions:1}]){
    const r=boundedNativeLowerTask(runtime,level,{floor:3,...budget});assert.equal(r.status,'unknown');assert.equal(r.thresholdProven,false);assert.equal(r.L,null);
    assert(r.discoveredStates<=r.budget.maxStates&&r.exploredStates<=r.budget.maxStates);
    assert(r.microDiscoveredStates<=r.budget.maxMicroStates&&r.attemptedTransitions<=r.budget.maxTransitions);
  }
  assert.throws(()=>boundedNativeLowerTask(runtime,level,{floor:3,maxStates:10001}));
  assert.throws(()=>boundedNativeLowerTask(runtime,level,{floor:3,maxTransitions:10000001}));
});
test('world classifier detects mid-hold FIFO/lift mutation and new lower refuses those domains',()=>{
  const level={...tiny(),width:3,height:3,
    gates:[{id:'red',side:'right',offset:0,size:3,color:'red'},{id:'blue',side:'left',offset:0,size:3,color:'blue'}],
    blocks:[{id:'owner',x:1,y:0,shape:[[0,0]],color:'red'},{id:'cargo',x:1,y:0,shape:[[0,0]],color:'blue'}],
    generators:[{id:'feeder',side:'top',offset:1,spawn:[1,0],queueBlockIds:['cargo'],trigger:'move'}]};
  const generator=new runtime.PuzzleModel(level);generator.start();const before=generator.snapshot();generator.beginAction();
  assert(generator.moveBlockStep('owner',2,0));assert(heldWorldChanged(before,generator,'owner'));
  assert.equal(generator.snapshot().queuedBlocks.length,0);assert.equal(generator.snapshot().generators[0].head,1);
  const lift=structuredClone(level);delete lift.generators;lift.shutters=[{id:'lift',skin:'lift',x:1,y:0,width:1,height:1,count:1}];lift.blocks[1].shutterId='lift';
  const lifted=new runtime.PuzzleModel(lift);lifted.start();const prior=lifted.snapshot();lifted.beginAction();
  assert(lifted.moveBlockStep('owner',2,0));assert(heldWorldChanged(prior,lifted,'owner'));
  assert.equal(lifted.snapshot().shutters[0].revealed,true);
  for(const input of [level,lift]){const result=boundedNativeLowerTask(runtime,input,{floor:1});assert.equal(result.status,'unsupported');assert.equal(result.discoveredStates,0);}
  const pure=new runtime.PuzzleModel(tiny());pure.start();const pose=pure.snapshot();pure.beginAction();assert(pure.moveBlockStep('r',0,1));
  assert.equal(heldWorldChanged(pose,pure,'r'),false);assert.notEqual(nativeBoardKey(pose),nativeBoardKey(pure));
});
test('timed, animated, future and incomplete hidden semantics fail closed',()=>{
  const mutations=[l=>{l.blocks[0].timedBombSeconds=10;},l=>{l.blocks[0].futureMechanism=true;},
    l=>{l.flipDoors=[{...l.gates.pop(),initiallyOpen:true}];},l=>{l.dailyProof={kind:'unknown'};},
    l=>{l.shutters=[{id:'unfilled',x:0,y:1,width:2,height:1,count:1}];l.blocks.push({id:'one',shutterId:'unfilled',x:0,y:1,color:'green',shape:[[0,0]]});}];
  for(const mutate of mutations){const l=tiny();mutate(l);assert.throws(()=>assertNativeLowerDomain(runtime,l));
    const p=boundedNativeLowerTask(runtime,l,{floor:1});assert.equal(p.status,'unsupported');assert.equal(p.thresholdProven,false);}
});
test('unexpected world mutation in an otherwise admitted held step cannot produce a lower certificate',()=>{
  // Simulates a future runtime mutation without weakening the input-domain
  // checks; the per-step invariant must independently stop the proof.
  class ChangedRuntime extends runtime.PuzzleModel {
    clone(){const copy=new ChangedRuntime(this.level);copy.restore(this.snapshot());return copy;}
    moveBlockStep(...args){const moved=super.moveBlockStep(...args);if(moved){const s=this.snapshot();s.cleared+=1;this.restore(s);}return moved;}
  }
  const proof=boundedNativeLowerTask({...runtime,PuzzleModel:ChangedRuntime},nativeQualificationFixtures().iceGate,{floor:1});
  assert.equal(proof.status,'unsupported');assert.equal(proof.termination,'UNSUPPORTED_HELD_WORLD_MUTATION');
  assert.equal(proof.thresholdProven,false);assert.equal(proof.L,null);
});

test.after(async()=>{
  if(!process.env.NATIVE_QUALIFICATION_OUT)return;
  const out=process.env.NATIVE_QUALIFICATION_OUT;await fs.mkdir(out,{recursive:false});
  await fs.writeFile(`${out}/report.json`,JSON.stringify({schemaVersion:1,mode:'NEW_TINY_RESEARCH_QUALIFICATION_ONLY',
    nativeToolchainSha256:runtime.nativeLowerSha256,boundedToolchainSha256:runtime.toolchainSha256,
    historicalCandidateSearches:0,productionChanged:false,catalogAcceptanceEnabled:false,results},null,2)+'\n',{flag:'wx'});
});
