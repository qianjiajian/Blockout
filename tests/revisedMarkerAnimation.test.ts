import { describe, expect, it } from "vitest";
import { REVISED_FLIP_GATE_SECONDS, REVISED_KEY_UNLOCK_TIMING,
  sampleRevisedFlipGate, sampleRevisedKeyUnlock } from "../src/game/revisedMarkerAnimation";

describe("revised marker animation sampling", () => {
  it("opens and closes opposite panel halves over the measured 0.20s", () => {
    expect(REVISED_FLIP_GATE_SECONDS).toBe(0.2);
    expect(sampleRevisedFlipGate(0, true)).toEqual({ openness: 0, closedPanelFraction: 1, complete: false });
    expect(sampleRevisedFlipGate(0.1, true)).toEqual({ openness: 0.5, closedPanelFraction: 0.5, complete: false });
    expect(sampleRevisedFlipGate(0.2, true)).toEqual({ openness: 1, closedPanelFraction: 0, complete: true });
    expect(sampleRevisedFlipGate(0.2, false)).toEqual({ openness: 0, closedPanelFraction: 1, complete: true });
    for (let frame = 0; frame <= 6; frame += 1) {
      expect(sampleRevisedFlipGate(frame / 30, true).openness
        + sampleRevisedFlipGate(frame / 30, false).openness).toBeCloseTo(1);
    }
  });

  it("starts a repeated gate toggle at its current visual openness", () => {
    const previous = sampleRevisedFlipGate(0.08, true).openness;
    expect(sampleRevisedFlipGate(0, false, false, previous).openness).toBe(previous);
    expect(sampleRevisedFlipGate(0.1, false, false, previous).openness).toBeLessThan(previous);
    expect(sampleRevisedFlipGate(0.2, false, false, previous).openness).toBe(0);
  });

  it("reduced motion settles gates immediately without changing the target", () => {
    expect(sampleRevisedFlipGate(0, true, true, 0.4)).toEqual({ openness: 1, closedPanelFraction: 0, complete: true });
    expect(sampleRevisedFlipGate(0, false, true, 0.6)).toEqual({ openness: 0, closedPanelFraction: 1, complete: true });
  });

  it("keys pop without prematurely flying and hover at the source", () => {
    expect(sampleRevisedKeyUnlock(0).keyScale).toBe(1);
    expect(sampleRevisedKeyUnlock(0.15).keyScale).toBeCloseTo(1.8);
    const hovering = sampleRevisedKeyUnlock(0.5);
    expect(hovering.keyVisible).toBe(true);
    expect(hovering.keyScale).toBeCloseTo(1);
    expect(hovering.flightProgress).toBe(0);
    expect(hovering.popOffsetCells).toBeCloseTo(-0.4);
    expect(hovering.sparkleAlpha).toBeGreaterThan(0);
    expect(hovering.arrived).toBe(false);
    expect(hovering.lockFlashAlpha).toBe(0);
  });

  it("flies after 0.70s and replaces the key with the lock flash at 0.95s", () => {
    expect(REVISED_KEY_UNLOCK_TIMING.arrival).toBe(0.95);
    const flying = sampleRevisedKeyUnlock(0.825);
    expect(flying.flightProgress).toBeCloseTo(0.25);
    expect(flying.keyVisible).toBe(true);
    expect(flying.arrived).toBe(false);
    const arrival = sampleRevisedKeyUnlock(0.95);
    expect(arrival.flightProgress).toBe(1);
    expect(arrival.popOffsetCells).toBeCloseTo(0);
    expect(arrival.keyVisible).toBe(false);
    expect(arrival.keyAlpha).toBe(0);
    expect(arrival.arrived).toBe(true);
    expect(arrival.lockFlashAlpha).toBe(1);
    expect(arrival.complete).toBe(false);
  });

  it("fades the lock response in 0.40s and leaves no lingering key", () => {
    expect(sampleRevisedKeyUnlock(1.15).lockFlashAlpha).toBeCloseTo(0.5);
    const done = sampleRevisedKeyUnlock(1.35);
    expect(done.complete).toBe(true);
    expect(done.keyVisible).toBe(false);
    expect(done.sparkleAlpha).toBe(0);
    expect(done.lockFlashAlpha).toBe(0);
  });

  it("uses caller-owned elapsed time, so paused sampling is deterministic", () => {
    expect(sampleRevisedKeyUnlock(0.82)).toEqual(sampleRevisedKeyUnlock(0.82));
    expect(sampleRevisedFlipGate(0.09, true)).toEqual(sampleRevisedFlipGate(0.09, true));
  });

  it("reduced motion has no flight, pulsing or delayed lock presentation", () => {
    expect(sampleRevisedKeyUnlock(0, true)).toMatchObject({ arrived: true, complete: true,
      flightProgress: 1, keyVisible: false, keyAlpha: 0, sparkleAlpha: 0, lockFlashAlpha: 0 });
  });

  it("clamps pre-event ages, overshoot and non-finite inputs to safe endpoints", () => {
    expect(sampleRevisedKeyUnlock(-1)).toEqual(sampleRevisedKeyUnlock(0));
    expect(sampleRevisedKeyUnlock(Number.NaN)).toEqual(sampleRevisedKeyUnlock(0));
    expect(sampleRevisedKeyUnlock(Infinity).complete).toBe(true);
    expect(sampleRevisedFlipGate(-1, true).openness).toBe(0);
    expect(sampleRevisedFlipGate(Infinity, true).openness).toBe(1);
    expect(sampleRevisedFlipGate(0, true, false, 2).openness).toBe(1);
  });
});
