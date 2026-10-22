import { readFile, readdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { relative, resolve } from "node:path";
import { snapshotWechatAssetSource, WECHAT_EVENT_IMAGE_ENCODING } from "../scripts/wechat-image-formats.mjs";
import { createWechatEventLevelModules } from '../scripts/wechat-event-level-data.mjs';
import { EVENT_ART_PACKAGES, wechatEventArtPath } from '../scripts/wechat-event-assets.mjs';
import { encodeWechatBackgroundAudio, snapshotWechatBackgroundAudio } from '../scripts/wechat-background-audio.mjs';
import { WECHAT_JOURNEY_HOME_THEME_NAMES } from '../scripts/wechat-journey-assets.mjs';
import {createIdenticalArtPlan, deduplicatedArtSnapshot} from '../scripts/wechat-identical-art.mjs';
import {
  assertWechatResourcesExcluded,
  filterWechatAssetSnapshot,
  WECHAT_RESOURCE_EXCLUSIONS,
} from "../scripts/wechat-resource-policy.mjs";
import {
  computeWechatSourceFingerprint,
  resolveWechatOutput,
  snapshotDirectory,
  snapshotWechatOutput,
  WECHAT_BUILD_MANIFEST,
  wechatBuildManifestPath,
} from "../scripts/wechat-build-integrity.mjs";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const output = resolveWechatOutput(projectRoot);
const outputLabel = relative(projectRoot, output).replaceAll("\\", "/");
const expectedIdentity = {
  description: "脑王的诞生 - 竖屏颜色滑块益智微信小游戏",
  compileType: "game",
  appid: "wx8d67feab4925babb",
  projectname: "color-escape",
};
const mainPackageLimitBytes = 4 * 1024 * 1024;
const minimumReleaseHeadroomBytes = 256 * 1024;
const ordinarySubpackageLimitBytes = 2 * 1024 * 1024;
const independentSubpackageLimitBytes = 4 * 1024 * 1024;
const minimumSubpackageHeadroomBytes = 64 * 1024;
const totalPackageLimitBytes = 20 * 1024 * 1024;
const menuMusicFile = "happy-carnival.mp3";
const challengeMusicFile = "happy-foods.mp3";

function packageBudgetStatus(releaseBytes) {
  const headroomBytes = mainPackageLimitBytes - releaseBytes;
  if (releaseBytes > mainPackageLimitBytes) return { ok: false, reason: "limit", headroomBytes };
  if (headroomBytes < minimumReleaseHeadroomBytes) return { ok: false, reason: "headroom", headroomBytes };
  return { ok: true, reason: "ok", headroomBytes };
}

// Keep the release threshold executable instead of trusting an unchecked
// constant: exact safe boundary passes; either byte beyond a boundary fails.
if (packageBudgetStatus(mainPackageLimitBytes + 1).reason !== "limit"
  || packageBudgetStatus(mainPackageLimitBytes - minimumReleaseHeadroomBytes + 1).reason !== "headroom"
  || !packageBudgetStatus(mainPackageLimitBytes - minimumReleaseHeadroomBytes).ok) {
  throw new Error("WeChat package budget boundary self-check failed");
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(resolve(projectRoot, relativePath), "utf8"));
}

for (const relativePath of [
  "project.config.json",
  "wechat/project.config.json",
  `${outputLabel}/project.config.json`,
]) {
  const config = await readJson(relativePath);
  for (const [key, expected] of Object.entries(expectedIdentity)) {
    if (config[key] !== expected) {
      throw new Error(`${relativePath}: ${key} is ${JSON.stringify(config[key])}; expected ${JSON.stringify(expected)}`);
    }
  }
  if (config.isGameTourist !== false) throw new Error(`${relativePath}: tourist mode must stay disabled`);
  if (config.setting?.uploadWithSourceMap !== false) {
    throw new Error(`${relativePath}: uploadWithSourceMap must stay disabled for the release package`);
  }
  if (config.libVersion !== "3.17.2") {
    throw new Error(`${relativePath}: libVersion must stay on the verified subpackage-capable base library`);
  }
}

const sourceGameConfig = await readJson("wechat/game.json");
const builtGameConfig = await readJson(`${outputLabel}/game.json`);
if (JSON.stringify(sourceGameConfig) !== JSON.stringify(builtGameConfig)) {
  throw new Error(`${outputLabel}/game.json does not match wechat/game.json`);
}
if (builtGameConfig.deviceOrientation !== "portrait" || builtGameConfig.showStatusBar !== false) {
  throw new Error("The WeChat game must stay portrait and hide the native status bar");
}
const metaUiPackage = builtGameConfig.subpackages?.find((entry) => entry?.name === "meta-ui");
if (metaUiPackage?.root !== "meta-ui") {
  throw new Error("dist-wechat/game.json must declare the on-demand meta-ui subpackage");
}
const gameplayArtPackage = builtGameConfig.subpackages?.find((entry) => entry?.name === "gameplay-art");
if (gameplayArtPackage?.root !== "gameplay-art") {
  throw new Error("dist-wechat/game.json must declare the on-demand gameplay-art subpackage");
}
const journeyThemesPackage = builtGameConfig.subpackages?.find((entry) => entry?.name === "journey-themes");
if (journeyThemesPackage?.root !== "journey-themes") {
  throw new Error("dist-wechat/game.json must declare the on-demand journey-themes subpackage");
}
const collectionArtPackage = builtGameConfig.subpackages?.find((entry) => entry?.name === "collection-art");
if (collectionArtPackage?.root !== "collection-art") {
  throw new Error("dist-wechat/game.json must declare the on-demand collection-art subpackage");
}
const audioPackage = builtGameConfig.subpackages?.find((entry) => entry?.name === "audio");
if (audioPackage?.root !== "audio") {
  throw new Error("dist-wechat/game.json must declare the on-demand audio subpackage");
}
const menuMusicPackage = builtGameConfig.subpackages?.find((entry) => entry?.name === "menu-music");
if (menuMusicPackage?.root !== "menu-music") {
  throw new Error("dist-wechat/game.json must declare the on-demand menu-music subpackage");
}
for (const name of EVENT_ART_PACKAGES) {
  const entry = builtGameConfig.subpackages?.find(item => item?.name === name);
  if (entry?.root !== name || entry?.independent !== true) throw new Error('Missing independent event art package: ' + name);
}

const privateConfig = await readJson(`${outputLabel}/project.private.config.json`);
// project.private.config.json is owned by the local DevTools installation and
// may use a user-facing display name different from the release identity. It
// must still carry a meaningful name; the release project.config.json files
// above remain the exact appid/projectname contract used for packaging.
if (typeof privateConfig.projectname !== "string" || !privateConfig.projectname.trim()) {
  throw new Error(`${outputLabel}/project.private.config.json must contain a non-empty project name`);
}

for (const relativePath of [
  `${outputLabel}/game.js`,
  `${outputLabel}/assets`,
  "wechat/meta-ui/game.js",
  `${outputLabel}/meta-ui/game.js`,
  "wechat/gameplay-art/game.js",
  `${outputLabel}/gameplay-art/game.js`,
  "wechat/journey-themes/game.js",
  `${outputLabel}/journey-themes/game.js`,
  "wechat/collection-art/game.js",
  `${outputLabel}/collection-art/game.js`,
  "wechat/audio/game.js",
  `${outputLabel}/audio/game.js`,
  "wechat/menu-music/game.js",
  `${outputLabel}/menu-music/game.js`,
]) {
  await stat(resolve(projectRoot, relativePath));
}

const manifest = JSON.parse(await readFile(wechatBuildManifestPath(output), "utf8"));
if (manifest.schemaVersion !== 1) throw new Error(`${outputLabel}/${WECHAT_BUILD_MANIFEST} has an unsupported schema`);
const currentEventCompilation = await createWechatEventLevelModules(projectRoot);
if (JSON.stringify(manifest.eventLevelCompilation) !== JSON.stringify(currentEventCompilation.report)) throw new Error('WeChat league/daily packed data proof is stale');
if (JSON.stringify(manifest.eventImageEncoding) !== JSON.stringify(WECHAT_EVENT_IMAGE_ENCODING)) throw new Error('WeChat event image encoding policy is stale');
const currentOutputSnapshot = await snapshotWechatOutput(output);
assertWechatResourcesExcluded(currentOutputSnapshot);
if (JSON.stringify(manifest.resourceExclusions) !== JSON.stringify(WECHAT_RESOURCE_EXCLUSIONS)) {
  throw new Error("WeChat non-runtime resource exclusions are stale");
}
if (JSON.stringify(manifest.outputs) !== JSON.stringify(currentOutputSnapshot)) {
  throw new Error(`${outputLabel} was changed after build: output hashes do not match ${WECHAT_BUILD_MANIFEST}`);
}
const currentSourceFingerprint = await computeWechatSourceFingerprint(projectRoot);
if (manifest.sourceFingerprint !== currentSourceFingerprint) {
  throw new Error(`${outputLabel} is stale: its source fingerprint does not match the current source/assets/build inputs`);
}

const journeyThemePaths = new Set(WECHAT_JOURNEY_HOME_THEME_NAMES.map(name => `journey/${name}`));
const collectionArtPrefix = "collection-card-atlases-v1/";
const formalSourceSnapshot = await snapshotWechatAssetSource(resolve(projectRoot, "public/assets/art/ui/formal-pages"));
const identicalArt = await createIdenticalArtPlan(projectRoot);
if (JSON.stringify(manifest.identicalArt) !== JSON.stringify(identicalArt)) throw new Error('WeChat identical-art plan is stale');
const formalSource = deduplicatedArtSnapshot(filterWechatAssetSnapshot(formalSourceSnapshot, 'art/ui/formal-pages'), identicalArt).filter((file) => (
  !journeyThemePaths.has(file.path) && !file.path.startsWith(collectionArtPrefix)
    && !wechatEventArtPath(`art/ui/formal-pages/${file.path}`)
));
const formalBuilt = await snapshotDirectory(resolve(output, "meta-ui/formal-pages"));
if (JSON.stringify(formalSource) !== JSON.stringify(formalBuilt)) {
  throw new Error("meta-ui/formal-pages does not match the verified native-image encoding of formal-page source assets");
}
const requiredJourneyPresentationPaths = [
  "journey/presentation-episode-button.png",
  "journey/presentation-reward-button.png",
];
const formalBuiltPaths = new Set(formalBuilt.map((file) => file.path));
for (const path of requiredJourneyPresentationPaths) {
  if (!formalBuiltPaths.has(path)) {
    throw new Error(`meta-ui/formal-pages is missing the distinct Journey presentation button: ${path}`);
  }
}
if (await readFile(resolve(projectRoot, "wechat/meta-ui/game.js"), "utf8")
  !== await readFile(resolve(output, "meta-ui/game.js"), "utf8")) {
  throw new Error("meta-ui/game.js does not match its source entry");
}
const journeyThemeSource = formalSourceSnapshot
  .filter((file) => journeyThemePaths.has(file.path))
  .map((file) => ({ ...file, path: file.path.slice("journey/".length) }));
const journeyThemeBuilt = (await snapshotDirectory(resolve(output, "journey-themes")))
  .filter((file) => file.path !== "game.js");
if (JSON.stringify(journeyThemeSource) !== JSON.stringify(journeyThemeBuilt)) {
  throw new Error("journey-themes does not match the verified native-image encoding of Home theme art");
}
if (await readFile(resolve(projectRoot, "wechat/journey-themes/game.js"), "utf8")
  !== await readFile(resolve(output, "journey-themes/game.js"), "utf8")) {
  throw new Error("journey-themes/game.js does not match its source entry");
}
const collectionArtSource = formalSourceSnapshot
  .filter((file) => file.path.startsWith(collectionArtPrefix))
  .map((file) => ({ ...file, path: `atlases/${file.path.slice(collectionArtPrefix.length)}` }));
const collectionArtBuilt = (await snapshotDirectory(resolve(output, "collection-art")))
  .filter((file) => file.path !== "game.js");
if (JSON.stringify(collectionArtSource) !== JSON.stringify(collectionArtBuilt)) {
  throw new Error("collection-art is not an exact byte-for-byte mirror of the Collection illustration atlases");
}
if (await readFile(resolve(projectRoot, "wechat/collection-art/game.js"), "utf8")
  !== await readFile(resolve(output, "collection-art/game.js"), "utf8")) {
  throw new Error("collection-art/game.js does not match its source entry");
}
try {
  await stat(resolve(output, "assets/art/ui/formal-pages"));
  throw new Error("formal-page art was duplicated into the main package");
} catch (error) {
  if (error instanceof Error && error.message === "formal-page art was duplicated into the main package") throw error;
}

const formalBlockSource = await snapshotWechatAssetSource(resolve(projectRoot, "public/assets/art/gameplay/blocks/formal-v1"));
const formalBlockBuilt = await snapshotDirectory(resolve(output, "gameplay-art/formal-v1"));
if (JSON.stringify(formalBlockSource) !== JSON.stringify(formalBlockBuilt)) {
  throw new Error("gameplay-art/formal-v1 does not match the verified RGBA-exact PNG encoding of the formal block source assets");
}
const gameplayFxSource = await snapshotWechatAssetSource(resolve(projectRoot, "public/assets/art/fx"));
const gameplayFxBuilt = await snapshotDirectory(resolve(output, "assets/art/fx"));
if (JSON.stringify(gameplayFxSource) !== JSON.stringify(gameplayFxBuilt)) {
  throw new Error("assets/art/fx does not match the verified RGBA-exact PNG encoding of the gameplay FX source assets");
}
if (await readFile(resolve(projectRoot, "wechat/gameplay-art/game.js"), "utf8")
  !== await readFile(resolve(output, "gameplay-art/game.js"), "utf8")) {
  throw new Error("gameplay-art/game.js does not match its source entry");
}
const revisedMechanismSource = filterWechatAssetSnapshot(
  await snapshotWechatAssetSource(resolve(projectRoot, "public/assets/art/gameplay/mechanics/revised-reference-v1")),
  "art/gameplay/mechanics/revised-reference-v1",
);
const revisedMechanismBuilt = await snapshotDirectory(resolve(output, "gameplay-art/revised-mechanisms"));
if (JSON.stringify(revisedMechanismSource) !== JSON.stringify(revisedMechanismBuilt)) {
  throw new Error("gameplay-art/revised-mechanisms does not match the verified RGBA-exact revised mechanism source assets");
}
const shutterNineSliceSource = filterWechatAssetSnapshot(
  await snapshotWechatAssetSource(resolve(projectRoot, "public/assets/art/gameplay/mechanics/shutter-nine-slice-v1")),
  "art/gameplay/mechanics/shutter-nine-slice-v1",
);
const shutterNineSliceBuilt = await snapshotDirectory(resolve(output, "gameplay-art/shutter-nine-slice"));
if (JSON.stringify(shutterNineSliceSource) !== JSON.stringify(shutterNineSliceBuilt)) {
  throw new Error("gameplay-art/shutter-nine-slice does not match the verified RGBA-exact shutter nine-slice source assets");
}
try {
  await stat(resolve(output, "assets/art/gameplay/blocks/formal-v1"));
  throw new Error("formal block art was duplicated into the main package");
} catch (error) {
  if (error instanceof Error && error.message === "formal block art was duplicated into the main package") throw error;
}
try {
  await stat(resolve(output, "gameplay-art/fx"));
  throw new Error("gameplay FX art was duplicated into the gameplay-art subpackage");
} catch (error) {
  if (error instanceof Error && error.message === "gameplay FX art was duplicated into the gameplay-art subpackage") throw error;
}
try {
  await stat(resolve(output, "assets/art/gameplay/mechanics/revised-reference-v1"));
  throw new Error("revised mechanism art was duplicated into the main package");
} catch (error) {
  if (error instanceof Error && error.message === "revised mechanism art was duplicated into the main package") throw error;
}
try {
  await stat(resolve(output, "assets/art/gameplay/mechanics/shutter-nine-slice-v1"));
  throw new Error("shutter nine-slice art was duplicated into the main package");
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

const allPublicAssets = deduplicatedArtSnapshot(filterWechatAssetSnapshot(await snapshotWechatAssetSource(resolve(projectRoot, "public/assets"))), identicalArt, '');
for (const name of EVENT_ART_PACKAGES) {
  const expected = allPublicAssets.filter(file => wechatEventArtPath(file.path)?.startsWith(name + '/'))
    .map(file => ({ ...file, path: wechatEventArtPath(file.path).slice(name.length + 1) }))
    .sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  const actual = (await snapshotDirectory(resolve(output, name))).filter(file => file.path !== 'game.js');
  if (!expected.length || JSON.stringify(expected) !== JSON.stringify(actual)) throw new Error('Event art missing, stale or changed: ' + name);
  if (await readFile(resolve(projectRoot, 'wechat', name, 'game.js'), 'utf8') !== await readFile(resolve(output, name, 'game.js'), 'utf8')) throw new Error('Event package entry changed: ' + name);
}
const publicAssets = allPublicAssets
  .filter((file) => !file.path.startsWith("art/ui/formal-pages/")
    && !file.path.startsWith("art/gameplay/blocks/formal-v1/")
    && !file.path.startsWith("art/gameplay/mechanics/revised-reference-v1/")
    && !file.path.startsWith("art/gameplay/mechanics/shutter-nine-slice-v1/")
    && !file.path.startsWith("audio/") && !wechatEventArtPath(file.path));
const mainAssets = await snapshotDirectory(resolve(output, "assets"));
if (JSON.stringify(publicAssets) !== JSON.stringify(mainAssets)) {
  throw new Error("main-package assets are stale, missing, or different from public/assets");
}
const allAudioSourceSnapshot = filterWechatAssetSnapshot(
  await snapshotDirectory(resolve(projectRoot, "public/assets/audio")), "audio",
);
const audioSourceSnapshot = allAudioSourceSnapshot
  .filter((file) => file.path === challengeMusicFile || file.path.startsWith("sfx/"));
const audioBuiltSnapshot = (await snapshotDirectory(resolve(output, "audio")))
  .filter((file) => file.path !== "game.js");
if (JSON.stringify(audioSourceSnapshot) !== JSON.stringify(audioBuiltSnapshot)) {
  throw new Error("audio subpackage is not an exact byte-for-byte mirror of the challenge music and effects");
}
if (await readFile(resolve(projectRoot, "wechat/audio/game.js"), "utf8")
  !== await readFile(resolve(output, "audio/game.js"), "utf8")) {
  throw new Error("audio/game.js does not match its source entry");
}
const menuMusicSourceSnapshot = await snapshotWechatBackgroundAudio(resolve(projectRoot, 'public/assets/audio'));
const backgroundAudioProof = (await encodeWechatBackgroundAudio(resolve(projectRoot, 'public/assets/audio', menuMusicFile))).record;
if (JSON.stringify(manifest.backgroundAudio) !== JSON.stringify(backgroundAudioProof)) throw new Error('Menu music encoding proof is stale');
const menuMusicBuiltSnapshot = (await snapshotDirectory(resolve(output, "menu-music")))
  .filter((file) => file.path === menuMusicFile);
if (menuMusicSourceSnapshot.length !== 1
  || JSON.stringify(menuMusicSourceSnapshot) !== JSON.stringify(menuMusicBuiltSnapshot)) {
  throw new Error("menu-music subpackage does not match the verified complete-duration menu soundtrack encoding");
}
if (await readFile(resolve(projectRoot, "wechat/menu-music/game.js"), "utf8")
  !== await readFile(resolve(output, "menu-music/game.js"), "utf8")) {
  throw new Error("menu-music/game.js does not match its source entry");
}
try {
  await stat(resolve(output, "assets/audio"));
  throw new Error("audio was duplicated into the main package");
} catch (error) {
  if (error instanceof Error && error.message === "audio was duplicated into the main package") throw error;
}

async function findFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolutePath = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await findFiles(absolutePath));
    else files.push({ path: absolutePath, name: entry.name, bytes: (await stat(absolutePath)).size });
  }
  return files;
}

const builtFiles = await findFiles(output);
const unsupportedImages = builtFiles.filter((file) => /\.webp$/i.test(file.name));
if (unsupportedImages.length) throw new Error("WeChat release must not require native WebP image decoding");
const gameCode = await readFile(resolve(output, "game.js"), "utf8");
if (/\.webp["'`]/i.test(gameCode)) throw new Error("WeChat game still references WebP assets");
const sourceMaps = builtFiles.filter((file) => file.name.endsWith(".map"));
if (sourceMaps.length > 0) throw new Error(`WeChat release contains sourcemaps: ${sourceMaps.map((file) => file.path).join(", ")}`);

// DevTools owns this per-machine file and does not upload it as game content.
// Count everything else conservatively, including project.config.json, so the
// gate stays stricter than the upload transform instead of depending on it.
const releaseFiles = builtFiles.filter((file) => file.name !== "project.private.config.json");
const relativeReleasePath = (file) => relative(output, file.path).replaceAll("\\", "/");
const metaUiFiles = releaseFiles.filter((file) => relativeReleasePath(file).startsWith("meta-ui/"));
const gameplayArtFiles = releaseFiles.filter((file) => relativeReleasePath(file).startsWith("gameplay-art/"));
const journeyThemeFiles = releaseFiles.filter((file) => relativeReleasePath(file).startsWith("journey-themes/"));
const collectionArtFiles = releaseFiles.filter((file) => relativeReleasePath(file).startsWith("collection-art/"));
const audioFiles = releaseFiles.filter((file) => relativeReleasePath(file).startsWith("audio/"));
const menuMusicFiles = releaseFiles.filter((file) => relativeReleasePath(file).startsWith("menu-music/"));
const mainReleaseFiles = releaseFiles.filter((file) => !relativeReleasePath(file).startsWith("meta-ui/")
  && !relativeReleasePath(file).startsWith("gameplay-art/")
  && !relativeReleasePath(file).startsWith("journey-themes/")
  && !relativeReleasePath(file).startsWith("collection-art/")
  && !relativeReleasePath(file).startsWith("audio/")
  && !relativeReleasePath(file).startsWith("menu-music/")
  && !EVENT_ART_PACKAGES.some(name => relativeReleasePath(file).startsWith(name + '/')));
const eventPackageSizes = EVENT_ART_PACKAGES.map(name => {
  const files = releaseFiles.filter(file => relativeReleasePath(file).startsWith(name + '/'));
  const bytes = files.reduce((sum, file) => sum + file.bytes, 0);
  const headroomBytes = independentSubpackageLimitBytes - bytes;
  if (!files.length || headroomBytes < minimumSubpackageHeadroomBytes) throw new Error(`Event package ${name} is missing or over guarded budget: ${bytes}`);
  return { name, files: files.length, bytes, headroomBytes };
});
console.log('Verified event packages and exact league100/daily450 data: ' + JSON.stringify(eventPackageSizes));
const releaseBytes = mainReleaseFiles.reduce((sum, file) => sum + file.bytes, 0);
const metaUiBytes = metaUiFiles.reduce((sum, file) => sum + file.bytes, 0);
const totalReleaseBytes = releaseFiles.reduce((sum, file) => sum + file.bytes, 0);
const metaUiLimitBytes = metaUiPackage.independent === true
  ? independentSubpackageLimitBytes
  : ordinarySubpackageLimitBytes;
if (!metaUiFiles.length || metaUiBytes > metaUiLimitBytes) {
  throw new Error(`meta-ui subpackage has ${metaUiFiles.length} files / ${metaUiBytes} bytes; expected 1-${metaUiLimitBytes} bytes`);
}
const metaUiHeadroomBytes = metaUiLimitBytes - metaUiBytes;
if (metaUiHeadroomBytes < minimumSubpackageHeadroomBytes) {
  throw new Error(`meta-ui subpackage has only ${metaUiHeadroomBytes} bytes of headroom; keep at least ${minimumSubpackageHeadroomBytes} bytes`);
}
const gameplayArtBytes = gameplayArtFiles.reduce((sum, file) => sum + file.bytes, 0);
const gameplayArtLimitBytes = gameplayArtPackage.independent === true
  ? independentSubpackageLimitBytes
  : ordinarySubpackageLimitBytes;
if (!gameplayArtFiles.length || gameplayArtBytes > gameplayArtLimitBytes) {
  throw new Error(`gameplay-art subpackage has ${gameplayArtFiles.length} files / ${gameplayArtBytes} bytes; expected 1-${gameplayArtLimitBytes} bytes`);
}
const gameplayArtHeadroomBytes = gameplayArtLimitBytes - gameplayArtBytes;
if (gameplayArtHeadroomBytes < minimumSubpackageHeadroomBytes) {
  throw new Error(`gameplay-art subpackage has only ${gameplayArtHeadroomBytes} bytes of headroom; keep at least ${minimumSubpackageHeadroomBytes} bytes`);
}
const journeyThemeBytes = journeyThemeFiles.reduce((sum, file) => sum + file.bytes, 0);
const journeyThemeLimitBytes = journeyThemesPackage.independent === true
  ? independentSubpackageLimitBytes
  : ordinarySubpackageLimitBytes;
if (!journeyThemeFiles.length || journeyThemeBytes > journeyThemeLimitBytes) {
  throw new Error(`journey-themes subpackage has ${journeyThemeFiles.length} files / ${journeyThemeBytes} bytes; expected 1-${journeyThemeLimitBytes} bytes`);
}
const journeyThemeHeadroomBytes = journeyThemeLimitBytes - journeyThemeBytes;
if (journeyThemeHeadroomBytes < minimumSubpackageHeadroomBytes) {
  throw new Error(`journey-themes subpackage has only ${journeyThemeHeadroomBytes} bytes of headroom; keep at least ${minimumSubpackageHeadroomBytes} bytes`);
}
const collectionArtBytes = collectionArtFiles.reduce((sum, file) => sum + file.bytes, 0);
const collectionArtLimitBytes = collectionArtPackage.independent === true
  ? independentSubpackageLimitBytes
  : ordinarySubpackageLimitBytes;
if (!collectionArtFiles.length || collectionArtBytes > collectionArtLimitBytes) {
  throw new Error(`collection-art subpackage has ${collectionArtFiles.length} files / ${collectionArtBytes} bytes; expected 1-${collectionArtLimitBytes} bytes`);
}
const collectionArtHeadroomBytes = collectionArtLimitBytes - collectionArtBytes;
if (collectionArtHeadroomBytes < minimumSubpackageHeadroomBytes) {
  throw new Error(`collection-art subpackage has only ${collectionArtHeadroomBytes} bytes of headroom; keep at least ${minimumSubpackageHeadroomBytes} bytes`);
}
const audioBytes = audioFiles.reduce((sum, file) => sum + file.bytes, 0);
const audioLimitBytes = audioPackage.independent === true
  ? independentSubpackageLimitBytes
  : ordinarySubpackageLimitBytes;
if (!audioFiles.length || audioBytes > audioLimitBytes) {
  throw new Error(`audio subpackage has ${audioFiles.length} files / ${audioBytes} bytes; expected 1-${audioLimitBytes} bytes`);
}
const audioHeadroomBytes = audioLimitBytes - audioBytes;
if (audioHeadroomBytes < minimumSubpackageHeadroomBytes) {
  throw new Error(`audio subpackage has only ${audioHeadroomBytes} bytes of headroom; keep at least ${minimumSubpackageHeadroomBytes} bytes`);
}
const menuMusicBytes = menuMusicFiles.reduce((sum, file) => sum + file.bytes, 0);
const menuMusicLimitBytes = menuMusicPackage.independent === true
  ? independentSubpackageLimitBytes
  : ordinarySubpackageLimitBytes;
if (!menuMusicFiles.length || menuMusicBytes > menuMusicLimitBytes) {
  throw new Error(`menu-music subpackage has ${menuMusicFiles.length} files / ${menuMusicBytes} bytes; expected 1-${menuMusicLimitBytes} bytes`);
}
const menuMusicHeadroomBytes = menuMusicLimitBytes - menuMusicBytes;
if (menuMusicHeadroomBytes < minimumSubpackageHeadroomBytes) {
  throw new Error(`menu-music subpackage has only ${menuMusicHeadroomBytes} bytes of headroom; keep at least ${minimumSubpackageHeadroomBytes} bytes`);
}
if (totalReleaseBytes > totalPackageLimitBytes) {
  throw new Error(`All WeChat packages total ${totalReleaseBytes} bytes, above the ${totalPackageLimitBytes}-byte limit`);
}
const budget = packageBudgetStatus(releaseBytes);
const growthBudgetBytes = budget.headroomBytes - minimumReleaseHeadroomBytes;
if (budget.reason === "limit") {
  throw new Error(`WeChat main package is ${releaseBytes} bytes, above the ${mainPackageLimitBytes}-byte (4 MiB) limit`);
}
if (budget.reason === "headroom") {
  throw new Error(
    `WeChat main package has only ${budget.headroomBytes} bytes of headroom; keep at least ${minimumReleaseHeadroomBytes} bytes or move optional art into a subpackage`,
  );
}

console.log(
  `Verified WeChat project identity ${expectedIdentity.projectname} / ${expectedIdentity.appid}, portrait config, private IDE config, ${mainReleaseFiles.length} main files / ${releaseBytes} bytes / ${budget.headroomBytes} bytes platform headroom / ${growthBudgetBytes} bytes guarded growth budget, meta-ui ${metaUiFiles.length} files / ${metaUiBytes} bytes / ${metaUiHeadroomBytes} bytes headroom, gameplay-art ${gameplayArtFiles.length} files / ${gameplayArtBytes} bytes / ${gameplayArtHeadroomBytes} bytes headroom, journey-themes ${journeyThemeFiles.length} files / ${journeyThemeBytes} bytes / ${journeyThemeHeadroomBytes} bytes headroom, collection-art ${collectionArtFiles.length} files / ${collectionArtBytes} bytes / ${collectionArtHeadroomBytes} bytes headroom, audio ${audioFiles.length} files / ${audioBytes} bytes / ${audioHeadroomBytes} bytes headroom, menu-music ${menuMusicFiles.length} files / ${menuMusicBytes} bytes / ${menuMusicHeadroomBytes} bytes headroom, total ${totalReleaseBytes} bytes, and 0 sourcemaps.`,
);
