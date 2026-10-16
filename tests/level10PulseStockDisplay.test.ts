import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clonePlainData as clone } from "../src/core/clonePlainData";
import { getLevel } from "../src/core/levels";
import { PuzzleModel } from "../src/core/PuzzleModel";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";
import { CountdownWarning } from "../src/game/countdownWarning";
import { PulseAnimation } from "../src/game/pulseAnimation";

const NOW = new Date("2026-10-09T08:00:00.000Z").getTime();
const TARGET = "cc-010-b1-15";

/** Synthetic counter boundary, not a pulse or a claimed solution route. */
const setRescueBoundary = (game: any): void => {
  const snapshot = game.model.snapshot();
  for (const block of snapshot.blocks) block.frozen = block.id === TARGET ? 1 : 0;
  for (const gate of snapshot.gates) gate.frozen = 0;
  game.model.restore(snapshot);
};

/** Actual use/model/journal/save/HUD entry points, with memory-only storage.
 * Clock progression and visual effects have separate integration coverage. */
const pulseGame = (levelId = 10, daily = false) => {
  const game = Object.create(ColorEscapeGame.prototype) as any;
  game.countdownWarning = new CountdownWarning();
  game.pulseAnimation = new PulseAnimation();
  game.boardLayout = () => ({ innerX: 40, innerY: 260, cell: 50 });
  game.playableClockSlices = { reset: vi.fn() };
  game.save = game.sanitizeSave({
    ...game.sanitizeSave(undefined),
    currentLevel: levelId, highestLevel: Math.max(10, levelId),
    rewardedLevels: Array.from({ length: 9 }, (_, index) => index + 1),
    boosters: { time: 3, rocket: 3, pulse: 3 },
    boosterUnlockSeen: ["time", "rocket", "pulse"],
    boosterUsageSeen: ["time", "rocket", "pulse"],
    lifeState: { lives: 4, nextLifeAtMs: NOW + 1_800_000, unlimitedLivesUntilMs: 0 },
  });
  // Use the formal Lv10 board throughout; changing only the fixture ID proves
  // the ordinary-level consumption branch without altering any level data.
  game.model = new PuzzleModel({ ...getLevel(10), id: levelId });
  game.save.activeRun = {
    levelId, returnLevelId: levelId, lifeStarted: true, daily,
    boosterSpent: { time: 0, rocket: 0, pulse: 0 },
  };
  game.screen = "playing";
  game.appVisible = true;
  game.artReady = true;
  game.storageBaselineReady = true;
  game.storageReadAttempts = 0;
  game.advanceRevisedClockBeforeMutation = vi.fn(() => true);
  for (const method of [
    "playSound", "vibrate", "scheduleFrame", "captureGeneratorSpawns", "captureInitialGeneratorSpawns",
    "emitMechanicFeedback", "emitBurst", "releaseFormalPageArt", "releaseDailyChallengeArt", "releaseWinArt",
    "releaseCollectionAlbumArt", "releaseAchievementArt", "cancelDailyTaskRefreshWatch", "releaseDailyTaskArt",
    "scheduleLifeRefreshWatch", "requestWinArt", "requestBoosterPurchaseArt", "requestJourneyHomeThemeArt",
  ]) game[method] = vi.fn();
  game.tr = (key: string) => key;
  const storage = { value: clone(game.save), mode: "commit" as "commit" | "unknown-written" };
  game.host = {
    storageSet: vi.fn((_key: string, value: unknown) => {
      storage.value = clone(value);
      return storage.mode === "commit";
    }),
    storageRead: vi.fn(() => storage.mode === "unknown-written"
      ? { status: "unavailable" } : { status: "ok", value: clone(storage.value) }),
  };
  game.resetPuzzlePresentation();
  game.model.startCountdown();
  return { game, storage };
};

/** Observe the quantity supplied to the real HUD renderer, not only the
 * reservation helper: this fails when drawBoosters passes the raw stock. */
const displayedPulseCount = (game: any): number => {
  game.boosterFeedback = undefined;
  const draw = vi.spyOn(game, "drawBooster").mockImplementation(() => {});
  game.drawBoosters();
  const pulse = draw.mock.calls.find((args: unknown[]) => args[4] === "pulse");
  draw.mockRestore();
  expect(pulse).toBeDefined();
  return pulse![2] as number;
};

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe("Lv10 pulse quantity in the gameplay HUD", () => {
  it("shows 3 → 2 after a successful rescue, while preserving delayed settlement", () => {
    const { game, storage } = pulseGame();
    setRescueBoundary(game);
    expect(displayedPulseCount(game)).toBe(3);
    game.useBooster("pulse");
    expect(game.model.getBlock(TARGET).frozen).toBe(0);
    expect(displayedPulseCount(game)).toBe(2);
    expect(game.save.boosters.pulse).toBe(3);
    expect(game.save.activeRun.boosterSpent.pulse).toBe(1);
    expect(storage.value.boosters.pulse).toBe(3);
    expect(storage.value.activeRun.boosterSpent.pulse).toBe(1);
  });

  it("does not reduce the displayed quantity when another pulse has no effect", () => {
    const { game, storage } = pulseGame();
    setRescueBoundary(game);
    game.useBooster("pulse");
    const board = game.model.snapshot(), saved = clone(storage.value);
    game.updatePulseAnimation(2);
    game.useBooster("pulse");
    expect(game.model.snapshot()).toEqual(board);
    expect(game.save.activeRun.boosterSpent.pulse).toBe(1);
    expect(storage.value).toEqual(saved);
    expect(displayedPulseCount(game)).toBe(2);
  });

  it("shows 2 → 1 → 0 and opens purchase instead of consuming a fourth pulse", () => {
    const { game, storage } = pulseGame();
    for (const remaining of [2, 1, 0]) {
      game.useBooster("pulse");
      expect(displayedPulseCount(game)).toBe(remaining);
      expect(game.save.boosters.pulse).toBe(3);
      expect(game.save.activeRun.boosterSpent.pulse).toBe(3 - remaining);
      game.updatePulseAnimation(2);
    }
    const board = game.model.snapshot(), saved = clone(storage.value);
    game.useBooster("pulse");
    expect(game.screen).toBe("boosterPurchase");
    expect(game.boosterPurchase.kind).toBe("pulse");
    expect(game.model.snapshot()).toEqual(board);
    expect(storage.value).toEqual(saved);
    expect(game.save.activeRun.boosterSpent.pulse).toBe(3);
    expect(displayedPulseCount(game)).toBe(0);
  });

  it("restores the displayed 3 when the run is abandoned without charging inventory", () => {
    const { game } = pulseGame();
    game.useBooster("pulse");
    expect(displayedPulseCount(game)).toBe(2);
    game.save = game.abandonRunCandidate(game.save);
    expect(game.save.activeRun).toBeUndefined();
    expect(game.save.boosters.pulse).toBe(3);
    expect(displayedPulseCount(game)).toBe(3);
  });

  it("starts a restarted level with the original 3 and an empty reservation journal", () => {
    const { game, storage } = pulseGame();
    game.useBooster("pulse");
    expect(displayedPulseCount(game)).toBe(2);
    game.loadLevel(10, true);
    expect(game.save.activeRun.boosterSpent.pulse).toBe(0);
    expect(game.model.snapshot().pulseRescueUsed).toBe(false);
    expect(game.save.boosters.pulse).toBe(3);
    expect(storage.value.boosters.pulse).toBe(3);
    expect(displayedPulseCount(game)).toBe(3);
  });

  it("settles the reserved pulse once across an unknown-write retry", () => {
    const { game, storage } = pulseGame();
    setRescueBoundary(game);
    game.useBooster("pulse");
    // Explicit completion fixture verifies settlement; this is not a solution route.
    while (!game.model.snapshot().complete) {
      const block = game.model.snapshot().blocks.find((entry: any) => game.model.isBlockActive(entry));
      expect(block).toBeDefined();
      game.model.beginAction();
      expect(game.model.removeBlockWithBooster(block.id).ok).toBe(true);
      expect(game.model.commitAction()).toBe(true);
    }
    storage.mode = "unknown-written";
    game.beginCelebration();
    const pending = game.pendingSettlement;
    expect(game.screen).toBe("settlementFailed");
    expect(pending.candidateSave.boosters.pulse).toBe(2);
    expect(game.save.boosters.pulse).toBe(3);
    expect(storage.value.boosters.pulse).toBe(2);
    expect(displayedPulseCount(game)).toBe(2);
    storage.mode = "commit";
    game.beginCelebration();
    expect(game.save).toBe(pending.candidateSave);
    expect(game.save.activeRun).toBeUndefined();
    expect(game.save.boosters.pulse).toBe(2);
    expect(storage.value.boosters.pulse).toBe(2);
    expect(displayedPulseCount(game)).toBe(2);
    const attempts = game.host.storageSet.mock.calls;
    expect(attempts.at(-1)[1]).toBe(attempts.at(-2)[1]);
  });

  it.each([{ level: 11, daily: false }, { level: 10, daily: true }])(
    "keeps immediate deduction for level $level with daily=$daily", ({ level, daily }) => {
      const { game, storage } = pulseGame(level, daily);
      game.useBooster("pulse");
      expect(game.save.boosters.pulse).toBe(2);
      expect(game.save.activeRun.boosterSpent.pulse).toBe(1);
      expect(storage.value.boosters.pulse).toBe(2);
      expect(displayedPulseCount(game)).toBe(2);
    },
  );
});
