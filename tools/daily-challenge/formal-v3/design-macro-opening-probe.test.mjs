import test from 'node:test';
import assert from 'node:assert/strict';
import {loadBoundedRuntime} from './bounded-proof.mjs';
import {probeInitialClearThenParking} from './design-macro-opening-probe.mjs';
const runtime=await loadBoundedRuntime();
const level={id:1,name:'fixed-two-gesture-fixture',difficulty:'hard',reward:0,width:3,height:2,timeSeconds:75,parMoves:10,mechanismRules:'revised-2026-09-27-v1.5',
 blocks:['red','blue','green','yellow','orange','purple'].map((color,i)=>({id:String.fromCharCode(97+i),color,x:i%3,y:Math.floor(i/3),shape:[[0,0]]})),
 gates:[{id:'gate-r',color:'red',side:'left',offset:0,size:1},{id:'gate-b',color:'blue',side:'bottom',offset:2,size:1},{id:'gate-g',color:'green',side:'top',offset:2,size:1},{id:'gate-y',color:'yellow',side:'bottom',offset:0,size:1},{id:'gate-o',color:'orange',side:'top',offset:1,size:1},{id:'gate-p',color:'purple',side:'right',offset:1,size:1}]};
test('one actual clear followed by actual nonclear; exact full inventory delta and unchanged input',()=>{const before=JSON.stringify(level),r=probeInitialClearThenParking(runtime,level);assert(r.valid,JSON.stringify(r));assert.equal(r.drags[0].blockId,'a');assert.equal(r.drags[1].blockId,'b');assert.equal(r.clearAudit.clearEvents,1);assert.equal(r.parkingAudit.clearEvents,0);assert.equal(r.remainingInventory,5);assert.equal(r.fullWorlds,3);assert.equal(r.U,null);assert.equal(JSON.stringify(level),before);});
test('raw limit stops before constructing/evaluating another full world',()=>{for(const cap of [1,2]){const r=probeInitialClearThenParking(runtime,level,{maxFullWorlds:cap});assert(!r.valid);assert.equal(r.reason,'opening-probe-raw-limit');assert.equal(r.fullWorlds,cap);}});
test('reject nonfinite budget and mechanism-bearing input',()=>{for(const cap of [0,10001,NaN,Infinity])assert.throws(()=>probeInitialClearThenParking(runtime,level,{maxFullWorlds:cap}));const iced=structuredClone(level);iced.blocks[0].ice=3;assert(!probeInitialClearThenParking(runtime,iced).valid);});
