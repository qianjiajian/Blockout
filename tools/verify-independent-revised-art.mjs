import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "esbuild";
import sharp from "sharp";
import {
  REVISED_ART_IMPORTS,
  REVISED_ART_OUTPUT_ROOT,
  verifyRevisedMechanismArt,
} from "./import-revised-mechanism-art.mjs";

const runtimePrefix = REVISED_ART_OUTPUT_ROOT.replace(/^public\//, "");

/** Accept only the independently authored import contract, never a directory wildcard. */
export function validateIndependentRevisedManifest(manifest, runtimePaths) {
  assert.equal(manifest.schemaVersion, 1, "Revised art manifest schema drifted");
  assert.equal(manifest.artVersion, "revised-reference-v1", "Revised art version drifted");
  assert.equal(manifest.hashAlgorithm, "sha256", "Revised art hash algorithm drifted");
  assert.equal(manifest.entries.length, REVISED_ART_IMPORTS.length, "Revised component count drifted");
  assert.equal(manifest.runtimeComponentCount, REVISED_ART_IMPORTS.length, "Revised declared count drifted");
  const urls = new Set();
  const descriptors = new Map(REVISED_ART_IMPORTS.map((entry) => [entry.target, entry]));
  const bytesByMechanism = {};
  for (const entry of manifest.entries) {
    const descriptor = descriptors.get(entry.target);
    assert.ok(descriptor, `Unknown revised art component: ${entry.target}`);
    for (const [field, value] of Object.entries(descriptor)) {
      assert.equal(entry[field], value, `Revised ${entry.target} ${field} provenance drifted`);
    }
    assert.equal(entry.url, `${runtimePrefix}/${descriptor.target}`, `Revised ${entry.target} URL drifted`);
    assert.ok(!urls.has(entry.url), `Duplicate revised art URL: ${entry.url}`);
    urls.add(entry.url);
    for (const field of ["width", "height", "bytes"]) {
      assert.ok(Number.isSafeInteger(entry[field]) && entry[field] > 0, `Invalid revised ${entry.target} ${field}`);
    }
    for (const field of ["sha256", "rgbaSha256"]) {
      assert.match(entry[field], /^[a-f0-9]{64}$/, `Invalid revised ${entry.target} ${field}`);
    }
    bytesByMechanism[entry.mechanism] = (bytesByMechanism[entry.mechanism] ?? 0) + entry.bytes;
  }
  assert.equal(new Set(runtimePaths).size, runtimePaths.length, "Duplicate revised runtime request");
  assert.deepEqual([...runtimePaths].sort(), [...urls].sort(), "Revised runtime URL coverage drifted");
  assert.equal(manifest.totalRuntimePngBytes, manifest.entries.reduce((sum, entry) => sum + entry.bytes, 0), "Revised total byte count drifted");
  assert.deepEqual(manifest.bytesByMechanism, bytesByMechanism, "Revised mechanism byte totals drifted");
  return urls;
}

export async function verifyIndependentRevisedArt(root) {
  const directory = resolve(root, REVISED_ART_OUTPUT_ROOT);
  const manifest = JSON.parse(await readFile(resolve(directory, "manifest.json"), "utf8"));
  // Bundle the actual loader and its presentation dependencies: type erasure
  // alone leaves relative imports that cannot resolve from a data: URL.
  const compiled = await build({
    entryPoints: [resolve(root, "src/game/revisedMechanismArt.ts")],
    bundle: true, write: false, platform: "node", format: "esm", logLevel: "silent",
  });
  const code = compiled.outputFiles[0].text;
  const { REVISED_MECHANISM_ART_PATHS, ACTIVE_REVISED_MECHANISM_ART_PATHS } = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
  const urls = validateIndependentRevisedManifest(manifest, REVISED_MECHANISM_ART_PATHS);
  const entries = await readdir(directory, { withFileTypes: true });
  const expectedNames = new Set(["manifest.json", "README.md", ...REVISED_ART_IMPORTS.map(({ target }) => target)]);
  for (const entry of entries) {
    assert.ok(entry.isFile() && expectedNames.has(entry.name), `Undeclared revised art file: ${entry.name}`);
  }
  // The existing independent verifier checks each original PNG's bytes, SHA,
  // dimensions and decoded RGBA against its import provenance, without writes.
  await verifyRevisedMechanismArt(root);
  const assets = [];
  for (const entry of manifest.entries) {
    const runtime = resolve(root, "public", entry.url);
    const metadata = await sharp(runtime).metadata();
    assets.push({
      key: `gameplay.revisedReference.${entry.target.replace(/\.png$/, "")}`,
      runtime, width: entry.width, height: entry.height,
      alpha: Boolean(metadata.hasAlpha), grid: [1, 1],
      // No exclusive loadGroup: revisedArt currently survives scene changes.
      // Count it conservatively as resident alongside current-level sprites.
    });
  }
  return { assets, urls, activeUrls: new Set(ACTIVE_REVISED_MECHANISM_ART_PATHS) };
}
