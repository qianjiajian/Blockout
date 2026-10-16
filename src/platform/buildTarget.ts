// The browser build keeps developer-only controls for local QA. The WeChat
// bundler replaces this module with the production target before minification.
export type BuildTarget = "web" | "wechat";
export const BUILD_TARGET = "web" as BuildTarget;
export const IS_WECHAT_BUILD = BUILD_TARGET === "wechat";
