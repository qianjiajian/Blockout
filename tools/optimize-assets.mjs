import { createRequire } from "node:module";
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { encodeCollectionAlbumWebp } from "./collection-album-webp.mjs";
import { encodeCollectionCardAtlasJpeg } from "./collection-card-atlas-jpeg.mjs";
import {
  FORMAL_FROZEN_PNG_OPTIONS,
  FORMAL_MECHANISM_PNG_OPTIONS,
  prepareFormalFrozenBlockPngs,
} from "./formal-frozen-png.mjs";
import { encodeJourneyEpisodeWebp } from "./journey-episode-webp.mjs";
import { optimizeWechatPng } from "../scripts/wechat-image-formats.mjs";
import { encodeLargeImage, findLargeImagePolicy } from "./large-image-encoding.mjs";

const require = createRequire(import.meta.url);
const sharp = require("C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp");
const root = resolve(import.meta.dirname, "..");

async function mirrorPngDirectory(
  sourceDirectory,
  targetDirectory,
  { exclude = [], expectedNames, transform = "copy" } = {},
) {
  const source = resolve(root, sourceDirectory);
  const target = resolve(root, targetDirectory);
  const excluded = new Set(exclude);
  const availableNames = (await readdir(source, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".png"))
    .map((entry) => entry.name)
    .sort();
  const names = expectedNames ? [...expectedNames].sort() : availableNames.filter((name) => !excluded.has(name));

  if (expectedNames) {
    const expected = new Set(expectedNames);
    const missing = names.filter((name) => !availableNames.includes(name));
    const unexpected = availableNames.filter((name) => !expected.has(name) && !excluded.has(name));
    if (missing.length > 0 || unexpected.length > 0) {
      throw new Error(
        `Unexpected PNG inventory in ${sourceDirectory}; missing=[${missing.join(", ")}], unexpected=[${unexpected.join(", ")}]`,
      );
    }
  }

  await rm(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });
  for (const name of names) {
    const sourcePath = resolve(source, name);
    const targetPath = resolve(target, name);
    if (transform === "png-palette-128-q85") {
      await sharp(sourcePath).png(FORMAL_FROZEN_PNG_OPTIONS).toFile(targetPath);
    } else if (transform === "png-palette-256-q95") {
      await sharp(sourcePath).png(FORMAL_MECHANISM_PNG_OPTIONS).toFile(targetPath);
    } else {
      await copyFile(sourcePath, targetPath);
    }
  }
  return names;
}

// Home V3 ships every supplied transparent slice byte-for-byte. The large
// background keeps its 720×1584 dimensions but uses JPEG compression so the
// complete WeChat main package retains its mandatory release headroom.
const homeV3Assets = [
  "top-header.png",
  "resource-panel.png", "coin-icon.png", "heart-icon.png", "add-button.png", "settings-icon.png",
  "level-plate.png", "arrow-left.png", "arrow-right.png", "star-left.png", "star-center.png",
  "star-right.png", "star-empty-left.png", "star-empty-center.png", "star-empty-right.png",
  "start-button.png", "navigation-bar.png", "navigation-selected.png",
  "navigation-divider.png", "shop-icon.png", "leaderboard-icon.png", "home-icon.png",
  "journey-icon.png", "collection-icon.png", "daily-tasks-entry.png", "achievements-entry.png",
  "shop-icon-locked.png", "leaderboard-icon-locked.png", "journey-icon-locked.png",
].map((name) => [`art-source/ui/home-v3/${name}`, `public/assets/art/ui/home-v3/${name}`]);
for (const [source, output] of homeV3Assets) {
  const target = resolve(root, output);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(resolve(root, source), target);
  console.log(`Copied native-size Home V3 asset ${output}.`);
}

const collectionAlbumEntrySource = resolve(root, "art-source/ui/home-v3/collection-album-entry.png");
const collectionAlbumEntryTarget = resolve(root, "public/assets/art/ui/home-v3/collection-album-entry.png");
await copyFile(collectionAlbumEntrySource, collectionAlbumEntryTarget);
await rm(resolve(root, "public/assets/art/ui/home-v3/collection-album-entry.webp"), { force: true });
console.log("Copied native PNG Collection Album Home entry for WeChat shell compatibility.");

// Shop still uses its supplied composite because no blank card shell was
// exported. Leaderboard and Journey are rebuilt exclusively from their blank
// backgrounds and independent slices, so sample names/levels can never remain
// baked into the live UI. Supplied dimensions stay unchanged. The explicitly
// reviewed large-image policies use conservative lossy colour encoding with
// exact alpha; other PNGs retain their existing lossless/copy contracts.
// The build relocates this directory into the on-demand meta-ui
// subpackage; Web keeps the same public URL.
const formalPageAssets = {
  shop: ["reference.png", "buy-button.png", "booster-tile.png", "price-coin.png", "time.png", "rocket.png", "pulse.png"],
  leaderboard: [
    "background.png", "top-header.png", "title-panel.png", "title.png", "tabs-frame.png",
    "tab-active.png", "tab-inactive.png", "podium.png",
    "avatar-fox.png", "avatar-raccoon.png", "avatar-panda.png", "avatar-rabbit.png", "avatar-cat.png",
    "podium-nameplate-gold.png", "podium-nameplate-silver.png", "podium-nameplate-bronze.png",
    "podium-medal-gold.png", "podium-medal-silver.png", "podium-medal-bronze.png",
    "rank-medal-gold.png", "rank-medal-silver.png", "rank-medal-bronze.png",
    "row.png", "level-pill.png", "player-row.png", "player-level-pill.png", "star.png",
  ],
  journey: [
    "background.png", "top-header.png", "title-panel.png", "title.png", "track.png", "track-progress.png",
    "destination.png", "current-marker.png", "level-card-left.png", "level-card-active-left.png",
    "reward-card-right.png", "reward-card-active-right.png", "reward-time.png", "reward-rocket.png",
    "reward-pulse.png", "reward-heart.png", "reward-coins.png", "reward-complete.png",
    "episode-01.png", "episode-02.png", "episode-03.png", "episode-04.png", "episode-05.png",
    "episode-06.png", "episode-07.png", "episode-08.png", "episode-09.png", "episode-10.png",
    "episode-locked-shade.png", "episode-range-panel.png",
    "episode-selected-button.png", "episode-action-button.png", "lock.png",
    "presentation-panel.png", "presentation-close.png",
    "presentation-episode-button.png", "presentation-reward-button.png",
    "title-episode-unlocked.png", "title-journey-rewards.png",
    "presentation-reward-pulse.png", "presentation-reward-time.png", "presentation-reward-rocket.png",
    "presentation-reward-heart.png", "presentation-reward-coins.png",
  ],
  collection: [
    "background.png", "top-header.png", "title-panel.png",
  ],
  "collection-album-v1": [
    "inspiration.png", "new-badge.png",
  ],
  "collection-card-atlases-v1": [
    "level-01.png", "level-02.png", "level-03.png", "level-04.png",
    "level-05.png", "level-06.png", "level-07.png", "level-08.png",
    "masterpiece-01.png", "masterpiece-02.png",
  ],
  "overlays/pause-settings": [
    "panel.png", "close.png", "sound.png", "haptic.png", "reduced-motion.png",
    "toggle-on.png", "toggle-off.png", "replay-button.png", "home-button.png", "clear-progress-button.png",
  ],
  "overlays/win": [
    "panel.png", "glow.png", "reward-pill.png",
    "coin-pile.png", "continue-button.png", "close.png",
  ],
  "overlays/status": ["remaining-panel.png", "clock.png", "feature-ice-door.png"],
};
const losslessFormalPagePngs = new Set([
  "shop/reference.png",
  "journey/background.png",
  "journey/destination.png",
  "journey/presentation-panel.png",
  "journey/presentation-reward-coins.png",
  "journey/title-episode-unlocked.png",
  "journey/title-journey-rewards.png",
  "leaderboard/podium.png",
  "overlays/win/panel.png",
  "overlays/win/glow.png",
  "overlays/win/coin-pile.png",
]);
await rm(resolve(root, "public/assets/art/ui/formal-pages"), { recursive: true, force: true });
for (const [page, names] of Object.entries(formalPageAssets)) {
  for (const name of names) {
    const source = resolve(root, "art-source/ui/formal-pages", page, name);
    const largeImagePolicy = findLargeImagePolicy(`ui/formal-pages/${page}/${name}`);
    const isJourneyEpisode = page === "journey" && /^episode-\d{2}\.png$/.test(name);
    const runtimeName = largeImagePolicy
      ? largeImagePolicy.runtime.split("/").at(-1)
      : page === "collection-album-v1" || isJourneyEpisode
      ? name.replace(/\.png$/, ".webp")
      : page === "collection-card-atlases-v1"
        ? name.replace(/\.png$/, ".jpg")
        : name;
    const target = resolve(root, "public/assets/art/ui/formal-pages", page, runtimeName);
    await mkdir(dirname(target), { recursive: true });
    if (largeImagePolicy) {
      await writeFile(target, await encodeLargeImage(source, largeImagePolicy));
      console.log(`Prepared reviewed native-size large image ${runtimeName}.`);
    } else if (page === "collection-album-v1") {
      await writeFile(target, await encodeCollectionAlbumWebp(source));
      console.log(`Prepared deterministic q72 WebP Collection Album asset ${runtimeName}.`);
    } else if (page === "collection-card-atlases-v1") {
      await writeFile(target, await encodeCollectionCardAtlasJpeg(source));
      console.log(`Prepared deterministic 1000px q60 JPEG Collection card atlas ${runtimeName}.`);
    } else if (isJourneyEpisode) {
      await writeFile(target, await encodeJourneyEpisodeWebp(source));
      console.log(`Prepared deterministic q75 WebP Journey episode ${runtimeName}.`);
    } else if (losslessFormalPagePngs.has(`${page}/${name}`)) {
      await sharp(source)
        .png({ compressionLevel: 9, adaptiveFiltering: true, palette: false, effort: 10 })
        .toFile(target);
      console.log(`Losslessly recompressed native-size formal ${page} asset ${name}.`);
    } else {
      await copyFile(source, target);
      console.log(`Copied native-size formal ${page} asset ${name}.`);
    }
  }
}

// The supplied Daily Tasks V2 cutouts and ImageGen claimed check are byte-for-byte PNGs.
// Keep the annotated 1.png reference out of runtime output.
const dailyTaskV2Assets = [
  "panel.png", "close.png", "task-booster.png", "task-trophy.png", "task-shield.png",
  "chest.png", "calendar.png", "summary-panel.png", "button-green.png", "button-grey.png",
  "button-yellow.png", "progress-track.png", "progress-fill.png", "bonus-panel.png", "task-row.png",
  "claimed-check.png",
];
for (const name of dailyTaskV2Assets) {
  const source = resolve(root, "art-source/ui/formal-pages/daily-tasks-v2", name);
  const target = resolve(root, "public/assets/art/ui/formal-pages/daily-tasks-v2", name);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(source, target);
  console.log(`Copied native-size Daily Tasks V2 asset ${name}.`);
}

// Achievements V2 shares the exact Daily Tasks close/grey-button bytes above.
// Export its eleven page-owned PNGs, including the supplied row frames and reused ImageGen check;
// the annotated reference stays source-only.
const achievementV2Assets = [
  "medal-inactive.png", "medal-active.png", "summary-panel.png", "button-green.png",
  "progress-track.png", "progress-fill-green.png", "progress-fill-blue.png", "panel.png",
  "row-active.png", "row-inactive.png",
  "claimed-check.png",
];
for (const name of achievementV2Assets) {
  const source = resolve(root, "art-source/ui/formal-pages/achievements-v2", name);
  const target = resolve(root, "public/assets/art/ui/formal-pages/achievements-v2", name);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(source, target);
  console.log(`Copied native-size Achievements V2 asset ${name}.`);
}

// Supplied Collection Album V2 remains native-size. Recompression is accepted
// only when every decoded RGBA byte (including transparent RGB) is identical.
const collectionAlbumV2Assets = [
  "progress-panel.png", "detail-panel.png",
];
for (const name of collectionAlbumV2Assets) {
  const source = resolve(root, "art-source/ui/formal-pages/collection-album-v2", name);
  const target = resolve(root, "public/assets/art/ui/formal-pages/collection-album-v2", name);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, await optimizeWechatPng(await readFile(source)));
  console.log(`Prepared exact-RGBA Collection Album V2 asset ${name}.`);
}

// Latest user-supplied cutouts. di0 is explicitly source-only; di1 is an exact
// duplicate of the retained V2 progress panel. guan/close is byte-identical to
// Daily Tasks V2 close. Neither shared PNG is exported a second time.
const collectionAlbumV3Assets = [
  "tab-blue.png", "tab-purple.png", "card-gray.png", "card-blue.png", "card-purple.png", "card-gold.png",
  "progress-icon.png", "lock.png", "mask.png",
  "page-previous.png", "page-next.png", "page-indicator.png",
  "star-filled.png", "star-empty.png", "guide-book.png",
];
for (const name of collectionAlbumV3Assets) {
  const source = resolve(root, "art-source/ui/formal-pages/collection-album-v3", name);
  const target = resolve(root, "public/assets/art/ui/formal-pages/collection-album-v3", name);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, await optimizeWechatPng(await readFile(source)));
  console.log(`Prepared exact-RGBA Collection Album V3 asset ${name}.`);
}

// Supplied guide chrome and the fifteen mechanisms from the user's workbook.
// The close reuses Daily Tasks V2. Toggle-block is not in that catalogue.
const mechanismGuideV2Assets = [
  "panel.png", "card.png", "detail-title.png", "detail-panel.png", "detail-body.png",
  "locked-overlay.png", "lock.png", "selected.png",
  "icon-color-exit.png", "icon-irregular-block.png", "icon-frozen-exit.png",
  "icon-irregular-board.png", "icon-numeric-ice.png", "icon-multilayer-shell.png",
  "icon-shutter.png", "icon-generator.png", "icon-axis-block.png", "icon-key-lock.png",
  "icon-layered-lift.png", "icon-star.png",
  "icon-flip-door.png", "icon-colored-grid.png", "icon-bomb.png",
];
for (const name of mechanismGuideV2Assets) {
  const source = resolve(root, "art-source/ui/formal-pages/mechanism-guide-v2", name);
  const target = resolve(root, "public/assets/art/ui/formal-pages/mechanism-guide-v2", name);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, await optimizeWechatPng(await readFile(source)));
  console.log(`Prepared exact-RGBA mechanism guide V2 asset ${name}.`);
}

// Journey episode 1 deliberately reuses the Home V3 background. Themes 2–10
// come from the project-supplied portrait art and are normalized to the exact
// 720×1584 artboard. Reviewed themes use their shared encoding policy; the
// unselected themes keep the old q88 4:4:4 output. No runtime canvas is resized.
const formalJourneyHomeThemes = Array.from(
  { length: 9 },
  (_, index) => `home-${String(index + 2).padStart(2, "0")}`,
);
for (const name of formalJourneyHomeThemes) {
  const source = resolve(root, "art-source/ui/formal-pages/journey", `${name}.png`);
  const target = resolve(root, "public/assets/art/ui/formal-pages/journey", `${name}.jpg`);
  await mkdir(dirname(target), { recursive: true });
  const largeImagePolicy = findLargeImagePolicy(`ui/formal-pages/journey/${name}.png`);
  if (largeImagePolicy) {
    await writeFile(target, await encodeLargeImage(source, largeImagePolicy));
  } else {
    await sharp(source)
    .resize(720, 1584, { fit: "cover", position: "centre", kernel: "lanczos3" })
    // Source alpha is only a near-opaque export artifact. Preserve its RGB
    // instead of blending bright sky/island edges against a dark matte.
    .removeAlpha()
    .jpeg({ quality: 88, mozjpeg: true, chromaSubsampling: "4:4:4" })
    .toFile(target);
  }
  console.log(`Prepared supplied Journey Home theme ${name} at 720x1584.`);
}

const homeBackgroundTarget = resolve(root, "public/assets/art/ui/home-v3/background.jpg");
await mkdir(dirname(homeBackgroundTarget), { recursive: true });
await writeFile(homeBackgroundTarget, await encodeLargeImage(
  resolve(root, "art-source/ui/home-v3/background.png"),
  findLargeImagePolicy("ui/home-v3/background.png"),
));
console.log("Prepared Home V3 background at its native 720×1584 dimensions.");

// The supplied gameplay screen is a coordinated 720×1584 composition. Keep
// every slice at its authored pixel dimensions. The background is losslessly
// recompressed without changing a pixel; the remaining slices are copied byte
// for byte. The renderer applies one shared artboard/grid transform, never a
// per-image stretch. Typography/reference mockups stay source-only.
const formalGameplayBackgroundSource = resolve(root, "art-source/backgrounds/gameplay-formal-v1.png");
const formalGameplayBackgroundTarget = resolve(root, "public/assets/art/backgrounds/gameplay-formal-v1.png");
await mkdir(dirname(formalGameplayBackgroundTarget), { recursive: true });
await sharp(formalGameplayBackgroundSource)
  .png({ compressionLevel: 9, adaptiveFiltering: true, palette: false, effort: 10 })
  .toFile(formalGameplayBackgroundTarget);
console.log("Losslessly recompressed the native-size formal gameplay background.");

const formalGameplayCopies = [
  ["art-source/ui/gameplay-v1/back-button.png", "public/assets/art/ui/gameplay-v1/back-button.png"],
  ["art-source/ui/gameplay-v1/pause-button.png", "public/assets/art/ui/gameplay-v1/pause-button.png"],
  ["art-source/ui/gameplay-v1/level-pill.png", "public/assets/art/ui/gameplay-v1/level-pill.png"],
  ["art-source/ui/gameplay-v1/timer-icon.png", "public/assets/art/ui/gameplay-v1/timer-icon.png"],
  ["art-source/ui/gameplay-v1/timer-panel.png", "public/assets/art/ui/gameplay-v1/timer-panel.png"],
  ["art-source/ui/gameplay-v1/booster-base.png", "public/assets/art/ui/gameplay-v1/booster-base.png"],
  ["art-source/ui/gameplay-v1/booster-count-badge.png", "public/assets/art/ui/gameplay-v1/booster-count-badge.png"],
  ["art-source/ui/gameplay-v1/booster-plus.png", "public/assets/art/ui/gameplay-v1/booster-plus.png"],
  ["art-source/ui/gameplay-v1/booster-time.png", "public/assets/art/ui/gameplay-v1/booster-time.png"],
  ["art-source/ui/gameplay-v1/booster-rocket.png", "public/assets/art/ui/gameplay-v1/booster-rocket.png"],
  ["art-source/ui/gameplay-v1/booster-pulse.png", "public/assets/art/ui/gameplay-v1/booster-pulse.png"],
  ["art-source/gameplay/board/formal-floor-v1/empty-cells-2x2.png", "public/assets/art/gameplay/board/formal-floor-v1/empty-cells-2x2.png"],
  ["art-source/fx/formal-gameplay-v1/selection-frame.png", "public/assets/art/fx/formal-gameplay-v1/selection-frame.png"],
];
for (const [source, output] of formalGameplayCopies) {
  const target = resolve(root, output);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(resolve(root, source), target);
  console.log(`Copied native-size formal gameplay asset ${output}.`);
}
const formalFrozenBlockNames = await prepareFormalFrozenBlockPngs(root);
console.log(`Prepared ${formalFrozenBlockNames.length} native-size whole-shape frozen-block PNGs for runtime.`);

const formalBlockNames = await mirrorPngDirectory(
  "art-source/gameplay/blocks/formal-v1",
  "public/assets/art/gameplay/blocks/formal-v1",
);
console.log(`Copied ${formalBlockNames.length} native-size formal whole-block/shell assets byte-for-byte.`);

const notificationCopies = [
  ["art-source/ui/notifications/discovery-badge-v1.png", "public/assets/art/ui/notifications/discovery-badge-v1.png"],
];
for (const [source, output] of notificationCopies) {
  const sourcePath = resolve(root, source);
  const target = resolve(root, output);
  await mkdir(dirname(target), { recursive: true });
  let alreadyCurrent = false;
  try {
    alreadyCurrent = (await readFile(sourcePath)).equals(await readFile(target));
  } catch {
    // A missing target is expected on the first optimization pass.
  }
  if (!alreadyCurrent) await copyFile(sourcePath, target);
  console.log(`${alreadyCurrent ? "Kept" : "Copied"} project-supplied notification asset ${output} byte-for-byte.`);
}

for (const retired of [
  "public/assets/art/backgrounds/home-lab-v2.jpg",
  "public/assets/art/backgrounds/gameplay-lab-v2.jpg",
  "public/assets/art/ui/home-v2",
  "public/assets/art/ui/navigation-v3/five-tab-bar-v1.png",
  "public/assets/art/ui/navigation-v3/five-tab-selected-v1.png",
  "public/assets/art/ui/journey/journey-track-v1.png",
  "public/assets/art/ui/illustrations/supply-station-v1.png",
  "public/assets/art/ui/icons/achievement-badges-v1.png",
  "public/assets/art/ui/chrome/toggles-v1.png",
  "public/assets/art/ui/icons/settings-icons-v1.png",
]) {
  await rm(resolve(root, retired), { recursive: true, force: true });
}

const sprites = [
  { source: "art-source/ui/icons/booster-icons-v1.png", output: "public/assets/art/ui/icons/booster-icons-v1.png", width: 900, height: 450 },
  { source: "art-source/ui/notifications/booster-unlock-banner-v1.png", output: "public/assets/art/ui/notifications/booster-unlock-banner-v1.png", width: 420, height: 128 },
  { source: "art-source/ui/icons/onboarding-daily-icons-v1.png", output: "public/assets/art/ui/icons/onboarding-daily-icons-v1.png", width: 640, height: 320 },
  { source: "art-source/fx/mechanic-fx-v1.png", output: "public/assets/art/fx/mechanic-fx-v1.png", width: 600, height: 300 },
  { source: "art-source/ui/chrome/universal-panel-v2.png", output: "public/assets/art/ui/chrome/universal-panel-v2.png", width: 512, height: 512 },
  { source: "art-source/ui/chrome/buttons-v2.png", output: "public/assets/art/ui/chrome/buttons-v2.png", width: 900, height: 300 },
  { source: "art-source/ui/icons/system-icons-v1.png", output: "public/assets/art/ui/icons/system-icons-v1.png", width: 800, height: 600 },
  { source: "art-source/gameplay/board/empty-cell-v1.png", output: "public/assets/art/gameplay/board/empty-cell-v1.png", width: 192, height: 192 },
  { source: "art-source/gameplay/mechanics/progression-mechanics-atlas-v1.png", output: "public/assets/art/gameplay/mechanics/progression-mechanics-atlas-v1.png", width: 1024, height: 1024 },
  { source: "art-source/gameplay/mechanics/video-parity-v1/arrow-axis-overlay-v1.png", output: "public/assets/art/gameplay/mechanics/video-parity-v1/arrow-axis-overlay-v1.png", width: 192, height: 192 },
  { source: "art-source/gameplay/mechanics/video-parity-v1/key-token-v1.png", output: "public/assets/art/gameplay/mechanics/video-parity-v1/key-token-v1.png", width: 66, height: 84 },
  { source: "art-source/gameplay/mechanics/video-parity-v1/key-token-red-v1.png", output: "public/assets/art/gameplay/mechanics/video-parity-v1/key-token-red-v1.png", width: 66, height: 84 },
  { source: "art-source/gameplay/mechanics/video-parity-v1/key-token-blue-v1.png", output: "public/assets/art/gameplay/mechanics/video-parity-v1/key-token-blue-v1.png", width: 66, height: 84 },
  { source: "art-source/gameplay/mechanics/video-parity-v1/key-token-green-v1.png", output: "public/assets/art/gameplay/mechanics/video-parity-v1/key-token-green-v1.png", width: 66, height: 84 },
  { source: "art-source/gameplay/mechanics/video-parity-v1/key-token-yellow-v1.png", output: "public/assets/art/gameplay/mechanics/video-parity-v1/key-token-yellow-v1.png", width: 66, height: 84 },
  { source: "art-source/gameplay/mechanics/video-parity-v1/key-token-orange-v1.png", output: "public/assets/art/gameplay/mechanics/video-parity-v1/key-token-orange-v1.png", width: 66, height: 84 },
  { source: "art-source/gameplay/mechanics/video-parity-v1/key-token-pink-v1.png", output: "public/assets/art/gameplay/mechanics/video-parity-v1/key-token-pink-v1.png", width: 66, height: 84 },
  { source: "art-source/gameplay/mechanics/video-parity-v1/key-token-cyan-v1.png", output: "public/assets/art/gameplay/mechanics/video-parity-v1/key-token-cyan-v1.png", width: 66, height: 84 },
  { source: "art-source/gameplay/mechanics/video-parity-v1/chain-lock-v1.png", output: "public/assets/art/gameplay/mechanics/video-parity-v1/chain-lock-v1.png", width: 62, height: 86 },
  { source: "art-source/gameplay/mechanics/video-parity-v1/chain-lock-red-v1.png", output: "public/assets/art/gameplay/mechanics/video-parity-v1/chain-lock-red-v1.png", width: 62, height: 86 },
  { source: "art-source/gameplay/mechanics/video-parity-v1/chain-lock-blue-v1.png", output: "public/assets/art/gameplay/mechanics/video-parity-v1/chain-lock-blue-v1.png", width: 62, height: 86 },
  { source: "art-source/gameplay/mechanics/video-parity-v1/chain-lock-green-v1.png", output: "public/assets/art/gameplay/mechanics/video-parity-v1/chain-lock-green-v1.png", width: 62, height: 85 },
  { source: "art-source/gameplay/mechanics/video-parity-v1/chain-lock-yellow-v1.png", output: "public/assets/art/gameplay/mechanics/video-parity-v1/chain-lock-yellow-v1.png", width: 62, height: 85 },
  { source: "art-source/gameplay/mechanics/video-parity-v1/chain-lock-orange-v1.png", output: "public/assets/art/gameplay/mechanics/video-parity-v1/chain-lock-orange-v1.png", width: 62, height: 86 },
  { source: "art-source/gameplay/mechanics/video-parity-v1/chain-lock-pink-v1.png", output: "public/assets/art/gameplay/mechanics/video-parity-v1/chain-lock-pink-v1.png", width: 62, height: 86 },
  { source: "art-source/gameplay/mechanics/video-parity-v1/chain-lock-cyan-v1.png", output: "public/assets/art/gameplay/mechanics/video-parity-v1/chain-lock-cyan-v1.png", width: 62, height: 86 },
  { source: "art-source/gameplay/mechanics/video-parity-v1/lift-frame-v1.png", output: "public/assets/art/gameplay/mechanics/video-parity-v1/lift-frame-v1.png", width: 512, height: 512, clearNearTransparentAlpha: true },
  { source: "art-source/gameplay/mechanics/video-parity-v1/timed-feeder-v1.png", output: "public/assets/art/gameplay/mechanics/video-parity-v1/timed-feeder-v1.png", width: 512, height: 384 },
  { source: "art-source/fx/particle-spark-v1.png", output: "public/assets/art/fx/particle-spark-v1.png", width: 128, height: 128 },
  { source: "art-source/fx/block-grab-halo-v1.png", output: "public/assets/art/fx/block-grab-halo-v1.png", width: 256, height: 256 },
  { source: "art-source/fx/blocker-focus-corners-v1.png", output: "public/assets/art/fx/blocker-focus-corners-v1.png", width: 256, height: 256 },
  { source: "art-source/fx/strategy-focus-corners-v1.png", output: "public/assets/art/fx/strategy-focus-corners-v1.png", width: 256, height: 256 },
  { source: "art-source/fx/mechanic-relay-mote-v1.png", output: "public/assets/art/fx/mechanic-relay-mote-v1.png", width: 128, height: 128 },
];

// This legacy exit-tail sprite was removed from gameplay. Clear any stale
// generated copy while retaining the original source file as an archive.
await rm(resolve(root, "public/assets/art/fx/exit-suction-trail-v1.png"), { force: true });

for (const { source, output, width, height, clearNearTransparentAlpha = false } of sprites) {
  const input = resolve(root, source);
  const target = resolve(root, output);
  const isKeyLockMarker = /video-parity-v1\/(?:key-token|chain-lock)(?:-[a-z]+)?-v1\.png$/.test(source);
  const pngOptions = isKeyLockMarker
    ? FORMAL_MECHANISM_PNG_OPTIONS
    : { compressionLevel: 9, adaptiveFiltering: true, palette: true, quality: 96 };
  await mkdir(dirname(target), { recursive: true });
  const resized = isKeyLockMarker
    ? sharp(input)
    : sharp(input).resize(width, height, {
        fit: "contain",
        position: "centre",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
        kernel: "lanczos3",
      });
  if (clearNearTransparentAlpha) {
    const { data, info } = await resized.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    // Image generation left alpha=1 noise across the lift's nominally empty
    // center. Normalize only those imperceptible pixels so the frame never
    // paints over the active layer below it.
    for (let index = 3; index < data.length; index += 4) {
      if (data[index] <= 1) data[index] = 0;
    }
    await sharp(data, { raw: info })
      .png(pngOptions)
      .toFile(target);
  } else {
    await resized
      .png(pngOptions)
      .toFile(target);
  }
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

// The project-supplied board border is authored on a 95px grid. Keep every
// slice byte-for-byte and let the renderer apply one uniform board transform;
// individual pieces must never be resized or re-encoded.
const formalBoardBorderAssets = [
  "neutral-rail-1-cell.png",
  "neutral-corner-inner.png",
  "neutral-corner-outer.png",
  "direction-arrow.png",
];
const formalBoardBorderSource = resolve(root, "art-source/gameplay/board/formal-border-v1");
const formalBoardBorderTarget = resolve(root, "public/assets/art/gameplay/board/formal-border-v1");
await mkdir(formalBoardBorderTarget, { recursive: true });
for (const name of [
  "exit-red-2-cell.png", "exit-blue-2-cell.png", "exit-green-2-cell.png", "exit-yellow-2-cell.png",
  "exit-purple-2-cell.png", "exit-orange-2-cell.png", "exit-pink-2-cell.png", "exit-cyan-2-cell.png",
]) {
  await rm(resolve(formalBoardBorderTarget, name), { force: true });
}
for (const name of formalBoardBorderAssets) {
  await copyFile(resolve(formalBoardBorderSource, name), resolve(formalBoardBorderTarget, name));
  console.log(`Copied native-size formal board border ${name}.`);
}
// Formal border V2 and ice strips are approved authored assets. Mirror every
// runtime PNG directly from art-source; never derive colors, rotate, resize,
// or re-encode them. The border reference remains source-only guidance.
const formalBoardBorderV2ExpectedNames = [
  "corner-north-east.png",
  "corner-north-west.png",
  "corner-south-east.png",
  "corner-south-west.png",
  ...["horizontal", "vertical"].flatMap((orientation) =>
    [1, 2, 3].map((length) => `neutral-${orientation}-${length}.png`)),
  ...["red", "blue", "green", "yellow", "purple", "orange", "pink", "cyan"].flatMap((color) =>
    ["horizontal", "vertical"].flatMap((orientation) =>
      [1, 2, 3].map((length) => `gate-${color}-${orientation}-${length}.png`))),
];
const formalBoardBorderV2Names = await mirrorPngDirectory(
  "art-source/gameplay/board/formal-border-v2",
  "public/assets/art/gameplay/board/formal-border-v2",
  { exclude: ["reference.png"], expectedNames: formalBoardBorderV2ExpectedNames },
);
console.log(`Copied ${formalBoardBorderV2Names.length} native-size formal board border V2 assets byte-for-byte.`);

const formalIceExpectedNames = [
  ...["horizontal", "vertical"].flatMap((orientation) =>
    [1, 2, 3].map((length) => `ice-${orientation}-${length}.png`)),
];
const formalIceNames = await mirrorPngDirectory(
  "art-source/gameplay/mechanics/formal-ice-v1",
  "public/assets/art/gameplay/mechanics/formal-ice-v1",
  { expectedNames: formalIceExpectedNames },
);
console.log(`Copied ${formalIceNames.length} native-size formal ice assets byte-for-byte.`);

// Star blocks, star gates, and the two native generator orientations are
// supplied as transparent, authored cut-outs. Keep them byte-for-byte so the
// renderer can layer them over the coloured base art and designers can swap
// each role independently later.
const formalStarBlockNames = await mirrorPngDirectory(
  "art-source/gameplay/mechanics/formal-star-v1",
  "public/assets/art/gameplay/mechanics/formal-star-v1",
  { transform: "png-palette-256-q95" },
);
console.log(`Prepared ${formalStarBlockNames.length} compact formal star-block overlays with deterministic palette encoding.`);
const formalStarGateNames = await mirrorPngDirectory(
  "art-source/gameplay/board/formal-star-v1",
  "public/assets/art/gameplay/board/formal-star-v1",
  { transform: "png-palette-256-q95" },
);
console.log(`Prepared ${formalStarGateNames.length} compact formal star-gate overlays with deterministic palette encoding.`);
const formalGeneratorNames = await mirrorPngDirectory(
  "art-source/gameplay/mechanics/formal-generator-v1",
  "public/assets/art/gameplay/mechanics/formal-generator-v1",
  { transform: "png-palette-256-q95" },
);
console.log(`Prepared ${formalGeneratorNames.length} compact native generator orientations with deterministic palette encoding.`);
await rm(
  resolve(root, "public/assets/art/gameplay/mechanics/video-parity-v1/side-generator-horizontal-3-v1.png"),
  { force: true },
);
for (const legacy of [
  "public/assets/art/gameplay/board/board-rim-rail-v1.png",
  "public/assets/art/gameplay/board/board-rim-corner-v1.png",
  "public/assets/art/gameplay/gates/red-circle-gate-v1.png",
  "public/assets/art/gameplay/gates/blue-diamond-gate-v1.png",
  "public/assets/art/gameplay/gates/green-triangle-gate-v1.png",
  "public/assets/art/gameplay/gates/yellow-square-gate-v1.png",
  "public/assets/art/gameplay/gates/purple-sparkle-gate-v1.png",
  "public/assets/art/gameplay/gates/orange-hexagon-gate-v1.png",
  "public/assets/art/gameplay/gates/pink-heart-gate-v1.png",
  "public/assets/art/gameplay/gates/cyan-plus-gate-v1.png",
]) await rm(resolve(root, legacy), { force: true });

for (const retired of [
  "red-circle-v1.png", "blue-diamond-v1.png", "green-triangle-v1.png", "yellow-square-v1.png",
  "purple-sparkle-v1.png", "orange-hexagon-v1.png", "pink-heart-v1.png", "cyan-plus-v1.png",
  "red-plain-v1.png", "blue-plain-v1.png", "green-plain-v1.png", "yellow-plain-v1.png",
  "purple-plain-v1.png", "orange-plain-v1.png", "pink-plain-v1.png", "cyan-plain-v1.png",
]) await rm(resolve(root, "public/assets/art/gameplay/blocks", retired), { force: true });
await rm(resolve(root, "public/assets/art/gameplay/connectors"), { recursive: true, force: true });

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
