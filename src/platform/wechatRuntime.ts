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
  api.onShow(() => {
    if (launched) return;
    launched = true;
    launch();
  });
};
