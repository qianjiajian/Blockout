import { describe, expect, it } from "vitest";
import {
  deriveMasterpieceUnlockProgress,
  type MasterpieceUnlockDefinition,
} from "../src/core/masterpieceUnlockProgress";

const catalog = Array.from({ length: 40 }, (_, index) => ({
  id: `masterpiece-${String(index + 1).padStart(2, "0")}`,
  unlockLevel: (index + 1) * 5,
}));
const through = (level: number): number[] => Array.from({ length: level }, (_, index) => index + 1);
const result = (before: number, after: number, settledLevelId?: number) => deriveMasterpieceUnlockProgress({
  beforeRewardedLevels: through(before), afterRewardedLevels: through(after), catalog, settledLevelId,
});

describe("masterpiece unlock progress presentation", () => {
  it("shows a first clear's real progress without changing the early game flow", () => {
    expect(result(0, 1, 1)).toEqual({
      targetId: "masterpiece-01", previous: 0, current: 1, total: 5, remaining: 4,
      justUnlocked: false, allUnlocked: false,
    });
  });

  it.each([5, 10, 15, 195])("holds the newly unlocked target full on the Lv%s result", (level) => {
    expect(result(level - 1, level, level)).toEqual({
      targetId: catalog[level / 5 - 1]!.id, previous: 4, current: 5, total: 5, remaining: 0,
      justUnlocked: true, allUnlocked: false,
    });
  });

  it("starts the next interval at zero on the following result", () => {
    expect(result(10, 11, 11)).toEqual({
      targetId: "masterpiece-03", previous: 0, current: 1, total: 5, remaining: 4,
      justUnlocked: false, allUnlocked: false,
    });
  });

  it.each([3, 10, 11])("a replay of Lv%s does not invent another step", (replayedLevel) => {
    expect(result(11, 11, replayedLevel)).toEqual({
      targetId: "masterpiece-03", previous: 1, current: 1, total: 5, remaining: 4,
      justUnlocked: false, allUnlocked: false,
    });
  });

  it("a replay on a threshold shows the next target without announcing the previous unlock", () => {
    expect(result(10, 10, 10)).toMatchObject({
      targetId: "masterpiece-03", previous: 0, current: 0, remaining: 5, justUnlocked: false,
    });
  });

  it("uses the highest actual completed level for gaps and selects the highest crossed threshold", () => {
    expect(deriveMasterpieceUnlockProgress({
      beforeRewardedLevels: [1, 3], afterRewardedLevels: [1, 3, 17], catalog, settledLevelId: 17,
    })).toEqual({
      targetId: "masterpiece-03", previous: 0, current: 5, total: 5, remaining: 0,
      justUnlocked: true, allUnlocked: false,
    });
    expect(deriveMasterpieceUnlockProgress({
      beforeRewardedLevels: [17], afterRewardedLevels: [17], catalog,
    })).toMatchObject({ targetId: "masterpiece-04", previous: 2, current: 2, remaining: 3, justUnlocked: false });
  });

  it("keeps the fortieth target full for its crossing, then reports the all-unlocked terminal state", () => {
    expect(result(199, 200, 200)).toEqual({
      targetId: "masterpiece-40", previous: 4, current: 5, total: 5, remaining: 0,
      justUnlocked: true, allUnlocked: true,
    });
    expect(result(200, 200, 190)).toEqual({
      previous: 0, current: 0, total: 0, remaining: 0, justUnlocked: false, allUnlocked: true,
    });
  });

  it("derives intervals from configurable thresholds without assuming five segments", () => {
    const custom = [{ id: "later", unlockLevel: 12 }, { id: "first", unlockLevel: 3 }, { id: "middle", unlockLevel: 8 }];
    expect(deriveMasterpieceUnlockProgress({
      beforeRewardedLevels: [8], afterRewardedLevels: [9], catalog: custom,
    })).toEqual({
      targetId: "later", previous: 0, current: 1, total: 4, remaining: 3,
      justUnlocked: false, allUnlocked: false,
    });
    expect(custom.map(({ id }) => id)).toEqual(["later", "first", "middle"]);
  });

  it("ignores malformed rewarded levels without coercing strings or counting duplicates", () => {
    expect(deriveMasterpieceUnlockProgress({
      beforeRewardedLevels: null,
      afterRewardedLevels: [2, 2, "99", -10, 0, 3.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1],
      catalog,
    })).toMatchObject({ targetId: "masterpiece-01", previous: 0, current: 2, remaining: 3, justUnlocked: false });
  });

  it("rejects stale or unrelated settled-level context as a new-unlock announcement", () => {
    for (const settledLevelId of [4, 9, 99, 2.5, NaN]) {
      expect(result(9, 10, settledLevelId)).toMatchObject({
        targetId: "masterpiece-03", previous: 0, current: 0, justUnlocked: false,
      });
    }
    expect(result(9, 10)).toMatchObject({ targetId: "masterpiece-02", justUnlocked: true });
  });

  it("handles an empty or invalid catalog without division by zero or a false target", () => {
    const invalid: MasterpieceUnlockDefinition[] = [
      { id: "", unlockLevel: 5 }, { id: "zero", unlockLevel: 0 },
      { id: "fraction", unlockLevel: 1.5 }, { id: "infinite", unlockLevel: Infinity },
    ];
    for (const entries of [[], invalid]) expect(deriveMasterpieceUnlockProgress({
      beforeRewardedLevels: [], afterRewardedLevels: [1], catalog: entries,
    })).toEqual({ previous: 0, current: 0, total: 0, remaining: 0, justUnlocked: false, allUnlocked: true });
  });

  it("is deterministic and accepts frozen inputs without changing campaign or catalog data", () => {
    const input = Object.freeze({
      beforeRewardedLevels: Object.freeze([9, 1]), afterRewardedLevels: Object.freeze([9, 1, 10]),
      catalog: Object.freeze(catalog.map((item) => Object.freeze({ ...item }))), settledLevelId: 10,
    });
    const original = JSON.stringify(input);
    expect(deriveMasterpieceUnlockProgress(input)).toEqual(deriveMasterpieceUnlockProgress(input));
    expect(JSON.stringify(input)).toBe(original);
  });
});
