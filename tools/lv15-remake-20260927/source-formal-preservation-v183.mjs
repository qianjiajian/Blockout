import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {digest,canonical} from '../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../verify-rules-lock.mjs';

const root='deliverables/lv15-remake-20260927';
const baselineFile=root+'/baseline.json',candidateFile=root+'/design-final-1790492746325.json',sourceAuditFile=root+'/source-audit-1790492551144.json';
const reviewFile=process.argv[2];assert(reviewFile?.startsWith(root+'/source-final-review-v183-'));
const baseline=JSON.parse(fs.readFileSync(baselineFile)),candidate=JSON.parse(fs.readFileSync(candidateFile)),review=JSON.parse(fs.readFileSync(reviewFile)),sourceAudit=JSON.parse(fs.readFileSync(sourceAuditFile));
const lock=verifyRulesLock();assert(lock.ok);assert.equal(lock.activeVersion,'1.83.0');
const compiled=await build({stdin:{resolveDir:process.cwd(),contents:"export {LEVELS,LEVELS_BEFORE_LEVEL15_ORIGINAL_REMAKE} from './src/core/levels.ts'; export {levelStarTargets} from './src/core/levelStarConditions.ts';"},bundle:true,write:false,platform:'node',format:'esm',metafile:true,logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const json=v=>JSON.parse(JSON.stringify(v)),rawHash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
assert.equal(api.LEVELS.length,200);assert.equal(api.LEVELS_BEFORE_LEVEL15_ORIGINAL_REMAKE.length,200);
assert.deepEqual(api.LEVELS_BEFORE_LEVEL15_ORIGINAL_REMAKE.map(l=>({id:l.id,sha256:rawHash(l)})),baseline.levelHashes);
const rows=api.LEVELS.map((l,i)=>({id:l.id,beforeRawSha256:baseline.levelHashes[i].sha256,currentRawSha256:rawHash(l),sameObjectAsPre15:l===api.LEVELS_BEFORE_LEVEL15_ORIGINAL_REMAKE[i]}));
const changed=rows.filter(r=>r.beforeRawSha256!==r.currentRawSha256).map(r=>r.id);assert.deepEqual(changed,[15]);assert(rows.filter(r=>r.id!==15).every(r=>r.sameObjectAsPre15));
const formal=json(api.LEVELS[14]);assert.equal(formal.id,15);assert.deepEqual(canonical(formal),canonical(candidate.level));
assert.equal(digest(formal),'af9799ec1bcd1c84b6a6df1faf6342781d995a66457b75d56d011f49265b59d3');
assert.equal(review.status,'SOURCE_ORIGINALITY_AND_MECHANISM_REVIEW_PASS');assert.equal(review.levelSha256,digest(formal));assert.equal(review.routeSha256,digest(candidate.drags));
assert.deepEqual(api.levelStarTargets(formal),baseline.stars);assert.deepEqual(baseline.stars,{moveTarget:34,timeTargetSeconds:86});
for(const k of ['name','timeSeconds','reward','parMoves','featureIntro'])assert.deepEqual(formal[k],baseline.level[k]);
assert.equal(baseline.level.difficulty,'hard');assert.equal(formal.difficulty,'easy');
const sharedFileChecks=Object.entries(baseline.files).map(([file,before])=>({file,before,current:digest(fs.readFileSync(file)),authorizedLv15EntryWiring:file==='src/core/levels.ts'}));
assert(sharedFileChecks.filter(r=>!r.authorizedLv15EntryWiring).every(r=>r.before===r.current));
const originalSourceFileChecks=sourceAudit.bindings.filter(b=>b.path.startsWith('src/')&&b.path!=='src/core/levels.ts').map(b=>({file:b.path,before:b.sha256,current:digest(fs.readFileSync(b.path))}));
assert(originalSourceFileChecks.every(r=>r.before===r.current),'All preexisting src modules except authorized levels wiring remain exact, including Lv9/Lv11/Lv12');
const drift=Object.entries(review.bindings).filter(([p,h])=>digest(fs.readFileSync(p))!==h);assert.deepEqual(drift,[],'Source review must be rerun after final production wiring');
const paths=[...Object.keys(compiled.metafile.inputs).filter(p=>p!=='<stdin>'),baselineFile,candidateFile,sourceAuditFile,reviewFile,root+'/source-final-assessment-v183.md','tools/lv15-remake-20260927/source-formal-preservation-v183.mjs','docs/rules/manifest.json','docs/rules/mechanism-rules-v1.83.0.md'];
const bindings=Object.fromEntries(paths.map(p=>[p,digest(fs.readFileSync(p))]));
const report={
  createdAt:new Date().toISOString(),status:'FORMAL_LV15_CANDIDATE_AND_OTHER_199_PRESERVATION_PASS',ruleVersion:lock.activeVersion,ruleLockPass:true,ruleVersionCount:lock.verified.length,baseline:baselineFile,candidate:candidateFile,currentSourceReview:reviewFile,formalLevelIndex:14,formalLevelId:15,canonicalLevelSha256:digest(formal),formalCandidateCanonicalExact:true,pre15PipelineRawMatchesAll200Baseline:true,changedLevelIds:changed,other199RawHashesUnchanged:true,other199ObjectIdentityUnchanged:true,oldLv5AndCompletedLv9Lv11Lv12Unchanged:true,
  stars:api.levelStarTargets(formal),oldStars:baseline.stars,actualStarsUnchanged:true,totalTimeSeconds:120,historicalParMoves:536,historicalReward:60,featureIntroPreserved:true,difficultyChange:{before:'hard',after:'easy',authority:'v1.83 first-shell teaching5–10'},
  sharedFileChecks,originalSourceFileChecks,rows,sourceReviewBindingDrift:drift,bindings,scope:'Read-only final campaign/source preservation audit. No new difficulty or Pointer certificate asserted here.',productionModifiedByThisAudit:false,playerSaveTouched:false,releaseApproved:false,
};
assert.deepEqual(Object.entries(bindings).filter(([p,h])=>digest(fs.readFileSync(p))!==h),[]);
const output=root+'/source-formal-preservation-v183-'+Date.now()+'.json';fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,status:report.status,changed,canonical:report.canonicalLevelSha256,stars:report.stars,originalSrcFilesUnchanged:originalSourceFileChecks.length}));
