import fs from'node:fs';import{loadSpatialApi,searchSpatial}from'./fifo-witness214.mjs';import{tile50}from'./tile-bottom50.mjs';import{fifoPayload,runNativeFifo}from'./native-fifo214-dominance.mjs';import{digest}from'../revised-preview-validation-v160.mjs';
const OUT='deliverables/continue211-220-20260930/design-new',api=await loadSpatialApi(),base=JSON.parse(fs.readFileSync(`${OUT}/candidate214-hidden-colors-v2-170.json`)).level,history=[];
const S=[[0,0]],H2=[[0,0],[1,0]],H3=[[0,0],[1,0],[2,0]],V2=[[0,0],[0,1]],Q2=[[0,0],[1,0],[0,1],[1,1]],L3=[[0,0],[0,1],[1,1]],L4=[[0,0],[1,0],[2,0],[0,1]],ids=['l214-c','l214-d','l214-e','l214-f','l214-g','l214-h','l214-i'];
function bad(bs){for(let i=0;i<bs.length;i++)for(let j=0;j<i;j++){const a=bs[i],b=bs[j];if((a.layers??[a.color])[0]!==(b.layers??[b.color])[0])continue;if(a.shape.some(([x,y])=>b.shape.some(([u,v])=>Math.abs(a.x+x-b.x-u)+Math.abs(a.y+y-b.y-v)===1)))return true;}return false;}
const combos=[[Q2,S,S],[S,Q2,S],[S,S,Q2],[V2,H2,H2],[H2,V2,H2],[H2,H2,V2]];let tries=0;
for(let family=0;family<combos.length;family++){
 const lower=structuredClone(base.blocks.filter(b=>ids.includes(b.id)));['l214-e','l214-h','l214-i'].forEach((id,i)=>lower.find(b=>b.id===id).shape=combos[family][i]);lower.find(b=>b.id==='l214-f').shape=Q2;const tilings=tile50(lower,128);console.log('FAMILY',family,tilings.length);
 for(let n=0;n<tilings.length&&tries<32;n++){
  const level=structuredClone(base);level.blocks=level.blocks.filter(b=>!ids.includes(b.id));level.blocks.push(...structuredClone(tilings[n]));if(bad(new api.PuzzleModel(level).snapshot().blocks.filter(b=>!b.shutterId)))continue;
  tries++;const p=structuredClone(level);p.mechanismRules='revised-2026-09-23-v1.4';const result=searchSpatial(p,api,{floor:21,maxMilliseconds:6000,maxStates:120000,normalize:true,diagnosticTrace:true,orderSeed:family+n}),replay=result.drags?api.replayRevisedRoute(level,result.drags):null,entry={family,n,tries,status:result.status,U:result.cost,maxClears:result.maxClearsSeen};
  if(replay?.valid&&replay.complete){level.preservedMoveTarget=result.drags.length;level.mechanismAdaptation.change+=' 下舱普通三体改原向大块并真实重排，保开局本体数/20格覆盖及全部机关库存；两壳与冰8原体不改。';if(result.cost>=16)entry.lower=runNativeFifo(fifoPayload(level,api,{floor:16,maxMilliseconds:6000,maxStates:2000000}).p);}
  console.log(JSON.stringify(entry));history.push({...entry,levelSha256:digest(level)});fs.writeFileSync(`${OUT}/candidate214-lower-q2-${family}-${n}.json`,JSON.stringify({level,levelSha256:digest(level),result,replay,lower:entry.lower},null,2));fs.writeFileSync(`${OUT}/history214-lower-q2.json`,JSON.stringify(history,null,2));if(entry.lower?.thresholdProven)process.exit(0);
 }
}

