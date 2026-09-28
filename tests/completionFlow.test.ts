import { describe, expect, it } from "vitest";
import {
  directLevelTransitionTiming,
  displayedCoinBalance,
  homeCoinFlightDuration,
  homeCoinFlightTiming,
  homeCoinLandedCount,
  homeCoinLocalProgress,
  sampleDirectLevelTransition,
  shouldDirectAdvanceAfterClear,
} from "../src/game/completionFlow";

describe("completion flow", () => {
  it("auto-advances exactly the first four completed levels", () => {
    expect([1, 2, 3, 4, 5, 100].map((level) => shouldDirectAdvanceAfterClear(level, 100)))
      .toEqual([true, true, true, true, false, false]);
    expect(shouldDirectAdvanceAfterClear(4, 4)).toBe(false);
  });

  it("matches the reference board-only slide timing", () => {
    const timing = directLevelTransitionTiming(false);
    expect(timing).toEqual({
      exitDuration: 0.13,
      modelSwitchAt: 0.31,
      enterAt: 0.45,
      duration: 0.6,
      travelScreens: 1.1,
    });
    expect(sampleDirectLevelTransition(0.065, false)).toMatchObject({ phase: "exit", switchReady: false });
    expect(sampleDirectLevelTransition(0.2, false)).toEqual({
      phase: "gap",
      boardOffsetScreens: -1.1,
      switchReady: false,
      finished: false,
    });
    expect(sampleDirectLevelTransition(0.31, false)).toEqual({
      phase: "gap",
      boardOffsetScreens: 1.1,
      switchReady: true,
      finished: false,
    });
    expect(sampleDirectLevelTransition(0.45, false)).toMatchObject({
      phase: "enter",
      boardOffsetScreens: 1.1,
      switchReady: true,
      finished: false,
    });
    expect(sampleDirectLevelTransition(0.6, false)).toEqual({
      phase: "done",
      boardOffsetScreens: 0,
      switchReady: true,
      finished: true,
    });
  });

  it("stages five reference-paced coins and increments only on arrival", () => {
    expect(homeCoinFlightTiming(false)).toEqual({
      delay: 0.13,
      stagger: 0.08,
      coinDuration: 0.93,
      settleDuration: 0.34,
      coinCount: 5,
    });
    expect(homeCoinFlightDuration(false)).toBeCloseTo(1.72, 8);
    expect(homeCoinLocalProgress(0.12, 0, false)).toBe(0);
    expect(homeCoinLocalProgress(0.6, 4, false)).toBeCloseTo(0.1612903, 6);
    expect(homeCoinLandedCount(1.059, false)).toBe(0);
    expect(homeCoinLandedCount(1.06, false)).toBe(1);
    expect(homeCoinLandedCount(1.381, false)).toBe(5);
    expect([0, 1, 2, 3, 4, 5].map((landed) => displayedCoinBalance(1040, 1060, landed, 5)))
      .toEqual([1040, 1044, 1048, 1052, 1056, 1060]);
  });

  it("retains a short one-coin reduced-motion acknowledgement", () => {
    expect(homeCoinFlightTiming(true).coinCount).toBe(1);
    expect(homeCoinFlightDuration(true)).toBeCloseTo(0.34, 8);
    expect(homeCoinLandedCount(0.219, true)).toBe(0);
    expect(homeCoinLandedCount(0.22, true)).toBe(1);
  });
});
