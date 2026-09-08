import { describe, expect, it } from "vitest";
import {
  localDayKey,
  millisecondsUntilNextLocalDay,
  previousDayKey,
  selectDailyLevel,
  settleDailyChallenge,
} from "../src/core/daily";

describe("daily challenge", () => {
  it("formats local dates and crosses month boundaries safely", () => {
    expect(localDayKey(new Date(2026, 7, 31, 12))).toBe("2026-08-31");
    expect(previousDayKey("2026-03-01")).toBe("2026-02-28");
    expect(millisecondsUntilNextLocalDay(new Date(2026, 7, 31, 23, 59, 59, 750))).toBe(250);
    expect(millisecondsUntilNextLocalDay(new Date(2026, 7, 31, 12))).toBe(12 * 60 * 60 * 1000);
  });

  it("selects one stable level only from completed content", () => {
    const completed = [9, 2, 9, 30, 5, 100, 101];
    const selected = selectDailyLevel("2026-08-31", completed);
    expect(completed).toContain(selected);
    expect(selectDailyLevel("2026-08-31", completed)).toBe(selected);
    expect(selectDailyLevel("2026-08-31", completed, 30)).not.toBe(100);
    expect(selectDailyLevel("2026-08-31", [100])).toBe(100);
    expect(selectDailyLevel("2026-08-31", [101])).toBeUndefined();
    expect(selectDailyLevel("2026-08-31", [])).toBeUndefined();
  });

  it("grants the daily reward once and increments consecutive streaks", () => {
    const first = settleDailyChallenge("2026-08-31", "2026-08-30", 4, 3);
    expect(first).toEqual({ completedNow: true, reward: 80, streak: 5, lastCompletedDay: "2026-08-31" });
    expect(settleDailyChallenge("2026-08-31", first.lastCompletedDay, first.streak, 3)).toEqual({
      completedNow: false, reward: 0, streak: 5, lastCompletedDay: "2026-08-31",
    });
  });

  it("resets a missed streak and gives a smaller base reward below three stars", () => {
    expect(settleDailyChallenge("2026-08-31", "2026-08-20", 8, 2)).toEqual({
      completedNow: true, reward: 60, streak: 1, lastCompletedDay: "2026-08-31",
    });
  });

  it("does not grant another reward when the device calendar is rolled backward", () => {
    expect(settleDailyChallenge("2026-08-30", "2026-08-31", 5, 3)).toEqual({
      completedNow: false, reward: 0, streak: 5, lastCompletedDay: "2026-08-31",
    });
  });
});
