import fs from'node:fs';import{loadSpatialApi,searchSpatial}from'./fifo-witness214.mjs';import{tile50}from'./tile-bottom50.mjs';import{staticFloor}from'./native-static219.mjs';import{fifoPayload,runNativeFifo}from'./native-fifo214-dominance.mjs';import{digest}from'../revised-preview-validation-v160.mjs';
const OUT='deliverables/continue211-220-20260930/design-new',api=await loadSpatialApi(),old=JSON.parse(fs.readFileSync(`${OUT}/probe214-compact50v4-0.json`)),base=old.level,prefix=old.result.partialDrags.slice(0,-1),history=[];let seed=214614;function rnd(n){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)%n;}
function bad(bs){for(let i=0;i<bs.length;i++)for(let j=0;j<i;j++){const a=bs[i],b=bs[j];if((a.layers??[a.color])[0]!==(b.layers??[b.color])[0])continue;if(a.shape.some(([x,y])=>b.shape.some(([u,v])=>Math.abs(a.x+x-b.x-u)+Math.abs(a.y+y-b.y-v)===1)))return true;}return false;}
const hidden=tile50(base.blocks.filter(b=>b.shutterId),600,'l214-hidden-pink');let qualified=0;
for(let n=0;n<120;n++){
 const level=structuredClone(base),bs=structuredClone(hidden[rnd(hidden.length)]),mutable=bs.filter(b=>!b.layers),sourceColors=mutable.map(b=>b.color);
 // Swap seven ordinary colors among complete original shapes; preserve the source color inventory and shell exactly.
 for(let i=sourceColors.length-1;i>0;i--){const j=rnd(i+1);[sourceColors[i],sourceColors[j]]=[sourceColors[j],sourceColors[i]];}mutable.forEach((b,i)=>b.color=sourceColors[i]);
 if(bad(bs))continue;level.blocks=level.blocks.filter(b=>!b.shutterId);level.blocks.push(...bs);
 const reduced=structuredClone(level);reduced.blocks=structuredClone(bs).map(b=>{delete b.shutterId;return b});delete reduced.generators;delete reduced.shutters;reduced.mechanismRules='revised-2026-09-23-v1.4';
 const cut=staticFloor(reduced,api,{floor:4,maxMilliseconds:1200,maxStates:150000});const entry={n,hiddenSha256:digest(bs),cut};history.push(entry);
 if(!cut.thresholdProven){console.log('hidden',n,cut.status,cut.relaxedNonClearingDrags);continue;}
 const p=structuredClone(level);p.mechanismRules='revised-2026-09-23-v1.4';const result=searchSpatial(p,api,{floor:21,maxMilliseconds:5000,maxStates:80000,normalize:true,diagnosticTrace:true,orderSeed:n,initialDrags:prefix}),replay=result.drags?api.replayRevisedRoute(level,result.drags):null;
 entry.U=result.cost;entry.status=result.status;entry.maxClears=result.maxClearsSeen;console.log('FULL',n,result.status,result.cost,result.maxClearsSeen);
 if(replay?.valid&&replay.complete){level.preservedMoveTarget=result.drags.length;level.mechanismAdaptation.change='原创50格对称无内洞、两个真实FIFO及全部6货、3外壳、数字冰2/8、20格lift及8隐藏体保持。隐藏7普通体按用户换色授权在原库存颜色多重集内重新分配，原向形状/8体总库存/绿蓝外壳不变，源值与设计逐项对照。首次货真实初始化投放满铺；完整路线总拖作三星。';entry.lower=runNativeFifo(fifoPayload(level,api,{floor:16,maxMilliseconds:6000,maxStates:1400000}).p);console.log('BOUND',n,entry.lower.status,entry.lower.frontierCost,entry.lower.relaxedNonClearingDrags);}
 fs.writeFileSync(`${OUT}/candidate214-hidden-colors-${n}.json`,JSON.stringify({level,levelSha256:digest(level),result,replay,cut,lower:entry.lower},null,2));fs.writeFileSync(`${OUT}/history214-hidden-colors.json`,JSON.stringify(history,null,2));if(entry.lower?.thresholdProven||++qualified>=12)break;
}
fs.writeFileSync(`${OUT}/history214-hidden-colors.json`,JSON.stringify(history,null,2));
