import { build } from "esbuild";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { minify } from "terser";
import { prepareWechatImages, wechatArtManifestSource, WECHAT_EVENT_IMAGE_ENCODING } from "./wechat-image-formats.mjs";
import { createWechatLevelModule } from "./wechat-level-data.mjs";
import { createWechatEventLevelModules } from './wechat-event-level-data.mjs';
import { prepareWechatEventArt } from './wechat-event-assets.mjs';
import { prepareWechatBackgroundAudio } from './wechat-background-audio.mjs';
import { prepareWechatJourneyThemes } from './wechat-journey-assets.mjs';
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
const eventCompilation = await createWechatEventLevelModules(root);
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
      // Keep this filter deliberately narrow by filename rather than relying on
      // path separators; esbuild normalizes Windows paths differently between
      // the resolver and onLoad hooks.
      bundler.onLoad({ filter: /buildTarget[.]ts$/ }, () => ({
        contents: 'export const BUILD_TARGET = "wechat"; export const IS_WECHAT_BUILD = true;',
        loader: "js",
      }));
      bundler.onLoad({ filter: /[\\/]src[\\/]core[\\/](?:leagueLevelData|formalDailyChallengeData|clonePlainData)\.ts$/ }, ({ path }) => {
        const replacement = eventCompilation.replacements.get(resolve(path));
        if (!replacement) throw new Error('Missing verified event data replacement: ' + path);
        return replacement;
      });
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
const backgroundAudio = await prepareWechatBackgroundAudio(audioSource, menuMusicSubpackage);
await rm(audioMainCopy, { recursive: true, force: true });
const formalPageSource = resolve(root, "public/assets/art/ui/formal-pages");
const formalPageMainCopy = resolve(output, "assets/art/ui/formal-pages");
const formalPageSubpackage = resolve(output, "meta-ui/formal-pages");
await mkdir(resolve(output, "meta-ui"), { recursive: true });
await cp(resolve(root, "wechat/meta-ui/game.js"), resolve(output, "meta-ui/game.js"));
await cp(formalPageSource, formalPageSubpackage, { recursive: true });
await prepareWechatJourneyThemes(root, output);
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
// Keep the small FX group in the main package. The expanded formal block set
// needs this headroom in gameplay-art; native encoding and image quality stay
// identical, and the assets above have already been copied into assets/art/fx.
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
const eventArt = await prepareWechatEventArt(root, output);
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
  eventLevelCompilation: eventCompilation.report,
  eventArt,
  eventImageEncoding: WECHAT_EVENT_IMAGE_ENCODING,
  backgroundAudio,
  identicalArt,
  resourceExclusions,
  sourceFingerprint: sourceFingerprintAfterBuild,
  outputs: await snapshotWechatOutput(output),
}, null, 2)}\n`);
console.log(`WeChat package built at ${output}`);
