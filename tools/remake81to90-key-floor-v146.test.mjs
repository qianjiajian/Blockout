import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadApi} from './remake81to90-v146.mjs';
import {compileLevel,forEachGesture,stateFromSnapshot,stateKey,lockRemaining,verifyKeyMaskRoute} from './remake81to90-key-mask-domain-v146.mjs';
import {checkKeyMaskFloor,equivalentBlockGroups} from './remake81to90-key-floor-v146.mjs';
const {api}=await loadApi();
const fixture=()=>({id:81,name:'full two-key fixture',difficulty:'easy',timeSeconds:100,reward:0,width:3,height:2,mechanismRules:'revised-2026-09-23-v1.4',
 gates:[{id:'r',color:'red',side:'left',offset:0,size:2},{id:'b',color:'blue',side:'right',offset:0,size:2},{id:'g',color:'green',side:'top',offset:0,size:3},{id:'y',color:'yellow',side:'bottom',offset:0,size:3}],
 blocks:[{id:'key-shell',color:'red',x:0,y:0,shape:[[0,0]],layers:['red','blue'],keyId:'k'},
 {id:'key',color:'blue',x:2,y:0,shape:[[0,0]],keyId:'k'},{id:'locked',color:'green',x:1,y:0,shape:[[0,0]],lockedBy:'k',lockCount:2},
 {id:'ice',color:'yellow',x:1,y:1,shape:[[0,0]],frozen:1}]});
test('complete finite key graph agrees with authoritative body/peel/ice and two-key unlock events',()=>{
 const l=fixture();api.validateLevel(l);const c=compileLevel(l),m=new api.PuzzleModel(l);m.startCountdown();
 const queue=[{s:c.initial,m}],seen=new Set([stateKey(c.initial)]);let edges=0,peels=0,releases=0;
 for(let h=0;h<queue.length;h++){
  const {s,m}=queue[h];assert(queue.length<10000);assert.deepEqual(stateFromSnapshot(c,m.snapshot()),s);
  forEachGesture(c,s,(i,v,cost,get)=>{
   const clone=m.clone(),before=clone.snapshot(),d=get();assert.equal(lockRemaining(c,s,i),0);
   clone.beginAction();for(const p of d.path)assert(clone.moveBlockStep(d.blockId,...p));if(d.exitSide)assert(clone.tryExit(d.blockId,d.exitSide).ok);assert(clone.commitAction());
   const after=clone.snapshot(),next=s.slice();next[i]=v;assert.deepEqual(stateFromSnapshot(c,after),next);assert.equal(cost,Number(before.cleared===after.cleared));
   const lock=after.blocks.find(b=>b.id==='locked');if(lock)assert.equal(lock.lockCount??0,lockRemaining(c,next,2));
   if(d.blockId==='key-shell'&&v!==255&&cost===0){assert.equal(lockRemaining(c,s,2),lockRemaining(c,next,2));peels++;}
   if(lockRemaining(c,s,2)>lockRemaining(c,next,2))releases++;
   edges++;const key=stateKey(next);if(!seen.has(key)){seen.add(key);queue.push({s:next,m:clone});}
  });
 }
 assert(edges>100&&peels>0&&releases>0);console.log(JSON.stringify({states:queue.length,edges,peels,releases}));
});
test('key groups never merge a key with an otherwise identical plain body',()=>{
 const l=fixture();l.blocks[0].color='blue';delete l.blocks[0].layers;delete l.blocks[0].keyId;
 const c=compileLevel(l);assert(equivalentBlockGroups(c).every(g=>!(g.includes(0)&&g.includes(1))));
});
test('normalization and identity quotient preserve a small optimum with all constraints intact',()=>{
 const results=[];for(const monotoneSuffix of [false,true])for(const symmetry of [false,true]){const r=checkKeyMaskFloor(fixture(),{floor:2,maxStates:100000,maxMilliseconds:10000,monotoneSuffix,symmetry});assert.equal(r.status,'relaxed-shortcut');results.push(r.relaxedNonClearingDrags);}assert(results.every(n=>n===results[0]));
});
test('actual81/82 full constrained routes remain edges with every key retained',()=>{
 for(const file of ['candidate81-mut750-1790264461797.json','candidate82-enriched-1790264094929.json']){const d=JSON.parse(fs.readFileSync('deliverables/remake81-90-v146-20260924/agent81-84/'+file));const r=verifyKeyMaskRoute(d.level,d.drags,api);assert(r.passed);assert(r.unitSteps>30);}
});
test('unsupported fields and budget exhaustion never certify',()=>{
 for(const mutate of [l=>l.id=80,l=>l.blocks[0].movementAxis='vertical',l=>l.blocks[2].lockedBy='absent',l=>l.blocks[2].lockCount=0]){const l=fixture();mutate(l);assert.equal(checkKeyMaskFloor(l,{floor:1}).status,'unsupported');}
 assert.equal(checkKeyMaskFloor(fixture(),{floor:0}).status,'invalid');const r=checkKeyMaskFloor(fixture(),{floor:5,maxStates:1,maxMilliseconds:1000,monotoneSuffix:false});assert.equal(r.status,'unknown');assert(!r.thresholdProven);
});
