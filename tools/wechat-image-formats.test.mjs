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
  wechatArtManifestSource,
  wechatImagePath,
  wechatDeliveryImageKey,
  WECHAT_EVENT_IMAGE_ENCODING,
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

test("league background becomes an opaque same-size JPEG and source snapshot matches the renamed build", async () => {
  await withDirectory(async (directory) => {
    const sourceDir = join(directory, "source");
    const outputDir = join(directory, "output");
    const asset = "assets/art/ui/league-video-v1/background.png";
    const target = "assets/art/ui/league-video-v1/background.jpg";
    const original = await sharp(await fixturePng(true)).removeAlpha().ensureAlpha().png().toBuffer();
    const originalInfo = await sharp(original).metadata();
    assert.equal(originalInfo.hasAlpha, true, "an opaque PNG may still carry an alpha channel");
    await mkdir(dirname(join(sourceDir, asset)), { recursive: true });
    await writeFile(join(sourceDir, asset), original);
    await cp(sourceDir, outputDir, { recursive: true });

    assert.equal(wechatImagePath(asset), target);
    assert.equal(wechatArtManifestSource(`const background = "${asset}";`), `const background = "${target}";`);
    const expected = await snapshotWechatAssetSource(sourceDir);
    assert.deepEqual(expected.map(row => row.path), [target]);
    assert.deepEqual(await prepareWechatImages(outputDir), { pngCount: 0, compactedCount: 1, optimizedPngCount: 0 });
    assert.deepEqual(await snapshotDirectory(outputDir), expected);
    const encoded = await readFile(join(outputDir, target));
    const info = await sharp(encoded).metadata();
    assert.equal(info.format, "jpeg");
    assert.equal(info.width, originalInfo.width);
    assert.equal(info.height, originalInfo.height);
    assert.equal(info.hasAlpha, false);
    assert.equal((await sharp(encoded).stats()).isOpaque, true);
    await assert.rejects(readFile(join(outputDir, asset)), { code: "ENOENT" });
    assert.deepEqual(await readFile(join(sourceDir, asset)), original);
  });
});

test("league JPEG background rejects even a single partially transparent pixel without replacing its source", async () => {
  await withDirectory(async (directory) => {
    const asset = "league-video-v1/background.png";
    const source = join(directory, asset);
    await mkdir(dirname(source), { recursive: true });
    for (const alpha of [0, 254]) {
      const raw = Buffer.from([20, 40, 60, 255, 20, 40, 60, 255, 20, 40, 60, alpha, 20, 40, 60, 255]);
      const original = await sharp(raw, { raw: { width: 2, height: 2, channels: 4 } }).png().toBuffer();
      await writeFile(source, original);
      await assert.rejects(encodeWechatImage(source, asset), /must be fully opaque/);
      await assert.rejects(prepareWechatImages(directory), /must be fully opaque/);
      assert.deepEqual(await readFile(source), original);
      await assert.rejects(readFile(join(directory, "league-video-v1/background.jpg")), { code: "ENOENT" });
    }
  });
});

test("event UI indexed PNG keeps native dimensions and a transparent border instead of a baked matte", async () => {
  await withDirectory(async (directory) => {
    const { data, info } = await pixels(await fixturePng(true));
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
      const offset = (y * info.width + x) * 4;
      if (x < 8 || y < 8 || x >= info.width - 8 || y >= info.height - 8) data.fill(0, offset, offset + 4);
      else data[offset + 3] = 255;
    }
    const original = await sharp(data, { raw: info }).png({ palette: false }).toBuffer();
    const source = join(directory, "source.png");
    await writeFile(source, original);
    for (const asset of [
      "assets/art/ui/league-video-v1/glory.png",
      "assets/art/ui/daily-challenge-v2/reward-banner.png",
      "assets/art/ui/icons/tutorial-hand-supplied-v2.png",
    ]) {
      const encoded = await encodeWechatImage(source, asset);
      const metadata = await sharp(encoded).metadata();
      assert.equal(metadata.format, "png");
      assert.equal(metadata.isPalette, true, asset);
      assert.equal(metadata.width, info.width);
      assert.equal(metadata.height, info.height);
      assert.equal(metadata.hasAlpha, true);
      const after = await pixels(encoded);
      let visible = 0;
      for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
        const alpha = after.data[(y * info.width + x) * 4 + 3];
        if (x < 8 || y < 8 || x >= info.width - 8 || y >= info.height - 8) assert.equal(alpha, 0, `${asset}: transparent border at ${x},${y}`);
        else if (alpha > 0) visible++;
      }
      assert.ok(visible > 0, "the actual foreground must remain visible");
      assert.equal(wechatImagePath(asset), asset);
    }
    assert.deepEqual(await readFile(source), original);
  });
});

test("event encoding does not quantize gameplay or similarly named non-event PNGs", async () => {
  await withDirectory(async (directory) => {
    const original = await fixturePng(true);
    const source = join(directory, "source.png");
    await writeFile(source, original);
    for (const asset of [
      "assets/art/gameplay/blocks/formal-v1/blue-single.png",
      "assets/art/ui/league-video-v10/row.png",
      "assets/art/ui/daily-challenge-v20/reward-banner.png",
      "assets/art/ui/home-v3/background.png",
    ]) {
      await assertSamePixels(original, await encodeWechatImage(source, asset));
      assert.equal(wechatImagePath(asset), asset);
    }
    assert.deepEqual(await readFile(source), original);
  });
});

test("league JPEG conversion cannot overwrite a separately authored JPEG", async () => {
  await withDirectory(async (directory) => {
    const assetDir = join(directory, "league-video-v1");
    await mkdir(assetDir);
    const png = await sharp(await fixturePng()).removeAlpha().png().toBuffer();
    const jpeg = await sharp(png).jpeg().toBuffer();
    await writeFile(join(assetDir, "background.png"), png);
    await writeFile(join(assetDir, "background.jpg"), jpeg);
    await assert.rejects(prepareWechatImages(directory), /would overwrite/);
    assert.deepEqual(await readFile(join(assetDir, "background.png")), png);
    assert.deepEqual(await readFile(join(assetDir, "background.jpg")), jpeg);
  });
});

test('v1.197 image scope exactly matches the accepted audit, including only JPEGs that saved bytes', async () => {
  const audit = JSON.parse(await readFile('playtest-results/wechat-size-audit-20261012/image-trial.json', 'utf8'));
  const policy = WECHAT_EVENT_IMAGE_ENCODING.auditedDelivery;
  assert.equal(policy.pngPaths.length, 30);
  assert.equal(policy.jpegPaths.length, 12);
  assert.deepEqual([...policy.pngPaths].sort(), audit.rows.map(row => wechatDeliveryImageKey(row.path)).sort());
  assert.deepEqual([...policy.jpegPaths].sort(), audit.jpegRows.filter(row => row.variants.some(v => v.quality === 85 && v.savedBytes > 0)).map(row => wechatDeliveryImageKey(row.path)).sort());
});

test('supplied UI palette scope is exactly the approved 21 settlement images and 19 profile frames', () => {
  const policy = WECHAT_EVENT_IMAGE_ENCODING.suppliedUiDelivery;
  const settlement = [
    'back-button', 'glow', 'divider', 'bronze', 'silver', 'silver-hero', 'gold',
    'platinum', 'emerald', 'diamond', 'master', 'glory', 'stage-panel',
    'result-panel', 'claim-button', 'rank-icon', 'star', 'sparkles',
    'score-icon', 'arrow', 'coin',
  ].map(name => `league-settlement-supplied-v1/${name}.png`);
  const frames = Array.from({ length: 19 }, (_, index) => `profile-frames-supplied-v1/frame-${index}.png`);
  assert.equal(policy.approvedOn, '2026-10-15');
  assert.deepEqual(policy.png, { compressionLevel: 9, palette: true, colours: 256, quality: 100, effort: 7, dither: 1 });
  assert.equal(policy.pngPaths.length, 40);
  assert.equal(new Set(policy.pngPaths).size, 40);
  assert.deepEqual([...policy.pngPaths].sort(), [...settlement, ...frames].sort());
});

test('supplied UI source and subpackage encodings agree without resizing, flattening alpha or changing source files', async () => {
  await withDirectory(async directory => {
    const { data, info } = await pixels(await fixturePng(true));
    // High-entropy RGB makes palette encoding smaller than lossless RGBA,
    // so this fixture exercises quantization instead of the size fallback.
    let seed = 0x12345678;
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
      const offset = (y * info.width + x) * 4;
      for (let channel = 0; channel < 3; channel++) {
        seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
        data[offset + channel] = seed & 255;
      }
      data[offset + 3] = x < 8 || y < 8 ? 0 : x < 14 || y < 14 ? 128 : 255;
    }
    const original = await sharp(data, { raw: info }).png({ compressionLevel: 0, palette: false }).toBuffer();
    const source = join(directory, 'input.png');
    await writeFile(source, original);
    for (const [key, subpackage] of [
      ['league-settlement-supplied-v1/result-panel.png', 'league-ui'],
      ['league-settlement-supplied-v1/silver-hero.png', 'league-ui'],
      ['profile-frames-supplied-v1/frame-0.png', 'event-ui'],
      ['profile-frames-supplied-v1/frame-18.png', 'event-ui'],
    ]) {
      const encoded = await encodeWechatImage(source, key);
      for (const path of [`art/ui/${key}`, `assets/art/ui/${key}`, `public/assets/art/ui/${key}`, `${subpackage}/${key}`]) {
        assert.equal(wechatDeliveryImageKey(path), key);
        assert.deepEqual(await encodeWechatImage(source, path), encoded, path);
        assert.equal(wechatImagePath(path), path);
      }
      const metadata = await sharp(encoded).metadata();
      assert.equal(metadata.isPalette, true, key);
      assert.equal(metadata.hasAlpha, true, key);
      const result = await pixels(encoded);
      assert.equal(result.info.width, info.width, key);
      assert.equal(result.info.height, info.height, key);
      let partial = 0;
      for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
        const alpha = result.data[(y * info.width + x) * 4 + 3];
        if (x < 8 || y < 8) assert.equal(alpha, 0, `${key}: clear border`);
        else if (x >= 14 && y >= 14) assert.equal(alpha, 255, `${key}: opaque interior`);
        else if (alpha > 0 && alpha < 255) partial++;
      }
      assert.ok(partial > 0, `${key}: partially transparent edge`);
      assert.ok(encoded.length < original.length, key);
    }
    assert.deepEqual(await readFile(source), original);
  });
});

test('supplied UI permission excludes unknown images, similar directories and future frame 19', async () => {
  await withDirectory(async directory => {
    const original = await fixturePng(true);
    const source = join(directory, 'input.png');
    await writeFile(source, original);
    for (const path of [
      'public/assets/art/ui/league-settlement-supplied-v1/unknown.png',
      'league-ui/league-settlement-supplied-v1/result-panel-copy.png',
      'league-ui/league-settlement-supplied-v10/result-panel.png',
      'event-ui/profile-frames-supplied-v10/frame-0.png',
      'public/assets/art/ui/profile-frames-supplied-v1/frame-19.png',
      'event-ui/profile-frames-supplied-v1/frame-19.png',
      'event-ui/profile-frames-supplied-v1/unknown.png',
      'other/league-settlement-supplied-v1/result-panel.png',
      'other/profile-frames-supplied-v1/frame-0.png',
    ]) {
      await assertSamePixels(original, await encodeWechatImage(source, path));
      assert.equal(wechatImagePath(path), path);
    }
    assert.deepEqual(await readFile(source), original);
  });
});

test('audited delivery is identical through source, public and subpackage paths, including the existing coin alias', async () => {
  await withDirectory(async directory => {
    const original = await fixturePng(true);
    const source = join(directory, 'input.png');
    await writeFile(source, original);
    for (const paths of [
      ['life-refill-reference-v1/panel.png', 'art/ui/formal-pages/life-refill-reference-v1/panel.png', 'meta-ui/formal-pages/life-refill-reference-v1/panel.png'],
      ['art/ui/formal-pages/booster-purchase-reference-v1/panel.png', 'event-ui/booster-purchase-reference-v1/panel.png'],
      ['art/ui/home-v3/start-button.png', 'assets/art/ui/home-v3/start-button.png'],
      ['journey/presentation-reward-coins.png', 'overlays/win/coin-pile.png', 'meta-ui/formal-pages/overlays/win/coin-pile.png'],
    ]) {
      const expected = await encodeWechatImage(source, paths[0]);
      for (const path of paths) assert.deepEqual(await encodeWechatImage(source, path), expected, path);
    }
    for (const path of ['gameplay-art/panel.png', 'other/life-refill-reference-v1/panel.png', 'art/ui/home-v30/start-button.png']) {
      await assertSamePixels(original, await encodeWechatImage(source, path));
    }
    assert.deepEqual(await readFile(source), original);
  });
});

test('approved palette retains dimensions, clear border, opaque interior and partially transparent edges', async () => {
  await withDirectory(async directory => {
    const { data, info } = await pixels(await fixturePng(true));
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
      const offset = (y * info.width + x) * 4;
      data[offset + 3] = x < 8 || y < 8 ? 0 : x < 14 || y < 14 ? 128 : 255;
    }
    const original = await sharp(data, { raw: info }).png({ compressionLevel: 0 }).toBuffer();
    const source = join(directory, 'input.png');
    await writeFile(source, original);
    const encoded = await encodeWechatImage(source, 'meta-ui/formal-pages/life-refill-reference-v1/panel.png');
    const result = await pixels(encoded);
    assert.equal(result.info.width, info.width);
    assert.equal(result.info.height, info.height);
    let partial = 0;
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
      const alpha = result.data[(y * info.width + x) * 4 + 3];
      if (x < 8 || y < 8) assert.equal(alpha, 0);
      else if (x >= 14 && y >= 14) assert.equal(alpha, 255);
      else if (alpha > 0 && alpha < 255) partial++;
    }
    assert.ok(partial > 0);
    assert.ok(encoded.length < original.length);
    assert.deepEqual(await readFile(source), original);
  });
});

test('approved JPEG q85 paths share encoding, retain dimensions and skip an increased-size candidate', async () => {
  await withDirectory(async directory => {
    const original = await sharp(await fixturePng(true)).removeAlpha().jpeg({quality: 99}).toBuffer();
    const source = join(directory, 'input.jpg');
    await writeFile(source, original);
    const expected = await encodeWechatImage(source, 'journey/home-07.jpg');
    for (const path of ['art/ui/formal-pages/journey/home-07.jpg', 'journey-themes/home-07.jpg']) assert.deepEqual(await encodeWechatImage(source, path), expected);
    const info = await sharp(expected).metadata();
    assert.equal(info.width, 80); assert.equal(info.height, 64); assert.equal(info.hasAlpha, false);
    assert.equal(await encodeWechatImage(source, 'collection-card-atlases-v1/card-01.jpg'), undefined);
    assert.equal(await encodeWechatImage(source, 'other/home-02.jpg'), undefined);
    const lowQuality = await sharp(await fixturePng(true)).removeAlpha().jpeg({quality: 5, mozjpeg:true}).toBuffer();
    const largerCandidate = await sharp(lowQuality).jpeg(WECHAT_EVENT_IMAGE_ENCODING.auditedDelivery.jpeg).toBuffer();
    assert.ok(largerCandidate.length > lowQuality.length, 'fixture must actually exercise the size fallback');
    await writeFile(source, lowQuality);
    assert.deepEqual(await encodeWechatImage(source, 'home-v3/background.jpg'), lowQuality);
  });
});

test('approved images use the same bytes in snapshots and build outputs while original files are unchanged', async () => {
  await withDirectory(async directory => {
    const sourceDir = join(directory, 'source');
    const outputDir = join(directory, 'output');
    await mkdir(sourceDir);
    for (const path of ['home-v3/start-button.png', 'life-refill-reference-v1/panel.png', 'journey/presentation-reward-coins.png', 'overlays/win/coin-pile.png', 'league-settlement-supplied-v1/result-panel.png', 'profile-frames-supplied-v1/frame-18.png']) {
      await mkdir(dirname(join(sourceDir, path)), {recursive:true});
      await writeFile(join(sourceDir, path), await fixturePng(true));
    }
    const baseline = await snapshotDirectory(sourceDir);
    await cp(sourceDir, outputDir, {recursive:true});
    const expected = await snapshotWechatAssetSource(sourceDir);
    await prepareWechatImages(outputDir);
    assert.deepEqual(await snapshotDirectory(outputDir), expected);
    assert.deepEqual(await snapshotDirectory(sourceDir), baseline);
    assert.deepEqual(await snapshotWechatAssetSource(sourceDir), expected);
  });
});
