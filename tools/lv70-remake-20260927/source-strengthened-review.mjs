import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi,geometry} from '../native-block-repair-v143.mjs';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';

// Final independent source/inventory/mechanism review. Read-only candidate
// validation; no candidate search, formal writes or lower-bound substitution.
const lock=verifyRulesLock();assert(lock.ok);assert.equal(lock.activeVersion,'1.95.0');
const file='deliverables/lv70-remake-20260927/design-strengthen-1790509714045/candidate-0.json';
const previousFile='deliverables/lv70-remake-20260927/design-ice-light-1790509563742/candidate-4.json';
const staticFile='deliverables/lv70-remake-20260927/source-candidate-audit-1790509786738.json';
const data=JSON.parse(fs.readFileSync(file)),prior=JSON.parse(fs.readFileSync(previousFile)),staticReport=JSON.parse(fs.readFileSync(staticFile));
const {level,drags}=data,{api,inputs}=await loadApi();
assert.equal(staticReport.status,'PASS_SOURCE_STATIC_AND_FULL_ROUTE_MECHANISM_METRICS');
assert.equal(staticReport.levelSha256,digest(level));assert.equal(staticReport.routeSha256,digest(drags));
assert.deepEqual(Object.entries(staticReport.bindings).filter(([p,h])=>digest(fs.readFileSync(p))!==h),[]);
const queued=new Set(level.generators.flatMap(g=>g.queueBlockIds)),byId=new Map(level.blocks.map(b=>[b.id,b]));
assert.equal(queued.size,17);assert.equal(level.blocks.length,36);
const opening=level.blocks.filter(b=>!queued.has(b.id)),nonYellowOpening=opening.filter(b=>b.color!=='yellow');
assert.equal(opening.length,19);assert.equal(nonYellowOpening.length,15);
assert.equal(level.generators[0].queueBlockIds[0],'v146-70-queue-7');
assert.equal(level.generators[1].queueBlockIds[0],'v146-70-queue-12');
assert.equal(level.generators[1].queueBlockIds[1],'v146-70-queue-1');
for(const id of ['v146-70-queue-7','v146-70-queue-1']){const b=byId.get(id);assert.equal(b.color,'yellow');assert.deepEqual(b.shape,[[0,0],[0,1]]);}
assert.equal(byId.get('v146-70-queue-12').color,'pink');assert.equal(byId.get('v146-70-queue-12').shape.length,1);
assert.equal(level.gates.find(g=>g.color==='yellow').frozen,17);
assert(!level.shutters?.length);assert(level.blocks.every(b=>!b.layers&&!b.frozen&&!b.star&&!b.keyId&&!b.shutterId));

assert.deepEqual(geometry(level),geometry(prior.level));
const priorQueued=new Set(prior.level.generators.flatMap(g=>g.queueBlockIds));
assert.deepEqual(level.blocks.filter(b=>!queued.has(b.id)),prior.level.blocks.filter(b=>!priorQueued.has(b.id)));
const bodyDiffs=[];
for(const b of level.blocks){const old=prior.level.blocks.find(x=>x.id===b.id);assert(old);assert.deepEqual(b.shape,old.shape);assert.equal(b.color,old.color);if(digest(b)!==digest(old))bodyDiffs.push({id:b.id,shapeUnchanged:true,colorUnchanged:true,previousAnchor:[old.x,old.y],authoredAnchor:[b.x,b.y]});}
assert.deepEqual(bodyDiffs.map(b=>b.id).sort(),['v146-70-queue-1','v146-70-queue-4']);
const replay=api.replayRevisedRoute(level,drags);assert(replay.valid&&replay.complete);assert.equal(replay.effectiveDrags,51);assert.equal(replay.nonClearingDrags,15);assert.equal(replay.clearEvents,36);
assert(staticReport.steps.filter(s=>s.nonClearing).every(s=>s.area>1));

// A genuine reachable alternative parking choice, not omission and insertion at
// the same place. The extra horizontal unit step stays inside the board.
const wrong=structuredClone(drags);assert.equal(wrong[21].blockId,'v146-70-queue-7');assert.deepEqual(wrong[21].path.at(-1),[2,1]);wrong[21].path.push([3,1]);
const wrongPrefix=api.replayRevisedRoute(level,wrong.slice(0,22));assert(wrongPrefix.valid&&!wrongPrefix.complete);
const blockedNext=api.replayRevisedRoute(level,wrong.slice(0,23));assert(!blockedNext.valid);assert.match(blockedNext.error,/queue-0 to 3,2/);
const recoveryDrags=[...wrong.slice(0,22),{blockId:wrong[21].blockId,path:[[2,1]]},...drags.slice(22)];
const recoveryReplay=api.replayRevisedRoute(level,recoveryDrags);assert(recoveryReplay.valid&&recoveryReplay.complete);assert.equal(recoveryReplay.effectiveDrags,52);assert.equal(recoveryReplay.nonClearingDrags,16);
const omitRightHead=api.replayRevisedRoute(level,[...drags.slice(0,15),...drags.slice(16,17)]);
assert(!omitRightHead.valid);assert.match(omitRightHead.error,/fill-13 to 4,2/);
const freezes=staticReport.steps.filter(s=>Object.entries(s.gatesBefore).some(([c,n])=>n>0&&s.gatesAfter[c]===0));
const yellowUnlock=freezes.find(s=>s.gatesBefore.yellow>0&&s.gatesAfter.yellow===0);assert.equal(yellowUnlock.drag,32);assert.equal(yellowUnlock.blockId,'v146-70-queue-14');
const report={createdAt:new Date().toISOString(),activeRule:lock.activeVersion,status:'PASS_INDEPENDENT_SOURCE_STATIC_ROUTE_AND_ONE_UNAVOIDABLE_GENERATED_V2_PARK',candidate:file,levelSha256:digest(level),routeSha256:digest(drags),
 sourceCounterFacts:{pink:1,green:1,yellow:1},authoredCounterValues:{pink:1,green:9,yellow:17},counterAuthorization:'v1.93; not a competitor-exact count claim',
 preservation:{geometry38:true,opening19ShapeColorAndPositionSameAsCandidate4:true,all36ShapeColorBodiesPreserved:true,queued17:true,nativeQ0:true,openingFilled:true,adjacentColorsDifferent:true,uniqueFourExits:true,queueAdjacentDifferent:true},
 differencesFromEarlierCandidate4:{yellowIce:[12,17],actualMoveStar:[50,51],queuePositions:[{id:'v146-70-queue-1',shape:'V2',color:'yellow',from:'left position 5',to:'right position 2'},{id:'v146-70-queue-4',shape:'S',color:'yellow',from:'right position 2',to:'left position 5'}],bodyAnchorDiffs:bodyDiffs,otherOpeningBodiesChanged:false},
 necessaryGeneratedParking:{scope:'Every no-prop solution of these queues/counters needs at least one generated yellow V2 non-clearing drag before yellow thaws.',openingNonYellowCapacity:15,unblockedQueuePrefixWithoutYellowV2Parking:{left:[],right:['v146-70-queue-12']},totalClearCapacityWithoutYellowV2Parking:16,yellowThreshold:17,capacityStrictlyInsufficient:true,
   reason:'Both queues stop at a yellow V2 before their further stock can spawn. Yellow cannot exit before clear 17; moving that V2 away is necessarily non-clearing. Delaying a mouth does not create an extra clear event. No layers/hidden bodies/other event source exists.',
   doesNotProve:'Which machine must park, two machines each parking, a unique position or route, whole-level L11, or absence of every deadlock.'},
 canonicalRoute:{replay,nonClearingMultiCell:15,nonClearingSingleCell:0,generatedNonClearing:1,generatedV2Park:{drag:22,id:'v146-70-queue-7',from:[0,4],to:[2,1],yellowStillFrozen:7,remainingOpening:10},leftFollowupContributions:[{drag:23,id:'v146-70-queue-0',clearNumber:11},{drag:31,id:'v146-70-queue-16',clearNumber:16},{drag:32,id:'v146-70-queue-14',clearNumber:17,opens:'yellow'}],unlocks:freezes},
 twoMachineAssessment:{kind:'Sequential shared-workspace and clear-event cooperation; not independently proved reciprocal interlock.',rightFirstPink:{spawnDrag:15,clearDrag:16,clearNumber:7,remainingOpening:13,omitThisClearThenNextOpeningParking:omitRightHead},rightMouthUsedByOpeningParking:{drag:17,body:'v146-70-fill-13',anchor:[4,2],coversRightSpawnCell:[5,2],effect:'Legal throttling remains possible; the green H2 delays right V2 until drag36, after yellow thawed.'},leftNecessaryParkRealized:true,
  limits:{rightGeneratedParking:0,bothMachinesLiveTogetherStartsDrag:36,yellowThawsDrag:32,finalQueueClearSuffix:13,rightSevenRemainingCargoTail:true},
  conclusion:'The generator is no longer entirely avoidable tail-clearing: a generated V2 parking action is logically unavoidable. This does not mean all 17 cargo are difficult or that the right machine alone adds a proven non-clearing move. Right early stock has an observed spatial/event consequence; later stock remains largely direct clearing.'},
 wrongChoiceRecovery:{wrongParking:[3,1],wrongPrefix,blockedNext,recoveryMove:{blockId:'v146-70-queue-7',path:[[2,1]]},recoveryDrags,recoveryReplay,scope:'One genuine legal wrong parking and a complete no-prop recovery route; not an all-state deadlock guarantee. Its U16 is an error-recovery route, not the normal-band witness.'},
 reportedExternalLowerBound:{candidateClaim:data.floor?.status,floor:data.floor?.floor,independentlyRerunHere:false,notUsedToProveGeneratedParking:true},
 noProductionMutation:true,noPlayerSaveAccess:true,noCandidateSearch:true,pointerValidated:false,naturalTimeValidated:false,phoneTested:false,humanBlindTested:false,published:false,
 bindings:Object.fromEntries([...new Set([file,previousFile,staticFile,'tools/lv70-remake-20260927/source-strengthened-review.mjs','tools/lv70-remake-20260927/source-candidate-audit.mjs','docs/rules/manifest.json','docs/rules/mechanism-rules-v1.93.0.md','docs/rules/mechanism-rules-v1.95.0.md',...inputs])].map(p=>[p,digest(fs.readFileSync(p))]))};
const out=`deliverables/lv70-remake-20260927/source-strengthened-review-${Date.now()}.json`;
fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({out,status:report.status,levelSha256:report.levelSha256,necessaryGeneratedPark:true,totalDrags:51,U:15,wrongRecoveryTotal:52,wrongRecoveryU:16,mechanismLimits:report.twoMachineAssessment.limits}));
