import assert from 'node:assert/strict';
import {compileSpatial,each,cleared,key,normalizeClears} from '../remake201to210-v123-floor.mjs';
import {sha256} from '../continuation211-runtime.mjs';

/** Exact quotient by permutations of blocks with identical rules and footprints.
 * Group identity includes every non-pose/non-label BlockSpec field; cover state
 * remains labeled. Each representative keeps its real IDs for transitions.
 * Identical blocks have identical reachable poses, layer/ice/lock/star behavior,
 * hence exchanging their encoded pose/stage/removal entries is an automorphism.
 * No geometry, inventory, costs, exits or removal event is relaxed away. */
export function proveMemo(level,api,{floor=21,maxMilliseconds=6000,maxStates=150000,normalizeMonotone=false}={}){
 let c;try{c=compileSpatial(level,api);}catch(e){return{status:'unsupported',reason:e.message};}
 assert(Number.isSafeInteger(floor)&&floor>0);
 if(normalizeMonotone){assert(!(level.shutters??[]).some(s=>s.skin&&s.skin!=='shutter'),'Only ordinary solid covers are qualified');assert(!(level.blocks??[]).some(b=>b.keyId||b.lockedBy),'Keys/locks are outside qualified normalization domain');for(const s of level.shutters??[]){const hidden=level.blocks.filter(b=>b.shutterId===s.id).flatMap(b=>b.shape.map(([x,y])=>`${b.x+x},${b.y+y}`));assert(new Set(hidden).size===s.width*s.height&&hidden.length===s.width*s.height,'Monotone proof requires each ordinary cover fully and singly tiled');}}
 const normalize=s=>normalizeMonotone?normalizeClears(c,s):{s,drags:[]};
 const groups=new Map();for(let i=0;i<c.N;i++){const b=level.blocks[i],value=JSON.stringify(Object.fromEntries(Object.entries(b).filter(([k])=>!['id','x','y'].includes(k)).sort(([a],[b])=>a.localeCompare(b))));if(!groups.has(value))groups.set(value,[]);groups.get(value).push(i);}
 const interchangeable=[...groups.values()].filter(g=>g.length>1);
 const stateKey=s=>{if(!interchangeable.length)return key(s);const p=s.slice();for(const g of interchangeable){const values=g.map(i=>s[i]).sort((a,b)=>a-b);g.forEach((i,j)=>p[i]=values[j]);}return key(p);};
 const initial=normalize(c.initial),began=Date.now(),nodes=[{s:initial.s,cost:0,parent:-1,drags:initial.drags}],seen=new Map([[stateKey(initial.s),0]]),buckets=Array.from({length:floor},()=>[]);buckets[0].push(0);const rawSeen=new Map([[stateKey(c.initial),0]]);let rawDuplicateSkips=0,explored=0,transitions=0,stop;
 const route=i=>{const out=[];while(i>=0){out.push(nodes[i].drags);i=nodes[i].parent;}return out.reverse().flat();};
 const finish=(status,extra={})=>({status,thresholdProven:status==='threshold-proven',floor,sourceLevelSha256:sha256(level),elapsedMilliseconds:Date.now()-began,exploredStates:explored,discoveredStates:seen.size,attemptedTransitions:transitions,rawDuplicateSkips,interchangeableGroups:interchangeable.map(g=>g.map(i=>level.blocks[i].id)),method:'complete-spatial-graph-with-identical-block-permutation-quotient',normalizeMonotone,termination:stop??'below-threshold-exhausted',...extra});
 for(let cost=0;cost<floor;cost++)for(let cursor=0;cursor<buckets[cost].length;cursor++){
  if(Date.now()-began>=maxMilliseconds){stop='deadline';return finish('unknown');}const ni=buckets[cost][cursor],n=nodes[ni];if(seen.get(stateKey(n.s))<n.cost)continue;explored++;if(cleared(c,n.s)===c.totalClears)return finish('relaxed-shortcut',{cost,drags:route(ni)});
  each(c,n.s,(raw,k,get)=>{if(Date.now()-began>=maxMilliseconds||seen.size>=maxStates){stop=seen.size>=maxStates?'max-states':'deadline';return false;}transitions++;const nextCost=cost+k;if(nextCost>=floor)return;const rawKey=stateKey(raw),rawPrior=rawSeen.get(rawKey);if(rawPrior!==undefined&&rawPrior<=nextCost){rawDuplicateSkips++;return;}rawSeen.set(rawKey,nextCost);const normal=normalize(raw),s=normal.s,sk=stateKey(s),prior=seen.get(sk);if(prior!==undefined&&prior<=nextCost)return;seen.set(sk,nextCost);nodes.push({s,cost:nextCost,parent:ni,drags:[get(),...normal.drags]});buckets[nextCost].push(nodes.length-1);},{optionalExit:true});if(stop)return finish('unknown');
 }
 return finish('threshold-proven');
}
