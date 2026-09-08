import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/five-tab-navigation/", import.meta.url));
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 720, height: 1584 }, deviceScaleFactor: 1 });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));

const bestStars = Object.fromEntries(Array.from({ length: 57 }, (_, index) => [String(index + 1), 1 + index % 3]));
const bestMoves = Object.fromEntries(Array.from({ length: 20 }, (_, index) => [String(index + 1), 8 + index % 7]));
const save = {
  schemaVersion: 1,
  currentLevel: 58,
  highestLevel: 58,
  coins: 1640,
  sound: false,
  haptic: false,
  reducedMotion: false,
  featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter", "generator", "elevator"],
  boosters: { time: 2, rocket: 4, pulse: 1 },
  bestStars,
  bestMoves,
  rewardedLevels: Array.from({ length: 57 }, (_, index) => index + 1),
  dailyStreak: 3,
  lastDailyCompletedDay: "",
  lastSeenUpdate: "2026-09-05-r95",
};

await page.goto(playtestUrl, { waitUntil: "networkidle" });
await page.evaluate((value) => localStorage.setItem("color-escape-save-v1", JSON.stringify(value)), save);
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(350);

const debug = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const logicalPoint = async (x, y) => {
  const state = await debug();
  const bounds = await page.locator("canvas").boundingBox();
  if (!bounds) throw new Error("Five-tab E2E: canvas bounds are unavailable");
  return {
    x: bounds.x + state.viewportTransform.offsetX + x * state.viewportTransform.scale,
    y: bounds.y + state.viewportTransform.offsetY + y * state.viewportTransform.scale,
  };
};
const clickLogical = async (x, y, waitMs = 260) => {
  const point = await logicalPoint(x, y);
  await page.mouse.click(point.x, point.y);
  await page.waitForTimeout(waitMs);
  return debug();
};
const capture = (name) => page.screenshot({ path: resolve(output, name) });

let state = await debug();
if (state.screen !== "home" || !state.navigation.artReady || state.navigation.tabs.length !== 5) {
  throw new Error(`Five-tab E2E: home navigation did not initialize (${JSON.stringify(state.navigation)})`);
}
await capture("01-home-720x1584.png");

const shopTabPoint = await logicalPoint(50, 1028);
const homeTabPoint = await logicalPoint(248, 1028);
const movingShopBuyPoint = await logicalPoint(377, 450);
await page.mouse.click(shopTabPoint.x, shopTabPoint.y);
await page.waitForTimeout(20);
state = await debug();
if (state.screen !== "supply" || state.supply.items.length !== 3
  || state.navigation.transition?.from !== "home" || state.navigation.transition?.to !== "supply"
  || state.navigation.transition.direction !== -1
  || state.navigation.transition.progress <= 0 || state.navigation.transition.progress >= 1
  || Math.abs(state.navigation.transition.duration - 0.2) > 0.001) {
  throw new Error(`Five-tab E2E: Shop transition did not match the measured 200ms contract (${JSON.stringify(state.navigation.transition)})`);
}
await page.waitForTimeout(220);
state = await debug();
if (state.navigation.transition || state.screen !== "supply") {
  throw new Error("Five-tab E2E: forward Shop slide did not settle cleanly");
}
await page.mouse.click(homeTabPoint.x, homeTabPoint.y);
await page.waitForTimeout(45);
state = await debug();
if (state.navigation.transition?.from !== "supply" || state.navigation.transition?.to !== "home"
  || state.navigation.transition.direction !== 1) {
  throw new Error(`Five-tab E2E: reverse-direction slide is wrong (${JSON.stringify(state.navigation.transition)})`);
}
await page.waitForTimeout(220);
await page.mouse.click(shopTabPoint.x, shopTabPoint.y);
await page.waitForTimeout(45);
state = await debug();
if (state.navigation.transition?.from !== "home" || state.navigation.transition?.to !== "supply"
  || state.navigation.transition.direction !== -1) {
  throw new Error("Five-tab E2E: input-guard slide did not start from Home");
}
const coinsBeforeMovingPageTap = state.economy.coins;
await page.mouse.click(movingShopBuyPoint.x, movingShopBuyPoint.y);
state = await debug();
if (!state.navigation.transition || state.economy.coins !== coinsBeforeMovingPageTap) {
  throw new Error(`Five-tab E2E: moving page accepted a content action or failed to settle (${JSON.stringify({
    transition: state.navigation.transition,
    coinsBeforeMovingPageTap,
    coinsAfterMovingPageTap: state.economy.coins,
  })})`);
}
await page.waitForTimeout(220);
state = await debug();
if (state.navigation.transition || state.economy.coins !== coinsBeforeMovingPageTap) {
  throw new Error("Five-tab E2E: Shop slide did not settle cleanly after its input guard");
}
await capture("02-shop-720x1584.png");

state = await clickLogical(149, 1028);
if (state.screen !== "leaderboard" || state.leaderboard.mode !== "chapters"
  || state.leaderboard.entries.length !== 5 || state.leaderboard.totalEntries !== 10
  || state.leaderboard.page !== 0 || state.leaderboard.pageCount !== 2 || state.leaderboard.firstRank !== 1) {
  throw new Error("Five-tab E2E: Leaderboard did not open real chapter records");
}
await capture("03-leaderboard-chapters-720x1584.png");
state = await clickLogical(415, 936);
if (state.leaderboard.mode !== "chapters" || state.leaderboard.page !== 1
  || state.leaderboard.firstRank !== 6 || state.leaderboard.entries.length !== 5
  || state.leaderboard.canGoForward || !state.leaderboard.canGoBack) {
  throw new Error(`Five-tab E2E: chapter page two did not preserve global ranks (${JSON.stringify(state.leaderboard)})`);
}
await capture("03b-leaderboard-chapters-page-2-720x1584.png");
state = await clickLogical(415, 936);
if (state.leaderboard.page !== 1) throw new Error("Five-tab E2E: disabled final chapter page advanced out of range");
state = await clickLogical(337, 303);
if (state.leaderboard.mode !== "efficiency" || state.leaderboard.entries.length !== 5
  || state.leaderboard.totalEntries !== 20 || state.leaderboard.page !== 0
  || state.leaderboard.pageCount !== 4 || state.leaderboard.firstRank !== 1) {
  throw new Error("Five-tab E2E: efficiency ranking did not use saved best moves");
}
await capture("04-leaderboard-efficiency-720x1584.png");
state = await clickLogical(415, 936);
if (state.leaderboard.page !== 1 || state.leaderboard.firstRank !== 6 || state.leaderboard.entries.length !== 5) {
  throw new Error(`Five-tab E2E: efficiency page two lost saved records (${JSON.stringify(state.leaderboard)})`);
}
await capture("04b-leaderboard-efficiency-page-2-720x1584.png");
state = await clickLogical(159, 303);
if (state.leaderboard.mode !== "chapters" || state.leaderboard.page !== 1 || state.leaderboard.firstRank !== 6) {
  throw new Error(`Five-tab E2E: chapter and efficiency page memory were not independent (${JSON.stringify(state.leaderboard)})`);
}
state = await clickLogical(81, 936);
if (state.leaderboard.page !== 0 || state.leaderboard.firstRank !== 1) throw new Error("Five-tab E2E: chapter previous page did not return to rank one");

state = await clickLogical(248, 1028);
if (state.screen !== "home") throw new Error("Five-tab E2E: Home did not restore the main hub");

state = await clickLogical(347, 1028);
if (state.screen !== "levels" || state.levelPage !== 5) throw new Error("Five-tab E2E: Journey did not center the current ten-level segment");
await capture("05-journey-720x1584.png");
state = await clickLogical(306, 356);
if (state.screen !== "home" || state.level.id !== 58) throw new Error("Five-tab E2E: Journey node did not select level 58");

state = await clickLogical(446, 1028);
if (state.screen !== "records" || state.collection.category !== "colors"
  || state.collection.total !== 8 || state.collection.allTotal !== 19 || state.collection.unlocked !== 8) {
  throw new Error(`Five-tab E2E: Collection progress is wrong (${JSON.stringify(state.collection)})`);
}
await capture("06-collection-720x1584.png");
state = await clickLogical(353, 147);
if (state.collection.category !== "mechanisms" || state.collection.total !== 11 || state.collection.unlocked !== 8) {
  throw new Error(`Five-tab E2E: Mechanism guide did not expose current progress (${JSON.stringify(state.collection)})`);
}
state = await clickLogical(248, 652);
if (state.collection.selected !== 10 || state.collection.selectedId !== "star" || state.screen !== "records") {
  throw new Error("Five-tab E2E: locked mechanism card did not remain inspectable");
}
await capture("07-collection-locked-detail-720x1584.png");

const leaderboardTabPoint = await logicalPoint(149, 1028);
const journeyTabPoint = await logicalPoint(347, 1028);
await page.mouse.click(shopTabPoint.x, shopTabPoint.y);
await page.waitForTimeout(20);
await page.mouse.click(leaderboardTabPoint.x, leaderboardTabPoint.y);
await page.waitForTimeout(15);
await page.mouse.click(journeyTabPoint.x, journeyTabPoint.y);
await page.waitForTimeout(20);
state = await debug();
if (state.screen !== "supply" || state.navigation.selected !== "levels"
  || state.navigation.transition?.from !== "records" || state.navigation.transition?.to !== "supply"
  || state.navigation.transition.pendingTarget !== "levels") {
  throw new Error(`Five-tab E2E: third-tab retarget jumped instead of queuing the latest destination (${JSON.stringify({
    screen: state.screen,
    selected: state.navigation.selected,
    transition: state.navigation.transition,
  })})`);
}
await page.waitForTimeout(165);
state = await debug();
if (state.screen !== "levels" || state.navigation.transition?.from !== "supply"
  || state.navigation.transition?.to !== "levels" || state.navigation.transition.pendingTarget) {
  throw new Error(`Five-tab E2E: queued destination did not start from the settled intermediate page (${JSON.stringify(state.navigation.transition)})`);
}
await page.waitForTimeout(220);
state = await debug();
if (state.screen !== "levels" || state.navigation.transition) {
  throw new Error("Five-tab E2E: rapid tab retarget did not settle on the latest Journey target");
}

await page.mouse.click(leaderboardTabPoint.x, leaderboardTabPoint.y);
await page.waitForTimeout(240);
state = await debug();
if (state.screen !== "leaderboard" || state.navigation.transition) {
  throw new Error("Five-tab E2E: Leaderboard setup for reverse testing did not settle");
}

await page.mouse.click(homeTabPoint.x, homeTabPoint.y);
await page.waitForTimeout(55);
const beforeReverse = await debug();
await page.mouse.click(leaderboardTabPoint.x, leaderboardTabPoint.y);
await page.waitForTimeout(5);
state = await debug();
if (!beforeReverse.navigation.transition || !state.navigation.transition) {
  throw new Error(`Five-tab E2E: source-tab reversal lost its active transition (${JSON.stringify({
    before: beforeReverse.navigation.transition,
    after: state.navigation.transition,
  })})`);
}
const beforeVisualProgress = beforeReverse.navigation.transition.progress;
const reversedVisualProgress = state.navigation.transition.progress;
const reversedFirstFrameTravel = reversedVisualProgress - state.navigation.transition.startProgress;
if (beforeReverse.navigation.transition.from !== "leaderboard" || beforeReverse.navigation.transition.to !== "home"
  || state.screen !== "leaderboard" || state.navigation.transition.from !== "home"
  || state.navigation.transition.to !== "leaderboard" || state.navigation.transition.direction !== -1
  || state.navigation.transition.pendingTarget || state.navigation.transition.easing !== "smooth"
  || state.navigation.transition.startProgress <= 0
  || state.navigation.transition.startProgress > 1 - beforeVisualProgress + 0.01
  || reversedFirstFrameTravel < 0 || reversedFirstFrameTravel > 0.05) {
  throw new Error(`Five-tab E2E: source-tab reversal was not visually continuous (${JSON.stringify({
    before: beforeReverse.navigation.transition,
    after: state.navigation.transition,
    beforeVisualProgress,
    reversedVisualProgress,
    reversedFirstFrameTravel,
  })})`);
}
await page.waitForTimeout(220);
state = await debug();
if (state.screen !== "leaderboard" || state.navigation.transition) {
  throw new Error("Five-tab E2E: continuous source-tab reversal did not settle on Leaderboard");
}

await page.setViewportSize({ width: 320, height: 568 });
await page.waitForTimeout(120);
for (const [index, expected] of ["supply", "leaderboard", "home", "levels", "records"].entries()) {
  state = await clickLogical(index * 99.2 + 49.6, 1028);
  if (state.screen !== expected) throw new Error(`Five-tab E2E: 320×568 ${expected} target missed (${JSON.stringify({ screen: state.screen, viewportTransform: state.viewportTransform })})`);
  if (expected === "leaderboard") {
    state = await clickLogical(415, 936);
    if (state.leaderboard.page !== 1 || state.leaderboard.firstRank !== 6) {
      throw new Error(`Five-tab E2E: 320×568 leaderboard pager missed (${JSON.stringify(state.leaderboard)})`);
    }
    state = await clickLogical(81, 936);
    if (state.leaderboard.page !== 0) throw new Error("Five-tab E2E: 320×568 leaderboard previous pager missed");
  }
}
await capture("08-five-tabs-320x568.png");

const safeUrl = new URL(playtestUrl);
safeUrl.searchParams.set("safeTop", "44");
safeUrl.searchParams.set("safeBottom", "34");
const safePage = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
safePage.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
safePage.on("pageerror", (error) => errors.push(error.message));
await safePage.goto(safeUrl.href, { waitUntil: "networkidle" });
await safePage.evaluate((value) => localStorage.setItem("color-escape-save-v1", JSON.stringify(value)), save);
await safePage.reload({ waitUntil: "networkidle" });
await safePage.waitForTimeout(350);

const safeDebug = () => safePage.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const safePoint = async (x, y) => {
  const safeState = await safeDebug();
  const bounds = await safePage.locator("canvas").boundingBox();
  if (!bounds) throw new Error("Five-tab E2E: safe-area canvas bounds are unavailable");
  return {
    x: bounds.x + safeState.viewportTransform.offsetX + x * safeState.viewportTransform.scale,
    y: bounds.y + safeState.viewportTransform.offsetY + y * safeState.viewportTransform.scale,
  };
};
const safeClick = async (x, y, waitMs = 260) => {
  const point = await safePoint(x, y);
  await safePage.mouse.click(point.x, point.y);
  await safePage.waitForTimeout(waitMs);
  return safeDebug();
};

state = await safeDebug();
if (state.navigation.safe.top <= 0 || state.navigation.safe.bottom <= 0
  || 34 + state.navigation.headerOffset < state.navigation.safe.top
  || state.navigation.bar.y + state.navigation.bar.height > 1078.01) {
  throw new Error(`Five-tab E2E: unsafe shared page geometry (${JSON.stringify(state.navigation)})`);
}
const safeTabY = state.navigation.bar.y + state.navigation.bar.height / 2;
state = await safeClick(49.6, safeTabY);
if (state.screen !== "supply" || state.navigation.supplyContentBottom > state.navigation.bar.y - 11.9) {
  throw new Error(`Five-tab E2E: Shop overlaps the safe navigation (${JSON.stringify(state.navigation)})`);
}
await safePage.screenshot({ path: resolve(output, "09-shop-safearea-390x844.png") });

state = await safeClick(148.8, safeTabY);
if (state.screen !== "leaderboard" || state.navigation.leaderboardFooterBottom > state.navigation.bar.y) {
  throw new Error(`Five-tab E2E: safe-area Leaderboard footer overlaps navigation (${JSON.stringify(state.navigation)})`);
}
await safePage.screenshot({ path: resolve(output, "10-leaderboard-safearea-390x844.png") });
state = await safeClick(415, 943 - state.navigation.safe.bottom);
if (state.leaderboard.page !== 1 || state.leaderboard.firstRank !== 6) {
  throw new Error(`Five-tab E2E: safe-area Leaderboard next-page target diverged from drawing (${JSON.stringify(state.leaderboard)})`);
}
await safePage.screenshot({ path: resolve(output, "10b-leaderboard-page-2-safearea-390x844.png") });
state = await safeClick(81, 943 - state.navigation.safe.bottom);
if (state.leaderboard.page !== 0) throw new Error("Five-tab E2E: safe-area Leaderboard previous-page target diverged from drawing");

state = await safeClick(248, safeTabY);
if (state.screen !== "home") throw new Error("Five-tab E2E: safe-area Home target missed");

state = await safeClick(347.2, safeTabY);
if (state.screen !== "levels" || state.navigation.journeyFooterBottom > state.navigation.bar.y) {
  throw new Error(`Five-tab E2E: Journey footer overlaps the safe navigation (${JSON.stringify(state.navigation)})`);
}
await safePage.screenshot({ path: resolve(output, "11-journey-safearea-390x844.png") });
state = await safeClick(415, 943 - state.navigation.safe.bottom);
if (state.levelPage !== 6) throw new Error("Five-tab E2E: safe-area Journey next-segment target diverged from drawing");
state = await safeClick(81, 943 - state.navigation.safe.bottom);
if (state.levelPage !== 5) throw new Error("Five-tab E2E: safe-area Journey previous-segment target diverged from drawing");

state = await safeClick(446.4, safeTabY);
if (state.screen !== "records") throw new Error("Five-tab E2E: safe-area Collection target missed");
await safePage.screenshot({ path: resolve(output, "12-collection-safearea-390x844.png") });
await safePage.close();

const reducedPage = await browser.newPage({ viewport: { width: 496, height: 1078 }, deviceScaleFactor: 1 });
reducedPage.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
reducedPage.on("pageerror", (error) => errors.push(error.message));
await reducedPage.goto(playtestUrl, { waitUntil: "networkidle" });
await reducedPage.evaluate((value) => localStorage.setItem("color-escape-save-v1", JSON.stringify(value)), { ...save, reducedMotion: true });
await reducedPage.reload({ waitUntil: "networkidle" });
await reducedPage.waitForTimeout(300);
await reducedPage.mouse.click(50, 1028);
await reducedPage.waitForTimeout(30);
state = await reducedPage.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
if (state.screen !== "supply" || state.navigation.transition) {
  throw new Error("Five-tab E2E: reduced motion did not use an immediate page switch");
}
await reducedPage.screenshot({ path: resolve(output, "14-reduced-motion-immediate-shop.png") });
await reducedPage.close();

const emptyPage = await browser.newPage({ viewport: { width: 320, height: 568 }, deviceScaleFactor: 1 });
emptyPage.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
emptyPage.on("pageerror", (error) => errors.push(error.message));
await emptyPage.goto(playtestUrl, { waitUntil: "networkidle" });
await emptyPage.evaluate((value) => localStorage.setItem("color-escape-save-v1", JSON.stringify(value)), { ...save, bestMoves: {} });
await emptyPage.reload({ waitUntil: "networkidle" });
await emptyPage.waitForTimeout(300);
const emptyDebug = () => emptyPage.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const emptyClick = async (x, y, waitMs = 260) => {
  const emptyState = await emptyDebug();
  const bounds = await emptyPage.locator("canvas").boundingBox();
  if (!bounds) throw new Error("Five-tab E2E: empty-state canvas bounds are unavailable");
  await emptyPage.mouse.click(
    bounds.x + emptyState.viewportTransform.offsetX + x * emptyState.viewportTransform.scale,
    bounds.y + emptyState.viewportTransform.offsetY + y * emptyState.viewportTransform.scale,
  );
  await emptyPage.waitForTimeout(waitMs);
  return emptyDebug();
};
state = await emptyClick(149, 1028);
state = await emptyClick(337, 303);
if (state.screen !== "leaderboard" || state.leaderboard.mode !== "efficiency"
  || state.leaderboard.entries.length !== 0 || state.leaderboard.totalEntries !== 0
  || state.leaderboard.page !== 0 || state.leaderboard.pageCount !== 1
  || state.leaderboard.canGoBack || state.leaderboard.canGoForward) {
  throw new Error(`Five-tab E2E: empty efficiency leaderboard state is invalid (${JSON.stringify(state.leaderboard)})`);
}
await emptyPage.screenshot({ path: resolve(output, "15-leaderboard-empty-efficiency-320x568.png") });
state = await emptyClick(415, 936);
if (state.leaderboard.page !== 0 || state.leaderboard.totalEntries !== 0) {
  throw new Error("Five-tab E2E: empty efficiency leaderboard advanced out of range");
}
await emptyPage.close();

await browser.close();
if (errors.length) throw new Error(`Five-tab browser errors:\n${errors.join("\n")}`);
console.log("Five-tab content, complete local leaderboard paging, 200ms directional slides, continuous reversal/latest-target queue, moving-page input guard, reduced motion, and 720×1584/320×568/44×34 targets passed.");
