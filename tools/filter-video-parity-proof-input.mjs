import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Materialize the unresolved slice of a proof batch without changing any
 * LevelSpec bytes.  This keeps staged proof filenames short and, more
 * importantly, prevents already-disproven candidates from being searched
 * again at every deeper cap.
 */
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
const inputRelative = required("--input");
const reportRelative = required("--report");
const outputDirRelative = required("--output-dir");
const witnessesRelative = option("--witnesses");
const statusPrefixes = String(option("--status-prefixes", "inconclusive"))
  .split(",").map((value) => value.trim()).filter(Boolean);
const reindexStart = Number(option("--reindex-start", "0"));
if (!Number.isSafeInteger(reindexStart) || reindexStart < 0) {
  throw new Error("--reindex-start must be a non-negative safe integer");
}

const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const display = (path) => relative(root, path).replaceAll("\\", "/");
const numericId = (entry) => Number(entry.level?.id
  ?? entry.id
  ?? String(entry.level_id ?? "").replace(/^Lv/i, ""));
const label = (id) => `Lv${String(id).padStart(3, "0")}`;

const inputPath = resolve(root, inputRelative);
const reportPath = resolve(root, reportRelative);
const [inputText, reportText] = await Promise.all([
  readFile(inputPath, "utf8"),
  readFile(reportPath, "utf8"),
]);
const input = JSON.parse(inputText);
const report = JSON.parse(reportText);
const selectedSourceIds = new Set((report.reports ?? [])
  .filter((entry) => statusPrefixes.some((prefix) => String(entry.proof?.status ?? entry.status ?? "").startsWith(prefix)))
  .map(numericId));
const sourceLevels = (input.levels ?? input).filter((entry) => selectedSourceIds.has(numericId(entry)));
if (!sourceLevels.length) throw new Error("No report entries matched the requested status prefixes");

const idMap = new Map(sourceLevels.map((entry, index) => {
  const sourceId = numericId(entry);
  return [sourceId, reindexStart > 0 ? reindexStart + index : sourceId];
}));
const levels = sourceLevels.map((entry) => {
  const next = structuredClone(entry);
  const sourceId = numericId(next);
  const id = idMap.get(sourceId);
  next.level_id = label(id);
  if (next.level) {
    next.level.id = id;
    next.level.name = `${next.level.name} [source ${label(sourceId)}]`;
  } else {
    next.id = id;
    next.name = `${next.name} [source ${label(sourceId)}]`;
  }
  next.search_source_level_id = label(sourceId);
  return next;
});

let witnessText = null;
let witnesses = [];
if (witnessesRelative) {
  const witnessPath = resolve(root, witnessesRelative);
  witnessText = await readFile(witnessPath, "utf8");
  const artifact = JSON.parse(witnessText);
  witnesses = (artifact.levels ?? artifact.routes ?? artifact)
    .filter((entry) => selectedSourceIds.has(numericId(entry)))
    .map((entry) => {
      const next = structuredClone(entry);
      const sourceId = numericId(next);
      const id = idMap.get(sourceId);
      next.level_id = label(id);
      if (next.level) next.level.id = id;
      else if (Object.hasOwn(next, "id")) next.id = id;
      next.search_source_level_id = label(sourceId);
      return next;
    });
}

const outputDir = resolve(root, outputDirRelative);
await mkdir(outputDir, { recursive: true });
const output = {
  schema_version: "blockout-video-parity-filtered-proof-input-v1",
  prototype_only: true,
  applied_to_live_campaign: false,
  source: {
    input: { path: inputRelative, sha256: sha256(inputText) },
    report: { path: reportRelative, sha256: sha256(reportText) },
    witnesses: witnessText ? { path: witnessesRelative, sha256: sha256(witnessText) } : null,
  },
  selection: {
    status_prefixes: statusPrefixes,
    source_count: sourceLevels.length,
    reindexed: reindexStart > 0,
    id_map: Object.fromEntries([...idMap].map(([sourceId, id]) => [label(id), label(sourceId)])),
  },
  levels,
};
const outputText = `${JSON.stringify(output, null, 2)}\n`;
const outputPath = resolve(outputDir, "proof-input.json");
await writeFile(outputPath, outputText, "utf8");

let outputWitnessPath = null;
let outputWitnessText = null;
if (witnessText) {
  outputWitnessText = `${JSON.stringify(witnesses, null, 2)}\n`;
  outputWitnessPath = resolve(outputDir, "proof-witness.json");
  await writeFile(outputWitnessPath, outputWitnessText, "utf8");
}
const manifestPath = resolve(outputDir, "manifest.json");
await writeFile(manifestPath, `${JSON.stringify({
  schema_version: "blockout-video-parity-filtered-proof-manifest-v1",
  proof_input: { path: display(outputPath), sha256: sha256(outputText) },
  proof_witness: outputWitnessPath ? { path: display(outputWitnessPath), sha256: sha256(outputWitnessText) } : null,
  selected: levels.length,
  selection: output.selection,
}, null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  input: display(outputPath),
  witnesses: outputWitnessPath ? display(outputWitnessPath) : null,
  manifest: display(manifestPath),
  selected: levels.length,
  levels: reindexStart > 0
    ? `${reindexStart}-${reindexStart + levels.length - 1}`
    : levels.map(numericId).join(","),
}, null, 2));
