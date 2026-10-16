import {compileSpatial,each,key,cleared,active,NONE} from '../remake201to210-v123-floor.mjs';
/** Bounded witness heuristic only. This function never certifies a floor. */
export function guidedSearch(level,api,{maxMilliseconds=1000,maxStates=14000,orderSeed=0}={}){
 const c=compileSpatial(level,api),began=Date.now(),nodes=[{s:c.initial,cost:0,parent:-1,drag:null}],seen=new Map([[key(c.initial),0]]),open=[0];let explored=0,transitions=0,best=0,stopped='exhausted';
 const heuristic=s=>{let value=0;for(let i=0;i<c.N;i++){if(s[i]===NONE||!active(c,s,i))continue;const b=c.blocks[i],p=s[i]&127,x=p%c.W,y=Math.floor(p/c.W),paint=b.layers[s[i]>>>7];if(paint==='blue'){const w=1+Math.max(...b.shape.map(p=>p[0])),h=1+Math.max(...b.shape.map(p=>p[1]));value+=Math.abs(c.W-w-x)+Math.min(Math.abs(y-6),...(h<2?[Math.abs(y-7)]:[]));}else{for(const[dx,dy]of b.shape){const ax=x+dx,ay=y+dy;if(ax>=3&&ay>=6&&ay<=7)value+=2;}}}return value;};
 const score=n=>cleared(c,n.s)*10000-heuristic(n.s)*8-n.cost*10;
 nodes[0].score=score(nodes[0]);
 const push=i=>{open.push(i);let j=open.length-1;while(j){const p=(j-1)>>1;if(nodes[open[p]].score>=nodes[open[j]].score)break;[open[p],open[j]]=[open[j],open[p]];j=p;}};
 const pop=()=>{const result=open[0],last=open.pop();if(open.length){open[0]=last;let p=0;while(2*p+1<open.length){let j=2*p+1;if(j+1<open.length&&nodes[open[j+1]].score>nodes[open[j]].score)j++;if(nodes[open[p]].score>=nodes[open[j]].score)break;[open[p],open[j]]=[open[j],open[p]];p=j;}}return result;};
 const route=i=>{const r=[];while(i>=0){if(nodes[i].drag)r.push(nodes[i].drag);i=nodes[i].parent;}return r.reverse();};
 while(open.length){if(Date.now()-began>=maxMilliseconds){stopped='deadline';break;}const ni=pop(),n=nodes[ni];if(seen.get(key(n.s))<n.cost)continue;explored++;if(cleared(c,n.s)>cleared(c,nodes[best].s))best=ni;if(cleared(c,n.s)===c.totalClears)return{status:'witness',cost:n.cost,drags:route(ni),exploredStates:explored,discoveredStates:seen.size,attemptedTransitions:transitions,maxClearsSeen:c.totalClears};
 each(c,n.s,(s,k,get)=>{if(Date.now()-began>=maxMilliseconds||seen.size>=maxStates){stopped=seen.size>=maxStates?'max-states':'deadline';return false;}transitions++;const cost=n.cost+k,sk=key(s);if(cost>15||(seen.get(sk)??Infinity)<=cost)return;seen.set(sk,cost);const next={s,cost,parent:ni,drag:get()};next.score=score(next);nodes.push(next);push(nodes.length-1);},{optionalExit:false,orderSeed});if(stopped!=='exhausted')break;
 }
 return{status:'unknown',termination:stopped,exploredStates:explored,discoveredStates:seen.size,attemptedTransitions:transitions,maxClearsSeen:cleared(c,nodes[best].s),partialCost:nodes[best].cost,partialDrags:route(best)};
}
