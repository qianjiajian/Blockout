import {compileSpatial,NONE} from '../../continuation211-colored-witness.mjs';
import {canonicalExit} from '../formal-v2/proof-scheduled-route.mjs';
import {assertPlainProofDomain} from '../formal-v2/proof-plain.mjs';
import {digest} from './diversity-layout-factory.mjs';
import {auditCompleteReverseWitness} from './reverse-route-audit.mjs';
import {pruneKnownPlainWitness} from './design-known-route-prune.mjs';

/** One deterministic supplied-trace execution. At each committed world, scan
 * live body IDs in lexical order; a single-body held-coordinate BFS may find
 * one immediate clear. There are no alternative committed-world branches. */
export function greedyClearKnownPlainWitness(runtime,level,inputDrags,options={}){
 const {priorConstructionRaw=0,maxStates=10000,maxMicroStates=3000000,maxTransitions=10000000,maxMilliseconds=30000}=options;
 for(const[v,lo,hi,label]of [[priorConstructionRaw,0,10000,'prior raw'],[maxStates,1,10000,'raw'],[maxMicroStates,1,3000000,'micro'],[maxTransitions,1,10000000,'transitions'],[maxMilliseconds,1,30000,'milliseconds']])
  if(!Number.isSafeInteger(v)||v<lo||v>hi)throw Error('Invalid finite greedy '+label+' budget');
 const started=Date.now(),raw=new Set(),expanded=new Set(),events=[],drags=[];
 const stats={priorConstructionRaw,rawDiscoveredStates:0,rawExpandedStates:0,cumulativeRawStates:priorConstructionRaw,
  microDiscoveredStates:0,microExpandedStates:0,attemptedTransitions:0,skippedOriginalDrags:0,originalTraceDrags:inputDrags.length,
  committedWorldBranches:1,completeBoardSearchInvocations:0};
 const report=(status,extra={})=>({ok:false,status,formalReady:false,levelSha256:digest(level),inputRouteSha256:digest(inputDrags),
  budget:{priorConstructionRaw,maxStates,maxMicroStates,maxTransitions,maxMilliseconds},statistics:{...stats,elapsedMilliseconds:Date.now()-started},
  fullWorldAccounting:'Conservative sum of prior constructor raw count and all distinct labelled worlds on this single committed execution, including initial and every clear/parking.',
  rawWorldSha256s:[...raw],expandedWorldSha256s:[...expanded],events,lowerSearches:0,upperFullBoardSearches:0,...extra});
 const guard=()=>{if(Date.now()-started>=maxMilliseconds)throw Error('greedy-deadline');};
 const transition=()=>{guard();if(stats.attemptedTransitions>=maxTransitions)throw Error('greedy-max-transitions');stats.attemptedTransitions++;};
 const micro=()=>{guard();if(stats.microDiscoveredStates>=maxMicroStates)throw Error('greedy-max-micro-states');stats.microDiscoveredStates++;};
 try{
  assertPlainProofDomain(level);const original=auditCompleteReverseWitness(runtime,level,inputDrags);if(!original.valid)throw Error(original.error);
  const c=compileSpatial(level,runtime),model=new runtime.PuzzleModel(structuredClone(level));model.startCountdown();
  const charge=(expand=false)=>{guard();const snapshot=model.snapshot(),k=digest(snapshot.blocks.map(b=>({id:b.id,shape:b.shape,color:b.color,x:b.x,y:b.y})).sort((a,b)=>a.id.localeCompare(b.id)));
   if(!raw.has(k)){if(priorConstructionRaw+raw.size>=maxStates)throw Error('greedy-cumulative-max-raw-states');raw.add(k);stats.rawDiscoveredStates=raw.size;stats.cumulativeRawStates=priorConstructionRaw+raw.size;}
   if(expand){expanded.add(k);stats.rawExpandedStates=expanded.size;}return snapshot;};
  const state=()=>{const live=new Map(model.snapshot().blocks.map(b=>[b.id,b]));return c.blocks.map(b=>live.has(b.id)?live.get(b.id).y*c.W+live.get(b.id).x:NONE);};
  const overlap=(a,b)=>a.some((word,i)=>(word&b[i])!==0);
  const immediateClear=(s,i)=>{
   const b=c.blocks[i],occ=Array(c.words).fill(0);for(let j=0;j<c.N;j++)if(i!==j&&s[j]!==NONE)for(let w=0;w<c.words;w++)occ[w]|=c.blocks[j].poses[s[j]].mask[w];
   const parents=new Int16Array(c.W*c.H).fill(-1),queue=[s[i]];parents[s[i]]=s[i];micro();
   for(let at=0;at<queue.length;at++){
    guard();stats.microExpandedStates++;const p=queue[at],pose=b.poses[p];transition();
    if(pose.exits[0].length){const points=[];let q=p;while(q!==s[i]){points.push([q%c.W,Math.floor(q/c.W)]);q=parents[q];}
     return{blockId:b.id,path:points.reverse(),exitSide:pose.exits[0][0].side};}
    for(const next of pose.neighbors){transition();if(parents[next]>=0||overlap(b.poses[next].mask,occ))continue;micro();parents[next]=p;queue.push(next);}
   }return null;
  };
  const execute=(input,kind,originalIndex=null)=>{
   charge(true);if(priorConstructionRaw+raw.size>=maxStates)throw Error('greedy-cumulative-max-raw-states');
   const before=model.snapshot();model.beginAction();let exit=canonicalExit(runtime,model,input.blockId),path=[];
   if(!exit)for(const point of input.path){transition();const b=model.getBlock(input.blockId),previous=[b.x,b.y];
    if(Math.abs(point[0]-b.x)+Math.abs(point[1]-b.y)!==1||!model.moveBlockStep(input.blockId,...point))throw Error('Original fixed trace became illegal');
    path.push(point);exit=canonicalExit(runtime,model,input.blockId,previous);if(exit)break;
   }
   if(input.exitSide&&!exit)throw Error('Expected supplied clear is no longer canonical');
   if(exit&&!model.tryExit(input.blockId,exit).ok)throw Error('Canonical greedy clear rejected');
   if(!model.commitAction())throw Error('Greedy supplied gesture had no effect');
   const after=charge(),drag={blockId:input.blockId,path,...(exit?{exitSide:exit}:{})};
   if(after.moves!==before.moves+1||after.cleared-before.cleared!==Number(Boolean(exit)))throw Error('Greedy gesture accounting mismatch');
   drags.push(drag);events.push({kind,originalIndex,blockId:input.blockId,clear:Boolean(exit),appliedHeldSteps:path.length,
    earlyFirstContact:path.length<input.path.length||Boolean(exit)&&!input.exitSide,clearedAfter:after.cleared,remainingBodies:after.blocks.length});
  };
  const priority=c.blocks.map((b,i)=>({id:b.id,i})).sort((a,b)=>a.id.localeCompare(b.id));
  const closure=()=>{for(;;){charge(true);const s=state();let chosen;for(const x of priority)if(s[x.i]!==NONE){chosen=immediateClear(s,x.i);if(chosen)break;}
    if(!chosen)return;execute(chosen,'deterministic-immediate-clear');}};
  charge();closure();
  for(const[index,drag]of inputDrags.entries()){
   guard();if(!model.getBlock(drag.blockId)){stats.skippedOriginalDrags++;continue;}
   execute(drag,'existing-supplied-trace',index);closure();
  }
  if(!model.snapshot().complete)throw Error('Greedy fixed trace left inventory');
  const actual=auditCompleteReverseWitness(runtime,level,drags);if(!actual.valid)throw Error(actual.error);
  const pruned=pruneKnownPlainWitness(runtime,level,drags);
  return report('PLAIN_FIXED_TRACE_EARLY_CLEAR_REPLAYED',{ok:true,drags:pruned.drags,U:pruned.U,replay:pruned.replay,independentReplay:pruned.independentReplay,
    beforeU:original.U,beforeTotalDrags:inputDrags.length,unprunedGreedyDrags:drags,finalDeterministicPruning:pruned});
 }catch(error){return report('PLAIN_FIXED_TRACE_EARLY_CLEAR_STOPPED',{reason:error.message});}
}
