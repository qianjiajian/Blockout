import assert from 'node:assert/strict';
import fs from 'node:fs';
import {compileLevel,clearCount} from './remake21to30-mask-floor.mjs';
import {engine} from '../deliverables/remake31-40-v146-20260924/agent31-34/fast-floor.mjs';
import {digest} from './revised-preview-validation-v160.mjs';

// The already qualified residual multiset quotient, with serializable search
// state. Dynamic descriptor IDs and their tables travel with the checkpoint.
// A parent is retained until EVERY outgoing edge has been considered. An
// interrupted parent may repeat visited edges, but can never lose successors.
export function continueResidualFloor(level,options={},saved=null){
 const floor=options.floor??16,maxStates=options.maxStates??15000000,maxMilliseconds=options.maxMilliseconds??180000;
 const maxTransitions=options.maxTransitions??Infinity;
 for(const n of [floor,maxStates,maxMilliseconds])assert(Number.isSafeInteger(n)&&n>0);
 assert(maxTransitions===Infinity||Number.isSafeInteger(maxTransitions)&&maxTransitions>0);
 const bindings=Object.fromEntries(['tools/continue-residual31to40-v147.mjs','tools/remake21to30-mask-floor.mjs','deliverables/remake31-40-v146-20260924/agent31-34/fast-floor.mjs'].map(p=>[p,digest(fs.readFileSync(p))]));
 let c;try{c=compileLevel(level);}catch(error){return {result:{status:'unsupported',thresholdProven:false,reason:error.message},checkpoint:null};}
 const levelSha256=digest(level),e=engine(c),started=Date.now(),deadline=started+maxMilliseconds;
 const q=saved??{schemaVersion:1,levelSha256,bindings,floor,ids:new Map(),tables:new Map(),nextId:1,distances:new Map(),layers:Array.from({length:floor},()=>[]),cost:0,at:0,explored:0,transitions:0,totalMilliseconds:0};
 assert.equal(q.schemaVersion,1);assert.equal(q.levelSha256,levelSha256);assert.equal(q.floor,floor);assert.deepEqual(q.bindings,bindings);
 const signatureId=signature=>{if(!q.ids.has(signature)){assert(q.nextId<65536);q.ids.set(signature,q.nextId++);}return q.ids.get(signature);};
 const table=C=>{if(q.tables.has(C))return q.tables.get(C);const t=c.blocks.map(b=>b.layers.map((_,stage)=>signatureId(JSON.stringify({shape:[...b.shape].sort((a,z)=>a[0]-z[0]||a[1]-z[1]),layers:b.layers.slice(stage),...(C>=b.revealAt+b.ice?{active:true}:{ice:b.ice,revealAt:b.revealAt,owner:b.cover?.id??null})}))));q.tables.set(C,t);return t;};
 const keyOf=s=>{const C=clearCount(c,s),t=table(C),pieces=[];for(let i=0;i<s.length;i++)if(s[i]!==255)pieces.push(String.fromCharCode(t[i][s[i]>>7],s[i]&127));pieces.sort();return String.fromCharCode(C)+pieces.join('');};
 if(!saved){const s=e.normalize(c.initial),k=keyOf(s);q.distances.set(k,0);q.layers[0].push({s,k});}
 let stop=null,lastLog=started,sessionTransitions=0;
 const progress=()=>({cost:q.cost,explored:q.explored,states:q.distances.size,queued:q.layers[q.cost]?.length-q.at});
 const finish=extra=>{q.totalMilliseconds+=Date.now()-started;return {result:{status:'unknown',thresholdProven:false,floor,sourceLevelSha256:levelSha256,qualificationInputs:bindings,abstraction:'continuable-qualified-residual-physical-multiset-v147',exploredStates:q.explored,discoveredStates:q.distances.size,attemptedTransitions:q.transitions,elapsedMilliseconds:q.totalMilliseconds,lowestQueuedCost:q.cost,solvabilityValidated:false,timeValidated:false,pointerReplayValidated:false,...extra},checkpoint:extra.status==='threshold-proven'||extra.status==='relaxed-shortcut'?null:q};};
 for(;q.cost<floor;q.cost++,q.at=0){const layer=q.layers[q.cost];
  for(;q.at<layer.length;){
   if(Date.now()>=deadline)return finish({termination:'deadline'});
   if(Date.now()-lastLog>=30000){options.onProgress?.(progress());lastLog=Date.now();}
   const {s,k}=layer[q.at];
   if(q.distances.get(k)!==q.cost){layer[q.at++]=null;continue;}
   if(s.every(v=>v===255))return finish({status:'relaxed-shortcut',relaxedNonClearingDrags:q.cost,termination:'relaxed-completion',routeNotRetained:true});
   e.each(s,(i,v,edge)=>{
    if(sessionTransitions>=maxTransitions){stop='transition-budget';return false;}
    sessionTransitions++;q.transitions++;const nc=q.cost+edge;if(nc>=floor)return;
    const raw=s.slice();raw[i]=v;const n=e.normalize(raw),key=keyOf(n),prior=q.distances.get(key);if(prior!==undefined&&prior<=nc)return;
    if(prior===undefined&&q.distances.size>=maxStates){stop='max-states';return false;}
    if(Date.now()>=deadline){stop='deadline';return false;}
    q.distances.set(key,nc);q.layers[nc].push({s:n,k:key});
   });
   if(stop)return finish({termination:stop});
   q.explored++;layer[q.at++]=null;
  }
  q.layers[q.cost]=[];
 }
 return finish({status:'threshold-proven',thresholdProven:true,termination:'below-threshold-exhausted'});
}
