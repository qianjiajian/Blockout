import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {decodeLayoutBytes} from '../wechat-layout-codec.mjs';
import {restoreLevelJson} from '../../scripts/wechat-level-data.mjs';

// Run only after formal evidence and the local package exist. No build, source
// mutation, save access or test execution is performed by this aggregator.
// Explicit operator attestations: --tests=37 --qualification=14 --typecheck=pass
const args=Object.fromEntries(process.argv.slice(2).map(arg=>{
 const match=/^--(tests|qualification|typecheck)=(.+)$/.exec(arg);assert(match,`Unknown argument ${arg}`);return[match[1],match[2]];
}));
for(const key of ['tests','qualification'])if(args[key]!==undefined)assert(/^[1-9]\d*$/.test(args[key]));
if(args.typecheck!==undefined)assert.equal(args.typecheck,'pass');
const root='deliverables/lv16-remake-20260927',candidateFile=`${root}/design-final-1790494351260.json`,baselineFile=`${root}/baseline.json`;
const authoritativeFile=`${root}/authoritative-floor-1790494253974.json`;
const expectedLevelSha='5ac492d78f69d78926845cdd1a58d2f423afc37c42dc1f4141bee086fa627423';
const expectedCandidateSha='23767af5263754d0f60b5495ac49e28b7c5bfddb9bfd00cf6632e082ac994d6a';
const expectedRouteSha='bb03856ef4a1c67ab6aa9469875a8dad2e0d81eb4816fd95f49550a71eaa02ca';
const read=file=>JSON.parse(fs.readFileSync(file)),json=value=>JSON.parse(JSON.stringify(value));
const sha=value=>createHash('sha256').update(Buffer.isBuffer(value)||typeof value==='string'?value:JSON.stringify(value)).digest('hex');
const ownBindings={},bind=file=>ownBindings[file.replaceAll('\\','/')]=digest(fs.readFileSync(file));
function latest(pattern,directory=false){
 const matches=fs.readdirSync(root,{withFileTypes:true}).flatMap(entry=>{
  const match=pattern.exec(entry.name);return match&&entry.isDirectory()===directory?[{name:entry.name,time:Number(match[1])}]:[];
 }).sort((a,b)=>b.time-a.time);
 assert(matches.length,`Missing final evidence ${pattern}`);
 // A newer failure must not be silently bypassed by selecting an older PASS.
 return `${root}/${matches[0].name}${directory?'/report.json':''}`;
}
function verifyBindings(value){
 assert(value.bindings&&typeof value.bindings==='object');
 const entries=Array.isArray(value.bindings)?value.bindings.map(row=>[row.path,row.sha256]):Object.entries(value.bindings);assert(entries.length);
 for(const[file,expected]of entries){assert.equal(digest(fs.readFileSync(file)),expected,`Evidence input drift: ${file}`);bind(file);}return entries.length;
}
function record(file,value){bind(file);return{file,sha256:ownBindings[file],verifiedInputs:verifyBindings(value)};}
function boundToCandidate(value){
 assert.equal(value.ruleVersion,'1.84.0');assert.equal(value.levelSha256,expectedLevelSha);assert.equal(value.routeSha256,expectedRouteSha);
 if(value.candidateSha256!==undefined)assert.equal(value.candidateSha256,expectedCandidateSha);
 if(value.candidateRawSha256!==undefined)assert.equal(value.candidateRawSha256,expectedCandidateSha);
}
function completeReplay(replay){assert(replay.valid&&replay.complete);assert.equal(replay.effectiveDrags,37);assert.equal(replay.nonClearingDrags,15);assert.equal(replay.clearEvents,22);}
const report={generatedAt:new Date().toISOString(),status:'RUNNING',level:16,
 scope:'Final source/campaign/evidence/local-package verification; tests are explicitly operator-reported and not executed by this script',
 tests:{executedByThisScript:false,targetedTests:args.tests?{status:'OPERATOR_REPORTED_PASS',passed:Number(args.tests)}:{status:'NOT_REPORTED'},
  maskAndQuotientQualification:args.qualification?{status:'OPERATOR_REPORTED_PASS',passed:Number(args.qualification)}:{status:'NOT_REPORTED'},
  typecheck:args.typecheck?{status:'OPERATOR_REPORTED_PASS'}:{status:'NOT_REPORTED'},fullRepositorySuiteRun:false},
 playerSaveTouched:false,humanBlindTested:false,mobileDeviceTested:false,uploaded:false,published:false};
try{
 const lock=verifyRulesLock();assert(lock.ok,JSON.stringify(lock.errors));assert.equal(lock.activeVersion,'1.84.0');
 report.ruleVersion=lock.activeVersion;report.immutableRuleCount=lock.verified.length;assert.equal(lock.verified.length,87);
 for(const file of ['tools/lv16-remake-20260927/final-verification.mjs','tools/verify-rules-lock.mjs','tools/revised-preview-validation-v160.mjs',
  'tools/wechat-layout-codec.mjs','scripts/wechat-level-data.mjs','docs/rules/manifest.json','docs/rules/mechanism-rules-v1.84.0.md',candidateFile,baselineFile])bind(file);
 assert.equal(ownBindings[candidateFile],expectedCandidateSha);
 const bundle=await build({stdin:{resolveDir:process.cwd(),contents:`
  export {LEVELS,LEVELS_BEFORE_LEVEL16_ORIGINAL_REMAKE} from './src/core/levels.ts';
  export {levelStarTargets} from './src/core/levelStarConditions.ts';`},bundle:true,write:false,platform:'node',format:'esm',metafile:true,logLevel:'silent'});
 for(const file of Object.keys(bundle.metafile.inputs).filter(p=>p!=='<stdin>'))bind(file);
 const {LEVELS,LEVELS_BEFORE_LEVEL16_ORIGINAL_REMAKE:before,levelStarTargets}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
 const baseline=read(baselineFile),candidate=read(candidateFile),level=LEVELS[15];
 assert.equal(LEVELS.length,200);assert.equal(before?.length,200);assert.equal(candidate.drags.length,37);assert.equal(digest(candidate.drags),expectedRouteSha);
 assert.deepEqual(json(level),candidate.level);assert.deepEqual(json(before[15]),baseline.level);assert.equal(digest(level),expectedLevelSha);
 assert.equal(level.id,16);assert.equal(level.name,'色彩接力');assert.equal(level.difficulty,'normal');
 assert.equal(level.timeSeconds,180);assert.equal(level.reward,65);assert.equal(level.parMoves,50);assert.equal(level.preservedMoveTarget,50);
 assert.equal(level.designTargets,undefined);assert.equal(level.featureIntro,undefined);
 assert.deepEqual(levelStarTargets(level),{moveTarget:50,timeTargetSeconds:129});assert.deepEqual(levelStarTargets(level),baseline.stars);
 for(let i=0;i<200;i++){
  assert.equal(LEVELS[i].id,i+1);assert.equal(before[i].id,i+1);assert.equal(sha(before[i]),baseline.levelHashes[i].sha256,`Pre16 baseline drift: ${i+1}`);
  if(i!==15){assert.equal(LEVELS[i],before[i],`Unexpected changed object: ${i+1}`);assert.equal(sha(LEVELS[i]),baseline.levelHashes[i].sha256);}
 }
 const changedSinceCapture=LEVELS.filter(l=>sha(l)!==baseline.levelHashes[l.id-1].sha256).map(l=>l.id);assert.deepEqual(changedSinceCapture,[16]);
 const sharedFileChecks=Object.entries(baseline.files).filter(([file])=>file!=='src/core/levels.ts').map(([file,expected])=>{
  const actual=digest(fs.readFileSync(file));assert.equal(actual,expected,`Shared source changed: ${file}`);return{file,sha256:actual};
 });
 report.levelSha256=sha(level);report.levelSemanticSha256=digest(level);report.routeSha256=expectedRouteSha;
 report.candidate={file:candidateFile,sha256:expectedCandidateSha};report.changedSinceCapture=changedSinceCapture;report.other199Preserved=true;
 report.sharedRuntimeRenderingScoringUnchanged=true;report.sharedFileChecks=sharedFileChecks;

 const formalStaticFile=latest(/^validation-formal-static-(\d+)\.json$/),formalStatic=read(formalStaticFile);
 assert.equal(formalStatic.status,'PASS');boundToCandidate(formalStatic);assert(formalStatic.formalSourceObjectUsed&&formalStatic.difficultyCertified&&!formalStatic.diagnosticOnly);
 assert(formalStatic.quotientedFloor.thresholdProven);assert.equal(formalStatic.quotientedFloor.floor,11);
 assert.equal(formalStatic.lowerBound,11);assert.equal(formalStatic.upperBound,15);assert.equal(formalStatic.exactNecessaryRepositions,null);completeReplay(formalStatic.replay);
 assert.deepEqual(formalStatic.eventCounts,{peels:1,bodyRemovals:21,total:22});assert.equal(formalStatic.repositionKinds.multiCell,2);assert.equal(formalStatic.repositionKinds.singleCell,13);
 assert.equal(formalStatic.qualification.exitCode,0);assert.deepEqual(formalStatic.starTargets,{moveTarget:50,timeTargetSeconds:129});
 report.formalStatic={...record(formalStaticFile,formalStatic),contractFloor:11,upperBound:15,rawGraphStatus:formalStatic.unquotientedFloor.status};

 const designFile=latest(/^design-rebind-(\d+)\.json$/),design=read(designFile);
 assert.equal(design.status,'PASS');boundToCandidate(design);completeReplay(design.replay);assert(design.formalCandidateExact);
 assert(design.quotientFloor.thresholdProven);assert.equal(design.quotientFloor.floor,11);
 assert.equal(design.lowerBound,11);assert.equal(design.upperBound,15);assert.equal(design.exactNecessaryRepositions,null);assert.equal(design.qualification.exitCode,0);
 assert.deepEqual(design.events,{peels:1,removals:21,repositions:15,multiCellRepositions:2,singleCellRepositions:13});
 report.lowerBounds={design:{...record(designFile,design),rawStatus:design.rawMaskFloor.status,rawStates:design.rawMaskFloor.exploredStates,quotientStates:design.quotientFloor.exploredStates}};
 // This failed bounded direct-model attempt supplies no lower bound. It stays
 // bound and explicitly UNVERIFIED, never relabelled from other proof results.
 const authoritative=read(authoritativeFile);boundToCandidate(authoritative);completeReplay(authoritative.replay);
 assert.equal(authoritative.status,'UNVERIFIED');assert.equal(authoritative.proof.status,'unknown');assert.equal(authoritative.proof.thresholdProven,false);
 assert.equal(authoritative.proof.floor,11);assert.equal(authoritative.proof.abstraction,'optional-exit-unit-step-gesture-superset-v1');
 report.authoritativeDiagnostic={...record(authoritativeFile,authoritative),status:authoritative.status,suppliesLowerBound:false,
  states:authoritative.proof.exploredStates,transitions:authoritative.proof.attemptedTransitions,termination:authoritative.proof.termination};
 report.lowerBound=11;report.upperBound=15;report.exactNecessaryRepositions=null;report.totalDrags=37;
 report.events={bodyRemovals:21,peels:1,multiCellRepositions:2,singleCellRepositions:13};

 const qualificationFile=latest(/^validation-qualification-(\d+)\.json$/),qualification=read(qualificationFile);
 assert.equal(qualification.status,'PASS');assert.equal(qualification.ruleVersion,'1.84.0');assert.equal(qualification.nativePlainSolverUsed,false);assert(qualification.shellPairIdentityIsolation);
 assert.equal(qualification.fixtures.length,1);assert(qualification.fixtures.every(f=>f.completeOutgoingGraphEquality));
 assert.deepEqual(qualification.fixtures.map(f=>f.layers),[['yellow','red']]);assert.equal(qualification.narrowGates.length,6);
 for(const check of qualification.narrowGates){assert.equal(check.actual,['top','bottom'].includes(check.side)||check.size===3);assert.equal(check.mask,check.actual);}
 assert.equal(qualification.countdown.steps.length,17);assert.equal(qualification.countdown.steps[8].cleared,9);assert(qualification.countdown.steps[8].retained);
 assert.equal(qualification.genericQualifications.exitCode,0);assert.deepEqual(qualification.drift,[]);
 report.shellQualification={...record(qualificationFile,qualification),pairedSourceFixtures:1,wholeV3GateCases:6};

 const sourceReviewFile=latest(/^source-final-review-v184-(\d+)\.json$/),sourceReview=read(sourceReviewFile);
 assert.equal(sourceReview.status,'SOURCE_ORIGINALITY_AND_MECHANISM_REVIEW_PASS');boundToCandidate(sourceReview);
 assert(sourceReview.mechanismReview.passed);assert.equal(sourceReview.mechanismReview.shellPeels,1);assert.equal(sourceReview.mechanismReview.bodyRemovals,21);
 report.sourceReview=record(sourceReviewFile,sourceReview);
 const preservationFile=latest(/^source-formal-preservation-v184-(\d+)\.json$/),preservation=read(preservationFile);
 assert.equal(preservation.status,'FORMAL_LV16_CANDIDATE_AND_OTHER_199_PRESERVATION_PASS');assert.equal(preservation.ruleVersion,'1.84.0');
 assert.equal(preservation.canonicalLevelSha256,expectedLevelSha);assert.equal(preservation.currentSourceReview.replaceAll('\\','/'),sourceReviewFile);
 assert(preservation.formalCandidateCanonicalExact&&preservation.pre16PipelineRawMatchesAll200Baseline);
 assert(preservation.other199RawHashesUnchanged&&preservation.other199ObjectIdentityUnchanged&&preservation.featureIntroPreserved);
 assert.deepEqual(preservation.changedLevelIds,[16]);assert.deepEqual(preservation.stars,{moveTarget:50,timeTargetSeconds:129});assert(preservation.actualStarsUnchanged);
 assert(preservation.originalSourceFileChecks.every(row=>row.before===row.current));assert.deepEqual(preservation.sourceReviewBindingDrift,[]);report.sourcePreservation=record(preservationFile,preservation);

 report.pointers=[[320,568],[496,1078]].map(([width,height])=>{
  const file=latest(new RegExp(`^validation-pointer-formal-${width}-(\\d+)$`),true),pointer=read(file);
  assert.equal(pointer.status,'PASS');boundToCandidate(pointer);assert.equal(pointer.mode,'formal');assert.deepEqual(pointer.viewport,{width,height});
  assert(pointer.formalObjectIdentity&&!pointer.candidateInjected);assert(pointer.finalIdentity.formalObjectIdentity&&pointer.finalIdentity.formalDefinitionsUnchanged&&pointer.finalIdentity.other199Unchanged);
  assert.deepEqual(json(pointer.finalIdentity.level),candidate.level);assert(pointer.naturalTimingReplay.passed&&pointer.naturalClock);assert(pointer.naturalClockProbe.afterClock<pointer.naturalClockProbe.beforeClock);
  assert(pointer.final.complete&&!pointer.final.failed&&pointer.final.remainingSeconds>0);assert.equal(pointer.final.moves,37);assert.equal(pointer.final.cleared,22);
  assert.equal(pointer.nonClearingDrags,15);assert.equal(pointer.multiCellRepositions,2);assert.equal(pointer.singleCellRepositions,13);
  assert.equal(pointer.peelEvents,1);assert.equal(pointer.bodyRemovals,21);assert.equal(pointer.steps.length,37);
  assert.equal(pointer.steps.filter(s=>s.event==='peel').length,1);assert.equal(pointer.steps.filter(s=>s.event==='body-removal').length,21);assert.equal(pointer.steps.filter(s=>s.event==='reposition').length,15);
  assert.equal(pointer.introduction.scheduled,null);assert.equal(pointer.introduction.screen,'playing');
  const win=pointer.settlement;assert.equal(win.earnedStars,3);assert.equal(win.assistedClear,false);assert.equal(win.conditions.moveTarget,50);assert.equal(win.conditions.timeTargetSeconds,129);assert(win.conditions.moveAchieved&&win.conditions.timeAchieved);
  assert(win.texts.includes('50次拖动内完成'));assert(win.texts.includes('129秒内完成'));assert.equal(win.starImages.filter(s=>!s.startsWith('empty')).length,3);
  assert.equal(win.storage.backend,'MemoryHost');assert.equal(win.storage.save.bestStars['16'],3);assert.equal(win.storage.save.bestMoves['16'],37);
  assert.deepEqual(pointer.errors,[]);assert.deepEqual(pointer.storageViolations,[]);assert.deepEqual(pointer.drift,[]);assert.equal(pointer.nativeDrawAudit.rotated,0);assert.equal(pointer.nativeDrawAudit.canvasRotationCalls,0);
  return{...record(file,pointer),viewport:{width,height},totalDrags:37,witnessRepositions:15,peels:1,bodyRemovals:21,noUnscheduledIntroduction:true,remainingSeconds:pointer.final.remainingSeconds,earnedStars:3};
 });

 const gameFile='dist-wechat/game.js',manifestFile='dist-wechat.build-manifest.json';bind(gameFile);bind(manifestFile);
 const game=fs.readFileSync(gameFile,'utf8'),manifest=read(manifestFile);
 const packed=[...game.matchAll(/"([A-Za-z0-9+/]{10000,})"/g)].find(match=>match[1].length===manifest.levelCompilation.packedBytes);assert(packed,'Packed payload missing');
 const packaged=restoreLevelJson(JSON.parse(decodeLayoutBytes(packed[1],manifest.levelCompilation.asciiBytes,manifest.levelCompilation.adler32)));
 assert.equal(packaged.length,200);assert.deepEqual(json(packaged),json(LEVELS));assert.equal(sha(game),manifest.outputs.find(row=>row.path==='game.js').sha256);assert.equal(sha(packaged),manifest.levelCompilation.levelJsonSha256);
 report.difficultyLabel='normal';report.starTargets={moveTarget:50,timeTargetSeconds:129};report.historicalParMoves=50;report.timeSeconds=180;report.historicalReward=65;report.noFeatureIntro=true;
 report.localWechat={directory:'dist-wechat',all200PackagedLevelsEqualCurrentSource:true,level16SemanticSha256:digest(packaged[15]),gameSha256:sha(game),uploaded:false,published:false};
 report.bindings=ownBindings;report.drift=Object.entries(ownBindings).filter(([file,expected])=>digest(fs.readFileSync(file))!==expected);assert.deepEqual(report.drift,[]);report.status='PASS';
}catch(error){report.status='FAIL';report.error=String(error.stack??error).replace(/data:text\/javascript;base64,[\w+/=]+/g,'in-memory-current-core');report.bindings=ownBindings;process.exitCode=1;}
const output=`${root}/final-verification-${Date.now()}.json`;fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,status:report.status,changedSinceCapture:report.changedSinceCapture,lower:report.lowerBound,upper:report.upperBound,totalDrags:report.totalDrags,stars:report.starTargets,wechatMatches:report.localWechat?.all200PackagedLevelsEqualCurrentSource,tests:report.tests,error:report.error}));
