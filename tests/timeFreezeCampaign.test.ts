import { describe, expect, it } from "vitest";
import { LEVELS, LEVELS_BEFORE_LEVEL21_REPOSITION, LEVELS_BEFORE_TIME_FREEZE } from "../src/core/levels";
import { usesExitAnimationCompletion } from "../src/core/mechanismRules";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import { SUPPLY_ITEMS, TIME_FREEZE_SECONDS } from "../src/core/supply";
import { levelStarTargets } from "../src/core/levelStarConditions";

describe("v1.14 time freeze campaign migration", () => {
  it("preserves all 200 layouts, durations, rewards and actual star conditions", () => {
    expect(LEVELS).toHaveLength(200);
    expect(LEVELS.map(({ id }) => id)).toEqual(Array.from({ length: 200 }, (_, i) => i + 1));
    // Certify the historical time-only migration before v1.15's independently
    // tested Lv21 block redesign. The second test still uses final LEVELS.
    for (const [i, level] of LEVELS_BEFORE_LEVEL21_REPOSITION.entries()) {
      const before = LEVELS_BEFORE_TIME_FREEZE[i]!;
      expect(() => validateLevel(level), `Lv${level.id}`).not.toThrow();
      expect({ ...level, mechanismRules: before.mechanismRules }, `Lv${level.id} data`).toEqual(before);
      expect(levelStarTargets(level)).toEqual(levelStarTargets(before));
      if (level.id <= 20) expect(level).toBe(before);
      else {
        expect(before.mechanismRules).toBe("revised-2026-09-23-v1.3");
        expect(level.mechanismRules).toBe("revised-2026-09-23-v1.4");
        expect(usesExitAnimationCompletion(level)).toBe(true);
      }
    }
  });

  it("freezes the same countdown for ten seconds on every formal level, without spending moves", () => {
    expect(TIME_FREEZE_SECONDS).toBe(10);
    expect(SUPPLY_ITEMS.time).toMatchObject({ kind: "time", price: 300, maxStock: 9, unlockLevel: 4 });
    for (const level of LEVELS) {
      const model = new PuzzleModel(level);
      const before = model.snapshot();
      model.beginAction();
      expect(model.freezeTime(TIME_FREEZE_SECONDS), `Lv${level.id} activation`).toBe(true);
      model.commitAction(false);
      model.tick(6);
      const frozen = model.snapshot();
      expect(frozen.remainingSeconds, `Lv${level.id} main clock`).toBe(before.remainingSeconds);
      expect(frozen.timeFreezeSeconds).toBe(4);
      expect(frozen.moves).toBe(before.moves);
      for (const block of frozen.blocks) {
        const old = before.blocks.find(({ id }) => id === block.id);
        if (old?.timedBombSeconds != null) expect(block.timedBombSeconds, `Lv${level.id}/${block.id}`).toBe(old.timedBombSeconds);
      }
      model.tick(5);
      expect(model.snapshot().timeFreezeSeconds).toBe(0);
      expect(model.snapshot().remainingSeconds).toBe(before.remainingSeconds - 1);
    }
  });
});
