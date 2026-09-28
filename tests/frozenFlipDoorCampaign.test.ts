import { describe, expect, it } from "vitest";
import { LEVELS_BEFORE_LEVEL70_GENERATOR_REMAKE as LEVELS, LEVELS_BEFORE_FROZEN_FLIP } from "../src/core/levels";
import { ACTIVE_MECHANISM_PROFILE } from "../src/core/mechanismRules";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import { levelStarTargets } from "../src/core/levelStarConditions";
import { checkRevisedRepositionFloor } from "../src/core/revisedRepositionFloor";
import { replayRevisedRoute, type RevisedSearchDrag } from "../src/core/revisedLevelSearch";
import route from "./fixtures/frozen-flip150-v190.json";

describe("v1.90 frozen flip-door migration", () => {
  it("changes only affected final profiles, preserving every authored field and all other object identities", () => {
    const affected: number[] = [];
    expect(LEVELS).toHaveLength(200);
    for (const [i, level] of LEVELS.entries()) {
      const previous = LEVELS_BEFORE_FROZEN_FLIP[i]!;
      expect(() => validateLevel(level)).not.toThrow();
      if (previous.flipDoors?.some((door) => (door.frozen ?? 0) > 0)) {
        affected.push(level.id);
        expect(previous.mechanismRules).toBe("revised-2026-09-23-v1.4");
        expect(level.mechanismRules).toBe(ACTIVE_MECHANISM_PROFILE);
        expect({ ...level, mechanismRules: previous.mechanismRules }).toEqual(previous);
      } else expect(level).toBe(previous);
      expect(levelStarTargets(level)).toEqual(levelStarTargets(previous));
    }
    expect(affected).toEqual([150]);
  });

  it("does not certify new flip timing with an unsupported historical bound solver", () => {
    const result = checkRevisedRepositionFloor(LEVELS[149]!, { floor: 5 });
    expect(result.status).toBe("unsupported");
    expect(result.thresholdProven).toBe(false);
  });

  it("completes the current Lv150 with 25 drags in both canonical and deferred model replay", () => {
    const level = LEVELS[149]!;
    expect(level).toEqual(route.level);
    const drags = route.drags as unknown as RevisedSearchDrag[];
    expect(replayRevisedRoute(level, drags)).toMatchObject({
      valid: true, complete: true, effectiveDrags: 25, nonClearingDrags: 9,
    });
    const model = new PuzzleModel(level, { deferExitCompletion: true });
    model.startCountdown();
    for (const drag of drags) {
      model.beginAction();
      for (const [x, y] of drag.path) expect(model.moveBlockStep(drag.blockId, x, y)).toBe(true);
      if (drag.exitSide) {
        const result = model.tryExit(drag.blockId, drag.exitSide);
        expect(result.ok).toBe(true);
        expect(result.exitAnimationId).toBeDefined();
        model.tick(0.3);
        expect(model.completeExitAnimation(result.exitAnimationId!)).toBe(true);
      }
      expect(model.commitAction()).toBe(true);
    }
    expect(model.snapshot()).toMatchObject({ complete: true, failed: false, moves: 25 });
    expect(levelStarTargets(level).moveTarget).toBe(26);
  });
});
