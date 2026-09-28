import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { prepareFormalFrozenBlockPngs } from "./formal-frozen-png.mjs";

const root = resolve(import.meta.dirname, "..");

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex").toUpperCase();
}

async function mirrorPngDirectory(
  sourceDirectory,
  targetDirectory,
  { exclude = [], expectedNames } = {},
) {
  const source = resolve(root, sourceDirectory);
  const target = resolve(root, targetDirectory);
  const excluded = new Set(exclude);
  const availableNames = (await readdir(source, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".png"))
    .map((entry) => entry.name)
    .sort();
  const names = expectedNames ? [...expectedNames].sort() : availableNames.filter((name) => !excluded.has(name));

  if (expectedNames) {
    const expected = new Set(expectedNames);
    const missing = names.filter((name) => !availableNames.includes(name));
    const unexpected = availableNames.filter((name) => !expected.has(name) && !excluded.has(name));
    if (missing.length > 0 || unexpected.length > 0) {
      throw new Error(
        `Unexpected PNG inventory in ${sourceDirectory}; missing=[${missing.join(", ")}], unexpected=[${unexpected.join(", ")}]`,
      );
    }
  }

  await rm(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });
  for (const name of names) {
    const sourcePath = resolve(source, name);
    const targetPath = resolve(target, name);
    await copyFile(sourcePath, targetPath);
    const sourceBuffer = await readFile(sourcePath);
    const targetBuffer = await readFile(targetPath);
    if (!sourceBuffer.equals(targetBuffer)) {
      throw new Error(`Byte mismatch after copying ${sourceDirectory}/${name}`);
    }
    console.log(`${targetDirectory}/${name}\t${targetBuffer.length}\t${sha256(targetBuffer)}`);
  }
  return names.length;
}

// art-source is the sole authority for approved formal gameplay art. This
// legacy-named tool never imports desktop files, recolors pixels, or writes
// sources. Board/border/exit files are mirrored byte-for-byte; the nine frozen
// block images use the same deterministic runtime encoding as art:optimize.
const formalBoardBorderV2ExpectedNames = [
  "corner-north-east.png",
  "corner-north-west.png",
  "corner-south-east.png",
  "corner-south-west.png",
  ...["horizontal", "vertical"].flatMap((orientation) =>
    [1, 2, 3].map((length) => `neutral-${orientation}-${length}.png`)),
  ...["red", "blue", "green", "yellow", "purple", "orange", "pink", "cyan"].flatMap((color) =>
    ["horizontal", "vertical"].flatMap((orientation) =>
      [1, 2, 3].map((length) => `gate-${color}-${orientation}-${length}.png`))),
];
const formalIceExpectedNames = [
  ...["horizontal", "vertical"].flatMap((orientation) =>
    [1, 2, 3].map((length) => `ice-${orientation}-${length}.png`)),
];
const formalFrozenBlockNames = await prepareFormalFrozenBlockPngs(root);
for (const name of formalFrozenBlockNames) {
  const targetBuffer = await readFile(resolve(
    root,
    "public/assets/art/gameplay/mechanics/formal-gameplay-v1",
    name,
  ));
  console.log(`public/assets/art/gameplay/mechanics/formal-gameplay-v1/${name}\t${targetBuffer.length}\t${sha256(targetBuffer)}`);
}
const counts = {
  blocks: await mirrorPngDirectory(
    "art-source/gameplay/blocks/formal-v1",
    "public/assets/art/gameplay/blocks/formal-v1",
  ),
  border: await mirrorPngDirectory(
    "art-source/gameplay/board/formal-border-v2",
    "public/assets/art/gameplay/board/formal-border-v2",
    { exclude: ["reference.png"], expectedNames: formalBoardBorderV2ExpectedNames },
  ),
  ice: await mirrorPngDirectory(
    "art-source/gameplay/mechanics/formal-ice-v1",
    "public/assets/art/gameplay/mechanics/formal-ice-v1",
    { expectedNames: formalIceExpectedNames },
  ),
  frozenBlocks: formalFrozenBlockNames.length,
};
console.log(`Mirrored ${counts.blocks} formal blocks, ${counts.border} border slices, ${counts.ice} ice strips, and prepared ${counts.frozenBlocks} whole-shape frozen blocks from art-source.`);
