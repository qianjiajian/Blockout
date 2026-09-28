// @ts-expect-error Node fixture IO is outside the browser tsconfig.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LEVELS, LEVELS_BEFORE_191_200_REMAKE } from '../src/core/levels';
import { applyRemake191to200, REMADE_191_200_IDS } from '../src/core/remake191to200';
import { PuzzleModel } from '../src/core/PuzzleModel';
import { levelStarTargets } from '../src/core/levelStarConditions';
import { matchFormalBlockShapeForLevel } from '../src/game/formalBlockShapes';
import type { LevelSpec } from '../src/core/types';
import type { RevisedSearchDrag } from '../src/core/revisedLevelSearch';
type Row = { id: number; level: LevelSpec; drags: RevisedSearchDrag[]; lowerBound: number; upperBound: number };
const fixture = JSON.parse(readFileSync(new URL('./fixtures/remake191to200-v108.json', import.meta.url), 'utf8')) as { ruleVersion: string; rows: Row[] };
const ranges = { easy: [5,10], normal: [11,15], hard: [16,20], super: [21,30] } as const;
const scoreOverrides: Record<number, number> = { 191: 31, 196: 27 };

describe('191–200 reviewed original layouts under v1.108', () => {
  it('applies the reviewed subset and retains every unrelated object at its stage', () => {
    expect(fixture.ruleVersion).toBe('1.108.0');
    expect(REMADE_191_200_IDS).toEqual(fixture.rows.map(r => r.id));
    expect(LEVELS).toHaveLength(200);
    for (const before of LEVELS_BEFORE_191_200_REMAKE) {
      const row = fixture.rows.find(r => r.id === before.id);
      const after = applyRemake191to200(before);
      if (row) {
        expect(after).toEqual(row.level);
        expect(LEVELS.find(l => l.id === row.id)).toBe(after);
      } else expect(after).toBe(before);
    }
  });

  it.each(fixture.rows)('Lv$id retains geometry, scoring and native whole artwork', row => {
    const old = LEVELS_BEFORE_191_200_REMAKE.find(l => l.id === row.id)!;
    for (const k of ['id','name','width','height','playable','blocked','seams','timeSeconds','parMoves','reward'] as const) expect(row.level[k]).toEqual(old[k]);
    const oldTargets = levelStarTargets(old);
    const nextTargets = levelStarTargets(row.level);
    expect(nextTargets.timeTargetSeconds).toBe(oldTargets.timeTargetSeconds);
    expect(nextTargets.moveTarget).toBe(scoreOverrides[row.id] ?? oldTargets.moveTarget);
    expect(row.level.mechanismRules).toBe('revised-2026-09-27-v1.5');
    const [low,high] = ranges[row.level.difficulty];
    expect(row.lowerBound).toBeGreaterThanOrEqual(low);
    expect(row.upperBound).toBeLessThanOrEqual(high);
    for (const b of row.level.blocks) {
      expect(matchFormalBlockShapeForLevel(b.shape,row.id)?.quarterTurns).toBe(0);
      if (b.movementAxis) expect(b.shape.length).toBe((1+Math.max(...b.shape.map(p=>p[0])))*(1+Math.max(...b.shape.map(p=>p[1]))));
    }
  });

  it.each(fixture.rows)('Lv$id executes the entire inventory and certified route upper bound', row => {
    const m = new PuzzleModel(row.level); m.startCountdown();let nonClearing=0;
    for (const drag of row.drags) {
      const before=m.snapshot();m.beginAction();
      for (const [x,y] of drag.path) expect(m.moveBlockStep(drag.blockId,x,y)).toBe(true);
      if (drag.exitSide) expect(m.tryExit(drag.blockId,drag.exitSide).ok).toBe(true);
      expect(m.commitAction()).toBe(true);
      const after=m.snapshot();expect(after.moves).toBe(before.moves+1);
      if (after.cleared===before.cleared) nonClearing++;
    }
    const end=m.snapshot();expect(end.complete).toBe(true);expect(end.failed).toBe(false);
    expect(end.blocks).toHaveLength(0);expect(end.queuedBlocks).toHaveLength(0);
    expect(end.moves).toBe(row.drags.length);expect(nonClearing).toBe(row.upperBound);
  });

  it('Lv200 preserves colored-floor collision after the covering red block leaves', () => {
    const row=fixture.rows.find(r=>r.id===200);expect(row).toBeDefined();
    const m=new PuzzleModel(row!.level);m.startCountdown();let checked=0;
    for(const drag of row!.drags){
      const s=m.snapshot();for(const b of s.blocks.filter(b=>b.color!=='red'))for(const grid of s.coloredGrids)for(const[x,y]of grid.cells){
        const body=m.getBlock(b.id)!;expect(m.canPlace(body,x-b.shape[0][0],y-b.shape[0][1])).toBe(false);checked++;
      }
      m.beginAction();for(const[x,y]of drag.path)m.moveBlockStep(drag.blockId,x,y);if(drag.exitSide)m.tryExit(drag.blockId,drag.exitSide);m.commitAction();
    }
    expect(checked).toBeGreaterThan(0);expect(m.snapshot().coloredGrids[0].cells).toHaveLength(12);
  });
});
