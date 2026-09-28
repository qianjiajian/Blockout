import { ColorEscapeGame } from "/src/game/ColorEscapeGame.ts";
import { WebHost } from "/src/platform/WebHost.ts";
import { PuzzleModel } from "/src/core/PuzzleModel.ts";

// Offline artwork harness only: no candidate approval and no production save access.
class PreviewHost extends WebHost {
  data = new Map();
  storageRead(key) { return this.data.has(key) ? { status: "ok", value: structuredClone(this.data.get(key)) } : { status: "missing" }; }
  storageGet(key, fallback) { const r = this.storageRead(key); return r.status === "ok" ? r.value : fallback; }
  storageSet(key, value) { this.data.set(key, structuredClone(value)); return true; }
  music() {} sound() {} vibrate() {}
  onPointer() {} // The user requested pictures, not a playable/approved map.
}
const game = new ColorEscapeGame(new PreviewHost());
const loadBase = game.loadLevel.bind(game);
window.__OPENING_PREVIEW__ = {
  game,
  load(level) {
    if (level.mechanismRules !== "revised-2026-09-21-v1.2") throw new Error("Explicit runtime required");
    game.pendingSettlement = undefined;
    game.pendingSettlementAbandon = undefined;
    loadBase(level.id, true);
    game.model = new PuzzleModel(structuredClone(level));
    game.captureInitialGeneratorSpawns();
    game.save.sound = false; game.save.haptic = false; game.save.language = "zh-CN";
    game.updateToastVisible = false;
    game.lastFrame = 0; game.dirty = true; game.scheduleFrame();
  },
};
game.start();
