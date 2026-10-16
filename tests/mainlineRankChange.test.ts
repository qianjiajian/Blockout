import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clonePlainData as clone } from "../src/core/clonePlainData";
import { isFeatureUnlocked } from "../src/core/featureUnlocks";
import { LEVELS } from "../src/core/levels";
import { buildMetaLeaderboard, PLACEHOLDER_META_LEADERBOARD_SOURCE } from "../src/core/metaLeaderboard";
import { PuzzleModel } from "../src/core/PuzzleModel";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";
import { CountdownWarning } from "../src/game/countdownWarning";
import { SUPPLIED_RANK_ART } from "../src/game/artManifest";
import { PopupEntranceController } from "../src/game/popupEntrance";
import { HOME_ART_LAYOUT } from "../src/game/homeArtLayout";
import { WIN_SETTLEMENT_LAYOUT } from "../src/game/winSettlementLayout";

const NOW = new Date("2026-10-09T06:00:00.000Z").getTime();

/** Real completion, ranking and verified save transactions, with memory storage.
 * Completion metrics and loaded image objects are fixtures, not a solved route
 * or browser-rendering claim. */
function rankGame(levelId = 7, saveOverrides: Record<string, unknown> = {}) {
  const game = Object.create(ColorEscapeGame.prototype) as any;
  game.countdownWarning = new CountdownWarning();
  game.popupEntrance = new PopupEntranceController();
  game.playableClockSlices = { reset: vi.fn() };
  game.save = game.sanitizeSave({
    ...game.sanitizeSave(undefined),
    currentLevel: levelId,
    highestLevel: levelId,
    rewardedLevels: Array.from({ length: levelId - 1 }, (_, i) => i + 1),
    bestStars: Object.fromEntries(Array.from({ length: levelId - 1 }, (_, i) => [String(i + 1), 3])),
    coins: 1234,
    collectionIntroShown: true,
    collectionIntroPending: false,
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
  const rankArt = Object.fromEntries(Object.entries(SUPPLIED_RANK_ART)
    .map(([key, src]) => [key, { src }]));
  game.winArt = {
    ...Object.fromEntries(["panel", "glow", "rewardPill", "coinPile", "continueButton", "close"]
      .map(key => [key, { src: `fixture:win/${key}` }])),
    suppliedRank: rankArt,
  };
  game.storageBaselineReady = true;
  game.storageReadAttempts = 0;
  game.settlementSaveAttempts = 0;
  game.art = { home: { src: "home" }, homeUi: {} };
  game.leagueScroll = { end: vi.fn(() => false) };
  game.viewportTransform = () => ({ scale: 1, offsetX: 0, offsetY: 0 });
  game.safeOffsets = () => ({ top: 0, bottom: 0 });
  game.leaderboardSource = PLACEHOLDER_META_LEADERBOARD_SOURCE;
  for (const method of [
    "playSound", "vibrate", "scheduleFrame", "emitBurst", "requestWinArt",
    "releaseFormalPageArt", "releaseDailyChallengeArt", "releaseCollectionAlbumArt",
    "releaseAchievementArt", "cancelDailyTaskRefreshWatch", "releaseDailyTaskArt",
    "captureInitialGeneratorSpawns", "requestCollectionAlbumArtwork", "requestJourneyHomeThemeArt",
  ]) game[method] = vi.fn();
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
      ? { status: "unavailable" } : { status: "ok", value: clone(storage.value) }),
    releaseImage: vi.fn(),
    music: vi.fn(),
  };
  return { game, storage, rankArt };
}

function worldRank(save: any, nowMs = NOW): number {
  return buildMetaLeaderboard("world", {
    highestLevel: save.highestLevel,
    bestStars: save.bestStars,
    playerId: save.playerProfile.id,
    playerName: save.playerProfile.name,
    playerAvatar: save.playerProfile.avatar,
    playerFrame: save.playerProfile.frame,
    groupCreatedAtMs: save.playerProfile.joinedAt,
    nowMs,
  }).player.rank;
}

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe("mainline rank improvement presentation", () => {
  it.each([4, 5, 6])("does not animate a clear of level %i before the ranking feature was unlocked", levelId => {
    const { game } = rankGame(levelId);
    const pending = game.createPendingSettlement();
    // Even a real rank gain cannot bypass the feature gate.
    expect(worldRank(pending.candidateSave)).toBeLessThan(worldRank(pending.baselineSave));
    expect(game.mainlineRankChangeForSettlement(pending.baselineSave, pending.candidateSave, NOW)).toBeUndefined();
    expect(game.host.storageSet).not.toHaveBeenCalled();
  });

  it("leaves the level-6 unlock celebration to its feature guide, without a rank animation", () => {
    const { game, storage } = rankGame(6);
    expect(isFeatureUnlocked("leaderboard", game.save)).toBe(false);
    game.beginCelebration();
    expect(game.screen).toBe("win");
    expect(isFeatureUnlocked("leaderboard", game.save)).toBe(true);
    expect(game.save.featureGuideProgress.pending).toContain("leaderboard");
    expect(game.mainlineRankChange).toBeUndefined();
    expect(storage.value).toEqual(game.save);
  });

  it("shows the actual world rank gain after an unlocked mainline result is committed", () => {
    const { game, storage } = rankGame();
    const baseline = clone(game.save);
    const calculate = vi.spyOn(game, "mainlineRankChangeForSettlement");
    game.beginCelebration();
    const beforeRank = worldRank(baseline);
    const afterRank = worldRank(game.save);
    expect(afterRank).toBeLessThan(beforeRank);
    expect(calculate).toHaveBeenCalledExactlyOnceWith(baseline, game.save, NOW);
    expect(game.mainlineRankChange).toMatchObject({ beforeRank, afterRank, age: 0, duration: 2.3 });
    expect(game.screen).toBe("win");
    expect(storage.value).toEqual(game.save);
    expect(game.save.coins).toBe(baseline.coins + 40);
    expect(storage.value).not.toHaveProperty("mainlineRankChange");
  });

  it("compares both ranks against the same opponent clock, without mutating either save", () => {
    const { game } = rankGame();
    const pending = game.createPendingSettlement();
    const before = clone(pending);
    const getSnapshot = vi.spyOn(PLACEHOLDER_META_LEADERBOARD_SOURCE, "getSnapshot");
    const clock = NOW + 3_600_000;
    const result = game.mainlineRankChangeForSettlement(pending.baselineSave, pending.candidateSave, clock);
    expect(result).toMatchObject({
      beforeRank: worldRank(pending.baselineSave, clock),
      afterRank: worldRank(pending.candidateSave, clock),
    });
    expect(getSnapshot.mock.calls.slice(0, 2).map(call => [call[0], {
      nowMs: call[2]?.nowMs, groupCreatedAtMs: call[2]?.groupCreatedAtMs,
    }])).toEqual([
      ["world", { nowMs: clock, groupCreatedAtMs: pending.baselineSave.mainlineRanking.epochMs }],
      ["world", { nowMs: clock, groupCreatedAtMs: pending.candidateSave.mainlineRanking.epochMs }],
    ]);
    expect(pending).toEqual(before);
  });

  it("does not replay the animation when a completed level earns no additional stars", () => {
    const { game } = rankGame(7, {
      highestLevel: 8, rewardedLevels: [1, 2, 3, 4, 5, 6, 7],
      bestStars: Object.fromEntries(Array.from({ length: 7 }, (_, i) => [String(i + 1), 3])),
    });
    const beforeRank = worldRank(game.save);
    game.beginCelebration();
    expect(worldRank(game.save)).toBe(beforeRank);
    expect(game.mainlineRankChange).toBeUndefined();
    expect(game.winCoinReward).toBe(0);
  });

  it("allows a replay that improves stars and rank without repaying first-clear coins", () => {
    const bestStars = Object.fromEntries(Array.from({ length: 7 }, (_, i) => [String(i + 1), 3]));
    bestStars["7"] = 1;
    const { game } = rankGame(7, { highestLevel: 8, rewardedLevels: [1, 2, 3, 4, 5, 6, 7], bestStars });
    const beforeRank = worldRank(game.save);
    game.beginCelebration();
    expect(game.mainlineRankChange).toMatchObject({ beforeRank, afterRank: worldRank(game.save) });
    expect(game.mainlineRankChange.afterRank).toBeLessThan(beforeRank);
    expect(game.winCoinReward).toBe(0);
    expect(game.save.coins).toBe(1234);
  });

  it("does not announce an improvement when a first-place player gains more stars", () => {
    const bestStars = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [String(i + 1), 3]));
    bestStars["7"] = 1;
    const { game } = rankGame(7, { highestLevel: 21, bestStars });
    expect(worldRank(game.save)).toBe(1);
    game.beginCelebration();
    expect(game.save.bestStars["7"]).toBe(3);
    expect(worldRank(game.save)).toBe(1);
    expect(game.mainlineRankChange).toBeUndefined();
  });

  it.each(["reject", "unknown-after-write"] as const)("waits on %s and retries the exact settlement before creating an animation", mode => {
    const { game, storage } = rankGame();
    const baseline = clone(game.save);
    const calculate = vi.spyOn(game, "mainlineRankChangeForSettlement");
    storage.mode = mode;
    game.beginCelebration();
    const pending = game.pendingSettlement;
    expect(game.screen).toBe("settlementFailed");
    expect(game.save).toEqual(baseline);
    expect(game.mainlineRankChange).toBeUndefined();
    expect(calculate).not.toHaveBeenCalled();
    expect(storage.value).toEqual(mode === "reject" ? baseline : pending.candidateSave);
    storage.mode = "commit";
    vi.setSystemTime(NOW + 3_600_000);
    game.beginCelebration();
    expect(game.host.storageSet.mock.calls[1][1]).toBe(pending.candidateSave);
    expect(game.save).toBe(pending.candidateSave);
    expect(game.mainlineRankChange).toMatchObject({
      beforeRank: worldRank(baseline, NOW + 3_600_000),
      afterRank: worldRank(game.save, NOW + 3_600_000),
      age: 0,
    });
    expect(calculate).toHaveBeenCalledOnce();
    expect(game.save.coins).toBe(baseline.coins + 40);
    expect(game.host.storageSet).toHaveBeenCalledTimes(2);
  });

  it("accepts a lost acknowledgement only after read-back confirms the candidate", () => {
    const { game, storage } = rankGame();
    storage.mode = "lost-ack";
    game.beginCelebration();
    expect(game.host.storageRead).toHaveBeenCalledOnce();
    expect(game.mainlineRankChange).toBeDefined();
    expect(storage.value).toEqual(game.save);
    expect(game.screen).toBe("win");
  });

  it("keeps daily challenge settlement outside the mainline ranking animation", () => {
    const { game, storage } = rankGame(16);
    game.save.activeRun = {
      levelId: 16, returnLevelId: 16, lifeStarted: false, daily: true,
      dailyChallengeDifficulty: 1, dailyChallengeSourceLevelId: 16,
      dailyDayKey: game.save.dailyChallenge.dayKey,
      boosterSpent: { time: 0, rocket: 0, pulse: 0 },
    };
    storage.value = clone(game.save);
    const baseline = clone(game.save);
    const calculate = vi.spyOn(game, "mainlineRankChangeForSettlement");
    game.beginCelebration();
    expect(game.screen).toBe("win");
    expect(game.save.dailyChallenge.completed[1]).toBe(true);
    expect(game.save.bestStars).toEqual(baseline.bestStars);
    expect(game.mainlineRankChange).toBeUndefined();
    expect(calculate).not.toHaveBeenCalled();
  });

  it("does not announce temporary test progress or persist it", () => {
    const { game } = rankGame();
    game.temporaryLevelTestSession = { baselineSave: clone(game.save), baselineLevelId: 7 };
    const calculate = vi.spyOn(game, "mainlineRankChangeForSettlement");
    game.beginCelebration();
    expect(game.screen).toBe("win");
    expect(game.mainlineRankChange).toBeUndefined();
    expect(calculate).not.toHaveBeenCalled();
    expect(game.host.storageSet).not.toHaveBeenCalled();
  });

  it("delegates league completion to its own settlement without a mainline animation", () => {
    const { game } = rankGame();
    game.leagueRun = {};
    game.finishLeaguePrototype = vi.fn();
    const calculate = vi.spyOn(game, "mainlineRankChangeForSettlement");
    game.beginCelebration();
    expect(game.finishLeaguePrototype).toHaveBeenCalledOnce();
    expect(game.mainlineRankChange).toBeUndefined();
    expect(calculate).not.toHaveBeenCalled();
    expect(game.host.storageSet).not.toHaveBeenCalled();
  });

  it("keeps the committed rank snapshot pending for any length of settlement and preview", () => {
    const { game } = rankGame();
    game.beginCelebration();
    const change = game.mainlineRankChange;
    game.updateMainlineRankChange(10);
    expect(game.mainlineRankChange).toBe(change);
    expect(game.mainlineRankChange.age).toBe(0);
    expect(game.mainlineRankChangeEligible()).toBe(false);
    game.collectionIntro = { unlockPreview: true };
    game.updateMainlineRankChange(10);
    expect(game.mainlineRankChange.age).toBe(0);
  });

  it("transfers the same snapshot and rank images to Home while releasing the result art", () => {
    const { game, rankArt } = rankGame();
    const calculate = vi.spyOn(game, "mainlineRankChangeForSettlement");
    game.beginCelebration();
    const change = game.mainlineRankChange, committed = clone(game.save);
    const resultImages = Object.values(game.winArt).filter(image => image !== rankArt);
    vi.setSystemTime(NOW + 3_600_000);
    game.returnHomeFromMainlineWin();
    expect(game.screen).toBe("home");
    expect(game.mainlineRankChange).toBe(change);
    expect(game.mainlineRankArt).toBe(rankArt);
    expect(game.winArt).toBeUndefined();
    expect(calculate).toHaveBeenCalledOnce();
    expect(game.save.bestStars).toEqual(committed.bestStars);
    expect(game.save.coins).toBe(committed.coins);
    for (const image of resultImages) expect(game.host.releaseImage).toHaveBeenCalledWith(image);
    for (const image of Object.values(rankArt)) expect(game.host.releaseImage).not.toHaveBeenCalledWith(image);
    expect(game.mainlineRankChangeEligible()).toBe(true);
  });

  it.each([
    ["appVisible", false], ["artReady", false], ["storageBaselineReady", false],
    ["mainlineRankArt", undefined], ["screen", "win"], ["screen", "playing"],
    ["screen", "settings"], ["homeCoinFlight", {}], ["directLevelTransition", {}],
    ["navigationTransition", {}], ["journeyPresentation", {}], ["collectionIntro", {}],
    ["featureUnlockGuide", {}], ["profilePage", "main"], ["lifeRefillOpen", true],
    ["temporaryLevelSelector", {}], ["updateToastVisible", true],
  ])("pauses the Home animation while %s is %j", (field, value) => {
    const { game } = rankGame();
    game.beginCelebration();
    game.returnHomeFromMainlineWin();
    const original = game[field as string];
    game[field as string] = value;
    expect(game.mainlineRankChangeEligible()).toBe(false);
    game.updateMainlineRankChange(10);
    expect(game.mainlineRankChange.age).toBe(0);
    game[field as string] = original;
    game.updateMainlineRankChange(0.25);
    expect(game.mainlineRankChange.age).toBeCloseTo(0.25);
  });

  it("waits for the Home artwork and popup entrance, then resumes without restarting", () => {
    const { game } = rankGame();
    game.beginCelebration();
    game.returnHomeFromMainlineWin();
    game.updateMainlineRankChange(0.3);
    const home = game.art.home;
    game.art.home = undefined;
    game.updateMainlineRankChange(10);
    expect(game.mainlineRankChange.age).toBeCloseTo(0.3);
    game.art.home = home;
    const ctx = { save: vi.fn(), restore: vi.fn(), translate: vi.fn(), scale: vi.fn(), globalAlpha: 1 };
    game.popupEntrance.draw(ctx, "fixtureHomePopup", { x: 0, y: 0, width: 100, height: 100 }, () => {}, false);
    game.updateMainlineRankChange(10);
    expect(game.mainlineRankChange.age).toBeCloseTo(0.3);
    game.popupEntrance.update(0.32, true, false);
    game.updateMainlineRankChange(0.2);
    expect(game.mainlineRankChange.age).toBeCloseTo(0.5);
  });

  it.each([false, true])("finishes on Home and releases each rank image once (reduced motion %s)", reducedMotion => {
    const { game, rankArt } = rankGame(7, { reducedMotion });
    game.beginCelebration();
    game.returnHomeFromMainlineWin();
    const writes = game.host.storageSet.mock.calls.length;
    game.host.releaseImage.mockClear();
    game.updateMainlineRankChange(0.5);
    expect(game.mainlineRankChange.age).toBeCloseTo(0.5);
    game.updateMainlineRankChange(2);
    expect(game.mainlineRankChange).toBeUndefined();
    expect(game.mainlineRankArt).toBeUndefined();
    expect(game.host.releaseImage).toHaveBeenCalledTimes(5);
    for (const image of Object.values(rankArt)) expect(game.host.releaseImage).toHaveBeenCalledWith(image);
    game.updateMainlineRankChange(10);
    game.clearMainlineRankChange();
    expect(game.host.releaseImage).toHaveBeenCalledTimes(5);
    expect(game.host.storageSet).toHaveBeenCalledTimes(writes);
    expect(game.save.bestStars["7"]).toBe(3);
  });

  it("restores the result's event and image ownership if guarded Home navigation is refused", () => {
    const { game, rankArt } = rankGame();
    game.beginCelebration();
    const change = game.mainlineRankChange, resultArt = game.winArt;
    game.pendingSupplyPurchase = {};
    game.returnHomeFromMainlineWin();
    expect(game.screen).toBe("win");
    expect(game.mainlineRankChange).toBe(change);
    expect(game.winArt).toBe(resultArt);
    expect(game.winArt.suppliedRank).toBe(rankArt);
    expect(game.mainlineRankArt).toBeUndefined();
    expect(game.host.releaseImage).not.toHaveBeenCalled();
    game.pendingSupplyPurchase = undefined;
    game.returnHomeFromMainlineWin();
    expect(game.screen).toBe("home");
    expect(game.mainlineRankArt).toBe(rankArt);
  });

  it("keeps rank images alive across tab visits and clears them on the next level load", () => {
    const { game, rankArt } = rankGame();
    game.beginCelebration();
    game.returnHomeFromMainlineWin();
    game.updateMainlineRankChange(0.4);
    game.screen = "leaderboard";
    game.updateMainlineRankChange(10);
    expect(game.mainlineRankChange.age).toBeCloseTo(0.4);
    for (const image of Object.values(rankArt)) expect(game.host.releaseImage).not.toHaveBeenCalledWith(image);
    game.screen = "home";
    game.updateMainlineRankChange(0.2);
    expect(game.mainlineRankChange.age).toBeCloseTo(0.6);
    game.host.releaseImage.mockClear();
    game.loadLevel(8, false);
    expect(game.mainlineRankChange).toBeUndefined();
    expect(game.mainlineRankArt).toBeUndefined();
    expect(game.host.releaseImage).toHaveBeenCalledTimes(5);
  });

  it.each(["continueButton", "close"] as const)("transfers on the %s button's released and fully closed result", button => {
    const { game, rankArt } = rankGame();
    game.beginPendingHomePresentation = vi.fn(() => false);
    game.beginCelebration();
    const change = game.mainlineRankChange;
    const transfer = vi.spyOn(game, "returnHomeFromMainlineWin");
    const ctx = { save: vi.fn(), restore: vi.fn(), translate: vi.fn(), scale: vi.fn(), globalAlpha: 1 };
    game.popupEntrance.draw(ctx, "win", { x: 40, y: 200, width: 420, height: 620 }, () => {}, false);
    game.popupEntrance.update(0.32, true, false);
    const rect = WIN_SETTLEMENT_LAYOUT[button];
    const point = { id: 1, x: (rect.x + rect.width / 2) * 496 / 720,
      y: (rect.y + rect.height / 2) * 496 / 720 };
    game.handleDown(point);
    expect(game.pendingButtonPress?.key).toBe(button === "continueButton" ? "modalPrimary" : "modalSecondary");
    expect(transfer).not.toHaveBeenCalled();
    game.updateMainlineRankChange(10);
    expect(change.age).toBe(0);
    game.handleUp(point);
    expect(game.screen).toBe("win");
    expect(transfer).not.toHaveBeenCalled();
    game.popupEntrance.update(0.32, true, false);
    expect(game.popupEntrance.flushExits()).toBe(true);
    expect(transfer).toHaveBeenCalledOnce();
    expect(game.screen).toBe("home");
    expect(game.mainlineRankChange).toBe(change);
    expect(game.mainlineRankArt).toBe(rankArt);
    if (button === "continueButton") {
      expect(game.homeCoinFlight.reward).toBe(40);
      game.updateMainlineRankChange(10);
      expect(change.age).toBe(0);
      game.clearHomeCoinFlight();
    } else expect(game.homeCoinFlight).toBeUndefined();
    game.updateMainlineRankChange(0.25);
    expect(change.age).toBeCloseTo(0.25);
  });

  it("releases the pending Home banner when the next challenge actually starts", () => {
    const { game, rankArt } = rankGame();
    game.beginCelebration();
    game.returnHomeFromMainlineWin();
    game.host.releaseImage.mockClear();
    game.beginSelectedChallenge();
    expect(game.screen).toBe("playing");
    expect(game.save.activeRun).toMatchObject({ levelId: 8, lifeStarted: false, daily: false });
    expect(game.mainlineRankChange).toBeUndefined();
    expect(game.mainlineRankArt).toBeUndefined();
    expect(game.host.releaseImage).toHaveBeenCalledTimes(5);
    for (const image of Object.values(rankArt)) expect(game.host.releaseImage).toHaveBeenCalledWith(image);
  });

  it.each(["empty lives", "unavailable storage"] as const)("preserves the pending Home banner when %s prevents starting", reason => {
    const { game, rankArt } = rankGame();
    game.beginCelebration();
    game.returnHomeFromMainlineWin();
    const change = game.mainlineRankChange;
    game.host.releaseImage.mockClear();
    const begin = vi.spyOn(game, "beginSelectedChallenge");
    game.requestLifeRefillArt = vi.fn();
    if (reason === "empty lives") {
      game.save.lifeState = { lives: 0, nextLifeAtMs: NOW + 1_800_000, unlimitedLivesUntilMs: 0 };
    } else game.storageBaselineReady = false;
    const rect = HOME_ART_LAYOUT.start;
    const point = { id: 1, x: (rect.x + rect.width / 2) * 496 / 720,
      y: (rect.y + rect.height / 2) * 496 / 720 };
    game.handleDown(point);
    game.handleUp(point);
    expect(game.screen).toBe("home");
    expect(game.mainlineRankChange).toBe(change);
    expect(game.mainlineRankArt).toBe(rankArt);
    expect(game.host.releaseImage).not.toHaveBeenCalled();
    if (reason === "empty lives") {
      expect(begin).toHaveBeenCalledOnce();
      expect(game.lifeRefillOpen).toBe(true);
    } else expect(begin).not.toHaveBeenCalled();
  });

  it("keeps the banner during artwork-only previews but releases it before full album assets load", async () => {
    const { game, rankArt } = rankGame();
    game.beginCelebration();
    game.returnHomeFromMainlineWin();
    const change = game.mainlineRankChange;
    game.host.releaseImage.mockClear();
    delete game.requestCollectionAlbumArtwork;
    game.collectionIntro = { itemId: "fixture-preview" };
    game.suppliedRevealAssets = vi.fn();
    game.collectionAlbumArtwork = { request: vi.fn(async () => {}) };
    game.collectionAlbumArtworkRequestToken = 0;
    game.collectionAlbumArtRequestToken = 0;
    game.collectionAlbumLayout = () => ({ pagination: { pageIndex: 0 } });
    game.collectionAlbumCurrentAtlasIndexes = () => [3];
    game.collectionAlbumVisible = () => false;
    game.requestCollectionAlbumArtwork();
    expect(game.collectionAlbumArtwork.request).toHaveBeenCalledWith([3], false);
    expect(game.mainlineRankChange).toBe(change);
    expect(game.mainlineRankArt).toBe(rankArt);
    expect(game.host.releaseImage).not.toHaveBeenCalled();
    game.collectionIntro = undefined;
    game.loadImages = vi.fn(async () => {
      expect(game.mainlineRankChange).toBeUndefined();
      expect(game.mainlineRankArt).toBeUndefined();
      expect(game.host.releaseImage).toHaveBeenCalledTimes(5);
      return [];
    });
    game.requestCollectionAlbumArt();
    expect(game.loadImages).toHaveBeenCalledOnce();
    for (const image of Object.values(rankArt)) expect(game.host.releaseImage).toHaveBeenCalledWith(image);
    await Promise.resolve();
  });

  it("clears the transient presentation when leaving the result for another level", () => {
    const { game } = rankGame();
    game.beginCelebration();
    expect(game.mainlineRankChange).toBeDefined();
    game.loadLevel(8, false);
    expect(game.screen).toBe("home");
    expect(game.mainlineRankChange).toBeUndefined();
    expect(game.model.level.id).toBe(8);
  });
});
