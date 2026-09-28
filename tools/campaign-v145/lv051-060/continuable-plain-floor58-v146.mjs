import assert from 'node:assert/strict';
import {compilePlainQueueLevel,normalizePlainQueueClears} from './generator-plain-clear-floor58-v146.mjs';
import {forEachGeneratorGesture,forEachOptionalSpawn} from './campaign-generator-axis-floor-v146.mjs';
import {canonicalStateKey} from './campaign-axis-key-floor-v146.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';

// Same qualified graph and zero-cost normalizer. Interrupted expansion requeues
// its entire parent: duplicate visited edges are harmless, unvisited edges must
// never be lost. Serialized states retain actual identities and parent actions.
export function continuePlainQueueFloor(level,api,options={},saved){
 const floor=options.floor??11,maxStates=options.maxStates??4000000,maxMilliseconds=options.maxMilliseconds??180000,maxExpansions=options.maxExpansions??Infinity;
 assert(Number.isSafeInteger(floor)&&floor>0);assert(Number.isSafeInteger(maxStates)&&maxStates>0);assert(Number.isSafeInteger(maxMilliseconds)&&maxMilliseconds>0);assert(maxExpansions===Infinity||Number.isSafeInteger(maxExpansions)&&maxExpansions>0);
 let c;try{c=compilePlainQueueLevel(level,api);}catch(e){return{result:{status:'unsupported',thresholdProven:false,reason:e.message},checkpoint:null};}
 const levelSha256=digest(level),keyOf=s=>canonicalStateKey(s,c.groups),deadline=Date.now()+maxMilliseconds;
 const init=()=>{const start=normalizePlainQueueClears(c,c.initial),key=keyOf(start.state);return{floor,levelSha256,distances:new Map([[key,0]]),nodes:[{...start,key,cost:0,parent:-1,next:-1}],front:0,back:0,pending:1,exploredStates:0,attemptedTransitions:0};};
 const q=saved??init();assert.equal(q.floor,floor);assert.equal(q.levelSha256,levelSha256);const {distances,nodes}=q;let stopped=null,expanded=0,nextLog=Date.now()+Number(options.logEveryMilliseconds??60000);
 const progress=()=>{let cursor=q.front;while(cursor!==-1&&distances.get(nodes[cursor].key)!==nodes[cursor].cost)cursor=nodes[cursor].next;return{lowestQueuedCost:cursor===-1?null:nodes[cursor].cost,pendingQueueRecords:q.pending,discoveredStates:distances.size,exploredStates:q.exploredStates,attemptedTransitions:q.attemptedTransitions};};
 const result=extra=>({status:'unknown',thresholdProven:false,floor,sourceLevelSha256:levelSha256,...progress(),abstraction:'continuable-optional-spawn-plain-atomic-clear-v146',solvabilityValidated:false,timeValidated:false,pointerReplayValidated:false,...extra});
 const routeTo=i=>{const rows=[];while(i!==-1){rows.push(nodes[i].actions);i=nodes[i].parent;}return rows.reverse().flat();};
 while(q.front!==-1){
  if(Date.now()>=deadline){stopped='deadline';break;}if(expanded>=maxExpansions){stopped='expansion-budget';break;}
  if(Date.now()>=nextLog){options.onProgress?.(progress());nextLog=Date.now()+Number(options.logEveryMilliseconds??60000);}
  const parent=q.front,node=nodes[parent];q.front=node.next;q.pending--;if(q.front===-1)q.back=-1;
  if(distances.get(node.key)!==node.cost)continue;q.exploredStates++;expanded++;
  if(node.state.every(v=>v===255))return{result:result({status:'relaxed-shortcut',relaxedNonClearingDrags:node.cost,relaxedActions:routeTo(parent),termination:'relaxed-completion'}),checkpoint:null};
  const visit=(i,v,edge,get)=>{
   q.attemptedTransitions++;const cost=node.cost+edge;if(cost>=floor)return;
   const raw=node.state.slice();raw[i]=v;const n=normalizePlainQueueClears(c,raw),key=keyOf(n.state),prior=distances.get(key);if(prior!==undefined&&prior<=cost)return;
   if(prior===undefined&&distances.size>=maxStates){stopped='max-states';return false;}if(Date.now()>=deadline){stopped='deadline';return false;}
   distances.set(key,cost);const id=nodes.length;nodes.push({...n,key,cost,parent,actions:[get(),...n.actions],next:-1});q.pending++;
   if(edge===0){nodes[id].next=q.front;q.front=id;if(q.back===-1)q.back=id;}else{if(q.back!==-1)nodes[q.back].next=id;else q.front=id;q.back=id;}
  };
  forEachGeneratorGesture(c,node.state,visit);if(!stopped)forEachOptionalSpawn(c,node.state,visit);
  if(stopped){nodes[parent].next=q.front;q.front=parent;q.pending++;if(q.back===-1)q.back=parent;break;}
 }
 return stopped?{result:result({termination:stopped}),checkpoint:q}:{result:result({status:'threshold-proven',thresholdProven:true,termination:'below-threshold-exhausted'}),checkpoint:null};
}
