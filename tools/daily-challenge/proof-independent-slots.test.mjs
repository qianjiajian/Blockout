import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { budgetsFor, proveSlot, resolveSlotLevel } from "./proof-independent-slots.mjs";

const source = { id: 7, name: "fixture", difficulty: "super", timeSeconds: 120, reward: 0, width: 1, height: 1, gates: [], blocks: [] };
const layoutSha256 = createHash("sha256").update("semantic-layout").digest("hex");
const fakeRuntime = (overrides = {}) => ({
  LEVELS: [source],
  deriveDailyChallengeLevel: (level, formalId) => ({ ...structuredClone(level), id: -1, name: formalId }),
  validateLevel: () => undefined,
  dailyChallengeLayoutHash: () => "semantic-layout",
  searchRevisedLevel: () => ({
    status: "witness", termination: "witness", witnessFound: true,
    exploredStates: 2, discoveredStates: 2, attemptedTransitions: 2, reasons: [],
    drags: [{ blockId: "b", path: [], exitSide: "right" }],
  }),
  replayRevisedRoute: () => ({ valid: true, complete: true, effectiveDrags: 33, nonClearingDrags: 31, clearEvents: 2 }),
  checkRevisedRepositionFloor: (_level, options) => ({
    status: "threshold-proven", termination: "below-threshold-exhausted", thresholdProven: true,
    floor: options.floor, abstraction: "optional-exit-unit-step-gesture-superset-v1", hashBindingRequired: true,
    solvabilityValidated: false, pointerReplayValidated: false, timeValidated: false,
    exploredStates: 4, discoveredStates: 4, attemptedTransitions: 4, reasons: [],
  }),
  ...overrides,
});

describe("daily independent proof pipeline", () => {
  it("forces D3 floor 31 and records a PASS only after both proofs", () => {
    const runtime = fakeRuntime();
    const result = proveSlot(runtime, {
      formalId: "daily-fixture-d3-01", sourceLevelId: 7, difficulty: 3,
      minimumRepositionMoves: 1, layoutSha256,
    });
    expect(result.status).toBe("PASS");
    expect(result.lowerBound.floor).toBe(31);
    expect(result.route.replay.complete).toBe(true);
  });

  it("rejects a hash mismatch before any solver result can promote a slot", () => {
    const result = proveSlot(fakeRuntime(), {
      formalId: "daily-fixture-d1-01", sourceLevelId: 7, difficulty: 1,
      requiredFloor: 1, layoutSha256: "stale-layout",
    });
    expect(result.status).toBe("hash-mismatch");
    expect(result.lowerBound).toBeNull();
  });

  it("does not treat a route witness without fresh completion as proof", () => {
    const result = proveSlot(fakeRuntime({ replayRevisedRoute: () => ({ valid: true, complete: false, effectiveDrags: 1, nonClearingDrags: 1, clearEvents: 0 }) }), {
      formalId: "daily-fixture-d1-02", sourceLevelId: 7, difficulty: 1,
      requiredFloor: 1, layoutSha256,
    });
    expect(result.status).toBe("route-failed");
  });

  it("keeps budgets fixed and rejects missing metadata floors", () => {
    expect(budgetsFor({}).route.maxMilliseconds).toBe(15_000);
    expect(() => proveSlot(fakeRuntime(), { formalId: "daily-fixture", sourceLevelId: 7, difficulty: 1 })).not.toThrow();
    expect(resolveSlotLevel(fakeRuntime(), { formalId: "daily-fixture", sourceLevelId: 7 }).level.name).toBe("daily-fixture");
  });
});

