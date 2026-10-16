import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

// Disabled-state derivatives, not replacement artwork. RGB is converted in
// unassociated sRGB byte space; dimensions and every alpha byte remain exact.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const toolPath = "tools/build-home-locked-icons.mjs";
const algorithm = "rgba8-gray-v1: Y=(77*R+150*G+29*B+128)>>8; alpha unchanged";
const icons = [
  ["shopIcon", "shop-icon"],
  ["leaderboardIcon", "leaderboard-icon"],
  ["journeyIcon", "journey-icon"],
];
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const args = process.argv.slice(2);
assert(args.every((arg) => arg === "--write" || arg.startsWith("--report=")), "Unexpected argument");
const write = args.includes("--write");
const manifestPath = resolve(root, "art-source/manifest.json");
const manifestText = await readFile(manifestPath, "utf8");
const manifest = JSON.parse(manifestText);
const toolSha256 = sha256(await readFile(resolve(root, toolPath)));
const results = [];

for (const [key, basename] of icons) {
  const source = `ui/home-v3/${basename}.png`;
  const derivedSource = `ui/home-v3/${basename}-locked.png`;
  const originalPaths = [
    resolve(root, "art-source", source),
    resolve(root, "public/assets/art", source),
  ];
  const originalBuffers = await Promise.all(originalPaths.map((path) => readFile(path)));
  assert(originalBuffers[0].equals(originalBuffers[1]), `${key}: original source/runtime differ`);
  const originalSha256 = sha256(originalBuffers[0]);
  const { data: original, info } = await sharp(originalBuffers[0]).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.channels, 4);
  const pixels = Buffer.from(original);
  for (let i = 0; i < pixels.length; i += 4) {
    const gray = (77 * original[i] + 150 * original[i + 1] + 29 * original[i + 2] + 128) >> 8;
    pixels[i] = pixels[i + 1] = pixels[i + 2] = gray;
  }
  const encode = () => sharp(pixels, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false }).toBuffer();
  const encoded = await encode();
  assert(encoded.equals(await encode()), `${key}: encoding is not deterministic`);
  const sourcePath = resolve(root, "art-source", derivedSource);
  const runtimePath = resolve(root, "public/assets/art", derivedSource);
  const entry = {
    key: `ui.home.${key}Locked`,
    source: derivedSource,
    runtime: `../public/assets/art/${derivedSource}`,
    width: info.width,
    height: info.height,
    alpha: true,
    grid: [1, 1],
    transform: "copy",
    derivation: {
      source,
      sourceSha256: originalSha256,
      outputSha256: sha256(encoded),
      algorithm,
      tool: toolPath,
      toolSha256,
      sharpVersion: sharp.versions.sharp,
      libvipsVersion: sharp.versions.vips,
    },
  };
  if (write) {
    await writeFile(sourcePath, encoded);
    await writeFile(runtimePath, encoded);
    const existing = manifest.assets.findIndex((asset) => asset.key === entry.key);
    if (existing >= 0) manifest.assets[existing] = entry;
    else {
      const parent = manifest.assets.findIndex((asset) => asset.key === `ui.home.${key}`);
      assert(parent >= 0, `${key}: original manifest entry missing`);
      manifest.assets.splice(parent + 1, 0, entry);
    }
  } else {
    assert.deepEqual(manifest.assets.find((asset) => asset.key === entry.key), entry, `${key}: manifest provenance differs`);
  }
  const actual = await readFile(runtimePath);
  assert(actual.equals(encoded), `${key}: runtime differs from deterministic output`);
  assert((await readFile(sourcePath)).equals(encoded), `${key}: source derivative differs`);
  const { data: decoded, info: decodedInfo } = await sharp(actual).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(decodedInfo.width, info.width);
  assert.equal(decodedInfo.height, info.height);
  assert.equal(decodedInfo.channels, 4);
  assert(decoded.equals(pixels), `${key}: PNG changed grayscale RGBA pixels`);
  for (let i = 0; i < decoded.length; i += 4) {
    assert(decoded[i] === decoded[i + 1] && decoded[i] === decoded[i + 2], `${key}: RGB is not gray`);
    assert.equal(decoded[i + 3], original[i + 3], `${key}: original alpha changed`);
  }
  for (const path of originalPaths) assert.equal(sha256(await readFile(path)), originalSha256, `${key}: original changed`);
  results.push({ key: entry.key, width: info.width, height: info.height, pngBytes: encoded.length,
    decodedBytes: pixels.length, derivation: entry.derivation,
    checks: { deterministic: true, rgbEqual: true, alphaUnchanged: true, dimensionsUnchanged: true, originalsUnchanged: true, sourceRuntimeEqual: true } });
}

if (write) await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
const report = { status: "PASS", algorithm, tool: toolPath, toolSha256, entries: results,
  totalPngBytes: results.reduce((sum, entry) => sum + entry.pngBytes, 0),
  totalDecodedBytes: results.reduce((sum, entry) => sum + entry.decodedBytes, 0) };
const reportArg = args.find((arg) => arg.startsWith("--report="));
if (reportArg) {
  const path = resolve(root, reportArg.slice("--report=".length));
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(report, null, 2)}\n`);
}
console.log(JSON.stringify(report, null, 2));
