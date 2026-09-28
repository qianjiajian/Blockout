import fs from 'node:fs';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {decodeLayoutBytes} from '../wechat-layout-codec.mjs';
import {restoreLevelJson} from '../../scripts/wechat-level-data.mjs';

// Read-only final aggregation. It never builds, patches production, starts a
// browser, accesses player persistence, uploads, or claims to execute tests.
// --wechat additionally verifies the already-built local package.
// A newer active rule requires an explicit --active-rule=X after the operator
// has read it; the immutable Lv20 contract itself must remain v1.87.
const args={};
for(const arg of process.argv.slice(2)){
 if(arg==='--wechat'){args.wechat=true;continue;}
 const m=/^--(active-rule|tests|qualification|typecheck)=(.+)$/.exec(arg);
 assert(m,`Unknown argument ${arg}`);assert(args[m[1]]===undefined,`Duplicate ${m[1]}`);args[m[1]]=m[2];
}
for(const key of ['tests','qualification'])if(args[key]!==undefined)assert(/^[1-9]\d*$/.test(args[key]));
if(args.typecheck!==undefined)assert.equal(args.typecheck,'pass');
const root='deliverables/lv20-remake-20260927';
const candidateFile=root+'/design-v187-1790503452295/candidate-120.json';
const oldBaselineFile=root+'/baseline.json',currentBaselineFile=root+'/acceptance-current-baseline.json';
const sourceReviewFile=root+'/recheck-candidate-120-1790503675846.json';
const directProofFile=root+'/root-authoritative-floor-1790503721809.json';
const expectedLevel='072754b896984b88b8a44cd45a090c65f5cb1397eff8bcfa952ee59e3364a63f';
const expectedCandidate='43d8a13ceafe1ab6c147aa6b378d79507050a37004b3d0160c342600a05b7578';
const expectedRoute='099e402c99c18fbbb32e8ca085b7c468dd30a73e38d37e7fdbd58e04da05af01';
const contractSha='8d2d541746649fa48f93532ca70293f75ae7bc8941829456a18353f5fa506126';
const concurrentTargets={122:49,126:61,127:41,131:28,132:49,133:57,134:51,135:36,136:49,137:34,138:47,139:70,140:42};
const priorTargets={122:42,126:49,127:36,131:50,132:66,133:62,134:50,135:45,136:60,137:54,138:74,139:99,140:37};
const read=p=>JSON.parse(fs.readFileSync(p)),json=x=>JSON.parse(JSON.stringify(x));
const rawHash=x=>digest(Buffer.isBuffer(x)||typeof x==='string'?x:JSON.stringify(x));
const bindings={},bind=p=>{const path=p.replaceAll('\\','/');return bindings[path]=digest(fs.readFileSync(path));};
function latest(pattern,directory=false){
 const choices=fs.readdirSync(root,{withFileTypes:true}).flatMap(e=>{const m=pattern.exec(e.name);return m&&e.isDirectory()===directory?[{name:e.name,time:Number(m[1])}]:[];}).sort((a,b)=>b.time-a.time);
 assert(choices.length,`Missing evidence ${pattern}`);
 // Deliberately select the newest run, even if it failed. Never skip failures.
 return root+'/'+choices[0].name+(directory?'/report.json':'');
}
function replayOkay(r){assert(r.valid&&r.complete);assert.equal(r.effectiveDrags,19);assert.equal(r.nonClearingDrags,5);assert.equal(r.clearEvents,14);}
function candidateBound(r){assert.equal(r.levelSha256,expectedLevel);assert.equal(r.routeSha256,expectedRoute);if(r.candidateSha256!==undefined)assert.equal(r.candidateSha256,expectedCandidate);}
function inputBindings(r,{historicalSource=false}={}){
 assert(r.bindings);const rows=Array.isArray(r.bindings)?r.bindings.map(x=>[x.path,x.sha256]):Object.entries(r.bindings);assert(rows.length);
 const permittedDrift=[];
 for(const[p,h]of rows){const now=digest(fs.readFileSync(p));if(now!==h){
  // Appended frozen rule entries are provenance drift, not a gameplay change;
  // the actual new active rule was explicitly selected and lock-verified.
  if(p==='docs/rules/manifest.json'&&args['active-rule'])permittedDrift.push({path:p,before:h,current:now,reason:'Explicitly reviewed newer active rule registry; frozen contract hashes independently checked'});
  else if(historicalSource&&p==='src/core/levels.ts')permittedDrift.push({path:p,before:h,current:now,reason:'Candidate-stage source audit predates the independently verified id20-only final overlay'});
  else assert.fail(`Evidence input drift: ${p}`);
 }bind(p);}
 return{checkedInputs:rows.length,permittedHistoricalDrift:permittedDrift};
}
function evidence(p,r,options){bind(p);return{file:p,sha256:bindings[p],...inputBindings(r,options)};}
const report={generatedAt:new Date().toISOString(),status:'RUNNING',level:20,levelContract:'1.87.0',
 scope:'Independent current-formal/source/route/difficulty/evidence aggregation; optional existing local package comparison',
 operatorTestAttestations:{executedByThisScript:false,tests:args.tests?Number(args.tests):null,qualificationTests:args.qualification?Number(args.qualification):null,typecheck:args.typecheck??'NOT_REPORTED',fullRepositorySuiteRun:false},
 playerSaveTouched:false,mobileDeviceTested:false,humanBlindTested:false,uploaded:false,published:false};
try{
 const lock=verifyRulesLock();assert(lock.ok,JSON.stringify(lock.errors));assert.equal(lock.activeVersion,args['active-rule']??'1.89.0','Read new active document before explicitly selecting a later version');
 const contract=lock.verified.find(x=>x.version==='1.87.0');assert(contract,'Lv20 contract missing from immutable lock');
 assert.equal(digest(fs.readFileSync('docs/rules/mechanism-rules-v1.87.0.md')),contractSha);
 report.ruleVersion=lock.activeVersion;report.immutableVersionCount=lock.verified.length;
 for(const p of ['tools/lv20-remake-20260927/recheck-final.mjs','tools/verify-rules-lock.mjs','tools/revised-preview-validation-v160.mjs',
  'docs/rules/manifest.json','docs/rules/mechanism-rules-v1.87.0.md',`docs/rules/mechanism-rules-v${lock.activeVersion}.md`,candidateFile,oldBaselineFile,currentBaselineFile])bind(p);
 assert.equal(bindings[candidateFile],expectedCandidate);
 const candidate=read(candidateFile),early=read(oldBaselineFile),recent=read(currentBaselineFile);
 assert.equal(recent.status,'PASS');assert.equal(candidate.drags.length,19);assert.equal(digest(candidate.drags),expectedRoute);assert.equal(digest(candidate.level),expectedLevel);
 const compiled=await build({stdin:{resolveDir:process.cwd(),contents:`
 export {LEVELS,LEVELS_BEFORE_LEVEL20_ORIGINAL_REMAKE} from './src/core/levels.ts';
 export {levelStarTargets} from './src/core/levelStarConditions.ts';
 export {replayRevisedRoute} from './src/core/revisedLevelSearch.ts';
 export {checkRevisedRepositionFloor} from './src/core/revisedRepositionFloor.ts';`},bundle:true,write:false,platform:'node',format:'esm',metafile:true,logLevel:'silent'});
 for(const p of Object.keys(compiled.metafile.inputs).filter(p=>p!=='<stdin>'))bind(p);
 const api=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
 const levels=api.LEVELS,before=api.LEVELS_BEFORE_LEVEL20_ORIGINAL_REMAKE,level=levels[19];
 assert.equal(levels.length,200);assert.equal(before?.length,200);assert.deepEqual(json(level),candidate.level);assert.equal(digest(level),expectedLevel);
 assert.notEqual(level,before[19],'A validated id20-only overlay must be installed');
 assert.deepEqual(json(before[19]),early.level);assert.equal(level.difficulty,'easy');assert.equal(level.timeSeconds,75);assert.equal(level.reward,85);assert.equal(level.parMoves,24);
 assert.equal(level.preservedMoveTarget,24);assert.deepEqual(api.levelStarTargets(level),{moveTarget:24,timeTargetSeconds:54});
 assert.deepEqual(level.featureIntro,early.level.featureIntro);assert.equal(level.name,early.level.name);assert.equal(level.mechanismRules,'revised-2026-09-23-v1.4');
 const parallel=[];
 for(let i=0;i<200;i++){
  const id=i+1;assert.equal(levels[i].id,id);assert.equal(before[i].id,id);assert.deepEqual(json(before[i]),recent.levels[i]);assert.equal(rawHash(before[i]),recent.levelHashes[i].sha256);
  if(id!==20){assert.equal(levels[i],before[i],`Lv20 overlay changed object identity ${id}`);assert.deepEqual(json(levels[i]),json(before[i]));}
  const oldHash=early.levelHashes[i].sha256;
  if(rawHash(before[i])!==oldHash){
   assert(concurrentTargets[id]!==undefined,`Unexpected pre20 change from early baseline at ${id}`);assert.equal(before[i].preservedMoveTarget,concurrentTargets[id]);
   let restored=null;for(const value of [priorTargets[id],undefined]){const proposed=structuredClone(before[i]);if(value===undefined)delete proposed.preservedMoveTarget;else proposed.preservedMoveTarget=value;if(rawHash(proposed)===oldHash)restored={id,field:'preservedMoveTarget',old:value??null,oldFieldAbsent:value===undefined,new:concurrentTargets[id],oldSha256:oldHash,currentSha256:rawHash(before[i])};}
   assert(restored,`Parallel Lv${id} differs beyond its authorized score-only field`);parallel.push(restored);
  }
 }
 assert.deepEqual(parallel.map(x=>x.id),Object.keys(concurrentTargets).map(Number));
 assert.deepEqual(recent.concurrentScoreOnlyChanges,parallel.map(x=>({...x,newSha256:x.currentSha256,currentSha256:undefined})).map(({currentSha256,...x})=>x));
 report.other199RelativeToImmediatePre20={sameObjectReferences:true,sameValues:true,count:199};
 report.earlyBaselineComparison={onlyThisTaskLevel:20,concurrentScoreOnlyChanges:parallel,other186CompletelyUnchanged:true,
  caveat:'Not all199 early hashes are unchanged:13 independently authorized concurrent score-only updates are explicitly retained.'};
 const sourceChecks=Object.entries(recent.files).map(([p,oldHash])=>{const now=digest(fs.readFileSync(p));if(p!=='src/core/levels.ts')assert.equal(now,oldHash,`Pre-integration source drift ${p}`);bind(p);return{path:p,before:oldHash,current:now,changed:now!==oldHash};});
 const currentSourceFiles=[];function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=dir+'/'+e.name;if(e.isDirectory())walk(p);else currentSourceFiles.push(p);}}walk('src');
 const added=currentSourceFiles.filter(p=>recent.files[p]===undefined);assert.deepEqual(added,['src/core/level20OriginalRemake.ts']);bind(added[0]);
 report.currentSourcePreservation={checks:sourceChecks,allowedChangedFile:'src/core/levels.ts',added};
 report.levelSha256=expectedLevel;report.routeSha256=expectedRoute;report.candidate={file:candidateFile,sha256:expectedCandidate};

 const originalReview=read(sourceReviewFile);assert.equal(originalReview.status,'PASS_SOURCE_STATIC_AND_MODEL_REVIEW');
 assert.equal(originalReview.candidate.levelSha256,expectedLevel);assert.equal(originalReview.candidate.routeSha256,expectedRoute);replayOkay(originalReview.modelReplay);
 assert(originalReview.static.allThirtyCellsCoveredExactlyOnce&&originalReview.static.noSameColorAdjacentBodies&&originalReview.static.noBlockRotation);
 assert(originalReview.static.native.every(r=>r.match?.quarterTurns===0));assert(originalReview.static.art.passed&&originalReview.static.opening.passed&&originalReview.static.hidden.passed&&originalReview.static.spans.passed);
 report.sourceReview=evidence(sourceReviewFile,originalReview,{historicalSource:true});
 const direct=read(directProofFile);assert.equal(direct.status,'PASS');candidateBound(direct);replayOkay(direct.replay);
 assert(direct.proof.thresholdProven);assert.equal(direct.proof.floor,5);assert.equal(direct.proof.termination,'below-threshold-exhausted');assert.equal(direct.proof.abstraction,'optional-exit-unit-step-gesture-superset-v1');
 report.originalAuthoritativeProof={...evidence(directProofFile,direct),states:direct.proof.exploredStates,transitions:direct.proof.attemptedTransitions};
 report.currentFormalReplay=api.replayRevisedRoute(level,candidate.drags);replayOkay(report.currentFormalReplay);
 report.currentFormalDirectFloor=api.checkRevisedRepositionFloor(level,{floor:5,maxStates:100000,maxMilliseconds:45000,maxTransitions:3000000,maxDragStates:10000});
 assert(report.currentFormalDirectFloor.thresholdProven,JSON.stringify(report.currentFormalDirectFloor));assert.equal(report.currentFormalDirectFloor.floor,5);

 const staticFile=latest(/^acceptance-formal-static-(\d+)\.json$/),staticReport=read(staticFile);
 assert.equal(staticReport.status,'PASS');candidateBound(staticReport);assert(staticReport.formalSourceObjectUsed&&staticReport.difficultyCertified);
 assert.equal(staticReport.lowerBound,5);assert.equal(staticReport.upperBound,5);assert.equal(staticReport.exactNecessaryRepositions,5);replayOkay(staticReport.replay);
 assert(staticReport.unquotientedFloor.thresholdProven&&staticReport.quotientedFloor.thresholdProven);assert.equal(staticReport.qualification.exitCode,0);
 assert.deepEqual(staticReport.repositionKinds,{multiCell:5,singleCell:0});assert.deepEqual(staticReport.starTargets,{moveTarget:24,timeTargetSeconds:54});
 assert.equal(staticReport.reveal.step,9);assert.equal(staticReport.reveal.hiddenIds.length,7);assert.deepEqual(staticReport.drift,[]);
 report.formalStatic=evidence(staticFile,staticReport);
 report.pointers=[[320,568],[496,1078]].map(([width,height])=>{
  const p=latest(new RegExp(`^acceptance-pointer-formal-${width}-(\\d+)$`),true),r=read(p);assert.equal(r.status,'PASS');candidateBound(r);
  assert.equal(r.mode,'formal');assert.deepEqual(r.viewport,{width,height});assert(r.formalObjectIdentity&&!r.candidateInjected);
  assert(r.finalIdentity.formalObjectIdentity&&r.finalIdentity.formalDefinitionsUnchanged&&r.finalIdentity.other199Unchanged);assert.deepEqual(json(r.finalIdentity.level),candidate.level);
  assert(r.naturalClock&&r.naturalTimingReplay.passed);assert(r.naturalClockProbe.afterClock<r.naturalClockProbe.beforeClock);
  assert(r.final.complete&&!r.final.failed&&r.final.remainingSeconds>0);assert.equal(r.final.moves,19);assert.equal(r.final.cleared,14);
  assert.equal(r.nonClearingDrags,5);assert.equal(r.multiCellRepositions,5);assert.equal(r.singleCellRepositions,0);assert.equal(r.bodyRemovals,14);assert.equal(r.peelEvents,0);
  assert.equal(r.steps.length,19);assert.equal(r.steps.filter(s=>s.event==='reposition').length,5);assert.equal(r.steps.filter(s=>s.event==='body-removal').length,14);
  assert.equal(r.shutterReveal.step,9);assert(r.shutterReveal.sevenHiddenRetained);
  assert.equal(r.introduction.scheduled.kind,'shutter');assert.equal(r.introduction.screen,'feature');assert(r.introduction.pointerAcknowledged&&r.introduction.clockHeldDuringPopup);
  const win=r.settlement;assert.equal(win.earnedStars,3);assert.equal(win.assistedClear,false);assert.equal(win.conditions.moveTarget,24);assert.equal(win.conditions.timeTargetSeconds,54);assert(win.conditions.moveAchieved&&win.conditions.timeAchieved);
  assert(win.texts.includes('24次拖动内完成')&&win.texts.includes('54秒内完成'));assert.equal(win.starImages.filter(s=>!s.startsWith('empty')).length,3);
  assert.equal(win.storage.backend,'MemoryHost');assert.equal(win.storage.save.bestStars['20'],3);assert.equal(win.storage.save.bestMoves['20'],19);
  assert.equal(r.nativeDrawAudit.rotated,0);assert.equal(r.nativeDrawAudit.canvasRotationCalls,0);assert.deepEqual(r.errors,[]);assert.deepEqual(r.storageViolations,[]);assert.deepEqual(r.drift,[]);
  for(const suffix of ['introduction.png','opening.png','revealed.png','settlement.png','observed-timing.json'])bind(p.replace('/report.json','/'+suffix));
  return{...evidence(p,r),viewport:{width,height},drags:19,repositions:5,remainingSeconds:r.final.remainingSeconds,earnedStars:3,realIntroAcknowledgment:true};
 });
 report.lowerBound=5;report.upperBound=5;report.exactNecessaryRepositions=5;report.totalDrags=19;report.difficulty='easy';report.starTargets={moveTarget:24,timeTargetSeconds:54};
 report.mechanismCaveat='Orange6 ice finishes exactly when shutter6 opens; no claim that this ice alone adds pressure. Intro, conceal/reveal, early frozen-gate order and later parking are verified; no human blind test.';
 report.localWechat={requested:false,verified:false,builtByThisScript:false,uploaded:false,published:false};
 if(args.wechat){
  const gameFile='dist-wechat/game.js',manifestFile='dist-wechat.build-manifest.json';bind(gameFile);bind(manifestFile);bind('tools/wechat-layout-codec.mjs');bind('scripts/wechat-level-data.mjs');
  const game=fs.readFileSync(gameFile,'utf8'),manifest=read(manifestFile);
  const packed=[...game.matchAll(/"([A-Za-z0-9+/]{10000,})"/g)].find(m=>m[1].length===manifest.levelCompilation.packedBytes);assert(packed,'Packed payload not found');
  const packaged=restoreLevelJson(JSON.parse(decodeLayoutBytes(packed[1],manifest.levelCompilation.asciiBytes,manifest.levelCompilation.adler32)));
  assert.equal(packaged.length,200);assert.deepEqual(json(packaged),json(levels));assert.equal(rawHash(game),manifest.outputs.find(x=>x.path==='game.js').sha256);assert.equal(rawHash(packaged),manifest.levelCompilation.levelJsonSha256);
  report.localWechat={requested:true,verified:true,all200PackagedLevelsEqualCurrentSource:true,level20SemanticSha256:digest(packaged[19]),gameSha256:rawHash(game),builtByThisScript:false,uploaded:false,published:false};
 }
 report.drift=Object.entries(bindings).filter(([p,h])=>digest(fs.readFileSync(p))!==h);assert.deepEqual(report.drift,[]);report.status='PASS';
}catch(error){report.status='FAIL';report.error=String(error.stack??error).replace(/data:text\/javascript;base64,[\w+/=]+/g,'in-memory-current-core');process.exitCode=1;}
report.bindings=bindings;
const output=root+'/recheck-final-'+Date.now()+'.json';fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,status:report.status,level:20,lower:report.lowerBound,upper:report.upperBound,drags:report.totalDrags,wechat:report.localWechat?.verified,error:report.error}));
