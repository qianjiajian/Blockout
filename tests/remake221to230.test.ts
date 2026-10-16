import { describe, expect, it } from "vitest";
import { levelStarTargets, evaluateLevelStars } from "../src/core/levelStarConditions";
import { REMADE_221_230_LEVELS, CONTINUATION_221_230_PLAN } from "../src/core/remake221to230";
import { LEVELS, getLevelStrict } from "../src/core/levels";
import { replayRevisedRoute, type RevisedSearchDrag } from "../src/core/revisedLevelSearch";
import { auditRevisedMechanismContract } from "../src/core/revisedMechanismContract";
import { matchFormalBlockShape } from "../src/game/formalBlockShapes";
import evidence from "./fixtures/continuation221-230-qualified.json";
import { PuzzleModel } from "../src/core/PuzzleModel";
import type { LevelSpec } from "../src/core/types";

const replayTimedFixture = (level: LevelSpec, drags: RevisedSearchDrag[]) => {
  const model = new PuzzleModel(level);
  model.startCountdown();
  let nonClearingDrags = 0;
  for (const drag of drags) {
    const before = model.snapshot().cleared;
    model.tick(0.1);
    model.beginAction();
    for (const [x, y] of drag.path) {
      model.tick(0.02);
      expect(model.moveBlockStep(drag.blockId, x, y)).toBe(true);
    }
    if (drag.exitSide) expect(model.tryExit(drag.blockId, drag.exitSide).ok).toBe(true);
    expect(model.commitAction()).toBe(true);
    nonClearingDrags += Number(model.snapshot().cleared === before);
  }
  const final = model.snapshot();
  return { valid: !final.failed, complete: final.complete, effectiveDrags: final.moves, nonClearingDrags, error: undefined };
};

describe("221–230 independent isolated continuation", () => {
  it("keeps the ten-level plan separate from finished candidates and production", () => {
    expect(CONTINUATION_221_230_PLAN.map(p => p.difficulty)).toEqual([
      "easy", "normal", "normal", "hard", "easy", "normal", "hard", "easy", "normal", "super",
    ]);
    expect(CONTINUATION_221_230_PLAN.map(p => p.target)).toEqual([5,11,12,16,6,13,17,7,14,21]);
    expect(LEVELS).toHaveLength(200);
    for (const p of CONTINUATION_221_230_PLAN) expect(() => getLevelStrict(p.id)).toThrow();
    expect(REMADE_221_230_LEVELS.map(l => l.id)).toEqual(CONTINUATION_221_230_PLAN.map(p => p.id));
    expect(REMADE_221_230_LEVELS.map(l => l.id)).toEqual(evidence.map(e => e.evidence.id));
  });

  it.each(REMADE_221_230_LEVELS)("Lv$id replays its actual complete route in the required band", level => {
    const packet = evidence.find(e => e.evidence.id === level.id)!;
    const plan = CONTINUATION_221_230_PLAN.find(p => p.id === level.id)!;
    expect(level.difficulty).toBe(plan.difficulty);
    expect(auditRevisedMechanismContract(level)).toEqual([]);
    expect(level.blocks.every(b => matchFormalBlockShape(b.shape,"native-only")?.quarterTurns === 0)).toBe(true);
    const drags = packet.drags as unknown as RevisedSearchDrag[];
    const result = level.blocks.some(b => b.timedBombSeconds !== undefined)
      ? replayTimedFixture(level, drags) : replayRevisedRoute(level, drags);
    expect(result.valid, result.error).toBe(true);
    expect(result.complete).toBe(true);
    expect(result.nonClearingDrags).toBe(packet.evidence.upperBound);
    expect(packet.evidence.lowerBound).toBeGreaterThanOrEqual(plan.band[0]);
    expect(result.nonClearingDrags).toBeLessThanOrEqual(plan.band[1]);
    expect(levelStarTargets(level).moveTarget).toBe(result.effectiveDrags);
    expect(packet.evidence.pointer.map(p => p.viewport.width).sort()).toEqual([320,496]);
    const star = levelStarTargets(level);
    expect(evaluateLevelStars(level,{moves:star.moveTarget,elapsedSeconds:star.timeTargetSeconds}).earnedStars).toBe(3);
    expect(evaluateLevelStars(level,{moves:star.moveTarget+1,elapsedSeconds:star.timeTargetSeconds}).earnedStars).toBe(2);
  });
});
