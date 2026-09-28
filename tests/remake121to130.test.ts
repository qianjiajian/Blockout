// @ts-expect-error Node fixture IO is outside the browser tsconfig.
import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {LEVELS,LEVELS_BEFORE_121_130_REMAKE,getLevelStrict} from '../src/core/levels';
import {REMADE_121_130_IDS,applyRemake121to130} from '../src/core/remake121to130';
import {evaluateLevelStars,levelStarTargets} from '../src/core/levelStarConditions';
import {PuzzleModel} from '../src/core/PuzzleModel';
import {matchFormalBlockShapeForLevel} from '../src/game/formalBlockShapes';
import type {LevelSpec} from '../src/core/types';
import type {RevisedSearchDrag} from '../src/core/revisedLevelSearch';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/remake121to130-v146.json',import.meta.url),'utf8')) as {rows:{id:number;level:LevelSpec;drags:RevisedSearchDrag[];lowerBound:number;upperBound:number}[]};
const revisedStarTargets = [
 {id:122,moveTarget:49,timeTargetSeconds:64,timeSeconds:90},
 {id:126,moveTarget:61,timeTargetSeconds:79,timeSeconds:110},
 {id:127,moveTarget:41,timeTargetSeconds:86,timeSeconds:120},
] as const;
const unchangedStarTargets = [
 {id:121,moveTarget:81,timeTargetSeconds:86},
 {id:123,moveTarget:69,timeTargetSeconds:61},
 {id:124,moveTarget:47,timeTargetSeconds:68},
 {id:125,moveTarget:47,timeTargetSeconds:57},
 {id:128,moveTarget:74,timeTargetSeconds:57},
 {id:129,moveTarget:64,timeTargetSeconds:118},
 {id:130,moveTarget:49,timeTargetSeconds:61},
] as const;
describe('source-reviewed121–130 formal adoption',()=>{
 it('selects certified objects and preserves every other object through this stage',()=>{
  expect(LEVELS).toHaveLength(200);expect(REMADE_121_130_IDS).toEqual(fixture.rows.map(r=>r.id));
  for(const before of LEVELS_BEFORE_121_130_REMAKE){const row=fixture.rows.find(r=>r.id===before.id),atStage=applyRemake121to130(before);if(row){expect(atStage).toEqual(row.level);expect(getLevelStrict(row.id)).toBe(atStage);}else expect(atStage).toBe(before);}
 });
 it('preserves geometry and time targets with only the three authorized move targets revised',()=>{
  for(const row of fixture.rows){const l=getLevelStrict(row.id),before=LEVELS_BEFORE_121_130_REMAKE[row.id-1]!;
   for(const k of ['width','height','playable','blocked','seams','name','timeSeconds','reward','parMoves','mechanismRules'] as const)expect(l[k]).toEqual(before[k]);
   const revised=revisedStarTargets.find(t=>t.id===row.id);
   expect(levelStarTargets(l)).toEqual(revised?{moveTarget:revised.moveTarget,timeTargetSeconds:revised.timeTargetSeconds}:levelStarTargets(before));
   expect(levelStarTargets(l).timeTargetSeconds).toBe(levelStarTargets(before).timeTargetSeconds);
   for(const b of l.blocks)expect(matchFormalBlockShapeForLevel(b.shape,l.id)?.quarterTurns).toBe(0);
  }
 });
 it('keeps the other seven move and time star targets unchanged',()=>{
  for(const {id,moveTarget,timeTargetSeconds} of unchangedStarTargets)expect(levelStarTargets(getLevelStrict(id))).toEqual({moveTarget,timeTargetSeconds});
 });
 it.each(revisedStarTargets)('scores inclusive move and time boundaries independently for Lv$id',({id,moveTarget,timeTargetSeconds,timeSeconds})=>{
  const level=getLevelStrict(id);
  expect(level.timeSeconds).toBe(timeSeconds);
  expect(levelStarTargets(level)).toEqual({moveTarget,timeTargetSeconds});
  expect(evaluateLevelStars(level,{moves:moveTarget,elapsedSeconds:timeTargetSeconds})).toMatchObject({moveAchieved:true,timeAchieved:true,earnedStars:3});
  expect(evaluateLevelStars(level,{moves:moveTarget+1,elapsedSeconds:timeTargetSeconds})).toMatchObject({moveAchieved:false,timeAchieved:true,earnedStars:2});
  expect(evaluateLevelStars(level,{moves:moveTarget,elapsedSeconds:timeTargetSeconds+1})).toMatchObject({moveAchieved:true,timeAchieved:false,earnedStars:2});
  expect(evaluateLevelStars(level,{moves:moveTarget+1,elapsedSeconds:timeTargetSeconds+1})).toMatchObject({moveAchieved:false,timeAchieved:false,earnedStars:1});
 });
 it('executes every complete route with the full physical inventory and actual bomb fields',()=>{
  for(const row of fixture.rows){const m=new PuzzleModel(structuredClone(getLevelStrict(row.id)));m.startCountdown();let nonClearing=0;
   for(const d of row.drags){m.tick(.02);const before=m.snapshot();m.beginAction();for(const p of d.path){m.tick(.02);expect(m.moveBlockStep(d.blockId,...p)).toBe(true);}if(d.exitSide)expect(m.tryExit(d.blockId,d.exitSide).ok).toBe(true);expect(m.commitAction()).toBe(true);const after=m.snapshot();expect(after.failed).toBe(false);if(after.cleared===before.cleared)nonClearing++;}
   expect(m.snapshot().complete).toBe(true);expect(nonClearing).toBe(row.upperBound);expect(nonClearing).toBeGreaterThanOrEqual(row.lowerBound);
   const revised=revisedStarTargets.find(t=>t.id===row.id);
   if(revised){
    expect(row.drags).toHaveLength(revised.moveTarget);expect(m.snapshot().moves).toBe(revised.moveTarget);
    expect(evaluateLevelStars(getLevelStrict(row.id),{moves:m.snapshot().moves,elapsedSeconds:revised.timeTargetSeconds})).toMatchObject({moveAchieved:true,timeAchieved:true,earnedStars:3});
   }
  }
 });
});
