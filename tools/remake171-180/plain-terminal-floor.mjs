import assert from 'node:assert/strict';
import {compile,normalize,each,key,clearCount} from '../remake131to140-axis-floor-v172.mjs';
// Narrow independent JS verifier: only ordinary non-layered bodies and frozen
// ordinary gates. normalize already exhausts every reachable zero-cost clear.
// At floor-1, an incomplete normalized state therefore needs >=1 more paid
// gesture and cannot witness a solution strictly below floor. Discarding it is
// an exact terminal prune, not a change to the candidate or its difficulty.
export function plainTerminalFloor(level,api,{floor,maxStates=150000,maxMilliseconds=12000}){
 for(const k of ['flipDoors','shutters','generators','elevators','coloredGrids','conveyors'])assert(!(level[k]?.length),'plain only '+k);
 for(const b of level.blocks)for(const k of ['layers','frozen','timedBombSeconds','keyId','lockedBy','lockCount','star','movementAxis','shutterId'])assert(b[k]===undefined,'plain only '+k);
 const c=compile(level,api),start=Date.now(),first=normalize(c,c.initial).s;
 const groups=new Map();c.blocks.forEach((b,i)=>{const s=JSON.stringify({shape:b.shape,layers:b.layers,ice:b.ice,reveal:b.reveal});if(!groups.has(s))groups.set(s,[]);groups.get(s).push(i);});
 const canonical=s=>{s=s.slice();for(const ids of groups.values()){const v=ids.map(i=>s[i]).sort((a,b)=>a-b);ids.forEach((id,j)=>s[id]=v[j]);}return key(s)};
 const buckets=Array.from({length:floor},()=>[]),seen=new Map([[canonical(first),0]]);buckets[0].push(first);let explored=0,transitions=0,pruned=0,stop=null;
 for(let cost=0;cost<floor&&!stop;cost++)for(let n=0;n<buckets[cost].length&&!stop;n++){
  const s=buckets[cost][n];if(seen.get(canonical(s))!==cost)continue;
  if(Date.now()-start>=maxMilliseconds){stop='deadline';break;}explored++;
  if(clearCount(c,s)===c.total)return{status:'relaxed-shortcut',thresholdProven:false,cost,explored,transitions,pruned};
  if(cost===floor-1){pruned++;continue;}
  each(c,s,(i,v,edge)=>{transitions++;const d=cost+edge;if(d>=floor)return;const moved=s.slice();moved[i]=v;const next=normalize(c,moved).s;
   if(d===floor-1&&clearCount(c,next)!==c.total){pruned++;return;}
   const k=canonical(next),old=seen.get(k);if(old!==undefined&&old<=d)return;
   if(seen.size>=maxStates){stop='max-states';return false;}if(Date.now()-start>=maxMilliseconds){stop='deadline';return false;}
   seen.set(k,d);buckets[d].push(next);
  });
 }
 return{status:stop?'unknown':'threshold-proven',thresholdProven:!stop,floor,explored,states:seen.size,transitions,pruned,stop,ms:Date.now()-start,abstraction:'plain-body-js-independent-terminal-prune-no-shells'};
}
