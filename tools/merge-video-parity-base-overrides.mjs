import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Merge independently generated, contract-bound base seed artifacts into the
 * single optional override input consumed by assemble-video-parity-runtime.
 *
 * Inputs are deliberately explicit and fail closed on duplicate level ids.
 * This prevents a later mechanism-specific experiment from silently replacing
 * another accepted seed for the same level.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const contractRelative = process.env.VIDEO_PARITY_CONTRACT_RELATIVE
  ?? "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v6.json";
const inputRelatives = String(process.env.VIDEO_PARITY_BASE_OVERRIDE_INPUTS ?? "")
  .split(";")
  .map((value) => value.trim())
  .filter(Boolean);
const outputRelative = process.env.VIDEO_PARITY_BASE_OVERRIDE_OUTPUT_RELATIVE
  ?? ".codex-temp/video-parity-base-overrides-merged/overrides.json";
const referenceCandidatesRelative = process.env.VIDEO_PARITY_BASE_REFERENCE_CANDIDATES_RELATIVE?.trim() || null;
const replaceDuplicates = process.env.VIDEO_PARITY_BASE_OVERRIDE_REPLACE_DUPLICATES === "1";

if (!inputRelatives.length) {
  throw new Error(
    "VIDEO_PARITY_BASE_OVERRIDE_INPUTS must list one or more artifact paths separated by ';'.",
  );
}

const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const canonical = (value) => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
};
const same = (left, right) => JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
const label = (id) => `Lv${String(id).padStart(3, "0")}`;

const contractPath = resolve(root, contractRelative);
const contractText = await readFile(contractPath, "utf8");
const contractSha256 = sha256(contractText);
const contract = JSON.parse(contractText);
const contractById = new Map(contract.levels.map((entry) => [
  Number(String(entry.level_id).replace(/^Lv/i, "")),
  entry,
]));
const referenceCandidatesArtifact = referenceCandidatesRelative
  ? JSON.parse(await readFile(resolve(root, referenceCandidatesRelative), "utf8"))
  : null;
const referenceCandidatesContractSha = referenceCandidatesArtifact?.source_contract?.sha256 ?? null;
const referenceCandidatesById = new Map((referenceCandidatesArtifact?.levels ?? []).map((entry) => [
  Number(entry.level?.id ?? entry.id ?? String(entry.level_id ?? "").replace(/^Lv/i, "")),
  entry,
]));

const mergedById = new Map();
const sources = [];
const replacements = [];
for (const inputRelative of inputRelatives) {
  const text = await readFile(resolve(root, inputRelative), "utf8");
  const artifact = JSON.parse(text);
  const declaredContractSha = artifact.source?.contract?.sha256
    ?? artifact.sources?.contract?.sha256
    ?? artifact.source_contract?.sha256
    ?? null;
  const entries = Array.isArray(artifact) ? artifact : artifact.levels;
  if (!Array.isArray(entries) || !entries.length) {
    throw new Error(`${inputRelative}: expected a non-empty levels array.`);
  }
  const declaredContractMatches = declaredContractSha
    && String(declaredContractSha).toUpperCase() === contractSha256;
  if (!declaredContractMatches) {
    const mismatchedTargets = entries.filter((entry) => {
      const level = entry.level ?? entry;
      const id = Number(level?.id ?? String(entry.level_id ?? "").replace(/^Lv/i, ""));
      const activeContract = contractById.get(id);
      const referenceTarget = referenceCandidatesContractSha === declaredContractSha
        ? referenceCandidatesById.get(id)?.target
        : null;
      const claimedTarget = entry.target ?? referenceTarget;
      return !claimedTarget || !activeContract || !same(claimedTarget, activeContract.our_design_target);
    });
    if (!declaredContractSha || mismatchedTargets.length) {
      throw new Error(
        `${inputRelative}: contract SHA ${declaredContractSha ?? "missing"} does not match ${contractSha256}`
        + ` and ${mismatchedTargets.length || "one or more"} override targets cannot be rebound exactly.`,
      );
    }
  }
  const accepted = [];
  for (const entry of entries) {
    const level = entry.level ?? entry;
    const id = Number(level?.id ?? String(entry.level_id ?? "").replace(/^Lv/i, ""));
    const activeContract = contractById.get(id);
    if (!Number.isInteger(id) || !activeContract || level?.id !== id) {
      throw new Error(`${inputRelative}: invalid level id ${entry.level_id ?? level?.id}.`);
    }
    if (entry.target && !same(entry.target, activeContract.our_design_target)) {
      throw new Error(`${inputRelative}: ${label(id)} target differs from the active contract.`);
    }
    const route = entry.route ?? entry.drags;
    if (!Array.isArray(route) || !route.length) {
      throw new Error(`${inputRelative}: ${label(id)} has no authored completion route.`);
    }
    if (mergedById.has(id)) {
      if (!replaceDuplicates) {
        throw new Error(
          `${label(id)} is present in both ${mergedById.get(id).__source} and ${inputRelative}.`,
        );
      }
      replacements.push({
        level_id: label(id),
        replaced_source: mergedById.get(id).__source,
        replacement_source: inputRelative,
      });
    }
    mergedById.set(id, {
      ...structuredClone(entry),
      ...(!entry.target ? {
        target: structuredClone(activeContract.our_design_target),
        target_rebound_from_reference: referenceCandidatesRelative,
      } : {}),
      __source: inputRelative,
    });
    accepted.push(id);
  }
  sources.push({
    path: inputRelative,
    sha256: sha256(text),
    declared_contract_sha256: declaredContractSha,
    contract_compatibility: declaredContractMatches
      ? "full_contract_sha256_exact"
      : "per_level_design_target_projection_exact_rebind",
    level_ids: accepted.sort((left, right) => left - right),
  });
}

const levels = [...mergedById.entries()]
  .sort(([left], [right]) => left - right)
  .map(([, entry]) => {
    const { __source, ...clean } = entry;
    return { ...clean, override_source: __source };
  });
const output = {
  schema_version: "blockout-video-parity-base-overrides-v1",
  title: "Merged contract-bound video-parity base seeds",
  generated_on: new Date().toISOString(),
  prototype_only: true,
  applied_to_live_campaign: false,
  source: {
    contract: { path: contractRelative, sha256: contractSha256 },
    artifacts: sources,
    replacement_policy: replaceDuplicates ? "later_explicit_input_replaces_earlier_duplicate" : "duplicates_rejected",
    replacements,
  },
  scope: levels.map((entry) => entry.level_id ?? label(entry.level.id)),
  levels,
};
const outputPath = resolve(root, outputRelative);
await mkdir(dirname(outputPath), { recursive: true });
const outputText = `${JSON.stringify(output, null, 2)}\n`;
await writeFile(outputPath, outputText, "utf8");
console.log(JSON.stringify({
  output: relative(root, outputPath).replaceAll("\\", "/"),
  levels: levels.length,
  level_ids: levels.map((entry) => entry.level.id),
  sha256: sha256(outputText),
}, null, 2));
