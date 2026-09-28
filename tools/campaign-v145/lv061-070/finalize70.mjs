import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi,checkMechanical,writeNew,OUTPUT,ruleGate} from './remake61to70-v146.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {compile,each} from '../../../deliverables/remake31-40-v141-20260924/agent35-37/queue-search.mjs';
import {observeMechanismProcess,verifyDecisions} from '../../review-remake31to40-decisions.mjs';
import {shapeClass} from '../../remake31to40-source-v141.mjs';
const active=ruleGate().activeVersion,{api}=await loadApi(),file=process.argv[2];assert(file);
const data=JSON.parse(fs.readFileSync(file)),{level,drags}=data;assert.equal(level.id,70);
const sourcePath=OUTPUT+'/source-audit/source-review70.json',source=JSON.parse(fs.readFileSync(sourcePath));
assert(source.sourceVerified&&source.unknown.length===0);
for(const[p,h]of Object.entries(source.evidenceBindings))assert.equal(digest(fs.readFileSync(p)),h);
assert.equal(source.truthSha256,digest(fs.readFileSync(source.truthFile)));
const opening=level.blocks.find(b=>b.id==='v146-70-opening');assert.equal(opening.color,'green');assert.equal(shapeClass(opening.shape),'V2');
assert.equal(level.generators.length,1);assert.equal(level.generators[0].queueBlockIds.length,17);
for(const [i,id]of level.generators[0].queueBlockIds.entries()){const b=level.blocks.find(b=>b.id===id),s=source.stages[0].items[i];assert.equal(b.color,s.color);assert.equal(shapeClass(b.shape),s.kind);assert(!b.layers&&!b.frozen&&!b.shutterId&&!b.movementAxis);}
assert.equal(level.gates.length,4);for(const g of level.gates){const s=source.mechanisms.gates.items.find(s=>s.color===g.color);assert(s);assert.equal(g.frozen??0,s.frozen);}
const fills=level.blocks.filter(b=>b.id.includes('-fill-'));assert.equal(fills.reduce((n,b)=>n+b.shape.length,0),36);assert(fills.every(b=>!b.layers&&!b.frozen&&!b.shutterId&&!b.movementAxis));
data.ruleVersion=active;data.generationContract='1.45.0';data.sourceStatus='verified-with-necessary-board-and-runtime-adaptation';
data.sourceAdaptation={sourcePath,sourceFileSha256:digest(fs.readFileSync(sourcePath)),openingSourceIds:[opening.id],queueMapping:level.generators[0].queueBlockIds.map((id,i)=>({id,sourceId:source.stages[0].items[i].sourceId})),
 addedOrdinaryBlocks:fills.map(b=>({id:b.id,shape:shapeClass(b.shape),color:b.color})),
 differences:[{field:'opening coverage',sourceCells:2,designCells:38,reason:'保基线38格棋盘，原green V2保留；新增18个无机关双色向独立多格块补36格，不留洞。新填形状均现有原向整图。'},
 {field:'opening color classes',source:['green'],design:[...new Set(level.blocks.filter(b=>!level.generators[0].queueBlockIds.includes(b.id)).map(b=>b.color))].sort(),reason:'仅1源可见块颜色无法用多个可见块满铺且正交异色，补充色仅从源全关四种已有颜色取，未新增出口/颜色种类。'},
 {field:'generator trigger',source:'timed occupancy-gated',design:'immediate fixed-space dispatch',reason:'当前机制硬规则固定空间落点空闲即投放，完整17货原顺序原形原色保留，不引入旧定时机器。'}],
 preserved:['all 17 queued bodies in order','source opening green V2','four source colors','three frozen gate counts 1/1/1 and blue ordinary','baseline board/name/time/actual stars/historical reward']};
data.originality={layoutIntent:'竖向与横向双格组成规整错位通路，先移出蓝块腾出工作位再疏通机口。',alignment:'相邻块边界沿整格行列对齐，保留缺角棋盘，并形成横竖交接工作位。',changes:'来源开局只有单个竖块、后续自动铺板；新设计在固定38格满铺中安排多格互锁，区别于来源坐标与旧双机器横条正式图。',constraints:'保原棋盘且开局必须满铺，增加36格普通块；保留17件队列和全部门冰，三星目标23拖无法继续达到。'};
data.design={primaryMechanism:'单台固定空间生成器与双格通路让位',concreteDecision:'移开机口占位会立即投放后续货物；必须同时为当前块和新货保留可达出口的工作位。',sourceAlignment:'逐帧核实17件固定序列，仅开局补满和定时到空间触发作硬规则必要适配。'};
const model=new api.PuzzleModel(level),c=compile(level),found=[],queue=new Set(level.generators[0].queueBlockIds);model.startCountdown();
const apply=d=>{model.beginAction();for(const p of d.path)assert(model.moveBlockStep(d.blockId,...p));if(d.exitSide)assert(model.tryExit(d.blockId,d.exitSide).ok);assert(model.commitAction());};
for(let step=0;step<drags.length-1;step++){
 const snap=model.snapshot(),d=drags[step],state=Uint16Array.from(c.blocks.map(b=>{const a=snap.blocks.find(x=>x.id===b.id);return a?(a.y*c.W+a.x)|((b.layers.length-a.layers.length)<<7):snap.queuedBlocks.some(x=>x.id===b.id)?510:511;}));
 each(c,state,(_next,cost,get)=>{if(cost!==1)return;const wrong=get(),b=snap.blocks.find(x=>x.id===wrong.blockId);if(b.id===d.blockId||b.shape.length<2)return;const prefix=drags.slice(0,step),bad=api.replayRevisedRoute(level,[...prefix,wrong,d]);if(bad.valid||!bad.error?.startsWith('Rejected move'))return;
  if(!api.replayRevisedRoute(level,[...prefix,wrong]).valid)return;
  const recovery={blockId:b.id,path:[[b.x,b.y],...wrong.path.slice(0,-1)].reverse()},restored=api.replayRevisedRoute(level,[...prefix,wrong,recovery]),before=api.replayRevisedRoute(level,prefix);if(!restored.valid||restored.finalStateKey!==before.finalStateKey)return;
  const full=[...prefix,wrong,recovery,...drags.slice(step)],complete=api.replayRevisedRoute(level,full);if(!complete.valid||!complete.complete)return;
  found.push({atStep:step+1,beforeDrag:step+1,blockId:b.id,area:b.shape.length,correctDrag:d,legalWrongParking:wrong,blockedNextAction:d,recoveryDrag:recovery,fullRecoveredRoute:full,
   mechanismContext:{generatorRemaining:snap.generators[0].remaining,parkingCargo:queue.has(b.id),nextCargo:queue.has(d.blockId)},score:(queue.has(b.id)?10:0)+(queue.has(d.blockId)?10:0)});return false;
 });apply(d);
}
found.sort((a,b)=>b.score-a.score);data.decisionCases=[];for(const f of found)if(!data.decisionCases.some(c=>c.blockId===f.blockId||c.atStep===f.atStep)){delete f.score;data.decisionCases.push(f);if(data.decisionCases.length===3)break;}
const checks=await checkMechanical(data,api),decisions=verifyDecisions(data,api),mechanisms=observeMechanismProcess(level,drags,api);
assert.equal(mechanisms.generatorEvents.flatMap(e=>e.spawned).length,17);
const out=OUTPUT+'/author70/final70-'+Date.now()+'.json';writeNew(out,data);
const evidence=out.replace('.json','-checks.json');writeNew(evidence,{...checks,ruleVersion:active,sourceAlignmentValidated:true,sourceAdaptation:data.sourceAdaptation,decisionsValidated:true,decisions,mechanisms,inputs:{candidate:digest(fs.readFileSync(out)),source:digest(fs.readFileSync(sourcePath)),constructor:digest(fs.readFileSync('tools/campaign-v145/lv061-070/author70-v146.mjs'))}});
console.log(JSON.stringify({out,evidence,L:checks.lowerBound,U:checks.upperBound,decisions:decisions.length,stars:checks.starAssessment}));
