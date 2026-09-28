// Witness-only exploration with optimistic ice-resource dead-end pruning.
// A returned route still requires PuzzleModel and real-pointer verification.
import {compile,each,clearCount,key} from '../../../deliverables/remake31-200-v145-20260924/batches/lv061-070/author65-67/lift-search.mjs';
export function optimisticIcePossible(c,s){
 const remaining=c.blocks.map((b,i)=>s[i]===511?0:s[i]===510?b.layers.length:b.layers.length-(s[i]>>>7)),ice=Array.from(s.slice(c.N,c.N*2));
 for(;;){const i=remaining.findIndex((v,i)=>v>0&&ice[i]===0);if(i<0)return remaining.every(v=>v===0);const events=remaining[i];remaining[i]=0;for(let j=0;j<c.N;j++)ice[j]=Math.max(0,ice[j]-events);}
}
export function searchStage(level,{floor=Infinity,maxStates=80000,maxMilliseconds=2000,orderSeed=0,startState,goalClears=Infinity,weight=1000}={}){
 const c=compile(level),initial=startState??c.initial,start=Date.now(),nodes=[{s:initial,cost:0,parent:-1,clears:clearCount(c,initial)}],seen=new Map([[key(initial),0]]),open=[0];let explored=0,transitions=0,pruned=0,stop,best=0;
 const score=i=>nodes[i].clears*weight-nodes[i].cost;
 function push(i){open.push(i);let a=open.length-1;while(a){const p=(a-1)>>1;if(score(open[p])>=score(open[a]))break;[open[p],open[a]]=[open[a],open[p]];a=p;}}
 function pop(){const a=open[0],last=open.pop();if(open.length){open[0]=last;let p=0;while(p*2+1<open.length){let k=p*2+1;if(k+1<open.length&&score(open[k+1])>score(open[k]))k++;if(score(open[p])>=score(open[k]))break;[open[p],open[k]]=[open[k],open[p]];p=k;}}return a;}
 function route(i){const r=[];while(nodes[i].parent>=0){r.push(nodes[i].drag);i=nodes[i].parent;}return r.reverse();}
 while(open.length){if(Date.now()-start>=maxMilliseconds){stop='deadline';break;}const ni=pop(),n=nodes[ni];if(seen.get(key(n.s))<n.cost)continue;explored++;if(n.clears>nodes[best].clears)best=ni;if(n.clears>=Math.min(goalClears,c.total))return{status:'witness',state:n.s,cost:n.cost,drags:route(ni),states:seen.size,explored,transitions,pruned,ms:Date.now()-start};
  each(c,n.s,(s,cost,getDrag)=>{if(Date.now()-start>=maxMilliseconds){stop='deadline';return false;}transitions++;const nc=n.cost+cost;if(nc>=floor)return;const k=key(s),prev=seen.get(k);if(prev!==undefined&&prev<=nc)return;if(!optimisticIcePossible(c,s)){pruned++;return;}if(seen.size>=maxStates){stop='max-states';return false;}seen.set(k,nc);nodes.push({s,cost:nc,parent:ni,clears:clearCount(c,s),drag:getDrag()});push(nodes.length-1);},{orderSeed});if(stop)break;
 }
 return{status:stop?'unknown':'exhausted',states:seen.size,explored,transitions,pruned,ms:Date.now()-start,stop,best:{clears:nodes[best].clears,cost:nodes[best].cost,drags:route(best)}};
}
