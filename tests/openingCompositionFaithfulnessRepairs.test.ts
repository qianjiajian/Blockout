import { describe, expect, it } from "vitest";
import { LEVELS } from "../src/core/levels";
import {
  applyOpeningCompositionFaithfulnessRepair,
  OPENING_COMPOSITION_FAITHFULNESS_BLOCKERS,
  OPENING_COMPOSITION_FAITHFULNESS_LEVEL_IDS,
  OPENING_COMPOSITION_FAITHFULNESS_VERSION,
} from "../src/core/openingCompositionFaithfulnessRepairs";

describe(`opening composition faithfulness ${OPENING_COMPOSITION_FAITHFULNESS_VERSION}`, () => {
  it("publishes no candidate that lacks the complete proof contract", () => {
    expect(OPENING_COMPOSITION_FAITHFULNESS_LEVEL_IDS).toEqual([]);
    for (const level of LEVELS) expect(applyOpeningCompositionFaithfulnessRepair(level)).toBe(level);
  });

  it("records a concrete blocker for every assigned level", () => {
    expect(Object.keys(OPENING_COMPOSITION_FAITHFULNESS_BLOCKERS).map(Number)).toEqual([
      50, 52, 54, 84, 107, 109, 111,
    ]);
    for (const reason of Object.values(OPENING_COMPOSITION_FAITHFULNESS_BLOCKERS)) {
      expect(reason.length).toBeGreaterThan(40);
    }
  });
});
