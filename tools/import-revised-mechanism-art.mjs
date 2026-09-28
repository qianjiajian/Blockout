import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import sharp from "sharp";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const REVISED_ART_OUTPUT_ROOT = "public/assets/art/gameplay/mechanics/revised-reference-v1";
export const REVISED_ART_DEFAULT_SOURCE = "C:/Users/Administrator/Desktop/block out/机制素材/机制素材";
const colors = { red: "红", blue: "蓝", green: "绿", yellow: "黄", purple: "紫", orange: "橙", pink: "粉", cyan: "浅蓝" };
export const REVISED_ART_IMPORTS = [
  { source: "卷帘门/单条.png", target: "shutter-strip.png", mechanism: "shutter", role: "repeatable-slat" },
  { source: "电梯/kuang.png", target: "lift-frame.png", mechanism: "lift", role: "stationary-frame" },
  { source: "电梯/zuo.png", target: "lift-left.png", mechanism: "lift", role: "left-sliding-leaf" },
  { source: "电梯/you.png", target: "lift-right.png", mechanism: "lift", role: "right-sliding-leaf" },
  { source: "炸弹/biao.png", target: "bomb-face.png", mechanism: "bomb", role: "timer-face-without-digits" },
  ...Object.entries(colors).map(([color, sourceColor]) => ({ source: `彩色地格/${sourceColor}.png`, target: `grid-${color}.png`, mechanism: "colored-grid", role: "persistent-cell-floor", color })),
  { source: "轴向块/zuoyou.png", target: "axis-horizontal.png", mechanism: "axis", role: "horizontal-arrow" },
  { source: "轴向块/shangxia.png", target: "axis-vertical.png", mechanism: "axis", role: "vertical-arrow" },
  ...Object.entries(colors).flatMap(([color, sourceColor]) => ["horizontal", "vertical"].flatMap((orientation) => [1, 2, 3].map((length) => ({
    source: `翻转门/${orientation === "horizontal" ? "横" : "竖"}${length}${sourceColor}.png`,
    target: `flip-${color}-${orientation}-${length}.png`, mechanism: "flip-door", role: "separate-frame", color, orientation, length,
  })))),
];
export const REVISED_ART_EXCLUDED_REFERENCES = ["卷帘门/示意.png", "电梯/示意.png", "炸弹/定时器.png", "彩色地格/示意.png", "轴向块/示意.png"];
const hash = (buffer) => crypto.createHash("sha256").update(buffer).digest("hex");
const pngInfo = (buffer) => {
  if (buffer.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") throw new Error("Input is not PNG");
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20), bytes: buffer.length, sha256: hash(buffer) };
};
const exists = async (file) => fs.access(file).then(() => true, () => false);

export const verifyRevisedMechanismArt = async (root = projectRoot) => {
  const targetRoot = path.join(root, REVISED_ART_OUTPUT_ROOT);
  const manifest = JSON.parse(await fs.readFile(path.join(targetRoot, "manifest.json"), "utf8"));
  if (manifest.entries.length !== REVISED_ART_IMPORTS.length) throw new Error("Imported component count drifted");
  for (const entry of manifest.entries) {
    const file = path.resolve(root, "public", entry.url);
    if (!file.startsWith(`${targetRoot}${path.sep}`)) throw new Error(`Unexpected asset target ${entry.url}`);
    const buffer = await fs.readFile(file);
    const info = pngInfo(buffer);
    if (info.sha256 !== entry.sha256 || info.bytes !== entry.bytes || info.width !== entry.width || info.height !== entry.height) {
      throw new Error(`Imported original drifted: ${entry.url}`);
    }
    const rgba = await sharp(buffer).ensureAlpha().raw().toBuffer();
    if (hash(rgba) !== entry.rgbaSha256) throw new Error(`Decoded pixels drifted: ${entry.url}`);
  }
  return { entries: manifest.entries.length, bytes: manifest.totalRuntimePngBytes, exactOriginals: true };
};

export const importRevisedMechanismArt = async (sourceRoot = REVISED_ART_DEFAULT_SOURCE, root = projectRoot) => {
  const targetRoot = path.resolve(root, REVISED_ART_OUTPUT_ROOT);
  const entries = [];
  const totals = {};
  for (const descriptor of REVISED_ART_IMPORTS) {
    const sourcePath = path.resolve(sourceRoot, descriptor.source);
    const destination = path.resolve(targetRoot, descriptor.target);
    if (!destination.startsWith(`${targetRoot}${path.sep}`)) throw new Error(`Unsafe import target ${descriptor.target}`);
    const buffer = await fs.readFile(sourcePath);
    const info = pngInfo(buffer);
    if (await exists(destination)) {
      if (hash(await fs.readFile(destination)) !== info.sha256) throw new Error(`Refusing to overwrite modified imported original: ${destination}`);
    } else {
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.copyFile(sourcePath, destination);
    }
    const rgba = await sharp(buffer).ensureAlpha().raw().toBuffer();
    entries.push({ ...descriptor, url: `${REVISED_ART_OUTPUT_ROOT.replace(/^public\//, "")}/${descriptor.target}`, ...info, rgbaSha256: hash(rgba) });
    totals[descriptor.mechanism] = (totals[descriptor.mechanism] ?? 0) + info.bytes;
  }
  const excludedReferences = [];
  for (const source of REVISED_ART_EXCLUDED_REFERENCES) excludedReferences.push({ source, reason: "reference-only; not a runtime component", ...pngInfo(await fs.readFile(path.resolve(sourceRoot, source))) });
  const manifest = {
    schemaVersion: 1, artVersion: "revised-reference-v1", sourceRoot: path.resolve(sourceRoot).replaceAll("\\", "/"),
    importPolicy: "byte-for-byte originals; no resizing, recolouring, crop, lossy encoding or reference-image import",
    hashAlgorithm: "sha256", pixelHashFormat: "sharp decoded 8-bit RGBA, row-major",
    runtimeComponentCount: entries.length, totalRuntimePngBytes: entries.reduce((sum, entry) => sum + entry.bytes, 0),
    bytesByMechanism: totals, entries, excludedReferences,
  };
  const manifestPath = path.join(targetRoot, "manifest.json");
  const serialized = `${JSON.stringify(manifest, null, 2)}\n`;
  if (await exists(manifestPath)) {
    if (await fs.readFile(manifestPath, "utf8") !== serialized) throw new Error("Import provenance changed; review it before writing a new art version");
  } else await fs.writeFile(manifestPath, serialized);
  return verifyRevisedMechanismArt(root);
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const verifyOnly = process.argv.includes("--verify");
  const sourceArgument = process.argv.find((argument) => argument.startsWith("--source="))?.slice("--source=".length);
  const result = verifyOnly ? await verifyRevisedMechanismArt() : await importRevisedMechanismArt(sourceArgument);
  console.log(JSON.stringify({ mode: verifyOnly ? "verify" : "import", ...result }));
}
