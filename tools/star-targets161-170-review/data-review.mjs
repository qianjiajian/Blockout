import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
import {loadApi,replay} from '../remake161-170/replay.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';

const ROOT='deliverables/star-targets161-170-20260927';
const OUT=ROOT+'/review';
const sha=digest;
const read=p=>JSON.parse(fs.readFileSync(p));
const clean=x=>JSON.parse(JSON.stringify(x));
const hashFile=p=>sha(fs.readFileSync(p));
const walk=p=>fs.readdirSync(p,{withFileTypes:true}).flatMap(d=>d.isDirectory()?walk(p+'/'+d.name):[p+'/'+d.name]);
const lock=verifyRulesLock();assert(lock.ok,lock.errors.join('\n'));assert(lock.verified.some(v=>v.version==='1.109.0'));
const beforeFile=ROOT+'/before.json',appliedFile=ROOT+'/applied.json',witnessFile=ROOT+'/route-witnesses.json';
const before=read(beforeFile),applied=read(appliedFile),witness=read(witnessFile),oldWitness=read(ROOT+'/route-witnesses-before.json');
const priorLevels=before.levels.map(r=>r.level);
const ids=[161,167,168,170],targets={161:43,167:50,168:63,170:37};
assert.deepEqual(before.ids,ids);assert.deepEqual(before.targets,targets);assert.deepEqual(applied.ids,ids);assert.deepEqual(applied.targets,targets);assert.equal(applied.ruleVersion,'1.109.0');
const fixture=read(before.fixture);assert.equal(hashFile(before.fixture),before.fixtureSha256);assert.equal(sha(before.sourceText),applied.beforeSha256);
console.log('Loading current model and formal levels');
const loaded=await loadApi(),api=loaded.api;
const built=await build({stdin:{resolveDir:process.cwd(),contents:"export {evaluateLevelStars} from './src/core/levelStarConditions.ts';"},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const stars=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const actual=clean(api.LEVELS),expected=clean(priorLevels);
assert.equal(actual.length,200);assert.equal(expected.length,200);
for(const id of ids){assert.equal(expected[id-1].preservedMoveTarget,undefined);expected[id-1].preservedMoveTarget=targets[id];}
assert.equal(sha(expected),applied.campaignSha256,'Reconstructed exact application-time 200-level digest');
const parallel=[];
for(const [id,from,to]of[[157,42,47],[158,40,59]])if(sha(actual[id-1])!==sha(expected[id-1])){assert(lock.verified.some(v=>v.version==='1.110.0'));assert.equal(expected[id-1].preservedMoveTarget,from);expected[id-1].preservedMoveTarget=to;parallel.push({id,field:'preservedMoveTarget',from,to,ruleVersion:'1.110.0'});}
for(let i=0;i<200;i++)assert.equal(sha(actual[i]),sha(expected[i]),'Only authorized fields may change: level '+(i+1));
console.log('All 200 objects and parallel scope matched');
let exactSource=before.sourceText;
for(const id of ids){const old=priorLevels[id-1];const oldTail='"parMoves": '+old.parMoves+'\n  }';const first='"id": '+id+',';const begin=exactSource.indexOf(first),end=exactSource.indexOf(oldTail,begin);assert(begin>=0&&end>begin);exactSource=exactSource.slice(0,end)+exactSource.slice(end).replace(oldTail,'"parMoves": '+old.parMoves+',\n    "preservedMoveTarget": '+targets[id]+'\n  }');}
assert.equal(fs.readFileSync(before.sourceFile,'utf8'),exactSource,'Exact four-property textual source delta');assert.equal(hashFile(before.sourceFile),applied.afterSha256);
const sourceChanges=[];
assert.deepEqual(walk('src').sort(),Object.keys(before.inputs).sort(),'No production files added or removed');
for(const [p,h]of Object.entries(before.inputs)){const now=hashFile(p);if(h!==now)sourceChanges.push({file:p,before:h,after:now});}
const parallelSource='src/core/remake151to160.ts';
assert.deepEqual(sourceChanges.map(r=>r.file).sort(),[before.sourceFile,...(parallel.length?[parallelSource]:[])].sort());
if(parallel.length){const p=read('deliverables/star-targets151-160-20260927/before.json'),a=read('deliverables/star-targets151-160-20260927/applied.json');assert.equal(sha(p.moduleRaw),before.inputs[parallelSource]);let t=p.moduleRaw;for(const e of [...a.edits].sort((x,y)=>y.start-x.start)){assert.equal(t.slice(e.start,e.end),e.old);t=t.slice(0,e.start)+e.next+t.slice(e.end);}assert.equal(t,fs.readFileSync(parallelSource,'utf8'));assert.equal(sha(t),a.moduleAfterSha256);assert.deepEqual(a.edits.map(e=>({id:e.id,old:Number(e.old),next:Number(e.next)})),[{id:157,old:42,next:47},{id:158,old:40,next:59}]);}
const rows=[];assert.equal(fixture.rows.length,10);assert.equal(witness.rows.length,10);assert.equal(oldWitness.rows.length,10);
for(const f of fixture.rows){
 const id=f.id,current=actual[id-1],prior=priorLevels[id-1],w=witness.rows.find(r=>r.id===id),old=oldWitness.rows.find(r=>r.id===id);
 assert.deepEqual(prior,f.level);assert.deepEqual(old.level,f.level);assert.deepEqual(old.drags,f.drags);assert.deepEqual(w.drags,f.drags);assert.deepEqual(w.level,current);
 const rawCurrent=api.LEVELS[id-1],result=replay(rawCurrent,f.drags,api,{complete:true,requirePointerCompatible:true});console.log('Canonical route complete: '+id);
 assert.equal(result.nonClearingDrags,f.upperBound);assert.equal(result.effectiveDrags,f.drags.length);assert.equal(result.routeSha256,w.routeSha256);
 const oldScore=api.levelStarTargets(prior),newScore=api.levelStarTargets(rawCurrent);
 assert.equal(newScore.timeTargetSeconds,oldScore.timeTargetSeconds);assert.equal(current.timeSeconds,prior.timeSeconds);assert.equal(current.parMoves,prior.parMoves);assert.equal(current.reward,prior.reward);
 assert.equal(newScore.moveTarget,targets[id]??oldScore.moveTarget);assert(result.effectiveDrags<=newScore.moveTarget);
 const boundary=[[newScore.moveTarget,newScore.timeTargetSeconds,3],[newScore.moveTarget+1,newScore.timeTargetSeconds,2],[newScore.moveTarget,newScore.timeTargetSeconds+.001,2],[newScore.moveTarget+1,newScore.timeTargetSeconds+.001,1]].map(([moves,elapsedSeconds,expectedStars])=>{const evaluation=stars.evaluateLevelStars(rawCurrent,{moves,elapsedSeconds});assert.equal(evaluation.earnedStars,expectedStars);return{moves,elapsedSeconds,expectedStars,evaluation};});
 const ap=applied.rows.find(r=>r.id===id);assert.deepEqual(ap.starTargets,newScore);assert.equal(ap.currentLevelSha256,sha(current));assert.equal(ap.totalDrags,result.effectiveDrags);assert.equal(ap.nonClearingDrags,result.nonClearingDrags);
 rows.push({id,oldScore,newScore,totalDrags:result.effectiveDrags,nonClearingDrags:result.nonClearingDrags,recordedLowerBound:f.lowerBound,canonicalCompleteRoute:true,lowerBoundsRecomputed:false,routeSha256:sha(f.drags),currentLevelSha256:sha(current),priorLevelSha256:sha(prior),boundary});
}
// Old certificate, source candidates, lower proofs and old Pointer reports remain historical.
const oldRoot='deliverables/remake161-170-20260927';
const integration=read(oldRoot+'/assist-final-review/integration-1790520023904.json'),preserved=[];
const check=(p,h)=>{assert.equal(hashFile(p),h,'Historical evidence changed: '+p);preserved.push({file:p,sha256:h});};
for(const r of integration.rows){check(r.readyFile,r.readySha256);check(r.candidateFile,r.candidateSha256);for(const ref of r.refs)check(ref.file,ref.sha256);}
for(const r of integration.adoptions){check(r.beforeFile,r.beforeSha256);check(r.resultFile,r.resultSha256);}
for(const r of integration.pointer)check(r.file,r.sha256);
const certificateFile=oldRoot+'/formal-verified-1790519925923.json',certificate=read(certificateFile);assert.equal(certificate.rows.length,10);
for(const r of certificate.rows){const f=fixture.rows.find(x=>x.id===r.id);assert.equal(r.levelSha256,sha(f.level));assert.equal(r.U,f.upperBound);assert.equal(r.L,f.lowerBound);}
const inputs=Object.fromEntries([beforeFile,appliedFile,witnessFile,ROOT+'/route-witnesses-before.json',before.fixture,certificateFile,oldRoot+'/assist-final-review/integration-1790520023904.json',...Object.keys(before.inputs),'tools/remake161-170/replay.mjs','src/core/levelStarConditions.ts'].map(p=>[p,hashFile(p)]));
const report={status:'INDEPENDENT_SCORE_DATA_REVIEW_PASS',createdAt:new Date().toISOString(),ruleVersion:'1.109.0',activeRuleVersion:lock.activeVersion,scope:ids,targets,all200ExactExpected:true,other196PreservedByThisBatch:true,parallelChangesSeparatelyVerified:parallel,allGeometryMechanismsTimingRewardParPreserved:true,onlyFourPropertiesAdded:'preservedMoveTarget',exactSourceTextDelta:true,productionSourceChanges:sourceChanges,tenCompleteCanonicalRoutes:true,rows,historicalEvidencePreserved:preserved,historicalEvidenceCount:preserved.length,oldFixtureUnchanged:true,oldCertificateUnchangedContent:true,lowerBoundsRecomputed:false,pointerReviewPending:true,findings:[],inputs};
fs.mkdirSync(OUT,{recursive:true});const output=OUT+'/data-review-'+Date.now()+'.json';fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({output,status:report.status,rows:rows.map(r=>({id:r.id,target:r.newScore.moveTarget,time:r.newScore.timeTargetSeconds,drags:r.totalDrags})),historicalEvidenceCount:preserved.length}));
