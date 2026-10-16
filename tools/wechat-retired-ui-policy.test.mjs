import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import {
  assertRetiredWechatUiHasNoConsumers,
  assertWechatResourcesExcluded,
  filterWechatAssetSnapshot,
  verifyRetiredWechatUiConsumers,
  WECHAT_RESOURCE_EXCLUSIONS,
} from "../scripts/wechat-resource-policy.mjs";
import { wechatEventArtPath } from "../scripts/wechat-event-assets.mjs";

const root = resolve(import.meta.dirname, "..");
const manifest = await readFile(resolve(root, "src/game/artManifest.ts"), "utf8");
const expected = {
  "league-video-v1": ["row", "self-row", "score-token", "coin-reward", "bronze", "silver", "gold", "platinum", "emerald", "diamond", "master", "glory"],
  "daily-challenge-v2": ["panel-frame", "header-bar", "reward-banner", "row-frame", "reward-card", "first-clear-tag", "challenge-button", "locked-button", "close-button", "attempt-badge", "difficulty-diamond"],
  "daily-challenge-v1": ["entry-icon", "lock-icon", "plus-icon"],
};
const retired = WECHAT_RESOURCE_EXCLUSIONS.filter(({ reason }) => reason === "retired-ui-art");
const sourcesWith = (text, path = "game/consumer.ts") => [
  { path: "game/artManifest.ts", text: manifest }, { path, text },
];

test("precisely the reviewed 26 paths are excluded at their pre-relocation copies", () => {
  assert.deepEqual(retired.map(({ source }) => source).sort(), Object.entries(expected)
    .flatMap(([directory, names]) => names.map((name) => `art/ui/${directory}/${name}.png`)).sort());
  for (const entry of retired) {
    assert.equal(entry.output, `assets/${entry.source}`);
    assert.equal(filterWechatAssetSnapshot([{ path: entry.source }]).length, 0);
  }
});

test("real runtime sources have no old UI URL or archived-constant consumer", async () => {
  const result = await verifyRetiredWechatUiConsumers(root);
  assert.equal(result.assets, 26);
  assert.equal(result.archives, 2);
  assert(result.sourceFiles > 100);
});

test("live league controls, supplied profile frames and profile avatar unlocks remain shipping", () => {
  const paths = [
    ...["round-button", "continue-button", "parchment", "glory-star", "background"].map((name) => `art/ui/league-video-v1/${name}.png`),
    "art/ui/league-rank-badges-v2/bronze.png", "art/ui/league-supplied-v1/row-regular.png",
    "art/ui/daily-challenge-supplied-v1/panel-frame.png",
    ...Array.from({ length: 10 }, (_, index) => `art/ui/profile-unlocks-v1/avatar-${index + 15}.png`),
    ...Array.from({ length: 19 }, (_, index) => `art/ui/profile-frames-supplied-v1/frame-${index}.png`),
  ].map((path) => ({ path }));
  assert.deepEqual(filterWechatAssetSnapshot(paths), paths);
});

test("all replaced frames are excluded from both main and event packages while new frames relocate", () => {
  const frames = WECHAT_RESOURCE_EXCLUSIONS.filter(({ reason }) => reason === "retired-profile-frame-art");
  assert.deepEqual(frames.map(({ source }) => source), Array.from({ length: 19 }, (_, index) =>
    `art/ui/${index < 9 ? 'profile-reference-v1' : 'profile-unlocks-v1'}/frame-${index}.png`));
  for (const { source, output } of frames) {
    assert.equal(filterWechatAssetSnapshot([{ path: source }]).length, 0);
    for (const path of [output, wechatEventArtPath(source)]) {
      assert.throws(() => assertWechatResourcesExcluded([{ path }]), /Non-runtime resource was shipped/);
    }
  }
  for (let index = 0; index < 19; index++) {
    const source = `art/ui/profile-frames-supplied-v1/frame-${index}.png`;
    const target = `event-ui/profile-frames-supplied-v1/frame-${index}.png`;
    assert.equal(wechatEventArtPath(source), target);
    assert.doesNotThrow(() => assertWechatResourcesExcluded([{ path: target }]));
  }
});

test("direct references fail both in another module and after the archive in artManifest", () => {
  const consumer = 'loadImage("assets/art/ui/league-video-v1/bronze.png");';
  assert.throws(() => assertRetiredWechatUiHasNoConsumers(sourcesWith(consumer)), /runtime consumer/);
  assert.throws(() => assertRetiredWechatUiHasNoConsumers(sourcesWith('loadImage("league-ui/league-video-v1/bronze.png");')), /runtime consumer/);
  assert.throws(() => assertRetiredWechatUiHasNoConsumers([
    { path: "game/artManifest.ts", text: manifest + "\n" + consumer },
  ]), /runtime consumer/);
});

test("string concatenation and constant template URLs do not bypass the consumer check", () => {
  for (const expression of [
    '"assets/art/ui/league-video-v1/" + "bronze.png"',
    '`/assets/art/ui/daily-challenge-v2/${"panel-frame"}.png`',
  ]) assert.throws(() => assertRetiredWechatUiHasNoConsumers(sourcesWith(`loadImage(${expression});`)), /runtime consumer/);
});

test("importing, reading or reexporting either archive fails before exclusions", () => {
  for (const name of ["LEGACY_LEAGUE_TROPHY_ART_URLS", "LEGACY_DAILY_CHALLENGE_ART_URLS"]) {
    for (const consumer of [
      `import { ${name} as images } from "./artManifest";`,
      `loadImages(manifest.${name});`,
      `loadImages(manifest["${name}"]);`,
      `export { ${name} } from "./artManifest";`,
    ]) assert.throws(() => assertRetiredWechatUiHasNoConsumers(sourcesWith(consumer)), /runtime consumer/);
  }
});

test("missing archive URLs and calls nested inside an archive fail closed", () => {
  const url = '"assets/art/ui/league-video-v1/bronze.png"';
  for (const replacement of ['"assets/art/ui/league-video-v1/missing.png"', `loadImage(${url})`]) {
    assert.throws(() => assertRetiredWechatUiHasNoConsumers([
      { path: "game/artManifest.ts", text: manifest.replace(url, replacement) },
    ]), /archive URL|runtime consumer/);
  }
});

test("verifier also rejects an old image accidentally relocated into an event package", () => {
  for (const [directory, names] of Object.entries(expected)) {
    const prefix = directory === "league-video-v1" ? "league-ui" : directory === "daily-challenge-v2" ? "event-ui" : "assets/art/ui";
    for (const name of names) assert.throws(() => assertWechatResourcesExcluded([
      { path: `${prefix}/${directory}/${name}.png` },
    ]), /Non-runtime resource was shipped/);
  }
});
