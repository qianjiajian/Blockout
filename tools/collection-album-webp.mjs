import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp");

export const COLLECTION_ALBUM_WEBP_TRANSFORM = "webp-q72";

export const COLLECTION_ALBUM_WEBP_OPTIONS = Object.freeze({
  quality: 72,
  alphaQuality: 100,
  effort: 6,
  smartSubsample: true,
});

const isOpaqueBlack = (data, pixelIndex) => {
  const offset = pixelIndex * 4;
  return data[offset] === 0
    && data[offset + 1] === 0
    && data[offset + 2] === 0
    && data[offset + 3] === 255;
};

/**
 * ImageGen cutouts occasionally carry an exactly-black opaque export guard on
 * one canvas edge. Only the four-connected black component touching an outer
 * edge is cleared; black details enclosed by the artwork remain untouched.
 */
export const normalizeCollectionAlbumAlpha = async (source) => {
  const { data, info } = await sharp(source)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (info.channels !== 4) throw new Error(`Expected RGBA Collection Album source, got ${info.channels} channels`);

  const pixelCount = info.width * info.height;
  const queued = new Uint8Array(pixelCount);
  const queue = new Int32Array(pixelCount);
  let head = 0;
  let tail = 0;
  const enqueue = (pixelIndex) => {
    if (queued[pixelIndex] || !isOpaqueBlack(data, pixelIndex)) return;
    queued[pixelIndex] = 1;
    queue[tail] = pixelIndex;
    tail += 1;
  };

  for (let x = 0; x < info.width; x += 1) {
    enqueue(x);
    enqueue((info.height - 1) * info.width + x);
  }
  for (let y = 1; y < info.height - 1; y += 1) {
    enqueue(y * info.width);
    enqueue(y * info.width + info.width - 1);
  }

  while (head < tail) {
    const pixelIndex = queue[head];
    head += 1;
    const x = pixelIndex % info.width;
    const y = Math.floor(pixelIndex / info.width);
    data[pixelIndex * 4 + 3] = 0;
    if (x > 0) enqueue(pixelIndex - 1);
    if (x + 1 < info.width) enqueue(pixelIndex + 1);
    if (y > 0) enqueue(pixelIndex - info.width);
    if (y + 1 < info.height) enqueue(pixelIndex + info.width);
  }

  return {
    data,
    width: info.width,
    height: info.height,
    removedBorderPixels: tail,
  };
};

export const encodeCollectionAlbumWebp = async (source) => {
  const normalized = await normalizeCollectionAlbumAlpha(source);
  return sharp(normalized.data, {
    raw: {
      width: normalized.width,
      height: normalized.height,
      channels: 4,
    },
  })
    .webp(COLLECTION_ALBUM_WEBP_OPTIONS)
    .toBuffer();
};
