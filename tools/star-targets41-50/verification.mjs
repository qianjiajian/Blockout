import assert from 'node:assert/strict';
import {digest} from '../revised-preview-validation-v160.mjs';
export {replaySpatial} from '../star-targets141-150/verification.mjs';
export const IDS=[41,43,44,46,47,48,50];
export const TARGETS={41:45,43:24,44:39,46:41,47:46,48:43,50:27};
export const ALL_IDS=Array.from({length:10},(_,i)=>41+i);
export const BEFORE_SHA='125d8ae83b10d975991a5a315e4d4d77dbe13457dbc79cc97504dd429b7c7dba';
export const FIXTURE='tests/fixtures/native-remake41to50-v146.json';
export const clean=v=>JSON.parse(JSON.stringify(v));
export const omitTarget=level=>{const l=clean(level);delete l.preservedMoveTarget;return l;};

export function validateScoringData(before,fixture,witnesses,levels,api){
 assert.equal(before.ruleVersion,'1.94.0');assert.equal(before.priorLevels.length,200);assert.equal(levels.length,200);
 assert.deepEqual(before.rows.map(r=>r.id),ALL_IDS);assert.deepEqual(witnesses.rows.map(r=>r.id),IDS);
 assert.equal(witnesses.beforeSha256,BEFORE_SHA);assert.equal(digest(before.priorLevels),before.campaignSha256);
 assert.deepEqual(fixture,before.fixture,'Historical fixture, including superseded Lv43 route, must stay unchanged');
 const expected=clean(before.priorLevels),rows=[],targets={};
 for(const id of ALL_IDS){
  const old=before.priorLevels[id-1],current=levels[id-1],archived=before.rows.find(r=>r.id===id);
  assert.equal(digest(old),archived.oldLevelSha256);assert.equal(digest(omitTarget(old)),archived.gameplaySha256);
  assert.deepEqual(api.levelStarTargets(old),archived.oldTargets);assert.equal(old.timeSeconds,archived.timeSeconds);
  if(!IDS.includes(id)){assert.deepEqual(current,old);continue;}
  const row=witnesses.rows.find(r=>r.id===id),oldRow=fixture.rows.find(r=>r.id===id);
  assert.deepEqual(row.level,current);assert.deepEqual(omitTarget(current),omitTarget(old));
  assert.equal(digest(row.drags),row.routeSha256);assert.equal(digest(omitTarget(row.level)),row.gameplaySha256);
  // Lv43's v1.63 structural repair supersedes the old batch fixture. Its new
  // current-map route is separately pinned by sourceEvidence in the harness.
  if(id!==43){assert.deepEqual(oldRow.level,old);assert.deepEqual(row.drags,oldRow.drags,'Unchanged valid historical route');}
  const target=row.drags.length;assert.equal(target,TARGETS[id],'Approved complete-route drag total');assert(Number.isSafeInteger(target)&&target>archived.oldTargets.moveTarget,'Only loosen the seven reviewed tight drag targets');targets[id]=target;
  assert.deepEqual(api.levelStarTargets(current),{moveTarget:target,timeTargetSeconds:archived.oldTargets.timeTargetSeconds});
  assert.equal(current.timeSeconds,archived.timeSeconds);expected[id-1].preservedMoveTarget=target;
  const time=archived.oldTargets.timeTargetSeconds;
  const boundaries=[{moves:target,elapsedSeconds:time,stars:3},{moves:target+1,elapsedSeconds:time,stars:2},{moves:target,elapsedSeconds:time+.001,stars:2},{moves:target+1,elapsedSeconds:time+.001,stars:1}].map(c=>{const r=api.evaluateLevelStars(current,c);assert.equal(r.earnedStars,c.stars);return{...c,result:r};});
  rows.push({id,oldMoveTarget:archived.oldTargets.moveTarget,newMoveTarget:target,timeTargetSeconds:time,levelSha256:digest(current),gameplaySha256:row.gameplaySha256,routeSha256:row.routeSha256,boundaries});
 }
 assert.deepEqual(levels,expected,'All200: only seven approved preservedMoveTarget fields may change');
 return{passed:true,modifiedIds:IDS,targets,all200Compared:true,other193Preserved:true,gameplayPreserved:true,historicalFixturePreserved:true,timeTargetsPreserved:true,rows};
}
