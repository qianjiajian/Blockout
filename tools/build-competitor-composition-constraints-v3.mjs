import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SOURCE_RECORDS = path.join(
  ROOT,
  "deliverables/competitor-level-relations/blockout-lv001-lv100-level-records.json",
);
const SHAPE_AUDIT = path.join(
  ROOT,
  "deliverables/competitor-level-relations/blockout-lv001-lv100-visible-shape-audit.json",
);
const OUTPUT_DIR = path.join(ROOT, "deliverables/level-generation-blueprint");
const OUTPUT_JSON = path.join(
  OUTPUT_DIR,
  "blockout-lv001-lv100-exact-reference-constraints-v3.json",
);
const OUTPUT_CSV = path.join(
  OUTPUT_DIR,
  "blockout-lv001-lv100-exact-reference-constraints-v3.csv",
);
const OUTPUT_MD = path.join(
  OUTPUT_DIR,
  "blockout-lv001-lv100-exact-reference-constraints-v3.md",
);

const VIDEO_TOTAL_BLOCK_COUNT_L1_20 = [
  3, 8, 9, 18, 20, 21, 16, 25, 10, 25,
  22, 12, 16, 18, 10, 20, 26, 16, 27, 14,
];

const VIDEO_FULL_LEVEL_COLOR_COUNT_L1_20 = [
  3, 5, 5, 8, 3, 4, 3, 4, 5, 6,
  5, 4, 6, 4, 5, 5, 5, 5, 6, 5,
];

const PROJECT_COLORS = ["红色", "蓝色", "绿色", "黄色", "紫色", "橙色", "粉色", "青色"];

const SHAPE_CELL_AREA = {
  SINGLE: 1,
  H2: 2,
  V2: 2,
  H3: 3,
  V3: 3,
  SQ2: 4,
  SQ3: 9,
  L3: 3,
  T4: 4,
  L4: 4,
  CROSS5: 5,
};

const ORIGINAL_BOARD_FAMILIES = [
  "左上缺角",
  "右上缺角",
  "左下缺角",
  "右下缺角",
  "左高右低阶梯",
  "右高左低阶梯",
  "上宽下窄收腰",
  "下宽上窄收腰",
  "左右交错凹口",
  "上下交错凹口",
];

const BOARD_RECHECK = {
  20: { rows: 8, cols: 5, playable_cell_count: 32, confidence: "high", note: "顶部盖板5×3、中央颈部1×2、底舱5×3。" },
  34: { rows: 9, cols: 7, playable_cell_count: 63, confidence: "high", note: "完整7×9矩形；盖板与可见区均按同一网格闭合。" },
  37: { rows: 8, cols: 7, playable_cell_count: "unclear", confidence: "medium", note: "生成器与盖板共同遮挡，不能确认顶部中央是否全为可玩格。" },
  38: { rows: 7, cols: 6, playable_cell_count: 42, confidence: "high", note: "完整6×7矩形。" },
  39: { rows: "unclear", cols: 8, playable_cell_count: 64, confidence: "mixed", note: "上下各为8×4完整岛，共64格；两岛间距不能换算为全局行数。" },
  40: { rows: 6, cols: 6, playable_cell_count: 36, confidence: "high", note: "完整6×6矩形。" },
  41: { rows: 10, cols: 7, playable_cell_count: 70, confidence: "high", note: "连续7×10矩形外框。" },
  44: { rows: 9, cols: 7, playable_cell_count: "unclear", confidence: "medium", note: "多个盖板交错遮住逐格边界。" },
  46: { rows: 10, cols: 7, playable_cell_count: 55, confidence: "high", note: "上部左右双塔各2×5，下部底座7×5。" },
  48: { rows: "unclear", cols: 7, playable_cell_count: 56, confidence: "mixed", note: "上下各为7×4完整岛，共56格；两岛间距不能换算为全局行数。" },
  49: { rows: 10, cols: 7, playable_cell_count: 70, confidence: "high", note: "完整7×10矩形。" },
  54: { rows: 10, cols: 7, playable_cell_count: 70, confidence: "high", note: "盖板与中央可见区共同铺满7×10外框。" },
  55: { rows: 8, cols: 7, playable_cell_count: 56, confidence: "high", note: "完整7×8矩形。" },
  57: { rows: 9, cols: 7, playable_cell_count: 63, confidence: "high", note: "完整7×9矩形。" },
  58: { rows: 10, cols: 7, playable_cell_count: 46, confidence: "high", note: "二次逐图网格复核，高置信总格数。" },
  59: { rows: 11, cols: 7, playable_cell_count: 65, confidence: "high", note: "二次逐图网格复核，高置信总格数。" },
  61: { rows: 9, cols: 6, playable_cell_count: 45, confidence: "high", note: "二次逐图网格复核，高置信总格数。" },
  62: { rows: 8, cols: 6, playable_cell_count: 48, confidence: "high", note: "二次逐图网格复核，高置信总格数。" },
  64: { rows: 10, cols: 7, playable_cell_count: 70, confidence: "high", note: "二次逐图网格复核，高置信总格数。" },
  67: { rows: 10, cols: 7, playable_cell_count: 62, confidence: "high", note: "二次逐图网格复核，高置信总格数。" },
  72: { rows: "unclear", cols: "unclear", playable_cell_count: "unclear", confidence: "low", note: "错层区域与盖板阻断统一网格配准。" },
  75: { rows: "unclear", cols: "unclear", playable_cell_count: "unclear", confidence: "low", note: "两座异形岛边界被色块和外壳遮住。" },
  77: { rows: 10, cols: 7, playable_cell_count: "unclear", confidence: "medium", note: "顶部生成器错台和底部双脚无法可靠逐格判定。" },
  82: { rows: 9, cols: 7, playable_cell_count: "unclear", confidence: "low", note: "多次内收外扩边界被色块与机制遮挡。" },
};

const USER_AUTHORIZED_BOARD_SIZE_FILLS = {
  37: {
    target_playable_cell_count: 49,
    proposed_outer_rows_cols: { rows: 8, cols: 7 },
    difficulty_v2: 47.04,
    neighbor_difficulty_v2: { previous: 30.61, next: 67.05 },
    rationale: "在Lv36的54格与Lv38的42格之间按难度反向插值，兼顾生成器与遮挡阶段的腾挪空间。",
  },
  44: {
    target_playable_cell_count: 49,
    proposed_outer_rows_cols: { rows: 9, cols: 7 },
    difficulty_v2: 68.4,
    neighbor_difficulty_v2: { previous: 45.2, next: 40.44 },
    rationale: "作为局部Hard峰收紧至49格，同时为数字冰块、生成器和遮挡阶段保留可解空间。",
  },
  72: {
    target_playable_cell_count: 53,
    proposed_outer_rows_cols: { rows: 8, cols: 7 },
    difficulty_v2: 78.47,
    neighbor_difficulty_v2: { previous: 66.13, next: 83.91 },
    rationale: "从Lv71的56格收紧到53格，再向Lv73的50格过渡，形成连续上升。",
  },
  75: {
    target_playable_cell_count: 48,
    proposed_outer_rows_cols: { rows: 8, cols: 7 },
    difficulty_v2: 81.89,
    neighbor_difficulty_v2: { previous: 74.46, next: 59.3 },
    rationale: "41格可见色块占48格约85%，形成局部峰值；Lv76扩至59格作为缓冲。",
  },
  77: {
    target_playable_cell_count: 56,
    proposed_outer_rows_cols: { rows: 10, cols: 7 },
    difficulty_v2: 69.52,
    neighbor_difficulty_v2: { previous: 59.3, next: 55.14 },
    rationale: "23块已知负载与多机制形成局部峰；56格控制拥挤度，Lv78扩至63格释放。",
  },
  82: {
    target_playable_cell_count: 48,
    proposed_outer_rows_cols: { rows: 9, cols: 7 },
    difficulty_v2: 84.19,
    neighbor_difficulty_v2: { previous: 34.99, next: 78.89 },
    rationale: "18个色块按本次开局形状设计占36格，并叠加高颜色数与多机制负载；48格保留必要腾挪空间。",
  },
};

const USER_AUTHORIZED_OUTER_ADJUSTMENTS = {
  3: {
    proposed_outer_rows_cols: { rows: 7, cols: 6 },
    mask_direction: "三条2列宽带上下错位，裁6格",
    packing_note: "SQ2×9可按2列宽带精确铺满；实际mask仍需生成后验证。",
  },
  4: {
    proposed_outer_rows_cols: { rows: 7, cols: 5 },
    mask_direction: "边缘错位缺角，裁5格",
    packing_note: "保留至少6条连续三格横向空间，容纳H3×6；SINGLE吸收不规则区。",
  },
  5: {
    proposed_outer_rows_cols: { rows: 7, cols: 4 },
    mask_direction: "上下反向缺口，裁4格",
    packing_note: "中央保留纵向通道容纳V3×2；SINGLE吸收不规则区。",
  },
  6: {
    proposed_outer_rows_cols: { rows: 6, cols: 5 },
    mask_direction: "上下错位缺角，裁5格",
    packing_note: "主体保留连续横向空间容纳H2×4；SINGLE吸收不规则区。",
  },
  7: {
    proposed_outer_rows_cols: { rows: 9, cols: 5 },
    mask_direction: "4列主体与1列纵向错位，裁5格",
    packing_note: "SQ2×4与V2×12可按偶数宽带精确铺满；实际mask仍需生成后验证。",
  },
  10: {
    proposed_outer_rows_cols: { rows: 9, cols: 6 },
    mask_direction: "上左与下右双向错位，裁6格",
    packing_note: "V3、SQ2放在连续区域，SINGLE×16吸收边缘不规则区。",
  },
  52: {
    proposed_outer_rows_cols: { rows: 9, cols: 6 },
    mask_direction: "右上裁去2×3区域，裁6格",
    packing_note: "完整构成已通过候选mask exact-cover铺装复核。",
  },
  60: {
    proposed_outer_rows_cols: { rows: 8, cols: 5 },
    mask_direction: "顶行左裁2格、底行右裁3格",
    packing_note: "全为SINGLE，精确铺满不存在形状约束风险。",
  },
  63: {
    proposed_outer_rows_cols: { rows: 8, cols: 7 },
    mask_direction: "左下裁去2×4区域，裁8格",
    packing_note: "完整构成已通过候选mask exact-cover铺装复核。",
  },
  100: {
    proposed_outer_rows_cols: { rows: 8, cols: 7 },
    mask_direction: "以2格成对形成上下交错裁口，裁8格",
    packing_note: "SQ2×12已验证可精确铺满；实际mask不得改成任意单格锯齿。",
  },
};

const USER_AUTHORIZED_OPENING_SHAPE_DESIGNS = {
  20: {
    histogram: { H2: 2, V2: 1, H3: 1, V3: 1, L3: 1, T4: 1 },
    difficulty_v2: { previous: 59.93, current: 68.78, next: 27.37 },
    rationale: "局部峰值采用多方向与转折形状；块数少但形状判断密度高，随后Lv21明显降压。",
  },
  21: {
    histogram: { SINGLE: 5, H2: 5, V2: 4 },
    difficulty_v2: { previous: 68.78, current: 27.37, next: 37.36 },
    rationale: "难度骤降，仅保留单格与双格作为恢复关。",
  },
  22: {
    histogram: { SINGLE: 4, H2: 3, V2: 3, H3: 2, V3: 1 },
    difficulty_v2: { previous: 27.37, current: 37.36, next: 36.75 },
    rationale: "在Lv21基础上加入三格长条，适度增加方向判断。",
  },
  23: {
    histogram: { SINGLE: 5, H2: 3, V2: 2, SQ2: 1, L3: 2 },
    difficulty_v2: { previous: 37.36, current: 36.75, next: 50.2 },
    rationale: "保持中等密度，用SQ2与L3呼应本关的复合外壳关系。",
  },
  24: {
    histogram: { SINGLE: 2, H2: 3, V2: 2, H3: 2, V3: 1, L3: 1, T4: 1 },
    difficulty_v2: { previous: 36.75, current: 50.2, next: 60.35 },
    rationale: "小棋盘提高占地密度并加入转折形状，向Lv25高密度关过渡。",
  },
  26: {
    histogram: { SINGLE: 8, H2: 4, V2: 4, H3: 2, V3: 1, L3: 1 },
    difficulty_v2: { previous: 60.35, current: 40.78, next: 42.43 },
    rationale: "从Lv25满占地回落，保留较高块数但释放足够腾挪空间。",
  },
  27: {
    histogram: { SINGLE: 1, H2: 2, V2: 1, H3: 2, V3: 1, SQ2: 1, L3: 1 },
    difficulty_v2: { previous: 40.78, current: 42.43, next: 35.7 },
    rationale: "颜色仅两种，改用方向差异和较大形状承担空间规划。",
  },
  28: {
    histogram: { H2: 2, H3: 2, V3: 2 },
    difficulty_v2: { previous: 42.43, current: 35.7, next: 47.52 },
    rationale: "大棋盘低密度，仅使用直条形，形成局部缓冲。",
  },
  29: {
    histogram: { SINGLE: 8, H2: 4, V2: 3, H3: 2, V3: 1, L3: 2, T4: 1 },
    difficulty_v2: { previous: 35.7, current: 47.52, next: 44.89 },
    rationale: "21块叠加多方向和L/T形，形成局部形状复杂度峰值。",
  },
  30: {
    histogram: { SINGLE: 8, H2: 3, V2: 2, L3: 1, T4: 1 },
    difficulty_v2: { previous: 47.52, current: 44.89, next: 36.94 },
    rationale: "小盘保持中高密度，以单/双格为主并少量保留转折形状。",
  },
  34: {
    histogram: { SINGLE: 11, H2: 2, V2: 3, L3: 1 },
    difficulty_v2: { previous: 38.09, current: 53.17, next: 34.87 },
    rationale: "采用逐轮廓复核的17块；延续Lv33单格主导，并增加少量方向和L形变化。",
  },
  37: {
    histogram: { H2: 2, V2: 5, H3: 2, L3: 1 },
    difficulty_v2: { previous: 30.61, current: 47.04, next: 67.05 },
    rationale: "以直条为主控制六色与多机制的叠加负担，并为Lv38升压。",
  },
  38: {
    histogram: { SINGLE: 1, H2: 2, V2: 2, H3: 1, L3: 1, SQ2: 1 },
    difficulty_v2: { previous: 47.04, current: 67.05, next: 74.8 },
    rationale: "块数较少但形状类型增至六种，提升辨识和路径选择。",
  },
  39: {
    histogram: { SINGLE: 1, H2: 2, V2: 2, H3: 1, V3: 1, L3: 2, T4: 1 },
    difficulty_v2: { previous: 67.05, current: 74.8, next: 50.01 },
    rationale: "局部高峰采用七种形状并加入T4，与高机制负载共同形成规划压力。",
  },
  40: {
    histogram: { SINGLE: 3, H2: 3, V2: 3, H3: 1, L3: 1 },
    difficulty_v2: { previous: 74.8, current: 50.01, next: 50.66 },
    rationale: "从Lv39回落至五种常规形状，小盘仍保留适度腾挪压力。",
  },
  56: {
    histogram: { SINGLE: 1, H2: 2, V2: 4, V3: 2, SQ2: 3, L3: 4 },
    difficulty_v2: { previous: 77.24, current: 77.56, next: 69.06 },
    rationale: "采用逐轮廓复核的16块，以纵向和异形高密度承接Lv55–56峰值。",
  },
  72: {
    histogram: { SINGLE: 1, H2: 1, V2: 2, SQ2: 4, SQ3: 1, L3: 1, T4: 1, L4: 1 },
    difficulty_v2: { previous: 66.13, current: 78.47, next: 83.91 },
    rationale: "冻结已辨识的12块高密度构成，八种形状连接Lv71与Lv73的连续升压。",
  },
  82: {
    histogram: { SINGLE: 6, H2: 4, V2: 5, SQ2: 1, L4: 2 },
    difficulty_v2: { previous: 34.99, current: 84.19, next: 78.89 },
    rationale: "将两块臂长不清的L形明确设计为L4；与Lv81纯H2、Lv83纯SQ2显著异构。",
  },
  84: {
    histogram: { SINGLE: 5, H2: 2, V2: 2, H3: 1, SQ2: 1, L4: 1 },
    difficulty_v2: { previous: 78.89, current: 80.44, next: 55.88 },
    rationale: "把三块边界不清的相邻块设计为H3、SQ2、L4各一块，主要难度继续由机制承担。",
  },
  95: {
    histogram: { SINGLE: 14, V2: 1, H3: 2 },
    difficulty_v2: { previous: 83.59, current: 64.41, next: 77.3 },
    rationale: "采用逐轮廓复核的17块；大量SINGLE使形状复杂度低于Lv94和Lv96。",
  },
};

const isNumber = (value) => typeof value === "number" && Number.isFinite(value);

const combinations = (items, count, start = 0, prefix = [], result = []) => {
  if (prefix.length === count) {
    result.push([...prefix]);
    return result;
  }
  for (let index = start; index <= items.length - (count - prefix.length); index += 1) {
    prefix.push(items[index]);
    combinations(items, count, index + 1, prefix, result);
    prefix.pop();
  }
  return result;
};

const chooseProjectPalette = (levelNumber, count, competitorVisibleColors) => {
  if (!Number.isInteger(count) || count < 1 || count > PROJECT_COLORS.length) {
    return {
      colors: "unclear",
      count_match: "blocked_by_unsupported_or_unclear_count",
      difference_mode: "unclear",
    };
  }

  const sourceSet = new Set(competitorVisibleColors);
  const sourcePaletteComplete = competitorVisibleColors.length === count;
  const candidates = combinations(PROJECT_COLORS, count);
  const scored = candidates
    .map((colors, index) => ({
      colors,
      overlap: colors.filter((color) => sourceSet.has(color)).length,
      order: (index - levelNumber + candidates.length) % candidates.length,
    }))
    .sort((left, right) => left.overlap - right.overlap || left.order - right.order);
  const selected = scored[0].colors;
  const sameSet =
    selected.length === competitorVisibleColors.length &&
    selected.every((color) => sourceSet.has(color));

  return {
    colors: selected,
    count_match: selected.length === count,
    difference_mode: !sourcePaletteComplete
      ? "same_count_selected_full_source_palette_unclear"
      : sameSet
        ? "same_supported_set_role_permutation_required"
        : "different_color_set",
  };
};

const exactTotalFromRecord = (record) => {
  const fields = [
    record.colored_blocks.opening_draggable_count,
    record.colored_blocks.locked_numbered_piece_count,
    record.colored_blocks.generator_queue_piece_count,
    record.colored_blocks.hidden_behind_cover_piece_count,
  ];
  return fields.every(isNumber) ? fields.reduce((sum, value) => sum + value, 0) : "unclear";
};

const occupiedCellCount = (histogram) => {
  if (histogram === "unclear") return "unclear";
  let total = 0;
  for (const [shapeId, count] of Object.entries(histogram)) {
    if (!isNumber(SHAPE_CELL_AREA[shapeId]) || !isNumber(count)) return "unclear";
    total += SHAPE_CELL_AREA[shapeId] * count;
  }
  return total;
};

const histogramBlockCount = (histogram) => {
  if (histogram === "unclear") return "unclear";
  const counts = Object.values(histogram);
  return counts.every(isNumber) ? counts.reduce((sum, count) => sum + count, 0) : "unclear";
};

const histogramShapeTypeCount = (histogram) =>
  histogram === "unclear" ? "unclear" : Object.keys(histogram).length;

const csvCell = (value) => {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return `"${String(text ?? "").replaceAll('"', '""')}"`;
};

const sourceRecords = JSON.parse(fs.readFileSync(SOURCE_RECORDS, "utf8"));
const shapeAudit = JSON.parse(fs.readFileSync(SHAPE_AUDIT, "utf8"));
const shapesByLevel = new Map(shapeAudit.levels.map((entry) => [entry.level, entry]));

if (sourceRecords.length !== 100 || shapeAudit.levels.length !== 100) {
  throw new Error(
    `Expected 100 source records and 100 shape audits, got ${sourceRecords.length}/${shapeAudit.levels.length}`,
  );
}

const partialVisibleShapeLevelIds = shapeAudit.levels
  .filter((entry) => !entry.visible_shape_exactness.startsWith("exact"))
  .map((entry) => entry.level)
  .sort((left, right) => left - right);
const authorizedOpeningShapeLevelIds = Object.keys(USER_AUTHORIZED_OPENING_SHAPE_DESIGNS)
  .map(Number)
  .sort((left, right) => left - right);
if (
  partialVisibleShapeLevelIds.length !== authorizedOpeningShapeLevelIds.length ||
  partialVisibleShapeLevelIds.some(
    (level, index) => level !== authorizedOpeningShapeLevelIds[index],
  )
) {
  throw new Error(
    `User-authorized opening-shape designs must exactly cover partial/unclear levels: source=${partialVisibleShapeLevelIds.join(",")}; designs=${authorizedOpeningShapeLevelIds.join(",")}`,
  );
}

const expectedOuterAdjustmentLevelIds = [3, 4, 5, 6, 7, 10, 52, 60, 63, 100];
const authorizedOuterAdjustmentLevelIds = Object.keys(USER_AUTHORIZED_OUTER_ADJUSTMENTS)
  .map(Number)
  .sort((left, right) => left - right);
if (
  expectedOuterAdjustmentLevelIds.length !== authorizedOuterAdjustmentLevelIds.length ||
  expectedOuterAdjustmentLevelIds.some(
    (level, index) => level !== authorizedOuterAdjustmentLevelIds[index],
  )
) {
  throw new Error(
    `User-authorized outer adjustments must exactly cover ${expectedOuterAdjustmentLevelIds.join(",")}; got ${authorizedOuterAdjustmentLevelIds.join(",")}`,
  );
}

const levels = sourceRecords.map((record) => {
  const level = record.level_number;
  const shape = shapesByLevel.get(level);
  if (!shape) throw new Error(`Missing shape audit for Lv${level}`);

  const videoTotal = level <= 20 ? VIDEO_TOTAL_BLOCK_COUNT_L1_20[level - 1] : undefined;
  const recordTotal = exactTotalFromRecord(record);
  const fullLevelBlockCount = videoTotal ?? recordTotal;
  const blockCountEvidence = videoTotal !== undefined
    ? "continuous_video_l1_20_manual_review"
    : isNumber(recordTotal)
      ? "screenshot_all_piece_sources_known"
      : "screenshot_lower_bound_only";

  const allBlocksVisibleInOpening =
    isNumber(record.colored_blocks.opening_draggable_count) &&
    record.colored_blocks.locked_numbered_piece_count === 0 &&
    record.colored_blocks.generator_queue_piece_count === 0 &&
    record.colored_blocks.hidden_behind_cover_piece_count === 0;
  const colorCount = level <= 20
    ? VIDEO_FULL_LEVEL_COLOR_COUNT_L1_20[level - 1]
    : record.colored_blocks.visible_color_count;
  const colorCountScope = level <= 20
    ? "full_level_video"
    : allBlocksVisibleInOpening
      ? "full_level_screenshot_all_blocks_visible"
      : "opening_visible_screenshot";
  const palette = chooseProjectPalette(level, colorCount, record.colored_blocks.visible_colors);

  const boardRecheck = BOARD_RECHECK[level];
  const rows = boardRecheck?.rows ?? record.board.rows;
  const cols = boardRecheck?.cols ?? record.board.cols;
  const referencePlayable = boardRecheck?.playable_cell_count ?? record.board.playable_cell_count;
  const boardSizeFill = USER_AUTHORIZED_BOARD_SIZE_FILLS[level];
  const outerAdjustment = USER_AUTHORIZED_OUTER_ADJUSTMENTS[level];
  const openingShapeDesign = USER_AUTHORIZED_OPENING_SHAPE_DESIGNS[level];
  const openingShapeTargetHistogram =
    openingShapeDesign?.histogram ?? shape.visible_shape_histogram;
  const openingShapeTargetBlockCount = histogramBlockCount(openingShapeTargetHistogram);
  const openingShapeTargetOccupiedCells = occupiedCellCount(openingShapeTargetHistogram);
  const openingShapeTargetTypeCount = histogramShapeTypeCount(openingShapeTargetHistogram);
  const designPlayable = isNumber(referencePlayable)
    ? referencePlayable
    : boardSizeFill?.target_playable_cell_count ?? "unclear";
  const proposedOuterRowsCols =
    outerAdjustment?.proposed_outer_rows_cols ??
    boardSizeFill?.proposed_outer_rows_cols ??
    "pending_generation";
  const proposedOuterSource = outerAdjustment
    ? "user_authorized_outer_adjustment_preserve_playable_cells"
    : boardSizeFill
      ? "user_authorized_board_size_and_outer_adjustment"
      : "pending_generation";
  const proposedOuterCapacity =
    isNumber(proposedOuterRowsCols?.rows) && isNumber(proposedOuterRowsCols?.cols)
      ? proposedOuterRowsCols.rows * proposedOuterRowsCols.cols
      : "unclear";
  const proposedMaskCutCellCount = isNumber(proposedOuterCapacity) && isNumber(designPlayable)
    ? proposedOuterCapacity - designPlayable
    : "unclear";
  const competitorOuterPlayableMaskFeasibility =
    isNumber(rows) && isNumber(cols) && isNumber(referencePlayable)
      ? referencePlayable === rows * cols
        ? "impossible_full_rectangle"
        : referencePlayable < rows * cols
          ? "requires_mask_construction_validation"
          : "invalid_playable_cells_exceed_outer_grid"
      : "unclear";
  const proposedOuterPlayableMaskFeasibility =
    isNumber(proposedOuterCapacity) && isNumber(designPlayable)
      ? designPlayable === proposedOuterCapacity
        ? "impossible_full_rectangle"
        : designPlayable < proposedOuterCapacity
          ? "requires_mask_construction_validation"
          : "invalid_playable_cells_exceed_outer_grid"
      : "unclear";
  const fullShapeOccupiedCells = occupiedCellCount(shape.full_level_shape_histogram);
  const visibleCountReferenceDelta =
    isNumber(shape.counted_visible_blocks) &&
    isNumber(record.colored_blocks.opening_visible_min_count)
      ? shape.counted_visible_blocks - record.colored_blocks.opening_visible_min_count
      : "unclear";
  const competitorOuterCompositionDifferentMaskFeasibility =
    isNumber(rows) && isNumber(cols) && isNumber(fullShapeOccupiedCells)
      ? fullShapeOccupiedCells >= rows * cols
        ? fullShapeOccupiedCells === rows * cols
          ? "impossible_full_outer_grid_is_occupied"
          : "invalid_reference_shape_area_exceeds_outer_grid"
        : "requires_mask_and_packing_validation"
      : "unclear";
  const proposedOuterBlockPackingFeasibility =
    isNumber(fullShapeOccupiedCells) && isNumber(designPlayable)
      ? fullShapeOccupiedCells > designPlayable
        ? "invalid_shape_area_exceeds_playable_cells"
        : fullShapeOccupiedCells === designPlayable
          ? "requires_exact_tiling_validation"
          : "requires_packing_validation"
      : "unclear";

  const unclearFields = [];
  if (!isNumber(rows)) unclearFields.push("competitor_reference.board_size.rows");
  if (!isNumber(cols)) unclearFields.push("competitor_reference.board_size.cols");
  if (!isNumber(referencePlayable)) unclearFields.push("competitor_reference.playable_cell_count");
  if (!isNumber(fullLevelBlockCount)) unclearFields.push("competitor_reference.full_level_block_count");
  if (!colorCountScope.startsWith("full_level")) {
    unclearFields.push("competitor_reference.full_level_color_count");
  }
  if (shape.visible_shape_histogram === "unclear") {
    unclearFields.push("competitor_reference.visible_block_shape_histogram");
  }
  if (!shape.visible_shape_exactness.startsWith("exact")) {
    unclearFields.push("competitor_reference.visible_block_shape_histogram_exactness");
  }
  if (!isNumber(shape.visible_shape_type_count)) {
    unclearFields.push("competitor_reference.visible_block_shape_type_count");
  }
  if (shape.full_level_shape_histogram === "unclear") {
    unclearFields.push("competitor_reference.full_level_block_shape_histogram");
  }

  return {
    level_id: `Lv${String(level).padStart(3, "0")}`,
    source_level: record.level_id,
    competitor_reference: {
      board_size: { rows, cols },
      playable_cell_count: referencePlayable,
      board_recheck: boardRecheck ?? null,
      opening_visible_block_count_min: record.colored_blocks.opening_visible_min_count,
      known_piece_load_lower_bound: record.colored_blocks.known_piece_load_lower_bound,
      full_level_block_count: fullLevelBlockCount,
      full_level_block_count_evidence: blockCountEvidence,
      color_count: colorCount,
      color_count_scope: colorCountScope,
      opening_visible_colors_snapshot: record.colored_blocks.visible_colors,
      block_shapes: {
        visible_shape_histogram: shape.visible_shape_histogram,
        visible_shape_type_count: shape.visible_shape_type_count,
        counted_visible_blocks: shape.counted_visible_blocks,
        visible_count_reference_delta: visibleCountReferenceDelta,
        visible_count_matches_reference_min: isNumber(visibleCountReferenceDelta)
          ? visibleCountReferenceDelta === 0
          : "unclear",
        visible_shape_exactness: shape.visible_shape_exactness,
        full_level_shape_histogram: shape.full_level_shape_histogram,
        full_level_shape_type_count: shape.full_level_shape_type_count,
        full_level_occupied_cell_count: fullShapeOccupiedCells,
        evidence: shape.evidence,
        note: shape.note,
      },
    },
    our_design_blueprint: {
      board_size_lock: {
        primary_definition: "playable_cell_count",
        target_playable_cell_count: designPlayable,
        target_source: boardSizeFill
          ? "user_authorized_neighbor_difficulty_adjustment"
          : "competitor_reference_or_high_confidence_recheck",
        competitor_outer_reference: { rows, cols },
        proposed_outer_rows_cols: proposedOuterRowsCols,
        proposed_outer_source: proposedOuterSource,
        proposed_outer_capacity: proposedOuterCapacity,
        proposed_mask_cut_cell_count: proposedMaskCutCellCount,
        preserves_target_playable_cell_count: isNumber(proposedOuterCapacity)
          ? proposedOuterCapacity >= designPlayable
          : "pending_generation",
        outer_adjustment: outerAdjustment ?? null,
        difficulty_adjustment: boardSizeFill ?? null,
        outer_size_policy: outerAdjustment
          ? "用户已授权调整我方外框；必须保持竞品可玩格总数和完整色块构成"
          : "优先保持竞品外框；若与同格数、同色块构成、异形mask冲突，须取得授权后才可调整",
      },
      board_shape_id: `OUR-BOARD-${String(level).padStart(3, "0")}`,
      board_shape_family: isNumber(designPlayable)
        ? ORIGINAL_BOARD_FAMILIES[(level - 1) % ORIGINAL_BOARD_FAMILIES.length]
        : "unclear",
      playable_mask: "pending_generation",
      board_rules: [
        "竞品playable_cell_count清晰时保持原值；原始unclear关卡仅使用用户授权的邻关难度校准值作为我方目标",
        "优先保持竞品外框rows×cols；仅授权清单中的关卡可调整我方外框，并保持可玩格总数",
        "轮廓不得与对应竞品或我方其他关卡D4同形（旋转/镜像视为同形）",
        "保持单连通且不制造封闭内孔",
        "生成实际关卡后必须通过几何、铺装与求解器验证",
      ],
      competitor_outer_same_playable_cell_count_different_shape_feasibility:
        competitorOuterPlayableMaskFeasibility,
      proposed_outer_same_playable_cell_count_different_shape_feasibility:
        proposedOuterPlayableMaskFeasibility,
      competitor_outer_same_block_composition_different_mask_feasibility:
        competitorOuterCompositionDifferentMaskFeasibility,
      proposed_outer_block_packing_feasibility: proposedOuterBlockPackingFeasibility,
      color_count: colorCount,
      colors: palette.colors,
      color_count_match: palette.count_match,
      color_change_mode: palette.difference_mode,
      opening_visible_shape_target: {
        status: openingShapeDesign
          ? "exact_user_authorized_design"
          : "exact_competitor_visible_lock",
        histogram: openingShapeTargetHistogram,
        block_count: openingShapeTargetBlockCount,
        shape_type_count: openingShapeTargetTypeCount,
        occupied_cell_count: openingShapeTargetOccupiedCells,
        occupied_cell_ratio: isNumber(openingShapeTargetOccupiedCells) && isNumber(designPlayable)
          ? Number((openingShapeTargetOccupiedCells / designPlayable).toFixed(4))
          : "unclear",
        target_source: openingShapeDesign
          ? "user_authorized_neighbor_difficulty_design"
          : "competitor_exact_visible_shape_histogram",
        competitor_evidence_status: shape.visible_shape_exactness,
        difficulty_calibration: openingShapeDesign?.difficulty_v2 ?? null,
        rationale: openingShapeDesign?.rationale ?? "竞品开局可见形状证据精确，直接锁定。",
      },
      block_shape_lock: shape.full_level_shape_histogram === "unclear"
        ? {
            status: "blocked_by_missing_full_level_evidence",
            visible_reference_only: shape.visible_shape_histogram,
          }
        : {
            status: "exact_full_level_lock",
            histogram: shape.full_level_shape_histogram,
          },
      generation_status: "blueprint_only_not_applied",
    },
    exact_match_status: {
      competitor_board_size_playable_cell_count: isNumber(referencePlayable)
        ? "ready_to_lock"
        : "source_unclear",
      our_design_board_size_target: isNumber(designPlayable)
        ? boardSizeFill
          ? "user_authorized_neighbor_difficulty_fill"
          : "competitor_reference_lock"
        : "blocked",
      competitor_opening_visible_shape_histogram: shape.visible_shape_exactness.startsWith("exact")
        ? "ready_to_lock"
        : shape.visible_shape_exactness,
      our_design_opening_visible_shape_target: openingShapeDesign
        ? "user_authorized_neighbor_difficulty_design"
        : "competitor_exact_visible_lock",
      competitor_board_outer_rows_cols: isNumber(rows) && isNumber(cols)
        ? "ready_to_lock"
        : "blocked_by_unclear_source",
      our_design_proposed_outer_rows_cols: outerAdjustment
        ? "user_authorized_preserve_playable_cells"
        : boardSizeFill
          ? "user_authorized_board_size_fill"
          : "pending_generation",
      color_count: isNumber(colorCount)
        ? colorCountScope.startsWith("full_level")
          ? "ready_to_lock_full_level"
          : "ready_to_lock_opening_visible_only"
        : "blocked_by_unclear_source",
      full_level_block_count: isNumber(fullLevelBlockCount)
        ? "ready_to_lock"
        : "blocked_by_unclear_source",
      full_level_block_shape_mix: shape.full_level_shape_histogram === "unclear"
        ? "blocked_by_missing_full_level_evidence"
        : "ready_to_lock",
    },
    unclear_fields: unclearFields,
    source_evidence: {
      screenshot: record.screenshot,
      record_unclear_fields: record.unclear_fields,
      board_confidence: record.confidence.board_shape,
      block_review_confidence: record.confidence.block_and_mechanism_review,
      board_recheck_applied: Boolean(boardRecheck),
      user_authorized_board_size_fill_applied: Boolean(boardSizeFill),
      user_authorized_outer_adjustment_applied: Boolean(outerAdjustment),
      user_authorized_opening_shape_design_applied: Boolean(openingShapeDesign),
    },
  };
});

for (const entry of levels) {
  const colors = entry.our_design_blueprint.colors;
  if (!Array.isArray(colors) || colors.length !== entry.competitor_reference.color_count) {
    throw new Error(`${entry.level_id} project palette count mismatch`);
  }
  const openingShapeTarget = entry.our_design_blueprint.opening_visible_shape_target;
  if (openingShapeTarget.histogram === "unclear") {
    throw new Error(`${entry.level_id} our opening visible shape target is unclear`);
  }
  for (const [shapeId, count] of Object.entries(openingShapeTarget.histogram)) {
    if (!Object.hasOwn(SHAPE_CELL_AREA, shapeId)) {
      throw new Error(`${entry.level_id} unsupported opening shape target: ${shapeId}`);
    }
    if (!Number.isInteger(count) || count <= 0) {
      throw new Error(`${entry.level_id} invalid opening shape count: ${shapeId}=${count}`);
    }
  }
  if (
    openingShapeTarget.block_count !==
    entry.competitor_reference.block_shapes.counted_visible_blocks
  ) {
    throw new Error(
      `${entry.level_id} opening shape target block count mismatch: ${openingShapeTarget.block_count}/${entry.competitor_reference.block_shapes.counted_visible_blocks}`,
    );
  }
  const designPlayableCells =
    entry.our_design_blueprint.board_size_lock.target_playable_cell_count;
  const boardLock = entry.our_design_blueprint.board_size_lock;
  if (entry.source_evidence.user_authorized_outer_adjustment_applied) {
    const referencePlayableCells = entry.competitor_reference.playable_cell_count;
    const referenceOuter = entry.competitor_reference.board_size;
    const proposedOuter = boardLock.proposed_outer_rows_cols;
    if (!isNumber(referencePlayableCells) || designPlayableCells !== referencePlayableCells) {
      throw new Error(
        `${entry.level_id} authorized outer adjustment must preserve competitor playable cells`,
      );
    }
    if (!isNumber(proposedOuter?.rows) || !isNumber(proposedOuter?.cols)) {
      throw new Error(`${entry.level_id} authorized outer adjustment is missing numeric dimensions`);
    }
    if (proposedOuter.rows === referenceOuter.rows && proposedOuter.cols === referenceOuter.cols) {
      throw new Error(`${entry.level_id} authorized outer adjustment did not change the outer grid`);
    }
    if (
      boardLock.proposed_outer_capacity !== proposedOuter.rows * proposedOuter.cols ||
      boardLock.proposed_mask_cut_cell_count !==
        boardLock.proposed_outer_capacity - designPlayableCells ||
      boardLock.proposed_mask_cut_cell_count < 2
    ) {
      throw new Error(`${entry.level_id} invalid proposed outer capacity/cut-cell calculation`);
    }
    if (
      boardLock.proposed_outer_source !==
        "user_authorized_outer_adjustment_preserve_playable_cells" ||
      boardLock.preserves_target_playable_cell_count !== true
    ) {
      throw new Error(`${entry.level_id} authorized outer-adjustment provenance mismatch`);
    }
    if (
      entry.our_design_blueprint
        .competitor_outer_same_block_composition_different_mask_feasibility !==
        "impossible_full_outer_grid_is_occupied" ||
      entry.our_design_blueprint
        .proposed_outer_same_playable_cell_count_different_shape_feasibility !==
        "requires_mask_construction_validation" ||
      entry.our_design_blueprint.proposed_outer_block_packing_feasibility !==
        "requires_exact_tiling_validation"
    ) {
      throw new Error(`${entry.level_id} authorized outer-adjustment feasibility mismatch`);
    }
  }
  if (
    isNumber(openingShapeTarget.occupied_cell_count) &&
    isNumber(designPlayableCells) &&
    openingShapeTarget.occupied_cell_count > designPlayableCells
  ) {
    throw new Error(
      `${entry.level_id} opening shape target area exceeds our playable cells: ${openingShapeTarget.occupied_cell_count}/${designPlayableCells}`,
    );
  }
  const fullShapes = entry.competitor_reference.block_shapes.full_level_shape_histogram;
  const fullBlocks = entry.competitor_reference.full_level_block_count;
  if (isNumber(fullBlocks) && openingShapeTarget.block_count > fullBlocks) {
    throw new Error(
      `${entry.level_id} opening shape target has more blocks than full level: ${openingShapeTarget.block_count}/${fullBlocks}`,
    );
  }
  if (fullShapes !== "unclear" && isNumber(fullBlocks)) {
    const shapeCount = Object.values(fullShapes).reduce((sum, value) => sum + value, 0);
    if (shapeCount !== fullBlocks) {
      throw new Error(`${entry.level_id} full-level shape/block count mismatch: ${shapeCount}/${fullBlocks}`);
    }
    const occupiedCells = entry.competitor_reference.block_shapes.full_level_occupied_cell_count;
    const referencePlayableCells = entry.competitor_reference.playable_cell_count;
    if (
      isNumber(occupiedCells) &&
      isNumber(referencePlayableCells) &&
      occupiedCells > referencePlayableCells
    ) {
      throw new Error(
        `${entry.level_id} full-level shape area exceeds competitor playable cells: ${occupiedCells}/${referencePlayableCells}`,
      );
    }
    if (
      isNumber(occupiedCells) &&
      isNumber(designPlayableCells) &&
      occupiedCells > designPlayableCells
    ) {
      throw new Error(
        `${entry.level_id} full-level shape area exceeds our target playable cells: ${occupiedCells}/${designPlayableCells}`,
      );
    }
  }
}

const coverage = {
  total_levels: levels.length,
  competitor_board_rows_cols_known: levels.filter(
    (entry) => entry.exact_match_status.competitor_board_outer_rows_cols === "ready_to_lock",
  ).length,
  competitor_playable_cell_count_known: levels.filter(
    (entry) => isNumber(entry.competitor_reference.playable_cell_count),
  ).length,
  our_design_playable_cell_count_ready: levels.filter(
    (entry) => isNumber(entry.our_design_blueprint.board_size_lock.target_playable_cell_count),
  ).length,
  user_authorized_board_size_fills: levels.filter(
    (entry) => entry.source_evidence.user_authorized_board_size_fill_applied,
  ).length,
  proposed_outer_rows_cols_ready: levels.filter((entry) =>
    isNumber(entry.our_design_blueprint.board_size_lock.proposed_outer_rows_cols?.rows) &&
    isNumber(entry.our_design_blueprint.board_size_lock.proposed_outer_rows_cols?.cols),
  ).length,
  user_authorized_outer_adjustments: levels.filter(
    (entry) => entry.source_evidence.user_authorized_outer_adjustment_applied,
  ).length,
  our_design_opening_shape_targets_ready: levels.filter(
    (entry) => entry.our_design_blueprint.opening_visible_shape_target.histogram !== "unclear",
  ).length,
  user_authorized_opening_shape_designs: levels.filter(
    (entry) => entry.source_evidence.user_authorized_opening_shape_design_applied,
  ).length,
  full_level_block_count_ready: levels.filter(
    (entry) => entry.exact_match_status.full_level_block_count === "ready_to_lock",
  ).length,
  color_count_ready: levels.filter(
    (entry) => entry.exact_match_status.color_count.startsWith("ready_to_lock"),
  ).length,
  full_level_color_count_ready: levels.filter(
    (entry) => entry.competitor_reference.color_count_scope.startsWith("full_level"),
  ).length,
  visible_shape_histogram_available: levels.filter(
    (entry) => entry.competitor_reference.block_shapes.visible_shape_histogram !== "unclear",
  ).length,
  visible_shape_histogram_exact: levels.filter((entry) =>
    entry.competitor_reference.block_shapes.visible_shape_exactness.startsWith("exact"),
  ).length,
  visible_shape_histogram_partial_or_unclear: levels.filter(
    (entry) => !entry.competitor_reference.block_shapes.visible_shape_exactness.startsWith("exact"),
  ).length,
  visible_shape_count_reference_discrepancies: levels.filter(
    (entry) => entry.competitor_reference.block_shapes.visible_count_matches_reference_min === false,
  ).length,
  full_level_shape_histogram_ready: levels.filter(
    (entry) => entry.exact_match_status.full_level_block_shape_mix === "ready_to_lock",
  ).length,
  competitor_outer_and_composition_different_mask_impossible: levels.filter(
    (entry) =>
      entry.our_design_blueprint
        .competitor_outer_same_block_composition_different_mask_feasibility ===
      "impossible_full_outer_grid_is_occupied",
  ).length,
  authorized_outer_adjustments_requiring_exact_tiling_validation: levels.filter(
    (entry) =>
      entry.source_evidence.user_authorized_outer_adjustment_applied &&
      entry.our_design_blueprint.proposed_outer_block_packing_feasibility ===
        "requires_exact_tiling_validation",
  ).length,
  levels_with_unclear_fields: levels.filter((entry) => entry.unclear_fields.length > 0).length,
};

const output = {
  title: "Block Out! Lv1–100 竞品同构成原创关卡约束表 v3",
  generated_on: "2026-09-11",
  status: "blueprint_only_not_applied_to_game",
  source_priority: [
    "Lv1–20：两段新版连续视频人工复核（总块数、全流程颜色种类数）",
    "Lv1–100：2026-06/09人工复核截图主表（棋盘、开局可见块与颜色、机制分项）",
    "Lv1–10：正式竞品构成核验（精确全流程形状直方图）",
    "Lv11–100：逐截图可见形状人工复核；被遮挡/生成后的形状仍标unclear",
    "24个旧棋盘unclear项：二次逐图网格复核；只采纳高置信可玩格结果",
    "Lv37/44/72/75/77/82：竞品原始格数继续保留unclear；我方目标按用户授权结合邻关难度补值",
    "20个开局形状partial/unclear关卡：竞品证据状态原样保留；我方按用户授权结合邻关难度设计精确目标",
    "Lv3/4/5/6/7/10/52/60/63/100：竞品外框与可玩格数原样保留；我方按用户授权调整外框以生成原创异形mask",
  ],
  interpretation: {
    board_size: "竞品原始playable_cell_count清晰时锁定原值；Lv37/44/72/75/77/82的竞品字段仍为unclear，仅在我方蓝图中使用用户授权的邻关难度校准值；10个满外框构成关仅调整我方外框、可玩格总数不变",
    color_count: "Lv1–20为全流程视频口径；Lv21–100在全部块开局可见时为全流程截图口径，否则仅为开局可见口径",
    block_count: "有连续视频或所有分项均已知时才写精确总数，否则写unclear并保留下限",
    block_shapes: "竞品可见直方图与全流程直方图分开；80关精确竞品值直接锁定，20关partial/unclear仅在我方蓝图中按邻关难度设计",
  },
  immutable_rules: {
    preserve_from_competitor: [
      "棋盘可玩格总数playable_cell_count（源数据清晰时）",
      "颜色种类总数（保持同口径）",
      "全流程色块形状直方图（仅在有精确证据时）",
      "开局可见形状直方图（80关证据精确时）",
      "全流程块总数（仅在有精确证据时）",
    ],
    allowed_to_change: [
      "棋盘可玩mask/轮廓",
      "Lv3/4/5/6/7/10/52/60/63/100的我方外框（保持可玩格总数）",
      "具体颜色集合或颜色角色映射，但颜色种类总数不变",
      "色块坐标、出口位置与解题顺序",
      "20个竞品开局形状partial/unclear关卡的我方形状目标（保持逐轮廓复核块数）",
    ],
    forbidden: [
      "把unclear补成推测值",
      "把开局可见下限冒充全流程总数",
      "把旧v2生成提案冒充竞品实测",
      "把用户授权的我方开局形状设计回写成竞品实测",
      "用我方外框提案覆盖competitor_reference.board_size",
    ],
  },
  user_authorized_board_size_fills: {
    authorized_on: "2026-09-11",
    scope: "our_design_blueprint.board_size_lock only",
    rule: "只补我方设计目标，不改写竞品事实字段",
    levels: Object.entries(USER_AUTHORIZED_BOARD_SIZE_FILLS).map(([level, value]) => ({
      level_id: `Lv${String(level).padStart(3, "0")}`,
      ...value,
    })),
  },
  user_authorized_outer_adjustments: {
    authorized_on: "2026-09-11",
    scope: "our_design_blueprint.board_size_lock.proposed_outer_* only",
    rule: "允许调整我方外框，但必须保持竞品可玩格总数及完整色块构成；竞品外框字段不得改写",
    levels: Object.entries(USER_AUTHORIZED_OUTER_ADJUSTMENTS).map(([levelText, value]) => {
      const level = Number(levelText);
      const entry = levels[level - 1];
      const boardLock = entry.our_design_blueprint.board_size_lock;
      return {
        level_id: entry.level_id,
        competitor_outer_rows_cols: entry.competitor_reference.board_size,
        preserved_playable_cell_count: boardLock.target_playable_cell_count,
        proposed_outer_rows_cols: value.proposed_outer_rows_cols,
        proposed_outer_capacity: boardLock.proposed_outer_capacity,
        proposed_mask_cut_cell_count: boardLock.proposed_mask_cut_cell_count,
        mask_direction: value.mask_direction,
        packing_note: value.packing_note,
        mask_status:
          entry.our_design_blueprint
            .proposed_outer_same_playable_cell_count_different_shape_feasibility,
        packing_status: entry.our_design_blueprint.proposed_outer_block_packing_feasibility,
      };
    }),
  },
  user_authorized_opening_shape_designs: {
    authorized_on: "2026-09-11",
    scope: "our_design_blueprint.opening_visible_shape_target only",
    rule: "保持每关逐轮廓复核的开局可见块数；按前后难度设计精确形状，不改写竞品partial/unclear字段",
    levels: Object.entries(USER_AUTHORIZED_OPENING_SHAPE_DESIGNS).map(([level, value]) => ({
      level_id: `Lv${String(level).padStart(3, "0")}`,
      histogram: value.histogram,
      block_count: histogramBlockCount(value.histogram),
      shape_type_count: histogramShapeTypeCount(value.histogram),
      occupied_cell_count: occupiedCellCount(value.histogram),
      difficulty_v2: value.difficulty_v2,
      rationale: value.rationale,
    })),
  },
  project_supported_colors: PROJECT_COLORS,
  shape_legend: shapeAudit.shape_legend,
  coverage,
  levels,
};

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.writeFileSync(OUTPUT_JSON, `${JSON.stringify(output, null, 2)}\n`, "utf8");

const csvHeaders = [
  "level_id",
  "board_rows",
  "board_cols",
  "competitor_playable_cells",
  "our_target_playable_cells",
  "board_size_target_source",
  "proposed_outer_rows",
  "proposed_outer_cols",
  "proposed_outer_source",
  "proposed_outer_capacity",
  "proposed_mask_cut_cell_count",
  "preserves_target_playable_cell_count",
  "competitor_outer_composition_mask_feasibility",
  "proposed_outer_mask_feasibility",
  "proposed_outer_block_packing_feasibility",
  "full_level_blocks",
  "visible_block_min",
  "color_count",
  "color_scope",
  "competitor_visible_colors",
  "our_colors",
  "visible_shape_histogram",
  "visible_shape_type_count",
  "visible_shape_exactness",
  "our_opening_shape_histogram",
  "our_opening_shape_type_count",
  "our_opening_shape_block_count",
  "our_opening_shape_occupied_cells",
  "our_opening_shape_density_ratio",
  "our_opening_shape_target_source",
  "our_opening_shape_target_status",
  "our_opening_shape_exact_match_status",
  "full_level_shape_histogram",
  "full_level_shape_type_count",
  "our_board_shape_family",
  "competitor_playable_cells_status",
  "our_target_playable_cells_status",
  "competitor_outer_rows_cols_status",
  "block_count_exact_status",
  "shape_exact_status",
  "unclear_fields",
];

const csvRows = levels.map((entry) => [
  entry.level_id,
  entry.competitor_reference.board_size.rows,
  entry.competitor_reference.board_size.cols,
  entry.competitor_reference.playable_cell_count,
  entry.our_design_blueprint.board_size_lock.target_playable_cell_count,
  entry.our_design_blueprint.board_size_lock.target_source,
  entry.our_design_blueprint.board_size_lock.proposed_outer_rows_cols?.rows ?? "pending_generation",
  entry.our_design_blueprint.board_size_lock.proposed_outer_rows_cols?.cols ?? "pending_generation",
  entry.our_design_blueprint.board_size_lock.proposed_outer_source,
  entry.our_design_blueprint.board_size_lock.proposed_outer_capacity,
  entry.our_design_blueprint.board_size_lock.proposed_mask_cut_cell_count,
  entry.our_design_blueprint.board_size_lock.preserves_target_playable_cell_count,
  entry.our_design_blueprint
    .competitor_outer_same_block_composition_different_mask_feasibility,
  entry.our_design_blueprint
    .proposed_outer_same_playable_cell_count_different_shape_feasibility,
  entry.our_design_blueprint.proposed_outer_block_packing_feasibility,
  entry.competitor_reference.full_level_block_count,
  entry.competitor_reference.opening_visible_block_count_min,
  entry.competitor_reference.color_count,
  entry.competitor_reference.color_count_scope,
  entry.competitor_reference.opening_visible_colors_snapshot.join("/"),
  Array.isArray(entry.our_design_blueprint.colors)
    ? entry.our_design_blueprint.colors.join("/")
    : entry.our_design_blueprint.colors,
  entry.competitor_reference.block_shapes.visible_shape_histogram,
  entry.competitor_reference.block_shapes.visible_shape_type_count,
  entry.competitor_reference.block_shapes.visible_shape_exactness,
  entry.our_design_blueprint.opening_visible_shape_target.histogram,
  entry.our_design_blueprint.opening_visible_shape_target.shape_type_count,
  entry.our_design_blueprint.opening_visible_shape_target.block_count,
  entry.our_design_blueprint.opening_visible_shape_target.occupied_cell_count,
  entry.our_design_blueprint.opening_visible_shape_target.occupied_cell_ratio,
  entry.our_design_blueprint.opening_visible_shape_target.target_source,
  entry.our_design_blueprint.opening_visible_shape_target.status,
  entry.exact_match_status.our_design_opening_visible_shape_target,
  entry.competitor_reference.block_shapes.full_level_shape_histogram,
  entry.competitor_reference.block_shapes.full_level_shape_type_count,
  entry.our_design_blueprint.board_shape_family,
  entry.exact_match_status.competitor_board_size_playable_cell_count,
  entry.exact_match_status.our_design_board_size_target,
  entry.exact_match_status.competitor_board_outer_rows_cols,
  entry.exact_match_status.full_level_block_count,
  entry.exact_match_status.full_level_block_shape_mix,
  entry.unclear_fields.join(";"),
]);

fs.writeFileSync(
  OUTPUT_CSV,
  `${csvHeaders.map(csvCell).join(",")}\n${csvRows
    .map((row) => row.map(csvCell).join(","))
    .join("\n")}\n`,
  "utf8",
);

const shapeText = (value) => {
  if (value === "unclear") return "unclear";
  return Object.entries(value)
    .map(([shapeId, count]) => `${shapeId}×${count}`)
    .join(" + ");
};

const outerSizeText = (value) =>
  value && isNumber(value.rows) && isNumber(value.cols)
    ? `${value.rows}×${value.cols}`
    : "待生成";

const markdownRows = levels.map((entry) => {
  const reference = entry.competitor_reference;
  const design = entry.our_design_blueprint;
  const size = `${reference.board_size.rows}×${reference.board_size.cols}`;
  const boardLock = design.board_size_lock;
  const openingShapeTarget = design.opening_visible_shape_target;
  return `| ${entry.level_id} | ${size} | ${reference.playable_cell_count} | ${boardLock.target_playable_cell_count} | ${outerSizeText(boardLock.proposed_outer_rows_cols)} | ${reference.full_level_block_count} | ${reference.color_count} | ${design.colors === "unclear" ? "unclear" : design.colors.join("/")} | ${shapeText(reference.block_shapes.visible_shape_histogram)} | ${reference.block_shapes.visible_shape_exactness} | ${shapeText(openingShapeTarget.histogram)} | ${openingShapeTarget.target_source} | ${shapeText(reference.block_shapes.full_level_shape_histogram)} | ${design.board_shape_family} | ${entry.unclear_fields.length ? entry.unclear_fields.join("；") : "—"} |`;
});

const adjustmentMarkdownRows = Object.entries(USER_AUTHORIZED_BOARD_SIZE_FILLS).map(
  ([level, adjustment]) =>
    `| Lv${String(level).padStart(3, "0")} | unclear | ${adjustment.target_playable_cell_count} | ${outerSizeText(adjustment.proposed_outer_rows_cols)} | ${adjustment.difficulty_v2} | ${adjustment.neighbor_difficulty_v2.previous} → ${adjustment.neighbor_difficulty_v2.next} | ${adjustment.rationale} |`,
);

const outerAdjustmentMarkdownRows = Object.entries(USER_AUTHORIZED_OUTER_ADJUSTMENTS).map(
  ([levelText, adjustment]) => {
    const level = Number(levelText);
    const entry = levels[level - 1];
    const reference = entry.competitor_reference;
    const boardLock = entry.our_design_blueprint.board_size_lock;
    return `| ${entry.level_id} | ${reference.board_size.rows}×${reference.board_size.cols} | ${boardLock.target_playable_cell_count} | ${outerSizeText(adjustment.proposed_outer_rows_cols)} | ${boardLock.proposed_outer_capacity} | ${boardLock.proposed_mask_cut_cell_count} | ${adjustment.mask_direction} | ${entry.our_design_blueprint.proposed_outer_block_packing_feasibility} |`;
  },
);

const shapeDesignMarkdownRows = Object.entries(USER_AUTHORIZED_OPENING_SHAPE_DESIGNS).map(
  ([levelText, design]) => {
    const level = Number(levelText);
    const targetCells = levels[level - 1].our_design_blueprint.board_size_lock.target_playable_cell_count;
    const blockCount = histogramBlockCount(design.histogram);
    const occupiedCells = occupiedCellCount(design.histogram);
    const density = isNumber(occupiedCells) && isNumber(targetCells)
      ? `${(occupiedCells / targetCells * 100).toFixed(1)}%`
      : "unclear";
    const difficulty = design.difficulty_v2;
    return `| Lv${String(level).padStart(3, "0")} | ${difficulty.previous} → **${difficulty.current}** → ${difficulty.next} | ${shapeText(design.histogram)} | ${blockCount} | ${occupiedCells}/${targetCells}（${density}） | ${design.rationale} |`;
  },
);

const markdown = `# Block Out! Lv1–100 竞品同构成原创关卡约束表 v3

状态：只整理数据，尚未生成或写入实际关卡。

## 口径

- 竞品可玩格数清晰时，我方按本项目既有口径锁定该值；Lv37/44/72/75/77/82 的竞品原始字段继续保留 \`unclear\`，只在我方蓝图内使用用户授权的邻关难度校准值。
- 外框 \`rows×cols\` 优先保持；Lv3/4/5/6/7/10/52/60/63/100 已获授权调整我方外框，但可玩格总数和完整构成不变。
- Lv1–20 颜色数、总块数采用连续视频全流程口径；Lv21–100 若全部块开局可见则颜色数为全流程口径，否则只保证开局截图可见口径。
- “可见形状”只统计截图里可辨识的开局色块；“全流程形状”只有完整证据时才填写。
- 80关竞品开局形状证据精确，直接锁定；20关竞品证据仍保持 \`partial/unclear\`，我方按逐轮廓复核块数和前后难度另设精确目标。
- 竞品事实字段中的 \`unclear\` 不推测、不用旧生成蓝图补齐。

## 覆盖

| 项目 | 可用关数 |
|---|---:|
| 竞品棋盘外框 rows+cols | ${coverage.competitor_board_rows_cols_known}/100 |
| 竞品/高置信复核可玩格数 | ${coverage.competitor_playable_cell_count_known}/100 |
| 我方目标可玩格数 | ${coverage.our_design_playable_cell_count_ready}/100 |
| 用户授权邻关难度补值 | ${coverage.user_authorized_board_size_fills}/100 |
| 已明确我方外框提案 | ${coverage.proposed_outer_rows_cols_ready}/100 |
| 用户授权保持格数调整外框 | ${coverage.user_authorized_outer_adjustments}/100 |
| 精确全流程块总数 | ${coverage.full_level_block_count_ready}/100 |
| 颜色种类数 | ${coverage.color_count_ready}/100 |
| 全流程颜色种类数 | ${coverage.full_level_color_count_ready}/100 |
| 开局可见形状直方图 | ${coverage.visible_shape_histogram_available}/100 |
| 竞品开局形状精确 | ${coverage.visible_shape_histogram_exact}/100 |
| 竞品开局形状partial/unclear | ${coverage.visible_shape_histogram_partial_or_unclear}/100 |
| 我方精确开局形状目标 | ${coverage.our_design_opening_shape_targets_ready}/100 |
| 用户授权邻关难度形状设计 | ${coverage.user_authorized_opening_shape_designs}/100 |
| 可见块计数与旧主表下限不一致 | ${coverage.visible_shape_count_reference_discrepancies}/100 |
| 精确全流程形状直方图 | ${coverage.full_level_shape_histogram_ready}/100 |
| 竞品原外框+完整构成下无法改变mask | ${coverage.competitor_outer_and_composition_different_mask_impossible}/100 |
| 授权外框关待精确铺装验证 | ${coverage.authorized_outer_adjustments_requiring_exact_tiling_validation}/100 |

## 用户授权的10关外框调整

仅调整我方外框，竞品外框、可玩格总数和完整色块构成均不变。当前为外框与mask方向蓝图，生成实际mask后仍须做几何、精确铺装和求解器验证。

| 关卡 | 竞品外框 | 保持可玩格 | 我方外框提案 | 外框容量 | 裁格数 | mask方向 | 铺装状态 |
|---|---:|---:|---:|---:|---:|---|---|
${outerAdjustmentMarkdownRows.join("\n")}

## 用户授权的棋盘大小校准

以下数值仅属于我方设计目标；“竞品原始格数”仍保持 \`unclear\`。

| 关卡 | 竞品原始格数 | 我方目标格数 | 我方外框提案 | 本关难度v2 | 邻关难度v2 | 校准依据 |
|---|---|---:|---:|---:|---:|---|
${adjustmentMarkdownRows.join("\n")}

## 用户授权的20关开局形状设计

以下形状仅属于我方设计目标；竞品原始直方图及其 \`partial/unclear\` 状态保持不变。

| 关卡 | 前关 → 本关 → 后关难度v2 | 我方开局形状目标 | 块数 | 占地/棋盘 | 设计依据 |
|---|---:|---|---:|---:|---|
${shapeDesignMarkdownRows.join("\n")}

## 逐关表

| 关卡 | 竞品外框 | 竞品格数 | 我方目标格数 | 我方外框提案 | 全流程块数 | 颜色数 | 我方颜色 | 竞品开局形状 | 竞品形状证据 | 我方开局形状目标 | 目标来源 | 全流程形状 | 我方原创轮廓方向 | unclear |
|---|---:|---:|---:|---:|---:|---:|---|---|---|---|---|---|---|---|
${markdownRows.join("\n")}
`;

fs.writeFileSync(OUTPUT_MD, markdown, "utf8");

console.log(JSON.stringify({ outputs: [OUTPUT_JSON, OUTPUT_CSV, OUTPUT_MD], coverage }, null, 2));
