// The browser build keeps developer-only controls for local QA. The WeChat
// bundler replaces this module with the production target before minification.
// Android uses the same WebView entry as the browser, with a small APK-only UI
// variation selected by VITE_BUILD_TARGET=android during the asset build.
export type BuildTarget = "web" | "wechat" | "android";
const configuredTarget = import.meta.env.VITE_BUILD_TARGET;
export const BUILD_TARGET = (configuredTarget === "android" ? "android" : "web") as BuildTarget;
export const IS_WECHAT_BUILD = BUILD_TARGET === "wechat";
export const IS_ANDROID_BUILD = BUILD_TARGET === "android";
export const IS_ANDROID_RELEASE_BUILD = IS_ANDROID_BUILD && import.meta.env.VITE_ANDROID_RELEASE === "true";
export const HIDE_DEVELOPER_CONTROLS = IS_WECHAT_BUILD || IS_ANDROID_RELEASE_BUILD;
