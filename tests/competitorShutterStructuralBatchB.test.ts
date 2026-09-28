import { describe, expect, it } from "vitest";

import {
  applyCompetitorShutterStructuralBatchB,
  COMPETITOR_SHUTTER_STRUCTURAL_BATCH_B_BLOCKERS,
  COMPETITOR_SHUTTER_STRUCTURAL_BATCH_B_CERTIFIED_LEVEL_IDS,
  COMPETITOR_SHUTTER_STRUCTURAL_BATCH_B_CONTRACTS,
  COMPETITOR_SHUTTER_STRUCTURAL_BATCH_B_REQUESTED_LEVEL_IDS,
  COMPETITOR_SHUTTER_STRUCTURAL_BATCH_B_USES_STAGING_FALLBACK,
  COMPETITOR_SHUTTER_STRUCTURAL_BATCH_B_VERSION,
} from "../src/core/competitorShutterStructuralBatchB";
import { solveLevelForValidation, type SolverDrag } from "../src/core/levelSolver";
import {
  LEVELS,
  LEVELS_BEFORE_COMPETITOR_SHUTTER_STRUCTURAL_BATCH_B,
} from "../src/core/levels";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import { auditOrdinaryShutterCoverage } from "../src/core/shutterCoverage";
import type { BlockSpec, LevelSpec } from "../src/core/types";

const cells = (block: BlockSpec): Array<readonly [number, number]> => (
  block.shape.map(([dx, dy]) => [block.x + dx, block.y + dy] as const)
);

const openingBlocks = (level: LevelSpec): BlockSpec[] => {
  const queued = new Set((level.generators ?? []).flatMap(({ queueBlockIds }) => queueBlockIds));
  const closed = new Set((level.shutters ?? []).filter(({ count }) => count > 0).map(({ id }) => id));
  return level.blocks.filter((block) => !queued.has(block.id)
    && !(block.shutterId && closed.has(block.shutterId)));
};

const adjacentSameColorPairs = (level: LevelSpec): string[] => {
  const opening = openingBlocks(level);
  const owners = new Map<string, BlockSpec>();
  for (const block of opening) for (const [x, y] of cells(block)) owners.set(`${x},${y}`, block);
  const pairs = new Set<string>();
  for (const block of opening) for (const [x, y] of cells(block)) {
    for (const [dx, dy] of [[1, 0], [0, 1]] as const) {
      const other = owners.get(`${x + dx},${y + dy}`);
      if (!other || other.id === block.id) continue;
      if ((block.layers?.[0] ?? block.color) === (other.layers?.[0] ?? other.color)) {
        pairs.add([block.id, other.id].sort().join("|"));
      }
    }
  }
  return [...pairs].sort();
};

const shapeName = (block: BlockSpec): "SINGLE" | "H2" | "V2" | "H3" | "V3" | "L3" => {
  if (block.shape.length === 1) return "SINGLE";
  const xs = block.shape.map(([x]) => x);
  const ys = block.shape.map(([, y]) => y);
  const width = Math.max(...xs) - Math.min(...xs) + 1;
  const height = Math.max(...ys) - Math.min(...ys) + 1;
  if (block.shape.length === 2 && width === 2) return "H2";
  if (block.shape.length === 2 && height === 2) return "V2";
  if (block.shape.length === 3 && width === 3 && height === 1) return "H3";
  if (block.shape.length === 3 && width === 1 && height === 3) return "V3";
  if (block.shape.length === 3 && width === 2 && height === 2) return "L3";
  throw new Error(`unexpected Lv91 source shape ${block.id}`);
};

const histogram = (blocks: readonly BlockSpec[]): Record<string, number> => {
  const result: Record<string, number> = {};
  for (const block of blocks) result[shapeName(block)] = (result[shapeName(block)] ?? 0) + 1;
  return result;
};

const replay = (level: LevelSpec, drags: readonly SolverDrag[]): boolean => {
  const model = new PuzzleModel(level);
  for (const drag of drags) {
    model.beginAction();
    for (const [x, y] of drag.path) if (!model.moveBlockStep(drag.blockId, x, y)) return false;
    if (drag.exitSide && !model.tryExit(drag.blockId, drag.exitSide).ok) return false;
    if (!model.commitAction()) return false;
  }
  return model.snapshot().complete;
};

const currentLv91 = (): LevelSpec => {
  const level = LEVELS_BEFORE_COMPETITOR_SHUTTER_STRUCTURAL_BATCH_B.find(({ id }) => id === 91);
  if (!level) throw new Error("missing Lv91");
  return level;
};

describe(`competitor shutter structural batch B ${COMPETITOR_SHUTTER_STRUCTURAL_BATCH_B_VERSION}`, () => {
  it("keeps the certified and blocked sets explicit, disjoint and exhaustive", () => {
    expect(COMPETITOR_SHUTTER_STRUCTURAL_BATCH_B_REQUESTED_LEVEL_IDS).toEqual([44, 49, 59, 62, 64, 67, 91]);
    expect(COMPETITOR_SHUTTER_STRUCTURAL_BATCH_B_CERTIFIED_LEVEL_IDS).toEqual([91]);
    expect(COMPETITOR_SHUTTER_STRUCTURAL_BATCH_B_BLOCKERS.map(({ levelId }) => levelId))
      .toEqual([44, 49, 59, 62, 64, 67]);
    expect(COMPETITOR_SHUTTER_STRUCTURAL_BATCH_B_USES_STAGING_FALLBACK).toBe(false);
    const resolved = new Set<number>([
      ...COMPETITOR_SHUTTER_STRUCTURAL_BATCH_B_CERTIFIED_LEVEL_IDS,
      ...COMPETITOR_SHUTTER_STRUCTURAL_BATCH_B_BLOCKERS.map(({ levelId }) => levelId),
    ]);
    expect([...resolved].sort((a, b) => a - b))
      .toEqual([...COMPETITOR_SHUTTER_STRUCTURAL_BATCH_B_REQUESTED_LEVEL_IDS]);
  });

  it("restores the two source Lv91 rectangles, counters and exact five-piece direct cohorts", () => {
    const level = applyCompetitorShutterStructuralBatchB(currentLv91());
    const contract = COMPETITOR_SHUTTER_STRUCTURAL_BATCH_B_CONTRACTS[0];
    expect(level.shutters).toEqual(contract.panels.map(({ directBlockIds: _ids, sourceFootprintCells: _footprint, directOccupiedCells: _occupied, ...panel }) => ({
      ...panel,
      skin: "shutter",
    })));
    expect(level.shutters?.every(({ skin }) => skin !== "staging")).toBe(true);
    expect(level.blocks.every(({ shutterId }) => !shutterId?.includes("stage"))).toBe(true);
    for (const panel of contract.panels) {
      const direct = level.blocks.filter(({ shutterId }) => shutterId === panel.id);
      expect(direct.map(({ id }) => id).sort()).toEqual([...panel.directBlockIds].sort());
      expect(direct).toHaveLength(5);
      expect(direct.flatMap(cells)).toHaveLength(panel.directOccupiedCells);
      expect(panel.width * panel.height).toBe(panel.sourceFootprintCells);
    }
    expect(auditOrdinaryShutterCoverage(level)).toEqual([]);
  });

  it("preserves shapes, colours, exits and unrelated mechanics while restoring opening composition", () => {
    const source = currentLv91();
    const level = applyCompetitorShutterStructuralBatchB(source);
    const contract = COMPETITOR_SHUTTER_STRUCTURAL_BATCH_B_CONTRACTS[0];
    for (const sourceBlock of source.blocks) {
      const block = level.blocks.find(({ id }) => id === sourceBlock.id)!;
      const { x: _sx, y: _sy, shutterId: _ss, ...sourceRest } = sourceBlock;
      const { x: _x, y: _y, shutterId: _s, ...rest } = block;
      expect(rest).toEqual(sourceRest);
    }
    expect(level.gates).toEqual(source.gates);
    expect(level.generators).toEqual(source.generators);
    expect(level.elevators).toEqual(source.elevators);
    expect(level.conveyors).toEqual(source.conveyors);
    const opening = openingBlocks(level);
    expect(opening).toHaveLength(contract.openingPieceCount);
    expect(level.blocks).toHaveLength(contract.fullPieceCount);
    expect(opening.flatMap(cells)).toHaveLength(contract.openingOccupiedCellCount);
    expect(level.blocks.flatMap(cells)).toHaveLength(contract.fullOccupiedCellCount);
    expect(histogram(opening)).toEqual(contract.openingShapeHistogram);
    expect(histogram(level.blocks)).toEqual(contract.fullShapeHistogram);
    expect(adjacentSameColorPairs(level)).toEqual([]);
  });

  it("validates and replays a fresh <=30k-state Lv91 completion", () => {
    const level = applyCompetitorShutterStructuralBatchB(currentLv91());
    const contract = COMPETITOR_SHUTTER_STRUCTURAL_BATCH_B_CONTRACTS[0];
    expect(validateLevel(level)).toBeUndefined();
    const solution = solveLevelForValidation(level, contract.freshSolverMaxStates);
    expect(solution.solved, JSON.stringify(solution.staticUnsatReasons)).toBe(true);
    expect(solution.exploredStates).toBeLessThanOrEqual(contract.freshSolverMaxStates);
    expect(solution.exploredStates).toBe(contract.certifiedExploredStates);
    expect(solution.drags).toHaveLength(contract.certifiedDragCount);
    expect(replay(level, solution.drags)).toBe(true);
  }, 60_000);

  it("is idempotent and leaves every blocked or unrelated level untouched", () => {
    const once = applyCompetitorShutterStructuralBatchB(currentLv91());
    expect(LEVELS.find(({ id }) => id === 91)).toEqual(once);
    expect(applyCompetitorShutterStructuralBatchB(once)).toEqual(once);
    for (const levelId of [44, 49, 59, 62, 64, 67, 1]) {
      const source = { ...currentLv91(), id: levelId };
      expect(applyCompetitorShutterStructuralBatchB(source)).toBe(source);
    }
    for (const blocker of COMPETITOR_SHUTTER_STRUCTURAL_BATCH_B_BLOCKERS) {
      expect(blocker.kinds.length).toBeGreaterThan(0);
      expect(blocker.reason.length).toBeGreaterThan(120);
      expect(blocker.evidence.length).toBeGreaterThan(1);
    }
  });
});
