// Lv70-only identity quotient of the independently qualified automatic FIFO graph.
// Geometry and every movement/exit/arrival edge are delegated without alteration.
// Only complete equivalent opening-body identities are forgotten in visited keys.
// Actual representative states and paths retain their original IDs; queue bodies,
// including already emitted ones, are NEVER interchangeable.
import {compile,each,clearCount,normalizeExhausted,adaptation} from './validation-generator-domain.mjs';

const canonical=value=>JSON.stringify(order(value));
function order(value){if(Array.isArray(value))return value.map(order);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,order(value[k])]));return value;}
export function openingIdentityGroups(c){
 const bySignature=new Map();
 for(let i=0;i<c.blocks.length;i++){
  const b=c.blocks[i];if(b.queued||b.reveal!==0||b.cover)continue;
  const raw=c.level.blocks.find(raw=>raw.id===b.id),semantic={...raw};delete semantic.id;delete semantic.x;delete semantic.y;
  // Keep all other raw fields (even conservatively irrelevant annotations).
  semantic.shape=[...semantic.shape].sort((a,b)=>a[1]-b[1]||a[0]-b[0]);
  const signature=canonical({semantic,layers:b.layers,ice:b.ice,reveal:b.reveal,poses:b.poses});
  const group=bySignature.get(signature)??[];group.push(i);bySignature.set(signature,group);
 }
 return [...bySignature.values()].filter(g=>g.length>1);
}
export function quotientKey(state,groups){
 const values=Array.from(state);
 for(const group of groups){const sorted=group.map(i=>state[i]).sort((a,b)=>a-b);for(let j=0;j<group.length;j++)values[group[j]]=sorted[j];}
 return String.fromCharCode(...values);
}
export function checkSymmetryGeneratorFloor(level,api,{floor=11,maxStates=500000,maxMilliseconds=60000,orderSeed=0}={}){
 const result={thresholdProven:false,abstraction:'lv70-v191-full-fifo-equivalent-opening-identities-only',solvabilityValidated:false,timeValidated:false,pointerValidated:false,adaptation};
 if(![floor,maxStates,maxMilliseconds].every(n=>Number.isSafeInteger(n)&&n>0)||!Number.isSafeInteger(orderSeed)||orderSeed<0)return {...result,status:'invalid'};
 let c;try{c=compile(level,api);}catch(e){return {...result,status:'unsupported',reason:e.message};}
 const groups=openingIdentityGroups(c),key=s=>quotientKey(s,groups),start=Date.now(),initial=normalizeExhausted(c,c.initial);
 const nodes=[{...initial,cost:0,parent:-1,clears:clearCount(c,initial.s)}],seen=new Map([[key(initial.s),0]]),open=[0];let explored=0,transitions=0,stop;
 const score=i=>-nodes[i].cost;
 function push(i){open.push(i);let a=open.length-1;while(a){const p=(a-1)>>1;if(score(open[p])>=score(open[a]))break;[open[p],open[a]]=[open[a],open[p]];a=p;}}
 function pop(){const a=open[0],last=open.pop();if(open.length){open[0]=last;let p=0;while(p*2+1<open.length){let k=p*2+1;if(k+1<open.length&&score(open[k+1])>score(open[k]))k++;if(score(open[p])>=score(open[k]))break;[open[p],open[k]]=[open[k],open[p]];p=k;}}return a;}
 function route(i){const r=[];while(i>=0){r.push(nodes[i].drags);i=nodes[i].parent;}return r.reverse().flat();}
 const metadata=()=>({...result,floor,groups:groups.map(g=>g.map(i=>c.blocks[i].id)),groupSizes:groups.map(g=>g.length),queueIdentitiesMerged:false,states:seen.size,explored,transitions,ms:Date.now()-start});
 while(open.length){
  if(Date.now()-start>=maxMilliseconds){stop='deadline';break;}
  const ni=pop(),n=nodes[ni];if(seen.get(key(n.s))<n.cost)continue;explored++;
  if(n.clears===c.total)return {...metadata(),status:'relaxed-shortcut',thresholdProven:false,relaxedNonClearingDrags:n.cost,drags:route(ni)};
  each(c,n.s,(s,cost,getDrag)=>{
   if(Date.now()-start>=maxMilliseconds){stop='deadline';return false;}transitions++;
   const nc=n.cost+cost;if(nc>=floor)return;
   const forced=normalizeExhausted(c,s),k=key(forced.s),prev=seen.get(k);if(prev!==undefined&&prev<=nc)return;
   if(seen.size>=maxStates){stop='max-states';return false;}
   seen.set(k,nc);nodes.push({s:forced.s,cost:nc,parent:ni,clears:clearCount(c,forced.s),drags:[getDrag(),...forced.drags]});push(nodes.length-1);
  },{orderSeed});if(stop)break;
 }
 return {...metadata(),status:stop?'unknown':'threshold-proven',thresholdProven:!stop,stop};
}
