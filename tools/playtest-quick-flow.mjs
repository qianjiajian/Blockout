import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/", import.meta.url));
const shot = (name) => resolve(output, name);
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const errors = [];
const freshSave = {
  schemaVersion: 1,
  currentLevel: 1,
  highestLevel: 1,
  coins: 1000,
  sound: false,
  haptic: false,
  reducedMotion: false,
  featureSeen: ["basics"],
  boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: {},
  bestMoves: {},
  rewardedLevels: [],
  dailyStreak: 0,
  lastDailyCompletedDay: "",
};

const attachErrors = (page) => {
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
};

const coordinates = (width, height) => {
  const scale = Math.min(width / 496, height / 1078);
  const offsetX = (width - 496 * scale) / 2;
  const offsetY = (height - 1078 * scale) / 2;
  const point = (x, y) => ({ x: offsetX + x * scale, y: offsetY + y * scale });
  return {
    point,
    click: (page, x, y) => {
      const target = point(x, y);
      return page.mouse.click(target.x, target.y);
    },
  };
};

const openFresh = async (page) => {
  await page.goto(playtestUrl, { waitUntil: "networkidle" });
  await page.evaluate((save) => localStorage.setItem("color-escape-save-v1", JSON.stringify(save)), freshSave);
  await page.reload({ waitUntil: "networkidle" });
  await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(1, true));
  await page.waitForTimeout(100);
};

const solveLevel = (page, levelId) => page.evaluate(async (id) => {
  const [{ getLevel }, { solveLevelForValidation }] = await Promise.all([
    import("/src/core/levels.ts"),
    import("/src/core/levelSolver.ts"),
  ]);
  return solveLevelForValidation(getLevel(id));
}, levelId);

const performDrag = async (page, mapper, drag, settleExitEffects = false) => {
  const state = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
  const block = state.puzzle.blocks.find((candidate) => candidate.id === drag.blockId);
  if (!block) throw new Error(`Quick-flow E2E: missing verified route block ${drag.blockId}`);
  const directExit = drag.path.length === 0 && Boolean(drag.exitSide);
  const [anchorX, anchorY] = directExit
    ? [
      block.shape.reduce((sum, [x]) => sum + x, 0) / block.shape.length,
      block.shape.reduce((sum, [, y]) => sum + y, 0) / block.shape.length,
    ]
    : block.shape[0];
  const logicalPoint = (x, y) => ({
    x: state.board.innerX + (x + anchorX + 0.5) * state.board.cell,
    y: state.board.innerY + (y + anchorY + 0.5) * state.board.cell,
  });
  const startLogical = logicalPoint(block.x, block.y);
  const start = mapper.point(startLogical.x, startLogical.y);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (const [x, y] of drag.path) {
    const logical = logicalPoint(x, y);
    const target = mapper.point(logical.x, logical.y);
    await page.mouse.move(target.x, target.y, { steps: 3 });
  }
  await page.mouse.up();

  const [expectedX, expectedY] = drag.path.at(-1) ?? [block.x, block.y];
  const expectedLayers = Math.max(0, block.layers.length - 1);
  await waitFor(page, (candidate) => {
    const current = candidate.puzzle.blocks.find((item) => item.id === drag.blockId);
    const modelResolved = drag.exitSide
      ? expectedLayers > 0
        ? current?.layers.length === expectedLayers
        : !current
      : current?.x === expectedX && current?.y === expectedY;
    const inputReleased = !candidate.selectedId && candidate.activePointer === undefined;
    const exitEffectsSettled = !settleExitEffects || !drag.exitSide
      || (candidate.exitGhosts === 0 && candidate.exitFragments === 0 && candidate.exitPulses.length === 0);
    return modelResolved && inputReleased && exitEffectsSettled;
  });
};

const waitFor = async (page, predicate, timeout = 8000) => {
  const deadline = Date.now() + timeout;
  const screens = [];
  while (Date.now() < deadline) {
    const state = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
    screens.push(state.screen);
    if (predicate(state)) return { state, screens };
    await page.waitForTimeout(20);
  }
  const state = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
  throw new Error(`Quick-flow E2E: timed out at ${state.screen}, Lv${state.level.id}`);
};

const standard = await browser.newPage({ viewport: { width: 496, height: 1078 } });
attachErrors(standard);
await openFresh(standard);
const standardCoords = coordinates(496, 1078);
let expectedCoins = 1000;
const transitions = [];

for (const levelId of [1, 2, 3, 4]) {
  let state = await standard.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
  if (state.screen !== "playing" || state.level.id !== levelId) {
    throw new Error(`Quick-flow E2E: expected playable Lv${levelId}, got ${state.screen} Lv${state.level.id}`);
  }
  const clearedReward = 20;
  expectedCoins += clearedReward;
  const solution = await solveLevel(standard, levelId);
  if (!solution.solved || !solution.drags.length) {
    throw new Error(`Quick-flow E2E: Lv${levelId} has no verified route`);
  }
  const parMoves = state.level.parMoves;
  const expectedStars = solution.minimumDrags <= parMoves ? 3 : solution.minimumDrags <= parMoves + 2 ? 2 : 1;
  for (const drag of solution.drags.slice(0, -1)) {
    await performDrag(standard, standardCoords, drag, true);
  }

  const finalGestureStartedAt = Date.now();
  await performDrag(standard, standardCoords, solution.drags.at(-1));
  const transition = await waitFor(
    standard,
    (candidate) => candidate.screen === "playing"
      && candidate.completionFlow.directTransition?.fromLevel === levelId,
  );
  const transitionStartedAt = Date.now();
  const finalGestureToTransitionMs = transitionStartedAt - finalGestureStartedAt;
  if (transition.screens.some((screen) => screen !== "playing") || transition.state.art.win.ready) {
    throw new Error(`Quick-flow E2E: Lv${levelId} opened a result instead of its direct transition`);
  }
  if (transition.state.completionFlow.directTransition.toLevel !== levelId + 1
    || transition.state.settlement.status !== "committed"
    || transition.state.settlement.coinReward !== clearedReward) {
    throw new Error(`Quick-flow E2E: Lv${levelId} direct transition did not retain its committed settlement`);
  }
  await standard.screenshot({ path: shot(`direct-transition-level-${String(levelId).padStart(3, "0")}.png`) });

  if (transition.state.economy.coins !== expectedCoins || !transition.state.economy.rewardedLevels.includes(levelId)
    || transition.state.progression.bestStars[String(levelId)] !== expectedStars
    || transition.state.progression.bestMoves[String(levelId)] !== solution.minimumDrags) {
    throw new Error(`Quick-flow E2E: Lv${levelId} reward, stars, or move record was not settled exactly once`);
  }

  const advanced = await waitFor(
    standard,
    (candidate) => candidate.screen === "playing" && candidate.level.id === levelId + 1
      && !candidate.completionFlow.directTransition,
  );
  const finalGestureToNextMs = Date.now() - finalGestureStartedAt;
  transitions.push({
    fromLevel: levelId,
    toLevel: levelId + 1,
    finalGestureToTransitionMs,
    transitionDurationMs: Date.now() - transitionStartedAt,
    finalGestureToNextMs,
  });
  state = advanced.state;
  if (state.puzzle.moves !== 0 || state.exitGhosts !== 0 || state.exitPulses.length !== 0
    || state.particles !== 0 || state.pendingCelebration !== 0 || state.activeRun?.levelId !== levelId + 1) {
    throw new Error(`Quick-flow E2E: Lv${levelId + 1} did not start from a clean run`);
  }
  if (state.assistedClear || state.progression.bestMoves[String(levelId)] !== solution.minimumDrags) {
    throw new Error(`Quick-flow E2E: Lv${levelId} did not preserve its fair verified move record`);
  }
  if (state.economy.coins !== expectedCoins || !state.economy.rewardedLevels.includes(levelId)
    || state.progression.bestStars[String(levelId)] !== expectedStars) {
    throw new Error(`Quick-flow E2E: Lv${levelId} reward or stars were not settled exactly once`);
  }
}
await standard.screenshot({ path: shot("quick-flow-level-005.png") });
await standard.close();

const mobile = await browser.newPage({ viewport: { width: 320, height: 568 } });
attachErrors(mobile);
await openFresh(mobile);
const mobileCoords = coordinates(320, 568);
const mobileSolution = await solveLevel(mobile, 1);
if (!mobileSolution.solved || !mobileSolution.drags.length) {
  throw new Error("Quick-flow E2E: mobile Lv1 has no verified route");
}
for (const drag of mobileSolution.drags.slice(0, -1)) {
  await performDrag(mobile, mobileCoords, drag, true);
}
await performDrag(mobile, mobileCoords, mobileSolution.drags.at(-1));
await waitFor(
  mobile,
  (candidate) => candidate.screen === "playing"
    && candidate.completionFlow.directTransition?.fromLevel === 1,
);
await mobile.screenshot({ path: shot("direct-transition-level-001-320x568.png") });
const mobileAdvanced = await waitFor(mobile, (candidate) => candidate.screen === "playing" && candidate.level.id === 2
  && !candidate.completionFlow.directTransition);
if (mobileAdvanced.state.puzzle.moves !== 0 || mobileAdvanced.state.activeRun?.levelId !== 2) {
  throw new Error("Quick-flow E2E: 320x568 did not enter a clean level 2 run");
}
await mobile.close();

await writeFile(
  shot("round41-quick-flow-report.json"),
  `${JSON.stringify({
    transitions,
  }, null, 2)}\n`,
  "utf8",
);

await browser.close();
if (errors.length) throw new Error(`Quick-flow browser errors:\n${errors.join("\n")}`);
console.log("Lv1→2→3→4→5 direct transitions, rewards, clean state, and 320x568 passed.");
