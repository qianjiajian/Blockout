import { describe, expect, it } from "vitest";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import { solveLevelForValidation, solveLevelOptimally, type SolverDrag } from "../src/core/levelSolver";
import { LEVELS, LEVELS_BEFORE_SINGLE_BLOCK_ADJACENCY } from "../src/core/levels";
import { matchFormalBlockShape } from "../src/game/formalBlockShapes";

const replay = (level: (typeof LEVELS)[number], route: readonly SolverDrag[]): PuzzleModel => {
  const model = new PuzzleModel(level);
  for (const drag of route) {
    model.beginAction();
    for (const [x, y] of drag.path) {
      expect(model.moveBlock(drag.blockId, x, y), `${drag.blockId} -> ${x},${y}`).toBe(true);
    }
    if (drag.exitSide) {
      expect(model.tryExit(drag.blockId, drag.exitSide).ok, `${drag.blockId} exits ${drag.exitSide}`).toBe(true);
    }
    expect(model.commitAction(), `${drag.blockId} commit`).toBe(true);
  }
  return model;
};

describe("Lv19 parking regeneration", () => {
  it("replaces the zero-overhead opening without changing the source projection", () => {
    const source = LEVELS_BEFORE_SINGLE_BLOCK_ADJACENCY.find((level) => level.id === 19);
    const regenerated = LEVELS.find((level) => level.id === 19);
    expect(source).toBeDefined();
    expect(regenerated).toBeDefined();
    expect(source!.blocks).toHaveLength(27);
    expect(regenerated!.blocks).toHaveLength(16);
    expect(regenerated!.width).toBe(6);
    expect(regenerated!.height).toBe(9);
    expect(regenerated!.designTargets?.minimumRepositionOverhead).toBe(10);
    expect(new Set(regenerated!.gates.map((gate) => gate.color)).size).toBe(regenerated!.gates.length);
    expect(regenerated!.blocks.every((block) => block.shape.length === 3)).toBe(true);
    expect(regenerated!.blocks.every((block) => Boolean(matchFormalBlockShape(block.shape)))).toBe(true);
    validateLevel(regenerated!);
  });

  it("proves at least ten necessary parking drags and replays both solver routes", () => {
    const level = LEVELS.find((candidate) => candidate.id === 19)!;
    const exact = solveLevelOptimally(level, 500_000);
    const validation = solveLevelForValidation(level, 500_000);
    expect(exact.solved).toBe(true);
    expect(exact.clearLoad).toBe(16);
    expect(exact.repositionOverhead).toBeGreaterThanOrEqual(10);
    expect(exact.repositionOverhead).toBe(10);
    expect(validation.solved).toBe(true);
    expect(validation.repositionOverhead).toBeGreaterThanOrEqual(10);
    expect(replay(level, exact.drags).snapshot().complete).toBe(true);
    expect(replay(level, validation.drags).snapshot().complete).toBe(true);
  }, 60_000);
});
