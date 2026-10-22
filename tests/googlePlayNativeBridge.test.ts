import { afterEach, describe, expect, it, vi } from "vitest";
import { GooglePlayNativeBridge, type GooglePlayNativePort } from "../src/googlePlay/nativeBridge";

function setup() {
  const requests: Array<{ id: string; type: string; payload: Record<string, unknown> }> = [];
  const port: GooglePlayNativePort = { onmessage: null, postMessage: raw => requests.push(JSON.parse(raw)) };
  const bridge = new GooglePlayNativeBridge(port);
  const receive = (message: unknown) => port.onmessage?.({ data: JSON.stringify(message) });
  const ready = () => receive({ type: "state", state: { consentReady: true, rewardedReady: true, privacyOptionsRequired: true } });
  const result = (id: string, values: Record<string, unknown>) => receive({ id, type: "result", ...values });
  return { bridge, port, requests, receive, ready, result };
}

afterEach(() => vi.useRealTimers());
describe("Google Play native rewarded bridge", () => {
  it("keeps failed consent/inventory taps actionable without simulating permission or reward", async () => {
    const absent = new GooglePlayNativeBridge();
    expect(absent.rewardedAvailable).toBe(false);
    await expect(absent.showRewardedAd("test-missing")).resolves.toEqual({ requestId: "test-missing", status: "unavailable" });
    const s = setup();
    expect(s.bridge.rewardedAvailable).toBe(true);
    expect(s.bridge.state.consentReady).toBe(false);
    expect(s.bridge.state.rewardedReady).toBe(false);
    const pending = s.bridge.showRewardedAd("test-no-consent");
    expect(s.bridge.rewardedAvailable).toBe(false);
    expect(s.requests).toHaveLength(1);
    s.result("test-no-consent", { ok: false, status: "consent-unavailable", state: {
      consentReady: false, rewardedReady: false, consentStatus: "failed", adsStatus: "not-started", rewardedStatus: "not-loaded", lastAdError: "consent: UMP 2: request failed",
    } });
    await expect(pending).resolves.toMatchObject({ status: "unavailable" });
    expect(s.bridge.rewardedAvailable).toBe(true);
    expect(s.bridge.state.lastAdError).toContain("UMP 2");
    const retry = s.bridge.showRewardedAd("retry-no-consent");
    s.result("retry-no-consent", { ok: false, status: "loading" });
    await expect(retry).resolves.toMatchObject({ status: "unavailable" });
    expect(s.requests).toHaveLength(2);
    s.bridge.dispose();
  });

  it("does not show or reward later merely because a failed tap's preload finishes", async () => {
    const s = setup();
    const pending = s.bridge.showRewardedAd("not-ready-tap");
    s.result("not-ready-tap", { ok: false, status: "loading" });
    await expect(pending).resolves.toMatchObject({ status: "unavailable" });
    s.ready();
    expect(s.bridge.state.rewardedReady).toBe(true);
    expect(s.requests).toHaveLength(1);
    s.result("not-ready-tap", { ok: true, status: "rewarded", rewarded: true });
    await expect(s.bridge.showRewardedAd("not-ready-tap")).resolves.toMatchObject({ status: "unavailable" });
    s.bridge.dispose();
  });

  it("requires native earned AND closed reward result with matching request, and rejects duplicates/concurrency", async () => {
    const s = setup(); s.ready();
    const pending = s.bridge.showRewardedAd("booster-rocket-123");
    let completed = false; void pending.then(() => { completed = true; });
    expect(s.requests[0]).toEqual({ id: "booster-rocket-123", type: "rewarded", payload: { placement: "game-reward" } });
    await expect(s.bridge.showRewardedAd("another")).resolves.toMatchObject({ status: "unavailable" });
    s.result("other-request", { ok: true, status: "rewarded", rewarded: true });
    await Promise.resolve(); expect(completed).toBe(false);
    s.result("booster-rocket-123", { ok: true, status: "rewarded", rewarded: true });
    await expect(pending).resolves.toEqual({ requestId: "booster-rocket-123", status: "completed" });
    s.result("booster-rocket-123", { ok: true, status: "rewarded", rewarded: true });
    await expect(s.bridge.showRewardedAd("booster-rocket-123")).resolves.toMatchObject({ status: "unavailable" });
    expect(s.requests).toHaveLength(1); s.bridge.dispose();
  });

  it.each([
    [{ ok: true, status: "cancelled", rewarded: false }, "cancelled"],
    [{ ok: true, status: "rewarded", rewarded: false }, "error"],
    [{ ok: false, status: "rewarded", rewarded: true }, "error"],
    [{ ok: true, status: "completed", rewarded: true }, "error"],
    [{ ok: false, status: "unavailable" }, "unavailable"],
    [{ ok: false, status: "initialization-failed" }, "unavailable"],
    [{ ok: false, status: "load-failed" }, "unavailable"],
  ])("does not grant a reward for non-authoritative completion %j", async (result, expected) => {
    const s = setup(); s.ready();
    const pending = s.bridge.showRewardedAd("reward-test");
    s.result("reward-test", result);
    await expect(pending).resolves.toMatchObject({ status: expected });
    s.bridge.dispose();
  });

  it("keeps an outstanding ad alive through hide/show and ignores repeated visibility events", async () => {
    const s = setup(); s.ready(); const listener = vi.fn(); s.bridge.onVisibility(listener);
    const pending = s.bridge.showRewardedAd("life-1");
    s.receive({ type: "visibility", visible: false }); s.receive({ type: "visibility", visible: false });
    expect(s.bridge.rewardedAvailable).toBe(false);
    s.result("life-1", { ok: true, status: "rewarded", rewarded: true });
    await expect(pending).resolves.toMatchObject({ status: "completed" });
    s.receive({ type: "visibility", visible: true });
    expect(listener.mock.calls).toEqual([[false], [true]]); s.bridge.dispose();
  });

  it("cancels missing responses and never accepts a later receipt for a timed out request", async () => {
    vi.useFakeTimers(); const s = setup(); s.ready();
    const pending = s.bridge.showRewardedAd("slow-video");
    await vi.advanceTimersByTimeAsync(300_000);
    await expect(pending).resolves.toMatchObject({ status: "error" });
    s.result("slow-video", { ok: true, status: "rewarded", rewarded: true });
    await expect(s.bridge.showRewardedAd("slow-video")).resolves.toMatchObject({ status: "unavailable" });
    s.bridge.dispose(); expect(vi.getTimerCount()).toBe(0);
  });

  it("settles pending calls safely on disposal and detaches its listener", async () => {
    vi.useFakeTimers(); const s = setup(); s.ready();
    const pending = s.bridge.showRewardedAd("dispose-video");
    const oldListener = s.port.onmessage;
    s.bridge.dispose(); s.bridge.dispose();
    oldListener?.({ data: JSON.stringify({ type: "result", id: "dispose-video", ok: true, status: "rewarded", rewarded: true }) });
    await expect(pending).resolves.toMatchObject({ status: "unavailable" });
    expect(s.port.onmessage).toBeNull(); expect(vi.getTimerCount()).toBe(0);
  });

  it("rejects malformed messages and invalid IDs, and makes privacy options an explicit request", async () => {
    const s = setup(); s.ready();
    s.port.onmessage?.({ data: "not JSON" }); s.receive(null); s.receive([]);
    s.receive({ type: "visibility", visible: "false" }); expect(s.bridge.visible).toBe(true);
    await expect(s.bridge.showRewardedAd("unsafe id")).resolves.toMatchObject({ status: "unavailable" });
    const options = s.bridge.showPrivacyOptions();
    expect(s.requests).toHaveLength(1); expect(s.requests[0].type).toBe("privacyOptions");
    s.result(s.requests[0].id, { ok: true, status: "closed" });
    await expect(options).resolves.toBe(true); s.bridge.dispose();
  });
});
