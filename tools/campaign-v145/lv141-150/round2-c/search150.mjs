import {projectAdvancedFloor} from '../../../campaign31-200-advanced-floor-v145.mjs';
import {compileLevel,forEachGesture,clearCount} from '../../../remake21to30-mask-floor.mjs';
import {equivalentBlockGroups,canonicalStateKey} from '../../../remake21to30-symmetry-floor-v139.mjs';
let api;export function search150(level,apiArg,milliseconds=300,maxCost=10){api=apiArg;return search(level,milliseconds,maxCost);}
class Heap{
 a=[];push(n){const a=this.a;a.push(n);let i=a.length-1;while(i){const p=(i-1)>>1;if(a[p].score<=n.score)break;a[i]=a[p];i=p;}a[i]=n;}
 pop(){const a=this.a,r=a[0],n=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let k=i*2+1;if(k+1<a.length&&a[k+1].score<a[k].score)k++;if(a[k].score>=n.score)break;a[i]=a[k];i=k;}a[i]=n;}return r;}
}
function search(level,milliseconds,maxCost=10){
 const projection=projectAdvancedFloor(level,api),c=compileLevel(projection.level),groups=equivalentBlockGroups(c);
 const flips=new Map(level.flipDoors.map(g=>[g.id,g])),started=Date.now(),deadline=started+milliseconds,heap=new Heap(),seen=new Map();
 const allowed=(gate,n)=>gate&&n>=gate.frozen&&(!flips.has(gate.id)||(Boolean(flips.get(gate.id).initiallyOpen)!==Boolean(n%2)));
 const gateFor=(b,p,stage,n)=>{const g=b.poses[p].exits[stage];return allowed(g,n)?g:null;};
 const goal=c.totalClears;
 const gateByColor=new Map(c.gates.map(g=>[g.color,g])),phaseMemo=new Map();
 const canFinishPhases=chains=>{
  const key=chains.slice().sort().join(','),prior=phaseMemo.get(key);if(prior!==undefined)return prior;
  if(!chains.length)return true;const n=goal-chains.reduce((a,s)=>a+s.length,0),tried=new Set();
  for(let i=0;i<chains.length;i++){const chain=chains[i];if(tried.has(chain))continue;tried.add(chain);
   const color={b:'blue',g:'green',r:'red',y:'yellow'}[chain[0]];if(!allowed(gateByColor.get(color),n))continue;
   const next=chains.slice();if(chain.length>1)next[i]=chain.slice(1);else next.splice(i,1);
   if(canFinishPhases(next)){phaseMemo.set(key,true);return true;}
  }phaseMemo.set(key,false);return false;
 };
 const phasePossible=state=>canFinishPhases(Array.from(state,(v,i)=>v===255?'':c.blocks[i].layers.slice(v>>7).map(s=>s[0]).join('')).filter(Boolean));
 const score=(state,cost,n)=>{
  let dist=0;for(let i=0;i<state.length;i++){if(state[i]===255)continue;const b=c.blocks[i],p=state[i]&127,stage=state[i]>>7,x=p%c.W,y=Math.floor(p/c.W);let d=100;
   for(let q=0;q<b.poses.length;q++)if(b.poses[q]?.exits[stage])d=Math.min(d,Math.abs(x-q%c.W)+Math.abs(y-Math.floor(q/c.W)));dist+=d;
  }return (goal-n)*1000+cost*6+dist;
 };
 const initial={state:c.initial,cost:0,parent:null,drag:null,n:0};initial.score=score(initial.state,0,0);heap.push(initial);seen.set(canonicalStateKey(c.initial,groups),0);
 let explored=0,transitions=0,best=initial;
 while(heap.a.length&&Date.now()<deadline&&seen.size<350000){
  const node=heap.pop();if(seen.get(canonicalStateKey(node.state,groups))<node.cost)continue;explored++;
  if(node.n>best.n||node.n===best.n&&node.cost<best.cost)best=node;
  if(node.n===goal){const drags=[];for(let cur=node;cur.parent;cur=cur.parent)drags.push(cur.drag);return {status:'witness',drags:drags.reverse(),cost:node.cost,explored,discovered:seen.size,transitions,milliseconds:Date.now()-started};}
  forEachGesture(c,node.state,(i,v,edge,get)=>{
   transitions++;const cost=node.cost+edge;if(cost>maxCost)return;
   const b=c.blocks[i],stage=node.state[i]>>7,start=node.state[i]&127,drag=get();
   // Optional exits in the projection are NOT real exits. Check the actual
   // phase and stop at the first real open contact, including pointer-down.
   const poses=[start,...drag.path.map(([x,y])=>y*c.W+x)];let lastGate=null;
   for(let j=0;j<poses.length;j++){const gate=gateFor(b,poses[j],stage,node.n);if(gate){if(j!==poses.length-1||edge!==0||gate.side!==drag.exitSide)return;lastGate=gate;}}
   if(edge===0&&!lastGate)return;
   const state=node.state.slice();state[i]=v;if(edge===0&&!phasePossible(state))return;const key=canonicalStateKey(state,groups),prior=seen.get(key);if(prior!==undefined&&prior<=cost)return;
   seen.set(key,cost);const n=node.n+Number(edge===0),next={state,cost,parent:node,drag,n};next.score=score(state,cost,n);heap.push(next);
  });
 }
 return {status:'unknown',reason:Date.now()>=deadline?'deadline':seen.size>=350000?'state-limit':'subset-exhausted',bestClears:best.n,explored,discovered:seen.size,transitions,milliseconds:Date.now()-started};
}
