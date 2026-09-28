import { describe, expect, it } from "vitest";
import { PuzzleModel } from "../src/core/PuzzleModel";
import { ACTIVE_MECHANISM_PROFILE, usesExitAnimationCompletion, usesImmediatePlayableClock, usesRevisedMechanisms } from "../src/core/mechanismRules";
import type { LevelSpec } from "../src/core/types";

const fixture = (overrides: Partial<LevelSpec> = {}): LevelSpec => ({
  id: 99314, name: "time freeze", difficulty: "normal", reward: 0,
  width: 5, height: 5, timeSeconds: 60, mechanismRules: "revised-2026-09-23-v1.4",
  gates: [{ id: "red", side: "left", offset: 0, size: 1, color: "red" }],
  blocks: [
    { id: "a", x: 0, y: 0, shape: [[0, 0]], color: "red" },
    { id: "mover", x: 4, y: 4, shape: [[0, 0]], color: "blue", timedBombSeconds: 10 },
  ],
  ...overrides,
});
const useFreeze = (model: PuzzleModel, seconds = 10): void => {
  model.beginAction();
  expect(model.freezeTime(seconds)).toBe(true);
  expect(model.commitAction(false)).toBe(true);
};
const move = (model: PuzzleModel, x: number): void => {
  model.beginAction();
  expect(model.moveBlockStep("mover", x, 4)).toBe(true);
  expect(model.commitAction()).toBe(true);
};

describe("time-freeze clocks", () => {
  it("keeps all historical helpers and inherits v1.3 completion in v1.4", () => {
    expect(ACTIVE_MECHANISM_PROFILE).toBe("revised-2026-09-27-v1.5");
    for (const mechanismRules of ["revised-2026-09-21", "revised-2026-09-21-v1.1", "revised-2026-09-21-v1.2", "revised-2026-09-23-v1.3", "revised-2026-09-23-v1.4"]) {
      expect(usesRevisedMechanisms({ mechanismRules })).toBe(true);
      expect(usesImmediatePlayableClock({ mechanismRules })).toBe(mechanismRules !== "revised-2026-09-21");
      expect(usesExitAnimationCompletion({ mechanismRules })).toBe(mechanismRules.endsWith("v1.3") || mechanismRules.endsWith("v1.4"));
    }
  });

  it.each([undefined, "revised-2026-09-21", "revised-2026-09-21-v1.1", "revised-2026-09-21-v1.2", "revised-2026-09-23-v1.3", "revised-2026-09-23-v1.4"] as const)("freezes both clocks in %s without waiting for a first drag", (mechanismRules) => {
    const model = new PuzzleModel(fixture({ mechanismRules }));
    expect(model.snapshot().timeFreezeSeconds).toBe(0);
    expect(model.snapshot().started).toBe(false);
    expect(model.freezeTime(10)).toBe(true);
    expect(model.snapshot()).toMatchObject({ started: true, autonomousStarted: true, timeFreezeSeconds: 10, remainingSeconds: 60 });
    model.tick(3);
    expect(model.snapshot()).toMatchObject({ timeFreezeSeconds: 7, remainingSeconds: 60 });
    expect(model.getBlock("mover")?.timedBombSeconds).toBe(10);
    model.tick(7);
    expect(model.snapshot()).toMatchObject({ timeFreezeSeconds: 0, remainingSeconds: 60 });
    model.tick(0.5);
    expect(model.snapshot().remainingSeconds).toBe(59.5);
    expect(model.getBlock("mover")?.timedBombSeconds).toBe(9.5);
  });

  it("charges only the unfrozen tail of a tick that crosses expiry", () => {
    const model = new PuzzleModel(fixture());
    model.freezeTime(2.25);
    model.tick(3.5);
    expect(model.snapshot()).toMatchObject({ remainingSeconds: 58.75, timeFreezeSeconds: 0, failed: false });
    expect(model.getBlock("mover")?.timedBombSeconds).toBe(8.75);
    expect(model.freezeTime(0.5)).toBe(true);
    model.tick(1);
    expect(model.snapshot().remainingSeconds).toBe(58.25);
    expect(model.getBlock("mover")?.timedBombSeconds).toBe(8.25);
  });

  it("rejects invalid durations and an active repeat without creating another action", () => {
    const model = new PuzzleModel(fixture());
    const initial = model.snapshot();
    for (const seconds of [0, -1, NaN, Infinity, -Infinity]) expect(model.freezeTime(seconds)).toBe(false);
    expect(model.snapshot()).toEqual(initial);
    expect(model.freezeTime(10)).toBe(true);
    model.tick(2);
    const active = model.snapshot();
    model.beginAction();
    expect(model.freezeTime(10)).toBe(false);
    expect(model.commitAction(false)).toBe(false);
    expect(model.snapshot()).toEqual(active);
    expect(model.undo()).toBe(false);
  });

  it("does not consume freeze without a valid active tick", () => {
    const model = new PuzzleModel(fixture());
    model.freezeTime(10);
    const paused = model.snapshot();
    // The host pauses/backgrounds by withholding ticks; snapshot/clone are reads.
    expect(model.clone().snapshot()).toEqual(paused);
    for (const seconds of [-1, NaN, Infinity]) expect(model.tick(seconds)).toBe(false);
    model.tick(0);
    expect(model.snapshot()).toEqual(paused);
  });

  it("protects ice, lock and cover bombs activated while the same freeze is running", () => {
    const model = new PuzzleModel(fixture({
      blocks: [
        { id: "a", x: 0, y: 0, shape: [[0, 0]], color: "red", keyId: "k" },
        { id: "active", x: 1, y: 1, shape: [[0, 0]], color: "blue", timedBombSeconds: 5 },
        { id: "ice", x: 2, y: 1, shape: [[0, 0]], color: "green", frozen: 1, timedBombSeconds: 5 },
        { id: "lock", x: 3, y: 1, shape: [[0, 0]], color: "purple", lockedBy: "k", timedBombSeconds: 5 },
        { id: "hidden", x: 4, y: 1, shape: [[0, 0]], color: "yellow", shutterId: "cover", timedBombSeconds: 5 },
      ],
      shutters: [{ id: "cover", x: 4, y: 1, width: 1, height: 1, count: 1 }],
    }));
    model.freezeTime(10);
    model.tick(3);
    expect(model.tryExit("a", "left").ok).toBe(true);
    for (const id of ["active", "ice", "lock", "hidden"]) expect(model.isBlockActive(model.getBlock(id)!)).toBe(true);
    model.tick(7);
    for (const id of ["active", "ice", "lock", "hidden"]) expect(model.getBlock(id)?.timedBombSeconds).toBe(5);
    model.tick(0.5);
    for (const id of ["active", "ice", "lock", "hidden"]) expect(model.getBlock(id)?.timedBombSeconds).toBe(4.5);
  });

  it("continues movement and fixed-queue spawning, including the newly spawned bomb", () => {
    const model = new PuzzleModel(fixture({
      generators: [{ id: "machine", side: "top", offset: 1, spawn: [0, 0], queueBlockIds: ["cargo"] }],
      blocks: [
        { id: "blocker", x: 1, y: 0, shape: [[0, 0]], color: "red" },
        { id: "cargo", x: 0, y: 0, shape: [[1, 0]], color: "blue", timedBombSeconds: 5 },
      ],
    }));
    model.freezeTime(10);
    model.tick(2);
    expect(model.moveBlockStep("blocker", 1, 1)).toBe(true);
    expect(model.getBlock("cargo")).toBeDefined();
    expect(model.snapshot().generators[0].remaining).toBe(0);
    model.tick(8.5);
    expect(model.getBlock("cargo")?.timedBombSeconds).toBe(4.5);
    expect(model.snapshot().remainingSeconds).toBe(59.5);
  });

  it("advances legacy timed deliveries and moving platforms using the full tick", () => {
    const model = new PuzzleModel(fixture({ mechanismRules: undefined,
      generators: [{ id: "machine", side: "top", offset: 1, spawn: [1, 0], queueBlockIds: ["cargo"], trigger: "time", intervalSeconds: 1 }],
      elevators: [{ id: "platform", blockId: "mover", fromX: 4, fromY: 4, toX: 3, toY: 4, width: 1, height: 1, periodSeconds: 1 }],
      blocks: [
        { id: "mover", x: 4, y: 4, shape: [[0, 0]], color: "blue", timedBombSeconds: 10 },
        { id: "cargo", x: 0, y: 0, shape: [[0, 0]], color: "green" },
      ],
    }));
    expect(model.freezeTime(10)).toBe(true);
    expect(model.tick(1)).toBe(true);
    expect(model.getBlock("cargo")).toMatchObject({ x: 1, y: 0 });
    expect(model.getBlock("mover")).toMatchObject({ x: 3, y: 4, timedBombSeconds: 10 });
    expect(model.snapshot()).toMatchObject({ remainingSeconds: 60, timeFreezeSeconds: 9 });
  });

  it("continues v1.4 exit completion and shell removal while time is frozen", () => {
    const level = fixture({ gates: [], flipDoors: [{ id: "red", side: "left", offset: 0, size: 1, color: "red", initiallyOpen: true }] });
    level.blocks[0].layers = ["red", "green"];
    level.blocks[0].timedBombSeconds = 1;
    const model = new PuzzleModel(level, { deferExitCompletion: true });
    model.freezeTime(10);
    model.tick(2);
    const exit = model.tryExit("a", "left");
    expect(exit).toMatchObject({ ok: true, layerRemoved: true, exitAnimationId: expect.any(String) });
    expect(model.getBlock("a")?.timedBombSeconds).toBeUndefined();
    expect(model.snapshot().flipDoors[0].open).toBe(true);
    expect(model.completeExitAnimation(exit.exitAnimationId!)).toBe(true);
    expect(model.snapshot().flipDoors[0].open).toBe(false);
    expect(model.snapshot().timeFreezeSeconds).toBe(8);
  });
});

describe("time-freeze history and termination", () => {
  it.each([undefined, "revised-2026-09-23-v1.4"] as const)("keeps spent freeze time when cancelling a %s drag, including an expiry-crossing tick", (mechanismRules) => {
    const model = new PuzzleModel(fixture({ mechanismRules }));
    useFreeze(model);
    model.tick(2);
    model.beginAction();
    expect(model.moveBlockStep("mover", 3, 4)).toBe(true);
    model.tick(3);
    model.cancelAction();
    expect(model.snapshot()).toMatchObject({ remainingSeconds: 60, timeFreezeSeconds: 5 });
    expect(model.getBlock("mover")).toMatchObject({ x: 4, timedBombSeconds: 10 });
    model.beginAction();
    expect(model.moveBlockStep("mover", 3, 4)).toBe(true);
    model.tick(7);
    model.cancelAction();
    expect(model.snapshot()).toMatchObject({ remainingSeconds: 58, timeFreezeSeconds: 0 });
    expect(model.getBlock("mover")).toMatchObject({ x: 4, timedBombSeconds: 8 });
  });

  it("does not retrospectively charge frozen time to a restored shell bomb", () => {
    const level = fixture();
    level.blocks[0].layers = ["red", "green"];
    level.blocks[0].timedBombSeconds = 10;
    const model = new PuzzleModel(level);
    useFreeze(model, 3);
    model.beginAction();
    expect(model.tryExit("a", "left").layerRemoved).toBe(true);
    model.tick(5);
    model.cancelAction();
    expect(model.getBlock("a")).toMatchObject({ layers: ["red", "green"], timedBombSeconds: 8 });
    expect(model.snapshot()).toMatchObject({ remainingSeconds: 58, timeFreezeSeconds: 0 });
  });

  it("ages every undo snapshot without changing existing ordinary timer-undo behavior", () => {
    const model = new PuzzleModel(fixture());
    useFreeze(model);
    model.tick(2);
    move(model, 3);
    model.tick(3);
    move(model, 2);
    model.tick(2);
    expect(model.snapshot().timeFreezeSeconds).toBe(3);
    expect(model.undo()).toBe(true);
    expect(model.snapshot().timeFreezeSeconds).toBe(3);
    expect(model.undo()).toBe(true);
    expect(model.snapshot().timeFreezeSeconds).toBe(3);
    expect(model.undo()).toBe(true); // Undoing the booster itself cancels its unspent effect.
    expect(model.snapshot().timeFreezeSeconds).toBe(0);
  });

  it("cannot revive an expired earlier freeze by undoing a later use", () => {
    const model = new PuzzleModel(fixture());
    useFreeze(model, 2);
    move(model, 3);
    model.tick(2);
    useFreeze(model, 10);
    model.tick(3);
    expect(model.snapshot().timeFreezeSeconds).toBe(7);
    expect(model.undo()).toBe(true);
    expect(model.snapshot().timeFreezeSeconds).toBe(0);
    expect(model.undo()).toBe(true);
    expect(model.snapshot().timeFreezeSeconds).toBe(0);
  });

  it("cancels a pending booster use without restoring any effect to older snapshots", () => {
    const model = new PuzzleModel(fixture());
    move(model, 3);
    model.beginAction();
    expect(model.freezeTime(10)).toBe(true);
    model.tick(3);
    model.cancelAction();
    expect(model.snapshot().timeFreezeSeconds).toBe(0);
    expect(model.undo()).toBe(true);
    expect(model.snapshot().timeFreezeSeconds).toBe(0);
  });

  it("clones the remaining effect independently and starts a fresh model with no effect", () => {
    const level = fixture();
    const model = new PuzzleModel(level);
    model.freezeTime(10);
    model.tick(2);
    const copy = model.clone();
    expect(copy.snapshot()).toEqual(model.snapshot());
    copy.tick(3);
    expect(copy.snapshot().timeFreezeSeconds).toBe(5);
    expect(model.snapshot().timeFreezeSeconds).toBe(8);
    expect(new PuzzleModel(level).snapshot().timeFreezeSeconds).toBe(0);
  });

  it("clears the effect on victory and does not revive it when that clear is undone", () => {
    const level = fixture();
    level.blocks = [level.blocks[0]];
    const model = new PuzzleModel(level);
    useFreeze(model);
    model.beginAction();
    expect(model.tryExit("a", "left").complete).toBe(true);
    model.commitAction();
    expect(model.snapshot().timeFreezeSeconds).toBe(0);
    expect(model.freezeTime(10)).toBe(false);
    expect(model.undo()).toBe(true);
    expect(model.snapshot().timeFreezeSeconds).toBe(0);
  });

  it("does not restore a finished run's freeze when its final pending action is cancelled", () => {
    const level = fixture();
    level.blocks = [level.blocks[0]];
    const model = new PuzzleModel(level);
    useFreeze(model);
    model.beginAction();
    expect(model.tryExit("a", "left").complete).toBe(true);
    model.cancelAction();
    expect(model.snapshot()).toMatchObject({ complete: false, timeFreezeSeconds: 0 });
    expect(model.getBlock("a")).toBeDefined();
  });

  it.each(["bomb", "level"] as const)("fails from %s only after the freeze ends and rejects use after failure", (reason) => {
    const level = fixture({ timeSeconds: reason === "level" ? 1 : 60 });
    if (reason === "bomb") level.blocks[1].timedBombSeconds = 1;
    const model = new PuzzleModel(level);
    model.freezeTime(10);
    model.tick(10);
    expect(model.snapshot().failed).toBe(false);
    model.tick(1);
    expect(model.snapshot()).toMatchObject({ failed: true, timeFreezeSeconds: 0 });
    expect(model.freezeTime(10)).toBe(false);
  });

  it("keeps addTime available for historical callers without turning it into a freeze", () => {
    const model = new PuzzleModel(fixture());
    expect(model.addTime(30)).toBe(true);
    expect(model.snapshot()).toMatchObject({ remainingSeconds: 90, timeFreezeSeconds: 0 });
  });
});
