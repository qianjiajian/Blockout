import { describe, expect, it } from "vitest";
import {
  DAILY_CHALLENGE_DIFFICULTY_BANDS,
  DAILY_CHALLENGE_DIFFICULTY_POLICY_VERSION,
  DAILY_CHALLENGE_DIFFICULTY_TOLERANCE,
  isDailyChallengeProofWithinBand,
} from "../src/core/dailyChallengeDifficultyPolicy";
import { createFormalDaily300Registry } from "../src/core/dailyChallengeFormal300";
import type { FormalDaily300Entry } from "../src/core/formalDailyChallenge300Data";

const boundaries: readonly [1 | 2 | 3, number, number, boolean][] = [
  [1, 13, 23, true], [1, 12, 23, false], [1, 13, 24, false],
  [1, 23, 23, true], [1, 24, 24, false], [1, 16, 20, true],
  [2, 18, 33, true], [2, 17, 33, false], [2, 18, 34, false],
  [2, 33, 33, true], [2, 34, 34, false], [2, 21, 30, true],
  [3, 28, 28, true], [3, 27, 35, false], [3, 31, 35, true],
  [3, 28, Number.MAX_SAFE_INTEGER, true],
  [1, 20, 19, false], [2, 30, 29, false], [3, 35, 34, false],
];
const invalidProofNumbers: unknown[] = [
  0, -1, 13.5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1,
  null, undefined, "31", true,
];

// Private metadata fixtures exercise the production registry gate. They are not
// level certificates and are never written to the formal data or player saves.
const fixture = (difficulty: 1 | 2 | 3, lower: number, upper: number): FormalDaily300Entry => {
  const layoutSha256 = "a".repeat(64);
  return {
    formalId: `daily-basic-combined-d${difficulty}-01`, stageKey: "basic-combined",
    difficulty, slot: 1, sourceLevelId: 1, layoutSha256, admittedInRevision: "b".repeat(64),
    dailyMechanisms: ["color-exit"],
    level: {
      id: 1, name: "Private difficulty metadata fixture", difficulty: "hard",
      timeSeconds: 120, reward: 0, parMoves: 1, width: 1, height: 1,
      blocks: [{ id: "body", x: 0, y: 0, shape: [[0, 0]], color: "red" }],
      gates: [{ id: "gate", side: "top", offset: 0, size: 1, color: "red" }],
    },
    proof: {
      levelSha256: layoutSha256, sourceLevelId: 1, lowerBound: lower, upperBound: upper,
      routeReplayComplete: true, reportSha256: "c".repeat(64), routeSha256: "d".repeat(64),
      toolchainSha256: "e".repeat(64),
    },
    acceptance: {
      levelSha256: layoutSha256, designReportSha256: "f".repeat(64), runtimeReportSha256: "1".repeat(64),
      dualScreenPointer: true, naturalTime: true, fullInventory: true, settlement: true,
    },
  };
};
const inspector = { sourceLevelExists: (id: number) => id === 1, mechanismsUsedByLevel: () => ["color-exit"] };
const registryFor = (entry: FormalDaily300Entry) => createFormalDaily300Registry("2".repeat(64), [entry], inspector);

describe("daily300 difficulty policy v1.198", () => {
  it("retains nominal targets separately from the inclusive acceptance tolerance", () => {
    expect(DAILY_CHALLENGE_DIFFICULTY_POLICY_VERSION).toBe("1.198.0");
    expect(DAILY_CHALLENGE_DIFFICULTY_TOLERANCE).toBe(3);
    expect(DAILY_CHALLENGE_DIFFICULTY_BANDS).toEqual({
      1: { nominalLower: 16, nominalUpper: 20, lower: 13, upper: 23 },
      2: { nominalLower: 21, nominalUpper: 30, lower: 18, upper: 33 },
      3: { nominalLower: 31, nominalUpper: null, lower: 28, upper: null },
    });
    expect(Object.isFrozen(DAILY_CHALLENGE_DIFFICULTY_BANDS)).toBe(true);
    for (const band of Object.values(DAILY_CHALLENGE_DIFFICULTY_BANDS)) expect(Object.isFrozen(band)).toBe(true);
  });

  it.each(boundaries)("D%s proof [%s, %s] has eligibility %s", (difficulty, lower, upper, eligible) => {
    expect(isDailyChallengeProofWithinBand(difficulty, lower, upper)).toBe(eligible);
  });

  it.each(invalidProofNumbers)("rejects nonpositive, nonfinite, noninteger or nonnumeric bound %s", (bad) => {
    expect(isDailyChallengeProofWithinBand(3, bad, 100)).toBe(false);
    expect(isDailyChallengeProofWithinBand(3, 31, bad)).toBe(false);
  });

  it.each([0, 4, -1, 1.5, NaN, Infinity, "1", "toString", null, undefined])("rejects invalid difficulty %s", (bad) => {
    expect(isDailyChallengeProofWithinBand(bad, 31, 31)).toBe(false);
  });
});

describe("formal registry consumes the current daily difficulty policy", () => {
  it.each(boundaries)("D%s interval [%s, %s] registry eligibility is %s", (difficulty, lower, upper, eligible) => {
    const entry = fixture(difficulty, lower, upper);
    if (!eligible) {
      expect(() => registryFor(entry)).toThrow("Invalid formal300 entry");
      return;
    }
    const registry = registryFor(entry);
    const assignment = registry.assignments("basic-combined", difficulty)[0];
    expect(registry.count).toBe(1);
    expect(assignment.minimumRepositionMoves).toBe(lower);
    expect(registry.resolve(assignment)?.proof).toEqual(entry.proof);
    expect(registry.resolve(assignment)?.difficulty).toBe(difficulty);
    expect(registry.assignments("basic-combined", difficulty === 1 ? 2 : 1)).toEqual([]);
  });

  it.each(invalidProofNumbers)("rejects invalid compiled proof number %s before assigning a daily level", (bad) => {
    expect(() => registryFor(fixture(3, bad as number, 100))).toThrow("Invalid formal300 entry");
    expect(() => registryFor(fixture(3, 31, bad as number))).toThrow("Invalid formal300 entry");
  });

  it("does not treat the wider interval as a waiver of complete proof and runtime acceptance", () => {
    const incomplete = fixture(1, 13, 23);
    (incomplete.proof as { routeReplayComplete: boolean }).routeReplayComplete = false;
    expect(() => registryFor(incomplete)).toThrow("Invalid formal300 entry");
    const unchecked = fixture(3, 28, 40);
    (unchecked.acceptance as { fullInventory: boolean }).fullInventory = false;
    expect(() => registryFor(unchecked)).toThrow("Invalid formal300 entry");
  });
});
