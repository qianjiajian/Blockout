import { describe, expect, it } from "vitest";
import { WIN_CRITERION_KINDS, WIN_SETTLEMENT_LAYOUT } from "../src/game/winSettlementLayout";

describe("dynamic win settlement layout", () => {
  it("uses the replacement's native coin cutout above the dynamic reward pill", () => {
    const { coinPile, rewardPill } = WIN_SETTLEMENT_LAYOUT;
    expect(coinPile).toEqual({ x: 251, y: 792, width: 223, height: 143 });
    expect(rewardPill).toEqual({ x: 277, y: 944, width: 166, height: 58 });
    expect(coinPile.y + coinPile.height).toBeLessThan(rewardPill.y);
  });

  it("keeps the replaceable art placements and dynamic result rows separate", () => {
    expect(WIN_SETTLEMENT_LAYOUT.panel).toEqual({ x: 63, y: 283, width: 594, height: 939 });
    expect(WIN_SETTLEMENT_LAYOUT.continueButton).toEqual({ x: 199, y: 1036, width: 322, height: 125 });
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
