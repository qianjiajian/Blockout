/** Narrow Lv87/88/90 bound: complete fixed inventory, body/gate ice and <=2 layers,
 * exactly two ordered fixed-space machines; no covers or other mechanisms.
 * Actual deterministic dispatch runs after EACH held unit move and clearing.
 * Gate contact is optional, a superset of all pointer grasps. No zero-cost
 * clear normalization is permitted because removal can dispatch an obstacle.
 * Every committed real gesture has the same unit trace/dispatch/state/cost.
 * Erasing clocks only adds successful traces. Exhausting all retained labeled
 * states below the floor is a lower bound, not solvability or GUI evidence.
 */
import assert from 'node:assert/strict';
import {compileGeneratorLevel,generatorStateFromSnapshot,generatorClearCount} from './remake81to90-generator-floor-v146.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
export const QUEUED=254,NONE=255,key=s=>String.fromCharCode(...s);
const overlaps=(a,b)=>a.some((v,i)=>v&b[i]);
export function compileImmediate(level,api){assert([87,88,90].includes(level.id));assert.equal(level.generators?.length,2);assert(!level.shutters?.length,'Covers require separate immediate-reveal qualification');const c=compileGeneratorLevel(level,api);assert(!c.restrictionProjection);assert.deepEqual(c.initial,generatorStateFromSnapshot(c,new api.PuzzleModel(level).snapshot()));return c;}
export function occupied(c,s,excluded=-1){const mask=[0,0,0];for(let i=0;i<s.length;i++)if(i!==excluded&&s[i]!==NONE&&s[i]!==QUEUED){const p=c.blocks[i].poses[s[i]&127];for(let k=0;k<3;k++)mask[k]|=p.mask[k];}return mask;}
export function settle(c,s){
 // Mirrors PuzzleModel.settleRevisedSpace(): one attempt per machine in array
 // order on each pass, repeat while any head is consumed; c has no shutters.
 let changed;do{changed=false;for(const machine of c.generators){const i=machine.indices.find(i=>s[i]===QUEUED);if(i===undefined)continue;const b=c.blocks[i];if(overlaps(b.poses[b.initial].mask,occupied(c,s)))continue;s[i]=b.initial;changed=true;}}while(changed);return s;
}
export function eachImmediateOptional(c,s,visit,{optionalExit=true,orderSeed=0}={}){
 const cleared=generatorClearCount(c,s);
 for(let ii=0;ii<s.length;ii++){const i=(ii+orderSeed)%s.length,b=c.blocks[i],v=s[i];if(v===NONE||v===QUEUED||cleared<b.ice)continue;const stage=v>>>7,nodes=[{s,parent:-1}],seen=new Set([key(s)]);
  const drag=(n,side)=>{const path=[];while(nodes[n].parent>=0){const p=nodes[n].s[i]&127;path.push([p%c.W-b.anchorOffset[0],Math.floor(p/c.W)-b.anchorOffset[1]]);n=nodes[n].parent;}return{blockId:b.id,path:path.reverse(),...(side?{exitSide:side}:{})};};
  for(let n=0;n<nodes.length;n++){const cur=nodes[n].s,p=cur[i]&127,pose=b.poses[p],gate=pose.exits[stage],exit=gate&&cleared>=(gate.frozen??0);
   if(exit){const next=cur.slice();next[i]=stage+1<b.layers.length?p|((stage+1)<<7):NONE;settle(c,next);if(visit(next,0,()=>drag(n,gate.side))===false)return;if(!optionalExit)continue;}
   if(n>0&&visit(cur,1,()=>drag(n))===false)return;
   const occ=occupied(c,cur,i);for(const to of pose.neighbors){if(overlaps(b.poses[to].mask,occ))continue;const next=cur.slice();next[i]=to|(stage<<7);settle(c,next);const k=key(next);if(seen.has(k))continue;seen.add(k);nodes.push({s:next,parent:n});}
  }
 }
}
export function assertModelState(c,s,snap){assert.deepEqual(s,generatorStateFromSnapshot(c,snap));assert.equal(snap.cleared,generatorClearCount(c,s));for(const[i,b]of c.blocks.entries()){const a=snap.blocks.find(a=>a.id===b.id);if(s[i]===NONE){assert(!a&&!snap.queuedBlocks.some(a=>a.id===b.id));continue;}if(s[i]===QUEUED){assert(!a&&snap.queuedBlocks.some(a=>a.id===b.id));continue;}assert(a);assert.deepEqual(a.layers,b.layers.slice(s[i]>>>7));assert.equal(a.frozen,Math.max(0,b.ice-snap.cleared));}for(const g of c.generators){const a=snap.generators.find(x=>x.id===g.id),head=g.indices.findIndex(i=>s[i]===QUEUED);assert.equal(a.head,head<0?g.indices.length:head);assert.equal(a.remaining,g.indices.filter(i=>s[i]===QUEUED).length);}for(const g of snap.gates)assert.equal(g.frozen,Math.max(0,(c.gates.find(x=>x.id===g.id).frozen??0)-snap.cleared));}
export function projectImmediateRoute(level,drags,api){const c=compileImmediate(level,api),m=new api.PuzzleModel(structuredClone(level));m.startCountdown();const steps=[];let unitSteps=0;assertModelState(c,c.initial,m.snapshot());for(const[n,d]of drags.entries()){const before=m.snapshot(),s=generatorStateFromSnapshot(c,before);let unit=s.slice();m.beginAction();for(const p of d.path){assert(m.moveBlockStep(d.blockId,...p));const i=c.blocks.findIndex(b=>b.id===d.blockId),b=c.blocks[i];unit[i]=(p[1]+b.anchorOffset[1])*c.W+p[0]+b.anchorOffset[0]|(unit[i]&128);settle(c,unit);assertModelState(c,unit,m.snapshot());unitSteps++;}if(d.exitSide)assert(m.tryExit(d.blockId,d.exitSide).ok);assert(m.commitAction());const target=key(generatorStateFromSnapshot(c,m.snapshot())),cost=m.snapshot().cleared>before.cleared?0:1;let included=false;eachImmediateOptional(c,s,(next,w)=>{if(w===cost&&key(next)===target){assertModelState(c,next,m.snapshot());included=true;return false;}});assert(included,`Real gesture ${n+1} absent from relaxation`);steps.push({step:n+1,included,cost});}assert(m.snapshot().complete);return{passed:true,unitSteps,steps};}
export function checkImmediateGeneratorFloor(level,api,{floor=11,maxStates=3000000,maxMilliseconds=180000,weight=1000,prove=true,orderSeed=0}={}){
 const r={status:'unknown',thresholdProven:false,floor,abstraction:'lv87-88-90-dual-fixed-immediate-spawn-optional-contact-v147',sourceLevelSha256:digest(level),normalizesClears:false,discoveredStates:0,exploredStates:0,attemptedTransitions:0};
 if(![floor,maxStates,maxMilliseconds].every(n=>Number.isSafeInteger(n)&&n>0))return{...r,status:'invalid'};let c;try{c=compileImmediate(level,api);}catch(e){return{...r,status:'unsupported',reason:e.message};}
 const started=Date.now(),deadline=started+maxMilliseconds,nodes=[{s:c.initial,cost:0,parent:-1,clears:generatorClearCount(c,c.initial)}],seen=new Map([[key(c.initial),0]]),open=[0];let stop;
 const score=i=>nodes[i].clears*weight-nodes[i].cost;
 const push=i=>{open.push(i);let a=open.length-1;while(a){const p=(a-1)>>1;if(score(open[p])>=score(open[a]))break;[open[p],open[a]]=[open[a],open[p]];a=p;}};
 const pop=()=>{const a=open[0],last=open.pop();if(open.length){open[0]=last;let p=0;while(p*2+1<open.length){let k=p*2+1;if(k+1<open.length&&score(open[k+1])>score(open[k]))k++;if(score(open[p])>=score(open[k]))break;[open[p],open[k]]=[open[k],open[p]];p=k;}}return a;};
 const route=i=>{const a=[];while(nodes[i].parent>=0){a.push(nodes[i].drag);i=nodes[i].parent;}return a.reverse();};
 while(open.length){if(Date.now()>=deadline){stop='deadline';break;}const ni=pop(),n=nodes[ni];if(seen.get(key(n.s))<n.cost)continue;r.exploredStates++;if(n.clears===c.totalClears){r.discoveredStates=seen.size;return{...r,status:prove?'relaxed-shortcut':'witness',relaxedNonClearingDrags:n.cost,relaxedRoute:route(ni),elapsedMilliseconds:Date.now()-started};}
  eachImmediateOptional(c,n.s,(s,cost,get)=>{if(Date.now()>=deadline){stop='deadline';return false;}r.attemptedTransitions++;const nc=n.cost+cost;if(nc>=floor)return;const k=key(s),prev=seen.get(k);if(prev!==undefined&&prev<=nc)return;if(seen.size>=maxStates){stop='max-states';return false;}seen.set(k,nc);nodes.push({s,cost:nc,parent:ni,clears:generatorClearCount(c,s),drag:get()});push(nodes.length-1);},{optionalExit:prove,orderSeed});if(stop)break;
 }r.discoveredStates=seen.size;return stop?{...r,termination:stop,elapsedMilliseconds:Date.now()-started}:{...r,status:prove?'threshold-proven':'exhausted',thresholdProven:prove,termination:'below-threshold-exhausted',elapsedMilliseconds:Date.now()-started};
}
