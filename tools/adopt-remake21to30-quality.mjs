import assert from 'node:assert/strict';
import fs from 'node:fs';
import {IDS,loadApi,assertBaseline} from './remake21to30-v120.mjs';
import {BASELINE,OUTPUT,checkQuality,writeNew,ruleGate} from './remake21to30-quality.mjs';
import {verifyDecisions} from './review-remake21to30-decisions.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
const [mode,...args]=process.argv.slice(2);
ruleGate();const {api,inputs}=await loadApi(),baseline=JSON.parse(fs.readFileSync(BASELINE));assertBaseline(baseline);
inputs.push('tools/adopt-remake21to30-quality.mjs','tools/remake21to30-quality.mjs','tools/remake21to30-mask-floor.mjs','tools/remake21to30-v120.mjs',
  'tools/review-remake21to30-decisions.mjs','tools/revised-opening-coverage.mjs','tools/revised-gate-span-limits.mjs','docs/rules/manifest.json','docs/mechanism-rules-v1.21.0.md');
const bind=paths=>Object.fromEntries(paths.map(p=>[p,digest(fs.readFileSync(p))]));
const check=(data,review)=>{
  const result=checkQuality(data,baseline,api);
  const card=review.rows.find(r=>r.id===data.level.id);
  assert(card&&card.levelSha256===digest(data.level)&&card.routeSha256===digest(data.drags)&&card.status==='PASS','Independent decision review must bind exact map and route');
  assert(card.primaryMechanism&&card.concreteDecision&&card.wrongChoice&&card.recovery&&card.mechanismEvidence,'Specific reviewed causal design evidence required');
  assert(card.humanBlindTested===false,'Do not invent human playtest');
  const clearLoad=data.level.blocks.reduce((n,b)=>n+(b.layers?.length??1),0),stars=baseline.levels[data.level.id-1].starTargets;
  return {...result,decisionReviewPassed:true,decisionReview:card,independentDecisionChecks:verifyDecisions(data,api),
    exactNecessaryRepositions:result.proof.lowerBound===result.replay.nonClearingDrags?result.proof.lowerBound:null,
    starAssessment:{preservedTargets:stars,clearLoad,guaranteedMinimumDrags:clearLoad+result.proof.lowerBound,
      moveTargetImpossible:clearLoad+result.proof.lowerBound>stars.moveTarget,witnessWithinMoveTarget:data.drags.length<=stars.moveTarget,timeAndStarsCalibrated:false}};
};
if(mode==='prepare'){
  const [reviewPath,...files]=args;assert.equal(files.length,10);
  const review=JSON.parse(fs.readFileSync(reviewPath));assert.deepEqual(review.rows.map(r=>r.id),IDS);
  assert.equal(digest(api.LEVELS),baseline.campaignSha256,'Do not overwrite concurrent map changes');
  const candidates=files.map(file=>({file,data:JSON.parse(fs.readFileSync(file))})).sort((a,b)=>a.data.level.id-b.data.level.id);
  assert.deepEqual(candidates.map(c=>c.data.level.id),IDS);
  const verified=candidates.map(c=>({...c,checks:check(c.data,review)}));
  const folder=`${OUTPUT}/batch-${Date.now()}`;
  const manifest={ruleVersion:'1.21.0',designPass:'multi-block-spatial-decisions',createdAt:new Date().toISOString(),baseline:BASELINE,
    baselineSha256:digest(fs.readFileSync(BASELINE)),ids:IDS,other190Sha256:baseline.other190Sha256,reviewPath,reviewSha256:digest(fs.readFileSync(reviewPath)),
    rows:[],inputs:bind(inputs),humanBlindTested:false,releaseApproved:false};
  for(const {file,data,checks} of verified){
    const candidatePath=`${folder}/lv${data.level.id}.json`,checksPath=`${folder}/lv${data.level.id}-checks.json`;
    writeNew(candidatePath,data);writeNew(checksPath,checks);
    manifest.rows.push({id:data.level.id,source:file,sourceSha256:digest(fs.readFileSync(file)),candidatePath,candidateFileSha256:digest(fs.readFileSync(candidatePath)),
      checksPath,checksSha256:digest(fs.readFileSync(checksPath)),levelSha256:digest(data.level),routeSha256:digest(data.drags),lowerBound:checks.proof.lowerBound,
      witnessNonClearingDrags:checks.replay.nonClearingDrags,singleCellDrags:checks.measurements.singleCellDrags,multiCellDrags:checks.measurements.multiCellDrags,starAssessment:checks.starAssessment});
  }
  const manifestPath=`${folder}/manifest.json`;writeNew(manifestPath,manifest);
  console.log(JSON.stringify({manifestPath,rows:manifest.rows.map(r=>({id:r.id,lower:r.lowerBound,upper:r.witnessNonClearingDrags,single:r.singleCellDrags,multi:r.multiCellDrags,stars:r.starAssessment}))}));
}else if(mode==='verify'){
  const [manifestPath]=args,manifest=JSON.parse(fs.readFileSync(manifestPath));
  assert.equal(manifest.ruleVersion,'1.21.0');assert.deepEqual(manifest.rows.map(r=>r.id),IDS,'Verify every approved level exactly once');
  assert.equal(manifest.baselineSha256,digest(fs.readFileSync(BASELINE)));assert.deepEqual(manifest.ids,IDS);
  assert.equal(manifest.reviewSha256,digest(fs.readFileSync(manifest.reviewPath)));const review=JSON.parse(fs.readFileSync(manifest.reviewPath));
  assert.deepEqual(review.rows.map(r=>r.id),IDS);
  assert.equal(api.LEVELS.length,200);assert.deepEqual(api.LEVELS.map(l=>l.id),Array.from({length:200},(_,i)=>i+1));
  for(const l of api.LEVELS)assert.deepEqual(api.levelStarTargets(l),baseline.levels[l.id-1].starTargets);
  const other=api.LEVELS.filter(l=>!IDS.includes(l.id));assert.equal(digest(other),baseline.other190Sha256);
  const rows=manifest.rows.map(row=>{
    assert.equal(digest(fs.readFileSync(row.candidatePath)),row.candidateFileSha256);assert.equal(digest(fs.readFileSync(row.checksPath)),row.checksSha256);
    const data=JSON.parse(fs.readFileSync(row.candidatePath));assert.deepEqual(api.LEVELS[row.id-1],data.level);
    assert.equal(digest(data.level),row.levelSha256);assert.equal(digest(data.drags),row.routeSha256);
    const result=check({...data,level:api.LEVELS[row.id-1]},review);assert.equal(result.proof.lowerBound,row.lowerBound);return result;
  });
  const output=`${OUTPUT}/formal-verification-${Date.now()}.json`;
  writeNew(output,{status:'PASS',ruleVersion:'1.21.0',manifestPath,manifestSha256:digest(fs.readFileSync(manifestPath)),campaignSha256:digest(api.LEVELS),
    other190Sha256:digest(other),other190Unchanged:true,rows,inputs:bind(inputs),pointerValidated:false,humanBlindTested:false,releaseApproved:false});
  console.log(JSON.stringify({output,status:'PASS',campaignSha256:digest(api.LEVELS)}));
}else throw Error('Usage: node tools/adopt-remake21to30-quality.mjs prepare REVIEW TEN_FILES | verify MANIFEST');
