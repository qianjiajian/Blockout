import { describe, expect, it } from "vitest";

import {
  applyCompetitorExitStructuralBatchA,
  COMPETITOR_EXIT_STRUCTURAL_BATCH_A_BLOCKERS,
  COMPETITOR_EXIT_STRUCTURAL_BATCH_A_LEVEL_IDS,
} from "../src/core/competitorExitStructuralBatchA";
import { solveLevelForValidation, type SolverDrag } from "../src/core/levelSolver";
import {
  LEVELS,
  LEVELS_BEFORE_COMPETITOR_EXIT_STRUCTURAL_BATCH_A,
} from "../src/core/levels";
import { openingVisibleBlockIds } from "../src/core/openingBlockCountRepairs";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import { VIDEO_PARITY_LEVELS } from "../src/core/videoParityLevels.generated";
import type { BlockSpec, LevelSpec, Point } from "../src/core/types";

const source = (): LevelSpec => LEVELS_BEFORE_COMPETITOR_EXIT_STRUCTURAL_BATCH_A[21]!;
const repaired = (): LevelSpec => applyCompetitorExitStructuralBatchA(source());
const outerColor = (block: BlockSpec): string => block.layers?.[0] ?? block.color;

const openingAdjacency = (level: LevelSpec): string[] => {
  const opening = new Set(openingVisibleBlockIds(level));
  const occupied = new Map<string, BlockSpec>();
  for (const block of level.blocks.filter(({ id }) => opening.has(id))) {
    for (const [dx, dy] of block.shape) occupied.set(`${block.x + dx},${block.y + dy}`, block);
  }
  const issues = new Set<string>();
  for (const [key, block] of occupied) {
    const [xValue, yValue] = key.split(",").map(Number);
    const x = xValue!;
    const y = yValue!;
    for (const [dx, dy] of [[1, 0], [0, 1]] as Point[]) {
      const other = occupied.get(`${x + dx},${y + dy}`);
      if (other && other.id !== block.id && outerColor(other) === outerColor(block)) {
        issues.add([block.id, other.id].sort().join("/"));
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
    model.beginAction();
    for (const [x, y] of drag.path) if (!model.moveBlockStep(drag.blockId, x, y)) return false;
    if (drag.exitSide && !model.tryExit(drag.blockId, drag.exitSide).ok) return false;
    if (!model.commitAction()) return false;
  }
  const snapshot = model.snapshot();
  return snapshot.complete && snapshot.blocks.length === 0 && snapshot.queuedBlocks.length === 0;
};

describe("competitor exit structural repair batch A", () => {
  it("keeps the assigned safe and blocked ids explicit", () => {
    expect(COMPETITOR_EXIT_STRUCTURAL_BATCH_A_LEVEL_IDS).toEqual([22]);
    expect(COMPETITOR_EXIT_STRUCTURAL_BATCH_A_BLOCKERS.map(({ levelId }) => levelId))
      .toEqual([14, 16, 17, 19, 25]);
  });

  it("is isolated and reference-idempotent", () => {
    expect(applyCompetitorExitStructuralBatchA(LEVELS[20]!)).toBe(LEVELS[20]);
    const level = repaired();
    expect(level).not.toBe(source());
    expect(applyCompetitorExitStructuralBatchA(level)).toBe(level);
    expect(applyCompetitorExitStructuralBatchA(LEVELS[21]!)).toBe(LEVELS[21]);
  });

  it("restores Lv22 source block semantics and exact independent exits", () => {
    const level = repaired();
    const raw = VIDEO_PARITY_LEVELS[21]!;
    const rawById = new Map(raw.blocks.map((block) => [block.id, block]));
    expect(level.blocks).toHaveLength(29);
    expect(openingVisibleBlockIds(level)).toHaveLength(17);
    for (const block of level.blocks) {
      const authored = rawById.get(block.id)!;
      expect(block.color, block.id).toBe(authored.color);
      expect(block.layers, block.id).toEqual(authored.layers);
      expect(block.shape, block.id).toEqual(authored.shape);
      expect(block.frozen, block.id).toBe(authored.frozen);
    }
    expect(level.gates).toEqual(raw.gates);
    expect(level.gates.filter((gate) => !gate.frozen)).toHaveLength(3);
    expect(level.gates.flatMap((gate) => gate.frozen ? [gate.frozen] : []).sort((a, b) => a - b))
      .toEqual([17, 19, 19]);
    expect(new Set(level.gates.map(({ id }) => id))).toHaveLength(6);
    expect(level.flipDoors ?? []).toHaveLength(0);
    expect(openingAdjacency(level)).toEqual([]);
    expect(() => validateLevel(level)).not.toThrow();
  });

  it("fresh-solves within 30,000 states and independently replays", () => {
    const level = repaired();
    const solution = solveLevelForValidation(level, 30_000);
    expect(solution.staticUnsatReasons).toEqual([]);
    expect(solution.unsupportedReasons).toEqual([]);
    expect(solution).toMatchObject({
      solved: true,
      termination: "solved",
      exploredStates: 54,
      minimumDrags: 37,
      clearLoad: 29,
      repositionOverhead: 8,
      gridSteps: 141,
      turns: 19,
    });
    expect(replay(level, solution.drags)).toBe(true);
  });
});
