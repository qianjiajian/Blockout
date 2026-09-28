import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { resolveSfxFfmpeg } from "./encode-original-sfx-mp3.mjs";

const root = resolve(import.meta.dirname, "..");
const manifest = JSON.parse(await readFile(resolve(root, "art-source/audio/music-library/manifest.json"), "utf8"));
const runtimeManifest = JSON.parse(await readFile(resolve(root, "public/assets/audio/music-library/manifest.json"), "utf8"));
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const assert = (condition, message) => { if (!condition) throw new Error(message); };
assert(manifest.schemaVersion === 1 && manifest.batch === 1, "Music library manifest version mismatch");
assert(manifest.encoding?.codec === "mp3" && manifest.encoding?.bitrateKbps === 160
  && manifest.encoding?.sampleRate === 44_100 && manifest.encoding?.channels === 2,
"Music library encoding contract changed");
assert(manifest.tracks.length === 5 && runtimeManifest.tracks.length === 5, "Music library inventory mismatch");
const ffmpeg = resolveSfxFfmpeg();
for (const track of manifest.tracks) {
  const source = await readFile(resolve(root, track.sourceFile));
  const runtime = await readFile(resolve(root, "public", track.runtimeFile));
  assert(source.length === track.sourceBytes && sha256(source) === track.sourceSha256, `${track.id} source hash mismatch`);
  assert(runtime.length === track.runtimeBytes && sha256(runtime) === track.runtimeSha256, `${track.id} runtime hash mismatch`);
  assert(runtime.length < source.length, `${track.id} was not compressed`);
  assert(runtime.subarray(0, 3).toString("ascii") !== "ID3", `${track.id} still has ID3 metadata`);
  assert(runtime[0] === 0xff && (runtime[1] & 0xe0) === 0xe0, `${track.id} does not start with an MPEG frame`);
  const decoded = spawnSync(ffmpeg, ["-nostdin", "-v", "error", "-xerror", "-i", resolve(root, "public", track.runtimeFile), "-map", "0:a:0", "-f", "null", "-"], { windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
  assert(!decoded.error && decoded.status === 0, `${track.id} decode failed: ${decoded.stderr?.toString() ?? decoded.error?.message}`);
  const runtimeEntry = runtimeManifest.tracks.find((candidate) => candidate.id === track.id);
  assert(runtimeEntry?.runtimeSha256 === track.runtimeSha256, `${track.id} runtime manifest mirror mismatch`);
  console.log(`${track.id}: ${(runtime.length / 1_048_576).toFixed(2)} MiB, ${track.durationSeconds.toFixed(2)}s, decode PASS`);
}
console.log("Music library verified: 5 compressed MP3 tracks, source/runtime hashes and local decode PASS.");
