import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clonePlainData as clone } from "../src/core/clonePlainData";
import { DAILY_CHALLENGE_REWARDS } from "../src/core/dailyChallenge";
import { DAILY_TASK_DEFINITIONS } from "../src/core/dailyTasks";
import { FEATURE_UNLOCKS, type FeatureId } from "../src/core/featureUnlocks";
import { JOURNEY_EPISODES, JOURNEY_MILESTONE_REWARDS } from "../src/core/journeyProgress";
import { LEVELS } from "../src/core/levels";
import { advanceLeague, beijingMidnight, createLeague, finishLeagueAttempt, LEAGUE_PERIOD_MS, startLeagueAttempt } from "../src/core/league";
import { LeagueRun } from "../src/core/leagueRun";
import { PuzzleModel } from "../src/core/PuzzleModel";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";
import { PopupEntranceController } from "../src/game/popupEntrance";
import { CountdownWarning } from "../src/game/countdownWarning";
import { HOME_ARTBOARD, HOME_ART_LAYOUT } from "../src/game/homeArtLayout";
import { LeagueScroll } from "../src/game/leagueScroll";
import { homeCoinFlightDuration } from "../src/game/completionFlow";

const NOW = new Date("2026-10-08T06:00:00.000Z").getTime();
const features = Object.keys(FEATURE_UNLOCKS) as FeatureId[];
const flush = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };
const center = (rect: { x: number; y: number; width: number; height: number }) => (
  { id: 1, x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
);
const homeRect = (rect: { x: number; y: number; width: number; height: number }) => {
  const scale = 496 / HOME_ARTBOARD.width;
  return { x: rect.x * scale, y: (1078 - HOME_ARTBOARD.height * scale) / 2 + rect.y * scale,
    width: rect.width * scale, height: rect.height * scale };
};

/** Real feature/action/settlement methods and verified persistence, with memory
 * storage and synthetic image completion. No player save or gameplay solver. */
function featureGame(highestLevel: number, overrides: Record<string, unknown> = {}) {
  const game = Object.create(ColorEscapeGame.prototype) as any;
  game.popupEntrance = new PopupEntranceController();
  game.countdownWarning = new CountdownWarning();
  game.playableClockSlices = { reset: vi.fn() };
  game.save = game.sanitizeSave({
    ...game.sanitizeSave(undefined),
    highestLevel, currentLevel: highestLevel,
    rewardedLevels: Array.from({ length: highestLevel - 1 }, (_, index) => index + 1),
    coins: 1254, boosters: { time: 0, rocket: 0, pulse: 0 },
    collectionIntroShown: true, collectionIntroPending: false,
    journeyProgress: { claimedMilestoneLevels: [], seenEpisodeUnlockLevels: [] },
    ...overrides,
  });
  game.model = new PuzzleModel(LEVELS[game.save.currentLevel - 1]);
  game.completionMetrics = { moves: 1, elapsedSeconds: 1 };
  game.runElapsedSeconds = 1;
  game.screen = "home";
  game.appVisible = true;
  game.artReady = true;
  game.storageBaselineReady = true;
  game.storageReadAttempts = 0;
  game.settlementSaveAttempts = 0;
  game.art = { home: { src: "default-home" }, homeUi: {} };
  game.leagueScroll = new LeagueScroll();
  game.journeyHomeThemeRequestToken = 0;
  game.journeyHomeThemeIndex = game.save.selectedJourneyEpisode;
  game.journeyHomeThemeArt = { src: "selected-home" };
  game.journeyHomeThemeLoading = false;
  game.journeyHomeThemeFailed = false;
  game.achievementScrollOffset = 0;
  game.safeOffsets = () => ({ top: 0, bottom: 0 });
  game.viewportTransform = () => ({ scale: 1, offsetY: 0 });
  game.formalPageForScreen = () => undefined;
  game.formalPageArtFor = () => undefined;
  game.formalPageReady = () => false;
  game.formalPageFailed = () => false;
  game.mainNavigationInteractive = () => false;
  for (const method of [
    "playSound", "vibrate", "scheduleFrame", "emitBurst", "requestWinArt", "releaseWinArt",
    "releaseFormalPageArt", "releaseDailyChallengeArt", "releaseCollectionAlbumArt",
    "releaseAchievementArt", "cancelDailyTaskRefreshWatch", "releaseDailyTaskArt",
    "captureInitialGeneratorSpawns", "requestCollectionAlbumArtwork", "setFormalPageIntent",
    "requestDailyTaskArt", "requestDailyChallengeArt", "requestAchievementArt",
    "scheduleDailyTaskRefreshWatch", "scheduleLifeRefreshWatch", "refreshLifeState", "pruneMainPageArt",
    "requestLeagueArt", "requestFormalPageArt",
  ]) game[method] = vi.fn();
  const storage = {
    value: clone(game.save), mode: "commit" as "commit" | "reject" | "unknown-after-write",
  };
  game.host = {
    storageSet: vi.fn((_key: string, value: unknown) => {
      if (storage.mode === "reject") return false;
      storage.value = clone(value);
      return storage.mode === "commit";
    }),
    storageRead: vi.fn(() => storage.mode === "unknown-after-write"
      ? { status: "unavailable" } : { status: "ok", value: clone(storage.value) }),
    createImage: vi.fn((src: string) => Promise.resolve({ src } as HTMLImageElement)),
    releaseImage: vi.fn(),
  };
  return { game, storage };
}

function finishTaskProgress(game: any) {
  for (const task of game.save.dailyTaskProgress.tasks) task.progress = DAILY_TASK_DEFINITIONS[task.id as keyof typeof DAILY_TASK_DEFINITIONS].target;
  return game.save.dailyTaskProgress.tasks[0].id as string;
}

describe("shared reward-claim recording", () => {
  it("sends an incomplete daily task to the highest unlocked mainline level", () => {
    const { game, storage } = featureGame(21, { currentLevel: 3 });
    game.screen = "dailyTasks";
    game.dailyTaskArt = {};
    const beforeProgress = clone(game.save.dailyTaskProgress);
    storage.value = clone(game.save);
    vi.spyOn(game, "closePopup").mockImplementation((...args: any[]) => args[1]());
    game.refreshLifeState = () => game.save.lifeState;
    game.syncMusic = vi.fn();

    const taskId = game.save.dailyTaskProgress.tasks[0].id;
    game.activateDailyTask(taskId);

    expect(game.model.level.id).toBe(21);
    expect(game.save.currentLevel).toBe(21);
    expect(game.save.activeRun).toMatchObject({ levelId: 21, returnLevelId: 21, lifeStarted: false });
    expect(game.screen).toBe("playing");
    expect(game.save.dailyTaskProgress).toEqual(beforeProgress);
    expect(game.save.coins).toBe(1254);
    expect(storage.value.currentLevel).toBe(21);
  });

  it("keeps sound disabled while allowing a second Pointer reward claim during the flight", () => {
    const { game, storage } = featureGame(21, { sound: false });
    finishTaskProgress(game);
    storage.value = clone(game.save);
    game.screen = "dailyTasks"; game.dailyTaskArt = {};
    game.playSound = ColorEscapeGame.prototype["playSound"];
    game.syncMusic = vi.fn(); game.host.sound = vi.fn();
    for (let index = 0; index < 2; index += 1) {
      const task = game.dailyTaskSummary().tasks.find((row: any) => row.claimable);
      const point = center(game.dailyTaskClaimRect(task.id));
      game.handleDown(point); game.handleUp(point);
      expect(game.homeCoinFlight).toMatchObject({ kind: "coins", age: 0 });
      expect(game.homeCoinFlights).toHaveLength(index + 1);
    }
    expect(game.host.storageSet).toHaveBeenCalledTimes(2);
    expect(game.host.sound).not.toHaveBeenCalled();
    expect(game.save.sound).toBe(false);
  });

  it.each(["daily-task", "achievement"] as const)("keeps the first %s flight running when a later Pointer claim launches another", source => {
    const { game, storage } = featureGame(21);
    finishTaskProgress(game);
    game.screen = source === "daily-task" ? "dailyTasks" : "achievements";
    game.dailyTaskArt = {};
    game.achievementArt = {};
    storage.value = clone(game.save);
    const startingCoins = game.save.coins;
    let firstFlight: any;
    for (let index = 0; index < 2; index += 1) {
      const entry = source === "daily-task"
        ? game.dailyTaskSummary().tasks.find((row: any) => row.claimable)
        : game.achievementEntries().find((row: any) => row.claimable);
      expect(entry).toBeDefined();
      const rect = source === "daily-task" ? game.dailyTaskClaimRect(entry.id)
        : game.achievementClaimRect(game.achievementEntries().findIndex((row: any) => row.id === entry.id));
      const point = center(rect);
      expect(game.buttonReleaseTargetAt(point)?.key).toBe(`${source === "daily-task" ? "dailyTaskClaim" : "achievementClaim"}.${entry.id}`);
      game.handleDown(point);
      expect(game.pendingButtonPress).toBeDefined();
      game.handleUp(point);
      expect(game.homeCoinFlights).toHaveLength(index + 1);
      if (index === 0) {
        firstFlight = game.homeCoinFlight;
        game.updateHomeCoinFlight(0.4);
      } else {
        expect(game.homeCoinFlights[0]).toBe(firstFlight);
        expect(firstFlight.age).toBeCloseTo(0.4);
        expect(game.homeCoinFlights[1]).toMatchObject({ kind: "coins", age: 0 });
      }
      expect(game.playSound.mock.calls.filter(([kind]: [string]) => kind === "gold")).toHaveLength(index + 1);
      expect(game.host.storageSet).toHaveBeenCalledTimes(index + 1);
    }
    expect(game.save.coins).toBeGreaterThan(startingCoins);
    expect(storage.value.coins).toBe(game.save.coins);
  });

  it("does not let a second task claim replace an unconfirmed candidate while the earlier coin flight is visible", () => {
    const { game, storage } = featureGame(21);
    finishTaskProgress(game);
    game.screen = "dailyTasks";
    game.dailyTaskArt = {};
    storage.value = clone(game.save);
    const tasks = game.dailyTaskSummary().tasks;
    game.claimDailyTaskReward(tasks[0].id);
    const committedCoins = game.save.coins;
    const oldFlight = game.homeCoinFlight;
    storage.mode = "unknown-after-write";
    const press = (id: string) => {
      const point = center(game.dailyTaskClaimRect(id));
      game.handleDown(point); game.handleUp(point);
    };
    press(tasks[1].id);
    const pending = game.pendingDailyTaskClaim.candidateSave;
    press(tasks[2].id);
    expect(game.pendingDailyTaskClaim.candidateSave).toBe(pending);
    expect(game.host.storageSet).toHaveBeenCalledTimes(2);
    expect(game.save.coins).toBe(committedCoins);
    expect(game.homeCoinFlight).toBe(oldFlight);
    expect(game.homeCoinFlights).toEqual([oldFlight]);
    expect(game.playSound.mock.calls.filter(([kind]: [string]) => kind === "gold")).toHaveLength(1);
    storage.mode = "commit";
    press(tasks[1].id);
    expect(game.pendingDailyTaskClaim).toBeUndefined();
    expect(game.host.storageSet.mock.calls[2][1]).toBe(pending);
    expect(game.playSound.mock.calls.filter(([kind]: [string]) => kind === "gold")).toHaveLength(2);
    expect(game.homeCoinFlights).toHaveLength(2);
    expect(game.homeCoinFlights[0]).toBe(oldFlight);
    press(tasks[1].id);
    expect(game.homeCoinFlights).toHaveLength(2);
    expect(game.host.storageSet).toHaveBeenCalledTimes(3);
  });

  it("keeps the wallet steady when a second task is claimed during the first task's arrivals", () => {
    const { game, storage } = featureGame(21);
    finishTaskProgress(game);
    game.screen = "dailyTasks";
    storage.value = clone(game.save);
    const [firstTask, secondTask] = game.dailyTaskSummary().tasks;
    game.claimDailyTaskReward(firstTask.id);
    const firstFlight = game.homeCoinFlight;
    game.updateHomeCoinFlight(1.1);
    expect(firstFlight.landedCount).toBe(1);
    const displayedBeforeSecondClaim = game.displayedHomeCoins();
    game.claimDailyTaskReward(secondTask.id);
    expect(game.displayedHomeCoins()).toBe(displayedBeforeSecondClaim);
    expect(firstFlight.age).toBeCloseTo(1.1);
    expect(firstFlight.landedCount).toBe(1);
    game.save.coins -= 100;
    expect(game.displayedHomeCoins()).toBe(displayedBeforeSecondClaim - 100);
    game.updateHomeCoinFlight(100);
    expect(game.homeCoinFlights).toEqual([]);
    expect(game.displayedHomeCoins()).toBe(game.save.coins);
    expect(game.playSound.mock.calls.filter(([kind]: [string]) => kind === "itemArrival")).toHaveLength(10);
    expect(game.host.storageSet).toHaveBeenCalledTimes(2);
  });

  it.each([false, true])("runs the last task coins and inspiration bonus independently with reducedMotion=%s", reducedMotion => {
    const { game, storage } = featureGame(21, { reducedMotion });
    finishTaskProgress(game);
    const tasks = game.save.dailyTaskProgress.tasks;
    for (const task of tasks.slice(1)) task.claimed = true;
    game.screen = "dailyTasks";
    game.beginPendingHomePresentation = vi.fn();
    storage.value = clone(game.save);
    const initialInspiration = game.save.collectionProgress.inspiration;
    game.claimDailyTaskReward(tasks[0].id);
    const firstFlight = game.homeCoinFlight;
    const lead = reducedMotion ? 0.2 : 0.8;
    game.updateHomeCoinFlight(lead);
    game.claimDailyTaskReward("bonus");
    const secondFlight = game.homeCoinFlights[1];
    expect(game.homeCoinFlights).toEqual([firstFlight, secondFlight]);
    expect(secondFlight).toMatchObject({ kind: "inspiration", age: 0 });
    expect(firstFlight.age).toBeCloseTo(lead);
    expect(game.displayedRewardBalance("inspiration", game.save.collectionProgress.inspiration)).toBe(initialInspiration);
    const committed = clone(game.save);
    game.appVisible = false;
    game.updateHomeCoinFlight(100);
    expect(firstFlight.age).toBeCloseTo(lead);
    expect(secondFlight.age).toBe(0);
    game.appVisible = true;
    game.updateHomeCoinFlight(homeCoinFlightDuration(reducedMotion) - lead + 0.001);
    expect(game.homeCoinFlights).toEqual([secondFlight]);
    expect(game.displayedHomeCoins()).toBe(game.save.coins);
    expect(game.displayedRewardBalance("inspiration", game.save.collectionProgress.inspiration)).toBe(initialInspiration);
    expect(game.playSound.mock.calls.filter(([kind]: [string]) => kind === "itemArrival")).toHaveLength(reducedMotion ? 1 : 5);
    expect(game.beginPendingHomePresentation).not.toHaveBeenCalled();
    game.updateHomeCoinFlight(100);
    expect(game.homeCoinFlights).toEqual([]);
    expect(game.displayedRewardBalance("inspiration", game.save.collectionProgress.inspiration)).toBe(game.save.collectionProgress.inspiration);
    expect(game.playSound.mock.calls.filter(([kind]: [string]) => kind === "itemArrival")).toHaveLength(reducedMotion ? 2 : 10);
    expect(game.beginPendingHomePresentation).toHaveBeenCalledTimes(1);
    game.claimDailyTaskReward("bonus");
    expect(game.save).toEqual(committed);
    expect(game.host.storageSet).toHaveBeenCalledTimes(2);
    expect(game.playSound.mock.calls.filter(([kind]: [string]) => kind === "gold")).toHaveLength(2);
  });

  it("clears a previous reward flight and releases its orphaned icon when beginning a new challenge", () => {
    const { game } = featureGame(21);
    const icon = { src: "inspiration.png" };
    game.dailyTaskInspirationArt = icon;
    game.beginInspirationFlight(10);
    game.dailyTaskInspirationArt = undefined;
    game.syncMusic = vi.fn();
    game.updateBoosterUnlockGuide = vi.fn();
    game.beginSelectedChallenge();
    expect(game.screen).toBe("playing");
    expect(game.homeCoinFlight).toBeUndefined();
    expect(game.inspirationFlightArt).toBeUndefined();
    expect(game.host.releaseImage).toHaveBeenCalledExactlyOnceWith(icon);
  });

  it.each(["daily-task", "achievement"] as const)("plays gold once after a committed %s claim and itemArrival once per flying coin", source => {
    const { game, storage } = featureGame(21);
    const id = finishTaskProgress(game);
    storage.value = clone(game.save);
    const before = game.save.coins;
    const claim = () => source === "daily-task" ? game.claimDailyTaskReward(id) : game.claimAchievement("levels-1");
    claim();
    expect(game.save.coins).toBeGreaterThan(before);
    expect(game.playSound.mock.calls.filter(([kind]: [string]) => kind === "gold")).toHaveLength(1);
    expect(game.playSound).not.toHaveBeenCalledWith("reward");
    const committed = clone(game.save);
    game.updateHomeCoinFlight(100);
    expect(game.playSound.mock.calls.filter(([kind]: [string]) => kind === "itemArrival")).toHaveLength(5);
    claim();
    expect(game.save).toEqual(committed);
    expect(game.playSound.mock.calls.filter(([kind]: [string]) => kind === "gold")).toHaveLength(1);
    expect(game.playSound).not.toHaveBeenCalledWith("reward");
  });

  it.each(["daily-task", "achievement"] as const)("does not play for a full-coin %s claim", source => {
    const { game, storage } = featureGame(21, { coins: 999999 });
    const id = finishTaskProgress(game);
    storage.value = clone(game.save);
    if (source === "daily-task") game.claimDailyTaskReward(id);
    else game.claimAchievement("levels-1");
    expect(game.save.coins).toBe(999999);
    expect(game.host.storageSet).not.toHaveBeenCalled();
    expect(game.playSound).not.toHaveBeenCalledWith("gold");
  });

  it.each([
    ["daily-task", "reject"], ["daily-task", "unknown-after-write"],
    ["achievement", "reject"], ["achievement", "unknown-after-write"],
  ] as const)("waits for confirmation of a %s %s claim before one recording", (source, mode) => {
    const { game, storage } = featureGame(21);
    const id = finishTaskProgress(game);
    storage.value = clone(game.save);
    const before = clone(game.save);
    const claim = () => source === "daily-task" ? game.claimDailyTaskReward(id) : game.claimAchievement("levels-1");
    storage.mode = mode;
    claim();
    expect(game.save).toEqual(before);
    expect(game.playSound).not.toHaveBeenCalledWith("gold");
    const firstCandidate = game.host.storageSet.mock.calls[0][1];
    storage.mode = "commit";
    claim();
    expect(game.save.coins).toBeGreaterThan(before.coins);
    if (mode === "unknown-after-write") expect(game.host.storageSet.mock.calls[1][1]).toBe(firstCandidate);
    expect(game.playSound.mock.calls.filter(([kind]: [string]) => kind === "gold")).toHaveLength(1);
    claim();
    expect(game.playSound.mock.calls.filter(([kind]: [string]) => kind === "gold")).toHaveLength(1);
  });

  it("uses gold once for a pure inspiration bonus and itemArrival for each flying icon", () => {
    const { game, storage } = featureGame(21);
    finishTaskProgress(game);
    for (const task of game.save.dailyTaskProgress.tasks) task.claimed = true;
    storage.value = clone(game.save);
    const before = clone(game.save);
    game.claimDailyTaskReward("bonus");
    expect(game.save.coins).toBe(before.coins);
    expect(game.save.collectionProgress.inspiration).toBeGreaterThan(before.collectionProgress.inspiration);
    expect(game.homeCoinFlight.kind).toBe("inspiration");
    expect(game.playSound.mock.calls.filter(([kind]: [string]) => kind === "gold")).toHaveLength(1);
    game.updateHomeCoinFlight(100);
    expect(game.playSound.mock.calls.filter(([kind]: [string]) => kind === "itemArrival")).toHaveLength(5);
    game.claimDailyTaskReward("bonus");
    expect(game.playSound.mock.calls.filter(([kind]: [string]) => kind === "gold")).toHaveLength(1);
    expect(game.playSound).not.toHaveBeenCalledWith("reward");
  });

  it("does not play when a league season has no earned reward", () => {
    const old = createLeague(NOW - LEAGUE_PERIOD_MS, 123, 0);
    const { game } = featureGame(21, { league: advanceLeague(old, NOW) });
    expect(game.save.league.pending.coins).toBe(0);
    const before = game.save.coins;
    expect(game.claimLeagueReward()).toBe("committed");
    expect(game.save.coins).toBe(before);
    expect(game.playSound).not.toHaveBeenCalledWith("gold");
  });
});

function oldDailyRun(game: any) {
  const sourceLevelId = 20;
  game.save.activeRun = {
    levelId: sourceLevelId, returnLevelId: game.save.currentLevel, lifeStarted: true,
    daily: true, dailyChallengeDifficulty: 1, dailyChallengeSourceLevelId: sourceLevelId,
    dailyDayKey: game.save.dailyChallenge.dayKey,
    boosterSpent: { time: 0, rocket: 0, pulse: 0 },
  };
  game.model = new PuzzleModel(LEVELS[sourceLevelId - 1]);
  game.screen = "playing";
}

function rewardPresentation(game: any) {
  game.journeyPresentation = {
    event: { type: "milestone_reward", level: 10, reward: JOURNEY_MILESTONE_REWARDS.find(reward => reward.level === 10)! },
    phase: "overlay", age: 0, intent: "reward_inspection",
  };
}

function themePresentation(game: any, episodeIndex = 2) {
  const episode = JOURNEY_EPISODES[episodeIndex - 1];
  game.journeyPresentation = {
    event: { type: "episode_unlock", level: episode.unlockLevel, episode },
    phase: "overlay", age: 0, intent: "theme_selection",
  };
}

function expectUntouched(game: any, storage: { value: unknown }, before: unknown, screen = "home") {
  expect(game.save).toEqual(before);
  expect(storage.value).toEqual(before);
  expect(game.screen).toBe(screen);
  expect(game.host.storageSet).not.toHaveBeenCalled();
  expect(game.host.createImage).not.toHaveBeenCalled();
  expect(game.playSound).toHaveBeenCalledWith("blocked");
  expect(game.playSound).not.toHaveBeenCalledWith("gold");
}

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe("feature unlock integration", () => {
  it.each(features)("uses committed progress for %s and blocks a threshold-level save without altering it", feature => {
    const threshold = FEATURE_UNLOCKS[feature].completedLevel;
    const { game, storage } = featureGame(threshold);
    const before = clone(game.save);
    game.model = new PuzzleModel(LEVELS[199]);
    expect(game.featureUnlocked(feature)).toBe(false);
    expect(game.requireFeature(feature)).toBe(false);
    expect(game.featureLockFeedback).toBeDefined();
    expect(game.scheduleFrame).toHaveBeenCalled();
    expectUntouched(game, storage, before);
    game.save.rewardedLevels.push(threshold);
    expect(game.featureUnlocked(feature)).toBe(true);
    expect(game.requireFeature(feature)).toBe(true);
    game.save.highestLevel = 200;
    game.save.currentLevel = 1;
    game.model = new PuzzleModel(LEVELS[0]);
    expect(game.featureUnlocked(feature)).toBe(true);
  });

  it.each([
    ["supply", 8, 0], ["leaderboard", 6, 1], ["levels", 10, 3],
  ] as const)("guards the %s navigation tab without changing screen or starting a transition", (feature, highest, tab) => {
    const { game, storage } = featureGame(highest);
    const before = clone(game.save);
    expect(game.handleMainNavigation(center(game.mainNavigationRect(tab)))).toBe(true);
    expect(game.featureUnlocked(feature)).toBe(false);
    expect(game.navigationTransition).toBeUndefined();
    expect(game.navigationPendingTarget).toBeUndefined();
    expect(game.setFormalPageIntent).not.toHaveBeenCalled();
    expectUntouched(game, storage, before);

    const unlocked = featureGame(highest + 1).game;
    expect(unlocked.handleMainNavigation(center(unlocked.mainNavigationRect(tab)))).toBe(true);
    expect(unlocked.screen).toBe(feature);
    expect(unlocked.navigationTransition).toMatchObject({ from: "home", to: feature });
    expect(unlocked.setFormalPageIntent).toHaveBeenCalledWith(feature);
    expect(unlocked.host.storageSet).not.toHaveBeenCalled();
  });

  it.each(features)("uses the pre-test baseline for %s instead of temporary progress", feature => {
    const threshold = FEATURE_UNLOCKS[feature].completedLevel;
    const { game, storage } = featureGame(200);
    const baseline = featureGame(threshold).game.save;
    game.temporaryLevelTestSession = { baselineSave: baseline, baselineLevelId: threshold };
    const before = clone(game.save), baselineBefore = clone(baseline);
    expect(game.featureUnlocked(feature)).toBe(false);
    expect(game.requireFeature(feature)).toBe(false);
    expect(game.save).toEqual(before);
    expect(baseline).toEqual(baselineBefore);
    expect(storage.value).toEqual(before);
    expect(game.host.storageSet).not.toHaveBeenCalled();
    game.temporaryLevelTestSession.baselineSave = featureGame(threshold + 1).game.save;
    game.save = featureGame(1).game.save;
    game.model = new PuzzleModel(LEVELS[0]);
    expect(game.featureUnlocked(feature)).toBe(true);
  });

  it.each([
    ["supply", 8, homeRect({ x: 126, y: 47, width: 196, height: 64 }), false],
    ["achievements", 5, homeRect(HOME_ART_LAYOUT.achievementEntry), false],
    ["dailyChallenge", 15, homeRect(HOME_ART_LAYOUT.dailyChallengeEntry), true],
    ["league", 20, homeRect(HOME_ART_LAYOUT.leagueEntry), true],
  ] as const)("guards the actual Home %s shortcut", (feature, highest, rect, hidden) => {
    const { game, storage } = featureGame(highest);
    const before = clone(game.save);
    if (hidden) expect(game.buttonReleaseTargetAt(center(rect))).toBeUndefined();
    game.executePointerDown(center(rect));
    if (hidden) {
      expect(game.featureLockFeedback).toBeUndefined();
      expect(game.playSound).not.toHaveBeenCalled();
      expect(game.screen).toBe("home");
      expect(game.save).toEqual(before);
      expect(storage.value).toEqual(before);
      expect(game.host.storageSet).not.toHaveBeenCalled();
      expect(game.host.createImage).not.toHaveBeenCalled();
      const drawHome = vi.spyOn(game, "withHomeArtboard");
      game[feature === "league" ? "drawLeagueHomeEntry" : "drawDailyChallengeHomeEntry"]();
      expect(drawHome).not.toHaveBeenCalled();

      const unlocked = featureGame(highest + 1).game;
      const target = feature === "league" ? "homeLeague" : "homeDailyChallenge";
      expect(unlocked.buttonReleaseTargetAt(center(rect))?.key).toBe(target);
      const open = vi.spyOn(unlocked, feature === "league" ? "openLeague" : "openDailyChallenge").mockImplementation(() => {});
      unlocked.executePointerDown(center(rect));
      expect(open).toHaveBeenCalledTimes(1);
    } else {
      expect(game.featureLockFeedback).toBeDefined();
      expectUntouched(game, storage, before);
    }
    expect(game.requestAchievementArt).not.toHaveBeenCalled();
    expect(game.requestDailyChallengeArt).not.toHaveBeenCalled();
    expect(game.requestLeagueArt).not.toHaveBeenCalled();
    expect(game.setFormalPageIntent).not.toHaveBeenCalled();
  });

  it.each([
    ["openDailyTasks", 5], ["openDailyChallenge", 15],
  ] as const)("guards %s before preparing resources or changing daily data", (method, highest) => {
    const { game, storage } = featureGame(highest);
    const before = clone(game.save);
    game[method]();
    expectUntouched(game, storage, before);
    expect(game.requestDailyTaskArt).not.toHaveBeenCalled();
    expect(game.requestDailyChallengeArt).not.toHaveBeenCalled();
  });

  it("blocks direct purchasing even when the time booster itself is already unlocked", () => {
    const { game, storage } = featureGame(8);
    const before = clone(game.save);
    game.buySupply("time");
    expectUntouched(game, storage, before);
    expect(game.pendingSupplyPurchase).toBeUndefined();
  });

  it.each(["claim", "activate", "bonus"] as const)("blocks a claimable daily task action (%s) without awarding coins or inspiration", action => {
    const { game, storage } = featureGame(5);
    const id = finishTaskProgress(game);
    if (action === "bonus") for (const task of game.save.dailyTaskProgress.tasks) task.claimed = true;
    storage.value = clone(game.save);
    const before = clone(game.save);
    if (action === "activate") game.activateDailyTask(id);
    else game.claimDailyTaskReward(action === "bonus" ? "bonus" : id);
    expectUntouched(game, storage, before);
    expect(game.pendingDailyTaskClaim).toBeUndefined();
    expect(game.homeCoinFlight).toBeUndefined();
  });

  it("blocks a direct claim of a genuinely earned achievement", () => {
    const { game, storage } = featureGame(5);
    expect(game.achievementEntries().find((entry: any) => entry.id === "levels-1").claimable).toBe(true);
    const before = clone(game.save);
    game.claimAchievement("levels-1");
    expectUntouched(game, storage, before);
    expect(game.pendingAchievementClaim).toBeUndefined();
  });

  it.each(["start", "restart"] as const)("blocks daily %s without consuming an attempt or changing an existing run", action => {
    const { game, storage } = featureGame(15);
    if (action === "restart") oldDailyRun(game);
    storage.value = clone(game.save);
    const before = clone(game.save);
    const screen = game.screen;
    if (action === "start") game.startDailyChallenge(1);
    else game.restartDailyChallenge();
    expectUntouched(game, storage, before, screen);
  });

  it.each(["select", "openReward", "claimReward", "applyTheme"] as const)("guards the direct manual Journey action %s", action => {
    const { game, storage } = featureGame(10);
    const before = clone(game.save);
    if (action === "select") game.selectJourneyEpisode(JOURNEY_EPISODES[1]);
    else if (action === "openReward") game.openJourneyReward(JOURNEY_MILESTONE_REWARDS.find(reward => reward.level === 10));
    else if (action === "claimReward") { rewardPresentation(game); game.completeJourneyPresentation(); }
    else { themePresentation(game); game.completeJourneyThemeSelection(game.journeyPresentation); }
    expectUntouched(game, storage, before);
    expect(game.pendingJourneyClaim).toBeUndefined();
    expect(game.pendingJourneyThemeSelection).toBeUndefined();
  });

  it("keeps real pending purchases and claims retryable after the entry policy tightens", async () => {
    const cases = [
      { feature: "supply", highest: 8, pending: "pendingSupplyPurchase", prepare: (_game: any) => undefined,
        invoke: (game: any) => game.buySupply("time") },
      { feature: "dailyTasks", highest: 5, pending: "pendingDailyTaskClaim", prepare: (game: any) => { game.testTaskId = finishTaskProgress(game); },
        invoke: (game: any) => game.activateDailyTask(game.testTaskId) },
      { feature: "achievements", highest: 5, pending: "pendingAchievementClaim", prepare: (_game: any) => undefined,
        invoke: (game: any) => game.claimAchievement("levels-1") },
      { feature: "levels", highest: 10, pending: "pendingJourneyThemeSelection", prepare: (game: any) => themePresentation(game, 1),
        invoke: (game: any) => game.completeJourneyPresentation() },
    ] as const;
    for (const entry of cases) {
      const { game, storage } = featureGame(entry.highest);
      entry.prepare(game);
      storage.value = clone(game.save);
      const before = clone(game.save);
      // Model an unknown transaction begun under the former open-entry policy.
      // The real action creates and persists its candidate; no reward is fabricated.
      const previousPolicy = vi.spyOn(game, "featureUnlocked").mockReturnValue(true);
      storage.mode = "unknown-after-write";
      entry.invoke(game);
      await flush();
      previousPolicy.mockRestore();
      expect(game.featureUnlocked(entry.feature), entry.pending).toBe(false);
      const pending = game[entry.pending];
      expect(pending, entry.pending).toBeDefined();
      const candidate = pending.candidateSave;
      expect(game.save, entry.pending).toEqual(before);
      expect(storage.value, entry.pending).toEqual(candidate);
      storage.mode = "commit";
      entry.invoke(game);
      await flush();
      expect(game.host.storageSet.mock.calls[1]?.[1], entry.pending).toBe(candidate);
      expect(game.save, entry.pending).toBe(candidate);
      expect(game[entry.pending], entry.pending).toBeUndefined();
      expect(storage.value, entry.pending).toEqual(candidate);
      const committed = clone(game.save);
      entry.invoke(game);
      await flush();
      expect(game.save, entry.pending).toEqual(committed);
      expect(game.host.storageSet, entry.pending).toHaveBeenCalledTimes(2);
    }
  });

  it("settles an existing low-progress daily run as daily, keeping campaign progress and lives intact", () => {
    const { game, storage } = featureGame(9);
    oldDailyRun(game);
    storage.value = clone(game.save);
    const before = clone(game.save);
    expect(game.featureUnlocked("dailyChallenge")).toBe(false);
    game.beginCelebration();
    expect(game.screen).toBe("win");
    expect(game.dailyChallengeWin).toMatchObject({ difficulty: 1, coins: DAILY_CHALLENGE_REWARDS[1].coins });
    expect(game.save.dailyChallenge.completed[1]).toBe(true);
    expect(game.save.coins).toBe(before.coins + DAILY_CHALLENGE_REWARDS[1].coins);
    for (const key of ["highestLevel", "currentLevel", "rewardedLevels", "bestStars", "lifeState", "boosters", "selectedJourneyEpisode", "dailyTaskProgress"]) {
      expect(game.save[key], key).toEqual(before[key]);
    }
    expect(game.save.activeRun).toBeUndefined();
    expect(game.playSound.mock.calls.filter(([kind]: [string]) => kind === "gold")).toHaveLength(1);
    const afterFirst = clone(game.save);
    oldDailyRun(game);
    game.beginCelebration();
    expect(game.save.coins).toBe(afterFirst.coins);
    expect(game.save.collectionProgress.inspiration).toBe(afterFirst.collectionProgress.inspiration);
    expect(game.playSound.mock.calls.filter(([kind]: [string]) => kind === "gold")).toHaveLength(1);
  });

  it("allows an old locked daily run to leave for Home without refunding its consumed attempt", () => {
    const { game, storage } = featureGame(9);
    game.save.dailyChallenge.attemptsRemaining = 3;
    oldDailyRun(game);
    storage.value = clone(game.save);
    const before = clone(game.save);
    game.leaveDailyChallengeRun();
    expect(game.screen).toBe("home");
    expect(game.model.level.id).toBe(9);
    expect(game.save.activeRun).toBeUndefined();
    for (const key of ["highestLevel", "currentLevel", "rewardedLevels", "coins", "lifeState", "boosters", "dailyChallenge"]) {
      expect(game.save[key], key).toEqual(before[key]);
    }
  });

  it("suppresses locked notifications without discarding earned rewards or reconciling a hidden daily cycle", () => {
    const { game, storage } = featureGame(5);
    finishTaskProgress(game);
    game.save.dailyChallenge.dayKey = "2026-10-07";
    storage.value = clone(game.save);
    const before = clone(game.save);
    expect(game.dailyTaskSummary().tasks.some((task: any) => task.claimable)).toBe(true);
    expect(game.achievementEntries().some((entry: any) => entry.claimable)).toBe(true);
    expect(game.dailyTaskHasNotification()).toBe(false);
    expect(game.achievementHasNotification()).toBe(false);
    expect(game.dailyChallengeHasNotification()).toBe(false);
    expect(game.save).toEqual(before);
    expect(storage.value).toEqual(before);
    expect(game.host.storageSet).not.toHaveBeenCalled();
    const journey = featureGame(10).game;
    expect(journey.hasClaimableJourneyReward()).toBe(false);
    const unlocked = featureGame(16).game;
    finishTaskProgress(unlocked);
    expect(unlocked.dailyTaskHasNotification()).toBe(true);
    expect(unlocked.achievementHasNotification()).toBe(true);
    expect(unlocked.dailyChallengeHasNotification()).toBe(true);
    expect(unlocked.hasClaimableJourneyReward()).toBe(true);
  });

  it("confirms the automatic post-level-11 scene when manual Journey access has unlocked", () => {
    const { game, storage } = featureGame(12, { selectedJourneyEpisode: 2 });
    game.suppliedRevealArt = { imageGroup: () => ({}), request: vi.fn(), failed: () => false, dispose: vi.fn() };
    expect(game.featureUnlocked("levels")).toBe(true);
    expect(game.beginPendingHomePresentation()).toBe(true);
    expect(game.journeyPresentation.sceneReveal).toBe(true);
    game.updateJourneyPresentation(0);
    game.updateJourneyPresentation(0.6);
    game.completeJourneyPresentation();
    expect(game.journeyPresentation.phase).toBe("claiming");
    expect(game.save.journeyProgress.seenEpisodeUnlockLevels).toEqual([11]);
    expect(storage.value.journeyProgress.seenEpisodeUnlockLevels).toEqual([11]);
    expect(game.save.selectedJourneyEpisode).toBe(2);
    expect(game.save.coins).toBe(1254);
  });

  it("allows Journey entry and the level-10 reward after clearing 10, while the desert still requires 11", () => {
    const { game, storage } = featureGame(11);
    expect(game.featureUnlocked("levels")).toBe(true);
    expect(game.hasClaimableJourneyReward()).toBe(true);
    expect(game.save.selectedJourneyEpisode).toBe(1);
    game.mainNavigationInteractive = ColorEscapeGame.prototype["mainNavigationInteractive"];
    const point = center(game.mainNavigationRect(3));
    game.handleDown(point); game.handleUp(point);
    expect(game.screen).toBe("levels");
    expect(game.host.storageSet).not.toHaveBeenCalled();
    const before = game.save.coins;
    game.openJourneyReward(JOURNEY_MILESTONE_REWARDS.find(reward => reward.level === 10));
    game.completeJourneyPresentation();
    expect(game.save.coins).toBe(before + 50);
    expect(storage.value.coins).toBe(before + 50);
    expect(game.save.journeyProgress.claimedMilestoneLevels).toEqual([10]);
    game.completeJourneyPresentation();
    expect(game.host.storageSet).toHaveBeenCalledTimes(1);
    game.journeyPresentation = undefined;
    game.selectJourneyEpisode(JOURNEY_EPISODES[1]);
    expect(game.save.selectedJourneyEpisode).toBe(1);
    expect(game.journeyPresentation).toBeUndefined();
    expect(game.host.storageSet).toHaveBeenCalledTimes(1);
  });
});

describe("league entry moves to completed campaign level 20", () => {
  it.each([5, 6, 19, 20, 21, 200])("normalizes login progress %i without entering a league prematurely", highest => {
    const { game } = featureGame(highest);
    expect(Boolean(game.save.league)).toBe(highest > 20);
    expect(game.host.storageSet).not.toHaveBeenCalled();
    if (highest > 20) {
      expect(game.save.league.anchorMs).toBe(beijingMidnight(NOW));
      expect(game.save.league.season).toMatchObject({ tier: 0, score: 0, cleared: [], joinedMs: NOW });
    }
  });

  it("accepts an explicit level-20 clear record on login while keeping an old level selected", () => {
    const { game } = featureGame(20, { rewardedLevels: [20], currentLevel: 1 });
    expect(game.save.league).toBeDefined();
    expect(game.featureUnlocked("league")).toBe(true);
    expect(game.save.currentLevel).toBe(1);
  });

  it.each([5, 19])("does not enroll after an earlier campaign clear (%i)", level => {
    const { game } = featureGame(level);
    const pending = game.createPendingSettlement();
    expect(pending.candidateSave.rewardedLevels).toContain(level);
    expect(pending.candidateSave.league).toBeUndefined();
    expect(game.save.league).toBeUndefined();
    expect(game.host.storageSet).not.toHaveBeenCalled();
  });

  it("enrolls level-20 completion in the same durable candidate, retrying an unknown write unchanged", async () => {
    const { game, storage } = featureGame(20);
    const before = clone(game.save);
    storage.mode = "unknown-after-write";
    game.beginCelebration();
    expect(game.save).toEqual(before);
    expect(game.screen).toBe("settlementFailed");
    const candidate = game.pendingSettlement.candidateSave;
    expect(candidate.league.anchorMs).toBe(beijingMidnight(NOW));
    expect(candidate.league.season.joinedMs).toBe(NOW);
    expect(candidate.highestLevel).toBe(21);
    expect(game.featureUnlocked("league")).toBe(false);
    storage.mode = "commit";
    game.beginCelebration();
    await flush();
    expect(game.host.storageSet.mock.calls[1][1]).toBe(candidate);
    expect(game.save).toBe(candidate);
    expect(game.save.coins).toBe(before.coins + 40);
    expect(game.featureUnlocked("league")).toBe(true);
    expect(game.host.storageSet).toHaveBeenCalledTimes(2);
  });

  it("does not enroll from clearing a temporary level-20 test or refreshing it", () => {
    const { game } = featureGame(20);
    const baseline = featureGame(1).game.save;
    game.temporaryLevelTestSession = { baselineSave: baseline, baselineLevelId: 1 };
    const pending = game.createPendingSettlement();
    expect(pending.candidateSave.league).toBeUndefined();
    expect(game.featureUnlocked("league")).toBe(false);
    game.refreshLeague();
    expect(game.save.league).toBeUndefined();
    expect(baseline.league).toBeUndefined();
    expect(game.host.storageSet).not.toHaveBeenCalled();
  });

  it("preserves an old low-progress season on login and locked actions, then resumes its original dates", () => {
    const old = createLeague(NOW - 2 * LEAGUE_PERIOD_MS, 123, 0);
    const { game, storage } = featureGame(6, { league: old });
    expect(game.save.league).toEqual(old);
    const before = clone(game.save);
    game.openLeague();
    game.startLeaguePrototype();
    game.claimLeagueReward();
    game.refreshLeague();
    expectUntouched(game, storage, before);
    expect(game.leagueTransaction?.pending ?? false).toBe(false);
    expect(game.leagueRun).toBeUndefined();
    expect(game.leagueIntroPage).toBeUndefined();
    expect(game.requestLeagueArt).not.toHaveBeenCalled();
    game.save.highestLevel = 21;
    expect(game.refreshLeague()).toBe("committed");
    expect(game.save.league.anchorMs).toBe(old.anchorMs);
    expect(game.save.league.season.startMs).toBe(old.season.startMs);
    expect(game.save.league.pending.seasonIndex).toBe(old.season.index);
    expect(game.save.coins).toBe(before.coins);
  });

  it.each(["claim", "entry", "refresh"] as const)("allows an already-unknown league reward through %s without rebuilding or duplicating it", retry => {
    const old = createLeague(NOW - LEAGUE_PERIOD_MS, 123, 0);
    const attempt = { ...startLeagueAttempt(old, 1, old.season.joinedMs), specialIds: ["score"] };
    const completed = finishLeagueAttempt(old, attempt, true, old.season.joinedMs + 1).state;
    const league = advanceLeague(completed, NOW);
    const { game, storage } = featureGame(6, { league });
    const before = clone(game.save), coins = league.pending!.coins;
    expect(coins).toBeGreaterThan(0);
    const previousPolicy = vi.spyOn(game, "featureUnlocked").mockReturnValue(true);
    storage.mode = "unknown-after-write";
    expect(game.claimLeagueReward()).toBe("unknown");
    expect(game.playSound).not.toHaveBeenCalledWith("gold");
    previousPolicy.mockRestore();
    expect(game.featureUnlocked("league")).toBe(false);
    expect(game.save).toEqual(before);
    const candidate = game.leagueTransaction.pendingCandidate;
    storage.mode = "commit";
    if (retry === "claim") expect(game.claimLeagueReward()).toBe("committed");
    else if (retry === "refresh") expect(game.refreshLeague()).toBe("committed");
    else game.openLeague();
    expect(game.leagueIntroPage).toBeUndefined();
    expect(game.host.storageSet.mock.calls[1][1]).toBe(candidate);
    expect(game.save).toBe(candidate);
    expect(game.save.coins).toBe(before.coins + coins);
    expect(game.playSound.mock.calls.filter(([kind]: [string]) => kind === "gold")).toHaveLength(1);
    expect(game.save.league.anchorMs).toBe(old.anchorMs);
    expect(game.leagueTransaction.pending).toBe(false);
    game.claimLeagueReward();
    expect(game.save.coins).toBe(before.coins + coins);
    expect(game.host.storageSet).toHaveBeenCalledTimes(2);
    expect(game.playSound.mock.calls.filter(([kind]: [string]) => kind === "gold")).toHaveLength(1);
  });

  it("finishes an existing locked league run once and returns Home instead of starting another", () => {
    const { game, storage } = featureGame(6, { league: createLeague(NOW, 123, 0) });
    const level = { id: 900002, name: "existing league run", difficulty: "easy" as const, timeSeconds: 180,
      reward: 0, width: 2, height: 2,
      gates: [{ id: "r", color: "red" as const, side: "top" as const, offset: 0, size: 1 }],
      blocks: [{ id: "special", color: "red" as const, x: 0, y: 0, shape: [[0, 0] as [number, number]] }],
    };
    game.leagueRun = new LeagueRun(game.save.league, 1, level, ["special"], NOW);
    game.model = game.leagueRun.model;
    game.leagueRun.recordRemoval(game.model.removeBlockWithBooster("special"), NOW + 1);
    const before = clone(game.save);
    storage.mode = "unknown-after-write";
    game.finishLeaguePrototype();
    expect(game.save).toEqual(before);
    const candidate = game.leagueTransaction.pendingCandidate;
    storage.mode = "commit";
    game.finishLeaguePrototype();
    expect(game.host.storageSet.mock.calls[1][1]).toBe(candidate);
    expect(game.save.league.season.score).toBe(10);
    expect(game.save.league.season.cleared).toEqual([1]);
    expect(game.save.coins).toBe(before.coins);
    expect(game.save.highestLevel).toBe(6);
    game.continueLeaguePrototype();
    expect(game.screen).toBe("home");
    expect(game.leagueRun).toBeUndefined();
    expect(game.host.storageSet).toHaveBeenCalledTimes(2);
  });
});
