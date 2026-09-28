import { describe, expect, it } from "vitest";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import { solveLevelForValidation, type SolverDrag } from "../src/core/levelSolver";
import { getLevel } from "../src/core/levels";
import { auditOrdinaryShutterCoverage } from "../src/core/shutterCoverage";
import type { BlockSpec, LevelSpec } from "../src/core/types";

const cellKeys = (block: BlockSpec): string[] => block.shape.map(
  ([dx, dy]) => `${block.x + dx},${block.y + dy}`,
);

const rectangleKeys = ({ x, y, width, height }: {
  x: number;
  y: number;
  width: number;
  height: number;
}): Set<string> => new Set(Array.from({ length: height }, (_, dy) => (
  Array.from({ length: width }, (_, dx) => `${x + dx},${y + dy}`)
)).flat());

const replay = (level: LevelSpec, route: readonly SolverDrag[]): PuzzleModel => {
  const model = new PuzzleModel(level);
  for (const drag of route) {
    model.beginAction();
    for (const [x, y] of drag.path) expect(model.moveBlockStep(drag.blockId, x, y)).toBe(true);
    if (drag.exitSide) expect(model.tryExit(drag.blockId, drag.exitSide).ok).toBe(true);
    expect(model.commitAction()).toBe(true);
  }
  return model;
};

describe("Lv23 source-observed dual-shutter repair", () => {
  const level = getLevel(23);

  it("publishes the two real 3x3 covers instead of synthetic 1x1 markers", () => {
    expect(() => validateLevel(level)).not.toThrow();
    expect(level.shutters?.map(({ id, x, y, width, height, count, skin }) => ({
      id, x, y, width, height, count, skin,
    }))).toEqual([
      { id: "vp-023-cover-1", x: 3, y: 5, width: 3, height: 3, count: 9, skin: "shutter" },
      { id: "vp-023-cover-2", x: 0, y: 5, width: 3, height: 3, count: 12, skin: "shutter" },
    ]);
    expect(auditOrdinaryShutterCoverage(level)).toEqual([]);
  });

  it("exactly tiles each displayed cover with its source reveal cohort", () => {
    for (const shutter of level.shutters ?? []) {
      const hidden = new Set(level.blocks
        .filter((block) => block.shutterId === shutter.id)
        .flatMap(cellKeys));
      expect(hidden, shutter.id).toEqual(rectangleKeys(shutter));
    }

    const cover9 = level.blocks.filter(({ shutterId }) => shutterId === "vp-023-cover-1");
    expect(cover9.map(({ id, x, y, shape }) => ({ id, x, y, shape }))).toEqual([
      { id: "strategy-guard-s2-01", x: 3, y: 6, shape: [[0, 0], [0, 1]] },
      { id: "cc-piece-s2-02", x: 4, y: 6, shape: [[0, 0], [0, 1]] },
      { id: "cc-piece-s2-03", x: 5, y: 6, shape: [[0, 0], [0, 1]] },
      { id: "strategy-guard-s2-04", x: 3, y: 5, shape: [[0, 0], [1, 0], [2, 0]] },
    ]);
    const cover12 = level.blocks.filter(({ shutterId }) => shutterId === "vp-023-cover-2");
    expect(cover12.map(({ id, x, y, shape }) => ({ id, x, y, shape }))).toEqual([
      { id: "strategy-guard-s3-01", x: 0, y: 5, shape: [[0, 0], [1, 0]] },
      { id: "cc-piece-s3-02", x: 0, y: 6, shape: [[0, 0], [0, 1], [1, 1], [2, 1]] },
      { id: "cc-piece-s3-03", x: 1, y: 5, shape: [[1, 0], [0, 1], [1, 1]] },
    ]);
  });

  it("keeps every opening contact different-coloured after the same-shape slot swap", () => {
    const opening = level.blocks.filter((block) => !block.shutterId);
    for (let leftIndex = 0; leftIndex < opening.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < opening.length; rightIndex += 1) {
        const left = opening[leftIndex];
        const right = opening[rightIndex];
        if (left.color !== right.color) continue;
        const rightCells = new Set(cellKeys(right));
        const adjacent = cellKeys(left).some((key) => {
          const [x, y] = key.split(",").map(Number);
          return rightCells.has(`${x - 1},${y}`)
            || rightCells.has(`${x + 1},${y}`)
            || rightCells.has(`${x},${y - 1}`)
            || rightCells.has(`${x},${y + 1}`);
        });
        expect(adjacent, `${left.id} touches same-colour ${right.id}`).toBe(false);
      }
    }
  });

  it("remains solvable and completes a fresh PuzzleModel replay", () => {
    const solution = solveLevelForValidation(level, 20_000);
    expect(solution).toMatchObject({ solved: true, termination: "solved" });
    expect(solution.exploredStates).toBeLessThanOrEqual(20_000);
    expect(replay(level, solution.drags).snapshot()).toMatchObject({
      complete: true,
      blocks: [],
      queuedBlocks: [],
    });
  }, 120_000);
});
