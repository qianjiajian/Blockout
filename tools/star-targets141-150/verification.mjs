import assert from 'node:assert/strict';
import {digest} from '../revised-preview-validation-v160.mjs';

export const IDS=Array.from({length:10},(_,i)=>141+i);
const keyed=values=>Object.fromEntries(IDS.map((id,i)=>[id,values[i]]));
export const TARGETS=keyed([48,51,57,31,38,54,55,44,56,26]);
export const OLD_TARGETS=keyed([58,51,66,56,44,41,53,57,78,30]);
export const TIME_TARGETS=keyed([129,108,93,97,57,57,144,93,100,108]);
export const RULE_FILE='docs/rules/mechanism-rules-v1.78.0.md';
export const RULE_SHA='1fdb4943f7449831d984ce876f9e08e3a24480f4397a9bf37bad8d92e63a30d6';
export const BEFORE_SHA='aea847914a1d17a200763ffc9b5fe2147494311850179311a491df36c4718679';
export const BEFORE_WRITE_SHA='cf88fae881e5c79e138c655c49ace299d654f9adfb9bdf5c4a95077588c9440b';
const clean=v=>JSON.parse(JSON.stringify(v));
const gameplay=level=>{const l=clean(level);delete l.preservedMoveTarget;return l;};

export function validateScoringData(before,fixture,levels,api){
  assert.equal(before.ruleVersion,'1.77.0');
  assert.equal(before.priorLevels.length,200);
  assert.deepEqual(before.rows.map(r=>r.id),IDS);
  assert.deepEqual(before.fixture.rows.map(r=>r.id),IDS);
  assert.deepEqual(fixture.rows.map(r=>r.id),IDS);
  assert.equal(digest(before.priorLevels),before.campaignSha256);
  const expected=clean(before.priorLevels),expectedFixture=clean(before.fixture),rows=[];
  for(const id of IDS){
    const archived=before.rows.find(r=>r.id===id),old=before.priorLevels[id-1],current=levels[id-1];
    const oldRow=before.fixture.rows.find(r=>r.id===id),row=fixture.rows.find(r=>r.id===id);
    assert.deepEqual(oldRow.level,old);
    assert.equal(digest(old),archived.oldLevelSha256);
    assert.equal(digest(gameplay(old)),archived.gameplaySha256);
    assert.equal(digest(oldRow.drags),archived.routeSha256);
    assert.equal(oldRow.drags.length,archived.drags);
    assert.deepEqual(archived.oldTargets,{moveTarget:OLD_TARGETS[id],timeTargetSeconds:TIME_TARGETS[id]});
    assert.deepEqual(archived.newTargets,{moveTarget:TARGETS[id],timeTargetSeconds:TIME_TARGETS[id]});
    assert.deepEqual(api.levelStarTargets(old),archived.oldTargets);
    assert.deepEqual(api.levelStarTargets(current),archived.newTargets);
    assert.deepEqual(gameplay(current),gameplay(old));
    assert.deepEqual(row.drags,oldRow.drags);assert.equal(row.drags.length,TARGETS[id]);
    if(id!==142){expected[id-1].preservedMoveTarget=TARGETS[id];expectedFixture.rows.find(r=>r.id===id).level.preservedMoveTarget=TARGETS[id];}
    // The existing inclusive move boundary and ceiling-based time boundary
    // must agree at equality, immediately beyond it, and when both are missed.
    const boundaryCases=[
      {moves:TARGETS[id],elapsedSeconds:TIME_TARGETS[id],stars:3,move:true,time:true},
      {moves:TARGETS[id]+1,elapsedSeconds:TIME_TARGETS[id],stars:2,move:false,time:true},
      {moves:TARGETS[id],elapsedSeconds:TIME_TARGETS[id]+.001,stars:2,move:true,time:false},
      {moves:TARGETS[id]+1,elapsedSeconds:TIME_TARGETS[id]+.001,stars:1,move:false,time:false},
    ].map(c=>{const r=api.evaluateLevelStars(current,c);assert.equal(r.earnedStars,c.stars);assert.equal(r.moveAchieved,c.move);assert.equal(r.timeAchieved,c.time);return{moves:c.moves,elapsedSeconds:c.elapsedSeconds,earnedStars:r.earnedStars};});
    rows.push({id,changed:id!==142,oldLevelSha256:archived.oldLevelSha256,currentLevelSha256:digest(current),gameplaySha256:digest(gameplay(current)),routeSha256:digest(row.drags),boundaryCases});
  }
  const differences=levels.flatMap((l,i)=>digest(l)===digest(expected[i])?[]:[{id:l.id,expectedSha256:digest(expected[i]),actualSha256:digest(l)}]);
  assert.deepEqual(differences,[],'Only the nine authorized scoring fields may change before the captured input run');
  assert.deepEqual(fixture,expectedFixture,'All old routes, bounds, candidate references and non-scoring fixture fields must remain exact');
  assert.deepEqual(levels[141],before.priorLevels[141],'142 requires no field addition or rewrite');
  return{passed:true,all200Compared:true,modifiedIds:IDS.filter(id=>id!==142),unchanged142:true,routeAndGameplayPreserved:true,lowerBoundsRecomputed:false,rows};
}

// Validate the ordinary release policy with the existing spatial replay, then
// replay all real bomb-bearing inventory in the unchanged current model with
// no time advance. Live deadlines are checked by the separate observed-tick
// replay; this helper is explicitly not a time or difficulty certificate.
export function replaySpatial(level,drags,api){
  const projection=structuredClone(level);
  for(const block of projection.blocks)delete block.timedBombSeconds;
  const valid=api.replayRevisedRoute(projection,drags);
  if(!valid.valid)return valid;
  const model=new api.PuzzleModel(structuredClone(level));model.startCountdown();
  for(const drag of drags){
    model.beginAction();
    for(const position of drag.path)assert(model.moveBlockStep(drag.blockId,...position));
    if(drag.exitSide)assert(model.tryExit(drag.blockId,drag.exitSide).ok);
    assert(model.commitAction());
  }
  const {moves,...state}=model.snapshot();
  assert.equal(moves,valid.effectiveDrags);
  assert.equal(state.complete,valid.complete);assert(!state.failed);
  return{...valid,finalStateKey:JSON.stringify(state),timeValidated:false,lowerBoundCertified:false};
}
