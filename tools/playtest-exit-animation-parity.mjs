import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = resolve(root, "playtest-results/experiments/exit-animation-parity");
const nativeFrameOutput = resolve(output, "native-frames");
const benchmark = JSON.parse(await readFile(resolve(root, "references/benchmark/video/exit-animation-benchmark.json"), "utf8"));
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });
await mkdir(nativeFrameOutput, { recursive: true });

const save = {
  schemaVersion: 1,
  currentLevel: 1,
  highestLevel: 100,
  coins: 1000,
  sound: false,
  haptic: false,
  reducedMotion: false,
  featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter"],
  boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: {},
  bestMoves: {},
  rewardedLevels: [1, 2, 3],
  dailyStreak: 0,
  lastDailyCompletedDay: "",
};

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 496, height: 1078 }, deviceScaleFactor: 1 });
const browserErrors = [];
const forbiddenTailRequests = [];
page.on("console", (message) => { if (message.type() === "error") browserErrors.push(message.text()); });
page.on("pageerror", (error) => browserErrors.push(error.message));
page.on("request", (request) => {
  if (request.url().includes("exit-suction-trail")) forbiddenTailRequests.push(request.url());
});

await page.clock.install({ time: new Date("2026-09-11T12:00:00+08:00") });
await page.goto(playtestUrl, { waitUntil: "networkidle" });
await page.evaluate((value) => localStorage.setItem("color-escape-save-v1", JSON.stringify(value)), save);
await page.reload({ waitUntil: "networkidle" });
await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready, undefined, { timeout: 5_000 });
await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1_000);

const installFixtureModel = (keepSecondRed, startY = 0) => page.evaluate(async ({ keepSecondRed, startY }) => {
  const { PuzzleModel } = await import("/src/core/PuzzleModel.ts");
  const game = window.__COLOR_ESCAPE__;
  const playable = Array.from({ length: 5 }, (_, y) => (
    Array.from({ length: 5 }, (__, x) => [x, y])
  )).flat();
  game.loadLevel(1, true);
  game.model = new PuzzleModel({
    id: 991,
    name: "Exit animation parity fixture",
    difficulty: "normal",
    timeSeconds: 180,
    reward: 0,
    parMoves: 2,
    width: 5,
    height: 5,
    playable,
    blocked: [],
    gates: [
      { id: "red-top", side: "top", offset: 1, size: 2, color: "red" },
      { id: "blue-bottom", side: "bottom", offset: 4, size: 1, color: "blue" },
    ],
    blocks: [
      { id: "red-exit", x: 1, y: startY, shape: [[0, 0], [1, 0], [0, 1], [1, 1]], color: "red" },
      ...(keepSecondRed ? [{ id: "red-remains", x: 3, y: 3, shape: [[0, 0]], color: "red" }] : []),
      { id: "blue-remains", x: 4, y: 4, shape: [[0, 0]], color: "blue" },
    ],
  });
  game.selectedId = undefined;
  game.activePointer = undefined;
  game.dragVisual = undefined;
  game.particles = [];
  game.exitGhosts = [];
  game.exitPulses = [];
  game.pendingCelebration = 0;
  game.dirty = true;
  game.render();
}, { keepSecondRed, startY });

const waitForFixtureArt = () => page.waitForFunction(() => {
  const formal = window.__COLOR_ESCAPE__?.getDebugState().art.formalGameplay;
  return formal?.requestedBlockSignature == null && formal?.missingWholeBlockIds.length === 0;
}, undefined, { timeout: 5_000 });

const installWideGateChannelFixture = (startY) => page.evaluate(async ({ startY }) => {
  const { PuzzleModel } = await import("/src/core/PuzzleModel.ts");
  const game = window.__COLOR_ESCAPE__;
  const playable = Array.from({ length: 5 }, (_, y) => (
    Array.from({ length: 5 }, (__, x) => [x, y])
  )).flat();
  game.loadLevel(1, true);
  game.model = new PuzzleModel({
    id: 992,
    name: "Wide gate grid-channel fixture",
    difficulty: "normal",
    timeSeconds: 180,
    reward: 0,
    parMoves: 1,
    width: 5,
    height: 5,
    playable,
    blocked: [],
    // A one-cell block deliberately exits through the left-most grid channel
    // of this three-cell gate. It must not be recentered on the complete gate.
    gates: [{ id: "red-top-wide", side: "top", offset: 1, size: 3, color: "red" }],
    blocks: [
      { id: "red-wide-channel", x: 1, y: startY, shape: [[0, 0]], color: "red" },
      { id: "blue-remains", x: 4, y: 4, shape: [[0, 0]], color: "blue" },
    ],
  });
  game.selectedId = undefined;
  game.activePointer = undefined;
  game.dragVisual = undefined;
  game.particles = [];
  game.exitGhosts = [];
  game.exitPulses = [];
  game.pendingCelebration = 0;
  game.dirty = true;
  game.render();
}, { startY });

const installRightBottomChannelFixture = (startX) => page.evaluate(async ({ startX }) => {
  const { PuzzleModel } = await import("/src/core/PuzzleModel.ts");
  const game = window.__COLOR_ESCAPE__;
  const playable = Array.from({ length: 5 }, (_, y) => (
    Array.from({ length: 5 }, (__, x) => [x, y])
  )).flat();
  game.loadLevel(1, true);
  game.model = new PuzzleModel({
    id: 993,
    name: "Right-bottom corner exit fixture",
    difficulty: "normal",
    timeSeconds: 180,
    reward: 0,
    parMoves: 1,
    width: 5,
    height: 5,
    playable,
    blocked: [],
    gates: [{ id: "orange-right-bottom-gate", side: "right", offset: 4, size: 1, color: "orange" }],
    blocks: [
      { id: "orange-right-bottom", x: startX, y: 4, shape: [[0, 0], [1, 0]], color: "orange" },
      { id: "blue-remains", x: 0, y: 0, shape: [[0, 0]], color: "blue" },
    ],
  });
  game.selectedId = undefined;
  game.activePointer = undefined;
  game.dragVisual = undefined;
  game.particles = [];
  game.exitGhosts = [];
  game.exitPulses = [];
  game.pendingCelebration = 0;
  game.dirty = true;
  game.render();
}, { startX });

const installOpenFlipDoorFixture = (startX) => page.evaluate(async ({ startX }) => {
  const { PuzzleModel } = await import("/src/core/PuzzleModel.ts");
  const game = window.__COLOR_ESCAPE__;
  const playable = Array.from({ length: 5 }, (_, y) => (
    Array.from({ length: 5 }, (__, x) => [x, y])
  )).flat();
  game.loadLevel(1, true);
  game.model = new PuzzleModel({
    id: 997,
    name: "Open flip-door exit layer fixture",
    difficulty: "normal",
    timeSeconds: 180,
    reward: 0,
    parMoves: 1,
    width: 5,
    height: 5,
    playable,
    blocked: [],
    gates: [],
    flipDoors: [{
      id: "orange-right-bottom-flip-door",
      side: "right",
      offset: 4,
      size: 1,
      color: "orange",
      initiallyOpen: true,
    }],
    blocks: [
      { id: "orange-flip-door-exit", x: startX, y: 4, shape: [[0, 0], [1, 0]], color: "orange" },
      { id: "blue-remains", x: 0, y: 0, shape: [[0, 0]], color: "blue" },
    ],
  });
  game.selectedId = undefined;
  game.activePointer = undefined;
  game.dragVisual = undefined;
  game.particles = [];
  game.exitGhosts = [];
  game.exitPulses = [];
  game.pendingCelebration = 0;
  game.dirty = true;
  game.render();
}, { startX });

const captureFormalDrawCalls = () => page.evaluate(() => {
  const game = window.__COLOR_ESCAPE__;
  const canvas = document.querySelector("canvas");
  const context = canvas.getContext("2d");
  const originalDrawImage = context.drawImage;
  const calls = [];
  const rounded = (value) => Number(value.toFixed(4));
  context.drawImage = function instrumentedDrawImage(image, ...args) {
    const source = image?.currentSrc || image?.src || "";
    const pathname = source ? new URL(source, window.location.href).pathname : "";
    const matrix = context.getTransform();
    calls.push({
      drawIndex: calls.length,
      pathname,
      matrix: {
        a: rounded(matrix.a),
        b: rounded(matrix.b),
        c: rounded(matrix.c),
        d: rounded(matrix.d),
        e: rounded(matrix.e),
        f: rounded(matrix.f),
      },
      args: args.map((value) => typeof value === "number" ? rounded(value) : `${value}`),
      alpha: rounded(context.globalAlpha),
      filter: context.filter,
      shadowBlur: rounded(context.shadowBlur),
    });
    return Reflect.apply(originalDrawImage, this, [image, ...args]);
  };
  try {
    game.render();
  } finally {
    context.drawImage = originalDrawImage;
  }
  const formalCalls = calls.filter((call) => (
    call.pathname.includes("/gameplay/board/formal-border-v2/")
    || call.pathname.includes("/gameplay/blocks/formal-v1/")
  ));
  const baseBorderCalls = formalCalls.filter((call) => (
    call.pathname.includes("/gameplay/board/formal-border-v2/")
    && call.filter === "none"
    && call.shadowBlur === 0
  ));
  return { formalCalls, baseBorderCalls };
});

const baseBorderSignature = (call) => ({
  asset: call.pathname.split("/").at(-1),
  matrix: call.matrix,
  args: call.args,
});

const installFixture = async (keepSecondRed) => {
  await installFixtureModel(keepSecondRed);
  await waitForFixtureArt();
  await page.evaluate(() => {
    const game = window.__COLOR_ESCAPE__;
    game.selectedId = "red-exit";
    game.model.beginAction();
    game.attemptExit("top");
    game.render();
  });
};

const triggerFractionalPointerExit = async () => {
  await installFixtureModel(false, 2);
  await waitForFixtureArt();
  const state = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
  const point = (x, y) => ({
    x: state.board.innerX + (x + 0.5) * state.board.cell,
    y: state.board.innerY + (y + 0.5) * state.board.cell,
  });
  const start = point(1, 2);
  const middle = point(1, 1);
  const edge = point(1, 0);
  const fractionalOffset = state.board.cell * 0.18;
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(middle.x + fractionalOffset, middle.y, { steps: 4 });
  await page.mouse.move(edge.x + fractionalOffset, edge.y, { steps: 4 });
  await page.evaluate(() => window.__COLOR_ESCAPE__.render());
  const triggered = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
  if (triggered.puzzle.blocks.some((block) => block.id === "red-exit")
    || triggered.exitGhosts !== 1
    || triggered.selectedId
    || triggered.activePointer !== undefined) {
    throw new Error(`Exit parity: fractional real Pointer did not trigger one exit ghost (${JSON.stringify(triggered)})`);
  }
  const metrics = await frameMetrics(0);
  if (metrics.largestInteriorRedComponent < 800) {
    throw new Error(`Exit parity: fractional real Pointer removed the body before gate ingest (${JSON.stringify(metrics)})`);
  }
  await page.screenshot({ path: resolve(output, "real-pointer-fractional-trigger.png") });
  await page.mouse.up();
  return metrics;
};

const advance = (milliseconds) => page.evaluate((delta) => {
  const game = window.__COLOR_ESCAPE__;
  const seconds = delta / 1000;
  game.updateParticles(seconds);
  game.updateExitGhosts(seconds);
  game.updateExitPulses(seconds);
  game.elapsed += seconds;
  game.render();
}, milliseconds);

const frameMetrics = (milliseconds) => page.evaluate(({ milliseconds, benchmarkFragmentCount }) => {
  const game = window.__COLOR_ESCAPE__;
  const state = game.getDebugState();
  const canvas = document.querySelector("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const board = state.board;
  const isRed = (x, y) => {
    if (x < 0 || y < 0 || x >= image.width || y >= image.height) return false;
    const index = (Math.floor(y) * image.width + Math.floor(x)) * 4;
    const red = image.data[index];
    const green = image.data[index + 1];
    const blue = image.data[index + 2];
    return red > 78 && red > green * 1.28 && red > blue * 1.12;
  };
  const regionMask = (left, top, right, bottom) => {
    const x0 = Math.max(0, Math.floor(left));
    const y0 = Math.max(0, Math.floor(top));
    const x1 = Math.min(image.width, Math.ceil(right));
    const y1 = Math.min(image.height, Math.ceil(bottom));
    const width = Math.max(0, x1 - x0);
    const height = Math.max(0, y1 - y0);
    const mask = new Uint8Array(width * height);
    let count = 0;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (!isRed(x0 + x, y0 + y)) continue;
        mask[y * width + x] = 1;
        count += 1;
      }
    }
    let largest = 0;
    const queueX = new Int32Array(mask.length);
    const queueY = new Int32Array(mask.length);
    for (let startY = 0; startY < height; startY += 1) {
      for (let startX = 0; startX < width; startX += 1) {
        const start = startY * width + startX;
        if (!mask[start]) continue;
        mask[start] = 0;
        let head = 0;
        let tail = 1;
        let area = 0;
        queueX[0] = startX;
        queueY[0] = startY;
        while (head < tail) {
          const x = queueX[head];
          const y = queueY[head];
          head += 1;
          area += 1;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            const next = ny * width + nx;
            if (!mask[next]) continue;
            mask[next] = 0;
            queueX[tail] = nx;
            queueY[tail] = ny;
            tail += 1;
          }
        }
        largest = Math.max(largest, area);
      }
    }
    return { count, largest };
  };
  const interior = regionMask(
    board.innerX + board.cell * 0.7,
    board.innerY,
    board.innerX + board.cell * 3.3,
    board.innerY + board.cell * 2.25,
  );
  const outside = regionMask(
    board.innerX,
    board.innerY - board.cell * 3.1,
    board.innerX + board.cell * 4,
    board.innerY - board.cell * 0.68,
  );
  const animation = state.exitAnimations.find((item) => item.mode === "gate");
  const gate = state.gateVisuals.find((item) => item.id === "red-top");
  return {
    milliseconds,
    interiorRedPixels: interior.count,
    largestInteriorRedComponent: interior.largest,
    outsideRedPixels: outside.count,
    particles: state.particles,
    exitFragments: state.exitFragments,
    exitFragmentBreakdown: state.exitFragmentBreakdown,
    ghostCount: state.exitGhosts,
    travelProgress: animation?.travelProgress ?? 1,
    ingestDuration: animation?.ingestDuration,
    emittedFragments: animation?.emittedFragments ?? benchmarkFragmentCount,
    gateOpacity: gate?.opacity ?? 0,
    gateTargetPresent: gate?.targetPresent ?? false,
  };
}, { milliseconds, benchmarkFragmentCount: benchmark.fragments.count });

const pointerTrigger = await triggerFractionalPointerExit();
await installFixture(false);
const sampleTimes = [0, 50, 100, 120, 150, 180, 200, 240, 260, 300, 400, 550, 600, 650, 800, 1000, 1200];
const timeline = [];
let elapsed = 0;
for (const milliseconds of sampleTimes) {
  if (milliseconds > elapsed) await advance(milliseconds - elapsed);
  elapsed = milliseconds;
  timeline.push(await frameMetrics(milliseconds));
  if ([0, 50, 100, 120, 150, 180, 200, 240, 260, 300, 400, 550, 600, 650, 800, 1000, 1200].includes(milliseconds)) {
    await page.screenshot({ path: resolve(output, `frame-${String(milliseconds).padStart(4, "0")}ms.png`) });
  }
}

const at = (milliseconds) => timeline.find((item) => item.milliseconds === milliseconds);
const bodyStart = at(0).largestInteriorRedComponent;
if (bodyStart < 800) throw new Error(`Exit parity: initial rigid body was not visible (${bodyStart}px)`);
if (Math.abs(at(0).ingestDuration - 0.26) > 0.001) {
  throw new Error(`Exit parity: tuned gate ingest duration drifted from 260ms (${at(0).ingestDuration})`);
}
if (!(at(50).largestInteriorRedComponent < bodyStart && at(50).largestInteriorRedComponent > bodyStart * 0.55)) {
  throw new Error(`Exit parity: the first 50ms did not preserve a readable initial pull (${at(50).largestInteriorRedComponent}/${bodyStart})`);
}
if (!(at(100).largestInteriorRedComponent < at(50).largestInteriorRedComponent)) {
  throw new Error("Exit parity: body did not continue monotonically under the gate");
}
if (!(at(120).largestInteriorRedComponent > bodyStart * 0.35 && at(120).travelProgress > 0.15 && at(120).travelProgress < 0.5)) {
  throw new Error(`Exit parity: tuned 120ms midpoint did not keep the body visibly in transit (${JSON.stringify(at(120))})`);
}
if (!(at(240).largestInteriorRedComponent < at(120).largestInteriorRedComponent)) {
  throw new Error("Exit parity: slowed body did not continue monotonically toward the gate");
}
if (at(260).largestInteriorRedComponent > bodyStart * 0.08 || at(260).travelProgress < 0.99) {
  throw new Error(`Exit parity: body was not completely hard-clipped at 260ms (${JSON.stringify(at(260))})`);
}
if (at(150).emittedFragments !== 0 || at(150).exitFragments !== 0) {
  throw new Error(`Exit parity: fragments appeared before the reference's ${benchmark.fragments.firstVisibleDelayMs}ms pause (${JSON.stringify(at(150))})`);
}
if (!(at(200).emittedFragments > 0 && at(200).emittedFragments < benchmark.fragments.count * 0.25)) {
  throw new Error(`Exit parity: the first delayed fragment burst was not restrained (${at(200).emittedFragments})`);
}
if (!(at(300).emittedFragments > at(200).emittedFragments && at(550).emittedFragments > at(300).emittedFragments)) {
  throw new Error("Exit parity: fragments were dumped in one frame instead of emitted progressively");
}
if (at(650).emittedFragments !== benchmark.fragments.count || at(600).exitFragments < benchmark.fragments.count * 0.8) {
  throw new Error(`Exit parity: the 600ms particle peak missed the benchmark budget (${JSON.stringify(at(600))})`);
}
if (!(at(200).outsideRedPixels > 0 && at(600).outsideRedPixels > at(200).outsideRedPixels)) {
  throw new Error("Exit parity: same-color fragments did not emerge outside the gate and build to a later peak");
}
if (at(600).exitFragmentBreakdown.specks < 6 || at(600).exitFragmentBreakdown.chunks < benchmark.fragments.count * 0.5) {
  throw new Error(`Exit parity: the peak lost its reference mix of solid chunks and fine dust (${JSON.stringify(at(600).exitFragmentBreakdown)})`);
}
if (at(1200).exitFragments !== 0 || at(1200).outsideRedPixels > 120) {
  throw new Error(`Exit parity: particle tail did not fully clear by 1200ms (${JSON.stringify(at(1200))})`);
}
if (at(800).gateOpacity > 0.99 || at(800).gateOpacity < 0.8) {
  throw new Error(`Exit parity: last-color gate did not begin its delayed fade near 780ms (${at(800).gateOpacity})`);
}
if (!(at(1000).gateOpacity > 0 && at(1000).gateOpacity < 0.5) || at(1200).gateOpacity !== 0) {
  throw new Error(`Exit parity: exhausted gate fade curve diverged (${at(1000).gateOpacity} -> ${at(1200).gateOpacity})`);
}

// Preserve every display frame of the implementation at the reference video's
// native cadence. This makes one-frame ordering, flash, and fragment regressions
// reviewable instead of hiding them between sparse milestone screenshots.
await installFixture(false);
const nativeFrameIntervalMs = 1000 / benchmark.video.fps;
const nativeFrameCount = Math.ceil(benchmark.fragments.totalDurationMs / nativeFrameIntervalMs) + 1;
for (let frameIndex = 0; frameIndex < nativeFrameCount; frameIndex += 1) {
  if (frameIndex > 0) await advance(nativeFrameIntervalMs);
  await page.screenshot({
    path: resolve(nativeFrameOutput, `native-${String(frameIndex).padStart(3, "0")}.png`),
  });
}

await installFixture(true);
await advance(650);
const retained = await frameMetrics(650);
if (!retained.gateTargetPresent || retained.gateOpacity !== 1) {
  throw new Error(`Exit parity: a gate faded while another same-color target remained (${JSON.stringify(retained)})`);
}
await page.screenshot({ path: resolve(output, "same-color-gate-retained-0650ms.png") });

// Regression fixture for two independent visual contracts:
// 1. A wide gate contains multiple valid grid channels. The exit ghost must
//    keep the channel selected by the model instead of snapping to the visual
//    center of the complete gate.
// 2. Removing the final block of a color must not release that gate's rail or
//    promote a duplicate base gate above the block while its exit animation is
//    still active.
await installWideGateChannelFixture(0);
await waitForFixtureArt();
const idleWideGateDraws = await captureFormalDrawCalls();
const idleBaseBorderSignature = idleWideGateDraws.baseBorderCalls.map(baseBorderSignature);

await installWideGateChannelFixture(2);
await waitForFixtureArt();
const wideGateState = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const wideGateBlock = wideGateState.puzzle.blocks.find((block) => block.id === "red-wide-channel");
const wideGate = wideGateState.puzzle.gates.find((gate) => gate.id === "red-top-wide");
if (!wideGateBlock || !wideGate) {
  throw new Error("Exit parity: wide-gate grid-channel fixture did not initialize");
}
const widePoint = (x, y) => ({
  x: wideGateState.board.innerX + (x + 0.5) * wideGateState.board.cell,
  y: wideGateState.board.innerY + (y + 0.5) * wideGateState.board.cell,
});
const wideStart = widePoint(wideGateBlock.x, wideGateBlock.y);
await page.mouse.move(wideStart.x, wideStart.y);
await page.mouse.down();
await page.mouse.move(widePoint(1, 1).x, widePoint(1, 1).y, { steps: 4 });
const wideEdge = widePoint(1, 0);
await page.mouse.move(
  wideEdge.x + wideGateState.board.cell * 0.18,
  wideEdge.y,
  { steps: 4 },
);

const wideTriggeredState = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
if (wideTriggeredState.puzzle.blocks.some((block) => block.id === "red-wide-channel")
  || wideTriggeredState.exitGhosts !== 1
  || wideTriggeredState.selectedId
  || wideTriggeredState.activePointer !== undefined) {
  throw new Error(`Exit parity: real Pointer did not trigger the wide-gate channel fixture (${JSON.stringify(wideTriggeredState)})`);
}
const triggeredWideGateDraws = await captureFormalDrawCalls();
await page.screenshot({ path: resolve(output, "real-pointer-wide-gate-channel-trigger.png") });
await page.mouse.up();

const ghostCall = triggeredWideGateDraws.formalCalls.find((call) => (
  call.pathname.endsWith("/red-single.png")
));
if (!ghostCall) {
  throw new Error("Exit parity: the wide-gate trigger frame did not draw the formal red exit ghost");
}
const expectedChannelX = wideGateState.board.innerX + wideGateBlock.x * wideGateState.board.cell;
const wholeGateCenteredX = wideGateState.board.innerX
  + (wideGate.offset + (wideGate.size - 1) / 2) * wideGateState.board.cell;
const channelErrorPixels = Math.abs(ghostCall.matrix.e - expectedChannelX);
if (channelErrorPixels > 0.5) {
  throw new Error(`Exit parity: trigger-frame ghost left its model grid channel by ${channelErrorPixels.toFixed(2)}px (${JSON.stringify({
    actualX: ghostCall.matrix.e,
    expectedChannelX,
    forbiddenWholeGateCenterX: wholeGateCenteredX,
  })})`);
}
if (Math.abs(expectedChannelX - wholeGateCenteredX) < wideGateState.board.cell * 0.9) {
  throw new Error("Exit parity: the wide-gate fixture does not distinguish its grid channel from the whole-gate center");
}

const triggeredBaseBorderSignature = triggeredWideGateDraws.baseBorderCalls.map(baseBorderSignature);
if (JSON.stringify(triggeredBaseBorderSignature) !== JSON.stringify(idleBaseBorderSignature)) {
  throw new Error(`Exit parity: base board-rim/gate draw signature changed during the last-color exit (${JSON.stringify({
    idle: idleBaseBorderSignature,
    triggered: triggeredBaseBorderSignature,
  })})`);
}
const gateAsset = "gate-red-horizontal-3.png";
const idleGateCalls = idleWideGateDraws.baseBorderCalls.filter((call) => call.pathname.endsWith(`/${gateAsset}`));
const triggeredGateCalls = triggeredWideGateDraws.baseBorderCalls.filter((call) => call.pathname.endsWith(`/${gateAsset}`));
if (idleGateCalls.length !== 1 || triggeredGateCalls.length !== 1) {
  throw new Error(`Exit parity: the wide gate base must remain one stable rim-layer draw (${idleGateCalls.length} -> ${triggeredGateCalls.length})`);
}
const baseCallsAboveGhost = triggeredWideGateDraws.baseBorderCalls.filter((call) => call.drawIndex > ghostCall.drawIndex);
if (baseCallsAboveGhost.length) {
  throw new Error(`Exit parity: base rim/gate art was promoted above the exit ghost (${baseCallsAboveGhost.map((call) => call.pathname).join(", ")})`);
}

await advance(120);
const pulseFrameState = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
if (pulseFrameState.exitGhosts !== 1 || !pulseFrameState.exitPulses.length) {
  throw new Error(`Exit parity: the 120ms layer audit missed its active ghost or pulse (${JSON.stringify({
    ghosts: pulseFrameState.exitGhosts,
    pulses: pulseFrameState.exitPulses,
  })})`);
}
const pulseFrameDraws = await captureFormalDrawCalls();
const pulseFrameGhostCall = pulseFrameDraws.formalCalls.find((call) => (
  call.pathname.endsWith("/red-single.png")
));
const pulseFrameBaseGateCalls = pulseFrameDraws.baseBorderCalls.filter((call) => (
  call.pathname.endsWith(`/${gateAsset}`)
));
const pulseFrameGlowCalls = pulseFrameDraws.formalCalls.filter((call) => (
  call.pathname.endsWith(`/${gateAsset}`)
  && call.filter.startsWith("brightness(")
  && call.shadowBlur > 0
));
if (!pulseFrameGhostCall || pulseFrameBaseGateCalls.length !== 1 || pulseFrameGlowCalls.length !== 1) {
  throw new Error(`Exit parity: the 120ms frame must contain one ghost, one base gate, and one brightness pulse (${JSON.stringify({
    ghost: Boolean(pulseFrameGhostCall),
    baseGateCalls: pulseFrameBaseGateCalls.length,
    brightnessPulseCalls: pulseFrameGlowCalls.length,
  })})`);
}
if (pulseFrameBaseGateCalls[0].drawIndex >= pulseFrameGhostCall.drawIndex
  || pulseFrameGlowCalls[0].drawIndex >= pulseFrameGhostCall.drawIndex) {
  throw new Error(`Exit parity: gate base or brightness pulse jumped above the 120ms ghost (${JSON.stringify({
    baseGateIndex: pulseFrameBaseGateCalls[0].drawIndex,
    pulseIndex: pulseFrameGlowCalls[0].drawIndex,
    ghostIndex: pulseFrameGhostCall.drawIndex,
  })})`);
}
const pulseFrameBaseBorderSignature = pulseFrameDraws.baseBorderCalls.map(baseBorderSignature);
if (JSON.stringify(pulseFrameBaseBorderSignature) !== JSON.stringify(idleBaseBorderSignature)) {
  throw new Error("Exit parity: the base rim topology/order changed while the 120ms pulse was visible");
}
const rightEdge = wideGateState.board.innerX + wideGateState.board.innerWidth;
const bottomEdge = wideGateState.board.innerY + wideGateState.board.innerHeight;
const rightBottomBaseOrder = (capture) => capture.baseBorderCalls
  .filter((call) => (
    Math.abs(call.matrix.e - rightEdge) <= 0.5
    || Math.abs(call.matrix.f - bottomEdge) <= 0.5
  ))
  .map(baseBorderSignature);
const idleRightBottomBaseOrder = rightBottomBaseOrder(idleWideGateDraws);
const pulseRightBottomBaseOrder = rightBottomBaseOrder(pulseFrameDraws);
if (JSON.stringify(pulseRightBottomBaseOrder) !== JSON.stringify(idleRightBottomBaseOrder)) {
  throw new Error(`Exit parity: right/bottom/corner base depth order changed under the 120ms pulse (${JSON.stringify({
    idle: idleRightBottomBaseOrder,
    pulse: pulseRightBottomBaseOrder,
  })})`);
}
await page.screenshot({ path: resolve(output, "real-pointer-wide-gate-channel-0120ms.png") });

const wideGateAudit = {
  side: wideGate.side,
  gate: { offset: wideGate.offset, size: wideGate.size },
  modelChannel: { x: wideGateBlock.x, y: 0 },
  expectedChannelX,
  wholeGateCenteredX,
  ghostTransform: ghostCall.matrix,
  channelErrorPixels,
  idleBaseBorderSignature,
  triggeredBaseBorderSignature,
  idleBaseBorderDraws: idleWideGateDraws.baseBorderCalls.map((call) => ({
    ...baseBorderSignature(call),
    drawIndex: call.drawIndex,
    alpha: call.alpha,
  })),
  triggeredBaseBorderDraws: triggeredWideGateDraws.baseBorderCalls.map((call) => ({
    ...baseBorderSignature(call),
    drawIndex: call.drawIndex,
    alpha: call.alpha,
  })),
  baseCallsAboveGhost: baseCallsAboveGhost.map((call) => baseBorderSignature(call)),
  pulseFrame120ms: {
    baseGateDrawIndex: pulseFrameBaseGateCalls[0].drawIndex,
    brightnessPulseDrawIndex: pulseFrameGlowCalls[0].drawIndex,
    ghostDrawIndex: pulseFrameGhostCall.drawIndex,
    pulseFilter: pulseFrameGlowCalls[0].filter,
    pulseShadowBlur: pulseFrameGlowCalls[0].shadowBlur,
    baseBorderSignature: pulseFrameBaseBorderSignature,
    idleRightBottomBaseOrder,
    pulseRightBottomBaseOrder,
  },
};

// Match the reported failure at the lower-right corner: a horizontal two-cell
// orange block leaves through the bottom-most one-cell channel of a right gate.
// A slight upward finger offset must not lift the ghost into the row above, and
// neither the gate nor its pulse may be promoted over the south-east corner.
await installRightBottomChannelFixture(3);
await waitForFixtureArt();
const idleRightBottomDraws = await captureFormalDrawCalls();
const idleRightBottomSignature = idleRightBottomDraws.baseBorderCalls.map(baseBorderSignature);

await installRightBottomChannelFixture(1);
await waitForFixtureArt();
const rightBottomState = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const rightBottomBlock = rightBottomState.puzzle.blocks.find((block) => block.id === "orange-right-bottom");
const rightBottomGate = rightBottomState.puzzle.gates.find((gate) => gate.id === "orange-right-bottom-gate");
if (!rightBottomBlock || !rightBottomGate) {
  throw new Error("Exit parity: right-bottom corner fixture did not initialize");
}
const rightBottomPoint = (x, y) => ({
  x: rightBottomState.board.innerX + (x + 0.5) * rightBottomState.board.cell,
  y: rightBottomState.board.innerY + (y + 0.5) * rightBottomState.board.cell,
});
const rightBottomStart = rightBottomPoint(rightBottomBlock.x, rightBottomBlock.y);
await page.mouse.move(rightBottomStart.x, rightBottomStart.y);
await page.mouse.down();
await page.mouse.move(rightBottomPoint(2, 4).x, rightBottomPoint(2, 4).y, { steps: 4 });
const rightBottomEdge = rightBottomPoint(3, 4);
await page.mouse.move(
  rightBottomEdge.x,
  rightBottomEdge.y - rightBottomState.board.cell * 0.18,
  { steps: 4 },
);
const rightBottomTriggered = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
if (rightBottomTriggered.puzzle.blocks.some((block) => block.id === "orange-right-bottom")
  || rightBottomTriggered.exitGhosts !== 1
  || rightBottomTriggered.selectedId
  || rightBottomTriggered.activePointer !== undefined) {
  throw new Error(`Exit parity: real Pointer did not trigger the right-bottom exit (${JSON.stringify(rightBottomTriggered)})`);
}
await page.mouse.up();
await advance(120);
const rightBottomPulseState = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
if (rightBottomPulseState.exitGhosts !== 1 || !rightBottomPulseState.exitPulses.length) {
  throw new Error(`Exit parity: the right-bottom 120ms frame missed its ghost or pulse (${JSON.stringify({
    ghosts: rightBottomPulseState.exitGhosts,
    pulses: rightBottomPulseState.exitPulses,
  })})`);
}
const rightBottomPulseDraws = await captureFormalDrawCalls();
const rightBottomGhostCall = rightBottomPulseDraws.formalCalls.find((call) => (
  call.pathname.endsWith("/orange-horizontal-2.png")
));
const rightBottomGateAsset = "gate-orange-vertical-1.png";
const rightBottomBaseGateCalls = rightBottomPulseDraws.baseBorderCalls.filter((call) => (
  call.pathname.endsWith(`/${rightBottomGateAsset}`)
));
const rightBottomGlowCalls = rightBottomPulseDraws.formalCalls.filter((call) => (
  call.pathname.endsWith(`/${rightBottomGateAsset}`)
  && call.filter.startsWith("brightness(")
  && call.shadowBlur > 0
));
const southEastCornerCalls = rightBottomPulseDraws.baseBorderCalls.filter((call) => (
  call.pathname.endsWith("/corner-south-east.png")
));
if (!rightBottomGhostCall
  || rightBottomBaseGateCalls.length !== 1
  || rightBottomGlowCalls.length !== 1
  || southEastCornerCalls.length !== 1) {
  throw new Error(`Exit parity: right-bottom 120ms frame has an invalid formal draw set (${JSON.stringify({
    ghost: Boolean(rightBottomGhostCall),
    baseGateCalls: rightBottomBaseGateCalls.length,
    brightnessPulseCalls: rightBottomGlowCalls.length,
    southEastCornerCalls: southEastCornerCalls.length,
  })})`);
}
const expectedBottomChannelY = rightBottomState.board.innerY
  + rightBottomBlock.y * rightBottomState.board.cell;
const bottomChannelErrorPixels = Math.abs(rightBottomGhostCall.matrix.f - expectedBottomChannelY);
if (bottomChannelErrorPixels > 0.5) {
  throw new Error(`Exit parity: right-exit ghost left the bottom y=4 grid channel by ${bottomChannelErrorPixels.toFixed(2)}px (${JSON.stringify({
    actualY: rightBottomGhostCall.matrix.f,
    expectedBottomChannelY,
  })})`);
}
if (rightBottomBaseGateCalls[0].drawIndex >= rightBottomGhostCall.drawIndex
  || rightBottomGlowCalls[0].drawIndex >= rightBottomGhostCall.drawIndex) {
  throw new Error(`Exit parity: right-bottom gate base or pulse jumped above its ghost (${JSON.stringify({
    baseGateIndex: rightBottomBaseGateCalls[0].drawIndex,
    pulseIndex: rightBottomGlowCalls[0].drawIndex,
    ghostIndex: rightBottomGhostCall.drawIndex,
  })})`);
}
if (southEastCornerCalls[0].drawIndex <= rightBottomBaseGateCalls[0].drawIndex
  || southEastCornerCalls[0].drawIndex <= rightBottomGlowCalls[0].drawIndex) {
  throw new Error(`Exit parity: the right gate or pulse covered the south-east corner (${JSON.stringify({
    baseGateIndex: rightBottomBaseGateCalls[0].drawIndex,
    pulseIndex: rightBottomGlowCalls[0].drawIndex,
    cornerIndex: southEastCornerCalls[0].drawIndex,
  })})`);
}
const rightBottomPulseSignature = rightBottomPulseDraws.baseBorderCalls.map(baseBorderSignature);
if (JSON.stringify(rightBottomPulseSignature) !== JSON.stringify(idleRightBottomSignature)) {
  throw new Error("Exit parity: right-bottom base rim order changed between idle and the 120ms exit frame");
}
const relevantRightBottomOrder = (capture) => capture.baseBorderCalls
  .filter((call) => (
    call.pathname.endsWith(`/${rightBottomGateAsset}`)
    || call.pathname.endsWith("/corner-south-east.png")
    || (
      call.pathname.includes("/neutral-vertical-")
      && Math.abs(call.matrix.e - (rightBottomState.board.innerX + rightBottomState.board.innerWidth)) <= 0.5
    )
    || (
      call.pathname.includes("/neutral-horizontal-")
      && Math.abs(call.matrix.f - (rightBottomState.board.innerY + rightBottomState.board.innerHeight)) <= 0.5
    )
  ))
  .map(baseBorderSignature);
const idleRelevantRightBottomOrder = relevantRightBottomOrder(idleRightBottomDraws);
const pulseRelevantRightBottomOrder = relevantRightBottomOrder(rightBottomPulseDraws);
if (JSON.stringify(pulseRelevantRightBottomOrder) !== JSON.stringify(idleRelevantRightBottomOrder)) {
  throw new Error(`Exit parity: lower-right gate/corner base order diverged from idle (${JSON.stringify({
    idle: idleRelevantRightBottomOrder,
    pulse: pulseRelevantRightBottomOrder,
  })})`);
}
await page.screenshot({ path: resolve(output, "real-pointer-right-bottom-channel-0120ms.png") });

const rightBottomAudit = {
  side: rightBottomGate.side,
  gate: { offset: rightBottomGate.offset, size: rightBottomGate.size },
  modelChannel: { x: 3, y: rightBottomBlock.y },
  expectedBottomChannelY,
  ghostTransform: rightBottomGhostCall.matrix,
  bottomChannelErrorPixels,
  baseGateDrawIndex: rightBottomBaseGateCalls[0].drawIndex,
  brightnessPulseDrawIndex: rightBottomGlowCalls[0].drawIndex,
  southEastCornerDrawIndex: southEastCornerCalls[0].drawIndex,
  ghostDrawIndex: rightBottomGhostCall.drawIndex,
  idleRelevantRightBottomOrder,
  pulseRelevantRightBottomOrder,
};

// An open flip door reuses the formal gate bitmap but toggles closed after the
// successful removal. Its base must still paint before the exit glow: drawing
// the newly-closed door after the brightness pass would hide the pulse exactly
// when the player needs the successful-exit feedback.
await installOpenFlipDoorFixture(3);
await waitForFixtureArt();
const idleFlipDoorDraws = await captureFormalDrawCalls();
const idleFlipDoorBaseSignature = idleFlipDoorDraws.baseBorderCalls.map(baseBorderSignature);

await installOpenFlipDoorFixture(1);
await waitForFixtureArt();
const flipDoorState = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const flipDoorBlock = flipDoorState.puzzle.blocks.find((block) => block.id === "orange-flip-door-exit");
const openFlipDoor = flipDoorState.puzzle.flipDoors.find((door) => door.id === "orange-right-bottom-flip-door");
if (!flipDoorBlock || !openFlipDoor || !openFlipDoor.open) {
  throw new Error("Exit parity: open flip-door fixture did not initialize");
}
const flipDoorPoint = (x, y) => ({
  x: flipDoorState.board.innerX + (x + 0.5) * flipDoorState.board.cell,
  y: flipDoorState.board.innerY + (y + 0.5) * flipDoorState.board.cell,
});
const flipDoorStart = flipDoorPoint(flipDoorBlock.x, flipDoorBlock.y);
await page.mouse.move(flipDoorStart.x, flipDoorStart.y);
await page.mouse.down();
await page.mouse.move(flipDoorPoint(2, 4).x, flipDoorPoint(2, 4).y, { steps: 4 });
await page.mouse.move(flipDoorPoint(3, 4).x, flipDoorPoint(3, 4).y, { steps: 4 });
const flipDoorTriggered = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const toggledFlipDoor = flipDoorTriggered.puzzle.flipDoors.find((door) => door.id === openFlipDoor.id);
if (flipDoorTriggered.puzzle.blocks.some((block) => block.id === flipDoorBlock.id)
  || flipDoorTriggered.exitGhosts !== 1
  || flipDoorTriggered.selectedId
  || flipDoorTriggered.activePointer !== undefined
  || toggledFlipDoor?.open !== false) {
  throw new Error(`Exit parity: real Pointer did not exit through and toggle the open flip door (${JSON.stringify(flipDoorTriggered)})`);
}
await page.mouse.up();
await advance(120);
const flipDoorPulseState = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
if (flipDoorPulseState.exitGhosts !== 1 || !flipDoorPulseState.exitPulses.length) {
  throw new Error(`Exit parity: the flip-door 120ms frame missed its ghost or pulse (${JSON.stringify({
    ghosts: flipDoorPulseState.exitGhosts,
    pulses: flipDoorPulseState.exitPulses,
  })})`);
}
const flipDoorPulseDraws = await captureFormalDrawCalls();
const flipDoorGateAsset = "gate-orange-vertical-1.png";
const flipDoorBaseCalls = flipDoorPulseDraws.baseBorderCalls.filter((call) => (
  call.pathname.endsWith(`/${flipDoorGateAsset}`)
));
const flipDoorGlowCalls = flipDoorPulseDraws.formalCalls.filter((call) => (
  call.pathname.endsWith(`/${flipDoorGateAsset}`)
  && call.filter.startsWith("brightness(")
  && call.shadowBlur > 0
));
const flipDoorCornerCalls = flipDoorPulseDraws.baseBorderCalls.filter((call) => (
  call.pathname.endsWith("/corner-south-east.png")
));
const flipDoorGhostCall = flipDoorPulseDraws.formalCalls.find((call) => (
  call.pathname.endsWith("/orange-horizontal-2.png")
));
if (flipDoorBaseCalls.length !== 1
  || flipDoorGlowCalls.length !== 1
  || flipDoorCornerCalls.length !== 1
  || !flipDoorGhostCall) {
  throw new Error(`Exit parity: flip-door 120ms frame has an invalid formal draw set (${JSON.stringify({
    baseDoorCalls: flipDoorBaseCalls.length,
    brightnessPulseCalls: flipDoorGlowCalls.length,
    southEastCornerCalls: flipDoorCornerCalls.length,
    ghost: Boolean(flipDoorGhostCall),
  })})`);
}
if (!(flipDoorBaseCalls[0].drawIndex < flipDoorGlowCalls[0].drawIndex
  && flipDoorGlowCalls[0].drawIndex < flipDoorCornerCalls[0].drawIndex
  && flipDoorGlowCalls[0].drawIndex < flipDoorGhostCall.drawIndex)) {
  throw new Error(`Exit parity: open flip-door exit depth must be base door -> brightness pulse -> corner/ghost (${JSON.stringify({
    baseDoorIndex: flipDoorBaseCalls[0].drawIndex,
    pulseIndex: flipDoorGlowCalls[0].drawIndex,
    cornerIndex: flipDoorCornerCalls[0].drawIndex,
    ghostIndex: flipDoorGhostCall.drawIndex,
  })})`);
}
const flipDoorPulseBaseSignature = flipDoorPulseDraws.baseBorderCalls.map(baseBorderSignature);
if (JSON.stringify(flipDoorPulseBaseSignature) !== JSON.stringify(idleFlipDoorBaseSignature)) {
  throw new Error("Exit parity: flip-door base rim order changed between idle and the 120ms exit frame");
}
await page.screenshot({ path: resolve(output, "real-pointer-open-flip-door-0120ms.png") });

const flipDoorAudit = {
  side: openFlipDoor.side,
  gate: { offset: openFlipDoor.offset, size: openFlipDoor.size },
  toggledOpen: toggledFlipDoor?.open,
  baseDoorDrawIndex: flipDoorBaseCalls[0].drawIndex,
  brightnessPulseDrawIndex: flipDoorGlowCalls[0].drawIndex,
  southEastCornerDrawIndex: flipDoorCornerCalls[0].drawIndex,
  ghostDrawIndex: flipDoorGhostCall.drawIndex,
  pulseFilter: flipDoorGlowCalls[0].filter,
  pulseShadowBlur: flipDoorGlowCalls[0].shadowBlur,
  idleBaseSignature: idleFlipDoorBaseSignature,
  pulseBaseSignature: flipDoorPulseBaseSignature,
};

await writeFile(resolve(output, "timeline.json"), `${JSON.stringify({
  benchmark,
  pointerTrigger,
  timeline,
  retained,
  wideGateAudit,
  rightBottomAudit,
  flipDoorAudit,
}, null, 2)}\n`, "utf8");
await browser.close();
if (forbiddenTailRequests.length) {
  throw new Error(`Exit parity: removed tail art was requested (${forbiddenTailRequests.join(", ")})`);
}
if (browserErrors.length) throw new Error(`Exit parity browser errors:\n${browserErrors.join("\n")}`);
console.log("Exit animation parity passed: real fractional Pointer keeps the body visible and on its chosen grid channel, including the lower-right orange H2 and open flip-door cases; base gate/door, visible pulse, right/bottom corners, and the departing block retain one stable depth order; tuned 260ms hard-masked ingest, 180ms fragment pause, progressive same-color fragments, 600ms peak, 1200ms cleanup, conditional gate retirement, and no tail image all remain intact.");
