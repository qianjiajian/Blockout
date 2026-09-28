import test from 'node:test';
import assert from 'node:assert/strict';
import {serialize,deserialize} from 'node:v8';
import fs from 'node:fs';
import {continueAxisFloor} from '../../../tools/campaign-v145/lv051-060/continuable-axis-floor52.mjs';
import {checkAxisKeyFloor} from '../../../tools/campaign-v145/lv051-060/campaign-axis-key-floor-v146.mjs';
import {loadApi} from '../../../tools/native-block-repair-v143.mjs';
const {api}=await loadApi();
const level={id:52,name:'Resume fixture',width:3,height:3,timeSeconds:120,reward:20,difficulty:'easy',mechanismRules:'revised-2026-09-23-v1.4',gates:[{id:'gate-r',color:'red',side:'top',offset:0,size:1},{id:'gate-b',color:'blue',side:'bottom',offset:1,size:1,frozen:2}],blocks:[{id:'a',x:1,y:0,color:'red',layers:['red','blue'],shape:[[0,0]]},{id:'b',x:0,y:0,color:'red',shape:[[0,0],[0,1]],movementAxis:'vertical'},{id:'c',x:2,y:0,color:'blue',shape:[[0,0],[0,1]]}]};
for(const floor of [1,2,3,4,7])test('same bounded result after one-expansion serialization slices, floor '+floor,()=>{
 const expected=checkAxisKeyFloor(level,{floor,maxStates:100000,maxMilliseconds:20000});assert(['threshold-proven','relaxed-shortcut'].includes(expected.status));
 let saved,actual;for(let i=0;i<20000;i++){const r=continueAxisFloor(level,{floor,maxStates:100000,maxMilliseconds:10000,maxExpansions:1},saved);actual=r.result;if(!r.checkpoint)break;saved=deserialize(serialize(r.checkpoint));}assert.notEqual(actual.status,'unknown');assert.equal(actual.status,expected.status);assert.equal(actual.relaxedNonClearingDrags,expected.relaxedNonClearingDrags);if(actual.relaxedRoute){const replay=api.replayRevisedRoute(level,actual.relaxedRoute);assert(replay.valid&&replay.complete);}
});
test('partial parent from state budget is preserved and can resume with raised cap',()=>{
 const first=continueAxisFloor(level,{floor:7,maxStates:2,maxMilliseconds:10000});assert.equal(first.result.status,'unknown');assert.equal(first.result.termination,'max-states');assert(first.checkpoint);
 const next=continueAxisFloor(level,{floor:7,maxStates:100000,maxMilliseconds:10000},deserialize(serialize(first.checkpoint))),expected=checkAxisKeyFloor(level,{floor:7,maxStates:100000,maxMilliseconds:10000});assert.equal(next.result.status,expected.status);assert.equal(next.result.relaxedNonClearingDrags,expected.relaxedNonClearingDrags);
});
test('unsupported generator qualification is unchanged',()=>{assert.equal(continueAxisFloor({...level,generators:[{id:'g'}]}).result.status,'unsupported');});
test('actual 51 axes, seven gates, ice and shells survive repeated timed checkpoints',()=>{
 const d=JSON.parse(fs.readFileSync('deliverables/remake31-200-v145-20260924/batches/lv051-060/agent51-54/candidate51-1790248325953.json'));
 const expected=checkAxisKeyFloor(d.level,{floor:11,maxStates:20000,maxMilliseconds:30000});assert.equal(expected.status,'threshold-proven');
 let saved,actual,interrupts=0;for(let i=0;i<20000;i++){const r=continueAxisFloor(d.level,{floor:11,maxStates:20000,maxMilliseconds:2,maxExpansions:35},saved);actual=r.result;if(!r.checkpoint)break;interrupts++;saved=deserialize(serialize(r.checkpoint));}assert(interrupts>1);assert.equal(actual.status,expected.status);assert.equal(actual.discoveredStates,expected.discoveredStates);
});
