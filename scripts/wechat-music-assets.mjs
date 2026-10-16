import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { optimizeWechatPng } from "./wechat-image-formats.mjs";

// The authored music-player art is intentionally large enough for the Web
// build. WeChat loads this UI on demand, so keep a compact, same-ratio copy in
// the menu-music subpackage without changing the public assets used by Vite.
// The dimensions are tuned for the 496x880 logical artboard; all images retain
// their original aspect ratio and transparent pixels.
export const WECHAT_MUSIC_ART_SPECS = Object.freeze({
  "music-background.png": [360, 640],
  "music-panel-frame.png": [384, 576],
  "music-player-deck.png": [500, 167],
  "music-header-banner.png": [500, 167],
  "music-vinyl-disc.png": [256, 256],
  "music-vinyl-tonearm.png": [256, 256],
  "music-progress-track.png": [500, 167],
  "music-progress-fill.png": [400, 200],
  "music-progress-knob.png": [96, 96],
  "music-row-selected.png": [500, 167],
  "music-row-locked.png": [500, 167],
  "music-status-unlocked.png": [400, 200],
  "music-status-locked.png": [400, 200],
  "music-lock-icon.png": [128, 128],
  "music-equalizer-icon.png": [96, 96],
  "music-close-button.png": [128, 128],
  "music-play-button.png": [160, 160],
  "music-prev-button.png": [128, 128],
  "music-skip-button.png": [128, 128],
  "music-entry-icon.png": [128, 128],
  "music-volume-icon.png": [96, 96],
  "album-desert-dawn.png": [128, 128],
  "album-lighthouse-bay.png": [128, 128],
  "album-starry-journey.png": [128, 128],
  "album-forest-stream.png": [128, 128],
});

const resizedPng = async (source, width, height) => {
  const resized = await sharp(await readFile(source))
    .resize({ width, height, fit: "inside", withoutEnlargement: true })
    .png({ compressionLevel: 9, adaptiveFiltering: true, palette: true, quality: 100, effort: 10, dither: 0 })
    .toBuffer();
  return optimizeWechatPng(resized);
};

export async function prepareWechatMusicAssets(sourceDirectory, outputDirectory) {
  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(outputDirectory, { recursive: true });
  for (const [name, [width, height]] of Object.entries(WECHAT_MUSIC_ART_SPECS)) {
    const source = resolve(sourceDirectory, name);
    const output = resolve(outputDirectory, name);
    await writeFile(output, await resizedPng(source, width, height));
  }
}

export async function snapshotWechatMusicAssets(sourceDirectory) {
  const snapshots = [];
  for (const [name, [width, height]] of Object.entries(WECHAT_MUSIC_ART_SPECS)) {
    const source = resolve(sourceDirectory, name);
    const encoded = await resizedPng(source, width, height);
    snapshots.push({
      path: `music-player-v1/${name}`,
      bytes: encoded.length,
      sha256: createHash("sha256").update(encoded).digest("hex"),
    });
  }
  return snapshots.sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
}
