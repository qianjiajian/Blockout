import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const url = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5180/";
const out = "playtest-results/level7-rocket-rescue";
const key = "color-escape-save-v1";
await mkdir(out, { recursive: true });

const save = {
  schemaVersion: 1,
  currentLevel: 7,
  highestLevel: 7,
  coins: 1000,
  sound: false,
  haptic: false,
  reducedMotion: true,
  featureSeen: ["basics"],
  boosterUnlockSeen: ["time", "rocket", "pulse"],
  metaDiscovery: { collectionViewedThroughLevel: 7, dailyUnlockSeen: false },
  boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: {}, bestMoves: {}, rewardedLevels: [],
  dailyStreak: 0, lastDailyCompletedDay: "", lastSeenUpdate: "",
};

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 496, height: 1078 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));
await page.goto(url, { waitUntil: "networkidle" });
const updateId = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState().updateNotice.id);
await page.evaluate(({ key: storageKey, value, update }) => {
  localStorage.setItem(storageKey, JSON.stringify({ ...value, lastSeenUpdate: update }));
}, { key, value: save, update: updateId });
await page.reload({ waitUntil: "networkidle" });
await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready === true, undefined, { timeout: 15_000 });
await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(7, true));
await page.waitForTimeout(180);

const read = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const before = await read();
await page.evaluate(() => {
  const game = window.__COLOR_ESCAPE__;
  game.model.beginAction();
  if (!game.model.tryExit("cc-piece-04", "top").ok) throw new Error("Lv7 rescue: opening pink exit failed");
  if (!game.model.commitAction()) throw new Error("Lv7 rescue: opening exit did not commit");
});
await page.waitForTimeout(180);
const deadlock = await read();
if (!deadlock.rocketRescueGuide.visible || deadlock.rocketRescueGuide.phase !== "booster") {
  throw new Error(`Lv7 rescue: booster guide missing ${JSON.stringify(deadlock.rocketRescueGuide)}`);
}
await page.screenshot({ path: `${out}/01-deadlock-booster-guide.png` });

const clickLogical = async (logicalX, logicalY) => {
  const state = await read();
  const bounds = await page.locator("canvas").boundingBox();
  if (!bounds) throw new Error("Lv7 rescue: canvas bounds missing");
  await page.mouse.click(
    bounds.x + state.viewportTransform.offsetX + logicalX * state.viewportTransform.scale,
    bounds.y + state.viewportTransform.offsetY + logicalY * state.viewportTransform.scale,
  );
};
const rocket = deadlock.rocketRescueGuide.booster;
await clickLogical(rocket.x + rocket.width / 2, rocket.y + rocket.height / 2);
await page.waitForTimeout(80);
const targetGuide = await read();
if (!targetGuide.rocketRescueGuide.visible || targetGuide.rocketRescueGuide.phase !== "target") {
  throw new Error(`Lv7 rescue: target guide missing ${JSON.stringify(targetGuide.rocketRescueGuide)}`);
}
await page.screenshot({ path: `${out}/02-deadlock-target-guide.png` });

const target = targetGuide.rocketRescueGuide.targetBlock;
if (target.id !== "strategy-guard-12" || target.x !== 1 || target.y !== 2 || target.color !== "red" || target.shape.length !== 4
  || target.shape.some(([x, y]) => x < 0 || x > 1 || y < 0 || y > 1)) {
  throw new Error(`Lv7 rescue: expected the four-cell red target guide ${JSON.stringify(target)}`);
}
const board = targetGuide.board;
const shape = target.shape;
const centerX = shape.reduce((sum, [x]) => sum + x + 0.5, 0) / shape.length;
const centerY = shape.reduce((sum, [, y]) => sum + y + 0.5, 0) / shape.length;
await clickLogical(board.innerX + (target.x + centerX) * board.cell, board.innerY + (target.y + centerY) * board.cell);
await page.waitForTimeout(180);
const rescued = await read();
if (rescued.rocketRescueGuide.visible || rescued.economy.boosters.rocket !== 3) {
  throw new Error(`Lv7 rescue: target did not commit deferred use ${JSON.stringify({ guide: rescued.rocketRescueGuide, economy: rescued.economy })}`);
}
const settlement = await page.evaluate(() => {
  const game = window.__COLOR_ESCAPE__;
  if (game.save.activeRun?.boosterSpent.rocket !== 1) {
    throw new Error(`Lv7 rescue: expected one reserved rocket ${JSON.stringify(game.save.activeRun)}`);
  }
  // Complete the post-rescue state through the authoritative model so the
  // settlement candidate can be inspected without waiting through a browser route.
  while (game.model.snapshot().blocks.length > 0) {
    const block = game.model.snapshot().blocks.find((candidate) => game.model.isBlockActive(candidate));
    if (!block) throw new Error("Lv7 rescue: post-rescue model has no active completion move");
    game.model.beginAction();
    if (!game.model.removeBlockWithBooster(block.id).ok || !game.model.commitAction()) {
      throw new Error(`Lv7 rescue: completion fixture could not clear ${block.id}`);
    }
  }
  const pending = game.createPendingSettlement();
  return {
    complete: game.model.snapshot().complete,
    reserved: game.save.activeRun?.boosterSpent.rocket ?? 0,
    candidateRocketStock: pending.candidateSave.boosters.rocket,
  };
});
if (!settlement.complete || settlement.reserved !== 1 || settlement.candidateRocketStock !== 2) {
  throw new Error(`Lv7 rescue: successful settlement did not deduct once ${JSON.stringify(settlement)}`);
}

const second = await page.evaluate(() => {
  const game = window.__COLOR_ESCAPE__;
  game.loadLevel(7, true);
  return game.getDebugState().economy.boosters.rocket;
});
await page.waitForTimeout(120);
const reentry = await read();
if (second !== 3 || reentry.rocketRescueGuide.visible) {
  throw new Error(`Lv7 rescue: re-entry should reset without false guide ${JSON.stringify({ second, guide: reentry.rocketRescueGuide })}`);
}
await page.evaluate(() => {
  const game = window.__COLOR_ESCAPE__;
  game.model.beginAction();
  if (!game.model.tryExit("cc-piece-04", "top").ok || !game.model.commitAction()) throw new Error("Lv7 rescue: re-entry opening failed");
});
await page.waitForTimeout(140);
const reentryDeadlock = await read();
if (!reentryDeadlock.rocketRescueGuide.visible || reentryDeadlock.rocketRescueGuide.phase !== "booster") {
  throw new Error(`Lv7 rescue: re-entry deadlock did not re-trigger guide ${JSON.stringify(reentryDeadlock.rocketRescueGuide)}`);
}

await page.screenshot({ path: `${out}/level7-reentry.png` });
await writeFile(`${out}/report.json`, JSON.stringify({
  status: "PASS",
  errors,
  before: { screen: before.screen, levelId: before.puzzle.levelId },
  deadlock: { moves: deadlock.puzzle.moves, guide: deadlock.rocketRescueGuide },
  targetGuide: { guide: targetGuide.rocketRescueGuide, stock: targetGuide.economy.boosters.rocket },
  rescued: { guide: rescued.rocketRescueGuide, stock: rescued.economy.boosters.rocket },
  settlement,
  reentry: { stock: second, guideBeforeDeadlock: reentry.rocketRescueGuide, guideAtDeadlock: reentryDeadlock.rocketRescueGuide },
}, null, 2));
await browser.close();
console.log(`${out}/report.json`);
