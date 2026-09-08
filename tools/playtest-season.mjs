import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/", import.meta.url));
const shot = (name) => resolve(output, name);
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 496, height: 1078 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));

await page.goto(playtestUrl, { waitUntil: "networkidle" });
// This test owns progression/reward behavior, not optimal-route proof. Seed the
// first 99 star records so the dense validation route can exercise unlock and
// final achievement flow without re-running the 69-second Lv99 optimum audit.
const initialStars = Object.fromEntries(Array.from({ length: 99 }, (_, index) => [String(index + 1), 3]));
const initialMoves = Object.fromEntries(Array.from({ length: 99 }, (_, index) => [String(index + 1), 2 + index % 6]));
await page.evaluate(({ initialStars, initialMoves }) => {
  localStorage.setItem("color-escape-save-v1", JSON.stringify({
    schemaVersion: 1,
    currentLevel: 99,
    highestLevel: 99,
    coins: 5000,
    sound: false,
    haptic: false,
    reducedMotion: true,
    featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter", "generator", "elevator", "conveyor", "star"],
    boosters: { time: 3, rocket: 3, pulse: 3 },
    bestStars: initialStars,
    bestMoves: initialMoves,
    rewardedLevels: Array.from({ length: 98 }, (_, index) => index + 1),
  }));
}, { initialStars, initialMoves });
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(400);

const solutions = await page.evaluate(async () => {
  const [{ getLevel }, { solveLevelForValidation }] = await Promise.all([
    import("/src/core/levels.ts"),
    import("/src/core/levelSolver.ts"),
  ]);
  return {
    99: solveLevelForValidation(getLevel(99)).drags,
    100: solveLevelForValidation(getLevel(100)).drags,
  };
});
const debug = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const point = (board, x, y, anchorX, anchorY) => ({
  x: board.innerX + (x + anchorX + 0.5) * board.cell,
  y: board.innerY + (y + anchorY + 0.5) * board.cell,
});

const waitForInput = async () => {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const state = await debug();
    if (state.exitGhosts === 0 && state.pendingCelebration <= 0 && !state.dragMotion) return;
    await page.waitForTimeout(20);
  }
  throw new Error("Season E2E: input lock did not clear");
};

const performDrag = async (drag) => {
  await waitForInput();
  const state = await debug();
  const block = state.puzzle.blocks.find((candidate) => candidate.id === drag.blockId);
  if (!block) throw new Error(`Season E2E: missing block ${drag.blockId}`);
  const [anchorX, anchorY] = block.shape[0];
  const start = point(state.board, block.x, block.y, anchorX, anchorY);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (const [x, y] of drag.path) {
    const target = point(state.board, x, y, anchorX, anchorY);
    await page.mouse.move(target.x, target.y, { steps: 2 });
  }
  if (drag.exitSide) {
    const held = await debug();
    const remaining = held.puzzle.blocks.find((candidate) => candidate.id === drag.blockId);
    const expectedLayers = Math.max(0, block.layers.length - 1);
    if (held.selectedId || held.activePointer !== undefined
      || (expectedLayers === 0 && remaining)
      || (expectedLayers > 0 && (!remaining || remaining.layers.length !== expectedLayers))) {
      throw new Error(`Season E2E: ${drag.blockId} did not resolve while the pointer stayed down`);
    }
  }
  await page.mouse.up();
  await page.waitForTimeout(150);
};

const solve = async (levelId) => {
  if (levelId === 100) {
    // The full-season test separately proves Lv100 with a live Web-Worker
    // planner while its elevator and timer advance. This progression fixture
    // freezes wall-clock devices so it can deterministically test settlement.
    await page.evaluate(() => { window.__COLOR_ESCAPE__.model.tick = () => {}; });
  }
  for (const drag of solutions[levelId]) await performDrag(drag);
};

// Level 100 is visible on page five, but remains locked before level 99 clears.
await page.mouse.click(347, 1008);
await page.waitForTimeout(260);
let state = await debug();
if (state.screen !== "levels" || state.levelPage !== 9) throw new Error("Season E2E: final journey segment did not open");
await page.mouse.click(311, 215);
state = await debug();
if (state.screen !== "levels" || state.level.id !== 99) throw new Error("Season E2E: locked level 100 was enterable");
await page.mouse.click(248, 1008);
await page.waitForTimeout(260);
await page.mouse.click(248, 852);
await solve(99);
await page.waitForTimeout(1500);
state = await debug();
if (state.screen !== "win" || state.progression.highestLevel !== 100) throw new Error("Season E2E: level 99 did not unlock level 100");
if (state.progression.bestStars["99"] !== 3 || state.economy.coins !== 5240) throw new Error("Season E2E: level 99 settlement is incorrect");
if (state.winAction !== "下一关") throw new Error(`Season E2E: incorrect level-99 result action: ${state.winAction}`);

await page.mouse.click(248, 754);
state = await debug();
if (state.screen !== "playing" || state.level.id !== 100 || state.activeRun?.levelId !== 100) {
  throw new Error("Season E2E: next-level button did not begin level 100 directly");
}
await solve(100);
await page.waitForTimeout(1500);
state = await debug();
const totalStars = Object.values(state.progression.bestStars).reduce((sum, value) => sum + value, 0);
if (state.screen !== "win" || totalStars !== 300) throw new Error(`Season E2E: expected 300 stars, got ${totalStars}`);
if (!state.economy.rewardedLevels.includes(100) || state.economy.coins !== 5740) throw new Error("Season E2E: final reward or badge prerequisite missing");
if (state.winAction !== "赛季完成") throw new Error(`Season E2E: incorrect final result action: ${state.winAction}`);
await page.screenshot({ path: shot("round35-season-300-stars.png") });

await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(300);
await page.mouse.click(446, 1008);
await page.waitForTimeout(260);
state = await debug();
if (state.screen !== "records") throw new Error("Season E2E: achievement archive did not open after final clear");
await page.screenshot({ path: shot("round35-season-all-achievements.png") });

await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(100, true));
await solve(100);
await page.waitForTimeout(1500);
state = await debug();
if (state.economy.coins !== 5740) throw new Error("Season E2E: replaying level 100 duplicated its first-clear reward");

await page.close();
await browser.close();
if (errors.length) throw new Error(`Browser errors:\n${errors.join("\n")}`);
console.log("Season lock, 99→100 unlock, 300 stars, final badge, and replay idempotency passed.");
