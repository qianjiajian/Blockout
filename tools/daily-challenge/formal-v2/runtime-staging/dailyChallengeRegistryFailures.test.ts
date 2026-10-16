import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ mode: "valid" }));
vi.mock("../src/core/formalDailyChallengeData", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/core/formalDailyChallengeData")>();
  return {
    ...actual,
    getFormalDailyChallengeAssignments(stageKey: string, difficulty: 1 | 2 | 3) {
      const entries = actual.getFormalDailyChallengeAssignments(stageKey, difficulty);
      if (!entries || state.mode === "valid") return entries;
      if (state.mode === "missing") return undefined;
      if (state.mode === "partial") return entries.slice(0, 9);
      return entries.map((entry, index) => index ? entry : {
        ...entry,
        ...(state.mode === "revision" ? { catalogRevision: "old-revision" } : {}),
        ...(state.mode === "hash" ? { layoutSha256: "0".repeat(64) } : {}),
        ...(state.mode === "source" ? { sourceLevelId: 999999 } : {}),
        ...(state.mode === "proof" ? { proofStatus: "pending" } : {}),
        ...(state.mode === "ordering" ? { slot: 10, variant: 9 } : {}),
      });
    },
  };
});
import { createDailyChallengeState, getDailyChallengeAssignment } from "../src/core/dailyChallenge";

describe("production catalogue rejection", () => {
  afterEach(() => { state.mode = "valid"; });
  for (const mode of ["missing", "partial", "revision", "hash", "source", "proof", "ordering"]) {
    it(`rejects ${mode} without constructing a campaign-source fallback`, () => {
      state.mode = mode;
      const daily = createDailyChallengeState("2026-10-07", 1, undefined, 42);
      expect(daily.pools).toEqual({ 1: [], 2: [], 3: [] });
      expect(getDailyChallengeAssignment(daily, 1)).toBeUndefined();
      expect(getDailyChallengeAssignment(daily, 2)).toBeUndefined();
      expect(getDailyChallengeAssignment(daily, 3)).toBeUndefined();
      expect(daily.attemptsRemaining).toBe(5);
    });
  }
});
