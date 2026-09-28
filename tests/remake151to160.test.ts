// @ts-expect-error Node fixture IO is outside the browser tsconfig.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LEVELS, LEVELS_BEFORE_151_160_REMAKE } from '../src/core/levels';
import { applyRemake151to160, REMADE_151_160_IDS } from '../src/core/remake151to160';
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
const fixture = JSON.parse(readFileSync(new URL('./fixtures/remake151to160-v102.json', import.meta.url), 'utf8')) as {
  ruleVersion: string;
  rows: ReviewedRow[];
};
const levelFor = (id: number): LevelSpec => LEVELS.find(level => level.id === id)!;
const bands = { easy: [5, 10], normal: [11, 15], hard: [16, 20], super: [21, 30] } as const;
const scoreChanges = [
  { id: 157, previousMoveTarget: 42, moveTarget: 47, timeTargetSeconds: 68 },
  { id: 158, previousMoveTarget: 40, moveTarget: 59, timeTargetSeconds: 129 },
] as const;
// The immutable v1.102 fixture records the original score and full route. Only
// the two subsequently authorized move targets differ in the current map.
const expectedCurrentLevel = (row: ReviewedRow): LevelSpec => {
  const change = scoreChanges.find(item => item.id === row.id);
  return change ? { ...row.level, preservedMoveTarget: change.moveTarget } : row.level;
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

describe('reviewed 151–160 maps with the authorized 157/158 star targets', () => {
  it('maps exactly the reviewed subset and preserves every other object', () => {
    expect(fixture.ruleVersion).toBe('1.102.0');
    expect(fixture.rows.length).toBeGreaterThan(0);
    expect(new Set(fixture.rows.map(row => row.id)).size).toBe(fixture.rows.length);
    expect(REMADE_151_160_IDS).toEqual(fixture.rows.map(row => row.id));
    expect(LEVELS).toHaveLength(200);
    for (const before of LEVELS_BEFORE_151_160_REMAKE) {
      const row = fixture.rows.find(item => item.id === before.id);
      const atStage = applyRemake151to160(before);
      if (row) {
        expect(row.id).toBeGreaterThanOrEqual(151);
        expect(row.id).toBeLessThanOrEqual(160);
        expect(atStage).toEqual(expectedCurrentLevel(row));
        expect(levelFor(row.id)).toBe(atStage);
      } else {
        expect(atStage).toBe(before);
      }
    }
  });

  it.each(fixture.rows)('preserves Lv$id geometry, metadata, time target and whole native art', row => {
    const level = levelFor(row.id);
    const before = LEVELS_BEFORE_151_160_REMAKE.find(item => item.id === row.id)!;
    for (const key of ['id', 'width', 'height', 'playable', 'blocked', 'seams', 'name', 'timeSeconds', 'reward', 'parMoves'] as const) {
      expect(level[key], key).toEqual(before[key]);
    }
    expect(level.mechanismRules).toBe('revised-2026-09-27-v1.5');
    const change = scoreChanges.find(item => item.id === row.id);
    expect(levelStarTargets(level)).toEqual(change
      ? { moveTarget: change.moveTarget, timeTargetSeconds: change.timeTargetSeconds }
      : levelStarTargets(before));
    expect(levelStarTargets(level).timeTargetSeconds).toBe(levelStarTargets(before).timeTargetSeconds);
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
    for (const movesOver of [-1, 0, 1]) for (const secondsOver of [-1, 0, 1]) {
      expect(evaluateLevelStars(level, { moves: moveTarget + movesOver, elapsedSeconds: timeTargetSeconds + secondsOver }))
        .toMatchObject({ moveAchieved: movesOver <= 0, timeAchieved: secondsOver <= 0, earnedStars: 1 + Number(movesOver <= 0) + Number(secondsOver <= 0) });
    }
  });

  it.each(scoreChanges)('keeps the historical Lv$id fixture and adopts only its verified route move target', change => {
    const row = fixture.rows.find(item => item.id === change.id)!;
    expect(levelStarTargets(row.level)).toEqual({ moveTarget: change.previousMoveTarget, timeTargetSeconds: change.timeTargetSeconds });
    expect(row.drags).toHaveLength(change.moveTarget);
    expect(evaluateLevelStars(row.level, { moves: row.drags.length, elapsedSeconds: change.timeTargetSeconds }))
      .toMatchObject({ moveAchieved: false, timeAchieved: true, earnedStars: 2 });
    expect(levelFor(change.id)).toEqual({ ...row.level, preservedMoveTarget: change.moveTarget });
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
        for (const locked of [...beforeExit.blocks, ...beforeExit.queuedBlocks].filter(item => item.lockedBy)) {
          const next = [...afterExit.blocks, ...afterExit.queuedBlocks].find(item => item.id === locked.id)!;
          const matchingKeyReleased = block.layers.length === 1 && block.keyId === locked.lockedBy;
          if (matchingKeyReleased) {
            const remaining = (locked.lockCount ?? 1) - 1;
            expect(next.lockedBy).toBe(remaining > 0 ? locked.lockedBy : undefined);
            expect(next.lockCount).toBe(remaining > 0 ? remaining : undefined);
          } else {
            expect(next.lockedBy).toBe(locked.lockedBy);
            expect(next.lockCount).toBe(locked.lockCount);
          }
        }
        for (const curtain of beforeExit.shutters.filter(item => !item.skin || item.skin === 'shutter')) {
          const eligible = !curtain.triggerBlockIds || curtain.triggerBlockIds.includes(block.id);
          expect(afterExit.shutters.find(item => item.id === curtain.id)!.count)
            .toBe(eligible ? Math.max(0, curtain.count - 1) : curtain.count);
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
    // This verifies move-score attainability; elapsed time at the boundary is
    // synthetic here. Separate actual Pointer logs establish natural-time wins.
    expect(evaluateLevelStars(level, { moves: final.moves, elapsedSeconds: levelStarTargets(level).timeTargetSeconds }))
      .toMatchObject({ moveAchieved: true, timeAchieved: true, earnedStars: 3 });
  });
});
