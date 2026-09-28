import { describe, expect, it } from "vitest";
import { WIN_GLOW_ROTATION_PERIOD_SECONDS, winGlowRotation } from "../src/game/winGlowAnimation";

describe("formal win glow animation", () => {
  it("rotates clockwise at a constant rate and loops without a seam", () => {
    expect(winGlowRotation(0, false)).toBe(0);
    expect(winGlowRotation(WIN_GLOW_ROTATION_PERIOD_SECONDS / 4, false)).toBeCloseTo(Math.PI / 2, 10);
    expect(winGlowRotation(WIN_GLOW_ROTATION_PERIOD_SECONDS / 2, false)).toBeCloseTo(Math.PI, 10);
    expect(winGlowRotation(WIN_GLOW_ROTATION_PERIOD_SECONDS, false)).toBeCloseTo(0, 10);
  });

  it("keeps the supplied glow static when reduced motion is enabled", () => {
    expect(winGlowRotation(0, true)).toBe(0);
    expect(winGlowRotation(WIN_GLOW_ROTATION_PERIOD_SECONDS * 3.75, true)).toBe(0);
  });
});
