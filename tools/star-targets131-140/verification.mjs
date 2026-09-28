import assert from 'node:assert/strict';
import {digest} from '../revised-preview-validation-v160.mjs';
export {replaySpatial} from '../star-targets141-150/verification.mjs';
export const IDS=Array.from({length:10},(_,i)=>131+i);
export const TARGETS=Object.fromEntries(IDS.map((id,i)=>[id,[28,49,57,51,36,49,34,47,70,42][i]]));
export const OLD_TARGETS=Object.fromEntries(IDS.map((id,i)=>[id,[50,66,62,50,45,60,54,74,99,37][i]]));
export const TIME_TARGETS=Object.fromEntries(IDS.map((id,i)=>[id,[75,86,86,100,72,97,97,108,86,50][i]]));
export const BEFORE_SHA='7a95275a28d19fa7c5d1fe95b40839e81a6f9114c9358f067b44c514d20b7489';
const clean=v=>JSON.parse(JSON.stringify(v));
export const omitTarget=level=>{const l=clean(level);delete l.preservedMoveTarget;return l;};
export function validateScoringData(before,fixture,levels,api){
 assert.equal(before.ruleVersion,'1.87.0');assert.equal(before.priorLevels.length,200);assert.equal(levels.length,200);assert.deepEqual(before.rows.map(r=>r.id),IDS);
 assert.deepEqual(before.fixture.rows.map(r=>r.id),IDS);assert.deepEqual(fixture.rows.map(r=>r.id),IDS);
 if(before.campaignSha256)assert.equal(digest(before.priorLevels),before.campaignSha256);
 const expected=clean(before.priorLevels),expectedFixture=clean(before.fixture),rows=[];
 for(const id of IDS){
  const old=before.priorLevels[id-1],current=levels[id-1],oldRow=before.fixture.rows.find(r=>r.id===id),row=fixture.rows.find(r=>r.id===id);
  assert.equal(old.id,id);assert.deepEqual(oldRow.level,old);assert.deepEqual(omitTarget(current),omitTarget(old));assert.deepEqual(row.drags,oldRow.drags);assert.equal(row.drags.length,TARGETS[id]);
  const archived=before.rows.find(r=>r.id===id);assert.equal(digest(old),archived.oldLevelSha256);assert.equal(digest(omitTarget(old)),archived.gameplaySha256);assert.equal(digest(oldRow.drags),archived.routeSha256);assert.equal(oldRow.drags.length,archived.drags);assert.equal(old.timeSeconds,archived.timeSeconds);assert.equal(oldRow.lowerBound,archived.lowerBound);assert.equal(oldRow.upperBound,archived.upperBound);
  const oldStars=api.levelStarTargets(old),newStars=api.levelStarTargets(current);assert.deepEqual(oldStars,{moveTarget:OLD_TARGETS[id],timeTargetSeconds:TIME_TARGETS[id]});assert.deepEqual(oldStars,archived.oldTargets);assert.deepEqual(newStars,{moveTarget:TARGETS[id],timeTargetSeconds:oldStars.timeTargetSeconds});assert.deepEqual(newStars,archived.newTargets);
  expected[id-1].preservedMoveTarget=TARGETS[id];expectedFixture.rows.find(r=>r.id===id).level.preservedMoveTarget=TARGETS[id];
  const boundaryCases=[{moves:TARGETS[id],elapsedSeconds:newStars.timeTargetSeconds,stars:3,move:true,time:true},{moves:TARGETS[id]+1,elapsedSeconds:newStars.timeTargetSeconds,stars:2,move:false,time:true},{moves:TARGETS[id],elapsedSeconds:newStars.timeTargetSeconds+.001,stars:2,move:true,time:false},{moves:TARGETS[id]+1,elapsedSeconds:newStars.timeTargetSeconds+.001,stars:1,move:false,time:false}].map(c=>{const r=api.evaluateLevelStars(current,c);assert.equal(r.earnedStars,c.stars);assert.equal(r.moveAchieved,c.move);assert.equal(r.timeAchieved,c.time);return{...c,result:r};});
  rows.push({id,oldStars,newStars,oldLevelSha256:digest(old),levelSha256:digest(current),gameplaySha256:digest(omitTarget(current)),routeSha256:digest(row.drags),boundaryCases});
 }
 assert.deepEqual(levels,expected,'Only the ten authorized preservedMoveTarget fields may change across all200 objects');assert.deepEqual(fixture,expectedFixture,'Only scoring fields may change in fixture; all routes/bounds are exact');
 return{passed:true,all200Compared:true,modifiedIds:IDS,routeAndGameplayPreserved:true,lowerBoundsRecomputed:false,rows};
}
