import { describe, expect, it } from "vitest";
import { extractRuntimeMechanismCountFacts } from "../src/core/competitorMechanismCountContract";
import {
  applyLevel41GeneratorOpeningBridgeRepair,
  LEVEL41_GENERATOR_OPENING_BRIDGE_VERSION,
} from "../src/core/level41GeneratorOpeningBridgeRepair";
import { solveLevelForValidation, type SolverDrag } from "../src/core/levelSolver";
import {
  LEVELS,
  LEVELS_BEFORE_LEVEL41_GENERATOR_OPENING_BRIDGE_REPAIR,
} from "../src/core/levels";
import { openingVisibleBlockIds } from "../src/core/openingBlockCountRepairs";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import { shutterHasPhysicalFootprint, type BlockSpec, type LevelSpec } from "../src/core/types";

const adjacencyIssues = (level: LevelSpec): string[] => {
  const opening = new Set(openingVisibleBlockIds(level));
  const occupied = new Map<string, BlockSpec[]>();
  const blocks = level.blocks.filter((block) => opening.has(block.id));
  for (const block of blocks) for (const [dx, dy] of block.shape) {
    const key = `${block.x + dx},${block.y + dy}`;
    occupied.set(key, [...(occupied.get(key) ?? []), block]);
  }
  const pairs = new Set<string>();
  for (const block of blocks) for (const [dx, dy] of block.shape) {
    const x = block.x + dx, y = block.y + dy;
    for (const [sx, sy] of [[1, 0], [0, 1]] as const) {
      for (const neighbour of occupied.get(`${x + sx},${y + sy}`) ?? []) {
        if (block.id !== neighbour.id && (block.layers?.[0] ?? block.color) === (neighbour.layers?.[0] ?? neighbour.color)) {
          pairs.add([block.id, neighbour.id].sort().join("|"));
        }
      }
    }
  }
  return [...pairs];
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
      const moved = distance === 1
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

describe(`Lv41 generator opening bridge ${LEVEL41_GENERATOR_OPENING_BRIDGE_VERSION}`, () => {
  const source = LEVELS_BEFORE_LEVEL41_GENERATOR_OPENING_BRIDGE_REPAIR[40]!;
  const repaired = LEVELS[40]!;

  it("integrates an eleven-piece, adjacency-safe opening without changing player-facing mechanisms", () => {
    expect(repaired).toEqual(applyLevel41GeneratorOpeningBridgeRepair(source));
    expect(applyLevel41GeneratorOpeningBridgeRepair(repaired)).toBe(repaired);
    expect(openingVisibleBlockIds(repaired)).toHaveLength(11);
    expect(adjacencyIssues(repaired)).toEqual([]);
    expect(() => validateLevel(repaired)).not.toThrow();
    expect(repaired.generators).toEqual(source.generators);
    expect((repaired.shutters ?? []).filter(shutterHasPhysicalFootprint))
      .toEqual((source.shutters ?? []).filter(shutterHasPhysicalFootprint));
    expect((repaired.shutters ?? []).filter((shutter) => shutter.skin === "lift")).toEqual([]);
    expect((repaired.shutters ?? []).filter((shutter) => shutter.skin === "staging"))
      .toHaveLength(9);
    expect(extractRuntimeMechanismCountFacts(repaired)).toEqual(extractRuntimeMechanismCountFacts(source));
  });

  it("fresh-solves and independently replays the repaired level", () => {
    const solution = solveLevelForValidation(repaired, 20_000);
    expect(solution.staticUnsatReasons).toEqual([]);
    expect(solution.unsupportedReasons).toEqual([]);
    expect(solution.solved, `${solution.termination}/${solution.exploredStates}`).toBe(true);
    expect(solution.exploredStates).toBeLessThan(20_000);
    expect(replay(repaired, solution.drags)).toBe(true);
  });

  it("allows exact internal staging cohorts while rejecting malformed or physical cohorts", () => {
    const replaceShutter = (id: string, patch: object): LevelSpec => ({
      ...repaired,
      shutters: repaired.shutters?.map((shutter) => shutter.id === id ? { ...shutter, ...patch } : shutter),
    });
    expect(() => validateLevel(replaceShutter("sr-41-18", { triggerBlockIds: undefined }))).not.toThrow();
    expect(() => validateLevel(replaceShutter("sr-41-18", { count: 0, triggerBlockIds: [] })))
      .toThrow(/trigger block cohort cannot be empty/);
    expect(() => validateLevel(replaceShutter("sr-41-18", { count: 2 })))
      .toThrow(/count must equal its trigger block cohort/);
    expect(() => validateLevel(replaceShutter("sr-41-18", { triggerBlockIds: ["missing-block"] })))
      .toThrow(/references missing trigger block/);
    expect(() => validateLevel(replaceShutter("sr-41-18", { triggerBlockIds: ["cc-041-b4-02"] })))
      .toThrow(/cannot wait for its own hidden block/);
    expect(() => validateLevel(replaceShutter("vp-041-cover-1", {
      count: 1,
      triggerBlockIds: ["cc-041-b1-02"],
    }))).toThrow(/without an exact-cohort skin/);
    const cycle: LevelSpec = {
      ...repaired,
      shutters: repaired.shutters?.map((shutter) => {
        if (shutter.id === "sr-41-18") return { ...shutter, count: 1, triggerBlockIds: ["cc-041-b5-05"] };
        if (shutter.id === "sr-41-24") return { ...shutter, count: 1, triggerBlockIds: ["cc-041-b4-02"] };
        return shutter;
      }),
    };
    expect(() => validateLevel(cycle)).toThrow(/dependency cycle/);
  });
});
