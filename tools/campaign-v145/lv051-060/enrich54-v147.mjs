import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi} from '../../native-block-repair-v143.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
import {compileLevel,forEachGesture,stateFromSnapshot} from './campaign-axis-key-graph-v146.mjs';
const lock=verifyRulesLock();assert(lock.ok);const {api}=await loadApi();
const file=process.argv[2],data=JSON.parse(fs.readFileSync(file)),{level,drags}=data;assert.equal(level.id,54);
const apply=(m,d)=>{m.beginAction();for(const p of d.path)assert(m.moveBlockStep(d.blockId,...p));if(d.exitSide)assert(m.tryExit(d.blockId,d.exitSide).ok);assert(m.commitAction());};
const compiled=compileLevel(level),model=new api.PuzzleModel(level);model.startCountdown();const found=[],local=[];
for(let i=0;i<drags.length;i++){
 const prefix=drags.slice(0,i),next=drags[i],before=model.snapshot(),state=stateFromSnapshot(compiled,before),beforeReplay=api.replayRevisedRoute(level,prefix);
 if(found.length<3)forEachGesture(compiled,state,(_index,_value,cost,get)=>{
  if(cost!==1)return;const wrong=get(),b=before.blocks.find(b=>b.id===wrong.blockId);if(b.shape.length<2||b.id===next.blockId||found.some(c=>c.legalWrongParking.blockId===b.id))return;
  if(!api.replayRevisedRoute(level,[...prefix,wrong]).valid||api.replayRevisedRoute(level,[...prefix,wrong,next]).valid)return;
  const recovery={blockId:b.id,path:[[b.x,b.y],...wrong.path.slice(0,-1)].reverse()},r=api.replayRevisedRoute(level,[...prefix,wrong,recovery]);
  if(!r.valid||r.finalStateKey!==beforeReplay.finalStateKey)return;
  const full=[...prefix,wrong,recovery,...drags.slice(i)],f=api.replayRevisedRoute(level,full);if(!f.valid||!f.complete)return;
  found.push({atStep:i+1,legalWrongParking:wrong,blockedNextAction:next,recoveryDrag:recovery,fullRecoveredRoute:full,interpretation:'多格误停阻挡指定下一动作；恢复原模型状态后原路线完整通关，不声称该错误必需两步恢复。'});if(found.length>=3)return false;
 });
 for(const cover of level.shutters)if(before.cleared>0&&before.cleared<cover.count&&!local.some(c=>c.kind==='curtain'&&c.id===cover.id)){
  const relaxed=structuredClone(level);relaxed.shutters.find(s=>s.id===cover.id).count=before.cleared;
  const relaxedReplay=api.replayRevisedRoute(relaxed,prefix);if(!relaxedReplay.valid)continue;
  const cc=compileLevel(relaxed),ss=stateFromSnapshot(cc,JSON.parse(relaxedReplay.finalStateKey));
  forEachGesture(cc,ss,(_j,_v,_w,get)=>{const d=get();if(relaxed.blocks.find(b=>b.id===d.blockId).shape.length<2)return;if(api.replayRevisedRoute(level,[...prefix,d]).valid||!api.replayRevisedRoute(relaxed,[...prefix,d]).valid)return;
   local.push({kind:'curtain',id:cover.id,originalCount:cover.count,relaxedCount:before.cleared,prefix,blockedAction:d,formalRejected:true,relaxedAllowed:true});return false;
  });
 }
 apply(model,next);
}
assert(model.snapshot().complete);assert(found.length);assert(local.length);
data.ruleVersion=lock.activeVersion;data.decisionCases=found;data.localMechanismCases=local;
data.sourceAdaptation={mode:'source-reviewed-minimal-native-and-full-cover-adaptation',mapping:level.blocks.filter(b=>!b.id.startsWith('s54-fill')).map(b=>({sourceId:b.id.replace('s54-',''),candidateId:b.id,stage:b.shutterId??'opening'})),changes:[
 {sourceIds:['13-yellow','13-green'],reason:'来源两件L3外壳无原向完整壳图，分别改同面积H3/V3完整壳形，颜色层及green冰4保持。'},
 {sourceIds:['13-purple'],reason:'两件壳适配后，三件同q0 L3不能铺满保留棋盘内任何21格矩形；穷举3×7/7×3无解，额外仅把普通purple L3换为同面积直条。',certificate:'agent51-54/independent-tiling54-1790249796184.json'},
 {sourceIds:['21-green'],added:level.blocks.filter(b=>b.id.startsWith('s54-fill')).map(b=>({id:b.id,color:b.color,area:1})),reason:'来源3×3帘下仅CROSS5而四角为空；保十字整体原图，以4普通单格填四角，满足隐藏逐层满铺。'}],nativeOrientation:'其余L3及CROSS使用现有q0完整原向，不旋转贴图；源形方向与布局方向分别记录。',mechanismInstancesPreserved:true,sourceBodies:26,designBodies:30,sourceIrregularBodies:6,designIrregularBodies:3};
data.originality={layoutIntent:'七行竖向隐藏区域与四列横向分层区域相邻，开局4×4释放区居中。',alignment:'3列与4列区边界对齐，5/8帘各4×3，13帘3×7，21帘3×3。',changes:'重新分配帘侧别与揭露区域顺序，改变开局与隐藏组内邻接及出口通道；非整图镜转。',constraints:'全部区域总70格保持；来源已知面积和计数保留，四角填充与三个必要换形另列。'};
data.design={primaryMechanism:'四级揭帘、隐藏冰与壳色切换的空间顺序',concreteDecision:'先在中央开局工作区清除黄色并解开冰2/3；5、8、13、21逐级揭帘，13层内横轴蓝L3需要贯通行，壳内cyan须等22值门释放。多格停位必须保住后续通路。',humanBlindTested:false};
data.formalAdopted=false;data.pointerValidated=false;data.lowerBoundPending=true;
data.bindings={input:{file,sha256:digest(fs.readFileSync(file))},level:digest(level),route:digest(drags),enricher:digest(fs.readFileSync(process.argv[1]))};
const out='deliverables/remake31-200-v145-20260924/batches/lv051-060/root54/enriched54-'+Date.now()+'.json';fs.writeFileSync(out,JSON.stringify(data,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({out,cases:found.length,local:local.length,U:data.replay.nonClearingDrags,lowerBoundPending:true}));
