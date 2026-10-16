import { describe, expect, it } from "vitest";
import { collectionStarStatus, normalizeCollectionStarRecords } from "../src/core/collectionStarRecord";
import { LEVELS } from "../src/core/levels";
import { levelStarTargets } from "../src/core/levelStarConditions";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";

describe("collection star conditions", () => {
  const level = LEVELS[0];
  const target = levelStarTargets(level);
  it("identifies each missing condition independently on the same attempt", () => {
    expect(collectionStarStatus(level, 2, { stars: 2, moves: target.moveTarget, elapsedSeconds: target.timeTargetSeconds + 1 })).toEqual([true, true, false]);
    expect(collectionStarStatus(level, 2, { stars: 2, moves: target.moveTarget + 1, elapsedSeconds: target.timeTargetSeconds })).toEqual([true, false, true]);
    expect(collectionStarStatus(level, 1, { stars: 1, moves: target.moveTarget + 1, elapsedSeconds: target.timeTargetSeconds + 1 })).toEqual([true, false, false]);
  });
  it("does not guess which optional star an old two-star record earned", () => {
    expect(collectionStarStatus(level, 2)).toEqual([true, undefined, undefined]);
    expect(collectionStarStatus(level, 3)).toEqual([true, true, true]);
    expect(collectionStarStatus(level, 0)).toEqual([false, false, false]);
  });
  it("rejects corrupt records and copies nested records without aliasing", () => {
    const raw = { 1: { stars: 2, moves: 10, elapsedSeconds: 20 }, 2: { stars: 4, moves: -1, elapsedSeconds: NaN } };
    const records = normalizeCollectionStarRecords(raw);
    expect(Object.keys(records)).toEqual(["1"]);
    records["1"].moves = 30;
    expect(raw[1].moves).toBe(10);
  });
  it("migrates old saves and persists condition records through sanitize and clone", () => {
    const game = Object.create(ColorEscapeGame.prototype) as any;
    const save = game.sanitizeSave(undefined);
    expect(save.bestStarConditions).toEqual({});
    save.bestStarConditions["1"] = { stars: 2, moves: 10, elapsedSeconds: 20 };
    const restored = game.sanitizeSave(save);
    const copied = game.cloneSave(restored);
    copied.bestStarConditions["1"].moves = 30;
    expect(restored.bestStarConditions["1"].moves).toBe(10);
    expect(game.sanitizeSave({ ...save, bestStarConditions: undefined }).bestStarConditions).toEqual({});
  });
  it("updates one best attempt only inside the pending settlement candidate", () => {
    const game = Object.create(ColorEscapeGame.prototype) as any;
    game.save = game.sanitizeSave(undefined);
    game.save.highestLevel = 21;
    game.save.currentLevel = 21;
    const spec = LEVELS[20], limits = levelStarTargets(spec);
    game.model = { level: spec, snapshot: () => ({ moves: game.completionMetrics.moves, remainingSeconds: 1 }) };
    game.completionMetrics = { moves: limits.moveTarget, elapsedSeconds: limits.timeTargetSeconds + 1 };
    const pending = game.createPendingSettlement();
    expect(game.save.bestStarConditions).toEqual({});
    expect(pending.candidateSave.bestStarConditions["21"]).toEqual({ stars: 2, ...game.completionMetrics });
    game.save = pending.candidateSave;
    game.completionMetrics = { moves: limits.moveTarget + 1, elapsedSeconds: limits.timeTargetSeconds };
    const equal = game.createPendingSettlement();
    expect(collectionStarStatus(spec, 2, equal.candidateSave.bestStarConditions["21"])).toEqual([true, false, true]);
    game.save = equal.candidateSave;
    game.completionMetrics = { moves: limits.moveTarget + 1, elapsedSeconds: limits.timeTargetSeconds + 1 };
    expect(game.createPendingSettlement().candidateSave.bestStarConditions["21"]).toEqual(equal.candidateSave.bestStarConditions["21"]);
  });
});
