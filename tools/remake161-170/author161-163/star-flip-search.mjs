import {compile as compileSimple} from './star-domain.mjs';
function sweepClear(c,b,p,side,occ){const[dx,dy]=side==='left'?[-1,0]:side==='right'?[1,0]:side==='top'?[0,-1]:[0,1];for(let step=1;step<=Math.max(c.W,c.H);step++){let inside=false;for(const[qx,qy]of b.shape){const x=p%c.W+qx+step*dx,y=Math.floor(p/c.W)+qy+step*dy;if(x<0||x>=c.W||y<0||y>=c.H)continue;inside=true;const q=y*c.W+x;if(occ[q>>>5]&(1<<(q&31)))return false;}if(!inside)return true;}return false;}
const NONE=511,overlap=(a,b)=>a.some((v,i)=>v&b[i]),stateKey=s=>String.fromCharCode(...s);
const clearCount=(c,s)=>s.reduce((n,v,i)=>n+(v===NONE?c.blocks[i].layers.length:v>>>7),0);

/** Witness generator only: exactly completed headless flip events between drags.
 * Never used as a GUI lower-bound graph: GUI permits delayed/interleaved flips.
 * Every returned witness is separately replayed by current PuzzleModel.
 */
export function searchFlipWitness(level,{maxCost=20,maxStates=100000,maxMilliseconds=1500,orderSeed=0}={}){
 const flips=new Map((level.flipDoors??[]).map(g=>[g.id,g.initiallyOpen]));
 const projected={...level,flipDoors:[],gates:[...level.gates,...(level.flipDoors??[]).map(({initiallyOpen,...g})=>g)]};
 const c=compileSimple({...projected,blocks:projected.blocks.map(({timedBombSeconds,...b})=>b),mechanismRules:"revised-2026-09-23-v1.4"}),start=Date.now(),nodes=[{s:c.initial,cost:0,clears:0,parent:-1}],seen=new Map([[stateKey(c.initial),0]]),open=[0];
 let explored=0,transitions=0,stop,bestNode=0;
 const score=i=>nodes[i].clears*1000-nodes[i].cost;
 function push(i){open.push(i);let k=open.length-1;while(k){const p=(k-1)>>1;if(score(open[p])>=score(open[k]))break;[open[p],open[k]]=[open[k],open[p]];k=p;}}
 function pop(){const first=open[0],last=open.pop();if(open.length){open[0]=last;let p=0;while(p*2+1<open.length){let k=p*2+1;if(k+1<open.length&&score(open[k+1])>score(open[k]))k++;if(score(open[p])>=score(open[k]))break;[open[p],open[k]]=[open[k],open[p]];p=k;}}return first;}
 function route(i){const out=[];while(nodes[i].parent>=0){out.push(nodes[i].drag);i=nodes[i].parent;}return out.reverse();}
 while(open.length){if(Date.now()-start>=maxMilliseconds){stop='deadline';break;}const ni=pop(),n=nodes[ni];if(seen.get(stateKey(n.s))<n.cost)continue;explored++;
  if(n.clears>nodes[bestNode].clears)bestNode=ni;
  if(n.clears===c.total)return{status:'witness',cost:n.cost,drags:route(ni),states:seen.size,explored,transitions,milliseconds:Date.now()-start};
  const occ=[0,0,0];n.s.forEach((v,i)=>{if(v!==NONE)c.blocks[i].poses[v&127].mask.forEach((x,k)=>occ[k]|=x);});
  for(let ii=0;ii<c.blocks.length;ii++){const i=(ii+orderSeed)%c.blocks.length,b=c.blocks[i],v=n.s[i];if(v===NONE)continue;const stage=v>>>7,pos=v&127,occupied=occ.map((v,k)=>v^b.poses[pos].mask[k]),parents=new Int16Array(c.W*c.H).fill(-1),q=[pos];parents[pos]=pos;
   const drag=(p,side)=>{const out=[];while(p!==pos){out.push([p%c.W,Math.floor(p/c.W)]);p=parents[p];}return{blockId:b.id,path:out.reverse(),...(side?{exitSide:side}:{})};};
   const add=(value,cost,p,side)=>{transitions++;const nc=n.cost+cost;if(nc>maxCost)return;const s=n.s.slice();s[i]=value;const k=stateKey(s),old=seen.get(k);if(old!==undefined&&old<=nc)return;if(seen.size>=maxStates){stop='max-states';return;}seen.set(k,nc);nodes.push({s,cost:nc,clears:clearCount(c,s),parent:ni,drag:drag(p,side)});push(nodes.length-1);};
   for(let qi=0;qi<q.length;qi++){const p=q[qi],pose=b.poses[p],g=pose.exits[stage],openGate=g&&n.clears>=(g.frozen??0)&&(!flips.has(g.id)||Boolean(flips.get(g.id))!==((Math.max(0,n.clears-(g.frozen??0)))%2===1))&&sweepClear(c,b,p,g.side,occupied);
    if(openGate){add(stage+1<b.layers.length?p|((stage+1)<<7):NONE,0,p,g.side);continue;}
    if(p!==pos)add(p|(stage<<7),1,p);
    for(const next of pose.neighbors)if(parents[next]===-1&&!overlap(b.poses[next].mask,occupied)){parents[next]=p;q.push(next);}
   }
   if(stop)break;
  }
  if(stop)break;
 }
 return{status:'unknown',states:seen.size,explored,transitions,milliseconds:Date.now()-start,stop:stop??'exhausted',maxClears:nodes[bestNode].clears,partialRoute:route(bestNode)};
}
