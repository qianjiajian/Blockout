import assert from 'node:assert/strict';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {qualifyLift} from './lift-floor.mjs';
import {compile,clearCount,key} from '../../../deliverables/remake31-200-v145-20260924/batches/lv061-070/author65-67/lift-search.mjs';
import {eachFast67} from './fast-lift-edges67.mjs';
/** Necessary milestone proof, retaining the complete qualified actual inventory.
 * Every complete solution has at least goalClears clear/peel events. Search the
 * same cost-nonincreasing optional-exit graph, but stop at that weaker goal.
 * If no path of cost < floor reaches even this goal, no full completion of cost
 * < floor exists. Counts and hidden bodies are not removed or synthesized.
 */
export function checkPrefixFloor67(level,api,{floor=11,goalClears=3,maxStates=100000,maxMilliseconds=1000,canonical=true}={}){
 const base={thresholdProven:false,abstraction:'qualified-full-lift-optional-exit-necessary-clear-milestone67-v147',sourceLevelSha256:digest(level),costNonincreasing:true,quotient:canonical?'identical-shape-color-ice-batch-permutations':'none',goalPredicate:'clearCount(state) >= goalClears',goalClears,floor,completeImpliesMilestone:'Every body must finish all its layers, so completion has totalInventoryLayerCount clear/peel events, which the domain verifies is at least goalClears.',solvabilityValidated:false,pointerValidated:false};
 if(![floor,goalClears,maxStates,maxMilliseconds].every(n=>Number.isSafeInteger(n)&&n>0))return{...base,status:'invalid'};
 try{assert.equal(level.id,67);qualifyLift(level,api);}catch(e){return{...base,status:'unsupported',reason:e.message};}
 const c=compile(level);if(goalClears>c.total)return{...base,status:'invalid',reason:'Milestone exceeds complete clear count'};
 const grouped=new Map();level.blocks.forEach((b,i)=>{const k=JSON.stringify([b.shape,b.layers??[b.color],b.frozen??0,b.shutterId??null]);if(!grouped.has(k))grouped.set(k,[]);grouped.get(k).push(i);});const groups=[...grouped.values()],stateKey=canonical?s=>JSON.stringify([groups.map(g=>g.map(i=>[s[i],s[c.N+i]]).sort((a,b)=>a[0]-b[0]||a[1]-b[1])),Array.from(s.slice(2*c.N))]):key;
 const seen=new Map([[stateKey(c.initial),0]]),buckets=Array.from({length:floor},()=>[]);buckets[0].push(c.initial);const start=Date.now();let states=1,explored=0,transitions=0,stop,frontierCost=0;
 outer:for(let cost=0;cost<floor;cost++){frontierCost=cost;for(let bi=0;bi<buckets[cost].length;bi++){
  if(Date.now()-start>=maxMilliseconds){stop='deadline';break outer;}const s=buckets[cost][bi];buckets[cost][bi]=null;if(seen.get(stateKey(s))<cost)continue;explored++;if(clearCount(c,s)>=goalClears)return{...base,status:'milestone-shortcut',milestoneReachedAtCost:cost,states,explored,transitions,frontierCost,ms:Date.now()-start};
  eachFast67(c,s,(n,delta)=>{if(Date.now()-start>=maxMilliseconds){stop='deadline';return false;}transitions++;const nextCost=cost+delta;if(nextCost>=floor)return;const k=stateKey(n),old=seen.get(k);if(old!==undefined&&old<=nextCost)return;if(seen.size>=maxStates){stop='max-states';return false;}seen.set(k,nextCost);states=seen.size;buckets[nextCost].push(n);},{optionalExit:true});if(stop)break outer;
 }buckets[cost]=[];}
 return{...base,status:stop?'unknown':'threshold-proven',thresholdProven:!stop,states,explored,transitions,frontierCost,ms:Date.now()-start,stop};
}
