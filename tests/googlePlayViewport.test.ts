import { describe, expect, it } from "vitest";
import { googlePlayViewportTransform } from "../src/googlePlay/viewport";

describe("Google Play complete artwork inside safe viewport", () => {
  for (const [width, height, safeTop, safeBottom, left, right] of [
    [360, 800, 36, 0, 0, 0], [393, 852, 0, 0, 0, 0],
    [393, 852, 34, 24, 0, 0], [360, 780, 42, 0, 0, 0],
    [320, 568, 0, 0, 0, 0], [412, 915, 24, 16, 0, 0],
    [768, 1024, 0, 24, 0, 0], [800, 360, 0, 0, 36, 0],
  ]) it(`${width}x${height}, safe ${left}/${safeTop}/${right}/${safeBottom}`, () => {
    const v = googlePlayViewportTransform({ width, height, safeTop, safeBottom, pixelRatio: 1.5 }, 496, 1078, { left, right });
    // Exact authored home extents, including the extra 13.2 logical pixels
    // outside the nominal game rectangle that previously clipped the label.
    const extra = (1584 * 496 / 720 - 1078) / 2;
    expect(v.offsetX).toBeGreaterThanOrEqual(left - 1e-8);
    expect(v.offsetX + 496 * v.scale).toBeLessThanOrEqual(width - right + 1e-8);
    expect(v.offsetY - extra * v.scale).toBeGreaterThan(safeTop);
    expect(v.offsetY + (1078 + extra) * v.scale).toBeLessThan(height - safeBottom);
    for (const [x, y] of [[0, 0], [248, 539], [496, 1078]]) {
      expect((v.offsetX + x * v.scale - v.offsetX) / v.scale).toBeCloseTo(x);
      expect((v.offsetY + y * v.scale - v.offsetY) / v.scale).toBeCloseTo(y);
    }
  });
});
