import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import sharp from "sharp";
import { encodeWechatImage, snapshotWechatAssetSource } from "../scripts/wechat-image-formats.mjs";
import { assertWechatResourcesExcluded, filterWechatAssetSnapshot } from "../scripts/wechat-resource-policy.mjs";

const sourcePrefix = "art/gameplay/mechanics/shutter-nine-slice-v1";
const root = resolve(import.meta.dirname, "..");
const directory = resolve(root, "public/assets", sourcePrefix);
const pieces = [
  ["panel", 293, 291],
  ["top-left", 86, 78], ["top-right", 80, 78],
  ["bottom-left", 86, 84], ["bottom-right", 80, 84],
  ["top", 133, 21], ["bottom", 133, 22],
  ["left", 20, 135], ["right", 21, 134],
];

test("all nine supplied shutter images retain original dimensions and every RGBA byte after native encoding", async () => {
  for (const [name, width, height] of pieces) {
    const path = resolve(directory, `${name}.png`);
    const original = await sharp(await readFile(path)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const encoded = await encodeWechatImage(path, `${name}.png`);
    assert(encoded, `${name}: PNG encoding must exist`);
    const native = await sharp(encoded).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.equal(original.info.width, width, name);
    assert.equal(original.info.height, height, name);
    assert.deepEqual(native.info, original.info, name);
    assert(native.data.equals(original.data), `${name}: native encoding changed RGBA`);
  }
});

test("shipping source snapshot contains exactly nine pieces while preserving source provenance files", async () => {
  const snapshot = await snapshotWechatAssetSource(directory);
  assert(snapshot.some(({ path }) => path === "README.md"));
  assert(snapshot.some(({ path }) => path === "manifest.json"));
  const shipping = filterWechatAssetSnapshot(snapshot, sourcePrefix);
  assert.deepEqual(shipping.map(({ path }) => path), pieces.map(([name]) => `${name}.png`).sort());
  assert.equal(snapshot.length, 11, "filtering must not mutate the authored source snapshot");
});

test("both new metadata files are rejected in the subpackage and in a duplicate main-package directory", () => {
  for (const name of ["README.md", "manifest.json"]) {
    for (const path of [`gameplay-art/shutter-nine-slice/${name}`, `assets/${sourcePrefix}/${name}`]) {
      assert.throws(() => assertWechatResourcesExcluded([{ path }]), /Non-runtime resource was shipped/);
    }
  }
  assert.doesNotThrow(() => assertWechatResourcesExcluded(pieces.map(([name]) => ({
    path: `gameplay-art/shutter-nine-slice/${name}.png`,
  }))));
});
