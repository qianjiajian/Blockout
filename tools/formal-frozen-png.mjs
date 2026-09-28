import { createRequire } from "node:module";
import { mkdir, readdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const sharp = require("C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp");

export const FORMAL_FROZEN_BLOCK_NAMES = Object.freeze([
  "ice-cell.png",
  "ice-vertical-2.png",
  "ice-vertical-3.png",
  "ice-horizontal-2.png",
  "ice-horizontal-3.png",
  "ice-l-triomino.png",
  "ice-s-tetromino.png",
  "ice-t-tetromino.png",
  "ice-square-2x2.png",
]);

// Preserve the supplied dimensions and alpha silhouette while reducing the
// runtime-only files enough to retain WeChat main/total-package headroom. The
// authored PNGs in art-source remain untouched and are SHA-locked by tests.
export const FORMAL_FROZEN_PNG_OPTIONS = Object.freeze({
  compressionLevel: 9,
  palette: true,
  colours: 128,
  quality: 85,
  effort: 10,
  dither: 0.8,
});

// Mechanism overlays are viewed at their native rim/block scale, so retain a
// wider palette than the frozen-block catalog while still keeping the optional
// WeChat art comfortably below the aggregate package limit.
export const FORMAL_MECHANISM_PNG_OPTIONS = Object.freeze({
  compressionLevel: 9,
  palette: true,
  colours: 256,
  quality: 95,
  effort: 10,
  dither: 0.5,
});

export async function prepareFormalFrozenBlockPngs(root) {
  const sourceDirectory = resolve(root, "art-source/gameplay/mechanics/formal-gameplay-v1");
  const targetDirectory = resolve(root, "public/assets/art/gameplay/mechanics/formal-gameplay-v1");
  const availableNames = (await readdir(sourceDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".png"))
    .map((entry) => entry.name)
    .sort();
  const expectedNames = [...FORMAL_FROZEN_BLOCK_NAMES].sort();
  const missing = expectedNames.filter((name) => !availableNames.includes(name));
  const unexpected = availableNames.filter((name) => !expectedNames.includes(name));
  if (missing.length > 0 || unexpected.length > 0) {
    throw new Error(
      `Unexpected PNG inventory in formal-gameplay-v1; missing=[${missing.join(", ")}], unexpected=[${unexpected.join(", ")}]`,
    );
  }

  await rm(targetDirectory, { recursive: true, force: true });
  await mkdir(targetDirectory, { recursive: true });
  for (const name of FORMAL_FROZEN_BLOCK_NAMES) {
    await sharp(resolve(sourceDirectory, name))
      .png(FORMAL_FROZEN_PNG_OPTIONS)
      .toFile(resolve(targetDirectory, name));
  }
  return [...FORMAL_FROZEN_BLOCK_NAMES];
}
