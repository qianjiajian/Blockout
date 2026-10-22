import { ColorEscapeGame } from "../game/ColorEscapeGame";
import { IS_ANDROID_RELEASE_BUILD } from "../platform/buildTarget";
import { installGooglePlayPrivacy } from "./privacy";
import type { GooglePlayPrivacyStateProvider } from "./privacy";
import { GooglePlayHost } from "./GooglePlayHost";

window.__BLOCK_OUT_DISPOSE_WEB__?.();
if (window.__BLOCK_OUT_STARTUP__?.supported !== false) {
  const host = new GooglePlayHost();
  const game = new ColorEscapeGame(host);
  game.start();

  const diagnostics = IS_ANDROID_RELEASE_BUILD
    ? Object.freeze({ getDebugState: () => JSON.parse(JSON.stringify(game.getDebugState())) as Record<string, unknown> })
    : game;
  window.__COLOR_ESCAPE__ = diagnostics;
  // The GP-only build projection adds this small accessor. Keep the expensive
  // diagnostic snapshot behind the explicit diagnostic bridge above.
  const presentation = game as ColorEscapeGame & GooglePlayPrivacyStateProvider;
  const disposePrivacy = installGooglePlayPrivacy(host.canvas, () => presentation.getGooglePlayPrivacyState(), host);
  // The Google Play startup projection reveals the canvas after its first
  // formal loading-art frame, rather than exposing the temporary flat fallback.
  const dispose = () => {
    disposePrivacy();
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
