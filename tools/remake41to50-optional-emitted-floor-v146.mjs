/** Complete optional-spawn inventory with monotone final-body clearing and emitted identity quotient. */
import{compileGeneratorLevel,forEachGeneratorGesture,forEachOptionalSpawn,normalizeGeneratorClears}from'./remake41to50-full-generator-floor-v146.mjs';

import{canonicalStateKey,equivalentBlockGroups}from'./remake21to30-symmetry-floor-v139.mjs';
import{digest}from'./revised-preview-validation-v160.mjs';
export const encodeState=s=>String.fromCharCode(...s);
export const decodeState=s=>Uint8Array.from(s,c=>c.charCodeAt(0));
/** The Q mask remains labeled. Only already-emitted mechanically equivalent
 * bodies are permuted. Queue head scans only Q; earlier emitted/removed IDs do
 * not affect any later spawn. Related states have identical occupancy/counters,
 * each future emission selects the same Q identity and the same anchor, and a
 * held gesture maps by its active identity permutation, including every settle.
 * Nodes retain original labeled worlds; only visited keys use the quotient.
 */
export function emittedInventoryKey(state,groups){
 const normalized=state.slice();for(const group of groups){const emitted=group.filter(i=>state[i]!==254),values=emitted.map(i=>state[i]).sort((a,b)=>a-b);for(let j=0;j<emitted.length;j++)normalized[emitted[j]]=values[j];}return encodeState(normalized);
}
export function walkOptionalEmitted(c,options={}){
 const floor=options.floor??5,maxStates=options.maxStates??1000000,maxMilliseconds=options.maxMilliseconds??60000;
 const result={status:'unknown',thresholdProven:false,floor,abstraction:'fixed-queue-optional-spawn-emitted-identity-monotone-clears-v1',exploredStates:0,discoveredStates:0,attemptedTransitions:0,solvabilityValidated:false,pointerReplayValidated:false,timeValidated:false,relaxedRouteStored:false};
 if(![floor,maxStates,maxMilliseconds].every(n=>Number.isSafeInteger(n)&&n>0))return{...result,status:'invalid'};
 const groups=equivalentBlockGroups(c);
 const norm=s=>options.normalize===false?s:normalizeGeneratorClears(c,s).state,keyOf=options.symmetry===false?encodeState:s=>emittedInventoryKey(s,groups);
 const initial=norm(c.initial),k0=keyOf(initial),dist=new Map([[k0,0]]),buckets=Array.from({length:floor},()=>[]),deadline=Date.now()+maxMilliseconds;
 buckets[0].push([k0,encodeState(initial)]);let stopped=null,shortcut=null;const edges=options.collect?new Map():null;
 const guard=()=>{if(Date.now()>=deadline)throw Error('deadline');};
 try{for(let cost=0;cost<floor;cost++)while(buckets[cost].length){
  guard();const[k,raw]=buckets[cost].pop();if(dist.get(k)!==cost)continue;const state=decodeState(raw);result.exploredStates++;result.maxExpandedCost=Math.max(result.maxExpandedCost??0,cost);
  if(state.every(v=>v===255)){shortcut=shortcut===null?cost:Math.min(shortcut,cost);if(!options.collect)return{...result,discoveredStates:dist.size,status:'relaxed-shortcut',relaxedNonClearingDrags:cost};}
  if(edges&&!edges.has(k))edges.set(k,new Set());
  const visit=(i,v,edge)=>{const next=state.slice();next[i]=v;
   result.attemptedTransitions++;const nc=cost+edge;if(nc>=floor)return;const s=norm(next),nk=keyOf(s);if(edges)edges.get(k).add(edge+':'+nk);const prior=dist.get(nk);if(prior!==undefined&&prior<=nc)return;
   if(prior===undefined&&dist.size>=maxStates)throw Error('max-states');guard();dist.set(nk,nc);buckets[nc].push([nk,encodeState(s)]);
  };
  forEachGeneratorGesture(c,state,visit);forEachOptionalSpawn(c,state,visit);
 }}catch(e){if(!['deadline','max-states'].includes(e.message))throw e;stopped=e.message;}
 return{...result,discoveredStates:dist.size,...(stopped?{termination:stopped}:shortcut!==null?{status:'relaxed-shortcut',relaxedNonClearingDrags:shortcut}:{status:'threshold-proven',thresholdProven:true,termination:'below-threshold-exhausted'}),...(options.collect?{distances:dist,edges}:{} )};
}
export function checkOptionalEmittedFloor(level,api,options={}){
 const hash=digest(level);let c;try{c=compileGeneratorLevel(level,api);}catch(e){return{status:'unsupported',thresholdProven:false,sourceLevelSha256:hash,reason:e.message};}
 return{...walkOptionalEmitted(c,options),sourceLevelSha256:hash};
}
