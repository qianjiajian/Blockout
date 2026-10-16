import { createHash } from "node:crypto";
import { access, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { listFiles, snapshotDirectory } from "./wechat-build-integrity.mjs";
import sharp from "sharp";


// Native WeChat Image does not have the same format support as Chromium.
// Keep Web URLs untouched, but make all shipping WeChat image URLs PNG/JPEG.
export const wechatImagePath = (path) => path.replace(/\.webp$/i, ".png")
  .replace(/(league-video-v1\/background)\.png$/, '$1.jpg');
export const wechatArtManifestSource = (source) => source.replace(/\.webp(["'`])/g, ".png$1")
  .replace(/(league-video-v1\/background)\.png(["'`])/g, '$1.jpg$2');

// WeChat-only, same-dimension delivery encoding. Keep the historical audit
// separate from later, explicitly approved asset lists; never rewrite sources.
// This is explicitly lossy color quantization, not an RGBA-lossless claim.
// Gameplay block textures and all authored/Web images retain their old policy.
export const WECHAT_EVENT_IMAGE_ENCODING = Object.freeze({
  background: { format: 'jpeg', quality: 85, chromaSubsampling: '4:2:0' },
  transparentUi: { format: 'png', palette: true, colours: 256, quality: 100, effort: 7, dither: 1 },
  resize: false,
  // User approved these 40 supplied images on 2026-10-15 after reviewing the
  // lossy 256-colour trial. Exact filenames exclude future art and frame 19.
  suppliedUiDelivery: {
    approvedOn: '2026-10-15',
    png: { compressionLevel: 9, palette: true, colours: 256, quality: 100, effort: 7, dither: 1 },
    pngPaths: [
      ...['arrow', 'back-button', 'bronze', 'claim-button', 'coin', 'diamond',
        'divider', 'emerald', 'glory', 'glow', 'gold', 'master', 'platinum',
        'rank-icon', 'result-panel', 'score-icon', 'silver-hero', 'silver',
        'sparkles', 'stage-panel', 'star'].map(name => `league-settlement-supplied-v1/${name}.png`),
      ...Array.from({ length: 19 }, (_, index) => `profile-frames-supplied-v1/frame-${index}.png`),
    ],
  },
  auditedDelivery: {
    ruleVersion: '1.197.0',
    png: { compressionLevel: 9, palette: true, colours: 256, quality: 100, effort: 7, dither: 1 },
    jpeg: { quality: 85, mozjpeg: true, chromaSubsampling: '4:2:0' },
    pngPaths: [
      'booster-purchase-reference-v1/panel.png',
      'league-supplied-v1/stage-background.png',
      'life-refill-reference-v1/panel.png',
      'daily-challenge-supplied-v1/reward-banner.png',
      'daily-success-supplied-v1/panel.png',
      'journey/destination.png',
      'overlays/win/glow.png',
      'journey/presentation-panel.png',
      'overlays/win/panel.png',
      ...['diamond', 'glory', 'platinum', 'master', 'emerald', 'gold', 'bronze', 'silver'].map(name => `league-rank-badges-v2/${name}.png`),
      'journey/title-journey-rewards.png',
      'journey/title-episode-unlocked.png',
      'home-v3/league-entry.png',
      'journey/presentation-reward-coins.png',
      'home-v3/daily-challenge-entry.png',
      'leaderboard/podium.png',
      'home-v3/start-button.png',
      'profile-reference-v1/header.png',
      'mechanism-guide-v2/panel.png',
      'overlays/status/clock.png',
      'overlays/status/feature-ice-door.png',
      'daily-tasks-v2/task-row.png',
      'daily-challenge-supplied-v1/panel-frame.png',
    ],
    // Formal-page overlays are transparent UI slices. Their authored PNGs
    // remain unchanged for Web; WeChat receives the same-dimension indexed
    // delivery encoding so the newly added popup/profile art does not push
    // the package beyond the 20 MiB upload ceiling.
    palettePrefixes: [
      'achievements-v2/',
      'collection/',
      'collection-album-v2/',
      'collection-album-v3/',
      'daily-tasks-v2/',
      'feature-unlock-supplied-v1/',
      'home-v3/',
      'journey/',
      'league-supplied-v1/',
      'leaderboard/',
      'mechanism-guide-v2/',
      'overlays/',
      'shop-supplied-v1/',
      'shop/',
      'supplied-popups-v1/',
    ],
    jpegPaths: [
      'league-video-v1/background.jpg',
      ...Array.from({ length: 9 }, (_, index) => `journey/home-${String(index + 2).padStart(2, '0')}.jpg`),
      'home-v3/background.jpg',
      'journey/background.jpg',
    ],
    // Already shared before v1.197. Both generated copies must receive the same
    // encoding before the byte-equality guard removes the alias.
    pngAliases: { 'overlays/win/coin-pile.png': 'journey/presentation-reward-coins.png' },
    keepSmallerExistingEncoding: true,
  },
});
// Accept only the known relocation prefixes, never arbitrary basename matches.
export function wechatDeliveryImageKey(path) {
  let key = path.replaceAll('\\', '/').replace(/^public\/assets\//, '').replace(/^assets\//, '')
    .replace(/^art\/ui\//, '').replace(/^meta-ui\/formal-pages\//, '').replace(/^formal-pages\//, '')
    .replace(/^(?:event-ui|league-ui)\//, '').replace(/^journey-themes\//, 'journey/');
  key = key.replace(/^(league-video-v1\/background)\.png$/, '$1.jpg');
  return WECHAT_EVENT_IMAGE_ENCODING.auditedDelivery.pngAliases[key] ?? key;
}
const eventUiPng = path => /(?:^|\/)(?:league-video-v1|daily-challenge-v2)\/[^/]+\.png$/.test(path)
  || /(?:^|\/)tutorial-hand-supplied-v2\.png$/.test(path);

const pngOptions = { compressionLevel: 9, palette: true, colours: 256, quality: 95, effort: 10 };
const jpegOptions = { quality: 90, mozjpeg: true };
// These two large background images recover the extra bytes needed by PNG.
// Dimensions stay unchanged; the authored and Web versions are not rewritten.
const compactTheme = (path) => /(?:^|\/)home-0[78]\.jpg$/.test(path);

const losslessPngCache = new Map();
const losslessPngOptions = [
  { compressionLevel: 9, adaptiveFiltering: true, palette: false },
  { compressionLevel: 9, adaptiveFiltering: false, palette: false },
  // An indexed encoding is eligible ONLY if its entire decoded RGBA is exact.
  // quality:100 is not a proof of losslessness; the comparison below is.
  { compressionLevel: 9, palette: true, colours: 256, quality: 100, effort: 7, dither: 0 },
];

/** Only optimizes encoded bytes; every chosen candidate keeps all RGBA pixels. */
export async function optimizeWechatPng(source) {
  const key = createHash("sha256").update(source).digest("hex");
  let pending = losslessPngCache.get(key);
  if (!pending) {
    // Buffer ownership stays here, so callers cannot mutate a cached result or
    // change the input while another deterministic snapshot shares this job.
    const original = Buffer.from(source);
    pending = (async () => {
      const pixels = await sharp(original).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      let best = original;
      for (const options of losslessPngOptions) {
        const encoded = await sharp(original).png(options).toBuffer();
        if (encoded.length >= best.length) continue;
        const decoded = await sharp(encoded).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        if (decoded.info.width !== pixels.info.width || decoded.info.height !== pixels.info.height
          || decoded.info.channels !== pixels.info.channels || !decoded.data.equals(pixels.data)) continue;
        best = encoded;
      }
      return best;
    })();
    losslessPngCache.set(key, pending);
    pending.catch(() => losslessPngCache.delete(key));
  }
  return Buffer.from(await pending);
}

export async function encodeWechatImage(source, path) {
  const audited = WECHAT_EVENT_IMAGE_ENCODING.auditedDelivery;
  const supplied = WECHAT_EVENT_IMAGE_ENCODING.suppliedUiDelivery;
  const key = wechatDeliveryImageKey(path);
  if (/(?:^|\/)league-video-v1\/background\.png$/.test(path)) {
    const bytes = await readFile(source);
    const stats = await sharp(bytes).stats();
    if (!stats.isOpaque) throw new Error('League JPEG background must be fully opaque');
    const [encoded, previous] = await Promise.all([
      sharp(bytes).jpeg(audited.jpeg).toBuffer(),
      sharp(bytes).jpeg({ quality: 95, mozjpeg: true, chromaSubsampling: '4:2:0' }).toBuffer(),
    ]);
    return encoded.length < previous.length ? encoded : previous;
  }
  const paletteEncoding = supplied.pngPaths.includes(key) ? supplied.png
    : audited.pngPaths.includes(key) || audited.palettePrefixes.some(prefix => key.startsWith(prefix)) ? audited.png
      : undefined;
  if (paletteEncoding && /\.png$/i.test(path)) {
    const bytes = await readFile(source);
    const encoded = await sharp(bytes).png(paletteEncoding).toBuffer();
    const [before, after] = await Promise.all([sharp(bytes).metadata(), sharp(encoded).metadata()]);
    if (before.width !== after.width || before.height !== after.height) throw new Error('Audited image dimensions changed');
    const [candidate, previous] = await Promise.all([optimizeWechatPng(encoded), optimizeWechatPng(bytes)]);
    return candidate.length < previous.length ? candidate : previous;
  }
  if (audited.jpegPaths.includes(key) && /\.jpg$/i.test(path)) {
    const bytes = await readFile(source);
    if (!(await sharp(bytes).stats()).isOpaque) throw new Error('Audited JPEG background must be fully opaque');
    const encoded = await sharp(bytes).jpeg(audited.jpeg).toBuffer();
    const previous = compactTheme(path) ? await sharp(bytes).jpeg(jpegOptions).toBuffer() : bytes;
    return encoded.length < previous.length ? encoded : previous;
  }
  if (eventUiPng(path)) {
    const bytes = await readFile(source);
    const encoded = await sharp(bytes).png({ compressionLevel: 9, palette: true, colours: 256, quality: 100, effort: 7, dither: 1 }).toBuffer();
    const [before, after] = await Promise.all([sharp(bytes).metadata(), sharp(encoded).metadata()]);
    if (before.width !== after.width || before.height !== after.height) throw new Error('Event image dimensions changed');
    return optimizeWechatPng(encoded);
  }
  // Buffer input keeps libvips' file cache from locking generated assets on
  // Windows when the old WebP is removed or a JPEG is replaced after encoding.
  if (/\.webp$/i.test(path)) {
    // Keep the existing native conversion contract, then losslessly optimize
    // that PNG. Do not silently alter its already-approved pixel encoding.
    const native = await sharp(await readFile(source)).png(pngOptions).toBuffer();
    return optimizeWechatPng(native);
  }
  if (/\.png$/i.test(path)) return optimizeWechatPng(await readFile(source));
  if (compactTheme(path)) return sharp(await readFile(source)).jpeg(jpegOptions).toBuffer();
  return undefined;
}

export async function prepareWechatImages(output) {
  let pngCount = 0;
  let compactedCount = 0;
  let optimizedPngCount = 0;
  for (const path of await listFiles(output)) {
    const source = resolve(output, path);
    const encoded = await encodeWechatImage(source, path);
    if (!encoded) continue;
    const target = resolve(output, wechatImagePath(path));
    if (source !== target) {
      let targetExists = false;
      try { await access(target); targetExists = true; } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
      if (targetExists) throw new Error(`WeChat image conversion would overwrite ${path}: ${target}`);
    }
    await writeFile(target, encoded);
    if (source !== target) {
      await rm(source);
      if (/\.webp$/i.test(path)) pngCount += 1;
      else compactedCount += 1;
    } else if (/\.png$/i.test(path)) optimizedPngCount += 1;
    else compactedCount += 1;
  }
  return { pngCount, compactedCount, optimizedPngCount };
}

// Verification compares against the deterministic encoding, not just renamed
// files. A missing conversion, stale image or PNG containing WebP bytes fails.
export async function snapshotWechatAssetSource(directory) {
  const records = await snapshotDirectory(directory);
  for (const record of records) {
    const encoded = await encodeWechatImage(resolve(directory, record.path), record.path);
    if (!encoded) continue;
    record.path = wechatImagePath(record.path);
    record.bytes = encoded.length;
    record.sha256 = createHash("sha256").update(encoded).digest("hex");
  }
  return records.sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
}
