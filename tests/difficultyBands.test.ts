import { describe, expect, it } from "vitest";
import {
  BLOCK_OUT_DIFFICULTY_BANDS,
  blockOutDifficultyBand,
  calibratedBlockOutDifficulty,
  scoreBlockOutLevel,
} from "../src/core/blockOutDifficulty";
import {
  DIFFICULTY_BAND_OVERRIDES,
} from "../src/core/campaignDifficultyOverrides";
import { LEVELS } from "../src/core/levels";

const VIDEO_PARITY_LEVELS_1_TO_100 = LEVELS.slice(0, 100);

const REGENERATED_LEVEL_IDS = [11, 13, 15, 16, 17, 21, 22, 24, 25, 26, 28, 30, 34, 65, 70];
const CHAPTER_ONE_COMPETITOR_SCORES = [60.61, 62.28, 60.07, 62.17, 57.91, 60.7] as const;
const CHAPTER_ONE_COMPETITOR_BANDS = ["advanced", "advanced", "advanced", "advanced", "normal", "advanced"] as const;

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

  it("keeps Lv5–100 inside the adjusted score bands and Lv1–4 as the explicit tutorial ramp", () => {
    const outside = VIDEO_PARITY_LEVELS_1_TO_100.slice(4).map((level) => {
      const score = calibratedBlockOutDifficulty(scoreBlockOutLevel(level).score);
      return { levelId: level.id, score, band: blockOutDifficultyBand(score)?.id };
    }).filter(({ band }) => !band);
    expect(outside).toEqual([]);

    const tutorialScores = VIDEO_PARITY_LEVELS_1_TO_100.slice(0, 4).map((level) => (
      calibratedBlockOutDifficulty(scoreBlockOutLevel(level).score)
    ));
    expect(LEVELS[0]).toMatchObject({ id: 1, name: "新手教程" });
    expect(LEVELS[0].onboardingHint).toBeDefined();
    expect(tutorialScores).toEqual([30.87, 54.74, 48.7, 56.34]);
    expect(tutorialScores.map((score) => blockOutDifficultyBand(score)?.id)).toEqual([
      undefined,
      "normal",
      "entry",
      "normal",
    ]);
  });

  it("keeps the legacy override registry stable while v5 levels use the approved hard-floor targets", () => {
    expect(Object.keys(DIFFICULTY_BAND_OVERRIDES).map(Number).sort((a, b) => a - b))
      .toEqual(REGENERATED_LEVEL_IDS);
    for (const levelId of REGENERATED_LEVEL_IDS.filter((id) => id > 10)) {
      const target = LEVELS[levelId - 1].designTargets?.calibratedDifficulty;
      expect(target, `Lv${levelId} target score`).toBeGreaterThanOrEqual(70);
      expect(blockOutDifficultyBand(target!)?.id, `Lv${levelId} target band`).toMatch(/hard|extreme/);
    }
  });

  it("keeps the measured competitor-composition bands for Lv5–10", () => {
    VIDEO_PARITY_LEVELS_1_TO_100.slice(4, 10).forEach((level, index) => {
      const levelId = level.id;
      const score = calibratedBlockOutDifficulty(scoreBlockOutLevel(LEVELS[levelId - 1]).score);
      expect(score, `Lv${levelId} exact score`).toBe(CHAPTER_ONE_COMPETITOR_SCORES[index]);
      expect(blockOutDifficultyBand(score)?.id).toBe(CHAPTER_ONE_COMPETITOR_BANDS[index]);
    });
  });
});
