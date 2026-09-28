// @ts-expect-error The app tsconfig excludes Node ambient types; Vitest runs in Node.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { extractRuntimeMechanismCountFacts } from "../src/core/competitorMechanismCountContract";
import { solveLevelForValidation, type SolverDrag } from "../src/core/levelSolver";
import {
  LEVELS,
  LEVELS_BEFORE_LEVEL41_GENERATOR_OPENING_BRIDGE_REPAIR,
  LEVELS_BEFORE_OPENING_BLOCK_COUNT_SECOND_BATCH_REPAIR,
} from "../src/core/levels";
import {
  applyOpeningBlockCountSecondBatchRepair,
  OPENING_BLOCK_COUNT_SECOND_BATCH_LEVEL_IDS,
  OPENING_BLOCK_COUNT_SECOND_BATCH_VERSION,
} from "../src/core/openingBlockCountSecondBatchRepairs";
import { openingVisibleBlockIds } from "../src/core/openingBlockCountRepairs";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import { auditOrdinaryShutterCoverage } from "../src/core/shutterCoverage";
import type { BlockSpec, LevelSpec } from "../src/core/types";

const TRUTH_PATHS = [
  new URL("../deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json", import.meta.url),
  new URL("../deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-truth-v1.json", import.meta.url),
] as const;
const expectedById = new Map(TRUTH_PATHS.flatMap((path) => (
  JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, "")).levels as any[]
)).map((row) => [Number(row.level), row.composition?.opening_piece_count as number | null]));
const withoutPlacement = ({ x: _x, y: _y, shutterId: _stage, ...block }: BlockSpec): object => block;

const adjacencyIssues = (level: LevelSpec): string[] => {
  const opening = new Set(openingVisibleBlockIds(level));
  const occupants = new Map<string, BlockSpec[]>();
  const blocks = level.blocks.filter((block) => opening.has(block.id));
  for (const block of blocks) for (const [dx, dy] of block.shape) {
    const key = `${block.x + dx},${block.y + dy}`;
    occupants.set(key, [...(occupants.get(key) ?? []), block]);
  }
  const pairs = new Set<string>();
  for (const block of blocks) for (const [dx, dy] of block.shape) {
    const x = block.x + dx, y = block.y + dy;
    for (const [sx, sy] of [[1, 0], [0, 1]] as const) for (const neighbour of occupants.get(`${x + sx},${y + sy}`) ?? []) {
      if (block.id !== neighbour.id && (block.layers?.[0] ?? block.color) === (neighbour.layers?.[0] ?? neighbour.color)) {
        pairs.add([block.id, neighbour.id].sort().join("|"));
      }
    }
  }
  return [...pairs];
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

describe(`opening block-count second batch ${OPENING_BLOCK_COUNT_SECOND_BATCH_VERSION}`, () => {
  it("keeps the six solver-certified levels explicit", () => {
    expect(OPENING_BLOCK_COUNT_SECOND_BATCH_LEVEL_IDS).toEqual([29, 51, 87, 152, 158, 200]);
    expect(applyOpeningBlockCountSecondBatchRepair(LEVELS[0]!)).toBe(LEVELS[0]);
  });

  it("matches exact opening counts while preserving every protected contract", () => {
    for (const levelId of OPENING_BLOCK_COUNT_SECOND_BATCH_LEVEL_IDS) {
      const source = LEVELS_BEFORE_OPENING_BLOCK_COUNT_SECOND_BATCH_REPAIR[levelId - 1]!;
      const repaired = applyOpeningBlockCountSecondBatchRepair(source);
      expect(LEVELS_BEFORE_LEVEL41_GENERATOR_OPENING_BRIDGE_REPAIR[levelId - 1], `Lv${levelId} integration`)
        .toEqual(repaired);
      expect(LEVELS[levelId - 1], `Lv${levelId} final integration`).toEqual(repaired);
      expect(openingVisibleBlockIds(repaired).length, `Lv${levelId} exact count`).toBe(expectedById.get(levelId));
      expect(adjacencyIssues(repaired), `Lv${levelId} adjacency`).toEqual([]);
      expect(() => validateLevel(repaired), `Lv${levelId} validate`).not.toThrow();
      expect(repaired.generators, `Lv${levelId} generators`).toEqual(source.generators);
      expect(repaired.gates, `Lv${levelId} gates`).toEqual(source.gates);
      expect(repaired.flipDoors, `Lv${levelId} flip doors`).toEqual(source.flipDoors);
      expect(repaired.width, `Lv${levelId} width`).toBe(source.width);
      expect(repaired.height, `Lv${levelId} height`).toBe(source.height);
      expect(repaired.playable, `Lv${levelId} playable`).toEqual(source.playable);
      expect(repaired.blocked, `Lv${levelId} blocked`).toEqual(source.blocked);
      expect(repaired.coloredGrids, `Lv${levelId} coloured grid`).toEqual(source.coloredGrids);
      expect(repaired.blocks.map(withoutPlacement), `Lv${levelId} block content`).toEqual(source.blocks.map(withoutPlacement));
      expect((repaired.shutters ?? []).filter((shutter) => shutter.skin !== "staging"), `Lv${levelId} player shutters`)
        .toEqual((source.shutters ?? []).filter((shutter) => shutter.skin !== "staging"));
      const physicalShutterIds = new Set((source.shutters ?? []).filter((shutter) => shutter.skin !== "staging").map((shutter) => shutter.id));
      source.blocks.forEach((block, index) => {
        if (block.shutterId && physicalShutterIds.has(block.shutterId)) {
          expect(repaired.blocks[index]?.shutterId, `Lv${levelId}/${block.id} player shutter binding`).toBe(block.shutterId);
        }
      });
      expect(auditOrdinaryShutterCoverage(repaired), `Lv${levelId} shutter coverage`)
        .toEqual(auditOrdinaryShutterCoverage(source));
      expect(extractRuntimeMechanismCountFacts(repaired), `Lv${levelId} mechanism facts`)
        .toEqual(extractRuntimeMechanismCountFacts(source));
      expect(applyOpeningBlockCountSecondBatchRepair(repaired), `Lv${levelId} idempotence`).toBe(repaired);
    }
  });

  it("fresh-solves and independently replays every repaired level", () => {
    for (const levelId of OPENING_BLOCK_COUNT_SECOND_BATCH_LEVEL_IDS) {
      const repaired = applyOpeningBlockCountSecondBatchRepair(
        LEVELS_BEFORE_OPENING_BLOCK_COUNT_SECOND_BATCH_REPAIR[levelId - 1]!,
      );
      const solution = solveLevelForValidation(repaired, 20_000);
      expect(solution.staticUnsatReasons, `Lv${levelId} static constraints`).toEqual([]);
      expect(solution.unsupportedReasons, `Lv${levelId} solver support`).toEqual([]);
      expect(solution.solved, `Lv${levelId}/${solution.termination}/${solution.exploredStates}`).toBe(true);
      expect(replay(repaired, solution.drags), `Lv${levelId} PuzzleModel replay`).toBe(true);
    }
  }, 120_000);
});
