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
const save = {
  schemaVersion: 1,
  currentLevel: 15,
  highestLevel: 100,
  coins: 1000,
  sound: false,
  haptic: false,
  reducedMotion: true,
  featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter"],
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

const openLayerLevel = async (page) => {
  await page.goto(playtestUrl, { waitUntil: "networkidle" });
  await page.evaluate((value) => localStorage.setItem("color-escape-save-v1", JSON.stringify(value)), save);
  await page.reload({ waitUntil: "networkidle" });
  await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(15, true));
  await page.waitForTimeout(160);
};

const setVisualFilter = (page, mode) => page.evaluate((nextMode) => {
  const canvas = document.querySelector("canvas");
  if (!canvas) throw new Error("Missing game canvas");
  document.querySelector("#color-vision-filters")?.remove();
  if (nextMode === "protanopia") {
    const wrapper = document.createElement("div");
    wrapper.id = "color-vision-filters";
    wrapper.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
    wrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0"><filter id="protanopia" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0.567 0.433 0 0 0  0.558 0.442 0 0 0  0 0.242 0.758 0 0  0 0 0 1 0"/></filter></svg>`;
    document.body.append(wrapper);
    canvas.style.filter = "url(#protanopia)";
  } else if (nextMode === "grayscale") {
    canvas.style.filter = "grayscale(1) contrast(1.12)";
  } else {
    canvas.style.filter = "none";
  }
}, mode);

const screenPoint = (page, point) => {
  const viewport = page.viewportSize();
  const scale = Math.min(viewport.width / 496, viewport.height / 1078);
  return {
    x: (viewport.width - 496 * scale) / 2 + point.x * scale,
    y: (viewport.height - 1078 * scale) / 2 + point.y * scale,
  };
};

const peelLayerA = async (page, route) => {
  for (const [dragIndex, drag] of route.entries()) {
    const state = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
    const block = state.puzzle.blocks.find((candidate) => candidate.id === drag.blockId);
    if (!block) throw new Error(`Color-accessibility E2E: missing ${drag.blockId}`);
    const board = state.board;
    const [anchorX, anchorY] = block.shape[0];
    const cell = (x, y) => screenPoint(page, {
      x: board.innerX + (x + anchorX + 0.5) * board.cell,
      y: board.innerY + (y + anchorY + 0.5) * board.cell,
    });
    const start = cell(block.x, block.y);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    for (const [x, y] of drag.path) {
      const target = cell(x, y);
      await page.mouse.move(target.x, target.y, { steps: 3 });
    }
    if (drag.exitSide) {
      const held = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
      const remaining = held.puzzle.blocks.find((candidate) => candidate.id === drag.blockId);
      const expectedLayers = Math.max(0, block.layers.length - 1);
      if (held.selectedId || held.activePointer !== undefined
        || (expectedLayers === 0 && remaining)
        || (expectedLayers > 0 && (!remaining || remaining.layers.length !== expectedLayers))) {
        throw new Error(`Color-accessibility E2E: ${drag.blockId} did not resolve while the pointer stayed down`);
      }
    }
    await page.mouse.up();
    await page.waitForTimeout(dragIndex === route.length - 1 ? 180 : 700);
  }
};

const page = await browser.newPage({ viewport: { width: 496, height: 1078 } });
attachErrors(page);
const debug = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
await openLayerLevel(page);
const layerAPeelRoute = await page.evaluate(async () => {
  const [{ getLevel }, { solveLevelForValidation }, { PuzzleModel }] = await Promise.all([
    import("/src/core/levels.ts"),
    import("/src/core/levelSolver.ts"),
    import("/src/core/PuzzleModel.ts"),
  ]);
  const level = getLevel(15);
  const solution = solveLevelForValidation(level);
  const model = new PuzzleModel(level);
  const prefix = [];
  for (const drag of solution.drags) {
    const before = model.snapshot().blocks.find((block) => block.id === "layer-a")?.layers.length ?? 0;
    model.beginAction();
    for (const [x, y] of drag.path) model.moveBlock(drag.blockId, x, y);
    if (drag.exitSide) model.tryExit(drag.blockId, drag.exitSide);
    model.commitAction();
    prefix.push(drag);
    const after = model.snapshot().blocks.find((block) => block.id === "layer-a")?.layers.length ?? 0;
    if (after > 0 && after < before) return prefix;
  }
  throw new Error("Color-accessibility E2E: no layer-a peel route");
});
let state = await debug();
const marks = state.accessibility.colorMarks;
if (Object.keys(marks).length !== 8 || new Set(Object.values(marks)).size !== 8) {
  throw new Error("Color-accessibility E2E: eight colors do not have unique marks");
}
const layerA = state.accessibility.layeredBlocks.find((block) => block.id === "layer-a");
const layerB = state.accessibility.layeredBlocks.find((block) => block.id === "layer-b");
if (!state.art.layerPreviewBadgesReady || !layerA || !layerB
  || layerA.outerColor === layerA.innerColor || layerA.outerMark === layerA.innerMark
  || layerB.outerColor === layerB.innerColor || layerB.outerMark === layerB.innerMark) {
  throw new Error("Color-accessibility E2E: layered semantic marks are incorrect");
}
await page.screenshot({ path: shot("round24-layered-dual-marks.png") });

await setVisualFilter(page, "grayscale");
await page.waitForTimeout(80);
await page.screenshot({ path: shot("round24-layered-grayscale.png") });
await setVisualFilter(page, "protanopia");
await page.waitForTimeout(80);
await page.screenshot({ path: shot("round24-layered-protanopia.png") });

// The active outer mark changes to the inner mark after a real pointer peel, even without hue.
await setVisualFilter(page, "grayscale");
await peelLayerA(page, layerAPeelRoute);
state = await debug();
const peeled = state.puzzle.blocks.find((block) => block.id === "layer-a");
if (peeled?.color !== layerA.innerColor || peeled.layers.length !== 1 || state.accessibility.layeredBlocks.some((block) => block.id === "layer-a")) {
  throw new Error("Color-accessibility E2E: peeled block did not expose one unambiguous active mark");
}
await page.screenshot({ path: shot("round24-layer-peel-grayscale.png") });
await page.close();

// Minimum viewport keeps the one outer block mark, one ImageGen layer-preview badge, and gate marks legible.
const small = await browser.newPage({ viewport: { width: 320, height: 568 } });
attachErrors(small);
await openLayerLevel(small);
await setVisualFilter(small, "grayscale");
await small.waitForTimeout(80);
state = await small.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
if (state.accessibility.layeredBlocks.length !== 2) throw new Error("Color-accessibility E2E: 320x568 layered semantics changed");
await small.screenshot({ path: shot("round24-layered-grayscale-320x568.png") });
await small.close();

await browser.close();
if (errors.length) throw new Error(`Color-accessibility browser errors:\n${errors.join("\n")}`);
console.log("Eight ImageGen color-symbol assets, layered outer/inner semantics, grayscale/protanopia, real peel, and 320x568 passed.");
