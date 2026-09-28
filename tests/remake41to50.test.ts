// @ts-expect-error Node fixture IO is outside the browser tsconfig.
import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {LEVELS,LEVELS_BEFORE_41_50_REMAKE,getLevelStrict} from '../src/core/levels';
import {REMADE_41_50_IDS,applyRemake41to50} from '../src/core/remake41to50';
import {evaluateLevelStars,levelStarTargets} from '../src/core/levelStarConditions';
import {validateLevel} from '../src/core/PuzzleModel';
import {replayRevisedRoute,type RevisedSearchDrag} from '../src/core/revisedLevelSearch';
import {matchFormalBlockShapeForLevel} from '../src/game/formalBlockShapes';
import type {LevelSpec} from '../src/core/types';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/native-remake41to50-v146.json',import.meta.url),'utf8')) as {
 ruleVersion:string;rows:{id:number;level:LevelSpec;drags:RevisedSearchDrag[];lowerBound:number|null;upperBound:number;lowerBoundValidated?:boolean;difficultyCertified?:boolean}[];
};
const difficulty=['normal','easy','normal','normal','hard','easy','normal','hard','easy','easy'];
const bounds:Record<string,[number,number]>={easy:[5,10],normal:[11,15],hard:[16,20],super:[21,30]};
const starRevision=[
 {id:41,moveTarget:45,timeTargetSeconds:97,timeSeconds:135},
 {id:43,moveTarget:24,timeTargetSeconds:68,timeSeconds:95},
 {id:44,moveTarget:39,timeTargetSeconds:68,timeSeconds:95},
 {id:46,moveTarget:41,timeTargetSeconds:86,timeSeconds:120},
 {id:47,moveTarget:46,timeTargetSeconds:108,timeSeconds:150},
 {id:48,moveTarget:43,timeTargetSeconds:72,timeSeconds:100},
 {id:50,moveTarget:27,timeTargetSeconds:97,timeSeconds:135},
] as const;
const beforeScoreChange=JSON.parse(readFileSync(new URL('../deliverables/star-targets41-50-20260927/before-write.json',import.meta.url),'utf8')) as {priorLevels:LevelSpec[]};
const witnesses=JSON.parse(readFileSync(new URL('../deliverables/star-targets41-50-20260927/route-witnesses-v195.json',import.meta.url),'utf8')) as {
 allRows:{id:number;level:LevelSpec;drags:RevisedSearchDrag[];currentRouteNonClearingDrags:number}[];
};
describe('41–50 remake stages and current formal scoring',()=>{
 it('replaces exactly accepted IDs and preserves every other object at its stage',()=>{
  expect(fixture.ruleVersion).toBe('1.58.0');expect(fixture.rows.map(r=>r.id)).toEqual(REMADE_41_50_IDS);
  expect(LEVELS).toHaveLength(200);expect(REMADE_41_50_IDS.every(id=>id>=41&&id<=50)).toBe(true);
  const stage=LEVELS_BEFORE_41_50_REMAKE.map(applyRemake41to50);
  for(const [i,l]of LEVELS.entries()){
   expect(getLevelStrict(i+1)).toBe(l);expect(l.id).toBe(i+1);
   if(!REMADE_41_50_IDS.includes(l.id))expect(stage[i]).toBe(LEVELS_BEFORE_41_50_REMAKE[i]);
  }
  // Later authorized 1–20 remakes are outside this historical integration stage.
  expect(stage.slice(0,30)).toEqual(LEVELS_BEFORE_41_50_REMAKE.slice(0,30));
  expect(LEVELS[4]!.blocks.filter(b=>(matchFormalBlockShapeForLevel(b.shape,5)?.quarterTurns??0)!==0)).toHaveLength(3);
 });
 for(const r of fixture.rows)it(`Lv${r.id} preserves its historical stage and completes its current full route with the authorized score`,()=>{
  const level=getLevelStrict(r.id),before=LEVELS_BEFORE_41_50_REMAKE[r.id-1]!;
  const stage=applyRemake41to50(before),revised=starRevision.find(s=>s.id===r.id);
  const scorePatch=revised?{preservedMoveTarget:revised.moveTarget}:{};
  expect(stage).toEqual({...r.level,...scorePatch});
  for(const key of ['width','height','playable','blocked','seams','id','name','timeSeconds','reward','parMoves'] as const)expect(stage[key]).toEqual(before[key]);
  // The final Lv43 map includes its separate v1.63 repair. Score changes must
  // preserve that final map, not restore the older v1.58 fixture configuration.
  expect(level).toEqual({...beforeScoreChange.priorLevels[r.id-1]!,...scorePatch});
  expect(()=>validateLevel(level)).not.toThrow();
  expect(levelStarTargets(level)).toEqual(revised?{moveTarget:revised.moveTarget,timeTargetSeconds:revised.timeTargetSeconds}:levelStarTargets(beforeScoreChange.priorLevels[r.id-1]!));
  expect(level.difficulty).toBe(difficulty[r.id-41]);
  for(const block of level.blocks)expect(matchFormalBlockShapeForLevel(block.shape,level.id)?.quarterTurns,block.id).toBe(0);
  const [min,max]=bounds[r.level.difficulty]!;
  // These assertions preserve historical metadata only. They do not certify
  // the current difficulty floor, particularly Lv41's accepted unknown L and
  // Lv43's subsequently repaired map whose current complete witness is U0.
  if(r.id===41){expect(r.lowerBound).toBeNull();expect(r.lowerBoundValidated).toBe(false);expect(r.difficultyCertified).toBe(false);}
  else expect(r.lowerBound).toBeGreaterThanOrEqual(min);
  expect(r.upperBound).toBeLessThanOrEqual(max);
  const witness=witnesses.allRows.find(row=>row.id===r.id)!;
  expect(witness).toBeDefined();expect(witness.level).toEqual(level);
  expect(replayRevisedRoute(level,witness.drags)).toMatchObject({valid:true,complete:true,effectiveDrags:witness.drags.length,nonClearingDrags:r.id===43?0:r.upperBound});
  expect(witness.currentRouteNonClearingDrags).toBe(r.id===43?0:r.upperBound);
  expect(witness.drags.length).toBeLessThanOrEqual(levelStarTargets(level).moveTarget);
  if(revised)expect(witness.drags).toHaveLength(revised.moveTarget);
 });
 it('records the obsolete Lv43 route as invalid under current swept exits instead of reusing its certificate',()=>{
  const old=fixture.rows.find(row=>row.id===43)!;
  expect(replayRevisedRoute(old.level,old.drags)).toMatchObject({valid:false,complete:false,effectiveDrags:1});
  expect(getLevelStrict(43).blocks).not.toEqual(old.level.blocks);
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
