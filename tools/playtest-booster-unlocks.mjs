import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/booster-unlocks/", import.meta.url));
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });

const makeSave = (highestLevel) => ({
  schemaVersion: 1,
  currentLevel: Math.min(highestLevel, 1),
  highestLevel,
  coins: 1000,
  sound: false,
  haptic: false,
  reducedMotion: true,
  featureSeen: ["basics"],
  boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: {},
  bestMoves: {},
  rewardedLevels: [],
  dailyStreak: 0,
  lastDailyCompletedDay: "",
  lastSeenUpdate: "2026-09-05-r95",
});

const browser = await chromium.launch({ headless: true });
const errors = [];
const attachErrors = (page) => {
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
};
const debug = (page) => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const seed = async (page, highestLevel) => {
  await page.goto(playtestUrl, { waitUntil: "networkidle" });
  await page.evaluate((save) => localStorage.setItem("color-escape-save-v1", JSON.stringify(save)), makeSave(highestLevel));
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(180);
};

const page = await browser.newPage({ viewport: { width: 496, height: 1078 } });
attachErrors(page);
await seed(page, 1);
let state = await debug(page);
if (Object.values(state.controls.boosters).some(Boolean)
  || state.supply.items.some((item) => item.unlocked)
  || state.supply.items.map((item) => item.unlockLevel).join(",") !== "4,7,10") {
  throw new Error(`Booster unlock E2E: fresh progression contract is wrong ${JSON.stringify(state.supply.items)}`);
}

await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(1, true));
await page.waitForTimeout(100);
await page.screenshot({ path: resolve(output, "01-level-1-three-locked.png") });
for (const [x, kind, message] of [
  [132, "time", "Lv 4 解锁加时"],
  [248, "rocket", "Lv 7 解锁火箭"],
  [364, "pulse", "Lv 10 解锁脉冲"],
]) {
  await page.mouse.click(x, 990);
  state = await debug(page);
  if (state.boosterFeedback?.text !== message || state.economy.boosters[kind] !== 3
    || state.boosterTarget || state.undoActions.length !== 0) {
    throw new Error(`Booster unlock E2E: locked ${kind} was not rejected cleanly`);
  }
}

await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(1, false));
await page.waitForTimeout(80);
await page.mouse.click(151, 70);
state = await debug(page);
if (state.screen !== "supply" || state.supply.items.some((item) => item.unlocked)) {
  throw new Error("Booster unlock E2E: fresh shop did not preserve the unlock state");
}
await page.screenshot({ path: resolve(output, "02-shop-three-locked.png") });
await page.mouse.click(377, 450);
state = await debug(page);
if (state.supply.feedback?.text !== "Lv 4 解锁加时" || state.economy.coins !== 1000
  || state.economy.boosters.time !== 3) {
  throw new Error("Booster unlock E2E: locked shop purchase changed the economy");
}

for (const [highestLevel, expected] of [
  [4, { time: true, rocket: false, pulse: false }],
  [7, { time: true, rocket: true, pulse: false }],
  [10, { time: true, rocket: true, pulse: true }],
]) {
  await seed(page, highestLevel);
  await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(1, true));
  await page.waitForTimeout(80);
  state = await debug(page);
  if (JSON.stringify(state.controls.boosters) !== JSON.stringify(expected)) {
    throw new Error(`Booster unlock E2E: Lv${highestLevel} availability drifted ${JSON.stringify(state.controls.boosters)}`);
  }
  await page.screenshot({ path: resolve(output, `03-level-${highestLevel}-unlock-state.png`) });
}

const small = await browser.newPage({ viewport: { width: 320, height: 568 } });
attachErrors(small);
await seed(small, 1);
await small.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(1, true));
await small.waitForTimeout(100);
state = await debug(small);
if (Object.values(state.controls.boosters).some(Boolean)) {
  throw new Error("Booster unlock E2E: 320x568 fresh controls were not locked");
}
await small.screenshot({ path: resolve(output, "04-level-1-three-locked-320x568.png") });

await browser.close();
if (errors.length) throw new Error(`Booster unlock browser errors:\n${errors.join("\n")}`);
console.log("Lv4/7/10 booster unlock pacing, locked economy, staged availability, and 320x568 visuals passed.");
