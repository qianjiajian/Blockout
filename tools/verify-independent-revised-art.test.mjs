import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import sharp from "sharp";
import { REVISED_ART_OUTPUT_ROOT } from "./import-revised-mechanism-art.mjs";
import { validateIndependentRevisedManifest, verifyIndependentRevisedArt } from "./verify-independent-revised-art.mjs";

const root = resolve(import.meta.dirname, "..");
const originalManifest = JSON.parse(await readFile(resolve(root, REVISED_ART_OUTPUT_ROOT, "manifest.json"), "utf8"));
const paths = originalManifest.entries.map(({ url }) => url);
const sha = (buffer) => createHash("sha256").update(buffer).digest("hex");
const freshManifest = () => structuredClone(originalManifest);

test("accepts all and only the independently declared 63 component URLs", () => {
  assert.equal(validateIndependentRevisedManifest(freshManifest(), paths).size, 63);
});

test("rejects duplicate entries even when the declared count stays unchanged", () => {
  const manifest = freshManifest();
  manifest.entries[1] = structuredClone(manifest.entries[0]);
  assert.throws(() => validateIndependentRevisedManifest(manifest, paths), /Duplicate revised art URL/);
});

test("rejects undeclared names and out-of-directory URL substitutions", () => {
  const unknown = freshManifest();
  unknown.entries[0].target = "extra.png";
  assert.throws(() => validateIndependentRevisedManifest(unknown, paths), /Unknown revised art component/);
  const escaped = freshManifest();
  escaped.entries[0].url = "assets/art/extra.png";
  assert.throws(() => validateIndependentRevisedManifest(escaped, paths), /URL drifted/);
});

test("rejects changed source provenance and mismatched real-loader URLs", () => {
  const manifest = freshManifest();
  manifest.entries[0].source = "other-original.png";
  assert.throws(() => validateIndependentRevisedManifest(manifest, paths), /source provenance drifted/);
  assert.throws(() => validateIndependentRevisedManifest(freshManifest(), paths.slice(1)), /URL coverage drifted/);
  assert.throws(() => validateIndependentRevisedManifest(freshManifest(), [...paths, paths[0]]), /Duplicate revised runtime request/);
});

test("rejects byte-summary drift instead of trusting the supplied totals", () => {
  const total = freshManifest();
  total.totalRuntimePngBytes += 1;
  assert.throws(() => validateIndependentRevisedManifest(total, paths), /total byte count drifted/);
  const group = freshManifest();
  group.bytesByMechanism.shutter += 1;
  assert.throws(() => validateIndependentRevisedManifest(group, paths), /mechanism byte totals drifted/);
});

async function fixture(context) {
  const temporary = await mkdtemp(resolve(tmpdir(), "blockout-revised-art-verifier-"));
  context.after(() => rm(temporary, { recursive: true, force: true }));
  await mkdir(resolve(temporary, "src/game"), { recursive: true });
  await cp(resolve(root, "src/game/revisedMechanismArt.ts"), resolve(temporary, "src/game/revisedMechanismArt.ts"));
  await cp(resolve(root, "src/game/revisedMechanismPresentation.ts"), resolve(temporary, "src/game/revisedMechanismPresentation.ts"));
  await cp(resolve(root, "src/game/shutterNineSlice.ts"), resolve(temporary, "src/game/shutterNineSlice.ts"));
  await mkdir(resolve(temporary, "src/core"), { recursive: true });
  await cp(resolve(root, "src/core/mechanismRules.ts"), resolve(temporary, "src/core/mechanismRules.ts"));
  await cp(resolve(root, "src/core/types.ts"), resolve(temporary, "src/core/types.ts"));
  await cp(resolve(root, REVISED_ART_OUTPUT_ROOT), resolve(temporary, REVISED_ART_OUTPUT_ROOT), { recursive: true });
  return temporary;
}

test("verifies original SHA, pixels and resident memory inputs on the real assets", async () => {
  const { assets, urls } = await verifyIndependentRevisedArt(root);
  assert.equal(assets.length, 63);
  assert.equal(urls.size, 63);
  assert.equal(assets.reduce((sum, asset) => sum + asset.width * asset.height * 4, 0), 3600940);
  assert.ok(assets.every((asset) => asset.loadGroup === undefined));
});

test("does not exempt extra files inside the independent directory", async (context) => {
  const temporary = await fixture(context);
  await writeFile(resolve(temporary, REVISED_ART_OUTPUT_ROOT, "extra.png"), "not an accepted asset");
  await assert.rejects(verifyIndependentRevisedArt(temporary), /Undeclared revised art file: extra.png/);
});

test("rejects changed original PNG bytes", async (context) => {
  const temporary = await fixture(context);
  const file = resolve(temporary, "public", paths[0]);
  const buffer = await readFile(file);
  await writeFile(file, Buffer.concat([buffer, Buffer.from([0])]));
  await assert.rejects(verifyIndependentRevisedArt(temporary), /Imported original drifted/);
});

test("checks decoded pixels independently from an updated encoded-byte hash", async (context) => {
  const temporary = await fixture(context);
  const manifest = freshManifest();
  const entry = manifest.entries[0];
  const file = resolve(temporary, "public", entry.url);
  const buffer = await sharp({ create: { width: entry.width, height: entry.height, channels: 4, background: "#ff0000" } }).png().toBuffer();
  manifest.totalRuntimePngBytes += buffer.length - entry.bytes;
  manifest.bytesByMechanism[entry.mechanism] += buffer.length - entry.bytes;
  entry.bytes = buffer.length;
  entry.sha256 = sha(buffer);
  await writeFile(file, buffer);
  await writeFile(resolve(temporary, REVISED_ART_OUTPUT_ROOT, "manifest.json"), JSON.stringify(manifest));
  await assert.rejects(verifyIndependentRevisedArt(temporary), /Decoded pixels drifted/);
});
