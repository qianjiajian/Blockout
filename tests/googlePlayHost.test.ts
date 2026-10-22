import { afterEach, describe, expect, it, vi } from "vitest";
import { GooglePlayHost } from "../src/googlePlay/GooglePlayHost";
import type { GooglePlayNativePort } from "../src/googlePlay/nativeBridge";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";
import { resolvePreferredLanguage } from "../src/game/localization";

function setup() {
  const requests: Array<{ id: string; type: string }> = [];
  const port: GooglePlayNativePort = { onmessage: null, postMessage: raw => requests.push(JSON.parse(raw)) };
  const canvas = Object.assign(new EventTarget(), { width: 0, height: 0, setAttribute: vi.fn(), getContext: () => ({}),
    getBoundingClientRect: () => ({ width: 393, height: 818, left: 0, top: 0 }), remove: vi.fn() });
  const page = Object.assign(new EventTarget(), { devicePixelRatio: 1, SlideJamNative: port,
    clearTimeout: vi.fn(), setTimeout: vi.fn() });
  const doc = Object.assign(new EventTarget(), { hidden: false, body: { append: vi.fn() }, createElement: () => canvas });
  vi.stubGlobal("window", page); vi.stubGlobal("document", doc);
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  const host = new GooglePlayHost();
  const native = (message: unknown) => port.onmessage?.({ data: JSON.stringify(message) });
  return { host, requests, doc, native, port };
}

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });
describe("Google Play host visibility and startup ownership", () => {
  it("lets an unavailable-ad button reach native recovery instead of permanently disabling it", async () => {
    vi.useFakeTimers(); const s = setup();
    s.native({ type: "state", state: { consentReady: false, rewardedReady: false } });
    expect(s.host.isRewardedAdAvailable()).toBe(true);
    const request = s.host.showRewardedAd("retry-loading-ad");
    expect(s.requests.at(-1)).toMatchObject({ id: "retry-loading-ad", type: "rewarded" });
    expect(s.host.isRewardedAdAvailable()).toBe(false);
    s.native({ type: "result", id: "retry-loading-ad", ok: false, status: "loading" });
    await expect(request).resolves.toMatchObject({ status: "unavailable" });
    expect(s.host.isRewardedAdAvailable()).toBe(true);
    s.host.dispose();
  });
  it("combines document/native hiding without duplicate hide or premature resume", () => {
    vi.useFakeTimers(); const s = setup(); const hidden = vi.fn(), shown = vi.fn();
    s.host.onHide(hidden); s.host.onShow(shown);
    s.native({ type: "visibility", visible: false });
    s.doc.hidden = true; s.doc.dispatchEvent(new Event("visibilitychange"));
    s.native({ type: "visibility", visible: true });
    expect(s.host.isVisible()).toBe(false); expect(hidden).toHaveBeenCalledTimes(1); expect(shown).not.toHaveBeenCalled();
    s.doc.hidden = false; s.doc.dispatchEvent(new Event("visibilitychange"));
    expect(s.host.isVisible()).toBe(true); expect(shown).toHaveBeenCalledTimes(1);
    s.native({ type: "visibility", visible: true });
    expect(shown).toHaveBeenCalledTimes(1);
    s.host.dispose(); expect(vi.getTimerCount()).toBe(0);
  });

  it("does not close the native startup window at construction and emits ready only once", () => {
    vi.useFakeTimers(); const s = setup();
    expect(s.requests.map(r => r.type)).toEqual(["status", "startup"]);
    s.host.gameReady(); s.host.gameReady();
    expect(s.requests.map(r => r.type)).toEqual(["status", "startup", "gameReady"]);
    s.host.dispose(); s.host.gameReady();
    expect(s.requests).toHaveLength(3); expect(s.port.onmessage).toBeNull();
  });

  it("hides reward availability during a native form and uses the GP English default", async () => {
    vi.useFakeTimers(); const s = setup();
    vi.stubGlobal("navigator", { languages: ["zh-TW", "en-US"], language: "zh-TW" });
    s.native({ type: "state", state: { consentReady: true, rewardedReady: true } });
    expect(s.host.isRewardedAdAvailable()).toBe(true);
    s.native({ type: "visibility", visible: false });
    await expect(s.host.showRewardedAd("test-hidden")).resolves.toMatchObject({ status: "unavailable" });
    expect(s.host.preferredLocales()).toEqual(["en"]);
    await expect(s.host.resolveLeaderboardProvince()).resolves.toBeUndefined();
    s.host.dispose();
  });
});

describe("Google Play English first-launch default", () => {
  // Use the real locale resolver and saved-language selection methods. No
  // production game methods are replaced; only UI scheduling and popup motion
  // are omitted when exercising the manual-language save transaction below.
  function languageGame(host: GooglePlayHost, saved?: Record<string, unknown>) {
    const game = Object.create(ColorEscapeGame.prototype) as any;
    game.host = host;
    game.deviceLanguage = resolvePreferredLanguage(host.preferredLocales());
    game.save = game.sanitizeSave(saved);
    const result = saved ? { status: "ok", value: saved } : { status: "missing" };
    game.save.language = game.languageForStorageRead(result, saved);
    game.save.leaderboardLanguage = game.leaderboardLanguageForStorageRead(result, saved);
    return game;
  }

  it.each(["zh-CN", "ja-JP", "fr-FR"])("starts a fresh GP account in English with navigator %s", locale => {
    vi.useFakeTimers();
    vi.stubGlobal("navigator", { language: locale, languages: [locale] });
    const s = setup();
    expect(s.host.preferredLocales()).toEqual(["en"]);
    const game = languageGame(s.host);
    expect(game.save.language).toBe("en");
    expect(game.save.leaderboardLanguage).toBe("en");
    expect(game.languageForStorageRead({ status: "unavailable" }, undefined)).toBe("en");
    s.host.dispose();
  });

  it.each(["zh-CN", "ja"])("preserves an existing saved %s language", language => {
    vi.useFakeTimers();
    vi.stubGlobal("navigator", { language: "fr-FR", languages: ["fr-FR"] });
    const s = setup();
    const game = languageGame(s.host, { schemaVersion: 1, language, leaderboardLanguage: "ko" });
    expect(game.save.language).toBe(language);
    expect(game.save.leaderboardLanguage).toBe("ko");
    s.host.dispose();
  });

  it("keeps the existing pre-localization save migration instead of treating it as a fresh account", () => {
    vi.useFakeTimers(); const s = setup();
    const game = languageGame(s.host, { schemaVersion: 1, coins: 321 });
    expect(game.save.language).toBe("zh-CN");
    expect(game.save.coins).toBe(321);
    s.host.dispose();
  });

  it.each(["zh-CN", "ja"])("persists a manual switch from English to %s and restores it on the next launch", language => {
    vi.useFakeTimers(); const s = setup();
    const game = languageGame(s.host);
    const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
    let stored = clone(game.save);
    Object.assign(game, {
      storageBaselineReady: true, storageReadAttempts: 0, screen: "language",
      playSound: vi.fn(), scheduleFrame: vi.fn(),
      closePopup: vi.fn((_key: string, finish: () => void) => finish()),
    });
    const write = vi.spyOn(s.host, "storageSet").mockImplementation((_key, value) => { stored = clone(value); return true; });
    vi.spyOn(s.host, "storageRead").mockImplementation(() => ({ status: "ok", value: clone(stored) }));
    game.selectLanguage(language);
    expect(game.save.language).toBe(language);
    expect(game.save.leaderboardLanguage).toBe("en");
    expect(write).toHaveBeenCalledOnce();
    expect(game.pendingLanguageSelection).toBeUndefined();
    expect(game.screen).toBe("settings");
    vi.stubGlobal("navigator", { language: "de-DE", languages: ["de-DE"] });
    const reloaded = languageGame(s.host, clone(stored));
    expect(reloaded.save.language).toBe(language);
    expect(reloaded.save.leaderboardLanguage).toBe("en");
    expect(write).toHaveBeenCalledOnce();
    s.host.dispose();
  });
});
