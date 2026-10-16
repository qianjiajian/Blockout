import { describe, expect, it } from "vitest";
import {
  MAINLINE_HOUR_MS,
  MAINLINE_OPPONENT_DAILY_CLEARS,
  MAINLINE_OPPONENT_DAILY_REPAIRS,
  mainlineOpponentClearStars,
  mainlineOpponentDailyQuota,
  mainlineOpponentHourSlots,
  mainlineOpponentInitialProgress,
  mainlineOpponentProgressAt,
} from "../src/core/mainlineOpponents";
import type { OpponentType } from "../src/core/opponentPacing";

const TYPES: readonly OpponentType[] = ["casual", "steady", "active", "expert"];
const HOUR = MAINLINE_HOUR_MS;
const DAY = 24 * HOUR;
const epoch = Date.UTC(2026, 9, 5) - 8 * HOUR;

// Deliberately advances one scheduled hour at a time, independent of the
// production implementation's band/day skipping and prefix-star arithmetic.
function hourlyOracle(id: string, type: OpponentType, created: number, until: number) {
  const result = mainlineOpponentInitialProgress(id, type);
  let day = -1;
  let slots: readonly number[] = [];
  let clearing = true;
  for (let time = Math.floor((created + 8 * HOUR) / HOUR) * HOUR - 8 * HOUR + HOUR; time <= until; time += HOUR) {
    const nextDay = Math.floor((time + 8 * HOUR) / DAY);
    if (nextDay !== day) {
      day = nextDay;
      slots = mainlineOpponentHourSlots(id, mainlineOpponentDailyQuota(type, result.cleared));
      clearing = result.cleared < 200;
    }
    const hour = Math.floor((time + 8 * HOUR) / HOUR) % 24;
    if (!slots.includes(hour)) continue;
    if (clearing && result.cleared < 200) {
      result.cleared += 1;
      result.stars += mainlineOpponentClearStars(id, type, result.cleared);
    } else if (!clearing) result.stars = Math.min(600, result.stars + 1);
  }
  return result;
}

describe("mainline independent daily opponents", () => {
  it("uses distinct mainline daily quotas and bounded hourly distributions", () => {
    expect(MAINLINE_OPPONENT_DAILY_CLEARS).toEqual({ casual: [2, 1, 1, 1], steady: [4, 3, 2, 1], active: [8, 5, 3, 2], expert: [12, 8, 5, 3] });
    expect(MAINLINE_OPPONENT_DAILY_REPAIRS).toEqual({ casual: 1, steady: 2, active: 3, expert: 4 });
    for (let quota = 1; quota <= 12; quota += 1) {
      const slots = mainlineOpponentHourSlots("opponent-1", quota);
      expect(new Set(slots).size).toBe(quota);
      expect(slots.every((hour) => Number.isInteger(hour) && hour >= 1 && hour <= 23)).toBe(true);
    }
    expect(mainlineOpponentHourSlots("opponent-1", 8)).not.toEqual(mainlineOpponentHourSlots("opponent-2", 8));
  });

  it.each(TYPES)("matches hourly progression across daily bands and star repair for %s", (type) => {
    for (const offset of [0, 9.25 * HOUR]) {
      const id = `test-${type}`;
      const created = epoch + offset;
      for (const days of [0, 1, 2, 6, 19, 39, 65, 120, 220, 650]) {
        const until = epoch + days * DAY + 17.5 * HOUR;
        expect(mainlineOpponentProgressAt(id, type, created, until)).toEqual(hourlyOracle(id, type, created, until));
      }
    }
  });

  it("starts with plausible low progress and each clear gives one to three stars", () => {
    for (const type of TYPES) for (let index = 0; index < 25; index += 1) {
      const id = `${type}-${index}`;
      const start = mainlineOpponentInitialProgress(id, type);
      expect(start.stars).toBeLessThanOrEqual(48);
      expect(start.stars).toBeGreaterThanOrEqual(start.cleared);
      expect(start.stars).toBeLessThanOrEqual(start.cleared * 3);
      for (let level = 1; level <= 200; level += 1) {
        expect([1, 2, 3]).toContain(mainlineOpponentClearStars(id, type, level));
      }
      const early = Array.from({ length: 20 }, (_, i) => mainlineOpponentClearStars(id, type, i + 1));
      const late = Array.from({ length: 20 }, (_, i) => mainlineOpponentClearStars(id, type, i + 121));
      expect(early.filter((stars) => stars === 3).length).toBeGreaterThan(late.filter((stars) => stars === 3).length);
    }
  });

  it("changes only at assigned hours, never at midnight or before joining", () => {
    const id = "time-boundary";
    const created = epoch + 9.5 * HOUR;
    const first = mainlineOpponentInitialProgress(id, "expert");
    expect(mainlineOpponentProgressAt(id, "expert", created, created - DAY)).toEqual(first);
    expect(mainlineOpponentProgressAt(id, "expert", created, created)).toEqual(first);
    expect(mainlineOpponentProgressAt(id, "expert", created, epoch + DAY - 1))
      .toEqual(mainlineOpponentProgressAt(id, "expert", created, epoch + DAY));
    expect(mainlineOpponentProgressAt(id, "expert", created, epoch + 14 * HOUR + 1))
      .toEqual(mainlineOpponentProgressAt(id, "expert", created, epoch + 15 * HOUR - 1));
  });
});
