import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/", import.meta.url));
const shot = (name) => resolve(output, name);
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 496, height: 1078 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));
const debug = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const clickTarget = async (name) => {
  const state = await debug();
  const hit = state.interactionTargets?.targets?.[name]?.hit;
  const bounds = await page.locator("canvas").boundingBox();
  if (!hit || !bounds) throw new Error(`Recovery E2E: missing interaction target ${name}`);
  await page.mouse.click(
    bounds.x + state.viewportTransform.offsetX + (hit.x + hit.width / 2) * state.viewportTransform.scale,
    bounds.y + state.viewportTransform.offsetY + (hit.y + hit.height / 2) * state.viewportTransform.scale,
  );
};
const freshSave = (currentLevel = 1, highestLevel = 10) => {
  const completed = Array.from({ length: Math.max(0, highestLevel - 1) }, (_, index) => index + 1);
  return {
    schemaVersion: 1,
    currentLevel,
    highestLevel,
    coins: 2000,
    sound: false,
    haptic: false,
    featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter"],
    boosterUnlockSeen: ["time", "rocket", "pulse"],
    boosters: { time: 3, rocket: 3, pulse: 3 },
    bestStars: Object.fromEntries(completed.map((level) => [String(level), 3])),
    bestMoves: Object.fromEntries(completed.map((level) => [String(level), 8])),
    rewardedLevels: completed,
    dailyStreak: 0,
    lastDailyCompletedDay: "",
  };
};
const writeSave = async (value) => {
  await page.evaluate((save) => localStorage.setItem("color-escape-save-v1", JSON.stringify(save)), value);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready, undefined, { timeout: 5_000 });
  await page.waitForTimeout(40);
};

await page.goto(playtestUrl, { waitUntil: "networkidle" });
const pulseFixture = await page.evaluate(async () => {
  const [{ LEVELS }, { SUPPLY_ITEMS }] = await Promise.all([
    import("/src/core/levels.ts"),
    import("/src/core/supply.ts"),
  ]);
  const level = LEVELS.find((candidate) => candidate.gates.some((gate) => (gate.frozen ?? 0) > 0));
  if (!level) throw new Error("Recovery E2E: no frozen-gate pulse fixture");
  return { levelId: level.id, unlockLevel: SUPPLY_ITEMS.pulse.unlockLevel };
});
const pulseLevelId = pulseFixture.levelId;
const levelOneSolution = await page.evaluate(async () => {
  const [{ getLevel }, { solveLevelForValidation }] = await Promise.all([
    import("/src/core/levels.ts"),
    import("/src/core/levelSolver.ts"),
  ]);
  return solveLevelForValidation(getLevel(1));
});
if (!levelOneSolution.solved) throw new Error("Recovery E2E: current level 1 has no verified completion route");

// An interrupted time-booster run refunds once and persists the recovered state.
await writeSave(freshSave());
await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(1, true));
await clickTarget("booster.time");
let state = await debug();
if (state.economy.boosters.time !== 2 || state.activeRun?.boosterSpent.time !== 1) {
  throw new Error("Recovery E2E: time spend was not journaled");
}
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(120);
state = await debug();
if (state.screen !== "home" || state.level.id !== 1 || state.economy.boosters.time !== 3 || state.activeRun) {
  throw new Error("Recovery E2E: interrupted time spend was not recovered");
}
await page.screenshot({ path: shot("round19-interrupted-time-refunded.png") });
await page.reload({ waitUntil: "networkidle" });
state = await debug();
if (state.economy.boosters.time !== 3 || state.activeRun) {
  throw new Error("Recovery E2E: recovery was not idempotent across a second reload");
}

// Rocket and pulse use the same transaction contract.
await writeSave(freshSave());
await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(1, true));
await clickTarget("booster.rocket");
state = await debug();
const rocketTarget = state.puzzle.blocks.find((block) => block.frozen === 0 && !block.shutterId);
if (!rocketTarget) throw new Error("Recovery E2E: level 1 has no active rocket target");
const [rocketAnchorX, rocketAnchorY] = rocketTarget.shape[0];
const rocketPoint = {
  x: state.board.innerX + (rocketTarget.x + rocketAnchorX + 0.5) * state.board.cell,
  y: state.board.innerY + (rocketTarget.y + rocketAnchorY + 0.5) * state.board.cell,
};
await page.mouse.click(rocketPoint.x, rocketPoint.y);
state = await debug();
if (state.economy.boosters.rocket !== 2 || state.activeRun?.boosterSpent.rocket !== 1) {
  throw new Error("Recovery E2E: rocket spend was not journaled");
}
await page.reload({ waitUntil: "networkidle" });
state = await debug();
if (state.economy.boosters.rocket !== 3 || state.activeRun || state.level.id !== 1) {
  throw new Error("Recovery E2E: interrupted rocket spend was not recovered");
}

await writeSave(freshSave(pulseLevelId, Math.max(pulseFixture.unlockLevel, pulseLevelId)));
await page.evaluate((levelId) => window.__COLOR_ESCAPE__.loadLevel(levelId, true), pulseLevelId);
await clickTarget("booster.pulse");
state = await debug();
if (state.economy.boosters.pulse !== 2 || state.activeRun?.boosterSpent.pulse !== 1) {
  throw new Error("Recovery E2E: pulse spend was not journaled");
}
await page.reload({ waitUntil: "networkidle" });
state = await debug();
if (state.economy.boosters.pulse !== 3 || state.activeRun || state.level.id !== pulseLevelId) {
  throw new Error("Recovery E2E: interrupted pulse spend was not recovered");
}

// Voluntary restart settles the spend: a later reload must not refund it.
await writeSave(freshSave());
await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(1, true));
await clickTarget("booster.time");
await clickTarget("pause");
await clickTarget("pauseRestart");
state = await debug();
if (state.screen !== "playing" || state.economy.boosters.time !== 2 || state.activeRun?.boosterSpent.time !== 0) {
  throw new Error("Recovery E2E: voluntary restart did not settle the previous spend");
}
await page.reload({ waitUntil: "networkidle" });
state = await debug();
if (state.economy.boosters.time !== 2 || state.activeRun) {
  throw new Error("Recovery E2E: settled restart spend was incorrectly refunded");
}

// Completing a run also settles the spend before rewards are persisted.
await writeSave(freshSave());
await clickTarget("homePlay");
await clickTarget("booster.time");
const performDrag = async (drag, postDelay) => {
  const live = await debug();
  const block = live.puzzle.blocks.find((candidate) => candidate.id === drag.blockId);
  if (!block) throw new Error(`Recovery E2E: missing route block ${drag.blockId}`);
  const [anchorX, anchorY] = block.shape[0];
  const point = (x, y) => ({
    x: live.board.innerX + (x + anchorX + 0.5) * live.board.cell,
    y: live.board.innerY + (y + anchorY + 0.5) * live.board.cell,
  });
  const start = point(block.x, block.y);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (const [x, y] of drag.path) {
    const target = point(x, y);
    await page.mouse.move(target.x, target.y, { steps: 3 });
  }
  if (drag.exitSide) {
    const held = await debug();
    const remaining = held.puzzle.blocks.find((candidate) => candidate.id === drag.blockId);
    const expectedLayers = Math.max(0, block.layers.length - 1);
    if (held.selectedId || held.activePointer !== undefined
      || (expectedLayers === 0 && remaining)
      || (expectedLayers > 0 && (!remaining || remaining.layers.length !== expectedLayers))) {
      throw new Error(`Recovery E2E: ${drag.blockId} did not resolve while the pointer stayed down`);
    }
  }
  await page.mouse.up();
  await page.waitForTimeout(postDelay ?? (drag.exitSide ? 330 : 35));
};
for (const drag of levelOneSolution.drags.slice(0, -1)) await performDrag(drag);
await performDrag(levelOneSolution.drags.at(-1), 20);
await page.waitForFunction(() => {
  const transition = window.__COLOR_ESCAPE__?.getDebugState().completionFlow?.directTransition;
  return transition?.fromLevel === 1 && transition?.toLevel === 2;
}, undefined, { timeout: 3_000 });
state = await debug();
if (state.screen !== "playing" || state.completionFlow?.directTransition?.fromLevel !== 1
  || state.settlement.status !== "committed" || state.settlement.rewardPresented
  || state.economy.boosters.time !== 2 || state.activeRun) {
  throw new Error("Recovery E2E: completed run did not settle its booster spend");
}
await page.reload({ waitUntil: "networkidle" });
state = await debug();
if (state.economy.boosters.time !== 2 || state.activeRun) {
  throw new Error("Recovery E2E: completed run spend was incorrectly refunded");
}

await page.close();
await browser.close();
if (errors.length) throw new Error(`Recovery browser errors:\n${errors.join("\n")}`);
console.log("Interrupted booster refunds, voluntary settlement, completion, and reload idempotency passed.");
