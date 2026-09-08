import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const root = new URL("../playtest-results/", import.meta.url);
const rootPath = fileURLToPath(root);
const shot = (name) => resolve(rootPath, name);
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(rootPath, { recursive: true });

const browser = await chromium.launch({
  headless: true,
});

const context = await browser.newContext({
  viewport: { width: 496, height: 1078 },
  recordVideo: { dir: rootPath, size: { width: 496, height: 1078 } },
});
const page = await context.newPage();
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));
await page.goto(playtestUrl, { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(1200);
await page.screenshot({ path: shot("round2-home-imagegen.png") });

await page.mouse.click(248, 852);
await page.waitForTimeout(150);
await page.screenshot({ path: shot("round2-level01-start.png") });

const debug = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const levelOneRoute = await page.evaluate(async () => {
  const [{ getLevel }, { solveLevelForValidation }] = await Promise.all([
    import("/src/core/levels.ts"),
    import("/src/core/levelSolver.ts"),
  ]);
  const level = getLevel(1);
  return { solution: solveLevelForValidation(level), reward: level.reward };
});
if (!levelOneRoute.solution.solved || !levelOneRoute.solution.drags.length) {
  throw new Error("Pointer E2E: current level 1 has no verified pointer route");
}

const cellPoint = (board, x, y) => ({
  x: board.innerX + (x + 0.5) * board.cell,
  y: board.innerY + (y + 0.5) * board.cell,
});
const performDrag = async (drag, options = {}) => {
  const state = await debug();
  const block = state.puzzle.blocks.find((candidate) => candidate.id === drag.blockId);
  if (!block) throw new Error(`Pointer E2E: missing route block ${drag.blockId}`);
  const [anchorX, anchorY] = block.shape[0];
  const start = cellPoint(state.board, block.x + anchorX, block.y + anchorY);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  if (options.captureSelected) {
    await page.waitForTimeout(80);
    const selected = await debug();
    if (selected.selectedId !== drag.blockId) throw new Error("Pointer E2E: pointer did not select the routed block");
    await page.screenshot({ path: shot("round2-drag-selected.png") });
  }
  for (const [x, y] of drag.path) {
    const target = cellPoint(state.board, x + anchorX, y + anchorY);
    await page.mouse.move(target.x, target.y, { steps: 3 });
  }
  if (drag.exitSide) {
    const latest = await debug();
    const remaining = latest.puzzle.blocks.find((candidate) => candidate.id === drag.blockId);
    const expectedLayers = Math.max(0, block.layers.length - 1);
    if (latest.selectedId || latest.activePointer !== undefined) {
      throw new Error(`Pointer E2E: ${drag.blockId} remained grabbed after held alignment`);
    }
    if ((expectedLayers === 0 && remaining)
      || (expectedLayers > 0 && (!remaining || remaining.layers.length !== expectedLayers))) {
      throw new Error(`Pointer E2E: ${drag.blockId} did not resolve its active layer on held alignment`);
    }
  }
  await page.mouse.up();
  if (options.captureExit) {
    await page.waitForTimeout(20);
    const feedback = await debug();
    if (feedback.exitGhosts < 1 && feedback.exitPulses.length < 1) {
      throw new Error("Pointer E2E: successful exit had no visible gate feedback");
    }
    await page.screenshot({ path: shot("round2-exit-tween.png") });
  }
  await page.waitForTimeout(drag.exitSide ? 340 : 35);
};
const performLevelOne = async (capture = false) => {
  let capturedExit = false;
  for (let index = 0; index < levelOneRoute.solution.drags.length; index += 1) {
    const drag = levelOneRoute.solution.drags[index];
    const captureExit = capture && !capturedExit && Boolean(drag.exitSide);
    await performDrag(drag, { captureSelected: capture && index === 0, captureExit });
    if (captureExit) capturedExit = true;
  }
  if (capture && !capturedExit) throw new Error("Pointer E2E: level 1 route never exercised an exit");
};

await performLevelOne(true);
await page.waitForTimeout(80);
const celebrating = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
if (celebrating.screen !== "celebrating" || celebrating.quickClear?.fromLevel !== 1 || celebrating.quickClear?.toLevel !== 2) {
  throw new Error(`Pointer E2E: expected first-clear quick celebration, got ${celebrating.screen}`);
}
await page.screenshot({ path: shot("round41-quick-clear-level-001.png") });
await page.waitForTimeout(560);
const won = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
if (won.screen !== "playing" || won.level.id !== 2 || won.puzzle.moves !== 0 || won.activeRun?.levelId !== 2) {
  throw new Error(`Pointer E2E: quick flow did not begin clean level 2 (${won.screen}, Lv${won.level.id})`);
}
if (!(won.progression.bestStars["1"] >= 1) || won.progression.bestMoves["1"] !== levelOneRoute.solution.minimumDrags) {
  throw new Error("First-clear star or move record was not saved from the current route");
}
const rewardedCoins = 1000 + levelOneRoute.reward;
if (won.economy.coins !== rewardedCoins || !won.economy.rewardedLevels.includes(1)) throw new Error("First-clear reward was not recorded exactly once");
await page.screenshot({ path: shot("round41-quick-flow-level-002.png") });
await page.setViewportSize({ width: 320, height: 568 });
await page.waitForTimeout(120);
await page.screenshot({ path: shot("round41-quick-flow-level-002-320x568.png") });
await page.setViewportSize({ width: 496, height: 1078 });
await page.waitForTimeout(120);

// Replaying a completed level must not grant the first-clear coin reward again.
await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(1, true));
await page.waitForTimeout(80);
await performLevelOne();
await page.waitForTimeout(3500);
const replay = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
if (replay.screen !== "win" || replay.economy.coins !== rewardedCoins) throw new Error("Replay duplicated the first-clear reward");

// An outer notch is real collision. The block may park next to it, but cannot
// occupy or auto-route through a void; there are no internal fixed wall cells.
await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(9, true));
await page.waitForTimeout(80);
const notchFixture = await page.evaluate(() => {
  const state = window.__COLOR_ESCAPE__.getDebugState();
  const playable = new Set(state.puzzle.playable.map(([x, y]) => `${x},${y}`));
  const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (const block of state.puzzle.blocks) {
    if (block.frozen > 0) continue;
    const occupied = new Set(state.puzzle.blocks
      .filter((other) => other.id !== block.id)
      .flatMap((other) => other.shape.map(([dx, dy]) => `${other.x + dx},${other.y + dy}`)));
    for (const [dx, dy] of directions) {
      let step = 1;
      let lastLegal = null;
      while (step <= Math.max(state.puzzle.width, state.puzzle.height)) {
        const x = block.x + dx * step;
        const y = block.y + dy * step;
        const cells = block.shape.map(([cellX, cellY]) => [x + cellX, y + cellY]);
        const within = cells.every(([cellX, cellY]) => cellX >= 0 && cellY >= 0 && cellX < state.puzzle.width && cellY < state.puzzle.height);
        const hitsVoid = cells.some(([cellX, cellY]) => within && !playable.has(`${cellX},${cellY}`));
        const blocked = cells.some(([cellX, cellY]) => occupied.has(`${cellX},${cellY}`));
        if (!within || hitsVoid || blocked) {
          if (lastLegal && hitsVoid && !blocked) {
            return {
              board: state.board,
              blockId: block.id,
              anchor: block.shape[0],
              start: [block.x, block.y],
              lastLegal,
              invalid: [x, y],
            };
          }
          break;
        }
        lastLegal = [x, y];
        step += 1;
      }
    }
  }
  throw new Error("No straight outer-notch collision fixture found on Level 9");
});
const canyon = notchFixture.board;
const canyonPoint = (x, y) => ({ x: canyon.innerX + (x + 0.5) * canyon.cell, y: canyon.innerY + (y + 0.5) * canyon.cell });
const notchStart = canyonPoint(notchFixture.start[0] + notchFixture.anchor[0], notchFixture.start[1] + notchFixture.anchor[1]);
const notchInvalid = canyonPoint(notchFixture.invalid[0] + notchFixture.anchor[0], notchFixture.invalid[1] + notchFixture.anchor[1]);
await page.mouse.move(notchStart.x, notchStart.y);
await page.mouse.down();
await page.mouse.move(notchInvalid.x, notchInvalid.y, { steps: 8 });
let routed = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
let routedKey = routed.puzzle.blocks.find((block) => block.id === notchFixture.blockId);
if (routedKey.x !== notchFixture.lastLegal[0] || routedKey.y !== notchFixture.lastLegal[1]) {
  throw new Error(`Pointer E2E: outer notch collision stopped at ${routedKey.x},${routedKey.y}, expected ${notchFixture.lastLegal}`);
}
await page.mouse.move(notchInvalid.x, notchInvalid.y, { steps: 4 });
await page.mouse.up();
routed = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
routedKey = routed.puzzle.blocks.find((block) => block.id === notchFixture.blockId);
if (routedKey.x !== notchFixture.lastLegal[0] || routedKey.y !== notchFixture.lastLegal[1]) {
  throw new Error(`Pointer E2E: block entered the outer void at ${routedKey.x},${routedKey.y}`);
}
await page.screenshot({ path: shot("round3-collision-stop.png") });

await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(5, true));
await page.waitForTimeout(120);
await page.mouse.click(443, 140);
let paused = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
if (paused.screen !== "paused") throw new Error("Pause button did not open the pause overlay");
const initialSound = paused.settings.sound;
await page.mouse.click(180, 478);
paused = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
if (paused.settings.sound === initialSound) throw new Error("Sound toggle did not change");
await page.screenshot({ path: shot("round2-pause.png") });

const video = page.video();
await context.close();
if (video) await video.saveAs(shot("challenge-loop-round3.webm"));

for (const [width, height] of [[320, 568], [375, 812], [390, 844], [430, 932]]) {
  const mobile = await browser.newPage({ viewport: { width, height } });
  await mobile.goto(playtestUrl, { waitUntil: "networkidle" });
  await mobile.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(100, true));
  await mobile.waitForTimeout(150);
  await mobile.screenshot({ path: shot(`round2-mobile-${width}x${height}.png`) });
  await mobile.close();
}

const safePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
const safeUrl = new URL(playtestUrl);
safeUrl.searchParams.set("safeTop", "44");
safeUrl.searchParams.set("safeBottom", "34");
await safePage.goto(safeUrl.href, { waitUntil: "networkidle" });
await safePage.waitForTimeout(800);
await safePage.screenshot({ path: shot("round3-safearea-home-44-34.png") });
await safePage.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(100, true));
await safePage.waitForTimeout(120);
await safePage.screenshot({ path: shot("round3-safearea-level-44-34.png") });
await safePage.close();

await browser.close();
if (errors.length) throw new Error(`Browser errors:\n${errors.join("\n")}`);
console.log("Pointer E2E, modal controls, responsive screenshots, and video capture passed.");
