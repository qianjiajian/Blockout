import assert from 'node:assert/strict';
import {compileSpatial,each,cleared,normalizeClears} from '../remake111to120-spatial-floor-v147.mjs';

/** Narrow monotone removal domain: only ordinary fixed gates, rectangular
 * free/axis pieces and key/lock bodies. No time, shells, counters, covers,
 * queues, grids, flips or stars. Removing any already-removable body only
 * frees cells and releases keys. It cannot disable an edge of any remaining
 * body's route. Therefore greedily closing zero-cost removals never increases
 * the minimum non-clear cost. Optional contact supplies a relaxation of GUI
 * auto-exit; exhausting this stronger player's states certifies a lower bound.
 * Equal plain shape/colour/property bodies are interchangeable; key/lock
 * identities remain in the grouping signature. This is NOT a solvability,
 * Pointer, clock or optimal total-drag certificate.
 */
export function monotoneKeyFloor(level,api,{floor,maxMilliseconds=1400,maxStates=40000,maxTransitions=800000}={}){
 assert(Number.isInteger(floor)&&floor>0);
 assert.equal(level.mechanismRules,'revised-2026-09-27-v1.5');
 for(const k of ['shutters','generators','flipDoors','coloredGrids','elevators','conveyors','seams'])assert(!level[k]?.length,`Unsupported ${k}`);
 assert(level.blocks.every(b=>!b.layers?.length&&!b.frozen&&!b.star&&!b.timedBombSeconds&&!b.rotationBadge));
 assert(level.gates.every(g=>!g.frozen&&!g.star));
 const c=compileSpatial({...structuredClone(level),mechanismRules:'revised-2026-09-23-v1.4'},api),groups=new Map();
 for(const[i,b]of c.blocks.entries()){
  const k=JSON.stringify({shape:b.shape,color:b.color,movementAxis:b.movementAxis,keyId:b.keyId,lockedBy:b.lockedBy,lockCount:b.lockCount});
  if(!groups.has(k))groups.set(k,[]);groups.get(k).push(i);
 }
 const grouped=[...groups.values()].filter(g=>g.length>1),key=s=>{
  const n=[...s];for(const g of grouped){const values=g.map(i=>n[i]).sort((a,b)=>a-b);g.forEach((i,j)=>n[i]=values[j]);}return String.fromCharCode(...n);
 };
 const start=Date.now(),initial=normalizeClears(c,c.initial),nodes=[{s:initial.s,cost:0,parent:-1,drags:initial.drags}],seen=new Map([[key(initial.s),0]]),buckets=Array.from({length:floor},()=>[]);buckets[0].push(0);
 let explored=0,transitions=0,stop;
 const route=i=>{const r=[];while(i>=0){r.push(nodes[i].drags);i=nodes[i].parent;}return r.reverse().flat();};
 const result=(status,extra={})=>({status,thresholdProven:status==='threshold-proven',floor,exploredStates:explored,discoveredStates:seen.size,attemptedTransitions:transitions,elapsedMilliseconds:Date.now()-start,domain:'no-adverse-events-keys-axis-only-with-monotone-free-removal-closure',pointerValidated:false,timeValidated:false,releaseApproved:false,...extra});
 for(let depth=0;depth<floor;depth++)while(buckets[depth].length){
  if(Date.now()-start>=maxMilliseconds)return result('unknown',{termination:'deadline'});
  const ni=buckets[depth].pop(),n=nodes[ni];if(seen.get(key(n.s))!==n.cost)continue;explored++;
  if(cleared(c,n.s)===c.totalClears)return result('relaxed-shortcut',{cost:n.cost,drags:route(ni)});
  each(c,n.s,(raw,cost,get)=>{
   if(++transitions>maxTransitions||Date.now()-start>=maxMilliseconds){stop=transitions>maxTransitions?'max-transitions':'deadline';return false;}
   const nc=n.cost+cost;if(nc>=floor)return;
   const closure=normalizeClears(c,raw),k=key(closure.s),prior=seen.get(k);if(prior!==undefined&&prior<=nc)return;
   if(seen.size>=maxStates){stop='max-states';return false;}
   seen.set(k,nc);nodes.push({s:closure.s,cost:nc,parent:ni,drags:[get(),...closure.drags]});buckets[nc].push(nodes.length-1);
  },{optionalExit:true});
  if(stop)return result('unknown',{termination:stop});
 }
 return result('threshold-proven',{termination:'below-threshold-exhausted'});
}
