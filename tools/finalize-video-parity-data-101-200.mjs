import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const blueprintDir = resolve(root, "deliverables/level-generation-blueprint");
const sourcePath = resolve(
  blueprintDir,
  "blockout-lv101-lv200-video-parity-formal-candidates-v1.json",
);
const outputPath = resolve(
  blueprintDir,
  "blockout-lv101-lv200-direct-generated-level-data-v1.json",
);
const manifestPath = resolve(
  blueprintDir,
  "blockout-lv101-lv200-direct-generated-level-data-v1-manifest.json",
);
const markdownPath = resolve(
  blueprintDir,
  "blockout-lv101-lv200-direct-generated-level-data-v1.md",
);

const GENERATED_ON = "2026-09-17";
const REVISION = "lv101-200-video-parity-direct-data-v1";

const readJson = async (path) => JSON.parse((await readFile(path, "utf8")).replace(/^\uFEFF/, ""));
const sha256Buffer = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const sha256File = async (path) => sha256Buffer(await readFile(path));
const rel = (path) => relative(root, path).replaceAll("\\", "/");

const asArray = (value) => Array.isArray(value) ? value : [];
const arrayCount = (value) => Array.isArray(value) ? value.length : value == null ? null : 0;
const objectOrArrayCount = (value, countKey = "count") => {
  if (Array.isArray(value)) return value.length;
  if (value == null) return null;
  if (typeof value !== "object") return null;
  if (Number.isInteger(value[countKey]) && value[countKey] >= 0) return value[countKey];
  if (Array.isArray(value.items)) return value.items.length;
  return null;
};

const mechanismBindingCounts = (level) => {
  const count = (kind) => level.mechanism_bindings.filter((binding) => binding.kind === kind).length;
  return {
    numeric_ice: count("numeric_ice"),
    shell: count("shell"),
    key: count("key_block"),
    lock: count("lock_block"),
    axis_block: count("axis_block"),
    star_block: count("star_block"),
    timed_bomb: count("bomb"),
    circular_double_arrow: count("circular_double_arrow_marked_block"),
  };
};

const mechanismCounts = (level) => {
  const contract = level.mechanism_contract ?? {};
  const exits = contract.directional_exits ?? {};
  const keysLocks = contract.keys_locks ?? contract.key_locks;
  const circularDoubleArrow = asArray(contract.unsupported).filter((item) => (
    /circular[_ -]?double[_ -]?arrow/i.test(String(item?.name ?? item?.type ?? ""))
    || (Number.isInteger(item?.count) && /double-arrow/i.test(String(item?.appearance ?? "")))
  ));
  const circularDoubleArrowCount = circularDoubleArrow.reduce((sum, item) => (
    sum + (Number.isInteger(item.count) && item.count > 0 ? item.count : 1)
  ), 0);
  return {
    ordinary_exit: arrayCount(exits.ordinary),
    frozen_exit: arrayCount(exits.frozen),
    star_exit: arrayCount(exits.star),
    numeric_ice: objectOrArrayCount(contract.numeric_ice),
    shell: objectOrArrayCount(contract.shells),
    key: Array.isArray(keysLocks)
      ? keysLocks.filter((item) => item?.type === "key").length
      : keysLocks == null ? null : Number.isInteger(keysLocks.key_count) ? keysLocks.key_count : null,
    lock: Array.isArray(keysLocks)
      ? keysLocks.filter((item) => item?.type === "lock").length
      : keysLocks == null ? null : Number.isInteger(keysLocks.lock_count) ? keysLocks.lock_count : null,
    axis_block: arrayCount(contract.axis_blocks),
    cover: arrayCount(contract.covers),
    staged_frame: arrayCount(contract.staged_frames),
    generator: arrayCount(contract.generators),
    elevator: arrayCount(contract.elevators),
    conveyor: arrayCount(contract.conveyors),
    star_block: objectOrArrayCount(contract.star_blocks),
    timed_bomb: arrayCount(contract.bombs),
    circular_double_arrow: circularDoubleArrowCount,
    flip_door: arrayCount(contract.flip_doors),
    colored_grid: arrayCount(contract.colored_grid),
  };
};

const source = await readJson(sourcePath);
if (source.schema_version !== "blockout-video-parity-formal-candidates-101-200-v1") {
  throw new Error(`Unexpected source schema: ${String(source.schema_version)}`);
}
const expectedIds = Array.from({ length: 100 }, (_, index) => index + 101);
const actualIds = source.levels.map((level) => level.id);
if (JSON.stringify(actualIds) !== JSON.stringify(expectedIds)) {
  throw new Error("Source candidate IDs are not the contiguous Lv101-Lv200 range");
}

const directLevels = source.levels.map((level) => ({
  id: level.id,
  level_id: level.level_id,
  status: level.status.includes("explicit_source_evidence_gaps")
    ? "direct_generated_unsolved_with_explicit_source_evidence_gaps"
    : "direct_generated_unsolved",
  generation: {
    revision: REVISION,
    generated_on: GENERATED_ON,
    solver_run: false,
    active_campaign: false,
    source_candidate_status: level.status,
  },
  provenance: level.provenance,
  board: level.board,
  time_seconds: level.time_seconds,
  palette: level.palette,
  source_to_design_color_class: level.source_to_design_color_class,
  color_realization: level.color_realization,
  opening_stage_id: level.opening_stage_id,
  stage_events: level.stage_events,
  stage_conflicts: level.stage_conflicts,
  stages: level.stages,
  mechanism_contract: level.mechanism_contract,
  mechanism_bindings: level.mechanism_bindings,
  runtime_unsupported_mechanisms: level.runtime_unsupported_mechanisms,
  mechanism_counts: mechanismCounts(level),
  mechanism_binding_counts: mechanismBindingCounts(level),
  solver: level.solver,
  runtime_integration: {
    ...level.runtime_integration,
    status: "deferred_until_solver_and_runtime_mechanism_support",
  },
}));

await mkdir(blueprintDir, { recursive: true });
await writeFile(outputPath, `${JSON.stringify(directLevels, null, 2)}\n`, "utf8");

const levelIndex = directLevels.map((level) => {
  const blocks = level.stages.flatMap((stage) => stage.blocks);
  const opening = level.stages.find((stage) => stage.id === level.opening_stage_id);
  return {
    id: level.id,
    level_id: level.level_id,
    status: level.status,
    source_classification: level.provenance.source_classification,
    design_fill_field_count: level.provenance.design_fill_fields.length,
    board: {
      rows: level.board.height,
      cols: level.board.width,
      playable_cells: level.board.playable_cell_count,
    },
    time_seconds: level.time_seconds,
    color_count: level.palette.length,
    stage_count: level.stages.length,
    opening_block_count: opening?.blocks.length ?? 0,
    full_block_count: blocks.length,
    mechanism_counts: level.mechanism_counts,
    mechanism_binding_counts: level.mechanism_binding_counts,
    unresolved_mechanism_binding_count: level.mechanism_bindings.filter((binding) => !binding.block_id).length,
    runtime_unsupported_mechanisms: level.runtime_unsupported_mechanisms,
    runtime_blockers: level.runtime_integration.blockers,
  };
});

const mechanismNames = Object.keys(levelIndex[0].mechanism_counts);
const mechanismFirstAppearance = Object.fromEntries(mechanismNames.map((name) => {
  const first = levelIndex.find((level) => (
    (level.mechanism_counts[name] ?? 0) > 0
    || (level.mechanism_binding_counts[name] ?? 0) > 0
  ));
  return [name, first?.id ?? null];
}));
const mechanismLevelCounts = Object.fromEntries(mechanismNames.map((name) => [
  name,
  levelIndex.filter((level) => (
    (level.mechanism_counts[name] ?? 0) > 0
    || (level.mechanism_binding_counts[name] ?? 0) > 0
  )).length,
]));
const unsupportedByName = {};
for (const level of directLevels) {
  for (const name of level.runtime_unsupported_mechanisms) {
    (unsupportedByName[name] ??= []).push(level.id);
  }
}

const outputSha256 = await sha256File(outputPath);
const manifest = {
  schema_version: "blockout-video-parity-direct-level-data-manifest-101-200-v1",
  revision: REVISION,
  generated_on: GENERATED_ON,
  status: "generated_unsolved_not_active_campaign",
  dataset: {
    path: rel(outputPath),
    sha256: outputSha256,
  },
  source_candidate: {
    path: rel(sourcePath),
    sha256: await sha256File(sourcePath),
    schema_version: source.schema_version,
  },
  level_range: { first: 101, last: 200 },
  summary: {
    level_count: directLevels.length,
    stage_count: directLevels.reduce((sum, level) => sum + level.stages.length, 0),
    block_count: directLevels.reduce(
      (sum, level) => sum + level.stages.reduce((stageSum, stage) => stageSum + stage.blocks.length, 0),
      0,
    ),
    structurally_valid_level_count: source.summary.structurally_valid_level_count,
    solver_validated_level_count: 0,
    active_campaign_level_count: 0,
    source_missing_level_ids: source.summary.source_missing_level_ids,
    source_unresolved_mechanism_level_ids: source.summary.levels_with_source_unresolved_mechanisms,
    pending_stage_payload_event_count: source.summary.pending_stage_payload_event_count,
    unresolved_pooled_hidden_partition_count: source.summary.unresolved_pooled_hidden_partition_count,
  },
  mechanism_first_appearance: mechanismFirstAppearance,
  mechanism_level_counts: mechanismLevelCounts,
  runtime_unsupported_mechanism_levels: unsupportedByName,
  levels: levelIndex,
};
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

const mechanismRows = mechanismNames.map((name) => (
  `| ${name} | ${mechanismFirstAppearance[name] == null ? "—" : `Lv${mechanismFirstAppearance[name]}`} | ${mechanismLevelCounts[name]} |`
));
const gapRows = levelIndex
  .filter((level) => level.runtime_blockers.length || level.runtime_unsupported_mechanisms.length)
  .map((level) => `| ${level.level_id} | ${level.runtime_unsupported_mechanisms.join("、") || "—"} | ${level.runtime_blockers.join("、") || "—"} |`);
const markdown = [
  "# Block Out! Lv101–200 直接生成关卡数据",
  "",
  `- 版本：\`${REVISION}\``,
  `- 数据：\`${rel(outputPath)}\``,
  `- SHA-256：\`${outputSha256}\``,
  `- 关卡：${directLevels.length}（Lv101–Lv200）`,
  `- 阶段：${manifest.summary.stage_count}；色块：${manifest.summary.block_count}`,
  "- 求解器：未运行（按用户要求）。",
  "- 主线接入：未启用；数据保留来源缺失、设计补位和运行时未支持机制标记。",
  "",
  "## 机制首次出现与覆盖关数",
  "",
  "| 机制 | 首次出现 | 覆盖关数 |",
  "|---|---:|---:|",
  ...mechanismRows,
  "",
  "## 仍需求解/运行时收口的关卡",
  "",
  "| 关卡 | 当前运行时未支持机制 | 阻断标记 |",
  "|---:|---|---|",
  ...gapRows,
  "",
].join("\n");
await writeFile(markdownPath, markdown, "utf8");

console.log(JSON.stringify({
  status: "PASS",
  revision: REVISION,
  dataset: rel(outputPath),
  dataset_sha256: outputSha256,
  manifest: rel(manifestPath),
  level_count: manifest.summary.level_count,
  stage_count: manifest.summary.stage_count,
  block_count: manifest.summary.block_count,
  solver_validated_level_count: 0,
  active_campaign_level_count: 0,
  source_missing_level_ids: manifest.summary.source_missing_level_ids,
}, null, 2));
