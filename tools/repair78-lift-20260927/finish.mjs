import fs from 'node:fs';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {digest} from '../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
const root='deliverables/repair78-lift-20260927';
const load=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const candidateFile=root+'/design/candidate-color-3-5-1790517660677.json',candidate=load(candidateFile);
const baselineFile=root+'/before-pointer-1790518333971.json',baseline=load(baselineFile);
const proofFile=root+'/design/lower16-1790517719480.json',proof=load(proofFile);assert(proof.thresholdProven);assert.equal(proof.levelSha256,candidate.levelSha256);
const reviewFile=root+'/review/colored-final-review-1790518051495.json',review=load(reviewFile);assert.equal(review.status,'PASS');
const tests=load(root+'/tests.json'),typecheck=load(root+'/typecheck.json');assert(tests.success&&tests.numFailedTests===0);assert.equal(typecheck.exitCode,0);
const folders=['pointer-normal-1790518376110-320x568-14884','pointer-normal-1790518376061-496x1078-29452','pointer-late-no-external-1790518376168-320x568-39000','pointer-late-no-external-1790518376162-496x1078-58272'];
const pointer=[],bindings={};
for(const folder of folders){
 const file=root+'/pointer/v105/'+folder+'/report.json',r=load(file),row=r.rows[0];
 assert.equal(r.status,'PASS');assert.equal(row.status,'PASS');assert(r.pointerValidated&&r.naturalClockValidated&&r.formalDataValidated&&r.other199Preserved);
 for(const key of ['errors','snapshotDrift','sourceEvidenceDrift','currentWorkspaceDrift'])assert.deepEqual(r[key],[]);
 assert.equal(row.levelSha256,candidate.levelSha256);assert(row.final.complete);assert.equal(row.nativeStorageOperations,0);
 assert.equal(row.nativeDrawAudit.rotated,0);assert.equal(row.settlement.earnedStars,r.caseName==='normal'?3:2);
 if(r.caseName==='late-no-external'){assert.deepEqual(row.actualRevealProof.remainingExternalIds,[]);assert.equal(row.actualRevealProof.cleared,13);assert.deepEqual(row.actualRevealProof.hidden.filter(b=>b.frozen).map(b=>b.frozen),[3,3]);}
 for(const[p,h]of Object.entries(r.bindings)){if(bindings[p])assert.equal(bindings[p],h);bindings[p]=h;}
 pointer.push({file,sha256:digest(fs.readFileSync(file)),viewport:r.viewport,caseName:r.caseName,moves:row.final.moves,elapsedSeconds:row.settlement.conditions.elapsedSeconds,earnedStars:row.settlement.earnedStars,reveal:row.actualRevealProof,complete:row.final.complete});
}
const postInputParallelSource=[];
for(const[p,h]of Object.entries(bindings)){
 const current=digest(fs.readFileSync(p));
 if(current!==h){assert.equal(p,'src/core/remake161to170.ts',`Unexpected final source drift ${p}`);postInputParallelSource.push({file:p,pointerSha256:h,currentSha256:current});}
}
const b=await build({stdin:{resolveDir:process.cwd(),contents:"export {LEVELS} from './src/core/levels.ts';"},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
const expected=structuredClone(baseline.priorLevels);expected[77]=candidate.level;
const postInputParallelIds=api.LEVELS.filter((l,i)=>digest(l)!==digest(expected[i])).map(l=>l.id);
assert(postInputParallelIds.every(id=>id>=161&&id<=170),'Only independently authorized later 161–170 maps may change after the input snapshot');
assert.equal(digest(api.LEVELS[77]),candidate.levelSha256);
const lock=verifyRulesLock();assert(lock.ok);
const result={status:'PASS',createdAt:new Date().toISOString(),taskRuleVersion:'1.104.0',activeRuleVersion:lock.activeVersion,levelSha256:candidate.levelSha256,candidateFile,baselineFile,proofFile,reviewFile,lowerBound:16,upperBound:18,minimumClaim:false,mainDragCount:37,strictLateDragCount:46,other199PreservedByThisRepair:true,postInputParallelSource,postInputParallelIds,postInputParallelScope:'Preserve separately authorized 161–170 data adoption after completed Pointer snapshots. Exact 78 object, runtime, renderer and all other source bindings remain identical; old input evidence is unchanged.',tests:{file:root+'/tests.json',passed:tests.numPassedTests,failed:0},typecheck,hiddenSafetyScope:'All reachable states of the six-piece revealed cargo with no exterior pieces, thawed gates, and initial hidden ice 2 or 3; no universal whole-campaign deadlock assertion.',pointer,playerSaveTouched:false,packageRebuilt:false,published:false,independentCompletionReviewPending:true};
const output=root+'/complete.json';fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,status:result.status,pointer:pointer.map(({caseName,viewport,moves,elapsedSeconds,earnedStars})=>({caseName,viewport,moves,elapsedSeconds,earnedStars})),tests:result.tests}));
