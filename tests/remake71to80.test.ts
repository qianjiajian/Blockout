// @ts-expect-error Node fixture IO is outside the browser tsconfig.
import {readFileSync} from 'node:fs';
// @ts-expect-error Node evidence hashing is outside the browser tsconfig.
import {createHash} from 'node:crypto';
import {describe,it,expect} from 'vitest';
import {LEVELS,LEVELS_BEFORE_71_80_REMAKE,LEVELS_BEFORE_LEVEL78_LATE_LIFT_REPAIR,getLevelStrict} from '../src/core/levels';
import {REMADE_71_80_IDS,applyRemake71to80} from '../src/core/remake71to80';
import {evaluateLevelStars,levelStarTargets} from '../src/core/levelStarConditions';
import {validateLevel} from '../src/core/PuzzleModel';
import {replayRevisedRoute,type RevisedSearchDrag} from '../src/core/revisedLevelSearch';
import {matchFormalBlockShapeForLevel} from '../src/game/formalBlockShapes';
import type {LevelSpec} from '../src/core/types';
const fixtureBytes=readFileSync(new URL('./fixtures/remake71to80-v146.json',import.meta.url));
const fixture=JSON.parse(fixtureBytes.toString('utf8')) as {
 rows:{id:number;level:LevelSpec;drags:RevisedSearchDrag[];lowerBound:number;upperBound:number}[];
};
const beforeBytes=readFileSync(new URL('../deliverables/star-targets71-80-20260927/before.json',import.meta.url));
const beforeScoreChange=JSON.parse(beforeBytes.toString('utf8')) as {priorLevels:LevelSpec[]};
const beforeWriteBytes=readFileSync(new URL('../deliverables/star-targets71-80-20260927/before-write.json',import.meta.url));
const beforeWrite=JSON.parse(beforeWriteBytes.toString('utf8')) as {priorLevels:LevelSpec[]};
const witnessBytes=readFileSync(new URL('../deliverables/star-targets71-80-20260927/route-witnesses.json',import.meta.url));
const witnesses=JSON.parse(witnessBytes.toString('utf8')) as {
 beforeSha256:string;
 rows:{id:number}[];
 allRows:{id:number;level:LevelSpec;drags:RevisedSearchDrag[];currentRouteNonClearingDrags:number;changed:boolean}[];
 lowerBoundsRecomputed:boolean;
};
const changedIds=[71,75,76,78,79];
const moveTargets=[50,31,132,103,37,36,40,37,58,34];
const originalTargets=[
 {id:71,moveTarget:37,timeTargetSeconds:129,timeSeconds:180},
 {id:72,moveTarget:31,timeTargetSeconds:97,timeSeconds:135},
 {id:73,moveTarget:132,timeTargetSeconds:129,timeSeconds:180},
 {id:74,moveTarget:103,timeTargetSeconds:118,timeSeconds:165},
 {id:75,moveTarget:34,timeTargetSeconds:86,timeSeconds:120},
 {id:76,moveTarget:32,timeTargetSeconds:75,timeSeconds:105},
 {id:77,moveTarget:40,timeTargetSeconds:100,timeSeconds:140},
 {id:78,moveTarget:35,timeTargetSeconds:129,timeSeconds:180},
 {id:79,moveTarget:52,timeTargetSeconds:97,timeSeconds:135},
 {id:80,moveTarget:34,timeTargetSeconds:129,timeSeconds:180},
] as const;

describe('71–80 historical remake stages and current scoring',()=>{
 it('retains immutable historical evidence and the pre-score campaign snapshot',()=>{
  expect(createHash('sha256').update(fixtureBytes).digest('hex')).toBe('c0c91cb70fd0e5d83c05b506bbe42bcbdc95fc45d2737b1a3ee9448054319beb');
  expect(createHash('sha256').update(beforeBytes).digest('hex')).toBe('a705e44677fbeb9154f8a9e0c386ab373ff160999519955825e00c6bf992df09');
  expect(createHash('sha256').update(witnessBytes).digest('hex')).toBe('68eb43f155fefb8ae6f66157bfa952ecc2c6886b3fbcef40c7cca8e9d8df50cf');
  expect(createHash('sha256').update(beforeWriteBytes).digest('hex')).toBe('41d9124d6d65d2f1fe00d7b3ca3822710ee7dcd577444b4c7b086bdeb7943c7a');
  expect(witnesses.beforeSha256).toBe('41d9124d6d65d2f1fe00d7b3ca3822710ee7dcd577444b4c7b086bdeb7943c7a');
  expect(beforeWrite.priorLevels.slice(70,80)).toEqual(beforeScoreChange.priorLevels.slice(70,80));
  expect(witnesses.allRows.map(row=>row.id)).toEqual(REMADE_71_80_IDS);
  expect(witnesses.rows.map(row=>row.id)).toEqual(changedIds);
  expect(witnesses.lowerBoundsRecomputed).toBe(false);
 });

 it('replaces exactly the accepted IDs and leaves every other object at its own stage',()=>{
  expect(REMADE_71_80_IDS).toEqual(fixture.rows.map(row=>row.id));
  expect(LEVELS).toHaveLength(200);
  const stage=LEVELS_BEFORE_71_80_REMAKE.map(applyRemake71to80);
  for(const [index,level]of LEVELS.entries()){
   expect(getLevelStrict(index+1)).toBe(level);
   expect(level.id).toBe(index+1);
   if(!REMADE_71_80_IDS.includes(level.id))expect(stage[index]).toBe(LEVELS_BEFORE_71_80_REMAKE[index]);
  }
 });

 for(const historical of fixture.rows)it(`Lv${historical.id} preserves its scoring-stage gameplay and complete inventory`,()=>{
  // Lv78's later cargo repair has its own full routes and deadlock regressions.
  const level=LEVELS_BEFORE_LEVEL78_LATE_LIFT_REPAIR[historical.id-1]!,before=beforeScoreChange.priorLevels[historical.id-1]!;
  const stageBefore=LEVELS_BEFORE_71_80_REMAKE[historical.id-1]!;
  const witness=witnesses.allRows.find(row=>row.id===historical.id)!;
  expect(witness).toBeDefined();
  const changed=changedIds.includes(historical.id);
  const expectedMoveTarget=moveTargets[historical.id-71]!;
  expect(expectedMoveTarget).toBe(Math.max(levelStarTargets(before).moveTarget,witness.drags.length));
  const patch=changed?{preservedMoveTarget:expectedMoveTarget}:{};
  // The historical module precedes Lv72's separate two-colour repair. The
  // final campaign must preserve that repair rather than restore the fixture.
  expect(applyRemake71to80(stageBefore)).toEqual({...historical.level,...patch});
  expect(level).toEqual({...before,...patch});
  expect(witness.level).toEqual(level);
  expect(witness.changed).toBe(changed);
  expect(()=>validateLevel(level)).not.toThrow();
  for(const key of ['width','height','playable','blocked','seams','id','name','timeSeconds','reward','parMoves','mechanismRules'] as const)expect(level[key]).toEqual(stageBefore[key]);
  for(const block of level.blocks)expect(matchFormalBlockShapeForLevel(block.shape,level.id)?.quarterTurns,block.id).toBe(0);
  const result=replayRevisedRoute(level,witness.drags);
  expect(result,result.error).toMatchObject({valid:true,complete:true,effectiveDrags:witness.drags.length,nonClearingDrags:witness.currentRouteNonClearingDrags});
  expect(levelStarTargets(level).moveTarget).toBe(expectedMoveTarget);
  expect(witness.drags.length).toBeLessThanOrEqual(levelStarTargets(level).moveTarget);
  if(changed)expect(witness.drags).toHaveLength(levelStarTargets(level).moveTarget);
  // A complete route is an upper-bound witness only. Historical lower-bound
  // metadata is deliberately not applied to these current route assertions.
 });

 it('preserves exactly the two v1.67 Lv72 recolours',()=>{
  const historical=fixture.rows.find(row=>row.id===72)!.level;
  const current=getLevelStrict(72);
  const recolours:Record<string,LevelSpec['blocks'][number]['color']>={'r147-72-o4':'yellow','r147-72-h2':'cyan'};
  expect(current).toEqual({...historical,blocks:historical.blocks.map(block=>{
   const color=recolours[block.id];
   if(!color)return block;
   return {...block,color,...(block.layers?{layers:block.layers.map((layer,index)=>index===0?color:layer)}:{})};
  })});
  // Current U4 is below the preserved easy lower band of five. This scoring
  // task does not recertify the old L5 proof for the recoloured map.
  expect(witnesses.allRows.find(row=>row.id===72)!.currentRouteNonClearingDrags).toBe(4);
 });

 it('keeps Lv74 historical L17 distinct from its unchanged 103-drag star target',()=>{
  expect(fixture.rows.find(row=>row.id===74)!.lowerBound).toBe(17);
  expect(levelStarTargets(getLevelStrict(74))).toEqual({moveTarget:103,timeTargetSeconds:118});
  expect(getLevelStrict(74)).toEqual(beforeScoreChange.priorLevels[73]);
 });

 it('records the old Lv71 route as invalid under current swept exits',()=>{
  const historical=fixture.rows.find(row=>row.id===71)!;
  const replay=replayRevisedRoute(historical.level,historical.drags);
  expect(replay).toMatchObject({valid:false,complete:false});
  expect(replay.error).toContain('r147-71-h0');
  expect(replay.error).toContain('canonical pointer auto-exit');
 });

 it.each(originalTargets)('scores equal, +1-drag and rounded-up overtime boundaries for Lv$id',({id,moveTarget:oldMoveTarget,timeTargetSeconds,timeSeconds})=>{
  const level=getLevelStrict(id),before=beforeScoreChange.priorLevels[id-1]!;
  const route=witnesses.allRows.find(row=>row.id===id)!;
  const moveTarget=moveTargets[id-71]!;
  expect(moveTarget).toBe(Math.max(oldMoveTarget,route.drags.length));
  expect(levelStarTargets(before)).toEqual({moveTarget:oldMoveTarget,timeTargetSeconds});
  expect(level.timeSeconds).toBe(timeSeconds);
  expect(levelStarTargets(level)).toEqual({moveTarget,timeTargetSeconds});
  expect(evaluateLevelStars(level,{moves:moveTarget,elapsedSeconds:timeTargetSeconds})).toMatchObject({moveAchieved:true,timeAchieved:true,earnedStars:3});
  expect(evaluateLevelStars(level,{moves:moveTarget+1,elapsedSeconds:timeTargetSeconds})).toMatchObject({moveAchieved:false,timeAchieved:true,earnedStars:2});
  expect(evaluateLevelStars(level,{moves:moveTarget,elapsedSeconds:timeTargetSeconds+.001})).toMatchObject({moveAchieved:true,timeAchieved:false,earnedStars:2});
  expect(evaluateLevelStars(level,{moves:moveTarget+1,elapsedSeconds:timeTargetSeconds+.001})).toMatchObject({moveAchieved:false,timeAchieved:false,earnedStars:1});
 });
});
