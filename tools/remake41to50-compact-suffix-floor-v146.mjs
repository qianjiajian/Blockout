/** Storage-only proof walk over the qualified immediate FIFO suffix graph.
 * No state/edge/normalization changes: visited keys still use the same groups.
 * Settled nodes are discarded. Frontier stores lossless byte strings; no drag
 * arrays or parent chain are allocated. A shortcut fails the floor but is not
 * advertised as a replay witness. Full replay remains a separate certificate.
 */
import{compileGeneratorLevel}from'./remake41to50-full-generator-floor-v146.mjs';
import{forEachImmediateGeneratorGesture,normalizeCompletedInventorySuffix}from'./remake41to50-immediate-suffix-floor-v146.mjs';
import{canonicalStateKey}from'./remake21to30-symmetry-floor-v139.mjs';
import{digest}from'./revised-preview-validation-v160.mjs';
export const encodeState=s=>String.fromCharCode(...s);
export const decodeState=s=>Uint8Array.from(s,c=>c.charCodeAt(0));
export function walkCompactSuffix(c,options={}){
 const floor=options.floor??5,maxStates=options.maxStates??1000000,maxMilliseconds=options.maxMilliseconds??60000;
 const result={status:'unknown',thresholdProven:false,floor,abstraction:'immediate-fifo-empty-queue-suffix-storage-only-v1',exploredStates:0,discoveredStates:0,attemptedTransitions:0,solvabilityValidated:false,pointerReplayValidated:false,timeValidated:false,relaxedRouteStored:false};
 if(![floor,maxStates,maxMilliseconds].every(n=>Number.isSafeInteger(n)&&n>0))return{...result,status:'invalid'};
 const norm=s=>normalizeCompletedInventorySuffix(c,s,options.normalize!==false).state,keyOf=options.symmetry===false?encodeState:s=>canonicalStateKey(s,c.groups);
 const initial=norm(c.initial),k0=keyOf(initial),dist=new Map([[k0,0]]),buckets=Array.from({length:floor},()=>[]),deadline=Date.now()+maxMilliseconds;
 buckets[0].push([k0,encodeState(initial)]);let stopped=null,shortcut=null;const edges=options.collect?new Map():null;
 const guard=()=>{if(Date.now()>=deadline)throw Error('deadline');};
 try{for(let cost=0;cost<floor;cost++)while(buckets[cost].length){
  guard();const[k,raw]=buckets[cost].pop();if(dist.get(k)!==cost)continue;const state=decodeState(raw);result.exploredStates++;result.maxExpandedCost=Math.max(result.maxExpandedCost??0,cost);
  if(state.every(v=>v===255)){shortcut=shortcut===null?cost:Math.min(shortcut,cost);if(!options.collect)return{...result,discoveredStates:dist.size,status:'relaxed-shortcut',relaxedNonClearingDrags:cost};}
  if(edges&&!edges.has(k))edges.set(k,new Set());
  forEachImmediateGeneratorGesture(c,state,(next,edge)=>{
   result.attemptedTransitions++;const nc=cost+edge;if(nc>=floor)return;const s=norm(next),nk=keyOf(s);if(edges)edges.get(k).add(edge+':'+nk);const prior=dist.get(nk);if(prior!==undefined&&prior<=nc)return;
   if(prior===undefined&&dist.size>=maxStates)throw Error('max-states');guard();dist.set(nk,nc);buckets[nc].push([nk,encodeState(s)]);
  },guard);
 }}catch(e){if(!['deadline','max-states'].includes(e.message))throw e;stopped=e.message;}
 return{...result,discoveredStates:dist.size,...(stopped?{termination:stopped}:shortcut!==null?{status:'relaxed-shortcut',relaxedNonClearingDrags:shortcut}:{status:'threshold-proven',thresholdProven:true,termination:'below-threshold-exhausted'}),...(options.collect?{distances:dist,edges}:{} )};
}
export function checkCompactSuffixFloor(level,api,options={}){
 const hash=digest(level);let c;try{c=compileGeneratorLevel(level,api);}catch(e){return{status:'unsupported',thresholdProven:false,sourceLevelSha256:hash,reason:e.message};}
 return{...walkCompactSuffix(c,options),sourceLevelSha256:hash};
}
