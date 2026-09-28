import { describe, expect, it } from "vitest";
import { PuzzleModel } from "../src/core/PuzzleModel";
import { ACTIVE_MECHANISM_PROFILE, usesExitAnimationCompletion, usesFrozenFlipDoorEligibility, usesImmediatePlayableClock, usesRevisedMechanisms } from "../src/core/mechanismRules";
import type { ExitResult, LevelSpec, PuzzleSnapshot } from "../src/core/types";

const profile = "revised-2026-09-27-v1.5" as const;
const fixture = (overrides: Partial<LevelSpec> = {}): LevelSpec => ({
  id: 99315, name: "frozen flip eligibility", difficulty: "normal", reward: 0,
  timeSeconds: 30, width: 5, height: 5, mechanismRules: profile,
  gates: [{ id: "red", side: "left", offset: 0, size: 3, color: "red" }],
  flipDoors: [
    { id: "frozen-open", side: "top", offset: 0, size: 1, color: "blue", frozen: 2, initiallyOpen: true },
    { id: "frozen-closed", side: "top", offset: 2, size: 1, color: "green", frozen: 2, initiallyOpen: false },
    { id: "ready", side: "right", offset: 4, size: 1, color: "yellow", initiallyOpen: true },
  ],
  blocks: [
    { id: "a", x: 0, y: 0, shape: [[0, 0]], color: "red" },
    { id: "b", x: 0, y: 1, shape: [[0, 0]], color: "red" },
    { id: "c", x: 0, y: 2, shape: [[0, 0]], color: "red" },
    { id: "mover", x: 4, y: 4, shape: [[0, 0]], color: "yellow" },
  ],
  ...overrides,
});
const deferred = (level = fixture()) => new PuzzleModel(level, { deferExitCompletion: true });
const state = (model: PuzzleModel) => model.snapshot().flipDoors.map(({ id, frozen, open }) => ({ id, frozen, open }));
const opens = (model: PuzzleModel) => model.snapshot().flipDoors.map(({ open }) => open);
const token = (result: ExitResult) => {
  expect(result.ok).toBe(true);
  expect(result.exitAnimationId).toEqual(expect.any(String));
  return result.exitAnimationId!;
};
const depart = (model: PuzzleModel, id: string) => {
  model.beginAction();
  const pending = token(model.tryExit(id, "left"));
  expect(model.commitAction()).toBe(true);
  return pending;
};
const restore = (model: PuzzleModel, snapshot: PuzzleSnapshot) => {
  (model as unknown as { restore: (snapshot: PuzzleSnapshot) => void }).restore(snapshot);
};

describe("v1.5 frozen flip-door eligibility", () => {
  it("extends the helpers while retaining all historical profile identities", () => {
    expect(ACTIVE_MECHANISM_PROFILE).toBe(profile);
    for (const mechanismRules of ["revised-2026-09-23-v1.3", "revised-2026-09-23-v1.4", profile]) {
      expect(usesRevisedMechanisms({ mechanismRules })).toBe(true);
      expect(usesImmediatePlayableClock({ mechanismRules })).toBe(true);
      expect(usesExitAnimationCompletion({ mechanismRules })).toBe(true);
      expect(usesFrozenFlipDoorEligibility({ mechanismRules })).toBe(mechanismRules === profile);
    }
    expect(usesFrozenFlipDoorEligibility({})).toBe(false);
  });

  it("preserves initially open and closed phases through 2→1→0, then toggles on the next departure completion", () => {
    const model = deferred();
    for (const [index, id] of ["a", "b", "c"].entries()) {
      const pending = depart(model, id);
      expect(model.snapshot().flipDoors.slice(0, 2).map(({ frozen }) => frozen)).toEqual([Math.max(0, 1 - index), Math.max(0, 1 - index)]);
      expect(opens(model).slice(0, 2)).toEqual([true, false]);
      expect(model.completeExitAnimation(pending)).toBe(true);
      expect(opens(model)).toEqual(index < 2 ? [true, false, index === 1] : [false, true, false]);
      expect(model.completeExitAnimation(pending)).toBe(false);
    }
  });

  it("captures the eligible IDs before counters change, even when callbacks complete out of order", () => {
    const model = deferred();
    const a = depart(model, "a");
    const b = depart(model, "b");
    const c = depart(model, "c");
    expect(model.snapshot().pendingExitFlipDoorIds).toEqual({ [a]: ["ready"], [b]: ["ready"], [c]: ["frozen-open", "frozen-closed", "ready"] });
    expect(model.completeExitAnimation(c)).toBe(true);
    expect(opens(model)).toEqual([false, true, false]);
    expect(model.completeExitAnimation(a)).toBe(true);
    expect(opens(model)).toEqual([false, true, true]);
    expect(model.completeExitAnimation(b)).toBe(true);
    expect(opens(model)).toEqual([false, true, false]);
    expect(model.snapshot().pendingExitFlipDoorIds).toBeUndefined();
  });

  it("lets a pulse thaw a door without flipping it or making an older callback eligible", () => {
    const model = deferred();
    const beforePulse = depart(model, "a");
    expect(model.thawAll()).toBe(true);
    expect(opens(model)).toEqual([true, false, true]);
    expect(model.snapshot().flipDoors.map(({ frozen }) => frozen)).toEqual([0, 0, 0]);
    expect(model.completeExitAnimation(beforePulse)).toBe(true);
    expect(opens(model)).toEqual([true, false, false]);
    const afterPulse = depart(model, "b");
    expect(model.completeExitAnimation(afterPulse)).toBe(true);
    expect(opens(model)).toEqual([false, true, true]);
  });

  it("tracks doors with different ice counts independently across overlapping events", () => {
    const level = fixture();
    level.flipDoors![0].frozen = 1;
    const model = deferred(level);
    const first = depart(model, "a");
    const second = depart(model, "b");
    expect(model.snapshot().pendingExitFlipDoorIds).toEqual({ [first]: ["ready"], [second]: ["frozen-open", "ready"] });
    model.completeExitAnimation(second);
    model.completeExitAnimation(first);
    expect(opens(model)).toEqual([false, false, true]);
    expect(model.snapshot().flipDoors.map(({ frozen }) => frozen)).toEqual([0, 0, 0]);
  });

  it("rejects a frozen exit, then includes the used door in its next eligible departure", () => {
    const level = fixture();
    level.flipDoors![0].frozen = 1;
    level.blocks[0].layers = ["red", "blue"];
    const model = deferred(level);
    const peel = token(model.tryExit("a", "left"));
    model.completeExitAnimation(peel);
    expect(opens(model)[0]).toBe(true);
    const pending = token(model.tryExit("a", "top"));
    expect(model.snapshot().pendingExitFlipDoorIds![pending]).toContain("frozen-open");
    expect(opens(model)[0]).toBe(true);
    model.completeExitAnimation(pending);
    expect(opens(model)[0]).toBe(false);

    const frozenLevel = fixture();
    frozenLevel.blocks[0].color = "blue";
    const frozen = deferred(frozenLevel);
    const before = frozen.snapshot();
    expect(frozen.tryExit("a", "top").ok).toBe(false);
    expect(frozen.tryExit("a", "right").ok).toBe(false);
    expect(frozen.removeBlockWithBooster("missing").ok).toBe(false);
    expect(frozen.snapshot()).toEqual(before);
  });

  it("counts successful shell peeling and whole-block rockets once, retaining bomb/key semantics", () => {
    const level = fixture();
    Object.assign(level.blocks[0], { layers: ["red", "blue"], timedBombSeconds: 5, keyId: "key" });
    level.blocks.push({ id: "locked", x: 4, y: 2, shape: [[0, 0]], color: "orange", lockedBy: "key" });
    const model = deferred(level);
    const peel = token(model.tryExit("a", "left"));
    expect(model.getBlock("a")).toMatchObject({ color: "blue", layers: ["blue"], keyId: "key" });
    expect(model.getBlock("a")?.timedBombSeconds).toBeUndefined();
    expect(model.getBlock("locked")?.lockedBy).toBe("key");
    expect(model.completeExitAnimation(peel)).toBe(true);
    const rocket = token(model.removeBlockWithBooster("a"));
    expect(model.getBlock("locked")?.lockedBy).toBeUndefined();
    expect(model.snapshot().cleared).toBe(2);
    expect(model.completeExitAnimation(rocket)).toBe(true);
    expect(opens(model)).toEqual([true, false, true]);
    const nextRocket = token(model.removeBlockWithBooster("b"));
    expect(opens(model)).toEqual([true, false, true]);
    expect(model.completeExitAnimation(nextRocket)).toBe(true);
    expect(opens(model)).toEqual([false, true, false]);
  });

  it("retains an empty event while all doors are frozen, including a final winning departure", () => {
    const level = fixture();
    level.flipDoors = level.flipDoors!.slice(0, 2);
    level.blocks = [level.blocks[0]];
    const model = deferred(level);
    const pending = token(model.tryExit("a", "left"));
    expect(model.snapshot()).toMatchObject({ complete: true, pendingExitFlipDoorIds: { [pending]: [] } });
    expect(model.completeExitAnimation(pending)).toBe(true);
    expect(opens(model)).toEqual([true, false]);
    expect(model.completeExitAnimation(pending)).toBe(false);
  });

  it("keeps the same new semantics in immediate headless completion", () => {
    const model = new PuzzleModel(fixture());
    for (const id of ["a", "b"]) {
      const pending = token(model.tryExit(id, "left"));
      expect(model.completeExitAnimation(pending)).toBe(false);
      expect(opens(model).slice(0, 2)).toEqual([true, false]);
    }
    expect(model.tryExit("c", "left").ok).toBe(true);
    expect(opens(model)).toEqual([false, true, false]);
    expect(model.snapshot().pendingExitAnimations).toBeUndefined();
    expect(model.snapshot().pendingExitFlipDoorIds).toBeUndefined();
  });

  it.each(["revised-2026-09-23-v1.3", "revised-2026-09-23-v1.4"] as const)("keeps %s frozen-door toggles and old snapshot format unchanged", (mechanismRules) => {
    const model = deferred(fixture({ mechanismRules }));
    const pending = depart(model, "a");
    expect(model.snapshot().pendingExitFlipDoorIds).toBeUndefined();
    expect(model.completeExitAnimation(pending)).toBe(true);
    expect(opens(model)).toEqual([false, true, false]);
  });

  it.each([undefined, "revised-2026-09-21", "revised-2026-09-21-v1.1", "revised-2026-09-21-v1.2"] as const)("keeps %s immediate frozen-door behavior", (mechanismRules) => {
    const model = deferred(fixture({ mechanismRules }));
    const result = model.tryExit("a", "left");
    expect(result.ok).toBe(true);
    expect(result.exitAnimationId).toBeUndefined();
    expect(opens(model)).toEqual([false, true, false]);
  });
});

describe("v1.5 frozen door history and restoration", () => {
  it("deep-copies eligibility through snapshots and clones without sharing callbacks", () => {
    const model = deferred();
    const pending = depart(model, "a");
    const copy = model.clone();
    const exposed = model.snapshot();
    exposed.pendingExitFlipDoorIds![pending].push("frozen-open");
    expect(model.snapshot().pendingExitFlipDoorIds![pending]).toEqual(["ready"]);
    copy.thawAll(2);
    expect(copy.completeExitAnimation(pending)).toBe(true);
    expect(opens(copy)).toEqual([true, false, false]);
    expect(opens(model)).toEqual([true, false, true]);
    expect(model.completeExitAnimation(pending)).toBe(true);
  });

  it("does not infer an eligible set from a restored thawed door when the event metadata is missing", () => {
    const model = deferred();
    const pending = depart(model, "a");
    const incomplete = model.snapshot();
    delete incomplete.pendingExitFlipDoorIds;
    incomplete.flipDoors.forEach((door) => { door.frozen = 0; });
    restore(model, incomplete);
    expect(model.snapshot().pendingExitAnimations).toBeUndefined();
    expect(model.completeExitAnimation(pending)).toBe(false);
    expect(opens(model)).toEqual([true, false, true]);
  });

  it("preserves an empty eligible set through cloning and undoing a later move", () => {
    const level = fixture();
    level.flipDoors = level.flipDoors!.slice(0, 2);
    const model = deferred(level);
    const pending = depart(model, "a");
    model.beginAction();
    expect(model.moveBlockStep("mover", 3, 4)).toBe(true);
    model.commitAction();
    expect(model.undo()).toBe(true);
    const copy = model.clone();
    expect(copy.snapshot().pendingExitFlipDoorIds).toEqual({ [pending]: [] });
    copy.thawAll(2);
    expect(copy.completeExitAnimation(pending)).toBe(true);
    expect(opens(copy)).toEqual([true, false]);
    expect(model.completeExitAnimation(pending)).toBe(true);
    expect(opens(model)).toEqual([true, false]);
  });

  it("still restores historical v1.4 pending events with their original whole-door behavior", () => {
    const model = deferred(fixture({ mechanismRules: "revised-2026-09-23-v1.4" }));
    const pending = depart(model, "a");
    const copy = model.clone();
    expect(copy.completeExitAnimation(pending)).toBe(true);
    expect(opens(copy)).toEqual([false, true, false]);
  });

  it("does not restore a completed older callback through later undo or cancellation", () => {
    const model = deferred();
    const earlier = depart(model, "a");
    const thawing = depart(model, "b");
    const flipping = depart(model, "c");
    expect(model.completeExitAnimation(flipping)).toBe(true);
    model.beginAction();
    expect(model.moveBlockStep("mover", 3, 4)).toBe(true);
    expect(model.completeExitAnimation(earlier)).toBe(true);
    model.cancelAction();
    expect(opens(model)).toEqual([false, true, true]);
    expect(model.completeExitAnimation(earlier)).toBe(false);
    expect(model.undo()).toBe(true);
    expect(opens(model)).toEqual([true, false, false]);
    expect(model.completeExitAnimation(flipping)).toBe(false);
    expect(model.completeExitAnimation(thawing)).toBe(true);
    expect(opens(model)).toEqual([true, false, true]);
    expect(model.undo()).toBe(true);
    expect(opens(model)).toEqual([true, false, false]);
    expect(model.snapshot().flipDoors[0].frozen).toBe(1);
    expect(model.snapshot().pendingExitAnimations).toBeUndefined();
  });

  it.each([false, true])("cancels its own thawing departure with callback completed=%s", (completeFirst) => {
    const model = deferred();
    const before = state(model);
    model.beginAction();
    const pending = token(model.tryExit("a", "left"));
    if (completeFirst) model.completeExitAnimation(pending);
    model.cancelAction();
    expect(state(model)).toEqual(before);
    expect(model.getBlock("a")).toBeDefined();
    expect(model.completeExitAnimation(pending)).toBe(false);
    expect(model.snapshot().pendingExitFlipDoorIds).toBeUndefined();
    expect(depart(model, "a")).not.toBe(pending);
  });

  it("invalidates frozen and thawed pending sets on failure without resurrection after recovery or undo", () => {
    const model = deferred(fixture({ timeSeconds: 1 }));
    const pending = [depart(model, "a"), depart(model, "b"), depart(model, "c")];
    model.tick(1);
    expect(model.snapshot().failed).toBe(true);
    expect(model.snapshot().pendingExitAnimations).toBeUndefined();
    expect(model.snapshot().pendingExitFlipDoorIds).toBeUndefined();
    expect(model.addTime(10)).toBe(true);
    expect(model.undo()).toBe(true);
    for (const id of pending) expect(model.completeExitAnimation(id)).toBe(false);
    expect(opens(model)).toEqual([true, false, true]);
    expect(model.snapshot().pendingExitFlipDoorIds).toBeUndefined();
  });

  it("does not revive eligibility while cancelling a gesture after bomb failure", () => {
    const level = fixture();
    level.blocks[3].timedBombSeconds = 1;
    const model = deferred(level);
    const pending = depart(model, "a");
    model.beginAction();
    expect(model.moveBlockStep("mover", 3, 4)).toBe(true);
    model.tick(1);
    model.cancelAction();
    expect(model.snapshot().failed).toBe(true);
    expect(model.snapshot().pendingExitAnimations).toBeUndefined();
    expect(model.snapshot().pendingExitFlipDoorIds).toBeUndefined();
    expect(model.completeExitAnimation(pending)).toBe(false);
    expect(opens(model)).toEqual([true, false, true]);
  });
});
