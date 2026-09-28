import { describe, expect, it } from "vitest";
import { sampleGateExitResponse, sampleShellPeel, shellPeelDuration } from "../src/game/exitMaterialAnimation";

describe("exit material animation boundaries", () => {
  it.each([false, true])("reveals the core monotonically and fully clears the shell (reduced=%s)", (reduced) => {
    const duration = shellPeelDuration(reduced);
    expect(duration).toBeGreaterThan(0);
    expect(Number.isFinite(duration)).toBe(true);
    const initial = sampleShellPeel(0, reduced);
    expect(initial.travelProgress).toBe(0);
    expect(initial.materialAlpha).toBe(1);
    expect(initial.finished).toBe(false);
    let previous = initial.travelProgress;
    for (let step = 1; step <= 100; step += 1) {
      const sample = sampleShellPeel(duration * step / 100, reduced);
      expect(sample.travelProgress).toBeGreaterThanOrEqual(previous);
      expect(sample.travelProgress).toBeLessThanOrEqual(1);
      previous = sample.travelProgress;
    }
    const completed = sampleShellPeel(duration, reduced);
    expect(completed.travelProgress).toBe(1);
    expect(completed.materialAlpha).toBe(0);
    expect(completed.glint).toBe(0);
    expect(completed.finished).toBe(true);
  });

  it.each([false, true])("never leaves material or a glint after completion (reduced=%s)", (reduced) => {
    const duration = shellPeelDuration(reduced);
    for (const age of [duration, duration + 0.001, duration + 1, 60, Number.MAX_VALUE]) {
      const sample = sampleShellPeel(age, reduced);
      expect(sample.materialAlpha).toBe(0);
      expect(sample.glint).toBe(0);
      expect(sample.travelProgress).toBe(1);
      expect(sample.finished).toBe(true);
      for (const value of Object.values(sample)) {
        if (typeof value === "number") expect(Number.isFinite(value)).toBe(true);
      }
    }
  });

  it("keeps delayed shell effects invisible before their start", () => {
    for (const reduced of [false, true]) {
      for (const age of [-Number.MAX_VALUE, -1, -0.001]) {
        const sample = sampleShellPeel(age, reduced);
        expect(sample.travelProgress).toBe(0);
        expect(sample.materialAlpha).toBe(0);
        expect(sample.glint).toBe(0);
        expect(sample.finished).toBe(false);
      }
    }
  });

  it.each([false, true])("keeps sampled visual values finite and bounded (reduced=%s)", (reduced) => {
    for (const age of [-Number.MAX_VALUE, ...Array.from({ length: 201 }, (_, i) => i / 100), Number.MAX_VALUE]) {
      const shell = sampleShellPeel(age, reduced);
      const gate = sampleGateExitResponse(age, reduced);
      for (const value of [...Object.values(shell), ...Object.values(gate)]) {
        if (typeof value === "number") expect(Number.isFinite(value)).toBe(true);
      }
      expect(shell.materialAlpha).toBeGreaterThanOrEqual(0);
      expect(shell.materialAlpha).toBeLessThanOrEqual(1);
      expect(shell.glint).toBeGreaterThanOrEqual(0);
      expect(shell.glint).toBeLessThanOrEqual(1);
      expect(gate.glow).toBeGreaterThanOrEqual(0);
      expect(gate.glow).toBeLessThanOrEqual(1);
      expect(gate.sheen).toBeGreaterThanOrEqual(0);
      expect(gate.sheen).toBeLessThanOrEqual(1);
      expect(Math.abs(gate.displacement)).toBeLessThan(0.3);
    }
  });

  it("returns the door to rest after the response, with no persistent glow", () => {
    for (const reduced of [false, true]) {
      for (const age of [-1, 0.6, 1, 60, Number.MAX_VALUE]) {
        expect(sampleGateExitResponse(age, reduced)).toEqual({ displacement: 0, glow: 0, sheen: 0 });
      }
    }
    const normal = Array.from({ length: 61 }, (_, i) => sampleGateExitResponse(i / 100));
    expect(normal.some((sample) => sample.displacement > 0)).toBe(true);
    expect(normal.some((sample) => sample.glow > 0)).toBe(true);
  });

  it("never displaces the door in reduced motion and ends its softer glow sooner", () => {
    for (let age = -0.1; age <= 2; age += 0.005) {
      const sample = sampleGateExitResponse(age, true);
      expect(sample.displacement).toBe(0);
      expect(sample.glow).toBeLessThanOrEqual(0.32);
      if (age >= 0.22) expect(sample.glow).toBe(0);
    }
    expect(shellPeelDuration(true)).toBeLessThan(shellPeelDuration(false));
  });
});
