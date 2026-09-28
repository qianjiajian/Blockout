import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import sharp from "sharp";
import {
  LARGE_IMAGE_POLICIES,
  LARGE_IMAGE_TRANSFORM,
  assertLargeImageGeometry,
  encodeLargeImage,
  findLargeImagePolicy,
  largeImageSourcePixels,
} from "./large-image-encoding.mjs";

const root = resolve(import.meta.dirname, "..");
const sha = (buffer) => createHash("sha256").update(buffer).digest("hex");
const syntheticPolicy = (format, overrides = {}) => ({
  source: "fixture.png", runtime: format === "jpeg" ? "fixture.jpg" : "fixture.png",
  width: 80, height: 64, format, quality: 95, chromaSubsampling: "4:4:4", ...overrides,
});

async function fixture({ transparent = false, width = 80, height = 64 } = {}) {
  const data = Buffer.alloc(width * height * 4);
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    data[pixel * 4] = (pixel * 29) % 256;
    data[pixel * 4 + 1] = Math.floor(pixel / width) * 3;
    data[pixel * 4 + 2] = (pixel * 43) % 256;
    data[pixel * 4 + 3] = transparent ? pixel % 256 : 255;
  }
  return sharp(data, { raw: { width, height, channels: 4 } }).png({ compressionLevel: 0 }).toBuffer();
}

test("fixture: rejects absent and unknown encoding policies", async () => {
  const input = await fixture();
  await assert.rejects(encodeLargeImage(input), /Missing or unknown/);
  await assert.rejects(encodeLargeImage(input, syntheticPolicy("webp")), /Missing or unknown/);
  assert.equal(findLargeImagePolicy("../ui/formal-pages/journey/background.png"), undefined);
});

test("fixture: source geometry drift fails before encoding", async () => {
  const input = await fixture({ width: 79 });
  await assert.rejects(encodeLargeImage(input, syntheticPolicy("jpeg")), /source dimensions changed/);
  await assert.rejects(largeImageSourcePixels(input, syntheticPolicy("rgb-palette-exact-alpha-png")), /source dimensions changed/);
});

test("fixture: transparent pixels may not silently become JPEG or an opaque matte", async () => {
  const input = await fixture({ transparent: true });
  await assert.rejects(encodeLargeImage(input, syntheticPolicy("jpeg")), /Cannot encode transparent source as JPEG/);
});

test("fixture: exact-alpha colour encoding preserves every alpha and transparent RGB", async () => {
  const input = await fixture({ transparent: true });
  const originalInput = Buffer.from(input);
  const policy = syntheticPolicy("rgb-palette-exact-alpha-png");
  const source = await largeImageSourcePixels(input, policy);
  const encoded = await encodeLargeImage(input, policy);
  const decoded = await assertLargeImageGeometry(source, encoded, policy);
  const metadata = await sharp(encoded).metadata();
  assert.equal(metadata.format, "png");
  assert.equal(metadata.hasAlpha, true);
  assert.deepEqual([metadata.width, metadata.height], [policy.width, policy.height]);
  for (let offset = 0; offset < source.data.length; offset += 4) {
    assert.equal(decoded.data[offset + 3], source.data[offset + 3]);
    if (source.data[offset + 3] === 0) {
      assert.deepEqual(decoded.data.subarray(offset, offset + 3), source.data.subarray(offset, offset + 3));
    }
  }
  assert.deepEqual(input, originalInput, "encoding must not mutate supplied master bytes");
  assert.deepEqual(await encodeLargeImage(Buffer.from(input), policy), encoded, "same master reproduces same bytes");
});

test("fixture: geometry validation rejects altered alpha, dimensions, and malformed image bytes", async () => {
  const policy = syntheticPolicy("rgb-palette-exact-alpha-png");
  const source = await largeImageSourcePixels(await fixture({ transparent: true }), policy);
  const changedAlpha = Buffer.from(source.data);
  changedAlpha[3] = 255;
  const alphaPng = await sharp(changedAlpha, { raw: source.info }).png().toBuffer();
  await assert.rejects(assertLargeImageGeometry(source, alphaPng, policy), /alpha changed/);
  const wrongSize = await sharp(source.data, { raw: source.info }).resize(79, 64).png().toBuffer();
  await assert.rejects(assertLargeImageGeometry(source, wrongSize, policy), /runtime dimensions changed/);
  await assert.rejects(assertLargeImageGeometry(source, Buffer.from("not an image"), policy));
});

test("fixture: opaque JPEG and palette PNG retain dimensions and deterministic bytes", async () => {
  const input = await fixture();
  for (const format of ["jpeg", "palette-png"]) {
    const policy = syntheticPolicy(format);
    const first = await encodeLargeImage(input, policy);
    assert.deepEqual(await encodeLargeImage(input, policy), first);
    const metadata = await sharp(first).metadata();
    assert.equal(metadata.format, format === "jpeg" ? "jpeg" : "png");
    assert.deepEqual([metadata.width, metadata.height], [80, 64]);
    assert.equal(metadata.hasAlpha, false);
    await assertLargeImageGeometry(await largeImageSourcePixels(input, policy), first, policy);
  }
});

test("fixture: established cover normalization preserves runtime canvas and unflattened RGB", async () => {
  const input = await fixture({ width: 79, transparent: true });
  const policy = syntheticPolicy("jpeg", { existingCoverResize: true });
  const source = await largeImageSourcePixels(input, policy);
  const expected = await sharp(input).resize(80, 64, {
    fit: "cover", position: "centre", kernel: "lanczos3",
  }).removeAlpha().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.deepEqual(source.data, expected.data);
  assert.deepEqual([source.info.width, source.info.height], [80, 64]);
  await assertLargeImageGeometry(source, await encodeLargeImage(input, policy), policy);
});

test("production: explicit policies are unique and confined to the selected artwork", () => {
  const allowed = new Set([
    "ui/formal-pages/journey/background.png", "ui/formal-pages/shop/reference.png",
    "ui/formal-pages/journey/destination.png", "ui/formal-pages/journey/presentation-panel.png",
    "ui/formal-pages/journey/title-journey-rewards.png", "ui/formal-pages/overlays/win/panel.png",
    "ui/formal-pages/overlays/win/glow.png", "ui/home-v3/background.png",
    ...Array.from({ length: 9 }, (_, index) => `ui/formal-pages/journey/home-${String(index + 2).padStart(2, "0")}.png`),
  ]);
  assert.ok(LARGE_IMAGE_POLICIES.length >= 2 && LARGE_IMAGE_POLICIES.length <= allowed.size);
  assert.equal(new Set(LARGE_IMAGE_POLICIES.map(({ source }) => source)).size, LARGE_IMAGE_POLICIES.length);
  assert.equal(new Set(LARGE_IMAGE_POLICIES.map(({ runtime }) => runtime)).size, LARGE_IMAGE_POLICIES.length);
  for (const policy of LARGE_IMAGE_POLICIES) {
    assert.ok(allowed.has(policy.source), `out-of-scope master: ${policy.source}`);
    assert.equal(findLargeImagePolicy(policy.source), policy);
    assert.match(policy.runtime, /^[a-z0-9/-]+\.(png|jpg)$/);
    assert.equal(policy.runtime, policy.source.replace(/\.png$/, policy.format === "jpeg" ? ".jpg" : ".png"));
  }
});

test("production: every selected runtime exactly recompiles from its unchanged master", async () => {
  const manifest = JSON.parse(await readFile(resolve(root, "art-source/manifest.json"), "utf8"));
  for (const policy of LARGE_IMAGE_POLICIES) {
    const sourcePath = resolve(root, "art-source", policy.source);
    const source = await readFile(sourcePath);
    const runtimePath = resolve(root, "public/assets/art", policy.runtime);
    const runtime = await readFile(runtimePath);
    const assets = manifest.assets.filter((asset) => asset.source === policy.source);
    assert.equal(assets.length, 1, `${policy.source} one exact manifest entry`);
    const asset = assets[0];
    const expectedAlpha = policy.alpha ?? (policy.format === "rgb-palette-exact-alpha-png");
    assert.equal(asset.transform, LARGE_IMAGE_TRANSFORM);
    assert.equal(asset.runtime, `../public/assets/art/${policy.runtime}`);
    assert.deepEqual([asset.width, asset.height, asset.alpha], [policy.width, policy.height, expectedAlpha]);
    const metadata = await sharp(runtime).metadata();
    assert.equal(metadata.format, policy.format === "jpeg" ? "jpeg" : "png");
    assert.equal(metadata.hasAlpha, expectedAlpha);
    const expected = await encodeLargeImage(source, policy);
    assert.equal(sha(runtime), sha(expected), `${policy.source} master-to-runtime encoding`);
    assert.deepEqual(await encodeLargeImage(sourcePath, policy), expected, "path and buffer input must match");
    await assertLargeImageGeometry(await largeImageSourcePixels(source, policy), runtime, policy);
    assert.equal(sha(await readFile(sourcePath)), sha(source), `${policy.source} master must remain unmodified`);
  }
});
