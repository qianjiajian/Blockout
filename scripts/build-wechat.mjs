import { build } from "esbuild";
import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const output = resolve(root, "dist-wechat");
const idePrivateFiles = new Set(["project.private.config.json"]);

// WeChat DevTools keeps the imported project directory open on Windows.
// Preserve that directory handle and replace only its generated contents so
// `pnpm build:wechat` remains usable while the project is open in the IDE.
await mkdir(output, { recursive: true });
for (const entry of await readdir(output, { withFileTypes: true })) {
  // The IDE writes per-machine base-library and editor choices here after a
  // persistent import. They are not shipping assets and must survive rebuilds.
  if (idePrivateFiles.has(entry.name)) continue;
  await rm(resolve(output, entry.name), { recursive: entry.isDirectory(), force: true });
}

await build({
  entryPoints: [resolve(root, "src/wechat.ts")],
  outfile: resolve(output, "game.js"),
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "es2020",
  minify: true,
  sourcemap: false,
  legalComments: "none",
});

await cp(resolve(root, "wechat/game.json"), resolve(output, "game.json"));
await cp(resolve(root, "wechat/project.config.json"), resolve(output, "project.config.json"));
await cp(resolve(root, "public/assets"), resolve(output, "assets"), { recursive: true });
console.log(`WeChat package built at ${output}`);
