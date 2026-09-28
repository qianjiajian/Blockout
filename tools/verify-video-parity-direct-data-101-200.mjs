import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const blueprintDir = resolve(root, "deliverables/level-generation-blueprint");
const sourcePath = resolve(blueprintDir, "blockout-lv101-lv200-video-parity-formal-candidates-v1.json");
const datasetPath = resolve(blueprintDir, "blockout-lv101-lv200-direct-generated-level-data-v1.json");
const manifestPath = resolve(blueprintDir, "blockout-lv101-lv200-direct-generated-level-data-v1-manifest.json");

const readJson = async (path) => JSON.parse((await readFile(path, "utf8")).replace(/^\uFEFF/, ""));
const sha256 = async (path) => createHash("sha256").update(await readFile(path)).digest("hex").toUpperCase();
const canonical = (value) => {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
};
const same = (left, right) => JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));

const source = await readJson(sourcePath);
const dataset = await readJson(datasetPath);
const manifest = await readJson(manifestPath);
const issues = [];
const assert = (condition, message) => { if (!condition) issues.push(message); };
const expectedIds = Array.from({ length: 100 }, (_, index) => index + 101);

assert(Array.isArray(dataset), "dataset_is_not_a_json_array");
assert(same(dataset.map((level) => level.id), expectedIds), "dataset_ids_not_exactly_101_200");
assert(new Set(dataset.map((level) => level.level_id)).size === 100, "duplicate_level_id");
assert(manifest.summary.level_count === 100, "manifest_level_count_not_100");
assert(manifest.summary.solver_validated_level_count === 0, "solver_was_claimed_as_validated");
assert(manifest.summary.active_campaign_level_count === 0, "dataset_was_claimed_as_active_campaign");
assert(manifest.dataset.sha256 === await sha256(datasetPath), "dataset_sha_mismatch");
assert(manifest.source_candidate.sha256 === await sha256(sourcePath), "source_candidate_sha_mismatch");
assert(same(manifest.summary.source_missing_level_ids, ["Lv190", "Lv191"]), "source_missing_levels_drift");

const sourceById = new Map(source.levels.map((level) => [level.id, level]));
const globalBlockIds = [];
let stageCount = 0;
let blockCount = 0;
for (const level of dataset) {
  const candidate = sourceById.get(level.id);
  assert(Boolean(candidate), `Lv${level.id}:missing_source_candidate`);
  if (!candidate) continue;
  for (const field of [
    "board",
    "time_seconds",
    "palette",
    "source_to_design_color_class",
    "color_realization",
    "opening_stage_id",
    "stage_events",
    "stage_conflicts",
    "stages",
    "mechanism_contract",
    "mechanism_bindings",
    "runtime_unsupported_mechanisms",
    "solver",
  ]) assert(same(level[field], candidate[field]), `Lv${level.id}:${field}_drift`);
  assert(level.generation?.solver_run === false, `Lv${level.id}:solver_run_flag_not_false`);
  assert(level.generation?.active_campaign === false, `Lv${level.id}:active_campaign_flag_not_false`);
  assert(level.solver?.status === "not_run_by_user_request", `Lv${level.id}:solver_status_drift`);
  assert(
    level.runtime_integration?.status === "deferred_until_solver_and_runtime_mechanism_support",
    `Lv${level.id}:runtime_status_drift`,
  );
  stageCount += level.stages.length;
  for (const stage of level.stages) {
    blockCount += stage.blocks.length;
    for (const block of stage.blocks) globalBlockIds.push(block.id);
  }
  const index = manifest.levels.find((entry) => entry.id === level.id);
  assert(Boolean(index), `Lv${level.id}:manifest_index_missing`);
  assert(index?.full_block_count === level.stages.reduce((sum, stage) => sum + stage.blocks.length, 0), `Lv${level.id}:block_index_drift`);
  assert(same(index?.mechanism_counts, level.mechanism_counts), `Lv${level.id}:mechanism_count_drift`);
  assert(same(index?.mechanism_binding_counts, level.mechanism_binding_counts), `Lv${level.id}:mechanism_binding_count_drift`);
}
assert(stageCount === 173, `stage_count_${stageCount}_not_173`);
assert(blockCount === 2036, `block_count_${blockCount}_not_2036`);
assert(new Set(globalBlockIds).size === globalBlockIds.length, "global_duplicate_block_id");
assert(manifest.summary.stage_count === stageCount, "manifest_stage_count_drift");
assert(manifest.summary.block_count === blockCount, "manifest_block_count_drift");

console.log(JSON.stringify({
  status: issues.length ? "FAIL" : "PASS",
  level_count: dataset.length,
  stage_count: stageCount,
  block_count: blockCount,
  source_missing_level_ids: manifest.summary.source_missing_level_ids,
  solver_validated_level_count: manifest.summary.solver_validated_level_count,
  active_campaign_level_count: manifest.summary.active_campaign_level_count,
  dataset_sha256: manifest.dataset.sha256,
  issue_count: issues.length,
  issues,
}, null, 2));
if (issues.length) process.exitCode = 1;
