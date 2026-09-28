import { describe, expect, it } from "vitest";

import {
  applyCompetitorHardBoardMaskRepair,
  COMPETITOR_HARD_BOARD_MASK_REPAIR_LEVEL_IDS,
  COMPETITOR_HARD_BOARD_MASK_REPAIR_VERSION,
} from "../src/core/competitorHardBoardMaskRepairs";
import { finalGeneratorPlacementIssues } from "../src/core/finalGeneratorContracts";
import { generatorSpawnAlignmentIssues } from "../src/core/generatorSpawnAlignmentRepairs";
import { solveLevelForValidation, type SolverDrag } from "../src/core/levelSolver";
import {
  LEVELS,
  LEVELS_BEFORE_COMPETITOR_HARD_BOARD_MASK_REPAIR,
} from "../src/core/levels";
import { openingVisibleBlockIds } from "../src/core/openingBlockCountRepairs";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import { auditOrdinaryShutterCoverage } from "../src/core/shutterCoverage";
import { shutterHasPhysicalFootprint, type BlockSpec, type LevelSpec, type Point } from "../src/core/types";
import { VIDEO_PARITY_LEVELS } from "../src/core/videoParityLevels.generated";

const EXPECTED_MASKS = new Map<number, readonly string[]>([
  [68, [
    "#######", "#######", "#######", "#######", ".......",
    ".......", "#######", "#######", "#######", "#######",
  ]],
  [87, [
    "#######", "#######", ".#####.", ".#####.", ".#####.",
    ".#####.", ".#####.", "#######", "#######",
  ]],
]);

const without = <T extends object>(value: T, fields: readonly string[]): Partial<T> => (
  Object.fromEntries(Object.entries(value).filter(([name]) => !fields.includes(name))) as Partial<T>
);
const key = (x: number, y: number): string => `${x},${y}`;
const maskRows = (level: LevelSpec): string[] => {
  const playable = new Set((level.playable ?? []).map(([x, y]) => key(x, y)));
  return Array.from({ length: level.height }, (_, y) => (
    Array.from({ length: level.width }, (__, x) => playable.has(key(x, y)) ? "#" : ".").join("")
  ));
};
const cellsOf = (block: BlockSpec): Point[] => (
  block.shape.map(([dx, dy]) => [block.x + dx, block.y + dy])
);

const openingAdjacencyIssues = (level: LevelSpec): string[] => {
  const visible = new Set(openingVisibleBlockIds(level));
  const occupied = new Map<string, BlockSpec>();
  for (const block of level.blocks.filter(({ id }) => visible.has(id))) {
    for (const [x, y] of cellsOf(block)) occupied.set(key(x, y), block);
  }
  const issues = new Set<string>();
  for (const block of level.blocks.filter(({ id }) => visible.has(id))) {
    for (const [x, y] of cellsOf(block)) {
      for (const [dx, dy] of [[1, 0], [0, 1]] as const) {
        const other = occupied.get(key(x + dx, y + dy));
        if (other && other.id !== block.id
          && (other.layers?.[0] ?? other.color) === (block.layers?.[0] ?? block.color)) {
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
      if (!(distance === 1
        ? model.moveBlockStep(drag.blockId, x, y)
        : model.moveBlock(drag.blockId, x, y))) return false;
    }
    if (drag.exitSide && !model.tryExit(drag.blockId, drag.exitSide).ok) return false;
    if (!model.commitAction()) return false;
  }
  const snapshot = model.snapshot();
  return snapshot.complete && snapshot.blocks.length === 0 && snapshot.queuedBlocks.length === 0;
};

describe(`competitor hard board masks ${COMPETITOR_HARD_BOARD_MASK_REPAIR_VERSION}`, () => {
  it("changes only Lv68/Lv87 at the final pipeline stage and is idempotent", () => {
    expect(COMPETITOR_HARD_BOARD_MASK_REPAIR_LEVEL_IDS).toEqual([68, 87]);
    for (const before of LEVELS_BEFORE_COMPETITOR_HARD_BOARD_MASK_REPAIR) {
      const after = applyCompetitorHardBoardMaskRepair(before);
      const affected = (COMPETITOR_HARD_BOARD_MASK_REPAIR_LEVEL_IDS as readonly number[]).includes(before.id);
      expect(after === before, `Lv${before.id}`).toBe(!affected);
      if (!affected) continue;
      expect(after, `Lv${before.id} final composition`).toEqual(LEVELS[before.id - 1]);
      expect(applyCompetitorHardBoardMaskRepair(after), `Lv${before.id} idempotence`).toBe(after);
    }
  });

  it("matches every exact competitor mask cell without internal blocked cells", () => {
    for (const [levelId, expected] of EXPECTED_MASKS) {
      const level = LEVELS[levelId - 1]!;
      expect(level).toMatchObject({ width: expected[0]!.length, height: expected.length });
      expect(maskRows(level), `Lv${levelId}`).toEqual(expected);
      expect(level.blocked, `Lv${levelId}`).toBeUndefined();
    }
  });

  it("preserves immutable block payloads and competitor mechanism counts", () => {
    for (const levelId of COMPETITOR_HARD_BOARD_MASK_REPAIR_LEVEL_IDS) {
      const before = LEVELS_BEFORE_COMPETITOR_HARD_BOARD_MASK_REPAIR[levelId - 1]!;
      const after = LEVELS[levelId - 1]!;
      const raw = VIDEO_PARITY_LEVELS[levelId - 1]!;
      expect(after.blocks.map((block) => without(block, ["x", "y", "shutterId"])), `Lv${levelId} blocks`)
        .toEqual(before.blocks.map((block) => without(block, ["x", "y", "shutterId"])));
      expect(after.gates, `Lv${levelId} competitor exit count`).toHaveLength(raw.gates.length);
      expect((after.shutters ?? []).filter(shutterHasPhysicalFootprint), `Lv${levelId} shutters`)
        .toHaveLength((raw.shutters ?? []).filter(shutterHasPhysicalFootprint).length);
      expect(after.generators ?? [], `Lv${levelId} generators`)
        .toHaveLength((raw.generators ?? []).length);
      expect(after.flipDoors).toEqual(before.flipDoors);
      expect(after.coloredGrids).toEqual(before.coloredGrids);
      expect(after.conveyors).toEqual(before.conveyors);
      expect(after.elevators).toEqual(before.elevators);
    }
    expect(openingVisibleBlockIds(LEVELS[67]!)).toHaveLength(10);
    expect(LEVELS[67]!.blocks.slice(10).every(({ shutterId }) => shutterId === "vp-068-cover-1")).toBe(true);
    expect(LEVELS[67]!.gates.map(({ color }) => color).sort()).toEqual(
      ["blue", "blue", "orange", "orange", "pink", "pink", "red", "red", "yellow", "yellow"],
    );
    expect(openingVisibleBlockIds(LEVELS[86]!)).toHaveLength(18);
    expect(LEVELS[86]!.generators?.map((generator) => (
      without(generator, ["side", "offset", "spawn", "rimAnchor"])
    ))).toEqual(LEVELS_BEFORE_COMPETITOR_HARD_BOARD_MASK_REPAIR[86]!.generators?.map((generator) => (
      without(generator, ["side", "offset", "spawn", "rimAnchor"])
    )));
  });

  it("passes validation, adjacency, shutter coverage and generator contracts", () => {
    for (const levelId of COMPETITOR_HARD_BOARD_MASK_REPAIR_LEVEL_IDS) {
      const level = LEVELS[levelId - 1]!;
      expect(() => validateLevel(level), `Lv${levelId}`).not.toThrow();
      expect(openingAdjacencyIssues(level), `Lv${levelId} opening adjacency`).toEqual([]);
      expect(auditOrdinaryShutterCoverage(level), `Lv${levelId} shutter coverage`).toEqual([]);
      expect(generatorSpawnAlignmentIssues(level), `Lv${levelId} centre mouth`).toEqual([]);
      expect(finalGeneratorPlacementIssues(level), `Lv${levelId} generator rim`).toEqual([]);
    }
  });

  it("fresh-solves within 20k states and independently replays both levels", () => {
    for (const levelId of COMPETITOR_HARD_BOARD_MASK_REPAIR_LEVEL_IDS) {
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
