import { describe, expect, it } from "vitest";
import { STRATEGY_FOCUS_LEVELS } from "../src/core/campaignExpansion";
import { solveLevelForValidation } from "../src/core/levelSolver";
import { LEVELS } from "../src/core/levels";
import { validateLevel } from "../src/core/PuzzleModel";

const EXPECTED_FOCUS = {
  60: { blockId: "yellow-load", afterMoves: 8 },
  70: { blockId: "yellow-load", afterMoves: 4 },
  78: { blockId: "green-open", afterMoves: 8 },
  80: { blockId: "blue-load", afterMoves: 8 },
  88: { blockId: "composition-88-6", afterMoves: 8 },
  90: { blockId: "green-load", afterMoves: 8 },
  98: { blockId: "composition-98-4", afterMoves: 6 },
} as const;

describe("non-directional strategy focus", () => {
  it("is limited to the authored zero-first-clear risk levels", () => {
    expect(STRATEGY_FOCUS_LEVELS).toEqual(EXPECTED_FOCUS);
    expect(Object.fromEntries(LEVELS.filter((level) => level.strategyFocus).map((level) => [level.id, level.strategyFocus])))
      .toEqual(EXPECTED_FOCUS);
  });

  it("highlights only the opening block without shipping a direction or route", () => {
    for (const [idText, focus] of Object.entries(EXPECTED_FOCUS)) {
      const level = LEVELS[Number(idText) - 1];
      const solution = solveLevelForValidation(level);
      const firstClear = solution.drags.findIndex((drag) => Boolean(drag.exitSide)) + 1;
      expect(solution.solved, `Lv${idText}`).toBe(true);
      expect(solution.drags[0]?.blockId, `Lv${idText}`).toBe(focus.blockId);
      expect(firstClear, `Lv${idText}`).toBeGreaterThanOrEqual(2);
      expect(firstClear, `Lv${idText}`).toBeLessThanOrEqual(6);
      expect(Object.keys(level.strategyFocus ?? {}).sort()).toEqual(["afterMoves", "blockId"]);
    }
  }, 30_000);

  it("rejects missing blocks and invalid thresholds", () => {
    const level = LEVELS[59];
    expect(() => validateLevel({ ...level, strategyFocus: { blockId: "missing", afterMoves: 8 } }))
      .toThrow(/strategy focus references missing block/);
    expect(() => validateLevel({ ...level, strategyFocus: { blockId: "yellow-load", afterMoves: 0 } }))
      .toThrow(/positive integer threshold/);
  });
});
