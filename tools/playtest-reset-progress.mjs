import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/", import.meta.url));
const shot = (name) => resolve(output, name);
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
const saveKey = "color-escape-save-v1";
await mkdir(output, { recursive: true });

const matureSave = {
  schemaVersion: 1,
  currentLevel: 18,
  highestLevel: 24,
  coins: 4321,
  sound: false,
  haptic: false,
  reducedMotion: true,
  featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter"],
  boosterUnlockSeen: ["time", "rocket", "pulse"],
  metaDiscovery: { collectionViewedThroughLevel: 15, dailyUnlockSeen: true },
  boosters: { time: 7, rocket: 5, pulse: 8 },
  bestStars: { "1": 3, "12": 2, "18": 1 },
  bestMoves: { "1": 4, "12": 9, "18": 13 },
  rewardedLevels: Array.from({ length: 18 }, (_, index) => index + 1),
  dailyStreak: 9,
  lastDailyCompletedDay: "2026-09-01",
};

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 496, height: 1078 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));

await page.goto(playtestUrl, { waitUntil: "networkidle" });
await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: saveKey, value: matureSave });
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(350);
const debug = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());

await page.mouse.click(454, 70);
await page.screenshot({ path: shot("round32-settings-reset-entry.png") });
await page.mouse.click(248, 877);
let state = await debug();
if (state.screen !== "resetConfirm" || state.progression.highestLevel !== 24 || state.economy.coins !== 4321) {
  throw new Error("Reset E2E: confirmation did not open without mutating progress");
}
await page.screenshot({ path: shot("round32-reset-confirmation.png") });

await page.mouse.click(248, 833);
state = await debug();
if (state.screen !== "settings" || state.progression.highestLevel !== 24 || state.economy.coins !== 4321) {
  throw new Error("Reset E2E: cancel did not preserve the existing save");
}

await page.mouse.click(248, 877);
await page.evaluate((key) => {
  const originalSet = Storage.prototype.setItem;
  window.__BLOCK_RESET_WRITE__ = true;
  Storage.prototype.setItem = function setItem(name, value) {
    if (name === key && window.__BLOCK_RESET_WRITE__) {
      throw new DOMException("reset write denied", "QuotaExceededError");
    }
    return originalSet.call(this, name, value);
  };
}, saveKey);
await page.mouse.click(248, 755);
state = await debug();
const rawAfterFailedReset = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), saveKey);
if (state.screen !== "resetConfirm" || state.reset.saveFailed !== true
  || state.progression.highestLevel !== 24 || state.economy.coins !== 4321
  || rawAfterFailedReset.highestLevel !== 24 || rawAfterFailedReset.coins !== 4321
  || JSON.stringify(state.discovery.state) !== JSON.stringify(matureSave.metaDiscovery)
  || JSON.stringify(rawAfterFailedReset.metaDiscovery) !== JSON.stringify(matureSave.metaDiscovery)) {
  throw new Error("Reset E2E: failed storage write presented a false-successful reset");
}
await page.screenshot({ path: shot("round103-reset-write-failure-protected.png") });
await page.evaluate(() => { window.__BLOCK_RESET_WRITE__ = false; });
await page.mouse.click(248, 755);
state = await debug();
if (state.screen !== "home" || state.level.id !== 1 || state.progression.highestLevel !== 1) {
  throw new Error("Reset E2E: confirmed reset did not return to a fresh level 1 home");
}
if (state.economy.coins !== 1000 || state.economy.rewardedLevels.length !== 0
  || Object.values(state.economy.boosters).some((stock) => stock !== 3)) {
  throw new Error("Reset E2E: economy did not return to defaults");
}
if (Object.keys(state.progression.bestStars).length || Object.keys(state.progression.bestMoves).length
  || state.daily.streak !== 0 || state.onboarding.basicsSeen
  || JSON.stringify(state.discovery.state) !== JSON.stringify({ collectionViewedThroughLevel: 1, dailyUnlockSeen: false })) {
  throw new Error("Reset E2E: records, daily state, or onboarding were not cleared");
}
if (state.settings.sound || state.settings.haptic || !state.settings.reducedMotion) {
  throw new Error("Reset E2E: device preferences were not preserved");
}
await page.screenshot({ path: shot("round32-reset-complete-home.png") });

await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(250);
state = await debug();
if (state.level.id !== 1 || state.progression.highestLevel !== 1 || state.economy.coins !== 1000
  || state.settings.sound || state.settings.haptic || !state.settings.reducedMotion
  || JSON.stringify(state.discovery.state) !== JSON.stringify({ collectionViewedThroughLevel: 1, dailyUnlockSeen: false })) {
  throw new Error("Reset E2E: cleared save did not persist across reload");
}

await page.close();

const small = await browser.newPage({ viewport: { width: 320, height: 568 } });
await small.goto(playtestUrl, { waitUntil: "networkidle" });
await small.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: saveKey, value: matureSave });
await small.reload({ waitUntil: "networkidle" });
const scale = Math.min(320 / 496, 568 / 1078);
const offsetX = (320 - 496 * scale) / 2;
const clickLogical = (x, y) => small.mouse.click(offsetX + x * scale, y * scale);
await clickLogical(454, 70);
await clickLogical(248, 877);
state = await small.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
if (state.screen !== "resetConfirm") throw new Error("Reset E2E: 320x568 reset target missed");
await small.screenshot({ path: shot("round32-reset-confirmation-320x568.png") });
await clickLogical(248, 833);
state = await small.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
if (state.screen !== "settings" || state.progression.highestLevel !== 24) {
  throw new Error("Reset E2E: 320x568 cancel target failed");
}
await small.close();

await browser.close();
if (errors.length) throw new Error(`Reset E2E browser errors:\n${errors.join("\n")}`);
console.log("Reset confirmation, cancellation, failed-write rollback/retry, full progress clear, preference preservation, persistence, and 320x568 passed.");
