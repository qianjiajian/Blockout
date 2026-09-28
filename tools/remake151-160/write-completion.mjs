import fs from 'node:fs';
import assert from 'node:assert/strict';
import {api,ruleGate,digest,ROOT} from './common.mjs';
const reportFile=ROOT+'/complete-1790519354493-16476.json',reviewFile=ROOT+'/agent157-159/independent-adoption-review-1790519332003.json';
const r=JSON.parse(fs.readFileSync(reportFile)),review=JSON.parse(fs.readFileSync(reviewFile));assert(r.passed&&review.passed);assert.deepEqual(review.currentFormalIds,Array.from({length:10},(_,i)=>151+i));
const testsFile=ROOT+'/agent157-159/vitest-adoption-final.json',tests=JSON.parse(fs.readFileSync(testsFile));assert(tests.success&&tests.numPassedTests===39);
for(const row of r.rows)assert.equal(digest(api.LEVELS[row.id-1]),row.levelSha256);
const names={easy:'简单',normal:'普通',hard:'困难',super:'超难'};
const text=[
'# 151–160 正式关卡重生成完成',
'',
'任务规则 v1.102；收尾活动规则 v1.105，108份冻结文档完整性检查通过。十关均已正式接入，保留原棋盘几何、时限、三星、名字和历史奖励。没有打包、上传、发布或触碰玩家存档。',
'',
'|关卡|难度|已证明下界 L|完整路线腾挪 U|完整总拖|保留三星拖数|双屏实际星数|',
'|---|---|---:|---:|---:|---:|---:|',
...r.rows.map(x=>`|${x.id}|${names[api.LEVELS[x.id-1].difficulty]}|${x.L}|${x.U}|${x.totalDrags}|${x.stars.moveTarget}|${x.formalInputs.map(i=>i.actualStars).join('/')}|`),
'',
'L是有效下界，U是已验证完整路线的上界；未声称路线最优。下限/上限或多格搬动要求不满足时，已按用户要求在有限预算后换颜色、形状或布局，失败与UNKNOWN证据保持原状。',
'',
'157至少需要32次清除/剥壳事件加11次腾挪，共43拖，高于原42目标；158至少30次清除加21次腾挪，共51拖，高于原40目标。本次没有评分修改授权，保留旧条件并实际验得两星。其余八关双屏均三星。',
'',
'156保留四台真实生成器及各4块固定FIFO，13开局+16队列共29体，16货均实际投放并出清。源4个开局形色和两冰1保持，新增8SQ2+S铺满；队列形色与12→8异形适配逐项记录。L5使用成本不增的开局空间放宽：仅证明副本删除全部队列与机器，同时消除全部冰和翻门约束，拒绝未支持机制；正式地图完整库存未删。当前原模型的全39拖和投影逐单位映射、独立JS下界、负控均通过。',
'',
'验收包括来源及原创差异、完整满铺和每层隐藏库存、原向整图素材、机关/出口、完整路线与fresh下界、20场正式Pointer自然时钟和实际结算。定向关卡/素材回归39/39、队列检查回归31/31、全仓TypeScript --noEmit通过。156指定队列CLI检查四机12个相邻对通过。没有真人盲测或全状态无死锁声明。',
'',
'并行78修复、161–170接入均按实际快照单列保留。每次本批接入前后逐对象检查其它关不受该次写入改变；后续数据批次不改已测对象，模型/绘制/资源字节和自然日志重新核验，旧报告不重标新源码。',
'',
`- [整批验收证据](${reportFile.split('/').at(-1)})`,
`- [独立20场自然日志复核](agent157-159/${reviewFile.split('/').at(-1)})`,
'- [关卡与素材回归](agent157-159/vitest-adoption-final.json)',
'- [源和设计交接151–153/155](agent151-153/REVIEW-HANDOFF.md)',
'- [源和设计交接154/156](agent154-156/handoff154-156-1790519063539.json)',
'- [源和设计交接157–159](agent157-159/README.md)',
'- 正式数据：src/core/remake151to160.ts；路线与逐关证据入口：tests/fixtures/remake151to160-v102.json。',
''];
fs.writeFileSync(ROOT+'/README.md',text.join('\n'));
const lock=ruleGate();fs.writeFileSync(ROOT+'/final-index.json',JSON.stringify({passed:true,activeVersion:lock.activeVersion,ruleLockPassed:lock.ok,scope:[151,160],complete:{file:reportFile,sha256:digest(fs.readFileSync(reportFile))},independent:{file:reviewFile,sha256:digest(fs.readFileSync(reviewFile))},tests:{file:testsFile,sha256:digest(fs.readFileSync(testsFile)),passed:39},files:Object.fromEntries(['src/core/remake151to160.ts','tests/fixtures/remake151to160-v102.json','tests/remake151to160.test.ts','tools/audit-generator-queue-colors.mjs',ROOT+'/README.md'].map(p=>[p,digest(fs.readFileSync(p))])),starConflicts:[157,158],packaged:false,published:false,playerSaveTouched:false},null,2)+'\n',{flag:'wx'});
console.log(ROOT+'/README.md');
