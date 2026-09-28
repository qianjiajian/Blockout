// @ts-expect-error Node fixture IO is outside the browser tsconfig.
import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {LEVELS,LEVELS_BEFORE_131_140_REMAKE,getLevelStrict} from '../src/core/levels';
import {REMADE_131_140_IDS,applyRemake131to140} from '../src/core/remake131to140';
import {evaluateLevelStars,levelStarTargets} from '../src/core/levelStarConditions';
import {PuzzleModel} from '../src/core/PuzzleModel';
import type {RevisedSearchDrag} from '../src/core/revisedLevelSearch';
import {matchFormalBlockShapeForLevel} from '../src/game/formalBlockShapes';
import type {LevelSpec} from '../src/core/types';
type Fixture = {rows:{id:number;level:LevelSpec;drags:RevisedSearchDrag[];lowerBound:number;upperBound:number}[]};
const fixture=JSON.parse(readFileSync(new URL('./fixtures/remake131to140-v172.json',import.meta.url),'utf8')) as Fixture;
const beforeStars=JSON.parse(readFileSync(new URL('../deliverables/star-targets131-140-20260927/before-fixture.json',import.meta.url),'utf8')) as Fixture;
const starTargets = [
 {id:131,moveTarget:28,timeTargetSeconds:75},
 {id:132,moveTarget:49,timeTargetSeconds:86},
 {id:133,moveTarget:57,timeTargetSeconds:86},
 {id:134,moveTarget:51,timeTargetSeconds:100},
 {id:135,moveTarget:36,timeTargetSeconds:72},
 {id:136,moveTarget:49,timeTargetSeconds:97},
 {id:137,moveTarget:34,timeTargetSeconds:97},
 {id:138,moveTarget:47,timeTargetSeconds:108},
 {id:139,moveTarget:70,timeTargetSeconds:86},
 {id:140,moveTarget:42,timeTargetSeconds:50},
] as const;
describe('validated 131–140 formal members',()=>{
 it('loads each exact accepted object and leaves every other level unchanged',()=>{
  expect(REMADE_131_140_IDS).toEqual(starTargets.map(r=>r.id));expect(fixture.rows.map(r=>r.id)).toEqual(REMADE_131_140_IDS);expect(LEVELS).toHaveLength(200);
  const thisStage=LEVELS_BEFORE_131_140_REMAKE.map(applyRemake131to140);
  for(const l of LEVELS){expect(getLevelStrict(l.id)).toBe(l);const row=fixture.rows.find(r=>r.id===l.id);if(row)expect(l).toEqual(row.level);else expect(thisStage[l.id-1]).toBe(LEVELS_BEFORE_131_140_REMAKE[l.id-1]);}
 });
 it('changes only the move target and preserves accepted gameplay, route evidence, time targets and native artwork',()=>{
  expect(beforeStars.rows.map(r=>r.id)).toEqual(REMADE_131_140_IDS);
  for(const row of fixture.rows){const l=getLevelStrict(row.id),before=LEVELS_BEFORE_131_140_REMAKE[row.id-1]!;
   const accepted=beforeStars.rows.find(r=>r.id===row.id)!,expected=starTargets.find(t=>t.id===row.id)!;
   expect(row).toEqual({...accepted,level:{...accepted.level,preservedMoveTarget:expected.moveTarget}});
   for(const k of ['width','height','playable','blocked','seams','name','timeSeconds','reward','mechanismRules'] as const)expect(l[k]).toEqual(before[k]);
   expect(levelStarTargets(l)).toEqual({moveTarget:expected.moveTarget,timeTargetSeconds:expected.timeTargetSeconds});
   expect(levelStarTargets(l).timeTargetSeconds).toBe(levelStarTargets(accepted.level).timeTargetSeconds);
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
 it.each(starTargets)('completes the actual Lv$id route at its move target with full inventory and running clocks',({id,moveTarget})=>{
  const row=fixture.rows.find(r=>r.id===id)!,level=getLevelStrict(id),model=new PuzzleModel(structuredClone(level));
  expect(row.drags).toHaveLength(moveTarget);model.startCountdown();let nonClearing=0;
  for(const drag of row.drags){
   model.tick(.02);const before=model.snapshot();model.beginAction();
   for(const point of drag.path){model.tick(.02);expect(model.moveBlockStep(drag.blockId,...point)).toBe(true);}
   if(drag.exitSide)expect(model.tryExit(drag.blockId,drag.exitSide).ok).toBe(true);
   expect(model.commitAction()).toBe(true);const after=model.snapshot();expect(after.failed).toBe(false);
   if(after.cleared===before.cleared)nonClearing++;
  }
  const final=model.snapshot();
  expect(final.complete).toBe(true);expect(final.blocks).toHaveLength(0);expect(final.queuedBlocks).toHaveLength(0);
  for(const generator of final.generators)expect(generator.remaining).toBe(0);
  expect(nonClearing).toBe(row.upperBound);expect(nonClearing).toBeGreaterThanOrEqual(row.lowerBound);
  expect(final.moves).toBe(moveTarget);expect(final.remainingSeconds).toBeLessThan(level.timeSeconds);
  expect(evaluateLevelStars(level,{moves:final.moves,elapsedSeconds:level.timeSeconds-final.remainingSeconds})).toMatchObject({moveAchieved:true,timeAchieved:true,earnedStars:3});
 });
});
