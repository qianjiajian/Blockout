// @ts-expect-error Node fixture IO is outside the browser tsconfig.
import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
// This fixture certifies the v1.78 stage. v1.90 changes Lv150's flip timing;
// its new final-profile route is verified independently, not by relabelling this witness.
import {LEVELS_BEFORE_FROZEN_FLIP as LEVELS,LEVELS_BEFORE_141_150_REMAKE} from '../src/core/levels';
import {REMADE_141_150_IDS,applyRemake141to150} from '../src/core/remake141to150';
import {evaluateLevelStars,levelStarTargets} from '../src/core/levelStarConditions';
import {PuzzleModel} from '../src/core/PuzzleModel';
import {matchFormalBlockShapeForLevel} from '../src/game/formalBlockShapes';
import type {LevelSpec} from '../src/core/types';
import type {RevisedSearchDrag} from '../src/core/revisedLevelSearch';
const getLevelStrict=(id:number):LevelSpec=>LEVELS.find(level=>level.id===id)!;
const fixture=JSON.parse(readFileSync(new URL('./fixtures/remake141to150-v173.json',import.meta.url),'utf8')) as {rows:{id:number;level:LevelSpec;drags:RevisedSearchDrag[];lowerBound:number;upperBound:number}[]};
const starTargets = [
 {id:141,moveTarget:48,timeTargetSeconds:129},
 {id:142,moveTarget:51,timeTargetSeconds:108},
 {id:143,moveTarget:57,timeTargetSeconds:93},
 {id:144,moveTarget:31,timeTargetSeconds:97},
 {id:145,moveTarget:38,timeTargetSeconds:57},
 {id:146,moveTarget:54,timeTargetSeconds:57},
 {id:147,moveTarget:55,timeTargetSeconds:144},
 {id:148,moveTarget:44,timeTargetSeconds:93},
 {id:149,moveTarget:56,timeTargetSeconds:100},
 {id:150,moveTarget:26,timeTargetSeconds:108},
] as const;
describe('source-reviewed141–150 formal adoption',()=>{
 it('selects certified objects and preserves every other object through this stage',()=>{
  expect(LEVELS).toHaveLength(200);expect(REMADE_141_150_IDS).toEqual(fixture.rows.map(r=>r.id));
  for(const before of LEVELS_BEFORE_141_150_REMAKE){const row=fixture.rows.find(r=>r.id===before.id),atStage=applyRemake141to150(before);if(row){expect(atStage).toEqual(row.level);expect(getLevelStrict(row.id)).toBe(atStage);}else expect(atStage).toBe(before);}
 });
 it('preserves geometry and time targets while applying v1.78 move targets and unrotated whole-block art',()=>{
  for(const row of fixture.rows){const l=getLevelStrict(row.id),before=LEVELS_BEFORE_141_150_REMAKE[row.id-1]!;
   for(const k of ['width','height','playable','blocked','seams','name','timeSeconds','reward','mechanismRules'] as const)expect(l[k]).toEqual(before[k]);
   const expected=starTargets.find(t=>t.id===row.id)!;
   expect(levelStarTargets(l)).toEqual({moveTarget:expected.moveTarget,timeTargetSeconds:expected.timeTargetSeconds});
   expect(levelStarTargets(l).timeTargetSeconds).toBe(levelStarTargets(before).timeTargetSeconds);
   for(const b of l.blocks)expect(matchFormalBlockShapeForLevel(b.shape,l.id)?.quarterTurns).toBe(0);
  }
 });
 it.each(starTargets)('scores inclusive move/time boundaries independently for Lv$id',({id,moveTarget,timeTargetSeconds})=>{
  const level=getLevelStrict(id);
  expect(evaluateLevelStars(level,{moves:moveTarget,elapsedSeconds:timeTargetSeconds})).toMatchObject({moveAchieved:true,timeAchieved:true,earnedStars:3});
  expect(evaluateLevelStars(level,{moves:moveTarget+1,elapsedSeconds:timeTargetSeconds})).toMatchObject({moveAchieved:false,timeAchieved:true,earnedStars:2});
  expect(evaluateLevelStars(level,{moves:moveTarget,elapsedSeconds:timeTargetSeconds+1})).toMatchObject({moveAchieved:true,timeAchieved:false,earnedStars:2});
  expect(evaluateLevelStars(level,{moves:moveTarget+1,elapsedSeconds:timeTargetSeconds+1})).toMatchObject({moveAchieved:false,timeAchieved:false,earnedStars:1});
  expect(evaluateLevelStars(level,{moves:moveTarget,elapsedSeconds:timeTargetSeconds+.01})).toMatchObject({timeAchieved:false,elapsedSeconds:timeTargetSeconds+1,earnedStars:2});
 });
 it('executes every complete route with the full physical inventory and actual bomb fields',()=>{
  for(const row of fixture.rows){const m=new PuzzleModel(structuredClone(getLevelStrict(row.id)));m.startCountdown();let nonClearing=0;
   for(const d of row.drags){m.tick(.02);const before=m.snapshot();m.beginAction();for(const p of d.path){m.tick(.02);expect(m.moveBlockStep(d.blockId,...p)).toBe(true);}if(d.exitSide)expect(m.tryExit(d.blockId,d.exitSide).ok).toBe(true);expect(m.commitAction()).toBe(true);const after=m.snapshot();expect(after.failed).toBe(false);if(after.cleared===before.cleared)nonClearing++;}
   expect(m.snapshot().complete).toBe(true);expect(nonClearing).toBe(row.upperBound);expect(nonClearing).toBeGreaterThanOrEqual(row.lowerBound);
   const level=getLevelStrict(row.id),expected=starTargets.find(t=>t.id===row.id)!;
   expect(row.drags).toHaveLength(expected.moveTarget);expect(m.snapshot().moves).toBe(expected.moveTarget);
   expect(evaluateLevelStars(level,{moves:m.snapshot().moves,elapsedSeconds:level.timeSeconds-m.snapshot().remainingSeconds})).toMatchObject({moveAchieved:true,timeAchieved:true,earnedStars:3});
  }
 });
});
