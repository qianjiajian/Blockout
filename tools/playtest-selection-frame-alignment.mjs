import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/selection-frame-alignment/", import.meta.url));
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const closeTo = (value, expected) => Math.abs(value - expected) <= 0.001;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 720, height: 1584 }, deviceScaleFactor: 1 });
const browserErrors = [];
page.on("pageerror", (error) => browserErrors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") browserErrors.push(message.text());
});

await page.goto(playtestUrl, { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.setItem("color-escape-save-v1", JSON.stringify({
  schemaVersion: 1,
  currentLevel: 1,
  highestLevel: 100,
  coins: 1000,
  sound: false,
  haptic: false,
  reducedMotion: true,
  featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter", "generator", "elevator", "conveyor", "star"],
  boosterUnlockSeen: ["time", "rocket", "pulse"],
  boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: {},
  bestMoves: {},
  rewardedLevels: [],
  dailyStreak: 0,
  lastDailyCompletedDay: "",
})));
await page.reload({ waitUntil: "networkidle" });
await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState?.().art?.ready === true);

await page.evaluate(async () => {
  const game = window.__COLOR_ESCAPE__;
  const { PuzzleModel } = await import("/src/core/PuzzleModel.ts");
  game.model = new PuzzleModel({
    id: 1,
    name: "Selection frame alignment",
    difficulty: "normal",
    timeSeconds: 600,
    reward: 0,
    width: 7,
    height: 7,
    gates: [],
    blocks: [
      { id: "green-single", x: 1, y: 1, shape: [[0, 0]], color: "green" },
      { id: "red-vertical-3", x: 3, y: 1, shape: [[0, 0], [0, 1], [0, 2]], color: "red" },
      { id: "orange-l", x: 5, y: 3, shape: [[0, 0], [0, 1], [1, 1]], color: "orange" },
    ],
  });
  game.screen = "playing";
  game.selectedId = undefined;
  game.activePointer = undefined;
  game.dragVisual = undefined;
  game.formalBlockArtFailedSignature = undefined;
  game.ensureFormalBlockArtForCurrentLevel();
  game.dirty = true;
  game.scheduleFrame();
});
await page.waitForFunction(() => {
  const formal = window.__COLOR_ESCAPE__?.getDebugState?.().art?.formalGameplay;
  return formal?.requestedBlockSignature == null
    && formal?.blockError == null
    && formal?.loadedWholeBlockCoverage === formal?.totalBlocks
    && formal?.totalBlocks === 3;
});

const auditSelection = async (id) => page.evaluate((blockId) => {
  const game = window.__COLOR_ESCAPE__;
  game.selectedId = blockId;
  const original = CanvasRenderingContext2D.prototype.drawImage;
  const records = [];
  CanvasRenderingContext2D.prototype.drawImage = function selectionAudit(image, ...args) {
    const source = String(image?.currentSrc || image?.src || "");
    if (source.includes("/assets/art/fx/formal-gameplay-v1/selection-frame.png")) {
      records.push(args.map((value) => Number(value)));
    }
    return original.call(this, image, ...args);
  };
  try {
    game.render();
  } finally {
    CanvasRenderingContext2D.prototype.drawImage = original;
  }
  return records;
}, id);

const assertNativeTiles = (records, expected, label, expectedCorners) => {
  assert(records.length > 0, `${label}: selection frame was not drawn`);
  const rectangles = records.map((record) => {
    assert(record.length === 8, `${label}: selection tile did not use a cropped draw: ${JSON.stringify(record)}`);
    const [sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height] = record;
    assert(closeTo(sourceWidth, width) && closeTo(sourceHeight, height),
      `${label}: selection tile was stretched: ${JSON.stringify(record)}`);
    return { sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height };
  });
  const bounds = {
    left: Math.min(...rectangles.map(({ x }) => x)),
    top: Math.min(...rectangles.map(({ y }) => y)),
    right: Math.max(...rectangles.map(({ x, width }) => x + width)),
    bottom: Math.max(...rectangles.map(({ y, height }) => y + height)),
  };
  for (const key of Object.keys(expected)) {
    assert(closeTo(bounds[key], expected[key]), `${label}: ${key} expected ${expected[key]}, received ${bounds[key]}`);
  }
  const corners = rectangles.filter(({ sourceX, sourceY, sourceWidth, sourceHeight }) => (
    sourceWidth === 12 && sourceHeight === 12
    && (sourceX === 0 || sourceX === 95)
    && (sourceY === 0 || sourceY === 95)
  ));
  assert(corners.length === expectedCorners,
    `${label}: expected ${expectedCorners} exterior corners, received ${corners.length}`);
  return { drawCount: records.length, bounds, cornerCount: corners.length };
};

const results = [];
for (const fixture of [
  {
    id: "green-single",
    expected: { left: -6, top: -15, right: 101, bottom: 101 },
    corners: 4,
    file: "01-single.png",
  },
  {
    id: "red-vertical-3",
    expected: { left: -6, top: -15, right: 101, bottom: 291 },
    corners: 4,
    file: "02-vertical-three.png",
  },
  {
    id: "orange-l",
    expected: { left: -6, top: -15, right: 196, bottom: 196 },
    corners: 5,
    file: "03-concave-l.png",
  },
]) {
  const records = await auditSelection(fixture.id);
  results.push({ id: fixture.id, ...assertNativeTiles(records, fixture.expected, fixture.id, fixture.corners) });
  await page.screenshot({ path: resolve(output, fixture.file) });
}

await browser.close();
if (browserErrors.length) throw new Error(`Selection-frame alignment browser errors:\n${browserErrors.join("\n")}`);
console.log(`Selection-frame alignment PASS: ${results.map((result) => `${result.id} ${result.drawCount} native tiles`).join(", ")}.`);

