// Derived from immutable lv061-070 automatic graph; expanded structural domain tested separately.
// Qualified lower-bound graph retaining all bodies, layers, ice, curtain counts,
// queue order and fixed footprints. Every unit step settles real automatic FIFO
// dispatch in a full within-gesture state, so arrivals can block a later step.
// Fixed curtain reveal/ice ages derive from the total actual clear/peel count.
// Optional gate contact only adds gestures; each real held path has identical
// 0/1 reposition cost. No early-clear normalization is used. Dijkstra exhausts
// costs below the floor, and every interrupted search returns UNKNOWN.
import assert from 'node:assert/strict';
import {compile as compileOpening} from '../deliverables/remake31-200-v145-20260924/batches/lv061-070/author61-64/local-graph.mjs';
const QUEUED=510,NONE=511;
const overlap=(a,b)=>(a[0]&b[0])||(a[1]&b[1])||(a[2]&b[2]);
const key=s=>String.fromCharCode(...s);
function compileInternal(level){
 const queues=(level.generators??[]).map(g=>{assert(!g.trigger||g.trigger==='move');return g.queueBlockIds;});
 const queued=new Set(queues.flat()),opening={...level,generators:undefined,blocks:level.blocks.filter(b=>!queued.has(b.id))};
 const c=compileOpening(opening);c.level=level;
 for(const machine of level.generators??[])for(const id of machine.queueBlockIds){const raw=level.blocks.find(b=>b.id===id);assert(raw&&!raw.frozen&&!raw.shutterId);const b={...raw,x:machine.spawn[0],y:machine.spawn[1]};const single=compileOpening({...opening,blocks:[b],shutters:undefined});c.blocks.push({...single.blocks[0],queued:true});}
 c.queues=queues.map(q=>q.map(id=>c.blocks.findIndex(b=>b.id===id)));c.total=c.blocks.reduce((n,b)=>n+b.layers.length,0);c.initial=Uint16Array.from(c.blocks.map(b=>b.queued?QUEUED:b.initial));settle(c,c.initial);return c;
}
export function clearCount(c,s){let n=0;for(let i=0;i<s.length;i++)if(s[i]!==QUEUED)n+=s[i]===NONE?c.blocks[i].layers.length:s[i]>>>7;return n;}
function occupied(c,s,excluded=-1){const cleared=clearCount(c,s),occ=[0,0,0];for(const co of c.covers)if(cleared<co.count)for(let k=0;k<3;k++)occ[k]|=co.mask[k];for(let i=0;i<s.length;i++)if(i!==excluded&&s[i]!==NONE&&s[i]!==QUEUED&&cleared>=c.blocks[i].reveal){const mask=c.blocks[i].poses[s[i]&127].mask;for(let k=0;k<3;k++)occ[k]|=mask[k];}return occ;}
function settle(c,s){let changed=true;while(changed){changed=false;let occ=occupied(c,s);for(const queue of c.queues){const i=queue.find(i=>s[i]===QUEUED);if(i===undefined)continue;const b=c.blocks[i],mask=b.poses[b.initial].mask;if(!overlap(mask,occ)){s[i]=b.initial;changed=true;for(let k=0;k<3;k++)occ[k]|=mask[k];}}}return s;}
export function each(c,s,visit,{orderSeed=0,optionalExit=true}={}){
 const cleared=clearCount(c,s);
 for(let ii=0;ii<s.length;ii++){const i=(ii+orderSeed)%s.length,b=c.blocks[i],v=s[i];if(v===NONE||v===QUEUED||cleared<b.reveal+b.ice)continue;const stage=v>>>7,start=v&127,nodes=[{s,parent:-1}],seen=new Set([key(s)]);
  const drag=(ni,side)=>{const path=[];while(nodes[ni].parent>=0){const p=nodes[ni].s[i]&127;path.push([p%c.W,Math.floor(p/c.W)]);ni=nodes[ni].parent;}return{blockId:b.id,path:path.reverse(),...(side?{exitSide:side}:{})};};
  for(let ni=0;ni<nodes.length;ni++){const cur=nodes[ni].s,p=cur[i]&127,pose=b.poses[p],gate=pose.exits[stage],exit=gate&&cleared>=(gate.frozen??0);
   if(exit){const next=cur.slice();next[i]=stage+1<b.layers.length?p|((stage+1)<<7):NONE;settle(c,next);if(visit(next,0,()=>drag(ni,gate.side))===false)return;if(!optionalExit)continue;}
   if(ni>0&&visit(cur,1,()=>drag(ni))===false)return;
   const occ=occupied(c,cur,i);for(const to of pose.neighbors){if(overlap(b.poses[to].mask,occ))continue;const next=cur.slice();next[i]=to|(stage<<7);settle(c,next);const k=key(next);if(seen.has(k))continue;seen.add(k);nodes.push({s:next,parent:ni});}
  }
 }
}
// Only after every queue has emitted its last body can free removals commute:
// no future spatial arrivals remain; countdown masks/ice are monotone. Never
// normalize before that point, and never normalize a shell peel.
export function normalizeExhausted(c,input){
 if(input.includes(QUEUED))return {s:input,drags:[]};
 let s=input;const drags=[];for(;;){let found;each(c,s,(next,cost,get)=>{if(cost===0&&next.filter(v=>v===NONE).length>s.filter(v=>v===NONE).length){found={next,drag:get()};return false;}});if(!found)return {s,drags};s=found.next;drags.push(found.drag);}
}
function search(level,{floor=11,maxStates=500000,maxMilliseconds=60000,orderSeed=0}={}){
 const c=compileInternal(level),start=Date.now(),initial=normalizeExhausted(c,c.initial),nodes=[{...initial,cost:0,parent:-1,clears:clearCount(c,initial.s)}],seen=new Map([[key(initial.s),0]]),open=[0];let explored=0,transitions=0,stop;
 const score=i=>-nodes[i].cost;
 function push(i){open.push(i);let a=open.length-1;while(a){const p=(a-1)>>1;if(score(open[p])>=score(open[a]))break;[open[p],open[a]]=[open[a],open[p]];a=p;}}
 function pop(){const a=open[0],last=open.pop();if(open.length){open[0]=last;let p=0;while(p*2+1<open.length){let k=p*2+1;if(k+1<open.length&&score(open[k+1])>score(open[k]))k++;if(score(open[p])>=score(open[k]))break;[open[p],open[k]]=[open[k],open[p]];p=k;}}return a;}
 function route(i){const r=[];while(i>=0){r.push(nodes[i].drags);i=nodes[i].parent;}return r.reverse().flat();}
 while(open.length){if(Date.now()-start>=maxMilliseconds){stop='deadline';break;}const ni=pop(),n=nodes[ni];if(seen.get(key(n.s))<n.cost)continue;explored++;if(n.clears===c.total)return{status:'relaxed-shortcut',thresholdProven:false,relaxedNonClearingDrags:n.cost,drags:route(ni),states:seen.size,explored,transitions,ms:Date.now()-start};
  each(c,n.s,(s,cost,getDrag)=>{if(Date.now()-start>=maxMilliseconds){stop='deadline';return false;}transitions++;const nc=n.cost+cost;if(nc>=floor)return;const forced=normalizeExhausted(c,s),k=key(forced.s),prev=seen.get(k);if(prev!==undefined&&prev<=nc)return;if(seen.size>=maxStates){stop='max-states';return false;}seen.set(k,nc);nodes.push({s:forced.s,cost:nc,parent:ni,clears:clearCount(c,forced.s),drags:[getDrag(),...forced.drags]});push(nodes.length-1);},{orderSeed});if(stop)break;
 }
 return{status:stop?'unknown':'threshold-proven',thresholdProven:!stop,states:seen.size,explored,transitions,ms:Date.now()-start,stop};
}
export function stateOf(c,snapshot){
 const queued=new Set(snapshot.queuedBlocks.map(b=>b.id));
 return Uint16Array.from(c.blocks.map(def=>{const b=snapshot.blocks.find(b=>b.id===def.id);return queued.has(def.id)?QUEUED:!b?NONE:(b.y*c.W+b.x)|((def.layers.length-b.layers.length)<<7);}));
}
export function compile(level,api){
 api.validateLevel(level);assert(level.id>=131&&level.id<=140);assert.equal(level.mechanismRules,'revised-2026-09-23-v1.4');assert(level.generators?.length>=1&&level.generators.length<=4);
 assert(level.generators.every(g=>g.trigger!=='time'&&g.intervalSeconds===undefined&&g.initialDelaySeconds===undefined));
 for(const k of ['blocked','seams','flipDoors','coloredGrids','elevators','conveyors'])assert(!level[k]?.length,'Unsupported '+k);
 for(const b of level.blocks)for(const k of ['movementAxis','keyId','lockedBy','lockCount','timedBombSeconds','star','rotationBadge'])assert(b[k]===undefined||b[k]===false,'Unsupported '+k);
 assert((level.shutters??[]).every(s=>!s.skin||s.skin==='shutter'));
 const c=compileInternal(level);assert.equal([...stateOf(c,new api.PuzzleModel(level).snapshot())].join(','),[...c.initial].join(','));return c;
}
export function checkAutomaticGeneratorFloor(level,api,options={}){
 const {floor=11,maxStates=500000,maxMilliseconds=60000}=options,result={thresholdProven:false,abstraction:'131-140-all-inventory-multiple-automatic-fifo-optional-contact-v172',solvabilityValidated:false,timeValidated:false,pointerValidated:false};
 if(![floor,maxStates,maxMilliseconds].every(n=>Number.isSafeInteger(n)&&n>0))return {...result,status:'invalid'};
 try{compile(level,api);}catch(e){return {...result,status:'unsupported',reason:e.message};}
 return {...result,...search(level,{floor,maxStates,maxMilliseconds})};
}
