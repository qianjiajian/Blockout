import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MASTERPIECE_COLLECTION_CATALOG } from "../src/core/collectionCatalog";
import { collectionInspirationForResult } from "../src/core/collectionProgress";
import { LEVELS } from "../src/core/levels";
import { PuzzleModel } from "../src/core/PuzzleModel";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";
import { SUPPLIED_REVEAL_ART } from "../src/game/artManifest";
import { CountdownWarning } from "../src/game/countdownWarning";
import { PopupEntranceController } from "../src/game/popupEntrance";

const NOW = new Date("2026-10-10T04:00:00.000Z").getTime();
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const completed = (count: number) => Array.from({ length: count }, (_, index) => index + 1);
const masterpiece = (level: number) => MASTERPIECE_COLLECTION_CATALOG.find(item => item.unlockLevel === level)!;

/** Real settlement, persistence and restoration paths with a real puzzle model.
 * Metrics are injected at the completed-run boundary; this is not a route certificate. */
function settlementGame(levelId = 10, overrides: Record<string, unknown> = {}) {
  const game = Object.create(ColorEscapeGame.prototype) as any;
  game.countdownWarning = new CountdownWarning();
  game.popupEntrance = new PopupEntranceController();
  game.playableClockSlices = { reset: vi.fn() };
  const defaults = game.sanitizeSave(undefined);
  game.save = game.sanitizeSave({
    ...defaults, currentLevel: levelId, highestLevel: levelId, coins: 1234,
    rewardedLevels: completed(levelId - 1),
    collectionIntroShown: true, collectionIntroPending: false,
    collectionProgress: { ...defaults.collectionProgress, inspiration: 80 },
    lifeState: { lives: 4, nextLifeAtMs: NOW + 1_800_000, unlimitedLivesUntilMs: 0 },
    activeRun: { levelId, returnLevelId: levelId, lifeStarted: true, daily: false,
      boosterSpent: { time: 0, rocket: 0, pulse: 0 } },
    ...overrides,
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
    "releaseFormalPageArt", "releaseDailyChallengeArt", "releaseCollectionAlbumArt", "releaseAchievementArt",
    "cancelDailyTaskRefreshWatch", "releaseDailyTaskArt", "captureInitialGeneratorSpawns", "requestCollectionAlbumArtwork",
    "requestJourneyHomeThemeArt",
  ]) game[method] = vi.fn();
  game.homeCoinTarget = () => ({ x: 150, y: 50 });
  const storage = { value: clone(game.save), mode: "commit" as "commit" | "reject" | "unknown-written" };
  game.host = {
    storageSet: vi.fn((_key: string, value: unknown) => {
      if (storage.mode === "reject") return false;
      storage.value = clone(value);
      return storage.mode === "commit";
    }),
    storageRead: vi.fn(() => storage.mode === "unknown-written"
      ? { status: "unavailable" } : { status: "ok", value: clone(storage.value) }),
  };
  return { game, storage };
}

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe("masterpiece unlock progress at the real settlement boundary", () => {
  it.each([
    [9, 10, 3, 4, 1, false],
    [10, 10, 4, 5, 0, true],
    [11, 15, 0, 1, 4, false],
  ] as const)("Lv%s presents the existing unlock threshold without granting ownership", (level, target, previous, current, remaining, justUnlocked) => {
    const { game, storage } = settlementGame(level);
    const before = clone(game.save);
    game.beginCelebration();
    expect(game.screen).toBe("win");
    expect(game.masterpieceUnlockPresentation).toMatchObject({ age: 0, progress: {
      targetId: masterpiece(target).id, previous, current, total: 5, remaining, justUnlocked, allUnlocked: false,
    } });
    expect(game.save.collectionProgress.inspiration).toBe(before.collectionProgress.inspiration
      + collectionInspirationForResult(level, 0, game.earnedStars, true));
    expect(game.save.collectionProgress.restoredMasterpieceIds).toEqual(before.collectionProgress.restoredMasterpieceIds);
    expect(game.save.collectionProgress.seenItemIds).toEqual(before.collectionProgress.seenItemIds);
    expect(game.collectionIntro).toBeUndefined();
    expect(storage.value).toEqual(game.save);
    expect(game.host.storageSet).toHaveBeenCalledTimes(1);
    expect(Object.keys(game.save).some(key => key.startsWith("masterpieceUnlock"))).toBe(false);
  });

  it.each(["reject", "unknown-written"] as const)("waits for confirmation after %s and retries the identical result", mode => {
    const { game, storage } = settlementGame(10);
    const before = clone(game.save);
    storage.mode = mode;
    game.beginCelebration();
    const pending = game.pendingSettlement, candidate = clone(pending.candidateSave);
    expect(game.screen).toBe("settlementFailed");
    expect(game.masterpieceUnlockPresentation).toBeUndefined();
    expect(game.save).toEqual(before);
    expect(game.collectionIntro).toBeUndefined();
    storage.mode = "commit";
    game.beginCelebration();
    expect(game.save).toEqual(candidate);
    expect(game.masterpieceUnlockPresentation.progress).toMatchObject({ targetId: masterpiece(10).id, previous: 4, current: 5, justUnlocked: true });
    expect(game.pendingSettlement).toBeUndefined();
    const writes = game.host.storageSet.mock.calls;
    expect(writes[0][1]).toBe(pending.candidateSave);
    expect(writes).toHaveLength(2);
    // persistVerified writes first, then reads only if acknowledgement fails.
    // Retrying the same candidate is idempotent; rewards must not be recomputed.
    expect(writes[1][1]).toBe(pending.candidateSave);
    expect(writes.every((write: unknown[]) => write[1] === pending.candidateSave)).toBe(true);
    expect(game.save.collectionProgress.restoredMasterpieceIds).toEqual([]);
    expect(game.save.collectionProgress.inspiration).toBe(candidate.collectionProgress.inspiration);
  });

  it("does not add progress, inspiration or ownership when a completed threshold is replayed", () => {
    const { game } = settlementGame(10, { highestLevel: 11, rewardedLevels: completed(10), bestStars: { "10": 3 } });
    const before = clone(game.save);
    game.beginCelebration();
    expect(game.masterpieceUnlockPresentation.progress).toMatchObject({
      targetId: masterpiece(15).id, previous: 0, current: 0, remaining: 5, justUnlocked: false,
    });
    expect(game.save.collectionProgress).toEqual(before.collectionProgress);
    expect(game.save.coins).toBe(before.coins);
  });

  it("shows the terminal state without granting all already-unlocked masterpieces", () => {
    const { game } = settlementGame(200, { rewardedLevels: completed(200), bestStars: { "200": 3 } });
    game.beginCelebration();
    expect(game.masterpieceUnlockPresentation.progress).toMatchObject({ allUnlocked: true, justUnlocked: false, remaining: 0 });
    expect(game.masterpieceUnlockPresentation.progress.targetId).toBeUndefined();
    expect(game.save.collectionProgress.restoredMasterpieceIds).toEqual([]);
  });

  it("preserves the first Lv5 Home reward/reveal route rather than introducing a win popup", () => {
    const { game } = settlementGame(5, { collectionIntroShown: false });
    game.beginCelebration();
    expect(game.screen).toBe("home");
    expect(game.homeCoinFlight).toBeDefined();
    expect(game.masterpieceUnlockPresentation).toBeUndefined();
    expect(game.save.collectionIntroPending).toBe(true);
    expect(game.save.collectionProgress.restoredMasterpieceIds).toEqual([]);
  });

  it.each(["daily", "temporary", "league"] as const)("does not present campaign progress for %s", mode => {
    const { game, storage } = settlementGame(10);
    if (mode === "daily") {
      game.save.activeRun = { ...game.save.activeRun, daily: true, dailyChallengeDifficulty: 1,
        dailyChallengeSourceLevelId: 10, dailyDayKey: game.save.dailyChallenge.dayKey };
      storage.value = clone(game.save);
    } else if (mode === "temporary") game.temporaryLevelTestSession = { baselineLevelId: 10 };
    else { game.leagueRun = {}; game.finishLeaguePrototype = vi.fn(); }
    game.beginCelebration();
    expect(game.masterpieceUnlockPresentation).toBeUndefined();
    if (mode === "league") expect(game.finishLeaguePrototype).toHaveBeenCalledTimes(1);
  });

  it("pauses progress while hidden or art is loading, and reduces motion to its terminal value", () => {
    const { game } = settlementGame(10);
    game.beginCelebration();
    const saved = clone(game.save), writes = game.host.storageSet.mock.calls.length;
    game.updateMasterpieceUnlockPresentation(5);
    expect(game.masterpieceUnlockPresentation.age).toBe(0);
    game.winArt = {};
    game.appVisible = false;
    game.updateMasterpieceUnlockPresentation(5);
    expect(game.masterpieceUnlockPresentation.age).toBe(0);
    game.appVisible = true;
    game.updateMasterpieceUnlockPresentation(0.2);
    expect(game.masterpieceUnlockPresentation.age).toBeCloseTo(0.2);
    game.save.reducedMotion = true;
    game.updateMasterpieceUnlockPresentation(0);
    expect(game.masterpieceUnlockPresentation.age).toBeCloseTo(1.25);
    expect(game.collectionIntro?.unlockPreview).toBe(true);
    game.save.reducedMotion = saved.reducedMotion;
    expect(game.save).toEqual(saved);
    expect(game.host.storageSet).toHaveBeenCalledTimes(writes);
  });

  it("reveals a filled target once, without a charge, grant or acknowledgement write", () => {
    const { game, storage } = settlementGame(10);
    game.beginCelebration();
    game.winArt = {};
    const saved = clone(game.save), stored = clone(storage.value), writes = game.host.storageSet.mock.calls.length;
    game.updateMasterpieceUnlockPresentation(0.92);
    expect(game.collectionIntro).toBeUndefined();
    game.updateMasterpieceUnlockPresentation(0.33);
    expect(game.collectionIntro).toEqual({ level: 10, itemId: masterpiece(10).id, age: 0, unlockPreview: true });
    expect(game.masterpieceUnlockPresentation.revealShown).toBe(true);
    expect(game.screen).toBe("win");
    expect(game.save).toEqual(saved);
    expect(storage.value).toEqual(stored);
    expect(game.host.storageSet).toHaveBeenCalledTimes(writes);
    game.updateCollectionIntro(10);
    expect(game.collectionIntro.age).toBe(0);
    game.collectionAlbumArtwork = { image: () => ({}) };
    // This completed-load fixture also needs the new decoded popup decorations.
    const painting = Object.fromEntries(Object.entries(SUPPLIED_REVEAL_ART.painting)
      .map(([key, src]) => [key, { src }]));
    game.suppliedRevealArt = {
      imageGroup: vi.fn((group: string) => group === "painting" ? painting : undefined),
      request: vi.fn(), failed: vi.fn(() => false), dispose: vi.fn(),
    };
    game.appVisible = false;
    game.updateCollectionIntro(10);
    expect(game.collectionIntro.age).toBe(0);
    game.appVisible = true;
    game.updateCollectionIntro(10);
    expect(game.collectionIntroReady()).toBe(true);
    game.finishCollectionIntro(true);
    expect(game.collectionIntro).toBeUndefined();
    expect(game.screen).toBe("win");
    expect(game.masterpieceUnlockPresentation.progress.justUnlocked).toBe(true);
    game.updateMasterpieceUnlockPresentation(10);
    expect(game.beginMasterpieceUnlockPreview()).toBe(false);
    expect(game.collectionIntro).toBeUndefined();
    expect(game.save).toEqual(saved);
    expect(game.host.storageSet).toHaveBeenCalledTimes(writes);
  });

  it("allows a pending preview to open early, but never for unfilled or replay progress", () => {
    const { game } = settlementGame(10);
    game.beginCelebration(); game.winArt = {};
    expect(game.beginMasterpieceUnlockPreview()).toBe(true);
    expect(game.collectionIntro.unlockPreview).toBe(true);
    for (const level of [9, 11]) {
      const other = settlementGame(level).game;
      other.beginCelebration(); other.winArt = {};
      expect(other.beginMasterpieceUnlockPreview()).toBe(false);
      expect(other.collectionIntro).toBeUndefined();
    }
  });

  it("still requires a separate confirmed 50-inspiration restoration before the flip", () => {
    const { game, storage } = settlementGame(10);
    game.beginCelebration();
    const item = masterpiece(10), balance = game.save.collectionProgress.inspiration;
    expect(game.collectionIntro).toBeUndefined();
    game.screen = "records";
    game.collectionAlbumDetailId = item.id;
    storage.mode = "reject";
    game.activateCollectionAlbumDetail();
    expect(game.save.collectionProgress.inspiration).toBe(balance);
    expect(game.collectionIntro).toBeUndefined();
    storage.mode = "unknown-written";
    game.activateCollectionAlbumDetail();
    const pending = game.pendingCollectionRestoration;
    expect(pending).toBeDefined();
    expect(game.save.collectionProgress.inspiration).toBe(balance);
    expect(game.collectionIntro).toBeUndefined();
    storage.mode = "commit";
    game.activateCollectionAlbumDetail();
    expect(game.save).toBe(pending.candidateSave);
    expect(game.save.collectionProgress.inspiration).toBe(balance - 50);
    expect(game.save.collectionProgress.restoredMasterpieceIds).toEqual([item.id]);
    expect(game.collectionIntro).toEqual({ level: 10, itemId: item.id, age: 0, restoration: true });
    const writes = game.host.storageSet.mock.calls.length;
    game.activateCollectionAlbumDetail();
    expect(game.save.collectionProgress.inspiration).toBe(balance - 50);
    expect(game.host.storageSet).toHaveBeenCalledTimes(writes);
  });
});
