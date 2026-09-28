import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadApi,BASELINE,auditCandidate,proveFloor,ruleGate} from './remake41to50-v146.mjs';
import {loadReviewedSourceCatalog,shapeClass} from './remake41to50-source-v146.mjs';
import {pack,seededRng} from '../deliverables/remake21-30-v139-20260924/agent28-30/packing.mjs';
import {search} from '../deliverables/remake41-50-v146-20260924/root48/search-to-cut.mjs';
import {uniqueCurtainSuffix} from './remake21to30-unique-suffix-v139.mjs';
import {measureRoute} from './remake21to30-quality.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
export const OUT='deliverables/remake41-50-v146-20260924/root48';
const rect=(x,y,w,h)=>Array.from({length:w*h},(_,i)=>[x+i%w,y+Math.floor(i/w)]);
const save=(name,value)=>{fs.mkdirSync(OUT,{recursive:true});const p=`${OUT}/${name}-${Date.now()}.json`;fs.writeFileSync(p,JSON.stringify(value,null,2)+'\n',{flag:'wx'});return p;};
const openingReason='源12体占25格、已知帘下10体占28格，共53格超过保留51格棋盘2格。保持全部源体、颜色及四壳配对，仅两个普通H2缩为SINGLE减2格；纵向28格帘造成外围单列通道，另两个H2同面积改V2完成原向满铺。opening-capacity.json穷尽六处帘位证实0/1件换V2都无法铺满，两件是几何下界；壳若换同面积形状，其红→cyan配对不变，不删壳或机关。';
const hiddenReason='保留源10体28格和四SQ2（含全部三壳）；本棋盘不能容纳7×4帘，唯一面积28可容纳矩形是4×7。七格高的四列均为奇数，原SQ2/V2每列贡献偶数，至少两普通V2需同面积变H2；两块H2恰好提供四列奇数。只作此最小换形，原图原向且不旋转素材。';
function envelope(level,drags,source,seed){
 const squareChanged=source.stages[0].items.some(i=>i.shape==='SQ2'&&shapeClass(level.blocks.find(b=>b.id===i.id).shape)!=='SQ2');
 const openReason=squareChanged?'源53格对保留51格必须减2格，仅一普通SQ2改V2减少2格并保独立体及配色；外围单列道另两H2同面积改V2，opening-square-adaptation.json穷尽证实此面积方案至少需三个竖双格。总三载体必要适配，全部壳配对保持，未改机关数量或初值。':openingReason;
 const mapping=Object.fromEntries(source.stages.flatMap(s=>s.items.map(i=>[i.id,[i.id]])));
 const carrierShapeRationales={};for(const st of source.stages)for(const i of st.items)if(shapeClass(level.blocks.find(b=>b.id===i.id).shape)!==i.shape)carrierShapeRationales[i.id]=st.id==='opening'?openReason:hiddenReason;
 const retained=new Set(level.gates.map(g=>g.sourceId));
 const data={level,drags,seed:`native48-${seed}`,sourceAdaptation:{colorMapping:Object.fromEntries(source.fullColors.map(c=>[c,c])),stageMapping:{'cover-1':'48-cover13'},blockMapping:mapping,carrierShapeRationales,stages:{opening:{rationale:openReason},'cover-1':{rationale:hiddenReason}},gateBindings:level.gates.map(g=>({sourceId:g.sourceId,gateId:g.id})),omittedGates:source.gates.filter(g=>!retained.has(g.id)).map(g=>({sourceId:g.id,reason:'源9口含蓝/红/黄各两个同色普通口；本游戏每色唯一，保留每色较早解锁的原口和原计数，移除该同色重复口，未把初值改小。'}))},originality:{layoutIntent:'四列纵向真帘与侧边窄道、下部宽区围成新的两阶段空间。',alignment:'帘区四列七行整齐满铺；外围色块对齐冻结棋盘行列及两侧外扩区。',changes:'源上下分区7×4帘改为纵向4×7帘，空间分区、邻接通道和出口位置重排，非仅镜像换色。',constraints:'保51格原棋盘、22源体/四壳、帘13与保留门逐值；差额2格及隐藏奇偶冲突最小适配逐项说明。'},design:{primaryMechanism:'先解冻外围出口并剥壳推进13计数，随后大方块与高计数冰门组合控制帘下清场。',concreteDecision:'外围窄道中的色块必须为不同颜色的出口让位；帘下剥壳后需再次选择停车位置，避免阻住后续大方块。'}};
 for(const g of level.gates)delete g.sourceId;return data;
}
function makeGates(level,cover,source,rng){
 const pairs=[[1,3],[1,4],[2,4]],top=pairs[Math.floor(rng.rand()*3)],bottom=pairs[Math.floor(rng.rand()*3)];
 const slots=[{side:'top',offset:top[0],size:2},{side:'top',offset:top[1],size:2},{side:'bottom',offset:bottom[0],size:2},{side:'bottom',offset:bottom[1],size:2},
 ...['left','right'].map(side=>({side,offset:rng.rand()<.5?5:6,size:2}))];
 const chosen=slots,unique=source.gates.filter((g,i)=>source.gates.findIndex(x=>x.color===g.color)===i),gs=rng.shuffle(unique);
 return gs.map((g,i)=>({...chosen[i],id:`48-g-${g.color}`,color:g.color,...(g.frozen?{frozen:g.frozen}:{}),sourceId:g.id}));
}
function prefixCanEverExit(level){
 const cover=level.shutters[0],legal=new Set(level.playable.filter(([x,y])=>x<cover.x||x>=cover.x+cover.width||y<cover.y||y>=cover.y+cover.height).map(String));
 for(const b of level.blocks.filter(b=>!b.shutterId)){
  const bw=1+Math.max(...b.shape.map(p=>p[0])),bh=1+Math.max(...b.shape.map(p=>p[1])),q=[[b.x,b.y]],seen=new Set([String(q[0])]);
  for(let n=0;n<q.length;n++)for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const p=[q[n][0]+dx,q[n][1]+dy],k=String(p);if(!seen.has(k)&&b.shape.every(([x,y])=>legal.has(String([x+p[0],y+p[1]])))){seen.add(k);q.push(p);}}
  for(const color of b.layers??[b.color]){const g=level.gates.find(g=>g.color===color),horizontal=['top','bottom'].includes(g.side);
   if(!q.some(([x,y])=>(g.side==='top'?y===0:g.side==='bottom'?y+bh===level.height:g.side==='left'?x===0:x+bw===level.width)&&(horizontal?x:y)>=g.offset&&(horizontal?x+bw:y+bh)<=g.offset+g.size))return false;
  }
 }return true;
}
export async function run(start=1,limit=2000){
 ruleGate();const {api}=await loadApi(),baseline=JSON.parse(fs.readFileSync(BASELINE)),base=baseline.levels[47],source=loadReviewedSourceCatalog([48]).records[48],stats={};let best=Infinity;
 const fail=k=>stats[k]=(stats[k]??0)+1;
 for(let seed=start;seed<start+limit;seed++){
  if(seed%25===0)console.log(JSON.stringify({seed,best:Number.isFinite(best)?best:null,stats}));
  const rng=seededRng(seed),level=structuredClone(base.level),cover={id:'48-cover13',x:rng.rand()<.5?1:2,y:Math.floor(rng.rand()*3),width:4,height:7,count:13};
  const hc=rect(cover.x,cover.y,4,7),openingCells=level.playable.filter(p=>!hc.some(q=>String(q)===String(p)));
  const open=source.stages[0].items.map(i=>({...i,sourceId:i.id,kind:i.shape})),hidden=source.stages[1].items.map(i=>({...i,sourceId:i.id,kind:i.shape}));
  if(process.env.KEEP_OPENING_SQUARES==='1'){
   for(const i of rng.shuffle(open.filter(i=>i.kind==='H2'&&!i.core)).slice(0,2))i.kind='SINGLE';
   for(const i of rng.shuffle(open.filter(i=>i.kind==='H2')).slice(0,2))i.kind='V2';
  }else{
   const reduced=rng.shuffle(open.filter(i=>i.kind==='SQ2'))[0];reduced.kind='V2';
   const partner=open.find(i=>i.color===reduced.color&&i.kind==='H2');partner.kind='V2';
   rng.shuffle(open.filter(i=>i.kind==='H2'))[0].kind='V2';
  }
  for(const i of rng.shuffle(hidden.filter(i=>i.kind==='V2')).slice(0,2))i.kind='H2';
  const op=pack(open,openingCells,rng,8000,true);if(!op){fail('opening-pack');continue;}
  const hi=pack(hidden,hc,rng,8000,true);if(!hi){fail('hidden-pack');continue;}
  level.blocks=[...op.map(b=>({...b,shutterId:undefined})),...hi.map(b=>({...b,shutterId:cover.id}))].map(b=>({id:b.sourceId,x:b.x,y:b.y,shape:b.shape,color:b.color,...(b.core?{layers:[b.color,b.core]}:{}),...(b.shutterId?{shutterId:b.shutterId}:{})}));
  level.shutters=[cover];delete level.generators;level.difficulty='hard';level.preservedMoveTarget=base.starTargets.moveTarget;
  level.gates=makeGates(level,cover,source,rng);const data=envelope(level,[],source,seed);
  try{api.validateLevel(level);}catch(e){fail('validate-'+String(e.message).slice(0,65));continue;}
  let found;const perm=a=>a.length===1?[a]:a.flatMap((x,i)=>perm(a.filter((_,j)=>i!==j)).map(rest=>[x,...rest]));
  const originals=structuredClone(level.gates);let localBest=-1;
  for(const arrangement of rng.shuffle(perm([0,1,2,3,4,5]))){
   level.gates=originals.map((g,i)=>({...g,color:originals[arrangement[i]].color,id:originals[arrangement[i]].id,frozen:originals[arrangement[i]].frozen}));
   if(!prefixCanEverExit(level)){fail('geometric-prefix-impossible');continue;}
   let trial=search(level,{floor:21,maxStates:30000,maxMilliseconds:150,goalClears:13});
   if(trial.status==='unknown'&&trial.maxClears>=5)trial=search(level,{floor:21,maxStates:250000,maxMilliseconds:4000,goalClears:13});
   if(trial.status==='witness'){
    const first=api.replayRevisedRoute(level,trial.drags);
    if(first.valid&&first.clearEvents===13){
     const suffix=uniqueCurtainSuffix(level).level,tail=search(suffix,{floor:21-trial.cost,maxStates:150000,maxMilliseconds:5000});
     if(tail.status==='witness')trial={...trial,cost:trial.cost+tail.cost,drags:[...trial.drags,...tail.drags]};
     else {save('prefix48',{level:structuredClone(level),prefix:trial,tail,seed});trial={...trial,status:'prefix-only',maxClears:13};}
    }else trial={...trial,status:'prefix-invalid',maxClears:13};
   }
   if(trial.maxClears>=8){const diagnostic=save('partial48',{level:structuredClone(level),trial,seed});console.log(JSON.stringify({seed,partial:trial.maxClears,cost:trial.partialCost,states:trial.states,stop:trial.stop,diagnostic}));}
   if(trial.status==='witness'&&trial.cost<16){fail('too-easy-'+trial.cost);continue;}
   if(trial.status==='witness'){found=trial;break;}
   if((trial.maxClears??0)>localBest){localBest=trial.maxClears??0;found=trial;}
  }
  if(!found||found.status!=='witness'){fail('search-'+(found?.maxClears??found?.status??'no-permutation'));continue;}
  if(found.cost<16){fail('too-easy-'+found.cost);continue;}
  // Gate bindings follow source ID/color, not a slot; rebuild after search permutation.
  data.sourceAdaptation.gateBindings=source.gates.filter((g,i)=>source.gates.findIndex(x=>x.color===g.color)===i).map(g=>({sourceId:g.id,gateId:level.gates.find(x=>x.color===g.color).id}));
  try{auditCandidate(data,baseline,api);}catch(e){fail('audit-'+String(e.message).slice(0,65));continue;}
  const replay=api.replayRevisedRoute(level,found.drags);if(!replay.valid||!replay.complete){fail('replay');continue;}
  const measurement=measureRoute(level,found.drags,api);
  data.drags=found.drags;const file=save('candidate48',data);best=Math.min(best,found.cost);console.log(JSON.stringify({file,U:found.cost,multi:measurement.multiCellDrags,single:measurement.singleCellDrags,stats}));
  const proof=proveFloor(level,api,{maxStates:500000,maxMilliseconds:15000});const evidence=save('floor48',{candidate:file,levelSha256:digest(level),proof});
  if(proof.thresholdProven){console.log(JSON.stringify({CERTIFIED:file,evidence,L:16,U:found.cost}));return {file,evidence};}
  fail('floor-'+proof.status);
 }
 console.log(JSON.stringify({finished:true,best:Number.isFinite(best)?best:null,stats}));
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)await run(Number(process.argv[2]??1),Number(process.argv[3]??2000));
