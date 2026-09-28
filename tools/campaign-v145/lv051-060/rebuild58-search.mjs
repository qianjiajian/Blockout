// Diagnostic upper-route search using the already qualified actual gesture
// graph. Best partial prefixes explain a failed construction; they are never
// difficulty proofs or complete routes.
import {compile,each,clearCount} from './campaign-generator-axis-search-v146.mjs';
export function search(level,{floor=16,maxStates=180000,maxMilliseconds=1500,weight=10,orderSeed=0}={}){
 const c=compile(level),start=Date.now(),nodes=[{s:c.initial,cost:0,parent:-1,clears:clearCount(c,c.initial)}],key=s=>String.fromCharCode(...s),seen=new Map([[key(c.initial),0]]),open=[0];let explored=0,transitions=0,stop,best=0;
 const score=i=>nodes[i].clears*weight-nodes[i].cost;
 const push=i=>{open.push(i);let a=open.length-1;while(a){const p=(a-1)>>1;if(score(open[p])>=score(open[a]))break;[open[p],open[a]]=[open[a],open[p]];a=p;}};
 const pop=()=>{const first=open[0],last=open.pop();if(open.length){open[0]=last;let p=0;while(p*2+1<open.length){let k=p*2+1;if(k+1<open.length&&score(open[k+1])>score(open[k]))k++;if(score(open[p])>=score(open[k]))break;[open[p],open[k]]=[open[k],open[p]];p=k;}}return first;};
 const route=i=>{const ds=[];while(nodes[i].parent>=0){ds.push(nodes[i].drag);i=nodes[i].parent;}return ds.reverse();};
 while(open.length){if(Date.now()-start>=maxMilliseconds){stop='deadline';break;}const ni=pop(),n=nodes[ni];if(seen.get(key(n.s))<n.cost)continue;explored++;
  if(n.clears>nodes[best].clears||n.clears===nodes[best].clears&&n.cost<nodes[best].cost)best=ni;
  if(n.clears===c.total)return {status:'witness',cost:n.cost,drags:route(ni),states:seen.size,explored,transitions,ms:Date.now()-start,totalClearEvents:c.total,maxClears:n.clears};
  each(c,n.s,(s,cost,get)=>{if(Date.now()-start>=maxMilliseconds){stop='deadline';return false;}transitions++;const nc=n.cost+cost;if(nc>=floor)return;const k=key(s),previous=seen.get(k);if(previous!==undefined&&previous<=nc)return;if(seen.size>=maxStates){stop='max-states';return false;}seen.set(k,nc);nodes.push({s,cost:nc,parent:ni,clears:clearCount(c,s),drag:get()});push(nodes.length-1);},{orderSeed});if(stop)break;
 }
 return {status:'unknown',stop:stop??'upper-bound-graph-exhausted',states:seen.size,explored,transitions,ms:Date.now()-start,totalClearEvents:c.total,maxClears:nodes[best].clears,partialCost:nodes[best].cost,partialDrags:route(best)};
}
