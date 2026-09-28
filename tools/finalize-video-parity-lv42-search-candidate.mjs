import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Rebind one fake-id Lv42 search record to the authoritative v6 contract.  It
// remains an isolated candidate until the normal composer, assembler, replay,
// exactness audit, and independent floor proof all pass.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceDirRelative = process.env.VIDEO_PARITY_LV42_FINALIZE_SOURCE_DIR_RELATIVE
  ?? ".codex-temp/video-parity-floor-lv42-colors-r3-fixed-geometry";
const sourceId = Number(process.env.VIDEO_PARITY_LV42_FINALIZE_SOURCE_ID ?? 42217);
const outputDirRelative = process.env.VIDEO_PARITY_LV42_FINALIZE_OUTPUT_DIR_RELATIVE
  ?? ".codex-temp/video-parity-floor-lv42-finalize-42217";
const contractRelative = "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v6.json";
const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();

const inputPath = resolve(root, sourceDirRelative, "proof-input.json");
const witnessPath = resolve(root, sourceDirRelative, "proof-witness.json");
const contractPath = resolve(root, contractRelative);
const [inputText, witnessText, contractText] = await Promise.all([
  readFile(inputPath, "utf8"),
  readFile(witnessPath, "utf8"),
  readFile(contractPath, "utf8"),
]);
const source = JSON.parse(inputText).levels.find((entry) => entry.level?.id === sourceId);
const sourceWitness = JSON.parse(witnessText).find((entry) => Number(entry.level_id.slice(2)) === sourceId);
const contract = JSON.parse(contractText);
const target = contract.levels.find((entry) => entry.level_id === "Lv042")?.our_design_target;
if (!source || !sourceWitness || !target) throw new Error("source candidate, witness, or Lv042 contract target missing");
const level = structuredClone(source.level);
level.id = 42;
level.name = "融冰岔路";
level.timeSeconds = target.time_seconds;
level.designTargets = {
  formulaVersion: "blockout-d1-campaign-wave",
  calibratedDifficulty: target.target_d1_difficulty.calibrated_score,
  minimumRepositionOverhead: target.campaign_reposition_floor,
};
delete level.parMoves;
const route = structuredClone(sourceWitness.drags);
const candidates = {
  schema: "blockout-video-parity-v6-reposition-search-candidates-v1",
  generated_at: new Date().toISOString(),
  applied_to_live_campaign: false,
  proof_status: "pending_new_v6_verifier",
  sources: {
    contract: { path: contractRelative, sha256: sha256(contractText) },
    search_input: { path: relative(root, inputPath).replaceAll("\\", "/"), sha256: sha256(inputText) },
    search_witness: { path: relative(root, witnessPath).replaceAll("\\", "/"), sha256: sha256(witnessText) },
  },
  levels: [{
    level_id: "Lv042",
    target,
    search: { source_fake_level_id: sourceId, legacy_certificate_transferred: false },
    level,
    route,
  }],
};
const witnesses = [{
  level_id: "Lv042",
  source: `Lv42 colour/gate search fake id ${sourceId}`,
  proof_scope: "completion upper bound only",
  drags: route,
}];
const outputDir = resolve(root, outputDirRelative);
const candidatePath = resolve(outputDir, "preflight-candidates.json");
const outputWitnessPath = resolve(outputDir, "preflight-witnesses.json");
await mkdir(outputDir, { recursive: true });
const candidateText = `${JSON.stringify(candidates, null, 2)}\n`;
const outputWitnessText = `${JSON.stringify(witnesses, null, 2)}\n`;
await Promise.all([
  writeFile(candidatePath, candidateText, "utf8"),
  writeFile(outputWitnessPath, outputWitnessText, "utf8"),
]);
console.log(JSON.stringify({
  candidate: relative(root, candidatePath).replaceAll("\\", "/"),
  candidate_sha256: sha256(candidateText),
  witness: relative(root, outputWitnessPath).replaceAll("\\", "/"),
  witness_sha256: sha256(outputWitnessText),
  source_fake_level_id: sourceId,
  contract_sha256: sha256(contractText),
}, null, 2));
