import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Rebind an immutable override lineage to the active contract while omitting
// explicitly replaced levels.  Retained per-level targets must be byte-
// semantically equal to the active contract; this never silently carries a
// changed board/composition target forward.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const option = (name, fallback = null) => {
  const index = args.indexOf(name);
  return index < 0 ? fallback : args[index + 1];
};
const required = (name) => {
  const value = option(name);
  if (!value) throw new Error(`${name} is required`);
  return value;
};
const parseIds = (text) => new Set(String(text ?? "").split(",").flatMap((token) => {
  const match = token.trim().match(/^(\d+)(?:-(\d+))?$/);
  if (!match) return [];
  const from = Number(match[1]);
  const to = Number(match[2] ?? match[1]);
  return Array.from({ length: to - from + 1 }, (_value, index) => from + index);
}));
const canonical = (value) => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
};
const same = (left, right) => JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();

const inputRelative = required("--input");
const outputRelative = required("--output");
const contractRelative = option("--contract", "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v6.json");
const omitted = parseIds(option("--omit", ""));
const retainedOnly = parseIds(option("--keep", ""));
const [inputText, contractText] = await Promise.all([
  readFile(resolve(root, inputRelative), "utf8"),
  readFile(resolve(root, contractRelative), "utf8"),
]);
const input = JSON.parse(inputText);
const contract = JSON.parse(contractText);
const targetById = new Map(contract.levels.map((entry) => [
  Number(String(entry.level_id).replace(/^Lv/i, "")),
  entry.our_design_target,
]));
const levels = [];
for (const entry of input.levels ?? input) {
  const id = Number(entry.level?.id ?? entry.id ?? String(entry.level_id ?? "").replace(/^Lv/i, ""));
  if (omitted.has(id)) continue;
  if (retainedOnly.size && !retainedOnly.has(id)) continue;
  const target = targetById.get(id);
  if (!target) throw new Error(`Lv${id}: missing active contract target`);
  if (!same(entry.target, target)) throw new Error(`Lv${id}: retained target differs from active contract`);
  levels.push(structuredClone(entry));
}
if (!levels.length) throw new Error("filter removed every override entry");
const output = {
  schema_version: "blockout-video-parity-base-overrides-filtered-v1",
  prototype_only: true,
  applied_to_live_campaign: false,
  source: {
    contract: { path: contractRelative, sha256: sha256(contractText) },
    parent: { path: inputRelative, sha256: sha256(inputText) },
    omitted_level_ids: [...omitted].sort((left, right) => left - right),
    retained_only_level_ids: [...retainedOnly].sort((left, right) => left - right),
  },
  levels,
};
const outputPath = resolve(root, outputRelative);
await mkdir(dirname(outputPath), { recursive: true });
const text = `${JSON.stringify(output, null, 2)}\n`;
await writeFile(outputPath, text, "utf8");
console.log(JSON.stringify({
  output: relative(root, outputPath).replaceAll("\\", "/"),
  retained: levels.length,
  omitted: [...omitted].sort((left, right) => left - right),
  retained_only: [...retainedOnly].sort((left, right) => left - right),
  sha256: sha256(text),
}, null, 2));
