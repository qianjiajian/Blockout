import {compileFastStatic} from './remake111to120-fast-static-floor-v147.mjs';
import {forEachGesture,clearCount} from './remake21to30-mask-floor.mjs';
import {canonicalStateKey} from './remake21to30-symmetry-floor-v139.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
// Exact same qualified static graph. Store only canonical byte strings and
// distances, never parents or route copies. Within each cost bucket, try more
// clears first. This changes enumeration order only and prunes no graph edge.
export function compactNormalize(c,input){let state=input;for(;;){let selected;forEachGesture(c,state,(i,v,cost)=>{if(cost===0&&v===255){selected=i;return false;}});if(selected===undefined)return state;state=state.slice();state[selected]=255;}}
export function searchCompactStatic(c,{floor,maxStates=15000000,maxMilliseconds=1800000,maxTransitions=1000000000,start=c.initial}={}){
 const began=Date.now(),k=s=>canonicalStateKey(s,c.groups),initial=compactNormalize(c,start),ik=k(initial),dist=new Map([[ik,0]]),buckets=Array.from({length:floor},()=>Array.from({length:c.totalClears+1},()=>[]));buckets[0][clearCount(c,initial)].push(ik);
 let explored=0,transitions=0,maxExpandedCost=0,stop;
 const result=(status,extra={})=>({status,thresholdProven:status==='threshold-proven',floor,exploredStates:explored,discoveredStates:dist.size,attemptedTransitions:transitions,maxExpandedCost,elapsedMilliseconds:Date.now()-began,...extra});
 for(let cost=0;cost<floor;cost++)for(;;){
  if(Date.now()-began>=maxMilliseconds)return result('unknown',{termination:'deadline'});
  let row=c.totalClears;while(row>=0&&!buckets[cost][row].length)row--;if(row<0)break;
  const text=buckets[cost][row].pop();if(dist.get(text)!==cost)continue;const state=Uint8Array.from(text,x=>x.charCodeAt(0));explored++;maxExpandedCost=cost;
  if(row===c.totalClears)return result('relaxed-shortcut',{cost});
  forEachGesture(c,state,(i,v,edge)=>{
   if(++transitions>=maxTransitions||Date.now()-began>=maxMilliseconds){stop=transitions>=maxTransitions?'max-transitions':'deadline';return false;}
   const nc=cost+edge;if(nc>=floor)return;const raw=state.slice();raw[i]=v;const priorRaw=dist.get(k(raw));if(priorRaw!==undefined&&priorRaw<=nc)return;
   const next=compactNormalize(c,raw),count=clearCount(c,next);
   // At the last allowed cost, an incomplete all-final-layer normal form has
   // no zero-cost successor. Its next action must exceed this proof's budget.
   // Keep every shell-peel state and every complete state.
   if(nc===floor-1&&count<c.totalClears&&next.every((v,j)=>v===255||(v>>>7)===c.blocks[j].layers.length-1))return;
   const nk=k(next),prior=dist.get(nk);if(prior!==undefined&&prior<=nc)return;
   if(dist.size>=maxStates){stop='max-states';return false;}dist.set(nk,nc);buckets[nc][clearCount(c,next)].push(nk);
  });if(stop)return result('unknown',{termination:stop});
 }
 return result('threshold-proven',{termination:'below-threshold-exhausted'});
}
export function checkCompactStaticFloor(level,api,options={}){
 if(![options.floor,options.maxStates??15000000,options.maxMilliseconds??1800000,options.maxTransitions??1000000000].every(n=>Number.isSafeInteger(n)&&n>0))return{status:'invalid',thresholdProven:false};
 let c;try{c=compileFastStatic(level,api);}catch(e){return{status:'unsupported',thresholdProven:false,reason:e.message};}
 return{...searchCompactStatic(c,options),abstraction:'qualified-static-star-axis-mask96-compact-final-layer-zero-exit-boundary',sourceLevelSha256:digest(level),solvabilityValidated:false,timeValidated:false,pointerValidated:false};
}
