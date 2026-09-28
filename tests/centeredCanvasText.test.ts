import { describe, expect, it } from "vitest";
import { centeredCanvasTextOrigin } from "../src/game/canvasTypography";

describe("visible timeout heading centering", () => {
  it("centres actual ink instead of the space reserved for full-width punctuation", () => {
    const metrics = { actualBoundingBoxLeft: 120, actualBoundingBoxRight: 96,
      actualBoundingBoxAscent: 34, actualBoundingBoxDescent: 16 };
    const origin = centeredCanvasTextOrigin(metrics, 356, 363);
    expect(origin).toEqual({ x: 368, y: 372 });
    expect(origin.x + (metrics.actualBoundingBoxRight - metrics.actualBoundingBoxLeft) / 2).toBe(356);
    expect(origin.y + (metrics.actualBoundingBoxDescent - metrics.actualBoundingBoxAscent) / 2).toBe(363);
  });

  it("keeps symmetrical text at its requested centre", () => {
    expect(centeredCanvasTextOrigin({ actualBoundingBoxLeft: 60, actualBoundingBoxRight: 60,
      actualBoundingBoxAscent: 20, actualBoundingBoxDescent: 20 }, 356, 363)).toEqual({ x: 356, y: 363 });
  });

  it("retains normal Canvas centre/middle placement when native metrics are unavailable", () => {
    expect(centeredCanvasTextOrigin({ width: 120 }, 356, 363)).toEqual({ x: 356, y: 363 });
    expect(centeredCanvasTextOrigin({ actualBoundingBoxLeft: NaN, actualBoundingBoxAscent: Infinity }, 356, 363))
      .toEqual({ x: 356, y: 363 });
  });
});
