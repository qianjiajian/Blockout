import test from 'node:test';
import assert from 'node:assert/strict';
import {loadModelApi} from '../remake131to140-model-api.mjs';
import {compile,each,stateOf,clearCount,normalizeExhausted} from './validation-generator-domain.mjs';
const api=await loadModelApi(),key=s=>String.fromCharCode(...s);
function fixture(){return {id:70,name:'Dual FIFO / staggered ice qualification',difficulty:'normal',reward:0,timeSeconds:100,mechanismRules:'revised-2026-09-27-v1.5',width:3,height:4,
 gates:[{id:'red-gate',color:'red',side:'left',offset:0,size:2,frozen:1},{id:'blue-gate',color:'blue',side:'right',offset:2,size:2},{id:'green-gate',color:'green',side:'left',offset:2,size:2,frozen:2},{id:'yellow-gate',color:'yellow',side:'right',offset:0,size:2,frozen:3}],
 generators:[{id:'g0',side:'top',offset:1,rimSpan:3,rimMount:'rim',spawn:[0,0],queueBlockIds:['red','green']},{id:'g1',side:'bottom',offset:1,rimSpan:3,rimMount:'rim',spawn:[1,3],queueBlockIds:['blue','yellow']}],
 blocks:[['red',0,0,'red'],['green',0,0,'green'],['blue',1,3,'blue'],['yellow',1,3,'yellow']].map(([id,x,y,color])=>({id,x,y,color,shape:[[0,0],[1,0]]}))};}
test('complete dual FIFO / ice1,2,3 graph includes every held arrival and legal delayed-spawn parking branch',t=>{
 const level=fixture(),c=compile(level,api),model=new api.PuzzleModel(level);model.startCountdown();
 const nodes=[{s:c.initial,m:model}],indices=new Map([[key(c.initial),0]]),reverse=[[]];let edges=0,units=0,heldArrivals=0,parkingDelays=0,closedExitChecks=0;const thawTransitions=new Set();
 function verify(m,s){const snap=m.snapshot();assert.deepEqual(stateOf(c,snap),s);assert.equal(clearCount(c,s),snap.cleared);for(const g of snap.gates)assert.equal(g.frozen??0,Math.max(0,(level.gates.find(x=>x.id===g.id).frozen??0)-snap.cleared));for(const[i,q]of c.queues.entries()){const remaining=q.filter(j=>s[j]===510);assert.equal(snap.generators[i].remaining,remaining.length);assert.equal(snap.generators[i].head,q.length-remaining.length);}}
 for(let at=0;at<nodes.length;at++){
  assert(nodes.length<50000);const n=nodes[at],out=new Set();verify(n.m,n.s);
  each(c,n.s,(next,cost,get)=>{
   const drag=get(),m=n.m.clone(),before=m.snapshot();m.beginAction();
   for(const p of drag.path){const a=m.snapshot();assert(m.moveBlockStep(drag.blockId,...p));const b=m.snapshot();verify(m,stateOf(c,b));heldArrivals+=a.queuedBlocks.length-b.queuedBlocks.length;units++;}
   if(drag.exitSide)assert(m.tryExit(drag.blockId,drag.exitSide).ok);assert(m.commitAction());const after=m.snapshot();verify(m,next);assert.equal(cost,Number(before.cleared===after.cleared));
   for(const g of after.gates){const old=before.gates.find(x=>x.id===g.id);if(old.frozen===1&&(g.frozen??0)===0)thawTransitions.add(g.id);}
   if(cost)for(const g of after.generators){if(!g.remaining)continue;const authored=level.generators.find(x=>x.id===g.id),nextId=authored.queueBlockIds[g.head],cargo=level.blocks.find(x=>x.id===nextId),moving=after.blocks.find(x=>x.id===drag.blockId);if(!moving)continue;const occupied=new Set(moving.shape.map(([dx,dy])=>`${moving.x+dx},${moving.y+dy}`));if(cargo.shape.some(([dx,dy])=>occupied.has(`${authored.spawn[0]+dx},${authored.spawn[1]+dy}`)))parkingDelays++;}
   const k=key(next);out.add(k);edges++;if(!indices.has(k)){indices.set(k,nodes.length);nodes.push({s:next,m});reverse.push([]);}reverse[indices.get(k)].push([at,cost]);
  });
  // Every immediately legal authoritative unit/exit is admitted, including
  // parking on a machine footprint to keep its next FIFO item waiting.
  for(const b of n.m.snapshot().blocks){for(const[dx,dy]of [[0,1],[0,-1],[1,0],[-1,0]]){const m=n.m.clone();m.beginAction();if(m.moveBlockStep(b.id,b.x+dx,b.y+dy))assert(out.has(key(stateOf(c,m.snapshot()))));}for(const side of ['top','right','bottom','left']){const m=n.m.clone();m.beginAction();const result=m.tryExit(b.id,side);if(result.ok)assert(out.has(key(stateOf(c,m.snapshot()))));const g=n.m.snapshot().gates.find(g=>g.color===b.color);if((g.frozen??0)>0){assert(!result.ok);closedExitChecks++;}}}
 }
 const distances=nodes.map(()=>Infinity),pending=[];nodes.forEach((n,i)=>{if(clearCount(c,n.s)===c.total){distances[i]=0;pending.push(i);}});for(let at=0;at<pending.length;at++){const i=pending[at];for(const[j,cost]of reverse[i])if(distances[j]>distances[i]+cost){distances[j]=distances[i]+cost;pending.push(j);}}
 nodes.forEach((n,i)=>assert.equal(distances[indices.get(key(normalizeExhausted(c,n.s).s))],distances[i]));
 assert(Number.isFinite(distances[0]));assert.deepEqual([...thawTransitions].sort(),['green-gate','red-gate','yellow-gate']);assert(heldArrivals>0&&parkingDelays>0&&closedExitChecks>0);
 t.diagnostic(`${nodes.length} complete states / ${edges} gestures / ${units} held units / ${heldArrivals} intra-drag arrivals / ${parkingDelays} delayed-spawn parking branches / ${closedExitChecks} frozen exit rejections; every ice1/2/3 thaw boundary and every-state normalization checked`);
});
