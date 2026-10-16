import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LIFE_REGEN_INTERVAL_MS, getLifeRefillQuote } from "../src/core/lives";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";
import { LIFE_REFILL_ART, BOOSTER_PURCHASE_ART } from "../src/game/artManifest";
import { LIFE_REFILL_LAYOUT as layout } from "../src/game/formalPageLayout";
import { GAME_LANGUAGES, type GameLanguage } from "../src/game/localization";

const NOW = Date.parse("2026-10-13T07:00:00.000Z");
const artKeys = ["panel", "adButton", "buyButton", "close", "heartIcon", "coinIcon", "videoIcon"] as const;
const image = (key: string) => ({ key, width: 100, height: 100, naturalWidth: 100, naturalHeight: 100 });

/** Real refill renderer/targets with isolated art handles and no storage access. */
function refill(lives = 2, language: GameLanguage = "zh-CN") {
  const game = Object.create(ColorEscapeGame.prototype) as any;
  const ctx = {
    globalAlpha: 1,
    save: vi.fn(), restore: vi.fn(), beginPath: vi.fn(), closePath: vi.fn(),
    moveTo: vi.fn(), lineTo: vi.fn(), quadraticCurveTo: vi.fn(),
    fill: vi.fn(), stroke: vi.fn(), translate: vi.fn(), scale: vi.fn(), drawImage: vi.fn(),
  };
  const art = Object.fromEntries(artKeys.map(key => [key, image(key)]));
  Object.assign(game, {
    ctx, screen: "home", appVisible: true,
    save: Object.freeze({ language, reducedMotion: true, coins: 1000,
      lifeState: Object.freeze({ lives, nextLifeAtMs: lives >= 5 ? 0 : NOW + LIFE_REGEN_INTERVAL_MS, unlimitedLivesUntilMs: 0 }) }),
    art: { homeUi: { heartIcon: image("resident-heart"), coinIcon: image("resident-coin") } },
    host: { storageRead: vi.fn(), storageSet: vi.fn(), releaseImage: vi.fn() },
    lifeRefillOpen: true, lifeRefillArt: art, lifeRefillArtRequestToken: 0,
    lifeRefillArtLoading: false, lifeRefillArtError: undefined,
    drawDim: vi.fn(), drawHomeCoinResource: vi.fn(), safeOffsets: () => ({ top: 20, bottom: 10 }),
    viewportTransform: () => ({ scale: 1, offsetX: 0, offsetY: 0 }),
    drawCollectionImageContained: vi.fn(), drawRoundIcon: vi.fn(), label: vi.fn(), wrapText: vi.fn(),
    withPopupEntrance: vi.fn((_id: string, _bounds: unknown, draw: () => void) => draw()),
    drawPressable: vi.fn((_id: string, _bounds: unknown, draw: () => void) => draw()),
    scheduleFrame: vi.fn(), playSound: vi.fn(),
  });
  const before = JSON.stringify(game.save);
  return { game, art, ctx,
    render: () => game.drawLifeRefill(),
    targets: () => Object.fromEntries(game.lifeRefillTargets()),
    assertReadOnly: () => {
      expect(JSON.stringify(game.save)).toBe(before);
      expect(game.host.storageRead).not.toHaveBeenCalled();
      expect(game.host.storageSet).not.toHaveBeenCalled();
      expect(ctx.save).toHaveBeenCalledTimes(ctx.restore.mock.calls.length);
    },
  };
}

const flush = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe("refill purchase-panel presentation", () => {
  it.each(GAME_LANGUAGES)("draws the shared skin and independent heart in %s without changing the account", language => {
    const { game, art, render, assertReadOnly } = refill(2, language);
    render();
    const labels = game.label.mock.calls as unknown[][];
    expect(game.withPopupEntrance).toHaveBeenCalledWith("lifeRefill", layout.panel, expect.any(Function));
    expect(game.drawCollectionImageContained).toHaveBeenCalledWith(art.panel, layout.panel);
    expect(game.drawCollectionImageContained).toHaveBeenCalledWith(art.heartIcon, layout.icon);
    expect(game.drawCollectionImageContained).toHaveBeenCalledWith(art.adButton, layout.adButton);
    expect(game.drawCollectionImageContained).toHaveBeenCalledWith(art.buyButton, layout.buyButton);
    expect(game.drawCollectionImageContained).toHaveBeenCalledWith(art.videoIcon, layout.adIcon);
    expect(game.drawCollectionImageContained).toHaveBeenCalledWith(art.coinIcon, layout.coinIcon);
    expect(game.drawCollectionImageContained).toHaveBeenCalledWith(art.close, layout.close);
    expect(labels.some(call => call[0] === game.tr("gameplay.life.moreLives")
      && call[1] === layout.title.x && call[2] === layout.title.y)).toBe(true);
    expect(labels.some(call => call[0] === "2" && call[1] === layout.lives.x && call[2] === layout.lives.y)).toBe(true);
    expect(labels.some(call => call[0] === "300" && call[1] === layout.cost.x && call[2] === layout.cost.y)).toBe(true);
    expect(labels.some(call => call[0] === "+1")).toBe(true);
    expect(game.drawCollectionImageContained.mock.calls.some(([img]: [unknown]) => img === game.art.homeUi.heartIcon)).toBe(false);
    assertReadOnly();
  });

  it.each([0, 1, 2, 3, 4])("keeps actual refill price and matching side-by-side targets at %s lives", lives => {
    const { game, render, targets, assertReadOnly } = refill(lives);
    render();
    expect(targets()).toEqual({ lifeRefillDismiss: layout.close, lifeRefillAd: layout.adButton, lifeRefillBuy: layout.buyButton });
    expect(game.label.mock.calls.some((call: unknown[]) => call[0] === `${(5 - lives) * 100}`
      && call[1] === layout.cost.x && call[2] === layout.cost.y)).toBe(true);
    assertReadOnly();
  });

  it.each([5, 8])("centers the full/overflow %s ad and hides all coin purchase content without adding targets", lives => {
    const { game, art, render, targets, assertReadOnly } = refill(lives);
    render();
    expect(targets()).toEqual({ lifeRefillDismiss: layout.close });
    expect(game.label.mock.calls.some((call: unknown[]) => call[0] === `${lives}`)).toBe(true);
    expect(game.label.mock.calls.some((call: unknown[]) => call[0] === game.tr("gameplay.life.refillFull"))).toBe(true);
    expect(game.drawPressable).toHaveBeenCalledWith("lifeRefillAd", layout.adButtonCentered, expect.any(Function));
    expect(game.drawPressable.mock.calls.some(([key]: [string]) => key === "lifeRefillBuy")).toBe(false);
    expect(game.drawCollectionImageContained).toHaveBeenCalledWith(art.adButton, layout.adButtonCentered);
    expect(game.drawCollectionImageContained.mock.calls.some(([img]: [unknown]) => img === art.buyButton || img === art.coinIcon)).toBe(false);
    expect(game.label.mock.calls.some((call: unknown[]) => call[1] === layout.cost.x && call[2] === layout.cost.y)).toBe(false);
    expect(game.label.mock.calls.some((call: unknown[]) => call[1] === layout.action.x && call[2] === layout.action.y)).toBe(false);
    const offsetX = layout.adButtonCentered.x - layout.adButton.x;
    expect(game.drawCollectionImageContained).toHaveBeenCalledWith(art.videoIcon, { ...layout.adIcon, x: layout.adIcon.x + offsetX });
    expect(game.label.mock.calls.some((call: unknown[]) => call[0] === game.tr("gameplay.life.getLife")
      && call[1] === layout.adLabel.x + offsetX && call[2] === layout.adLabel.y)).toBe(true);
    expect(game.label.mock.calls.some((call: unknown[]) => call[0] === "+1"
      && call[1] === layout.adReward.x + offsetX && call[2] === layout.adReward.y)).toBe(true);
    assertReadOnly();
  });

  it("updates only the view price when natural recovery occurs", () => {
    const { game, render, assertReadOnly } = refill(2);
    render();
    expect(game.lifeRefillQuote().coinCost).toBe(300);
    vi.setSystemTime(NOW + LIFE_REGEN_INTERVAL_MS);
    game.label.mockClear(); render();
    expect(game.lifeRefillQuote().coinCost).toBe(200);
    expect(game.label.mock.calls.some((call: unknown[]) => call[0] === "200"
      && call[1] === layout.cost.x && call[2] === layout.cost.y)).toBe(true);
    assertReadOnly();
  });

  it("switches from two buttons to the centered ad exactly when natural recovery reaches full", () => {
    const { game, art, render, targets, assertReadOnly } = refill(4);
    render();
    expect(game.drawCollectionImageContained).toHaveBeenCalledWith(art.buyButton, layout.buyButton);
    expect(targets()).toHaveProperty("lifeRefillBuy", layout.buyButton);
    vi.setSystemTime(NOW + LIFE_REGEN_INTERVAL_MS - 1);
    expect(targets()).toHaveProperty("lifeRefillBuy", layout.buyButton);
    vi.setSystemTime(NOW + LIFE_REGEN_INTERVAL_MS);
    game.drawCollectionImageContained.mockClear(); game.drawPressable.mockClear(); game.label.mockClear();
    render();
    expect(game.lifeRefillQuote().missingLives).toBe(0);
    expect(targets()).toEqual({ lifeRefillDismiss: layout.close });
    expect(game.drawCollectionImageContained).toHaveBeenCalledWith(art.adButton, layout.adButtonCentered);
    expect(game.drawCollectionImageContained.mock.calls.some(([img]: [unknown]) => img === art.buyButton || img === art.coinIcon)).toBe(false);
    expect(game.drawPressable.mock.calls.some(([key]: [string]) => key === "lifeRefillBuy")).toBe(false);
    expect(game.label.mock.calls.some((call: unknown[]) => call[1] === layout.cost.x && call[2] === layout.cost.y)).toBe(false);
    assertReadOnly();
  });

  it("keeps an unknown coin purchase locked to its quote with only the original retry target", () => {
    const { game, art, render, targets, assertReadOnly } = refill(2);
    const quote = getLifeRefillQuote(game.save.lifeState, NOW);
    game.pendingLifeRefill = { quote, baselineSave: game.save, candidateSave: { coins: 700 } };
    vi.setSystemTime(NOW + 5 * LIFE_REGEN_INTERVAL_MS);
    render();
    expect(game.lifeRefillQuote()).toBe(quote);
    expect(targets()).toEqual({ lifeRefillBuy: layout.buyButton });
    expect(game.drawCollectionImageContained.mock.calls.some(([img]: [unknown]) => img === art.close)).toBe(false);
    expect(game.label.mock.calls.some((call: unknown[]) => call[0] === "2")).toBe(true);
    expect(game.drawCollectionImageContained).toHaveBeenCalledWith(art.adButton, layout.adButton);
    expect(game.drawCollectionImageContained).toHaveBeenCalledWith(art.buyButton, layout.buyButton);
    expect(game.label.mock.calls.some((call: unknown[]) => call[0] === game.tr("common.retry")
      && call[1] === layout.buyButton.x + layout.buyButton.width / 2 && call[2] === layout.action.y)).toBe(true);
    assertReadOnly();
  });

  it("retains existing ad-in-flight blocking and pending-receipt retry targets", () => {
    const { game, targets, assertReadOnly } = refill();
    game.lifeRefillAdRequestId = "active-ad";
    expect(targets()).toEqual({});
    game.lifeRefillAdRequestId = undefined;
    game.pendingLifeRefillAd = { stage: "receipt", requestId: "active-ad" };
    expect(targets()).toEqual({ lifeRefillAd: layout.adButton, lifeRefillDismiss: layout.close });
    assertReadOnly();
  });

  it.each(["prepare", "receipt", "reward"])("moves a pending %s ad save retry hit area along with its full-state button", stage => {
    const { game, art, render, targets, assertReadOnly } = refill(4);
    game.pendingLifeRefillAd = { stage, requestId: "isolated-pending-ad" };
    expect(targets()).toEqual({ lifeRefillAd: layout.adButton, lifeRefillDismiss: layout.close });
    vi.setSystemTime(NOW + LIFE_REGEN_INTERVAL_MS);
    render();
    expect(targets()).toEqual({ lifeRefillAd: layout.adButtonCentered, lifeRefillDismiss: layout.close });
    expect(game.drawCollectionImageContained).toHaveBeenCalledWith(art.adButton, layout.adButtonCentered);
    const offsetX = layout.adButtonCentered.x - layout.adButton.x;
    expect(game.label.mock.calls.some((call: unknown[]) => call[0] === game.tr("common.retry")
      && call[1] === layout.adLabel.x + offsetX && call[2] === layout.adLabel.y)).toBe(true);
    game.startLifeRefillAd = vi.fn();
    game.handleLifeRefillPointer({ id: 1, x: layout.adButton.x + 1, y: layout.adButton.y + layout.adButton.height / 2 });
    expect(game.startLifeRefillAd).not.toHaveBeenCalled();
    game.handleLifeRefillPointer({ id: 1, x: layout.adButtonCentered.x + layout.adButtonCentered.width / 2,
      y: layout.adButtonCentered.y + layout.adButtonCentered.height / 2 });
    expect(game.startLifeRefillAd).toHaveBeenCalledTimes(1);
    assertReadOnly();
  });

  it("allows only close while loading and close plus panel retry on failure", () => {
    const { game, targets, render, assertReadOnly } = refill();
    game.lifeRefillArt = undefined;
    render(); expect(targets()).toEqual({ lifeRefillDismiss: layout.close });
    game.lifeRefillArtError = "decode failed";
    render(); expect(targets()).toEqual({ lifeRefillDismiss: layout.close, lifeRefillRetry: layout.panel });
    assertReadOnly();
  });
});

describe("refill shared artwork lifecycle", () => {
  it("uses shared popup asset paths without loading unused booster icons", () => {
    expect(Object.keys(LIFE_REFILL_ART).sort()).toEqual([...artKeys].sort());
    for (const key of ["panel", "adButton", "buyButton", "close", "coinIcon", "videoIcon"] as const)
      expect(LIFE_REFILL_ART[key]).toBe(BOOSTER_PURCHASE_ART[key]);
    expect(Object.values(LIFE_REFILL_ART)).not.toContain(BOOSTER_PURCHASE_ART.time);
    expect(Object.values(LIFE_REFILL_ART)).not.toContain(BOOSTER_PURCHASE_ART.rocket);
    expect(Object.values(LIFE_REFILL_ART)).not.toContain(BOOSTER_PURCHASE_ART.pulse);
  });

  it("loads once on Home, assigns every independent handle, and releases all owned images only", async () => {
    const { game } = refill();
    game.lifeRefillArt = undefined;
    const images = Object.keys(LIFE_REFILL_ART).map(key => image(`owned-${key}`));
    game.loadImages = vi.fn(async () => images);
    game.requestLifeRefillArt(); game.requestLifeRefillArt();
    expect(game.lifeRefillArtLoading).toBe(true);
    await flush();
    expect(game.loadImages).toHaveBeenCalledExactlyOnceWith(Object.values(LIFE_REFILL_ART));
    expect(game.lifeRefillArt).toEqual(Object.fromEntries(Object.keys(LIFE_REFILL_ART).map((key, index) => [key, images[index]])));
    expect(game.lifeRefillArtLoading).toBe(false);
    game.requestLifeRefillArt(); expect(game.loadImages).toHaveBeenCalledTimes(1);
    game.handleLifeRefillPointer({ id: 1, x: layout.close.x + layout.close.width / 2,
      y: layout.close.y + layout.close.height / 2 });
    expect(game.lifeRefillOpen).toBe(false);
    expect(game.lifeRefillArt).toBeUndefined();
    expect(game.host.releaseImage.mock.calls.map(([img]: [unknown]) => img)).toEqual(images);
    expect(game.host.releaseImage).not.toHaveBeenCalledWith(game.art.homeUi.heartIcon);
  });

  it.each(["close", "replace"])("discards late image results after %s without replacing current ownership", async reason => {
    const { game } = refill();
    game.lifeRefillArt = undefined;
    const oldImages = Object.keys(LIFE_REFILL_ART).map(key => image(`stale-${key}`));
    let resolve!: (images: unknown[]) => void;
    game.loadImages = vi.fn(() => new Promise(done => { resolve = done; }));
    game.requestLifeRefillArt();
    if (reason === "close") game.lifeRefillOpen = false;
    else game.releaseLifeRefillArt();
    resolve(oldImages); await flush();
    expect(game.lifeRefillArt).toBeUndefined();
    expect(game.host.releaseImage.mock.calls.map(([img]: [unknown]) => img)).toEqual(oldImages);
  });

  it("makes failed loading retryable without altering storage", async () => {
    const { game } = refill();
    game.lifeRefillArt = undefined;
    const images = Object.keys(LIFE_REFILL_ART).map(key => image(key));
    game.loadImages = vi.fn().mockRejectedValueOnce(new Error("isolated image failure")).mockResolvedValueOnce(images);
    game.requestLifeRefillArt(); await flush();
    expect(game.lifeRefillArtError).toBe("isolated image failure");
    expect(game.lifeRefillArtLoading).toBe(false);
    expect(game.lifeRefillArt).toBeUndefined();
    game.requestLifeRefillArt(); await flush();
    expect(game.lifeRefillArt).toBeDefined();
    expect(game.lifeRefillArtError).toBeUndefined();
    expect(game.host.storageRead).not.toHaveBeenCalled();
    expect(game.host.storageSet).not.toHaveBeenCalled();
  });
});
