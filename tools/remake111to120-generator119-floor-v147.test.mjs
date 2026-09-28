import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {loadApi} from './remake111to120-v146.mjs';
import {loadAdvancedFloorApi} from './campaign31-200-advanced-floor-v145.mjs';
import {compileGeneratorLevel,generatorStateFromSnapshot} from '../deliverables/remake111-120-v146-20260924/agent119-120/generator-full119.mjs';
import {settleImmediateGenerators,forEachImmediateGeneratorGesture,checkImmediateGeneratorFloor,verifyImmediateGeneratorRoute} from '../deliverables/remake111-120-v146-20260924/agent119-120/generator-immediate119.mjs';
const {api}=await loadApi(),key=s=>String.fromCharCode(...s);
const advanced=await loadAdvancedFloorApi();
const small=()=>({id:119,name:'finite FIFO qualification',difficulty:'normal',reward:0,timeSeconds:100,mechanismRules:'revised-2026-09-23-v1.4',width:3,height:3,
 gates:[{id:'r',color:'red',side:'left',offset:0,size:2},{id:'b',color:'blue',side:'right',offset:0,size:2}],
 generators:[{id:'gen',side:'bottom',offset:1,rimSpan:3,rimMount:'rim',spawn:[1,2],queueBlockIds:['cargo']}],
 blocks:[{id:'carrier',x:1,y:2,color:'red',shape:[[0,0]]},{id:'cargo',x:1,y:2,color:'blue',shape:[[0,0]]}]});
test('exhaustive small full world: each relaxed held gesture exactly reproduces headless unit/clear/FIFO state',t=>{
 const l=small(),c=compileGeneratorLevel(l,api),m=new api.PuzzleModel(l);m.startCountdown();const nodes=[m],seen=new Set([key(c.initial)]);let transitions=0;
 for(let n=0;n<nodes.length;n++){
  assert(nodes.length<1000,'finite fixture bound');const model=nodes[n],s=generatorStateFromSnapshot(c,model.snapshot());
  forEachImmediateGeneratorGesture(c,s,(next,edge,get)=>{
   const d=get(),clone=model.clone(),before=clone.snapshot().cleared;clone.beginAction();for(const p of d.path)assert(clone.moveBlockStep(d.blockId,...p));
   if(d.exitSide)assert(clone.tryExit(d.blockId,d.exitSide).ok);assert(clone.commitAction());
   assert.deepEqual(generatorStateFromSnapshot(c,clone.snapshot()),next);assert.equal(edge,clone.snapshot().cleared===before?1:0);transitions++;
   const k=key(next);if(!seen.has(k)){seen.add(k);nodes.push(clone);}
  });
 }
 t.diagnostic(`${nodes.length} complete-world states; ${transitions} whole gestures`);assert(nodes.length>20&&transitions>100);
});
test('spawn is mandatory, footprint exact, initial source immutable',()=>{
 const l=small(),before=structuredClone(l),c=compileGeneratorLevel(l,api),s=c.initial.slice(),i=c.blocks.findIndex(b=>b.id==='carrier'),j=c.blocks.findIndex(b=>b.id==='cargo');
 assert.equal(s[j],254);s[i]=0;const next=settleImmediateGenerators(c,s);assert.equal(next[j],7);assert.equal(s[j],254);assert.deepEqual(l,before);
});
test('bounded search agrees with authoritative optional-exit model, symmetry preserves optimum',()=>{
 const l=small(),r=advanced.checkRevisedRepositionFloor(l,{floor:2,maxStates:2000,maxTransitions:100000,maxMilliseconds:15000});assert.equal(r.status,'relaxed-shortcut');
 for(const symmetry of [false,true]){const q=checkImmediateGeneratorFloor(l,api,{floor:2,maxStates:10000,maxMilliseconds:15000,symmetry});assert.equal(q.status,r.status);assert.equal(q.relaxedNonClearingDrags,r.relaxedNonClearingDrags);}
});
test('invalid/unsupported/exhausted budgets never certify',()=>{
 assert.equal(checkImmediateGeneratorFloor(small(),api,{floor:0}).status,'invalid');
 const q=checkImmediateGeneratorFloor(small(),api,{floor:2,maxStates:1,maxMilliseconds:5000});assert.equal(q.status,'unknown');assert.equal(q.thresholdProven,false);
 for(const mutate of [l=>l.id=40,l=>l.blocks[1].frozen=1,l=>l.blocks[0].movementAxis='vertical',l=>l.generators[0].intervalSeconds=1]){const l=small();mutate(l);assert.equal(checkImmediateGeneratorFloor(l,api,{floor:2}).status,'unsupported');}
});
test('119 candidate full route maps every unit step and gesture with complete inventory',()=>{
 for(const file of ['deliverables/remake111-120-v146-20260924/agent119-120/route119-top-orange-1790269088139.json']){
  const d=JSON.parse(fs.readFileSync(file)),q=verifyImmediateGeneratorRoute(d.level,d.drags,api);assert(q.valid,JSON.stringify(q));assert(q.unitSteps>50);assert.equal(verifyImmediateGeneratorRoute(d.level,d.drags.slice(0,1),api).valid,false);
 }
});
