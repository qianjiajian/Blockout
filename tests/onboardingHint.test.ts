import { describe, expect, it } from "vitest";
import { LEVELS } from "../src/core/levels";
import { PuzzleModel } from "../src/core/PuzzleModel";

describe("first-session onboarding hint", () => {
  it("points at the approved zero-reposition direct exit on level one", () => {
    const level = LEVELS[0];
    const hint = level.onboardingHint;
    expect(hint).toBeDefined();
    expect(hint?.path).toEqual([]);
    const model = new PuzzleModel(level);
    const block = hint ? model.getBlock(hint.blockId) : undefined;
    expect(block).toBeDefined();
    const exitSide = block ? model.possibleExitSides(block)[0] : undefined;
    expect(exitSide).toBeDefined();
    if (!hint || !exitSide) throw new Error("Lv1 onboarding direct exit is unavailable");
    model.beginAction();
    expect(model.tryExit(hint.blockId, exitSide).ok).toBe(true);
    expect(model.commitAction()).toBe(true);
  });
});
