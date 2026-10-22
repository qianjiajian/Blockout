import assert from 'node:assert/strict';
import {compileSpatial} from '../continuation211-colored-witness.mjs';
import {digest} from './common.mjs';
export const popcount=v=>{let n=0;for(v>>>=0;v;v&=v-1)n++;return n;};
// Exact antichain fixed point for union-weighted paths. A subset at the same
// pose dominates a superset because every future path unions identical bits.
export function unionPaths({neighbors,occupied,start,goals},budget={maxLabels:100000,maxMilliseconds:1200}){
 const began=Date.now(),labels=neighbors.map(()=>[]),queue=[[start,occupied[start]]];labels[start]=[occupied[start]];let transitions=0,created=1;
 for(let head=0;head<queue.length;head++){
  if(created>budget.maxLabels||Date.now()-began>budget.maxMilliseconds)return{status:'unknown',created,transitions,reason:created>budget.maxLabels?'label-budget':'deadline'};
  const[at,mask]=queue[head];if(!labels[at].includes(mask))continue;
  for(const to of neighbors[at]){transitions++;const next=mask|occupied[to],ls=labels[to];if(ls.some(v=>(v&next)===v))continue;labels[to]=ls.filter(v=>(v&next)!==next);labels[to].push(next);queue.push([to,next]);created++;}
 }
 let masks=[];for(const g of goals)for(const mask of labels[g]){if(masks.some(v=>(v&mask)===v))continue;masks=masks.filter(v=>(v&mask)!==mask);masks.push(mask);}
 return{status:'complete',masks,created,transitions,elapsedMilliseconds:Date.now()-began};
}
export function blockerBound240(level,api,{maxLabels=100000,maxMilliseconds=1200,maxJoined=150000}={}){
 assert.equal(level.id,240);assert(!level.shutters?.length&&!level.generators?.length&&!level.flipDoors?.length);assert(level.blocks.every(b=>!b.layers&&!b.frozen&&!b.lockedBy&&!b.keyId&&!b.star));
 const free=level.gates.filter(g=>!g.frozen);assert.equal(free.length,1);const color=free[0].color,targets=level.blocks.filter(b=>b.color===color),others=level.blocks.filter(b=>b.color!==color);assert.equal(targets.length,4);assert(level.gates.filter(g=>g.color!==color).every(g=>g.frozen>=targets.length));assert(others.length<=30);
 const c=compileSpatial(level,api),initialOwner=new Map(others.flatMap((b,i)=>b.shape.map(([x,y])=>[[b.x+x,b.y+y].join(','),i]))),rows=[];let unions=[0],joined=0;
 for(const target of targets){const b=c.blocks.find(b=>b.id===target.id),neighbors=b.poses.map(p=>p?.neighbors??[]),occupied=b.poses.map((p,i)=>p?b.shape.reduce((m,[x,y])=>{const owner=initialOwner.get([i%c.W+x,Math.floor(i/c.W)+y].join(','));return owner===undefined?m:m|(1<<owner);},0):0),goals=b.poses.map((p,i)=>p?.exits[0].some(ex=>ex.gate.color===color)?i:-1).filter(i=>i>=0),graph={neighbors,occupied,start:b.initial,goals},result=unionPaths(graph,{maxLabels,maxMilliseconds});
  rows.push({id:b.id,shape:b.shape,graphSha256:digest(graph),...result});if(result.status!=='complete')return{status:'unknown',rows,thresholdProven:false,sourceLevelSha256:digest(level)};
  if(!result.masks.length)return{status:'no-static-path',rows,thresholdProven:false,sourceLevelSha256:digest(level)};
  const merged=[];for(const a of unions)for(const b of result.masks){if(++joined>maxJoined)return{status:'unknown',reason:'join-budget',rows,thresholdProven:false,sourceLevelSha256:digest(level)};const mask=a|b;if(merged.some(v=>(v&mask)===v))continue;for(let i=merged.length-1;i>=0;i--)if((merged[i]&mask)===mask)merged.splice(i,1);merged.push(mask);}unions=merged;
 }
 const minimum=Math.min(...unions.map(popcount));return{status:'complete',thresholdProven:minimum>=21,provenLowerBound:minimum,minimumDistinctBlockers:minimum,sourceLevelSha256:digest(level),openingOrdinaryColor:color,ordinaryColorCount:4,nonOrdinaryGateMinimum:Math.min(...level.gates.filter(g=>g.color!==color).map(g=>g.frozen)),blockerIds:others.map(b=>b.id),rows,joined,finalAntichain:unions,proof:'Before the fourth purple body exits, no nonpurple body can clear because all its gates require at least4 clears and there are no shells or other clear events. Every nonpurple body whose original footprint is crossed by any of the four actual purple trajectories must therefore have undergone at least one distinct nonclearing drag. Static legal pose paths ignore all purple collisions, all moved-block occupancy and exit sweeps, so they include all actual trajectories. Enumerating subset-minimal union masks at every pose and then across all four targets gives a cost-nonincreasing relaxation. One body contributes at most1 even if moved repeatedly; this is a valid lower bound, not a full shortest route.'};
}
