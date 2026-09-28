import test from 'node:test';
import assert from 'node:assert/strict';
import {serialize,deserialize} from 'node:v8';
import {loadApi} from '../../../tools/native-block-repair-v143.mjs';
import {checkPlainQueueFloor} from '../../../tools/campaign-v145/lv051-060/generator-plain-clear-floor58-v146.mjs';
import {continuePlainQueueFloor} from '../../../tools/campaign-v145/lv051-060/continuable-plain-floor58-v146.mjs';
const {api}=await loadApi(),S=[[0,0]];
const level={id:58,name:'restore plain queue',difficulty:'normal',reward:0,timeSeconds:100,mechanismRules:'revised-2026-09-23-v1.4',width:3,height:2,
 gates:[{id:'r',color:'red',side:'left',offset:0,size:1,frozen:2},{id:'b',color:'blue',side:'left',offset:1,size:1},{id:'g',color:'green',side:'right',offset:0,size:1},{id:'y',color:'yellow',side:'right',offset:1,size:1,frozen:3}],
 generators:[{id:'gen',side:'top',offset:1,rimMount:'rim',rimSpan:3,spawn:[1,0],queueBlockIds:['q1','q2']}],
 blocks:[{id:'carrier',x:1,y:0,color:'red',shape:S},{id:'blue',x:0,y:1,color:'blue',shape:S},{id:'q1',x:1,y:0,color:'green',shape:S},{id:'q2',x:1,y:0,color:'yellow',shape:S}]};
test('one-expansion serialized slices agree with uninterrupted plain proof for thresholds and shortcuts',()=>{
 let interruptions=0;
 for(const floor of [1,2,3,5]){const expected=checkPlainQueueFloor(level,api,{floor,maxStates:10000,maxMilliseconds:10000});assert(['threshold-proven','relaxed-shortcut'].includes(expected.status));let saved,actual;
  for(let i=0;i<1000;i++){const r=continuePlainQueueFloor(level,api,{floor,maxStates:10000,maxMilliseconds:10000,maxExpansions:1},saved);actual=r.result;if(!r.checkpoint)break;interruptions++;saved=deserialize(serialize(r.checkpoint));}
  assert.notEqual(actual.status,'unknown');assert.equal(actual.status,expected.status);assert.equal(actual.relaxedNonClearingDrags,expected.relaxedNonClearingDrags);
 }assert(interruptions>0);
});
test('partly expanded parent is retained across state-cap interruption and expanded cap resumes exactly',()=>{
 const first=continuePlainQueueFloor(level,api,{floor:3,maxStates:2,maxMilliseconds:10000});assert.equal(first.result.termination,'max-states');assert(first.checkpoint);assert.equal(first.checkpoint.front,0,'Partial initial parent must be requeued before its children');
 const resumed=continuePlainQueueFloor(level,api,{floor:3,maxStates:10000,maxMilliseconds:10000},deserialize(serialize(first.checkpoint))),expected=checkPlainQueueFloor(level,api,{floor:3,maxStates:10000,maxMilliseconds:10000});
 assert.equal(resumed.result.status,expected.status);assert.equal(resumed.result.relaxedNonClearingDrags,expected.relaxedNonClearingDrags);assert.equal(resumed.checkpoint,null);
});
test('resumed state rejects changed level or floor instead of sharing old frontier',()=>{
 const saved=continuePlainQueueFloor(level,api,{floor:3,maxStates:2,maxMilliseconds:10000}).checkpoint;assert(saved);
 assert.throws(()=>continuePlainQueueFloor({...level,timeSeconds:101},api,{floor:3},saved));assert.throws(()=>continuePlainQueueFloor(level,api,{floor:4},saved));
});
