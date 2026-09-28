import { describe, expect, it } from "vitest";
import { drawContinuousGateStrip } from "../src/game/continuousGateStrip";

const fixture = (width: number, height: number) => {
  const image = { naturalWidth: width, naturalHeight: height, width, height } as HTMLImageElement;
  const calls: Array<{ image: unknown; args: number[] }> = [];
  const ctx = {
    drawImage: (source: unknown, ...args: number[]) => { calls.push({ image: source, args }); },
  } as unknown as CanvasRenderingContext2D;
  return { image, calls, ctx };
};

describe("continuous gate strip", () => {
  for (const horizontal of [true, false]) {
    for (const size of [4, 5, 6, 9, 10]) {
      it(`keeps one continuous ${size}-cell ${horizontal ? "horizontal" : "vertical"} aperture`, () => {
        const sourceLength = horizontal ? 286 : 299;
        const width = horizontal ? sourceLength : 58;
        const height = horizontal ? 58 : sourceLength;
        const { image, calls, ctx } = fixture(width, height);
        const x = -58, y = 95;
        const destinationLength = size * 95 + sourceLength - 285;
        drawContinuousGateStrip(ctx, image, horizontal, x, y, destinationLength);

        expect(calls).toHaveLength(3);
        expect(calls.every((call) => call.image === image)).toBe(true);
        const rectangles = calls.map(({ args }) => {
          expect(args).toHaveLength(8);
          const [sx, sy, sw, sh, dx, dy, dw, dh] = args;
          expect(horizontal ? [sy, sh, dy, dh] : [sx, sw, dx, dw])
            .toEqual(horizontal ? [0, height, y, height] : [0, width, x, width]);
          return {
            sourceStart: horizontal ? sx : sy,
            sourceLength: horizontal ? sw : sh,
            destinationStart: horizontal ? dx : dy,
            destinationLength: horizontal ? dw : dh,
          };
        });
        expect(rectangles[0].sourceStart).toBe(0);
        expect(rectangles[0].destinationStart).toBe(horizontal ? x : y);
        for (let i = 0; i < 2; i += 1) {
          expect(rectangles[i].sourceStart + rectangles[i].sourceLength).toBe(rectangles[i + 1].sourceStart);
          expect(rectangles[i].destinationStart + rectangles[i].destinationLength)
            .toBe(rectangles[i + 1].destinationStart);
        }
        expect(rectangles[2].sourceStart + rectangles[2].sourceLength).toBe(sourceLength);
        expect(rectangles[2].destinationStart + rectangles[2].destinationLength)
          .toBe((horizontal ? x : y) + destinationLength);
        for (const endpoint of [rectangles[0], rectangles[2]]) {
          expect(endpoint.sourceLength).toBe(24);
          expect(endpoint.destinationLength).toBe(endpoint.sourceLength);
        }
        expect(rectangles[1].destinationLength).toBeGreaterThan(rectangles[1].sourceLength);
      });
    }
  }

  it("uses host bitmap dimensions when natural dimensions are unavailable", () => {
    const { image, calls, ctx } = fixture(286, 58);
    Object.assign(image, { naturalWidth: 0, naturalHeight: 0 });
    drawContinuousGateStrip(ctx, image, true, 0, 0, 381);
    expect(calls).toHaveLength(3);
    expect(calls[2].args).toEqual([262, 0, 24, 58, 357, 0, 24, 58]);
  });

  it("limits caps for small sources and destinations without negative slices", () => {
    const { image, calls, ctx } = fixture(12, 8);
    drawContinuousGateStrip(ctx, image, true, 0, 0, 6);
    expect(calls.map(({ args }) => args)).toEqual([
      [0, 0, 2, 8, 0, 0, 2, 8],
      [2, 0, 8, 8, 2, 0, 2, 8],
      [10, 0, 2, 8, 4, 0, 2, 8],
    ]);
  });

  it.each([0, -1, Number.NaN, Infinity, -Infinity])("ignores invalid destination length %s", (length) => {
    const { image, calls, ctx } = fixture(286, 58);
    drawContinuousGateStrip(ctx, image, true, 0, 0, length);
    expect(calls).toHaveLength(0);
  });

  it.each([0, -1, Number.NaN, Infinity, -Infinity])("ignores invalid bitmap dimension %s", (length) => {
    for (const horizontal of [true, false]) {
      const { image, calls, ctx } = fixture(horizontal ? length : 58, horizontal ? 58 : length);
      drawContinuousGateStrip(ctx, image, horizontal, 0, 0, 950);
      expect(calls).toHaveLength(0);
    }
  });

  it.each([Number.NaN, Infinity, -Infinity])("ignores invalid anchor %s", (position) => {
    const { image, calls, ctx } = fixture(286, 58);
    drawContinuousGateStrip(ctx, image, true, position, 0, 950);
    drawContinuousGateStrip(ctx, image, false, 0, position, 950);
    expect(calls).toHaveLength(0);
  });

  it("does not emit overflowing or underflowed canvas rectangles", () => {
    const { image, calls, ctx } = fixture(286, 58);
    drawContinuousGateStrip(ctx, image, true, Number.MAX_VALUE, 0, Number.MAX_VALUE);
    drawContinuousGateStrip(ctx, image, false, 0, Number.MAX_VALUE, Number.MAX_VALUE);
    drawContinuousGateStrip(ctx, image, true, 0, 0, Number.MIN_VALUE);
    expect(calls).toHaveLength(0);
  });
});
