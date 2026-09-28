import { describe, expect, it } from "vitest";
import { STRATEGY_FOCUS_LEVELS } from "../src/core/campaignExpansion";
import { LEVELS } from "../src/core/levels";

const VIDEO_PARITY_LEVELS_1_TO_100 = LEVELS.slice(0, 100);
import { validateLevel } from "../src/core/PuzzleModel";

describe("non-directional strategy focus", () => {
  it("does not leak legacy block references into the formal v5 campaign", () => {
    expect(Object.keys(STRATEGY_FOCUS_LEVELS).length).toBeGreaterThan(0);
    expect(VIDEO_PARITY_LEVELS_1_TO_100.slice(10).filter((level) => level.strategyFocus)).toEqual([]);
    const liveIds = new Set(VIDEO_PARITY_LEVELS_1_TO_100.slice(10).flatMap((level) => level.blocks.map((block) => block.id)));
    for (const focus of Object.values(STRATEGY_FOCUS_LEVELS)) {
      expect(liveIds.has(focus.blockId)).toBe(false);
    }
  });

  it("retains strict validation for future formal focus hints", () => {
    const level = LEVELS[59];
    const blockId = level.blocks[0]?.id;
    if (!blockId) throw new Error("Lv60 has no blocks");
    expect(() => validateLevel({ ...level, strategyFocus: { blockId: "missing", afterMoves: 8 } }))
      .toThrow(/strategy focus references missing block/);
    expect(() => validateLevel({ ...level, strategyFocus: { blockId, afterMoves: 0 } }))
      .toThrow(/positive integer threshold/);
  });
});
