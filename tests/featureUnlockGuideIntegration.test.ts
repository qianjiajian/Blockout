import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clonePlainData as clone } from "../src/core/clonePlainData";
import { FEATURE_UNLOCKS } from "../src/core/featureUnlocks";
import { LEVELS } from "../src/core/levels";
import { PuzzleModel } from "../src/core/PuzzleModel";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";
import { CountdownWarning } from "../src/game/countdownWarning";
import { FEATURE_UNLOCK_ART } from "../src/game/artManifest";
import { HOME_ARTBOARD, HOME_ART_LAYOUT } from "../src/game/homeArtLayout";
import { LeagueScroll } from "../src/game/leagueScroll";
import { GAME_LANGUAGES } from "../src/game/localization";
import { PopupEntranceController } from "../src/game/popupEntrance";
import { welfareText } from "../src/game/welfareLocalization";

const NOW = new Date("2026-10-08T06:00:00.000Z").getTime();
const GUIDED = ["leaderboard", "supply", "levels", "dailyChallenge", "league"] as const;
const featureArtFixture = () => Object.fromEntries([
  "panel", "titleZh", "titleEn", "glow", "sparkles", "rankIcon", "nameLeft", "nameRight",
  "divider", "button", "laterLine",
].map(key => [key, { src: `fixture:feature-unlock/${key}` } as HTMLImageElement]));
type GuidedFeature = typeof GUIDED[number];
type Rect = { x: number; y: number; width: number; height: number };
const center = (rect: Rect, id = 1) => ({ id, x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
const homeRect = (rect: Rect): Rect => {
  const scale = 496 / HOME_ARTBOARD.width;
  return { x: rect.x * scale, y: (1078 - HOME_ARTBOARD.height * scale) / 2 + rect.y * scale,
    width: rect.width * scale, height: rect.height * scale };
};
const flushImageLoads = async () => { for (let turn = 0; turn < 30; turn++) await Promise.resolve(); };
function deferredImages() {
  let resolve!: (images: HTMLImageElement[]) => void;
  const promise = new Promise<HTMLImageElement[]>(done => { resolve = done; });
  return { promise, resolve };
}

/** Real save normalization, settlement, presentation, input and persistence.
 * Storage and image services are isolated; no player data or solver is used. */
function guideGame(highestLevel = 7, overrides: Record<string, unknown> = {}) {
  const game = Object.create(ColorEscapeGame.prototype) as any;
  game.popupEntrance = new PopupEntranceController();
  game.countdownWarning = new CountdownWarning();
  game.playableClockSlices = { reset: vi.fn() };
  game.save = game.sanitizeSave({
    ...game.sanitizeSave(undefined), currentLevel: highestLevel, highestLevel,
    rewardedLevels: Array.from({ length: highestLevel - 1 }, (_, index) => index + 1),
    coins: 1254, boosters: { time: 2, rocket: 1, pulse: 2 },
    boosterUnlockSeen: ["time", "rocket", "pulse"],
    collectionIntroShown: true, collectionIntroPending: false,
    journeyProgress: { claimedMilestoneLevels: [], seenEpisodeUnlockLevels: Array.from({ length: 20 }, (_, index) => index * 10 + 1) },
    featureGuideProgress: { version: 1, pending: [], seen: [] },
    ...overrides,
  });
  game.model = new PuzzleModel(LEVELS[game.save.currentLevel - 1]);
  game.completionMetrics = { moves: 1, elapsedSeconds: 1 };
  game.runElapsedSeconds = 1;
  game.screen = "home";
  game.appVisible = true;
  game.artReady = true;
  game.featureUnlockArt = featureArtFixture();
  game.featureUnlockArtLoading = false;
  game.featureUnlockArtRequestToken = 0;
  // Business tests use already-loaded images. Dedicated resource tests below
  // remove this fixture to exercise the actual asynchronous loader.
  game.requestFeatureUnlockArt = vi.fn(() => { game.featureUnlockArt ??= featureArtFixture(); });
  game.storageBaselineReady = true;
  game.storageReadAttempts = 0;
  game.settlementSaveAttempts = 0;
  game.art = { home: { src: "home" }, tutorialHand: { src: "hand" }, homeUi: {
    leaderboardIcon: { src: "leaderboard" }, shopIcon: { src: "shop" }, journeyIcon: { src: "journey" },
    dailyChallengeEntry: { src: "daily" }, leagueEntry: { src: "league" },
  } };
  game.leagueScroll = new LeagueScroll();
  game.journeyHomeThemeRequestToken = 0;
  game.journeyHomeThemeIndex = game.save.selectedJourneyEpisode;
  game.journeyHomeThemeArt = { src: "current-theme" };
  game.journeyHomeThemeLoading = false;
  game.journeyHomeThemeFailed = false;
  game.collectionAlbumPage = { levels: 0, masterpieces: 0 };
  game.collectionAlbumArtwork = { image: vi.fn(() => ({ src: "collection" })), failedIndexes: [], dispose: vi.fn() };
  game.safeOffsets = () => ({ top: 0, bottom: 0 });
  game.viewportTransform = () => ({ scale: 1, offsetY: 0, offsetX: 0 });
  game.formalPageForScreen = () => undefined;
  game.formalPageArtFor = () => undefined;
  game.formalPageReady = () => false;
  game.formalPageFailed = () => false;
  for (const method of [
    "playSound", "vibrate", "scheduleFrame", "emitBurst", "requestWinArt", "releaseWinArt",
    "releaseFormalPageArt", "releaseDailyChallengeArt", "releaseCollectionAlbumArt",
    "releaseAchievementArt", "cancelDailyTaskRefreshWatch", "releaseDailyTaskArt",
    "captureInitialGeneratorSpawns", "requestCollectionAlbumArtwork", "setFormalPageIntent",
    "requestDailyTaskArt", "requestDailyChallengeArt", "requestAchievementArt",
    "scheduleDailyTaskRefreshWatch", "scheduleLifeRefreshWatch", "refreshLifeState", "pruneMainPageArt",
    "requestLeagueArt", "requestFormalPageArt",
  ]) game[method] = vi.fn();
  const storage = { value: clone(game.save), mode: "commit" as "commit" | "reject" | "unknown-after-write" | "lost-ack" };
  game.host = {
    storageSet: vi.fn((_key: string, value: unknown) => {
      if (storage.mode === "reject") return false;
      storage.value = clone(value);
      return storage.mode === "commit";
    }),
    storageRead: vi.fn(() => storage.mode === "unknown-after-write"
      ? { status: "unavailable" } : { status: "ok", value: clone(storage.value) }),
    createImage: vi.fn((src: string) => Promise.resolve({ src } as HTMLImageElement)), releaseImage: vi.fn(),
  };
  return { game, storage };
}

function pendingGame(feature: GuidedFeature = "leaderboard", overrides: Record<string, unknown> = {}) {
  return guideGame(FEATURE_UNLOCKS[feature].completedLevel + 1, {
    featureGuideProgress: { version: 1, pending: [feature], seen: [] }, ...overrides,
  });
}

function readyGuide(game: any) {
  expect(game.beginPendingFeatureGuide()).toBe(true);
  game.updateFeatureUnlockGuide(0.75);
  expect(game.featureUnlockGuideReady()).toBe(true);
  expect(game.featureUnlockGuide.phase).toBe("reveal");
  return game.featureUnlockGuide;
}

function focusGuide(game: any) {
  readyGuide(game);
  const writes = game.host.storageSet.mock.calls.length;
  touch(game, game.featureGuideLayout().look);
  expect(game.featureUnlockGuide.phase).toBe("focus");
  expect(game.screen).toBe("home");
  expect(game.host.storageSet).toHaveBeenCalledTimes(writes);
}

function entryRect(game: any, feature: GuidedFeature): Rect {
  if (feature === "dailyChallenge") return homeRect(HOME_ART_LAYOUT.dailyChallengeEntry);
  if (feature === "league") return homeRect(HOME_ART_LAYOUT.leagueEntry);
  return game.mainNavigationRect(({ supply: 0, leaderboard: 1, levels: 3 } as const)[feature]);
}

function touch(game: any, rect: Rect, id = 1) {
  const point = center(rect, id);
  game.handleDown(point);
  game.handleUp(point);
}

function economicSnapshot(save: any) {
  return clone({ coins: save.coins, boosters: save.boosters, lifeState: save.lifeState,
    rewardedLevels: save.rewardedLevels, bestStars: save.bestStars, bestMoves: save.bestMoves,
    dailyChallenge: save.dailyChallenge, dailyTaskProgress: save.dailyTaskProgress,
    achievementProgress: save.achievementProgress, collectionProgress: save.collectionProgress });
}

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe("shop feature unlock copy", () => {
  it.each(["zh-CN", "zh-TW"])("names the unlock 商店 without changing other shop copy in %s", (language) => {
    const { game } = pendingGame("supply", { language });
    const before = clone(game.save);
    expect(game.tr("featureGuide.supply.name")).toBe("商店");
    expect(game.tr("navigation.shop")).toBe("商城");
    expect(game.tr("shop.title")).toBe("福利站");
    expect(game.tr("featureGuide.supply.description")).toBe(welfareText(language, "subtitle"));
    expect(game.save).toEqual(before);
    expect(game.host.storageSet).not.toHaveBeenCalled();
  });

  it.each(GAME_LANGUAGES.filter(language => language !== "zh-CN" && language !== "zh-TW"))(
    "preserves the existing unlock name in %s", (language) => {
      const { game } = pendingGame("supply", { language });
      expect(game.tr("featureGuide.supply.name")).toBe(welfareText(language, "title"));
    },
  );
});

describe("feature guide save migration and campaign trigger", () => {
  it("migrates only already-unlocked legacy features, preserving the rest of the account", () => {
    const { game } = guideGame(11);
    const old = clone(game.save);
    delete old.featureGuideProgress;
    const migrated = game.sanitizeSave(old);
    expect(migrated.featureGuideProgress).toEqual({ version: 1, pending: [], seen: ["leaderboard", "supply", "levels"] });
    expect(economicSnapshot(migrated)).toEqual(economicSnapshot(old));
    expect(migrated.league).toEqual(old.league);
    expect(migrated.currentLevel).toBe(old.currentLevel);
    expect(migrated.highestLevel).toBe(old.highestLevel);
    expect(game.host.storageSet).not.toHaveBeenCalled();
  });

  it("does not turn an explicit new ledger into a legacy migration or synthesize a backlog", () => {
    const { game } = guideGame(21);
    expect(game.save.featureGuideProgress).toEqual({ version: 1, pending: [], seen: [] });
    expect(game.beginPendingFeatureGuide()).toBe(false);
    expect(game.featureUnlockGuide).toBeUndefined();
  });

  it("still queues the next newly earned feature after legacy suppression", () => {
    const { game } = guideGame(8);
    const old = clone(game.save);
    delete old.featureGuideProgress;
    game.save = game.sanitizeSave(old);
    expect(game.save.featureGuideProgress.seen).toEqual(["leaderboard"]);
    const candidate = game.createPendingSettlement().candidateSave;
    expect(candidate.featureGuideProgress).toEqual({ version: 1, pending: ["supply"], seen: ["leaderboard"] });
  });

  it("retains an unfinished guide across normalization and deeply isolates cloned ledgers", () => {
    const { game } = pendingGame();
    const before = clone(game.save);
    game.save = game.sanitizeSave(game.save);
    expect(game.save.featureGuideProgress.pending).toEqual(["leaderboard"]);
    const candidate = game.cloneSave(game.save);
    candidate.featureGuideProgress.pending.splice(0);
    candidate.featureGuideProgress.seen.push("leaderboard");
    expect(game.save).toEqual(before);
    expect(game.beginPendingFeatureGuide()).toBe(true);
    expect(game.host.storageSet).not.toHaveBeenCalled();
  });

  it.each(GUIDED)("enqueues %s in the same uncommitted campaign settlement candidate", feature => {
    const { game } = guideGame(FEATURE_UNLOCKS[feature].completedLevel);
    const before = clone(game.save);
    const pending = game.createPendingSettlement();
    expect(pending.candidateSave.featureGuideProgress.pending).toEqual([feature]);
    expect(pending.candidateSave.featureGuideProgress.seen).not.toContain(feature);
    expect(game.save).toEqual(before);
    expect(game.featureUnlockGuide).toBeUndefined();
    expect(game.host.storageSet).not.toHaveBeenCalled();
  });

  it("does not enqueue tasks or achievements after clearing level 5", () => {
    const { game } = guideGame(5);
    const pending = game.createPendingSettlement();
    expect(pending.candidateSave.featureGuideProgress).toEqual({ version: 1, pending: [], seen: [] });
  });

  it("guides Journey once after the confirmed level-10 clear without revealing the level-11 background", () => {
    const { game, storage } = guideGame(10);
    expect(game.featureUnlocked("levels")).toBe(false);
    game.beginCelebration();
    expect(game.save.rewardedLevels).toContain(10);
    expect(game.save.featureGuideProgress.pending).toEqual(["levels"]);
    expect(storage.value.featureGuideProgress.pending).toEqual(["levels"]);
    expect(game.save.selectedJourneyEpisode).toBe(1);
    game.screen = "home";
    expect(game.beginPendingHomePresentation()).toBe(true);
    expect(game.journeyPresentation).toBeUndefined();
    expect(game.featureUnlockGuide?.feature).toBe("levels");
    focusGuide(game);
    touch(game, entryRect(game, "levels"));
    expect(game.screen).toBe("levels");
    expect(game.save.featureGuideProgress).toEqual({ version: 1, pending: [], seen: ["levels"] });
    const reloaded = guideGame(11, storage.value).game;
    expect(reloaded.featureUnlocked("levels")).toBe(true);
    expect(reloaded.beginPendingHomePresentation()).toBe(false);
    expect(reloaded.featureUnlockGuide).toBeUndefined();
    expect(reloaded.journeyPresentation).toBeUndefined();
    expect(reloaded.save.selectedJourneyEpisode).toBe(1);
  });

  it("does not enqueue a feature from replaying an already-cleared threshold", () => {
    const { game } = guideGame(21);
    game.model = new PuzzleModel(LEVELS[5]);
    expect(game.createPendingSettlement().candidateSave.featureGuideProgress.pending).toEqual([]);
  });

  it.each([6, 8, 10, 15, 20])("does not enqueue from temporary test level %i", level => {
    const { game } = guideGame(level);
    game.temporaryLevelTestSession = { baselineSave: guideGame(1).game.save, baselineLevelId: 1 };
    expect(game.createPendingSettlement().candidateSave.featureGuideProgress.pending).toEqual([]);
  });

  it("keeps daily completion out of the feature guide queue and campaign ledger", () => {
    const { game } = guideGame(20);
    game.save.activeRun = { levelId: 20, returnLevelId: 20, lifeStarted: true, daily: true,
      dailyDayKey: game.save.dailyChallenge.dayKey, dailyChallengeDifficulty: 1,
      dailyChallengeSourceLevelId: 20, boosterSpent: { time: 0, rocket: 0, pulse: 0 } };
    const before = clone(game.save);
    const pending = game.createPendingSettlement();
    expect(pending.candidateSave.featureGuideProgress).toEqual(before.featureGuideProgress);
    expect(pending.candidateSave.rewardedLevels).toEqual(before.rewardedLevels);
    expect(pending.candidateSave.highestLevel).toBe(before.highestLevel);
  });

  it("does not reveal on an unknown campaign save and retries the same candidate before queuing", () => {
    const { game, storage } = guideGame(6);
    const before = clone(game.save);
    storage.mode = "unknown-after-write";
    game.beginCelebration();
    expect(game.screen).toBe("settlementFailed");
    const candidate = game.pendingSettlement.candidateSave;
    expect(candidate.featureGuideProgress.pending).toEqual(["leaderboard"]);
    expect(game.save).toEqual(before);
    expect(game.beginPendingFeatureGuide()).toBe(false);
    storage.mode = "commit";
    game.beginCelebration();
    expect(game.host.storageSet.mock.calls[1][1]).toBe(candidate);
    expect(game.save.featureGuideProgress.pending).toEqual(["leaderboard"]);
    expect(game.featureUnlockGuide).toBeUndefined();
    game.screen = "home";
    expect(game.beginPendingHomePresentation()).toBe(true);
    expect(game.featureUnlockGuide.feature).toBe("leaderboard");
  });
});

describe("feature guide queue and animation ownership", () => {
  it.each(["playing", "win", "league", "dailyChallenge", "levels"])("does not interrupt %s", screen => {
    const { game } = pendingGame();
    game.screen = screen;
    expect(game.beginPendingFeatureGuide()).toBe(false);
    expect(game.featureUnlockGuide).toBeUndefined();
  });

  it.each(["homeCoinFlight", "collectionIntro", "collectionRestorationGuide", "journeyPresentation",
    "navigationTransition", "directLevelTransition", "lifeRefillOpen", "temporaryLevelSelector",
    "pendingSupplyPurchase", "pendingJourneyClaim", "pendingDailyTaskClaim", "pendingAchievementClaim",
    "pendingSettlement", "pendingLanguageSelection", "pendingButtonPress"])("waits while %s owns input or a transaction", field => {
    const { game } = pendingGame();
    game[field] = {};
    expect(game.beginPendingFeatureGuide()).toBe(false);
    expect(game.featureUnlockGuide).toBeUndefined();
  });

  it.each(["appVisible", "artReady", "storageBaselineReady"])("does not begin without %s", field => {
    const { game } = pendingGame();
    game[field] = false;
    expect(game.beginPendingFeatureGuide()).toBe(false);
    expect(game.featureUnlockGuide).toBeUndefined();
  });

  it.each([
    { feature: "levels" as const, highestLevel: 12, episode: 2, seen: [] },
    { feature: "league" as const, highestLevel: 22, episode: 3, seen: [11] },
  ])("waits for coins, collection and the newly applied scene before revealing the $feature guide", ({ feature, highestLevel, episode, seen }) => {
    const { game } = pendingGame(feature, { highestLevel, currentLevel: highestLevel,
      rewardedLevels: Array.from({ length: highestLevel - 1 }, (_, index) => index + 1), selectedJourneyEpisode: episode,
      collectionIntroPending: true, collectionIntroShown: false,
      journeyProgress: { claimedMilestoneLevels: [], seenEpisodeUnlockLevels: seen } });
    // The scene reveal now also waits for the supplied popup artwork.
    game.suppliedRevealArt = { imageGroup: () => ({}), request: vi.fn(), failed: () => false, dispose: vi.fn() };
    game.beginHomeCoinFlight(20);
    expect(game.beginPendingHomePresentation()).toBe(false);
    expect(game.featureUnlockGuide).toBeUndefined();
    game.updateHomeCoinFlight(10);
    expect(game.collectionIntro).toBeDefined();
    expect(game.featureUnlockGuide).toBeUndefined();
    game.finishCollectionIntro(false);
    expect(game.journeyPresentation?.sceneReveal).toBe(true);
    expect(game.featureUnlockGuide).toBeUndefined();
    game.updateJourneyPresentation(0);
    game.updateJourneyPresentation(1);
    game.completeJourneyPresentation();
    game.updateJourneyPresentation(1);
    expect(game.journeyPresentation).toBeUndefined();
    expect(game.featureUnlockGuide?.feature).toBe(feature);
  });

  it("defers a failed scene for this session, lets the guide finish and only offers the scene again after reload", () => {
    const { game, storage } = pendingGame("league", { highestLevel: 22, currentLevel: 22,
      rewardedLevels: Array.from({ length: 21 }, (_, index) => index + 1), selectedJourneyEpisode: 3,
      journeyProgress: { claimedMilestoneLevels: [], seenEpisodeUnlockLevels: [1, 11] } });
    game.journeyHomeThemeIndex = 1;
    game.journeyHomeThemeArt = undefined;
    game.journeyHomeThemeFailed = true;
    game.requestJourneyHomeThemeArt = vi.fn();
    expect(game.beginPendingHomePresentation()).toBe(true);
    expect(game.journeyPresentation).toMatchObject({ phase: "progress", sceneReveal: true });
    expect(game.featureUnlockGuide).toBeUndefined();
    touch(game, game.journeySceneLayout().later);
    expect(game.journeyPresentation).toBeUndefined();
    expect(game.featureUnlockGuide?.feature).toBe("league");
    expect(game.save.journeyProgress.seenEpisodeUnlockLevels).not.toContain(21);
    focusGuide(game);
    touch(game, entryRect(game, "league"));
    expect(game.featureUnlockGuide).toBeUndefined();
    expect(game.save.featureGuideProgress.seen).toEqual(["league"]);
    expect(game.screen).toBe("league");
    game.screen = "home"; // Isolate returning home from the league's own onboarding.
    for (let index = 0; index < 5; index++) {
      expect(game.beginPendingHomePresentation()).toBe(false);
      expect(game.journeyPresentation).toBeUndefined();
      expect(game.featureUnlockGuide).toBeUndefined();
    }
    expect(storage.value.journeyProgress.seenEpisodeUnlockLevels).not.toContain(21);
    const reloaded = guideGame(storage.value.highestLevel, storage.value).game;
    expect(reloaded.beginPendingHomePresentation()).toBe(true);
    expect(reloaded.journeyPresentation).toMatchObject({ sceneReveal: true, event: { level: 21 } });
    expect(reloaded.featureUnlockGuide).toBeUndefined();
  });

  it("clears deferred scenes through the real progress reset so the new profile can reveal the same chapter", () => {
    const { game, storage } = guideGame(22, { selectedJourneyEpisode: 3,
      journeyProgress: { claimedMilestoneLevels: [], seenEpisodeUnlockLevels: [1, 11] } });
    game.requestJourneyHomeThemeArt = vi.fn();
    expect(game.beginPendingHomePresentation()).toBe(true);
    expect(game.journeyPresentation.event.level).toBe(21);
    game.deferJourneyPresentation();
    expect(game.beginPendingHomePresentation()).toBe(false);
    expect(game.save.journeyProgress.seenEpisodeUnlockLevels).not.toContain(21);

    game.screen = "resetConfirm";
    game.resetProgress();
    expect(game.resetSaveFailed).toBe(false);
    expect(game.screen).toBe("home");
    expect(game.save.highestLevel).toBe(1);
    expect(storage.value.highestLevel).toBe(1);
    expect(game.save.featureGuideProgress).toEqual({ version: 1, pending: [], seen: [] });

    // New synthetic campaign progress after that real reset; no level solver
    // or real profile is involved in checking the runtime deferral lifetime.
    game.save = game.sanitizeSave({ ...game.save, highestLevel: 22, currentLevel: 22,
      rewardedLevels: Array.from({ length: 21 }, (_, index) => index + 1), selectedJourneyEpisode: 3,
      collectionIntroPending: false, collectionIntroShown: true,
      journeyProgress: { claimedMilestoneLevels: [], seenEpisodeUnlockLevels: [1, 11] } });
    game.model = new PuzzleModel(LEVELS[21]);
    game.journeyHomeThemeIndex = 3;
    game.journeyHomeThemeArt = { src: "new-profile-chapter-three" };
    expect(game.beginPendingHomePresentation()).toBe(true);
    expect(game.journeyPresentation).toMatchObject({ sceneReveal: true, event: { level: 21 } });
    expect(game.featureUnlockGuide).toBeUndefined();
  });

  it("skips deferred older chapters but still reveals the newly unlocked scene before the feature guide", () => {
    const { game } = pendingGame("league", { highestLevel: 22, currentLevel: 22,
      rewardedLevels: Array.from({ length: 21 }, (_, index) => index + 1), selectedJourneyEpisode: 3,
      journeyProgress: { claimedMilestoneLevels: [], seenEpisodeUnlockLevels: [] } });
    game.requestJourneyHomeThemeArt = vi.fn();
    expect(game.beginPendingHomePresentation()).toBe(true);
    expect(game.journeyPresentation).toMatchObject({ sceneReveal: false, event: { level: 11 } });
    game.deferJourneyPresentation();
    game.beginPendingHomePresentation();
    expect(game.featureUnlockGuide).toBeUndefined();
    expect(game.journeyPresentation).toMatchObject({ sceneReveal: true, event: { level: 21 } });
    expect(game.save.journeyProgress.seenEpisodeUnlockLevels).toEqual([]);

    game.deferJourneyPresentation();
    expect(game.featureUnlockGuide?.feature).toBe("league");
    focusGuide(game);
    touch(game, entryRect(game, "league"));
    expect(game.screen).toBe("league");
    game.screen = "home";
    for (let index = 0; index < 3; index++) expect(game.beginPendingHomePresentation()).toBe(false);
    expect(game.journeyPresentation).toBeUndefined();
    expect(game.save.journeyProgress.seenEpisodeUnlockLevels).toEqual([]);
  });

  it("reveals the unlock card and waits for Look before focusing the entry", () => {
    const { game } = pendingGame();
    const before = clone(game.save);
    game.beginPendingFeatureGuide();
    expect(game.featureUnlockGuide).toMatchObject({ phase: "reveal", age: 0 });
    expect(game.featureUnlockGuideReady()).toBe(false);
    expect(game.featureGuideTargets()).toEqual([]);
    touch(game, game.featureGuideLayout().look);
    touch(game, game.featureGuideLayout().later);
    touch(game, entryRect(game, "leaderboard"));
    expect(game.featureUnlockGuide.phase).toBe("reveal");
    game.updateFeatureUnlockGuide(0.749);
    expect(game.featureUnlockGuideReady()).toBe(false);
    game.updateFeatureUnlockGuide(0.001);
    expect(game.featureUnlockGuideReady()).toBe(true);
    expect(game.featureGuideTargets()).toEqual([
      ["featureGuide.look", game.featureGuideLayout().look],
    ]);
    for (let index = 0; index < 30; index++) game.updateFeatureUnlockGuide(0.1);
    touch(game, entryRect(game, "leaderboard"));
    expect(game.save).toEqual(before);
    expect(game.featureUnlockGuide.phase).toBe("reveal");
    expect(game.screen).toBe("home");
    expect(game.host.storageSet).not.toHaveBeenCalled();
    touch(game, game.featureGuideLayout().look);
    expect(game.featureUnlockGuide).toMatchObject({ phase: "focus", age: 0 });
    expect(game.featureGuideTargets()).toEqual([["featureGuide.entry", entryRect(game, "leaderboard")]]);
    expect(game.save).toEqual(before);
    expect(game.host.storageSet).not.toHaveBeenCalled();
  });

  it.each(["reveal", "focus"])("pauses %s age and disables its actions in the background", phase => {
    const { game } = pendingGame();
    if (phase === "focus") focusGuide(game);
    else game.beginPendingFeatureGuide();
    game.updateFeatureUnlockGuide(0.1);
    const age = game.featureUnlockGuide.age;
    game.appVisible = false;
    game.updateFeatureUnlockGuide(30);
    expect(game.featureUnlockGuide.age).toBe(age);
    expect(game.featureUnlockGuideReady()).toBe(false);
    expect(game.featureGuideTargets()).toEqual([]);
    game.finishFeatureUnlockGuide(phase === "focus");
    expect(game.featureUnlockGuide.phase).toBe(phase);
    expect(game.save.featureGuideProgress.pending).toEqual(["leaderboard"]);
    expect(game.host.storageSet).not.toHaveBeenCalled();
  });

  it("reduced motion still requires Look followed by an explicit entry release", () => {
    const { game } = pendingGame("supply", { reducedMotion: true });
    game.beginPendingFeatureGuide();
    game.updateFeatureUnlockGuide(0);
    expect(game.featureUnlockGuideReady()).toBe(true);
    expect(game.featureUnlockGuide.phase).toBe("reveal");
    expect(game.screen).toBe("home");
    expect(game.host.storageSet).not.toHaveBeenCalled();
    touch(game, entryRect(game, "supply"));
    expect(game.featureUnlockGuide.phase).toBe("reveal");
    const look = center(game.featureGuideLayout().look);
    game.handleDown(look);
    expect(game.featureUnlockGuide.phase).toBe("reveal");
    game.handleUp(look);
    expect(game.featureUnlockGuide.phase).toBe("focus");
    expect(game.host.storageSet).not.toHaveBeenCalled();
    const point = center(entryRect(game, "supply"));
    game.handleDown(point);
    expect(game.screen).toBe("home");
    expect(game.host.storageSet).not.toHaveBeenCalled();
    game.handleUp(point);
    expect(game.screen).toBe("supply");
    expect(game.save.featureGuideProgress.seen).toEqual(["supply"]);
  });

  it("animates the focused hand and stops dirtying a reduced-motion guide", () => {
    const { game } = pendingGame();
    focusGuide(game);
    const age = game.featureUnlockGuide.age;
    game.dirty = false;
    game.updateFeatureUnlockGuide(0.1);
    expect(game.featureUnlockGuide.age).toBeGreaterThan(age);
    expect(game.dirty).toBe(true);
    game.save.reducedMotion = true;
    game.updateFeatureUnlockGuide(0);
    const reducedAge = game.featureUnlockGuide.age;
    game.dirty = false;
    for (let index = 0; index < 20; index++) game.updateFeatureUnlockGuide(0.1);
    expect(game.featureUnlockGuide.age).toBe(reducedAge);
    expect(game.dirty).toBe(false);
  });
});

describe("feature guide acknowledgement and actual pointer entry", () => {
  it("ignores the removed Later region while preserving internal acknowledgement compatibility", () => {
    const { game, storage } = pendingGame("dailyChallenge");
    readyGuide(game);
    const before = economicSnapshot(game.save);
    const point = center(game.featureGuideLayout().later);
    game.handleDown(point);
    expect(game.save.featureGuideProgress.pending).toEqual(["dailyChallenge"]);
    expect(game.host.storageSet).not.toHaveBeenCalled();
    game.handleUp(point);
    expect(game.featureUnlockGuide).toMatchObject({ feature: "dailyChallenge", phase: "reveal" });
    expect(game.pendingFeatureGuideAck).toBeUndefined();
    expect(game.save.featureGuideProgress).toEqual({ version: 1, pending: ["dailyChallenge"], seen: [] });
    expect(economicSnapshot(game.save)).toEqual(before);
    expect(game.host.storageSet).not.toHaveBeenCalled();
    // The removed control has no UI acknowledgement path. Keep coverage of
    // the internal false branch used for save-transaction compatibility.
    game.finishFeatureUnlockGuide(false);
    expect(game.featureUnlockGuide).toBeUndefined();
    expect(game.pendingFeatureGuideAck).toBeUndefined();
    expect(game.screen).toBe("home");
    expect(game.requestDailyChallengeArt).not.toHaveBeenCalled();
    expect(game.save.featureGuideProgress).toEqual({ version: 1, pending: [], seen: ["dailyChallenge"] });
    expect(economicSnapshot(game.save)).toEqual(before);
    expect(storage.value).toEqual(game.save);
    const reloaded = guideGame(storage.value.highestLevel, storage.value).game;
    expect(reloaded.beginPendingFeatureGuide()).toBe(false);
    expect(game.host.storageSet).toHaveBeenCalledTimes(1);
  });

  it.each(["reject", "unknown-after-write"] as const)("retries a %s internal acknowledgement without changing its candidate or opening the page", mode => {
    const { game, storage } = pendingGame("dailyChallenge");
    readyGuide(game);
    const before = clone(game.save);
    const layout = game.featureGuideLayout();
    storage.mode = mode;
    // Invoke only the internal compatibility branch; Later is no longer a UI action.
    game.finishFeatureUnlockGuide(false);
    const pending = game.pendingFeatureGuideAck;
    expect(pending).toMatchObject({ feature: "dailyChallenge", open: false });
    expect(pending.candidateSave.featureGuideProgress).toEqual({ version: 1, pending: [], seen: ["dailyChallenge"] });
    expect(game.save).toEqual(before);
    expect(game.featureUnlockGuide.phase).toBe("reveal");
    expect(game.screen).toBe("home");
    expect(game.featureGuideTargets()).toEqual([["featureGuide.retry", layout.look]]);
    const candidateBefore = clone(pending.candidateSave);
    const age = game.featureUnlockGuide.age;
    vi.setSystemTime(NOW + 86_400_000);
    game.updateFeatureUnlockGuide(30);
    game.ensureDailyTaskCycle();
    game.dailyChallengeState();
    game.refreshLeague();
    touch(game, layout.later);
    touch(game, entryRect(game, "dailyChallenge"));
    expect(game.pendingFeatureGuideAck).toBe(pending);
    expect(pending.candidateSave).toEqual(candidateBefore);
    expect(game.featureUnlockGuide.age).toBe(age);
    expect(game.save).toEqual(before);
    expect(game.host.storageSet).toHaveBeenCalledTimes(1);
    storage.mode = "commit";
    touch(game, layout.look);
    expect(game.host.storageSet.mock.calls[1][1]).toBe(pending.candidateSave);
    expect(game.save).toBe(pending.candidateSave);
    expect(game.pendingFeatureGuideAck).toBeUndefined();
    expect(game.featureUnlockGuide).toBeUndefined();
    expect(game.screen).toBe("home");
    expect(game.requestDailyChallengeArt).not.toHaveBeenCalled();
    expect(economicSnapshot(game.save)).toEqual(economicSnapshot(before));
    expect(game.host.storageSet).toHaveBeenCalledTimes(2);
  });

  it("internal acknowledgement advances an existing queue without opening either page", () => {
    const { game } = pendingGame("supply", {
      featureGuideProgress: { version: 1, pending: ["leaderboard", "supply"], seen: [] },
    });
    readyGuide(game);
    expect(game.featureUnlockGuide.feature).toBe("leaderboard");
    // Preserve queue behavior for the internal compatibility branch, not a removed button.
    game.finishFeatureUnlockGuide(false);
    expect(game.featureUnlockGuide).toMatchObject({ feature: "supply", phase: "reveal", age: 0 });
    expect(game.save.featureGuideProgress).toEqual({ version: 1, pending: ["supply"], seen: ["leaderboard"] });
    expect(game.screen).toBe("home");
    expect(game.host.storageSet).toHaveBeenCalledTimes(1);
  });

  it("does not focus the entry when Look is pressed before readiness or released elsewhere", () => {
    const { game } = pendingGame();
    game.beginPendingFeatureGuide();
    const point = center(game.featureGuideLayout().look);
    game.handleDown(point);
    game.updateFeatureUnlockGuide(0.75);
    game.handleUp(point);
    expect(game.featureUnlockGuide.phase).toBe("reveal");
    game.handleDown(point);
    game.handleUp({ ...point, id: 2 });
    expect(game.featureUnlockGuide.phase).toBe("reveal");
    game.handleUp({ ...point, x: 250, y: 100 });
    expect(game.featureUnlockGuide.phase).toBe("reveal");
    expect(game.save.featureGuideProgress.pending).toEqual(["leaderboard"]);
    expect(game.host.storageSet).not.toHaveBeenCalled();
  });

  it("entry acknowledges durably without spending and does not replay after reload", () => {
    const { game, storage } = pendingGame("supply");
    focusGuide(game);
    const before = economicSnapshot(game.save);
    touch(game, entryRect(game, "supply"));
    expect(game.featureUnlockGuide).toBeUndefined();
    expect(game.save.featureGuideProgress).toEqual({ version: 1, pending: [], seen: ["supply"] });
    expect(storage.value.featureGuideProgress).toEqual(game.save.featureGuideProgress);
    expect(economicSnapshot(game.save)).toEqual(before);
    expect(game.screen).toBe("supply");
    game.save = game.sanitizeSave(storage.value);
    game.screen = "home";
    expect(game.beginPendingFeatureGuide()).toBe(false);
    expect(game.host.storageSet).toHaveBeenCalledTimes(1);
  });

  it("a rejected acknowledgement retains the guide and does not mark it seen or navigate", () => {
    const { game, storage } = pendingGame("dailyChallenge");
    focusGuide(game);
    const before = clone(game.save);
    storage.mode = "reject";
    touch(game, entryRect(game, "dailyChallenge"));
    expect(game.save).toEqual(before);
    expect(storage.value).toEqual(before);
    expect(game.featureUnlockGuide).toBeDefined();
    expect(game.screen).toBe("home");
    expect(game.requestDailyChallengeArt).not.toHaveBeenCalled();
    expect(game.featureGuideTargets()).toEqual([["featureGuide.retry", entryRect(game, "dailyChallenge")]]);
    storage.mode = "commit";
    touch(game, entryRect(game, "dailyChallenge"));
    expect(game.screen).toBe("dailyChallenge");
    expect(game.save.featureGuideProgress.seen).toEqual(["dailyChallenge"]);
    expect(game.save.dailyChallenge.attemptsRemaining).toBe(before.dailyChallenge.attemptsRemaining);
  });

  it("retries an unknown acknowledgement at the same entry with the identical candidate", () => {
    const { game, storage } = pendingGame("dailyChallenge");
    focusGuide(game);
    const before = clone(game.save);
    storage.mode = "unknown-after-write";
    touch(game, entryRect(game, "dailyChallenge"));
    const pending = game.pendingFeatureGuideAck;
    expect(pending).toMatchObject({ feature: "dailyChallenge" });
    expect(pending.candidateSave.featureGuideProgress.pending).toEqual([]);
    expect(game.save).toEqual(before);
    expect(game.featureUnlockGuide).toBeDefined();
    expect(game.screen).toBe("home");
    expect(game.requestDailyChallengeArt).not.toHaveBeenCalled();
    expect(game.featureGuideTargets()).toEqual([["featureGuide.retry", entryRect(game, "dailyChallenge")]]);
    storage.mode = "commit";
    touch(game, entryRect(game, "dailyChallenge"));
    expect(game.host.storageSet.mock.calls[1][1]).toBe(pending.candidateSave);
    expect(game.save).toBe(pending.candidateSave);
    expect(game.pendingFeatureGuideAck).toBeUndefined();
    expect(game.screen).toBe("dailyChallenge");
    expect(economicSnapshot(game.save)).toEqual(economicSnapshot(before));
    expect(game.host.storageSet).toHaveBeenCalledTimes(2);
  });

  it("accepts a lost acknowledgement only after verified readback of that candidate", () => {
    const { game, storage } = pendingGame();
    focusGuide(game);
    storage.mode = "lost-ack";
    touch(game, entryRect(game, "leaderboard"));
    expect(game.host.storageRead).toHaveBeenCalled();
    expect(game.featureUnlockGuide).toBeUndefined();
    expect(game.save.featureGuideProgress.seen).toEqual(["leaderboard"]);
    expect(storage.value).toEqual(game.save);
  });

  it("protects an unknown guide candidate from navigation, daily rollover and league refresh", () => {
    const { game, storage } = pendingGame("league");
    focusGuide(game);
    const before = clone(game.save);
    storage.mode = "unknown-after-write";
    touch(game, entryRect(game, "league"));
    const pending = game.pendingFeatureGuideAck;
    expect(pending).toBeDefined();
    const immutable = clone(pending.candidateSave);
    const writes = game.host.storageSet.mock.calls.length;
    vi.setSystemTime(NOW + 86_400_000);
    game.loadLevel(1, false);
    game.ensureDailyTaskCycle();
    game.dailyChallengeState();
    game.refreshLeague();
    expect(game.pendingFeatureGuideAck).toBe(pending);
    expect(pending.candidateSave).toEqual(immutable);
    expect(game.save).toEqual(before);
    expect(game.screen).toBe("home");
    expect(game.host.storageSet).toHaveBeenCalledTimes(writes);
    storage.mode = "commit";
    touch(game, entryRect(game, "league"));
    expect(game.host.storageSet.mock.calls[writes][1]).toBe(pending.candidateSave);
    expect(game.save.featureGuideProgress.seen).toEqual(["league"]);
  });

  it("removes the card actions when the hand focuses the entry", () => {
    const { game } = pendingGame();
    focusGuide(game);
    touch(game, game.featureGuideLayout().look);
    touch(game, game.featureGuideLayout().later);
    expect(game.featureUnlockGuide.phase).toBe("focus");
    expect(game.save.featureGuideProgress.pending).toEqual(["leaderboard"]);
    expect(game.host.storageSet).not.toHaveBeenCalled();
    expect(game.screen).toBe("home");
  });

  it.each(GUIDED)("opens only the %s page after down/up on its real highlighted entry", feature => {
    const { game } = pendingGame(feature);
    const before = economicSnapshot(game.save);
    focusGuide(game);
    const point = center(entryRect(game, feature));
    game.handleDown(point);
    expect(game.screen).toBe("home");
    expect(game.save.featureGuideProgress.pending).toEqual([feature]);
    game.handleUp(point);
    expect(game.screen).toBe(feature);
    expect(game.featureUnlockGuide).toBeUndefined();
    expect(game.save.featureGuideProgress.seen).toEqual([feature]);
    expect(economicSnapshot(game.save)).toEqual(before);
    expect(game.leagueRun).toBeUndefined();
    expect(game.save.activeRun).toBeUndefined();
    if (feature === "league") {
      expect(game.leagueIntroPage).toBe(0);
      expect(game.save.leagueIntroSeen).toBe(false);
    }
  });

  it("blocks Start and unrelated navigation during the card and the hand guide", () => {
    const { game } = pendingGame("leaderboard");
    const start = vi.spyOn(game, "beginSelectedChallenge");
    const before = clone(game.save);
    game.beginPendingFeatureGuide();
    touch(game, homeRect(HOME_ART_LAYOUT.start));
    touch(game, game.mainNavigationRect(4));
    expect(game.screen).toBe("home");
    for (let index = 0; index < 30; index++) game.updateFeatureUnlockGuide(0.1);
    touch(game, homeRect(HOME_ART_LAYOUT.start));
    touch(game, game.mainNavigationRect(4));
    touch(game, game.featureGuideLayout().look);
    expect(game.featureUnlockGuide.phase).toBe("focus");
    touch(game, homeRect(HOME_ART_LAYOUT.start));
    touch(game, game.mainNavigationRect(4));
    expect(start).not.toHaveBeenCalled();
    expect(game.screen).toBe("home");
    expect(game.save).toEqual(before);
    expect(game.host.storageSet).not.toHaveBeenCalled();
  });

  it("does not activate the focused entry after release outside or with another pointer", () => {
    const { game } = pendingGame();
    focusGuide(game);
    const point = center(entryRect(game, "leaderboard"));
    game.handleDown(point);
    game.handleUp({ ...point, id: 2 });
    expect(game.screen).toBe("home");
    game.handleUp({ ...point, x: 250, y: 100 });
    expect(game.screen).toBe("home");
    expect(game.save.featureGuideProgress.pending).toEqual(["leaderboard"]);
    expect(game.host.storageSet).not.toHaveBeenCalled();
  });
});

describe("supplied feature unlock art lifecycle", () => {
  it("waits for the complete image group before revealing or accepting card actions", async () => {
    const { game } = pendingGame();
    delete game.requestFeatureUnlockArt;
    game.featureUnlockArt = undefined;
    const batch = deferredImages();
    game.loadImages = vi.fn(() => batch.promise);
    const before = clone(game.save);
    expect(game.beginPendingFeatureGuide()).toBe(true);
    expect(game.featureUnlockArtLoading).toBe(true);
    game.updateFeatureUnlockGuide(10);
    expect(game.featureUnlockGuide.age).toBe(0);
    expect(game.featureUnlockGuideReady()).toBe(false);
    expect(game.featureGuideTargets()).toEqual([]);
    touch(game, game.featureGuideLayout().look);
    touch(game, game.featureGuideLayout().later);
    expect(game.featureUnlockGuide.phase).toBe("reveal");
    expect(game.save).toEqual(before);
    expect(game.host.storageSet).not.toHaveBeenCalled();
    const images = Object.values(featureArtFixture());
    batch.resolve(images);
    await flushImageLoads();
    expect(game.featureUnlockArtLoading).toBe(false);
    expect(Object.values(game.featureUnlockArt)).toEqual(images);
    expect(game.featureUnlockGuide.age).toBe(0);
    game.updateFeatureUnlockGuide(0.75);
    expect(game.featureUnlockGuideReady()).toBe(true);
    expect(game.loadImages).toHaveBeenCalledOnce();
    expect(game.host.releaseImage).not.toHaveBeenCalled();
  });

  it("releases partial loads and retries only from the image retry button without acknowledging the guide", async () => {
    const { game } = pendingGame();
    delete game.requestFeatureUnlockArt;
    game.featureUnlockArt = undefined;
    game.artLoadedImageCount = 0;
    let failOnce = true;
    const images: HTMLImageElement[] = [];
    game.host.createImage.mockImplementation(async (src: string) => {
      if (failOnce && src === FEATURE_UNLOCK_ART.glow) {
        failOnce = false;
        throw new Error("isolated feature image failure");
      }
      const image = { src } as HTMLImageElement;
      images.push(image);
      return image;
    });
    const before = clone(game.save);
    game.beginPendingFeatureGuide();
    await flushImageLoads();
    expect(game.featureUnlockArt).toBeUndefined();
    expect(game.featureUnlockArtLoading).toBe(false);
    expect(game.featureUnlockArtError).toBe("isolated feature image failure");
    expect(game.featureGuideTargets()).toEqual([["featureGuide.artRetry", game.featureGuideLayout().look]]);
    const partialCount = images.length, requests = game.host.createImage.mock.calls.length;
    expect(partialCount).toBeGreaterThan(0);
    expect(partialCount).toBeLessThan(Object.keys(FEATURE_UNLOCK_ART).length);
    expect(game.host.releaseImage.mock.calls.map((call: unknown[]) => call[0])).toEqual(images);
    for (let index = 0; index < 5; index++) {
      game.beginPendingFeatureGuide();
      game.updateFeatureUnlockGuide(10);
    }
    await flushImageLoads();
    expect(game.host.createImage).toHaveBeenCalledTimes(requests);
    expect(game.featureUnlockGuide.age).toBe(0);
    touch(game, game.featureGuideLayout().later);
    expect(game.save).toEqual(before);
    const point = center(game.featureGuideLayout().look);
    game.handleDown(point);
    expect(game.host.createImage).toHaveBeenCalledTimes(requests);
    game.handleUp(point);
    expect(game.featureUnlockArtLoading).toBe(true);
    await flushImageLoads();
    expect(game.featureUnlockArtError).toBeUndefined();
    expect(game.featureUnlockArtLoading).toBe(false);
    expect(Object.values(game.featureUnlockArt)).toHaveLength(11);
    expect(game.host.createImage.mock.calls.slice(requests).map((call: string[]) => call[0]))
      .toEqual(Object.values(FEATURE_UNLOCK_ART));
    expect(game.host.releaseImage).toHaveBeenCalledTimes(partialCount);
    expect(game.featureUnlockGuide).toMatchObject({ phase: "reveal", age: 0 });
    expect(game.pendingFeatureGuideAck).toBeUndefined();
    expect(game.save).toEqual(before);
    expect(game.host.storageSet).not.toHaveBeenCalled();
    game.updateFeatureUnlockGuide(0.75);
    expect(game.featureUnlockGuideReady()).toBe(true);
  });

  it("releases a late old image batch without replacing a newer guide after level navigation", async () => {
    const { game } = pendingGame();
    delete game.requestFeatureUnlockArt;
    game.featureUnlockArt = undefined;
    const oldBatch = deferredImages(), newBatch = deferredImages();
    game.loadImages = vi.fn().mockReturnValueOnce(oldBatch.promise).mockReturnValueOnce(newBatch.promise);
    game.beginPendingFeatureGuide();
    const oldGuide = game.featureUnlockGuide;
    game.loadLevel(7, false);
    expect(game.featureUnlockGuide).toBeUndefined();
    game.beginPendingFeatureGuide();
    const newGuide = game.featureUnlockGuide;
    expect(newGuide).not.toBe(oldGuide);
    expect(game.featureUnlockArtLoading).toBe(true);
    const writes = game.host.storageSet.mock.calls.length;
    const oldImages = Object.values(featureArtFixture()), newImages = Object.values(featureArtFixture());
    oldBatch.resolve(oldImages);
    await flushImageLoads();
    expect(game.featureUnlockGuide).toBe(newGuide);
    expect(game.featureUnlockArt).toBeUndefined();
    expect(game.featureUnlockArtLoading).toBe(true);
    expect(game.host.releaseImage.mock.calls.map((call: unknown[]) => call[0])).toEqual(oldImages);
    newBatch.resolve(newImages);
    await flushImageLoads();
    expect(Object.values(game.featureUnlockArt)).toEqual(newImages);
    expect(game.featureUnlockArtLoading).toBe(false);
    expect(game.featureUnlockGuide).toBe(newGuide);
    expect(game.save.featureGuideProgress).toEqual({ version: 1, pending: ["leaderboard"], seen: [] });
    expect(game.host.storageSet).toHaveBeenCalledTimes(writes);
  });

  it("retains card images through the exit and releases them once when focus takes over", () => {
    const { game } = pendingGame();
    readyGuide(game);
    const art = game.featureUnlockArt;
    const ctx = { save: vi.fn(), restore: vi.fn(), translate: vi.fn(), scale: vi.fn(), globalAlpha: 1 };
    game.popupEntrance.draw(ctx, "featureUnlock", game.featureGuideLayout().panel, () => {}, false, game.featureUnlockGuide);
    game.popupEntrance.update(0.32, true, false);
    touch(game, game.featureGuideLayout().look);
    expect(game.featureUnlockGuide.phase).toBe("reveal");
    expect(game.featureUnlockArt).toBe(art);
    expect(game.host.releaseImage).not.toHaveBeenCalled();
    game.popupEntrance.update(0.32, true, false);
    expect(game.popupEntrance.flushExits()).toBe(true);
    expect(game.featureUnlockGuide.phase).toBe("focus");
    expect(game.featureUnlockGuideReady()).toBe(true);
    expect(game.featureUnlockArt).toBeUndefined();
    expect(game.host.releaseImage).toHaveBeenCalledTimes(11);
    for (const image of Object.values(art)) expect(game.host.releaseImage).toHaveBeenCalledWith(image);
    touch(game, entryRect(game, "leaderboard"));
    expect(game.screen).toBe("leaderboard");
    expect(game.save.featureGuideProgress.seen).toEqual(["leaderboard"]);
    expect(game.host.releaseImage).toHaveBeenCalledTimes(11);
  });
});
