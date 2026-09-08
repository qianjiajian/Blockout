import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/strategy-nudge/", import.meta.url));
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });

const save = (reducedMotion = false) => ({
  schemaVersion: 1,
  currentLevel: 8,
  highestLevel: 100,
  coins: 1000,
  sound: false,
  haptic: false,
  reducedMotion,
  featureSeen: ["basics", "ice-block", "layer", "generator", "elevator", "conveyor", "star"],
  boosterUnlockSeen: ["time", "rocket", "pulse"],
  boosters: { time: 0, rocket: 0, pulse: 0 },
  bestStars: {},
  bestMoves: {},
  rewardedLevels: [],
  dailyStreak: 0,
  lastDailyCompletedDay: "",
  lastSeenUpdate: "2026-09-05-r88",
});

const browser = await chromium.launch({ headless: true });
const errors = [];
const attachErrors = (page) => {
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
};
const debug = (page) => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const seed = async (page, reducedMotion = false) => {
  await page.goto(playtestUrl, { waitUntil: "networkidle" });
  await page.evaluate((value) => localStorage.setItem("color-escape-save-v1", JSON.stringify(value)), save(reducedMotion));
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => Boolean(window.__COLOR_ESCAPE__?.getDebugState().art?.ready));
  await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(8, true));
  await page.waitForTimeout(140);
};
const logicalToScreen = (page, state, x, y) => {
  const viewport = page.viewportSize();
  const scale = Math.min(viewport.width / 496, viewport.height / 1078);
  const offsetX = (viewport.width - 496 * scale) / 2;
  const offsetY = (viewport.height - 1078 * scale) / 2;
  return { x: offsetX + x * scale, y: offsetY + y * scale };
};
const dragBlock = async (page, blockId, targetX, targetY, hold = false) => {
  const state = await debug(page);
  const block = state.puzzle.blocks.find((candidate) => candidate.id === blockId);
  if (!block) throw new Error(`Strategy nudge E2E: missing block ${blockId}`);
  const [anchorX, anchorY] = block.shape[0];
  const start = logicalToScreen(page, state,
    state.board.innerX + (block.x + anchorX + 0.5) * state.board.cell,
    state.board.innerY + (block.y + anchorY + 0.5) * state.board.cell);
  const target = logicalToScreen(page, state,
    state.board.innerX + (targetX + anchorX + 0.5) * state.board.cell,
    state.board.innerY + (targetY + anchorY + 0.5) * state.board.cell);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 5 });
  await page.waitForTimeout(hold ? 90 : 30);
  if (!hold) await page.mouse.up();
  await page.waitForTimeout(100);
};
const createNoClearStreak = async (page) => {
  await dragBlock(page, "yellow-load", 8, 2);
  await dragBlock(page, "yellow-load", 7, 2);
  await dragBlock(page, "yellow-load", 8, 2);
};

const standard = await browser.newPage({ viewport: { width: 496, height: 1078 } });
attachErrors(standard);
await seed(standard);
let state = await debug(standard);
if (state.strategyNudge.visible || state.strategyNudge.noClearMoveStreak !== 0) {
  throw new Error("Strategy nudge E2E: rescue appeared before the player struggled");
}
await createNoClearStreak(standard);
state = await debug(standard);
if (!state.strategyNudge.visible || state.strategyNudge.noClearMoveStreak !== 3
  || state.strategyNudge.guide?.blockId !== "blue-load"
  || JSON.stringify(state.strategyNudge.guide?.origins) !== JSON.stringify([[2, 0], [3, 0]])) {
  throw new Error(`Strategy nudge E2E: three no-clear moves did not expose the one-step blocker hint (${JSON.stringify(state.strategyNudge)})`);
}
await standard.screenshot({ path: resolve(output, "level-008-three-no-clear-720x1584.png") });

const guideStart = logicalToScreen(standard, state, state.strategyNudge.guide.start.x, state.strategyNudge.guide.start.y);
await standard.mouse.click(guideStart.x, guideStart.y);
await standard.waitForTimeout(80);
state = await debug(standard);
if (!state.strategyNudge.visible || state.strategyNudge.acknowledged || state.strategyNudge.noClearMoveStreak !== 3) {
  throw new Error("Strategy nudge E2E: an idle tap incorrectly dismissed or advanced the rescue");
}

await dragBlock(standard, "blue-load", 3, 0);
state = await debug(standard);
if (state.strategyNudge.visible || !state.strategyNudge.acknowledged || state.puzzle.cleared !== 0) {
  throw new Error("Strategy nudge E2E: taking the hinted setup move did not dismiss the rescue cleanly");
}
await dragBlock(standard, "composition-8-5", 2, 0, true);
state = await debug(standard);
if (state.puzzle.cleared !== 1 || state.puzzle.blocks.some((block) => block.id === "composition-8-5")
  || state.strategyNudge.visible || state.strategyNudge.noClearMoveStreak !== 0) {
  throw new Error("Strategy nudge E2E: the player-owned follow-up clear did not resolve while held");
}
await standard.mouse.up();
await standard.waitForTimeout(120);
await standard.screenshot({ path: resolve(output, "level-008-first-breakthrough-720x1584.png") });
await standard.close();

const small = await browser.newPage({ viewport: { width: 320, height: 568 } });
attachErrors(small);
await seed(small, true);
await createNoClearStreak(small);
state = await debug(small);
if (!state.strategyNudge.visible || state.strategyNudge.guide?.blockId !== "blue-load") {
  throw new Error("Strategy nudge E2E: reduced-motion small screen lost the rescue");
}
await small.screenshot({ path: resolve(output, "level-008-three-no-clear-320x568.png") });
await small.close();

await browser.close();
if (errors.length) throw new Error(`Strategy nudge browser errors:\n${errors.join("\n")}`);
console.log("Lv8 three-no-clear rescue, one-step-only handoff, held exit, reduced motion, and 320x568 passed.");
