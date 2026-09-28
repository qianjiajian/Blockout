import { describe, expect, it } from "vitest";

import {
  applyCompetitorLateExitStructuralBatchG,
  COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_G_BLOCKERS,
  COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_G_CERTIFIED_LEVEL_IDS,
  COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_G_LV135_EXACT_PANEL_AUDIT,
  COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_G_RAW_AUDITS,
  COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_G_REQUESTED_LEVEL_IDS,
  COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_G_USES_STAGING_FALLBACK,
  COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_G_VERSION,
} from "../src/core/competitorLateExitStructuralBatchG";
import { LEVELS } from "../src/core/levels";
import { validateLevel } from "../src/core/PuzzleModel";

describe(`competitor late exit structural batch G ${COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_G_VERSION}`, () => {
  it("keeps the complete requested set blocked without fallback claims", () => {
    expect(COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_G_REQUESTED_LEVEL_IDS)
      .toEqual([126, 128, 131, 134, 135, 138, 139, 140, 145, 146]);
    expect(COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_G_CERTIFIED_LEVEL_IDS).toEqual([]);
    expect(COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_G_BLOCKERS.map(({ levelId }) => levelId))
      .toEqual(COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_G_REQUESTED_LEVEL_IDS);
    expect(COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_G_USES_STAGING_FALLBACK).toBe(false);
  });

  it("records a failed raw projection certificate for every requested level", () => {
    expect(COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_G_RAW_AUDITS.map(({ levelId }) => levelId))
      .toEqual(COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_G_REQUESTED_LEVEL_IDS);
    for (const audit of COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_G_RAW_AUDITS) {
      expect(audit.staticUnsatReasonCount, `Lv${audit.levelId} static blockers`).toBeGreaterThan(0);
      expect(audit.termination).toBe("exhausted");
      expect(audit.exploredStates).toBe(0);
      expect(audit.replayComplete).toBe(false);
    }
  });

  it("does not promote the closest Lv135 panel restoration without a solve", () => {
    expect(COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_G_LV135_EXACT_PANEL_AUDIT).toEqual({
      panel: { x: 0, y: 0, width: 2, height: 8, count: 10 },
      openingPieceCount: 17,
      directCohortPieceCount: 4,
      directCohortShapeHistogram: { V3: 3, SQ2: 1 },
      validatePass: true,
      adjacencyPairCount: 0,
      solverStateLimit: 100_000,
      solverTermination: "max_states",
      replayComplete: false,
    });
  });

  it("is reference-idempotent and leaves every final runtime level untouched", () => {
    for (const levelId of COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_G_REQUESTED_LEVEL_IDS) {
      const source = LEVELS[levelId - 1];
      expect(source?.id).toBe(levelId);
      expect(validateLevel(source!)).toBeUndefined();
      expect(applyCompetitorLateExitStructuralBatchG(source!)).toBe(source);
      expect(applyCompetitorLateExitStructuralBatchG(applyCompetitorLateExitStructuralBatchG(source!)))
        .toBe(source);
    }
    for (const blocker of COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_G_BLOCKERS) {
      expect(blocker.kinds.length).toBeGreaterThan(1);
      expect(blocker.reason.length).toBeGreaterThan(180);
      expect(blocker.evidence.length).toBeGreaterThanOrEqual(4);
    }
  });
});
