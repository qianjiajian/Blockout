// Restricted spatial proof graph for countdown curtains, two-layer bodies,
// numeric ice and rectangular axes. Full removals commute with later actions:
// they only free cells / lower counters. A countdown reveal replaces its whole
// forbidden region by a subset, even with axes; fixed-axis paths remain legal.
// Shell peels are never normalized. No generators, stars, keys, lifts or timers.
import assert from 'node:assert/strict';
import {compile as baseCompile,each,clearCount,key} from '../deliverables/remake31-200-v145-20260924/batches/lv061-070/author61-64/local-graph.mjs';
export {each,clearCount,key};
export function compile(level,api){
 api.validateLevel(level);
 const allowed=new Set(['id','x','y','shape','color','layers','frozen','shutterId','movementAxis']);
 for(const b of level.blocks){for(const k of Object.keys(b))assert(allowed.has(k),'Unsupported block '+k);if(b.movementAxis)assert.equal(b.shape.length,(1+Math.max(...b.shape.map(p=>p[0])))*(1+Math.max(...b.shape.map(p=>p[1]))));}
 return baseCompile(level);
}
export const stateOf=(c,snap)=>Uint16Array.from(c.blocks.map(b=>{const a=snap.blocks.find(x=>x.id===b.id);return !a?511:a.y*c.W+a.x|((b.layers.length-a.layers.length)<<7);}));
export function normalize(c,input){let s=input;const drags=[];for(;;){let found;each(c,s,(i,v,cost,get)=>{if(cost===0&&v===511){found={i,v,drag:get()};return false;}});if(!found)return {s,drags};s=s.slice();s[found.i]=found.v;drags.push(found.drag);}}
export function checkAxisFloor(level,api,{floor=11,maxStates=200000,maxMilliseconds=10000}={}){
 const result={thresholdProven:false,abstraction:'axis-countdown-optional-exit-monotone-clears-v172',floor};let c;
 try{assert([floor,maxStates,maxMilliseconds].every(n=>Number.isSafeInteger(n)&&n>0));c=compile(level,api);}catch(e){return {...result,status:'unsupported',reason:e.message};}
 const signature=b=>JSON.stringify({shape:b.shape,layers:b.layers,ice:b.ice,reveal:b.reveal,cover:b.cover?.id,axis:b.movementAxis});
 const groups=new Map();c.blocks.forEach((b,i)=>{const k=signature(b);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(i);});
 const canonical=s=>{const n=s.slice();for(const ids of groups.values()){const values=ids.map(i=>s[i]).sort((a,b)=>a-b);ids.forEach((id,i)=>n[id]=values[i]);}return key(n);};
 const start=Date.now(),initial=normalize(c,c.initial),nodes=[{...initial,cost:0,parent:-1,next:-1}],seen=new Map([[canonical(initial.s),0]]);let front=0,back=0,stop,explored=0,transitions=0;
 const route=i=>{const rows=[];while(i>=0){rows.push(nodes[i].drags);i=nodes[i].parent;}return rows.reverse().flat();};
 while(front!==-1){if(Date.now()-start>=maxMilliseconds){stop='deadline';break;}const ni=front,n=nodes[ni];front=n.next;if(front===-1)back=-1;if(seen.get(canonical(n.s))!==n.cost)continue;explored++;
  if(clearCount(c,n.s)===c.total)return {...result,status:'relaxed-shortcut',cost:n.cost,drags:route(ni),explored,states:seen.size,transitions,ms:Date.now()-start};
  each(c,n.s,(i,v,edge,get)=>{transitions++;const cost=n.cost+edge;if(cost>=floor)return;const moved=n.s.slice();moved[i]=v;const forced=normalize(c,moved),k=canonical(forced.s),old=seen.get(k);if(old!==undefined&&old<=cost)return;
   if(Date.now()-start>=maxMilliseconds){stop='deadline';return false;}if(seen.size>=maxStates){stop='max-states';return false;}seen.set(k,cost);const idx=nodes.length;nodes.push({...forced,drags:[get(),...forced.drags],cost,parent:ni,next:-1});
   if(edge===0){nodes[idx].next=front;front=idx;if(back===-1)back=idx;}else{if(back===-1)front=idx;else nodes[back].next=idx;back=idx;}
  });if(stop)break;
 }
 return {...result,status:stop?'unknown':'threshold-proven',thresholdProven:!stop,stop,explored,states:seen.size,transitions,ms:Date.now()-start};
}
