// Rebase an already fresh-checked, unchanged subset onto concurrent level data.
// Original checks and their bindings remain immutable and linked in the new file.
import fs from 'node:fs';import assert from 'node:assert/strict';
import {loadApi,ruleGate,BASELINE,OUTPUT,auditCandidate,writeNew} from './remake41to50-v146.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
import path from 'node:path';
import {verifyAdditionalDataModule} from './remake41to50-data-only-v146.mjs';
ruleGate();const files=process.argv.slice(2),prepared=files.map(file=>({file,old:JSON.parse(fs.readFileSync(file))})),{api}=await loadApi(),baseline=JSON.parse(fs.readFileSync(BASELINE));assert(prepared.length);
const ids=prepared.flatMap(p=>p.old.ids).sort((a,b)=>a-b);assert.equal(new Set(ids).size,ids.length,'Only disjoint subsets can be combined');
const dataOnly=new Set(['src/core/nativeRemake31to40.ts','src/core/remake41to50.ts','src/core/remake61to70.ts','src/core/remake71to80.ts','src/core/remake81to90.ts','src/core/remake91to100.ts','src/core/remake181to190.ts']);
const changes=[];for(const {file,old}of prepared){
assert.equal(old.baselineSha256,digest(fs.readFileSync(BASELINE)));assert.equal(digest(old.campaignBefore),old.campaignBeforeSha256);
for(const [p,h]of Object.entries(old.inputs)){const now=digest(fs.readFileSync(p));if(now!==h){let stage=null;if(!dataOnly.has(p)){assert(process.env.REBASE_SOURCE_SNAPSHOT,`Changed proof/source/runtime dependency: ${p}`);const bytes=fs.readFileSync(path.join(process.env.REBASE_SOURCE_SNAPSHOT,p));assert.equal(digest(bytes),h,'Prior snapshot must exactly match prepared proof input');stage={before:verifyAdditionalDataModule(p,bytes.toString('utf8')),after:verifyAdditionalDataModule(p,fs.readFileSync(p,'utf8'))};}changes.push({manifest:file,path:p,before:h,after:now,...(stage?{stage}:{})});}}
for(const r of old.rows){
 assert.equal(digest(fs.readFileSync(r.candidatePath)),r.candidateFileSha256);assert.equal(digest(fs.readFileSync(r.checksPath)),r.checksSha256);
 const d=JSON.parse(fs.readFileSync(r.candidatePath)),c=JSON.parse(fs.readFileSync(r.checksPath));assert.equal(digest(d.level),r.levelSha256);assert.equal(digest(d.drags),r.routeSha256);
 assert.equal(c.levelSha256,r.levelSha256);assert.equal(c.routeSha256,r.routeSha256);assert(c.proof.thresholdProven&&c.replay.valid&&c.replay.complete);assert.equal(c.proof.floor,c.target.min);
 assert.deepEqual(api.LEVELS[r.id-1],old.campaignBefore[r.id-1],'Target changed since prepare; a rebase cannot replace someone else’s target edit');
 auditCandidate(d,baseline,api);const replay=api.replayRevisedRoute(d.level,d.drags);assert(replay.valid&&replay.complete);assert.equal(replay.nonClearingDrags,r.upperBound);
}
}
const next={...prepared[0].old,ids,rows:prepared.flatMap(p=>p.old.rows).sort((a,b)=>a.id-b.id),createdAt:new Date().toISOString(),priorPreparedManifests:prepared.map(({file})=>({path:file,sha256:digest(fs.readFileSync(file))})),rebaseOnly:true,concurrentDataChanges:changes,
 constructionArchives:prepared.map(p=>p.old.constructionArchive),campaignBefore:structuredClone(api.LEVELS),campaignBeforeSha256:digest(api.LEVELS),unchangedOutsideSubsetSha256:digest(api.LEVELS.filter(l=>!ids.includes(l.id))),
 inputs:Object.fromEntries([...new Set(prepared.flatMap(p=>Object.keys(p.old.inputs)))].map(p=>[p,digest(fs.readFileSync(p))]))};
const manifestPath=`${OUTPUT}/batch-refresh-${Date.now()}/manifest.json`;writeNew(manifestPath,next);console.log(JSON.stringify({manifestPath,ids:next.ids,proofRecomputed:false,unchangedBoundProof:true,changes}));
