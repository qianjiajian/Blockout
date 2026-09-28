import { describe, expect, it } from "vitest";
import gameSource from "../src/game/ColorEscapeGame.ts?raw";
import { GAME_ART } from "../src/game/artManifest";
import { LIFE_REFILL_COIN_COST, LIFE_REFILL_COIN_COST_PER_LIFE } from "../src/core/lives";
import { LIFE_REFILL_LAYOUT, PAUSE_SETTINGS_LAYOUT } from "../src/game/formalPageLayout";

describe("common life refill panel", () => {
  it("reuses the common panel, close and action geometry", () => {
    expect(LIFE_REFILL_LAYOUT.panel).toEqual(PAUSE_SETTINGS_LAYOUT.panel);
    expect(LIFE_REFILL_LAYOUT.close).toEqual(PAUSE_SETTINGS_LAYOUT.close);
    expect(LIFE_REFILL_LAYOUT.buyButton.x + LIFE_REFILL_LAYOUT.buyButton.width / 2).toBe(360);
    expect(LIFE_REFILL_LAYOUT.buyButton.width).toBe(PAUSE_SETTINGS_LAYOUT.homeButton.width);
    expect(LIFE_REFILL_LAYOUT.buyButton.height).toBe(PAUSE_SETTINGS_LAYOUT.homeButton.height);
    expect(LIFE_REFILL_LAYOUT).not.toHaveProperty("cancelButton");
    expect(LIFE_REFILL_LAYOUT.title.size).toBe(PAUSE_SETTINGS_LAYOUT.typography.title.size);
    expect(LIFE_REFILL_LAYOUT.title.x).toBe(360);
  });

  it("keeps the coin pile, debit plate and actions inside the panel without overlap", () => {
    const layout = LIFE_REFILL_LAYOUT;
    for (const rect of [layout.coinPile, layout.costPill, layout.buyButton]) {
      expect(rect.x).toBeGreaterThan(layout.panel.x);
      expect(rect.y).toBeGreaterThan(layout.panel.y);
      expect(rect.x + rect.width).toBeLessThan(layout.panel.x + layout.panel.width);
      expect(rect.y + rect.height).toBeLessThan(layout.panel.y + layout.panel.height);
    }
    expect(layout.coinPile.x + layout.coinPile.width).toBeLessThan(layout.costPill.x);
    expect(layout.coinPile.y + layout.coinPile.height).toBeLessThan(layout.feedback.y - layout.feedback.size);
    expect(layout.feedback.y + layout.feedback.size).toBeLessThan(layout.buyButton.y);
    expect(layout.cost.x).toBe(layout.costPill.x + layout.costPill.width / 2);
    expect(layout.coinPile.width / layout.coinPile.height).toBeCloseTo(243 / 203, 8);
  });

  it("reuses the supplied coin pile/blue plate and green common action asset", () => {
    expect(GAME_ART.ui.win.coinPile).toBe("assets/art/ui/formal-pages/overlays/win/coin-pile.png");
    expect(GAME_ART.ui.win.rewardPill).toBe("assets/art/ui/formal-pages/overlays/win/reward-pill.png");
    expect(GAME_ART.ui.pauseSettings.homeButton).toBe("assets/art/ui/formal-pages/overlays/pause-settings/home-button.png");
    expect(LIFE_REFILL_COIN_COST).toBe(500);
    expect(LIFE_REFILL_COIN_COST_PER_LIFE).toBe(100);
  });

  it("renders the actual debit, not the sample reward or old generic modal chrome", () => {
    const source = gameSource;
    const refill = source.slice(source.indexOf("  private drawLifeRefill():"), source.indexOf("  private drawStorageUnavailable():"));
    expect(refill).toContain('quote.coinCost > 0 ? `-${quote.coinCost}` : "0"');
    expect(refill).toContain("const quote = this.lifeRefillQuote(nowMs)");
    expect(refill).toContain("if (full)");
    expect(refill).toContain('this.tr("common.full")');
    expect(refill).toContain("ctx.drawImage(chrome.homeButton");
    expect(refill).toContain("ctx.drawImage(this.lifeRefillArt.coinPile");
    expect(refill).toContain("ctx.drawImage(this.lifeRefillArt.rewardPill");
    expect(refill).not.toContain("this.drawModal(");
    expect(refill).not.toContain("this.drawButton(");
    expect(refill).not.toContain("gameplay.life.refillCoins");
    expect(refill).toContain("if (!this.pendingLifeRefill)");
    expect(source).not.toContain("lifeRefillClose");
    expect(refill).toContain('this.drawPressable("lifeRefillDismiss"');
  });
});
