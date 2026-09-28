import {compile,each,clearCount,key} from '../../../deliverables/remake31-200-v145-20260924/batches/lv061-070/author65-67/lift-search.mjs';
export function search(level,{floor=Infinity,maxStates=60000,maxMilliseconds=2000,weight=1000,orderSeed=0,prove=false}={}){
 const c=compile(level),start=Date.now(),nodes=[{s:c.initial,cost:0,parent:-1,clears:0}],seen=new Map([[key(c.initial),0]]),open=[0];let explored=0,transitions=0,stop,maxClears=0,bestState=c.initial;
 const score=i=>prove?-nodes[i].cost:nodes[i].clears*weight-nodes[i].cost;
 function push(i){open.push(i);let a=open.length-1;while(a){const p=(a-1)>>1;if(score(open[p])>=score(open[a]))break;[open[p],open[a]]=[open[a],open[p]];a=p;}}
 function pop(){const a=open[0],last=open.pop();if(open.length){open[0]=last;let p=0;while(p*2+1<open.length){let k=p*2+1;if(k+1<open.length&&score(open[k+1])>score(open[k]))k++;if(score(open[p])>=score(open[k]))break;[open[p],open[k]]=[open[k],open[p]];p=k;}}return a;}
 function route(i){const r=[];while(nodes[i].parent>=0){r.push(nodes[i].drag);i=nodes[i].parent;}return r.reverse();}
 while(open.length){if(Date.now()-start>=maxMilliseconds){stop='deadline';break;}const ni=pop(),n=nodes[ni];if(seen.get(key(n.s))<n.cost)continue;explored++;if(n.clears>maxClears){maxClears=n.clears;bestState=n.s;}if(n.clears===c.total)return{status:prove?'relaxed-shortcut':'witness',cost:n.cost,drags:route(ni),states:seen.size,explored,transitions,ms:Date.now()-start};
  each(c,n.s,(s,cost,getDrag)=>{if(Date.now()-start>=maxMilliseconds){stop='deadline';return false;}transitions++;const nc=n.cost+cost;if(nc>=floor)return;const k=key(s),prev=seen.get(k);if(prev!==undefined&&prev<=nc)return;if(seen.size>=maxStates){stop='max-states';return false;}seen.set(k,nc);nodes.push({s,cost:nc,parent:ni,clears:clearCount(c,s),drag:getDrag()});push(nodes.length-1);},{orderSeed,optionalExit:prove});if(stop)break;
 }
 return{status:stop?'unknown':prove?'threshold-proven':'exhausted',thresholdProven:prove&&!stop,floor,states:seen.size,explored,transitions,ms:Date.now()-start,stop,maxClears,bestState:Array.from(bestState)};
}
