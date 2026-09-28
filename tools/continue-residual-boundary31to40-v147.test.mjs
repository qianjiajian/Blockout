import test from 'node:test';
import assert from 'node:assert/strict';
import {serialize,deserialize} from 'node:v8';
import {continueBoundaryResidualFloor} from './continue-residual-boundary31to40-v147.mjs';
import {checkResidualFloor} from '../deliverables/remake31-40-v146-20260924/agent31-34/residual-floor.mjs';
import {continueResidualFloor} from './continue-residual31to40-v147.mjs';

const base={id:34,name:'checkpoint-review',width:3,height:2,mechanismRules:'revised-2026-09-23-v1.4',difficulty:'hard',timeSeconds:99,reward:0,
 gates:[{id:'r',color:'red',side:'left',offset:0,size:1,frozen:2},{id:'b',color:'blue',side:'right',offset:1,size:1}],
 blocks:[{id:'plain',color:'red',x:0,y:0,shape:[[0,0]]},{id:'shell',color:'blue',layers:['blue','red'],x:1,y:0,shape:[[0,0]]},{id:'helper',color:'blue',x:2,y:0,shape:[[0,0]]}]};
const hidden=structuredClone(base);hidden.blocks[0].shutterId='early';hidden.blocks[0].frozen=1;hidden.shutters=[{id:'early',x:0,y:0,width:1,height:1,count:1}];
const blocked=structuredClone(hidden);blocked.gates[0].frozen=99;

test('serialized mid-parent interruptions preserve exhaustive floor results',()=>{
 let interruptions=0;
 for(const level of [base,hidden,blocked])for(const floor of [1,2,3,4]){
  const opts={floor,maxStates:100000,maxMilliseconds:30000};
  const old=checkResidualFloor(level,opts),whole=continueBoundaryResidualFloor(level,opts).result;
  assert.notEqual(old.status,'unknown');assert.equal(whole.status,old.status);
  if(whole.status==='relaxed-shortcut')assert(whole.relaxedNonClearingDrags<floor,'A boundary counterexample need not be the globally cheapest one');
  let r=continueBoundaryResidualFloor(level,{...opts,maxTransitions:1,maxStates:1}),turn=0;
  while(r.checkpoint){interruptions++;assert(turn++<1000);r=continueBoundaryResidualFloor(level,{...opts,maxTransitions:turn<5?turn:100},deserialize(serialize(r.checkpoint)));}
  assert.equal(r.result.status,whole.status);assert.equal(r.result.relaxedNonClearingDrags,whole.relaxedNonClearingDrags);
  assert.equal(r.result.discoveredStates,whole.discoveredStates);assert.equal(r.result.exploredStates,whole.exploredStates);
 }
 assert(interruptions>10);
});
test('checkpoint rejects changed level, floor, and implementation binding',()=>{
 const saved=continueBoundaryResidualFloor(blocked,{floor:4,maxStates:1}).checkpoint;assert(saved);
 assert.throws(()=>continueBoundaryResidualFloor({...blocked,name:'different'},{floor:4},deserialize(serialize(saved))));
 assert.throws(()=>continueBoundaryResidualFloor(blocked,{floor:3},deserialize(serialize(saved))));
 const tampered=deserialize(serialize(saved));tampered.bindings['tools/continue-residual-boundary31to40-v147.mjs']='wrong';
 assert.throws(()=>continueBoundaryResidualFloor(blocked,{floor:4},tampered));
});
test('unsupported generators cannot be silently discarded',()=>{
 const level={...base,generators:[{id:'unsupported'}]};const r=continueBoundaryResidualFloor(level);
 assert.equal(r.result.status,'unsupported');assert.equal(r.checkpoint,null);
});
test('old checkpoints retain all frontier states through exact sharding migration',()=>{
 for(const level of [base,hidden,blocked])for(const floor of [2,3,4]){
  const opts={floor,maxStates:100000,maxMilliseconds:30000};
  const old=continueResidualFloor(level,{...opts,maxTransitions:1});if(!old.checkpoint)continue;
  const saved=deserialize(serialize(old.checkpoint)),count=saved.distances.size;
  const resumed=continueBoundaryResidualFloor(level,opts,saved),fresh=continueBoundaryResidualFloor(level,opts);
  assert.equal(resumed.result.status,fresh.result.status);assert(resumed.result.discoveredStates>=count);
  if(resumed.result.status==='relaxed-shortcut')assert(resumed.result.relaxedNonClearingDrags<floor);
  assert.equal(saved.schemaVersion,2);assert.equal(saved.distanceShards.length,64);
  assert.equal(saved.entryCount,saved.distanceShards.reduce((n,m)=>n+m.size,0));assert(saved.migratedFrom);
 }
});
