import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {loadApi} from '../../native-block-repair-v143.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {SHAPES,pack,seededRng} from '../../../deliverables/remake21-30-v139-20260924/agent28-30/packing.mjs';
import {search} from './campaign-axis-key-search-v146.mjs';
import {checkAxisKeyFloor} from './campaign-axis-key-floor-v146.mjs';
import {compileLevel,forEachGesture,stateFromSnapshot} from './campaign-axis-key-graph-v146.mjs';
import {auditOpeningCoverage} from '../../revised-opening-coverage.mjs';
import {auditHiddenCoverage} from '../../revised-hidden-coverage.mjs';
import {auditGateSpanLimits} from '../../revised-gate-span-limits.mjs';
import {auditGeneratorQueueColors} from '../../revised-generator-queue-colors.mjs';
import {measureRoute} from '../../remake21to30-quality.mjs';

const OUT='deliverables/remake31-200-v145-20260924/batches/lv051-060/agent51-54';
const baseline=JSON.parse(fs.readFileSync('deliverables/remake31-200-v145-20260924/baseline.json'));
const truthFile='deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json';
const truth=JSON.parse(fs.readFileSync(truthFile));
const lock=verifyRulesLock();assert(lock.ok);assert(['1.46.0','1.47.0'].includes(lock.activeVersion));
const {api}=await loadApi();
function auditSpatial(level,api){
 api.validateLevel(level);const legacy=api.auditRevisedCandidate(level,undefined),sourceOnly=new Set(['missing-source-reference','missing-source-hash','missing-seed','missing-source-number','incomplete-source-inventory','originality-unverified']);
 const issues=legacy.issues.filter(i=>!(i.category==='source'&&sourceOnly.has(i.code))&&!(i.category==='construction'&&i.code==='wrong-rule-profile'));
 const checks={opening:auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),hidden:auditHiddenCoverage(level),spans:auditGateSpanLimits(level),art:api.auditCandidateBlockArt(level),queue:auditGeneratorQueueColors(level)};
 const nonNative=level.blocks.filter(b=>api.matchFormalBlockShape(b.shape,'native-only')?.quarterTurns!==0).map(b=>b.id);
 return{passed:!issues.length&&!nonNative.length&&Object.values(checks).every(c=>c.passed),issues,nonNative,...checks};
}
for(const k of Object.keys(SHAPES))SHAPES[k]=SHAPES[k].filter(s=>api.matchFormalBlockShape(s,'native-only')?.quarterTurns===0);
const write=(name,data)=>{fs.mkdirSync(OUT,{recursive:true});const p=OUT+'/'+name+'-'+Date.now()+'.json';fs.writeFileSync(p,JSON.stringify(data,null,2)+'\n',{flag:'wx'});return p;};
const spec=(sourceId,kind,color,rest={})=>({sourceId,kind,color,...rest});
export const SOURCES={
 51:{frames:[1,8,14,22,23],notes:['frame1为稳定开局；冰7载体融后是黄色H3。','原红H3四件为横轴，红V3一件纵轴；绿色H3一件纵轴，合计6。','原红门共三扇：普通右上、冰4上、冰5右下。横轴与纵轴要求不同方向；四H3又不能同时挤进单个3格高口，构成我方唯一色门/最大3格冲突。仅纵轴红V3和冰4门改粉、第四横轴H3和冰5门改青；全部形状/轴向/实例/初值保持。','逐帧可见实体原色为红/绿/黄/紫/深蓝，冰罩的亮蓝不作为第六实体色，深蓝V3壳内紫/黄H3壳内深蓝；旧truth色数6与逐帧观察分列，不改原事实库。设计7色是最小两个红载体分色的硬规则适配，不标源色数精确一致。'],
  pieces:[spec('red-h1','H3','red',{movementAxis:'horizontal'}),spec('red-h2','H3','red',{movementAxis:'horizontal'}),spec('red-h3','H3','red',{movementAxis:'horizontal'}),spec('red-h4','H3','cyan',{movementAxis:'horizontal',sourceColor:'red'}),spec('red-v','V3','pink',{movementAxis:'vertical',sourceColor:'red'}),spec('green-h1','H3','green'),spec('green-h2','H3','green',{movementAxis:'vertical'}),spec('yellow-h1','H3','yellow'),spec('yellow-ice','H3','yellow',{frozen:7}),spec('yellow-shell','H3','yellow',{layers:['yellow','blue']}),spec('purple-v','V3','purple'),spec('blue-shell','V3','blue',{layers:['blue','purple']})],
  gates:[['red',0],['green',3],['pink',4],['purple',10],['cyan',5],['yellow',8],['blue',6]],difficulty:'normal',min:11,max:15},
 52:{frames:[32,50,57],notes:['frame32为19块稳定开局；truth33秒已清除红SQ2。','七件轴向分别为红V3两件纵向、黄H2两件横向、浅蓝/红/粉SQ2各一件纵向。','六色与六门一一对应，保12浅蓝/4绿/14粉/2蓝/3黄，红普通。全部块形原向精确保留，布局独立重排。'],
 pieces:[spec('yellow-v','V3','yellow'),spec('green-v1','V3','green'),spec('red-v1','V3','red',{movementAxis:'vertical'}),spec('red-v2','V3','red',{movementAxis:'vertical'}),spec('blue-v','V3','blue'),spec('green-v2','V3','green'),spec('blue-v2','V2','blue'),spec('yellow-h1','H2','yellow',{movementAxis:'horizontal'}),spec('yellow-h2','H2','yellow',{movementAxis:'horizontal'}),spec('green-h1','H2','green'),spec('green-h2','H2','green'),spec('red-single','SINGLE','red'),spec('blue-single','SINGLE','blue'),spec('red-h','H2','red'),spec('pink-h','H2','pink'),spec('cyan-h','H2','cyan'),spec('cyan-square','SQ2','cyan',{movementAxis:'vertical'}),spec('red-square','SQ2','red',{movementAxis:'vertical'}),spec('pink-square','SQ2','pink',{movementAxis:'vertical'})],
 gates:[['red',0],['cyan',12],['green',4],['pink',14],['blue',2],['yellow',3]],difficulty:'super',min:21,max:30},
 53:{frames:[70,85,100,110,120],notes:['frame70为完整稳定开局，truth的01:13已清除橙SQ2，不取作开局。','两H2冰7融后分别黄/绿；SQ2冰5融后紫色且带横轴（frame110），源axis2是开局可见箭头数，实际全关3件，保留隐藏冰轴。','源全关8种颜色：橙/黄/绿/紫/红/深蓝/浅蓝/粉。开局数字冰遮盖使原统计只记录7种；8门独立唯一，无需改色。'],
  pieces:[spec('yellow-ice','H2','yellow',{frozen:7}),spec('green-ice','H2','green',{frozen:7}),spec('purple-ice','SQ2','purple',{frozen:5,movementAxis:'horizontal'}),spec('pink-v','V2','pink'),spec('orange-square','SQ2','orange'),spec('cyan-shell','V2','cyan',{layers:['cyan','yellow']}),spec('blue-single','SINGLE','blue'),spec('cyan-single','SINGLE','cyan'),spec('yellow-h','H2','yellow'),spec('blue-h','H2','blue'),spec('purple-single','SINGLE','purple'),spec('orange-shell','V2','orange',{layers:['orange','pink']}),spec('cyan-axis','V2','cyan',{movementAxis:'vertical'}),spec('red-axis','H3','red',{movementAxis:'horizontal'})],
  gates:[['orange',0],['yellow',7],['cyan',5],['purple',8],['pink',6],['blue',1],['red',3],['green',8]],difficulty:'easy',min:5,max:10}
};
function sourceRecord(id){const s=SOURCES[id];return {truthFile,truthSha256:digest(fs.readFileSync(truthFile)),truth:truth.levels.find(r=>r.level===id),video:'C:/Users/Administrator/Desktop/block out/参考视频/51-60.mp4',frames:s.frames.map(n=>{const p='.codex-temp/video-audit-41-70/frames-51-60/frame-'+String(n).padStart(4,'0')+'.jpg';return{second:n,path:p,sha256:digest(fs.readFileSync(p))};}),sourceNotes:s.notes,pieces:s.pieces,gates:s.gates};}
function make(id,rng){
 const s=SOURCES[id],old=baseline.levels[id-1],l=structuredClone(old.level);for(const k of ['shutters','generators','flipDoors','coloredGrids','hintPlan','construction','designTargets'])delete l[k];
 l.difficulty=s.difficulty;l.preservedMoveTarget=old.starTargets.moveTarget;l.blocks=[];l.gates=[];
 const pieces=pack(s.pieces,l.playable,rng,Number(process.env.PACK_TRIES??6000),true);if(!pieces)return{error:'packing'};
 l.blocks=pieces.map(b=>{const {sourceId,kind,sourceColor,id:_id,...data}=b;return{id:'v146-'+id+'-'+sourceId,...data};});
 const slots=[];for(const side of ['top','bottom','left','right']){const n=['top','bottom'].includes(side)?l.width:l.height;for(let size=1;size<=3;size++)for(let offset=0;offset+size<=n;offset++)slots.push({side,offset,size});}
 const rail=new Set();
 const gates=rng.shuffle([...s.gates]);gates.sort((a,b)=>{const ax=c=>l.blocks.some(q=>(q.layers??[q.color]).includes(c)&&q.movementAxis);return Number(ax(b[0]))-Number(ax(a[0]));});
 for(const [color,frozen]of gates){const matching=l.blocks.filter(b=>(b.layers??[b.color]).includes(color));let options=slots.filter(p=>{
  if(Array.from({length:p.size},(_,i)=>p.side+':'+(p.offset+i)).some(k=>rail.has(k)))return false;
  return matching.every(b=>{const vertical=['top','bottom'].includes(p.side),span=Math.max(...b.shape.map(q=>q[vertical?0:1]))+1,anchor=vertical?b.x:b.y;return (!b.movementAxis||((b.movementAxis==='vertical')===vertical&&anchor>=p.offset&&anchor+span<=p.offset+p.size))&&span<=p.size;});});
  if(!options.length)return{error:'gates'};options=rng.shuffle(options);options.sort((a,b)=>process.env.NARROW?a.size-b.size:b.size-a.size);const p=options[Math.floor(rng.rand()*Math.min(options.length,process.env.NARROW?2:4))];for(let x=p.offset;x<p.offset+p.size;x++)rail.add(p.side+':'+x);l.gates.push({id:'v146-'+id+'-gate-'+color,color,...p,...(frozen?{frozen}:{})});
 }
 try{api.validateLevel(l);const a=auditSpatial(l,api);if(!a.passed)return{error:'audit',detail:a};}catch(e){return{error:e.message};}
 assert.deepEqual(api.levelStarTargets(l),old.starTargets);
 return{level:l};
}
const apply=(model,d)=>{model.beginAction();for(const p of d.path)assert(model.moveBlockStep(d.blockId,...p));if(d.exitSide)assert(model.tryExit(d.blockId,d.exitSide).ok);assert(model.commitAction());};
function decisions(level,drags){
 const c=compileLevel(level),m=new api.PuzzleModel(level),rows=[];m.startCountdown();
 for(let step=0;step<drags.length&&rows.length<3;step++){
  const snap=m.snapshot(),prefix=drags.slice(0,step),correct=drags[step],state=stateFromSnapshot(c,snap);
  forEachGesture(c,state,(i,v,cost,get)=>{if(cost!==1)return;const wrong=get(),b=m.getBlock(wrong.blockId);if(!b||b.shape.length<2||b.id===correct.blockId||rows.some(r=>r.blockId===b.id))return;
   const wr=api.replayRevisedRoute(level,[...prefix,wrong]);if(!wr.valid)return;const blocked=api.replayRevisedRoute(level,[...prefix,wrong,correct]);if(blocked.valid)return;
   const recovery={blockId:b.id,path:[[b.x,b.y],...wrong.path.slice(0,-1)].reverse()};const full=[...prefix,wrong,recovery,...drags.slice(step)],replay=api.replayRevisedRoute(level,full);if(!replay.valid||!replay.complete)return;
   rows.push({atStep:step+1,beforeDrag:step+1,blockId:b.id,area:b.shape.length,correctDrag:correct,legalWrongParking:wrong,blockedNextAction:correct,recoveryDrag:recovery,fullRecoveredRoute:full,meaning:'合法多格误停挡住下一条已验证操作；原路恢复后完成全部关卡。仅局部作用，不声称唯一解或全局惩罚。'});return false;
  });apply(m,correct);
 }return rows;
}
function axisCases(level,drags){
 const cases=[];
 for(const b of level.blocks.filter(b=>b.movementAxis)){
  const relaxed=structuredClone(level);delete relaxed.blocks.find(x=>x.id===b.id).movementAxis;const c=compileLevel(relaxed),m=new api.PuzzleModel(relaxed);m.startCountdown();
  for(let step=0;step<drags.length;step++){
   const prefix=drags.slice(0,step),rr=api.replayRevisedRoute(relaxed,prefix);if(!rr.valid)break;let found;
   forEachGesture(c,stateFromSnapshot(c,m.snapshot()),(i,v,cost,get)=>{if(c.blocks[i].id!==b.id)return;const d=get();if(api.replayRevisedRoute(level,[...prefix,d]).valid||!api.replayRevisedRoute(relaxed,[...prefix,d]).valid)return;found={blockId:b.id,axis:b.movementAxis,beforeDrag:step+1,prefix,blockedAction:d,relaxation:'仅删除该块movementAxis，其它块/冰/门/属性保持',meaning:'相同前缀后该非轴向移动在正式关拒绝、单变量放宽中合法；不冒称全局最优贡献。'};return false;});
   if(found){cases.push(found);break;}apply(m,drags[step]);
  }
 }return cases;
}

export {make,seededRng};
