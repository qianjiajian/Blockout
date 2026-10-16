import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import path from "node:path";

// Retain the historical masters; replaced effects use supplied MP3s at runtime.
export const ORIGINAL_SFX_MASTER_KINDS = Object.freeze([
  "blocked", "ice", "booster", "time", "rocket", "pulse", "mechanic", "reward", "unlock", "win", "fail",
]);
export const ORIGINAL_SFX_KINDS = Object.freeze(ORIGINAL_SFX_MASTER_KINDS.filter((kind) => !["time", "rocket", "pulse", "fail", "win"].includes(kind)));

// Regression bounds from the isolated, unchanged-master 96 kbps stereo trial
// (.codex-temp/size-audio-options-20260923), not perceptual/phone certification.
// Trial SNR, dB: blocked20.06 ice9.00 booster16.05 time19.39 rocket13.59
// pulse14.11 mechanic20.33 reward20.44 unlock25.88 win20.37 fail22.36.
// Each bound is <1.5 dB below its observation. Noise-rich ice must not silently
// inherit the much looser bound for every other effect.
export const SFX_MINIMUM_SNR_DB = Object.freeze({
  blocked: 19, ice: 8, booster: 15, time: 18, rocket: 12.5,
  pulse: 13, mechanic: 19, reward: 19, unlock: 24.5, win: 19, fail: 21,
});
export const SFX_QUALITY_LIMITS = Object.freeze({
  // Trial maximum absolute RMS difference0.882 dB and onset difference0.477ms.
  maximumLevelDifferenceDb: 1,
  maximumOnsetDifferenceMs: 1,
  // Trial peak maximum0.868; preserve unclipped headroom after lossy synthesis.
  maximumPeak: 0.95,
  // Lossy ringing means MP3 cannot retain PCM's exact zero endpoints. Trial
  // leading maximum0.015470 and trailing maximum0.000604 are bounded separately.
  maximumLeadingMagnitude: 0.02,
  maximumTrailingMagnitude: 0.001,
});

const assert = (condition, message) => { if (!condition) throw new Error(message); };
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const hasHash = (value) => typeof value === "string" && /^[a-f0-9]{64}$/i.test(value);

export function inspectPcm16Wave(bytes, label = "PCM master") {
  assert(bytes.length >= 44 && bytes.toString("ascii", 0, 4) === "RIFF"
    && bytes.toString("ascii", 8, 12) === "WAVE", `${label} is not a RIFF/WAVE asset`);
  assert(bytes.readUInt32LE(4) + 8 === bytes.length, `${label} has a truncated/trailing RIFF payload`);
  let cursor = 12;
  let format;
  let pcm;
  while (cursor + 8 <= bytes.length) {
    const id = bytes.toString("ascii", cursor, cursor + 4);
    const size = bytes.readUInt32LE(cursor + 4);
    const start = cursor + 8;
    assert(start + size <= bytes.length, `${label} has a truncated ${id} chunk`);
    if (id === "fmt ") {
      assert(size >= 16 && !format, `${label} has an invalid fmt chunk`);
      format = {
        encoding: bytes.readUInt16LE(start), channels: bytes.readUInt16LE(start + 2),
        sampleRate: bytes.readUInt32LE(start + 4), bitsPerSample: bytes.readUInt16LE(start + 14),
      };
    } else if (id === "data") {
      assert(!pcm, `${label} has duplicate data chunks`);
      pcm = bytes.subarray(start, start + size);
    }
    cursor = start + size + (size % 2);
  }
  assert(format && pcm, `${label} is missing fmt/data chunks`);
  assert(format.encoding === 1 && format.bitsPerSample === 16, `${label} must be 16-bit PCM`);
  assert(format.channels === 2 && format.sampleRate === 44_100, `${label} must be stereo 44.1 kHz`);
  assert(pcm.length > 0 && pcm.length % (format.channels * 2) === 0, `${label} has incomplete PCM frames`);
  const samples = new Float32Array(pcm.length / 2);
  let peak = 0;
  let energy = 0;
  for (let index = 0; index < samples.length; index += 1) {
    const sample = pcm.readInt16LE(index * 2) / 32_768;
    samples[index] = sample;
    peak = Math.max(peak, Math.abs(sample));
    energy += sample * sample;
  }
  const frames = samples.length / format.channels;
  return {
    ...format, frames, samples, duration: frames / format.sampleRate,
    peak, rms: Math.sqrt(energy / samples.length),
    first: Array.from({ length: format.channels }, (_, channel) => pcm.readInt16LE(channel * 2)),
    last: Array.from({ length: format.channels }, (_, channel) => pcm.readInt16LE(pcm.length - (format.channels - channel) * 2)),
  };
}

// Inspect every actual MPEG-1 Layer III frame; neither a .mp3 suffix nor an ID3
// tag proves codec/rate/channels. The first Info frame carries LAME gapless data.
export function inspectSfxMp3(bytes, label = "SFX MP3") {
  let start = 0;
  if (bytes.subarray(0, 3).toString("ascii") === "ID3") {
    assert(bytes.length >= 10 && bytes[3] >= 3 && bytes[3] <= 4, `${label} has an unsupported ID3 header`);
    assert([...bytes.subarray(6, 10)].every((byte) => byte < 128), `${label} has an invalid ID3 length`);
    start = 10 + (bytes[6] * 2 ** 21 + bytes[7] * 2 ** 14 + bytes[8] * 128 + bytes[9]);
    if (bytes[3] === 4 && (bytes[5] & 0x10)) start += 10;
  }
  let cursor = start;
  let frameCount = 0;
  let info;
  while (cursor + 4 <= bytes.length) {
    const [a, b, c, d] = bytes.subarray(cursor, cursor + 4);
    assert(a === 0xff && (b & 0xe0) === 0xe0 && ((b >> 3) & 3) === 3 && ((b >> 1) & 3) === 1,
      `${label} is not MPEG-1 Layer III at byte ${cursor}`);
    const bitrates = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
    const bitrateKbps = bitrates[c >> 4];
    const sampleRate = [44_100, 48_000, 32_000][(c >> 2) & 3];
    const channels = d >> 6 === 3 ? 1 : 2;
    assert(bitrateKbps === 96 && sampleRate === 44_100 && channels === 2,
      `${label} must contain only 96 kbps / stereo / 44.1 kHz MP3 frames`);
    const frameLength = Math.floor(144_000 * bitrateKbps / sampleRate) + ((c >> 1) & 1);
    assert(cursor + frameLength <= bytes.length, `${label} has a truncated MP3 frame`);
    if (frameCount === 0) {
      const tag = cursor + 4 + ((b & 1) ? 0 : 2) + 32;
      assert(bytes.toString("ascii", tag, tag + 4) === "Info", `${label} is missing its CBR Info/gapless frame`);
      const flags = bytes.readUInt32BE(tag + 4);
      assert(flags === 15, `${label} has incomplete Info/gapless fields`);
      const encodedFrames = bytes.readUInt32BE(tag + 8);
      const encodedBytes = bytes.readUInt32BE(tag + 12);
      const extension = tag + 120;
      assert(extension + 24 <= cursor + frameLength, `${label} has a truncated encoder extension`);
      assert(/^(LAME|Lavc)/.test(bytes.toString("ascii", extension, extension + 9)), `${label} has no recognized gapless encoder extension`);
      const encoderDelay = (bytes[extension + 21] << 4) | (bytes[extension + 22] >> 4);
      const endPadding = ((bytes[extension + 22] & 15) << 8) | bytes[extension + 23];
      assert(encoderDelay > 0 && endPadding > 0, `${label} has invalid gapless delay/padding`);
      info = { bitrateKbps, sampleRate, channels, encodedFrames, encodedBytes, encoderDelay, endPadding,
        gaplessFrames: encodedFrames * 1152 - encoderDelay - endPadding };
    }
    frameCount += 1;
    cursor += frameLength;
  }
  assert(info && cursor === bytes.length, `${label} has no MP3 frames or trailing invalid bytes`);
  assert(info.encodedFrames === frameCount - 1 && info.encodedBytes === bytes.length - start,
    `${label} Info frame count/length differs from its actual frames`);
  return { ...info, frameCount, bytes: bytes.length };
}

export function compareSfxPcm(wave, decodedBytes, kind) {
  assert(decodedBytes.length === wave.frames * wave.channels * 4,
    `${kind} decoded gapless duration differs: expected ${wave.frames} frames, got ${decodedBytes.length / (wave.channels * 4)}`);
  let sourceEnergy = 0;
  let decodedEnergy = 0;
  let errorEnergy = 0;
  let cross = 0;
  let peak = 0;
  let sourceOnset = -1;
  let decodedOnset = -1;
  for (let index = 0; index < wave.samples.length; index += 1) {
    const source = wave.samples[index];
    const decoded = decodedBytes.readFloatLE(index * 4);
    assert(Number.isFinite(decoded), `${kind} decoded a non-finite sample`);
    sourceEnergy += source * source;
    decodedEnergy += decoded * decoded;
    errorEnergy += (source - decoded) ** 2;
    cross += source * decoded;
    peak = Math.max(peak, Math.abs(decoded));
    if (sourceOnset < 0 && Math.abs(source) > 0.01) sourceOnset = Math.floor(index / wave.channels);
    if (decodedOnset < 0 && Math.abs(decoded) > 0.01) decodedOnset = Math.floor(index / wave.channels);
  }
  assert(sourceOnset >= 0 && decodedOnset >= 0, `${kind} has no audible onset`);
  const levelDifferenceDb = 10 * Math.log10(decodedEnergy / sourceEnergy);
  const onsetDifferenceMs = (decodedOnset - sourceOnset) * 1000 / wave.sampleRate;
  const signalToNoiseDb = 10 * Math.log10(sourceEnergy / errorEnergy);
  const correlation = cross / Math.sqrt(sourceEnergy * decodedEnergy);
  const leadingMagnitude = Math.max(...Array.from({ length: wave.channels }, (_, i) => Math.abs(decodedBytes.readFloatLE(i * 4))));
  const trailingMagnitude = Math.max(...Array.from({ length: wave.channels }, (_, i) => Math.abs(decodedBytes.readFloatLE(decodedBytes.length - (i + 1) * 4))));
  assert(Math.abs(levelDifferenceDb) <= SFX_QUALITY_LIMITS.maximumLevelDifferenceDb, `${kind} RMS level changed by ${levelDifferenceDb.toFixed(3)} dB`);
  assert(Math.abs(onsetDifferenceMs) <= SFX_QUALITY_LIMITS.maximumOnsetDifferenceMs, `${kind} onset shifted by ${onsetDifferenceMs.toFixed(3)} ms`);
  assert(signalToNoiseDb >= SFX_MINIMUM_SNR_DB[kind], `${kind} waveform SNR ${signalToNoiseDb.toFixed(3)} dB is below its regression bound`);
  assert(peak <= SFX_QUALITY_LIMITS.maximumPeak, `${kind} decoded peak lost its safe headroom`);
  assert(leadingMagnitude <= SFX_QUALITY_LIMITS.maximumLeadingMagnitude, `${kind} has excessive leading-edge ringing`);
  assert(trailingMagnitude <= SFX_QUALITY_LIMITS.maximumTrailingMagnitude, `${kind} has excessive trailing-edge ringing`);
  return { frames: wave.frames, durationSeconds: wave.duration, levelDifferenceDb, onsetDifferenceMs, signalToNoiseDb,
    correlation, peak, leadingMagnitude, trailingMagnitude };
}

export async function verifyOriginalSfx(root, ffmpeg) {
  const sfxRoot = path.join(root, "public/assets/audio/sfx");
  const manifest = JSON.parse(await readFile(path.join(sfxRoot, "manifest.json"), "utf8"));
  const sourceManifest = JSON.parse(await readFile(path.join(root, "art-source/audio/sfx/manifest.json"), "utf8"));
  assert(manifest.schemaVersion === 2, "SFX runtime manifest must use MP3 schemaVersion 2");
  for (const record of [manifest, sourceManifest]) {
    assert(record.composition === "Original sound design created for this project", "SFX originality metadata is missing");
    assert(record.sampleRate === 44_100 && record.channels === 2, "SFX manifest must specify stereo 44.1 kHz");
    const expectedKinds = record === sourceManifest ? ORIGINAL_SFX_MASTER_KINDS : ORIGINAL_SFX_KINDS;
    assert(JSON.stringify(Object.keys(record.sounds)) === JSON.stringify(expectedKinds), "Original SFX manifest does not match its source/runtime kinds");
  }
  const encoding = manifest.encoding;
  assert(encoding?.codec === "mp3" && encoding.encoder === "libmp3lame" && encoding.bitrateKbps === 96
    && encoding.sampleRate === 44_100 && encoding.channels === 2 && encoding.writeXing === true, "SFX encoding contract changed");
  const expectedFiles = ["manifest.json", ...ORIGINAL_SFX_KINDS.map((kind) => `${kind}.mp3`), "button.mp3", "exit.mp3", "putdown.mp3", "thaw.mp3", "shell.mp3", "shutter.mp3", "timeover.mp3", "time.mp3", "rocket.mp3", "pulse.mp3", "fail.mp3", "win.mp3", "gold.mp3", "itemArrival.mp3"].sort();
  const actualFiles = (await readdir(sfxRoot)).sort();
  assert(JSON.stringify(actualFiles) === JSON.stringify(expectedFiles),
    `Runtime SFX inventory differs (old WAV/unregistered/missing files): ${actualFiles.filter((name) => !expectedFiles.includes(name)).join(", ") || "missing expected file"}`);
  let bytes = 0;
  const measurements = [];
  for (const kind of ORIGINAL_SFX_KINDS) {
    const entry = manifest.sounds[kind];
    const original = sourceManifest.sounds[kind];
    assert(entry.file === `${kind}.mp3` && entry.source?.file === `art-source/audio/sfx/${kind}.wav`
      && original.file === `${kind}.wav`, `${kind} source/runtime path must remain canonical`);
    const [sourceBytes, runtimeBytes] = await Promise.all([
      readFile(path.join(root, entry.source.file)), readFile(path.join(sfxRoot, entry.file)),
    ]);
    const sourceHash = sha256(sourceBytes);
    assert(hasHash(entry.source.sha256) && sourceHash === entry.source.sha256.toLowerCase(), `${kind} source SHA256 differs`);
    assert(hasHash(original.sha256) && sourceHash === original.sha256.toLowerCase(), `${kind} archived master SHA256 differs`);
    assert(hasHash(entry.sha256) && sha256(runtimeBytes) === entry.sha256.toLowerCase(), `${kind} runtime SHA256 differs`);
    assert(sourceBytes.length === entry.source.bytes && sourceBytes.length === original.bytes, `${kind} source size differs`);
    assert(runtimeBytes.length === entry.bytes && runtimeBytes.length < sourceBytes.length, `${kind} runtime size/reduction differs`);
    const wave = inspectPcm16Wave(sourceBytes, `${kind} master`);
    assert(wave.frames === entry.source.frames && wave.frames === original.frames, `${kind} source frame count differs`);
    assert(entry.source.bitsPerSample === 16 && entry.source.channels === 2 && entry.source.sampleRate === 44_100, `${kind} source format metadata differs`);
    for (const record of [entry, entry.source, original]) {
      assert(Math.abs(wave.duration - record.durationSeconds) < 0.001, `${kind} duration differs from its manifest`);
    }
    assert(entry.peak === original.peak && entry.rms === original.rms, `${kind} original mastering metadata changed`);
    assert(Math.abs(wave.peak - original.peak) < 0.0001 && Math.abs(wave.rms - original.rms) < 0.0001, `${kind} PCM master differs from its original mastering measurements`);
    assert(wave.peak >= 0.74 && wave.peak <= 0.81, `${kind} master peak is outside the mastered range`);
    assert(wave.rms > 0.04 && wave.rms < 0.3, `${kind} master RMS is outside the expected range`);
    assert(wave.first.every((sample) => Math.abs(sample) <= 1), `${kind} master has a non-zero leading edge`);
    assert(wave.last.every((sample) => Math.abs(sample) <= 1), `${kind} master has a non-zero trailing edge`);
    const mp3 = inspectSfxMp3(runtimeBytes, kind);
    assert(mp3.gaplessFrames === wave.frames, `${kind} MP3 gapless frame count differs from its master`);
    // Do not request -ar/-ac here: conversion would conceal an incorrect stream.
    const decoded = spawnSync(ffmpeg, ["-v", "error", "-xerror", "-i", path.join(sfxRoot, entry.file),
      "-map", "0:a:0", "-f", "f32le", "-acodec", "pcm_f32le", "pipe:1"],
    { windowsHide: true, maxBuffer: 16 * 1024 * 1024, timeout: 30_000 });
    assert(!decoded.error && decoded.status === 0, `${kind} MP3 decoding failed: ${decoded.error?.message || decoded.stderr?.toString()}`);
    const quality = compareSfxPcm(wave, decoded.stdout, kind);
    measurements.push({ kind, sourceBytes: sourceBytes.length, bytes: runtimeBytes.length, sourceSha256: sourceHash,
      sha256: sha256(runtimeBytes), encoderDelayFrames: mp3.encoderDelay, endPaddingFrames: mp3.endPadding, ...quality });
    bytes += runtimeBytes.length;
  }
  return { manifest, bytes, measurements };
}
