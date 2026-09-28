import fs from 'node:fs';
import {loadApi} from '../../native-block-repair-v143.mjs';
import {qualifyDelayed67,eachDelayed67,normalizeDelayedClears67} from './delayed-lift-floor67.mjs';
import {clearCount,key} from '../../../deliverables/remake31-200-v145-20260924/batches/lv061-070/author65-67/lift-search.mjs';
export function probeDelayed67(level,api,{floor=11,maxMilliseconds=15000,maxStates=400000,weight=1000}={}){
 const c=qualifyDelayed67(level,api),initial=normalizeDelayedClears67(c,c.initial),start=Date.now(),nodes=[{s:initial.state,cost:0,parent:-1,actions:initial.actions}],seen=new Map([[key(initial.state),0]]),heap=[0];let explored=0,best=clearCount(c,initial.state),stop;
 const score=i=>clearCount(c,nodes[i].s)*weight-nodes[i].cost;
 const push=i=>{heap.push(i);let a=heap.length-1;while(a){const p=(a-1)>>1;if(score(heap[p])>=score(heap[a]))break;[heap[p],heap[a]]=[heap[a],heap[p]];a=p;}};
 const pop=()=>{const i=heap[0],last=heap.pop();if(heap.length){heap[0]=last;let p=0;while(p*2+1<heap.length){let q=p*2+1;if(q+1<heap.length&&score(heap[q+1])>score(heap[q]))q++;if(score(heap[p])>=score(heap[q]))break;[heap[p],heap[q]]=[heap[q],heap[p]];p=q;}}return i;};
 const route=i=>{const segments=[];while(i>=0){segments.push(nodes[i].actions);i=nodes[i].parent;}return segments.reverse().flat();};
 while(heap.length){if(Date.now()-start>maxMilliseconds){stop='deadline';break;}const i=pop(),n=nodes[i];if(seen.get(key(n.s))<n.cost)continue;explored++;best=Math.max(best,clearCount(c,n.s));if(clearCount(c,n.s)===c.total)return{status:'relaxed-witness',cost:n.cost,actions:route(i),states:seen.size,explored,ms:Date.now()-start};
  eachDelayed67(c,n.s,(s,cost,get)=>{if(Date.now()-start>maxMilliseconds){stop='deadline';return false;}const nc=n.cost+cost;if(nc>=floor)return;const z=normalizeDelayedClears67(c,s),k=key(z.state);if((seen.get(k)??Infinity)<=nc)return;if(seen.size>=maxStates){stop='max-states';return false;}seen.set(k,nc);nodes.push({s:z.state,cost:nc,parent:i,actions:[get(),...z.actions]});push(nodes.length-1);});if(stop)break;
 }return{status:'unknown',stop:stop??'bounded-exhausted',states:seen.size,explored,best,ms:Date.now()-start};
}
if(process.argv[1]?.endsWith('delayed-probe67.mjs')){const{api}=await loadApi(),file=process.argv[2],d=JSON.parse(fs.readFileSync(file)),r=probeDelayed67(d.level,api,{maxMilliseconds:Number(process.env.PROBE_MS??15000),floor:Number(process.env.PROBE_FLOOR??11),weight:Number(process.env.WEIGHT??1000)}),out=file.replace(/\.json$/,'.delayed-probe-'+Date.now()+'.json');fs.writeFileSync(out,JSON.stringify(r,null,2));console.log(JSON.stringify({out,...r,actions:r.actions?.length}));}
