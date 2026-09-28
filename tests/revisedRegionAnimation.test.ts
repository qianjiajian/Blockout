import { describe, expect, it } from "vitest";
import {
  REVISED_REGION_TIMING as timing,
  revisedRegionOpeningGeometry,
  revisedGeneratorPlacementSeconds,
  sampleRevisedGeneratorExhaustion,
  sampleRevisedGeneratorSpawn,
  sampleRevisedRegionAnimation,
} from "../src/game/revisedRegionAnimation";

describe("revised region presentation samples", () => {
  it("briefly preserves zero, then shrinks its badge before the shutter clears", () => {
    expect(sampleRevisedRegionAnimation("shutter", 0).counterScale).toBe(1);
    expect(sampleRevisedRegionAnimation("shutter", 5 / 30).counterScale).toBe(1);
    expect(sampleRevisedRegionAnimation("shutter", 6.5 / 30).counterScale).toBeCloseTo(0.5);
    expect(sampleRevisedRegionAnimation("shutter", 8 / 30).counterScale).toBe(0);
    expect(sampleRevisedRegionAnimation("shutter", 8 / 30).coverFraction).toBeGreaterThan(0.99);
  });

  it("uses measured accelerating shutter edges rather than linear wipe", () => {
    expect(sampleRevisedRegionAnimation("shutter", 17 / 30).openProgress).toBeCloseTo(0.3536);
    expect(sampleRevisedRegionAnimation("shutter", timing.shutterOpen).openProgress).toBe(1);
    expect(sampleRevisedRegionAnimation("shutter", timing.shutterOpen).frameAlpha).toBe(0);
    expect(sampleRevisedRegionAnimation("shutter", timing.shutterOpen).complete).toBe(false);
    expect(sampleRevisedRegionAnimation("shutter", timing.shutterEnd).complete).toBe(true);
  });

  it("moves intact shutter texture up through a fixed clip without scaling blocks", () => {
    const sample = sampleRevisedRegionAnimation("shutter", 18 / 30);
    const rect = { x: 40, y: 70, width: 160, height: 280 };
    const geometry = revisedRegionOpeningGeometry(rect, sample);
    expect(geometry.clip).toEqual(rect);
    expect(geometry.shutterOffsetY).toBeCloseTo(-280 * sample.openProgress);
    expect(geometry.shutterVisibleHeight).toBeCloseTo(280 + geometry.shutterOffsetY);
    expect(geometry.revealScale).toBe(1);
    expect(rect).toEqual({ x: 40, y: 70, width: 160, height: 280 });
  });

  it("slides two full-size lift panels apart instead of shrinking their sprites", () => {
    const sample = sampleRevisedRegionAnimation("lift", 8 / 30);
    const geometry = revisedRegionOpeningGeometry({ x: 10, y: 20, width: 200, height: 300 }, sample);
    expect(geometry.leftPanel).toEqual({ x: 10 - 100 * sample.openProgress, y: 20, width: 100, height: 300 });
    expect(geometry.rightPanel).toEqual({ x: 110 + 100 * sample.openProgress, y: 20, width: 100, height: 300 });
    expect(geometry.revealOrigin).toEqual({ x: 110, y: 269 });
    expect(geometry.revealScale).toBeGreaterThan(0.5);
    expect(geometry.revealScale).toBeLessThan(1);
  });

  it("reveals the full layer before retiring the lift frame", () => {
    const open = sampleRevisedRegionAnimation("lift", timing.liftOpen);
    expect(open).toMatchObject({ openProgress: 1, revealScale: 1, frameAlpha: 1, complete: false, counterScale: 0 });
    expect(sampleRevisedRegionAnimation("lift", 14.5 / 30).frameAlpha).toBeCloseTo(0.5);
    expect(sampleRevisedRegionAnimation("lift", timing.liftEnd)).toMatchObject({ frameAlpha: 0, complete: true });
  });

  it.each(["shutter", "lift"] as const)("keeps %s samples bounded and monotonic at arbitrary rates", (kind) => {
    let previous = 0;
    for (let frame = 0; frame <= 150; frame++) {
      const sample = sampleRevisedRegionAnimation(kind, frame / 120);
      expect(sample.openProgress).toBeGreaterThanOrEqual(previous);
      expect(sample.openProgress + sample.coverFraction).toBeCloseTo(1);
      expect(sample.counterScale).toBeGreaterThanOrEqual(0);
      expect(sample.frameAlpha).toBeGreaterThanOrEqual(0);
      expect(sample.revealScale).toBeLessThanOrEqual(1);
      previous = sample.openProgress;
    }
  });

  it.each(["shutter", "lift"] as const)("shortens %s reduced motion without changing endpoints", (kind) => {
    const normal = sampleRevisedRegionAnimation(kind, 0.3);
    const reduced = sampleRevisedRegionAnimation(kind, 0.15, true);
    expect(reduced).toEqual({ ...normal, durationSeconds: normal.durationSeconds / 2 });
  });

  it("leaves an exhausted machine and zero briefly, then samples only visual fragments", () => {
    expect(sampleRevisedGeneratorExhaustion(0.7)).toMatchObject({ bodyAlpha: 1, counterVisible: true, fragmentAlpha: 0 });
    expect(sampleRevisedGeneratorExhaustion(timing.generatorBreakStart)).toMatchObject({ bodyAlpha: 0, counterVisible: false, fragmentProgress: 0, fragmentAlpha: 1 });
    expect(sampleRevisedGeneratorExhaustion(timing.generatorBreakEnd)).toMatchObject({ complete: true, fragmentProgress: 1, fragmentAlpha: 0 });
    expect(sampleRevisedGeneratorExhaustion(0.8)).not.toHaveProperty("interactionLocked");
    expect(sampleRevisedGeneratorExhaustion(0.8)).not.toHaveProperty("remaining");
  });

  it("handles early/nonfinite clocks and degenerate rectangles without NaN", () => {
    expect(sampleRevisedRegionAnimation("shutter", -4)).toEqual(sampleRevisedRegionAnimation("shutter", 0));
    expect(sampleRevisedRegionAnimation("lift", NaN)).toEqual(sampleRevisedRegionAnimation("lift", 0));
    const geometry = revisedRegionOpeningGeometry({ x: NaN, y: Infinity, width: -1, height: NaN }, sampleRevisedRegionAnimation("lift", 0));
    expect(geometry.clip).toEqual({ x: 0, y: 0, width: 0, height: 0 });
    expect(geometry.leftPanel.width).toBe(0);
  });
});

describe("revised generator reference timing", () => {
  it("uses the observed 1/2/3 normal-cell placement times", () => {
    expect([1, 2, 3].map(revisedGeneratorPlacementSeconds)).toEqual([6 / 30, 8 / 30, 11 / 30]);
    expect(revisedGeneratorPlacementSeconds(2.5)).toBeCloseTo(9.5 / 30);
    expect(revisedGeneratorPlacementSeconds(4)).toBeCloseTo(14 / 30);
  });

  it("changes stock and blanks the preview immediately without changing model stock", () => {
    const start = sampleRevisedGeneratorSpawn({ elapsedSeconds: 0, direction: "top", normalSpan: 3 });
    expect(start).toMatchObject({ phase: "emerging", progress: 0, spawnProxyVisible: true, hideNormalBlock: true });
    expect(start.display).toEqual({ head: "next", remaining: "after", preview: "blank" });
    const halfway = sampleRevisedGeneratorSpawn({ elapsedSeconds: 11 / 60, direction: "top", normalSpan: 3 });
    expect(halfway.progress).toBeCloseTo(0.5);
    expect(sampleRevisedGeneratorSpawn({ elapsedSeconds: 11 / 30, direction: "top", normalSpan: 3 }).phase).toBe("settled");
    expect(sampleRevisedGeneratorSpawn({ elapsedSeconds: 15 / 30, direction: "top", normalSpan: 3 }).display.preview).toBe("next");
  });

  it("preserves four direction and inset-mouth translation behavior", () => {
    for (const direction of ["top", "bottom", "left", "right"] as const) {
      const start = sampleRevisedGeneratorSpawn({ direction, elapsedSeconds: 0, normalSpan: 2, travelDistance: 2 });
      expect(Math.abs(start.translation.x) + Math.abs(start.translation.y)).toBe(2);
      expect(sampleRevisedGeneratorSpawn({ direction, elapsedSeconds: 1, normalSpan: 2 }).translation).toEqual({ x: 0, y: 0 });
    }
    expect(sampleRevisedGeneratorSpawn({ direction: "top", normalSpan: 2, elapsedSeconds: 0, startTranslation: { x: -3, y: 0 } }).translation).toEqual({ x: -3, y: 0 });
  });

  it("keeps scheduled items and scaled reduced-motion times compatible", () => {
    const options = { direction: "top" as const, normalSpan: 2, timeOffsetSeconds: 0.5 };
    expect(sampleRevisedGeneratorSpawn({ ...options, elapsedSeconds: 0.3 })).toMatchObject({ phase: "scheduled", progress: 0, spawnProxyVisible: false });
    const normal = sampleRevisedGeneratorSpawn({ direction: "top", normalSpan: 2, elapsedSeconds: 0.1 });
    const reduced = sampleRevisedGeneratorSpawn({ direction: "top", normalSpan: 2, elapsedSeconds: 0.05, reducedMotion: true });
    expect(reduced.progress).toBeCloseTo(normal.progress);
    expect(reduced.durationSeconds).toBe(normal.durationSeconds / 2);
  });

  it("does not restore previews before an extrapolated large cargo settles", () => {
    const large = sampleRevisedGeneratorSpawn({ direction: "top", normalSpan: 8, elapsedSeconds: 0.5 });
    expect(large.phase).toBe("emerging");
    expect(large.display.preview).toBe("blank");
    expect(large.durationSeconds).toBeGreaterThan(0.5);
  });
});
