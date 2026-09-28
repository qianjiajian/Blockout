import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {loadApi} from '../native-block-repair-v143.mjs';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {replayTiming} from './observed-timing.mjs';
import {checkConcurrent200} from './concurrent200.mjs';
const ROOT='deliverables/star-targets151-160-20260927',json=p=>JSON.parse(fs.readFileSync(p)),clean=v=>JSON.parse(JSON.stringify(v));
const reportFiles=process.argv.slice(2);assert.equal(reportFiles.length,2);
const lock=verifyRulesLock();assert(lock.ok,lock.errors.join('\n'));assert(lock.verified.some(v=>v.version==='1.110.0'));
const {api}=await loadApi(),before=json(ROOT+'/before.json'),applied=json(ROOT+'/applied.json'),witnesses=json(ROOT+'/route-witnesses.json');
assert.equal(applied.status,'PASS');
const concurrent=checkConcurrent200(before,api);
const expected=before.levels.map(r=>({...r.level,...([157,158].includes(r.level.id)?{preservedMoveTarget:r.level.id===157?47:59}:{})}));
expected[199]=concurrent.currentLevel200;
expected[181]=concurrent.currentLevel182;
assert.equal(digest(api.LEVELS),digest(expected),'Before plus two score targets and exactly the independently authorized Lv182/200 data');
let expectedRaw=before.moduleRaw;for(const e of [...applied.edits].sort((a,b)=>b.start-a.start)){assert.equal(expectedRaw.slice(e.start,e.end),e.old);expectedRaw=expectedRaw.slice(0,e.start)+e.next+expectedRaw.slice(e.end);}
assert.equal(fs.readFileSync(before.modulePath,'utf8'),expectedRaw,'Exactly two numeric token edits');
const liveSrc=[];function list(p){for(const e of fs.readdirSync(p,{withFileTypes:true})){const f=p+'/'+e.name;if(e.isDirectory())list(f);else liveSrc.push(f);}}list('src');
assert.deepEqual(liveSrc.sort(),[...Object.keys(before.src),'src/core/remake191to200.ts'].sort(),'Only the specific pure-data Lv200 module added');
for(const [p,r]of Object.entries(before.src))assert.equal(digest(fs.readFileSync(p)),concurrent.currentBindings[p]??(p===before.modulePath?digest(Buffer.from(expectedRaw)):r.sha256),`Scope drift: ${p}`);
assert.equal(digest(fs.readFileSync(before.fixturePath)),before.fixtureSha256);
const currentRoutes=witnesses.rows.map(r=>{const l=api.LEVELS[r.id-1];assert.deepEqual(clean(l),r.level);const q=api.replayRevisedRoute(l,r.drags);assert(q.valid&&q.complete,JSON.stringify(q));const targets=api.levelStarTargets(l);assert(r.drags.length<=targets.moveTarget);return {id:r.id,levelSha256:digest(l),totalDrags:r.drags.length,targets,complete:true};});
const rows=[],views=[];
for(const file of reportFiles){const report=json(file);assert(['PASS','FAIL'].includes(report.status));if(report.status==='FAIL'){assert.equal(report.viewport.width,496);assert(report.error.includes('Source file set changed during input'));assert.equal(report.currentWorkspaceDrift,undefined);}else{assert(report.fullBatchValidated);assert.deepEqual(report.currentWorkspaceDrift,[]);}assert(report.formalDataValidated&&!report.candidateOnly);assert(report.naturalClock&&!report.clockFrozen&&!report.playerSaveTouched);assert.deepEqual(report.errors,[]);assert.deepEqual(report.drift,[]);assert.deepEqual(report.sourceEvidenceDrift,[]);views.push(`${report.viewport.width}x${report.viewport.height}`);assert.deepEqual(report.rows.map(r=>r.id),[157,158]);
 for(const [p,h]of Object.entries(report.bindings)){assert.equal(digest(fs.readFileSync(p)),concurrent.currentBindings[p]??h,`Current source: ${p}`);if(concurrent.currentBindings[p])assert.equal(h,before.src[p].sha256,`The actual input must use the unchanged pre-Lv200 source: ${p}`);assert.equal(digest(fs.readFileSync(path.join(report.sourceSnapshot,p))),h,`Snapshot: ${p}`);}
 for(const [p,h]of Object.entries(report.sourceBindings))assert.equal(digest(fs.readFileSync(p)),h);
 for(const row of report.rows){assert.equal(row.status,'PASS');const level=api.LEVELS[row.id-1];assert.equal(row.levelSha256,digest(level));assert.equal(row.actualStars,3);assert(row.formalObjectIdentity&&!row.candidateOverlay);const logFile=path.join(path.dirname(file),`lv${row.id}-observed-timing.json`),timing=replayTiming(level,json(logFile),api),result=row.settlement,targets=api.levelStarTargets(level);
  assert.deepEqual({moveTarget:result.conditions.moveTarget,timeTargetSeconds:result.conditions.timeTargetSeconds},targets);assert.equal(result.storage.backend,'MemoryHost');assert.equal(result.storage.save.bestStars[row.id],3);assert.equal(result.storage.save.bestMoves[row.id],targets.moveTarget);assert(!result.storage.save.activeRun);assert.equal(result.starImages.filter(s=>s.startsWith('empty')).length,0);assert.equal(result.starImages.length,3);
  const screenshot=path.join(path.dirname(file),`lv${row.id}-complete.png`);assert(fs.statSync(screenshot).size>0);rows.push({id:row.id,viewport:report.viewport,levelSha256:row.levelSha256,totalDrags:row.final.moves,elapsedSeconds:result.conditions.elapsedSeconds,actualStars:3,targets,timing,screenshot,report:{file,sha256:digest(fs.readFileSync(file)),originalStatus:report.status,concurrentChangeReviewed:report.status==='FAIL'},log:{file:logFile,sha256:digest(fs.readFileSync(logFile))}});
 }
}
assert.deepEqual(views.sort(),['320x568','496x1078']);
const tests=json(ROOT+'/test-review/vitest.json'),typecheck=json(ROOT+'/test-review/typecheck.json');assert(tests.success&&tests.numPassedTests===41&&tests.numFailedTests===0);assert.equal(typecheck.exitCode,0);
const complete={status:'PASS',ruleVersion:'1.110.0',activeRuleVersion:lock.activeVersion,immutableVersions:lock.verified.length,completedAt:new Date().toISOString(),scope:[157,158],other198UnchangedByThisTask:true,concurrent,onlyTwoNumericTokens:true,allTimesAndGameplayPreserved:true,oldFixturePreserved:true,currentRoutes,formalPointerRuns:rows,tests:{passed:tests.numPassedTests,typecheckExitCode:typecheck.exitCode},playerSaveTouched:false,packaged:false,published:false,humanBlindTested:false,routeOptimal:false};
fs.writeFileSync(ROOT+'/complete.json',JSON.stringify(complete,null,2)+'\n',{flag:'wx'});
const content=['# 151–160 三星条件调整完成','','仅调整当前路线无法满足拖数条件的157、158关，采用已验证完整无道具路线的总拖数，不称最优。其余八关评分、全部时间条件、地图、机关、难度及历史奖励保持。未打包、上传、发布或改动玩家存档。','','|关卡|原拖数条件|新拖数条件|时间星|总时限|','|---|---:|---:|---:|---:|','|157|42|47|68秒|95秒|','|158|40|59|129秒|180秒|','','两关均通过320×568及496×1078正式Pointer输入和自然时钟验收，实际目标文字正确、三亮星结算与隔离MemoryHost保存一致。十关完整路线重新回放通过，41项定向测试与TypeScript检查通过。程序验收不冒充真人盲测或手机实测。','','|关卡|屏幕|实际总拖|计分用时|实际星数|','|---|---|---:|---:|---:|',...rows.map(r=>`|${r.id}|${r.viewport.width}×${r.viewport.height}|${r.totalDrags}|${r.elapsedSeconds}秒|${r.actualStars}|`),'','规则为v1.110；旧生成阶段两星截图、fixture和下界证据保留原字节，新评分不追改旧记录。','','- [完整评分验收](complete.json)','- [即时范围与字段核对](applied.json)','- [十关完整路线](route-witnesses.json)','- [定向测试](test-review/vitest.json)','- [类型检查](test-review/typecheck.json)',''];
fs.writeFileSync(ROOT+'/README.md',content.join('\n'),{flag:'wx'});console.log(JSON.stringify({status:'PASS',rows:rows.map(r=>({id:r.id,viewport:r.viewport,moves:r.totalDrags,seconds:r.elapsedSeconds,stars:r.actualStars})),tests:41,activeRule:lock.activeVersion}));
