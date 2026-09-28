import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const rootPath = fileURLToPath(new URL("../playtest-results/", import.meta.url));
const shot = (name) => resolve(rootPath, name);
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(rootPath, { recursive: true });

const FORMAL_PATH = "/assets/art/gameplay/blocks/formal-v1/";
const REPRESENTATIVE_LEVELS = [
  { id: 2, role: "supported-solid", expectedDraw: /-square-2x2\.png$/ },
  { id: 15, role: "supported-shell", expectedDraw: /red-shell-square-2x2\.png$/ },
  { id: 14, role: "generated-rectangle", expectedDraw: /purple-rectangle-2x3\.png$/ },
  { id: 32, role: "generated-layered-l", expectedDraw: /purple-l-tetromino\.png$/ },
  { id: 35, role: "generated-z", expectedRequest: /red-z-tetromino\.png$/ },
  { id: 98, role: "generated-plus", expectedDraw: /pink-plus-pentomino\.png$/ },
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 496, height: 1078 } });
const errors = [];
const requestedFormalAssets = new Set();
const requestedLegacyConnectors = new Set();

page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));
page.on("request", (request) => {
  const pathname = new URL(request.url()).pathname;
  const name = pathname.split("/").at(-1);
  if (pathname.includes(FORMAL_PATH)) requestedFormalAssets.add(name);
  if (pathname.includes("-connector-v1.png")) requestedLegacyConnectors.add(name);
});
page.on("response", (response) => {
  if (response.url().includes(FORMAL_PATH) && response.status() >= 400) {
    errors.push(`Formal block request failed (${response.status()}): ${response.url()}`);
  }
});

await page.addInitScript(({ formalPath }) => {
  window.__FORMAL_BLOCK_DRAWS__ = [];
  window.__BLOCK_UNITY_LEVEL__ = 0;
  const original = CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage = function patchedDrawImage(image, ...args) {
    const source = typeof image?.src === "string" ? image.src : "";
    if (source.includes(formalPath) && window.__FORMAL_BLOCK_DRAWS__.length < 20_000) {
      const transform = this.getTransform();
      window.__FORMAL_BLOCK_DRAWS__.push({
        levelId: window.__BLOCK_UNITY_LEVEL__,
        name: new URL(source).pathname.split("/").at(-1),
        naturalWidth: image.naturalWidth || image.width,
        naturalHeight: image.naturalHeight || image.height,
        args,
        transform: [transform.a, transform.b, transform.c, transform.d],
      });
    }
    return original.call(this, image, ...args);
  };
}, { formalPath: FORMAL_PATH });

await page.goto(playtestUrl, { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle" });
await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready, undefined, { timeout: 8_000 });

const loadAndCaptureSteadyFrame = async ({ id, role }) => {
  await page.evaluate((levelId) => {
    window.__BLOCK_UNITY_LEVEL__ = levelId;
    window.__COLOR_ESCAPE__.loadLevel(levelId, true);
  }, id);
  await page.waitForFunction((levelId) => {
    const debug = window.__COLOR_ESCAPE__?.getDebugState();
    return debug?.puzzle.levelId === levelId
      && debug.art.ready
      && !debug.art.formalGameplay.requestedBlockSignature;
  }, id, { timeout: 8_000 });
  // Request completion marks the next render dirty. Give that render one
  // frame, then audit a same-level reload with the fully-loaded art map.
  await page.waitForTimeout(100);
  const before = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
  await page.evaluate((levelId) => {
    window.__FORMAL_BLOCK_DRAWS__ = [];
    window.__BLOCK_UNITY_LEVEL__ = levelId;
    window.__COLOR_ESCAPE__.loadLevel(levelId, true);
  }, id);
  await page.waitForTimeout(140);
  const draws = await page.evaluate((levelId) => window.__FORMAL_BLOCK_DRAWS__
    .filter((draw) => draw.levelId === levelId), id);
  const after = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
  if (after.puzzle.levelId !== id || after.art.formalGameplay.requestedBlockSignature) {
    throw new Error(`Block unity: ${role} Lv${id} did not reach a stable formal-art frame`);
  }
  await page.screenshot({ path: shot(`round118-block-unity-${role}-level-${String(id).padStart(3, "0")}.png`) });
  return { before, after, draws };
};

const captures = new Map();
for (const representative of REPRESENTATIVE_LEVELS) {
  const capture = await loadAndCaptureSteadyFrame(representative);
  captures.set(representative.id, capture);

  if (!capture.draws.length) {
    throw new Error(`Block unity: ${representative.role} Lv${representative.id} drew no formal-v1 assets`);
  }
  if (representative.expectedDraw
    && !capture.draws.some((draw) => representative.expectedDraw.test(draw.name))) {
    throw new Error(
      `Block unity: ${representative.role} Lv${representative.id} did not draw ${representative.expectedDraw}; `
      + `observed=${[...new Set(capture.draws.map((draw) => draw.name))].join(",")}`,
    );
  }
  if (representative.expectedRequest
    && ![...requestedFormalAssets].some((name) => representative.expectedRequest.test(name))) {
    throw new Error(
      `Block unity: ${representative.role} Lv${representative.id} did not request ${representative.expectedRequest}; `
      + `requested=${[...requestedFormalAssets].join(",")}`,
    );
  }
  const formal = capture.after.art.formalGameplay;
  if (formal.exactWholeBlockCoverage !== formal.totalBlocks
    || formal.loadedWholeBlockCoverage !== formal.totalBlocks
    || formal.missingWholeBlockIds.length) {
    throw new Error(
      `Block unity: ${representative.role} Lv${representative.id} lacks whole-sprite coverage `
      + JSON.stringify(formal),
    );
  }
}

const allDraws = [...captures.values()].flatMap((capture) => capture.draws);
for (const draw of allDraws) {
  // Formal sprites always use their intrinsic bitmap dimensions. Board and
  // viewport adaptation belong exclusively to the surrounding canvas matrix.
  if (draw.args.length !== 2) {
    throw new Error(`Block unity: ${draw.name} used a resized/cropped drawImage overload (${draw.args.length + 1} args)`);
  }
  if (!(draw.naturalWidth > 0 && draw.naturalHeight > 0)) {
    throw new Error(`Block unity: ${draw.name} has invalid natural dimensions ${draw.naturalWidth}x${draw.naturalHeight}`);
  }

  const [a, b, c, d] = draw.transform;
  const scaleX = Math.hypot(a, b);
  const scaleY = Math.hypot(c, d);
  const dot = a * c + b * d;
  const determinant = a * d - b * c;
  const tolerance = Math.max(scaleX, scaleY, 1) * 0.0001;
  if (Math.abs(scaleX - scaleY) > tolerance || Math.abs(dot) > tolerance) {
    throw new Error(`Block unity: ${draw.name} used a non-uniform/skewed transform ${a},${b},${c},${d}`);
  }
  if (determinant <= 0) {
    throw new Error(`Block unity: ${draw.name} used a mirrored transform ${a},${b},${c},${d}`);
  }
  const normalized = [a / scaleX, b / scaleX, c / scaleY, d / scaleY];
  if (!normalized.every((value) => Math.abs(value) < 0.0001 || Math.abs(Math.abs(value) - 1) < 0.0001)) {
    throw new Error(`Block unity: ${draw.name} used a non-quarter-turn rotation ${normalized.join(",")}`);
  }
}

if (requestedLegacyConnectors.size) {
  throw new Error(`Block unity: legacy connector art was requested: ${[...requestedLegacyConnectors].join(", ")}`);
}
const requestedWholeSolid = [...requestedFormalAssets].some((name) => !name.includes("-single.png") && !name.includes("-shell-"));
const requestedWholeShell = [...requestedFormalAssets].some((name) => name.includes("-shell-"));
if (!requestedWholeSolid || !requestedWholeShell) {
  throw new Error(
    `Block unity: formal whole-piece request coverage missing (solid=${requestedWholeSolid}, shell=${requestedWholeShell})`,
  );
}

// Grabbing one cell of a whole-piece sprite must still select the logical
// multi-cell block, not an independent visual sub-cell.
await page.evaluate(() => {
  window.__BLOCK_UNITY_LEVEL__ = 2;
  window.__COLOR_ESCAPE__.loadLevel(2, true);
});
await page.waitForTimeout(120);
const debug = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const target = debug.puzzle.blocks.find((block) => (
  block.shape.length > 1
  && (block.frozen ?? 0) === 0
  && block.shape.every(([dx, dy]) => {
    const x = block.x + dx;
    const y = block.y + dy;
    return x > 0 && y > 0 && x < debug.puzzle.width - 1 && y < debug.puzzle.height - 1;
  })
));
if (!target) throw new Error("Block unity: no selectable multi-cell block found");
const [offsetX, offsetY] = target.shape[0];
const canvas = await page.locator("canvas").boundingBox();
if (!canvas) throw new Error("Block unity: canvas bounds are unavailable");
const pointer = {
  x: canvas.x + debug.viewportTransform.offsetX
    + (debug.board.innerX + (target.x + offsetX + 0.5) * debug.board.cell) * debug.viewportTransform.scale,
  y: canvas.y + debug.viewportTransform.offsetY
    + (debug.board.innerY + (target.y + offsetY + 0.5) * debug.board.cell) * debug.viewportTransform.scale,
};
await page.mouse.move(pointer.x, pointer.y);
await page.mouse.down();
await page.waitForTimeout(90);
const selected = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
if (selected.selectedId !== target.id) throw new Error("Block unity: multi-cell block was not selected as one object");
await page.screenshot({ path: shot("round118-block-unity-supported-solid-selected.png") });
await page.mouse.up();

await page.setViewportSize({ width: 320, height: 568 });
await page.evaluate(() => {
  window.__BLOCK_UNITY_LEVEL__ = 15;
  window.__COLOR_ESCAPE__.loadLevel(15, true);
});
await page.waitForFunction(() => {
  const debugState = window.__COLOR_ESCAPE__.getDebugState();
  return debugState.puzzle.levelId === 15 && !debugState.art.formalGameplay.requestedBlockSignature;
}, undefined, { timeout: 8_000 });
await page.waitForTimeout(120);
await page.screenshot({ path: shot("round118-block-unity-supported-shell-level-015-320x568.png") });

await browser.close();
if (errors.length) throw new Error(`Block-unity browser errors:\n${errors.join("\n")}`);
console.log(
  `Formal block unity passed: ${requestedFormalAssets.size} requested formal-v1 assets; `
  + `${allDraws.length} natural-size, non-mirrored quarter-turn draws; `
  + "official and generated whole pieces, shell/badge layering, grouped selection, and 320x568 covered.",
);
