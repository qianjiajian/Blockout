import fs from'node:fs';import{loadSpatialApi,searchSpatial}from'./fifo-witness214.mjs';import{fifoPayload,runNativeFifo}from'./native-fifo214-dominance.mjs';import{digest}from'../revised-preview-validation-v160.mjs';
const OUT='deliverables/continue211-220-20260930/design-new',api=await loadSpatialApi(),base=JSON.parse(fs.readFileSync(`${OUT}/candidate214-hidden-colors-v2-170.json`)).level,history=[];const H2=[[0,0],[1,0]];
base.playable=Array.from({length:70},(_,p)=>[p%7,Math.floor(p/7)]).filter(([x,y])=>y===0||y>=1&&y<=3&&x>=1&&x<=5||y>=4&&y<6&&x>=2&&x<=4||y>=6&&x>=1&&x<=5);
base.blocks.find(b=>b.id==='l214-fill50-0').x=1;base.blocks.find(b=>b.id==='l214-fill50-1').x=5;for(const id of ['l214-fill50-0','l214-fill50-1'])base.blocks.find(b=>b.id===id).y=1;
base.generators[0].spawn=[1,0];base.generators[0].offset=1;base.generators[1].spawn=[3,0];base.generators[1].offset=5;
for(const [id,minX] of [['l214-ql1',0],['l214-ql3',0],['l214-qr1',2],['l214-qr3',1]]){const b=base.blocks.find(b=>b.id===id),old=Math.min(...b.shape.map(p=>p[0]));b.shape=b.shape.map(([x,y])=>[x-old+minX,y]);}base.gates.find(g=>g.color==='purple').portals=[{side:'left',origin:[1,1],size:3}];base.gates.find(g=>g.color==='green').portals=[{side:'right',origin:[5,1],size:3}];
base.gates.find(g=>g.color==='pink').portals=[{side:'left',origin:[2,4],size:2}];base.gates.find(g=>g.color==='yellow').portals=[{side:'right',origin:[4,4],size:2}];base.blocks.push({id:'l214-shoulder-left',x:0,y:0,color:'orange',shape:H2},{id:'l214-shoulder-right',x:5,y:0,color:'blue',shape:H2});
for(const [color,offset] of [['purple',1],['green',1],['pink',4],['yellow',4]])base.gates.find(g=>g.color===color).offset=offset;function bad(bs){for(let i=0;i<bs.length;i++)for(let j=0;j<i;j++){const a=bs[i],b=bs[j];if((a.layers??[a.color])[0]!==(b.layers??[b.color])[0])continue;if(a.shape.some(([x,y])=>b.shape.some(([u,v])=>Math.abs(a.x+x-b.x-u)+Math.abs(a.y+y-b.y-v)===1)))return true;}return false;}
const specs=[['orange','blue','cyan','cyan'],['cyan','red','purple','green'],['red','cyan','cyan','cyan'],['green','purple','cyan','cyan'],['orange','blue','purple','green'],['blue','orange','cyan','cyan'],['purple','green','cyan','cyan'],['cyan','red','cyan','cyan'],['orange','cyan','purple','green'],['cyan','blue','purple','green'],['red','green','cyan','cyan'],['purple','red','cyan','cyan']];
for(let n=0;n<specs.length*3;n++){
 const level=structuredClone(base);['l214-shoulder-left','l214-shoulder-right','l214-fill50-0','l214-fill50-1'].forEach((id,i)=>level.blocks.find(b=>b.id===id).color=specs[n%specs.length][i]);level.blocks.find(b=>b.id==='l214-fill50-2').color=['green','purple','orange'][Math.floor(n/specs.length)];if(bad(new api.PuzzleModel(level).snapshot().blocks.filter(b=>!b.shutterId)))continue;
 level.mechanismAdaptation.change='原创48格左右对称轮廓；7×10外尺寸保持，首行7格供双机安装、下3行5格、2行3格颈及5×4下舱。两生成器等距内移到[1,0]/[3,0]，保持两台、逐件完整FIFO形色及口宽3，开局均被实块压住而未出首货。普通块原向重铺，全部3壳/数字冰2与8/20格8体lift保持，隐藏普通色分配适配明确记账，完整路线总拖作三星。';
 const p=structuredClone(level);p.mechanismRules='revised-2026-09-23-v1.4';const result=searchSpatial(p,api,{floor:21,maxMilliseconds:6000,maxStates:120000,normalize:true,diagnosticTrace:true,orderSeed:n}),replay=result.drags?api.replayRevisedRoute(level,result.drags):null,entry={n,status:result.status,U:result.cost,maxClears:result.maxClearsSeen};
 if(replay?.valid&&replay.complete){level.preservedMoveTarget=result.drags.length;if(result.cost>=16)entry.lower=runNativeFifo(fifoPayload(level,api,{floor:16,maxMilliseconds:6000,maxStates:2000000}).p);}
 console.log(JSON.stringify(entry));history.push({...entry,levelSha256:digest(level)});fs.writeFileSync(`${OUT}/candidate214-compact48v2-${n}.json`,JSON.stringify({level,levelSha256:digest(level),result,replay,lower:entry.lower},null,2));fs.writeFileSync(`${OUT}/history214-compact48v2.json`,JSON.stringify(history,null,2));if(entry.lower?.thresholdProven)break;
}




