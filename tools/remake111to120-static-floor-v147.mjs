import assert from 'node:assert/strict';
import {compileSpatial,active,occupied,cleared,key,NONE} from './remake111to120-spatial-floor-v147.mjs';
import {digest} from './revised-preview-validation-v160.mjs';

// Qualification is deliberately narrower than the mixed graph: no future
// inventory, covers, lifts or time. Removing a reachable FINAL body only
// removes its occupancy and decreases ice/locks. Commute that zero-cost removal
// before any solution and omit later actions of that removed body; every other
// action remains possible in the optional-contact graph, with no extra cost.
// Peels are never normalized because their inner body continues to occupy space.
export function compileStatic(level,api){
 assert(level.id>=111&&level.id<=120);assert(!level.shutters?.length,'No future covers/lifts');
 const c=compileSpatial(level,api);assert.equal(c.covers.length,0);
 const groups=new Map();
 for(let i=0;i<c.N;i++){
  const {id,x,y,...properties}=level.blocks[i],signature=JSON.stringify(properties,Object.keys(properties).sort());
  if(!groups.has(signature))groups.set(signature,[]);groups.get(signature).push(i);
 }
 c.groups=[...groups.values()].filter(g=>g.length>1);
 return c;
}
export function staticKey(c,s){const a=s.slice();for(const g of c.groups){const values=g.map(i=>s[i]).sort((a,b)=>a-b);g.forEach((i,j)=>a[i]=values[j]);}return key(a);}
const overlap=(a,b)=>a.some((x,i)=>x&b[i]);
// No reveal/spawn can occur within a held move in this domain, so occupancy of
// all other bodies is constant throughout the closure. Enumerate every legal
// anchor, parking endpoint and directional exit; keep star/axis/shell identity.
export function eachStatic(c,s,visit){
 const count=cleared(c,s);
 for(let i=0;i<c.N;i++){
  if(!active(c,s,i))continue;const b=c.blocks[i],start=s[i]&127,stage=s[i]>>>7,occ=occupied(c,s,i);
  const parents=new Int16Array(c.W*c.H).fill(-1),queue=[start];parents[start]=start;
  const drag=(p,side)=>{const path=[];while(p!==start){path.push([p%c.W,Math.floor(p/c.W)]);p=parents[p];}return{blockId:b.id,path:path.reverse(),...(side?{exitSide:side}:{})};};
  for(let at=0;at<queue.length;at++){
   const p=queue[at],pose=b.poses[p];
   for(const ex of pose.exits[stage])if(count>=(ex.gate.frozen??0)){
    const next=s.slice();next[i]=stage+1<b.layers.length?p|((stage+1)<<7):NONE;
    if(visit(next,0,()=>drag(p,ex.side))===false)return;
   }
   if(p!==start){const next=s.slice();next[i]=p|(stage<<7);if(visit(next,1,()=>drag(p))===false)return;}
   for(const q of pose.neighbors)if(parents[q]<0&&!overlap(b.poses[q].mask,occ)){parents[q]=p;queue.push(q);}
  }
 }
}
export function normalizeStatic(c,start){
 let s=start;for(;;){let chosen;eachStatic(c,s,(next,cost)=>{
  if(cost===0&&next.some((v,i)=>v===NONE&&s[i]!==NONE)){chosen=next;return false;}
 });if(!chosen)return s;s=chosen;}
}
export function checkStaticFloor(level,api,{floor,maxStates=1000000,maxMilliseconds=60000,maxTransitions=20000000,normalize=true,quotient=true}={}){
 let c;try{c=compileStatic(level,api);}catch(e){return{status:'unsupported',thresholdProven:false,reason:e.message};}
 assert(Number.isSafeInteger(floor)&&floor>0);for(const v of [maxStates,maxMilliseconds,maxTransitions])assert(Number.isSafeInteger(v)&&v>0);
 const norm=s=>normalize?normalizeStatic(c,s):s,k=s=>quotient?staticKey(c,s):key(s),initial=norm(c.initial),nodes=[{s:initial,cost:0}],seen=new Map([[k(initial),0]]),buckets=Array.from({length:floor},()=>[]);buckets[0].push(0);
 const began=Date.now();let explored=0,transitions=0,stop;
 const result=(status,extra={})=>({status,thresholdProven:status==='threshold-proven',floor,sourceLevelSha256:digest(level),exploredStates:explored,discoveredStates:seen.size,attemptedTransitions:transitions,elapsedMilliseconds:Date.now()-began,normalization:normalize,identityQuotient:quotient,scope:'all original static bodies and mechanisms; optional contact',pointerValidated:false,timeValidated:false,...extra});
 for(let cost=0;cost<floor;cost++)for(let at=0;at<buckets[cost].length;at++){
  if(Date.now()-began>=maxMilliseconds)return result('unknown',{termination:'deadline'});
  const n=nodes[buckets[cost][at]];if(seen.get(k(n.s))!==cost)continue;explored++;
  if(cleared(c,n.s)===c.totalClears)return result('relaxed-shortcut',{cost});
  eachStatic(c,n.s,(raw,edge)=>{
   transitions++;if(Date.now()-began>=maxMilliseconds||transitions>=maxTransitions){stop=transitions>=maxTransitions?'max-transitions':'deadline';return false;}
   const nc=cost+edge;if(nc>=floor)return;
   // A previously normalized state can also be reached directly. Reject the
   // repeated raw state before paying for the same normalization again.
   const rawPrior=seen.get(k(raw));if(rawPrior!==undefined&&rawPrior<=nc)return;
   const s=norm(raw),sk=k(s),prior=seen.get(sk);if(prior!==undefined&&prior<=nc)return;
   if(seen.size>=maxStates){stop='max-states';return false;}seen.set(sk,nc);const index=nodes.length;nodes.push({s,cost:nc});buckets[nc].push(index);
  });if(stop)return result('unknown',{termination:stop});
 }
 return result('threshold-proven',{termination:'below-threshold-exhausted'});
}
