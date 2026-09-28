import assert from 'node:assert/strict';
import {digest} from '../revised-preview-validation-v160.mjs';
export {replaySpatial} from '../star-targets141-150/verification.mjs';

export const IDS=[52,54,55,56,58,59];
export const TARGETS={52:45,54:48,55:34,56:40,58:41,59:51};
export const OLD_TARGETS={52:30,54:37,55:25,56:33,58:38,59:41};
export const TIME_TARGETS={52:75,54:129,55:129,56:97,58:90,59:129};
export const TOTAL_TIMES={52:105,54:180,55:180,56:135,58:125,59:180};
export const BEFORE_SHA='9c247849b9d54f77c93c1b2df3852e9f9bae6cd7aeaf311d9ea2b15b7db6b379';
export const FIXTURE='tests/fixtures/native-remake51to60-v153.json';
export const clean=v=>JSON.parse(JSON.stringify(v));
export const omitTarget=level=>{const l=clean(level);delete l.preservedMoveTarget;return l;};

export function validateScoringData(before,fixture,witnesses,levels,api){
 assert.equal(before.ruleVersion,'1.93.0');
 assert.equal(before.priorLevels.length,200);assert.equal(levels.length,200);
 assert.deepEqual(before.rows.map(r=>r.id),IDS);assert.deepEqual(witnesses.rows.map(r=>r.id),IDS);
 assert.equal(witnesses.beforeSha256,BEFORE_SHA);assert.equal(digest(before.priorLevels),before.campaignSha256);
 assert.deepEqual(fixture,before.fixture,'Historical fixture, routes and difficulty records must remain unchanged');
 const expected=clean(before.priorLevels),rows=[],targets={};
 for(const id of IDS){
  const old=before.priorLevels[id-1],current=levels[id-1],archived=before.rows.find(r=>r.id===id),oldRow=fixture.rows.find(r=>r.id===id),row=witnesses.rows.find(r=>r.id===id);
  // The immutable fixture predates three known movementAxis edits. Require those
  // exact historical differences; the score-only task must not add any others.
  const priorFromFixture=clean(oldRow.level);
  if(id===54){const b=priorFromFixture.blocks.find(b=>b.id==='s54-13-blue-axis');assert.equal(b.movementAxis,'horizontal');delete b.movementAxis;}
  if(id===56){const a=priorFromFixture.blocks.find(b=>b.id==='s56-o1'),b=priorFromFixture.blocks.find(b=>b.id==='s56-o2');assert.equal(a.movementAxis,undefined);assert.equal(b.movementAxis,'horizontal');a.movementAxis='horizontal';delete b.movementAxis;}
  assert.deepEqual(priorFromFixture,old,'Only the separately audited historical axis differences may precede this scoring task');
  assert.deepEqual(row.level,current);assert.deepEqual(omitTarget(current),omitTarget(old));
  assert.equal(digest(old),archived.oldLevelSha256);assert.equal(digest(omitTarget(old)),archived.gameplaySha256);
  assert.equal(digest(oldRow.drags),archived.routeSha256);assert.equal(oldRow.drags.length,archived.drags);
  assert.equal(digest(row.drags),row.routeSha256);assert.equal(digest(omitTarget(row.level)),row.gameplaySha256);
  assert.deepEqual(row.drags,oldRow.drags,'Freshly valid existing routes must remain exact');
  assert.equal(row.drags.length,TARGETS[id],'Target must equal the adopted complete route total, without claiming optimality');targets[id]=row.drags.length;
  assert.deepEqual(api.levelStarTargets(old),{moveTarget:OLD_TARGETS[id],timeTargetSeconds:TIME_TARGETS[id]});
  assert.deepEqual(api.levelStarTargets(current),{moveTarget:targets[id],timeTargetSeconds:TIME_TARGETS[id]});
  assert.equal(current.timeSeconds,TOTAL_TIMES[id]);expected[id-1].preservedMoveTarget=targets[id];
  const boundaries=[{moves:targets[id],elapsedSeconds:TIME_TARGETS[id],stars:3},{moves:targets[id]+1,elapsedSeconds:TIME_TARGETS[id],stars:2},{moves:targets[id],elapsedSeconds:TIME_TARGETS[id]+.001,stars:2},{moves:targets[id]+1,elapsedSeconds:TIME_TARGETS[id]+.001,stars:1}].map(c=>{const r=api.evaluateLevelStars(current,c);assert.equal(r.earnedStars,c.stars);return{...c,result:r};});
  rows.push({id,oldMoveTarget:OLD_TARGETS[id],newMoveTarget:targets[id],timeTargetSeconds:TIME_TARGETS[id],levelSha256:digest(current),gameplaySha256:row.gameplaySha256,routeSha256:row.routeSha256,routeUpdated:false,historicalAxisDifference:id===54||id===56,lowerBoundRecertified:false,boundaries});
 }
 assert.deepEqual(levels,expected,'All200: only six approved preservedMoveTarget fields may change');
 return{passed:true,modifiedIds:IDS,targets,all200Compared:true,other194Preserved:true,gameplayPreserved:true,historicalFixturePreserved:true,timeTargetsPreserved:true,rows};
}
