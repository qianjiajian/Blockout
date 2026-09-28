import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Replace only completion routes in an existing contract-bound override
// bundle. Geometry, stage scaffolds, carrier hints and proof metadata remain
// unchanged; every supplied witness must explicitly declare a fresh replay.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const inputRelative = process.env.VIDEO_PARITY_ROUTE_REPLACE_INPUT_RELATIVE;
const witnessRelative = process.env.VIDEO_PARITY_ROUTE_REPLACE_WITNESS_RELATIVE;
const outputRelative = process.env.VIDEO_PARITY_ROUTE_REPLACE_OUTPUT_RELATIVE;
const requestedIds = new Set(String(process.env.VIDEO_PARITY_ROUTE_REPLACE_LEVEL_IDS ?? "")
  .split(",")
  .map((value) => Number.parseInt(value.trim(), 10))
  .filter(Number.isInteger));
if (!inputRelative || !witnessRelative || !outputRelative || !requestedIds.size) {
  throw new Error("input, witness, output and one or more level ids are required");
}

const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const idOf = (entry) => Number(entry?.level?.id ?? entry?.id
  ?? String(entry?.level_id ?? entry?.levelId ?? "").replace(/^Lv/i, ""));
const label = (id) => `Lv${String(id).padStart(3, "0")}`;
const [inputText, witnessText] = await Promise.all([
  readFile(resolve(root, inputRelative), "utf8"),
  readFile(resolve(root, witnessRelative), "utf8"),
]);
const input = JSON.parse(inputText);
const witnessArtifact = JSON.parse(witnessText);
if (!Array.isArray(input.levels) || !input.levels.length) {
  throw new Error(`${inputRelative} has no levels array`);
}
const witnessById = new Map((Array.isArray(witnessArtifact)
  ? witnessArtifact : witnessArtifact.levels ?? witnessArtifact.routes ?? [])
  .flatMap((entry) => {
    const id = idOf(entry);
    const route = entry.drags ?? entry.route
      ?? (entry.events ?? []).filter((event) => event?.type !== "wait" && event?.blockId);
    return Number.isInteger(id) && entry.replayed !== false && Array.isArray(route) && route.length
      ? [[id, route]] : [];
  }));

const replaced = [];
for (const id of requestedIds) {
  const entry = input.levels.find((candidate) => idOf(candidate) === id);
  const route = witnessById.get(id);
  if (!entry) throw new Error(`${label(id)} is absent from ${inputRelative}`);
  if (!route) throw new Error(`${label(id)} has no replayed witness in ${witnessRelative}`);
  entry.route = structuredClone(route);
  entry.route_semantics = "fully_assembled_runtime";
  entry.validation = {
    ...(entry.validation ?? {}),
    completion_witness_replayed: true,
    completion_witness_source: witnessRelative,
    intended_for_final_assembler_revalidation: true,
  };
  replaced.push(id);
}
input.generated_on = new Date().toISOString();
input.source ??= {};
input.source.artifacts = [
  ...(input.source.artifacts ?? []),
  {
    path: witnessRelative,
    sha256: sha256(witnessText),
    level_ids: replaced.sort((left, right) => left - right),
    operation: "replace_completion_route_only",
  },
];
const outputText = `${JSON.stringify(input, null, 2)}\n`;
const outputPath = resolve(root, outputRelative);
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, outputText, "utf8");
console.log(JSON.stringify({
  output: outputRelative,
  replaced_level_ids: replaced,
  sha256: sha256(outputText),
}, null, 2));
