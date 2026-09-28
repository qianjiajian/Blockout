import { describe, expect, it } from "vitest";
// @ts-expect-error Node/browser regression tooling intentionally uses JavaScript.
import { assertConversionMetrics, CONVERTED_KINDS, measurePcm, SFX_KINDS } from "../tools/playtest-sfx-mp3.mjs";

const stereo = () => [Float32Array.from([0, 0, 0.2, -0.3, 0.1]), Float32Array.from([0, 0, 0.1, -0.2, 0.2])];

describe("MP3 browser technical regression metrics", () => {
  it("covers 17 runtime sounds and exactly 11 converted originals", () => {
    expect(new Set(SFX_KINDS).size).toBe(17);
    expect(new Set(CONVERTED_KINDS).size).toBe(11);
    expect(CONVERTED_KINDS).not.toContain("button");
    expect(SFX_KINDS).toContain("shell");
    expect(CONVERTED_KINDS).not.toContain("shell");
    expect(SFX_KINDS).toContain("shutter");
    expect(CONVERTED_KINDS).not.toContain("shutter");
  });

  it("measures decoded frames, attack threshold and preserved stereo", () => {
    const metrics = measurePcm(stereo(), 44100);
    expect(metrics.frames).toBe(5);
    expect(metrics.channels).toBe(2);
    expect(metrics.onsetSeconds).toBe(2 / 44100);
    expect(metrics.stereoDifferenceRms).toBeGreaterThan(0);
    expect(assertConversionMetrics(metrics, metrics).frameDelta).toBe(0);
  });

  it("rejects empty, nonfinite and uneven PCM", () => {
    expect(() => measurePcm([], 44100)).toThrow();
    expect(() => measurePcm([[0, Number.NaN]], 44100)).toThrow();
    expect(() => measurePcm([[0, 0.5], [0]], 44100)).toThrow();
  });

  it("fails added MP3 delay, attack shift, mono, clipping and silence", () => {
    const original = measurePcm(stereo(), 44100);
    for (const patch of [
      { frames: original.frames + 576 }, { onsetSeconds: 0.02 },
      { channels: 1 }, { stereoDifferenceRms: 0 }, { peak: 1.1 },
      { onsetSeconds: null }, { rms: original.rms / 2 },
    ]) expect(() => assertConversionMetrics(original, { ...original, ...patch })).toThrow();
  });
});
