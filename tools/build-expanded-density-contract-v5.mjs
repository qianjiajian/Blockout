import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BUILDER_PATH = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(BUILDER_PATH), "..");
const SOURCE_RELATIVE = "deliverables/level-generation-blueprint/blockout-lv001-lv100-competitor-constrained-design-contract-v4.json";
const OUTPUT_RELATIVE = "deliverables/level-generation-blueprint/blockout-lv001-lv100-expanded-density-contract-v5.json";
const AUDIT_JSON_RELATIVE = "deliverables/level-generation-blueprint/blockout-lv001-lv100-expanded-density-contract-v5-audit.json";
const AUDIT_MD_RELATIVE = "deliverables/level-generation-blueprint/blockout-lv001-lv100-expanded-density-contract-v5-audit.md";
const BUILDER_RELATIVE = "tools/build-expanded-density-contract-v5.mjs";

const sourcePath = path.resolve(ROOT, SOURCE_RELATIVE);
const outputPath = path.resolve(ROOT, OUTPUT_RELATIVE);
const auditJsonPath = path.resolve(ROOT, AUDIT_JSON_RELATIVE);
const auditMarkdownPath = path.resolve(ROOT, AUDIT_MD_RELATIVE);

const GENERATED_ON = "2026-09-11";
const WAVE_OFFSETS = [0, 1, 2, 2, 3];
const DENSITY_CHAPTERS = [
  { from: 21, to: 40, baseMinimum: 24 },
  { from: 41, to: 60, baseMinimum: 28 },
  { from: 61, to: 80, baseMinimum: 32 },
  { from: 81, to: 100, baseMinimum: 36 },
];
const SHAPE_ORDER = [
  "SINGLE",
  "H2",
  "V2",
  "H3",
  "V3",
  "SQ2",
  "L3",
  "T4",
  "L4",
  "CROSS5",
  "RECT2X3",
  "SQ3",
];
const SHAPE_AREA = {
  SINGLE: 1,
  H2: 2,
  V2: 2,
  H3: 3,
  V3: 3,
  SQ2: 4,
  L3: 3,
  T4: 4,
  L4: 4,
  CROSS5: 5,
  RECT2X3: 6,
  SQ3: 9,
};

const clone = (value) => structuredClone(value);
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex").toUpperCase();
const deepEqual = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const histogramCount = (histogram) => Object.values(histogram).reduce((sum, count) => sum + count, 0);
const histogramArea = (histogram) => Object.entries(histogram).reduce((sum, [shape, count]) => {
  if (!SHAPE_AREA[shape]) throw new Error(`Unknown shape ${shape}.`);
  return sum + SHAPE_AREA[shape] * count;
}, 0);
const orderedShapes = (shapes) => [...shapes].sort((left, right) => {
  const leftIndex = SHAPE_ORDER.indexOf(left);
  const rightIndex = SHAPE_ORDER.indexOf(right);
  return (leftIndex < 0 ? Number.MAX_SAFE_INTEGER : leftIndex)
    - (rightIndex < 0 ? Number.MAX_SAFE_INTEGER : rightIndex)
    || left.localeCompare(right);
});
const orderedHistogram = (histogram) => Object.fromEntries(
  orderedShapes(Object.keys(histogram)).map((shape) => [shape, histogram[shape]]),
);
const shapeSet = (histogram) => orderedShapes(Object.keys(histogram).filter((shape) => histogram[shape] > 0));
const compactHistogram = (histogram) => Object.entries(histogram)
  .map(([shape, count]) => `${shape}×${count}`)
  .join(" + ");

const densityFormulaFor = (levelNumber) => {
  const chapter = DENSITY_CHAPTERS.find(({ from, to }) => levelNumber >= from && levelNumber <= to);
  if (!chapter) return null;
  const index = levelNumber - chapter.from;
  const group = Math.floor(index / 5);
  const position = index % 5;
  const waveOffset = WAVE_OFFSETS[position];
  return {
    chapter_from: chapter.from,
    chapter_to: chapter.to,
    chapter_base_minimum: chapter.baseMinimum,
    group_index_zero_based: group,
    group_number: group + 1,
    position_index_zero_based: position,
    position_number: position + 1,
    wave_offset: waveOffset,
    formula_minimum: chapter.baseMinimum + group + waveOffset,
    group_peak_minimum: chapter.baseMinimum + group + 3,
  };
};

/**
 * Hamilton/largest-remainder apportionment. Quotas are based only on the v4
 * histogram. Because the v5 total never drops below v4, each positive source
 * shape receives at least one item (and in practice at least its v4 count).
 */
const expandHistogramLargestRemainder = (sourceHistogram, targetCount) => {
  const shapes = shapeSet(sourceHistogram);
  if (!shapes.length) throw new Error("Cannot expand an empty shape histogram.");
  const sourceCount = histogramCount(sourceHistogram);
  if (!Number.isInteger(targetCount) || targetCount < sourceCount) {
    throw new Error(`Expanded count ${targetCount} cannot be below source count ${sourceCount}.`);
  }
  const allocations = {};
  const remainders = [];
  let allocated = 0;
  for (const shape of shapes) {
    const numerator = sourceHistogram[shape] * targetCount;
    const floor = Math.max(1, Math.floor(numerator / sourceCount));
    allocations[shape] = floor;
    allocated += floor;
    remainders.push({
      shape,
      remainderNumerator: numerator % sourceCount,
      sourceCount: sourceHistogram[shape],
      shapeOrder: SHAPE_ORDER.indexOf(shape),
    });
  }
  let seats = targetCount - allocated;
  if (seats < 0) throw new Error("Minimum-one shape allocation exceeded the target count.");
  remainders.sort((left, right) => right.remainderNumerator - left.remainderNumerator
    || right.sourceCount - left.sourceCount
    || left.shapeOrder - right.shapeOrder
    || left.shape.localeCompare(right.shape));
  for (let index = 0; index < seats; index += 1) {
    allocations[remainders[index % remainders.length].shape] += 1;
  }
  return orderedHistogram(allocations);
};

const sourceBytes = fs.readFileSync(sourcePath);
const source = JSON.parse(sourceBytes.toString("utf8"));
if (!Array.isArray(source.levels) || source.levels.length !== 100) {
  throw new Error(`Expected exactly 100 v4 levels, received ${source.levels?.length ?? "missing"}.`);
}

const v5Levels = source.levels.map((sourceLevel, index) => {
  const levelNumber = index + 1;
  if (sourceLevel.level_id !== `Lv${String(levelNumber).padStart(3, "0")}`) {
    throw new Error(`Unexpected level id at index ${index}: ${sourceLevel.level_id}.`);
  }
  if (levelNumber <= 20) return clone(sourceLevel);

  const formula = densityFormulaFor(levelNumber);
  if (!formula) throw new Error(`Missing density formula for ${sourceLevel.level_id}.`);
  const sourceTarget = sourceLevel.our_design_target;
  const v4Count = sourceTarget.full_level_block_count;
  const finalCount = Math.max(v4Count, formula.formula_minimum);
  const expandedHistogram = expandHistogramLargestRemainder(
    sourceTarget.full_level_shape_histogram,
    finalCount,
  );
  const occupiedCells = histogramArea(expandedHistogram);
  const playableCells = sourceTarget.board.playable_cell_count;
  const expanded = clone(sourceLevel);
  expanded.our_design_target = {
    ...expanded.our_design_target,
    full_level_block_count: finalCount,
    full_level_shape_histogram: expandedHistogram,
    full_level_occupied_cell_count: occupiedCells,
    requires_staged_reveal: occupiedCells > playableCells,
    density_expansion_v5: {
      source_contract: SOURCE_RELATIVE,
      source_level_id: sourceLevel.level_id,
      v4_block_count: v4Count,
      chapter_range: `Lv${String(formula.chapter_from).padStart(3, "0")}-Lv${String(formula.chapter_to).padStart(3, "0")}`,
      chapter_base_minimum: formula.chapter_base_minimum,
      group_number: formula.group_number,
      position_number: formula.position_number,
      wave_offsets: WAVE_OFFSETS,
      applied_wave_offset: formula.wave_offset,
      formula_minimum: formula.formula_minimum,
      final_block_count_rule: "max(v4_block_count, formula_minimum)",
      final_block_count: finalCount,
      added_blocks: finalCount - v4Count,
      legacy_high_density_override: v4Count > formula.formula_minimum,
      shape_apportionment: "largest_remainder_from_v4_histogram_with_every_original_shape_at_least_one",
    },
    field_provenance: {
      ...expanded.our_design_target.field_provenance,
      full_level_block_count: {
        classification: "expanded_density_design_target_not_competitor_fact",
        anchors: [
          { level_id: sourceLevel.level_id, v4_block_count: v4Count },
          {
            chapter_from: formula.chapter_from,
            chapter_to: formula.chapter_to,
            chapter_base_minimum: formula.chapter_base_minimum,
            group_number: formula.group_number,
            position_number: formula.position_number,
            wave_offset: formula.wave_offset,
          },
        ],
        rule: "Use max(v4 block count, chapter base + zero-based five-level group + [0,1,2,2,3] position offset); never reduce the v4 count.",
        confidence: "deterministic_v5_policy",
        requires_video_confirmation: false,
      },
      full_level_shape_histogram: {
        classification: "expanded_density_design_target_not_competitor_fact",
        anchors: [{ level_id: sourceLevel.level_id, v4_shape_histogram: sourceTarget.full_level_shape_histogram }],
        rule: "Apportion the final block count by Hamilton largest remainder from the v4 histogram; preserve exactly the original positive shape set and allocate every original shape at least once.",
        confidence: "deterministic_v5_policy",
        requires_video_confirmation: false,
      },
    },
  };
  return expanded;
});

const auditRows = [];
const validationErrors = [];
const check = (condition, message) => {
  if (!condition) validationErrors.push(message);
  return Boolean(condition);
};

for (let index = 0; index < source.levels.length; index += 1) {
  const levelNumber = index + 1;
  const levelId = `Lv${String(levelNumber).padStart(3, "0")}`;
  const before = source.levels[index];
  const after = v5Levels[index];
  const beforeTarget = before.our_design_target;
  const afterTarget = after.our_design_target;
  const formula = densityFormulaFor(levelNumber);
  const expectedCount = formula
    ? Math.max(beforeTarget.full_level_block_count, formula.formula_minimum)
    : beforeTarget.full_level_block_count;
  const expectedHistogram = formula
    ? expandHistogramLargestRemainder(beforeTarget.full_level_shape_histogram, expectedCount)
    : beforeTarget.full_level_shape_histogram;
  const expectedOccupied = formula
    ? histogramArea(expectedHistogram)
    : beforeTarget.full_level_occupied_cell_count;
  const checks = {
    level_id_sequential: check(after.level_id === levelId, `${levelId}: level id is not sequential.`),
    lv1_20_exact_level_object: levelNumber <= 20
      ? check(deepEqual(after, before), `${levelId}: Lv1-20 level object changed.`)
      : true,
    evidence_unchanged: check(deepEqual(after.evidence, before.evidence), `${levelId}: evidence changed.`),
    evidence_partition_unchanged: check(deepEqual(after.evidence_partition, before.evidence_partition), `${levelId}: evidence partition changed.`),
    competitor_reference_unchanged: check(deepEqual(after.competitor_reference, before.competitor_reference), `${levelId}: competitor reference changed.`),
    board_unchanged: check(deepEqual(afterTarget.board, beforeTarget.board), `${levelId}: board changed.`),
    color_count_unchanged: check(afterTarget.full_level_color_count === beforeTarget.full_level_color_count, `${levelId}: color count changed.`),
    palette_unchanged: check(deepEqual(afterTarget.design_palette, beforeTarget.design_palette), `${levelId}: palette changed.`),
    d1_unchanged: check(deepEqual(afterTarget.target_d1_difficulty, beforeTarget.target_d1_difficulty), `${levelId}: D1 target changed.`),
    reposition_floor_unchanged: check(
      afterTarget.recommended_minimum_reposition_overhead === beforeTarget.recommended_minimum_reposition_overhead,
      `${levelId}: reposition floor changed.`,
    ),
    count_formula_exact: check(afterTarget.full_level_block_count === expectedCount, `${levelId}: block-count formula mismatch.`),
    never_reduced: check(afterTarget.full_level_block_count >= beforeTarget.full_level_block_count, `${levelId}: block count was reduced.`),
    histogram_largest_remainder_exact: check(
      deepEqual(afterTarget.full_level_shape_histogram, expectedHistogram),
      `${levelId}: histogram is not the deterministic largest-remainder result.`,
    ),
    histogram_total_exact: check(
      histogramCount(afterTarget.full_level_shape_histogram) === afterTarget.full_level_block_count,
      `${levelId}: histogram total does not equal block count.`,
    ),
    shape_set_unchanged: check(
      deepEqual(shapeSet(afterTarget.full_level_shape_histogram), shapeSet(beforeTarget.full_level_shape_histogram)),
      `${levelId}: positive shape set changed.`,
    ),
    every_original_shape_present: check(
      shapeSet(beforeTarget.full_level_shape_histogram).every((shape) => afterTarget.full_level_shape_histogram[shape] >= 1),
      `${levelId}: an original shape received no allocation.`,
    ),
    occupied_cells_exact: check(afterTarget.full_level_occupied_cell_count === expectedOccupied, `${levelId}: occupied cell count mismatch.`),
    staged_reveal_exact: formula
      ? check(
        afterTarget.requires_staged_reveal === (expectedOccupied > afterTarget.board.playable_cell_count),
        `${levelId}: staged-reveal flag does not match occupied>playable.`,
      )
      : true,
  };
  auditRows.push({
    level_id: levelId,
    scope: levelNumber <= 20 ? "v4_level_object_preserved_exactly" : "v5_expanded_density_formula",
    chapter_range: formula ? `Lv${String(formula.chapter_from).padStart(3, "0")}-Lv${String(formula.chapter_to).padStart(3, "0")}` : "Lv001-Lv020",
    group_number: formula?.group_number ?? null,
    position_number: formula?.position_number ?? null,
    wave_offset: formula?.wave_offset ?? null,
    formula_minimum: formula?.formula_minimum ?? null,
    legacy_high_density_override: formula ? beforeTarget.full_level_block_count > formula.formula_minimum : false,
    v4_block_count: beforeTarget.full_level_block_count,
    v5_block_count: afterTarget.full_level_block_count,
    added_blocks: afterTarget.full_level_block_count - beforeTarget.full_level_block_count,
    v4_shape_histogram: beforeTarget.full_level_shape_histogram,
    v5_shape_histogram: afterTarget.full_level_shape_histogram,
    v4_occupied_cell_count: beforeTarget.full_level_occupied_cell_count,
    v5_occupied_cell_count: afterTarget.full_level_occupied_cell_count,
    playable_cell_count: afterTarget.board.playable_cell_count,
    v4_requires_staged_reveal: beforeTarget.requires_staged_reveal,
    v5_requires_staged_reveal: afterTarget.requires_staged_reveal,
    target_d1_calibrated_score: afterTarget.target_d1_difficulty.calibrated_score,
    recommended_minimum_reposition_overhead: afterTarget.recommended_minimum_reposition_overhead,
    checks,
    validation: Object.values(checks).every(Boolean) ? "pass" : "fail",
  });
}

if (validationErrors.length) {
  throw new Error(`v5 contract validation failed (${validationErrors.length}):\n${validationErrors.join("\n")}`);
}

const chapterSummaries = DENSITY_CHAPTERS.map((chapter) => {
  const rows = auditRows.slice(chapter.from - 1, chapter.to);
  const groupPeaks = Array.from({ length: 4 }, (_, groupIndex) => ({
    group_number: groupIndex + 1,
    levels: `Lv${String(chapter.from + groupIndex * 5).padStart(3, "0")}-Lv${String(chapter.from + groupIndex * 5 + 4).padStart(3, "0")}`,
    formula_minima: WAVE_OFFSETS.map((offset) => chapter.baseMinimum + groupIndex + offset),
    peak_minimum: chapter.baseMinimum + groupIndex + 3,
  }));
  return {
    levels: `Lv${String(chapter.from).padStart(3, "0")}-Lv${String(chapter.to).padStart(3, "0")}`,
    chapter_base_minimum: chapter.baseMinimum,
    formula_minimum_range: [chapter.baseMinimum, chapter.baseMinimum + 6],
    group_peaks: groupPeaks,
    v4_block_count_total: rows.reduce((sum, row) => sum + row.v4_block_count, 0),
    v5_block_count_total: rows.reduce((sum, row) => sum + row.v5_block_count, 0),
    added_blocks: rows.reduce((sum, row) => sum + row.added_blocks, 0),
    expanded_level_count: rows.filter((row) => row.added_blocks > 0).length,
    preserved_higher_v4_count_level_count: rows.filter((row) => row.added_blocks === 0).length,
    actual_v5_count_range: [
      Math.min(...rows.map((row) => row.v5_block_count)),
      Math.max(...rows.map((row) => row.v5_block_count)),
    ],
    staged_reveal_level_count: rows.filter((row) => row.v5_requires_staged_reveal).length,
  };
});

const expandedRows = auditRows.filter((row) => row.added_blocks > 0);
const sourceStagedCount = auditRows.filter((row) => row.v4_requires_staged_reveal).length;
const v5StagedCount = auditRows.filter((row) => row.v5_requires_staged_reveal).length;
const newlyStagedRows = auditRows.filter((row) => !row.v4_requires_staged_reveal && row.v5_requires_staged_reveal);
const summary = {
  level_count: 100,
  validation_passed_level_count: auditRows.filter((row) => row.validation === "pass").length,
  validation_failed_level_count: auditRows.filter((row) => row.validation !== "pass").length,
  lv1_20_exact_level_objects: 20,
  density_formula_level_count: 80,
  expanded_level_count: expandedRows.length,
  unchanged_because_v4_already_met_or_exceeded_minimum: 80 - expandedRows.length,
  legacy_high_density_override_level_count: auditRows.filter((row) => row.legacy_high_density_override).length,
  legacy_high_density_override_levels: auditRows.filter((row) => row.legacy_high_density_override).map((row) => row.level_id),
  v4_total_block_count: auditRows.reduce((sum, row) => sum + row.v4_block_count, 0),
  v5_total_block_count: auditRows.reduce((sum, row) => sum + row.v5_block_count, 0),
  total_added_blocks: expandedRows.reduce((sum, row) => sum + row.added_blocks, 0),
  maximum_added_blocks_on_one_level: Math.max(0, ...expandedRows.map((row) => row.added_blocks)),
  v4_staged_reveal_level_count: sourceStagedCount,
  v5_staged_reveal_level_count: v5StagedCount,
  levels_requiring_staged_reveal: v5StagedCount,
  newly_staged_reveal_level_count: newlyStagedRows.length,
  newly_staged_reveal_levels: newlyStagedRows.map((row) => row.level_id),
  board_preserved_level_count: auditRows.filter((row) => row.checks.board_unchanged).length,
  color_count_preserved_level_count: auditRows.filter((row) => row.checks.color_count_unchanged).length,
  palette_preserved_level_count: auditRows.filter((row) => row.checks.palette_unchanged).length,
  shape_set_preserved_level_count: auditRows.filter((row) => row.checks.shape_set_unchanged).length,
  d1_preserved_level_count: auditRows.filter((row) => row.checks.d1_unchanged).length,
  reposition_floor_preserved_level_count: auditRows.filter((row) => row.checks.reposition_floor_unchanged).length,
  applied_level_count: 0,
  solver_validated_level_count: 0,
};

const v5 = {
  ...clone(source),
  title: "Block Out! Lv1-100 扩容密度原创关卡设计合同 v5",
  generated_on: GENERATED_ON,
  status: "expanded_density_design_contract_pending_solver",
  source_contract_v4: {
    path: SOURCE_RELATIVE,
    sha256: sha256(sourceBytes),
    relation: "Lv1-20 exact level objects; Lv21-100 deterministic density expansion only",
  },
  generated_by: {
    path: BUILDER_RELATIVE,
    policy_version: "expanded-density-v5",
  },
  contract_rules: {
    ...clone(source.contract_rules),
    our_design_target: "Lv1-20 level objects are unchanged from v4. Lv21-100 retain v4 board, colors, D1 and reposition floors while block counts and shape histograms follow the deterministic v5 density policy.",
    density_expansion: "For Lv21-100, minimum=m+floor(index/5)+[0,1,2,2,3][index%5], with m=24/28/32/36 by 20-level chapter; final count=max(v4 count, minimum).",
    legacy_high_density_override: "A v4 count above the formula minimum is retained and labeled as a legacy high-density override. The formula is a hard floor, not an assertion that each final five-level group peaks numerically at its fifth level.",
    shape_apportionment: "Preserve the v4 positive shape set and apportion the final count by Hamilton largest remainder from the v4 histogram, with every source shape receiving at least one block.",
    staged_reveal: "Recompute occupied cells from the v5 histogram; requires_staged_reveal is true exactly when occupied cells exceed playable cells.",
    immutable_fields: "Rows, cols, playable mask/count, color count, design palette, target D1 and recommended minimum reposition overhead remain unchanged.",
  },
  summary: {
    ...clone(source.summary),
    ...summary,
  },
  levels: v5Levels,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
const outputBytes = Buffer.from(`${JSON.stringify(v5, null, 2)}\n`, "utf8");
fs.writeFileSync(outputPath, outputBytes);

const builderBytes = fs.readFileSync(BUILDER_PATH);
const audit = {
  title: "Block Out! Lv1-100 expanded-density v5 contract audit",
  generated_on: GENERATED_ON,
  status: "pass",
  source_contract: { path: SOURCE_RELATIVE, sha256: sha256(sourceBytes) },
  output_contract: { path: OUTPUT_RELATIVE, sha256: sha256(outputBytes) },
  builder: { path: BUILDER_RELATIVE, sha256: sha256(builderBytes) },
  policy: {
    lv1_20: "preserve each v4 level object exactly",
    chapter_base_minima: Object.fromEntries(DENSITY_CHAPTERS.map((chapter) => [
      `Lv${String(chapter.from).padStart(3, "0")}-Lv${String(chapter.to).padStart(3, "0")}`,
      chapter.baseMinimum,
    ])),
    wave_offsets: WAVE_OFFSETS,
    formula: "minimum = chapter_base + floor(chapter_index / 5) + wave_offsets[chapter_index % 5]",
    final_count: "max(v4_block_count, formula_minimum)",
    legacy_high_density_override: "Retain and label any v4 count above the formula floor; do not claim that final block counts always peak at the fifth level.",
    histogram: "Hamilton largest remainder using v4 shape proportions; exact v4 positive shape set; every shape >=1",
    staging: "requires_staged_reveal = occupied_cell_count > playable_cell_count",
    preserved: ["board rows", "board cols", "playable mask/count", "color count", "design palette", "D1 target", "reposition floor"],
  },
  summary,
  chapters: chapterSummaries,
  levels: auditRows,
};
const auditJsonBytes = Buffer.from(`${JSON.stringify(audit, null, 2)}\n`, "utf8");
fs.writeFileSync(auditJsonPath, auditJsonBytes);

const markdown = [
  "# Block Out! Lv1-100 扩容密度合同 v5 审计",
  "",
  `- 状态：**PASS（${summary.validation_passed_level_count}/100）**`,
  `- v4 输入：\`${SOURCE_RELATIVE}\`（SHA-256 \`${audit.source_contract.sha256}\`）`,
  `- v5 输出：\`${OUTPUT_RELATIVE}\`（SHA-256 \`${audit.output_contract.sha256}\`）`,
  `- 构建脚本：\`${BUILDER_RELATIVE}\`（SHA-256 \`${audit.builder.sha256}\`）`,
  "- 本产物未接入正式关卡，未执行求解器验收。",
  "",
  "## 固化规则",
  "",
  "- Lv1-20：每个 level 对象与 v4 完全一致。",
  "- Lv21-100：`minimum = m + floor(index/5) + [0,1,2,2,3][index%5]`。",
  "- 章节起始下限 `m`：Lv21-40=24、Lv41-60=28、Lv61-80=32、Lv81-100=36。",
  "- 最终块数：`max(v4 原块数, minimum)`，绝不减少。",
  "- 若 v4 原块数高于公式下限，则标记为 `legacy_high_density_override`；公式是硬下限，不代表最终块数在每组第5关一定最高。每5关难度峰仍由原 D1/必要腾挪 floor 负责。",
  "- 形状：保持 v4 的正计数 shape 集合，按 v4 比例用 largest remainder 扩容，每种至少 1 块。",
  "- 棋盘、颜色数、palette、D1、必要腾挪 floor：保持 v4 不变。",
  "- `occupied_cell_count` 按 v5 histogram 重算；超过 playable cells 时标记 staged reveal。",
  "",
  "## 汇总",
  "",
  `- 实际扩容：${summary.expanded_level_count}/80 关；v4 已达到或超过下限：${summary.unchanged_because_v4_already_met_or_exceeded_minimum}/80 关。`,
  `- legacy high-density override：${summary.legacy_high_density_override_level_count} 关。`,
  `- 总块数：${summary.v4_total_block_count} → ${summary.v5_total_block_count}（+${summary.total_added_blocks}）。`,
  `- staged reveal：${summary.v4_staged_reveal_level_count} → ${summary.v5_staged_reveal_level_count}；新增 ${summary.newly_staged_reveal_level_count} 关。`,
  `- 棋盘/颜色数/palette/shape集合/D1/腾挪 floor 校验：均为 100/100。`,
  "",
  "## 章节波浪",
  "",
  "| 章节 | 起始下限 | 四组公式波峰 | v4块数合计 | v5块数合计 | 增加 | 扩容关数 | v5实际范围 | staged |",
  "|---|---:|---|---:|---:|---:|---:|---|---:|",
  ...chapterSummaries.map((chapter) => `| ${chapter.levels} | ${chapter.chapter_base_minimum} | ${chapter.group_peaks.map((group) => group.peak_minimum).join(" / ")} | ${chapter.v4_block_count_total} | ${chapter.v5_block_count_total} | +${chapter.added_blocks} | ${chapter.expanded_level_count} | ${chapter.actual_v5_count_range.join("-")} | ${chapter.staged_reveal_level_count} |`),
  "",
  "## 逐关审计",
  "",
  "| 关卡 | 规则下限 | v4块数 | v5块数 | 增加 | legacy高密度 | v4形状 | v5形状 | 占格/可玩格 | staged | D1 | 腾挪floor | 校验 |",
  "|---|---:|---:|---:|---:|---|---|---|---|---|---:|---:|---|",
  ...auditRows.map((row) => `| ${row.level_id} | ${row.formula_minimum ?? "保留"} | ${row.v4_block_count} | ${row.v5_block_count} | +${row.added_blocks} | ${row.legacy_high_density_override ? "是" : "否"} | ${compactHistogram(row.v4_shape_histogram)} | ${compactHistogram(row.v5_shape_histogram)} | ${row.v5_occupied_cell_count}/${row.playable_cell_count} | ${row.v5_requires_staged_reveal ? "是" : "否"} | ${row.target_d1_calibrated_score} | ${row.recommended_minimum_reposition_overhead ?? "null"} | ${row.validation.toUpperCase()} |`),
  "",
].join("\n");
fs.writeFileSync(auditMarkdownPath, markdown, "utf8");

console.log(JSON.stringify({
  status: "pass",
  validated_levels: summary.validation_passed_level_count,
  outputs: {
    contract: { path: OUTPUT_RELATIVE, sha256: sha256(outputBytes) },
    audit_json: { path: AUDIT_JSON_RELATIVE, sha256: sha256(auditJsonBytes) },
    audit_markdown: { path: AUDIT_MD_RELATIVE, sha256: sha256(Buffer.from(markdown, "utf8")) },
    builder: { path: BUILDER_RELATIVE, sha256: sha256(builderBytes) },
  },
  summary,
}, null, 2));
