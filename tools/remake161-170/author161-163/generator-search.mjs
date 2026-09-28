// Axis/generator candidate witness search. Production replay is authoritative.
// Includes immediate generator settling after EACH held unit step.
import assert from 'node:assert/strict';
import {compileAxisOpening as compileOpening} from '../../campaign-v145/lv051-060/campaign-generator-axis-domain-v146.mjs';
function sweepClear(c,b,p,side,occ){const[dx,dy]=side==='left'?[-1,0]:side==='right'?[1,0]:side==='top'?[0,-1]:[0,1];for(let step=1;step<=Math.max(c.W,c.H);step++){let inside=false;for(const[qx,qy]of b.shape){const x=p%c.W+qx+step*dx,y=Math.floor(p/c.W)+qy+step*dy;if(x<0||x>=c.W||y<0||y>=c.H)continue;inside=true;const q=y*c.W+x;if(occ[q>>>5]&(1<<(q&31)))return false;}if(!inside)return true;}return false;}
const QUEUED=510,NONE=511;
const overlap=(a,b)=>(a[0]&b[0])||(a[1]&b[1])||(a[2]&b[2]);
const key=s=>String.fromCharCode(...s);
export function compile(level){
 const queues=(level.generators??[]).map(g=>{assert(!g.trigger||g.trigger==='move');return g.queueBlockIds;});
 const queued=new Set(queues.flat()),opening={...level,generators:undefined,blocks:level.blocks.filter(b=>!queued.has(b.id))};
 const c=compileOpening(opening);c.level=level;
 for(const machine of level.generators??[])for(const id of machine.queueBlockIds){const raw=level.blocks.find(b=>b.id===id);assert(raw&&!raw.frozen&&!raw.shutterId);const ox=Math.min(...raw.shape.map(p=>p[0])),oy=Math.min(...raw.shape.map(p=>p[1]));const b={...raw,shape:raw.shape.map(([x,y])=>[x-ox,y-oy]),x:machine.spawn[0]+ox,y:machine.spawn[1]+oy};const single=compileOpening({...opening,blocks:[b],shutters:undefined});c.blocks.push({...single.blocks[0],queued:true,graphOffset:[ox,oy]});}
 c.queues=queues.map(q=>q.map(id=>c.blocks.findIndex(b=>b.id===id)));c.total=c.blocks.reduce((n,b)=>n+b.layers.length,0);c.initial=Uint16Array.from(c.blocks.map(b=>b.queued?QUEUED:b.initial));settle(c,c.initial);return c;
}
export function clearCount(c,s){let n=0;for(let i=0;i<s.length;i++)if(s[i]!==QUEUED)n+=s[i]===NONE?c.blocks[i].layers.length:s[i]>>>7;return n;}
function occupied(c,s,excluded=-1){const cleared=clearCount(c,s),occ=[0,0,0];for(const co of c.covers)if(cleared<co.count)for(let k=0;k<3;k++)occ[k]|=co.mask[k];for(let i=0;i<s.length;i++)if(i!==excluded&&s[i]!==NONE&&s[i]!==QUEUED&&cleared>=c.blocks[i].reveal){const mask=c.blocks[i].poses[s[i]&127].mask;for(let k=0;k<3;k++)occ[k]|=mask[k];}return occ;}
function settle(c,s){let changed=true;while(changed){changed=false;let occ=occupied(c,s);for(const queue of c.queues){const i=queue.find(i=>s[i]===QUEUED);if(i===undefined)continue;const b=c.blocks[i],mask=b.poses[b.initial].mask;if(!overlap(mask,occ)){s[i]=b.initial;changed=true;for(let k=0;k<3;k++)occ[k]|=mask[k];}}}return s;}
export function each(c,s,visit,{orderSeed=0}={}){
 const cleared=clearCount(c,s);
 for(let ii=0;ii<s.length;ii++){const i=(ii+orderSeed)%s.length,b=c.blocks[i],v=s[i];if(v===NONE||v===QUEUED||cleared<b.reveal+b.ice)continue;const stage=v>>>7,start=v&127,nodes=[{s,parent:-1}],seen=new Set([key(s)]);
  const drag=(ni,side)=>{const path=[];while(nodes[ni].parent>=0){const p=nodes[ni].s[i]&127;path.push([p%c.W-(b.graphOffset?.[0]??0),Math.floor(p/c.W)-(b.graphOffset?.[1]??0)]);ni=nodes[ni].parent;}return{blockId:b.id,path:path.reverse(),...(side?{exitSide:side}:{})};};
  for(let ni=0;ni<nodes.length;ni++){const cur=nodes[ni].s,p=cur[i]&127,pose=b.poses[p],gate=pose.exits[stage],exit=gate&&cleared>=(gate.frozen??0)&&sweepClear(c,b,p,gate.side,occupied(c,cur,i));
   if(exit){const next=cur.slice();next[i]=stage+1<b.layers.length?p|((stage+1)<<7):NONE;settle(c,next);if(visit(next,0,()=>drag(ni,gate.side))===false)return;continue;}
   if(ni>0&&visit(cur,1,()=>drag(ni))===false)return;
   const occ=occupied(c,cur,i);for(const to of pose.neighbors){if(overlap(b.poses[to].mask,occ))continue;const next=cur.slice();next[i]=to|(stage<<7);settle(c,next);const k=key(next);if(seen.has(k))continue;seen.add(k);nodes.push({s:next,parent:ni});}
  }
 }
}
export function search(level,{floor=Infinity,maxStates=60000,maxMilliseconds=2000,weight=1000,orderSeed=0}={}){
 const c=compile({...level,mechanismRules:'revised-2026-09-23-v1.4'}),start=Date.now(),nodes=[{s:c.initial,cost:0,parent:-1,clears:0}],seen=new Map([[key(c.initial),0]]),open=[0];let explored=0,transitions=0,stop,bestNode=0;
 const score=i=>nodes[i].clears*weight-nodes[i].cost;
 function push(i){open.push(i);let a=open.length-1;while(a){const p=(a-1)>>1;if(score(open[p])>=score(open[a]))break;[open[p],open[a]]=[open[a],open[p]];a=p;}}
 function pop(){const a=open[0],last=open.pop();if(open.length){open[0]=last;let p=0;while(p*2+1<open.length){let k=p*2+1;if(k+1<open.length&&score(open[k+1])>score(open[k]))k++;if(score(open[p])>=score(open[k]))break;[open[p],open[k]]=[open[k],open[p]];p=k;}}return a;}
 function route(i){const r=[];while(nodes[i].parent>=0){r.push(nodes[i].drag);i=nodes[i].parent;}return r.reverse();}
 while(open.length){if(Date.now()-start>=maxMilliseconds){stop='deadline';break;}const ni=pop(),n=nodes[ni];if(seen.get(key(n.s))<n.cost)continue;explored++;if(n.clears>nodes[bestNode].clears)bestNode=ni;if(n.clears===c.total)return{status:'witness',cost:n.cost,drags:route(ni),states:seen.size,explored,transitions,ms:Date.now()-start};
  each(c,n.s,(s,cost,getDrag)=>{if(Date.now()-start>=maxMilliseconds){stop='deadline';return false;}transitions++;const nc=n.cost+cost;if(nc>=floor)return;const k=key(s),prev=seen.get(k);if(prev!==undefined&&prev<=nc)return;if(seen.size>=maxStates){stop='max-states';return false;}seen.set(k,nc);nodes.push({s,cost:nc,parent:ni,clears:clearCount(c,s),drag:getDrag()});push(nodes.length-1);},{orderSeed});if(stop)break;
 }
 return{status:'unknown',states:seen.size,explored,transitions,ms:Date.now()-start,stop,maxClears:nodes[bestNode].clears,partialRoute:route(bestNode)};
}
