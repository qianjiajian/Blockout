import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { access, lstat, mkdir, mkdtemp, readFile, realpath, rename, rm, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { tmpdir } from "node:os";
import { basename, delimiter, dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { resolveSfxFfmpeg } from "../tools/encode-original-sfx-mp3.mjs";

const root = resolve(import.meta.dirname, "..");
export const WECHAT_BACKGROUND_AUDIO_FILE = "happy-carnival.mp3";
export const WECHAT_BACKGROUND_AUDIO_ENCODING = Object.freeze({
  codec: "mp3", encoder: "libmp3lame", bitrateKbps: 112, sampleRate: 48000,
  channels: 2, writeXing: true, lossy: true, volumeProcessing: false, trimmed: false,
});
const encodedCache = new Map();
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const inside = (parent, child) => {
  const part = relative(parent, child);
  return !part || (!isAbsolute(part) && part !== ".." && !part.startsWith(`..${sep}`));
};

function run(ffmpeg, args) {
  const result = spawnSync(ffmpeg, args, {
    windowsHide: true, maxBuffer: 128 * 1024 * 1024, timeout: 60000,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Background audio FFmpeg failed: ${result.stderr.toString()}`);
  return result.stdout;
}

async function executablePath(command) {
  if (isAbsolute(command) || command.includes("/") || command.includes("\\")) return realpath(resolve(command));
  const extensions = process.platform === "win32"
    ? ["", ...(process.env.PATHEXT ?? ".COM;.EXE;.BAT;.CMD").split(";")]
    : [""];
  for (const directory of (process.env.PATH ?? "").split(delimiter)) {
    for (const extension of extensions) {
      const candidate = resolve(directory, `${command}${extension}`);
      try {
        await access(candidate, constants.X_OK);
        return await realpath(candidate);
      } catch (error) {
        if (!["ENOENT", "ENOTDIR", "EACCES"].includes(error.code)) throw error;
      }
    }
  }
  throw new Error(`Cannot resolve FFmpeg executable for hash binding: ${command}`);
}

async function encoderTool() {
  const executable = await executablePath(resolveSfxFfmpeg());
  return {
    executable,
    executableSha256: sha256(await readFile(executable)),
    version: run(executable, ["-version"]).toString("utf8").trim(),
    implementationSha256: sha256(await readFile(new URL(import.meta.url))),
  };
}

// A WAV pipe carries the decoded stream format without asking FFmpeg to resample
// or remix it. The data chunk can use UINT32_MAX because a pipe is not seekable.
function decodedPcm(ffmpeg, file) {
  const wav = run(ffmpeg, ["-nostdin", "-v", "error", "-i", file,
    "-map", "0:a:0", "-c:a", "pcm_s16le", "-f", "wav", "pipe:1"]);
  if (wav.toString("ascii", 0, 4) !== "RIFF" || wav.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error("Expected decoded RIFF/WAVE stream.");
  }
  let format;
  let pcm;
  for (let offset = 12; offset + 8 <= wav.length;) {
    const name = wav.toString("ascii", offset, offset + 4);
    const length = wav.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (name === "fmt ") {
      if (length < 16 || start + length > wav.length) throw new Error("Invalid decoded WAV format chunk.");
      format = {
        sampleRate: wav.readUInt32LE(start + 4), channels: wav.readUInt16LE(start + 2),
        bitsPerSample: wav.readUInt16LE(start + 14), blockAlign: wav.readUInt16LE(start + 12),
      };
      if (wav.readUInt16LE(start) !== 1) throw new Error("Expected decoded signed 16-bit PCM WAV.");
    }
    if (name === "data") {
      const end = length === 0xffffffff ? wav.length : start + length;
      if (end > wav.length) throw new Error("Truncated decoded WAV data.");
      pcm = wav.subarray(start, end);
      break;
    }
    if (start + length > wav.length) throw new Error("Truncated decoded WAV chunk.");
    offset = start + length + (length % 2);
  }
  if (!format || !pcm || format.bitsPerSample !== 16 || format.blockAlign !== format.channels * 2
    || pcm.length % format.blockAlign !== 0) throw new Error("Invalid decoded PCM sample alignment.");
  const frames = pcm.length / format.blockAlign;
  return {
    pcm,
    info: { ...format, frames, durationSeconds: frames / format.sampleRate, pcmSha256: sha256(pcm) },
  };
}

function mp3Frames(bytes, bitrateKbps) {
  const rates = [44100, 48000, 32000];
  const bitrates = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
  let count = 0;
  for (let offset = 0; offset < bytes.length;) {
    if (offset + 4 > bytes.length) throw new Error("Truncated MP3 frame header.");
    const header = bytes.readUInt32BE(offset);
    const rate = rates[(header >>> 10) & 3];
    const bitrate = bitrates[(header >>> 12) & 15];
    const channels = ((header >>> 6) & 3) === 3 ? 1 : 2;
    if ((header >>> 21) !== 0x7ff || ((header >>> 19) & 3) !== 3 || ((header >>> 17) & 3) !== 1
      || rate !== 48000 || bitrate !== bitrateKbps || channels !== 2) {
      throw new Error(`Unexpected CBR MP3 stream at byte ${offset}.`);
    }
    const length = Math.floor(144000 * bitrate / rate) + ((header >>> 9) & 1);
    offset += length;
    if (offset > bytes.length) throw new Error("Truncated MP3 audio frame.");
    count += 1;
  }
  return { codec: "MPEG-1 Layer III", bitrateKbps, sampleRate: 48000, channels: 2, frameCount: count };
}

function waveformComparison(source, output, channels) {
  if (source.length !== output.length) throw new Error("Cannot compare differently sized PCM streams.");
  const sums = Array.from({ length: channels }, () => ({ count: 0, x: 0, y: 0, xx: 0, yy: 0, xy: 0, error: 0 }));
  for (let offset = 0; offset < source.length; offset += 2) {
    const s = sums[(offset / 2) % channels];
    const x = source.readInt16LE(offset) / 32768;
    const y = output.readInt16LE(offset) / 32768;
    s.count += 1;
    s.x += x; s.y += y; s.xx += x * x; s.yy += y * y; s.xy += x * y;
    s.error += (x - y) ** 2;
  }
  const describe = (s) => ({
    pearsonCorrelation: (s.xy - s.x * s.y / s.count)
      / Math.sqrt((s.xx - s.x * s.x / s.count) * (s.yy - s.y * s.y / s.count)),
    sourceRms: Math.sqrt(s.xx / s.count), outputRms: Math.sqrt(s.yy / s.count),
    rmsDeltaDb: 10 * Math.log10(s.yy / s.xx), errorRms: Math.sqrt(s.error / s.count),
  });
  const combined = sums.reduce((acc, s) => {
    for (const key of Object.keys(s)) acc[key] = (acc[key] ?? 0) + s[key];
    return acc;
  }, {});
  return {
    method: "Pearson correlation of sample-aligned decoded signed-16 PCM; descriptive, not a perceptual quality certification",
    ...describe(combined), perChannel: sums.map(describe),
  };
}

async function encodeAtBitrate(sourceFile, bitrateKbps, { cache = true } = {}) {
  if (basename(sourceFile) !== WECHAT_BACKGROUND_AUDIO_FILE) {
    throw new Error(`Only ${WECHAT_BACKGROUND_AUDIO_FILE} may be re-encoded; challenge music and SFX are excluded.`);
  }
  if (![112, 128].includes(bitrateKbps)) throw new Error("Only the audited 112/128 kbps menu music profiles are supported.");
  const original = await readFile(sourceFile);
  const sourceSha256 = sha256(original);
  const tool = await encoderTool();
  const key = `${sourceSha256}:${tool.executableSha256}:${tool.implementationSha256}:${bitrateKbps}`;
  const perform = async () => {
    const stagingParent = await realpath(tmpdir());
    const staging = await mkdtemp(resolve(stagingParent, "block-out-wechat-bgm-"));
    try {
      const input = resolve(staging, "source.mp3");
      const output = resolve(staging, "encoded.mp3");
      await writeFile(input, original);
      const source = decodedPcm(tool.executable, input);
      if (source.info.sampleRate !== 48000 || source.info.channels !== 2 || source.info.frames <= 0) {
        throw new Error("Menu music must already be a nonempty 48000 Hz stereo recording; resampling/remixing is prohibited.");
      }
      const argumentsUsed = ["-nostdin", "-n", "-v", "error", "-fflags", "+bitexact", "-i", "<source.mp3>",
        "-map", "0:a:0", "-map_metadata", "-1", "-map_chapters", "-1", "-c:a", "libmp3lame",
        "-b:a", `${bitrateKbps}k`, "-ac", "2", "-ar", "48000", "-threads", "1", "-flags:a", "+bitexact",
        "-write_xing", "1", "-id3v2_version", "0", "-write_id3v1", "0", "<encoded.mp3>"];
      run(tool.executable, argumentsUsed.map((arg) => arg === "<source.mp3>" ? input : arg === "<encoded.mp3>" ? output : arg));
      const bytes = await readFile(output);
      const decoded = decodedPcm(tool.executable, output);
      for (const field of ["sampleRate", "channels", "frames"]) {
        if (decoded.info[field] !== source.info[field]) throw new Error(`Menu music ${field} changed during encoding.`);
      }
      if (bytes.length >= original.length) throw new Error("Menu music encoding did not reduce package size.");
      const stream = mp3Frames(bytes, bitrateKbps);
      const record = {
        schemaVersion: 1,
        file: WECHAT_BACKGROUND_AUDIO_FILE,
        encoding: { ...WECHAT_BACKGROUND_AUDIO_ENCODING, bitrateKbps },
        tool, argumentsUsed,
        source: { bytes: original.length, sha256: sourceSha256, decoded: source.info },
        output: { bytes: bytes.length, sha256: sha256(bytes), decoded: decoded.info, stream },
        savedBytes: original.length - bytes.length,
        validation: {
          sampleRatePreserved: true, channelsPreserved: true, decodedFramesPreserved: true,
          fullDurationPreserved: true, trimmingApplied: false, volumeProcessingApplied: false,
          sourceWritten: false, lossyEncoding: true,
        },
        amplitudeNote: "No gain filter, normalization or compensation is applied. LAME's bitrate preset includes default attenuation; the measured RMS change is recorded below. Waveform amplitude is not claimed to be identical.",
        waveformComparison: waveformComparison(source.pcm, decoded.pcm, source.info.channels),
      };
      return { bytes, record };
    } finally {
      const actual = await realpath(staging);
      if (!inside(stagingParent, actual) || dirname(actual) !== stagingParent
        || !basename(actual).startsWith("block-out-wechat-bgm-")) throw new Error("Unsafe audio staging cleanup path.");
      await rm(actual, { recursive: true, force: true });
    }
  };
  if (!cache) {
    const result = await perform();
    return { bytes: Buffer.from(result.bytes), record: structuredClone(result.record) };
  }
  if (!encodedCache.has(key)) {
    const pending = perform().catch((error) => { encodedCache.delete(key); throw error; });
    encodedCache.set(key, pending);
  }
  const result = await encodedCache.get(key);
  return { bytes: Buffer.from(result.bytes), record: structuredClone(result.record) };
}

// Production helpers always select the declared default. Candidate evaluation
// is separate so a size experiment cannot silently change the build profile.
export async function encodeWechatBackgroundAudio(sourceFile, options) {
  return encodeAtBitrate(sourceFile, WECHAT_BACKGROUND_AUDIO_ENCODING.bitrateKbps, options);
}

export async function evaluateWechatBackgroundAudio(sourceFile, bitrateKbps, options) {
  return encodeAtBitrate(sourceFile, bitrateKbps, options);
}

async function resolvedOutputDirectory(directory) {
  const absolute = resolve(directory);
  let ancestor = absolute;
  let suffix = "";
  for (;;) {
    try { return resolve(await realpath(ancestor), suffix); }
    catch (error) {
      if (error.code !== "ENOENT") throw error;
      suffix = suffix ? `${basename(ancestor)}${sep}${suffix}` : basename(ancestor);
      const parent = dirname(ancestor);
      if (parent === ancestor) throw error;
      ancestor = parent;
    }
  }
}

export async function prepareWechatBackgroundAudio(sourceDirectory, outputDirectory) {
  const source = await realpath(sourceDirectory);
  const output = await resolvedOutputDirectory(outputDirectory);
  if ([source, resolve(root, "public"), resolve(root, "src")].some((protectedPath) => inside(protectedPath, output))) {
    throw new Error("Background audio output must be outside source/public/src directories.");
  }
  const result = await encodeWechatBackgroundAudio(resolve(source, WECHAT_BACKGROUND_AUDIO_FILE));
  await mkdir(output, { recursive: true });
  const destination = resolve(output, WECHAT_BACKGROUND_AUDIO_FILE);
  const existing = await lstat(destination).catch((error) => {
    if (error.code !== "ENOENT") throw error;
    return null;
  });
  if (existing && !existing.isFile()) throw new Error("Audio output target must be a regular file.");
  const staging = await mkdtemp(resolve(output, ".wechat-bgm-write-"));
  try {
    const file = resolve(staging, WECHAT_BACKGROUND_AUDIO_FILE);
    await writeFile(file, result.bytes);
    await rename(file, destination);
  } finally {
    if (!inside(output, staging) || dirname(staging) !== output || !basename(staging).startsWith(".wechat-bgm-write-")) {
      throw new Error("Unsafe package audio staging cleanup path.");
    }
    await rm(staging, { recursive: true, force: true });
  }
  return result.record;
}

export async function snapshotWechatBackgroundAudio(sourceDirectory) {
  const { bytes, record } = await encodeWechatBackgroundAudio(resolve(sourceDirectory, WECHAT_BACKGROUND_AUDIO_FILE));
  return [{ path: WECHAT_BACKGROUND_AUDIO_FILE, bytes: bytes.length, sha256: record.output.sha256 }];
}
