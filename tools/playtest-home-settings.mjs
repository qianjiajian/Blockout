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
const clickTarget = async (page, name) => {
  const state = await debug(page);
  const hit = state.interactionTargets?.targets?.[name]?.hit;
  const canvas = await page.locator("canvas").boundingBox();
  if (!hit || !canvas) throw new Error(`Home-settings E2E: missing ${name} target or canvas bounds`);
  await page.mouse.click(
    canvas.x + state.viewportTransform.offsetX + (hit.x + hit.width / 2) * state.viewportTransform.scale,
    canvas.y + state.viewportTransform.offsetY + (hit.y + hit.height / 2) * state.viewportTransform.scale,
  );
};
const installPopupMaskProbe = (page) => page.addInitScript(() => {
  const originalFillRect = CanvasRenderingContext2D.prototype.fillRect;
  globalThis.__POPUP_MASK_PROBE__ = undefined;
  CanvasRenderingContext2D.prototype.fillRect = function fillRect(x, y, width, height) {
    if (x === 0 && y === 0 && width === 496 && height === 1078 && this.globalAlpha < 1) {
      globalThis.__POPUP_MASK_PROBE__ = {
        color: String(this.fillStyle),
        alpha: this.globalAlpha,
        rect: { x, y, width, height },
      };
    }
    return originalFillRect.call(this, x, y, width, height);
  };
});
const expectBlackPopupMask = async (page, label) => {
  const mask = await page.evaluate(() => globalThis.__POPUP_MASK_PROBE__);
  if (!mask || mask.color !== "#000000" || Math.abs(mask.alpha - 0.72) > 0.001
    || mask.rect.x !== 0 || mask.rect.y !== 0
    || mask.rect.width !== 496 || mask.rect.height !== 1078) {
    throw new Error(`Home-settings E2E: ${label} mask is not full-screen black at 72% (${JSON.stringify(mask)})`);
  }
};

const page = await browser.newPage({ viewport: { width: 496, height: 1078 } });
attachErrors(page);
await installPopupMaskProbe(page);
await writeSave(page);
await page.screenshot({ path: shot("round26-home-settings-entry.png") });
await clickTarget(page, "homeSettings");
let state = await debug(page);
if (state.screen !== "settings" || state.activeRun || state.puzzle.started) {
  throw new Error("Home-settings E2E: entry did not open settings before creating a run");
}
await expectBlackPopupMask(page, "settings");
await page.screenshot({ path: shot("round26-settings-default.png") });

await clickTarget(page, "settings.sound");
await clickTarget(page, "settings.haptic");
await clickTarget(page, "settings.reducedMotion");
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
await clickTarget(page, "homeSettings");
await clickTarget(page, "menuBack");
state = await debug(page);
if (state.screen !== "home" || state.activeRun) throw new Error("Home-settings E2E: back did not return to the untouched home state");

await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(1, true));
await page.waitForTimeout(120);
await clickTarget(page, "pause");
state = await debug(page);
if (state.screen !== "paused" || state.settings.sound || state.settings.haptic || !state.settings.reducedMotion) {
  throw new Error("Home-settings E2E: pause screen did not share the persisted values");
}
await expectBlackPopupMask(page, "pause");
await page.screenshot({ path: shot("round26-pause-shared-settings.png") });
await page.close();

const small = await browser.newPage({ viewport: { width: 320, height: 568 } });
attachErrors(small);
await writeSave(small);
await clickTarget(small, "homeSettings");
state = await debug(small);
if (state.screen !== "settings") throw new Error("Home-settings E2E: 320x568 gear target missed");
await small.screenshot({ path: shot("round26-settings-320x568.png") });
await clickTarget(small, "settings.reducedMotion");
state = await debug(small);
if (!state.settings.reducedMotion) throw new Error("Home-settings E2E: 320x568 toggle target missed");
await clickTarget(small, "menuBack");
state = await debug(small);
if (state.screen !== "home") throw new Error("Home-settings E2E: 320x568 back target missed");
await small.close();

const safeUrl = new URL(playtestUrl);
safeUrl.searchParams.set("safeTop", "44");
safeUrl.searchParams.set("safeBottom", "34");
const safePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
attachErrors(safePage);
await writeSave(safePage, safeUrl.href);
await clickTarget(safePage, "homeSettings");
state = await debug(safePage);
if (state.screen !== "settings") throw new Error("Home-settings E2E: 44px safe-top gear target missed");
await safePage.screenshot({ path: shot("round26-settings-safearea-390x844.png") });
await clickTarget(safePage, "settings.sound");
state = await debug(safePage);
if (state.settings.sound) throw new Error("Home-settings E2E: safe-area row target diverged from rendering");
await clickTarget(safePage, "menuBack");
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
await clickTarget(nativeSafePage, "homeSettings");
state = await debug(nativeSafePage);
if (state.screen !== "settings") {
  throw new Error("Home-settings E2E: native CSS safe-area gear target diverged from rendering");
}
await nativeSafePage.screenshot({ path: shot("round103-settings-native-safearea-390x844.png") });
await nativeSafePage.close();

await browser.close();
if (errors.length) throw new Error(`Home-settings browser errors:\n${errors.join("\n")}`);
console.log("Pre-run settings, shared pause values, persistence, 320x568, URL safe-area override, and native CSS safe-area collection passed.");
