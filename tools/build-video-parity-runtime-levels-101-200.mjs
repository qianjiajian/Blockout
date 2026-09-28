import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { constants as zlibConstants, deflateRawSync } from "node:zlib";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = resolve(root, "deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-formal-candidates-v1.json");
const outputPath = resolve(root, "src/core/videoParityLevels101To200.generated.ts");
const auditPath = resolve(root, "deliverables/level-generation-blueprint/blockout-lv101-lv200-runtime-projection-v1-audit.json");
const checkOnly = process.argv.includes("--check");
const refreshRuntimeRepairEvidence = process.argv.includes("--refresh-runtime-repair-evidence");
const refreshRuntimeRepairInputPath = resolve(root, ".codex-temp/video-parity-runtime-repair-refresh-input.json");

const REVISION = "lv101-200-runtime-projection-v1";
const COLORS = ["red", "blue", "green", "yellow", "purple", "orange", "pink", "cyan"];
const SIDES = ["top", "right", "bottom", "left"];
const keyOf = (x, y) => `${x},${y}`;
const compareText = (left, right) => left.localeCompare(right, "en");
const asArray = (value) => Array.isArray(value) ? value : [];
const isPositiveInteger = (value) => Number.isInteger(value) && value > 0;
const isInteger = (value) => Number.isInteger(value);
const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const canonical = (value) => {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort(compareText).map((key) => [key, canonical(value[key])]));
};
const same = (left, right) => JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
const pointSort = ([ax, ay], [bx, by]) => ay - by || ax - bx;

const physicalShutterRecertificationManifestPath = "playtest-results/experiments/physical-shutter-runtime-recertification-2026-09-20/manifest.json";
const physicalShutterRecertificationManifestExpectedSha256 = "95FF4D6C00E448714FF4AD17333DB30C61C8CFF8C3C71B5FBF5E83BFD528CFBA";
const physicalShutterRecertificationManifestText = (await readFile(
  resolve(root, physicalShutterRecertificationManifestPath),
  "utf8",
)).replace(/^\uFEFF/, "");
const physicalShutterRecertificationManifestSha256 = sha256(physicalShutterRecertificationManifestText);
if (physicalShutterRecertificationManifestSha256 !== physicalShutterRecertificationManifestExpectedSha256) {
  throw new Error("Physical-shutter runtime repair recertification manifest SHA drifted");
}
const physicalShutterRecertificationManifest = JSON.parse(physicalShutterRecertificationManifestText);
if (physicalShutterRecertificationManifest.schema_version !== "blockout-physical-shutter-runtime-recertification-v1"
  || physicalShutterRecertificationManifest.contract?.normal_builder_sha_gates_bypassed !== false
  || physicalShutterRecertificationManifest.contract?.evidence_refresh_input_was_explicit !== true
  || physicalShutterRecertificationManifest.contract?.preserves_formal_physical_shutter_footprints_and_cohorts !== true
  || physicalShutterRecertificationManifest.level_count !== physicalShutterRecertificationManifest.levels?.length) {
  throw new Error("Physical-shutter runtime repair recertification contract drifted");
}
const physicalShutterRecertificationByLevelId = new Map(
  physicalShutterRecertificationManifest.levels.map((record) => [record.level_id, record]),
);

const sourceText = (await readFile(sourcePath, "utf8")).replace(/^\uFEFF/, "");
const source = JSON.parse(sourceText);
if (source.schema_version !== "blockout-video-parity-formal-candidates-101-200-v1") {
  throw new Error(`Unexpected candidate schema ${String(source.schema_version)}`);
}

const loadRuntimeRepairEvidence = async (path, candidateId, levelId) => {
  const absolutePath = resolve(root, path);
  const text = (await readFile(absolutePath, "utf8")).replace(/^\uFEFF/, "");
  const parsed = JSON.parse(text);
  if (parsed.candidate?.id !== candidateId || parsed.candidate?.levelId !== levelId) {
    throw new Error(`${candidateId}: solver evidence identity drifted`);
  }
  if (parsed.termination !== "solved" || parsed.solved !== true || parsed.replay?.complete !== true) {
    throw new Error(`${candidateId}: solver evidence is not solved with complete PuzzleModel replay`);
  }
  if (parsed.validateLevel !== "pass" || parsed.uniqueExitColorsPass !== true
    || parsed.contactRulePass !== true || parsed.staticUnsatReasons?.length
    || parsed.unsupportedReasons?.length) {
    throw new Error(`${candidateId}: solver evidence constraints drifted`);
  }
  return { path, sha256: sha256(text), parsed };
};

const lv152RepairEvidence = await loadRuntimeRepairEvidence(
  "playtest-results/experiments/solvability-repair-batch-01/lv152-local-n-states-20000.json",
  "lv152-local-n",
  152,
);
const lv156RepairEvidence = await loadRuntimeRepairEvidence(
  "playtest-results/experiments/solvability-repair-batch-01/lv156-local-b-states-20000.json",
  "lv156-local-b",
  156,
);
const lv158RepairEvidence = await loadRuntimeRepairEvidence(
  "playtest-results/experiments/solvability-repair-batch-01/lv158-local-d-states-20000.json",
  "lv158-local-d",
  158,
);

const exactDeadlockManifestPath = "playtest-results/experiments/solvability-repair-batch-01/exact-deadlock-formal-integration-manifest.json";
const exactDeadlockManifestText = (await readFile(resolve(root, exactDeadlockManifestPath), "utf8")).replace(/^\uFEFF/, "");
const exactDeadlockManifest = JSON.parse(exactDeadlockManifestText);
if (exactDeadlockManifest.schema_version !== "blockout-exact-deadlock-formal-integration-manifest-v1") {
  throw new Error(`Unexpected exact-deadlock manifest schema ${String(exactDeadlockManifest.schema_version)}`);
}

const buildExactDeadlockManifestRepair = async (levelId) => {
  const record = exactDeadlockManifest.levels.find((level) => level.level_id === levelId);
  if (!record) throw new Error(`Missing Lv${levelId} in exact-deadlock integration manifest`);
  const evidenceRecords = await Promise.all(record.evidence.map(async (evidence) => {
    const text = (await readFile(resolve(root, evidence.path), "utf8")).replace(/^\uFEFF/, "");
    const actualSha256 = sha256(text);
    if (actualSha256 !== evidence.sha256) {
      throw new Error(`Lv${levelId}: evidence SHA drifted for ${evidence.path}`);
    }
    return { ...evidence, actual_sha256: actualSha256, text };
  }));
  const primary = evidenceRecords.find((evidence) => evidence.role === "final-certified-experiment-report");
  if (!primary) throw new Error(`Lv${levelId}: missing final certified experiment report`);
  const primaryReport = JSON.parse(primary.text);
  const route = primaryReport.solver?.drags;
  const solver = record.solver_and_replay;
  if (!Array.isArray(route) || route.length !== solver.minimum_drags
    || solver.termination !== "solved" || solver.solved !== true
    || solver.puzzle_model_replay?.complete !== true
    || solver.puzzle_model_replay?.replayed_drags !== solver.minimum_drags) {
    throw new Error(`Lv${levelId}: manifest solver/replay certificate drifted`);
  }
  const playablePatch = record.patches.find((patch) => patch.entity_type === "playable");
  const entityPatches = (entityType) => Object.fromEntries(record.patches
    .filter((patch) => patch.entity_type === entityType)
    .map((patch) => [patch.entity_id, { source: patch.source, target: patch.target }]));
  return {
    level_id: levelId,
    candidate_id: `lv${levelId}-exact-deadlock-repair`,
    remove_exit_ids: [],
    playable_update: playablePatch ? { source: playablePatch.source, target: playablePatch.target } : null,
    exit_updates: entityPatches("gate"),
    block_updates: entityPatches("block"),
    generator_updates: entityPatches("generator"),
    verification: {
      max_states: solver.max_states,
      minimum_drags: solver.minimum_drags,
      clear_load: solver.clear_load,
      reposition_overhead: solver.reposition_overhead,
      explored_states: solver.explored_states,
      grid_steps: solver.grid_steps,
      turns: solver.turns,
    },
    route,
    puzzle_model_replay: {
      attempted: true,
      complete: solver.puzzle_model_replay.complete,
      error: null,
      finalMoves: solver.puzzle_model_replay.replayed_drags,
      remainingBlocks: solver.puzzle_model_replay.remaining_blocks,
      remainingQueuedBlocks: solver.puzzle_model_replay.queued_blocks,
    },
    evidence: primary.path,
    evidence_sha256: primary.sha256,
    evidence_records: evidenceRecords.map(({ text: _text, ...evidence }) => evidence),
    integration_manifest: {
      path: exactDeadlockManifestPath,
      sha256: sha256(exactDeadlockManifestText),
      target_level_spec_semantic_sha256: record.target_level_spec_semantic_sha256,
    },
  };
};

const lv114ExactDeadlockRepair = await buildExactDeadlockManifestRepair(114);
const lv115ExactDeadlockRepair = await buildExactDeadlockManifestRepair(115);

const lv105Stage2ManifestPath = "playtest-results/experiments/recolor-exit-block-repair-lv103-109/stage2-patch-manifest.json";
const lv105Stage2ManifestExpectedSha256 = "CC7079ACCA3E3863767141626EA3CC9A8802A4465747355087CAFEACEEB137F6";
const lv105Stage2ManifestText = (await readFile(resolve(root, lv105Stage2ManifestPath), "utf8")).replace(/^\uFEFF/, "");
const lv105Stage2ManifestSha256 = sha256(lv105Stage2ManifestText);
if (lv105Stage2ManifestSha256 !== lv105Stage2ManifestExpectedSha256) {
  throw new Error(`Lv105: stage2 manifest SHA drifted (${lv105Stage2ManifestSha256})`);
}
const lv105Stage2Manifest = JSON.parse(lv105Stage2ManifestText);
const lv105AcceptedIds = lv105Stage2Manifest.levels
  .filter((level) => level.accepted_for_formal_integration === true)
  .map((level) => level.level_id);
if (!same(lv105AcceptedIds, [105]) || !same(lv105Stage2Manifest.summary?.accepted_experimental_candidates, [105])) {
  throw new Error(`Lv105: stage2 manifest accepted-level contract drifted`);
}
const lv105Stage2Record = lv105Stage2Manifest.levels.find((level) => level.level_id === 105);
if (!lv105Stage2Record || lv105Stage2Record.accepted_for_formal_integration !== true
  || lv105Stage2Record.constraints?.validate_level !== "pass"
  || lv105Stage2Record.constraints?.unique_exit_colors !== true
  || lv105Stage2Record.constraints?.opening_same_color_component_max_blocks > 2
  || lv105Stage2Record.constraints?.static_unsat_reasons?.length
  || lv105Stage2Record.constraints?.unsupported_reasons?.length
  || lv105Stage2Record.constraints?.board_size_block_count_shapes_mechanism_counts_and_counters_preserved !== true) {
  throw new Error(`Lv105: stage2 manifest acceptance constraints drifted`);
}

const lv105EvidencePath = `playtest-results/experiments/recolor-exit-block-repair-lv103-109/${lv105Stage2Record.evidence_file}`;
const lv105EvidenceText = (await readFile(resolve(root, lv105EvidencePath), "utf8")).replace(/^\uFEFF/, "");
const lv105Evidence = JSON.parse(lv105EvidenceText);
const lv105VerificationPath = "playtest-results/experiments/recolor-exit-block-repair-lv103-109/stage2-lv105-manifest-verification.json";
const lv105VerificationText = (await readFile(resolve(root, lv105VerificationPath), "utf8")).replace(/^\uFEFF/, "");
const lv105Verification = JSON.parse(lv105VerificationText);
if (lv105Evidence.level_id !== 105 || lv105Evidence.candidate_id !== "lv105-second-g1-offset-4-size-2"
  || lv105Evidence.source_semantic_sha256 !== lv105Stage2Record.source_semantic_sha256
  || lv105Evidence.target_semantic_sha256 !== lv105Stage2Record.target_semantic_sha256
  || lv105Evidence.validate_level !== "pass" || lv105Evidence.unique_exit_colors_pass !== true
  || lv105Evidence.opening_cluster_pass !== true || lv105Evidence.static_unsat_reasons?.length
  || lv105Evidence.unsupported_reasons?.length || lv105Evidence.termination !== "solved"
  || lv105Evidence.solved !== true || lv105Evidence.explored_states !== 113
  || lv105Evidence.minimum_drags !== 19 || lv105Evidence.clear_load !== 15
  || lv105Evidence.reposition_overhead !== 4 || lv105Evidence.puzzle_model_replay?.complete !== true
  || lv105Evidence.puzzle_model_replay?.final_moves !== 19
  || !same(lv105Evidence.route, lv105Stage2Record.solver?.route)) {
  throw new Error(`Lv105: stage2 solver evidence drifted`);
}
if (lv105Verification.level_id !== 105 || lv105Verification.source_assertions !== "pass"
  || lv105Verification.validate_level !== "pass" || lv105Verification.unique_exit_colors !== "pass"
  || lv105Verification.target_semantic_sha256 !== lv105Stage2Record.target_semantic_sha256
  || lv105Verification.solver?.termination !== "solved" || lv105Verification.solver?.solved !== true
  || lv105Verification.solver?.explored_states !== 113 || lv105Verification.solver?.minimum_drags !== 19
  || lv105Verification.solver?.clear_load !== 15 || lv105Verification.solver?.reposition_overhead !== 4
  || lv105Verification.puzzle_model_replay?.complete !== true
  || lv105Verification.puzzle_model_replay?.final_moves !== 19
  || lv105Verification.puzzle_model_replay?.remaining_blocks !== 0
  || lv105Verification.puzzle_model_replay?.remaining_queued_blocks !== 0) {
  throw new Error(`Lv105: independent manifest verification drifted`);
}

const changedFieldsToPatch = (changes) => ({
  source: Object.fromEntries(Object.entries(changes).map(([field, change]) => [field, change.from])),
  target: Object.fromEntries(Object.entries(changes).map(([field, change]) => [field, change.to])),
});
const lv105Stage2Repair = {
  level_id: 105,
  candidate_id: lv105Evidence.candidate_id,
  remove_exit_ids: [],
  exit_updates: Object.fromEntries(lv105Stage2Record.patch.exit_edits
    .map((edit) => [edit.id, changedFieldsToPatch(edit.changes)])),
  block_updates: Object.fromEntries(lv105Stage2Record.patch.block_edits
    .map((edit) => [edit.id, changedFieldsToPatch(edit.changes)])),
  generator_updates: {},
  verification: {
    max_states: lv105Evidence.max_states,
    minimum_drags: lv105Evidence.minimum_drags,
    clear_load: lv105Evidence.clear_load,
    reposition_overhead: lv105Evidence.reposition_overhead,
    explored_states: lv105Evidence.explored_states,
    solver_elapsed_ms: lv105Evidence.elapsed_ms,
    grid_steps: lv105Evidence.grid_steps,
    turns: lv105Evidence.turns,
  },
  route: lv105Evidence.route,
  puzzle_model_replay: {
    attempted: true,
    complete: true,
    error: null,
    finalMoves: lv105Verification.puzzle_model_replay.final_moves,
    remainingBlocks: lv105Verification.puzzle_model_replay.remaining_blocks,
    remainingQueuedBlocks: lv105Verification.puzzle_model_replay.remaining_queued_blocks,
  },
  evidence: lv105EvidencePath,
  evidence_sha256: sha256(lv105EvidenceText),
  source_semantic_sha256: lv105Stage2Record.source_semantic_sha256,
  target_semantic_sha256: lv105Stage2Record.target_semantic_sha256,
  strict_preservation_contract: true,
  integration_manifest: {
    path: lv105Stage2ManifestPath,
    sha256: lv105Stage2ManifestSha256,
    expected_sha256: lv105Stage2ManifestExpectedSha256,
    source_semantic_sha256: lv105Stage2Record.source_semantic_sha256,
    target_semantic_sha256: lv105Stage2Record.target_semantic_sha256,
    independent_verification: {
      path: lv105VerificationPath,
      sha256: sha256(lv105VerificationText),
    },
  },
};

const lv117RepairManifestPath = "playtest-results/experiments/recolor-exit-geometry-repair-lv113-123/patch-manifest.json";
const lv117RepairManifestExpectedSha256 = "5755C896DD80D9C0F2E135D004D58E79D1F9AA901DB0F0712435D75ECF9B1DBA";
const lv117RepairManifestText = (await readFile(resolve(root, lv117RepairManifestPath), "utf8")).replace(/^\uFEFF/, "");
const lv117RepairManifestSha256 = sha256(lv117RepairManifestText);
if (lv117RepairManifestSha256 !== lv117RepairManifestExpectedSha256) {
  throw new Error(`Lv117: repair manifest SHA drifted (${lv117RepairManifestSha256})`);
}
const lv117RepairManifest = JSON.parse(lv117RepairManifestText);
const lv117RepairRecord = lv117RepairManifest.levels?.find((level) => level.level_id === 117);
if (lv117RepairManifest.schema !== "experimental-solvability-repair-v1"
  || lv117RepairManifest.formal_level_data_modified !== false
  || !same(lv117RepairManifest.accepted_level_ids, [117])
  || !lv117RepairRecord || lv117RepairRecord.accepted_for_formal_integration !== true
  || lv117RepairRecord.classification !== "solved-replay-complete-experimental-candidate"
  || lv117RepairRecord.source_semantic_sha256 !== "0626E45277DE7CD3351E4390ADFEDE611368921DB5A38FC6EC14555CCF46730B"
  || lv117RepairRecord.target_semantic_sha256 !== "ACE507EAC6D6A3972905F0D7AC24F71256CD5BD71A7F172EBDFDFD2583A6B4C5"
  || lv117RepairRecord.contracts?.validation !== "pass"
  || lv117RepairRecord.contracts?.unique_exit_colors !== true
  || lv117RepairRecord.contracts?.opening_same_color_component_max > 2
  || lv117RepairRecord.contracts?.static_unsat_reasons?.length
  || lv117RepairRecord.contracts?.unsupported_reasons?.length
  || !lv117RepairRecord.preservation
  || Object.values(lv117RepairRecord.preservation).some((preserved) => preserved !== true)) {
  throw new Error("Lv117: accepted repair manifest contract drifted");
}

const lv117RepairEvidencePath = "playtest-results/experiments/recolor-exit-geometry-repair-lv113-123/lv117-candidate.json";
const lv117RepairEvidenceExpectedSha256 = "07487C959522A1DB3FB3E7247ABDC845D9F9699CC9A033A945891CD872572F6F";
const lv117RepairEvidenceText = (await readFile(resolve(root, lv117RepairEvidencePath), "utf8")).replace(/^\uFEFF/, "");
const lv117RepairEvidenceSha256 = sha256(lv117RepairEvidenceText);
if (lv117RepairEvidenceSha256 !== lv117RepairEvidenceExpectedSha256) {
  throw new Error(`Lv117: repair evidence SHA drifted (${lv117RepairEvidenceSha256})`);
}
const lv117RepairEvidence = JSON.parse(lv117RepairEvidenceText);
if (lv117RepairEvidence.level_id !== 117
  || lv117RepairEvidence.accepted_for_formal_integration !== true
  || lv117RepairEvidence.source_semantic_sha256 !== lv117RepairRecord.source_semantic_sha256
  || lv117RepairEvidence.target_semantic_sha256 !== lv117RepairRecord.target_semantic_sha256
  || !same(lv117RepairEvidence.patch, lv117RepairRecord.patch)
  || lv117RepairEvidence.validation !== "pass"
  || lv117RepairEvidence.unique_exit_colors !== true
  || lv117RepairEvidence.opening_same_color_component_max > 2
  || lv117RepairEvidence.static_unsat_reasons?.length
  || lv117RepairEvidence.unsupported_reasons?.length
  || lv117RepairEvidence.solver?.termination !== "solved"
  || lv117RepairEvidence.solver?.solved !== true
  || lv117RepairEvidence.solver?.explored_states !== 1_687
  || lv117RepairEvidence.solver?.minimum_drags !== 29
  || lv117RepairEvidence.solver?.clear_load !== 22
  || lv117RepairEvidence.solver?.reposition_overhead !== 7
  || lv117RepairEvidence.replay?.complete !== true
  || lv117RepairEvidence.replay?.final_moves !== 29
  || lv117RepairEvidence.replay?.remaining_blocks !== 0
  || lv117RepairEvidence.replay?.remaining_queued_blocks !== 0
  || !same(lv117RepairEvidence.solver?.route, lv117RepairRecord.solver?.route)) {
  throw new Error("Lv117: solver evidence drifted");
}
const lv117RuntimeRepair = {
  level_id: 117,
  candidate_id: "lv117-two-size2-linked-recolor",
  remove_exit_ids: [],
  exit_updates: Object.fromEntries(lv117RepairRecord.patch.exit_edits
    .map((edit) => [edit.id, changedFieldsToPatch(edit.changes)])),
  block_updates: Object.fromEntries(lv117RepairRecord.patch.block_edits
    .map((edit) => [edit.id, changedFieldsToPatch(edit.changes)])),
  generator_updates: {},
  verification: {
    max_states: lv117RepairEvidence.solver.max_states,
    minimum_drags: lv117RepairEvidence.solver.minimum_drags,
    clear_load: lv117RepairEvidence.solver.clear_load,
    reposition_overhead: lv117RepairEvidence.solver.reposition_overhead,
    explored_states: lv117RepairEvidence.solver.explored_states,
    grid_steps: lv117RepairEvidence.solver.grid_steps,
    turns: lv117RepairEvidence.solver.turns,
  },
  route: lv117RepairEvidence.solver.route,
  puzzle_model_replay: {
    attempted: true,
    complete: true,
    error: null,
    finalMoves: lv117RepairEvidence.replay.final_moves,
    remainingBlocks: lv117RepairEvidence.replay.remaining_blocks,
    remainingQueuedBlocks: lv117RepairEvidence.replay.remaining_queued_blocks,
  },
  evidence: lv117RepairEvidencePath,
  evidence_sha256: lv117RepairEvidenceSha256,
  source_semantic_sha256: lv117RepairRecord.source_semantic_sha256,
  target_semantic_sha256: lv117RepairRecord.target_semantic_sha256,
  strict_preservation_contract: true,
  integration_manifest: {
    path: lv117RepairManifestPath,
    sha256: lv117RepairManifestSha256,
    expected_sha256: lv117RepairManifestExpectedSha256,
    source_semantic_sha256: lv117RepairRecord.source_semantic_sha256,
    target_semantic_sha256: lv117RepairRecord.target_semantic_sha256,
    evidence: {
      path: lv117RepairEvidencePath,
      sha256: lv117RepairEvidenceSha256,
    },
  },
};

const lv124RepairManifestPath = "playtest-results/experiments/recolor-exit-geometry-repair-lv124-133/patch-manifest.json";
const lv124RepairManifestExpectedSha256 = "E06DBD2EB412E4D89DDF3CF17CD1FFADD9F3FD3E29196E11638CFEFBF1EDCEE5";
const lv124RepairManifestText = (await readFile(resolve(root, lv124RepairManifestPath), "utf8")).replace(/^\uFEFF/, "");
const lv124RepairManifestSha256 = sha256(lv124RepairManifestText);
if (lv124RepairManifestSha256 !== lv124RepairManifestExpectedSha256) {
  throw new Error(`Lv124: repair manifest SHA drifted (${lv124RepairManifestSha256})`);
}
const lv124RepairReportPath = "playtest-results/experiments/recolor-exit-geometry-repair-lv124-133/final-report.json";
const lv124RepairReportExpectedSha256 = "4A55190D6D9ED202362D60E5B491D0BD15E20733E56C2F9E495205F737C19202";
const lv124RepairReportText = (await readFile(resolve(root, lv124RepairReportPath), "utf8")).replace(/^\uFEFF/, "");
const lv124RepairReportSha256 = sha256(lv124RepairReportText);
if (lv124RepairReportSha256 !== lv124RepairReportExpectedSha256) {
  throw new Error(`Lv124: repair report SHA drifted (${lv124RepairReportSha256})`);
}
const lv124RepairManifest = JSON.parse(lv124RepairManifestText);
const lv124RepairReport = JSON.parse(lv124RepairReportText);
const lv124RepairRecord = lv124RepairManifest.accepted_candidates?.find((level) => level.level_id === 124);
if (lv124RepairManifest.schema_version !== 1
  || lv124RepairManifest.mode !== "experiment-only; no formal level data modified"
  || !same(lv124RepairManifest.scope, [124, 128, 129, 131, 133])
  || !same(lv124RepairManifest.accepted_candidates?.map((level) => level.level_id), [124])
  || !same(lv124RepairManifest.not_accepted?.map((level) => level.level_id), [128, 129, 131, 133])
  || !same(lv124RepairReport.summary?.accepted_for_formal_integration, [124])
  || !same(lv124RepairReport.summary?.inconclusive_max_states_or_resource_limit, [128, 129, 131, 133])
  || !same(lv124RepairReport.accepted_candidates?.[0], lv124RepairRecord)
  || !lv124RepairRecord
  || lv124RepairRecord.source_semantic_sha256 !== "0B6E7EA73C8C166FA23B058AB3A8C36871E7A537866C41CBE38B97EF27415D8E"
  || lv124RepairRecord.target_semantic_sha256 !== "40B69F0B40BED11B569DD094F675873BB0BBC89D14CA5FB2ACBB5A2DEB44145B"
  || lv124RepairRecord.contracts?.validation !== "pass"
  || lv124RepairRecord.contracts?.unique_exit_colors !== true
  || lv124RepairRecord.contracts?.opening_same_color_component_max !== 2
  || lv124RepairRecord.contracts?.static_unsat_reasons?.length
  || lv124RepairRecord.contracts?.unsupported_reasons?.length
  || Object.values(lv124RepairRecord.preservation ?? {}).some((preserved) => preserved !== true)
  || lv124RepairRecord.solver?.termination !== "solved"
  || lv124RepairRecord.solver?.solved !== true
  || lv124RepairRecord.solver?.max_states !== 2_000
  || lv124RepairRecord.solver?.explored_states !== 256
  || lv124RepairRecord.solver?.minimum_drags !== 38
  || lv124RepairRecord.solver?.clear_load !== 26
  || lv124RepairRecord.solver?.reposition_overhead !== 12
  || lv124RepairRecord.solver?.grid_steps !== 161
  || lv124RepairRecord.solver?.turns !== 32
  || lv124RepairRecord.replay?.complete !== true
  || lv124RepairRecord.replay?.final_moves !== 38
  || lv124RepairRecord.replay?.remaining_blocks !== 0
  || lv124RepairRecord.replay?.remaining_queued_blocks !== 0) {
  throw new Error("Lv124: accepted repair manifest/report contract drifted");
}
const lv124RepairEvidencePath = `playtest-results/experiments/recolor-exit-geometry-repair-lv124-133/${lv124RepairRecord.evidence_file}`;
const lv124RepairEvidenceText = (await readFile(resolve(root, lv124RepairEvidencePath), "utf8")).replace(/^\uFEFF/, "");
const lv124RepairEvidenceSha256 = sha256(lv124RepairEvidenceText);
if (lv124RepairEvidenceSha256 !== lv124RepairRecord.evidence_sha256) {
  throw new Error(`Lv124: repair evidence SHA drifted (${lv124RepairEvidenceSha256})`);
}
const lv124RepairEvidence = JSON.parse(lv124RepairEvidenceText);
if (lv124RepairEvidence.level_id !== 124
  || lv124RepairEvidence.accepted_for_formal_integration !== true
  || lv124RepairEvidence.source_semantic_sha256 !== lv124RepairRecord.source_semantic_sha256
  || lv124RepairEvidence.target_semantic_sha256 !== lv124RepairRecord.target_semantic_sha256
  || !same(lv124RepairEvidence.patch, lv124RepairRecord.patch)
  || !same(lv124RepairEvidence.solver, lv124RepairRecord.solver)
  || !same(lv124RepairEvidence.replay, lv124RepairRecord.replay)
  || !same(lv124RepairEvidence.preservation, lv124RepairRecord.preservation)) {
  throw new Error("Lv124: repair evidence drifted from SHA-locked manifest");
}
const lv124RuntimeRepair = {
  level_id: 124,
  candidate_id: "lv124-two-aperture-linked-recolor",
  remove_exit_ids: [],
  exit_updates: Object.fromEntries(lv124RepairRecord.patch.exit_edits
    .map((edit) => [edit.id, changedFieldsToPatch(edit.changes)])),
  block_updates: Object.fromEntries(lv124RepairRecord.patch.block_edits
    .map((edit) => [edit.id, changedFieldsToPatch(edit.changes)])),
  generator_updates: {},
  verification: {
    max_states: lv124RepairEvidence.solver.max_states,
    minimum_drags: lv124RepairEvidence.solver.minimum_drags,
    clear_load: lv124RepairEvidence.solver.clear_load,
    reposition_overhead: lv124RepairEvidence.solver.reposition_overhead,
    explored_states: lv124RepairEvidence.solver.explored_states,
    grid_steps: lv124RepairEvidence.solver.grid_steps,
    turns: lv124RepairEvidence.solver.turns,
  },
  route: lv124RepairEvidence.solver.route,
  puzzle_model_replay: {
    attempted: true,
    complete: true,
    error: null,
    finalMoves: lv124RepairEvidence.replay.final_moves,
    remainingBlocks: lv124RepairEvidence.replay.remaining_blocks,
    remainingQueuedBlocks: lv124RepairEvidence.replay.remaining_queued_blocks,
  },
  evidence: lv124RepairEvidencePath,
  evidence_sha256: lv124RepairEvidenceSha256,
  source_semantic_sha256: lv124RepairRecord.source_semantic_sha256,
  target_semantic_sha256: lv124RepairRecord.target_semantic_sha256,
  strict_preservation_contract: true,
  integration_manifest: {
    path: lv124RepairManifestPath,
    sha256: lv124RepairManifestSha256,
    expected_sha256: lv124RepairManifestExpectedSha256,
    report: {
      path: lv124RepairReportPath,
      sha256: lv124RepairReportSha256,
      expected_sha256: lv124RepairReportExpectedSha256,
    },
    source_semantic_sha256: lv124RepairRecord.source_semantic_sha256,
    target_semantic_sha256: lv124RepairRecord.target_semantic_sha256,
    evidence: {
      path: lv124RepairEvidencePath,
      sha256: lv124RepairEvidenceSha256,
    },
  },
};

const highExitRepairManifestPath = "playtest-results/experiments/high-exit-reduction-lv101-134-r1/patch-manifest.json";
const highExitRepairManifestExpectedSha256 = "1515B4F5C24E5FEB55F3208EA02463596D287B366D5E367D20AD23E368632DCE";
const highExitRepairManifestText = (await readFile(resolve(root, highExitRepairManifestPath), "utf8")).replace(/^\uFEFF/, "");
const highExitRepairManifestSha256 = sha256(highExitRepairManifestText);
if (highExitRepairManifestSha256 !== highExitRepairManifestExpectedSha256) {
  throw new Error(`High-exit repair manifest SHA drifted (${highExitRepairManifestSha256})`);
}
const highExitRepairReportPath = "playtest-results/experiments/high-exit-reduction-lv101-134-r1/final-report.json";
const highExitRepairReportExpectedSha256 = "0EF0C8211593838EB243046E16D125EBC4B60CD1A0C36442AA2CEA5B369217B0";
const highExitRepairReportText = (await readFile(resolve(root, highExitRepairReportPath), "utf8")).replace(/^\uFEFF/, "");
const highExitRepairReportSha256 = sha256(highExitRepairReportText);
if (highExitRepairReportSha256 !== highExitRepairReportExpectedSha256) {
  throw new Error(`High-exit repair report SHA drifted (${highExitRepairReportSha256})`);
}
const highExitRepairManifest = JSON.parse(highExitRepairManifestText);
const highExitRepairReport = JSON.parse(highExitRepairReportText);
if (highExitRepairManifest.schema_version !== 1
  || highExitRepairManifest.mode !== "experiment-only; no formal level data modified"
  || !same(highExitRepairManifest.scope, [101, 108, 111, 112, 134])
  || !same(highExitRepairManifest.accepted_candidates?.map((level) => level.level_id), [108, 112])
  || !same(highExitRepairManifest.not_accepted?.map((level) => level.level_id), [101, 111, 134])
  || !same(highExitRepairReport.summary?.accepted_for_formal_integration, [108, 112])
  || !same(highExitRepairReport.summary?.exact_exhaustion_no_solution, [101])
  || !same(highExitRepairReport.summary?.inconclusive_max_states, [111])
  || !same(highExitRepairReport.summary?.static_contract_blocked, [134])) {
  throw new Error("High-exit repair manifest/report contract drifted");
}

const buildHighExitRuntimeRepair = async (levelId) => {
  const record = highExitRepairManifest.accepted_candidates.find((candidate) => candidate.level_id === levelId);
  const reportRecord = highExitRepairReport.accepted_candidates.find((candidate) => candidate.level_id === levelId);
  if (!record || !same(record, reportRecord)
    || record.status !== "solved-replay-complete-experimental-candidate"
    || record.formal_level_data_modified !== false
    || record.accepted_for_formal_integration !== true
    || record.source_exit_count <= 8 || record.target_exit_count !== 8
    || record.unique_exit_colors !== true
    || record.opening_same_color_component_max > 2
    || record.validation !== "pass" || record.static_unsat_reasons?.length
    || record.unsupported_reasons?.length
    || Object.values(record.preservation ?? {}).some((preserved) => preserved !== true)
    || record.solver?.max_states !== 2_000
    || record.solver?.termination !== "solved" || record.solver?.solved !== true
    || record.replay?.complete !== true || record.replay?.final_moves !== record.solver?.minimum_drags
    || record.replay?.remaining_blocks !== 0 || record.replay?.remaining_queued_blocks !== 0) {
    throw new Error(`Lv${levelId}: high-exit accepted candidate contract drifted`);
  }
  const evidencePath = `playtest-results/experiments/high-exit-reduction-lv101-134-r1/${record.evidence_file}`;
  const evidenceText = (await readFile(resolve(root, evidencePath), "utf8")).replace(/^\uFEFF/, "");
  const evidenceSha256 = sha256(evidenceText);
  const evidence = JSON.parse(evidenceText);
  if (evidenceSha256 !== record.evidence_sha256
    || evidence.level_id !== levelId
    || evidence.source_semantic_sha256 !== record.source_semantic_sha256
    || evidence.target_semantic_sha256 !== record.target_semantic_sha256
    || !same(evidence.patch, record.patch)
    || !same(evidence.solver, record.solver)
    || !same(evidence.replay, record.replay)
    || !same(evidence.preservation, record.preservation)) {
    throw new Error(`Lv${levelId}: high-exit evidence drifted from SHA-locked manifest`);
  }
  return {
    level_id: levelId,
    candidate_id: `lv${levelId}-high-exit-reduction-to-eight`,
    remove_exit_ids: record.patch.removed_exit_ids,
    exit_updates: Object.fromEntries(record.patch.exit_edits
      .map((edit) => [edit.id, changedFieldsToPatch(edit.changes)])),
    block_updates: Object.fromEntries(record.patch.block_edits
      .map((edit) => [edit.id, changedFieldsToPatch(edit.changes)])),
    generator_updates: {},
    verification: {
      max_states: record.solver.max_states,
      minimum_drags: record.solver.minimum_drags,
      clear_load: record.solver.clear_load,
      reposition_overhead: record.solver.reposition_overhead,
      explored_states: record.solver.explored_states,
      grid_steps: record.solver.grid_steps,
      turns: record.solver.turns,
    },
    route: record.solver.route,
    puzzle_model_replay: {
      attempted: true,
      complete: true,
      error: null,
      finalMoves: record.replay.final_moves,
      remainingBlocks: record.replay.remaining_blocks,
      remainingQueuedBlocks: record.replay.remaining_queued_blocks,
    },
    evidence: evidencePath,
    evidence_sha256: evidenceSha256,
    source_semantic_sha256: record.source_semantic_sha256,
    target_semantic_sha256: record.target_semantic_sha256,
    strict_preservation_contract: true,
    normalize_declared_exit_removals_for_preservation: true,
    integration_manifest: {
      path: highExitRepairManifestPath,
      sha256: highExitRepairManifestSha256,
      expected_sha256: highExitRepairManifestExpectedSha256,
      report: {
        path: highExitRepairReportPath,
        sha256: highExitRepairReportSha256,
        expected_sha256: highExitRepairReportExpectedSha256,
      },
      source_semantic_sha256: record.source_semantic_sha256,
      target_semantic_sha256: record.target_semantic_sha256,
      evidence: { path: evidencePath, sha256: evidenceSha256 },
    },
  };
};

const lv108HighExitRuntimeRepair = await buildHighExitRuntimeRepair(108);
const lv112HighExitRuntimeRepair = await buildHighExitRuntimeRepair(112);

const lv150RepairEvidencePath = "playtest-results/experiments/unique-exit-repair/auto-recolor-solver-batch-lv10-lv11-lv150-r1.json";
const lv150RepairEvidenceExpectedSha256 = "675E36DE4C2C491916F42308742B786192C1C5215B7D434E0EE58F26ABD79B97";
const lv150RepairEvidenceText = (await readFile(resolve(root, lv150RepairEvidencePath), "utf8")).replace(/^\uFEFF/, "");
const lv150RepairEvidenceSha256 = sha256(lv150RepairEvidenceText);
if (lv150RepairEvidenceSha256 !== lv150RepairEvidenceExpectedSha256) {
  throw new Error(`Lv150: repair evidence SHA drifted (${lv150RepairEvidenceSha256})`);
}
const lv150RepairEvidence = JSON.parse(lv150RepairEvidenceText);
const lv150RepairRecord = lv150RepairEvidence.patch_manifest?.find((record) => record.level_id === 150);
if (lv150RepairEvidence.schema !== "blockout-auto-recolor-solver-batch-lv10-lv11-lv150-r1"
  || !lv150RepairRecord || lv150RepairRecord.classification !== "solved_replay_complete"
  || lv150RepairRecord.ready_for_formal_integration !== true
  || lv150RepairRecord.source_level_spec_sha256 !== "D064CF5C59C98A6A57365A5527F69591B4C44DCDA80E01BE75E2096E4E8158A9"
  || lv150RepairRecord.target_level_spec_sha256 !== "7DFECD2E8BED19D2F887B78F8E146DD8EF66096A7657F7B5564443F337301004"
  || lv150RepairRecord.checks?.validate_level !== true
  || lv150RepairRecord.checks?.exit_colors_unique !== true
  || lv150RepairRecord.checks?.maximum_opening_same_color_component !== 1
  || lv150RepairRecord.solver?.termination !== "solved"
  || lv150RepairRecord.solver?.explored_states !== 6_121
  || lv150RepairRecord.solver?.minimum_drags !== 21
  || lv150RepairRecord.solver?.clear_load !== 14
  || lv150RepairRecord.solver?.reposition_overhead !== 7
  || lv150RepairRecord.replay?.ok !== true || lv150RepairRecord.replay?.complete !== true) {
  throw new Error("Lv150: accepted solver/replay evidence contract drifted");
}
const lv150RuntimeRepair = {
  level_id: 150,
  candidate_id: "lv150-minimal-carrier-counter-repair",
  remove_exit_ids: [],
  exit_updates: {
    "lv150-gate-02": { source: { color: "yellow" }, target: { color: "pink" } },
    "lv150-gate-01": { source: { frozen: 7 }, target: { frozen: 6 } },
  },
  block_updates: {
    "lv150-opening-b12": { source: { color: "cyan" }, target: { color: "yellow" } },
  },
  verification: {
    max_states: lv150RepairRecord.solver.budget,
    minimum_drags: lv150RepairRecord.solver.minimum_drags,
    clear_load: lv150RepairRecord.solver.clear_load,
    reposition_overhead: lv150RepairRecord.solver.reposition_overhead,
    explored_states: lv150RepairRecord.solver.explored_states,
    grid_steps: lv150RepairRecord.solver.grid_steps,
    turns: lv150RepairRecord.solver.turns,
  },
  puzzle_model_replay: {
    attempted: true,
    complete: true,
    error: null,
    finalMoves: lv150RepairRecord.solver.minimum_drags,
    remainingBlocks: lv150RepairRecord.replay.remaining_blocks,
    remainingQueuedBlocks: lv150RepairRecord.replay.remaining_queued_blocks,
  },
  evidence: lv150RepairEvidencePath,
  evidence_sha256: lv150RepairEvidenceSha256,
  source_semantic_sha256: lv150RepairRecord.source_level_spec_sha256,
  target_semantic_sha256: lv150RepairRecord.target_level_spec_sha256,
  strict_preservation_contract: true,
  normalize_declared_counter_updates_for_preservation: true,
  minimal_counter_relaxation: {
    entity_id: "lv150-gate-01",
    field: "frozen",
    source_value: 7,
    target_value: 6,
    changed_counter_count: 1,
    absolute_delta: 1,
    attempted_range: "carrier recolor alone exhausted at one state before linkage and hit max_states=120000 after linkage; one frozen-counter decrement is the first accepted solved candidate",
  },
};

const overlapRepairDirectory = "playtest-results/experiments/overlap-high-exit-repair-lv128-193-r1";
const overlapRepairManifestPath = `${overlapRepairDirectory}/patch-manifest.json`;
const overlapRepairManifestExpectedSha256 = "BAA750BB7B39FE9646B58151AD62B34CCC1E2F250BF281778CA04E307911E1A4";
const overlapRepairManifestText = (await readFile(resolve(root, overlapRepairManifestPath), "utf8")).replace(/^\uFEFF/, "");
const overlapRepairManifestSha256 = sha256(overlapRepairManifestText);
if (overlapRepairManifestSha256 !== overlapRepairManifestExpectedSha256) {
  throw new Error(`Overlap repair manifest SHA drifted (${overlapRepairManifestSha256})`);
}
const overlapRepairReportPath = `${overlapRepairDirectory}/final-report.json`;
const overlapRepairReportExpectedSha256 = "0915896B4CDFCBF87F0FB9601486BBFBA68D4067F8230ABFDFE9BF0DC5ECA917";
const overlapRepairReportText = (await readFile(resolve(root, overlapRepairReportPath), "utf8")).replace(/^\uFEFF/, "");
const overlapRepairReportSha256 = sha256(overlapRepairReportText);
if (overlapRepairReportSha256 !== overlapRepairReportExpectedSha256) {
  throw new Error(`Overlap repair report SHA drifted (${overlapRepairReportSha256})`);
}
const overlapRepairManifest = JSON.parse(overlapRepairManifestText);
const overlapRepairReport = JSON.parse(overlapRepairReportText);
if (overlapRepairManifest.schema_version !== 1
  || overlapRepairManifest.mode !== "experiment-only; no formal level data modified"
  || !same(overlapRepairManifest.scope, [128, 155, 173, 187, 193])
  || !same(overlapRepairManifest.accepted_candidates?.map((record) => record.level_id), [187, 193])
  || !same(overlapRepairManifest.not_accepted?.map((record) => record.level_id), [128, 155, 173])
  || !same(overlapRepairReport.summary?.accepted_for_formal_integration, [187, 193])
  || !same(overlapRepairReport.summary?.inconclusive_max_states, [128, 155, 173])
  || !same(overlapRepairReport.accepted_candidates, overlapRepairManifest.accepted_candidates)
  || !same(overlapRepairReport.not_accepted, overlapRepairManifest.not_accepted)) {
  throw new Error("Overlap repair manifest/report contract drifted");
}

const buildOverlapRuntimeRepair = async (levelId) => {
  const record = overlapRepairManifest.accepted_candidates.find((candidate) => candidate.level_id === levelId);
  if (!record
    || record.status !== "solved-replay-complete-experimental-candidate"
    || record.formal_level_data_modified !== false
    || record.accepted_for_formal_integration !== true
    || record.source_exit_count !== record.target_exit_count
    || record.target_exit_count > 8
    || record.unique_exit_colors !== true
    || record.opening_same_color_component_max > 2
    || record.validation !== "pass"
    || record.static_unsat_reasons?.length
    || record.unsupported_reasons?.length
    || Object.values(record.preservation ?? {}).some((preserved) => preserved !== true)
    || record.solver?.termination !== "solved"
    || record.solver?.solved !== true
    || record.replay?.complete !== true
    || record.replay?.final_moves !== record.solver?.minimum_drags
    || record.replay?.remaining_blocks !== 0
    || record.replay?.remaining_queued_blocks !== 0) {
    throw new Error(`Lv${levelId}: overlap repair accepted-candidate contract drifted`);
  }
  const evidencePath = `${overlapRepairDirectory}/${record.evidence_file}`;
  const evidenceText = (await readFile(resolve(root, evidencePath), "utf8")).replace(/^\uFEFF/, "");
  const evidenceSha256 = sha256(evidenceText);
  const evidence = JSON.parse(evidenceText);
  if (evidenceSha256 !== record.evidence_sha256
    || evidence.level_id !== levelId
    || evidence.source_semantic_sha256 !== record.source_semantic_sha256
    || evidence.target_semantic_sha256 !== record.target_semantic_sha256
    || !same(evidence.patch, record.patch)
    || !same(evidence.solver, record.solver)
    || !same(evidence.replay, record.replay)
    || !same(evidence.preservation, record.preservation)) {
    throw new Error(`Lv${levelId}: overlap repair evidence drifted from SHA-locked manifest`);
  }
  return {
    level_id: levelId,
    candidate_id: `lv${levelId}-overlap-wide-corridors`,
    remove_exit_ids: record.patch.removed_exit_ids,
    exit_updates: Object.fromEntries(record.patch.exit_edits
      .map((edit) => [edit.id, changedFieldsToPatch(edit.changes)])),
    block_updates: Object.fromEntries(record.patch.block_edits
      .map((edit) => [edit.id, changedFieldsToPatch(edit.changes)])),
    generator_updates: {},
    verification: {
      max_states: record.solver.max_states,
      minimum_drags: record.solver.minimum_drags,
      clear_load: record.solver.clear_load,
      reposition_overhead: record.solver.reposition_overhead,
      explored_states: record.solver.explored_states,
      grid_steps: record.solver.grid_steps,
      turns: record.solver.turns,
    },
    route: record.solver.route,
    puzzle_model_replay: {
      attempted: true,
      complete: true,
      error: null,
      finalMoves: record.replay.final_moves,
      remainingBlocks: record.replay.remaining_blocks,
      remainingQueuedBlocks: record.replay.remaining_queued_blocks,
    },
    evidence: evidencePath,
    evidence_sha256: evidenceSha256,
    source_semantic_sha256: record.source_semantic_sha256,
    target_semantic_sha256: record.target_semantic_sha256,
    strict_preservation_contract: true,
    integration_manifest: {
      path: overlapRepairManifestPath,
      sha256: overlapRepairManifestSha256,
      expected_sha256: overlapRepairManifestExpectedSha256,
      report: {
        path: overlapRepairReportPath,
        sha256: overlapRepairReportSha256,
        expected_sha256: overlapRepairReportExpectedSha256,
      },
      source_semantic_sha256: record.source_semantic_sha256,
      target_semantic_sha256: record.target_semantic_sha256,
      evidence: { path: evidencePath, sha256: evidenceSha256 },
    },
  };
};

const lv187OverlapRuntimeRepair = await buildOverlapRuntimeRepair(187);
const lv193OverlapRuntimeRepair = await buildOverlapRuntimeRepair(193);

const lv107RepairEvidencePath = "playtest-results/experiments/unique-exit-repair/lv107-minimal-geometry-colour-r1.json";
const lv107RepairEvidenceExpectedSha256 = "DACBDA97F95358B44CFDA6B4CDF3397CDD762794E43121721E70846E38B944F5";
const lv107RepairEvidenceText = (await readFile(resolve(root, lv107RepairEvidencePath), "utf8")).replace(/^\uFEFF/, "");
const lv107RepairEvidenceSha256 = sha256(lv107RepairEvidenceText);
if (lv107RepairEvidenceSha256 !== lv107RepairEvidenceExpectedSha256) {
  throw new Error(`Lv107: repair evidence SHA drifted (${lv107RepairEvidenceSha256})`);
}
const lv107RepairEvidence = JSON.parse(lv107RepairEvidenceText);
if (lv107RepairEvidence.schema !== "blockout-lv107-minimal-geometry-colour-repair-r1"
  || lv107RepairEvidence.formal_level_data_modified !== false
  || lv107RepairEvidence.candidate_id !== "lv107-minimal-four-position-four-colour-aperture-repair"
  || lv107RepairEvidence.level_id !== 107
  || lv107RepairEvidence.source_semantic_sha256 !== "2D1A4E3BA2936C290D5E338CFABB179DB0E546DD26B3EBAC076697466518D9D8"
  || lv107RepairEvidence.candidate_sha256 !== "F75E66E60CBB97A0F9E2D7249D7CBFE6BA87AAF25F509C92A3A5C198CF559669"
  || lv107RepairEvidence.validate_level !== "pass"
  || lv107RepairEvidence.unique_exit_colors_pass !== true
  || lv107RepairEvidence.opening_same_color_component_max !== 2
  || lv107RepairEvidence.solver?.max_states !== 120_000
  || lv107RepairEvidence.solver?.order_variant !== "original"
  || lv107RepairEvidence.solver?.termination !== "solved"
  || lv107RepairEvidence.solver?.solved !== true
  || lv107RepairEvidence.solver?.explored_states !== 46
  || lv107RepairEvidence.solver?.minimum_drags !== 22
  || lv107RepairEvidence.solver?.clear_load !== 18
  || lv107RepairEvidence.solver?.reposition_overhead !== 4
  || lv107RepairEvidence.solver?.grid_steps !== 65
  || lv107RepairEvidence.solver?.turns !== 7
  || lv107RepairEvidence.solver?.static_unsat_reasons?.length
  || lv107RepairEvidence.solver?.unsupported_reasons?.length
  || !Array.isArray(lv107RepairEvidence.drags)
  || lv107RepairEvidence.drags.length !== 22
  || lv107RepairEvidence.replay?.ok !== true
  || lv107RepairEvidence.replay?.complete !== true
  || lv107RepairEvidence.replay?.moves !== 22
  || lv107RepairEvidence.replay?.remaining !== 0
  || lv107RepairEvidence.replay?.remaining_queued !== 0) {
  throw new Error("Lv107: accepted solver/replay evidence contract drifted");
}
const lv107RuntimeRepair = {
  level_id: 107,
  candidate_id: lv107RepairEvidence.candidate_id,
  remove_exit_ids: [],
  exit_updates: {
    "lv107-gate-01": {
      source: { side: "right", offset: 0, size: 1, color: "green" },
      target: { side: "left", offset: 5, size: 3, color: "pink" },
    },
    "lv107-gate-02": {
      source: { side: "top", offset: 0, size: 1, color: "cyan" },
      target: { side: "top", offset: 2, size: 2, color: "cyan" },
    },
    "lv107-gate-03": {
      source: { side: "top", offset: 1, size: 1, color: "yellow" },
      target: { side: "bottom", offset: 2, size: 2, color: "yellow" },
    },
    "lv107-gate-04": {
      source: { side: "right", offset: 1, size: 1, color: "purple" },
      target: { side: "right", offset: 3, size: 2, color: "purple" },
    },
    "lv107-gate-05": {
      source: { side: "bottom", offset: 0, size: 1, color: "pink" },
      target: { side: "bottom", offset: 5, size: 1, color: "orange" },
    },
    "lv107-gate-06": {
      source: { side: "bottom", offset: 1, size: 1, color: "green" },
      target: { side: "right", offset: 0, size: 3, color: "green" },
    },
  },
  block_updates: {
    "lv107-opening-b04": { source: { x: 0, y: 2 }, target: { x: 4, y: 6 } },
    "lv107-opening-b09": { source: { x: 2, y: 3 }, target: { x: 0, y: 3 } },
    "lv107-opening-b13": { source: { color: "yellow" }, target: { color: "green" } },
    "lv107-opening-b15": {
      source: { x: 1, y: 5, color: "pink" },
      target: { x: 3, y: 7, color: "cyan" },
    },
    "lv107-opening-b16": { source: { color: "green" }, target: { color: "pink" } },
    "lv107-opening-b17": {
      source: { x: 1, y: 6, color: "cyan" },
      target: { x: 1, y: 7, color: "pink" },
    },
  },
  generator_updates: {},
  verification: {
    max_states: lv107RepairEvidence.solver.max_states,
    minimum_drags: lv107RepairEvidence.solver.minimum_drags,
    clear_load: lv107RepairEvidence.solver.clear_load,
    reposition_overhead: lv107RepairEvidence.solver.reposition_overhead,
    explored_states: lv107RepairEvidence.solver.explored_states,
    grid_steps: lv107RepairEvidence.solver.grid_steps,
    turns: lv107RepairEvidence.solver.turns,
  },
  route: lv107RepairEvidence.drags,
  puzzle_model_replay: {
    attempted: true,
    complete: true,
    error: null,
    finalMoves: lv107RepairEvidence.replay.moves,
    remainingBlocks: lv107RepairEvidence.replay.remaining,
    remainingQueuedBlocks: lv107RepairEvidence.replay.remaining_queued,
  },
  evidence: lv107RepairEvidencePath,
  evidence_sha256: lv107RepairEvidenceSha256,
  source_semantic_sha256: lv107RepairEvidence.source_semantic_sha256,
  target_semantic_sha256: lv107RepairEvidence.candidate_sha256,
  strict_preservation_contract: true,
  normalize_declared_block_positions_for_preservation: true,
};

const apertureRepairDirectory = "playtest-results/experiments/aperture-duplicate-cluster-lv103-lv116-r1";
const apertureRepairManifestPath = `${apertureRepairDirectory}/patch-manifest.json`;
const apertureRepairManifestExpectedSha256 = "E48898871B5587EF89898627E5A53280F436B6400AD67F1E104BC0B5CCC7E938";
const apertureRepairManifestText = (await readFile(resolve(root, apertureRepairManifestPath), "utf8")).replace(/^\uFEFF/, "");
const apertureRepairManifestSha256 = sha256(apertureRepairManifestText);
if (apertureRepairManifestSha256 !== apertureRepairManifestExpectedSha256) {
  throw new Error(`Lv103/Lv116: repair manifest SHA drifted (${apertureRepairManifestSha256})`);
}
const apertureRepairManifest = JSON.parse(apertureRepairManifestText);
const apertureRepairReportPath = `${apertureRepairDirectory}/final-report.json`;
const apertureRepairReportExpectedSha256 = "0FFC8FA5384B77A32EEB471777F4BED0F0A551D8D59624722B9850DDE1248B43";
const apertureRepairReportText = (await readFile(resolve(root, apertureRepairReportPath), "utf8")).replace(/^\uFEFF/, "");
const apertureRepairReportSha256 = sha256(apertureRepairReportText);
if (apertureRepairReportSha256 !== apertureRepairReportExpectedSha256) {
  throw new Error(`Lv103/Lv116: repair report SHA drifted (${apertureRepairReportSha256})`);
}
const apertureRepairReport = JSON.parse(apertureRepairReportText);
if (apertureRepairManifest.mode !== "experiment-only; no formal source modified"
  || apertureRepairManifest.opening_visibility_semantics
    !== "exclude generator queue and positive-count block.shutterId payload; retain shutter.triggerBlockIds"
  || !same(apertureRepairManifest.candidates.map((record) => record.level_id), [103, 116])
  || !same(apertureRepairReport.candidates, apertureRepairManifest.candidates)) {
  throw new Error("Lv103/Lv116: repair manifest/report contract drifted");
}

const changedFieldsPatch = (changes) => ({
  source: Object.fromEntries(Object.entries(changes).map(([field, values]) => [field, values.from])),
  target: Object.fromEntries(Object.entries(changes).map(([field, values]) => [field, values.to])),
});

const buildApertureRuntimeRepair = async (levelId) => {
  const record = apertureRepairManifest.candidates.find((candidate) => candidate.level_id === levelId);
  if (!record || record.status !== "solved-replay-complete-experimental-candidate"
    || record.formal_level_data_modified !== false
    || record.acceptance?.validation !== "pass"
    || record.acceptance?.unique_exit_colors !== true
    || record.acceptance?.opening_same_color_component_max > 2
    || record.acceptance?.two_layer_colors_distinct !== true
    || record.acceptance?.static_unsat_reasons?.length
    || record.acceptance?.unsupported_reasons?.length
    || record.solver?.termination !== "solved" || record.solver?.solved !== true
    || record.replay?.attempted !== true || record.replay?.complete !== true
    || record.replay?.remaining_blocks !== 0 || record.replay?.remaining_queued_blocks !== 0
    || !Array.isArray(record.solver?.route)
    || record.solver.route.length !== record.solver.minimum_drags
    || record.replay.final_moves !== record.solver.minimum_drags
    || !Object.values(record.preservation ?? {}).every((value) => (
      typeof value === "object" ? Object.values(value).every(Boolean) : value === true
    ))) {
    throw new Error(`Lv${levelId}: accepted aperture repair contract drifted`);
  }
  const evidenceText = (await readFile(resolve(root, record.evidence_file), "utf8")).replace(/^\uFEFF/, "");
  const evidenceSha256 = sha256(evidenceText);
  if (evidenceSha256 !== record.evidence_sha256) {
    throw new Error(`Lv${levelId}: aperture repair evidence SHA drifted (${evidenceSha256})`);
  }
  const evidence = JSON.parse(evidenceText);
  const expectedCandidateId = levelId === 103
    ? "lv103-shutter20-to15-progressive-gates-a"
    : "lv116-manual-progressive-gates-a";
  if (evidence.level_id !== levelId || evidence.candidate_id !== expectedCandidateId
    || evidence.source_semantic_sha256 !== record.source_semantic_sha256
    || evidence.target_semantic_sha256 !== record.target_semantic_sha256
    || evidence.validation !== "pass" || evidence.unique_exit_colors_pass !== true
    || evidence.opening_same_color_component_max > 2 || evidence.two_layer_colors_distinct !== true
    || evidence.static_unsat_reasons?.length || evidence.unsupported_reasons?.length
    || !same(evidence.solver, record.solver) || !same(evidence.replay, record.replay)) {
    throw new Error(`Lv${levelId}: aperture repair solver/replay evidence drifted`);
  }
  const patches = (entries) => Object.fromEntries(asArray(entries)
    .map((entry) => [entry.id, changedFieldsPatch(entry.changes)]));
  const shutterUpdates = patches(record.patch?.shutter_edits);
  const isLv103 = levelId === 103;
  if ((isLv103 && !same(shutterUpdates, {
    "lv103-cover-02": { source: { count: 20 }, target: { count: 15 } },
  })) || (!isLv103 && Object.keys(shutterUpdates).length !== 0)) {
    throw new Error(`Lv${levelId}: undeclared shutter-counter relaxation drifted`);
  }
  return {
    level_id: levelId,
    candidate_id: evidence.candidate_id,
    remove_exit_ids: [],
    exit_updates: patches(record.patch?.exit_edits),
    block_updates: patches(record.patch?.block_edits),
    generator_updates: {},
    shutter_updates: shutterUpdates,
    verification: {
      max_states: evidence.solver.max_states,
      minimum_drags: evidence.solver.minimum_drags,
      clear_load: evidence.solver.clear_load,
      reposition_overhead: evidence.solver.reposition_overhead,
      explored_states: evidence.solver.explored_states,
      solver_elapsed_ms: evidence.solver.elapsed_ms,
      grid_steps: evidence.solver.grid_steps,
      turns: evidence.solver.turns,
    },
    route: evidence.solver.route,
    puzzle_model_replay: {
      attempted: true,
      complete: true,
      error: null,
      finalMoves: evidence.replay.final_moves,
      remainingBlocks: evidence.replay.remaining_blocks,
      remainingQueuedBlocks: evidence.replay.remaining_queued_blocks,
    },
    evidence: record.evidence_file,
    evidence_sha256: evidenceSha256,
    source_semantic_sha256: record.source_semantic_sha256,
    target_semantic_sha256: record.target_semantic_sha256,
    strict_preservation_contract: true,
    normalize_declared_shutter_updates_for_preservation: isLv103,
    normalize_generated_generator_order_for_semantic_hash: levelId === 116,
    minimal_counter_relaxation: isLv103 ? {
      entity_id: "lv103-cover-02",
      field: "count",
      source_value: 20,
      target_value: 15,
      changed_counter_count: 1,
      absolute_delta: 5,
      mathematical_upper_bound_before_unlock: 15,
      proof: record.mathematical_contract.proof,
    } : null,
    integration_manifest: {
      path: apertureRepairManifestPath,
      sha256: apertureRepairManifestSha256,
      expected_sha256: apertureRepairManifestExpectedSha256,
      report: {
        path: apertureRepairReportPath,
        sha256: apertureRepairReportSha256,
        expected_sha256: apertureRepairReportExpectedSha256,
      },
      source_semantic_sha256: record.source_semantic_sha256,
      target_semantic_sha256: record.target_semantic_sha256,
      route_sha256: record.route_sha256,
      evidence: { path: record.evidence_file, sha256: evidenceSha256 },
    },
  };
};

const lv103ApertureRuntimeRepair = await buildApertureRuntimeRepair(103);
const lv116ApertureRuntimeRepair = await buildApertureRuntimeRepair(116);

// The source contract remains an immutable record of the competitor video.
// These narrowly scoped runtime repairs are applied only after structural
// projection and are accepted only with a solver route plus PuzzleModel replay.
const SOLVER_VERIFIED_RUNTIME_REPAIRS = [
  lv103ApertureRuntimeRepair,
  lv105Stage2Repair,
  {
    level_id: 106,
    candidate_id: "lv106-joint-minimal-c",
    remove_exit_ids: ["lv106-gate-01", "lv106-gate-02", "lv106-gate-04", "lv106-gate-09"],
    exit_updates: {
      "lv106-gate-08": {
        source: { side: "bottom", offset: 0, size: 1, color: "blue", frozen: 10 },
        target: { side: "bottom", offset: 5, size: 1, color: "blue", frozen: 10 },
      },
      "lv106-gate-10": {
        source: { side: "bottom", offset: 2, size: 1, color: "red", frozen: 6 },
        target: { side: "bottom", offset: 2, size: 1, color: "pink", frozen: 6 },
      },
      "lv106-gate-12": {
        source: { side: "left", offset: 2, size: 1, color: "orange", star: true },
        target: { side: "top", offset: 0, size: 3, color: "orange", star: true },
      },
    },
    block_updates: {},
    verification: { minimum_drags: 38, clear_load: 33, reposition_overhead: 5, explored_states: 1090 },
    evidence: "playtest-results/experiments/solvability-repair-batch-01/lv106-joint-minimal-c-states-20000.json",
  },
  lv107RuntimeRepair,
  lv108HighExitRuntimeRepair,
  lv112HighExitRuntimeRepair,
  lv114ExactDeadlockRepair,
  lv115ExactDeadlockRepair,
  lv116ApertureRuntimeRepair,
  lv117RuntimeRepair,
  lv124RuntimeRepair,
  {
    level_id: 127,
    candidate_id: "lv127-minimal-shutter-clearance",
    remove_exit_ids: [],
    exit_updates: {
      "lv127-gate-01": {
        source: { side: "right", offset: 0, size: 1, color: "orange" },
        target: { side: "right", offset: 5, size: 1, color: "orange" },
      },
      "lv127-gate-02": {
        source: { side: "right", offset: 1, size: 1, color: "red" },
        target: { side: "right", offset: 6, size: 1, color: "red" },
      },
      "lv127-gate-03": {
        source: { side: "top", offset: 0, size: 1, color: "orange", frozen: 22 },
        target: { side: "top", offset: 0, size: 1, color: "cyan", frozen: 22 },
      },
      "lv127-gate-04": {
        source: { side: "left", offset: 0, size: 1, color: "red", frozen: 15 },
        target: { side: "left", offset: 0, size: 1, color: "green", frozen: 15 },
      },
    },
    block_updates: {
      "lv127-opening-b01": {
        source: { color: "blue", layers: ["blue", "pink"] },
        target: { color: "red", layers: ["orange", "red"] },
      },
      "lv127-opening-b06": {
        source: { color: "orange" },
        target: { color: "red" },
      },
    },
    verification: { minimum_drags: 19, clear_load: 16, reposition_overhead: 3, explored_states: 20 },
    evidence: "playtest-results/experiments/joint-color-constraints/lv127-geometry-search.json",
  },
  {
    level_id: 130,
    candidate_id: "lv130-joint-minimal-d",
    remove_exit_ids: ["lv130-gate-01", "lv130-gate-02", "lv130-gate-06", "lv130-gate-08"],
    exit_updates: {
      "lv130-gate-05": {
        source: { side: "left", offset: 7, size: 1, color: "green" },
        target: { side: "left", offset: 7, size: 1, color: "purple" },
      },
      "lv130-gate-07": {
        source: { side: "right", offset: 6, size: 1, color: "blue" },
        target: { side: "right", offset: 6, size: 1, color: "pink" },
      },
      "lv130-gate-09": {
        source: { side: "bottom", offset: 2, size: 1, color: "yellow" },
        target: { side: "right", offset: 7, size: 1, color: "yellow" },
      },
    },
    block_updates: {},
    verification: { minimum_drags: 23, clear_load: 20, reposition_overhead: 3, explored_states: 27 },
    evidence: "playtest-results/experiments/solvability-repair-batch-01/lv130-joint-minimal-d-states-20000.json",
  },
  lv150RuntimeRepair,
  {
    level_id: 152,
    candidate_id: "lv152-local-n",
    remove_exit_ids: [],
    exit_updates: {
      "lv152-flip-door-01": {
        source: { side: "top", offset: 2, size: 2, color: "cyan", initiallyOpen: true },
        target: { side: "left", offset: 0, size: 7, color: "cyan", initiallyOpen: true },
      },
      "lv152-flip-door-02": {
        source: { side: "left", offset: 3, size: 2, color: "yellow", initiallyOpen: true },
        target: { side: "bottom", offset: 2, size: 2, color: "yellow", initiallyOpen: true },
      },
      "lv152-flip-door-03": {
        source: { side: "right", offset: 3, size: 2, color: "green", initiallyOpen: false },
        target: { side: "right", offset: 0, size: 6, color: "green", initiallyOpen: false },
      },
      "lv152-flip-door-04": {
        source: { side: "bottom", offset: 2, size: 2, color: "red", initiallyOpen: false },
        target: { side: "top", offset: 0, size: 6, color: "red", initiallyOpen: false },
      },
    },
    block_updates: {
      "lv152-opening-b04": {
        source: { x: 0, y: 2, color: "cyan", layers: ["cyan", "yellow"] },
        target: { x: 0, y: 2, color: "green", layers: ["green", "cyan"] },
      },
      "lv152-opening-b05": {
        source: { x: 2, y: 2, color: "red", layers: ["red", "yellow"] },
        target: { x: 2, y: 2, color: "red", layers: ["red", "cyan"] },
      },
      "lv152-opening-b09": {
        source: { x: 4, y: 4, color: "yellow" },
        target: { x: 4, y: 4, color: "cyan" },
      },
      "lv152-opening-b10": {
        source: { x: 0, y: 5, color: "red" },
        target: { x: 0, y: 5, color: "cyan" },
      },
    },
    generator_updates: {},
    verification: {
      minimum_drags: lv152RepairEvidence.parsed.minimumDrags,
      clear_load: lv152RepairEvidence.parsed.clearLoad,
      reposition_overhead: lv152RepairEvidence.parsed.repositionOverhead,
      explored_states: lv152RepairEvidence.parsed.exploredStates,
      solver_elapsed_ms: lv152RepairEvidence.parsed.solverElapsedMs,
      grid_steps: lv152RepairEvidence.parsed.gridSteps,
      turns: lv152RepairEvidence.parsed.turns,
    },
    route: lv152RepairEvidence.parsed.route,
    puzzle_model_replay: lv152RepairEvidence.parsed.replay,
    evidence: lv152RepairEvidence.path,
    evidence_sha256: lv152RepairEvidence.sha256,
  },
  {
    level_id: 156,
    candidate_id: "lv156-local-b",
    remove_exit_ids: [],
    exit_updates: {
      "lv156-flip-door-01": {
        source: { side: "top", offset: 2, size: 1, color: "pink", initiallyOpen: false },
        target: { side: "bottom", offset: 4, size: 1, color: "pink", initiallyOpen: true },
      },
      "lv156-flip-door-02": {
        source: { side: "top", offset: 3, size: 1, color: "blue", initiallyOpen: true },
        target: { side: "bottom", offset: 2, size: 2, color: "blue", initiallyOpen: false },
      },
      "lv156-flip-door-03": {
        source: { side: "left", offset: 0, size: 2, color: "purple", initiallyOpen: true },
        target: { side: "left", offset: 8, size: 2, color: "purple", initiallyOpen: true },
      },
      "lv156-flip-door-04": {
        source: { side: "right", offset: 0, size: 2, color: "red", initiallyOpen: true },
        target: { side: "right", offset: 8, size: 2, color: "red", initiallyOpen: false },
      },
      "lv156-flip-door-05": {
        source: { side: "bottom", offset: 1, size: 2, color: "orange", initiallyOpen: true },
        target: { side: "bottom", offset: 0, size: 2, color: "orange", initiallyOpen: false },
      },
    },
    block_updates: {
      "lv156-opening-b01": {
        source: { x: 2, y: 0, color: "purple", frozen: 1 },
        target: { x: 0, y: 8, color: "purple", frozen: null },
      },
      "lv156-opening-b02": {
        source: { x: 4, y: 0, color: "purple", frozen: 1 },
        target: { x: 2, y: 8, color: "purple", frozen: 1 },
      },
      "lv156-generator-3-b04": {
        source: { color: "pink" },
        target: { color: "orange" },
      },
      "lv156-generator-4-b03": {
        source: { color: "orange" },
        target: { color: "pink" },
      },
    },
    generator_updates: Object.fromEntries([1, 2, 3, 4].map((index) => [
      `lv156-generator-${index}`,
      { source: { spawn: [2, 0] }, target: { spawn: [2, 5] } },
    ])),
    verification: {
      minimum_drags: lv156RepairEvidence.parsed.minimumDrags,
      clear_load: lv156RepairEvidence.parsed.clearLoad,
      reposition_overhead: lv156RepairEvidence.parsed.repositionOverhead,
      explored_states: lv156RepairEvidence.parsed.exploredStates,
      solver_elapsed_ms: lv156RepairEvidence.parsed.solverElapsedMs,
      grid_steps: lv156RepairEvidence.parsed.gridSteps,
      turns: lv156RepairEvidence.parsed.turns,
    },
    route: lv156RepairEvidence.parsed.route,
    puzzle_model_replay: lv156RepairEvidence.parsed.replay,
    evidence: lv156RepairEvidence.path,
    evidence_sha256: lv156RepairEvidence.sha256,
  },
  {
    level_id: 158,
    candidate_id: "lv158-local-d",
    remove_exit_ids: [],
    exit_updates: {
      "lv158-gate-01": {
        source: { side: "top", offset: 1, size: 1, color: "purple" },
        target: { side: "left", offset: 7, size: 4, color: "purple" },
      },
      "lv158-gate-02": {
        source: { side: "left", offset: 5, size: 1, color: "yellow" },
        target: { side: "right", offset: 6, size: 5, color: "yellow" },
      },
      "lv158-gate-03": {
        source: { side: "bottom", offset: 1, size: 1, color: "cyan" },
        target: { side: "bottom", offset: 2, size: 3, color: "cyan" },
      },
    },
    block_updates: {
      "lv158-opening-b03": {
        source: { x: 1, y: 0, color: "purple" },
        target: { x: 5, y: 10, color: "purple" },
      },
    },
    generator_updates: {},
    verification: {
      minimum_drags: lv158RepairEvidence.parsed.minimumDrags,
      clear_load: lv158RepairEvidence.parsed.clearLoad,
      reposition_overhead: lv158RepairEvidence.parsed.repositionOverhead,
      explored_states: lv158RepairEvidence.parsed.exploredStates,
      solver_elapsed_ms: lv158RepairEvidence.parsed.solverElapsedMs,
      grid_steps: lv158RepairEvidence.parsed.gridSteps,
      turns: lv158RepairEvidence.parsed.turns,
    },
    route: lv158RepairEvidence.parsed.route,
    puzzle_model_replay: lv158RepairEvidence.parsed.replay,
    evidence: lv158RepairEvidence.path,
    evidence_sha256: lv158RepairEvidence.sha256,
  },
  lv187OverlapRuntimeRepair,
  lv193OverlapRuntimeRepair,
];

const boundaryKey = (side, coordinate, width, height) => side === "top" ? keyOf(coordinate, 0)
  : side === "bottom" ? keyOf(coordinate, height - 1)
    : side === "left" ? keyOf(0, coordinate)
      : keyOf(width - 1, coordinate);

const gateRecords = (level) => {
  const exits = level.mechanism_contract?.directional_exits ?? {};
  const directional = ["ordinary", "frozen", "star"].flatMap((classification) => (
    asArray(exits[classification]).map((record) => ({ classification, record }))
  ));
  const flipDoors = asArray(level.mechanism_contract?.flip_doors)
    .map((record) => ({ classification: "flip-door", record }));
  return [...directional, ...flipDoors];
};

const sourceFrozenValue = (record) => {
  const values = [record.frozen_value, record.value, record.frozen?.value, record.frozen];
  return values.find(isPositiveInteger) ?? null;
};

const inferSide = (record, used) => {
  if (SIDES.includes(record.side)) return { value: record.side, provenance: "source" };
  const value = [...SIDES].sort((left, right) => used[left].size - used[right].size
    || SIDES.indexOf(left) - SIDES.indexOf(right))[0];
  return { value, provenance: "design_fill_source_side_unclear" };
};

const inferGateColor = (record, palette, index) => {
  const sourceColor = record.color ?? record.color_class;
  if (COLORS.includes(sourceColor)) return { value: sourceColor, provenance: "source" };
  return {
    value: palette[index % palette.length] ?? COLORS[index % COLORS.length],
    provenance: "design_fill_source_color_unclear",
  };
};

const allocateGates = (level, initialPlayable) => {
  const used = Object.fromEntries(SIDES.map((side) => [side, new Set()]));
  const requiredCells = new Set();
  const audit = [];
  const gates = [];
  const flipDoors = [];
  const palette = level.palette.filter((color) => COLORS.includes(color));
  for (const [index, { classification, record }] of gateRecords(level).entries()) {
    const sideChoice = inferSide(record, used);
    let side = sideChoice.value;
    let sideProvenance = sideChoice.provenance;
    let size = isPositiveInteger(record.size) ? record.size : 1;
    let sizeProvenance = isPositiveInteger(record.size) ? "source" : "design_fill_source_size_unclear_default_one";
    let limit = side === "top" || side === "bottom" ? level.board.width : level.board.height;
    if (size > limit) {
      size = 1;
      sizeProvenance = "design_fill_source_size_out_of_bounds_default_one";
    }
    const sourceOffset = isInteger(record.offset) && record.offset >= 0 && record.offset + size <= limit
      ? record.offset
      : null;
    const candidates = [];
    if (sourceOffset !== null) candidates.push(sourceOffset);
    for (let offset = 0; offset + size <= limit; offset += 1) {
      if (offset !== sourceOffset) candidates.push(offset);
    }
    candidates.sort((left, right) => {
      const playableScore = (offset) => Array.from({ length: size }, (_, delta) => (
        initialPlayable.has(boundaryKey(side, offset + delta, level.board.width, level.board.height)) ? 1 : 0
      )).reduce((sum, value) => sum + value, 0);
      // Sparse boards commonly use separated vertical/horizontal lanes. When
      // an exit offset is unknown, keep the gate on the densest matching lane
      // instead of consuming a boundary cell that cannot support any source
      // shape (Lv115 is the minimal six-lane example).
      const inwardLaneScore = (offset) => Array.from({ length: size }, (_, delta) => {
        const coordinate = offset + delta;
        if (side === "top" || side === "bottom") {
          return Array.from({ length: level.board.height }, (_, y) => (
            initialPlayable.has(keyOf(coordinate, y)) ? 1 : 0
          )).reduce((sum, value) => sum + value, 0);
        }
        return Array.from({ length: level.board.width }, (_, x) => (
          initialPlayable.has(keyOf(x, coordinate)) ? 1 : 0
        )).reduce((sum, value) => sum + value, 0);
      }).reduce((sum, value) => sum + value, 0);
      const sourceBias = (offset) => offset === sourceOffset ? 100 : 0;
      return sourceBias(right) + playableScore(right) * 20 + inwardLaneScore(right)
        - sourceBias(left) - playableScore(left) * 20 - inwardLaneScore(left) || left - right;
    });
    let offset = candidates.find((candidate) => Array.from({ length: size }, (_, delta) => candidate + delta)
      .every((coordinate) => !used[side].has(coordinate)));
    if (offset === undefined) {
      const fallbackSide = [...SIDES].find((candidateSide) => {
        const candidateLimit = candidateSide === "top" || candidateSide === "bottom"
          ? level.board.width : level.board.height;
        return candidateLimit >= size && used[candidateSide].size + size <= candidateLimit;
      });
      if (!fallbackSide) throw new Error(`Lv${level.id}: cannot allocate ${size}-cell gate`);
      side = fallbackSide;
      sideProvenance = "design_fill_source_side_capacity_conflict";
      limit = side === "top" || side === "bottom" ? level.board.width : level.board.height;
      offset = Array.from({ length: limit - size + 1 }, (_, candidate) => candidate)
        .find((candidate) => Array.from({ length: size }, (_, delta) => candidate + delta)
          .every((coordinate) => !used[side].has(coordinate)));
    }
    if (offset === undefined) throw new Error(`Lv${level.id}: missing deterministic gate offset`);
    for (let coordinate = offset; coordinate < offset + size; coordinate += 1) {
      used[side].add(coordinate);
      requiredCells.add(boundaryKey(side, coordinate, level.board.width, level.board.height));
    }
    const colorChoice = inferGateColor(record, palette.length ? palette : COLORS, index);
    const frozen = classification === "frozen" ? sourceFrozenValue(record) ?? 1 : undefined;
    const flipDoor = classification === "flip-door";
    const gate = {
      id: `lv${level.id}-${flipDoor ? "flip-door" : "gate"}-${String(index + 1).padStart(2, "0")}`,
      side,
      offset,
      size,
      color: colorChoice.value,
      ...(frozen ? { frozen } : {}),
      ...((classification === "star" || record.star === true || record.star_required === true) ? { star: true } : {}),
      ...(flipDoor ? { initiallyOpen: record.initial_state === "open" || record.initiallyOpen === true } : {}),
    };
    if (flipDoor) flipDoors.push(gate);
    else gates.push(gate);
    audit.push({
      gate_id: gate.id,
      classification,
      runtime: gate,
      source: record,
      field_evidence: {
        side: sideProvenance,
        offset: sourceOffset === offset ? "source" : sourceOffset === null
          ? "design_fill_source_offset_unclear" : "design_fill_source_offset_conflict",
        size: sizeProvenance,
        color: colorChoice.provenance,
        frozen: classification === "frozen"
          ? (sourceFrozenValue(record) ? "source" : "design_fill_missing_positive_value_default_one")
          : "not_applicable",
        star: classification === "star" || record.star === true || record.star_required === true
          ? "source" : "not_applicable",
        initially_open: flipDoor && ["open", "closed"].includes(record.initial_state)
          ? "source" : flipDoor ? "design_fill_source_initial_state_unclear_closed" : "not_applicable",
      },
    });
  }
  return { gates, flipDoors, audit, requiredCells };
};

const connectedCellCount = (cells) => {
  if (!cells.size) return 0;
  const first = cells.values().next().value;
  const seen = new Set([first]);
  const queue = [first];
  while (queue.length) {
    const [x, y] = queue.shift().split(",").map(Number);
    for (const key of [keyOf(x + 1, y), keyOf(x - 1, y), keyOf(x, y + 1), keyOf(x, y - 1)]) {
      if (cells.has(key) && !seen.has(key)) { seen.add(key); queue.push(key); }
    }
  }
  return seen.size;
};

const componentCount = (cells) => {
  const remaining = new Set(cells);
  let count = 0;
  while (remaining.size) {
    count += 1;
    const first = remaining.values().next().value;
    remaining.delete(first);
    const queue = [first];
    while (queue.length) {
      const [x, y] = queue.shift().split(",").map(Number);
      for (const key of [keyOf(x + 1, y), keyOf(x - 1, y), keyOf(x, y + 1), keyOf(x, y - 1)]) {
        if (!remaining.has(key)) continue;
        remaining.delete(key);
        queue.push(key);
      }
    }
  }
  return count;
};

const runtimePlayableCellTarget = (level) => (
  // Lv123's source board mask/count is explicitly design-fill. Its preserved
  // 25 opening cells and 20-cell physical hidden cohort are disjoint by the
  // shutter collision contract, so 45 is the smallest possible runtime mask.
  level.id === 123 ? 45
    // Lv137 preserves a 35-cell opening and a 22-cell hidden cohort. The
    // smallest same-width physical cover that contains the latter is 4x6, so
    // the disjoint runtime mask has a hard lower bound of 59 cells.
    : level.id === 137 ? 59
      : level.board.playable_cell_count
);

const adjustPlayableMask = (level, requiredCells) => {
  const targetCount = runtimePlayableCellTarget(level);
  const original = new Set(level.board.playable_cells.map(([x, y]) => keyOf(x, y)));
  const result = new Set(original);
  const added = [...requiredCells].filter((key) => !result.has(key)).sort(compareText);
  for (const key of added) result.add(key);
  const useCount = new Map();
  for (const stage of level.stages) for (const block of stage.blocks) {
    for (const [x, y] of block.cells) useCount.set(keyOf(x, y), (useCount.get(keyOf(x, y)) ?? 0) + 1);
  }
  const removed = [];
  const requiredPoints = [...requiredCells].map((key) => key.split(",").map(Number));
  while (result.size > targetCount) {
    const candidates = [...result].filter((key) => !requiredCells.has(key)).sort((left, right) => {
      const [lx, ly] = left.split(",").map(Number);
      const [rx, ry] = right.split(",").map(Number);
      const leftBoundary = lx === 0 || ly === 0 || lx === level.board.width - 1 || ly === level.board.height - 1 ? 1 : 0;
      const rightBoundary = rx === 0 || ry === 0 || rx === level.board.width - 1 || ry === level.board.height - 1 ? 1 : 0;
      const distance = (x, y) => requiredPoints.length
        ? Math.min(...requiredPoints.map(([qx, qy]) => Math.abs(qx - x) + Math.abs(qy - y))) : 0;
      return (useCount.get(left) ?? 0) - (useCount.get(right) ?? 0)
        || distance(rx, ry) - distance(lx, ly)
        || leftBoundary - rightBoundary || compareText(right, left);
    });
    const expectedComponents = componentCount(result);
    let selected = candidates.find((key) => {
      const probe = new Set(result); probe.delete(key);
      return componentCount(probe) === expectedComponents;
    });
    if (!selected) selected = candidates[0];
    if (!selected) throw new Error(`Lv${level.id}: cannot preserve playable-cell count`);
    result.delete(selected);
    removed.push(selected);
  }
  if (result.size !== targetCount) {
    throw new Error(`Lv${level.id}: playable-cell count drift ${result.size}`);
  }
  return {
    cells: result,
    audit: {
      source_playable_cell_count: level.board.playable_cell_count,
      runtime_playable_cell_count: result.size,
      added_for_gate_boundaries: added,
      removed_to_preserve_count: removed,
      status: targetCount !== level.board.playable_cell_count
        ? "design_fill_physical_shutter_minimum_cell_count"
        : added.length ? "design_fill_mask_swap_recorded" : "source_mask_preserved",
    },
  };
};

const shapeBounds = (shape) => ({
  width: Math.max(...shape.map(([x]) => x)) + 1,
  height: Math.max(...shape.map(([, y]) => y)) + 1,
});

const placementCells = (shape, x, y) => shape.map(([dx, dy]) => keyOf(x + dx, y + dy));

const packBlocks = (
  blocks, playable, forbidden, width, height, nodeLimit = 350_000, requiredCoverage = new Set(),
  cellAllowed = () => true,
) => {
  if (!blocks.length) return { placements: new Map(), nodes: 0 };
  const placementMap = new Map();
  for (const block of blocks) {
    const bounds = shapeBounds(block.shape);
    const placements = [];
    for (let y = 0; y + bounds.height <= height; y += 1) for (let x = 0; x + bounds.width <= width; x += 1) {
      const cells = placementCells(block.shape, x, y);
      if (cells.every((key) => playable.has(key) && !forbidden.has(key) && cellAllowed(block, key))) {
        placements.push({ x, y, cells });
      }
    }
    placements.sort((left, right) => {
      const requiredHits = (placement) => placement.cells.filter((key) => requiredCoverage.has(key)).length;
      const leftOriginal = left.x === block.x && left.y === block.y ? 1 : 0;
      const rightOriginal = right.x === block.x && right.y === block.y ? 1 : 0;
      return requiredHits(right) - requiredHits(left)
        || rightOriginal - leftOriginal || left.y - right.y || left.x - right.x;
    });
    if (!placements.length) return null;
    placementMap.set(block.id, placements);
  }
  const ordered = [...blocks].sort((left, right) => {
    const canCover = (block) => Math.max(...placementMap.get(block.id).map((placement) => (
      placement.cells.filter((key) => requiredCoverage.has(key)).length
    )));
    return canCover(right) - canCover(left)
      || placementMap.get(left.id).length - placementMap.get(right.id).length
      || right.shape.length - left.shape.length || compareText(left.id, right.id);
  });
  const occupied = new Set();
  const result = new Map();
  let nodes = 0;
  const visit = (index) => {
    if (index >= ordered.length) return [...requiredCoverage].every((key) => occupied.has(key));
    if (++nodes > nodeLimit) return false;
    const block = ordered[index];
    for (const placement of placementMap.get(block.id)) {
      if (placement.cells.some((key) => occupied.has(key))) continue;
      placement.cells.forEach((key) => occupied.add(key));
      result.set(block.id, placement);
      if (visit(index + 1)) return true;
      result.delete(block.id);
      placement.cells.forEach((key) => occupied.delete(key));
    }
    return false;
  };
  return visit(0) ? { placements: result, nodes } : null;
};

const validRectangle = (region, width, height) => region && isInteger(region.x) && isInteger(region.y)
  && isPositiveInteger(region.w) && isPositiveInteger(region.h)
  && region.x >= 0 && region.y >= 0 && region.x + region.w <= width && region.y + region.h <= height;
const rectangleCells = (region) => Array.from({ length: region.h }, (_, dy) => (
  Array.from({ length: region.w }, (_, dx) => keyOf(region.x + dx, region.y + dy))
)).flat();

const stageCellArea = (stage) => asArray(stage?.blocks)
  .reduce((sum, block) => sum + asArray(block.cells).length, 0);
const physicalShutterContractProof = (level) => {
  const opening = level.stages.find((stage) => stage.id === level.opening_stage_id);
  const hiddenStages = level.stages.filter((stage) => stage.id !== level.opening_stage_id);
  const openingCells = stageCellArea(opening);
  const hiddenCells = hiddenStages.reduce((sum, stage) => sum + stageCellArea(stage), 0);
  if (level.id === 123) return {
    status: "minimum_playable_area_correction",
    outer_dimensions: [6, 11],
    source_playable_cells: 42,
    opening_cells: openingCells,
    hidden_cells: hiddenCells,
    source_frame_shutter: { width: 4, height: 5, visual_position: "large central" },
    mathematical_lower_bound: 45,
    runtime_playable_cells: 45,
    proof: "opening 25 cells + disjoint physical-shutter cohort 20 cells = 45; source playable 42 is three cells short",
  };
  if (level.id === 137) return {
    status: "minimum_shutter_and_playable_area_correction",
    outer_dimensions: [7, 12],
    source_playable_cells: 58,
    opening_cells: openingCells,
    hidden_cells: hiddenCells,
    source_shutter: { width: 4, height: 5, capacity: 20 },
    runtime_shutter: { width: 4, height: 6, capacity: 24 },
    mathematical_lower_bound: 59,
    runtime_playable_cells: 59,
    proof: "hidden cohort occupies 22 cells, exceeding 4x5 capacity 20; minimum rectangular extension is 4x6 and opening 35 + cover 24 = 59",
  };
  if (level.id === 141) return {
    status: "minimum_shutter_dimension_correction",
    outer_dimensions: [8, 14],
    source_playable_cells: 92,
    opening_cells: openingCells,
    hidden_cells: hiddenCells,
    source_shutter: { width: 8, height: 5 },
    runtime_shutter: { width: 8, height: 6 },
    runtime_playable_cells: 92,
    proof: "eight V3 pieces in height 5 require all eight columns because two V3 cannot stack in one column; RECT2X3 then requires height 3 in two already-used columns, so 8x5 is impossible and 8x6 is the minimum",
  };
  if (level.id === 165) return {
    status: "minimum_hidden_orientation_correction",
    outer_dimensions: [6, 10],
    opening_cells: openingCells,
    hidden_cells: hiddenCells,
    source_shutters: [{ width: 2, height: 10, count: 5 }, { width: 2, height: 10, count: 7 }],
    correction: { block_id: "lv165-pooled-hidden-b01", from: "H3", to: "V3" },
    proof: "a width-3 H3 cannot fit either exact width-2 shutter; rotation preserves its three cells and both competitor shutter rectangles",
  };
  if (level.id === 188) return {
    status: "minimum_hidden_area_correction",
    outer_dimensions: [7, 10],
    opening_cells: openingCells,
    source_hidden_cells: hiddenCells,
    physical_shutter_capacity: 27,
    correction: { block_id: "lv188-pooled-hidden-b10", from: "H2", to: "SINGLE", cell_delta: -1 },
    runtime_hidden_cells: 27,
    proof: "5x3 + 3x4 shutters provide 27 cells but the design-filled hidden pool uses 28; one-cell shrink is the mathematical minimum while preserving both shutter sizes",
  };
  if (level.id === 192) return {
    status: "minimum_hidden_orientation_correction",
    outer_dimensions: [8, 10],
    opening_cells: openingCells,
    hidden_cells: hiddenCells,
    source_shutter: { width: 8, height: 2, count: 6 },
    correction: { block_id: "lv192-cover-count-6-inferred-batch-b01", from: "V3", to: "H3" },
    proof: "a height-3 V3 cannot fit the exact height-2 shutter; rotation preserves its three cells and the competitor shutter rectangle",
  };
  return null;
};

const findRectangle = (playable, width, height, sourceRegion) => {
  const dimensions = validRectangle(sourceRegion, width, height)
    ? { w: sourceRegion.w, h: sourceRegion.h, provenance: "source_dimensions" }
    : { w: Math.min(2, width), h: Math.min(2, height), provenance: "design_fill_unknown_geometry_2x2" };
  const candidates = [];
  if (validRectangle(sourceRegion, width, height)) candidates.push({ ...sourceRegion, component: undefined });
  for (let y = 0; y + dimensions.h <= height; y += 1) for (let x = 0; x + dimensions.w <= width; x += 1) {
    if (!candidates.some((candidate) => candidate.x === x && candidate.y === y)) {
      candidates.push({ x, y, w: dimensions.w, h: dimensions.h });
    }
  }
  const region = candidates.find((candidate) => rectangleCells(candidate).every((key) => playable.has(key)));
  if (region) return {
    region,
    provenance: validRectangle(sourceRegion, width, height) && region.x === sourceRegion.x && region.y === sourceRegion.y
      ? "source_target_region" : `${dimensions.provenance}_relocated_to_playable_rectangle`,
  };
  const single = [...playable].sort(compareText)[0];
  if (!single) throw new Error("Cannot place fallback shutter on an empty board");
  const [x, y] = single.split(",").map(Number);
  return { region: { x, y, w: 1, h: 1 }, provenance: "design_fill_no_same_size_rectangle_nonspatial_fallback" };
};

// Some early post-100 source records could not express cover coordinates even
// though their untouched opening frames show the physical rectangle clearly.
// Keeping the generic 2x2 unknown-geometry fallback made the displayed cover
// disagree with its collision/reveal cohort. These are source-evidence
// projections, not mechanism, counter, opening, or cohort-count relaxations.
const auditedCoverRegion = (level, producer) => {
  const visualPosition = String(producer.source_reference?.cover?.visual_position ?? "").toLowerCase();
  if (level.id === 137) {
    return { region: { x: 3, y: 0, w: 4, h: 6 }, provenance: "lv137_source_4x5_minimally_extended_for_22_cell_cohort" };
  }
  if (level.id === 141) {
    return { region: { x: 0, y: 0, w: 8, h: 6 }, provenance: "lv141_source_8x5_minimally_extended_for_v3_cohort" };
  }
  if (level.id === 146) {
    // The source frame shows four disjoint physical shutters.  Their x/y
    // coordinates were left unresolved in the normalized event producers,
    // but the canonical mechanism contract retained each exact w/h and the
    // screenshot fixes their relative upper/lower placement.
    const regions = [
      { x: 0, y: 0, w: 4, h: 3 }, // count 22, upper-left
      { x: 4, y: 0, w: 3, h: 4 }, // count 19, upper-right
      { x: 0, y: 8, w: 4, h: 2 }, // count 11, lower-left
      { x: 5, y: 7, w: 2, h: 3 }, // count 14, lower-right
    ];
    const region = regions[producer.source_index];
    if (region) return { region, provenance: `lv146_source_cover_${producer.source_index + 1}_exact_dimensions` };
  }
  if (producer.target_region) return null;
  if (level.id === 113) {
    if (visualPosition === "upper") return { region: { x: 0, y: 0, w: 6, h: 3 }, provenance: "lv113_full_width_3_row_component" };
    if (visualPosition === "lower") return { region: { x: 0, y: 6, w: 6, h: 3 }, provenance: "lv113_full_width_3_row_component" };
  }
  if (level.id === 117 && visualPosition === "lower") {
    return { region: { x: 0, y: 4, w: 8, h: 4 }, provenance: "lv117_lower_half_8x4" };
  }
  if (level.id === 119) {
    if (visualPosition === "left-tall") return { region: { x: 0, y: 2, w: 2, h: 3 }, provenance: "lv119_left_tall_2x3" };
    if (visualPosition === "right-tall") return { region: { x: 4, y: 0, w: 2, h: 4 }, provenance: "lv119_right_tall_2x4" };
    if (visualPosition === "bottom-large") return { region: { x: 2, y: 5, w: 4, h: 3 }, provenance: "lv119_bottom_large_4x3" };
  }
  if (level.id === 123 && visualPosition === "large central") {
    return { region: { x: 1, y: 3, w: 4, h: 5 }, provenance: "lv123_large_central_4x5" };
  }
  if (level.id === 134) {
    const regions = {
      "upper-left vertical": { x: 0, y: 0, w: 1, h: 3 },
      "upper-mid-left vertical": { x: 1, y: 1, w: 1, h: 2 },
      "upper-center": { x: 2, y: 0, w: 2, h: 3 },
      "upper-mid-right vertical": { x: 4, y: 1, w: 1, h: 2 },
      "upper-right vertical": { x: 5, y: 1, w: 1, h: 2 },
      "bottom-left": { x: 0, y: 4, w: 2, h: 2 },
      "bottom-center": { x: 2, y: 6, w: 2, h: 1 },
      "bottom-right": { x: 2, y: 7, w: 2, h: 1 },
    };
    const region = regions[visualPosition];
    if (region) return { region, provenance: `lv134_${visualPosition.replaceAll(/[^a-z]+/g, "_")}` };
  }
  return null;
};

const buildCovers = (level, playable) => {
  const covers = [];
  const eventToCoverIds = new Map();
  for (const event of level.stage_events.filter((entry) => entry.event_type === "cover_clear")) {
    const ids = [];
    for (const [producerIndex, producer] of asArray(event.producers).entries()) {
      const auditedRegion = auditedCoverRegion(level, producer);
      const located = auditedRegion
        ? { region: auditedRegion.region, provenance: `source_opening_frame_${auditedRegion.provenance}` }
        : findRectangle(playable, level.board.width, level.board.height, producer.target_region);
      const id = `lv${level.id}-cover-${String(covers.length + 1).padStart(2, "0")}`;
      ids.push(id);
      covers.push({
        id,
        event_group_id: event.event_group_id,
        producer_id: producer.producer_id,
        count: isPositiveInteger(producer.trigger_count) ? producer.trigger_count
          : isPositiveInteger(event.trigger_count) ? event.trigger_count : 1,
        source_region: producer.source_region ?? null,
        source_target_region: producer.target_region ?? null,
        region: located.region,
        region_provenance: located.provenance,
        assignment_status: event.assignment_status,
        physical: !located.provenance.includes("nonspatial_fallback"),
        audited_physical: Boolean(auditedRegion),
        downgrade_reason: located.provenance.includes("nonspatial_fallback") ? "source_rectangle_has_no_playable_runtime_placement" : null,
        block_ids: [],
      });
    }
    eventToCoverIds.set(event.event_group_id, ids);
  }
  return { covers, eventToCoverIds };
};

const applyMechanismBindings = (level, blockSpecs, fillEvidence) => {
  const byId = new Map(blockSpecs.map((block) => [block.id, block]));
  const keyBindings = level.mechanism_bindings.filter((binding) => binding.kind === "key_block" && binding.block_id && byId.has(binding.block_id));
  const lockBindings = level.mechanism_bindings.filter((binding) => binding.kind === "lock_block" && binding.block_id && byId.has(binding.block_id));
  for (const binding of level.mechanism_bindings) {
    const block = byId.get(binding.block_id);
    if (!block) continue;
    if (binding.kind === "numeric_ice") {
      const value = [binding.source_item?.value, binding.source_item?.count].find(isPositiveInteger) ?? 1;
      block.frozen = value;
    } else if (binding.kind === "shell") {
      let layers = asArray(block.__source_mechanism_color_layers).filter((color) => COLORS.includes(color));
      if (layers.length < 2) layers = asArray(binding.expected_layer_colors).filter((color) => COLORS.includes(color));
      if (layers.length < 2) {
        const outer = COLORS.includes(binding.expected_base_color) ? binding.expected_base_color : block.color;
        const inner = (level.palette.find((color) => COLORS.includes(color) && color !== outer)
          ?? COLORS.find((color) => color !== outer));
        layers = [outer, inner];
        fillEvidence.push({ kind: "shell_color_pair", block_id: block.id, reason: "source_layers_incomplete", value: layers });
      }
      layers = [...new Set(layers)].slice(0, 2);
      if (layers.length < 2) {
        layers.push(COLORS.find((color) => color !== layers[0]));
        fillEvidence.push({ kind: "shell_color_distinctness", block_id: block.id, reason: "duplicate_source_layers", value: layers });
      }
      block.layers = layers;
      block.color = layers[0];
    } else if (binding.kind === "axis_block") {
      const axis = binding.source_item?.axis;
      if (axis === "horizontal" || axis === "vertical") block.movementAxis = axis;
      else {
        const bounds = shapeBounds(block.shape);
        block.movementAxis = bounds.width >= bounds.height ? "horizontal" : "vertical";
        fillEvidence.push({ kind: "axis_direction", block_id: block.id, reason: "source_axis_unclear", value: block.movementAxis });
      }
    } else if (binding.kind === "star_block") {
      block.star = true;
    } else if (binding.kind === "bomb") {
      const value = [binding.source_item?.value, binding.source_item?.seconds].find(isPositiveInteger) ?? 1;
      block.timedBombSeconds = value;
    } else if (binding.kind === "circular_double_arrow_marked_block") {
      block.rotationBadge = true;
    }
  }
  if (lockBindings.length) {
    const groupId = `lv${level.id}-key-group`;
    let keys = keyBindings.map((binding) => byId.get(binding.block_id));
    if (!keys.length) {
      const reserved = new Set(lockBindings.map((binding) => binding.block_id));
      const support = blockSpecs.find((block) => !reserved.has(block.id));
      if (support) {
        keys = [support];
        fillEvidence.push({
          kind: "key_support_assignment",
          block_id: support.id,
          reason: "source_lock_present_without_bound_key_payload",
          value: groupId,
        });
      }
    }
    keys.forEach((block) => { block.keyId = groupId; });
    for (const binding of lockBindings) {
      const block = byId.get(binding.block_id);
      if (!block || !keys.length) continue;
      block.lockedBy = groupId;
      block.lockCount = isPositiveInteger(binding.source_item?.lock_count) ? binding.source_item.lock_count : 1;
    }
    if (keyBindings.length > 1 || lockBindings.length > 1) fillEvidence.push({
      kind: "key_lock_grouping",
      reason: "source_group_identity_unclear_deterministic_shared_group",
      key_block_ids: keys.map((block) => block.id),
      lock_block_ids: lockBindings.map((binding) => binding.block_id),
      value: groupId,
    });
  } else for (const binding of keyBindings) {
    const block = byId.get(binding.block_id);
    if (block) block.keyId = `lv${level.id}-unpaired-key-group`;
  }
  for (const block of blockSpecs) delete block.__source_mechanism_color_layers;
};

const generatorRailKey = ({ x, y, quarterTurns }) => `${quarterTurns}:${x},${y}`;
const generatorDirection = (quarterTurns) => quarterTurns === 0
  ? { tangentX: 1, tangentY: 0, outwardX: 0, outwardY: -1 }
  : quarterTurns === 1
    ? { tangentX: 0, tangentY: 1, outwardX: 1, outwardY: 0 }
    : quarterTurns === 2
      ? { tangentX: -1, tangentY: 0, outwardX: 0, outwardY: 1 }
      : { tangentX: 0, tangentY: -1, outwardX: -1, outwardY: 0 };
const generatorGeometry = (anchor) => {
  const direction = generatorDirection(anchor.quarterTurns);
  const rails = [-1, 0, 1].map((tangent) => ({
    x: anchor.x + direction.tangentX * tangent,
    y: anchor.y + direction.tangentY * tangent,
    quarterTurns: anchor.quarterTurns,
  }));
  const corners = [[-1.5, -0.35], [1.5, -0.35], [-1.5, 1], [1.5, 1]].map(([tangent, outward]) => ({
    x: anchor.x + direction.tangentX * tangent + direction.outwardX * outward,
    y: anchor.y + direction.tangentY * tangent + direction.outwardY * outward,
  }));
  const xs = corners.map(({ x }) => x);
  const ys = corners.map(({ y }) => y);
  return {
    rails,
    bounds: {
      x: Math.min(...xs), y: Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys),
    },
  };
};
const generatorBoundsOverlap = (left, right) => (
  Math.min(left.x + left.width, right.x + right.width) - Math.max(left.x, right.x) > 1e-9
  && Math.min(left.y + left.height, right.y + right.height) - Math.max(left.y, right.y) > 1e-9
);
const generatorExitRails = (gates, flipDoors, width, height) => {
  const result = new Set();
  for (const exit of [...gates, ...flipDoors]) for (
    let index = Math.round(exit.offset);
    index < Math.round(exit.offset) + Math.max(1, Math.round(exit.size));
    index += 1
  ) {
    const rail = exit.side === "top" ? { x: index + 0.5, y: 0, quarterTurns: 0 }
      : exit.side === "right" ? { x: width, y: index + 0.5, quarterTurns: 1 }
        : exit.side === "bottom" ? { x: index + 0.5, y: height, quarterTurns: 2 }
          : { x: 0, y: index + 0.5, quarterTurns: 3 };
    result.add(generatorRailKey(rail));
  }
  return result;
};
const exposedGeneratorRails = (playable, width, height) => {
  const rails = [];
  const floor = (x, y) => x >= 0 && y >= 0 && x < width && y < height && playable.has(keyOf(x, y));
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    if (!floor(x, y)) continue;
    if (!floor(x, y - 1)) rails.push({ x: x + 0.5, y, quarterTurns: 0 });
    if (!floor(x + 1, y)) rails.push({ x: x + 1, y: y + 0.5, quarterTurns: 1 });
    if (!floor(x, y + 1)) rails.push({ x: x + 0.5, y: y + 1, quarterTurns: 2 });
    if (!floor(x - 1, y)) rails.push({ x, y: y + 0.5, quarterTurns: 3 });
  }
  return rails;
};
const preferredGeneratorAnchor = (generator, width, height) => generator.rimAnchor
  ? generator.rimAnchor
  : generator.side === "top" ? { x: generator.offset + 0.5, y: 0, quarterTurns: 0 }
    : generator.side === "right" ? { x: width, y: generator.offset + 0.5, quarterTurns: 1 }
      : generator.side === "bottom" ? { x: generator.offset + 0.5, y: height, quarterTurns: 2 }
        : { x: 0, y: generator.offset + 0.5, quarterTurns: 3 };
const generatorPlacementScore = (candidate, generator, width, height) => {
  const preferred = preferredGeneratorAnchor(generator, width, height);
  const turnDistance = Math.min(
    Math.abs(candidate.anchor.quarterTurns - preferred.quarterTurns),
    4 - Math.abs(candidate.anchor.quarterTurns - preferred.quarterTurns),
  );
  return turnDistance * 10_000
    + (candidate.anchor.x - preferred.x) ** 2 + (candidate.anchor.y - preferred.y) ** 2;
};
const legalGeneratorRimCandidates = (playable, width, height, gates, flipDoors) => {
  const exposed = exposedGeneratorRails(playable, width, height);
  const exposedKeys = new Set(exposed.map(generatorRailKey));
  const exitKeys = generatorExitRails(gates, flipDoors, width, height);
  return exposed.flatMap((anchor) => {
    const geometry = generatorGeometry(anchor);
    const railKeys = geometry.rails.map(generatorRailKey);
    return railKeys.every((key) => exposedKeys.has(key) && !exitKeys.has(key))
      ? [{ anchor, railKeys, bounds: geometry.bounds }] : [];
  });
};
const placeGeneratorsOnExposedRim = (levelId, width, height, playable, gates, flipDoors, generators) => {
  if (!generators.length) return;
  const candidates = legalGeneratorRimCandidates(playable, width, height, gates, flipDoors);
  const ordered = generators.map((generator) => candidates.toSorted((left, right) => (
    generatorPlacementScore(left, generator, width, height)
      - generatorPlacementScore(right, generator, width, height)
    || generatorRailKey(left.anchor).localeCompare(generatorRailKey(right.anchor))
  )));
  const assignments = Array(generators.length);
  const occupiedRails = new Set();
  const occupiedBounds = [];
  const visit = (index) => {
    if (index === generators.length) return true;
    for (const candidate of ordered[index]) {
      if (candidate.railKeys.some((key) => occupiedRails.has(key))) continue;
      if (occupiedBounds.some((bounds) => generatorBoundsOverlap(bounds, candidate.bounds))) continue;
      assignments[index] = candidate;
      candidate.railKeys.forEach((key) => occupiedRails.add(key));
      occupiedBounds.push(candidate.bounds);
      if (visit(index + 1)) return true;
      occupiedBounds.pop();
      candidate.railKeys.forEach((key) => occupiedRails.delete(key));
    }
    return false;
  };
  if (!visit(0)) throw new Error(`Lv${levelId}: generators cannot occupy exposed three-rail spans without exit or machine overlap`);
  const sides = ["top", "right", "bottom", "left"];
  generators.forEach((generator, index) => {
    const anchor = assignments[index].anchor;
    generator.side = sides[anchor.quarterTurns];
    generator.offset = anchor.quarterTurns === 0 || anchor.quarterTurns === 2 ? anchor.x - 0.5 : anchor.y - 0.5;
    generator.rimSpan = 3;
    generator.rimMount = "rim";
    generator.rimAnchor = { ...anchor };
  });
};

const buildGenerators = (level, playable, physicalCoverCells, stageBlocksById, fillEvidence, coloredGridByCell) => {
  const generators = [];
  const queuedIds = new Set();
  const audits = [];
  for (const event of level.stage_events.filter((entry) => entry.event_type === "generator_queue")) {
    const stageIds = asArray(event.partition_ids);
    const queueBlocks = stageIds.flatMap((stageId) => stageBlocksById.get(stageId) ?? [])
      .sort((left, right) => (left.__queue_index ?? Number.MAX_SAFE_INTEGER) - (right.__queue_index ?? Number.MAX_SAFE_INTEGER)
        || compareText(left.id, right.id));
    if (!queueBlocks.length) continue;
    const frozenCargo = queueBlocks.filter((block) => Number.isInteger(block.frozen) && block.frozen > 0);
    if (frozenCargo.length) {
      throw new Error(`Lv${level.id}: generator queue cannot contain frozen cargo (${frozenCargo.map((block) => block.id).join(", ")})`);
    }
    const producer = asArray(event.producers)[0] ?? {};
    const sourceGenerator = asArray(level.mechanism_contract?.generators)[producer.source_index ?? generators.length] ?? {};
    let side = SIDES.includes(sourceGenerator.side) ? sourceGenerator.side : null;
    if (!side) {
      const label = String(sourceGenerator.visual_position ?? sourceGenerator.side ?? "").toLowerCase();
      side = SIDES.find((candidate) => label.includes(candidate)) ?? "top";
      fillEvidence.push({ kind: "generator_side", producer_id: producer.producer_id, reason: "source_side_unclear", value: side });
    }
    const limit = side === "top" || side === "bottom" ? level.board.width : level.board.height;
    const offset = isInteger(sourceGenerator.offset) && sourceGenerator.offset >= 0 && sourceGenerator.offset < limit
      ? sourceGenerator.offset : Math.floor((limit - 1) / 2);
    if (!isInteger(sourceGenerator.offset)) fillEvidence.push({
      kind: "generator_rim_offset", producer_id: producer.producer_id, reason: "source_offset_unclear", value: offset,
    });
    const spawnCandidates = [];
    for (let y = 0; y < level.board.height; y += 1) for (let x = 0; x < level.board.width; x += 1) {
      const fits = queueBlocks.every((block) => placementCells(block.shape, x, y)
        .every((key) => playable.has(key) && !physicalCoverCells.has(key)
          && (!coloredGridByCell.has(key) || coloredGridByCell.get(key) === block.color)));
      if (fits) spawnCandidates.push([x, y]);
    }
    if (!spawnCandidates.length) {
      for (let y = 0; y < level.board.height; y += 1) for (let x = 0; x < level.board.width; x += 1) {
        const fits = queueBlocks.every((block) => placementCells(block.shape, x, y).every((key) => (
          playable.has(key) && (!coloredGridByCell.has(key) || coloredGridByCell.get(key) === block.color)
        )));
        if (fits) spawnCandidates.push([x, y]);
      }
    }
    if (!spawnCandidates.length) throw new Error(`Lv${level.id}: no common generator spawn for ${event.event_group_id}`);
    const spawn = spawnCandidates[0];
    const id = `lv${level.id}-${producer.producer_id ?? `generator-${generators.length + 1}`}`;
    const triggerText = String(sourceGenerator.trigger ?? producer.trigger ?? "").toLowerCase();
    const timed = triggerText.includes("time") || triggerText.includes("second");
    const generator = {
      id,
      side,
      offset,
      rimSpan: 3,
      rimMount: "rim",
      spawn,
      queueBlockIds: queueBlocks.map((block) => block.id),
      trigger: timed ? "time" : "move",
      ...(timed ? { intervalSeconds: 3, initialDelaySeconds: 3 } : {}),
    };
    generators.push(generator);
    queueBlocks.forEach((block) => queuedIds.add(block.id));
    audits.push({
      generator_id: id,
      event_group_id: event.event_group_id,
      queue_block_ids: generator.queueBlockIds,
      source: sourceGenerator,
      runtime: generator,
      field_evidence: {
        side: SIDES.includes(sourceGenerator.side) ? "source" : "design_fill_source_side_unclear",
        offset: isInteger(sourceGenerator.offset) ? "source" : "design_fill_source_offset_unclear",
        spawn: "design_fill_common_shape_compatible_anchor",
        trigger: timed ? "source_time_semantics" : triggerText && !triggerText.includes("unclear")
          ? "source_move_or_clear_interpreted_as_move" : "design_fill_source_trigger_unclear_move",
        rim_mount: "design_fill_exposed_three_rail_rim_without_exit_occlusion",
      },
    });
  }
  const canonicalGenerators = asArray(level.mechanism_contract?.generators);
  if (canonicalGenerators.length !== generators.length) {
    throw new Error(`Lv${level.id}: built ${generators.length} generators, canonical contract requires ${canonicalGenerators.length}`);
  }
  const canonicalQueueLengths = canonicalGenerators.map((generator) => (
    isInteger(generator.queue_length) ? generator.queue_length
      : isInteger(generator.queue_count) ? generator.queue_count
        : Array.isArray(generator.queue) ? generator.queue.length : null
  ));
  generators.forEach((generator, index) => {
    const expected = canonicalQueueLengths[index];
    if (expected !== null && generator.queueBlockIds.length !== expected) {
      throw new Error(`Lv${level.id}: generator ${index + 1} queue has ${generator.queueBlockIds.length} blocks, canonical contract requires ${expected}`);
    }
  });
  return { generators, queuedIds, audits };
};

const buildLevel = (level) => {
  const initialPlayable = new Set(level.board.playable_cells.map(([x, y]) => keyOf(x, y)));
  const allocated = allocateGates(level, initialPlayable);
  const auditedPhysicalCells = new Set(level.stage_events
    .filter((entry) => entry.event_type === "cover_clear")
    .flatMap((event) => asArray(event.producers))
    .flatMap((producer) => {
      const audited = auditedCoverRegion(level, producer);
      return audited ? rectangleCells(audited.region) : [];
    }));
  const auditedLayoutSupportCells = level.id === 137 ? ["2,6"] : [];
  const adjusted = adjustPlayableMask(level, new Set([
    ...allocated.requiredCells,
    ...auditedPhysicalCells,
    ...auditedLayoutSupportCells,
  ]));
  let playable = adjusted.cells;
  const fillEvidence = [];
  const sourceBlocks = level.stages.flatMap((stage) => stage.blocks.map((block) => ({ ...block, __stage: stage.id })));
  const blocks = sourceBlocks.map((block) => ({
    id: block.id,
    x: block.x,
    y: block.y,
    shape: block.shape,
    color: COLORS.includes(block.color) ? block.color : (level.palette.find((color) => COLORS.includes(color)) ?? "red"),
    __stage: block.__stage,
    __shape_id: block.shape_id,
    __queue_index: block.queue_index,
    __source_mechanism_color_layers: block.mechanism_color_layers,
  }));
  if (level.id === 165) {
    // The source frame fixes two disjoint 2x10 physical shutters and the
    // opening payload occupies the remaining 2x10 strip.  The unresolved
    // hidden pool nevertheless contains one H3: width 3 makes it impossible
    // to place behind either exact shutter, while widening a shutter would
    // overlap its neighbor or change the visible opening.  Rotate only this
    // unobserved hidden triomino to V3; cell count, color, cohort inventory,
    // counters, shutter geometry, and the opening frame all remain intact.
    const rotated = blocks.find((block) => block.id === "lv165-pooled-hidden-b01");
    if (!rotated || rotated.__shape_id !== "H3") throw new Error("Lv165: expected unresolved hidden H3 rotation target drifted");
    rotated.shape = [[0, 0], [0, 1], [0, 2]];
    rotated.__shape_id = "V3";
    fillEvidence.push({
      kind: "hidden_shape_orientation",
      block_id: rotated.id,
      reason: "two_exact_2x10_shutters_cannot_contain_width_3_hidden_piece",
      from: "H3",
      value: "V3",
    });
  }
  if (level.id === 188) {
    // The source fixes 5x3 + 3x4 physical shutters (27 total cells), while
    // the design-filled unresolved hidden pool totals 28 cells.  No ownership
    // permutation or rotation can satisfy that area bound.  Shrink one H2 to
    // a same-color SINGLE: the minimum one-cell correction keeps both source
    // shutter rectangles, counters, hidden block count, and opening unchanged.
    const shrunk = blocks.find((block) => block.id === "lv188-pooled-hidden-b10");
    if (!shrunk || shrunk.__shape_id !== "H2") throw new Error("Lv188: expected unresolved hidden H2 shrink target drifted");
    shrunk.shape = [[0, 0]];
    shrunk.__shape_id = "SINGLE";
    fillEvidence.push({
      kind: "hidden_shape_minimum_area_correction",
      block_id: shrunk.id,
      reason: "hidden_28_cells_exceed_exact_27_cell_physical_shutter_capacity",
      from: "H2",
      value: "SINGLE",
    });
  }
  if (level.id === 192) {
    // The exact source shutter is 8x2, but the inferred/unobserved hidden
    // batch contains a height-3 V3.  Rotate that triomino to H3 so the source
    // rectangle, counter, hidden count/area, colors, and opening stay exact.
    const rotated = blocks.find((block) => block.id === "lv192-cover-count-6-inferred-batch-b01");
    if (!rotated || rotated.__shape_id !== "V3") throw new Error("Lv192: expected inferred hidden V3 rotation target drifted");
    rotated.shape = [[0, 0], [1, 0], [2, 0]];
    rotated.__shape_id = "H3";
    fillEvidence.push({
      kind: "hidden_shape_orientation",
      block_id: rotated.id,
      reason: "exact_8x2_shutter_cannot_contain_height_3_inferred_piece",
      from: "V3",
      value: "H3",
    });
  }
  applyMechanismBindings(level, blocks, fillEvidence);
  for (const block of blocks) {
    const formalColor = block.__shape_id === "L5" ? "green" : block.__shape_id === "T6" ? "yellow" : null;
    if (!formalColor) continue;
    const previous = block.layers?.[0] ?? block.color;
    block.color = formalColor;
    if (block.layers?.length) {
      const inner = block.layers.find((color) => color !== formalColor)
        ?? COLORS.find((color) => color !== formalColor);
      block.layers = [formalColor, inner];
    }
    if (previous !== formalColor) fillEvidence.push({
      kind: "formal_whole_piece_art_color_guard",
      block_id: block.id,
      shape_id: block.__shape_id,
      reason: "shape17_18_runtime_art_requires_canonical_display_color",
      from: previous,
      value: formalColor,
    });
  }
  const coloredGrids = asArray(level.mechanism_contract?.colored_grid).map((grid, index) => ({
    id: `lv${level.id}-colored-grid-${String(index + 1).padStart(2, "0")}`,
    color: COLORS.includes(grid.color) ? grid.color : (level.palette.find((color) => COLORS.includes(color)) ?? "red"),
    cells: asArray(grid.cells).filter(([x, y]) => isInteger(x) && isInteger(y) && playable.has(keyOf(x, y))),
  })).filter((grid) => grid.cells.length > 0);
  const coloredGridByCell = new Map(coloredGrids.flatMap((grid) => grid.cells.map(([x, y]) => [keyOf(x, y), grid.color])));
  const cellAllowed = (block, key) => !coloredGridByCell.has(key) || coloredGridByCell.get(key) === block.color;
  const byStage = new Map(level.stages.map((stage) => [stage.id, blocks.filter((block) => block.__stage === stage.id)]));
  const coverBuild = buildCovers(level, playable);
  const opening = byStage.get(level.opening_stage_id) ?? [];
  const physicalCoverCells = () => new Set(coverBuild.covers.filter((cover) => cover.physical)
    .flatMap((cover) => rectangleCells(cover.region)));
  let openingPack = packBlocks(
    opening, playable, physicalCoverCells(), level.board.width, level.board.height, 350_000, new Set(), cellAllowed,
  );
  if (!openingPack) {
    const downgradeOrder = coverBuild.covers.filter((cover) => cover.physical && !cover.audited_physical).sort((left, right) => {
      const overlap = (cover) => rectangleCells(cover.region).filter((cell) => sourceBlocks
        .some((block) => block.__stage === level.opening_stage_id && block.cells.some(([x, y]) => keyOf(x, y) === cell))).length;
      return overlap(right) - overlap(left)
        || right.region.w * right.region.h - left.region.w * left.region.h
        || compareText(left.id, right.id);
    });
    for (const cover of downgradeOrder) {
      cover.physical = false;
      cover.downgrade_reason = "opening_payload_cannot_be_repacked_outside_cover_footprint";
      openingPack = packBlocks(
        opening, playable, physicalCoverCells(), level.board.width, level.board.height, 350_000, new Set(), cellAllowed,
      );
      if (openingPack) break;
    }
  }
  if (!openingPack) {
    // A very sparse source mask can be completely occupied by the opening
    // payload. Adding an observed-but-unlocated gate then requires reshaping
    // the outline rather than swapping an arbitrary occupied cell (Lv115 and
    // Lv196 are the canonical cases). Repack on the unchanged rows/cols, force
    // every gate boundary cell to be occupied/playable, and derive a new mask
    // with exactly the source playable-cell count.
    const fullBoard = new Set();
    for (let y = 0; y < level.board.height; y += 1) for (let x = 0; x < level.board.width; x += 1) {
      fullBoard.add(keyOf(x, y));
    }
    // A gate may legitimately front a physical shutter at the rim (Lv146's
    // two upper covers do this in the source frame).  The shutter already
    // guarantees that boundary cell is playable, so only uncovered gate cells
    // must be occupied by the visible opening payload during the mask repack.
    const uncoveredGateCells = level.id === 146
      ? new Set([...allocated.requiredCells].filter((key) => !physicalCoverCells().has(key)))
      : allocated.requiredCells;
    const fallbackPack = packBlocks(
      opening, fullBoard, physicalCoverCells(), level.board.width, level.board.height, 2_000_000,
      uncoveredGateCells, cellAllowed,
    );
    if (!fallbackPack) throw new Error(`Lv${level.id}: opening cannot cover required gate cells in a reshaped source-size mask`);
    const rebuilt = new Set([...allocated.requiredCells, ...physicalCoverCells()]);
    for (const placement of fallbackPack.placements.values()) placement.cells.forEach((key) => rebuilt.add(key));
    const fillOrder = [
      ...level.board.playable_cells.map(([x, y]) => keyOf(x, y)),
      ...[...fullBoard].sort(compareText),
    ];
    for (const key of fillOrder) {
      if (rebuilt.size >= runtimePlayableCellTarget(level)) break;
      rebuilt.add(key);
    }
    if (rebuilt.size !== runtimePlayableCellTarget(level)) {
      throw new Error(`Lv${level.id}: rebuilt mask cannot preserve playable-cell count`);
    }
    const originalMask = new Set(level.board.playable_cells.map(([x, y]) => keyOf(x, y)));
    adjusted.audit = {
      source_playable_cell_count: level.board.playable_cell_count,
      runtime_playable_cell_count: rebuilt.size,
      added_for_gate_boundaries: [...rebuilt].filter((key) => !originalMask.has(key)).sort(compareText),
      removed_to_preserve_count: [...originalMask].filter((key) => !rebuilt.has(key)).sort(compareText),
      status: "design_fill_full_mask_repack_for_gate_boundaries",
    };
    playable = rebuilt;
    openingPack = fallbackPack;
  }
  const relocationEvidence = [];
  const assignPlacements = (stageId, stageBlocks, packed, reason) => {
    for (const block of stageBlocks) {
      const placement = packed.placements.get(block.id);
      if (!placement) throw new Error(`Lv${level.id}: missing placement for ${block.id}`);
      if (block.x !== placement.x || block.y !== placement.y) relocationEvidence.push({
        block_id: block.id, stage_id: stageId, from: [block.x, block.y], to: [placement.x, placement.y], reason,
      });
      block.x = placement.x; block.y = placement.y;
    }
  };
  assignPlacements(level.opening_stage_id, opening, openingPack, "gate_mask_or_cover_footprint_runtime_repack");
  for (const stage of level.stages) {
    if (stage.id === level.opening_stage_id || stage.kind === "generator_queue") continue;
    const stageBlocks = byStage.get(stage.id) ?? [];
    const packed = packBlocks(
      stageBlocks, playable, new Set(), level.board.width, level.board.height, 350_000, new Set(), cellAllowed,
    );
    if (!packed) throw new Error(`Lv${level.id}: stage ${stage.id} cannot be packed in runtime mask`);
    assignPlacements(stage.id, stageBlocks, packed, "gate_boundary_mask_swap_runtime_repack");
  }
  const exactStageCovers = new Map();
  for (const stage of level.stages.filter((entry) => entry.kind === "hidden_cover_event_batch")) {
    const ids = coverBuild.eventToCoverIds.get(stage.event_group_id) ?? [];
    if (ids.length) exactStageCovers.set(stage.id, ids);
  }
  for (const [stageId, coverIds] of exactStageCovers) {
    for (const [index, block] of (byStage.get(stageId) ?? []).entries()) {
      // Lv171 has one simultaneous source event spanning five disjoint cover
      // panels, while membership inside that event is unobserved.  Its H3 and
      // L4 require the central 4x5 panel; the V2 fits the 1x3 side panel.
      const coverId = level.id === 171 ? coverIds[[2, 2, 0][index]] : coverIds[0];
      block.shutterId = coverId;
      coverBuild.covers.find((cover) => cover.id === coverId)?.block_ids.push(block.id);
    }
  }
  const auditedPooledCoverIndex = (block, index, coverCount) => {
    if (level.id === 113) {
      return block.id === "lv113-pooled-hidden-b10" ? 0
        : block.id === "lv113-pooled-hidden-b13" ? 1 : index % coverCount;
    }
    if (level.id === 134) {
      const bySuffix = [2, 0, 6, 1, 7, 3, 4, 5, 2];
      return bySuffix[index];
    }
    if (level.id === 142) {
      // The source leaves cross-trigger membership unknown. Keep all nine
      // shapes, but put the only height<=2 pair behind the exact 7x2 lower
      // cover; distribute the RECT2X3/V3 pieces across the 3x5 and 7x4 covers.
      const bySuffix = [1, 2, 0, 0, 0, 1, 1, 1, 2];
      return bySuffix[index];
    }
    if (level.id === 146) {
      // Cross-trigger ownership is explicitly unresolved.  The only H2 must
      // use the height-2 count-11 shutter; the three V3 pieces then fit the
      // three height>=3 source rectangles without changing either inventory.
      const bySuffix = [1, 2, 3, 0];
      return bySuffix[index];
    }
    if (level.id === 148) {
      // Keep the unresolved pool split 5/5, but honor the exact 7x3 and 3x3
      // source rectangles: the small cohort must total at most nine cells.
      const bySuffix = [0, 0, 0, 1, 1, 1, 0, 1, 0, 1];
      return bySuffix[index];
    }
    if (level.id === 149) {
      // The four source rectangles are 5x2, 3x2, 5x3, and 3x3 while source
      // trigger ownership is unresolved.  Partition by shape so every cohort
      // tiles its exact footprint; per-cover hidden counts were not observed.
      const bySuffix = [3, 0, 0, 2, 2, 0, 0, 3, 2, 2, 1, 1, 1, 3, 2, 3];
      return bySuffix[index];
    }
    if (level.id === 164) {
      // The count-3 cover is only 3x4; source ownership is unresolved, so put
      // its V3/L3 plus four singles there and balance the remaining inventory
      // across the two exact 7x3 source covers.
      const bySuffix = [1, 2, 0, 0, 1, 2, 1, 1, 2, 2, 1, 2, 1, 2, 0, 0, 0, 0, 1, 1, 2, 2];
      return bySuffix[index];
    }
    if (level.id === 166) {
      // Source ownership is unresolved.  Tile the exact 3x4 count-4 shutter
      // with H3 + V3 + L3 + three singles (12 cells); the remaining 27 cells
      // fit behind the exact 3x10 count-15 shutter.
      const bySuffix = [0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1];
      return bySuffix[index];
    }
    if (level.id === 169) {
      // The 3x2 count-2 cover cannot contain the pooled SQ3.  Source trigger
      // ownership is unresolved, so give it the two H3 rows and keep the SQ3
      // behind the exact 4x4 cover.
      const bySuffix = [1, 0, 1, 0, 2, 1, 1, 2];
      return bySuffix[index];
    }
    if (level.id === 182) {
      // Five count-10 panels are only one cell wide.  Preserve the unresolved
      // inventory by placing the two V2s behind compatible narrow panels and
      // the SQ3/SQ2/SQ2 cohort behind the exact 7x5 count-4 panel.
      const bySuffix = [0, 1, 5, 5, 5];
      return bySuffix[index];
    }
    if (level.id === 188) {
      // After the audited one-cell correction, tile the exact 5x3 and 3x4
      // source rectangles at their full 15/12-cell capacities.
      const bySuffix = [1, 1, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0];
      return bySuffix[index];
    }
    if (level.id === 194) {
      // The two one-row count-7 shutters may only receive horizontal pieces;
      // the exact 2x3 count-5 shutter receives RECT2X3.  All other unresolved
      // payload remains behind the 8x6 count-10 source shutter.
      const bySuffix = [3, 1, 0, 0, 0, 0, 1, 0, 1, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      return bySuffix[index];
    }
    if (level.id === 199) {
      // Swap the unresolved SQ3/V3 ownership: SQ3 needs a width-3, height-3
      // panel and therefore belongs behind the 3x5 count-18 shutter, while V3
      // fits the 4x3 count-7 shutter.  Keep all five cohort cardinalities 4.
      const bySuffix = [1, 0, 2, 3, 4, 0, 1, 2, 3, 4, 0, 1, 2, 3, 4, 0, 1, 2, 3, 4];
      return bySuffix[index];
    }
    return index % coverCount;
  };
  for (const stage of level.stages.filter((candidate) => candidate.kind === "pooled_hidden_batch")) {
    const candidateCoverIds = asArray(stage.event_group_ids)
      .flatMap((eventGroupId) => coverBuild.eventToCoverIds.get(eventGroupId) ?? []);
    const coverCycle = coverBuild.covers.filter((cover) => candidateCoverIds.includes(cover.id));
    if (!coverCycle.length) continue;
    (byStage.get(stage.id) ?? []).forEach((block, index) => {
      // The source explicitly leaves these cross-trigger identities unresolved.
      // Keep deterministic cohort cardinalities, but never assign a pooled
      // payload to a cover outside its candidate event groups (Lv138 exposed
      // the previous whole-level round-robin leak).
      const cover = coverCycle[auditedPooledCoverIndex(block, index, coverCycle.length)];
      block.shutterId = cover.id;
      cover.block_ids.push(block.id);
      fillEvidence.push({
        kind: "pooled_hidden_assignment",
        block_id: block.id,
        reason: "source_trigger_assignment_unresolved_candidate_cover_round_robin",
        value: cover.id,
      });
    });
  }
  // A physical cover, its collision footprint, and the batch it reveals are
  // one player-facing region.  The legacy builder packed pooled stages over
  // the whole board before assigning shutter ids, which could make a cover
  // display one area and reveal blocks from another.  Repack each final cohort
  // inside its own rectangle and fail loudly when the authored geometry cannot
  // contain the assigned inventory.
  for (const cover of coverBuild.covers.filter((candidate) => candidate.physical)) {
    const cohort = blocks.filter((block) => block.shutterId === cover.id);
    if (!cohort.length) continue;
    const coverCells = new Set(rectangleCells(cover.region));
    const packed = packBlocks(
      cohort,
      coverCells,
      new Set(),
      level.board.width,
      level.board.height,
      350_000,
      new Set(),
      cellAllowed,
    );
    if (!packed) {
      throw new Error(`Lv${level.id}: physical shutter ${cover.id} cannot contain its assigned hidden cohort`);
    }
    assignPlacements("shutter-cohort", cohort, packed, "physical_shutter_region_repack");
  }
  const physicalCells = physicalCoverCells();
  const generatorBuild = buildGenerators(level, playable, physicalCells, byStage, fillEvidence, coloredGridByCell);
  // Lv114 receives a solver-certified playable/exit repair below. Its single
  // generator is mounted only after that repair so placement is evaluated
  // against the actual emitted rim rather than this superseded source mask.
  if (level.id !== 114) {
    placeGeneratorsOnExposedRim(
      level.id, level.board.width, level.board.height, playable,
      allocated.gates, allocated.flipDoors, generatorBuild.generators,
    );
  }
  generatorBuild.audits.forEach((audit) => {
    const { runtime, source: sourceGenerator, field_evidence: fieldEvidence } = audit;
    fieldEvidence.side = sourceGenerator.side === runtime.side
      ? "source" : "design_fill_nearest_legal_exposed_rim";
    fieldEvidence.offset = isInteger(sourceGenerator.offset) && sourceGenerator.offset === runtime.offset
      ? "source" : "design_fill_nearest_legal_exposed_rim";
    fieldEvidence.rim_anchor = "design_fill_exposed_three_rail_anchor";
  });
  for (const block of blocks) {
    if (generatorBuild.queuedIds.has(block.id)) delete block.shutterId;
    delete block.__stage;
    delete block.__shape_id;
    delete block.__queue_index;
  }
  const shutters = coverBuild.covers.map((cover) => {
    const runtimeRegion = cover.physical ? cover.region : {
      x: Number([...playable][0].split(",")[0]), y: Number([...playable][0].split(",")[1]), w: 1, h: 1,
    };
    return {
      id: cover.id,
      x: runtimeRegion.x,
      y: runtimeRegion.y,
      width: runtimeRegion.w,
      height: runtimeRegion.h,
      count: cover.count,
      skin: cover.physical ? "shutter" : "staging",
    };
  });
  const nowRepresented = new Set(["timed_bomb", "circular_double_arrow_marked_block", "flip_door", "colored_grid"]);
  const unsupported = level.runtime_unsupported_mechanisms.filter((name) => !nowRepresented.has(name))
    .filter((value, index, values) => values.indexOf(value) === index).sort(compareText);
  const runtime = {
    id: level.id,
    name: `竞品映射 ${level.level_id}`,
    difficulty: "super",
    timeSeconds: isPositiveInteger(level.time_seconds) ? level.time_seconds : 180,
    reward: 200,
    width: level.board.width,
    height: level.board.height,
    playable: [...playable].map((key) => key.split(",").map(Number)).sort(pointSort),
    gates: allocated.gates,
    blocks,
    ...(allocated.flipDoors.length ? { flipDoors: allocated.flipDoors } : {}),
    ...(coloredGrids.length ? { coloredGrids } : {}),
    ...(shutters.length ? { shutters } : {}),
    ...(generatorBuild.generators.length ? { generators: generatorBuild.generators } : {}),
  };
  const mechanismAudit = {
    represented: {
      directional_exits: allocated.gates.length,
      numeric_ice: level.mechanism_bindings.filter((binding) => binding.kind === "numeric_ice" && binding.block_id).length,
      shells: level.mechanism_bindings.filter((binding) => binding.kind === "shell" && binding.block_id).length,
      key_blocks: level.mechanism_bindings.filter((binding) => binding.kind === "key_block" && binding.block_id).length,
      lock_blocks: level.mechanism_bindings.filter((binding) => binding.kind === "lock_block" && binding.block_id).length,
      axis_blocks: level.mechanism_bindings.filter((binding) => binding.kind === "axis_block" && binding.block_id).length,
      star_blocks: level.mechanism_bindings.filter((binding) => binding.kind === "star_block" && binding.block_id).length,
      covers: coverBuild.covers.length,
      generators: generatorBuild.generators.length,
      timed_bombs: level.mechanism_bindings.filter((binding) => binding.kind === "bomb" && binding.block_id).length,
      circular_double_arrow_markers: level.mechanism_bindings.filter((binding) => (
        binding.kind === "circular_double_arrow_marked_block" && binding.block_id
      )).length,
      flip_doors: allocated.flipDoors.length,
      colored_grids: coloredGrids.length,
    },
    unsupported_runtime_semantics: unsupported,
    source_unresolved_contracts: [
      ...asArray(level.mechanism_contract?.staged_frames).map((entry, index) => ({
        kind: "staged_frame",
        source_index: index,
        reason: "source_classification_or_trigger_geometry_unresolved_not_safe_to_invent",
        source_item: entry,
      })),
      ...level.mechanism_bindings.filter((binding) => !binding.block_id).map((binding) => ({
        kind: binding.kind,
        binding_id: binding.id,
        reason: "source_mechanism_count_or_target_block_unresolved",
        source_item: binding.source_item,
      })),
    ],
    marker_only_binding_payloads: level.mechanism_bindings.filter((binding) => (
      binding.kind === "circular_double_arrow_marked_block"
    )).map((binding) => ({ kind: binding.kind, block_id: binding.block_id, source_item: binding.source_item })),
    bomb_failure_policy: "omitted_source_does_not_prove_failure_at_zero",
  };
  return {
    runtime,
    audit: {
      level_id: level.level_id,
      candidate_status: level.status,
      source_missing: level.provenance?.source_classification === "source_missing_external_reference_only",
      solver_run: false,
      runtime_projection_status: "generated_validate_pending",
      invariants: {
        rows: runtime.height,
        cols: runtime.width,
        playable_cell_count: runtime.playable.length,
        full_block_count: runtime.blocks.length,
        source_full_block_count: level.stages.reduce((sum, stage) => sum + stage.blocks.length, 0),
        shape_histogram_preserved: !fillEvidence.some((item) => String(item.kind).startsWith("hidden_shape_")),
        shape_adjustments: fillEvidence.filter((item) => String(item.kind).startsWith("hidden_shape_")),
      },
      mask: adjusted.audit,
      gates: allocated.audit,
      covers: coverBuild.covers.map((cover) => ({
        cover_id: cover.id,
        event_group_id: cover.event_group_id,
        producer_id: cover.producer_id,
        source_region: cover.source_region,
        source_target_region: cover.source_target_region,
        runtime_region: cover.region,
        region_provenance: cover.region_provenance,
        runtime_skin: cover.physical ? "shutter" : "staging",
        downgrade_reason: cover.downgrade_reason,
        counter_value: cover.count,
        assigned_block_ids: cover.block_ids,
      })),
      generators: generatorBuild.audits,
      block_relocations: relocationEvidence,
      design_fill_evidence: fillEvidence,
      physical_shutter_contract_proof: physicalShutterContractProof(level),
      mechanisms: mechanismAudit,
    },
  };
};

const built = source.levels.map(buildLevel);
const levels = built.map((entry) => entry.runtime);
const expectedIds = Array.from({ length: 100 }, (_, index) => index + 101);
if (!same(levels.map((level) => level.id), expectedIds)) throw new Error("Runtime projection is not contiguous Lv101-Lv200");

const sourceFieldMatches = (value, expected) => Object.entries(expected).every(([field, target]) => (
  same(value[field], target)
));
const applyTargetFields = (value, target) => {
  for (const [field, next] of Object.entries(target)) {
    if (next === null) delete value[field];
    else value[field] = structuredClone(next);
  }
};
const openingSameColorComponents = (level) => {
  const hidden = new Set(asArray(level.generators).flatMap((generator) => generator.queueBlockIds));
  // Shutter-bound blocks are staged payload and are not visible at opening;
  // triggerBlockIds are visible trigger blocks and must remain in this audit.
  const blocks = level.blocks.filter((block) => !hidden.has(block.id)
    && !(block.shutterId && asArray(level.shutters)
      .some((shutter) => shutter.id === block.shutterId && shutter.count > 0)));
  const cells = new Map(blocks.map((block) => [
    block.id,
    block.shape.map(([dx, dy]) => [block.x + dx, block.y + dy]),
  ]));
  const neighbors = new Map(blocks.map((block) => [block.id, new Set()]));
  const visibleColor = (block) => block.layers?.[0] ?? block.color;
  for (let index = 0; index < blocks.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < blocks.length; otherIndex += 1) {
      const left = blocks[index];
      const right = blocks[otherIndex];
      if (visibleColor(left) !== visibleColor(right)) continue;
      const touches = cells.get(left.id).some(([leftX, leftY]) => cells.get(right.id)
        .some(([rightX, rightY]) => Math.abs(leftX - rightX) + Math.abs(leftY - rightY) === 1));
      if (!touches) continue;
      neighbors.get(left.id).add(right.id);
      neighbors.get(right.id).add(left.id);
    }
  }
  const byId = new Map(blocks.map((block) => [block.id, block]));
  const unseen = new Set(blocks.map((block) => block.id));
  const components = [];
  while (unseen.size) {
    const first = unseen.values().next().value;
    unseen.delete(first);
    const queue = [first];
    const ids = [];
    while (queue.length) {
      const id = queue.shift();
      ids.push(id);
      for (const next of neighbors.get(id)) if (unseen.delete(next)) queue.push(next);
    }
    components.push({ color: visibleColor(byId.get(first)), block_ids: ids.sort(compareText) });
  }
  return components;
};

const repairPreservationSnapshot = (level) => {
  const exits = [...level.gates, ...asArray(level.flipDoors)];
  const mechanismArrays = ["coloredGrids", "shutters", "generators", "elevators", "conveyors"];
  return {
    board_dimensions: { width: level.width, height: level.height },
    playable_mask: level.playable,
    time_seconds: level.timeSeconds,
    block_count: level.blocks.length,
    block_shapes: level.blocks.map((block) => ({ id: block.id, shape: block.shape })),
    block_positions: level.blocks.map((block) => ({ id: block.id, x: block.x, y: block.y })),
    mechanism_counts: {
      gates: level.gates.length,
      flipDoors: asArray(level.flipDoors).length,
      ...Object.fromEntries(mechanismArrays.map((field) => [field, asArray(level[field]).length])),
    },
    mechanism_counters: {
      exits: exits.map((exit) => ({
        id: exit.id,
        frozen: exit.frozen ?? null,
        star: exit.star ?? false,
        initiallyOpen: exit.initiallyOpen ?? null,
      })),
      blocks: level.blocks.map((block) => ({
        id: block.id,
        frozen: block.frozen ?? null,
        lockCount: block.lockCount ?? null,
        timedBombSeconds: block.timedBombSeconds ?? null,
        layers: block.layers?.length ?? 0,
        keyId: block.keyId ?? null,
        lockedBy: block.lockedBy ?? null,
        movementAxis: block.movementAxis ?? null,
        star: block.star ?? false,
        rotationBadge: block.rotationBadge ?? false,
      })),
      ...Object.fromEntries(mechanismArrays.map((field) => [field, level[field] ?? []])),
    },
  };
};

const compareRepairPreservation = (sourceSnapshot, targetSnapshot) => Object.fromEntries(
  Object.keys(sourceSnapshot).map((field) => [field, same(sourceSnapshot[field], targetSnapshot[field])]),
);

const runtimeRepairSemanticSha256 = (level, repair) => {
  if (!repair.normalize_generated_generator_order_for_semantic_hash) return sha256(JSON.stringify(level));
  const normalized = structuredClone(level);
  normalized.generators = asArray(normalized.generators).map((generator) => {
    const { id, side, offset, spawn, queueBlockIds, rimMount, trigger, ...rest } = generator;
    return { id, side, offset, spawn, queueBlockIds, rimMount, trigger, ...rest };
  });
  return sha256(JSON.stringify(normalized));
};

// Physical shutter footprints can force a different visible repack before a
// legacy solver repair is applied. Lv117's exact 8x4 lower shutter exposes an
// otherwise three-block orange opening component; this one same-shape,
// same-position recolour restores the <=2 opening contract and is covered by
// the refreshed solver/replay certificate generated below.
const PHYSICAL_SHUTTER_RECERTIFICATION_PATCHES = {
  117: {
    block_updates: {
      "lv117-opening-b15": { source: { color: "orange" }, target: { color: "yellow" } },
    },
  },
};

const recertifiedRuntimeRepairLevelIds = physicalShutterRecertificationManifest.recertified_level_ids;
if (!Array.isArray(recertifiedRuntimeRepairLevelIds)
  || recertifiedRuntimeRepairLevelIds.length !== physicalShutterRecertificationByLevelId.size
  || new Set(recertifiedRuntimeRepairLevelIds).size !== recertifiedRuntimeRepairLevelIds.length) {
  throw new Error("Physical-shutter runtime repair recertification level set drifted");
}

const EFFECTIVE_SOLVER_VERIFIED_RUNTIME_REPAIRS = SOLVER_VERIFIED_RUNTIME_REPAIRS.map((repair) => {
  const record = physicalShutterRecertificationByLevelId.get(repair.level_id);
  if (!record) return repair;
  const replay = record.puzzle_model_replay;
  const solver = record.solver;
  if (record.candidate_id !== repair.candidate_id
    || solver?.max_states < 20_000
    || solver?.termination !== "solved"
    || solver?.solved !== true
    || solver?.static_unsat_reasons?.length
    || solver?.unsupported_reasons?.length
    || !Array.isArray(solver?.route)
    || solver.route.length !== solver.minimum_drags
    || replay?.complete !== true
    || replay.replayed_drags !== solver.minimum_drags
    || replay.final_moves !== solver.minimum_drags
    || replay.remaining_blocks !== 0
    || replay.queued_blocks !== 0
    || !record.source_semantic_sha256
    || !record.repair_target_semantic_sha256
    || !record.final_level_semantic_sha256) {
    throw new Error(`Lv${repair.level_id}: physical-shutter solver/replay recertification drifted`);
  }
  const expectedSupplementalPatch = PHYSICAL_SHUTTER_RECERTIFICATION_PATCHES[repair.level_id]
    ?? { block_updates: {} };
  if (!same(record.physical_shutter_recertification_updates, expectedSupplementalPatch)) {
    throw new Error(`Lv${repair.level_id}: physical-shutter supplemental patch evidence drifted`);
  }
  return {
    ...repair,
    source_semantic_sha256: record.source_semantic_sha256,
    target_semantic_sha256: record.repair_target_semantic_sha256,
    verification: {
      max_states: solver.max_states,
      minimum_drags: solver.minimum_drags,
      clear_load: solver.clear_load,
      reposition_overhead: solver.reposition_overhead,
      explored_states: solver.explored_states,
      grid_steps: solver.grid_steps,
      turns: solver.turns,
    },
    route: solver.route,
    puzzle_model_replay: {
      attempted: true,
      complete: replay.complete,
      error: null,
      finalMoves: replay.final_moves,
      remainingBlocks: replay.remaining_blocks,
      remainingQueuedBlocks: replay.queued_blocks,
    },
    legacy_evidence: {
      evidence: repair.evidence ?? null,
      evidence_sha256: repair.evidence_sha256 ?? null,
      evidence_records: repair.evidence_records ?? null,
      verification: repair.verification ?? null,
      route: repair.route ?? null,
      puzzle_model_replay: repair.puzzle_model_replay ?? null,
    },
    evidence: physicalShutterRecertificationManifestPath,
    evidence_sha256: physicalShutterRecertificationManifestSha256,
    physical_shutter_recertification: {
      manifest: physicalShutterRecertificationManifestPath,
      manifest_sha256: physicalShutterRecertificationManifestSha256,
      previous_source_semantic_sha256: record.prior_source_semantic_sha256,
      previous_target_semantic_sha256: record.prior_target_semantic_sha256,
      final_level_semantic_sha256: record.final_level_semantic_sha256,
      reason: record.recertification_reason,
    },
  };
});
for (const levelId of recertifiedRuntimeRepairLevelIds) {
  if (!EFFECTIVE_SOLVER_VERIFIED_RUNTIME_REPAIRS.some((repair) => repair.level_id === levelId)) {
    throw new Error(`Physical-shutter recertification references unknown solver repair Lv${levelId}`);
  }
}

const runtimeRepairRefreshSnapshots = [];
const appliedRuntimeRepairs = EFFECTIVE_SOLVER_VERIFIED_RUNTIME_REPAIRS.map((repair) => {
  const entry = built.find((candidate) => candidate.runtime.id === repair.level_id);
  if (!entry) throw new Error(`Missing solver-repaired Lv${repair.level_id}`);
  const level = entry.runtime;
  const allExits = () => [...level.gates, ...asArray(level.flipDoors)];
  const sourceExitCount = allExits().length;
  const sourcePlayableCellCount = level.playable.length;
  const sourceFrozenExitValues = allExits().map((exit) => exit.frozen).filter(isPositiveInteger).sort((left, right) => left - right);
  const sourceSemanticSha256 = runtimeRepairSemanticSha256(level, repair);
  const refreshSourceLevel = refreshRuntimeRepairEvidence ? structuredClone(level) : null;
  const preservationSourceLevel = repair.normalize_declared_counter_updates_for_preservation
    || repair.normalize_declared_shutter_updates_for_preservation
    || repair.normalize_declared_exit_removals_for_preservation
    || repair.normalize_declared_block_positions_for_preservation
    ? structuredClone(level) : level;
  if (repair.normalize_declared_counter_updates_for_preservation) {
    const preservationExits = [...preservationSourceLevel.gates, ...asArray(preservationSourceLevel.flipDoors)];
    for (const [exitId, patch] of Object.entries(repair.exit_updates)) {
      if (!Object.hasOwn(patch.target, "frozen")) continue;
      const exit = preservationExits.find((candidate) => candidate.id === exitId);
      applyTargetFields(exit, { frozen: patch.target.frozen });
    }
  }
  if (repair.normalize_declared_shutter_updates_for_preservation) {
    for (const [shutterId, patch] of Object.entries(repair.shutter_updates ?? {})) {
      const shutter = asArray(preservationSourceLevel.shutters)
        .find((candidate) => candidate.id === shutterId);
      if (!shutter) throw new Error(`Lv${level.id}: missing normalized shutter ${shutterId}`);
      applyTargetFields(shutter, patch.target);
    }
  }
  if (repair.normalize_declared_exit_removals_for_preservation) {
    const removedForPreservation = new Set(repair.remove_exit_ids);
    preservationSourceLevel.gates = preservationSourceLevel.gates
      .filter((exit) => !removedForPreservation.has(exit.id));
    if (preservationSourceLevel.flipDoors) {
      preservationSourceLevel.flipDoors = preservationSourceLevel.flipDoors
        .filter((exit) => !removedForPreservation.has(exit.id));
    }
  }
  if (repair.normalize_declared_block_positions_for_preservation) {
    for (const [blockId, patch] of Object.entries(repair.block_updates)) {
      if (!Object.hasOwn(patch.target, "x") && !Object.hasOwn(patch.target, "y")) continue;
      const block = preservationSourceLevel.blocks.find((candidate) => candidate.id === blockId);
      applyTargetFields(block, Object.fromEntries(Object.entries(patch.target)
        .filter(([field]) => field === "x" || field === "y")));
    }
  }
  const sourcePreservationSnapshot = repair.strict_preservation_contract
    ? repairPreservationSnapshot(preservationSourceLevel) : null;
  if (!refreshRuntimeRepairEvidence && repair.source_semantic_sha256 && sourceSemanticSha256 !== repair.source_semantic_sha256) {
    throw new Error(`Lv${level.id}: solver repair source semantic SHA drifted (${sourceSemanticSha256})`);
  }
  const removedExits = repair.remove_exit_ids.map((exitId) => structuredClone(
    allExits().find((exit) => exit.id === exitId),
  ));

  // Preflight every declared source field before mutating any runtime data. A
  // projection drift must fail atomically rather than leave a partially
  // applied repair in the generated output/audit.
  if (repair.playable_update && !same(level.playable, repair.playable_update.source)) {
    throw new Error(`Lv${level.id}: solver repair source playable mask drifted`);
  }
  for (const exitId of repair.remove_exit_ids) {
    if (!allExits().some((exit) => exit.id === exitId)) {
      throw new Error(`Lv${level.id}: missing removed exit ${exitId}`);
    }
  }
  for (const [exitId, patch] of Object.entries(repair.exit_updates)) {
    const exit = allExits().find((candidate) => candidate.id === exitId);
    if (!exit) throw new Error(`Lv${level.id}: missing updated exit ${exitId}`);
    if (!sourceFieldMatches(exit, patch.source)) {
      throw new Error(`Lv${level.id}/${exit.id}: solver repair source exit drifted`);
    }
  }
  for (const [blockId, patch] of Object.entries(repair.block_updates)) {
    const block = level.blocks.find((candidate) => candidate.id === blockId);
    if (!block) throw new Error(`Lv${level.id}: missing updated block ${blockId}`);
    if (!sourceFieldMatches(block, patch.source)) {
      throw new Error(`Lv${level.id}/${block.id}: solver repair source block drifted`);
    }
  }
  for (const [generatorId, patch] of Object.entries(repair.generator_updates ?? {})) {
    const generator = asArray(level.generators).find((candidate) => candidate.id === generatorId);
    if (!generator) throw new Error(`Lv${level.id}: missing updated generator ${generatorId}`);
    if (!sourceFieldMatches(generator, patch.source)) {
      throw new Error(`Lv${level.id}/${generator.id}: solver repair source generator drifted`);
    }
  }
  for (const [shutterId, patch] of Object.entries(repair.shutter_updates ?? {})) {
    const shutter = asArray(level.shutters).find((candidate) => candidate.id === shutterId);
    if (!shutter) throw new Error(`Lv${level.id}: missing updated shutter ${shutterId}`);
    if (!sourceFieldMatches(shutter, patch.source)) {
      throw new Error(`Lv${level.id}/${shutter.id}: solver repair source shutter drifted`);
    }
  }

  if (repair.playable_update) level.playable = structuredClone(repair.playable_update.target).sort(pointSort);
  const removed = new Set(repair.remove_exit_ids);
  level.gates = level.gates.filter((exit) => !removed.has(exit.id));
  if (level.flipDoors) level.flipDoors = level.flipDoors.filter((exit) => !removed.has(exit.id));
  for (const [exitId, patch] of Object.entries(repair.exit_updates)) {
    const exit = allExits().find((candidate) => candidate.id === exitId);
    applyTargetFields(exit, patch.target);
  }
  for (const [blockId, patch] of Object.entries(repair.block_updates)) {
    const block = level.blocks.find((candidate) => candidate.id === blockId);
    applyTargetFields(block, patch.target);
  }
  for (const [generatorId, patch] of Object.entries(repair.generator_updates ?? {})) {
    const generator = asArray(level.generators).find((candidate) => candidate.id === generatorId);
    applyTargetFields(generator, patch.target);
  }
  for (const [shutterId, patch] of Object.entries(repair.shutter_updates ?? {})) {
    const shutter = asArray(level.shutters).find((candidate) => candidate.id === shutterId);
    applyTargetFields(shutter, patch.target);
  }
  const recertificationPatch = PHYSICAL_SHUTTER_RECERTIFICATION_PATCHES[level.id] ?? { block_updates: {} };
  for (const [blockId, patch] of Object.entries(recertificationPatch.block_updates ?? {})) {
    const block = level.blocks.find((candidate) => candidate.id === blockId);
    if (!block || !sourceFieldMatches(block, patch.source)) {
      throw new Error(`Lv${level.id}/${blockId}: physical-shutter recertification source block drifted`);
    }
    applyTargetFields(block, patch.target);
  }
  const targetSemanticSha256 = runtimeRepairSemanticSha256(level, repair);
  if (!refreshRuntimeRepairEvidence && repair.target_semantic_sha256 && targetSemanticSha256 !== repair.target_semantic_sha256) {
    throw new Error(`Lv${level.id}: solver repair target semantic SHA drifted (${targetSemanticSha256})`);
  }
  const preservationContract = sourcePreservationSnapshot
    ? compareRepairPreservation(sourcePreservationSnapshot, repairPreservationSnapshot(level)) : null;
  if (repair.strict_preservation_contract && Object.values(preservationContract).some((preserved) => !preserved)) {
    const drifted = Object.entries(preservationContract)
      .filter(([, preserved]) => !preserved).map(([field]) => field).join(", ");
    throw new Error(`Lv${level.id}: strict preservation contract drifted (${drifted})`);
  }
  const exitColors = allExits().map((exit) => exit.color);
  const exitColorsUnique = exitColors.length <= COLORS.length && new Set(exitColors).size === exitColors.length;
  if (!refreshRuntimeRepairEvidence && !exitColorsUnique) {
    throw new Error(`Lv${level.id}: solver repair did not produce unique exit colours`);
  }
  const components = openingSameColorComponents(level);
  const maximumComponentSize = Math.max(0, ...components.map((component) => component.block_ids.length));
  if (!refreshRuntimeRepairEvidence && maximumComponentSize > 2) {
    throw new Error(`Lv${level.id}: solver repair left a same-colour opening cluster of ${maximumComponentSize}`);
  }
  const audit = {
    level_id: `Lv${level.id}`,
    candidate_id: repair.candidate_id,
    source_exit_count: sourceExitCount,
    target_exit_count: exitColors.length,
    source_playable_cell_count: sourcePlayableCellCount,
    target_playable_cell_count: level.playable.length,
    playable_update: repair.playable_update ?? null,
    remove_exit_ids: repair.remove_exit_ids,
    removed_exits: removedExits,
    exit_updates: repair.exit_updates,
    block_updates: repair.block_updates,
    generator_updates: repair.generator_updates ?? {},
    shutter_updates: repair.shutter_updates ?? {},
    physical_shutter_recertification_updates: recertificationPatch,
    exit_colors: exitColors,
    exit_colors_unique: exitColorsUnique,
    source_frozen_exit_values: sourceFrozenExitValues,
    target_frozen_exit_values: allExits().map((exit) => exit.frozen).filter(isPositiveInteger).sort((left, right) => left - right),
    source_semantic_sha256: repair.source_semantic_sha256 ?? null,
    target_semantic_sha256: repair.target_semantic_sha256 ?? null,
    generated_source_semantic_sha256: sourceSemanticSha256,
    generated_target_semantic_sha256: targetSemanticSha256,
    preservation_contract: preservationContract,
    maximum_opening_same_color_component_size: maximumComponentSize,
    verification: repair.verification,
    route: repair.route ?? null,
    puzzle_model_replay: repair.puzzle_model_replay ?? null,
    minimal_counter_relaxation: repair.minimal_counter_relaxation ?? null,
    evidence: repair.evidence,
    evidence_sha256: repair.evidence_sha256 ?? null,
    evidence_records: repair.evidence_records ?? null,
    integration_manifest: repair.integration_manifest ?? null,
    physical_shutter_recertification: repair.physical_shutter_recertification ?? null,
    legacy_evidence: repair.legacy_evidence ?? null,
  };
  entry.audit.solver_verified_runtime_repair = audit;
  entry.audit.invariants.playable_cell_count = level.playable.length;
  entry.audit.mask.runtime_playable_cell_count = level.playable.length;
  if (repair.playable_update) {
    entry.audit.mask.status = "solver_verified_runtime_repair";
    entry.audit.mask.solver_verified_runtime_repair = {
      source_playable_cell_count: sourcePlayableCellCount,
      target_playable_cell_count: level.playable.length,
      source: repair.playable_update.source,
      target: repair.playable_update.target,
    };
  }
  entry.audit.mechanisms.represented.directional_exits = level.gates.length;
  entry.audit.mechanisms.represented.flip_doors = level.flipDoors?.length ?? 0;
  if (refreshRuntimeRepairEvidence) runtimeRepairRefreshSnapshots.push({
    level_id: level.id,
    candidate_id: repair.candidate_id,
    previous_source_semantic_sha256: repair.source_semantic_sha256 ?? null,
    previous_target_semantic_sha256: repair.target_semantic_sha256 ?? null,
    source_semantic_sha256: sourceSemanticSha256,
    target_semantic_sha256: targetSemanticSha256,
    source_level: refreshSourceLevel,
    target_level: structuredClone(level),
  });
  return audit;
});

// Generator geometry must be resolved against the final runtime mask and exits,
// including solver-certified repairs applied above. Lv114's certified routing
// expansion still leaves only two rails on its intended local top edge; adding
// one empty floor cell completes that span without moving or recolouring any
// opening/queued block and without covering an exit rail.
for (const entry of built.filter(({ runtime }) => asArray(runtime.generators).length)) {
  const level = entry.runtime;
  const generators = asArray(level.generators);
  let playable = new Set(level.playable.map(([x, y]) => keyOf(x, y)));
  const gates = level.gates;
  const flipDoors = asArray(level.flipDoors);
  if (level.id === 114 && !legalGeneratorRimCandidates(
    playable, level.width, level.height, gates, flipDoors,
  ).length) {
    if (generators.length !== 1) throw new Error(`Lv114: expected one canonical generator, got ${generators.length}`);
    const generator = generators[0];
    let best = null;
    for (let y = 0; y < level.height; y += 1) for (let x = 0; x < level.width; x += 1) {
      const added = keyOf(x, y);
      if (playable.has(added)) continue;
      const expanded = new Set(playable).add(added);
      const candidates = legalGeneratorRimCandidates(expanded, level.width, level.height, gates, flipDoors)
        .filter((candidate) => candidate.anchor.quarterTurns === 0 && candidate.anchor.y > 0);
      for (const candidate of candidates) {
        const score = generatorPlacementScore(candidate, generator, level.width, level.height);
        const tie = `${generatorRailKey(candidate.anchor)}|${added}`;
        if (!best || score < best.score || (score === best.score && compareText(tie, best.tie) < 0)) {
          best = { added, expanded, candidate, score, tie };
        }
      }
    }
    if (!best) throw new Error("Lv114: one-cell local top-rim expansion cannot mount the canonical generator");
    playable = best.expanded;
    level.playable = [...playable].map((key) => key.split(",").map(Number)).sort(pointSort);
    const adjustment = {
      kind: "generator_rim_mask_expansion",
      reason: "complete_local_top_exposed_three_rail_span_after_solver_verified_routing_expansion",
      added: [best.added],
      removed: [],
      anchor: best.candidate.anchor,
      preserves_opening_payload: true,
    };
    entry.audit.design_fill_evidence.push(adjustment);
    entry.audit.mask.generator_rim_adjustment = adjustment;
    entry.audit.mask.runtime_playable_cell_count = level.playable.length;
    entry.audit.invariants.playable_cell_count = level.playable.length;
    if (entry.audit.solver_verified_runtime_repair) {
      entry.audit.solver_verified_runtime_repair.post_repair_generator_rim_adjustment = adjustment;
    }
  }
  placeGeneratorsOnExposedRim(
    level.id, level.width, level.height, playable, gates, flipDoors, generators,
  );
}

for (const entry of built) {
  if (entry.audit.solver_verified_runtime_repair) {
    entry.audit.solver_verified_runtime_repair.final_playable_cell_count = entry.runtime.playable.length;
  }
}

if (!refreshRuntimeRepairEvidence) {
  const finalById = new Map(built.map(({ runtime }) => [runtime.id, runtime]));
  for (const record of physicalShutterRecertificationManifest.levels) {
    const level = finalById.get(record.level_id);
    const actualFinalSemanticSha256 = level ? sha256(JSON.stringify(level)) : null;
    if (actualFinalSemanticSha256 !== record.final_level_semantic_sha256) {
      throw new Error(`Lv${record.level_id}: physical-shutter recertified final semantic SHA drifted (${actualFinalSemanticSha256})`);
    }
  }
}

if (refreshRuntimeRepairEvidence) {
  const finalById = new Map(built.map(({ runtime }) => [runtime.id, runtime]));
  const payload = {
    schema_version: "blockout-video-parity-runtime-repair-refresh-input-v1",
    generated_on: new Date().toISOString(),
    mode: "explicit-evidence-refresh-only",
    normal_sha_gates_bypassed: true,
    repair_count: runtimeRepairRefreshSnapshots.length,
    repairs: runtimeRepairRefreshSnapshots.map((snapshot) => ({
      ...snapshot,
      final_level: structuredClone(finalById.get(snapshot.level_id)),
      final_level_semantic_sha256: sha256(JSON.stringify(finalById.get(snapshot.level_id))),
    })),
  };
  await writeFile(refreshRuntimeRepairInputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Wrote explicit runtime-repair refresh input: ${relative(root, refreshRuntimeRepairInputPath)}`);
  process.exit(0);
}

const COMPACT_DIFFICULTIES = ["normal", "hard", "super"];
const COMPACT_AXES = ["horizontal", "vertical"];
const COMPACT_SHUTTER_SKINS = ["shutter", "generator", "staging", "lift", "staged-frame"];
const COMPACT_RIM_MOUNTS = ["rim", "outboard"];
const COMPACT_GENERATOR_TRIGGERS = ["move", "time"];
const pointListToFlat = (points) => points.flatMap(([x, y]) => [x, y]);
const dictionary = (values) => {
  const entries = [];
  const indexes = new Map();
  for (const value of values) {
    if (indexes.has(value)) continue;
    indexes.set(value, entries.length);
    entries.push(value);
  }
  return { entries, indexes };
};
const trimTrailingZeros = (row, minimumLength = 0) => {
  while (row.length > minimumLength && row.at(-1) === 0) row.pop();
  return row;
};
const assertCompactKeys = (label, value, allowed) => {
  const unexpected = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unexpected.length) throw new Error(`${label} has unsupported compact fields: ${unexpected.join(", ")}`);
};

const renderCompactLevelModule = (runtimeLevels) => {
  const levelKeys = [
    "id", "name", "difficulty", "timeSeconds", "reward", "width", "height", "playable",
    "gates", "blocks", "flipDoors", "coloredGrids", "shutters", "generators",
  ];
  const gateKeys = ["id", "side", "offset", "size", "color", "frozen", "star"];
  const blockKeys = [
    "id", "x", "y", "shape", "color", "layers", "frozen", "shutterId", "movementAxis",
    "keyId", "lockedBy", "lockCount", "star", "timedBombSeconds", "rotationBadge",
  ];
  const flipDoorKeys = [...gateKeys, "initiallyOpen"];
  const coloredGridKeys = ["id", "color", "cells"];
  const shutterKeys = ["id", "x", "y", "width", "height", "count", "skin", "triggerBlockIds"];
  const generatorKeys = [
    "id", "side", "offset", "rimSpan", "rimMount", "rimAnchor", "spawn", "queueBlockIds",
    "trigger", "intervalSeconds", "initialDelaySeconds",
  ];
  const suffixValues = [];
  const shapeValues = [];
  const suffixFor = (levelId, id) => {
    if (typeof id !== "string") throw new Error(`Lv${levelId} compact id is not a string`);
    const prefix = `lv${levelId}-`;
    if (!id.startsWith(prefix)) throw new Error(`Lv${levelId} compact id lacks ${prefix} prefix: ${id}`);
    return id.slice(prefix.length);
  };
  const collectId = (levelId, id) => {
    if (id) suffixValues.push(suffixFor(levelId, id));
  };
  for (const level of runtimeLevels) {
    assertCompactKeys(`Lv${level.id}`, level, levelKeys);
    if (level.name !== `竞品映射 Lv${level.id}`) throw new Error(`Lv${level.id} compact name is not derivable`);
    for (const gate of level.gates) {
      assertCompactKeys(`${gate.id}`, gate, gateKeys);
      collectId(level.id, gate.id);
    }
    for (const block of level.blocks) {
      assertCompactKeys(`${block.id}`, block, blockKeys);
      collectId(level.id, block.id);
      collectId(level.id, block.shutterId);
      collectId(level.id, block.keyId);
      collectId(level.id, block.lockedBy);
      shapeValues.push(JSON.stringify(pointListToFlat(block.shape)));
    }
    for (const door of level.flipDoors ?? []) {
      assertCompactKeys(`${door.id}`, door, flipDoorKeys);
      collectId(level.id, door.id);
    }
    for (const grid of level.coloredGrids ?? []) {
      assertCompactKeys(`${grid.id}`, grid, coloredGridKeys);
      collectId(level.id, grid.id);
    }
    for (const shutter of level.shutters ?? []) {
      assertCompactKeys(`${shutter.id}`, shutter, shutterKeys);
      collectId(level.id, shutter.id);
      for (const id of shutter.triggerBlockIds ?? []) collectId(level.id, id);
    }
    for (const generator of level.generators ?? []) {
      assertCompactKeys(`${generator.id}`, generator, generatorKeys);
      collectId(level.id, generator.id);
      for (const id of generator.queueBlockIds) collectId(level.id, id);
    }
  }
  const suffixDictionary = dictionary(suffixValues);
  const shapeDictionary = dictionary(shapeValues);
  const suffixIndex = (levelId, id, optional = false) => {
    if (!id) return optional ? 0 : (() => { throw new Error(`Lv${levelId} compact id is missing`); })();
    const index = suffixDictionary.indexes.get(suffixFor(levelId, id));
    if (index === undefined) throw new Error(`Lv${levelId} compact id missing from dictionary: ${id}`);
    return optional ? index + 1 : index;
  };
  const enumIndex = (label, values, value, optional = false) => {
    if (value === undefined) return optional ? 0 : (() => { throw new Error(`${label} is missing`); })();
    const index = values.indexOf(value);
    if (index < 0) throw new Error(`${label} has unsupported value ${String(value)}`);
    return optional ? index + 1 : index;
  };
  const colorIndex = (label, color) => enumIndex(label, COLORS, color);
  const encodeGate = (level, gate) => trimTrailingZeros([
    suffixIndex(level.id, gate.id),
    enumIndex(`${gate.id}.side`, SIDES, gate.side),
    gate.offset,
    gate.size,
    colorIndex(`${gate.id}.color`, gate.color),
    gate.frozen ?? 0,
    gate.star ? 1 : 0,
  ], 5);
  const encodeBlock = (level, block) => {
    let layerCode = 0;
    if (block.layers !== undefined) {
      if (block.layers.length !== 2) throw new Error(`${block.id}.layers must contain exactly two colours`);
      layerCode = 1 + colorIndex(`${block.id}.layers[0]`, block.layers[0]) * COLORS.length
        + colorIndex(`${block.id}.layers[1]`, block.layers[1]);
    }
    const shapeIndex = shapeDictionary.indexes.get(JSON.stringify(pointListToFlat(block.shape)));
    if (shapeIndex === undefined) throw new Error(`${block.id}.shape missing from dictionary`);
    return trimTrailingZeros([
      suffixIndex(level.id, block.id),
      block.x,
      block.y,
      shapeIndex,
      colorIndex(`${block.id}.color`, block.color),
      layerCode,
      block.frozen ?? 0,
      suffixIndex(level.id, block.shutterId, true),
      enumIndex(`${block.id}.movementAxis`, COMPACT_AXES, block.movementAxis, true),
      suffixIndex(level.id, block.keyId, true),
      suffixIndex(level.id, block.lockedBy, true),
      block.lockCount ?? 0,
      (block.star ? 1 : 0) | (block.rotationBadge ? 2 : 0),
      block.timedBombSeconds ?? 0,
    ], 5);
  };
  const encodeFlipDoor = (level, door) => [
    suffixIndex(level.id, door.id),
    enumIndex(`${door.id}.side`, SIDES, door.side),
    door.offset,
    door.size,
    colorIndex(`${door.id}.color`, door.color),
    door.frozen ?? 0,
    door.star ? 1 : 0,
    door.initiallyOpen ? 1 : 0,
  ];
  const encodeShutter = (level, shutter) => {
    const row = [
      suffixIndex(level.id, shutter.id),
      shutter.x,
      shutter.y,
      shutter.width,
      shutter.height,
      shutter.count,
      enumIndex(`${shutter.id}.skin`, COMPACT_SHUTTER_SKINS, shutter.skin, true),
    ];
    if (shutter.triggerBlockIds?.length) {
      row.push(shutter.triggerBlockIds.map((id) => suffixIndex(level.id, id)));
    }
    return row;
  };
  const encodeGenerator = (level, generator) => {
    const row = [
      suffixIndex(level.id, generator.id),
      enumIndex(`${generator.id}.side`, SIDES, generator.side),
      generator.offset,
      generator.rimSpan ?? 0,
      enumIndex(`${generator.id}.rimMount`, COMPACT_RIM_MOUNTS, generator.rimMount, true),
      generator.spawn[0],
      generator.spawn[1],
      generator.queueBlockIds.map((id) => suffixIndex(level.id, id)),
      enumIndex(`${generator.id}.trigger`, COMPACT_GENERATOR_TRIGGERS, generator.trigger, true),
      generator.intervalSeconds ?? 0,
      generator.initialDelaySeconds ?? 0,
    ];
    if (generator.rimAnchor) {
      const doubledX = generator.rimAnchor.x * 2;
      const doubledY = generator.rimAnchor.y * 2;
      if (!isInteger(doubledX) || !isInteger(doubledY)) {
        throw new Error(`${generator.id}: rim anchor must use half-cell coordinates`);
      }
      row.push([doubledX, doubledY, generator.rimAnchor.quarterTurns]);
    }
    return generator.rimAnchor ? row : trimTrailingZeros(row, 8);
  };
  const encodedLevels = runtimeLevels.map((level) => [
    level.timeSeconds,
    level.reward,
    enumIndex(`Lv${level.id}.difficulty`, COMPACT_DIFFICULTIES, level.difficulty),
    level.width,
    level.height,
    pointListToFlat(level.playable),
    level.gates.map((gate) => encodeGate(level, gate)),
    level.blocks.map((block) => encodeBlock(level, block)),
    (level.flipDoors ?? []).map((door) => encodeFlipDoor(level, door)),
    (level.coloredGrids ?? []).map((grid) => [
      suffixIndex(level.id, grid.id),
      colorIndex(`${grid.id}.color`, grid.color),
      pointListToFlat(grid.cells),
    ]),
    (level.shutters ?? []).map((shutter) => encodeShutter(level, shutter)),
    (level.generators ?? []).map((generator) => encodeGenerator(level, generator)),
  ]);
  const shapes = shapeDictionary.entries.map((entry) => JSON.parse(entry));
  for (const [label, flat] of [
    ...shapes.map((shape, index) => [`shape-dictionary[${index}]`, shape]),
    ...encodedLevels.flatMap((level, index) => [
      [`Lv${index + 101}.playable`, level[5]],
      ...level[9].map((grid, gridIndex) => [`Lv${index + 101}.coloredGrids[${gridIndex}]`, grid[2]]),
    ]),
  ]) {
    if (flat.length % 2 !== 0) throw new Error(`${label} compact Point stream must have an even length`);
  }
  const payload = [];
  const writeVarint = (value) => {
    if (!Number.isSafeInteger(value) || value < 0) throw new Error(`Compact payload value is not a non-negative integer: ${value}`);
    let remaining = value;
    while (remaining > 0x7f) {
      payload.push((remaining & 0x7f) | 0x80);
      remaining = Math.floor(remaining / 0x80);
    }
    payload.push(remaining);
  };
  const writeNumbers = (values) => {
    writeVarint(values.length);
    for (const value of values) writeVarint(value);
  };
  const writeRows = (rows) => {
    writeVarint(rows.length);
    for (const row of rows) writeNumbers(row);
  };
  writeVarint(shapes.length);
  for (const shape of shapes) writeNumbers(shape);
  writeVarint(suffixDictionary.entries.length);
  for (const suffix of suffixDictionary.entries) {
    if (!/^[\x20-\x7e]+$/.test(suffix)) throw new Error(`Compact id suffix is not ASCII: ${suffix}`);
    writeVarint(suffix.length);
    for (const character of suffix) payload.push(character.charCodeAt(0));
  }
  writeVarint(encodedLevels.length);
  for (const row of encodedLevels) {
    writeVarint(row[0]);
    writeVarint(row[1]);
    writeVarint(row[2] | (row[3] << 2) | (row[4] << 6));
    const masks = Array(row[4]).fill(0);
    for (let index = 0; index < row[5].length; index += 2) masks[row[5][index + 1]] |= 1 << row[5][index];
    writeNumbers(masks);
    writeVarint(row[6].length);
    for (const gate of row[6]) {
      writeVarint(gate[0]);
      writeVarint(gate[1] | (gate[2] << 2) | (gate[3] << 6) | (gate[4] << 10));
      writeVarint(((gate[5] ?? 0) << 1) | (gate[6] ?? 0));
    }
    writeVarint(row[7].length);
    for (const block of row[7]) {
      writeVarint(block[0]);
      writeVarint(block[1] | (block[2] << 4));
      writeVarint(block[3] | (block[4] << 5));
      let modifiers = 0;
      for (let index = 5; index < block.length; index += 1) if (block[index]) modifiers |= 1 << (index - 5);
      writeVarint(modifiers);
      for (let index = 5; index < block.length; index += 1) if (modifiers & (1 << (index - 5))) writeVarint(block[index]);
    }
    writeVarint(row[8].length);
    for (const door of row[8]) {
      writeVarint(door[0]);
      writeVarint(door[1] | (door[2] << 2) | (door[3] << 6) | (door[4] << 10));
      writeVarint((door[5] << 2) | (door[6] << 1) | door[7]);
    }
    writeVarint(row[9].length);
    for (const grid of row[9]) {
      writeVarint(grid[0]);
      writeVarint(grid[1]);
      writeNumbers(grid[2]);
    }
    writeVarint(row[10].length);
    for (const shutter of row[10]) {
      writeVarint(shutter[0]);
      writeVarint(shutter[1] | (shutter[2] << 4));
      writeVarint(shutter[3] | (shutter[4] << 4));
      writeVarint(shutter[5]);
      writeVarint(shutter[6] | (shutter.length > 7 ? 8 : 0));
      if (shutter.length > 7) writeNumbers(shutter[7]);
    }
    writeVarint(row[11].length);
    for (const generator of row[11]) {
      writeVarint(generator[0]);
      writeVarint(generator[1] | (generator[2] << 2) | (generator[3] << 6) | (generator[4] << 10));
      writeVarint(generator[5] | (generator[6] << 4));
      writeNumbers(generator[7]);
      let modifiers = 0;
      for (let index = 8; index < Math.min(generator.length, 11); index += 1) if (generator[index]) modifiers |= 1 << (index - 8);
      if (generator.length > 11) modifiers |= 8;
      writeVarint(modifiers);
      for (let index = 8; index < Math.min(generator.length, 11); index += 1) if (modifiers & (1 << (index - 8))) writeVarint(generator[index]);
      if (modifiers & 8) writeNumbers(generator[11]);
    }
  }
  const decodePackedPayload = () => {
    let cursor = 0;
    const integer = () => {
      let value = 0;
      let scale = 1;
      let byte = 0;
      do {
        byte = payload[cursor++];
        if (byte === undefined) throw new Error("Compact payload ended inside a varint");
        value += (byte & 0x7f) * scale;
        scale *= 0x80;
      } while (byte & 0x80);
      return value;
    };
    const numbers = () => Array.from({ length: integer() }, integer);
    const decodedShapes = Array.from({ length: integer() }, numbers);
    const decodedSuffixes = Array.from({ length: integer() }, () => {
      let value = "";
      for (let index = 0, length = integer(); index < length; index += 1) {
        const byte = payload[cursor++];
        if (byte === undefined) throw new Error("Compact payload ended inside an id suffix");
        value += String.fromCharCode(byte);
      }
      return value;
    });
    const decodedLevels = Array.from({ length: integer() }, () => {
      const time = integer();
      const reward = integer();
      const metadata = integer();
      const difficulty = metadata & 3;
      const width = (metadata >> 2) & 15;
      const height = (metadata >> 6) & 15;
      const playable = [];
      numbers().forEach((mask, y) => {
        for (let x = 0; x < width; x += 1) if (mask & (1 << x)) playable.push(x, y);
      });
      const gates = Array.from({ length: integer() }, () => {
        const suffix = integer();
        const packed = integer();
        const tail = integer();
        return trimTrailingZeros([
          suffix,
          packed & 3,
          (packed >> 2) & 15,
          (packed >> 6) & 15,
          (packed >> 10) & 7,
          tail >> 1,
          tail & 1,
        ], 5);
      });
      const blocks = Array.from({ length: integer() }, () => {
        const suffix = integer();
        const position = integer();
        const appearance = integer();
        const modifiers = integer();
        const block = [suffix, position & 15, position >> 4, appearance & 31, appearance >> 5];
        for (let index = 0; index < 9; index += 1) block.push(modifiers & (1 << index) ? integer() : 0);
        return trimTrailingZeros(block, 5);
      });
      const doors = Array.from({ length: integer() }, () => {
        const suffix = integer();
        const packed = integer();
        const tail = integer();
        return [
          suffix,
          packed & 3,
          (packed >> 2) & 15,
          (packed >> 6) & 15,
          (packed >> 10) & 7,
          tail >> 2,
          (tail >> 1) & 1,
          tail & 1,
        ];
      });
      const grids = Array.from({ length: integer() }, () => [integer(), integer(), numbers()]);
      const shutters = Array.from({ length: integer() }, () => {
        const suffix = integer();
        const position = integer();
        const size = integer();
        const count = integer();
        const skinAndTrigger = integer();
        const shutter = [suffix, position & 15, position >> 4, size & 15, size >> 4, count, skinAndTrigger & 7];
        if (skinAndTrigger & 8) shutter.push(numbers());
        return shutter;
      });
      const generators = Array.from({ length: integer() }, () => {
        const suffix = integer();
        const placement = integer();
        const spawn = integer();
        const generator = [
          suffix,
          placement & 3,
          (placement >> 2) & 15,
          (placement >> 6) & 15,
          (placement >> 10) & 3,
          spawn & 15,
          spawn >> 4,
          numbers(),
        ];
        const modifiers = integer();
        for (let index = 0; index < 3; index += 1) generator.push(modifiers & (1 << index) ? integer() : 0);
        if (modifiers & 8) generator.push(numbers());
        return modifiers & 8 ? generator : trimTrailingZeros(generator, 8);
      });
      return [time, reward, difficulty, width, height, playable, gates, blocks, doors, grids, shutters, generators];
    });
    if (cursor !== payload.length) throw new Error(`Compact payload has ${payload.length - cursor} unread bytes`);
    return { shapes: decodedShapes, suffixes: decodedSuffixes, levels: decodedLevels };
  };
  const decoded = decodePackedPayload();
  if (!same(decoded.shapes, shapes)
    || !same(decoded.suffixes, suffixDictionary.entries)
    || !same(decoded.levels, encodedLevels)) {
    throw new Error("Compact payload encoder/decoder round-trip changed runtime level fields");
  }
  const compressedBytes = deflateRawSync(Uint8Array.from(payload), {
    level: 9,
    strategy: zlibConstants.Z_FILTERED,
  });
  if ((compressedBytes[0] & 7) !== 5) throw new Error("Compact payload must be one final dynamic-Huffman DEFLATE block");
  const base85Alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.-:+=^!/*?&<>()[]{}@%$#";
  let compressedPayload = "";
  for (let offset = 0; offset < compressedBytes.length; offset += 4) {
    let value = 0;
    for (let index = 0; index < 4; index += 1) value = value * 256 + (compressedBytes[offset + index] ?? 0);
    let encoded = "";
    for (let index = 0; index < 5; index += 1) {
      encoded = base85Alphabet[value % 85] + encoded;
      value = Math.floor(value / 85);
    }
    compressedPayload += encoded;
  }
  return `/* eslint-disable */\n// AUTO-GENERATED by tools/build-video-parity-runtime-levels-101-200.mjs.\n// Source SHA-256: ${sha256(sourceText)}\n// Runtime structural projection only: no solver, completion witness, or difficulty proof was run.\n// Compact tuple schema: indexed enums/dictionaries, flattened points, row masks, varints, raw-DEFLATE payload.\nimport type { BlockColor, BlockSpec, ColoredGridSpec, Difficulty, FlipDoorSpec, GateSpec, GeneratorSpec, LevelSpec, MovementAxis, Point, ShutterSpec, Side } from "./types";\n\ntype GateRow = [number, number, number, number, number, number?, number?];\ntype BlockRow = [number, number, number, number, number, number?, number?, number?, number?, number?, number?, number?, number?, number?];\ntype FlipDoorRow = [number, number, number, number, number, number, number, number];\ntype GridRow = [number, number, number[]];\ntype ShutterRow = [number, number, number, number, number, number, number, number[]?];\ntype GeneratorRow = [number, number, number, number, number, number, number, number[], number?, number?, number?, number[]?];\ntype LevelRow = [number, number, number, number, number, number[], GateRow[], BlockRow[], FlipDoorRow[], GridRow[], ShutterRow[], GeneratorRow[]];\ntype Huffman = [Map<number, number>, number];\n\nconst C = ${JSON.stringify(COLORS)} as const;\nconst S = ${JSON.stringify(SIDES)} as const;\nconst D = ${JSON.stringify(COMPACT_DIFFICULTIES)} as const;\nconst A = ${JSON.stringify(COMPACT_AXES)} as const;\nconst K = ${JSON.stringify(COMPACT_SHUTTER_SKINS)} as const;\nconst M = ${JSON.stringify(COMPACT_RIM_MOUNTS)} as const;\nconst T = ${JSON.stringify(COMPACT_GENERATOR_TRIGGERS)} as const;\nconst P = "${compressedPayload}";\n\nconst base64 = (text: string): Uint8Array => {\n  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";\n  const output: number[] = [];\n  let buffer = 0;\n  let bits = 0;\n  for (const character of text) {\n    if (character === "=") break;\n    buffer = buffer * 64 + alphabet.indexOf(character);\n    bits += 6;\n    if (bits >= 8) {\n      bits -= 8;\n      output.push(Math.floor(buffer / 2 ** bits) & 255);\n      buffer %= 2 ** bits;\n    }\n  }\n  return Uint8Array.from(output);\n};\n\nconst inflate = (input: Uint8Array): Uint8Array => {\n  let bit = 0;\n  const output: number[] = [];\n  const read = (count: number): number => {\n    let value = 0;\n    for (let index = 0; index < count; index += 1, bit += 1) value |= ((input[bit >> 3]! >> (bit & 7)) & 1) << index;\n    return value;\n  };\n  const tree = (lengths: number[]): Huffman => {\n    const maximum = Math.max(...lengths);\n    const counts = Array(maximum + 1).fill(0);\n    const next = Array(maximum + 1).fill(0);\n    for (const length of lengths) if (length > 0) counts[length] += 1;\n    let code = 0;\n    for (let length = 1; length <= maximum; length += 1) {\n      code = (code + counts[length - 1]!) << 1;\n      next[length] = code;\n    }\n    const table = new Map<number, number>();\n    lengths.forEach((length, symbol) => {\n      if (length === 0) return;\n      const canonical = next[length]++;\n      let reversed = 0;\n      for (let index = 0; index < length; index += 1) reversed = reversed * 2 + ((canonical >> index) & 1);\n      table.set(length * 65536 + reversed, symbol);\n    });\n    return [table, maximum];\n  };\n  const symbol = ([table, maximum]: Huffman): number => {\n    let code = 0;\n    for (let length = 1; length <= maximum; length += 1) {\n      code |= read(1) << (length - 1);\n      const value = table.get(length * 65536 + code);\n      if (value !== undefined) return value;\n    }\n    throw new Error("Invalid compact level Huffman code");\n  };\n  const lengthBase = [3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258];\n  const lengthExtra = [0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0];\n  const distanceBase = [1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577];\n  const distanceExtra = [0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13];\n  let final = 0;\n  do {\n    final = read(1);\n    const kind = read(2);\n    if (kind === 0) {\n      bit = (bit + 7) & ~7;\n      const byte = bit >> 3;\n      const count = input[byte]! | (input[byte + 1]! << 8);\n      bit += 32;\n      for (let index = 0; index < count; index += 1, bit += 8) output.push(input[bit >> 3]!);\n      continue;\n    }\n    let literalTree: Huffman;\n    let distanceTree: Huffman;\n    if (kind === 1) {\n      literalTree = tree(Array.from({ length: 288 }, (_, index) => index <= 143 ? 8 : index <= 255 ? 9 : index <= 279 ? 7 : 8));\n      distanceTree = tree(Array(32).fill(5));\n    } else if (kind === 2) {\n      const literalCount = read(5) + 257;\n      const distanceCount = read(5) + 1;\n      const order = [16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];\n      const codeLengths = Array(19).fill(0);\n      for (let index = 0, count = read(4) + 4; index < count; index += 1) codeLengths[order[index]!] = read(3);\n      const codeTree = tree(codeLengths);\n      const lengths: number[] = [];\n      while (lengths.length < literalCount + distanceCount) {\n        const value = symbol(codeTree);\n        if (value <= 15) lengths.push(value);\n        else {\n          const repeat = value === 16 ? read(2) + 3 : value === 17 ? read(3) + 3 : read(7) + 11;\n          const repeated = value === 16 ? lengths.at(-1)! : 0;\n          for (let index = 0; index < repeat; index += 1) lengths.push(repeated);\n        }\n      }\n      literalTree = tree(lengths.slice(0, literalCount));\n      distanceTree = tree(lengths.slice(literalCount));\n    } else throw new Error("Invalid compact level DEFLATE block");\n    while (true) {\n      const value = symbol(literalTree);\n      if (value < 256) output.push(value);\n      else {\n        if (value === 256) break;\n        const lengthIndex = value - 257;\n        const count = lengthBase[lengthIndex]! + read(lengthExtra[lengthIndex]!);\n        const distanceIndex = symbol(distanceTree);\n        const distance = distanceBase[distanceIndex]! + read(distanceExtra[distanceIndex]!);\n        for (let index = 0; index < count; index += 1) output.push(output[output.length - distance]!);\n      }\n    }\n  } while (!final);\n  return Uint8Array.from(output);\n};\n\nconst unpack = (): [number[][], string[], LevelRow[]] => {\n  const input = inflate(base64(P));\n  let cursor = 0;\n  const integer = (): number => {\n    let value = 0;\n    let scale = 1;\n    let byte = 0;\n    do {\n      byte = input[cursor++]!;\n      value += (byte & 127) * scale;\n      scale *= 128;\n    } while (byte & 128);\n    return value;\n  };\n  const numbers = (): number[] => Array.from({ length: integer() }, integer);\n  const rows = (): number[][] => Array.from({ length: integer() }, numbers);\n  const shapes = Array.from({ length: integer() }, numbers);\n  const ids = Array.from({ length: integer() }, () => {\n    let value = "";\n    for (let index = 0, length = integer(); index < length; index += 1) value += String.fromCharCode(input[cursor++]!);\n    return value;\n  });\n  const levels = Array.from({ length: integer() }, (): LevelRow => {\n    const time = integer();\n    const reward = integer();\n    const difficulty = integer();\n    const width = integer();\n    const height = integer();\n    const playable: number[] = [];\n    numbers().forEach((mask, y) => {\n      for (let x = 0; x < width; x += 1) if (mask & (1 << x)) playable.push(x, y);\n    });\n    const gates = rows() as GateRow[];\n    const blocks = rows() as BlockRow[];\n    const doors = rows() as FlipDoorRow[];\n    const grids = Array.from({ length: integer() }, (): GridRow => [integer(), integer(), numbers()]);\n    const shutters = Array.from({ length: integer() }, (): ShutterRow => {\n      const length = integer();\n      const row: Array<number | number[]> = Array.from({ length: Math.min(length, 7) }, integer);\n      if (length > 7) row.push(numbers());\n      return row as ShutterRow;\n    });\n    const generators = Array.from({ length: integer() }, (): GeneratorRow => {\n      const length = integer();\n      const row: Array<number | number[]> = Array.from({ length: 7 }, integer);\n      row.push(numbers());\n      for (let index = 8; index < Math.min(length, 11); index += 1) row.push(integer());\n      if (length > 11) row.push(numbers());\n      return row as GeneratorRow;\n    });\n    return [time, reward, difficulty, width, height, playable, gates, blocks, doors, grids, shutters, generators];\n  });\n  return [shapes, ids, levels];\n};\n\nconst [H, I, R] = unpack();\nconst points = (flat: number[]): Point[] => {\n  const result: Point[] = [];\n  for (let index = 0; index < flat.length; index += 2) result.push([flat[index]!, flat[index + 1]!] as const);\n  return result;\n};\nconst id = (levelId: number, suffixIndex: number): string => \`lv\${levelId}-\${I[suffixIndex]!}\`;\nconst optionalId = (levelId: number, encodedIndex = 0): string | undefined => encodedIndex > 0 ? id(levelId, encodedIndex - 1) : undefined;\nconst gate = (levelId: number, row: GateRow): GateSpec => {\n  const [suffix, side, offset, size, color, frozen = 0, star = 0] = row;\n  return { id: id(levelId, suffix), side: S[side]! as Side, offset, size, color: C[color]! as BlockColor, ...(frozen > 0 ? { frozen } : {}), ...(star ? { star: true } : {}) };\n};\nconst block = (levelId: number, row: BlockRow): BlockSpec => {\n  const [suffix, x, y, shape, color, layerCode = 0, frozen = 0, shutter = 0, axis = 0, key = 0, locked = 0, lockCount = 0, flags = 0, bomb = 0] = row;\n  const layers = layerCode > 0 ? [C[Math.floor((layerCode - 1) / C.length)]!, C[(layerCode - 1) % C.length]!] as BlockColor[] : undefined;\n  return {\n    id: id(levelId, suffix), x, y, shape: points(H[shape]!), color: C[color]! as BlockColor,\n    ...(layers ? { layers } : {}), ...(frozen > 0 ? { frozen } : {}),\n    ...(shutter > 0 ? { shutterId: optionalId(levelId, shutter)! } : {}),\n    ...(axis > 0 ? { movementAxis: A[axis - 1]! as MovementAxis } : {}),\n    ...(key > 0 ? { keyId: optionalId(levelId, key)! } : {}),\n    ...(locked > 0 ? { lockedBy: optionalId(levelId, locked)! } : {}),\n    ...(lockCount > 0 ? { lockCount } : {}), ...(flags & 1 ? { star: true } : {}),\n    ...(bomb > 0 ? { timedBombSeconds: bomb } : {}), ...(flags & 2 ? { rotationBadge: true } : {}),\n  };\n};\nconst flipDoor = (levelId: number, row: FlipDoorRow): FlipDoorSpec => {\n  const [suffix, side, offset, size, color, frozen, star, initiallyOpen] = row;\n  return { id: id(levelId, suffix), side: S[side]! as Side, offset, size, color: C[color]! as BlockColor, ...(frozen > 0 ? { frozen } : {}), ...(star ? { star: true } : {}), initiallyOpen: Boolean(initiallyOpen) };\n};\nconst grid = (levelId: number, row: GridRow): ColoredGridSpec => ({ id: id(levelId, row[0]), color: C[row[1]]! as BlockColor, cells: points(row[2]) });\nconst shutter = (levelId: number, row: ShutterRow): ShutterSpec => {\n  const [suffix, x, y, width, height, count, skin = 0, triggers] = row;\n  return { id: id(levelId, suffix), x, y, width, height, count, ...(skin > 0 ? { skin: K[skin - 1]! } : {}), ...(triggers?.length ? { triggerBlockIds: triggers.map((value) => id(levelId, value)) } : {}) };\n};\nconst generator = (levelId: number, row: GeneratorRow): GeneratorSpec => {\n  const [suffix, side, offset, rimSpan, rimMount, spawnX, spawnY, queue, trigger = 0, interval = 0, delay = 0, anchor] = row;\n  return {\n    id: id(levelId, suffix), side: S[side]! as Side, offset, spawn: [spawnX, spawnY], queueBlockIds: queue.map((value) => id(levelId, value)),\n    ...(rimSpan > 0 ? { rimSpan: rimSpan as 3 } : {}), ...(rimMount > 0 ? { rimMount: M[rimMount - 1]! } : {}),\n    ...(anchor ? { rimAnchor: { x: anchor[0]!, y: anchor[1]!, quarterTurns: anchor[2]! as 0 | 1 | 2 | 3 } } : {}),\n    ...(trigger > 0 ? { trigger: T[trigger - 1]! } : {}), ...(interval > 0 ? { intervalSeconds: interval } : {}),\n    ...(delay > 0 ? { initialDelaySeconds: delay } : {}),\n  };\n};\n\nexport const VIDEO_PARITY_LEVELS_101_TO_200: LevelSpec[] = R.map((row, index) => {\n  const levelId = index + 101;\n  const [timeSeconds, reward, difficulty, width, height, playable, gates, blocks, flipDoors, coloredGrids, shutters, generators] = row;\n  return {\n    id: levelId, name: \`竞品映射 Lv\${levelId}\`, difficulty: D[difficulty]! as Difficulty, timeSeconds, reward, width, height,\n    playable: points(playable), gates: gates.map((value) => gate(levelId, value)), blocks: blocks.map((value) => block(levelId, value)),\n    ...(flipDoors.length ? { flipDoors: flipDoors.map((value) => flipDoor(levelId, value)) } : {}),\n    ...(coloredGrids.length ? { coloredGrids: coloredGrids.map((value) => grid(levelId, value)) } : {}),\n    ...(shutters.length ? { shutters: shutters.map((value) => shutter(levelId, value)) } : {}),\n    ...(generators.length ? { generators: generators.map((value) => generator(levelId, value)) } : {}),\n  };\n});\n`;
};

const PACKED_LEVEL_DECODER = `  const levels = Array.from({ length: integer() }, (): LevelRow => {
    const time = integer();
    const reward = integer();
    const metadata = integer();
    const difficulty = metadata & 3;
    const width = (metadata >> 2) & 15;
    const height = (metadata >> 6) & 15;
    const playable: number[] = [];
    numbers().forEach((mask, y) => {
      for (let x = 0; x < width; x += 1) if (mask & (1 << x)) playable.push(x, y);
    });
    const gates = Array.from({ length: integer() }, (): GateRow => {
      const suffix = integer();
      const packed = integer();
      const tail = integer();
      return [suffix, packed & 3, (packed >> 2) & 15, (packed >> 6) & 15, (packed >> 10) & 7, tail >> 1, tail & 1];
    });
    const blocks = Array.from({ length: integer() }, (): BlockRow => {
      const suffix = integer();
      const position = integer();
      const appearance = integer();
      const modifiers = integer();
      const row: number[] = [suffix, position & 15, position >> 4, appearance & 31, appearance >> 5];
      for (let index = 0; index < 9; index += 1) row.push(modifiers & (1 << index) ? integer() : 0);
      return row as BlockRow;
    });
    const doors = Array.from({ length: integer() }, (): FlipDoorRow => {
      const suffix = integer();
      const packed = integer();
      const tail = integer();
      return [suffix, packed & 3, (packed >> 2) & 15, (packed >> 6) & 15, (packed >> 10) & 7, tail >> 2, (tail >> 1) & 1, tail & 1];
    });
    const grids = Array.from({ length: integer() }, (): GridRow => [integer(), integer(), numbers()]);
    const shutters = Array.from({ length: integer() }, (): ShutterRow => {
      const suffix = integer();
      const position = integer();
      const size = integer();
      const count = integer();
      const skinAndTrigger = integer();
      const row: Array<number | number[]> = [suffix, position & 15, position >> 4, size & 15, size >> 4, count, skinAndTrigger & 7];
      if (skinAndTrigger & 8) row.push(numbers());
      return row as ShutterRow;
    });
    const generators = Array.from({ length: integer() }, (): GeneratorRow => {
      const suffix = integer();
      const placement = integer();
      const spawn = integer();
      const row: Array<number | number[]> = [suffix, placement & 3, (placement >> 2) & 15, (placement >> 6) & 15, (placement >> 10) & 3, spawn & 15, spawn >> 4];
      row.push(numbers());
      const modifiers = integer();
      for (let index = 0; index < 3; index += 1) row.push(modifiers & (1 << index) ? integer() : 0);
      if (modifiers & 8) row.push(numbers());
      return row as GeneratorRow;
    });
    return [time, reward, difficulty, width, height, playable, gates, blocks, doors, grids, shutters, generators];
  });
`;
const PACKED_BASE85_DECODER = `const base85 = (text: string): Uint8Array => {
  const alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.-:+=^!/*?&<>()[]{}@%$#";
  const output = new Uint8Array(Math.ceil(text.length / 5) * 4);
  let cursor = 0;
  for (let offset = 0; offset < text.length; offset += 5) {
    let value = 0;
    for (let index = 0; index < 5; index += 1) value = value * 85 + alphabet.indexOf(text[offset + index]!);
    output[cursor++] = Math.floor(value / 2 ** 24) & 255;
    output[cursor++] = Math.floor(value / 2 ** 16) & 255;
    output[cursor++] = Math.floor(value / 2 ** 8) & 255;
    output[cursor++] = value & 255;
  }
  return output;
};

`;
const generated = renderCompactLevelModule(levels)
  .replace(
    "x: anchor[0]!, y: anchor[1]!",
    "x: anchor[0]! / 2, y: anchor[1]! / 2",
  )
  .replace(/const base64 = \(text: string\): Uint8Array => \{[\s\S]*?\n\};\n\n(?=const inflate)/, PACKED_BASE85_DECODER)
  .replace("inflate(base64(P))", "inflate(base85(P))")
  .replace(
    /  const levels = Array\.from\(\{ length: integer\(\) \}, \(\): LevelRow => \{[\s\S]*?  \}\);\n(?=  return \[shapes, ids, levels\];)/,
    PACKED_LEVEL_DECODER,
  );
const audit = {
  schema_version: "blockout-video-parity-runtime-projection-audit-101-200-v1",
  revision: REVISION,
  source: {
    path: relative(root, sourcePath).replaceAll("\\", "/"),
    sha256: sha256(sourceText),
  },
  output: {
    path: relative(root, outputPath).replaceAll("\\", "/"),
    sha256: sha256(generated),
  },
  status: "generated_validate_pending",
  solver_run: false,
  solver_verified_runtime_repairs: appliedRuntimeRepairs,
  summary: {
    level_count: levels.length,
    solver_verified_runtime_repair_level_ids: appliedRuntimeRepairs.map((repair) => repair.level_id),
    source_missing_level_ids: built.filter((entry) => entry.audit.source_missing).map((entry) => entry.audit.level_id),
    mask_adjustment_level_count: built.filter((entry) => entry.audit.mask.status !== "source_mask_preserved").length,
    nonspatial_cover_fallback_count: built.reduce((sum, entry) => sum
      + entry.audit.covers.filter((cover) => cover.runtime_skin === "staging").length, 0),
    design_fill_evidence_count: built.reduce((sum, entry) => sum
      + entry.audit.design_fill_evidence.length + entry.audit.gates.filter((gate) => (
        Object.values(gate.field_evidence).some((value) => String(value).startsWith("design_fill"))
      )).length + entry.audit.generators.length, 0),
    unsupported_runtime_mechanism_level_ids: built.filter((entry) => (
      entry.audit.mechanisms.unsupported_runtime_semantics.length > 0
    )).map((entry) => entry.runtime.id),
    source_unresolved_contract_level_ids: built.filter((entry) => (
      entry.audit.mechanisms.source_unresolved_contracts.length > 0
    )).map((entry) => entry.audit.level_id),
    source_unresolved_contract_count: built.reduce((sum, entry) => (
      sum + entry.audit.mechanisms.source_unresolved_contracts.length
    ), 0),
  },
  levels: built.map((entry) => entry.audit),
};
const auditText = `${JSON.stringify(audit, null, 2)}\n`;

const verifyText = async (path, expected) => {
  try { return (await readFile(path, "utf8")) === expected; } catch { return false; }
};
if (checkOnly) {
  const outputMatches = await verifyText(outputPath, generated);
  const auditMatches = await verifyText(auditPath, auditText);
  console.log(JSON.stringify({ status: outputMatches && auditMatches ? "PASS" : "FAIL", output_matches: outputMatches, audit_matches: auditMatches }, null, 2));
  if (!outputMatches || !auditMatches) process.exitCode = 1;
} else {
  await writeFile(outputPath, generated, "utf8");
  await writeFile(auditPath, auditText, "utf8");
  console.log(JSON.stringify({
    status: "PASS",
    revision: REVISION,
    level_count: levels.length,
    output: relative(root, outputPath).replaceAll("\\", "/"),
    output_sha256: sha256(generated),
    audit: relative(root, auditPath).replaceAll("\\", "/"),
    mask_adjustment_level_count: audit.summary.mask_adjustment_level_count,
    nonspatial_cover_fallback_count: audit.summary.nonspatial_cover_fallback_count,
    unsupported_runtime_mechanism_level_ids: audit.summary.unsupported_runtime_mechanism_level_ids,
    solver_run: false,
  }, null, 2));
}
