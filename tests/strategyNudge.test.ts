import { describe, expect, it } from "vitest";
import { STRATEGY_RESCUE_NUDGES } from "../src/core/campaignExpansion";
import { getLevelStrict, LEVELS } from "../src/core/levels";
import { validateLevel } from "../src/core/PuzzleModel";

describe("one-step strategy rescue", () => {
  it("removes stale authored routes when Lv11-Lv100 physical layouts are replaced", () => {
    expect(Object.keys(STRATEGY_RESCUE_NUDGES).length).toBeGreaterThan(0);
    expect(LEVELS.filter((level) => level.strategyNudge).map((level) => level.id)).toEqual([]);
    expect(getLevelStrict(8).strategyNudge).toBeUndefined();
  });

  it("rejects missing and mismatched hint references during level validation", () => {
    const level = getLevelStrict(60);
    const block = level.blocks.find((candidate) => !candidate.shutterId);
    if (!block) throw new Error("Lv60 has no opening block");
    expect(() => validateLevel({
      ...level,
      strategyNudge: { blockId: "missing", from: [block.x, block.y], path: [[block.x + 1, block.y]], afterMoves: 3 },
    })).toThrow(/strategy nudge references missing block/);
    expect(() => validateLevel({
      ...level,
      strategyNudge: { blockId: block.id, from: [block.x + 1, block.y], path: [[block.x, block.y]], afterMoves: 3 },
    })).toThrow(/strategy nudge start does not match/);
  });
});
