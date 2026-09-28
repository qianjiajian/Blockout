import fs from 'node:fs';
import assert from 'node:assert/strict';
import {OUTPUT, ruleGate} from './remake141to150-v173.mjs';
import {digest} from './revised-preview-validation-v160.mjs';

const names=fs.readdirSync(OUTPUT).filter(n=>/^formal-verified-\d+\.json$/.test(n)).sort().reverse();
assert(names.length);
const formalFile=OUTPUT+'/'+names[0],formal=JSON.parse(fs.readFileSync(formalFile));
assert(formal.passed);assert.deepEqual(formal.ids,[141,142,143,145,146,147,148,149]);
const root=OUTPUT.replace(/\/round2-root$/,'');
const ref=file=>({file,sha256:digest(fs.readFileSync(file))});
const pending=[
 {id:144,candidate:OUTPUT+'/conditional144-metadata-corrected.json',L:5,U:6,drags:31,unknowns:['冰门15的颜色：拟红色','冰门18的颜色：拟绿色','冰门23的颜色：拟粉色'],reports:['pointer-1790477184239','pointer-1790477184221']},
 {id:150,candidate:OUTPUT+'/conditional150-verified-fields.json',L:5,U:10,drags:26,unknowns:['黄色冰7翻门的开局相位：拟初始打开，第7次清除/剥壳后关闭'],reports:['pointer-1790477086270','pointer-1790477086271']},
].map(p=>{
 const c=JSON.parse(fs.readFileSync(p.candidate));assert.equal(c.sourceReview.passed,false);assert.equal(c.level.id,p.id);assert.equal(c.drags.length,p.drags);
 const diagnostic=p.reports.map(n=>{const file=OUTPUT+'/'+n+'/report.json',r=JSON.parse(fs.readFileSync(file)),row=r.rows.find(x=>x.id===p.id);assert.equal(r.status,'PASS');assert.equal(row.levelSha256,digest(c.level));assert.equal(row.routeSha256,digest(c.drags));return ref(file);});
 return {...p,candidate:ref(p.candidate),levelSha256:digest(c.level),routeSha256:digest(c.drags),diagnostic,status:'WAITING_FOR_USER_SOURCE_DESIGN_ACCEPTANCE',formallyInstalled:false,approved:false};
});
const changedFiles=['src/core/remake141to150.ts','src/core/levels.ts','src/game/formalBlockShapes.ts','tests/remake141to150.test.ts','tests/fixtures/remake141to150-v173.json'];
const summary={createdAt:new Date().toISOString(),activeRuleVersion:ruleGate().activeVersion,formal:ref(formalFile),formalIds:formal.ids,formalCount:formal.ids.length,completeTenLevelBatch:false,
 rows:formal.rows.map(r=>({id:r.id,L:r.L,U:r.U,drags:r.drags,candidate:ref(r.candidate),levelSha256:r.levelSha256,routeSha256:r.routeSha256,starAssessment:r.starAssessment,pointer:r.pointer,decisionEvidence:ref(r.decision.file)})),pending,
 validation:{ruleLock:{passed:true,versions:76},integration:{command:'node node_modules/vitest/vitest.mjs run tests/remake141to150.test.ts',passed:3,total:3},typescript:{command:'node node_modules/typescript/bin/tsc --noEmit',exitCode:0},formalPointer:'Two natural-clock viewports for every installed level; current production objects and runtime verified',qualification:'146/148 independent native and JS reviews; see formal report qualificationGate',humanBlindTested:false,physicalPhoneTested:false},
 changedFiles:changedFiles.map(ref),preserved:'Original board geometry, name, total time, actual star targets and historical reward retained; each adoption preserves other levels and levels1–30; concurrent tasks retained',
 reviewEvidence:[root+'/round2-a/review-formal-subset-1790479969356.json',root+'/round2-b/root-prefix-audit-1790480310135.json',root+'/round2-c/assist146/independent-js146-1790479717288.json',root+'/round2-c/assist146/independent-domain146-1790479968942.json',root+'/round2-c/independent-js148-1790477911747.json'].map(ref),
 finiteSearch:'Each candidate uses bounded states/time; failed/UNKNOWN/sub-band candidates stay failed. New colors/shapes/layouts were generated instead of unlimited retries of one candidate.',
 oldFailuresPreserved:['pointer-1790478803885','pointer-1790479270580','pointer-1790479270595'].map(n=>OUTPUT+'/'+n+'/report.json'),playerSaveTouched:false,released:false};
const jsonFile=OUTPUT+'/summary-'+Date.now()+'.json';fs.writeFileSync(jsonFile,JSON.stringify(summary,null,2)+'\n',{flag:'wx'});
const lines=['# 141–150制作与正式验收状态','',`更新时间：${summary.createdAt}；活动规则v${summary.activeRuleVersion}。`,'',
 '**正式完成8/10：141、142、143、145、146、147、148、149。144、150仍保留原正式图。**','',
 'L是已证明的必要腾挪下界，U是完整通关路线的腾挪上界；两者都在对应档位内，不宣称精确最优。','',
 '| 关卡 | 档位 | L | U | 完整路线拖数 | 当前正式双屏 |','|---|---|---:|---:|---:|---|',
 ...summary.rows.map(r=>`| ${r.id} | ${{141:'简单',142:'普通',143:'困难',145:'普通',146:'超难',147:'简单',148:'普通',149:'普通'}[r.id]} | ${r.L} | ${r.U} | ${r.drags} | PASS |`),'',
 '大小屏为496×1078及360×780。正式Pointer使用自然时钟，无道具、无冻结；全部真实库存和机制完成，逐tick独立回放，原向整图绘制，零玩家持久存档访问。来源/形色适配逐项绑定，完整路线、fresh下界、至少两个严格多格误停恢复决策及正式对象hash一致。程序验证不等于真人盲测或手机实测。','',
 `最终正式汇总：[${names[0]}](./${names[0]})；机器索引：[${jsonFile.split('/').at(-1)}](./${jsonFile.split('/').at(-1)})。`,'',
 '## 尚待确认的两关','',
 '144：L5/U6、31拖；冰门15/18/23的颜色拟分别为红/绿/粉。三个颜色在来源录像中不可确认。最终候选：[conditional144-metadata-corrected.json](./conditional144-metadata-corrected.json)。仅修正旧描述中的开局形状文字，地图/路线与已通过诊断输入的对象完全相同。','',
 '150：L5/U10、26拖；黄色冰7翻门拟初始打开，第7次清除/剥壳及相应动画后关闭。录像只确证解冻后关闭，无法确证潜在初相位。最终候选：[conditional150-verified-fields.json](./conditional150-verified-fields.json)。','',
 '两关均已通过隔离候选的双屏自然Pointer、完整机制和严格误停恢复诊断；sourceReview.passed仍false，正式接入门禁未通过。用户选择问题已发出、尚无答复，不把等待时间当批准。当前v1.73保留已知机关并禁止把未知来源当确证，v1.45只对未知隐藏内容提供原创补齐；本次待确认的是开局门属性，因此暂未视作已获换块颜色/种类授权。获得明确选择后按原始事实UNKNOWN与获准设计分列，再跑普通候选门禁、正式接入和最终双屏，不重标旧诊断报告。','',
 '## 原评价限制','',
 '146保留原41拖三星目标。29次必需清除/剥壳加L21，证明至少50拖，因此该原拖数星不可达；完整见证54拖。按既定要求未改评价。147原目标53拖，当前见证55拖；L5只证明至少51拖，尚不能断言53拖不可达。其它六关本轮见证满足原拖数目标，全部8关自然用时均满足原时间目标。','',
 '## 验证、变更及续接','',
 '- 定向Vitest 3/3 PASS；TypeScript检查退出0；76份不可变规则锁PASS。',
 '- 生产新增src/core/remake141to150.ts；在levels.ts和formalBlockShapes.ts接入通过的8关，配套fixture和回归测试。棋盘、时限、实际三星、历史reward保留；其他关卡逐次接入前后保持。',
 '- 旅程UI由并行任务完成；曾造成源漂移的旧报告保留FAIL。UI稳定后重新执行的最终四份双屏报告均PASS，未弱化runtime/art漂移检查。',
 '- 求解均设有限状态与时间预算；未找到候选时改色、换形或调整相应排布。UNKNOWN、低于档位及预算耗尽均未当成PASS，旧候选/来源/证据保留。',
 '- 当前制作及搜索进程均已结束。剩余事项是144/150上述属性的用户选择及其后正式接入验收。未发布、未打新微信包、未改玩家存档。',''];
fs.writeFileSync(OUTPUT+'/STATUS.md',lines.join('\n'));
console.log(JSON.stringify({summary:jsonFile,status:OUTPUT+'/STATUS.md',formalCount:8,pending:[144,150]}));
