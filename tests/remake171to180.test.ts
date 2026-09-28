// @ts-expect-error Node fixture IO is outside the browser tsconfig.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LEVELS, LEVELS_BEFORE_171_180_REMAKE } from '../src/core/levels';
import { applyRemake171to180, REMADE_171_180_IDS } from '../src/core/remake171to180';
import { PuzzleModel } from '../src/core/PuzzleModel';
import { levelStarTargets } from '../src/core/levelStarConditions';
import { matchFormalBlockShapeForLevel } from '../src/game/formalBlockShapes';
import { isMechanismBlockVisible } from '../src/game/revisedMechanismPresentation';
import type { LevelSpec, PuzzleSnapshot } from '../src/core/types';
import type { RevisedSearchDrag } from '../src/core/revisedLevelSearch';
type Row = { id: number; level: LevelSpec; drags: RevisedSearchDrag[]; lowerBound: number; upperBound: number };
const fixture = JSON.parse(readFileSync(new URL('./fixtures/remake171to180-v106.json', import.meta.url), 'utf8')) as { ruleVersion: string; rows: Row[] };
const bands = { easy: [5, 10], normal: [11, 15], hard: [16, 20], super: [21, 30] } as const;
const SCORE_OVERRIDES: Record<number, number> = { 171: 35, 174: 47, 175: 46, 176: 51, 177: 38, 180: 35 };
const withoutScoreOverride = (level: LevelSpec): LevelSpec => {
  const copy = structuredClone(level);
  delete copy.preservedMoveTarget;
  return copy;
};
const queues = (a: PuzzleSnapshot, b: PuzzleSnapshot): void => {
  for (const g of b.generators) {
    const old = a.generators.find(x => x.id === g.id)!;
    expect(g.head).toBeGreaterThanOrEqual(old.head);
    expect(g.remaining).toBe(g.queueBlockIds.length - g.head);
    const pending = new Set(b.queuedBlocks.map(x => x.id));
    expect(g.queueBlockIds.filter(id => pending.has(id))).toEqual(g.queueBlockIds.slice(g.head));
    for (const id of g.queueBlockIds.slice(old.head, g.head)) {
      const block = b.blocks.find(x => x.id === id)!;
      expect([block.x, block.y]).toEqual(g.spawn);
    }
  }
};
describe('171–180 reviewed formal subset under v1.106', () => {
  it('maps only accepted IDs and preserves every other object at this stage', () => {
    expect(fixture.ruleVersion).toBe('1.106.0');
    expect(REMADE_171_180_IDS).toEqual(fixture.rows.map(r => r.id));
    expect(LEVELS).toHaveLength(200);
    for (const before of LEVELS_BEFORE_171_180_REMAKE) {
      const row = fixture.rows.find(r => r.id === before.id);
      const after = applyRemake171to180(before);
      if (!row) expect(after).toBe(before);
      else {
        expect(row.id).toBeGreaterThanOrEqual(171);
        expect(row.id).toBeLessThanOrEqual(180);
        expect(withoutScoreOverride(after)).toEqual(withoutScoreOverride(row.level));
        expect(LEVELS.find(l => l.id === row.id)).toBe(after);
      }
    }
  });
  it.each(fixture.rows)('preserves Lv$id geometry, original scores and native art', row => {
    const l = LEVELS.find(l => l.id === row.id)!;
    const before = LEVELS_BEFORE_171_180_REMAKE.find(l => l.id === row.id)!;
    for (const k of ['id', 'name', 'width', 'height', 'playable', 'blocked', 'seams', 'timeSeconds', 'parMoves', 'reward'] as const) expect(l[k], k).toEqual(before[k]);
    if (SCORE_OVERRIDES[row.id] !== undefined) expect(levelStarTargets(l).moveTarget).toBe(SCORE_OVERRIDES[row.id]);
    else expect(levelStarTargets(l)).toEqual(levelStarTargets(before));
    expect(l.mechanismRules).toBe('revised-2026-09-27-v1.5');
    for (const b of l.blocks) expect(matchFormalBlockShapeForLevel(b.shape, l.id)?.quarterTurns, b.id).toBe(0);
    // Recorded evidence bounds are checked for consistency; these assertions do not compute a new lower bound.
    expect(row.lowerBound).toBeGreaterThanOrEqual(bands[l.difficulty][0]);
    expect(row.upperBound).toBeLessThanOrEqual(bands[l.difficulty][1]);
    expect(row.lowerBound).toBeLessThanOrEqual(row.upperBound);
  });
  it.each(fixture.rows)('replays Lv$id full inventory with deferred flips and hidden ice', row => {
    const model = new PuzzleModel(structuredClone(row.level), { deferExitCompletion: true });
    model.startCountdown(); let last = model.snapshot(), nonClearing = 0;
    const check = (): PuzzleSnapshot => { const s = model.snapshot(); queues(last, s); expect(s.failed).toBe(false); last = s; return s; };
    for (const d of row.drags) {
      const before = model.snapshot(); model.beginAction();
      for (const at of d.path) { expect(model.moveBlockStep(d.blockId, ...at)).toBe(true); check(); }
      if (d.exitSide) {
        const a = model.snapshot(), body = a.blocks.find(b => b.id === d.blockId)!;
        const result = model.tryExit(d.blockId, d.exitSide); expect(result.ok).toBe(true); const b = check();
        expect(b.cleared).toBe(a.cleared + 1);
        for (const g of a.gates) expect(b.gates.find(x => x.id === g.id)!.frozen).toBe(Math.max(0, g.frozen - 1));
        for (const ice of a.blocks.filter(x => x.frozen > 0 && x.id !== d.blockId)) expect(b.blocks.find(x => x.id === ice.id)!.frozen).toBe(isMechanismBlockVisible(a, ice) ? ice.frozen - 1 : ice.frozen);
        if (body.layers.length > 1) { expect(result.layerRemoved).toBe(true); expect(b.blocks.find(x => x.id === body.id)!.layers).toEqual(body.layers.slice(1)); expect(b.blocks.find(x => x.id === body.id)!.timedBombSeconds).toBeUndefined(); }
        else expect(b.blocks.some(x => x.id === body.id)).toBe(false);
        if (a.flipDoors.length) {
          expect(result.exitAnimationId).toBeDefined();
          expect(b.pendingExitFlipDoorIds?.[result.exitAnimationId!]).toEqual(a.flipDoors.filter(x => x.frozen === 0).map(x => x.id));
          for (const g of a.flipDoors) expect(b.flipDoors.find(x => x.id === g.id)!.open).toBe(g.open);
          expect(model.completeExitAnimation(result.exitAnimationId!)).toBe(true); const done = check();
          for (const g of a.flipDoors) expect(done.flipDoors.find(x => x.id === g.id)!.open).toBe(g.frozen === 0 ? !g.open : g.open);
          expect(model.completeExitAnimation(result.exitAnimationId!)).toBe(false);
        }
      }
      expect(model.commitAction()).toBe(true); const after = check(); if (after.cleared === before.cleared) nonClearing++;
    }
    const final = model.snapshot(); expect(final.complete).toBe(true); expect(final.blocks).toEqual([]); expect(final.queuedBlocks).toEqual([]);
    expect(final.generators.every(g => g.remaining === 0)).toBe(true); expect(final.pendingExitAnimations).toBeUndefined();
    expect(final.cleared).toBe(row.level.blocks.reduce((n, b) => n + (b.layers?.length ?? 1), 0));
    expect(final.moves).toBe(row.drags.length); expect(nonClearing).toBe(row.upperBound);
    // Natural clocks and score caveats are verified separately by actual Pointer logs.
  });
});
