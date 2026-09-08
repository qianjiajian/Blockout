import { describe, expect, it } from "vitest";
import { STRATEGY_RESCUE_NUDGES } from "../src/core/campaignExpansion";
import { solveLevelForValidation } from "../src/core/levelSolver";
import { openingStrategyMetrics } from "../src/core/levelStrategyMetrics";
import { LEVELS } from "../src/core/levels";

describe("level 98 opening readability", () => {
  it("opens the first route in three optimal drags without reducing the late-game solve", () => {
    const level = LEVELS[97];
    const solution = solveLevelForValidation(level);
    const firstClearIndex = solution.drags.findIndex((drag) => Boolean(drag.exitSide));

    expect(solution.solved).toBe(true);
    expect(solution.minimumDrags).toBe(39);
    expect(solution.repositionOverhead).toBe(18);
    expect(solution.gridSteps).toBe(227);
    expect(firstClearIndex + 1).toBe(3);
    expect(level.parMoves).toBe(39);
  }, 60_000);

  it("keeps the opening indirect and only nudges a local obstruction", () => {
    const level = LEVELS[97];
    expect(openingStrategyMetrics(level)).toMatchObject({
      active: 12,
      actionable: 12,
      directClearable: 0,
      matchingEdgeStarts: 0,
      oneStepMovable: 7,
      contacts: 15,
    });
    expect(level.blocks.find(({ id }) => id === "composition-98-1")).toMatchObject({ x: 2, y: 0 });
    expect(level.blocks.find(({ id }) => id === "composition-98-5")).toMatchObject({ x: 1, y: 0 });
    expect(level.blocks.find(({ id }) => id === "composition-98-6")).toMatchObject({ x: 1, y: 7 });
    expect(level.strategyFocus).toEqual({ blockId: "composition-98-4", afterMoves: 6 });
    expect(STRATEGY_RESCUE_NUDGES[98]).toEqual({
      blockId: "composition-98-4",
      from: [0, 5],
      path: [[0, 6]],
      afterMoves: 8,
    });
  });
});
