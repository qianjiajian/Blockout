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
const debug = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());

await page.goto(playtestUrl, { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle" });
await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(2, true));
await page.waitForTimeout(120);

// Restart must restore a moved puzzle rather than only closing the modal.
let state = await debug();
const board = state.board;
const point = (x, y) => ({ x: board.innerX + (x + 0.5) * board.cell, y: board.innerY + (y + 0.5) * board.cell });
const openingDrag = await page.evaluate(async () => {
  const [{ getLevel }, { solveLevelForValidation }] = await Promise.all([
    import("/src/core/levels.ts"),
    import("/src/core/levelSolver.ts"),
  ]);
  return solveLevelForValidation(getLevel(2)).drags.find((drag) => !drag.exitSide && drag.path.length > 0);
});
if (!openingDrag) throw new Error("Pause E2E: level 2 has no setup drag for restart coverage");
const openingBlock = state.puzzle.blocks.find((block) => block.id === openingDrag.blockId);
if (!openingBlock) throw new Error(`Pause E2E: missing setup block ${openingDrag.blockId}`);
const openingOrigin = { x: openingBlock.x, y: openingBlock.y };
const [anchorX, anchorY] = openingBlock.shape[0];
const start = point(openingBlock.x + anchorX, openingBlock.y + anchorY);
const [targetX, targetY] = openingDrag.path[0];
await page.mouse.move(start.x, start.y);
await page.mouse.down();
await page.mouse.move(point(targetX + anchorX, targetY + anchorY).x, point(targetX + anchorX, targetY + anchorY).y, { steps: 6 });
await page.mouse.up();
state = await debug();
if (state.puzzle.moves !== 1) throw new Error("Pause E2E: setup move was not committed");

await page.mouse.click(443, 140);
state = await debug();
if (state.screen !== "paused") throw new Error("Pause E2E: pause modal did not open");
await page.screenshot({ path: shot("round16-pause-three-actions.png") });
await page.mouse.click(176, 805);
state = await debug();
const resetBlock = state.puzzle.blocks.find((block) => block.id === openingDrag.blockId);
if (state.screen !== "playing" || state.puzzle.moves !== 0
  || resetBlock?.x !== openingOrigin.x || resetBlock?.y !== openingOrigin.y) {
  throw new Error("Pause E2E: restart did not restore the current level");
}

// Normal play can always return to its selected level on the home screen.
await page.mouse.click(443, 140);
await page.mouse.click(320, 805);
state = await debug();
if (state.screen !== "home" || state.level.id !== 2 || state.daily.mode) {
  throw new Error("Pause E2E: normal return-home action is incorrect");
}

// Daily play must return to the pre-daily level, while restart must retain daily mode.
await page.evaluate(() => {
  localStorage.setItem("color-escape-save-v1", JSON.stringify({
    schemaVersion: 1,
    currentLevel: 3,
    highestLevel: 6,
    coins: 2000,
    sound: false,
    haptic: false,
    featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter"],
    boosters: { time: 3, rocket: 3, pulse: 3 },
    bestStars: { "1": 3, "2": 3, "3": 3, "4": 3, "5": 3 },
    bestMoves: { "1": 2, "2": 3, "3": 4, "4": 4, "5": 4 },
    rewardedLevels: [1, 2, 3, 4, 5],
    dailyStreak: 0,
    lastDailyCompletedDay: "",
  }));
});
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(160);
await page.mouse.click(248, 933);
state = await debug();
const dailyLevel = state.level.id;
if (state.screen !== "playing" || !state.daily.mode) throw new Error("Pause E2E: daily challenge did not start");
await page.mouse.click(443, 140);
await page.mouse.click(320, 805);
state = await debug();
if (state.screen !== "home" || state.level.id !== 3 || state.daily.mode) {
  throw new Error("Pause E2E: daily return-home did not restore the pre-daily level");
}
await page.mouse.click(248, 933);
await page.mouse.click(443, 140);
await page.mouse.click(176, 805);
state = await debug();
if (state.screen !== "playing" || !state.daily.mode || state.level.id !== dailyLevel || state.puzzle.moves !== 0) {
  throw new Error("Pause E2E: daily restart did not retain a clean daily run");
}

await page.close();

// Minimum viewport: all three actions must remain readable and the home target clickable.
const small = await browser.newPage({ viewport: { width: 320, height: 568 } });
await small.goto(playtestUrl, { waitUntil: "networkidle" });
await small.evaluate(() => localStorage.clear());
await small.reload({ waitUntil: "networkidle" });
await small.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(1, true));
await small.waitForTimeout(120);
const scale = Math.min(320 / 496, 568 / 1078);
const offsetX = (320 - 496 * scale) / 2;
await small.mouse.click(offsetX + 443 * scale, 140 * scale);
let smallState = await small.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
if (smallState.screen !== "paused") throw new Error("Pause E2E: 320x568 pause modal did not open");
await small.screenshot({ path: shot("round16-pause-three-actions-320x568.png") });
await small.mouse.click(offsetX + 320 * scale, 805 * scale);
smallState = await small.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
if (smallState.screen !== "home") throw new Error("Pause E2E: 320x568 home action was not clickable");
await small.close();

await browser.close();
if (errors.length) throw new Error(`Pause navigation browser errors:\n${errors.join("\n")}`);
console.log("Pause resume/restart/home hierarchy, daily return target, and 320x568 navigation passed.");
