import assert from 'node:assert/strict';
import {compileSpatial,each,key,NONE,cleared} from './remake111to120-spatial-floor-v147.mjs';
import {digest} from './revised-preview-validation-v160.mjs';

// Before all lifts reveal, retain the complete original graph. Afterwards the
// only new occupancy is ordinary countdown contents replacing a forbidden
// rectangle. Clearing a reachable final body cannot obstruct a remaining
// action: it frees cells, opens ice/locks earlier, and reveals no cells outside
// those already forbidden rectangles. Peels are never normalized. Hidden ice
// ages from its actual reveal count; earlier reveal cannot increase its delay.
export function compileLiftSuffix(level,api){
 assert(level.id>=111&&level.id<=120);const c=compileSpatial(level,api),groups=new Map();
 for(let i=0;i<c.N;i++){const {id,x,y,...p}=level.blocks[i],k=JSON.stringify(p,Object.keys(p).sort());if(!groups.has(k))groups.set(k,[]);groups.get(k).push(i);}
 c.groups=[...groups.values()].filter(g=>g.length>1);return c;
}
export function liftSuffixKey(c,s){const a=s.slice();for(const g of c.groups){const values=g.map(i=>s[i]).sort((a,b)=>a-b);g.forEach((i,j)=>a[i]=values[j]);}return key(a);}
export function normalizeLiftSuffix(c,input){
 if(c.covers.some(s=>s.skin==='lift'&&input[s.stateIndex]===NONE))return input;
 let state=input;
 for(;;){let selected;each(c,state,(next,cost)=>{if(cost===0&&next.some((v,i)=>i<c.N&&v===NONE&&state[i]!==NONE)){selected=next;return false;}});if(!selected)return state;state=selected;}
}
export function checkLiftSuffixFloor(level,api,{floor,maxStates=1000000,maxMilliseconds=60000,maxTransitions=20000000,normalize=true,quotient=true}={}){
 let c;try{c=compileLiftSuffix(level,api);}catch(e){return{status:'unsupported',thresholdProven:false,reason:e.message};}
 for(const v of [floor,maxStates,maxMilliseconds,maxTransitions])assert(Number.isSafeInteger(v)&&v>0);
 const k=s=>quotient?liftSuffixKey(c,s):key(s),norm=s=>normalize?normalizeLiftSuffix(c,s):s;
 const initial=norm(c.initial),raw=key(initial),dist=new Map([[k(initial),0]]),buckets=Array.from({length:floor},()=>[]);buckets[0].push(raw);
 const began=Date.now();let explored=0,transitions=0,stop,maxExpandedCost=0;
 const report=(status,extra={})=>({status,thresholdProven:status==='threshold-proven',floor,sourceLevelSha256:digest(level),abstraction:'complete-lift-prefix-monotone-suffix-after-all-lifts-revealed',exploredStates:explored,discoveredStates:dist.size,attemptedTransitions:transitions,elapsedMilliseconds:Date.now()-began,maxExpandedCost,normalize,quotient,solvabilityValidated:false,timeValidated:false,pointerValidated:false,...extra});
 for(let cost=0;cost<floor;cost++)while(buckets[cost].length){
  if(Date.now()-began>=maxMilliseconds)return report('unknown',{termination:'deadline'});
  const s=Uint16Array.from(buckets[cost].pop(),x=>x.charCodeAt(0));if(dist.get(k(s))!==cost)continue;explored++;maxExpandedCost=cost;
  if(cleared(c,s)===c.totalClears)return report('relaxed-shortcut',{cost});
  each(c,s,(raw,edge)=>{
   if(++transitions>=maxTransitions||Date.now()-began>=maxMilliseconds){stop=transitions>=maxTransitions?'max-transitions':'deadline';return false;}
   const nc=cost+edge;if(nc>=floor)return;const rawPrior=dist.get(k(raw));if(rawPrior!==undefined&&rawPrior<=nc)return;
   const next=norm(raw),nk=k(next),prior=dist.get(nk);if(prior!==undefined&&prior<=nc)return;
   if(dist.size>=maxStates){stop='max-states';return false;}dist.set(nk,nc);buckets[nc].push(key(next));
  });if(stop)return report('unknown',{termination:stop});
 }
 return report('threshold-proven',{termination:'below-threshold-exhausted'});
}
