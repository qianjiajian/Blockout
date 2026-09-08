import { describe, expect, it } from "vitest";
import { LEVELS } from "../src/core/levels";
import { LEVEL_DIFFICULTY_OVERRIDES, LEVEL_TIME_OVERRIDES } from "../src/core/campaignExpansion";

const TIME_BY_DIFFICULTY = {
  normal: 180,
  hard: 150,
  super: 120,
} as const;

describe("authored level pacing", () => {
  it("keeps every difficulty label aligned with its default or measured per-level timer budget", () => {
    for (const level of LEVELS) {
      const expected = LEVEL_TIME_OVERRIDES[level.id] ?? TIME_BY_DIFFICULTY[level.difficulty];
      expect(level.timeSeconds, `level ${level.id}: ${level.name}`).toBe(expected);
    }
  });

  it("limits think-time exceptions to measured outliers without changing difficulty identity", () => {
    expect(LEVEL_TIME_OVERRIDES).toEqual({ 68: 150 });
    expect(LEVELS[67]).toMatchObject({ id: 68, difficulty: "super", timeSeconds: 150, parMoves: 29 });
  });

  it("calibrates late-game labels after board construction without inflating their clear load", () => {
    expect(LEVEL_DIFFICULTY_OVERRIDES).toEqual({
      6: "hard", 7: "hard", 8: "hard", 9: "hard", 10: "hard", 86: "super", 95: "hard",
    });
    const clearLoad = (id: number) => LEVELS[id - 1].blocks
      .reduce((sum, block) => sum + (block.layers?.length ?? 1), 0);
    expect(LEVELS[85]).toMatchObject({ id: 86, difficulty: "super", timeSeconds: 120, parMoves: 42 });
    expect(clearLoad(86)).toBe(19);
    expect(LEVELS[94]).toMatchObject({ id: 95, name: "决战调度", difficulty: "hard", timeSeconds: 150, parMoves: 25 });
    expect(clearLoad(95)).toBe(16);
    expect(LEVELS[99]).toMatchObject({ id: 100, difficulty: "super", timeSeconds: 120, parMoves: 31 });
    expect(clearLoad(100)).toBe(19);
  });

  it("stages each mechanic explanation with the approved early-ramp exception", () => {
    const introductions = LEVELS.filter((level) => level.featureIntro);
    expect(introductions.map((level) => [level.id, level.featureIntro?.kind])).toEqual([
      [6, "ice-block"],
      [7, "ice-door"],
      [8, "layer"],
      [35, "generator"],
      [50, "elevator"],
      [70, "conveyor"],
      [91, "star"],
    ]);
    for (const level of introductions) {
      const expectedDifficulty = level.id <= 8 ? "hard" : "normal";
      expect(level.difficulty, `level ${level.id}: ${level.featureIntro?.kind}`).toBe(expectedDifficulty);
      expect(level.timeSeconds, `level ${level.id}: ${level.featureIntro?.kind}`).toBe(expectedDifficulty === "hard" ? 150 : 180);
    }
  });

  it("follows each advanced mechanic introduction with a pressured application", () => {
    const firstApplication = {
      layer: LEVELS.find((level) => level.id === 9),
      generator: LEVELS.find((level) => level.id === 36),
    };
    expect(firstApplication.layer?.difficulty).toBe("hard");
    expect(firstApplication.generator?.difficulty).toBe("hard");
  });

  it("retains planned recovery beats before the late-game pressure peaks", () => {
    for (const id of Array.from({ length: 9 }, (_, index) => index * 10 + 5)) {
      const level = LEVELS.find((candidate) => candidate.id === id);
      expect(level?.difficulty, `level ${id}`).toBe("normal");
      expect(level?.timeSeconds, `level ${id}`).toBe(180);
    }
    expect(LEVELS[94]).toMatchObject({ id: 95, difficulty: "hard", timeSeconds: 150 });
  });
});
