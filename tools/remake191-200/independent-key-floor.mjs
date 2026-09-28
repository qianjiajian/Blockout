import fs from 'node:fs';import assert from 'node:assert/strict';
import {keyPayload} from './author194-196/key-floor.mjs';
import {ROOT,ruleGate,digest,writeNew} from './common.mjs';
ruleGate();const file=process.argv[2],d=JSON.parse(fs.readFileSync(file)),{p}=keyPayload(d.level,{floor:16,maxMilliseconds:6000,maxStates:800000});
assert(p.blocks.every(b=>b.layers===1),'This independent full enumeration is for the single-stage192 domain');assert.equal(p.goalClears,24);
const key=s=>String.fromCharCode(...s),raw=s=>s.reduce((a,v)=>a+Number(v===511),0),overlap=(a,b)=>a.some((v,i)=>(v&b[i])!==0);
const canon=s=>{s=s.slice();for(const g of p.groups){const vs=g.map(i=>s[i]).sort((a,b)=>a-b);g.forEach((i,j)=>s[i]=vs[j]);}return s;};
function each(s,visit){const cleared=raw(s),occupied=[0,0,0,0];for(const c of p.covers)if(cleared<c.count)c.mask.forEach((v,j)=>occupied[j]|=v);s.forEach((v,i)=>{if(v!==511&&cleared>=p.blocks[i].reveal)p.blocks[i].poses[v].mask.forEach((v,j)=>occupied[j]|=v);});
 for(let i=0;i<s.length;i++){const b=p.blocks[i],start=s[i];if(start===511||cleared<b.reveal+b.ice||b.keyIndices.filter(j=>s[j]===511).length<b.lockCount)continue;const other=occupied.map((v,j)=>v^b.poses[start].mask[j]),queue=[start],seen=new Set(queue);
  for(let j=0;j<queue.length;j++){const at=queue[j],pose=b.poses[at];if(at!==start&&visit(i,at,1)===false)return;if(pose.exits[0]>=0&&cleared>=pose.exits[0]&&visit(i,511,0)===false)return;for(const to of pose.neighbors)if(!seen.has(to)&&!overlap(b.poses[to].mask,other)){seen.add(to);queue.push(to);}}
 }
}
function normalize(s){for(;;){let body;each(s,(i,v,cost)=>{if(cost===0){body=i;return false;}});if(body===undefined)return s;s=s.slice();s[body]=511;}}
const initial=canon(normalize(p.initial)),seen=new Map([[key(initial),0]]),buckets=Array.from({length:16},()=>[]);buckets[0].push(initial);let states=0,transitions=0,termination='below-threshold-exhausted';const start=Date.now();
outer:for(let cost=0;cost<16;cost++)for(let j=0;j<buckets[cost].length;j++){
 if(Date.now()-start>25000||seen.size>800000){termination='independent-budget';break outer;}
 const s=buckets[cost][j];if(seen.get(key(s))!==cost)continue;states++;assert(raw(s)<24,'Relaxed shortcut found');
 each(s,(i,v,edge)=>{const nextCost=cost+edge;if(nextCost>=16)return;transitions++;let next=s.slice();next[i]=v;next=canon(normalize(next));
  // All zero-cost gestures are final removals, fully exhausted by normalization.
  if(nextCost===15&&raw(next)<24)return;
  const k=key(next),prior=seen.get(k);if(prior!==undefined&&prior<=nextCost)return;seen.set(k,nextCost);buckets[nextCost].push(next);
 });
}
const out=ROOT+'/key-js192-'+Date.now()+'.json';writeNew(out,{status:termination==='below-threshold-exhausted'?'PASS':'UNKNOWN',file,levelSha256:digest(d.level),payloadSha256:digest(p),states,discovered:seen.size,transitions,elapsedMilliseconds:Date.now()-start,termination,proofDomain:'Full24-body optional-exit keys/countdown/ice domain. Every group preserves shape,color,ice,reveal,keys and locks. Earlier full removals free space, unlock monotone locks and advance counters; covered reveal only removes part of an already forbidden area. No peels, generators, flips, lifts or clocks. Cost15 terminal pruning only follows exhaustive free normalization of single-stage bodies. This independent JS implementation does not invoke native solver.',certified:termination==='below-threshold-exhausted'});console.log(JSON.stringify({out,termination,states,discovered:seen.size}));
