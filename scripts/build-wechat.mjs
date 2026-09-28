import { build } from "esbuild";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { minify } from "terser";
import { prepareWechatImages, wechatArtManifestSource } from "./wechat-image-formats.mjs";
import { createWechatLevelModule } from "./wechat-level-data.mjs";
import {createIdenticalArtPlan, rewriteIdenticalArtSource, removeGeneratedArtAliases} from "./wechat-identical-art.mjs";
import { removeGeneratedWechatExcludedResources } from "./wechat-resource-policy.mjs";
import {
  computeWechatSourceFingerprint,
  resolveWechatOutput,
  snapshotWechatOutput,
  wechatBuildManifestPath,
} from "./wechat-build-integrity.mjs";

const root = resolve(import.meta.dirname, "..");
const output = resolveWechatOutput(root);
const idePrivateFiles = new Set(["project.private.config.json"]);
const sourceFingerprintBeforeBuild = await computeWechatSourceFingerprint(root);
// Ship the exact final campaign, not every historical authoring overlay. The
// materializer deep-compares all 200 levels before returning any replacement.
const levelCompilation = await createWechatLevelModule(root);
const identicalArt = await createIdenticalArtPlan(root);

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

const gameBundlePath = resolve(output, "game.js");
await build({
  entryPoints: [resolve(root, "src/wechat.ts")],
  outfile: gameBundlePath,
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "es2020",
  minify: true,
  sourcemap: false,
  legalComments: "none",
  plugins: [{
    name: "wechat-native-image-formats",
    setup(bundler) {
      bundler.onLoad({ filter: /[\\/]src[\\/]core[\\/]levels\.ts$/ }, () => ({
        contents: levelCompilation.source,
        loader: "js",
      }));
      bundler.onLoad({ filter: /[\\/]src[\\/]game[\\/]artManifest\.ts$/ }, async ({ path }) => ({
        contents: wechatArtManifestSource(rewriteIdenticalArtSource(await readFile(path, "utf8"), identicalArt)),
        loader: "ts",
      }));
    },
  }],
});
const terserResult = await minify(await readFile(gameBundlePath, "utf8"), {
  ecma: 2020,
  compress: { passes: 3 },
  mangle: true,
  format: { comments: false },
});
if (!terserResult.code) throw new Error("Terser produced an empty WeChat game bundle");
await writeFile(gameBundlePath, terserResult.code);

await cp(resolve(root, "wechat/game.json"), resolve(output, "game.json"));
await cp(resolve(root, "wechat/project.config.json"), resolve(output, "project.config.json"));
try {
  await readFile(resolve(output, "project.private.config.json"));
} catch {
  await cp(resolve(root, "wechat/project.private.config.json"), resolve(output, "project.private.config.json"));
}
await cp(resolve(root, "public/assets"), resolve(output, "assets"), { recursive: true });
// The generated music-player artwork is intentionally Web/local-browser art.
// Keeping this 16MB set in the WeChat main package would exceed the remaining
// 20MB budget before the optional music library is provisioned remotely.
await rm(resolve(output, "assets/art/ui/music-player-v1"), { recursive: true, force: true });
const audioSource = resolve(root, "public/assets/audio");
const audioMainCopy = resolve(output, "assets/audio");
const audioSubpackage = resolve(output, "audio");
const menuMusicSubpackage = resolve(output, "menu-music");
await mkdir(audioSubpackage, { recursive: true });
await cp(resolve(root, "wechat/audio/game.js"), resolve(audioSubpackage, "game.js"));
await cp(resolve(audioSource, "happy-foods.mp3"), resolve(audioSubpackage, "happy-foods.mp3"));
await cp(resolve(audioSource, "sfx"), resolve(audioSubpackage, "sfx"), { recursive: true });
await mkdir(menuMusicSubpackage, { recursive: true });
await cp(resolve(root, "wechat/menu-music/game.js"), resolve(menuMusicSubpackage, "game.js"));
await cp(resolve(audioSource, "happy-carnival.mp3"), resolve(menuMusicSubpackage, "happy-carnival.mp3"));
await rm(audioMainCopy, { recursive: true, force: true });
const formalPageSource = resolve(root, "public/assets/art/ui/formal-pages");
const formalPageMainCopy = resolve(output, "assets/art/ui/formal-pages");
const formalPageSubpackage = resolve(output, "meta-ui/formal-pages");
await mkdir(resolve(output, "meta-ui"), { recursive: true });
await cp(resolve(root, "wechat/meta-ui/game.js"), resolve(output, "meta-ui/game.js"));
await cp(formalPageSource, formalPageSubpackage, { recursive: true });
const journeyThemeNames = [
  ...Array.from({ length: 10 }, (_, index) => `episode-${String(index + 1).padStart(2, "0")}.webp`),
  "episode-locked-shade.png",
  "episode-range-panel.png",
  "episode-selected-button.png",
  "episode-action-button.png",
  ...Array.from({ length: 9 }, (_, index) => `home-${String(index + 2).padStart(2, "0")}.jpg`),
];
await mkdir(resolve(output, "journey-themes"), { recursive: true });
await cp(resolve(root, "wechat/journey-themes/game.js"), resolve(output, "journey-themes/game.js"));
for (const name of journeyThemeNames) {
  await cp(resolve(formalPageSource, "journey", name), resolve(output, "journey-themes", name));
  await rm(resolve(formalPageSubpackage, "journey", name), { force: true });
}
const collectionArtSource = resolve(formalPageSource, "collection-card-atlases-v1");
const collectionArtSubpackage = resolve(output, "collection-art");
await mkdir(resolve(collectionArtSubpackage, "atlases"), { recursive: true });
await cp(resolve(root, "wechat/collection-art/game.js"), resolve(collectionArtSubpackage, "game.js"));
await cp(collectionArtSource, resolve(collectionArtSubpackage, "atlases"), { recursive: true });
await rm(resolve(formalPageSubpackage, "collection-card-atlases-v1"), { recursive: true, force: true });
await rm(formalPageMainCopy, { recursive: true, force: true });
const formalBlockSource = resolve(root, "public/assets/art/gameplay/blocks/formal-v1");
const formalBlockMainCopy = resolve(output, "assets/art/gameplay/blocks/formal-v1");
const formalBlockSubpackage = resolve(output, "gameplay-art/formal-v1");
await mkdir(resolve(output, "gameplay-art"), { recursive: true });
await cp(resolve(root, "wechat/gameplay-art/game.js"), resolve(output, "gameplay-art/game.js"));
await cp(formalBlockSource, formalBlockSubpackage, { recursive: true });
await rm(formalBlockMainCopy, { recursive: true, force: true });
const gameplayFxSource = resolve(root, "public/assets/art/fx");
const gameplayFxMainCopy = resolve(output, "assets/art/fx");
const gameplayFxSubpackage = resolve(output, "gameplay-art/fx");
await cp(gameplayFxSource, gameplayFxSubpackage, { recursive: true });
await rm(gameplayFxMainCopy, { recursive: true, force: true });
const revisedMechanismSource = resolve(root, "public/assets/art/gameplay/mechanics/revised-reference-v1");
const revisedMechanismMainCopy = resolve(output, "assets/art/gameplay/mechanics/revised-reference-v1");
const revisedMechanismSubpackage = resolve(output, "gameplay-art/revised-mechanisms");
await cp(revisedMechanismSource, revisedMechanismSubpackage, { recursive: true });
await rm(revisedMechanismMainCopy, { recursive: true, force: true });
const shutterNineSliceSource = resolve(root, "public/assets/art/gameplay/mechanics/shutter-nine-slice-v1");
const shutterNineSliceMainCopy = resolve(output, "assets/art/gameplay/mechanics/shutter-nine-slice-v1");
const shutterNineSliceSubpackage = resolve(output, "gameplay-art/shutter-nine-slice");
await cp(shutterNineSliceSource, shutterNineSliceSubpackage, { recursive: true });
await rm(shutterNineSliceMainCopy, { recursive: true, force: true });
const resourceExclusions = await removeGeneratedWechatExcludedResources(root, output);
const nativeImages = await prepareWechatImages(output);
await removeGeneratedArtAliases(root, output, identicalArt);
console.log(`Prepared ${nativeImages.pngCount} native PNG images and ${nativeImages.compactedCount} same-size JPEG backgrounds for WeChat.`);
const sourceFingerprintAfterBuild = await computeWechatSourceFingerprint(root);
if (sourceFingerprintAfterBuild !== sourceFingerprintBeforeBuild) {
  throw new Error("WeChat build inputs changed while the package was being generated; run the build again on a stable tree");
}
await writeFile(wechatBuildManifestPath(output), `${JSON.stringify({
  schemaVersion: 1,
  levelCompilation: levelCompilation.report,
  identicalArt,
  resourceExclusions,
  sourceFingerprint: sourceFingerprintAfterBuild,
  outputs: await snapshotWechatOutput(output),
}, null, 2)}\n`);
console.log(`WeChat package built at ${output}`);
