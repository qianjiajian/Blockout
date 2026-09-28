import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Replace one level in an already complete contract-bound override bundle.
// This is intentionally narrow: it cannot add/remove ids or rebind contracts.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const inputRelative = process.env.VIDEO_PARITY_REPLACE_OVERRIDE_INPUT_RELATIVE;
const replacementRelative = process.env.VIDEO_PARITY_REPLACE_OVERRIDE_REPLACEMENT_RELATIVE;
const outputRelative = process.env.VIDEO_PARITY_REPLACE_OVERRIDE_OUTPUT_RELATIVE;
const id = Number(process.env.VIDEO_PARITY_REPLACE_OVERRIDE_LEVEL_ID);
if (!inputRelative || !replacementRelative || !outputRelative || !Number.isInteger(id)) {
  throw new Error("input, replacement, output, and integer level id env vars are required");
}
const sha256 = (text) => createHash("sha256").update(text).digest("hex").toUpperCase();
const [inputText, replacementText] = await Promise.all([
  readFile(resolve(root, inputRelative), "utf8"),
  readFile(resolve(root, replacementRelative), "utf8"),
]);
const input = JSON.parse(inputText);
const replacementArtifact = JSON.parse(replacementText);
const replacement = (replacementArtifact.levels ?? replacementArtifact)
  .find((entry) => Number(entry.level?.id ?? entry.id) === id);
if (!replacement) throw new Error(`replacement Lv${id} missing`);
const contractSha = String(input.source?.contract?.sha256 ?? "").toUpperCase();
const replacementContractSha = String(replacementArtifact.source?.contract?.sha256 ?? "").toUpperCase();
if (!contractSha || contractSha !== replacementContractSha) {
  throw new Error(`contract mismatch ${contractSha || "missing"} != ${replacementContractSha || "missing"}`);
}
const index = input.levels.findIndex((entry) => Number(entry.level?.id ?? entry.id) === id);
if (index < 0) throw new Error(`input Lv${id} missing`);
input.levels[index] = {
  ...structuredClone(replacement),
  override_source: replacementRelative,
};
input.generated_on = new Date().toISOString();
input.source.artifacts = [
  ...(input.source.artifacts ?? []),
  {
    path: replacementRelative,
    sha256: sha256(replacementText),
    declared_contract_sha256: replacementContractSha,
    contract_compatibility: "full_contract_sha256_exact",
    level_ids: [id],
    operation: "replace_existing_level",
  },
];
const outputText = `${JSON.stringify(input, null, 2)}\n`;
const outputPath = resolve(root, outputRelative);
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, outputText, "utf8");
console.log(JSON.stringify({ output: outputRelative, level_id: id, sha256: sha256(outputText) }, null, 2));
