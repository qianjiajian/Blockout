import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi} from '../native-block-repair-v143.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
import {auditLv70Static,preserveOther199} from './validation-contract.mjs';
import {replayObservedModelTiming} from '../revised-model-timing-observer.mjs';
const root='deliverables/lv70-remake-20260927/',read=p=>JSON.parse(fs.readFileSync(p));
const lock=verifyRulesLock();assert(lock.ok);assert.equal(lock.activeVersion,'1.95.0');
const files={
 candidate:root+'design-strengthen-1790509714045/candidate-0.json',
 floor:root+'validation-formal-raw-floor-screen-1790510160247.json',
 qualification:root+'validation-qualification-1790510151334.json',
 static:root+'validation-formal-static-1790510150670.json',
 source:root+'source-strengthened-review-1790509969324.json',
 preservation:root+'design-formal-review-1790510305108.json',
 checks:root+'root-checks-1790510264855.json',
 small:root+'validation-pointer-formal-320-1790510171316/report.json',
 large:root+'validation-pointer-formal-496-1790510171310/report.json',
};
const {api,inputs}=await loadApi(),d=read(files.candidate),level=api.LEVELS[69],baseline=read(root+'baseline.json');
assert.deepEqual(JSON.parse(JSON.stringify(level)),d.level);
const data=Object.fromEntries(Object.entries(files).map(([k,p])=>[k,read(p)]));
const rechecked=[];
for(const k of ['floor','qualification','static','checks','small','large']){
 const r=data[k];assert(r.status==='PASS'||r.status==='FLOOR_PASS'||r.status==='STATIC_AND_ROUTE_PASS_NOT_DIFFICULTY_CERTIFIED',k+': '+r.status);
 assert.deepEqual(r.sourceDrift??r.drift,[],k+' source drift');
 for(const[p,h]of Object.entries(r.bindings??{}))assert.equal(digest(fs.readFileSync(p)),h,k+': '+p);
 rechecked.push(k);
}
assert.equal(data.floor.formalSourceObjectUsed,true);assert.equal(data.floor.requestedFloor,11);assert(data.floor.floor.thresholdProven);
assert.equal(data.qualification.tests.exitCode,0);
assert.equal(data.preservation.status,'FORMAL_LV70_AND_OTHER_199_PRESERVATION_PASS');
assert.equal(data.source.status,'PASS_INDEPENDENT_SOURCE_STATIC_ROUTE_AND_ONE_UNAVOIDABLE_GENERATED_V2_PARK');
assert.equal(data.source.necessaryGeneratedParking.totalClearCapacityWithoutYellowV2Parking,16);
assert.equal(data.source.necessaryGeneratedParking.yellowThreshold,17);
assert.equal(data.source.levelSha256,digest(d.level));
const oldSourceDrift=[];
for(const[p,h]of Object.entries(data.source.bindings))if(digest(fs.readFileSync(p))!==h)oldSourceDrift.push(p);
assert.deepEqual(oldSourceDrift,['src/core/levels.ts'],'Only the verified final integration may differ from the candidate-stage source proof');
const current=auditLv70Static(level,d.drags,baseline,api),other199=preserveOther199(api.LEVELS,baseline);
const pointer=[];
for(const k of ['small','large']){
 const r=data[k];assert.equal(r.mode,'formal');assert.equal(r.candidate,files.candidate);assert.equal(r.finalIdentity.formalObjectIdentity,true);assert.equal(r.finalIdentity.candidateInjected,false);
 assert.equal(r.nonClearingDrags,15);assert.equal(r.final.moves,51);assert.equal(r.settlement.earnedStars,3);assert.equal(r.nativeDrawAudit.rotated,0);assert.deepEqual(r.storageViolations,[]);
 const timingFile=files[k].replace(/report\.json$/,'observed-timing.json');
 const timing=replayObservedModelTiming(level,read(timingFile),api);
 pointer.push({file:files[k],viewport:r.viewport,remaining:r.final.remainingSeconds,totalDrags:51,nonClearingDrags:15,stars:3,naturalTimingReplay:timing});
}
const bindings=Object.fromEntries([...inputs,...Object.values(files),'tools/lv70-remake-20260927/root-complete.mjs','tests/level70GeneratorRemake.test.ts','tests/fixtures/level70-dual-generator-v193.json'].map(p=>[p,digest(fs.readFileSync(p))]));
const report={createdAt:new Date().toISOString(),status:'PASS',activeRule:lock.activeVersion,taskContract:'1.93.0',formalLevelId:70,levelSha256:digest(d.level),routeSha256:digest(d.drags),lowerBound:11,upperBound:15,exactMinimum:null,totalDrags:51,allRepositionsMultiCell:true,ice:{pink:1,green:9,yellow:17},actualStars:{moves:51,seconds:129},timeLimit:180,current,other199,pointer,checks:data.checks.commands,files,rechecked,bindings,
 candidateSourceProofContinuity:{onlyChangedBinding:oldSourceDrift,reason:'Exact candidate equality and independent reverse-fragment/source-byte preservation audit; current runtime/model/art inputs unchanged. Old report is not rewritten.'},
 limitations:['Not an exact 15 minimum; certified interval is 11–15.','Right machine is auxiliary; 13 final cargo still clear directly.','Existing generator outer-frame crop about 1.49 logical pixels at each edge; cargo and counters fully visible.','Program Pointer tests, not phone or human blind tests.','Wechat package not rebuilt; no upload/publish or persistent player-save changes.']};
const out=root+'complete-'+Date.now()+'.json';fs.writeFileSync(out,JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify({out,status:report.status,lowerBound:11,upperBound:15,totalDrags:51,stars:report.actualStars}));
