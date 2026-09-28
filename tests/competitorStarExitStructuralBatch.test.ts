// @ts-expect-error The app tsconfig excludes Node ambient types; Vitest runs in Node.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  applyCompetitorStarExitStructuralBatch,
  COMPETITOR_STAR_EXIT_LV100_BLOCKS,
  COMPETITOR_STAR_EXIT_LV100_GATES,
  COMPETITOR_STAR_EXIT_STRUCTURAL_BATCH_VERSION,
  COMPETITOR_STAR_EXIT_STRUCTURAL_BLOCKED_LEVEL_IDS,
  COMPETITOR_STAR_EXIT_STRUCTURAL_BLOCKERS,
  COMPETITOR_STAR_EXIT_STRUCTURAL_LEVEL_IDS,
} from "../src/core/competitorStarExitStructuralBatch";
import {
  compareCompetitorMechanismCountContract,
  extractCompetitorMechanismCountContracts,
} from "../src/core/competitorMechanismCountContract";
import {
  LEVELS,
  LEVELS_BEFORE_COMPETITOR_STAR_EXIT_STRUCTURAL_BATCH,
} from "../src/core/levels";
import { solveLevelForValidation, type SolverDrag } from "../src/core/levelSolver";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import type { BlockSpec, LevelSpec } from "../src/core/types";

const truth = JSON.parse(readFileSync(new URL(
  "../deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json",
  import.meta.url,
), "utf8"));
const contract = extractCompetitorMechanismCountContracts(truth)
  .find((candidate) => candidate.levelId === 100)!;

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

const adjacencyIssues = (level: LevelSpec): string[] => {
  const occupied = new Map<string, BlockSpec>();
  for (const block of level.blocks) for (const [dx, dy] of block.shape) {
    occupied.set(`${block.x + dx},${block.y + dy}`, block);
  }
  const issues = new Set<string>();
  for (const [key, block] of occupied) {
    const [x, y] = key.split(",").map(Number);
    for (const [ox, oy] of [[1, 0], [0, 1]] as const) {
      const other = occupied.get(`${x + ox},${y + oy}`);
      if (other && other.id !== block.id
        && (other.layers?.[0] ?? other.color) === (block.layers?.[0] ?? block.color)) {
        issues.add([block.id, other.id].sort().join("|"));
      }
    }
  }
  return [...issues];
};

describe(`competitor star-exit structural batch ${COMPETITOR_STAR_EXIT_STRUCTURAL_BATCH_VERSION}`, () => {
  const source = LEVELS_BEFORE_COMPETITOR_STAR_EXIT_STRUCTURAL_BATCH[99]!;
  const repaired = applyCompetitorStarExitStructuralBatch(source);

  it("accepts only the fully evidenced Lv100 and leaves ambiguous levels blocked", () => {
    expect(COMPETITOR_STAR_EXIT_STRUCTURAL_LEVEL_IDS).toEqual([100]);
    expect(COMPETITOR_STAR_EXIT_STRUCTURAL_BLOCKED_LEVEL_IDS).toEqual([102, 104, 118, 131, 163]);
    expect(Object.keys(COMPETITOR_STAR_EXIT_STRUCTURAL_BLOCKERS).map(Number)).toEqual([102, 104, 118, 131, 163]);
    expect(applyCompetitorStarExitStructuralBatch(LEVELS[98]!)).toBe(LEVELS[98]);
    expect(applyCompetitorStarExitStructuralBatch(LEVELS[101]!)).toBe(LEVELS[101]);
  });

  it("projects the exact two-colour star map and four source-recorded exits", () => {
    expect(repaired.blocks.map((block) => [
      `${block.x},${block.y}`,
      block.color,
      Boolean(block.star),
    ]).sort(([left], [right]) => String(left).localeCompare(String(right))))
      .toEqual(Object.entries(COMPETITOR_STAR_EXIT_LV100_BLOCKS).map(([key, binding]) => [
      key,
      binding.color,
      binding.star,
      ]).sort(([left], [right]) => String(left).localeCompare(String(right))));
    expect(repaired.gates).toEqual(COMPETITOR_STAR_EXIT_LV100_GATES);
    expect(repaired.blocks.filter((block) => block.star)).toHaveLength(7);
    expect(compareCompetitorMechanismCountContract(repaired, contract).issues).toEqual([]);
  });

  it("preserves board/block geometry, stays adjacency-clean, validates and is idempotent", () => {
    expect({ ...repaired, blocks: undefined, gates: undefined })
      .toEqual({ ...source, blocks: undefined, gates: undefined });
    expect(repaired.blocks.map(({ color: _color, star: _star, layers: _layers, ...block }) => block))
      .toEqual(source.blocks.map(({ color: _color, star: _star, layers: _layers, ...block }) => block));
    expect(adjacencyIssues(repaired)).toEqual([]);
    expect(() => validateLevel(repaired)).not.toThrow();
    expect(applyCompetitorStarExitStructuralBatch(repaired)).toEqual(repaired);
    expect(LEVELS[99]).toEqual(repaired);
  });

  it("fresh-solves within 30k states and independently replays to completion", () => {
    const solution = solveLevelForValidation(repaired, 30_000);
    expect(solution.staticUnsatReasons).toEqual([]);
    expect(solution.unsupportedReasons).toEqual([]);
    expect(solution.solved, `${solution.termination}/${solution.exploredStates}`).toBe(true);
    expect(solution.exploredStates).toBeLessThanOrEqual(30_000);
    expect(replay(repaired, solution.drags)).toBe(true);
  }, 60_000);
});
