import { describe, expect, it } from "vitest";
import { normalizeMainlineRankingProgress as normalize, observeMainlineRanking as observe, recordMainlineRankingStars as recordStars, rankingWeekStartMs } from "../src/core/mainlineRankingProgress";

const START = Date.parse("2026-10-05T00:00:00+08:00"), DAY = 86_400_000;
describe("mainline ranking weekly ledger", () => {
  it("uses Monday midnight in Beijing, independently of the host timezone", () => {
    expect(rankingWeekStartMs(START)).toBe(START);
    expect(rankingWeekStartMs(START - 1)).toBe(START - 7 * DAY);
    expect(rankingWeekStartMs(START + 7 * DAY - 1)).toBe(START);
  });
  it("starts a legacy save from zero with a fixed migration baseline", () => {
    const state = normalize(undefined, START + DAY, START - 10 * DAY);
    expect(state).toMatchObject({ epochMs: START - 10 * DAY, weekStartMs: START, weeklyStars: 0, weekBaselineMs: START + DAY });
    expect(normalize(state, START + 2 * DAY)).toEqual(state);
  });
  it("records only new best-star deltas, including replay improvements", () => {
    const initial = normalize(undefined, START);
    const first = recordStars(initial, 0, 3, START + 10);
    const replay = recordStars(first, 1, 3, START + 20);
    expect(replay.weeklyStars).toBe(5);
    expect(recordStars(replay, 3, 3, START + 30).weeklyStars).toBe(5);
    expect(recordStars(replay, 3, 1, START + 30).weeklyStars).toBe(5);
    expect(initial.weeklyStars).toBe(0);
  });
  it("rolls only the current week and retains province and original opponent epoch", () => {
    const state = { ...recordStars(normalize(undefined, START, START - DAY), 0, 3, START + 10), province: "44", provinceSource: "ip" as const };
    const next = observe(state, START + 70 * DAY);
    expect(next).toMatchObject({ epochMs: START - DAY, province: "44", provinceSource: "ip", weeklyStars: 0, weekBaselineMs: START + 70 * DAY });
    expect(recordStars(state, 0, 2, START + 7 * DAY).weeklyStars).toBe(2);
  });
  it("clock rollback neither loses stars nor resets the opponent clock", () => {
    const state = recordStars(normalize(undefined, START), 0, 3, START + 8 * DAY);
    expect(observe(state, START)).toEqual(state);
    expect(normalize(state, START)).toEqual(state);
    expect(recordStars(state, 1, 2, START).weeklyStars).toBe(4);
  });
  it.each([
    { weeklyStars: -1 }, { weeklyStars: 601 }, { weeklyStars: "3" }, { weeklyStars: 1.5 },
    { lastObservedMs: NaN }, { epochMs: START + DAY }, { weekStartMs: START + 1 }, { weekBaselineMs: START - 1 },
  ])("rejects malformed ledger fields without fabricating weekly stars: %j", bad => {
    const state = { ...recordStars(normalize(undefined, START), 0, 3, START), ...bad };
    expect(normalize(state, START).weeklyStars).toBe(0);
  });
  it("accepts only a supported province plus explicit source and returns a new object", () => {
    const state = { ...normalize(undefined, START), province: "44", provinceSource: "random" };
    expect(normalize(state, START)).toEqual(state);
    expect(normalize(state, START)).not.toBe(state);
    for (const bad of [{ province: "440000" }, { provinceSource: "gps" }, { province: "99" }])
      expect(normalize({ ...state, ...bad }, START).province).toBeUndefined();
  });
});
