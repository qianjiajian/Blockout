import assert from 'node:assert/strict';
import {compileTerminal,normalizeTerminal} from './terminal-normalized-floor58-v147.mjs';
import {eachImmediateOptional} from './immediate-generator-floor56-v146.mjs';
import {clearCount} from './campaign-generator-axis-search-v146.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
const key=s=>String.fromCharCode(...s);
export function continueTerminalFloor(level,api,options={},saved){
 const {floor=11,maxStates=2000000,maxMilliseconds=120000,maxExpansions=Infinity,weight=1000,onProgress}=options;
 assert([floor,maxStates,maxMilliseconds].every(n=>Number.isSafeInteger(n)&&n>0));assert(maxExpansions===Infinity||Number.isSafeInteger(maxExpansions)&&maxExpansions>0);
 let c;try{c=compileTerminal(level,api);}catch(e){return{result:{status:'unsupported',thresholdProven:false,reason:e.message},checkpoint:null};}
 const hash=digest(level),start=Date.now(),deadline=start+maxMilliseconds;
 const init=()=>{const n=normalizeTerminal(c,c.initial);return{floor,weight,levelSha256:hash,nodes:[{s:n.state,cost:0,parent:-1,clears:clearCount(c,n.state),actions:n.actions}],seen:new Map([[key(n.state),0]]),open:[0],exploredStates:0,attemptedTransitions:0,elapsedMilliseconds:0};};
 const q=saved??init();assert.equal(q.levelSha256,hash);assert.equal(q.floor,floor);assert.equal(q.weight,weight);const{nodes,seen,open}=q;let stop,expanded=0,nextLog=start+60000;
 const score=i=>nodes[i].clears*weight-nodes[i].cost;
 const push=i=>{open.push(i);let a=open.length-1;while(a){const p=(a-1)>>1;if(score(open[p])>=score(open[a]))break;[open[p],open[a]]=[open[a],open[p]];a=p;}};
 const pop=()=>{const a=open[0],last=open.pop();if(open.length){open[0]=last;let p=0;while(p*2+1<open.length){let k=p*2+1;if(k+1<open.length&&score(open[k+1])>score(open[k]))k++;if(score(open[p])>=score(open[k]))break;[open[p],open[k]]=[open[k],open[p]];p=k;}}return a;};
 const route=i=>{const rows=[];while(i>=0){rows.push(nodes[i].actions);i=nodes[i].parent;}return rows.reverse().flat();};
 const result=extra=>({status:'unknown',thresholdProven:false,floor,sourceLevelSha256:hash,abstraction:'single-fixed-generator-terminal-final-body-normalization-continuable-v147',discoveredStates:seen.size,exploredStates:q.exploredStates,attemptedTransitions:q.attemptedTransitions,pending:open.length,elapsedMilliseconds:q.elapsedMilliseconds+Date.now()-start,...extra});
 while(open.length){
  if(Date.now()>=deadline){stop='deadline';break;}if(expanded>=maxExpansions){stop='expansion-budget';break;}
  if(Date.now()>=nextLog){onProgress?.(result({}));nextLog=Date.now()+60000;}
  const ni=pop(),n=nodes[ni];if(seen.get(key(n.s))<n.cost)continue;q.exploredStates++;expanded++;
  if(n.clears===c.total)return{result:result({status:'relaxed-shortcut',relaxedNonClearingDrags:n.cost,relaxedRoute:route(ni)}),checkpoint:null};
  eachImmediateOptional(c,n.s,(raw,cost,get)=>{
   if(Date.now()>=deadline){stop='deadline';return false;}q.attemptedTransitions++;const nc=n.cost+cost;if(nc>=floor)return;
   const normalized=normalizeTerminal(c,raw),s=normalized.state,k=key(s),prev=seen.get(k);if(prev!==undefined&&prev<=nc)return;
   if(prev===undefined&&seen.size>=maxStates){stop='max-states';return false;}
   seen.set(k,nc);nodes.push({s,cost:nc,parent:ni,clears:clearCount(c,s),actions:[get(),...normalized.actions]});push(nodes.length-1);
  });
  // An interruption can occur halfway through outgoing edges. Requeue the
  // whole parent; visited edges are harmless, missing edges would invalidate L.
  if(stop){push(ni);break;}
 }
 const r=result(stop?{termination:stop}:{status:'threshold-proven',thresholdProven:true,termination:'below-threshold-exhausted'});q.elapsedMilliseconds+=Date.now()-start;
 return{result:r,checkpoint:stop?q:null};
}
