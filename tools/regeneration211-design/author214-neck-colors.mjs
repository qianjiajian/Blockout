import fs from'node:fs';import{loadSpatialApi,searchSpatial}from'./fifo-witness214.mjs';import{fifoPayload,runNativeFifo}from'./native-fifo214-dominance.mjs';import{digest}from'../revised-preview-validation-v160.mjs';
const OUT='deliverables/continue211-220-20260930/design-new',api=await loadSpatialApi(),history=[];
function bad(bs){for(let i=0;i<bs.length;i++)for(let j=0;j<i;j++){const a=bs[i],b=bs[j];if((a.layers??[a.color])[0]!==(b.layers??[b.color])[0])continue;if(a.shape.some(([x,y])=>b.shape.some(([u,v])=>Math.abs(a.x+x-b.x-u)+Math.abs(a.y+y-b.y-v)===1)))return true;}return false;}
const specs=[['green','yellow','pink'],['purple','yellow','pink'],['orange','yellow','pink'],['blue','yellow','pink'],['red','yellow','pink'],['pink','yellow','orange'],['pink','yellow','blue'],['green','yellow','pink'],['purple','yellow','pink'],['orange','yellow','pink'],['blue','yellow','pink'],['red','yellow','pink']];
for(let n=0;n<specs.length;n++){
 const level=JSON.parse(fs.readFileSync(`${OUT}/candidate214-hidden50b-${32+n}.json`)).level;
 ['l214-fill50-3','l214-fill50-4','l214-fill50-5'].forEach((id,i)=>level.blocks.find(b=>b.id===id).color=specs[n][i]);if(n>=7)level.blocks.find(b=>b.id==='l214-fill50-2').color=['pink','yellow','orange','blue','red'][n-7];
 if(bad(new api.PuzzleModel(level).snapshot().blocks.filter(b=>!b.shutterId)))continue;
 level.mechanismAdaptation.change+=' 中间普通H3换色以改变腾挪顺序，数字冰和队列/外壳库存保持。';
 const p=structuredClone(level);p.mechanismRules='revised-2026-09-23-v1.4';const result=searchSpatial(p,api,{floor:21,maxMilliseconds:6000,maxStates:100000,normalize:true,diagnosticTrace:true,orderSeed:n}),replay=result.drags?api.replayRevisedRoute(level,result.drags):null,entry={n,status:result.status,U:result.cost,maxClears:result.maxClearsSeen};
 if(replay?.valid&&replay.complete){level.preservedMoveTarget=result.drags.length;if(result.cost>=16)entry.lower=runNativeFifo(fifoPayload(level,api,{floor:16,maxMilliseconds:6000,maxStates:1400000}).p);}
 history.push({...entry,levelSha256:digest(level)});console.log(JSON.stringify(entry));fs.writeFileSync(`${OUT}/candidate214-neck-colors-${n}.json`,JSON.stringify({level,levelSha256:digest(level),result,replay,lower:entry.lower},null,2));fs.writeFileSync(`${OUT}/history214-neck-colors.json`,JSON.stringify(history,null,2));if(entry.lower?.thresholdProven)break;
}
