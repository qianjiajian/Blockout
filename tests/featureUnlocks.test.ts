import { describe, expect, it } from "vitest";
import { FEATURE_UNLOCKS, isFeatureUnlocked, type FeatureId } from "../src/core/featureUnlocks";

const thresholds: ReadonlyArray<readonly [FeatureId, number]> = [
  ["levels", 10], ["leaderboard", 6], ["supply", 8], ["dailyTasks", 5],
  ["dailyChallenge", 15], ["achievements", 5], ["league", 20],
];

describe("feature unlocks after the specified campaign clear", () => {
  it("declares exactly the requested entry points and leaves guides disabled for tasks and achievements", () => {
    expect(Object.keys(FEATURE_UNLOCKS).sort()).toEqual(thresholds.map(([feature]) => feature).sort());
    for (const [feature, completedLevel] of thresholds) {
      expect(FEATURE_UNLOCKS[feature]).toEqual({
        completedLevel,
        guide: feature !== "dailyTasks" && feature !== "achievements",
      });
    }
  });

  it.each(thresholds)("keeps %s locked until level %i has been cleared", (feature, threshold) => {
    expect(isFeatureUnlocked(feature, { highestLevel: 1, rewardedLevels: [] })).toBe(false);
    expect(isFeatureUnlocked(feature, { highestLevel: threshold - 1, rewardedLevels: [] })).toBe(false);
    expect(isFeatureUnlocked(feature, {
      highestLevel: threshold,
      rewardedLevels: Array.from({ length: threshold - 1 }, (_, index) => index + 1),
    })).toBe(false);
    expect(isFeatureUnlocked(feature, { highestLevel: threshold + 1, rewardedLevels: [] })).toBe(true);
  });

  it.each(thresholds)("unlocks %s from the explicit clear of level %i even without a higher progress pointer", (feature, threshold) => {
    expect(isFeatureUnlocked(feature, { highestLevel: threshold, rewardedLevels: [threshold] })).toBe(true);
    expect(isFeatureUnlocked(feature, { highestLevel: 1, rewardedLevels: [threshold] })).toBe(true);
    expect(isFeatureUnlocked(feature, { highestLevel: threshold, rewardedLevels: [threshold - 1] })).toBe(false);
  });

  it.each(thresholds)("keeps %s available on old high-progress saves and ignores the currently browsed level", (feature, threshold) => {
    const replay = { highestLevel: threshold + 1, rewardedLevels: [], currentLevel: 1 };
    expect(isFeatureUnlocked(feature, replay)).toBe(true);
    expect(isFeatureUnlocked(feature, { highestLevel: 200, rewardedLevels: [] })).toBe(true);
    const unearnedPreview = { highestLevel: threshold, rewardedLevels: [], currentLevel: 200 };
    expect(isFeatureUnlocked(feature, unearnedPreview)).toBe(false);
  });

  it("does not mutate frozen progress, reward history or configuration on repeated queries", () => {
    const rewards = Object.freeze([5, 6, 8, 10, 15, 20]);
    const progress = Object.freeze({ highestLevel: 1, rewardedLevels: rewards });
    for (let iteration = 0; iteration < 3; iteration++) {
      for (const [feature] of thresholds) expect(isFeatureUnlocked(feature, progress)).toBe(true);
    }
    expect(progress).toEqual({ highestLevel: 1, rewardedLevels: [5, 6, 8, 10, 15, 20] });
    expect(progress.rewardedLevels).toBe(rewards);
    expect(Object.isFrozen(FEATURE_UNLOCKS)).toBe(true);
    for (const [feature, threshold] of thresholds) {
      expect(Object.isFrozen(FEATURE_UNLOCKS[feature])).toBe(true);
      expect(FEATURE_UNLOCKS[feature].completedLevel).toBe(threshold);
    }
  });
});
