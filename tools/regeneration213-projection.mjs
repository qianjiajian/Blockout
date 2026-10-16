import fs from 'node:fs';import assert from 'node:assert/strict';import {loadSpatialApi,searchSpatial} from './remake201to210-v123-floor.mjs';import {loadContinuationRuntime,sha256} from './continuation211-runtime.mjs';import {proveSymmetric} from './regeneration220-design/prove-symmetric.mjs';
const OUT='deliverables/continue211-220-20260930/design213-original',base=JSON.parse(fs.readFileSync(OUT+'/candidate-13.json')),core=await loadContinuationRuntime(),api=await loadSpatialApi(),history=[];let n=0;
for(const change of [['l213-upper-fill-4','orange'],['l213-upper-fill-6','cyan'],['l213-upper-c','blue'],['l213-upper-e','green'],['l213-upper-g','cyan'],['l213-lower-fill-2','blue'],['l213-lower-fill-5','orange'],['l213-neck-left','orange']]){
 const level=structuredClone(base.level);level.blocks.find(b=>b.id===change[0]).color=change[1];
 if(level.blocks.some((b,i)=>level.blocks.slice(i+1).some(a=>a.shutterId===b.shutterId&&(a.layers?.[0]??a.color)===(b.layers?.[0]??b.color)&&a.shape.some(([x,y])=>b.shape.some(([dx,dy])=>Math.abs(a.x+x-b.x-dx)+Math.abs(a.y+y-b.y-dy)===1)))))continue;
 n++;level.mechanismAdaptation.change+=` 新族普通块${change[0]}改${change[1]}，旧有限下界UNKNOWN不沿用。`;
 const upper=searchSpatial(level,api,{floor:16,normalize:true,maxMilliseconds:4000,maxStates:80000,maxTransitions:1500000,orderSeed:n}),route=upper.drags?core.replayRevisedRoute(level,upper.drags):null;
 const data={level,drags:upper.drags??[],upper,replay:route,sourceReview:base.sourceReview};
 if(route?.valid&&route.complete&&route.nonClearingDrags>=11&&route.nonClearingDrags<=15){
  level.preservedMoveTarget=route.effectiveDrags;data.levelSha256=sha256(level);
  const projection=structuredClone(level),lifts=new Set(projection.shutters.filter(s=>s.skin==='lift').map(s=>s.id)),removed=projection.blocks.filter(b=>lifts.has(b.shutterId)),credit=removed.reduce((n,b)=>n+(b.layers?.length??1),0);
  projection.blocks=projection.blocks.filter(b=>!lifts.has(b.shutterId));projection.shutters=projection.shutters.filter(s=>!lifts.has(s.id));
  // Give every removed event before any action, also deducting this maximal
  // credit from each hidden block on reveal. This strictly relaxes ice timing.
  for(const g of projection.gates)if(g.frozen)g.frozen=Math.max(0,g.frozen-credit);
  for(const b of projection.blocks)if(b.frozen)b.frozen=Math.max(0,b.frozen-credit);
  for(const s of projection.shutters)s.count=Math.max(0,s.count-credit);
  data.projection=projection;data.projectionRelation={removedLiftIds:[...lifts],removedBodies:removed,maximumClearCredit:credit,reason:'Remove collision bodies of the selected lift and grant all their possible clears in advance. Preserve every remaining body. Earlier full physical ordinary-cover reveal cannot obstruct formerly free cells; all ice/counters only relax.'};
  data.lower=proveSymmetric(projection,api,{floor:11,maxMilliseconds:6000,maxStates:150000,normalizeMonotone:true});
 }
 const row={n,change,status:upper.status,U:route?.nonClearingDrags,lower:data.lower?.status,lowerCost:data.lower?.cost};console.log(row);history.push(row);fs.writeFileSync(`${OUT}/projection-mutation-${n}.json`,JSON.stringify(data,null,2));
 if(data.lower?.thresholdProven)break;
}
fs.writeFileSync(OUT+'/projection-mutation-history.json',JSON.stringify(history,null,2));
