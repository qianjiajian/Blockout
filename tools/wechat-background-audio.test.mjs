import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, resolve } from "node:path";
import { test } from "node:test";
import {
  WECHAT_BACKGROUND_AUDIO_ENCODING, encodeWechatBackgroundAudio, evaluateWechatBackgroundAudio,
  prepareWechatBackgroundAudio, snapshotWechatBackgroundAudio,
} from "../scripts/wechat-background-audio.mjs";
import { resolveSfxFfmpeg } from "./encode-original-sfx-mp3.mjs";

const root = resolve(import.meta.dirname, "..");
const sourceDirectory = resolve(root, "public/assets/audio");
const sourceFile = resolve(sourceDirectory, "happy-carnival.mp3");
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

async function inTemporaryDirectory(callback) {
  const parent = await realpath(tmpdir());
  const directory = await mkdtemp(resolve(parent, "block-out-bgm-test-"));
  try { return await callback(directory); }
  finally {
    const actual = await realpath(directory);
    assert.equal(dirname(actual), parent);
    assert.ok(basename(actual).startsWith("block-out-bgm-test-"));
    await rm(actual, { recursive: true, force: true });
  }
}

async function sourceInventory(directory, prefix = "") {
  const rows = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) rows.push(...await sourceInventory(path, `${prefix}${entry.name}/`));
    else if (entry.isFile()) {
      const bytes = await readFile(path);
      rows.push({ path: `${prefix}${entry.name}`, bytes: bytes.length, sha256: sha256(bytes) });
    }
  }
  return rows.sort((a, b) => a.path.localeCompare(b.path));
}

test("menu MP3 is deterministic and preserves the exact decoded duration, sample rate and channels", async () => {
  const before = await sourceInventory(sourceDirectory);
  const first = await encodeWechatBackgroundAudio(sourceFile, { cache: false });
  const second = await encodeWechatBackgroundAudio(sourceFile, { cache: false });
  assert.deepEqual(first.bytes, second.bytes);
  assert.deepEqual(first.record, second.record);
  assert.equal(first.record.source.sha256, sha256(await readFile(sourceFile)));
  assert.equal(first.record.output.sha256, sha256(first.bytes));
  assert.equal(first.record.encoding.bitrateKbps, WECHAT_BACKGROUND_AUDIO_ENCODING.bitrateKbps);
  assert.equal(first.record.output.stream.bitrateKbps, WECHAT_BACKGROUND_AUDIO_ENCODING.bitrateKbps);
  assert.equal(first.record.output.stream.frameCount, 6177);
  for (const info of [first.record.source.decoded, first.record.output.decoded]) {
    assert.equal(info.sampleRate, 48000);
    assert.equal(info.channels, 2);
    assert.equal(info.frames, 7112551);
    assert.equal(info.durationSeconds, 7112551 / 48000);
  }
  assert.equal(first.record.validation.lossyEncoding, true);
  assert.equal(first.record.validation.trimmingApplied, false);
  assert.notEqual(first.record.source.decoded.pcmSha256, first.record.output.decoded.pcmSha256);
  assert.match(first.record.tool.version, /^ffmpeg version /);
  assert.match(first.record.tool.executableSha256, /^[a-f\d]{64}$/);
  assert.match(first.record.tool.implementationSha256, /^[a-f\d]{64}$/);
  assert.ok(first.record.waveformComparison.pearsonCorrelation > 0.99);
  assert.deepEqual(await sourceInventory(sourceDirectory), before);
});

test("prepare/snapshot share one menu profile and leave other package files and source audio intact", async () => {
  await inTemporaryDirectory(async (directory) => {
    const sourceBefore = await sourceInventory(sourceDirectory);
    const output = resolve(directory, "menu-music");
    await mkdir(resolve(output, "sfx"), { recursive: true });
    const challenge = await readFile(resolve(sourceDirectory, "happy-foods.mp3"));
    const effect = Buffer.from("package SFX sentinel; never re-encode");
    await writeFile(resolve(output, "happy-foods.mp3"), challenge);
    await writeFile(resolve(output, "sfx/test.mp3"), effect);
    const record = await prepareWechatBackgroundAudio(sourceDirectory, output);
    const bytes = await readFile(resolve(output, "happy-carnival.mp3"));
    assert.deepEqual(await snapshotWechatBackgroundAudio(sourceDirectory), [{
      path: "happy-carnival.mp3", bytes: bytes.length, sha256: sha256(bytes),
    }]);
    assert.equal(record.output.sha256, sha256(bytes));
    await prepareWechatBackgroundAudio(sourceDirectory, output);
    assert.deepEqual(await readFile(resolve(output, "happy-carnival.mp3")), bytes);
    assert.deepEqual(await readFile(resolve(output, "happy-foods.mp3")), challenge);
    assert.deepEqual(await readFile(resolve(output, "sfx/test.mp3")), effect);
    assert.deepEqual((await readdir(output)).sort(), ["happy-carnival.mp3", "happy-foods.mp3", "sfx"]);
    assert.deepEqual(await sourceInventory(sourceDirectory), sourceBefore);
  });
});

test("candidate bitrate evaluation is isolated and cached callers cannot change the package result", async () => {
  const candidate = await evaluateWechatBackgroundAudio(sourceFile, 112);
  const reference = await evaluateWechatBackgroundAudio(sourceFile, 128);
  assert.equal(candidate.bytes.length, 2075472);
  assert.equal(reference.bytes.length, 2371968);
  assert.equal(reference.bytes.length - candidate.bytes.length, 296496);
  assert.equal(candidate.record.output.decoded.frames, reference.record.output.decoded.frames);
  const encoded = await encodeWechatBackgroundAudio(sourceFile);
  const pristine = Buffer.from(encoded.bytes);
  encoded.bytes.fill(0);
  encoded.record.encoding.bitrateKbps = -1;
  const next = await encodeWechatBackgroundAudio(sourceFile);
  assert.deepEqual(next.bytes, pristine);
  assert.equal(next.record.encoding.bitrateKbps, WECHAT_BACKGROUND_AUDIO_ENCODING.bitrateKbps);
  await assert.rejects(evaluateWechatBackgroundAudio(sourceFile, 96), /112\/128/);
});

test("reject challenge music, source overwrite, and wrong-format inputs before writing package output", async () => {
  await assert.rejects(encodeWechatBackgroundAudio(resolve(sourceDirectory, "happy-foods.mp3")), /Only happy-carnival/);
  await assert.rejects(prepareWechatBackgroundAudio(sourceDirectory, sourceDirectory), /outside source/);
  await assert.rejects(prepareWechatBackgroundAudio(sourceDirectory, resolve(root, "public/test-bgm")), /outside source/);
  await assert.rejects(prepareWechatBackgroundAudio(sourceDirectory, resolve(root, "src/test-bgm")), /outside source/);
  await inTemporaryDirectory(async (directory) => {
    const input = resolve(directory, "happy-carnival.mp3");
    const generated = spawnSync(resolveSfxFfmpeg(), ["-nostdin", "-n", "-v", "error", "-f", "lavfi",
      "-i", "sine=frequency=440:sample_rate=44100:duration=0.1", "-c:a", "libmp3lame", "-ac", "1", input],
    { windowsHide: true });
    assert.equal(generated.status, 0, generated.stderr.toString());
    await assert.rejects(encodeWechatBackgroundAudio(input), /48000 Hz stereo/);
    assert.deepEqual(await readdir(directory), ["happy-carnival.mp3"]);
  });
});
