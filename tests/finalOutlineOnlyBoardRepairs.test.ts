import { describe, expect, it } from "vitest";

import {
  applyFinalOutlineOnlyBoardRepair,
  FINAL_OUTLINE_ONLY_BOARD_REPAIR_LEVEL_IDS,
} from "../src/core/finalOutlineOnlyBoardRepairs";
import { finalGeneratorPlacementIssues } from "../src/core/finalGeneratorContracts";
import { solveLevelForValidation, type SolverDrag } from "../src/core/levelSolver";
import {
  LEVELS,
  LEVELS_BEFORE_FINAL_OUTLINE_ONLY_BOARD_REPAIR,
} from "../src/core/levels";
import { openingVisibleBlockIds } from "../src/core/openingBlockCountRepairs";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import type { BlockSpec, LevelSpec, Point } from "../src/core/types";

const key = (x: number, y: number): string => `${x},${y}`;
const fullRectangle = (level: LevelSpec): Point[] => Array.from(
  { length: level.height },
  (_, y) => Array.from({ length: level.width }, (__, x) => [x, y] as Point),
).flat();

const enclosedVoids = (level: LevelSpec): Point[] => {
  const playable = new Set((level.playable ?? fullRectangle(level)).map(([x, y]) => key(x, y)));
  const exterior = new Set([key(-1, -1)]);
  const queue = [[-1, -1] as Point];
  while (queue.length) {
    const [x, y] = queue.shift()!;
    for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]] as Point[]) {
      if (nx < -1 || ny < -1 || nx > level.width || ny > level.height) continue;
      const next = key(nx, ny);
      const outside = nx < 0 || ny < 0 || nx >= level.width || ny >= level.height;
      if ((outside || !playable.has(next)) && !exterior.has(next)) {
        exterior.add(next);
        queue.push([nx, ny]);
      }
    }
  }
  return fullRectangle(level).filter(([x, y]) => !playable.has(key(x, y)) && !exterior.has(key(x, y)));
};

const openingAdjacency = (level: LevelSpec): string[] => {
  const opening = new Set(openingVisibleBlockIds(level));
  const occupied = new Map<string, BlockSpec>();
  for (const block of level.blocks.filter(({ id }) => opening.has(id))) for (const [dx, dy] of block.shape) {
    occupied.set(key(block.x + dx, block.y + dy), block);
  }
  const issues = new Set<string>();
  for (const [cell, block] of occupied) {
    const [xValue, yValue] = cell.split(",").map(Number);
    const x = xValue!;
    const y = yValue!;
    for (const [dx, dy] of [[1, 0], [0, 1]] as Point[]) {
      const other = occupied.get(key(x + dx, y + dy));
      if (other && other.id !== block.id
        && (other.layers?.[0] ?? other.color) === (block.layers?.[0] ?? block.color)) {
        issues.add([block.id, other.id].sort().join("|"));
      }
    }
  }
  return [...issues];
};

const replay = (level: LevelSpec, drags: readonly SolverDrag[]): boolean => {
  const model = new PuzzleModel(level);
  model.start();
  model.startCountdown();
  for (const drag of drags) {
    if (!model.getBlock(drag.blockId)) return false;
    model.beginAction();
    for (const [x, y] of drag.path) {
      const before = model.getBlock(drag.blockId);
      if (!before) return false;
      const distance = Math.abs(before.x - x) + Math.abs(before.y - y);
      const moved = distance === 1
        ? model.moveBlockStep(drag.blockId, x, y)
        : model.moveBlock(drag.blockId, x, y);
      if (!moved) return false;
    }
    if (drag.exitSide && !model.tryExit(drag.blockId, drag.exitSide).ok) return false;
    if (!model.commitAction()) return false;
  }
  const snapshot = model.snapshot();
  return snapshot.complete && snapshot.blocks.length === 0 && snapshot.queuedBlocks.length === 0;
};

describe("final outline-only board repairs", () => {
  it("fills every late internal void without changing exterior indentations", () => {
    expect(FINAL_OUTLINE_ONLY_BOARD_REPAIR_LEVEL_IDS).toEqual([85, 146, 178]);
    const expectedAddedCells: Readonly<Record<number, Point[]>> = {
      85: [[2, 3], [3, 3], [2, 4], [3, 4], [2, 5], [3, 5]],
      146: [[2, 2], [3, 2], [2, 3], [3, 3], [3, 7], [4, 7], [3, 8], [4, 8]],
      178: [[3, 2], [3, 3], [3, 4], [3, 5]],
    };
    for (const levelId of FINAL_OUTLINE_ONLY_BOARD_REPAIR_LEVEL_IDS) {
      const before = LEVELS_BEFORE_FINAL_OUTLINE_ONLY_BOARD_REPAIR[levelId - 1]!;
      const after = applyFinalOutlineOnlyBoardRepair(before);
      expect(enclosedVoids(before), `Lv${levelId} before`).toEqual(expectedAddedCells[levelId]);
      expect(enclosedVoids(after), `Lv${levelId} after`).toEqual([]);
      expect(after.blocked ?? [], `Lv${levelId} blocked`).toEqual([]);
      expect(after.width).toBe(before.width);
      expect(after.height).toBe(before.height);
      expect({ ...after, playable: undefined }, `Lv${levelId} payload`)
        .toEqual({ ...before, blocked: undefined, playable: undefined });
      expect(applyFinalOutlineOnlyBoardRepair(after), `Lv${levelId} idempotence`).toBe(after);
      expect(LEVELS[levelId - 1], `Lv${levelId} runtime`).toEqual(after);
      expect(applyFinalOutlineOnlyBoardRepair(LEVELS[levelId - 1]!), `Lv${levelId} runtime idempotence`)
        .toBe(LEVELS[levelId - 1]);
    }
  });

  it("validates, keeps adjacency and generator contracts clean, then solves and replays", () => {
    for (const levelId of FINAL_OUTLINE_ONLY_BOARD_REPAIR_LEVEL_IDS) {
      const level = LEVELS[levelId - 1]!;
      expect(() => validateLevel(level), `Lv${levelId}`).not.toThrow();
      expect(openingAdjacency(level), `Lv${levelId} adjacency`).toEqual([]);
      expect(finalGeneratorPlacementIssues(level), `Lv${levelId} generator`).toEqual([]);
      const solution = solveLevelForValidation(level, 30_000);
      expect(solution.staticUnsatReasons, `Lv${levelId} static`).toEqual([]);
      expect(solution.unsupportedReasons, `Lv${levelId} unsupported`).toEqual([]);
      expect(solution.solved, `Lv${levelId}: ${solution.termination}/${solution.exploredStates}`).toBe(true);
      expect(replay(level, solution.drags), `Lv${levelId} replay`).toBe(true);
    }
  }, 120_000);
});
