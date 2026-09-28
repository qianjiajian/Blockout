import { describe, expect, it } from "vitest";
import { PuzzleModel } from "../src/core/PuzzleModel";
import { usesExitAnimationCompletion, usesImmediatePlayableClock, usesRevisedMechanisms } from "../src/core/mechanismRules";
import type { ExitResult, LevelSpec } from "../src/core/types";

const level = (overrides: Partial<LevelSpec> = {}): LevelSpec => ({
  id: 99313, name: "departure completion", difficulty: "normal", reward: 0,
  timeSeconds: 30, width: 5, height: 5, mechanismRules: "revised-2026-09-23-v1.3",
  gates: [],
  flipDoors: [
    { id: "used", side: "left", offset: 0, size: 2, color: "red", initiallyOpen: true },
    { id: "other", side: "top", offset: 3, size: 1, color: "green", initiallyOpen: false },
  ],
  blocks: [
    { id: "a", x: 0, y: 0, shape: [[0, 0]], color: "red" },
    { id: "b", x: 0, y: 1, shape: [[0, 0]], color: "red" },
    { id: "mover", x: 4, y: 4, shape: [[0, 0]], color: "yellow" },
  ],
  ...overrides,
});
const deferred = (fixture = level()) => new PuzzleModel(fixture, { deferExitCompletion: true });
const doors = (model: PuzzleModel) => model.snapshot().flipDoors.map((door) => door.open);
const pending = (model: PuzzleModel) => model.snapshot().pendingExitAnimations ?? [];
const token = (result: ExitResult): string => {
  expect(result.ok).toBe(true);
  expect(result.exitAnimationId).toEqual(expect.any(String));
  return result.exitAnimationId!;
};
const depart = (model: PuzzleModel, id = "a") => {
  model.beginAction();
  const idToken = token(model.tryExit(id, "left"));
  expect(model.commitAction()).toBe(true);
  return idToken;
};

describe("v1.3 departure completion", () => {
  it("recognizes v1.3 without changing historical profile timing", () => {
    for (const mechanismRules of ["revised-2026-09-21", "revised-2026-09-21-v1.1", "revised-2026-09-21-v1.2", "revised-2026-09-23-v1.3"]) {
      expect(usesRevisedMechanisms({ mechanismRules })).toBe(true);
      expect(usesExitAnimationCompletion({ mechanismRules })).toBe(mechanismRules === "revised-2026-09-23-v1.3");
      expect(usesImmediatePlayableClock({ mechanismRules })).toBe(mechanismRules !== "revised-2026-09-21");
    }
    expect(usesExitAnimationCompletion({})).toBe(false);
  });

  it("delays only the door toggle, leaving keys, ice, covers and clearance at departure start", () => {
    const fixture = level();
    fixture.blocks[0].keyId = "k";
    fixture.blocks.push(
      { id: "locked", x: 4, y: 2, shape: [[0, 0]], color: "orange", lockedBy: "k" },
      { id: "ice", x: 2, y: 0, shape: [[0, 0]], color: "blue", frozen: 3 },
      { id: "hidden", x: 3, y: 2, shape: [[0, 0]], color: "purple", frozen: 6, shutterId: "cover" },
    );
    fixture.gates.push({ id: "ice-gate", side: "right", offset: 4, size: 1, color: "yellow", frozen: 3 });
    fixture.shutters = [{ id: "cover", x: 3, y: 2, width: 1, height: 1, count: 1 }];
    const model = deferred(fixture);
    const id = depart(model);
    expect(doors(model)).toEqual([true, false]);
    expect(pending(model)).toEqual([id]);
    expect(model.getBlock("a")).toBeUndefined();
    expect(model.getBlock("locked")?.lockedBy).toBeUndefined();
    expect(model.getBlock("ice")?.frozen).toBe(2);
    expect(model.getBlock("hidden")?.frozen).toBe(6);
    expect(model.snapshot().shutters[0]).toMatchObject({ count: 0, revealed: true });
    expect(model.snapshot().gates[0].frozen).toBe(2);
    expect(model.snapshot().cleared).toBe(1);
    const before = model.snapshot();
    expect(model.completeExitAnimation(id)).toBe(true);
    expect(doors(model)).toEqual([false, true]);
    expect(pending(model)).toEqual([]);
    const after = model.snapshot();
    expect(after.blocks).toEqual(before.blocks);
    expect(after.gates).toEqual(before.gates);
    expect(after.shutters).toEqual(before.shutters);
    expect(after.cleared).toBe(before.cleared);
    expect(model.completeExitAnimation(id)).toBe(false);
    expect(model.snapshot()).toEqual(after);
  });

  it("removes the shell bomb immediately but retains the shell key until body removal", () => {
    const fixture = level();
    Object.assign(fixture.blocks[0], { layers: ["red", "blue"], keyId: "k", timedBombSeconds: 5 });
    fixture.blocks.push({ id: "locked", x: 4, y: 2, shape: [[0, 0]], color: "orange", lockedBy: "k" });
    const model = deferred(fixture);
    const peel = model.tryExit("a", "left");
    const id = token(peel);
    expect(peel.layerRemoved).toBe(true);
    expect(model.getBlock("a")).toMatchObject({ color: "blue", layers: ["blue"], x: 0, y: 0, keyId: "k" });
    expect(model.getBlock("a")?.timedBombSeconds).toBeUndefined();
    expect(model.getBlock("locked")?.lockedBy).toBe("k");
    expect(doors(model)).toEqual([true, false]);
    expect(model.completeExitAnimation(id)).toBe(true);
    expect(doors(model)).toEqual([false, true]);
    const rocketId = token(model.removeBlockWithBooster("a"));
    expect(model.getBlock("locked")?.lockedBy).toBeUndefined();
    expect(doors(model)).toEqual([false, true]);
    expect(model.completeExitAnimation(rocketId)).toBe(true);
    expect(doors(model)).toEqual([true, false]);
    expect(model.snapshot().cleared).toBe(2);
  });

  it("gives a whole-shell booster removal one completion rather than one per layer", () => {
    const fixture = level();
    fixture.blocks[0].layers = ["red", "blue"];
    const model = deferred(fixture);
    const id = token(model.removeBlockWithBooster("a"));
    expect(model.getBlock("a")).toBeUndefined();
    expect(model.snapshot().cleared).toBe(1);
    expect(pending(model)).toEqual([id]);
    expect(doors(model)).toEqual([true, false]);
    expect(model.completeExitAnimation(id)).toBe(true);
    expect(doors(model)).toEqual([false, true]);
  });

  it("allows overlapping departures to complete once each in either order", () => {
    const model = deferred();
    const a = depart(model, "a");
    const b = depart(model, "b");
    expect(a).not.toBe(b);
    expect(pending(model)).toEqual([a, b]);
    expect(model.completeExitAnimation("unknown")).toBe(false);
    expect(model.completeExitAnimation(b)).toBe(true);
    expect(doors(model)).toEqual([false, true]);
    expect(model.completeExitAnimation(b)).toBe(false);
    expect(model.completeExitAnimation(a)).toBe(true);
    expect(doors(model)).toEqual([true, false]);
    expect(pending(model)).toEqual([]);
  });

  it("keeps headless solving immediate and rejects already-settled headless callbacks", () => {
    const model = new PuzzleModel(level());
    const id = token(model.tryExit("a", "left"));
    expect(doors(model)).toEqual([false, true]);
    expect(model.snapshot().pendingExitAnimations).toBeUndefined();
    expect(model.completeExitAnimation(id)).toBe(false);
    expect(model.exitAttemptStatus("b", "left")).toBe("no-gate");
  });

  it("does not add an animation wait or token to a level without flip doors", () => {
    const fixture = level({ flipDoors: [], gates: [{ id: "red", side: "left", offset: 0, size: 2, color: "red" }] });
    fixture.blocks[0].layers = ["red", "blue"];
    const model = deferred(fixture);
    const peel = model.tryExit("a", "left");
    expect(peel).toMatchObject({ ok: true, layerRemoved: true });
    expect(peel.exitAnimationId).toBeUndefined();
    expect(model.removeBlockWithBooster("a").exitAnimationId).toBeUndefined();
    expect(model.tryExit("b", "left").exitAnimationId).toBeUndefined();
    expect(model.snapshot().pendingExitAnimations).toBeUndefined();
  });

  it("releases a newly unblocked generator at departure start rather than animation completion", () => {
    const fixture = level({
      generators: [{ id: "machine", side: "top", offset: 1, spawn: [0, 0], queueBlockIds: ["cargo"] }],
      blocks: [
        { id: "a", x: 1, y: 0, shape: [[0, 0]], color: "red" },
        { id: "cargo", x: 0, y: 0, shape: [[1, 0]], color: "blue" },
      ],
    });
    const model = deferred(fixture);
    expect(model.snapshot().queuedBlocks).toHaveLength(1);
    const id = token(model.removeBlockWithBooster("a"));
    expect(model.getBlock("cargo")).toBeDefined();
    expect(model.snapshot().queuedBlocks).toEqual([]);
    expect(doors(model)).toEqual([true, false]);
    expect(model.completeExitAnimation(id)).toBe(true);
    expect(model.snapshot().generators[0].head).toBe(1);
  });

  it.each([undefined, "revised-2026-09-21-v1.2"] as const)("keeps %s immediate body removal despite the renderer option", (mechanismRules) => {
    const model = deferred(level({ mechanismRules }));
    expect(model.tryExit("a", "left")).toMatchObject({ ok: true });
    expect(doors(model)).toEqual([false, true]);
    expect(pending(model)).toEqual([]);
  });

  it("retains legacy no-toggle peels and v1.2 immediate-toggle peels", () => {
    for (const mechanismRules of [undefined, "revised-2026-09-21-v1.2"] as const) {
      const fixture = level({ mechanismRules });
      fixture.blocks[0].layers = ["red", "blue"];
      const model = deferred(fixture);
      const result = model.tryExit("a", "left");
      expect(result).toMatchObject({ ok: true, layerRemoved: true });
      expect(result.exitAnimationId).toBeUndefined();
      expect(doors(model)).toEqual(mechanismRules ? [false, true] : [true, false]);
    }
  });

  it("does not register moves, blocked exits or rejected boosters", () => {
    const model = deferred();
    expect(model.tryExit("a", "right").ok).toBe(false);
    expect(model.removeBlockWithBooster("missing").ok).toBe(false);
    expect(model.moveBlockStep("mover", 3, 4)).toBe(true);
    expect(pending(model)).toEqual([]);
    expect(doors(model)).toEqual([true, false]);
  });
});

describe("departure completion history and lifecycle", () => {
  it("undoes an unfinished departure and never reuses its callback token", () => {
    const model = deferred();
    const old = depart(model);
    expect(model.undo()).toBe(true);
    expect(model.getBlock("a")).toBeDefined();
    expect(pending(model)).toEqual([]);
    expect(model.completeExitAnimation(old)).toBe(false);
    const next = depart(model);
    expect(next).not.toBe(old);
    expect(model.completeExitAnimation(old)).toBe(false);
    expect(doors(model)).toEqual([true, false]);
    expect(model.completeExitAnimation(next)).toBe(true);
  });

  it("undoes the completed departure itself without allowing a duplicate callback", () => {
    const model = deferred();
    const id = depart(model);
    expect(model.completeExitAnimation(id)).toBe(true);
    expect(model.undo()).toBe(true);
    expect(model.getBlock("a")).toBeDefined();
    expect(doors(model)).toEqual([true, false]);
    expect(model.completeExitAnimation(id)).toBe(false);
  });

  it.each([false, true])("cancels its own departure with completed=%s", (finishFirst) => {
    const model = deferred();
    model.beginAction();
    const id = token(model.tryExit("a", "left"));
    if (finishFirst) expect(model.completeExitAnimation(id)).toBe(true);
    model.cancelAction();
    expect(model.getBlock("a")).toBeDefined();
    expect(doors(model)).toEqual([true, false]);
    expect(pending(model)).toEqual([]);
    expect(model.completeExitAnimation(id)).toBe(false);
    expect(model.undo()).toBe(false);
  });

  it("keeps an older unfinished departure when undoing an unrelated later move", () => {
    const model = deferred();
    const id = depart(model);
    model.beginAction();
    expect(model.moveBlockStep("mover", 3, 4)).toBe(true);
    expect(model.commitAction()).toBe(true);
    expect(model.undo()).toBe(true);
    expect(pending(model)).toEqual([id]);
    expect(model.getBlock("mover")).toMatchObject({ x: 4, y: 4 });
    expect(model.completeExitAnimation(id)).toBe(true);
    expect(doors(model)).toEqual([false, true]);
  });

  it("does not resurrect a completed older departure through several later undo snapshots", () => {
    const model = deferred();
    const id = depart(model);
    for (const x of [3, 2]) {
      model.beginAction();
      expect(model.moveBlockStep("mover", x, 4)).toBe(true);
      expect(model.commitAction()).toBe(true);
    }
    expect(model.completeExitAnimation(id)).toBe(true);
    for (let undo = 0; undo < 2; undo += 1) {
      expect(model.undo()).toBe(true);
      expect(doors(model)).toEqual([false, true]);
      expect(pending(model)).toEqual([]);
      expect(model.completeExitAnimation(id)).toBe(false);
    }
    expect(model.undo()).toBe(true);
    expect(doors(model)).toEqual([true, false]);
  });

  it.each([false, true])("preserves an older completion during cancellation of mutated=%s gesture", (mutate) => {
    const model = deferred();
    const id = depart(model);
    model.beginAction();
    if (mutate) expect(model.moveBlockStep("mover", 3, 4)).toBe(true);
    expect(model.completeExitAnimation(id)).toBe(true);
    model.cancelAction();
    expect(doors(model)).toEqual([false, true]);
    expect(pending(model)).toEqual([]);
    expect(model.getBlock("mover")).toMatchObject({ x: 4, y: 4 });
    expect(model.completeExitAnimation(id)).toBe(false);
  });

  it("clones pending events and renderer mode without sharing their mutable state or future ids", () => {
    const model = deferred();
    const id = depart(model);
    const snapshot = model.snapshot();
    snapshot.pendingExitAnimations!.length = 0;
    expect(pending(model)).toEqual([id]);
    const copy = model.clone();
    expect(copy.snapshot()).toEqual(model.snapshot());
    const copyNext = token(copy.tryExit("b", "left"));
    const originalNext = token(model.tryExit("b", "left"));
    expect(copyNext).not.toBe(originalNext);
    expect(copy.completeExitAnimation(originalNext)).toBe(false);
    expect(copy.completeExitAnimation(id)).toBe(true);
    expect(doors(copy)).toEqual([false, true]);
    expect(doors(model)).toEqual([true, false]);
    expect(model.completeExitAnimation(id)).toBe(true);
  });

  it("invalidates pending departures on failure even after add-time recovery and later undo", () => {
    const model = deferred(level({ timeSeconds: 1 }));
    const id = depart(model);
    model.beginAction();
    expect(model.moveBlockStep("mover", 3, 4)).toBe(true);
    expect(model.commitAction()).toBe(true);
    model.tick(1);
    expect(model.snapshot().failed).toBe(true);
    expect(pending(model)).toEqual([]);
    expect(model.completeExitAnimation(id)).toBe(false);
    expect(model.addTime(10)).toBe(true);
    expect(model.snapshot().failed).toBe(false);
    expect(model.completeExitAnimation(id)).toBe(false);
    expect(model.undo()).toBe(true);
    expect(pending(model)).toEqual([]);
    expect(model.completeExitAnimation(id)).toBe(false);
    expect(doors(model)).toEqual([true, false]);
  });

  it("allows the final departure to complete after the board is logically complete", () => {
    const fixture = level();
    fixture.blocks = [fixture.blocks[0]];
    const model = deferred(fixture);
    const result = model.tryExit("a", "left");
    const id = token(result);
    expect(result.complete).toBe(true);
    expect(model.snapshot().complete).toBe(true);
    expect(doors(model)).toEqual([true, false]);
    expect(model.completeExitAnimation(id)).toBe(true);
    expect(doors(model)).toEqual([false, true]);
    expect(model.completeExitAnimation(id)).toBe(false);
  });

  it("does not restore an invalidated older token when a gesture is cancelled after failure", () => {
    const model = deferred(level({ timeSeconds: 1 }));
    const id = depart(model);
    model.beginAction();
    expect(model.moveBlockStep("mover", 3, 4)).toBe(true);
    model.tick(1);
    model.cancelAction();
    expect(model.snapshot().failed).toBe(true);
    expect(pending(model)).toEqual([]);
    expect(model.completeExitAnimation(id)).toBe(false);
    expect(doors(model)).toEqual([true, false]);
  });
});
