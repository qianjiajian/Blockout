import { describe, expect, it } from "vitest";
import { LEVELS_BEFORE_TIME_FREEZE as LEVELS, LEVELS_BEFORE_EXIT_ANIMATION_COMPLETION } from "../src/core/levels";
import { usesExitAnimationCompletion } from "../src/core/mechanismRules";
import { validateLevel } from "../src/core/PuzzleModel";
import { levelStarTargets } from "../src/core/levelStarConditions";

describe("v1.13 final campaign profile migration", () => {
  it("validates all 200 final levels in their unchanged order", () => {
    expect(LEVELS).toHaveLength(200);
    expect(LEVELS_BEFORE_EXIT_ANIMATION_COMPLETION).toHaveLength(200);
    expect(LEVELS.map((level) => level.id)).toEqual(Array.from({ length: 200 }, (_, i) => i + 1));
    for (const level of LEVELS) expect(() => validateLevel(level), `Lv${level.id}`).not.toThrow();
  });

  it("keeps the same legacy objects for Lv1–20, including all optional data", () => {
    for (let i = 0; i < 20; i += 1) {
      expect(LEVELS[i], `Lv${i + 1} object identity`).toBe(LEVELS_BEFORE_EXIT_ANIMATION_COMPLETION[i]);
      expect(usesExitAnimationCompletion(LEVELS[i]!)).toBe(false);
      expect(LEVELS[i]!.flipDoors ?? []).toEqual([]);
    }
  });

  it("changes only mechanismRules for Lv21–200, retaining actual star and reward values", () => {
    for (let i = 20; i < 200; i += 1) {
      const level = LEVELS[i]!, before = LEVELS_BEFORE_EXIT_ANIMATION_COMPLETION[i]!;
      expect(before.mechanismRules, `previous Lv${level.id}`).toBe("revised-2026-09-21-v1.2");
      expect(level.mechanismRules).toBe("revised-2026-09-23-v1.3");
      expect({ ...level, mechanismRules: before.mechanismRules }, `all fields Lv${level.id}`).toEqual(before);
      expect(levelStarTargets(level), `actual stars Lv${level.id}`).toEqual(levelStarTargets(before));
      expect(level.reward).toBe(before.reward);
      expect(level.timeSeconds).toBe(before.timeSeconds);
    }
  });

  it("retains the six formal flip-door levels for independent animation-completion route replay", () => {
    expect(LEVELS.filter((level) => level.flipDoors?.length).map((level) => level.id))
      .toEqual([150, 152, 155, 171, 178, 181]);
  });
});
