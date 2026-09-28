import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {checkCandidate,loadApi,BASELINE,ruleGate,OUTPUT} from './remake88-direct-v157.mjs';
import {digest} from './revised-preview-validation-v160.mjs';

const [candidate,installedFile,reviewFile,...pointerFiles]=process.argv.slice(2);
assert.equal(pointerFiles.length,2);
const read=file=>JSON.parse(fs.readFileSync(file));
const installed=read(installedFile),data=read(candidate),review=read(reviewFile);
assert.equal(installed.candidate,candidate);
assert.equal(installed.status,'installed-awaiting-formal-pointer');
assert(installed.other199Unchanged&&installed.protected1to30Unchanged);
const {api}=await loadApi(),check=await checkCandidate(data,read(BASELINE),api);
assert.deepEqual(api.LEVELS[87],data.level);
assert.equal(review.status,'PASS_DIRECT_ADOPTION_CANDIDATE_REVIEW');
assert.equal(review.candidateFileSha256,digest(fs.readFileSync(candidate)));
assert.equal(review.levelSha256,digest(data.level));
assert.equal(review.routeSha256,digest(data.drags));
assert.deepEqual(review.inputDrift,[]);

const pointers=pointerFiles.map(file=>{
 const p=read(file);
 assert.equal(p.status,'PASS');assert.equal(p.candidateOnly,false);assert.equal(p.formalDataValidated,true);
 assert(p.naturalClock&&!p.clockFrozen&&!p.playerSaveTouched);
 assert.deepEqual(p.errors,[]);assert.deepEqual(p.drift,[]);assert.deepEqual(p.sourceEvidenceDrift,[]);
 assert.deepEqual(p.currentWorkspaceDrift,[]);
 const row=p.rows.find(r=>r.id===88);
 assert.equal(row?.status,'PASS');assert.equal(row.candidateOverlay,false);assert.equal(row.formalObjectIdentity,true);
 assert.equal(row.levelSha256,digest(data.level));assert.equal(row.routeSha256,digest(data.drags));
 assert.equal(row.lowerBound,null);assert.equal(row.lowerBoundValidated,false);assert.equal(row.difficultyCertified,false);
 assert.equal(row.nonClearingDrags,17);assert.equal(row.final.moves,54);assert(row.final.complete&&!row.final.failed&&row.final.remainingSeconds>0);
 assert.equal(row.nativeDrawAudit.rotated,0);assert.equal(row.nativeDrawAudit.canvasRotationCalls,0);
 for(const [f,h]of Object.entries(p.sourceBindings))assert.equal(digest(fs.readFileSync(f)),h,`Pointer source drift: ${f}`);
 const concurrentDataChanges=[];
 for(const [f,h]of Object.entries(p.bindings)){
  assert.equal(digest(fs.readFileSync(path.join(p.sourceSnapshot,f))),h,`Pointer snapshot drift: ${f}`);
  const current=digest(fs.readFileSync(f));
  if(current!==h){assert.equal(f,'src/core/remake101to110.ts',`Pointer dependency drift: ${f}`);concurrentDataChanges.push({file:f,atPointer:h,current});}
 }
 const screenshots=['opening','complete'].map(name=>{const f=file.replace('report.json',`lv88-${name}.png`);return{file:f,sha256:digest(fs.readFileSync(f))};});
 return{file,sha256:digest(fs.readFileSync(file)),viewport:p.viewport,remainingSeconds:row.final.remainingSeconds,drags:54,nonClearingDrags:17,complete:true,formalDataValidated:true,naturalClock:true,screenshots,concurrentDataChanges};
});
assert.deepEqual(pointers.map(p=>p.viewport.width).sort((a,b)=>a-b),[320,496]);
const before=read(installed.beforeFile);
const parallelIds=api.LEVELS.filter(l=>l.id!==88&&digest(l)!==digest(before.levels[l.id-1])).map(l=>l.id);
assert.deepEqual(parallelIds,[102,109]);
assert.equal(digest(api.LEVELS[101]),'fc882d6b835fae8660c80892fa9e6a4731adb6218d1f8aced4a7e10e829e93cc');
assert.equal(digest(api.LEVELS[108]),'06cf62ddca3b3c5e4e21998030d322ed0d31889ad909485639c9712419fa070c');
assert.equal(digest(api.LEVELS.filter(l=>![88,102,109].includes(l.id))),digest(before.levels.filter(l=>![88,102,109].includes(l.id))));
assert.equal(digest(api.LEVELS.slice(0,30)),before.protected1to30Sha256);
const fixtureFile='tests/fixtures/remake81to90-v146.json',fixture=read(fixtureFile);
assert.equal(api.LEVELS.length,200);
assert.deepEqual(fixture.rows.map(r=>r.id),[81,82,83,84,85,86,87,88,89,90]);
assert.deepEqual(fixture.rows.filter(r=>r.lowerBound===null).map(r=>r.id),[88,90]);
assert.deepEqual(fixture.rows.filter(r=>r.id!==88),JSON.parse(before.bytes[fixtureFile]).rows);
const batchRows=fixture.rows.map(row=>{
 assert.deepEqual(api.LEVELS[row.id-1],row.level);
 const replay=api.replayRevisedRoute(api.LEVELS[row.id-1],row.drags);
 assert(replay.valid&&replay.complete,replay.error);assert.equal(replay.nonClearingDrags,row.upperBound);
 if(row.lowerBound===null){assert.equal(row.lowerBoundValidated,false);assert.equal(row.adoptionBasis,'USER_DIRECT_WRITE_LOWER_BOUND_UNVERIFIED');}
 return{id:row.id,formal:true,levelSha256:digest(row.level),routeSha256:digest(row.drags),drags:row.drags.length,lowerBound:row.lowerBound,upperBound:row.upperBound,complete:true,lowerBoundValidated:row.lowerBound!==null,adoptionBasis:row.adoptionBasis??'PREVIOUSLY_CERTIFIED',priorLowerBoundEvidencePreserved:true,freshLowerBoundSearchThisCall:false};
});
const record={createdAt:new Date().toISOString(),activeRuleVersion:ruleGate().activeVersion,status:'FORMAL_ADOPTION_COMPLETE',candidate,installedFile,independentReview:{file:reviewFile,sha256:digest(fs.readFileSync(reviewFile))},levelSha256:digest(data.level),routeSha256:digest(data.drags),lowerBound:null,upperBound:17,lowerBoundValidated:false,difficultyCertified:false,partialHistoricalLowerBound:6,targetLowerBound:15,targetLowerBoundStatus:'UNKNOWN',adoptionBasis:'USER_DIRECT_WRITE_LOWER_BOUND_UNVERIFIED',preflightCheck:check,pointers,formalBatchIds:batchRows.map(r=>r.id),batchRows,other199PreservedAtInstallation:true,currentOther199ChangedIds:parallelIds,parallelChangesVerifiedAgainstV156:true,other197Preserved:true,protected1to30Preserved:true,priorNineFixtureRowsUnchanged:true,originalMoveStarTarget:51,originalTimeStarTarget:129,observedRouteStars:2,testsRecordedSeparately:true,humanBlindTested:false,playerSaveTouched:false,released:false};
const output=`${OUTPUT}/formal-adoption-${Date.now()}.json`;
fs.writeFileSync(output,JSON.stringify(record,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,status:record.status,formalBatchIds:record.formalBatchIds,uncertifiedLowerBoundIds:batchRows.filter(r=>!r.lowerBoundValidated).map(r=>r.id),other199PreservedAtInstallation:true,currentOther199ChangedIds:parallelIds}));
