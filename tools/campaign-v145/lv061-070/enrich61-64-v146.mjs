import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi} from '../../remake21to30-v120.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {compile,each} from '../../../deliverables/remake31-200-v145-20260924/batches/lv061-070/author61-64/local-graph.mjs';
import {compileLevel,stateFromSnapshot,forEachGesture} from '../../../deliverables/remake31-200-v145-20260924/batches/lv061-070/author61-64/axis-mask-floor.mjs';
import {checkSymmetryFloor} from '../../../deliverables/remake31-200-v145-20260924/batches/lv061-070/author61-64/axis-symmetry-floor.mjs';
import {verifyDecisions} from './author-axis-decisions.mjs';
import {verifyLocalMechanismChoices} from '../../remake21to30-v139.mjs';
import {measureRoute} from '../../remake21to30-quality.mjs';
import {compile as autoCompile,stateOf as autoState,each as autoEach,checkAutomaticGeneratorFloor} from './automatic-generator-floor.mjs';
const file=process.argv[2],data=JSON.parse(fs.readFileSync(file)),{level,drags}=data,{api}=await loadApi();
const apply=(m,d)=>{m.beginAction();for(const p of d.path)assert(m.moveBlockStep(d.blockId,...p));if(d.exitSide)assert(m.tryExit(d.blockId,d.exitSide).ok);assert(m.commitAction());};
const compileAny=l=>l.generators?.length?autoCompile(l,api):compileLevel(l),stateAny=(c,s)=>level.generators?.length?autoState(c,s):stateFromSnapshot(c,s),eachAny=(c,s,visit)=>level.generators?.length?autoEach(c,s,(_next,cost,get)=>visit(-1,null,cost,get)):forEachGesture(c,s,visit);
const c=compileAny(level),m=new api.PuzzleModel(level);m.startCountdown();const found=[],axisCases=[],transitions=[];
for(let step=0;step<drags.length;step++){
 const d=drags[step],snap=m.snapshot(),state=stateAny(c,snap),prefix=drags.slice(0,step);
 if(step<drags.length-1)eachAny(c,state,(_i,_v,cost,get)=>{if(cost!==1)return;const wrong=get(),body=snap.blocks.find(b=>b.id===wrong.blockId);if(body.id===d.blockId||body.shape.length<2)return;
  const blocked=api.replayRevisedRoute(level,[...prefix,wrong,d]);if(blocked.valid||!blocked.error?.startsWith('Rejected move'))return;
  if(!api.replayRevisedRoute(level,[...prefix,wrong]).valid)return;const recovery={blockId:body.id,path:[[body.x,body.y],...wrong.path.slice(0,-1)].reverse()},restored=api.replayRevisedRoute(level,[...prefix,wrong,recovery]),initial=api.replayRevisedRoute(level,prefix);
  if(!restored.valid||restored.finalStateKey!==initial.finalStateKey)return;const full=[...prefix,wrong,recovery,...drags.slice(step)],r=api.replayRevisedRoute(level,full);if(!r.valid||!r.complete)return;
  found.push({atStep:step+1,beforeDrag:step+1,blockId:body.id,area:body.shape.length,correctDrag:d,legalWrongParking:wrong,blockedNextAction:d,recoveryDrag:recovery,fullRecoveredRoute:full,consequence:'多格误停堵住指定下一动作，恢复原锚点后原路线完整通关；不声称全局唯一顺序。'});return false;
 });
 for(const body of snap.blocks.filter(b=>b.movementAxis))if(!axisCases.some(x=>x.blockId===body.id)){
  const axis=body.movementAxis,changed=structuredClone(level);delete changed.blocks.find(b=>b.id===body.id).movementAxis;
  if(!api.replayRevisedRoute(changed,prefix).valid)continue;
  for(const[dx,dy]of axis==='horizontal'?[[0,-1],[0,1]]:[[-1,0],[1,0]]){const action={blockId:body.id,path:[[body.x+dx,body.y+dy]]};const original=api.replayRevisedRoute(level,[...prefix,action]),relaxed=api.replayRevisedRoute(changed,[...prefix,action]);if(!original.valid&&relaxed.valid){axisCases.push({blockId:body.id,movementAxis:axis,beforeDrag:step+1,prefix,blockedAction:action,originalRejection:original.error,relaxedAccepted:true,onlyRemovedProperty:'movementAxis',globalOptimalDifferenceProven:false});break;}}
 }
 apply(m,d);const after=m.snapshot();if(after.cleared!==snap.cleared)transitions.push({step:step+1,blockId:d.blockId,cleared:after.cleared,revealed:after.shutters.filter(s=>s.revealed&&!snap.shutters.find(x=>x.id===s.id).revealed).map(s=>s.id),thawedGates:after.gates.filter(g=>g.frozen===0&&(snap.gates.find(x=>x.id===g.id).frozen??0)>0).map(g=>g.id)});
}
data.decisionCases=[];for(const a of found)if(!data.decisionCases.some(b=>a.blockId===b.blockId)){data.decisionCases.push(a);if(data.decisionCases.length===3)break;}
data.curtainLocalChoices=[];
for(const curtain of level.shutters??[]){let result;
 for(let step=1;step<drags.length&&!result;step++){const prefix=drags.slice(0,step),start=api.replayRevisedRoute(level,prefix);if(!start.valid||start.complete||start.clearEvents<1||start.clearEvents>=curtain.count)continue;
  const changed=structuredClone(level);changed.shutters.find(s=>s.id===curtain.id).count=start.clearEvents;if(!api.replayRevisedRoute(changed,prefix).valid)continue;
  const n=new api.PuzzleModel(changed);n.startCountdown();prefix.forEach(d=>apply(n,d));const cc=compileAny(changed);
  eachAny(cc,stateAny(cc,n.snapshot()),(_i,_v,_cost,get)=>{const d=get();if(level.blocks.find(b=>b.id===d.blockId).shape.length<2||api.replayRevisedRoute(level,[...prefix,d]).valid||!api.replayRevisedRoute(changed,[...prefix,d]).valid)return;
   result={curtainId:curtain.id,originalCount:curtain.count,relaxedCount:start.clearEvents,beforeDrag:step+1,prefix,cleared:start.clearEvents,formalRemaining:JSON.parse(start.finalStateKey).shutters.find(s=>s.id===curtain.id).count,blockedAction:d,interpretation:'相同前缀只放宽这一卷帘计数，原先受阻的多格动作可执行，证明局部空间作用。'};return false;
  });
 }
 if(!result&&level.id===64){
  for(let step=drags.length-1;step>0&&!result;step--){
   const base=drags.slice(0,step),start=api.replayRevisedRoute(level,base);if(!start.valid||start.complete||start.clearEvents<1||start.clearEvents>=curtain.count)continue;
   const originalModel=new api.PuzzleModel(level);originalModel.startCountdown();base.forEach(d=>apply(originalModel,d));const originalCompiled=compileAny(level);
   eachAny(originalCompiled,stateAny(originalCompiled,originalModel.snapshot()),(_i,_v,cost,get)=>{if(cost!==1||result)return;const setup=get(),prefix=[...base,setup],ready=api.replayRevisedRoute(level,prefix);if(!ready.valid)return;
    const changed=structuredClone(level);changed.shutters.find(s=>s.id===curtain.id).count=ready.clearEvents;const relaxed=api.replayRevisedRoute(changed,prefix);if(!relaxed.valid)return;
    const n=new api.PuzzleModel(changed);n.startCountdown();prefix.forEach(d=>apply(n,d));const cc=compileAny(changed);
    eachAny(cc,stateAny(cc,n.snapshot()),(_i,_v,_cost,get)=>{const d=get();if(level.blocks.find(b=>b.id===d.blockId).shape.length<2||api.replayRevisedRoute(level,[...prefix,d]).valid||!api.replayRevisedRoute(changed,[...prefix,d]).valid)return;
     result={curtainId:curtain.id,originalCount:curtain.count,relaxedCount:ready.clearEvents,beforeDrag:prefix.length+1,prefix,cleared:ready.clearEvents,formalRemaining:JSON.parse(ready.finalStateKey).shutters.find(s=>s.id===curtain.id).count,blockedAction:d,setupParking:setup,interpretation:'从正式路线前缀加一次原图合法停车，只放宽这一帘计数后多格动作可执行；证明局部空间作用，不声称全局唯一顺序。'};return false;
    });if(result)return false;
   });
  }
 }
 assert(result,'Curtain local choice '+curtain.id);data.curtainLocalChoices.push(result);
}
data.sourceAdaptation={source:data.source,changes:data.adaptations,sourceIdMapping:level.blocks.map(b=>({blockId:b.id,sourceId:b.id.replace(`v146-${level.id}-`,''),shape:b.shape,color:b.color,movementAxis:b.movementAxis??null})),notExactReplica:true};
data.originality={layoutIntent:'按保存轮廓采用清晰横向满铺仓和上下对齐多格区，重组不同色块邻接通路。',alignment:'横帘完整六列对齐，开局独立块按合法原图轮廓填两侧阶梯区域。',changes:'重新安排开局、隐藏区域和各色出口，保来源种类及逐件轴向，非原坐标镜像或整体换色。',constraints:'保留原棋盘和评价，原向L3与上下缺角限制能使用的邻接；补齐缺少五格需两普通块。'};
data.design={primaryMechanism:'轴向块与卷帘揭示后的双向通路',concreteDecision:'四个有方向限制的块保持固定行或列，先释放低冰门形成工作位，揭帘后给隐藏水平轴向块让路。'};
data.axisLocalChoices=axisCases;data.mechanismProcess={transitions,axisBlocks:level.blocks.filter(b=>b.movementAxis).map(b=>b.id),complete:m.snapshot().complete};
data.freshAxisProof=level.generators?.length?checkAutomaticGeneratorFloor(level,api,{floor:11,maxStates:3000000,maxMilliseconds:Number(process.env.FLOOR_MS??120000)}):checkSymmetryFloor(level,{floor:level.id===63?21:5,maxStates:3000000,maxMilliseconds:Number(process.env.FLOOR_MS??120000)});
fs.writeFileSync(`deliverables/remake31-200-v145-20260924/batches/lv061-070/author61-64/proof${level.id}-${Date.now()}.json`,JSON.stringify({levelSha256:digest(level),proof:data.freshAxisProof},null,2)+'\n',{flag:'wx'});
assert(data.freshAxisProof.thresholdProven,JSON.stringify(data.freshAxisProof));
data.validation={decisions:verifyDecisions(data,api),localChoices:verifyLocalMechanismChoices(data,api),measurements:measureRoute(level,drags,api),axisLocalChoices:axisCases.length};
assert(data.validation.measurements.multiCellDrags>data.validation.measurements.singleCellDrags);assert(!level.blocks.some(b=>b.movementAxis)||axisCases.length>0);
if(level.id===62){data.originality={layoutIntent:'顶颈、帘仓与独立边缘投放口重新形成交叉工作区；源块形和层色逐体绑定。',alignment:'15格帘完整矩形与多格开局条带按格线对齐。',changes:'重排开局、7体冰隐藏层、生成口与七色门的位置；固定三货真实自动投放，非镜像或整体换色。'};data.design={primaryMechanism:'固定落点生成器与卷帘、外壳冰计数的空间协作',concreteDecision:'需要先为低冰色及剥壳留工作位，开帘后的冰5长块等待真实事件解冻；挪开落点占位时立即投放的新货会继续占用公共通路。'};data.freshAutomaticProof=data.freshAxisProof;delete data.freshAxisProof;}
data.levelSha256=digest(level);data.routeSha256=digest(drags);
const out=`deliverables/remake31-200-v145-20260924/batches/lv061-070/author61-64/candidate${level.id}-${Date.now()}.json`;fs.writeFileSync(out,JSON.stringify(data,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({out,id:level.id,L:level.id===62?11:data.freshAxisProof.floor,U:data.replay.nonClearingDrags,decisions:data.decisionCases.length,axes:axisCases.length,levelSha256:digest(level)}));
