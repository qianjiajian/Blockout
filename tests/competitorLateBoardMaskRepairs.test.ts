import { describe, expect, it } from "vitest";

import {
  applyCompetitorLateBoardMaskRepair,
  COMPETITOR_LATE_BOARD_MASK_REPAIR_LEVEL_IDS,
  COMPETITOR_LATE_BOARD_MASK_REPAIR_VERSION,
} from "../src/core/competitorLateBoardMaskRepairs";
import { finalGeneratorPlacementIssues } from "../src/core/finalGeneratorContracts";
import { generatorSpawnAlignmentIssues } from "../src/core/generatorSpawnAlignmentRepairs";
import { solveLevelForValidation, type SolverDrag } from "../src/core/levelSolver";
import {
  LEVELS,
  LEVELS_BEFORE_COMPETITOR_LATE_BOARD_MASK_REPAIR,
} from "../src/core/levels";
import { openingVisibleBlockIds } from "../src/core/openingBlockCountRepairs";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import { assertOrdinaryShutterCoverage, auditOrdinaryShutterCoverage } from "../src/core/shutterCoverage";
import type { BlockSpec, LevelSpec, Point } from "../src/core/types";

const EXPECTED_MASKS = new Map<number, readonly string[]>([
  [76, [
    ".#####.", "#######", "#######", "#######", "#######",
    "#######", "#######", "#######", ".#####.",
  ]],
  [84, [
    "#####..", "#######", "#######", "#######", "#######",
    "#######", "#######", "#######", "#######", "#######",
  ]],
  [85, [
    "######", "######", "######", "##..##", "##..##",
    "##..##", "######", "######", "######",
  ]],
  [88, [
    "#######", "#######", "#######", "..###..", "..###..",
    "..###..", "..###..", "#######", "#######", "#######",
  ]],
  [90, [
    "######", "######", ".####.", "######", "######", "######",
    "######", "######", "######", "######", "######",
  ]],
  [94, [
    "#######", "#######", "#######", "#######", "######.",
    "######.", "#######", "#######", "#######", "#######",
  ]],
  [96, [
    "###..###", "###..###", "########", "########", "########",
    "########", "########", "###..###", "###..###",
  ]],
  [99, [
    ".#####.", "#######", "#######", "#######", ".#####.",
    "#######", "#######", "#######", "#######", "#######",
  ]],
]);

const key = (x: number, y: number): string => `${x},${y}`;
const rectangle = (level: Pick<LevelSpec, "width" | "height">): Point[] => Array.from(
  { length: level.height },
  (_, y) => Array.from({ length: level.width }, (__, x) => [x, y] as Point),
).flat();
const maskRows = (level: LevelSpec): string[] => {
  const playable = new Set((level.playable ?? rectangle(level)).map(([x, y]) => key(x, y)));
  return Array.from({ length: level.height }, (_, y) => (
    Array.from({ length: level.width }, (__, x) => playable.has(key(x, y)) ? "#" : ".").join("")
  ));
};
const without = <T extends object>(value: T, fields: readonly string[]): Partial<T> => (
  Object.fromEntries(Object.entries(value).filter(([name]) => !fields.includes(name))) as Partial<T>
);
const outer = (block: BlockSpec) => block.layers?.[0] ?? block.color;

const openingAdjacencyIssues = (level: LevelSpec): string[] => {
  const opening = new Set(openingVisibleBlockIds(level));
  const occupied = new Map<string, BlockSpec>();
  for (const block of level.blocks.filter(({ id }) => opening.has(id))) {
    for (const [dx, dy] of block.shape) occupied.set(key(block.x + dx, block.y + dy), block);
  }
  const issues = new Set<string>();
  for (const block of level.blocks.filter(({ id }) => opening.has(id))) {
    for (const [dx, dy] of block.shape) {
      const x = block.x + dx;
      const y = block.y + dy;
      for (const [ox, oy] of [[1, 0], [0, 1]] as const) {
        const other = occupied.get(key(x + ox, y + oy));
        if (other && other.id !== block.id && outer(other) === outer(block)) {
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

describe(`competitor late board masks ${COMPETITOR_LATE_BOARD_MASK_REPAIR_VERSION}`, () => {
  it("changes only the eight certified levels and is idempotent", () => {
    expect(COMPETITOR_LATE_BOARD_MASK_REPAIR_LEVEL_IDS).toEqual([76, 84, 85, 88, 90, 94, 96, 99]);
    for (const before of LEVELS_BEFORE_COMPETITOR_LATE_BOARD_MASK_REPAIR) {
      const after = applyCompetitorLateBoardMaskRepair(before);
      const affected = (COMPETITOR_LATE_BOARD_MASK_REPAIR_LEVEL_IDS as readonly number[]).includes(before.id);
      expect(after === before, `Lv${before.id}`).toBe(!affected);
      if (!affected) continue;
      expect(after).toEqual(LEVELS[before.id - 1]);
      expect(applyCompetitorLateBoardMaskRepair(after), `Lv${before.id} idempotence`).toBe(after);
    }
  });

  it("matches every certified playable-mask cell", () => {
    for (const [levelId, expected] of EXPECTED_MASKS) {
      const level = LEVELS[levelId - 1]!;
      expect(level).toMatchObject({ width: expected[0]!.length, height: expected.length });
      expect(maskRows(level), `Lv${levelId}`).toEqual(expected);
      expect(level.blocked, `Lv${levelId}`).toBeUndefined();
    }
  });

  it("preserves block payloads, opening counts, gate payloads, mechanisms and shutter cohorts", () => {
    for (const levelId of COMPETITOR_LATE_BOARD_MASK_REPAIR_LEVEL_IDS) {
      const before = LEVELS_BEFORE_COMPETITOR_LATE_BOARD_MASK_REPAIR[levelId - 1]!;
      const after = LEVELS[levelId - 1]!;
      expect(after.blocks.map((block) => without(block, ["x", "y"])), `Lv${levelId} blocks`)
        .toEqual(before.blocks.map((block) => without(block, ["x", "y"])));
      expect(after.gates.map((gate) => without(gate, ["side", "offset"])), `Lv${levelId} gates`)
        .toEqual(before.gates.map((gate) => without(gate, ["side", "offset"])));
      expect((after.generators ?? []).map((generator) => without(generator, ["side", "offset", "spawn", "rimAnchor"])), `Lv${levelId} generators`)
        .toEqual((before.generators ?? []).map((generator) => without(generator, ["side", "offset", "spawn", "rimAnchor"])));
      expect((after.shutters ?? []).map((shutter) => without(shutter, ["x", "y"])), `Lv${levelId} shutters`)
        .toEqual((before.shutters ?? []).map((shutter) => without(shutter, ["x", "y"])));
      expect(after.blocks.map(({ id, shutterId }) => [id, shutterId]), `Lv${levelId} cohorts`)
        .toEqual(before.blocks.map(({ id, shutterId }) => [id, shutterId]));
      expect(openingVisibleBlockIds(after).length, `Lv${levelId} opening count`)
        .toBe(openingVisibleBlockIds(before).length);
      expect(after.flipDoors).toEqual(before.flipDoors);
      expect(after.coloredGrids).toEqual(before.coloredGrids);
      expect(after.conveyors).toEqual(before.conveyors);
      expect(after.elevators).toEqual(before.elevators);
      expect(new Set(after.gates.map(({ color }) => color)).size, `Lv${levelId} unique exits`)
        .toBe(after.gates.length);
      expect(openingAdjacencyIssues(after), `Lv${levelId} opening adjacency`).toEqual([]);
    }
  });

  it("keeps shutter coverage and generator centre-mouth contracts valid", () => {
    for (const levelId of COMPETITOR_LATE_BOARD_MASK_REPAIR_LEVEL_IDS) {
      const level = LEVELS[levelId - 1]!;
      expect(() => validateLevel(level), `Lv${levelId}`).not.toThrow();
      expect(() => assertOrdinaryShutterCoverage(level), `Lv${levelId} coverage`).not.toThrow();
      expect(auditOrdinaryShutterCoverage(level).filter(({ kind }) => kind !== "missing-hidden-cohort"), `Lv${levelId} coverage findings`)
        .toEqual([]);
      expect(generatorSpawnAlignmentIssues(level), `Lv${levelId} centre mouth`).toEqual([]);
      expect(finalGeneratorPlacementIssues(level), `Lv${levelId} generator rim`).toEqual([]);
    }
  });

  it("records the three geometry-forced mechanism-coordinate adjustments", () => {
    expect(LEVELS[87]!.generators?.find(({ id }) => id === "vp-088-generator-2")).toMatchObject({
      side: "left",
      offset: 4,
      spawn: [2, 3],
      rimAnchor: { x: 2, y: 4.5, quarterTurns: 3 },
    });
    expect(LEVELS[93]!.shutters?.find(({ id }) => id === "vp-094-cover-4"))
      .toMatchObject({ x: 4, y: 6, width: 3, height: 4, count: 5, skin: "shutter" });
    expect(LEVELS[98]!.shutters?.filter(({ skin }) => skin === "staging").every(({ x, y }) => x === 1 && y === 0))
      .toBe(true);
  });

  it("fresh-solves within 20k states and independently replays every repaired level", () => {
    for (const levelId of COMPETITOR_LATE_BOARD_MASK_REPAIR_LEVEL_IDS) {
      const level = LEVELS[levelId - 1]!;
      const solution = solveLevelForValidation(level, 20_000);
      expect(solution.staticUnsatReasons, `Lv${levelId} static`).toEqual([]);
      expect(solution.unsupportedReasons, `Lv${levelId} unsupported`).toEqual([]);
      expect(solution.solved, `Lv${levelId}: ${solution.termination}/${solution.exploredStates}`).toBe(true);
      expect(solution.exploredStates, `Lv${levelId} state budget`).toBeLessThanOrEqual(20_000);
      expect(replay(level, solution.drags), `Lv${levelId} replay`).toBe(true);
    }
  }, 60_000);
});
