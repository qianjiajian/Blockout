import { describe, expect, it } from "vitest";
import { solveLevelForValidation, type SolverDrag } from "../src/core/levelSolver";
import {
  applyGeneratorSpawnAlignmentRepair,
  GENERATOR_SPAWN_ALIGNMENT_VERSION,
  generatorSpawnAlignmentIssues,
} from "../src/core/generatorSpawnAlignmentRepairs";
import {
  LEVELS,
  LEVELS_BEFORE_GENERATOR_SPAWN_ALIGNMENT_REPAIR,
  LEVELS_BEFORE_OPENING_BLOCK_COUNT_EXPANSION_REPAIR,
} from "../src/core/levels";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import type { LevelSpec, Point } from "../src/core/types";

const normalizedShape = (shape: readonly Point[]): string => {
  const minX = Math.min(...shape.map(([x]) => x));
  const minY = Math.min(...shape.map(([, y]) => y));
  return shape.map(([x, y]) => `${x - minX},${y - minY}`).sort().join(";");
};

const replay = (level: LevelSpec, drags: readonly SolverDrag[]): boolean => {
  const model = new PuzzleModel(level);
  model.start();
  model.startCountdown();
  const timedInterval = Math.max(0, ...(level.generators ?? [])
    .filter((generator) => generator.trigger === "time")
    .map((generator) => Math.max(generator.initialDelaySeconds ?? 0, generator.intervalSeconds ?? 1)));
  for (const drag of drags) {
    if (!model.getBlock(drag.blockId) && timedInterval > 0) model.tick(timedInterval);
    if (!model.getBlock(drag.blockId)) return false;
    model.beginAction();
    for (const [x, y] of drag.path) {
      const before = model.getBlock(drag.blockId);
      if (!before) return false;
      const distance = Math.abs(before.x - x) + Math.abs(before.y - y);
      const moved = distance === 1 ? model.moveBlockStep(drag.blockId, x, y) : model.moveBlock(drag.blockId, x, y);
      if (!moved) return false;
    }
    if (drag.exitSide && !model.tryExit(drag.blockId, drag.exitSide).ok) return false;
    if (!model.commitAction()) return false;
    if (timedInterval > 0) model.tick(timedInterval);
  }
  const snapshot = model.snapshot();
  return snapshot.complete && snapshot.blocks.length === 0 && snapshot.queuedBlocks.length === 0;
};

describe(`generator spawn alignment ${GENERATOR_SPAWN_ALIGNMENT_VERSION}`, () => {
  const solverStateBudget = 30_000;
  it("aligns all 62 machines and 216 queue pieces to the middle mouth cell", () => {
    const generatorLevels = LEVELS.filter((level) => level.generators?.length);
    expect(generatorLevels).toHaveLength(36);
    expect(generatorLevels.reduce((sum, level) => sum + level.generators!.length, 0)).toBe(62);
    expect(generatorLevels.reduce((sum, level) => sum + level.generators!
      .reduce((queueSum, generator) => queueSum + generator.queueBlockIds.length, 0), 0)).toBe(216);
    expect(generatorLevels.flatMap(generatorSpawnAlignmentIssues)).toEqual([]);
    for (const level of generatorLevels) expect(() => validateLevel(level), `Lv${level.id}`).not.toThrow();
  });

  it("preserves queue order and physical shapes while changing only their template offsets", () => {
    for (const source of LEVELS_BEFORE_GENERATOR_SPAWN_ALIGNMENT_REPAIR) {
      const repaired = applyGeneratorSpawnAlignmentRepair(source);
      expect(LEVELS_BEFORE_OPENING_BLOCK_COUNT_EXPANSION_REPAIR[source.id - 1], `Lv${source.id} integration`)
        .toEqual(repaired);
      expect(applyGeneratorSpawnAlignmentRepair(repaired), `Lv${source.id} idempotence`).toEqual(repaired);
      if (!source.generators?.length) {
        expect(repaired).toBe(source);
        continue;
      }
      expect(repaired.generators!.map((generator) => ({
        id: generator.id,
        queueBlockIds: generator.queueBlockIds,
        trigger: generator.trigger,
        intervalSeconds: generator.intervalSeconds,
        initialDelaySeconds: generator.initialDelaySeconds,
        rimAnchor: generator.rimAnchor,
      }))).toEqual(source.generators.map((generator) => ({
        id: generator.id,
        queueBlockIds: generator.queueBlockIds,
        trigger: generator.trigger,
        intervalSeconds: generator.intervalSeconds,
        initialDelaySeconds: generator.initialDelaySeconds,
        rimAnchor: generator.rimAnchor,
      })));
      const queued = new Set(source.generators.flatMap((generator) => generator.queueBlockIds));
      for (let index = 0; index < source.blocks.length; index += 1) {
        const before = source.blocks[index]!;
        const after = repaired.blocks[index]!;
        expect(after.id).toBe(before.id);
        if (!queued.has(before.id)) expect(after).toEqual(before);
        else {
          expect({ ...after, shape: undefined }).toEqual({ ...before, shape: undefined });
          expect(normalizedShape(after.shape), `Lv${source.id} ${before.id}`).toBe(normalizedShape(before.shape));
        }
      }
    }
  });

  it("fresh-solves and independently replays every generator level", () => {
    for (const level of LEVELS.filter((candidate) => candidate.generators?.length)) {
      const solution = solveLevelForValidation(level, solverStateBudget);
      expect(solution.staticUnsatReasons, `Lv${level.id} static constraints`).toEqual([]);
      expect(solution.unsupportedReasons, `Lv${level.id} solver support`).toEqual([]);
      expect(solution.solved, `Lv${level.id}/${solution.termination}/${solution.exploredStates}`).toBe(true);
      expect(replay(level, solution.drags), `Lv${level.id} PuzzleModel replay`).toBe(true);
    }
  }, 240_000);
});
