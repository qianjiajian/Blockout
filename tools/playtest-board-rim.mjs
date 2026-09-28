import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const rootPath = resolve(fileURLToPath(new URL("../playtest-results/", import.meta.url)),
  `continuous-board-rim-${new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-")}`);
const shot = (name) => resolve(rootPath, name);
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(rootPath, { recursive: true });

const browser = await chromium.launch({ headless: true });
// Fresh, nonpersistent context: no shared user profile or storageState is opened.
const context = await browser.newContext({ viewport: { width: 720, height: 1584 } });
const page = await context.newPage();
await page.addInitScript(() => {
  window.__FORMAL_BORDER_DRAWS__ = [];
  window.__FORMAL_BORDER_V1_DRAWS__ = [];
  window.__FORMAL_BORDER_FRAME__ = 0;
  window.__FORMAL_BORDER_AUDIT_LEVEL__ = null;
  const originalSetTransform = CanvasRenderingContext2D.prototype.setTransform;
  CanvasRenderingContext2D.prototype.setTransform = function patchedSetTransform(...args) {
    if (args.length >= 4 && args[0] === 1 && args[1] === 0 && args[2] === 0 && args[3] === 1) {
      window.__FORMAL_BORDER_FRAME__ += 1;
    }
    return originalSetTransform.call(this, ...args);
  };
  const original = CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage = function patchedDrawImage(image, ...args) {
    const source = typeof image?.src === "string" ? image.src : "";
    if ((source.includes("/formal-border-v2/") || source.includes("/formal-ice-v1/"))
      && window.__FORMAL_BORDER_DRAWS__.length < 20_000) {
      const transform = this.getTransform();
      window.__FORMAL_BORDER_DRAWS__.push({
        frame: window.__FORMAL_BORDER_FRAME__,
        levelId: window.__FORMAL_BORDER_AUDIT_LEVEL__,
        name: new URL(source).pathname.split("/").at(-1),
        family: source.includes("/formal-border-v2/") ? "border-v2" : "ice-v1",
        args,
        transform: [transform.a, transform.b, transform.c, transform.d, transform.e, transform.f],
        naturalWidth: image.naturalWidth || image.width || 0,
        naturalHeight: image.naturalHeight || image.height || 0,
        shadowBlur: this.shadowBlur,
      });
    }
    if (source.includes("/formal-border-v1/") && window.__FORMAL_BORDER_V1_DRAWS__.length < 100) {
      window.__FORMAL_BORDER_V1_DRAWS__.push(new URL(source).pathname.split("/").at(-1));
    }
    return original.call(this, image, ...args);
  };
});
const errors = [];
const loadedV2Assets = new Set();
const loadedIceAssets = new Set();
const loadedV1Assets = new Set();
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));
page.on("response", (response) => {
  const source = response.url();
  const name = new URL(source).pathname.split("/").at(-1);
  if (source.includes("/formal-border-v2/")) loadedV2Assets.add(name);
  if (source.includes("/formal-ice-v1/")) loadedIceAssets.add(name);
  if (source.includes("/formal-border-v1/")) loadedV1Assets.add(name);
});
await page.goto(playtestUrl, { waitUntil: "domcontentloaded" });
await page.waitForLoadState("networkidle");
await page.waitForTimeout(700);

const levels = [1, 5, 6, 8, 10, 11, 12, 15, 20, 23, 26, 70, 72, 77, 86, 90, 100];
for (const levelId of levels) {
  await page.evaluate((id) => {
    window.__FORMAL_BORDER_AUDIT_LEVEL__ = id;
    window.__COLOR_ESCAPE__.loadLevel(id, true);
  }, levelId);
  await page.waitForTimeout(180);
  await page.screenshot({ path: shot(`round145-formal-border-v2-level-${String(levelId).padStart(3, "0")}.png`) });
}

const campaignDraws = await page.evaluate(() => window.__FORMAL_BORDER_DRAWS__);
const continuousFixtures = [];
for (const side of ["top", "right", "bottom", "left"]) {
  for (const size of [4, 5, 6, 9, 10]) {
    const result = await page.evaluate(async ({ side, size }) => {
  const game = window.__COLOR_ESCAPE__;
  if (!game) throw new Error("Continuous gate fixture: game is unavailable");
  const { PuzzleModel } = await import("/src/core/PuzzleModel.ts");
  game.model = new PuzzleModel({
    id: 4_003,
    name: `Continuous ${side} gate, ${size} cells`,
    difficulty: "normal",
    timeSeconds: 600,
    reward: 0,
    width: 12,
    height: 12,
    gates: [
      { id: "green-continuous", side, offset: 1, size, color: "green", frozen: 1 },
    ],
    blocks: [
      { id: "green-single", x: 0, y: 1, shape: [[0, 0]], color: "green" },
    ],
  });
  game.screen = "playing";
  game.selectedId = undefined;
  game.activePointer = undefined;
  game.dragVisual = undefined;
  window.__FORMAL_BORDER_AUDIT_LEVEL__ = 4_003 + size * 10 + ["top", "right", "bottom", "left"].indexOf(side);
  window.__FORMAL_BORDER_DRAWS__ = [];
  const start = window.__FORMAL_BORDER_DRAWS__.length;
  game.render();
  return { side, size, draws: window.__FORMAL_BORDER_DRAWS__.slice(start) };
    }, { side, size });
    continuousFixtures.push(result);
    if (size === 4 || size === 10) await page.screenshot({ path: shot(`continuous-${side}-${size}.png`) });
  }
}
const separatePortals = await page.evaluate(async () => {
  const game = window.__COLOR_ESCAPE__;
  const { PuzzleModel } = await import("/src/core/PuzzleModel.ts");
  game.model = new PuzzleModel({ id: 4_200, name: "Two distinct apertures remain separate", difficulty: "normal",
    timeSeconds: 600, reward: 0, width: 12, height: 12,
    gates: [{ id: "separate-red", side: "top", offset: 0, size: 4, color: "red" },
      { id: "separate-blue", side: "top", offset: 6, size: 4, color: "blue" }],
    blocks: [{ id: "red", x: 1, y: 1, color: "red", shape: [[0, 0]] },
      { id: "blue", x: 8, y: 1, color: "blue", shape: [[0, 0]] }] });
  window.__FORMAL_BORDER_AUDIT_LEVEL__ = 4_200;
  window.__FORMAL_BORDER_DRAWS__ = [];
  game.render();
  return { side: "top", size: 4, draws: window.__FORMAL_BORDER_DRAWS__.slice() };
});
await page.screenshot({ path: shot("separate-top-portals.png") });

const colors = ["red", "blue", "green", "yellow", "purple", "orange", "pink", "cyan"];
const orientations = ["horizontal", "vertical"];
const sizes = [1, 2, 3];
const cornerNames = new Set([
  "corner-south-west.png", "corner-south-east.png",
  "corner-north-west.png", "corner-north-east.png",
]);
const neutralNames = new Set(orientations.flatMap((orientation) => (
  sizes.map((size) => `neutral-${orientation}-${size}.png`)
)));
const gateNames = new Set(colors.flatMap((color) => orientations.flatMap((orientation) => (
  sizes.map((size) => `gate-${color}-${orientation}-${size}.png`)
))));
const expectedV2Assets = new Set([
  ...neutralNames,
  ...cornerNames,
  ...gateNames,
]);
const expectedIceAssets = new Set(orientations.flatMap((orientation) => (
  sizes.map((size) => `ice-${orientation}-${size}.png`)
)));
const straightDimensions = {
  horizontal: { 1: [95, 67], 2: [190, 67], 3: [286, 67] },
  vertical: { 1: [57, 109], 2: [57, 204], 3: [58, 299] },
};
const iceDimensions = {
  horizontal: { 1: [94, 67], 2: [190, 67], 3: [285, 67] },
  vertical: { 1: [58, 111], 2: [58, 208], 3: [58, 303] },
};
const cornerDimensions = new Map([
  ["corner-south-west.png", [60, 68]],
  ["corner-south-east.png", [60, 68]],
  ["corner-north-west.png", [61, 69]],
  ["corner-north-east.png", [60, 69]],
]);
const naturalSizeFor = (name) => {
  const corner = cornerDimensions.get(name);
  if (corner) return corner;
  const straight = name.match(/^(?:neutral|gate-[^-]+)-(horizontal|vertical)-([123])\.png$/);
  if (straight) return straightDimensions[straight[1]][Number(straight[2])];
  const ice = name.match(/^ice-(horizontal|vertical)-([123])\.png$/);
  if (ice) return iceDimensions[ice[1]][Number(ice[2])];
  return undefined;
};
const missingV2Assets = [...expectedV2Assets].filter((name) => !loadedV2Assets.has(name));
const unexpectedV2Assets = [...loadedV2Assets].filter((name) => !expectedV2Assets.has(name));
const missingIceAssets = [...expectedIceAssets].filter((name) => !loadedIceAssets.has(name));
const unexpectedIceAssets = [...loadedIceAssets].filter((name) => !expectedIceAssets.has(name));
if (expectedV2Assets.size !== 58 || expectedIceAssets.size !== 6
  || missingV2Assets.length || unexpectedV2Assets.length
  || unexpectedIceAssets.length
  || missingIceAssets.length || loadedV1Assets.size || loadedV2Assets.has("reference.png")) {
  throw new Error(
    `Formal border asset requests invalid; v2=${[...loadedV2Assets].join(",")}`
      + ` missingV2=${missingV2Assets.join(",")} unexpectedV2=${unexpectedV2Assets.join(",")}`
      + ` missingIce=${missingIceAssets.join(",")} unexpectedIce=${unexpectedIceAssets.join(",")}`
      + ` loadedV1=${[...loadedV1Assets].join(",")}`,
  );
}

const draws = [...campaignDraws, ...continuousFixtures.flatMap(fixture => fixture.draws), ...separatePortals.draws];
if (!draws.length) throw new Error("Formal border draw audit captured no calls");
const borderDraws = draws.filter(({ family }) => family === "border-v2");
if (!borderDraws.length) throw new Error("Formal border v2 draw audit captured no calls");
const iceDraws = draws.filter(({ family }) => family === "ice-v1");
if (!iceDraws.length) throw new Error("Formal ice v1 draw audit captured no calls");
const oldBorderDraws = await page.evaluate(() => window.__FORMAL_BORDER_V1_DRAWS__);
if (oldBorderDraws.length) {
  throw new Error(`Formal border v1 was still drawn: ${[...new Set(oldBorderDraws)].join(",")}`);
}
for (const draw of [...borderDraws, ...iceDraws]) {
  const [a, b, c, d] = draw.transform;
  const scaleX = Math.hypot(a, b);
  const scaleY = Math.hypot(c, d);
  if (Math.abs(b) > 0.0001 || Math.abs(c) > 0.0001 || a <= 0 || d <= 0
    || Math.abs(scaleX - scaleY) > 0.0001) {
    throw new Error(`Formal ${draw.name} used non-uniform transform ${scaleX}x${scaleY}`);
  }
  const croppedLongStrip = /^(?:gate-[^-]+|ice)-(?:horizontal|vertical)-3\.png$/.test(draw.name)
    && draw.args.length === 8;
  if (draw.args.length !== 2 && !croppedLongStrip) {
    throw new Error(
      `Formal ${draw.name} must be native or a continuous 3-cell-source gate/ice strip, got ${draw.args.length + 1} arguments`,
    );
  }
  const expectedSize = naturalSizeFor(draw.name);
  if (!expectedSize
    || draw.naturalWidth !== expectedSize[0]
    || draw.naturalHeight !== expectedSize[1]) {
    throw new Error(
      `Formal ${draw.name} native size is ${draw.naturalWidth}x${draw.naturalHeight}, `
        + `expected ${expectedSize?.join("x") ?? "a registered 1/2/3-cell slice"}`,
    );
  }
  if (draw.name.startsWith("neutral-") && Math.abs(draw.shadowBlur) > 0.0001) {
    throw new Error(`Neutral rim ${draw.name} inherited a per-piece shadowBlur of ${draw.shadowBlur}`);
  }
}
const frameDraws = new Map();
for (const draw of borderDraws) {
  const entries = frameDraws.get(draw.frame) ?? [];
  entries.push(draw);
  frameDraws.set(draw.frame, entries);
}
const destinationRect = (draw) => {
  const [a, b, c, d, e, f] = draw.transform;
  const offset = draw.args.length === 8 ? 4 : 0;
  const destinationX = Number(draw.args[offset]);
  const destinationY = Number(draw.args[offset + 1]);
  const destinationWidth = Number(draw.args.length === 2 ? draw.naturalWidth : draw.args[offset + 2]);
  const destinationHeight = Number(draw.args.length === 2 ? draw.naturalHeight : draw.args[offset + 3]);
  const corners = [
    [destinationX, destinationY],
    [destinationX + destinationWidth, destinationY],
    [destinationX, destinationY + destinationHeight],
    [destinationX + destinationWidth, destinationY + destinationHeight],
  ].map(([x, y]) => [a * x + c * y + e, b * x + d * y + f]);
  return {
    left: Math.min(...corners.map(([x]) => x)),
    top: Math.min(...corners.map(([, y]) => y)),
    right: Math.max(...corners.map(([x]) => x)),
    bottom: Math.max(...corners.map(([, y]) => y)),
  };
};
const paintIdentity = (draw) => {
  const rect = destinationRect(draw);
  const rounded = (value) => Math.round(value * 1_000) / 1_000;
  return `${draw.name}:${rounded(rect.left)},${rounded(rect.top)},${rounded(rect.right)},${rounded(rect.bottom)}`;
};
// A three-slice long gate is one painter-layer entry, not three independent
// objects sorted against neighbouring rails. Keep depth assertions at that
// object boundary without weakening the order of neutral/corner/other gates.
const logicalPaintEntries = (entries) => {
  const result = [];
  for (let index = 0; index < entries.length; index += 1) {
    const first = entries[index];
    if (first.args.length !== 8 || !first.name.startsWith("gate-")) { result.push(first); continue; }
    const group = entries.slice(index, index + 3);
    if (group.length !== 3 || group.some(draw => draw.name !== first.name
      || draw.args.length !== 8 || JSON.stringify(draw.transform) !== JSON.stringify(first.transform))) {
      throw new Error(`Continuous ${first.name} did not render one contiguous three-slice layer`);
    }
    const rectangles = group.map(destinationRect);
    const [a, , , d, e, f] = first.transform;
    const left = Math.min(...rectangles.map(r => r.left)), top = Math.min(...rectangles.map(r => r.top));
    const right = Math.max(...rectangles.map(r => r.right)), bottom = Math.max(...rectangles.map(r => r.bottom));
    result.push({ ...first, args: [(left - e) / a, (top - f) / d, (right - left) / a, (bottom - top) / d] });
    index += 2;
  }
  return result;
};
const completeFrameSignatures = new Map();
const completeFrameCounts = new Map();
let depthOrderedFrames = 0;
let concaveSeamFrames = 0;
for (const [frame, rawEntries] of frameDraws) {
  const entries = logicalPaintEntries(rawEntries);
  const plainIndexes = entries.flatMap((draw, index) => neutralNames.has(draw.name) ? [index] : []);
  const gateIndexes = entries.flatMap((draw, index) => draw.name.startsWith("gate-") ? [index] : []);
  const capIndexes = entries.flatMap((draw, index) => cornerNames.has(draw.name) ? [index] : []);
  if (!plainIndexes.length || !gateIndexes.length || !capIndexes.length) continue;
  depthOrderedFrames += 1;
  const topYs = entries.map((draw) => destinationRect(draw).top);
  for (let index = 1; index < topYs.length; index += 1) {
    if (topYs[index] + 0.001 < topYs[index - 1]) {
      throw new Error(
        `Formal border frame ${frame} level ${entries[index].levelId ?? "unknown"} violated top-to-bottom painter order: `
          + `${entries[index - 1].name}@${topYs[index - 1]} before ${entries[index].name}@${topYs[index]}`,
      );
    }
  }

  const levelId = entries[0].levelId;
  if (levelId != null && entries.every((draw) => draw.levelId === levelId)) {
    const signature = entries.map(paintIdentity).join("|");
    const previousSignature = completeFrameSignatures.get(levelId);
    if (previousSignature != null && previousSignature !== signature) {
      throw new Error(`Formal border level ${levelId} changed painter order between complete frames`);
    }
    completeFrameSignatures.set(levelId, signature);
    completeFrameCounts.set(levelId, (completeFrameCounts.get(levelId) ?? 0) + 1);
  }

  const indexed = entries.map((draw, index) => ({ draw, index, rect: destinationRect(draw) }));
  const cornerCandidates = indexed.filter(({ draw }) => draw.name === "corner-south-east.png");
  const horizontalCandidates = indexed.filter(({ draw }) => /^neutral-horizontal-[123]\.png$/.test(draw.name));
  const seams = cornerCandidates.flatMap((corner) => horizontalCandidates.flatMap((horizontal) => {
    const horizontalOverlap = Math.min(corner.rect.right, horizontal.rect.right)
      - Math.max(corner.rect.left, horizontal.rect.left);
    const sharesLowerEdge = Math.abs(corner.rect.bottom - horizontal.rect.bottom) <= 0.001;
    return horizontalOverlap > 0.001 && sharesLowerEdge && corner.rect.top < horizontal.rect.top
      ? [{ corner, horizontal }]
      : [];
  }));
  for (const { corner, horizontal } of seams) {
    if (corner.index >= horizontal.index) {
      throw new Error(
        `Formal border frame ${frame} level ${levelId ?? "unknown"} painted the upper concave corner after its lower horizontal rail`,
      );
    }
  }
  if (seams.length) concaveSeamFrames += 1;
}
if (!depthOrderedFrames) throw new Error("Formal border order regression observed no complete rim/gate/corner frame");
if (!concaveSeamFrames) throw new Error("Formal border order regression observed no complete concave-corner/lower-rail seam frame");
if ((completeFrameCounts.get(8) ?? 0) < 2) {
  throw new Error("Formal border order regression did not observe repeated complete Lv8 frames for stability");
}
const drawnNames = new Set(borderDraws.map(({ name }) => name));
for (const name of [...cornerNames, ...neutralNames]) {
  if (!drawnNames.has(name)) throw new Error(`Formal border regression did not render ${name}`);
}
const gateDraws = borderDraws.filter(({ name }) => /^gate-[^-]+-(horizontal|vertical)-[123]\.png$/.test(name));
const drawnGateOrientations = new Set();
const drawnGateSizes = new Set();
for (const draw of gateDraws) {
  const match = draw.name.match(/^gate-[^-]+-(horizontal|vertical)-([123])\.png$/);
  drawnGateOrientations.add(match[1]);
  drawnGateSizes.add(Number(match[2]));
}
for (const orientation of orientations) {
  if (!drawnGateOrientations.has(orientation)) {
    throw new Error(`Formal gate regression did not render a ${orientation} gate`);
  }
}
for (const size of sizes) {
  if (!drawnGateSizes.has(size)) {
    throw new Error(`Formal gate regression did not render the native ${size}-cell gate asset`);
  }
}

const assertContinuousStrip = (fixture, family, color, orientation) => {
  const pattern = family === "gate"
    ? new RegExp(`^gate-${color}-${orientation}-([123])\\.png$`)
    : new RegExp(`^ice-${orientation}-([123])\\.png$`);
  const segments = fixture.draws.filter(({ name }) => pattern.test(name));
  const label = `${family} ${fixture.side} ${fixture.size}-cell`;
  const near = (actual, expected, description) => {
    if (Math.abs(actual - expected) > 0.001) throw new Error(`${label} ${description}: ${actual} != ${expected}`);
  };
  if (segments.length !== 3 || segments.some(({ name, args }) => Number(name.match(pattern)[1]) !== 3 || args.length !== 8)) {
    throw new Error(`${label} must use exactly three cropped draws from ONE 3-cell image (no 1-cell repeated end caps): ${JSON.stringify(segments)}`);
  }
  const horizontal = orientation === "horizontal", tangent = horizontal ? 0 : 1, normal = horizontal ? 1 : 0;
  const first = segments[0], sourceLength = horizontal ? first.naturalWidth : first.naturalHeight;
  const sourceDepth = horizontal ? first.naturalHeight : first.naturalWidth;
  const expectedLength = fixture.size * 95 + sourceLength - 285;
  for (const draw of segments) {
    if (JSON.stringify(draw.transform) !== JSON.stringify(first.transform)) throw new Error(`${label} changed transform within one portal`);
    near(draw.args[normal], 0, "source normal origin");
    near(draw.args[normal + 2], sourceDepth, "source native depth");
    near(draw.args[normal + 6], sourceDepth, "destination native depth");
    near(draw.args[normal + 4], first.args[normal + 4], "destination normal alignment");
  }
  near(first.args[tangent], 0, "leading cap source origin");
  near(first.args[tangent + 2], 24, "leading source cap");
  near(first.args[tangent + 6], 24, "leading destination cap");
  near(segments[2].args[tangent + 2], 24, "trailing source cap");
  near(segments[2].args[tangent + 6], 24, "trailing destination cap");
  for (let index = 1; index < 3; index += 1) {
    near(segments[index].args[tangent], segments[index - 1].args[tangent] + segments[index - 1].args[tangent + 2], "contiguous source slicing");
    near(segments[index].args[tangent + 4], segments[index - 1].args[tangent + 4] + segments[index - 1].args[tangent + 6], "contiguous destination (no gap or overlap)");
  }
  near(segments[2].args[tangent] + segments[2].args[tangent + 2], sourceLength, "complete source strip");
  near(segments.reduce((sum, draw) => sum + draw.args[tangent + 6], 0), expectedLength, "one complete logical opening span");
  return { side: fixture.side, size: fixture.size, family, expectedLength, capPixels: 24, drawCount: segments.length };
};
const continuousResults = continuousFixtures.flatMap(fixture => {
  const orientation = fixture.side === "top" || fixture.side === "bottom" ? "horizontal" : "vertical";
  return [assertContinuousStrip(fixture, "gate", "green", orientation), assertContinuousStrip(fixture, "ice", undefined, orientation)];
});
const separatePortalResults = ["red", "blue"].map(color => assertContinuousStrip(separatePortals, "gate", color, "horizontal"));
const separateRects = ["red", "blue"].map(color => separatePortals.draws
  .filter(draw => draw.name === `gate-${color}-horizontal-3.png`).map(destinationRect));
if (Math.max(...separateRects[0].map(r => r.right)) >= Math.min(...separateRects[1].map(r => r.left))) {
  throw new Error("Distinct portals lost their neutral separation or were merged");
}
await page.setViewportSize({ width: 320, height: 568 });
await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(72, true));
await page.waitForTimeout(180);
await page.screenshot({ path: shot("round145-formal-border-v2-level-072-320x568.png") });

await browser.close();
if (errors.length) throw new Error(`Board-rim browser errors:\n${errors.join("\n")}`);
await writeFile(shot("report.json"), JSON.stringify({ status: "passed", isolatedNonpersistentBrowserContext: true,
  userStorageCleared: false, levels, continuousResults, separatePortalResults, depthOrderedFrames, concaveSeamFrames, errors,
  excluded: ["legacy Lv17 dedicated gate art", "flip-door leaf rendering", "star/pulse variants"] }, null, 2));
console.log(`Formal border v2 loaded 58 rim/gate assets plus 6 ice strips; neutral/native <=3-cell slices retained native drawing; ${continuousResults.length} four-direction 4/5/6/9/10-cell gate+ice checks retained two 24px caps and one continuous middle. Painter depth and sampled concave seams passed for ${levels.length} silhouettes at 720x1584 plus 320x568. Evidence: ${rootPath}`);
