// @ts-expect-error The app tsconfig excludes Node ambient types; Vitest runs in Node.
import { createHash } from "node:crypto";
// @ts-expect-error The app tsconfig excludes Node ambient types; Vitest runs in Node.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import {
  applyEarlyExitDifficultyRepair,
  EARLY_EXIT_DIFFICULTY_REPAIR_LEVELS,
} from "../src/core/earlyExitDifficultyRepairs";
import { solveLevelForValidation, type SolverDrag } from "../src/core/levelSolver";
import {
  LEVELS,
  LEVELS_BEFORE_EARLY_EXIT_DIFFICULTY_REPAIR,
} from "../src/core/levels";
import type { BlockSpec, LevelSpec } from "../src/core/types";
import { VIDEO_PARITY_LEVELS } from "../src/core/videoParityLevels.generated";

const replay = (level: LevelSpec, route: readonly SolverDrag[]): PuzzleModel => {
  const model = new PuzzleModel(level);
  for (const drag of route) {
    model.beginAction();
    for (const [x, y] of drag.path) expect(model.moveBlock(drag.blockId, x, y)).toBe(true);
    if (drag.exitSide) expect(model.tryExit(drag.blockId, drag.exitSide).ok).toBe(true);
    expect(model.commitAction()).toBe(true);
  }
  return model;
};

const occupiedCells = (block: BlockSpec): string[] => block.shape
  .map(([dx, dy]) => `${block.x + dx},${block.y + dy}`);

const sameColourAdjacencies = (level: LevelSpec): string[] => {
  const cells = new Map<string, BlockSpec>();
  for (const block of level.blocks) {
    for (const cell of occupiedCells(block)) cells.set(cell, block);
  }
  const hits = new Set<string>();
  for (const [cell, block] of cells) {
    const [x, y] = cell.split(",").map(Number);
    for (const neighbour of [`${x + 1},${y}`, `${x},${y + 1}`]) {
      const other = cells.get(neighbour);
      if (other && other.id !== block.id && other.color === block.color) {
        hits.add([block.id, other.id].sort().join("|"));
      }
    }
  }
  return [...hits].sort();
};

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value as Record<string, unknown>).sort().flatMap((key) => {
    const entry = (value as Record<string, unknown>)[key];
    return entry === undefined ? [] : [[key, canonicalize(entry)]];
  }));
};

const sha256 = (value: string | Uint8Array): string => createHash("sha256")
  .update(value)
  .digest("hex")
  .toUpperCase();

const proof = JSON.parse(readFileSync(new URL(
  "../playtest-results/experiments/early-exit-difficulty-2026-09-21/reposition-floor-proof-lv8-exact-exit-floor7-8.json",
  import.meta.url,
), "utf8"));

describe("post-pipeline early exit/difficulty repair", () => {
  const current = LEVELS_BEFORE_EARLY_EXIT_DIFFICULTY_REPAIR.find(({ id }) => id === 8)!;
  const level = applyEarlyExitDifficultyRepair(current);

  it("is isolated, deterministic, and idempotent", () => {
    expect(EARLY_EXIT_DIFFICULTY_REPAIR_LEVELS.map(({ id }) => id)).toEqual([8]);
    expect(applyEarlyExitDifficultyRepair(LEVELS.find(({ id }) => id === 7)!)).toBe(LEVELS.find(({ id }) => id === 7));
    expect(applyEarlyExitDifficultyRepair(level)).toEqual(level);
    expect(LEVELS[7]).toEqual(level);
  });

  it("restores the exact competitor exit and inventory contract", () => {
    expect(level).toMatchObject({ id: 8, width: 6, height: 8, timeSeconds: 105 });
    expect(level.playable).toHaveLength(33);
    expect(level.blocks).toHaveLength(25);
    expect(level.blocks.filter(({ shape }) => shape.length === 1)).toHaveLength(24);
    expect(level.blocks.filter(({ shape }) => shape.length === 9)).toHaveLength(1);
    expect(level.gates.map(({ side, offset, size, color, frozen = 0 }) => ({ side, offset, size, color, frozen }))).toEqual([
      { side: "top", offset: 5, size: 1, color: "green", frozen: 9 },
      { side: "bottom", offset: 0, size: 1, color: "blue", frozen: 17 },
      { side: "right", offset: 5, size: 3, color: "cyan", frozen: 0 },
      { side: "bottom", offset: 1, size: 3, color: "purple", frozen: 0 },
    ]);
    expect(level.gates.filter(({ frozen = 0 }) => frozen > 0).map(({ frozen }) => frozen)).toEqual([9, 17]);
    expect(new Set(level.blocks.map(({ color }) => color))).toEqual(new Set(["green", "blue", "cyan", "purple"]));
    const source = VIDEO_PARITY_LEVELS.find(({ id }) => id === 8)!;
    expect(level.blocks.flatMap((block, index) => block.color === source.blocks[index]?.color ? [] : [block.id])).toEqual([
      "cc-piece-06",
      "strategy-guard-09",
      "cc-piece-10",
      "cc-piece-13",
      "cc-piece-16",
      "cc-piece-17",
      "cc-piece-24",
      "cc-piece-25",
    ]);
  });

  it("is valid and has no opening same-colour orthogonal adjacency", () => {
    expect(() => validateLevel(level)).not.toThrow();
    expect(sameColourAdjacencies(level)).toEqual([]);
  });

  it("fresh-solves and replays the completion route through PuzzleModel", () => {
    const result = solveLevelForValidation(level, 20_000);
    expect(result).toMatchObject({ solved: true, termination: "solved" });
    expect(result.exploredStates).toBe(12_160);
    expect(result.drags).toHaveLength(45);
    const model = replay(level, result.drags);
    expect(model.snapshot()).toMatchObject({ complete: true, cleared: 25 });
  }, 30_000);

  it("keeps the exact cost<7 lower-bound proof bound to this level and runtime", () => {
    const fileHash = (path: string): string => sha256(readFileSync(new URL(path, import.meta.url)));
    expect(proof.input.sha256).toBe(fileHash("../src/core/earlyExitDifficultyRepairs.ts"));
    expect(proof.binding.puzzle_model_sha256).toBe(fileHash("../src/core/PuzzleModel.ts"));
    expect(proof.binding.level_solver_sha256).toBe(fileHash("../src/core/levelSolver.ts"));
    expect(proof.binding.types_sha256).toBe(fileHash("../src/core/types.ts"));
    expect(proof.binding.block_shape_sha256).toBe(fileHash("../src/core/blockShape.ts"));
    expect(proof.binding.campaign_floor_source_sha256).toBe(fileHash("../src/core/campaignDifficultyTargets.ts"));
    expect(proof.binding.proof_tool_sha256).toBe(fileHash("../tools/prove-video-parity-reposition-floors.mjs"));
    expect(proof.input.core_plans.sha256).toBe(fileHash(
      "../playtest-results/experiments/early-exit-difficulty-2026-09-21/lv8-core-plan.json",
    ));
    expect(proof.levels).toHaveLength(1);
    expect(proof.levels[0]).toMatchObject({
      level_id: 8,
      campaign_reposition_floor: 7,
      status: "floor_lower_bound_proven",
      lower_bound_statement_proven: true,
      explored_states: 27_576,
      generated_transitions: 532_492,
      acceptance: {
        floor_proof: true,
        playable_completion_upper_bound: true,
        combined_playable_floor_acceptance: true,
      },
    });
    expect(proof.levels[0].level_spec_sha256).toBe(sha256(JSON.stringify(canonicalize(level))));
  });
});
