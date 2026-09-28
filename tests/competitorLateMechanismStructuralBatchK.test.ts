import { describe, expect, it } from "vitest";

import {
  applyCompetitorLateMechanismStructuralBatchK,
  COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_K_BLOCKERS,
  COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_K_CERTIFIED_LEVEL_IDS,
  COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_K_RAW_AUDITS,
  COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_K_REQUESTED_LEVEL_IDS,
  COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_K_USES_STAGING_FALLBACK,
  COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_K_VERSION,
} from "../src/core/competitorLateMechanismStructuralBatchK";
import { LEVELS } from "../src/core/levels";
import { solveLevelForValidation } from "../src/core/levelSolver";
import { validateLevel } from "../src/core/PuzzleModel";
import { auditOrdinaryShutterCoverage } from "../src/core/shutterCoverage";
import type { BlockSpec, LevelSpec, Point } from "../src/core/types";
import { VIDEO_PARITY_LEVELS_101_TO_200 } from "../src/core/videoParityLevels101To200.generated";

const outerColour = (block: BlockSpec): string => block.layers?.[0] ?? block.color;

/**
 * This deliberately scans every source block, including closed-cover cargo.
 * Batch K cannot claim that a bad source projection is adjacency-clean merely
 * because its conflicting cargo is hidden at the opening.
 */
const allBlockAdjacencyPairs = (level: LevelSpec): string[] => {
  const occupied = new Map<string, BlockSpec>();
  for (const block of level.blocks) {
    for (const [dx, dy] of block.shape) occupied.set(`${block.x + dx},${block.y + dy}`, block);
  }
  const pairs = new Set<string>();
  for (const [cell, block] of occupied) {
    const [x, y] = cell.split(",").map(Number);
    for (const [dx, dy] of [[1, 0], [0, 1]] as readonly Point[]) {
      const other = occupied.get(`${x! + dx},${y! + dy}`);
      if (other && other.id !== block.id && outerColour(other) === outerColour(block)) {
        pairs.add([block.id, other.id].sort().join("/"));
      }
    }
  }
  return [...pairs].sort();
};

describe(`competitor late mechanism structural batch K ${COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_K_VERSION}`, () => {
  it("publishes no speculative repair and records every requested level as blocked", () => {
    expect(COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_K_REQUESTED_LEVEL_IDS)
      .toEqual([160, 163, 164, 165, 166, 167, 169, 170, 171, 172, 173, 174]);
    expect(COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_K_CERTIFIED_LEVEL_IDS).toEqual([]);
    expect(COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_K_USES_STAGING_FALLBACK).toBe(false);
    expect(COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_K_BLOCKERS.map(({ levelId }) => levelId))
      .toEqual(COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_K_REQUESTED_LEVEL_IDS);
    for (const blocker of COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_K_BLOCKERS) {
      expect(blocker.kinds.length, `Lv${blocker.levelId} blocker classes`).toBeGreaterThan(1);
      expect(blocker.reason.length, `Lv${blocker.levelId} blocker detail`).toBeGreaterThan(180);
      expect(blocker.evidence.length, `Lv${blocker.levelId} evidence`).toBeGreaterThanOrEqual(4);
    }
  });

  it("is a reference-idempotent no-op for final runtime and never creates fallback data", () => {
    for (const levelId of COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_K_REQUESTED_LEVEL_IDS) {
      const source = LEVELS[levelId - 1]!;
      expect(source.id).toBe(levelId);
      expect(() => validateLevel(source), `Lv${levelId} runtime validation`).not.toThrow();
      expect(applyCompetitorLateMechanismStructuralBatchK(source)).toBe(source);
      expect(applyCompetitorLateMechanismStructuralBatchK(
        applyCompetitorLateMechanismStructuralBatchK(source),
      )).toBe(source);
    }
    expect(applyCompetitorLateMechanismStructuralBatchK(LEVELS[0]!)).toBe(LEVELS[0]);
  });

  it("reproduces the untouched source-projection rejection audit", () => {
    expect(COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_K_RAW_AUDITS.map(({ levelId }) => levelId))
      .toEqual(COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_K_REQUESTED_LEVEL_IDS);

    for (const expected of COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_K_RAW_AUDITS) {
      const raw = VIDEO_PARITY_LEVELS_101_TO_200[expected.levelId - 101]!;
      expect(raw.id).toBe(expected.levelId);
      expect(() => validateLevel(raw), `Lv${expected.levelId} raw validation`).not.toThrow();
      expect(allBlockAdjacencyPairs(raw), `Lv${expected.levelId} all-block adjacency`)
        .toHaveLength(expected.allBlockAdjacencyPairCount);
      expect(auditOrdinaryShutterCoverage(raw), `Lv${expected.levelId} physical cover audit`)
        .toHaveLength(expected.physicalCoverageIssueCount);

      const solution = solveLevelForValidation(raw, 30_000);
      expect(solution.staticUnsatReasons, `Lv${expected.levelId} static reasons`)
        .toHaveLength(expected.staticUnsatReasonCount);
      expect(solution.termination, `Lv${expected.levelId} termination`).toBe(expected.termination);
      expect(solution.exploredStates, `Lv${expected.levelId} explored states`).toBe(expected.exploredStates);
      expect(solution.solved, `Lv${expected.levelId} solved`).toBe(false);
      expect(solution.drags, `Lv${expected.levelId} replay route`).toEqual([]);
    }
  });

  it("retains the two decisive non-numeric blockers instead of guessing around them", () => {
    const lv163 = COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_K_BLOCKERS
      .find(({ levelId }) => levelId === 163)!;
    expect(lv163.kinds).toContain("exact-portal-overlap");

    const lv171 = COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_K_BLOCKERS
      .find(({ levelId }) => levelId === 171)!;
    expect(lv171.kinds).toContain("runtime-model-gap");
    expect(COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_K_RAW_AUDITS
      .find(({ levelId }) => levelId === 171)?.physicalCoverageIssueCount).toBe(3);
  });
});
