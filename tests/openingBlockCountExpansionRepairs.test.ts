// @ts-expect-error The app tsconfig excludes Node ambient types; Vitest runs in Node.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { extractRuntimeMechanismCountFacts } from "../src/core/competitorMechanismCountContract";
import { solveLevelForValidation, type SolverDrag } from "../src/core/levelSolver";
import { LEVELS, LEVELS_BEFORE_OPENING_BLOCK_COUNT_EXPANSION_REPAIR } from "../src/core/levels";
import {
  applyOpeningBlockCountExpansionRepair,
  OPENING_BLOCK_COUNT_EXPANSION_LEVEL_IDS,
  OPENING_BLOCK_COUNT_EXPANSION_VERSION,
} from "../src/core/openingBlockCountExpansionRepairs";
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
)).map((row) => [Number(row.level), Number(row.composition?.opening_piece_count)]));
const pointKey = (x: number, y: number): string => `${x},${y}`;
const withoutPlacement = ({ x: _x, y: _y, shutterId: _stage, ...block }: BlockSpec): object => block;

const adjacencyIssues = (level: LevelSpec): string[] => {
  const opening = new Set(openingVisibleBlockIds(level));
  const blocks = level.blocks.filter((block) => opening.has(block.id));
  const occupants = new Map<string, BlockSpec[]>();
  for (const block of blocks) for (const [dx, dy] of block.shape) {
    const cell = pointKey(block.x + dx, block.y + dy);
    occupants.set(cell, [...(occupants.get(cell) ?? []), block]);
  }
  const pairs = new Set<string>();
  for (const block of blocks) for (const [dx, dy] of block.shape) {
    const x = block.x + dx, y = block.y + dy;
    for (const [sx, sy] of [[1, 0], [0, 1]] as const) for (const neighbour of occupants.get(pointKey(x + sx, y + sy)) ?? []) {
      if (block.id !== neighbour.id && (block.layers?.[0] ?? block.color) === (neighbour.layers?.[0] ?? neighbour.color)) {
        pairs.add([block.id, neighbour.id].sort().join(":"));
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

describe(`opening block count expansion ${OPENING_BLOCK_COUNT_EXPANSION_VERSION}`, () => {
  it("keeps the 76-level solver-certified cohort explicit", () => {
    expect(OPENING_BLOCK_COUNT_EXPANSION_LEVEL_IDS).toEqual([
      24, 25, 26, 27, 28, 30, 31, 32, 38, 39, 40, 44, 46, 47, 48, 49, 53, 54,
      55, 57, 59, 61, 62, 64, 66, 67, 68, 69, 72, 73, 74, 75, 77, 79, 89, 91,
      94, 98, 99, 100, 102, 110, 116, 118, 119, 120, 122, 123, 126, 132, 134, 135,
      137, 142, 146, 151, 153, 155, 162, 170, 172, 174, 175, 177, 179, 180, 184,
      186, 187, 188, 189, 194, 195, 196, 197, 198,
    ]);
    expect(applyOpeningBlockCountExpansionRepair(LEVELS_BEFORE_OPENING_BLOCK_COUNT_EXPANSION_REPAIR[0]!))
      .toBe(LEVELS_BEFORE_OPENING_BLOCK_COUNT_EXPANSION_REPAIR[0]);
  });

  it("matches competitor opening counts without changing player-facing mechanism facts", () => {
    for (const levelId of OPENING_BLOCK_COUNT_EXPANSION_LEVEL_IDS) {
      const source = LEVELS_BEFORE_OPENING_BLOCK_COUNT_EXPANSION_REPAIR[levelId - 1]!;
      const repaired = applyOpeningBlockCountExpansionRepair(source);
      expect(LEVELS[levelId - 1], `Lv${levelId} production integration`).toEqual(repaired);
      const expected = expectedById.get(levelId);
      expect(openingVisibleBlockIds(repaired).length, `Lv${levelId} opening count`).toBe(expected);
      expect(adjacencyIssues(repaired), `Lv${levelId} adjacency`).toEqual([]);
      expect(() => validateLevel(repaired), `Lv${levelId} validation`).not.toThrow();
      expect(repaired.generators, `Lv${levelId} generators`).toEqual(source.generators);
      expect(repaired.gates, `Lv${levelId} gates`).toEqual(source.gates);
      expect(repaired.flipDoors, `Lv${levelId} flip doors`).toEqual(source.flipDoors);
      expect(repaired.blocks.map(withoutPlacement), `Lv${levelId} block content`).toEqual(source.blocks.map(withoutPlacement));
      expect((repaired.shutters ?? []).filter((shutter) => shutter.skin !== "staging"), `Lv${levelId} physical shutters`)
        .toEqual((source.shutters ?? []).filter((shutter) => shutter.skin !== "staging"));
      expect(auditOrdinaryShutterCoverage(repaired), `Lv${levelId} shutter coverage`)
        .toEqual(auditOrdinaryShutterCoverage(source));
      expect(extractRuntimeMechanismCountFacts(repaired), `Lv${levelId} mechanism facts`)
        .toEqual(extractRuntimeMechanismCountFacts(source));
      expect(applyOpeningBlockCountExpansionRepair(repaired), `Lv${levelId} idempotence`).toBe(repaired);
    }
  });

  it("fresh-solves and independently replays all 76 repaired levels", () => {
    for (const levelId of OPENING_BLOCK_COUNT_EXPANSION_LEVEL_IDS) {
      const repaired = LEVELS[levelId - 1]!;
      const solution = solveLevelForValidation(repaired, 20_000);
      expect(solution.staticUnsatReasons, `Lv${levelId} static constraints`).toEqual([]);
      expect(solution.unsupportedReasons, `Lv${levelId} solver support`).toEqual([]);
      expect(solution.solved, `Lv${levelId}/${solution.termination}/${solution.exploredStates}`).toBe(true);
      expect(replay(repaired, solution.drags), `Lv${levelId} PuzzleModel replay`).toBe(true);
    }
  }, 120_000);
});
