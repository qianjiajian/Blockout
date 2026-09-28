// Refresh only the integration snapshot after another authorized batch changes.
// This is NOT a new lower-bound proof. The exact archived proof and its source
// bindings remain required; final adopted-level checks still run separately.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi,ruleGate,VERSION,BASELINE,OUTPUT,auditCandidate,writeNew} from './remake31to40-v147.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
ruleGate();const [file]=process.argv.slice(2),m=JSON.parse(fs.readFileSync(file));
assert.equal(m.ruleVersion,VERSION);assert.equal(digest(fs.readFileSync(BASELINE)),m.baselineSha256);
const {api}=await loadApi(),baseline=JSON.parse(fs.readFileSync(BASELINE));
// These modules only compose independently reviewed campaign data. No runtime,
// art matching, source evidence, or proof implementation may drift here.
const dataOnly=new Set(['src/core/levels.ts','src/core/remake181to190.ts','src/core/remake71to80.ts']);
const changed=[];
for(const [p,h] of Object.entries(m.inputs)){
 const actual=digest(fs.readFileSync(p));if(actual!==h){assert(dataOnly.has(p),`Non-campaign input drift: ${p}`);changed.push({path:p,before:h,after:actual});}
}
for(const row of m.rows){
 assert.deepEqual(api.LEVELS[row.id-1],m.campaignBefore[row.id-1],'The selected level changed; do not overwrite another edit');
 assert.equal(digest(fs.readFileSync(row.candidatePath)),row.candidateFileSha256);
 assert.equal(digest(fs.readFileSync(row.checksPath)),row.checksSha256);
 const data=JSON.parse(fs.readFileSync(row.candidatePath)),checks=JSON.parse(fs.readFileSync(row.checksPath));
 assert.equal(digest(data.level),row.levelSha256);assert.equal(digest(data.drags),row.routeSha256);
 assert.equal(checks.levelSha256,row.levelSha256);assert.equal(checks.routeSha256,row.routeSha256);assert(checks.proof.thresholdProven);
 for(const [p,h] of Object.entries(checks.proof.qualificationInputs??{}))assert.equal(digest(fs.readFileSync(p)),h);
 auditCandidate(data,baseline,api);const replay=api.replayRevisedRoute(data.level,data.drags);assert(replay.valid&&replay.complete);assert.equal(replay.nonClearingDrags,row.upperBound);
}
assert.equal(digest(api.LEVELS.slice(0,30)),digest(m.campaignBefore.slice(0,30)));
const manifestPath=`${OUTPUT}/batch-${Date.now()}/manifest.json`;
writeNew(manifestPath,{...m,createdAt:new Date().toISOString(),validationInheritedFrom:{path:file,sha256:digest(fs.readFileSync(file)),newLowerBoundProof:false},concurrentCampaignChanges:changed,
 campaignBefore:api.LEVELS,campaignBeforeSha256:digest(api.LEVELS),unchangedOutsideSubsetSha256:digest(api.LEVELS.filter(l=>!m.ids.includes(l.id))),
 inputs:Object.fromEntries(Object.keys(m.inputs).map(p=>[p,digest(fs.readFileSync(p))]))});
console.log(JSON.stringify({manifestPath,ids:m.ids,concurrentCampaignChanges:changed.map(r=>r.path),newLowerBoundProof:false}));
