import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import { relative, resolve } from "node:path";

export const WECHAT_BUILD_MANIFEST = "wechat-build-manifest.json";

const normalizedRelative = (root, path) => relative(root, path).replaceAll("\\", "/");

export async function listFiles(root, directory = root) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolutePath = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(root, absolutePath));
    else files.push(normalizedRelative(root, absolutePath));
  }
  return files.sort();
}

async function hashFile(path) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

async function hashTree(projectRoot, entries) {
  const records = [];
  for (const entry of entries) {
    const absolutePath = resolve(projectRoot, entry);
    const metadata = await stat(absolutePath);
    const paths = metadata.isDirectory()
      ? (await listFiles(projectRoot, absolutePath))
      : [normalizedRelative(projectRoot, absolutePath)];
    for (const path of paths) records.push(`${path}\0${await hashFile(resolve(projectRoot, path))}`);
  }
  return createHash("sha256").update(records.sort().join("\n")).digest("hex");
}

export function resolveWechatOutput(projectRoot) {
  const requested = process.env.WECHAT_OUTPUT_DIR?.trim() || "dist-wechat";
  const output = resolve(projectRoot, requested);
  const withinProject = normalizedRelative(projectRoot, output);
  const allowed = withinProject === "dist-wechat" || withinProject.startsWith(".codex-temp/");
  if (!withinProject || withinProject === "." || withinProject.startsWith("../") || withinProject === ".." || !allowed) {
    throw new Error(`Unsafe WECHAT_OUTPUT_DIR: ${requested}`);
  }
  return output;
}

export const wechatBuildManifestPath = (output) => `${output}.build-manifest.json`;

export async function computeWechatSourceFingerprint(projectRoot) {
  return hashTree(projectRoot, [
    "src",
    "public/assets",
    "wechat/game.json",
    "wechat/project.config.json",
    "wechat/project.private.config.json",
    "wechat/meta-ui/game.js",
    "wechat/gameplay-art/game.js",
    "wechat/journey-themes/game.js",
    "wechat/collection-art/game.js",
    "wechat/audio/game.js",
    "wechat/menu-music/game.js",
    "wechat/league-ui/game.js",
    "wechat/event-ui/game.js",
    "package.json",
    "pnpm-lock.yaml",
    "scripts/build-wechat.mjs",
    "scripts/wechat-music-assets.mjs",
    "scripts/wechat-build-integrity.mjs",
    "scripts/wechat-image-formats.mjs",
    "scripts/wechat-identical-art.mjs",
    "scripts/wechat-level-data.mjs",
    "scripts/wechat-event-level-data.mjs",
    "scripts/wechat-event-assets.mjs",
    "scripts/wechat-background-audio.mjs",
    "scripts/wechat-journey-assets.mjs",
    "tools/encode-original-sfx-mp3.mjs",
    "scripts/wechat-resource-policy.mjs",
    "tools/wechat-layout-codec.mjs",
  ]);
}

export async function snapshotWechatOutput(output) {
  const records = [];
  for (const path of await listFiles(output)) {
    if (path === "project.private.config.json") continue;
    const absolutePath = resolve(output, path);
    records.push({ path, bytes: (await stat(absolutePath)).size, sha256: await hashFile(absolutePath) });
  }
  return records;
}

export async function snapshotDirectory(directory) {
  const records = [];
  for (const path of await listFiles(directory)) {
    const absolutePath = resolve(directory, path);
    records.push({ path, bytes: (await stat(absolutePath)).size, sha256: await hashFile(absolutePath) });
  }
  return records;
}
