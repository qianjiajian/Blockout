import { describe, expect, it } from "vitest";

import {
  applyCompetitorLateShutterStructuralBatchD,
  COMPETITOR_LATE_SHUTTER_STRUCTURAL_BATCH_D_BLOCKERS,
  COMPETITOR_LATE_SHUTTER_STRUCTURAL_BATCH_D_CAPACITY_AUDITS,
  COMPETITOR_LATE_SHUTTER_STRUCTURAL_BATCH_D_CERTIFIED_LEVEL_IDS,
  COMPETITOR_LATE_SHUTTER_STRUCTURAL_BATCH_D_REJECTED_PROBES,
  COMPETITOR_LATE_SHUTTER_STRUCTURAL_BATCH_D_REQUESTED_LEVEL_IDS,
  COMPETITOR_LATE_SHUTTER_STRUCTURAL_BATCH_D_SOURCE_AUDITS,
  COMPETITOR_LATE_SHUTTER_STRUCTURAL_BATCH_D_USES_STAGING_FALLBACK,
  COMPETITOR_LATE_SHUTTER_STRUCTURAL_BATCH_D_VERSION,
} from "../src/core/competitorLateShutterStructuralBatchD";
import { LEVELS } from "../src/core/levels";
import { validateLevel } from "../src/core/PuzzleModel";

describe(`competitor late shutter structural batch D ${COMPETITOR_LATE_SHUTTER_STRUCTURAL_BATCH_D_VERSION}`, () => {
  it("keeps the rejected set explicit, exhaustive and free of staging claims", () => {
    expect(COMPETITOR_LATE_SHUTTER_STRUCTURAL_BATCH_D_REQUESTED_LEVEL_IDS)
      .toEqual([101, 103, 104, 109, 113, 119]);
    expect(COMPETITOR_LATE_SHUTTER_STRUCTURAL_BATCH_D_CERTIFIED_LEVEL_IDS).toEqual([]);
    expect(COMPETITOR_LATE_SHUTTER_STRUCTURAL_BATCH_D_BLOCKERS.map(({ levelId }) => levelId))
      .toEqual(COMPETITOR_LATE_SHUTTER_STRUCTURAL_BATCH_D_REQUESTED_LEVEL_IDS);
    expect(COMPETITOR_LATE_SHUTTER_STRUCTURAL_BATCH_D_USES_STAGING_FALLBACK).toBe(false);
  });

  it("retains truth-v1 null geometry and direct-cohort gaps instead of filling them", () => {
    const exactGeometry = COMPETITOR_LATE_SHUTTER_STRUCTURAL_BATCH_D_SOURCE_AUDITS
      .filter(({ status }) => status === "exact-rectangle-cohort-unclear");
    const unclearGeometry = COMPETITOR_LATE_SHUTTER_STRUCTURAL_BATCH_D_SOURCE_AUDITS
      .filter(({ status }) => status === "rectangle-and-board-unclear");

    expect(exactGeometry.map(({ levelId }) => levelId)).toEqual([101, 103, 104]);
    expect(unclearGeometry.map(({ levelId }) => levelId)).toEqual([109, 113, 119]);
    for (const audit of COMPETITOR_LATE_SHUTTER_STRUCTURAL_BATCH_D_SOURCE_AUDITS) {
      expect(audit.panels.every(({ directCohortPieceCount }) => directCohortPieceCount === null)).toBe(true);
      if (audit.status === "rectangle-and-board-unclear") {
        expect(audit.board).toEqual({ width: null, height: null, playableCellCount: null });
        expect(audit.panels.every(({ x, y, width, height }) => (
          x === null && y === null && width === null && height === null
        ))).toBe(true);
      } else {
        expect(audit.panels.every(({ x, y, width, height }) => (
          x !== null && y !== null && width !== null && height !== null
        ))).toBe(true);
      }
    }
  });

  it("records the strict Lv103 count-capacity contradiction", () => {
    const audit = COMPETITOR_LATE_SHUTTER_STRUCTURAL_BATCH_D_CAPACITY_AUDITS[0];
    expect(audit.levelId).toBe(103);
    expect(audit.runtimeFullPieceCount - audit.runtimeLowerDirectPieceCount)
      .toBe(audit.maximumClearsBeforeLowerDirectCohort);
    expect(audit.maximumClearsBeforeLowerDirectCohort).toBeLessThan(audit.lowerPanelCount);
    expect(audit.runtimeFullPieceCount - 1).toBeLessThan(audit.lowerPanelCount);
  });

  it("never promotes a structural probe without a fresh solver/replay certificate", () => {
    expect(COMPETITOR_LATE_SHUTTER_STRUCTURAL_BATCH_D_REJECTED_PROBES.map(({ levelId }) => levelId))
      .toEqual([101, 104, 119]);
    for (const probe of COMPETITOR_LATE_SHUTTER_STRUCTURAL_BATCH_D_REJECTED_PROBES) {
      expect(probe.validation).toBe("pass");
      expect(probe.physicalCoverageIssues).toBe(0);
      expect(probe.certifiedReplayCount).toBe(0);
      expect(["exhausted", "max_states"]).toContain(probe.termination);
    }
  });

  it("is an idempotent no-op and leaves all six valid runtime levels untouched", () => {
    for (const levelId of COMPETITOR_LATE_SHUTTER_STRUCTURAL_BATCH_D_REQUESTED_LEVEL_IDS) {
      const source = LEVELS.find(({ id }) => id === levelId);
      expect(source, `missing Lv${levelId}`).toBeDefined();
      expect(validateLevel(source!)).toBeUndefined();
      expect(applyCompetitorLateShutterStructuralBatchD(source!)).toBe(source);
      expect(applyCompetitorLateShutterStructuralBatchD(
        applyCompetitorLateShutterStructuralBatchD(source!),
      )).toBe(source);
    }
    for (const blocker of COMPETITOR_LATE_SHUTTER_STRUCTURAL_BATCH_D_BLOCKERS) {
      expect(blocker.kinds.length).toBeGreaterThan(0);
      expect(blocker.reason.length).toBeGreaterThan(180);
      expect(blocker.evidence.length).toBeGreaterThanOrEqual(4);
    }
  });
});
