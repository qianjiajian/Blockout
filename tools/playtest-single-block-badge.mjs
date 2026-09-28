import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/", import.meta.url));
const shot = (name) => resolve(output, name);
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });

const COLORS = ["red", "blue", "green", "yellow", "purple", "orange", "pink", "cyan"];
const save = {
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
};

const browser = await chromium.launch({ headless: true });
const errors = [];
const loadedFormalBlocks = new Set();
const requestedLegacyPlainBlocks = new Set();
const observedFormalDraws = new Set();

const installDrawAudit = async (page) => {
  await page.addInitScript((initialSave) => {
    localStorage.setItem("color-escape-save-v1", JSON.stringify(initialSave));

    let frame = 0;
    const nativeRequestAnimationFrame = globalThis.requestAnimationFrame.bind(globalThis);
    globalThis.requestAnimationFrame = (callback) => nativeRequestAnimationFrame((time) => {
      frame += 1;
      callback(time);
    });

    const records = [];
    globalThis.__FORMAL_BLOCK_DRAW_AUDIT__ = records;
    globalThis.__clearFormalBlockDrawAudit = () => { records.length = 0; };
    const originalDrawImage = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function auditedDrawImage(image, ...args) {
      const src = String(image?.currentSrc || image?.src || "");
      const formal = src.includes("/assets/art/gameplay/blocks/formal-v1/");
      const layerPreview = src.includes("/assets/art/gameplay/mechanics/layer-preview-badges-v1.png");
      const legacyPlain = src.includes("-plain-v1.png");
      if (formal || layerPreview || legacyPlain) {
        const matrix = this.getTransform();
        records.push({
          type: formal ? "formal" : layerPreview ? "layer-preview" : "legacy-plain",
          frame,
          path: (() => {
            try { return new URL(src, location.href).pathname; } catch { return src; }
          })(),
          argumentCount: args.length + 1,
          naturalWidth: Number(image?.naturalWidth || image?.width || 0),
          naturalHeight: Number(image?.naturalHeight || image?.height || 0),
          matrix: { a: matrix.a, b: matrix.b, c: matrix.c, d: matrix.d },
        });
      }
      return originalDrawImage.call(this, image, ...args);
    };

    const originalFillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function auditedFillText(text, ...args) {
      if (["●", "◆", "▲", "■", "✦", "⬟", "♥", "✚"].includes(String(text))) {
        records.push({ type: "legacy-mark", frame, text: String(text) });
      }
      return originalFillText.call(this, text, ...args);
    };
  }, save);
};

const attachErrors = (page) => {
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    const pathname = new URL(response.url()).pathname;
    if (pathname.includes("/assets/art/gameplay/blocks/formal-v1/")) {
      loadedFormalBlocks.add(pathname.split("/").at(-1));
    }
    if (pathname.includes("-plain-v1.png")) requestedLegacyPlainBlocks.add(pathname);
  });
};

const createPage = async (viewport, deviceScaleFactor = 1) => {
  const page = await browser.newPage({ viewport, deviceScaleFactor });
  await installDrawAudit(page);
  attachErrors(page);
  await page.goto(playtestUrl, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready, undefined, { timeout: 15_000 });
  return page;
};

const debug = (page) => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const clearDrawAudit = (page) => page.evaluate(() => globalThis.__clearFormalBlockDrawAudit());
const latestFrameRecords = (page) => page.evaluate(() => {
  const records = globalThis.__FORMAL_BLOCK_DRAW_AUDIT__ ?? [];
  const latestFrame = records.reduce((maximum, record) => Math.max(maximum, record.frame ?? -1), -1);
  return records.filter((record) => record.frame === latestFrame);
});
const screenPoint = (page, point) => {
  const viewport = page.viewportSize();
  const scale = Math.min(viewport.width / 496, viewport.height / 1078);
  return {
    x: (viewport.width - 496 * scale) / 2 + point.x * scale,
    y: (viewport.height - 1078 * scale) / 2 + point.y * scale,
  };
};
const blockPoint = (page, state, block, x = block.x, y = block.y) => {
  const [dx, dy] = block.shape[0];
  return screenPoint(page, {
    x: state.board.innerX + (x + dx + 0.5) * state.board.cell,
    y: state.board.innerY + (y + dy + 0.5) * state.board.cell,
  });
};

const openLevel = async (page, levelId) => {
  await clearDrawAudit(page);
  await page.evaluate((id) => window.__COLOR_ESCAPE__.loadLevel(id, true), levelId);
  await page.waitForFunction((id) => {
    const state = window.__COLOR_ESCAPE__?.getDebugState();
    return state?.screen === "playing" && state.level.id === id
      && !state.art.formalGameplay.requestedBlockSignature;
  }, levelId, { timeout: 10_000 });
  await page.waitForTimeout(160);
  const state = await debug(page);
  const formal = state.art.formalGameplay;
  if (state.art.loadError || formal.blockError || !formal.uiReady || !formal.floorReady
    || !formal.iceCellReady || !formal.selectionFrameReady || !formal.blockSignature
    || formal.dynamicImages <= 0 || formal.exactWholeBlockCoverage <= 0) {
    throw new Error(`Formal-block E2E: invalid art state at Lv${levelId}: ${JSON.stringify(formal)}`);
  }
  return state;
};

const assertNaturalFormalDraws = (records, label, requirements = {}) => {
  const formal = records.filter((record) => record.type === "formal");
  if (!formal.length) throw new Error(`Formal-block E2E: no formal block draw at ${label}`);
  let singles = 0;
  let wholes = 0;
  let shells = 0;
  for (const record of formal) {
    observedFormalDraws.add(record.path);
    if (!(record.naturalWidth > 0 && record.naturalHeight > 0) || record.argumentCount !== 3) {
      throw new Error(`Formal-block E2E: ${record.path} was not drawn at native bitmap size at ${label}`);
    }
    const { a, b, c, d } = record.matrix;
    const xScale = Math.hypot(a, b);
    const yScale = Math.hypot(c, d);
    const tolerance = Math.max(1e-6, Math.max(xScale, yScale) * 1e-5);
    if (Math.abs(xScale - yScale) > tolerance || Math.abs(a * c + b * d) > Math.max(1e-6, xScale * yScale * 1e-5)) {
      throw new Error(`Formal-block E2E: ${record.path} received non-uniform scale/shear at ${label}`);
    }
    const filename = record.path.split("/").at(-1);
    if (filename.includes("-shell-")) shells += 1;
    else if (filename.endsWith("-single.png")) singles += 1;
    else wholes += 1;
  }
  if (requirements.single && singles === 0) throw new Error(`Formal-block E2E: no formal single-cell draw at ${label}`);
  if (requirements.whole && wholes === 0) throw new Error(`Formal-block E2E: no formal whole-piece draw at ${label}`);
  if (requirements.shell && shells === 0) throw new Error(`Formal-block E2E: no formal shell draw at ${label}`);
  return { singles, wholes, shells };
};

const findMovableConcaveFixture = (page) => page.evaluate(async () => {
  const [{ getLevelStrict }, { PuzzleModel }] = await Promise.all([
    import("/src/core/levels.ts"),
    import("/src/core/PuzzleModel.ts"),
  ]);
  const level = getLevelStrict(3);
  const directions = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  for (const authored of level.blocks) {
    const xs = authored.shape.map(([x]) => x);
    const ys = authored.shape.map(([, y]) => y);
    const concave = (Math.max(...xs) - Math.min(...xs) + 1) * (Math.max(...ys) - Math.min(...ys) + 1) > authored.shape.length;
    if (!concave) continue;
    for (const [dx, dy] of directions) {
      const model = new PuzzleModel(level);
      const block = model.getBlock(authored.id);
      if (!block || !model.isBlockActive(block) || model.possibleExitSides(block).length > 0
        || !model.moveBlockStep(block.id, block.x + dx, block.y + dy)) continue;
      if (model.possibleExitSides(block).length === 0) return { blockId: block.id, dx, dy };
    }
  }
  throw new Error("Formal-block E2E: Lv3 has no movable concave fixture");
});

const assertWholeObjectMove = async (page, state, fixture) => {
  const beforeBlock = state.puzzle.blocks.find((block) => block.id === fixture.blockId);
  if (!beforeBlock) throw new Error(`Formal-block E2E: missing concave fixture ${fixture.blockId}`);
  const beforeOthers = new Map(state.puzzle.blocks.map((block) => [block.id, { x: block.x, y: block.y }]));
  const start = blockPoint(page, state, beforeBlock);
  const target = blockPoint(page, state, beforeBlock, beforeBlock.x + fixture.dx, beforeBlock.y + fixture.dy);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.waitForFunction((id) => window.__COLOR_ESCAPE__?.getDebugState().selectedId === id, fixture.blockId, { timeout: 2_000 });
  await page.mouse.move(target.x, target.y, { steps: 6 });
  await page.waitForFunction(({ id, x, y }) => {
    const block = window.__COLOR_ESCAPE__?.getDebugState().puzzle.blocks.find((candidate) => candidate.id === id);
    return block?.x === x && block?.y === y;
  }, { id: fixture.blockId, x: beforeBlock.x + fixture.dx, y: beforeBlock.y + fixture.dy }, { timeout: 2_000 });
  const held = await debug(page);
  const moved = held.puzzle.blocks.find((block) => block.id === fixture.blockId);
  if (!moved || held.selectedId !== fixture.blockId || held.puzzle.blocks.length !== state.puzzle.blocks.length
    || moved.x !== beforeBlock.x + fixture.dx || moved.y !== beforeBlock.y + fixture.dy
    || JSON.stringify(moved.shape) !== JSON.stringify(beforeBlock.shape)) {
    throw new Error(`Formal-block E2E: concave block did not move as one unchanged object: ${JSON.stringify(moved)}`);
  }
  for (const other of held.puzzle.blocks) {
    if (other.id === fixture.blockId) continue;
    const before = beforeOthers.get(other.id);
    if (!before || before.x !== other.x || before.y !== other.y) {
      throw new Error(`Formal-block E2E: dragging ${fixture.blockId} displaced ${other.id}`);
    }
  }
  await page.screenshot({ path: shot("round45-formal-block-selected-and-moved.png") });
  await page.mouse.up();
  await page.waitForTimeout(120);
};

const findShellFixture = (page) => page.evaluate(async () => {
  const { matchFormalBlockShape } = await import("/src/game/formalBlockShapes.ts");
  const state = window.__COLOR_ESCAPE__.getDebugState();
  const shellShapeIds = new Set([1, 2, 3, 7, 8, 9]);
  const visible = state.puzzle.blocks.filter((block) => (
    !block.shutterId || (state.puzzle.shutters.find((shutter) => shutter.id === block.shutterId)?.count ?? 0) <= 0
  ));
  const unsupportedLayered = visible.filter((block) => {
    if (block.layers.length <= 1) return false;
    const match = matchFormalBlockShape(block.shape);
    return !match || !shellShapeIds.has(match.shapeId);
  });
  const block = visible.find((candidate) => {
    if (candidate.layers.length <= 1 || candidate.frozen > 0) return false;
    const match = matchFormalBlockShape(candidate.shape);
    return match && shellShapeIds.has(match.shapeId);
  });
  if (!block) throw new Error("Formal-block E2E: Lv15 has no active formal shell fixture");
  return { block, unsupportedLayered: unsupportedLayered.map((candidate) => candidate.id) };
});

const assertShellHitWithoutLegacyBadge = async (page, state) => {
  const fixture = await findShellFixture(page);
  if (fixture.unsupportedLayered.length) {
    throw new Error(`Formal-block E2E: Lv15 shell fixture is contaminated by unsupported layered blocks: ${fixture.unsupportedLayered}`);
  }
  await clearDrawAudit(page);
  const point = blockPoint(page, state, fixture.block);
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.waitForFunction((id) => window.__COLOR_ESCAPE__?.getDebugState().selectedId === id, fixture.block.id, { timeout: 2_000 });
  await page.waitForTimeout(120);
  const held = await debug(page);
  if (held.selectedId !== fixture.block.id || held.puzzle.blocks.filter((block) => block.id === fixture.block.id).length !== 1) {
    throw new Error(`Formal-block E2E: shell hit did not select exactly one object (${fixture.block.id})`);
  }
  const records = await latestFrameRecords(page);
  const counts = assertNaturalFormalDraws(records, "selected Lv15 shell", { shell: true });
  if (records.some((record) => record.type === "layer-preview" || record.type === "legacy-mark" || record.type === "legacy-plain")) {
    throw new Error("Formal-block E2E: supported outer shell duplicated an old badge/plain treatment");
  }
  const expectedShellPrefix = `${fixture.block.layers[0]}-shell-`;
  if (!records.some((record) => record.type === "formal" && record.path.split("/").at(-1).startsWith(expectedShellPrefix))) {
    throw new Error(`Formal-block E2E: selected shell did not use its outer color (${expectedShellPrefix})`);
  }
  await page.screenshot({ path: shot("round45-formal-shell-selected-level-015.png") });
  await page.mouse.up();
  await page.waitForTimeout(100);
  return { blockId: fixture.block.id, ...counts };
};

const installOneCellTwoColorFixture = (page) => page.evaluate(async () => {
  const { PuzzleModel } = await import("/src/core/PuzzleModel.ts");
  const fixture = {
    id: 15,
    name: "E2E one-cell two-color shell",
    difficulty: "normal",
    timeSeconds: 180,
    reward: 0,
    parMoves: 2,
    width: 3,
    height: 3,
    gates: [
      { id: "orange-top", side: "top", offset: 1, size: 1, color: "orange" },
      { id: "cyan-bottom", side: "bottom", offset: 1, size: 1, color: "cyan" },
    ],
    blocks: [{
      id: "orange-over-cyan-single",
      x: 1,
      y: 1,
      shape: [[0, 0]],
      color: "orange",
      layers: ["orange", "cyan"],
    }],
  };
  const game = window.__COLOR_ESCAPE__;
  game.model = new PuzzleModel(fixture);
  game.screen = "playing";
  game.formalBlockArtSignature = "";
  game.formalBlockArtRequestSignature = undefined;
  game.formalBlockArtFailedSignature = undefined;
  game.ensureFormalBlockArtForCurrentLevel();
  game.dirty = true;
  game.scheduleFrame();
});

const assertOneCellTwoColorComposition = async (page) => {
  await clearDrawAudit(page);
  await installOneCellTwoColorFixture(page);
  await page.waitForFunction(() => {
    const state = window.__COLOR_ESCAPE__?.getDebugState();
    return state?.screen === "playing"
      && state.level.id === 15
      && state.art.formalGameplay.blockSignature === "shell:orange:1"
      && !state.art.formalGameplay.requestedBlockSignature;
  }, undefined, { timeout: 10_000 });
  await page.waitForTimeout(160);
  const state = await debug(page);
  const records = await latestFrameRecords(page);
  const counts = assertNaturalFormalDraws(records, "one-cell two-color fixture", { single: true, shell: true });
  const formal = records.filter((record) => record.type === "formal");
  const innerIndexes = formal.flatMap((record, index) => (
    record.path.endsWith("/cyan-single.png") ? [index] : []
  ));
  const outerIndexes = formal.flatMap((record, index) => (
    record.path.endsWith("/orange-shell-single.png") ? [index] : []
  ));
  if (innerIndexes.length !== 1 || outerIndexes.length !== 1 || innerIndexes[0] >= outerIndexes[0]) {
    throw new Error(
      `Formal-block E2E: one-cell two-color composition must draw inner cyan single before outer orange shell: ${JSON.stringify(formal)}`,
    );
  }
  if (records.some((record) => record.type === "layer-preview" || record.type === "legacy-mark" || record.type === "legacy-plain")) {
    throw new Error("Formal-block E2E: one-cell two-color shell retained the old corner badge/plain treatment");
  }
  if (state.art.formalGameplay.blockSignature !== "shell:orange:1"
    || state.art.formalGameplay.dynamicImages !== 1) {
    throw new Error(`Formal-block E2E: one-cell shell was not the sole dynamic request: ${JSON.stringify(state.art.formalGameplay)}`);
  }
  await page.screenshot({ path: shot("round141-formal-one-cell-two-color-shell.png") });
  return counts;
};

const setGrayscale = async (page) => {
  await page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    if (!canvas) throw new Error("Formal-block E2E: game canvas missing");
    canvas.style.filter = "grayscale(1) contrast(1.12)";
  });
  const filter = await page.locator("canvas").evaluate((canvas) => getComputedStyle(canvas).filter);
  if (!filter.includes("grayscale(1)")) throw new Error(`Formal-block E2E: grayscale filter was not active (${filter})`);
};

const findLayerPeelRoute = (page) => page.evaluate(async () => {
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
    const before = model.getBlock(drag.blockId)?.layers.length ?? 0;
    model.beginAction();
    for (const [x, y] of drag.path) model.moveBlockStep(drag.blockId, x, y);
    if (drag.exitSide) model.tryExit(drag.blockId, drag.exitSide);
    model.commitAction();
    prefix.push(drag);
    const after = model.getBlock(drag.blockId)?.layers.length ?? 0;
    if (after > 0 && after < before) return { blockId: drag.blockId, route: prefix };
  }
  throw new Error("Formal-block E2E: Lv15 validation route never peels a layered block");
});

const replayRoute = async (page, route) => {
  for (const [dragIndex, drag] of route.entries()) {
    const latest = await debug(page);
    const block = latest.puzzle.blocks.find((candidate) => candidate.id === drag.blockId);
    if (!block) throw new Error(`Formal-block E2E: missing route block ${drag.blockId}`);
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
        throw new Error(`Formal-block E2E: ${drag.blockId} did not resolve while the pointer stayed down`);
      }
    }
    await page.mouse.up();
    await page.waitForTimeout(dragIndex === route.length - 1 ? 220 : 700);
  }
};

const page = await createPage({ width: 496, height: 1078 });
let state = await openLevel(page, 1);
let records = await latestFrameRecords(page);
assertNaturalFormalDraws(records, "Lv1", { whole: true });
await page.screenshot({ path: shot("round45-formal-block-level-001.png") });

state = await openLevel(page, 3);
records = await latestFrameRecords(page);
assertNaturalFormalDraws(records, "Lv3", { whole: true });
const concaveFixture = await findMovableConcaveFixture(page);
await assertWholeObjectMove(page, state, concaveFixture);

state = await openLevel(page, 15);
const shellSelection = await assertShellHitWithoutLegacyBadge(page, state);

state = await openLevel(page, 15);
records = await latestFrameRecords(page);
assertNaturalFormalDraws(records, "layered Lv15", { whole: true, shell: true });
await page.screenshot({ path: shot("round45-formal-block-layered-level-015.png") });
await setGrayscale(page);
await page.waitForTimeout(80);
await page.screenshot({ path: shot("round45-formal-block-layered-grayscale.png") });

const peel = await findLayerPeelRoute(page);
const beforePeel = state.puzzle.blocks.find((block) => block.id === peel.blockId);
if (!beforePeel || beforePeel.layers.length < 2) throw new Error(`Formal-block E2E: layered peel target missing (${peel.blockId})`);
await replayRoute(page, peel.route);
state = await debug(page);
const peeled = state.puzzle.blocks.find((block) => block.id === peel.blockId);
if (!peeled || peeled.layers.length !== beforePeel.layers.length - 1) {
  throw new Error(`Formal-block E2E: real Pointer peel did not expose one layer on ${peel.blockId}`);
}
await page.screenshot({ path: shot("round45-formal-block-layer-peel-grayscale.png") });
await page.close();

const oneCellTwoColorPage = await createPage({ width: 496, height: 1078 });
const oneCellTwoColor = await assertOneCellTwoColorComposition(oneCellTwoColorPage);
await oneCellTwoColorPage.close();

const release = await createPage({ width: 720, height: 1584 }, 2);
state = await openLevel(release, 15);
records = await latestFrameRecords(release);
assertNaturalFormalDraws(records, "Lv15 at 720x1584 DPR2", { whole: true, shell: true });
const releaseCanvas = await release.locator("canvas").evaluate((canvas) => ({
  cssWidth: canvas.getBoundingClientRect().width,
  cssHeight: canvas.getBoundingClientRect().height,
  pixelWidth: canvas.width,
  pixelHeight: canvas.height,
}));
if (releaseCanvas.cssWidth !== 720 || releaseCanvas.cssHeight !== 1584
  || releaseCanvas.pixelWidth !== 1440 || releaseCanvas.pixelHeight !== 3168) {
  throw new Error(`Formal-block E2E: invalid 720x1584 DPR2 canvas ${JSON.stringify(releaseCanvas)}`);
}
await release.screenshot({ path: shot("round73-art-density-layered-720x1584.png") });
await release.close();

const small = await createPage({ width: 320, height: 568 });
state = await openLevel(small, 98);
records = await latestFrameRecords(small);
const lateWhole = assertNaturalFormalDraws(records, "Lv98 at 320x568", { whole: true });
if (state.art.formalGameplay.exactWholeBlockCoverage !== state.art.formalGameplay.totalBlocks
  || state.art.formalGameplay.loadedWholeBlockCoverage !== state.art.formalGameplay.totalBlocks
  || state.art.formalGameplay.missingWholeBlockIds.length) {
  throw new Error(`Formal-block E2E: Lv98 does not have complete whole-sprite coverage: ${JSON.stringify(state.art.formalGameplay)}`);
}
if (!records.some((record) => record.path.endsWith("/pink-plus-pentomino.png"))) {
  throw new Error("Formal-block E2E: Lv98 did not draw its dedicated pink plus-pentomino sprite");
}
await small.screenshot({ path: shot("round45-formal-block-level-098-320x568.png") });
await small.close();

for (const color of COLORS) {
  const asset = `${color}-single.png`;
  if (!loadedFormalBlocks.has(asset)) throw new Error(`Formal-block E2E: permanent formal single asset did not load: ${asset}`);
}
if (![...loadedFormalBlocks].some((asset) => !asset.includes("-shell-") && !asset.endsWith("-single.png"))) {
  throw new Error("Formal-block E2E: no formal whole-piece asset loaded");
}
if (![...loadedFormalBlocks].some((asset) => asset.includes("-shell-"))) {
  throw new Error("Formal-block E2E: no formal shell asset loaded");
}
if (requestedLegacyPlainBlocks.size || [...observedFormalDraws].some((path) => path.includes("-plain-v1.png"))) {
  throw new Error(`Formal-block E2E: legacy plain art was requested/drawn: ${[...requestedLegacyPlainBlocks]}`);
}

await browser.close();
if (errors.length) throw new Error(`Formal-block browser errors:\n${errors.join("\n")}`);
console.log(
  `Formal block rendering PASS: singles/whole/shell loaded, ${concaveFixture.blockId} moved as one object, `
  + `${shellSelection.blockId} selected without a legacy badge, ${peel.blockId} peeled by Pointer, `
  + `one-cell inner→outer composition ${oneCellTwoColor.singles}/${oneCellTwoColor.shells}, `
  + `${lateWhole.wholes} Lv98 whole-piece draws, grayscale/DPR2/320x568 passed.`,
);
