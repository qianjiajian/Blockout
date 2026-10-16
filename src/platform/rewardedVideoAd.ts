import type { RewardedAdResult, RewardedAdStatus } from "./Host";

export interface RewardedVideoCloseEvent { isEnded?: boolean }
type CloseListener = (event?: RewardedVideoCloseEvent) => void;
type ErrorListener = (error: unknown) => void;

export interface WechatRewardedVideo {
  load(): Promise<unknown>;
  show(): Promise<unknown>;
  onClose(listener: CloseListener): void;
  offClose(listener: CloseListener): void;
  onError(listener: ErrorListener): void;
  offError(listener: ErrorListener): void;
  destroy(): void;
}

export interface WechatRewardedVideoApi {
  createRewardedVideoAd?(options: { adUnitId: string; multiton: true }): WechatRewardedVideo;
}

const failureStatus = (error: unknown): RewardedAdStatus =>
  error && typeof error === "object" && "errCode" in error && error.errCode === 1004
    ? "unavailable" : "error";

interface VideoSlot {
  ad?: WechatRewardedVideo;
  ready: boolean;
  loadedAt: number;
  ended: boolean;
  status?: RewardedAdStatus;
  showRequested: boolean;
  loadTimeout?: ReturnType<typeof setTimeout>;
  request?: { id: string; resolve(result: RewardedAdResult): void };
  onClose: CloseListener;
  onError: ErrorListener;
}

// Local cache policy, not a guarantee about the native ad's lifetime.
const PRELOAD_MAX_AGE_MS = 5 * 60_000;
const LOAD_TIMEOUT_MS = 30_000;

/** Native presentation only. The caller owns eligibility and durable rewards. */
export class WechatRewardedVideoAdapter {
  private busy = false;
  private disposed = false;
  private visible = true;
  private prepared?: VideoSlot;
  private active?: VideoSlot;
  private readonly completedRequests = new Set<string>();

  constructor(private readonly api: WechatRewardedVideoApi | undefined, private readonly adUnitId: string) {}

  isAvailable(): boolean {
    return !this.disposed && !this.busy && Boolean(this.adUnitId.trim())
      && typeof this.api?.createRewardedVideoAd === "function";
  }

  /** Prepare one single-use instance without opening UI or starting a reward. */
  preload(): void {
    if (!this.visible || !this.isAvailable()) return;
    this.discardExpired();
    if (!this.prepared) this.createSlot();
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    // Native video presentation itself can hide the game. Keep its close
    // callback alive, but never open a still-loading ad after leaving the app.
    if (!visible && this.active && !this.active.showRequested) this.finish(this.active, "cancelled");
    if (visible) this.preload();
  }

  show(requestId: string): Promise<RewardedAdResult> {
    if (!this.visible || !requestId.trim() || this.completedRequests.has(requestId) || !this.isAvailable()) {
      return Promise.resolve({ status: "unavailable", requestId });
    }
    this.busy = true;
    return new Promise((resolve) => {
      this.discardExpired();
      const slot = this.prepared ?? this.createSlot();
      if (slot.ended) {
        this.busy = false;
        resolve({ status: slot.status ?? "error", requestId });
        return;
      }
      this.prepared = undefined;
      this.active = slot;
      slot.request = { id: requestId, resolve };
      if (slot.ready) this.present(slot);
    });
  }

  private discardExpired(): void {
    if (this.prepared?.ready && Date.now() - this.prepared.loadedAt >= PRELOAD_MAX_AGE_MS) {
      this.finish(this.prepared, "cancelled");
    }
  }

  private createSlot(): VideoSlot {
    const slot: VideoSlot = {
      ready: false, loadedAt: 0, ended: false, showRequested: false,
      onClose: (event) => this.finish(slot,
        slot.showRequested && event?.isEnded === true ? "completed" : "cancelled"),
      onError: (error) => this.finish(slot, failureStatus(error)),
    };
    this.prepared = slot;
    try {
      const ad = slot.ad = this.api!.createRewardedVideoAd!({ adUnitId: this.adUnitId.trim(), multiton: true });
      if (!ad || ["load", "show", "onClose", "offClose", "onError", "offError", "destroy"]
        .some((method) => typeof (ad as unknown as Record<string, unknown>)[method] !== "function")) {
        this.finish(slot, "unavailable");
        return slot;
      }
      ad.onClose(slot.onClose);
      if (slot.ended) return slot;
      ad.onError(slot.onError);
      if (slot.ended) return slot;
      slot.loadTimeout = setTimeout(() => this.finish(slot, "error"), LOAD_TIMEOUT_MS);
      void Promise.resolve(ad.load()).then(() => {
        if (slot.ended) return;
        clearTimeout(slot.loadTimeout);
        slot.loadTimeout = undefined;
        slot.ready = true;
        slot.loadedAt = Date.now();
        if (slot.request) this.present(slot);
      }, (error) => this.finish(slot, failureStatus(error)));
    } catch (error) { this.finish(slot, failureStatus(error)); }
    return slot;
  }

  private present(slot: VideoSlot): void {
    if (slot.ended || slot.showRequested || !slot.request) return;
    if (!this.visible) { this.finish(slot, "cancelled"); return; }
    slot.showRequested = true;
    try {
      // The warm path calls show directly in the click stack: no second load.
      void Promise.resolve(slot.ad!.show()).catch((error) => this.finish(slot, failureStatus(error)));
      // show() success is not reward completion. Wait for the strict onClose.
    } catch (error) { this.finish(slot, failureStatus(error)); }
  }

  private finish(slot: VideoSlot, status: RewardedAdStatus): void {
    if (slot.ended) return;
    slot.ended = true;
    slot.status = status;
    clearTimeout(slot.loadTimeout);
    if (this.prepared === slot) this.prepared = undefined;
    if (this.active === slot) this.active = undefined;
    // Detach before destroy, which can itself dispatch native callbacks.
    try { slot.ad?.offClose(slot.onClose); } catch { /* best-effort native cleanup */ }
    try { slot.ad?.offError(slot.onError); } catch { /* clean independently */ }
    try { slot.ad?.destroy(); } catch { /* result must still settle */ }
    if (!slot.request) return;
    this.busy = false;
    if (status === "completed") this.completedRequests.add(slot.request.id);
    slot.request.resolve({ status, requestId: slot.request.id });
    // One replacement after a viewed/closed ad. Load/errors never self-retry.
    if (slot.showRequested && (status === "completed" || status === "cancelled")) {
      void Promise.resolve().then(() => this.preload());
    }
  }

  dispose(): void {
    this.disposed = true;
    if (this.active) this.finish(this.active, "cancelled");
    if (this.prepared) this.finish(this.prepared, "cancelled");
  }
}
