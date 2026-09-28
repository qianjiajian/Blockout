import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { resolveSfxFfmpeg } from "./encode-original-sfx-mp3.mjs";

const root = resolve(import.meta.dirname, "..");
const sourceInput = resolve(process.env.BLOCK_OUT_MUSIC_SOURCE ?? "C:/Users/Administrator/Downloads/背景音乐");
const sourceRoot = resolve(root, "art-source/audio/music-library/source");
const runtimeRoot = resolve(root, "public/assets/audio/music-library");

const tracks = [
  {
    id: "tides-smiles",
    title: "暖阳微风",
    artist: "Moavii",
    file: "[No Copyright Background Music] Happy Fun Feel Good Guitar ｜ Tides & Smiles by Moavii.mp3",
    runtimeFile: "tides-smiles.mp3",
    unlockLevel: 15,
  },
  {
    id: "dreamscape",
    title: "梦境漫游",
    artist: "Roa",
    file: "Dreamscape – Pop Background Music ｜ Roa.mp3",
    runtimeFile: "dreamscape.mp3",
    unlockLevel: 30,
  },
  {
    id: "do-you-see-me",
    title: "霓虹节拍",
    artist: "Bass Rebels",
    file: "Melodic Uplifting EDM Copyright Free Music ｜ Do You See Me [Bass Rebels].mp3",
    runtimeFile: "do-you-see-me.mp3",
    unlockLevel: 45,
  },
  {
    id: "smile",
    title: "欢乐漫步",
    artist: "Scandinavianz",
    file: "Smile – Happy Background Music ｜ Scandinavianz.mp3",
    runtimeFile: "smile.mp3",
    unlockLevel: 60,
  },
  {
    id: "splash",
    title: "海湾水花",
    artist: "Roa",
    file: "Splash – Roa (No Copyright Music).mp3",
    runtimeFile: "splash.mp3",
    unlockLevel: 75,
  },
];

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const run = (ffmpeg, args) => {
  const result = spawnSync(ffmpeg, args, { windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`FFmpeg failed: ${result.stderr?.toString() ?? "unknown error"}`);
};

await mkdir(sourceRoot, { recursive: true });
await mkdir(runtimeRoot, { recursive: true });
const ffmpeg = resolveSfxFfmpeg();
const manifest = {
  schemaVersion: 1,
  batch: 1,
  encoding: {
    codec: "mp3",
    encoder: "libmp3lame",
    bitrateKbps: 160,
    sampleRate: 44100,
    channels: 2,
    writeXing: true,
    metadataStripped: true,
    videoAndCoverArtRemoved: true,
  },
  rightsNotice: "曲目来自用户提供的下载文件。发布前须逐首确认商业游戏授权并保留作者署名与来源链接；‘No Copyright’或‘Copyright Free’不等同于商业授权。",
  tracks: [],
};

for (const track of tracks) {
  const input = resolve(sourceInput, track.file);
  const source = resolve(sourceRoot, track.file);
  const runtime = resolve(runtimeRoot, track.runtimeFile);
  await stat(input);
  await copyFile(input, source);
  const sourceBytes = await readFile(source);
  run(ffmpeg, ["-nostdin", "-y", "-v", "error", "-i", source, "-vn", "-map", "0:a:0", "-map_metadata", "-1",
    "-c:a", "libmp3lame", "-b:a", "160k", "-ar", "44100", "-ac", "2", "-write_xing", "1", "-id3v2_version", "0", "-write_id3v1", "0", runtime]);
  const runtimeBytes = await readFile(runtime);
  const probe = spawnSync(ffmpeg, ["-hide_banner", "-i", runtime, "-f", "null", "-"], { windowsHide: true, encoding: "utf8" });
  const durationMatch = `${probe.stderr ?? ""}\n${probe.stdout ?? ""}`.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  const durationSeconds = durationMatch
    ? Number(durationMatch[1]) * 3600 + Number(durationMatch[2]) * 60 + Number(durationMatch[3])
    : Number.NaN;
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) throw new Error(`Could not measure ${track.id} duration`);
  manifest.tracks.push({
    ...track,
    sourceFile: `art-source/audio/music-library/source/${track.file}`,
    sourceBytes: sourceBytes.length,
    sourceSha256: sha256(sourceBytes),
    runtimeFile: `assets/audio/music-library/${track.runtimeFile}`,
    runtimeBytes: runtimeBytes.length,
    runtimeSha256: sha256(runtimeBytes),
    durationSeconds,
    loop: { startSeconds: 0, endSeconds: durationSeconds },
    attribution: `${track.title} by ${track.artist}; source filename: ${track.file}`,
    rights: "USER_PROVIDED_NEEDS_COMMERCIAL_LICENSE_CONFIRMATION",
  });
  console.log(`${track.id}: ${sourceBytes.length} -> ${runtimeBytes.length} bytes (${durationSeconds.toFixed(3)}s)`);
}
await writeFile(resolve(root, "art-source/audio/music-library/manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(resolve(runtimeRoot, "manifest.json"), `${JSON.stringify({
  schemaVersion: manifest.schemaVersion,
  batch: manifest.batch,
  encoding: manifest.encoding,
  tracks: manifest.tracks.map(({ id, title, artist, unlockLevel, runtimeFile, runtimeBytes, runtimeSha256, durationSeconds, loop }) => ({
    id, title, artist, unlockLevel, runtimeFile, runtimeBytes, runtimeSha256, durationSeconds, loop,
  })),
}, null, 2)}\n`);
