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
const save = (currentLevel = 1, highestLevel = Math.max(10, currentLevel)) => ({
  schemaVersion: 1,
  currentLevel,
  highestLevel,
  coins: 1000,
  sound: false,
  haptic: false,
  reducedMotion: false,
  featureSeen: ["basics"],
  boosterUnlockSeen: ["time", "rocket", "pulse"],
  boosters: { time: 3, rocket: 9, pulse: 3 },
  bestStars: {},
  bestMoves: { "1": 17 },
  rewardedLevels: [1, 2, 3],
  dailyStreak: 0,
  lastDailyCompletedDay: "",
});

const attachErrors = (page) => {
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
};

const openWithSave = async (page, value) => {
  await page.goto(playtestUrl, { waitUntil: "networkidle" });
  await page.evaluate((nextSave) => localStorage.setItem("color-escape-save-v1", JSON.stringify(nextSave)), value);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(120);
};

const clickInteractionTarget = async (page, name) => {
  const state = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
  const hit = state.interactionTargets?.targets?.[name]?.hit;
  const canvas = await page.locator("canvas").boundingBox();
  if (!hit || !canvas) throw new Error(`Continuous-next E2E: missing ${name} target or canvas bounds`);
  await page.mouse.click(
    canvas.x + state.viewportTransform.offsetX + (hit.x + hit.width / 2) * state.viewportTransform.scale,
    canvas.y + state.viewportTransform.offsetY + (hit.y + hit.height / 2) * state.viewportTransform.scale,
  );
};

const pageCoordinates = (width, height) => {
  const scale = Math.min(width / 496, height / 1078);
  const offsetX = (width - 496 * scale) / 2;
  const offsetY = (height - 1078 * scale) / 2;
  return {
    click: (page, x, y) => page.mouse.click(offsetX + x * scale, offsetY + y * scale),
    point: (x, y) => ({ x: offsetX + x * scale, y: offsetY + y * scale }),
  };
};

const completeAssisted = async (page, coordinates) => {
  let state = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
  const assistedBlock = state.puzzle.blocks[0];
  if (!assistedBlock) return;
  await clickInteractionTarget(page, "booster.rocket");
  await page.waitForFunction(() => (
    window.__COLOR_ESCAPE__?.getDebugState().boosterTarget === "rocket"
  ), undefined, { timeout: 1_000 });
  state = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
  const target = state.puzzle.blocks.find((block) => block.id === assistedBlock.id) ?? state.puzzle.blocks[0];
  const [targetAnchorX, targetAnchorY] = target.shape[0];
  await coordinates.click(
    page,
    state.board.innerX + (target.x + targetAnchorX + 0.5) * state.board.cell,
    state.board.innerY + (target.y + targetAnchorY + 0.5) * state.board.cell,
  );
  await page.waitForFunction((blockId) => {
    const current = window.__COLOR_ESCAPE__?.getDebugState();
    return current
      && !current.puzzle.blocks.some((block) => block.id === blockId)
      && (current.activeRun?.boosterSpent.rocket ?? 0) > 0;
  }, target.id, { timeout: 1_000 });

  const solution = await page.evaluate(async () => {
    const current = window.__COLOR_ESCAPE__.getDebugState();
    if (current.puzzle.complete) return { solved: true, drags: [] };
    const { solveLevelForValidation } = await import("/src/core/levelSolver.ts");
    return solveLevelForValidation({
      ...current.level,
      id: current.level.id + 100_000,
      name: `${current.level.name}-continuous-next-remainder`,
      parMoves: undefined,
      playable: current.puzzle.playable,
      blocked: current.puzzle.blocked,
      gates: current.puzzle.gates,
      blocks: current.puzzle.blocks,
      shutters: current.puzzle.shutters,
      elevators: [],
      conveyors: current.puzzle.conveyors,
    });
  });
  if (!solution.solved) throw new Error("Continuous-next E2E: assisted remainder had no validation route");

  for (const drag of solution.drags) {
    state = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
    const block = state.puzzle.blocks.find((candidate) => candidate.id === drag.blockId);
    if (!block) throw new Error(`Continuous-next E2E: missing ${drag.blockId} before validation drag`);
    const [anchorX, anchorY] = block.shape[0];
    const start = coordinates.point(
      state.board.innerX + (block.x + anchorX + 0.5) * state.board.cell,
      state.board.innerY + (block.y + anchorY + 0.5) * state.board.cell,
    );
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    for (const [x, y] of drag.path) {
      const point = coordinates.point(
        state.board.innerX + (x + anchorX + 0.5) * state.board.cell,
        state.board.innerY + (y + anchorY + 0.5) * state.board.cell,
      );
      await page.mouse.move(point.x, point.y, { steps: 2 });
    }
    await page.mouse.up();
    await page.waitForTimeout(220);
  }

  state = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
  if (!state.puzzle.complete || state.puzzle.blocks.length !== 0) {
    throw new Error("Continuous-next E2E: assisted pointer route did not complete the board");
  }
};

const page = await browser.newPage({ viewport: { width: 496, height: 1078 } });
attachErrors(page);
const standard = pageCoordinates(496, 1078);
const debug = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const waitForFormalWin = (targetPage) => targetPage.waitForFunction(() => {
  const current = window.__COLOR_ESCAPE__?.getDebugState();
  return current?.screen === "win" && current.art.win.ready;
}, undefined, { timeout: 3_000 });
await openWithSave(page, save());
await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(1, true));
let state = await debug();
await completeAssisted(page, standard);
await page.waitForFunction(() => {
  const current = window.__COLOR_ESCAPE__?.getDebugState();
  return current?.completionFlow.directTransition?.fromLevel === 1;
}, undefined, { timeout: 3_000 });
state = await debug();
if (state.screen !== "playing" || state.art.win.ready
  || state.completionFlow.directTransition.toLevel !== 2) {
  throw new Error("Continuous-next E2E: Lv1 did not start its result-free direct transition");
}
if (!state.assistedClear || state.progression.bestMoves["1"] !== 17) {
  throw new Error(`Continuous-next E2E: rocket-assisted clear overwrote the existing fair best-move record: ${JSON.stringify({
    assistedClear: state.assistedClear,
    bestMoves: state.progression.bestMoves,
    settlement: state.settlement,
  })}`);
}
await page.screenshot({ path: shot("direct-transition-assisted-lv1.png") });

await page.waitForFunction(() => {
  const current = window.__COLOR_ESCAPE__?.getDebugState();
  return current?.screen === "playing" && current.level.id === 2
    && !current.completionFlow.directTransition;
}, undefined, { timeout: 3_000 });
state = await debug();
if (state.screen !== "playing" || state.level.id !== 2 || state.puzzle.moves !== 0 || state.activeRun?.levelId !== 2) {
  throw new Error("Continuous-next E2E: auto-advance did not begin a clean level 2 run directly");
}
await page.screenshot({ path: shot("level2-direct-start.png") });

// Lv5+ keeps the formal result. Continue returns Home and starts the settled
// reward flight instead of silently launching another run.
await openWithSave(page, save(5));
await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(5, true));
await completeAssisted(page, standard);
await waitForFormalWin(page);
state = await debug();
if (state.screen !== "win" || state.winAction !== "返回主页" || state.winSecondaryAction !== "关闭") {
  throw new Error("Continuous-next E2E: Lv5 result did not expose Continue-to-Home and close choices");
}
const settledReward = state.settlement.coinReward;
const settledCoins = state.economy.coins;
await page.screenshot({ path: shot("formal-result-lv5.png") });
await clickInteractionTarget(page, "modalPrimary");
state = await debug();
const replayDisk = await page.evaluate(() => JSON.parse(localStorage.getItem("color-escape-save-v1")));
if (state.screen !== "home" || state.level.id !== 5 || state.activeRun
  || !state.completionFlow.coinFlight
  || state.completionFlow.coinFlight.reward !== settledReward
  || state.completionFlow.coinFlight.endCoins !== settledCoins
  || replayDisk.currentLevel !== 5 || replayDisk.highestLevel !== 10) {
  throw new Error("Continuous-next E2E: Continue did not return Home with a clean settled coin flight");
}
await page.waitForFunction(() => !window.__COLOR_ESCAPE__?.getDebugState().completionFlow.coinFlight);

// Replay at the standard viewport, then shrink the ready result: this keeps
// the completion gesture independent from the minimum-viewport hit-area audit.
await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(5, true));
await completeAssisted(page, standard);
await waitForFormalWin(page);
await page.setViewportSize({ width: 320, height: 568 });
let smallState = await debug();
if (smallState.screen !== "win" || smallState.winAction !== "返回主页") {
  throw new Error("Continuous-next E2E: 320x568 result choices are incorrect");
}
await page.screenshot({ path: shot("formal-result-lv5-320x568.png") });
await clickInteractionTarget(page, "modalPrimary");
smallState = await debug();
if (smallState.screen !== "home" || !smallState.completionFlow.coinFlight) {
  throw new Error("Continuous-next E2E: 320x568 Continue-to-Home action was not clickable");
}
await page.close();

await browser.close();
if (errors.length) throw new Error(`Continuous-next browser errors:\n${errors.join("\n")}`);
console.log("Early direct transition, Lv5 Continue-to-Home coin flight, assisted record protection, and 320x568 passed.");
