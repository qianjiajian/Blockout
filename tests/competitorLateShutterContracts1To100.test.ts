import { describe, expect, it } from "vitest";

import {
  applyCompetitorLateShutterContract1To100,
  COMPETITOR_LATE_SHUTTER_CONTRACT_1_TO_100_BLOCKERS,
  COMPETITOR_LATE_SHUTTER_CONTRACT_1_TO_100_CERTIFIED_LEVEL_IDS,
  COMPETITOR_LATE_SHUTTER_CONTRACT_1_TO_100_REQUESTED_LEVEL_IDS,
  COMPETITOR_LATE_SHUTTER_CONTRACT_1_TO_100_USES_STAGING_FALLBACK,
  COMPETITOR_LATE_SHUTTER_CONTRACT_1_TO_100_VERSION,
} from "../src/core/competitorLateShutterContracts1To100";
import type { LevelSpec } from "../src/core/types";

const fixture: LevelSpec = {
  id: 29,
  name: "late-shutter-candidate-fixture",
  difficulty: "hard",
  width: 1,
  height: 1,
  timeSeconds: 90,
  reward: 1,
  parMoves: 1,
  blocks: [],
  gates: [],
};

describe(`competitor late shutter contracts ${COMPETITOR_LATE_SHUTTER_CONTRACT_1_TO_100_VERSION}`, () => {
  it("keeps requested, certified and blocked sets explicit and exhaustive", () => {
    expect(COMPETITOR_LATE_SHUTTER_CONTRACT_1_TO_100_REQUESTED_LEVEL_IDS).toEqual([
      29, 34, 38, 39, 41, 44, 49, 59, 62, 64, 67, 69, 71, 74, 79, 84, 89, 91, 92, 93, 94, 95, 99,
    ]);
    expect(COMPETITOR_LATE_SHUTTER_CONTRACT_1_TO_100_CERTIFIED_LEVEL_IDS).toEqual([]);
    expect(COMPETITOR_LATE_SHUTTER_CONTRACT_1_TO_100_BLOCKERS.map(({ levelId }) => levelId))
      .toEqual(COMPETITOR_LATE_SHUTTER_CONTRACT_1_TO_100_REQUESTED_LEVEL_IDS);
    expect(new Set(COMPETITOR_LATE_SHUTTER_CONTRACT_1_TO_100_BLOCKERS.map(({ levelId }) => levelId)).size)
      .toBe(COMPETITOR_LATE_SHUTTER_CONTRACT_1_TO_100_BLOCKERS.length);
  });

  it("records actionable evidence for every blocker", () => {
    for (const blocker of COMPETITOR_LATE_SHUTTER_CONTRACT_1_TO_100_BLOCKERS) {
      expect(blocker.kinds.length, `Lv${blocker.levelId} kinds`).toBeGreaterThan(0);
      expect(blocker.reason.length, `Lv${blocker.levelId} reason`).toBeGreaterThan(40);
      expect(blocker.evidence.length, `Lv${blocker.levelId} evidence`).toBeGreaterThan(0);
      expect(blocker.evidence.every((entry) => !entry.includes("force")), `Lv${blocker.levelId} no force evidence`).toBe(true);
    }
  });

  it("never substitutes staging or mutates an uncertified level", () => {
    expect(COMPETITOR_LATE_SHUTTER_CONTRACT_1_TO_100_USES_STAGING_FALLBACK).toBe(false);
    expect(applyCompetitorLateShutterContract1To100(fixture)).toBe(fixture);
    expect(applyCompetitorLateShutterContract1To100({ ...fixture, id: 1 })).not.toBeUndefined();
    const unrelated = { ...fixture, id: 1 };
    expect(applyCompetitorLateShutterContract1To100(unrelated)).toBe(unrelated);
  });
});
