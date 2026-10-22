import { ColorEscapeGame } from "./game/ColorEscapeGame";
import { WebHost } from "./platform/WebHost";
import { IS_ANDROID_RELEASE_BUILD } from "./platform/buildTarget";

// A replaced entry module must not leave its old canvas, timers or mixer alive.
// This hook holds only a disposer; it never reads or rewrites the player's save.
window.__BLOCK_OUT_DISPOSE_WEB__?.();
if (window.__BLOCK_OUT_STARTUP__?.supported !== false) {
  const host = new WebHost();
  const game = new ColorEscapeGame(host);
  game.start();

  // Release exposes detached diagnostic snapshots, never mutable game methods.
  const diagnostics = IS_ANDROID_RELEASE_BUILD
    ? Object.freeze({ getDebugState: () => JSON.parse(JSON.stringify(game.getDebugState())) as Record<string, unknown> })
    : game;
  window.__COLOR_ESCAPE__ = diagnostics;
  // The game's first scheduled frame runs before this callback. Keep the plain
  // HTML fallback visible if that frame throws before it can draw anything.
  host.requestFrame(() => window.__BLOCK_OUT_STARTUP__?.ready());
  const dispose = () => {
    host.dispose();
    if (window.__COLOR_ESCAPE__ === diagnostics) delete window.__COLOR_ESCAPE__;
    if (window.__BLOCK_OUT_DISPOSE_WEB__ === dispose) delete window.__BLOCK_OUT_DISPOSE_WEB__;
  };
  window.__BLOCK_OUT_DISPOSE_WEB__ = dispose;
  import.meta.hot?.dispose(dispose);
}

declare global {
  interface Window {
    __COLOR_ESCAPE__?: Pick<ColorEscapeGame, "getDebugState">;
    __BLOCK_OUT_DISPOSE_WEB__?: () => void;
    __BLOCK_OUT_STARTUP__?: { supported: boolean; ready(): void };
  }
}

