import { describe, expect, it } from "vitest";
import { projectShutterVisualRect, shutterCounterLayout } from "../src/game/shutterVisualLayout";

describe("shutter visual projection", () => {
  it("uses one proportional inset for a multi-cell cover", () => {
    expect(projectShutterVisualRect(1, 2, 4, 3, { innerX: 20, innerY: 30, cell: 80 })).toEqual({
      x: 102.8,
      y: 192.8,
      width: 314.4,
      height: 234.4,
    });
  });

  it.each([32, 40, 64, 80])("keeps a one-cell counter inside its cover at cell=%s", (cell) => {
    const rect = projectShutterVisualRect(0, 0, 1, 1, { innerX: 0, innerY: 0, cell });
    const counter = shutterCounterLayout(rect);
    expect(counter.x).toBeGreaterThanOrEqual(rect.x);
    expect(counter.y).toBeGreaterThanOrEqual(rect.y);
    expect(counter.x + counter.width).toBeLessThanOrEqual(rect.x + rect.width);
    expect(counter.y + counter.height).toBeLessThanOrEqual(rect.y + rect.height);
  });
});
