import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// Rebind an immutable proof plan to the exact LevelSpec bytes emitted by a
// later assembler pass.  Only the declared per-level SHA is changed; proof
// groups, floors and methods are retained verbatim and revalidated by the
// authoritative verifier afterwards.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const option = (name) => {
  const index = args.indexOf(name);
  return index < 0 ? null : args[index + 1];
};
const required = (name) => {
  const value = option(name);
  if (!value) throw new Error(`${name} is required`);
  return value;
};
const parseIds = (text) => new Set(String(text).split(",").flatMap((token) => {
  const match = token.trim().match(/^(\d+)(?:-(\d+))?$/);
  if (!match) return [];
  const from = Number(match[1]);
  const to = Number(match[2] ?? match[1]);
  return Array.from({ length: to - from + 1 }, (_value, index) => from + index);
}));
const canonical = (value) => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().flatMap((key) => (
      value[key] === undefined ? [] : [[key, canonical(value[key])]]
    )));
  }
  return value;
};
const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const idOf = (entry) => Number(entry?.level?.id ?? entry?.id
  ?? String(entry?.level_id ?? entry?.levelId ?? "").replace(/^Lv/i, ""));

const inputRelatives = required("--input").split(";").map((value) => value.trim()).filter(Boolean);
const runtimeRelative = required("--runtime");
const outputRelative = required("--output");
const selected = parseIds(required("--levels"));
const plans = [];
for (const inputRelative of inputRelatives) {
  const input = JSON.parse(await readFile(resolve(root, inputRelative), "utf8"));
  const inputPlans = Array.isArray(input)
    ? input
    : Array.isArray(input.levels)
      ? input.levels
      : input.level_id || input.levelId || input.level?.id || input.id
        ? [input]
        : null;
  if (!Array.isArray(inputPlans)) {
    throw new Error(`${inputRelative} must be a proof plan, an array, or contain levels[]`);
  }
  plans.push(...inputPlans);
}

const bundle = await build({
  entryPoints: [resolve(root, runtimeRelative)],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const temporaryModule = resolve(root, ".codex-temp", `core-plan-runtime-${process.pid}-${Date.now()}.mjs`);
await mkdir(dirname(temporaryModule), { recursive: true });
await writeFile(temporaryModule, bundle.outputFiles[0].text, "utf8");
const runtime = await import(`${pathToFileURL(temporaryModule).href}?v=${Date.now()}`);
const levels = runtime.VIDEO_PARITY_LEVELS ?? runtime.levels;
if (!Array.isArray(levels)) throw new Error("runtime source does not export VIDEO_PARITY_LEVELS or levels");
const levelById = new Map(levels.map((level) => [Number(level.id), level]));

const rebound = plans.map((plan) => {
  const id = idOf(plan);
  if (!selected.has(id)) return structuredClone(plan);
  const level = levelById.get(id);
  if (!level) throw new Error(`Lv${id} is missing from runtime`);
  return {
    ...structuredClone(plan),
    level_spec_sha256: sha256(JSON.stringify(canonical(level))),
  };
});
for (const id of selected) {
  if (!rebound.some((plan) => idOf(plan) === id)) throw new Error(`Lv${id} is missing from core plan`);
}
const outputText = `${JSON.stringify(rebound, null, 2)}\n`;
const outputPath = resolve(root, outputRelative);
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, outputText, "utf8");
console.log(JSON.stringify({
  output: outputRelative,
  levels: [...selected].sort((left, right) => left - right),
  sha256: sha256(outputText),
}, null, 2));
