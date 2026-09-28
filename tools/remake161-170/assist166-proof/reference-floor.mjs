import assert from 'node:assert/strict';
import {compileSpatial,NONE,visible,active,occupied,cleared,key} from '../../remake111to120-spatial-floor-v147.mjs';
const overlap=(a,b)=>a.some((v,i)=>v&b[i]),add=(a,b)=>{for(let i=0;i<a.length;i++)a[i]|=b[i];};
export function compile(level,api){
 const c=compileSpatial(level,api);
 assert(c.blocks.every(b=>b.layers.length===1),'Only single-layer bodies qualified');
 assert(c.covers.filter(x=>x.skin==='lift').every(co=>co.members.every(i=>!c.blocks[i].ice)),'Lift bodies must have no ice');
 // Closed ordinary curtains are full obstacles, so their body batches cannot be
 // delayed by movable occupancy. Every lift is disjoint or contained; it cannot
 // appear through a closed curtain. This fixes curtain-ice reveal counts.
 for(const co of c.covers.filter(x=>x.skin!=='lift'))for(const other of c.covers.filter(x=>x!==co)){
  if(!overlap(co.mask,other.mask))continue;assert(other.skin==='lift');assert(other.mask.every((v,i)=>(v&co.mask[i])===v));
 }
 assert(c.initial.slice(c.N).every((v,j)=>c.covers[j].skin!=='lift'||v===NONE),'Initial lift arrivals not in domain');
 const groups=new Map();c.blocks.forEach((b,i)=>{const k=JSON.stringify([b.shape,b.layers,b.ice,b.cover?.id,b.movementAxis]);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(i);});c.groups=[...groups.values()].filter(g=>g.length>1);
 return c;
}
export function settle(c,s){const count=cleared(c,s);for(const co of c.covers){if(co.skin==='lift'||s[co.stateIndex]!==NONE||count<co.count)continue;const occ=occupied(c,s,-1,co);assert(co.members.every(i=>!overlap(c.blocks[i].poses[s[i]&127].mask,occ)),'Curtain reveal must be fixed');s[co.stateIndex]=co.count;}return s;}
function canArrive(c,s,co){if(s[co.stateIndex]!==NONE)return false;const occ=occupied(c,s,-1,co);for(const i of co.members){const m=c.blocks[i].poses[s[i]&127].mask;if(overlap(m,occ))return false;add(occ,m);}return true;}
export function each(c,s,visit,{arrivals=true}={}){
 if(arrivals)for(const co of c.covers)if(co.skin==='lift'&&canArrive(c,s,co)){const next=s.slice();next[co.stateIndex]=0;if(visit(next,0,()=>({arrival:co.id}))===false)return;}
 const count=cleared(c,s);
 for(let i=0;i<c.N;i++){const b=c.blocks[i];if(!active(c,s,i))continue;const poses=[s[i]&127],parents=[-1],seen=new Uint8Array(c.W*c.H),occ=occupied(c,s,i);seen[poses[0]]=1;
 const drag=(ni,side)=>{const path=[];while(parents[ni]>=0){const p=poses[ni];path.push([p%c.W,Math.floor(p/c.W)]);ni=parents[ni];}return{blockId:b.id,path:path.reverse(),...(side?{exitSide:side}:{})};};
 // No reveal is required during this relaxed held gesture. Lift arrivals may
 // be deferred until release; countdowns change only on the final clear.
 for(let ni=0;ni<poses.length;ni++){const p=poses[ni],pose=b.poses[p];for(const ex of pose.exits[0])if(count>=(ex.gate.frozen??0)){const next=s.slice();next[i]=NONE;settle(c,next);if(visit(next,0,()=>drag(ni,ex.side))===false)return;}
 if(ni){const cur=s.slice();cur[i]=p;if(visit(cur,1,()=>drag(ni))===false)return;}for(const to of pose.neighbors){if(seen[to]||overlap(b.poses[to].mask,occ))continue;seen[to]=1;poses.push(to);parents.push(ni);}
 }}
}
export function normalize(c,input){let s=input;const drags=[];for(;;){let choice;each(c,s,(next,cost,get)=>{if(cost===0){choice=next;drags.push(get());return false;}},{arrivals:false});if(!choice)return{s,drags};s=choice;}}
export function graphKey(c,s){s=s.slice();for(const g of c.groups){const vs=g.map(i=>s[i]).sort((a,b)=>a-b);g.forEach((i,j)=>s[i]=vs[j]);}return key(s);}
export function search(c,{floor=5,maxMilliseconds=8000,maxStates=180000}={}){
 const start=Date.now(),first=normalize(c,c.initial),nodes=[{...first,cost:0,parent:-1}],seen=new Map([[graphKey(c,first.s),0]]),queues=Array.from({length:floor},()=>[]);queues[0].push(0);let explored=0,transitions=0,maxClears=0,stop;
 const route=i=>{const r=[];while(i>=0){r.push(nodes[i].drags);i=nodes[i].parent;}return r.reverse().flat();};
 const result=(status,extra={})=>({status,thresholdProven:status==='threshold-proven',floor,explored,states:seen.size,transitions,maxClears,ms:Date.now()-start,stop,domain:'all-inventory-optional-lift-arrivals-fixed-curtain-ice-final-clear-normalization',...extra});
 for(let cost=0;cost<floor;cost++)while(queues[cost].length){if(Date.now()-start>=maxMilliseconds){stop='deadline';return result('unknown');}const ni=queues[cost].pop(),n=nodes[ni];if(seen.get(graphKey(c,n.s))!==cost)continue;explored++;maxClears=Math.max(maxClears,cleared(c,n.s));if(cleared(c,n.s)===c.totalClears)return result('relaxed-shortcut',{cost,drags:route(ni)});
 each(c,n.s,(next,delta,get)=>{transitions++;const nc=cost+delta;if(nc>=floor)return;const normal=normalize(c,next),k=graphKey(c,normal.s);if((seen.get(k)??Infinity)<=nc)return;if(seen.size>=maxStates){stop='max-states';return false;}if(Date.now()-start>=maxMilliseconds){stop='deadline';return false;}seen.set(k,nc);nodes.push({...normal,cost:nc,parent:ni,drags:[get(),...normal.drags]});queues[nc].push(nodes.length-1);});if(stop)return result('unknown');}
 return result('threshold-proven');
}
