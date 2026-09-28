import assert from 'node:assert/strict';
import {compileImmediate,eachImmediateOptional} from './immediate-generator-floor56-v146.mjs';
import {clearCount} from './campaign-generator-axis-search-v146.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
const key=s=>String.fromCharCode(...s),QUEUED=510,NONE=511;
export function compileTerminal(level,api){
 assert.equal(level.shutters?.length??0,0,'No future hidden occupancy');
 assert(level.blocks.every(b=>b.shutterId===undefined),'No hidden bodies');
 return compileImmediate(level,api);
}
// Once ALL cargo is on the board, deleting a reachable final-layer body can
// only remove occupied cells and lower ice counters. There are no later spawns,
// hidden reveals, keys, flips, bombs or colored grids in this qualified domain.
// Other bodies keep their anchors. A peel is never normalized: it retains a
// body at a possibly different anchor. Before the last spawn this is a no-op.
export function normalizeTerminal(c,input){
 let s=input;const actions=[];if(s.includes(QUEUED))return{state:s,actions};
 for(;;){let chosen;
  eachImmediateOptional(c,s,(next,cost,get)=>{
   if(cost!==0)return;
   const removed=s.findIndex((v,i)=>v!==NONE&&next[i]===NONE);
   if(removed<0)return;assert.equal(c.blocks[removed].layers.length-(s[removed]>>>7),1);
   assert(next.every((v,i)=>i===removed||v===s[i]));chosen={state:next,drag:get()};return false;
  });
  if(!chosen)return{state:s,actions};s=chosen.state;actions.push(chosen.drag);
 }
}
export function checkTerminalNormalizedFloor(level,api,{floor=11,maxStates=1500000,maxMilliseconds=120000,weight=1000,onProgress}={}){
 const r={status:'unknown',thresholdProven:false,floor,abstraction:'single-fixed-generator-terminal-final-body-normalization-v147',sourceLevelSha256:digest(level),normalizesClears:'final-layer-only-after-all-cargo-emitted',discoveredStates:0,exploredStates:0,attemptedTransitions:0};
 if(![floor,maxStates,maxMilliseconds].every(n=>Number.isSafeInteger(n)&&n>0))return{...r,status:'invalid'};
 let c;try{c=compileTerminal(level,api);}catch(e){return{...r,status:'unsupported',reason:e.message};}
 const started=Date.now(),deadline=started+maxMilliseconds,initial=normalizeTerminal(c,c.initial),nodes=[{s:initial.state,cost:0,parent:-1,clears:clearCount(c,initial.state),actions:initial.actions}],seen=new Map([[key(initial.state),0]]),open=[0];let stop,nextLog=started+60000;
 const score=i=>nodes[i].clears*weight-nodes[i].cost;
 const push=i=>{open.push(i);let a=open.length-1;while(a){const p=(a-1)>>1;if(score(open[p])>=score(open[a]))break;[open[p],open[a]]=[open[a],open[p]];a=p;}};
 const pop=()=>{const a=open[0],last=open.pop();if(open.length){open[0]=last;let p=0;while(p*2+1<open.length){let k=p*2+1;if(k+1<open.length&&score(open[k+1])>score(open[k]))k++;if(score(open[p])>=score(open[k]))break;[open[p],open[k]]=[open[k],open[p]];p=k;}}return a;};
 const route=i=>{const a=[];while(i>=0){a.push(nodes[i].actions);i=nodes[i].parent;}return a.reverse().flat();};
 while(open.length){
  if(Date.now()>=deadline){stop='deadline';break;}
  if(Date.now()>=nextLog){onProgress?.({states:seen.size,explored:r.exploredStates,pending:open.length});nextLog=Date.now()+60000;}
  const ni=pop(),n=nodes[ni];if(seen.get(key(n.s))<n.cost)continue;r.exploredStates++;
  if(n.clears===c.total)return{...r,discoveredStates:seen.size,status:'relaxed-shortcut',relaxedNonClearingDrags:n.cost,relaxedRoute:route(ni),elapsedMilliseconds:Date.now()-started};
  eachImmediateOptional(c,n.s,(raw,cost,get)=>{
   if(Date.now()>=deadline){stop='deadline';return false;}r.attemptedTransitions++;
   const nc=n.cost+cost;if(nc>=floor)return;
   const normalized=normalizeTerminal(c,raw),s=normalized.state,k=key(s),prev=seen.get(k);if(prev!==undefined&&prev<=nc)return;
   if(seen.size>=maxStates){stop='max-states';return false;}
   seen.set(k,nc);nodes.push({s,cost:nc,parent:ni,clears:clearCount(c,s),actions:[get(),...normalized.actions]});push(nodes.length-1);
  });if(stop)break;
 }
 r.discoveredStates=seen.size;r.elapsedMilliseconds=Date.now()-started;
 return stop?{...r,termination:stop}:{...r,status:'threshold-proven',thresholdProven:true,termination:'below-threshold-exhausted'};
}
