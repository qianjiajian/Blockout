import { describe, expect, it } from "vitest";
import { LEAGUE_LEVELS } from "../src/core/leagueLevelData";
import {
  advanceLeagueOpponent, createLeagueOpponentProgress, leagueOpponentDailyQuota, leagueOpponentHours,
  LEAGUE_OPPONENT_LEVEL_POINTS, LEAGUE_OPPONENT_MAX_CLEARED, LEAGUE_OPPONENT_MAX_SCORE,
} from "../src/core/leagueOpponent";
import { opponentTypeForIndex, type OpponentType } from "../src/core/opponentPacing";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const START = Date.parse("2026-10-01T00:00:00+08:00");
const TYPES = ["casual", "steady", "active", "expert"] as const;
const INDEX: Record<OpponentType, number> = { casual: 0, steady: 20, active: 37, expert: 47 };
const prefix = (cleared: number): number => LEAGUE_LEVELS.slice(0, cleared)
  .reduce((sum, entry) => sum + entry.specials.length * 10, 0);
const fresh = (cleared = 0, time = START) => ({
  score: prefix(cleared), progress: createLeagueOpponentProgress(prefix(cleared), time),
});

describe("shared opponent personalities", () => {
  it("preserves the original mainline proportions and scales them to 49 opponents", () => {
    for (const [size, expected] of [[99, [40, 35, 20, 4]], [49, [20, 17, 10, 2]]] as const) {
      const types = Array.from({ length: size }, (_, index) => opponentTypeForIndex(index, size));
      expect(TYPES.map(type => types.filter(value => value === type).length)).toEqual(expected);
    }
  });
});

describe("league opponent daily progress", () => {
  it("derives awards from the formal inventory rather than a fixed per-level score", () => {
    expect(LEAGUE_OPPONENT_LEVEL_POINTS).toEqual(LEAGUE_LEVELS.map(entry => entry.specials.length * 10));
    expect(LEAGUE_OPPONENT_MAX_CLEARED).toBe(100);
    expect(LEAGUE_OPPONENT_MAX_SCORE).toBe(prefix(100));
  });

  it("uses the adopted daily quotas at every own-progress boundary and caps remaining levels", () => {
    const quotas = { casual: [2, 1, 1, 1], steady: [4, 3, 2, 2], active: [8, 4, 3, 2], expert: [12, 6, 4, 3] };
    for (const type of TYPES) {
      expect([0, 20, 60, 90].map(cleared => leagueOpponentDailyQuota(type, cleared))).toEqual(quotas[type]);
      expect([19, 59, 89].map(cleared => leagueOpponentDailyQuota(type, cleared))).toEqual(quotas[type].slice(0, 3));
      expect(leagueOpponentDailyQuota(type, 99)).toBe(1);
      expect(leagueOpponentDailyQuota(type, 100)).toBe(0);
    }
  });

  it("assigns exactly the quota of distinct deterministic hours, avoiding midnight", () => {
    for (const type of TYPES) for (const cleared of [0, 19, 20, 59, 60, 89, 90, 99, 100]) {
      for (let seed = 0; seed < 25; seed += 1) {
        const hours = leagueOpponentHours(type, cleared, seed);
        expect(hours).toEqual(leagueOpponentHours(type, cleared, seed));
        expect(hours).toHaveLength(leagueOpponentDailyQuota(type, cleared));
        expect(new Set(hours).size).toBe(hours.length);
        expect(hours.every(hour => Number.isInteger(hour) && hour >= 1 && hour <= 23)).toBe(true);
      }
    }
    expect(leagueOpponentHours("active", 0, 1)).not.toEqual(leagueOpponentHours("active", 0, 2));
  });

  it("finishes exactly each day's fixed quota and awards the corresponding level prefixes", () => {
    for (const type of TYPES) for (const cleared of [0, 20, 60, 90, 99]) {
      const before = fresh(cleared);
      const quota = leagueOpponentDailyQuota(type, cleared);
      const after = advanceLeagueOpponent(before, INDEX[type], 12345, 0, START, START + DAY - 1);
      expect(after.progress.cleared).toBe(cleared + quota);
      expect(after.progress.dayStartCleared).toBe(cleared);
      expect(after.score).toBe(prefix(cleared + quota));
      expect(before).toEqual(fresh(cleared));
    }
  });

  it("locks the morning quota through a threshold crossing, then slows on the next day", () => {
    const before = fresh(19);
    const dayOne = advanceLeagueOpponent(before, INDEX.expert, 44, 2, START, START + DAY - 1);
    expect(dayOne.progress).toMatchObject({ cleared: 31, dayStartCleared: 19 });
    const midnight = advanceLeagueOpponent(dayOne, INDEX.expert, 44, 2, START + DAY - 1, START + DAY);
    expect(midnight.score).toBe(dayOne.score);
    expect(midnight.progress).toMatchObject({ cleared: 31, dayStartCleared: 31, dayIndex: dayOne.progress.dayIndex + 1 });
    const dayTwo = advanceLeagueOpponent(midnight, INDEX.expert, 44, 2, START + DAY, START + 2 * DAY - 1);
    expect(dayTwo.progress).toMatchObject({ cleared: 37, dayStartCleared: 31 });
  });

  it("advances only after complete Beijing-hour boundaries, never on refresh or a clock rollback", () => {
    let state = fresh();
    let from = START;
    for (let hour = 1; hour <= 24; hour += 1) {
      const tick = START + hour * HOUR;
      const before = advanceLeagueOpponent(state, INDEX.active, 999, 1, from, tick - 1);
      expect(before).toEqual(state);
      const after = advanceLeagueOpponent(before, INDEX.active, 999, 1, tick - 1, tick);
      expect(after.progress.cleared - before.progress.cleared).toBeLessThanOrEqual(1);
      expect(advanceLeagueOpponent(after, INDEX.active, 999, 1, tick, tick)).toEqual(after);
      expect(advanceLeagueOpponent(after, INDEX.active, 999, 1, tick, tick - HOUR)).toEqual(after);
      state = after; from = tick;
    }
    expect(state.progress.cleared).toBe(8);
  });

  it("produces identical results after irregular refreshes, JSON reloads and one offline catch-up", () => {
    const from = START + 8 * HOUR + 13 * 60_000;
    const until = START + 15 * DAY - 1;
    for (const type of TYPES) {
      const before = fresh(19, from);
      let frequent = before, cursor = from;
      for (let time = from + 77 * 60_000; time < until; time += 77 * 60_000) {
        frequent = advanceLeagueOpponent(JSON.parse(JSON.stringify(frequent)), INDEX[type], 234, 7, cursor, time);
        cursor = time;
      }
      frequent = advanceLeagueOpponent(frequent, INDEX[type], 234, 7, cursor, until);
      expect(frequent).toEqual(advanceLeagueOpponent(before, INDEX[type], 234, 7, from, until));
    }
  });

  it("does not use player score, history, rank or league tier to choose progress", () => {
    const lowPlayer = { ...fresh(), playerScore: 0, playerRank: 50, tier: 0, scoreHistory: [] };
    const highPlayer = { ...fresh(), playerScore: 3000, playerRank: 1, tier: 7, scoreHistory: [{ atMs: START, score: 3000 }] };
    expect(advanceLeagueOpponent(lowPlayer, INDEX.active, 42, 1, START, START + 10 * DAY))
      .toEqual(advanceLeagueOpponent(highPlayer, INDEX.active, 42, 1, START, START + 10 * DAY));
  });

  it("migrates only after the saved time and retains a legacy score between catalog prefixes", () => {
    const legacyScore = prefix(1) + 5;
    const from = START + 12 * HOUR + 17_000;
    const legacy = { score: legacyScore };
    const initial = advanceLeagueOpponent(legacy, INDEX.expert, 45, 0, from, from);
    expect(initial.score).toBe(legacyScore);
    expect(initial.progress).toMatchObject({ cleared: 1, dayStartCleared: 1 });
    const advanced = advanceLeagueOpponent(legacy, INDEX.expert, 45, 0, from, START + DAY - 1);
    expect(advanced.progress.cleared).toBeGreaterThan(1);
    expect(advanced.progress.cleared).toBeLessThan(13);
    expect(advanced.score).toBe(legacyScore + prefix(advanced.progress.cleared) - prefix(1));
    expect(legacy).toEqual({ score: legacyScore });
  });

  it("stops after all 100 awards and never reduces a previously saved oversized score", () => {
    for (const type of TYPES) {
      const result = advanceLeagueOpponent(fresh(), INDEX[type], 18, 3, START, START + 500 * DAY);
      expect(result.progress.cleared).toBe(100);
      expect(result.score).toBe(LEAGUE_OPPONENT_MAX_SCORE);
    }
    const legacyScore = LEAGUE_OPPONENT_MAX_SCORE + 123;
    const result = advanceLeagueOpponent({ score: legacyScore }, INDEX.expert, 18, 3, START, START + 500 * DAY);
    expect(result.score).toBe(legacyScore);
    expect(result.progress).toMatchObject({ cleared: 100, dayStartCleared: 100 });
  });
});
