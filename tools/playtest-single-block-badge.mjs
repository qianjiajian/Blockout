import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/", import.meta.url));
const shot = (name) => resolve(output, name);
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });

const save = {
  schemaVersion: 1,
  currentLevel: 1,
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

const browser = await chromium.launch({ headless: true });
const errors = [];
const loadedPlainBlocks = new Set();
const attachErrors = (page) => {
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.url().includes("-plain-v1.png")) {
      loadedPlainBlocks.add(new URL(response.url()).pathname.split("/").at(-1));
    }
  });
};
const debug = (page) => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const screenPoint = (page, point) => {
  const viewport = page.viewportSize();
  const scale = Math.min(viewport.width / 496, viewport.height / 1078);
  return {
    x: (viewport.width - 496 * scale) / 2 + point.x * scale,
    y: (viewport.height - 1078 * scale) / 2 + point.y * scale,
  };
};
const blockPoint = (page, state, block) => {
  const [dx, dy] = block.shape[0];
  return screenPoint(page, {
    x: state.board.innerX + (block.x + dx + 0.5) * state.board.cell,
    y: state.board.innerY + (block.y + dy + 0.5) * state.board.cell,
  });
};
const seed = async (page) => {
  await page.goto(playtestUrl, { waitUntil: "networkidle" });
  await page.evaluate((value) => localStorage.setItem("color-escape-save-v1", JSON.stringify(value)), save);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(220);
};
const openLevel = async (page, levelId) => {
  await page.evaluate((id) => window.__COLOR_ESCAPE__.loadLevel(id, true), levelId);
  await page.waitForTimeout(180);
  const state = await debug(page);
  if (state.screen !== "playing" || state.level.id !== levelId) {
    throw new Error(`Single-badge E2E: expected playing Lv${levelId}`);
  }
  return state;
};
const assertOneBadgePerBlock = (state, label) => {
  if (!state.art.plainBlocksReady) throw new Error(`Single-badge E2E: plain art was not ready at ${label}`);
  if (state.accessibility.blockBadges.length !== state.puzzle.blocks.length) {
    throw new Error(`Single-badge E2E: badge/block count mismatch at ${label}`);
  }
  for (const badge of state.accessibility.blockBadges) {
    const block = state.puzzle.blocks.find((candidate) => candidate.id === badge.id);
    if (!block || badge.markedCells !== 1 || badge.plainCells !== badge.totalCells - 1
      || badge.totalCells !== block.shape.length) {
      throw new Error(`Single-badge E2E: invalid badge accounting for ${badge.id} at ${label}`);
    }
    const belongs = block.shape.some(([dx, dy]) => (
      block.x + dx === badge.cell[0] && block.y + dy === badge.cell[1]
    ));
    if (!belongs) throw new Error(`Single-badge E2E: badge escaped ${badge.id} at ${label}`);
  }
};
const setGrayscale = (page) => page.evaluate(() => {
  const canvas = document.querySelector("canvas");
  if (!canvas) throw new Error("Single-badge E2E: game canvas missing");
  canvas.style.filter = "grayscale(1) contrast(1.12)";
});
const findLayerPeelRoute = (page, blockId) => page.evaluate(async (targetId) => {
  const [{ getLevelStrict }, { solveLevelForValidation }, { PuzzleModel }] = await Promise.all([
    import("/src/core/levels.ts"),
    import("/src/core/levelSolver.ts"),
    import("/src/core/PuzzleModel.ts"),
  ]);
  const level = getLevelStrict(15);
  const solution = solveLevelForValidation(level);
  const model = new PuzzleModel(level);
  const prefix = [];
  for (const drag of solution.drags) {
    const before = model.getBlock(targetId)?.layers.length ?? 0;
    model.beginAction();
    for (const [x, y] of drag.path) model.moveBlockStep(drag.blockId, x, y);
    if (drag.exitSide) model.tryExit(drag.blockId, drag.exitSide);
    model.commitAction();
    prefix.push(drag);
    const after = model.getBlock(targetId)?.layers.length ?? 0;
    if (after > 0 && after < before) return prefix;
  }
  throw new Error(`Single-badge E2E: validation route never peels ${targetId}`);
}, blockId);
const replayRoute = async (page, route) => {
  for (const [dragIndex, drag] of route.entries()) {
    const latest = await debug(page);
    const block = latest.puzzle.blocks.find((candidate) => candidate.id === drag.blockId);
    if (!block) throw new Error(`Single-badge E2E: missing route block ${drag.blockId}`);
    const [anchorX, anchorY] = block.shape[0];
    const point = (x, y) => screenPoint(page, {
      x: latest.board.innerX + (x + anchorX + 0.5) * latest.board.cell,
      y: latest.board.innerY + (y + anchorY + 0.5) * latest.board.cell,
    });
    const start = point(block.x, block.y);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    for (const [x, y] of drag.path) {
      const target = point(x, y);
      await page.mouse.move(target.x, target.y, { steps: 3 });
    }
    if (drag.exitSide) {
      const held = await debug(page);
      const remaining = held.puzzle.blocks.find((candidate) => candidate.id === drag.blockId);
      const expectedLayers = Math.max(0, block.layers.length - 1);
      if (held.selectedId || held.activePointer !== undefined
        || (expectedLayers === 0 && remaining)
        || (expectedLayers > 0 && (!remaining || remaining.layers.length !== expectedLayers))) {
        throw new Error(`Single-badge E2E: ${drag.blockId} did not resolve while the pointer stayed down`);
      }
    }
    await page.mouse.up();
    await page.waitForTimeout(dragIndex === route.length - 1 ? 220 : 700);
  }
};

const page = await browser.newPage({ viewport: { width: 496, height: 1078 } });
attachErrors(page);
await seed(page);

let state = await openLevel(page, 1);
assertOneBadgePerBlock(state, "level 1");
if (!state.accessibility.blockBadges.some((badge) => badge.totalCells > 1)) {
  throw new Error("Single-badge E2E: level 1 lacks a multi-cell coverage block");
}
await page.screenshot({ path: shot("round45-single-badge-level-001.png") });

state = await openLevel(page, 2);
assertOneBadgePerBlock(state, "concave level 2");
const concave = state.puzzle.blocks.find((block) => block.shape.length === 3);
if (!concave) throw new Error("Single-badge E2E: level 2 lacks an L-shaped block");
await page.screenshot({ path: shot("round45-single-badge-concave-level-002.png") });

const start = blockPoint(page, state, concave);
await page.mouse.move(start.x, start.y);
await page.mouse.down();
await page.waitForTimeout(120);
state = await debug(page);
assertOneBadgePerBlock(state, "selected concave block");
if (state.selectedId !== concave.id) throw new Error("Single-badge E2E: concave block did not select as one object");
await page.screenshot({ path: shot("round45-single-badge-selected.png") });
await page.mouse.up();

state = await openLevel(page, 15);
assertOneBadgePerBlock(state, "layered level 15");
if (!state.art.layerPreviewBadgesReady) throw new Error("Single-badge E2E: ImageGen layer-preview atlas was not ready");
const layerA = state.puzzle.blocks.find((block) => block.id === "layer-a");
if (!layerA || layerA.layers.length < 2) throw new Error("Single-badge E2E: layered block missing");
await page.screenshot({ path: shot("round45-single-badge-layered-level-015.png") });
await setGrayscale(page);
await page.waitForTimeout(80);
await page.screenshot({ path: shot("round45-single-badge-layered-grayscale.png") });

const layerAPeelRoute = await findLayerPeelRoute(page, layerA.id);
await replayRoute(page, layerAPeelRoute);
state = await debug(page);
assertOneBadgePerBlock(state, "layer peel");
const peeled = state.puzzle.blocks.find((block) => block.id === "layer-a");
if (!peeled || peeled.layers.length !== 1) throw new Error("Single-badge E2E: real pointer peel did not expose one layer");
await page.screenshot({ path: shot("round45-single-badge-layer-peel-grayscale.png") });
await page.close();

const release = await browser.newPage({ viewport: { width: 720, height: 1584 }, deviceScaleFactor: 2 });
attachErrors(release);
await seed(release);
state = await openLevel(release, 15);
assertOneBadgePerBlock(state, "layered level 15 at 720x1584 DPR2");
if (!state.art.layerPreviewBadgesReady) {
  throw new Error("Single-badge E2E: optimized layer-preview atlas was not ready at release density");
}
await release.screenshot({ path: shot("round73-art-density-layered-720x1584.png") });
await release.close();

const small = await browser.newPage({ viewport: { width: 320, height: 568 } });
attachErrors(small);
await seed(small);
state = await openLevel(small, 100);
assertOneBadgePerBlock(state, "level 100 at 320x568");
await small.screenshot({ path: shot("round45-single-badge-level-100-320x568.png") });
await small.close();

const expectedPlainAssets = ["red", "blue", "green", "yellow", "purple", "orange", "pink", "cyan"]
  .map((color) => `${color}-plain-v1.png`);
for (const asset of expectedPlainAssets) {
  if (!loadedPlainBlocks.has(asset)) throw new Error(`Single-badge E2E: plain asset did not load: ${asset}`);
}

await browser.close();
if (errors.length) throw new Error(`Single-badge browser errors:\n${errors.join("\n")}`);
console.log("One ImageGen symbol per connected block, concave selection, layered peel, grayscale, 720x1584 DPR2, and 320x568 passed.");
