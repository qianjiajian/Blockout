import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Narrow production-assembly adapter for the already certified Lv52 candidate.
// Its authored frozen-gate assignment is part of the floor construction; the
// generic route-timing permutation would lower a critical value and introduce
// a below-floor completion.  The explicit flag is opt-in and leaves every
// other level on the normal assembly policy.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRelative = ".codex-temp/video-parity-v6-lv50-53-certified-candidates/proof-input.json";
const witnessRelative = ".codex-temp/video-parity-v6-lv50-53-certified-candidates/proof-witness.json";
const contractRelative = "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v6.json";
const outputDirRelative = ".codex-temp/video-parity-v6-lv52-preserved-gates-candidate-r1";
const [sourceText, witnessText, contractText] = await Promise.all([
  readFile(resolve(root, sourceRelative), "utf8"),
  readFile(resolve(root, witnessRelative), "utf8"),
  readFile(resolve(root, contractRelative), "utf8"),
]);
const source = JSON.parse(sourceText);
const witnesses = JSON.parse(witnessText);
const contract = JSON.parse(contractText);
const entry = structuredClone(source.levels.find((candidate) => candidate.level_id === "Lv052"));
const witness = structuredClone(witnesses.find((candidate) => candidate.level_id === "Lv052"));
const target = contract.levels.find((candidate) => candidate.level_id === "Lv052")?.our_design_target;
if (!entry || !witness || !target) throw new Error("Lv52 candidate, witness, or active contract target is missing");
const canonical = (value) => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === "object"
    ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]))
    : value;
if (JSON.stringify(canonical(entry.target)) !== JSON.stringify(canonical(target))) {
  throw new Error("Lv52 candidate target differs from the active contract");
}
entry.preserveGateThawDescriptors = true;
entry.search_attempt = `${entry.search_attempt ?? "exact-frontier"}-preserve-authored-gate-thaw-descriptors`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const artifact = {
  schema_version: "blockout-video-parity-lv52-preserved-gates-override-v1",
  prototype_only: true,
  applied_to_live_campaign: false,
  source: {
    parent: { path: sourceRelative, sha256: sha256(sourceText) },
    contract: { path: contractRelative, sha256: sha256(contractText) },
    policy: "preserve only Lv52 authored frozen-gate descriptors during normal assembly",
  },
  levels: [entry],
};
const outputDir = resolve(root, outputDirRelative);
await mkdir(outputDir, { recursive: true });
const artifactText = `${JSON.stringify(artifact, null, 2)}\n`;
const witnessTextOut = `${JSON.stringify([witness], null, 2)}\n`;
await Promise.all([
  writeFile(resolve(outputDir, "overrides.json"), artifactText, "utf8"),
  writeFile(resolve(outputDir, "proof-witness.json"), witnessTextOut, "utf8"),
]);
console.log(JSON.stringify({
  output: relative(root, outputDir).replaceAll("\\", "/"),
  override_sha256: sha256(artifactText),
  witness_sha256: sha256(witnessTextOut),
  level_spec_sha256: witness.level_spec_sha256 ?? null,
}, null, 2));
