import { describe, expect, it } from "vitest";

import {
  applyCompetitorExitStructuralBatchB,
  COMPETITOR_EXIT_STRUCTURAL_BATCH_B_ASSIGNED_LEVEL_IDS,
  COMPETITOR_EXIT_STRUCTURAL_BATCH_B_BLOCKERS,
  COMPETITOR_EXIT_STRUCTURAL_BATCH_B_CONTRACTS,
  COMPETITOR_EXIT_STRUCTURAL_BATCH_B_LEVEL_IDS,
} from "../src/core/competitorExitStructuralBatchB";
import { LEVELS_BEFORE_COMPETITOR_EXIT_STRUCTURAL_BATCH_A } from "../src/core/levels";

describe("competitor exit structural repair batch B", () => {
  it("publishes no uncertified candidate and keeps every assigned blocker explicit", () => {
    expect(COMPETITOR_EXIT_STRUCTURAL_BATCH_B_LEVEL_IDS).toEqual([]);
    expect(COMPETITOR_EXIT_STRUCTURAL_BATCH_B_ASSIGNED_LEVEL_IDS).toEqual([31, 32, 33, 40, 46, 47, 48]);
    expect(COMPETITOR_EXIT_STRUCTURAL_BATCH_B_BLOCKERS.map(({ levelId }) => levelId))
      .toEqual(COMPETITOR_EXIT_STRUCTURAL_BATCH_B_ASSIGNED_LEVEL_IDS);
  });

  it("locks the truth-v6/raw independent-mouth and counter contracts", () => {
    expect(COMPETITOR_EXIT_STRUCTURAL_BATCH_B_CONTRACTS).toEqual([
      { levelId: 31, ordinaryCount: 1, frozenValues: [2, 10, 13], starCount: 0, physicalMouthCount: 4 },
      { levelId: 32, ordinaryCount: 1, frozenValues: [8, 8, 8], starCount: 0, physicalMouthCount: 4 },
      { levelId: 33, ordinaryCount: 2, frozenValues: [5, 10, 10, 16, 18], starCount: 0, physicalMouthCount: 7 },
      { levelId: 40, ordinaryCount: 1, frozenValues: [1, 2, 3, 4, 6], starCount: 0, physicalMouthCount: 6 },
      { levelId: 46, ordinaryCount: 6, frozenValues: [2, 5], starCount: 0, physicalMouthCount: 8 },
      { levelId: 47, ordinaryCount: 1, frozenValues: [4, 9, 12, 23], starCount: 0, physicalMouthCount: 5 },
      { levelId: 48, ordinaryCount: 1, frozenValues: [2, 5, 7, 13, 15, 18, 21, 22], starCount: 0, physicalMouthCount: 9 },
    ]);
  });

  it("is a strict reference-preserving no-op for blocked and unrelated levels", () => {
    for (const level of LEVELS_BEFORE_COMPETITOR_EXIT_STRUCTURAL_BATCH_A) {
      expect(applyCompetitorExitStructuralBatchB(level)).toBe(level);
    }
  });
});
