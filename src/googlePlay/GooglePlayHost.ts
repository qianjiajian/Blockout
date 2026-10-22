import type { RewardedAdResult } from "../platform/Host";
import { WebHost } from "../platform/WebHost";
import { GooglePlayNativeBridge } from "./nativeBridge";
import { GooglePlayLifecycle, type GooglePlayLifecycleEvent } from "./lifecycle";
import { GooglePlayReviews } from "./reviews";

export class GooglePlayHost extends WebHost {
  readonly nativeBridge: GooglePlayNativeBridge;
  readonly reviews: GooglePlayReviews;
  private readonly playHideListeners: Array<() => void> = [];
  private readonly playShowListeners: Array<() => void> = [];
  private playVisible = true;
  private playDisposed = false;
  private mainReadySent = false;
  private readonly lifecycle = new GooglePlayLifecycle((type, payload) => {
    if (!this.playDisposed) void this.nativeBridge.request(type, payload);
  });

  constructor() {
    super();
    this.nativeBridge = new GooglePlayNativeBridge(window.SlideJamNative);
    this.reviews = new GooglePlayReviews(command => this.nativeBridge.request(command), () => this.isVisible());
    this.playVisible = this.isVisible();
    const update = (): void => {
      const visible = this.isVisible();
      if (this.playDisposed || visible === this.playVisible) return;
      this.playVisible = visible;
      (visible ? this.playShowListeners : this.playHideListeners).forEach(callback => callback());
      if (visible) void this.nativeBridge.request("status");
    };
    super.onHide(update);
    super.onShow(update);
    this.nativeBridge.onVisibility(update);
    void this.nativeBridge.request("status");
    // Native owns cold-start counting and may only use already available ads.
    // This never delays game construction waiting for a network response.
    void this.nativeBridge.request("startup");
  }

  // Google Play starts in English regardless of the device locale. The game
  // still restores a saved language and persists later player selections.
  override preferredLocales(): readonly string[] { return ["en"]; }
  override resolveLeaderboardProvince(): Promise<undefined> { return Promise.resolve(undefined); }
  override isVisible(): boolean { return super.isVisible() && this.nativeBridge?.visible !== false; }
  override onHide(callback: () => void): void { this.playHideListeners.push(callback); }
  override onShow(callback: () => void): void { this.playShowListeners.push(callback); }
  isRewardedAdAvailable(): boolean { return this.isVisible() && this.nativeBridge.rewardedAvailable; }
  showRewardedAd(requestId: string): Promise<RewardedAdResult> {
    if (!this.isVisible()) return Promise.resolve({ requestId, status: "unavailable" });
    return this.nativeBridge.showRewardedAd(requestId);
  }
  gameReady(): void {
    if (this.playDisposed || this.mainReadySent) return;
    this.mainReadySent = true;
    void this.nativeBridge.request("gameReady");
  }
  onGooglePlayLifecycle(event: GooglePlayLifecycleEvent): void {
    if (!this.playDisposed) { this.lifecycle.observe(event); this.reviews.observe(event); }
  }
  isPrivacyOptionsAvailable(): boolean { return this.nativeBridge.available && this.nativeBridge.state.privacyOptionsRequired; }
  showPrivacyOptions(): Promise<boolean> { return this.nativeBridge.showPrivacyOptions(); }

  override dispose(): void {
    if (this.playDisposed) return;
    this.playDisposed = true;
    this.reviews.dispose();
    this.nativeBridge?.dispose();
    this.playHideListeners.length = 0;
    this.playShowListeners.length = 0;
    super.dispose();
  }
}
