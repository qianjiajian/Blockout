import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi} from '../../remake21to30-v120.mjs';
import {compile,each,clearCount,key,search} from '../../../deliverables/remake31-200-v145-20260924/batches/lv061-070/author61-64/local-graph.mjs';
const dir='deliverables/remake31-200-v145-20260924/batches/lv061-070/author61-64',file=process.argv[2],data=JSON.parse(fs.readFileSync(file)),{level}=data,{api}=await loadApi(),c=compile(level);
const initial=search(level,{goalClears:8,maxStates:500000,maxMilliseconds:10000});assert(initial.status==='witness');
let drags=initial.drags;
const stateOf=()=>{const r=api.replayRevisedRoute(level,drags);assert(r.valid);const snap=JSON.parse(r.finalStateKey);return Uint16Array.from(c.blocks.map(b=>{const cur=snap.blocks.find(x=>x.id===b.id);return !cur?511:cur.x+cur.y*c.W+((b.layers.length-cur.layers.length)<<7);}));};
function guided(start,targetId){
 const ti=c.blocks.findIndex(b=>b.id===targetId);assert(ti>=0);const b=c.blocks[ti],startStage=start[ti]>>>7;
 const distance=s=>{if(s[ti]===511||s[ti]>>>7>startStage)return -100;const p=s[ti]&127,x=p%c.W,y=Math.floor(p/c.W),options=b.poses.flatMap((a,i)=>a?.exits[startStage]?[i]:[]);return Math.min(...options.map(q=>Math.abs(q%c.W-x)+Math.abs(Math.floor(q/c.W)-y)));};
 const nodes=[{s:start,cost:0,parent:-1,clears:clearCount(c,start)}],open=[0],seen=new Map([[key(start),0]]),begin=Date.now();let stop;
 const score=i=>nodes[i].clears*10000-distance(nodes[i].s)*Number(process.env.DIST_WEIGHT??30)-nodes[i].cost;
 const push=i=>{open.push(i);let a=open.length-1;while(a){const p=(a-1)>>1;if(score(open[p])>=score(open[a]))break;[open[p],open[a]]=[open[a],open[p]];a=p;}};
 const pop=()=>{const a=open[0],v=open.pop();if(open.length){open[0]=v;let p=0;while(2*p+1<open.length){let k=2*p+1;if(k+1<open.length&&score(open[k+1])>score(open[k]))k++;if(score(open[p])>=score(open[k]))break;[open[p],open[k]]=[open[k],open[p]];p=k;}}return a;};
 while(open.length){if(Date.now()-begin>Number(process.env.SEARCH_MS??15000)){stop='deadline';break;}const ni=pop(),n=nodes[ni];if(seen.get(key(n.s))<n.cost)continue;if(n.s[ti]===511||n.s[ti]>>>7>startStage){const route=[];let i=ni;while(nodes[i].parent>=0){route.push(nodes[i].drag);i=nodes[i].parent;}return{status:'witness',cost:n.cost,drags:route.reverse(),states:seen.size,clears:n.clears};}
  each(c,n.s,(i,value,cost,get)=>{const s=n.s.slice();s[i]=value;const k=key(s),nc=n.cost+cost;if(nc>40||seen.has(k)&&seen.get(k)<=nc)return;if(seen.size>=1000000){stop='max-states';return false;}seen.set(k,nc);nodes.push({s,cost:nc,clears:clearCount(c,s),parent:ni,drag:get()});push(nodes.length-1);},{optionalExit:false,orderSeed:Number(process.env.ORDER??0)});if(stop)break;
 }
 return{status:'unknown',stop,states:seen.size};
}
const suffix=process.env.TARGETS?.split(',')??['cover-8-2','cover-8-4','opening-10','opening-3','cover-8-5'];
for(const target of suffix){const s=stateOf(),tid='v146-64-'+target,ti=c.blocks.findIndex(b=>b.id===tid);if(s[ti]===511)continue;const r=guided(s,tid);console.log(JSON.stringify({target,...r,drags:undefined}));if(r.status!=='witness')break;drags.push(...r.drags);}
const replay=api.replayRevisedRoute(level,drags);assert(replay.valid);const out=`${dir}/guided64-${Date.now()}.json`;fs.writeFileSync(out,JSON.stringify({...data,drags,replay,guidedTargets:suffix,notComplete:!replay.complete},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({out,U:replay.nonClearingDrags,clear:replay.clearEvents,complete:replay.complete}));
