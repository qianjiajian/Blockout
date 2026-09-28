import { describe, expect, it } from "vitest";
import { WIN_CRITERION_KINDS, WIN_SETTLEMENT_LAYOUT } from "../src/game/winSettlementLayout";

describe("dynamic win settlement layout", () => {
  it("shrinks only the reward coin stack by 20% around its existing centre", () => {
    const { coinPile, rewardPill } = WIN_SETTLEMENT_LAYOUT;
    expect(coinPile.width).toBeCloseTo(218 * 0.8);
    expect(coinPile.height).toBeCloseTo(182 * 0.8);
    expect(coinPile.x + coinPile.width / 2).toBeCloseTo(266);
    expect(coinPile.y + coinPile.height / 2).toBeCloseTo(841);
    expect(rewardPill).toEqual({ x: 444, y: 806, width: 178, height: 69 });
  });

  it("keeps the replaceable art placements and dynamic result rows separate", () => {
    expect(WIN_SETTLEMENT_LAYOUT.panel).toEqual({ x: 25, y: 287, width: 671, height: 867 });
    expect(WIN_SETTLEMENT_LAYOUT.continueButton).toEqual({ x: 199, y: 964, width: 322, height: 125 });
    expect(WIN_SETTLEMENT_LAYOUT.stars).toHaveLength(3);
    expect(WIN_SETTLEMENT_LAYOUT.criteriaRows).toHaveLength(3);
    expect(WIN_CRITERION_KINDS).toEqual(["clear", "moves", "time"]);
  });

  it("gives each criterion a concrete, non-overlapping row", () => {
    const rows = WIN_SETTLEMENT_LAYOUT.criteriaRows;
    for (let index = 0; index < rows.length; index += 1) {
      expect(rows[index].width).toBeGreaterThan(0);
      expect(rows[index].height).toBeGreaterThan(0);
      if (index > 0) {
        expect(rows[index].y).toBeGreaterThanOrEqual(rows[index - 1].y + rows[index - 1].height);
      }
    }
    expect(WIN_SETTLEMENT_LAYOUT.criteriaPanel.y).toBeLessThan(rows[0].y);
    expect(WIN_SETTLEMENT_LAYOUT.criteriaPanel.y + WIN_SETTLEMENT_LAYOUT.criteriaPanel.height)
      .toBeGreaterThan(rows.at(-1)!.y + rows.at(-1)!.height);
  });
});
