import { describe, expect, it } from "vitest";

import {
  applyCompetitorMidExitStructuralBatchE,
  COMPETITOR_MID_EXIT_STRUCTURAL_BATCH_E_BLOCKERS,
  COMPETITOR_MID_EXIT_STRUCTURAL_BATCH_E_CERTIFIED_LEVEL_IDS,
  COMPETITOR_MID_EXIT_STRUCTURAL_BATCH_E_REQUESTED_LEVEL_IDS,
  COMPETITOR_MID_EXIT_STRUCTURAL_BATCH_E_USES_STAGING_FALLBACK,
} from "../src/core/competitorMidExitStructuralBatchE";
import { LEVELS } from "../src/core/levels";

describe("competitor mid exit structural batch E", () => {
  it("keeps the complete requested scope and publishes no uncertified level", () => {
    expect(COMPETITOR_MID_EXIT_STRUCTURAL_BATCH_E_REQUESTED_LEVEL_IDS)
      .toEqual([77, 79, 84, 88, 89, 92, 93, 94]);
    expect(COMPETITOR_MID_EXIT_STRUCTURAL_BATCH_E_CERTIFIED_LEVEL_IDS).toEqual([]);
    expect(COMPETITOR_MID_EXIT_STRUCTURAL_BATCH_E_USES_STAGING_FALLBACK).toBe(false);
    expect(COMPETITOR_MID_EXIT_STRUCTURAL_BATCH_E_BLOCKERS.map(({ levelId }) => levelId))
      .toEqual([77, 79, 84, 88, 89, 92, 93, 94]);
  });

  it("keeps every blocker source-backed and explicit", () => {
    expect(COMPETITOR_MID_EXIT_STRUCTURAL_BATCH_E_BLOCKERS.every(({ kinds, detail, evidence }) => (
      kinds.length >= 1 && detail.length >= 80 && evidence.length >= 4
    ))).toBe(true);
    expect(COMPETITOR_MID_EXIT_STRUCTURAL_BATCH_E_BLOCKERS.flatMap(({ kinds }) => kinds))
      .toContain("fresh-solver-not-certified");
    expect(COMPETITOR_MID_EXIT_STRUCTURAL_BATCH_E_BLOCKERS.flatMap(({ kinds }) => kinds))
      .toContain("physical-panel-capacity-conflict");
  });

  it("is a strict reference-preserving no-op for requested and unrelated levels", () => {
    for (const levelId of COMPETITOR_MID_EXIT_STRUCTURAL_BATCH_E_REQUESTED_LEVEL_IDS) {
      expect(applyCompetitorMidExitStructuralBatchE(LEVELS[levelId - 1]!)).toBe(LEVELS[levelId - 1]);
    }
    expect(applyCompetitorMidExitStructuralBatchE(LEVELS[0]!)).toBe(LEVELS[0]);
  });
});
