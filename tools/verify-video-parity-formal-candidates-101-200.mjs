import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const outputDir = resolve(root, "deliverables/level-generation-blueprint");
const readJson = async (name) => JSON.parse(await readFile(resolve(outputDir, name), "utf8"));
const truth = await readJson("blockout-lv101-lv200-video-parity-truth-v1.json");
const contract = await readJson("blockout-lv101-lv200-video-parity-design-contract-v1.json");
const candidates = await readJson("blockout-lv101-lv200-video-parity-formal-candidates-v1.json");
const audit = await readJson("blockout-lv101-lv200-video-parity-formal-candidates-v1-audit.json");

const canonical = (value) => {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
};
const same = (left, right) => JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
const sumHistogram = (histogram) => Object.values(histogram ?? {}).reduce((sum, count) => sum + count, 0);
const addHistogram = (target, histogram) => {
  for (const [shape, count] of Object.entries(histogram ?? {})) target[shape] = (target[shape] ?? 0) + count;
  return target;
};
const containsHistogram = (whole, minimum) => Object.entries(minimum ?? {})
  .every(([shape, count]) => (whole?.[shape] ?? 0) >= count);
const validRegionShape = (region) => Number.isInteger(region?.x) && Number.isInteger(region?.y)
  && Number.isInteger(region?.w) && region.w > 0
  && Number.isInteger(region?.h) && region.h > 0;
const sourceRegionWithinBoardOrComponent = (region, board) => {
  if (!validRegionShape(region)) return false;
  if (region.component) {
    const component = board.source_component_geometry?.find((entry) => entry.name === region.component);
    return Boolean(component)
      && region.x >= 0 && region.y >= 0
      && region.x + region.w <= component.cols
      && region.y + region.h <= component.rows;
  }
  return region.x >= 0 && region.y >= 0
    && region.x + region.w <= board.cols
    && region.y + region.h <= board.rows;
};
const targetRegionWithinBoardOrComponent = (region, board) => {
  if (!validRegionShape(region)) return false;
  if (region.component) {
    const component = board.target_component_layout?.find((entry) => entry.source_name === region.component);
    return Boolean(component)
      && region.x >= component.target_origin.x
      && region.y >= component.target_origin.y
      && region.x + region.w <= component.target_origin.x + component.cols
      && region.y + region.h <= component.target_origin.y + component.rows;
  }
  return region.x >= 0 && region.y >= 0
    && region.x + region.w <= board.cols
    && region.y + region.h <= board.rows;
};
const coverCountFromSeed = (seed) => {
  const explicit = seed?.cover?.count ?? seed?.count;
  if (Number.isInteger(explicit) && explicit > 0) return explicit;
  const match = String(seed?.trigger ?? "").match(/cover count\s*(\d+)/i);
  return match ? Number(match[1]) : null;
};
const expectedIds = Array.from({ length: 100 }, (_, index) => 101 + index);
const issues = [];
const assert = (condition, issue) => { if (!condition) issues.push(issue); };

assert(same(truth.levels.map((level) => level.level), expectedIds), "truth_level_ids_not_101_200");
assert(same(contract.levels.map((level) => Number(level.level_id.slice(2))), expectedIds), "contract_level_ids_not_101_200");
assert(same(candidates.levels.map((level) => level.id), expectedIds), "candidate_level_ids_not_101_200");
assert(same(truth.summary.source_missing_level_ids, [190, 191]), "source_missing_levels_not_exactly_190_191");

const contractById = new Map(contract.levels.map((level) => [level.level_id, level]));
const candidateById = new Map(candidates.levels.map((level) => [level.level_id, level]));
const auditById = new Map(audit.levels.map((level) => [level.level_id, level]));
for (const source of truth.levels) {
  const id = source.level_id;
  const contractLevel = contractById.get(id);
  const candidate = candidateById.get(id);
  const target = contractLevel?.our_design_target;
  assert(Boolean(contractLevel && candidate && auditById.get(id)), `${id}:missing_derived_record`);
  if (!target || !candidate) continue;
  if (source.provenance?.classification === "source_missing_external_reference_only") {
    assert(contractLevel.status === "source_missing_design_placeholder_unsolved_not_integrated", `${id}:source_missing_contract_status_drift`);
    assert(candidate.status.includes("explicit_source_evidence_gaps"), `${id}:source_missing_candidate_status_not_explicit`);
    assert(candidate.runtime_integration.blockers.includes("source_missing_external_reference"), `${id}:source_missing_runtime_blocker_absent`);
  }

  for (const [name, observed, generated] of [
    ["rows", source.board.rows, target.board.rows],
    ["cols", source.board.cols, target.board.cols],
    ["playable_cell_count", source.board.playable_cell_count, target.board.playable_cell_count],
    ["time_seconds", source.time_seconds, target.time_seconds],
    ["opening_piece_count", source.composition.opening_piece_count, target.opening_block_count],
    ["full_piece_count", source.composition.source_full_piece_count, target.full_level_block_count],
    ["opening_color_count", source.composition.opening_color_count, target.opening_color_count],
    ["full_color_count", source.composition.full_color_count, target.full_level_color_count],
  ]) if (observed != null) assert(observed === generated, `${id}:${name}_observed_value_drift`);
  if (source.composition.opening_shape_histogram_status === "exact") {
    assert(same(source.composition.opening_shape_histogram, target.opening_shape_histogram), `${id}:opening_exact_histogram_drift`);
  } else if (source.composition.opening_shape_histogram_status === "partial") {
    assert(containsHistogram(target.opening_shape_histogram, source.composition.opening_shape_histogram), `${id}:opening_partial_histogram_lower_bound_drift`);
  }
  if (source.composition.source_full_shape_histogram_status === "exact") {
    assert(same(source.composition.source_full_shape_histogram, target.full_level_shape_histogram), `${id}:full_exact_histogram_drift`);
  } else if (source.composition.source_full_shape_histogram_status === "partial") {
    assert(containsHistogram(target.full_level_shape_histogram, source.composition.source_full_shape_histogram), `${id}:full_partial_histogram_lower_bound_drift`);
  }

  assert(target.stage_conflicts.length === 0, `${id}:stage_conflict_present`);
  assert(new Set(target.stage_partitions.map((stage) => stage.id)).size === target.stage_partitions.length, `${id}:duplicate_partition_id`);
  const stageHistogram = target.stage_partitions.reduce((result, stage) => addHistogram(result, stage.shape_histogram), {});
  assert(sumHistogram(target.full_level_shape_histogram) === target.full_level_block_count, `${id}:target_full_histogram_count_mismatch`);
  assert(sumHistogram(stageHistogram) === target.full_level_block_count, `${id}:partition_count_not_full_count`);
  assert(same(stageHistogram, target.full_level_shape_histogram), `${id}:partition_histogram_not_full_histogram`);
  const eventIds = target.stage_events.map((event) => event.event_group_id);
  const producerIds = target.stage_events.flatMap((event) => event.producer_ids);
  assert(new Set(eventIds).size === eventIds.length, `${id}:duplicate_event_group_id`);
  assert(new Set(producerIds).size === producerIds.length, `${id}:duplicate_stage_producer_id`);
  const coverEvents = target.stage_events.filter((event) => event.event_type === "cover_clear");
  const knownTriggerCounts = coverEvents.map((event) => event.trigger_count).filter((value) => value != null);
  assert(new Set(knownTriggerCounts).size === knownTriggerCounts.length, `${id}:same_count_covers_not_grouped`);
  const sourceCoverOrders = new Map();
  for (const seed of source.stage_seeds ?? []) {
    const count = coverCountFromSeed(seed);
    if (!count || !Number.isInteger(seed?.stage)) continue;
    const values = sourceCoverOrders.get(count) ?? [];
    values.push(seed.stage);
    sourceCoverOrders.set(count, values);
  }
  for (const event of coverEvents) {
    const expected = sourceCoverOrders.get(event.trigger_count);
    if (!expected?.length) continue;
    const expectedOrders = [...new Set(expected)].sort((left, right) => left - right);
    assert(event.source_stage_order === expectedOrders[0], `${id}:${event.event_group_id}:source_stage_order_drift`);
    assert(same(event.source_stage_orders, expectedOrders), `${id}:${event.event_group_id}:source_stage_orders_drift`);
  }
  const orderedCoverEvents = coverEvents.filter((event) => event.source_stage_order != null);
  assert(orderedCoverEvents.every((event, index) => index === 0
    || orderedCoverEvents[index - 1].source_stage_order <= event.source_stage_order), `${id}:cover_events_not_in_source_stage_order`);
  for (const event of target.stage_events) for (const producer of event.producers ?? []) {
    if (producer.source_region) assert(
      sourceRegionWithinBoardOrComponent(producer.source_region, target.board),
      `${id}:${event.event_group_id}:${producer.producer_id}:source_region_out_of_bounds`,
    );
    if (producer.target_region) assert(
      targetRegionWithinBoardOrComponent(producer.target_region, target.board),
      `${id}:${event.event_group_id}:${producer.producer_id}:target_region_out_of_bounds`,
    );
  }
  for (const event of target.stage_events.filter((entry) => entry.event_type === "generator_queue")) {
    assert(event.producer_ids.length === 1, `${id}:${event.event_group_id}:generator_event_not_independent`);
    if (event.ordered_queue) assert(event.ordered_queue.length === event.known_count, `${id}:${event.event_group_id}:ordered_queue_length_mismatch`);
    assert(same(event.producers?.[0]?.ordered_queue, event.ordered_queue), `${id}:${event.event_group_id}:producer_queue_metadata_drift`);
    const generatorIndex = event.producers?.[0]?.source_index;
    const sourceGenerator = Array.isArray(target.mechanism_contract.generators)
      && Number.isInteger(generatorIndex)
      ? target.mechanism_contract.generators[generatorIndex]
      : null;
    if (Array.isArray(sourceGenerator?.queue)) {
      assert(event.ordered_queue?.length === sourceGenerator.queue.length, `${id}:${event.event_group_id}:mechanism_queue_length_drift`);
      for (let queueIndex = 0; queueIndex < sourceGenerator.queue.length; queueIndex += 1) {
        const expected = sourceGenerator.queue[queueIndex];
        const actual = event.ordered_queue?.find((item) => item.queue_index === queueIndex);
        assert(actual?.shape === expected.shape, `${id}:${event.event_group_id}:queue_${queueIndex}_shape_drift`);
        assert(actual?.color === expected.color, `${id}:${event.event_group_id}:queue_${queueIndex}_color_drift`);
      }
    }
    for (const partitionId of event.partition_ids ?? []) {
      const contractPartition = target.stage_partitions.find((stage) => stage.id === partitionId);
      const candidateStage = candidate.stages.find((stage) => stage.id === partitionId);
      assert(same(contractPartition?.ordered_queue, event.ordered_queue), `${id}:${event.event_group_id}:${partitionId}:partition_queue_metadata_drift`);
      const atomicQueue = contractPartition?.atomic_batches?.find((batch) => (
        batch.producer_id === event.producer_ids[0]
      ))?.ordered_queue;
      assert(same(atomicQueue, event.ordered_queue), `${id}:${event.event_group_id}:${partitionId}:atomic_queue_metadata_drift`);
      assert(same(candidateStage?.ordered_queue, event.ordered_queue), `${id}:${event.event_group_id}:${partitionId}:candidate_stage_queue_metadata_drift`);
      if (!candidateStage || !event.ordered_queue) continue;
      for (const item of event.ordered_queue) {
        const block = candidateStage.blocks.find((entry) => entry.queue_index === item.queue_index);
        assert(Boolean(block), `${id}:${event.event_group_id}:candidate_queue_${item.queue_index}_missing`);
        if (item.shape) assert(block?.shape_id === item.shape, `${id}:${event.event_group_id}:candidate_queue_${item.queue_index}_shape_drift`);
        if (item.allowed_shapes?.length) assert(item.allowed_shapes.includes(block?.shape_id), `${id}:${event.event_group_id}:candidate_queue_${item.queue_index}_shape_family_drift`);
        if (item.color) assert(block?.color === item.color, `${id}:${event.event_group_id}:candidate_queue_${item.queue_index}_color_drift`);
      }
    }
  }

  assert(candidate.solver.status === "not_run_by_user_request", `${id}:solver_was_run_or_status_drifted`);
  assert(candidate.runtime_integration.status === "not_integrated", `${id}:unexpected_runtime_integration`);
  if (target.stage_events.some((event) => event.assignment_status === "source_event_preserved_payload_pending")) {
    assert(candidate.runtime_integration.blockers.includes("source_stage_payload_unresolved"), `${id}:missing_pending_stage_runtime_blocker`);
  }
  if (candidate.stages.some((stage) => stage.assignment_status === "unresolved_across_source_triggers")) {
    assert(candidate.runtime_integration.blockers.includes("source_stage_trigger_assignment_unresolved"), `${id}:missing_stage_assignment_runtime_blocker`);
  }
  if (!same(candidate.board.playable_mask, target.board.playable_mask)) {
    assert(Boolean(candidate.board.packing_aware_adjustment), `${id}:candidate_mask_drift_without_explicit_packing_adjustment`);
    assert(candidate.board.playable_cell_count === target.board.playable_cell_count, `${id}:packing_adjustment_cell_count_drift`);
    assert(candidate.board.width === target.board.cols && candidate.board.height === target.board.rows, `${id}:packing_adjustment_dimension_drift`);
  }
  assert(same(candidate.mechanism_contract, target.mechanism_contract), `${id}:candidate_mechanism_contract_drift`);
  for (const binding of candidate.mechanism_bindings.filter((entry) => entry.source_event_group_id)) {
    assert(binding.actual_event_group_id === binding.source_event_group_id, `${id}:${binding.id}:mechanism_source_event_drift`);
    assert(binding.stage_binding_status === "exact_source_event", `${id}:${binding.id}:mechanism_source_event_not_exact`);
  }
  assert(auditById.get(id)?.status === "pass", `${id}:candidate_internal_audit_failed`);
  const blocks = candidate.stages.flatMap((stage) => stage.blocks);
  assert(blocks.length === target.full_level_block_count, `${id}:candidate_block_count_mismatch`);
  assert(new Set(blocks.map((block) => block.id)).size === blocks.length, `${id}:duplicate_block_id`);
  const expectedStarBindings = Array.isArray(target.mechanism_contract.star_blocks)
    ? target.mechanism_contract.star_blocks.reduce((sum, item) => sum + (Number.isInteger(item?.block_count) && item.block_count > 0 ? item.block_count : 1), 0)
    : Number.isInteger(target.mechanism_contract.star_blocks?.count) && target.mechanism_contract.star_blocks.count > 0
      ? target.mechanism_contract.star_blocks.count
      : target.mechanism_contract.star_blocks?.items === "unclear" ? 1 : 0;
  const expectedShellBindings = Array.isArray(target.mechanism_contract.shells)
    ? target.mechanism_contract.shells.reduce((sum, item) => sum + (Number.isInteger(item?.block_count) && item.block_count > 0 ? item.block_count : 1), 0)
    : Number.isInteger(target.mechanism_contract.shells?.count) && target.mechanism_contract.shells.count > 0
      ? target.mechanism_contract.shells.count
      : target.mechanism_contract.shells?.items === "unclear" ? 1 : 0;
  assert(candidate.mechanism_bindings.filter((binding) => binding.kind === "star_block").length === expectedStarBindings, `${id}:star_binding_multiplicity_drift`);
  assert(candidate.mechanism_bindings.filter((binding) => binding.kind === "shell").length === expectedShellBindings, `${id}:shell_binding_multiplicity_drift`);
  for (const [kind, contractValue] of [["star_block", target.mechanism_contract.star_blocks], ["shell", target.mechanism_contract.shells]]) {
    if (contractValue?.items !== "unclear" || contractValue?.count != null) continue;
    assert(candidate.mechanism_bindings.some((binding) => (
      binding.kind === kind && binding.binding_status === "unresolved_source_count_or_items" && binding.block_id == null
    )), `${id}:${kind}:missing_explicit_source_unresolved_marker`);
    assert(candidate.runtime_integration.blockers.includes("source_mechanism_count_or_items_unresolved"), `${id}:${kind}:missing_source_mechanism_runtime_blocker`);
  }
}

const globalBlockIds = candidates.levels.flatMap((level) => level.stages.flatMap((stage) => stage.blocks.map((block) => block.id)));
assert(new Set(globalBlockIds).size === globalBlockIds.length, "global_duplicate_block_id");
assert(candidates.summary.structurally_valid_level_count === 100, "candidate_summary_not_100_pass");
assert(candidates.summary.structurally_failed_level_count === 0, "candidate_summary_has_failures");
assert(candidates.summary.solver_validated_level_count === 0, "solver_validated_count_not_zero");
assert(candidates.summary.runtime_integrated_level_count === 0, "runtime_integrated_count_not_zero");
assert(same(candidates.summary.source_missing_level_ids, ["Lv190", "Lv191"]), "candidate_source_missing_summary_drift");

console.log(JSON.stringify({
  status: issues.length ? "FAIL" : "PASS",
  level_count: candidates.levels.length,
  source_missing_level_ids: truth.summary.source_missing_level_ids,
  structurally_valid_level_count: candidates.summary.structurally_valid_level_count,
  solver_validated_level_count: candidates.summary.solver_validated_level_count,
  runtime_integrated_level_count: candidates.summary.runtime_integrated_level_count,
  global_block_id_count: globalBlockIds.length,
  issue_count: issues.length,
  issues,
}, null, 2));
if (issues.length) process.exitCode = 1;
