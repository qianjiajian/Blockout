import fs from'node:fs';import{loadSpatialApi,searchSpatial}from'./fifo-witness214.mjs';import{fifoPayload,runNativeFifo}from'./native-fifo214-cut.mjs';import{digest}from'../revised-preview-validation-v160.mjs';
const OUT='deliverables/continue211-220-20260930/design-new',api=await loadSpatialApi(),old=JSON.parse(fs.readFileSync(`${OUT}/candidate214-hidden-colors-v2-170.json`)),base=old.level,history=[];let seed=214909;function rnd(n){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)%n;}
function bad(bs){for(let i=0;i<bs.length;i++)for(let j=0;j<i;j++){const a=bs[i],b=bs[j];if((a.layers??[a.color])[0]!==(b.layers??[b.color])[0])continue;if(a.shape.some(([x,y])=>b.shape.some(([u,v])=>Math.abs(a.x+x-b.x-u)+Math.abs(a.y+y-b.y-v)===1)))return true;}return false;}
let accepted=0;
for(let n=0;n<100;n++){
 const level=structuredClone(base);for(const id of ['l214-e','l214-h','l214-i'])level.blocks.find(b=>b.id===id).color=['red','green','blue','purple','pink','yellow','orange','cyan'][rnd(8)];
 if(bad(new api.PuzzleModel(level).snapshot().blocks.filter(b=>!b.shutterId)))continue;
 const {p}=fifoPayload(level,api,{floor:13,maxMilliseconds:2500,maxStates:350000}),prefixProof=runNativeFifo({...p,terminalCover:0});const entry={n,prefixProof};history.push(entry);console.log('PREFIX',n,prefixProof.status,prefixProof.frontierCost,prefixProof.relaxedNonClearingDrags);
 if(!prefixProof.thresholdProven){if(++accepted>=24)break;continue;}
 const actual=structuredClone(level);actual.mechanismRules='revised-2026-09-23-v1.4';const result=searchSpatial(actual,api,{floor:21,maxMilliseconds:6000,maxStates:100000,normalize:true,diagnosticTrace:true,initialDrags:old.result.drags.slice(0,7),orderSeed:n}),replay=result.drags?api.replayRevisedRoute(level,result.drags):null;entry.U=result.cost;console.log('FULL',n,result.status,result.cost,result.maxClearsSeen);
 level.mechanismAdaptation.change+=' 普通下舱三体另换色，保原形状、坐标、2/8数字冰、全部3壳及FIFO；隐藏只交换源普通颜色，不减少任何库存。';if(replay?.valid&&replay.complete)level.preservedMoveTarget=result.drags.length;
 fs.writeFileSync(`${OUT}/candidate214-lower-colors-${n}.json`,JSON.stringify({level,levelSha256:digest(level),result,replay,prefixProof,hiddenCutSource:`${OUT}/candidate214-hidden-colors-v2-170.json`},null,2));fs.writeFileSync(`${OUT}/history214-lower-colors.json`,JSON.stringify(history,null,2));if(replay?.valid&&replay.complete)break;if(++accepted>=24)break;
}
fs.writeFileSync(`${OUT}/history214-lower-colors.json`,JSON.stringify(history,null,2));
