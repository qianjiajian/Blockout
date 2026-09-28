import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const screenshotRoot = resolve(projectRoot, "release-assets", "screenshots");
const expected = [
  "01-home.png",
  "02-gameplay.png",
  "03-level-select.png",
  "04-achievements.png",
  "05-result.png",
  "06-onboarding.png",
  "07-home-progress.png",
  "08-mechanic-ice.png",
  "09-mechanic-layer.png",
  "10-mechanic-generator.png",
];

const expectedIcons = [
  ["app-icon-512.png", 512],
  ["app-icon-1024.png", 1024],
];

function readPngDimensions(data, name) {
  const pngSignature = "89504e470d0a1a0a";
  if (data.subarray(0, 8).toString("hex") !== pngSignature) throw new Error(`${name} is not a PNG`);
  return [data.readUInt32BE(16), data.readUInt32BE(20)];
}

const actual = (await readdir(screenshotRoot, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith(".png"))
  .map((entry) => entry.name)
  .sort();
if (JSON.stringify(actual) !== JSON.stringify([...expected].sort())) {
  throw new Error(`Release screenshots must be exactly the current 10 files. Found: ${actual.join(", ")}`);
}

let totalBytes = 0;
for (const name of expected) {
  const data = await readFile(resolve(screenshotRoot, name));
  const [width, height] = readPngDimensions(data, name);
  if (width !== 720 || height !== 1584) throw new Error(`${name} is ${width}x${height}; expected 720x1584`);
  if (data.length < 100_000) throw new Error(`${name} is unexpectedly small (${data.length} bytes)`);
  totalBytes += data.length;
}

for (const [name, expectedSize] of expectedIcons) {
  const data = await readFile(resolve(projectRoot, "release-assets", name));
  const [width, height] = readPngDimensions(data, name);
  if (width !== expectedSize || height !== expectedSize) {
    throw new Error(`${name} is ${width}x${height}; expected ${expectedSize}x${expectedSize}`);
  }
  if (data.length < 50_000) throw new Error(`${name} is unexpectedly small (${data.length} bytes)`);
}

const copy = await readFile(resolve(projectRoot, "release-assets", "store-copy.md"), "utf8");
if (!copy.includes("100 个原创可解关卡") || !copy.includes("300 星")) {
  throw new Error("Store copy must advertise the current 100-level / 300-star release");
}
if (/30 个原创|90 星/.test(copy)) throw new Error("Store copy still contains legacy 30-level / 90-star claims");

console.log(`Verified 10 current 720x1584 release screenshots (${totalBytes} bytes), 512/1024 app icons, and current 100-level store copy.`);
