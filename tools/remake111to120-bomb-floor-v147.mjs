import assert from 'node:assert/strict';
import {digest} from './revised-preview-validation-v160.mjs';
import {checkSymmetryFloor} from './remake21to30-symmetry-floor-v139.mjs';
import {compileLevel} from './remake21to30-mask-floor.mjs';

// Successful timed traces are a subset of deadline-free traces. Erasing only
// timedBombSeconds changes neither occupied cells nor clear/peel counters, ice,
// shell colours or gate geometry. Each successful gesture therefore maps at
// identical reposition cost. The target graph also permits optional exit
// contact, an existing qualified relaxation. This proves only a lower bound;
// actual deadline feasibility must be checked on the unmodified candidate.
export function projectBombDeadlines(level,api){
 api.validateLevel(level);assert.equal(level.id,120,'Qualified for the bomb introduction at Lv120');
 assert.equal(level.mechanismRules,'revised-2026-09-23-v1.4');
 const projected=structuredClone(level),removed=[];
 for(const b of projected.blocks)if(b.timedBombSeconds!==undefined){
  assert(Number.isFinite(b.timedBombSeconds)&&b.timedBombSeconds>0);
  removed.push({id:b.id,seconds:b.timedBombSeconds});delete b.timedBombSeconds;
 }
 assert(removed.length,'An actual bomb is required');
 api.validateLevel(projected);compileLevel(projected);
 return {level:projected,removed,sourceLevelSha256:digest(level),projectedLevelSha256:digest(projected)};
}
export function checkBombFloor(level,api,options={}){
 let projection;
 try{projection=projectBombDeadlines(level,api);}catch(e){return {status:'unsupported',thresholdProven:false,reason:e.message};}
 const proof=checkSymmetryFloor(projection.level,options);
 return {...proof,underlyingAbstraction:proof.abstraction,abstraction:'v147-lv120-deadline-erasure-plus-qualified-mask-symmetry',
  sourceLevelSha256:projection.sourceLevelSha256,projectedLevelSha256:projection.projectedLevelSha256,
  removedDeadlines:projection.removed,solvabilityValidated:false,timeValidated:false,pointerReplayValidated:false,adoptionReady:false};
}
