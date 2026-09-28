import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Build the narrow JSON shape consumed by the memory-bounded symmetry proof.
// This is an isolated diagnostic adapter: it never edits campaign sources and
// it copies the active v6 target verbatim instead of inventing proof metadata.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const candidateRelative = process.env.VIDEO_PARITY_SYMMETRY_CANDIDATE_RELATIVE
  ?? ".codex-temp/video-parity-floor-search-lv42-r3-strict/runtime-search/rank-01/preflight-candidates.json";
const contractRelative = process.env.VIDEO_PARITY_CONTRACT_RELATIVE
  ?? "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v6.json";
const outputRelative = process.env.VIDEO_PARITY_SYMMETRY_INPUT_RELATIVE
  ?? ".codex-temp/video-parity-floor-lv42-symmetry/proof-input.json";
const witnessRelative = process.env.VIDEO_PARITY_SYMMETRY_WITNESS_RELATIVE
  ?? ".codex-temp/video-parity-floor-lv42-symmetry/proof-witness.json";
const requestedIds = new Set(String(process.env.VIDEO_PARITY_SYMMETRY_LEVEL_IDS ?? "42")
  .split(",").map((value) => Number(value.trim())).filter(Number.isInteger));
const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const canonical = (value) => {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().flatMap((key) => (
    value[key] === undefined ? [] : [[key, canonical(value[key])]]
  )));
};

const [candidateText, contractText] = await Promise.all([
  readFile(resolve(root, candidateRelative), "utf8"),
  readFile(resolve(root, contractRelative), "utf8"),
]);
const candidate = JSON.parse(candidateText);
const contract = JSON.parse(contractText);
const contractById = new Map(contract.levels.map((entry) => [
  Number(String(entry.level_id).replace(/^Lv/i, "")), entry.our_design_target,
]));
const records = [];
const witnesses = [];
for (const entry of candidate.levels ?? candidate) {
  const level = structuredClone(entry.level ?? entry);
  const id = Number(level.id ?? String(entry.level_id ?? "").replace(/^Lv/i, ""));
  if (!requestedIds.has(id)) continue;
  const target = contractById.get(id);
  if (!target) throw new Error(`Lv${id} is absent from the active contract`);
  const route = structuredClone(entry.route ?? entry.drags ?? []);
  if (!route.length) throw new Error(`Lv${id} has no completion route`);
  records.push({
    level_id: `Lv${String(id).padStart(3, "0")}`,
    target,
    audit: { target_reposition_overhead: target.campaign_reposition_floor },
    level,
  });
  witnesses.push({ level_id: `Lv${String(id).padStart(3, "0")}`, drags: route });
}
if (!records.length) throw new Error("No requested candidate levels found");

const artifact = {
  schema_version: "blockout-video-parity-v6-symmetry-proof-input-v1",
  prototype_only: true,
  applied_to_live_campaign: false,
  sources: {
    contract: { path: contractRelative, sha256: sha256(contractText) },
    candidate: { path: candidateRelative, sha256: sha256(candidateText) },
  },
  levels: records,
};
const outputPath = resolve(root, outputRelative);
const witnessPath = resolve(root, witnessRelative);
const outputText = `${JSON.stringify(artifact, null, 2)}\n`;
const witnessText = `${JSON.stringify(witnesses, null, 2)}\n`;
await Promise.all([
  mkdir(dirname(outputPath), { recursive: true }),
  mkdir(dirname(witnessPath), { recursive: true }),
]);
await Promise.all([
  writeFile(outputPath, outputText, "utf8"),
  writeFile(witnessPath, witnessText, "utf8"),
]);
console.log(JSON.stringify({
  output: relative(root, outputPath).replaceAll("\\", "/"),
  output_sha256: sha256(outputText),
  witness: relative(root, witnessPath).replaceAll("\\", "/"),
  witness_sha256: sha256(witnessText),
  contract_sha256: sha256(contractText),
  levels: records.map((entry) => ({
    level_id: entry.level_id,
    level_spec_sha256: sha256(JSON.stringify(canonical(entry.level))),
    floor: entry.audit.target_reposition_overhead,
  })),
}, null, 2));
