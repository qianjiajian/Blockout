import { describe, expect, it } from "vitest";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import { solveLevelForValidation, type SolverDrag } from "../src/core/levelSolver";
import { LEVELS } from "../src/core/levels";
import type { BlockSpec, LevelSpec } from "../src/core/types";

const cellKeys = (block: BlockSpec): string[] => block.shape.map(([dx, dy]) => `${block.x + dx},${block.y + dy}`);

const rectangleKeys = ({ x, y, width, height }: { x: number; y: number; width: number; height: number }): Set<string> => new Set(
  Array.from({ length: height }, (_, dy) => (
    Array.from({ length: width }, (_unused, dx) => `${x + dx},${y + dy}`)
  )).flat(),
);

const replay = (level: LevelSpec, route: readonly SolverDrag[]): PuzzleModel => {
  const model = new PuzzleModel(level);
  for (const drag of route) {
    model.beginAction();
    for (const [x, y] of drag.path) expect(model.moveBlock(drag.blockId, x, y)).toBe(true);
    if (drag.exitSide) expect(model.tryExit(drag.blockId, drag.exitSide).ok).toBe(true);
    expect(model.commitAction()).toBe(true);
  }
  return model;
};

describe("Lv21 source-observed shutter repair", () => {
  const level = LEVELS.find(({ id }) => id === 21)!;

  it("publishes the three real cover rectangles instead of synthetic 1x1 markers", () => {
    expect(level).toBeDefined();
    expect(() => validateLevel(level)).not.toThrow();
    expect(level.shutters?.map(({ id, x, y, width, height, count }) => ({ id, x, y, width, height, count }))).toEqual([
      { id: "vp-021-cover-1", x: 0, y: 2, width: 4, height: 2, count: 10 },
      { id: "vp-021-cover-2", x: 0, y: 6, width: 4, height: 3, count: 17 },
      { id: "vp-021-cover-3", x: 4, y: 6, width: 2, height: 3, count: 19 },
    ]);
  });

  it("keeps every opening block outside the covers and exactly tiles each hidden batch inside its cover", () => {
    const covered = new Set<string>();
    for (const shutter of level.shutters ?? []) {
      const expected = rectangleKeys(shutter);
      const hidden = new Set(level.blocks
        .filter((block) => block.shutterId === shutter.id)
        .flatMap(cellKeys));
      expect(hidden, shutter.id).toEqual(expected);
      for (const key of expected) covered.add(key);
    }

    const openingCells = level.blocks.filter((block) => !block.shutterId).flatMap(cellKeys);
    expect(openingCells).toHaveLength(28);
    expect(new Set(openingCells).size).toBe(28);
    expect(openingCells.some((key) => covered.has(key))).toBe(false);
    expect(covered.size).toBe(26);
    expect(new Set([...openingCells, ...covered]).size).toBe(54);
  });

  it("uses the visible cover rectangle as the collision footprint until its counter opens", () => {
    const model = new PuzzleModel(level);
    const opening = model.getBlock("cc-021-b1-01")!;
    expect(model.canPlace(opening, 0, 2)).toBe(false);
  });

  it("remains solvable and replays the certified route through PuzzleModel", () => {
    const solution = solveLevelForValidation(level, 120_000);
    expect(solution).toMatchObject({ solved: true, termination: "solved" });
    expect(replay(level, solution.drags).snapshot().complete).toBe(true);
  }, 30_000);
});
