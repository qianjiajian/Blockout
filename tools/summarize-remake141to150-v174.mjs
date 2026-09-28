import fs from 'node:fs';
import assert from 'node:assert/strict';
import {OUTPUT,ruleGate,loadApi} from './remake141to150-v173.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
const [integrationFile,typescriptFile]=process.argv.slice(2);assert(integrationFile&&typescriptFile);
const integration=JSON.parse(fs.readFileSync(integrationFile)),typescript=JSON.parse(fs.readFileSync(typescriptFile));
assert(integration.success&&integration.numPassedTests===3&&integration.numFailedTests===0);assert.equal(typescript.exitCode,0);
const names=fs.readdirSync(OUTPUT).filter(n=>/^formal-verified-\d+\.json$/.test(n)).sort().reverse();
const formalFile=OUTPUT+'/'+names[0],formal=JSON.parse(fs.readFileSync(formalFile));
assert(formal.passed&&formal.completeTenLevelBatch);assert.deepEqual(formal.ids,Array.from({length:10},(_,i)=>141+i));
const installedName=fs.readdirSync(OUTPUT).filter(n=>/^installed-\d+\.json$/.test(n)).sort().reverse()[0];
const installedFile=OUTPUT+'/'+installedName,installed=JSON.parse(fs.readFileSync(installedFile));assert.deepEqual(installed.ids,[144,150]);assert(installed.otherLevelsPreserved);
const {api}=await loadApi(),fixture=JSON.parse(fs.readFileSync('tests/fixtures/remake141to150-v173.json'));
const ref=file=>({file,sha256:digest(fs.readFileSync(file))});
for(const l of api.LEVELS){const row=fixture.rows.find(r=>r.id===l.id);if(row)assert.deepEqual(l,row.level);if(!installed.ids.includes(l.id))assert.equal(digest(l),digest(installed.campaignBefore[l.id-1]),'Unrequested level changed '+l.id);}
const accepted=fixture.rows.filter(r=>[144,150].includes(r.id)).map(r=>{const d=JSON.parse(fs.readFileSync(r.candidate));assert.equal(d.sourceReview.acceptance.status,'USER_ACCEPTED_AUTHORED_SOURCE_FIELDS');assert.equal(d.sourceReview.acceptance.sourceFactsStatus,'UNKNOWN');return{id:r.id,...d.sourceReview.acceptance};});
const reviewFile=OUTPUT.replace(/\/round2-root$/,'/round2-a/review144150-v174-1790481974421.json');assert.equal(JSON.parse(fs.readFileSync(reviewFile)).passed,true);
const integrationReviewFile=OUTPUT.replace(/\/round2-root$/,'/round2-a/audit-final174-1790482243809.json');assert.equal(JSON.parse(fs.readFileSync(integrationReviewFile)).passed,true);
const rules=ruleGate(),summary={createdAt:new Date().toISOString(),activeRuleVersion:rules.activeVersion,formalCount:10,formalIds:formal.ids,completeTenLevelBatch:true,pending:[],formal:ref(formalFile),adoption:ref(installedFile),independent144150Review:ref(reviewFile),
 rows:formal.rows.map(r=>({id:r.id,L:r.L,U:r.U,drags:r.drags,candidate:ref(r.candidate),levelSha256:r.levelSha256,routeSha256:r.routeSha256,pointer:r.pointer,starAssessment:r.starAssessment,decision:ref(r.decision.file)})),acceptedAuthoredSourceFields:accepted,
 validation:{integration:ref(integrationFile),typescript:ref(typescriptFile),ruleLock:{passed:true,activeVersion:rules.activeVersion,immutableVersions:77},formalPointer:'PASS for every exact formal object on496x1078 and360x780 with natural clock',humanBlindTested:false,physicalPhoneTested:false},
 integrationReview:ref(integrationReviewFile),currentBindings:['src/core/remake141to150.ts','src/core/levels.ts','src/game/formalBlockShapes.ts','src/core/PuzzleModel.ts','src/game/ColorEscapeGame.ts','tests/fixtures/remake141to150-v173.json','docs/rules/mechanism-rules-v1.74.0.md'].map(ref),other198Preserved:true,first30Preserved:true,playerSaveTouched:false,released:false};
const out=OUTPUT+'/complete-v174-'+Date.now()+'.json';fs.writeFileSync(out,JSON.stringify(summary,null,2)+'\n',{flag:'wx'});
const difficulty={141:'简单',142:'普通',143:'困难',144:'简单',145:'普通',146:'超难',147:'简单',148:'普通',149:'普通',150:'简单翻门首教'};
const lines=['# 141–150正式关卡完成记录','',`更新时间：${summary.createdAt}；活动规则v${summary.activeRuleVersion}。`,'',
 '**141–150共10关均已正式接入，并完成各自最终正式双屏验收。**','',
 'L是必要腾挪的有效下界，U是完整通关路线给出的腾挪上界；并非精确最优次数。','',
 '| 关卡 | 档位 | L | U | 完整拖数 | 正式双屏 |','|---|---|---:|---:|---:|---|',...summary.rows.map(r=>`| ${r.id} | ${difficulty[r.id]} | ${r.L} | ${r.U} | ${r.drags} | PASS |`),'',
 `当前机器索引：[${out.split('/').at(-1)}](./${out.split('/').at(-1)})；最终证据汇总：[${names[0]}](./${names[0]})。`,'',
 '两种屏幕为496×1078及360×780，使用真实Pointer与自然时钟，不使用道具或冻结。全库存完整通关、自然tick与翻门动画回调独立回放、原向整图、严格多格误停恢复及当前正式对象hash均通过。程序验收不冒称真人盲测或手机实测。','',
 '## 144与150的已确认原创属性','',
 '用户在知悉必要腾挪达标和门属性缺口后明确“正式接入”，登记不可变v1.74：144冰15红/18绿/23粉；150黄冰7翻门初始打开，第7次清除/剥壳对应动画完成后关闭。源事实仍标UNKNOWN，采用值标USER_ACCEPTED_AUTHORED_SOURCE_FIELDS。两份新授权包装的地图/路线与此前展示候选相同，旧sourceReview=false和诊断报告保留。','',
 '本次重新完成普通候选双屏、正式接入及最终正式双屏；未把旧诊断报告改名为正式通过。两关仍维持L5，完整路线分别U6/31拖与U10/26拖。','',
 '## 原评价限制','',
 '146原41拖目标保留，但29次清除/剥壳加L21证明至少50拖，原拖数星不可达，当前见证54拖。147原53拖目标，当前见证55拖；L5仅证明至少51拖，不能断言53拖不可达。时限及实际三星目标依既定要求未改，未把新图通过当成评价已重新标定。','',
 '## 验证和保留','',
 '- 定向集成3/3 PASS，TypeScript退出0，77份不可变规则锁PASS。',
 '- 本次仅新增144/150正式数据；逐关对照接入前后其它198关及1–30保持，先前8关、并行UI与其他任务成果保持。',
 '- 每份候选求解设有限状态/时间预算；失败则换颜色/形状与必要布局，UNKNOWN不计PASS。旧失败候选、来源和证明保留。',
 '- 原基线棋盘、关号/名字、时限、实际三星、历史reward、运行机制、账户与玩家存档保持。未重新打微信包，未上传发布。',''];
fs.writeFileSync(OUTPUT+'/STATUS.md',lines.join('\n'));
console.log(JSON.stringify({output:out,status:OUTPUT+'/STATUS.md',formalCount:10,completeTenLevelBatch:true}));
