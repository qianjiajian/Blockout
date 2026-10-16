import { describe, expect, it } from "vitest";
import { tutorialGuideMotion, tutorialTapMotion } from "../src/game/tutorialGuideMotion";

describe("tutorial guide motion", () => {
  it("travels only toward the target before fading and resetting invisibly", () => {
    const samples = Array.from({ length: 93 }, (_, index) => tutorialGuideMotion(index * 0.016, false));
    const visible = samples.filter((sample) => sample.alpha > 0.001);

    expect(visible[0].progress).toBe(0);
    expect(visible.some((sample) => sample.progress === 1)).toBe(true);
    for (let index = 1; index < visible.length; index += 1) {
      expect(visible[index].progress).toBeGreaterThanOrEqual(visible[index - 1].progress);
    }
    const hold = tutorialGuideMotion(1.16, false);
    const fading = tutorialGuideMotion(1.35, false);
    expect(hold.progress).toBe(1);
    expect(hold.alpha).toBeCloseTo(0.56, 8);
    expect(fading.progress).toBe(1);
    expect(fading.alpha).toBeGreaterThan(0);
    expect(fading.alpha).toBeLessThan(hold.alpha);
    expect(tutorialGuideMotion(1.5, false)).toEqual({ progress: 1, alpha: 0 });
    expect(tutorialGuideMotion(1.6, false).progress).toBeCloseTo(0, 8);
  });

  it("stays still when reduced motion is enabled", () => {
    expect(tutorialGuideMotion(0, true)).toEqual({ progress: 0.28, alpha: 0.78 });
    expect(tutorialGuideMotion(99, true)).toEqual({ progress: 0.28, alpha: 0.78 });
  });

  it("presses vertically in place for the rocket rescue cue", () => {
    const rest = tutorialTapMotion(0, false);
    const pressed = tutorialTapMotion(0.36, false);
    const released = tutorialTapMotion(0.9, false);
    expect(rest.offsetY).toBe(0);
    expect(pressed.offsetY).toBeGreaterThan(0);
    expect(pressed.scale).toBeLessThan(1);
    expect(released.offsetY).toBe(0);
    expect(tutorialTapMotion(99, true)).toEqual({ offsetY: 0, scale: 1, alpha: 0.86 });
  });
});
