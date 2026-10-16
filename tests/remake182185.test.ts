// @ts-expect-error Node fixture IO is outside the browser tsconfig.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LEVELS, LEVELS_BEFORE_181_190_REMAKE } from '../src/core/levels';
import { REMADE_181_190_IDS, applyRemake181to190 } from '../src/core/remake181to190';
import { PuzzleModel } from '../src/core/PuzzleModel';
import { evaluateLevelStars, levelStarTargets } from '../src/core/levelStarConditions';
import { matchFormalBlockShapeForLevel } from '../src/game/formalBlockShapes';
import { isMechanismBlockVisible } from '../src/game/revisedMechanismPresentation';
import type { LevelSpec } from '../src/core/types';
import type { RevisedSearchDrag } from '../src/core/revisedLevelSearch';
type Row={id:number;level:LevelSpec;drags:RevisedSearchDrag[];lowerBound:number;upperBound:number};
const fixture=JSON.parse(readFileSync(new URL('./fixtures/remake182185-v107.json',import.meta.url),'utf8')) as {ruleVersion:string;rows:Row[]};
// The v1.107 fixture remains immutable. Current production also includes the
// user-authorized formal Lv185 source-adapted object written in v1.123.
const formal185=JSON.parse(readFileSync(new URL('../deliverables/star-targets181-187-20260929/formal-packets/level185.json',import.meta.url),'utf8')) as {level:LevelSpec};
const expectedCurrentLevel=(r:Row):LevelSpec=>r.id===182?{...r.level,preservedMoveTarget:48}:r.id===185?formal185.level:r.level;
describe('v1.107 formal additions with the later v1.111 Lv182 scoring override',()=>{
 it('adds only reviewed missing IDs to the existing eight-level stage',()=>{
  expect(fixture.ruleVersion).toBe('1.107.0');expect(fixture.rows.length).toBeGreaterThan(0);
  const ids=fixture.rows.map(r=>r.id);expect(new Set(ids).size).toBe(ids.length);expect(ids.every(id=>[182,185].includes(id))).toBe(true);
  expect(REMADE_181_190_IDS).toEqual([181,182,183,184,185,186,187,188,189,190]);
  expect(LEVELS).toHaveLength(200);
  for(const before of LEVELS_BEFORE_181_190_REMAKE){const mapped=applyRemake181to190(before),r=fixture.rows.find(r=>r.id===before.id);if(r)expect(mapped).toEqual(expectedCurrentLevel(r));else if(!REMADE_181_190_IDS.includes(before.id))expect(mapped).toBe(before);}
 });
 it.each(fixture.rows)('preserves Lv$id geometry, time target, historical score and native art',r=>{
  const l=LEVELS[r.id-1],before=LEVELS_BEFORE_181_190_REMAKE[r.id-1];expect(l).toEqual(expectedCurrentLevel(r));
  for(const k of ['id','name','width','height','playable','blocked','seams','timeSeconds','reward','parMoves'] as const)expect(l[k],k).toEqual(before[k]);
  expect(levelStarTargets(r.level)).toEqual(levelStarTargets(before));
  expect(levelStarTargets(l)).toEqual(r.id===182?{moveTarget:48,timeTargetSeconds:97}:r.id===185?{moveTarget:50,timeTargetSeconds:93}:levelStarTargets(before));
  expect(l.difficulty).toBe('hard');expect(l.mechanismRules).toBe('revised-2026-09-27-v1.5');
  for(const b of l.blocks)expect(matchFormalBlockShapeForLevel(b.shape,l.id)?.quarterTurns,b.id).toBe(0);
  // These fields record separately verified proof bounds; this test is not a
  // new lower-bound search and never treats the route as the minimum.
  expect(r.lowerBound).toBe(16);expect(r.upperBound).toBeGreaterThanOrEqual(16);expect(r.upperBound).toBeLessThanOrEqual(20);
  const s=levelStarTargets(l);expect(evaluateLevelStars(l,{moves:s.moveTarget,elapsedSeconds:s.timeTargetSeconds}).earnedStars).toBe(3);
  expect(evaluateLevelStars(l,{moves:s.moveTarget+1,elapsedSeconds:s.timeTargetSeconds+1}).earnedStars).toBe(1);
 });
 it.each(fixture.rows)('completes Lv$id through actual ice, shutter, shell and deferred flip events',r=>{
  const l=LEVELS[r.id-1],m=new PuzzleModel(structuredClone(l),{deferExitCompletion:true});m.startCountdown();let parking=0,peels=0,hiddenChecks=0;
  for(const d of r.drags){const before=m.snapshot();m.beginAction();for(const p of d.path)expect(m.moveBlockStep(d.blockId,...p),d.blockId).toBe(true);
   if(d.exitSide){const pre=m.snapshot(),b=pre.blocks.find(b=>b.id===d.blockId)!;const result=m.tryExit(d.blockId,d.exitSide);expect(result.ok).toBe(true);const post=m.snapshot();expect(post.cleared).toBe(pre.cleared+1);
    for(const g of pre.gates)expect(post.gates.find(x=>x.id===g.id)!.frozen).toBe(Math.max(0,g.frozen-1));
    for(const ice of pre.blocks.filter(b=>b.frozen>0&&b.id!==d.blockId)){const visible=isMechanismBlockVisible(pre,ice);expect(post.blocks.find(b=>b.id===ice.id)!.frozen).toBe(visible?ice.frozen-1:ice.frozen);if(!visible)hiddenChecks++;}
    if(b.layers.length>1){peels++;expect(result.layerRemoved).toBe(true);expect(post.blocks.find(x=>x.id===b.id)!.layers).toEqual(b.layers.slice(1));}
    if(pre.flipDoors.length){expect(result.exitAnimationId).toBeDefined();for(const g of pre.flipDoors){const p=post.flipDoors.find(x=>x.id===g.id)!;expect(p.open).toBe(g.open);expect(p.frozen).toBe(Math.max(0,g.frozen-1));}
     expect(post.pendingExitFlipDoorIds?.[result.exitAnimationId!]).toEqual(pre.flipDoors.filter(g=>g.frozen===0).map(g=>g.id));expect(m.completeExitAnimation(result.exitAnimationId!)).toBe(true);
     for(const g of pre.flipDoors)expect(m.snapshot().flipDoors.find(x=>x.id===g.id)!.open).toBe(g.frozen===0?!g.open:g.open);expect(m.completeExitAnimation(result.exitAnimationId!)).toBe(false);
    }
   }
   expect(m.commitAction()).toBe(true);const after=m.snapshot();expect(after.moves).toBe(before.moves+1);parking+=Number(after.cleared===before.cleared);expect(after.failed).toBe(false);
  }
  const end=m.snapshot();expect(end.complete).toBe(true);expect(end.blocks).toEqual([]);expect(end.queuedBlocks).toEqual([]);expect(end.shutters.every(s=>s.revealed)).toBe(true);expect(end.moves).toBe(r.drags.length);expect(parking).toBe(r.upperBound);
  expect(end.cleared).toBe(l.blocks.reduce((n,b)=>n+(b.layers?.length??1),0));expect(peels).toBe(l.blocks.reduce((n,b)=>n+(b.layers?.length??1)-1,0));
  if(l.blocks.some(b=>b.shutterId&&b.frozen))expect(hiddenChecks).toBeGreaterThan(0);
 });
});
