import { describe, expect, it } from "vitest";
// @ts-expect-error Node ambient types are intentionally excluded from the app tsconfig.
import { createHash } from "node:crypto";
import {
  DAILY_CHALLENGE_MAX_ATTEMPTS,
  DAILY_CHALLENGE_POOL_SIZE,
  DAILY_CHALLENGE_REWARDS,
  cloneDailyChallengeLevel,
  completeDailyChallenge,
  consumeDailyChallengeAttempt,
  createDailyChallengeState,
  dailyChallengeDayKey,
  dailyChallengeDifficultyMeetsMoveRule,
  dailyChallengeStage,
  getDailyChallengeAssignment,
  getDailyChallengePool,
  mechanismsUsedByDailyLevel,
  millisecondsUntilNextDailyChallengeDay,
  reconcileDailyChallengeState,
} from "../src/core/dailyChallenge";
import { LEVELS } from "../src/core/levels";
import { FORMAL_DAILY_CHALLENGE_CATALOG, FORMAL_DAILY_CHALLENGE_REVISION, getFormalDailyChallengeAssignments, getFormalDailyChallengeCandidate, getFormalDailyChallengeLevel } from "../src/core/formalDailyChallengeData";
import { buildD3SeamChamberLevel, dailyChallengeLayoutHash } from "../src/core/dailyChallengeVariant";
import { validateLevel } from "../src/core/PuzzleModel";
import type { LevelSpec } from "../src/core/types";

const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === "object" ? Object.fromEntries(Object.entries(value)
    .filter(([, entry]) => entry !== undefined).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([key, entry]) => [key, canonical(entry)])) : value;
const fullHash = (value: unknown): string => createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");

const sourceLevels = (): LevelSpec[] => Array.from({ length: 24 }, (_, index) => {
  const id = index + 1;
  const difficulty = id <= 12 ? "hard" : "super";
  return {
    id,
    name: `Source ${id}`,
    difficulty,
    timeSeconds: 120,
    reward: 20,
    parMoves: difficulty === "super" ? 40 : 24,
    width: 2,
    height: 2,
    gates: [{ id: `gate-${id}`, side: "right", offset: 0, size: 1, color: "red" }],
    blocks: [{ id: `block-${id}`, x: 0, y: 0, shape: [[0, 0]], color: "red" }],
    shutters: [{ id: `shutter-${id}`, x: 0, y: 1, width: 1, height: 1, count: 1 }],
  };
});

describe("daily challenge core", () => {
  it("exposes only the proof-bound independent catalogue", () => {
    const state = createDailyChallengeState("2026-10-05", 20, LEVELS, 1234);
    expect(state.stageKey).toBe("mechanisms-shutter-20");
    for (const difficulty of [1, 2, 3] as const) {
      const expected = getFormalDailyChallengeAssignments(state.stageKey, difficulty)!;
      expect(getDailyChallengePool(state, difficulty)).toHaveLength(10);
      expect(expected.every((entry) => entry.proofStatus === "same-object-verified-v2")).toBe(true);
      expect(getDailyChallengePool(state, difficulty)).toEqual(expected);
      expect(getDailyChallengePool(state, difficulty).every((entry) => entry.layoutFactory === "explicit-certified-v2")).toBe(true);
    }
  });

  it("loads the emitted complete object for every production slot without changing its SHA", () => {
    const state = createDailyChallengeState("2026-10-05", 200, LEVELS, 1234);
    const hashes = new Set<string>();
    for (const difficulty of [1, 2, 3] as const) {
      for (const assignment of getDailyChallengePool(state, difficulty)) {
        const level = cloneDailyChallengeLevel(assignment)!;
        expect(level).toEqual(getFormalDailyChallengeLevel(assignment.id));
        expect(fullHash(level)).toBe(assignment.layoutSha256);
        hashes.add(fullHash(level));
      }
    }
    expect(hashes.size).toBe(30);
  });

  it("rejects a stale or mismatched formal binding and returns isolated exact clones", () => {
    const state = createDailyChallengeState("2026-10-06", 200, LEVELS, 1234);
    const assignment = getDailyChallengeAssignment(state, 3)!;
    expect(assignment.layoutFactory).toBe("explicit-certified-v2");
    expect(assignment.proofStatus).toBe("same-object-verified-v2");
    const level = cloneDailyChallengeLevel(assignment, LEVELS)!;
    validateLevel(level);
    const source = LEVELS.find(({ id }) => id === assignment.sourceLevelId)!;
    expect(level.dailyProof).toBeUndefined();
    expect([[source.width, source.height], [source.height, source.width]]).toContainEqual([level.width, level.height]);
    expect(level.width).toBeGreaterThan(2);
    expect(level.height).toBeGreaterThan(2);
    expect(level.id).toBe(assignment.sourceLevelId);
    expect(fullHash(level)).toBe(assignment.layoutSha256);
    for (const changed of [
      { id: `${assignment.id}-missing` }, { sourceLevelId: 999999 },
      { layoutSha256: "0".repeat(64) }, { catalogRevision: "old-catalog" },
      { proofStatus: "pending" as const }, { minimumRepositionMoves: 999 },
    ]) expect(cloneDailyChallengeLevel({ ...assignment, ...changed })).toBeUndefined();
    level.blocks[0].x += 1;
    expect(fullHash(cloneDailyChallengeLevel(assignment))).toBe(assignment.layoutSha256);
  });

  it("binds every formal slot to a layout different from its mainline source", () => {
    let checked = 0;
    for (const stage of FORMAL_DAILY_CHALLENGE_CATALOG) {
      for (const difficulty of [1, 2, 3] as const) {
        for (const candidate of stage.difficulties[difficulty].candidates) {
          const source = LEVELS.find((level) => level.id === candidate.sourceLevelId)!;
          const derived = getFormalDailyChallengeLevel(candidate.formalId)!;
          expect(candidate.layoutDiffersFromSource).toBe(true);
          expect(candidate.sourceLayoutSha256).toMatch(/^[0-9a-f]{64}$/);
          expect(candidate.layoutSha256).toMatch(/^[0-9a-f]{64}$/);
          expect(candidate.sourceGeometrySha256).toMatch(/^[0-9a-f]{64}$/);
          expect(candidate.geometrySha256).toMatch(/^[0-9a-f]{64}$/);
          expect(fullHash(derived)).toBe(candidate.layoutSha256);
          expect(fullHash(derived)).not.toBe(fullHash(source));
          expect(candidate.geometryDiffersFromSource).toBe(true);
          expect(candidate.proofLowerBound).toBeGreaterThanOrEqual(difficulty === 1 ? 16 : difficulty === 2 ? 21 : 31);
          expect(candidate.proofUpperBound).toBeGreaterThanOrEqual(candidate.proofLowerBound);
          if (difficulty !== 3) expect(candidate.proofUpperBound).toBeLessThanOrEqual(difficulty === 1 ? 20 : 30);
          checked += 1;
        }
      }
    }
    expect(checked).toBe(15 * 3 * 10);
  });

  it("creates ten source-level variants per difficulty and requires the unlocked stage mechanism", () => {
    const levels = sourceLevels();
    const state = createDailyChallengeState("2026-10-04", 20, levels, 1234);
    expect(state.stageKey).toBe("mechanisms-shutter-20");
    expect(state.unlockedMechanisms).toContain("shutter");
    for (const difficulty of [1, 2, 3] as const) {
      const pool = getDailyChallengePool(state, difficulty);
      expect(pool).toHaveLength(DAILY_CHALLENGE_POOL_SIZE);
      expect(pool.every((entry) => entry.sourceLevelId >= 1 && entry.sourceLevelId <= 24)).toBe(true);
      expect(pool.every((entry) => entry.proofStatus === "pending" && entry.minimumRepositionMoves === 0)).toBe(true);
      expect(pool.every((entry) => !dailyChallengeDifficultyMeetsMoveRule(entry, difficulty))).toBe(true);
      expect(pool.every((entry) => entry.sourceDifficulty === (difficulty === 1 ? "hard" : "super"))).toBe(true);
    }
    expect(getDailyChallengeAssignment(state, 1)).toBeDefined();
  });

  it("locks stage and selected assignments for the day, then advances next day", () => {
    const levels = sourceLevels();
    const original = createDailyChallengeState("2026-10-04", 20, levels, 7);
    const sameDay = reconcileDailyChallengeState(original, new Date("2026-10-04T18:00:00+08:00"), 200, levels);
    expect(sameDay.stageKey).toBe(original.stageKey);
    expect(sameDay.selected).toEqual(original.selected);
    expect(sameDay.pools).toEqual(original.pools);
    const nextDay = reconcileDailyChallengeState(original, new Date("2026-10-05T08:00:00+08:00"), 200, levels);
    expect(nextDay.dayKey).toBe("2026-10-05");
    expect(nextDay.stageKey).toBe("mechanisms-colored-grid-200");
    expect(nextDay.attemptsRemaining).toBe(DAILY_CHALLENGE_MAX_ATTEMPTS);
  });

  it("gives five starts per day and never restores attempts after elapsed hours", () => {
    const levels = sourceLevels();
    let state = createDailyChallengeState("2026-10-04", 20, levels, 9);
    const startedAt = Date.parse("2026-10-04T00:00:00+08:00");
    expect(state.version).toBe(2);
    expect(state.attemptsRemaining).toBe(5);
    expect(DAILY_CHALLENGE_MAX_ATTEMPTS).toBe(5);
    for (let used = 1; used <= 5; used += 1) {
      const consumed = consumeDailyChallengeAttempt(state, startedAt + used * 1_000);
      expect(consumed.accepted).toBe(true);
      expect(consumed.attemptsRemaining).toBe(5 - used);
      state = consumed.state;
    }
    for (const hour of [1, 2, 4, 23]) {
      const later = reconcileDailyChallengeState(state, new Date(startedAt + hour * 3_600_000), 20, levels);
      expect(later.attemptsRemaining).toBe(0);
      expect(consumeDailyChallengeAttempt(later, startedAt + hour * 3_600_000)).toEqual({
        state: later, accepted: false, attemptsRemaining: 0,
      });
    }
    expect(reconcileDailyChallengeState(JSON.parse(JSON.stringify(state)), new Date(startedAt + 60_000), 20, levels).attemptsRemaining).toBe(0);
  });

  it.each([
    ["2026-10-04T15:59:59.999Z", "2026-10-04", 1],
    ["2026-10-04T16:00:00.000Z", "2026-10-05", 86_400_000],
    ["2026-10-05T00:00:00+08:00", "2026-10-05", 86_400_000],
    ["2026-10-04T09:00:00-07:00", "2026-10-05", 86_400_000],
    ["2026-10-04T12:00:00-04:00", "2026-10-05", 86_400_000],
    ["2026-12-31T15:59:59Z", "2026-12-31", 1_000],
    ["2026-12-31T16:00:00Z", "2027-01-01", 86_400_000],
  ])("uses Beijing midnight for %s regardless of its represented time zone", (timestamp, dayKey, remainingMs) => {
    const date = new Date(timestamp);
    expect(dailyChallengeDayKey(date)).toBe(dayKey);
    expect(millisecondsUntilNextDailyChallengeDay(date)).toBe(remainingMs);
  });

  it("resets attempts, rewards and stage together at Beijing midnight without carrying leftovers", () => {
    const levels = sourceLevels();
    const original = completeDailyChallenge(createDailyChallengeState("2026-10-04", 20, levels, 71), 1).state;
    const consumed = consumeDailyChallengeAttempt(original, Date.parse("2026-10-04T23:50:00+08:00")).state;
    const beforeMidnight = reconcileDailyChallengeState(consumed, new Date("2026-10-04T15:59:59.999Z"), 200, levels);
    expect(beforeMidnight.attemptsRemaining).toBe(4);
    expect(beforeMidnight.completed[1]).toBe(true);
    expect(beforeMidnight.stageKey).toBe(original.stageKey);
    const atMidnight = reconcileDailyChallengeState(beforeMidnight, new Date("2026-10-04T16:00:00Z"), 200, levels);
    expect(atMidnight.dayKey).toBe("2026-10-05");
    expect(atMidnight.maxObservedDayKey).toBe("2026-10-05");
    expect(atMidnight.attemptsRemaining).toBe(5);
    expect(atMidnight.stageKey).toBe("mechanisms-colored-grid-200");
    expect(atMidnight.completed).toEqual({ 1: false, 2: false, 3: false });
    expect(atMidnight.rewarded).toEqual({ 1: false, 2: false, 3: false });
    expect(atMidnight.playerSeed).toBe(original.playerSeed);
    const afterOffline = reconcileDailyChallengeState(consumed, new Date("2026-10-12T06:00:00+08:00"), 200, levels);
    expect(afterOffline.attemptsRemaining).toBe(5);
    expect(afterOffline.dayKey).toBe("2026-10-12");
    expect(afterOffline.playerSeed).toBe(original.playerSeed);
  });

  it("does not give another daily quota or reward after rolling the local clock back", () => {
    const levels = sourceLevels();
    const first = createDailyChallengeState("2026-10-04", 20, levels, 71);
    const tomorrow = reconcileDailyChallengeState(first, new Date("2026-10-05T00:00:00+08:00"), 20, levels);
    const used = completeDailyChallenge(consumeDailyChallengeAttempt(tomorrow).state, 2).state;
    const rollback = reconcileDailyChallengeState(used, new Date("2026-10-04T08:00:00+08:00"), 20, levels);
    expect(rollback).toEqual(used);
    const restored = reconcileDailyChallengeState(rollback, new Date("2026-10-05T08:00:00+08:00"), 20, levels);
    expect(restored.attemptsRemaining).toBe(4);
    expect(completeDailyChallenge(restored, 2).firstCompletion).toBe(false);
    const inconsistentOlderDay = { ...used, dayKey: "2026-10-04" };
    expect(reconcileDailyChallengeState(inconsistentOlderDay, new Date("2026-10-05T08:00:00+08:00"), 20, levels).attemptsRemaining).toBe(4);
  });

  it.each([0, 1, 2, 3])("migrates a legacy balance of %i once while retaining the day's progress", (attemptsRemaining) => {
    const levels = sourceLevels();
    const original = completeDailyChallenge(createDailyChallengeState("2026-10-04", 20, levels, 91), 2).state;
    const legacy = { ...original, version: 1, attemptsRemaining, lastAttemptAtMs: Date.parse("2026-10-04T00:00:00+08:00") };
    const migrated = reconcileDailyChallengeState(legacy, new Date("2026-10-04T22:00:00+08:00"), 200, levels);
    expect(migrated.version).toBe(2);
    expect(migrated.attemptsRemaining).toBe(attemptsRemaining + 2);
    expect(migrated.pools).toEqual(original.pools);
    expect(migrated.selected).toEqual(original.selected);
    expect(migrated.completed).toEqual(original.completed);
    expect(migrated.rewarded).toEqual(original.rewarded);
    expect(migrated.playerSeed).toBe(original.playerSeed);
    const reread = reconcileDailyChallengeState(JSON.parse(JSON.stringify(migrated)), new Date("2026-10-04T23:00:00+08:00"), 200, levels);
    expect(reread.attemptsRemaining).toBe(attemptsRemaining + 2);
  });

  it("handles missing legacy version, bounds old balances, and resets old offline saves directly to five", () => {
    const levels = sourceLevels();
    const original = createDailyChallengeState("2026-10-04", 20, levels, 92);
    const legacy = { ...original, version: undefined, attemptsRemaining: 0 };
    const date = new Date("2026-10-04T12:00:00+08:00");
    expect(reconcileDailyChallengeState(legacy, date, 20, levels).attemptsRemaining).toBe(2);
    expect(reconcileDailyChallengeState({ ...legacy, attemptsRemaining: -9 }, date, 20, levels).attemptsRemaining).toBe(2);
    expect(reconcileDailyChallengeState({ ...legacy, attemptsRemaining: 90 }, date, 20, levels).attemptsRemaining).toBe(5);
    const nextDay = reconcileDailyChallengeState(legacy, new Date("2026-10-05T00:00:00+08:00"), 20, levels);
    expect(nextDay.attemptsRemaining).toBe(5);
    expect(nextDay.version).toBe(2);
  });

  it("keeps production catalogue migration on the saved stage and freezes version two assignments", () => {
    const original = createDailyChallengeState("2026-10-04", 20, LEVELS, 13);
    const legacy = { ...original, version: 1, attemptsRemaining: 1 };
    const date = new Date("2026-10-04T12:00:00+08:00");
    const migrated = reconcileDailyChallengeState(legacy, date, 200, LEVELS);
    expect(migrated.stageKey).toBe(original.stageKey);
    expect(migrated.pools).toEqual(original.pools);
    expect(migrated.selected).toEqual(original.selected);
    const sameDay = reconcileDailyChallengeState(migrated, date, 200, LEVELS);
    expect(sameDay.pools).toEqual(original.pools);
    expect(sameDay.attemptsRemaining).toBe(3);
    const missingPool = { ...sameDay, pools: { ...sameDay.pools, 1: [] } };
    expect(reconcileDailyChallengeState(missingPool, date, 200, LEVELS).pools).toEqual(original.pools);
  });

  it("corrects old catalogue content once while preserving the fixed daily draw and balances", () => {
    const original = createDailyChallengeState("2026-10-07", 20, LEVELS, 13);
    for (const attemptsRemaining of [0, 2, 5]) {
      const legacy = structuredClone(original);
      legacy.catalogRevision = "pre-correction-catalogue";
      legacy.attemptsRemaining = attemptsRemaining;
      legacy.completed[1] = true;
      legacy.rewarded[1] = true;
      for (const difficulty of [1, 2, 3] as const) {
        const entry = legacy.pools[difficulty][legacy.selected[difficulty]];
        Object.assign(entry, { sourceLevelId: 999999, layoutSha256: "0".repeat(64),
          catalogRevision: legacy.catalogRevision, proofStatus: "threshold-proven" });
      }
      const corrected = reconcileDailyChallengeState(legacy, new Date("2026-10-07T18:00:00+08:00"), 200, LEVELS);
      expect(corrected.catalogRevision).toBe(FORMAL_DAILY_CHALLENGE_REVISION);
      for (const field of ["selected", "stageKey", "stageUnlockLevel", "playerSeed", "dayKey", "maxObservedDayKey", "lastAttemptAtMs", "completed", "rewarded", "attemptsRemaining"] as const) {
        expect(corrected[field]).toEqual(legacy[field]);
      }
      for (const difficulty of [1, 2, 3] as const) {
        const entry = getDailyChallengeAssignment(corrected, difficulty)!;
        expect(entry.id).toBe(getDailyChallengeAssignment(original, difficulty)!.id);
        expect(entry.layoutSha256).toBe(getFormalDailyChallengeCandidate(entry.id)!.layoutSha256);
        expect(fullHash(cloneDailyChallengeLevel(entry))).toBe(entry.layoutSha256);
      }
      expect(reconcileDailyChallengeState(corrected, new Date("2026-10-07T19:00:00+08:00"), 200, LEVELS)).toEqual(corrected);
    }
  });

  it("consumption never reconstructs a selected run even if the timestamp has crossed midnight", () => {
    const original = createDailyChallengeState("2026-10-04", 20, sourceLevels(), 72);
    const consumed = consumeDailyChallengeAttempt(original, Date.parse("2026-10-05T00:00:00+08:00"));
    expect(consumed.state.dayKey).toBe(original.dayKey);
    expect(consumed.state.pools).toBe(original.pools);
    expect(consumed.state.selected).toBe(original.selected);
    expect(consumed.attemptsRemaining).toBe(4);
  });

  it("pays each difficulty reward only on its first completion", () => {
    const state = createDailyChallengeState("2026-10-04", 20, sourceLevels(), 2);
    const first = completeDailyChallenge(state, 2);
    expect(first.firstCompletion).toBe(true);
    expect(first.reward).toEqual(DAILY_CHALLENGE_REWARDS[2]);
    const repeat = completeDailyChallenge(first.state, 2);
    expect(repeat.firstCompletion).toBe(false);
    expect(repeat.reward).toEqual({ coins: 0, inspiration: 0 });
  });

  it("does not mutate the campaign source when exposing a daily clone", () => {
    const levels = sourceLevels();
    const state = createDailyChallengeState("2026-10-04", 20, levels, 5);
    const assignment = getDailyChallengeAssignment(state, 3)!;
    const clone = cloneDailyChallengeLevel(assignment, levels)!;
    expect(clone.id).toBe(assignment.sourceLevelId);
    expect(clone.reward).toBe(0);
    expect(clone.parMoves).toBe(levels.find(({ id }) => id === assignment.sourceLevelId)?.parMoves);
    expect(clone.preservedMoveTarget).toBeUndefined();
    expect(levels.find(({ id }) => id === assignment.sourceLevelId)?.reward).toBe(20);
  });

  it("reports mechanism usage from a source level", () => {
    const level = sourceLevels()[0];
    expect(mechanismsUsedByDailyLevel(level)).toEqual(expect.arrayContaining(["color-exit", "shutter"]));
  });

  it("builds the independently-proved D3 seam backbone without mutating its source", () => {
    const source = LEVELS.find((level) => level.id === 97)!;
    const first = buildD3SeamChamberLevel(source, "daily-fixture-d3-01");
    const second = buildD3SeamChamberLevel(source, "daily-fixture-d3-02");
    validateLevel(first);
    validateLevel(second);
    expect(first.dailyProof).toMatchObject({ kind: "seam-chambers-v1", componentCount: 31, componentFloor: 1 });
    expect(first.blocks).toHaveLength(62);
    expect(first.gates).toHaveLength(62);
    expect(dailyChallengeLayoutHash(first)).not.toBe(dailyChallengeLayoutHash(second));
    expect(source.width).not.toBe(first.width);
    expect(source.reward).not.toBe(0);
  });
});



