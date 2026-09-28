import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi,OUTPUT,writeNew,ruleGate} from './remake61to70-v146.mjs';
import {compile,each,clearCount,key} from '../../../deliverables/remake31-200-v145-20260924/batches/lv061-070/author61-64/local-graph.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
ruleGate();const input=process.argv[2],data=JSON.parse(fs.readFileSync(input)),{api}=await loadApi(),c=compile(data.level),deadline=Date.now()+Number(process.env.SECONDS??180)*1000;
assert.equal(data.level.id,64);const initialReplay=api.replayRevisedRoute(data.level,data.drags);assert(initialReplay.valid);let route=data.drags,foundComplete=initialReplay.complete,best=foundComplete?initialReplay.nonClearingDrags:Number(process.env.SEARCH_CEILING??10)+1;const attempts=[];
function tail(initial,cap,orderSeed){
 const started=Date.now(),nodes=[{s:initial,cost:0,parent:-1,clears:clearCount(c,initial)}],open=[0],seen=new Map([[key(initial),0]]);let stop=null;
 const score=i=>nodes[i].clears*1000-nodes[i].cost;
 function push(i){open.push(i);let a=open.length-1;while(a){const p=(a-1)>>1;if(score(open[p])>=score(open[a]))break;[open[p],open[a]]=[open[a],open[p]];a=p;}}
 function pop(){const v=open[0],last=open.pop();if(open.length){open[0]=last;let p=0;while(p*2+1<open.length){let k=p*2+1;if(k+1<open.length&&score(open[k+1])>score(open[k]))k++;if(score(open[p])>=score(open[k]))break;[open[p],open[k]]=[open[k],open[p]];p=k;}}return v;}
 while(open.length){if(Date.now()>=deadline||Date.now()-started>Number(process.env.TAIL_MS??1200)){stop='deadline';break;}const ni=pop(),n=nodes[ni];if(seen.get(key(n.s))<n.cost)continue;if(n.clears===c.total){const drags=[];let k=ni;while(nodes[k].parent>=0){drags.push(nodes[k].drag);k=nodes[k].parent;}return{status:'witness',drags:drags.reverse(),cost:n.cost,states:seen.size};}
  each(c,n.s,(i,value,cost,get)=>{const nc=n.cost+cost;if(nc>=cap)return;const s=n.s.slice();s[i]=value;const k=key(s),old=seen.get(k);if(old!==undefined&&old<=nc)return;if(seen.size>=Number(process.env.STATES??160000)){stop='max-states';return false;}seen.set(k,nc);nodes.push({s,cost:nc,parent:ni,clears:clearCount(c,s),drag:get()});push(nodes.length-1);},{optionalExit:false,orderSeed});if(stop)break;
 }
 return{status:stop?'unknown':'exhausted',stop,states:seen.size};
}
outer:for(let round=0;round<5&&Date.now()<deadline;round++){
 let improved=false;
 for(let prefix=route.length-1;prefix>=0&&Date.now()<deadline;prefix--){
  const replay=api.replayRevisedRoute(data.level,route.slice(0,prefix));assert(replay.valid);const snapshot=JSON.parse(replay.finalStateKey),state=Uint16Array.from(data.level.blocks.map(def=>{const b=snapshot.blocks.find(x=>x.id===def.id);return b?b.y*c.W+b.x|(((def.layers?.length??1)-b.layers.length)<<7):511;}));
  const result=tail(state,best-replay.nonClearingDrags,(round*7+prefix)%c.blocks.length);attempts.push({prefix,round,prefixCost:replay.nonClearingDrags,...result,drags:undefined});
  if(result.status!=='witness')continue;const drags=[...route.slice(0,prefix),...result.drags],checked=api.replayRevisedRoute(data.level,drags);assert(checked.valid&&checked.complete);assert(checked.nonClearingDrags<best);route=drags;best=checked.nonClearingDrags;improved=true;foundComplete=true;
  const out=`${OUTPUT}/root64/optimized-route64-${Date.now()}.json`;writeNew(out,{...data,drags,replay:checked,notComplete:false,routeSha256:digest(drags),rootRouteOptimization:{input,round,prefix},floorStatus:'NOT_RUN',pointerStatus:'NOT_RUN'});console.log(JSON.stringify({out,U:best,drags:drags.length}));if(best<=10)break outer;prefix=Math.min(prefix,route.length);
 }
 console.log(JSON.stringify({round,upperBound:foundComplete?best:null,searchCeiling:best-1,improved,attempts:attempts.length}));
}
const out=`${OUTPUT}/root64/route-optimization-attempt-${Date.now()}.json`;writeNew(out,{input,upperBound:foundComplete?best:null,searchCeiling:best-1,attempts});console.log(JSON.stringify({out,upperBound:foundComplete?best:null,attempts:attempts.length}));
