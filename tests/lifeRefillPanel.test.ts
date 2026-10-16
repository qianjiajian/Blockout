import { describe, expect, it } from "vitest";
import { LIFE_REFILL_COIN_COST, LIFE_REFILL_COIN_COST_PER_LIFE } from "../src/core/lives";
import { LIFE_REFILL_LAYOUT } from "../src/game/formalPageLayout";
import { BOOSTER_PURCHASE_LAYOUT } from "../src/game/boosterPurchaseLayout";

describe("shared purchase-style life refill panel", () => {
  it("reuses the purchase panel with separate same-row ad and refill hit areas", () => {
    const layout = LIFE_REFILL_LAYOUT;
    expect(layout.panel).toEqual(BOOSTER_PURCHASE_LAYOUT.panel);
    expect(layout.close).toEqual(BOOSTER_PURCHASE_LAYOUT.close);
    expect(layout.adButton).toEqual(BOOSTER_PURCHASE_LAYOUT.ad);
    expect(layout.buyButton).toEqual(BOOSTER_PURCHASE_LAYOUT.buy);
    expect(layout.icon).toEqual(BOOSTER_PURCHASE_LAYOUT.icon);
    expect(layout.coinIcon).toEqual(BOOSTER_PURCHASE_LAYOUT.coinIcon);
    expect(layout.adIcon).toEqual(BOOSTER_PURCHASE_LAYOUT.adIcon);
    expect(layout.title).toEqual(BOOSTER_PURCHASE_LAYOUT.titleText);
    for (const rect of [layout.adButton, layout.buyButton, layout.icon]) {
      expect(rect.x).toBeGreaterThanOrEqual(layout.panel.x);
      expect(rect.y).toBeGreaterThanOrEqual(layout.panel.y);
      expect(rect.x + rect.width).toBeLessThanOrEqual(layout.panel.x + layout.panel.width);
      expect(rect.y + rect.height).toBeLessThanOrEqual(layout.panel.y + layout.panel.height);
    }
    expect(layout.adButton.y).toEqual(layout.buyButton.y);
    expect(layout.adButton.x + layout.adButton.width).toBeLessThan(layout.buyButton.x);
    expect(layout.close.y + layout.close.height).toBeLessThan(layout.adButton.y);
    expect(layout).not.toHaveProperty("cancelButton");
  });

  it("preserves the existing real refill economy rather than the reference's example price", () => {
    expect(LIFE_REFILL_COIN_COST).toBe(500);
    expect(LIFE_REFILL_COIN_COST_PER_LIFE).toBe(100);
  });

  it("centers the lone full-state ad without changing its size or vertical placement", () => {
    const layout = LIFE_REFILL_LAYOUT;
    expect(layout.adButtonCentered.x + layout.adButtonCentered.width / 2)
      .toBeCloseTo(layout.panel.x + layout.panel.width / 2, 10);
    expect(layout.adButtonCentered.y).toBe(layout.adButton.y);
    expect(layout.adButtonCentered.width).toBe(layout.adButton.width);
    expect(layout.adButtonCentered.height).toBe(layout.adButton.height);
    expect(layout.adButtonCentered.x).toBeGreaterThan(layout.adButton.x);
    expect(layout.adButtonCentered.x + layout.adButtonCentered.width)
      .toBeLessThan(layout.panel.x + layout.panel.width);
  });
});
