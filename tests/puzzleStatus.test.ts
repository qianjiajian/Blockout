import { afterEach, describe, expect, it, vi } from "vitest";
import { getLevel } from "../src/core/levels";
import { PuzzleModel } from "../src/core/PuzzleModel";
import type { LevelSpec } from "../src/core/types";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";
import { ComboAnimation } from "../src/game/comboAnimation";
import { CountdownWarning } from "../src/game/countdownWarning";
import { TimeFreezeAnimation } from "../src/game/timeFreezeAnimation";

/** Sparse state-transition fixture, not a formal level or difficulty proof. */
const fixture = (overrides: Partial<LevelSpec> = {}): LevelSpec => ({
  id: 21, name: "scalar state fixture", difficulty: "normal", reward: 0,
  mechanismRules: "revised-2026-09-27-v1.5", width: 3, height: 3, timeSeconds: 60,
  gates: [
    { id: "red-left", color: "red", side: "left", offset: 0, size: 1 },
    { id: "blue-right", color: "blue", side: "right", offset: 2, size: 1 },
  ],
  blocks: [
    { id: "red", color: "red", x: 0, y: 0, shape: [[0, 0]] },
    { id: "blue", color: "blue", x: 2, y: 2, shape: [[0, 0]] },
  ],
  ...overrides,
});

function expectSnapshotStatus(model: PuzzleModel) {
  const snapshot = model.snapshot();
  const { cleared, moves, remainingSeconds, timeFreezeSeconds, started, autonomousStarted, complete, failed } = snapshot;
  expect(model.readStatus()).toEqual({
    cleared, moves, remainingSeconds, timeFreezeSeconds, started, autonomousStarted, complete, failed,
    ...("pulseRescueUsed" in snapshot ? { pulseRescueUsed: snapshot.pulseRescueUsed } : {}),
    pendingExitAnimationCount: snapshot.pendingExitAnimations?.length ?? 0,
  });
}

/** Real scalar presentation methods and real model, without storage or raster drawing. */
function presentationGame(level = fixture()) {
  const game = Object.create(ColorEscapeGame.prototype) as any;
  game.model = new PuzzleModel(level);
  game.save = game.sanitizeSave({
    ...game.sanitizeSave(undefined), highestLevel: 21, currentLevel: level.id,
    boosterUnlockSeen: ["time", "rocket", "pulse"], boosterUsageSeen: ["time", "rocket", "pulse"],
    boosters: { time: 2, rocket: 2, pulse: 2 },
  });
  Object.assign(game, {
    screen: "playing", appVisible: true, exitGhosts: [], pendingCelebration: 0,
    countdownWarning: new CountdownWarning(), timeFreezeAnimation: new TimeFreezeAnimation(),
    comboAnimation: new ComboAnimation(), comboAnimationOwner: game.model,
    host: { music: vi.fn(), sound: vi.fn(), stopSound: vi.fn() },
    ctx: { save: vi.fn(), restore: vi.fn(), translate: vi.fn(), scale: vi.fn() }, art: {},
    label: vi.fn(), withGameplayArtboard: (draw: () => void) => draw(),
  });
  return game;
}

afterEach(() => vi.restoreAllMocks());

describe("detached scalar puzzle status", () => {
  it("retains independent readings through clock, freeze, move, cancel and undo", () => {
    const model = new PuzzleModel(fixture());
    const opening = model.readStatus();
    expectSnapshotStatus(model);
    model.startCountdown();
    model.tick(1.25);
    const ticking = model.readStatus();
    expect(ticking).toMatchObject({ started: true, autonomousStarted: false, remainingSeconds: 58.75 });
    expect(model.freezeTime(10)).toBe(true);
    model.tick(0.5);
    expect(model.readStatus()).toMatchObject({ remainingSeconds: 58.75, timeFreezeSeconds: 9.5, autonomousStarted: true });
    expectSnapshotStatus(model);

    model.beginAction();
    expect(model.moveBlockStep("red", 1, 0)).toBe(true);
    model.tick(0.25);
    model.cancelAction();
    expect(model.getBlock("red")).toMatchObject({ x: 0, y: 0 });
    expect(model.readStatus()).toMatchObject({ moves: 0, timeFreezeSeconds: 9.25 });
    expectSnapshotStatus(model);
    model.beginAction();
    expect(model.moveBlockStep("red", 1, 0)).toBe(true);
    expect(model.commitAction()).toBe(true);
    const moved = model.readStatus();
    expect(moved.moves).toBe(1);
    expect(model.undo()).toBe(true);
    expect(model.readStatus().moves).toBe(0);
    expectSnapshotStatus(model);

    expect(opening).toMatchObject({ started: false, autonomousStarted: false, remainingSeconds: 60, timeFreezeSeconds: 0 });
    expect(ticking).toMatchObject({ remainingSeconds: 58.75, timeFreezeSeconds: 0 });
    expect(moved.moves).toBe(1);
    expect(model.readStatus()).not.toBe(model.readStatus());
  });

  it("reads only detached primitives without calling snapshot or exposing model state", () => {
    const model = new PuzzleModel(getLevel(70));
    const original = model.snapshot();
    const snapshot = vi.spyOn(model, "snapshot").mockImplementation(() => { throw new Error("board copy requested"); });
    const status = model.readStatus();
    expect(Object.values(status).every(value => typeof value === "number" || typeof value === "boolean")).toBe(true);
    expect(status).not.toHaveProperty("pulseRescueUsed");
    (status as { remainingSeconds: number }).remainingSeconds = -1;
    (status as { complete: boolean }).complete = true;
    expect(model.readStatus()).toMatchObject({ remainingSeconds: original.remainingSeconds, complete: false });
    expect(snapshot).not.toHaveBeenCalled();
    snapshot.mockRestore();
    expect(model.snapshot()).toEqual(original);
  });

  it("tracks deferred exit counts, completion and stale callbacks after undo", () => {
    const model = new PuzzleModel(fixture({
      gates: [],
      flipDoors: [{ id: "red-flip", color: "red", side: "left", offset: 0, size: 2, initiallyOpen: true }],
      blocks: [
        { id: "a", color: "red", x: 0, y: 0, shape: [[0, 0]] },
        { id: "b", color: "red", x: 0, y: 1, shape: [[0, 0]] },
      ],
    }), { deferExitCompletion: true });
    const depart = (id: string) => {
      model.beginAction();
      const exit = model.tryExit(id, "left");
      expect(exit.ok).toBe(true);
      expect(model.commitAction()).toBe(true);
      expect(exit.exitAnimationId).toBeDefined();
      return exit.exitAnimationId!;
    };
    const stale = depart("a");
    expect(model.readStatus().pendingExitAnimationCount).toBe(1);
    expect(model.undo()).toBe(true);
    expect(model.readStatus()).toMatchObject({ cleared: 0, moves: 0, pendingExitAnimationCount: 0 });
    expect(model.completeExitAnimation(stale)).toBe(false);
    expectSnapshotStatus(model);

    const a = depart("a"), b = depart("b");
    const departing = model.readStatus();
    expect(departing).toMatchObject({ complete: true, cleared: 2, moves: 2, pendingExitAnimationCount: 2 });
    expectSnapshotStatus(model);
    expect(model.completeExitAnimation(b)).toBe(true);
    expect(model.readStatus().pendingExitAnimationCount).toBe(1);
    expect(model.completeExitAnimation(a)).toBe(true);
    expect(model.readStatus().pendingExitAnimationCount).toBe(0);
    expect(departing.pendingExitAnimationCount).toBe(2);
    expectSnapshotStatus(model);
  });

  it("reports the real pulse rescue transaction and terminal clock failure", () => {
    const model = new PuzzleModel(getLevel(10));
    const opening = model.readStatus();
    expect(opening.pulseRescueUsed).toBe(false);
    model.beginAction();
    expect(model.thawAll(2)).toBe(true);
    expect(model.commitAction(false)).toBe(true);
    const used = model.readStatus();
    expect(used.pulseRescueUsed).toBe(true);
    expectSnapshotStatus(model);
    expect(model.undo()).toBe(true);
    expect(model.readStatus().pulseRescueUsed).toBe(false);
    expect(used.pulseRescueUsed).toBe(true);
    model.startCountdown();
    model.tick(model.readStatus().remainingSeconds);
    expect(model.readStatus()).toMatchObject({ failed: true, complete: false, remainingSeconds: 0, timeFreezeSeconds: 0 });
    expect(opening.failed).toBe(false);
    expectSnapshotStatus(model);
  });
});

describe("scalar presentation reads", () => {
  it("updates clock, audio, guides and HUD without copying a board", () => {
    const game = presentationGame();
    game.model.startCountdown();
    game.model.tick(42);
    const snapshot = vi.spyOn(game.model, "snapshot").mockImplementation(() => { throw new Error("board copy requested"); });
    game.syncMusic();
    game.updateBoosterUnlockGuide(0.016);
    game.updateFreezeUsageGuide(0.016);
    game.updateRocketRescueGuide(0.016);
    game.updatePulseRescueGuide(0.016);
    game.updateCountdownWarning(0.016);
    game.updateRocketFlight(0.016);
    game.updateComboAnimation(0.016);
    game.drawHud();
    game.drawTimeFreezeEffect();
    expect(game.host.music).toHaveBeenLastCalledWith("danger", true);
    expect(game.label.mock.calls.some((args: unknown[]) => args[0] === game.formatTime(18))).toBe(true);
    expect(snapshot).not.toHaveBeenCalled();
  });

  it("copies Lv7 geometry only after scalar eligibility and preserves its real deadlock hint", () => {
    const game = presentationGame(getLevel(7));
    game.model.startCountdown();
    const snapshot = vi.spyOn(game.model, "snapshot");
    game.updateRocketRescueGuide(0.016);
    expect(snapshot).not.toHaveBeenCalled();
    expect(game.rocketRescueGuide).toBeUndefined();
    game.model.beginAction();
    expect(game.model.tryExit("cc-piece-04", "top").ok).toBe(true);
    expect(game.model.commitAction()).toBe(true);
    snapshot.mockClear();
    game.updateRocketRescueGuide(0.016);
    expect(snapshot).toHaveBeenCalledOnce();
    expect(game.rocketRescueGuide).toEqual({ phase: "booster", age: 0 });
    const hint = game.rocketRescueGuide;
    game.screen = "paused";
    snapshot.mockClear();
    game.updateRocketRescueGuide(10);
    expect(game.rocketRescueGuide).toBe(hint);
    expect(hint.age).toBe(0);
    expect(snapshot).not.toHaveBeenCalled();
    game.model.tick(game.model.readStatus().remainingSeconds);
    game.screen = "playing";
    game.updateRocketRescueGuide(0.016);
    expect(game.rocketRescueGuide).toBeUndefined();
    expect(snapshot).not.toHaveBeenCalled();
  });
});
