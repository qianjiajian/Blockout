import { describe, expect, it } from "vitest";
import { sampleCollectionRewardProgress } from "../src/game/collectionRewardProgress";

const base = {
  bounds: { x: 35, y: 1288, width: 650, height: 210 },
  previous: 3, current: 4, total: 5, age: 0, reducedMotion: false,
};

describe("collection reward progress presentation", () => {
  it("fills only the newly earned segment over 0.6 seconds without changing the supplied progress", () => {
    expect(sampleCollectionRewardProgress(base).segments.map((s) => s.fill)).toEqual([1, 1, 1, 0, 0]);
    const midway = sampleCollectionRewardProgress({ ...base, age: 0.3 });
    expect(midway.value).toBeGreaterThan(3.5);
    expect(midway.value).toBeLessThan(4);
    expect(midway.segments[4].fill).toBe(0);
    expect(sampleCollectionRewardProgress({ ...base, age: 0.6 }).segments.map((s) => s.fill))
      .toEqual([1, 1, 1, 1, 0]);
    expect(base.current).toBe(4);
  });

  it("shows the final value immediately for reduced motion and stays unchanged on a replay", () => {
    expect(sampleCollectionRewardProgress({ ...base, reducedMotion: true }).value).toBe(4);
    for (const age of [0, 0.2, 4]) {
      expect(sampleCollectionRewardProgress({ ...base, current: 3, age }).value).toBe(3);
    }
  });

  it("clamps malformed counts and elapsed time to the real interval", () => {
    const negative = sampleCollectionRewardProgress({ ...base, previous: -2, current: 7, age: -1 });
    expect(negative).toMatchObject({ previous: 0, current: 5, value: 0 });
    const full = sampleCollectionRewardProgress({ ...base, previous: 10, current: 7, age: 100 });
    expect(full.segments.map((s) => s.fill)).toEqual([1, 1, 1, 1, 1]);
    expect(sampleCollectionRewardProgress({ ...base, age: Number.NaN }).value).toBe(3);
  });

  it.each([5, 10])("keeps %i segments ordered, separated and within a narrow bar", (total) => {
    const bounds = { x: 14, y: 510, width: 270, height: 87 };
    const result = sampleCollectionRewardProgress({ ...base, bounds, total });
    expect(result.segments).toHaveLength(total);
    result.segments.forEach((segment, index) => {
      expect(segment.width).toBeGreaterThan(0);
      expect(segment.height).toBeGreaterThan(0);
      expect(segment.x).toBeGreaterThan(result.bar.x);
      expect(segment.x + segment.width).toBeLessThan(result.bar.x + result.bar.width);
      expect(segment.y + segment.height).toBeLessThan(result.bar.y + result.bar.height);
      if (index) expect(segment.x).toBeGreaterThan(result.segments[index - 1].x + segment.width);
    });
  });

  it("has a finite terminal sample with no invented goal for an empty catalogue", () => {
    const result = sampleCollectionRewardProgress({ ...base, total: 0, age: 10 });
    expect(result).toMatchObject({ total: 0, previous: 0, current: 0, value: 0, segments: [] });
  });
});
