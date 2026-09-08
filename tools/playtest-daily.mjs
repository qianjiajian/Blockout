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
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(500);

const debug = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
let state = await debug();
if (state.daily.unlocked) throw new Error("Daily E2E: daily challenge unlocked before five clears");
await page.mouse.click(248, 933);
state = await debug();
if (state.screen !== "home") throw new Error("Daily E2E: locked daily challenge was enterable");

await page.evaluate(() => {
  localStorage.setItem("color-escape-save-v1", JSON.stringify({
    schemaVersion: 1,
    currentLevel: 1,
    highestLevel: 6,
    coins: 2000,
    sound: false,
    haptic: false,
    featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter"],
    boosters: { time: 3, rocket: 3, pulse: 3 },
    bestStars: { "1": 3 },
    bestMoves: { "1": 2 },
    rewardedLevels: [1],
    dailyStreak: 0,
    lastDailyCompletedDay: "",
  }));
});
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(500);
state = await debug();
if (!state.daily.unlocked || state.daily.selectedLevel !== 1 || state.daily.completedToday) {
  throw new Error("Daily E2E: unlocked daily state did not select the completed level");
}
await page.screenshot({ path: shot("round6-daily-home-ready.png") });

// Keep this lifecycle test independent from a particular authored opening.
// Level 1 is intentionally re-scrambled during difficulty iteration, so derive
// the current verified route and replay every move through real pointer input.
const levelOneSolution = await page.evaluate(async () => {
  const [{ LEVELS }, { solveLevelForValidation }] = await Promise.all([
    import("/src/core/levels.ts"),
    import("/src/core/levelSolver.ts"),
  ]);
  return solveLevelForValidation(LEVELS[0]);
});
if (!levelOneSolution.solved) throw new Error("Daily E2E: current level 1 has no validation route");

const solveLevelOne = async () => {
  for (const drag of levelOneSolution.drags) {
    const state = await debug();
    const block = state.puzzle.blocks.find((item) => item.id === drag.blockId);
    if (!block) throw new Error(`Daily E2E: route references missing ${drag.blockId}`);
    const [anchorX, anchorY] = block.shape[0];
    const point = (x, y) => ({
      x: state.board.innerX + (x + anchorX + 0.5) * state.board.cell,
      y: state.board.innerY + (y + anchorY + 0.5) * state.board.cell,
    });
    const start = point(block.x, block.y);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    for (const [x, y] of drag.path) {
      const target = point(x, y);
      await page.mouse.move(target.x, target.y, { steps: 2 });
    }
    if (drag.exitSide) {
      const held = await debug();
      const remaining = held.puzzle.blocks.find((item) => item.id === drag.blockId);
      const expectedLayers = Math.max(0, block.layers.length - 1);
      if (held.selectedId || held.activePointer !== undefined
        || (expectedLayers === 0 && remaining)
        || (expectedLayers > 0 && (!remaining || remaining.layers.length !== expectedLayers))) {
        throw new Error(`Daily E2E: ${drag.blockId} did not resolve while the pointer stayed down`);
      }
    }
    await page.mouse.up();
    await page.waitForTimeout(drag.exitSide ? 330 : 25);
  }
};

await page.mouse.click(248, 933);
state = await debug();
if (state.screen !== "playing" || !state.daily.mode || state.level.id !== 1) throw new Error("Daily E2E: daily challenge did not start");
await page.mouse.click(443, 140);
state = await debug();
if (state.screen !== "paused" || !state.daily.mode) throw new Error("Daily E2E: pause lost daily mode");
await page.mouse.click(176, 805);
state = await debug();
if (state.screen !== "playing" || !state.daily.mode || state.level.id !== 1) throw new Error("Daily E2E: pause restart lost daily mode");
await solveLevelOne();
await page.waitForTimeout(3700);
state = await debug();
if (state.screen !== "win" || !state.daily.completedToday || state.daily.streak !== 1 || state.daily.reward !== 80) {
  throw new Error("Daily E2E: first daily settlement is incorrect");
}
if (state.winAction !== "返回主页") throw new Error(`Daily E2E: incorrect result action: ${state.winAction}`);
if (state.economy.coins !== 2080) throw new Error(`Daily E2E: expected 2080 coins, got ${state.economy.coins}`);
await page.screenshot({ path: shot("round6-daily-result.png") });

await page.mouse.click(248, 754);
state = await debug();
if (state.screen !== "home" || state.daily.mode) throw new Error("Daily E2E: result did not return to the original home state");
await page.screenshot({ path: shot("round6-daily-home-complete.png") });

await page.mouse.click(248, 933);
await solveLevelOne();
await page.waitForTimeout(3700);
state = await debug();
if (state.economy.coins !== 2080 || state.daily.reward !== 0 || state.daily.streak !== 1) {
  throw new Error("Daily E2E: replay duplicated reward or streak");
}

// Failure paths must preserve the daily run on retry and return to the original home level on exit.
await page.mouse.click(248, 754);
await page.mouse.click(248, 933);
await page.evaluate(() => {
  const game = window.__COLOR_ESCAPE__;
  game.model.started = true;
  game.model.remainingSeconds = 0.001;
});
await page.waitForTimeout(120);
state = await debug();
if (state.screen !== "failed" || !state.daily.mode) throw new Error("Daily E2E: timeout did not preserve daily mode");
await page.mouse.click(248, 754);
state = await debug();
if (state.screen !== "playing" || !state.daily.mode || state.level.id !== 1) throw new Error("Daily E2E: failure retry lost daily mode");
await page.evaluate(() => {
  const game = window.__COLOR_ESCAPE__;
  game.model.started = true;
  game.model.remainingSeconds = 0.001;
});
await page.waitForTimeout(120);
await page.mouse.click(248, 833);
state = await debug();
if (state.screen !== "home" || state.daily.mode || state.level.id !== 1) throw new Error("Daily E2E: failure exit did not restore the original home level");

await page.close();

const safeUrl = new URL(playtestUrl);
safeUrl.searchParams.set("safeTop", "44");
safeUrl.searchParams.set("safeBottom", "34");
const safePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
safePage.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
safePage.on("pageerror", (error) => errors.push(error.message));
const safeDebug = () => safePage.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
await safePage.goto(safeUrl.href, { waitUntil: "networkidle" });
await safePage.evaluate(() => localStorage.clear());
await safePage.reload({ waitUntil: "networkidle" });
await safePage.waitForTimeout(500);
await safePage.screenshot({ path: shot("round6-safearea-home-daily-locked-44-34.png") });

const scale = Math.min(390 / 496, 844 / 1078);
const offsetX = (390 - 496 * scale) / 2;
const offsetY = (844 - 1078 * scale) / 2;
const logicalBottom = Math.min(54, 34 / scale);
const dailyClick = { x: offsetX + 248 * scale, y: offsetY + (933 - logicalBottom) * scale };
await safePage.mouse.click(dailyClick.x, dailyClick.y);
let safeState = await safeDebug();
if (safeState.screen !== "home") throw new Error("Daily safe-area E2E: locked daily click leaked into bottom navigation");

await safePage.evaluate(() => {
  localStorage.setItem("color-escape-save-v1", JSON.stringify({
    schemaVersion: 1,
    currentLevel: 1,
    highestLevel: 6,
    coins: 2000,
    sound: false,
    haptic: false,
    featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter"],
    boosters: { time: 3, rocket: 3, pulse: 3 },
    bestStars: { "1": 3 },
    bestMoves: { "1": 2 },
    rewardedLevels: [1],
    dailyStreak: 0,
    lastDailyCompletedDay: "",
  }));
});
await safePage.reload({ waitUntil: "networkidle" });
await safePage.waitForTimeout(500);
await safePage.screenshot({ path: shot("round6-safearea-home-daily-ready-44-34.png") });
await safePage.mouse.click(dailyClick.x, dailyClick.y);
safeState = await safeDebug();
if (safeState.screen !== "playing" || !safeState.daily.mode) throw new Error("Daily safe-area E2E: daily click was intercepted by navigation");

await safePage.evaluate(() => {
  const save = JSON.parse(localStorage.getItem("color-escape-save-v1"));
  const now = new Date();
  save.lastDailyCompletedDay = `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, "0")}-${`${now.getDate()}`.padStart(2, "0")}`;
  save.dailyStreak = 4;
  localStorage.setItem("color-escape-save-v1", JSON.stringify(save));
});
await safePage.goto(safeUrl.href, { waitUntil: "networkidle" });
await safePage.waitForTimeout(500);
await safePage.screenshot({ path: shot("round6-safearea-home-daily-complete-44-34.png") });
safeState = await safeDebug();
if (safeState.screen !== "home" || !safeState.daily.completedToday) throw new Error("Daily safe-area E2E: completed state did not restore");
await safePage.close();

await browser.close();
if (errors.length) throw new Error(`Browser errors:\n${errors.join("\n")}`);
console.log("Daily lock, deterministic selection, first reward, streak, return, and replay idempotency passed.");
