import { afterEach, describe, expect, it, vi } from "vitest";
import {
  WechatRewardedVideoAdapter,
  type RewardedVideoCloseEvent,
  type WechatRewardedVideo,
} from "../src/platform/rewardedVideoAd";

class PreloadedNativeAd implements WechatRewardedVideo {
  closes = new Set<(event?: RewardedVideoCloseEvent) => void>();
  errors = new Set<(error: unknown) => void>();
  load = vi.fn<() => Promise<unknown>>(async () => {});
  show = vi.fn<() => Promise<unknown>>(async () => {});
  onClose = vi.fn((listener: (event?: RewardedVideoCloseEvent) => void) => { this.closes.add(listener); });
  offClose = vi.fn((listener: (event?: RewardedVideoCloseEvent) => void) => { this.closes.delete(listener); });
  onError = vi.fn((listener: (error: unknown) => void) => { this.errors.add(listener); });
  offError = vi.fn((listener: (error: unknown) => void) => { this.errors.delete(listener); });
  destroy = vi.fn(() => {});
  close(event?: RewardedVideoCloseEvent): void { [...this.closes].forEach((listener) => listener(event)); }
  error(error: unknown): void { [...this.errors].forEach((listener) => listener(error)); }
}

const adapters: WechatRewardedVideoAdapter[] = [];
const setup = (configure?: (ad: PreloadedNativeAd, index: number) => void) => {
  const ads: PreloadedNativeAd[] = [];
  const createRewardedVideoAd = vi.fn(() => {
    const ad = new PreloadedNativeAd();
    configure?.(ad, ads.length);
    ads.push(ad);
    return ad;
  });
  const adapter = new WechatRewardedVideoAdapter({ createRewardedVideoAd }, "adunit-preload");
  adapters.push(adapter);
  return { adapter, ads, createRewardedVideoAd };
};
const flushMicrotasks = async () => {
  for (let turn = 0; turn < 8; turn += 1) await Promise.resolve();
};
const released = (ad: PreloadedNativeAd) => {
  expect(ad.closes.size).toBe(0);
  expect(ad.errors.size).toBe(0);
  expect(ad.destroy).toHaveBeenCalledTimes(1);
};

afterEach(() => {
  for (const adapter of adapters.splice(0)) adapter.dispose();
  vi.useRealTimers();
});

describe("rewarded video preloading", () => {
  it("preloads one native instance idempotently and never presents it without a request", async () => {
    let completeLoad!: () => void;
    const { adapter, ads, createRewardedVideoAd } = setup((ad) => {
      ad.load.mockReturnValue(new Promise<void>((resolve) => { completeLoad = resolve; }));
    });
    adapter.preload();
    adapter.preload();
    adapter.setVisible(true);
    expect(createRewardedVideoAd).toHaveBeenCalledTimes(1);
    expect(createRewardedVideoAd).toHaveBeenCalledWith({ adUnitId: "adunit-preload", multiton: true });
    expect(ads[0].load).toHaveBeenCalledTimes(1);
    expect(ads[0].onClose).toHaveBeenCalledBefore(ads[0].load);
    expect(ads[0].onError).toHaveBeenCalledBefore(ads[0].load);
    expect(adapter.isAvailable()).toBe(true);
    completeLoad();
    await flushMicrotasks();
    adapter.preload();
    adapter.setVisible(true);
    expect(createRewardedVideoAd).toHaveBeenCalledTimes(1);
    expect(ads[0].load).toHaveBeenCalledTimes(1);
    expect(ads[0].show).not.toHaveBeenCalled();
  });

  it("moves a simulated one-second native load before the next click", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const { adapter, ads, createRewardedVideoAd } = setup((ad) => {
      ad.load.mockImplementation(() => new Promise<void>((resolve) => { setTimeout(resolve, 1_000); }));
    });
    const cold = adapter.show("cold");
    await vi.advanceTimersByTimeAsync(999);
    expect(ads[0].show).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(ads[0].show).toHaveBeenCalledTimes(1);
    ads[0].close({ isEnded: true });
    await expect(cold).resolves.toEqual({ status: "completed", requestId: "cold" });
    await flushMicrotasks();
    expect(createRewardedVideoAd).toHaveBeenCalledTimes(2);
    expect(ads[1].show).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1_000);
    const clickTime = Date.now();
    const warm = adapter.show("warm");
    // No timer advance or microtask flush between the click and native show.
    expect(ads[1].show).toHaveBeenCalledTimes(1);
    expect(Date.now()).toBe(clickTime);
    expect(ads[1].load).toHaveBeenCalledTimes(1);
    expect(createRewardedVideoAd).toHaveBeenCalledTimes(2);
    ads[1].close({ isEnded: true });
    await expect(warm).resolves.toEqual({ status: "completed", requestId: "warm" });
  });

  it("joins an in-flight preload and rejects simultaneous clicks without a second load", async () => {
    let completeLoad!: () => void;
    const { adapter, ads, createRewardedVideoAd } = setup((ad) => {
      ad.load.mockReturnValue(new Promise<void>((resolve) => { completeLoad = resolve; }));
    });
    adapter.preload();
    const pending = adapter.show("joined");
    const observed = vi.fn();
    void pending.then(observed);
    adapter.preload();
    await expect(adapter.show("concurrent")).resolves.toEqual({ status: "unavailable", requestId: "concurrent" });
    expect(createRewardedVideoAd).toHaveBeenCalledTimes(1);
    expect(ads[0].load).toHaveBeenCalledTimes(1);
    expect(ads[0].show).not.toHaveBeenCalled();
    completeLoad();
    await flushMicrotasks();
    expect(ads[0].show).toHaveBeenCalledTimes(1);
    expect(observed).not.toHaveBeenCalled();
    ads[0].close({ isEnded: true });
    await expect(pending).resolves.toEqual({ status: "completed", requestId: "joined" });
  });

  it("prepares the next unique native instance after closing and ignores old callbacks", async () => {
    const { adapter, ads, createRewardedVideoAd } = setup();
    adapter.preload();
    await flushMicrotasks();
    const oldClose = [...ads[0].closes][0];
    const oldError = [...ads[0].errors][0];
    const first = adapter.show("first");
    ads[0].close({ isEnded: true });
    await expect(first).resolves.toEqual({ status: "completed", requestId: "first" });
    await flushMicrotasks();
    released(ads[0]);
    expect(createRewardedVideoAd).toHaveBeenCalledTimes(2);
    expect(ads[1].show).not.toHaveBeenCalled();
    const second = adapter.show("second");
    const observed = vi.fn();
    void second.then(observed);
    oldClose({ isEnded: true });
    oldError({ errCode: 1004 });
    await flushMicrotasks();
    expect(observed).not.toHaveBeenCalled();
    expect(ads[1].destroy).not.toHaveBeenCalled();
    await expect(adapter.show("first")).resolves.toEqual({ status: "unavailable", requestId: "first" });
    ads[1].close({ isEnded: false });
    await expect(second).resolves.toEqual({ status: "cancelled", requestId: "second" });
    await flushMicrotasks();
    released(ads[1]);
    expect(createRewardedVideoAd).toHaveBeenCalledTimes(3);
  });

  it("does not turn a close received during preload into a completed reward", async () => {
    const { adapter, ads } = setup();
    adapter.preload();
    const oldClose = [...ads[0].closes][0];
    ads[0].close({ isEnded: true });
    await flushMicrotasks();
    expect(ads[0].show).not.toHaveBeenCalled();
    released(ads[0]);
    const pending = adapter.show("after-early-close");
    const observed = vi.fn();
    void pending.then(observed);
    await flushMicrotasks();
    oldClose({ isEnded: true });
    await flushMicrotasks();
    expect(observed).not.toHaveBeenCalled();
    const current = ads.at(-1)!;
    expect(current.show).toHaveBeenCalledTimes(1);
    current.close({ isEnded: false });
    await expect(pending).resolves.toEqual({ status: "cancelled", requestId: "after-early-close" });
  });

  it.each(["promise", "event", "throw"] as const)("stops after a preload %s failure and recovers on a later preload", async (failure) => {
    const { adapter, ads, createRewardedVideoAd } = setup((ad, index) => {
      if (index !== 0) return;
      if (failure === "promise") ad.load.mockRejectedValueOnce(new Error("load failed"));
      if (failure === "throw") ad.load.mockImplementationOnce(() => { throw new Error("load threw"); });
      if (failure === "event") ad.load.mockReturnValueOnce(new Promise(() => {}));
    });
    expect(() => adapter.preload()).not.toThrow();
    if (failure === "event") ads[0].error({ errCode: 1004 });
    await flushMicrotasks();
    released(ads[0]);
    expect(createRewardedVideoAd).toHaveBeenCalledTimes(1);
    expect(ads[0].show).not.toHaveBeenCalled();
    expect(adapter.isAvailable()).toBe(true);
    adapter.preload();
    await flushMicrotasks();
    expect(createRewardedVideoAd).toHaveBeenCalledTimes(2);
    const pending = adapter.show("recovered");
    expect(ads[1].show).toHaveBeenCalledTimes(1);
    ads[1].close({ isEnded: true });
    await expect(pending).resolves.toEqual({ status: "completed", requestId: "recovered" });
  });

  it("settles a joined load failure once and recovers on a later click without retrying in a loop", async () => {
    let completeLoad!: () => void;
    const { adapter, ads, createRewardedVideoAd } = setup((ad, index) => {
      if (index === 0) ad.load.mockReturnValue(new Promise<void>((resolve) => { completeLoad = resolve; }));
    });
    adapter.preload();
    const pending = adapter.show("failed-request");
    const oldClose = [...ads[0].closes][0];
    ads[0].error({ errCode: 1004 });
    await expect(pending).resolves.toEqual({ status: "unavailable", requestId: "failed-request" });
    completeLoad();
    oldClose({ isEnded: true });
    await flushMicrotasks();
    expect(createRewardedVideoAd).toHaveBeenCalledTimes(1);
    expect(ads[0].show).not.toHaveBeenCalled();
    const next = adapter.show("recovered-request");
    await flushMicrotasks();
    expect(createRewardedVideoAd).toHaveBeenCalledTimes(2);
    expect(ads[1].show).toHaveBeenCalledTimes(1);
    ads[1].close({ isEnded: true });
    await expect(next).resolves.toEqual({ status: "completed", requestId: "recovered-request" });
  });

  it("does not keep retrying a native creation failure during preload", async () => {
    const createRewardedVideoAd = vi.fn(() => { throw new Error("create failed"); });
    const adapter = new WechatRewardedVideoAdapter({ createRewardedVideoAd }, "adunit-preload");
    adapters.push(adapter);
    expect(() => adapter.preload()).not.toThrow();
    await flushMicrotasks();
    expect(createRewardedVideoAd).toHaveBeenCalledTimes(1);
    expect(adapter.isAvailable()).toBe(true);
  });

  it("settles a synchronous close during show once even if show then rejects", async () => {
    const { adapter, ads, createRewardedVideoAd } = setup((ad, index) => {
      if (index === 0) ad.show.mockImplementationOnce(() => {
        ad.close({ isEnded: true });
        return Promise.reject(new Error("late show rejection"));
      });
    });
    adapter.preload();
    await flushMicrotasks();
    const observed = vi.fn();
    const pending = adapter.show("synchronous-close");
    void pending.then(observed);
    await expect(pending).resolves.toEqual({ status: "completed", requestId: "synchronous-close" });
    await flushMicrotasks();
    expect(observed).toHaveBeenCalledTimes(1);
    expect(createRewardedVideoAd).toHaveBeenCalledTimes(2);
    released(ads[0]);
    expect(ads[1].destroy).not.toHaveBeenCalled();
    expect(ads[1].show).not.toHaveBeenCalled();
  });

  it.each(["close", "error"] as const)("handles a synchronous %s while subscribing without loading or rewarding", async (event) => {
    const { adapter, ads } = setup((ad) => {
      if (event === "close") ad.onClose.mockImplementationOnce((listener) => {
        ad.closes.add(listener);
        listener({ isEnded: true });
      });
      else ad.onError.mockImplementationOnce((listener) => {
        ad.errors.add(listener);
        listener({ errCode: 1004 });
      });
    });
    await expect(adapter.show("subscription-event")).resolves.toEqual({
      status: event === "close" ? "cancelled" : "unavailable", requestId: "subscription-event",
    });
    expect(ads[0].load).not.toHaveBeenCalled();
    expect(ads[0].show).not.toHaveBeenCalled();
    released(ads[0]);
    expect(adapter.isAvailable()).toBe(true);
  });
});

// These durations are the application's cache/timeout policies, not promises
// about native SDK cache lifetime or actual network latency on a handset.
describe("rewarded video local cache policy", () => {
  it.each(["preload", "show"] as const)("replaces a five-minute-old ready slot on the next %s", async (action) => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const { adapter, ads, createRewardedVideoAd } = setup();
    adapter.preload();
    await flushMicrotasks();
    await vi.advanceTimersByTimeAsync(299_999);
    adapter.preload();
    expect(createRewardedVideoAd).toHaveBeenCalledTimes(1);
    expect(ads[0].destroy).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    const oldClose = [...ads[0].closes][0];
    const oldError = [...ads[0].errors][0];
    // Destruction may itself call stale native listeners.
    ads[0].destroy.mockImplementationOnce(() => {
      oldClose({ isEnded: true });
      oldError({ errCode: 1004 });
    });
    const pending = action === "show" ? adapter.show("expired-cache") : undefined;
    if (action === "preload") adapter.preload();
    await flushMicrotasks();
    released(ads[0]);
    expect(ads[0].show).not.toHaveBeenCalled();
    expect(createRewardedVideoAd).toHaveBeenCalledTimes(2);
    expect(ads[1].load).toHaveBeenCalledTimes(1);
    expect(ads[1].destroy).not.toHaveBeenCalled();
    expect(ads[1].show).toHaveBeenCalledTimes(action === "show" ? 1 : 0);
    if (pending) {
      ads[1].close({ isEnded: true });
      await expect(pending).resolves.toEqual({ status: "completed", requestId: "expired-cache" });
    }
  });

  it.each([false, true])("releases a thirty-second stalled load without a retry loop (clicked=%s)", async (clicked) => {
    vi.useFakeTimers();
    let completeLoad!: () => void;
    const { adapter, ads, createRewardedVideoAd } = setup((ad, index) => {
      if (index === 0) ad.load.mockReturnValue(new Promise<void>((resolve) => { completeLoad = resolve; }));
    });
    adapter.preload();
    const pending = clicked ? adapter.show("timed-out") : undefined;
    const observed = vi.fn();
    if (pending) void pending.then(observed);
    const oldClose = [...ads[0].closes][0];
    await vi.advanceTimersByTimeAsync(29_999);
    expect(ads[0].destroy).not.toHaveBeenCalled();
    expect(observed).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    if (pending) await expect(pending).resolves.toEqual({ status: "error", requestId: "timed-out" });
    released(ads[0]);
    completeLoad();
    oldClose({ isEnded: true });
    await vi.advanceTimersByTimeAsync(90_000);
    expect(ads[0].show).not.toHaveBeenCalled();
    expect(createRewardedVideoAd).toHaveBeenCalledTimes(1);
    expect(observed).toHaveBeenCalledTimes(clicked ? 1 : 0);
    expect(adapter.isAvailable()).toBe(true);
    adapter.preload();
    await flushMicrotasks();
    expect(createRewardedVideoAd).toHaveBeenCalledTimes(2);
    expect(ads[1].show).not.toHaveBeenCalled();
  });
});

describe("rewarded video foreground lifecycle", () => {
  it("does not create or show ads while hidden and prepares one on return", async () => {
    const { adapter, ads, createRewardedVideoAd } = setup();
    adapter.setVisible(false);
    adapter.preload();
    await expect(adapter.show("hidden")).resolves.toEqual({ status: "unavailable", requestId: "hidden" });
    expect(createRewardedVideoAd).not.toHaveBeenCalled();
    adapter.setVisible(true);
    adapter.setVisible(true);
    await flushMicrotasks();
    expect(createRewardedVideoAd).toHaveBeenCalledTimes(1);
    expect(ads[0].load).toHaveBeenCalledTimes(1);
    expect(ads[0].show).not.toHaveBeenCalled();
  });

  it("does not present a preloaded ad when its load resolves in the background", async () => {
    let completeLoad!: () => void;
    const { adapter, ads } = setup((ad) => {
      ad.load.mockReturnValueOnce(new Promise<void>((resolve) => { completeLoad = resolve; }));
    });
    adapter.preload();
    adapter.setVisible(false);
    completeLoad();
    await flushMicrotasks();
    expect(ads[0].show).not.toHaveBeenCalled();
    adapter.setVisible(true);
    await flushMicrotasks();
    expect(ads.every((ad) => ad.show.mock.calls.length === 0)).toBe(true);
  });

  it("cancels a clicked request if hidden before load finishes, with no late display or reward", async () => {
    let completeLoad!: () => void;
    const { adapter, ads, createRewardedVideoAd } = setup((ad) => {
      ad.load.mockReturnValueOnce(new Promise<void>((resolve) => { completeLoad = resolve; }));
    });
    adapter.preload();
    const pending = adapter.show("hidden-during-load");
    const oldClose = [...ads[0].closes][0];
    const observed = vi.fn();
    void pending.then(observed);
    adapter.setVisible(false);
    await expect(pending).resolves.toEqual({ status: "cancelled", requestId: "hidden-during-load" });
    completeLoad();
    oldClose({ isEnded: true });
    await flushMicrotasks();
    expect(observed).toHaveBeenCalledTimes(1);
    expect(ads[0].show).not.toHaveBeenCalled();
    expect(createRewardedVideoAd).toHaveBeenCalledTimes(1);
  });

  it("keeps a presentation alive across hide and defers the next preload until visible", async () => {
    const { adapter, ads, createRewardedVideoAd } = setup();
    adapter.preload();
    await flushMicrotasks();
    const pending = adapter.show("native-overlay");
    const observed = vi.fn();
    void pending.then(observed);
    expect(ads[0].show).toHaveBeenCalledTimes(1);
    adapter.setVisible(false);
    await flushMicrotasks();
    expect(observed).not.toHaveBeenCalled();
    expect(ads[0].destroy).not.toHaveBeenCalled();
    ads[0].close({ isEnded: true });
    await expect(pending).resolves.toEqual({ status: "completed", requestId: "native-overlay" });
    await flushMicrotasks();
    released(ads[0]);
    expect(createRewardedVideoAd).toHaveBeenCalledTimes(1);
    adapter.setVisible(true);
    await flushMicrotasks();
    expect(createRewardedVideoAd).toHaveBeenCalledTimes(2);
    expect(ads[1].show).not.toHaveBeenCalled();
  });

  it("does not execute queued replenishment after dispose", async () => {
    const { adapter, ads, createRewardedVideoAd } = setup();
    adapter.preload();
    await flushMicrotasks();
    const pending = adapter.show("last");
    ads[0].close({ isEnded: true });
    adapter.dispose();
    await expect(pending).resolves.toEqual({ status: "completed", requestId: "last" });
    await flushMicrotasks();
    expect(createRewardedVideoAd).toHaveBeenCalledTimes(1);
    released(ads[0]);
    adapter.setVisible(true);
    adapter.preload();
    await expect(adapter.show("after-dispose")).resolves.toEqual({ status: "unavailable", requestId: "after-dispose" });
    expect(createRewardedVideoAd).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])("disposes a pending preload or click once (clicked=%s)", async (clicked) => {
    let completeLoad!: () => void;
    const { adapter, ads, createRewardedVideoAd } = setup((ad) => {
      ad.load.mockReturnValue(new Promise<void>((resolve) => { completeLoad = resolve; }));
    });
    adapter.preload();
    const pending = clicked ? adapter.show("disposed-loading") : undefined;
    const oldClose = [...ads[0].closes][0];
    adapter.dispose();
    adapter.dispose();
    if (pending) await expect(pending).resolves.toEqual({ status: "cancelled", requestId: "disposed-loading" });
    completeLoad();
    oldClose({ isEnded: true });
    await flushMicrotasks();
    released(ads[0]);
    expect(ads[0].show).not.toHaveBeenCalled();
    expect(adapter.isAvailable()).toBe(false);
    expect(createRewardedVideoAd).toHaveBeenCalledTimes(1);
  });
});
