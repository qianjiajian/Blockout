import { describe, expect, it } from "vitest";
// @ts-expect-error Node ambient types are intentionally excluded from the app tsconfig.
import { runInNewContext } from "node:vm";
import {
  cloneDailyChallengeLevel,
  createDailyChallengeState,
  dailyChallengeRunMatches,
  getDailyChallengeAssignment,
  getDailyChallengeRunOwner,
  reconcileDailyChallengeState,
  sanitizeDailyChallengeRunOwner,
  type DailyChallengeAssignment,
  type DailyChallengeDifficulty,
  type DailyChallengeState,
} from "../src/core/dailyChallenge";

const DAY = "2026-10-15";
const NOW = new Date(`${DAY}T18:07:00+08:00`);
const DIFFICULTIES = [1, 2, 3] as const;

function savedDay(): DailyChallengeState {
  const day = createDailyChallengeState(DAY, 16, undefined, 73519);
  // Exercise already spent attempts and an earned reward, not only a fresh day.
  day.attemptsRemaining = 2;
  day.lastAttemptAtMs = Date.parse(`${DAY}T17:45:00+08:00`);
  day.completed[2] = day.rewarded[2] = true;
  return day;
}

function foreignRealm<T>(value: T): T {
  return runInNewContext("JSON.parse(payload)", { payload: JSON.stringify(value) }) as T;
}

/** Model a native storage bridge exposing serialized fields through accessors. */
function accessorRecord<T>(value: T) {
  const reads = new Map<string, number>();
  const copy = (input: unknown, path: string): unknown => {
    if (input === null || typeof input !== "object") return input;
    const output = Array.isArray(input) ? new Array(input.length) : {};
    for (const key of Object.keys(input)) {
      const name = `${path}.${key}`;
      const field = copy((input as Record<string, unknown>)[key], name);
      Object.defineProperty(output, key, {
        enumerable: true, configurable: true,
        get() { reads.set(name, (reads.get(name) ?? 0) + 1); return field; },
      });
    }
    return output;
  };
  return { value: copy(value, "root") as T, reads };
}

function expectSameSelections(actual: DailyChallengeState, expected: DailyChallengeState) {
  expect(actual).toEqual(expected);
  for (const difficulty of DIFFICULTIES) {
    const original = getDailyChallengeAssignment(expected, difficulty)!;
    const restored = getDailyChallengeAssignment(actual, difficulty)!;
    expect(original).toBeDefined();
    expect(restored).toMatchObject({ id: original.id, layoutSha256: original.layoutSha256 });
    expect(cloneDailyChallengeLevel(restored)).toEqual(cloneDailyChallengeLevel(original));
    expect(getDailyChallengeRunOwner(actual, difficulty)).toEqual(getDailyChallengeRunOwner(expected, difficulty));
  }
}

function expectReadOnce(reads: Map<string, number>) {
  expect(reads.size).toBeGreaterThan(0);
  expect([...reads].filter(([, count]) => count !== 1)).toEqual([]);
}

describe("daily challenge native storage compatibility", () => {
  it("restores all three exact foreign-realm pools without resetting spent attempts or rewards", () => {
    const expected = savedDay();
    const raw = foreignRealm(expected);
    expect(Object.getPrototypeOf(raw)).not.toBe(Object.prototype);
    expect(Object.getPrototypeOf(raw.pools[1][0])).not.toBe(Object.prototype);
    const restored = reconcileDailyChallengeState(raw, NOW, 200);
    expectSameSelections(restored, expected);
    expect(restored.pools[1][0]).not.toBe(raw.pools[1][0]);
    restored.pools[1][0].sourceLevelId = 999999;
    expect(raw.pools[1][0].sourceLevelId).toBe(expected.pools[1][0].sourceLevelId);
  });

  it("snapshots accessor-backed pools once before certifying their exact saved objects", () => {
    const expected = savedDay();
    const wrapped = DIFFICULTIES.map((d) => accessorRecord(expected.pools[d]));
    const raw = { ...expected, pools: { 1: wrapped[0].value, 2: wrapped[1].value, 3: wrapped[2].value } };
    const restored = reconcileDailyChallengeState(raw, NOW, 200);
    expectSameSelections(restored, expected);
    wrapped.forEach(({ reads }) => expectReadOnce(reads));
  });

  it.each(DIFFICULTIES)("restores the exact foreign-realm run owner for difficulty %i", (difficulty) => {
    const day = savedDay();
    const expected = getDailyChallengeRunOwner(day, difficulty)!;
    const restored = sanitizeDailyChallengeRunOwner(foreignRealm(expected));
    expect(restored).toEqual(expected);
    expect(dailyChallengeRunMatches(day, restored)).toBe(true);
    expect(cloneDailyChallengeLevel(restored!.assignment)).toEqual(cloneDailyChallengeLevel(expected.assignment));
  });

  it.each(DIFFICULTIES)("snapshots accessor-backed run owner %i once before certification", (difficulty) => {
    const day = savedDay();
    const expected = getDailyChallengeRunOwner(day, difficulty)!;
    const wrapped = accessorRecord(expected);
    const restored = sanitizeDailyChallengeRunOwner(wrapped.value);
    expect(restored).toEqual(expected);
    expectReadOnce(wrapped.reads);
    expect(dailyChallengeRunMatches(day, restored)).toBe(true);
  });

  it.each([
    ["unknown ID", { id: "daily-no-such-certified-object" }],
    ["changed layout", { layoutSha256: "0".repeat(64) }],
    ["old revision", { catalogRevision: "0".repeat(64) }],
    ["wrong source", { sourceLevelId: 999999 }],
  ] as const)("still rejects %s after normalizing storage wrappers", (_label, patch) => {
    const day = savedDay();
    for (const difficulty of DIFFICULTIES) {
      const invalid = structuredClone(day);
      Object.assign(invalid.pools[difficulty][invalid.selected[difficulty]], patch);
      for (const wrap of [foreignRealm, <T>(value: T) => accessorRecord(value).value]) {
        const restored = reconcileDailyChallengeState(wrap(invalid), NOW, 200);
        expect(restored).toEqual({ ...day, pools: { ...day.pools, [difficulty]: [] } });
        expect(getDailyChallengeAssignment(restored, difficulty)).toBeUndefined();
        const owner = getDailyChallengeRunOwner(day, difficulty)!;
        expect(sanitizeDailyChallengeRunOwner(wrap({ ...owner,
          assignment: { ...owner.assignment, ...patch } }))).toBeUndefined();
      }
    }
  });

  it("rejects throwing pool and owner getters without aborting save recovery", () => {
    const day = savedDay();
    const invalid = structuredClone(day);
    Object.defineProperty(invalid.pools[1][invalid.selected[1]], "id", {
      enumerable: true, get() { throw new Error("native bridge read failed"); },
    });
    let restored: DailyChallengeState | undefined;
    expect(() => { restored = reconcileDailyChallengeState(invalid, NOW, 200); }).not.toThrow();
    expect(restored).toEqual({ ...day, pools: { ...day.pools, 1: [] } });
    const owner = getDailyChallengeRunOwner(day, 1)!;
    Object.defineProperty(owner, "assignment", {
      enumerable: true, get() { throw new Error("native bridge owner read failed"); },
    });
    expect(() => expect(sanitizeDailyChallengeRunOwner(owner)).toBeUndefined()).not.toThrow();
  });

  it.each([true, false])("validates only the first snapshot when a getter later changes (first valid: %s)", (firstValid) => {
    const day = savedDay();
    const difficulty: DailyChallengeDifficulty = 1;
    const original = getDailyChallengeAssignment(day, difficulty)!;
    const originalOwner = getDailyChallengeRunOwner(day, difficulty)!;
    const makeDriftingAssignment = () => {
      const assignment: DailyChallengeAssignment = { ...original };
      let reads = 0;
      Object.defineProperty(assignment, "id", { enumerable: true, get() {
        reads += 1;
        return (reads === 1) === firstValid ? original.id : "daily-unverified-later-value";
      } });
      return { assignment, reads: () => reads };
    };
    const poolEntry = makeDriftingAssignment();
    const raw = structuredClone(day);
    raw.pools[1][raw.selected[1]] = poolEntry.assignment;
    const restored = reconcileDailyChallengeState(raw, NOW, 200);
    expect(poolEntry.reads()).toBe(1);
    if (firstValid) expectSameSelections(restored, day);
    else expect(restored).toEqual({ ...day, pools: { ...day.pools, 1: [] } });

    const ownerEntry = makeDriftingAssignment();
    const owner = sanitizeDailyChallengeRunOwner({ ...originalOwner, assignment: ownerEntry.assignment });
    expect(ownerEntry.reads()).toBe(1);
    expect(owner).toEqual(firstValid ? originalOwner : undefined);
  });

  it("does not refill a missing pool, compact a missing selected slot, or redraw the saved day", () => {
    const day = savedDay();
    const empty = { ...day, pools: { ...day.pools, 1: [] } };
    expect(reconcileDailyChallengeState(foreignRealm(empty), NOW, 200)).toEqual(empty);
    const missing = structuredClone(day);
    missing.pools[1] = [missing.pools[1][0]];
    missing.selected[1] = 9;
    const restored = reconcileDailyChallengeState(foreignRealm(missing), NOW, 200);
    expect(restored).toEqual(missing);
    expect(getDailyChallengeAssignment(restored, 1)).toBeUndefined();
  });

  it.each(["non-array", "oversize", "bad-hash"] as const)("validates the serialized pool when toJSON returns %s", (kind) => {
    const day = savedDay();
    const pool = structuredClone(day.pools[1]);
    const result: unknown = kind === "non-array" ? { 0: pool[0], length: 1 }
      : kind === "oversize" ? Array.from({ length: 11 }, () => pool[0])
        : [{ ...pool[0], layoutSha256: "0".repeat(64) }];
    Object.defineProperty(pool, "toJSON", { value: () => result });
    const restored = reconcileDailyChallengeState({ ...day, pools: { ...day.pools, 1: pool } }, NOW, 200);
    expect(restored).toEqual({ ...day, pools: { ...day.pools, 1: [] } });
  });

  it("rejects a run owner's bad binding returned by toJSON", () => {
    const day = savedDay();
    const owner = getDailyChallengeRunOwner(day, 1)!;
    const bad = { ...owner, assignment: { ...owner.assignment, layoutSha256: "0".repeat(64) } };
    Object.defineProperty(owner, "toJSON", { value: () => bad });
    expect(sanitizeDailyChallengeRunOwner(owner)).toBeUndefined();
  });

  it.each(["bigint", "cycle"] as const)("rejects unserializable %s pools and owners without resetting the day's counters", (kind) => {
    const day = savedDay();
    const pool = structuredClone(day.pools[1]);
    Object.defineProperty(pool[0], "bridgeValue", { enumerable: true, value: kind === "bigint" ? 1n : pool });
    expect(reconcileDailyChallengeState({ ...day, pools: { ...day.pools, 1: pool } }, NOW, 200))
      .toEqual({ ...day, pools: { ...day.pools, 1: [] } });
    const owner = getDailyChallengeRunOwner(day, 1)!;
    Object.defineProperty(owner, "bridgeValue", { enumerable: true, value: kind === "bigint" ? 1n : owner });
    expect(sanitizeDailyChallengeRunOwner(owner)).toBeUndefined();
  });
});
