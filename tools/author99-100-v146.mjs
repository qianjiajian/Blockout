import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {loadApi, auditSpatial, assertProtected, digest} from './remake91to100-v146.mjs';
import {verifyRulesLock} from './verify-rules-lock.mjs';
import {searchSpatial as searchStars, loadSpatialApi as loadStars} from './remake91to100-star-floor.mjs';
import {searchSpatial,loadSpatialApi} from '../deliverables/remake71-80-v146-20260924/floor-review/spatial-domain.mjs';
import {measureRoute} from './remake21to30-quality.mjs';
export const OUT='deliverables/remake91-100-v146-20260924/agent99-100';
const baseline=JSON.parse(fs.readFileSync('deliverables/remake91-100-v146-20260924/baseline.json'));
export const save=(name,data)=>{fs.mkdirSync(OUT,{recursive:true});const file=`${OUT}/${name}-${Date.now()}.json`;fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n',{flag:'wx'});return file;};
let state=Number(process.env.SEED??10014701);
const rand=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
const shuffle=a=>a.map(v=>[v,rand()]).sort((a,b)=>a[1]-b[1]).map(a=>a[0]);
const rect=(w,h)=>Array.from({length:w*h},(_,i)=>[i%w,Math.floor(i/w)]);
const nativeL=[[0,0],[0,1],[1,1]],nativeT=[[1,0],[0,1],[1,1],[2,1]];
const source99=JSON.parse(fs.readFileSync('.codex-temp/remaining98-v111/next99/source-review-99.json'));
const act=(m,d)=>{m.beginAction();for(const p of d.path)if(!m.moveBlockStep(d.blockId,...p))return false;if(d.exitSide&&!m.tryExit(d.blockId,d.exitSide).ok)return false;return m.commitAction();};
function paths(m,id){const b=m.getBlock(id);if(!b||!m.isBlockActive(b))return[];const q=[{p:[b.x,b.y],path:[]}],seen=new Set([q[0].p.join(',')]);
 for(let i=0;i<q.length;i++){const at=m.clone();at.beginAction();if(!q[i].path.every(p=>at.moveBlockStep(id,...p)))continue;if(at.possibleExitSides(at.getBlock(id)).length)continue;
  for(const[dx,dy]of[[0,-1],[1,0],[0,1],[-1,0]]){const p=[q[i].p[0]+dx,q[i].p[1]+dy],k=p.join(',');if(seen.has(k)||!at.canPlace(at.getBlock(id),...p))continue;const test=at.clone();if(!test.moveBlockStep(id,...p)||test.possibleExitSides(test.getBlock(id)).length)continue;seen.add(k);q.push({p,path:[...q[i].path,p]});}
 }return q;
}
function decisions(level,drags,api){const out=[],m=new api.PuzzleModel(level);m.startCountdown();
 for(let i=0;i<drags.length-1&&out.length<3;i++){const correct=drags[i],next=drags[i+1],b=m.getBlock(correct.blockId);
  if(!correct.exitSide&&b.shape.length>1&&next.blockId!==b.id)for(const q of paths(m,b.id)){if(!q.path.length||q.p.join(',')===correct.path.at(-1)?.join(','))continue;const wrong={blockId:b.id,path:q.path},branch=m.clone();if(!act(branch,wrong)||act(branch.clone(),next))continue;const back=paths(branch,b.id).find(p=>p.p.join(',')===correct.path.at(-1).join(','));if(!back?.path.length)continue;const recovery={blockId:b.id,path:back.path},full=[...drags.slice(0,i),wrong,recovery,...drags.slice(i+1)],r=api.replayRevisedRoute(level,full);if(!r.valid||!r.complete)continue;out.push({atStep:i+1,blockId:b.id,area:b.shape.length,correctDrag:correct,legalWrongParking:wrong,blockedNextAction:next,recoveryDrag:recovery,fullRecoveredRoute:full,meaning:'多格块合法误停挡住下一动作，回到正确工作位后整关完成；仅局部案例。'});break;}
  assert(act(m,correct));
 }return out;
}
function enrich100(data,api){
 const sourceFile='.codex-temp/video-audit-71-100/91-100/samples1s/sec-01350.jpg',truthFile='deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json';
 const source=structuredClone(baseline.levels[99].level);source.blocks.forEach((b,i)=>b.id=`source-100-${i}`);
 const unused=data.level.blocks.slice(),mapping=source.blocks.map(s=>{const n=unused.findIndex(b=>b.color===s.color&&Boolean(b.star)===Boolean(s.star));assert(n>=0);const b=unused.splice(n,1)[0];return{sourceId:s.id,candidateId:b.id,sourceAnchor:[s.x,s.y],candidateAnchor:[b.x,b.y],color:b.color,star:Boolean(b.star),shapeCells:4};});
 data.sourceReview={stableOpening:{file:sourceFile,sha256:digest(fs.readFileSync(sourceFile)),second:1350,observed:'逐格核对原视频截图：4×3 SQ2，绿星4/普2、橙星3/普3；普通橙0/绿6，星橙3/绿8。'},truth:{file:truthFile,sha256:digest(fs.readFileSync(truthFile))},sourceBlocks:source.blocks,sourceGates:source.gates,blockMapping:mapping,gateBindings:data.level.gates.map(g=>({sourceId:g.id,candidateId:g.id,color:g.color,star:Boolean(g.star),initialFrozen:g.frozen??0,from:source.gates.find(s=>s.id===g.id),to:g})),knownHidden:'none; full opening inventory12 verified',adaptation:'无块数/形状/颜色/机制数量或计数适配。仅星功能类别位置与出口位置原创重排。'};
 data.originality={layoutIntent:'右上普通橙门启动，右侧橙普通道与左列橙星分区交错；绿色星块须在工作位待普通绿释放后绕向左下星门。',alignment:'12个2×2原向方块保持三列四行边界；这是48格棋盘与12个SQ2合同下唯一完整网格划分。',changes:'从源普通橙底中/橙星左中/绿普顶中/绿星右中，改右上/右下/顶右/左下；橙星由右侧和中位移向左列与底中，绿普通由右列转为顶中和右下。八个位置功能标记改变，非整体镜像/旋转或只换色。',constraints:'几何划分无法在保48格、12SQ2下变化，不声称形状分区原创；原创性在功能块邻接及实际出口通路。'};
 data.design={primaryMechanism:'七星块与同色双门的目标差异，结合冰3/6/8分阶段释放。',concreteDecision:'绿色星块可以暂时停在普通绿门前，但冰6融化后仍不能由普通门清除；需要保留两件绿色普通块通往该门的工作通路。',counterRationale:'全部源冰值与七星标记数保留，开局三橙普首先释放橙星门，六橙清除解冻普通绿，再两绿普清除解冻绿星。'};
 data.decisionCases=decisions(data.level,data.drags,api);assert(data.decisionCases.length);data.decisionsVerified=data.decisionCases.map(c=>{const prefix=data.drags.slice(0,c.atStep-1),wrong=api.replayRevisedRoute(data.level,[...prefix,c.legalWrongParking]),blocked=api.replayRevisedRoute(data.level,[...prefix,c.legalWrongParking,c.blockedNextAction]),recovered=api.replayRevisedRoute(data.level,c.fullRecoveredRoute);assert(wrong.valid&&!blocked.valid&&recovered.valid&&recovered.complete);return{atStep:c.atStep,wrongValid:true,nextBlocked:true,recoveryComplete:true,error:blocked.error};});data.measurements=measureRoute(data.level,data.drags,api);
 const m=new api.PuzzleModel(data.level);m.startCountdown();const transitions=[],starCases=[];
 for(let i=0;i<=data.drags.length;i++){
  for(const b of m.snapshot().blocks.filter(b=>b.star))for(const side of ['top','right','bottom','left'])if(m.exitAttemptStatus(b.id,side)==='star-gate-required'){
   const relaxed=structuredClone(data.level);delete relaxed.blocks.find(a=>a.id===b.id).star;const alt=new api.PuzzleModel(relaxed);alt.startCountdown();if(!data.drags.slice(0,i).every(d=>act(alt,d)))continue;if(alt.exitAttemptStatus(b.id,side)!=='ok')continue;
   if(!starCases.some(c=>c.blockId===b.id&&c.side===side))starCases.push({afterDrags:i,prefix:data.drags.slice(0,i),blockId:b.id,side,sourceStatus:'star-gate-required',singleFieldRelaxation:`blocks.${data.level.blocks.findIndex(a=>a.id===b.id)}.star`,relaxedStatus:'ok',meaning:'仅去掉这件星标，同位置同门同计数由拒绝变可通；不是正式通关路线。'});
  }
  if(i===data.drags.length)break;const before=m.snapshot();assert(act(m,data.drags[i]));const after=m.snapshot();if(after.cleared>before.cleared)transitions.push({step:i+1,blockId:data.drags[i].blockId,clearEvent:after.cleared,thawedGates:after.gates.filter(g=>!g.frozen&&before.gates.find(b=>b.id===g.id)?.frozen>0).map(g=>g.id)});
 }
 assert(starCases.length);data.mechanismEvidence={transitions,starCases,explanation:'当绿普冰6已融、绿星冰8未融时，真实绿星暂驻普通绿口仍拒绝，需挪位让两件绿普通过。普通可走星门的一般规则另由工具资格fixture验证；本关计数链没有剩余普通块可实际演示此分支。'};
 data.bindings=Object.fromEntries(['tools/author99-100-v146.mjs','tools/remake91to100-star-floor.mjs','src/core/PuzzleModel.ts','src/game/continuousDrag.ts',sourceFile,truthFile].map(p=>[p,digest(fs.readFileSync(p))]));
 data.humanBlindTested=false;data.pointerValidated=false;data.releaseApproved=false;return data;
}
function enrich99(data,api){
 const sourceFile=`${OUT}/source99-rechecked-1790263737218.json`,src=JSON.parse(fs.readFileSync(sourceFile)),l=data.level;
 const blockMapping=['opening','joint3'].flatMap(group=>src.sourceCohorts[group].map((s,i)=>{const id=`r147-99-${group==='opening'?'o':'h'}${i}`,b=l.blocks.find(b=>b.id===id);assert(b);return{sourceId:`${group}-${i}`,candidateId:id,source:s,candidate:b,shapeAdaptation:JSON.stringify(s.shape)!==JSON.stringify(b.shape)?'源L3/向下T4无原向整图，等面积同形类别换为现有原朝向L3/向上T4，保钥/锁初值及批次。':null,colorAdaptation:s.color!==b.color?'源有重复绿色普通冰出口，不符合唯一色口。保两个冰3实例，将原顶绿出口与其对应竖轴绿V2成对改为cyan；轴仍竖、其他源绿块不变。':null};}));
 const fillers=l.blocks.filter(b=>b.id.includes('fill'));assert.equal(fillers.reduce((n,b)=>n+b.shape.length,0),14);
 const gateBindings=src.sourceGates.map(s=>{const color=s.id==='source-99-g1'?'cyan':s.color,g=l.gates.find(g=>g.color===color);assert(g);assert.equal(g.frozen??0,s.frozen??0);return{sourceId:s.id,gateId:g.id,sourceColor:s.color,candidateColor:g.color,initialFrozen:g.frozen??0,source:s,candidate:g};});
 data.sourceReview={file:sourceFile,sha256:digest(fs.readFileSync(sourceFile)),knownSourceBodies:26,knownSourceArea:54,baselinePlayableArea:68,blockMapping,gateBindings,ordinaryFillers:fillers,openingDifference:{sourceBodies:12,sourceArea:27,candidateBodies:l.blocks.filter(b=>!b.shutterId).length,candidateArea:40,ordinaryAddedArea:13},hiddenDifference:{sourceBodies:14,sourceArea:27,candidateBodies:l.blocks.filter(b=>b.shutterId).length,candidateArea:28,ordinaryAddedArea:1},sourceCoverRegions:src.sourceCoverRegions,candidateCoverRegions:l.shutters,coverageReason:'源26体实际54格，固定68格需额外14格。本稿只补4个普通H3和2个普通S；开局补13格、已知隐藏27格另补1格。原source三帘按3共同揭示、完整源块跨视觉分帘，在本游戏改为独立10/9/9格矩形，每源隐藏体保留在其中一片且层满铺。',requiredDifference:'源7色含两个绿色冰3出口。为保8实体口/全部7冰初值且遵守8色唯一，只把原顶绿冰3与其竖轴V2配对改cyan。设计共8色，有明确适配，不标源色数精确相同。'};
 data.originality={layoutIntent:'上方10格横帘与左右9格帘形成倒凹形三区，下方横条带留出中央钥块工作列。',alignment:'三片真实矩形按y=2横线、x=3/4纵线组织，底部H3排成0–2/3–5两条横向边界。',changes:'竞品大中帘+两细侧帘集中上方并将全部开局放下方；新图三帘在上方分成10/9/9格，开局穿插中心竖道、两侧独立格及下方条带；旧正式三帘全在底部且原块形已不同，故并非整体镜转/换色。',constraints:'实际68格原棋盘不变。完整源54格不能直接满铺，额外14格只补普通体；2L和红T为q0素材必要替形。'};
 data.design={primaryMechanism:'两组钥锁与同步三帘的空间协作，竖轴块约束左下工作位。',concreteDecision:'第一组3钥放开红T，第二组4钥放开隐藏黄T；黄V2钥需要先暂存再穿过下方工作带，同组钥可计数、异组不能推进。',counterRationale:'红3/蓝4两锁、7钥、3片帘3、7个冰门3/3/3/3/1/1/1均保持。额外普通块只填14缺格，不增加机关。'};
 data.decisionCases=decisions(l,data.drags,api);assert(data.decisionCases.length);data.measurements=measureRoute(l,data.drags,api);assert(data.measurements.multiCellDrags>data.measurements.singleCellDrags);
 const m=new api.PuzzleModel(l);m.startCountdown();const keyEvents=[],clearEvents=[],axisCases=[],curtainCases=[];
 for(let i=0;i<=data.drags.length;i++){
  const before=m.snapshot();
  if(axisCases.length===0){const b=before.blocks.find(b=>b.movementAxis);if(b&&m.isBlockActive(b))for(const dx of[-1,1]){
   const relaxed=structuredClone(l);delete relaxed.blocks.find(a=>a.id===b.id).movementAxis;const alt=new api.PuzzleModel(relaxed);alt.startCountdown();if(!data.drags.slice(0,i).every(d=>act(alt,d)))continue;const action={blockId:b.id,path:[[b.x+dx,b.y]]},formal=m.clone();if(act(formal,action)||!act(alt,action))continue;axisCases.push({afterDrags:i,prefix:data.drags.slice(0,i),blockId:b.id,action,formalAllowed:false,withoutOnlyAxisAllowed:true,meaning:'相同位置/库存只去竖轴限制，横向一步由拒绝变允许；不把该放宽路线当正式路线。'});break;
  }}
  for(const co of l.shutters)if(!curtainCases.some(c=>c.curtainId===co.id)&&before.cleared>0&&before.cleared<co.count){const altLevel=structuredClone(l);altLevel.shutters.find(c=>c.id===co.id).count=before.cleared;const alt=new api.PuzzleModel(altLevel);alt.startCountdown();if(!data.drags.slice(0,i).every(d=>act(alt,d)))continue;for(const b of alt.snapshot().blocks.filter(b=>b.shutterId===co.id&&alt.isBlockActive(b)))for(const [dx,dy]of[[0,-1],[1,0],[0,1],[-1,0]]){if(curtainCases.some(c=>c.curtainId===co.id))break;const action={blockId:b.id,path:[[b.x+dx,b.y+dy]]};if(!act(alt.clone(),action)||act(m.clone(),action))continue;curtainCases.push({curtainId:co.id,afterDrags:i,prefix:data.drags.slice(0,i),originalCount:co.count,relaxedCount:before.cleared,action,formalAllowed:false,onlyLowerThisCurtainAllowed:true});}}
  if(i===data.drags.length)break;const d=data.drags[i],b=m.getBlock(d.blockId);assert(act(m,d));const after=m.snapshot();if(after.cleared>before.cleared){clearEvents.push({step:i+1,blockId:b.id,clearEvent:after.cleared,revealed:after.shutters.filter(c=>c.revealed&&!before.shutters.find(p=>p.id===c.id)?.revealed).map(c=>c.id),thawedGates:after.gates.filter(g=>!g.frozen&&before.gates.find(p=>p.id===g.id)?.frozen>0).map(g=>g.id)});if(b.keyId){const locks=before.blocks.filter(a=>a.lockedBy).map(a=>{const z=after.blocks.find(z=>z.id===a.id);assert(z);const expected=a.lockedBy===b.keyId?Math.max(0,a.lockCount-1):a.lockCount;assert.equal(z.lockCount??0,expected);return{id:a.id,group:a.lockedBy,before:a.lockCount,after:z.lockCount??0};});keyEvents.push({step:i+1,keyId:b.id,keyGroup:b.keyId,locks});}}
 }
 if(!axisCases.length){const axis=l.blocks.find(b=>b.movementAxis);for(let i=0;i<data.drags.length&&!axisCases.length;i++){const d=data.drags[i];if(d.blockId!==axis.id)continue;for(let n=1;n<d.path.length&&!axisCases.length;n++){const prefix=[...data.drags.slice(0,i),{blockId:axis.id,path:d.path.slice(0,n)}],formal=new api.PuzzleModel(l),relaxed=structuredClone(l);delete relaxed.blocks.find(b=>b.id===axis.id).movementAxis;const alt=new api.PuzzleModel(relaxed);formal.startCountdown();alt.startCountdown();if(!prefix.every(d=>act(formal,d))||!prefix.every(d=>act(alt,d)))continue;const b=formal.getBlock(axis.id);for(const dx of[-1,1]){const action={blockId:b.id,path:[[b.x+dx,b.y]]};if(act(formal.clone(),action)||!act(alt.clone(),action))continue;axisCases.push({afterDrags:i,prefix,blockId:b.id,action,formalAllowed:false,withoutOnlyAxisAllowed:true,includesLegalIntermediateParking:true,meaning:'将既有竖轴离场拖动在未碰门的中间格释放，随后同一横向步只有去掉轴限制才合法；完整源世界/计数保持。'});break;}}}}
 assert.equal(keyEvents.length,7);assert(axisCases.length);assert.equal(clearEvents.flatMap(c=>c.revealed).length,3);assert(curtainCases.length);
 data.mechanismEvidence={keyEvents,clearEvents,axisCases,curtainCases,curtainEvidenceLimit:'全部三帘均由真实第三次清除揭开并完成全库存；只有一帘找到单独降低计数后同前缀新增合法动作，未声称另外两帘单独作用已同样证明。',allKeysRemoved:true,locksEndedAtZero:true,complete: m.snapshot().complete};
 data.bindings=Object.fromEntries([sourceFile,'tools/author99-100-v146.mjs',`${OUT}/research99.mjs`,'deliverables/remake71-80-v146-20260924/floor-review/spatial-domain.mjs','src/core/PuzzleModel.ts','src/game/continuousDrag.ts'].map(p=>[p,digest(fs.readFileSync(p))]));
 data.humanBlindTested=false;data.pointerValidated=false;data.releaseApproved=false;return data;
}
function pack(cells,blocks,regions=[]){
 const legal=new Set(cells.map(p=>p.join(','))),owner=new Map(),out=[],order=shuffle(blocks);let visits=0;
 function go(left){
  if(++visits>6000)return false;if(!left.length)return owner.size===legal.size;
  const next=cells.find(p=>!owner.has(p.join(',')));if(!next)return false;
  for(const b of shuffle(left))for(const[dx,dy]of b.shape){const x=next[0]-dx,y=next[1]-dy,foot=b.shape.map(([sx,sy])=>[sx+x,sy+y]),keys=foot.map(p=>p.join(','));
   if(keys.some(k=>!legal.has(k)||owner.has(k)))continue;
   const region=regions.length?regions.find(r=>foot.every(([x,y])=>x>=r.x&&x<r.x+r.width&&y>=r.y&&y<r.y+r.height)):null;if(regions.length&&!region)continue;
   if(foot.some(([x,y])=>[[x-1,y],[x+1,y],[x,y-1],[x,y+1]].some(p=>owner.get(p.join(','))===b.color)))continue;
   for(const k of keys)owner.set(k,b.color);out.push({...b,x,y,...(region?{shutterId:region.id}:{})});
   if(go(left.filter(a=>a!==b)))return true;out.pop();for(const k of keys)owner.delete(k);
  }return false;
 }return go(order)?out:null;
}
export function make99(){
 const l=structuredClone(baseline.levels[98].level);l.difficulty='easy';l.preservedMoveTarget=44;
 l.shutters=process.env.COVERS==='bottom'?[{id:'r147-99-left',x:0,y:6,width:2,height:4,count:3},{id:'r147-99-center',x:2,y:6,width:2,height:4,count:3},{id:'r147-99-right',x:4,y:6,width:3,height:4,count:3}]:[{id:'r147-99-top',x:1,y:0,width:5,height:2,count:3},{id:'r147-99-left',x:0,y:2,width:3,height:3,count:3},{id:'r147-99-right',x:4,y:2,width:3,height:3,count:3}];
 const cells=l.playable,hidden=cells.filter(([x,y])=>l.shutters.some(r=>x>=r.x&&x<r.x+r.width&&y>=r.y&&y<r.y+r.height)),hiddenKeys=new Set(hidden.map(p=>p.join(','))),open=cells.filter(p=>!hiddenKeys.has(p.join(',')));
 const normalize=(b,i,group)=>{b=structuredClone(b);delete b.x;delete b.y;b.id=`r147-99-${group}${i}`;if(b.shape.length===3&&Math.max(...b.shape.map(p=>p[0]))>0&&Math.max(...b.shape.map(p=>p[1]))>0)b.shape=nativeL;if(b.shape.length===4&&!b.shape.some(p=>p[0]===1&&p[1]===0)&&b.color==='red')b.shape=nativeT;
  if(b.lockedBy)b.shape=nativeT;if(b.movementAxis)b.color='cyan';return b;};
 const opening=source99.sourceCohorts.opening.map((b,i)=>normalize(b,i,'o')),covered=source99.sourceCohorts.joint3.map((b,i)=>normalize(b,i,'h'));
 const colors=['red','blue','green','yellow','purple','orange','pink'];
 const fillShapes=process.env.FILLS==='large'?[rect(3,2),rect(3,2),rect(1,1)]:[rect(3,1),rect(3,1),rect(3,1),rect(3,1),rect(1,1)];
 for(const [i,shape] of fillShapes.entries())opening.push({id:`r147-99-fill-o${i}`,color:colors[Math.floor(rand()*colors.length)],shape});
 covered.push({id:'r147-99-fill-h0',color:colors[Math.floor(rand()*colors.length)],shape:rect(1,1)});
 const ob=pack(open,opening),hb=pack(hidden,covered,l.shutters);if(!ob||!hb)return;l.blocks=[...ob,...hb];
 const ports=[['top',1,2],['top',3,3],['bottom',0,3],['bottom',3,3],['left',1,3],['left',5,3],['right',1,3],['right',5,3]],col=shuffle([...colors,'cyan']);
 if(col.indexOf('cyan')>3)return;
 const ice={blue:0,red:1,orange:1,pink:1,purple:3,yellow:3,green:3,cyan:3};
 l.gates=ports.map(([side,offset,size],i)=>({id:`r147-99-g${i}`,side,offset,size,color:col[i],...(ice[col[i]]?{frozen:ice[col[i]]}:{})}));
 const axis=l.blocks.find(b=>b.movementAxis),axisGate=l.gates.find(g=>g.color==='cyan');if(axis.x<axisGate.offset||axis.x>=axisGate.offset+axisGate.size)return;
 return l;
}
export function make100(){
 const l=structuredClone(baseline.levels[99].level);l.difficulty='easy';l.preservedMoveTarget=30;
 l.blocks.forEach((b,i)=>{b.id=`r147-100-b${i}`;delete b.star;});
 for(const color of ['green','orange'])for(const b of shuffle(l.blocks.filter(b=>b.color===color)).slice(0,color==='green'?4:3))b.star=true;
 // Equal SQ2 tiling is geometrically forced: source identities are permuted
 // by functional (star/plain) type, not merely recoloured or globally mirrored.
 if(l.blocks.filter((b,i)=>Boolean(b.star)!==Boolean(baseline.levels[99].level.blocks[i].star)).length<4)return;
 const sides=shuffle(['top','right','bottom','left']);
 l.gates=l.gates.map((g,i)=>({...g,side:sides[i],offset:2*Math.floor(rand()*((['top','bottom'].includes(sides[i])?l.width:l.height)/2)),size:2}));
 // There must be an actually active plain orange touching its open outlet.
 const g=l.gates[0];if(!l.blocks.some(b=>b.color==='orange'&&!b.star&&(g.side==='top'?b.y===0&&b.x===g.offset:g.side==='bottom'?b.y===6&&b.x===g.offset:g.side==='left'?b.x===0&&b.y===g.offset:b.x===4&&b.y===g.offset)))return;
 return l;
}
async function main(){
 const lock=verifyRulesLock();assert(lock.ok);assert.equal(lock.activeVersion,'1.47.0');
 const mode=process.argv[2]??'100';const {api}=await loadApi();
 if(mode==='enrich100'){const input=process.argv[3],data=JSON.parse(fs.readFileSync(input));data.input={file:input,sha256:digest(fs.readFileSync(input))};console.log(JSON.stringify({file:save('candidate100-enriched',enrich100(data,api))}));return;}
 if(mode==='enrich99'){const input=process.argv[3],data=JSON.parse(fs.readFileSync(input));data.input={file:input,sha256:digest(fs.readFileSync(input))};console.log(JSON.stringify({file:save('candidate99-enriched',enrich99(data,api))}));return;}
 if(mode==='100'){
  const starApi=await loadStars(),start=Date.now(),limit=Number(process.argv[3]??180000);let trials=0,valid=0,witnesses=0;const log=[];
  while(Date.now()-start<limit){trials++;const seed=state,level=make100();if(!level)continue;valid++;assertProtected(level,baseline,api);
   const r=searchStars(level,starApi,{maxMilliseconds:1200,maxStates:15000,maxTransitions:400000,normalize:true,floor:11});
   if(r.status!=='witness')continue;const replay=api.replayRevisedRoute(level,r.drags);if(!replay.valid||!replay.complete)continue;witnesses++;
   if(replay.nonClearingDrags<5)continue;
   const audit=auditSpatial(level,api);assert(audit.passed,JSON.stringify(audit));
   const proof=searchStars(level,starApi,{prove:true,floor:5,maxMilliseconds:20000,maxStates:500000,maxTransitions:20000000,normalize:true});
   const data={activeRuleVersion:lock.activeVersion,seed:`lcg-${seed}`,level,drags:r.drags,levelSha256:digest(level),replay,audit,proof,search:r};
   const file=save(proof.thresholdProven?'candidate100':'unverified100',data);log.push({file,cost:replay.nonClearingDrags,proof:proof.status});console.log(JSON.stringify(log.at(-1)));
   if(proof.thresholdProven)break;
  }
  console.log(JSON.stringify({trials,valid,witnesses,elapsed:Date.now()-start,log}));
 }
 if(mode==='99'){
  const spatialApi=await loadSpatialApi(),start=Date.now(),limit=Number(process.argv[3]??180000);let trials=0,valid=0,witnesses=0,maxClears=0;const log=[];
  while(Date.now()-start<limit){trials++;const seed=state,level=make99();if(!level)continue;let audit;try{assertProtected(level,baseline,api);audit=auditSpatial(level,api);}catch{continue;}if(!audit.passed)continue;valid++;
   const r=searchSpatial(level,spatialApi,{maxMilliseconds:Number(process.env.SEARCHMS??800),maxStates:20000,maxTransitions:500000,normalize:true,floor:Number(process.env.ROUTE_FLOOR??11),diagnosticTrace:true});
   if(r.maxClearsSeen>maxClears){maxClears=r.maxClearsSeen;console.log(JSON.stringify({trials,valid,maxClears,status:r.status}));save('partial99',{activeRuleVersion:lock.activeVersion,seed:`lcg-${seed}`,level,result:r});}
   if(r.status!=='witness')continue;const replay=api.replayRevisedRoute(level,r.drags);if(!replay.valid||!replay.complete)continue;witnesses++;if(replay.nonClearingDrags<5)continue;if(replay.nonClearingDrags>10){const file=save('route99-above-band',{level,seed:`lcg-${seed}`,drags:r.drags,replay,result:r});console.log(JSON.stringify({file,cost:replay.nonClearingDrags}));continue;}
   const proof=searchSpatial(level,spatialApi,{prove:true,floor:5,maxMilliseconds:30000,maxStates:500000,maxTransitions:20000000,normalize:true});
   const data={activeRuleVersion:lock.activeVersion,seed:`lcg-${seed}`,level,drags:r.drags,levelSha256:digest(level),replay,audit,proof,search:r};const file=save(proof.thresholdProven?'candidate99':'unverified99',data);log.push({file,cost:replay.nonClearingDrags,proof:proof.status});console.log(JSON.stringify(log.at(-1)));if(proof.thresholdProven)break;
  }console.log(JSON.stringify({trials,valid,witnesses,maxClears,elapsed:Date.now()-start,log}));
 }
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)await main();

