import { describe, expect, it } from "vitest";
import {
  JOURNEY_EPISODES,
  JOURNEY_MILESTONE_LEVELS,
  JOURNEY_MILESTONE_REWARDS,
  JOURNEY_SEGMENTS,
  JOURNEY_THEME_TITLES,
  clampJourneyLevel,
  deriveLegacyJourneyProgress,
  findPendingJourneyEvent,
  getJourneyEpisode,
  getJourneyEpisodeIndex,
  getJourneyEpisodeThemeIndex,
  getJourneyDefaultAnchorLevel,
  getJourneyReward,
  getJourneySegment,
  sanitizeJourneyEpisodeIndex,
  sanitizeJourneyProgressMemory,
} from "../src/core/journeyProgress";

describe("Journey progress model", () => {
  it("clamps progress and maps twenty chapters onto the ten supplied themes", () => {
    expect(clampJourneyLevel(-20)).toBe(1);
    expect(clampJourneyLevel(15.9)).toBe(15);
    expect(clampJourneyLevel(999)).toBe(200);
    expect(clampJourneyLevel(Number.NaN)).toBe(1);

    expect(JOURNEY_EPISODES).toHaveLength(20);
    expect(JOURNEY_EPISODES.map(({ index, startLevel, endLevel, unlockLevel }) => ({
      index,
      startLevel,
      endLevel,
      unlockLevel,
    }))).toEqual(Array.from({ length: 20 }, (_, offset) => ({
      index: offset + 1,
      startLevel: offset * 10 + 1,
      endLevel: offset * 10 + 10,
      unlockLevel: offset * 10 + 1,
    })));
    expect(JOURNEY_EPISODES.slice(0, 10).map(({ title }) => title)).toEqual(JOURNEY_THEME_TITLES);
    expect(JOURNEY_EPISODES.slice(10).map(({ title }) => title)).toEqual(
      JOURNEY_THEME_TITLES.map((title) => `${title} II`),
    );
    expect([1, 100, 101, 200].map(getJourneyEpisodeIndex)).toEqual([1, 10, 11, 20]);
    expect([1, 10, 11, 20, 21, Number.NaN].map(getJourneyEpisodeThemeIndex))
      .toEqual([0, 9, 0, 9, 0, 0]);
    expect(getJourneyEpisode(58)).toEqual({
      index: 6,
      title: "Sky Islands",
      range: [51, 60],
      startLevel: 51,
      endLevel: 60,
      unlockLevel: 51,
    });
    expect(getJourneyEpisode(158)).toMatchObject({
      index: 16,
      title: "Sky Islands II",
      range: [151, 160],
      unlockLevel: 151,
    });
  });

  it("derives milestone levels by repeating the supplied reward cadence", () => {
    const firstHundred = [10, 15, 25, 30, 35, 45, 50, 60, 65, 75, 80, 90, 95];
    expect(JOURNEY_MILESTONE_LEVELS).toEqual([
      ...firstHundred,
      ...firstHundred.map((level) => level + 100),
    ]);
    expect(JOURNEY_MILESTONE_LEVELS).toEqual(
      JOURNEY_MILESTONE_REWARDS.map((reward) => reward.level),
    );
  });

  it("builds twenty permanent ten-level segments", () => {
    expect(JOURNEY_SEGMENTS).toHaveLength(20);
    expect(getJourneySegment(1)).toEqual({ index: 1, startLevel: 1, endLevel: 10 });
    expect(getJourneySegment(58)).toEqual({ index: 6, startLevel: 51, endLevel: 60 });
    expect(getJourneySegment(100)).toEqual({ index: 10, startLevel: 91, endLevel: 100 });
    expect(getJourneySegment(101)).toEqual({ index: 11, startLevel: 101, endLevel: 110 });
    expect(getJourneySegment(200)).toEqual({ index: 20, startLevel: 191, endLevel: 200 });
  });

  it("places at least one reward inside every ten-level episode", () => {
    for (const episode of JOURNEY_EPISODES) {
      expect(JOURNEY_MILESTONE_REWARDS.some((reward) => (
        reward.level >= episode.startLevel && reward.level <= episode.endLevel
      )), `${episode.title} (${episode.startLevel}-${episode.endLevel})`).toBe(true);
    }
  });

  it("keeps the selected level on a stable opening anchor before free scrolling", () => {
    expect([1, 3, 4, 58, 95, 98, 100, 195, 198, 200, 9_999].map(getJourneyDefaultAnchorLevel))
      .toEqual([1, 1, 4, 58, 94, 98, 98, 194, 198, 198, 198]);
  });

  it("keeps the reference rewards and fills every otherwise-empty episode", () => {
    const firstHundredRewards = [
      { level: 10, kind: "coins", amount: 50 },
      { level: 15, kind: "unlimited_lives", amount: 1800 },
      { level: 25, kind: "unlimited_lives", amount: 3600 },
      { level: 30, kind: "pulse", amount: 1 },
      { level: 35, kind: "time", amount: 1 },
      { level: 45, kind: "rocket", amount: 1 },
      { level: 50, kind: "unlimited_lives", amount: 1800 },
      { level: 60, kind: "pulse", amount: 1 },
      { level: 65, kind: "time", amount: 1 },
      { level: 75, kind: "rocket", amount: 1 },
      { level: 80, kind: "pulse", amount: 1 },
      { level: 90, kind: "unlimited_lives", amount: 3600 },
      { level: 95, kind: "time", amount: 1 },
    ] as const;
    expect(JOURNEY_MILESTONE_REWARDS).toEqual([
      ...firstHundredRewards,
      ...firstHundredRewards.map((reward) => ({ ...reward, level: reward.level + 100 })),
    ]);
    expect(getJourneyReward(15)).toEqual({ level: 15, kind: "unlimited_lives", amount: 1800 });
    expect(getJourneyReward(25)).toEqual({ level: 25, kind: "unlimited_lives", amount: 3600 });
    expect(getJourneyReward(30)).toEqual({ level: 30, kind: "pulse", amount: 1 });
    expect(getJourneyReward(35)).toEqual({ level: 35, kind: "time", amount: 1 });
    expect(getJourneyReward(65)).toEqual({ level: 65, kind: "time", amount: 1 });
    expect(getJourneyReward(90)).toEqual({ level: 90, kind: "unlimited_lives", amount: 3600 });
    expect(getJourneyReward(95)).toEqual({ level: 95, kind: "time", amount: 1 });
    expect(getJourneyReward(195)).toEqual({ level: 195, kind: "time", amount: 1 });
    expect(new Set(JOURNEY_MILESTONE_REWARDS.map((reward) => reward.kind)))
      .toEqual(new Set(["time", "rocket", "pulse", "coins", "unlimited_lives"]));
    expect(getJourneyReward(18)).toBeUndefined();
    expect(getJourneyReward(999)).toBeUndefined();
  });

  it("keeps a selected theme within the chapters unlocked by progress", () => {
    expect(sanitizeJourneyEpisodeIndex(undefined, 100)).toBe(1);
    expect(sanitizeJourneyEpisodeIndex(Number.NaN, 100)).toBe(1);
    expect(sanitizeJourneyEpisodeIndex(-5, 100)).toBe(1);
    expect(sanitizeJourneyEpisodeIndex(4, 1)).toBe(1);
    expect(sanitizeJourneyEpisodeIndex(10, 40)).toBe(4);
    expect(sanitizeJourneyEpisodeIndex(10, 70)).toBe(7);
    expect(sanitizeJourneyEpisodeIndex(10, 71)).toBe(8);
    expect(sanitizeJourneyEpisodeIndex(999, 100)).toBe(10);
    expect(sanitizeJourneyEpisodeIndex(999, 200)).toBe(20);
    expect(sanitizeJourneyEpisodeIndex("2", 21)).toBe(2);
  });

  it("prioritizes unseen episode unlocks over the latest reward", () => {
    const pendingEpisode = findPendingJourneyEvent(25, {
      claimedMilestoneLevels: [],
      seenEpisodeUnlockLevels: [],
    });
    expect(pendingEpisode).toEqual({
      type: "episode_unlock",
      level: 11,
      episode: {
        index: 2,
        title: "Desert Kingdom",
        range: [11, 20],
        startLevel: 11,
        endLevel: 20,
        unlockLevel: 11,
      },
    });

    expect(findPendingJourneyEvent(25, {
      claimedMilestoneLevels: [10, 15],
      seenEpisodeUnlockLevels: [11, 21],
    }, [10, 15, 25])).toEqual({
      type: "milestone_reward",
      level: 25,
      reward: { level: 25, kind: "unlimited_lives", amount: 3600 },
    });
  });

  it("selects episode unlocks chronologically and rewards newest-first", () => {
    expect(findPendingJourneyEvent(100, {
      claimedMilestoneLevels: [],
      seenEpisodeUnlockLevels: [11],
    })?.level).toBe(21);

    expect(findPendingJourneyEvent(58, {
      claimedMilestoneLevels: [10, 15, 25, 30, 35, 45, 50],
      seenEpisodeUnlockLevels: [11, 21, 31, 41, 51],
    })).toBeUndefined();

    expect(findPendingJourneyEvent(90, {
      claimedMilestoneLevels: [10, 15, 25, 30, 35, 45, 50, 60, 65],
      seenEpisodeUnlockLevels: [11, 21, 31, 41, 51, 61, 71, 81],
    }, [10, 15, 25, 30, 35, 45, 50, 60, 65, 75, 80, 90])?.level).toBe(90);

    expect(findPendingJourneyEvent(4, {
      claimedMilestoneLevels: [],
      seenEpisodeUnlockLevels: [],
    })).toBeUndefined();
  });

  it("requires a milestone level to be completed rather than merely unlocked", () => {
    expect(findPendingJourneyEvent(10, {
      claimedMilestoneLevels: [],
      seenEpisodeUnlockLevels: [],
    })).toBeUndefined();

    expect(findPendingJourneyEvent(11, {
      claimedMilestoneLevels: [],
      seenEpisodeUnlockLevels: [11],
    })).toEqual({
      type: "milestone_reward",
      level: 10,
      reward: { level: 10, kind: "coins", amount: 50 },
    });
  });

  it("uses an explicit completed-level set as the milestone authority", () => {
    const memory = {
      claimedMilestoneLevels: [],
      seenEpisodeUnlockLevels: [11],
    };

    expect(findPendingJourneyEvent(10, memory, [10])).toEqual({
      type: "milestone_reward",
      level: 10,
      reward: { level: 10, kind: "coins", amount: 50 },
    });
    expect(findPendingJourneyEvent(11, memory, [])).toBeUndefined();
    expect(findPendingJourneyEvent(10, {
      ...memory,
      claimedMilestoneLevels: [10],
    }, [10])).toBeUndefined();
  });

  it("sanitizes corrupt persisted sets using valid Journey boundaries", () => {
    expect(sanitizeJourneyProgressMemory({
      claimedMilestoneLevels: [-9, 10, 10, 18, 999],
      seenEpisodeUnlockLevels: [0, 21, 21, 50, 71],
    })).toEqual({
      claimedMilestoneLevels: [10],
      seenEpisodeUnlockLevels: [21, 71],
    });
    expect(sanitizeJourneyProgressMemory(null)).toEqual({
      claimedMilestoneLevels: [],
      seenEpisodeUnlockLevels: [],
    });
  });

  it("derives non-replaying event sets for legacy saves", () => {
    expect(deriveLegacyJourneyProgress(1)).toEqual({
      claimedMilestoneLevels: [],
      seenEpisodeUnlockLevels: [],
    });
    expect(deriveLegacyJourneyProgress(24)).toEqual({
      claimedMilestoneLevels: [10, 15],
      seenEpisodeUnlockLevels: [11, 21],
    });
    expect(deriveLegacyJourneyProgress(10)).toEqual({
      claimedMilestoneLevels: [],
      seenEpisodeUnlockLevels: [],
    });
    expect(deriveLegacyJourneyProgress(11)).toEqual({
      claimedMilestoneLevels: [10],
      seenEpisodeUnlockLevels: [11],
    });
    expect(deriveLegacyJourneyProgress(10, [10])).toEqual({
      claimedMilestoneLevels: [10],
      seenEpisodeUnlockLevels: [],
    });
    expect(deriveLegacyJourneyProgress(11, [])).toEqual({
      claimedMilestoneLevels: [],
      seenEpisodeUnlockLevels: [11],
    });
    expect(deriveLegacyJourneyProgress(999)).toEqual({
      claimedMilestoneLevels: JOURNEY_MILESTONE_LEVELS,
      seenEpisodeUnlockLevels: Array.from({ length: 19 }, (_, index) => index * 10 + 11),
    });

    const migrated = deriveLegacyJourneyProgress(58);
    expect(findPendingJourneyEvent(58, migrated)).toBeUndefined();
  });
});
