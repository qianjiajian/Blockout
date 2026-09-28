import { createHash } from "node:crypto";
import { access, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { listFiles, snapshotDirectory } from "./wechat-build-integrity.mjs";
import sharp from "sharp";


// Native WeChat Image does not have the same format support as Chromium.
// Keep Web URLs untouched, but make all shipping WeChat image URLs PNG/JPEG.
export const wechatImagePath = (path) => path.replace(/\.webp$/i, ".png");
export const wechatArtManifestSource = (source) => source.replace(/\.webp(["'`])/g, ".png$1");

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
      pngCount += 1;
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
