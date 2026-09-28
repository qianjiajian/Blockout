// @ts-expect-error Node fixture IO is outside the browser tsconfig.
import {readFileSync,existsSync} from 'node:fs';
// @ts-expect-error Node fixture hashing is outside the browser tsconfig.
import {createHash} from 'node:crypto';
import {describe,it,expect} from 'vitest';
import {LEVELS,LEVELS_BEFORE_61_70_REMAKE,getLevelStrict} from '../../../src/core/levels';
import {REMADE_61_70_IDS,applyRemake61to70} from '../../../src/core/remake61to70';
import {PuzzleModel,validateLevel} from '../../../src/core/PuzzleModel';
import {levelStarTargets} from '../../../src/core/levelStarConditions';
import {auditRevisedCandidate,measureRevisedMechanismInventory} from '../../../src/core/revisedCandidateAudit';
import {replayRevisedRoute,type RevisedSearchDrag} from '../../../src/core/revisedLevelSearch';
import {matchFormalBlockShape,matchFormalBlockShapeForLevel} from '../../../src/game/formalBlockShapes';
import type {LevelSpec,Point} from '../../../src/core/types';
// @ts-expect-error The existing read-only audit tool is an untyped Node module.
import {auditCandidateBlockArt} from '../../../tools/revised-candidate-block-art.mjs';
// @ts-expect-error Reuse the current batch static contract, never its historical CLI.
import {auditStructure} from '../../../tools/campaign-v145/lv061-070/remake61to70-v146.mjs';
// @ts-expect-error Read-only TypeScript-source discovery is a qualified Node helper.
import {discoverNativeRemakeGroups,assertNativeRemakeInputsUnchanged} from '../../../tools/campaign-v145/lv061-070/discover-native-remake-groups.mjs';

interface Candidate {level:LevelSpec;drags:RevisedSearchDrag[]}
interface Row {
 id:number;candidate:{path:string;sha256:string;levelSha256:string;routeSha256:string};
 target:{difficulty:LevelSpec['difficulty'];min:number;max:number};
 lowerBound:number;upperBound:number;totalDrags:number;checks:Record<string,string>;missing:string[];
}
interface Baseline {protected1to30Sha256:string;levels:{level:LevelSpec;starTargets:ReturnType<typeof levelStarTargets>}[]}
const summaryPath='deliverables/remake31-200-v145-20260924/batches/lv061-070/summary.json';
const baselinePath='deliverables/remake31-200-v145-20260924/baseline.json';
const read=<T,>(file:string):T=>JSON.parse(readFileSync(file,'utf8')) as T;
const summary=read<{rows:Row[];baselineSha256:string}>(summaryPath),baseline=read<Baseline>(baselinePath);
const canonical=(value:unknown):unknown=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'
 ?Object.fromEntries(Object.entries(value).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([key,item])=>[key,canonical(item)])):value;
const digest=(value:unknown):string=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const fileSha=(file:string):string=>createHash('sha256').update(readFileSync(file)).digest('hex');
const ids=Array.from({length:10},(_,i)=>61+i),protectedSha='b8902d8454157a02ecbde510e444667501636735b6f1967b18f04a377dc313f7';
const candidates=new Map(summary.rows.map(row=>[row.id,read<Candidate>(row.candidate.path)]));
const nativeRemakes=discoverNativeRemakeGroups() as {ids:number[];groups:{from:number;to:number;ids:number[]}[];bindings:Record<string,string>};
const thisStage=LEVELS_BEFORE_61_70_REMAKE.map(applyRemake61to70);
const api={PuzzleModel,validateLevel,levelStarTargets,auditRevisedCandidate,measureRevisedMechanismInventory,matchFormalBlockShape,auditCandidateBlockArt};

describe('61–70 final formal integration',()=>{
 it('installs exactly the ten hash-bound reviewed candidates in the formal lookup',()=>{
  expect(summary.rows.map(row=>row.id)).toEqual(ids);expect(REMADE_61_70_IDS).toEqual(ids);expect(LEVELS).toHaveLength(200);
  expect(nativeRemakes.groups.find(group=>group.from===61&&group.to===70)?.ids).toEqual(ids);
  expect(fileSha(baselinePath)).toBe(summary.baselineSha256);
  for(const row of summary.rows){
   const candidate=candidates.get(row.id)!;
   expect(fileSha(row.candidate.path)).toBe(row.candidate.sha256);
   expect(digest(candidate.level)).toBe(row.candidate.levelSha256);expect(digest(candidate.drags)).toBe(row.candidate.routeSha256);
   expect(Object.values(row.checks).every(status=>status==='PASS')).toBe(true);expect(row.missing).toEqual([]);
   expect(getLevelStrict(row.id)).toBe(LEVELS[row.id-1]);expect(getLevelStrict(row.id)).toEqual(candidate.level);
   expect(thisStage[row.id-1]).toEqual(candidate.level);
  }
 });

 it('keeps the other 190 input objects unchanged at the isolated 61–70 stage',()=>{
  expect(LEVELS_BEFORE_61_70_REMAKE).toHaveLength(200);
  const outside=thisStage.filter(level=>!ids.includes(level.id));expect(outside).toHaveLength(190);
  for(const level of outside){const before=LEVELS_BEFORE_61_70_REMAKE[level.id-1]!;
   expect(level).toEqual(before);expect(level).toBe(before);
  }
  expect(digest(LEVELS.slice(0,30))).toBe(protectedSha);expect(baseline.protected1to30Sha256).toBe(protectedSha);
 });

 it('preserves all 200 original boards, names, time limits, historical rewards and actual stars',()=>{
  for(const [index,level]of LEVELS.entries()){
   const old=baseline.levels[index]!;expect(level.id).toBe(index+1);
   for(const key of ['id','name','width','height','playable','blocked','seams','timeSeconds','reward','mechanismRules'] as const)
    expect(level[key],`Lv${level.id} ${key}`).toEqual(old.level[key]);
   expect(levelStarTargets(level),`Lv${level.id} actual stars`).toEqual(old.starTargets);
  }
 });

 it('keeps this batch native alongside other accepted groups and preserves Lv5’s three rotations',()=>{
  assertNativeRemakeInputsUnchanged(nativeRemakes);
  const otherAccepted=new Set([...Array.from({length:30},(_,i)=>i+1).filter(id=>id!==5),...nativeRemakes.ids.filter(id=>!ids.includes(id))]);
  expect(ids.every(id=>!otherAccepted.has(id))).toBe(true);const after=new Set([...otherAccepted,...ids]);
  const probe:Point[]=[[0,0],[1,0],[1,1]];expect(matchFormalBlockShape(probe,'native-only')).toBeUndefined();
  expect(matchFormalBlockShape(probe,'legacy')?.quarterTurns).toBeGreaterThan(0);
  for(let id=1;id<=200;id++)expect(matchFormalBlockShapeForLevel(probe,id),`Lv${id} policy`)
   .toEqual(matchFormalBlockShape(probe,after.has(id)?'native-only':'legacy'));
  const five=getLevelStrict(5);expect(five).toEqual(baseline.levels[4]!.level);
  expect(five.blocks.filter(block=>(matchFormalBlockShapeForLevel(block.shape,5)?.quarterTurns??0)>0)).toHaveLength(3);
  assertNativeRemakeInputsUnchanged(nativeRemakes);
 });

 for(const row of summary.rows)it(`Lv${row.id} passes fresh static/native checks and its full formal no-booster route`,()=>{
  const level=getLevelStrict(row.id),candidate=candidates.get(row.id)!;
  const audit=auditStructure({level},api);expect(audit.passed).toBe(true);
  for(const asset of audit.art.requirements as {path:string}[])expect(existsSync('public/'+asset.path),asset.path).toBe(true);
  for(const block of level.blocks)expect(matchFormalBlockShapeForLevel(block.shape,level.id)?.quarterTurns,block.id).toBe(0);
  expect(level.difficulty).toBe(row.target.difficulty);expect(row.lowerBound).toBeGreaterThanOrEqual(row.target.min);
  expect(row.upperBound).toBeLessThanOrEqual(row.target.max);expect(row.lowerBound).toBeLessThanOrEqual(row.upperBound);
  // These tests replay the route; the bound proof remains separately archived.
  const replay=replayRevisedRoute(level,candidate.drags);
  expect(replay.valid,replay.error).toBe(true);expect(replay.complete).toBe(true);
  expect(replay.nonClearingDrags).toBe(row.upperBound);expect(replay.effectiveDrags).toBe(row.totalDrags);
 });
});
