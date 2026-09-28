import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/supplied-row-frames-2026-09-22/achievements/regression/", import.meta.url));
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });

const makeSave = ({ highestLevel = 11, completed = 10, coins = 1000 } = {}) => ({
  schemaVersion: 1,
  currentLevel: Math.min(highestLevel, 10),
  highestLevel,
  coins,
  sound: true,
  haptic: true,
  reducedMotion: false,
  language: "zh-CN",
  featureSeen: ["basics"],
  // Isolate achievement interactions from the unrelated booster-unlock toast.
  boosterUnlockSeen: ["time", "rocket", "pulse"],
  metaDiscovery: { collectionViewedItemIds: [] },
  boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: Object.fromEntries(Array.from({ length: completed }, (_, index) => [`${index + 1}`, 3])),
  bestMoves: {},
  rewardedLevels: Array.from({ length: completed }, (_, index) => index + 1),
  journeyProgress: { claimedMilestoneLevels: [], seenEpisodeUnlockLevels: [] },
  achievementProgress: { claimedIds: [] },
  selectedJourneyEpisode: 1,
  dailyStreak: 0,
  lastDailyCompletedDay: "",
  lastSeenUpdate: "2026-09-10-r118",
});

const browser = await chromium.launch({ headless: true });
const errors = [];
const debug = (page) => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const logicalPoint = async (page, rect) => {
  const state = await debug(page);
  const canvas = await page.locator("canvas").boundingBox();
  if (!canvas || !rect) throw new Error("Achievements E2E: missing canvas or target rect");
  return {
    x: canvas.x + state.viewportTransform.offsetX + (rect.x + rect.width / 2) * state.viewportTransform.scale,
    y: canvas.y + state.viewportTransform.offsetY + (rect.y + rect.height / 2) * state.viewportTransform.scale,
  };
};
const clickTarget = async (page, key) => {
  const state = await debug(page);
  const target = state.interactionTargets?.targets?.[key];
  if (!target) throw new Error(`Achievements E2E: missing ${key}`);
  const point = await logicalPoint(page, target.hit);
  await page.mouse.click(point.x, point.y);
  if (key === "homeAchievements") {
    await page.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().achievements.art.ready);
  }
};
const seed = async (page, save) => {
  await page.goto(playtestUrl, { waitUntil: "networkidle" });
  await page.evaluate((value) => localStorage.setItem("color-escape-save-v1", JSON.stringify(value)), save);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(450);
};
const attachErrors = (page) => {
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("navigator.vibrate")) errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.stack ?? error.message));
};

const page = await browser.newPage({ viewport: { width: 496, height: 1078 } });
attachErrors(page);
const legacyFreshSave = makeSave({ highestLevel: 1, completed: 0 });
delete legacyFreshSave.achievementProgress;
await seed(page, legacyFreshSave);
let state = await debug(page);
if (state.achievements.notificationVisible || state.achievements.claimableIds.length !== 0) {
  throw new Error("Achievements E2E: a fresh legacy save incorrectly shows a claimable red dot");
}
await clickTarget(page, "homeAchievements");
state = await debug(page);
if (state.screen !== "achievements" || state.achievements.entries.length !== 19
  || state.achievements.art.loadedImages !== 12 || state.achievements.art.splitAssetCount !== 12) {
  throw new Error("Achievements E2E: legacy save did not receive the compatible empty achievement catalog");
}
await clickTarget(page, "achievementClose");

await seed(page, makeSave());
state = await debug(page);
if (!state.achievements.notificationVisible) throw new Error("Achievements E2E: claimable Home red dot missing");
const homeEntry = state.interactionTargets.targets.homeAchievements;
if (!homeEntry || homeEntry.cssWidth < 44 || homeEntry.cssHeight < 44) {
  throw new Error("Achievements E2E: Home entry is below the minimum touch target");
}
await page.screenshot({ path: resolve(output, "home-entry-red-dot.png") });
await clickTarget(page, "homeAchievements");
state = await debug(page);
if (state.screen !== "achievements" || state.achievements.entries.length !== 19
  || state.achievements.art.loadedImages !== 12 || state.achievements.art.splitAssetCount !== 12) {
  throw new Error("Achievements E2E: modal or 19-entry catalog missing");
}
await page.screenshot({ path: resolve(output, "achievement-modal.png") });

await clickTarget(page, "achievementClaim.levels-1");
state = await debug(page);
if (state.economy.coins !== 1050 || !state.achievements.claimedIds.includes("levels-1")) {
  throw new Error("Achievements E2E: confirmed claim did not atomically credit coins and mark claimed");
}
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(250);
state = await debug(page);
if (state.economy.coins !== 1050 || !state.achievements.claimedIds.includes("levels-1")) {
  throw new Error("Achievements E2E: claimed reward did not survive reload");
}

await clickTarget(page, "homeAchievements");
await page.evaluate(() => {
  globalThis.__ACHIEVEMENT_SET_ITEM__ = Storage.prototype.setItem;
  Storage.prototype.setItem = function setItem(key, value) {
    if (key === "color-escape-save-v1") throw new Error("intentional achievement write rejection");
    return globalThis.__ACHIEVEMENT_SET_ITEM__.call(this, key, value);
  };
});
await clickTarget(page, "achievementClaim.levels-10");
state = await debug(page);
if (state.economy.coins !== 1050 || state.achievements.claimedIds.includes("levels-10")
  || !state.achievements.claimableIds.includes("levels-10")) {
  throw new Error("Achievements E2E: rejected write changed coins, claimed state, or red-dot eligibility");
}
await page.evaluate(() => { Storage.prototype.setItem = globalThis.__ACHIEVEMENT_SET_ITEM__; });
await clickTarget(page, "achievementClaim.levels-10");
state = await debug(page);
if (state.economy.coins !== 1150 || !state.achievements.claimedIds.includes("levels-10")) {
  throw new Error("Achievements E2E: retry after rejected write did not claim exactly once");
}
await page.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().completionFlow.coinFlight == null);
await clickTarget(page, "achievementClose");
state = await debug(page);
if (state.screen !== "home") throw new Error("Achievements E2E: close did not return Home");
if (state.achievements.art.loadedImages !== 0) throw new Error("Achievements E2E: close retained popup art");
await page.close();

const small = await browser.newPage({ viewport: { width: 320, height: 568 } });
attachErrors(small);
await seed(small, makeSave({ highestLevel: 100, completed: 100 }));
await clickTarget(small, "homeAchievements");
state = await debug(small);
const viewport = await small.evaluate(() => window.__COLOR_ESCAPE__.achievementViewportRect());
const start = await logicalPoint(small, { ...viewport, y: viewport.y + viewport.height * 0.65, height: 1 });
await small.mouse.move(start.x, start.y);
await small.mouse.down();
await small.mouse.move(start.x, start.y - 260, { steps: 8 });
await small.mouse.up();
state = await debug(small);
if (state.achievements.scrollOffset <= 0 || state.achievements.maxScrollOffset <= 0) {
  throw new Error("Achievements E2E: small-screen list did not scroll");
}
const close = state.interactionTargets.targets.achievementClose;
if (!close || close.cssWidth < 44 || close.cssHeight < 44) {
  throw new Error("Achievements E2E: small-screen close target is below 44 CSS px");
}
await small.screenshot({ path: resolve(output, "achievement-modal-320x568-scrolled.png") });
await small.close();

await browser.close();
if (errors.length) throw new Error(`Achievements browser errors:\n${errors.join("\n")}`);
console.log("Achievements entry, notification, popup, 19-tier catalog, exactly-once claim, rejected-write recovery, reload persistence, and 320x568 scrolling passed.");
