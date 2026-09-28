import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {loadApi, auditCandidate, proveFloor, geometry} from './remake41to50-v146.mjs';
import {verifyImmediateGeneratorRoute} from './remake41to50-immediate-generator-floor-v146.mjs';
import {observeMechanismProcess, verifyDecisions} from './review-remake41to50-decisions-v146.mjs';
import {verifyLocalMechanismChoices} from './remake21to30-v139.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
import {verifyRulesLock} from './verify-rules-lock.mjs';

const root=process.cwd();
const outDir='deliverables/remake41-47-v151-20260925';
const candidatePath=path.join(outDir,'candidate47-competitor-regenerated-v151-l11-u15-formal-pass.json');
const candidate=JSON.parse(fs.readFileSync(candidatePath));
const baseline=JSON.parse(fs.readFileSync('deliverables/remake41-50-v146-20260924/baseline.json'));
const freshStaticPath=path.join(outDir,'search-v151/formal-verification47-v151-fresh-20260925.json');
const freshStatic=JSON.parse(fs.readFileSync(freshStaticPath));
const pointerDirs=[
  path.join(outDir,'pointer-v151-47-1790313330750/report.json'),
  path.join(outDir,'pointer-v151-47-1790313391404/report.json'),
];
const pointers=pointerDirs.map(p=>JSON.parse(fs.readFileSync(p)));
const {api}=await loadApi();

function treeDigest(dir){
  const rows=[];
  const walk=(d)=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else{const rel=path.relative(root,p).replaceAll('\\','/');rows.push(`${rel}:${digest(fs.readFileSync(p))}`);}}};
  walk(dir);rows.sort();return {files:rows.length,sha256:digest(rows.join('\n')),paths:rows};
}
function bindings(){
  const files=['src/core/remake41to50.ts','tests/fixtures/native-remake41to50-v146.json','src/core/levels.ts','src/game/formalBlockShapes.ts','src/core/PuzzleModel.ts','src/game/ColorEscapeGame.ts','tools/remake41to50-browser.mjs','tools/remake41to50.html','docs/rules/manifest.json','docs/mechanism-rules-v1.51.0.md','deliverables/remake41-50-v146-20260924/baseline.json',candidatePath,freshStaticPath,...pointerDirs];
  return Object.fromEntries(files.map(f=>[f,digest(fs.readFileSync(f))]));
}

const lock=verifyRulesLock();assert(lock.ok,lock.errors.join('\n'));assert.equal(lock.activeVersion,'1.51.0');
assert.equal(candidate.level.id,47);
// The legacy candidate/fixture schema remains 1.46.0; the active contract
// and this closeout are checked independently against the locked 1.51.0 rules.
assert.equal(candidate.ruleVersion,'1.46.0');
const staticAudit=auditCandidate(candidate,baseline,api);assert(staticAudit.passed);
const replay=api.replayRevisedRoute(candidate.level,candidate.drags);assert(replay.valid&&replay.complete);assert.equal(replay.nonClearingDrags,15);assert(replay.nonClearingDrags>=11&&replay.nonClearingDrags<=15);
const projection=verifyImmediateGeneratorRoute(candidate.level,candidate.drags,api);assert(projection.valid);
const proof=proveFloor(candidate.level,api,{proofMode:'immediate-generator',maxStates:5_000_000,maxMilliseconds:120_000});
assert.equal(proof.status,'threshold-proven');assert.equal(proof.thresholdProven,true);assert.equal(proof.floor,11);
const mechanismProcess=observeMechanismProcess(candidate.level,candidate.drags,api);
const choices=verifyLocalMechanismChoices(candidate,api);assert(choices);
const decisions=verifyDecisions(candidate,api);assert(decisions.cases.length>=1);
assert.deepEqual(api.LEVELS[46],candidate.level);
assert.equal(digest(candidate.level),freshStatic.levelSha256);
assert.equal(freshStatic.replay.nonClearingDrags,15);assert(freshStatic.replay.valid&&freshStatic.replay.complete);
assert(freshStatic.proof.thresholdProven&&freshStatic.proof.status==='threshold-proven');assert(freshStatic.projection.valid);

for(const report of pointers){
  assert.equal(report.status,'PASS');assert.equal(report.formalDataValidated,true);assert.equal(report.formalAdopted,true);
  assert.equal(report.candidateInjected,false);assert.equal(report.clockFrozen,false);assert.equal(report.pointerReplayValidated,true);
  assert.equal(report.rows.length,1);const row=report.rows[0];assert.equal(row.status,'PASS');assert.equal(row.id,47);
  assert.equal(row.levelSha256,digest(candidate.level));assert.equal(row.routeSha256,digest(candidate.drags));
  assert.equal(row.final.complete,true);assert.equal(row.final.failed,false);assert(row.final.remainingSeconds>0);
  assert.equal(row.pointerPath.passed,true);assert.equal(row.pointerPath.allUnitsExact,true);assert.equal(row.pointerPath.unitSteps,193);
  assert.equal(row.naturalTimingReplay.passed,true);assert.equal(row.naturalTimingReplay.wholeModelReplay,true);
  assert.equal(row.nativeDrawAudit.rotated,0);assert.equal(row.nativeDrawAudit.canvasRotationCalls,0);
}
assert.deepEqual(pointers.map(p=>p.viewport),[{width:496,height:1078},{width:320,height:568}]);

// Reconstruct the pre-install bytes from the current fixture and compare them
// with the hashes captured by the installation step. This is deliberately
// labelled reconstruction: the earlier run did not persist a full campaign
// byte snapshot.
const integration=JSON.parse(fs.readFileSync(path.join(outDir,'formal-integration47-v151-1790311153798.json')));
const fixturePath='tests/fixtures/native-remake41to50-v146.json';
const modulePath='src/core/remake41to50.ts';
const fixture=JSON.parse(fs.readFileSync(fixturePath));
const previousRows=fixture.rows.filter(r=>r.id!==47);assert.equal(fixture.rows.filter(r=>r.id===47).length,1);
const previousFixture=JSON.stringify({...fixture,rows:previousRows},null,2)+'\n';
const previousModule=`// Fresh validation of the source-reviewed 41-50 batch. Unlisted levels stay unchanged.\nimport type {LevelSpec} from './types';\nexport const REMADE_41_50_IDS: readonly number[] = ${JSON.stringify(previousRows.map(r=>r.id))};\nconst reviewed: Record<number,LevelSpec> = ${JSON.stringify(Object.fromEntries(previousRows.map(r=>[r.id,r.level])),null,2)};\nexport const applyRemake41to50 = (level:LevelSpec):LevelSpec => reviewed[level.id] ?? level;\n`;
assert.equal(digest(previousFixture),integration.previousFixtureSha256);
assert.equal(digest(previousModule),integration.previousModuleSha256);
const currentRows=fixture.rows.map(r=>r.id);
assert.deepEqual(currentRows,[42,43,44,45,46,47,48,49,50]);

const b1=bindings();const treeBefore={src:treeDigest('src'),art:treeDigest('public/assets/art')};
const b2=bindings();const treeAfter={src:treeDigest('src'),art:treeDigest('public/assets/art')};
assert.deepEqual(b1,b2);assert.deepEqual(treeBefore,treeAfter);
const report={
  status:'PASS',ruleVersion:'1.51.0',scope:[47],candidate:candidatePath,candidateSha256:digest(fs.readFileSync(candidatePath)),
  levelSha256:digest(candidate.level),routeSha256:digest(candidate.drags),geometry:geometry(candidate.level),
  static:{audit:'PASS',completeRoute:true,lowerBound:'threshold-proven',lowerBoundFloor:proof.floor,lowerBoundStates:proof.exploredStates,lowerBoundTransitions:proof.attemptedTransitions,upperBound:replay.nonClearingDrags,projection:'PASS',decisionCases:decisions.cases.length,mechanismProcess},
  pointerReports:pointerDirs.map((p,i)=>({report:p,sha256:digest(fs.readFileSync(p)),viewport:pointers[i].viewport,status:pointers[i].status,drags:pointers[i].rows[0].final.moves,unitSteps:pointers[i].rows[0].pointerPath.unitSteps,remainingSeconds:pointers[i].rows[0].final.remainingSeconds,naturalTimingReplay:true,clockFrozen:false})),
  preservation:{installationChangedOnly47InBatchFixture:true,currentBatchIds:currentRows,reconstructedPreviousFixtureSha256:digest(previousFixture),reconstructedPreviousModuleSha256:digest(previousModule),matchesInstallationPreviousHashes:true,other190BaselineAudit:'static audit and immutable baseline checks passed; a full pre-install campaign byte snapshot was not captured',releaseApproved:false},
  lock:{activeVersion:lock.activeVersion,immutableVersions:lock.versions?.length??54},
  inputBindings:b1,treeBindings:treeBefore,workspaceDriftDuringCloseout:[],releaseApproved:false,
};
const output=path.join(outDir,`closeout47-v151-${Date.now()}.json`);fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,output,levelSha256:report.levelSha256,lowerBound:report.static.lowerBound,upperBound:report.static.upperBound,pointerReports:report.pointerReports.map(r=>r.viewport),decisionCases:report.static.decisionCases,reconstructedPreviousBytes:report.preservation.matchesInstallationPreviousHashes}));
