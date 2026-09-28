import assert from 'node:assert/strict';
import {compileLevel,forEachGesture,clearCount} from './campaign-axis-key-graph-v146.mjs';
import {equivalentBlockGroups,canonicalStateKey,normalizeMonotoneClears} from './campaign-axis-key-floor-v146.mjs';

// Same qualified graph, quotient, monotone normalization, 0-1 queue and strict
// cost<floor acceptance as campaign-axis-key-floor-v146. Budget interruption
// requeues the partially expanded parent. Replaying already visited edges is
// harmless; this is essential to avoid losing its unenumerated outgoing edges.
export function continueAxisFloor(level,options={},saved){
 const floor=options.floor??21,maxStates=options.maxStates??6000000,maxMilliseconds=options.maxMilliseconds??300000,maxExpansions=options.maxExpansions??Infinity;
 assert(Number.isSafeInteger(floor)&&floor>0);assert(Number.isSafeInteger(maxStates)&&maxStates>0);assert(Number.isSafeInteger(maxMilliseconds)&&maxMilliseconds>0);
 let c;try{c=compileLevel(level);}catch(error){return{result:{status:'unsupported',thresholdProven:false,reason:error.message}};}
 const groups=equivalentBlockGroups(c),keyOf=s=>canonicalStateKey(s,groups),deadline=Date.now()+maxMilliseconds;
 const init=()=>{const initial=normalizeMonotoneClears(c,c.initial),key=keyOf(initial.state);return{floor,distances:new Map([[key,0]]),nodes:[{state:initial.state,key,cost:0,parent:-1,drags:initial.drags,next:-1}],front:0,back:0,pending:1,exploredStates:0,attemptedTransitions:0};};
 const q=saved??init();assert.equal(q.floor,floor);const {distances,nodes}=q;let stopped=null,expandedThisRun=0,nextLog=Date.now()+Number(options.logEveryMilliseconds??60000);
 const progress=()=>{let cursor=q.front;while(cursor!==-1&&distances.get(nodes[cursor].key)!==nodes[cursor].cost)cursor=nodes[cursor].next;return{lowestQueuedCost:cursor===-1?null:nodes[cursor].cost,pendingQueueRecords:q.pending,discoveredStates:distances.size,exploredStates:q.exploredStates,attemptedTransitions:q.attemptedTransitions};};
 const result=(extra)=>({status:'unknown',thresholdProven:false,floor,...progress(),abstraction:'campaign-mask96-axis-key-countdown-optional-exit-monotone-clears-v146',symmetryGroups:groups.map(g=>g.map(i=>c.blocks[i].id)),monotoneCountdownClears:true,solvabilityValidated:false,timeValidated:false,pointerReplayValidated:false,...extra});
 const routeTo=index=>{const segments=[];while(index!==-1){segments.push(nodes[index].drags);index=nodes[index].parent;}return segments.reverse().flat();};
 while(q.front!==-1){
  if(Date.now()>=deadline){stopped='deadline';break;}if(expandedThisRun>=maxExpansions){stopped='expansion-budget';break;}
  if(Date.now()>=nextLog){options.onProgress?.(progress());nextLog=Date.now()+Number(options.logEveryMilliseconds??60000);}
  const parent=q.front,node=nodes[parent];q.front=node.next;q.pending--;if(q.front===-1)q.back=-1;
  if(distances.get(node.key)!==node.cost)continue;
  q.exploredStates++;expandedThisRun++;
  if(clearCount(c,node.state)===c.totalClears)return{result:result({status:'relaxed-shortcut',relaxedNonClearingDrags:node.cost,relaxedRoute:routeTo(parent),termination:'relaxed-completion'}),checkpoint:null};
  forEachGesture(c,node.state,(index,value,edgeCost,getDrag)=>{
   q.attemptedTransitions++;const cost=node.cost+edgeCost;if(cost>=floor)return;
   const moved=node.state.slice();moved[index]=value;const forced=normalizeMonotoneClears(c,moved),state=forced.state,key=keyOf(state),prior=distances.get(key);
   if(prior!==undefined&&prior<=cost)return;
   if(prior===undefined&&distances.size>=maxStates){stopped='max-states';return false;}if(Date.now()>=deadline){stopped='deadline';return false;}
   distances.set(key,cost);const id=nodes.length;nodes.push({state,key,cost,parent,drags:[getDrag(),...forced.drags],next:-1});q.pending++;
   if(edgeCost===0){nodes[id].next=q.front;q.front=id;if(q.back===-1)q.back=id;}
   else{if(q.back!==-1)nodes[q.back].next=id;else q.front=id;q.back=id;}
  });
  if(stopped){nodes[parent].next=q.front;q.front=parent;q.pending++;if(q.back===-1)q.back=parent;break;}
 }
 return stopped?{result:result({termination:stopped}),checkpoint:q}:{result:result({status:'threshold-proven',thresholdProven:true,termination:'below-threshold-exhausted'}),checkpoint:null};
}
