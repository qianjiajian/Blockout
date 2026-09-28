import assert from 'node:assert/strict';
import {digest} from '../revised-preview-validation-v160.mjs';
export {replaySpatial} from '../star-targets141-150/verification.mjs';
export const IDS=[35,36,38,39];
export const TARGETS={35:38,36:31,38:49,39:44};
export const OLD_TARGETS={35:26,36:19,38:41,39:39};
export const TIME_TARGETS={35:43,36:64,38:86,39:115};
export const TOTAL_TIMES={35:60,36:90,38:120,39:160};
export const BEFORE_SHA='b35333c2d7cf38540927694d998d969e4102d787c9acfef77ec42599e8311c7a';
export const FIXTURE='tests/fixtures/native-remake31to40-v147.json';
export const clean=v=>JSON.parse(JSON.stringify(v));
export const omitTarget=level=>{const l=clean(level);delete l.preservedMoveTarget;return l;};

export function validateScoringData(before,fixture,witnesses,levels,api){
 assert.equal(before.ruleVersion,'1.91.0');assert.equal(before.priorLevels.length,200);assert.equal(levels.length,200);
 assert.deepEqual(before.rows.map(r=>r.id),IDS);assert.deepEqual(witnesses.rows.map(r=>r.id),IDS);
 assert.equal(witnesses.beforeSha256,BEFORE_SHA);assert.equal(digest(before.priorLevels),before.campaignSha256);
 assert.deepEqual(fixture,before.fixture,'Historical fixture including old routes must stay byte-semantically unchanged');
 const expected=clean(before.priorLevels),rows=[],targets={};
 for(const id of IDS){
  const old=before.priorLevels[id-1],current=levels[id-1],archived=before.rows.find(r=>r.id===id),oldRow=fixture.rows.find(r=>r.id===id),row=witnesses.rows.find(r=>r.id===id);
  assert.deepEqual(oldRow.level,old);assert.deepEqual(row.level,current);assert.deepEqual(omitTarget(current),omitTarget(old));
  assert.equal(digest(old),archived.oldLevelSha256);assert.equal(digest(omitTarget(old)),archived.gameplaySha256);
  assert.equal(digest(oldRow.drags),archived.routeSha256);assert.equal(oldRow.drags.length,archived.drags);
  assert.equal(digest(row.drags),row.routeSha256);assert.equal(digest(omitTarget(row.level)),row.gameplaySha256);
  if(id===35||id===39)assert.deepEqual(row.drags,oldRow.drags,'Current valid old routes stay exact');
  assert.equal(row.drags.length,TARGETS[id],'Adopted complete-route total must equal the reviewed v1.92 table');targets[id]=row.drags.length;
  assert.deepEqual(api.levelStarTargets(old),{moveTarget:OLD_TARGETS[id],timeTargetSeconds:TIME_TARGETS[id]});
  assert.deepEqual(api.levelStarTargets(current),{moveTarget:targets[id],timeTargetSeconds:TIME_TARGETS[id]});
  assert.equal(current.timeSeconds,TOTAL_TIMES[id]);expected[id-1].preservedMoveTarget=targets[id];
  const boundaries=[{moves:targets[id],elapsedSeconds:TIME_TARGETS[id],stars:3},{moves:targets[id]+1,elapsedSeconds:TIME_TARGETS[id],stars:2},{moves:targets[id],elapsedSeconds:TIME_TARGETS[id]+.001,stars:2},{moves:targets[id]+1,elapsedSeconds:TIME_TARGETS[id]+.001,stars:1}].map(c=>{const r=api.evaluateLevelStars(current,c);assert.equal(r.earnedStars,c.stars);return{...c,result:r};});
  rows.push({id,oldMoveTarget:OLD_TARGETS[id],newMoveTarget:targets[id],timeTargetSeconds:TIME_TARGETS[id],levelSha256:digest(current),gameplaySha256:row.gameplaySha256,oldRouteSha256:archived.routeSha256,routeSha256:row.routeSha256,routeUpdated:row.routeSha256!==archived.routeSha256,boundaries});
 }
 assert.deepEqual(levels,expected,'All200: only four approved preservedMoveTarget fields may change');
 return{passed:true,modifiedIds:IDS,targets,all200Compared:true,other196Preserved:true,gameplayPreserved:true,historicalFixturePreserved:true,timeTargetsPreserved:true,rows};
}
