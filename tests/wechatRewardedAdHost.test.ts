import { afterEach, describe, expect, it, vi } from "vitest";
import { WechatHost } from "../src/platform/WechatHost";
import type { RewardedVideoCloseEvent } from "../src/platform/rewardedVideoAd";

const config = vi.hoisted(() => ({ adUnitId: "" }));
vi.mock("../src/platform/rewardedAdConfig", () => ({
  get WECHAT_REWARDED_AD_UNIT_ID() { return config.adUnitId; },
}));

const host = (createRewardedVideoAd = vi.fn()) => {
  let hide!: () => void;
  let show!: () => void;
  vi.stubGlobal("wx", {
    getWindowInfo: () => ({ screenWidth: 360, screenHeight: 792, pixelRatio: 1 }),
    createCanvas: () => ({ getContext: () => ({}) }),
    createRewardedVideoAd,
    onHide: (callback: () => void) => { hide = callback; },
    onShow: (callback: () => void) => { show = callback; },
  });
  return { host: new WechatHost(), createRewardedVideoAd, hide: () => hide(), show: () => show() };
};
afterEach(() => { config.adUnitId = ""; vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("WeChat rewarded host bridge", () => {
  it("keeps the unconfigured native integration unavailable without creating an ad", async () => {
    const setup = host();
    expect(setup.host.isRewardedAdAvailable()).toBe(false);
    await expect(setup.host.showRewardedAd("supply-1")).resolves.toEqual({ status: "unavailable", requestId: "supply-1" });
    expect(setup.createRewardedVideoAd).not.toHaveBeenCalled();
  });

  it("passes configured ID to wx and returns the adapter's native result", async () => {
    config.adUnitId = "adunit-test-host";
    let close!: (event?: RewardedVideoCloseEvent) => void;
    const ad = {
      load: vi.fn(async () => {}), show: vi.fn(async () => {}),
      onClose: (listener: typeof close) => { close = listener; },
      offClose: vi.fn(), onError: vi.fn(), offError: vi.fn(), destroy: vi.fn(),
    };
    const setup = host(vi.fn().mockReturnValueOnce(ad));
    expect(ad.load).toHaveBeenCalledTimes(1);
    expect(ad.show).not.toHaveBeenCalled();
    expect(setup.host.isRewardedAdAvailable()).toBe(true);
    const pending = setup.host.showRewardedAd("supply-2");
    expect(setup.host.isRewardedAdAvailable()).toBe(false);
    await Promise.resolve();
    expect(ad.show).toHaveBeenCalledTimes(1);
    close({ isEnded: false });
    await expect(pending).resolves.toEqual({ status: "cancelled", requestId: "supply-2" });
    expect(setup.createRewardedVideoAd).toHaveBeenNthCalledWith(1, { adUnitId: config.adUnitId, multiton: true });
    expect(setup.host.isRewardedAdAvailable()).toBe(true);
    expect(ad.destroy).toHaveBeenCalledTimes(1);
  });

  it("warms on startup and resume while keeping an already shown ad alive on hide", async () => {
    config.adUnitId = "adunit-test-host";
    const ads: Array<{ load: ReturnType<typeof vi.fn>; show: ReturnType<typeof vi.fn>; close(event: RewardedVideoCloseEvent): void }> = [];
    const create = vi.fn(() => {
      let close!: (event?: RewardedVideoCloseEvent) => void;
      const ad = {
        load: vi.fn(async () => {}), show: vi.fn(async () => {}),
        onClose: (listener: typeof close) => { close = listener; },
        offClose: vi.fn(), onError: vi.fn(), offError: vi.fn(), destroy: vi.fn(),
        close: (event: RewardedVideoCloseEvent) => close(event),
      };
      ads.push(ad);
      return ad;
    });
    const setup = host(create);
    const hidden = vi.fn(); const shown = vi.fn();
    setup.host.onHide(hidden); setup.host.onShow(shown);
    expect(create).toHaveBeenCalledTimes(1);
    await Promise.resolve();
    const first = setup.host.showRewardedAd("first");
    expect(ads[0].show).toHaveBeenCalledTimes(1);
    setup.hide();
    ads[0].close({ isEnded: true });
    await expect(first).resolves.toEqual({ status: "completed", requestId: "first" });
    expect(create).toHaveBeenCalledTimes(1);
    setup.show(); setup.show();
    expect(hidden).toHaveBeenCalledTimes(1);
    expect(shown).toHaveBeenCalledTimes(2);
    expect(create).toHaveBeenCalledTimes(2);
    expect(ads[1].load).toHaveBeenCalledTimes(1);
    expect(ads[1].show).not.toHaveBeenCalled();
  });
});
