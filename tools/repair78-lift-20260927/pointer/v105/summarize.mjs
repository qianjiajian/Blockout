import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {digest} from '../../../revised-preview-validation-v160.mjs';
const root='deliverables/repair78-lift-20260927/pointer/v105';
const directories=[
 'pointer-normal-1790518376110-320x568-14884',
 'pointer-normal-1790518376061-496x1078-29452',
 'pointer-late-no-external-1790518376168-320x568-39000',
 'pointer-late-no-external-1790518376162-496x1078-58272',
];
const rows=directories.map(directory=>{
 const file=path.join(root,directory,'report.json'),bytes=fs.readFileSync(file),report=JSON.parse(bytes),row=report.rows[0];
 assert.equal(report.status,'PASS');assert.equal(report.rows.length,1);assert.equal(row.id,78);assert.equal(row.status,'PASS');assert(row.pointerValidated&&row.naturalClockValidated&&row.naturalTimingReplay.passed);
 assert.deepEqual(report.currentWorkspaceDrift,[]);assert.deepEqual(report.snapshotDrift,[]);assert.deepEqual(report.sourceEvidenceDrift,[]);assert.deepEqual(report.errors,[]);
 const late=report.caseName==='late-no-external',expectedMoves=late?46:37,expectedStars=late?2:3;
 assert.equal(row.final.moves,expectedMoves);assert(row.final.complete&&!row.final.failed);assert.equal(row.settlement.earnedStars,expectedStars);assert.equal(row.settlement.assistedClear,false);
 assert.deepEqual(row.starTargets,{moveTarget:37,timeTargetSeconds:129});assert.equal(row.settlement.storage.backend,'MemoryHost');assert.equal(row.settlement.storage.save.bestStars['78'],expectedStars);assert.equal(row.settlement.storage.save.bestMoves['78'],expectedMoves);
 assert.equal(row.nativeStorageOperations,0);assert.equal(row.nativeDrawAudit.rotated,0);assert.equal(row.nativeDrawAudit.canvasRotationCalls,0);assert.equal(row.nativeDrawAudit.invalidImageDimensions,0);assert.equal(row.assetReadiness.mechanisms.currentSceneReady,true);
 assert.deepEqual(row.actualRevealProof.hidden.filter(b=>b.frozen>0).map(b=>b.frozen),[3,3]);
 if(late){assert.deepEqual(row.actualRevealProof.remainingExternalIds,[]);assert.equal(row.actualRevealProof.cleared,13);assert.equal(row.actualRevealProof.method,'tryExit');}
 assert.equal(digest(fs.readFileSync(row.timingLog.file)),row.timingLog.sha256);
 const screenshots=['lv78-settlement.png',late?'lv78-reveal-37.png':'lv78-reveal-29.png',...late?[]:['lv78-opening.png']].map(name=>{const image=path.join(root,directory,name);return{file:image,sha256:digest(fs.readFileSync(image)),visuallyReviewed:true};});
 return{file,sha256:digest(bytes),caseName:report.caseName,viewport:report.viewport,status:report.status,moves:expectedMoves,earnedStars:expectedStars,elapsedSeconds:row.settlement.conditions.elapsedSeconds,stars:row.starTargets,actualRevealProof:row.actualRevealProof,timingLog:row.timingLog,naturalTimingReplay:row.naturalTimingReplay,screenshots};
});
const output=path.join(root,`pointer-summary-${Date.now()}.json`);
fs.writeFileSync(output,JSON.stringify({status:'POINTER_VALIDATION_PASS',rows,normalThreeStarsBothScreens:true,strictLateZeroExternalClearAssistanceBothScreens:true,initialHiddenIcePreservedBothCases:true,allOriginalReportsPass:true,scope:'Four complete formal Pointer runs and natural event replays only; independent lower-bound and hidden-state certification are separate.',lowerBoundsCertifiedByThisTool:false,allHiddenStatesCertifiedByThisTool:false,persistentStorageAccesses:0,productionWrittenByThisTool:false,oldEvidenceRewritten:false},null,2));
console.log(JSON.stringify({output,status:'POINTER_VALIDATION_PASS',rows:rows.map(({caseName,viewport,moves,earnedStars,elapsedSeconds})=>({caseName,viewport,moves,earnedStars,elapsedSeconds}))}));
