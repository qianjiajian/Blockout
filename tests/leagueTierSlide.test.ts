import { describe, expect, it } from "vitest";
import { LEAGUE_TIER_SLIDE_DURATION, leagueTierCarouselSlots, sampleLeagueTierPosition } from "../src/game/leagueTierSlide";

describe("league tier icon slide", () => {
  it("starts in place, eases out and finishes exactly at its target", () => {
    expect(sampleLeagueTierPosition({ from: 2, to: 3, age: -1 })).toBe(2);
    expect(sampleLeagueTierPosition({ from: 2, to: 3, age: 0 })).toBe(2);
    expect(sampleLeagueTierPosition({ from: 2, to: 3, age: LEAGUE_TIER_SLIDE_DURATION / 2 })).toBe(2.875);
    expect(sampleLeagueTierPosition({ from: 2, to: 3, age: LEAGUE_TIER_SLIDE_DURATION })).toBe(3);
    expect(sampleLeagueTierPosition({ from: 2, to: 3, age: 1 })).toBe(3);
  });

  it("uses the same timing in both directions and stays within the eight ranks", () => {
    expect(sampleLeagueTierPosition({ from: 3, to: 2, age: LEAGUE_TIER_SLIDE_DURATION / 2 })).toBe(2.125);
    expect(sampleLeagueTierPosition({ from: -2, to: 20, age: 0 })).toBe(0);
    expect(sampleLeagueTierPosition({ from: -2, to: 20, age: 1 })).toBe(7);
  });

  it("retargets from the current floating position without a first-frame jump", () => {
    const displayed = sampleLeagueTierPosition({ from: 2, to: 3, age: 0.09 });
    expect(sampleLeagueTierPosition({ from: displayed, to: 1, age: 0 })).toBe(displayed);
    expect(sampleLeagueTierPosition({ from: displayed, to: 1, age: 0.01 })).toBeLessThan(displayed);
    expect(sampleLeagueTierPosition({ from: displayed, to: 1, age: LEAGUE_TIER_SLIDE_DURATION })).toBe(1);
  });

  it("preserves the original center and neighbor slots when stationary", () => {
    const slots = leagueTierCarouselSlots(3);
    expect(slots.map(slot => slot.tier)).toEqual([2, 4, 3]);
    expect(slots[0]).toEqual({ tier: 2, x: 4, y: 210, width: 124, height: 185, alpha: 0.32, distance: 1 });
    expect(slots[1]).toEqual({ tier: 4, x: 365, y: 210, width: 124, height: 185, alpha: 0.32, distance: 1 });
    expect(slots[2]).toEqual({ tier: 3, x: 146, y: 169, width: 204, height: 226, alpha: 1, distance: 0 });
  });

  it("slides the real neighboring icons through the four visible slots, farthest first", () => {
    const slots = leagueTierCarouselSlots(2.5);
    expect(slots.map(slot => slot.tier)).toEqual([1, 4, 2, 3]);
    const departing = slots.find(slot => slot.tier === 2)!;
    const arriving = slots.find(slot => slot.tier === 3)!;
    expect(departing.x + departing.width / 2).toBeLessThan(248);
    expect(arriving.x + arriving.width / 2).toBeGreaterThan(248);
    expect(arriving.width).toBe(departing.width);
    expect(arriving.alpha).toBe(departing.alpha);
    expect(slots[0].alpha).toBeLessThan(departing.alpha);
  });

  it("never wraps the first or last tier into a nonexistent rank", () => {
    expect(leagueTierCarouselSlots(0).map(slot => slot.tier)).toEqual([1, 0]);
    expect(leagueTierCarouselSlots(7).map(slot => slot.tier)).toEqual([6, 7]);
    for (let position = 0; position <= 7; position += 0.05) {
      const slots = leagueTierCarouselSlots(position);
      expect(new Set(slots.map(slot => slot.tier)).size).toBe(slots.length);
      for (const slot of slots) {
        expect(slot.tier).toBeGreaterThanOrEqual(0); expect(slot.tier).toBeLessThan(8);
        expect(slot.alpha).toBeGreaterThan(0); expect(slot.alpha).toBeLessThanOrEqual(1);
        expect(slot.width).toBeGreaterThan(0); expect(slot.height).toBeGreaterThan(0);
      }
    }
  });

  it("keeps geometry continuous through the center and side anchors", () => {
    for (const position of [2, 3, 4]) {
      const left = leagueTierCarouselSlots(position - 0.0001).find(slot => slot.tier === 3)!;
      const right = leagueTierCarouselSlots(position + 0.0001).find(slot => slot.tier === 3)!;
      for (const key of ["x", "y", "width", "height", "alpha"] as const) {
        expect(Math.abs(left[key] - right[key])).toBeLessThan(0.001);
      }
    }
  });
});
