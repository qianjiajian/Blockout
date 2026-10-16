import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { extname, relative, resolve } from "node:path";
import {
  COLLECTION_ALBUM_WEBP_TRANSFORM,
  encodeCollectionAlbumWebp,
} from "./collection-album-webp.mjs";
import {
  COLLECTION_CARD_ATLAS_JPEG_TRANSFORM,
  COLLECTION_CARD_ATLAS_SIZE,
  encodeCollectionCardAtlasJpeg,
} from "./collection-card-atlas-jpeg.mjs";
import {
  FORMAL_FROZEN_PNG_OPTIONS,
  FORMAL_MECHANISM_PNG_OPTIONS,
} from "./formal-frozen-png.mjs";
import {
  JOURNEY_EPISODE_WEBP_TRANSFORM,
  encodeJourneyEpisodeWebp,
} from "./journey-episode-webp.mjs";
import { verifyIndependentRevisedArt } from "./verify-independent-revised-art.mjs";
import { SHUTTER_SOURCES, verifyShutterNineSlice } from "./import-shutter-nine-slice.mjs";
import {
  LARGE_IMAGE_TRANSFORM,
  assertLargeImageGeometry,
  encodeLargeImage,
  findLargeImagePolicy,
  largeImageSourcePixels,
} from "./large-image-encoding.mjs";

const require = createRequire(import.meta.url);
const sharp = require("C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp");
const root = resolve(import.meta.dirname, "..");
const manifestPath = resolve(root, "art-source/manifest.json");
const manifestDir = resolve(root, "art-source");
const runtimeRoot = resolve(root, "public/assets/art");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const independentRevisedArt = await verifyIndependentRevisedArt(root);
// Nine-slice shutter art has its own original-byte/pixel contract. Include its
// exact declared components and memory, not a wildcard directory exemption.
await verifyShutterNineSlice();
const shutterManifest = JSON.parse(await readFile(resolve(runtimeRoot,
  "gameplay/mechanics/shutter-nine-slice-v1/manifest.json"), "utf8"));
const shutterAssets = SHUTTER_SOURCES.map(([part, layer]) => {
  const url = `assets/art/gameplay/mechanics/shutter-nine-slice-v1/${part}.png`;
  const matches = shutterManifest.entries.filter((entry) => entry.part === part);
  const entry = matches[0];
  if (matches.length !== 1 || entry.url !== url || entry.source !== `图层 ${layer}.png`
    || !independentRevisedArt.activeUrls.has(url)) throw new Error(`Invalid shutter component: ${part}`);
  return { key: `gameplay.shutterNineSlice.${part}`, runtime: resolve(root, "public", url),
    width: entry.width, height: entry.height, alpha: true, grid: [1, 1] };
});
const shutterUrls = new Set(shutterManifest.entries.map(({ url }) => url));
const runtimeManifestSource = await readFile(resolve(root, "src/game/artManifest.ts"), "utf8");
const memoryReportPath = resolve(root, "playtest-results/art-memory-budget/art-memory-budget-report.json");

const MEBIBYTE = 1024 * 1024;
// Cut 3 adds the authored 720×201 Home header as a separate startup slice and
// extends the default background to the complete 720×1584 artboard. A 9 MiB
// ceiling preserves measured headroom without hiding either supplied layer.
const MAX_SHELL_DECODED_BYTES = 9 * MEBIBYTE;
// Journey and Leaderboard now use the supplied, independently replaceable
// 720-artboard slices. Keep those slices at their authored pixel size: raising
// this measured ceiling is preferable to silently downscaling formal artwork.
// The inherited estimate uses one page group at a time. The retained Home rank
// banner is accounted for separately in the explicit combinations below.
// Five video-parity gameplay overlays add 2.17 MiB of fixed decoded RGBA at
// their required 192/512 runtime sizes. The direction-specific formal-border
// V2 adds about 0.54 MiB. Sixteen dedicated whole-piece sprites replace the
// former one-cell composition path and add 3.55 MiB to the conservative
// all-formal-block group total. The complete direction-authored 1/2/3-cell
// rim, gate and ice family adds 0.93 MiB without scaling down the supplied
// artwork. Restoring the competitor's eight-colour 3x3 whole-piece family adds
// another 2.57 MiB. The remaining video-parity Z/plus/2x3/H4/T5 combinations
// add 2.60 MiB. A 64 MiB cap keeps those unscaled formal sprites inside a
// measured ceiling while the game still loads only the current level's
// requested block shapes. Nine supplied whole-piece numeric-ice silhouettes
// replace cell-by-cell composition and add 1.13 MiB to that same conservative
// current-level family; the runtime likewise loads only shapes used by the
// active level and releases them on transition. The exact Lv23 mirrored-L and
// Lv199 corner-notch sprites add 0.53 MiB to this deliberately conservative
// family sum. The Collection card atlases now use 1000×1000 q60 runtime cells,
// adding about 20 MiB to the peak collection load group while retaining the
// same on-demand lifetime.
// Include 493,552 B for the existing independently declared nine-slice shutter
// (previously omitted), as well as the new native rectangle family below.
const MAX_FULL_DECODED_BYTES = 82 * MEBIBYTE;
const RELEASE_CANVAS_BYTES = 720 * 1584 * 4;
// Home shortcuts retain their supplied native dimensions. Keep the hard,
// measured working-set ceiling as independently replaceable art is updated.
// The 24 supplied rectangle sprites replace 16 placeholders and add eight
// native 3x2 images: conservative all-shapes decoded RGBA grows by 1,918,720 B.
// Images remain native-size and current-level-only. The new measured
// conservative total is about 80.20 MiB art + 4.35 MiB DPR2 canvas; keep an
// 87 MiB ceiling for the larger collection atlas group.
const MAX_GRAPHICS_WORKING_SET_BYTES = 87 * MEBIBYTE;
const SHELL_ASSET_KEYS = new Set([
  "background.home",
  "ui.home.topHeader",
  "ui.home.resourcePanel",
  "ui.home.coinIcon",
  "ui.home.heartIcon",
  "ui.home.addButton",
  "ui.home.settingsButton",
  "ui.home.levelPlate",
  "ui.home.arrowLeft",
  "ui.home.arrowRight",
  "ui.home.starLeft",
  "ui.home.starCenter",
  "ui.home.starRight",
  "ui.home.emptyStarLeft",
  "ui.home.emptyStarCenter",
  "ui.home.emptyStarRight",
  "ui.home.startButton",
  "ui.home.navigationBar",
  "ui.home.navigationSelected",
  "ui.home.navigationDivider",
  "ui.home.shopIcon",
  "ui.home.shopIconLocked",
  "ui.home.featureLock",
  "ui.home.leaderboardIcon",
  "ui.home.leaderboardIconLocked",
  "ui.home.homeIcon",
  "ui.home.journeyIcon",
  "ui.home.journeyIconLocked",
  "ui.home.collectionIcon",
  "ui.home.collectionAlbumEntry",
  "ui.home.dailyTaskEntry",
  "ui.home.sideEntryBase",
  "ui.home.leagueEntry",
  "ui.home.dailyChallengeEntry",
  "ui.home.achievementEntry",
  "ui.onboardingDaily",
  "ui.universalPanel",
  "ui.suppliedPopups.scene.locked-hint-panel",
]);

const sha256 = async (path) => createHash("sha256").update(await readFile(path)).digest("hex");
const sha256Buffer = (buffer) => createHash("sha256").update(buffer).digest("hex");

const seenKeys = new Set();
const seenRuntime = new Set();
const assetsByKey = new Map();
let runtimeBytes = 0;
let residentDecodedBytes = 0;
let declaredDecodedBytes = 0;
let shellDecodedBytes = 0;
const loadGroupDecodedBytes = new Map();

for (const asset of [...manifest.assets, ...independentRevisedArt.assets, ...shutterAssets]) {
  if (!asset.key || seenKeys.has(asset.key)) throw new Error(`Duplicate or missing art key: ${asset.key}`);
  seenKeys.add(asset.key);
  assetsByKey.set(asset.key, asset);
  const runtimePath = resolve(manifestDir, asset.runtime);
  if (!runtimePath.startsWith(runtimeRoot)) throw new Error(`${asset.key} runtime escapes public/assets/art`);
  const runtimeName = relative(runtimeRoot, runtimePath).replaceAll("\\", "/");
  const runtimeUrl = `assets/art/${runtimeName}`;
  const formalBlockMatch = runtimeName.match(/^gameplay\/blocks\/formal-v1\/(red|blue|green|yellow|purple|orange|pink|cyan)-(.+\.png)$/);
  const formalBlockFamilyDeclared = formalBlockMatch
    ? runtimeManifestSource.includes(`formalBlockArt("${formalBlockMatch[1]}")`)
      && runtimeManifestSource.includes(`\${color}-${formalBlockMatch[2]}`)
    : false;
  const formalGateEditorMatch = runtimeName.match(/^gameplay\/board\/formal-border-v1\/exit-(red|blue|green|yellow|purple|orange|pink|cyan)-1-cell\.png$/);
  const formalGateEditorFamilyDeclared = formalGateEditorMatch
    ? runtimeManifestSource.includes(`formalGateArt("${formalGateEditorMatch[1]}")`)
      && runtimeManifestSource.includes("formal-border-v1/exit-${color}-1-cell.png")
    : false;
  const formalGateV2Match = runtimeName.match(/^gameplay\/board\/formal-border-v2\/gate-(red|blue|green|yellow|purple|orange|pink|cyan)-(horizontal|vertical)-([123])\.png$/);
  const formalGateV2FamilyDeclared = formalGateV2Match
    ? runtimeManifestSource.includes(`formalGateArt("${formalGateV2Match[1]}")`)
      && runtimeManifestSource.includes(`gate-\${color}-${formalGateV2Match[2]}-${formalGateV2Match[3]}.png`)
    : false;
  if (!runtimeManifestSource.includes(`"${runtimeUrl}"`)
    && !independentRevisedArt.urls.has(runtimeUrl)
    && !shutterUrls.has(runtimeUrl)
    && !formalBlockFamilyDeclared
    && !formalGateEditorFamilyDeclared
    && !formalGateV2FamilyDeclared) {
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
  if (asset.source) {
    const sourcePath = resolve(manifestDir, asset.source);
    await stat(sourcePath);
    const largeImagePolicy = findLargeImagePolicy(asset.source);
    if (largeImagePolicy && asset.transform !== LARGE_IMAGE_TRANSFORM) {
      throw new Error(`${asset.key} selected large image must declare ${LARGE_IMAGE_TRANSFORM}`);
    }
    if (asset.transform === LARGE_IMAGE_TRANSFORM) {
      if (!largeImagePolicy) throw new Error(`${asset.key} is not an approved large image source`);
      const expectedAlpha = largeImagePolicy.alpha ?? (largeImagePolicy.format === "rgb-palette-exact-alpha-png");
      const expectedFormat = largeImagePolicy.format === "jpeg" ? "jpeg" : "png";
      if (asset.runtime !== `../public/assets/art/${largeImagePolicy.runtime}`
        || runtimeName !== largeImagePolicy.runtime
        || asset.width !== largeImagePolicy.width || asset.height !== largeImagePolicy.height
        || asset.alpha !== expectedAlpha || Boolean(metadata.hasAlpha) !== expectedAlpha
        || metadata.format !== expectedFormat) {
        throw new Error(`${asset.key} large image path, dimensions, format or alpha contract changed`);
      }
      const sourceBuffer = await readFile(sourcePath);
      const runtimeBuffer = await readFile(runtimePath);
      const expectedRuntime = await encodeLargeImage(sourceBuffer, largeImagePolicy);
      if (sha256Buffer(expectedRuntime) !== sha256Buffer(runtimeBuffer)) {
        throw new Error(`${asset.key} large image is not the deterministic encoding of its original master`);
      }
      await assertLargeImageGeometry(await largeImageSourcePixels(sourceBuffer, largeImagePolicy), runtimeBuffer, largeImagePolicy);
    } else if (asset.transform === "copy") {
      const sourceMetadata = await sharp(sourcePath).metadata();
      if (sourceMetadata.width !== metadata.width || sourceMetadata.height !== metadata.height
        || Boolean(sourceMetadata.hasAlpha) !== Boolean(metadata.hasAlpha)) {
        throw new Error(`${asset.key} copy transform changed source dimensions or alpha mode`);
      }
      if (await sha256(sourcePath) !== await sha256(runtimePath)) {
        throw new Error(`${asset.key} copy transform is not byte-for-byte identical`);
      }
    } else if (asset.transform === "jpeg-no-resize") {
      const sourceMetadata = await sharp(sourcePath).metadata();
      if (sourceMetadata.width !== metadata.width || sourceMetadata.height !== metadata.height) {
        throw new Error(`${asset.key} JPEG transform changed ${sourceMetadata.width}x${sourceMetadata.height} to ${metadata.width}x${metadata.height}`);
      }
    } else if (asset.transform === "png-lossless-no-resize") {
      const sourcePixels = await sharp(sourcePath).ensureAlpha().raw().toBuffer();
      const runtimePixels = await sharp(runtimePath).ensureAlpha().raw().toBuffer();
      if (!sourcePixels.equals(runtimePixels)) {
        throw new Error(`${asset.key} lossless PNG transform changed decoded RGBA pixels`);
      }
    } else if (asset.transform === "png-palette-128-q85" || asset.transform === "png-palette-256-q95") {
      const expectedRuntime = await sharp(sourcePath)
        .png(asset.transform === "png-palette-256-q95"
          ? FORMAL_MECHANISM_PNG_OPTIONS
          : FORMAL_FROZEN_PNG_OPTIONS)
        .toBuffer();
      const runtimeBuffer = await readFile(runtimePath);
      if (sha256Buffer(expectedRuntime) !== sha256Buffer(runtimeBuffer)) {
        throw new Error(`${asset.key} palette PNG runtime does not match its deterministic palette encoding`);
      }
    } else if (asset.transform === COLLECTION_ALBUM_WEBP_TRANSFORM) {
      const sourceMetadata = await sharp(sourcePath).metadata();
      if (sourceMetadata.width !== metadata.width || sourceMetadata.height !== metadata.height) {
        throw new Error(`${asset.key} q72 WebP changed ${sourceMetadata.width}x${sourceMetadata.height} to ${metadata.width}x${metadata.height}`);
      }
      const expectedRuntime = await encodeCollectionAlbumWebp(sourcePath);
      const runtimeBuffer = await readFile(runtimePath);
      if (sha256Buffer(expectedRuntime) !== sha256Buffer(runtimeBuffer)) {
        throw new Error(`${asset.key} WebP runtime is not the deterministic q72 encoding`);
      }
      const { data: runtimePixels, info: runtimeInfo } = await sharp(runtimePath)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const alphaAt = (x, y) => runtimePixels[(y * runtimeInfo.width + x) * runtimeInfo.channels + 3];
      const cornerAlpha = [
        alphaAt(0, 0),
        alphaAt(runtimeInfo.width - 1, 0),
        alphaAt(0, runtimeInfo.height - 1),
        alphaAt(runtimeInfo.width - 1, runtimeInfo.height - 1),
      ];
      if (cornerAlpha.some((alpha) => alpha !== 0)) {
        throw new Error(`${asset.key} WebP corners must be truly transparent; got alpha=[${cornerAlpha.join(",")}]`);
      }
      let visiblePixelCount = 0;
      for (let offset = 3; offset < runtimePixels.length; offset += runtimeInfo.channels) {
        if (runtimePixels[offset] > 0) visiblePixelCount += 1;
      }
      if (visiblePixelCount === 0) throw new Error(`${asset.key} WebP contains no visible pixels`);
    } else if (asset.transform === JOURNEY_EPISODE_WEBP_TRANSFORM) {
      const sourceMetadata = await sharp(sourcePath).metadata();
      if (sourceMetadata.width !== metadata.width || sourceMetadata.height !== metadata.height) {
        throw new Error(`${asset.key} q75 WebP changed ${sourceMetadata.width}x${sourceMetadata.height} to ${metadata.width}x${metadata.height}`);
      }
      const expectedRuntime = await encodeJourneyEpisodeWebp(sourcePath);
      const runtimeBuffer = await readFile(runtimePath);
      if (sha256Buffer(expectedRuntime) !== sha256Buffer(runtimeBuffer)) {
        throw new Error(`${asset.key} WebP runtime is not the deterministic q75 encoding`);
      }
    } else if (asset.transform === COLLECTION_CARD_ATLAS_JPEG_TRANSFORM) {
      if (metadata.width !== COLLECTION_CARD_ATLAS_SIZE || metadata.height !== COLLECTION_CARD_ATLAS_SIZE) {
        throw new Error(`${asset.key} runtime atlas must be ${COLLECTION_CARD_ATLAS_SIZE}px square`);
      }
      const expectedRuntime = await encodeCollectionCardAtlasJpeg(sourcePath);
      const runtimeBuffer = await readFile(runtimePath);
      if (sha256Buffer(expectedRuntime) !== sha256Buffer(runtimeBuffer)) {
        throw new Error(`${asset.key} JPEG runtime is not the deterministic 1000px q60 encoding`);
      }
    }
  }
  runtimeBytes += (await stat(runtimePath)).size;
  const decodedBytes = asset.width * asset.height * 4;
  declaredDecodedBytes += decodedBytes;
  if (asset.loadGroup) {
    loadGroupDecodedBytes.set(asset.loadGroup, (loadGroupDecodedBytes.get(asset.loadGroup) ?? 0) + decodedBytes);
  } else {
    residentDecodedBytes += decodedBytes;
  }
  if (SHELL_ASSET_KEYS.has(asset.key)) shellDecodedBytes += decodedBytes;
}

// Rank art can survive Home -> another page -> Home while its animation pauses.
// requestCollectionAlbumArt clears that presentation and releases its five
// images before requesting the full album. Artwork-only unlock previews do not
// load the full album group. Preserve the inherited page-group estimate and add
// rank to every other page; this does not certify other historical overlaps.
const retainedRankGroup = "supplied-popup-rank";
const fullAlbumGroup = "formal-collection-album";
for (const group of [retainedRankGroup, fullAlbumGroup]) {
  if (!loadGroupDecodedBytes.has(group)) throw new Error(`Missing lifetime-accounted art group: ${group}`);
}
const retainedRankDecodedBytes = loadGroupDecodedBytes.get(retainedRankGroup);
const pageLoadGroups = [...loadGroupDecodedBytes.entries()]
  .filter(([group]) => group !== retainedRankGroup);
const [largestOtherPageGroup = "none", largestOtherPageDecodedBytes = 0] = pageLoadGroups
  .filter(([group]) => group !== fullAlbumGroup)
  .sort((left, right) => right[1] - left[1])[0] ?? [];
const loadGroupCombinations = [
  { groups: [fullAlbumGroup], decodedBytes: loadGroupDecodedBytes.get(fullAlbumGroup) },
  { groups: [retainedRankGroup, largestOtherPageGroup],
    decodedBytes: retainedRankDecodedBytes + largestOtherPageDecodedBytes },
];
const peakLoadCombination = [...loadGroupCombinations]
  .sort((left, right) => right.decodedBytes - left.decodedBytes)[0];
const peakLoadGroup = peakLoadCombination.groups.join(" + ");
const peakLoadGroupDecodedBytes = peakLoadCombination.decodedBytes;
const fullDecodedBytes = residentDecodedBytes + peakLoadGroupDecodedBytes;

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
  independentRevisedAssetCount: independentRevisedArt.assets.length,
  independentShutterAssetCount: shutterAssets.length,
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
    residentDecodedBytes,
    loadGroups: Object.fromEntries(loadGroupDecodedBytes),
    mutuallyExclusiveLoadGroups: Object.fromEntries(pageLoadGroups),
    retainedRank: {
      group: retainedRankGroup,
      decodedBytes: retainedRankDecodedBytes,
      excludedPageGroup: fullAlbumGroup,
      releaseBeforeFullAlbum: "ColorEscapeGame.requestCollectionAlbumArt calls clearMainlineRankChange before requesting full album art; all five retained rank images must be released and not revived by late loads.",
    },
    loadGroupCombinations,
    combinationFormula: "max(formal-collection-album, supplied-popup-rank + max(other page groups excluding formal-collection-album))",
    lifetimeScope: "Accounts for retained rank art only; other page-group exclusivity is inherited, not newly certified by this static estimate.",
    peakLoadGroup,
    peakLoadGroupDecodedBytes,
    allDeclaredDecodedBytes: declaredDecodedBytes,
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

console.log(`Verified ${seenKeys.size} runtime art assets (${runtimeBytes} bytes), with dimensions, alpha, atlas grids, manifest coverage, release density, explicit retained-rank/page-group accounting, and ${((graphicsWorkingSetBytes) / MEBIBYTE).toFixed(2)} MiB decoded-art + DPR2-canvas budget.`);
