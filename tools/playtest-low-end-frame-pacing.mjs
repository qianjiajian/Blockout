import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/low-end-frame-pacing/", import.meta.url));
const reportPath = resolve(output, "low-end-frame-pacing-report.json");
const screenshotPath = resolve(output, "01-dpr2-throttled-drag.png");
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });

const VIEWPORT = { width: 360, height: 792 };
const DEVICE_SCALE_FACTOR = 2;
const CPU_THROTTLE_RATE = 4;
const SAMPLE_MOVES = 120;
const FRAME_P95_BUDGET_MS = 40;
const CALLBACK_P95_BUDGET_MS = 12;
// Mean rAF cadence varies after a long browser suite; p95, long-frame ratio,
// and throttled callback time remain the hard rendering-cost gates below.
const MINIMUM_BASELINE_MEAN_FPS = 45;
const VERY_LONG_FRAME_MS = 50;
const MAX_VERY_LONG_FRAME_RATIO = 0.05;

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
  boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: {},
  bestMoves: {},
  rewardedLevels: [],
  dailyStreak: 0,
  lastDailyCompletedDay: "",
};

const percentile = (values, ratio) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)];
};
const summarize = (values) => ({
  samples: values.length,
  meanMs: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0,
  p50Ms: percentile(values, 0.5),
  p95Ms: percentile(values, 0.95),
  p99Ms: percentile(values, 0.99),
  worstMs: values.length ? Math.max(...values) : 0,
});

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: DEVICE_SCALE_FACTOR });
const page = await context.newPage();
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.stack ?? error.message));

// Wrap the same requestAnimationFrame entry point used by WebHost. The callback
// duration represents the game's render/update work; timestamp gaps represent
// the player-visible frame pacing of the throttled browser.
await page.addInitScript(() => {
  const probe = { enabled: false, timestamps: [], callbackMs: [] };
  Object.defineProperty(window, "__FRAME_BUDGET_PROBE__", { value: probe, configurable: false });
  const nativeRequestAnimationFrame = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (callback) => nativeRequestAnimationFrame((timestamp) => {
    const startedAt = performance.now();
    try {
      callback(timestamp);
    } finally {
      if (probe.enabled) {
        probe.timestamps.push(timestamp);
        probe.callbackMs.push(performance.now() - startedAt);
      }
    }
  });
});

const cdp = await context.newCDPSession(page);
await page.goto(playtestUrl, { waitUntil: "networkidle" });
await page.evaluate((value) => localStorage.setItem("color-escape-save-v1", JSON.stringify(value)), save);
await page.reload({ waitUntil: "networkidle" });
await page.waitForFunction(() => Boolean(window.__COLOR_ESCAPE__?.getDebugState().art?.ready));

const fixture = await page.evaluate(async () => {
  const [{ LEVELS }, { PuzzleModel }, { createContinuousCollisionValidator }] = await Promise.all([
    import("/src/core/levels.ts"),
    import("/src/core/PuzzleModel.ts"),
    import("/src/game/continuousDrag.ts"),
  ]);
  const candidates = [];
  for (const level of LEVELS.filter((candidate) => candidate.id >= 50)) {
    const model = new PuzzleModel(level);
    const snapshot = model.snapshot();
    for (const block of snapshot.blocks) {
      if (!model.isBlockActive(block)) continue;
      const valid = createContinuousCollisionValidator(snapshot, block.id);
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        if (!model.canPlace(block, block.x + dx, block.y + dy)) continue;
        if (!valid(block.x + dx * 0.82, block.y + dy * 0.82)) continue;
        candidates.push({
          levelId: level.id,
          blockId: block.id,
          dx,
          dy,
          blockCount: snapshot.blocks.length,
          playableCells: snapshot.playable.length,
          boardWidth: snapshot.width,
          boardHeight: snapshot.height,
        });
      }
    }
  }
  candidates.sort((left, right) => right.blockCount - left.blockCount
    || right.playableCells - left.playableCells
    || right.levelId - left.levelId);
  if (!candidates[0]) throw new Error("Low-end frame pacing: no movable high-density fixture");
  return candidates[0];
});

await page.evaluate((levelId) => window.__COLOR_ESCAPE__.loadLevel(levelId, true), fixture.levelId);
await page.waitForTimeout(250);
const initialState = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const initialBlock = initialState.puzzle.blocks.find((block) => block.id === fixture.blockId);
if (!initialBlock) throw new Error(`Low-end frame pacing: missing fixture block ${fixture.blockId}`);

const canvas = await page.locator("canvas").evaluate((element) => {
  const bounds = element.getBoundingClientRect();
  return {
    cssWidth: bounds.width,
    cssHeight: bounds.height,
    pixelWidth: element.width,
    pixelHeight: element.height,
    devicePixelRatio: window.devicePixelRatio,
  };
});
if (canvas.pixelWidth !== 720 || canvas.pixelHeight !== 1584) {
  throw new Error(`Low-end frame pacing: expected 720x1584 DPR2 canvas, received ${canvas.pixelWidth}x${canvas.pixelHeight}`);
}

const toPagePoint = (logicalX, logicalY) => {
  const transform = initialState.viewportTransform;
  return {
    x: transform.offsetX + logicalX * transform.scale,
    y: transform.offsetY + logicalY * transform.scale,
  };
};
const [anchorX, anchorY] = initialBlock.shape[0];
const logicalStart = {
  x: initialState.board.innerX + (initialBlock.x + anchorX + 0.5) * initialState.board.cell,
  y: initialState.board.innerY + (initialBlock.y + anchorY + 0.5) * initialState.board.cell,
};
const start = toPagePoint(logicalStart.x, logicalStart.y);
const excursion = {
  x: fixture.dx * initialState.board.cell * initialState.viewportTransform.scale * 0.82,
  y: fixture.dy * initialState.board.cell * initialState.viewportTransform.scale * 0.82,
};

const runDragSample = async (capture = false) => {
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.evaluate(({ startPoint, dragExcursion, sampleMoves }) => new Promise((resolveSample) => {
    const probe = window.__FRAME_BUDGET_PROBE__;
    const canvasElement = document.querySelector("canvas");
    if (!canvasElement) throw new Error("Low-end frame pacing: canvas is missing");
    probe.timestamps.length = 0;
    probe.callbackMs.length = 0;
    probe.enabled = true;
    let index = 0;
    const step = () => {
      const phase = index % 60;
      const progress = phase <= 30 ? phase / 30 : (60 - phase) / 30;
      canvasElement.dispatchEvent(new PointerEvent("pointermove", {
        bubbles: true,
        pointerId: 1,
        pointerType: "mouse",
        isPrimary: true,
        buttons: 1,
        clientX: startPoint.x + dragExcursion.x * progress,
        clientY: startPoint.y + dragExcursion.y * progress,
      }));
      index += 1;
      if (index < sampleMoves) requestAnimationFrame(step);
      else resolveSample();
    };
    requestAnimationFrame(step);
  }), { startPoint: start, dragExcursion: excursion, sampleMoves: SAMPLE_MOVES });
  if (capture) await page.screenshot({ path: screenshotPath });
  await page.mouse.up();
  await page.waitForTimeout(140);
  return page.evaluate(() => {
    const probe = window.__FRAME_BUDGET_PROBE__;
    probe.enabled = false;
    return { timestamps: [...probe.timestamps], callbackMs: [...probe.callbackMs] };
  });
};

const sampleSummary = (rawProbe) => {
  const frameTimestamps = rawProbe.timestamps.filter((timestamp, index, values) => index === 0 || Math.abs(timestamp - values[index - 1]) > 0.01);
  const frameIntervals = frameTimestamps.slice(1).map((timestamp, index) => timestamp - frameTimestamps[index])
    .filter((value) => value > 0 && value < 500);
  const intervalSummary = summarize(frameIntervals);
  const callbackSummary = summarize(rawProbe.callbackMs);
  const veryLongFrames = frameIntervals.filter((value) => value > VERY_LONG_FRAME_MS).length;
  return {
    frameIntervals: {
      ...intervalSummary,
      estimatedMeanFps: intervalSummary.meanMs ? 1000 / intervalSummary.meanMs : 0,
      veryLongFrameThresholdMs: VERY_LONG_FRAME_MS,
      veryLongFrames,
      veryLongFrameRatio: frameIntervals.length ? veryLongFrames / frameIntervals.length : 1,
    },
    gameCallbacks: callbackSummary,
  };
};

await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
const baseline = sampleSummary(await runDragSample());
await page.evaluate((levelId) => window.__COLOR_ESCAPE__.loadLevel(levelId, true), fixture.levelId);
await page.waitForTimeout(180);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU_THROTTLE_RATE });
const throttled = sampleSummary(await runDragSample(true));
const finalState = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const report = {
  environment: {
    viewportCss: VIEWPORT,
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
    cpuThrottleRate: CPU_THROTTLE_RATE,
    authoredCanvasPixels: { width: 720, height: 1584 },
    canvas,
  },
  workload: {
    ...fixture,
    blockCells: initialBlock.shape.length,
    pointerMoves: SAMPLE_MOVES,
    inputCadence: "one synthetic pointermove per animation frame",
    excursionCells: 0.82,
    finalMoves: finalState.puzzle.moves,
  },
  baseline,
  throttled: {
    ...throttled,
    frameIntervalNote: "CDP CPU throttling stretches Chromium's rAF scheduling; throttled frame intervals are diagnostic only. The release gate uses the throttled game-callback duration.",
  },
  budgets: {
    minimumBaselineFrameSamples: 90,
    minimumBaselineMeanFps: MINIMUM_BASELINE_MEAN_FPS,
    baselineFrameP95Ms: FRAME_P95_BUDGET_MS,
    throttledCallbackP95Ms: CALLBACK_P95_BUDGET_MS,
    maxBaselineVeryLongFrameRatio: MAX_VERY_LONG_FRAME_RATIO,
  },
  browserErrors: errors,
  note: "Automated Chromium preflight only; WeChat low-end physical-device FPS, memory and interruption checks remain manual release gates.",
};
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

await context.close();
await browser.close();

if (errors.length) throw new Error(`Low-end frame pacing browser errors:\n${errors.join("\n")}`);
if (baseline.frameIntervals.samples < report.budgets.minimumBaselineFrameSamples) {
  throw new Error(`Low-end frame pacing: only ${baseline.frameIntervals.samples} baseline frame samples`);
}
if (baseline.frameIntervals.p95Ms > FRAME_P95_BUDGET_MS) {
  throw new Error(`Low-end frame pacing: baseline p95 interval ${baseline.frameIntervals.p95Ms.toFixed(2)} ms exceeds ${FRAME_P95_BUDGET_MS} ms`);
}
if (baseline.frameIntervals.estimatedMeanFps < MINIMUM_BASELINE_MEAN_FPS) {
  throw new Error(`Low-end frame pacing: baseline mean ${baseline.frameIntervals.estimatedMeanFps.toFixed(1)} FPS is below ${MINIMUM_BASELINE_MEAN_FPS} FPS`);
}
if (throttled.gameCallbacks.p95Ms > CALLBACK_P95_BUDGET_MS) {
  throw new Error(`Low-end frame pacing: 4x CPU p95 callback ${throttled.gameCallbacks.p95Ms.toFixed(2)} ms exceeds ${CALLBACK_P95_BUDGET_MS} ms`);
}
if (baseline.frameIntervals.veryLongFrameRatio > MAX_VERY_LONG_FRAME_RATIO) {
  throw new Error(`Low-end frame pacing: ${(baseline.frameIntervals.veryLongFrameRatio * 100).toFixed(1)}% baseline frames exceed ${VERY_LONG_FRAME_MS} ms`);
}
if (finalState.puzzle.moves !== 1) {
  throw new Error(`Low-end frame pacing: drag workload committed ${finalState.puzzle.moves} moves instead of exactly one`);
}
console.log(`Low-end frame pacing passed: DPR2 720x1584, baseline interval p95 ${baseline.frameIntervals.p95Ms.toFixed(2)} ms, 4x CPU callback p95 ${throttled.gameCallbacks.p95Ms.toFixed(2)} ms.`);
