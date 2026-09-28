import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {digest,canonical} from '../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../verify-rules-lock.mjs';

const root='deliverables/lv16-remake-20260927';
const baselineFile=root+'/baseline.json',candidateFile=root+'/design-final-1790494351260.json',sourceAuditFile=root+'/source-audit-1790493955166.json';
const reviewFile=process.argv[2];assert(reviewFile?.startsWith(root+'/source-final-review-v184-'));
const baseline=JSON.parse(fs.readFileSync(baselineFile)),candidate=JSON.parse(fs.readFileSync(candidateFile)),review=JSON.parse(fs.readFileSync(reviewFile)),sourceAudit=JSON.parse(fs.readFileSync(sourceAuditFile));
const lock=verifyRulesLock();assert(lock.ok);assert.equal(lock.activeVersion,'1.84.0');
const compiled=await build({stdin:{resolveDir:process.cwd(),contents:"export {LEVELS,LEVELS_BEFORE_LEVEL16_ORIGINAL_REMAKE} from './src/core/levels.ts'; export {levelStarTargets} from './src/core/levelStarConditions.ts';"},bundle:true,write:false,platform:'node',format:'esm',metafile:true,logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const json=v=>JSON.parse(JSON.stringify(v)),rawHash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
assert.equal(api.LEVELS.length,200);assert.equal(api.LEVELS_BEFORE_LEVEL16_ORIGINAL_REMAKE.length,200);
assert.deepEqual(api.LEVELS_BEFORE_LEVEL16_ORIGINAL_REMAKE.map(l=>({id:l.id,sha256:rawHash(l)})),baseline.levelHashes);
const rows=api.LEVELS.map((l,i)=>({id:l.id,beforeRawSha256:baseline.levelHashes[i].sha256,currentRawSha256:rawHash(l),sameObjectAsPre16:l===api.LEVELS_BEFORE_LEVEL16_ORIGINAL_REMAKE[i]}));
const changed=rows.filter(r=>r.beforeRawSha256!==r.currentRawSha256).map(r=>r.id);assert.deepEqual(changed,[16]);assert(rows.filter(r=>r.id!==16).every(r=>r.sameObjectAsPre16));
const formal=json(api.LEVELS[15]);assert.equal(formal.id,16);assert.deepEqual(canonical(formal),canonical(candidate.level));
assert.equal(digest(formal),'5ac492d78f69d78926845cdd1a58d2f423afc37c42dc1f4141bee086fa627423');
assert.equal(review.status,'SOURCE_ORIGINALITY_AND_MECHANISM_REVIEW_PASS');assert.equal(review.levelSha256,digest(formal));assert.equal(review.routeSha256,digest(candidate.drags));
assert.deepEqual(api.levelStarTargets(formal),baseline.stars);assert.deepEqual(baseline.stars,{moveTarget:50,timeTargetSeconds:129});
for(const k of ['name','timeSeconds','reward','parMoves','featureIntro'])assert.deepEqual(formal[k],baseline.level[k]);
assert.equal(baseline.level.difficulty,'hard');assert.equal(formal.difficulty,'normal');
const sharedFileChecks=Object.entries(baseline.files).map(([file,before])=>({file,before,current:digest(fs.readFileSync(file)),authorizedLv16EntryWiring:file==='src/core/levels.ts'}));
assert(sharedFileChecks.filter(r=>!r.authorizedLv16EntryWiring).every(r=>r.before===r.current));
const originalSourceFileChecks=sourceAudit.bindings.filter(b=>b.path.startsWith('src/')&&b.path!=='src/core/levels.ts').map(b=>({file:b.path,before:b.sha256,current:digest(fs.readFileSync(b.path))}));
assert(originalSourceFileChecks.every(r=>r.before===r.current),'All preexisting src modules except authorized levels wiring remain exact, including Lv9/Lv11/Lv12/Lv15');
const drift=Object.entries(review.bindings).filter(([p,h])=>digest(fs.readFileSync(p))!==h);assert.deepEqual(drift,[],'Source review must be rerun after final production wiring');
const paths=[...Object.keys(compiled.metafile.inputs).filter(p=>p!=='<stdin>'),baselineFile,candidateFile,sourceAuditFile,reviewFile,root+'/source-final-assessment-v184.md','tools/lv16-remake-20260927/source-formal-preservation-v184.mjs','docs/rules/manifest.json','docs/rules/mechanism-rules-v1.84.0.md'];
const bindings=Object.fromEntries(paths.map(p=>[p,digest(fs.readFileSync(p))]));
const report={
  createdAt:new Date().toISOString(),status:'FORMAL_LV16_CANDIDATE_AND_OTHER_199_PRESERVATION_PASS',ruleVersion:lock.activeVersion,ruleLockPass:true,ruleVersionCount:lock.verified.length,baseline:baselineFile,candidate:candidateFile,currentSourceReview:reviewFile,formalLevelIndex:15,formalLevelId:16,canonicalLevelSha256:digest(formal),formalCandidateCanonicalExact:true,pre16PipelineRawMatchesAll200Baseline:true,changedLevelIds:changed,other199RawHashesUnchanged:true,other199ObjectIdentityUnchanged:true,oldLv5AndCompletedLv9Lv11Lv12Lv15Unchanged:true,
  stars:api.levelStarTargets(formal),oldStars:baseline.stars,actualStarsUnchanged:true,totalTimeSeconds:180,historicalParMoves:50,historicalReward:65,featureIntroPreserved:true,difficultyChange:{before:'hard',after:'normal',authority:'v1.84 user-confirmed ordinary consolidation11–15'},
  sharedFileChecks,originalSourceFileChecks,rows,sourceReviewBindingDrift:drift,bindings,scope:'Read-only final campaign/source preservation audit. No new difficulty or Pointer certificate asserted here.',productionModifiedByThisAudit:false,playerSaveTouched:false,releaseApproved:false,
};
assert.deepEqual(Object.entries(bindings).filter(([p,h])=>digest(fs.readFileSync(p))!==h),[]);
const output=root+'/source-formal-preservation-v184-'+Date.now()+'.json';fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,status:report.status,changed,canonical:report.canonicalLevelSha256,stars:report.stars,originalSrcFilesUnchanged:originalSourceFileChecks.length}));
