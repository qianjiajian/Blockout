// @ts-expect-error The app tsconfig excludes Node ambient types; Vitest runs in Node.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  applyCompetitorLateMechanismStructuralBatchL,
  COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_L_BLOCKERS,
  COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_L_CERTIFIED_LEVEL_IDS,
  COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_L_LV184_SHELL,
  COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_L_LV186_NUMERIC_ICE,
  COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_L_LV189_NUMERIC_ICE,
  COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_L_REQUESTED_LEVEL_IDS,
  COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_L_USES_STAGING_FALLBACK,
  COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_L_VERSION,
} from "../src/core/competitorLateMechanismStructuralBatchL";
import {
  compareCompetitorMechanismCountContract,
  extractCompetitorMechanismCountContracts,
  extractRuntimeMechanismCountFacts,
} from "../src/core/competitorMechanismCountContract";
import { generatorFrozenCargoIssues } from "../src/core/generatorFrozenCargoRepairs";
import { generatorSpawnAlignmentIssues } from "../src/core/generatorSpawnAlignmentRepairs";
import { finalGeneratorPlacementIssues } from "../src/core/finalGeneratorContracts";
import { solveLevelForValidation, type SolverDrag } from "../src/core/levelSolver";
import {
  LEVELS,
  LEVELS_BEFORE_COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_L,
} from "../src/core/levels";
import { openingVisibleBlockIds } from "../src/core/openingBlockCountRepairs";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import type { BlockSpec, LevelSpec, Point } from "../src/core/types";

interface TruthLevel {
  level: number;
  mechanisms: {
    numeric_ice: { shape: string; value: number; stage: string }[];
    shells: { shape: string; layers: string[]; stage: string }[];
  };
}

const truth = JSON.parse(readFileSync(new URL(
  "../deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-truth-v1.json",
  import.meta.url,
), "utf8")) as { levels: TruthLevel[] };
const contracts = extractCompetitorMechanismCountContracts(truth);
const contract = (levelId: number) => contracts.find((entry) => entry.levelId === levelId)!;
const truthLevel = (levelId: number) => truth.levels.find(({ level }) => level === levelId)!;
const source = (levelId: number): LevelSpec => (
  LEVELS_BEFORE_COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_L[levelId - 1]!
);
const candidate = (levelId: number): LevelSpec => (
  applyCompetitorLateMechanismStructuralBatchL(source(levelId))
);

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
const openingAdjacency = (level: LevelSpec): string[] => {
  const opening = new Set(openingVisibleBlockIds(level));
  const occupied = new Map<string, BlockSpec>();
  for (const block of level.blocks.filter(({ id }) => opening.has(id))) {
    for (const [dx, dy] of block.shape) occupied.set(`${block.x + dx},${block.y + dy}`, block);
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

const withoutMutableCarrierFields = (block: BlockSpec): Omit<BlockSpec, "x" | "y" | "shape" | "color" | "layers" | "frozen"> => {
  const {
    x: _x, y: _y, shape: _shape, color: _color, layers: _layers, frozen: _frozen, ...stable
  } = block;
  return stable;
};

describe(`competitor late mechanism structural batch L ${COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_L_VERSION}`, () => {
  it("publishes only the three certified carrier repairs and keeps every residual gap explicit", () => {
    expect(COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_L_REQUESTED_LEVEL_IDS)
      .toEqual([177, 179, 180, 181, 182, 183, 184, 186, 187, 188, 189]);
    expect(COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_L_CERTIFIED_LEVEL_IDS)
      .toEqual([184, 186, 189]);
    expect(COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_L_USES_STAGING_FALLBACK).toBe(false);
    expect(COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_L_BLOCKERS.map(({ levelId }) => levelId))
      .toEqual(COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_L_REQUESTED_LEVEL_IDS);
    expect(COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_L_BLOCKERS.every(({ evidence, reason }) => (
      evidence.length >= 4 && reason.length >= 180
    ))).toBe(true);
    for (const levelId of [177, 179, 180, 181, 182, 183, 187, 188]) {
      expect(applyCompetitorLateMechanismStructuralBatchL(source(levelId))).toBe(source(levelId));
    }
  });

  it("matches the three source facts and repairs only their exact carriers", () => {
    expect(truthLevel(184).mechanisms.shells).toContainEqual(expect.objectContaining({
      shape: "V2", layers: ["yellow", "green"], stage: "opening",
    }));
    expect(truthLevel(186).mechanisms.numeric_ice).toContainEqual(expect.objectContaining({
      shape: "plus_5", value: 17, stage: "opening",
    }));
    expect(truthLevel(189).mechanisms.numeric_ice).toContainEqual(expect.objectContaining({
      shape: "L4_bounding_3x2", value: 18, stage: "opening",
    }));

    const lv184 = candidate(184);
    expect(lv184.blocks.find(({ id }) => id === COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_L_LV184_SHELL.blockId))
      .toMatchObject({ color: "yellow", shape: [[0, 0], [0, 1]], layers: ["yellow", "green"] });

    const lv186 = candidate(186);
    expect(lv186.blocks.find(({ id }) => id === COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_L_LV186_NUMERIC_ICE.blockId))
      .toMatchObject({ color: "cyan", frozen: 17, shape: [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]] });
    expect(lv186.blocks.find(({ id }) => id === COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_L_LV186_NUMERIC_ICE.displacedBlockId)?.frozen)
      .toBeUndefined();

    const lv189 = candidate(189);
    expect(lv189.blocks.find(({ id }) => id === COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_L_LV189_NUMERIC_ICE.blockId))
      .toMatchObject({
        x: 2, y: 8, color: "purple", frozen: 18,
        shape: [[2, 0], [0, 1], [1, 1], [2, 1]],
      });
    expect(lv189.blocks.find(({ id }) => id === COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_L_LV189_NUMERIC_ICE.displacedBlockId)?.frozen)
      .toBeUndefined();
  });

  it("preserves every unrelated field, mechanism count and generator contract", () => {
    for (const levelId of COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_L_CERTIFIED_LEVEL_IDS) {
      const before = source(levelId);
      const after = candidate(levelId);
      expect({ ...after, blocks: undefined }).toEqual({ ...before, blocks: undefined });
      expect(after.blocks.map(withoutMutableCarrierFields))
        .toEqual(before.blocks.map(withoutMutableCarrierFields));
      expect(extractRuntimeMechanismCountFacts(after)).toEqual(extractRuntimeMechanismCountFacts(before));
      expect(compareCompetitorMechanismCountContract(after, contract(levelId)).issues)
        .toEqual(compareCompetitorMechanismCountContract(before, contract(levelId)).issues);
      expect(applyCompetitorLateMechanismStructuralBatchL(after)).toBe(after);
      expect(generatorSpawnAlignmentIssues(after)).toEqual(generatorSpawnAlignmentIssues(before));
      expect(finalGeneratorPlacementIssues(after)).toEqual(finalGeneratorPlacementIssues(before));
      expect(generatorFrozenCargoIssues(after)).toEqual(generatorFrozenCargoIssues(before));
      expect(LEVELS[levelId - 1]).toEqual(after);
    }
  });

  it("keeps every certified candidate valid and opening-adjacency clean", () => {
    for (const levelId of COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_L_CERTIFIED_LEVEL_IDS) {
      const level = candidate(levelId);
      expect(() => validateLevel(level), `Lv${levelId} validation`).not.toThrow();
      expect(openingAdjacency(level), `Lv${levelId} opening adjacency`).toEqual([]);
    }
  });

  it("fresh-solves and independently replays all three candidates", () => {
    const expected = new Map<number, readonly [states: number, drags: number]>([
      [184, [15, 14]],
      [186, [271, 36]],
      [189, [24, 23]],
    ]);
    for (const levelId of COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_L_CERTIFIED_LEVEL_IDS) {
      const level = candidate(levelId);
      const solution = solveLevelForValidation(level, 30_000);
      expect(solution.staticUnsatReasons, `Lv${levelId} static`).toEqual([]);
      expect(solution.unsupportedReasons, `Lv${levelId} unsupported`).toEqual([]);
      expect(solution.solved, `Lv${levelId} ${solution.termination}/${solution.exploredStates}`).toBe(true);
      expect([solution.exploredStates, solution.drags.length]).toEqual(expected.get(levelId));
      expect(replay(level, solution.drags), `Lv${levelId} replay`).toBe(true);
    }
  }, 60_000);
});
