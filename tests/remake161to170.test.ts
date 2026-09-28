// @ts-expect-error Node fixture IO is outside the browser tsconfig.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LEVELS, LEVELS_BEFORE_161_170_REMAKE } from '../src/core/levels';
import { applyRemake161to170, REMADE_161_170_IDS } from '../src/core/remake161to170';
import { PuzzleModel } from '../src/core/PuzzleModel';
import { evaluateLevelStars, levelStarTargets } from '../src/core/levelStarConditions';
import { matchFormalBlockShapeForLevel } from '../src/game/formalBlockShapes';
import { isMechanismBlockVisible } from '../src/game/revisedMechanismPresentation';
import type { LevelSpec, PuzzleSnapshot } from '../src/core/types';
import type { RevisedSearchDrag } from '../src/core/revisedLevelSearch';

type ReviewedRow = {
  id: number;
  level: LevelSpec;
  drags: RevisedSearchDrag[];
  lowerBound: number;
  upperBound: number;
};
const fixture = JSON.parse(readFileSync(new URL('./fixtures/remake161to170-v103.json', import.meta.url), 'utf8')) as {
  ruleVersion: string;
  rows: ReviewedRow[];
};
const levelFor = (id: number): LevelSpec => LEVELS.find(level => level.id === id)!;
const bands = { easy: [5, 10], normal: [11, 15], hard: [16, 20], super: [21, 30] } as const;
const scoreChanges = [
  { id: 161, previous: 39, current: 43 },
  { id: 167, previous: 43, current: 50 },
  { id: 168, previous: 55, current: 63 },
  { id: 170, previous: 33, current: 37 },
] as const;
// Keep the v1.103 fixture as historical evidence; v1.109 changes only four targets.
const expectedReviewedLevel = (row: ReviewedRow): LevelSpec => {
  const change = scoreChanges.find(item => item.id === row.id);
  return change ? { ...row.level, preservedMoveTarget: change.current } : row.level;
};

// Check actual queue membership at every unit action, including automatic releases
// during moves and exits. A completed route must consume the entire authored queue.
const checkQueues = (before: PuzzleSnapshot, after: PuzzleSnapshot): void => {
  for (const generator of after.generators) {
    const previous = before.generators.find(item => item.id === generator.id)!;
    expect(generator.head).toBeGreaterThanOrEqual(previous.head);
    expect(generator.remaining).toBe(generator.queueBlockIds.length - generator.head);
    expect(generator.nextBlockId).toBe(generator.queueBlockIds[generator.head]);
    const queuedIds = new Set(after.queuedBlocks.map(block => block.id));
    expect(generator.queueBlockIds.filter(id => queuedIds.has(id))).toEqual(generator.queueBlockIds.slice(generator.head));
    for (const id of generator.queueBlockIds.slice(previous.head, generator.head)) {
      const released = after.blocks.find(block => block.id === id)!;
      expect(released, `released cargo ${id}`).toBeDefined();
      expect([released.x, released.y]).toEqual(generator.spawn);
    }
  }
};

describe('reviewed 161–170 formal adoption with v1.109 score targets', () => {
  it('maps exactly the reviewed subset and preserves every other object', () => {
    expect(fixture.ruleVersion).toBe('1.103.0');
    expect(fixture.rows.length).toBeGreaterThan(0);
    expect(new Set(fixture.rows.map(row => row.id)).size).toBe(fixture.rows.length);
    expect(REMADE_161_170_IDS).toEqual(fixture.rows.map(row => row.id));
    expect(LEVELS).toHaveLength(200);
    for (const before of LEVELS_BEFORE_161_170_REMAKE) {
      const row = fixture.rows.find(item => item.id === before.id);
      const atStage = applyRemake161to170(before);
      if (row) {
        expect(row.id).toBeGreaterThanOrEqual(161);
        expect(row.id).toBeLessThanOrEqual(170);
        expect(atStage).toEqual(expectedReviewedLevel(row));
        expect(levelFor(row.id)).toBe(atStage);
      } else {
        expect(atStage).toBe(before);
      }
    }
  });

  it('changes only four score overrides and preserves the other 196 level values', () => {
    const changedIds: number[] = [];
    let preservedCount = 0;
    for (const before of LEVELS_BEFORE_161_170_REMAKE) {
      const row = fixture.rows.find(item => item.id === before.id);
      const historical = row?.level ?? before;
      const current = applyRemake161to170(before);
      const change = scoreChanges.find(item => item.id === before.id);
      if (change) {
        expect(levelStarTargets(historical).moveTarget).toBe(change.previous);
        expect(current).toEqual({ ...historical, preservedMoveTarget: change.current });
        expect(current.parMoves).toBe(historical.parMoves);
        expect(row!.drags).toHaveLength(change.current);
        changedIds.push(before.id);
      } else {
        expect(current).toEqual(historical);
        preservedCount++;
      }
    }
    expect(changedIds).toEqual([161, 167, 168, 170]);
    expect(preservedCount).toBe(196);
  });

  it.each(fixture.rows)('preserves Lv$id geometry, metadata, scoring and whole native art', row => {
    const level = levelFor(row.id);
    const before = LEVELS_BEFORE_161_170_REMAKE.find(item => item.id === row.id)!;
    for (const key of ['id', 'width', 'height', 'playable', 'blocked', 'seams', 'name', 'timeSeconds', 'reward', 'parMoves'] as const) {
      expect(level[key], key).toEqual(before[key]);
    }
    expect(level.mechanismRules).toBe('revised-2026-09-27-v1.5');
    const historicalTargets = levelStarTargets(before);
    const change = scoreChanges.find(item => item.id === row.id);
    expect(levelStarTargets(level)).toEqual({
      moveTarget: change?.current ?? historicalTargets.moveTarget,
      timeTargetSeconds: historicalTargets.timeTargetSeconds,
    });
    for (const block of level.blocks) {
      expect(matchFormalBlockShapeForLevel(block.shape, level.id)?.quarterTurns, block.id).toBe(0);
    }
    const band = bands[level.difficulty];
    // These are recorded proof bounds, not a fresh lower-bound computation.
    expect(row.lowerBound).toBeGreaterThanOrEqual(band[0]);
    expect(row.upperBound).toBeLessThanOrEqual(band[1]);
    expect(row.lowerBound).toBeLessThanOrEqual(row.upperBound);
  });

  it.each(fixture.rows)('retains inclusive, independent score boundaries for Lv$id', row => {
    const level = levelFor(row.id);
    const { moveTarget, timeTargetSeconds } = levelStarTargets(level);
    for (const movesOver of [0, 1]) for (const secondsOver of [0, 1]) {
      expect(evaluateLevelStars(level, { moves: moveTarget + movesOver, elapsedSeconds: timeTargetSeconds + secondsOver }))
        .toMatchObject({ moveAchieved: movesOver === 0, timeAchieved: secondsOver === 0, earnedStars: 3 - movesOver - secondsOver });
    }
  });

  it.each(fixture.rows)('completes Lv$id with the full inventory and real clear/animation semantics', row => {
    const level = levelFor(row.id);
    const model = new PuzzleModel(structuredClone(level), { deferExitCompletion: true });
    model.startCountdown();
    let nonClearing = 0;
    let thawEvents = 0;
    let shellEvents = 0;
    let hiddenIceChecks = 0;
    let previous = model.snapshot();
    const checkTransition = (): PuzzleSnapshot => {
      const next = model.snapshot();
      checkQueues(previous, next);
      expect(next.failed).toBe(false);
      previous = next;
      return next;
    };
    for (const drag of row.drags) {
      const beforeDrag = model.snapshot();
      model.beginAction();
      for (const point of drag.path) {
        expect(model.moveBlockStep(drag.blockId, ...point), `${row.id}/${drag.blockId}/${point}`).toBe(true);
        checkTransition();
      }
      if (drag.exitSide) {
        const beforeExit = model.snapshot();
        const block = beforeExit.blocks.find(item => item.id === drag.blockId)!;
        const exit = model.tryExit(drag.blockId, drag.exitSide);
        expect(exit.ok).toBe(true);
        const afterExit = checkTransition();
        expect(afterExit.cleared).toBe(beforeExit.cleared + 1);
        for (const gate of beforeExit.gates) {
          expect(afterExit.gates.find(item => item.id === gate.id)!.frozen).toBe(Math.max(0, gate.frozen - 1));
        }
        for (const ice of beforeExit.blocks.filter(item => item.frozen > 0 && item.id !== drag.blockId)) {
          const visible = isMechanismBlockVisible(beforeExit, ice);
          expect(afterExit.blocks.find(item => item.id === ice.id)!.frozen).toBe(visible ? ice.frozen - 1 : ice.frozen);
          if (!visible) hiddenIceChecks++;
        }
        if (block.layers.length > 1) {
          shellEvents++;
          expect(exit.layerRemoved).toBe(true);
          expect(afterExit.blocks.find(item => item.id === block.id)!.layers).toEqual(block.layers.slice(1));
          expect(afterExit.blocks.find(item => item.id === block.id)!.timedBombSeconds).toBeUndefined();
        } else {
          expect(afterExit.blocks.some(item => item.id === block.id)).toBe(false);
        }
        if (beforeExit.flipDoors.length) {
          expect(exit.exitAnimationId).toBeDefined();
          for (const door of beforeExit.flipDoors) {
            const pendingDoor = afterExit.flipDoors.find(item => item.id === door.id)!;
            expect(pendingDoor.frozen).toBe(Math.max(0, door.frozen - 1));
            expect(pendingDoor.open).toBe(door.open);
            if (door.frozen === 1) thawEvents++;
          }
          expect(afterExit.pendingExitFlipDoorIds?.[exit.exitAnimationId!]).toEqual(beforeExit.flipDoors.filter(door => door.frozen === 0).map(door => door.id));
          expect(model.completeExitAnimation(exit.exitAnimationId!)).toBe(true);
          const completed = checkTransition();
          for (const door of beforeExit.flipDoors) {
            expect(completed.flipDoors.find(item => item.id === door.id)!.open).toBe(door.frozen === 0 ? !door.open : door.open);
          }
          expect(model.completeExitAnimation(exit.exitAnimationId!)).toBe(false);
          expect(model.snapshot()).toEqual(completed);
        }
      }
      expect(model.commitAction()).toBe(true);
      const afterDrag = checkTransition();
      if (beforeDrag.cleared === afterDrag.cleared) nonClearing++;
    }
    const final = model.snapshot();
    expect(final.complete).toBe(true);
    expect(final.blocks).toEqual([]);
    expect(final.queuedBlocks).toEqual([]);
    expect(final.pendingExitAnimations).toBeUndefined();
    expect(final.generators.every(generator => generator.remaining === 0)).toBe(true);
    expect(final.moves).toBe(row.drags.length);
    expect(final.cleared).toBe(level.blocks.reduce((sum, block) => sum + (block.layers?.length ?? 1), 0));
    expect(nonClearing).toBe(row.upperBound);
    expect(shellEvents).toBe(level.blocks.reduce((sum, block) => sum + (block.layers?.length ?? 1) - 1, 0));
    expect(thawEvents).toBe((level.flipDoors ?? []).filter(door => (door.frozen ?? 0) > 0).length);
    if (level.blocks.some(block => block.shutterId && (block.frozen ?? 0) > 0)) expect(hiddenIceChecks).toBeGreaterThan(0);
    expect(evaluateLevelStars(level, {
      moves: final.moves,
      elapsedSeconds: levelStarTargets(level).timeTargetSeconds,
    }).moveAchieved).toBe(true);
    // This verifies route move counts; natural-time input is checked separately.
  });
});
