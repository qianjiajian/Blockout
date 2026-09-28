// @ts-expect-error Node fixture IO is outside the browser tsconfig.
import {readFileSync} from 'node:fs';
// @ts-expect-error Node fixture hashing is outside the browser tsconfig.
import {createHash} from 'node:crypto';
import {describe,it,expect} from 'vitest';
import {LEVELS,LEVELS_BEFORE_101_110_REMAKE,LEVELS_BEFORE_AXIS_RECTANGULAR_REPAIR,getLevelStrict} from '../src/core/levels';
import {REMADE_101_110_IDS,applyRemake101to110} from '../src/core/remake101to110';
import {evaluateLevelStars,levelStarTargets} from '../src/core/levelStarConditions';
import {replayRevisedRoute,type RevisedSearchDrag} from '../src/core/revisedLevelSearch';
import {matchFormalBlockShapeForLevel} from '../src/game/formalBlockShapes';
import type {LevelSpec} from '../src/core/types';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/remake101to110-v147.json',import.meta.url),'utf8')) as {rows:{id:number;level:LevelSpec;drags:RevisedSearchDrag[];lowerBound:number|null;upperBound:number;acceptanceMode?:string;originalDifficultyBandValidated?:boolean}[]};
const taskRoot='../deliverables/star-targets101-110-20260927/';
const plan=JSON.parse(readFileSync(new URL(taskRoot+'plan.json',import.meta.url),'utf8')) as {targets:Record<number,number>;modifiedIds:number[]};
const witnesses=JSON.parse(readFileSync(new URL(taskRoot+'route-witnesses.json',import.meta.url),'utf8')) as {rows:{id:number;level:LevelSpec;drags:RevisedSearchDrag[];currentRouteNonClearingDrags:number}[]};
const originalTimes:Record<number,number>={101:129,102:57,103:64,104:90,105:75,106:64,107:79,108:129,109:79,110:97};
const expectedStage=(historical:LevelSpec):LevelSpec=>{
 const level=structuredClone(historical);if(plan.modifiedIds.includes(level.id))level.preservedMoveTarget=plan.targets[level.id];return level;
};
const expectedCurrent=(historical:LevelSpec):LevelSpec=>{
 const level=expectedStage(historical);
 // Preserve the exact existing axis repair; scoring never restores the old axis.
 if(level.id===101){delete level.blocks.find(b=>b.id==='r147-101-cover4-9')!.movementAxis;level.blocks.find(b=>b.id==='r147-101-opening-5')!.movementAxis='horizontal';}
 return level;
};
describe('101–110 adoption, existing axis repair and current reachable star targets',()=>{
 it('uses the reviewed objects through the final selector and preserves every other object at this stage',()=>{
  expect(REMADE_101_110_IDS).toEqual(Array.from({length:10},(_,i)=>101+i));expect(REMADE_101_110_IDS).toEqual(fixture.rows.map(r=>r.id));expect(LEVELS).toHaveLength(200);
  for(const before of LEVELS_BEFORE_101_110_REMAKE){const row=fixture.rows.find(r=>r.id===before.id),atStage=applyRemake101to110(before);expect(atStage).toBe(LEVELS_BEFORE_AXIS_RECTANGULAR_REPAIR[before.id-1]);if(row){expect(atStage).toEqual(expectedStage(row.level));expect(getLevelStrict(row.id)).toEqual(expectedCurrent(row.level));}else expect(atStage).toBe(before);}
 });
 it('keeps the old fixture, exact gameplay and time conditions, including level 5 legacy art',()=>{
  expect(createHash('sha256').update(readFileSync(new URL('./fixtures/remake101to110-v147.json',import.meta.url))).digest('hex')).toBe('8e18d2d2541d8e3a612647322f26847557661968d37b206bd84822d6867ca3e7');
  for(const row of fixture.rows){const current=getLevelStrict(row.id),before=LEVELS_BEFORE_101_110_REMAKE[row.id-1]!;
   for(const k of ['id','name','width','height','playable','blocked','seams','timeSeconds','reward','mechanismRules'] as const)expect(current[k]).toEqual(before[k]);
   expect(current.parMoves).toEqual(row.level.parMoves);expect(current.difficulty).toBe(row.level.difficulty);
   expect(levelStarTargets(current)).toEqual({moveTarget:plan.targets[row.id],timeTargetSeconds:originalTimes[row.id]});for(const b of current.blocks)expect(matchFormalBlockShapeForLevel(b.shape,current.id)?.quarterTurns).toBe(0);
  }
  const fifth=getLevelStrict(5);expect(fifth.blocks.filter(b=>matchFormalBlockShapeForLevel(b.shape,5)?.quarterTurns!==0)).toHaveLength(3);
 });
 it.each(Array.from({length:10},(_,i)=>101+i))('replays the current complete unassisted route for %i without recertifying old lower bounds',id=>{
  const row=witnesses.rows.find(r=>r.id===id)!;expect(getLevelStrict(id)).toEqual(row.level);
  const replay=replayRevisedRoute(getLevelStrict(id),row.drags);expect(replay.valid,replay.error).toBe(true);expect(replay.complete).toBe(true);expect(replay.effectiveDrags).toBe(row.drags.length);expect(replay.nonClearingDrags).toBe(row.currentRouteNonClearingDrags);expect(replay.effectiveDrags).toBeLessThanOrEqual(plan.targets[id]!);
 });
 it.each(Array.from({length:10},(_,i)=>101+i))('awards stars at the inclusive move/time boundary for %i',id=>{
  const level=getLevelStrict(id),m=plan.targets[id]!,t=originalTimes[id]!;
  expect(evaluateLevelStars(level,{moves:m,elapsedSeconds:t}).earnedStars).toBe(3);
  expect(evaluateLevelStars(level,{moves:m+1,elapsedSeconds:t}).earnedStars).toBe(2);
  expect(evaluateLevelStars(level,{moves:m,elapsedSeconds:t+.001}).earnedStars).toBe(2);
  expect(evaluateLevelStars(level,{moves:m+1,elapsedSeconds:t+.001}).earnedStars).toBe(1);
 });
 it('retains the two explicit difficulty exceptions without upgrading their old records',()=>{
  for(const id of [102,109]){const row=fixture.rows.find(r=>r.id===id)!;expect(row.lowerBound).toBeNull();expect(row.acceptanceMode).toBe('USER_ACCEPTED_BELOW_ORIGINAL_BAND');expect(row.originalDifficultyBandValidated).toBe(false);}
 });
});
