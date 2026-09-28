import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SOURCE_RELATIVE =
  "deliverables/level-generation-blueprint/blockout-lv001-lv100-competitor-constrained-design-contract-v4.json";
const V5_CONTRACT_RELATIVE =
  "deliverables/level-generation-blueprint/blockout-lv001-lv100-expanded-density-contract-v5.json";
const OUTPUT_RELATIVE =
  "playtest-results/experiments/competitor-composition-r141";
const SOURCE_PATH = path.join(ROOT, SOURCE_RELATIVE);
const V5_CONTRACT_PATH = path.join(ROOT, V5_CONTRACT_RELATIVE);
const OUTPUT_DIR = path.join(ROOT, OUTPUT_RELATIVE);
const OUTPUT_JSON = path.join(OUTPUT_DIR, "density-and-staging-plan.json");
const OUTPUT_MD = path.join(OUTPUT_DIR, "density-and-staging-plan.md");

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
const SEGMENT_BASELINES = [24, 28, 32, 36];
const WAVE_OFFSETS = [0, 1, 2, 2, 3];

const sourceBuffer = fs.readFileSync(SOURCE_PATH);
const source = JSON.parse(sourceBuffer.toString("utf8"));
const sourceSha256 = crypto.createHash("sha256").update(sourceBuffer).digest("hex").toUpperCase();
const v5ContractBuffer = fs.readFileSync(V5_CONTRACT_PATH);
const v5Contract = JSON.parse(v5ContractBuffer.toString("utf8"));
const v5ContractSha256 = crypto
  .createHash("sha256")
  .update(v5ContractBuffer)
  .digest("hex")
  .toUpperCase();

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const round = (value, digits = 4) => Number(value.toFixed(digits));
const levelNumber = (level) => Number(String(level.level_id).replace(/^Lv/i, ""));
const histogramCount = (histogram) =>
  Object.values(histogram).reduce((sum, count) => sum + count, 0);
const histogramArea = (histogram) =>
  Object.entries(histogram).reduce((sum, [shape, count]) => {
    assert(SHAPE_AREA[shape], `Unknown shape ${shape}.`);
    return sum + SHAPE_AREA[shape] * count;
  }, 0);
const orderedHistogram = (histogram) =>
  Object.fromEntries(
    Object.entries(histogram)
      .filter(([, count]) => count > 0)
      .sort(([left], [right]) => SHAPE_ORDER.indexOf(left) - SHAPE_ORDER.indexOf(right)),
  );
const maskPlayableCells = (mask) =>
  mask.reduce((sum, row) => sum + [...row].filter((cell) => cell === "#").length, 0);

function scheduleForLevel(number) {
  assert(number >= 21 && number <= 100, `Lv${number} is outside the v5 planning scope.`);
  const segmentIndex = Math.floor((number - 21) / 20);
  const indexWithinSegment = (number - 21) % 20;
  const groupWithinSegment = Math.floor(indexWithinSegment / 5);
  const positionWithinWave = indexWithinSegment % 5;
  const minimum =
    SEGMENT_BASELINES[segmentIndex] +
    groupWithinSegment +
    WAVE_OFFSETS[positionWithinWave];
  return {
    segment_index: segmentIndex,
    segment_levels: `Lv${String(21 + segmentIndex * 20).padStart(3, "0")}-Lv${String(40 + segmentIndex * 20).padStart(3, "0")}`,
    index_within_segment: indexWithinSegment,
    group_within_segment: groupWithinSegment,
    position_within_five_level_wave: positionWithinWave,
    wave_group: `Lv${String(number - positionWithinWave).padStart(3, "0")}-Lv${String(number - positionWithinWave + 4).padStart(3, "0")}`,
    segment_baseline: SEGMENT_BASELINES[segmentIndex],
    wave_offset: WAVE_OFFSETS[positionWithinWave],
    minimum_block_count: minimum,
    is_five_level_peak: positionWithinWave === 4,
  };
}

// Preserve every v4 shape and distribute only the newly added blocks in the
// same proportions. Largest-remainder allocation makes the result exact and
// deterministic without shrinking any existing shape count.
function projectHistogram(original, targetCount) {
  const originalCount = histogramCount(original);
  assert(targetCount >= originalCount, "Projected block count cannot shrink.");
  const delta = targetCount - originalCount;
  const projected = { ...original };
  if (delta === 0) return orderedHistogram(projected);

  const shares = Object.entries(original).map(([shape, count]) => {
    const exact = (delta * count) / originalCount;
    const addition = Math.floor(exact);
    projected[shape] += addition;
    return {
      shape,
      remainderNumerator: (targetCount * count) % originalCount,
      sourceCount: count,
    };
  });
  let remaining = targetCount - histogramCount(projected);
  shares.sort(
    (left, right) =>
      right.remainderNumerator - left.remainderNumerator ||
      right.sourceCount - left.sourceCount ||
      SHAPE_ORDER.indexOf(left.shape) - SHAPE_ORDER.indexOf(right.shape),
  );
  for (let index = 0; index < remaining; index += 1) {
    projected[shares[index % shares.length].shape] += 1;
  }
  return orderedHistogram(projected);
}

function packStages(histogram, playableCells, contractRequiresStagedReveal) {
  const pieces = Object.entries(histogram)
    .flatMap(([shape, count]) =>
      Array.from({ length: count }, (_, ordinal) => ({
        shape,
        area: SHAPE_AREA[shape],
        ordinal,
      })),
    )
    .sort(
      (left, right) =>
        right.area - left.area ||
        SHAPE_ORDER.indexOf(left.shape) - SHAPE_ORDER.indexOf(right.shape) ||
        left.ordinal - right.ordinal,
    );
  const totalArea = histogramArea(histogram);
  if (!contractRequiresStagedReveal) {
    assert(
      totalArea <= playableCells,
      `A non-staged level cannot expose ${totalArea} occupied cells on ${playableCells} playable cells.`,
    );
    return {
      batches: [
        {
          stage_index: 1,
          role: "opening_all_visible",
          block_count: pieces.length,
          occupied_cell_count: totalArea,
          occupied_cell_cap: playableCells,
          occupied_ratio_to_playable: round(totalArea / playableCells),
          free_playable_cells: playableCells - totalArea,
          required_control_cells: 0,
          shape_histogram: orderedHistogram(histogram),
        },
      ],
    };
  }

  // A staged level reserves one shared control cell in every batch before the
  // final reveal. The final batch may use the complete board. Capacity is
  // therefore N * playableCells - (N - 1), and N is at least two by contract.
  let batchCount = Math.max(2, Math.ceil((totalArea - 1) / (playableCells - 1)));

  for (; batchCount <= pieces.length; batchCount += 1) {
    const batches = Array.from({ length: batchCount }, (_, index) => ({
      pieces: [],
      occupied: 0,
      occupiedCap: index === batchCount - 1 ? playableCells : playableCells - 1,
    }));
    let failed = false;
    for (const piece of pieces) {
      const candidates = batches
        .map((batch, index) => ({ batch, index }))
        .filter(
          ({ batch }) =>
            batch.occupied + piece.area <= batch.occupiedCap,
        )
        .sort(({ batch: left, index: leftIndex }, { batch: right, index: rightIndex }) => {
          const leftScore = Math.max(
            (left.occupied + piece.area) / left.occupiedCap,
            (left.pieces.length + 1) / pieces.length,
          );
          const rightScore = Math.max(
            (right.occupied + piece.area) / right.occupiedCap,
            (right.pieces.length + 1) / pieces.length,
          );
          return leftScore - rightScore || left.occupied - right.occupied || leftIndex - rightIndex;
        });
      if (candidates.length === 0) {
        failed = true;
        break;
      }
      candidates[0].batch.pieces.push(piece);
      candidates[0].batch.occupied += piece.area;
    }
    if (failed) continue;

    // Keep the final full-board-capacity batch in the final slot; sort only the
    // earlier control-cell batches from tightest to loosest.
    const finalBatch = batches.pop();
    batches.sort(
      (left, right) =>
        right.occupied - left.occupied || right.pieces.length - left.pieces.length,
    );
    batches.push(finalBatch);
    return {
      batches: batches.map((batch, index) => {
        const shapeHistogram = {};
        for (const piece of batch.pieces) {
          shapeHistogram[piece.shape] = (shapeHistogram[piece.shape] ?? 0) + 1;
        }
        return {
          stage_index: index + 1,
          role:
            index === 0
              ? "opening"
              : index === batches.length - 1
                ? "final_reveal"
                : "intermediate_reveal",
          block_count: batch.pieces.length,
          occupied_cell_count: batch.occupied,
          occupied_cell_cap: batch.occupiedCap,
          occupied_ratio_to_playable: round(batch.occupied / playableCells),
          free_playable_cells: playableCells - batch.occupied,
          required_control_cells: index === batches.length - 1 ? 0 : 1,
          shape_histogram: orderedHistogram(shapeHistogram),
        };
      }),
    };
  }
  throw new Error("Unable to stage the projected histogram under the planning caps.");
}

assert(Array.isArray(source.levels) && source.levels.length === 100, "Expected a 100-level v4 contract.");

const sourceLevelById = new Map(source.levels.map((level) => [level.level_id, level]));

const levels = v5Contract.levels
  .filter((level) => levelNumber(level) >= 21)
  .map((level) => {
    const number = levelNumber(level);
    const target = level.our_design_target;
    const originalTarget = sourceLevelById.get(level.level_id)?.our_design_target;
    assert(originalTarget, `${level.level_id} is missing from the v4 contract.`);
    const board = target.board;
    const originalHistogram = originalTarget.full_level_shape_histogram;
    const originalBlockCount = originalTarget.full_level_block_count;
    assert(histogramCount(originalHistogram) === originalBlockCount, `${level.level_id} v4 histogram/count mismatch.`);
    assert(maskPlayableCells(board.playable_mask) === board.playable_cell_count, `${level.level_id} mask/playable mismatch.`);

    const schedule = scheduleForLevel(number);
    const finalBlockCount = Math.max(originalBlockCount, schedule.minimum_block_count);
    const plannedHistogram = projectHistogram(originalHistogram, finalBlockCount);
    const plannedOccupied = histogramArea(plannedHistogram);
    const staging = packStages(
      plannedHistogram,
      board.playable_cell_count,
      target.requires_staged_reveal,
    );
    const originalRatios = Object.fromEntries(
      Object.entries(originalHistogram).map(([shape, count]) => [shape, round(count / originalBlockCount)]),
    );
    const plannedRatios = Object.fromEntries(
      Object.entries(plannedHistogram).map(([shape, count]) => [shape, round(count / finalBlockCount)]),
    );

    return {
      level_id: level.level_id,
      level_number: number,
      board_lock: {
        rows: board.rows,
        cols: board.cols,
        playable_cell_count: board.playable_cell_count,
        playable_mask: board.playable_mask,
      },
      color_lock: {
        full_level_color_count: target.full_level_color_count,
        design_palette: target.design_palette,
      },
      v4_composition: {
        block_count: originalBlockCount,
        shape_histogram: originalHistogram,
        shape_ratios: originalRatios,
        occupied_cell_count: originalTarget.full_level_occupied_cell_count,
        occupied_ratio_to_playable: round(originalTarget.full_level_occupied_cell_count / board.playable_cell_count),
        requires_staged_reveal: originalTarget.requires_staged_reveal,
      },
      v5_count_schedule: {
        ...schedule,
        no_decrease_floor_from_v4: originalBlockCount,
        final_block_count: finalBlockCount,
        added_blocks: finalBlockCount - originalBlockCount,
        used_legacy_v4_override: originalBlockCount > schedule.minimum_block_count,
      },
      v5_composition_plan: {
        block_count: finalBlockCount,
        shape_histogram: plannedHistogram,
        shape_ratios: plannedRatios,
        occupied_cell_count: plannedOccupied,
        occupied_ratio_to_playable: round(plannedOccupied / board.playable_cell_count),
      },
      staging_plan: {
        contract_requires_staged_reveal: target.requires_staged_reveal,
        required_stage_batch_count: staging.batches.length,
        hidden_reveal_batch_count: staging.batches.length - 1,
        requires_staged_reveal: target.requires_staged_reveal,
        implementation_mode:
          !target.requires_staged_reveal
            ? "all_visible_at_opening"
            : "internal_staging",
        cap_policy: {
          non_staged: "one batch with occupied cells <= playable cells",
          staged_non_final: "occupied cells <= playable cells - 1",
          staged_final: "occupied cells <= playable cells",
          shared_control_cell_reserve_before_final: 1,
          block_count_cap: null,
        },
        batches: staging.batches,
      },
      difficulty_wave_lock: {
        calibrated_score: target.target_d1_difficulty?.calibrated_score ?? null,
        band: target.target_d1_difficulty?.band ?? null,
        curve_role: target.target_d1_difficulty?.curve_role ?? null,
        expected_peak_level: schedule.is_five_level_peak,
      },
    };
  });

assert(levels.length === 80, `Expected 80 planned levels, received ${levels.length}.`);

for (const level of levels) {
  const contractTarget = v5Contract.levels[level.level_number - 1]?.our_design_target;
  assert(contractTarget, `${level.level_id} is missing from the v5 density contract.`);
  assert(
    contractTarget.full_level_block_count === level.v5_composition_plan.block_count,
    `${level.level_id} independent block-count projection differs from v5.`,
  );
  assert(
    JSON.stringify(contractTarget.full_level_shape_histogram) ===
      JSON.stringify(level.v5_composition_plan.shape_histogram),
    `${level.level_id} independent shape projection differs from v5.`,
  );
  assert(
    contractTarget.full_level_occupied_cell_count ===
      level.v5_composition_plan.occupied_cell_count,
    `${level.level_id} independent occupied-cell projection differs from v5.`,
  );
}

const waveGroups = [];
for (let start = 0; start < levels.length; start += 5) {
  const group = levels.slice(start, start + 5);
  const last = group.at(-1);
  const finalCountMax = Math.max(...group.map((level) => level.v5_composition_plan.block_count));
  const difficultyScores = group.map((level) => level.difficulty_wave_lock.calibrated_score);
  const hasDifficultyScores = difficultyScores.every(Number.isFinite);
  waveGroups.push({
    levels: `${group[0].level_id}-${last.level_id}`,
    formula_peak_level: last.level_id,
    formula_minimums: group.map((level) => level.v5_count_schedule.minimum_block_count),
    final_block_counts: group.map((level) => level.v5_composition_plan.block_count),
    final_block_count_peak_preserved: last.v5_composition_plan.block_count === finalCountMax,
    final_block_count_peak_levels: group
      .filter((level) => level.v5_composition_plan.block_count === finalCountMax)
      .map((level) => level.level_id),
    difficulty_scores: difficultyScores,
    difficulty_peak_preserved:
      hasDifficultyScores && last.difficulty_wave_lock.calibrated_score === Math.max(...difficultyScores),
  });
}

const batchDistribution = {};
for (const level of levels) {
  const count = level.staging_plan.required_stage_batch_count;
  batchDistribution[count] = (batchDistribution[count] ?? 0) + 1;
}
const total = (getter) => levels.reduce((sum, level) => sum + getter(level), 0);
const densityValues = levels.map((level) => level.v5_composition_plan.occupied_ratio_to_playable);
const legacyOverrides = levels
  .filter((level) => level.v5_count_schedule.used_legacy_v4_override)
  .map((level) => ({
    level_id: level.level_id,
    formula_minimum: level.v5_count_schedule.minimum_block_count,
    retained_v4_count: level.v5_composition_plan.block_count,
  }));
const waveAdvisories = waveGroups.filter((group) => !group.final_block_count_peak_preserved);

const artifact = {
  schema_version: "blockout-v5-density-staging-plan-1",
  generated_on: "2026-09-11",
  status: "planning_only_not_applied_to_formal_levels",
  source_contract: {
    path: SOURCE_RELATIVE,
    sha256: sourceSha256,
    title: source.title,
  },
  validated_v5_contract: {
    path: V5_CONTRACT_RELATIVE,
    sha256: v5ContractSha256,
    match: "Lv21-Lv100 block count, shape histogram, and occupied cells match exactly",
  },
  scope: { first_level: 21, last_level: 100, level_count: levels.length },
  rules: {
    block_count: {
      segment_baselines: {
        "Lv021-Lv040": 24,
        "Lv041-Lv060": 28,
        "Lv061-Lv080": 32,
        "Lv081-Lv100": 36,
      },
      index_definition: "Within each 20-level segment, index is zero-based from 0 through 19.",
      group_definition: "group=floor(index/5)",
      position_definition: "position=index%5",
      wave_offsets: WAVE_OFFSETS,
      minimum_formula: "segmentBaseline + group + waveOffsets[position]",
      final_formula: "max(v4 full_level_block_count, minimum)",
    },
    shape_projection: {
      shape_set: "Identical to v4 for each level.",
      method: "Keep all v4 counts, then distribute added blocks by v4 proportions using deterministic largest remainders.",
      occupied_cells: "Recomputed from the projected histogram and canonical shape areas.",
      canonical_shape_areas: SHAPE_AREA,
    },
    stage_batch_policy: {
      non_staged_levels: "requires_staged_reveal=false must remain one all-visible opening batch; occupied cells may reach 100% of playable cells.",
      staged_non_final_batches: "occupied cells <= playable cells - 1, reserving one shared control cell",
      staged_final_batch: "occupied cells <= playable cells",
      required_batches: "Smallest batch count satisfying N*playableCells-(N-1) total capacity, with a minimum of two batches when requires_staged_reveal=true.",
      balancing: "Largest shapes first, assigned to the least-loaded eligible batch; non-final batches are ordered tightest first.",
      mechanism_route: "Lv21-Lv34 use internal staging; Lv35+ may use generator or internal staging.",
      implementation_note: "This is a feasibility allocation, not a solved level. Formal candidates still require PuzzleModel witness replay and strict bounded proof.",
    },
    wave_validation: {
      difficulty_rule: "The fifth level in every five-level group must have the maximum calibrated D1 score.",
      count_rule: "The minimum schedule peaks at the fifth position. Exact final=max(v4,minimum) can retain a larger legacy v4 count earlier in a group; those cases are advisories, not formula failures.",
    },
  },
  summary: {
    original_total_blocks: total((level) => level.v4_composition.block_count),
    planned_total_blocks: total((level) => level.v5_composition_plan.block_count),
    added_total_blocks: total((level) => level.v5_count_schedule.added_blocks),
    original_total_occupied_cells: total((level) => level.v4_composition.occupied_cell_count),
    planned_total_occupied_cells: total((level) => level.v5_composition_plan.occupied_cell_count),
    planned_density_min: round(Math.min(...densityValues)),
    planned_density_average: round(densityValues.reduce((sum, value) => sum + value, 0) / densityValues.length),
    planned_density_max: round(Math.max(...densityValues)),
    stage_batch_count_distribution: batchDistribution,
    maximum_required_stage_batches: Math.max(
      ...levels.map((level) => level.staging_plan.required_stage_batch_count),
    ),
    legacy_v4_count_overrides: legacyOverrides,
    final_count_wave_advisories: waveAdvisories,
    difficulty_wave_failures: waveGroups.filter((group) => !group.difficulty_peak_preserved),
  },
  wave_groups: waveGroups,
  levels,
};

function formatHistogram(histogram) {
  return Object.entries(histogram)
    .map(([shape, count]) => `${shape}×${count}`)
    .join(" ");
}

const markdown = [
  "# Block Out Lv21–100 v5 密度与分仓规划",
  "",
  "> 仅为可行性规划，未写入正式关卡。棋盘 rows/cols/mask、颜色数量与 palette 均锁定为 v4。",
  `> 已与 v5 密度契约逐关精确核对：\`${v5ContractSha256}\`。`,
  "",
  "## 核心规则",
  "",
  "- 数量最低线：20关段基数依次为 24 / 28 / 32 / 36；段内 `group=floor(index/5)`，`position=index%5`，偏移 `[0,1,2,2,3]`。",
  "- 最终块数：`max(v4原块数, 数量最低线)`，绝不减少旧关卡块数。",
  "- 形状：保留每关 v4 形状集合和全部原数量；新增块按 v4 比例用最大余数法分配。",
  "- `requires_staged_reveal=false`：严格保持 1 批、全部开局可见；允许占格达到 100%，由首个可清除块释放空间。",
  "- `requires_staged_reveal=true`：前 N−1 批各占格不超过 `playable−1`，保留 1 个共享 control 格；末批最多占满 `playable`。",
  "- staged 批数取满足 `N×playable−(N−1)` 容量的最小值，并按大形状优先、低负载优先分配以尽量均衡且保持高密度；不再施加 78% 或块数上限。",
  "- 五关波峰：D1 难度分的第5关必须为组内最高。块数最低线也在第5关最高，但 v4 不减规则可能保留更早的历史异常高块数，单列为提醒。",
  "",
  "## 汇总",
  "",
  `- 原总块数：${artifact.summary.original_total_blocks}`,
  `- 规划总块数：${artifact.summary.planned_total_blocks}（新增 ${artifact.summary.added_total_blocks}）`,
  `- 原总占格：${artifact.summary.original_total_occupied_cells}`,
  `- 规划总占格：${artifact.summary.planned_total_occupied_cells}`,
  `- 全量占格/可玩格密度：${(artifact.summary.planned_density_min * 100).toFixed(1)}%–${(artifact.summary.planned_density_max * 100).toFixed(1)}%，平均 ${(artifact.summary.planned_density_average * 100).toFixed(1)}%`,
  `- 分仓批数分布：${Object.entries(batchDistribution).map(([batches, count]) => `${batches}批=${count}关`).join("；")}`,
  `- 最大分仓批数：${artifact.summary.maximum_required_stage_batches}`,
  `- v4数量兜底关：${legacyOverrides.map((item) => `${item.level_id}(${item.formula_minimum}→${item.retained_v4_count})`).join("、") || "无"}`,
  `- 最终块数非第5关最高的组：${waveAdvisories.map((item) => item.levels).join("、") || "无"}（不影响D1难度波峰校验）`,
  "",
  "## 每关规划",
  "",
  "| 关卡 | 棋盘 | 可玩格 | v4块 | v5块 | 新增 | 规划占格 | 总密度 | 分仓 | 单批块/占格/密度 | 颜色 | 形状规划 | D1 |",
  "|---:|:---:|---:|---:|---:|---:|---:|---:|---:|:---|---:|:---|---:|",
  ...levels.map((level) => {
    const batches = level.staging_plan.batches
      .map((batch) => `${batch.block_count}/${batch.occupied_cell_count}/${(batch.occupied_ratio_to_playable * 100).toFixed(0)}%`)
      .join("；");
    return `| ${level.level_id} | ${level.board_lock.rows}×${level.board_lock.cols} | ${level.board_lock.playable_cell_count} | ${level.v4_composition.block_count} | ${level.v5_composition_plan.block_count} | +${level.v5_count_schedule.added_blocks} | ${level.v5_composition_plan.occupied_cell_count} | ${(level.v5_composition_plan.occupied_ratio_to_playable * 100).toFixed(1)}% | ${level.staging_plan.required_stage_batch_count} | ${batches} | ${level.color_lock.full_level_color_count} | ${formatHistogram(level.v5_composition_plan.shape_histogram)} | ${level.difficulty_wave_lock.calibrated_score ?? "null"} |`;
  }),
  "",
  "## 五关波峰核对",
  "",
  "| 关卡组 | 最低线 | 最终块数 | 块数第5关仍最高 | D1分 | D1第5关最高 |",
  "|:---|:---|:---|:---:|:---|:---:|",
  ...waveGroups.map(
    (group) =>
      `| ${group.levels} | ${group.formula_minimums.join("/")} | ${group.final_block_counts.join("/")} | ${group.final_block_count_peak_preserved ? "是" : `否（${group.final_block_count_peak_levels.join("、")}）`} | ${group.difficulty_scores.join("/")} | ${group.difficulty_peak_preserved ? "是" : "否"} |`,
  ),
  "",
  "## 接纳边界",
  "",
  "本规划只证明构成可以按静态容量切分。任何正式关卡仍必须保持锁定字段、完成 PuzzleModel witness 回放，并取得严格 bounded-DFS 证书；未通过不得接纳。",
  "",
].join("\n");

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.writeFileSync(OUTPUT_JSON, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
fs.writeFileSync(OUTPUT_MD, markdown, "utf8");

console.log(
  JSON.stringify(
    {
      output_json: path.relative(ROOT, OUTPUT_JSON).replaceAll("\\", "/"),
      output_md: path.relative(ROOT, OUTPUT_MD).replaceAll("\\", "/"),
      levels: levels.length,
      planned_total_blocks: artifact.summary.planned_total_blocks,
      added_total_blocks: artifact.summary.added_total_blocks,
      stage_batch_count_distribution: batchDistribution,
      wave_advisories: waveAdvisories.map((group) => group.levels),
    },
    null,
    2,
  ),
);
