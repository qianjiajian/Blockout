// @ts-expect-error The app tsconfig excludes Node ambient types; Vitest runs in Node.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  applyCompetitorLateExitStructuralBatchF,
  buildCompetitorLateExitLv120RejectedCandidate,
  COMPETITOR_LATE_EXIT_LV120_BLOCKS,
  COMPETITOR_LATE_EXIT_LV120_GATES,
  COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_F_BLOCKERS,
  COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_F_CERTIFIED_LEVEL_IDS,
  COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_F_REQUESTED_LEVEL_IDS,
  COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_F_USES_STAGING_FALLBACK,
} from "../src/core/competitorLateExitStructuralBatchF";
import {
  compareCompetitorMechanismCountContract,
  extractCompetitorMechanismCountContracts,
  extractRuntimeMechanismCountFacts,
} from "../src/core/competitorMechanismCountContract";
import { LEVELS } from "../src/core/levels";
import { solveLevelForValidation, type SolverDrag } from "../src/core/levelSolver";
import { openingVisibleBlockIds } from "../src/core/openingBlockCountRepairs";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import type { BlockSpec, LevelSpec, Point } from "../src/core/types";

const truth = JSON.parse(readFileSync(new URL(
  "../deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-truth-v1.json",
  import.meta.url,
), "utf8")) as unknown;
const contract = extractCompetitorMechanismCountContracts(truth)
  .find(({ levelId }) => levelId === 120)!;

const source = (): LevelSpec => LEVELS[119]!;
const rejectedCandidate = (): LevelSpec => buildCompetitorLateExitLv120RejectedCandidate(source());
const outerColor = (block: BlockSpec): string => block.layers?.[0] ?? block.color;

const adjacencyIssues = (level: LevelSpec): string[] => {
  const occupied = new Map<string, BlockSpec>();
  for (const block of level.blocks) for (const [dx, dy] of block.shape) {
    occupied.set(`${block.x + dx},${block.y + dy}`, block);
  }
  const issues = new Set<string>();
  for (const [key, block] of occupied) {
    const [x, y] = key.split(",").map(Number);
    for (const [dx, dy] of [[1, 0], [0, 1]] as Point[]) {
      const other = occupied.get(`${x! + dx},${y! + dy}`);
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
    if (!model.getBlock(drag.blockId)) return false;
    model.beginAction();
    for (const [x, y] of drag.path) {
      const block = model.getBlock(drag.blockId);
      if (!block) return false;
      const moved = Math.abs(block.x - x) + Math.abs(block.y - y) === 1
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

describe("competitor late exit structural batch F", () => {
  it("keeps all ten levels blocked until exact source parity also passes every hard gate", () => {
    expect(COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_F_REQUESTED_LEVEL_IDS)
      .toEqual([102, 104, 106, 108, 110, 113, 118, 120, 123, 124]);
    expect(COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_F_CERTIFIED_LEVEL_IDS).toEqual([]);
    expect(COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_F_USES_STAGING_FALLBACK).toBe(false);
    expect(COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_F_BLOCKERS.map(({ levelId }) => levelId))
      .toEqual([102, 104, 106, 108, 110, 113, 118, 120, 123, 124]);
    expect(COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_F_BLOCKERS.every(({ evidence }) => evidence.length >= 3))
      .toBe(true);
    expect(applyCompetitorLateExitStructuralBatchF(LEVELS[118]!)).toBe(LEVELS[118]);
    expect(applyCompetitorLateExitStructuralBatchF(LEVELS[119]!)).toBe(LEVELS[119]);
    expect(applyCompetitorLateExitStructuralBatchF(LEVELS[120]!)).toBe(LEVELS[120]);
  });

  it("retains the rejected exact Lv120 opening, six shells and three bomb anchors as evidence", () => {
    const level = rejectedCandidate();
    expect(level).toMatchObject({ id: 120, width: 6, height: 8 });
    expect(level.playable).toEqual(source().playable);
    expect(openingVisibleBlockIds(level)).toHaveLength(11);
    expect(level.blocks).toHaveLength(11);
    expect(level.blocks.map(({ id, x, y, color, layers, timedBombSeconds }) => ({
      id, x, y, color, layers, timedBombSeconds,
    }))).toEqual(level.blocks.map(({ id }) => {
      const binding = COMPETITOR_LATE_EXIT_LV120_BLOCKS[id]!;
      return {
        id,
        x: binding.x,
        y: binding.y,
        color: binding.color,
        layers: binding.inner ? [binding.color, binding.inner] : undefined,
        timedBombSeconds: binding.timedBombSeconds,
      };
    }));
    expect(level.blocks.filter(({ layers }) => layers?.length === 2)).toHaveLength(6);
    expect(level.blocks.filter(({ timedBombSeconds }) => timedBombSeconds !== undefined)
      .map(({ x, y, timedBombSeconds }) => [x, y, timedBombSeconds]))
      .toEqual([[2, 2, 15], [4, 4, 25], [0, 6, 50]]);
  });

  it("retains the four video-observed rails and exact mechanism contract", () => {
    const level = rejectedCandidate();
    expect(level.gates).toEqual(COMPETITOR_LATE_EXIT_LV120_GATES);
    expect(level.flipDoors ?? []).toEqual([]);
    expect(extractRuntimeMechanismCountFacts(level)).toMatchObject({
      ordinaryExitCount: 1,
      frozenExitCount: 3,
      frozenExitValues: [4, 6, 10],
      shellBlockCount: 6,
      bombCount: 3,
    });
    expect(compareCompetitorMechanismCountContract(level, contract).issues).toEqual([]);
  });

  it("rejects the otherwise valid candidate for its exact source adjacency conflict", () => {
    const level = rejectedCandidate();
    expect(adjacencyIssues(level)).toEqual(["lv120-opening-b08/lv120-opening-b11"]);
    expect(() => validateLevel(level)).not.toThrow();
    expect(applyCompetitorLateExitStructuralBatchF(level)).toBe(level);
  });

  it("fresh-solves and replays the rejected exact opening without publishing it", () => {
    const level = rejectedCandidate();
    const solution = solveLevelForValidation(level, 120_000);
    expect(solution.staticUnsatReasons).toEqual([]);
    expect(solution.unsupportedReasons).toEqual([]);
    expect(solution.solved, `${solution.termination}/${solution.exploredStates}`).toBe(true);
    expect(solution.exploredStates).toBeLessThanOrEqual(120_000);
    expect(replay(level, solution.drags)).toBe(true);
  }, 120_000);
});
