import { describe, expect, it } from "vitest";

import {
  applyCompetitorEarlyExitStructuralBatchB,
  COMPETITOR_EARLY_EXIT_STRUCTURAL_BATCH_B_BLOCKERS,
  COMPETITOR_EARLY_EXIT_STRUCTURAL_BATCH_B_LEVEL_IDS,
} from "../src/core/competitorEarlyExitStructuralBatchB";
import { extractRuntimeMechanismCountFacts } from "../src/core/competitorMechanismCountContract";
import { solveLevelForValidation, type SolverDrag } from "../src/core/levelSolver";
import {
  LEVELS,
  LEVELS_BEFORE_COMPETITOR_EARLY_EXIT_STRUCTURAL_BATCH_B,
} from "../src/core/levels";
import { openingVisibleBlockIds } from "../src/core/openingBlockCountRepairs";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import type { BlockSpec, LevelSpec, Point } from "../src/core/types";

const source = (): LevelSpec => LEVELS_BEFORE_COMPETITOR_EARLY_EXIT_STRUCTURAL_BATCH_B[26]!;
const repaired = (): LevelSpec => applyCompetitorEarlyExitStructuralBatchB(source());
const outerColor = (block: BlockSpec): string => block.layers?.[0] ?? block.color;

const openingAdjacency = (level: LevelSpec): string[] => {
  const opening = new Set(openingVisibleBlockIds(level));
  const occupied = new Map<string, BlockSpec>();
  for (const block of level.blocks.filter(({ id }) => opening.has(id))) {
    for (const [dx, dy] of block.shape) occupied.set(`${block.x + dx},${block.y + dy}`, block);
  }
  const issues = new Set<string>();
  for (const [key, block] of occupied) {
    const [xValue, yValue] = key.split(",").map(Number);
    const x = xValue!;
    const y = yValue!;
    for (const [dx, dy] of [[1, 0], [0, 1]] as Point[]) {
      const other = occupied.get(`${x + dx},${y + dy}`);
      if (other && other.id !== block.id && outerColor(other) === outerColor(block)) {
        issues.add([block.id, other.id].sort().join("/"));
      }
    }
  }
  return [...issues].sort();
};

const replay = (level: LevelSpec, drags: readonly SolverDrag[]): boolean => {
  const model = new PuzzleModel(level);
  model.start();
  model.startCountdown();
  for (const drag of drags) {
    model.beginAction();
    for (const [x, y] of drag.path) if (!model.moveBlockStep(drag.blockId, x, y)) return false;
    if (drag.exitSide && !model.tryExit(drag.blockId, drag.exitSide).ok) return false;
    if (!model.commitAction()) return false;
  }
  const snapshot = model.snapshot();
  return snapshot.complete && snapshot.blocks.length === 0 && snapshot.queuedBlocks.length === 0;
};

describe("competitor early exit structural batch B", () => {
  it("keeps the certified level and unresolved blockers explicit", () => {
    expect(COMPETITOR_EARLY_EXIT_STRUCTURAL_BATCH_B_LEVEL_IDS).toEqual([27]);
    expect(COMPETITOR_EARLY_EXIT_STRUCTURAL_BATCH_B_BLOCKERS.map(({ levelId }) => levelId))
      .toEqual([14, 16, 25]);
  });

  it("is isolated and reference-idempotent", () => {
    expect(applyCompetitorEarlyExitStructuralBatchB(LEVELS[25]!)).toBe(LEVELS[25]);
    const level = repaired();
    expect(applyCompetitorEarlyExitStructuralBatchB(level)).toBe(level);
    expect(level.id).toBe(27);
    expect(LEVELS[26]).toEqual(level);
  });

  it("restores the source T-board mouths, counters, opening and revealed H3 sequence", () => {
    const before = source();
    const level = repaired();
    expect(level.width).toBe(6);
    expect(level.height).toBe(9);
    expect(level.playable).toEqual(before.playable);
    expect(level.shutters).toEqual(before.shutters);
    expect(level.shutters).toEqual([expect.objectContaining({ x: 0, y: 0, width: 3, height: 9, count: 9 })]);
    expect(level.blocks.map(({ id, x, y, shape, shutterId }) => ({ id, x, y, shape, shutterId })))
      .toEqual(before.blocks.map(({ id, x, y, shape, shutterId }) => ({ id, x, y, shape, shutterId })));

    expect(level.gates).toEqual([
      expect.objectContaining({ color: "blue", side: "top", offset: 3, size: 1, portals: [{ side: "top", origin: [3, 3], size: 1 }] }),
      expect.objectContaining({ color: "cyan", side: "right", offset: 4, size: 1, portals: [{ side: "right", origin: [5, 4], size: 1 }] }),
      expect.objectContaining({ color: "pink", side: "left", offset: 3, size: 1, frozen: 13, portals: [{ side: "left", origin: [0, 3], size: 1 }] }),
      expect.objectContaining({ color: "purple", side: "left", offset: 5, size: 1, frozen: 13, portals: [{ side: "left", origin: [0, 5], size: 1 }] }),
      expect.objectContaining({ color: "green", side: "left", offset: 8, size: 1, frozen: 10, portals: [{ side: "left", origin: [0, 8], size: 1 }] }),
    ]);
    expect(level.flipDoors ?? []).toEqual([]);

    const colors = new Map(level.blocks.map((block) => [block.id, block.color]));
    expect([3, 4, 5].flatMap((y) => [3, 4, 5].map((x) => (
      level.blocks.find((block) => block.x === x && block.y === y && block.shape.length === 1)!.color
    )))).toEqual(["blue", "cyan", "blue", "cyan", "blue", "cyan", "blue", "cyan", "blue"]);
    expect(Array.from({ length: 9 }, (_, index) => colors.get(`cc-027-b2-0${index + 1}`)))
      .toEqual(["pink", "green", "pink", "purple", "green", "cyan", "green", "pink", "purple"]);
    expect(new Set(level.blocks.map(({ color }) => color))).toEqual(new Set(["blue", "cyan", "pink", "green", "purple"]));

    const facts = extractRuntimeMechanismCountFacts(level);
    expect(facts).toMatchObject({
      ordinaryExitCount: 2,
      frozenExitCount: 3,
      frozenExitValues: [10, 13, 13],
    });
    expect(openingVisibleBlockIds(level)).toHaveLength(9);
    expect(openingAdjacency(level)).toEqual([]);
    expect(() => validateLevel(level)).not.toThrow();
  });

  it("fresh-solves within 30,000 states and independently replays", () => {
    const level = repaired();
    const solution = solveLevelForValidation(level, 30_000);
    expect(solution.staticUnsatReasons).toEqual([]);
    expect(solution.unsupportedReasons).toEqual([]);
    expect(solution).toMatchObject({
      solved: true,
      termination: "solved",
      exploredStates: 20_504,
      minimumDrags: 32,
      clearLoad: 18,
    });
    expect(replay(level, solution.drags)).toBe(true);
  }, 30_000);
});
