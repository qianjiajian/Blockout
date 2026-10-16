import assert from 'node:assert/strict';
import {compileSpatial} from '../../continuation211-optional-lift-domain.mjs';
import {sha256} from '../../continuation211-runtime.mjs';
const overlap=(a,b)=>a.some((v,i)=>v&b[i]);
export const popcount=n=>{n-=n>>>1&0x55555555;n=(n&0x33333333)+(n>>>2&0x33333333);return ((n+(n>>>4)&0x0f0f0f0f)*0x01010101)>>>24;};

/** Lower relaxation for a prefix before any cold-colour gate opens. A first
 * parking of a cold body replaces it by absent geometry for cost one, without
 * adding a clearing event. Blue bodies mutually overlap and need no parking.
 * A body frozen through the prefix stays a real stationary obstacle. Every
 * original prefix projects to this graph with non-increasing parking cost.
 * Ordinary full covers remain solid until the actual projected blue event
 * count unlocks them. Their reveal removes solid cells and replaces them by
 * a subset of stationary cold occupancy, hence greedy blue clears are safe.
 */
export function stationaryPayload(level,api,{goalClears=11,blue='blue'}={}){
 const plan=structuredClone(level);for(const b of plan.blocks)delete b.timedBombSeconds;
 const c=compileSpatial(plan,api);assert(c.covers.every(s=>s.skin!=='lift'));
 assert(c.blocks.every(b=>b.layers.length===1&&!b.keyId&&!b.lockedBy&&!b.star));
 assert(c.level.gates.every(g=>g.color===blue?!(g.frozen??0):(g.frozen??0)>=goalClears));
 assert(c.blocks.filter(b=>b.color===blue).every(b=>!b.ice));
 for(const co of c.covers){const cells=co.members.flatMap(i=>c.blocks[i].shape.map(([x,y])=>[x+c.blocks[i].x,y+c.blocks[i].y].join(',')));assert.equal(cells.length,co.width*co.height);assert.equal(new Set(cells).size,cells.length);}
 const cold=c.blocks.filter(b=>b.color!==blue&&b.ice<goalClears),fixed=c.blocks.filter(b=>b.color!==blue&&b.ice>=goalClears);
 assert(cold.length<=30);assert(c.covers.length<=20);
 const coldMasks=cold.map(b=>b.poses[b.initial].mask),fixedMasks=fixed.map(b=>b.poses[b.initial].mask);
 const blueBodies=c.blocks.filter(b=>b.color===blue).map(b=>({id:b.id,initial:b.initial,cover:b.cover?.j??-1,poses:b.poses.map(p=>p&&({required:coldMasks.reduce((n,m,j)=>n|(overlap(p.mask,m)?1<<j:0),0),fixed:fixedMasks.some(m=>overlap(p.mask,m)),covers:c.covers.reduce((n,co)=>n|(overlap(p.mask,co.mask)?1<<co.j:0),0),neighbors:p.neighbors,exit:p.exits[0].some(e=>e.gate.color===blue) }))}));
 return {goalClears,blue,coldIds:cold.map(b=>b.id),fixedIds:fixed.map(b=>b.id),covers:c.covers.map(s=>({id:s.id,count:s.count})),blueBodies,sourceLevelSha256:sha256(level),projectionLevelSha256:sha256(plan)};
}

export function closure(p,deleted){
 let revealed=0,clears=0,prior=-1,cleared=[];const frontier=new Set();
 while(clears!==prior){prior=clears;for(let j=0;j<p.covers.length;j++)if(p.covers[j].count<=clears)revealed|=1<<j;
  cleared=[];frontier.clear();
  for(const b of p.blueBodies){if(b.cover>=0&&!(revealed&(1<<b.cover)))continue;
   const seen=new Set(),q=[b.initial];let exits=false;
   while(q.length){const at=q.pop();if(seen.has(at))continue;seen.add(at);const pose=b.poses[at];if(!pose||pose.fixed||(pose.covers&~revealed))continue;
    const need=pose.required&~deleted;if(need){frontier.add(need);continue;}
    if(pose.exit)exits=true;for(const next of pose.neighbors)if(!seen.has(next))q.push(next);
   }
   if(exits)cleared.push(b.id);
  }
  clears=cleared.length;
 }
 return {clears,cleared,revealed,frontier:[...frontier]};
}

export function stationaryPrefix(p,{floor=11,maxStates=2000000,maxMilliseconds=6000,allSubsets=false}={}){
 const start=Date.now(),q=Array.from({length:floor},()=>[]),seen=new Set([0]);q[0].push(0);let explored=0,best=0;
 for(let cost=0;cost<floor;cost++)for(let at=0;at<q[cost].length;at++){
  if(seen.size>maxStates||Date.now()-start>=maxMilliseconds)return{status:'unknown',thresholdProven:false,floor,frontierCost:cost,exploredStates:explored,discoveredStates:seen.size,elapsedMilliseconds:Date.now()-start};
  const deleted=q[cost][at],a=closure(p,deleted);explored++;best=Math.max(best,a.clears);
  if(a.clears>=p.goalClears)return{status:'relaxed-shortcut',thresholdProven:false,floor,minimum:cost,deletedIds:p.coldIds.filter((_,j)=>deleted&(1<<j)),cleared:a.cleared,exploredStates:explored,discoveredStates:seen.size,elapsedMilliseconds:Date.now()-start};
  const actions=allSubsets?p.coldIds.map((_,j)=>1<<j):a.frontier;
  for(const bit of actions){const next=deleted|bit,nc=popcount(next);if(nc>=floor||seen.has(next))continue;seen.add(next);q[nc].push(next);}
 }
 return{status:'threshold-proven',thresholdProven:true,floor,exploredStates:explored,discoveredStates:seen.size,maxClearsSeen:best,elapsedMilliseconds:Date.now()-start};
}
