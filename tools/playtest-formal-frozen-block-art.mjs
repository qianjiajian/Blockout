import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/formal-frozen-block-art/", import.meta.url));
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });

const expected = {
  "ice-cell.png": [95, 104],
  "ice-vertical-2.png": [95, 199],
  "ice-vertical-3.png": [95, 294],
  "ice-horizontal-2.png": [190, 104],
  "ice-horizontal-3.png": [285, 104],
  "ice-l-triomino.png": [191, 199],
  "ice-s-tetromino.png": [285, 199],
  "ice-t-tetromino.png": [285, 199],
  "ice-square-2x2.png": [192, 199],
};

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 720, height: 1584 }, deviceScaleFactor: 1 });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));

await page.addInitScript(() => {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "src");
  if (!descriptor?.get || !descriptor.set) throw new Error("Formal frozen art: image src is not instrumentable");
  const ids = new WeakMap();
  const tracker = { nextId: 1, active: {}, releases: [] };
  globalThis.__FORMAL_FROZEN_IMAGE_LIFECYCLE__ = tracker;
  const normalize = (value) => {
    if (!value) return "";
    try { return new URL(String(value), location.href).pathname.replace(/^\/+/, ""); }
    catch { return String(value); }
  };
  Object.defineProperty(HTMLImageElement.prototype, "src", {
    configurable: descriptor.configurable,
    enumerable: descriptor.enumerable,
    get: descriptor.get,
    set(value) {
      let id = ids.get(this);
      if (!id) {
        id = tracker.nextId;
        tracker.nextId += 1;
        ids.set(this, id);
      }
      const previous = tracker.active[id];
      const source = normalize(value);
      if (previous && previous !== source) tracker.releases.push({ id, src: previous });
      if (source) tracker.active[id] = source;
      else delete tracker.active[id];
      descriptor.set.call(this, value);
    },
  });
});

await page.addInitScript(() => localStorage.setItem("color-escape-save-v1", JSON.stringify({
  schemaVersion: 1,
  currentLevel: 1,
  highestLevel: 100,
  coins: 1000,
  sound: false,
  haptic: false,
  reducedMotion: true,
  featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter", "generator", "arrow-block", "key-lock", "lift", "timed-generator", "staged-frame", "star"],
  boosterUnlockSeen: ["time", "rocket", "pulse"],
  boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: {},
  bestMoves: {},
  rewardedLevels: [],
})));

await page.goto(playtestUrl, { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState?.().art?.ready === true);

await page.evaluate(async () => {
  const game = window.__COLOR_ESCAPE__;
  const { PuzzleModel } = await import("/src/core/PuzzleModel.ts");
  game.model = new PuzzleModel({
    id: 1,
    name: "Formal frozen whole-piece catalog",
    difficulty: "normal",
    timeSeconds: 600,
    reward: 0,
    width: 7,
    height: 12,
    gates: [],
    blocks: [
      { id: "ice-single", x: 0, y: 0, shape: [[0, 0]], color: "blue", frozen: 3 },
      { id: "ice-v2", x: 2, y: 0, shape: [[0, 0], [0, 1]], color: "blue", frozen: 4 },
      { id: "ice-v3", x: 4, y: 0, shape: [[0, 0], [0, 1], [0, 2]], color: "blue", frozen: 5 },
      { id: "ice-h2", x: 5, y: 0, shape: [[0, 0], [1, 0]], color: "blue", frozen: 6 },
      { id: "ice-h3", x: 0, y: 4, shape: [[0, 0], [1, 0], [2, 0]], color: "blue", frozen: 7 },
      { id: "ice-l3", x: 4, y: 4, shape: [[0, 0], [0, 1], [1, 1]], color: "blue", frozen: 8 },
      { id: "ice-s4", x: 0, y: 7, shape: [[0, 0], [1, 0], [1, 1], [2, 1]], color: "blue", frozen: 9 },
      { id: "ice-t4", x: 4, y: 7, shape: [[1, 0], [0, 1], [1, 1], [2, 1]], color: "blue", frozen: 10 },
      { id: "ice-square", x: 2, y: 10, shape: [[0, 0], [1, 0], [0, 1], [1, 1]], color: "blue", frozen: 11 },
    ],
  });
  game.screen = "playing";
  game.selectedId = undefined;
  game.activePointer = undefined;
  game.dragVisual = undefined;
  game.formalBlockArtFailedSignature = undefined;
  game.formalIceArtFailedSignature = undefined;
  game.ensureFormalBlockArtForCurrentLevel();
  game.ensureFormalIceArtForCurrentLevel();
  game.dirty = true;
  game.scheduleFrame();
});

await page.waitForFunction(() => {
  const formal = window.__COLOR_ESCAPE__?.getDebugState?.().art?.formalGameplay;
  return formal?.requestedBlockSignature == null
    && formal?.requestedIceSignature == null
    && formal?.blockError == null
    && formal?.iceError == null
    && formal?.iceSignature === "2|3|4|5|6|7|8|9"
    && JSON.stringify(formal?.loadedWholeIceShapes) === JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9]);
}, undefined, { timeout: 10_000 });

const auditDraws = () => page.evaluate(() => {
  const game = window.__COLOR_ESCAPE__;
  const original = CanvasRenderingContext2D.prototype.drawImage;
  const records = [];
  CanvasRenderingContext2D.prototype.drawImage = function frozenArtAudit(image, ...args) {
    const source = String(image?.currentSrc || image?.src || "");
    if (source.includes("/assets/art/gameplay/mechanics/formal-gameplay-v1/ice-")) {
      const matrix = this.getTransform();
      records.push({
        name: source.split("/").pop(),
        width: Number(image?.naturalWidth || image?.width || 0),
        height: Number(image?.naturalHeight || image?.height || 0),
        arguments: args.map(Number),
        matrix: { a: matrix.a, b: matrix.b, c: matrix.c, d: matrix.d },
      });
    }
    return original.call(this, image, ...args);
  };
  try {
    game.render();
  } finally {
    CanvasRenderingContext2D.prototype.drawImage = original;
  }
  return records;
});

const records = await auditDraws();
for (const [name, [width, height]] of Object.entries(expected)) {
  const matching = records.filter((record) => record.name === name);
  if (!matching.length) throw new Error(`Formal frozen art E2E: ${name} was not drawn`);
  for (const record of matching) {
    if (record.width !== width || record.height !== height || record.arguments.length !== 2) {
      throw new Error(`Formal frozen art E2E: ${name} was resized or has the wrong native size: ${JSON.stringify(record)}`);
    }
    const xScale = Math.hypot(record.matrix.a, record.matrix.b);
    const yScale = Math.hypot(record.matrix.c, record.matrix.d);
    const dot = record.matrix.a * record.matrix.c + record.matrix.b * record.matrix.d;
    if (Math.abs(xScale - yScale) > 0.00001 || Math.abs(dot) > 0.00001) {
      throw new Error(`Formal frozen art E2E: ${name} used a stretched or sheared transform: ${JSON.stringify(record)}`);
    }
  }
}
const catalogLifecycle = await page.evaluate(() => ({
  active: Object.entries(globalThis.__FORMAL_FROZEN_IMAGE_LIFECYCLE__.active)
    .map(([id, src]) => ({ id: Number(id), src })),
  releases: [...globalThis.__FORMAL_FROZEN_IMAGE_LIFECYCLE__.releases],
}));
const dynamicNames = Object.keys(expected).filter((name) => name !== "ice-cell.png");
const isDynamicFrozenSprite = (src) => src.includes("/formal-gameplay-v1/")
  && dynamicNames.some((name) => src.endsWith(`/${name}`));
const catalogDynamic = catalogLifecycle.active.filter(({ src }) => isDynamicFrozenSprite(src));
if (catalogDynamic.length !== dynamicNames.length) {
  throw new Error(`Formal frozen art E2E: expected eight resident dynamic sprites: ${JSON.stringify(catalogDynamic)}`);
}
const catalogDynamicIds = new Set(catalogDynamic.map(({ id }) => id));
await page.screenshot({ path: resolve(output, "whole-piece-catalog-720x1584.png") });

await page.evaluate(async () => {
  const game = window.__COLOR_ESCAPE__;
  const { PuzzleModel } = await import("/src/core/PuzzleModel.ts");
  game.model = new PuzzleModel({
    id: 1,
    name: "Formal frozen fallback",
    difficulty: "normal",
    timeSeconds: 600,
    reward: 0,
    width: 5,
    height: 5,
    gates: [],
    blocks: [{
      id: "ice-l4-fallback",
      x: 1,
      y: 1,
      shape: [[0, 0], [1, 0], [2, 0], [0, 1]],
      color: "blue",
      frozen: 4,
    }],
  });
  game.formalBlockArtFailedSignature = undefined;
  game.formalIceArtFailedSignature = undefined;
  game.ensureFormalBlockArtForCurrentLevel();
  game.ensureFormalIceArtForCurrentLevel();
  game.dirty = true;
  game.scheduleFrame();
});
await page.waitForFunction(() => {
  const formal = window.__COLOR_ESCAPE__?.getDebugState?.().art?.formalGameplay;
  return formal?.requestedBlockSignature == null
    && formal?.requestedIceSignature == null
    && formal?.iceSignature === ""
    && formal?.dynamicIceImages === 0
    && JSON.stringify(formal?.loadedWholeIceShapes) === JSON.stringify([1]);
}, undefined, { timeout: 10_000 });
const fallbackRecords = await auditDraws();
if (fallbackRecords.length !== 4 || fallbackRecords.some((record) => record.name !== "ice-cell.png")) {
  throw new Error(`Formal frozen art E2E: uncovered L4 did not use four single-cell fallbacks: ${JSON.stringify(fallbackRecords)}`);
}
const fallbackLifecycle = await page.evaluate(() => ({
  active: Object.entries(globalThis.__FORMAL_FROZEN_IMAGE_LIFECYCLE__.active)
    .map(([id, src]) => ({ id: Number(id), src })),
  releases: [...globalThis.__FORMAL_FROZEN_IMAGE_LIFECYCLE__.releases],
}));
const staleDynamic = fallbackLifecycle.active.filter(({ id }) => catalogDynamicIds.has(id));
const releasedDynamicIds = new Set(fallbackLifecycle.releases
  .filter(({ src }) => isDynamicFrozenSprite(src))
  .map(({ id }) => id));
if (staleDynamic.length || [...catalogDynamicIds].some((id) => !releasedDynamicIds.has(id))) {
  throw new Error(`Formal frozen art E2E: dynamic sprites were not released on level change: ${JSON.stringify({ staleDynamic, releasedDynamicIds: [...releasedDynamicIds] })}`);
}
await page.screenshot({ path: resolve(output, "uncovered-l4-fallback-720x1584.png") });

await page.setViewportSize({ width: 320, height: 568 });
await page.evaluate(() => {
  const game = window.__COLOR_ESCAPE__;
  game.dirty = true;
  game.scheduleFrame();
});
await page.waitForTimeout(100);
await page.screenshot({ path: resolve(output, "uncovered-l4-fallback-320x568.png") });

await browser.close();
if (errors.length) throw new Error(`Formal frozen art browser errors:\n${errors.join("\n")}`);
console.log("Formal frozen whole-piece art E2E passed: 9/9 native sprites, uniform transforms, lazy release, and uncovered-shape fallback.");
