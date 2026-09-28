import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {loadApi} from './native-block-repair-v143.mjs';
import {auditCandidate,checkCandidate,BASELINE} from './remake31to40-v147.mjs';
import {verifyRulesLock} from './verify-rules-lock.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
import {shapeClass} from './remake31to40-source-v141.mjs';
import {compileLevel,stateFromSnapshot,forEachGesture} from './remake21to30-mask-floor.mjs';
import {checkSymmetryFloor} from './remake21to30-symmetry-floor-v139.mjs';
import {search} from '../.codex-temp/remake31-40-v141/agent31-34/search-monotone.mjs';
export const OUT='deliverables/remake31-40-v146-20260924/agent31-34';
const OLD='deliverables/remake31-40-v141-20260924';
export const INPUTS={31:OLD+'/agent31-34/final31-1790229621121.json',32:OLD+'/root32/variant32-104-1790230622399.json',33:OLD+'/agent31-34/route33-1790229834935.json',34:OLD+'/agent31-34/route34-1790229655206.json'};
const save=(name,data)=>{fs.mkdirSync(OUT,{recursive:true});const p=OUT+'/'+name+'-'+Date.now()+'.json';fs.writeFileSync(p,JSON.stringify(data,null,2)+'\n',{flag:'wx'});return p;};
const act=(m,d)=>{m.beginAction();for(const p of d.path)if(!m.moveBlockStep(d.blockId,...p))return false;if(d.exitSide&&!m.tryExit(d.blockId,d.exitSide).ok)return false;return m.commitAction();};
const key=p=>p.join(',');
function paths(m,id){
 const b=m.getBlock(id);if(!b||!m.isBlockActive(b))return[];const snap=m.snapshot(),start=[b.x,b.y],q=[{p:start,path:[]}],seen=new Set([key(start)]);
 const gateAt=p=>snap.gates.some(g=>g.color===b.layers[0]&&!g.frozen&&api.matchingPortalForExitFrontier(snap,b.shape.map(([x,y])=>[x+p[0],y+p[1]]),g));
 for(let i=0;i<q.length;i++){if(gateAt(q[i].p))continue;for(const[x,y]of[[0,-1],[1,0],[0,1],[-1,0]]){const p=[q[i].p[0]+x,q[i].p[1]+y];if(seen.has(key(p))||!m.canPlace(b,...p)||gateAt(p))continue;seen.add(key(p));q.push({p,path:[...q[i].path,p]});}}return q;
}
function decisions(level,drags){
 const result=[],m=new api.PuzzleModel(level);m.startCountdown();
 for(let i=0;i<drags.length-1&&result.length<3;i++){
  const correct=drags[i],next=drags[i+1],b=m.getBlock(correct.blockId);
  if(!correct.exitSide&&b.shape.length>1&&next.blockId!==b.id){for(const q of paths(m,b.id)){
   if(!q.path.length||key(q.p)===key(correct.path.at(-1)))continue;const wrong={blockId:b.id,path:q.path},branch=m.clone();if(!act(branch,wrong)||act(branch.clone(),next))continue;
   const back=paths(branch,b.id).find(p=>key(p.p)===key(correct.path.at(-1)));if(!back?.path.length)continue;const recovery={blockId:b.id,path:back.path},full=[...drags.slice(0,i),wrong,recovery,...drags.slice(i+1)],r=api.replayRevisedRoute(level,full);
   if(r.valid&&r.complete){result.push({atStep:i+1,blockId:b.id,area:b.shape.length,correctDrag:correct,legalWrongParking:wrong,blockedNextAction:next,recoveryDrag:recovery,fullRecoveredRoute:full,meaning:'多格块合法误停挡住后续动作，退让到正确位置后完整通关；仅局部案例，不冒称全局死局或最优惩罚。'});break;}
  }}assert(act(m,correct),'Route replay');
 }return result;
}
function curtains(level,drags){
 const cases=[];for(const cover of level.shutters??[]){outer:for(let i=1;i<drags.length;i++){
  const prefix=drags.slice(0,i),r=api.replayRevisedRoute(level,prefix);if(!r.valid||r.complete)break;const snap=JSON.parse(r.finalStateKey),s=snap.shutters.find(s=>s.id===cover.id);if(r.clearEvents<1)continue;
  for(let relaxedCount=Math.min(r.clearEvents,cover.count-1);relaxedCount>=1;relaxedCount--){
   const relaxed=structuredClone(level);relaxed.shutters.find(s=>s.id===cover.id).count=relaxedCount;const m=new api.PuzzleModel(relaxed);m.startCountdown();if(!prefix.every(d=>act(m,d)))continue;
   const graph=compileLevel(relaxed),moves=[];forEachGesture(graph,stateFromSnapshot(graph,m.snapshot()),(idx,value,cost,get)=>{if(graph.blocks[idx].shape.length>1)moves.push(get());});
   for(const move of moves){if(api.replayRevisedRoute(level,[...prefix,move]).valid||!api.replayRevisedRoute(relaxed,[...prefix,move]).valid)continue;cases.push({curtainId:cover.id,originalCount:cover.count,relaxedCount,beforeDrag:i+1,prefix,cleared:r.clearEvents,formalRemaining:s.count,blockedAction:move,meaning:'仅降低本帘计数，其它库存和初值不变，同一前缀后多格动作由受阻变有效；只证明此局部作用。'});break outer;}
  }
 }}return cases;
}
function enrich32(data){
 const src=JSON.parse(fs.readFileSync(OLD+'/agent31-34/source-review.json')).levels.find(r=>r.level===32),unused=data.level.blocks.slice();
 const colorMapping={yellow:'yellow',red:'red',green:'green',blue:'blue'},blockMapping={},carrierShapeRationales={};
 const known=src.stage_seeds[0].known_pieces.slice().sort((a,b)=>(b.value??0)-(a.value??0));
 for(const s of known){const i=unused.findIndex(b=>b.color===colorMapping[s.source_outer_color]&&(b.frozen??0)===(s.value??0)&&(!s.value||b.layers?.[1]===colorMapping[s.source_core_color]));assert(i>=0,s.id);const b=unused.splice(i,1)[0];blockMapping[s.id]=[b.id];if(shapeClass(b.shape)!==s.shape)carrierShapeRationales[b.id]=s.value?'六件原黄色L/T冰壳无原向整图，且源46格超固定36格；逐件改为合法V2冰壳，保外色/芯色及冰4，六件减少12格。':'六冰壳适配后按6×6原棋盘进行原向S/V2行列满铺，普通载体局部缩形/拆分；保原外色，不新增机关。';}
 for(const b of unused){const s=known.find(s=>!s.value&&colorMapping[s.source_outer_color]===b.color);assert(s);blockMapping[s.id].push(b.id);carrierShapeRationales[b.id]='六冰壳载体必要原向适配后剩余普通区以S/V2独立块补齐36格，绑定同色原普通块的拆分/必要补充；不冒称源块数或逐色面积一致。';}
 for(const s of known)if(blockMapping[s.id].length>1)for(const id of blockMapping[s.id])carrierShapeRationales[id]??='普通载体同色拆分为多个独立S/V2，适配保留6×6棋盘内六冰壳原向载体与满铺/相邻异色，不增加任何机关。';
 data.sourceReview=OLD+'/agent31-34/source-review.json';
 data.sourceAdaptation={colorMapping,stageMapping:{},blockMapping,carrierShapeRationales,gateBindings:src.mechanisms.directional_exits.items.map(s=>({sourceId:s.id,gateId:data.level.gates.find(g=>g.color===colorMapping[s.source_color]).id})),stages:{opening:{rationale:'源14块/46格：2H2+6V3+4L4+2T4，固定棋盘36格。六L/T冰壳不受原向完整外壳素材支持，改六V2保冰4及蓝绿红各2芯；普通区原向S/V2重排/拆分补足36格，最终22块/36格，源数量形状逐色面积均明确为必要结构/素材适配而非精确复制。'}}};
 data.originality={layoutIntent:'上方四列单格启动区和下方双格纵列构成三段对齐停车带，六冰壳穿插于不同列。',alignment:'全部普通和冰壳V2沿偶数行起排，上方两行单格边界与竖直带对齐，不依赖旋转贴图。',changes:'从竞品6×9中六L/T外壳围绕普通条状块变为保留6×6紧凑纵列结构，出口改为顶黄、底红蓝及右绿，非仅镜转或换色。',constraints:'保留36格棋盘、六黄色冰壳初值4/芯色配对、蓝绿红门各8及黄普通门；形状适配差异单列，星级与时限不改。'};
 data.design={primaryMechanism:'六件冰4黄色外壳同时解冻后仍占据纵列，先剥壳再为蓝红窄口和绿色侧口腾路。',concreteDecision:'V2停车位置影响下一件长条离场；保留逐组误停受阻与完整恢复路线，不把单格启动清除计为必要腾挪。',source:'31–34已绑定逐帧来源32，六冰壳载体因原向完整外壳美术及36格容量必要适配。',counterRationale:'保留六冰4及三个冰门8/8/8，与源逐实例绑定；无卷帘和生成器。'};
 return data;
}
let api;
export async function main(){
 const lock=verifyRulesLock();assert(lock.ok,lock.errors.join('\n'));assert.equal(lock.activeVersion,'1.47.0');({api}=await loadApi());
 const [mode='check',arg='31']=process.argv.slice(2),id=Number(arg),input=INPUTS[id]??arg,data=JSON.parse(fs.readFileSync(input));assert([31,32,33,34].includes(data.level.id));
 const baseline=JSON.parse(fs.readFileSync(BASELINE));
 assert(data.level.blocks.every(b=>api.matchFormalBlockShape(b.shape,'native-only')?.quarterTurns===0));
 if(mode==='floor'){
  const proof=checkSymmetryFloor(data.level,{floor:{31:5,32:11,33:11,34:16}[data.level.id],maxStates:Number(process.env.STATES??4000000),maxMilliseconds:Number(process.env.MS??180000)});
  const file=save('floor'+data.level.id,{activeRuleVersion:lock.activeVersion,input,inputSha256:digest(fs.readFileSync(input)),levelSha256:digest(data.level),proof});console.log(JSON.stringify({file,proof:{...proof,relaxedRoute:undefined}}));return;
 }
 if(data.level.id===32&&!data.sourceAdaptation)enrich32(data);
 data.activeRuleVersion=lock.activeVersion;data.resumedFrom={path:input,sha256:digest(fs.readFileSync(input))};
 data.decisionCases=decisions(data.level,data.drags);data.curtainLocalChoices=curtains(data.level,data.drags);
 assert(data.decisionCases.length);assert.equal(data.curtainLocalChoices.length,data.level.shutters?.length??0);
 const staticAudit=auditCandidate(data,baseline,api),file=save('candidate'+data.level.id,data);console.log(JSON.stringify({candidate:file,staticPass:staticAudit.passed,proofStarted:new Date().toISOString()}));
 try{const report=checkCandidate(data,baseline,api,{maxStates:Number(process.env.STATES??4000000),maxMilliseconds:Number(process.env.MS??180000)});const check=save('checked'+data.level.id,{...report,activeRuleVersion:lock.activeVersion,checkerContract:'v1.46 fresh candidate check; final Pointer and adoption pending',candidate:file,allNativeOrientation:true});console.log(JSON.stringify({candidate:file,check,lower:report.lowerBound,upper:report.upperBound,multi:report.measurements.multiCellDrags,single:report.measurements.singleCellDrags}));}
 catch(error){const fail=save('unverified'+data.level.id,{activeRuleVersion:lock.activeVersion,candidate:file,error:error.message});console.log(JSON.stringify({candidate:file,unverified:fail,error:error.message}));process.exitCode=1;}
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)await main();
