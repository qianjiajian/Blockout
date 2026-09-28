// @ts-expect-error Node fixture IO is outside the browser tsconfig.
import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {LEVELS,LEVELS_BEFORE_31_40_NATIVE_REMAKE,getLevelStrict} from '../src/core/levels';
import {NATIVE_REMAKE31_40_IDS,applyNativeRemake31to40} from '../src/core/nativeRemake31to40';
import {evaluateLevelStars,levelStarTargets} from '../src/core/levelStarConditions';
import {validateLevel} from '../src/core/PuzzleModel';
import {replayRevisedRoute,type RevisedSearchDrag} from '../src/core/revisedLevelSearch';
import {matchFormalBlockShapeForLevel} from '../src/game/formalBlockShapes';
import type {LevelSpec} from '../src/core/types';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/native-remake31to40-v147.json',import.meta.url),'utf8')) as {
 ruleVersion:string;rows:{id:number;level:LevelSpec;drags:RevisedSearchDrag[];lowerBound:number;upperBound:number}[];
};
const difficulty=['easy','normal','normal','hard','easy','easy','normal','hard','easy','normal'];
const bounds:Record<string,[number,number]>={easy:[5,10],normal:[11,15],hard:[16,20]};
const starRevision=[
 {id:35,moveTarget:38,timeTargetSeconds:43,timeSeconds:60},
 {id:36,moveTarget:31,timeTargetSeconds:64,timeSeconds:90},
 {id:38,moveTarget:49,timeTargetSeconds:86,timeSeconds:120},
 {id:39,moveTarget:44,timeTargetSeconds:115,timeSeconds:160},
] as const;
// Preserve the v1.47 fixture and its historical evidence. Current sweep-valid
// witnesses are separate; changing a score does not certify a difficulty floor.
const witnesses=JSON.parse(readFileSync(new URL('../deliverables/star-targets31-40-20260927/route-witnesses.json',import.meta.url),'utf8')) as {
 rows:{id:number;level:LevelSpec;drags:RevisedSearchDrag[];currentRouteNonClearingDrags:number;withinHistoricalDifficultyUpperBand:boolean}[];
};
describe('accepted 31–40 native sprite remakes',()=>{
 it('installs only reviewed IDs and keeps every other object at this historical stage',()=>{
  expect(fixture.ruleVersion).toBe('1.47.0');expect(fixture.rows.map(r=>r.id)).toEqual(NATIVE_REMAKE31_40_IDS);
  expect(LEVELS).toHaveLength(200);expect(NATIVE_REMAKE31_40_IDS.every(id=>id>=31&&id<=40)).toBe(true);
  const thisStage=LEVELS_BEFORE_31_40_NATIVE_REMAKE.map(applyNativeRemake31to40);
  for(const [i,l]of LEVELS.entries()){
   expect(getLevelStrict(i+1)).toBe(l);expect(l.id).toBe(i+1);
   if(!NATIVE_REMAKE31_40_IDS.includes(l.id))expect(thisStage[i]).toBe(LEVELS_BEFORE_31_40_NATIVE_REMAKE[i]);
  }
  expect(thisStage.slice(0,30)).toEqual(LEVELS_BEFORE_31_40_NATIVE_REMAKE.slice(0,30));
 });
 for(const r of fixture.rows)it(`Lv${r.id} preserves gameplay and completes its current full route with the authorized score`,()=>{
  const level=getLevelStrict(r.id),before=LEVELS_BEFORE_31_40_NATIVE_REMAKE[r.id-1]!;
  const revised=starRevision.find(s=>s.id===r.id),witness=witnesses.rows.find(s=>s.id===r.id);
  expect(level).toEqual(revised?{...r.level,preservedMoveTarget:revised.moveTarget}:r.level);expect(()=>validateLevel(level)).not.toThrow();
  for(const key of ['width','height','playable','blocked','seams','id','name','timeSeconds','reward','parMoves'] as const)expect(level[key]).toEqual(before[key]);
  expect(levelStarTargets(level)).toEqual(revised?{moveTarget:revised.moveTarget,timeTargetSeconds:revised.timeTargetSeconds}:levelStarTargets(before));expect(level.difficulty).toBe(difficulty[r.id-31]);
  for(const block of level.blocks)expect(matchFormalBlockShapeForLevel(block.shape,level.id)?.quarterTurns,block.id).toBe(0);
  const [min,max]=bounds[level.difficulty]!;expect(r.lowerBound).toBeGreaterThanOrEqual(min);expect(r.upperBound).toBeLessThanOrEqual(max);
  // The preceding bounds are historical metadata, not a fresh certification.
  // Lv36's old U10 route now fails the full-shape exit sweep. Its new U11
  // witness is complete, but does not satisfy the preserved easy upper band.
  const drags=witness?.drags??r.drags;
  expect(replayRevisedRoute(level,drags)).toMatchObject({valid:true,complete:true,effectiveDrags:drags.length,nonClearingDrags:r.id===36?11:r.upperBound});
  expect(drags.length).toBeLessThanOrEqual(levelStarTargets(level).moveTarget);
  if(witness){expect(witness.level).toEqual(level);expect(witness.withinHistoricalDifficultyUpperBand).toBe(r.id!==36);expect(witness.currentRouteNonClearingDrags).toBe(r.id===36?11:r.upperBound);}
  if(revised)expect(drags).toHaveLength(revised.moveTarget);
 });
 it.each(starRevision)('scores inclusive thresholds and independent over-limit boundaries for Lv$id',({id,moveTarget,timeTargetSeconds,timeSeconds})=>{
  const level=getLevelStrict(id);expect(level.timeSeconds).toBe(timeSeconds);
  expect(levelStarTargets(level)).toEqual({moveTarget,timeTargetSeconds});
  expect(evaluateLevelStars(level,{moves:moveTarget,elapsedSeconds:timeTargetSeconds})).toMatchObject({moveAchieved:true,timeAchieved:true,earnedStars:3});
  expect(evaluateLevelStars(level,{moves:moveTarget+1,elapsedSeconds:timeTargetSeconds})).toMatchObject({moveAchieved:false,timeAchieved:true,earnedStars:2});
  expect(evaluateLevelStars(level,{moves:moveTarget,elapsedSeconds:timeTargetSeconds+.001})).toMatchObject({moveAchieved:true,timeAchieved:false,earnedStars:2});
  expect(evaluateLevelStars(level,{moves:moveTarget+1,elapsedSeconds:timeTargetSeconds+.001})).toMatchObject({moveAchieved:false,timeAchieved:false,earnedStars:1});
 });
});
