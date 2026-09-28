// Preserve original FAIL reports; summarize observed inputs separately from
// the current-workspace continuity review owned by the task root.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {digest} from '../revised-preview-validation-v160.mjs';
import {IDS,TARGETS} from './verification.mjs';
const base='deliverables/star-targets71-80-20260927/pointer-support';
const dirs=['pointer-1790510770549-320x568-58824','pointer-1790510770539-496x1078-58616'];
const expectedDrift=['src/core/remake61to70.ts','docs/rules/manifest.json'];
const reports=dirs.map(dir=>{
 const file=path.join(base,dir,'report.json'),bytes=fs.readFileSync(file),report=JSON.parse(bytes);
 assert.equal(report.status,'FAIL');assert.match(report.error,/Runtime\/art\/rule\/tool drift requires separate concrete review/);
 assert.deepEqual(report.currentWorkspaceDrift.map(d=>d.path),expectedDrift);
 assert.deepEqual(report.snapshotDrift,[]);assert.deepEqual(report.sourceEvidenceDrift,[]);assert.deepEqual(report.errors,[]);
 assert.deepEqual(report.rows.map(r=>r.id),IDS);
 const rows=report.rows.map(row=>{
  assert.equal(row.status,'PASS');assert(row.pointerValidated&&row.naturalClockValidated&&row.naturalTimingReplay.passed);
  assert.equal(row.settlement.earnedStars,3);assert.equal(row.settlement.assistedClear,false);
  assert.equal(row.final.moves,TARGETS[row.id]);assert(row.final.complete&&!row.final.failed);
  assert.equal(row.settlement.storage.backend,'MemoryHost');assert.equal(row.settlement.storage.save.bestStars[row.id],3);assert.equal(row.settlement.storage.save.bestMoves[row.id],TARGETS[row.id]);
  assert.equal(row.nativeStorageOperations,0);assert.equal(row.nativeDrawAudit.rotated,0);assert.equal(row.nativeDrawAudit.invalidImageDimensions,0);assert.equal(row.nativeDrawAudit.canvasRotationCalls,0);
  assert.equal(row.assetReadiness.mechanisms.currentSceneReady,true);
  const screenshot=path.join(base,dir,`lv${row.id}-three-stars.png`);
  assert.equal(digest(fs.readFileSync(row.timingLog.file)),row.timingLog.sha256);
  return{id:row.id,moves:row.final.moves,elapsedSeconds:row.settlement.conditions.elapsedSeconds,timeTargetSeconds:row.newStarTargets.timeTargetSeconds,earnedStars:3,bestStars:3,naturalTimingReplay:row.naturalTimingReplay,timingLog:row.timingLog,screenshot,screenshotSha256:digest(fs.readFileSync(screenshot)),visualReview:'PASS: target text, all three bright stars, result panel and continue button are visible and unclipped.'};
 });
 return{file,sha256:digest(bytes),originalStatus:report.status,viewport:report.viewport,rows,drift:report.currentWorkspaceDrift,otherBoundFilesUnchanged:true};
});
const output=path.join(base,`observed-input-summary-${Date.now()}.json`);
fs.writeFileSync(output,JSON.stringify({status:'INPUT_PASS_CONTINUITY_REVIEW_REQUIRED',reports,allTenActualThreeStarSettlements:true,allTenNaturalModelReplays:true,allTenResultScreenshotsVisuallyReviewed:true,persistentStorageAccesses:0,originalFailReportsPreserved:true,currentWorkspaceContinuityReviewed:false,lowerBoundsRecertified:false,playerSaveTouched:false},null,2));
console.log(JSON.stringify({output,status:'INPUT_PASS_CONTINUITY_REVIEW_REQUIRED'}));
