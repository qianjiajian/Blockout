import fs from 'node:fs';
import assert from 'node:assert/strict';
import {ROOT,IDS,TARGETS,ruleGate,digest,writeNew} from './common.mjs';
import {loadApi} from './replay.mjs';

// Consolidates already completed validations; does not mutate production data
// or replace any historical proof, report, or frozen rule document.
const lock=ruleGate(),{api}=await loadApi();
const read=p=>JSON.parse(fs.readFileSync(p));
const formalPath=ROOT+'/formal-verified-1790519925923.json';
const reviewPath=ROOT+'/assist-final-review/integration-1790520023904.json';
const formal=read(formalPath),review=read(reviewPath);
const supplementalPath=process.argv[2];
assert(supplementalPath,'170 supplemental review path required');
const supplemental=read(supplementalPath);
assert.equal(supplemental.passed,true);
assert.equal(supplemental.budget.floor,12);
assert.equal(supplemental.fresh.thresholdProven,true);
assert.equal(supplemental.levelSha256,digest(api.LEVELS[169]));
for(const ref of [supplemental.legacy,supplemental.qualification])assert.equal(digest(fs.readFileSync(ref.file)),ref.sha256);
assert.equal(formal.status,'FORMAL_TEN_COMPLETE');
assert.deepEqual(formal.ids,IDS);
assert.equal(review.status,'INDEPENDENT_INTEGRATION_REVIEW_PASS');
assert.deepEqual(review.findings,[]);
for(const [p,h] of Object.entries(review.bindings))assert.equal(digest(fs.readFileSync(p)),h,p);
const tests=read(ROOT+'/tests-final.json'),typecheck=read(ROOT+'/typecheck-final.json');
assert(tests.success&&tests.numTotalTests===39&&tests.numPassedTests===39);
assert.equal(typecheck.exitCode,0);assert(typecheck.afterFullTenAdopted);
const readyFiles=['root-ready-1790518003101.json','root-ready161-1790518491478.json','root-ready164-1790518900675.json','root-ready166-1790519667081.json','root-ready167-1790519744737.json'].map(p=>ROOT+'/'+p);
const readyRows=readyFiles.flatMap(p=>{const d=read(p);assert.equal(d.status,'READY_FOR_FORMAL_ADOPTION');return d.rows;});
assert.deepEqual(readyRows.map(r=>r.id).sort((a,b)=>a-b),IDS);
const rows=IDS.map(id=>{
 const l=api.LEVELS[id-1],f=formal.rows.find(r=>r.id===id),r=review.rows.find(r=>r.id===id),ready=readyRows.find(r=>r.id===id);
 assert.equal(digest(l),f.levelSha256);assert.equal(digest(l),r.levelSha256);
 assert.equal(f.L,ready.L);assert.equal(f.U,ready.U);assert.equal(f.drags,r.totalDrags);
 assert.equal(f.pointer.length,2);assert.deepEqual(f.score,api.levelStarTargets(l));
 return {id,difficulty:TARGETS[id].difficulty,L:f.L,U:f.U,totalDrags:f.drags,levelSha256:f.levelSha256,routeSha256:r.routeSha256,timeSeconds:l.timeSeconds,preservedStarTargets:f.score,witnessMoveStarMet:r.witnessMoveStarMet,visuallyObservedFinalStars:r.witnessMoveStarMet?3:2,naturalSeconds:f.pointer.map(p=>({viewport:p.viewport,seconds:p.timing.activeSeconds})),proof:r.readyFile,formalPointer:f.pointer.map(p=>p.report)};
});
const evidence=[formalPath,reviewPath,supplementalPath,ROOT+'/assist-final-review/source-additions-1790520068954.json',...readyFiles,ROOT+'/tests-final.json',ROOT+'/typecheck-final.json',ROOT+'/rules-final.txt',ROOT+'/source-continuity.json',ROOT+'/registration.json',ROOT+'/registration162.json',ROOT+'/rule-recovery.json',ROOT+'/README.md'];
for(const r of review.adoptions??[]){for(const v of Object.values(r))if(typeof v==='string'&&v.endsWith('.json')&&fs.existsSync(v))evidence.push(v);}
for(const r of rows)for(const p of r.formalPointer)evidence.push(p);
const evidenceHashes=Object.fromEntries([...new Set(evidence)].map(p=>[p,digest(fs.readFileSync(p))]));
const result={status:'FORMAL_TEN_COMPLETE_WITH_PRESERVED_SCORE_CAVEATS',createdAt:new Date().toISOString(),ruleVersion:lock.activeVersion,ruleVersionsVerified:lock.verified.length,scope:IDS,rows,formalValidation:formalPath,independentIntegrationReview:reviewPath,supplemental170Review:supplementalPath,supplemental170ReviewPassed:supplemental.passed,source162:'USER_ACCEPTED_AUTHORED_OPENING; pristine competitor state remains UNKNOWN_PRISTINE_OBSERVED_FIRST_FRAME_ONLY',scoreCaveats:{161:'31 clears + L11 >=42 exceeds preserved39; route43',167:'36 clears + L11 >=47 exceeds preserved43; route50',168:'Current route63 exceeds55; L21 +33 clears =54 does not prove55 impossible',170:'Formal certificate remainsL11/U15; independent supplementalL12 gives minimum34 above33; route37'},tests:{passed:39,total:39,typecheckExitCode:0},other190AtStageUnchanged:review.other190StageIdentityPreserved,parallel78And151StagesPreserved:review.parallel78And151StagesPreserved,evidenceHashes,currentReviewedBindings:review.bindings,limitations:['No human blind test or physical-phone test','No claim every reachable state is free of deadlock','No claim witness route is optimal','Displayed stars visually checked; saved bestStars payload not captured'],playerSaveTouched:false,packaged:false,published:false,outstandingRequiredGenerationWork:[]};
writeNew(ROOT+'/complete.json',result);
console.log(JSON.stringify({file:ROOT+'/complete.json',status:result.status,ids:IDS,tests:39,ruleVersion:lock.activeVersion}));
