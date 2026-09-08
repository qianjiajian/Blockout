import { describe, expect, it } from "vitest";
import { PuzzleModel } from "../src/core/PuzzleModel";
import type { LevelSpec } from "../src/core/types";
import { localBreakthroughAction, localBreakthroughFocus } from "../src/game/localBreakthroughFocus";

const playable = (width: number, height: number) => Array.from({ length: height }, (_, y) => (
  Array.from({ length: width }, (_, x) => [x, y] as const)
)).flat();

const directFixture = (): LevelSpec => ({
  id: 995,
  name: "direct breakthrough fixture",
  difficulty: "hard",
  timeSeconds: 120,
  reward: 0,
  width: 4,
  height: 4,
  playable: playable(4, 4),
  gates: [{ id: "red-top", side: "top", offset: 1, size: 1, color: "red" }],
  blocks: [{ id: "red", x: 1, y: 2, shape: [[0, 0]], color: "red" }],
});

describe("bounded local breakthrough focus", () => {
  it("focuses a block that can already clear without returning a path or gate", () => {
    const model = new PuzzleModel(directFixture());
    const before = model.snapshot();
    expect(localBreakthroughFocus(model)).toEqual({
      blockId: "red",
      kind: "direct",
      dragCountToClear: 1,
      gridStepsToClear: 2,
    });
    expect(model.snapshot()).toEqual(before);
  });

  it("focuses one setup block when it enables a clear on the following drag", () => {
    const level: LevelSpec = {
      ...directFixture(),
      id: 996,
      blocks: [
        { id: "red", x: 1, y: 1, shape: [[0, 0]], color: "red" },
        { id: "blue-blocker", x: 1, y: 0, shape: [[0, 0]], color: "blue" },
      ],
    };
    const model = new PuzzleModel(level);
    expect(localBreakthroughFocus(model)).toMatchObject({
      blockId: "blue-blocker",
      kind: "setup",
      followupBlockId: "red",
      dragCountToClear: 2,
    });
    expect(localBreakthroughAction(model)).toEqual({
      blockId: "blue-blocker",
      kind: "setup",
      dragCountToClear: 2,
      gridStepsToClear: 2,
      path: [[2, 0]],
    });
    expect(model.getBlock("blue-blocker")).toMatchObject({ x: 1, y: 0 });
  });

  it("returns no focus when no first clear exists within the two-drag horizon", () => {
    const level = directFixture();
    level.id = 997;
    level.gates = [];
    expect(localBreakthroughFocus(new PuzzleModel(level))).toBeUndefined();
    expect(localBreakthroughAction(new PuzzleModel(level))).toBeUndefined();
  });

  it("does not turn an already direct clear into another guided setup drag", () => {
    expect(localBreakthroughAction(new PuzzleModel(directFixture()))).toBeUndefined();
  });
});
