import { describe, expect, it } from "vitest";
import { LEVELS } from "../src/core/levels";
import { solveLevelForValidation } from "../src/core/levelSolver";

describe("first-session onboarding hint", () => {
  it("tracks the current first drag of the verified level-one route", () => {
    const level = LEVELS[0];
    const hint = level.onboardingHint;
    const firstDrag = solveLevelForValidation(level).drags.find((drag) => drag.path.length > 0);

    expect(hint).toBeDefined();
    expect(firstDrag).toBeDefined();
    expect(hint?.blockId).toBe(firstDrag?.blockId);
    expect(hint?.path).toEqual(firstDrag?.path);
  });
});
