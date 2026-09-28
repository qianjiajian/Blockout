// @ts-expect-error Node fixture IO is outside the browser tsconfig.
import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {LEVELS,LEVELS_BEFORE_111_120_REMAKE,getLevelStrict} from '../src/core/levels';
import {REMADE_111_120_IDS,applyRemake111to120} from '../src/core/remake111to120';
import {evaluateLevelStars,levelClearLoad,levelStarTargets} from '../src/core/levelStarConditions';
import {replayRevisedRoute,type RevisedSearchDrag} from '../src/core/revisedLevelSearch';
import {matchFormalBlockShapeForLevel} from '../src/game/formalBlockShapes';
import type {LevelSpec} from '../src/core/types';
import {applyAxisRectangularRepairs} from '../src/core/axisRectangularRepairs';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/remake111to120-v146.json',import.meta.url),'utf8')) as {rows:{id:number;level:LevelSpec;drags:RevisedSearchDrag[];lowerBound:number;upperBound:number}[]};
const revisedStarTargets=[
 {id:112,moveTarget:52,timeTargetSeconds:118},
 {id:115,moveTarget:56,timeTargetSeconds:57},
 {id:118,moveTarget:38,timeTargetSeconds:86},
 {id:119,moveTarget:62,timeTargetSeconds:104},
];
describe('individually certified 111–120 formal adoption',()=>{
 it('uses the certified objects and leaves all other levels at their preceding stage',()=>{
  expect(REMADE_111_120_IDS).toEqual(fixture.rows.map(r=>r.id));expect(LEVELS).toHaveLength(200);
  const thisStage=LEVELS_BEFORE_111_120_REMAKE.map(applyRemake111to120);
  for(const [i,l]of LEVELS.entries()){
   expect(getLevelStrict(i+1)).toBe(l);
   const row=fixture.rows.find(r=>r.id===l.id);
   if(row)expect(l).toEqual(row.level);else expect(thisStage[i]).toBe(LEVELS_BEFORE_111_120_REMAKE[i]);
  }
 });
 it('preserves physical boards and evaluation targets except the four approved move thresholds',()=>{
  for(const row of fixture.rows){const l=getLevelStrict(row.id),before=LEVELS_BEFORE_111_120_REMAKE[row.id-1]!;
   for(const k of ['width','height','playable','blocked','seams','name','timeSeconds','reward','mechanismRules'] as const)expect(l[k]).toEqual(before[k]);
   const approved=revisedStarTargets.find(r=>r.id===row.id);
   const previousTargets=levelStarTargets(before);
   expect(levelStarTargets(l)).toEqual(approved
    ? {moveTarget:approved.moveTarget,timeTargetSeconds:previousTargets.timeTargetSeconds}
    : previousTargets);
   for(const b of l.blocks)expect(matchFormalBlockShapeForLevel(b.shape,l.id)?.quarterTurns).toBe(0);
  }
 });
 it.each(revisedStarTargets)('applies the exact three-star boundaries for level $id',({id,moveTarget,timeTargetSeconds})=>{
  const level=getLevelStrict(id);
  expect(levelStarTargets(level)).toEqual({moveTarget,timeTargetSeconds});
  expect(evaluateLevelStars(level,{moves:moveTarget,elapsedSeconds:timeTargetSeconds})).toMatchObject({earnedStars:3,moveAchieved:true,timeAchieved:true});
  expect(evaluateLevelStars(level,{moves:moveTarget+1,elapsedSeconds:timeTargetSeconds})).toMatchObject({earnedStars:2,moveAchieved:false,timeAchieved:true});
  expect(evaluateLevelStars(level,{moves:moveTarget,elapsedSeconds:timeTargetSeconds+1})).toMatchObject({earnedStars:2,moveAchieved:true,timeAchieved:false});
 });
 it.each(revisedStarTargets)('replays the full no-booster route at the revised move threshold for level $id',({id,moveTarget})=>{
  const row=fixture.rows.find(r=>r.id===id)!;
  const level=getLevelStrict(id);
  expect(row.drags).toHaveLength(moveTarget);
  const replay=replayRevisedRoute(level,row.drags);
  expect(replay).toMatchObject({valid:true,complete:true,effectiveDrags:moveTarget,clearEvents:levelClearLoad(level),nonClearingDrags:row.upperBound});
 });
 it('keeps the remade 118 rectangular axis through the legacy repair stage',()=>{
  const level=getLevelStrict(118);
  expect(applyAxisRectangularRepairs(level)).toBe(level);
  expect(level.blocks.find(b=>b.id==='r147-118-b21')?.movementAxis).toBe('vertical');
  const invalid=structuredClone(level);
  invalid.blocks.find(b=>b.id==='r147-118-b21')!.shape=[[0,0],[0,1],[1,1]];
  expect(()=>applyAxisRectangularRepairs(invalid)).toThrow('reviewed rectangular vertical axis');
  const legacy={...level,blocks:[{id:'v111-118-b6',color:'red',shape:[[0,0],[0,1],[1,1]],x:0,y:0,movementAxis:'vertical'}]} as LevelSpec;
  expect(applyAxisRectangularRepairs(legacy).blocks[0]!.movementAxis).toBeUndefined();
 });
});
