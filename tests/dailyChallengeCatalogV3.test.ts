import { describe, expect, it } from "vitest";
// @ts-expect-error Node ambient types are intentionally excluded from the app tsconfig.
import { createHash } from "node:crypto";
import { LEVELS } from "../src/core/levels";
import { createDailyChallengeState, mechanismsUsedByDailyLevel } from "../src/core/dailyChallenge";
import { FORMAL_DAILY_CHALLENGE_REVISION, getFormalDailyChallengeAssignments, getFormalDailyChallengeCandidate } from "../src/core/formalDailyChallengeData";
import { DAILY_CHALLENGE_V3_PROFILE, DAILY_CHALLENGE_V3_SLOTS } from "../src/core/dailyChallengeStagesV3";
import {
  createDailyChallengeCatalogProviderV3, createDailyChallengeStateV3, planDailyChallengeMigrationV3,
  reconcileDailyChallengeStateV3, type DailyChallengeCatalogV3, type DailyChallengeCatalogProviderV3,
} from "../src/core/dailyChallengeCatalogV3";
import type { LevelSpec } from "../src/core/types";

const canonical = (v: unknown): unknown => Array.isArray(v) ? v.map(canonical)
  : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).filter(([, x]) => x !== undefined)
    .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k, x]) => [k, canonical(x)])) : v;
const sha = (v: unknown): string => createHash("sha256").update(JSON.stringify(canonical(v))).digest("hex");
const inspector = { levelSha256: (level: LevelSpec) => sha(level), mechanismsUsedByLevel: mechanismsUsedByDailyLevel,
  sourceLevelExists: (id: number) => LEVELS.some((l) => l.id === id) };

/** Existing receipts are schema fixtures only. This does not accept old art/design/Pointer evidence as new300. */
function fixture(): DailyChallengeCatalogV3 {
  return { schemaVersion: 3, profile: DAILY_CHALLENGE_V3_PROFILE, catalogRevision: "a".repeat(64),
    entries: DAILY_CHALLENGE_V3_SLOTS.map((s) => {
      const oldId = s.id.replace("basic-combined", "mechanisms-color-exit-1");
      const old = getFormalDailyChallengeCandidate(oldId)!;
      return { formalId: s.id, stageKey: s.stageKey, difficulty: s.difficulty, slot: s.slot,
        sourceLevelId: old.sourceLevelId, layoutSha256: old.layoutSha256,
        dailyMechanisms: [...old.dailyMechanisms], level: structuredClone(old.level), proof: {
          levelSha256: old.layoutSha256, sourceLevelId: old.sourceLevelId,
          lowerBound: old.proofLowerBound, upperBound: old.proofUpperBound, routeReplayComplete: true,
          reportSha256: old.proofReportSha256, toolchainSha256: old.toolchainSha256,
        } };
    }) };
}
const provider = (): DailyChallengeCatalogProviderV3 => {
  const result = createDailyChallengeCatalogProviderV3(fixture(), inspector);
  expect(result.issues).toEqual([]);
  return result.provider!;
};
const oldState = () => {
  const state = createDailyChallengeState("2026-10-08", 20, LEVELS, 123456);
  // This retired migration proposal still tests a genuine legacy450 day;
  // createDailyChallengeState now creates the v1.185 ten-stage production day.
  delete state.profile;
  state.catalogRevision = FORMAL_DAILY_CHALLENGE_REVISION;
  state.stageKey = "mechanisms-shutter-20";
  state.stageUnlockLevel = 20;
  state.pools = { 1: getFormalDailyChallengeAssignments(state.stageKey, 1)!,
    2: getFormalDailyChallengeAssignments(state.stageKey, 2)!,
    3: getFormalDailyChallengeAssignments(state.stageKey, 3)! };
  state.selected = { 1: 9, 2: 4, 3: 0 };
  state.attemptsRemaining = 2;
  state.lastAttemptAtMs = Date.parse("2026-10-08T02:00:00Z");
  state.completed = { 1: true, 2: false, 3: true };
  state.rewarded = { 1: true, 2: false, 3: true };
  return state;
};

describe("isolated daily300 catalog and migration", () => {
  it("admits all300 only as a candidate provider and keeps every full object unchanged", () => {
    const catalog = fixture(), result = createDailyChallengeCatalogProviderV3(catalog, inspector);
    expect(result.ok).toBe(true);
    expect(result.provider?.phase).toBe("candidate-only");
    for (const s of DAILY_CHALLENGE_V3_SLOTS) {
      const a = result.provider!.getAssignments(s.stageKey, s.difficulty)![s.slot - 1];
      const level = result.provider!.cloneLevel(a)!;
      expect(sha(level)).toBe(a.layoutSha256);
      expect(level).toEqual(catalog.entries.find((e) => e.formalId === a.id)!.level);
    }
  });
  it("rejects a partial catalog without exposing partial pools", () => {
    const c = fixture(); c.entries = c.entries.slice(0, 299);
    const r = createDailyChallengeCatalogProviderV3(c, inspector);
    expect(r.ok).toBe(false); expect(r.provider).toBeUndefined();
    expect(r.issues).toContain("catalog-requires-all-300-slots");
  });
  it.each(["profile", "duplicate", "source", "sha", "proof", "band", "infinite", "missing-route", "mechanisms", "latest"])(
    "fails closed on %s binding corruption", (kind) => {
      const c = fixture(), e = c.entries[0];
      if (kind === "profile") Object.assign(c, { profile: "legacy" });
      if (kind === "duplicate") c.entries = [...c.entries.slice(0, 299), c.entries[0]];
      if (kind === "source") e.sourceLevelId = 999;
      if (kind === "sha") e.level.reward++;
      if (kind === "proof") e.proof.levelSha256 = "0".repeat(64);
      if (kind === "band") e.proof.upperBound = 21;
      if (kind === "infinite") c.entries[20].proof.upperBound = Infinity;
      if (kind === "missing-route") Object.assign(e.proof, { routeReplayComplete: false });
      if (kind === "mechanisms") e.dailyMechanisms = ["color-exit", "generator"];
      const inspect = kind === "latest" ? { ...inspector, mechanismsUsedByLevel: () => ["color-exit"] } : inspector;
      const result = createDailyChallengeCatalogProviderV3(c, inspect);
      expect(result.ok).toBe(false); expect(result.provider).toBeUndefined();
    });
  it("clones are isolated and any stale slot/source/revision/proof binding is rejected without fallback", () => {
    const c = fixture(), p = createDailyChallengeCatalogProviderV3(c, inspector).provider!;
    const a = p.getAssignments("basic-combined", 1)![0], original = p.cloneLevel(a)!;
    c.entries[0].level.reward = 9999;
    const clone = p.cloneLevel(a)!; clone.blocks[0].x = 999;
    expect(p.cloneLevel(a)).toEqual(original);
    for (const change of [{ id: "missing" }, { sourceLevelId: 1 }, { layoutSha256: "0".repeat(64) },
      { catalogRevision: "b".repeat(64) }, { stageKey: "mechanisms-generator-35" }, { slot: 2 },
      { difficulty: 2 as const }, { profile: "legacy" }, { proofReportSha256: "0".repeat(64) },
      { minimumRepositionMoves: 0 }, { verifiedSolutionRepositionMoves: 999 }])
      expect(p.cloneLevel({ ...a, ...change } as typeof a)).toBeUndefined();
  });
  it("preserves same-day slots, seed, attempts, success, rewards and timestamps when six stages merge", () => {
    const old = oldState(), before = structuredClone(old), r = planDailyChallengeMigrationV3(old, provider());
    expect(r.status).toBe("ready"); if (r.status !== "ready") return;
    expect(r.sameDayStageFrozen).toBe(true); expect(r.stageSource).toBe("saved-stage-key");
    expect(r.mappedFromStageKey).toBe("mechanisms-shutter-20");
    expect(r.state.stageKey).toBe("basic-combined");
    for (const key of ["dayKey", "maxObservedDayKey", "selected", "playerSeed", "attemptsRemaining",
      "lastAttemptAtMs", "completed", "rewarded"] as const) expect(r.state[key]).toEqual(old[key]);
    expect(r.grantsReward).toBe(false); expect(r.consumesAttempt).toBe(false);
    expect(old).toEqual(before);
    const repeated = planDailyChallengeMigrationV3(r.state, provider());
    expect(repeated.status === "ready" && repeated.state).toEqual(r.state);
  });
  it("defers a bound old active run until settlement/exit and preserves the old owner", () => {
    const old = oldState(), a = old.pools[2][old.selected[2]], p = provider();
    const active = { daily: true, dailyDayKey: old.dayKey, dailyChallengeDifficulty: 2,
      dailyChallengeSourceLevelId: a.sourceLevelId, levelId: a.sourceLevelId };
    const r = planDailyChallengeMigrationV3(old, p, active);
    expect(r).toMatchObject({ status: "defer-active-run", releaseCondition: "settled-or-abandoned",
      sameDayStageFrozen: true, grantsReward: false, consumesAttempt: false,
      owner: { formalId: a.id, layoutSha256: a.layoutSha256, sourceLevelId: a.sourceLevelId,
        catalogRevision: old.catalogRevision, dayKey: old.dayKey, difficulty: 2, profile: "legacy-450-schema2" } });
    expect(reconcileDailyChallengeStateV3(old, 200, new Date("2026-10-09T01:00:00Z"), p, active).status).toBe("defer-active-run");
    expect(planDailyChallengeMigrationV3(old, p).status).toBe("ready");
    for (const change of [{ dailyDayKey: "2026-10-07" }, { levelId: 999 },
      { dailyChallengeDifficulty: 4 }, { dailyChallengeSourceLevelId: 999 }])
      expect(planDailyChallengeMigrationV3(old, p, { ...active, ...change }).status).toBe("blocked");
  });
  it("does not redraw on same day/progress/rollback, but changes stage at Beijing midnight", () => {
    const old = oldState(), p = provider();
    for (const time of ["2026-10-08T15:59:59Z", "2026-10-07T01:00:00Z"]) {
      const r = reconcileDailyChallengeStateV3(old, 200, new Date(time), p);
      expect(r.status).toBe("ready"); if (r.status !== "ready") continue;
      expect(r.state.stageKey).toBe("basic-combined"); expect(r.state.selected).toEqual(old.selected);
      expect(r.state.attemptsRemaining).toBe(2); expect(r.state.rewarded).toEqual(old.rewarded);
    }
    const r = reconcileDailyChallengeStateV3(old, 20, new Date("2026-10-08T16:00:00Z"), p);
    expect(r.status).toBe("ready"); if (r.status !== "ready") return;
    expect(r.sameDayStageFrozen).toBe(false); expect(r.stageSource).toBe("new-day-progress");
    expect(r.state.stageKey).toBe("mechanisms-multilayer-shell-15"); expect(r.state.dayKey).toBe("2026-10-09");
    expect(r.state.attemptsRemaining).toBe(5); expect(r.state.playerSeed).toBe(old.playerSeed);
    expect(r.state.completed).toEqual({ 1: false, 2: false, 3: false });
  });
  it("rejects invented old/new selected-pool identities even if the active source still matches", () => {
    const p = provider(), old = oldState(), a = old.pools[2][old.selected[2]];
    const active = { daily: true, dailyDayKey: old.dayKey, dailyChallengeDifficulty: 2,
      dailyChallengeSourceLevelId: a.sourceLevelId, levelId: a.sourceLevelId };
    for (const patch of [{ id: "fake" }, { id: a.id.replace("d2", "d3") },
      { id: a.id.replace("-05", "-06") }, { variant: 8 }, { proofStatus: "pending" },
      { layoutFactory: "seam-chambers-v1" }]) {
      const changed = structuredClone(old);
      Object.assign(changed.pools[2][changed.selected[2]], patch);
      expect(planDailyChallengeMigrationV3(changed, p, active).status).toBe("blocked");
    }
    expect(planDailyChallengeMigrationV3({ ...old, stageUnlockLevel: 1 }, p, active).status).toBe("blocked");
    const current = createDailyChallengeStateV3(old.dayKey, 35, 12345, p)!;
    const b = current.pools[2][current.selected[2]], currentRun = { ...active,
      dailyChallengeSourceLevelId: b.sourceLevelId, levelId: b.sourceLevelId };
    expect(planDailyChallengeMigrationV3(current, p, currentRun).status).toBe("defer-active-run");
    for (const patch of [{ id: "fake" }, { profile: "legacy" }, { stageKey: "basic-combined" },
      { difficulty: 1 }, { slot: 99 }, { proofReportSha256: "" }]) {
      const changed = structuredClone(current); Object.assign(changed.pools[2][changed.selected[2]], patch);
      expect(planDailyChallengeMigrationV3(changed, p, currentRun).status).toBe("blocked");
    }
  });
  it("retains saved advanced stages and rejects unknown saved stages instead of inferring progress", () => {
    const p = provider(), old = createDailyChallengeState("2026-10-08", 65, LEVELS, 123);
    const r = reconcileDailyChallengeStateV3(old, 200, new Date("2026-10-08T01:00:00Z"), p);
    expect(r.status === "ready" && r.state.stageKey).toBe("mechanisms-layered-lift-65");
    expect(planDailyChallengeMigrationV3({ ...old, stageKey: "unknown" }, p).status).toBe("blocked");
    expect(planDailyChallengeMigrationV3({ ...old, attemptsRemaining: 6 }, p).status).toBe("blocked");
    expect(createDailyChallengeStateV3("bad-date", 1, 123, p)).toBeUndefined();
  });
});
