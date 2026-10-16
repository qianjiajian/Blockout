import { describe, expect, it } from "vitest";
import { LEVELS } from "../src/core/levels";
import { solveLevelForValidation } from "../src/core/levelSolver";
import { PuzzleModel } from "../src/core/PuzzleModel";
import { GAME_ART } from "../src/game/artManifest";

describe("first-session onboarding hint", () => {
  it("traces the approved horizontal opening route on level one", () => {
    const level = LEVELS[0];
    const hint = level.onboardingHint;
    expect(hint).toBeDefined();
    expect(hint?.path).toEqual([[1, 0], [2, 0], [3, 0]]);
    const model = new PuzzleModel(level);
    const block = hint ? model.getBlock(hint.blockId) : undefined;
    expect(block).toBeDefined();
    if (!hint || !block) throw new Error("Lv1 onboarding block is unavailable");
    model.beginAction();
    for (const [x, y] of hint.path) expect(model.moveBlockStep(hint.blockId, x, y)).toBe(true);
    expect(model.tryExit(hint.blockId, "right").ok).toBe(true);
    expect(model.commitAction()).toBe(true);
  });

  it("keeps three colored pieces in three corners with a verified opening route", () => {
    const level = LEVELS[0];
    const origins = level.blocks.map(({ x, y }) => `${x},${y}`);
    expect(level.blocks).toHaveLength(3);
    expect(new Set(origins)).toEqual(new Set(["0,0", "0,3", "3,3"]));
    expect(level.blocks.find(({ color }) => color === "blue")).toMatchObject({ x: 0, y: 0 });
    expect(level.blocks.find(({ color }) => color === "purple")).toMatchObject({ x: 0, y: 3 });
    expect(level.blocks.find(({ color }) => color === "pink")).toMatchObject({ x: 3, y: 3 });
    expect(new Set(level.blocks.map(({ color }) => color)).size).toBe(3);
    expect(GAME_ART.ui.tutorialHand).toBe("assets/art/ui/icons/tutorial-hand-supplied-v2.png");

    const solution = solveLevelForValidation(level);
    expect(solution.solved).toBe(true);
    expect(solution.minimumDrags).toBe(3);
    expect(solution.drags[0]).toEqual({
      blockId: "cc-001-b1-01",
      path: [[1, 0], [2, 0], [3, 0]],
      exitSide: "right",
    });
  });
});
