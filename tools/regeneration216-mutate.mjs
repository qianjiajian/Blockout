import fs from 'node:fs';
import {loadSpatialApi,searchSpatial} from './continuation211-colored-witness.mjs';
import {loadContinuationRuntime,sha256} from './continuation211-runtime.mjs';
import {proveSymmetric} from './regeneration220-design/prove-symmetric.mjs';
const OUT='deliverables/continue211-220-20260930/design216-new',base=JSON.parse(fs.readFileSync(OUT+'/attempt-7-30.json'));
const api=await loadSpatialApi(),core=await loadContinuationRuntime(),colors=['red','pink','cyan','purple','green'],history=[];
let n=0;
for(const id of ['h6','h5','h0','h2','h11','h9','h7','h4','h10','h1'])for(const color of colors){
 const level=structuredClone(base.level),b=level.blocks.find(b=>b.id==='l216-'+id);if(b.color===color)continue;
 b.color=color;
 const adjacency=level.blocks.some((b,i)=>level.blocks.slice(i+1).some(a=>a.color===b.color&&a.shape.some(([x,y])=>b.shape.some(([dx,dy])=>Math.abs(a.x+x-b.x-dx)+Math.abs(a.y+y-b.y-dy)===1))));if(adjacency)continue;
 n++;level.mechanismAdaptation.change+=` 新族普通块 ${id} 换色 ${color}，原布局U16已淘汰。`;
 const upper=searchSpatial(level,api,{floor:16,normalize:true,maxMilliseconds:2500,maxStates:40000,maxTransitions:1000000,orderSeed:n});
 const replay=upper.drags?core.replayRevisedRoute(level,upper.drags):null;
 const row={n,id,color,SHA:sha256(level),status:upper.status,U:replay?.nonClearingDrags,complete:replay?.complete};console.log(row);history.push(row);
 const data={level,levelSha256:sha256(level),drags:upper.drags??[],upper,replay};
 if(replay?.valid&&replay.complete&&replay.nonClearingDrags>=11&&replay.nonClearingDrags<=15){
  level.preservedMoveTarget=replay.effectiveDrags;data.levelSha256=sha256(level);data.replay=core.replayRevisedRoute(level,data.drags);
  const projection=structuredClone(level);delete projection.coloredGrids;
  data.projection=projection;data.projectionSha256=sha256(projection);data.projectionRelation='Delete only coloredGrids; every original permitted pose is still legal, all bodies and costs retained.';
  data.lower=proveSymmetric(projection,api,{floor:11,maxMilliseconds:6000,maxStates:150000,normalizeMonotone:true});console.log({n,lower:data.lower.status,states:data.lower.exploredStates});
 }
 fs.writeFileSync(`${OUT}/mutation-${n}.json`,JSON.stringify(data,null,2));
 if(data.lower?.thresholdProven){console.log('QUALIFIED BOUNDS',n);break;}
}
fs.writeFileSync(OUT+'/mutation-history.json',JSON.stringify(history,null,2));
