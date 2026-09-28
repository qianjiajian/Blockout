import { describe, expect, it } from "vitest";

import {
  applyCompetitorShutterStructuralBatchC,
  COMPETITOR_SHUTTER_STRUCTURAL_BATCH_C_AGGREGATE_CAPACITY_AUDITS,
  COMPETITOR_SHUTTER_STRUCTURAL_BATCH_C_BLOCKERS,
  COMPETITOR_SHUTTER_STRUCTURAL_BATCH_C_CERTIFIED_LEVEL_IDS,
  COMPETITOR_SHUTTER_STRUCTURAL_BATCH_C_PANEL_CAPACITY_AUDITS,
  COMPETITOR_SHUTTER_STRUCTURAL_BATCH_C_REQUESTED_LEVEL_IDS,
  COMPETITOR_SHUTTER_STRUCTURAL_BATCH_C_SEARCH_AUDITS,
  COMPETITOR_SHUTTER_STRUCTURAL_BATCH_C_USES_STAGING_FALLBACK,
  COMPETITOR_SHUTTER_STRUCTURAL_BATCH_C_VERSION,
} from "../src/core/competitorShutterStructuralBatchC";
import { LEVELS } from "../src/core/levels";
import { validateLevel } from "../src/core/PuzzleModel";

describe(`competitor shutter structural batch C ${COMPETITOR_SHUTTER_STRUCTURAL_BATCH_C_VERSION}`, () => {
  it("keeps the rejected set explicit, exhaustive and free of fallback claims", () => {
    expect(COMPETITOR_SHUTTER_STRUCTURAL_BATCH_C_REQUESTED_LEVEL_IDS)
      .toEqual([69, 74, 79, 84, 89, 92, 93, 94, 95, 99]);
    expect(COMPETITOR_SHUTTER_STRUCTURAL_BATCH_C_CERTIFIED_LEVEL_IDS).toEqual([]);
    expect(COMPETITOR_SHUTTER_STRUCTURAL_BATCH_C_BLOCKERS.map(({ levelId }) => levelId))
      .toEqual(COMPETITOR_SHUTTER_STRUCTURAL_BATCH_C_REQUESTED_LEVEL_IDS);
    expect(COMPETITOR_SHUTTER_STRUCTURAL_BATCH_C_USES_STAGING_FALLBACK).toBe(false);
  });

  it("records a strict per-panel capacity contradiction for every capacity-blocked level", () => {
    for (const audit of COMPETITOR_SHUTTER_STRUCTURAL_BATCH_C_PANEL_CAPACITY_AUDITS) {
      expect(
        audit.panels.some(({ sourceDirectOccupiedCells, sourceFootprintCells }) => (
          sourceDirectOccupiedCells > sourceFootprintCells
        )),
        `Lv${audit.levelId} should have a source-owned cohort larger than its source panel`,
      ).toBe(true);
      for (const panel of audit.panels) {
        expect(panel.width * panel.height).toBe(panel.sourceFootprintCells);
        expect(panel.sourceDirectPieceCount).toBeGreaterThan(0);
      }
    }

    const aggregate = COMPETITOR_SHUTTER_STRUCTURAL_BATCH_C_AGGREGATE_CAPACITY_AUDITS[0];
    expect(aggregate.levelId).toBe(99);
    expect(aggregate.sourceHiddenOccupiedCells).toBeGreaterThan(aggregate.sourcePanelFootprintCells);
    expect(aggregate.perCoverPartitionStatus).toBe("unclear");
  });

  it("does not promote geometry-only searches without a replay or adjacency certificate", () => {
    const [lv69, lv92, lv95] = COMPETITOR_SHUTTER_STRUCTURAL_BATCH_C_SEARCH_AUDITS;
    expect([lv69.levelId, lv92.levelId, lv95.levelId]).toEqual([69, 92, 95]);
    expect(lv69.adjacencyCleanOpeningPackings).toBe(104);
    expect(lv69.exhaustedAtOneThousandStates + lv69.unresolvedAtOneThousandStates).toBe(104);
    expect(lv69.unresolvedAtTenThousandStates).toBe(20);
    expect(lv69.representativeTerminationAtOneHundredThousandStates).toBe("max_states");
    expect(lv69.certifiedReplayCount).toBe(0);

    for (const audit of [lv92, lv95]) {
      expect(audit.adjacencyCleanDirectPackings).toBe(0);
      expect(audit.certifiedReplayCount).toBe(0);
    }
  });

  it("is idempotent and leaves every requested runtime level untouched", () => {
    for (const levelId of COMPETITOR_SHUTTER_STRUCTURAL_BATCH_C_REQUESTED_LEVEL_IDS) {
      const source = LEVELS.find(({ id }) => id === levelId);
      expect(source, `missing Lv${levelId}`).toBeDefined();
      expect(validateLevel(source!)).toBeUndefined();
      expect(applyCompetitorShutterStructuralBatchC(source!)).toBe(source);
      expect(applyCompetitorShutterStructuralBatchC(applyCompetitorShutterStructuralBatchC(source!)))
        .toBe(source);
    }
    for (const blocker of COMPETITOR_SHUTTER_STRUCTURAL_BATCH_C_BLOCKERS) {
      expect(blocker.kinds.length).toBeGreaterThan(0);
      expect(blocker.reason.length).toBeGreaterThan(180);
      expect(blocker.evidence.length).toBeGreaterThanOrEqual(3);
    }
  });
});
