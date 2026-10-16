import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL(`../playtest-results/playtest-disabled-controls-time-freeze-${new Date().toISOString().replaceAll(":", "-")}/`, import.meta.url));
const shot = (name) => resolve(output, name);
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const errors = [];
const makeSave = (time = 0) => ({
  schemaVersion: 1,
  currentLevel: 1,
  highestLevel: 100,
  coins: 1000,
  sound: false,
  haptic: false,
  reducedMotion: true,
  featureSeen: ["basics"],
  boosters: { time, rocket: 0, pulse: 0 },
  bestStars: {},
  bestMoves: {},
  rewardedLevels: [],
  dailyStreak: 0,
  lastDailyCompletedDay: "",
});

const attachErrors = (page) => {
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
};

const writeSave = async (page, value) => {
  await page.goto(playtestUrl, { waitUntil: "networkidle" });
  await page.evaluate((save) => localStorage.setItem("color-escape-save-v1", JSON.stringify(save)), value);
  await page.reload({ waitUntil: "networkidle" });
  await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(1, true));
  await page.waitForTimeout(120);
};

const page = await browser.newPage({ viewport: { width: 496, height: 1078 } });
attachErrors(page);
const debug = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
await writeSave(page, makeSave());
let state = await debug();
if (state.controls.undoEnabled || Object.values(state.controls.boosters).some(Boolean)) {
  throw new Error("Disabled-controls E2E: empty controls reported as enabled");
}
await page.screenshot({ path: shot("round22-disabled-controls.png") });

const emptyPuzzle = JSON.stringify(state.puzzle);
const emptyFeedback = state.hudFeedback?.text;
await page.mouse.click(54, 140);
state = await debug();
if (state.controls.undoEnabled || state.interactionTargets.targets.undo
  || state.hudFeedback?.text !== emptyFeedback || JSON.stringify(state.puzzle) !== emptyPuzzle) {
  throw new Error("Disabled-controls E2E: the removed undo position changed the puzzle or exposed a control");
}
await page.screenshot({ path: shot("round22-former-undo-inert.png") });

for (const [x, kind, text] of [[132, "time", "冻结已用完"], [248, "rocket", "火箭已用完"], [364, "pulse", "脉冲已用完"]]) {
  await page.mouse.click(x, 990);
  state = await debug();
  if (state.boosterFeedback?.text !== text || state.economy.boosters[kind] !== 0 || state.boosterTarget || state.controls.undoEnabled) {
    throw new Error(`Disabled-controls E2E: ${kind} empty-state handling is incorrect`);
  }
}

// Spending the last item disables its control; the former undo position cannot refund it.
await writeSave(page, makeSave(1));
state = await debug();
if (!state.controls.boosters.time || state.controls.undoEnabled) {
  throw new Error("Disabled-controls E2E: one-item setup has incorrect affordances");
}
await page.mouse.click(132, 990);
state = await debug();
if (state.economy.boosters.time !== 0 || state.controls.boosters.time || state.controls.undoEnabled || (state.puzzle.remainingSeconds !== 180 || state.puzzle.timeFreezeSeconds <= 9)) {
  throw new Error("Disabled-controls E2E: last-item depletion did not update controls atomically");
}
await page.screenshot({ path: shot("round22-last-item-depleted.png") });
const spentPuzzle = state.puzzle;
const spentBlocks = JSON.stringify(spentPuzzle.blocks);
const spentFeedback = state.hudFeedback?.text;
await page.mouse.click(54, 140);
state = await debug();
if (state.economy.boosters.time !== 0 || state.controls.boosters.time || state.controls.undoEnabled
  || state.interactionTargets.targets.undo || state.hudFeedback?.text !== spentFeedback
  || state.puzzle.moves !== spentPuzzle.moves || JSON.stringify(state.puzzle.blocks) !== spentBlocks
  || state.puzzle.remainingSeconds !== 180 || state.puzzle.timeFreezeSeconds <= 0
  || state.puzzle.timeFreezeSeconds > spentPuzzle.timeFreezeSeconds) {
  throw new Error("Disabled-controls E2E: the removed undo position refunded an item or changed the active freeze/board");
}
await page.screenshot({ path: shot("round22-former-undo-keeps-item-spent.png") });
await page.close();

// Minimum viewport keeps muted icons and both feedback chips readable.
const small = await browser.newPage({ viewport: { width: 320, height: 568 } });
attachErrors(small);
await writeSave(small, makeSave());
const smallBefore = await small.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const scale = Math.min(320 / 496, 568 / 1078);
const offsetX = (320 - 496 * scale) / 2;
await small.mouse.click(offsetX + 54 * scale, 140 * scale);
await small.mouse.click(offsetX + 248 * scale, 990 * scale);
const smallState = await small.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
if (smallState.controls.undoEnabled || smallState.interactionTargets.targets.undo
  || smallState.hudFeedback?.text !== smallBefore.hudFeedback?.text
  || JSON.stringify(smallState.puzzle) !== JSON.stringify(smallBefore.puzzle)
  || smallState.boosterFeedback?.text !== "火箭已用完") {
  throw new Error("Disabled-controls E2E: 320x568 feedback is incorrect");
}
await small.screenshot({ path: shot("round22-disabled-controls-320x568.png") });
await small.close();

await browser.close();
if (errors.length) throw new Error(`Disabled-controls browser errors:\n${errors.join("\n")}`);
console.log("Removed undo stays inert; disabled boosters, specific reasons, last-item depletion, and 320x568 passed.");
