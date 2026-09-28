import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
import {digest,writeNew} from '../remake161-170/common.mjs';
import {loadApi,replay} from '../remake161-170/replay.mjs';
import {replayTiming} from '../remake161-170/observed-timing.mjs';
import {inspectDisjointData} from '../remake91to100-data-drift.mjs';

const ROOT='deliverables/star-targets161-170-20260927',IDS=[161,167,168,170];
const read=p=>JSON.parse(fs.readFileSync(p)),clean=v=>JSON.parse(JSON.stringify(v));
const [configFile]=process.argv.slice(2);assert(configFile);
const config=read(configFile),before=read(ROOT+'/before.json'),applied=read(ROOT+'/applied.json');
const lock=verifyRulesLock();assert(lock.ok,lock.errors.join('\n'));assert.equal(lock.activeVersion,config.activeVersion);
const parallelFile='src/core/remake151to160.ts',parallelValues={157:[42,47],158:[40,59]};
// Only these two independently authorized numeric tokens may differ from our
// immediate baseline. This is not a general allowance for data-module drift.
function restoreParallelScores(raw){
 const ast=ts.createSourceFile(parallelFile,raw,ts.ScriptTarget.Latest,true),edits=[];
 const name=n=>n&&(ts.isStringLiteral(n)||ts.isNumericLiteral(n)||ts.isIdentifier(n))?n.text:null;
 function visit(node){if(ts.isPropertyAssignment(node)&&Object.hasOwn(parallelValues,name(node.name))&&ts.isObjectLiteralExpression(node.initializer)){
  const id=name(node.name),p=node.initializer.properties.find(p=>ts.isPropertyAssignment(p)&&name(p.name)==='preservedMoveTarget');assert(p&&ts.isNumericLiteral(p.initializer));assert.equal(Number(p.initializer.text),parallelValues[id][1]);edits.push({start:p.initializer.getStart(ast),end:p.initializer.end,value:String(parallelValues[id][0])});
 }ts.forEachChild(node,visit);}visit(ast);assert.equal(edits.length,2);
 for(const e of edits.sort((a,b)=>b.start-a.start))raw=raw.slice(0,e.start)+e.value+raw.slice(e.end);return raw;
}
const parallelRaw=fs.readFileSync(parallelFile,'utf8'),parallelOld=restoreParallelScores(parallelRaw);assert.equal(digest(parallelOld),before.inputs[parallelFile]);
const otherBatchFile='src/core/remake191to200.ts',wiringFile='src/core/levels.ts',artFile='src/game/formalBlockShapes.ts';
function readPure191(raw){
 const ast=ts.createSourceFile(otherBatchFile,raw,ts.ScriptTarget.Latest,true);assert.equal(ast.statements.length,4);const [imp,idsStatement,dataStatement,mapper]=ast.statements;
 assert(ts.isImportDeclaration(imp)&&imp.importClause.isTypeOnly&&imp.moduleSpecifier.text==='./types');
 assert(ts.isVariableStatement(idsStatement)&&ts.isVariableStatement(dataStatement));
 const idsDecl=idsStatement.declarationList.declarations[0],dataDecl=dataStatement.declarationList.declarations[0];assert.equal(idsDecl.name.getText(ast),'REMADE_191_200_IDS');assert.equal(dataDecl.name.getText(ast),'reviewed');
 const ids=JSON.parse(idsDecl.initializer.getText(ast)),data=JSON.parse(dataDecl.initializer.getText(ast));assert.deepEqual(ids,Object.keys(data).map(Number));assert(ids.every(id=>Number.isInteger(id)&&id>=191&&id<=200));
 for(const id of ids)assert.equal(data[id].id,id);
 assert.equal(mapper.getText(ast).replace(/\s/g,''),'exportconstapplyRemake191to200=(level:LevelSpec):LevelSpec=>reviewed[level.id]??level;');
 return {ids,data};
}
const otherBatchRaw=fs.readFileSync(otherBatchFile,'utf8'),otherBatch=readPure191(otherBatchRaw);
const parallel171File='src/core/remake171to180.ts',parallel171=inspectDisjointData(parallel171File,IDS);
const ast171=ts.createSourceFile(parallel171File,fs.readFileSync(parallel171File,'utf8'),ts.ScriptTarget.Latest,true);let data171;
for(const statement of ast171.statements)if(ts.isVariableStatement(statement))for(const d of statement.declarationList.declarations)if(d.name.getText(ast171)==='reviewed')data171=JSON.parse(d.initializer.getText(ast171));assert(data171);
const oldStage='export const LEVELS: LevelSpec[] = LEVELS_BEFORE_161_170_REMAKE.map(applyRemake161to170);';
const newStage='export const LEVELS_BEFORE_191_200_REMAKE: LevelSpec[] = LEVELS_BEFORE_161_170_REMAKE.map(applyRemake161to170);\nexport const LEVELS: LevelSpec[] = LEVELS_BEFORE_191_200_REMAKE.map(applyRemake191to200);';
const stage171='export const LEVELS_BEFORE_171_180_REMAKE: LevelSpec[] = LEVELS_BEFORE_191_200_REMAKE.map(applyRemake191to200);\nexport const LEVELS: LevelSpec[] = LEVELS_BEFORE_171_180_REMAKE.map(applyRemake171to180);';
const undoWiring=raw=>raw.replace("import { applyRemake171to180 } from './remake171to180';\n",'').replace(stage171,'export const LEVELS: LevelSpec[] = LEVELS_BEFORE_191_200_REMAKE.map(applyRemake191to200);').replace("import { applyRemake191to200 } from './remake191to200';\n",'').replace(newStage,oldStage);
const wiringRaw=fs.readFileSync(wiringFile,'utf8'),wiringOld=undoWiring(wiringRaw);assert.equal(digest(wiringOld),before.inputs[wiringFile]);
const undoArt=raw=>raw.replace("import { REMADE_171_180_IDS } from '../core/remake171to180';\n",'').replace(' || REMADE_171_180_IDS.includes(levelId)','').replace("import { REMADE_191_200_IDS } from '../core/remake191to200';\n",'').replace(' || REMADE_191_200_IDS.includes(levelId)','');
const artRaw=fs.readFileSync(artFile,'utf8'),artOld=undoArt(artRaw);assert.equal(digest(artOld),before.inputs[artFile]);
const parallel182File='src/core/remake181to190.ts',prior182Path=path.join(read(config.reports[0].file).sourceSnapshot,parallel182File),prior182Raw=fs.readFileSync(prior182Path,'utf8');assert.equal(digest(prior182Raw),before.inputs[parallel182File]);
const preserved181Ids=[181,183,184,186,187,188,189,190],parallel182=inspectDisjointData(parallel182File,preserved181Ids,prior182Raw);
const added181Ids=parallel182.ids.filter(id=>!preserved181Ids.includes(id));assert(added181Ids.every(id=>[182,185].includes(id)));
const ast181=ts.createSourceFile(parallel182File,fs.readFileSync(parallel182File,'utf8'),ts.ScriptTarget.Latest,true);let data181;
for(const statement of ast181.statements)if(ts.isVariableStatement(statement))for(const d of statement.declarationList.declarations)if(d.name.getText(ast181)==='reviewed')data181=JSON.parse(d.initializer.getText(ast181));assert(data181);
const {api}=await loadApi(),levels=clean(api.LEVELS),expected=clean(before.levels.map(r=>r.level));
for(const id of IDS)expected[id-1].preservedMoveTarget=applied.targets[id];
for(const [id,[old,value]]of Object.entries(parallelValues)){assert.equal(expected[id-1].preservedMoveTarget,old);expected[id-1].preservedMoveTarget=value;}
for(const id of otherBatch.ids)expected[id-1]=otherBatch.data[id];
for(const id of added181Ids)expected[id-1]=data181[id];
for(const id of parallel171.ids)expected[id-1]=data171[id];
assert.deepEqual(levels,expected,'All 200: four own scores, two parallel scores and the disjoint pure191–200 mapping');
let reversed=fs.readFileSync(before.sourceFile,'utf8');
for(const edit of applied.edits){assert.equal(reversed.split(edit.after).length,2);reversed=reversed.replace(edit.after,edit.before);}
assert.equal(reversed,before.sourceText,'Precisely remove four added fields to recover original source bytes');
for(const [p,h]of Object.entries(before.inputs))if(![before.sourceFile,parallelFile,wiringFile,artFile,parallel182File].includes(p))assert.equal(digest(fs.readFileSync(p)),h,'Unrelated source drift '+p);
assert.equal(digest(fs.readFileSync(before.fixture)),before.fixtureSha256);
const routes=read(ROOT+'/route-witnesses.json').rows;
const routeReview=routes.map(r=>{const l=levels[r.id-1];assert.deepEqual(l,r.level);const result=replay(l,r.drags,api,{complete:true,requirePointerCompatible:true});assert(result.effectiveDrags<=api.levelStarTargets(l).moveTarget);return{id:r.id,levelSha256:digest(l),routeSha256:digest(r.drags),totalDrags:result.effectiveDrags,U:result.nonClearingDrags,stars:api.levelStarTargets(l)};});
const pointer=[],continuity=[],evidenceFiles=new Set([configFile,ROOT+'/before.json',ROOT+'/applied.json',ROOT+'/registration.json',ROOT+'/route-witnesses.json',ROOT+'/apply-initial-rejection.json',before.fixture]);
assert.equal(config.reports.length,3);
for(const selection of config.reports){
 const {file,ids:selectedIds}=selection,report=read(file);assert(['PASS','FAIL'].includes(report.status));assert(report.requestedIds.every(id=>IDS.includes(id)));assert(selectedIds.every(id=>report.requestedIds.includes(id)));assert(report.formalDataValidated&&report.naturalClock&&!report.clockFrozen&&!report.playerSaveTouched);assert.deepEqual(report.errors,[]);
 if(report.snapshotDrift)assert.deepEqual(report.snapshotDrift,[]);if(report.sourceEvidenceDrift)assert.deepEqual(report.sourceEvidenceDrift,[]);
 for(const [p,h]of Object.entries(report.sourceBindings))assert.equal(digest(fs.readFileSync(p)),h,'Historical evidence '+p);
 const accepted=[];
 for(const [p,h]of Object.entries(report.bindings)){
  const capturedPath=path.join(report.sourceSnapshot,p),captured=fs.readFileSync(capturedPath);assert.equal(digest(captured),h,'Snapshot binding '+p);
  if(p==='tools/star-targets161-170/pinned-retry-playtest.mjs'){
   const original=fs.readFileSync('tools/star-targets161-170/playtest.mjs','utf8');
   const expectedRunner=original.replace("const OUTPUT='deliverables/star-targets161-170-20260927/pointer';",'const RUN_IDS=[168,170];\nconst OUTPUT='+JSON.stringify(path.resolve(ROOT+'/pointer'))+';').replace("'tools/star-targets161-170/playtest.mjs'","'tools/star-targets161-170/pinned-retry-playtest.mjs'").replace('requestedIds:IDS,viewport','requestedIds:RUN_IDS,viewport').replace('for(const data of candidates){','for(const data of candidates.filter(c=>RUN_IDS.includes(c.id))){').replace('assert.deepEqual(report.rows.map(r=>r.id),IDS);','assert.deepEqual(report.rows.map(r=>r.id),RUN_IDS);');
   assert.equal(captured.toString('utf8'),expectedRunner,'Private runner differs only in selected IDs, output path and its own binding name');accepted.push({file:p,kind:'PrivateRunnerExactSixSelectionAndPathEdits',sha256:h});evidenceFiles.add(capturedPath);continue;
  }
  if(digest(fs.readFileSync(p))===h)continue;
  if(p===parallelFile){assert.equal(captured.toString('utf8'),parallelOld);accepted.push({file:p,kind:'Only15742to47And15840to59',priorSha256:h,currentSha256:digest(parallelRaw)});}
  else if(p===wiringFile||p===artFile){assert.equal(p===wiringFile?undoWiring(captured.toString('utf8')):undoArt(captured.toString('utf8')),p===wiringFile?wiringOld:artOld);accepted.push({file:p,kind:'ExactDisjoint171to180And191to200Wiring',priorSha256:h,currentSha256:digest(fs.readFileSync(p)),parallelIds:[...parallel171.ids,...otherBatch.ids]});}
  else if(p===otherBatchFile){const old=readPure191(captured.toString('utf8'));accepted.push({file:p,kind:'PureDisjoint191to200Data',priorSha256:h,currentSha256:digest(otherBatchRaw),priorIds:old.ids,currentIds:otherBatch.ids});}
  else if(p===parallel182File){const audit=inspectDisjointData(p,preserved181Ids,captured.toString('utf8'));accepted.push({file:p,kind:'PureDisjoint182185Addition',priorSha256:h,currentSha256:digest(fs.readFileSync(p)),audit});}
  else if(p===parallel171File){const audit=inspectDisjointData(p,IDS,captured.toString('utf8'));accepted.push({file:p,kind:'PureDisjoint171to180Data',priorSha256:h,currentSha256:digest(fs.readFileSync(p)),audit});}
  else if(p==='docs/rules/manifest.json'){const old=JSON.parse(captured),current=read(p);assert.equal(old.activeVersion,'1.109.0');assert.equal(current.activeVersion,'1.110.0');assert.deepEqual(current.versions.slice(0,-1),old.versions);assert.equal(current.versions.at(-1).version,'1.110.0');accepted.push({file:p,kind:'AppendOnlyFrozenRule110',priorSha256:h,currentSha256:digest(fs.readFileSync(p))});}
  else throw Error('Unreviewed current source drift '+p);
 }
 if(report.status==='FAIL'&&selection.rejectedTimedRow!==undefined){assert.equal(selection.rejectedTimedRow,168);assert.deepEqual(selectedIds,[161,167]);const failed=report.rows.find(r=>r.id===168);assert.equal(failed.settlement.earnedStars,2);assert.equal(failed.settlement.conditions.timeTargetSeconds,82);assert(failed.settlement.conditions.elapsedSeconds>82);assert.equal(failed.settlement.conditions.moveAchieved,true);assert(!selectedIds.includes(168));}
 else if(report.status==='FAIL'){assert(report.currentWorkspaceDrift?.length>0);assert.match(report.error,/Runtime\/art\/rule\/tool drift requires separate concrete review/);assert(report.currentWorkspaceDrift.every(r=>accepted.some(a=>a.file===r.path)));}
 else assert.deepEqual(report.currentWorkspaceDrift,[]);
 continuity.push({report:file,originalStatus:report.status,selectedIds,rejectedTimedRow:selection.rejectedTimedRow,acceptedExactParallelChanges:accepted});
 assert.equal(report.rows.filter(r=>selectedIds.includes(r.id)).length,selectedIds.length);
 for(const row of report.rows.filter(r=>selectedIds.includes(r.id))){
  const level=levels[row.id-1],route=routes.find(r=>r.id===row.id);assert.equal(row.status,'PASS');assert(row.formalObjectIdentity&&!row.candidateOverlay&&row.pointerValidated&&row.naturalClockValidated);assert.equal(row.levelSha256,digest(level));assert.equal(row.routeSha256,digest(route.drags));assert.equal(row.nativeStorageOperations,0);assert.equal(row.nativeDrawAudit.rotated,0);assert.equal(row.nativeDrawAudit.canvasRotationCalls,0);
  assert.equal(digest(fs.readFileSync(row.timingLog.file)),row.timingLog.sha256);const log=read(row.timingLog.file),timing=replayTiming(level,log,api);assert.equal(log.final.moves,route.drags.length);
  const s=row.settlement;assert.equal(s.screen,'win');assert.equal(s.earnedStars,3);assert(s.conditions.moveAchieved&&s.conditions.timeAchieved);assert.deepEqual({moveTarget:s.conditions.moveTarget,timeTargetSeconds:s.conditions.timeTargetSeconds},api.levelStarTargets(level));assert.equal(s.storage.backend,'MemoryHost');assert.equal(s.storage.save.bestStars[String(row.id)],3);assert.equal(s.storage.save.bestMoves[String(row.id)],route.drags.length);assert(!s.assistedClear);assert.deepEqual(s.starImages.sort(),['starCenter','starLeft','starRight']);
  const screenshot=path.join(path.dirname(file),`lv${row.id}-three-stars.png`);evidenceFiles.add(screenshot);evidenceFiles.add(row.timingLog.file);
  pointer.push({id:row.id,report:file,viewport:report.viewport,moves:log.final.moves,earnedStars:3,scoredSeconds:s.conditions.elapsedSeconds,naturalSeconds:timing.activeSeconds,storedBestStars:s.storage.save.bestStars[String(row.id)],storedBestMoves:s.storage.save.bestMoves[String(row.id)],naturalReplay:timing,screenshot});
 }
 evidenceFiles.add(file);
}
for(const id of IDS)assert.deepEqual(pointer.filter(r=>r.id===id).map(r=>r.viewport.width).sort((a,b)=>a-b),[320,496]);
for(const entry of config.reviews){const p=typeof entry==='string'?entry:entry.file,d=read(p);if(typeof entry==='string')assert(d.passed===true||d.status==='PASS','Review PASS required '+p);else assert.equal(d.status,entry.expectedStatus,'Explicit independent review status '+p);evidenceFiles.add(p);}
const tests=read(config.tests);assert(tests.success&&tests.numPassedTests===tests.numTotalTests&&tests.numFailedTests===0);evidenceFiles.add(config.tests);
const typecheck=read(config.typecheck);assert.equal(typecheck.results?.find(r=>r.name==='typecheck')?.exitCode??typecheck.exitCode,0);evidenceFiles.add(config.typecheck);
evidenceFiles.add(config.visualReview);
const visual=read(config.visualReview);assert(visual.passed===true);
const oldMap=before.levels;
const table=IDS.map(id=>`| ${id} | ${oldMap[id-1].starTargets.moveTarget} → ${applied.targets[id]}拖 | ${oldMap[id-1].starTargets.timeTargetSeconds}秒 | ${levels[id-1].timeSeconds}秒 |`).join('\n');
const markdown=`# 161–170三星条件调整完成\n\n本批仅调整此前未达三星的四关，采用已验证完整无道具路线总拖数，不声称最优。\n\n| 关卡 | 三星拖数 | 时间星（保持） | 总时限（保持） |\n| --- | --- | --- | --- |\n${table}\n\n162/163/164/165/166/169的原拖数目标42/92/89/74/82/40保持。所有地图、机制、难度、历史parMoves/reward和其它196关保持，真实玩家存档未访问。未打包、上传或发布；现有微信包未同步这四项评分。\n\n两种屏幕320×568、496×1078共8场实际Pointer自然计时通关均三星；实际显示的新目标、三亮星精灵、隔离MemoryHost中bestStars=3与对应bestMoves均通过。全部自然事件用当前PuzzleModel独立重放，原向素材、图片尺寸和0持久Storage访问通过。\n\n[complete.json](complete.json)绑定全部最终证据；[applied.json](applied.json)记录四个preservedMoveTarget新增值及精确逆还原。本批${tests.numPassedTests}/${tests.numTotalTests}项定向测试通过，TypeScript --noEmit退出0；收尾规则锁${lock.verified.length}版通过（active v${lock.activeVersion}）。\n\n原生成的下界、地图和路线证书保持旧字节，未冒称评分变更是重新认证难度或最优路线。旧交付中四关两星的历史记录仍有效，当前新评分结果以本目录为准；162用户接受原创开局的来源边界保持。未进行真人盲测或手机实测。\n`;
const finalMarkdown=markdown.replace('和其它196关保持','保持，其它196关不因本任务改变').replace('[complete.json](complete.json)','首轮大屏168自然计分108秒超过原82秒，只获两星，该失败原样保留且未采纳。减少并发后另验大屏168/170，时间条件和自然时钟保持；最终索引明确选择通过的8场，不将旧失败改签。\n\n并行v1.110另外调整157/158至47/59拖，已精确核两个数字可逆还原、其余源文件保持及规则只追加。小屏原总报告因此触发严格漂移FAIL；新的独立连续性审查与完整自然日志复验确认当前本批仍通过，未泛化放行其它变化。\n\n[complete.json](complete.json)');
const parallelIds=[...parallel171.ids,...added181Ids,...otherBatch.ids].sort((a,b)=>a-b);
const finalText=finalMarkdown.replace('、其余源文件保持及规则只追加','并核规则只追加；另已审核并行关'+parallelIds.join('/')+'的限定纯JSON数据映射和接入语句，原其它数据及本批四关保持');
fs.writeFileSync(ROOT+'/README.md',finalText,{flag:'wx'});evidenceFiles.add(ROOT+'/README.md');
const parallelDataContinuity={ids:parallelIds,pure171:parallel171,pure182185:parallel182,pure191Ids:otherBatch.ids,exactWiringRestoredSha256:digest(wiringOld),exactArtRestoredSha256:digest(artOld),noRecertificationOfOtherTasks:true};
writeNew(ROOT+'/parallel-data-final.json',parallelDataContinuity);evidenceFiles.add(ROOT+'/parallel-data-final.json');
writeNew(ROOT+'/complete.json',{status:'PASS',scope:'Four scoring fields within 161–170',activeVersion:lock.activeVersion,ruleVersionsVerified:lock.verified.length,modifiedIds:IDS,targets:applied.targets,routeReview,pointer,continuity,parallelScores:{157:47,158:59},parallelSourceExactReversalSha256:digest(parallelOld),tests:{passed:tests.numPassedTests,total:tests.numTotalTests,typecheckExitCode:0},onlyFourScoringFieldsChangedByThisTask:true,other196PreservedByThisTask:true,allTimeTargetsPreserved:true,oldFixturePreserved:true,oldEvidenceNotRelabeled:true,reviews:config.reviews,visualReview:config.visualReview,evidenceHashes:Object.fromEntries([...evidenceFiles].map(p=>[p,digest(fs.readFileSync(p))])),currentSourceSha256:digest(fs.readFileSync(before.sourceFile)),playerSaveTouched:false,packaged:false,published:false});
console.log(JSON.stringify({complete:ROOT+'/complete.json',status:'PASS',modifiedIds:IDS,pointerRuns:pointer.length,tests:tests.numPassedTests}));
