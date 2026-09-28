// @ts-expect-error Node fixture IO is outside the browser tsconfig.
import {readFileSync} from 'node:fs';
// @ts-expect-error Node fixture hashing is outside the browser tsconfig.
import {createHash} from 'node:crypto';
import {describe,it,expect} from 'vitest';
import {LEVELS,LEVELS_BEFORE_91_100_REMAKE,getLevelStrict} from '../src/core/levels';
import {REMADE_91_100_IDS,applyRemake91to100} from '../src/core/remake91to100';
import {evaluateLevelStars,levelStarTargets} from '../src/core/levelStarConditions';
import {validateLevel} from '../src/core/PuzzleModel';
import {replayRevisedRoute,type RevisedSearchDrag} from '../src/core/revisedLevelSearch';
import {matchFormalBlockShapeForLevel} from '../src/game/formalBlockShapes';
import type {LevelSpec} from '../src/core/types';

type HistoricalRow={id:number;level:LevelSpec;drags:RevisedSearchDrag[];lowerBound:number;upperBound:number;adoption:string};
type RouteWitness={id:number;level:LevelSpec;drags:RevisedSearchDrag[];currentRouteNonClearingDrags:number;routeSha256:string;changed:boolean;difficultyNote:string};
const fixtureBytes=readFileSync(new URL('./fixtures/remake91to100-v147.json',import.meta.url));
const fixture=JSON.parse(fixtureBytes.toString('utf8')) as {activeVersion:string;rows:HistoricalRow[]};
const beforeScoreChange=JSON.parse(readFileSync(new URL('../deliverables/star-targets91-100-20260927/before.json',import.meta.url),'utf8')) as {priorLevels:LevelSpec[]};
const witnesses=JSON.parse(readFileSync(new URL('../deliverables/star-targets91-100-20260927/route-witnesses.json',import.meta.url),'utf8')) as {allRows:RouteWitness[];rows:RouteWitness[];lowerBoundsRecomputed:boolean};
const sha256=(value:string|Uint8Array)=>createHash('sha256').update(value).digest('hex');
const canonical=(value:unknown):unknown=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([key,item])=>[key,canonical(item)])):value;
const starRevision:Readonly<Record<number,number>>={91:50,92:44,94:65,95:46,98:55};
const expected=[
 {id:91,moveTarget:50,timeTargetSeconds:108,timeSeconds:150,drags:50,nonClearingDrags:19},
 {id:92,moveTarget:44,timeTargetSeconds:97,timeSeconds:135,drags:44,nonClearingDrags:8},
 {id:93,moveTarget:40,timeTargetSeconds:50,timeSeconds:70,drags:37,nonClearingDrags:11},
 {id:94,moveTarget:65,timeTargetSeconds:111,timeSeconds:155,drags:65,nonClearingDrags:25},
 {id:95,moveTarget:46,timeTargetSeconds:64,timeSeconds:90,drags:46,nonClearingDrags:9},
 {id:96,moveTarget:47,timeTargetSeconds:129,timeSeconds:180,drags:45,nonClearingDrags:14},
 {id:97,moveTarget:45,timeTargetSeconds:93,timeSeconds:130,drags:38,nonClearingDrags:13},
 {id:98,moveTarget:55,timeTargetSeconds:82,timeSeconds:115,drags:55,nonClearingDrags:21},
 {id:99,moveTarget:44,timeTargetSeconds:108,timeSeconds:150,drags:42,nonClearingDrags:10},
 {id:100,moveTarget:30,timeTargetSeconds:129,timeSeconds:180,drags:21,nonClearingDrags:9},
] as const;

describe('91–100 historical remake stage and current formal scoring',()=>{
 it('keeps the historical fixture immutable and limits its stage to the ten adopted IDs',()=>{
  expect(sha256(fixtureBytes)).toBe('5a4894178f5107300c0303d404bb76e338d49e0a5b85152b4972c0bf6837a9b3');
  expect(fixture.activeVersion).toBe('1.47.0');
  expect(REMADE_91_100_IDS).toEqual(expected.map(row=>row.id));
  expect(fixture.rows.map(row=>row.id)).toEqual(REMADE_91_100_IDS);
  expect(LEVELS).toHaveLength(200);
  for(const [index,before]of LEVELS_BEFORE_91_100_REMAKE.entries()){
   const row=fixture.rows.find(row=>row.id===before.id),atStage=applyRemake91to100(before);
   expect(getLevelStrict(index+1)).toBe(LEVELS[index]);
   if(row){
    const target=starRevision[row.id];
    expect(atStage).toEqual({...row.level,...(target?{preservedMoveTarget:target}:{})});
   }else expect(atStage).toBe(before);
  }
  // Lv5's three legacy rotated shapes remain outside this batch's q0 policy.
  const fifth=getLevelStrict(5);
  expect(fifth.blocks.filter(block=>matchFormalBlockShapeForLevel(block.shape,5)?.quarterTurns!==0)).toHaveLength(3);
  expect(witnesses.allRows.map(row=>row.id)).toEqual(REMADE_91_100_IDS);
  expect(witnesses.rows.map(row=>row.id)).toEqual([91,92,94,95,98]);
  expect(witnesses.lowerBoundsRecomputed).toBe(false);
 });

 it.each(expected)('Lv$id preserves final gameplay, native art and the current complete unassisted route',({id,moveTarget,timeTargetSeconds,timeSeconds,drags,nonClearingDrags})=>{
  const level=getLevelStrict(id),before=LEVELS_BEFORE_91_100_REMAKE[id-1]!,historical=fixture.rows.find(row=>row.id===id)!;
  const beforeScoring=beforeScoreChange.priorLevels[id-1]!,target=starRevision[id];
  expect(level).toEqual({...beforeScoring,...(target?{preservedMoveTarget:target}:{})});
  for(const key of ['id','name','width','height','playable','blocked','seams','timeSeconds','reward','parMoves','mechanismRules'] as const)expect(level[key],key).toEqual(before[key]);
  expect(level.difficulty).toBe(historical.level.difficulty);
  expect(level.timeSeconds).toBe(timeSeconds);
  expect(levelStarTargets(level)).toEqual({moveTarget,timeTargetSeconds});
  expect(()=>validateLevel(level)).not.toThrow();
  for(const block of level.blocks)expect(matchFormalBlockShapeForLevel(block.shape,id)?.quarterTurns,block.id).toBe(0);
  const witness=witnesses.allRows.find(row=>row.id===id)!;
  expect(witness).toBeDefined();expect(witness.level).toEqual(level);
  expect(sha256(JSON.stringify(canonical(witness.drags)))).toBe(witness.routeSha256);
  expect(witness.drags).toHaveLength(drags);
  expect(witness.currentRouteNonClearingDrags).toBe(nonClearingDrags);
  expect(replayRevisedRoute(level,witness.drags)).toMatchObject({valid:true,complete:true,effectiveDrags:drags,nonClearingDrags});
  expect(drags).toBeLessThanOrEqual(moveTarget);
  // A complete route proves a playable upper bound only. Historical fixture
  // lowerBound values are never used here to certify a current difficulty floor.
 });

 it('retains exactly the independently authorized v1.65 repairs to Lv93 and Lv97',()=>{
  const old93=fixture.rows.find(row=>row.id===93)!.level;
  const recolored=new Set(['r147-93-o-red-h2-adapt','r147-93-o-blue-s']);
  expect(getLevelStrict(93)).toEqual({...old93,blocks:old93.blocks.map(block=>recolored.has(block.id)?{...block,color:'yellow'}:block)});
  const old97=fixture.rows.find(row=>row.id===97)!.level;
  const upper=old97.blocks.find(block=>block.id==='r147-97-openingUpper-0')!;
  const lower=old97.blocks.find(block=>block.id==='r147-97-openingLower-0')!;
  expect(getLevelStrict(97)).toEqual({...old97,blocks:old97.blocks.map(block=>block.id===upper.id?{...block,x:lower.x,y:lower.y}:block.id===lower.id?{...block,x:upper.x,y:upper.y}:block)});
 });

 it.each([{id:93,effectiveDrags:1},{id:94,effectiveDrags:51},{id:97,effectiveDrags:0},{id:98,effectiveDrags:21}])('rejects the superseded Lv$id fixture route under current canonical exits',({id,effectiveDrags})=>{
  const historical=fixture.rows.find(row=>row.id===id)!;
  expect(replayRevisedRoute(getLevelStrict(id),historical.drags)).toMatchObject({valid:false,complete:false,effectiveDrags});
 });

 it.each([{id:94,targetLowerBound:21},{id:98,targetLowerBound:15}])('keeps Lv$id direct-write difficulty unverified instead of treating the target as proof',({id,targetLowerBound})=>{
  const row=fixture.rows.find(row=>row.id===id)!;
  const adoption=JSON.parse(readFileSync(new URL('../'+row.adoption,import.meta.url),'utf8'));
  expect(adoption).toMatchObject({id,status:'USER_DIRECT_WRITE_UNVERIFIED',lowerBound:targetLowerBound,lowerBoundValidated:false,userAuthorizedDirectWrite:true});
  expect(row.lowerBound).toBe(targetLowerBound);
  expect(witnesses.allRows.find(row=>row.id===id)!.difficultyNote).toContain(`L${targetLowerBound} unverified`);
 });

 it('records the current Lv98 U21 witness without claiming the hard-band upper bound is met',()=>{
  expect(getLevelStrict(98).difficulty).toBe('hard');
  expect(witnesses.allRows.find(row=>row.id===98)!.currentRouteNonClearingDrags).toBe(21);
  expect(fixture.rows.find(row=>row.id===98)!.upperBound).toBe(19);
  // The preserved old U19 route is now rejected above. The new full U21 route
  // proves score attainability; U <= 20 and the target lower bound need separate
  // review. No claim is made that a shorter legal route cannot exist.
 });

 it.each(expected)('scores inclusive move/time limits and independent overruns for Lv$id',({id,moveTarget,timeTargetSeconds})=>{
  const level=getLevelStrict(id);
  expect(evaluateLevelStars(level,{moves:moveTarget,elapsedSeconds:timeTargetSeconds})).toMatchObject({moveAchieved:true,timeAchieved:true,earnedStars:3});
  expect(evaluateLevelStars(level,{moves:moveTarget+1,elapsedSeconds:timeTargetSeconds})).toMatchObject({moveAchieved:false,timeAchieved:true,earnedStars:2});
  expect(evaluateLevelStars(level,{moves:moveTarget,elapsedSeconds:timeTargetSeconds+.001})).toMatchObject({moveAchieved:true,timeAchieved:false,earnedStars:2});
  expect(evaluateLevelStars(level,{moves:moveTarget+1,elapsedSeconds:timeTargetSeconds+.001})).toMatchObject({moveAchieved:false,timeAchieved:false,earnedStars:1});
 });
});
