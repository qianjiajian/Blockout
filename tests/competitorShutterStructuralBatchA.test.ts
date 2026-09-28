import { describe, expect, it } from "vitest";

import {
  applyCompetitorShutterStructuralBatchA,
  COMPETITOR_SHUTTER_STRUCTURAL_BATCH_A_BLOCKERS,
  COMPETITOR_SHUTTER_STRUCTURAL_BATCH_A_CERTIFIED_LEVEL_IDS,
  COMPETITOR_SHUTTER_STRUCTURAL_BATCH_A_CONTRACTS,
  COMPETITOR_SHUTTER_STRUCTURAL_BATCH_A_REQUESTED_LEVEL_IDS,
  COMPETITOR_SHUTTER_STRUCTURAL_BATCH_A_USES_STAGING_FALLBACK,
  COMPETITOR_SHUTTER_STRUCTURAL_BATCH_A_VERSION,
} from "../src/core/competitorShutterStructuralBatchA";
import { solveLevelForValidation, type SolverDrag } from "../src/core/levelSolver";
import {
  LEVELS,
  LEVELS_BEFORE_COMPETITOR_SHUTTER_STRUCTURAL_BATCH_A,
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
  const owners = new Map<string, BlockSpec[]>();
  for (const block of opening) for (const [x, y] of cells(block)) {
    const key = `${x},${y}`;
    owners.set(key, [...(owners.get(key) ?? []), block]);
  }
  const pairs = new Set<string>();
  for (const block of opening) for (const [x, y] of cells(block)) {
    for (const [dx, dy] of [[1, 0], [0, 1]] as const) {
      for (const other of owners.get(`${x + dx},${y + dy}`) ?? []) {
        if (other.id === block.id) continue;
        const color = block.layers?.[0] ?? block.color;
        const otherColor = other.layers?.[0] ?? other.color;
        if (color === otherColor) pairs.add([block.id, other.id].sort().join("|"));
      }
    }
  }
  return [...pairs].sort();
};

const shapeName = (block: BlockSpec): "SINGLE" | "H2" | "V2" | "V3" => {
  if (block.shape.length === 1) return "SINGLE";
  const xs = block.shape.map(([x]) => x);
  const ys = block.shape.map(([, y]) => y);
  const width = Math.max(...xs) - Math.min(...xs) + 1;
  const height = Math.max(...ys) - Math.min(...ys) + 1;
  if (block.shape.length === 2 && width === 2) return "H2";
  if (block.shape.length === 2 && height === 2) return "V2";
  if (block.shape.length === 3 && height === 3) return "V3";
  throw new Error(`unexpected Lv34 source shape ${block.id}`);
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
    for (const [x, y] of drag.path) {
      if (!model.moveBlockStep(drag.blockId, x, y)) return false;
    }
    if (drag.exitSide && !model.tryExit(drag.blockId, drag.exitSide).ok) return false;
    if (!model.commitAction()) return false;
  }
  return model.snapshot().complete;
};

const currentLv34 = (): LevelSpec => {
  const level = LEVELS_BEFORE_COMPETITOR_SHUTTER_STRUCTURAL_BATCH_A.find(({ id }) => id === 34);
  if (!level) throw new Error("missing Lv34");
  return level;
};

describe(`competitor shutter structural batch A ${COMPETITOR_SHUTTER_STRUCTURAL_BATCH_A_VERSION}`, () => {
  it("keeps the certified and blocked sets explicit, disjoint and exhaustive", () => {
    expect(COMPETITOR_SHUTTER_STRUCTURAL_BATCH_A_REQUESTED_LEVEL_IDS).toEqual([29, 34, 38, 39, 41]);
    expect(COMPETITOR_SHUTTER_STRUCTURAL_BATCH_A_CERTIFIED_LEVEL_IDS).toEqual([34]);
    expect(COMPETITOR_SHUTTER_STRUCTURAL_BATCH_A_BLOCKERS.map(({ levelId }) => levelId))
      .toEqual([29, 38, 39, 41]);
    expect(COMPETITOR_SHUTTER_STRUCTURAL_BATCH_A_USES_STAGING_FALLBACK).toBe(false);
    const resolved = new Set<number>([
      ...COMPETITOR_SHUTTER_STRUCTURAL_BATCH_A_CERTIFIED_LEVEL_IDS,
      ...COMPETITOR_SHUTTER_STRUCTURAL_BATCH_A_BLOCKERS.map(({ levelId }) => levelId),
    ]);
    expect([...resolved].sort((a, b) => a - b)).toEqual([...COMPETITOR_SHUTTER_STRUCTURAL_BATCH_A_REQUESTED_LEVEL_IDS]);
  });

  it("restores the source Lv34 panel rectangles, counters and direct cohorts without staging", () => {
    const level = applyCompetitorShutterStructuralBatchA(currentLv34());
    const contract = COMPETITOR_SHUTTER_STRUCTURAL_BATCH_A_CONTRACTS[0];
    expect(level.shutters).toEqual(contract.panels.map(({ directBlockIds: _ids, ...panel }) => ({
      ...panel,
      skin: "shutter",
    })));
    expect(level.shutters?.every(({ skin }) => skin !== "staging")).toBe(true);
    for (const panel of contract.panels) {
      expect(level.blocks.filter(({ shutterId }) => shutterId === panel.id).map(({ id }) => id).sort())
        .toEqual([...panel.directBlockIds].sort());
    }
    expect(level.blocks.every(({ shutterId }) => !shutterId?.includes("stage"))).toBe(true);
    expect(auditOrdinaryShutterCoverage(level)).toEqual([]);
  });

  it("matches Lv34 opening/full composition and the real exit counter contract", () => {
    const level = applyCompetitorShutterStructuralBatchA(currentLv34());
    const opening = openingBlocks(level);
    const allColors = new Set(level.blocks.flatMap((block) => block.layers ?? [block.color]));
    expect(opening).toHaveLength(17);
    expect(level.blocks).toHaveLength(30);
    expect(histogram(opening)).toEqual({ SINGLE: 13, H2: 1, V2: 3 });
    expect(histogram(level.blocks)).toEqual({ SINGLE: 13, H2: 1, V2: 3, V3: 13 });
    expect(new Set(opening.map((block) => block.layers?.[0] ?? block.color)).size).toBe(3);
    expect(allColors.size).toBe(6);
    expect(level.blocks.filter(({ layers }) => layers?.length === 2)).toHaveLength(7);
    expect(level.gates.filter(({ frozen }) => frozen === undefined)).toHaveLength(1);
    expect(level.gates.flatMap(({ frozen }) => frozen === undefined ? [] : [frozen]).sort((a, b) => a - b))
      .toEqual([7, 13, 14, 22, 22]);
    expect(adjacentSameColorPairs(level)).toEqual([]);
  });

  it("validates and replays a fresh <=30k-state Lv34 completion", () => {
    const level = applyCompetitorShutterStructuralBatchA(currentLv34());
    expect(validateLevel(level)).toBeUndefined();
    const solution = solveLevelForValidation(level, 30_000);
    expect(solution.solved, JSON.stringify(solution.staticUnsatReasons)).toBe(true);
    expect(solution.exploredStates).toBeLessThanOrEqual(30_000);
    expect(solution.exploredStates).toBe(311);
    expect(solution.drags).toHaveLength(45);
    expect(replay(level, solution.drags)).toBe(true);
  }, 60_000);

  it("is idempotent for Lv34 and leaves every blocked/unrelated level untouched", () => {
    const once = applyCompetitorShutterStructuralBatchA(currentLv34());
    expect(LEVELS.find(({ id }) => id === 34)).toEqual(once);
    expect(applyCompetitorShutterStructuralBatchA(once)).toEqual(once);
    for (const levelId of [29, 38, 39, 41, 1]) {
      const source = { ...currentLv34(), id: levelId };
      expect(applyCompetitorShutterStructuralBatchA(source)).toBe(source);
    }
    for (const blocker of COMPETITOR_SHUTTER_STRUCTURAL_BATCH_A_BLOCKERS) {
      expect(blocker.kinds.length).toBeGreaterThan(0);
      expect(blocker.reason.length).toBeGreaterThan(80);
      expect(blocker.evidence.length).toBeGreaterThan(0);
    }
  });
});
