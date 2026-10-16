import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PuzzleModel } from "../src/core/PuzzleModel";
import type { LevelSpec } from "../src/core/types";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";
import { CountdownWarning } from "../src/game/countdownWarning";
import { GAMEPLAY_ARTBOARD, GAMEPLAY_ART_LAYOUT } from "../src/game/gameplayArtLayout";
import { TimeFreezeAnimation } from "../src/game/timeFreezeAnimation";

const NOW = new Date("2026-10-08T10:00:00.000Z").getTime();
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const fixture = (levelId = 4): LevelSpec => ({
  id: levelId, name: "freeze presentation integration", difficulty: "normal", reward: 0,
  mechanismRules: "revised-2026-09-27-v1.5", width: 3, height: 3, timeSeconds: 60,
  gates: [{ id: "red-exit", color: "red", side: "left", offset: 0, size: 1 }],
  blocks: [
    { id: "red", color: "red", x: 0, y: 0, shape: [[0, 0]] },
    { id: "blue", color: "blue", x: 2, y: 2, shape: [[0, 0]] },
  ],
});

/** Real booster/model/history/persistence; no renderer, scheduler or player storage. */
const freezeGame = (levelId = 4) => {
  const game = Object.create(ColorEscapeGame.prototype) as any;
  game.countdownWarning = new CountdownWarning();
  game.timeFreezeAnimation = new TimeFreezeAnimation();
  game.playableClockSlices = { reset: vi.fn() };
  const defaults = game.sanitizeSave(undefined);
  game.save = game.sanitizeSave({
    ...defaults,
    currentLevel: levelId, highestLevel: levelId,
    rewardedLevels: Array.from({ length: levelId - 1 }, (_, index) => index + 1),
    boosters: { time: 2, rocket: 2, pulse: 2 },
    lifeState: { lives: 4, nextLifeAtMs: NOW + 1_800_000, unlimitedLivesUntilMs: 0 },
    activeRun: {
      levelId, returnLevelId: levelId, lifeStarted: true, daily: false,
      boosterSpent: { time: 0, rocket: 0, pulse: 0 },
    },
  });
  game.model = new PuzzleModel(fixture(levelId));
  game.screen = "playing";
  game.appVisible = true;
  game.artReady = true;
  game.storageBaselineReady = true;
  game.storageReadAttempts = 0;
  // Isolate the presentation integration from the separate real-time clock-flush tests.
  game.advanceRevisedClockBeforeMutation = vi.fn(() => true);
  for (const method of [
    "playSound", "vibrate", "scheduleFrame", "captureGeneratorSpawns", "captureInitialGeneratorSpawns",
    "releaseFormalPageArt", "releaseDailyChallengeArt", "releaseWinArt", "releaseCollectionAlbumArt",
    "releaseAchievementArt", "cancelDailyTaskRefreshWatch", "releaseDailyTaskArt", "scheduleLifeRefreshWatch",
  ]) game[method] = vi.fn();
  game.tr = (key: string) => key;
  game.interactionHit = (point: { x: number; y: number }, rect: { x: number; y: number; width: number; height: number }) => (
    point.x >= rect.x && point.x <= rect.x + rect.width
    && point.y >= rect.y && point.y <= rect.y + rect.height
  );
  const storage = { value: clone(game.save), mode: "commit" as "commit" | "reject" | "unknown-after-write" };
  game.host = {
    viewport: () => ({ width: 496, height: 1078, safeTop: 0, safeBottom: 0, dpr: 1 }),
    storageSet: vi.fn((_key: string, value: unknown) => {
      if (storage.mode === "reject") return false;
      storage.value = clone(value);
      return storage.mode === "commit";
    }),
    storageRead: vi.fn(() => storage.mode === "unknown-after-write"
      ? { status: "unavailable" }
      : { status: "ok", value: clone(storage.value) }),
  };
  game.resetPuzzlePresentation();
  const trigger = vi.spyOn(game.timeFreezeAnimation, "trigger");
  const reset = vi.spyOn(game.timeFreezeAnimation, "reset");
  return { game, storage, trigger, reset };
};

const clickFormerUndo = (game: any) => {
  const placement = GAMEPLAY_ART_LAYOUT.back;
  const scale = 496 / GAMEPLAY_ARTBOARD.width;
  const offsetY = (1078 - GAMEPLAY_ARTBOARD.height * scale) / 2;
  game.executePointerDown({
    id: 1, x: (placement.x + placement.width / 2) * scale,
    y: offsetY + (placement.y + placement.height / 2) * scale,
  });
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("successful time booster animation integration", () => {
  it("triggers once only after a real committed use and preserves the ten-second model effect", () => {
    const { game, storage, trigger } = freezeGame();
    game.freezeUsageGuide = { age: 0 };
    game.useBooster("time");
    expect(trigger).toHaveBeenCalledOnce();
    expect(game.timeFreezeAnimation.sample(10, false)).toMatchObject({ phase: "launch", age: 0, visible: true });
    expect(game.model.snapshot()).toMatchObject({ started: true, moves: 0, remainingSeconds: 60, timeFreezeSeconds: 10 });
    expect(game.save.boosters.time).toBe(1);
    expect(game.save.activeRun.boosterSpent.time).toBe(1);
    expect(game.save.lifeState.lives).toBe(4);
    expect(game.save.boosterUsageSeen).toContain("time");
    expect(game.freezeUsageGuide).toBeUndefined();
    expect(game.boosterFeedback).toBeUndefined();
    expect(storage.value.boosters.time).toBe(1);
    expect(game.playSound).toHaveBeenCalledWith("time");
    expect(game.playSound.mock.calls.filter(([kind]: [string]) => kind === "time")).toHaveLength(1);
  });

  it("does not restart the animation or spend another booster during an active freeze", () => {
    const { game, storage, trigger } = freezeGame();
    game.useBooster("time");
    game.model.tick(1);
    game.timeFreezeAnimation.update(9, true, 1);
    const before = game.timeFreezeAnimation.sample(9, false);
    const modelBefore = game.model.snapshot();
    const saved = clone(storage.value);
    game.useBooster("time");
    expect(trigger).toHaveBeenCalledOnce();
    expect(game.timeFreezeAnimation.sample(9, false)).toEqual(before);
    expect(game.model.snapshot()).toEqual(modelBefore);
    expect(game.save.boosters.time).toBe(1);
    expect(game.save.activeRun.boosterSpent.time).toBe(1);
    expect(storage.value).toEqual(saved);
    expect(game.playSound).toHaveBeenLastCalledWith("blocked");
    expect(game.playSound.mock.calls.filter(([kind]: [string]) => kind === "time")).toHaveLength(1);
  });

  it.each(["locked", "empty", "clock-blocked"])("does not trigger or spend inventory when %s", (reason) => {
    const { game, trigger } = freezeGame(reason === "locked" ? 3 : 4);
    if (reason === "empty") game.save.boosters.time = 0;
    if (reason === "clock-blocked") game.advanceRevisedClockBeforeMutation.mockReturnValue(false);
    const before = clone(game.save);
    const modelBefore = game.model.snapshot();
    game.useBooster("time");
    expect(trigger).not.toHaveBeenCalled();
    expect(game.timeFreezeAnimation.isVisible).toBe(false);
    expect(game.model.snapshot()).toEqual(modelBefore);
    expect(game.save).toEqual(before);
    expect(game.host.storageSet).not.toHaveBeenCalled();
    expect(game.playSound).not.toHaveBeenCalledWith("time");
  });

  it.each(["reject", "unknown-after-write"] as const)("does not animate or consume inventory before a %s life-start transaction resolves", (mode) => {
    const { game, storage, trigger } = freezeGame();
    game.save.activeRun.lifeStarted = false;
    storage.value = clone(game.save);
    storage.mode = mode;
    const before = clone(game.save);
    game.useBooster("time");
    expect(trigger).not.toHaveBeenCalled();
    expect(game.model.snapshot()).toMatchObject({ started: false, timeFreezeSeconds: 0 });
    expect(game.save).toEqual(before);
    expect(game.timeFreezeAnimation.isVisible).toBe(false);
    if (mode === "unknown-after-write") expect(game.pendingLifeStart).toBeDefined();
    expect(game.playSound).not.toHaveBeenCalledWith("time");

    storage.mode = "commit";
    game.useBooster("time");
    expect(trigger).toHaveBeenCalledOnce();
    expect(game.model.snapshot().timeFreezeSeconds).toBe(10);
    expect(game.save.boosters.time).toBe(1);
    expect(game.save.activeRun.boosterSpent.time).toBe(1);
    expect(game.save.lifeState.lives).toBe(3);
    expect(game.playSound.mock.calls.filter(([kind]: [string]) => kind === "time")).toHaveLength(1);
  });

  it.each([false, true])("respects the sound-effects setting with music disabled (sound=%s)", (sound) => {
    const { game } = freezeGame();
    game.save.sound = sound;
    game.save.music = false;
    game.playSound = (ColorEscapeGame.prototype as any).playSound;
    game.syncMusic = vi.fn();
    game.host.sound = vi.fn();
    game.useBooster("time");
    expect(game.model.snapshot().timeFreezeSeconds).toBe(10);
    expect(game.host.sound.mock.calls).toEqual(sound ? [["time"]] : []);
  });

  it("does not play the success recording if the action fails to commit", () => {
    const { game } = freezeGame();
    vi.spyOn(game.model, "commitAction").mockReturnValue(false);
    game.useBooster("time");
    expect(game.playSound).not.toHaveBeenCalledWith("time");
  });
});

describe("time-freeze animation cleanup integration", () => {
  it("clears the presentation on a puzzle reset without changing the model's remaining balance", () => {
    const { game, reset } = freezeGame();
    game.useBooster("time");
    game.model.tick(1);
    game.timeFreezeAnimation.update(9, true, 1);
    const snapshot = game.model.snapshot();
    game.resetPuzzlePresentation();
    expect(reset).toHaveBeenCalledOnce();
    expect(game.timeFreezeAnimation.isVisible).toBe(false);
    expect(game.model.snapshot()).toEqual(snapshot);
    game.timeFreezeAnimation.update(9, true, 1);
    expect(game.timeFreezeAnimation.isVisible).toBe(false);
  });

  it.each([false, true])("clears all animation state when loading another board (play=%s)", (play) => {
    const { game, reset } = freezeGame();
    game.useBooster("time");
    game.timeFreezeAnimation.update(10, true, 1);
    game.loadLevel(5, play);
    expect(reset).toHaveBeenCalledOnce();
    expect(game.timeFreezeAnimation.isVisible).toBe(false);
    expect(game.model.level.id).toBe(5);
    expect(game.model.snapshot().timeFreezeSeconds).toBe(0);
    expect(game.screen).toBe(play ? "playing" : "home");
  });

  it("ignores the former undo position without clearing a freeze or refunding its booster", () => {
    const { game, reset, trigger, storage } = freezeGame();
    game.useBooster("time");
    game.model.tick(1);
    game.timeFreezeAnimation.update(9, true, 1);
    const snapshot = game.model.snapshot();
    const animation = game.timeFreezeAnimation.sample(9, false);
    const saved = clone(storage.value);
    game.host.storageSet.mockClear();
    clickFormerUndo(game);
    expect(reset).not.toHaveBeenCalled();
    expect(trigger).toHaveBeenCalledOnce();
    expect(game.timeFreezeAnimation.isVisible).toBe(true);
    expect(game.timeFreezeAnimation.sample(9, false)).toEqual(animation);
    expect(game.model.snapshot()).toEqual(snapshot);
    expect(game.model.snapshot().timeFreezeSeconds).toBe(9);
    expect(game.save.boosters.time).toBe(1);
    expect(game.save.activeRun.boosterSpent.time).toBe(1);
    expect(storage.value).toEqual(saved);
    expect(game.host.storageSet).not.toHaveBeenCalled();
  });

  it("ignores the former undo position after an ordinary move while preserving the freeze pose", () => {
    const { game, reset, trigger } = freezeGame();
    game.useBooster("time");
    game.model.beginAction();
    expect(game.model.moveBlockStep("blue", 1, 2)).toBe(true);
    expect(game.commitAction()).toBe(true);
    game.model.tick(1);
    game.timeFreezeAnimation.update(9, true, 1);
    const before = game.timeFreezeAnimation.sample(9, false);
    const snapshot = game.model.snapshot();
    clickFormerUndo(game);
    expect(reset).not.toHaveBeenCalled();
    expect(trigger).toHaveBeenCalledOnce();
    expect(game.model.getBlock("blue").x).toBe(1);
    expect(game.model.snapshot()).toEqual(snapshot);
    expect(game.model.snapshot().timeFreezeSeconds).toBe(9);
    expect(game.timeFreezeAnimation.sample(9, false)).toEqual(before);
    expect(game.save.boosters.time).toBe(1);
  });
});

describe("time-freeze HUD palette handoff", () => {
  it.each([false, true])("keeps ending frost clear of the critical palette until its reset (reduced=%s)", (reducedMotion) => {
    const { game } = freezeGame();
    game.save.reducedMotion = reducedMotion;
    game.model.startCountdown();
    const beforeThreshold = game.model.snapshot();
    game.model.tick(50);
    const critical = game.model.snapshot();
    game.countdownWarning.observe(beforeThreshold, critical);
    game.countdownWarning.update(critical, true, 0);
    for (let frame = 0; frame < 4; frame++) game.countdownWarning.update(critical, true, 0.045);
    expect(game.countdownWarning.visual(critical, reducedMotion).stage).toBe("critical");

    game.useBooster("time");
    game.model.tick(10);
    game.timeFreezeAnimation.update(0, true, 0.16);
    const ending = game.model.snapshot();
    expect(ending).toMatchObject({ remainingSeconds: 10, timeFreezeSeconds: 0 });
    expect(game.timeFreezeAnimation.sample(0, reducedMotion)).toMatchObject({ phase: "ending", visible: true });

    const filledColors: unknown[] = [];
    const ctx = {
      globalAlpha: 1,
      fillStyle: "#ffffff",
      save: vi.fn(), restore: vi.fn(), translate: vi.fn(), scale: vi.fn(),
      moveTo: vi.fn(), lineTo: vi.fn(), quadraticCurveTo: vi.fn(), closePath: vi.fn(),
      fill: vi.fn(() => filledColors.push(ctx.fillStyle)),
    };
    game.ctx = ctx;
    game.art = { gameplayUi: {
      backButton: {}, pauseButton: {}, levelPill: {}, timerPanel: {}, timerIcon: {},
    } };
    game.drawGameplayImage = vi.fn();
    game.drawPressable = (_key: string, _rect: unknown, draw: () => void) => draw();
    game.withGameplayArtboard = (draw: () => void) => draw();
    game.label = vi.fn();

    game.drawHud();
    const timerLabel = game.label.mock.calls.find((call: unknown[]) => call[1] === 0 && call[2] === 0);
    expect(timerLabel?.[0]).toBe("00:10");
    expect(timerLabel?.[4]).toBe("#eeffff");
    expect(filledColors).not.toContain("#e52c41");
    expect(filledColors).not.toContain("#ff6337");
    expect(ctx.scale).toHaveBeenLastCalledWith(1, 1);
    expect(ctx.translate).toHaveBeenLastCalledWith(GAMEPLAY_ART_LAYOUT.timer.label.x, GAMEPLAY_ART_LAYOUT.timer.label.y);
    expect(game.model.snapshot()).toEqual(ending);

    game.timeFreezeAnimation.reset();
    game.label.mockClear();
    filledColors.length = 0;
    game.drawHud();
    const restoredTimerLabel = game.label.mock.calls.find((call: unknown[]) => call[1] === 0 && call[2] === 0);
    expect(restoredTimerLabel?.[4]).toBe("#ff3048");
    expect(filledColors).toContain("#e52c41");
    expect(game.countdownWarning.visual(game.model.snapshot(), reducedMotion).stage).toBe("critical");
    expect(game.model.snapshot()).toEqual(ending);
  });
});
