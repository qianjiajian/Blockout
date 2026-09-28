import fs from 'node:fs';
import assert from 'node:assert/strict';
import {ROOT,digest,ruleGate,writeNew,auditSpatial} from './common.mjs';
import {loadApi,replay} from './replay.mjs';

const lock=ruleGate(),{api}=await loadApi(),baseline=JSON.parse(fs.readFileSync(ROOT+'/baseline.json'));
const expected=[192,193,194,195,197,198,199,200];
const reports=[
 'formal-verified-1790524065281.json','formal-verified-1790524678685.json',
 'formal-verified-1790525044397.json','formal-verified-1790525938312.json',
 'formal-verified-1790526203192.json','formal-verified-1790527379450.json',
 'formal-verified-1790528604676.json'
];
const fixture=JSON.parse(fs.readFileSync('tests/fixtures/remake191to200-v108.json'));
assert.deepEqual(fixture.rows.map(r=>r.id),expected);
const rows=[];
for(const name of reports){
 const file=ROOT+'/'+name,r=JSON.parse(fs.readFileSync(file));assert.equal(r.status,'FORMAL_SUBSET_COMPLETE');
 for(const row of r.rows){
  const l=api.LEVELS[row.id-1],f=fixture.rows.find(f=>f.id===row.id);assert(f);
  assert.equal(digest(l),row.levelSha256);assert.deepEqual(l,f.level);
  auditSpatial(l,api);const route=replay(l,f.drags,api,{complete:true,requirePointerCompatible:true});
  assert.equal(route.nonClearingDrags,row.U);assert.equal(f.lowerBound,row.L);assert.equal(f.drags.length,row.drags);
  for(const p of row.pointer){
   assert.equal(digest(fs.readFileSync(p.report)),p.reportSha256);
   assert.equal(digest(fs.readFileSync(p.observed)),p.observedSha256);
   for(const[image,h]of Object.entries(p.screens))assert.equal(digest(fs.readFileSync(image)),h);
  }
  rows.push({...row,formalReview:file,formalReviewSha256:digest(fs.readFileSync(file))});
 }
}
rows.sort((a,b)=>a.id-b.id);assert.deepEqual(rows.map(r=>r.id),expected);
for(const id of [191,196])assert.equal(digest(api.LEVELS[id-1]),baseline.levels[id-1].sha256,'Pending source acceptance keeps old formal '+id);
const independentFiles=[
 ROOT+'/author194-196/final-review/complete-1790527937952.json',
 ROOT+'/author194-196/assist194-prefix/review194-1790528526945.json',
 ROOT+'/author191-193/assist194/review-selected194-1790528527192-20668.json'
];
const independent=independentFiles.map(file=>({file,sha256:digest(fs.readFileSync(file))}));
const adoptionFile=ROOT+'/adoption-1790528504644-result.json',adoption=JSON.parse(fs.readFileSync(adoptionFile));
const before=JSON.parse(fs.readFileSync(ROOT+'/adoption-1790528504644-before.json'));
assert.equal(adoption.otherLevelsUnchanged,199);assert.deepEqual(adoption.ids,[194]);
for(const l of api.LEVELS)assert.equal(digest(l),digest(l.id===194?fixture.rows.find(r=>r.id===194).level:before.levels[l.id-1]),'Current serialized level '+l.id);
const pending=[
 {id:191,status:'USER_SOURCE_ACCEPTANCE_PENDING',candidate:ROOT+'/author191-193/ready191-1790525168324.json',L:11,U:15,drags:31,proposal:'Accept the tested authored opening; original source initial state remains UNKNOWN.'},
 {id:196,status:'USER_SOURCE_ACCEPTANCE_PENDING',candidate:ROOT+'/author194-196/candidate196-1790523269570.json',L:5,U:10,drags:27,proposal:'Accept authored frozen flip phases pink open, green and purple closed; retain all seven ice gates at2. Unobserved source phases remain UNKNOWN.'}
];
for(const p of pending)p.candidateSha256=digest(fs.readFileSync(p.candidate));
const out=ROOT+'/final-index-'+Date.now()+'.json';
const record={status:'EIGHT_FORMAL_COMPLETE_TWO_SOURCE_ACCEPTANCES_PENDING',createdAt:new Date().toISOString(),activeRuleVersion:lock.activeVersion,taskRuleVersion:'1.108.0',fullTenComplete:false,completed:rows,pending,independent,currentCampaignSha256:digest(api.LEVELS),currentModuleSha256:digest(fs.readFileSync('src/core/remake191to200.ts')),fixtureSha256:digest(fs.readFileSync('tests/fixtures/remake191to200-v108.json')),latestAdoption:{file:adoptionFile,sha256:digest(fs.readFileSync(adoptionFile)),other199Preserved:true},verification:{targetedTests:26,targetedTestsPassed:26,typescriptNoEmitExitCode:0,reportedFromRootExecution:true,rulesLockPassed:true},limitations:['195/197/198 retain original move targets26/25/56 and actual two-star results.','194 lower bound uses disjoint prefix8 + tail3 with the qualified original native graph; direct full PuzzleModel tail attempt remains UNKNOWN.','191/196 source question is unanswered; silence is not approval.','No human blind test, phone test, all-strategy deadlock guarantee, packaging, upload or release.'],playerSaveTouched:false,release:false};
writeNew(out,record);
const rel=p=>p.slice(ROOT.length+1);
const readme=`# 191–200 关重生成

当前 **8/10关正式完成**，191、196的具体来源方案仍待用户答复。任务规则v1.108，活动规则v${lock.activeVersion}。失败候选均按有限预算停止，换色、换形或重排后重新验证；旧失败和UNKNOWN记录保留。

L为已证非清除拖动下界，U为完整路线中的非清除拖动数；总拖另列，不称最优。

|关卡|状态|L / U|完整总拖|正式双屏星级|
|---|---|---:|---:|---:|
${Array.from({length:10},(_,i)=>191+i).map(id=>{const r=rows.find(r=>r.id===id),p=pending.find(p=>p.id===id);return r?'|'+id+'|正式双屏完成|'+r.L+' / '+r.U+'|'+r.drags+'|'+([195,197,198].includes(id)?2:3)+'|':'|'+id+'|候选双屏完成，来源方案待答|'+p.L+' / '+p.U+'|'+p.drags+'|未正式接入|';}).join('\n')}

第194关保31本体、2壳、四帘5/7/7/10、六冰门2/3/9/14/19/25及真实橙SQ2队列。新图完整45拖含12次多格腾挪；第10次清除前L8和揭帘后13体放宽尾段L3可加为L11。尾段移除队列及其它外部色块，并将其18次清除全部提前计入冰门解冻。有效证据用已合资格原native图，前缀3954态、尾段27382态排尽；实际模型直接尾搜索10秒UNKNOWN仍保留。原140秒、90拖/100秒三星保持，正式双屏实际三星。

第195、197、198关原三星26/25/56拖保持，已证至少需34/31/62拖，实际路线38/35/70拖，因此正式双屏为两星。本任务未授权调整评分；其余五个正式关实际三星。

待答方案：191接受已验证原创开局（L11/U15、31拖）；196接受粉翻门初始开、绿和紫初始关（L5/U10、27拖），七冰门计数2保持。两关缺失来源仍记UNKNOWN，不冒称竞品确证。规则v1.108不提供新增来源豁免，未收到具体接受答复前保留这两关旧正式数据。

最终正式验收：

${rows.map(r=>'- '+r.id+'：['+rel(r.formalReview)+']('+rel(r.formalReview)+')。').join('\n')}

独立审查：

${independent.map(r=>'- ['+rel(r.file)+']('+rel(r.file)+')。').join('\n')}

26/26定向测试、TypeScript无输出编译和规则锁通过。正式320×568、496×1078均完成真实Pointer及自然时钟验收，观察日志经独立模型逐事件重放；每次接入均核其它199关保持，并行成果不回退。使用隔离MemoryHost，未触碰玩家存档。未打包、上传或发布，不冒称真人盲测、手机实测或任意走法无死锁。

最终绑定索引：[${rel(out)}](${rel(out)})。生产数据为src/core/remake191to200.ts；完整路线及L/U为tests/fixtures/remake191to200-v108.json。
`;
fs.writeFileSync(ROOT+'/README.md',readme);
const work='docs/rules/WORKSTATE.md',raw=fs.readFileSync(work,'utf8'),anchor='## 191–200有限重生成（2026-09-27，task v1.108 / active v1.110，进行中）';assert(raw.includes(anchor));
const heading='## 191–200有限重生成（2026-09-28，task v1.108 / active v'+lock.activeVersion+'，8关完成、2关待来源答复）';
const note='\n\n- 最新收尾：192/193/194/195/197/198/199/200共8关正式双屏完成；191/196候选及双屏完成但具体来源接受仍待用户答复，旧正式两关保持。'+rel(out)+'及README.md是当前真实状态。194采用additive194-1790528146236-39900，L8前缀3954态+L3尾27382态有效相加11，完整U12/45拖；四帘/六冰/2壳/31体/真实单FIFO及原140秒、90拖/100秒保持，正式两屏均三星，formal-verified-1790528604676.json。尾实际模型10秒UNKNOWN未重标，未把未资格FIFO工具初筛当正式证书。\n- 26/26定向测试、tsc--noEmit退出0、114规则锁PASS；新194两场完整自然日志独立重放，其余七关先前14场已独审通过，不重复扩大测试。195/197/198原星目标26/25/56与至少34/31/62冲突仍保原两星结果，不擅改评分。队列CLI仅补已审活动1.111 allowlist，算法与阈值不变，194单FIFO静态检查PASS。所有自有生成及Pointer进程结束；没有打包/上传/发布/真实存档或共享runtime/UI/美术修改。下一步只在收到191原创开局、196粉开绿紫关具体接受后登记精确来源例外并按既有候选接入/最终双屏；不把沉默当许可。\n';
assert.equal(fs.readFileSync(work,'utf8'),raw);fs.writeFileSync(work,raw.replace(anchor,heading+note));
console.log(JSON.stringify({out,ids:expected,pending:[191,196]}));
