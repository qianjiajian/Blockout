import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const arg = (name) => {
  const index = args.indexOf(name);
  if (index < 0 || !args[index + 1]) throw new Error(`${name} is required`);
  return args[index + 1];
};
const inputPath = resolve(root, arg("--input"));
const outputPath = resolve(root, arg("--output"));
const levelNumber = Number(arg("--level"));
const colors = arg("--colors").split(",").map((value) => value.trim()).filter(Boolean);
const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const inputText = await readFile(inputPath, "utf8");
const artifact = JSON.parse(inputText);
const entries = Array.isArray(artifact) ? artifact : artifact.levels ?? [];
const entry = entries.find((candidate) => Number(String(candidate.level_id ?? candidate.level?.id).replace(/^Lv/i, "")) === levelNumber);
if (!entry?.level) throw new Error(`Lv${levelNumber} not found`);
const gates = entry.level.gates ?? [];
if (colors.length !== gates.length) throw new Error(`expected ${gates.length} colors, got ${colors.length}`);
const remaining = [...gates];
entry.level.gates = colors.map((color) => {
  const index = remaining.findIndex((gate) => gate.color === color);
  if (index < 0) throw new Error(`gate color ${color} is unavailable`);
  return remaining.splice(index, 1)[0];
});
artifact.title = `${artifact.title ?? "video parity seed"} — descriptor-order carrier`;
artifact.gate_descriptor_order = { level_id: `Lv${String(levelNumber).padStart(3, "0")}`, colors };
await mkdir(dirname(outputPath), { recursive: true });
const outputText = `${JSON.stringify(artifact, null, 2)}\n`;
await writeFile(outputPath, outputText);
console.log(JSON.stringify({
  output: relative(root, outputPath).replaceAll("\\", "/"),
  sha256: sha256(outputText),
  colors,
}, null, 2));
