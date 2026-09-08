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
const attachErrors = (page) => {
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
};
const makeSave = () => ({
  schemaVersion: 1,
  currentLevel: 12,
  highestLevel: 12,
  coins: 1000,
  sound: true,
  haptic: true,
  reducedMotion: false,
  featureSeen: ["basics", "ice-door", "ice-block", "layer"],
  boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: {},
  bestMoves: {},
  rewardedLevels: Array.from({ length: 11 }, (_, index) => index + 1),
  dailyStreak: 0,
  lastDailyCompletedDay: "",
});
const writeSave = async (page, url = playtestUrl) => {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate((value) => localStorage.setItem("color-escape-save-v1", JSON.stringify(value)), makeSave());
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(500);
};
const debug = (page) => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());

const page = await browser.newPage({ viewport: { width: 496, height: 1078 } });
attachErrors(page);
await writeSave(page);
await page.screenshot({ path: shot("round26-home-settings-entry.png") });
await page.mouse.click(454, 70);
let state = await debug(page);
if (state.screen !== "settings" || state.activeRun || state.puzzle.started) {
  throw new Error("Home-settings E2E: entry did not open settings before creating a run");
}
await page.screenshot({ path: shot("round26-settings-default.png") });

await page.mouse.click(390, 293);
await page.mouse.click(390, 471);
await page.mouse.click(390, 649);
state = await debug(page);
if (state.settings.sound || state.settings.haptic || !state.settings.reducedMotion || state.screen !== "settings") {
  throw new Error("Home-settings E2E: three home toggles did not update the shared settings contract");
}
await page.screenshot({ path: shot("round26-settings-adjusted.png") });

await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(250);
state = await debug(page);
if (state.settings.sound || state.settings.haptic || !state.settings.reducedMotion || state.screen !== "home") {
  throw new Error("Home-settings E2E: settings did not persist across reload");
}
await page.mouse.click(454, 70);
await page.mouse.click(54, 73);
state = await debug(page);
if (state.screen !== "home" || state.activeRun) throw new Error("Home-settings E2E: back did not return to the untouched home state");

await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(1, true));
await page.waitForTimeout(120);
await page.mouse.click(443, 140);
state = await debug(page);
if (state.screen !== "paused" || state.settings.sound || state.settings.haptic || !state.settings.reducedMotion) {
  throw new Error("Home-settings E2E: pause screen did not share the persisted values");
}
await page.screenshot({ path: shot("round26-pause-shared-settings.png") });
await page.close();

const small = await browser.newPage({ viewport: { width: 320, height: 568 } });
attachErrors(small);
await writeSave(small);
const scale = Math.min(320 / 496, 568 / 1078);
const offsetX = (320 - 496 * scale) / 2;
const clickLogical = (x, y) => small.mouse.click(offsetX + x * scale, y * scale);
await clickLogical(454, 70);
state = await debug(small);
if (state.screen !== "settings") throw new Error("Home-settings E2E: 320x568 gear target missed");
await small.screenshot({ path: shot("round26-settings-320x568.png") });
await clickLogical(390, 649);
state = await debug(small);
if (!state.settings.reducedMotion) throw new Error("Home-settings E2E: 320x568 toggle target missed");
await clickLogical(54, 73);
state = await debug(small);
if (state.screen !== "home") throw new Error("Home-settings E2E: 320x568 back target missed");
await small.close();

const safeUrl = new URL(playtestUrl);
safeUrl.searchParams.set("safeTop", "44");
safeUrl.searchParams.set("safeBottom", "34");
const safePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
attachErrors(safePage);
await writeSave(safePage, safeUrl.href);
const safeScale = Math.min(390 / 496, 844 / 1078);
const safeOffsetX = (390 - 496 * safeScale) / 2;
const safeOffsetY = (844 - 1078 * safeScale) / 2;
const logicalTop = Math.min(54, 44 / safeScale);
const safeClick = (x, y) => safePage.mouse.click(safeOffsetX + x * safeScale, safeOffsetY + (y + logicalTop) * safeScale);
await safeClick(454, 70);
state = await debug(safePage);
if (state.screen !== "settings") throw new Error("Home-settings E2E: 44px safe-top gear target missed");
await safePage.screenshot({ path: shot("round26-settings-safearea-390x844.png") });
await safeClick(390, 293);
state = await debug(safePage);
if (state.settings.sound) throw new Error("Home-settings E2E: safe-area row target diverged from rendering");
await safeClick(54, 73);
state = await debug(safePage);
if (state.screen !== "home") throw new Error("Home-settings E2E: safe-area back target missed");
await safePage.close();

const nativeSafePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
attachErrors(nativeSafePage);
await writeSave(nativeSafePage);
await nativeSafePage.addStyleTag({ content: `:root {
  --color-escape-safe-top: 44px !important;
  --color-escape-safe-bottom: 34px !important;
}` });
state = await debug(nativeSafePage);
if (state.navigation.safe.top <= 0 || state.navigation.safe.bottom <= 0) {
  throw new Error(`Home-settings E2E: native CSS safe-area insets were not collected ${JSON.stringify(state.navigation.safe)}`);
}
const nativeSafeScale = Math.min(390 / 496, 844 / 1078);
const nativeSafeOffsetX = (390 - 496 * nativeSafeScale) / 2;
const nativeSafeOffsetY = (844 - 1078 * nativeSafeScale) / 2;
const nativeLogicalTop = state.navigation.safe.top;
await nativeSafePage.mouse.click(
  nativeSafeOffsetX + 454 * nativeSafeScale,
  nativeSafeOffsetY + (70 + nativeLogicalTop) * nativeSafeScale,
);
state = await debug(nativeSafePage);
if (state.screen !== "settings") {
  throw new Error("Home-settings E2E: native CSS safe-area gear target diverged from rendering");
}
await nativeSafePage.screenshot({ path: shot("round103-settings-native-safearea-390x844.png") });
await nativeSafePage.close();

await browser.close();
if (errors.length) throw new Error(`Home-settings browser errors:\n${errors.join("\n")}`);
console.log("Pre-run settings, shared pause values, persistence, 320x568, URL safe-area override, and native CSS safe-area collection passed.");
