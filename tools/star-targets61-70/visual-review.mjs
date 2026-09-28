// Records only screenshots actually inspected with view_image in this task.
// Mechanical hash/dimension checks support, but do not replace, that inspection.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {digest} from '../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
const lock=verifyRulesLock();assert(lock.ok,lock.errors.join('\n'));
const root='deliverables/star-targets61-70-20260927/pointer-support';
const folders=['pointer-1790510987310-320x568-56492','pointer-1790510987311-496x1078-59264'];
const reports=folders.map(folder=>{const file=root+'/'+folder+'/report.json',report=JSON.parse(fs.readFileSync(file));assert.equal(report.rows.length,6);assert(report.rows.every(r=>r.status==='PASS'));return{folder,file,sha256:digest(fs.readFileSync(file)),report};});
const notes={
 61:'上下缺角轮廓、整片卷帘、四周出口和轴向标记完整可见；没有被顶部导航或底部道具遮挡。',
 62:'左侧生成器及库存数字、上方卷帘、色块外壳和周边冰门均在画面内；数字与边界没有被裁切。',
 65:'矩形棋盘、全部开局色块、四周彩色出口和冰10标记清楚；顶部计时与底部道具间留有空间。',
 67:'纵向异形棋盘、顶部小卷帘、右侧冰块/冰门和底部出口完整；数字未被相邻UI覆盖。',
 68:'上方色块与底部卷帘10均完整，周边出口数字和棋盘轮廓清楚；底部道具没有遮挡卷帘。',
 69:'四片卷帘18/11/6/9、中央开局色块及周边冰门全部可见；没有裁切或遮挡。',
};
const images=[];
for(const [index,{folder,report}]of reports.entries()){
 for(const row of report.rows){
  const kinds=index===0||row.id===61?['opening','three-stars']:['three-stars'];
  for(const kind of kinds){
   const file=root+'/'+folder+`/lv${row.id}-${kind}.png`,bytes=fs.readFileSync(file);
   assert.equal(bytes.subarray(1,4).toString(),'PNG');const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
   assert.deepEqual({width,height},report.viewport);
   images.push({id:row.id,kind,file,sha256:digest(bytes),width,height,inspectedWith:'view_image',status:'PASS',observation:kind==='opening'?notes[row.id]:`关卡${row.id}结算弹窗完整；${row.newStarTargets.moveTarget}次拖动与${row.newStarTargets.timeTargetSeconds}秒文字清楚，三颗亮星和三行勾选可见，继续按钮与关闭按钮未裁切。`});
  }
 }
}
assert.equal(images.length,19);
const summary={status:'VISUAL_PASS',createdAt:new Date().toISOString(),activeRuleVersion:lock.activeVersion,pointerRuleVersion:'1.98.0',scope:'19 actually viewed screenshots: six small-screen openings, all twelve dual-screen settlements, plus the large-screen Lv61 opening',images,reports:reports.map(({file,sha256,report})=>({file,sha256,originalStatus:report.status,rows:report.rows.map(r=>({id:r.id,status:r.status,moves:r.final.moves,elapsedSeconds:r.settlement.conditions.elapsedSeconds,stars:r.settlement.earnedStars})),snapshotDrift:report.snapshotDrift,sourceEvidenceDrift:report.sourceEvidenceDrift,currentWorkspaceDrift:report.currentWorkspaceDrift})),originalReportsModified:false,overallPointerPassClaimed:false,concurrentReviewRequired:true,humanBlindTested:false,physicalDeviceTested:false,playerSaveTouched:false,notes:['Both raw Pointer reports remain FAIL solely at their current-workspace drift guard; each has six PASS gameplay/scoring rows.','The observed drift is src/core/remake91to100.ts and docs/rules/manifest.json; this visual report does not waive or certify that independent change.','Browser mouse events at mobile viewport sizes are not physical phone testing.','This is scoring/visual verification, not a new difficulty or optimality certificate.']};
const base=root+'/visual-review-'+Date.now();
fs.writeFileSync(base+'.json',JSON.stringify(summary,null,2),{flag:'wx'});
const lines=['# 61–70 三星画面复核','', '已通过逐图目检19张截图：六关小屏开局、十二张双屏结算及61关大屏开局。棋盘、色块、门与可见机关完整，顶部/底部UI未遮挡；六组新拖数与原时间文字清楚，三颗亮星、三个条件勾选及按钮完整。','', '| 关卡 | 总拖数 | 小屏计分秒 | 大屏计分秒 | 保留时间星 |','|---|---:|---:|---:|---:|',...reports[0].report.rows.map(r=>`| ${r.id} | ${r.final.moves} | ${r.settlement.conditions.elapsedSeconds} | ${reports[1].report.rows.find(b=>b.id===r.id).settlement.conditions.elapsedSeconds} | ${r.newStarTargets.timeTargetSeconds} |`),'','两份Pointer原始报告总状态均保留FAIL：六行各自PASS，但运行期间并行修改了91–100源文件和规则清单，须由主任务独立核对；本视觉报告不豁免该漂移，也不改签报告。两份私有快照与路线来源文件均零漂移。','', '这是浏览器鼠标输入和指定屏幕尺寸的程序验收，不是手机设备实测或真人盲测；不重新认证63/69等关的难度。逐图路径、尺寸、SHA、观察记录与原报告绑定见同名JSON。',''];
fs.writeFileSync(base+'.md',lines.join('\n'),{flag:'wx'});
console.log(JSON.stringify({output:base+'.json',markdown:base+'.md',status:summary.status,images:images.length,rawPointerStatuses:summary.reports.map(r=>r.originalStatus)}));
