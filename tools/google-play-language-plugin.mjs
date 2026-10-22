import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

function replaceOnce(source, anchor, replacement, name) {
  if (source.split(anchor).length !== 2) throw new Error(`Review Google Play English startup mapping: ${name}`);
  return source.replace(anchor, replacement);
}

// The shared HTML/ES5 guard stay untouched for the other channels. Startup
// failures happen before the saved game language can be read, so use English.
export function projectGooglePlayStartupHtml(source) {
  let html = replaceOnce(source, '<html lang="zh-CN">', '<html lang="en">', "document-language");
  const replacements = [
    ['正在启动Slide Jam: Block Puzzle', 'Starting Slide Jam: Block Puzzle'],
    ['首次打开需要加载游戏资源，请稍候。', 'Loading game resources. Please wait.'],
    ['>重新打开</button>', '>Retry</button>'],
    ['<summary>问题详情</summary>', '<summary>Details</summary>'],
    ['请启用 JavaScript，或更新手机的 Android System WebView 后重试。', 'Enable JavaScript or update Android System WebView, then try again.'],
  ];
  for (const [before, after] of replacements) html = replaceOnce(html, before, after, before);
  return html;
}

export function projectGooglePlayStartupGuard(source) {
  let code = source;
  const replacements = [
    ['需要更新运行环境', 'Update required'],
    ['游戏启动未完成', 'The game could not start'],
    ['请更新手机的 Android System WebView（安卓系统网页组件）或浏览器，再重新打开游戏。', 'Update Android System WebView or your browser, then reopen the game.'],
    ['请重新打开游戏；若仍无法启动，请将下方问题详情发给开发者。', 'Reopen the game. If it still cannot start, send the details below to the developer.'],
    ['游戏脚本加载失败', 'Game script loading failed'],
    ['启动等待超过 30 秒', 'Startup timed out after 30 seconds'],
  ];
  for (const [before, after] of replacements) code = replaceOnce(code, before, after, before);
  return code;
}

export function projectGooglePlayStartupCanvas(source) {
  const start = source.indexOf("  private drawStartupStatus(): void {");
  const end = source.indexOf("  private drawStartupPhysicalProgress(", start);
  if (start < 0 || end <= start) throw new Error("Review Google Play startup fallback method boundary");
  let method = source.slice(start, end);
  method = replaceOnce(method, 'failed ? "资源加载失败" : "加载资源"',
    'failed ? this.tr("startup.loadFailed") : this.tr("common.loading")', "canvas-loading-fallback");
  const retry = 'this.label("点击重试",';
  if (method.split(retry).length !== 3) throw new Error("Review Google Play startup retry labels");
  method = method.replaceAll(retry, 'this.label(this.tr("startup.retryLoad"),');
  return source.slice(0, start) + method + source.slice(end);
}

export function googlePlayLanguagePlugin() {
  return {
    name: "google-play-default-english-startup",
    enforce: "pre",
    transform(source, id) {
      if (!id.replace(/\\/g, "/").split("?")[0].endsWith("/src/game/ColorEscapeGame.ts")) return;
      return { code: projectGooglePlayStartupCanvas(source), map: null };
    },
    // Run after branding has replaced the game title. The early, text-only
    // fallback must also use English when no JavaScript can run.
    transformIndexHtml: { order: "post", handler: projectGooglePlayStartupHtml },
    async writeBundle(options) {
      if (!options.dir) throw new Error("Google Play English startup requires a directory build");
      const guard = await readFile(new URL("../public/startup-guard.js", import.meta.url), "utf8");
      await writeFile(resolve(options.dir, "startup-guard.js"), projectGooglePlayStartupGuard(guard));
    },
  };
}
