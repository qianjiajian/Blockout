import { describe, expect, it } from "vitest";
import { getLevel, LEVELS } from "../src/core/levels";
import {
  evaluateLevelStars,
  levelClearLoad,
  levelStarTargets,
  moveTargetForLevel,
  timeTargetForLevel,
} from "../src/core/levelStarConditions";

describe("level star conditions", () => {
  it("derives a concrete move and time target for every shipped level", () => {
    expect(LEVELS).toHaveLength(200);
    for (const level of LEVELS) {
      const targets = levelStarTargets(level);
      expect(Number.isInteger(targets.moveTarget)).toBe(true);
      expect(targets.moveTarget).toBeGreaterThanOrEqual(levelClearLoad(level));
      expect(Number.isInteger(targets.timeTargetSeconds)).toBe(true);
      expect(targets.timeTargetSeconds).toBeGreaterThanOrEqual(20);
      expect(targets.timeTargetSeconds).toBeLessThan(level.timeSeconds);
    }
  });

  it("preserves authored par moves and derives generated-level targets", () => {
    expect(moveTargetForLevel(getLevel(1))).toBe(getLevel(1).parMoves);
    expect(moveTargetForLevel(getLevel(15))).toBeLessThan(getLevel(15).parMoves!);
    expect(getLevel(101).parMoves).toBeUndefined();
    expect(moveTargetForLevel(getLevel(101))).toBeGreaterThan(levelClearLoad(getLevel(101)));
    expect(moveTargetForLevel(getLevel(200))).toBeGreaterThan(levelClearLoad(getLevel(200)));
  });

  it("uses the requested inclusive wording semantics for both bonus stars", () => {
    const level = getLevel(6);
    const targets = levelStarTargets(level);
    expect(evaluateLevelStars(level, {
      moves: targets.moveTarget,
      elapsedSeconds: targets.timeTargetSeconds,
    })).toMatchObject({
      passed: true,
      moveAchieved: true,
      timeAchieved: true,
      earnedStars: 3,
    });
    expect(evaluateLevelStars(level, {
      moves: targets.moveTarget + 1,
      elapsedSeconds: targets.timeTargetSeconds + 1,
    })).toMatchObject({
      moveAchieved: false,
      timeAchieved: false,
      earnedStars: 1,
    });
    expect(timeTargetForLevel(level)).toBe(targets.timeTargetSeconds);
  });
});
