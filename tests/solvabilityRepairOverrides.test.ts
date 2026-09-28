// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest runs this in Node.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { LEVELS, LEVELS_BEFORE_SINGLE_BLOCK_ADJACENCY } from "../src/core/levels";
import { applySingleBlockAdjacencyRepair } from "../src/core/singleBlockAdjacencyOverrides";
import {
  SOLVABILITY_REPAIR_LEVEL_IDS,
  SOLVABILITY_REPAIR_POLICY_VERSION,
} from "../src/core/solvabilityRepairOverrides";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import { solveLevelForValidation } from "../src/core/levelSolver";

type RepairReport = {
  campaign_semantic_sha256: string;
  summary: { solved: number; proven_unsat: number; inconclusive: number; total: number };
  scope: { level_ids: number[]; level_count: number };
  levels: Array<{
    level_id: number;
    status: string;
    puzzle_model_replay?: { ok?: boolean };
  }>;
};

const REPORT = JSON.parse(readFileSync(new URL(
  "../playtest-results/experiments/solvability-opening-v2-2026-09-19/report.json",
  import.meta.url,
), "utf8")) as RepairReport;

const REPORTED_LEVELS = LEVELS_BEFORE_SINGLE_BLOCK_ADJACENCY.map(applySingleBlockAdjacencyRepair);

const replay = (level: (typeof LEVELS)[number], drags: ReturnType<typeof solveLevelForValidation>["drags"]): void => {
  const model = new PuzzleModel(level);
  model.start();
  model.startCountdown();
  const timedIntervals = (level.generators ?? [])
    .filter((generator) => generator.trigger === "time")
    .map((generator) => Math.max(generator.intervalSeconds ?? 1, generator.initialDelaySeconds ?? 0));
  const tickDuration = timedIntervals.length ? Math.max(...timedIntervals) : 0;
  for (const drag of drags) {
    if (!model.getBlock(drag.blockId) && tickDuration > 0) model.tick(tickDuration);
    expect(model.getBlock(drag.blockId), `${level.id}/${drag.blockId} must be active`).toBeDefined();
    model.beginAction();
    for (const [x, y] of drag.path) expect(model.moveBlockStep(drag.blockId, x, y)).toBe(true);
    if (drag.exitSide) expect(model.tryExit(drag.blockId, drag.exitSide).ok).toBe(true);
    expect(model.commitAction()).toBe(true);
    if (tickDuration > 0) model.tick(tickDuration);
  }
  expect(model.snapshot()).toMatchObject({ complete: true, blocks: [], queuedBlocks: [] });
};

describe("solver-certified repairs for previously unresolved campaign levels", () => {
  it("publishes a complete fallback-level evidence contract", () => {
    expect(SOLVABILITY_REPAIR_POLICY_VERSION).toBe("opening-preserving-staging-v2");
    expect(SOLVABILITY_REPAIR_LEVEL_IDS).toHaveLength(95);
    expect(REPORT.scope.level_ids).toEqual([...SOLVABILITY_REPAIR_LEVEL_IDS]);
    expect(REPORT.scope.level_count).toBe(95);
    expect(REPORT.summary).toEqual({ solved: 95, proven_unsat: 0, inconclusive: 0, total: 95 });
    expect(REPORT.levels).toHaveLength(95);
    for (const row of REPORT.levels) {
      expect(row.status, `Lv${row.level_id}`).toBe("solved");
      expect(row.puzzle_model_replay?.ok, `Lv${row.level_id} replay`).toBe(true);
    }
    // This SHA identifies the immutable r165 evidence capture. Downstream
    // adjacency, shutter and mechanism-parity overlays intentionally change
    // the current campaign; the next test freshly solves the current stage.
    expect(REPORT.campaign_semantic_sha256).toMatch(/^[0-9A-F]{64}$/);
  });

  it("validates, keeps unique exits, and replays every repaired level", () => {
    for (const levelId of SOLVABILITY_REPAIR_LEVEL_IDS) {
      const level = REPORTED_LEVELS.find(({ id }) => id === levelId)!;
      expect(level, `Lv${levelId}`).toBeDefined();
      expect(() => validateLevel(level)).not.toThrow();
      const exits = [...level.gates, ...(level.flipDoors ?? [])];
      expect(new Set(exits.map((exit) => exit.color)).size, `Lv${levelId} duplicate exit colours`).toBe(exits.length);
      expect(level.blocks.every((block) => !block.shutterId || level.shutters?.some((shutter) => shutter.id === block.shutterId))).toBe(true);
      expect(level.blocks.filter((block) => !block.shutterId).length, `Lv${levelId} opening`).toBeGreaterThanOrEqual(3);
      const result = solveLevelForValidation(level, 20_000);
      expect(result.solved, `Lv${levelId}`).toBe(true);
      expect(result.staticUnsatReasons).toEqual([]);
      replay(level, result.drags);
    }
  }, 120_000);

  it("retains the two player-facing mechanism milestones", () => {
    const timed = REPORTED_LEVELS.find(({ id }) => id === 70)!;
    expect(timed.generators?.some((generator) => generator.trigger === "time")).toBe(true);
    const staged = REPORTED_LEVELS.find(({ id }) => id === 73)!;
    expect(staged.shutters?.some((shutter) => shutter.skin === "staged-frame")).toBe(true);
  });
});
