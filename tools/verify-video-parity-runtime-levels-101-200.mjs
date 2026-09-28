import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const auditPath = resolve(root, "deliverables/level-generation-blueprint/blockout-lv101-lv200-runtime-projection-v1-audit.json");
const audit = JSON.parse(await readFile(auditPath, "utf8"));
const issues = [];
const assert = (condition, issue) => { if (!condition) issues.push(issue); };

assert(audit.schema_version === "blockout-video-parity-runtime-projection-audit-101-200-v1", "audit_schema_drift");
assert(audit.solver_run === false, "solver_must_remain_not_run");
assert(audit.summary?.level_count === 100, "runtime_level_count_not_100");
assert(JSON.stringify(audit.summary?.solver_verified_runtime_repair_level_ids)
  === JSON.stringify(["Lv103", "Lv105", "Lv106", "Lv107", "Lv108", "Lv112", "Lv114", "Lv115", "Lv116", "Lv117", "Lv124", "Lv127", "Lv130", "Lv150", "Lv152", "Lv156", "Lv158", "Lv187", "Lv193"]), "solver_verified_runtime_repair_ids_drift");
assert(Array.isArray(audit.solver_verified_runtime_repairs)
  && audit.solver_verified_runtime_repairs.length === 19, "solver_verified_runtime_repair_count_drift");
for (const repair of audit.solver_verified_runtime_repairs ?? []) {
  assert(repair.exit_colors_unique === true, `${repair.level_id}:exit_colours_not_unique`);
  assert(repair.maximum_opening_same_color_component_size <= 2, `${repair.level_id}:opening_colour_cluster`);
  assert(repair.verification?.minimum_drags > 0, `${repair.level_id}:missing_solver_witness`);
  assert(Boolean(repair.evidence), `${repair.level_id}:missing_solver_evidence`);
  if (["Lv103", "Lv105", "Lv107", "Lv108", "Lv112", "Lv114", "Lv115", "Lv116", "Lv117", "Lv124", "Lv150", "Lv152", "Lv156", "Lv158", "Lv187", "Lv193"].includes(repair.level_id)) {
    if (repair.level_id !== "Lv150") assert(Array.isArray(repair.route)
      && repair.route.length === repair.verification.minimum_drags, `${repair.level_id}:solver_route_drift`);
    assert(repair.puzzle_model_replay?.complete === true, `${repair.level_id}:replay_not_complete`);
    assert(repair.puzzle_model_replay?.finalMoves === repair.verification.minimum_drags, `${repair.level_id}:replay_move_drift`);
    assert(repair.puzzle_model_replay?.remainingBlocks === 0, `${repair.level_id}:replay_blocks_remain`);
    assert(repair.puzzle_model_replay?.remainingQueuedBlocks === 0, `${repair.level_id}:replay_queue_remains`);
    assert(typeof repair.evidence_sha256 === "string"
      && /^[0-9A-F]{64}$/.test(repair.evidence_sha256), `${repair.level_id}:evidence_sha_missing`);
  }
  if (repair.level_id === "Lv107") {
    assert(repair.evidence_sha256 === "DACBDA97F95358B44CFDA6B4CDF3397CDD762794E43121721E70846E38B944F5",
      "Lv107:evidence_sha_drift");
    assert(repair.generated_source_semantic_sha256 === "2D1A4E3BA2936C290D5E338CFABB179DB0E546DD26B3EBAC076697466518D9D8",
      "Lv107:source_semantic_sha_drift");
    assert(repair.generated_target_semantic_sha256 === "F75E66E60CBB97A0F9E2D7249D7CBFE6BA87AAF25F509C92A3A5C198CF559669",
      "Lv107:target_semantic_sha_drift");
    assert(repair.verification?.explored_states === 46
      && repair.verification?.minimum_drags === 22
      && repair.verification?.clear_load === 18
      && repair.verification?.reposition_overhead === 4
      && repair.verification?.grid_steps === 65
      && repair.verification?.turns === 7,
    "Lv107:solver_metrics_drift");
    assert(repair.preservation_contract
      && Object.values(repair.preservation_contract).every((preserved) => preserved === true),
    "Lv107:preservation_contract_drift");
  }
  if (["Lv103", "Lv116"].includes(repair.level_id)) {
    const expected = repair.level_id === "Lv103" ? {
      candidate: "lv103-shutter20-to15-progressive-gates-a",
      source: "5CA0A164FDB2C9AB34807690386093DD3E2790A2632513AD8D83E51B84924F5B",
      target: "FC36C2DF7851C2FDC8BB4423C8F280219DD0F2940A265D4EF1E08CDC13369C01",
      evidence: "4CC5DADB37390194DFC2E08B51075B747986DD908626A2B9201DF5C692AD1559",
      states: 26, drags: 20, clearLoad: 19, overhead: 1, steps: 78, turns: 10,
    } : {
      candidate: "lv116-manual-progressive-gates-a",
      source: "AD1702A023807D4AE6F6745B30E99064E362AF75738F218F106D9A242B597A7A",
      target: "19BD93527313CCA18E7024DD3C6A5B8C59B98D0C7162A31EDB10C0D966F26162",
      evidence: "C88A742C92E5355D90608736C06DB26015B71A57F12B6D3C7721D4EB72730755",
      states: 24, drags: 23, clearLoad: 22, overhead: 1, steps: 110, turns: 19,
    };
    assert(repair.candidate_id === expected.candidate, `${repair.level_id}:candidate_drift`);
    assert(repair.generated_source_semantic_sha256 === expected.source,
      `${repair.level_id}:source_semantic_sha_drift`);
    assert(repair.generated_target_semantic_sha256 === expected.target,
      `${repair.level_id}:target_semantic_sha_drift`);
    assert(repair.evidence_sha256 === expected.evidence, `${repair.level_id}:evidence_sha_drift`);
    assert(repair.integration_manifest?.path
      === "playtest-results/experiments/aperture-duplicate-cluster-lv103-lv116-r1/patch-manifest.json",
    `${repair.level_id}:repair_manifest_missing`);
    assert(repair.integration_manifest?.sha256
      === "E48898871B5587EF89898627E5A53280F436B6400AD67F1E104BC0B5CCC7E938",
    `${repair.level_id}:repair_manifest_sha_drift`);
    assert(repair.integration_manifest?.report?.sha256
      === "0FFC8FA5384B77A32EEB471777F4BED0F0A551D8D59624722B9850DDE1248B43",
    `${repair.level_id}:repair_report_sha_drift`);
    assert(repair.verification?.max_states === 20_000
      && repair.verification?.explored_states === expected.states
      && repair.verification?.minimum_drags === expected.drags
      && repair.verification?.clear_load === expected.clearLoad
      && repair.verification?.reposition_overhead === expected.overhead
      && repair.verification?.grid_steps === expected.steps
      && repair.verification?.turns === expected.turns,
    `${repair.level_id}:solver_metrics_drift`);
    assert(repair.preservation_contract
      && Object.values(repair.preservation_contract).every((preserved) => preserved === true),
    `${repair.level_id}:preservation_contract_drift`);
    if (repair.level_id === "Lv103") {
      assert(JSON.stringify(repair.shutter_updates) === JSON.stringify({
        "lv103-cover-02": { source: { count: 20 }, target: { count: 15 } },
      }), "Lv103:shutter_patch_drift");
      assert(repair.minimal_counter_relaxation?.mathematical_upper_bound_before_unlock === 15
        && repair.minimal_counter_relaxation?.source_value === 20
        && repair.minimal_counter_relaxation?.target_value === 15,
      "Lv103:mathematical_counter_relaxation_drift");
    }
  }
  if (["Lv114", "Lv115"].includes(repair.level_id)) {
    assert(repair.integration_manifest?.path
      === "playtest-results/experiments/solvability-repair-batch-01/exact-deadlock-formal-integration-manifest.json",
    `${repair.level_id}:integration_manifest_missing`);
    assert(typeof repair.integration_manifest?.sha256 === "string"
      && /^[0-9A-F]{64}$/.test(repair.integration_manifest.sha256), `${repair.level_id}:integration_manifest_sha_missing`);
  }
  if (repair.level_id === "Lv105") {
    assert(repair.integration_manifest?.path
      === "playtest-results/experiments/recolor-exit-block-repair-lv103-109/stage2-patch-manifest.json",
    "Lv105:stage2_manifest_missing");
    assert(repair.integration_manifest?.sha256
      === "CC7079ACCA3E3863767141626EA3CC9A8802A4465747355087CAFEACEEB137F6",
    "Lv105:stage2_manifest_sha_drift");
    assert(repair.integration_manifest?.independent_verification?.sha256
      === "622344DAF81B00EB64FA5433A9B83DD6F25C638DAAFDB054068B312B3B91FEA9",
    "Lv105:independent_verification_sha_drift");
    assert(repair.source_semantic_sha256
      === "5176D6F5F8387E586CE41D3648B299283EE23D9F63EBD0D8E25E12D4DA0607B4",
    "Lv105:source_semantic_sha_drift");
    assert(repair.target_semantic_sha256
      === "C84834A692B3783FEA2DF1C7D678A1E8FE8269DBB2FD077BD8756515AC0D11DC",
    "Lv105:target_semantic_sha_drift");
    assert(repair.generated_source_semantic_sha256 === repair.source_semantic_sha256,
      "Lv105:generated_source_semantic_sha_drift");
    assert(repair.generated_target_semantic_sha256 === repair.target_semantic_sha256,
      "Lv105:generated_target_semantic_sha_drift");
    assert(repair.preservation_contract
      && Object.values(repair.preservation_contract).every((preserved) => preserved === true),
    "Lv105:preservation_contract_drift");
    assert(repair.verification?.explored_states === 113
      && repair.verification?.minimum_drags === 19
      && repair.verification?.clear_load === 15
      && repair.verification?.reposition_overhead === 4,
    "Lv105:solver_metrics_drift");
  }
  if (repair.level_id === "Lv117") {
    assert(repair.integration_manifest?.path
      === "playtest-results/experiments/recolor-exit-geometry-repair-lv113-123/patch-manifest.json",
    "Lv117:repair_manifest_missing");
    assert(repair.integration_manifest?.sha256
      === "5755C896DD80D9C0F2E135D004D58E79D1F9AA901DB0F0712435D75ECF9B1DBA",
    "Lv117:repair_manifest_sha_drift");
    assert(repair.evidence_sha256
      === "07487C959522A1DB3FB3E7247ABDC845D9F9699CC9A033A945891CD872572F6F",
    "Lv117:evidence_sha_drift");
    assert(repair.generated_source_semantic_sha256
      === "0626E45277DE7CD3351E4390ADFEDE611368921DB5A38FC6EC14555CCF46730B",
    "Lv117:source_semantic_sha_drift");
    assert(repair.generated_target_semantic_sha256
      === "ACE507EAC6D6A3972905F0D7AC24F71256CD5BD71A7F172EBDFDFD2583A6B4C5",
    "Lv117:target_semantic_sha_drift");
    assert(repair.preservation_contract
      && Object.values(repair.preservation_contract).every((preserved) => preserved === true),
    "Lv117:preservation_contract_drift");
    assert(repair.verification?.explored_states === 1_687
      && repair.verification?.minimum_drags === 29
      && repair.verification?.clear_load === 22
      && repair.verification?.reposition_overhead === 7,
    "Lv117:solver_metrics_drift");
  }
  if (["Lv108", "Lv112"].includes(repair.level_id)) {
    const expected = repair.level_id === "Lv108" ? {
      source: "F1AE54E02706BE2F638496B3C46421C0DF30747DA0E1BFF22AC015154E84590B",
      target: "B9A18B2D93FBDB6DCEE849CA083A1F3AD3E2E3BE330AD353FF66ED684404A219",
      evidence: "7373C632272E741487B313E40556B2D611E01718B9AC6BECA5AE80160134A760",
      states: 569, clearLoad: 15, overhead: 5, steps: 87, turns: 19,
    } : {
      source: "3BDE26D07BA762C0A49947BAA37C612C76381BDC995E9EF975BF9933F5124DEC",
      target: "1DAFF6FB1611A549C2BAA9CE2FE18DD1E32B1796ACE4DE02D37E37DBDE0EE0A4",
      evidence: "ACA37A2C872186BBD82C3C7F5F1818139AEB41398B2CFE0D6112C8B7DBDACCFE",
      states: 35, clearLoad: 18, overhead: 2, steps: 79, turns: 6,
    };
    assert(repair.integration_manifest?.path
      === "playtest-results/experiments/high-exit-reduction-lv101-134-r1/patch-manifest.json",
    `${repair.level_id}:high_exit_manifest_missing`);
    assert(repair.integration_manifest?.sha256
      === "1515B4F5C24E5FEB55F3208EA02463596D287B366D5E367D20AD23E368632DCE",
    `${repair.level_id}:high_exit_manifest_sha_drift`);
    assert(repair.integration_manifest?.report?.sha256
      === "0EF0C8211593838EB243046E16D125EBC4B60CD1A0C36442AA2CEA5B369217B0",
    `${repair.level_id}:high_exit_report_sha_drift`);
    assert(repair.evidence_sha256 === expected.evidence, `${repair.level_id}:high_exit_evidence_sha_drift`);
    assert(repair.generated_source_semantic_sha256 === expected.source,
      `${repair.level_id}:high_exit_source_semantic_sha_drift`);
    assert(repair.generated_target_semantic_sha256 === expected.target,
      `${repair.level_id}:high_exit_target_semantic_sha_drift`);
    assert(repair.source_exit_count > 8 && repair.target_exit_count === 8,
      `${repair.level_id}:high_exit_count_drift`);
    assert(repair.preservation_contract
      && Object.values(repair.preservation_contract).every((preserved) => preserved === true),
    `${repair.level_id}:high_exit_preservation_contract_drift`);
    assert(repair.verification?.max_states === 2_000
      && repair.verification?.explored_states === expected.states
      && repair.verification?.minimum_drags === 20
      && repair.verification?.clear_load === expected.clearLoad
      && repair.verification?.reposition_overhead === expected.overhead
      && repair.verification?.grid_steps === expected.steps
      && repair.verification?.turns === expected.turns,
    `${repair.level_id}:high_exit_solver_metrics_drift`);
  }
  if (repair.level_id === "Lv124") {
    assert(repair.integration_manifest?.path
      === "playtest-results/experiments/recolor-exit-geometry-repair-lv124-133/patch-manifest.json",
    "Lv124:repair_manifest_missing");
    assert(repair.integration_manifest?.sha256
      === "E06DBD2EB412E4D89DDF3CF17CD1FFADD9F3FD3E29196E11638CFEFBF1EDCEE5",
    "Lv124:repair_manifest_sha_drift");
    assert(repair.integration_manifest?.report?.sha256
      === "4A55190D6D9ED202362D60E5B491D0BD15E20733E56C2F9E495205F737C19202",
    "Lv124:repair_report_sha_drift");
    assert(repair.evidence_sha256
      === "80A360F8DC65D70B9135A74AAF1FA7FEE5DCF67968E6C840F50BDB7575C07193",
    "Lv124:evidence_sha_drift");
    assert(repair.generated_source_semantic_sha256
      === "0B6E7EA73C8C166FA23B058AB3A8C36871E7A537866C41CBE38B97EF27415D8E",
    "Lv124:source_semantic_sha_drift");
    assert(repair.generated_target_semantic_sha256
      === "40B69F0B40BED11B569DD094F675873BB0BBC89D14CA5FB2ACBB5A2DEB44145B",
    "Lv124:target_semantic_sha_drift");
    assert(repair.preservation_contract
      && Object.values(repair.preservation_contract).every((preserved) => preserved === true),
    "Lv124:preservation_contract_drift");
    assert(repair.maximum_opening_same_color_component_size === 2,
      "Lv124:opening_colour_cluster_drift");
    assert(repair.verification?.explored_states === 256
      && repair.verification?.minimum_drags === 38
      && repair.verification?.clear_load === 26
      && repair.verification?.reposition_overhead === 12
      && repair.verification?.grid_steps === 161
      && repair.verification?.turns === 32,
    "Lv124:solver_metrics_drift");
  }
  if (repair.level_id === "Lv150") {
    assert(repair.evidence_sha256 === "675E36DE4C2C491916F42308742B786192C1C5215B7D434E0EE58F26ABD79B97",
      "Lv150:evidence_sha_drift");
    assert(repair.generated_source_semantic_sha256 === "D064CF5C59C98A6A57365A5527F69591B4C44DCDA80E01BE75E2096E4E8158A9",
      "Lv150:source_semantic_sha_drift");
    assert(repair.generated_target_semantic_sha256 === "7DFECD2E8BED19D2F887B78F8E146DD8EF66096A7657F7B5564443F337301004",
      "Lv150:target_semantic_sha_drift");
    assert(repair.minimal_counter_relaxation?.absolute_delta === 1
      && repair.minimal_counter_relaxation?.changed_counter_count === 1,
    "Lv150:minimal_counter_contract_drift");
    assert(repair.preservation_contract
      && Object.values(repair.preservation_contract).every((preserved) => preserved === true),
    "Lv150:preservation_contract_drift");
  }
  if (["Lv187", "Lv193"].includes(repair.level_id)) {
    const expected = repair.level_id === "Lv187" ? {
      source: "B9392582AC8D661D67FB612FCEBF30AE3657A653A80A37AE294FD60D8E0ABD28",
      target: "CD0D928BA42316517461C0F471FB93BE2A25A6EF7CB3810A008565BCB3782BA7",
      evidence: "9B12F9B70648B43BD51CE42FB1135F01C3773B0F308F9F941F9642B04C9FB4B2",
      exits: 6, maxStates: 20_000, states: 27, drags: 22, clearLoad: 21, overhead: 1, steps: 85, turns: 16,
    } : {
      source: "11742943B06CA12E234E49DA0C0B67D58E2FA90170D2FEDC978A16A9E9E3236E",
      target: "D5C5D2464A747B28C5D1F3AA76D701B852B9C000BC05A608B30B5D5E40E884AC",
      evidence: "F4652E7A67BF1A4A659676ED792CC6736E392D4580149E03B7C15D9A68F577B5",
      exits: 7, maxStates: 2_000, states: 20, drags: 16, clearLoad: 15, overhead: 1, steps: 51, turns: 8,
    };
    assert(repair.integration_manifest?.path
      === "playtest-results/experiments/overlap-high-exit-repair-lv128-193-r1/patch-manifest.json",
    `${repair.level_id}:overlap_manifest_missing`);
    assert(repair.integration_manifest?.sha256
      === "BAA750BB7B39FE9646B58151AD62B34CCC1E2F250BF281778CA04E307911E1A4",
    `${repair.level_id}:overlap_manifest_sha_drift`);
    assert(repair.integration_manifest?.report?.sha256
      === "0915896B4CDFCBF87F0FB9601486BBFBA68D4067F8230ABFDFE9BF0DC5ECA917",
    `${repair.level_id}:overlap_report_sha_drift`);
    assert(repair.evidence_sha256 === expected.evidence, `${repair.level_id}:overlap_evidence_sha_drift`);
    assert(repair.generated_source_semantic_sha256 === expected.source,
      `${repair.level_id}:overlap_source_semantic_sha_drift`);
    assert(repair.generated_target_semantic_sha256 === expected.target,
      `${repair.level_id}:overlap_target_semantic_sha_drift`);
    assert(repair.source_exit_count === expected.exits && repair.target_exit_count === expected.exits,
      `${repair.level_id}:overlap_exit_count_drift`);
    assert(repair.preservation_contract
      && Object.values(repair.preservation_contract).every((preserved) => preserved === true),
    `${repair.level_id}:overlap_preservation_contract_drift`);
    assert(repair.verification?.max_states === expected.maxStates
      && repair.verification?.explored_states === expected.states
      && repair.verification?.minimum_drags === expected.drags
      && repair.verification?.clear_load === expected.clearLoad
      && repair.verification?.reposition_overhead === expected.overhead
      && repair.verification?.grid_steps === expected.steps
      && repair.verification?.turns === expected.turns,
    `${repair.level_id}:overlap_solver_metrics_drift`);
  }
}
assert(JSON.stringify(audit.summary?.source_missing_level_ids) === JSON.stringify(["Lv190", "Lv191"]), "source_missing_ids_drift");
assert(Array.isArray(audit.summary?.unsupported_runtime_mechanism_level_ids)
  && audit.summary.unsupported_runtime_mechanism_level_ids.length === 0, "supported_new_mechanism_left_unprojected");
assert(Array.isArray(audit.levels) && audit.levels.length === 100, "audit_level_records_not_100");
for (const [index, level] of (audit.levels ?? []).entries()) {
  const expected = `Lv${index + 101}`;
  assert(level.level_id === expected, `${expected}:audit_id_drift`);
  assert(level.solver_run === false, `${expected}:solver_status_drift`);
  assert(level.invariants?.playable_cell_count === level.invariants?.source_full_block_count
    || level.invariants?.playable_cell_count > 0, `${expected}:invalid_playable_count`);
  for (const cover of level.covers ?? []) {
    assert(Boolean(cover.region_provenance), `${expected}:${cover.cover_id}:missing_region_evidence`);
    if (cover.runtime_skin === "staging") {
      assert(Boolean(cover.downgrade_reason), `${expected}:${cover.cover_id}:missing_nonspatial_reason`);
    }
  }
}

const run = (command, args) => spawnSync(command, args, {
  cwd: root,
  encoding: "utf8",
  shell: false,
  stdio: "pipe",
});
const deterministic = run(process.execPath, ["tools/build-video-parity-runtime-levels-101-200.mjs", "--check"]);
if (deterministic.status !== 0) issues.push(`deterministic_build_check_failed:\n${deterministic.stdout}\n${deterministic.stderr}`);
const tests = run(process.execPath, ["node_modules/vitest/vitest.mjs", "run", "tests/videoParityRuntimeLevels101To200.test.ts"]);
if (tests.status !== 0) issues.push(`runtime_projection_test_failed:\n${tests.stdout}\n${tests.stderr}`);

console.log(JSON.stringify({
  status: issues.length ? "FAIL" : "PASS",
  revision: audit.revision,
  level_count: audit.summary?.level_count,
  validate_level_count: issues.length ? null : 100,
  mask_adjustment_level_count: audit.summary?.mask_adjustment_level_count,
  nonspatial_cover_fallback_count: audit.summary?.nonspatial_cover_fallback_count,
  design_fill_evidence_count: audit.summary?.design_fill_evidence_count,
  unsupported_runtime_mechanism_level_ids: audit.summary?.unsupported_runtime_mechanism_level_ids,
  source_unresolved_contract_level_ids: audit.summary?.source_unresolved_contract_level_ids,
  source_unresolved_contract_count: audit.summary?.source_unresolved_contract_count,
  solver_run: audit.solver_run,
  issue_count: issues.length,
  issues,
}, null, 2));
if (issues.length) process.exitCode = 1;
