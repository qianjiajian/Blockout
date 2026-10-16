import { ColorEscapeGame } from "./game/ColorEscapeGame";
import { WebHost } from "./platform/WebHost";

// A replaced entry module must not leave its old canvas, timers or mixer alive.
// This hook holds only a disposer; it never reads or rewrites the player's save.
window.__BLOCK_OUT_DISPOSE_WEB__?.();
if (window.__BLOCK_OUT_STARTUP__?.supported !== false) {
  const host = new WebHost();
  const game = new ColorEscapeGame(host);
  game.start();

  window.__COLOR_ESCAPE__ = game;
  // The game's first scheduled frame runs before this callback. Keep the plain
  // HTML fallback visible if that frame throws before it can draw anything.
  host.requestFrame(() => window.__BLOCK_OUT_STARTUP__?.ready());
  const dispose = () => {
    host.dispose();
    if (window.__COLOR_ESCAPE__ === game) delete window.__COLOR_ESCAPE__;
    if (window.__BLOCK_OUT_DISPOSE_WEB__ === dispose) delete window.__BLOCK_OUT_DISPOSE_WEB__;
  };
  window.__BLOCK_OUT_DISPOSE_WEB__ = dispose;
  import.meta.hot?.dispose(dispose);
}

declare global {
  interface Window {
    __COLOR_ESCAPE__?: ColorEscapeGame;
    __BLOCK_OUT_DISPOSE_WEB__?: () => void;
    __BLOCK_OUT_STARTUP__?: { supported: boolean; ready(): void };
  }
}

