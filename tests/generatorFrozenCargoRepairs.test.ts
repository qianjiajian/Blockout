// @ts-expect-error The app tsconfig excludes Node ambient types; Vitest runs in Node.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  compareCompetitorMechanismCountContract,
  extractCompetitorMechanismCountContracts,
} from "../src/core/competitorMechanismCountContract";
import { finalGeneratorPlacementIssues } from "../src/core/finalGeneratorContracts";
import {
  applyGeneratorFrozenCargoRepair,
  GENERATOR_FROZEN_CARGO_REPAIR_LEVEL_IDS,
  GENERATOR_FROZEN_CARGO_REPAIR_VERSION,
  generatorFrozenCargoIssues,
} from "../src/core/generatorFrozenCargoRepairs";
import { generatorSpawnAlignmentIssues } from "../src/core/generatorSpawnAlignmentRepairs";
import { solveLevelForValidation, type SolverDrag } from "../src/core/levelSolver";
import {
  LEVELS,
  LEVELS_BEFORE_GENERATOR_FROZEN_CARGO_REPAIR,
} from "../src/core/levels";
import { openingVisibleBlockIds } from "../src/core/openingBlockCountRepairs";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import type { BlockSpec, LevelSpec } from "../src/core/types";

const post100Truth = JSON.parse(readFileSync(new URL(
  "../deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-truth-v1.json",
  import.meta.url,
), "utf8").replace(/^\uFEFF/, ""));
const lv156Contract = extractCompetitorMechanismCountContracts(post100Truth)
  .find((contract) => contract.levelId === 156)!;

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

const openingAdjacencyIssues = (level: LevelSpec): string[] => {
  const opening = new Set(openingVisibleBlockIds(level));
  const blocks = level.blocks.filter((block) => opening.has(block.id));
  const occupied = new Map<string, BlockSpec[]>();
  for (const block of blocks) for (const [dx, dy] of block.shape) {
    const key = `${block.x + dx},${block.y + dy}`;
    occupied.set(key, [...(occupied.get(key) ?? []), block]);
  }
  const issues = new Set<string>();
  for (const block of blocks) for (const [dx, dy] of block.shape) {
    const x = block.x + dx, y = block.y + dy;
    for (const [stepX, stepY] of [[1, 0], [0, 1]] as const) {
      for (const neighbour of occupied.get(`${x + stepX},${y + stepY}`) ?? []) {
        if (block.id === neighbour.id) continue;
        if ((block.layers?.[0] ?? block.color) !== (neighbour.layers?.[0] ?? neighbour.color)) continue;
        issues.add([block.id, neighbour.id].sort().join("|"));
      }
    }
  }
  return [...issues];
};

const releasePreload = (level: LevelSpec, blockId: string, targetX: number): number[] => {
  const model = new PuzzleModel(level);
  model.start();
  model.startCountdown();
  const block = model.getBlock(blockId);
  expect(block).toBeDefined();
  model.beginAction();
  expect(model.moveBlock(blockId, targetX, block!.y)).toBe(true);
  expect(model.commitAction()).toBe(true);
  return model.snapshot().generators.map((generator) => generator.remaining);
};

describe(`generator frozen-cargo repairs ${GENERATOR_FROZEN_CARGO_REPAIR_VERSION}`, () => {
  it("is the final campaign overlay and hard-rejects frozen generated cargo", () => {
    expect(GENERATOR_FROZEN_CARGO_REPAIR_LEVEL_IDS).toEqual([41, 87, 156]);
    for (const level of LEVELS) expect(generatorFrozenCargoIssues(level), `Lv${level.id}`).toEqual([]);
    const generators = LEVELS.flatMap((level) => level.generators ?? []);
    expect(LEVELS.filter((level) => level.generators?.length)).toHaveLength(36);
    expect(generators).toHaveLength(62);
    expect(generators.flatMap((generator) => generator.queueBlockIds)).toHaveLength(216);

    const source = LEVELS_BEFORE_GENERATOR_FROZEN_CARGO_REPAIR[155]!;
    const repaired = applyGeneratorFrozenCargoRepair(source);
    expect(LEVELS[155]).toEqual(repaired);
    expect(applyGeneratorFrozenCargoRepair(repaired)).toBe(repaired);

    const invalid = structuredClone(LEVELS[40]!);
    const queuedId = invalid.generators![0]!.queueBlockIds[0]!;
    invalid.blocks.find((block) => block.id === queuedId)!.frozen = 1;
    expect(() => applyGeneratorFrozenCargoRepair(invalid)).toThrow(/queued block .* cannot be frozen/);
  });

  it("keeps Lv41 and Lv87 numeric ice on opening-visible board pieces", () => {
    for (const [levelId, expectedCount, expectedValue] of [[41, 4, 7], [87, 7, 9]] as const) {
      const level = LEVELS[levelId - 1]!;
      const queueIds = new Set(level.generators?.flatMap((generator) => generator.queueBlockIds) ?? []);
      const ice = level.blocks.filter((block) => (block.frozen ?? 0) > 0);
      expect(ice).toHaveLength(expectedCount);
      expect(ice.map((block) => block.frozen)).toEqual(Array(expectedCount).fill(expectedValue));
      expect(ice.every((block) => !queueIds.has(block.id))).toBe(true);
    }
  });

  it("restores the frame-proven Lv156 opening, four move generators and five Flip Doors", () => {
    const level = LEVELS[155]!;
    const openingIds = openingVisibleBlockIds(level);
    const opening = level.blocks.filter((block) => openingIds.includes(block.id));
    const queueIds = new Set(level.generators?.flatMap((generator) => generator.queueBlockIds) ?? []);

    expect(level.playable).toHaveLength(64);
    expect(level.blocks).toHaveLength(20);
    expect(opening).toHaveLength(4);
    expect(level.generators).toHaveLength(4);
    expect(level.generators?.map((generator) => generator.queueBlockIds.length)).toEqual([4, 4, 4, 4]);
    expect(level.generators?.map((generator) => generator.trigger)).toEqual(["move", "move", "move", "move"]);
    expect(level.flipDoors).toHaveLength(5);
    expect(level.blocks.filter((block) => queueIds.has(block.id) && (block.frozen ?? 0) > 0)).toEqual([]);
    expect(opening.filter((block) => block.color === "cyan" && block.shape.length === 2 && block.frozen === 1)).toHaveLength(2);
    expect(opening.filter((block) => block.color === "yellow" && block.shape.length === 3 && block.frozen === undefined)).toHaveLength(2);
    expect(openingAdjacencyIssues(level)).toEqual([]);
    expect(generatorSpawnAlignmentIssues(level)).toEqual([]);
    expect(finalGeneratorPlacementIssues(level)).toEqual([]);
    expect(compareCompetitorMechanismCountContract(level, lv156Contract).issues).toEqual([]);
    expect(() => validateLevel(level)).not.toThrow();
  });

  it("releases only the two generators beside the moved Lv156 preload", () => {
    const level = LEVELS[155]!;
    expect(releasePreload(level, "lv156-opening-b03", 2)).toEqual([3, 3, 4, 4]);
    expect(releasePreload(level, "lv156-opening-b04", 5)).toEqual([4, 4, 3, 3]);
  });

  it("fresh-solves and independently replays only the three repaired levels", () => {
    for (const levelId of GENERATOR_FROZEN_CARGO_REPAIR_LEVEL_IDS) {
      const level = LEVELS[levelId - 1]!;
      const solution = solveLevelForValidation(level, 20_000);
      expect(solution.staticUnsatReasons).toEqual([]);
      expect(solution.unsupportedReasons).toEqual([]);
      expect(solution.solved, `Lv${levelId}: ${solution.termination}/${solution.exploredStates}`).toBe(true);
      expect(replay(level, solution.drags), `Lv${levelId} replay`).toBe(true);
    }
  });
});
