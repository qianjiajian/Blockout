import { describe, expect, it } from "vitest";
import { generatorSpawnAlignmentIssues } from "../src/core/generatorSpawnAlignmentRepairs";
import {
  applyGeneratorRouteSolvabilityRepair,
  GENERATOR_ROUTE_SOLVABILITY_REPAIR_LEVEL_IDS,
  GENERATOR_ROUTE_SOLVABILITY_REPAIR_VERSION,
} from "../src/core/generatorRouteSolvabilityRepairs";
import { solveLevelForValidation, type SolverDrag } from "../src/core/levelSolver";
import {
  LEVELS,
  LEVELS_BEFORE_GENERATOR_ROUTE_SOLVABILITY_REPAIR,
  LEVELS_BEFORE_GENERATOR_SPAWN_ALIGNMENT_REPAIR,
} from "../src/core/levels";
import { openingVisibleBlockIds } from "../src/core/openingBlockCountRepairs";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import type { LevelSpec } from "../src/core/types";

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
      if (!(distance === 1 ? model.moveBlockStep(drag.blockId, x, y) : model.moveBlock(drag.blockId, x, y))) return false;
    }
    if (drag.exitSide && !model.tryExit(drag.blockId, drag.exitSide).ok) return false;
    if (!model.commitAction()) return false;
  }
  const snapshot = model.snapshot();
  return snapshot.complete && snapshot.blocks.length === 0 && snapshot.queuedBlocks.length === 0;
};

describe(`generator route repairs ${GENERATOR_ROUTE_SOLVABILITY_REPAIR_VERSION}`, () => {
  it("integrates only the solver-certified Lv56 shift and Lv156 neck opening before spawn alignment", () => {
    expect(GENERATOR_ROUTE_SOLVABILITY_REPAIR_LEVEL_IDS).toEqual([56, 156]);
    const source = LEVELS_BEFORE_GENERATOR_ROUTE_SOLVABILITY_REPAIR[55]!;
    const repaired = applyGeneratorRouteSolvabilityRepair(source);
    expect(LEVELS_BEFORE_GENERATOR_SPAWN_ALIGNMENT_REPAIR[55]).toEqual(repaired);
    expect(applyGeneratorRouteSolvabilityRepair(repaired)).toBe(repaired);
    expect(repaired.blocks.find((block) => block.id === "cc-piece-s1-13")).toMatchObject({ x: 0, y: 1 });
    expect(repaired.generators).toEqual(source.generators);
    expect(repaired.gates).toEqual(source.gates);
    expect(repaired.shutters).toEqual(source.shutters);

    const source156 = LEVELS_BEFORE_GENERATOR_ROUTE_SOLVABILITY_REPAIR[155]!;
    const repaired156 = applyGeneratorRouteSolvabilityRepair(source156);
    expect(LEVELS_BEFORE_GENERATOR_SPAWN_ALIGNMENT_REPAIR[155]).toEqual(repaired156);
    expect(applyGeneratorRouteSolvabilityRepair(repaired156)).toBe(repaired156);
    expect(repaired156.playable).toEqual(expect.arrayContaining([[3, 4], [4, 4]]));
    expect(repaired156.blocks).toEqual(source156.blocks);
    expect(repaired156.generators).toEqual(source156.generators);
    expect(repaired156.gates).toEqual(source156.gates);
    expect(repaired156.shutters).toEqual(source156.shutters);
  });

  it("keeps the final Lv56/Lv156 contracts and fresh solver/replay green", () => {
    for (const [levelId, openingCount] of [[56, 17], [156, 4]] as const) {
      const level = LEVELS[levelId - 1]!;
      expect(openingVisibleBlockIds(level)).toHaveLength(openingCount);
      expect(generatorSpawnAlignmentIssues(level)).toEqual([]);
      expect(() => validateLevel(level)).not.toThrow();
      const solution = solveLevelForValidation(level, 20_000);
      expect(solution.staticUnsatReasons).toEqual([]);
      expect(solution.unsupportedReasons).toEqual([]);
      expect(solution.solved, `Lv${levelId}: ${solution.termination}/${solution.exploredStates}`).toBe(true);
      expect(replay(level, solution.drags)).toBe(true);
    }
  });
});
