import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {decodeLayoutBytes} from '../wechat-layout-codec.mjs';
import {restoreLevelJson} from '../../scripts/wechat-level-data.mjs';
const dir='deliverables/lv9-remake-20260927',read=p=>JSON.parse(fs.readFileSync(p));
const sha=x=>createHash('sha256').update(typeof x==='string'||Buffer.isBuffer(x)?x:JSON.stringify(x)).digest('hex');
const normalized=x=>JSON.parse(JSON.stringify(x));
const lock=verifyRulesLock();assert(lock.ok,JSON.stringify(lock.errors));
const bundle=await build({entryPoints:['src/core/levels.ts'],bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const {LEVELS,LEVELS_BEFORE_LEVEL9_ORIGINAL_REMAKE:before}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const baseline=read(`${dir}/baseline.json`),candidate=read(`${dir}/design-final-1790487935918.json`),level=LEVELS[8];
assert.equal(LEVELS.length,200);assert.deepEqual(normalized(level),candidate.level);assert.deepEqual(normalized(before[8]),baseline.level);
for(let i=0;i<200;i++)if(i!==8)assert.equal(LEVELS[i],before[i],`Only Lv9 changes at its integration boundary: ${i+1}`);
for(const p of ['src/core/PuzzleModel.ts','src/game/ColorEscapeGame.ts','src/game/formalBlockShapes.ts','src/core/levelStarConditions.ts'])assert.equal(sha(fs.readFileSync(p)),baseline.files[p],`No shared runtime/rendering/scoring change: ${p}`);
const changedSinceCapture=LEVELS.filter(l=>sha(l)!==baseline.levelHashes.find(b=>b.id===l.id).sha256).map(l=>l.id);
// The independent v1.78 chat is allowed to change only these star move fields.
const parallel=read('deliverables/star-targets141-150-20260927/before.json');
const starChanges={141:48,143:57,144:31,145:38,146:54,147:55,148:44,149:56,150:26};
for(const id of changedSinceCapture.filter(id=>id!==9)){
  if(id===139){
    // Independent v1.72 task completed during this task, before our Pointer runs.
    const p='deliverables/remake131-140-v146-20260924/agent139-140/enriched139-final-1790487638582.json';
    const approved=read(p),final=read('deliverables/remake131-140-v146-20260924/formal-validation-1790487912962.json');
    assert.equal(final.status,'ALL_TEN_FORMAL_PASS');
    assert.deepEqual(normalized(LEVELS[138]),approved.level,'Preserve independently adopted Lv139 verbatim');
    assert.equal(digest(LEVELS[138]),'a9c85b2f7f0d0e1e97000072d666b4a2c6c836a4941c783fa278e01456f95027');
    continue;
  }
  assert(id in starChanges,`Unexplained parallel data change at ${id}`);
  const old=parallel.priorLevels.find(l=>l.id===id);assert(old);
  assert.equal(sha(old),baseline.levelHashes.find(b=>b.id===id).sha256,'Independent baseline must match this task baseline');
  assert.deepEqual(normalized(LEVELS[id-1]),{...old,preservedMoveTarget:starChanges[id]},'Parallel v1.78 changes only approved rating');
}
const proofFile=`${dir}/root-proof-1790488031047.json`,proof=read(proofFile);
assert.equal(proof.levelSha256,sha(level));assert(proof.proof.thresholdProven);assert.equal(proof.proof.floor,16);
assert(proof.route.valid&&proof.route.complete);assert.equal(proof.route.nonClearingDrags,16);
for(const[p,h]of Object.entries(proof.inputs))assert.equal(sha(fs.readFileSync(p)),h,`Proof input drift: ${p}`);
const audits=['source-final-review-1790488102561.json','validation-static-1790488097235.json'].map(f=>{
  const p=`${dir}/${f}`,r=read(p);assert.equal(r.status,'PASS');assert.equal(r.levelSha256??r.levelSemanticSha256,digest(level));
  return{file:p,sha256:sha(fs.readFileSync(p))};
});
const pointers=[320,496].map(width=>{
  const p=`${dir}/validation-pointer-formal-${width}-${width===320?'1790488143148':'1790488143154'}/report.json`,r=read(p);
  assert.equal(r.status,'PASS');assert(r.formalObjectIdentity&&!r.candidateInjected&&r.naturalTimingReplay.passed&&r.final.complete);
  assert.equal(r.levelSha256,digest(level));assert.equal(r.routeSha256,digest(candidate.drags));
  assert.equal(r.final.moves,26);assert.equal(r.nonClearingDrags,16);assert.equal(r.settlement.earnedStars,3);
  assert.deepEqual(r.errors,[]);assert.deepEqual(r.storageViolations,[]);assert.equal(r.nativeDrawAudit.rotated,0);
  for(const[file,h]of Object.entries(r.bindings))assert.equal(digest(fs.readFileSync(file)),h,`Post-Pointer drift: ${file}`);
  return{file:p,sha256:sha(fs.readFileSync(p)),viewport:r.viewport,totalDrags:26,necessaryRepositions:16,remainingSeconds:r.final.remainingSeconds,earnedStars:3};
});
const game=fs.readFileSync('dist-wechat/game.js','utf8'),manifest=read('dist-wechat.build-manifest.json');
const packed=[...game.matchAll(/"([A-Za-z0-9+/]{10000,})"/g)].find(m=>m[1].length===manifest.levelCompilation.packedBytes);assert(packed);
const packaged=restoreLevelJson(JSON.parse(decodeLayoutBytes(packed[1],manifest.levelCompilation.asciiBytes,manifest.levelCompilation.adler32)));
assert.deepEqual(normalized(packaged),normalized(LEVELS));assert.equal(sha(game),manifest.outputs.find(x=>x.path==='game.js').sha256);
assert.equal(sha(packaged),manifest.levelCompilation.levelJsonSha256);
const report={createdAt:new Date().toISOString(),status:'PASS',ruleVersion:lock.activeVersion,contractVersion:'1.77.0',level:9,levelSha256:sha(level),semanticSha256:digest(level),routeSha256:digest(candidate.drags),onlyThisTaskChangedLevel:9,other199PreservedAtIntegrationBoundary:true,changedSinceCapture,parallelApprovedChanges:changedSinceCapture.filter(id=>id!==9),sharedRuntimeRenderingScoringUnchanged:true,lowerBound:16,upperBound:16,exactNecessaryRepositions:16,totalDrags:26,starTargets:{moveTarget:26,timeTargetSeconds:75},timeSeconds:105,proof:{file:proofFile,sha256:sha(fs.readFileSync(proofFile)),states:proof.proof.exploredStates,transitions:proof.proof.attemptedTransitions},audits,pointers,tests:{targeted:'29/29 PASS',typecheck:'PASS',widerSuite:'levelStarConditions.test.ts retains 2 pre-existing unrelated failures; audited before and after integration, unchanged'},localWechat:{directory:'dist-wechat',all200PackagedLevelsEqualCurrentSource:true,level9Sha256:sha(packaged[8]),gameSha256:sha(game),uploaded:false,published:false},playerSaveTouched:false,humanBlindTested:false,mobileDeviceTested:false};
const output=`${dir}/final-verification-${Date.now()}.json`;fs.writeFileSync(output,JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify({output,status:report.status,changedSinceCapture,lower:16,upper:16,stars:report.starTargets,wechatMatches:true}));
