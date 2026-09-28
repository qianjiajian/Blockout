import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const BLUEPRINT_PATH = path.join(
  ROOT,
  "deliverables/level-generation-blueprint/blockout-lv001-lv100-exact-reference-constraints-v3.json",
);
const RECORDS_PATH = path.join(
  ROOT,
  "deliverables/competitor-level-relations/blockout-lv001-lv100-level-records.json",
);
const START_INDEX_PATH = path.join(
  ROOT,
  "references/benchmark/youtube/levels-001-100-nova/level-initial-frame-index.json",
);
const OUR_GAME_SCORED_LEVELS_PATH = path.join(
  ROOT,
  "deliverables/original-levels/pipeline/blockout-original-levels-001-100-scored.json",
);
const OUR_GAME_LEVEL_DESIGN_SUMMARY_PATH = path.join(
  ROOT,
  "playtest-results/latest-level-design-summary.json",
);
const OUTPUT_DIR = path.join(ROOT, "deliverables/competitor-level-relations");
const OUTPUT_JSON = path.join(
  OUTPUT_DIR,
  "blockout-lv001-lv100-youtube-dynamic-recovery.json",
);
const OUTPUT_CSV = path.join(
  OUTPUT_DIR,
  "blockout-lv001-lv100-youtube-dynamic-recovery.csv",
);
const OUTPUT_MD = path.join(
  OUTPUT_DIR,
  "blockout-lv001-lv100-youtube-dynamic-recovery.md",
);

const UNCLEAR = "unclear";

// Final Lv2-Lv100 design recommendation confirmed in the earlier level-design
// discussion. The current brief raises the Lv4-Lv100 floor to five without
// replacing any already-higher recommendation. This is an acceptance floor for
// our game, not competitor evidence and not a solver measurement.
const RECOMMENDED_MINIMUM_REPOSITION_OVERHEAD = Object.freeze([
  null, 1, 2, 5, 5, 5, 6, 7, 8, 10,
  6, 7, 8, 9, 5, 8, 9, 10, 12, 11,
  6, 7, 8, 10, 5, 8, 9, 11, 12, 13,
  7, 8, 10, 11, 6, 10, 12, 13, 14, 15,
  8, 9, 11, 12, 6, 11, 13, 14, 15, 5,
  9, 10, 12, 13, 6, 12, 13, 15, 16, 17,
  10, 11, 12, 14, 7, 13, 14, 16, 17, 5,
  11, 12, 14, 15, 7, 14, 15, 16, 17, 18,
  12, 13, 14, 15, 7, 15, 16, 17, 18, 18,
  8, 13, 15, 16, 8, 15, 16, 17, 18, 18,
]);

// Unapplied D1 design target. Lv1-Lv3 are represented by null here and are
// copied from the current shipping campaign below. Lv4 enters at 70; Lv5 and
// every fifth level thereafter are local peaks. Both troughs and peaks rise
// across the campaign, ending at 95 on Lv100.
const TARGET_D1_CALIBRATED_SCORE = Object.freeze([
  null, null, null, 70, 76,
  70, 72, 74, 75.5, 77,
  71, 73, 75, 76.5, 78,
  72, 74, 76, 77.5, 79,
  73, 75, 77, 78.5, 80,
  74, 76, 78, 79.5, 81,
  75, 77, 79, 80.5, 82,
  76, 78, 80, 81.5, 83,
  77, 79, 81, 82.5, 84,
  78, 80, 82, 83.5, 85,
  79, 81, 83, 84.5, 86,
  80, 82, 84, 85.5, 87,
  81, 83, 85, 86.5, 88,
  82, 84, 86, 87.5, 89,
  83, 85, 87, 88.5, 90,
  84, 86, 88, 89.5, 91,
  85, 87, 89, 90.5, 92,
  86, 88, 90, 91.5, 93,
  87, 89, 91, 92.5, 94,
  88, 90, 92, 93.5, 95,
]);

const DIFFICULTY_BAND_LABELS = Object.freeze({
  tutorial: "教学",
  entry: "入门",
  normal: "普通",
  advanced: "进阶",
  hard: "困难",
  extreme: "极难",
});

const SHAPE_AREA = {
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
  RECT2X3: 6,
};

// Only values that were directly confirmed in the June 2026 Nova walkthroughs
// belong here. Missing values intentionally remain absent and are emitted as
// `unclear`; no neighbour interpolation or design target may enter this table.
const YOUTUBE_RECOVERY = {
  11: { fullShape: { SINGLE: 12, H3: 10 } },
  12: { fullShape: { V3: 12 } },
  13: { fullShape: { H3: 16 } },
  14: {
    openingCount: 16,
    openingShape: { SINGLE: 9, V2: 5, V3: 2 },
    fullShape: { SINGLE: 10, V2: 5, V3: 2, SQ3: 1 },
    note: "开局截图旧形状表多/漏计边缘动态块；全流程总构成为18块。",
  },
  17: { fullShape: { SINGLE: 12, V2: 4, SQ2: 1, H3: 9 } },
  18: { fullShape: { V2: 14, H3: 1, SQ3: 1 } },
  19: { fullShape: { SINGLE: 12, H2: 7, V2: 2, SQ2: 6 } },
  20: { fullShape: { H2: 12, V3: 2 } },
  21: { fullBlockCount: 24, fullColorCount: 5, fullShape: { H2: 16, V2: 4, SQ2: 2, V3: 2 } },
  22: { fullBlockCount: 25, fullColorCount: 6, fullShape: { SINGLE: 10, H2: 2, V2: 1, H3: 2, V3: 4, SQ2: 6 } },
  23: { fullBlockCount: 20, fullColorCount: 5, fullShape: { H2: 10, V2: 6, L3: 3, L4: 1 } },
  24: { fullBlockCount: 26, fullColorCount: 6, fullShape: { SINGLE: 21, V2: 4, V3: 1 } },
  26: { fullBlockCount: 28, fullColorCount: 7, fullShape: { SINGLE: 19, V2: 3, H2: 3, SQ2: 2, T4: 1 } },
  27: { fullBlockCount: 17, fullColorCount: 5, fullShape: { SINGLE: 9, H3: 8 } },
  28: { fullBlockCount: 18, fullColorCount: 6, fullShape: { H3: 7, L3: 3, H2: 3, V3: 4, SQ3: 1 } },
  29: {
    fullBlockCount: 30,
    fullColorCount: 6,
    fullShape: { SINGLE: 19, H2: 1, V2: 1, SQ2: 2, L3: 1, T4: 4, L4: 2 },
    evidenceSeconds: [490, 545, 550, 555, 560, 565, 570, 575, 580, 585],
    derivation: {
      opening: { count: 21, histogram: { SINGLE: 18, V2: 1, L3: 1, T4: 1 } },
      leftCover: { count: 5, histogram: { SINGLE: 1, T4: 3, L4: 1 } },
      rightCover: { count: 4, histogram: { H2: 1, SQ2: 2, L4: 1 } },
    },
  },
  30: { fullBlockCount: 19, fullColorCount: 4, fullShape: { SINGLE: 14, L3: 1, V3: 3, SQ2: 1 } },
  31: { fullColorCount: 4, fullShape: { V2: 14, SQ2: 4 } },
  32: { fullColorCount: 4, fullShape: { H2: 2, V3: 6, L4: 6 } },
  34: { fullBlockCount: 30, fullColorCount: 6, fullShape: { SINGLE: 13, H2: 1, V2: 3, V3: 13 } },
  35: {
    fullBlockCount: 18,
    fullColorCount: 3,
    strictlyObservedShapeSubtotal: { V3: 1, L4: 1, SQ2: 2 },
    unresolvedPieceCount: 14,
    evidenceSeconds: [270, 275, 280, 285, 290],
    unresolved: ["generator_queue_shape_histogram", "full_level_shape_histogram"],
  },
  36: { fullBlockCount: 14, fullColorCount: 4, fullShape: { H2: 3, V2: 3, SQ2: 1, L3: 5, L4: 2 } },
  37: {
    board: { rows: 8, cols: 7, playableCellCount: 44 },
    fullBlockCount: 14,
    fullColorCount: 6,
    fullShape: { V2: 9, H3: 2, L3: 2, T4: 1 },
    evidenceSeconds: [345, 360, 365, 370, 375],
    note: "空盘确认8×7外框减四根内柱共12格；竞品实测44格，旧49格仅为我方设计填值。",
  },
  38: { fullBlockCount: 25, fullColorCount: 6, fullShape: { SINGLE: 4, H2: 7, SQ2: 6, H3: 7, CROSS5: 1 } },
  39: {
    board: { rows: 8, cols: 8, playableCellCount: 64, componentCount: 2, componentSizes: [{ rows: 4, cols: 8 }, { rows: 4, cols: 8 }] },
    fullBlockCount: 32,
    fullColorCount: 6,
    strictlyObservedShapeSubtotal: { SINGLE: 10, H2: 11, V2: 6, SQ2: 3, L3: 1 },
    unresolvedPieceCount: 1,
    evidenceSeconds: [460, 475, 480, 495, 510, 525, 530, 535],
    unresolved: ["one_generator_piece_shape", "full_level_shape_histogram"],
  },
  40: { fullBlockCount: 19, fullColorCount: 5, fullShape: { SINGLE: 6, H2: 5, V2: 6, V3: 1, L3: 1 } },
  41: { fullBlockCount: 25, fullColorCount: 6, unresolved: ["generator_queue_shape_histogram", "full_level_shape_histogram"] },
  43: { fullBlockCount: 54, fullColorCount: 4, unresolved: ["generator_queue_shape_histogram", "full_level_shape_histogram"] },
  44: {
    board: { rows: 9, cols: 7, playableCellCount: 49, outerEnvelopeCells: 57, fixedWallCells: 8 },
    fullBlockCount: 16,
    fullColorCount: 7,
    evidenceSeconds: [182, 210, 215],
    derivation: {
      openingOrdinary: { count: 3 },
      numericIce: { count: 4 },
      generatorQueue: { count: 3 },
      fiveCoversRevealed: { count: 6 },
    },
    unresolved: ["playable_mask_exact_lower_wall_coordinates", "full_level_shape_histogram"],
  },
  46: { fullBlockCount: 25, fullColorCount: 7, unresolved: ["generator_queue_shape_histogram", "full_level_shape_histogram"] },
  47: {
    fullBlockCount: 29,
    fullColorCount: UNCLEAR,
    unresolved: ["numeric_ice_base_colors", "full_level_color_count", "generator_queue_shapes_5_and_6", "full_level_shape_histogram"],
    note: "冰层青色只是机制皮肤，不能据此增加玩法颜色。",
  },
  48: {
    board: { rows: UNCLEAR, cols: 7, playableCellCount: 56, componentCount: 2, componentSizes: [{ rows: 4, cols: 7 }, { rows: 4, cols: 7 }] },
    fullBlockCount: 20,
    fullColorCount: 6,
    fullShape: { SINGLE: 3, H2: 7, V2: 3, V3: 1, SQ2: 6 },
    unresolved: ["single_global_rows_value"],
  },
  49: {
    fullColorCount: 7,
    provenLowerBound: 25,
    corrections: { generatorQueueCount: 11, generatorSideCounts: [6, 5] },
    derivation: {
      opening: { count: 12 },
      numericIce: { count: 2 },
      generatorQueue: { count: 11, sideCounts: [6, 5] },
      coverHidden: UNCLEAR,
    },
    unresolved: ["hidden_block_count", "full_level_block_count", "generator_queue_shape_histogram", "full_level_shape_histogram"],
    note: "同版本开局视频为6+5队列；已证下限25块。开仓帧混入此前色块、解冻块和生成器新块，无法逐块去重。",
  },
  51: { fullBlockCount: 12, fullColorCount: 6, fullShape: { H3: 9, V3: 3 } },
  53: { fullBlockCount: 14, fullColorCount: 7, fullShape: { SINGLE: 3, H2: 4, H3: 1, V2: 4, SQ2: 2 } },
  54: {
    fullColorCount: 7,
    provenLowerBound: 10,
    derivation: { opening: { count: 7 }, numericIce: { count: 3 }, coverHidden: UNCLEAR },
    unresolved: ["hidden_block_count", "full_level_block_count", "full_level_shape_histogram"],
    note: "四个仓分时开启，5秒采样跨过开仓后的拖动；当前只能严格确认下限10块。",
  },
  55: { fullBlockCount: 19, fullColorCount: 7, fullShape: { SINGLE: 1, H2: 4, H3: 10, V3: 4 } },
  56: { fullBlockCount: 20, fullColorCount: 7, unresolved: ["numeric_ice_shapes", "generator_queue_shape_histogram", "full_level_shape_histogram"] },
  57: { fullBlockCount: 22, fullColorCount: 7, unresolved: ["generator_queue_shapes_2_and_3", "full_level_shape_histogram"] },
  58: { fullBlockCount: 23, fullColorCount: 6, unresolved: ["numeric_ice_shapes", "generator_queue_shape_histogram", "full_level_shape_histogram"] },
  59: {
    fullColorCount: 7,
    provenLowerBound: 16,
    derivation: { opening: { count: 16 }, coverHidden: UNCLEAR },
    unresolved: ["hidden_block_count", "full_level_block_count", "full_level_shape_histogram"],
    note: "两个遮挡仓开启前后缺少无操作连续帧；当前只能严格确认下限16块。",
  },
  61: { fullBlockCount: 19, fullColorCount: 8, fullShape: { SINGLE: 1, H2: 13, SQ2: 3, L3: 2 } },
  62: {
    fullBlockCount: 22,
    fullColorCount: 7,
    corrections: { generatorQueueCount: 3 },
    unresolved: ["generator_queue_shapes_2_and_3", "full_level_shape_histogram"],
    note: "同版本视频的生成器递减链为3→2→0；旧截图表的5属于误读。",
  },
  64: {
    fullColorCount: 6,
    provenLowerBound: 11,
    derivation: { opening: { count: 11 }, coverHidden: UNCLEAR },
    evidenceSeconds: [305, 325, 340],
    unresolved: ["hidden_block_count", "full_level_block_count", "full_level_shape_histogram"],
    note: "三次开仓画面之间均发生拖动；当前只能严格确认下限11块。",
  },
  65: { fullBlockCount: 11, fullColorCount: 6, fullShape: { H2: 1, H3: 4, V2: 5, SQ2: 1 } },
  66: { fullBlockCount: 17, fullColorCount: 6, fullShape: { H2: 9, H3: 1, V2: 5, V3: 1, SQ2: 1 } },
  67: { fullBlockCount: 15, fullColorCount: 7, fullShape: { H2: 3, H3: 2, V2: 3, V3: 2, SQ2: 3, T4: 1, L3: 1 } },
  68: {
    board: { rows: 10, cols: 7, playableCellCount: 56, componentCount: 2, componentPlayableCells: [28, 28] },
    fullBlockCount: 19,
    fullColorCount: 5,
    fullShape: { H2: 3, V2: 8, SQ2: 6, L3: 2 },
  },
  69: { fullBlockCount: 24, fullColorCount: 6, unresolved: ["full_level_shape_histogram"] },
  70: {
    fullBlockCount: 18,
    fullColorCount: 4,
    fullShape: { SINGLE: 9, V2: 9 },
    note: "紫色轮廓是落点引导，不是第五种色块。",
  },
  71: {
    fullBlockCount: 24,
    fullColorCount: 5,
    corrections: { generatorQueueCount: 8, hiddenBlockCount: 5 },
    unresolved: ["generator_queue_shape_histogram", "full_level_shape_histogram"],
  },
  72: {
    board: {
      rows: 13,
      cols: 7,
      playableCellCount: 75,
      playableMask: ["#######", "#######", "#######", "....###", "....###", "#######", "#######", "#######", "###....", "###....", "#######", "#######", "#######"],
    },
    fullBlockCount: 19,
    fullColorCount: 8,
    fullShape: { SQ3: 1, T4: 1, SINGLE: 2, L3: 2, SQ2: 4, V2: 2, H2: 3, L4: 2, V3: 2 },
    corrections: { hiddenBlockCount: 5 },
  },
  73: { fullBlockCount: 19, fullColorCount: 6, fullShape: { L3: 4, SINGLE: 6, SQ2: 2, H2: 4, H3: 1, V2: 2 } },
  74: { fullBlockCount: 28, fullColorCount: 6, fullShape: { SINGLE: 6, V2: 4, H2: 5, L3: 5, L4: 1, SQ2: 1, H3: 3, V3: 2, T4: 1 } },
  75: {
    board: {
      rows: 11,
      cols: 7,
      playableCellCount: 56,
      componentCount: 2,
      playableMask: ["..###..", ".#####.", "#######", "#######", ".#####.", "..###..", ".......", ".#####.", "#######", "#######", "#######"],
    },
    fullBlockCount: 20,
    fullColorCount: 6,
    fullShape: { SINGLE: 7, H2: 4, H3: 4, V2: 2, SQ2: 1, L3: 2 },
  },
  76: {
    fullBlockCount: 12,
    fullColorCount: 4,
    corrections: { numericIceBlockCount: 3 },
    unresolved: ["numeric_ice_shape_histogram", "full_level_shape_histogram"],
    note: "Nova同版本视频为普通9+数字冰块3；旧截图表的数字冰块9属于版本/识别冲突。",
  },
  77: {
    board: {
      rows: 9,
      cols: 7,
      playableCellCount: 52,
      playableMask: ["#.....#", "#######", "#######", "#######", "#######", "#######", "#######", "##...##", "##...##"],
    },
    fullBlockCount: 23,
    fullColorCount: 5,
    fullShape: { V2: 14, V3: 5, SQ2: 4 },
  },
  78: {
    fullBlockCount: UNCLEAR,
    fullColorCount: 7,
    provenLowerBound: 13,
    unresolved: ["full_level_block_count", "numeric_ice_shape", "full_level_shape_histogram"],
    note: "遮挡区开启期间已有块先退出，现有13块仅为下限，不能视作全流程精确总数。",
  },
  79: { fullBlockCount: 33, fullColorCount: 8, unresolved: ["full_level_shape_histogram"] },
  82: {
    board: {
      rows: 9,
      cols: 7,
      playableCellCount: 58,
      playableMask: [".....##", "#######", "#######", "#######", "#######", "#######", "#######", "#######", "#######"],
    },
    fullBlockCount: 19,
    fullColorCount: 7,
    unresolved: ["two_opening_L_piece_exact_arm_lengths", "numeric_ice_shape", "full_level_shape_histogram"],
  },
  83: { fullBlockCount: 28, fullColorCount: 8, fullShape: { SQ2: 12, L3: 4, SINGLE: 12 } },
  84: {
    board: {
      rows: 10,
      cols: 7,
      playableCellCount: 68,
      playableMask: ["#####..", "#######", "#######", "#######", "#######", "#######", "#######", "#######", "#######", "#######"],
    },
    openingCount: 12,
    openingShape: { H2: 2, SINGLE: 6, V2: 2, L3: 2 },
    fullBlockCount: 26,
    fullColorCount: 7,
    fullShape: { H2: 3, SINGLE: 6, V2: 3, L3: 7, SQ2: 1, V3: 3, H3: 3 },
    note: "四个卷帘区域逐次打开后按新增区域去重：开局12块，依次新增5、4、3、2块，共26块。",
  },
  87: { fullBlockCount: 24, fullColorCount: 5, unresolved: ["numeric_ice_shape_histogram", "generator_queue_shape_histogram", "full_level_shape_histogram"] },
  88: { fullBlockCount: 30, fullColorCount: 6, unresolved: ["generator_queue_shape_histogram", "full_level_shape_histogram"] },
  89: { fullBlockCount: 27, fullColorCount: 7, unresolved: ["generator_queue_shape_histogram", "full_level_shape_histogram"] },
  90: {
    fullBlockCount: 20,
    fullColorCount: 4,
    corrections: { generatorQueueCount: 18, generatorSideCounts: [9, 9] },
    unresolved: ["generator_queue_shape_histogram", "full_level_shape_histogram"],
  },
  91: { fullBlockCount: 25, fullColorCount: 5, fullShape: { SINGLE: 8, H2: 3, H3: 3, V2: 5, V3: 2, L3: 1, L4: 2, SQ2: 1 } },
  92: {
    fullBlockCount: 29,
    fullColorCount: 6,
    fullShape: { H3: 2, H2: 11, SINGLE: 9, L3: 3, SQ2: 2, V3: 1, V2: 1 },
    corrections: { hiddenBlockCount: 13 },
    note: "卷帘打开后下区为13块；旧全流程27块少计2块，同版视频逐格复核为29块。",
  },
  93: { fullBlockCount: 20, fullColorCount: 5, fullShape: { H2: 3, V2: 4, SINGLE: 7, L3: 2, V3: 2, SQ2: 1, RECT2X3: 1 } },
  94: { fullBlockCount: 30, fullColorCount: 6, fullShape: { SINGLE: 9, H2: 4, V2: 3, H3: 5, V3: 3, L3: 4, SQ2: 1, T4: 1 } },
  95: {
    board: {
      rows: 11,
      cols: 8,
      playableCellCount: 64,
      componentCount: 2,
      playableMask: ["########", "########", "########", "########", "........", "........", "........", "########", "########", "########", "########"],
    },
    openingCount: 16,
    openingShape: { SINGLE: 13, V2: 1, H3: 2 },
    fullBlockCount: 29,
    fullColorCount: 7,
    fullShape: { SINGLE: 22, V2: 1, H3: 2, H2: 2, L3: 2 },
    note: "盖板数字17是倒计时，不是开局块数；开局实际16块。",
  },
  96: { fullBlockCount: 32, fullColorCount: 8, fullShape: { H2: 6, L3: 4, V3: 1, SINGLE: 14, V2: 6, SQ2: 1 } },
  98: {
    fullBlockCount: 19,
    fullColorCount: 7,
    fullShape: { V2: 5, SQ2: 1, H2: 2, SINGLE: 2, L3: 6, T4: 1, V3: 1, CROSS5: 1 },
    corrections: { numericIceBlockCount: 4, hiddenBlockCount: 5 },
  },
  99: {
    fullBlockCount: 26,
    fullColorCount: 7,
    fullShape: { SINGLE: 6, T4: 2, V2: 8, L3: 2, H2: 7, SQ2: 1 },
    evidenceSeconds: [795, 825, 835],
    derivation: {
      opening: { count: 12, histogram: { SINGLE: 2, T4: 1, V2: 5, L3: 1, H2: 2, SQ2: 1 } },
      threeCovers: { count: 14, histogram: { H2: 5, V2: 3, SINGLE: 4, L3: 1, T4: 1 } },
    },
  },
};

// Extra single-level uploads found by title/thumbnail search. They are accepted
// only as opening-frame corroboration because the playback stream was blocked by
// YouTube bot verification during this audit; they never supply dynamic totals.
const SUPPLEMENTAL_YOUTUBE_SOURCES = {
  29: ["https://www.youtube.com/watch?v=tatS9-2Cp5A"],
  39: ["https://www.youtube.com/watch?v=J1xBsJ6eOEs"],
  41: ["https://www.youtube.com/watch?v=Lfn5JNKoXKQ"],
  43: [
    "https://www.youtube.com/watch?v=nm8uSyi5PXY",
    "https://www.youtube.com/watch?v=Nu13gbGGvXs",
  ],
  44: ["https://www.youtube.com/watch?v=1hl0DNdgSF8"],
  47: ["https://www.youtube.com/watch?v=CBq30M3Rs-Q"],
  49: ["https://www.youtube.com/watch?v=bdR1CFFdcZE"],
  54: ["https://www.youtube.com/watch?v=L5ZASjXL-Co"],
  56: ["https://www.youtube.com/watch?v=sqRrXyRKFBA"],
  57: ["https://www.youtube.com/watch?v=kflCnnP0LZM"],
  58: ["https://www.youtube.com/watch?v=GvwOW6WhjlE"],
  64: ["https://www.youtube.com/watch?v=XNeXsryzLo8"],
};

const EXPECTED_REVIEW_LEVELS = [
  11, 12, 13, 14, 17, 18, 19, 20, 21, 22, 23, 24, 26, 27, 28, 29, 30,
  31, 32, 34, 35, 36, 37, 38, 39, 40, 41, 43, 44, 46, 47, 48, 49, 51, 53,
  54, 55, 56, 57, 58, 59, 61, 62, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73,
  74, 75, 76, 77, 78, 79, 82, 83, 84, 87, 88, 89, 90, 91, 92, 93, 94, 95,
  96, 98, 99,
];

const isNumber = (value) => typeof value === "number" && Number.isFinite(value);
const difficultyBandForScore = (score) => {
  if (score >= 80) return "extreme";
  if (score >= 70) return "hard";
  if (score >= 60) return "advanced";
  if (score >= 50) return "normal";
  if (score >= 45) return "entry";
  return "tutorial";
};
const targetDifficultyCurveRole = (level) => {
  if (level <= 3) return "preserve_current";
  if (level === 4) return "wave_entry";
  if (level % 5 === 0) return "five_level_peak";
  if (level % 5 === 1) return "wave_reset";
  return "wave_ramp";
};
const histogramCount = (histogram) =>
  histogram === UNCLEAR
    ? UNCLEAR
    : Object.values(histogram).reduce((sum, count) => sum + count, 0);
const histogramArea = (histogram) => {
  if (histogram === UNCLEAR) return UNCLEAR;
  let area = 0;
  for (const [shape, count] of Object.entries(histogram)) {
    if (!isNumber(SHAPE_AREA[shape])) return UNCLEAR;
    area += SHAPE_AREA[shape] * count;
  }
  return area;
};
const containsUnclear = (value) => {
  if (value === UNCLEAR) return true;
  if (Array.isArray(value)) return value.some(containsUnclear);
  if (value && typeof value === "object") return Object.values(value).some(containsUnclear);
  return false;
};
const csvCell = (value) => {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return `"${String(text ?? "").replaceAll('"', '""')}"`;
};
const shapeText = (histogram) =>
  histogram === UNCLEAR
    ? UNCLEAR
    : Object.entries(histogram).map(([shape, count]) => `${shape}×${count}`).join(" + ");

const blueprint = JSON.parse(fs.readFileSync(BLUEPRINT_PATH, "utf8"));
const records = JSON.parse(fs.readFileSync(RECORDS_PATH, "utf8"));
const startIndex = JSON.parse(fs.readFileSync(START_INDEX_PATH, "utf8"));
const ourGameScoredLevels = JSON.parse(fs.readFileSync(OUR_GAME_SCORED_LEVELS_PATH, "utf8"));
const ourGameLevelDesignReport = JSON.parse(
  fs.readFileSync(OUR_GAME_LEVEL_DESIGN_SUMMARY_PATH, "utf8"),
);
const ourGameLevelDesignSummary = ourGameLevelDesignReport.summary;
if (blueprint.levels.length !== 100 || records.length !== 100) {
  throw new Error(`Expected 100 levels, got blueprint=${blueprint.levels.length}, records=${records.length}`);
}
if (
  !Array.isArray(ourGameScoredLevels) ||
  ourGameScoredLevels.length !== 100 ||
  ourGameLevelDesignSummary?.schemaVersion !== 3 ||
  ourGameLevelDesignSummary?.levelCount !== 100 ||
  !Array.isArray(ourGameLevelDesignSummary?.levels) ||
  ourGameLevelDesignSummary.levels.length !== 100
) {
  throw new Error("Current game difficulty sources must contain the generated schema-v3 Lv1-Lv100 campaign");
}
for (let index = 0; index < 100; index += 1) {
  const expectedId = index + 1;
  const scored = ourGameScoredLevels[index];
  const summaryLevel = ourGameLevelDesignSummary.levels[index];
  const rawScore = scored?.difficulty?.score;
  const calibratedScore = summaryLevel?.calibratedDifficulty;
  if (
    scored?.level_id !== expectedId ||
    summaryLevel?.id !== expectedId ||
    scored?.name !== summaryLevel?.name ||
    scored?.difficulty_tag !== summaryLevel?.difficulty ||
    scored?.difficulty?.version !== "blockout-d1" ||
    !isNumber(rawScore) || rawScore < 0 || rawScore > 100 ||
    !isNumber(calibratedScore) || calibratedScore < 0 || calibratedScore > 100 ||
    Number(rawScore.toFixed(2)) !== rawScore ||
    Number(calibratedScore.toFixed(2)) !== calibratedScore ||
    scored?.difficulty?.calibrated_to_competitor !== calibratedScore ||
    !Object.hasOwn(DIFFICULTY_BAND_LABELS, summaryLevel?.difficultyBand)
  ) {
    throw new Error(`Current game difficulty source mismatch at Lv${expectedId}`);
  }
}
if (
  RECOMMENDED_MINIMUM_REPOSITION_OVERHEAD.length !== 100 ||
  RECOMMENDED_MINIMUM_REPOSITION_OVERHEAD[0] !== null ||
  RECOMMENDED_MINIMUM_REPOSITION_OVERHEAD
    .slice(1)
    .some((value) => !Number.isInteger(value) || value < 1)
) {
  throw new Error("Expected one valid reposition recommendation for every level from Lv2 to Lv100");
}
if (
  TARGET_D1_CALIBRATED_SCORE.length !== 100 ||
  TARGET_D1_CALIBRATED_SCORE.slice(0, 3).some((value) => value !== null) ||
  TARGET_D1_CALIBRATED_SCORE.slice(3).some((value) => !isNumber(value) || value < 70 || value > 100)
) {
  throw new Error("Expected a valid Lv4-Lv100 D1 target curve with a floor of 70");
}
for (let peakLevel = 5; peakLevel <= 100; peakLevel += 5) {
  const peak = TARGET_D1_CALIBRATED_SCORE[peakLevel - 1];
  const previous = TARGET_D1_CALIBRATED_SCORE[peakLevel - 2];
  const next = peakLevel < 100 ? TARGET_D1_CALIBRATED_SCORE[peakLevel] : null;
  if (peak <= previous || (next !== null && peak <= next)) {
    throw new Error(`Lv${peakLevel} must be a local D1 difficulty peak`);
  }
  if (peakLevel > 5 && peak <= TARGET_D1_CALIBRATED_SCORE[peakLevel - 6]) {
    throw new Error(`Lv${peakLevel} D1 peak must exceed the preceding five-level peak`);
  }
}
const actualReviewLevels = Object.keys(YOUTUBE_RECOVERY).map(Number).sort((a, b) => a - b);
if (
  actualReviewLevels.length !== EXPECTED_REVIEW_LEVELS.length ||
  actualReviewLevels.some((level, index) => level !== EXPECTED_REVIEW_LEVELS[index])
) {
  throw new Error(`YouTube review coverage mismatch: ${actualReviewLevels.join(",")}`);
}

const sourceVideos = [];
const sourceByLevel = new Map();
for (const segment of startIndex.segments) {
  const [first, last] = segment.levels.split("-").map(Number);
  const segmentMetadataPath = path.join(
    path.dirname(START_INDEX_PATH),
    `levels-${segment.levels}-5s/metadata.json`,
  );
  const segmentMetadata = JSON.parse(fs.readFileSync(segmentMetadataPath, "utf8"));
  const video = {
    levels: `${first}-${last}`,
    youtube_id: segment.youtubeId,
    url: `https://www.youtube.com/watch?v=${segment.youtubeId}`,
    channel: "Nova’s Puzzle Den",
    version: "2026-06 updated levels",
    duration_seconds: segmentMetadata.durationSeconds,
  };
  sourceVideos.push(video);
  for (let level = first; level <= last; level += 1) {
    const localIndex = level - first;
    const startSeconds = segment.selectedSeconds[localIndex];
    const endSeconds = localIndex + 1 < segment.selectedSeconds.length
      ? segment.selectedSeconds[localIndex + 1]
      : segmentMetadata.durationSeconds;
    sourceByLevel.set(level, { ...video, start_seconds: startSeconds, end_seconds: endSeconds });
  }
}

const levels = blueprint.levels.map((base, index) => {
  const level = index + 1;
  const record = records[index];
  const recovery = YOUTUBE_RECOVERY[level] ?? {};
  const source = sourceByLevel.get(level);
  const scoredLevel = ourGameScoredLevels[index];
  const designSummaryLevel = ourGameLevelDesignSummary.levels[index];
  const targetD1Score = level <= 3
    ? designSummaryLevel.calibratedDifficulty
    : TARGET_D1_CALIBRATED_SCORE[index];
  const targetD1Band = level <= 3
    ? designSummaryLevel.difficultyBand
    : difficultyBandForScore(targetD1Score);
  const baseBoard = base.competitor_reference.board_size;
  const recoveredBoard = recovery.board ?? {};
  const board = {
    rows: recoveredBoard.rows ?? baseBoard.rows,
    cols: recoveredBoard.cols ?? baseBoard.cols,
    playable_cell_count:
      recoveredBoard.playableCellCount ?? base.competitor_reference.playable_cell_count,
    component_count: recoveredBoard.componentCount ?? record.board.component_count,
    component_sizes: recoveredBoard.componentSizes ?? null,
    component_playable_cells: recoveredBoard.componentPlayableCells ?? null,
    playable_mask: recoveredBoard.playableMask ?? record.board.playable_mask ?? UNCLEAR,
    outer_envelope_cells: recoveredBoard.outerEnvelopeCells ?? null,
    fixed_wall_cells: recoveredBoard.fixedWallCells ?? null,
  };

  const baseFullColor = base.competitor_reference.color_count_scope.startsWith("full_level")
    ? base.competitor_reference.color_count
    : UNCLEAR;
  const fullBlockCount = recovery.fullBlockCount ?? base.competitor_reference.full_level_block_count;
  const fullColorCount = recovery.fullColorCount ?? baseFullColor;
  const openingCount = recovery.openingCount ?? base.competitor_reference.opening_visible_block_count_min;
  const openingShape = recovery.openingShape ?? base.competitor_reference.block_shapes.visible_shape_histogram;
  const fullShape = recovery.fullShape ?? base.competitor_reference.block_shapes.full_level_shape_histogram;
  const fullShapeCount = histogramCount(fullShape);
  const fullShapeArea = histogramArea(fullShape);
  const boardMaskStatus = !Array.isArray(board.playable_mask)
    ? "missing"
    : board.playable_mask.every((row) => /^[#.]+$/.test(row))
      ? "exact"
      : "partial";

  if (isNumber(fullBlockCount) && isNumber(fullShapeCount) && fullBlockCount !== fullShapeCount) {
    throw new Error(`Lv${level} full block/shape count mismatch: ${fullBlockCount}/${fullShapeCount}`);
  }
  if (
    Array.isArray(board.playable_mask) &&
    board.playable_mask.every((row) => /^[#.]+$/.test(row))
  ) {
    const maskCells = board.playable_mask.reduce(
      (sum, row) => sum + [...row].filter((cell) => cell === "#").length,
      0,
    );
    if (isNumber(board.playable_cell_count) && maskCells !== board.playable_cell_count) {
      throw new Error(`Lv${level} mask/playable count mismatch: ${maskCells}/${board.playable_cell_count}`);
    }
  }

  const coreUnclear = [];
  if (!isNumber(board.rows) && !Array.isArray(board.component_sizes)) coreUnclear.push("board.rows");
  if (!isNumber(board.cols)) coreUnclear.push("board.cols");
  if (!isNumber(board.playable_cell_count)) coreUnclear.push("board.playable_cell_count");
  if (!isNumber(openingCount)) coreUnclear.push("opening_visible_block_count_min");
  if (openingShape === UNCLEAR || containsUnclear(openingShape)) coreUnclear.push("opening_visible_shape_histogram");
  if (!isNumber(fullBlockCount)) coreUnclear.push("full_level_block_count");
  if (!isNumber(fullColorCount)) coreUnclear.push("full_level_color_count");
  if (fullShape === UNCLEAR || containsUnclear(fullShape)) coreUnclear.push("full_level_shape_histogram");

  return {
    level_id: `Lv${String(level).padStart(3, "0")}`,
    source: "Block Out! - Color Sort Puzzle",
    source_version: "Nova’s Puzzle Den 2026-06 updated levels",
    our_game_design_targets: {
      recommended_minimum_reposition_overhead:
        RECOMMENDED_MINIMUM_REPOSITION_OVERHEAD[index],
      target_d1_difficulty: {
        formula_version: "blockout-d1",
        score_kind: "calibrated",
        calibrated_score: targetD1Score,
        band: targetD1Band,
        band_label: DIFFICULTY_BAND_LABELS[targetD1Band],
        curve_role: targetDifficultyCurveRole(level),
      },
    },
    our_game_current_difficulty: {
      formula_version: scoredLevel.difficulty.version,
      raw_score: scoredLevel.difficulty.score,
      calibrated_score: designSummaryLevel.calibratedDifficulty,
      band: designSummaryLevel.difficultyBand,
      band_label: DIFFICULTY_BAND_LABELS[designSummaryLevel.difficultyBand],
      ui_difficulty_tag: scoredLevel.difficulty_tag,
    },
    youtube_evidence: {
      url: source.url,
      start_seconds: source.start_seconds,
      end_seconds: source.end_seconds,
      local_frame_set: `references/benchmark/youtube/levels-001-100-nova/levels-${String(Math.floor((level - 1) / 10) * 10 + 1).padStart(3, "0")}-${String(Math.floor((level - 1) / 10) * 10 + 10).padStart(3, "0")}-5s`,
      dynamically_rechecked_for_missing_fields: Boolean(YOUTUBE_RECOVERY[level]),
      confirmed_seconds: recovery.evidenceSeconds ?? null,
      supplemental_opening_match_sources: (SUPPLEMENTAL_YOUTUBE_SOURCES[level] ?? []).map((url) => ({
        url,
        start_seconds: 0,
        verified_scope: "opening_frame_only",
        dynamic_fields_status: "unavailable_due_to_youtube_bot_verification",
      })),
    },
    board,
    board_mask_status: boardMaskStatus,
    opening_visible_block_count_min: openingCount,
    opening_visible_block_count_scope: isNumber(recovery.openingCount)
      ? "youtube_exact"
      : "screenshot_confirmed_lower_bound",
    counted_opening_shape_blocks: histogramCount(openingShape),
    opening_visible_color_count: record.colored_blocks.visible_color_count,
    opening_visible_colors: record.colored_blocks.visible_colors,
    opening_visible_shape_histogram: openingShape,
    opening_shape_note: base.competitor_reference.block_shapes.note ?? null,
    full_level_block_count: fullBlockCount,
    proven_full_level_block_count_lower_bound: recovery.provenLowerBound ?? null,
    full_level_color_count: fullColorCount,
    full_level_shape_histogram: fullShape,
    full_level_shape_type_count: fullShape === UNCLEAR ? UNCLEAR : Object.keys(fullShape).length,
    full_level_occupied_cell_count: fullShapeArea,
    strictly_observed_shape_subtotal: recovery.strictlyObservedShapeSubtotal ?? null,
    unresolved_piece_count: recovery.unresolvedPieceCount ?? null,
    dynamic_derivation: recovery.derivation ?? null,
    mechanisms_from_opening_snapshot: record.mechanism_summary,
    youtube_corrections: recovery.corrections ?? null,
    note: recovery.note ?? null,
    core_unclear_fields: [...new Set(coreUnclear)],
    detailed_remaining_unclear: [...new Set(recovery.unresolved ?? [])],
    core_status: coreUnclear.length === 0 ? "complete" : "partial",
    evidence_status:
      coreUnclear.length === 0 && boardMaskStatus === "exact" ? "complete" : "partial",
  };
});

const originalUnclearLevels = blueprint.levels.filter((entry) => entry.unclear_fields.length > 0).length;
const coreComplete = levels.filter((entry) => entry.core_status === "complete").length;
if (
  !levels.every(
    (entry, index) =>
      entry.our_game_design_targets.recommended_minimum_reposition_overhead ===
      RECOMMENDED_MINIMUM_REPOSITION_OVERHEAD[index],
  )
) {
  throw new Error("Generated reposition recommendations do not match the confirmed Lv1-Lv100 sequence");
}
if (
  !levels.every((entry, index) => {
    const level = index + 1;
    const target = entry.our_game_design_targets.target_d1_difficulty;
    const current = entry.our_game_current_difficulty;
    const expectedScore = level <= 3
      ? current.calibrated_score
      : TARGET_D1_CALIBRATED_SCORE[index];
    return target.calibrated_score === expectedScore
      && target.band === difficultyBandForScore(expectedScore)
      && target.curve_role === targetDifficultyCurveRole(level)
      && (level <= 3 || target.calibrated_score >= 70)
      && (level <= 3 || entry.our_game_design_targets.recommended_minimum_reposition_overhead >= 5);
  })
) {
  throw new Error("Generated Lv1-Lv100 D1/reposition design targets violate the accepted curve");
}
if (
  !levels.every((entry, index) => {
    const scored = ourGameScoredLevels[index];
    const summaryLevel = ourGameLevelDesignSummary.levels[index];
    return entry.our_game_current_difficulty.raw_score === scored.difficulty.score
      && entry.our_game_current_difficulty.calibrated_score === summaryLevel.calibratedDifficulty
      && entry.our_game_current_difficulty.band === summaryLevel.difficultyBand
      && entry.our_game_current_difficulty.ui_difficulty_tag === scored.difficulty_tag;
  })
) {
  throw new Error("Generated current difficulty values do not match the authoritative game sources");
}
const summary = {
  total_levels: 100,
  originally_rechecked_levels: EXPECTED_REVIEW_LEVELS.length,
  original_blueprint_levels_with_unclear_fields: originalUnclearLevels,
  board_geometry_resolved_levels: levels.filter((entry) =>
    isNumber(entry.board.playable_cell_count) &&
    isNumber(entry.board.cols) &&
    (isNumber(entry.board.rows) || Array.isArray(entry.board.component_sizes)),
  ).length,
  exact_board_mask_levels: levels.filter((entry) => entry.board_mask_status === "exact").length,
  partial_board_mask_levels: levels.filter((entry) => entry.board_mask_status === "partial").length,
  missing_board_mask_levels: levels.filter((entry) => entry.board_mask_status === "missing").length,
  full_level_block_count_resolved_levels: levels.filter((entry) => isNumber(entry.full_level_block_count)).length,
  full_level_color_count_resolved_levels: levels.filter((entry) => isNumber(entry.full_level_color_count)).length,
  full_level_shape_histogram_resolved_levels: levels.filter((entry) => entry.full_level_shape_histogram !== UNCLEAR).length,
  core_complete_levels: coreComplete,
  levels_with_any_core_unclear: 100 - coreComplete,
  target_d1_lv4_100_min: Math.min(...levels.slice(3).map((entry) =>
    entry.our_game_design_targets.target_d1_difficulty.calibrated_score)),
  target_d1_lv4_100_max: Math.max(...levels.slice(3).map((entry) =>
    entry.our_game_design_targets.target_d1_difficulty.calibrated_score)),
  target_reposition_lv4_100_min: Math.min(...levels.slice(3).map((entry) =>
    entry.our_game_design_targets.recommended_minimum_reposition_overhead)),
  five_level_difficulty_peak_count: levels.filter((entry) =>
    entry.our_game_design_targets.target_d1_difficulty.curve_role === "five_level_peak").length,
};

const output = {
  title: "Block Out! Lv1–100 竞品构成、我方波浪难度目标与当前难度",
  generated_on: "2026-09-11",
  status: "combined_competitor_evidence_current_game_difficulty_and_unapplied_design_target",
  source_index: startIndex.sourceIndex,
  source_videos: sourceVideos,
  supplemental_opening_match_sources: Object.entries(SUPPLEMENTAL_YOUTUBE_SOURCES).flatMap(
    ([level, urls]) => urls.map((url) => ({
      level_id: `Lv${String(level).padStart(3, "0")}`,
      url,
      start_seconds: 0,
      verified_scope: "opening_frame_only",
      dynamic_fields_status: "unavailable_due_to_youtube_bot_verification",
    })),
  ),
  version_policy: {
    included: "只采用 Nova’s Puzzle Den 2026-06 updated levels，与仓库100张开局图逐关同版。",
    excluded: "不混入2026-08及其他关卡重排版本；同关编号但棋盘不同的来源仅作版本冲突提示。",
    unknown_policy: "五秒抽帧间隙无法严格去重或辨形时保留 unclear，禁止根据邻关、机制数字或设计蓝图补值。",
  },
  design_recommendation_policy: {
    field: "levels[].our_game_design_targets.recommended_minimum_reposition_overhead",
    metric: "reposition_overhead",
    metric_definition: "minimum_drags_minus_clear_load",
    scope: "our_game_design_target_not_competitor_observation",
    source: "prior_conversation_final_recommendation_with_current_lv4_100_minimum_floor_raised_to_5",
    coverage: "Lv2-Lv100",
    lv1_value: null,
    lv1_reason: "tutorial_level_outside_the_original_lv2_lv100_recommendation_scope",
    acceptance_rule: "minimum_floor_keep_higher_solver_actual",
    applied_to_game: false,
  },
  our_game_difficulty_target_policy: {
    field: "levels[].our_game_design_targets.target_d1_difficulty",
    primary_value: "calibrated_score",
    metric: "blockout-d1-calibrated",
    scope: "our_game_design_target_not_current_measurement_or_competitor_observation",
    lv1_3_rule: "preserve_current_shipping_calibrated_score_and_band",
    lv4_100_minimum: 70,
    wave_rule: "Lv5 and every fifth level through Lv100 is a local peak; successive troughs and peaks rise",
    peak_levels: Array.from({ length: 20 }, (_, index) => (index + 1) * 5),
    final_level_target: 95,
    bands: {
      entry: [45, 49.99],
      normal: [50, 59.99],
      advanced: [60, 69.99],
      hard: [70, 79.99],
      extreme: [80, 100],
      tutorial: "score below 45 / tutorial exception",
    },
    applied_to_game: false,
    requires_solver_validation_after_level_generation: true,
  },
  our_game_difficulty_policy: {
    field: "levels[].our_game_current_difficulty",
    primary_value: "calibrated_score",
    metric: "blockout-d1-calibrated",
    raw_formula: "100 * (0.35*buffer_tightness + 0.20*hidden_information + 0.20*mechanism_diversity + 0.25*exit_competition)",
    calibration_formula: "round(13.161835 + 0.826935 * raw_score, 2)",
    bands: {
      entry: [45, 49.99],
      normal: [50, 59.99],
      advanced: [60, 69.99],
      hard: [70, 79.99],
      extreme: [80, 100],
      tutorial: "Lv1 exception below formal bands",
    },
    scope: "our_current_shipping_levels_not_competitor_observation",
    sources: [
      "deliverables/original-levels/pipeline/blockout-original-levels-001-100-scored.json",
      "playtest-results/latest-level-design-summary.json",
    ],
    source_schema_version: 3,
    applied_to_game: true,
    game_levels_modified_by_this_dataset_update: false,
  },
  shape_cell_area: SHAPE_AREA,
  summary,
  remaining_core_unclear_by_level: levels
    .filter((entry) => entry.core_unclear_fields.length > 0)
    .map((entry) => ({ level_id: entry.level_id, fields: entry.core_unclear_fields })),
  remaining_board_mask_by_level: levels
    .filter((entry) => entry.board_mask_status !== "exact")
    .map((entry) => ({ level_id: entry.level_id, status: entry.board_mask_status })),
  levels,
};

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.writeFileSync(OUTPUT_JSON, `${JSON.stringify(output, null, 2)}\n`, "utf8");

const csvHeaders = [
  "level_id", "youtube_url", "board_rows", "board_cols", "playable_cells",
  "board_mask_status", "opening_blocks_min", "counted_opening_shape_blocks",
  "opening_colors", "opening_shape_histogram", "full_blocks", "proven_full_blocks_lower_bound",
  "full_colors", "full_shape_histogram", "core_status", "evidence_status", "core_unclear_fields",
  "detailed_remaining_unclear", "note", "our_recommended_minimum_reposition_overhead",
  "our_target_d1_calibrated_score", "our_target_d1_band", "our_target_d1_curve_role",
  "our_difficulty_raw_score", "our_difficulty_calibrated_score", "our_difficulty_band",
  "our_ui_difficulty_tag",
];
const csvRows = levels.map((entry) => [
  entry.level_id,
  entry.youtube_evidence.url,
  entry.board.rows,
  entry.board.cols,
  entry.board.playable_cell_count,
  entry.board_mask_status,
  entry.opening_visible_block_count_min,
  entry.counted_opening_shape_blocks,
  entry.opening_visible_color_count,
  entry.opening_visible_shape_histogram,
  entry.full_level_block_count,
  entry.proven_full_level_block_count_lower_bound,
  entry.full_level_color_count,
  entry.full_level_shape_histogram,
  entry.core_status,
  entry.evidence_status,
  entry.core_unclear_fields.join(";"),
  entry.detailed_remaining_unclear.join(";"),
  entry.note ?? "",
  entry.our_game_design_targets.recommended_minimum_reposition_overhead,
  entry.our_game_design_targets.target_d1_difficulty.calibrated_score,
  entry.our_game_design_targets.target_d1_difficulty.band,
  entry.our_game_design_targets.target_d1_difficulty.curve_role,
  entry.our_game_current_difficulty.raw_score,
  entry.our_game_current_difficulty.calibrated_score,
  entry.our_game_current_difficulty.band,
  entry.our_game_current_difficulty.ui_difficulty_tag,
]);
if (csvRows.some((row) => row.length !== csvHeaders.length)) {
  throw new Error("CSV header/data column count mismatch");
}
fs.writeFileSync(
  OUTPUT_CSV,
  `${csvHeaders.map(csvCell).join(",")}\n${csvRows.map((row) => row.map(csvCell).join(",")).join("\n")}\n`,
  "utf8",
);

const remainingRows = output.remaining_core_unclear_by_level.map((entry) =>
  `| ${entry.level_id} | ${entry.fields.join("；")} |`,
);
const videoRows = sourceVideos.map((entry) =>
  `| Lv${String(entry.levels.split("-")[0]).padStart(3, "0")}–Lv${String(entry.levels.split("-")[1]).padStart(3, "0")} | [${entry.youtube_id}](${entry.url}) | ${entry.duration_seconds.toFixed(3)} |`,
);
const supplementalRows = output.supplemental_opening_match_sources.map((entry) =>
  `| ${entry.level_id} | [单关视频](${entry.url}) | 仅开局逐格匹配；动态字段未采用 |`,
);
const fullBlockText = (entry) => isNumber(entry.full_level_block_count)
  ? String(entry.full_level_block_count)
  : isNumber(entry.proven_full_level_block_count_lower_bound)
    ? `unclear（≥${entry.proven_full_level_block_count_lower_bound}）`
    : UNCLEAR;
const levelRows = levels.map((entry) =>
  `| ${entry.level_id} | ${entry.our_game_design_targets.recommended_minimum_reposition_overhead ?? "—"} | ${entry.our_game_design_targets.target_d1_difficulty.calibrated_score.toFixed(2)} | ${entry.our_game_design_targets.target_d1_difficulty.band_label} | ${entry.our_game_current_difficulty.calibrated_score.toFixed(2)} | ${entry.our_game_current_difficulty.band_label} | ${entry.board.rows}${entry.board.component_sizes ? `（${entry.board.component_sizes.map((item) => `${item.rows}×${item.cols}`).join("+")}）` : ""}×${entry.board.cols} | ${entry.board.playable_cell_count} | ${entry.board_mask_status} | ${fullBlockText(entry)} | ${entry.full_level_color_count} | ${shapeText(entry.full_level_shape_histogram)} | ${entry.core_unclear_fields.length ? entry.core_unclear_fields.join("；") : "—"} |`,
);
const markdown = `# Block Out! Lv1–100 竞品构成、我方波浪难度目标与当前难度

状态：竞品证据、我方当前正式难度与我方设计目标的组合数据。本次仅更新数据集，未修改实际关卡。

同版来源：[Nova’s Puzzle Den 2026-06 updated levels](${startIndex.sourceIndex})。仅采用与本地100张开局图逐关一致的十段视频；不混入后续关卡重排版本。

\`建议必要腾挪下限（我方）\`来自此前最终确认的 Lv2–100 推荐表；本版保持 Lv1–3 不变，并将 Lv4–100 的最低值统一抬到5，因此仅原本低于5的 Lv4、Lv5被补到5。它是我方关卡的最低验收目标，不是竞品视频实测值，也不是当前求解器结果；若求解器实测值更高则保持更高值。该字段不参与 YouTube 证据完整度统计。

\`目标D1难度值（我方）\`保留 Lv1–3 当前正式校准分；Lv4–100最低为70，Lv5及其后每5关形成一次局部峰值，波谷与峰值均逐组抬升，Lv100目标为95。目标值尚未写入实际关卡，也不是求解器实测结果。

\`当前D1难度值（我方）\`取当前正式100关的 D1 校准分，按现行四维公式复算并映射到五档。JSON/CSV 同时保留 D1 原始分、校准分、五档分档和界面难度标签；主难度值为校准分。该数据不是竞品难度，也不参与 YouTube 证据完整度统计。

## 同版视频来源

| 关卡 | YouTube | 时长（秒） |
|---|---|---:|
${videoRows.join("\n")}

### 补充单关视频

| 关卡 | YouTube | 采用范围 |
|---|---|---|
${supplementalRows.join("\n")}

## 覆盖

| 字段 | 已确认 |
|---|---:|
| 棋盘行列与可玩格数 | ${summary.board_geometry_resolved_levels}/100 |
| 精确棋盘 mask | ${summary.exact_board_mask_levels}/100 |
| 部分可见棋盘 mask | ${summary.partial_board_mask_levels}/100 |
| 缺失棋盘 mask | ${summary.missing_board_mask_levels}/100 |
| 全流程色块总数 | ${summary.full_level_block_count_resolved_levels}/100 |
| 全流程颜色种类数 | ${summary.full_level_color_count_resolved_levels}/100 |
| 全流程形状直方图 | ${summary.full_level_shape_histogram_resolved_levels}/100 |
| 四项核心字段全部完整 | ${summary.core_complete_levels}/100 |
| Lv4–100目标D1范围 | ${summary.target_d1_lv4_100_min}–${summary.target_d1_lv4_100_max} |
| Lv4–100建议腾挪下限最低值 | ${summary.target_reposition_lv4_100_min} |
| 五关峰值数 | ${summary.five_level_difficulty_peak_count} |

## YouTube 后仍不明确的核心字段

| 关卡 | 字段 |
|---|---|
${remainingRows.join("\n")}

精确棋盘 mask 以外另有：partial ${summary.partial_board_mask_levels} 关、missing ${summary.missing_board_mask_levels} 关；逐关状态已写入 JSON/CSV 的 \`board_mask_status\`。

## 逐关结果

| 关卡 | 建议必要腾挪下限（我方） | 目标D1难度值（我方） | 目标D1档位 | 当前D1难度值（我方） | 当前D1档位 | 外框 | 可玩格 | mask | 全流程块数 | 全流程颜色数 | 全流程形状 | 仍不明确 |
|---|---:|---:|---|---:|---|---:|---:|---|---:|---:|---|---|
${levelRows.join("\n")}
`;
fs.writeFileSync(OUTPUT_MD, markdown, "utf8");

console.log(JSON.stringify({ outputs: [OUTPUT_JSON, OUTPUT_CSV, OUTPUT_MD], summary }, null, 2));
