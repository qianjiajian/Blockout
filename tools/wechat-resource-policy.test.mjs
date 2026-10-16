import assert from "node:assert/strict";
import { access, cp, mkdir, mkdtemp, readFile, rename, rm, symlink, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import test from "node:test";
import {
  assertWechatResourcesExcluded,
  filterWechatAssetSnapshot,
  removeGeneratedWechatExcludedResources,
  WECHAT_RESOURCE_EXCLUSIONS,
} from "../scripts/wechat-resource-policy.mjs";

const root = resolve(import.meta.dirname, "..");
const row = (path) => ({ path, bytes: 12, sha256: "unchanged" });

test("policy keeps the original exclusions and adds the reviewed zero-consumer files", () => {
  assert.equal(WECHAT_RESOURCE_EXCLUSIONS.length, 87);
  assert.deepEqual(WECHAT_RESOURCE_EXCLUSIONS.filter(({ reason }) => !reason.startsWith("retired-")).map(({ source }) => source).sort(), [
    "art/gameplay/mechanics/revised-reference-v1/README.md",
    "art/gameplay/mechanics/revised-reference-v1/manifest.json",
    "art/gameplay/mechanics/shutter-nine-slice-v1/README.md",
    "art/gameplay/mechanics/shutter-nine-slice-v1/manifest.json",
    "audio/sfx/manifest.json",
    "art/gameplay/board/formal-border-v1/neutral-rail-1-cell.png",
    "art/gameplay/board/formal-border-v1/neutral-corner-inner.png",
    "art/gameplay/board/formal-border-v1/neutral-corner-outer.png",
  ].sort());
  assert.equal(WECHAT_RESOURCE_EXCLUSIONS.filter(({ reason }) => reason === "retired-ui-art").length, 26);
  assert.equal(WECHAT_RESOURCE_EXCLUSIONS.filter(({ reason }) => reason === "retired-shop-art").length, 7);
  assert.equal(WECHAT_RESOURCE_EXCLUSIONS.filter(({ reason }) => reason === "retired-profile-art").length, 23);
  assert.equal(WECHAT_RESOURCE_EXCLUSIONS.filter(({ reason }) => reason === "retired-profile-frame-art").length, 19);
  assert.equal(WECHAT_RESOURCE_EXCLUSIONS.filter(({ reason }) => reason === "retired-life-refill-art").length, 1);
  assert.equal(WECHAT_RESOURCE_EXCLUSIONS.filter(({ reason }) => reason === "retired-booster-reference-art").length, 1);
  assert.equal(WECHAT_RESOURCE_EXCLUSIONS.filter(({ reason }) => reason === "retired-test-control-art").length, 1);
  assert.equal(WECHAT_RESOURCE_EXCLUSIONS.filter(({ reason }) => reason === "retired-shutter-art").length, 1);
  assert(Object.isFrozen(WECHAT_RESOURCE_EXCLUSIONS));
  assert(WECHAT_RESOURCE_EXCLUSIONS.every(Object.isFrozen));
  const other = [row("art/README.md"), row("audio/manifest.json"), row("art/required.json"),
    row("art/gameplay/board/formal-border-v1/neutral-rail-2-cell.png")];
  const excluded = WECHAT_RESOURCE_EXCLUSIONS.map(({ source }) => row(source));
  const snapshot = [...other, ...excluded];
  assert.deepEqual(filterWechatAssetSnapshot(snapshot), other);
  assert.equal(snapshot.length, 91, "source snapshot must not be mutated");
});

test("source-prefix filtering retains every runtime mechanism image and sound", () => {
  const mechanismRows = [row("README.md"), row("manifest.json"), row("bomb.png"), row("runtime.json")];
  assert.deepEqual(filterWechatAssetSnapshot(mechanismRows, "art/gameplay/mechanics/revised-reference-v1"), mechanismRows.slice(2));
  const audioRows = [row("sfx/manifest.json"), row("sfx/tap.mp3"), row("happy-foods.mp3"), row("runtime.json")];
  assert.deepEqual(filterWechatAssetSnapshot(audioRows, "audio"), audioRows.slice(1));
  assert.deepEqual(filterWechatAssetSnapshot(mechanismRows, "other"), mechanismRows);
});

test("malformed and traversal snapshot paths fail closed", () => {
  for (const path of ["../README.md", "/README.md", "a\\README.md", "a//README.md", "a/./README.md"]) {
    assert.throws(() => filterWechatAssetSnapshot([row(path)]), /Unsafe/);
    assert.throws(() => filterWechatAssetSnapshot([], path), /Unsafe/);
    assert.throws(() => assertWechatResourcesExcluded([row(path)]), /Unsafe/);
  }
});

test("verifier rejects every excluded final or original main-package copy", () => {
  for (const { source, output } of WECHAT_RESOURCE_EXCLUSIONS) {
    assert.throws(() => assertWechatResourcesExcluded([row(output)]), /Non-runtime resource was shipped/);
    assert.throws(() => assertWechatResourcesExcluded([row(`assets/${source}`)]), /Non-runtime resource was shipped/);
  }
  assert.doesNotThrow(() => assertWechatResourcesExcluded([row("assets/runtime.json"), row("gameplay-art/revised-mechanisms/bomb.png")]));
});

async function withGeneratedCopies(callback) {
  await mkdir(resolve(root, ".codex-temp"), { recursive: true });
  const output = await mkdtemp(resolve(root, ".codex-temp/wechat-resource-policy-test-"));
  try {
    for (const { source, output: path } of WECHAT_RESOURCE_EXCLUSIONS) {
      await mkdir(dirname(resolve(output, path)), { recursive: true });
      await cp(resolve(root, "public/assets", source), resolve(output, path));
    }
    await writeFile(resolve(output, "keep.txt"), "keep");
    await callback(output);
  } finally {
    assert(relative(root, output).replaceAll("\\", "/").startsWith(".codex-temp/wechat-resource-policy-test-"));
    await rm(output, { recursive: true, force: true });
  }
}

test("removes only exact generated copies while retaining all public source files", async () => {
  await withGeneratedCopies(async (output) => {
    const originals = await Promise.all(WECHAT_RESOURCE_EXCLUSIONS.map(({ source }) => readFile(resolve(root, "public/assets", source))));
    assert.deepEqual(await removeGeneratedWechatExcludedResources(root, output), WECHAT_RESOURCE_EXCLUSIONS);
    for (const [index, entry] of WECHAT_RESOURCE_EXCLUSIONS.entries()) {
      await assert.rejects(access(resolve(output, entry.output)), { code: "ENOENT" });
      assert.deepEqual(await readFile(resolve(root, "public/assets", entry.source)), originals[index]);
    }
    assert.equal(await readFile(resolve(output, "keep.txt"), "utf8"), "keep");
  });
});

test("authored roots are rejected before any deletion", async () => {
  for (const output of [root, resolve(root, "public"), resolve(root, "public/assets")]) {
    await assert.rejects(removeGeneratedWechatExcludedResources(root, output), /Unsafe generated resource output/);
  }
});

test("one changed generated copy prevents removal of every reviewed copy", async () => {
  await withGeneratedCopies(async (output) => {
    await writeFile(resolve(output, WECHAT_RESOURCE_EXCLUSIONS.at(-1).output), "changed");
    await assert.rejects(removeGeneratedWechatExcludedResources(root, output), /differs from its source/);
    for (const entry of WECHAT_RESOURCE_EXCLUSIONS) await access(resolve(output, entry.output));
  });
});

test("a missing generated copy is not silently ignored and preserves the others", async () => {
  await withGeneratedCopies(async (output) => {
    const missing = WECHAT_RESOURCE_EXCLUSIONS.at(-1);
    await rm(resolve(output, missing.output));
    await assert.rejects(removeGeneratedWechatExcludedResources(root, output), { code: "ENOENT" });
    for (const entry of WECHAT_RESOURCE_EXCLUSIONS.slice(0, -1)) await access(resolve(output, entry.output));
  });
});

test("junction or symlink paths cannot redirect generated deletions", async () => {
  await withGeneratedCopies(async (output) => {
    const expected = resolve(output, "gameplay-art/revised-mechanisms");
    const actual = resolve(output, "kept-mechanisms");
    await rename(expected, actual);
    await symlink(actual, expected, process.platform === "win32" ? "junction" : "dir");
    await assert.rejects(removeGeneratedWechatExcludedResources(root, output), /Symlinked/);
    for (const entry of WECHAT_RESOURCE_EXCLUSIONS) await access(resolve(output, entry.output));
  });
});

test("build removes reviewed copies before native encoding and fingerprints the policy", async () => {
  const build = await readFile(resolve(root, "scripts/build-wechat.mjs"), "utf8");
  const integrity = await readFile(resolve(root, "scripts/wechat-build-integrity.mjs"), "utf8");
  const verifier = await readFile(resolve(root, "tools/verify-wechat-project.mjs"), "utf8");
  assert(build.indexOf("await removeGeneratedWechatExcludedResources(root, output)") < build.indexOf("await prepareWechatImages(output)"));
  assert(integrity.includes('"scripts/wechat-resource-policy.mjs"'));
  assert(verifier.includes("assertWechatResourcesExcluded(currentOutputSnapshot)"));
  assert(verifier.includes("JSON.stringify(manifest.resourceExclusions) !== JSON.stringify(WECHAT_RESOURCE_EXCLUSIONS)"));
  assert(verifier.includes("const allPublicAssets = deduplicatedArtSnapshot(filterWechatAssetSnapshot("));
  assert(verifier.includes("const publicAssets = allPublicAssets"));
  assert(verifier.includes("const revisedMechanismSource = filterWechatAssetSnapshot("));
  assert(verifier.includes("const allAudioSourceSnapshot = filterWechatAssetSnapshot("));
});
