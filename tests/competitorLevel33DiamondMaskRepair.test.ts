import { describe, expect, it } from "vitest";

import {
  applyCompetitorLevel33DiamondMaskRepair,
  COMPETITOR_LEVEL_33_DIAMOND_MASK,
  COMPETITOR_LEVEL_33_DIAMOND_MASK_REPAIR_LEVEL_IDS,
  COMPETITOR_LEVEL_33_DIAMOND_MASK_REPAIR_VERSION,
} from "../src/core/competitorLevel33DiamondMaskRepair";
import { solveLevelForValidation, type SolverDrag } from "../src/core/levelSolver";
import {
  LEVELS,
  LEVELS_BEFORE_COMPETITOR_LATE_BOARD_MASK_REPAIR,
  LEVELS_BEFORE_COMPETITOR_LEVEL_33_DIAMOND_MASK_REPAIR,
} from "../src/core/levels";
import { openingVisibleBlockIds } from "../src/core/openingBlockCountRepairs";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import type { BlockSpec, LevelSpec, Point } from "../src/core/types";

const key = (x: number, y: number): string => `${x},${y}`;
const maskRows = (level: LevelSpec): string[] => {
  const playable = new Set((level.playable ?? []).map(([x, y]) => key(x, y)));
  return Array.from({ length: level.height }, (_, y) => (
    Array.from({ length: level.width }, (__, x) => playable.has(key(x, y)) ? "#" : ".").join("")
  ));
};
const cellsOf = (block: BlockSpec): Point[] => block.shape.map(([dx, dy]) => [block.x + dx, block.y + dy]);
const outerColor = (block: BlockSpec) => block.layers?.[0] ?? block.color;

const openingAdjacencyIssues = (level: LevelSpec): string[] => {
  const opening = new Set(openingVisibleBlockIds(level));
  const occupied = new Map<string, BlockSpec>();
  for (const block of level.blocks.filter(({ id }) => opening.has(id))) {
    for (const [x, y] of cellsOf(block)) occupied.set(key(x, y), block);
  }
  const issues = new Set<string>();
  for (const block of level.blocks.filter(({ id }) => opening.has(id))) {
    for (const [x, y] of cellsOf(block)) {
      for (const [dx, dy] of [[1, 0], [0, 1]] as const) {
        const other = occupied.get(key(x + dx, y + dy));
        if (other && other.id !== block.id && outerColor(other) === outerColor(block)) {
          issues.add([block.id, other.id].sort().join("|"));
        }
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
      const moved = Math.abs(before.x - x) + Math.abs(before.y - y) === 1
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

describe(`competitor Lv33 diamond mask ${COMPETITOR_LEVEL_33_DIAMOND_MASK_REPAIR_VERSION}`, () => {
  it("is an idempotent one-level repair at the declared pipeline stage", () => {
    expect(COMPETITOR_LEVEL_33_DIAMOND_MASK_REPAIR_LEVEL_IDS).toEqual([33]);
    for (const before of LEVELS_BEFORE_COMPETITOR_LEVEL_33_DIAMOND_MASK_REPAIR) {
      const after = applyCompetitorLevel33DiamondMaskRepair(before);
      expect(after === before, `Lv${before.id}`).toBe(before.id !== 33);
      if (before.id !== 33) continue;
      expect(after).toEqual(LEVELS_BEFORE_COMPETITOR_LATE_BOARD_MASK_REPAIR[32]);
      expect(after).toEqual(LEVELS[32]);
      expect(applyCompetitorLevel33DiamondMaskRepair(after)).toBe(after);
    }
  });

  it("matches the exact 7x9 diamond and its eight exposed boundary cells", () => {
    const level = LEVELS[32]!;
    expect(level).toMatchObject({ id: 33, width: 7, height: 9 });
    expect(maskRows(level)).toEqual(COMPETITOR_LEVEL_33_DIAMOND_MASK);
    expect(level.blocked).toBeUndefined();
    const boundary = level.playable!.filter(([x, y]) => (
      x === 0 || x === level.width - 1 || y === 0 || y === level.height - 1
    ));
    expect(boundary).toEqual([
      [3, 0], [0, 3], [6, 3], [0, 4], [6, 4], [0, 5], [6, 5], [3, 8],
    ]);
  });

  it("restores the six video exits and removes the erroneous cyan/seventh exit", () => {
    const gates = LEVELS[32]!.gates.map(({ id, side, offset, size, color, frozen }) => (
      { id, side, offset, size, color, ...(frozen ? { frozen } : {}) }
    ));
    expect(gates).toEqual([
      { id: "vp-033-gate-02", side: "top", offset: 3, size: 1, color: "yellow" },
      { id: "vp-033-gate-01", side: "bottom", offset: 3, size: 1, color: "red", frozen: 5 },
      { id: "vp-033-gate-06", side: "left", offset: 3, size: 1, color: "orange", frozen: 10 },
      { id: "vp-033-gate-04", side: "left", offset: 5, size: 1, color: "purple", frozen: 18 },
      { id: "vp-033-gate-05", side: "right", offset: 3, size: 1, color: "pink", frozen: 16 },
      { id: "vp-033-gate-07", side: "right", offset: 5, size: 1, color: "blue", frozen: 10 },
    ]);
    expect(new Set(gates.map(({ color }) => color)).size).toBe(6);
    expect(gates.some(({ id, color }) => id === "vp-033-gate-03" || color === "cyan")).toBe(false);
  });

  it("keeps 23 identities and shapes while restoring the original six-colour composition", () => {
    const before = LEVELS_BEFORE_COMPETITOR_LEVEL_33_DIAMOND_MASK_REPAIR[32]!;
    const after = LEVELS[32]!;
    expect(after.blocks).toHaveLength(23);
    expect(after.blocks.filter(({ shape }) => shape.length === 1)).toHaveLength(21);
    expect(after.blocks.filter(({ shape }) => shape.length === 4)).toHaveLength(2);
    expect(after.blocks.map(({ id, shape, layers, frozen, shutterId }) => ({ id, shape, layers, frozen, shutterId })))
      .toEqual(before.blocks.map(({ id, shape, layers, frozen, shutterId }) => ({ id, shape, layers, frozen, shutterId })));
    const changedColors = after.blocks.filter((block) => (
      block.color !== before.blocks.find(({ id }) => id === block.id)!.color
    )).map(({ id }) => id);
    expect(changedColors).toEqual([
      "strategy-guard-06", "strategy-guard-07", "cc-piece-08",
      "cc-piece-10", "cc-piece-17", "cc-piece-18",
    ]);
    expect(new Set(after.blocks.map(({ color }) => color))).toEqual(
      new Set(["blue", "yellow", "red", "purple", "orange", "pink"]),
    );
    expect(after.blocks.some(({ color }) => color === "cyan")).toBe(false);
    expect(after.blocks.find(({ id }) => id === "strategy-guard-22")).toMatchObject({ x: 2, y: 0, color: "yellow" });
    expect(after.blocks.find(({ id }) => id === "cc-piece-21")).toMatchObject({ x: 2, y: 7, color: "red" });
    expect(after.shutters).toEqual(before.shutters);
    expect(after.generators).toEqual(before.generators);
    expect(after.flipDoors).toEqual(before.flipDoors);
    expect(after.coloredGrids).toEqual(before.coloredGrids);
    expect(after.conveyors).toEqual(before.conveyors);
    expect(after.elevators).toEqual(before.elevators);
  });

  it("has zero opening same-colour adjacency and validates", () => {
    const level = LEVELS[32]!;
    expect(openingVisibleBlockIds(level)).toHaveLength(23);
    expect(openingAdjacencyIssues(level)).toEqual([]);
    expect(() => validateLevel(level)).not.toThrow();
  });

  it("fresh-solves within 20k states and independently replays", () => {
    const level = LEVELS[32]!;
    const solution = solveLevelForValidation(level, 20_000);
    expect(solution.staticUnsatReasons).toEqual([]);
    expect(solution.unsupportedReasons).toEqual([]);
    expect(solution.solved, `${solution.termination}/${solution.exploredStates}`).toBe(true);
    expect(solution.exploredStates).toBeLessThanOrEqual(20_000);
    expect(replay(level, solution.drags)).toBe(true);
  });
});
