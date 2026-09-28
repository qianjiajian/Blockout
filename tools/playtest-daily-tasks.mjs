import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/supplied-row-frames-2026-09-22/daily/regression/", import.meta.url));
const shot = (name) => resolve(output, name);
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const errors = [];
const page = await browser.newPage({ viewport: { width: 496, height: 1078 } });
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));
const debugPage = (targetPage) => targetPage.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const debug = () => debugPage(page);
const logicalPoint = async (targetPage, rect) => {
  const state = await debugPage(targetPage);
  const canvas = await targetPage.locator("canvas").boundingBox();
  if (!canvas || !rect) throw new Error("Daily Tasks E2E: missing canvas or target rect");
  return {
    x: canvas.x + state.viewportTransform.offsetX + (rect.x + rect.width / 2) * state.viewportTransform.scale,
    y: canvas.y + state.viewportTransform.offsetY + (rect.y + rect.height / 2) * state.viewportTransform.scale,
  };
};
const clickTarget = async (targetPage, key) => {
  const state = await debugPage(targetPage);
  const target = state.interactionTargets?.targets?.[key];
  if (!target) throw new Error(`Daily Tasks E2E: missing ${key}`);
  const point = await logicalPoint(targetPage, target.hit);
  await targetPage.mouse.click(point.x, point.y);
};

await page.goto(playtestUrl, { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(700);

let state = await debug();
if (state.screen !== "home" || !state.dailyTasks?.entryRect || !state.dailyTasks.art.entryReady) {
  throw new Error("Daily Tasks E2E: Home entry is not ready");
}
const overlaps = (left, right) => left.x < right.x + right.width
  && left.x + left.width > right.x
  && left.y < right.y + right.height
  && left.y + left.height > right.y;
if (overlaps(state.dailyTasks.entryRect, state.achievements.entryRect)
  || overlaps(state.dailyTasks.entryRect, state.collectionAlbum.entryRect)) {
  throw new Error("Daily Tasks E2E: Home shortcut overlaps an existing feature");
}
await page.screenshot({ path: shot("home-entry.png") });

await clickTarget(page, "homeMissions");
await page.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().dailyTasks.art.ready === true);
state = await debug();
if (state.screen !== "dailyTasks" || state.dailyTasks.entries.length !== 3
  || state.dailyTasks.art.splitAssetCount !== 16 || state.dailyTasks.art.loadedImages !== 15
  || !state.dailyTasks.art.inspirationReady) {
  throw new Error("Daily Tasks E2E: popup or split art did not initialize");
}
for (const [name, target] of Object.entries(state.interactionTargets.targets)) {
  if (!name.startsWith("dailyTask")) continue;
  if (target.cssWidth < 43.9 || target.cssHeight < 43.9) {
    throw new Error(`Daily Tasks E2E: ${name} is below the 44 CSS px target (${target.cssWidth}x${target.cssHeight})`);
  }
}
await page.screenshot({ path: shot("popup-empty.png") });

// The settlement reducer must be part of the immutable candidate, not a live
// click counter. Calling the private runtime method without committing lets us
// inspect that candidate without modifying the player's save.
const candidateAudit = await page.evaluate(() => {
  const game = window.__COLOR_ESCAPE__;
  const originalRun = game.save.activeRun;
  game.save.activeRun = {
    levelId: game.model.level.id,
    returnLevelId: game.model.level.id,
    daily: false,
    boosterSpent: { time: 0, rocket: 0, pulse: 0 },
  };
  const before = game.save.dailyTaskProgress.tasks.map((task) => ({ ...task }));
  const candidate = game.createPendingSettlement().candidateSave;
  game.save.activeRun = originalRun;
  return {
    before,
    after: candidate.dailyTaskProgress.tasks,
    activeRunCleared: candidate.activeRun === undefined,
  };
});
if (!candidateAudit.activeRunCleared
  || !candidateAudit.after.some((task, index) => task.progress > candidateAudit.before[index].progress)) {
  throw new Error("Daily Tasks E2E: successful settlement candidate did not advance daily progress atomically");
}

// Complete only the first task so an ambiguous claim can prove that another
// unfinished task cannot escape the frozen transaction and start gameplay.
await page.evaluate(() => {
  const gameState = window.__COLOR_ESCAPE__.getDebugState();
  const save = JSON.parse(localStorage.getItem("color-escape-save-v1"));
  save.dailyTaskProgress.tasks = save.dailyTaskProgress.tasks.map((task, index) => ({
    ...task,
    progress: index === 0 ? gameState.dailyTasks.entries[index].target : 0,
    claimed: false,
  }));
  save.dailyTaskProgress.bonusClaimed = false;
  localStorage.setItem("color-escape-save-v1", JSON.stringify(save));
});
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(600);
state = await debug();
await clickTarget(page, "homeMissions");
await page.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().dailyTasks.art.ready === true);
state = await debug();
if (state.dailyTasks.bonusClaimable || !state.dailyTasks.notificationVisible) {
  throw new Error("Daily Tasks E2E: single completed task did not expose the expected notification state");
}

const first = state.dailyTasks.entries[0];
const coinsBefore = state.economy.coins;
const inspirationBefore = state.dailyTasks.inspiration;
// Force the first claim into the ambiguous bridge path, then recover by
// retrying the exact pending candidate after storage is restored.
await page.evaluate(() => {
  window.__dailyStorageOriginal = {
    getItem: Storage.prototype.getItem,
    setItem: Storage.prototype.setItem,
  };
  Storage.prototype.getItem = () => { throw new Error("daily-e2e-read-unknown"); };
  Storage.prototype.setItem = () => { throw new Error("daily-e2e-write-unknown"); };
});
await clickTarget(page, `dailyTaskClaim.${first.id}`);
await page.waitForTimeout(100);
state = await debug();
if (state.economy.coins !== coinsBefore || state.dailyTasks.pendingClaimId !== first.id) {
  throw new Error("Daily Tasks E2E: ambiguous claim did not preserve the immutable pending candidate");
}
const pendingCandidate = await page.evaluate(() => JSON.stringify(window.__COLOR_ESCAPE__.pendingDailyTaskClaim?.candidateSave));
const unfinished = state.dailyTasks.entries.find((entry) => !entry.completed);
if (!unfinished) throw new Error("Daily Tasks E2E: missing unfinished task for transaction isolation check");
await clickTarget(page, `dailyTaskClaim.${unfinished.id}`);
await page.waitForTimeout(100);
state = await debug();
const pendingAfterEscapeAttempt = await page.evaluate(() => JSON.stringify(window.__COLOR_ESCAPE__.pendingDailyTaskClaim?.candidateSave));
if (state.screen !== "dailyTasks" || state.activeRun != null
  || state.dailyTasks.pendingClaimId !== first.id || pendingAfterEscapeAttempt !== pendingCandidate) {
  throw new Error("Daily Tasks E2E: unfinished task escaped or mutated the ambiguous claim transaction");
}
await page.evaluate(() => {
  Storage.prototype.getItem = window.__dailyStorageOriginal.getItem;
  Storage.prototype.setItem = window.__dailyStorageOriginal.setItem;
  delete window.__dailyStorageOriginal;
});
await clickTarget(page, `dailyTaskClaim.${first.id}`);
await page.waitForTimeout(180);
state = await debug();
if (state.economy.coins !== coinsBefore + first.rewardCoins
  || !state.dailyTasks.entries[0].claimed || state.dailyTasks.pendingClaimId != null) {
  throw new Error("Daily Tasks E2E: retry did not commit exactly one task reward");
}
if (state.completionFlow.coinFlight?.kind !== "coins") {
  throw new Error("Daily Tasks E2E: task reward did not start the coin flight");
}
const taskSource = state.dailyTasks.entries[0].rewardIconRect;
const taskFlightStart = state.completionFlow.coinFlight?.start;
if (!taskSource || !taskFlightStart
  || Math.abs(taskFlightStart.x - (taskSource.x + taskSource.width / 2)) > 0.01
  || Math.abs(taskFlightStart.y - (taskSource.y + taskSource.height / 2)) > 0.01) {
  throw new Error("Daily Tasks E2E: task coin flight did not start at the reward icon");
}
await page.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().completionFlow.coinFlight == null);
await clickTarget(page, `dailyTaskClaim.${first.id}`);
await page.waitForTimeout(100);
if ((await debug()).economy.coins !== coinsBefore + first.rewardCoins) {
  throw new Error("Daily Tasks E2E: repeated task claim duplicated coins");
}

// Finish the remaining tasks without coupling this transaction test to a
// mutable authored route, then exercise the all-complete chest.
await page.evaluate(() => {
  const gameState = window.__COLOR_ESCAPE__.getDebugState();
  const save = JSON.parse(localStorage.getItem("color-escape-save-v1"));
  save.dailyTaskProgress.tasks = save.dailyTaskProgress.tasks.map((task, index) => ({
    ...task,
    progress: gameState.dailyTasks.entries[index].target,
  }));
  localStorage.setItem("color-escape-save-v1", JSON.stringify(save));
});
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(600);
state = await debug();
await clickTarget(page, "homeMissions");
await page.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().dailyTasks.art.ready === true);
state = await debug();
if (!state.dailyTasks.bonusClaimable) {
  throw new Error("Daily Tasks E2E: completed day did not expose the bonus chest");
}
await clickTarget(page, "dailyTaskBonus");
await page.waitForTimeout(180);
state = await debug();
if (!state.dailyTasks.bonusClaimed
  || state.economy.coins !== coinsBefore + first.rewardCoins
  || state.dailyTasks.inspiration !== inspirationBefore + 100
  || state.completionFlow.coinFlight?.kind !== "inspiration") {
  throw new Error("Daily Tasks E2E: daily inspiration bonus did not commit exactly once");
}
const inspirationSource = state.dailyTasks.bonusRewardIconRect;
const inspirationFlightStart = state.completionFlow.coinFlight?.start;
if (!inspirationSource || !inspirationFlightStart
  || Math.abs(inspirationFlightStart.x - (inspirationSource.x + inspirationSource.width / 2)) > 0.01
  || Math.abs(inspirationFlightStart.y - (inspirationSource.y + inspirationSource.height / 2)) > 0.01) {
  throw new Error("Daily Tasks E2E: inspiration flight did not start at the inspiration icon");
}
await page.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().completionFlow.coinFlight == null);
state = await debug();
if (state.completionFlow.coinFlight != null) throw new Error("Daily Tasks E2E: inspiration flight did not finish");
await page.waitForTimeout(100);
state = await debug();
if (state.interactionTargets.targets.dailyTaskBonus
  || state.economy.coins !== coinsBefore + first.rewardCoins
  || state.dailyTasks.inspiration !== inspirationBefore + 100) {
  throw new Error("Daily Tasks E2E: repeated bonus claim duplicated reward");
}
await page.screenshot({ path: shot("popup-completed.png") });

await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(600);
state = await debug();
if (!state.dailyTasks.entries[0].claimed || !state.dailyTasks.bonusClaimed
  || state.economy.coins !== coinsBefore + first.rewardCoins
  || state.dailyTasks.inspiration !== inspirationBefore + 100) {
  throw new Error("Daily Tasks E2E: claims did not survive reload");
}

const compactPage = await browser.newPage({ viewport: { width: 320, height: 568 } });
compactPage.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
compactPage.on("pageerror", (error) => errors.push(error.message));
await compactPage.goto(playtestUrl, { waitUntil: "networkidle" });
await compactPage.waitForTimeout(600);
let compact = await debugPage(compactPage);
await clickTarget(compactPage, "homeMissions");
await compactPage.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().dailyTasks.art.ready === true);
compact = await debugPage(compactPage);
for (const [name, target] of Object.entries(compact.interactionTargets.targets)) {
  if (!name.startsWith("dailyTask")) continue;
  if (target.cssWidth < 43.9 || target.cssHeight < 43.9) {
    throw new Error(`Daily Tasks compact E2E: ${name} is below 44 CSS px`);
  }
}
await compactPage.screenshot({ path: shot("popup-320x568.png") });
await compactPage.close();
await page.close();
await browser.close();

if (errors.length) throw new Error(`Daily Tasks browser errors:\n${errors.join("\n")}`);
console.log("Daily Tasks entry, split art, settlement reducer, ambiguous claim retry, idempotent rewards, reload, and compact layout passed.");
