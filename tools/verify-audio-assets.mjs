import { access, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ORIGINAL_SFX_KINDS, verifyOriginalSfx } from "./audio-quality.mjs";
import { resolveSfxFfmpeg } from "./encode-original-sfx-mp3.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sfxRoot = path.join(root, "public", "assets", "audio", "sfx");
const expectedOriginalSounds = ORIGINAL_SFX_KINDS;

const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const originalSfx = await verifyOriginalSfx(root, resolveSfxFfmpeg());
const manifest = originalSfx.manifest;
let sfxBytes = originalSfx.bytes;
for (const result of originalSfx.measurements) {
  console.log(`SFX ${result.kind}: ${result.frames} exact decoded frames; onset ${result.onsetDifferenceMs.toFixed(3)}ms; `
    + `RMS ${result.levelDifferenceDb.toFixed(3)}dB; SNR ${result.signalToNoiseDb.toFixed(3)}dB; ${result.bytes}B`);
}

const providedSounds = [
  { kind: "button", source: "User-provided click.mp3", minimumBytes: 500 },
  { kind: "exit", source: "User-provided xiaochu.mp3", minimumBytes: 20_000 },
  { kind: "putdown", source: "User-provided putdown.mp3", minimumBytes: 10_000 },
  { kind: "thaw", source: "User-provided sui.mp3", minimumBytes: 10_000 },
  // The replacement supplied on 2026-09-24 is 10,708 bytes; its exact hash remains required below.
  { kind: "shell", source: "User-provided waike.mp3", minimumBytes: 10_000 },
  { kind: "shutter", source: "User-provided juanlian.mp3", minimumBytes: 20_000 },
];
for (const expected of providedSounds) {
  const entry = manifest.providedSounds?.[expected.kind];
  assert(entry?.source === expected.source, `User-provided ${expected.kind} sound provenance is missing`);
  const bytes = await readFile(path.join(sfxRoot, entry.file));
  const hash = createHash("sha256").update(bytes).digest("hex").toUpperCase();
  assert(bytes.length > expected.minimumBytes && bytes.subarray(0, 3).toString("ascii") === "ID3", `Provided ${expected.kind} sound is not the expected MP3`);
  assert(hash === entry.sha256, `Provided ${expected.kind} sound differs from its manifest hash`);
  sfxBytes += bytes.length;
}

const challengeMeta = await readJson(path.join(root, "art-source", "audio", "happy-foods.json"));
const [challengeMaster, challengeRuntime] = await Promise.all([
  readFile(path.join(root, "art-source", "audio", "happy-foods.mp3")),
  readFile(path.join(root, "public", "assets", "audio", "happy-foods.mp3")),
]);
const challengeHash = createHash("sha256").update(challengeRuntime).digest("hex").toUpperCase();
assert(challengeMeta.scene === "level challenge", "happy-foods is assigned to the wrong game scene");
assert(challengeMeta.source === "User-provided MP3", "happy-foods provenance is missing");
assert(challengeMeta.sampleRate === 48_000 && challengeMeta.channels === 2, "happy-foods must remain stereo 48 kHz");
assert(Math.abs(challengeMeta.durationSeconds - 6_048_768 / 48_000) < 1e-9, "happy-foods decoded duration is incorrect");
assert(challengeMaster.equals(challengeRuntime), "happy-foods source and runtime copies differ");
assert(challengeRuntime.length === challengeMeta.optimization.runtimeBytes, "happy-foods runtime size differs from its optimization record");
assert(challengeHash === challengeMeta.runtimeSha256, "happy-foods differs from its optimized master hash");
assert(challengeRuntime.subarray(0, 3).toString("ascii") !== "ID3", "happy-foods still contains the stripped metadata tag");
assert(challengeRuntime[0] === 0xff && (challengeRuntime[1] & 0xe0) === 0xe0, "happy-foods does not begin with an MPEG audio frame");
assert(challengeRuntime.subarray(0, 512).includes(Buffer.from("Xing")), "happy-foods is missing its VBR/gapless header");
assert(challengeMeta.optimization.audioReencoded === false, "happy-foods must not be re-encoded");
assert(challengeMeta.optimization.originalBytes - challengeRuntime.length === 45, "happy-foods lossless reduction record is incorrect");

const suppliedMeta = await readJson(path.join(root, "art-source", "audio", "happy-carnival.json"));
const [suppliedMaster, suppliedRuntime] = await Promise.all([
  readFile(path.join(root, "art-source", "audio", "happy-carnival.mp3")),
  readFile(path.join(root, "public", "assets", "audio", "happy-carnival.mp3")),
]);
const suppliedHash = createHash("sha256").update(suppliedRuntime).digest("hex").toUpperCase();
assert(suppliedMeta.scene === "main interface", "happy-carnival is assigned to the wrong game scene");
assert(suppliedMeta.source === "User-provided MP3", "happy-carnival provenance is missing");
assert(suppliedMeta.sampleRate === 48_000 && suppliedMeta.channels === 2, "happy-carnival must remain stereo 48 kHz");
assert(Math.abs(suppliedMeta.durationSeconds - 7_112_551 / 48_000) < 1e-9, "happy-carnival decoded duration is incorrect");
assert(suppliedMaster.equals(suppliedRuntime), "happy-carnival source and runtime copies differ");
assert(suppliedRuntime.length === suppliedMeta.optimization.runtimeBytes, "happy-carnival runtime size differs from its optimization record");
assert(suppliedHash === suppliedMeta.runtimeSha256, "happy-carnival differs from its optimized master hash");
assert(suppliedRuntime.subarray(0, 3).toString("ascii") !== "ID3", "happy-carnival still contains the stripped metadata block");
assert(suppliedRuntime[0] === 0xff && (suppliedRuntime[1] & 0xe0) === 0xe0, "happy-carnival does not begin with an MPEG audio frame");
assert(suppliedRuntime.subarray(0, 512).includes(Buffer.from("Xing")), "happy-carnival is missing its VBR/gapless header");
assert(suppliedMeta.optimization.originalBytes > suppliedRuntime.length, "happy-carnival was not reduced from the supplied file");

const obsoleteMusic = [
  "art-source/audio/crown-of-color.json",
  "art-source/audio/crown-of-color.wav",
  "art-source/audio/archive/crown-of-color.mp3",
  "public/assets/audio/crown-of-color.mp3",
  "art-source/audio/neon-logic.json",
  "art-source/audio/neon-logic.wav",
  "public/assets/audio/neon-logic.mp3",
];
for (const obsolete of obsoleteMusic) {
  let exists = true;
  try { await access(path.join(root, obsolete)); } catch { exists = false; }
  assert(!exists, `Old menu music was not deleted: ${obsolete}`);
}

const packageSafetyHeadroom = 65_536;
const packageLimit = 4_194_304 - packageSafetyHeadroom;
assert(challengeRuntime.length + sfxBytes < packageLimit, "Challenge audio subpackage exceeds its safe WeChat budget");
assert(suppliedRuntime.length < packageLimit, "Menu music subpackage exceeds its safe WeChat budget");

console.log(`Audio verified (local decode, not device/listening certification): ${expectedOriginalSounds.length} original 96 kbps stereo MP3 SFX + ${providedSounds.length} user-provided sounds (${(sfxBytes / 1_048_576).toFixed(2)} MiB), `
  + `Happy Carnival ${suppliedMeta.durationSeconds.toFixed(3)}s (${(suppliedRuntime.length / 1_048_576).toFixed(2)} MiB), `
  + `Happy Foods ${challengeMeta.durationSeconds.toFixed(3)}s (${(challengeRuntime.length / 1_048_576).toFixed(2)} MiB, frame-exact audio).`);
