import fs from 'node:fs';
import assert from 'node:assert/strict';
import {digest} from '../revised-preview-validation-v160.mjs';
export {replaySpatial} from '../star-targets141-150/verification.mjs';
export const ROOT='deliverables/star-targets101-110-20260927';
const plan=JSON.parse(fs.readFileSync(ROOT+'/plan.json'));
export const IDS=Array.from({length:10},(_,i)=>101+i);
export const TARGETS=plan.targets;
export const BEFORE_SHA=plan.beforeSha256;
export const FIXTURE='tests/fixtures/remake101to110-v147.json';
export const clean=v=>JSON.parse(JSON.stringify(v));
export const omitTarget=level=>{const l=clean(level);delete l.preservedMoveTarget;return l;};
export function validateScoringData(before,fixture,witnesses,levels,api){
 assert.equal(before.priorLevels.length,200);assert.equal(levels.length,200);
 assert.deepEqual(before.rows.map(r=>r.id),IDS);assert.deepEqual(witnesses.rows.map(r=>r.id),IDS);
 assert.equal(witnesses.beforeSha256,BEFORE_SHA);assert.equal(digest(before.priorLevels),before.campaignSha256);
 assert.deepEqual(fixture,before.fixture,'Old routes, maps and lower bounds stay immutable');
 const expected=clean(before.priorLevels),rows=[];
 for(const id of IDS){
  const old=before.priorLevels[id-1],current=levels[id-1],archived=before.rows.find(r=>r.id===id),row=witnesses.rows.find(r=>r.id===id);
  assert.equal(digest(old),archived.oldLevelSha256);assert.equal(digest(omitTarget(old)),archived.gameplaySha256);
  assert.deepEqual(omitTarget(current),omitTarget(old));assert.deepEqual(row.level,current);
  assert.equal(digest(row.drags),row.routeSha256);assert.equal(digest(omitTarget(row.level)),row.gameplaySha256);
  assert.deepEqual(api.levelStarTargets(old),archived.oldTargets);
  const target=TARGETS[id],time=archived.oldTargets.timeTargetSeconds;
  assert.equal(target,Math.max(archived.oldTargets.moveTarget,row.drags.length),'Keep reachable old targets; loosen only to the complete route total');
  assert.deepEqual(api.levelStarTargets(current),{moveTarget:target,timeTargetSeconds:time});assert.equal(current.timeSeconds,archived.timeSeconds);
  if(plan.modifiedIds.includes(id)){assert(target>archived.oldTargets.moveTarget);expected[id-1].preservedMoveTarget=target;}
  else assert.equal(target,archived.oldTargets.moveTarget);
  const boundaries=[[target,time,3],[target+1,time,2],[target,time+.001,2],[target+1,time+.001,1]].map(([moves,elapsedSeconds,stars])=>{const r=api.evaluateLevelStars(current,{moves,elapsedSeconds});assert.equal(r.earnedStars,stars);return{moves,elapsedSeconds,stars};});
  rows.push({id,oldMoveTarget:archived.oldTargets.moveTarget,newMoveTarget:target,timeTargetSeconds:time,levelSha256:digest(current),gameplaySha256:row.gameplaySha256,routeSha256:row.routeSha256,lowerBoundRecertified:false,boundaries});
 }
 assert.deepEqual(levels,expected,'All200: only approved scoring fields may change');
 return{passed:true,modifiedIds:plan.modifiedIds,targets:TARGETS,all200Compared:true,otherLevelsPreserved:true,gameplayPreserved:true,historicalFixturePreserved:true,timeTargetsPreserved:true,rows};
}
