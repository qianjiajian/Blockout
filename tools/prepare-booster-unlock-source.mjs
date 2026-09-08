import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp");
const root = resolve(import.meta.dirname, "..");
const input = resolve(root, "art-source/ui/notifications/booster-unlock-banner-v1-raw.png");
const output = resolve(root, "art-source/ui/notifications/booster-unlock-banner-v1.png");

const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const pixelCount = info.width * info.height;
const looksLikeGeneratedBackdrop = (index) => {
  const offset = index * 3;
  const red = data[offset];
  const green = data[offset + 1];
  const blue = data[offset + 2];
  return Math.min(red, green, blue) >= 195 && Math.max(red, green, blue) - Math.min(red, green, blue) <= 40;
};

const rgba = Buffer.alloc(pixelCount * 4);
for (let index = 0; index < pixelCount; index += 1) {
  const sourceOffset = index * 3;
  const targetOffset = index * 4;
  rgba[targetOffset] = data[sourceOffset];
  rgba[targetOffset + 1] = data[sourceOffset + 1];
  rgba[targetOffset + 2] = data[sourceOffset + 2];
  rgba[targetOffset + 3] = looksLikeGeneratedBackdrop(index) ? 0 : 255;
}

await mkdir(dirname(output), { recursive: true });
await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } })
  .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .extend({ top: 24, bottom: 24, left: 24, right: 24, background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png({ compressionLevel: 9, adaptiveFiltering: true })
  .toFile(output);

console.log(`Prepared transparent ImageGen source ${output}.`);
