// @ts-expect-error The app tsconfig excludes Node ambient types; Vitest runs in Node.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  applyCompetitorLateStructuralBatchM,
  COMPETITOR_LATE_STRUCTURAL_BATCH_M_BLOCKERS,
  COMPETITOR_LATE_STRUCTURAL_BATCH_M_CERTIFIED_LEVEL_IDS,
  COMPETITOR_LATE_STRUCTURAL_BATCH_M_LV192_NUMERIC_ICE,
  COMPETITOR_LATE_STRUCTURAL_BATCH_M_LV200_COLORED_GRID,
  COMPETITOR_LATE_STRUCTURAL_BATCH_M_REQUESTED_LEVEL_IDS,
  COMPETITOR_LATE_STRUCTURAL_BATCH_M_USES_STAGING_FALLBACK,
  COMPETITOR_LATE_STRUCTURAL_BATCH_M_VERSION,
} from "../src/core/competitorLateStructuralBatchM";
import {
  compareCompetitorMechanismCountContract,
  extractCompetitorMechanismCountContracts,
  extractRuntimeMechanismCountFacts,
} from "../src/core/competitorMechanismCountContract";
import {
  LEVELS,
  LEVELS_BEFORE_COMPETITOR_LATE_STRUCTURAL_BATCH_M,
} from "../src/core/levels";
import { solveLevelForValidation, type SolverDrag } from "../src/core/levelSolver";
import { openingVisibleBlockIds } from "../src/core/openingBlockCountRepairs";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import type { BlockSpec, LevelSpec, Point } from "../src/core/types";

interface TruthLevel {
  level: number;
  mechanisms: {
    numeric_ice: { shape: string; value: number; stage: string; x: number | null; y: number | null }[];
    colored_grid: { color: string; cells: Point[]; count: number }[];
  };
}

const truth = JSON.parse(readFileSync(new URL(
  "../deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-truth-v1.json",
  import.meta.url,
), "utf8")) as { levels: TruthLevel[] };
const contracts = extractCompetitorMechanismCountContracts(truth);
const contract = (levelId: number) => contracts.find((candidate) => candidate.levelId === levelId)!;
const truthLevel = (levelId: number) => truth.levels.find(({ level }) => level === levelId)!;
const source = (levelId: number): LevelSpec => (
  LEVELS_BEFORE_COMPETITOR_LATE_STRUCTURAL_BATCH_M[levelId - 1]!
);
const candidate = (levelId: number): LevelSpec => applyCompetitorLateStructuralBatchM(source(levelId));

const replay = (level: LevelSpec, drags: readonly SolverDrag[]): boolean => {
  const model = new PuzzleModel(level);
  model.start();
  model.startCountdown();
  for (const drag of drags) {
    if (!model.getBlock(drag.blockId)) return false;
    model.beginAction();
    for (const [x, y] of drag.path) {
      const block = model.getBlock(drag.blockId);
      if (!block) return false;
      const moved = Math.abs(block.x - x) + Math.abs(block.y - y) === 1
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

const outer = (block: BlockSpec): string => block.layers?.[0] ?? block.color;
const adjacencyIssues = (level: LevelSpec): string[] => {
  const visible = new Set(openingVisibleBlockIds(level));
  const occupied = new Map<string, BlockSpec>();
  for (const block of level.blocks.filter(({ id }) => visible.has(id))) for (const [dx, dy] of block.shape) {
    occupied.set(`${block.x + dx},${block.y + dy}`, block);
  }
  const issues = new Set<string>();
  for (const [cell, block] of occupied) {
    const [x, y] = cell.split(",").map(Number);
    for (const [dx, dy] of [[1, 0], [0, 1]] as Point[]) {
      const other = occupied.get(`${x! + dx},${y! + dy}`);
      if (other && other.id !== block.id && outer(other) === outer(block)) {
        issues.add([block.id, other.id].sort().join("/"));
      }
    }
  }
  return [...issues].sort();
};

const withoutFrozen = ({ frozen: _frozen, ...block }: BlockSpec) => block;

describe(`competitor late structural batch M ${COMPETITOR_LATE_STRUCTURAL_BATCH_M_VERSION}`, () => {
  it("publishes only the source-complete Lv192 attribute repair and keeps every residual gap explicit", () => {
    expect(COMPETITOR_LATE_STRUCTURAL_BATCH_M_REQUESTED_LEVEL_IDS)
      .toEqual([192, 194, 195, 197, 198, 199, 200]);
    expect(COMPETITOR_LATE_STRUCTURAL_BATCH_M_CERTIFIED_LEVEL_IDS).toEqual([192]);
    expect(COMPETITOR_LATE_STRUCTURAL_BATCH_M_USES_STAGING_FALLBACK).toBe(false);
    expect(COMPETITOR_LATE_STRUCTURAL_BATCH_M_BLOCKERS.map(({ levelId }) => levelId))
      .toEqual([192, 194, 195, 197, 198, 199, 200]);
    expect(COMPETITOR_LATE_STRUCTURAL_BATCH_M_BLOCKERS.every(({ evidence, reason }) => (
      evidence.length >= 4 && reason.length >= 180
    ))).toBe(true);
    for (const levelId of [194, 195, 197, 198, 199, 200]) {
      expect(applyCompetitorLateStructuralBatchM(source(levelId))).toBe(source(levelId));
    }
  });

  it("rebinds Lv192 ice-2 only to the two opening SINGLE carriers recorded by truth", () => {
    expect(truthLevel(192).mechanisms.numeric_ice).toEqual([
      { shape: "single", value: 2, stage: "opening", x: null, y: null },
      { shape: "single", value: 2, stage: "opening", x: null, y: null },
    ]);
    const repaired = candidate(192);
    const visible = new Set(openingVisibleBlockIds(repaired));
    expect(repaired.blocks.filter(({ frozen }) => frozen !== undefined).map(({ id, shape, frozen }) => ({
      id, shape, frozen,
    }))).toEqual(Object.entries(COMPETITOR_LATE_STRUCTURAL_BATCH_M_LV192_NUMERIC_ICE)
      .map(([id, { shape, value }]) => ({ id, shape: [...shape], frozen: value })));
    expect(Object.keys(COMPETITOR_LATE_STRUCTURAL_BATCH_M_LV192_NUMERIC_ICE)
      .every((id) => visible.has(id))).toBe(true);
  });

  it("changes only frozen attributes and preserves geometry, exits, cover, locks, portals and seams", () => {
    const before = source(192);
    const after = candidate(192);
    expect(after.blocks.map(withoutFrozen)).toEqual(before.blocks.map(withoutFrozen));
    expect({ ...after, blocks: undefined }).toEqual({ ...before, blocks: undefined });
    expect(extractRuntimeMechanismCountFacts(after)).toEqual(extractRuntimeMechanismCountFacts(before));
    expect(compareCompetitorMechanismCountContract(after, contract(192)).issues)
      .toEqual(compareCompetitorMechanismCountContract(before, contract(192)).issues);
    expect(applyCompetitorLateStructuralBatchM(after)).toBe(after);
    expect(LEVELS[191]).toEqual(after);
  });

  it("keeps Lv192 valid and opening-adjacency clean", () => {
    const level = candidate(192);
    expect(() => validateLevel(level)).not.toThrow();
    expect(adjacencyIssues(level)).toEqual([]);
  });

  it("fresh-solves Lv192 and independently replays the route", () => {
    const level = candidate(192);
    const solution = solveLevelForValidation(level, 20_000);
    expect(solution.staticUnsatReasons).toEqual([]);
    expect(solution.unsupportedReasons).toEqual([]);
    expect(solution.solved, `${solution.termination}/${solution.exploredStates}`).toBe(true);
    expect(solution.exploredStates).toBe(24);
    expect(solution.drags).toHaveLength(23);
    expect(replay(level, solution.drags)).toBe(true);
  }, 60_000);

  it("binds the already-supported Lv200 coloured grid exactly without claiming unresolved exits", () => {
    const sourceGrid = truthLevel(200).mechanisms.colored_grid[0]!;
    expect(sourceGrid).toMatchObject({ color: "red", count: 12 });
    expect(sourceGrid.cells).toEqual(COMPETITOR_LATE_STRUCTURAL_BATCH_M_LV200_COLORED_GRID.cells);
    expect(source(200).coloredGrids).toEqual([COMPETITOR_LATE_STRUCTURAL_BATCH_M_LV200_COLORED_GRID]);
    expect(extractRuntimeMechanismCountFacts(source(200)).coloredGridCellCount).toBe(12);
    expect(adjacencyIssues(source(200))).toEqual([]);
    expect(() => validateLevel(source(200))).not.toThrow();
  });
});
