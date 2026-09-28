import assert from 'node:assert/strict';
import {digest} from '../revised-preview-validation-v160.mjs';
export {replaySpatial} from '../star-targets141-150/verification.mjs';
export const IDS=[71,75,76,78,79];
export const TARGETS={71:50,75:37,76:36,78:37,79:58};
export const ALL_IDS=Array.from({length:10},(_,i)=>71+i);
export const BEFORE_SHA='41d9124d6d65d2f1fe00d7b3ca3822710ee7dcd577444b4c7b086bdeb7943c7a';
export const FIXTURE='tests/fixtures/remake71to80-v146.json';
export const clean=v=>JSON.parse(JSON.stringify(v));
export const omitTarget=level=>{const l=clean(level);delete l.preservedMoveTarget;return l;};

export function validateScoringData(before,fixture,witnesses,levels,api){
 assert.equal(before.ruleVersion,'1.96.0');assert.equal(before.priorLevels.length,200);assert.equal(levels.length,200);
 assert.deepEqual(before.rows.map(r=>r.id),ALL_IDS);assert.deepEqual(witnesses.rows.map(r=>r.id),IDS);
 assert.equal(witnesses.beforeSha256,BEFORE_SHA);assert.equal(digest(before.priorLevels),before.campaignSha256);
 assert.deepEqual(fixture,before.fixture,'Historical fixture including superseded Lv72 remains unchanged');
 const expected=clean(before.priorLevels),rows=[],targets={};
 for(const id of ALL_IDS){
  const old=before.priorLevels[id-1],current=levels[id-1],archived=before.rows.find(r=>r.id===id);
  assert.equal(digest(old),archived.oldLevelSha256);assert.equal(digest(omitTarget(old)),archived.gameplaySha256);
  assert.deepEqual(api.levelStarTargets(old),archived.oldTargets);assert.equal(old.timeSeconds,archived.timeSeconds);
  if(!IDS.includes(id)){assert.deepEqual(current,old);continue;}
  const row=witnesses.rows.find(r=>r.id===id),oldRow=fixture.rows.find(r=>r.id===id);
  assert.deepEqual(row.level,current);assert.deepEqual(omitTarget(current),omitTarget(old));
  assert.equal(digest(row.drags),row.routeSha256);assert.equal(digest(omitTarget(row.level)),row.gameplaySha256);
  assert.deepEqual(oldRow.level,old);
  if(![71,76].includes(id))assert.deepEqual(row.drags,oldRow.drags,'Unchanged valid historical route');
  // 71/76 require fresh witnesses because the current complete-shape exit
  // sweep rejects their historical paths. Source/hash checks in playtest bind
  // those new routes while retaining the immutable old fixture separately.
  const target=row.drags.length;assert.equal(target,TARGETS[id],'Reviewed complete-route drag total');
  assert(Number.isSafeInteger(target)&&target>archived.oldTargets.moveTarget,'Only loosen five reviewed tight drag targets');targets[id]=target;
  assert.deepEqual(api.levelStarTargets(current),{moveTarget:target,timeTargetSeconds:archived.oldTargets.timeTargetSeconds});
  assert.equal(current.timeSeconds,archived.timeSeconds);expected[id-1].preservedMoveTarget=target;
  const time=archived.oldTargets.timeTargetSeconds;
  const boundaries=[{moves:target,elapsedSeconds:time,stars:3},{moves:target+1,elapsedSeconds:time,stars:2},{moves:target,elapsedSeconds:time+.001,stars:2},{moves:target+1,elapsedSeconds:time+.001,stars:1}].map(c=>{const r=api.evaluateLevelStars(current,c);assert.equal(r.earnedStars,c.stars);return{...c,result:r};});
  rows.push({id,oldMoveTarget:archived.oldTargets.moveTarget,newMoveTarget:target,timeTargetSeconds:time,levelSha256:digest(current),gameplaySha256:row.gameplaySha256,routeSha256:row.routeSha256,boundaries});
 }
 assert.deepEqual(levels,expected,'All200: only five approved preservedMoveTarget fields may change');
 return{passed:true,modifiedIds:IDS,targets,all200Compared:true,other195Preserved:true,gameplayPreserved:true,historicalFixturePreserved:true,timeTargetsPreserved:true,rows};
}
