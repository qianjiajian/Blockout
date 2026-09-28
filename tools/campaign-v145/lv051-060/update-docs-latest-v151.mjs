import fs from 'node:fs';
const dir='deliverables/remake31-200-v145-20260924/batches/lv051-060';
const statusFile=`${dir}/STATUS.md`,reviewFile=`${dir}/REVIEW.md`;
const status=fs.readFileSync(statusFile,'utf8').replace(/^# 51–60 制作续接\r?\n/,'');
const review=fs.readFileSync(reviewFile,'utf8').replace(/^# 51–60 候选交接\r?\n/,'');
const latest=[
'# 51–60 制作续接','',
'## 最新 v1.51.0 验证状态（本段为当前结论）','',
'规则锁与不可变31–200基线均 PASS。第52关已完成当前候选的下界证明：报告 agent51-54/continued-proof52-1790311438672-8.json 为 threshold-proven=true、L21，6,843,215 个状态耗尽；U26/45 拖路线与新的 v1.51 隔离 Pointer pointer-isolated-1790312639452/report.json 均 PASS。第54关已用新图完成来源契约复核、U13/48拖路线、L11下界证明和 v1.51 隔离 Pointer，提升为常规候选通过。第51、52、53、54、55、56、57、60为常规完整候选；第58为用户例外候选。','',
'第59关已生成新候选并完成阶段检查、U20/51拖路线和 v1.51 隔离 Pointer，但L16仍未证，不能接入：','',
'- 59：新图 agent58-59/enriched59-1790318705675.json；报告 continued-proof59-1790319398101-3.json，v1.51，L16搜索累计498.920秒，12,000,000发现状态、2,561,133展开、9,439,630待处理，最低排队成本10，status=unknown、thresholdProven=false；独立动态分组证明同样UNKNOWN。','',
'当前候选索引已更新：常规候选 [51,52,53,54,55,56,57,60]，用户例外 [58]，待验证 [59]。正式 LEVELS、共享 WORKSTATE、规则文档和生产资源均未写入，未发布。','',
].join('\n');
fs.writeFileSync(statusFile,latest+status);
const reviewLatest=['# 51–60 候选交接','',
'## 最新验证结论（v1.51.0）','',
'第52关已从未证状态升级为候选通过：完整模型证明排除少于21次必挪（L21），路线U26/45拖，当前v1.51隔离Pointer PASS。第54关新候选已完成来源契约复核、L11下界证明、U13/48拖路线及Pointer，现为常规候选通过。第59关新候选U20/51拖和Pointer通过，但L16仍UNKNOWN，继续待验证。第58继续按用户例外处理，不声称L11。机器可读结论以 summary.json、ready-candidates.json、formal-integration-payload-v151.json 为准；未写生产 LEVELS。','',
].join('\n');
fs.writeFileSync(reviewFile,reviewLatest+review);
console.log(JSON.stringify({statusFile,reviewFile}));
