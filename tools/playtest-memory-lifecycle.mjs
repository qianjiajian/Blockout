import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/memory-lifecycle/", import.meta.url));
const reportPath = resolve(output, "memory-lifecycle-report.json");
const screenshotPath = resolve(output, "01-post-churn-lv93-720x1584.png");
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });

const MAX_RETAINED_HEAP_GROWTH_BYTES = 1024 * 1024;
const MAX_RETAINED_NODE_GROWTH = 5;
const MAX_RETAINED_LISTENER_GROWTH = 0;
const NAVIGATION_STRESS_CYCLES = 4;
const LEVEL_STRESS_PASSES = 4;
const DRAG_FRAMES = 120;

const save = {
  schemaVersion: 1,
  currentLevel: 93,
  highestLevel: 100,
  coins: 5000,
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
  lastSeenUpdate: "2026-09-05-r95",
};

const browser = await chromium.launch({
  headless: true,
  args: ["--enable-precise-memory-info"],
});
const context = await browser.newContext({ viewport: { width: 360, height: 792 }, deviceScaleFactor: 2 });
const page = await context.newPage();
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.stack ?? error.message));
const cdp = await context.newCDPSession(page);
await cdp.send("Performance.enable");

await page.goto(playtestUrl, { waitUntil: "networkidle" });
await page.evaluate((value) => localStorage.setItem("color-escape-save-v1", JSON.stringify(value)), save);
await page.reload({ waitUntil: "networkidle" });
await page.waitForFunction(() => Boolean(window.__COLOR_ESCAPE__?.getDebugState().art?.ready));

const debug = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const logicalPoint = async (x, y) => {
  const state = await debug();
  const bounds = await page.locator("canvas").boundingBox();
  if (!bounds) throw new Error("Memory lifecycle: canvas bounds are unavailable");
  return {
    x: bounds.x + state.viewportTransform.offsetX + x * state.viewportTransform.scale,
    y: bounds.y + state.viewportTransform.offsetY + y * state.viewportTransform.scale,
  };
};

const tabPoints = await Promise.all([50, 149, 248, 347, 446].map((x) => logicalPoint(x, 1028)));
const clickTab = async (index) => {
  const point = tabPoints[index];
  await page.mouse.click(point.x, point.y);
  await page.waitForTimeout(225);
};
const navigateCycle = async () => {
  await clickTab(0);
  await clickTab(1);
  await clickTab(2);
  await clickTab(3);
  await clickTab(4);
  await clickTab(2);
};
const churnLevels = async (passes) => {
  for (let pass = 0; pass < passes; pass += 1) {
    for (let levelId = 1; levelId <= 100; levelId += 1) {
      await page.evaluate((id) => new Promise((resolveFrame) => {
        window.__COLOR_ESCAPE__.loadLevel(id, false);
        requestAnimationFrame(() => resolveFrame());
      }), levelId);
    }
  }
};
const settleHomeAtLevel93 = () => page.evaluate(() => new Promise((resolveFrame) => {
  window.__COLOR_ESCAPE__.loadLevel(93, false);
  requestAnimationFrame(() => resolveFrame());
}));

const readMemory = async (label, collectGarbage) => {
  if (collectGarbage) {
    await cdp.send("HeapProfiler.collectGarbage");
    await page.waitForTimeout(60);
  }
  const [{ metrics }, dom, browserHeap] = await Promise.all([
    cdp.send("Performance.getMetrics"),
    cdp.send("Memory.getDOMCounters"),
    page.evaluate(() => {
      const memory = performance.memory;
      return memory ? {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
      } : undefined;
    }),
  ]);
  const metric = (name) => metrics.find((candidate) => candidate.name === name)?.value;
  return {
    label,
    jsHeapUsedBytes: metric("JSHeapUsedSize"),
    jsHeapTotalBytes: metric("JSHeapTotalSize"),
    documents: dom.documents,
    nodes: dom.nodes,
    jsEventListeners: dom.jsEventListeners,
    browserHeap,
  };
};

const readStableMemory = async (label) => {
  const samples = [];
  for (let index = 0; index < 3; index += 1) samples.push(await readMemory(`${label}-${index + 1}`, true));
  return samples.reduce((smallest, candidate) => (
    candidate.jsHeapUsedBytes < smallest.jsHeapUsedBytes ? candidate : smallest
  ));
};

const runDragStress = async () => {
  await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(93, true));
  await page.waitForTimeout(120);
  const fixture = await page.evaluate(async () => {
    const [{ getLevel }, { PuzzleModel }, { createContinuousCollisionValidator }] = await Promise.all([
      import("/src/core/levels.ts"),
      import("/src/core/PuzzleModel.ts"),
      import("/src/game/continuousDrag.ts"),
    ]);
    const model = new PuzzleModel(getLevel(93));
    const snapshot = model.snapshot();
    for (const block of snapshot.blocks) {
      if (!model.isBlockActive(block)) continue;
      const valid = createContinuousCollisionValidator(snapshot, block.id);
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        if (model.canPlace(block, block.x + dx, block.y + dy) && valid(block.x + dx * 0.82, block.y + dy * 0.82)) {
          return { blockId: block.id, dx, dy };
        }
      }
    }
    throw new Error("Memory lifecycle: Lv93 has no legal drag fixture");
  });
  const state = await debug();
  const block = state.puzzle.blocks.find((candidate) => candidate.id === fixture.blockId);
  if (!block) throw new Error(`Memory lifecycle: block ${fixture.blockId} is unavailable`);
  const [anchorX, anchorY] = block.shape[0];
  const logicalStart = {
    x: state.board.innerX + (block.x + anchorX + 0.5) * state.board.cell,
    y: state.board.innerY + (block.y + anchorY + 0.5) * state.board.cell,
  };
  const start = {
    x: state.viewportTransform.offsetX + logicalStart.x * state.viewportTransform.scale,
    y: state.viewportTransform.offsetY + logicalStart.y * state.viewportTransform.scale,
  };
  const excursion = {
    x: fixture.dx * state.board.cell * state.viewportTransform.scale * 0.82,
    y: fixture.dy * state.board.cell * state.viewportTransform.scale * 0.82,
  };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.evaluate(({ startPoint, dragExcursion, frames }) => new Promise((resolveStress) => {
    const canvas = document.querySelector("canvas");
    if (!canvas) throw new Error("Memory lifecycle: canvas is missing");
    let frame = 0;
    const step = () => {
      const phase = frame % 60;
      const progress = phase <= 30 ? phase / 30 : (60 - phase) / 30;
      canvas.dispatchEvent(new PointerEvent("pointermove", {
        bubbles: true,
        pointerId: 1,
        pointerType: "mouse",
        isPrimary: true,
        buttons: 1,
        clientX: startPoint.x + dragExcursion.x * progress,
        clientY: startPoint.y + dragExcursion.y * progress,
      }));
      frame += 1;
      if (frame < frames) requestAnimationFrame(step);
      else resolveStress();
    };
    requestAnimationFrame(step);
  }), { startPoint: start, dragExcursion: excursion, frames: DRAG_FRAMES });
  await page.mouse.up();
  await page.waitForTimeout(140);
  const dragState = await debug();
  return { ...fixture, committedMoves: dragState.puzzle.moves };
};

// Warm all code paths before the baseline so module compilation and first-use
// caches are not mistaken for a retained lifecycle leak.
await navigateCycle();
await churnLevels(1);
await runDragStress();
await settleHomeAtLevel93();
const baseline = await readStableMemory("baseline");

for (let cycle = 0; cycle < NAVIGATION_STRESS_CYCLES; cycle += 1) await navigateCycle();
await churnLevels(LEVEL_STRESS_PASSES);
const dragFixture = await runDragStress();
await page.screenshot({ path: screenshotPath });
await settleHomeAtLevel93();
const beforeCollection = await readMemory("after-stress-before-gc", false);
const afterCollection = await readStableMemory("after-stress-after-gc");
const finalState = await debug();

const canvas = await page.locator("canvas").evaluate((element) => ({
  pixelWidth: element.width,
  pixelHeight: element.height,
  cssWidth: element.getBoundingClientRect().width,
  cssHeight: element.getBoundingClientRect().height,
}));
const retainedHeapGrowthBytes = Math.max(0, afterCollection.jsHeapUsedBytes - baseline.jsHeapUsedBytes);
const retainedNodeGrowth = Math.max(0, afterCollection.nodes - baseline.nodes);
const retainedListenerGrowth = Math.max(0, afterCollection.jsEventListeners - baseline.jsEventListeners);
const report = {
  environment: {
    viewportCss: { width: 360, height: 792 },
    deviceScaleFactor: 2,
    canvas,
    preciseMemoryInfo: true,
  },
  workload: {
    warmupNavigationCycles: 1,
    warmupLevelPasses: 1,
    navigationStressCycles: NAVIGATION_STRESS_CYCLES,
    navigationTransitions: NAVIGATION_STRESS_CYCLES * 6,
    levelStressPasses: LEVEL_STRESS_PASSES,
    levelLoads: LEVEL_STRESS_PASSES * 100,
    dragFrames: DRAG_FRAMES,
    dragFixture,
    dragCommittedMoves: dragFixture.committedMoves,
    loadedImages: finalState.art.loadedImages,
  },
  memory: {
    baseline,
    beforeCollection,
    afterCollection,
    retainedHeapGrowthBytes,
    retainedNodeGrowth,
    retainedListenerGrowth,
  },
  budgets: {
    maxRetainedHeapGrowthBytes: MAX_RETAINED_HEAP_GROWTH_BYTES,
    maxRetainedNodeGrowth: MAX_RETAINED_NODE_GROWTH,
    maxRetainedListenerGrowth: MAX_RETAINED_LISTENER_GROWTH,
    maxDocumentGrowth: 0,
  },
  browserErrors: errors,
  note: "Chromium lifecycle leak preflight. Image decode and DPR2 canvas budgets are enforced separately by art:verify; WeChat physical-device peak memory remains a manual gate.",
};
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

await context.close();
await browser.close();

if (errors.length) throw new Error(`Memory lifecycle browser errors:\n${errors.join("\n")}`);
if (canvas.pixelWidth !== 720 || canvas.pixelHeight !== 1584) {
  throw new Error(`Memory lifecycle: expected 720x1584 canvas, received ${canvas.pixelWidth}x${canvas.pixelHeight}`);
}
if (finalState.art.loadedImages !== 77) throw new Error(`Memory lifecycle: only ${finalState.art.loadedImages}/77 images loaded`);
if (dragFixture.committedMoves !== 1) throw new Error(`Memory lifecycle: drag workload committed ${dragFixture.committedMoves} moves`);
if (retainedHeapGrowthBytes > MAX_RETAINED_HEAP_GROWTH_BYTES) {
  throw new Error(`Memory lifecycle: retained heap grew by ${retainedHeapGrowthBytes} bytes`);
}
if (retainedNodeGrowth > MAX_RETAINED_NODE_GROWTH) {
  throw new Error(`Memory lifecycle: retained DOM nodes grew by ${retainedNodeGrowth}`);
}
if (retainedListenerGrowth > MAX_RETAINED_LISTENER_GROWTH) {
  throw new Error(`Memory lifecycle: retained event listeners grew by ${retainedListenerGrowth}`);
}
if (afterCollection.documents > baseline.documents) {
  throw new Error(`Memory lifecycle: documents grew from ${baseline.documents} to ${afterCollection.documents}`);
}
console.log(`Memory lifecycle passed: 24 tab transitions, 400 level loads, 120 drag frames; retained heap +${retainedHeapGrowthBytes} bytes, DOM/listeners +${retainedNodeGrowth}/+${retainedListenerGrowth}.`);
