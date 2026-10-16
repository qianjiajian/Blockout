import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MASTERPIECE_COLLECTION_CATALOG } from "../src/core/collectionCatalog";
import { DAILY_CHALLENGE_REWARDS } from "../src/core/dailyChallenge";
import { LEVELS } from "../src/core/levels";
import { PuzzleModel } from "../src/core/PuzzleModel";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";
import { CountdownWarning } from "../src/game/countdownWarning";

const NOW = new Date("2026-10-08T06:00:00.000Z").getTime();
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const FIRST_MASTERPIECE = MASTERPIECE_COLLECTION_CATALOG.find((item) => item.unlockLevel === 5)!;

/** Settlement-boundary regression: real model, navigation and transactions, memory-only storage.
 * Completion metrics are supplied explicitly; this is not a gameplay-route or Pointer test. */
const completionGame = (levelId = 5, saveOverrides: Record<string, unknown> = {}) => {
  const game = Object.create(ColorEscapeGame.prototype) as any;
  game.countdownWarning = new CountdownWarning();
  game.playableClockSlices = { reset: vi.fn() };
  const defaults = game.sanitizeSave(undefined);
  game.save = game.sanitizeSave({
    ...defaults,
    currentLevel: levelId,
    highestLevel: levelId,
    rewardedLevels: Array.from({ length: levelId - 1 }, (_, index) => index + 1),
    coins: 1234,
    lifeState: { lives: 4, nextLifeAtMs: NOW + 1_800_000, unlimitedLivesUntilMs: 0 },
    activeRun: {
      levelId, returnLevelId: levelId, lifeStarted: true, daily: false,
      boosterSpent: { time: 0, rocket: 0, pulse: 0 },
    },
    ...saveOverrides,
  });
  game.model = new PuzzleModel(LEVELS[levelId - 1]);
  game.completionMetrics = { moves: 1, elapsedSeconds: 1 };
  game.runElapsedSeconds = 1;
  game.screen = "playing";
  game.appVisible = true;
  game.artReady = true;
  game.storageBaselineReady = true;
  game.storageReadAttempts = 0;
  game.settlementSaveAttempts = 0;
  for (const method of [
    "playSound", "vibrate", "scheduleFrame", "emitBurst", "requestWinArt", "releaseWinArt",
    "releaseFormalPageArt", "releaseDailyChallengeArt", "releaseCollectionAlbumArt",
    "releaseAchievementArt", "cancelDailyTaskRefreshWatch", "releaseDailyTaskArt",
    "captureInitialGeneratorSpawns", "requestCollectionAlbumArtwork",
  ]) game[method] = vi.fn();
  game.homeCoinTarget = () => ({ x: 150, y: 50 });
  const loadLevel = vi.spyOn(game, "loadLevel");
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
  return { game, storage, loadLevel };
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("early campaign completion navigation", () => {
  it.each([1, 2, 3, 4])("keeps level %s on the direct next-level flow after committed settlement", (levelId) => {
    const { game, storage, loadLevel } = completionGame(levelId);
    game.beginCelebration();
    expect(game.screen).toBe("playing");
    expect(game.directLevelTransition).toMatchObject({ fromLevel: levelId, toLevel: levelId + 1, switched: false });
    expect(game.save.currentLevel).toBe(levelId + 1);
    expect(game.save.coins).toBe(1274);
    expect(storage.value.rewardedLevels).toContain(levelId);
    expect(game.requestWinArt).not.toHaveBeenCalled();
    expect(game.homeCoinFlight).toBeUndefined();
    expect(game.collectionIntro).toBeUndefined();
    game.updateDirectLevelTransition(2);
    expect(loadLevel).toHaveBeenCalledWith(levelId + 1, true, true);
    expect(game.model.level.id).toBe(levelId + 1);
    expect(game.model.snapshot().started).toBe(false);
    expect(game.model.snapshot().moves).toBe(0);
    expect(game.save.activeRun).toMatchObject({ levelId: levelId + 1, lifeStarted: false, daily: false });
    expect(game.save.lifeState.lives).toBe(5);
    expect(game.screen).not.toBe("home");
    expect(game.screen).not.toBe("win");
  });

  it("returns a first level-5 clear to Home with level 6 available and exactly one reward", () => {
    const { game, storage, loadLevel } = completionGame();
    const boostersBefore = clone(game.save.boosters);
    game.beginCelebration();
    expect(loadLevel).toHaveBeenCalledExactlyOnceWith(6, false);
    expect(game.screen).toBe("home");
    expect(game.model.level.id).toBe(6);
    expect(game.model.snapshot().started).toBe(false);
    expect(game.model.snapshot().moves).toBe(0);
    expect(game.save).toMatchObject({
      currentLevel: 6, highestLevel: 6, coins: 1274,
      rewardedLevels: [1, 2, 3, 4, 5], collectionIntroPending: true, collectionIntroShown: false,
    });
    expect(game.save.bestStars["5"]).toBe(3);
    expect(game.save.lifeState.lives).toBe(5);
    expect(game.save.boosters).toEqual(boostersBefore);
    expect(game.save.activeRun).toBeUndefined();
    expect(game.pendingSettlement).toBeUndefined();
    expect(game.directLevelTransition).toBeUndefined();
    expect(game.requestWinArt).not.toHaveBeenCalled();
    expect(game.homeCoinFlight).toMatchObject({ kind: "coins", reward: 40, startCoins: 1234, endCoins: 1274 });
    expect(storage.value).toEqual(clone(game.save));

    // Existing collection introduction waits until the earned coins arrive.
    expect(game.beginCollectionIntro()).toBe(false);
    game.updateHomeCoinFlight(10);
    expect(game.homeCoinFlight).toBeUndefined();
    expect(game.collectionIntro).toEqual({ level: 5, itemId: FIRST_MASTERPIECE.id, age: 0 });
    expect(game.requestCollectionAlbumArtwork).toHaveBeenCalledOnce();
    expect(game.save.collectionIntroPending).toBe(true);
    expect(game.save.collectionIntroShown).toBe(false);
    expect(game.save.collectionProgress.restoredMasterpieceIds).toEqual([]);
    expect(game.save.coins).toBe(1274);
  });

  it.each(["reject", "unknown-after-write"] as const)("does not leave level 5 early on %s and retries the same reward candidate", (mode) => {
    const { game, storage, loadLevel } = completionGame();
    const before = clone(game.save);
    storage.mode = mode;
    game.beginCelebration();
    const pending = game.pendingSettlement;
    const candidate = clone(pending.candidateSave);
    expect(game.screen).toBe("settlementFailed");
    expect(game.settlementFailureKind).toBe(mode === "reject" ? "rejected" : "unknown");
    expect(game.save).toEqual(before);
    expect(game.model.level.id).toBe(5);
    expect(game.homeCoinFlight).toBeUndefined();
    expect(game.collectionIntro).toBeUndefined();
    expect(loadLevel).not.toHaveBeenCalled();
    expect(pending.presentation.coinReward).toBe(40);
    expect(storage.value).toEqual(mode === "reject" ? before : candidate);

    storage.mode = "commit";
    game.beginCelebration();
    expect(game.host.storageSet.mock.calls[1][1]).toBe(pending.candidateSave);
    expect(loadLevel).toHaveBeenCalledExactlyOnceWith(6, false);
    expect(game.screen).toBe("home");
    expect(game.save).toEqual(pending.candidateSave);
    expect(storage.value).toEqual(candidate);
    expect(game.save.coins).toBe(1274);
    expect(game.save.lifeState.lives).toBe(5);
    expect(game.save.rewardedLevels.filter((id: number) => id === 5)).toHaveLength(1);
    expect(game.homeCoinFlight.reward).toBe(40);
    expect(game.pendingSettlement).toBeUndefined();

    const reloaded = completionGame(5, storage.value).game;
    reloaded.beginCelebration();
    expect(reloaded.screen).toBe("win");
    expect(reloaded.winCoinReward).toBe(0);
    expect(reloaded.save.coins).toBe(1274);
  });

  it("accepts exact read-back after lost write acknowledgement before returning Home", () => {
    const { game, storage, loadLevel } = completionGame();
    storage.mode = "lost-ack";
    game.beginCelebration();
    expect(game.host.storageRead).toHaveBeenCalledOnce();
    expect(loadLevel).toHaveBeenCalledExactlyOnceWith(6, false);
    expect(game.screen).toBe("home");
    expect(game.save.coins).toBe(1274);
    expect(storage.value.coins).toBe(1274);
    expect(game.pendingSettlement).toBeUndefined();
  });

  it("keeps a replay of level 5 on the result screen without another reward or introduction", () => {
    const { game, loadLevel } = completionGame(5, {
      highestLevel: 6, rewardedLevels: [1, 2, 3, 4, 5],
      collectionIntroShown: true, collectionIntroPending: false,
    });
    game.beginCelebration();
    expect(game.screen).toBe("win");
    expect(game.winCoinReward).toBe(0);
    expect(game.save.coins).toBe(1234);
    expect(game.save.collectionIntroPending).toBe(false);
    expect(game.save.collectionIntroShown).toBe(true);
    expect(game.collectionIntro).toBeUndefined();
    expect(game.homeCoinFlight).toBeUndefined();
    expect(loadLevel).not.toHaveBeenCalled();
    expect(game.requestWinArt).toHaveBeenCalledOnce();
  });

  it("keeps later-level first clears on the result screen", () => {
    const { game, loadLevel } = completionGame(6);
    game.beginCelebration();
    expect(game.screen).toBe("win");
    expect(game.winCoinReward).toBe(40);
    expect(game.save.currentLevel).toBe(7);
    expect(loadLevel).not.toHaveBeenCalled();
  });

  it("does not take over a temporary level-5 test session", () => {
    const { game, loadLevel } = completionGame();
    game.temporaryLevelTestSession = { baselineLevelId: 5 };
    game.beginCelebration();
    expect(game.screen).toBe("win");
    expect(loadLevel).not.toHaveBeenCalled();
    expect(game.homeCoinFlight).toBeUndefined();
  });

  it("uses daily settlement instead of campaign level-5 navigation even when its source ID is 5", () => {
    const { game, storage, loadLevel } = completionGame();
    game.save.activeRun = {
      levelId: 5, returnLevelId: 5, lifeStarted: false, daily: true,
      dailyChallengeDifficulty: 1, dailyChallengeSourceLevelId: 5,
      dailyDayKey: game.save.dailyChallenge.dayKey,
      boosterSpent: { time: 0, rocket: 0, pulse: 0 },
    };
    storage.value = clone(game.save);
    const before = clone(game.save);
    game.beginCelebration();
    expect(game.screen).toBe("win");
    expect(game.dailyChallengeWin).toMatchObject({ difficulty: 1, coins: DAILY_CHALLENGE_REWARDS[1].coins });
    expect(game.save.coins).toBe(before.coins + DAILY_CHALLENGE_REWARDS[1].coins);
    expect(game.save.dailyChallenge.completed[1]).toBe(true);
    for (const key of ["currentLevel", "highestLevel", "rewardedLevels", "bestStars", "lifeState", "collectionIntroPending", "collectionIntroShown"]) {
      expect(game.save[key], key).toEqual(before[key]);
    }
    expect(loadLevel).not.toHaveBeenCalled();
    expect(game.homeCoinFlight).toBeUndefined();
    expect(game.collectionIntro).toBeUndefined();
  });
});
