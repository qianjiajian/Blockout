import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {ROOT,digest,ruleGate,writeNew,auditSpatial} from './common.mjs';
import {loadApi,replay} from './replay.mjs';
import {sourceAdaptation} from './author185/enrich.mjs';
import {replayTiming} from './observed-timing.mjs';
import {search} from '../campaign-v145/lv131-140/agent139-140/axis128-graph.mjs';
import {inspectDisjointData} from '../remake91to100-data-drift.mjs';

const file=ROOT+'/author185/enriched-1790524540984.json';
const reviewFile=ROOT+'/review/candidate185-1790524663247.json';
const d=JSON.parse(fs.readFileSync(file)),review=JSON.parse(fs.readFileSync(reviewFile));
const lock=ruleGate(),{api,inputs}=await loadApi();
assert.equal(review.status,'PASS_GAMEPLAY_REVIEW_SOURCE_INITIAL_PHASE_ADAPTER_PENDING');
assert.equal(digest(d.level),review.levelSha256);assert.equal(digest(d.drags),review.routeSha256);
for(const [p,h]of Object.entries(review.bindings))assert.equal(digest(fs.readFileSync(p)),h,'Review binding '+p);
const spatial=auditSpatial(d.level,api),source=sourceAdaptation(d.level);
assert.deepEqual(source,d.sourceAdaptation);
const route=replay(d.level,d.drags,api,{complete:true,requirePointerCompatible:true});
assert.equal(route.nonClearingDrags,19);assert.equal(route.effectiveDrags,50);
const projected={...structuredClone(d.level),gates:[...d.level.gates,...d.level.flipDoors.map(({initiallyOpen,...g})=>g)],flipDoors:[]};
assert.deepEqual(projected,d.projected);projected.mechanismRules='revised-2026-09-23-v1.4';
const lower=search(projected,{prove:true,floor:16,goalClears:14,maxStates:200000,maxMilliseconds:10000});
assert(lower.thresholdProven);
const pointer=[];
for(const name of ['pointer-1790524439458-320x568-3248','pointer-1790524439380-496x1078-63916']){
 const dir=ROOT+'/'+name,reportFile=dir+'/report.json',report=JSON.parse(fs.readFileSync(reportFile));
 const row=report.rows.find(r=>r.id===185);assert.equal(report.status,'PASS');assert(report.candidateOnly&&!report.formalDataValidated);
 assert.deepEqual(report.errors,[]);assert(report.naturalClock&&!report.clockFrozen&&!report.playerSaveTouched);
 assert.equal(row.levelSha256,digest(d.level));assert.equal(row.routeSha256,digest(d.drags));
 const continuity=[];
 for(const [p,h]of Object.entries(report.bindings)){
  const old=fs.readFileSync(path.join(report.sourceSnapshot,p));assert.equal(digest(old),h);
  if(digest(fs.readFileSync(p))===h)continue;
  assert(/^src\/core\/(remake\d+to\d+|nativeRemake31to40)\.ts$/.test(p),'Unreviewed Pointer drift '+p);
  continuity.push(inspectDisjointData(p,[185],old.toString('utf8')));
 }
 const timingFile=dir+'/lv185-observed-timing.json';
 const timing=replayTiming(d.level,JSON.parse(fs.readFileSync(timingFile)),api);
 assert(row.final.complete&&!row.final.failed&&row.final.remainingSeconds>0);
 assert.equal(row.final.moves,50);assert.equal(row.nativeDrawAudit.rotated,0);assert.equal(row.nativeDrawAudit.canvasRotationCalls,0);
 assert.equal(row.storage.backend,'MemoryHost');
 pointer.push({reportFile,sha256:digest(fs.readFileSync(reportFile)),viewport:report.viewport,timingFile,timing,continuity,remainingSeconds:row.final.remainingSeconds});
}
const out=ROOT+'/candidate185-root-'+Date.now()+'.json';
writeNew(out,{createdAt:new Date().toISOString(),ruleVersion:lock.activeVersion,status:'ALL_CANDIDATE_GAMEPLAY_CHECKS_PASS_SOURCE_ADAPTER_APPROVAL_PENDING',id:185,file,candidateSha256:digest(fs.readFileSync(file)),levelSha256:digest(d.level),routeSha256:digest(d.drags),reviewFile,reviewSha256:digest(fs.readFileSync(reviewFile)),L:16,U:19,drags:50,spatial,source,route,lower,pointer,sourceValidated:false,lowerBoundCertified:true,candidatePointerValidated:true,formalAdopted:false,pendingFields:{'orange.initiallyOpen':false,'blue.initiallyOpen':false},oldScore:api.levelStarTargets(d.level),guaranteedMinimumDrags:47,oldMoveStarImpossible:true,bindings:Object.fromEntries([...new Set([...inputs,file,reviewFile,...Object.keys(review.bindings),'tools/remake182-185-20260927/candidate185-root.mjs'])].map(p=>[p,digest(fs.readFileSync(p))]))});
console.log(JSON.stringify({out,status:'CANDIDATE_VALIDATED_APPROVAL_PENDING',L:16,U:19,drags:50}));
