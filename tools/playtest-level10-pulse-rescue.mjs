import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const url = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5180/";
const out = "playtest-results/level10-pulse-rescue";
const key = "color-escape-save-v1";
await mkdir(out, { recursive: true });

const save = {
  schemaVersion: 1,
  currentLevel: 10,
  highestLevel: 10,
  coins: 1000,
  sound: false,
  haptic: false,
  reducedMotion: true,
  featureSeen: ["basics"],
  boosterUnlockSeen: ["time", "rocket", "pulse"],
  metaDiscovery: { collectionViewedThroughLevel: 10, dailyUnlockSeen: false },
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
await page.evaluate(({ storageKey, value, update }) => {
  localStorage.setItem(storageKey, JSON.stringify({ ...value, lastSeenUpdate: update }));
}, { storageKey: key, value: save, update: updateId });
await page.reload({ waitUntil: "networkidle" });
await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready === true, undefined, { timeout: 15_000 });
await page.evaluate(() => {
  const game = window.__COLOR_ESCAPE__;
  game.loadLevel(10, true);
  game.model.startCountdown();
  const openingTarget = game.model.snapshot().blocks.find((block) => block.id === "cc-010-b1-15");
  if (openingTarget?.frozen !== 25) throw new Error("Lv10 pulse rescue: opening target must be frozen 25");
  // Explicit trigger fixture, not a pulse or proof of a natural solution route.
  const boundary = game.model.snapshot();
  for (const block of boundary.blocks) block.frozen = block.id === "cc-010-b1-15" ? 1 : 0;
  for (const gate of boundary.gates) gate.frozen = 0;
  game.model.restore(boundary);
});
await page.waitForTimeout(180);
const read = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const before = await read();
if (!before.pulseRescueGuide.visible || before.pulseRescueGuide.phase !== "booster") {
  throw new Error(`Lv10 pulse rescue: booster guide missing ${JSON.stringify(before.pulseRescueGuide)}`);
}
await page.screenshot({ path: `${out}/01-pulse-booster-guide.png` });

const clickLogical = async (logicalX, logicalY) => {
  const state = await read();
  const bounds = await page.locator("canvas").boundingBox();
  if (!bounds) throw new Error("Lv10 pulse rescue: canvas bounds missing");
  await page.mouse.click(
    bounds.x + state.viewportTransform.offsetX + logicalX * state.viewportTransform.scale,
    bounds.y + state.viewportTransform.offsetY + logicalY * state.viewportTransform.scale,
  );
};
const pulse = before.pulseRescueGuide.booster;
await clickLogical(pulse.x + pulse.width / 2, pulse.y + pulse.height / 2);
await page.waitForTimeout(100);
const afterPulse = await read();
if (afterPulse.pulseRescueGuide.visible || afterPulse.pulseRescueGuide.phase) {
  throw new Error(`Lv10 pulse rescue: target guide should be removed after pulse ${JSON.stringify(afterPulse.pulseRescueGuide)}`);
}
if (afterPulse.economy.boosters.pulse !== 3 || !afterPulse.controls.boosters.pulse) {
  throw new Error(`Lv10 pulse rescue: deferred stock is wrong ${JSON.stringify({ economy: afterPulse.economy, controls: afterPulse.controls })}`);
}
await page.screenshot({ path: `${out}/02-pulse-after-use.png` });

const target = afterPulse.puzzle.blocks.find((block) => block.id === "cc-010-b1-15");
if (!target) throw new Error("Lv10 pulse rescue: target block missing after pulse");
const board = afterPulse.board;
const centerX = target.shape.reduce((sum, [x]) => sum + x + 0.5, 0) / target.shape.length;
const centerY = target.shape.reduce((sum, [, y]) => sum + y + 0.5, 0) / target.shape.length;
await clickLogical(board.innerX + (target.x + centerX) * board.cell, board.innerY + (target.y + centerY) * board.cell);
await page.waitForTimeout(100);
const afterTarget = await read();
if (afterTarget.pulseRescueGuide.visible) {
  throw new Error(`Lv10 pulse rescue: pulse guide reappeared after target tap ${JSON.stringify(afterTarget.pulseRescueGuide)}`);
}

const interrupted = await page.evaluate(() => {
  const game = window.__COLOR_ESCAPE__;
  game.loadLevel(10, true);
  return { stock: game.getDebugState().economy.boosters.pulse, reserved: game.save.activeRun?.boosterSpent.pulse ?? 0 };
});
if (interrupted.stock !== 3 || interrupted.reserved !== 0) {
  throw new Error(`Lv10 pulse rescue: restart changed inventory ${JSON.stringify(interrupted)}`);
}

const settlement = await page.evaluate(() => {
  const game = window.__COLOR_ESCAPE__;
  game.loadLevel(10, true);
  game.model.startCountdown();
  game.model.thawAll(24);
  game.useBooster("pulse");
  while (!game.model.snapshot().complete) {
    const active = game.model.snapshot().blocks.find((candidate) => game.model.isBlockActive(candidate));
    if (!active) throw new Error("Lv10 pulse rescue: completion fixture has no active block");
    game.model.beginAction();
    if (!game.model.removeBlockWithBooster(active.id).ok || !game.model.commitAction()) {
      throw new Error(`Lv10 pulse rescue: completion fixture could not clear ${active.id}`);
    }
  }
  const pending = game.createPendingSettlement();
  return {
    complete: game.model.snapshot().complete,
    reserved: game.save.activeRun?.boosterSpent.pulse ?? 0,
    candidatePulseStock: pending.candidateSave.boosters.pulse,
  };
});
if (!settlement.complete || settlement.reserved !== 1 || settlement.candidatePulseStock !== 2) {
  throw new Error(`Lv10 pulse rescue: fixture did not reserve a pulse ${JSON.stringify(settlement)}`);
}

await writeFile(`${out}/report.json`, JSON.stringify({
  status: "PASS",
  errors,
  before: { guide: before.pulseRescueGuide, targetFrozen: before.puzzle.blocks.find((block) => block.id === "cc-010-b1-15")?.frozen },
  afterPulse: { guide: afterPulse.pulseRescueGuide, stock: afterPulse.economy.boosters.pulse },
  afterTarget: { guide: afterTarget.pulseRescueGuide, stock: afterTarget.economy.boosters.pulse },
  interrupted,
  settlement,
}, null, 2));
await browser.close();
console.log(`${out}/report.json`);
