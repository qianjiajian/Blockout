import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/", import.meta.url));
const shot = (name) => resolve(output, name);
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const errors = [];
const save = (currentLevel = 1, dailyReady = false) => ({
  schemaVersion: 1,
  currentLevel,
  highestLevel: dailyReady ? 6 : Math.max(4, currentLevel),
  coins: 2000,
  sound: false,
  haptic: false,
  reducedMotion: true,
  featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter"],
  boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: dailyReady ? { "1": 3 } : {},
  bestMoves: dailyReady ? { "1": 2 } : {},
  rewardedLevels: dailyReady ? [1] : [],
  dailyStreak: 0,
  lastDailyCompletedDay: "",
});

const attachErrors = (page) => {
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
};

const openWithSave = async (page, value) => {
  await page.goto(playtestUrl, { waitUntil: "networkidle" });
  await page.evaluate((nextSave) => localStorage.setItem("color-escape-save-v1", JSON.stringify(nextSave)), value);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(120);
};

const runFinalTimerTick = async (page) => {
  await page.evaluate(() => { window.__COLOR_ESCAPE__.model.remainingSeconds = 0.001; });
  await page.waitForTimeout(120);
};

const viewportMapper = (width, height) => {
  const scale = Math.min(width / 496, height / 1078);
  const offsetX = (width - 496 * scale) / 2;
  const offsetY = (height - 1078 * scale) / 2;
  return {
    click: (page, x, y) => page.mouse.click(offsetX + x * scale, offsetY + y * scale),
    point: (x, y) => ({ x: offsetX + x * scale, y: offsetY + y * scale }),
  };
};

const standard = await browser.newPage({ viewport: { width: 496, height: 1078 } });
attachErrors(standard);
const normalMap = viewportMapper(496, 1078);
const normalState = () => standard.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
await openWithSave(standard, save());
await standard.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(1, true));
await standard.waitForTimeout(20);
let state = await normalState();
const initialBlockCount = state.puzzle.blocks.length;
const levelOneSolution = await standard.evaluate(async () => {
  const [{ getLevel }, { solveLevelForValidation }] = await Promise.all([
    import("/src/core/levels.ts"),
    import("/src/core/levelSolver.ts"),
  ]);
  return solveLevelForValidation(getLevel(1));
});
if (!levelOneSolution.solved) throw new Error("Timeout E2E: current level 1 has no verified route");

const performDrag = async (targetPage, mapper, drag) => {
  const live = await targetPage.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
  const block = live.puzzle.blocks.find((candidate) => candidate.id === drag.blockId);
  if (!block) throw new Error(`Timeout E2E: missing route block ${drag.blockId}`);
  const [anchorX, anchorY] = block.shape[0];
  const logical = (x, y) => ({
    x: live.board.innerX + (x + anchorX + 0.5) * live.board.cell,
    y: live.board.innerY + (y + anchorY + 0.5) * live.board.cell,
  });
  const startLogical = logical(block.x, block.y);
  const start = mapper.point(startLogical.x, startLogical.y);
  await targetPage.mouse.move(start.x, start.y);
  await targetPage.mouse.down();
  for (const [x, y] of drag.path) {
    const targetLogical = logical(x, y);
    const target = mapper.point(targetLogical.x, targetLogical.y);
    await targetPage.mouse.move(target.x, target.y, { steps: 3 });
  }
  if (drag.exitSide) {
    const held = await targetPage.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
    const remaining = held.puzzle.blocks.find((candidate) => candidate.id === drag.blockId);
    const expectedLayers = Math.max(0, block.layers.length - 1);
    if (held.selectedId || held.activePointer !== undefined
      || (expectedLayers === 0 && remaining)
      || (expectedLayers > 0 && (!remaining || remaining.layers.length !== expectedLayers))) {
      throw new Error(`Timeout E2E: ${drag.blockId} did not resolve while the pointer stayed down`);
    }
  }
  await targetPage.mouse.up();
  await targetPage.waitForTimeout(drag.exitSide ? 180 : 25);
};
const performUntilOneBlock = async (targetPage, mapper) => {
  for (const drag of levelOneSolution.drags) {
    const live = await targetPage.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
    if (live.puzzle.blocks.length <= 1) return;
    await performDrag(targetPage, mapper, drag);
  }
  throw new Error("Timeout E2E: verified route did not reach a one-block-left state");
};
const performOpeningMove = (targetPage, mapper) => performDrag(targetPage, mapper, levelOneSolution.drags[0]);

await performUntilOneBlock(standard, normalMap);
state = await normalState();
if (!state.puzzle.started || state.puzzle.blocks.length !== 1) {
  throw new Error("Timeout E2E: real pointer setup did not start the clock with one block remaining");
}
await normalMap.click(standard, 132, 990);
state = await normalState();
if (state.economy.boosters.time !== 2 || state.activeRun?.boosterSpent.time !== 1) {
  throw new Error(`Timeout E2E: pre-timeout booster spend was not journaled (${JSON.stringify({
    time: state.economy.boosters.time,
    spent: state.activeRun?.boosterSpent.time,
    ghosts: state.exitGhosts,
    screen: state.screen,
    feedback: state.boosterFeedback,
  })})`);
}
await runFinalTimerTick(standard);
state = await normalState();
if (state.screen !== "failed" || state.puzzle.blocks.length !== 1 || state.puzzle.remainingSeconds !== 0) {
  throw new Error(`Timeout E2E: final timer tick did not reach the normal failure state (${state.screen})`);
}
if (state.selectedId || state.activePointer != null || state.boosterTarget || state.boosterFeedback || state.hudFeedback
  || state.particles !== 0 || state.exitGhosts !== 0 || state.exitPulses.length !== 0
  || state.mechanicPulses.length !== 0 || state.boardShakeTime !== 0) {
  throw new Error("Timeout E2E: failure transition left stale input or effects behind");
}
if (state.failureActions?.primary !== "重新挑战" || state.failureActions?.secondary !== "返回主页") {
  throw new Error("Timeout E2E: failure actions are unclear");
}
await standard.screenshot({ path: shot("round23-timeout-one-block-left.png") });

await normalMap.click(standard, 248, 754);
state = await normalState();
if (state.screen !== "playing" || state.puzzle.started || state.puzzle.moves !== 0 || state.puzzle.blocks.length !== initialBlockCount
  || state.economy.boosters.time !== 2 || state.activeRun?.boosterSpent.time !== 0) {
  throw new Error("Timeout E2E: retry did not create a clean run while settling the prior spend");
}
await performOpeningMove(standard, normalMap);
await runFinalTimerTick(standard);
state = await normalState();
if (state.screen !== "failed") throw new Error("Timeout E2E: retry did not fail through the real timer");
await normalMap.click(standard, 248, 833);
state = await normalState();
if (state.screen !== "home" || state.level.id !== 1 || state.activeRun || state.economy.boosters.time !== 2) {
  throw new Error("Timeout E2E: normal failure exit did not settle to its home state");
}
await standard.close();

// Daily retry retains daily mode; exit restores the pre-daily ordinary level.
const daily = await browser.newPage({ viewport: { width: 496, height: 1078 } });
attachErrors(daily);
const dailyState = () => daily.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
await openWithSave(daily, save(3, true));
await normalMap.click(daily, 248, 933);
await daily.waitForTimeout(20);
state = await dailyState();
if (!state.daily.mode || state.level.id !== 1 || state.activeRun?.returnLevelId !== 3) {
  throw new Error("Timeout E2E: daily setup did not preserve its ordinary origin");
}
await performUntilOneBlock(daily, normalMap);
await runFinalTimerTick(daily);
state = await dailyState();
if (state.screen !== "failed" || !state.daily.mode || state.puzzle.blocks.length !== 1) {
  throw new Error("Timeout E2E: daily timeout state is incorrect");
}
await daily.screenshot({ path: shot("round23-daily-timeout.png") });
await normalMap.click(daily, 248, 754);
state = await dailyState();
if (state.screen !== "playing" || !state.daily.mode || state.level.id !== 1 || state.puzzle.started) {
  throw new Error("Timeout E2E: daily retry lost mode or clean state");
}
await performOpeningMove(daily, normalMap);
await runFinalTimerTick(daily);
await normalMap.click(daily, 248, 833);
state = await dailyState();
if (state.screen !== "home" || state.daily.mode || state.level.id !== 3 || state.activeRun) {
  throw new Error("Timeout E2E: daily failure exit did not restore its ordinary origin");
}
await daily.close();

// Minimum viewport keeps progress and both recovery actions inside the modal.
const small = await browser.newPage({ viewport: { width: 320, height: 568 } });
attachErrors(small);
const compact = viewportMapper(320, 568);
await openWithSave(small, save());
await small.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(1, true));
await small.waitForTimeout(20);
state = await small.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
await performUntilOneBlock(small, compact);
await runFinalTimerTick(small);
state = await small.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
if (state.screen !== "failed" || state.puzzle.blocks.length !== 1) {
  throw new Error("Timeout E2E: 320x568 failure state is incorrect");
}
await small.screenshot({ path: shot("round23-timeout-one-block-left-320x568.png") });
await compact.click(small, 248, 833);
state = await small.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
if (state.screen !== "home") throw new Error("Timeout E2E: 320x568 home action was not clickable");
await small.close();

await browser.close();
if (errors.length) throw new Error(`Timeout browser errors:\n${errors.join("\n")}`);
console.log("Real-input normal/daily timeout, contextual progress, retry settlement, origin restore, and 320x568 passed.");
