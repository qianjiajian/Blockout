import { describe, expect, it } from "vitest";
import {
  buildNumericIceFracture,
  numericIceFractureTiming,
  projectGateIceParticle,
  sampleNumericIceFracture,
} from "../src/game/numericIceFracture";

const expectUnitPoint = (point: { x: number; y: number }): void => {
  expect(Number.isFinite(point.x)).toBe(true);
  expect(Number.isFinite(point.y)).toBe(true);
  expect(point.x).toBeGreaterThanOrEqual(0);
  expect(point.x).toBeLessThanOrEqual(1);
  expect(point.y).toBeGreaterThanOrEqual(0);
  expect(point.y).toBeLessThanOrEqual(1);
};

describe("numeric ice fracture", () => {
  it("builds deterministic seeded geometry without sharing one repeated pattern", () => {
    const first = buildNumericIceFracture({
      seed: "lv10:block-ice:12>11",
      cellCount: 3,
      intensity: "shatter",
    });
    const repeat = buildNumericIceFracture({
      seed: "lv10:block-ice:12>11",
      cellCount: 3,
      intensity: "shatter",
    });
    const other = buildNumericIceFracture({
      seed: "lv10:block-ice:11>10",
      cellCount: 3,
      intensity: "shatter",
    });

    expect(repeat).toEqual(first);
    expect(other.seed).not.toBe(first.seed);
    expect(other.impacts).not.toEqual(first.impacts);
    expect(other.shards).not.toEqual(first.shards);
  });

  it("reserves the dense capped burst for a full shatter", () => {
    const oneCell = buildNumericIceFracture({ seed: 10, cellCount: 1, intensity: "shatter" });
    const twoByTwo = buildNumericIceFracture({ seed: 10, cellCount: 4, intensity: "shatter" });
    const nineCells = buildNumericIceFracture({ seed: 10, cellCount: 9, intensity: "shatter" });

    expect(oneCell.shards).toHaveLength(14);
    expect(oneCell.specks).toHaveLength(10);
    expect(twoByTwo.shards.length).toBeGreaterThanOrEqual(30);
    expect(twoByTwo.shards.length).toBeLessThanOrEqual(40);
    expect(nineCells.shards).toHaveLength(38);
    expect(twoByTwo.specks).toHaveLength(24);
    expect(nineCells.specks).toHaveLength(24);
    expect(nineCells.cracks).toHaveLength(14);
    expect(new Set(nineCells.shards.map((shard) => shard.cellIndex)).size).toBe(9);
  });

  it("encodes ordinary decrements as a direct counter cut with no visual burst", () => {
    const oneCell = buildNumericIceFracture({ seed: 12, cellCount: 1, intensity: "decrement" });
    const twoByTwo = buildNumericIceFracture({ seed: 12, cellCount: 4, intensity: "decrement" });
    const shatter = buildNumericIceFracture({ seed: 12, cellCount: 4, intensity: "shatter" });

    expect(oneCell.shards).toHaveLength(0);
    expect(oneCell.specks).toHaveLength(0);
    expect(oneCell.cracks).toHaveLength(0);
    expect(oneCell.impacts).toHaveLength(0);
    expect(twoByTwo.shards).toHaveLength(0);
    expect(twoByTwo.specks).toHaveLength(0);
    expect(twoByTwo.cracks).toHaveLength(0);
    expect(twoByTwo.timing.duration).toBe(0.05);
    expect(twoByTwo.timing.duration).toBeLessThan(shatter.timing.duration / 10);

    const before = sampleNumericIceFracture(twoByTwo, 0.012);
    const after = sampleNumericIceFracture(twoByTwo, 0.033);
    expect(before.counter.showPrevious).toBe(true);
    expect(after.counter.showNext).toBe(true);
    expect(after.counter.nextScale).toBe(1);
    expect(after.counter.glowAlpha).toBe(0);
    expect(after.flashAlpha).toBe(0);
    expect(after.flashScale).toBe(1);
    expect(after.frostVeilAlpha).toBe(0);
  });

  it("uses a much lighter reduced-motion acknowledgement", () => {
    const standard = buildNumericIceFracture({
      seed: "ice",
      cellCount: 4,
      intensity: "shatter",
    });
    const reduced = buildNumericIceFracture({
      seed: "ice",
      cellCount: 4,
      intensity: "shatter",
      reducedMotion: true,
    });

    expect(standard.timing.duration).toBeCloseTo(0.94, 8);
    expect(reduced.timing.duration).toBeLessThan(standard.timing.duration / 2 + 0.001);
    expect(reduced.shards.length).toBeLessThan(standard.shards.length / 3);
    expect(reduced.specks.length).toBeLessThan(standard.specks.length / 3);
    expect(reduced.cracks.length).toBeLessThan(standard.cracks.length / 2);
    expect(numericIceFractureTiming(false, "shatter").counterRevealAt).toBe(0.016);
    expect(numericIceFractureTiming(true, "shatter").counterRevealAt).toBe(0.008);
  });

  it("keeps authored geometry inside safe normalized ranges", () => {
    const layout = buildNumericIceFracture({
      seed: "geometry-ranges",
      cellCount: 9,
      intensity: "shatter",
    });

    for (const impact of layout.impacts) {
      expectUnitPoint(impact);
      expect(impact.cellIndex).toBeGreaterThanOrEqual(0);
      expect(impact.cellIndex).toBeLessThan(layout.cellCount);
      expect(impact.radius).toBeGreaterThanOrEqual(0.17);
      expect(impact.radius).toBeLessThanOrEqual(0.25);
    }
    for (const shard of layout.shards) {
      expectUnitPoint(shard.origin);
      expect(shard.cellIndex).toBeGreaterThanOrEqual(0);
      expect(shard.cellIndex).toBeLessThan(layout.cellCount);
      expect(shard.lifetime).toBeGreaterThanOrEqual(shard.tail ? 0.86 : 0.5);
      expect(shard.lifetime).toBeLessThanOrEqual(shard.tail ? 0.905 : 0.58);
      expect(shard.delay).toBeGreaterThanOrEqual(0);
      expect(shard.delay).toBeLessThanOrEqual(0.08);
      expect(Number.isFinite(shard.velocity.x)).toBe(true);
      expect(Number.isFinite(shard.velocity.y)).toBe(true);
      for (const vertex of shard.vertices) {
        expect(Math.abs(vertex.x)).toBeLessThanOrEqual(0.2);
        expect(Math.abs(vertex.y)).toBeLessThanOrEqual(0.2);
      }
    }
    expect(layout.shards.some((shard) => shard.vertices.length === 4)).toBe(true);
    expect(layout.shards.some((shard) => shard.vertices.length === 5)).toBe(true);
    expect(layout.shards.filter((shard) => shard.vertices.length >= 4).length)
      .toBeGreaterThan(layout.shards.length * 0.65);
    for (const speck of layout.specks) {
      expectUnitPoint(speck.origin);
      expect(speck.radius).toBeGreaterThanOrEqual(0.012);
      expect(speck.radius).toBeLessThanOrEqual(0.034);
      expect(["dot", "glint"]).toContain(speck.kind);
    }
    for (const crack of layout.cracks) {
      expectUnitPoint(crack.start);
      expectUnitPoint(crack.elbow);
      expectUnitPoint(crack.end);
      expect(crack.width).toBeGreaterThanOrEqual(0.008);
      expect(crack.width).toBeLessThanOrEqual(0.018);
    }
  });

  it("holds the old counter until the trigger and switches every target on the first burst frame", () => {
    const layout = buildNumericIceFracture({ seed: "counter", cellCount: 1, intensity: "shatter" });
    const another = buildNumericIceFracture({ seed: "other-counter", cellCount: 4, intensity: "shatter" });
    const before = sampleNumericIceFracture(layout, 0.012);
    const reveal = sampleNumericIceFracture(layout, layout.timing.counterRevealAt);
    const firstBurst = sampleNumericIceFracture(layout, 0.024);
    const otherFirstBurst = sampleNumericIceFracture(another, 0.024);
    const settle = sampleNumericIceFracture(layout, 0.34);
    const complete = sampleNumericIceFracture(layout, layout.timing.duration);

    expect(before.counter.showPrevious).toBe(true);
    expect(before.counter.showNext).toBe(false);
    expect(before.counter.previousAlpha).toBe(1);
    expect(before.flashAlpha).toBe(0);
    expect(reveal.counter.showPrevious).toBe(false);
    expect(reveal.counter.showNext).toBe(true);
    expect(reveal.counter.nextScale).toBeCloseTo(1.2, 8);
    expect(firstBurst.flashAlpha).toBeGreaterThan(0);
    expect(firstBurst.counter.showNext).toBe(true);
    expect(otherFirstBurst.counter.showNext).toBe(true);
    expect(settle.counter.showNext).toBe(true);
    expect(settle.counter.nextAlpha).toBe(1);
    expect(settle.counter.nextScale).toBeCloseTo(1, 8);
    expect(complete.finished).toBe(true);
    expect(complete.flashAlpha).toBe(0);
    expect(complete.frostVeilAlpha).toBe(0);
    expect(complete.shards.every((shard) => !shard.visible)).toBe(true);
    expect(complete.specks.every((speck) => !speck.visible)).toBe(true);
    expect(complete.cracks.every((crack) => !crack.visible)).toBe(true);
  });

  it("peaks near 0.2 seconds, clears the dense burst by 0.67, and keeps only a sparse tail near 0.9", () => {
    const layout = buildNumericIceFracture({ seed: "reference-tail", cellCount: 4, intensity: "shatter" });
    const beforePeak = sampleNumericIceFracture(layout, 0.1);
    const peak = sampleNumericIceFracture(layout, 0.206);
    const afterPeak = sampleNumericIceFracture(layout, 0.34);
    const denseMiddle = sampleNumericIceFracture(layout, 0.53);
    const denseEnd = sampleNumericIceFracture(layout, 0.67);
    const tail = sampleNumericIceFracture(layout, 0.9);
    const complete = sampleNumericIceFracture(layout, 0.94);
    const visibleDebris = (sample: ReturnType<typeof sampleNumericIceFracture>): number => (
      sample.shards.filter((shard) => shard.visible).length
      + sample.specks.filter((speck) => speck.visible).length
    );

    expect(peak.flashAlpha).toBeGreaterThan(beforePeak.flashAlpha);
    expect(peak.flashAlpha).toBeGreaterThan(afterPeak.flashAlpha);
    expect(visibleDebris(peak)).toBeGreaterThan(50);
    expect(visibleDebris(denseMiddle)).toBeGreaterThanOrEqual(18);
    expect(visibleDebris(denseEnd)).toBeGreaterThanOrEqual(2);
    expect(visibleDebris(denseEnd)).toBeLessThanOrEqual(5);
    expect(visibleDebris(tail)).toBeGreaterThanOrEqual(2);
    expect(visibleDebris(tail)).toBeLessThanOrEqual(5);
    expect(visibleDebris(complete)).toBe(0);
    expect(complete.finished).toBe(true);
  });

  it("samples finite moving shard and speck states with bounded opacity", () => {
    const layout = buildNumericIceFracture({
      seed: "sampled-state",
      cellCount: 3,
      intensity: "shatter",
    });
    const early = sampleNumericIceFracture(layout, 0.08);
    const later = sampleNumericIceFracture(layout, 0.22);

    expect(early.started).toBe(true);
    expect(early.flashAlpha).toBeGreaterThan(0);
    expect(early.shards.some((shard) => shard.visible)).toBe(true);
    expect(early.specks.some((speck) => speck.visible)).toBe(true);
    expect(later.shards[0].x).not.toBe(early.shards[0].x);
    expect(later.shards[0].y).not.toBe(early.shards[0].y);

    for (const sample of [early, later]) {
      expect(sample.progress).toBeGreaterThanOrEqual(0);
      expect(sample.progress).toBeLessThanOrEqual(1);
      expect(sample.easedProgress).toBeGreaterThanOrEqual(sample.progress);
      for (const shard of sample.shards) {
        expect([shard.x, shard.y, shard.rotation, shard.scale, shard.alpha]
          .every(Number.isFinite)).toBe(true);
        expect(shard.alpha).toBeGreaterThanOrEqual(0);
        expect(shard.alpha).toBeLessThanOrEqual(1);
      }
      for (const speck of sample.specks) {
        expect([speck.x, speck.y, speck.radius, speck.alpha].every(Number.isFinite)).toBe(true);
        expect(speck.alpha).toBeGreaterThanOrEqual(0);
        expect(speck.alpha).toBeLessThanOrEqual(1);
      }
    }
  });

  it("normalizes invalid cell counts and non-finite sampling ages safely", () => {
    const low = buildNumericIceFracture({ seed: Number.NaN, cellCount: Number.NaN });
    const high = buildNumericIceFracture({ seed: Number.POSITIVE_INFINITY, cellCount: 999 });

    expect(low.cellCount).toBe(1);
    expect(low.seed).toBe(0);
    expect(high.cellCount).toBe(16);
    expect(high.seed).toBe(0);
    expect(sampleNumericIceFracture(low, Number.NaN).age).toBe(0);
    expect(sampleNumericIceFracture(low, -1).started).toBe(false);
  });

  it("holds the thin ice skin while cracks appear, then clears it before the burst peak", () => {
    const layout = buildNumericIceFracture({ seed: "skin", cellCount: 4, intensity: "shatter" });
    const start = sampleNumericIceFracture(layout, 0);
    const crack = sampleNumericIceFracture(layout, 0.035);
    const hold = sampleNumericIceFracture(layout, 0.05);
    const breaking = sampleNumericIceFracture(layout, 0.1);
    const clear = sampleNumericIceFracture(layout, 0.18);

    expect(start.iceSheetAlpha).toBeGreaterThan(0.5);
    expect(hold.iceSheetAlpha).toBe(start.iceSheetAlpha);
    expect(crack.cracks.some((part) => part.visible)).toBe(true);
    expect(crack.shards.some((part) => part.visible)).toBe(false);
    expect(crack.specks.some((part) => part.visible)).toBe(false);
    expect(breaking.iceSheetAlpha).toBeGreaterThan(0);
    expect(breaking.iceSheetAlpha).toBeLessThan(hold.iceSheetAlpha);
    expect(breaking.shards.some((part) => part.visible)).toBe(true);
    expect(clear.iceSheetAlpha).toBe(0);
    expect(clear.sheetLift).toBe(0);
    expect(clear.flashAlpha).toBeGreaterThan(0);
    for (let age = 0; age < layout.timing.duration; age += 0.007) {
      const sample = sampleNumericIceFracture(layout, age);
      expect(sample.sheetLift).toBeGreaterThanOrEqual(0);
      expect(sample.sheetLift).toBeLessThanOrEqual(0.06);
    }
  });

  it("keeps reduced ice skins still and brief, with no skin or debris for ordinary decrements", () => {
    const reduced = buildNumericIceFracture({ seed: "skin-low", cellCount: 4, intensity: "shatter", reducedMotion: true });
    const crack = sampleNumericIceFracture(reduced, 0.014);
    expect(crack.iceSheetAlpha).toBeGreaterThan(0);
    expect(crack.cracks.some((part) => part.visible)).toBe(true);
    expect(crack.shards.some((part) => part.visible)).toBe(false);
    expect(sampleNumericIceFracture(reduced, 0.07).iceSheetAlpha).toBe(0);
    for (let age = 0; age <= reduced.timing.duration; age += 0.005) {
      expect(sampleNumericIceFracture(reduced, age).sheetLift).toBe(0);
    }
    for (const reducedMotion of [false, true]) {
      const decrement = buildNumericIceFracture({ seed: "tick", cellCount: 4, reducedMotion });
      for (const age of [0, 0.012, 0.025, 0.05]) {
        const sample = sampleNumericIceFracture(decrement, age);
        expect(sample.iceSheetAlpha).toBe(0);
        expect(sample.sheetLift).toBe(0);
        expect(sample.shards).toHaveLength(0);
      }
    }
  });

  it("finishes particles smoothly inside the fixed duration and leaves no skin outside playback", () => {
    for (const reducedMotion of [false, true]) {
      const layout = buildNumericIceFracture({ seed: "tail-end", cellCount: 16, intensity: "shatter", reducedMotion });
      for (const geometry of [...layout.shards, ...layout.specks]) {
        expect(geometry.lifetime).toBeGreaterThan(0);
        expect(layout.timing.counterRevealAt + geometry.delay + geometry.lifetime)
          .toBeLessThanOrEqual(layout.timing.duration + 1e-12);
      }
      const almostDone = sampleNumericIceFracture(layout, layout.timing.duration - 0.001);
      expect([...almostDone.shards, ...almostDone.specks].every((part) => part.alpha < 0.001)).toBe(true);
      for (const age of [-1, Number.NaN, layout.timing.duration, layout.timing.duration + 1]) {
        const sample = sampleNumericIceFracture(layout, age);
        expect(sample.iceSheetAlpha).toBe(0);
        expect(sample.sheetLift).toBe(0);
        expect([...sample.shards, ...sample.specks, ...sample.cracks].every((part) => !part.visible)).toBe(true);
      }
    }
  });
});

describe("gate ice particle projection", () => {
  it("keeps every side on the same authored segment and throws outward with normal acceleration", () => {
    const fixture = { cellIndex: 1, origin: { x: 0.25, y: 0.75 }, velocity: { x: 0.5, y: -1 }, gravity: 2, cellSize: 40, normalSize: 20 };
    for (const side of ["top", "right", "bottom", "left"] as const) {
      const atRest = projectGateIceParticle({ ...fixture, side, age: 0 });
      const drifting = projectGateIceParticle({ ...fixture, side, age: 0.5 });
      const inertial = projectGateIceParticle({ ...fixture, side, age: 0.5, gravity: 0 });
      expect(atRest.tangent).toBe(50);
      expect(Math.abs(atRest.normal)).toBe(5);
      expect(drifting.tangent).toBe(60);
      expect(Math.abs(drifting.normal)).toBe(35);
      expect(Math.abs(inertial.normal)).toBe(25);
      expect(Math.sign(drifting.normal)).toBe(side === "top" || side === "left" ? -1 : 1);
    }
  });

  it("launches both halves of the seeded radial fan outward instead of back through a mouth", () => {
    const layout = buildNumericIceFracture({ seed: "radial-fan", cellCount: 4, intensity: "shatter" });
    expect(layout.shards.some(({ velocity }) => velocity.y > 0)).toBe(true);
    expect(layout.shards.some(({ velocity }) => velocity.y < 0)).toBe(true);
    for (const side of ["top", "right", "bottom", "left"] as const) {
      for (const shard of layout.shards) {
        const options = { ...shard, side, cellSize: 48, normalSize: 16 };
        const start = projectGateIceParticle({ ...options, age: 0 });
        const later = projectGateIceParticle({ ...options, age: 0.3 });
        expect(side === "top" || side === "left" ? later.normal < start.normal : later.normal > start.normal).toBe(true);
      }
    }
  });

  it("handles paused pre-launch ages and invalid numeric inputs without corrupting canvas coordinates", () => {
    const fixture = { side: "right" as const, cellIndex: 0, origin: { x: 0.5, y: 0.5 }, velocity: { x: 1, y: -1 }, gravity: 2, cellSize: 40, normalSize: 20 };
    expect(projectGateIceParticle({ ...fixture, age: -1 })).toEqual(projectGateIceParticle({ ...fixture, age: 0 }));
    const invalid = projectGateIceParticle({ ...fixture, age: Number.NaN, cellSize: Number.POSITIVE_INFINITY, normalSize: Number.NaN });
    expect(Number.isFinite(invalid.tangent)).toBe(true);
    expect(Number.isFinite(invalid.normal)).toBe(true);
  });
});
