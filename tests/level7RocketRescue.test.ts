import { describe, expect, it } from "vitest";
import { solveLevelForValidation } from "../src/core/levelSolver";
import { PuzzleModel } from "../src/core/PuzzleModel";
import { getLevel } from "../src/core/levels";

const enterAuthoredDeadlock = (): PuzzleModel => {
  const model = new PuzzleModel(getLevel(7));
  model.startCountdown();

  model.beginAction();
  expect(model.tryExit("cc-piece-04", "top").ok).toBe(true);
  expect(model.commitAction()).toBe(true);
  return model;
};

const playDrag = (model: PuzzleModel, drag: ReturnType<typeof solveLevelForValidation>["drags"][number]): void => {
  model.beginAction();
  for (const [x, y] of drag.path) expect(model.moveBlockStep(drag.blockId, x, y)).toBe(true);
  if (drag.exitSide) expect(model.tryExit(drag.blockId, drag.exitSide).ok).toBe(true);
  expect(model.commitAction()).toBe(true);
};

describe("level 7 authored rocket rescue", () => {
  it("declares the exact no-exit deadlock after the authored opening sequence", () => {
    const level = getLevel(7);
    expect(level.blocks.find((block) => block.id === "strategy-guard-05")).toMatchObject({ x: 4, y: 0, color: "pink" });
    expect(level.blocks.find((block) => block.id === "cc-piece-06")).toMatchObject({ x: 2, y: 0, color: "red" });
    expect(level.rocketRescue).toMatchObject({
      trigger: "no-exit-deadlock",
      targetBlockId: "strategy-guard-12",
      deadlockBlockId: "cc-piece-03",
      deadlockPosition: [1, 0],
    });
    expect(level.blocks.find((block) => block.id === "strategy-guard-12"))
      .toMatchObject({ x: 1, y: 2, color: "red", shape: [[0, 0], [1, 0], [0, 1], [1, 1]] });

    const model = enterAuthoredDeadlock();
    const snapshot = model.snapshot();
    expect(snapshot.moves).toBe(1);
    expect(snapshot.blocks.find((block) => block.id === "cc-piece-03")).toMatchObject({ x: 1, y: 0 });
    expect(snapshot.blocks.flatMap((block) => model.possibleExitSides(block))).toEqual([]);

    // The layout change must make this a real rescue deadlock: the ordinary
    // solver exhausts the state space rather than finding the pink-block
    // workaround that existed before the two upper-lane blocks were swapped.
    const noRescue = solveLevelForValidation(level, 1_000_000);
    expect(noRescue.solved).toBe(false);
    expect(noRescue.termination).toBe("exhausted");
  });

  it("leaves a verified completion route after removing the four-cell red target", () => {
    const level = getLevel(7);
    const model = enterAuthoredDeadlock();

    model.beginAction();
    expect(model.removeBlockWithBooster("strategy-guard-12").ok).toBe(true);
    expect(model.commitAction()).toBe(true);

    // Once the four-cell red target is removed, solve the resulting board rather
    // than the intentionally unsolvable pre-rescue layout.
    const rescueLevel = {
      ...level,
      blocks: level.blocks.filter((block) => block.id !== "strategy-guard-12"),
    };
    const solution = solveLevelForValidation(rescueLevel, 1_000_000);
    expect(solution.solved).toBe(true);
    for (const drag of solution.drags) {
      // The opening pink exit is already applied and the rescue removes the
      // red piece, so replay only the remaining route.
      if (drag.blockId === "cc-piece-04") continue;
      playDrag(model, drag);
      if (model.snapshot().complete) break;
    }
    expect(model.snapshot().complete).toBe(true);
    expect(model.snapshot().blocks).toHaveLength(0);
  });
});
