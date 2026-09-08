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

await page.mouse.click(54, 140);
state = await debug();
if (state.hudFeedback?.text !== "暂无可撤销操作" || state.puzzle.moves !== 0 || state.undoActions.length !== 0) {
  throw new Error("Disabled-controls E2E: empty undo feedback or state is incorrect");
}
await page.screenshot({ path: shot("round22-empty-undo-feedback.png") });

for (const [x, kind, text] of [[132, "time", "加时已用完"], [248, "rocket", "火箭已用完"], [364, "pulse", "脉冲已用完"]]) {
  await page.mouse.click(x, 990);
  state = await debug();
  if (state.boosterFeedback?.text !== text || state.economy.boosters[kind] !== 0 || state.boosterTarget || state.undoActions.length !== 0) {
    throw new Error(`Disabled-controls E2E: ${kind} empty-state handling is incorrect`);
  }
}

// Spending the last item disables its control; undo restores both effect and affordance.
await writeSave(page, makeSave(1));
state = await debug();
if (!state.controls.boosters.time || state.controls.undoEnabled) {
  throw new Error("Disabled-controls E2E: one-item setup has incorrect affordances");
}
await page.mouse.click(132, 990);
state = await debug();
if (state.economy.boosters.time !== 0 || state.controls.boosters.time || !state.controls.undoEnabled || state.puzzle.remainingSeconds !== 210) {
  throw new Error("Disabled-controls E2E: last-item depletion did not update controls atomically");
}
await page.screenshot({ path: shot("round22-last-item-depleted.png") });
await page.mouse.click(54, 140);
state = await debug();
if (state.economy.boosters.time !== 1 || !state.controls.boosters.time || state.controls.undoEnabled || state.puzzle.remainingSeconds !== 180) {
  throw new Error("Disabled-controls E2E: undo did not restore item affordance atomically");
}
await page.screenshot({ path: shot("round22-item-restored-by-undo.png") });
await page.close();

// Minimum viewport keeps muted icons and both feedback chips readable.
const small = await browser.newPage({ viewport: { width: 320, height: 568 } });
attachErrors(small);
await writeSave(small, makeSave());
const scale = Math.min(320 / 496, 568 / 1078);
const offsetX = (320 - 496 * scale) / 2;
await small.mouse.click(offsetX + 54 * scale, 140 * scale);
await small.mouse.click(offsetX + 248 * scale, 990 * scale);
const smallState = await small.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
if (smallState.hudFeedback?.text !== "暂无可撤销操作" || smallState.boosterFeedback?.text !== "火箭已用完") {
  throw new Error("Disabled-controls E2E: 320x568 feedback is incorrect");
}
await small.screenshot({ path: shot("round22-disabled-controls-320x568.png") });
await small.close();

await browser.close();
if (errors.length) throw new Error(`Disabled-controls browser errors:\n${errors.join("\n")}`);
console.log("Disabled undo/boosters, specific reasons, last-item depletion, atomic restore, and 320x568 passed.");
