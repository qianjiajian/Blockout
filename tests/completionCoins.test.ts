import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FIRST_CLEAR_COIN_REWARD, getCompletionCoinReward } from "../src/core/completionRewards";
import { LEVELS } from "../src/core/levels";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";
import { CountdownWarning } from "../src/game/countdownWarning";

const NOW = new Date("2026-09-24T12:00:00.000Z").getTime();
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** Exercise the real private settlement methods without creating a renderer or touching player storage. */
const settlementGame = (levelId = 21, saveOverrides: Record<string, unknown> = {}) => {
  const game = Object.create(ColorEscapeGame.prototype) as any;
  game.countdownWarning = new CountdownWarning();
  const defaults = game.sanitizeSave(undefined);
  game.save = game.sanitizeSave({
    ...defaults,
    currentLevel: levelId,
    highestLevel: levelId,
    coins: 1234,
    rewardedLevels: [],
    lifeState: { lives: 4, nextLifeAtMs: NOW + 1_800_000, unlimitedLivesUntilMs: 0 },
    ...saveOverrides,
  });
  game.model = {
    level: LEVELS[levelId - 1],
    snapshot: () => ({ moves: game.completionMetrics.moves, remainingSeconds: 1 }),
  };
  game.completionMetrics = { moves: 1, elapsedSeconds: 1 };
  game.screen = "playing";
  game.settlementSaveAttempts = 0;
  game.storageReadAttempts = 0;
  game.storageBaselineReady = true;
  game.playSound = vi.fn();
  game.vibrate = vi.fn();
  game.scheduleFrame = vi.fn();
  game.releaseWinArt = vi.fn();
  game.requestWinArt = vi.fn();
  game.emitBurst = vi.fn();

  const storage = {
    value: clone(game.save),
    mode: "commit" as "commit" | "reject" | "unknown-after-write" | "lost-ack",
  };
  game.host = {
    storageSet: vi.fn((_key: string, value: unknown) => {
      if (storage.mode === "reject") return false;
      storage.value = clone(value);
      return storage.mode === "commit";
    }),
    storageRead: vi.fn(() => storage.mode === "unknown-after-write"
      ? { status: "unavailable" }
      : { status: "ok", value: clone(storage.value) }),
  };
  return { game, storage };
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => vi.useRealTimers());

describe("first-clear-only completion coins", () => {
  it("defines a fixed first-clear reward and no replay reward", () => {
    expect(FIRST_CLEAR_COIN_REWARD).toBe(40);
    expect(getCompletionCoinReward(true)).toBe(40);
    expect(getCompletionCoinReward(false)).toBe(0);
  });

  it("settles 40 then 0 for all 200 levels regardless of their historical reward metadata", () => {
    expect(LEVELS).toHaveLength(200);
    expect(new Set(LEVELS.map((level) => level.reward)).size).toBeGreaterThan(1);
    for (const level of LEVELS) {
      const { game } = settlementGame(level.id);
      const first = game.createPendingSettlement();
      expect(first.presentation.coinReward, `Lv${level.id} first clear`).toBe(40);
      expect(first.candidateSave.coins).toBe(1274);
      expect(first.candidateSave.rewardedLevels).toEqual([level.id]);
      expect(game.save.coins).toBe(1234);
      expect(game.save.rewardedLevels).toEqual([]);
      game.save = first.candidateSave;
      const repeat = game.createPendingSettlement();
      expect(repeat.presentation.coinReward, `Lv${level.id} replay`).toBe(0);
      expect(repeat.candidateSave.coins).toBe(1274);
      expect(repeat.candidateSave.rewardedLevels).toEqual([level.id]);
    }
  });

  it("does not repay coins when a replay improves stars, while awarding the new inspiration", () => {
    const { game } = settlementGame(21);
    const initialInspiration = game.save.collectionProgress.inspiration;
    game.completionMetrics = { moves: 99_999, elapsedSeconds: 99_999 };
    const first = game.createPendingSettlement();
    expect(first.presentation.earnedStars).toBe(1);
    expect(first.candidateSave.collectionProgress.inspiration).toBe(initialInspiration + 1);
    expect(first.candidateSave.coins).toBe(1274);
    game.save = first.candidateSave;
    game.completionMetrics = { moves: 1, elapsedSeconds: 1 };
    const improved = game.createPendingSettlement();
    expect(improved.presentation.earnedStars).toBe(3);
    expect(improved.presentation.coinReward).toBe(0);
    expect(improved.candidateSave.coins).toBe(1274);
    expect(improved.candidateSave.bestStars["21"]).toBe(3);
    expect(improved.candidateSave.bestMoves["21"]).toBe(1);
    expect(improved.candidateSave.collectionProgress.inspiration).toBe(initialInspiration + 3);
    game.save = improved.candidateSave;
    expect(game.createPendingSettlement().candidateSave.collectionProgress.inspiration).toBe(initialInspiration + 3);
  });

  it("preserves chapter inspiration, return life, progress and independent reward records", () => {
    const { game } = settlementGame(20);
    const before = clone(game.save);
    const { candidateSave: after, presentation } = game.createPendingSettlement();
    expect(presentation.coinReward).toBe(40);
    expect(after.collectionProgress.inspiration - before.collectionProgress.inspiration).toBe(5);
    expect(after.lifeState.lives).toBe(5);
    expect(after.highestLevel).toBe(21);
    expect(after.currentLevel).toBe(21);
    expect(after.journeyProgress).toEqual(before.journeyProgress);
    expect(after.achievementProgress).toEqual(before.achievementProgress);
    expect(after.boosters).toEqual(before.boosters);
    expect(after.dailyTaskProgress.tasks.map((task: any) => task.claimed))
      .toEqual(before.dailyTaskProgress.tasks.map((task: any) => task.claimed));
    expect(game.save).toEqual(before);
  });

  it("does not turn zero replay coins into zero return lives or suppress normal result records", () => {
    const { game } = settlementGame(20, { highestLevel: 21, rewardedLevels: [20], bestStars: { "20": 3 } });
    const before = clone(game.save);
    const { candidateSave: after, presentation } = game.createPendingSettlement();
    expect(presentation.coinReward).toBe(0);
    expect(after.coins).toBe(before.coins);
    expect(after.lifeState.lives).toBe(5);
    expect(after.collectionProgress.inspiration).toBe(before.collectionProgress.inspiration);
    expect(after.bestMoves["20"]).toBe(1);
    expect(after.highestLevel).toBe(21);
    expect(after.currentLevel).toBe(20);
  });

  it("keeps assisted clears eligible without awarding an assisted best-move record", () => {
    const { game } = settlementGame(21, {
      activeRun: {
        levelId: 21, returnLevelId: 21, lifeStarted: true, daily: false,
        boosterSpent: { time: 0, rocket: 1, pulse: 0 },
      },
    });
    const pending = game.createPendingSettlement();
    expect(pending.presentation.assistedClear).toBe(true);
    expect(pending.presentation.coinReward).toBe(40);
    expect(pending.candidateSave.bestMoves["21"]).toBeUndefined();
    expect(pending.candidateSave.activeRun).toBeUndefined();
  });
});

describe("completion coin save compatibility", () => {
  it("keeps existing balances and explicit first-clear records across reload", () => {
    const { game } = settlementGame(21, { coins: 9876, highestLevel: 80, rewardedLevels: [21] });
    expect(game.save.coins).toBe(9876);
    const reloaded = game.sanitizeSave(clone(game.save));
    expect(reloaded.coins).toBe(9876);
    expect(reloaded.rewardedLevels).toEqual([21]);
    game.save = reloaded;
    expect(game.createPendingSettlement().presentation.coinReward).toBe(0);
  });

  it("uses the existing highestLevel minus one migration only when rewardedLevels is absent", () => {
    const { game } = settlementGame(21, { highestLevel: 22, rewardedLevels: undefined, coins: 7654 });
    expect(game.save.rewardedLevels).toEqual(Array.from({ length: 21 }, (_, index) => index + 1));
    const pending = game.createPendingSettlement();
    expect(pending.presentation.coinReward).toBe(0);
    expect(pending.candidateSave.coins).toBe(7654);
  });

  it("keeps an explicit empty record authoritative instead of inventing cleared levels", () => {
    const { game } = settlementGame(21, { highestLevel: 22, rewardedLevels: [] });
    expect(game.save.rewardedLevels).toEqual([]);
    expect(game.createPendingSettlement().presentation.coinReward).toBe(40);
  });

  it("distinguishes final-level first clear and replay even though highestLevel stays 200", () => {
    const { game, storage } = settlementGame(200);
    game.beginCelebration();
    expect(game.save.highestLevel).toBe(200);
    expect(game.save.coins).toBe(1274);
    expect(game.winCoinReward).toBe(40);
    expect(game.playSound.mock.calls.filter(([kind]: [string]) => kind === "gold")).toHaveLength(1);
    game.save = game.sanitizeSave(clone(storage.value));
    expect(game.save.highestLevel).toBe(200);
    game.beginCelebration();
    expect(game.winCoinReward).toBe(0);
    expect(game.save.coins).toBe(1274);
    expect(game.save.rewardedLevels).toEqual([200]);
    expect(storage.value.coins).toBe(1274);
    expect(game.playSound.mock.calls.filter(([kind]: [string]) => kind === "gold")).toHaveLength(1);
  });
});

describe("completion coin transaction retries", () => {
  it("plays the shared claim recording for inspiration-only improvement, but not a zero-reward replay", () => {
    const { game } = settlementGame(21, { highestLevel: 22, rewardedLevels: [21], bestStars: { "21": 1 } });
    const before = clone(game.save);
    game.beginCelebration();
    expect(game.save.coins).toBe(before.coins);
    expect(game.save.collectionProgress.inspiration).toBe(before.collectionProgress.inspiration + 2);
    expect(game.playSound.mock.calls.filter(([kind]: [string]) => kind === "gold")).toHaveLength(1);
    const rewarded = clone(game.save);
    game.beginCelebration();
    expect(game.save.coins).toBe(rewarded.coins);
    expect(game.save.collectionProgress.inspiration).toBe(rewarded.collectionProgress.inspiration);
    expect(game.playSound.mock.calls.filter(([kind]: [string]) => kind === "gold")).toHaveLength(1);
  });

  it.each([false, true])("retries rejected writes with the identical candidate (already cleared: %s)", (replay) => {
    const { game, storage } = settlementGame(21, { rewardedLevels: replay ? [21] : [] });
    const before = clone(game.save);
    storage.mode = "reject";
    game.beginCelebration();
    const pending = game.pendingSettlement;
    const frozenCandidate = clone(pending.candidateSave);
    expect(game.screen).toBe("settlementFailed");
    expect(game.settlementFailureKind).toBe("rejected");
    expect(game.save).toEqual(before);
    expect(storage.value).toEqual(before);
    expect(game.winCoinReward).toBeUndefined();
    expect(pending.presentation.coinReward).toBe(replay ? 0 : 40);
    expect(game.playSound).not.toHaveBeenCalledWith("gold");
    storage.mode = "commit";
    game.beginCelebration();
    expect(game.host.storageSet.mock.calls[1][1]).toBe(pending.candidateSave);
    expect(game.save).toEqual(frozenCandidate);
    expect(storage.value).toEqual(frozenCandidate);
    expect(game.save.coins).toBe(1234 + (replay ? 0 : 40));
    expect(game.save.lifeState.lives).toBe(5);
    expect(game.save.rewardedLevels).toEqual([21]);
    expect(game.winCoinReward).toBe(replay ? 0 : 40);
    expect(game.pendingSettlement).toBeUndefined();
    expect(game.settlementSaveAttempts).toBe(2);
    // Even the replay fixture earns its previously missing star inspiration.
    expect(game.playSound.mock.calls.filter(([kind]: [string]) => kind === "gold")).toHaveLength(1);
  });

  it.each([false, true])("resolves an unknown landed write without adding coins twice (already cleared: %s)", (replay) => {
    const { game, storage } = settlementGame(21, { rewardedLevels: replay ? [21] : [] });
    storage.mode = "unknown-after-write";
    game.beginCelebration();
    const pending = game.pendingSettlement;
    const landedCandidate = clone(storage.value);
    expect(game.settlementFailureKind).toBe("unknown");
    expect(game.save.coins).toBe(1234);
    expect(game.winCoinReward).toBeUndefined();
    expect(landedCandidate.coins).toBe(1234 + (replay ? 0 : 40));
    expect(game.playSound).not.toHaveBeenCalledWith("gold");
    storage.mode = "commit";
    game.beginCelebration();
    expect(game.host.storageSet.mock.calls[1][1]).toBe(pending.candidateSave);
    expect(game.save).toEqual(landedCandidate);
    expect(storage.value).toEqual(landedCandidate);
    expect(game.winCoinReward).toBe(replay ? 0 : 40);
    const reloaded = settlementGame(21, clone(storage.value));
    expect(reloaded.game.createPendingSettlement().presentation.coinReward).toBe(0);
    expect(game.playSound.mock.calls.filter(([kind]: [string]) => kind === "gold")).toHaveLength(1);
  });

  it("recognizes an exact persisted candidate when the storage write acknowledgement is lost", () => {
    const { game, storage } = settlementGame(21);
    storage.mode = "lost-ack";
    game.beginCelebration();
    expect(game.host.storageRead).toHaveBeenCalledTimes(1);
    expect(game.settlementSaveFailed).toBe(false);
    expect(game.pendingSettlement).toBeUndefined();
    expect(game.save.coins).toBe(1274);
    expect(game.winCoinReward).toBe(40);
    expect(storage.value.rewardedLevels).toEqual([21]);
    expect(game.playSound.mock.calls.filter(([kind]: [string]) => kind === "gold")).toHaveLength(1);
  });

  it("freezes unrelated unlimited-life eligibility at candidate creation during retry", () => {
    const { game, storage } = settlementGame(21, {
      lifeState: { lives: 4, nextLifeAtMs: NOW + 1_800_000, unlimitedLivesUntilMs: NOW + 1000 },
    });
    storage.mode = "reject";
    game.beginCelebration();
    const pending = game.pendingSettlement;
    expect(pending.candidateSave.lifeState.lives).toBe(4);
    vi.setSystemTime(NOW + 2000);
    storage.mode = "commit";
    game.beginCelebration();
    expect(game.save).toBe(pending.candidateSave);
    expect(game.save.coins).toBe(1274);
    expect(game.save.lifeState.lives).toBe(4);
  });
});
