import { describe, expect, it, vi } from "vitest";
import { GrayscaleImageCache } from "../src/game/GrayscaleImageCache";

const image = (width = 8, height = 8) => ({ naturalWidth: width, naturalHeight: height, width, height }) as HTMLImageElement;
function canvasFixture(data = new Uint8ClampedArray([20, 60, 120, 128])) {
  const pixels = { data } as ImageData;
  const ctx = { drawImage: vi.fn(), getImageData: vi.fn(() => pixels), putImageData: vi.fn() };
  const canvas = { width: 0, height: 0, getContext: vi.fn(() => ctx) } as unknown as HTMLCanvasElement;
  return { canvas, ctx, pixels };
}

describe("GrayscaleImageCache", () => {
  it("limits the maximum edge to 128 while making RGB equal and preserving every alpha byte", () => {
    const original = image(256, 128);
    const { canvas, ctx, pixels } = canvasFixture(new Uint8ClampedArray([
      255, 0, 0, 64, 0, 255, 0, 128, 0, 0, 255, 0, 123, 123, 123, 255,
    ]));
    const cache = new GrayscaleImageCache(() => canvas);
    expect(cache.get(original)).toBe(canvas);
    expect([canvas.width, canvas.height]).toEqual([128, 64]);
    expect(ctx.drawImage).toHaveBeenCalledWith(original, 0, 0, 128, 64);
    expect(ctx.getImageData).toHaveBeenCalledWith(0, 0, 128, 64);
    expect([...pixels.data]).toEqual([54, 54, 54, 64, 182, 182, 182, 128, 18, 18, 18, 0, 123, 123, 123, 255]);
    expect(ctx.putImageData).toHaveBeenCalledWith(pixels, 0, 0);
    expect([original.naturalWidth, original.naturalHeight]).toEqual([256, 128]);
  });

  it("reuses each conversion and releases all canvases on clear without enlarging small images", () => {
    const fixtures = [canvasFixture(), canvasFixture(), canvasFixture()];
    let created = 0;
    const create = vi.fn(() => fixtures[created++].canvas);
    const cache = new GrayscaleImageCache(create), first = image(), second = image(4, 2);
    expect(cache.get(first)).toBe(fixtures[0].canvas);
    expect(cache.get(first)).toBe(fixtures[0].canvas);
    expect(cache.get(second)).toBe(fixtures[1].canvas);
    expect([fixtures[1].canvas.width, fixtures[1].canvas.height]).toEqual([4, 2]);
    expect(create).toHaveBeenCalledTimes(2);
    expect(fixtures[0].ctx.getImageData).toHaveBeenCalledTimes(1);
    cache.clear();
    for (const { canvas } of fixtures.slice(0, 2)) expect([canvas.width, canvas.height]).toEqual([0, 0]);
    expect(cache.get(first)).toBe(fixtures[2].canvas);
    expect(create).toHaveBeenCalledTimes(3);
  });

  it("releases a failed temporary canvas and does not retry drawing or pixel failures each paint", () => {
    for (const method of ["drawImage", "getImageData", "putImageData"] as const) {
      const fixture = canvasFixture(), original = image();
      fixture.ctx[method].mockImplementation(() => { throw new Error("Native operation failed"); });
      const create = vi.fn(() => fixture.canvas), cache = new GrayscaleImageCache(create);
      expect(cache.get(original)).toBeUndefined();
      expect(cache.get(original)).toBeUndefined();
      expect(create).toHaveBeenCalledTimes(1);
      expect(fixture.ctx[method]).toHaveBeenCalledTimes(1);
      expect([fixture.canvas.width, fixture.canvas.height]).toEqual([0, 0]);
      cache.clear();
      expect([fixture.canvas.width, fixture.canvas.height]).toEqual([0, 0]);
    }
  });

  it("caches unavailable canvases or contexts and retries only after clearing", () => {
    const original = image(), create = vi.fn<() => HTMLCanvasElement | undefined>(() => undefined);
    const cache = new GrayscaleImageCache(create);
    expect(cache.get(original)).toBeUndefined();
    expect(cache.get(original)).toBeUndefined();
    expect(create).toHaveBeenCalledTimes(1);
    const canvas = { width: 0, height: 0, getContext: vi.fn(() => null) } as unknown as HTMLCanvasElement;
    cache.clear(); create.mockReturnValue(canvas);
    expect(cache.get(original)).toBeUndefined();
    expect(cache.get(original)).toBeUndefined();
    expect(create).toHaveBeenCalledTimes(2);
    expect([canvas.width, canvas.height]).toEqual([0, 0]);
    expect(cache.get(image(0, 0))).toBeUndefined();
    expect(create).toHaveBeenCalledTimes(2);
  });
});
