import { describe, expect, it } from "vitest";

import {
  applyCompetitorSingleFieldContractBatchI,
  COMPETITOR_SINGLE_FIELD_CONTRACT_BATCH_I_BLOCKERS,
  COMPETITOR_SINGLE_FIELD_CONTRACT_BATCH_I_CERTIFIED_LEVEL_IDS,
  COMPETITOR_SINGLE_FIELD_CONTRACT_BATCH_I_REJECTED_PROBES,
  COMPETITOR_SINGLE_FIELD_CONTRACT_BATCH_I_REQUESTED_LEVEL_IDS,
  COMPETITOR_SINGLE_FIELD_CONTRACT_BATCH_I_USES_APPROXIMATION,
} from "../src/core/competitorSingleFieldContractBatchI";
import { LEVELS } from "../src/core/levels";

describe("competitor single-field contract batch I", () => {
  it("publishes no counter-only approximation and accounts for every assigned level", () => {
    expect(COMPETITOR_SINGLE_FIELD_CONTRACT_BATCH_I_CERTIFIED_LEVEL_IDS).toEqual([]);
    expect(COMPETITOR_SINGLE_FIELD_CONTRACT_BATCH_I_USES_APPROXIMATION).toBe(false);
    expect(COMPETITOR_SINGLE_FIELD_CONTRACT_BATCH_I_BLOCKERS.map(({ levelId }) => levelId))
      .toEqual(COMPETITOR_SINGLE_FIELD_CONTRACT_BATCH_I_REQUESTED_LEVEL_IDS);
    expect(COMPETITOR_SINGLE_FIELD_CONTRACT_BATCH_I_BLOCKERS
      .every(({ auditFields, kinds, reason, evidence }) => (
        auditFields.length > 0 && kinds.length > 0 && reason.length > 140 && evidence.length > 0
      ))).toBe(true);
  });

  it("keeps the three deceptively-small rejected candidates explicit", () => {
    expect(COMPETITOR_SINGLE_FIELD_CONTRACT_BATCH_I_REJECTED_PROBES).toEqual([
      expect.objectContaining({
        levelId: 115,
        termination: "exhausted",
        exploredStates: 4,
        puzzleModelReplay: false,
      }),
      expect.objectContaining({
        levelId: 150,
        termination: "max_states",
        exploredStates: 30_000,
        puzzleModelReplay: false,
      }),
      expect.objectContaining({
        levelId: 162,
        termination: "static_unsat",
        exploredStates: 0,
        missingCompatibleExitLayerCount: 7,
        puzzleModelReplay: false,
      }),
    ]);
  });

  it("is a strict reference-preserving no-op", () => {
    for (const level of LEVELS) {
      expect(applyCompetitorSingleFieldContractBatchI(level)).toBe(level);
    }
  });
});
