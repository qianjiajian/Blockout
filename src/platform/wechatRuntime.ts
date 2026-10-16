export interface WechatWindowInfo {
  screenWidth: number;
  screenHeight: number;
  pixelRatio?: number;
  safeArea?: {
    top?: number;
    bottom?: number;
  };
  language?: unknown;
}

interface WechatWindowApi {
  getWindowInfo?: () => WechatWindowInfo;
}

interface WechatLifecycleApi {
  onShow?: (callback: () => void) => void;
}

/** Uses the split system API on current clients without invoking the deprecated bridge call. */
export const readWechatWindowInfo = (api: WechatWindowApi): WechatWindowInfo => {
  const info = api.getWindowInfo?.();
  if (!info || !Number.isFinite(info.screenWidth) || !Number.isFinite(info.screenHeight)) {
    throw new Error("WeChat window information is unavailable");
  }
  return info;
};

/**
 * Entry scripts can run before the native JSBridge is ready. The first show
 * lifecycle event is the earliest point at which bridge-backed APIs are safe.
 */
export const launchWechatGameWhenReady = (
  api: WechatLifecycleApi,
  launch: () => void,
): void => {
  if (typeof api.onShow !== "function") {
    throw new Error("WeChat lifecycle API is unavailable");
  }
  let launched = false;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let retries = 0;
  // DevTools Nightly can dispatch the first onShow before its WAGame bridge
  // has finished wiring the window/system APIs. A short retry alone still
  // leaves a red native jsbridge error in the console, so do not construct
  // WechatHost until the bridge has had a full startup window.
  const initialDelayMs = 500;
  const retryDelayMs = 250;
  const retryLimit = 40;
  const bridgeNotReady = (error: unknown): boolean => /jsbridge not ready|window information is unavailable/i.test(String(error));
  const attempt = (): void => {
    retryTimer = undefined;
    if (launched) return;
    try {
      launch();
      launched = true;
    } catch (error) {
      if (!bridgeNotReady(error) || retries >= retryLimit) throw error;
      retries += 1;
      retryTimer = setTimeout(attempt, retryDelayMs);
    }
  };
  api.onShow(() => {
    if (launched || retryTimer) return;
    // DevTools can deliver onShow before its native bridge is ready. Avoid
    // the known first-call error, then keep the bounded retry for slower
    // devices.
    retryTimer = setTimeout(attempt, initialDelayMs);
  });
};
