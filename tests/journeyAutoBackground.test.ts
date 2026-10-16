import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clonePlainData } from "../src/core/clonePlainData";
import { DAILY_CHALLENGE_REWARDS } from "../src/core/dailyChallenge";
import { LEVELS } from "../src/core/levels";
import { PuzzleModel } from "../src/core/PuzzleModel";
import { GAME_ART } from "../src/game/artManifest";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";
import { CountdownWarning } from "../src/game/countdownWarning";

const NOW = new Date("2026-10-08T06:00:00.000Z").getTime();
const clone = clonePlainData;
const image = (src: string) => ({ src }) as HTMLImageElement;
const flush = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };

/** Real settlement, persistence and image-selection methods; memory storage only.
 * Metrics represent a completed run. These are not gameplay-route or Pointer tests. */
function completionGame(levelId: number, saveOverrides: Record<string, unknown> = {}) {
  const game = Object.create(ColorEscapeGame.prototype) as any;
  game.countdownWarning = new CountdownWarning();
  game.playableClockSlices = { reset: vi.fn() };
  game.save = game.sanitizeSave({
    ...game.sanitizeSave(undefined),
    currentLevel: levelId, highestLevel: levelId, selectedJourneyEpisode: 1,
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
  game.art = { home: image("initial-home"), homeUi: {} };
  game.journeyHomeThemeIndex = game.save.selectedJourneyEpisode;
  game.journeyHomeThemeRequestToken = 0;
  game.journeyHomeThemeLoading = false;
  if (game.journeyHomeThemeIndex > 1) game.journeyHomeThemeArt = image("previous-theme");
  for (const method of [
    "playSound", "vibrate", "scheduleFrame", "emitBurst", "requestWinArt", "releaseWinArt",
    "releaseFormalPageArt", "releaseDailyChallengeArt", "releaseCollectionAlbumArt",
    "releaseAchievementArt", "cancelDailyTaskRefreshWatch", "releaseDailyTaskArt",
    "captureInitialGeneratorSpawns", "requestCollectionAlbumArtwork",
  ]) game[method] = vi.fn();
  const events: string[] = [];
  const storage = {
    value: clone(game.save),
    mode: "commit" as "commit" | "reject" | "unknown-after-write" | "lost-ack",
  };
  game.host = {
    storageSet: vi.fn((_key: string, value: unknown) => {
      events.push("write");
      if (storage.mode === "reject") return false;
      storage.value = clone(value);
      return storage.mode === "commit";
    }),
    storageRead: vi.fn(() => {
      events.push("read");
      return storage.mode === "unknown-after-write"
        ? { status: "unavailable" } : { status: "ok", value: clone(storage.value) };
    }),
    createImage: vi.fn((src: string) => {
      events.push("image");
      // Preloading must not start before the same save transaction is confirmed.
      expect(storage.value.selectedJourneyEpisode).toBe(game.save.selectedJourneyEpisode);
      expect(storage.value.highestLevel).toBe(game.save.highestLevel);
      return Promise.resolve(image(src));
    }),
    releaseImage: vi.fn(),
  };
  const requestTheme = vi.spyOn(game, "requestJourneyHomeThemeArt");
  return { game, storage, events, requestTheme };
}

/** Exercise the real Home background branch while omitting unrelated HUD rendering. */
function renderedBackground(game: any) {
  game.ctx = { drawImage: vi.fn(), save: vi.fn(), restore: vi.fn(), translate: vi.fn() };
  game.safeOffsets = () => ({ top: 0, bottom: 0 });
  game.withHomeArtboard = (draw: () => void) => draw();
  game.lifeHeaderText = () => "Full";
  for (const method of [
    "drawPressable", "label", "drawTemporaryLevelButton", "drawHomeLevelArrows",
    "drawDailyTaskHomeEntry", "drawLeagueHomeEntry", "drawDailyChallengeHomeEntry",
  ]) game[method] = vi.fn();
  game.drawGeneratedHome(false);
  return game.ctx.drawImage.mock.calls[0][0];
}

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe("automatic Home background after unlocking a Journey chapter", () => {
  it.each([10, 20])("does not unlock the next background by merely completing level %i", levelId => {
    const selectedJourneyEpisode = levelId / 10;
    const { game, storage, requestTheme } = completionGame(levelId, { selectedJourneyEpisode });
    game.beginCelebration();
    expect(game.save.highestLevel).toBe(levelId + 1);
    expect(game.save.rewardedLevels).toContain(levelId);
    expect(game.save.selectedJourneyEpisode).toBe(selectedJourneyEpisode);
    expect(storage.value.selectedJourneyEpisode).toBe(selectedJourneyEpisode);
    expect(requestTheme).not.toHaveBeenCalled();
    expect(game.host.createImage).not.toHaveBeenCalled();
  });

  it("migrates an early-selected desert background back to the initial scene without touching rewards", () => {
    const { game } = completionGame(11, { selectedJourneyEpisode: 2,
      journeyProgress: { claimedMilestoneLevels: [10], seenEpisodeUnlockLevels: [11] } });
    expect(game.save.selectedJourneyEpisode).toBe(1);
    expect(game.save.journeyProgress.seenEpisodeUnlockLevels).toEqual([]);
    expect(game.save.journeyProgress.claimedMilestoneLevels).toEqual([10]);
    expect(game.save.rewardedLevels).toEqual(Array.from({ length: 10 }, (_, index) => index + 1));
    expect(game.save.coins).toBe(1234);
    expect(game.host.storageSet).not.toHaveBeenCalled();
  });

  it("retains the desert selection and acknowledgement when level 11 was really completed", () => {
    const { game } = completionGame(12, { selectedJourneyEpisode: 2,
      journeyProgress: { claimedMilestoneLevels: [10], seenEpisodeUnlockLevels: [11] } });
    expect(game.save.selectedJourneyEpisode).toBe(2);
    expect(game.save.journeyProgress.seenEpisodeUnlockLevels).toEqual([11]);
    expect(game.save.journeyProgress.claimedMilestoneLevels).toEqual([10]);
    expect(game.save.coins).toBe(1234);
  });

  it.each(Array.from({ length: 19 }, (_, index) => (index + 1) * 10 + 1))(
    "commits level %s and its next chapter together, then preloads and renders that theme on Home",
    async levelId => {
      const { game, storage, events, requestTheme } = completionGame(levelId);
      const episode = (levelId - 1) / 10 + 1;
      game.beginCelebration();
      expect(game.screen).toBe("win");
      expect(game.save).toMatchObject({ currentLevel: levelId + 1, highestLevel: levelId + 1, selectedJourneyEpisode: episode, coins: 1274 });
      expect(storage.value).toEqual(game.save);
      expect(game.host.storageSet).toHaveBeenCalledOnce();
      expect(requestTheme).toHaveBeenCalledExactlyOnceWith(episode);
      expect(events).toEqual(["write", "image"]);
      // Episode identity stays 11 at Lv101, while its image wraps to theme 1.
      const expectedPath = GAME_ART.ui.formalPages.journey.homeThemes[(episode - 1) % 10];
      expect(game.host.createImage).toHaveBeenCalledExactlyOnceWith(expectedPath);
      await flush();
      expect(game.journeyHomeThemeIndex).toBe(episode);
      expect(game.journeyHomeThemeArt.src).toBe(expectedPath);
      game.loadLevel(game.save.currentLevel, false);
      expect(game.screen).toBe("home");
      expect(renderedBackground(game)).toBe(game.journeyHomeThemeArt);
      expect(game.save.coins).toBe(1274);
      expect(storage.value.selectedJourneyEpisode).toBe(episode);
    },
  );

  it.each([12, 25, 102, 199, 200])("preserves a manual chapter selection on non-unlocking level %s", levelId => {
    const { game, storage, requestTheme } = completionGame(levelId, { selectedJourneyEpisode: 2 });
    game.beginCelebration();
    expect(game.save.selectedJourneyEpisode).toBe(2);
    expect(storage.value.selectedJourneyEpisode).toBe(2);
    expect(game.save.highestLevel).toBe(Math.min(200, levelId + 1));
    expect(requestTheme).not.toHaveBeenCalled();
    expect(game.host.createImage).not.toHaveBeenCalled();
  });

  it.each([true, false])("preserves a manual selection on an old boundary (previously rewarded: %s)", rewarded => {
    const { game, requestTheme } = completionGame(21, {
      highestLevel: 101, selectedJourneyEpisode: 4,
      rewardedLevels: Array.from({ length: 100 }, (_, index) => index + 1).filter(id => rewarded || id !== 21),
    });
    game.beginCelebration();
    expect(game.save.highestLevel).toBe(101);
    expect(game.save.selectedJourneyEpisode).toBe(4);
    expect(game.save.coins).toBe(rewarded ? 1234 : 1274);
    expect(requestTheme).not.toHaveBeenCalled();
  });

  it("does not select a campaign chapter when a daily level uses a boundary source ID", () => {
    const { game, storage, requestTheme } = completionGame(21, { selectedJourneyEpisode: 2 });
    game.save.activeRun = {
      levelId: 21, returnLevelId: 21, lifeStarted: false, daily: true,
      dailyChallengeDifficulty: 1, dailyChallengeSourceLevelId: 21,
      dailyDayKey: game.save.dailyChallenge.dayKey,
      boosterSpent: { time: 0, rocket: 0, pulse: 0 },
    };
    storage.value = clone(game.save);
    const before = clone(game.save);
    game.beginCelebration();
    expect(game.save.coins).toBe(before.coins + DAILY_CHALLENGE_REWARDS[1].coins);
    expect(game.save.dailyChallenge.completed[1]).toBe(true);
    for (const key of ["currentLevel", "highestLevel", "selectedJourneyEpisode", "rewardedLevels", "bestStars"]) {
      expect(game.save[key], key).toEqual(before[key]);
    }
    expect(requestTheme).not.toHaveBeenCalled();
  });

  it("preserves the selected theme for a temporary boundary-level test session", () => {
    const { game, requestTheme } = completionGame(21, { selectedJourneyEpisode: 2 });
    game.temporaryLevelTestSession = { baselineLevelId: 21 };
    game.beginCelebration();
    expect(game.screen).toBe("win");
    expect(game.save.selectedJourneyEpisode).toBe(2);
    expect(requestTheme).not.toHaveBeenCalled();
    expect(game.host.createImage).not.toHaveBeenCalled();
    expect(game.host.storageSet).not.toHaveBeenCalled();
  });

  it("delegates league completion without running campaign settlement or changing its theme", () => {
    const { game, requestTheme } = completionGame(21, { selectedJourneyEpisode: 2 });
    const before = clone(game.save);
    game.leagueRun = {};
    game.finishLeaguePrototype = vi.fn();
    game.beginCelebration();
    expect(game.finishLeaguePrototype).toHaveBeenCalledOnce();
    expect(game.save).toEqual(before);
    expect(game.pendingSettlement).toBeUndefined();
    expect(requestTheme).not.toHaveBeenCalled();
    expect(game.host.createImage).not.toHaveBeenCalled();
    expect(game.host.storageSet).not.toHaveBeenCalled();
  });

  it.each(["reject", "unknown-after-write"] as const)("keeps the current selection and art on %s, then retries the exact candidate once", async mode => {
    const { game, storage, requestTheme } = completionGame(21, { selectedJourneyEpisode: 2 });
    const before = clone(game.save);
    const oldArt = game.journeyHomeThemeArt;
    storage.mode = mode;
    game.beginCelebration();
    const pending = game.pendingSettlement;
    expect(pending.candidateSave).toMatchObject({ highestLevel: 22, selectedJourneyEpisode: 3, coins: 1274 });
    expect(game.screen).toBe("settlementFailed");
    expect(game.settlementFailureKind).toBe(mode === "reject" ? "rejected" : "unknown");
    expect(game.save).toEqual(before);
    expect(game.journeyHomeThemeIndex).toBe(2);
    expect(game.journeyHomeThemeArt).toBe(oldArt);
    expect(requestTheme).not.toHaveBeenCalled();
    expect(game.host.createImage).not.toHaveBeenCalled();
    expect(storage.value).toEqual(mode === "reject" ? before : pending.candidateSave);
    storage.mode = "commit";
    game.beginCelebration();
    expect(game.host.storageSet.mock.calls[1][1]).toBe(pending.candidateSave);
    expect(game.save).toBe(pending.candidateSave);
    expect(requestTheme).toHaveBeenCalledExactlyOnceWith(3);
    await flush();
    expect(game.journeyHomeThemeIndex).toBe(3);
    expect(game.save.coins).toBe(1274);
    expect(game.save.rewardedLevels.filter((id: number) => id === 21)).toHaveLength(1);
    expect(game.pendingSettlement).toBeUndefined();
    const replay = completionGame(21, storage.value);
    replay.game.beginCelebration();
    expect(replay.game.winCoinReward).toBe(0);
    expect(replay.game.save.coins).toBe(1274);
    expect(replay.game.save.selectedJourneyEpisode).toBe(3);
    expect(replay.requestTheme).not.toHaveBeenCalled();
  });

  it("waits for exact read-back confirmation after a lost write acknowledgement", async () => {
    const { game, storage, events } = completionGame(11);
    storage.mode = "lost-ack";
    game.beginCelebration();
    expect(events).toEqual(["write", "read", "image"]);
    expect(game.save).toMatchObject({ highestLevel: 12, selectedJourneyEpisode: 2, coins: 1274 });
    await flush();
    expect(game.journeyHomeThemeIndex).toBe(2);
  });

  it("retains the committed chapter and reward when art fails, and reload can fetch the saved theme", async () => {
    const { game, storage, requestTheme } = completionGame(21, { selectedJourneyEpisode: 2 });
    game.host.createImage.mockRejectedValueOnce(new Error("offline"));
    game.beginCelebration();
    await expect(requestTheme.mock.results[0].value).resolves.toBe(false);
    expect(game.screen).toBe("win");
    expect(game.save).toMatchObject({ highestLevel: 22, selectedJourneyEpisode: 3, coins: 1274 });
    expect(storage.value).toEqual(game.save);
    expect(game.pendingSettlement).toBeUndefined();
    expect(game.journeyHomeThemeLoading).toBe(false);
    // The stale theme does not masquerade as the newly selected chapter.
    expect(renderedBackground(game)).toBe(game.art.home);
    const reloaded = completionGame(22, storage.value);
    reloaded.game.journeyHomeThemeArt = undefined;
    expect(reloaded.game.save.selectedJourneyEpisode).toBe(3);
    await expect(reloaded.game.requestJourneyHomeThemeArt(reloaded.game.save.selectedJourneyEpisode)).resolves.toBe(true);
    reloaded.game.loadLevel(reloaded.game.save.currentLevel, false);
    expect(reloaded.game.screen).toBe("home");
    expect(renderedBackground(reloaded.game)).toBe(reloaded.game.journeyHomeThemeArt);
    expect(reloaded.game.save.coins).toBe(1274);
    expect(reloaded.game.host.createImage).toHaveBeenCalledExactlyOnceWith(GAME_ART.ui.formalPages.journey.homeThemes[2]);
  });
});
