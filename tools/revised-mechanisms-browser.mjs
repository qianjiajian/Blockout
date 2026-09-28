import { ColorEscapeGame } from "/src/game/ColorEscapeGame.ts";
import { WebHost } from "/src/platform/WebHost.ts";
import { PuzzleModel } from "/src/core/PuzzleModel.ts";
import { revisedMechanismScenes } from "/tools/revised-mechanism-fixtures.mjs";

// This module is served only by Vite's source server and is not a production
// entrypoint. Every storage operation, including startup and settlements, is
// isolated before the game constructor runs.
class MemoryHost extends WebHost {
  data = new Map();
  storageRead(key) { return this.data.has(key) ? { status: "ok", value: structuredClone(this.data.get(key)) } : { status: "missing" }; }
  storageGet(key, fallback) { const result = this.storageRead(key); return result.status === "ok" ? result.value : fallback; }
  storageSet(key, value) { this.data.set(key, structuredClone(value)); return true; }
  music() {}
  sound() {}
  vibrate() {}
}
const game = new ColorEscapeGame(new MemoryHost());
const baseLoad = game.loadLevel.bind(game);
const selector = document.querySelector("#scene");
for (const scene of revisedMechanismScenes) selector.add(new Option(scene.title, scene.key));
const initial = new URLSearchParams(location.search).get("scene");
if (revisedMechanismScenes.some(({ key }) => key === initial)) selector.value = initial;
const loadScene = (key = selector.value) => {
  const scene = revisedMechanismScenes.find((item) => item.key === key);
  if (!scene) throw new Error(`Unknown mechanism scene ${key}`);
  selector.value = key;
  game.pendingSettlement = undefined;
  game.pendingSettlementAbandon = undefined;
  baseLoad(21, true);
  game.model = new PuzzleModel(structuredClone(scene.level));
  game.captureInitialGeneratorSpawns();
  game.save.sound = false;
  game.save.haptic = false;
  game.save.language = "zh-CN";
  game.updateToastVisible = false;
  game.lastFrame = 0;
  game.dirty = true;
  game.scheduleFrame();
  document.querySelector("#instructions").textContent = scene.instructions;
  document.querySelector("#status").textContent = "隔离机制小关 · 不计入关卡难度或正式验收";
  return game.getDebugState();
};
// Retry/home/next inside the Canvas cannot escape into the formal campaign.
game.loadLevel = () => loadScene();
window.__COLOR_ESCAPE__ = game;
window.__REVISED_MECHANISM_SANDBOX__ = { loadScene, scenes: revisedMechanismScenes.map(({ key, title }) => ({ key, title })) };
selector.addEventListener("change", () => loadScene());
document.querySelector("#reset").addEventListener("click", () => loadScene());
game.start();
const ready = setInterval(() => {
  if (!game.getDebugState().art.ready) return;
  clearInterval(ready);
  loadScene();
}, 40);
