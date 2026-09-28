import fs from 'node:fs';
import assert from 'node:assert/strict';
import {OUTPUT,loadApi,ruleGate,digest,writeNew} from './remake91to100-v146.mjs';
import {compileSpatial,each,cleared,normalizeClears,assertStateMatches,loadSpatialApi} from '../deliverables/remake91-100-v146-20260924/agent91-94/exact-static-domain94.mjs';
import {iceAgeKey,keySafeGroups} from '../deliverables/remake91-100-v146-20260924/agent91-94/exact-static-floor94-v2.mjs';
ruleGate();
const file=OUTPUT+'/agent95-98/assist94-gates/green4-prefix-failure-1790273093374.json';
const input=JSON.parse(fs.readFileSync(file)),data=JSON.parse(fs.readFileSync(input.input)),prefix=input.firstFailure.prefix;
const {api}=await loadApi(),full=await loadSpatialApi(),c=compileSpatial(data.level,full);
const original=api.replayRevisedRoute(data.level,prefix);assert(original.valid);assert.equal(original.nonClearingDrags,input.firstFailure.spentRepositions);
const initial=Uint16Array.from(input.firstFailure.exactPrefixState);assertStateMatches(c,initial,JSON.parse(original.finalStateKey));
function search(weight,orderSeed){
 const begun=Date.now(),nodes=[{s:initial,cost:0,parent:-1,drags:[],clears:cleared(c,initial)}],open=[0],sk=s=>iceAgeKey(c,s,keySafeGroups(c,s)),seen=new Map([[sk(initial),0]]);
 const score=i=>nodes[i].clears*weight-nodes[i].cost;
 function push(i){open.push(i);let at=open.length-1;while(at){const p=(at-1)>>1;if(score(open[p])>=score(open[at]))break;[open[p],open[at]]=[open[at],open[p]];at=p;}}
 function pop(){const out=open[0],last=open.pop();if(open.length){open[0]=last;let p=0;while(p*2+1<open.length){let next=p*2+1;if(next+1<open.length&&score(open[next+1])>score(open[next]))next++;if(score(open[p])>=score(open[next]))break;[open[p],open[next]]=[open[next],open[p]];p=next;}}return out;}
 const route=i=>{const a=[];while(i>=0){a.push(nodes[i].drags);i=nodes[i].parent;}return a.reverse().flat();};
 let explored=0,transitions=0,maxClears=cleared(c,initial),stop=null;
 while(open.length){if(Date.now()-begun>10000){stop='deadline';break;}const i=pop(),n=nodes[i];if(seen.get(sk(n.s))<n.cost)continue;explored++;maxClears=Math.max(maxClears,n.clears);
  if(n.clears===c.totalClears){const drags=[...prefix,...route(i)],replay=api.replayRevisedRoute(data.level,drags);assert(replay.valid&&replay.complete,replay.error);assert(replay.nonClearingDrags<=30);return{status:'complete-witness',weight,orderSeed,drags,replay,explored,transitions,discovered:seen.size,elapsedMilliseconds:Date.now()-begun};}
  each(c,n.s,(raw,cost,get)=>{transitions++;if(Date.now()-begun>10000||seen.size>=400000){stop='budget';return false;}const nextCost=n.cost+cost;if(nextCost+original.nonClearingDrags>30)return;const normal=normalizeClears(c,raw),s=normal.s,k=sk(s),prior=seen.get(k);if(prior!==undefined&&prior<=nextCost)return;seen.set(k,nextCost);nodes.push({s,cost:nextCost,parent:i,drags:[get(),...normal.drags],clears:cleared(c,s)});push(nodes.length-1);},{optionalExit:false,orderSeed});
  if(stop)break;
 }
 return{status:'unknown',weight,orderSeed,explored,transitions,discovered:seen.size,maxClears,termination:stop??'prefix-exhausted',elapsedMilliseconds:Date.now()-begun};
}
for(const [weight,seed]of [[1,3],[10,0],[1000,7],[1,0],[10,3],[1000,0]]){
 const result=search(weight,seed),out=OUTPUT+'/root94-green4-tail-'+Date.now()+'.json';writeNew(out,{input:file,level:data.level,levelSha256:digest(data.level),prefixSpent:original.nonClearingDrags,result,lowerBoundCertified:false,formalAdopted:false});
 console.log(JSON.stringify({out,status:result.status,weight,seed,U:result.replay?.nonClearingDrags,maxClears:result.maxClears,explored:result.explored}));if(result.status==='complete-witness')break;
}
