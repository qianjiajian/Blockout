import {compile,clearCount,key} from '../../../.codex-temp/remake21-30-quality/agent25-27/graph.mjs';
const NONE=511,overlap=(a,b)=>a.some((x,i)=>x&b[i]);
export function search(level,{maxCost=20,maxStates=50000,maxMilliseconds=400,orderSeed=0,weight=1000,goalClears=31,suffix=false}={}){
 const projected=structuredClone(level);projected.mechanismRules='revised-2026-09-23-v1.4';projected.gates.push(...projected.flipDoors.map(({initiallyOpen,...g})=>g));projected.flipDoors=[];
 const c=compile(projected),flips=new Map(level.flipDoors.map(g=>[g.id,g.initiallyOpen]));
 const initial=c.initial.slice();if(suffix)for(let i=0;i<initial.length;i++)if(c.blocks[i].reveal===0)initial[i]=NONE;
 const start=Date.now(),nodes=[{s:initial,cost:0,clears:clearCount(c,initial),parent:-1}],seen=new Map([[key(initial),0]]),open=[0];let explored=0,transitions=0,stop,best=0;
 const score=i=>nodes[i].clears*weight-nodes[i].cost;
 function push(i){open.push(i);let k=open.length-1;while(k){const p=(k-1)>>1;if(score(open[p])>=score(open[k]))break;[open[p],open[k]]=[open[k],open[p]];k=p;}}
 function pop(){const first=open[0],last=open.pop();if(open.length){open[0]=last;let p=0;while(p*2+1<open.length){let k=p*2+1;if(k+1<open.length&&score(open[k+1])>score(open[k]))k++;if(score(open[p])>=score(open[k]))break;[open[p],open[k]]=[open[k],open[p]];p=k;}}return first;}
 function route(i){const out=[];while(nodes[i].parent>=0){out.push(nodes[i].drag);i=nodes[i].parent;}return out.reverse();}
 while(open.length){if(Date.now()-start>=maxMilliseconds){stop='deadline';break;}const ni=pop(),n=nodes[ni];if(seen.get(key(n.s))<n.cost)continue;explored++;if(n.clears>nodes[best].clears)best=ni;
  if(n.clears>=goalClears)return{status:'witness',cost:n.cost,drags:route(ni),states:seen.size,explored,transitions,milliseconds:Date.now()-start,goalClears};
  // Witness-only parity dead-end pruning: both actual phases have synchronous
  // flips and a disjoint ordinary palette; never used for lower bounds.
  const phase=c.blocks.filter((b,i)=>n.s[i]!==NONE&&(n.clears>=14||b.reveal===0));
  const gs=phase.map(b=>[...level.gates,...level.flipDoors].find(g=>g.color===b.color)),fg=gs.filter(g=>flips.has(g.id));
  if(fg.length){const phases=fg.map(g=>Boolean(flips.get(g.id))!==((n.clears-(g.frozen??0))%2===1));if(phases.every(v=>v===phases[0])&&gs.length-fg.length<fg.length-(phases[0]?1:0))continue;}
  const occ=[0,0,0];for(const co of c.covers)if(n.clears<co.count)co.mask.forEach((v,i)=>occ[i]|=v);n.s.forEach((v,i)=>{if(v!==NONE&&n.clears>=c.blocks[i].reveal)c.blocks[i].poses[v&127].mask.forEach((x,k)=>occ[k]|=x);});
  for(let ii=0;ii<c.blocks.length;ii++){const i=(ii+orderSeed)%c.blocks.length,b=c.blocks[i],v=n.s[i];if(v===NONE||n.clears<b.reveal+b.ice)continue;const stage=v>>>7,pos=v&127,occupied=occ.map((v,k)=>v^b.poses[pos].mask[k]),parents=new Int16Array(c.W*c.H).fill(-1),q=[pos];parents[pos]=pos;
   const drag=(p,side)=>{const out=[];while(p!==pos){out.push([p%c.W,Math.floor(p/c.W)]);p=parents[p];}return{blockId:b.id,path:out.reverse(),...(side?{exitSide:side}:{})};};
   const add=(value,cost,p,side)=>{transitions++;const nc=n.cost+cost;if(nc>maxCost)return;const s=n.s.slice();s[i]=value;const k=key(s),old=seen.get(k);if(old!==undefined&&old<=nc)return;if(seen.size>=maxStates){stop='max-states';return;}seen.set(k,nc);nodes.push({s,cost:nc,clears:clearCount(c,s),parent:ni,drag:drag(p,side)});push(nodes.length-1);};
   for(let qi=0;qi<q.length;qi++){const p=q[qi],pose=b.poses[p],g=pose.exits[stage];let openGate=g&&n.clears>=(g.frozen??0)&&(!flips.has(g.id)||Boolean(flips.get(g.id))!==((n.clears-(g.frozen??0))%2===1));
    if(openGate){const [dx,dy]=g.side==='left'?[-1,0]:g.side==='right'?[1,0]:g.side==='top'?[0,-1]:[0,1];outer:for(let step=1;step<=6;step++)for(const [qx,qy]of b.shape){const x=p%c.W+qx+step*dx,y=Math.floor(p/c.W)+qy+step*dy;if(x<0||x>=c.W||y<0||y>=c.H)continue;const v=y*c.W+x;if(occupied[v>>>5]&(1<<(v&31))){openGate=false;break outer;}}}
    if(openGate){add(stage+1<b.layers.length?p|((stage+1)<<7):NONE,0,p,g.side);continue;}
    if(p!==pos)add(p|(stage<<7),1,p);
    for(const next of pose.neighbors)if(parents[next]===-1&&!overlap(b.poses[next].mask,occupied)){parents[next]=p;q.push(next);}
   }
   if(stop)break;
  }
  if(stop)break;
 }
 return{status:'unknown',states:seen.size,explored,transitions,milliseconds:Date.now()-start,stop:stop??'exhausted',maxClears:nodes[best].clears};
}
