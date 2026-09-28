import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUTPUT = path.join(
  ROOT,
  "deliverables/competitor-level-relations/blockout-lv001-lv100-visible-shape-audit.json",
);

const FULL_LEVEL_EXACT_L1_10 = {
  1: { SQ2: 3 },
  2: { L3: 2, T4: 1, V3: 5 },
  3: { SQ2: 9 },
  4: { H3: 6, SINGLE: 12 },
  5: { V3: 2, SINGLE: 18 },
  6: { H2: 4, SINGLE: 17 },
  7: { SQ2: 4, V2: 12 },
  8: { SQ3: 1, SINGLE: 24 },
  9: { SQ2: 10 },
  10: { V3: 4, SQ2: 5, SINGLE: 16 },
};

const OPENING_VISIBLE_OVERRIDE_L1_10 = {
  10: { SINGLE: 16 },
};

// Lv11–100 values are filled only after direct screenshot review. Do not copy the
// old composition proposal here: it is generated target data, not competitor fact.
const SCREENSHOT_VISIBLE_SHAPES = {
  11: { histogram: { SINGLE: 12, H3: 3 }, exactness: "exact_visible", fullLevel: false, note: "与开局可见块15对齐；右侧数字冰块×7分开。" },
  12: { histogram: { V3: 8 }, exactness: "exact_visible", fullLevel: false, note: "与开局可见块8对齐；中央数字冰块×4分开。" },
  13: { histogram: { H3: 13 }, exactness: "exact_visible", fullLevel: false, note: "与开局可见块13对齐；数字冰块×3分开。" },
  14: { histogram: { SINGLE: 9, V2: 5, V3: 2 }, exactness: "exact_visible", fullLevel: false, note: "与开局可见块16对齐；中央SQ3数字冰块分开；一块普通单格带冰框。" },
  15: { histogram: { SQ2: 10 }, exactness: "exact_visible", fullLevel: true, note: "五个复合外壳块仍各按一个当前可拖块计；开局展示全部10块。" },
  16: { histogram: { SINGLE: 17, V3: 3 }, exactness: "exact_visible", fullLevel: true, note: "V3中含复合外壳竖块×1；开局展示全部20块。" },
  17: { histogram: { SINGLE: 12, V2: 4, SQ2: 1, H3: 2 }, exactness: "exact_visible", fullLevel: false, note: "与开局可见块19对齐；数字冰块×7分开。" },
  18: { histogram: { V2: 12 }, exactness: "exact_visible", fullLevel: false, note: "与开局可见块12对齐；数字冰块×4分开。" },
  19: { histogram: { SINGLE: 12, H2: 7, V2: 2 }, exactness: "exact_visible", fullLevel: false, note: "与开局可见块21对齐；中央数字冰块×6分开。" },
  20: { histogram: { H2: 6, V3: 1 }, exactness: "partial_hidden_content", fullLevel: false, note: "与开局可见下限7对齐；上部倒计时遮挡仓内容不可见。" },
  21: { histogram: { H2: 14 }, exactness: "partial_hidden_content", fullLevel: false, note: "与开局可见下限14对齐；三个遮挡仓内容未知。" },
  22: { histogram: { SINGLE: 10, H2: 2, V2: 1 }, exactness: "partial_hidden_content", fullLevel: false, note: "与开局可见下限13对齐；大型遮挡仓内容未知。" },
  23: { histogram: { H2: 8, V2: 3, L3: 2 }, exactness: "partial_hidden_content", fullLevel: false, note: "与开局可见下限13对齐；L3为两个复合外壳块；底部遮挡仓内容未知。" },
  24: { histogram: { SINGLE: 12 }, exactness: "partial_hidden_content", fullLevel: false, note: "与开局可见下限12对齐；两个遮挡仓内容未知。" },
  25: { histogram: { SINGLE: 6, V2: 12, V3: 4 }, exactness: "exact_visible", fullLevel: true, note: "开局展示全部22块；V3中含复合外壳块×2。" },
  26: { histogram: { SINGLE: 19, V2: 1 }, exactness: "partial_hidden_content", fullLevel: false, note: "与开局可见下限20对齐；中央窄仓及底部大仓内容未知。" },
  27: { histogram: { SINGLE: 9 }, exactness: "partial_hidden_content", fullLevel: false, note: "与开局可见下限9对齐；右侧3×3九块均独立；左侧仓内容未知。" },
  28: { histogram: { H3: 6 }, exactness: "partial_hidden_content", fullLevel: false, note: "与开局可见下限6对齐；上部两个遮挡仓内容未知。" },
  29: { histogram: { SINGLE: 18, V2: 1, L3: 1, T4: 1 }, exactness: "partial_hidden_content", fullLevel: false, note: "与开局可见下限21对齐；两侧遮挡仓内容未知。" },
  30: { histogram: { SINGLE: 14, L3: 1 }, exactness: "partial_hidden_content", fullLevel: false, note: "与开局可见下限15对齐；中央遮挡仓内容未知。" },
  31: { histogram: { V2: 14 }, exactness: "exact_visible", fullLevel: false, note: "与开局可拖块14对齐；数字冰块分开。" },
  32: { histogram: { H2: 2, V3: 6 }, exactness: "exact_visible", fullLevel: false, note: "与开局可拖块8对齐；数字冰块分开。" },
  33: { histogram: { SINGLE: 21, T4: 2 }, exactness: "exact_visible", fullLevel: true, note: "上下各一枚T4；开局展示全部23块。" },
  34: { histogram: { SINGLE: 13, H2: 1, V2: 3 }, exactness: "unclear_count_discrepancy", fullLevel: false, note: "逐可见外轮廓为17，主表可见下限16；同色边界存在1块差异，未强行合并；上方遮挡仓分开。" },
  35: { histogram: { V3: 1, L4: 1 }, exactness: "exact_visible", fullLevel: false, note: "两枚开局可拖块；生成器队列16分开。" },
  36: { histogram: { H2: 2, V2: 3, SQ2: 1, L3: 4, L4: 1 }, exactness: "exact_visible", fullLevel: false, note: "与开局可拖块11对齐；生成器队列3分开。" },
  37: { histogram: { V2: 8, H3: 2 }, exactness: "partial_hidden_content", fullLevel: false, note: "与开局可见下限10对齐；生成器队列与遮挡仓内容分开。" },
  38: { histogram: { SINGLE: 1, H2: 7 }, exactness: "partial_hidden_content", fullLevel: false, note: "与开局可见下限8对齐；数字冰块、生成器队列与遮挡仓内容分开。" },
  39: { histogram: { SINGLE: 5, H2: 3, V2: 1, L3: 1 }, exactness: "partial_hidden_content", fullLevel: false, note: "与开局可见下限10对齐；生成器队列及三个遮挡仓内容分开。" },
  40: { histogram: { SINGLE: 4, H2: 4, V2: 3 }, exactness: "partial_hidden_content", fullLevel: false, note: "与开局可见下限11对齐；上方遮挡仓内容未知。" },
  41: { histogram: { SINGLE: 2, H2: 4, SQ2: 1 }, exactness: "exact_visible", fullLevel: false, note: "与开局可见下限7对齐；数字冰块、生成器与遮挡后内容分开。" },
  42: { histogram: { SINGLE: 24 }, exactness: "exact_visible", fullLevel: true, note: "开局展示全部24个色块。" },
  43: { histogram: { T4: 4, CROSS5: 2 }, exactness: "exact_visible", fullLevel: false, note: "四个旋转T四连块、两个十字五连块；生成队列分开。" },
  44: { histogram: { V2: 2, H3: 1 }, exactness: "exact_visible", fullLevel: false, note: "与开局可见下限3对齐；数字冰块与生成队列分开。" },
  45: { histogram: { SINGLE: 1, H2: 5, V2: 2, V3: 1, SQ2: 5, L3: 2 }, exactness: "exact_visible", fullLevel: true, note: "两枚单层外壳按其SQ2外形各计一个独立块；开局展示全部16块。" },
  46: { histogram: { SINGLE: 2, H2: 1, H3: 2, V2: 1, SQ2: 1, L3: 1, T4: 1 }, exactness: "exact_visible", fullLevel: false, note: "底部青色L3、蓝色T4；绿色外壳按H3外形计；生成器与遮挡后内容分开。" },
  47: { histogram: { SINGLE: 16, H2: 4, H3: 1 }, exactness: "exact_visible", fullLevel: false, note: "与开局可见块21对齐；数字冰块与生成队列分开。" },
  48: { histogram: { SINGLE: 3, H2: 7, SQ2: 2 }, exactness: "exact_visible", fullLevel: false, note: "与开局可见下限12对齐；红色外壳按H2外形计；遮挡后内容不明。" },
  49: { histogram: { SINGLE: 4, H2: 1, V2: 1, SQ2: 4, L3: 1, T4: 1 }, exactness: "exact_visible", fullLevel: false, note: "与开局可见下限12对齐；数字冰块、生成器与倒计时遮挡区分开。" },
  50: { histogram: { H2: 4, V2: 2, H3: 2, V3: 4, SQ2: 1 }, exactness: "exact_visible", fullLevel: true, note: "11个箭头块与2个纹样块均为开局可拖块；开局展示全部13块。" },
  51: { histogram: { H3: 8, V3: 3 }, exactness: "exact_visible", fullLevel: false, note: "与开局可见块11对齐；数字冰块分开；外壳、箭头与纹样块均按外轮廓计。" },
  52: { histogram: { SINGLE: 2, H2: 7, V2: 1, V3: 6, SQ2: 3 }, exactness: "exact_visible", fullLevel: true, note: "开局展示全部19块。" },
  53: { histogram: { SINGLE: 3, H2: 2, H3: 1, V2: 4, SQ2: 1 }, exactness: "exact_visible", fullLevel: false, note: "与开局可见块11对齐；数字冰块×3分开；外壳按V2外形计。" },
  54: { histogram: { SINGLE: 3, H2: 3, L3: 1 }, exactness: "exact_visible", fullLevel: false, note: "与开局可见下限7对齐；数字冰块与四个遮挡仓内容分开。" },
  55: { histogram: { SINGLE: 1, H2: 4, H3: 7 }, exactness: "exact_visible", fullLevel: false, note: "与开局可见下限12对齐；数字冰块与下方遮挡仓分开。" },
  56: { histogram: { SINGLE: 2, V2: 6, V3: 1, SQ2: 3, L3: 4 }, exactness: "partial_boundary_ambiguity", fullLevel: false, note: "逐外轮廓目视为16，但主表可见下限为15；下半区同色边界有歧义，未强行并块。" },
  57: { histogram: { SINGLE: 1, H2: 5, SQ2: 1 }, exactness: "exact_visible", fullLevel: false, note: "与开局可见下限7对齐；数字冰块及上下遮挡仓分开。" },
  58: { histogram: { SINGLE: 5, H2: 2, H3: 2, V2: 1 }, exactness: "exact_visible", fullLevel: false, note: "与开局可见块10对齐；数字冰块与生成队列分开。" },
  59: { histogram: { SINGLE: 2, H2: 12, V2: 1, SQ2: 1 }, exactness: "exact_visible", fullLevel: false, note: "与开局可见下限16对齐；蓝色外壳按H2计；遮挡仓分开。" },
  60: { histogram: { SINGLE: 35 }, exactness: "exact_visible", fullLevel: true, note: "5×7全为独立纹样单格；开局展示全部35块。" },
  61: { histogram: { SINGLE: 1, H2: 6, SQ2: 2, L3: 2 }, exactness: "exact_visible", fullLevel: false, note: "与开局可见下限11对齐；上方倒计时遮挡仓内容分开。" },
  62: { histogram: { H2: 5, H3: 1, V2: 3, SQ2: 3, L3: 1 }, exactness: "exact_visible", fullLevel: false, note: "与开局可见下限13对齐；外壳按外形计；中部遮挡仓与生成器分开。" },
  63: { histogram: { SINGLE: 2, H2: 6, SQ2: 2, L3: 6, L4: 2 }, exactness: "exact_visible", fullLevel: true, note: "形状面积48格，铺满6×8；开局展示全部18块。" },
  64: { histogram: { SINGLE: 7, H2: 1, V2: 2, L3: 1 }, exactness: "exact_visible", fullLevel: false, note: "与开局可见下限11对齐；三个遮挡仓内容分开。" },
  65: { histogram: { H2: 1, H3: 4, V2: 4, SQ2: 1 }, exactness: "exact_visible", fullLevel: false, note: "与开局可见块10对齐；冰框内数字冰块分开。" },
  66: { histogram: { H2: 6, H3: 1, V2: 3, V3: 1, SQ2: 1 }, exactness: "exact_visible", fullLevel: false, note: "与开局可见块12对齐；冰框内数字冰块×5分开。" },
  67: { histogram: { H2: 2, H3: 1, V2: 3, SQ2: 2 }, exactness: "exact_visible", fullLevel: false, note: "与开局可见下限8对齐；下部数字冰块与遮挡仓内容分开。" },
  68: { histogram: { H2: 3, V2: 2, SQ2: 3, L3: 2 }, exactness: "exact_visible", fullLevel: false, note: "与开局可见下限10对齐；下方遮挡仓内容分开。" },
  69: { histogram: { SINGLE: 1, H2: 5, SQ2: 1, L3: 2 }, exactness: "exact_visible", fullLevel: false, note: "与开局可见下限9对齐；外壳按外形计；四个遮挡仓内容分开。" },
  70: { histogram: { V2: 1 }, exactness: "exact_visible", fullLevel: false, note: "仅计开局中央绿色竖2格；生成器队列与边栏计数分开。" },
  71: { histogram: { T4: 1, V3: 1, SINGLE: 1, L4: 1, V2: 4, SQ2: 1, H2: 2 }, exactness: "exact_visible", fullLevel: false, note: "与开局可见下限11对齐；上方遮挡仓、左侧生成器分开。" },
  72: { histogram: { SQ3: 1, T4: 1, SINGLE: 1, L3: 1, SQ2: 4, V2: 2, H2: 1, L4: 1 }, exactness: "partial_low_resolution", fullLevel: false, note: "与可见下限12对齐；T4/L3/L4具体臂长需原视频逐帧确认；数字冰块与遮挡仓分开。" },
  73: { histogram: { L3: 2, SINGLE: 2, SQ2: 2, H2: 2 }, exactness: "exact_visible", fullLevel: false, note: "与开局可见下限8对齐；下方遮挡仓分开。" },
  74: { histogram: { V2: 3, SINGLE: 6, H2: 4 }, exactness: "exact_visible", fullLevel: false, note: "与开局可见下限13对齐；四个遮挡仓分开；H2含可见外壳色块。" },
  75: { histogram: { SINGLE: 7, H2: 4, H3: 4, V2: 2, SQ2: 1, L3: 2 }, exactness: "exact_visible", fullLevel: true, note: "与开局可拖块20对齐；L3×2为下岛可见外壳色块。" },
  76: { histogram: { SINGLE: 7, V2: 2 }, exactness: "exact_visible", fullLevel: false, note: "与开局可拖块9对齐；数字冰块×9分开。" },
  77: { histogram: { V2: 13, V3: 1, SQ2: 4 }, exactness: "exact_visible", fullLevel: false, note: "与开局可拖块18对齐；数字冰块与生成队列分开。" },
  78: { histogram: { SQ2: 2, L3: 4, H2: 4, V2: 2 }, exactness: "exact_visible", fullLevel: false, note: "与开局可拖块12对齐；中央数字冰块分开。" },
  79: { histogram: { H3: 1, SINGLE: 2, L3: 2, V2: 3, H2: 1 }, exactness: "exact_visible", fullLevel: false, note: "与开局可见下限9对齐；两个遮挡仓分开。" },
  80: { histogram: { V2: 13, SINGLE: 3 }, exactness: "exact_visible", fullLevel: true, note: "钥匙/锁仍按可见独立色块计；开局展示全部16块。" },
  81: { histogram: { H2: 16 }, exactness: "exact_visible", fullLevel: true, note: "整盘16个横向2格块；钥匙/锁按可见独立色块计。" },
  82: { histogram: { SINGLE: 6, V2: 5, H2: 4, SQ2: 1, "L型（臂长unclear）": 2 }, shapeTypeCount: "unclear", exactness: "partial_boundary_ambiguity", fullLevel: false, note: "与可见下限18对齐；两处同色连片无法从静态图确认臂长/内部边界；数字冰块分开。" },
  83: { histogram: { SQ2: 12 }, exactness: "exact_visible", fullLevel: false, note: "与开局可见下限12对齐；钥匙、锁、外壳均按独立SQ2计；上方遮挡仓分开。" },
  84: { histogram: { H2: 2, SINGLE: 5, V2: 2, "红色底部相邻块（具体形状unclear）": 3 }, shapeTypeCount: "unclear", exactness: "partial_boundary_ambiguity", fullLevel: false, note: "与可见下限12对齐；底部相邻红块边界不清，未强拆为L3/SINGLE；遮挡仓分开。" },
  85: { histogram: { H2: 5, SQ2: 4, L3: 5, V2: 1, SINGLE: 3 }, exactness: "exact_visible", fullLevel: true, note: "开局展示全部18块。" },
  86: { histogram: { V2: 5, H2: 1, SINGLE: 10 }, exactness: "exact_visible", fullLevel: true, note: "开局展示全部16块；钥匙/锁按可见独立色块计。" },
  87: { histogram: { SINGLE: 3, H2: 7, H3: 1 }, exactness: "exact_visible", fullLevel: false, note: "与开局可见块11对齐；数字冰块与生成队列分开。" },
  88: { histogram: { H2: 9, V2: 4, H3: 1, L3: 2, SINGLE: 9, V3: 1 }, exactness: "exact_visible", fullLevel: false, note: "与开局可见块26对齐；生成器队列分开。" },
  89: { histogram: { H2: 5, H3: 1, SQ2: 1, SINGLE: 4 }, exactness: "exact_visible", fullLevel: false, note: "与开局可见下限11对齐；数字冰块、遮挡仓与生成队列分开。" },
  90: { histogram: { T4: 1, L4: 1 }, exactness: "exact_visible", fullLevel: false, note: "与开局可拖块2对齐；左右生成器/计数装置分开。" },
  91: { histogram: { SINGLE: 7, H2: 3, H3: 1, V2: 4, V3: 1, L3: 1 }, exactness: "exact_visible", fullLevel: false, note: "与开局可见下限17对齐；遮挡仓内容分开。" },
  92: { histogram: { H3: 1, H2: 8, SINGLE: 7 }, exactness: "exact_visible", fullLevel: false, note: "与开局可见下限16对齐；H3为红色外壳块；下方遮挡仓内容分开。" },
  93: { histogram: { H2: 2, V2: 4, SINGLE: 6, L3: 2 }, exactness: "exact_visible", fullLevel: false, note: "与开局可见下限14对齐；左侧遮挡仓内容分开。" },
  94: { histogram: { H2: 2, V2: 2, SINGLE: 8 }, exactness: "exact_visible", fullLevel: false, note: "与开局可见下限12对齐；钥匙/锁计入；遮挡仓内容分开。" },
  95: { histogram: { SINGLE: 14, V2: 1, H3: 2 }, exactness: "partial_count_discrepancy", fullLevel: false, note: "逐块视觉计数17，与主表可见下限16相差1；静态图无可靠合并边界；下方遮挡仓内容分开。" },
  96: { histogram: { H2: 6, L3: 4, V3: 1, SINGLE: 12, V2: 6, SQ2: 1 }, exactness: "exact_visible", fullLevel: false, note: "与开局可拖块30对齐；数字冰块分开；箭头块按其外轮廓计。" },
  97: { histogram: { SINGLE: 13, H2: 3, H3: 4, V2: 5, T4: 1, L3: 3 }, exactness: "exact_visible", fullLevel: true, note: "开局展示全部29块；钥匙/锁按可见独立块计。" },
  98: { histogram: { V2: 5, SQ2: 1, H2: 1, SINGLE: 2, L3: 1 }, exactness: "exact_visible", fullLevel: false, note: "与开局可见下限10对齐；数字冰块与遮挡仓分开；可见外壳按外形计。" },
  99: { histogram: { SINGLE: 2, T4: 1, V2: 5, L3: 1, H2: 2, SQ2: 1 }, exactness: "exact_visible", fullLevel: false, note: "与开局可见下限12对齐；T4为红色锁块；遮挡仓内容分开。" },
  100: { histogram: { SQ2: 12 }, exactness: "exact_visible", fullLevel: true, note: "开局展示全部12块；图案仅改变表面，不改变SQ2形状。" },
};

const sumHistogram = (histogram) =>
  Object.values(histogram).reduce((sum, value) => sum + value, 0);

const levels = Array.from({ length: 100 }, (_, index) => {
  const level = index + 1;
  const exact = FULL_LEVEL_EXACT_L1_10[level];
  const reviewed = SCREENSHOT_VISIBLE_SHAPES[level];

  if (exact) {
    const visible = OPENING_VISIBLE_OVERRIDE_L1_10[level] ?? exact;
    return {
      level,
      visible_shape_histogram: visible,
      visible_shape_type_count: Object.keys(visible).length,
      counted_visible_blocks: sumHistogram(visible),
      visible_shape_exactness: "exact_full_level",
      full_level_shape_histogram: exact,
      full_level_shape_type_count: Object.keys(exact).length,
      evidence: [
        "tools/verify-chapter-one-competitor-match.mjs",
        "playtest-results/experiments/lv1-10-competitor-composition/lv1-10-final-audit.json",
      ],
      note: "Lv1–10由连续视频与正式竞品构成核验确认。",
    };
  }

  if (reviewed) {
    return {
      level,
      visible_shape_histogram: reviewed.histogram,
      visible_shape_type_count: reviewed.shapeTypeCount ?? Object.keys(reviewed.histogram).length,
      counted_visible_blocks: sumHistogram(reviewed.histogram),
      visible_shape_exactness: reviewed.exactness,
      full_level_shape_histogram: reviewed.fullLevel ? reviewed.histogram : "unclear",
      full_level_shape_type_count: reviewed.fullLevel
        ? Object.keys(reviewed.histogram).length
        : "unclear",
      evidence: [
        `references/imported/blockout-100-level-images-2026-09-04/crops100/level${String(level).padStart(3, "0")}.png`,
      ],
      note: reviewed.note,
    };
  }

  return {
    level,
    visible_shape_histogram: "unclear",
    visible_shape_type_count: "unclear",
    counted_visible_blocks: "unclear",
    visible_shape_exactness: "unclear_pending_manual_review",
    full_level_shape_histogram: "unclear",
    full_level_shape_type_count: "unclear",
    evidence: [
      `references/imported/blockout-100-level-images-2026-09-04/crops100/level${String(level).padStart(3, "0")}.png`,
    ],
    note: "尚未完成人工逐图形状复核。",
  };
});

for (const entry of levels) {
  if (entry.visible_shape_histogram !== "unclear") {
    if (sumHistogram(entry.visible_shape_histogram) !== entry.counted_visible_blocks) {
      throw new Error(`Lv${entry.level} visible shape histogram count mismatch`);
    }
    if (
      typeof entry.visible_shape_type_count === "number" &&
      Object.keys(entry.visible_shape_histogram).length !== entry.visible_shape_type_count
    ) {
      throw new Error(`Lv${entry.level} visible shape type count mismatch`);
    }
  }
  if (entry.full_level_shape_histogram !== "unclear") {
    if (Object.keys(entry.full_level_shape_histogram).length !== entry.full_level_shape_type_count) {
      throw new Error(`Lv${entry.level} full-level shape type count mismatch`);
    }
  }
}

const output = {
  title: "Block Out! 竞品 Lv1–100 色块形状证据审计",
  generated_on: "2026-09-11",
  status: "evidence_audit_not_level_design",
  counting_scope: {
    visible_shape_histogram: "仅统计开局截图中可见且边界可辨识的独立色块",
    full_level_shape_histogram: "只有连续视频或无隐藏/生成且开局即展示全部色块时才填写",
    exclusions: ["数字冰块内容不清晰时", "生成器尚未出现的队列", "遮挡仓后不可见内容"],
    unknown_policy: "无法确认一律写unclear，不推测",
  },
  shape_legend: {
    SINGLE: "1×1单格",
    H2: "横向1×2骨牌",
    V2: "纵向2×1骨牌",
    H3: "横向1×3长条",
    V3: "纵向3×1长条",
    SQ2: "2×2方块",
    SQ3: "3×3方块",
    L3: "3格L形",
    T4: "4格T形",
    L4: "4格L形",
    CROSS5: "5格十字形",
  },
  levels,
};

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(OUTPUT);
