import { describe, expect, it } from "vitest";
import { LEVELS, LEVELS_BEFORE_LEVEL_ORDER_SWAP, getLevel, getLevelStrict } from "../src/core/levels";
import { levelStarTargets } from "../src/core/levelStarConditions";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import { solveLevelForValidation } from "../src/core/levelSolver";

describe("requested level 2 / level 5 swap", () => {
  it("swaps complete final puzzles while keeping destination IDs", () => {
    expect(getLevel(2)).toEqual({ ...LEVELS_BEFORE_LEVEL_ORDER_SWAP[4], id: 2 });
    expect(getLevel(5)).toEqual({ ...LEVELS_BEFORE_LEVEL_ORDER_SWAP[1], id: 5 });
    expect(LEVELS_BEFORE_LEVEL_ORDER_SWAP[1].id).toBe(2);
    expect(LEVELS_BEFORE_LEVEL_ORDER_SWAP[4].id).toBe(5);
  });

  it("preserves all other levels and the contiguous progress order", () => {
    expect(LEVELS).toHaveLength(200);
    expect(LEVELS.map(({ id }) => id)).toEqual(Array.from({ length: 200 }, (_, index) => index + 1));
    for (const [index, level] of LEVELS.entries()) {
      expect(getLevelStrict(index + 1)).toBe(level);
      if (level.id !== 2 && level.id !== 5) expect(level).toBe(LEVELS_BEFORE_LEVEL_ORDER_SWAP[index]);
    }
  });

  it.each([[2, 5], [5, 2]])("moves the existing star targets from source Lv%i / Lv%i with the puzzle", (destination, source) => {
    expect(levelStarTargets(getLevel(destination))).toEqual(levelStarTargets(LEVELS_BEFORE_LEVEL_ORDER_SWAP[source - 1]));
  });

  it.each([2, 5])("validates, solves and replays the swapped Lv%i", (id) => {
    const level = getLevel(id);
    expect(() => validateLevel(level)).not.toThrow();
    const result = solveLevelForValidation(level, 20_000);
    expect(result.solved, `Lv${id}: ${result.termination}`).toBe(true);
    const model = new PuzzleModel(level);
    for (const drag of result.drags) {
      model.beginAction();
      for (const [x, y] of drag.path) expect(model.moveBlock(drag.blockId, x, y)).toBe(true);
      if (drag.exitSide) expect(model.tryExit(drag.blockId, drag.exitSide).ok).toBe(true);
      expect(model.commitAction()).toBe(true);
    }
    expect(model.snapshot().complete).toBe(true);
  }, 30_000);
});
