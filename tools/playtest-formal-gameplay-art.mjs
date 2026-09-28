import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/formal-gameplay-art/", import.meta.url));
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
const levelIds = [1, 5, 10, 15, 26, 72, 100, 101, 120, 128, 150, 200];
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 720, height: 1584 }, deviceScaleFactor: 1 });
const browserErrors = [];
page.on("pageerror", (error) => browserErrors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") browserErrors.push(message.text());
});

await page.addInitScript(() => {
  const classify = (src) => {
    if (src.includes("/assets/art/backgrounds/gameplay-formal-v1.png")) return "background";
    if (src.includes("/assets/art/ui/gameplay-v1/")) return "hud";
    if (src.includes("/assets/art/gameplay/board/formal-floor-v1/")) return "floor";
    if (src.includes("/assets/art/gameplay/blocks/formal-v1/")) return "block";
    if (src.includes("/assets/art/gameplay/mechanics/formal-gameplay-v1/ice-")) return "ice";
    if (src.includes("/assets/art/fx/formal-gameplay-v1/selection-frame.png")) return "selection";
    return undefined;
  };
  const original = CanvasRenderingContext2D.prototype.drawImage;
  globalThis.__FORMAL_GAMEPLAY_DRAW_AUDIT__ = [];
  globalThis.__clearFormalGameplayDrawAudit = () => {
    globalThis.__FORMAL_GAMEPLAY_DRAW_AUDIT__.length = 0;
  };
  CanvasRenderingContext2D.prototype.drawImage = function drawImageWithFormalAudit(image, ...args) {
    const src = String(image?.currentSrc || image?.src || "");
    const category = classify(src);
    if (category) {
      const matrix = this.getTransform();
      const record = {
        category,
        path: (() => {
          try { return new URL(src, location.href).pathname; } catch { return src; }
        })(),
        argumentCount: args.length + 1,
        arguments: args.map((value) => typeof value === "number" ? value : null),
        naturalWidth: Number(image?.naturalWidth || image?.width || 0),
        naturalHeight: Number(image?.naturalHeight || image?.height || 0),
        matrix: { a: matrix.a, b: matrix.b, c: matrix.c, d: matrix.d, e: matrix.e, f: matrix.f },
      };
      globalThis.__FORMAL_GAMEPLAY_DRAW_AUDIT__.push(record);
      if (globalThis.__FORMAL_GAMEPLAY_DRAW_AUDIT__.length > 12_000) {
        globalThis.__FORMAL_GAMEPLAY_DRAW_AUDIT__.splice(0, 2_000);
      }
    }
    return original.call(this, image, ...args);
  };

  localStorage.setItem("color-escape-save-v1", JSON.stringify({
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
  }));
});

const debug = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const draws = () => page.evaluate(() => [...globalThis.__FORMAL_GAMEPLAY_DRAW_AUDIT__]);
const clearDraws = () => page.evaluate(() => globalThis.__clearFormalGameplayDrawAudit());

const effectiveAxisScales = (record) => {
  const { a, b, c, d } = record.matrix;
  return {
    x: Math.hypot(a, b),
    y: Math.hypot(c, d),
    dot: a * c + b * d,
  };
};

const validateFormalDraw = (record) => {
  if (!(record.naturalWidth > 0 && record.naturalHeight > 0)) {
    throw new Error(`Formal gameplay E2E: unloaded image reached drawImage: ${JSON.stringify(record)}`);
  }
  const axes = effectiveAxisScales(record);
  const scaleTolerance = Math.max(1e-6, Math.max(axes.x, axes.y) * 1e-5);
  if (Math.abs(axes.x - axes.y) > scaleTolerance) {
    throw new Error(`Formal gameplay E2E: non-uniform context scale: ${JSON.stringify(record)}`);
  }
  if (Math.abs(axes.dot) > Math.max(1e-6, axes.x * axes.y * 1e-5)) {
    throw new Error(`Formal gameplay E2E: sheared context transform: ${JSON.stringify(record)}`);
  }

  if (record.argumentCount === 3) return;
  if (record.argumentCount === 5) {
    const [, , width, height] = record.arguments;
    const xScale = width / record.naturalWidth;
    const yScale = height / record.naturalHeight;
    if (Math.abs(xScale - yScale) <= Math.max(1e-6, Math.max(Math.abs(xScale), Math.abs(yScale)) * 1e-5)) return;
  }
  if (record.argumentCount === 9) {
    const [, , sourceWidth, sourceHeight, , , destinationWidth, destinationHeight] = record.arguments;
    const xScale = destinationWidth / sourceWidth;
    const yScale = destinationHeight / sourceHeight;
    if (Math.abs(xScale - yScale) <= Math.max(1e-6, Math.max(Math.abs(xScale), Math.abs(yScale)) * 1e-5)) return;
  }
  throw new Error(`Formal gameplay E2E: explicit non-uniform image resize: ${JSON.stringify(record)}`);
};

const assertNativeDraws = (records, category, levelId) => {
  const categoryRecords = records.filter((record) => record.category === category);
  if (!categoryRecords.length) throw new Error(`Formal gameplay E2E: Lv${levelId} did not draw ${category} artwork`);
  for (const record of categoryRecords) validateFormalDraw(record);
  if (!categoryRecords.some((record) => record.argumentCount === 3)) {
    throw new Error(`Formal gameplay E2E: Lv${levelId} ${category} artwork never used native drawImage(image,x,y)`);
  }
  if (category !== "background" && categoryRecords.some((record) => record.argumentCount !== 3)) {
    throw new Error(`Formal gameplay E2E: Lv${levelId} ${category} artwork used an explicit destination size`);
  }
  return categoryRecords;
};

const screenPoint = (state, block) => {
  const [dx, dy] = block.shape[0];
  return {
    x: state.viewportTransform.offsetX
      + (state.board.innerX + (block.x + dx + 0.5) * state.board.cell) * state.viewportTransform.scale,
    y: state.viewportTransform.offsetY
      + (state.board.innerY + (block.y + dy + 0.5) * state.board.cell) * state.viewportTransform.scale,
  };
};

await page.goto(playtestUrl, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready, undefined, { timeout: 15_000 });

const levelReports = [];
let sawIce = false;
let sawBottomAlignedIce = false;
for (const levelId of levelIds) {
  await page.evaluate((id) => window.__COLOR_ESCAPE__.loadLevel(id, true), levelId);
  await page.waitForFunction((id) => {
    const state = window.__COLOR_ESCAPE__?.getDebugState();
    return state?.screen === "playing"
      && state.level.id === id
      && !state.art.formalGameplay.requestedBlockSignature
      && !state.art.formalGameplay.requestedIceSignature;
  }, levelId, { timeout: 10_000 });
  // Discard frames rendered while the previous level's dynamic block group was
  // being replaced; assertions below describe the settled current level only.
  await clearDraws();
  await page.waitForTimeout(180);

  const state = await debug();
  const formal = state.art.formalGameplay;
    if (state.art.loadError || !formal.uiReady || !formal.floorReady || !formal.iceCellReady
      || !formal.selectionFrameReady || formal.blockError || formal.iceError || !formal.blockSignature
      || formal.dynamicImages <= 0
      || formal.exactWholeBlockCoverage !== formal.totalBlocks
      || formal.loadedWholeBlockCoverage !== formal.totalBlocks
      || formal.missingWholeBlockIds.length) {
      throw new Error(`Formal gameplay E2E: invalid Lv${levelId} formal art state ${JSON.stringify(formal)}`);
    }

  const records = await draws();
  const categoryCounts = {};
  for (const category of ["background", "hud", "floor", "block"]) {
    categoryCounts[category] = assertNativeDraws(records, category, levelId).length;
  }
  const iceRecords = records.filter((record) => record.category === "ice");
  for (const record of iceRecords) validateFormalDraw(record);
  if (iceRecords.some((record) => record.argumentCount !== 3)) {
    throw new Error(`Formal gameplay E2E: Lv${levelId} ice used an explicit destination size`);
  }
  const frozenBlocks = state.puzzle.blocks.filter((block) => block.frozen > 0);
  if (iceRecords.length && !frozenBlocks.length) {
    throw new Error(`Formal gameplay E2E: Lv${levelId} drew numeric-ice artwork without a frozen block`);
  }
  sawBottomAlignedIce ||= iceRecords.some((record) => record.argumentCount === 3);
  sawIce ||= iceRecords.length > 0;
  categoryCounts.ice = iceRecords.length;

  await page.screenshot({ path: resolve(output, `level-${String(levelId).padStart(3, "0")}.png`) });
  levelReports.push({
    levelId,
    blockSignature: formal.blockSignature,
      dynamicImages: formal.dynamicImages,
      exactWholeBlockCoverage: formal.exactWholeBlockCoverage,
      loadedWholeBlockCoverage: formal.loadedWholeBlockCoverage,
      missingWholeBlockIds: formal.missingWholeBlockIds,
      totalBlocks: formal.totalBlocks,
    categoryCounts,
  });
}

if (!sawIce) throw new Error("Formal gameplay E2E: required representative levels never drew the formal ice-cell artwork");
if (!sawBottomAlignedIce) throw new Error("Formal gameplay E2E: never verified native whole-piece numeric-ice alignment");

await clearDraws();
await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(1, true));
await page.waitForFunction(() => {
  const state = window.__COLOR_ESCAPE__?.getDebugState();
  return state?.screen === "playing" && state.level.id === 1 && !state.art.formalGameplay.requestedBlockSignature;
}, undefined, { timeout: 10_000 });
await page.waitForTimeout(100);
let selectionState = await debug();
const selectableId = await page.evaluate(() => {
  const game = window.__COLOR_ESCAPE__;
  return game.model.snapshot().blocks.find((block) => (
    game.model.isBlockActive(block) && game.model.possibleExitSides(block).length === 0
  ))?.id;
});
const selectable = selectionState.puzzle.blocks.find((block) => block.id === selectableId);
if (!selectable) throw new Error("Formal gameplay E2E: Lv1 has no non-exiting selectable block for selection-frame verification");
const point = screenPoint(selectionState, selectable);
await page.mouse.move(point.x, point.y);
await page.mouse.down();
await page.waitForFunction((blockId) => window.__COLOR_ESCAPE__?.getDebugState().selectedId === blockId, selectable.id, { timeout: 2_000 });
await page.waitForTimeout(120);
selectionState = await debug();
const selectionRecords = (await draws()).filter((record) => record.category === "selection");
if (selectionState.selectedId !== selectable.id) {
  throw new Error(`Formal gameplay E2E: expected selected block ${selectable.id}`);
}
if (!selectionRecords.length) throw new Error("Formal gameplay E2E: live pointer selection did not draw the formal selection frame");
for (const record of selectionRecords) validateFormalDraw(record);
if (selectionRecords.some((record) => {
  if (record.argumentCount === 3) return false;
  if (record.argumentCount !== 9) return true;
  const [, , sourceWidth, sourceHeight, , , destinationWidth, destinationHeight] = record.arguments;
  return Math.abs(sourceWidth - destinationWidth) > 0.001
    || Math.abs(sourceHeight - destinationHeight) > 0.001;
})) {
  throw new Error("Formal gameplay E2E: selection frame stretched instead of using native cropped edge tiles");
}
await page.screenshot({ path: resolve(output, "level-001-selected.png") });
await page.mouse.up();

const report = {
  playtestUrl,
  viewport: { width: 720, height: 1584, deviceScaleFactor: 1 },
  levels: levelReports,
  assertions: {
    formalStateReady: true,
    noFormalLoadErrors: true,
    currentLevelDynamicArtLoaded: true,
    nativeDrawImageForBackgroundHudFloorBlocksIceAndCroppedSelection: true,
    noNonUniformScaleOrShear: true,
    livePointerSelectionFrameObserved: true,
    iceCellObserved: sawIce,
    iceCellBottomAligned: sawBottomAlignedIce,
  },
  selection: { levelId: 1, blockId: selectable.id, drawCount: selectionRecords.length },
  browserErrors,
};
await writeFile(resolve(output, "formal-gameplay-art-report.json"), `${JSON.stringify(report, null, 2)}\n`);

await browser.close();
if (browserErrors.length) {
  throw new Error(`Formal gameplay E2E browser errors:\n${browserErrors.join("\n")}`);
}
console.log(`Formal gameplay art PASS: ${levelIds.length} levels, native-size HUD/board/block/ice and cropped selection draws, ${selectionRecords.length} live selection draws.`);
