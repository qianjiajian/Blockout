import { describe, expect, it } from "vitest";

import {
  boardCellsSeparatedBySeam,
  boardRailIsSeam,
  footprintCrossesBoardSeam,
} from "../src/core/boardSeams";
import { solveLevelForValidation, type SolverDrag } from "../src/core/levelSolver";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import { normalizeRuntimeLevel } from "../src/core/runtimeLevelNormalization";
import type { LevelSpec } from "../src/core/types";

const seamLevel = (): LevelSpec => ({
  id: 997,
  name: "two-room seam fixture",
  difficulty: "normal",
  timeSeconds: 60,
  reward: 0,
  width: 3,
  height: 4,
  seams: [{ orientation: "horizontal", offset: 2, start: 0, size: 3 }],
  gates: [
    {
      id: "upper-red",
      color: "red",
      side: "bottom",
      offset: 0,
      size: 1,
      portals: [{ side: "bottom", origin: [0, 1], size: 1 }],
    },
    {
      id: "lower-blue",
      color: "blue",
      side: "top",
      offset: 0,
      size: 1,
      portals: [{ side: "top", origin: [0, 2], size: 1 }],
    },
  ],
  blocks: [
    { id: "red", x: 0, y: 0, shape: [[0, 0]], color: "red" },
    { id: "blue", x: 0, y: 3, shape: [[0, 0]], color: "blue" },
  ],
});

const replay = (level: LevelSpec, drags: readonly SolverDrag[]): PuzzleModel => {
  const model = new PuzzleModel(level);
  for (const drag of drags) {
    model.beginAction();
    for (const [x, y] of drag.path) expect(model.moveBlockStep(drag.blockId, x, y)).toBe(true);
    if (drag.exitSide) expect(model.tryExit(drag.blockId, drag.exitSide).ok).toBe(true);
    expect(model.commitAction()).toBe(true);
  }
  return model;
};

describe("board seam geometry", () => {
  it("treats both directed sides of a seam as exposed physical rails", () => {
    const level = seamLevel();
    expect(boardRailIsSeam(level, [1, 1], "bottom")).toBe(true);
    expect(boardRailIsSeam(level, [1, 2], "top")).toBe(true);
    expect(boardCellsSeparatedBySeam(level, [1, 1], [1, 2])).toBe(true);
    expect(boardRailIsSeam(level, [1, 1], "top")).toBe(false);
    expect(() => validateLevel(level)).not.toThrow();
  });

  it("supports vertical seam spans without turning cells into blocked tiles", () => {
    const board: Pick<LevelSpec, "width" | "height" | "seams"> = {
      width: 4,
      height: 3,
      seams: [{ orientation: "vertical", offset: 2, start: 1, size: 2 }],
    };
    expect(boardRailIsSeam(board, [1, 1], "right")).toBe(true);
    expect(boardRailIsSeam(board, [2, 1], "left")).toBe(true);
    expect(boardCellsSeparatedBySeam(board, [1, 1], [2, 1])).toBe(true);
    expect(boardCellsSeparatedBySeam(board, [1, 0], [2, 0])).toBe(false);
  });

  it("rejects malformed, out-of-range and overlapping seam spans", () => {
    expect(() => validateLevel({
      ...seamLevel(),
      seams: {} as LevelSpec["seams"],
    })).toThrow(/board seams must be an array/);
    expect(() => validateLevel({
      ...seamLevel(),
      seams: [{ orientation: "horizontal", offset: 0, start: 0, size: 3 }],
    })).toThrow(/board seam 0 is out of bounds/);
    expect(() => validateLevel({
      ...seamLevel(),
      seams: [
        { orientation: "vertical", offset: 1, start: 0, size: 3 },
        { orientation: "vertical", offset: 1, start: 2, size: 2 },
      ],
    })).toThrow(/overlaps another board seam/);
  });

  it("rejects a settled block footprint that straddles the seam", () => {
    const level: LevelSpec = {
      ...seamLevel(),
      blocks: [{ id: "crossing", x: 1, y: 1, shape: [[0, 0], [0, 1]], color: "red" }],
    };
    expect(footprintCrossesBoardSeam(level, [[1, 1], [1, 2]])).toBe(true);
    expect(() => validateLevel(level)).toThrow(/block crossing crosses a board seam/);
  });
});

describe("board seam runtime and solver", () => {
  it("blocks translation through a seam while legacy boards remain connected", () => {
    const separated = new PuzzleModel(seamLevel());
    expect(separated.moveBlockStep("red", 0, 1)).toBe(true);
    expect(separated.moveBlockStep("red", 0, 2)).toBe(false);

    const connected = new PuzzleModel({ ...seamLevel(), seams: undefined, gates: [] });
    expect(connected.moveBlockStep("red", 0, 1)).toBe(true);
    expect(connected.moveBlockStep("red", 0, 2)).toBe(true);
  });

  it("solves and independently replays exits on both sides of one seam", () => {
    const level = seamLevel();
    const solution = solveLevelForValidation(level, 100);
    expect(solution).toMatchObject({ solved: true, termination: "solved" });
    expect(solution.staticUnsatReasons).toEqual([]);
    expect(solution.drags).toHaveLength(2);
    expect(replay(level, solution.drags).snapshot()).toMatchObject({ complete: true, blocks: [] });
  });

  it("preserves seam specs through snapshots, cloning and runtime normalization", () => {
    const level = seamLevel();
    const model = new PuzzleModel(level);
    expect(model.snapshot().seams).toEqual(level.seams);
    expect(model.clone().snapshot().seams).toEqual(level.seams);
    expect(normalizeRuntimeLevel(level).seams).toEqual(level.seams);
  });
});
