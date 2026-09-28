import { describe, expect, it } from "vitest";
import {
  ACHIEVEMENT_MAX_LEVEL,
  ACHIEVEMENT_DEFINITIONS,
  buildAchievementProgressSummary,
  claimableAchievementIds,
  deriveCompletedAchievementLevelIds,
  evaluateAchievements,
  hasClaimableAchievements,
  sanitizeAchievementProgress,
  summarizeAchievementMetrics,
  sortAchievementEntries,
  type AchievementSaveSnapshot,
} from "../src/core/achievements";

const snapshot = (
  highestLevel = 1,
  rewardedLevels: readonly number[] = [],
  bestStars: Readonly<Record<string, number>> = {},
): AchievementSaveSnapshot => ({ highestLevel, rewardedLevels, bestStars });

describe("achievement domain", () => {
  it("accepts progression through the 200-level campaign", () => {
    expect(ACHIEVEMENT_MAX_LEVEL).toBe(200);
  });

  it("defines nineteen stable, unique progression achievements and their rewards", () => {
    expect(ACHIEVEMENT_DEFINITIONS).toEqual([
      { id: "levels-1", category: "levels", tier: 1, target: 1, rewardCoins: 50 },
      { id: "levels-10", category: "levels", tier: 2, target: 10, rewardCoins: 100 },
      { id: "levels-50", category: "levels", tier: 3, target: 50, rewardCoins: 250 },
      { id: "levels-100", category: "levels", tier: 4, target: 100, rewardCoins: 500 },
      { id: "levels-150", category: "levels", tier: 5, target: 150, rewardCoins: 750 },
      { id: "levels-200", category: "levels", tier: 6, target: 200, rewardCoins: 1000 },
      { id: "stars-10", category: "stars", tier: 1, target: 10, rewardCoins: 50 },
      { id: "stars-90", category: "stars", tier: 2, target: 90, rewardCoins: 150 },
      { id: "stars-180", category: "stars", tier: 3, target: 180, rewardCoins: 300 },
      { id: "stars-300", category: "stars", tier: 4, target: 300, rewardCoins: 500 },
      { id: "stars-450", category: "stars", tier: 5, target: 450, rewardCoins: 750 },
      { id: "stars-600", category: "stars", tier: 6, target: 600, rewardCoins: 1000 },
      { id: "perfect-3", category: "perfect", tier: 1, target: 3, rewardCoins: 50 },
      { id: "perfect-10", category: "perfect", tier: 2, target: 10, rewardCoins: 100 },
      { id: "perfect-30", category: "perfect", tier: 3, target: 30, rewardCoins: 200 },
      { id: "perfect-50", category: "perfect", tier: 4, target: 50, rewardCoins: 300 },
      { id: "perfect-100", category: "perfect", tier: 5, target: 100, rewardCoins: 500 },
      { id: "perfect-150", category: "perfect", tier: 6, target: 150, rewardCoins: 750 },
      { id: "perfect-200", category: "perfect", tier: 7, target: 200, rewardCoins: 1000 },
    ]);
    expect(new Set(ACHIEVEMENT_DEFINITIONS.map(({ id }) => id)).size).toBe(19);
    expect(ACHIEVEMENT_DEFINITIONS.reduce((total, item) => total + item.rewardCoins, 0)).toBe(8_300);
  });

  it("starts with no completed or claimable achievements", () => {
    const summary = buildAchievementProgressSummary(snapshot());
    expect(summary.completedLevelIds).toEqual([]);
    expect(summary.metrics).toEqual({ completedLevels: 0, totalStars: 0, perfectLevels: 0 });
    expect(summary.completedAchievementCount).toBe(0);
    expect(summary.claimableIds).toEqual([]);
    expect(summary.hasClaimableAchievements).toBe(false);
  });

  it("derives legacy clears below highestLevel and unions the durable reward ledger", () => {
    expect(deriveCompletedAchievementLevelIds(snapshot(5, [5, 5, 8, 0, 201]))).toEqual([
      1, 2, 3, 4, 5, 8,
    ]);
    expect(deriveCompletedAchievementLevelIds(snapshot(11))).toEqual(
      Array.from({ length: 10 }, (_, index) => index + 1),
    );
  });

  it("does not infer a clear of level 200 from the capped highest-level watermark", () => {
    const beforeFinalClear = deriveCompletedAchievementLevelIds(snapshot(200));
    expect(beforeFinalClear).toHaveLength(199);
    expect(beforeFinalClear.at(-1)).toBe(199);

    const afterFinalClear = deriveCompletedAchievementLevelIds(snapshot(200, [200]));
    expect(afterFinalClear).toHaveLength(200);
    expect(afterFinalClear.at(-1)).toBe(200);
  });

  it("counts second-hundred clears while preserving all existing achievement ids", () => {
    const completed = deriveCompletedAchievementLevelIds(snapshot(151, [175, 200, 201]));
    expect(completed).toHaveLength(152);
    expect(completed.slice(-3)).toEqual([150, 175, 200]);
    expect(ACHIEVEMENT_DEFINITIONS.map(({ id }) => id)).toContain("levels-100");
  });

  it("counts stars and perfect clears only for completed levels", () => {
    const progress = summarizeAchievementMetrics(snapshot(4, [], {
      "1": 3,
      "2": 2,
      "3": 99,
      "4": 3,
      "80": 3,
    }));
    expect(progress).toEqual({ completedLevels: 3, totalStars: 8, perfectLevels: 2 });
  });

  it("normalizes hostile snapshot data without creating phantom progress", () => {
    const hostile = {
      highestLevel: Number.NaN,
      rewardedLevels: [1, 1, 2.5, -1, 201, "2"],
      bestStars: { "1": -5, "2": "3", "201": 3, nope: 3 },
    } as unknown as AchievementSaveSnapshot;
    expect(deriveCompletedAchievementLevelIds(hostile)).toEqual([1]);
    expect(summarizeAchievementMetrics(hostile)).toEqual({
      completedLevels: 1,
      totalStars: 0,
      perfectLevels: 0,
    });
  });

  it("sanitizes claimed ids, removes duplicates, and restores canonical order", () => {
    expect(sanitizeAchievementProgress({
      claimedIds: ["perfect-3", "unknown", "levels-1", "perfect-3", 42],
    })).toEqual({ claimedIds: ["levels-1", "perfect-3"] });
    expect(sanitizeAchievementProgress(null)).toEqual({ claimedIds: [] });
    expect(sanitizeAchievementProgress({ claimedIds: "levels-1" })).toEqual({ claimedIds: [] });
  });

  it("evaluates category progress, caps display progress, and distinguishes claimed rewards", () => {
    const bestStars = Object.fromEntries(
      Array.from({ length: 10 }, (_, index) => [String(index + 1), index < 4 ? 3 : 2]),
    );
    const entries = evaluateAchievements(snapshot(11, [], bestStars), {
      claimedIds: ["levels-1", "perfect-3"],
    });

    expect(entries.find(({ id }) => id === "levels-1")).toMatchObject({
      progress: 1,
      completed: true,
      claimed: true,
      claimable: false,
    });
    expect(entries.find(({ id }) => id === "levels-10")).toMatchObject({
      progress: 10,
      completed: true,
      claimed: false,
      claimable: true,
    });
    expect(entries.find(({ id }) => id === "stars-10")).toMatchObject({
      progress: 10,
      completed: true,
      claimable: true,
    });
    expect(entries.find(({ id }) => id === "stars-90")).toMatchObject({
      progress: 24,
      completed: false,
      claimable: false,
    });
    expect(entries.find(({ id }) => id === "perfect-3")).toMatchObject({
      progress: 3,
      completed: true,
      claimed: true,
      claimable: false,
    });
  });

  it("returns stable claimable ids and a matching notification boolean", () => {
    const source = snapshot(11, [], Object.fromEntries(
      Array.from({ length: 10 }, (_, index) => [String(index + 1), 3]),
    ));
    const expected = ["levels-1", "levels-10", "stars-10", "perfect-3", "perfect-10"];
    expect(claimableAchievementIds(source)).toEqual(expected);
    expect(hasClaimableAchievements(source)).toBe(true);

    const claimed = { claimedIds: expected };
    expect(claimableAchievementIds(source, claimed)).toEqual([]);
    expect(hasClaimableAchievements(source, claimed)).toBe(false);
  });

  it("sorts player-facing rows as claimable, incomplete, then claimed", () => {
    const source = snapshot(11, [], Object.fromEntries(
      Array.from({ length: 10 }, (_, index) => [String(index + 1), 3]),
    ));
    const entries = sortAchievementEntries(evaluateAchievements(source, {
      claimedIds: ["levels-1", "perfect-3"],
    }));
    const ranks = entries.map((entry) => entry.claimable ? 0 : entry.claimed ? 2 : 1);
    expect(ranks).toEqual([...ranks].sort((left, right) => left - right));
    expect(entries.slice(0, 3).map(({ id }) => id)).toEqual(["levels-10", "stars-10", "perfect-10"]);
    expect(entries.slice(-2).map(({ id }) => id)).toEqual(["levels-1", "perfect-3"]);
  });
});
