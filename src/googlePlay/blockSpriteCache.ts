interface SpriteEntry {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  bytes: number;
}

interface OwnerCache {
  level: object;
  width: number;
  height: number;
  baseTransform: string;
  entries: Map<string, SpriteEntry>;
  failed: Set<string>;
  bytes: number;
}

const MAX_BYTES = 8 * 1024 * 1024;
const MAX_ENTRIES = 128;
const MAX_ENTRY_PIXELS = 256 * 1024;
const MAX_EDGE = 1024;
const caches = new WeakMap<HTMLCanvasElement, OwnerCache>();
const scopes = new WeakMap<CanvasRenderingContext2D, OwnerCache | undefined>();
const imageIds = new WeakMap<HTMLImageElement, number>();
let nextImageId = 1;

function release(entry: SpriteEntry): void {
  // Release backing pixels promptly; the old canvas is never used afterwards.
  entry.canvas.width = 0;
  entry.canvas.height = 0;
}

function clear(cache: OwnerCache): void {
  for (const entry of cache.entries.values()) release(entry);
  cache.entries.clear();
  cache.failed.clear();
  cache.bytes = 0;
}

/** Opt in only from the unclipped, stationary main-board block pass. Ghosts,
 * selected/settling blocks, lift reveals and spawn proxies never enter it. */
export function withGooglePlayBlockSpriteCache(
  context: CanvasRenderingContext2D,
  level: object,
  enabled: boolean,
  draw: () => void,
): void {
  const previous = scopes.get(context);
  let cache: OwnerCache | undefined;
  if (enabled && typeof context.getTransform === "function") {
    const owner = context.canvas;
    const transform = context.getTransform();
    const baseTransform = [transform.a, transform.b, transform.c, transform.d].join(",");
    cache = caches.get(owner);
    if (!cache) {
      cache = { level, width: owner.width, height: owner.height, baseTransform,
        entries: new Map(), failed: new Set(), bytes: 0 };
      caches.set(owner, cache);
    } else if (cache.level !== level || cache.width !== owner.width
      || cache.height !== owner.height || cache.baseTransform !== baseTransform) {
      clear(cache);
      cache.level = level;
      cache.width = owner.width;
      cache.height = owner.height;
      cache.baseTransform = baseTransform;
    }
  }
  scopes.set(context, cache);
  try { draw(); }
  finally {
    if (previous) scopes.set(context, previous);
    else scopes.delete(context);
  }
}

/** Cache exactly one source-over image and its existing shadow. Inner body,
 * shell and ice remain separate calls in their original painter order. */
export function drawGooglePlayBlockSprite(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
): void {
  const original = (): void => { context.drawImage(image, x, y); };
  const cache = scopes.get(context);
  if (!cache || !image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0
    || context.shadowBlur <= 0 || context.globalAlpha <= 0
    || context.globalCompositeOperation !== "source-over"
    || (context.filter && context.filter !== "none")) {
    original();
    return;
  }
  const owner = context.canvas;
  const document = owner.ownerDocument;
  const imageWidth = image.naturalWidth || image.width;
  const imageHeight = image.naturalHeight || image.height;
  const t = context.getTransform();
  // Legacy quarter-turn/reflected art keeps the browser's original raster path:
  // flattening its resampling can visibly change partially transparent edges.
  if (t.b !== 0 || t.c !== 0 || t.a <= 0 || t.d <= 0) {
    original();
    return;
  }
  const originX = t.a * x + t.c * y + t.e;
  const originY = t.b * x + t.d * y + t.f;
  const edgeXX = t.a * imageWidth, edgeXY = t.b * imageWidth;
  const edgeYX = t.c * imageHeight, edgeYY = t.d * imageHeight;
  const pad = context.shadowBlur * 2 + 4;
  const left = Math.floor(originX + Math.min(0, edgeXX) + Math.min(0, edgeYX)
    + Math.min(0, context.shadowOffsetX) - pad);
  const top = Math.floor(originY + Math.min(0, edgeXY) + Math.min(0, edgeYY)
    + Math.min(0, context.shadowOffsetY) - pad);
  const right = Math.ceil(originX + Math.max(0, edgeXX) + Math.max(0, edgeYX)
    + Math.max(0, context.shadowOffsetX) + pad);
  const bottom = Math.ceil(originY + Math.max(0, edgeXY) + Math.max(0, edgeYY)
    + Math.max(0, context.shadowOffsetY) + pad);
  const width = right - left, height = bottom - top;
  if (!document || !Number.isFinite(left + top + width + height)
    || width <= 0 || height <= 0 || width > MAX_EDGE || height > MAX_EDGE
    || width * height > MAX_ENTRY_PIXELS || left < 0 || top < 0
    || right > owner.width || bottom > owner.height
    || t.a * t.d - t.b * t.c === 0) {
    original();
    return;
  }

  let imageId = imageIds.get(image);
  if (imageId === undefined) { imageId = nextImageId++; imageIds.set(image, imageId); }
  // Include exact fractional alignment, not whole-screen translation. No
  // selected animation coordinates enter this map, and no values are rounded.
  const key = JSON.stringify([imageId, image.currentSrc || image.src, imageWidth, imageHeight,
    x, y, t.a, t.b, t.c, t.d, t.e - left, t.f - top, width, height,
    context.shadowColor, context.shadowBlur, context.shadowOffsetX, context.shadowOffsetY,
    context.globalAlpha, context.imageSmoothingEnabled, context.imageSmoothingQuality]);
  let entry = cache.entries.get(key);
  if (entry && typeof entry.context.isContextLost === "function" && entry.context.isContextLost()) {
    cache.entries.delete(key);
    cache.bytes -= entry.bytes;
    release(entry);
    entry = undefined;
  }
  if (!entry) {
    if (cache.failed.has(key)) { original(); return; }
    const bytes = width * height * 4;
    while (cache.entries.size >= MAX_ENTRIES || cache.bytes + bytes > MAX_BYTES) {
      const oldest = cache.entries.keys().next().value;
      if (oldest === undefined) break;
      const stale = cache.entries.get(oldest)!;
      cache.entries.delete(oldest);
      cache.bytes -= stale.bytes;
      release(stale);
    }
    let canvas: HTMLCanvasElement | undefined;
    try {
      canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const scratch = canvas.getContext("2d");
      if (!scratch || (typeof scratch.isContextLost === "function" && scratch.isContextLost())) {
        throw new Error("Static sprite canvas unavailable");
      }
      scratch.setTransform(t.a, t.b, t.c, t.d, t.e - left, t.f - top);
      scratch.globalAlpha = context.globalAlpha;
      scratch.shadowColor = context.shadowColor;
      scratch.shadowBlur = context.shadowBlur;
      scratch.shadowOffsetX = context.shadowOffsetX;
      scratch.shadowOffsetY = context.shadowOffsetY;
      scratch.imageSmoothingEnabled = context.imageSmoothingEnabled;
      scratch.imageSmoothingQuality = context.imageSmoothingQuality;
      scratch.drawImage(image, x, y);
      entry = { canvas, context: scratch, bytes };
      cache.entries.set(key, entry);
      cache.bytes += bytes;
    } catch {
      if (canvas) { canvas.width = 0; canvas.height = 0; }
      // Bound failure memory and avoid retrying the same failed allocation on
      // every frame. A level/resize epoch allows recovery.
      if (cache.failed.size >= MAX_ENTRIES) cache.failed.delete(cache.failed.values().next().value!);
      cache.failed.add(key);
      original();
      return;
    }
  } else {
    cache.entries.delete(key);
    cache.entries.set(key, entry);
  }

  context.save();
  try {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.globalAlpha = 1;
    context.shadowColor = "rgba(0,0,0,0)";
    context.shadowBlur = 0;
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 0;
    context.drawImage(entry.canvas, left, top);
  } finally { context.restore(); }
}
