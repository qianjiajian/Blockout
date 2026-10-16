import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import sharp from "sharp";

// Technical export only: the badge pipeline supports both the historical
// ImageGen exports and user-supplied formal artwork. User-supplied files are
// copied byte-for-byte so their authored dimensions, alpha and pixels remain
// intact; the historical branch retains its deterministic 384px export.
const root = resolve(import.meta.dirname, "..");
const source = resolve(root, "art-source/ui/league-rank-badges-v2");
const runtime = resolve(root, "public/assets/art/ui/league-rank-badges-v2");
const names = ["bronze", "silver", "gold", "platinum", "emerald", "diamond", "master", "glory"];
const labels = ["青铜", "白银", "黄金", "铂金", "翡翠", "钻石", "大师", "荣耀"];
const nativeGenerator = "user-provided-formal-assets";
const size = 384;
const padding = 15;
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const slash = (path) => path.replaceAll("\\", "/");
const escapeXml = (s) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");

async function encode(original) {
  const metadata = await sharp(original).metadata();
  assert.equal(metadata.format, "png", "ImageGen badge must be a PNG");
  assert.equal(metadata.hasAlpha, true, "ImageGen badge must already contain transparency");
  const { data, info } = await sharp(original).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minX = info.width, minY = info.height, maxX = -1, maxY = -1, transparentPixels = 0;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const alpha = data[(y * info.width + x) * info.channels + 3];
      if (alpha === 0) { transparentPixels += 1; continue; }
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
  }
  assert.ok(transparentPixels > info.width * info.height * 0.05, "Expected a transparent cutout, not an opaque background");
  assert.ok(maxX >= 0 && maxY >= 0, "Badge is empty");
  const crop = { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
  const pixels = await sharp(original).extract(crop).resize(size - padding * 2, size - padding * 2, {
    fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: "lanczos3",
  }).extend({ top: padding, bottom: padding, left: padding, right: padding,
    background: { r: 0, g: 0, b: 0, alpha: 0 } }).png({ compressionLevel: 9 }).toBuffer();
  return { pixels, crop, originalWidth: info.width, originalHeight: info.height };
}

async function makePreview() {
  const width = 1280, height = 780, cellWidth = 320, rowHeight = 350;
  const tiles = [];
  for (const [i, id] of names.entries()) {
    tiles.push({ input: await sharp(resolve(source, `${id}.png`)).resize(280, 280).toBuffer(),
      left: (i % 4) * cellWidth + 20, top: Math.floor(i / 4) * rowHeight + 52 });
  }
  const text = names.map((id, i) => `<text x="${(i % 4) * cellWidth + 160}" y="${Math.floor(i / 4) * rowHeight + 354}" text-anchor="middle" fill="#fff1c2" font-family="Microsoft YaHei,sans-serif" font-size="29" font-weight="bold">${escapeXml(labels[i])}</text>`).join("");
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><text x="640" y="35" text-anchor="middle" fill="#fff1c2" font-family="Microsoft YaHei,sans-serif" font-size="28" font-weight="bold">荣耀联赛 · 8段位图标</text>${text}</svg>`);
  tiles.push({ input: svg, left: 0, top: 0 });
  await sharp({ create: { width, height, channels: 4, background: "#15132d" } }).composite(tiles).png().toFile(resolve(source, "preview.png"));
}

async function verify() {
  const provenance = JSON.parse(await readFile(resolve(source, "provenance.json"), "utf8"));
  if (provenance.generator === nativeGenerator) {
    assert.deepEqual(provenance.entries.map((e) => e.id), names);
    const results = [];
    for (const entry of provenance.entries) {
      const original = await readFile(resolve(source, entry.original));
      assert.equal(sha256(original), entry.originalSha256, `${entry.id} supplied source changed`);
      const master = await readFile(resolve(source, `${entry.id}.png`));
      const deployed = await readFile(resolve(runtime, `${entry.id}.png`));
      assert.ok(master.equals(original), `${entry.id} source is not byte-identical to archived supplied asset`);
      assert.ok(deployed.equals(master), `${entry.id} runtime is not byte-identical`);
      assert.equal(sha256(master), entry.sha256);
      const metadata = await sharp(master).metadata();
      assert.equal(metadata.format, "png");
      assert.equal(metadata.width, entry.width);
      assert.equal(metadata.height, entry.height);
      assert.equal(metadata.hasAlpha, true);
      results.push({ id: entry.id, width: entry.width, height: entry.height, bytes: master.length, sha256: entry.sha256 });
    }
    console.log(JSON.stringify({ status: "PASS", generator: nativeGenerator, assets: results.length, results }, null, 2));
    return;
  }
  assert.equal(sha256(await readFile(resolve(root, provenance.reference))), provenance.referenceSha256,
    "Archived user reference changed");
  assert.deepEqual(provenance.entries.map((e) => e.id), names);
  const results = [];
  for (const entry of provenance.entries) {
    const original = await readFile(resolve(source, entry.original));
    assert.equal(sha256(original), entry.originalSha256, `${entry.id} raw ImageGen source changed`);
    const { pixels, crop } = await encode(original);
    assert.deepEqual(crop, entry.crop);
    const master = await readFile(resolve(source, `${entry.id}.png`));
    const deployed = await readFile(resolve(runtime, `${entry.id}.png`));
    assert.ok(master.equals(pixels), `${entry.id} differs from deterministic export`);
    assert.ok(deployed.equals(master), `${entry.id} runtime is not byte-identical`);
    assert.equal(sha256(master), entry.sha256);
    const metadata = await sharp(master).metadata();
    assert.equal(metadata.width, size); assert.equal(metadata.height, size); assert.equal(metadata.hasAlpha, true);
    results.push({ id: entry.id, width: size, height: size, bytes: master.length, sha256: entry.sha256 });
  }
  console.log(JSON.stringify({ status: "PASS", assets: results.length, decodedBytes: names.length * size * size * 4, results }, null, 2));
}

if (process.argv[2] === "--verify") {
  await verify();
} else {
  const inputPath = process.argv[2];
  assert.ok(inputPath, "Usage: node tools/build-league-rank-badges-v2.mjs <input.json> | --verify");
  const configPath = resolve(inputPath);
  const config = JSON.parse(await readFile(configPath, "utf8"));
  assert.ok(config.generator === "built-in image_gen" || config.generator === nativeGenerator,
    "generator must be built-in image_gen or user-provided-formal-assets");
  assert.deepEqual(config.tiers.map((entry) => entry.id), names, "Supply the eight ranks in game order");
  await mkdir(resolve(source, "originals"), { recursive: true });
  await mkdir(runtime, { recursive: true });
  let referenceBytes = null;
  if (config.generator === "built-in image_gen") {
    assert.equal(typeof config.reference, "string", "Supply the original reference image path");
    const referenceInput = isAbsolute(config.reference) ? config.reference : resolve(dirname(configPath), config.reference);
    referenceBytes = await readFile(referenceInput);
    await writeFile(resolve(source, "reference.png"), referenceBytes);
  }
  const entries = [];
  for (const [index, entry] of config.tiers.entries()) {
    const input = isAbsolute(entry.input) ? entry.input : resolve(dirname(configPath), entry.input);
    const original = await readFile(input), hash = sha256(original);
    const archived = `originals/${entry.id}-${hash.slice(0, 12)}.png`;
    await writeFile(resolve(source, archived), original);
    if (config.generator === nativeGenerator) {
      const metadata = await sharp(original).metadata();
      assert.equal(metadata.format, "png", `${entry.id} supplied asset must be PNG`);
      assert.equal(metadata.hasAlpha, true, `${entry.id} supplied asset must contain alpha`);
      await writeFile(resolve(source, `${entry.id}.png`), original);
      await writeFile(resolve(runtime, `${entry.id}.png`), original);
      entries.push({ id: entry.id, label: labels[index], original: archived, originalSha256: hash,
        originalWidth: metadata.width, originalHeight: metadata.height, width: metadata.width,
        height: metadata.height, alpha: true, sha256: hash,
        runtime: `assets/art/ui/league-rank-badges-v2/${entry.id}.png` });
    } else {
      assert.ok(entry.prompt, `${entry.id} needs its generation prompt`);
      const exported = await encode(original);
      await writeFile(resolve(source, `${entry.id}.png`), exported.pixels);
      await writeFile(resolve(runtime, `${entry.id}.png`), exported.pixels);
      entries.push({ id: entry.id, label: labels[index], original: archived, originalSha256: hash,
        originalWidth: exported.originalWidth, originalHeight: exported.originalHeight,
        prompt: entry.prompt, crop: exported.crop, width: size, height: size, alpha: true,
        sha256: sha256(exported.pixels), runtime: `assets/art/ui/league-rank-badges-v2/${entry.id}.png` });
    }
  }
  const provenance = config.generator === nativeGenerator
    ? { generator: config.generator, sourceDirectory: config.sourceDirectory ?? null,
      purpose: "User-authorized official Glory League rank badge assets",
      transform: { name: "copy", note: "Preserves supplied PNG bytes, dimensions, alpha, colours and orientation; no resize, crop, recolour or rotation." }, entries }
    : { generator: config.generator, originalReference: config.reference,
      reference: slash(relative(root, resolve(source, "reference.png"))), referenceSha256: sha256(referenceBytes),
      purpose: "User-authorized eight Glory League rank badges based on the supplied visual reference",
      transform: { name: "alpha-bounds-contain-png", size, padding, kernel: "lanczos3", backgroundAlpha: 0,
        note: "Retains every nontransparent source pixel; no keying, recolouring, repainting or alpha repair." }, entries };
  await writeFile(resolve(source, "provenance.json"), `${JSON.stringify(provenance, null, 2)}\n`);
  const rebuildInputs = config.generator === nativeGenerator
    ? { generator: config.generator, sourceDirectory: config.sourceDirectory ?? null,
      tiers: entries.map((entry) => ({ id: entry.id, input: entry.original })) }
    : { generator: config.generator, reference: "reference.png",
      tiers: entries.map((entry) => ({ id: entry.id, input: entry.original, prompt: entry.prompt })) };
  await writeFile(resolve(source, "rebuild-inputs.json"), `${JSON.stringify(rebuildInputs, null, 2)}\n`);
  const assets = entries.map((entry) => ({ key: `ui.leagueRankV2.${entry.id}`,
    source: `ui/league-rank-badges-v2/${entry.id}.png`, runtime: `../public/${entry.runtime}`,
    width: entry.width, height: entry.height, alpha: true, grid: [1, 1], transform: "copy", loadGroup: "formal-leaderboard" }));
  await writeFile(resolve(source, "manifest.json"), `${JSON.stringify({ generator: config.generator, assets }, null, 2)}\n`);
  await makePreview();
  console.log(JSON.stringify({ source: slash(relative(root, source)), runtime: slash(relative(root, runtime)), entries: entries.length }));
  await verify();
}
