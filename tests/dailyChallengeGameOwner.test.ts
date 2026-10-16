import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
// @ts-expect-error Node types are excluded from the app build.
import { createHash } from "node:crypto";
import type { FormalDaily300Entry } from "../src/core/formalDailyChallenge300Data";
import type { DailyChallengeState } from "../src/core/dailyChallenge";

const catalogue = vi.hoisted(() => ({ entries: [] as FormalDaily300Entry[] }));
vi.mock("../src/core/formalDailyChallenge300Data", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/core/formalDailyChallenge300Data")>();
  return { ...actual, get FORMAL_DAILY_300_ENTRIES() { return catalogue.entries; },
    FORMAL_DAILY_300_REVISION: "1".repeat(64) };
});

const DAY = "2026-10-10";
const BEFORE_MIDNIGHT = new Date(`${DAY}T23:59:00+08:00`);
const AFTER_MIDNIGHT = new Date("2026-10-11T00:01:00+08:00");
const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === "object" ? Object.fromEntries(Object.entries(value)
    .filter(([, v]) => v !== undefined).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([key, v]) => [key, canonical(v)])) : value;
const sha = (value: unknown): string => createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");

// Private metadata fixture only: no production registration, solver, model,
// renderer, host or player storage is used by this test suite.
const formalEntry = (): FormalDaily300Entry => {
  const level: FormalDaily300Entry["level"] = {
    id: 118, name: "Game owner metadata fixture", difficulty: "hard", timeSeconds: 120,
    reward: 0, parMoves: 17, width: 2, height: 2,
    blocks: [{ id: "owner-fixture-body", x: 0, y: 0, shape: [[0, 0]], color: "red" }],
    gates: [{ id: "owner-fixture-gate", side: "top", offset: 0, size: 1, color: "red" }],
  };
  const layoutSha256 = sha(level);
  return {
    formalId: "daily-basic-combined-d1-07", stageKey: "basic-combined", difficulty: 1,
    slot: 7, sourceLevelId: 118, layoutSha256, admittedInRevision: "1".repeat(64),
    dailyMechanisms: ["color-exit"], level,
    proof: { levelSha256: layoutSha256, sourceLevelId: 118, lowerBound: 16, upperBound: 17,
      routeReplayComplete: true, reportSha256: "2".repeat(64), routeSha256: "3".repeat(64), toolchainSha256: "4".repeat(64) },
    acceptance: { levelSha256: layoutSha256, designReportSha256: "5".repeat(64), runtimeReportSha256: "6".repeat(64),
      dualScreenPointer: true, naturalTime: true, fullInventory: true, settlement: true },
  };
};

let api: typeof import("../src/core/dailyChallenge");
let Game: typeof import("../src/game/ColorEscapeGame")["ColorEscapeGame"];
beforeAll(async () => {
  catalogue.entries = [formalEntry()];
  vi.resetModules();
  api = await import("../src/core/dailyChallenge");
  Game = (await import("../src/game/ColorEscapeGame")).ColorEscapeGame;
});
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(BEFORE_MIDNIGHT); });
afterEach(() => vi.useRealTimers());

function gameFixture(day?: DailyChallengeState) {
  const game = Object.create(Game.prototype) as any;
  const defaults = game.sanitizeSave(undefined);
  // The pool was fixed earlier in the day; campaign progress may subsequently
  // advance without replacing that pool. Source 118 is still above progress 16.
  game.save = game.sanitizeSave({ ...defaults, highestLevel: 16, currentLevel: 12,
    rewardedLevels: Array.from({ length: 15 }, (_, i) => i + 1),
    coins: 1234, boosters: { time: 1, rocket: 0, pulse: 0 },
    dailyChallenge: day ?? api.createDailyChallengeState(DAY, 1, undefined, 123),
  });
  game.model = { level: { id: 12, timeSeconds: 120 } };
  game.screen = "dailyChallenge";
  game.persistVerified = vi.fn(() => "committed");
  game.persist = vi.fn();
  game.loadLevel = vi.fn((_id: number, _play: boolean, _sound: boolean, level: unknown) => {
    game.model = { level };
    game.save.activeRun = undefined;
  });
  game.closePopup = vi.fn((_key: unknown, done: () => void) => done());
  game.releaseDailyChallengeArt = vi.fn();
  game.updateBoosterUnlockGuide = vi.fn();
  game.resetPuzzlePresentation = vi.fn();
  game.playSound = vi.fn();
  game.scheduleFrame = vi.fn();
  return game;
}

function attachRun(game: any, withOwner = true) {
  const assignment = api.getDailyChallengeAssignment(game.save.dailyChallenge, 1)!;
  game.save.dailyChallenge.attemptsRemaining = 2;
  game.save.activeRun = {
    levelId: assignment.sourceLevelId, returnLevelId: 12, lifeStarted: true,
    daily: true, dailyDayKey: game.save.dailyChallenge.dayKey,
    dailyChallengeDifficulty: 1, dailyChallengeSourceLevelId: assignment.sourceLevelId,
    ...(withOwner ? { dailyChallengeOwner: api.getDailyChallengeRunOwner(game.save.dailyChallenge, 1) } : {}),
    boosterSpent: { time: 1, rocket: 1, pulse: 0 },
  };
  return assignment;
}

describe("Game daily exact-owner integration", () => {
  it("sanitizes a formal daily source above campaign unlock without clamping its identity", () => {
    const game = gameFixture();
    attachRun(game);
    const original = structuredClone(game.save);
    const sanitized = game.sanitizeSave(original);
    expect(sanitized.activeRun).toEqual(original.activeRun);
    expect(sanitized.activeRun.levelId).toBe(118);
    expect(sanitized.activeRun.dailyChallengeSourceLevelId).toBe(118);
    expect(sanitized.currentLevel).toBe(12);
    expect(sanitized.highestLevel).toBe(16);
    expect(sanitized.dailyChallenge).toEqual(original.dailyChallenge);
    expect(sanitized.boosters).toEqual(original.boosters);
    // Campaign journals keep their original unlock clamp.
    const campaign = game.sanitizeSave({ ...original, activeRun: { ...original.activeRun, daily: false } });
    expect(campaign.activeRun.levelId).toBe(16);
  });

  it("starts the exact admitted object and writes an independently cloned owner", () => {
    const game = gameFixture();
    const baseline = structuredClone(game.save);
    const assignment = api.getDailyChallengeAssignment(baseline.dailyChallenge, 1)!;
    game.startDailyChallenge(1);
    expect(game.loadLevel).toHaveBeenCalledExactlyOnceWith(118, false, false,
      api.cloneDailyChallengeLevel(assignment), true);
    expect(sha(game.loadLevel.mock.calls[0][3])).toBe(assignment.layoutSha256);
    expect(game.save.activeRun.dailyChallengeOwner).toEqual(api.getDailyChallengeRunOwner(baseline.dailyChallenge, 1));
    expect(game.save.dailyChallenge.attemptsRemaining).toBe(4);
    expect(game.save.currentLevel).toBe(12);
    expect(game.save.highestLevel).toBe(16);
    expect(game.save.lifeState).toEqual(baseline.lifeState);
    expect(game.save.rewardedLevels).toEqual(baseline.rewardedLevels);
    const clone = game.cloneSave(game.save);
    clone.activeRun.dailyChallengeOwner.assignment.dailyMechanisms.push("star");
    clone.activeRun.dailyChallengeOwner.assignment.layoutSha256 = "0".repeat(64);
    expect(game.save.activeRun.dailyChallengeOwner.assignment).toEqual(assignment);
    expect(game.persistVerified).toHaveBeenCalledOnce();
  });

  it("keeps active day, pool and owner across Beijing midnight, including a paid restart", () => {
    const game = gameFixture();
    const assignment = attachRun(game);
    const before = structuredClone(game.save);
    vi.setSystemTime(AFTER_MIDNIGHT);
    game.save = game.sanitizeSave(game.save);
    expect(game.save.activeRun).toEqual(before.activeRun);
    expect(game.dailyChallengeState()).toEqual(before.dailyChallenge);
    expect(game.persist).not.toHaveBeenCalled();
    game.restartDailyChallenge();
    expect(game.save.dailyChallenge.dayKey).toBe(DAY);
    expect(game.save.dailyChallenge.pools).toEqual(before.dailyChallenge.pools);
    expect(game.save.dailyChallenge.selected).toEqual(before.dailyChallenge.selected);
    expect(game.save.dailyChallenge.attemptsRemaining).toBe(1);
    expect(game.save.activeRun.dailyChallengeOwner).toEqual(before.activeRun.dailyChallengeOwner);
    expect(game.loadLevel).toHaveBeenCalledExactlyOnceWith(118, false, false,
      api.cloneDailyChallengeLevel(assignment), true);
    expect(game.save.boosters).toEqual(before.boosters);
  });

  it("abandons an interrupted daily run without refunds and only then refreshes the new day", () => {
    const game = gameFixture();
    attachRun(game);
    const before = structuredClone(game.save);
    vi.setSystemTime(AFTER_MIDNIGHT);
    const sanitized = game.sanitizeSave(before);
    game.save = game.recoverInterruptedRun(sanitized);
    expect(game.save.activeRun).toBeUndefined();
    expect(game.save.dailyChallenge).toEqual(before.dailyChallenge);
    expect(game.save.boosters).toEqual(before.boosters);
    expect(game.save.currentLevel).toBe(12);
    expect(game.loadLevel).not.toHaveBeenCalled();
    const next = game.dailyChallengeState();
    expect(next.dayKey).toBe("2026-10-11");
    expect(next.attemptsRemaining).toBe(5);
    expect(game.save.boosters).toEqual(before.boosters);
    expect(game.persist).toHaveBeenCalledOnce();
    expect(game.dailyChallengeState()).toEqual(next);
    expect(game.persist).toHaveBeenCalledOnce();
  });

  it.each(["hash", "catalogue", "source", "day", "null"])(
    "rejects an explicit invalid owner (%s) without substitution or refund", (kind) => {
      const game = gameFixture();
      attachRun(game);
      const before = structuredClone(game.save);
      const bad = structuredClone(before);
      if (kind === "null") bad.activeRun.dailyChallengeOwner = null;
      else if (kind === "day") bad.activeRun.dailyChallengeOwner.dayKey = "2026-10-09";
      else if (kind === "source") bad.activeRun.dailyChallengeSourceLevelId = 117;
      else if (kind === "catalogue") bad.activeRun.dailyChallengeOwner.assignment.catalogKind = "legacy450";
      else bad.activeRun.dailyChallengeOwner.assignment.layoutSha256 = "0".repeat(64);
      const clean = game.sanitizeSave(bad);
      expect(clean.activeRun).toBeUndefined();
      const recovered = game.recoverInterruptedRun(clean);
      expect(recovered.dailyChallenge).toEqual(before.dailyChallenge);
      expect(recovered.dailyChallenge.attemptsRemaining).toBe(2);
      expect(recovered.boosters).toEqual(before.boosters);
      expect(recovered.currentLevel).toBe(12);
      expect(recovered.highestLevel).toBe(16);
      expect(recovered.coins).toBe(before.coins);
      expect(game.loadLevel).not.toHaveBeenCalled();
      expect(game.persistVerified).not.toHaveBeenCalled();
    });

  it("blocks a damaged selected object before spending rather than choosing another band or campaign board", () => {
    const game = gameFixture();
    game.save.dailyChallenge.pools[1][0].layoutSha256 = "0".repeat(64);
    const before = structuredClone(game.save);
    game.startDailyChallenge(1);
    expect(game.loadLevel).not.toHaveBeenCalled();
    expect(game.persistVerified).not.toHaveBeenCalled();
    expect(game.save).toEqual(before);
    expect(game.dailyChallengeFeedback.text).toBe("当前阶段暂无可用关卡");
  });

  it("keeps a legacy journal without owner compatible, including its consumed resources", () => {
    const day = api.createDailyChallengeState(DAY, 16, undefined, 7);
    expect(day.pools[1].every((a) => a.catalogKind === "legacy450")).toBe(true);
    const game = gameFixture(day);
    const assignment = attachRun(game, false);
    const before = structuredClone(game.save);
    vi.setSystemTime(AFTER_MIDNIGHT);
    const sanitized = game.sanitizeSave(before);
    expect(sanitized.activeRun).toEqual(before.activeRun);
    expect(sanitized.activeRun).not.toHaveProperty("dailyChallengeOwner");
    expect(sanitized.dailyChallenge).toEqual(before.dailyChallenge);
    expect(api.cloneDailyChallengeLevel(assignment)).toBeDefined();
    const recovered = game.recoverInterruptedRun(sanitized);
    expect(recovered.activeRun).toBeUndefined();
    expect(recovered.dailyChallenge.attemptsRemaining).toBe(2);
    expect(recovered.boosters).toEqual(before.boosters);
    expect(game.loadLevel).not.toHaveBeenCalled();
  });

  it("settles a midnight-crossing run against its original day without campaign rewards or double reward", () => {
    const game = gameFixture();
    attachRun(game);
    const before = structuredClone(game.save);
    game.runElapsedSeconds = 18;
    game.model = { level: formalEntry().level };
    vi.setSystemTime(AFTER_MIDNIGHT);
    const first = game.createDailyChallengeSettlement(1, { moves: 17 });
    expect(first.candidateSave.dailyChallenge.dayKey).toBe(DAY);
    expect(first.candidateSave.dailyChallenge.attemptsRemaining).toBe(2);
    expect(first.candidateSave.dailyChallenge.completed[1]).toBe(true);
    expect(first.candidateSave.dailyChallenge.rewarded[1]).toBe(true);
    expect(first.candidateSave.activeRun).toBeUndefined();
    expect(first.candidateSave.currentLevel).toBe(before.currentLevel);
    expect(first.candidateSave.highestLevel).toBe(before.highestLevel);
    expect(first.candidateSave.rewardedLevels).toEqual(before.rewardedLevels);
    expect(first.candidateSave.lifeState).toEqual(before.lifeState);
    expect(first.candidateSave.boosters).toEqual(before.boosters);
    expect(first.candidateSave.coins).toBeGreaterThan(before.coins);
    // A duplicate completion still associated with the same active owner must
    // be idempotent; a later deliberate new-day run is a different ownership.
    game.save = { ...first.candidateSave, activeRun: before.activeRun };
    const duplicate = game.createDailyChallengeSettlement(1, { moves: 17 });
    expect(duplicate.candidateSave.coins).toBe(first.candidateSave.coins);
    expect(duplicate.candidateSave.collectionProgress.inspiration).toBe(first.candidateSave.collectionProgress.inspiration);
    expect(duplicate.presentation.coinReward).toBe(0);
  });
});
