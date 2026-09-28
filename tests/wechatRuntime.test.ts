import { describe, expect, it, vi } from "vitest";
import { launchWechatGameWhenReady, readWechatWindowInfo } from "../src/platform/wechatRuntime";

describe("WeChat bridge-safe startup", () => {
  it("waits for the first show event before touching bridge-backed APIs", () => {
    let onShow: (() => void) | undefined;
    let bridgeReady = false;
    const getWindowInfo = vi.fn(() => {
      if (!bridgeReady) throw new Error("jsbridge not ready");
      return { screenWidth: 360, screenHeight: 792, pixelRatio: 2 };
    });
    const launch = vi.fn(() => readWechatWindowInfo({ getWindowInfo }));

    launchWechatGameWhenReady({ onShow: (callback) => { onShow = callback; } }, launch);

    expect(launch).not.toHaveBeenCalled();
    expect(getWindowInfo).not.toHaveBeenCalled();

    bridgeReady = true;
    onShow?.();
    onShow?.();

    expect(launch).toHaveBeenCalledOnce();
    expect(getWindowInfo).toHaveBeenCalledOnce();
  });

  it("prefers getWindowInfo and never invokes the deprecated API when both exist", () => {
    const modern = vi.fn(() => ({ screenWidth: 390, screenHeight: 844, pixelRatio: 3 }));
    const legacy = vi.fn(() => ({ screenWidth: 1, screenHeight: 1 }));

    expect(readWechatWindowInfo({
      getWindowInfo: modern,
      getSystemInfoSync: legacy,
    } as Parameters<typeof readWechatWindowInfo>[0] & { getSystemInfoSync: typeof legacy }))
      .toMatchObject({ screenWidth: 390, screenHeight: 844, pixelRatio: 3 });
    expect(modern).toHaveBeenCalledOnce();
    expect(legacy).not.toHaveBeenCalled();
  });

  it("fails clearly when lifecycle or window APIs are unavailable", () => {
    expect(() => launchWechatGameWhenReady({}, vi.fn()))
      .toThrow("WeChat lifecycle API is unavailable");
    expect(() => readWechatWindowInfo({}))
      .toThrow("WeChat window information is unavailable");
  });
});
