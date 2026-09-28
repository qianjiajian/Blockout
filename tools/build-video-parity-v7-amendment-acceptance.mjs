import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Bind the first v7 contract amendment to fresh, contract-exact runtime proofs.
// This report deliberately certifies only the listed levels; the merged active
// override collection also contains exploratory candidates with weaker status.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const contractRelative = "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v7.json";
const activeOverridesRelative = ".codex-temp/video-parity-v7-r93-active-plus-lv14/overrides.json";
const outputRelative = "playtest-results/experiments/video-parity-v7/amendments/lv14-lv17-lv20-acceptance.json";
const expectedContractSha256 = "1A413DB0084EA42C507AFB2D232B9537A3F9AB91E8F16D409C0ACD19A03DE88D";
const expectedTruthSha256 = "20CA38CBD36E6543E99A1C8A972880D16CCAE0B119581802CFA47C569DFC1D7E";
const cases = [
  {
    id: 14,
    runtime: ".codex-temp/video-parity-v7-lv14-formal-r95/runtime.generated.ts",
    audit: ".codex-temp/video-parity-v7-lv14-formal-r95/audit.json",
    routes: ".codex-temp/video-parity-v7-lv14-formal-r95/routes.json",
    proof: "playtest-results/experiments/video-parity-v7/proofs/lv14/reposition-floor-proof-v7-lv14-14.json",
  },
  {
    id: 17,
    runtime: ".codex-temp/video-parity-v7-lv17-formal-r91/videoParityLevels.generated.ts",
    audit: ".codex-temp/video-parity-v7-lv17-formal-r91/runtime-assembly-audit.json",
    routes: ".codex-temp/video-parity-v7-lv17-formal-r91/runtime-validation-routes.json",
  },
  {
    id: 20,
    runtime: ".codex-temp/video-parity-v7-lv20-formal-r88/videoParityLevels.generated.ts",
    audit: ".codex-temp/video-parity-v7-lv20-formal-r88/runtime-assembly-audit.json",
    routes: ".codex-temp/video-parity-v7-lv20-formal-r88/runtime-validation-routes.json",
  },
];

const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const label = (id) => `Lv${String(id).padStart(3, "0")}`;
const descriptor = async (pathRelative) => {
  const text = await readFile(resolve(root, pathRelative), "utf8");
  return { path: pathRelative, sha256: sha256(text), text };
};

const contractFile = await descriptor(contractRelative);
if (contractFile.sha256 !== expectedContractSha256) {
  throw new Error(`Unexpected v7 contract SHA-256: ${contractFile.sha256}`);
}
const contract = JSON.parse(contractFile.text);
if (contract.schema_version !== "blockout-video-parity-design-contract-v7"
  || contract.truth_sha256 !== expectedTruthSha256
  || contract.revision?.immutable_truth_preserved !== true
  || JSON.stringify(contract.revision?.changed_level_ids) !== JSON.stringify(["Lv020"])) {
  throw new Error("The v7 contract is not the expected immutable-truth Lv20 outline amendment.");
}

const activeFile = await descriptor(activeOverridesRelative);
const active = JSON.parse(activeFile.text);
if (active.source?.contract?.sha256 !== expectedContractSha256) {
  throw new Error("Active overrides are not bound to the v7 contract.");
}
const activeIds = (active.levels ?? []).map((entry) => entry.level?.id).sort((a, b) => a - b);

const certified = [];
for (const item of cases) {
  const [runtimeFile, auditFile, routesFile] = await Promise.all([
    descriptor(item.runtime), descriptor(item.audit), descriptor(item.routes),
  ]);
  const audit = JSON.parse(auditFile.text);
  const levelAudit = audit.levels?.find((entry) => entry.level_id === label(item.id));
  const target = contract.levels.find((entry) => entry.level_id === label(item.id))?.our_design_target;
  const activeEntry = active.levels.find((entry) => entry.level?.id === item.id);
  if (!target || !activeEntry) throw new Error(`${label(item.id)} is missing from the contract or active overrides.`);
  if (audit.inputs?.contract?.sha256 !== expectedContractSha256
    || audit.summary?.requested !== 1
    || audit.summary?.exact_contract !== 1
    || audit.summary?.validate_level_passed !== 1
    || audit.summary?.completion_witness_replayed !== 1
    || audit.summary?.incomplete !== 0
    || levelAudit?.status !== "assembled_and_replayed"
    || levelAudit?.validate_level !== "pass"
    || levelAudit?.exact_contract?.exact !== true
    || levelAudit?.completion_witness?.replayed !== true) {
    throw new Error(`${label(item.id)} does not satisfy every v7 acceptance gate.`);
  }
  let proofFile = null;
  let necessaryReposition = null;
  if (item.proof) {
    proofFile = await descriptor(item.proof);
    const proof = JSON.parse(proofFile.text);
    const proofLevel = proof.levels?.find((entry) => entry.level_id === item.id);
    if (proof.binding?.runtime_contract?.expected_contract_sha256 !== expectedContractSha256
      || proof.binding?.runtime_contract?.valid !== true
      || proof.summary?.binding_stable_at_post_search_check !== true
      || proof.summary?.combined_playable_floor_acceptance !== true
      || proof.summary?.all_applicable_floors_certified !== true
      || proofLevel?.target_floor_certified !== true
      || proofLevel?.lower_bound_statement_proven !== true
      || proofLevel?.campaign_reposition_floor !== target.campaign_reposition_floor) {
      throw new Error(`${label(item.id)} external floor proof is not a valid v7-bound certification.`);
    }
    necessaryReposition = {
      target_floor: target.campaign_reposition_floor,
      status: proofLevel.status,
      proof_method: "contract_bound_disjoint_relaxed_core_exhaustion",
      certified_lower_bound: target.campaign_reposition_floor,
      exact_optimum: null,
      explored_states: proofLevel.explored_states,
      warning: null,
    };
  } else {
    const internal = levelAudit.necessary_reposition;
    if (audit.summary?.floor_proven_met !== 1
      || internal?.status !== "proven_minimum_met"
      || internal?.proof_method !== "completed_optimal_solver_and_replayed_witness"
      || internal?.proven_minimum < target.campaign_reposition_floor) {
      throw new Error(`${label(item.id)} internal optimal proof does not meet the v7 floor.`);
    }
    necessaryReposition = {
      target_floor: internal.target_floor,
      status: internal.status,
      proof_method: internal.proof_method,
      certified_lower_bound: internal.proven_minimum,
      exact_optimum: internal.proven_minimum,
      explored_states: internal.exact_solver_explored_states,
      warning: internal.warning,
    };
  }
  certified.push({
    level_id: label(item.id),
    target: {
      board: target.board,
      time_seconds: target.time_seconds,
      full_level_block_count: target.full_level_block_count,
      full_level_shape_histogram: target.full_level_shape_histogram,
      full_level_color_count: target.full_level_color_count,
      mechanism_contract: target.mechanism_contract,
      campaign_reposition_floor: target.campaign_reposition_floor,
    },
    result: {
      status: levelAudit.status,
      validate_level: levelAudit.validate_level,
      exact_contract: levelAudit.exact_contract.exact,
      completion_witness: {
        replayed: levelAudit.completion_witness.replayed,
        drags: levelAudit.completion_witness.drags,
        clear_load: levelAudit.completion_witness.clear_load,
        reposition_overhead_upper_bound:
          levelAudit.completion_witness.reposition_overhead_upper_bound,
      },
      necessary_reposition: necessaryReposition,
    },
    evidence: {
      runtime: { path: runtimeFile.path, sha256: runtimeFile.sha256 },
      audit: { path: auditFile.path, sha256: auditFile.sha256 },
      routes: { path: routesFile.path, sha256: routesFile.sha256 },
      ...(proofFile ? { proof: { path: proofFile.path, sha256: proofFile.sha256 } } : {}),
    },
  });
}

const report = {
  schema_version: "blockout-video-parity-v7-amendment-acceptance-v1",
  title: "Video-parity v7 contract amendment acceptance: Lv14, Lv17, and Lv20",
  generated_on: "2026-09-16",
  status: "accepted_for_active_prototype_override_not_yet_published_to_campaign",
  source: {
    contract: { path: contractFile.path, sha256: contractFile.sha256 },
    immutable_truth_sha256: expectedTruthSha256,
    active_overrides: {
      path: activeFile.path,
      sha256: activeFile.sha256,
      entry_count: activeIds.length,
      level_ids: activeIds,
    },
  },
  certification_scope: {
    certified_level_ids: certified.map((entry) => entry.level_id),
    active_override_entry_count_is_not_a_certification_count: true,
    production_campaign_modified: false,
  },
  levels: certified,
};
const text = `${JSON.stringify(report, null, 2)}\n`;
const outputPath = resolve(root, outputRelative);
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, text, "utf8");
console.log(JSON.stringify({
  output: relative(root, outputPath).replaceAll("\\", "/"),
  sha256: sha256(text),
  certified: certified.map((entry) => ({
    level_id: entry.level_id,
    target_floor: entry.result.necessary_reposition.target_floor,
    certified_lower_bound: entry.result.necessary_reposition.certified_lower_bound,
    exact_optimum: entry.result.necessary_reposition.exact_optimum,
    explored_states: entry.result.necessary_reposition.explored_states,
  })),
}, null, 2));
