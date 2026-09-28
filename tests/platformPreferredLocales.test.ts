import { afterEach, describe, expect, it, vi } from "vitest";
import { WebHost } from "../src/platform/WebHost";
import { WechatHost } from "../src/platform/WechatHost";
import { filteredRawLocales } from "../src/platform/preferredLocales";

const fakeCanvas = () => ({
  width: 0,
  height: 0,
  setAttribute: vi.fn(),
  getContext: vi.fn(() => ({})),
  getBoundingClientRect: vi.fn(() => ({ width: 360, height: 792 })),
  addEventListener: vi.fn(),
  requestAnimationFrame: vi.fn(),
});

const installWebGlobals = (navigatorValue: object) => {
  const canvas = fakeCanvas();
  vi.stubGlobal("navigator", navigatorValue);
  vi.stubGlobal("window", {
    devicePixelRatio: 2,
    addEventListener: vi.fn(),
  });
  vi.stubGlobal("document", {
    body: { append: vi.fn() },
    createElement: vi.fn(() => canvas),
    addEventListener: vi.fn(),
  });
  return canvas;
};

const installWechat = (
  systemLanguage: unknown,
  getAppBaseInfo?: () => unknown,
) => {
  const canvas = fakeCanvas();
  vi.stubGlobal("wx", {
    getWindowInfo: vi.fn(() => ({
      screenWidth: 360,
      screenHeight: 792,
      pixelRatio: 2,
      language: systemLanguage,
    })),
    createCanvas: vi.fn(() => canvas),
    ...(getAppBaseInfo ? { getAppBaseInfo } : {}),
  });
  return canvas;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("platform preferred locale discovery", () => {
  it("filters only empty or non-string values while preserving raw locale spellings and order", () => {
    expect(filteredRawLocales(["zh_CN", "", "  ", 7, null, "zh_CN", "EN-us"]))
      .toEqual(["zh_CN", "EN-us"]);
  });

  it("combines navigator.languages with navigator.language and removes duplicates", () => {
    installWebGlobals({
      languages: ["ja-JP", "", "ja-JP", 7, "en-US"],
      language: "fr-FR",
    });

    expect(new WebHost().preferredLocales()).toEqual(["ja-JP", "en-US", "fr-FR"]);
  });

  it("still reads navigator.language when the language-list getter is unavailable", () => {
    const navigatorValue = Object.defineProperties({}, {
      languages: { get: () => { throw new Error("language list denied"); } },
      language: { value: "ko-KR" },
    });
    installWebGlobals(navigatorValue);

    expect(new WebHost().preferredLocales()).toEqual(["ko-KR"]);
  });

  it("prefers the modern WeChat app language over cached legacy system info", () => {
    installWechat("zh_CN", vi.fn(() => ({ language: "ja" })));

    expect(new WechatHost().preferredLocales()).toEqual(["ja"]);
  });

  it("falls back to cached system language when the modern WeChat API is absent, invalid, or throws", () => {
    installWechat("zh_CN");
    expect(new WechatHost().preferredLocales()).toEqual(["zh_CN"]);

    installWechat("zh_TW", vi.fn(() => ({ language: "  " })));
    expect(new WechatHost().preferredLocales()).toEqual(["zh_TW"]);

    installWechat("en", vi.fn(() => { throw new Error("old base library"); }));
    expect(new WechatHost().preferredLocales()).toEqual(["en"]);
  });

  it("returns an empty WeChat preference list when neither API provides a usable string", () => {
    installWechat(undefined, vi.fn(() => ({ language: 7 })));

    expect(new WechatHost().preferredLocales()).toEqual([]);
  });
});
