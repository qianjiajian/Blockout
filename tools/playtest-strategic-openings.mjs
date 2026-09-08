import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/strategy-openings/", import.meta.url));
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });

const save = {
  schemaVersion: 1,
  currentLevel: 37,
  highestLevel: 100,
  coins: 1000,
  sound: false,
  haptic: false,
  reducedMotion: false,
  featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter", "generator", "elevator", "conveyor", "star"],
  boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: {},
  bestMoves: {},
  rewardedLevels: [],
  dailyStreak: 0,
  lastDailyCompletedDay: "",
};

const browser = await chromium.launch({ headless: true });
const errors = [];
const attachErrors = (page) => {
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
};
const screenPoint = (page, logical) => {
  const viewport = page.viewportSize();
  const scale = Math.min(viewport.width / 496, viewport.height / 1078);
  return {
    x: (viewport.width - 496 * scale) / 2 + logical.x * scale,
    y: (viewport.height - 1078 * scale) / 2 + logical.y * scale,
  };
};
const cellPoint = (board, x, y) => ({
  x: board.innerX + (x + 0.5) * board.cell,
  y: board.innerY + (y + 0.5) * board.cell,
});
const seed = async (page) => {
  await page.goto(playtestUrl, { waitUntil: "networkidle" });
  await page.evaluate((value) => localStorage.setItem("color-escape-save-v1", JSON.stringify(value)), save);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(180);
};
const openLevel = async (page, levelId) => {
  await page.evaluate((id) => window.__COLOR_ESCAPE__.loadLevel(id, true), levelId);
  await page.waitForTimeout(140);
  const state = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
  if (state.screen !== "playing" || state.level.id !== levelId || !state.art.ready || !state.art.plainBlocksReady) {
    throw new Error(`Strategy-opening E2E: Lv${levelId} did not reach a fully rendered play state`);
  }
  if ((state.level.blocked ?? []).length) throw new Error(`Strategy-opening E2E: Lv${levelId} restored fixed interior cells`);
  return state;
};
const performDrag = async (page, drag) => {
  const state = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
  const block = state.puzzle.blocks.find((candidate) => candidate.id === drag.blockId);
  if (!block) throw new Error(`Strategy-opening E2E: missing ${drag.blockId}`);
  const [anchorX, anchorY] = block.shape[0];
  const start = screenPoint(page, cellPoint(state.board, block.x + anchorX, block.y + anchorY));
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (const [x, y] of drag.path) {
    const target = screenPoint(page, cellPoint(state.board, x + anchorX, y + anchorY));
    await page.mouse.move(target.x, target.y, { steps: 3 });
  }
  if (drag.exitSide) {
    const held = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
    const remaining = held.puzzle.blocks.find((candidate) => candidate.id === drag.blockId);
    const expectedLayers = Math.max(0, block.layers.length - 1);
    if (held.selectedId || held.activePointer !== undefined
      || (expectedLayers === 0 && remaining)
      || (expectedLayers > 0 && (!remaining || remaining.layers.length !== expectedLayers))) {
      throw new Error(`Strategy-opening E2E: ${drag.blockId} did not resolve while the pointer stayed down`);
    }
  }
  await page.mouse.up();
  await page.waitForTimeout(drag.exitSide ? 340 : 80);
};

const page = await browser.newPage({ viewport: { width: 496, height: 1078 } });
attachErrors(page);
await seed(page);
for (const levelId of [37, 38, 39, 43, 49, 54, 58, 66, 68, 74, 78, 84, 88, 94, 98, 99]) {
  await openLevel(page, levelId);
  await page.screenshot({ path: resolve(output, `level-${String(levelId).padStart(3, "0")}.png`) });
}

// Rebuild the current verified Lv37 route so this interaction test remains valid
// when its colors, shapes, or exact coordinates are re-authored.
const strategyPlan = await page.evaluate(async () => {
  const [{ getLevel }, { solveLevelForValidation }] = await Promise.all([
    import("/src/core/levels.ts"),
    import("/src/core/levelSolver.ts"),
  ]);
  const solution = solveLevelForValidation(getLevel(37));
  const firstExitIndex = solution.drags.findIndex((drag) => Boolean(drag.exitSide));
  if (!solution.solved || firstExitIndex <= 0) {
    throw new Error("Strategy-opening E2E: Lv37 no longer requires a setup drag before its first clear");
  }
  return { drags: solution.drags.slice(0, firstExitIndex + 1), firstExitIndex };
});

let state = await openLevel(page, 37);
const layerLoad = (puzzle) => puzzle.blocks.reduce((sum, block) => sum + block.layers.length, 0);
const initialLoad = layerLoad(state.puzzle);
const setup = strategyPlan.drags[0];
const setupBefore = state.puzzle.blocks.find((block) => block.id === setup.blockId);
if (!setupBefore) throw new Error(`Strategy-opening E2E: missing setup block ${setup.blockId}`);
await performDrag(page, setup);
state = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const setupAfter = state.puzzle.blocks.find((block) => block.id === setup.blockId);
if (!setupAfter || layerLoad(state.puzzle) !== initialLoad || state.puzzle.moves !== 1
  || (setupAfter.x === setupBefore.x && setupAfter.y === setupBefore.y)) {
  throw new Error("Strategy-opening E2E: Lv37 setup drag did not preserve and reposition its block");
}
await page.screenshot({ path: resolve(output, "level-037-reserved-route.png") });
for (const drag of strategyPlan.drags.slice(1)) await performDrag(page, drag);
state = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
if (layerLoad(state.puzzle) >= initialLoad || state.puzzle.moves !== strategyPlan.drags.length) {
  throw new Error("Strategy-opening E2E: verified setup route did not produce its first clear through pointer input");
}
await page.screenshot({ path: resolve(output, "level-037-first-clear.png") });
await page.close();

const small = await browser.newPage({ viewport: { width: 320, height: 568 } });
attachErrors(small);
await seed(small);
for (const levelId of [38, 39, 58, 78, 88, 98, 99]) {
  await openLevel(small, levelId);
  await small.screenshot({ path: resolve(output, `level-${String(levelId).padStart(3, "0")}-320x568.png`) });
}
await small.close();

await browser.close();
if (errors.length) throw new Error(`Strategy-opening browser errors:\n${errors.join("\n")}`);
console.log("Strategic openings passed: constrained shared-space layouts, blocked-vs-open routes, real Pointer exits, ImageGen art, and 320x568 screenshots.");
