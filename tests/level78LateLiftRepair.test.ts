// @ts-expect-error Node fixture IO is outside the browser tsconfig.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LEVELS, LEVELS_BEFORE_LEVEL78_LATE_LIFT_REPAIR, LEVELS_BEFORE_161_170_REMAKE } from '../src/core/levels';
import { applyLevel78LateLiftRepair } from '../src/core/level78LateLiftRepair';
import { PuzzleModel, validateLevel } from '../src/core/PuzzleModel';
import { replayRevisedRoute, type RevisedSearchDrag } from '../src/core/revisedLevelSearch';
import { levelStarTargets } from '../src/core/levelStarConditions';
import { matchFormalBlockShape } from '../src/game/formalBlockShapes';
import type { LevelSpec, PuzzleSnapshot } from '../src/core/types';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/level78-late-lift-v1104.json', import.meta.url), 'utf8')) as {
  level: LevelSpec; oldDeadlockRoute: RevisedSearchDrag[]; normalDrags: RevisedSearchDrag[]; lateDrags: RevisedSearchDrag[];
};
const before = LEVELS_BEFORE_LEVEL78_LATE_LIFT_REPAIR[77]!;
const after = LEVELS[77]!;
const run = (level: LevelSpec, drags: RevisedSearchDrag[], observe?: (snapshot: PuzzleSnapshot) => void) => {
  const model = new PuzzleModel(level);
  model.startCountdown();
  for (const drag of drags) {
    model.beginAction();
    for (const [x, y] of drag.path) {
      expect(model.moveBlockStep(drag.blockId, x, y)).toBe(true);
      observe?.(model.snapshot());
    }
    if (drag.exitSide) {
      expect(model.tryExit(drag.blockId, drag.exitSide).ok).toBe(true);
      observe?.(model.snapshot());
    }
    expect(model.commitAction()).toBe(true);
  }
  return model;
};

describe('Lv78 lift cargo remains solvable without exterior thaw events', () => {
  it('adopts only the accepted cargo, preserving all other final objects and scoring', () => {
    expect(after).toEqual(fixture.level);
    expect(applyLevel78LateLiftRepair(before)).toEqual(after);
    for (const [index, old] of LEVELS_BEFORE_LEVEL78_LATE_LIFT_REPAIR.entries()) {
      if (old.id !== 78) {
        expect(LEVELS_BEFORE_161_170_REMAKE[index]).toBe(old);
        expect(applyLevel78LateLiftRepair(old)).toBe(old);
      }
    }
    expect({ ...after, blocks: undefined }).toEqual({ ...before, blocks: undefined });
    expect(after.blocks.filter(b => !b.shutterId)).toEqual(before.blocks.filter(b => !b.shutterId));
    expect(levelStarTargets(after)).toEqual({ moveTarget: 37, timeTargetSeconds: 129 });
    expect(() => validateLevel(after)).not.toThrow();
  });

  it('keeps both ice-3 bodies and the original six whole shapes covering all 15 lift cells', () => {
    const hidden = after.blocks.filter(b => b.shutterId === 'lift');
    const cells = hidden.flatMap(b => b.shape.map(([x, y]) => [b.x + x, b.y + y]));
    expect(hidden).toHaveLength(6);
    expect(cells).toHaveLength(15);
    expect(new Set(cells.map(p => p.join(','))).size).toBe(15);
    expect(cells.every(([x, y]) => x! >= 0 && x! < 5 && y! >= 3 && y! < 6)).toBe(true);
    expect(hidden.filter(b => b.frozen).map(b => [b.id, b.color, b.frozen])).toEqual([
      ['r147-78-hidden-4', 'yellow', 3], ['r147-78-hidden-2', 'pink', 3],
    ]);
    for (const b of hidden) {
      expect(b.shape).toEqual(before.blocks.find(old => old.id === b.id)!.shape);
      expect(matchFormalBlockShape(b.shape, 'native-only')?.quarterTurns).toBe(0);
    }
  });

  it('retains the screenshot deadlock as a failing old-map regression', () => {
    expect(replayRevisedRoute(before, fixture.oldDeadlockRoute).valid).toBe(true);
    const start = run(before, fixture.oldDeadlockRoute);
    const key = (m: PuzzleModel) => JSON.stringify(m.snapshot().blocks.map(b => [b.id, b.x, b.y, b.frozen]));
    const states = [start], seen = new Set([key(start)]);
    for (const model of states) {
      for (const b of model.snapshot().blocks) {
        expect(model.possibleExitSides(model.getBlock(b.id)!)).toEqual([]);
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          const next = model.clone();
          if (!next.moveBlockStep(b.id, b.x + dx!, b.y + dy!)) continue;
          const k = key(next);
          if (!seen.has(k)) { seen.add(k); states.push(next); }
        }
      }
      expect(states.length).toBeLessThanOrEqual(8);
    }
    expect(states).toHaveLength(8);
  });

  it('finishes the main 37-drag route without tools', () => {
    expect(replayRevisedRoute(after, fixture.normalDrags)).toMatchObject({
      valid: true, complete: true, effectiveDrags: 37, nonClearingDrags: 18, clearEvents: 19,
    });
  });

  it('first reveals after all 13 exterior bodies clear, then thaws and clears using only cargo', () => {
    expect(replayRevisedRoute(after, fixture.lateDrags)).toMatchObject({ valid: true, complete: true, clearEvents: 19 });
    let first: PuzzleSnapshot | undefined;
    const model = run(after, fixture.lateDrags, snapshot => {
      if (!first && snapshot.shutters[0]?.revealed) first = snapshot;
      if (!snapshot.shutters[0]?.revealed) {
        expect(snapshot.blocks.filter(b => b.shutterId && b.frozen > 0).map(b => b.frozen)).toEqual([3, 3]);
      }
    });
    expect(first).toBeDefined();
    expect(first!.cleared).toBe(13);
    expect(first!.blocks.every(b => b.shutterId === 'lift')).toBe(true);
    expect(first!.blocks.filter(b => b.frozen).map(b => b.frozen)).toEqual([3, 3]);
    expect(model.snapshot()).toMatchObject({ complete: true, blocks: [] });
  });
});
