import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = resolve(root, "release-assets/google-play/icon/user-supplied-20261021.png");
const source = await readFile(sourcePath);
const metadata = await sharp(source).metadata();
if (metadata.width !== 2048 || metadata.height !== 2048) {
  throw new Error("Unexpected source dimensions; review the icon composition before rebuilding.");
}
const outputs = [];
const hash = data => createHash("sha256").update(data).digest("hex");
for (const [density, scale] of [["mdpi", 1], ["hdpi", 1.5], ["xhdpi", 2], ["xxhdpi", 3], ["xxxhdpi", 4]]) {
  const directory = resolve(root, `android-google-play/app/src/main/res/mipmap-${density}`);
  await mkdir(directory, { recursive: true });
  // Legacy Android uses the full supplied artwork, only resized for density.
  const legacy = await sharp(source).resize(48 * scale, 48 * scale).png().toBuffer();
  // A 108dp adaptive layer holds an 84dp image with 12dp padding. The normal
  // 72dp viewport crops only decorative edges; the arrow stays in the safe zone.
  const foreground = await sharp(source).resize(84 * scale, 84 * scale)
    .ensureAlpha().extend({ top: 12 * scale, bottom: 12 * scale,
      left: 12 * scale, right: 12 * scale, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png().toBuffer();
  for (const [name, data, pixels] of [["ic_slidejam_launcher.png", legacy, 48 * scale],
    ["ic_slidejam_foreground.png", foreground, 108 * scale]]) {
    await writeFile(resolve(directory, name), data);
    outputs.push({ path: `android-google-play/app/src/main/res/mipmap-${density}/${name}`,
      pixels, sha256: hash(data) });
  }
}
await writeFile(resolve(root, "release-assets/google-play/icon/resource-manifest.json"),
  JSON.stringify({ source: "user-supplied-20261021.png", sourceSha256: hash(source),
    operation: "Density resizing and adaptive-layer padding only; original source preserved.",
    adaptive: { layerDp: 108, artworkDp: 84, paddingDp: 12, viewportDp: 72 }, outputs }, null, 2) + "\n");
console.log(`Generated ${outputs.length} Google Play icon resources.`);
