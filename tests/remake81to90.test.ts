// @ts-expect-error Node fixture IO is outside the browser tsconfig.
import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {LEVELS,LEVELS_BEFORE_81_90_REMAKE,getLevelStrict} from '../src/core/levels';
import {REMADE_81_90_IDS,applyRemake81to90} from '../src/core/remake81to90';
import {evaluateLevelStars,levelStarTargets} from '../src/core/levelStarConditions';
import {validateLevel} from '../src/core/PuzzleModel';
import {replayRevisedRoute,type RevisedSearchDrag} from '../src/core/revisedLevelSearch';
import {matchFormalBlockShapeForLevel} from '../src/game/formalBlockShapes';
import type {LevelSpec} from '../src/core/types';

type HistoricalFixture={rows:{id:number;level:LevelSpec;drags:RevisedSearchDrag[];lowerBound:number|null;upperBound:number;lowerBoundValidated?:boolean;difficultyCertified?:boolean;adoptionBasis?:string}[]};
const fixture=JSON.parse(readFileSync(new URL('./fixtures/remake81to90-v146.json',import.meta.url),'utf8')) as HistoricalFixture;
const beforeScoreChange=JSON.parse(readFileSync(new URL('../deliverables/star-targets81-90-20260927/before.json',import.meta.url),'utf8')) as {priorLevels:LevelSpec[];fixture:HistoricalFixture};
const witnesses=JSON.parse(readFileSync(new URL('../deliverables/star-targets81-90-20260927/route-witnesses.json',import.meta.url),'utf8')) as {
 rows:{id:number}[];
 allRows:{id:number;level:LevelSpec;drags:RevisedSearchDrag[];currentRouteNonClearingDrags:number;historicalLowerBound:number|null;lowerBoundRecertified:boolean}[];
};
const starRevision=[
 {id:81,moveTarget:38,timeTargetSeconds:86,timeSeconds:120},
 {id:83,moveTarget:56,timeTargetSeconds:108,timeSeconds:150},
 {id:85,moveTarget:33,timeTargetSeconds:118,timeSeconds:165},
 {id:87,moveTarget:50,timeTargetSeconds:118,timeSeconds:165},
 {id:88,moveTarget:54,timeTargetSeconds:129,timeSeconds:180},
] as const;

describe('81–90 historical remake stages and current formal scoring',()=>{
 it('replaces exactly the accepted IDs and leaves every other object at its preceding stage',()=>{
  expect(REMADE_81_90_IDS).toEqual([81,82,83,84,85,86,87,88,89,90]);
  expect(fixture.rows.map(r=>r.id)).toEqual(REMADE_81_90_IDS);expect(LEVELS).toHaveLength(200);
  const stage=LEVELS_BEFORE_81_90_REMAKE.map(applyRemake81to90);
  for(const [i,level]of LEVELS.entries()){
   expect(getLevelStrict(i+1)).toBe(level);expect(level.id).toBe(i+1);
   if(!REMADE_81_90_IDS.includes(level.id))expect(stage[i]).toBe(LEVELS_BEFORE_81_90_REMAKE[i]);
  }
  // Later authorized 1–20 remakes do not change this historical integration boundary.
  expect(stage.slice(0,30)).toEqual(LEVELS_BEFORE_81_90_REMAKE.slice(0,30));
  expect(LEVELS[4]!.blocks.filter(b=>(matchFormalBlockShapeForLevel(b.shape,5)?.quarterTurns??0)!==0)).toHaveLength(3);
 });
 it('retains the immutable adoption fixture and uses precisely five score revisions',()=>{
  expect(fixture).toEqual(beforeScoreChange.fixture);
  expect(witnesses.rows.map(r=>r.id)).toEqual(starRevision.map(r=>r.id));
  expect(witnesses.allRows.map(r=>r.id)).toEqual(REMADE_81_90_IDS);
 });
 for(const row of fixture.rows)it(`Lv${row.id} preserves its full map and completes the current route within its target`,()=>{
  const level=getLevelStrict(row.id),preceding=LEVELS_BEFORE_81_90_REMAKE[row.id-1]!;
  const revised=starRevision.find(r=>r.id===row.id),scorePatch=revised?{preservedMoveTarget:revised.moveTarget}:{};
  const stage=applyRemake81to90(preceding),before=beforeScoreChange.priorLevels[row.id-1]!;
  expect(stage).toEqual({...row.level,...scorePatch});
  for(const key of ['width','height','playable','blocked','seams','name','timeSeconds','reward','parMoves','mechanismRules'] as const)expect(stage[key]).toEqual(preceding[key]);
  // The final Lv89 object includes its separately authorized v1.60 axis repair.
  // Preserve the actual pre-score object rather than restoring the old fixture map.
  expect(level).toEqual({...before,...scorePatch});
  expect(()=>validateLevel(level)).not.toThrow();
  expect(level.difficulty).toBe(before.difficulty);
  expect(levelStarTargets(level)).toEqual(revised?{moveTarget:revised.moveTarget,timeTargetSeconds:revised.timeTargetSeconds}:levelStarTargets(before));
  for(const block of level.blocks)expect(matchFormalBlockShapeForLevel(block.shape,level.id)?.quarterTurns,block.id).toBe(0);
  const witness=witnesses.allRows.find(r=>r.id===row.id)!;
  expect(witness).toBeDefined();expect(witness.level).toEqual(level);
  const replay=replayRevisedRoute(level,witness.drags);
  expect(replay.valid,replay.error).toBe(true);expect(replay.complete).toBe(true);
  expect(replay.effectiveDrags).toBe(witness.drags.length);
  expect(replay.nonClearingDrags).toBe(witness.currentRouteNonClearingDrags);
  expect(witness.drags.length).toBeLessThanOrEqual(levelStarTargets(level).moveTarget);
  if(revised)expect(witness.drags).toHaveLength(revised.moveTarget);
  // Historical floors remain provenance, not a fresh difficulty certificate.
  expect(witness.historicalLowerBound).toBe(row.lowerBound);expect(witness.lowerBoundRecertified).toBe(false);
 });
 it('preserves the separate Lv89 irregular-axis repair without rewriting its historical fixture',()=>{
  const old=fixture.rows.find(r=>r.id===89)!.level;
  expect(old.blocks.find(b=>b.id==='a89-s12-01')!.movementAxis).toBe('vertical');
  expect(getLevelStrict(89).blocks).toEqual(old.blocks.map(b=>{
   if(b.id!=='a89-s12-01')return b;
   const {movementAxis:removedAxis,...repaired}=b;expect(removedAxis).toBe('vertical');return repaired;
  }));
 });
 it('keeps the obsolete Lv85 swept-exit witness as a failing negative control',()=>{
  const old=fixture.rows.find(r=>r.id===85)!;
  const result=replayRevisedRoute(getLevelStrict(85),old.drags);
  expect(result).toMatchObject({valid:false,complete:false,effectiveDrags:1});
  expect(result.error).toContain('r147-85-o7');expect(result.error).toContain('canonical pointer auto-exit');
  const current=witnesses.allRows.find(r=>r.id===85)!;
  expect(current.drags).not.toEqual(old.drags);
  expect(current.drags).toHaveLength(33);expect(current.currentRouteNonClearingDrags).toBe(14);
  // This scoring route does not revalidate the easy difficulty ceiling of 10.
  expect(getLevelStrict(85).difficulty).toBe('easy');expect(current.lowerBoundRecertified).toBe(false);
 });
 it('retains the explicitly accepted unknown lower bounds for Lv88 and Lv90',()=>{
  expect(fixture.rows.filter(r=>r.lowerBound===null).map(r=>r.id)).toEqual([88,90]);
  for(const id of [88,90]){
   const old=fixture.rows.find(r=>r.id===id)!;
   expect(old.lowerBoundValidated).toBe(false);expect(old.difficultyCertified).toBe(false);
   expect(old.adoptionBasis).toBe('USER_DIRECT_WRITE_LOWER_BOUND_UNVERIFIED');
  }
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
