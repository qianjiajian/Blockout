import fs from 'node:fs';
import {loadSpatialApi,compileSpatial,key,each,cleared,NONE,searchSpatial} from '../agent139-140/witness-domain.mjs';
import {checkStationaryObligations} from '../root-native/stationary-obligations.mjs';
import {loadPreviewCore,digest} from '../../../revised-preview-validation-v160.mjs';
import {measureRoute} from '../../../remake21to30-quality.mjs';
import {createDynamicStationaryHint} from '../root-native/dynamic-stationary-witness-hint.mjs';
const input=process.argv[2], data=JSON.parse(fs.readFileSync(input)),level=data.level;
const api={...await loadSpatialApi(),...(await loadPreviewCore()).api};
const proof=checkStationaryObligations(level,api,{floor:11,targetIds:[data.targetId??'n139-opening-4']}),c=compileSpatial(level,api);
const target=c.blocks.findIndex(b=>b.id===(data.targetId??'n139-opening-4')), K=proof.contract.goalClears;
const obligations=proof.checks.filter(x=>!x.reachable).map(x=>({i:c.blocks.findIndex(b=>b.id===x.blockerId),poses:new Set(x.visitedPositions.map(p=>{const [x,y]=p.split(',').map(Number);return y*c.W+x;}))}));
const dynamic=process.env.DYNAMIC==='1'?createDynamicStationaryHint(c,c.blocks[target].id):null;
const remain=s=>s[target]===NONE?0:Math.max(dynamic?.(s)??0,obligations.filter(o=>s[o.i]===c.initial[o.i]&&o.poses.has(s[target]&127)).length);
const nodes=[],heap=[],seen=new Map(),began=Date.now(),budget=Number(process.env.MS??12000),maxCost=15,seed=Number(process.env.ORDER??0),weight=Number(process.env.WEIGHT??100);
let best=0,expanded=0,edges=0,hit,tail;
const score=n=>dynamic?-(n.cost+n.h)*30+n.clears*10-n.cost+(n.s[target]===NONE?30:(6-(n.s[target]&127)%c.W)*3):n.clears*weight-n.cost*14-(n.h??remain(n.s))*8+(n.s[target]===NONE?30:(6-(n.s[target]&127)%c.W)*3);
function push(n){let i=nodes.push(n)-1;heap.push(i);for(let p=heap.length-1;p;){const parent=(p-1)>>1;if(score(nodes[heap[parent]])>=score(nodes[heap[p]]))break;[heap[parent],heap[p]]=[heap[p],heap[parent]];p=parent;}return i;}
function pop(){const out=heap[0],last=heap.pop();if(heap.length){heap[0]=last;for(let i=0;i*2+1<heap.length;){let j=i*2+1;if(j+1<heap.length&&score(nodes[heap[j+1]])>score(nodes[heap[j]]))j++;if(score(nodes[heap[i]])>=score(nodes[heap[j]]))break;[heap[i],heap[j]]=[heap[j],heap[i]];i=j;}}return out;}
const route=i=>{const r=[];while(i>=0){if(nodes[i].drag)r.push(nodes[i].drag);i=nodes[i].parent;}return r.reverse();};
push({s:c.initial,cost:0,clears:cleared(c,c.initial),h:remain(c.initial),parent:-1});seen.set(key(c.initial),0);
while(heap.length&&Date.now()-began<budget&&seen.size<200000){
 const ni=pop(),n=nodes[ni];if(seen.get(key(n.s))<n.cost)continue;expanded++;
 if(n.clears>nodes[best].clears||n.clears===nodes[best].clears&&(n.cost<nodes[best].cost||n.cost===nodes[best].cost&&n.h<nodes[best].h)){best=ni;console.log(JSON.stringify({bestClears:n.clears,cost:n.cost,h:n.h,expanded,elapsed:Date.now()-began}));}
 if(n.clears>=K){hit=ni;break;}
 each(c,n.s,(s,k,get)=>{edges++;const cost=n.cost+k;if(cost>maxCost)return;const h=remain(s);if(cost+h>maxCost)return;const sk=key(s),prior=seen.get(sk);if(prior!==undefined&&prior<=cost)return;seen.set(sk,cost);push({s,cost,h,clears:cleared(c,s),parent:ni,drag:get()});},{optionalExit:false,orderSeed:seed});
}
const prefix=route(hit??best),replay=api.replayRevisedRoute(level,prefix);if(hit!==undefined)tail=searchSpatial(level,api,{floor:16,maxMilliseconds:8000,maxStates:100000,diagnosticTrace:true,initialDrags:prefix,orderSeed:seed});
const drags=tail?.status==='witness'?tail.drags:prefix,full=api.replayRevisedRoute(level,drags),measurement=full.valid&&full.complete?measureRoute(level,drags,api):null;
const output={input,level,levelSha256:digest(level),proof,targetId:c.blocks[target].id,explored:expanded,edges,discovered:seen.size,elapsed:Date.now()-began,prefixCost:nodes[hit??best].cost,prefixClears:nodes[hit??best].clears,prefix,replay,tail,drags,full,measurement,formalAdopted:false};
const file=`deliverables/remake131-140-v146-20260924/agent131-134/stationary-prefix139-${Date.now()}.json`;fs.writeFileSync(file,JSON.stringify(output,null,2));console.log(JSON.stringify({file,status:full.complete?'complete':'partial',cost:full.nonClearingDrags,clears:output.prefixClears,measurement}));
