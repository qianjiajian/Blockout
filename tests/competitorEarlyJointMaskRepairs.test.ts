import { describe, expect, it } from "vitest";

import {
  applyCompetitorEarlyJointMaskRepair,
  COMPETITOR_EARLY_JOINT_MASK_REPAIR_LEVEL_IDS,
  COMPETITOR_EARLY_JOINT_MASK_REPAIR_VERSION,
} from "../src/core/competitorEarlyJointMaskRepairs";
import { finalGeneratorPlacementIssues } from "../src/core/finalGeneratorContracts";
import { generatorSpawnAlignmentIssues } from "../src/core/generatorSpawnAlignmentRepairs";
import { solveLevelForValidation, type SolverDrag } from "../src/core/levelSolver";
import {
  LEVELS,
  LEVELS_BEFORE_COMPETITOR_EARLY_JOINT_MASK_REPAIR,
  LEVELS_BEFORE_COMPETITOR_LATE_BOARD_MASK_REPAIR,
} from "../src/core/levels";
import { openingVisibleBlockIds } from "../src/core/openingBlockCountRepairs";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import { auditOrdinaryShutterCoverage } from "../src/core/shutterCoverage";
import type { BlockSpec, LevelSpec, Point } from "../src/core/types";

const EXPECTED_MASKS = new Map<number, readonly string[]>([
  [16, [
    ".....#", "....##", "...###", "..####", ".#####", "######", "######",
  ]],
  [27, [
    "###...", "###...", "###...", "######", "######",
    "######", "###...", "###...", "###...",
  ]],
]);

const EXPECTED_MOVED_BLOCKS = new Map<number, readonly string[]>([
  [16, [
    "cc-016-b1-03", "cc-016-b1-04", "cc-016-b1-09", "cc-016-b1-11",
    "cc-016-b1-12", "cc-016-b1-14", "cc-016-b1-18",
  ]],
  [27, Array.from({ length: 8 }, (_, index) => `cc-027-b1-${String(index + 1).padStart(2, "0")}`)],
]);

const EXPECTED_CHANGED_GATES = new Map<number, readonly string[]>([
  [16, ["vp-016-gate-01", "vp-016-gate-02"]],
  [27, [
    "sr-gate-27-green", "sr-gate-27-blue", "sr-gate-27-cyan",
    "sr-gate-27-pink", "sr-gate-27-purple",
  ]],
]);

const key = (x: number, y: number): string => `${x},${y}`;
const rectangle = (level: Pick<LevelSpec, "width" | "height">): Point[] => Array.from(
  { length: level.height },
  (_, y) => Array.from({ length: level.width }, (__, x) => [x, y] as Point),
).flat();
const playableCells = (level: LevelSpec): Point[] => level.playable ?? rectangle(level);
const maskRows = (level: LevelSpec): string[] => {
  const playable = new Set(playableCells(level).map(([x, y]) => key(x, y)));
  return Array.from({ length: level.height }, (_, y) => (
    Array.from({ length: level.width }, (__, x) => playable.has(key(x, y)) ? "#" : ".").join("")
  ));
};
const without = <T extends object>(value: T, fields: readonly string[]): Partial<T> => (
  Object.fromEntries(Object.entries(value).filter(([name]) => !fields.includes(name))) as Partial<T>
);
const outer = (block: BlockSpec): BlockSpec["color"] => block.layers?.[0] ?? block.color;
const blockCells = (block: BlockSpec): Point[] => block.shape.map(([dx, dy]) => [block.x + dx, block.y + dy]);

const openingAdjacencyIssues = (level: LevelSpec): string[] => {
  const opening = new Set(openingVisibleBlockIds(level));
  const occupied = new Map<string, BlockSpec>();
  for (const block of level.blocks.filter(({ id }) => opening.has(id))) {
    for (const [x, y] of blockCells(block)) occupied.set(key(x, y), block);
  }
  const issues = new Set<string>();
  for (const block of level.blocks.filter(({ id }) => opening.has(id))) {
    for (const [x, y] of blockCells(block)) {
      for (const [dx, dy] of [[1, 0], [0, 1]] as const) {
        const other = occupied.get(key(x + dx, y + dy));
        if (other && other.id !== block.id && outer(other) === outer(block)) {
          issues.add([block.id, other.id].sort().join("|"));
        }
      }
    }
  }
  return [...issues];
};

const sourceInvalidBlocks = (source: LevelSpec, target: LevelSpec): string[] => {
  const playable = new Set(playableCells(target).map(([x, y]) => key(x, y)));
  return source.blocks.filter((block) => blockCells(block).some(([x, y]) => !playable.has(key(x, y))))
    .map(({ id }) => id);
};

const sourceInvalidGates = (source: LevelSpec, target: LevelSpec): string[] => {
  const playable = new Set(playableCells(target).map(([x, y]) => key(x, y)));
  return source.gates.filter((gate) => Array.from({ length: gate.size }, (_, step) => {
    const x = gate.side === "left" ? 0 : gate.side === "right" ? target.width - 1 : gate.offset + step;
    const y = gate.side === "top" ? 0 : gate.side === "bottom" ? target.height - 1 : gate.offset + step;
    return !playable.has(key(x, y));
  }).some(Boolean)).map(({ id }) => id);
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

describe(`competitor early joint masks ${COMPETITOR_EARLY_JOINT_MASK_REPAIR_VERSION}`, () => {
  it("changes only Lv16/Lv27, composes at the declared stage, and is idempotent", () => {
    expect(COMPETITOR_EARLY_JOINT_MASK_REPAIR_LEVEL_IDS).toEqual([16, 27]);
    for (const before of LEVELS_BEFORE_COMPETITOR_EARLY_JOINT_MASK_REPAIR) {
      const after = applyCompetitorEarlyJointMaskRepair(before);
      const affected = (COMPETITOR_EARLY_JOINT_MASK_REPAIR_LEVEL_IDS as readonly number[]).includes(before.id);
      expect(after === before, `Lv${before.id}`).toBe(!affected);
      if (!affected) continue;
      expect(after, `Lv${before.id} pipeline stage`).toEqual(
        LEVELS_BEFORE_COMPETITOR_LATE_BOARD_MASK_REPAIR[before.id - 1],
      );
      expect(after, `Lv${before.id} final composition`).toEqual(LEVELS[before.id - 1]);
      expect(applyCompetitorEarlyJointMaskRepair(after), `Lv${before.id} idempotence`).toBe(after);
    }
  });

  it("matches both exact competitor masks without internal blocked cells", () => {
    for (const [levelId, expected] of EXPECTED_MASKS) {
      const level = LEVELS[levelId - 1]!;
      expect(level).toMatchObject({ width: expected[0]!.length, height: expected.length });
      expect(maskRows(level), `Lv${levelId}`).toEqual(expected);
      expect(level.blocked, `Lv${levelId}`).toBeUndefined();
    }
  });

  it("moves exactly the source-invalid blocks and changes exactly the source-invalid gates", () => {
    for (const levelId of COMPETITOR_EARLY_JOINT_MASK_REPAIR_LEVEL_IDS) {
      const before = LEVELS_BEFORE_COMPETITOR_EARLY_JOINT_MASK_REPAIR[levelId - 1]!;
      const after = LEVELS[levelId - 1]!;
      const moved = after.blocks.filter((block) => {
        const source = before.blocks.find(({ id }) => id === block.id)!;
        return block.x !== source.x || block.y !== source.y;
      }).map(({ id }) => id);
      const changedGates = after.gates.filter((gate) => {
        const source = before.gates.find(({ id }) => id === gate.id)!;
        return gate.side !== source.side || gate.offset !== source.offset || gate.size !== source.size;
      }).map(({ id }) => id);
      expect(moved, `Lv${levelId} moved blocks`).toEqual(EXPECTED_MOVED_BLOCKS.get(levelId));
      expect(moved, `Lv${levelId} forced block moves`).toEqual(sourceInvalidBlocks(before, after));
      expect(changedGates, `Lv${levelId} changed gates`).toEqual(EXPECTED_CHANGED_GATES.get(levelId));
      expect(changedGates, `Lv${levelId} forced gate changes`).toEqual(sourceInvalidGates(before, after));
      expect(after.blocks.map((block) => without(block, ["x", "y"])), `Lv${levelId} block payload`)
        .toEqual(before.blocks.map((block) => without(block, ["x", "y"])));
      expect(after.gates.map((gate) => without(gate, ["side", "offset", "size"])), `Lv${levelId} gate payload`)
        .toEqual(before.gates.map((gate) => without(gate, ["side", "offset", "size"])));
      expect(openingVisibleBlockIds(after).length, `Lv${levelId} opening count`)
        .toBe(openingVisibleBlockIds(before).length);
      expect(after.shutters).toEqual(before.shutters);
      expect(after.generators).toEqual(before.generators);
      expect(after.flipDoors).toEqual(before.flipDoors);
      expect(after.coloredGrids).toEqual(before.coloredGrids);
      expect(after.conveyors).toEqual(before.conveyors);
      expect(after.elevators).toEqual(before.elevators);
      expect(new Set(after.gates.map(({ color }) => color)).size).toBe(after.gates.length);
    }
    expect(LEVELS[15]!.gates.find(({ id }) => id === "vp-016-gate-01"))
      .toMatchObject({ side: "top", offset: 5, size: 1, color: "green", frozen: 1 });
    expect(LEVELS[26]!.gates.filter(({ id }) => id === "sr-gate-27-green" || id === "sr-gate-27-cyan"))
      .toEqual([
        expect.objectContaining({ id: "sr-gate-27-green", side: "right", offset: 3, size: 1 }),
        expect.objectContaining({ id: "sr-gate-27-cyan", side: "right", offset: 5, size: 1 }),
      ]);
  });

  it("keeps Lv27's 3x9/count-9 shutter, cohort, and all H3 coordinates exact", () => {
    const before = LEVELS_BEFORE_COMPETITOR_EARLY_JOINT_MASK_REPAIR[26]!;
    const after = LEVELS[26]!;
    expect(after.shutters).toEqual(before.shutters);
    expect(after.shutters).toEqual([
      { id: "vp-027-cover-1", x: 0, y: 0, width: 3, height: 9, count: 9, skin: "shutter" },
    ]);
    for (let index = 1; index <= 9; index += 1) {
      const id = `cc-027-b2-${String(index).padStart(2, "0")}`;
      expect(after.blocks.find((block) => block.id === id), id).toEqual(
        before.blocks.find((block) => block.id === id),
      );
      expect(after.blocks.find((block) => block.id === id), id).toMatchObject({
        x: 0,
        y: index - 1,
        shutterId: "vp-027-cover-1",
      });
    }
    expect(after.blocks.find(({ id }) => id === "cc-027-b1-09")).toMatchObject({ x: 4, y: 3 });
  });

  it("passes validation, adjacency, shutter coverage and generator contracts", () => {
    for (const levelId of COMPETITOR_EARLY_JOINT_MASK_REPAIR_LEVEL_IDS) {
      const level = LEVELS[levelId - 1]!;
      expect(() => validateLevel(level), `Lv${levelId}`).not.toThrow();
      expect(openingAdjacencyIssues(level), `Lv${levelId} adjacency`).toEqual([]);
      expect(auditOrdinaryShutterCoverage(level), `Lv${levelId} shutter coverage`).toEqual([]);
      expect(generatorSpawnAlignmentIssues(level), `Lv${levelId} centre mouth`).toEqual([]);
      expect(finalGeneratorPlacementIssues(level), `Lv${levelId} generator rim`).toEqual([]);
    }
  });

  it("fresh-solves within 20k states and independently replays both levels", () => {
    for (const levelId of COMPETITOR_EARLY_JOINT_MASK_REPAIR_LEVEL_IDS) {
      const level = LEVELS[levelId - 1]!;
      const solution = solveLevelForValidation(level, 20_000);
      expect(solution.staticUnsatReasons, `Lv${levelId} static`).toEqual([]);
      expect(solution.unsupportedReasons, `Lv${levelId} unsupported`).toEqual([]);
      expect(solution.solved, `Lv${levelId}: ${solution.termination}/${solution.exploredStates}`).toBe(true);
      expect(solution.exploredStates, `Lv${levelId} budget`).toBeLessThanOrEqual(20_000);
      expect(replay(level, solution.drags), `Lv${levelId} replay`).toBe(true);
    }
  }, 30_000);
});
