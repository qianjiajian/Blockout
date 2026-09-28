import { ColorEscapeGame } from "/src/game/ColorEscapeGame.ts";
import { WebHost } from "/src/platform/WebHost.ts";
import { PuzzleModel } from "/src/core/PuzzleModel.ts";
import { replayRevisedRoute } from "/src/core/revisedLevelSearch.ts";

// Vite-only harness: storage is isolated before the game constructor runs.
class MemoryHost extends WebHost {
  data = new Map();
  storageRead(key) { return this.data.has(key) ? { status: "ok", value: structuredClone(this.data.get(key)) } : { status: "missing" }; }
  storageGet(key, fallback) { const result = this.storageRead(key); return result.status === "ok" ? result.value : fallback; }
  storageSet(key, value) { this.data.set(key, structuredClone(value)); return true; }
  music() {} sound() {} vibrate() {}
}
const game = new ColorEscapeGame(new MemoryHost());
const baseLoad = game.loadLevel.bind(game);
let proposal;
function load(input = proposal) {
  if (!input || input.level.mechanismRules !== "revised-2026-09-21-v1.2") throw new Error("Explicit revised proposal required");
  proposal = structuredClone(input);
  game.pendingSettlement = undefined;
  game.pendingSettlementAbandon = undefined;
  baseLoad(proposal.levelId, true);
  game.model = new PuzzleModel(structuredClone(proposal.level));
  game.captureInitialGeneratorSpawns();
  game.save.sound = false;
  game.save.haptic = false;
  game.save.language = "zh-CN";
  game.updateToastVisible = false;
  game.lastFrame = 0;
  game.dirty = true;
  game.scheduleFrame();
  return game.getDebugState();
}
game.loadLevel = () => load();
window.__COLOR_ESCAPE__ = game;
window.__REVISED_CANDIDATE_ROUTE__ = {
  load,
  expected(drags) { return replayRevisedRoute(proposal.level, drags); },
  cancelMove() {
    for (const block of game.model.snapshot().blocks) {
      if (!game.model.isBlockActive(block) || game.model.possibleExitSides(block).length) continue;
      for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
        const copy = game.model.clone();
        copy.beginAction();
        if (!copy.moveBlockStep(block.id, block.x + dx, block.y + dy)) continue;
        const moved = copy.getBlock(block.id);
        if (copy.possibleExitSides(moved).length) continue;
        return { blockId: block.id, from: [block.x, block.y], to: [block.x + dx, block.y + dy], grab: block.shape[0] };
      }
    }
    return null;
  },
};
game.start();
