import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {ROOT,writeNew,digest,ruleGate,auditSpatial} from './common.mjs';
import {loadApi,replay} from './replay.mjs';
import {replayTiming} from './observed-timing.mjs';
import {checkSymmetryFloor} from '../remake21to30-symmetry-floor-v139.mjs';
const candidate='deliverables/remake161-170-20260927/author161-163/reviewed162-1790516150230.json';
const d=JSON.parse(fs.readFileSync(candidate)),l=d.level,{api,inputs}=await loadApi();ruleGate();
assert.equal(digest(l),d.levelSha256);assert.equal(digest(d.drags),d.routeSha256);
const spatial=auditSpatial(l,api),route=replay(l,d.drags,api,{complete:true,requirePointerCompatible:true});
const projected=structuredClone(l);projected.mechanismRules='revised-2026-09-23-v1.4';
assert(l.flipDoors.every(g=>!g.frozen));
projected.gates.push(...projected.flipDoors.map(({initiallyOpen,...g})=>g));projected.flipDoors=[];
assert.deepEqual(projected,d.projection.level);
const floor=checkSymmetryFloor(projected,{floor:16,maxMilliseconds:5000,maxStates:150000});assert(floor.thresholdProven);assert(route.nonClearingDrags<=20);
const cases=d.decisions.map(c=>{const result=replay(l,c.fullRecoveredRoute,api,{complete:true,requirePointerCompatible:true,timed:true});assert.throws(()=>replay(l,[...d.drags.slice(0,c.atDrag-1),c.wrong,c.blockedNext],api,{requirePointerCompatible:true}));return{body:c.body,atDrag:c.atDrag,complete:result.complete,simulatedSeconds:result.simulatedSeconds};});assert(cases.length>=2);
const pointer=[];
for(const name of ['pointer-1790516139619-320x568-58720','pointer-1790516139607-496x1078-31236']){
 const file=ROOT+'/'+name+'/report.json',r=JSON.parse(fs.readFileSync(file)),row=r.rows[0];assert.equal(r.status,'PASS');assert(r.candidateOnly&&!r.formalDataValidated);assert.equal(row.levelSha256,digest(l));assert.equal(row.routeSha256,digest(d.drags));
 const observedPath=ROOT+'/'+name+'/lv162-observed-timing.json',log=JSON.parse(fs.readFileSync(observedPath));const timing=replayTiming(l,log,api);
 // A deliberately changed eligibility list must still fail after callback ID
 // namespace normalization; only per-model IDs are allowed to differ.
 const negative=structuredClone(log),event=negative.events.find(e=>Object.values(e.after?.pendingExitFlipDoorIds??{}).some(a=>a.length));assert(event);
 Object.values(event.after.pendingExitFlipDoorIds)[0].pop();assert.throws(()=>replayTiming(l,negative,api));
 assert.equal(row.final.moves,37);assert.equal(row.nonClearingDrags,20);assert(row.final.remainingSeconds>0&&row.final.complete);
 assert.equal(row.nativeDrawAudit.rotated,0);assert.equal(row.nativeDrawAudit.canvasRotationCalls,0);
 for(const [p,h]of Object.entries(r.bindings))assert.equal(digest(fs.readFileSync(path.join(r.sourceSnapshot,p))),h,p);
 pointer.push({file,sha256:digest(fs.readFileSync(file)),viewport:r.viewport,timing,eligibilityNegativeControlPassed:true,remainingSeconds:row.final.remainingSeconds});
}
const report={ruleVersion:ruleGate().activeVersion,checkedAt:new Date().toISOString(),candidate,candidateSha256:digest(fs.readFileSync(candidate)),levelSha256:digest(l),routeSha256:digest(d.drags),candidateTechnicalValidation:'PASS',spatial,floor,U:route.nonClearingDrags,drags:route.effectiveDrags,cases,pointer,sourceStatus:d.sourceOpeningStatus,sourceAcceptance:'PENDING_USER_REPLY',formalAdopted:false,releaseApproved:false,bindings:Object.fromEntries(inputs.map(p=>[p,digest(fs.readFileSync(p))]))};
const out=ROOT+'/root-review162-'+Date.now()+'.json';writeNew(out,report);console.log(JSON.stringify({out,technical:'PASS',L:16,U:20,drags:37,source:report.sourceStatus,formal:false}));
