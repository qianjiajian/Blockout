import fs from 'node:fs';import {loadSpatialApi,searchSpatial} from './remake201to210-v123-floor.mjs';import {loadContinuationRuntime,sha256} from './continuation211-runtime.mjs';import {proveWithLifts} from './regeneration220-design/prove-after-lift.mjs';
const OUT='deliverables/continue211-220-20260930/design213-original';fs.mkdirSync(OUT,{recursive:true});
const api=await loadSpatialApi(),core=await loadContinuationRuntime(),history=[];let n=0;
for(const baseId of [2,7])for(const left of ['blue','yellow','orange'])for(const right of ['blue','green','orange']){
 const prior=JSON.parse(fs.readFileSync(`deliverables/continue211-220-20260930/design212-new/source213/scored-candidate213-${baseId}.json`)),level=structuredClone(prior.level);
 level.playable.push([2,6],[4,6]);level.playable.sort((a,b)=>a[1]-b[1]||a[0]-b[0]);
 level.blocks.push({id:'l213-neck-left',x:2,y:6,color:left,shape:[[0,0]]},{id:'l213-neck-right',x:4,y:6,color:right,shape:[[0,0]]});
 const adjacency=level.blocks.some((b,i)=>level.blocks.slice(i+1).some(a=>a.shutterId===b.shutterId&&(a.layers?.[0]??a.color)===(b.layers?.[0]??b.color)&&a.shape.some(([x,y])=>b.shape.some(([dx,dy])=>Math.abs(a.x+x-b.x-dx)+Math.abs(a.y+y-b.y-dy)===1))));if(adjacency)continue;
 n++;level.mechanismAdaptation.change+=' 原创外轮廓改80格：中央1格颈拓为3格，新增两块普通S真实满铺，维持7×12、上下双舱及左右对称。';
 const upper=searchSpatial(level,api,{floor:16,normalize:true,maxMilliseconds:3500,maxStates:70000,maxTransitions:1500000,orderSeed:n}),replay=upper.drags?core.replayRevisedRoute(level,upper.drags):null;
 const row={n,baseId,left,right,sha256:sha256(level),status:upper.status,U:replay?.nonClearingDrags};history.push(row);console.log(row);
 const data={level,drags:upper.drags??[],upper,replay,sourceReview:prior.sourceReview};
 if(replay?.valid&&replay.complete&&replay.nonClearingDrags>=11&&replay.nonClearingDrags<=15){level.preservedMoveTarget=replay.effectiveDrags;data.levelSha256=sha256(level);data.replay=core.replayRevisedRoute(level,data.drags);data.lower=proveWithLifts(level,api,{floor:11,maxMilliseconds:8000,maxStates:150000,normalizeMonotone:true});console.log({n,lower:data.lower.status,states:data.lower.exploredStates});}
 fs.writeFileSync(`${OUT}/candidate-${n}.json`,JSON.stringify(data,null,2));
 if(data.lower?.thresholdProven)break;
}
fs.writeFileSync(OUT+'/history.json',JSON.stringify(history,null,2));
