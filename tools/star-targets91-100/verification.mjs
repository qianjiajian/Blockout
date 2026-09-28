import assert from 'node:assert/strict';
import {digest} from '../revised-preview-validation-v160.mjs';
import {IDS,TARGETS,BEFORE_SHA,BASELINE_RULE_VERSION} from './config.mjs';
export {IDS,TARGETS,BEFORE_SHA} from './config.mjs';
export {replaySpatial} from '../star-targets141-150/verification.mjs';
export const ALL_IDS=Array.from({length:10},(_,i)=>91+i);
export const FIXTURE='tests/fixtures/remake91to100-v147.json';
export const clean=v=>JSON.parse(JSON.stringify(v));
export const omitTarget=level=>{const l=clean(level);delete l.preservedMoveTarget;return l;};

export function validateScoringData(before,fixture,witnesses,levels,api){
 assert(/^[a-f0-9]{64}$/.test(BEFORE_SHA),'Finalize the immutable pre-write baseline before running');
 assert.equal(before.ruleVersion,BASELINE_RULE_VERSION);assert.equal(before.priorLevels.length,200);assert.equal(levels.length,200);
 assert.deepEqual(before.rows.map(r=>r.id),ALL_IDS);assert.deepEqual(witnesses.rows.map(r=>r.id),IDS);
 assert.equal(witnesses.beforeSha256,BEFORE_SHA);assert.equal(digest(before.priorLevels),before.campaignSha256);
 assert.deepEqual(fixture,before.fixture,'Historical fixture must stay unchanged, including superseded routes and unverified lower bounds');
 const expected=clean(before.priorLevels),rows=[],targets={};
 for(const id of ALL_IDS){
  const old=before.priorLevels[id-1],current=levels[id-1],archived=before.rows.find(r=>r.id===id);
  assert.equal(digest(old),archived.oldLevelSha256);assert.equal(digest(omitTarget(old)),archived.gameplaySha256);
  assert.deepEqual(api.levelStarTargets(old),archived.oldTargets);assert.equal(old.timeSeconds,archived.timeSeconds);
  if(!IDS.includes(id)){assert.deepEqual(current,old);continue;}
  const row=witnesses.rows.find(r=>r.id===id);
  assert.deepEqual(row.level,current);assert.deepEqual(omitTarget(current),omitTarget(old));
  assert.equal(digest(row.drags),row.routeSha256);assert.equal(digest(omitTarget(row.level)),row.gameplaySha256);
  const target=row.drags.length;assert.equal(target,TARGETS[id],'Approved complete-route drag total');
  assert(Number.isSafeInteger(target)&&target>archived.oldTargets.moveTarget,'Only loosen explicitly reviewed tight drag targets');targets[id]=target;
  assert.deepEqual(api.levelStarTargets(current),{moveTarget:target,timeTargetSeconds:archived.oldTargets.timeTargetSeconds});
  assert.equal(current.timeSeconds,archived.timeSeconds);expected[id-1].preservedMoveTarget=target;
  const time=archived.oldTargets.timeTargetSeconds;
  const boundaries=[{moves:target,elapsedSeconds:time,stars:3},{moves:target+1,elapsedSeconds:time,stars:2},{moves:target,elapsedSeconds:time+.001,stars:2},{moves:target+1,elapsedSeconds:time+.001,stars:1}].map(c=>{const r=api.evaluateLevelStars(current,c);assert.equal(r.earnedStars,c.stars);return{...c,result:r};});
  rows.push({id,oldMoveTarget:archived.oldTargets.moveTarget,newMoveTarget:target,timeTargetSeconds:time,levelSha256:digest(current),gameplaySha256:row.gameplaySha256,routeSha256:row.routeSha256,boundaries});
 }
 assert.deepEqual(levels,expected,'All200: only approved preservedMoveTarget fields may be added or replaced');
 return{passed:true,modifiedIds:IDS,targets,all200Compared:true,otherLevelCount:200-IDS.length,otherLevelsPreserved:true,gameplayPreserved:true,historicalFixturePreserved:true,timeTargetsPreserved:true,rows};
}
