import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = resolve(ROOT, "playtest-results/staging-collision");
const URL = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
const LEVEL_ID = 17;
const BLOCK_ID = "cc-piece-s1-12";
const TARGET = { x: 2, y: 3 };
const viewports = [
  { label: "reference", width: 592, height: 1280 },
  { label: "small", width: 320, height: 568 },
];

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const save = {
  schemaVersion: 1,
  currentLevel: LEVEL_ID,
  highestLevel: 100,
  coins: 1000,
  sound: false,
  haptic: false,
  reducedMotion: false,
  featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter", "generator", "elevator", "conveyor", "star-gate"],
  boosterUnlockSeen: ["time", "rocket", "pulse"],
  boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: {},
  bestMoves: {},
  rewardedLevels: [],
};

const screenPoint = (state, canvasBounds, gridX, gridY) => ({
  x: canvasBounds.x + state.viewportTransform.offsetX
    + (state.board.innerX + (gridX + 0.5) * state.board.cell) * state.viewportTransform.scale,
  y: canvasBounds.y + state.viewportTransform.offsetY
    + (state.board.innerY + (gridY + 0.5) * state.board.cell) * state.viewportTransform.scale,
});

await mkdir(OUTPUT, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];

for (const viewport of viewports) {
  const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
  const browserErrors = [];
  page.on("console", (message) => { if (message.type() === "error") browserErrors.push(message.text()); });
  page.on("pageerror", (error) => browserErrors.push(error.message));
  await page.addInitScript((initialSave) => {
    localStorage.setItem("color-escape-save-v1", JSON.stringify(initialSave));
  }, save);
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready);
  await page.evaluate((levelId) => window.__COLOR_ESCAPE__.loadLevel(levelId, true), LEVEL_ID);
  await page.waitForTimeout(100);
  const canvasBounds = await page.locator("canvas").boundingBox();
  assert(canvasBounds, `${viewport.label}: canvas bounds unavailable`);

  const before = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
  const block = before.puzzle.blocks.find((candidate) => candidate.id === BLOCK_ID);
  assert(block?.x === 1 && block?.y === 3 && block?.color === "pink",
    `${viewport.label}: Lv17 pink block opening pose drifted (${JSON.stringify(block)})`);
  const stagingBefore = before.puzzle.shutters
    .filter((shutter) => shutter.skin === "staging")
    .map((shutter) => shutter.count);
  assert(JSON.stringify(stagingBefore) === JSON.stringify([20, 22, 24]),
    `${viewport.label}: Lv17 staging counters drifted (${JSON.stringify(stagingBefore)})`);

  const start = screenPoint(before, canvasBounds, block.x, block.y);
  const end = screenPoint(before, canvasBounds, TARGET.x, TARGET.y);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 16 });
  await page.waitForTimeout(80);

  const held = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
  const heldBlock = held.puzzle.blocks.find((candidate) => candidate.id === BLOCK_ID);
  if (heldBlock?.x !== TARGET.x || heldBlock?.y !== TARGET.y) {
    console.log(JSON.stringify({ viewport, canvasBounds, start, end, board: before.board, viewportTransform: before.viewportTransform, selectedId: held.selectedId, dragMotion: held.dragMotion, selectionFeedback: held.selectionFeedback, heldBlock }));
  }
  assert(heldBlock?.x === TARGET.x && heldBlock?.y === TARGET.y,
    `${viewport.label}: held pink block stopped at ${JSON.stringify(heldBlock)}`);
  assert(held.dragMotion?.blockId === BLOCK_ID
    && Math.abs(held.dragMotion.visualX - TARGET.x) <= 0.03
    && Math.abs(held.dragMotion.visualY - TARGET.y) <= 0.03,
  `${viewport.label}: held drag visual did not reach the right cell (${JSON.stringify(held.dragMotion)})`);
  assert(held.selectionFeedback?.mode !== "blocked",
    `${viewport.label}: right drag still emitted blocked feedback`);
  await page.screenshot({ path: resolve(OUTPUT, `lv17-pink-right-held-${viewport.width}x${viewport.height}.png`) });

  await page.mouse.up();
  await page.waitForTimeout(140);
  const after = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
  const moved = after.puzzle.blocks.find((candidate) => candidate.id === BLOCK_ID);
  const stagingAfter = after.puzzle.shutters
    .filter((shutter) => shutter.skin === "staging")
    .map((shutter) => shutter.count);
  assert(moved?.x === TARGET.x && moved?.y === TARGET.y,
    `${viewport.label}: released pink block did not stay in the right cell (${JSON.stringify(moved)})`);
  assert(after.puzzle.moves === 1, `${viewport.label}: drag counted ${after.puzzle.moves} moves instead of 1`);
  assert(JSON.stringify(stagingAfter) === JSON.stringify(stagingBefore),
    `${viewport.label}: a reposition changed staging counters (${JSON.stringify(stagingAfter)})`);
  assert(browserErrors.length === 0, `${viewport.label}: browser errors\n${browserErrors.join("\n")}`);

  results.push({
    viewport,
    levelId: LEVEL_ID,
    blockId: BLOCK_ID,
    from: { x: block.x, y: block.y },
    to: TARGET,
    moves: after.puzzle.moves,
    stagingBefore,
    stagingAfter,
    browserErrors,
  });
  await page.close();
}

await browser.close();
await writeFile(resolve(OUTPUT, "report.json"), `${JSON.stringify({ passed: true, results }, null, 2)}\n`, "utf8");
console.log(`Lv17 staging collision regression passed at ${viewports.map(({ width, height }) => `${width}x${height}`).join(" and ")}.`);
