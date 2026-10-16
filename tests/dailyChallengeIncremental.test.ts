import { beforeEach, describe, expect, it, vi } from "vitest";
// @ts-expect-error Node types are excluded from the app build.
import { createHash } from "node:crypto";
import type { FormalDaily300Entry } from "../src/core/formalDailyChallenge300Data";
import type { DailyChallengeAssignment } from "../src/core/dailyChallenge";

const fixture = vi.hoisted(() => ({ entries: [] as FormalDaily300Entry[], revision: "1".repeat(64) }));
// Explicit private metadata fixtures. No fixture enters the production data file.
vi.mock("../src/core/formalDailyChallenge300Data", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/core/formalDailyChallenge300Data")>();
  return { ...actual, get FORMAL_DAILY_300_ENTRIES() { return fixture.entries; },
    get FORMAL_DAILY_300_REVISION() { return fixture.revision; } };
});

const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === "object" ? Object.fromEntries(Object.entries(value)
    .filter(([, v]) => v !== undefined).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([k, v]) => [k, canonical(v)])) : value;
const sha = (value: unknown): string => createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
const entry = (slot = 7, color: "red" | "blue" = "red"): FormalDaily300Entry => {
  const level: FormalDaily300Entry["level"] = { id: 1, name: "Explicit metadata fixture", difficulty: "hard",
    timeSeconds: 120, reward: 0, parMoves: 17, width: 2, height: 2,
    blocks: [{ id: "fixture-body", x: 0, y: 0, shape: [[0, 0]], color }],
    gates: [{ id: "fixture-gate", side: "top", offset: 0, size: 1, color }] };
  const layoutSha256 = sha(level);
  return { formalId: `daily-basic-combined-d1-${String(slot).padStart(2, "0")}`, stageKey: "basic-combined",
    difficulty: 1, slot, sourceLevelId: 1, layoutSha256, admittedInRevision: "1".repeat(64),
    dailyMechanisms: ["color-exit"], level,
    proof: { levelSha256: layoutSha256, sourceLevelId: 1, lowerBound: 16, upperBound: 17,
      routeReplayComplete: true, reportSha256: "2".repeat(64), routeSha256: "3".repeat(64), toolchainSha256: "4".repeat(64) },
    acceptance: { levelSha256: layoutSha256, designReportSha256: "5".repeat(64), runtimeReportSha256: "6".repeat(64),
      dualScreenPointer: true, naturalTime: true, fullInventory: true, settlement: true } };
};

async function runtime(entries: FormalDaily300Entry[] = [], revision = "1".repeat(64)) {
  fixture.entries = entries;
  fixture.revision = revision;
  vi.resetModules();
  return import("../src/core/dailyChallenge");
}

describe("incremental formal300 day ownership", () => {
  beforeEach(() => { fixture.entries = []; });

  it("admits one sparse band and uses only certified legacy fallback for the others", async () => {
    const api = await runtime([entry()]);
    const state = api.createDailyChallengeState("2026-10-10", 1, undefined, 93);
    expect(state).toMatchObject({ version: 2, profile: "incremental-formal-300-v1", stageKey: "basic-combined" });
    expect(state.unlockedMechanisms).toContain("shutter");
    expect(state.pools[1]).toHaveLength(1);
    expect(state.selected[1]).toBe(0);
    expect(state.pools[1][0]).toMatchObject({ id: "daily-basic-combined-d1-07", variant: 6, catalogKind: "formal300" });
    for (const d of [2, 3] as const) {
      expect(state.pools[d]).toHaveLength(10);
      expect(state.pools[d].every((a) => a.catalogKind === "legacy450")).toBe(true);
      expect(api.cloneDailyChallengeLevel(api.getDailyChallengeAssignment(state, d)!)).toBeDefined();
    }
    expect(api.formalDailyChallenge300Progress().accepted).toBe(1);
  });

  it("maps a new advanced stage to the same legacy stage, not the old shutter stage", async () => {
    const api = await runtime();
    const state = api.createDailyChallengeState("2026-10-10", 20, undefined, 7);
    expect(state.stageKey).toBe("mechanisms-multilayer-shell-15");
    expect(state.pools[1].every((a) => a.id.startsWith("daily-mechanisms-multilayer-shell-15-"))).toBe(true);
    expect(api.formalDailyChallenge300Progress().accepted).toBe(0);
  });

  it("does not replace a fixed day or admitted revision after appending another slot", async () => {
    let api = await runtime([entry()]);
    const day = api.createDailyChallengeState("2026-10-10", 1, undefined, 51);
    day.attemptsRemaining = 2;
    day.completed[2] = day.rewarded[2] = true;
    day.lastAttemptAtMs = 17;
    const owner = api.getDailyChallengeRunOwner(day, 1)!;
    const exactLevel = api.cloneDailyChallengeLevel(owner.assignment);
    api = await runtime([entry(), entry(2, "blue")], "9".repeat(64));
    const same = api.reconcileDailyChallengeState(day, new Date("2026-10-10T22:00:00+08:00"), 200);
    expect(same).toEqual(day);
    expect(api.dailyChallengeRunMatches(same, owner)).toBe(true);
    expect(api.cloneDailyChallengeLevel(owner.assignment)).toEqual(exactLevel);
    const next = api.reconcileDailyChallengeState(day, new Date("2026-10-11T00:01:00+08:00"), 1);
    expect(next.pools[1]).toHaveLength(2);
    expect(next.catalogRevision).toBe("9".repeat(64));
    expect(next.attemptsRemaining).toBe(5);
    expect(next.completed[2]).toBe(false);
  });

  it("retains an exact legacy day even while new300 has the same slot in another catalogue", async () => {
    const api = await runtime([entry()]);
    const { getFormalDailyChallengeAssignments, FORMAL_DAILY_CHALLENGE_REVISION } = await import("../src/core/formalDailyChallengeData");
    const day = api.createDailyChallengeState("2026-10-10", 20, undefined, 7);
    const oldKey = "mechanisms-shutter-20";
    const legacy = { ...day, version: 2 as const, profile: undefined, catalogRevision: FORMAL_DAILY_CHALLENGE_REVISION,
      stageKey: oldKey, stageUnlockLevel: 20,
      pools: { 1: getFormalDailyChallengeAssignments(oldKey, 1)!, 2: getFormalDailyChallengeAssignments(oldKey, 2)!,
        3: getFormalDailyChallengeAssignments(oldKey, 3)! } };
    const restored = api.reconcileDailyChallengeState(legacy, new Date("2026-10-10T23:00:00+08:00"), 200);
    expect(restored).toEqual(legacy);
    expect(api.cloneDailyChallengeLevel(api.getDailyChallengeAssignment(restored, 3)!)).toBeDefined();
  });

  it("keeps the old day across midnight while the exact run is active, then refreshes once", async () => {
    const api = await runtime([entry()]);
    const day = api.consumeDailyChallengeAttempt(api.createDailyChallengeState("2026-10-10", 1, undefined, 7), 123).state;
    const owner = api.getDailyChallengeRunOwner(day, 1)!;
    const run = { daily: true, dailyDayKey: day.dayKey, dailyChallengeDifficulty: 1 as const,
      dailyChallengeSourceLevelId: owner.assignment.sourceLevelId, dailyChallengeOwner: owner };
    const date = new Date("2026-10-11T00:01:00+08:00");
    expect(api.reconcileDailyChallengeState(day, date, 200, undefined, run)).toEqual(day);
    const won = api.completeDailyChallenge(day, 1);
    expect(won.firstCompletion).toBe(true);
    expect(api.completeDailyChallenge(won.state, 1).reward).toEqual({ coins: 0, inspiration: 0 });
    const next = api.reconcileDailyChallengeState(won.state, date, 200);
    expect(next.dayKey).toBe("2026-10-11");
    expect(next.attemptsRemaining).toBe(5);
    expect(api.reconcileDailyChallengeState(next, new Date("2026-10-10T23:30:00+08:00"), 1)).toEqual(next);
  });

  it("rejects tampered owners and never compacts or repairs an invalid selected pool", async () => {
    const api = await runtime([entry()]);
    const day = api.createDailyChallengeState("2026-10-10", 1, undefined, 7);
    const owner = api.getDailyChallengeRunOwner(day, 1)!;
    for (const change of [{ catalogKind: "legacy450" }, { id: "missing" }, { layoutSha256: "0".repeat(64) },
      { catalogRevision: "0".repeat(64) }, { sourceLevelId: 2 }, { proofStatus: "pending" }, { minimumRepositionMoves: 31 }]) {
      const bad = { ...owner, assignment: { ...owner.assignment, ...change } };
      expect(api.sanitizeDailyChallengeRunOwner(bad)).toBeUndefined();
      expect(api.dailyChallengeRunMatches(day, bad)).toBe(false);
    }
    const broken = structuredClone(day);
    broken.pools[1][0].layoutSha256 = "0".repeat(64);
    const restored = api.reconcileDailyChallengeState(broken, new Date("2026-10-10T23:00:00+08:00"), 1);
    expect(restored.pools[1]).toEqual([]);
    expect(restored.selected).toEqual(day.selected);
    expect(restored.attemptsRemaining).toBe(5);
    expect(api.getDailyChallengeAssignment(restored, 1)).toBeUndefined();
    expect(api.getDailyChallengeAssignment({ ...day, selected: { ...day.selected, 1: 9 } }, 1)).toBeUndefined();
  });
});

describe("formal300 compiled entry contract (synthetic metadata only)", () => {
  const inspector = { sourceLevelExists: (id: number) => id === 1, mechanismsUsedByLevel: () => ["color-exit"] };
  it("keeps owned immutable entries and validates old per-entry revisions after append", async () => {
    const { createFormalDaily300Registry } = await import("../src/core/dailyChallengeFormal300");
    const original = entry();
    const registry = createFormalDaily300Registry("9".repeat(64), [original, entry(2, "blue")], inspector);
    const a = registry.assignments("basic-combined", 1).find((v) => v.id === original.formalId)!;
    original.level.blocks[0].x = 99;
    expect(registry.resolve(a)?.level.blocks[0].x).toBe(0);
    expect(a.catalogRevision).toBe("1".repeat(64));
    expect(Object.isFrozen(registry.resolve(a)?.level.blocks[0])).toBe(true);
    expect(registry.resolve({ ...a, catalogRevision: registry.revision })).toBeUndefined();
    expect(registry.count).toBe(2);
  });
  it("rejects incorrect type/id/layout/proof/band/acceptance and duplicate objects", async () => {
    const { createFormalDaily300Registry } = await import("../src/core/dailyChallengeFormal300");
    const changes: ((e: FormalDaily300Entry) => void)[] = [
      (e) => { e.formalId = "not-a-slot"; }, (e) => { e.slot = 6; }, (e) => { e.sourceLevelId = 2; },
      (e) => { e.layoutSha256 = "bad"; }, (e) => { e.level.id = 2; },
      (e) => { e.proof.levelSha256 = "0".repeat(64); }, (e) => { e.proof.lowerBound = 12; },
      (e) => { e.proof.upperBound = 24; }, (e) => { e.proof.routeSha256 = "missing"; },
      (e) => { e.acceptance.levelSha256 = "0".repeat(64); },
      (e) => { (e.acceptance as { naturalTime: boolean }).naturalTime = false; },
      (e) => { e.dailyMechanisms = ["star"]; }, (e) => { e.admittedInRevision = ""; },
    ];
    for (const change of changes) {
      const e = entry(); change(e);
      expect(() => createFormalDaily300Registry("9".repeat(64), [e], inspector)).toThrow();
    }
    expect(() => createFormalDaily300Registry("9".repeat(64), [entry(), entry(8)], inspector)).toThrow();
    const registry = createFormalDaily300Registry("9".repeat(64), [entry()], inspector);
    const a = registry.assignments("basic-combined", 1)[0];
    expect(registry.resolve({ ...a, catalogKind: "unknown" } as unknown as DailyChallengeAssignment)).toBeUndefined();
  });
});
