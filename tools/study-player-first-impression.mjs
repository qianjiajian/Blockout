import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/player-difficulty-study/", import.meta.url));
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
const defaultSampledLevels = [1, 3, 8, 10, 15, 19, 30, 35, 40, 50, 58, 60, 68, 70, 78, 80, 88, 90, 98, 100];
const requestedLevels = (process.env.FIRST_IMPRESSION_LEVEL_IDS ?? "")
  .split(",")
  .map(Number)
  .filter((id) => Number.isInteger(id) && id >= 1 && id <= 100);
const sampledLevels = requestedLevels.length ? requestedLevels : defaultSampledLevels;
const reportPath = resolve(output, requestedLevels.length
  ? `first-impression-browser-report-${requestedLevels.join("-")}.json`
  : "first-impression-browser-report.json");
const screenshotLevels = new Set(requestedLevels.length ? requestedLevels : [3, 19, 58, 68, 88, 98, 100]);
const maxGestures = 45;
await mkdir(output, { recursive: true });

const save = {
  schemaVersion: 1,
  currentLevel: 1,
  highestLevel: 100,
  coins: 1000,
  sound: false,
  haptic: false,
  reducedMotion: false,
  featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter", "generator", "elevator", "conveyor", "star"],
  boosterUnlockSeen: ["time", "rocket", "pulse"],
  boosters: { time: 0, rocket: 0, pulse: 0 },
  bestStars: {},
  bestMoves: {},
  rewardedLevels: [],
  dailyStreak: 0,
  lastDailyCompletedDay: "",
  lastSeenUpdate: "2026-09-05-r95",
};

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 360, height: 792 }, deviceScaleFactor: 2 });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.stack ?? error.message));
await page.goto(playtestUrl, { waitUntil: "networkidle" });
await page.evaluate((value) => localStorage.setItem("color-escape-save-v1", JSON.stringify(value)), save);
await page.reload({ waitUntil: "networkidle" });
await page.waitForFunction(() => Boolean(window.__COLOR_ESCAPE__?.getDebugState().art?.ready));

const debug = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const clearLoad = (state) => state.puzzle.blocks.reduce((sum, block) => sum + block.layers.length, 0);
const planVisibleMove = () => page.evaluate(async () => {
  const { createContinuousCollisionValidator } = await import("/src/game/continuousDrag.ts");
  const state = window.__COLOR_ESCAPE__.getDebugState();
  const snapshot = state.puzzle;
  const closedShutters = new Set(snapshot.shutters.filter((shutter) => shutter.count > 0).map((shutter) => shutter.id));
  const stateKey = JSON.stringify({
    blocks: snapshot.blocks.map((block) => [block.id, block.x, block.y, block.layers, block.frozen]),
    gates: snapshot.gates.map((gate) => [gate.id, gate.frozen]),
    shutters: snapshot.shutters.map((shutter) => [shutter.id, shutter.count]),
  });
  const intervalGap = (minimum, maximum, gateMinimum, gateMaximum) => (
    maximum < gateMinimum ? gateMinimum - maximum : minimum > gateMaximum ? minimum - gateMaximum : 0
  );
  const placementDistance = (block, x, y, gate) => {
    const cells = block.shape.map(([dx, dy]) => [x + dx, y + dy]);
    const xs = cells.map(([cellX]) => cellX);
    const ys = cells.map(([, cellY]) => cellY);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const gateMinimum = gate.offset;
    const gateMaximum = gate.offset + gate.size - 1;
    if (gate.side === "top") return minY + intervalGap(minX, maxX, gateMinimum, gateMaximum);
    if (gate.side === "bottom") return snapshot.height - 1 - maxY + intervalGap(minX, maxX, gateMinimum, gateMaximum);
    if (gate.side === "left") return minX + intervalGap(minY, maxY, gateMinimum, gateMaximum);
    return snapshot.width - 1 - maxX + intervalGap(minY, maxY, gateMinimum, gateMaximum);
  };
  const directions = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  const plans = [];
  for (const block of snapshot.blocks) {
    if (block.frozen > 0 || (block.shutterId && closedShutters.has(block.shutterId))) continue;
    const color = block.layers[0] ?? block.color;
    const gates = snapshot.gates.filter((gate) => gate.color === color && gate.frozen <= 0 && (!block.star || gate.star));
    if (!gates.length) continue;
    const valid = createContinuousCollisionValidator(snapshot, block.id);
    const distance = (x, y) => Math.min(...gates.map((gate) => placementDistance(block, x, y, gate)));
    const startDistance = distance(block.x, block.y);
    const visited = new Set([`${block.x},${block.y}`]);
    const path = [];
    let x = block.x;
    let y = block.y;
    let currentDistance = startDistance;
    let turns = 0;
    let previousDirection;
    for (let step = 0; step < 12; step += 1) {
      const neighbors = directions.map(([dx, dy]) => ({
        dx,
        dy,
        x: x + dx,
        y: y + dy,
        distance: distance(x + dx, y + dy),
      })).filter((candidate) => !visited.has(`${candidate.x},${candidate.y}`) && valid(candidate.x, candidate.y));
      if (!neighbors.length) break;
      neighbors.sort((left, right) => left.distance - right.distance);
      const next = neighbors[0];
      if (path.length > 0 && next.distance >= currentDistance) break;
      if (path.length === 0 && next.distance > currentDistance + 1) break;
      if (previousDirection && (previousDirection[0] !== next.dx || previousDirection[1] !== next.dy)) turns += 1;
      previousDirection = [next.dx, next.dy];
      x = next.x;
      y = next.y;
      currentDistance = next.distance;
      visited.add(`${x},${y}`);
      path.push([x, y]);
      if (currentDistance === 0) break;
    }
    if (!path.length) continue;
    plans.push({
      blockId: block.id,
      path,
      startDistance,
      finalDistance: currentDistance,
      improvement: startDistance - currentDistance,
      reachesGate: currentDistance === 0,
      turns,
      actionKey: `${block.id}:${path.map(([pathX, pathY]) => `${pathX},${pathY}`).join(";")}`,
    });
  }
  plans.sort((left, right) => Number(right.reachesGate) - Number(left.reachesGate)
    || right.improvement - left.improvement
    || left.finalDistance - right.finalDistance
    || right.path.length - left.path.length);
  return { stateKey, plans };
});

const dragPlan = async (plan, state) => {
  const block = state.puzzle.blocks.find((candidate) => candidate.id === plan.blockId);
  if (!block) throw new Error(`First-impression study: missing block ${plan.blockId}`);
  const [anchorX, anchorY] = block.shape[0];
  const toScreen = (originX, originY) => ({
    x: state.viewportTransform.offsetX + (state.board.innerX + (originX + anchorX + 0.5) * state.board.cell) * state.viewportTransform.scale,
    y: state.viewportTransform.offsetY + (state.board.innerY + (originY + anchorY + 0.5) * state.board.cell) * state.viewportTransform.scale,
  });
  const start = toScreen(block.x, block.y);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (const [x, y] of plan.path) {
    const target = toScreen(x, y);
    await page.mouse.move(target.x, target.y, { steps: 2 });
    await page.waitForTimeout(18);
  }
  await page.mouse.up();
};

const levels = [];
for (const levelId of sampledLevels) {
  await page.evaluate((id) => window.__COLOR_ESCAPE__.loadLevel(id, true), levelId);
  await page.waitForTimeout(240);
  let state = await debug();
  const startedAt = Date.now();
  const initialLoad = clearLoad(state);
  const attempted = new Set();
  const stateVisits = new Map();
  let pointerGestures = 0;
  let clearGestures = 0;
  let setupGestures = 0;
  let greedyGateGestures = 0;
  let noImprovementGestures = 0;
  let repeatedStates = 0;
  let initialChoices = 0;
  let firstClearGesture = null;
  let strategyNudgesUsed = 0;
  let strategyFocusesUsed = 0;
  const actions = [];
  const rescueEvents = [];
  let lastRescueEventKey = "";
  let outcome = "gesture-limit";
  if (screenshotLevels.has(levelId)) {
    await page.screenshot({ path: resolve(output, `level-${String(levelId).padStart(3, "0")}-initial.png`) });
  }
  await page.waitForTimeout(350);
  for (let gesture = 0; gesture < maxGestures; gesture += 1) {
    state = await debug();
    if (state.puzzle.complete) {
      outcome = "completed";
      break;
    }
    const visiblePlan = await planVisibleMove();
    if (gesture === 0) initialChoices = visiblePlan.plans.length;
    const visits = (stateVisits.get(visiblePlan.stateKey) ?? 0) + 1;
    stateVisits.set(visiblePlan.stateKey, visits);
    if (visits > 1) repeatedStates += 1;
    const nudge = state.strategyNudge?.visible ? state.strategyNudge.guide : undefined;
    const strategyFocusId = state.strategyFocus?.visible ? state.strategyFocus.blockId : undefined;
    const configuredFocusId = state.strategyFocus?.configuredBlockId;
    const configuredNudge = state.level.strategyNudge;
    if (configuredFocusId && configuredNudge
      && state.strategyFocus.noClearMoveStreak >= state.strategyFocus.threshold
      && rescueEvents.length < 16) {
      const focusBlock = state.puzzle.blocks.find((candidate) => candidate.id === configuredFocusId);
      const eventKey = JSON.stringify([
        state.strategyFocus.noClearMoveStreak,
        focusBlock?.x,
        focusBlock?.y,
        state.strategyFocus.visible,
        state.strategyNudge.visible,
        state.strategyNudge.acknowledged,
      ]);
      if (eventKey !== lastRescueEventKey) {
        rescueEvents.push({
          afterGesture: pointerGestures,
          noClearMoveStreak: state.strategyFocus.noClearMoveStreak,
          focus: {
            blockId: configuredFocusId,
            position: focusBlock ? [focusBlock.x, focusBlock.y] : null,
            visible: state.strategyFocus.visible,
          },
          nudge: {
            configured: configuredNudge,
            visible: state.strategyNudge.visible,
            acknowledged: state.strategyNudge.acknowledged,
            guideOrigins: state.strategyNudge.guide?.origins ?? null,
          },
          legalFocusPlans: visiblePlan.plans
            .filter((candidate) => candidate.blockId === configuredFocusId)
            .slice(0, 12)
            .map(({ path, reachesGate, improvement, turns, actionKey }) => ({ path, reachesGate, improvement, turns, actionKey })),
          activeBlockPositions: state.puzzle.blocks
            .filter((candidate) => !candidate.shutterId
              || state.puzzle.shutters.some((shutter) => shutter.id === candidate.shutterId && shutter.count <= 0))
            .map(({ id, x, y }) => ({ id, x, y })),
        });
        lastRescueEventKey = eventKey;
      }
    }
    const nudgePath = nudge?.origins?.slice(1) ?? [];
    const nudgePlan = nudge?.blockId && nudgePath.length ? {
      blockId: nudge.blockId,
      path: nudgePath,
      startDistance: 0,
      finalDistance: 0,
      improvement: 0,
      reachesGate: false,
      turns: 0,
      actionKey: `strategy-nudge:${nudge.blockId}:${nudgePath.map(([x, y]) => `${x},${y}`).join(";")}`,
    } : undefined;
    const plan = nudgePlan
      ?? (strategyFocusId
        ? visiblePlan.plans.find((candidate) => candidate.blockId === strategyFocusId
          && !attempted.has(`${visiblePlan.stateKey}|${candidate.actionKey}`))
          ?? visiblePlan.plans.find((candidate) => !attempted.has(`${visiblePlan.stateKey}|${candidate.actionKey}`))
        : visiblePlan.plans.find((candidate) => !attempted.has(`${visiblePlan.stateKey}|${candidate.actionKey}`)));
    if (!plan) {
      outcome = "stalled";
      break;
    }
    const usesStrategyFocus = !nudgePlan && strategyFocusId === plan.blockId;
    attempted.add(`${visiblePlan.stateKey}|${plan.actionKey}`);
    if (nudgePlan) strategyNudgesUsed += 1;
    if (usesStrategyFocus) strategyFocusesUsed += 1;
    const loadBefore = clearLoad(state);
    await dragPlan(plan, state);
    pointerGestures += 1;
    if (plan.reachesGate) greedyGateGestures += 1;
    if (plan.improvement <= 0) noImprovementGestures += 1;
    await page.waitForTimeout(115);
    let after = await debug();
    if (clearLoad(after) < loadBefore) {
      clearGestures += 1;
      if (firstClearGesture == null) firstClearGesture = pointerGestures;
      actions.push({ gesture: pointerGestures, blockId: plan.blockId, path: plan.path, kind: nudgePlan ? "nudge-clear" : usesStrategyFocus ? "focus-clear" : "clear", loadBefore, loadAfter: clearLoad(after) });
      await page.waitForTimeout(225);
      after = await debug();
    } else {
      setupGestures += 1;
      actions.push({ gesture: pointerGestures, blockId: plan.blockId, path: plan.path, kind: nudgePlan ? "nudge-setup" : usesStrategyFocus ? "focus-setup" : "setup", loadBefore, loadAfter: clearLoad(after) });
    }
    if (after.puzzle.complete) {
      outcome = "completed";
      break;
    }
  }
  state = await debug();
  levels.push({
    levelId,
    name: state.level.name,
    authoredDifficulty: state.level.difficulty,
    outcome,
    pointerGestures,
    clearGestures,
    setupGestures,
    greedyGateGestures,
    noImprovementGestures,
    repeatedStates,
    uniqueStates: stateVisits.size,
    initialChoices,
    firstClearGesture,
    strategyNudgesUsed,
    strategyFocusesUsed,
    rescueEvents,
    actions,
    initialClearLoad: initialLoad,
    remainingClearLoad: clearLoad(state),
    remainingSeconds: state.puzzle.remainingSeconds,
    wallClockMs: Date.now() - startedAt,
  });
  console.log(`FIRST-PLAY Lv${levelId} ${outcome} gestures=${pointerGestures} setup=${setupGestures} remaining=${clearLoad(state)}/${initialLoad}`);
}

const report = {
  method: "Internal Chromium at 360x792 CSS / DPR2 with real Pointer input. A visible-information greedy first-play policy moves a block toward its matching open gate and tries unvisited legal relocations when blocked. It never imports levelSolver or authored solutions, never uses boosters, and has no multi-block lookahead. This is an AI-operated first-impression proxy, not a human playtest panel.",
  sampledLevels,
  maxGesturesPerLevel: maxGestures,
  levels,
  summary: {
    completed: levels.filter((level) => level.outcome === "completed").length,
    stalled: levels.filter((level) => level.outcome === "stalled").length,
    gestureLimit: levels.filter((level) => level.outcome === "gesture-limit").length,
    browserErrors: errors.length,
  },
  browserErrors: errors,
};
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
await page.close();
await browser.close();
if (errors.length) throw new Error(`First-impression browser errors:\n${errors.join("\n")}`);
console.log(`First-impression browser study complete: ${report.summary.completed}/${levels.length} completed without solver or boosters.`);
