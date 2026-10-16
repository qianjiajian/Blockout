import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
// @ts-expect-error Node types are excluded from the app build.
import { createHash } from "node:crypto";
import type { FormalDaily300Entry } from "../src/core/formalDailyChallenge300Data";
import type { DailyChallengeAssignment, DailyChallengeDifficulty, DailyChallengeState } from "../src/core/dailyChallenge";

const catalogue = vi.hoisted(() => ({
  entries: [] as FormalDaily300Entry[], legacyOverride: undefined as Record<string, unknown> | undefined,
}));
vi.mock("../src/core/formalDailyChallenge300Data", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/core/formalDailyChallenge300Data")>();
  return { ...actual, get FORMAL_DAILY_300_ENTRIES() { return catalogue.entries; },
    FORMAL_DAILY_300_REVISION: "1".repeat(64) };
});
vi.mock("../src/core/formalDailyChallengeData", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/core/formalDailyChallengeData")>();
  return { ...actual, getFormalDailyChallengeCandidate(id: string) {
    return catalogue.legacyOverride?.formalId === id
      ? catalogue.legacyOverride as unknown as ReturnType<typeof actual.getFormalDailyChallengeCandidate>
      : actual.getFormalDailyChallengeCandidate(id);
  } };
});

const DAY = "2026-10-12", NOW = new Date(`${DAY}T12:00:00+08:00`);
const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === "object" ? Object.fromEntries(Object.entries(value)
    .filter(([, v]) => v !== undefined).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([k, v]) => [k, canonical(v)])) : value;
const sha = (value: unknown): string => createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");

// These are isolated metadata fixtures for the real create/restore/start paths.
// They certify no puzzle and never enter the formal data file or player storage.
function entry(difficulty: DailyChallengeDifficulty, lower: number, upper: number, slot = 1): FormalDaily300Entry {
  const sourceLevelId = 118;
  const level: FormalDaily300Entry["level"] = {
    id: sourceLevelId, name: `Private tolerance fixture D${difficulty}/${slot}`, difficulty: "hard",
    timeSeconds: 120, reward: 0, parMoves: 1, width: 1, height: 1,
    blocks: [{ id: "body", x: 0, y: 0, shape: [[0, 0]], color: "red" }],
    gates: [{ id: "gate", side: "top", offset: 0, size: 1, color: "red" }],
  };
  const layoutSha256 = sha(level);
  return {
    formalId: `daily-basic-combined-d${difficulty}-${String(slot).padStart(2, "0")}`,
    stageKey: "basic-combined", difficulty, slot, sourceLevelId, layoutSha256,
    admittedInRevision: "1".repeat(64), dailyMechanisms: ["color-exit"], level,
    proof: { levelSha256: layoutSha256, sourceLevelId, lowerBound: lower, upperBound: upper,
      routeReplayComplete: true, reportSha256: "2".repeat(64), routeSha256: "3".repeat(64), toolchainSha256: "4".repeat(64) },
    acceptance: { levelSha256: layoutSha256, designReportSha256: "5".repeat(64), runtimeReportSha256: "6".repeat(64),
      dualScreenPointer: true, naturalTime: true, fullInventory: true, settlement: true },
  };
}

let api: typeof import("../src/core/dailyChallenge");
let legacy: typeof import("../src/core/formalDailyChallengeData");
let Game: typeof import("../src/game/ColorEscapeGame")["ColorEscapeGame"];
beforeAll(async () => {
  catalogue.entries = [entry(1, 13, 23), entry(1, 18, 23, 2), entry(2, 18, 33), entry(2, 28, 33, 2), entry(3, 28, 60)];
  vi.resetModules();
  api = await import("../src/core/dailyChallenge");
  legacy = await import("../src/core/formalDailyChallengeData");
  Game = (await import("../src/game/ColorEscapeGame")).ColorEscapeGame;
});
beforeEach(() => { catalogue.legacyOverride = undefined; vi.useFakeTimers(); vi.setSystemTime(NOW); });
afterEach(() => vi.useRealTimers());

function dayFixture(): DailyChallengeState {
  const day = api.createDailyChallengeState(DAY, 1, undefined, 73);
  day.selected = { 1: 0, 2: 0, 3: 0 };
  return day;
}

function gameFixture(day = dayFixture()) {
  const game = Object.create(Game.prototype) as any;
  game.save = game.sanitizeSave({ ...game.sanitizeSave(undefined), highestLevel: 16, currentLevel: 12,
    rewardedLevels: Array.from({ length: 15 }, (_, i) => i + 1), dailyChallenge: day, coins: 123,
  });
  game.model = { level: { id: 12, timeSeconds: 120 } };
  game.screen = "dailyChallenge";
  game.persistVerified = vi.fn(() => "committed");
  game.persist = vi.fn();
  game.loadLevel = vi.fn((_id: number, _play: boolean, _sound: boolean, level: unknown) => {
    game.model = { level }; game.save.activeRun = undefined;
  });
  game.closePopup = vi.fn((_key: unknown, done: () => void) => done());
  game.releaseDailyChallengeArt = vi.fn();
  game.updateBoosterUnlockGuide = vi.fn();
  game.resetPuzzlePresentation = vi.fn();
  game.playSound = vi.fn();
  game.scheduleFrame = vi.fn();
  return game;
}

describe("daily300 tolerance through actual creation, normalization and Game start", () => {
  it.each([[1, 13, 23], [2, 18, 33], [3, 28, 60]] as const)(
    "starts D%s proof [%s,%s] and retains its exact daily owner", (difficulty, lower, upper) => {
      const day = dayFixture();
      const assignment = api.getDailyChallengeAssignment(day, difficulty)!;
      expect(assignment.catalogKind).toBe("formal300");
      expect(assignment.minimumRepositionMoves).toBe(lower);
      expect(catalogue.entries.find(e => e.formalId === assignment.id)?.proof.upperBound).toBe(upper);
      expect(api.dailyChallengeDifficultyMeetsMoveRule(assignment, difficulty)).toBe(true);
      const restored = api.reconcileDailyChallengeState(JSON.parse(JSON.stringify(day)), NOW, 16);
      expect(restored).toEqual(day);
      const owner = api.getDailyChallengeRunOwner(restored, difficulty)!;
      expect(api.sanitizeDailyChallengeRunOwner(owner)).toEqual(owner);
      const game = gameFixture(restored), baseline = structuredClone(game.save);
      expect(game.save.dailyChallenge).toEqual(day);
      game.startDailyChallenge(difficulty);
      expect(game.loadLevel).toHaveBeenCalledExactlyOnceWith(118, false, false, api.cloneDailyChallengeLevel(assignment), true);
      expect(sha(game.loadLevel.mock.calls[0][3])).toBe(assignment.layoutSha256);
      expect(game.save.activeRun.dailyChallengeOwner).toEqual(owner);
      expect(game.save.dailyChallenge.attemptsRemaining).toBe(4);
      expect(api.dailyChallengeRunMatches(game.save.dailyChallenge, game.save.activeRun.dailyChallengeOwner)).toBe(true);
      expect(game.sanitizeSave(structuredClone(game.save)).activeRun).toEqual(game.save.activeRun);
      expect(game.persistVerified).toHaveBeenCalledOnce();
      expect(game.save.currentLevel).toBe(baseline.currentLevel);
      expect(game.save.highestLevel).toBe(baseline.highestLevel);
      expect(game.save.lifeState).toEqual(baseline.lifeState);
      expect(game.save.coins).toBe(baseline.coins);
    },
  );

  it.each([[1, 2], [2, 3]] as const)("rejects D%s identity reused in D%s even where proof bands overlap", (from, to) => {
    const day = dayFixture(), source = day.pools[from][1];
    expect(api.dailyChallengeDifficultyMeetsMoveRule(source, from)).toBe(true);
    expect(api.dailyChallengeDifficultyMeetsMoveRule(source, to)).toBe(false);
    expect(api.sanitizeDailyChallengeRunOwner({ dayKey: DAY, difficulty: to, assignment: source })).toBeUndefined();
    day.pools[to] = [structuredClone(source)];
    day.selected[to] = 0;
    const restored = api.reconcileDailyChallengeState(day, NOW, 16);
    expect(restored.pools[to]).toEqual([]);
    const game = gameFixture();
    game.save.dailyChallenge = day;
    const before = structuredClone(game.save);
    game.startDailyChallenge(to);
    expect(game.loadLevel).not.toHaveBeenCalled();
    expect(game.persistVerified).not.toHaveBeenCalled();
    expect(game.save).toEqual(before);
    expect(game.dailyChallengeFeedback.text).toBe("当前阶段暂无可用关卡");
  });

  it.each(["unknown-id", "unknown-proof", "wrong-revision", "wrong-lower", "nan", "infinity", "fraction"])(
    "rejects %s metadata without replacement, spending or starting", (kind) => {
      const day = dayFixture(), assignment = day.pools[1][0];
      if (kind === "unknown-id") assignment.id = "daily-basic-combined-d1-10";
      else if (kind === "unknown-proof") assignment.proofStatus = "pending";
      else if (kind === "wrong-revision") assignment.catalogRevision = "0".repeat(64);
      else assignment.minimumRepositionMoves = kind === "nan" ? NaN : kind === "infinity" ? Infinity : kind === "fraction" ? 13.5 : 14;
      expect(api.dailyChallengeDifficultyMeetsMoveRule(assignment, 1)).toBe(false);
      expect(api.getDailyChallengeRunOwner(day, 1)).toBeUndefined();
      expect(api.reconcileDailyChallengeState(day, NOW, 16).pools[1]).toEqual([]);
      const game = gameFixture(); game.save.dailyChallenge = day;
      const before = structuredClone(game.save);
      game.startDailyChallenge(1);
      expect(game.loadLevel).not.toHaveBeenCalled();
      expect(game.persistVerified).not.toHaveBeenCalled();
      expect(game.save).toEqual(before);
    },
  );
});

describe("legacy450 retains its original proof bands", () => {
  it.each([[1, 13, 20], [1, 16, 23], [2, 18, 30], [2, 21, 33], [3, 28, 35]] as const)(
    "does not extend legacy D%s to [%s,%s]", (difficulty, lower, upper) => {
      const day = api.createDailyChallengeState(DAY, 16, undefined, 17);
      const originalAssignment = api.getDailyChallengeAssignment(day, difficulty)!;
      expect(originalAssignment.catalogKind).toBe("legacy450");
      expect(api.dailyChallengeDifficultyMeetsMoveRule(originalAssignment, difficulty)).toBe(true);
      const original = legacy.getFormalDailyChallengeCandidate(originalAssignment.id)!;
      catalogue.legacyOverride = { ...structuredClone(original), minimumRepositionMoves: lower,
        proofLowerBound: lower, verifiedSolutionRepositionMoves: upper, proofUpperBound: upper };
      const assignment: DailyChallengeAssignment = { ...originalAssignment, minimumRepositionMoves: lower };
      // Matching metadata alone must not grant the new300-only tolerance.
      day.pools[difficulty][day.selected[difficulty]] = assignment;
      expect(api.dailyChallengeDifficultyMeetsMoveRule(assignment, difficulty)).toBe(false);
      expect(api.getDailyChallengeRunOwner(day, difficulty)).toBeUndefined();
      expect(api.reconcileDailyChallengeState(day, NOW, 16).pools[difficulty]).toEqual([]);
      const game = gameFixture(); game.save.dailyChallenge = day;
      const before = structuredClone(game.save);
      game.startDailyChallenge(difficulty);
      expect(game.loadLevel).not.toHaveBeenCalled();
      expect(game.persistVerified).not.toHaveBeenCalled();
      expect(game.save).toEqual(before);
    },
  );
});
