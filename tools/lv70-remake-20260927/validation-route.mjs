import assert from 'node:assert/strict';
import {compile,each,stateOf,clearCount,adaptation} from './validation-generator-domain.mjs';
export function verifyGeneratorRoute(level,drags,api){
 assert.equal(level.id,70);assert.equal(level.mechanismRules,'revised-2026-09-27-v1.5');assert.equal(level.generators.length,2);
 const replay=api.replayRevisedRoute(level,drags);assert(replay.valid&&replay.complete,JSON.stringify(replay));
 const c=compile(level,api),model=new api.PuzzleModel(structuredClone(level));model.startCountdown();
 const key=s=>[...s].join(','),rows=[],arrivals=[],initial=model.snapshot();let checkedUnits=0;
 function inspect(snapshot){
  const state=stateOf(c,snapshot);assert.equal(clearCount(c,state),snapshot.cleared);
  assert.deepEqual(snapshot.queuedBlocks.map(b=>b.id).sort(),c.blocks.filter((b,i)=>state[i]===510).map(b=>b.id).sort());
  for(let gi=0;gi<c.queues.length;gi++){const remaining=c.queues[gi].filter(i=>state[i]===510),g=snapshot.generators[gi];assert.equal(g.head,c.queues[gi].length-remaining.length);assert.equal(g.remaining,remaining.length);assert.equal(g.nextBlockId,remaining.length?c.blocks[remaining[0]].id:undefined);}
  for(const g of snapshot.gates)assert.equal(g.frozen??0,Math.max(0,(level.gates.find(x=>x.id===g.id).frozen??0)-snapshot.cleared));
  for(const b of snapshot.blocks){const def=c.blocks.find(x=>x.id===b.id);assert.equal(b.frozen??0,Math.max(0,def.ice-Math.max(0,snapshot.cleared-def.reveal)));}
  return state;
 }
 assert.equal(key(inspect(initial)),key(c.initial));
 for(const[index,drag]of drags.entries()){
  const before=model.snapshot(),prior=inspect(before),edges=new Set();each(c,prior,(s,cost)=>{edges.add(`${cost}:${key(s)}`);});model.beginAction();const unitEvents=[];
  for(const[unit,p]of drag.path.entries()){const a=model.snapshot();assert(model.moveBlockStep(drag.blockId,...p));const b=model.snapshot(),state=inspect(b);assert(edges.has(`1:${key(state)}`),`Gesture ${index+1}, unit ${unit+1} absent from full-state graph`);checkedUnits++;const born=b.blocks.filter(x=>!a.blocks.some(y=>y.id===x.id));const detail={unit:unit+1,anchor:p,arrivals:born.map(x=>x.id),heads:b.generators.map(g=>g.head)};unitEvents.push(detail);if(born.length)arrivals.push({step:index+1,...detail});}
  if(drag.exitSide)assert(model.tryExit(drag.blockId,drag.exitSide).ok);assert(model.commitAction());const after=model.snapshot(),next=inspect(after),cost=Number(after.cleared===before.cleared);assert(edges.has(`${cost}:${key(next)}`),`Gesture ${index+1} absent from complete graph`);
  const born=after.blocks.filter(x=>!before.blocks.some(y=>y.id===x.id));rows.push({step:index+1,blockId:drag.blockId,cost,unitEvents,cleared:after.cleared,arrivals:born.map(b=>b.id),heads:after.generators.map(g=>g.head),remaining:after.generators.map(g=>g.remaining)});
 }
 const final=model.snapshot();assert(final.complete&&!final.failed);assert(final.generators.every(g=>g.remaining===0));assert(final.blocks.length===0&&final.queuedBlocks.length===0);
 return{passed:true,replay,graphAdaptation:adaptation,initialHeads:initial.generators.map(g=>g.head),finalHeads:final.generators.map(g=>g.head),checkedUnits,steps:rows,unitArrivals:arrivals,allInventoryRemoved:true,allQueuesCompleted:true,nonClearingDrags:rows.filter(x=>x.cost).length,pointerValidated:false,timeValidated:false};
}
