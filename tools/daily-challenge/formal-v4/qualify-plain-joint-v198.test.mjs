import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import test from 'node:test';
import {VERSION,assertPlainJointQualificationConfigV198,assertPlainJointAttemptPlanV198,assertNewPlainJointReceiptV198,assertPlainOriginalRouteMetadataV198,assertRootViewedPointerImagesV198} from './qualify-plain-joint-v198.mjs';

// These are metadata checks only. No fixture is a playable LevelSpec, no
// qualification is emitted, and no model, search, replay or claim is invoked.
const H='a'.repeat(64),J='b'.repeat(64),K='c'.repeat(64),V='deliverables/daily-formal-v4-20261008';
const clone=q=>structuredClone(q),d=p=>({path:p,sha256:H});
const failureFile=V+'/design/basic-d3-08-source120-new-01-execution-01/candidate.json';
const bytes=fs.readFileSync(failureFile);
assert.equal(createHash('sha256').update(bytes).digest('hex'),'05bf2d9130ff4d36ec0eab2b595572d406c65874e87d1a96b41d97acb2cb9bfa');
const failed=JSON.parse(bytes),plan=failed.attemptPlan;
const config={version:VERSION,candidate:d('candidate.json'),rootDesign:d('root-design.json'),pointer:d('pointer.json'),visual:d('visual.json'),output:V+'/proof/private-not-written.json'};
test('configuration accepts exact descriptors without accessing them',()=>assert.equal(assertPlainJointQualificationConfigV198(config),config));
for(const[name,mutate]of [
 ['unknown descriptor field',x=>x.candidate.qualified=true],
 ['missing candidate hash',x=>delete x.candidate.sha256],
 ['output outside evidence directory',x=>x.output='src/core/formalDailyChallenge300Data.ts'],
 ['normalized traversal',x=>x.output=V+'/proof/../proof/result.json'],
 ['overwriting input',x=>x.candidate.path=x.output],
 ['extra config control',x=>x.skipPointer=true],
])test('configuration rejects '+name,()=>{const x=clone(config);mutate(x);assert.throws(()=>assertPlainJointQualificationConfigV198(x));});

const planCheck=x=>assertPlainJointAttemptPlanV198(x,{levelSha256:failed.levelSha256,band:failed.band});
test('actual failed source120 plan metadata remains valid independently of its failed mathematics',()=>assert.deepEqual(planCheck(plan),plan.lowerBudget));
for(const[name,mutate]of [
 ['different input hash',x=>x.inputLevelSha256=H],
 ['provided route',x=>x.providedRouteSha256=H],
 ['fallback strategy',x=>x.strategy.route='native-upper'],
 ['revalidation permission',x=>x.sameExactObjectRevalidationAllowed=true],
 ['accepted parent exception',x=>x.mechanismBaseReceipt=d('old.json')],
 ['accepted adaptation',x=>x.acceptedBaseMechanismAdaptationRequested=true],
 ['late plan',x=>x.formedBeforeClaim=false],
 ['unknown parent',x=>x.redesignOf='unknown'],
 ['different accepted band',x=>x.band.lower=27],
 ['unbounded search',x=>x.searchUpper=Infinity],
 ['state budget 10000 plus guard',x=>x.lowerBudget.maxStates=10000],
 ['unrecognized budget',x=>x.upperBudget.retry=1],
 ['invalid transition budget',x=>x.upperBudget.maxTransitions=0],
])test('attempt plan rejects '+name,()=>{const x=clone(plan);mutate(x);assert.throws(()=>planCheck(x));});
test('joint budget is the minimum of both original budgets',()=>{const x=clone(plan);x.upperBudget.maxStates=5000;assert.equal(planCheck(x).maxStates,5000);});
test('real UNKNOWN source120 receipt is rejected without changing or replaying it',()=>assert.throws(()=>assertNewPlainJointReceiptV198(failed)));

// Opaque body identifiers and a transcript, deliberately no board dimensions,
// coordinates, shapes, gates or movable-world fixture.
const transcript={level:{blocks:[{id:'one'},{id:'two'}]},levelSha256:H,routeSha256:J,U:1,
 drags:[{blockId:'one',path:[[0,0]]},{blockId:'one',path:[[0,0]],exitSide:'left'},{blockId:'two',path:[[0,0]],exitSide:'right'}],
 lowerBound:{result:{discoveredStates:9}},route:{inputLevelSha256:H,routeSha256:J,
  canonicalReplay:{valid:true,complete:true,failed:false,nonClearingDrags:1,effectiveDrags:3,clearEvents:2,finalStateKey:JSON.stringify({complete:true,failed:false,blocks:[],queuedBlocks:[],cleared:2})},
  independentReplay:{valid:true,complete:true,failed:false,nonClearingDrags:1,effectiveDrags:3,clearEvents:2,remainingBodies:0,remainingQueued:0,finalStateSha256:K,
   trace:[{index:0,moves:1,blockId:'one',clearDelta:0,complete:false},{index:1,moves:2,blockId:'one',clearDelta:1,complete:false},{index:2,moves:3,blockId:'two',clearDelta:1,complete:true,stateSha256:K}]},
  witnessValidation:{providedRoute:false,searchPerformed:true,fullBoardSearchStates:9,drags:3,unitSteps:3}}};
test('complete transcript counts removals separately from nonclearing drags',()=>assert.deepEqual(assertPlainOriginalRouteMetadataV198(transcript),{canonicalValidComplete:true,independentValidComplete:true,completeOriginalInventory:true,bodies:2,nonClearingDrags:1,totalDrags:3}));
for(const[name,mutate]of [
 ['invented U',x=>x.U=2],
 ['truncated trace',x=>x.route.independentReplay.trace.pop()],
 ['missing body',x=>x.level.blocks.push({id:'never-cleared'})],
 ['summary says complete while queued remains',x=>x.route.independentReplay.remainingQueued=1],
 ['canonical summary hides leftover body',x=>x.route.canonicalReplay.finalStateKey=JSON.stringify({complete:true,failed:false,blocks:[{id:'one'}],queuedBlocks:[],cleared:2})],
 ['removed body reused',x=>{x.drags[2].blockId='one';x.route.independentReplay.trace[2].blockId='one';}],
 ['clear event without original exit',x=>delete x.drags[1].exitSide],
 ['route hash mismatch',x=>x.route.routeSha256=H],
 ['premature completion',x=>x.route.independentReplay.trace[0].complete=true],
 ['different terminal state',x=>x.route.independentReplay.finalStateSha256=H],
 ['route-only claim substituted for search',x=>x.route.witnessValidation.providedRoute=true],
 ['unmatched search accounting',x=>x.route.witnessValidation.fullBoardSearchStates=10],
 ['unmatched full drag path accounting',x=>x.route.witnessValidation.unitSteps=4],
])test('original-route metadata rejects '+name,()=>{const x=clone(transcript);mutate(x);assert.throws(()=>assertPlainOriginalRouteMetadataV198(x));});

const images=[d('small-start.png'),d('small-end.png'),d('large-start.png'),d('large-end.png')];
const visual={method:'view_image',passed:true,formalId:'metadata-only',pointerReportSha256:H,images:images.map(x=>({...x,actuallyViewed:true}))};
test('root view must cover the exact four unique Pointer images',()=>assertRootViewedPointerImagesV198(visual,d('pointer.json'),'metadata-only',images));
for(const[name,mutate]of [
 ['one screenshot was not viewed',x=>x.images[0].actuallyViewed=false],
 ['other image with same summary',x=>x.images[0].path='old-start.png'],
 ['other image bytes',x=>x.images[0].sha256=J],
 ['duplicate screenshot',x=>x.images[3]=clone(x.images[0])],
 ['missing large ending',x=>x.images.pop()],
 ['stale Pointer report',x=>x.pointerReportSha256=J],
 ['different slot',x=>x.formalId='other-slot'],
])test('visual evidence rejects '+name,()=>{const x=clone(visual);mutate(x);assert.throws(()=>assertRootViewedPointerImagesV198(x,d('pointer.json'),'metadata-only',images));});
test('duplicate actual Pointer image cannot satisfy four-image proof',()=>assert.throws(()=>assertRootViewedPointerImagesV198(visual,d('pointer.json'),'metadata-only',[images[0],images[0],images[2],images[3]])));
