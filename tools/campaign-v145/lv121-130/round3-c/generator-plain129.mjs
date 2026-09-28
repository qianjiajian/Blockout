/**
 * Additional zero-cost normalization of the qualified optional-spawn graph.
 * This file does not change runtime or the shared graph/prover.
 *
 * Only a queue head with ONE layer is eligible. Its whole spawn footprint must
 * be free, and the spawned body must have a legal zero-reposition final exit.
 * We then perform BOTH edges (spawn, clear), never a forced pure spawn.
 * Net visible occupancy does not increase. Counters only advance. Revealing a
 * cover replaces its whole forbidden region with a subset of that region.
 * Later arrivals remain optional. Thus every other old path is still usable,
 * while the removed cargo's later moves can be omitted. Repeating these steps
 * preserves existence of a solution of each cost bound in this relaxation.
 * Queue shells are rejected, because peeling retains relocated occupancy.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {compileGeneratorLevel,forEachOptionalSpawn,forEachGeneratorGesture,
 normalizeGeneratorClears,generatorStateFromSnapshot,verifyFullGeneratorRouteProjection} from './generator-floor129.mjs';
import {canonicalStateKey} from '../../lv051-060/campaign-axis-key-floor-v146.mjs';
import {digest} from '../../../revised-preview-validation-v160.mjs';
const QUEUED=254,REMOVED=255;

export function compilePlainQueueLevel(level,api){
 const c=compileGeneratorLevel(level,api);
 for(const g of c.generators)for(const i of g.indices)assert.equal(c.blocks[i].layers.length,1,'Queued shells are outside plain-cargo normalization domain');
 return c;
}

export function normalizePlainQueueClears(c,input){
 let state=input,actions=[],atomicCargoClears=0;
 for(;;){
  const active=normalizeGeneratorClears(c,state);state=active.state;actions.push(...active.actions);
  let found;
  forEachOptionalSpawn(c,state,(i,v,_cost,getSpawn)=>{
   assert.equal(c.blocks[i].layers.length,1,'Queued shells are unsupported');
   const spawned=state.slice();spawned[i]=v;
   forEachGeneratorGesture(c,spawned,(j,end,cost,getClear)=>{
    if(j!==i||end!==REMOVED||cost!==0)return;
    found={i,spawn:getSpawn(),clear:getClear()};return false;
   });
   if(found)return false;
  });
  if(!found)return{state,actions,atomicCargoClears};
  state=state.slice();state[found.i]=REMOVED;
  actions.push(found.spawn,found.clear);atomicCargoClears++;
 }
}

export function checkPlainQueueFloor(level,api,options={}){
 const floor=options.floor??11,maxStates=options.maxStates??3000000,maxMilliseconds=options.maxMilliseconds??180000;
 let result={status:'unknown',thresholdProven:false,floor,exploredStates:0,discoveredStates:0,attemptedTransitions:0,
  abstraction:'fixed-queue-optional-spawn-plain-atomic-clear-v146',sourceLevelSha256:digest(level),
  solvabilityValidated:false,timeValidated:false,pointerReplayValidated:false};
 if(![floor,maxStates,maxMilliseconds].every(n=>Number.isSafeInteger(n)&&n>0))return{...result,status:'invalid'};
 let c;try{c=compilePlainQueueLevel(level,api);}catch(e){return{...result,status:'unsupported',reason:e.message};}
 const normalize=s=>normalizePlainQueueClears(c,s),keyOf=s=>canonicalStateKey(s,c.groups),start=normalize(c.initial),key=keyOf(start.state);
 const nodes=[{...start,key,cost:0,parent:-1,next:-1}],distances=new Map([[key,0]]),deadline=Date.now()+maxMilliseconds;
 let front=0,back=0,stopped=null;
 const routeTo=i=>{const rows=[];while(i!==-1){rows.push(nodes[i].actions);i=nodes[i].parent;}return rows.reverse().flat();};
 while(front!==-1){
  if(Date.now()>=deadline){stopped='deadline';break;}
  const parent=front,node=nodes[parent];front=node.next;if(front===-1)back=-1;
  if(distances.get(node.key)!==node.cost)continue;result.exploredStates++;
  if(node.state.every(v=>v===REMOVED))return{...result,discoveredStates:distances.size,status:'relaxed-shortcut',relaxedNonClearingDrags:node.cost,relaxedActions:routeTo(parent)};
  const visit=(i,v,edge,get)=>{
   result.attemptedTransitions++;const cost=node.cost+edge;if(cost>=floor)return;
   const raw=node.state.slice();raw[i]=v;const next=normalize(raw),key=keyOf(next.state),prior=distances.get(key);
   if(prior!==undefined&&prior<=cost)return;
   if(prior===undefined&&distances.size>=maxStates){stopped='max-states';return false;}
   if(Date.now()>=deadline){stopped='deadline';return false;}
   distances.set(key,cost);const index=nodes.length;
   nodes.push({...next,key,cost,parent,actions:[get(),...next.actions],next:-1});
   if(edge===0){nodes[index].next=front;front=index;if(back===-1)back=index;}
   else{if(back!==-1)nodes[back].next=index;else front=index;back=index;}
  };
  forEachGeneratorGesture(c,node.state,visit);if(!stopped)forEachOptionalSpawn(c,node.state,visit);if(stopped)break;
 }
 result.discoveredStates=distances.size;
 return stopped?{...result,termination:stopped}:{...result,status:'threshold-proven',thresholdProven:true,termination:'below-threshold-exhausted'};
}

/** Constructively maps a complete actual route into the normalized graph.
 * Removed-early bodies are skipped; every retained body matches the actual
 * pose/stage. Real arrivals are replayed unless that cargo cleared early.
 */
export function verifyPlainQueueRouteProjection(level,drags,api){
 try{
  const base=verifyFullGeneratorRouteProjection(level,drags,api);assert(base.valid,base.error);
  const c=compilePlainQueueLevel(level,api),m=new api.PuzzleModel(structuredClone(level));m.startCountdown();
  const initial=normalizePlainQueueClears(c,c.initial);let state=initial.state,total=0;
  const steps=[];
  const dominates=(normalized,real)=>{for(let i=0;i<real.length;i++)if(normalized[i]!==REMOVED)assert.equal(normalized[i],real[i],`Retained state mismatch ${c.blocks[i].id}`);};
  dominates(state,c.initial);
  for(const [step,d]of drags.entries()){
   const before=m.snapshot(),i=c.blocks.findIndex(b=>b.id===d.blockId);
   m.beginAction();for(const p of d.path)assert(m.moveBlockStep(d.blockId,...p));if(d.exitSide)assert(m.tryExit(d.blockId,d.exitSide).ok);assert(m.commitAction());
   const after=m.snapshot(),realEnd=generatorStateFromSnapshot(c,after),realCost=after.cleared===before.cleared?1:0;
   let cost=0,skipped=state[i]===REMOVED;
   if(!skipped&&state[i]!==realEnd[i]){
    cost=Infinity;forEachGeneratorGesture(c,state,(j,v,edge)=>{if(j===i&&v===realEnd[i])cost=Math.min(cost,edge);});
    assert(cost<=realCost,'Retained real gesture unavailable after normalization');state=state.slice();state[i]=realEnd[i];
   }
   const pending=new Set(c.blocks.map((_,j)=>j).filter(j=>state[j]===QUEUED&&realEnd[j]!==QUEUED&&realEnd[j]!==REMOVED));
   const arrivals=[];
   while(pending.size){let found;forEachOptionalSpawn(c,state,(j,v)=>{if(pending.has(j)&&v===realEnd[j]){found={j,v};return false;}});assert(found,'Real arrival cannot follow normalized queue');state=state.slice();state[found.j]=found.v;pending.delete(found.j);arrivals.push(c.blocks[found.j].id);}
   const normalized=normalizePlainQueueClears(c,state);state=normalized.state;dominates(state,realEnd);total+=cost;
   steps.push({step:step+1,blockId:d.blockId,realCost,projectedCost:cost,skippedEarlyClearedBody:skipped,arrivals,normalizationActions:normalized.actions});
  }
  assert(m.snapshot().complete&&state.every(v=>v===REMOVED));
  return{valid:true,sourceLevelSha256:digest(level),routeSha256:digest(drags),baseProjection:base,initialNormalization:initial.actions,steps,projectedNonClearingDrags:total,realNonClearingDrags:base.realNonClearingDrags,lowerBoundCertified:false};
 }catch(e){return{valid:false,error:e.message,lowerBoundCertified:false};}
}

