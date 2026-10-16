import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clonePlainData as clone } from "../src/core/clonePlainData";
import { DAILY_TASK_DEFINITIONS, localDayKey, type DailyTaskId, type DailyTaskProgressState } from "../src/core/dailyTasks";
import { LEVELS } from "../src/core/levels";
import { PuzzleModel } from "../src/core/PuzzleModel";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";
import { CountdownWarning } from "../src/game/countdownWarning";

const NOW = new Date("2026-10-14T06:00:00.000Z").getTime();
const BASIC_TASKS: DailyTaskId[] = ["clear-levels", "earn-stars", "perfect-clear"];
const BOOSTER_TASKS: DailyTaskId[] = ["booster-free", "use-booster", "clear-levels"];
const taskProgress = (ids = BASIC_TASKS, completed = false, dayKey = localDayKey(new Date(NOW))): DailyTaskProgressState => ({
  version: 1, dayKey, maxObservedDayKey: dayKey, bonusClaimed: completed,
  tasks: ids.map(id => ({ id, progress: completed ? DAILY_TASK_DEFINITIONS[id].target : 0, claimed: completed })),
});
const progressMap = (state: DailyTaskProgressState) => Object.fromEntries(state.tasks.map(task => [task.id, task.progress]));
const expectEmpty = (state: DailyTaskProgressState) => {
  expect(state.tasks).toHaveLength(3);
  expect(state.tasks.every(task => task.progress === 0 && !task.claimed)).toBe(true);
  expect(state.bonusClaimed).toBe(false);
};

/** Actual save normalization, model and settlement transactions. Completion
 * metrics are supplied at the boundary; this does not claim a solved route. */
function taskGame(levelId = 6, overrides: Record<string, unknown> = {}) {
  const game = Object.create(ColorEscapeGame.prototype) as any;
  game.countdownWarning = new CountdownWarning();
  game.playableClockSlices = { reset: vi.fn() };
  game.save = game.sanitizeSave({
    ...game.sanitizeSave(undefined),
    highestLevel: levelId, currentLevel: levelId,
    rewardedLevels: Array.from({ length: levelId - 1 }, (_, index) => index + 1),
    coins: 1234, dailyTaskProgress: taskProgress(),
    collectionIntroShown: true, collectionIntroPending: false,
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
  for (const method of ["playSound", "vibrate", "scheduleFrame", "emitBurst", "requestWinArt", "releaseWinArt",
    "loadLevel", "beginHomeCoinFlight", "requestJourneyHomeThemeArt"]) game[method] = vi.fn();
  const storage = { value: clone(game.save), mode: "commit" as "commit" | "reject" | "unknown-after-write" };
  game.host = {
    storageSet: vi.fn((_key: string, value: unknown) => {
      if (storage.mode === "reject") return false;
      storage.value = clone(value);
      return storage.mode === "commit";
    }),
    storageRead: vi.fn(() => storage.mode === "unknown-after-write"
      ? { status: "unavailable" } : { status: "ok", value: clone(storage.value) }),
  };
  return { game, storage };
}

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe("daily tasks start after the unlock win", () => {
  it.each([1, 2, 3, 4, 5])("credits no task metrics from the first completion of level %i", levelId => {
    for (const [ids, timeSpent] of [[BASIC_TASKS, 0], [BOOSTER_TASKS, 0], [BOOSTER_TASKS, 1]] as const) {
      const { game, storage } = taskGame(levelId, { dailyTaskProgress: taskProgress(ids) });
      game.save.activeRun.boosterSpent.time = timeSpent;
      storage.value = clone(game.save);
      expect(game.featureUnlocked("dailyTasks")).toBe(false);
      game.beginCelebration();
      expect(game.save.highestLevel).toBe(levelId + 1);
      expect(game.save.rewardedLevels).toContain(levelId);
      expect(game.save.coins).toBe(1274);
      expectEmpty(game.save.dailyTaskProgress);
      expectEmpty(storage.value.dailyTaskProgress);
      expect(game.save.dailyTaskProgress.tasks.map((task: { id: DailyTaskId }) => task.id)).toEqual(ids);
      expect(game.featureUnlocked("dailyTasks")).toBe(levelId === 5);
    }
  });

  it.each([6, 1])("counts all matching metrics after unlocking, including selected campaign level %i", levelId => {
    const common = { highestLevel: 6, rewardedLevels: [1, 2, 3, 4, 5] };
    const { game, storage } = taskGame(levelId, common);
    expect(game.featureUnlocked("dailyTasks")).toBe(true);
    game.beginCelebration();
    expect(game.earnedStars).toBe(3);
    expect(progressMap(game.save.dailyTaskProgress)).toEqual({ "clear-levels": 1, "earn-stars": 3, "perfect-clear": 1 });
    expect(storage.value.dailyTaskProgress).toEqual(game.save.dailyTaskProgress);

    for (const timeSpent of [0, 1]) {
      const test = taskGame(levelId, { ...common, dailyTaskProgress: taskProgress(BOOSTER_TASKS) });
      test.game.save.activeRun.boosterSpent.time = timeSpent;
      test.storage.value = clone(test.game.save);
      test.game.beginCelebration();
      expect(progressMap(test.game.save.dailyTaskProgress)).toEqual({
        "booster-free": timeSpent === 0 ? 1 : 0, "use-booster": timeSpent, "clear-levels": 1,
      });
    }
  });

  it("opens a fresh task slate after level 5 and counts only the later level-6 completion", () => {
    const { game } = taskGame(5);
    game.beginCelebration();
    expect(game.featureUnlocked("dailyTasks")).toBe(true);
    expectEmpty(game.save.dailyTaskProgress);
    game.model = new PuzzleModel(LEVELS[5]);
    game.save.activeRun = { levelId: 6, returnLevelId: 6, lifeStarted: true, daily: false,
      boosterSpent: { time: 0, rocket: 0, pulse: 0 } };
    game.screen = "playing";
    game.beginCelebration();
    expect(progressMap(game.save.dailyTaskProgress)).toEqual({ "clear-levels": 1, "earn-stars": 3, "perfect-clear": 1 });
    expect(game.host.storageSet).toHaveBeenCalledTimes(2);
  });

  it("honors an explicit level-5 clear record even when highestLevel still equals 5", () => {
    const { game } = taskGame(1, { highestLevel: 5, rewardedLevels: [1, 2, 3, 4, 5] });
    expect(game.featureUnlocked("dailyTasks")).toBe(true);
    game.beginCelebration();
    expect(progressMap(game.save.dailyTaskProgress)).toEqual({ "clear-levels": 1, "earn-stars": 3, "perfect-clear": 1 });
    expect(game.save.highestLevel).toBe(5);
  });
});

describe("daily task save and refresh eligibility", () => {
  it("clears locked legacy progress and claims while preserving the future cycle high-water mark and task IDs", () => {
    const legacy = taskProgress(BOOSTER_TASKS, true, "2026-10-20");
    const before = clone(legacy);
    const { game } = taskGame(4, { dailyTaskProgress: legacy });
    expectEmpty(game.save.dailyTaskProgress);
    expect(game.save.dailyTaskProgress.dayKey).toBe("2026-10-20");
    expect(game.save.dailyTaskProgress.maxObservedDayKey).toBe("2026-10-20");
    expect(game.save.dailyTaskProgress.tasks.map((task: { id: DailyTaskId }) => task.id)).toEqual(BOOSTER_TASKS);
    expect(legacy).toEqual(before);
    expect(game.save.coins).toBe(1234);
    expect(game.host.storageSet).not.toHaveBeenCalled();
    vi.setSystemTime(new Date("2026-10-13T06:00:00Z"));
    expect(game.ensureDailyTaskCycle()).toBe(false);
    expect(game.save.dailyTaskProgress.maxObservedDayKey).toBe("2026-10-20");
    expectEmpty(game.save.dailyTaskProgress);
  });

  it.each([false, true])("preserves unlocked existing progress and claim states (all complete: %s)", completed => {
    const existing = taskProgress(BASIC_TASKS, completed);
    if (!completed) existing.tasks[0].progress = 2;
    const { game } = taskGame(6, { dailyTaskProgress: existing });
    expect(game.save.dailyTaskProgress).toEqual(existing);
    expect(game.ensureDailyTaskCycle()).toBe(false);
    expect(game.save.dailyTaskProgress).toEqual(existing);
    expect(game.host.storageSet).not.toHaveBeenCalled();
  });

  it("reconciles a locked in-memory legacy cycle without altering currency or clear records", () => {
    const { game, storage } = taskGame(4);
    game.save.dailyTaskProgress = taskProgress(BOOSTER_TASKS, true, "2026-10-20");
    const before = clone(game.save);
    storage.value = clone(before);
    expect(game.ensureDailyTaskCycle()).toBe(true);
    expectEmpty(game.save.dailyTaskProgress);
    expectEmpty(storage.value.dailyTaskProgress);
    expect(game.save.dailyTaskProgress.maxObservedDayKey).toBe("2026-10-20");
    expect(game.save.coins).toBe(before.coins);
    expect(game.save.rewardedLevels).toEqual(before.rewardedLevels);
    expect(game.save.collectionProgress).toEqual(before.collectionProgress);
    expect(game.host.storageSet).toHaveBeenCalledTimes(1);
  });

  it("does not gain daily-task eligibility from temporary test progress above an unqualified baseline", () => {
    const { game } = taskGame(6);
    const baseline = taskGame(4).game.save;
    const baselineBefore = clone(baseline);
    game.temporaryLevelTestSession = { baselineSave: baseline, baselineLevelId: 4 };
    expect(game.featureUnlocked("dailyTasks")).toBe(false);
    game.beginCelebration();
    expectEmpty(game.save.dailyTaskProgress);
    expect(baseline).toEqual(baselineBefore);
    expect(game.host.storageSet).not.toHaveBeenCalled();
  });
});

describe("daily task settlement retry isolation", () => {
  it("keeps the live save untouched across midnight while an unknown settlement retries the same single-run candidate", () => {
    const { game, storage } = taskGame(6);
    const baseline = game.save;
    const before = clone(baseline);
    storage.mode = "unknown-after-write";
    game.beginCelebration();
    const pending = game.pendingSettlement;
    const candidate = pending.candidateSave;
    const prepared = clone(candidate);
    expect(game.settlementFailureKind).toBe("unknown");
    expect(progressMap(candidate.dailyTaskProgress)).toEqual({ "clear-levels": 1, "earn-stars": 3, "perfect-clear": 1 });
    vi.setSystemTime(NOW + 24 * 60 * 60 * 1000);
    expect(game.ensureDailyTaskCycle()).toBe(false);
    expect(game.save).toBe(baseline);
    expect(game.save).toEqual(before);
    expect(game.pendingSettlement).toBe(pending);
    expect(candidate).toEqual(prepared);
    expect(game.host.storageSet).toHaveBeenCalledTimes(1);
    storage.mode = "commit";
    game.beginCelebration();
    expect(game.host.storageSet.mock.calls[1][1]).toBe(candidate);
    expect(game.save).toBe(candidate);
    expect(storage.value).toEqual(prepared);
    expect(progressMap(game.save.dailyTaskProgress)).toEqual({ "clear-levels": 1, "earn-stars": 3, "perfect-clear": 1 });
    expect(game.pendingSettlement).toBeUndefined();
    expect(game.ensureDailyTaskCycle()).toBe(true);
    expect(game.save.dailyTaskProgress.dayKey).toBe(localDayKey(new Date(NOW + 24 * 60 * 60 * 1000)));
    expectEmpty(game.save.dailyTaskProgress);
    expect(game.save.coins).toBe(before.coins + 40);
  });

  it("does not replace live task progress while a settlement abandonment candidate is unresolved", () => {
    const { game } = taskGame(6);
    const baseline = game.save;
    const pending = { baselineSave: clone(baseline), candidateSave: clone(baseline) };
    game.pendingSettlementAbandon = pending;
    vi.setSystemTime(NOW + 24 * 60 * 60 * 1000);
    expect(game.ensureDailyTaskCycle()).toBe(false);
    expect(game.save).toBe(baseline);
    expect(game.save.dailyTaskProgress.dayKey).toBe(localDayKey(new Date(NOW)));
    expect(game.pendingSettlementAbandon).toBe(pending);
    expect(game.host.storageSet).not.toHaveBeenCalled();
  });

  it.each([
    [5, "reject"], [5, "unknown-after-write"], [6, "reject"], [6, "unknown-after-write"],
  ] as const)("retries level %i after %s with the identical task candidate and one credited run", (levelId, mode) => {
    const { game, storage } = taskGame(levelId);
    const before = clone(game.save);
    const prepare = vi.spyOn(game, "createPendingSettlement");
    storage.mode = mode;
    game.beginCelebration();
    expect(game.screen).toBe("settlementFailed");
    expect(game.save).toEqual(before);
    const candidate = game.pendingSettlement.candidateSave;
    const candidateBefore = clone(candidate);
    if (levelId === 5) expectEmpty(candidate.dailyTaskProgress);
    else expect(progressMap(candidate.dailyTaskProgress)).toEqual({ "clear-levels": 1, "earn-stars": 3, "perfect-clear": 1 });
    if (mode === "unknown-after-write") expect(storage.value).toEqual(candidateBefore);
    else expect(storage.value).toEqual(before);
    storage.mode = "commit";
    game.beginCelebration();
    expect(prepare).toHaveBeenCalledTimes(1);
    expect(game.host.storageSet.mock.calls[1][1]).toBe(candidate);
    expect(game.save).toBe(candidate);
    expect(game.save).toEqual(candidateBefore);
    expect(storage.value).toEqual(candidateBefore);
    expect(game.pendingSettlement).toBeUndefined();
    expect(game.save.coins).toBe(before.coins + 40);
    expect(game.host.storageSet).toHaveBeenCalledTimes(2);
    const reloaded = taskGame(levelId, storage.value).game;
    expect(reloaded.save.dailyTaskProgress).toEqual(candidateBefore.dailyTaskProgress);
    expect(reloaded.ensureDailyTaskCycle()).toBe(false);
  });
});
