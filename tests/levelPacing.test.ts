import { describe, expect, it } from "vitest";
import { calibratedBlockOutDifficulty, scoreBlockOutLevel } from "../src/core/blockOutDifficulty";
import { campaignPacingForTarget } from "../src/core/campaignDifficultyTargets";
import { LEVELS } from "../src/core/levels";

const VIDEO_PARITY_LEVELS_1_TO_100 = LEVELS.slice(0, 100);

const TIME_BY_DIFFICULTY = {
  easy: 180,
  normal: 180,
  hard: 150,
  super: 120,
} as const;

const VIDEO_CHAPTER_TIMERS = [90, 90, 90, 120, 60, 90, 90, 120, 160, 90] as const;

const clearLoad = (id: number): number => LEVELS[id - 1].blocks
  .reduce((sum, block) => sum + (block.layers?.length ?? 1), 0);

describe("authored level pacing", () => {
  it("keeps the approved Lv1-Lv10 pilot and maps every formal Lv11-Lv100 target to its pacing tier", () => {
    for (const level of VIDEO_PARITY_LEVELS_1_TO_100) {
      const target = level.designTargets?.calibratedDifficulty;
      expect(target, `level ${level.id}: ${level.name} target`).toBeTypeOf("number");
      const expected = level.id <= 10
        ? { difficulty: level.difficulty, timeSeconds: TIME_BY_DIFFICULTY[level.difficulty] }
        : campaignPacingForTarget(target ?? Number.NaN);
      expect(level.difficulty, `level ${level.id}: ${level.name} tier`).toBe(expected.difficulty);
      const expectedTime = level.id >= 31 && level.id <= 40
        ? VIDEO_CHAPTER_TIMERS[level.id - 31]
        : expected.timeSeconds;
      expect(level.timeSeconds, `level ${level.id}: ${level.name} timer`).toBe(expectedTime);
    }
  });

  it("locks representative clear loads and route-certification provenance", () => {
    const representatives = [
      [15, "hard", 150, 24, 11, 78, 5],
      [35, "super", 60, 26, 18, 82, 8],
      [36, "hard", 90, 24, 14, 76, 5],
      [50, "super", 120, 67, 32, 85, 5],
      [68, "super", 120, 51, 35, 86, 16],
      [70, "super", 120, 65, 36, 89, 5],
      [86, "super", 120, 58, 37, 86, 15],
      [91, "super", 120, 56, 38, 87, 8],
      [95, "super", 120, 49, 41, 94, 8],
      [100, "super", 120, 73, 42, 95, 18],
    ] as const;
    for (const [id, difficulty, timeSeconds, parMoves, load, target, floor] of representatives) {
      expect(LEVELS[id - 1]).toMatchObject({
        id,
        difficulty,
        timeSeconds,
        parMoves,
        designTargets: {
          calibratedDifficulty: target,
          minimumRepositionOverhead: floor,
        },
      });
      expect(clearLoad(id), `Lv${id} clear load`).toBe(load);
    }
  });

  it("stages each mechanic explanation at the current runtime milestones", () => {
    const introductions = VIDEO_PARITY_LEVELS_1_TO_100.filter((level) => level.featureIntro);
    expect(introductions.map((level) => [level.id, level.featureIntro?.kind])).toEqual([
      [6, "ice-door"],
      [10, "ice-block"],
      [15, "layer"],
      [20, "shutter"],
      [35, "generator"],
      [50, "arrow-block"],
      [59, "key-lock"],
      [65, "lift"],
      [70, "timed-generator"],
      [73, "staged-frame"],
      [100, "star"],
    ]);
    // The v8 tutorial overlay is metadata only; competitor-authored timers and
    // difficulty labels remain untouched by first-appearance messaging.
  });

  it("locks the measured Lv1-Lv10 profile without rewriting the approved pilot", () => {
    const measured = (id: number) => calibratedBlockOutDifficulty(scoreBlockOutLevel(LEVELS[id - 1]).score);
    expect(Array.from({ length: 10 }, (_, index) => measured(index + 1))).toEqual([
      30.87, 54.74, 48.7, 56.34, 60.61, 62.28, 60.07, 62.17, 57.91, 60.7,
    ]);
  });

  it("forms an upward five-level wave with the fifth level as each local peak", () => {
    for (let start = 6; start <= 96; start += 5) {
      const targets = VIDEO_PARITY_LEVELS_1_TO_100.slice(start - 1, start + 4)
        .map((level) => level.designTargets?.calibratedDifficulty ?? Number.NaN);
      expect(targets, `Lv${start}-Lv${start + 4} wave`)
        .toEqual([...targets].sort((left, right) => left - right));
      expect(targets[4], `Lv${start + 4} peak`).toBeGreaterThan(targets[0]);
    }
    expect(LEVELS[10].designTargets?.calibratedDifficulty)
      .toBeGreaterThan(LEVELS[5].designTargets?.calibratedDifficulty ?? 0);
    expect(LEVELS[99].designTargets?.calibratedDifficulty)
      .toBeGreaterThan(LEVELS[94].designTargets?.calibratedDifficulty ?? 0);
  });
});
