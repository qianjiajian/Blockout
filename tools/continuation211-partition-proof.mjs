import assert from 'node:assert/strict';
import {compileSpatial,each,cleared,key,normalizeClears,NONE} from './continuation211-colored-witness.mjs';
import {sha256} from './continuation211-runtime.mjs';

// Exact minimum to a monotone goal within a fixed budget. Guards exclude every
// nonmonotone mechanism; ordinary fully occupied covers and fixed-color floors
// use the separately qualified final-body-removal exchange argument.
export function minimumToGoal(level,api,{coverId=null,maxCost=30,maxMilliseconds=6000,maxStates=150000}={}){
 const c=compileSpatial(level,api);assert(!c.covers.some(s=>s.skin==='lift'));assert(!level.blocks.some(b=>b.keyId||b.lockedBy));
 for(const co of c.covers){const cells=co.members.flatMap(i=>{const b=c.blocks[i];return b.shape.map(([x,y])=>[x+b.x,y+b.y].join(','));});assert.equal(cells.length,co.width*co.height);assert.equal(new Set(cells).size,cells.length);}
 const co=coverId?c.covers.find(s=>s.id===coverId):null;assert(!coverId||co);
 const goal=s=>co?s[co.stateIndex]!==NONE:cleared(c,s)===c.totalClears;
 const groups=new Map();level.blocks.forEach((b,i)=>{const k=sha256(Object.fromEntries(Object.entries(b).filter(([k])=>!['id','x','y'].includes(k))));if(!groups.has(k))groups.set(k,[]);groups.get(k).push(i);});
 const identical=[...groups.values()].filter(g=>g.length>1),signature=s=>{const p=s.slice();for(const g of identical){const v=g.map(i=>s[i]).sort((a,b)=>a-b);g.forEach((i,j)=>p[i]=v[j]);}return key(p);};
 const normalize=s=>{const k=signature(s);let value=cache.get(k);if(value)return value;const n=normalizeClears(c,s);value=n.s;cache.set(k,value);return value;};
 const cache=new Map(),initial=normalize(c.initial),seen=new Map([[signature(initial),0]]),buckets=Array.from({length:maxCost+1},()=>[]);buckets[0].push(initial);
 let explored=0,transitions=0,stop,completedCost=-1;const start=Date.now();
 const finish=(status,extra={})=>({status,levelSha256:sha256(level),goal:coverId?{coverRevealed:coverId}:'complete',exploredStates:explored,attemptedTransitions:transitions,elapsedMilliseconds:Date.now()-start,completedCost,termination:stop,...extra});
 for(let cost=0;cost<=maxCost;cost++){
  for(let i=0;i<buckets[cost].length;i++){
   if(Date.now()-start>=maxMilliseconds){stop='deadline';return finish('unknown');}
   const s=buckets[cost][i];if(seen.get(signature(s))<cost)continue;explored++;
   if(goal(s))return finish('minimum-proven',{minimum:cost});
   each(c,s,(raw,delta)=>{
    if(Date.now()-start>=maxMilliseconds||seen.size>=maxStates){stop='budget';return false;}
    transitions++;const ncost=cost+delta;if(ncost>maxCost)return;
    const next=normalize(raw),sk=signature(next),previous=seen.get(sk);if(previous!==undefined&&previous<=ncost)return;seen.set(sk,ncost);buckets[ncost].push(next);
   });if(stop)return finish('unknown');
  }completedCost=cost;
 }
 return finish('threshold-proven',{floor:maxCost+1});
}

export function coverPartitionLower(level,api,{coverId,maxMilliseconds=6000,maxCost=30}={}){
 const cover=level.shutters?.find(s=>s.id===coverId);assert(cover&&cover.skin!=='lift');
 const prefix=minimumToGoal(level,api,{coverId,maxMilliseconds,maxCost});
 // Remove all other bodies and restrictions; the selected hidden bodies start
 // at their immutable reveal poses. Costs count only their own drags, disjoint
 // from every drag in the prefix before their first reveal.
 const projection=structuredClone(level);projection.blocks=projection.blocks.filter(b=>b.shutterId===coverId).map(b=>{delete b.shutterId;delete b.frozen;return b;});delete projection.shutters;projection.gates.forEach(g=>delete g.frozen);
 const hidden=minimumToGoal(projection,api,{maxMilliseconds,maxCost});
 const lowerOf=p=>p.status==='minimum-proven'?p.minimum:p.status==='threshold-proven'?p.floor:Math.max(0,p.completedCost+1);
 return {status:'SOUND_PARTITION_BOUND',sourceLevelSha256:sha256(level),floor:lowerOf(prefix)+lowerOf(hidden),prefix,hidden,projection,projectionSha256:sha256(projection),theorem:'Every complete solution includes a prefix reaching the selected ordinary cover reveal and all later drags of its hidden bodies. These disjoint drag sets have nonnegative costs. The hidden-only projection deletes collisions and ice restrictions, preserves each hidden body/shape/color/axis and static floor. It contains every projected real suffix. Sum of the independently proved lower bounds is a lower bound on the original total.'};
}
