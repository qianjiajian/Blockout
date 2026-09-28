import assert from 'node:assert/strict';
// WITNESS DISCOVERY ONLY. Every returned route must still pass the real model.
// For the single purple SQ3 target before the first other-color exit, count
// current non-purple footprints that individually separate it from its exit.
// Unlike the initial-position hint this also notices a required body parked
// elsewhere across the inevitable path. Cache each shape/position result.
export function createDynamicStationaryHint(c,targetId){
 const ti=c.blocks.findIndex(b=>b.id===targetId);assert(ti>=0);const target=c.blocks[ti];assert.equal(target.layers.length,1);assert.equal(target.shape.length,9);assert.equal(Math.max(...target.shape.map(p=>p[0])),2);assert.equal(Math.max(...target.shape.map(p=>p[1])),2);assert(!target.movementAxis);
 const color=target.layers[0],queueIds=new Set(c.generators.flatMap(g=>g.queueBlockIds));const K=c.blocks.filter(b=>!b.cover&&!queueIds.has(b.id)&&b.layers[0]===color).length;assert(K>0);assert(c.blocks.every(b=>b.layers.length===1));assert(c.covers.every(co=>co.count>=K));
 for(const b of c.blocks){const gates=c.level.gates.filter(g=>g.color===b.layers[0]);assert.equal(gates.length,1);if(b.layers[0]===color){assert(!queueIds.has(b.id));assert(!gates[0].frozen);}else assert((gates[0].frozen??0)>=K);}
 const overlap=(a,b)=>a.some((v,i)=>v&b[i]),coverMask=Array(c.words).fill(0);for(const co of c.covers)for(let i=0;i<c.words;i++)coverMask[i]|=co.mask[i];
 const blockers=c.blocks.map((b,i)=>!b.cover&&b.layers[0]!==color?i:-1).filter(i=>i>=0),cache=new Map();
 return state=>{
  if(state[ti]===65535||state[ti]===65534)return 0;const targetPose=state[ti]&127;let result=0;
  for(const bi of blockers){const raw=state[bi];if(raw===65535||raw===65534)continue;const b=c.blocks[bi],pos=raw&127,tag=b.shape.map(p=>p.join(',')).sort().join(';')+'@'+pos;let reachable=cache.get(tag);
   if(!reachable){const mask=b.poses[pos].mask,valid=target.poses.map(p=>Boolean(p&&!overlap(p.mask,mask)&&!overlap(p.mask,coverMask)));reachable=new Set();const queue=[];for(let p=0;p<target.poses.length;p++)if(valid[p]&&target.poses[p].exits[0].some(e=>!e.gate.frozen)){reachable.add(p);queue.push(p);}for(let i=0;i<queue.length;i++)for(const next of target.poses[queue[i]].neighbors)if(valid[next]&&!reachable.has(next)){reachable.add(next);queue.push(next);}cache.set(tag,reachable);}
   if(!reachable.has(targetPose))result++;
  }return result;
 };
}
