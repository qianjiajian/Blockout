import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi,BASELINE,OUTPUT,assertBaseline,assertProtected,digest,writeNew,ruleGate,TARGETS} from './remake91to100-v146.mjs';

// This is a current-data/replay summary, not a new lower-bound calculation.
// Immutable adoption reports carry the fresh lower-bound calculations.
ruleGate();
const fixture=JSON.parse(fs.readFileSync('tests/fixtures/remake91to100-v147.json'));
const baseline=assertBaseline(JSON.parse(fs.readFileSync(BASELINE)));
const {api}=await loadApi();
const pointers={
 91:['1790267587232','1790267828252'],92:['1790266990107','1790267266940'],
 93:['1790266990107','1790267266940'],95:['1790266466321','1790265785721'],
 96:['1790269636929','1790269637186'],97:['1790271335425','1790271123828'],
 99:['1790264987482','1790264998549'],100:['1790264090817','1790264106705'],
};
const rows=[];
for(let id=91;id<=100;id++){
 const current=api.LEVELS[id-1],entry=fixture.rows.find(r=>r.id===id);
 if(!entry){assert.equal(digest(current),baseline.levels[id-1].sha256);rows.push({id,status:'pending',priorFormalPreserved:true,target:TARGETS[id].range});continue;}
 assertProtected(current,baseline,api);
 assert.equal(digest(current),digest(entry.level));
 const adoption=JSON.parse(fs.readFileSync(entry.adoption));assert.equal(adoption.status,'PASS');
 assert.equal(adoption.verification.levelSha256,digest(current));assert.equal(adoption.verification.routeSha256,digest(entry.drags));
 assert(adoption.verification.floor.thresholdProven);assert.equal(adoption.verification.floor.floor,entry.lowerBound);
 const replay=api.replayRevisedRoute(current,entry.drags);assert(replay.valid&&replay.complete);assert.equal(replay.nonClearingDrags,entry.upperBound);
 const inputReports=pointers[id].map(stamp=>{
  const file=`${OUTPUT}/pointer-${stamp}/report.json`,report=JSON.parse(fs.readFileSync(file)),row=report.rows.find(r=>r.id===id);
  assert.equal(report.status,'PASS');assert.equal(report.candidateOnly,false);assert(report.naturalClock&&!report.clockFrozen&&!report.playerSaveTouched);
  assert.equal(row.status,'PASS');assert.equal(row.levelSha256,digest(current));assert.equal(row.routeSha256,digest(entry.drags));assert(row.final.complete&&!row.final.failed);
  return{file,viewport:report.viewport,totalDrags:row.final.moves,remainingSeconds:row.final.remainingSeconds};
 });
 assert.equal(new Set(inputReports.map(r=>r.viewport.width)).size,2);
 const stars=api.levelStarTargets(current),requiredClears=current.blocks.reduce((n,b)=>n+(b.layers?.length??1),0);
 rows.push({id,status:'adopted-and-dual-pointer-passed',levelSha256:digest(current),target:TARGETS[id].range,lowerBound:entry.lowerBound,upperBound:entry.upperBound,totalDrags:entry.drags.length,timeSeconds:current.timeSeconds,starTargets:stars,minimumTotalDrags:requiredClears+entry.lowerBound,adoption:entry.adoption,inputReports});
}
for(let id=1;id<=30;id++)assert.equal(digest(api.LEVELS[id-1]),baseline.levels[id-1].sha256);
const report={createdAt:new Date().toISOString(),activeVersion:'1.47.0',completed:rows.filter(r=>r.status==='adopted-and-dual-pointer-passed').length,total:10,rows,protected1to30Unchanged:true,lowerBoundsRecalculatedByThisSummary:false,currentDataAndRoutesRevalidated:true,humanBlindTested:false,physicalDeviceTested:false,published:false};
const out=`${OUTPUT}/reviewed-status-${Date.now()}.json`;writeNew(out,report);
const table=rows.map(r=>r.status==='pending'?`|${r.id}|待完成|${r.target.join('–')}|—|—|原正式图保留|`:`|${r.id}|已接入、双屏通过|${r.lowerBound}–${r.upperBound}|${r.totalDrags}|${r.timeSeconds}秒|[接入证据](${r.adoption.split('/').at(-1)})|`).join('\n');
fs.writeFileSync(`${OUTPUT}/README.md`,[
'# 第91–100关制作与验收',
`当前 **${report.completed}/10** 完成正式接入和496×1078、320×568双屏自然时间输入验收。生效规则v1.47；94/98未达标时保留原正式图。`,
'|关卡|状态|已证必挪区间或待验目标|完整拖动|原时限|证据|\n|---|---|---|---|---|---|\n'+table,
'区间下端来自覆盖真实机制的有效下界，上端来自完整无道具路线；不声称已经求出精确最优。每次接入都核对原棋盘、名字、时限、实际三星和历史reward；1–30完整保持，第5关原3块旋转保留。已接入的新块使用已有完整原朝向素材。',
'第91关已证至少47次总拖动，超过旧三星35次；第95关至少42次，超过旧三星38次。原目标按要求保留，待另行标定，未暗改。',
'来源以本地91–100玩法视频及逐层可见事实为准，保留已知机制与初值。必要面积、出口颜色容量和原向适配均在对应候选source/construction及独立source checker报告中分列；不把适配布局称为竞品精确复制。',
`[当前数据与路线复核明细](${out.split('/').at(-1)})。此汇总复核当前正式对象和完整路线，并核对既有不可变下界/双屏报告的哈希，不冒称本次重新穷尽了全部下界。`,
'没有发布、修改玩家存档或进行真人盲测/手机实机验收。UNKNOWN、真实捷径及输入失败报告均保留，不重标通过。',
].join('\n\n')+'\n');
console.log(JSON.stringify({out,completed:report.completed,pending:rows.filter(r=>r.status==='pending').map(r=>r.id)}));
