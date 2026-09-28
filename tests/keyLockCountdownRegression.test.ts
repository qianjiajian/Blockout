import { describe, expect, it } from "vitest";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import type { BlockSpec, LevelSpec, Side } from "../src/core/types";

const GROUP_A = "key0";
const GROUP_B = "key1";
const block = (id: string, x: number, y: number, color: BlockSpec["color"], extra: Partial<BlockSpec> = {}): BlockSpec => ({
  id, x, y, color, shape: [[0, 0]], ...extra,
});

// Deliberately self-contained mechanism fixtures, not campaign layouts or
// one-key/one-lock substitutions for the authored countdown mechanism.
const fixture = (): LevelSpec => ({
  id: 99703, name: "two independent three-key groups", difficulty: "normal",
  mechanismRules: "revised-2026-09-21-v1.2",
  width: 6, height: 6, timeSeconds: 180, reward: 0,
  gates: [
    { id: "exit-red", side: "left", offset: 0, size: 3, color: "red" },
    { id: "exit-blue", side: "right", offset: 3, size: 3, color: "blue" },
    { id: "exit-green", side: "bottom", offset: 2, size: 1, color: "green" },
    { id: "exit-yellow", side: "bottom", offset: 3, size: 1, color: "yellow" },
  ],
  blocks: [
    ...[0, 1, 2].map((index) => block(`a-key-${index}`, 0, index, "red", { keyId: GROUP_A })),
    ...[0, 1, 2].map((index) => block(`b-key-${index}`, 5, index + 3, "blue", { keyId: GROUP_B })),
    block("a-lock", 2, 4, "green", { lockedBy: GROUP_A, lockCount: 3 }),
    block("b-lock", 3, 4, "yellow", { lockedBy: GROUP_B, lockCount: 3 }),
  ],
});

const modelFor = (level: LevelSpec): PuzzleModel => {
  expect(() => validateLevel(level)).not.toThrow();
  return new PuzzleModel(level);
};
const remaining = (model: PuzzleModel, id: string, group: string, count: number): void => {
  const snapshot = model.snapshot();
  const state = [...snapshot.blocks, ...snapshot.queuedBlocks].find((item) => item.id === id);
  expect(state, id).toBeDefined();
  expect(state?.lockedBy, id).toBe(count > 0 ? group : undefined);
  expect(state?.lockCount, id).toBe(count > 0 ? count : undefined);
};
const remove = (model: PuzzleModel, id: string, side: Side): void => {
  model.beginAction();
  const result = model.tryExit(id, side);
  expect(result.ok, id).toBe(true);
  expect(result.layerRemoved, id).not.toBe(true);
  expect(model.commitAction(), id).toBe(true);
  expect(model.getBlock(id), id).toBeUndefined();
};

describe("key/lock countdown stays independent of marker group colours", () => {
  it("requires all three complete exits per group: 3 → 2 → 1 → unlocked, never affecting the other group", () => {
    const level = fixture();
    for (const group of [GROUP_A, GROUP_B]) {
      expect(level.blocks.filter((item) => item.keyId === group)).toHaveLength(3);
      expect(level.blocks.find((item) => item.lockedBy === group)?.lockCount).toBe(3);
    }
    const model = modelFor(level);
    remaining(model, "a-lock", GROUP_A, 3);
    remaining(model, "b-lock", GROUP_B, 3);
    expect(model.moveBlockStep("a-lock", 2, 3)).toBe(false);
    expect(model.moveBlockStep("b-lock", 3, 3)).toBe(false);

    for (const index of [0, 1, 2]) {
      remove(model, `a-key-${index}`, "left");
      remaining(model, "a-lock", GROUP_A, 2 - index);
      remaining(model, "b-lock", GROUP_B, 3 - index);
      const afterRemoval = model.snapshot();
      expect(model.tryExit(`a-key-${index}`, "left").ok).toBe(false);
      expect(model.snapshot()).toEqual(afterRemoval);
      expect(model.isBlockActive(model.getBlock("a-lock")!)).toBe(index === 2);

      remove(model, `b-key-${index}`, "right");
      remaining(model, "a-lock", GROUP_A, 2 - index);
      remaining(model, "b-lock", GROUP_B, 2 - index);
      expect(model.isBlockActive(model.getBlock("b-lock")!)).toBe(index === 2);
    }
    expect(model.moveBlockStep("a-lock", 2, 3)).toBe(true);
    expect(model.moveBlockStep("b-lock", 3, 3)).toBe(true);
    expect(model.snapshot().cleared).toBe(6);
  });

  it("does not spend a key on ordinary movement, an invalid exit, or shell peeling", () => {
    const level = fixture();
    level.blocks[0].layers = ["red", "purple"];
    level.gates.push({ id: "exit-purple", side: "top", offset: 0, size: 1, color: "purple" });
    const model = modelFor(level);
    model.beginAction();
    expect(model.moveBlockStep("a-key-1", 1, 1)).toBe(true);
    expect(model.commitAction()).toBe(true);
    remaining(model, "a-lock", GROUP_A, 3);
    remaining(model, "b-lock", GROUP_B, 3);
    const beforeInvalid = model.snapshot();
    expect(model.tryExit("a-key-1", "left").ok).toBe(false);
    expect(model.snapshot()).toEqual(beforeInvalid);

    model.beginAction();
    expect(model.tryExit("a-key-0", "left")).toMatchObject({ ok: true, layerRemoved: true });
    expect(model.commitAction()).toBe(true);
    expect(model.getBlock("a-key-0")).toMatchObject({ keyId: GROUP_A, color: "purple", layers: ["purple"] });
    expect(model.snapshot().cleared).toBe(1);
    remaining(model, "a-lock", GROUP_A, 3);
    remaining(model, "b-lock", GROUP_B, 3);

    // Different outer/body colours do not change which lock group receives it.
    remove(model, "a-key-0", "top");
    remaining(model, "a-lock", GROUP_A, 2);
    remaining(model, "b-lock", GROUP_B, 3);
  });

  it("decrements every matching lock, including hidden and queued locks, without revealing or dispatching them early", () => {
    const level = fixture();
    level.shutters = [{ id: "cover", x: 2, y: 2, width: 2, height: 1, count: 10, skin: "shutter" }];
    level.generators = [{ id: "machine", side: "top", offset: 3, spawn: [2, 0], queueBlockIds: ["a-queued", "b-queued"] }];
    level.blocks.push(
      block("a-hidden", 2, 2, "green", { shutterId: "cover", lockedBy: GROUP_A, lockCount: 3 }),
      block("b-hidden", 3, 2, "yellow", { shutterId: "cover", lockedBy: GROUP_B, lockCount: 3 }),
      block("spawn-blocker", 3, 0, "cyan"),
      block("a-queued", 2, 0, "green", { shape: [[1, 0]], lockedBy: GROUP_A, lockCount: 3 }),
      block("b-queued", 2, 0, "yellow", { shape: [[1, 0]], lockedBy: GROUP_B, lockCount: 3 }),
    );
    const model = modelFor(level);
    for (const index of [0, 1, 2]) {
      remove(model, `a-key-${index}`, "left");
      for (const suffix of ["lock", "hidden", "queued"]) {
        remaining(model, `a-${suffix}`, GROUP_A, 2 - index);
        remaining(model, `b-${suffix}`, GROUP_B, 3);
      }
    }
    for (const index of [0, 1, 2]) {
      remove(model, `b-key-${index}`, "right");
      for (const suffix of ["lock", "hidden", "queued"]) {
        remaining(model, `a-${suffix}`, GROUP_A, 0);
        remaining(model, `b-${suffix}`, GROUP_B, 2 - index);
      }
    }
    expect(model.snapshot().shutters[0]).toMatchObject({ count: 4, revealed: false });
    expect(model.isBlockActive(model.getBlock("a-hidden")!)).toBe(false);
    expect(model.isBlockActive(model.getBlock("b-hidden")!)).toBe(false);
    expect(model.snapshot().queuedBlocks.map((item) => item.id)).toEqual(["a-queued", "b-queued"]);
    expect(model.snapshot().generators[0].remaining).toBe(2);

    expect(model.moveBlockStep("spawn-blocker", 4, 0)).toBe(true);
    expect(model.isBlockActive(model.getBlock("a-queued")!)).toBe(true);
    remaining(model, "a-queued", GROUP_A, 0);
    expect(model.moveBlockStep("a-queued", 2, 1)).toBe(true);
    expect(model.isBlockActive(model.getBlock("b-queued")!)).toBe(true);
    remaining(model, "b-queued", GROUP_B, 0);
    expect(model.snapshot().queuedBlocks).toHaveLength(0);
  });

  it("clones remaining counts independently and restores each decrement or final unlock on undo", () => {
    const model = modelFor(fixture());
    remove(model, "a-key-0", "left");
    remove(model, "b-key-0", "right");
    const originalSnapshot = model.snapshot();
    const copy = model.clone();
    expect(copy.snapshot()).toEqual(originalSnapshot);
    remove(copy, "a-key-1", "left");
    remaining(copy, "a-lock", GROUP_A, 1);
    remaining(copy, "b-lock", GROUP_B, 2);
    expect(model.snapshot()).toEqual(originalSnapshot);
    const beforeUnlock = copy.snapshot();
    remove(copy, "a-key-2", "left");
    remaining(copy, "a-lock", GROUP_A, 0);
    expect(copy.isBlockActive(copy.getBlock("a-lock")!)).toBe(true);
    expect(copy.undo()).toBe(true);
    expect(copy.snapshot()).toEqual(beforeUnlock);
    expect(copy.isBlockActive(copy.getBlock("a-lock")!)).toBe(false);
    expect(copy.undo()).toBe(true);
    expect(copy.snapshot()).toEqual(originalSnapshot);
    remaining(copy, "a-lock", GROUP_A, 2);
    remaining(copy, "b-lock", GROUP_B, 2);
    expect(model.snapshot()).toEqual(originalSnapshot);
  });
});
