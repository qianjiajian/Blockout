import assert from 'node:assert/strict';
import {digest} from '../revised-preview-validation-v160.mjs';
export {replaySpatial} from '../star-targets141-150/verification.mjs';

export const IDS=[81,83,85,87,88];
// Complete currently executable route totals, without an optimality claim.
export const TARGETS={81:38,83:56,85:33,87:50,88:54};
export const ALL_IDS=Array.from({length:10},(_,i)=>81+i);
export const BEFORE_SHA='9befce8f31988246f25284e228b9d4948a3ca384167ddf72177cf87fd19868d9';
export const FIXTURE='tests/fixtures/remake81to90-v146.json';
export const clean=v=>JSON.parse(JSON.stringify(v));
export const omitTarget=level=>{const l=clean(level);delete l.preservedMoveTarget;return l;};

export function validateScoringData(before,fixture,witnesses,levels,api){
 assert.equal(before.ruleVersion,'1.95.0');assert.equal(before.priorLevels.length,200);assert.equal(levels.length,200);
 assert.deepEqual(before.rows.map(r=>r.id),ALL_IDS);assert.deepEqual(witnesses.rows.map(r=>r.id),IDS);
 assert.equal(witnesses.beforeSha256,BEFORE_SHA);assert.equal(digest(before.priorLevels),before.campaignSha256);
 assert.deepEqual(fixture,before.fixture,'Historical fixture, including old 85 route and 89 axis configuration, must stay unchanged');
 const expected=clean(before.priorLevels),rows=[],targets={};
 for(const id of ALL_IDS){
  const old=before.priorLevels[id-1],current=levels[id-1],archived=before.rows.find(r=>r.id===id),oldRow=fixture.rows.find(r=>r.id===id);
  assert.equal(digest(old),archived.oldLevelSha256);assert.equal(digest(omitTarget(old)),archived.gameplaySha256);
  assert.equal(digest(oldRow.drags),archived.routeSha256);assert.equal(oldRow.drags.length,archived.drags);
  assert.deepEqual(api.levelStarTargets(old),archived.oldTargets);assert.equal(old.timeSeconds,archived.timeSeconds);
  if(!IDS.includes(id)){assert.deepEqual(current,old);continue;}
  const row=witnesses.rows.find(r=>r.id===id);
  assert.deepEqual(row.level,current);assert.deepEqual(omitTarget(current),omitTarget(old));
  assert.equal(digest(row.drags),row.routeSha256);assert.equal(digest(omitTarget(row.level)),row.gameplaySha256);
  assert.deepEqual(oldRow.level,old,'These five maps have no pre-existing repair difference');
  if(id!==85)assert.deepEqual(row.drags,oldRow.drags,'Unchanged valid historical route');
  // 85 may adopt a newly validated route; the harness separately binds and
  // replays its immutable source. No candidate, map or lower bound is changed.
  const target=row.drags.length;assert.equal(target,TARGETS[id],'Approved complete-route drag total');assert(Number.isSafeInteger(target)&&target>archived.oldTargets.moveTarget,'Only loosen the five reviewed tight drag targets');targets[id]=target;
  assert.deepEqual(api.levelStarTargets(current),{moveTarget:target,timeTargetSeconds:archived.oldTargets.timeTargetSeconds});
  assert.equal(current.timeSeconds,archived.timeSeconds);expected[id-1].preservedMoveTarget=target;
  const time=archived.oldTargets.timeTargetSeconds;
  const boundaries=[{moves:target,elapsedSeconds:time,stars:3},{moves:target+1,elapsedSeconds:time,stars:2},{moves:target,elapsedSeconds:time+.001,stars:2},{moves:target+1,elapsedSeconds:time+.001,stars:1}].map(c=>{const r=api.evaluateLevelStars(current,c);assert.equal(r.earnedStars,c.stars);return{...c,result:r};});
  rows.push({id,oldMoveTarget:archived.oldTargets.moveTarget,newMoveTarget:target,timeTargetSeconds:time,levelSha256:digest(current),gameplaySha256:row.gameplaySha256,routeSha256:row.routeSha256,routeUpdated:id===85,lowerBoundRecertified:false,boundaries});
 }
 assert.deepEqual(levels,expected,'All200: only five approved preservedMoveTarget fields may change');
 return{passed:true,modifiedIds:IDS,targets,all200Compared:true,other195Preserved:true,gameplayPreserved:true,historicalFixturePreserved:true,timeTargetsPreserved:true,rows};
}
