import { afterEach, describe, expect, it, vi } from "vitest";
import { WechatRewardedVideoAdapter, type WechatRewardedVideo, type RewardedVideoCloseEvent } from "../src/platform/rewardedVideoAd";

class NativeAd implements WechatRewardedVideo {
  closes = new Set<(event?: RewardedVideoCloseEvent) => void>();
  errors = new Set<(error: unknown) => void>();
  load = vi.fn(async () => {});
  show = vi.fn(async () => {});
  onClose = vi.fn((listener: (event?: RewardedVideoCloseEvent) => void) => { this.closes.add(listener); });
  offClose = vi.fn((listener: (event?: RewardedVideoCloseEvent) => void) => { this.closes.delete(listener); });
  onError = vi.fn((listener: (error: unknown) => void) => { this.errors.add(listener); });
  offError = vi.fn((listener: (error: unknown) => void) => { this.errors.delete(listener); });
  destroy = vi.fn(() => {});
  close(event?: RewardedVideoCloseEvent) { [...this.closes].forEach((listener) => listener(event)); }
  error(error: unknown) { [...this.errors].forEach((listener) => listener(error)); }
}

const setup = () => {
  const ad = new NativeAd();
  const api = { createRewardedVideoAd: vi.fn(() => new NativeAd()).mockReturnValueOnce(ad) };
  return { ad, api, adapter: new WechatRewardedVideoAdapter(api, "adunit-test") };
};
const shown = async (ad: NativeAd) => {
  await Promise.resolve();
  expect(ad.show).toHaveBeenCalledTimes(1);
};
const released = (ad: NativeAd) => {
  expect(ad.closes.size).toBe(0);
  expect(ad.errors.size).toBe(0);
  expect(ad.destroy).toHaveBeenCalledTimes(1);
};
afterEach(() => vi.useRealTimers());

describe("native rewarded video completion boundary", () => {
  it("does not request an ad when unconfigured, unsupported or request ID is empty", async () => {
    const createRewardedVideoAd = vi.fn();
    for (const adapter of [new WechatRewardedVideoAdapter({ createRewardedVideoAd }, "  "), new WechatRewardedVideoAdapter({}, "adunit-test"), new WechatRewardedVideoAdapter(undefined, "adunit-test")]) {
      expect(adapter.isAvailable()).toBe(false);
      await expect(adapter.show("id")).resolves.toEqual({ status: "unavailable", requestId: "id" });
    }
    await expect(new WechatRewardedVideoAdapter({ createRewardedVideoAd }, "adunit-test").show("")).resolves.toEqual({ status: "unavailable", requestId: "" });
    expect(createRewardedVideoAd).not.toHaveBeenCalled();
  });

  it("waits for strict native completion, not load/show success or elapsed time", async () => {
    vi.useFakeTimers();
    const { adapter, api, ad } = setup();
    const observed = vi.fn();
    const pending = adapter.show("reward-1");
    void pending.then(observed);
    await shown(ad);
    expect(api.createRewardedVideoAd).toHaveBeenCalledWith({ adUnitId: "adunit-test", multiton: true });
    expect(ad.onClose).toHaveBeenCalledBefore(ad.load);
    expect(ad.onError).toHaveBeenCalledBefore(ad.load);
    await vi.advanceTimersByTimeAsync(300_000);
    expect(observed).not.toHaveBeenCalled();
    ad.close({ isEnded: true });
    await expect(pending).resolves.toEqual({ status: "completed", requestId: "reward-1" });
    expect(adapter.isAvailable()).toBe(true);
    released(ad);
  });

  it.each([undefined, {}, { isEnded: false }, { isEnded: 1 }, { isEnded: "true" }])("does not reward incomplete or ambiguous close %j", async (event) => {
    const { adapter, ad } = setup();
    const pending = adapter.show("cancel");
    await shown(ad);
    ad.close(event as RewardedVideoCloseEvent | undefined);
    await expect(pending).resolves.toEqual({ status: "cancelled", requestId: "cancel" });
    released(ad);
  });

  it("rejects concurrent presentations without disrupting the original one", async () => {
    const { adapter, api, ad } = setup();
    const first = adapter.show("first");
    expect(adapter.isAvailable()).toBe(false);
    await expect(adapter.show("second")).resolves.toEqual({ status: "unavailable", requestId: "second" });
    await expect(adapter.show("first")).resolves.toEqual({ status: "unavailable", requestId: "first" });
    expect(api.createRewardedVideoAd).toHaveBeenCalledTimes(1);
    await shown(ad);
    ad.close({ isEnded: true });
    await expect(first).resolves.toEqual({ status: "completed", requestId: "first" });
  });

  it("settles duplicate/racing callbacks once and rejects replay of a completed ID", async () => {
    const { adapter, api, ad } = setup();
    const observed = vi.fn();
    const pending = adapter.show("once");
    void pending.then(observed);
    const staleClose = [...ad.closes][0];
    const staleError = [...ad.errors][0];
    await shown(ad);
    staleClose({ isEnded: true });
    staleClose({ isEnded: false });
    staleError({ errCode: 1004 });
    await pending;
    expect(observed).toHaveBeenCalledTimes(1);
    released(ad);
    await expect(adapter.show("once")).resolves.toEqual({ status: "unavailable", requestId: "once" });
    expect(api.createRewardedVideoAd).toHaveBeenCalledTimes(2); // one prepared replacement, no replay
  });

  it.each(["load", "show"] as const)("settles native %s rejection and never rewards a late close", async (method) => {
    const { adapter, ad } = setup();
    ad[method].mockRejectedValueOnce(new Error("native failure"));
    const pending = adapter.show("failed");
    const staleClose = [...ad.closes][0];
    await expect(pending).resolves.toEqual({ status: "error", requestId: "failed" });
    staleClose({ isEnded: true });
    if (method === "load") expect(ad.show).not.toHaveBeenCalled();
    released(ad);
    expect(adapter.isAvailable()).toBe(true);
  });

  it.each(["load", "show"] as const)("settles synchronous native %s exceptions", async (method) => {
    const { adapter, ad } = setup();
    ad[method].mockImplementationOnce(() => { throw new Error("native exception"); });
    await expect(adapter.show("throw")).resolves.toEqual({ status: "error", requestId: "throw" });
    released(ad);
  });

  it("handles creation failures and unsupported ad instances", async () => {
    const failure = new WechatRewardedVideoAdapter({ createRewardedVideoAd: () => { throw new Error("create failed"); } }, "id");
    await expect(failure.show("creation")).resolves.toEqual({ status: "error", requestId: "creation" });
    expect(failure.isAvailable()).toBe(true);
    const unsupported = new WechatRewardedVideoAdapter({ createRewardedVideoAd: () => ({}) as WechatRewardedVideo }, "id");
    await expect(unsupported.show("legacy")).resolves.toEqual({ status: "unavailable", requestId: "legacy" });
  });

  it.each([{ errCode: 1004 }, { errCode: 1000 }])("settles onError %j without waiting for a pending load", async (error) => {
    const { adapter, ad } = setup();
    let resolveLoad!: () => void;
    ad.load.mockReturnValue(new Promise<void>((resolve) => { resolveLoad = resolve; }));
    const pending = adapter.show("error-event");
    ad.error(error);
    await expect(pending).resolves.toEqual({ status: error.errCode === 1004 ? "unavailable" : "error", requestId: "error-event" });
    resolveLoad();
    await Promise.resolve();
    expect(ad.show).not.toHaveBeenCalled();
    released(ad);
  });

  it("does not treat a pre-show close as full viewing", async () => {
    const { adapter, ad } = setup();
    const pending = adapter.show("early");
    ad.close({ isEnded: true });
    await expect(pending).resolves.toEqual({ status: "cancelled", requestId: "early" });
    expect(ad.show).not.toHaveBeenCalled();
    released(ad);
  });

  it("isolates later requests from callbacks captured by a previous native instance", async () => {
    const { adapter, api, ad } = setup();
    const first = adapter.show("old");
    const oldClose = [...ad.closes][0];
    await shown(ad);
    const next = new NativeAd();
    api.createRewardedVideoAd.mockReturnValueOnce(next);
    ad.close({ isEnded: false });
    await first;
    const observed = vi.fn();
    const second = adapter.show("new");
    void second.then(observed);
    await shown(next);
    oldClose({ isEnded: true });
    await Promise.resolve();
    expect(observed).not.toHaveBeenCalled();
    next.close({ isEnded: true });
    await expect(second).resolves.toEqual({ status: "completed", requestId: "new" });
    released(next);
  });

  it("disposal cancels pending work and ignores later success", async () => {
    const { adapter, ad } = setup();
    const pending = adapter.show("dispose");
    const staleClose = [...ad.closes][0];
    adapter.dispose();
    staleClose({ isEnded: true });
    await expect(pending).resolves.toEqual({ status: "cancelled", requestId: "dispose" });
    expect(adapter.isAvailable()).toBe(false);
    expect(ad.show).not.toHaveBeenCalled();
    released(ad);
  });

  it("cleanup exceptions cannot duplicate completion or prevent remaining cleanup", async () => {
    const { adapter, ad } = setup();
    ad.offClose.mockImplementationOnce(() => { throw new Error("detach failed"); });
    ad.destroy.mockImplementationOnce(() => { throw new Error("destroy failed"); });
    const pending = adapter.show("cleanup");
    await shown(ad);
    ad.close({ isEnded: true });
    await expect(pending).resolves.toEqual({ status: "completed", requestId: "cleanup" });
    ad.close({ isEnded: true });
    expect(ad.offError).toHaveBeenCalledTimes(1);
    expect(ad.destroy).toHaveBeenCalledTimes(1);
    expect(adapter.isAvailable()).toBe(true);
  });
});
