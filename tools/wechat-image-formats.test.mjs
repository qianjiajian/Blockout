import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, cp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import test from "node:test";
import sharp from "sharp";
import { snapshotDirectory } from "../scripts/wechat-build-integrity.mjs";
import {
  encodeWechatImage,
  optimizeWechatPng,
  prepareWechatImages,
  snapshotWechatAssetSource,
} from "../scripts/wechat-image-formats.mjs";

const pixels = async (image) => sharp(image).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
async function assertSamePixels(left, right) {
  const [a, b] = await Promise.all([pixels(left), pixels(right)]);
  assert.equal(a.info.width, b.info.width);
  assert.equal(a.info.height, b.info.height);
  assert.equal(a.info.channels, b.info.channels);
  assert.deepEqual(a.data, b.data);
}
async function withDirectory(callback) {
  const parent = resolve(tmpdir());
  const directory = await mkdtemp(join(parent, "blockout-wechat-png-"));
  try { await callback(directory); } finally {
    // Only remove this test's freshly created, validated temporary directory.
    assert.equal(dirname(resolve(directory)), parent);
    assert.ok(basename(directory).startsWith("blockout-wechat-png-"));
    await rm(directory, { recursive: true, force: true });
  }
}
async function fixturePng(highColor = false) {
  const width = 80;
  const height = 64;
  const raw = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    raw[i * 4] = highColor ? i % 256 : 160;
    raw[i * 4 + 1] = highColor ? Math.floor(i / 256) * 11 : 40;
    raw[i * 4 + 2] = highColor ? (i * 37) % 256 : 220;
    raw[i * 4 + 3] = highColor ? (i * 17) % 256 : (i % 5 ? 255 : 0);
  }
  return sharp(raw, { raw: { width, height, channels: 4 } }).png({ compressionLevel: 0, palette: false }).toBuffer();
}

test("PNG selection saves bytes while preserving exact RGBA including transparent RGB", async () => {
  const source = await fixturePng();
  const before = Buffer.from(source);
  const result = await optimizeWechatPng(source);
  assert.ok(result.length < source.length);
  await assertSamePixels(source, result);
  assert.deepEqual(source, before);
});

test("a >256-colour image cannot be silently palette-quantized", async () => {
  const source = await fixturePng(true);
  const original = await pixels(source);
  const colors = new Set();
  for (let i = 0; i < original.data.length; i += 4) colors.add(original.data.subarray(i, i + 4).toString("hex"));
  assert.ok(colors.size > 256);
  const result = await optimizeWechatPng(source);
  await assertSamePixels(source, result);
  assert.ok(result.length <= source.length);
});

test("content-addressed cache is deterministic and caller buffer mutation cannot corrupt it", async () => {
  const source = await fixturePng(true);
  const [first, second] = await Promise.all([optimizeWechatPng(source), optimizeWechatPng(Buffer.from(source))]);
  assert.deepEqual(first, second);
  assert.notEqual(first, second);
  first.fill(0);
  assert.deepEqual(await optimizeWechatPng(source), second);
  await assertSamePixels(source, second);
});

test("invalid PNG input fails closed on every attempt", async () => {
  const invalid = Buffer.from("this is not a PNG");
  await assert.rejects(optimizeWechatPng(invalid));
  await assert.rejects(optimizeWechatPng(invalid));
});

test("build and source snapshot share the exact encoding without changing the original PNG", async () => {
  await withDirectory(async (directory) => {
    const sourceDir = join(directory, "source");
    const outputDir = join(directory, "output");
    await mkdir(sourceDir);
    const original = await fixturePng();
    await writeFile(join(sourceDir, "leaf.png"), original);
    await writeFile(join(sourceDir, "required.json"), "{\"required\":true}");
    await cp(sourceDir, outputDir, { recursive: true });
    const expected = await snapshotWechatAssetSource(sourceDir);
    const result = await prepareWechatImages(outputDir);
    assert.deepEqual(result, { pngCount: 0, compactedCount: 0, optimizedPngCount: 1 });
    assert.deepEqual(await snapshotDirectory(outputDir), expected);
    assert.deepEqual(await readFile(join(sourceDir, "leaf.png")), original);
    assert.notDeepEqual(await readFile(join(outputDir, "leaf.png")), original);
  });
});

test("existing WebP native conversion pixels remain unchanged by subsequent lossless optimization", async () => {
  await withDirectory(async (directory) => {
    const source = join(directory, "gate.webp");
    const webp = await sharp(await fixturePng(true)).webp({ lossless: true }).toBuffer();
    await writeFile(source, webp);
    const oldNative = await sharp(webp).png({ compressionLevel: 9, palette: true, colours: 256, quality: 95, effort: 10 }).toBuffer();
    const expected = await snapshotWechatAssetSource(directory);
    const encoded = await encodeWechatImage(source, "gate.webp");
    await assertSamePixels(oldNative, encoded);
    const result = await prepareWechatImages(directory);
    assert.deepEqual(result, { pngCount: 1, compactedCount: 0, optimizedPngCount: 0 });
    assert.deepEqual(await snapshotDirectory(directory), expected);
    await assert.rejects(readFile(source), { code: "ENOENT" });
    assert.deepEqual(await readFile(join(directory, "gate.png")), encoded);
  });
});

test("missing and changed images remain snapshot failures rather than being filtered out", async () => {
  await withDirectory(async (directory) => {
    const png = join(directory, "required.png");
    await writeFile(png, await fixturePng());
    const expected = await snapshotWechatAssetSource(directory);
    await prepareWechatImages(directory);
    assert.deepEqual(await snapshotDirectory(directory), expected);
    await writeFile(png, await fixturePng(true));
    assert.notDeepEqual(await snapshotDirectory(directory), expected);
    await rm(png);
    assert.notDeepEqual(await snapshotDirectory(directory), expected);
  });
});

test("conversion refuses to overwrite a separately authored PNG with the same basename", async () => {
  await withDirectory(async (directory) => {
    const png = await fixturePng();
    await writeFile(join(directory, "gate.png"), png);
    await writeFile(join(directory, "gate.webp"), await sharp(png).webp().toBuffer());
    await assert.rejects(prepareWechatImages(directory), /would overwrite/);
  });
});
