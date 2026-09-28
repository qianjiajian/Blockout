import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(import.meta.dirname, "..");
const sourceRoot = resolve(root, "art-source/audio/sfx");
const runtimeRoot = resolve(root, "public/assets/audio/sfx");
const names = ["blocked", "ice", "booster", "time", "rocket", "pulse", "mechanic", "reward", "unlock", "win", "fail"];
export const ORIGINAL_SFX_ENCODING = Object.freeze({
  codec: "mp3", encoder: "libmp3lame", bitrateKbps: 96, sampleRate: 44100, channels: 2, writeXing: true,
});

export function resolveSfxFfmpeg() {
  const candidates = [
    process.env.BLOCK_OUT_FFMPEG,
    "ffmpeg",
    ...(process.platform === "win32" ? [resolve(root, ".codex-temp/video-py/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe")] : []),
  ].filter(Boolean);
  for (const command of candidates) {
    const probe = spawnSync(command, ["-hide_banner", "-encoders"], { encoding: "utf8", windowsHide: true });
    if (!probe.error && probe.status === 0 && /\blibmp3lame\b/.test(probe.stdout)) return command;
  }
  throw new Error("SFX encoding requires FFmpeg with libmp3lame. Set BLOCK_OUT_FFMPEG to a compatible executable.");
}

function run(ffmpeg, args) {
  const result = spawnSync(ffmpeg, args, { windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`FFmpeg failed: ${result.stderr.toString()}`);
  return result.stdout;
}

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

export async function encodeOriginalSfxMp3() {
  const ffmpeg = resolveSfxFfmpeg();
  const sourceManifest = JSON.parse(await readFile(resolve(sourceRoot, "manifest.json"), "utf8"));
  const previousManifest = JSON.parse(await readFile(resolve(runtimeRoot, "manifest.json"), "utf8"));
  if (sourceManifest.sampleRate !== 44100 || sourceManifest.channels !== 2
    || Object.keys(sourceManifest.sounds).sort().join() !== [...names].sort().join()) {
    throw new Error("Unexpected source SFX set or format; expected the original 11 stereo 44.1 kHz masters.");
  }
  // Keep all user-provided effects byte-for-byte; never re-encode them.
  for (const name of ["button", "exit", "putdown", "thaw", "shell", "shutter"]) {
    const supplied = previousManifest.providedSounds?.[name];
    if (supplied?.file !== `${name}.mp3`
      || sha256(await readFile(resolve(runtimeRoot, supplied.file))) !== supplied.sha256.toLowerCase()) {
      throw new Error(`User-provided SFX metadata/hash mismatch: ${name}`);
    }
  }
  await mkdir(runtimeRoot, { recursive: true });
  const tempRoot = resolve(root, ".codex-temp");
  await mkdir(tempRoot, { recursive: true });
  const staging = await mkdtemp(resolve(tempRoot, "sfx-mp3-encode-"));
  const manifest = {
    schemaVersion: 2,
    title: sourceManifest.title,
    sampleRate: sourceManifest.sampleRate,
    channels: sourceManifest.channels,
    composition: sourceManifest.composition,
    encoding: ORIGINAL_SFX_ENCODING,
    sounds: {},
    providedSounds: previousManifest.providedSounds,
  };
  try {
    for (const name of names) {
      const source = sourceManifest.sounds[name];
      if (source.file !== `${name}.wav`) throw new Error(`Unexpected source filename: ${name}`);
      const sourcePath = resolve(sourceRoot, source.file);
      const sourceBytes = await readFile(sourcePath);
      if (sha256(sourceBytes) !== source.sha256 || sourceBytes.length !== source.bytes) {
        throw new Error(`Source master hash/size mismatch: ${name}`);
      }
      const file = `${name}.mp3`;
      const output = resolve(staging, file);
      run(ffmpeg, ["-nostdin", "-n", "-v", "error", "-i", sourcePath, "-map", "0:a:0", "-map_metadata", "-1",
        "-c:a", "libmp3lame", "-b:a", "96k", "-ac", "2", "-ar", "44100", "-write_xing", "1", output]);
      const decoded = run(ffmpeg, ["-nostdin", "-v", "error", "-i", output, "-map", "0:a:0", "-c:a", "pcm_f32le", "-f", "f32le", "pipe:1"]);
      if (decoded.length !== source.frames * 2 * 4) throw new Error(`Gapless sample count mismatch: ${name}`);
      const encoded = await readFile(output);
      if (encoded.length >= sourceBytes.length) throw new Error(`MP3 did not reduce size: ${name}`);
      manifest.sounds[name] = {
        file,
        durationSeconds: source.durationSeconds,
        peak: source.peak,
        rms: source.rms,
        bytes: encoded.length,
        sha256: sha256(encoded),
        source: {
          file: `art-source/audio/sfx/${source.file}`,
          bytes: sourceBytes.length,
          sha256: source.sha256,
          durationSeconds: source.durationSeconds,
          sampleRate: sourceManifest.sampleRate,
          channels: sourceManifest.channels,
          bitsPerSample: 16,
          frames: source.frames,
        },
      };
    }
    // Validate all outputs before replacing any runtime file. Originals stay in art-source.
    for (const name of names) {
      const file = manifest.sounds[name].file;
      const destination = resolve(runtimeRoot, file);
      const exists = await stat(destination).catch((error) => {
        if (error.code !== "ENOENT") throw error;
        return undefined;
      });
      if (!exists || sha256(await readFile(destination)) !== manifest.sounds[name].sha256) {
        await rename(resolve(staging, file), destination);
      }
      console.log(`${name}: ${manifest.sounds[name].source.bytes} -> ${manifest.sounds[name].bytes} bytes (96 kbps stereo MP3)`);
    }
    await writeFile(resolve(runtimeRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  } finally {
    const relativeStaging = relative(tempRoot, staging);
    if (!relativeStaging || relativeStaging === ".." || relativeStaging.startsWith(`..${sep}`) || isAbsolute(relativeStaging)) {
      throw new Error(`Refusing to remove staging outside task temp root: ${staging}`);
    }
    await rm(staging, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await encodeOriginalSfxMp3();
}
