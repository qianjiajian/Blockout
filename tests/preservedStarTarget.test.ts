import { describe, expect, it } from "vitest";
import { getLevel } from "../src/core/levels";
import { evaluateLevelStars, moveTargetForLevel, timeTargetForLevel } from "../src/core/levelStarConditions";

describe("pre-remake actual move target preservation", () => {
  it("does not recalculate an explicitly preserved target from the new inventory", () => {
    const compact = { ...getLevel(1), parMoves: 204 };
    expect(moveTargetForLevel(compact)).toBeLessThan(204);
    const preserved = { ...compact, preservedMoveTarget: 204 };
    expect(moveTargetForLevel(preserved)).toBe(204);
    expect(timeTargetForLevel(preserved)).toBe(timeTargetForLevel(compact));
  });
  it("retains old fallback behavior for absent or malformed preservation metadata", () => {
    const compact = { ...getLevel(1), parMoves: 204 };
    for (const invalid of [undefined, 0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(moveTargetForLevel({ ...compact, preservedMoveTarget: invalid })).toBe(moveTargetForLevel(compact));
    }
  });
  it("uses the same preserved target at settlement, inclusively", () => {
    const level = { ...getLevel(1), parMoves: 204, preservedMoveTarget: 204 };
    expect(evaluateLevelStars(level, { moves: 204, elapsedSeconds: 0 }).moveAchieved).toBe(true);
    expect(evaluateLevelStars(level, { moves: 205, elapsedSeconds: 0 }).moveAchieved).toBe(false);
  });
});
