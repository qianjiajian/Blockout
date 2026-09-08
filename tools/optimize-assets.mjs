import { createRequire } from "node:module";
import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const require = createRequire(import.meta.url);
const sharp = require("C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp");
const root = resolve(import.meta.dirname, "..");

// Home V2 is already supplied at its final authored dimensions. Copy these
// files byte-for-byte so later `art:optimize` runs never resample the approved
// interface or reintroduce the retired home background.
const homeV2Assets = [
  ...[
    "coin-icon.png", "coin-panel.png", "settings-button.png", "level-card.png", "level-pill.png",
    "arrow-left.png", "arrow-right.png", "start-button.png", "daily-ribbon.png", "daily-calendar.png",
  ].map((name) => [`art-source/ui/home-v2/${name}`, `public/assets/art/ui/home-v2/${name}`]),
];
for (const [source, output] of homeV2Assets) {
  const target = resolve(root, output);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(resolve(root, source), target);
  console.log(`Copied approved Home V2 asset ${output}.`);
}

// Navigation V3 uses a dedicated five-slot ImageGen chrome kit. Crop the full
// bar and reusable selected plate separately so the selected state can move
// between tabs without duplicating five large bitmaps.
const navigationChromeSource = resolve(root, "art-source/ui/navigation-v3/five-tab-chrome-kit-v1.png");
const navigationBarTarget = resolve(root, "public/assets/art/ui/navigation-v3/five-tab-bar-v1.png");
const navigationSelectedTarget = resolve(root, "public/assets/art/ui/navigation-v3/five-tab-selected-v1.png");
await mkdir(dirname(navigationBarTarget), { recursive: true });
await sharp(navigationChromeSource)
  .extract({ left: 0, top: 180, width: 1536, height: 300 })
  .resize(496, 96)
  .png({ compressionLevel: 9, adaptiveFiltering: true, palette: true, quality: 92 })
  .toFile(navigationBarTarget);
await sharp(navigationChromeSource)
  .extract({ left: 512, top: 510, width: 512, height: 420 })
  .resize(120, 98)
  .png({ compressionLevel: 9, adaptiveFiltering: true, palette: true, quality: 92 })
  .toFile(navigationSelectedTarget);
console.log("Prepared five-slot navigation bar and reusable selected plate.");

const backgrounds = [
  { source: "art-source/backgrounds/home-lab-v2.png", output: "public/assets/art/backgrounds/home-lab-v2.jpg" },
  { source: "art-source/backgrounds/gameplay-lab-v2.png", output: "public/assets/art/backgrounds/gameplay-lab-v2.jpg" },
];

for (const { source, output } of backgrounds) {
  const input = resolve(root, source);
  const target = resolve(root, output);
  await mkdir(dirname(target), { recursive: true });
  await sharp(input)
    .jpeg({ quality: 90, mozjpeg: true, chromaSubsampling: "4:4:4" })
    .toFile(target);
  console.log(`Prepared runtime background ${output}.`);
}

const sprites = [
  { source: "art-source/ui/icons/booster-icons-v1.png", output: "public/assets/art/ui/icons/booster-icons-v1.png", width: 900, height: 450 },
  { source: "art-source/ui/notifications/booster-unlock-banner-v1.png", output: "public/assets/art/ui/notifications/booster-unlock-banner-v1.png", width: 420, height: 128 },
  { source: "art-source/ui/notifications/discovery-badge-v1.png", output: "public/assets/art/ui/notifications/discovery-badge-v1.png", width: 128, height: 128 },
  { source: "art-source/ui/icons/achievement-badges-v1.png", output: "public/assets/art/ui/icons/achievement-badges-v1.png", width: 900, height: 450 },
  { source: "art-source/ui/icons/onboarding-daily-icons-v1.png", output: "public/assets/art/ui/icons/onboarding-daily-icons-v1.png", width: 640, height: 320 },
  { source: "art-source/fx/mechanic-fx-v1.png", output: "public/assets/art/fx/mechanic-fx-v1.png", width: 600, height: 300 },
  { source: "art-source/ui/illustrations/supply-station-v1.png", output: "public/assets/art/ui/illustrations/supply-station-v1.png", width: 768, height: 384 },
  { source: "art-source/ui/chrome/universal-panel-v2.png", output: "public/assets/art/ui/chrome/universal-panel-v2.png", width: 512, height: 512 },
  { source: "art-source/ui/chrome/buttons-v2.png", output: "public/assets/art/ui/chrome/buttons-v2.png", width: 900, height: 300 },
  { source: "art-source/ui/chrome/toggles-v1.png", output: "public/assets/art/ui/chrome/toggles-v1.png", width: 800, height: 400 },
  { source: "art-source/ui/icons/system-icons-v1.png", output: "public/assets/art/ui/icons/system-icons-v1.png", width: 800, height: 600 },
  { source: "art-source/ui/icons/settings-icons-v1.png", output: "public/assets/art/ui/icons/settings-icons-v1.png", width: 900, height: 300 },
  { source: "art-source/gameplay/board/empty-cell-v1.png", output: "public/assets/art/gameplay/board/empty-cell-v1.png", width: 192, height: 192 },
  { source: "art-source/gameplay/board/irregular-cell-v1.png", output: "public/assets/art/gameplay/board/irregular-cell-v1.png", width: 192, height: 192 },
  { source: "art-source/gameplay/mechanics/progression-mechanics-atlas-v1.png", output: "public/assets/art/gameplay/mechanics/progression-mechanics-atlas-v1.png", width: 1024, height: 1024 },
  { source: "art-source/gameplay/mechanics/mechanism-guide-icons-atlas-v1.png", output: "public/assets/art/gameplay/mechanics/mechanism-guide-icons-atlas-v1.png", width: 768, height: 576 },
  { source: "art-source/fx/particle-spark-v1.png", output: "public/assets/art/fx/particle-spark-v1.png", width: 128, height: 128 },
  { source: "art-source/fx/victory-halo-v1.png", output: "public/assets/art/fx/victory-halo-v1.png", width: 768, height: 768 },
  { source: "art-source/fx/block-grab-halo-v1.png", output: "public/assets/art/fx/block-grab-halo-v1.png", width: 256, height: 256 },
  { source: "art-source/fx/block-blocked-halo-v1.png", output: "public/assets/art/fx/block-blocked-halo-v1.png", width: 256, height: 256 },
  { source: "art-source/fx/blocker-focus-corners-v1.png", output: "public/assets/art/fx/blocker-focus-corners-v1.png", width: 256, height: 256 },
  { source: "art-source/fx/strategy-focus-corners-v1.png", output: "public/assets/art/fx/strategy-focus-corners-v1.png", width: 256, height: 256 },
  { source: "art-source/fx/mechanic-relay-mote-v1.png", output: "public/assets/art/fx/mechanic-relay-mote-v1.png", width: 128, height: 128 },
  { source: "art-source/fx/exit-suction-trail-v1.png", output: "public/assets/art/fx/exit-suction-trail-v1.png", width: 512, height: 512 },
  { source: "art-source/ui/navigation-v3/five-tab-icons-atlas-v1.png", output: "public/assets/art/ui/navigation-v3/five-tab-icons-atlas-v1.png", width: 384, height: 256 },
  { source: "art-source/ui/journey/journey-track-v1.png", output: "public/assets/art/ui/journey/journey-track-v1.png", width: 384, height: 576 },
];

for (const { source, output, width, height } of sprites) {
  const input = resolve(root, source);
  const target = resolve(root, output);
  await mkdir(dirname(target), { recursive: true });
  await sharp(input)
    .resize(width, height, {
      fit: "contain",
      position: "centre",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: "lanczos3",
    })
    .png({ compressionLevel: 9, adaptiveFiltering: true, palette: true, quality: 96 })
    .toFile(target);
  console.log(`Prepared runtime sprite ${output} at ${width}x${height}.`);
}

// ImageGen produced the 4x2 badge sheet on a 1536x1024 canvas. Each badge is
// centered in a 384x512 slot, so crop the quiet vertical padding into square
// source cells before building the runtime atlas. This preserves the generated
// art and alpha while preventing circular badges from being stretched.
const layerBadgeSource = resolve(root, "art-source/gameplay/mechanics/layer-preview-badges-v1.png");
const layerBadgeTarget = resolve(root, "public/assets/art/gameplay/mechanics/layer-preview-badges-v1.png");
const layerBadgeTiles = [];
for (let row = 0; row < 2; row += 1) {
  for (let column = 0; column < 4; column += 1) {
    const input = await sharp(layerBadgeSource)
      .extract({ left: column * 384, top: row * 512 + 64, width: 384, height: 384 })
      .resize(128, 128, { fit: "contain", kernel: "lanczos3" })
      .png()
      .toBuffer();
    layerBadgeTiles.push({ input, left: column * 128, top: row * 128 });
  }
}
await mkdir(dirname(layerBadgeTarget), { recursive: true });
await sharp({ create: { width: 512, height: 256, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite(layerBadgeTiles)
  .png({ compressionLevel: 9, adaptiveFiltering: true, palette: true, quality: 96 })
  .toFile(layerBadgeTarget);
console.log("Prepared ImageGen layer-preview badge atlas at 512x256.");

// The ImageGen rail source contains decorative end caps. Runtime silhouette
// assembly needs the quiet repeatable center span, while the corner source is
// cropped to its upper-left convex joint and rotated for the other quadrants.
const boardRimRailSource = resolve(root, "art-source/gameplay/board/board-rim-rail-v1.png");
const boardRimRailTarget = resolve(root, "public/assets/art/gameplay/board/board-rim-rail-v1.png");
await mkdir(dirname(boardRimRailTarget), { recursive: true });
await sharp(boardRimRailSource)
  .extract({ left: 683, top: 242, width: 760, height: 234 })
  .resize(384, 128, { fit: "fill", kernel: "lanczos3" })
  .png({ compressionLevel: 9, adaptiveFiltering: true, palette: true, quality: 96 })
  .toFile(boardRimRailTarget);
console.log("Prepared repeatable ImageGen board rim rail at 384x128.");

const boardRimCornerSource = resolve(root, "art-source/gameplay/board/board-rim-corner-v1.png");
const boardRimCornerTarget = resolve(root, "public/assets/art/gameplay/board/board-rim-corner-v1.png");
await mkdir(dirname(boardRimCornerTarget), { recursive: true });
await sharp(boardRimCornerSource)
  .extract({ left: 187, top: 187, width: 340, height: 340 })
  .resize(192, 192, { fit: "fill", kernel: "lanczos3" })
  .png({ compressionLevel: 9, adaptiveFiltering: true, palette: true, quality: 96 })
  .toFile(boardRimCornerTarget);
console.log("Prepared rotatable ImageGen board rim convex corner at 192x192.");

// ImageGen block cells are kept as independent source files so every color can
// be replaced without rebuilding an atlas. A small source-edge crop removes
// generation fringe while preserving the untouched high-resolution originals.
const blockSprites = [
  ["red-circle-v1.png", "red-circle-v1.png"],
  ["blue-diamond-v1.png", "blue-diamond-v1.png"],
  ["green-triangle-v1.png", "green-triangle-v1.png"],
  ["yellow-square-v1.png", "yellow-square-v1.png"],
  ["purple-sparkle-v1.png", "purple-sparkle-v1.png"],
  ["orange-hexagon-v1.png", "orange-hexagon-v1.png"],
  ["pink-heart-v1.png", "pink-heart-v1.png"],
  ["cyan-plus-v1.png", "cyan-plus-v1.png"],
  ["red-plain-v1.png", "red-plain-v1.png"],
  ["blue-plain-v1.png", "blue-plain-v1.png"],
  ["green-plain-v1.png", "green-plain-v1.png"],
  ["yellow-plain-v1.png", "yellow-plain-v1.png"],
  ["purple-plain-v1.png", "purple-plain-v1.png"],
  ["orange-plain-v1.png", "orange-plain-v1.png"],
  ["pink-plain-v1.png", "pink-plain-v1.png"],
  ["cyan-plain-v1.png", "cyan-plain-v1.png"],
];

for (const [sourceName, outputName] of blockSprites) {
  const input = resolve(root, "art-source/gameplay/blocks", sourceName);
  const target = resolve(root, "public/assets/art/gameplay/blocks", outputName);
  await mkdir(dirname(target), { recursive: true });
  await sharp(input)
    .extract({ left: 32, top: 32, width: 1190, height: 1190 })
    .resize(256, 256, {
      fit: "contain",
      position: "centre",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: "lanczos3",
    })
    .png({ compressionLevel: 9, adaptiveFiltering: true, palette: true, quality: 96 })
    .toFile(target);
  console.log(`Prepared replaceable runtime block ${outputName} at 256x256.`);
}

const blockConnectorSprites = [
  "red-connector-v1.png",
  "blue-connector-v1.png",
  "green-connector-v1.png",
  "yellow-connector-v1.png",
  "purple-connector-v1.png",
  "orange-connector-v1.png",
  "pink-connector-v1.png",
  "cyan-connector-v1.png",
];

for (const name of blockConnectorSprites) {
  const input = resolve(root, "art-source/gameplay/connectors", name);
  const target = resolve(root, "public/assets/art/gameplay/connectors", name);
  await mkdir(dirname(target), { recursive: true });
  await sharp(input)
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 10 })
    .resize(384, 128, { fit: "fill", kernel: "lanczos3" })
    .png({ compressionLevel: 9, adaptiveFiltering: true, palette: true, quality: 96 })
    .toFile(target);
  console.log(`Prepared rotatable ImageGen block connector ${name} at 384x128.`);
}

const gateSprites = [
  "red-circle-gate-v1.png",
  "blue-diamond-gate-v1.png",
  "green-triangle-gate-v1.png",
  "yellow-square-gate-v1.png",
  "purple-sparkle-gate-v1.png",
  "orange-hexagon-gate-v1.png",
  "pink-heart-gate-v1.png",
  "cyan-plus-gate-v1.png",
];

for (const name of gateSprites) {
  const input = resolve(root, "art-source/gameplay/gates", name);
  const target = resolve(root, "public/assets/art/gameplay/gates", name);
  await mkdir(dirname(target), { recursive: true });
  await sharp(input)
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 10 })
    .resize(512, 128, { fit: "fill", kernel: "lanczos3" })
    .png({ compressionLevel: 9, adaptiveFiltering: true, palette: true, quality: 96 })
    .toFile(target);
  console.log(`Prepared rotatable runtime gate ${name} at 512x128.`);
}

const shutterSource = resolve(root, "art-source/gameplay/mechanics/shutter-v1.png");
const shutterTarget = resolve(root, "public/assets/art/gameplay/mechanics/shutter-v1.png");
await mkdir(dirname(shutterTarget), { recursive: true });
await sharp(shutterSource)
  .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 10 })
  .resize(768, 600, { fit: "fill", kernel: "lanczos3" })
  .png({ compressionLevel: 9, adaptiveFiltering: true, palette: true, quality: 96 })
  .toFile(shutterTarget);
console.log("Prepared nine-slice runtime shutter at 768x600.");

const iceSource = resolve(root, "art-source/gameplay/mechanics/ice-cover-v1.png");
const iceTarget = resolve(root, "public/assets/art/gameplay/mechanics/ice-cover-v1.png");
await mkdir(dirname(iceTarget), { recursive: true });
await sharp(iceSource)
  .extract({ left: 32, top: 32, width: 1190, height: 1190 })
  .resize(512, 512, { fit: "fill", kernel: "lanczos3" })
  .png({ compressionLevel: 9, adaptiveFiltering: true, palette: true, quality: 96 })
  .toFile(iceTarget);
console.log("Prepared stretchable runtime ice cover at 512x512.");

const appIcon = resolve(root, "release-assets/app-icon-v1.png");
for (const size of [1024, 512]) {
  const output = resolve(root, `release-assets/app-icon-${size}.png`);
  await sharp(appIcon)
    .resize(size, size, { fit: "cover", position: "centre", kernel: "lanczos3" })
    .png({ compressionLevel: 9, adaptiveFiltering: true, palette: true, quality: 95 })
    .toFile(output);
  console.log(`Prepared ${size}x${size} app icon.`);
}
