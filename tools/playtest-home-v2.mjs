import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/", import.meta.url));
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 720, height: 1584 }, deviceScaleFactor: 1 });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));
await page.goto(playtestUrl, { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.setItem("color-escape-save-v1", JSON.stringify({
  schemaVersion: 1,
  currentLevel: 22,
  highestLevel: 23,
  coins: 300000,
  sound: false,
  haptic: false,
  reducedMotion: true,
  featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter"],
  boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: {},
  bestMoves: {},
  rewardedLevels: [1, 2, 3, 4],
  dailyStreak: 0,
  lastDailyCompletedDay: "",
})));
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(500);

const canvas = page.locator("canvas");
const bounds = await canvas.boundingBox();
if (!bounds || Math.round(bounds.width) !== 720 || Math.round(bounds.height) !== 1584) {
  throw new Error(`Home V2 E2E: expected a 720×1584 canvas, got ${JSON.stringify(bounds)}`);
}
const debug = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const homeState = await debug();
if (homeState.screen !== "home") throw new Error("Home V2 E2E: game did not boot to home");
const expectedScale = 720 / 496;
if (Math.abs(homeState.viewportTransform.scale - expectedScale) > 0.0001
  || Math.abs(homeState.viewportTransform.offsetX) > 0.01
  || homeState.viewportTransform.offsetY <= 0) {
  throw new Error(`Home V2 E2E: expected one proportional scale with centered vertical bleed, got ${JSON.stringify(homeState.viewportTransform)}`);
}
await page.screenshot({ path: resolve(output, "round58-home-v2-720x1584.png") });

const clickLogical = (x, y) => {
  const scale = Math.min(720 / 496, 1584 / 1078);
  const offsetX = (720 - 496 * scale) / 2;
  const offsetY = (1584 - 1078 * scale) / 2;
  return page.mouse.click(offsetX + x * scale, offsetY + y * scale);
};
await clickLogical(454, 88);
if ((await debug()).screen !== "settings") throw new Error("Home V2 E2E: settings art and hit target diverged");
await clickLogical(54, 73);
await clickLogical(347, 1010);
if ((await debug()).screen !== "levels") throw new Error("Home V2 E2E: level navigation art and hit target diverged");
await clickLogical(446, 1010);
if ((await debug()).screen !== "records") throw new Error("Home V2 E2E: achievement navigation art and hit target diverged");
await clickLogical(248, 1010);
await clickLogical(248, 810);
if ((await debug()).screen !== "playing") throw new Error("Home V2 E2E: start art and hit target diverged");
await page.screenshot({ path: resolve(output, "round60-gameplay-720x1584.png") });

await page.evaluate(() => localStorage.setItem("color-escape-save-v1", JSON.stringify({
  schemaVersion: 1,
  currentLevel: 1,
  highestLevel: 1,
  coins: 0,
  sound: false,
  haptic: false,
  reducedMotion: true,
  featureSeen: [],
  boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: {},
  bestMoves: {},
  rewardedLevels: [],
  dailyStreak: 0,
  lastDailyCompletedDay: "",
})));
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(500);
const lockedState = await debug();
if (lockedState.screen !== "home" || lockedState.daily?.unlocked !== false) {
  throw new Error(`Home V2 E2E: expected locked daily banner state, got ${JSON.stringify(lockedState.daily)}`);
}
await page.screenshot({ path: resolve(output, "round58-home-v2-daily-locked-720x1584.png") });

await page.close();
await browser.close();
if (errors.length) throw new Error(`Home V2 browser errors:\n${errors.join("\n")}`);
console.log("Home V2 720×1584 proportional composition, locked daily banner, and primary hit targets passed.");
