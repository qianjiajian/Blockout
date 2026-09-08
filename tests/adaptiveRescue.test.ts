import { describe, expect, it } from "vitest";
import { PuzzleModel } from "../src/core/PuzzleModel";
import type { LevelSpec } from "../src/core/types";
import { adaptiveRescueAction } from "../src/game/adaptiveRescue";

const playable = Array.from({ length: 4 }, (_, y) => (
  Array.from({ length: 5 }, (_, x) => [x, y] as const)
)).flat();
const fixture = (blockerX = 3, blockerY = 1): LevelSpec => ({
  id: 993,
  name: "adaptive rescue fixture",
  difficulty: "hard",
  timeSeconds: 120,
  reward: 0,
  width: 5,
  height: 4,
  playable,
  gates: [],
  blocks: [
    { id: "focus", x: 1, y: 1, shape: [[0, 0]], color: "red" },
    { id: "blocker", x: blockerX, y: blockerY, shape: [[0, 0]], color: "blue" },
  ],
  strategyNudge: { blockId: "focus", from: [1, 1], path: [[2, 1], [3, 1]], afterMoves: 6 },
});

describe("adaptive local rescue", () => {
  it("resumes an authored drag when every remaining pose is currently legal", () => {
    const model = new PuzzleModel(fixture(4, 3));
    expect(adaptiveRescueAction(model, model.level.strategyNudge!)).toEqual({
      blockId: "focus",
      origins: [[1, 1], [2, 1], [3, 1]],
      reason: "authored",
      focusBlockId: "focus",
    });
  });

  it("moves the actual active blocker when the authored drag became obstructed", () => {
    const model = new PuzzleModel(fixture());
    const rescue = adaptiveRescueAction(model, model.level.strategyNudge!);
    expect(rescue?.blockId).toBe("blocker");
    expect(rescue?.reason).toBe("blocker");
    expect(rescue?.origins[0]).toEqual([3, 1]);
    expect(rescue?.origins).toHaveLength(2);
    const target = rescue!.origins.at(-1)!;
    expect(model.canPlace(model.getBlock("blocker")!, target[0], target[1])).toBe(true);
  });

  it("clears the complete remaining corridor for interlocking shaped blocks", () => {
    const level: LevelSpec = {
      ...fixture(4, 3),
      id: 994,
      width: 5,
      height: 5,
      playable: Array.from({ length: 5 }, (_, y) => (
        Array.from({ length: 5 }, (_, x) => [x, y] as const)
      )).flat(),
      blocks: [
        { id: "focus", x: 3, y: 0, shape: [[0, 0], [1, 0], [1, 1]], color: "green" },
        { id: "blocker", x: 3, y: 1, shape: [[0, 0], [0, 1], [1, 1]], color: "blue" },
      ],
      strategyNudge: { blockId: "focus", from: [3, 0], path: [[3, 1], [3, 2]], afterMoves: 6 },
    };
    const model = new PuzzleModel(level);
    const rescue = adaptiveRescueAction(model, level.strategyNudge!);
    expect(rescue).toMatchObject({ blockId: "blocker", reason: "blocker", focusBlockId: "focus" });
    expect(rescue!.origins.length).toBeGreaterThan(2);
    for (const [x, y] of rescue!.origins.slice(1)) expect(model.moveBlockStep("blocker", x, y)).toBe(true);
    for (const [x, y] of level.strategyNudge!.path) expect(model.moveBlockStep("focus", x, y)).toBe(true);
  });

  it("never invents a rescue for an off-route focus or immovable obstruction", () => {
    const offRoute = new PuzzleModel(fixture(4, 3));
    expect(offRoute.moveBlockStep("focus", 1, 2)).toBe(true);
    expect(adaptiveRescueAction(offRoute, offRoute.level.strategyNudge!)).toBeUndefined();

    const frozen = fixture();
    frozen.blocks[1] = { ...frozen.blocks[1], shape: [[0, 0], [0, 1]], frozen: 2 };
    expect(adaptiveRescueAction(new PuzzleModel(frozen), frozen.strategyNudge!)).toBeUndefined();
  });
});
