import { describe, expect, it } from "vitest";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import { solveLevelForValidation } from "../src/core/levelSolver";
import { LEVELS } from "../src/core/levels";
import {
  applyOpeningVisibilityCohortRepair,
  OPENING_VISIBILITY_COHORT_REPAIR_LEVEL_IDS,
  OPENING_VISIBILITY_COHORT_REPAIR_VERSION,
} from "../src/core/openingVisibilityCohortRepairs";
import type { BlockSpec, LevelSpec } from "../src/core/types";

const EXPECTED_OPENING_COUNTS = new Map<number, number>([
  [139, 16],
  [171, 12],
  [185, 14],
]);

const expectedOpeningIds = (levelId: number): string[] => Array.from(
  { length: EXPECTED_OPENING_COUNTS.get(levelId)! },
  (_, index) => `lv${levelId}-opening-b${String(index + 1).padStart(2, "0")}`,
);

const openingIds = (level: LevelSpec): string[] => {
  const queuedIds = new Set((level.generators ?? []).flatMap((generator) => generator.queueBlockIds));
  const shutterCounts = new Map((level.shutters ?? []).map((shutter) => [shutter.id, shutter.count]));
  return level.blocks
    .filter((block) => !queuedIds.has(block.id))
    .filter((block) => !block.shutterId || (shutterCounts.get(block.shutterId) ?? 0) <= 0)
    .map((block) => block.id)
    .sort();
};

const withoutShutterBinding = (block: BlockSpec): Omit<BlockSpec, "shutterId"> => {
  const { shutterId: _ignored, ...rest } = block;
  return rest;
};

const replay = (
  level: LevelSpec,
  drags: ReturnType<typeof solveLevelForValidation>["drags"],
): void => {
  const model = new PuzzleModel(level);
  model.start();
  model.startCountdown();
  for (const drag of drags) {
    expect(model.getBlock(drag.blockId), `Lv${level.id}/${drag.blockId} must be active`).toBeDefined();
    model.beginAction();
    for (const [x, y] of drag.path) {
      const before = model.getBlock(drag.blockId)!;
      const distance = Math.abs(before.x - x) + Math.abs(before.y - y);
      const moved = distance === 1
        ? model.moveBlockStep(drag.blockId, x, y)
        : model.moveBlock(drag.blockId, x, y);
      expect(moved, `Lv${level.id}/${drag.blockId} -> ${x},${y}`).toBe(true);
    }
    if (drag.exitSide) {
      expect(model.tryExit(drag.blockId, drag.exitSide).ok, `Lv${level.id}/${drag.blockId} exits`).toBe(true);
    }
    expect(model.commitAction(), `Lv${level.id}/${drag.blockId} commits`).toBe(true);
  }
  expect(model.snapshot(), `Lv${level.id}`).toMatchObject({ complete: true, blocks: [], queuedBlocks: [] });
};

describe(`opening visibility cohort repairs ${OPENING_VISIBILITY_COHORT_REPAIR_VERSION}`, () => {
  for (const levelId of OPENING_VISIBILITY_COHORT_REPAIR_LEVEL_IDS) {
    it(`restores the exact Lv${levelId} opening without changing geometry or player-facing mechanisms`, () => {
      const before = LEVELS.find((level) => level.id === levelId)!;
      const after = applyOpeningVisibilityCohortRepair(before);

      expect(openingIds(after)).toEqual(expectedOpeningIds(levelId));
      expect(after.blocks.map(withoutShutterBinding)).toEqual(before.blocks.map(withoutShutterBinding));
      expect(after.gates).toEqual(before.gates);
      expect(after.generators).toEqual(before.generators);
      expect(after.flipDoors).toEqual(before.flipDoors);
      expect(after.elevators).toEqual(before.elevators);
      expect(after.conveyors).toEqual(before.conveyors);
      expect(after.coloredGrids).toEqual(before.coloredGrids);

      const nonStagingBefore = (before.shutters ?? []).filter((shutter) => shutter.skin !== "staging");
      const nonStagingAfter = (after.shutters ?? []).filter((shutter) => shutter.skin !== "staging");
      expect(nonStagingAfter).toEqual(nonStagingBefore);
      const referencedIds = new Set(after.blocks.flatMap((block) => block.shutterId ? [block.shutterId] : []));
      for (const shutter of after.shutters ?? []) {
        if (shutter.skin === "staging") {
          expect(referencedIds.has(shutter.id), `Lv${levelId}/${shutter.id} must have staged cargo`).toBe(true);
        }
      }

      expect(applyOpeningVisibilityCohortRepair(after)).toBe(after);
      expect(() => validateLevel(after), `Lv${levelId}`).not.toThrow();
    });

    it(`keeps repaired Lv${levelId} solver-complete and replayable`, () => {
      const before = LEVELS.find((level) => level.id === levelId)!;
      const level = applyOpeningVisibilityCohortRepair(before);
      const solution = solveLevelForValidation(level, 200_000);
      expect(solution.staticUnsatReasons, `Lv${levelId} static constraints`).toEqual([]);
      expect(solution.solved, `Lv${levelId}: ${solution.termination}`).toBe(true);
      replay(level, solution.drags);
    }, 120_000);
  }
});
