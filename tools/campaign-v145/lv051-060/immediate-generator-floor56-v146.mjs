/** Stronger lower-bound relaxation for the qualified single fixed generator.
 * All unit moves settle the actual queue immediately. Contact with an available
 * gate MAY be skipped; this adds gestures, never removes a real gesture.
 * We do not normalize clearable bodies: their removal can emit a new obstacle.
 * States retain every body, layer, queue head, axis, ice and reveal count.
 */
import assert from 'node:assert/strict';
import {compile as compileSearch,clearCount} from './campaign-generator-axis-search-v146.mjs';
import {assertAxisGeneratorDomain} from './campaign-generator-axis-domain-v146.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
const QUEUED=510,NONE=511,key=s=>String.fromCharCode(...s);
const overlaps=(a,b)=>a.some((v,i)=>v&b[i]);
export function stateFromSnapshot(c,s){return Uint16Array.from(c.blocks.map(b=>{const a=s.blocks.find(a=>a.id===b.id);return a?(a.y*c.W+a.x)|((b.layers.length-a.layers.length)<<7):s.queuedBlocks.some(a=>a.id===b.id)?QUEUED:NONE;}));}
export function compileImmediate(level,api){assertAxisGeneratorDomain(level,api);assert.equal(level.generators.length,1,'Only one fixed machine is qualified');const c=compileSearch(level);assert.deepEqual(c.initial,stateFromSnapshot(c,new api.PuzzleModel(level).snapshot()));return c;}
function occupied(c,s,excluded=-1){const cleared=clearCount(c,s),mask=[0,0,0];for(const v of c.covers)if(cleared<v.count)for(let k=0;k<3;k++)mask[k]|=v.mask[k];for(let i=0;i<s.length;i++)if(i!==excluded&&s[i]!==NONE&&s[i]!==QUEUED&&cleared>=c.blocks[i].reveal){const p=c.blocks[i].poses[s[i]&127];for(let k=0;k<3;k++)mask[k]|=p.mask[k];}return mask;}
function settle(c,s){for(;;){const i=c.queues[0].find(i=>s[i]===QUEUED);if(i===undefined)return s;const b=c.blocks[i];if(overlaps(b.poses[b.initial].mask,occupied(c,s)))return s;s[i]=b.initial;}}
export function eachImmediateOptional(c,s,visit){
 const cleared=clearCount(c,s);
 for(let i=0;i<s.length;i++){const b=c.blocks[i],v=s[i];if(v===NONE||v===QUEUED||cleared<b.reveal+b.ice)continue;const stage=v>>>7,nodes=[{s,parent:-1}],seen=new Set([key(s)]);
  const drag=(n,side)=>{const path=[];while(nodes[n].parent>=0){const p=nodes[n].s[i]&127;path.push([p%c.W,Math.floor(p/c.W)]);n=nodes[n].parent;}return{blockId:b.id,path:path.reverse(),...(side?{exitSide:side}:{})};};
  for(let n=0;n<nodes.length;n++){const cur=nodes[n].s,p=cur[i]&127,pose=b.poses[p],gate=pose.exits[stage];
   if(gate&&cleared>=(gate.frozen??0)){const next=cur.slice();next[i]=stage+1<b.layers.length?p|((stage+1)<<7):NONE;settle(c,next);if(visit(next,0,()=>drag(n,gate.side))===false)return;}
   // Optional contact is the explicit relaxation. Even a body initially at its
   // matching gate can move inward; later contact can also be passed over.
   if(n>0&&visit(cur,1,()=>drag(n))===false)return;
   const occ=occupied(c,cur,i);for(const to of pose.neighbors){if(overlaps(b.poses[to].mask,occ))continue;const next=cur.slice();next[i]=to|(stage<<7);settle(c,next);const k=key(next);if(seen.has(k))continue;seen.add(k);nodes.push({s:next,parent:n});}
  }
 }
}
export function projectImmediateRoute(level,drags,api){const c=compileImmediate(level,api),m=new api.PuzzleModel(structuredClone(level));m.startCountdown();const steps=[];for(const[n,d]of drags.entries()){const before=m.snapshot(),s=stateFromSnapshot(c,before);m.beginAction();for(const p of d.path)assert(m.moveBlockStep(d.blockId,...p));if(d.exitSide)assert(m.tryExit(d.blockId,d.exitSide).ok);assert(m.commitAction());const target=key(stateFromSnapshot(c,m.snapshot())),cost=m.snapshot().cleared>before.cleared?0:1;let included=false;eachImmediateOptional(c,s,(next,w)=>{if(w===cost&&key(next)===target){included=true;return false;}});assert(included,`Real gesture ${n+1} absent from relaxation`);steps.push({step:n+1,included,cost});}assert(m.snapshot().complete);return{passed:true,steps};}
export function checkImmediateGeneratorFloor(level,api,{floor=16,maxStates=3000000,maxMilliseconds=180000,weight=1000}={}){
 const r={status:'unknown',thresholdProven:false,floor,abstraction:'single-fixed-generator-immediate-spawn-optional-contact-axis-v146',sourceLevelSha256:digest(level),normalizesClears:false,discoveredStates:0,exploredStates:0,attemptedTransitions:0};
 if(![floor,maxStates,maxMilliseconds].every(n=>Number.isSafeInteger(n)&&n>0))return{...r,status:'invalid'};let c;try{c=compileImmediate(level,api);}catch(e){return{...r,status:'unsupported',reason:e.message};}
 const deadline=Date.now()+maxMilliseconds,nodes=[{s:c.initial,cost:0,parent:-1,clears:clearCount(c,c.initial)}],seen=new Map([[key(c.initial),0]]),open=[0];let stop;
 const score=i=>nodes[i].clears*weight-nodes[i].cost;
 const push=i=>{open.push(i);let a=open.length-1;while(a){const p=(a-1)>>1;if(score(open[p])>=score(open[a]))break;[open[p],open[a]]=[open[a],open[p]];a=p;}};
 const pop=()=>{const a=open[0],last=open.pop();if(open.length){open[0]=last;let p=0;while(p*2+1<open.length){let k=p*2+1;if(k+1<open.length&&score(open[k+1])>score(open[k]))k++;if(score(open[p])>=score(open[k]))break;[open[p],open[k]]=[open[k],open[p]];p=k;}}return a;};
 const route=i=>{const a=[];while(nodes[i].parent>=0){a.push(nodes[i].drag);i=nodes[i].parent;}return a.reverse();};
 while(open.length){if(Date.now()>=deadline){stop='deadline';break;}const ni=pop(),n=nodes[ni];if(seen.get(key(n.s))<n.cost)continue;r.exploredStates++;if(n.clears===c.total){r.discoveredStates=seen.size;return{...r,status:'relaxed-shortcut',relaxedNonClearingDrags:n.cost,relaxedRoute:route(ni)};}
  eachImmediateOptional(c,n.s,(s,cost,get)=>{if(Date.now()>=deadline){stop='deadline';return false;}r.attemptedTransitions++;const nc=n.cost+cost;if(nc>=floor)return;const k=key(s),prev=seen.get(k);if(prev!==undefined&&prev<=nc)return;if(seen.size>=maxStates){stop='max-states';return false;}seen.set(k,nc);nodes.push({s,cost:nc,parent:ni,clears:clearCount(c,s),drag:get()});push(nodes.length-1);});if(stop)break;
 }r.discoveredStates=seen.size;return stop?{...r,termination:stop}:{...r,status:'threshold-proven',thresholdProven:true,termination:'below-threshold-exhausted'};
}
