import test from "node:test";
import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { inspectPcm16Wave, inspectSfxMp3, compareSfxPcm, verifyOriginalSfx } from "./audio-quality.mjs";
import { resolveSfxFfmpeg } from "./encode-original-sfx-mp3.mjs";

const root = path.resolve(import.meta.dirname, "..");
const ffmpeg = resolveSfxFfmpeg();
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const master = await readFile(path.join(root, "art-source/audio/sfx/blocked.wav"));
const mp3 = await readFile(path.join(root, "public/assets/audio/sfx/blocked.mp3"));
const wave = inspectPcm16Wave(master);

async function fixture(t) {
  const temp = await mkdtemp(path.join(tmpdir(), "blockout-sfx-verifier-"));
  t.after(async () => {
    // Only our exact fresh mkdtemp child can be recursively removed.
    assert.equal(path.dirname(temp), path.resolve(tmpdir()));
    assert.ok(path.basename(temp).startsWith("blockout-sfx-verifier-"));
    await rm(temp, { recursive: true });
  });
  await mkdir(path.join(temp, "public/assets/audio"), { recursive: true });
  await mkdir(path.join(temp, "art-source/audio"), { recursive: true });
  await cp(path.join(root, "public/assets/audio/sfx"), path.join(temp, "public/assets/audio/sfx"), { recursive: true });
  await cp(path.join(root, "art-source/audio/sfx"), path.join(temp, "art-source/audio/sfx"), { recursive: true });
  return temp;
}

async function mutateManifest(temp, mutation) {
  const file = path.join(temp, "public/assets/audio/sfx/manifest.json");
  const manifest = JSON.parse(await readFile(file, "utf8"));
  mutation(manifest);
  await writeFile(file, JSON.stringify(manifest));
}

test("all eleven real MP3 streams decode to their exact archived frame counts", async () => {
  const result = await verifyOriginalSfx(root, ffmpeg);
  assert.equal(result.measurements.length, 11);
  assert.equal(result.bytes, 103_925);
  assert.ok(result.measurements.every((row) => Math.abs(row.onsetDifferenceMs) < 1));
});

test("a runtime byte mutation is rejected by its SHA256", async (t) => {
  const temp = await fixture(t);
  const changed = Buffer.from(mp3);
  changed[changed.length - 8] ^= 1;
  await writeFile(path.join(temp, "public/assets/audio/sfx/blocked.mp3"), changed);
  await assert.rejects(verifyOriginalSfx(temp, ffmpeg), /blocked runtime SHA256 differs/);
});

test("a source-master byte mutation is rejected by its SHA256", async (t) => {
  const temp = await fixture(t);
  const changed = Buffer.from(master);
  changed[100] ^= 1;
  await writeFile(path.join(temp, "art-source/audio/sfx/blocked.wav"), changed);
  await assert.rejects(verifyOriginalSfx(temp, ffmpeg), /blocked source SHA256 differs/);
});

test("a missing required MP3 fails the inventory gate", async (t) => {
  const temp = await fixture(t);
  await rm(path.join(temp, "public/assets/audio/sfx/blocked.mp3"));
  await assert.rejects(verifyOriginalSfx(temp, ffmpeg), /inventory differs/);
});

test("a missing source master cannot be silently skipped", async (t) => {
  const temp = await fixture(t);
  await rm(path.join(temp, "art-source/audio/sfx/blocked.wav"));
  await assert.rejects(verifyOriginalSfx(temp, ffmpeg), /ENOENT/);
});

test("a stale WAV anywhere in the flat runtime SFX inventory is rejected", async (t) => {
  const temp = await fixture(t);
  await writeFile(path.join(temp, "public/assets/audio/sfx/blocked.wav"), master);
  await assert.rejects(verifyOriginalSfx(temp, ffmpeg), /old WAV.*blocked.wav/);
});

test("a WAV renamed .mp3 is rejected even with a matching replacement hash", async (t) => {
  const temp = await fixture(t);
  const disguisedWave = Buffer.from(master.subarray(0, 4044));
  disguisedWave.writeUInt32LE(disguisedWave.length - 8, 4);
  disguisedWave.writeUInt32LE(disguisedWave.length - 44, 40);
  await writeFile(path.join(temp, "public/assets/audio/sfx/blocked.mp3"), disguisedWave);
  await mutateManifest(temp, (manifest) => {
    manifest.sounds.blocked.bytes = disguisedWave.length;
    manifest.sounds.blocked.sha256 = hash(disguisedWave);
  });
  await assert.rejects(verifyOriginalSfx(temp, ffmpeg), /not MPEG-1 Layer III/);
});

test("incorrect MP3 bitrate or removed gapless Info metadata cannot pass", () => {
  const start = 10 + mp3[6] * 2 ** 21 + mp3[7] * 2 ** 14 + mp3[8] * 128 + mp3[9];
  const bitrate = Buffer.from(mp3);
  bitrate[start + 2] = (bitrate[start + 2] & 15) | 0x80;
  assert.throws(() => inspectSfxMp3(bitrate), /96 kbps/);
  const missingInfo = Buffer.from(mp3);
  missingInfo.write("Nope", missingInfo.indexOf(Buffer.from("Info")), "ascii");
  assert.throws(() => inspectSfxMp3(missingInfo), /missing its CBR Info/);
  assert.throws(() => inspectSfxMp3(mp3.subarray(0, mp3.length - 1)), /truncated MP3 frame/);
});

test("gapless decoded length, level, and onset regressions are independently rejected", () => {
  const clean = Buffer.alloc(wave.samples.length * 4);
  wave.samples.forEach((value, index) => clean.writeFloatLE(value, index * 4));
  assert.equal(compareSfxPcm(wave, clean, "blocked").frames, wave.frames);
  assert.throws(() => compareSfxPcm(wave, clean.subarray(8), "blocked"), /decoded gapless duration/);
  const quiet = Buffer.from(clean);
  wave.samples.forEach((value, index) => quiet.writeFloatLE(value * 0.5, index * 4));
  assert.throws(() => compareSfxPcm(wave, quiet, "blocked"), /RMS level changed/);
  const delayed = Buffer.alloc(clean.length);
  clean.copy(delayed, 441 * 8, 0, clean.length - 441 * 8);
  assert.throws(() => compareSfxPcm(wave, delayed, "blocked"), /onset shifted/);
});

test("source path traversal is rejected before reading external assets", async (t) => {
  const temp = await fixture(t);
  await mutateManifest(temp, (manifest) => { manifest.sounds.blocked.source.file = "../blocked.wav"; });
  await assert.rejects(verifyOriginalSfx(temp, ffmpeg), /path must remain canonical/);
});
