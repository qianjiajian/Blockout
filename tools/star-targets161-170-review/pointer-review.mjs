import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {loadApi} from '../remake161-170/replay.mjs';
import {replayTiming} from '../remake161-170/observed-timing.mjs';
import {reviewParallel191,parseParallel191,reviewParallel182,parseParallel171,restoreParallelWiring} from './parallel191-review-v2.mjs';

const ROOT='deliverables/star-targets161-170-20260927',OUT=ROOT+'/review';
const read=p=>JSON.parse(fs.readFileSync(p)),hash=p=>digest(fs.readFileSync(p));
const config=read(process.argv[2]);
const lock=verifyRulesLock();assert(lock.ok,lock.errors.join('\n'));assert(lock.verified.some(v=>v.version==='1.109.0'));assert(lock.verified.some(v=>v.version==='1.110.0'));
const before=read(ROOT+'/before.json'),witnesses=read(ROOT+'/route-witnesses.json'),dataReview=read(config.dataReview);
assert.equal(dataReview.status,'INDEPENDENT_SCORE_DATA_REVIEW_PASS');
const parallel191=reviewParallel191(before),parallel182=reviewParallel182(before);
assert(lock.verified.some(v=>v.version==='1.106.0'));const parallel171File='src/core/remake171to180.ts',parallel171=parseParallel171(fs.readFileSync(parallel171File,'utf8'));parallel171.moduleSha256=hash(parallel171File);
const walk=p=>fs.readdirSync(p,{withFileTypes:true}).flatMap(d=>d.isDirectory()?walk(p+'/'+d.name):[p+'/'+d.name]);
assert.deepEqual(walk('src').sort(),[...Object.keys(before.inputs),'src/core/remake191to200.ts',parallel171File].sort(),'Only the explicitly reviewed new production data modules');
for(const[p,h]of Object.entries(before.inputs))if(!['src/core/remake151to160.ts','src/core/remake161to170.ts','src/core/remake181to190.ts','src/core/levels.ts','src/game/formalBlockShapes.ts'].includes(p))assert.equal(hash(p),h,'Unrelated production file '+p);
assert.equal(hash(before.sourceFile),read(ROOT+'/applied.json').afterSha256);assert.equal(hash(before.fixture),before.fixtureSha256);
const parallelFile='src/core/remake151to160.ts',pBefore=read('deliverables/star-targets151-160-20260927/before.json'),pApplied=read('deliverables/star-targets151-160-20260927/applied.json');
assert.equal(digest(pBefore.moduleRaw),before.inputs[parallelFile]);let parallelCurrent=pBefore.moduleRaw;
for(const e of [...pApplied.edits].sort((a,b)=>b.start-a.start)){assert.equal(parallelCurrent.slice(e.start,e.end),e.old);parallelCurrent=parallelCurrent.slice(0,e.start)+e.next+parallelCurrent.slice(e.end);}
assert.equal(parallelCurrent,fs.readFileSync(parallelFile,'utf8'));
assert.deepEqual(pApplied.edits.map(e=>[e.id,Number(e.old),Number(e.next)]),[[157,42,47],[158,40,59]]);
const {api}=await loadApi();
const expected=before.levels.map(r=>structuredClone(r.level));for(const r of witnesses.rows)expected[r.id-1]=r.level;for(const[id,v]of[[157,47],[158,59]])expected[id-1].preservedMoveTarget=v;expected[181]=parallel182.level;for(const id of parallel191.ids)expected[id-1]=parallel191.objects[id];for(const id of parallel171.ids)expected[id-1]=parallel171.objects[id];for(let i=0;i<200;i++)assert.equal(digest(api.LEVELS[i]),digest(expected[i]),'Unexplained current level '+(i+1));
const built=await build({stdin:{resolveDir:process.cwd(),contents:"export {evaluateLevelStars} from './src/core/levelStarConditions.ts';"},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const scoring=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const selections=[],continuity=[],rejected=[];
for(const item of config.reports){
 const report=read(item.file);assert(report.formalDataValidated&&report.naturalClock&&!report.clockFrozen&&!report.playerSaveTouched);assert.deepEqual(report.errors,[]);
 const drift=[];
 for(const [p,h]of Object.entries(report.bindings)){
  const snap=path.join(report.sourceSnapshot,p);assert.equal(hash(snap),h,'Snapshot binding '+p);
  if(p==='tools/star-targets161-170/pinned-retry-playtest.mjs'){
   const original='tools/star-targets161-170/playtest.mjs',raw=fs.readFileSync(original,'utf8');let exact=raw.replace("const OUTPUT='deliverables/star-targets161-170-20260927/pointer';",'const RUN_IDS=[168,170];\nconst OUTPUT='+JSON.stringify(path.resolve(ROOT+'/pointer'))+';').replace("'tools/star-targets161-170/playtest.mjs'","'tools/star-targets161-170/pinned-retry-playtest.mjs'").replace('requestedIds:IDS','requestedIds:RUN_IDS').replace('for(const data of candidates){','for(const data of candidates.filter(c=>RUN_IDS.includes(c.id))){').replace('assert.deepEqual(report.rows.map(r=>r.id),IDS);','assert.deepEqual(report.rows.map(r=>r.id),RUN_IDS);');assert.equal(fs.readFileSync(snap,'utf8'),exact,'Private retry only changes selection/output/self-binding');drift.push({file:p,kind:'PrivateRetryExactSelectionOutputAndSelfBindingOnly',privateSha256:h,originalTool:original,originalToolSha256:hash(original),inputSamplingAndNaturalClockByteUnchanged:true});continue;
  }
  const now=hash(p);if(now===h)continue;
  if(p===parallelFile){assert.equal(fs.readFileSync(snap,'utf8'),pBefore.moduleRaw);drift.push({file:p,kind:'PreciselyTwoParallelScoreNumbers',before:h,after:now});}
  else if(p==='src/core/levels.ts'||p==='src/game/formalBlockShapes.ts'){assert.equal(digest(restoreParallelWiring(p,fs.readFileSync(snap,'utf8'))),before.inputs[p]);assert.equal(parallel191.restoredHashes[p],before.inputs[p]);drift.push({file:p,kind:'PreciselyReversible171And191PureDataStages',before:h,after:now});}
  else if(p==='src/core/remake181to190.ts'){assert.equal(h,parallel182.moduleBeforeSha256);assert.equal(now,parallel182.moduleSha256);drift.push({file:p,kind:'Precisely182DataAdditionWithOldEightPreserved',before:h,after:now});}
  else if(p==='src/core/remake191to200.ts'){const prior=parseParallel191(fs.readFileSync(snap,'utf8'));for(const id of prior.ids)assert.equal(digest(prior.objects[id]),digest(parallel191.objects[id]));drift.push({file:p,kind:'OnlyAdditionalAuthorized191to200LiteralObjects',oldIds:prior.ids,currentIds:parallel191.ids,before:h,after:now});}
  else if(p===parallel171File){const prior=parseParallel171(fs.readFileSync(snap,'utf8'));for(const id of prior.ids)assert.equal(digest(prior.objects[id]),digest(parallel171.objects[id]));drift.push({file:p,kind:'OnlyAdditionalAuthorized171to180LiteralObjects',oldIds:prior.ids,currentIds:parallel171.ids,before:h,after:now});}
  else if(p==='docs/rules/manifest.json'){const old=read(snap),current=read(p);assert.equal(old.activeVersion,'1.109.0');assert.equal(current.activeVersion,'1.110.0');assert.deepEqual(current.versions.slice(0,-1),old.versions);assert.equal(current.versions.at(-1).version,'1.110.0');drift.push({file:p,kind:'AppendOnlyRule110',before:h,after:now});}
  else assert.fail('Unexplained current source drift '+p);
 }
 for(const [p,h]of Object.entries(report.sourceBindings))assert.equal(hash(p),h,'Route source drift');
 continuity.push({report:item.file,reportSha256:hash(item.file),originalStatus:report.status,originalError:report.error??null,acceptedParallelDrift:drift,allSnapshotBindingsPreserved:true,allOtherCurrentBindingsPreserved:true});
 for(const id of item.ids){
  const row=report.rows.find(r=>r.id===id),w=witnesses.rows.find(r=>r.id===id),level=api.LEVELS[id-1];assert(row&&w);assert.equal(row.status,'PASS');assert(row.formalObjectIdentity&&!row.candidateOverlay&&row.pointerValidated&&row.naturalClockValidated);
  assert.equal(row.levelSha256,digest(level));assert.equal(row.routeSha256,digest(w.drags));assert.deepEqual(row.newStarTargets,api.levelStarTargets(level));assert.equal(row.timingLog.sha256,hash(row.timingLog.file));
  const log=read(row.timingLog.file),timing=replayTiming(level,log,api);assert.equal(log.final.moves,w.drags.length);assert(log.final.complete&&!log.final.failed&&log.final.remainingSeconds>0);
  const s=row.settlement;assert.equal(s.screen,'win');assert.equal(s.earnedStars,3);assert.equal(s.assistedClear,false);assert.deepEqual(s.conditions,scoring.evaluateLevelStars(level,s.completionMetrics));assert.equal(s.conditions.moveTarget,w.totalDrags);assert(s.conditions.timeAchieved&&s.conditions.moveAchieved);
  assert(s.texts.includes(s.conditions.moveTarget+'次拖动内完成'));assert(s.texts.includes(s.conditions.timeTargetSeconds+'秒内完成'));assert.deepEqual([...s.starImages].sort(),['starCenter','starLeft','starRight']);
  assert.equal(s.storage.backend,'MemoryHost');assert.equal(s.storage.save.bestStars[String(id)],3);assert.equal(s.storage.save.bestMoves[String(id)],w.drags.length);assert.equal(s.storage.save.activeRun,undefined);assert(s.storage.operations.some(x=>x.kind==='write'&&x.key==='color-escape-save-v1'));
  assert.equal(row.nativeStorageOperations,0);assert.equal(row.nativeDrawAudit.rotated,0);assert.equal(row.nativeDrawAudit.canvasRotationCalls,0);assert.equal(row.nativeDrawAudit.invalidImageDimensions,0);assert(row.nativeDrawAudit.calls>0);assert(row.naturalClockProbe.after<row.naturalClockProbe.before);
  const visual=config.visuals.find(v=>v.id===id&&v.width===report.viewport.width&&v.report===item.file);assert(visual?.inspected);assert.equal(hash(visual.file),visual.sha256);assert(visual.threeActiveStars&&visual.correctMoveAndTimeText);
  selections.push({id,viewport:report.viewport,report:item.file,reportSha256:hash(item.file),originalReportStatus:report.status,rowStatus:row.status,currentLevelSha256:digest(level),routeSha256:digest(w.drags),naturalTimingReplay:timing,timingLog:row.timingLog,elapsedSeconds:s.conditions.elapsedSeconds,score:s.conditions,storedBestStars:s.storage.save.bestStars[String(id)],storedBestMoves:s.storage.save.bestMoves[String(id)],persistentStorageOperations:0,formalObjectIdentity:true,visual});console.log('Independent natural replay PASS '+id+' '+report.viewport.width);
 }
 for(const id of item.rejectedIds??[]){const r=report.rows.find(r=>r.id===id);assert(r&&r.settlement.conditions);assert.equal(r.settlement.earnedStars,2);assert(r.settlement.conditions.moveAchieved&&!r.settlement.conditions.timeAchieved);assert(r.settlement.conditions.elapsedSeconds>r.settlement.conditions.timeTargetSeconds);rejected.push({id,report:item.file,reportSha256:hash(item.file),reason:'Actual natural clock missed unchanged time star; excluded from selected PASS evidence',conditions:r.settlement.conditions});}
}
assert.deepEqual(selections.map(r=>r.id+'-'+r.viewport.width).sort(),[161,167,168,170].flatMap(id=>[id+'-320',id+'-496']).sort());
assert.equal(rejected.length,1);
const report={status:'INDEPENDENT_FINAL_SCORING_POINTER_REVIEW_PASS',createdAt:new Date().toISOString(),ruleVersion:'1.109.0',activeRuleVersion:lock.activeVersion,selectedEight:selections,rejectedOldAttempt:rejected,continuity,currentCampaignSha256:digest(api.LEVELS),parallel191:{...parallel191,objects:undefined},parallel171:{...parallel171,objects:undefined},parallel182:{...parallel182,level:undefined},all200OnlyAuthorizedTaskAndParallelChanges:true,dataReview:config.dataReview,dataReviewSha256:hash(config.dataReview),allEightCurrentModelNaturalLogsReplayed:true,allEightThreeStarsAndMemoryHostSaved:true,allEightScreenshotsManuallyInspected:true,oldFailReportsPreserved:true,lowerBoundsRecomputed:false,realPlayerSaveTouched:false,published:false,findings:[],toolBindings:Object.fromEntries(['tools/star-targets161-170-review/pointer-review.mjs','tools/star-targets161-170-review/parallel191-review-v2.mjs','tools/remake161-170/observed-timing.mjs','src/core/PuzzleModel.ts','src/core/levelStarConditions.ts'].map(p=>[p,hash(p)]))};
fs.mkdirSync(OUT,{recursive:true});const file=OUT+'/pointer-review-'+Date.now()+'.json';fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file,status:report.status,selected:selections.length,rejected:rejected.length,events:selections.reduce((n,r)=>n+r.naturalTimingReplay.events,0)}));
