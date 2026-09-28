import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, unlink, access } from "node:fs/promises";
import { dirname, resolve, relative } from "node:path";
import { LARGE_IMAGE_POLICIES, LARGE_IMAGE_TRANSFORM, encodeLargeImage } from "./large-image-encoding.mjs";
import { computeWechatSourceFingerprint, snapshotDirectory, snapshotWechatOutput } from "../scripts/wechat-build-integrity.mjs";
import { optimizeWechatPng } from "../scripts/wechat-image-formats.mjs";

const root = resolve(import.meta.dirname, "..");
const mode = process.argv[2];
assert.ok(["plan", "apply", "verify"].includes(mode), "Usage: node tools/optimize-large-images.mjs plan|apply|verify");
const output = resolve(root, "deliverables/large-image-encoding-2026-09-23");
const backupRoot = resolve(root, ".codex-temp/large-image-backup-2026-09-23");
const runtimeRoot = resolve(root, "public/assets/art");
const sourceRoot = resolve(root, "art-source");
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const exists = async (path) => { try { await access(path); return true; } catch (e) { if (e.code !== "ENOENT") throw e; return false; } };
function confined(parent, path) {
  const target = resolve(parent, path);
  const rel = relative(parent, target);
  assert.ok(rel && !rel.startsWith("..") && !rel.includes(":"), `Path escapes image root: ${path}`);
  return target;
}
const manifest = JSON.parse(await readFile(resolve(sourceRoot, "manifest.json"), "utf8"));
const rows = [];
const jobs = [];
for (const policy of LARGE_IMAGE_POLICIES) {
  const source = confined(sourceRoot, policy.source);
  const target = confined(runtimeRoot, policy.runtime);
  const previous = confined(runtimeRoot, policy.previousRuntime ?? policy.runtime);
  const asset = manifest.assets.find((item) => item.source === policy.source);
  assert.ok(asset, `Missing master declaration ${policy.source}`);
  assert.equal(asset.width, policy.width);
  assert.equal(asset.height, policy.height);
  const original = await readFile(source);
  const encoded = await encodeLargeImage(original, policy);
  const shippingEncoded = policy.format === "jpeg" ? encoded : await optimizeWechatPng(encoded);
  if (mode === "verify") {
    assert.equal(asset.transform, LARGE_IMAGE_TRANSFORM);
    assert.equal(asset.runtime, `../public/assets/art/${policy.runtime}`);
    assert.deepEqual(await readFile(target), encoded, `Non-deterministic runtime ${policy.runtime}`);
    if (target !== previous) assert.equal(await exists(previous), false, "Retired PNG is still in runtime output");
    rows.push({ path: policy.runtime, bytes: encoded.length, sha256: hash(encoded) });
    continue;
  }
  const old = await readFile(previous);
  if (target !== previous) assert.equal(await exists(target), false, `Refusing to overwrite new target ${target}`);
  const oldShipping = /\.png$/i.test(previous) ? await optimizeWechatPng(old) : old;
  assert.ok(encoded.length < old.length, `Runtime image did not shrink: ${policy.runtime}`);
  assert.ok(shippingEncoded.length < oldShipping.length, `WeChat image did not shrink: ${policy.runtime}`);
  rows.push({
    policy, sourceBytes: original.length, sourceSha256: hash(original),
    previousRuntime: relative(root, previous).replaceAll("\\", "/"),
    runtime: relative(root, target).replaceAll("\\", "/"),
    beforeBytes: old.length, beforeSha256: hash(old), afterBytes: encoded.length, afterSha256: hash(encoded),
    beforeShippingBytes: oldShipping.length, afterShippingBytes: shippingEncoded.length,
    savedShippingBytes: oldShipping.length - shippingEncoded.length,
  });
  jobs.push({ policy, source, target, previous, original, old, encoded, asset });
}
if (mode === "verify") {
  console.log(JSON.stringify({ status: "passed", images: rows.length, bytes: rows.reduce((n, row) => n + row.bytes, 0) }));
  if (process.argv.includes("--release")) {
    const before = JSON.parse(await readFile(resolve(output, "before.json"), "utf8"));
    const expectedPublic = before.publicBefore.map((entry) => {
      const changed = before.images.find((image) => image.previousRuntime === `public/assets/${entry.path}`);
      return changed ? {
        path: changed.runtime.replace(/^public\/assets\//, ""),
        bytes: changed.afterBytes, sha256: changed.afterSha256,
      } : entry;
    }).sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
    assert.deepEqual(await snapshotDirectory(resolve(root, "public/assets")), expectedPublic,
      "Unselected public resources changed or image inventory drifted");
    for (const image of before.images) {
      assert.equal(hash(await readFile(confined(sourceRoot, image.policy.source))), image.sourceSha256, "Master changed");
      assert.equal(hash(await readFile(confined(backupRoot,
        image.previousRuntime.replace(/^public\/assets\/art\//, "")))), image.beforeSha256, "Backup changed");
    }
    const build = JSON.parse(await readFile(resolve(root, "dist-wechat.build-manifest.json"), "utf8"));
    assert.deepEqual(await snapshotWechatOutput(resolve(root, "dist-wechat")), build.outputs, "Shipping snapshot changed");
    assert.equal(await computeWechatSourceFingerprint(root), build.sourceFingerprint, "Shipping source fingerprint stale");
    const sum = (entries) => entries.reduce((n, item) => n + item.bytes, 0);
    const packageBytes = sum(build.outputs);
    const beforePackageBytes = sum(before.buildBefore.outputs);
    const imageBytes = (entries) => sum(entries.filter((item) => /\.(png|jpe?g|webp)$/i.test(item.path)));
    const exactShippingImageSavings = imageBytes(before.buildBefore.outputs) - imageBytes(build.outputs);
    assert.equal(exactShippingImageSavings, before.savedShippingBytes, "Measured image savings differ from the reviewed plan");
    const after = {
      createdAt: new Date().toISOString(), status: "passed", imageCount: rows.length,
      unchangedOtherPublicFiles: expectedPublic.length - rows.length,
      preservedMastersAndBackups: rows.length, dimensionsAndAlphaPreserved: true,
      beforePackageBytes, packageBytes, packageSavings: beforePackageBytes - packageBytes,
      exactShippingImageSavings, sourceFingerprint: build.sourceFingerprint,
      packageFiles: build.outputs.length, currentSourceMatchesBuild: true,
      nativeDeviceValidation: "not-run", uploaded: false,
    };
    await writeFile(resolve(output, "after.json"), JSON.stringify(after, null, 2) + "\n");
    console.log(JSON.stringify(after));
  }
} else {
  const report = { createdAt: new Date().toISOString(), rules: "1.11.0", mode, images: rows,
    savedRuntimeBytes: rows.reduce((n, row) => n + row.beforeBytes - row.afterBytes, 0),
    savedShippingBytes: rows.reduce((n, row) => n + row.savedShippingBytes, 0) };
  await mkdir(output, { recursive: true });
  if (mode === "apply") {
    // Snapshot and back up every exact target before adopting any candidate.
    assert.equal(await exists(resolve(backupRoot, "before.json")), false, "Backup exists; verify or recover instead of overwriting history");
    const publicBefore = await snapshotDirectory(resolve(root, "public/assets"));
    const buildBefore = JSON.parse(await readFile(resolve(root, "dist-wechat.build-manifest.json"), "utf8"));
    for (const job of jobs) {
      assert.deepEqual(await readFile(job.source), job.original, "Master changed during staging");
      assert.deepEqual(await readFile(job.previous), job.old, "Runtime changed during staging");
      const backup = confined(backupRoot, relative(runtimeRoot, job.previous));
      assert.equal(await exists(backup), false, `Backup collision ${backup}`);
      await mkdir(dirname(backup), { recursive: true });
      await writeFile(backup, job.old, { flag: "wx" });
      assert.deepEqual(await readFile(backup), job.old, "Backup verification failed");
    }
    const before = { ...report, publicBefore, buildBefore };
    await writeFile(resolve(backupRoot, "before.json"), JSON.stringify(before, null, 2) + "\n", { flag: "wx" });
    await writeFile(resolve(output, "before.json"), JSON.stringify(before, null, 2) + "\n", { flag: "wx" });
    for (const job of jobs) {
      await writeFile(job.target, job.encoded);
      assert.deepEqual(await readFile(job.target), job.encoded);
      if (job.target !== job.previous) {
        // Only the single reviewed old path, already confined and backed up.
        assert.deepEqual(await readFile(job.previous), job.old);
        await unlink(job.previous);
      }
      job.asset.runtime = `../public/assets/art/${job.policy.runtime}`;
      job.asset.transform = LARGE_IMAGE_TRANSFORM;
    }
    // Mechanical update of the selected generated asset declarations only.
    await writeFile(resolve(sourceRoot, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  }
  await writeFile(resolve(output, `${mode}.json`), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({ mode, images: rows.length, savedRuntimeBytes: report.savedRuntimeBytes, savedShippingBytes: report.savedShippingBytes }));
}
