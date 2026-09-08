import { describe, expect, it } from "vitest";
import { scoreBlockOutLevel } from "../src/core/blockOutDifficulty";
import { CHAPTER_ONE_DIFFICULTY_RAMP_TARGETS } from "../src/core/campaignDifficultyOverrides";
import { solveLevelForValidation, solveLevelOptimally } from "../src/core/levelSolver";
import { LEVELS } from "../src/core/levels";

const CALIBRATION = { slope: 0.826935, intercept: 13.161835 } as const;
const calibratedScore = (raw: number): number => CALIBRATION.intercept + CALIBRATION.slope * raw;

describe("chapter-one tutorial and Lv3 difficulty parity", () => {
  it("makes Lv1 the requested two-color, two-exit tutorial", () => {
    const tutorial = LEVELS[0];
    const optimal = solveLevelOptimally(tutorial);
    const score = calibratedScore(scoreBlockOutLevel(tutorial).score);
    expect(tutorial).toMatchObject({ id: 1, name: "新手教程", width: 5, height: 5, parMoves: 2 });
    expect(tutorial.playable).toHaveLength(25);
    expect(tutorial.blocked ?? []).toEqual([]);
    expect(tutorial.blocks).toHaveLength(2);
    expect(new Set(tutorial.blocks.map((block) => block.color)).size).toBe(2);
    expect(tutorial.gates).toHaveLength(2);
    expect(new Set(tutorial.gates.map((gate) => gate.color)).size).toBe(2);
    expect(tutorial.gates).toMatchObject([
      { id: "red-top", side: "top", offset: 0, size: 3, color: "blue" },
      { id: "blue-bottom", side: "bottom", offset: 2, size: 3, color: "green" },
    ]);
    expect(tutorial.blocks).toMatchObject([
      { id: "red-a", x: 0, y: 3, shape: [[0, 0], [1, 0], [0, 1], [1, 1]], color: "blue" },
      { id: "blue-a", x: 3, y: 0, shape: [[0, 0], [1, 0], [0, 1], [1, 1]], color: "green" },
    ]);
    expect(tutorial.onboardingHint).toEqual({ blockId: "red-a", path: [[0, 2], [0, 1], [0, 0]] });
    expect(tutorial.shutters).toBeUndefined();
    expect(tutorial.blocks.every((block) => !block.layers && !block.frozen)).toBe(true);
    expect(tutorial.gates.every((gate) => !gate.frozen)).toBe(true);
    expect(score).toBeCloseTo(23.63, 2);
    expect(optimal).toMatchObject({ solved: true, minimumDrags: 2, clearLoad: 2, repositionOverhead: 0, gridSteps: 6, turns: 0 });
  });

  it("keeps Lv2–5 inside the Lv3 score and optimal-drag bands", () => {
    const chapter = LEVELS.slice(1, 5);
    const results = chapter.map((level) => ({
      id: level.id,
      score: calibratedScore(scoreBlockOutLevel(level).score),
      optimal: solveLevelOptimally(level),
    }));

    for (const result of results) {
      expect(result.score, `Lv${result.id} calibrated score`).toBeGreaterThanOrEqual(45);
      expect(result.score, `Lv${result.id} calibrated score`).toBeLessThanOrEqual(48.3);
      expect(result.optimal.solved, `Lv${result.id} optimal proof`).toBe(true);
      expect(result.optimal.minimumDrags, `Lv${result.id} optimal drags`).toBeGreaterThanOrEqual(11);
      expect(result.optimal.minimumDrags, `Lv${result.id} optimal drags`).toBeLessThanOrEqual(13);
    }

    const mean = results.reduce((sum, result) => sum + result.score, 0) / results.length;
    expect(mean).toBeGreaterThanOrEqual(45);
    expect(mean).toBeLessThanOrEqual(48.3);
    expect(results.find((result) => result.id === 3)).toMatchObject({ id: 3, optimal: { solved: true, minimumDrags: 12 } });
  });

  it("uses the approved monotonic hard ramp for Lv6–10", () => {
    const expectedScores = [70.18, 72.1, 74.18, 75.52, 77.08];
    const expectedDrags = [12, 15, 26, 24, 19];
    const results = LEVELS.slice(5, 10).map((level) => ({
      id: level.id,
      score: calibratedScore(scoreBlockOutLevel(level).score),
      validation: solveLevelForValidation(level, 500_000),
    }));

    results.forEach((result, index) => {
      const target = CHAPTER_ONE_DIFFICULTY_RAMP_TARGETS[result.id as keyof typeof CHAPTER_ONE_DIFFICULTY_RAMP_TARGETS];
      expect(result.score, `Lv${result.id} calibrated score`).toBeCloseTo(expectedScores[index], 2);
      expect(result.score, `Lv${result.id} target floor`).toBeGreaterThanOrEqual(target);
      expect(result.score, `Lv${result.id} target tolerance`).toBeLessThan(target + 0.25);
      expect(result.validation, `Lv${result.id} validation proof`).toMatchObject({
        solved: true,
        minimumDrags: expectedDrags[index],
      });
      if (index > 0) expect(result.score).toBeGreaterThan(results[index - 1].score);
    });
  }, 60_000);

  it("keeps Lv1–5 at tutorial pacing and applies hard pacing to Lv6–10", () => {
    for (const level of LEVELS.slice(0, 5)) {
      expect(level.difficulty, `Lv${level.id} difficulty tag`).toBe("normal");
      expect(level.timeSeconds, `Lv${level.id} timer`).toBe(180);
    }
    for (const level of LEVELS.slice(5, 10)) {
      expect(level.difficulty, `Lv${level.id} difficulty tag`).toBe("hard");
      expect(level.timeSeconds, `Lv${level.id} timer`).toBe(150);
    }
  });
});
