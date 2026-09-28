import test from 'node:test';
import assert from 'node:assert/strict';
import {loadApi} from '../../../tools/native-block-repair-v143.mjs';
import {qualifyLift,stateOf,checkLiftFloor} from '../../../tools/campaign-v145/lv061-070/lift-floor.mjs';
import {each,key} from '../../../deliverables/remake31-200-v145-20260924/batches/lv061-070/author65-67/lift-search.mjs';
const {api}=await loadApi();
const fixture=()=>({id:65,name:'same-region-layers',difficulty:'easy',reward:20,timeSeconds:100,mechanismRules:'revised-2026-09-23-v1.4',width:4,height:4,
 gates:[{id:'r',color:'red',side:'right',offset:1,size:1},{id:'b',color:'blue',side:'bottom',offset:0,size:2},{id:'g',color:'green',side:'left',offset:1,size:1},{id:'y',color:'yellow',side:'right',offset:3,size:1}],
 shutters:[{id:'first',x:0,y:1,width:2,height:1,count:1,skin:'lift'},{id:'second',x:0,y:1,width:2,height:1,count:1,skin:'lift'}],
 blocks:[{id:'a',color:'red',x:0,y:1,shape:[[0,0],[1,0]]},{id:'b1',color:'blue',x:0,y:1,shape:[[0,0],[1,0]],frozen:1,shutterId:'first'},{id:'b2',color:'green',x:0,y:1,shape:[[0,0],[1,0]],shutterId:'second'},{id:'y1',color:'yellow',x:3,y:3,shape:[[0,0]]}]});
function apply(m,d){const b=m.snapshot();m.beginAction();for(const p of d.path)assert(m.moveBlockStep(d.blockId,...p));if(d.exitSide)assert(m.tryExit(d.blockId,d.exitSide).ok);assert(m.commitAction());return m.snapshot().cleared===b.cleared?1:0;}
test('full graph preserves mid-drag reveal, hidden ice age and later same-region lift',()=>{
 const l=fixture(),c=qualifyLift(l,api),m=new api.PuzzleModel(l);m.startCountdown();
 const steps=[{blockId:'a',path:[[1,1],[2,1]]},{blockId:'a',path:[],exitSide:'right'},{blockId:'b1',path:[[0,2],[0,3]],exitSide:'bottom'},{blockId:'b2',path:[],exitSide:'left'},{blockId:'y1',path:[],exitSide:'right'}];
 for(const d of steps){const s=stateOf(c,m.snapshot()),edges=[];each(c,s,(v,cost,get)=>edges.push({v,cost,d:get()}),{optionalExit:true});const cost=apply(m,d);assert(edges.some(e=>key(e.v)===key(stateOf(c,m.snapshot()))&&e.cost===cost));if(d.blockId==='a'&&!d.exitSide){assert.equal(m.snapshot().blocks.find(b=>b.id==='b1').frozen,1);assert(m.snapshot().shutters[0].revealed);assert(!m.snapshot().shutters[1].revealed);}}
 assert(m.snapshot().complete);
});
test('off-route optional gestures agree with the independent model, including count curtain over lift',()=>{
 for(const countdown of [false,true]){const l=fixture();if(countdown){l.shutters[0].skin='shutter';l.shutters[0].count=1;l.blocks=l.blocks.filter(b=>b.id!=='a');}
  const c=qualifyLift(l,api),start=new api.PuzzleModel(l);start.startCountdown();const queue=[start],seen=new Set([key(stateOf(c,start.snapshot()))]);let checked=0;
  for(let n=0;n<queue.length&&n<100;n++){const m=queue[n],s=stateOf(c,m.snapshot()),edges=[];each(c,s,(v,cost,get)=>edges.push({v,cost,d:get()}),{optionalExit:true});
   for(const e of edges){const t=m.clone();assert.equal(apply(t,e.d),e.cost);assert.equal(key(stateOf(c,t.snapshot())),key(e.v));checked++;const k=key(e.v);if(seen.size<100&&!seen.has(k)){seen.add(k);queue.push(t);}}
   for(const b of m.snapshot().blocks)for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const t=m.clone();t.beginAction();if(t.moveBlockStep(b.id,b.x+dx,b.y+dy)&&t.commitAction())assert(edges.some(e=>e.cost===1&&key(e.v)===key(stateOf(c,t.snapshot()))),'Every real unit gesture included');}
  }assert(checked>100);
 }
});
test('unsupported domains and exhausted budgets never prove a floor',()=>{
 for(const mutate of [l=>l.blocks[0].movementAxis='horizontal',l=>l.blocks[0].keyId='k',l=>l.blocks[0].timedBombSeconds=1,l=>l.generators=[{}],l=>l.flipDoors=[{}]]){const l=fixture();mutate(l);assert.equal(checkLiftFloor(l,api,{floor:1,maxStates:10,maxMilliseconds:100}).status,'unsupported');}
 assert.equal(checkLiftFloor(fixture(),api,{floor:10,maxStates:1,maxMilliseconds:1000}).status,'unknown');
 assert.equal(checkLiftFloor(fixture(),api,{floor:1,maxStates:10000,maxMilliseconds:10000}).status,'relaxed-shortcut');
});
