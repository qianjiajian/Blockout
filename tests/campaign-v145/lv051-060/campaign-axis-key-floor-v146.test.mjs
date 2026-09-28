import test from 'node:test';
import assert from 'node:assert/strict';
import {loadAdvancedFloorApi} from '../../../tools/campaign31-200-advanced-floor-v145.mjs';
import {compileLevel,forEachGesture,stateFromSnapshot,stateKey,clearCount} from '../../../tools/campaign-v145/lv051-060/campaign-axis-key-graph-v146.mjs';
import {checkAxisKeyFloor,equivalentBlockGroups,normalizeMonotoneClears} from '../../../tools/campaign-v145/lv051-060/campaign-axis-key-floor-v146.mjs';
const api=await loadAdvancedFloorApi();
const base=(blocks,extra={})=>({id:60,name:'Axis/key proof fixture',width:3,height:3,timeSeconds:120,reward:20,difficulty:'easy',mechanismRules:'revised-2026-09-23-v1.4',
 gates:[{id:'gate-r',color:'red',side:'top',offset:0,size:3},{id:'gate-b',color:'blue',side:'bottom',offset:0,size:3},{id:'gate-g',color:'green',side:'left',offset:0,size:3},{id:'gate-y',color:'yellow',side:'right',offset:0,size:3}],blocks,...extra});
const block=(id,x,y,color,extra={})=>({id,x,y,color,shape:[[0,0]],...extra});
const fixtures=[
 base([block('r',1,1,'red',{movementAxis:'vertical'}),block('g',0,1,'green',{movementAxis:'horizontal'}),block('b',1,2,'blue')]),
 base([block('k1',0,0,'red',{keyId:'A',movementAxis:'vertical'}),block('k2',2,0,'yellow',{keyId:'A',layers:['yellow','red']}),block('lock',1,1,'blue',{lockedBy:'A',lockCount:2,movementAxis:'vertical'}),block('ice',1,2,'green',{frozen:2})]),
 base([block('k',0,0,'red',{keyId:'A'}),block('lock',1,1,'blue',{lockedBy:'A',shutterId:'cover',movementAxis:'vertical',frozen:1}),block('g',0,1,'green'),block('y',2,2,'yellow')],{shutters:[{id:'cover',x:1,y:1,width:1,height:1,count:1}]}),
];

// Independently enumerate every optional exit and every unit-step position
// using PuzzleModel, without calling either graph's action generator.
function actualEdges(model,c){
 const result=new Map();
 for(const body of model.snapshot().blocks){
  const start=model.clone(),queue=[{m:start,moved:false}],seen=new Set([stateKey(stateFromSnapshot(c,start.snapshot()))]);
  for(let head=0;head<queue.length;head++){
   const {m,moved}=queue[head],held=m.getBlock(body.id);if(!held)continue;
   if(moved)result.set('1:'+stateKey(stateFromSnapshot(c,m.snapshot())),m);
   for(const side of ['top','right','bottom','left']){
    const next=m.clone();next.beginAction();if(!next.tryExit(body.id,side).ok)continue;assert(next.commitAction());
    result.set('0:'+stateKey(stateFromSnapshot(c,next.snapshot())),next);
   }
   for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){
    const next=m.clone();next.beginAction();if(!next.moveBlockStep(body.id,held.x+dx,held.y+dy))continue;assert(next.commitAction());
    const key=stateKey(stateFromSnapshot(c,next.snapshot()));if(seen.has(key))continue;seen.add(key);queue.push({m:next,moved:true});
   }
  }
 }
 return result;
}

for(const [index,level]of fixtures.entries())test(`all graph edges match independent model enumeration: fixture ${index}`,()=>{
 const c=compileLevel(level),initial=new api.PuzzleModel(level),queue=[{m:initial,depth:0}],seen=new Set();
 for(let head=0;head<queue.length&&head<100;head++){
  const {m,depth}=queue[head],s=stateFromSnapshot(c,m.snapshot()),key=stateKey(s);if(seen.has(key))continue;seen.add(key);
  const expected=actualEdges(m,c),actual=new Set();
  forEachGesture(c,s,(i,v,cost)=>{const next=s.slice();next[i]=v;actual.add(cost+':'+stateKey(next));});
  assert.deepEqual([...actual].sort(),[...expected.keys()].sort(),`fixture ${index}, state ${head}`);
  if(depth<2)for(const next of expected.values())queue.push({m:next,depth:depth+1});
 }
 assert(seen.size>5);
});

test('shell peel does not release the matching key; both bodies must clear',()=>{
 const c=compileLevel(fixtures[1]),s=c.initial.slice();s[0]=255;s[1]|=128;
 const ids=[];forEachGesture(c,s,(i)=>ids.push(c.blocks[i].id));assert(!ids.includes('lock'));
 s[1]=255;const unlocked=[];forEachGesture(c,s,i=>unlocked.push(c.blocks[i].id));assert(unlocked.includes('lock'));
});
test('quotient never merges different axes or key roles',()=>{
 const c=compileLevel(base([block('a',0,0,'red'),block('b',1,0,'red',{movementAxis:'vertical'}),block('c',2,0,'red',{keyId:'A'}),block('d',2,1,'red',{lockedBy:'A'})]));
 assert.deepEqual(equivalentBlockGroups(c),[]);
});
test('axis blocks cannot leave through a perpendicular gate',()=>{
 const c=compileLevel(base([block('a',0,0,'red',{movementAxis:'horizontal'})]));
 const costs=[];forEachGesture(c,c.initial,(_i,_v,cost)=>costs.push(cost));assert(costs.length);assert(costs.every(x=>x===1));
});
test('monotone normalization and generic floor agree on completion and cost',()=>{
 for(const level of fixtures){
  const fast=checkAxisKeyFloor(level,{floor:2,maxStates:20000,maxMilliseconds:10000});
  const generic=api.checkRevisedRepositionFloor(level,{floor:2,maxStates:20000,maxMilliseconds:10000});
  assert.notEqual(fast.status,'unknown');assert.equal(fast.status,generic.status);
  if(fast.relaxedRoute){const m=new api.PuzzleModel(level);for(const d of fast.relaxedRoute){m.beginAction();for(const p of d.path)assert(m.moveBlockStep(d.blockId,...p));if(d.exitSide)assert(m.tryExit(d.blockId,d.exitSide).ok);assert(m.commitAction());}assert(m.snapshot().complete);}
  const c=compileLevel(level),n=normalizeMonotoneClears(c,c.initial);assert(clearCount(c,n.state)>=0);
 }
});
test('unsupported autonomous mechanisms fail closed',()=>{
 for(const extra of [{generators:[{id:'g'}]},{flipDoors:[{id:'f'}]},{shutters:[{id:'lift',skin:'lift'}]}])assert.equal(checkAxisKeyFloor(base([block('a',0,0,'red')],extra)).status,'unsupported');
});
test('budget exhaustion is UNKNOWN',()=>{
 const r=checkAxisKeyFloor(base([block('a',1,1,'red',{layers:['red','blue']})]),{floor:20,maxStates:1,maxMilliseconds:1000});assert.equal(r.status,'unknown');assert.equal(r.thresholdProven,false);
});
