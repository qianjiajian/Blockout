import { describe, expect, it } from "vitest";
import { expandInteractionTarget, MINIMUM_INTERACTION_TARGET_CSS } from "../src/game/hitTargets";

describe("adaptive Canvas interaction targets", () => {
  const shortScreenScale = 568 / 1078;

  it("expands a 58px logical icon to at least 44 CSS pixels on 320x568", () => {
    const target = expandInteractionTarget({ x: 25, y: 111, width: 58, height: 58 }, shortScreenScale);
    expect(target.width * shortScreenScale).toBeCloseTo(MINIMUM_INTERACTION_TARGET_CSS, 6);
    expect(target.height * shortScreenScale).toBeCloseTo(MINIMUM_INTERACTION_TARGET_CSS, 6);
  });

  it("does not shrink controls that already exceed the physical minimum", () => {
    const rect = { x: 111, y: 720, width: 274, height: 70 };
    const target = expandInteractionTarget(rect, 1);
    expect(target).toEqual(rect);
  });

  it("keeps edge controls inside the logical canvas", () => {
    const target = expandInteractionTarget({ x: 420, y: 62, width: 52, height: 53 }, shortScreenScale);
    expect(target.x).toBeGreaterThanOrEqual(0);
    expect(target.y).toBeGreaterThanOrEqual(0);
    expect(target.x + target.width).toBeLessThanOrEqual(496);
    expect(target.y + target.height).toBeLessThanOrEqual(1078);
  });

  it("supports directional expansion for vertically adjacent actions", () => {
    const primary = expandInteractionTarget(
      { x: 111, y: 720, width: 274, height: 70 },
      shortScreenScale,
      { anchorY: "end" },
    );
    const secondary = expandInteractionTarget(
      { x: 111, y: 804, width: 274, height: 58 },
      shortScreenScale,
      { anchorY: "start" },
    );
    expect(primary.y + primary.height).toBeLessThanOrEqual(secondary.y);
    expect(primary.height * shortScreenScale).toBeGreaterThanOrEqual(MINIMUM_INTERACTION_TARGET_CSS);
    expect(secondary.height * shortScreenScale).toBeGreaterThanOrEqual(MINIMUM_INTERACTION_TARGET_CSS);
  });

  it("falls back safely when the supplied scale is invalid", () => {
    const target = expandInteractionTarget({ x: 10, y: 10, width: 20, height: 20 }, 0);
    expect(target.width).toBe(MINIMUM_INTERACTION_TARGET_CSS);
    expect(target.height).toBe(MINIMUM_INTERACTION_TARGET_CSS);
  });
});
