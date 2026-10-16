// @ts-expect-error Node fixture IO is outside the browser tsconfig.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/core/levels';
import { evaluateLevelStars, levelStarTargets } from '../src/core/levelStarConditions';
import type { LevelSpec } from '../src/core/types';

const readJson = (file: string): any => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const root = '../deliverables/star-targets181-187-20260929/';
const report = readJson(`${root}model-verification.json`) as {
  status: string;
  rows: Array<{
    id: number;
    oldMoveTarget: number;
    newMoveTarget: number;
    completeRoute: { valid: boolean; complete: boolean; totalDrags: number; nonClearingDrags: number };
    freshLowerBound: { thresholdProven: boolean; floor: number };
    currentRuntimeReplay: { valid: boolean; complete: boolean; error: string | null };
  }>;
};
const rows = [
  { id: 181, moves: 43, seconds: 79, totalSeconds: 110, oldMoves: 49, floor: 11, parking: 13 },
  { id: 187, moves: 36, seconds: 86, totalSeconds: 120, oldMoves: 31, floor: 11, parking: 15 },
];

describe('181/187 score-target modification', () => {
  it('binds the formal 185 and 187 adoption records to production LEVELS', () => {
    const adoption=readJson(`${root}formal-adoption-20260929.json`);
    const formal185=readJson(`${root}formal-packets/level185.json`);
    const formal187=readJson(`${root}formal-packets/level187.json`);
    expect(LEVELS[184]).toEqual(formal185.level);
    expect(LEVELS[186]).toEqual(formal187.level);
    expect(adoption.levels['185'].status).toBe('FORMAL_ADOPTED_POINTER_NATURAL_CLOCK_PASS');
    expect(adoption.levels['187'].status).toBe('FORMAL_ADOPTED_POINTER_NATURAL_CLOCK_PASS');
    expect(adoption.levels['181'].status).toBe('FORMAL_DATA_PRESENT_ROUTE_RECHECK_PENDING');
  });

  it('records preserved complete routes and fresh lower bounds without rewriting old evidence', () => {
    expect(report.status).toBe('SCORE_FIELDS_APPLIED_ROUTE_RECHECK_PENDING');
    for (const row of rows) {
      const result = report.rows.find((candidate) => candidate.id === row.id)!;
      expect(result.oldMoveTarget).toBe(row.oldMoves);
      expect(result.newMoveTarget).toBe(row.moves);
      expect(result.completeRoute).toMatchObject({
        valid: true,
        complete: true,
        totalDrags: row.moves,
        nonClearingDrags: row.parking,
      });
      expect(result.freshLowerBound).toMatchObject({ thresholdProven: true, floor: row.floor });
      expect(result.currentRuntimeReplay.valid).toBe(false);
      expect(result.currentRuntimeReplay.complete).toBe(false);
      expect(result.currentRuntimeReplay.error).toEqual(expect.any(String));
    }
  });

  it.each(rows)('uses the revised inclusive move boundary for Lv$id', ({ id, moves, seconds, totalSeconds, oldMoves }) => {
    const level = LEVELS[id - 1] as LevelSpec;
    expect(levelStarTargets(level)).toEqual({ moveTarget: moves, timeTargetSeconds: seconds });
    expect(level.timeSeconds).toBe(totalSeconds);
    expect(level.parMoves).toBe(oldMoves);
    expect(level.preservedMoveTarget).toBe(moves);
    expect(level.reward).toBe(200);
    expect(evaluateLevelStars(level, { moves, elapsedSeconds: seconds }).earnedStars).toBe(3);
    expect(evaluateLevelStars(level, { moves: moves + 1, elapsedSeconds: seconds }).earnedStars).toBe(2);
    expect(evaluateLevelStars(level, { moves, elapsedSeconds: seconds + 0.001 }).earnedStars).toBe(2);
  });
});
