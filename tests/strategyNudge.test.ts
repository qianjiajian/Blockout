import { describe, expect, it } from "vitest";
import { STRATEGY_FOCUS_LEVELS, STRATEGY_RESCUE_NUDGES } from "../src/core/campaignExpansion";
import { solveLevelForValidation } from "../src/core/levelSolver";
import { LEVELS, getLevelStrict } from "../src/core/levels";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";

describe("one-step strategy rescue", () => {
  it("is limited to the measured first-play outliers", () => {
    expect(LEVELS.filter((level) => level.strategyNudge).map((level) => level.id))
      .toEqual([8, 60, 70, 78, 80, 88, 90, 98]);
    expect(getLevelStrict(8).strategyNudge).toEqual({
      blockId: "blue-load",
      from: [2, 0],
      path: [[3, 0]],
      afterMoves: 3,
    });
    expect(Object.fromEntries(Object.entries(STRATEGY_RESCUE_NUDGES).map(([id, nudge]) => [id, {
      blockId: nudge.blockId,
      from: [...nudge.from],
      path: nudge.path.map((point) => [...point]),
      afterMoves: nudge.afterMoves,
    }]))).toEqual(Object.fromEntries(LEVELS.filter((level) => level.id !== 8 && level.strategyNudge)
      .map((level) => [level.id, level.strategyNudge])));
  });

  it("reveals only the blocker move and leaves the following clear to the player", () => {
    const level = getLevelStrict(8);
    const model = new PuzzleModel(level);
    const hint = level.strategyNudge!;
    expect(model.snapshot().cleared).toBe(0);
    for (const [x, y] of hint.path) expect(model.moveBlock(hint.blockId, x, y)).toBe(true);
    expect(model.snapshot().cleared).toBe(0);
    expect(model.getBlock("composition-8-5")).toMatchObject({ x: 2, y: 1 });
    expect(model.moveBlock("composition-8-5", 2, 0)).toBe(true);
    expect(model.tryExit("composition-8-5", "top").ok).toBe(true);
    expect(model.snapshot().cleared).toBe(1);
  });

  it("escalates exactly two no-clear moves after focus and reveals only the validated opening drag", () => {
    for (const [idText, nudge] of Object.entries(STRATEGY_RESCUE_NUDGES)) {
      const level = getLevelStrict(Number(idText));
      const focus = STRATEGY_FOCUS_LEVELS[Number(idText)];
      const solution = solveLevelForValidation(level);
      const firstClearIndex = solution.drags.findIndex((drag) => Boolean(drag.exitSide));
      expect(nudge.afterMoves, `Lv${idText}`).toBe(focus.afterMoves + 2);
      expect(nudge.blockId, `Lv${idText}`).toBe(focus.blockId);
      expect(solution.drags[0], `Lv${idText}`).toEqual({
        blockId: nudge.blockId,
        path: nudge.path,
      });
      expect(firstClearIndex, `Lv${idText}`).toBeGreaterThanOrEqual(1);
    }
  }, 30_000);

  it("rejects stale hint references during level validation", () => {
    const level = getLevelStrict(8);
    expect(() => validateLevel({
      ...level,
      strategyNudge: { blockId: "missing", from: [2, 0], path: [[3, 0]], afterMoves: 3 },
    })).toThrow(/strategy nudge references missing block/);
    expect(() => validateLevel({
      ...level,
      strategyNudge: { blockId: "blue-load", from: [1, 0], path: [[3, 0]], afterMoves: 3 },
    })).toThrow(/strategy nudge start does not match/);
  });
});
