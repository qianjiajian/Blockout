import {compileLevel,forEachGesture,clearCount} from './campaign-axis-key-graph-v146.mjs';
import {equivalentBlockGroups,canonicalStateKey,normalizeMonotoneClears} from './campaign-axis-key-floor-v146.mjs';
// Axis/key route discovery only. Independent floor checker supplies proof.
export function search(level,{floor=Infinity,maxStates=100000,maxMilliseconds=1000,weight=1000}={}){
 const c=compileLevel(level),groups=equivalentBlockGroups(c),key=s=>canonicalStateKey(s,groups),start=Date.now(),initial=normalizeMonotoneClears(c,c.initial),nodes=[{s:initial.state,cost:0,parent:-1,clears:clearCount(c,initial.state),drags:initial.drags}],seen=new Map([[key(initial.state),0]]),open=[0];let explored=0,stop,best=0;
 const score=i=>nodes[i].clears*weight-nodes[i].cost;
 const push=i=>{open.push(i);for(let a=open.length-1;a;){const p=(a-1)>>1;if(score(open[p])>=score(open[a]))break;[open[p],open[a]]=[open[a],open[p]];a=p;}};
 const pop=()=>{const r=open[0],last=open.pop();if(open.length){open[0]=last;let p=0;while(p*2+1<open.length){let k=p*2+1;if(k+1<open.length&&score(open[k+1])>score(open[k]))k++;if(score(open[p])>=score(open[k]))break;[open[p],open[k]]=[open[k],open[p]];p=k;}}return r;};
 const route=i=>{const segs=[];while(i>=0){segs.push(nodes[i].drags);i=nodes[i].parent;}return segs.reverse().flat();};
 while(open.length){if(Date.now()-start>=maxMilliseconds){stop='deadline';break;}const ni=pop(),n=nodes[ni];if(seen.get(key(n.s))<n.cost)continue;explored++;if(n.clears>nodes[best].clears||(n.clears===nodes[best].clears&&n.cost<nodes[best].cost))best=ni;if(n.clears===c.totalClears)return{status:'witness',cost:n.cost,drags:route(ni),states:seen.size,explored,ms:Date.now()-start};
  forEachGesture(c,n.s,(i,v,cost,get)=>{const nc=n.cost+cost;if(nc>=floor)return;const s=n.s.slice();s[i]=v;const normalized=normalizeMonotoneClears(c,s),k=key(normalized.state),prior=seen.get(k);if(prior!==undefined&&prior<=nc)return;if(seen.size>=maxStates){stop='max-states';return false;}seen.set(k,nc);nodes.push({s:normalized.state,cost:nc,parent:ni,clears:clearCount(c,normalized.state),drags:[get(),...normalized.drags]});push(nodes.length-1);});if(stop)break;
 }return{status:stop?'unknown':'exhausted',stop,states:seen.size,explored,ms:Date.now()-start,maxClears:nodes[best].clears,partialCost:nodes[best].cost,partialRoute:route(best)};
}
