import fs from 'node:fs';
import assert from 'node:assert/strict';
import {compileLevel,forEachGesture,clearCount,stateFromSnapshot} from '../../remake21to30-mask-floor.mjs';
import {equivalentBlockGroups,canonicalStateKey,normalizeMonotoneClears} from '../../remake21to30-symmetry-floor-v139.mjs';
import {loadApi} from '../../native-block-repair-v143.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
const lock=verifyRulesLock();assert(lock.ok&&lock.activeVersion==='1.47.0');
const input=process.argv[2],draft=JSON.parse(fs.readFileSync(input));assert.equal(draft.level.id,149);
const {api}=await loadApi();
const c=compileLevel(draft.level),groups=equivalentBlockGroups(c),key=s=>canonicalStateKey(s,groups);
let prefix=draft.search.partialRoute,records=[],final;
// Restart a route-discovery beam at a fully replayed checkpoint. This deliberately
// discards earlier branches; neither its exhaustion nor its cost is a lower bound.
function extend(startState){
 const start=Date.now(),initial=normalizeMonotoneClears(c,startState);
 const nodes=[{s:initial.state,cost:0,parent:-1,clears:clearCount(c,initial.state),drags:initial.drags}],seen=new Map([[key(initial.state),0]]),open=[0];
 let explored=0,stop,best=0;
 const score=i=>nodes[i].clears*1000-nodes[i].cost;
 const push=i=>{open.push(i);for(let a=open.length-1;a;){const p=(a-1)>>1;if(score(open[p])>=score(open[a]))break;[open[p],open[a]]=[open[a],open[p]];a=p;}};
 const pop=()=>{const r=open[0],last=open.pop();if(open.length){open[0]=last;let p=0;while(p*2+1<open.length){let k=p*2+1;if(k+1<open.length&&score(open[k+1])>score(open[k]))k++;if(score(open[p])>=score(open[k]))break;[open[p],open[k]]=[open[k],open[p]];p=k;}}return r;};
 const route=i=>{const segs=[];while(i>=0){segs.push(nodes[i].drags);i=nodes[i].parent;}return segs.reverse().flat();};
 while(open.length){
  if(Date.now()-start>=20000){stop='deadline';break;}
  const ni=pop(),n=nodes[ni];if(seen.get(key(n.s))<n.cost)continue;explored++;
  if(n.clears>nodes[best].clears||(n.clears===nodes[best].clears&&n.cost<nodes[best].cost))best=ni;
  if(n.clears===c.totalClears)return{status:'witness',cost:n.cost,drags:route(ni),states:seen.size,explored,ms:Date.now()-start};
  forEachGesture(c,n.s,(i,v,cost,get)=>{
   const nc=n.cost+cost;if(nc>80)return;
   const s=n.s.slice();s[i]=v;const normalized=normalizeMonotoneClears(c,s),k=key(normalized.state),prior=seen.get(k);
   if(prior!==undefined&&prior<=nc)return;
   if(seen.size>=300000){stop='max-states';return false;}
   seen.set(k,nc);nodes.push({s:normalized.state,cost:nc,parent:ni,clears:clearCount(c,normalized.state),drags:[get(),...normalized.drags]});push(nodes.length-1);
  });if(stop)break;
 }
 return{status:stop?'unknown':'exhausted-discovery-only',stop,states:seen.size,explored,ms:Date.now()-start,maxClears:nodes[best].clears,partialCost:nodes[best].cost,partialRoute:route(best)};
}
for(let pass=0;pass<3;pass++){
 const before=api.replayRevisedRoute(draft.level,prefix);assert(before.valid);
 const result=extend(stateFromSnapshot(c,JSON.parse(before.finalStateKey))),next=[...prefix,...(result.drags??result.partialRoute)];
 const replay=api.replayRevisedRoute(draft.level,next);records.push({pass,prefixClears:before.clearEvents,result,replay});
 console.log(JSON.stringify({pass,search:result.status,valid:replay.valid,complete:replay.complete,clears:replay.clearEvents,U:replay.nonClearingDrags}));
 if(!replay.valid)break;prefix=next;final=replay;
 if(replay.complete||replay.clearEvents<=before.clearEvents)break;
}
const out='deliverables/remake31-200-v145-20260924/batches/lv141-150/root149/resumed-'+Date.now()+'.json';
fs.writeFileSync(out,JSON.stringify({ruleVersion:lock.activeVersion,input,level:draft.level,levelSha256:digest(draft.level),drags:prefix,routeSha256:digest(prefix),replay:final,records,lowerBound:null,formalAdopted:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({out,complete:final?.complete,U:final?.nonClearingDrags}));
