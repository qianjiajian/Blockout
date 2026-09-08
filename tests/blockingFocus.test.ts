import { describe, expect, it } from "vitest";
import { PuzzleModel } from "../src/core/PuzzleModel";
import type { LevelSpec, PuzzleSnapshot } from "../src/core/types";
import { blockingBlockAtPose, blockingBlockForSweep } from "../src/game/blockingFocus";

const level: LevelSpec = {
  id: 995,
  name: "blocking focus fixture",
  difficulty: "normal",
  timeSeconds: 180,
  reward: 0,
  width: 5,
  height: 4,
  playable: Array.from({ length: 4 }, (_, y) => Array.from({ length: 5 }, (_, x) => [x, y] as const)).flat(),
  gates: [],
  blocks: [
    { id: "moving", x: 0, y: 1, shape: [[0, 0], [0, 1]], color: "red" },
    { id: "movable-blocker", x: 2, y: 1, shape: [[0, 0]], color: "blue" },
    { id: "frozen-blocker", x: 0, y: 3, shape: [[0, 0], [1, 0]], color: "cyan", frozen: 2 },
    { id: "hidden-blocker", x: 4, y: 1, shape: [[0, 0]], color: "yellow", shutterId: "closed" },
  ],
  shutters: [{ id: "closed", x: 4, y: 1, width: 1, height: 1, count: 2 }],
};

const snapshot = (): PuzzleSnapshot => new PuzzleModel(level).snapshot();

describe("physical blocker focus", () => {
  it("identifies the movable block contacted by a floating pose", () => {
    expect(blockingBlockAtPose(snapshot(), "moving", { x: 1.05, y: 1 })).toBe("movable-blocker");
  });

  it("probes only the axis that actually collided", () => {
    expect(blockingBlockForSweep(snapshot(), "moving", {
      pose: { x: 0.999, y: 1 },
      pointerDelta: { x: 0.8, y: 0.03 },
      blockedX: true,
      blockedY: false,
    })).toBe("movable-blocker");
    expect(blockingBlockForSweep(snapshot(), "moving", {
      pose: { x: 0.999, y: 1 },
      pointerDelta: { x: 0.8, y: 0.03 },
      blockedX: false,
      blockedY: true,
    })).toBeUndefined();
  });

  it("does not imply that frozen or shutter-hidden blocks can be moved", () => {
    expect(blockingBlockAtPose(snapshot(), "moving", { x: 0, y: 2.05 })).toBeUndefined();
    expect(blockingBlockAtPose(snapshot(), "moving", { x: 3.05, y: 1 })).toBeUndefined();
  });

  it("returns no target for board edges and unknown blocks", () => {
    expect(blockingBlockAtPose(snapshot(), "missing", { x: 1, y: 1 })).toBeUndefined();
    expect(blockingBlockAtPose(snapshot(), "moving", { x: -0.1, y: 1 })).toBeUndefined();
  });
});
