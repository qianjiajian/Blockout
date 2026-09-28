import assert from 'node:assert/strict';
import fs from 'node:fs';
import {digest} from '../revised-preview-validation-v160.mjs';
export const IDS=[122,126,127];
export const TARGETS={122:49,126:61,127:41};
export const OLD_TARGETS={122:42,126:49,127:36};
export const TIME_TARGETS={122:64,126:79,127:86};
export const TOTAL_TIMES={122:90,126:110,127:120};
export const FIXTURE='tests/fixtures/remake121to130-v146.json';
export const RULE_FILE='docs/rules/mechanism-rules-v1.88.0.md';
export const clean=v=>JSON.parse(JSON.stringify(v));
export const omitTarget=level=>{const l=clean(level);delete l.preservedMoveTarget;return l;};
export function validateBeforeContinuity(before){
 assert.equal(before.originalBefore.sha256,'02bd7b44ee823808681fffcf9c55d7e572171808b489c59ecde2817200316175');
 assert.equal(digest(fs.readFileSync(before.originalBefore.file)),before.originalBefore.sha256);
 assert.equal(before.concurrentBeforeWrite.sha256,'156e3b9f533c5ddcc9129d53ea8f94b1595d982ee43bcf4b6e4a98b25691fde7');
 assert.equal(digest(fs.readFileSync(before.concurrentBeforeWrite.file)),before.concurrentBeforeWrite.sha256);
 const original=JSON.parse(fs.readFileSync(before.originalBefore.file)),review=JSON.parse(fs.readFileSync(before.concurrentBeforeWrite.file)),expected=clean(original.priorLevels),values=[28,49,57,51,36,49,34,47,70,42];
 assert(review.passed);assert.equal(review.originalBeforeSha256,before.originalBefore.sha256);assert.equal(review.ruleSha256,'908bd1a8997b0d0337019012410043d800b87b5c9350a1d3d99fdd2a2a768343');assert.equal(digest(fs.readFileSync(review.ruleFile)),review.ruleSha256);
 assert.deepEqual(review.changes.map(r=>({id:r.id,field:r.field,before:r.before,after:r.after})),values.map((after,i)=>({id:131+i,field:'preservedMoveTarget',before:original.priorLevels[130+i].preservedMoveTarget??null,after})));
 values.forEach((target,i)=>expected[130+i].preservedMoveTarget=target);assert.deepEqual(before.priorLevels,expected,'Only the exact approved concurrent131–140 scoring fields may precede this write');
 for(const key of ['fixture','rows','bindings','priorCompletion'])assert.deepEqual(before[key],original[key]);assert.equal(before.campaignSha256,digest(before.priorLevels));
 return {passed:true,originalBefore:before.originalBefore,review:before.concurrentBeforeWrite,concurrentIds:values.map((_,i)=>131+i),other190BeforeObjectsPreserved:true};
}
export function validateScoringData(before,fixture,levels,api){
 assert.equal(before.priorLevels.length,200);assert.equal(levels.length,200);assert.deepEqual(before.rows.map(r=>r.id),IDS);
 assert.deepEqual(levels.map(l=>l.id),Array.from({length:200},(_,i)=>i+1));
 const expected=clean(before.priorLevels),expectedFixture=clean(before.fixture),rows=[];
 for(const id of IDS){
  const archived=before.rows.find(r=>r.id===id),old=before.priorLevels[id-1],current=levels[id-1],oldRow=before.fixture.rows.find(r=>r.id===id),row=fixture.rows.find(r=>r.id===id);
  assert.deepEqual(oldRow.level,old);assert.equal(digest(old),archived.oldLevelSha256);assert.equal(digest(omitTarget(old)),archived.gameplaySha256);assert.equal(digest(oldRow.drags),archived.routeSha256);assert.equal(archived.drags,oldRow.drags.length);
  assert.deepEqual(api.levelStarTargets(old),{moveTarget:OLD_TARGETS[id],timeTargetSeconds:TIME_TARGETS[id]});
  assert.deepEqual(api.levelStarTargets(current),{moveTarget:TARGETS[id],timeTargetSeconds:TIME_TARGETS[id]});assert.equal(current.timeSeconds,TOTAL_TIMES[id]);
  expected[id-1].preservedMoveTarget=TARGETS[id];expectedFixture.rows.find(r=>r.id===id).level.preservedMoveTarget=TARGETS[id];
  assert.deepEqual(omitTarget(current),omitTarget(old));assert.deepEqual(row.level,current);assert.deepEqual(row.drags,oldRow.drags);assert.equal(row.drags.length,TARGETS[id]);
  const boundaries=[{moves:TARGETS[id],elapsedSeconds:TIME_TARGETS[id],expected:3},{moves:TARGETS[id]+1,elapsedSeconds:TIME_TARGETS[id],expected:2},{moves:TARGETS[id],elapsedSeconds:TIME_TARGETS[id]+.001,expected:2},{moves:TARGETS[id]+1,elapsedSeconds:TIME_TARGETS[id]+.001,expected:1}].map(x=>{const r=api.evaluateLevelStars(current,x);assert.equal(r.earnedStars,x.expected);return {...x,actual:r.earnedStars};});
  rows.push({id,oldMoveTarget:OLD_TARGETS[id],newMoveTarget:TARGETS[id],timeTargetSeconds:TIME_TARGETS[id],levelSha256:digest(current),routeSha256:digest(row.drags),boundaries});
 }
 assert.deepEqual(levels,expected,'All200: only122/126/127 preservedMoveTarget may change');assert.deepEqual(fixture,expectedFixture,'Whole fixture: only authorized scoring fields may change');
 return {passed:true,modifiedIds:IDS,other197Preserved:true,all200Compared:true,gameplayAndRoutesPreserved:true,timeTargetsPreserved:true,rows};
}
export function replaySpatial(level,drags,api){
 const projected=clean(level);for(const b of projected.blocks)delete b.timedBombSeconds;const replay=api.replayRevisedRoute(projected,drags);if(!replay.valid)return replay;
 const m=new api.PuzzleModel(level);m.startCountdown();for(const d of drags){m.beginAction();for(const p of d.path)assert(m.moveBlockStep(d.blockId,...p));if(d.exitSide)assert(m.tryExit(d.blockId,d.exitSide).ok);assert(m.commitAction());}
 const {moves,...state}=m.snapshot();assert.equal(moves,replay.effectiveDrags);assert.equal(state.complete,replay.complete);assert(!state.failed);return {...replay,finalStateKey:JSON.stringify(state),timeValidated:false,lowerBoundCertified:false};
}
