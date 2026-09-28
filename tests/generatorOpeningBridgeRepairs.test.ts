// @ts-expect-error The app tsconfig excludes Node ambient types; Vitest runs in Node.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  compareCompetitorMechanismCountContract,
  extractCompetitorMechanismCountContracts,
} from "../src/core/competitorMechanismCountContract";
import {
  applyGeneratorOpeningBridgeRepair,
  GENERATOR_OPENING_BRIDGE_REPAIR_LEVEL_IDS,
  GENERATOR_OPENING_BRIDGE_REPAIR_VERSION,
} from "../src/core/generatorOpeningBridgeRepairs";
import { generatorSpawnAlignmentIssues } from "../src/core/generatorSpawnAlignmentRepairs";
import { solveLevelForValidation, type SolverDrag } from "../src/core/levelSolver";
import { LEVELS, LEVELS_BEFORE_GENERATOR_OPENING_BRIDGE_REPAIR } from "../src/core/levels";
import { openingVisibleBlockIds } from "../src/core/openingBlockCountRepairs";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import { auditOrdinaryShutterCoverage } from "../src/core/shutterCoverage";
import { shutterHasPhysicalFootprint, type BlockSpec, type LevelSpec } from "../src/core/types";

const truthPaths = [
  new URL("../deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json", import.meta.url),
  new URL("../deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-truth-v1.json", import.meta.url),
] as const;
const contractById = new Map(truthPaths.flatMap((path) => extractCompetitorMechanismCountContracts(
  JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, "")),
)).map((contract) => [contract.levelId, contract] as const));

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
      if (!(distance === 1 ? model.moveBlockStep(drag.blockId, x, y) : model.moveBlock(drag.blockId, x, y))) return false;
    }
    if (drag.exitSide && !model.tryExit(drag.blockId, drag.exitSide).ok) return false;
    if (!model.commitAction()) return false;
  }
  const snapshot = model.snapshot();
  return snapshot.complete && snapshot.blocks.length === 0 && snapshot.queuedBlocks.length === 0;
};

describe(`generator opening bridges ${GENERATOR_OPENING_BRIDGE_REPAIR_VERSION}`, () => {
  it("integrates only Lv71/Lv183 and preserves machine, queue and player-facing mechanism contracts", () => {
    expect(GENERATOR_OPENING_BRIDGE_REPAIR_LEVEL_IDS).toEqual([71, 183]);
    for (const levelId of GENERATOR_OPENING_BRIDGE_REPAIR_LEVEL_IDS) {
      const source = LEVELS_BEFORE_GENERATOR_OPENING_BRIDGE_REPAIR[levelId - 1]!;
      const repaired = LEVELS[levelId - 1]!;
      expect(repaired).toEqual(applyGeneratorOpeningBridgeRepair(source));
      expect(applyGeneratorOpeningBridgeRepair(repaired)).toBe(repaired);
      expect(repaired.generators).toEqual(source.generators);
      expect(repaired.playable).toEqual(source.playable);
      expect((repaired.shutters ?? []).filter(shutterHasPhysicalFootprint))
        .toEqual((source.shutters ?? []).filter(shutterHasPhysicalFootprint));
      const contract = contractById.get(levelId)!;
      const beforeIssueFields = new Set(compareCompetitorMechanismCountContract(source, contract).issues
        .map((issue) => issue.field));
      const afterIssueFields = compareCompetitorMechanismCountContract(repaired, contract).issues
        .map((issue) => issue.field);
      expect(afterIssueFields.every((field) => beforeIssueFields.has(field)), `Lv${levelId}`).toBe(true);
    }
    expect(LEVELS[182]!.gates).toEqual(LEVELS_BEFORE_GENERATOR_OPENING_BRIDGE_REPAIR[182]!.gates);
  });

  it("matches the competitor opening, adjacency and exact centre-mouth contracts", () => {
    for (const [levelId, openingCount] of [[71, 11], [183, 14]] as const) {
      const level = LEVELS[levelId - 1]!;
      expect(openingVisibleBlockIds(level)).toHaveLength(openingCount);
      expect(adjacencyIssues(level)).toEqual([]);
      expect(generatorSpawnAlignmentIssues(level)).toEqual([]);
      expect(auditOrdinaryShutterCoverage(level)).toEqual([]);
      expect(() => validateLevel(level)).not.toThrow();
    }
  });

  it("fresh-solves and independently replays both bridge repairs", () => {
    for (const levelId of GENERATOR_OPENING_BRIDGE_REPAIR_LEVEL_IDS) {
      const level = LEVELS[levelId - 1]!;
      const solution = solveLevelForValidation(level, 20_000);
      expect(solution.staticUnsatReasons).toEqual([]);
      expect(solution.unsupportedReasons).toEqual([]);
      expect(solution.solved, `Lv${levelId}: ${solution.termination}/${solution.exploredStates}`).toBe(true);
      expect(solution.exploredStates).toBeLessThan(20_000);
      expect(replay(level, solution.drags)).toBe(true);
    }
  });
});
