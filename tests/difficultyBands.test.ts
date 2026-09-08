import { describe, expect, it } from "vitest";
import {
  BLOCK_OUT_DIFFICULTY_BANDS,
  blockOutDifficultyBand,
  calibratedBlockOutDifficulty,
  scoreBlockOutLevel,
} from "../src/core/blockOutDifficulty";
import {
  CHAPTER_ONE_DIFFICULTY_RAMP_OVERRIDES,
  CHAPTER_ONE_DIFFICULTY_RAMP_TARGETS,
  DIFFICULTY_BAND_OVERRIDES,
} from "../src/core/campaignDifficultyOverrides";
import { LEVELS } from "../src/core/levels";

const REGENERATED_LEVEL_IDS = [5, 11, 13, 15, 16, 17, 21, 22, 24, 25, 26, 28, 30, 34, 65, 70];

describe("five-band Block Out difficulty floor", () => {
  it("uses the adjusted 45-point entry floor and contiguous higher bands", () => {
    expect(BLOCK_OUT_DIFFICULTY_BANDS).toEqual([
      { id: "entry", label: "入门", min: 45, max: 49.99 },
      { id: "normal", label: "普通", min: 50, max: 59.99 },
      { id: "advanced", label: "进阶", min: 60, max: 69.99 },
      { id: "hard", label: "困难", min: 70, max: 79.99 },
      { id: "extreme", label: "极难", min: 80, max: 100 },
    ]);
  });

  it("keeps Lv2–100 inside the adjusted score bands and Lv1 as the explicit tutorial exception", () => {
    const outside = LEVELS.slice(1).map((level) => {
      const score = calibratedBlockOutDifficulty(scoreBlockOutLevel(level).score);
      return { levelId: level.id, score, band: blockOutDifficultyBand(score)?.id };
    }).filter(({ band }) => !band);
    expect(outside).toEqual([]);

    const tutorialScore = calibratedBlockOutDifficulty(scoreBlockOutLevel(LEVELS[0]).score);
    expect(LEVELS[0]).toMatchObject({ id: 1, name: "新手教程" });
    expect(LEVELS[0].onboardingHint).toBeDefined();
    expect(tutorialScore).toBeCloseTo(23.63, 2);
    expect(blockOutDifficultyBand(tutorialScore)).toBeUndefined();
  });

  it("regenerates exactly the former under-floor levels into the entry band", () => {
    expect(Object.keys(DIFFICULTY_BAND_OVERRIDES).map(Number).sort((a, b) => a - b))
      .toEqual(REGENERATED_LEVEL_IDS);
    for (const levelId of REGENERATED_LEVEL_IDS) {
      const score = calibratedBlockOutDifficulty(scoreBlockOutLevel(LEVELS[levelId - 1]).score);
      expect(score, `Lv${levelId} calibrated score`).toBeGreaterThanOrEqual(45);
      expect(score, `Lv${levelId} calibrated score`).toBeLessThan(50);
    }
  });

  it("keeps the approved Lv6–10 slope inside its narrow target windows", () => {
    expect(Object.keys(CHAPTER_ONE_DIFFICULTY_RAMP_OVERRIDES).map(Number)).toEqual([6, 7, 8, 9, 10]);
    for (const [idText, target] of Object.entries(CHAPTER_ONE_DIFFICULTY_RAMP_TARGETS)) {
      const levelId = Number(idText);
      const score = calibratedBlockOutDifficulty(scoreBlockOutLevel(LEVELS[levelId - 1]).score);
      expect(score, `Lv${levelId} target floor`).toBeGreaterThanOrEqual(target);
      expect(score, `Lv${levelId} target tolerance`).toBeLessThan(target + 0.25);
      expect(blockOutDifficultyBand(score)?.id).toBe("hard");
    }
  });
});
