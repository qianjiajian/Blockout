// @ts-expect-error The app tsconfig excludes Node ambient types; Vitest runs in Node.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  applyCompetitorNumericIceStructuralBatchA,
  COMPETITOR_NUMERIC_ICE_STRUCTURAL_BATCH_A_BLOCKERS,
  COMPETITOR_NUMERIC_ICE_STRUCTURAL_BATCH_A_COMPOSITION_LIMITATIONS,
  COMPETITOR_NUMERIC_ICE_STRUCTURAL_BATCH_A_LEVEL_IDS,
  COMPETITOR_NUMERIC_ICE_STRUCTURAL_BATCH_A_VERSION,
} from "../src/core/competitorNumericIceStructuralBatchA";
import {
  compareCompetitorMechanismCountContract,
  extractCompetitorMechanismCountContracts,
  extractRuntimeMechanismCountFacts,
} from "../src/core/competitorMechanismCountContract";
import { solveLevelForValidation, type SolverDrag } from "../src/core/levelSolver";
import {
  LEVELS,
  LEVELS_BEFORE_COMPETITOR_NUMERIC_ICE_STRUCTURAL_BATCH_A,
} from "../src/core/levels";
import { openingVisibleBlockIds } from "../src/core/openingBlockCountRepairs";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import type { BlockSpec, LevelSpec } from "../src/core/types";

const truth = JSON.parse(readFileSync(new URL(
  "../deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json",
  import.meta.url,
), "utf8").replace(/^\uFEFF/, ""));
const contractById = new Map(extractCompetitorMechanismCountContracts(truth)
  .map((contract) => [contract.levelId, contract] as const));

const source = (levelId: number): LevelSpec => (
  LEVELS_BEFORE_COMPETITOR_NUMERIC_ICE_STRUCTURAL_BATCH_A[levelId - 1]!
);
const repaired = (levelId: number): LevelSpec => applyCompetitorNumericIceStructuralBatchA(source(levelId));
const outerColor = (block: BlockSpec): string => block.layers?.[0] ?? block.color;

const adjacencyIssues = (level: LevelSpec): string[] => {
  const queuedIds = new Set((level.generators ?? []).flatMap(({ queueBlockIds }) => queueBlockIds));
  const closedShutterIds = new Set((level.shutters ?? [])
    .filter(({ count }) => count > 0)
    .map(({ id }) => id));
  const occupied = new Map<string, BlockSpec>();
  for (const block of level.blocks.filter(({ id, shutterId }) => (
    !queuedIds.has(id) && !(shutterId && closedShutterIds.has(shutterId))
  ))) for (const [dx, dy] of block.shape) {
    occupied.set(`${block.x + dx},${block.y + dy}`, block);
  }
  const issues = new Set<string>();
  for (const [key, block] of occupied) {
    const [x, y] = key.split(",").map(Number) as [number, number];
    for (const [stepX, stepY] of [[1, 0], [0, 1]] as const) {
      const other = occupied.get(`${x + stepX},${y + stepY}`);
      if (other && other.id !== block.id && outerColor(other) === outerColor(block)) {
        issues.add([block.id, other.id].sort().join("|"));
      }
    }
  }
  return [...issues].sort();
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

const shapeCounts = (level: LevelSpec): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const block of level.blocks) {
    const key = block.shape.length === 1
      ? "SINGLE"
      : JSON.stringify(block.shape) === JSON.stringify([[0, 0], [1, 0], [2, 0]])
        ? "H3"
        : JSON.stringify(block.shape) === JSON.stringify([[0, 0], [0, 1]])
          ? "V2"
          : `cells-${block.shape.length}`;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
};

describe(`competitor numeric-ice structural batch A ${COMPETITOR_NUMERIC_ICE_STRUCTURAL_BATCH_A_VERSION}`, () => {
  it("keeps the certified subset, composition limitation, and rejected candidates explicit", () => {
    expect(COMPETITOR_NUMERIC_ICE_STRUCTURAL_BATCH_A_LEVEL_IDS).toEqual([11, 54]);
    expect(COMPETITOR_NUMERIC_ICE_STRUCTURAL_BATCH_A_BLOCKERS.map(({ levelId }) => levelId)).toEqual([17, 19]);
    expect(COMPETITOR_NUMERIC_ICE_STRUCTURAL_BATCH_A_BLOCKERS.every(({ detail }) => detail.length > 120)).toBe(true);
    expect(COMPETITOR_NUMERIC_ICE_STRUCTURAL_BATCH_A_COMPOSITION_LIMITATIONS[54]).toContain("10/25");
  });

  it("is isolated and reference-idempotent", () => {
    expect(applyCompetitorNumericIceStructuralBatchA(source(10))).toBe(source(10));
    expect(applyCompetitorNumericIceStructuralBatchA(source(17))).toBe(source(17));
    for (const levelId of COMPETITOR_NUMERIC_ICE_STRUCTURAL_BATCH_A_LEVEL_IDS) {
      const level = repaired(levelId);
      expect(level).not.toBe(source(levelId));
      expect(applyCompetitorNumericIceStructuralBatchA(level)).toBe(level);
      expect(LEVELS[levelId - 1]).toEqual(level);
    }
  });

  it("reconstructs the frame-recorded Lv11 3x4 checker and seven H3 ice carriers", () => {
    const level = repaired(11);
    expect(level).toMatchObject({ id: 11, width: 6, height: 7 });
    expect(level.blocks).toHaveLength(22);
    expect(openingVisibleBlockIds(level)).toHaveLength(22);
    expect(shapeCounts(level)).toEqual({ H3: 10, SINGLE: 12 });
    expect(level.blocks.filter(({ frozen }) => frozen !== undefined)
      .map(({ frozen }) => frozen).sort((left, right) => left! - right!))
      .toEqual([13, 14, 15, 16, 17, 17, 17]);
    expect(level.blocks.filter(({ frozen }) => frozen !== undefined)
      .every(({ shape }) => JSON.stringify(shape) === JSON.stringify([[0, 0], [1, 0], [2, 0]])))
      .toBe(true);
    expect(level.gates.map(({ side, offset, size, frozen }) => [side, offset, size, frozen ?? null]))
      .toEqual([
        ["top", 3, 3, null],
        ["left", 1, 1, 13],
        ["left", 2, 1, 6],
        ["left", 3, 1, 7],
        ["left", 5, 1, null],
      ]);
    expect(compareCompetitorMechanismCountContract(level, contractById.get(11)!).issues).toEqual([]);
    expect(adjacencyIssues(level)).toEqual([]);
    expect(() => validateLevel(level)).not.toThrow();
  });

  it("restores Lv54 [2,3,3] only on the three V2 source carriers", () => {
    const before = source(54);
    const level = repaired(54);
    expect(level.blocks).toHaveLength(24);
    expect(openingVisibleBlockIds(level)).toHaveLength(9);
    expect(level.blocks.filter(({ frozen }) => frozen !== undefined)
      .map(({ frozen }) => frozen).sort((left, right) => left! - right!))
      .toEqual([2, 3, 3]);
    expect(level.blocks.filter(({ frozen }) => frozen !== undefined)
      .every(({ shape }) => JSON.stringify(shape) === JSON.stringify([[0, 0], [0, 1]])))
      .toBe(true);
    expect(level.blocks.find(({ id }) => id === "cc-054-b4-02"))
      .toMatchObject({ frozen: 3, shutterId: "vp-054-cover-3" });
    expect({
      ...level,
      blocks: level.blocks.map((block) => block.id === "cc-054-b4-02" ? { ...block, frozen: 2 } : block),
    }).toEqual(before);
    expect(compareCompetitorMechanismCountContract(level, contractById.get(54)!).issues).toEqual([]);
    expect(adjacencyIssues(level)).toEqual([]);
    expect(() => validateLevel(level)).not.toThrow();
  });

  it("introduces no mechanism-count differences beyond fixing the targeted numeric ice", () => {
    expect(extractRuntimeMechanismCountFacts(repaired(11))).toMatchObject({
      numericIceCount: 7,
      numericIceValues: [13, 14, 15, 16, 17, 17, 17],
      ordinaryExitCount: 2,
      frozenExitCount: 3,
      frozenExitValues: [6, 7, 13],
    });
    expect(extractRuntimeMechanismCountFacts(repaired(54))).toMatchObject({
      numericIceCount: 3,
      numericIceValues: [2, 3, 3],
      shutterCount: 4,
      shutterCoverCounts: [5, 8, 13, 21],
    });
  });

  it("fresh-solves both candidates within 30k states and independently replays", () => {
    const expected = new Map([
      [11, { exploredStates: 1052, minimumDrags: 39, clearLoad: 22, repositionOverhead: 17 }],
      [54, { exploredStates: 1065, minimumDrags: 35, clearLoad: 24, repositionOverhead: 11 }],
    ]);
    for (const levelId of COMPETITOR_NUMERIC_ICE_STRUCTURAL_BATCH_A_LEVEL_IDS) {
      const level = repaired(levelId);
      const solution = solveLevelForValidation(level, 30_000);
      expect(solution.staticUnsatReasons, `Lv${levelId} static`).toEqual([]);
      expect(solution.unsupportedReasons, `Lv${levelId} unsupported`).toEqual([]);
      expect(solution, `Lv${levelId}/${solution.termination}`).toMatchObject({
        solved: true,
        termination: "solved",
        ...expected.get(levelId),
      });
      expect(replay(level, solution.drags), `Lv${levelId} replay`).toBe(true);
    }
  }, 60_000);
});
