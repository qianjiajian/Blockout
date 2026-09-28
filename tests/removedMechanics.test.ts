import { describe, expect, it } from "vitest";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import { rect, type LevelSpec } from "../src/core/types";

const baseLevel = (overrides: Partial<LevelSpec> = {}): LevelSpec => ({
  id: 980,
  name: "竞品机制夹具",
  difficulty: "normal",
  timeSeconds: 60,
  reward: 0,
  width: 5,
  height: 4,
  gates: [
    { id: "red-left", side: "left", offset: 0, size: 2, color: "red" },
    { id: "blue-right", side: "right", offset: 0, size: 2, color: "blue" },
  ],
  blocks: [
    { id: "red", x: 0, y: 0, shape: rect(1, 1), color: "red" },
    { id: "blue", x: 4, y: 0, shape: rect(1, 1), color: "blue" },
  ],
  ...overrides,
});

describe("video-authored arrow, key-lock, lift and timed-feeder mechanics", () => {
  it("restricts arrow blocks to their authored movement axis", () => {
    const model = new PuzzleModel(baseLevel({
      blocks: [
        { id: "horizontal-arrow", x: 1, y: 2, shape: rect(1, 1), color: "red", movementAxis: "horizontal" },
        { id: "vertical-arrow", x: 3, y: 1, shape: rect(1, 1), color: "blue", movementAxis: "vertical" },
      ],
    }));

    expect(model.moveBlockStep("horizontal-arrow", 1, 1)).toBe(false);
    expect(model.moveBlockStep("horizontal-arrow", 2, 2)).toBe(true);
    expect(model.moveBlockStep("vertical-arrow", 2, 1)).toBe(false);
    expect(model.moveBlockStep("vertical-arrow", 3, 2)).toBe(true);
  });

  it("unlocks every matching chained block only after the key block is fully removed", () => {
    const model = new PuzzleModel(baseLevel({
      blocks: [
        { id: "key-piece", x: 0, y: 0, shape: rect(1, 1), color: "red", keyId: "key-a" },
        { id: "locked-a", x: 4, y: 0, shape: rect(1, 1), color: "blue", lockedBy: "key-a" },
        { id: "locked-b", x: 3, y: 2, shape: rect(1, 1), color: "blue", lockedBy: "key-a" },
      ],
    }));
    expect(model.isBlockActive(model.getBlock("locked-a")!)).toBe(false);

    model.beginAction();
    expect(model.tryExit("key-piece", "left").ok).toBe(true);
    expect(model.commitAction()).toBe(true);

    expect(model.getBlock("locked-a")?.lockedBy).toBeUndefined();
    expect(model.getBlock("locked-b")?.lockedBy).toBeUndefined();
    expect(model.isBlockActive(model.getBlock("locked-a")!)).toBe(true);
  });

  it("decrements a numbered lock once per matching key and unlocks only at zero", () => {
    const model = new PuzzleModel(baseLevel({
      gates: [
        { id: "red-left", side: "left", offset: 0, size: 2, color: "red" },
        { id: "blue-right", side: "right", offset: 0, size: 2, color: "blue" },
      ],
      blocks: [
        { id: "key-a-1", x: 0, y: 0, shape: rect(1, 1), color: "red", keyId: "key-a" },
        { id: "key-a-2", x: 0, y: 1, shape: rect(1, 1), color: "red", keyId: "key-a" },
        { id: "locked", x: 4, y: 0, shape: rect(1, 1), color: "blue", lockedBy: "key-a", lockCount: 2 },
      ],
    }));

    model.beginAction();
    expect(model.tryExit("key-a-1", "left").ok).toBe(true);
    model.commitAction();
    expect(model.getBlock("locked")).toMatchObject({ lockedBy: "key-a", lockCount: 1 });
    expect(model.isBlockActive(model.getBlock("locked")!)).toBe(false);

    model.beginAction();
    expect(model.tryExit("key-a-2", "left").ok).toBe(true);
    model.commitAction();
    expect(model.getBlock("locked")?.lockedBy).toBeUndefined();
    expect(model.getBlock("locked")?.lockCount).toBeUndefined();
    expect(model.isBlockActive(model.getBlock("locked")!)).toBe(true);
  });

  it("reveals a lift batch after every block in the current layer is removed", () => {
    const model = new PuzzleModel(baseLevel({
      width: 3,
      height: 3,
      gates: [{ id: "red-top", side: "top", offset: 0, size: 1, color: "red" }],
      shutters: [{
        id: "lift-layer-2",
        x: 0,
        y: 0,
        width: 1,
        height: 1,
        count: 1,
        skin: "lift",
        triggerBlockIds: ["layer-1"],
      }],
      blocks: [
        { id: "layer-1", x: 0, y: 0, shape: rect(1, 1), color: "red" },
        { id: "layer-2", x: 0, y: 0, shape: rect(1, 1), color: "red", shutterId: "lift-layer-2" },
      ],
    }));
    expect(model.isBlockActive(model.getBlock("layer-2")!)).toBe(false);

    model.beginAction();
    expect(model.tryExit("layer-1", "top").ok).toBe(true);
    model.commitAction();

    expect(model.snapshot().shutters[0].count).toBe(0);
    expect(model.isBlockActive(model.getBlock("layer-2")!)).toBe(true);
  });

  it("does not advance a lift when a block outside its framed cohort clears", () => {
    const model = new PuzzleModel(baseLevel({
      width: 3,
      height: 3,
      gates: [
        { id: "red-top", side: "top", offset: 0, size: 1, color: "red" },
        { id: "blue-right", side: "right", offset: 2, size: 1, color: "blue" },
      ],
      shutters: [{
        id: "lift-layer-2",
        x: 0,
        y: 0,
        width: 1,
        height: 1,
        count: 1,
        skin: "lift",
        triggerBlockIds: ["framed"],
      }],
      blocks: [
        { id: "framed", x: 0, y: 0, shape: rect(1, 1), color: "red" },
        { id: "outside", x: 2, y: 2, shape: rect(1, 1), color: "blue" },
        { id: "layer-2", x: 0, y: 0, shape: rect(1, 1), color: "red", shutterId: "lift-layer-2" },
      ],
    }));

    model.beginAction();
    expect(model.tryExit("outside", "right").ok).toBe(true);
    model.commitAction();

    expect(model.snapshot().shutters[0].count).toBe(1);
    expect(model.isBlockActive(model.getBlock("layer-2")!)).toBe(false);
  });

  it("releases timed feeder cargo on wall-clock intervals", () => {
    const model = new PuzzleModel(baseLevel({
      generators: [{
        id: "timed-feeder",
        side: "top",
        offset: 2,
        spawn: [2, 2],
        queueBlockIds: ["queued"],
        trigger: "time",
        intervalSeconds: 0.5,
      }],
      blocks: [
        { id: "red", x: 0, y: 0, shape: rect(1, 1), color: "red" },
        { id: "queued", x: 2, y: 2, shape: rect(1, 1), color: "blue" },
      ],
    }));
    model.start();
    expect(model.tick(0.49)).toBe(false);
    expect(model.getBlock("queued")).toBeUndefined();
    expect(model.tick(0.02)).toBe(true);
    expect(model.getBlock("queued")).toMatchObject({ x: 2, y: 2 });
  });

  it("accepts canonical fields but rejects ambiguous legacy aliases", () => {
    expect(() => validateLevel(baseLevel({
      blocks: [{ id: "key", x: 0, y: 0, shape: rect(1, 1), color: "red", keyId: "a", movementAxis: "horizontal" }],
    }))).not.toThrow();

    const legacy = baseLevel({
      blocks: [{ id: "legacy", x: 0, y: 0, shape: rect(1, 1), color: "red", arrow_direction: "horizontal" } as never],
    });
    expect(() => validateLevel(legacy)).toThrow(/retired key-lock\/arrow-block/);
  });
});
