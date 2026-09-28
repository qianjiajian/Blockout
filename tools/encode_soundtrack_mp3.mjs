import { copyFile, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const sourceRoot = resolve(root, "art-source/audio");
const runtimeRoot = resolve(root, "public/assets/audio");
const suppliedTracks = ["happy-carnival", "happy-foods"];

await mkdir(runtimeRoot, { recursive: true });
for (const track of suppliedTracks) {
  await copyFile(resolve(sourceRoot, `${track}.mp3`), resolve(runtimeRoot, `${track}.mp3`));
  console.log(`Copied optimized supplied soundtrack: ${track}.mp3`);
}

for (const obsolete of ["crown-of-color.mp3", "neon-logic.mp3", "prism-escape-theme.mp3"]) {
  await rm(resolve(runtimeRoot, obsolete), { force: true });
}
for (const obsolete of [
  "crown-of-color.wav",
  "crown-of-color.json",
  "neon-logic.wav",
  "neon-logic.json",
  "prism-escape-theme.wav",
  "prism-escape-theme.json",
]) {
  await rm(resolve(sourceRoot, obsolete), { force: true });
}
