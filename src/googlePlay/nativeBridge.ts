import type { RewardedAdResult } from "../platform/Host";

export interface GooglePlayNativeState {
  consentReady: boolean;
  privacyOptionsRequired: boolean;
  rewardedReady: boolean;
  interstitialReady: boolean;
  analyticsEnabled: boolean;
  consentStatus: string;
  adsStatus: string;
  rewardedStatus: string;
  lastAdError: string;
}

export interface GooglePlayNativePort {
  postMessage(message: string): void;
  onmessage: ((event: { data: string }) => void) | null;
}

export interface NativeResult {
  id: string;
  type: "result";
  ok: boolean;
  status: string;
  rewarded?: boolean;
}

type NativeCommand = "reviewPrepare" | "reviewLaunch" | "reviewStore" | "status" | "startup" | "gameReady" | "rewarded" | "settlement" | "privacyOptions" | "levelStart" | "levelEnd";
type PendingRequest = { resolve(result: NativeResult): void; timer: ReturnType<typeof setTimeout> };
const EMPTY_STATE: GooglePlayNativeState = {
  consentReady: false, privacyOptionsRequired: false, rewardedReady: false,
  interstitialReady: false, analyticsEnabled: false,
  consentStatus: "unknown", adsStatus: "unknown", rewardedStatus: "unknown", lastAdError: "",
};

/** The native WebMessage listener exists only for the trusted local main frame.
 * No browser fallback simulates a video, receipt, consent or analytics upload. */
export class GooglePlayNativeBridge {
  private readonly pending = new Map<string, PendingRequest>();
  private readonly rewardIds = new Set<string>();
  private readonly visibilityListeners = new Set<(visible: boolean) => void>();
  private currentState = { ...EMPTY_STATE };
  private disposed = false;
  private sequence = 0;
  private pendingRewardId?: string;
  private currentVisible = true;
  private readonly instanceId = `gp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  private readonly receive = (event: { data: string }): void => {
    if (this.disposed || typeof event.data !== "string" || event.data.length > 16_384) return;
    let message: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(event.data);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return;
      message = parsed as Record<string, unknown>;
    } catch { return; }
    if (message.type === "visibility") {
      if (typeof message.visible === "boolean" && message.visible !== this.currentVisible) {
        this.currentVisible = message.visible;
        this.visibilityListeners.forEach(listener => listener(message.visible as boolean));
      }
      return;
    }
    if (message.type !== "state" && message.type !== "result") return;
    if (message.state && typeof message.state === "object" && !Array.isArray(message.state)) {
      const state = message.state as Record<string, unknown>;
      this.currentState = {
        consentReady: state.consentReady === true,
        privacyOptionsRequired: state.privacyOptionsRequired === true,
        rewardedReady: state.rewardedReady === true,
        interstitialReady: state.interstitialReady === true,
        analyticsEnabled: state.analyticsEnabled === true,
        consentStatus: typeof state.consentStatus === "string" ? state.consentStatus.slice(0, 80) : "unknown",
        adsStatus: typeof state.adsStatus === "string" ? state.adsStatus.slice(0, 80) : "unknown",
        rewardedStatus: typeof state.rewardedStatus === "string" ? state.rewardedStatus.slice(0, 80) : "unknown",
        lastAdError: typeof state.lastAdError === "string" ? state.lastAdError.slice(0, 300) : "",
      };
    }
    if (message.type !== "result" || typeof message.id !== "string"
      || typeof message.ok !== "boolean" || typeof message.status !== "string") return;
    const request = this.pending.get(message.id);
    if (!request) return;
    this.pending.delete(message.id);
    clearTimeout(request.timer);
    request.resolve({ id: message.id, type: "result", ok: message.ok,
      status: message.status, rewarded: message.rewarded === true });
  };

  constructor(private readonly port?: GooglePlayNativePort) {
    if (port && typeof port.postMessage === "function") port.onmessage = this.receive;
  }

  get state(): Readonly<GooglePlayNativeState> { return { ...this.currentState }; }
  get visible(): boolean { return this.currentVisible; }
  get available(): boolean { return !this.disposed && typeof this.port?.postMessage === "function"; }
  get rewardedAvailable(): boolean {
    // This is request capability, not cached inventory. A user tap must reach
    // native recovery/feedback after consent, initialization or load failure.
    // Native alone enforces consent and grants only an earned+dismissed reward.
    return this.available && this.currentVisible && !this.pendingRewardId;
  }

  onVisibility(listener: (visible: boolean) => void): () => void {
    this.visibilityListeners.add(listener);
    return () => this.visibilityListeners.delete(listener);
  }

  request(type: NativeCommand, payload: Record<string, unknown> = {}, id = `${this.instanceId}-${++this.sequence}`): Promise<NativeResult> {
    const unavailable = { id, type: "result" as const, ok: false, status: "unavailable" };
    if (!this.available || !/^[A-Za-z0-9_.:-]{1,160}$/.test(id) || this.pending.has(id)) return Promise.resolve(unavailable);
    return new Promise(resolve => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        resolve({ ...unavailable, status: "timeout" });
      }, type === "rewarded" ? 300_000 : type === "reviewLaunch" ? 130_000 : 30_000);
      this.pending.set(id, { resolve, timer });
      try { this.port!.postMessage(JSON.stringify({ id, type, payload })); }
      catch {
        clearTimeout(timer);
        this.pending.delete(id);
        resolve({ ...unavailable, status: "error" });
      }
    });
  }

  async showRewardedAd(requestId: string): Promise<RewardedAdResult> {
    if (!this.rewardedAvailable || !/^[A-Za-z0-9_.:-]{1,160}$/.test(requestId) || this.rewardIds.has(requestId)) {
      return { requestId, status: "unavailable" };
    }
    this.rewardIds.add(requestId);
    this.pendingRewardId = requestId;
    try {
      const result = await this.request("rewarded", { placement: "game-reward" }, requestId);
      const status = result.ok && result.status === "rewarded" && result.rewarded === true
        ? "completed" : result.ok && result.status === "cancelled" ? "cancelled"
          : ["unavailable", "not-ready", "consent-pending", "consent-unavailable", "initializing", "initialization-failed", "loading", "load-failed", "busy"].includes(result.status) ? "unavailable" : "error";
      return { requestId, status };
    } finally { if (this.pendingRewardId === requestId) this.pendingRewardId = undefined; }
  }

  async showPrivacyOptions(): Promise<boolean> {
    if (!this.available || !this.currentState.privacyOptionsRequired) return false;
    const result = await this.request("privacyOptions");
    return result.ok;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.port?.onmessage === this.receive) this.port.onmessage = null;
    for (const [id, request] of this.pending) {
      clearTimeout(request.timer);
      request.resolve({ id, type: "result", ok: false, status: "unavailable" });
    }
    this.pending.clear();
    this.visibilityListeners.clear();
    this.currentState = { ...EMPTY_STATE };
  }
}

declare global {
  interface Window { SlideJamNative?: GooglePlayNativePort; }
}
