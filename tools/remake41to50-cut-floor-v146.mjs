/** Exact all-opening-cleared curtain cut using the ORIGINAL full graph.
 * Unlike converting the closed cover to blocked cells, this retains gates that
 * overlap its boundary. Before the cut every hidden body is immobile. At the
 * cut all opening layers are gone, so remaining inventory has a unique state.
 * Costs are nonnegative: exact relaxed prefix optimum + suffix lower bound is
 * a lower bound for the actual full level. No assumptions about clearing order.
 */
import {compileLevel,forEachGesture,clearCount} from './remake21to30-mask-floor.mjs';
import {equivalentBlockGroups,canonicalStateKey,checkSymmetryFloor} from './remake21to30-symmetry-floor-v139.mjs';
import {uniqueCurtainSuffix} from './remake21to30-unique-suffix-v139.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
export function normalizeBeforeCut(c,input,cut){
 let state=input;const drags=[];
 while(clearCount(c,state)<cut){let selected;forEachGesture(c,state,(i,v,cost,get)=>{if(cost===0&&v===255){selected={i,v,drag:get()};return false;}});if(!selected)break;state=state.slice();state[selected.i]=selected.v;drags.push(selected.drag);}
 return{state,drags};
}
export function checkExactCutPrefix(level,options={}){
 const floor=options.floor??16,maxStates=options.maxStates??2000000,maxMilliseconds=options.maxMilliseconds??180000;
 const out={status:'unknown',thresholdProven:false,floor,abstraction:'all-opening-cleared-original-graph-prefix-v146',sourceLevelSha256:digest(level),exploredStates:0,discoveredStates:0,attemptedTransitions:0};
 if(![floor,maxStates,maxMilliseconds].every(n=>Number.isSafeInteger(n)&&n>0))return{...out,status:'invalid'};
 let cut,c;try{cut=uniqueCurtainSuffix(level).clearsBeforeReveal;c=compileLevel(level);}catch(e){return{...out,status:'unsupported',reason:e.message};}
 const groups=equivalentBlockGroups(c),key=s=>canonicalStateKey(s,groups),norm=options.normalize===false?s=>({state:s,drags:[]}):s=>normalizeBeforeCut(c,s,cut);
 const initial=norm(c.initial),k0=key(initial.state),dist=new Map([[k0,0]]),nodes=[{state:initial.state,cost:0,parent:-1,drags:initial.drags}],buckets=Array.from({length:floor},()=>[]);buckets[0].push(0);
 const deadline=Date.now()+maxMilliseconds,route=i=>{const parts=[];while(i>=0){parts.push(nodes[i].drags);i=nodes[i].parent;}return parts.reverse().flat();};
 let stopped=null;
 walk: for(let cost=0;cost<floor;cost++)while(buckets[cost].length){
  if(Date.now()>=deadline){stopped='deadline';break walk;}const parent=buckets[cost].pop(),n=nodes[parent];if(dist.get(key(n.state))!==cost)continue;out.exploredStates++;
  if(clearCount(c,n.state)>=cut)return{...out,status:'cut-reached',minimum:cost,cut,route:route(parent),discoveredStates:dist.size,cutState:[...n.state]};
  forEachGesture(c,n.state,(i,v,edge,get)=>{out.attemptedTransitions++;const nc=cost+edge;if(nc>=floor)return;const moved=n.state.slice();moved[i]=v;const f=norm(moved),k=key(f.state),prior=dist.get(k);if(prior!==undefined&&prior<=nc)return;
   if(prior===undefined&&dist.size>=maxStates){stopped='max-states';return false;}if(Date.now()>=deadline){stopped='deadline';return false;}
   dist.set(k,nc);nodes.push({state:f.state,cost:nc,parent,drags:[get(),...f.drags]});buckets[nc].push(nodes.length-1);
  });if(stopped)break walk;
 }
 return{...out,cut,discoveredStates:dist.size,...(stopped?{termination:stopped}:{status:'threshold-proven',thresholdProven:true,termination:'below-cut-threshold-exhausted'})};
}
export function checkExactCurtainSumFloor(level,options={}){
 const floor=options.floor??16,prefixProof=checkExactCutPrefix(level,{...options,floor});
 const base={floor,abstraction:'unique-curtain-original-graph-prefix-plus-suffix-v146',sourceLevelSha256:digest(level),prefixProof,solvabilityValidated:false,timeValidated:false,pointerReplayValidated:false};
 if(prefixProof.thresholdProven)return{...base,status:'threshold-proven',thresholdProven:true,exploredStates:prefixProof.exploredStates};
 if(prefixProof.status!=='cut-reached')return{...base,status:prefixProof.status==='unsupported'?'unsupported':'unknown',thresholdProven:false};
 const suffix=uniqueCurtainSuffix(level).level,suffixProof=checkSymmetryFloor(suffix,{...options,floor:floor-prefixProof.minimum});
 return{...base,prefixMinimum:prefixProof.minimum,suffixProof,status:suffixProof.thresholdProven?'threshold-proven':suffixProof.status==='relaxed-shortcut'?'phases-below-threshold':'unknown',thresholdProven:suffixProof.thresholdProven,exploredStates:prefixProof.exploredStates+suffixProof.exploredStates};
}
