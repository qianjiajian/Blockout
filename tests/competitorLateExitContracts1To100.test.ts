import { describe, expect, it } from "vitest";

import {
  applyCompetitorLateExitContract1To100,
  COMPETITOR_LATE_EXIT_CONTRACTS_1_TO_100_BLOCKERS,
  COMPETITOR_LATE_EXIT_CONTRACTS_1_TO_100_LEVEL_IDS,
} from "../src/core/competitorLateExitContracts1To100";
import { finalGeneratorPlacementIssues } from "../src/core/finalGeneratorContracts";
import { solveLevelForValidation, type SolverDrag } from "../src/core/levelSolver";
import {
  LEVELS,
  LEVELS_BEFORE_COMPETITOR_LATE_EXIT_CONTRACTS_1_TO_100,
} from "../src/core/levels";
import { openingVisibleBlockIds } from "../src/core/openingBlockCountRepairs";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import { VIDEO_PARITY_LEVELS } from "../src/core/videoParityLevels.generated";
import type { BlockSpec, LevelSpec, Point } from "../src/core/types";

const TARGET_IDS = [8,10,14,16,17,19,22,25,27,31,32,33,34,38,40,41,46,47,48,51,52,53,55,59,61,62,64,66,67,68,69,71,72,74,77,79,84,88,89,92,93,94,100];
const source = (): LevelSpec => LEVELS_BEFORE_COMPETITOR_LATE_EXIT_CONTRACTS_1_TO_100[63]!;
const repaired = (): LevelSpec => applyCompetitorLateExitContract1To100(source());
const outerColor = (block: BlockSpec): string => block.layers?.[0] ?? block.color;

const replay = (level: LevelSpec, drags: readonly SolverDrag[]): boolean => {
  const model = new PuzzleModel(level);
  model.start();
  model.startCountdown();
  for (const drag of drags) {
    if (!model.getBlock(drag.blockId)) return false;
    model.beginAction();
    for (const [x, y] of drag.path) if (!model.moveBlockStep(drag.blockId, x, y)) return false;
    if (drag.exitSide && !model.tryExit(drag.blockId, drag.exitSide).ok) return false;
    if (!model.commitAction()) return false;
  }
  const snapshot = model.snapshot();
  return snapshot.complete && snapshot.blocks.length === 0 && snapshot.queuedBlocks.length === 0;
};

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
  return [...issues];
};

describe("competitor exact late exit contracts Lv1-100", () => {
  it("keeps the safe set explicit and every other requested level blocked", () => {
    expect(COMPETITOR_LATE_EXIT_CONTRACTS_1_TO_100_LEVEL_IDS).toEqual([64]);
    const covered = new Set([
      ...COMPETITOR_LATE_EXIT_CONTRACTS_1_TO_100_LEVEL_IDS,
      ...COMPETITOR_LATE_EXIT_CONTRACTS_1_TO_100_BLOCKERS.map(({ levelId }) => levelId),
    ]);
    expect([...covered].sort((a, b) => a - b)).toEqual(TARGET_IDS);
  });

  it("is isolated and reference-idempotent", () => {
    expect(applyCompetitorLateExitContract1To100(LEVELS_BEFORE_COMPETITOR_LATE_EXIT_CONTRACTS_1_TO_100[62]!))
      .toBe(LEVELS_BEFORE_COMPETITOR_LATE_EXIT_CONTRACTS_1_TO_100[62]);
    const level = repaired();
    expect(level).not.toBe(source());
    expect(applyCompetitorLateExitContract1To100(level)).toBe(level);
    expect(applyCompetitorLateExitContract1To100(LEVELS[63]!)).toBe(LEVELS[63]);
  });

  it("restores Lv64 exact independent physical rails and counter multiset", () => {
    const level = repaired();
    const raw = VIDEO_PARITY_LEVELS[63]!;
    expect(level.gates.map(({ side, offset, size }) => ({ side, offset, size })))
      .toEqual(raw.gates.map(({ side, offset, size }) => ({ side, offset, size })));
    expect(level.gates.filter((gate) => !gate.star && !gate.frozen)).toHaveLength(1);
    expect(level.gates.filter((gate) => gate.star)).toHaveLength(0);
    expect(level.gates.flatMap((gate) => gate.frozen ? [gate.frozen] : []).sort((a, b) => a - b))
      .toEqual([3, 6, 8, 16, 17, 22]);
    expect(level.gates).toHaveLength(7);
    expect(new Set(level.gates.map((gate) => gate.id))).toHaveLength(7);
    expect(level.flipDoors ?? []).toHaveLength(0);
    expect(() => validateLevel(level)).not.toThrow();
    expect(finalGeneratorPlacementIssues(level)).toEqual([]);
    expect(openingAdjacency(level)).toEqual([]);
    const queued = new Set((level.generators ?? []).flatMap((generator) => generator.queueBlockIds));
    expect(level.blocks.filter((block) => queued.has(block.id) && (block.frozen ?? 0) > 0)).toEqual([]);
  });

  it("fresh-solves and replays the accepted candidate within 30,000 states", () => {
    const level = repaired();
    const solution = solveLevelForValidation(level, 30_000);
    expect(solution.solved, `${solution.termination}/${solution.exploredStates}`).toBe(true);
    expect(solution.exploredStates).toBeLessThanOrEqual(30_000);
    expect(replay(level, solution.drags)).toBe(true);
  });
});
