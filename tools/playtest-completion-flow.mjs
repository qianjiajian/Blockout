import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/completion-flow/", import.meta.url));
const shot = (name) => resolve(output, name);
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
const SAVE_KEY = "color-escape-save-v1";
const LOGICAL_WIDTH = 496;
const POLL_MS = 5;

await mkdir(output, { recursive: true });

const assert = (condition, message) => {
  if (!condition) throw new Error(`Completion-flow E2E: ${message}`);
};

const closeTo = (actual, expected, tolerance, label) => {
  assert(
    Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected} +/- ${tolerance}, got ${actual}`,
  );
};

const seed = {
  schemaVersion: 1,
  currentLevel: 4,
  highestLevel: 4,
  coins: 1000,
  sound: false,
  haptic: false,
  reducedMotion: false,
  featureSeen: ["basics"],
  boosterUnlockSeen: ["time", "rocket", "pulse"],
  metaDiscovery: {
    collectionViewedThroughLevel: 4,
    leaderboardViewedThroughLevel: 4,
  },
  boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: { "1": 3, "2": 3, "3": 3 },
  bestMoves: { "1": 2, "2": 3, "3": 4 },
  rewardedLevels: [1, 2, 3],
  journeyProgress: { claimedMilestoneLevels: [], seenEpisodeUnlockLevels: [] },
  selectedJourneyEpisode: 1,
  dailyStreak: 0,
  lastDailyCompletedDay: "",
  lastSeenUpdate: "2026-09-10-r118",
};

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 496, height: 1078 },
  deviceScaleFactor: 1,
});

// Record the real canvas transform used for the board, HUD, boosters, and
// flying coin atlas. Frame metadata comes from the same render pass, so a
// state-only transition cannot accidentally satisfy these drawing checks.
await context.addInitScript(() => {
  const audit = [];
  let frame = 0;
  const contextPrototype = CanvasRenderingContext2D.prototype;
  const originalSetTransform = contextPrototype.setTransform;
  const originalDrawImage = contextPrototype.drawImage;

  const currentFrameState = () => {
    try {
      const state = window.__COLOR_ESCAPE__?.getDebugState?.();
      if (!state) return undefined;
      const transition = state.completionFlow?.directTransition;
      const flight = state.completionFlow?.coinFlight;
      return {
        screen: state.screen,
        levelId: state.level?.id,
        levelTimeSeconds: state.level?.timeSeconds,
        remainingSeconds: state.puzzle?.remainingSeconds,
        puzzleStarted: state.puzzle?.started,
        devicePixelRatio: window.devicePixelRatio,
        viewportTransform: state.viewportTransform,
        directTransition: transition ? {
          phase: transition.phase,
          age: transition.age,
          boardOffsetScreens: transition.boardOffsetScreens,
          switched: transition.switched,
        } : undefined,
        coinFlight: flight ? {
          age: flight.age,
          reward: flight.reward,
          startCoins: flight.startCoins,
          endCoins: flight.endCoins,
          landedCount: flight.landedCount,
          displayedCoins: flight.displayedCoins,
          coinCount: flight.coinCount,
          target: flight.target,
          coins: flight.coins.map((coin) => ({ index: coin.index, progress: coin.progress })),
        } : undefined,
      };
    } catch {
      return undefined;
    }
  };

  contextPrototype.setTransform = function completionFlowSetTransform(...args) {
    const result = originalSetTransform.apply(this, args);
    if (args.length === 6
      && args[0] === 1 && args[1] === 0 && args[2] === 0
      && args[3] === 1 && args[4] === 0 && args[5] === 0) {
      frame += 1;
      audit.push({ kind: "frame", frame, at: performance.now(), state: currentFrameState() });
    }
    return result;
  };

  contextPrototype.drawImage = function completionFlowDrawImage(...args) {
    const source = args[0];
    const sourceUrl = String(source?.currentSrc || source?.src || "");
    let kind;
    if (sourceUrl.includes("empty-cells-2x2.png")) kind = "boardFloor";
    else if (sourceUrl.includes("back-button.png")) kind = "hud";
    else if (sourceUrl.includes("booster-base.png")) kind = "booster";
    else if (sourceUrl.includes("system-icons-v1.png")
      && args.length === 9 && Number(args[1]) === 0 && Number(args[2]) === 0) kind = "flightCoin";

    if (kind) {
      const matrix = this.getTransform();
      audit.push({
        kind,
        frame,
        source: sourceUrl.split("/").at(-1),
        matrix: {
          a: matrix.a,
          b: matrix.b,
          c: matrix.c,
          d: matrix.d,
          e: matrix.e,
          f: matrix.f,
        },
      });
    }
    return originalDrawImage.apply(this, args);
  };

  window.__takeCompletionFlowDrawAudit = () => audit.splice(0, audit.length);
});

const page = await context.newPage();
const browserErrors = [];
page.on("console", (message) => {
  if (message.type() === "error") browserErrors.push(message.text());
});
page.on("pageerror", (error) => browserErrors.push(error.message));

const debug = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const stored = () => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), SAVE_KEY);
const takeDrawAudit = () => page.evaluate(() => window.__takeCompletionFlowDrawAudit());

const waitFor = async (predicate, label, timeout = 12_000) => {
  const deadline = Date.now() + timeout;
  const observations = [];
  while (Date.now() < deadline) {
    const state = await debug();
    observations.push({
      screen: state.screen,
      levelId: state.level.id,
      transitionPhase: state.completionFlow?.directTransition?.phase,
      flightAge: state.completionFlow?.coinFlight?.age,
    });
    if (predicate(state)) return { state, observations };
    await page.waitForTimeout(POLL_MS);
  }
  const state = await debug();
  throw new Error(
    `Completion-flow E2E: timed out waiting for ${label}; `
    + `last=${state.screen}/Lv${state.level.id}/${JSON.stringify(state.completionFlow)}`,
  );
};

const clientPoint = async (logicalX, logicalY, providedState) => {
  const state = providedState ?? await debug();
  const canvas = await page.locator("canvas").boundingBox();
  assert(canvas, "canvas bounds are unavailable");
  return {
    x: canvas.x + state.viewportTransform.offsetX + logicalX * state.viewportTransform.scale,
    y: canvas.y + state.viewportTransform.offsetY + logicalY * state.viewportTransform.scale,
  };
};

const clickInteractionTarget = async (name) => {
  const { state } = await waitFor(
    (candidate) => Boolean(candidate.interactionTargets?.targets?.[name]?.hit),
    `${name} interaction target`,
  );
  const hit = state.interactionTargets.targets[name].hit;
  const point = await clientPoint(hit.x + hit.width / 2, hit.y + hit.height / 2, state);
  await page.mouse.click(point.x, point.y);
};

const solveLevel = (levelId) => page.evaluate(async (id) => {
  const [{ getLevel }, { solveLevelForValidation }] = await Promise.all([
    import("/src/core/levels.ts"),
    import("/src/core/levelSolver.ts"),
  ]);
  return solveLevelForValidation(getLevel(id));
}, levelId);

const performDrag = async (drag, settleExitEffects = true) => {
  const state = await debug();
  const block = state.puzzle.blocks.find((candidate) => candidate.id === drag.blockId);
  assert(block, `verified route block ${drag.blockId} is missing from Lv${state.level.id}`);

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
  const start = await clientPoint(startLogical.x, startLogical.y, state);

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (const [x, y] of drag.path) {
    const logical = logicalPoint(x, y);
    const target = await clientPoint(logical.x, logical.y, state);
    await page.mouse.move(target.x, target.y, { steps: 3 });
  }
  await page.mouse.up();

  const [expectedX, expectedY] = drag.path.at(-1) ?? [block.x, block.y];
  const expectedLayers = Math.max(0, block.layers.length - 1);
  await waitFor((candidate) => {
    const current = candidate.puzzle.blocks.find((item) => item.id === drag.blockId);
    const modelResolved = drag.exitSide
      ? expectedLayers > 0
        ? current?.layers.length === expectedLayers
        : !current
      : current?.x === expectedX && current?.y === expectedY;
    const released = !candidate.selectedId && candidate.activePointer === undefined;
    const exitSettled = !settleExitEffects || !drag.exitSide
      || (candidate.exitGhosts === 0
        && candidate.exitFragments === 0
        && candidate.exitPulses.length === 0);
    return modelResolved && released && exitSettled;
  }, `Pointer drag ${drag.blockId}`);
};

const runVerifiedRoute = async (levelId, beforeFinal) => {
  const solution = await solveLevel(levelId);
  assert(solution.solved && solution.drags.length > 0, `Lv${levelId} has no verified route`);
  for (const drag of solution.drags.slice(0, -1)) await performDrag(drag, true);
  if (beforeFinal) await beforeFinal(solution);
  await performDrag(solution.drags.at(-1), false);
  return solution;
};

const groupDrawAudit = (records) => {
  const frames = new Map();
  for (const record of records) {
    const item = frames.get(record.frame) ?? { frame: record.frame, marker: undefined, draws: [] };
    if (record.kind === "frame") item.marker = record;
    else item.draws.push(record);
    frames.set(record.frame, item);
  }
  return [...frames.values()].filter((item) => item.marker?.state);
};

const pickFrame = (frames, predicate, rank) => {
  const candidates = frames.filter((frame) => predicate(frame.marker.state)
    && ["boardFloor", "hud", "booster"].every((kind) => (
      frame.draws.some((draw) => draw.kind === kind)
    )));
  assert(candidates.length > 0, "required rendered transition frame was not captured");
  return [...candidates].sort((left, right) => rank(right) - rank(left))[0];
};

const drawOf = (frame, kind) => {
  const draw = frame.draws.find((candidate) => candidate.kind === kind);
  assert(draw, `${kind} was not drawn in frame ${frame.frame}`);
  return draw;
};

const matrixSummary = (frame) => ({
  frame: frame.frame,
  state: frame.marker.state,
  boardFloor: drawOf(frame, "boardFloor").matrix,
  hud: drawOf(frame, "hud").matrix,
  booster: drawOf(frame, "booster").matrix,
});

const assertFixedMatrix = (candidate, baseline, label) => {
  for (const property of ["a", "b", "c", "d", "e", "f"]) {
    closeTo(candidate[property], baseline[property], 0.001, `${label}.${property}`);
  }
};

const countLevel = (values, levelId) => values.filter((id) => id === levelId).length;

const report = {
  viewport: { width: 496, height: 1078, deviceScaleFactor: 1 },
  referenceVideo: "C:/Users/Administrator/Desktop/block out/参考视频/1-10.mp4",
};

try {
  await page.goto(playtestUrl, { waitUntil: "networkidle" });
  await page.evaluate(([key, value]) => localStorage.setItem(key, JSON.stringify(value)), [SAVE_KEY, seed]);
  await page.reload({ waitUntil: "networkidle" });
  await waitFor((state) => state.art?.ready === true, "deferred art readiness", 20_000);
  await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(4, true));
  const initial = (await waitFor(
    (state) => state.screen === "playing" && state.level.id === 4 && state.activeRun?.levelId === 4,
    "playable Lv4",
  )).state;
  const baselineCoins = initial.economy.coins;
  const level4Reward = 20;
  const directTiming = await page.evaluate(async () => {
    const { directLevelTransitionTiming } = await import("/src/game/completionFlow.ts");
    return directLevelTransitionTiming(false);
  });
  closeTo(directTiming.modelSwitchAt, 0.31, 0.001, "direct model-switch timing");
  closeTo(directTiming.enterAt, 0.45, 0.001, "direct enter timing");
  closeTo(directTiming.travelScreens, 1.1, 0.001, "direct offscreen travel");

  await takeDrawAudit();
  const level4Solution = await runVerifiedRoute(4);
  const exit = await waitFor(
    (state) => state.completionFlow?.directTransition?.phase === "exit"
      && state.completionFlow.directTransition.boardOffsetScreens < -0.08,
    "Lv4 board exit phase",
  );
  assert(exit.observations.every(({ screen }) => screen !== "win"), "Lv4 displayed a win screen before direct transition");
  assert(exit.state.level.id === 4 && exit.state.screen === "playing", "Lv4 exit phase is not the outgoing board");
  await page.screenshot({ path: shot("01-lv4-board-exit-left.png") });

  const outgoingGap = await waitFor(
    (state) => state.completionFlow?.directTransition?.phase === "gap"
      && state.completionFlow.directTransition.switched === false
      && state.level.id === 4,
    "outgoing empty-board gap phase",
  );
  closeTo(outgoingGap.state.completionFlow.directTransition.boardOffsetScreens,
    -directTiming.travelScreens, 0.001, "outgoing gap board offset");
  assert(outgoingGap.state.completionFlow.directTransition.age < directTiming.modelSwitchAt,
    "outgoing gap switched later than the 310ms midpoint");
  await page.screenshot({ path: shot("02-outgoing-empty-board-gap-hud-fixed.png") });

  const switchedGap = await waitFor(
    (state) => state.completionFlow?.directTransition?.phase === "gap"
      && state.completionFlow.directTransition.switched === true
      && state.level.id === 5,
    "switched empty-board gap phase",
  );
  closeTo(switchedGap.state.completionFlow.directTransition.boardOffsetScreens,
    directTiming.travelScreens, 0.001, "switched gap board offset");
  assert(switchedGap.state.completionFlow.directTransition.age >= directTiming.modelSwitchAt
      && switchedGap.state.completionFlow.directTransition.age < directTiming.enterAt
      && switchedGap.state.puzzle.remainingSeconds === switchedGap.state.level.timeSeconds
      && switchedGap.state.puzzle.started === false,
    "Lv5 model/HUD timer did not switch while its board remained offscreen");
  await page.screenshot({ path: shot("03-switched-empty-lv5-board-gap-hud-fixed.png") });

  const enter = await waitFor(
    (state) => state.completionFlow?.directTransition?.phase === "enter"
      && state.completionFlow.directTransition.boardOffsetScreens > 0.08,
    "Lv5 board enter phase",
  );
  assert(enter.state.level.id === 5 && enter.state.completionFlow.directTransition.switched === true,
    "enter phase did not render the incoming Lv5 board");
  assert(enter.state.completionFlow.directTransition.age >= directTiming.enterAt,
    "Lv5 board entered before the 450ms enter boundary");
  await page.screenshot({ path: shot("04-lv5-board-enter-right.png") });

  const directFinished = await waitFor(
    (state) => !state.completionFlow?.directTransition
      && state.level.id === 5
      && (state.screen === "playing" || state.screen === "feature"),
    "settled Lv5 or its first-time feature card",
  );
  assert(
    [
      ...exit.observations,
      ...outgoingGap.observations,
      ...switchedGap.observations,
      ...enter.observations,
      ...directFinished.observations,
    ]
      .every(({ screen }) => screen !== "win"),
    "Lv4 direct completion rendered the formal win screen",
  );

  let afterLv4Disk = await stored();
  assert(afterLv4Disk.coins === baselineCoins + level4Reward,
    `Lv4 persisted ${afterLv4Disk.coins - baselineCoins} coins instead of ${level4Reward}`);
  assert(countLevel(afterLv4Disk.rewardedLevels, 4) === 1, "Lv4 reward ledger did not contain exactly one entry");
  assert(afterLv4Disk.currentLevel === 5, "Lv4 direct completion did not persist Lv5 as current");

  if (directFinished.state.screen === "feature") {
    await page.screenshot({ path: shot("04-lv5-feature-after-transition.png") });
    await clickInteractionTarget("featurePrimary");
    await waitFor(
      (state) => state.screen === "playing" && state.level.id === 5,
      "Lv5 after feature acknowledgement",
    );
  }
  await page.screenshot({ path: shot("05-lv5-ready.png") });
  await page.waitForTimeout(40);

  const transitionAudit = await takeDrawAudit();
  const transitionFrames = groupDrawAudit(transitionAudit);
  const lv4BaselineFrame = pickFrame(
    transitionFrames,
    (state) => state.screen === "playing" && state.levelId === 4 && !state.directTransition,
    (frame) => frame.frame,
  );
  const exitFrame = pickFrame(
    transitionFrames,
    (state) => state.directTransition?.phase === "exit" && state.levelId === 4,
    (frame) => -frame.marker.state.directTransition.boardOffsetScreens,
  );
  const outgoingGapFrame = pickFrame(
    transitionFrames,
    (state) => state.directTransition?.phase === "gap"
      && state.directTransition.switched === false
      && state.levelId === 4,
    (frame) => frame.frame,
  );
  const switchedGapFrame = pickFrame(
    transitionFrames,
    (state) => state.directTransition?.phase === "gap"
      && state.directTransition.switched === true
      && state.levelId === 5,
    (frame) => frame.frame,
  );
  const enterFrame = pickFrame(
    transitionFrames,
    (state) => state.directTransition?.phase === "enter" && state.levelId === 5,
    (frame) => frame.marker.state.directTransition.boardOffsetScreens,
  );
  const lv5BaselineFrame = pickFrame(
    transitionFrames,
    (state) => state.screen === "playing" && state.levelId === 5 && !state.directTransition,
    (frame) => frame.frame,
  );

  const renderedTransition = {
    lv4Baseline: matrixSummary(lv4BaselineFrame),
    exit: matrixSummary(exitFrame),
    outgoingGap: matrixSummary(outgoingGapFrame),
    switchedGap: matrixSummary(switchedGapFrame),
    enter: matrixSummary(enterFrame),
    lv5Baseline: matrixSummary(lv5BaselineFrame),
  };
  for (const [name, sample] of Object.entries(renderedTransition)) {
    if (name === "lv4Baseline") continue;
    assertFixedMatrix(sample.hud, renderedTransition.lv4Baseline.hud, `${name} HUD matrix`);
    assertFixedMatrix(sample.booster, renderedTransition.lv4Baseline.booster, `${name} booster matrix`);
  }

  for (const [name, sample, baseline] of [
    ["exit", renderedTransition.exit, renderedTransition.lv4Baseline],
    ["outgoingGap", renderedTransition.outgoingGap, renderedTransition.lv4Baseline],
    ["switchedGap", renderedTransition.switchedGap, renderedTransition.lv5Baseline],
    ["enter", renderedTransition.enter, renderedTransition.lv5Baseline],
  ]) {
    const expectedOffset = sample.state.directTransition.boardOffsetScreens * LOGICAL_WIDTH;
    closeTo(
      sample.boardFloor.e - baseline.boardFloor.e,
      expectedOffset,
      1.5,
      `${name} rendered board translation`,
    );
  }
  assert(renderedTransition.exit.boardFloor.e < renderedTransition.lv4Baseline.boardFloor.e,
    "outgoing Lv4 board was not rendered to the left");
  assert(renderedTransition.outgoingGap.boardFloor.e
      < renderedTransition.lv4Baseline.boardFloor.e - LOGICAL_WIDTH,
    "outgoing gap did not render the old board completely off the left edge");
  assert(renderedTransition.switchedGap.boardFloor.e
      > renderedTransition.lv5Baseline.boardFloor.e + LOGICAL_WIDTH,
    "switched gap did not keep the new board completely off the right edge");
  assert(renderedTransition.enter.boardFloor.e > renderedTransition.lv5Baseline.boardFloor.e,
    "incoming Lv5 board was not rendered from the right");

  report.directTransition = {
    solutionGestures: level4Solution.drags.length,
    level4Reward,
    persistedCoins: afterLv4Disk.coins,
    timing: directTiming,
    phases: ["exit", "outgoing-gap", "switched-gap", "enter"],
    renderedTransition,
  };

  await takeDrawAudit();
  const beforeLv5 = await debug();
  const level5Reward = 20;
  const coinsBeforeLv5 = beforeLv5.economy.coins;
  const level5Solution = await runVerifiedRoute(5);
  const win = await waitFor(
    (state) => state.screen === "win"
      && state.level.id === 5
      && Boolean(state.interactionTargets?.targets?.modalPrimary?.hit),
    "Lv5 formal win result",
  );
  assert(!win.state.completionFlow?.directTransition, "Lv5 incorrectly used the Lv1-4 direct transition");
  assert(win.state.settlement.rewardPresented === true && win.state.settlement.coinReward === level5Reward,
    "Lv5 result did not present the committed reward");
  await page.screenshot({ path: shot("06-lv5-win-result.png") });

  const afterLv5Disk = await stored();
  const finalCoins = coinsBeforeLv5 + level5Reward;
  assert(afterLv5Disk.coins === finalCoins, "Lv5 reward was not persisted before Continue");
  assert(countLevel(afterLv5Disk.rewardedLevels, 5) === 1, "Lv5 reward ledger did not contain exactly one entry");

  await takeDrawAudit();
  const continueAt = Date.now();
  await clickInteractionTarget("modalPrimary");
  const homeFlight = await waitFor(
    (state) => state.screen === "home" && Boolean(state.completionFlow?.coinFlight),
    "immediate Home coin flight after Continue",
  );
  const continueToHomeMs = Date.now() - continueAt;
  assert(continueToHomeMs < 250, `Continue took ${continueToHomeMs}ms to reach Home`);
  assert(homeFlight.state.economy.coins === finalCoins, "runtime balance was not already final on Home");
  assert(homeFlight.state.economy.visualCoins === coinsBeforeLv5,
    "Home visual balance did not start from the pre-reward value");
  assert(homeFlight.state.completionFlow.coinFlight.startCoins === coinsBeforeLv5
    && homeFlight.state.completionFlow.coinFlight.endCoins === finalCoins,
  "coin flight endpoints do not match the persisted transaction");
  assert(homeFlight.state.completionFlow.coinFlight.coinCount === 5, "coin flight did not create five coins");
  assert((await stored()).coins === finalCoins, "stored balance regressed while visual balance was staged");
  await page.screenshot({ path: shot("07-home-before-130ms-delay.png") });

  const inputLockState = (await waitFor(
    (state) => state.completionFlow?.coinFlight?.age >= 0.24
      && state.completionFlow.coinFlight.age < 0.7,
    "coin flight input-lock probe",
  )).state;
  const settingsHit = inputLockState.interactionTargets.targets.homeSettings.hit;
  const settingsPoint = await clientPoint(
    settingsHit.x + settingsHit.width / 2,
    settingsHit.y + settingsHit.height / 2,
    inputLockState,
  );
  await page.mouse.click(settingsPoint.x, settingsPoint.y);
  await page.waitForTimeout(25);
  const afterLockedClick = await debug();
  assert(afterLockedClick.screen === "home" && afterLockedClick.completionFlow?.coinFlight,
    "Home input was accepted while coins were flying");
  assert(!afterLockedClick.buttonPress, "a button press survived the coin-flight input lock");

  await waitFor(
    (state) => state.completionFlow?.coinFlight?.age >= 0.52,
    "all five coins entering flight",
  );
  await page.screenshot({ path: shot("08-five-coins-staggered-in-flight.png") });
  await waitFor(
    (state) => state.completionFlow?.coinFlight?.landedCount >= 1,
    "first coin arrival",
  );
  await page.screenshot({ path: shot("09-coins-arriving-at-total.png") });
  const flightFinished = await waitFor(
    (state) => state.screen === "home" && !state.completionFlow?.coinFlight,
    "coin flight settlement",
  );
  assert(flightFinished.state.economy.coins === finalCoins
    && flightFinished.state.economy.visualCoins === finalCoins,
  "visual and stored balances did not converge after the fifth landing");
  await page.screenshot({ path: shot("10-home-coins-settled.png") });

  const flightAudit = await takeDrawAudit();
  const flightFrames = groupDrawAudit(flightAudit)
    .filter((frame) => frame.marker.state.coinFlight)
    .sort((left, right) => left.marker.state.coinFlight.age - right.marker.state.coinFlight.age);
  assert(flightFrames.length > 0, "no rendered coin-flight frames were captured");
  const beforeDelay = flightFrames.find((frame) => frame.marker.state.coinFlight.age <= 0.12);
  assert(beforeDelay, "no pre-delay frame was captured before 130ms");
  assert(beforeDelay.draws.filter(({ kind }) => kind === "flightCoin").length === 0,
    "a coin was drawn before the 130ms launch delay");

  const firstProgressAges = [];
  for (let index = 0; index < 5; index += 1) {
    const first = flightFrames.find((frame) => (
      frame.marker.state.coinFlight.coins[index].progress > 0
    ));
    assert(first, `coin ${index} never began flying`);
    const expectedAge = 0.13 + index * 0.08;
    assert(first.marker.state.coinFlight.age >= expectedAge - 0.001,
      `coin ${index} began before its ${expectedAge}s stagger`);
    assert(first.marker.state.coinFlight.age <= expectedAge + 0.06,
      `coin ${index} began too late for its ${expectedAge}s stagger`);
    firstProgressAges.push(first.marker.state.coinFlight.age);
  }

  const frameTrajectory = new Map();
  const target = flightFrames[0].marker.state.coinFlight.target;
  for (const frame of flightFrames) {
    const flight = frame.marker.state.coinFlight;
    const coinDraws = frame.draws.filter(({ kind }) => kind === "flightCoin");
    const activeIndices = flight.coins
      .filter(({ progress }) => progress > 0 && progress < 1)
      .map(({ index }) => index);
    if (coinDraws.length !== activeIndices.length) continue;
    const viewport = frame.marker.state.viewportTransform;
    const positions = activeIndices.map((index, drawIndex) => {
      const matrix = coinDraws[drawIndex].matrix;
      const pixelRatio = frame.marker.state.devicePixelRatio;
      const x = (matrix.e / pixelRatio - viewport.offsetX) / viewport.scale;
      const y = (matrix.f / pixelRatio - viewport.offsetY) / viewport.scale;
      return { index, x, y, distanceToTarget: Math.hypot(x - target.x, y - target.y) };
    });
    frameTrajectory.set(frame.frame, { age: flight.age, positions });
  }

  const trajectories = Array.from({ length: 5 }, (_, index) => {
    const points = [...frameTrajectory.values()]
      .flatMap((frame) => frame.positions
        .filter((position) => position.index === index)
        .map((position) => ({ age: frame.age, ...position })));
    assert(points.length >= 8, `coin ${index} has too few real canvas trajectory samples`);
    const first = points[0];
    const last = points.at(-1);
    assert(last.distanceToTarget < 80,
      `coin ${index} ended ${last.distanceToTarget.toFixed(1)}px away from the actual coin-total target`);
    assert(last.distanceToTarget < first.distanceToTarget * 0.24,
      `coin ${index} trajectory did not converge on the actual target`);
    return {
      index,
      samples: points.length,
      first: { age: first.age, x: first.x, y: first.y, distanceToTarget: first.distanceToTarget },
      last: { age: last.age, x: last.x, y: last.y, distanceToTarget: last.distanceToTarget },
    };
  });

  const maximumSimultaneousCoins = Math.max(
    ...flightFrames.map((frame) => frame.draws.filter(({ kind }) => kind === "flightCoin").length),
  );
  assert(maximumSimultaneousCoins === 5,
    `expected five staggered visible coins, observed ${maximumSimultaneousCoins}`);

  const displayedByLanding = {};
  for (let landed = 0; landed <= 5; landed += 1) {
    const frame = flightFrames.find((candidate) => candidate.marker.state.coinFlight.landedCount === landed);
    assert(frame, `no rendered balance sample exists for landedCount=${landed}`);
    const expected = Math.round(coinsBeforeLv5 + (level5Reward * landed) / 5);
    const displayed = frame.marker.state.coinFlight.displayedCoins;
    assert(displayed === expected,
      `landedCount=${landed} displayed ${displayed}, expected incremental balance ${expected}`);
    displayedByLanding[landed] = displayed;
  }

  const diskBeforeRefresh = await stored();
  assert(diskBeforeRefresh.coins === finalCoins && countLevel(diskBeforeRefresh.rewardedLevels, 5) === 1,
    "coin animation mutated the committed Lv5 transaction");
  await page.reload({ waitUntil: "networkidle" });
  const refreshed = (await waitFor(
    (state) => state.art?.ready === true && state.screen === "home",
    "refreshed Home after completed coin flight",
    20_000,
  )).state;
  await page.waitForTimeout(450);
  const refreshedStable = await debug();
  const diskAfterRefresh = await stored();
  assert(!refreshed.completionFlow?.coinFlight && !refreshedStable.completionFlow?.coinFlight,
    "refresh replayed the one-shot coin flight");
  assert(refreshedStable.economy.coins === finalCoins
    && refreshedStable.economy.visualCoins === finalCoins
    && diskAfterRefresh.coins === finalCoins,
  "refresh changed the settled coin balance");
  assert(countLevel(diskAfterRefresh.rewardedLevels, 4) === 1
    && countLevel(diskAfterRefresh.rewardedLevels, 5) === 1,
  "refresh duplicated a completion reward ledger entry");
  await page.screenshot({ path: shot("11-home-after-refresh-no-replay.png") });

  report.standardSettlement = {
    level: 5,
    solutionGestures: level5Solution.drags.length,
    reward: level5Reward,
    continueToHomeMs,
    coinsBeforeReward: coinsBeforeLv5,
    persistedCoinsBeforeAnimation: afterLv5Disk.coins,
    finalCoins,
  };
  report.coinFlight = {
    delaySeconds: 0.13,
    staggerSeconds: 0.08,
    coinCount: 5,
    firstProgressAges,
    maximumSimultaneousCoins,
    target,
    trajectories,
    displayedByLanding,
    inputLocked: true,
    replayedAfterRefresh: false,
  };
  report.storage = {
    afterLevel4: {
      coins: afterLv4Disk.coins,
      rewardedLevel4Count: countLevel(afterLv4Disk.rewardedLevels, 4),
    },
    afterLevel5: {
      coins: afterLv5Disk.coins,
      rewardedLevel5Count: countLevel(afterLv5Disk.rewardedLevels, 5),
    },
    afterRefresh: {
      coins: diskAfterRefresh.coins,
      rewardedLevel4Count: countLevel(diskAfterRefresh.rewardedLevels, 4),
      rewardedLevel5Count: countLevel(diskAfterRefresh.rewardedLevels, 5),
    },
  };

  await writeFile(shot("report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
} finally {
  await context.close();
  await browser.close();
}

assert(browserErrors.length === 0, `browser errors:\n${browserErrors.join("\n")}`);
console.log(
  "Lv4 direct exit/outgoing-gap/switched-gap/enter, fixed HUD/boosters, Lv5 formal Continue, "
  + "five-coin Home flight, input lock, incremental balance, and no-refresh replay passed.",
);
