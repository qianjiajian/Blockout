import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {decodeLayoutBytes} from '../wechat-layout-codec.mjs';
import {restoreLevelJson} from '../../scripts/wechat-level-data.mjs';

// Run only AFTER final production Pointer evidence and the local build exist.
// This script never runs a build, changes levels or asserts unreported test runs.
// Optional root attestations: --tests=31 --qualification=14 --typecheck=pass
const args=Object.fromEntries(process.argv.slice(2).map(arg=>{
 const match=/^--(tests|qualification|typecheck)=(.+)$/.exec(arg);
 assert(match,`Unknown argument ${arg}`);return[match[1],match[2]];
}));
for(const key of ['tests','qualification'])if(args[key]!==undefined)
 assert(/^[1-9]\d*$/.test(args[key]),`--${key} requires a positive passed-test count`);
if(args.typecheck!==undefined)assert.equal(args.typecheck,'pass');
const root='deliverables/lv15-remake-20260927';
const candidateFile=`${root}/design-final-1790492746325.json`;
const designFile=`${root}/design-proof-1790492746325.json`;
const authoritativeFile=`${root}/authoritative-floor-1790492775453.json`;
const baselineFile=`${root}/baseline.json`;
const expectedLevelSha='af9799ec1bcd1c84b6a6df1faf6342781d995a66457b75d56d011f49265b59d3';
const expectedCandidateSha='782ec3160a44a2a06d4f94822266c2127695f56d3bb4ce5557b91b1b57880515';
const read=file=>JSON.parse(fs.readFileSync(file));
const json=value=>JSON.parse(JSON.stringify(value));
const sha=value=>createHash('sha256').update(Buffer.isBuffer(value)||typeof value==='string'?value:JSON.stringify(value)).digest('hex');
const ownBindings={},bind=file=>ownBindings[file.replaceAll('\\','/')]=digest(fs.readFileSync(file));
function latest(pattern,directory=false){
 const matches=fs.readdirSync(root,{withFileTypes:true}).flatMap(entry=>{
  const match=pattern.exec(entry.name);return match&&entry.isDirectory()===directory?[{name:entry.name,time:Number(match[1])}]:[];
 }).sort((a,b)=>b.time-a.time);
 assert(matches.length,`Missing required final evidence ${pattern}`);
 // Do not filter by PASS: a newer failed run must not be silently skipped.
 return `${root}/${matches[0].name}${directory?'/report.json':''}`;
}
function verifyBindings(value){
 assert(value.bindings&&typeof value.bindings==='object','Evidence must bind its inputs');
 const entries=Array.isArray(value.bindings)?value.bindings.map(row=>[row.path,row.sha256]):Object.entries(value.bindings);
 assert(entries.length>0);
 for(const[file,expected]of entries){assert.equal(digest(fs.readFileSync(file)),expected,`Evidence input drift: ${file}`);bind(file);}
 return entries.length;
}
function record(file,value){bind(file);return{file,sha256:ownBindings[file],verifiedInputs:verifyBindings(value)};}
function boundToCandidate(value,level,candidate){
 assert.equal(value.ruleVersion,'1.83.0');
 assert.equal(value.levelSha256,digest(level));assert.equal(value.routeSha256,digest(candidate.drags));
 if(value.candidateSha256!==undefined)assert.equal(value.candidateSha256,expectedCandidateSha);
 if(value.candidateRawSha256!==undefined)assert.equal(value.candidateRawSha256,expectedCandidateSha);
}
function completeReplay(replay){
 assert(replay.valid&&replay.complete);assert.equal(replay.effectiveDrags,21);
 assert.equal(replay.nonClearingDrags,6);assert.equal(replay.clearEvents,15);
}
const report={generatedAt:new Date().toISOString(),status:'RUNNING',level:15,
 scope:'Final source/campaign/evidence/local-package verification; external test results are explicitly operator-reported, not executed by this script',
 tests:{executedByThisScript:false,
  targetedTests:args.tests?{status:'OPERATOR_REPORTED_PASS',passed:Number(args.tests)}:{status:'NOT_REPORTED'},
  maskAndQuotientQualification:args.qualification?{status:'OPERATOR_REPORTED_PASS',passed:Number(args.qualification)}:{status:'NOT_REPORTED'},
  typecheck:args.typecheck?{status:'OPERATOR_REPORTED_PASS'}:{status:'NOT_REPORTED'},fullRepositorySuiteRun:false},
 playerSaveTouched:false,humanBlindTested:false,mobileDeviceTested:false,uploaded:false,published:false};
try{
 const lock=verifyRulesLock();assert(lock.ok,JSON.stringify(lock.errors));assert.equal(lock.activeVersion,'1.83.0');
 report.ruleVersion=lock.activeVersion;report.immutableRuleCount=lock.verified.length;
 for(const file of ['tools/lv15-remake-20260927/final-verification.mjs','tools/verify-rules-lock.mjs',
  'tools/revised-preview-validation-v160.mjs','tools/wechat-layout-codec.mjs','scripts/wechat-level-data.mjs',
  'docs/rules/manifest.json','docs/rules/mechanism-rules-v1.83.0.md',candidateFile,baselineFile])bind(file);
 assert.equal(ownBindings[candidateFile],expectedCandidateSha);
 const bundle=await build({stdin:{resolveDir:process.cwd(),contents:`
  export {LEVELS,LEVELS_BEFORE_LEVEL15_ORIGINAL_REMAKE} from './src/core/levels.ts';
  export {levelStarTargets} from './src/core/levelStarConditions.ts';`},
  bundle:true,write:false,platform:'node',format:'esm',metafile:true,logLevel:'silent'});
 for(const file of Object.keys(bundle.metafile.inputs).filter(p=>p!=='<stdin>'))bind(file);
 const {LEVELS,LEVELS_BEFORE_LEVEL15_ORIGINAL_REMAKE:before,levelStarTargets}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
 const baseline=read(baselineFile),candidate=read(candidateFile),level=LEVELS[14];
 assert.equal(LEVELS.length,200);assert.equal(before?.length,200);assert.equal(candidate.drags.length,21);
 assert.deepEqual(json(level),candidate.level);assert.deepEqual(json(before[14]),baseline.level);assert.equal(digest(level),expectedLevelSha);
 assert.equal(level.id,15);assert.equal(level.name,'外壳回顾');assert.equal(level.difficulty,'easy');
 assert.equal(level.timeSeconds,120);assert.equal(level.reward,60);assert.equal(level.parMoves,536);assert.equal(level.preservedMoveTarget,34);
 assert.equal(level.designTargets,undefined);assert.deepEqual(level.featureIntro,baseline.level.featureIntro);
 assert.deepEqual(levelStarTargets(level),{moveTarget:34,timeTargetSeconds:86});assert.deepEqual(levelStarTargets(level),baseline.stars);
 for(let i=0;i<200;i++){
  assert.equal(LEVELS[i].id,i+1);assert.equal(before[i].id,i+1);
  assert.equal(sha(before[i]),baseline.levelHashes[i].sha256,`Pre15 baseline drift: ${i+1}`);
  if(i!==14){assert.equal(LEVELS[i],before[i],`Unexpected changed object: ${i+1}`);assert.equal(sha(LEVELS[i]),baseline.levelHashes[i].sha256);}
 }
 const changedSinceCapture=LEVELS.filter(l=>sha(l)!==baseline.levelHashes[l.id-1].sha256).map(l=>l.id);assert.deepEqual(changedSinceCapture,[15]);
 const sharedFileChecks=Object.entries(baseline.files).filter(([file])=>file!=='src/core/levels.ts').map(([file,expected])=>{
  const actual=digest(fs.readFileSync(file));assert.equal(actual,expected,`Shared source changed: ${file}`);return{file,sha256:actual};
 });
 report.levelSha256=sha(level);report.levelSemanticSha256=digest(level);report.routeSha256=digest(candidate.drags);
 report.candidate={file:candidateFile,sha256:expectedCandidateSha};report.changedSinceCapture=changedSinceCapture;
 report.other199Preserved=true;report.sharedRuntimeRenderingScoringUnchanged=true;report.sharedFileChecks=sharedFileChecks;

 const formalStaticFile=latest(/^validation-formal-static-(\d+)\.json$/),formalStatic=read(formalStaticFile);
 assert.equal(formalStatic.status,'PASS');boundToCandidate(formalStatic,level,candidate);
 assert(formalStatic.formalSourceObjectUsed&&formalStatic.difficultyCertified&&!formalStatic.diagnosticOnly);
 for(const graph of [formalStatic.quotientedFloor,formalStatic.unquotientedFloor]){assert(graph.thresholdProven);assert(graph.floor>=5);}
 assert(formalStatic.lowerBound>=5);assert.equal(formalStatic.upperBound,6);completeReplay(formalStatic.replay);
 assert.deepEqual(formalStatic.eventCounts,{peels:5,bodyRemovals:10,total:15});
 assert.equal(formalStatic.repositionKinds.multiCell,6);assert.equal(formalStatic.repositionKinds.singleCell,0);
 assert.equal(formalStatic.qualification.exitCode,0);assert.deepEqual(formalStatic.starTargets,{moveTarget:34,timeTargetSeconds:86});
 report.formalStatic={...record(formalStaticFile,formalStatic),contractFloor:formalStatic.lowerBound,upperBound:6};

 const design=read(designFile);assert.equal(design.status,'PASS');boundToCandidate(design,level,candidate);completeReplay(design.replay);
 for(const graph of [design.quotientFloor,design.rawMaskFloor]){assert(graph.thresholdProven);assert.equal(graph.floor,6);}
 assert.equal(design.lowerBound,6);assert.equal(design.upperBound,6);assert.equal(design.qualification.exitCode,0);
 assert.deepEqual(design.events,{peels:5,removals:10,repositions:6,multiCellRepositions:6,singleCellRepositions:0});
 const authoritative=read(authoritativeFile);assert.equal(authoritative.status,'PASS');boundToCandidate(authoritative,level,candidate);
 assert(authoritative.proof.thresholdProven);assert.equal(authoritative.proof.floor,6);completeReplay(authoritative.replay);
 assert.equal(authoritative.proof.abstraction,'optional-exit-unit-step-gesture-superset-v1');
 report.lowerBounds={design:{...record(designFile,design),rawStates:design.rawMaskFloor.exploredStates,quotientStates:design.quotientFloor.exploredStates},
  authoritative:{...record(authoritativeFile,authoritative),states:authoritative.proof.exploredStates,transitions:authoritative.proof.attemptedTransitions}};
 report.lowerBound=6;report.upperBound=6;report.exactNecessaryRepositions=6;report.totalDrags=21;
 report.events={bodyRemovals:10,peels:5,multiCellRepositions:6,singleCellRepositions:0};

 const qualificationFile=latest(/^validation-qualification-(\d+)\.json$/),qualification=read(qualificationFile);
 assert.equal(qualification.status,'PASS');assert.equal(qualification.ruleVersion,'1.83.0');
 assert.equal(qualification.nativePlainSolverUsed,false);assert(qualification.shellPairIdentityIsolation);
 assert.equal(qualification.fixtures.length,5);assert(qualification.fixtures.every(f=>f.completeOutgoingGraphEquality));
 assert.deepEqual(qualification.fixtures.map(f=>JSON.stringify(f.layers)).sort(),level.blocks.filter(b=>b.layers?.length===2).map(b=>JSON.stringify(b.layers)).sort());
 assert.equal(qualification.narrowGates.length,8);
 for(const check of qualification.narrowGates){assert.equal(check.actual,check.size===2);assert.equal(check.mask,check.actual);}
 assert.equal(qualification.genericQualifications.exitCode,0);assert.deepEqual(qualification.drift,[]);
 report.shellQualification={...record(qualificationFile,qualification),pairedSourceFixtures:5,wholeSQ2GateCases:8};

 const sourceReviewFile=latest(/^source-final-review-v183-(\d+)\.json$/),sourceReview=read(sourceReviewFile);
 assert.equal(sourceReview.status,'SOURCE_ORIGINALITY_AND_MECHANISM_REVIEW_PASS');boundToCandidate(sourceReview,level,candidate);
 assert(sourceReview.mechanismReview.passed);assert.equal(sourceReview.mechanismReview.shellPeels,5);assert.equal(sourceReview.mechanismReview.bodyRemovals,10);
 report.sourceReview=record(sourceReviewFile,sourceReview);
 const preservationFile=latest(/^source-formal-preservation-v183-(\d+)\.json$/),preservation=read(preservationFile);
 assert.equal(preservation.status,'FORMAL_LV15_CANDIDATE_AND_OTHER_199_PRESERVATION_PASS');assert.equal(preservation.ruleVersion,'1.83.0');
 assert.equal(preservation.canonicalLevelSha256,digest(level));assert.equal(preservation.currentSourceReview.replaceAll('\\','/'),sourceReviewFile);
 assert(preservation.formalCandidateCanonicalExact&&preservation.pre15PipelineRawMatchesAll200Baseline);
 assert(preservation.other199RawHashesUnchanged&&preservation.other199ObjectIdentityUnchanged&&preservation.featureIntroPreserved);
 assert.deepEqual(preservation.changedLevelIds,[15]);assert.deepEqual(preservation.stars,{moveTarget:34,timeTargetSeconds:86});assert(preservation.actualStarsUnchanged);
 assert(preservation.originalSourceFileChecks.every(row=>row.before===row.current));assert.deepEqual(preservation.sourceReviewBindingDrift,[]);
 report.sourcePreservation=record(preservationFile,preservation);

 report.pointers=[[320,568],[496,1078]].map(([width,height])=>{
  const file=latest(new RegExp(`^validation-pointer-formal-${width}-(\\d+)$`),true),pointer=read(file);
  assert.equal(pointer.status,'PASS');boundToCandidate(pointer,level,candidate);assert.equal(pointer.mode,'formal');
  assert.deepEqual(pointer.viewport,{width,height});assert(pointer.formalObjectIdentity&&!pointer.candidateInjected);
  assert(pointer.finalIdentity.formalObjectIdentity&&pointer.finalIdentity.formalDefinitionsUnchanged&&pointer.finalIdentity.other199Unchanged);
  assert.deepEqual(json(pointer.finalIdentity.level),candidate.level);assert(pointer.naturalTimingReplay.passed&&pointer.naturalClock);
  assert(pointer.naturalClockProbe.afterClock<pointer.naturalClockProbe.beforeClock);
  assert(pointer.final.complete&&!pointer.final.failed&&pointer.final.remainingSeconds>0);assert.equal(pointer.final.moves,21);assert.equal(pointer.final.cleared,15);
  assert.equal(pointer.nonClearingDrags,6);assert.equal(pointer.multiCellRepositions,6);assert.equal(pointer.singleCellRepositions,0);
  assert.equal(pointer.peelEvents,5);assert.equal(pointer.bodyRemovals,10);assert.equal(pointer.steps.length,21);
  assert.equal(pointer.steps.filter(s=>s.event==='peel').length,5);assert.equal(pointer.steps.filter(s=>s.event==='body-removal').length,10);assert.equal(pointer.steps.filter(s=>s.event==='reposition').length,6);
  assert.equal(pointer.introduction.scheduled.kind,'layer');assert.equal(pointer.introduction.seen,false);
  assert(pointer.introduction.pointerAcknowledged&&pointer.introduction.clockHeldDuringPopup);
  const win=pointer.settlement;assert.equal(win.earnedStars,3);assert.equal(win.assistedClear,false);
  assert.equal(win.conditions.moveTarget,34);assert.equal(win.conditions.timeTargetSeconds,86);assert(win.conditions.moveAchieved&&win.conditions.timeAchieved);
  assert(win.texts.includes('34次拖动内完成'));assert(win.texts.includes('86秒内完成'));assert.equal(win.starImages.filter(s=>!s.startsWith('empty')).length,3);
  assert.equal(win.storage.backend,'MemoryHost');assert.equal(win.storage.save.bestStars['15'],3);assert.equal(win.storage.save.bestMoves['15'],21);
  assert.deepEqual(pointer.errors,[]);assert.deepEqual(pointer.storageViolations,[]);assert.deepEqual(pointer.drift,[]);
  assert.equal(pointer.nativeDrawAudit.rotated,0);assert.equal(pointer.nativeDrawAudit.canvasRotationCalls,0);
  return{...record(file,pointer),viewport:{width,height},totalDrags:21,necessaryRepositions:6,peels:5,bodyRemovals:10,
   firstShellIntroRenderedAndPointerAcknowledged:true,remainingSeconds:pointer.final.remainingSeconds,earnedStars:3};
 });

 const gameFile='dist-wechat/game.js',manifestFile='dist-wechat.build-manifest.json';bind(gameFile);bind(manifestFile);
 const game=fs.readFileSync(gameFile,'utf8'),manifest=read(manifestFile);
 const packed=[...game.matchAll(/"([A-Za-z0-9+/]{10000,})"/g)].find(match=>match[1].length===manifest.levelCompilation.packedBytes);assert(packed,'Packed level payload not found in the current local game.js');
 const packaged=restoreLevelJson(JSON.parse(decodeLayoutBytes(packed[1],manifest.levelCompilation.asciiBytes,manifest.levelCompilation.adler32)));
 assert.equal(packaged.length,200);assert.deepEqual(json(packaged),json(LEVELS));
 assert.equal(sha(game),manifest.outputs.find(row=>row.path==='game.js').sha256);assert.equal(sha(packaged),manifest.levelCompilation.levelJsonSha256);
 report.difficultyLabel='easy';report.starTargets={moveTarget:34,timeTargetSeconds:86};report.historicalParMoves=536;report.timeSeconds=120;report.historicalReward=60;report.featureIntroPreserved=true;
 report.localWechat={directory:'dist-wechat',all200PackagedLevelsEqualCurrentSource:true,level15SemanticSha256:digest(packaged[14]),gameSha256:sha(game),uploaded:false,published:false};
 report.bindings=ownBindings;report.drift=Object.entries(ownBindings).filter(([file,expected])=>digest(fs.readFileSync(file))!==expected);assert.deepEqual(report.drift,[]);
 report.status='PASS';
}catch(error){report.status='FAIL';report.error=String(error.stack??error).replace(/data:text\/javascript;base64,[\w+/=]+/g,'in-memory-current-core');report.bindings=ownBindings;process.exitCode=1;}
const output=`${root}/final-verification-${Date.now()}.json`;
fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,status:report.status,changedSinceCapture:report.changedSinceCapture,lower:report.lowerBound,upper:report.upperBound,
 totalDrags:report.totalDrags,stars:report.starTargets,wechatMatches:report.localWechat?.all200PackagedLevelsEqualCurrentSource,tests:report.tests,error:report.error}));
