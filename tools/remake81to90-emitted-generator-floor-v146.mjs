/** Conditional identity quotient: a QUEUED slot is always fixed. Only already emitted or removed bodies with identical full mechanics may exchange positions/stages. No such body can ever become QUEUED again; FIFO head, future landing footprints and queue order therefore stay exactly unchanged. Only visited keys change; nodes and route IDs remain physical. */
import assert from 'node:assert/strict';
import {compileImmediate,key,projectImmediateRoute} from './remake81to90-immediate-generator-floor-v146.mjs';
import {eachImmediateFast as eachImmediateOptional} from './remake81to90-fast2-generator-domain-v146.mjs';
import {generatorStateFromSnapshot,generatorClearCount} from './remake81to90-generator-floor-v146.mjs';
import {canonicalStateKey} from './remake21to30-symmetry-floor-v139.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
const signature=b=>JSON.stringify({shape:[...b.shape].sort((a,b)=>a[0]-b[0]||a[1]-b[1]),layers:b.layers,ice:b.ice,revealAt:b.revealAt,owner:b.cover?.id??null});
export function compileSymmetricImmediate(level,api){
 const c=compileImmediate(level,api),groups=new Map();
 for(const[i,b]of c.blocks.entries()){const k=signature(b);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(i);}
 c.groups=[...groups.values()].filter(g=>g.length>1);return c;
}
export function canonicalGeneratorStateKey(c,state){
 const normalized=state.slice();
 for(const group of c.groups){const slots=group.filter(i=>state[i]!==254),values=slots.map(i=>state[i]).sort((a,b)=>a-b);for(let j=0;j<slots.length;j++)normalized[slots[j]]=values[j];}
 return key(normalized);
}
export function projectSymmetricRoute(level,drags,api){
 const c=compileSymmetricImmediate(level,api),projection=projectImmediateRoute(level,drags,api),m=new api.PuzzleModel(structuredClone(level));m.startCountdown();const raw=[],canonical=[];
 const record=()=>{const s=generatorStateFromSnapshot(c,m.snapshot());raw.push(key(s));canonical.push(canonicalGeneratorStateKey(c,s));};record();
 for(const d of drags){m.beginAction();for(const p of d.path)assert(m.moveBlockStep(d.blockId,...p));if(d.exitSide)assert(m.tryExit(d.blockId,d.exitSide).ok);assert(m.commitAction());record();}assert(m.snapshot().complete);
 return{...projection,levelSha256:digest(level),routeSha256:digest(drags),symmetryGroups:c.groups.map(g=>g.map(i=>c.blocks[i].id)),queuedSlotsAlwaysFixed:true,rawLabeledStateSequenceSha256:digest(raw),canonicalStateSequenceSha256:digest(canonical),nodesRetainOriginalLabels:true};
}
export function checkEmittedGeneratorFloor(level,api,{floor=11,maxStates=3000000,maxMilliseconds=180000,weight=1000,prove=true,orderSeed=0,symmetry=true,normalizeTail=true,onProgress}={}){
 const r={status:'unknown',thresholdProven:false,floor,abstraction:'lv87-88-90-dual-immediate-fixed-queued-slots-emitted-identity-quotient-v147',sourceLevelSha256:digest(level),normalizesClears:normalizeTail,normalizedBodies:0,canonicalVisitedKeys:symmetry,nodesRetainOriginalLabels:true,discoveredStates:0,exploredStates:0,attemptedTransitions:0};
 if(![floor,maxStates,maxMilliseconds].every(n=>Number.isSafeInteger(n)&&n>0))return{...r,status:'invalid'};let c;try{c=compileSymmetricImmediate(level,api);}catch(e){return{...r,status:'unsupported',reason:e.message};}
 r.symmetryGroups=c.groups.map(g=>g.map(i=>c.blocks[i].id));const keyOf=s=>symmetry?canonicalGeneratorStateKey(c,s):key(s);
 const started=Date.now(),deadline=started+maxMilliseconds,nodes=[{s:c.initial,cost:0,parent:-1,clears:generatorClearCount(c,c.initial)}],seen=new Map([[keyOf(c.initial),0]]),open=[0];let stop;
 const score=i=>nodes[i].clears*weight-nodes[i].cost;
 const push=i=>{open.push(i);let a=open.length-1;while(a){const p=(a-1)>>1;if(score(open[p])>=score(open[a]))break;[open[p],open[a]]=[open[a],open[p]];a=p;}};
 const pop=()=>{const a=open[0],last=open.pop();if(open.length){open[0]=last;let p=0;while(p*2+1<open.length){let k=p*2+1;if(k+1<open.length&&score(open[k+1])>score(open[k]))k++;if(score(open[p])>=score(open[k]))break;[open[p],open[k]]=[open[k],open[p]];p=k;}}return a;};
 const route=i=>{const a=[];while(nodes[i].parent>=0){a.push(nodes[i].drags??[nodes[i].drag]);i=nodes[i].parent;}return a.reverse().flat();};
 while(open.length){if(Date.now()>=deadline){stop='deadline';break;}const ni=pop(),n=nodes[ni];if(seen.get(keyOf(n.s))<n.cost)continue;r.exploredStates++;r.maxClearsSeen=Math.max(r.maxClearsSeen??0,n.clears);if(onProgress&&r.exploredStates%32768===0)onProgress({seen:seen.size,explored:r.exploredStates,maxClears:r.maxClearsSeen,edges:r.attemptedTransitions,ms:Date.now()-started});if(n.clears===c.totalClears){r.discoveredStates=seen.size;return{...r,status:prove?'relaxed-shortcut':'witness',relaxedNonClearingDrags:n.cost,relaxedRoute:route(ni),elapsedMilliseconds:Date.now()-started};}
  if(normalizeTail&&!n.s.includes(254)){const norm=normalizeFinishedQueue(c,n.s);if(norm.drags.length){r.normalizedBodies+=norm.drags.length;const k=keyOf(norm.state),prev=seen.get(k);if(prev===undefined||prev>n.cost){if(seen.size>=maxStates){stop='max-states';break;}seen.set(k,n.cost);nodes.push({s:norm.state,cost:n.cost,parent:ni,clears:generatorClearCount(c,norm.state),drags:norm.drags});push(nodes.length-1);}continue;}}
  eachImmediateOptional(c,n.s,(s,cost,get)=>{if(Date.now()>=deadline){stop='deadline';return false;}r.attemptedTransitions++;const nc=n.cost+cost;if(nc>=floor)return;const k=keyOf(s),prev=seen.get(k);if(prev!==undefined&&prev<=nc)return;if(seen.size>=maxStates){stop='max-states';return false;}seen.set(k,nc);nodes.push({s,cost:nc,parent:ni,clears:generatorClearCount(c,s),drag:get()});push(nodes.length-1);},{optionalExit:prove,orderSeed});if(stop)break;
 }r.discoveredStates=seen.size;return stop?{...r,termination:stop,elapsedMilliseconds:Date.now()-started}:{...r,status:prove?'threshold-proven':'exhausted',thresholdProven:prove,termination:'below-threshold-exhausted',elapsedMilliseconds:Date.now()-started};
}

export function normalizeFinishedQueue(c,initial){
 let state=initial;const drags=[];if(state.includes(254))return{state,drags,eligible:false};
 for(;;){let chosen,action;eachImmediateOptional(c,state,(next,cost,get)=>{if(cost!==0||!next.some((v,i)=>v===255&&state[i]!==255))return;chosen=next;action=get();return false;});if(!chosen)break;state=chosen;drags.push(action);}
 return{state,drags,eligible:true};
}
