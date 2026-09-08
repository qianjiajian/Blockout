import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { extname, relative, resolve } from "node:path";

const require = createRequire(import.meta.url);
const sharp = require("C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp");
const root = resolve(import.meta.dirname, "..");
const manifestPath = resolve(root, "art-source/manifest.json");
const manifestDir = resolve(root, "art-source");
const runtimeRoot = resolve(root, "public/assets/art");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const runtimeManifestSource = await readFile(resolve(root, "src/game/artManifest.ts"), "utf8");
const memoryReportPath = resolve(root, "playtest-results/art-memory-budget/art-memory-budget-report.json");

const MEBIBYTE = 1024 * 1024;
const MAX_SHELL_DECODED_BYTES = 8 * MEBIBYTE;
const MAX_FULL_DECODED_BYTES = 48 * MEBIBYTE;
const RELEASE_CANVAS_BYTES = 720 * 1584 * 4;
const MAX_GRAPHICS_WORKING_SET_BYTES = 52 * MEBIBYTE;
const SHELL_ASSET_KEYS = new Set([
  "background.home",
  "ui.home.coinIcon",
  "ui.home.coinPanel",
  "ui.home.settingsButton",
  "ui.home.levelCard",
  "ui.home.levelPill",
  "ui.home.arrowLeft",
  "ui.home.arrowRight",
  "ui.home.startButton",
  "ui.home.dailyRibbon",
  "ui.home.dailyCalendar",
  "ui.navigationFive.icons",
  "ui.navigationFive.bar",
  "ui.navigationFive.selected",
  "ui.onboardingDaily",
  "ui.universalPanel",
]);

const seenKeys = new Set();
const seenRuntime = new Set();
const assetsByKey = new Map();
let runtimeBytes = 0;
let fullDecodedBytes = 0;
let shellDecodedBytes = 0;

for (const asset of manifest.assets) {
  if (!asset.key || seenKeys.has(asset.key)) throw new Error(`Duplicate or missing art key: ${asset.key}`);
  seenKeys.add(asset.key);
  assetsByKey.set(asset.key, asset);
  const runtimePath = resolve(manifestDir, asset.runtime);
  if (!runtimePath.startsWith(runtimeRoot)) throw new Error(`${asset.key} runtime escapes public/assets/art`);
  const runtimeName = relative(runtimeRoot, runtimePath).replaceAll("\\", "/");
  const runtimeUrl = `assets/art/${runtimeName}`;
  if (!runtimeManifestSource.includes(`"${runtimeUrl}"`)) {
    throw new Error(`${asset.key} runtime URL is missing from src/game/artManifest.ts: ${runtimeUrl}`);
  }
  if (seenRuntime.has(runtimeName)) throw new Error(`Duplicate runtime art path: ${runtimeName}`);
  seenRuntime.add(runtimeName);

  const metadata = await sharp(runtimePath).metadata();
  if (metadata.width !== asset.width || metadata.height !== asset.height) {
    throw new Error(`${asset.key} expected ${asset.width}x${asset.height}, got ${metadata.width}x${metadata.height}`);
  }
  if (Boolean(metadata.hasAlpha) !== asset.alpha) {
    throw new Error(`${asset.key} expected alpha=${asset.alpha}, got alpha=${Boolean(metadata.hasAlpha)}`);
  }
  const [columns, rows] = asset.grid;
  if (!Number.isInteger(columns) || !Number.isInteger(rows) || columns < 1 || rows < 1
    || asset.width % columns !== 0 || asset.height % rows !== 0) {
    throw new Error(`${asset.key} has invalid ${columns}x${rows} atlas grid for ${asset.width}x${asset.height}`);
  }
  if (asset.order && asset.order.length !== columns * rows) {
    throw new Error(`${asset.key} order has ${asset.order.length} items, expected ${columns * rows}`);
  }
  if (asset.source) await stat(resolve(manifestDir, asset.source));
  runtimeBytes += (await stat(runtimePath)).size;
  const decodedBytes = asset.width * asset.height * 4;
  fullDecodedBytes += decodedBytes;
  if (SHELL_ASSET_KEYS.has(asset.key)) shellDecodedBytes += decodedBytes;
}

if ([...SHELL_ASSET_KEYS].some((key) => !seenKeys.has(key))) {
  throw new Error("Shell art memory budget references an undeclared asset");
}
if (shellDecodedBytes > MAX_SHELL_DECODED_BYTES) {
  throw new Error(`Shell art decodes to ${shellDecodedBytes} bytes, above the ${MAX_SHELL_DECODED_BYTES}-byte startup budget`);
}
if (fullDecodedBytes > MAX_FULL_DECODED_BYTES) {
  throw new Error(`All art decodes to ${fullDecodedBytes} bytes, above the ${MAX_FULL_DECODED_BYTES}-byte runtime budget`);
}
const graphicsWorkingSetBytes = fullDecodedBytes + RELEASE_CANVAS_BYTES;
if (graphicsWorkingSetBytes > MAX_GRAPHICS_WORKING_SET_BYTES) {
  throw new Error(`Decoded art plus the DPR2 canvas use ${graphicsWorkingSetBytes} bytes, above the ${MAX_GRAPHICS_WORKING_SET_BYTES}-byte graphics budget`);
}

const walk = async (directory) => {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else if ([".png", ".jpg", ".jpeg", ".webp"].includes(extname(entry.name).toLowerCase())) files.push(path);
  }
  return files;
};

const undeclared = (await walk(runtimeRoot))
  .map((path) => relative(runtimeRoot, path).replaceAll("\\", "/"))
  .filter((path) => !seenRuntime.has(path));
if (undeclared.length) throw new Error(`Undeclared runtime art:\n${undeclared.join("\n")}`);

// The game scales its 496-wide logical canvas to at most 720 CSS pixels and
// caps DPR at 2. Keep each optimized atlas cell at or above the largest number
// of physical pixels it can occupy so package savings cannot silently blur UI.
const densityChecks = [
  { key: "ui.systemIcons", maxLogicalPixels: 58 },
  { key: "ui.discoveryBadge", maxLogicalPixels: 42 },
  { key: "gameplay.layerPreviewBadges", maxLogicalPixels: 30 },
];
for (const { key, maxLogicalPixels } of densityChecks) {
  const asset = assetsByKey.get(key);
  if (!asset) throw new Error(`Missing density-checked art asset: ${key}`);
  const requiredPhysicalPixels = Math.ceil(maxLogicalPixels * (720 / 496) * 2);
  const cellWidth = asset.width / asset.grid[0];
  const cellHeight = asset.height / asset.grid[1];
  if (cellWidth < requiredPhysicalPixels || cellHeight < requiredPhysicalPixels) {
    throw new Error(`${key} cells are ${cellWidth}x${cellHeight}, below ${requiredPhysicalPixels}px release density`);
  }
}

await mkdir(resolve(memoryReportPath, ".."), { recursive: true });
await writeFile(memoryReportPath, `${JSON.stringify({
  assetCount: seenKeys.size,
  runtimeBytes,
  decodedRgbaAssumption: "width × height × 4 bytes per decoded image",
  shell: {
    assetCount: SHELL_ASSET_KEYS.size,
    decodedBytes: shellDecodedBytes,
    decodedMiB: shellDecodedBytes / MEBIBYTE,
    budgetBytes: MAX_SHELL_DECODED_BYTES,
  },
  full: {
    decodedBytes: fullDecodedBytes,
    decodedMiB: fullDecodedBytes / MEBIBYTE,
    budgetBytes: MAX_FULL_DECODED_BYTES,
  },
  releaseCanvas: {
    width: 720,
    height: 1584,
    bytesPerPixel: 4,
    backingStoreBytes: RELEASE_CANVAS_BYTES,
    backingStoreMiB: RELEASE_CANVAS_BYTES / MEBIBYTE,
  },
  graphicsWorkingSet: {
    decodedArtPlusCanvasBytes: graphicsWorkingSetBytes,
    decodedArtPlusCanvasMiB: graphicsWorkingSetBytes / MEBIBYTE,
    budgetBytes: MAX_GRAPHICS_WORKING_SET_BYTES,
  },
  scope: "Static project-owned decoded image and primary canvas estimate; engine, audio, GPU copies and platform overhead are not included.",
}, null, 2)}\n`, "utf8");

console.log(`Verified ${seenKeys.size} ImageGen runtime assets (${runtimeBytes} bytes), with dimensions, alpha, atlas grids, manifest coverage, release density, and ${((graphicsWorkingSetBytes) / MEBIBYTE).toFixed(2)} MiB decoded-art + DPR2-canvas budget.`);
