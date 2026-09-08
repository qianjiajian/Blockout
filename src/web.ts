import { ColorEscapeGame } from "./game/ColorEscapeGame";
import { WebHost } from "./platform/WebHost";

const game = new ColorEscapeGame(new WebHost());
game.start();

declare global {
  interface Window { __COLOR_ESCAPE__?: ColorEscapeGame; }
}

window.__COLOR_ESCAPE__ = game;

