import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';

// Exact immutable admission review only. No runtime, model, solver or claim API.
const D='deliverables/daily-formal-v4-20261008/';
const selection={path:D+'selection/completed-basic-and-advanced-153-01/index.json',sha256:'a12babe4ad50dc649eb3a409cd6d39cbd5b6c536df33bc4446d348b458488135'};
const expectedReceipt={path:D+'selection/fixed-iced-flip-01/candidate.json',sha256:'956f62fea2d3c13e0235601411e2b5f59de36be45db17d6e39701c13495179ef'};
const inputBindings={},hash=b=>createHash('sha256').update(b).digest('hex');
async function bytes(p,expected){const b=await fs.readFile(p),h=hash(b);if(expected)assert.equal(h,expected,p);if(inputBindings[p])assert.equal(inputBindings[p],h);inputBindings[p]=h;return b;}
async function read(d){return JSON.parse(await bytes(d.path,d.sha256));}
const keyHash=(map,p)=>map[p]??map[path.resolve(p)]??Object.entries(map).find(([k])=>path.resolve(k)===path.resolve(p))?.[1];
const index=await read(selection),prior=await read(index.inputSelection),priorQuick=await read(index.priorIndependentAudit),merge=await read(index.mergeAudit);
assert.equal(index.scope,300);assert.equal(index.files.length,153);assert.equal(prior.files.length,152);assert.deepEqual(index.files.slice(0,152),prior.files);
assert.equal(priorQuick.status,'INDEPENDENT_152_MERGE_QUICK_CHECK_PASS');assert.deepEqual(priorQuick.selection,index.inputSelection);assert.deepEqual(priorQuick.errors,[]);
assert.deepEqual(index.acceptedReceipts,[expectedReceipt]);assert.equal(index.files[152],expectedReceipt.path);
assert.equal(merge.status,'ROOT_REVIEWED_153_SELECTION_ADMISSION_PASS');assert.equal(merge.original152FilesAndOrderPreserved,true);assert.equal(merge.receiptsModified,false);
assert.deepEqual(merge.prior,index.inputSelection);assert.deepEqual(merge.acceptedReceipt,expectedReceipt);assert.equal(merge.staticAudit.passed,true);assert.deepEqual(merge.staticAudit.issues,[]);
assert.equal(merge.diversity.count,153);assert.deepEqual(merge.diversity.reasons,[]);for(const k of ['newSearches','newLedgerClaims','newConstructions'])assert.equal(merge[k],0);
const bands={1:0,2:0,3:0},groups={},ids=new Set(),records=[];
for(const [i,p]of index.files.entries()){
 const expected=keyHash(index.fileBindings,p);assert(expected);const b=await bytes(p,expected),q=JSON.parse(b);
 if(i<152)assert.equal(expected,keyHash(priorQuick.inputBindings,p));
 assert(q.accepted&&!q.qualificationOnly);assert.equal(q.levelSha256,levelSha256(q.level));assert.equal(q.routeSha256,routeSha256(q.drags));
 assert(!ids.has(q.formalId));ids.add(q.formalId);bands[q.difficulty]++;groups[q.stageKey]??={1:0,2:0,3:0};groups[q.stageKey][q.difficulty]++;records.push(q);
}
assert.deepEqual(bands,{1:81,2:52,3:20});assert.deepEqual(groups,index.groups);assert.deepEqual(bands,index.bands);assert.deepEqual(groups['basic-combined'],{1:10,2:10,3:10});
const q=records.at(-1),actual=await read(index.independentActualAudit),pointer=await read(index.currentCandidatePointer),visual=await read(index.actualImageReview);
assert.equal(actual.status,'INDEPENDENT_FIXED_ICED_FLIP_ACTUAL_PASS');assert.deepEqual(actual.receipt,expectedReceipt);assert.deepEqual(actual.errors,[]);assert.equal(actual.acceptedCandidates,1);
assert.equal(q.L,31);assert.equal(q.U,46);assert.equal(q.drags.length,61);assert.equal(q.sourceLevelId,18);assert.equal(q.formalId,'daily-mechanisms-flip-door-150-d3-03');
assert.equal(actual.result.L,q.L);assert.equal(actual.result.U,q.U);assert.equal(actual.result.accepted,true);assert.equal(actual.result.lowerWholeWorldUpperBound,3842);assert.equal(actual.result.constructionWorlds,853);
for(const r of [actual.canonicalReplay,actual.independentReplay]){assert(r.valid&&r.complete);assert.equal(r.nonClearingDrags,46);assert.equal(r.effectiveDrags,61);assert.equal(r.clearEvents,q.level.blocks.length);}
const finalState=JSON.parse(actual.canonicalReplay.finalStateKey);assert.equal(finalState.blocks.length,0);assert.equal(finalState.queuedBlocks.length,0);
const mathRoot='deliverables/daily-formal-v3-20261008/proof/attempts/';
const boundActual=async p=>{const sha256=keyHash(actual.fileBindings,p);assert(sha256,`Actual audit must bind ${p}`);return read({path:p,sha256});};
const request=await boundActual(mathRoot+q.attempt.id+'.request.json'),result=await boundActual(mathRoot+q.attempt.id+'.result.json');
assert.deepEqual(request,q.attempt);assert.equal(result.accepted,true);assert.equal(result.levelSha256,q.levelSha256);assert.deepEqual(result.lower,q.lowerBound.result);assert.deepEqual(result.upper,q.route.search);
assert.deepEqual(await boundActual(q.entryResultFile),q);await read(q.constructionSidecar);await read(q.constructionPlan);
assert(q.lowerBound.result.thresholdProven);assert(q.lowerBound.result.certifiedFloor>=31);assert.equal(q.lowerBound.result.guardAllowance.conservativeFullBoardStateUpperBound,3842);
assert.equal(pointer.status,'FIXED_ICED_FLIP_DUAL_POINTER_PASS');assert.deepEqual(pointer.receipt,expectedReceipt);assert.equal(pointer.passed,2);assert.equal(pointer.runs.length,2);assert.equal(pointer.naturalClock,true);
assert.deepEqual(pointer.runs.map(r=>r.viewport),[{width:320,height:568},{width:496,height:1078}]);
const screens=[];
for(const item of pointer.runs){const p=await read(item.report);assert.equal(p.status,'CANDIDATE_CURRENT_UI_POINTER_NATURAL_TIME_PASS');assert.deepEqual(p.receipt,expectedReceipt);
 assert.deepEqual(p.errors,[]);assert.deepEqual(p.storageViolations,[]);assert.equal(p.levelSha256,q.levelSha256);assert.equal(p.routeSha256,q.routeSha256);
 assert.equal(p.U,46);assert.equal(p.totalDrags,61);assert.equal(p.continuousHoldTurningDrags,14);assert.equal(p.clockMocked,false);assert.equal(p.naturalClock,true);assert.equal(p.playerSaveTouched,false);
 assert(p.pointerValidated&&p.timeValidated&&p.settlementValidated);assert(p.finalPuzzle.complete&&!p.finalPuzzle.failed);assert.equal(p.finalPuzzle.blocks,0);assert.equal(p.finalPuzzle.queuedBlocks,0);assert.equal(p.finalPuzzle.moves,61);
 assert(p.finalPuzzle.remainingSeconds>0);assert(p.naturalClockProbe.after<p.naturalClockProbe.before);
 assert.equal(p.flipParticipation.length,4);assert(p.flipParticipation.every(f=>f.actualGateExits.length>0&&f.toggles===15));assert.equal(p.iceParticipation.length,6);
 assert.deepEqual([...new Set(p.iceParticipation.map(i=>i.clearsAtRelease))].sort(),[2,3,4]);assert(p.iceParticipation.every(i=>i.firstAction>i.releaseDrag));
 assert.equal(p.settlement.screen,'win');assert.equal(p.settlement.debug.status,'committed');assert.equal(p.settlement.debug.earnedStars,0);
 screens.push({report:item.report,viewport:p.viewport,U:p.U,totalDrags:p.totalDrags,continuousHoldTurningDrags:p.continuousHoldTurningDrags,wallSeconds:p.wallSeconds,remainingSeconds:p.finalPuzzle.remainingSeconds});}
assert.equal(visual.status,'ROOT_SIX_ICED_FLIP_CURRENT_IMAGES_REVIEWED');assert.deepEqual(visual.receipt,expectedReceipt);assert.deepEqual(visual.pointerReport,index.currentCandidatePointer);assert.equal(visual.rootActuallyOpenedEveryImage,true);assert.equal(visual.images.length,6);
for(const image of visual.images){const b=await bytes(image.path,image.sha256);assert.equal(b.subarray(1,4).toString(),'PNG');assert.equal(b.readUInt32BE(16),image.viewport.width);assert.equal(b.readUInt32BE(20),image.viewport.height);}
await read(pointer.originalFailurePreserved);for(const [p,h]of Object.entries(pointer.inputBindings))await bytes(p,h);
await bytes('tools/daily-challenge/formal-v4/audit-completed153-quick-independent.mjs');
for(const [p,h]of Object.entries(inputBindings))assert.equal(hash(await fs.readFile(p)),h,p);
const report={status:'INDEPENDENT_153_MERGE_QUICK_CHECK_PASS',reviewer:'daily_difficulty_catalog',selection,prior:index.inputSelection,priorQuickReview:index.priorIndependentAudit,mergeAudit:index.mergeAudit,
 independentActualAudit:index.independentActualAudit,currentCandidatePointer:index.currentCandidatePointer,actualImageReview:index.actualImageReview,
 original152ExactPrefixAndBytes:true,exactOneAppendedOriginalIcedReceipt:true,candidates:153,difficultyCounts:[81,52,20],basicCounts:[10,10,10],missing:147,
 appended:[{...expectedReceipt,formalId:q.formalId,sourceLevelId:q.sourceLevelId,difficulty:3,L:q.L,U:q.U,levelSha256:q.levelSha256,routeSha256:q.routeSha256,totalDrags:61,fullInventoryCleared:true,constructionWorlds:853,lowerWholeWorldUpperBound:3842,screens}],
 scope:'Exact 153 membership and all selected receipt bytes; existing complete actual mathematics, dual U and current Pointer reports. No old closure rescan, no new model/search, no report mutation.',
 inputBindings,verifiedFiles:Object.keys(inputBindings).length,errors:[],newSearches:0,newLedgerClaims:0,newConstructions:0,newWitnessReplays:0,
 currentPointerEvidenceVerified:true,currentUIExecutedByThisAudit:false,rootActuallyViewedSixImagesEvidenceVerified:true,formalReady:false,productionChanged:false};
const out=D+'proof/completed153-quick-independent-01.json';await fs.writeFile(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({path:out,sha256:hash(await fs.readFile(out)),verifiedFiles:report.verifiedFiles,status:report.status}));
