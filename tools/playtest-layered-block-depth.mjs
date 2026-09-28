import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

const root = resolve(import.meta.dirname, "..");
const baseUrl = process.env.PLAYTEST_URL ?? process.env.BASE_URL ?? "http://127.0.0.1:5173/";
const viewport = { width: 496, height: 1078 };
const outputDir = resolve(root, "playtest-results/layered-block-depth");
const screenshotPath = resolve(outputDir, "01-four-supplied-blocks-depth.png");
const reportPath = resolve(outputDir, "report.json");

const assets = [
  { id: "green-t-tetromino", file: "green-t-tetromino.png", width: 285, height: 199, sourceY: -9 },
  { id: "yellow-single", file: "yellow-single.png", width: 95, height: 104, sourceY: -9 },
  { id: "red-horizontal-2", file: "red-horizontal-2.png", width: 190, height: 104, sourceY: -9 },
  { id: "orange-s-tetromino", file: "orange-s-tetromino.png", width: 285, height: 199, sourceY: -9 },
];
const expectedDrawOrder = [
  "green-t-tetromino",
  "orange-s-tetromino",
  "red-horizontal-2",
  "yellow-single",
];
const expectedSignature = "solid:green:6|solid:orange:5|solid:red:8";

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const sha256 = async (path) => createHash("sha256").update(await readFile(path)).digest("hex");

const save = {
  schemaVersion: 1,
  currentLevel: 1,
  highestLevel: 100,
  coins: 1000,
  sound: false,
  haptic: false,
  reducedMotion: true,
  featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter", "generator", "arrow-block", "lift", "timed-generator", "key-lock", "elevator", "conveyor", "star"],
  boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: {},
  bestMoves: {},
  rewardedLevels: [],
  dailyStreak: 0,
  lastDailyCompletedDay: "",
};

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const browserErrors = [];
try {
  const page = await browser.newPage({ viewport });
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.evaluate((value) => localStorage.setItem("color-escape-save-v1", JSON.stringify(value)), save);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState?.().art?.ready === true);

  await page.evaluate(async () => {
    const game = window.__COLOR_ESCAPE__;
    if (!game) throw new Error("Layer-depth E2E: game is unavailable");
    const { PuzzleModel } = await import("/src/core/PuzzleModel.ts");
    game.model = new PuzzleModel({
      id: 1,
      name: "Four supplied layered blocks",
      difficulty: "normal",
      timeSeconds: 600,
      reward: 0,
      width: 5,
      height: 7,
      gates: [],
      // Reverse painter order on purpose. The renderer must derive depth from
      // the visible position rather than retaining this authored array order.
      blocks: [
        { id: "yellow-single", x: 1, y: 5, shape: [[0, 0]], color: "yellow" },
        { id: "red-horizontal-2", x: 1, y: 4, shape: [[0, 0], [1, 0]], color: "red" },
        { id: "orange-s-tetromino", x: 1, y: 2, shape: [[0, 0], [1, 0], [1, 1], [2, 1]], color: "orange" },
        { id: "green-t-tetromino", x: 1, y: 0, shape: [[1, 0], [0, 1], [1, 1], [2, 1]], color: "green" },
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

  await page.waitForFunction((signature) => {
    const art = window.__COLOR_ESCAPE__?.getDebugState?.().art?.formalGameplay;
    return art?.blockSignature === signature && art?.requestedBlockSignature == null && art?.blockError == null;
  }, expectedSignature);

  const naturalSizes = await page.evaluate(async (items) => Promise.all(items.map((item) => new Promise((resolveImage, rejectImage) => {
    const image = new Image();
    image.onload = () => resolveImage({
      id: item.id,
      width: image.naturalWidth,
      height: image.naturalHeight,
    });
    image.onerror = () => rejectImage(new Error(`Could not load ${item.file}`));
    image.src = `/assets/art/gameplay/blocks/formal-v1/${item.file}`;
  }))), assets);
  assert(JSON.stringify(naturalSizes) === JSON.stringify(assets.map(({ id, width, height }) => ({ id, width, height }))),
    `Layer-depth E2E: supplied native sizes changed ${JSON.stringify(naturalSizes)}`);

  const drawAudit = await page.evaluate((items) => {
    const game = window.__COLOR_ESCAPE__;
    const original = CanvasRenderingContext2D.prototype.drawImage;
    const calls = [];
    CanvasRenderingContext2D.prototype.drawImage = function patchedDrawImage(...args) {
      const source = typeof args[0]?.src === "string" ? args[0].src : "";
      const matched = items.find((item) => source.endsWith(`/${item.file}`));
      if (matched) calls.push({ id: matched.id, sourceY: Number(args[2]) });
      return original.apply(this, args);
    };
    try {
      game.render();
    } finally {
      CanvasRenderingContext2D.prototype.drawImage = original;
    }
    return calls;
  }, assets);
  const drawOrder = drawAudit.map(({ id }) => id);
  assert(JSON.stringify(drawOrder) === JSON.stringify(expectedDrawOrder),
    `Layer-depth E2E: painter order is ${JSON.stringify(drawOrder)}, expected ${JSON.stringify(expectedDrawOrder)}`);
  for (const asset of assets) {
    const draw = drawAudit.find(({ id }) => id === asset.id);
    assert(draw?.sourceY === asset.sourceY,
      `Layer-depth E2E: ${asset.id} sourceY is ${draw?.sourceY}, expected bottom-aligned ${asset.sourceY}`);
  }

  const overlapEvidence = await page.evaluate((items) => {
    const game = window.__COLOR_ESCAPE__;
    const canvas = document.querySelector("canvas");
    if (!game || !canvas) throw new Error("Layer-depth E2E: cannot inspect canvas overlap");
    const original = CanvasRenderingContext2D.prototype.drawImage;
    const recorded = [];
    CanvasRenderingContext2D.prototype.drawImage = function recordSuppliedBlock(...args) {
      const source = typeof args[0]?.src === "string" ? args[0].src : "";
      const matched = items.find((item) => source.endsWith(`/${item.file}`));
      if (matched && this.canvas === canvas) {
        const matrix = this.getTransform();
        recorded.push({
          id: matched.id,
          image: args[0],
          drawArgs: args.slice(1),
          matrix: [matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f],
        });
      }
      return original.apply(this, args);
    };
    try {
      game.render();
    } finally {
      CanvasRenderingContext2D.prototype.drawImage = original;
    }

    const pixelsById = new Map();
    for (const call of recorded) {
      const layerCanvas = document.createElement("canvas");
      layerCanvas.width = canvas.width;
      layerCanvas.height = canvas.height;
      const layerContext = layerCanvas.getContext("2d", { willReadFrequently: true });
      layerContext.setTransform(...call.matrix);
      original.call(layerContext, call.image, ...call.drawArgs);
      pixelsById.set(call.id, layerContext.getImageData(0, 0, canvas.width, canvas.height).data);
    }

    const pairs = [
      ["green-t-tetromino", "orange-s-tetromino"],
      ["orange-s-tetromino", "red-horizontal-2"],
      ["red-horizontal-2", "yellow-single"],
    ];
    const candidates = pairs.map(([upperId, lowerId]) => {
      const upper = pixelsById.get(upperId);
      const lower = pixelsById.get(lowerId);
      if (!upper || !lower) throw new Error(`Layer-depth E2E: missing raster layer ${upperId}/${lowerId}`);
      let best;
      for (let index = 0; index < upper.length; index += 4) {
        if (upper[index + 3] < 250 || lower[index + 3] < 250) continue;
        const colorDelta = Math.abs(upper[index] - lower[index])
          + Math.abs(upper[index + 1] - lower[index + 1])
          + Math.abs(upper[index + 2] - lower[index + 2]);
        if (!best || colorDelta > best.colorDelta) {
          const pixelIndex = index / 4;
          best = {
            upperId,
            lowerId,
            x: pixelIndex % canvas.width,
            y: Math.floor(pixelIndex / canvas.width),
            colorDelta,
            lowerPixel: Array.from(lower.slice(index, index + 4)),
          };
        }
      }
      if (!best) throw new Error(`Layer-depth E2E: ${upperId}/${lowerId} have no opaque pixel overlap`);
      return best;
    });

    const captures = new Map();
    CanvasRenderingContext2D.prototype.drawImage = function captureLowerPaint(...args) {
      const source = typeof args[0]?.src === "string" ? args[0].src : "";
      const matched = items.find((item) => source.endsWith(`/${item.file}`));
      const candidate = matched && candidates.find(({ lowerId }) => lowerId === matched.id);
      if (!candidate || this.canvas !== canvas) return original.apply(this, args);
      const before = Array.from(this.getImageData(candidate.x, candidate.y, 1, 1).data);
      const result = original.apply(this, args);
      const after = Array.from(this.getImageData(candidate.x, candidate.y, 1, 1).data);
      captures.set(candidate.lowerId, { before, after });
      return result;
    };
    try {
      game.render();
    } finally {
      CanvasRenderingContext2D.prototype.drawImage = original;
    }

    return candidates.map((candidate) => ({
      ...candidate,
      ...captures.get(candidate.lowerId),
    }));
  }, assets);
  for (const evidence of overlapEvidence) {
    assert(evidence.before && evidence.after,
      `Layer-depth E2E: did not capture ${evidence.lowerId} painting over ${evidence.upperId}`);
    const changed = evidence.after.slice(0, 3).reduce((sum, channel, index) => (
      sum + Math.abs(channel - evidence.before[index])
    ), 0);
    const lowerDifference = evidence.after.slice(0, 3).reduce((sum, channel, index) => (
      sum + Math.abs(channel - evidence.lowerPixel[index])
    ), 0);
    assert(changed >= 24,
      `Layer-depth E2E: ${evidence.lowerId} did not visibly replace ${evidence.upperId} at ${evidence.x},${evidence.y}`);
    assert(lowerDifference <= 6,
      `Layer-depth E2E: overlap pixel does not match lower block ${evidence.lowerId} (${lowerDifference})`);
  }

  const state = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
  const canvasRect = await page.locator("canvas").boundingBox();
  assert(canvasRect, "Layer-depth E2E: canvas has no screen bounds");
  const toScreen = (logicalX, logicalY) => ({
    x: canvasRect.x + logicalX * canvasRect.width / 496,
    y: canvasRect.y + logicalY * canvasRect.height / 1078,
  });
  const cellPoint = (gridX, gridY, insetY = 0.5) => toScreen(
    state.board.innerX + (gridX + 0.5) * state.board.cell,
    state.board.innerY + (gridY + insetY) * state.board.cell,
  );
  const hitChecks = [
    { id: "orange-s-tetromino", point: cellPoint(2, 2, 0.08) },
    { id: "red-horizontal-2", point: cellPoint(1, 4, 0.08) },
    { id: "yellow-single", point: cellPoint(1, 5, 0.08) },
  ];
  for (const check of hitChecks) {
    await page.mouse.move(check.point.x, check.point.y);
    await page.mouse.down();
    const selectedId = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState().selectedId);
    await page.mouse.up();
    assert(selectedId === check.id,
      `Layer-depth E2E: visible lower block ${check.id} was not hit at its upper overlap edge (selected ${selectedId})`);
  }

  await page.screenshot({ path: screenshotPath });
  assert(browserErrors.length === 0, `Layer-depth E2E: browser errors: ${browserErrors.join(" | ")}`);

  const hashes = {};
  for (const asset of assets) {
    const source = resolve(root, "art-source/gameplay/blocks/formal-v1", asset.file);
    const runtime = resolve(root, "public/assets/art/gameplay/blocks/formal-v1", asset.file);
    const sourceHash = await sha256(source);
    const runtimeHash = await sha256(runtime);
    assert(sourceHash === runtimeHash, `Layer-depth E2E: ${asset.file} source/runtime bytes differ`);
    hashes[asset.id] = sourceHash;
  }

  await writeFile(reportPath, `${JSON.stringify({
    baseUrl,
    viewport,
    fixtureArrayOrder: [...expectedDrawOrder].reverse(),
    drawOrder,
    drawAudit,
    alignment: "bottom edge of the supplied sprite to the nominal occupied-cell bottom",
    rule: "smaller visual bottom first; lower blocks paint later and receive the overlap-edge hit",
    naturalSizes,
    overlapEvidence,
    hitChecks: hitChecks.map(({ id, point }) => ({ id, point })),
    hashes,
    screenshot: "01-four-supplied-blocks-depth.png",
    browserErrors,
  }, null, 2)}\n`);

  console.log(`Layer-depth playtest passed: ${drawOrder.join(" -> ")}; screenshot ${screenshotPath}`);
} finally {
  await browser.close();
}
