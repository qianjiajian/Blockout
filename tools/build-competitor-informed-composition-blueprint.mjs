import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDir, "..");
const boardSourceRelative = "deliverables/original-board-shape-proposal/blockout-original-lv001-lv100-board-shape-proposal.json";
const baselineRelative = "deliverables/level-generation-blueprint/blockout-lv001-lv100-generation-blueprint-v1.json";
const competitorRelative = "deliverables/competitor-level-relations/blockout-lv001-lv100-level-records.json";
const outputDir = resolve(root, "deliverables/level-generation-blueprint");
const outputBase = "blockout-lv001-lv100-competitor-informed-composition-v2";

const [boardSource, baseline, competitor] = await Promise.all([
  readFile(resolve(root, boardSourceRelative), "utf8").then(JSON.parse),
  readFile(resolve(root, baselineRelative), "utf8").then(JSON.parse),
  readFile(resolve(root, competitorRelative), "utf8").then(JSON.parse),
]);

if (boardSource.levels.length !== 100 || baseline.levels.length !== 100 || competitor.length !== 100) {
  throw new Error("Expected exactly 100 board, baseline, and competitor records.");
}

const SHAPES = {
  "1x1": { label: "1×1方块", area: 1, family: "rectangle" },
  "1x2": { label: "1×2竖条", area: 2, family: "rectangle" },
  "2x1": { label: "2×1横条", area: 2, family: "rectangle" },
  "1x3": { label: "1×3竖条", area: 3, family: "rectangle" },
  "3x1": { label: "3×1横条", area: 3, family: "rectangle" },
  "2x2": { label: "2×2方块", area: 4, family: "rectangle" },
  "2x3": { label: "2×3竖矩形", area: 6, family: "rectangle" },
  "3x2": { label: "3×2横矩形", area: 6, family: "rectangle" },
  "3x3": { label: "3×3方块", area: 9, family: "rectangle" },
  "L3": { label: "L形三格块", area: 3, family: "irregular" },
  "T4": { label: "T形四格块", area: 4, family: "irregular" },
};

const EARLY_OPENING_COUNTS = [
  2, 7, 6, 18, 14, 13, 16, 18, 10, 9,
  17, 12, 16, 18, 10, 18, 20, 16, 22, 12,
];

const EARLY_COLORS = [
  2, 4, 5, 6, 4, 4, 3, 4, 5, 5,
  5, 4, 6, 4, 5, 5, 5, 5, 6, 5,
];

const LATE_COLORS = [
  [4, 5, 5, 6, 5, 4, 5, 6, 5, 6],
  [4, 5, 5, 6, 4, 4, 5, 5, 6, 5],
  [4, 5, 5, 6, 4, 5, 5, 4, 6, 4],
  [5, 4, 5, 5, 4, 5, 4, 6, 5, 5],
  [4, 5, 5, 6, 4, 5, 4, 5, 5, 4],
  [5, 5, 5, 4, 5, 4, 5, 6, 5, 5],
  [6, 5, 4, 5, 4, 6, 4, 5, 5, 5],
  [4, 4, 5, 5, 4, 5, 6, 5, 7, 8],
];

const CHAPTER_COUNT_RANGES = [
  [2, 18],
  [10, 22],
  [9, 18],
  [7, 18],
  [9, 18],
  [10, 19],
  [9, 19],
  [10, 20],
  [11, 20],
  [12, 22],
];

const PROFILE_BY_WAVE_POSITION = {
  1: { id: "reorientation", name: "峰后重认", occupancy: 0.62, meanArea: 3.05, weights: [0.15, 0.30, 0.20, 0.25, 0.10] },
  2: { id: "density", name: "密度强化", occupancy: 0.68, meanArea: 2.60, weights: [0.30, 0.35, 0.20, 0.15, 0.00] },
  3: { id: "routing", name: "路径变体", occupancy: 0.66, meanArea: 3.15, weights: [0.10, 0.25, 0.35, 0.20, 0.10] },
  4: { id: "pre_peak", name: "峰前预演", occupancy: 0.72, meanArea: 3.35, weights: [0.10, 0.25, 0.30, 0.25, 0.10] },
  5: { id: "peak", name: "五关峰值", occupancy: 0.75, meanArea: 3.75, weights: [0.05, 0.20, 0.25, 0.30, 0.20] },
};

const EARLY_PROFILES = {
  1: { id: "tutorial", name: "新手拖动教程", occupancy: 0.32 },
  2: { id: "shape_intro", name: "异形块辨识", occupancy: 0.68 },
  3: { id: "same_shape_intro", name: "同形阵列辨识", occupancy: 0.75 },
  4: { id: "small_block_density", name: "小块密度变化", occupancy: 0.64 },
};

const COLOR_NAMES = ["红色", "蓝色", "绿色", "黄色", "紫色", "橙色", "粉色", "青色"];

const THEME_LEVELS = new Map([
  [9, { id: "2x2_array", name: "2×2同形阵列", dominant: "2x2" }],
  [12, { id: "tri_bar_array", name: "三格条阵列", dominant: "tri" }],
  [25, { id: "2x2_array", name: "2×2同形阵列", dominant: "2x2" }],
  [42, { id: "domino_array", name: "二格条阵列", dominant: "domino" }],
  [55, { id: "2x2_array", name: "2×2同形阵列", dominant: "2x2" }],
  [60, { id: "tri_bar_array", name: "三格条阵列", dominant: "tri" }],
  [76, { id: "domino_array", name: "二格条阵列", dominant: "domino" }],
  [86, { id: "2x2_array", name: "2×2同形阵列", dominant: "2x2" }],
  [100, { id: "large_rectangle_array", name: "大矩形终局阵列", dominant: "large" }],
]);

const MANUAL_SHAPES = new Map([
  [1, { "2x2": 2 }],
  [2, { L3: 1, T4: 1, "1x2": 1, "2x1": 1, "2x2": 3 }],
  [3, { "2x2": 6 }],
  [4, { "1x1": 8, "1x2": 3, "2x1": 3, "1x3": 2, "3x1": 2 }],
  [9, { "2x2": 10 }],
  [12, { "1x3": 6, "3x1": 6 }],
]);

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const wavePosition = (level) => ((level - 1) % 5) + 1;
const profileFor = (level) => EARLY_PROFILES[level] ?? PROFILE_BY_WAVE_POSITION[wavePosition(level)];

function colorCount(level) {
  if (level <= 20) return EARLY_COLORS[level - 1];
  const decade = Math.floor((level - 21) / 10);
  return LATE_COLORS[decade][(level - 21) % 10];
}

function colorPalette(level, count) {
  if (level === 1) return ["红色", "蓝色"];
  const offset = (level * 3 + Math.floor(level / 5)) % COLOR_NAMES.length;
  return Array.from({ length: count }, (_, index) => COLOR_NAMES[(offset + index) % COLOR_NAMES.length]);
}

function plannedOpeningCount(level, board) {
  if (level <= 20) return EARLY_OPENING_COUNTS[level - 1];
  const milestoneOpeningCounts = { 35: 8, 50: 9, 70: 9, 91: 10 };
  if (milestoneOpeningCounts[level]) return milestoneOpeningCounts[level];
  const profile = profileFor(level);
  const [minCount, maxCount] = CHAPTER_COUNT_RANGES[Math.floor((level - 1) / 10)];
  const emptyFloor = Math.max(8, Math.ceil(board.playable_cell_count * 0.18));
  const occupiedTarget = Math.min(
    Math.round(board.playable_cell_count * profile.occupancy),
    board.playable_cell_count - emptyFloor,
  );
  let count = Math.round(occupiedTarget / profile.meanArea);
  if (board.component_count > 1) count -= 1;
  return clamp(count, minCount, maxCount);
}

function item(type, name, count, parameters = null) {
  return { type, name, count, parameters };
}

function mechanismPlan(level, openingCount, colors) {
  const mechanisms = [item("color_exit", "颜色出口", colors)];
  let hiddenBlockCount = 0;
  const addGate = (count) => mechanisms.push(item("frozen_exit", "冰门", Math.min(colors, count)));
  const addIce = (count, variant = null) => mechanisms.push(item("numeric_ice", "数字冰块", Math.min(openingCount, count), variant ? { variant } : null));
  const addShell = (count) => mechanisms.push(item("single_shell", "单层外壳", Math.min(openingCount, count), { extra_layers_per_block: 1 }));
  const addShutter = (count, hidden) => {
    mechanisms.push(item("shutter", "卷帘", count, { hidden_block_count: hidden }));
    hiddenBlockCount += hidden;
  };
  const addGenerator = (count, hidden) => {
    mechanisms.push(item("generator", "生成器", count, { queued_block_count: hidden }));
    hiddenBlockCount += hidden;
  };
  const addElevator = (count) => mechanisms.push(item("elevator", "移动升降台", count, { carried_block_count: count }));
  const addConveyor = (count) => mechanisms.push(item("conveyor", "传送带", count, { carried_block_count: count }));
  const addStar = (blocks, gates) => {
    mechanisms.push(item("star_block", "星标块", Math.min(openingCount, blocks)));
    mechanisms.push(item("star_gate", "星门", Math.min(colors, gates)));
  };

  if (level === 2) mechanisms.push(item("irregular_block", "异形色块", 2));
  if (level === 6) addGate(1);
  if (level === 7) addGate(2);
  if (level === 8) addGate(2);
  if (level === 9) addGate(3);
  if (level === 10) { addGate(2); addIce(3); }
  if (level === 11) { addGate(2); addIce(4); }
  if (level === 12) { addGate(1); addIce(3); }
  if (level === 13) { addGate(2); addIce(4); }
  if (level === 14) { addGate(1); addIce(1, "large_ice_frame_visual_variant"); }
  if (level === 15) addShell(2);
  if (level === 16) { addGate(2); addShell(1); }
  if (level === 17) { addGate(2); addIce(4); addShell(3); }
  if (level === 18) { addGate(1); addIce(3); }
  if (level === 19) { addGate(2); addIce(4); addShell(3); }
  if (level === 20) addShutter(1, 4);

  const pos = wavePosition(level);
  if (level >= 21 && level <= 34) {
    if (pos === 1) { addShutter(1, 3); addShell(1); }
    if (pos === 2) { addGate(2); addIce(3); }
    if (pos === 3) { addGate(1); addShell(2); }
    if (pos === 4) { addShutter(1, level >= 29 ? 4 : 3); addIce(2); }
    if (pos === 5) { addGate(2); addIce(3); addShell(3); }
  }

  if (level === 35) addGenerator(1, 4);
  if (level >= 36 && level <= 49) {
    if (pos === 1) { addGenerator(1, 3); addShell(1); }
    if (pos === 2) { addGate(2); addIce(3); }
    if (pos === 3) { addShutter(1, 3); addShell(2); }
    if (pos === 4) { addGenerator(1, 4); addGate(2); }
    if (pos === 5) { addGenerator(1, 4); addGate(2); addIce(3); addShell(2); }
  }

  if (level === 50) addElevator(1);
  if (level >= 51 && level <= 69) {
    if (pos === 1) { addElevator(1); addShell(2); }
    if (pos === 2) { addGate(2); addIce(3); }
    if (pos === 3) { addGenerator(1, 3); addElevator(1); addShell(2); }
    if (pos === 4) { addShutter(1, 3); addGate(2); addIce(2); }
    if (pos === 5) { addElevator(level >= 60 ? 2 : 1); addGate(2); addIce(4); addShell(3); }
  }

  if (level === 70) { addConveyor(1); addShutter(1, 4); }
  if (level >= 71 && level <= 90) {
    if (pos === 1) { addConveyor(1); addShutter(1, 4); addGate(2); }
    if (pos === 2) { addElevator(1); addIce(3); addShell(2); }
    if (pos === 3) { addGenerator(1, 4); addGate(2); }
    if (pos === 4) { addConveyor(1); addShutter(1, 3); addIce(3); addShell(2); }
    if (pos === 5) { addElevator(1); addGate(3); addIce(4); addShell(3); }
  }

  if (level === 91) addStar(2, 1);
  if (level === 92) { addStar(3, 2); addGate(2); addIce(3); }
  if (level === 93) { addStar(3, 2); addGenerator(1, 4); addShell(2); }
  if (level === 94) { addStar(3, 2); addConveyor(1); addShutter(1, 3); }
  if (level === 95) { addStar(4, 2); addElevator(1); addShell(3); }
  if (level === 96) { addStar(4, 2); addGate(2); addIce(4); }
  if (level === 97) { addStar(4, 3); addGenerator(1, 5); addShell(3); }
  if (level === 98) { addStar(4, 2); addConveyor(1); addShutter(1, 4); }
  if (level === 99) { addStar(5, 3); addGate(3); addIce(4); addShell(4); }
  if (level === 100) { addStar(5, 3); addConveyor(2); addShutter(2, 6); }

  return { mechanisms, hiddenBlockCount };
}

function allowedShapeIds(level, board) {
  const ids = ["1x1", "1x2", "2x1", "1x3", "3x1", "2x2"];
  const minimumDimension = Math.min(board.rows, board.cols);
  if (board.playable_cell_count >= 55 && minimumDimension >= 6) ids.push("2x3", "3x2");
  if (
    board.playable_cell_count >= 80
    && minimumDimension >= 9
    && board.component_count === 1
    && boardSource.levels[level - 1].shape.pressure === 1
    && wavePosition(level) === 5
  ) ids.push("3x3");
  return ids;
}

function weightMap(level, board, allowedIds) {
  const profile = profileFor(level);
  const [single, domino, tri, square, large] = profile.weights;
  const horizontalBias = board.cols > board.rows
    ? 0.66
    : board.rows > board.cols
      ? 0.34
      : (Math.floor((level - 1) / 5) % 2 === 0 ? 0.60 : 0.40);
  const weights = {
    "1x1": single,
    "1x2": domino * (1 - horizontalBias),
    "2x1": domino * horizontalBias,
    "1x3": tri * (1 - horizontalBias),
    "3x1": tri * horizontalBias,
    "2x2": square,
    "2x3": large * (1 - horizontalBias),
    "3x2": large * horizontalBias,
    "3x3": 0.03,
  };
  const theme = THEME_LEVELS.get(level);
  if (theme?.dominant === "2x2") {
    Object.assign(weights, { "1x1": 0.05, "1x2": 0.05, "2x1": 0.05, "1x3": 0.04, "3x1": 0.04, "2x2": 0.70, "2x3": 0.035, "3x2": 0.035, "3x3": 0.01 });
  }
  if (theme?.dominant === "domino") {
    Object.assign(weights, { "1x1": 0.08, "1x2": 0.35, "2x1": 0.35, "1x3": 0.05, "3x1": 0.05, "2x2": 0.08, "2x3": 0.02, "3x2": 0.02, "3x3": 0.00 });
  }
  if (theme?.dominant === "tri") {
    Object.assign(weights, { "1x1": 0.05, "1x2": 0.05, "2x1": 0.05, "1x3": 0.35, "3x1": 0.35, "2x2": 0.10, "2x3": 0.025, "3x2": 0.025, "3x3": 0.00 });
  }
  if (theme?.dominant === "large") {
    Object.assign(weights, { "1x1": 0.03, "1x2": 0.06, "2x1": 0.06, "1x3": 0.08, "3x1": 0.08, "2x2": 0.24, "2x3": 0.20, "3x2": 0.20, "3x3": 0.05 });
  }
  const filtered = Object.fromEntries(allowedIds.map((id) => [id, Math.max(0.001, weights[id] ?? 0.001)]));
  const sum = Object.values(filtered).reduce((total, value) => total + value, 0);
  return Object.fromEntries(Object.entries(filtered).map(([id, value]) => [id, value / sum]));
}

function optimizeShapeCounts(level, board, blockCount, targetArea) {
  const manual = MANUAL_SHAPES.get(level);
  if (manual) return manual;
  const allowedIds = allowedShapeIds(level, board);
  const weights = weightMap(level, board, allowedIds);
  const theme = THEME_LEVELS.get(level);
  const sameTypeCap = theme ? Math.ceil(blockCount * 0.75) : Math.max(1, Math.floor(blockCount * 0.45));
  let states = new Map([["0|0", { penalty: 0, counts: {} }]]);
  for (const id of allowedIds) {
    const target = weights[id] * blockCount;
    const maxByKind = id === "3x3"
      ? 1
      : ["2x3", "3x2"].includes(id)
        ? Math.min(2, sameTypeCap)
        : sameTypeCap;
    const next = new Map();
    for (const state of states.values()) {
      const used = Object.values(state.counts).reduce((sum, value) => sum + value, 0);
      const usedArea = Object.entries(state.counts).reduce((sum, [shapeId, count]) => sum + SHAPES[shapeId].area * count, 0);
      const maxCount = Math.min(maxByKind, blockCount - used);
      for (let count = 0; count <= maxCount; count += 1) {
        const newUsed = used + count;
        const newArea = usedArea + SHAPES[id].area * count;
        const penalty = state.penalty + ((count - target) ** 2) / (target + 0.5);
        const counts = { ...state.counts, [id]: count };
        const key = `${newUsed}|${newArea}`;
        const existing = next.get(key);
        if (!existing || penalty < existing.penalty) next.set(key, { penalty, counts });
      }
    }
    states = next;
  }
  const candidates = [...states.entries()]
    .filter(([key]) => Number(key.split("|")[0]) === blockCount)
    .map(([key, state]) => {
      const area = Number(key.split("|")[1]);
      const activeTypes = Object.values(state.counts).filter((count) => count > 0).length;
      const preferredVariety = theme ? 2 : wavePosition(level) === 5 ? 4 : 3;
      const varietyPenalty = Math.max(0, preferredVariety - activeTypes) * 8;
      return { ...state, area, score: state.penalty + Math.abs(area - targetArea) * 4 + varietyPenalty };
    })
    .sort((a, b) => a.score - b.score || Math.abs(a.area - targetArea) - Math.abs(b.area - targetArea));
  if (!candidates.length) throw new Error(`No shape mix found for Level ${level}`);
  return Object.fromEntries(Object.entries(candidates[0].counts).filter(([, count]) => count > 0));
}

function hiddenShapeCounts(level, count) {
  const order = level % 2 === 0
    ? ["1x2", "2x1", "1x1", "1x3", "3x1", "2x2"]
    : ["2x1", "1x2", "1x1", "3x1", "1x3", "2x2"];
  const counts = {};
  for (let index = 0; index < count; index += 1) {
    const id = order[index % order.length];
    counts[id] = (counts[id] ?? 0) + 1;
  }
  return counts;
}

function shapeList(counts) {
  return Object.entries(counts).map(([shapeId, count]) => ({
    shape_id: shapeId,
    shape: SHAPES[shapeId].label,
    family: SHAPES[shapeId].family,
    cells_per_block: SHAPES[shapeId].area,
    count,
  }));
}

function occupiedCells(counts) {
  return Object.entries(counts).reduce((sum, [shapeId, count]) => sum + SHAPES[shapeId].area * count, 0);
}

function mechanismText(mechanisms) {
  return mechanisms.map((entry) => {
    if (entry.type === "shutter") return `${entry.name}×${entry.count}（隐藏${entry.parameters.hidden_block_count}）`;
    if (entry.type === "generator") return `${entry.name}×${entry.count}（队列${entry.parameters.queued_block_count}）`;
    if (entry.type === "single_shell") return `${entry.name}×${entry.count}`;
    if (entry.type === "numeric_ice" && entry.parameters?.variant) return `${entry.name}×${entry.count}（大冰框表现）`;
    return `${entry.name}×${entry.count}`;
  }).join("＋");
}

const levels = boardSource.levels.map((sourceLevel, index) => {
  const number = index + 1;
  const board = sourceLevel.board;
  const colors = colorCount(number);
  const openingBlockCount = plannedOpeningCount(number, board);
  const plan = mechanismPlan(number, openingBlockCount, colors);
  const profile = profileFor(number);
  let occupancyTarget = profile.occupancy;
  if (number >= 5 && number <= 10) occupancyTarget = Math.max(occupancyTarget, 0.70 + (number - 5) * 0.01);
  if (board.component_count > 1) occupancyTarget -= 0.03;
  const emptyFloor = Math.max(8, Math.ceil(board.playable_cell_count * 0.18));
  const targetArea = Math.max(
    openingBlockCount,
    Math.min(Math.round(board.playable_cell_count * occupancyTarget), board.playable_cell_count - emptyFloor),
  );
  const openingShapeCounts = optimizeShapeCounts(number, board, openingBlockCount, targetArea);
  const hiddenShapeCountMap = hiddenShapeCounts(number, plan.hiddenBlockCount);
  const openingArea = occupiedCells(openingShapeCounts);
  const shellCount = plan.mechanisms.find((entry) => entry.type === "single_shell")?.count ?? 0;
  const numericIceCount = plan.mechanisms.find((entry) => entry.type === "numeric_ice")?.count ?? 0;
  const totalBlockCount = openingBlockCount + plan.hiddenBlockCount;
  const baselineLevel = baseline.levels[index];
  return {
    level_id: `Level ${number}`,
    level_number: number,
    status: "proposal_only_awaiting_confirmation",
    composition_applied_to_game: false,
    board_currently_applied_to_game: number <= 10,
    board: {
      rows: board.rows,
      cols: board.cols,
      playable_cell_count: board.playable_cell_count,
      playable_mask: board.playable_mask,
      component_count: board.component_count,
      shape_family: sourceLevel.shape.family,
      shape_name: sourceLevel.shape.name,
      shape_pressure: sourceLevel.shape.pressure,
    },
    retained_difficulty_target: {
      calibrated_score: baselineLevel.difficulty_target.calibrated_score,
      band: baselineLevel.difficulty_target.band,
      curve_role: profile.name,
      status: "target_only_requires_recalculation_after_generation",
    },
    composition_target: {
      profile_id: profile.id,
      profile_name: profile.name,
      same_shape_theme: THEME_LEVELS.get(number) ?? null,
      opening_block_count: openingBlockCount,
      opening_draggable_count: openingBlockCount - numericIceCount,
      hidden_block_count: plan.hiddenBlockCount,
      total_block_count: totalBlockCount,
      opening_color_count: colors,
      opening_colors: colorPalette(number, colors),
      total_stage_color_count: colors,
      opening_shape_mix: shapeList(openingShapeCounts),
      hidden_shape_mix: shapeList(hiddenShapeCountMap),
      opening_occupied_cell_count: openingArea,
      opening_occupied_cell_ratio: Number((openingArea / board.playable_cell_count).toFixed(4)),
      opening_empty_cell_count: board.playable_cell_count - openingArea,
      shell_block_count: shellCount,
      clear_unit_count: totalBlockCount + shellCount,
      mechanisms: plan.mechanisms,
      mechanism_plan_text: mechanismText(plan.mechanisms),
      max_extra_shell_layers_per_block: 1,
    },
    validation_required: {
      exact_packing: true,
      exact_solver: true,
      pointer_replay: true,
      difficulty_recalculation: true,
      minimum_reposition_overhead: number >= 5 && number <= 10 ? 10 : null,
    },
  };
});

const proposedFirstAppearance = {};
for (const level of levels) {
  for (const mechanism of level.composition_target.mechanisms) {
    proposedFirstAppearance[mechanism.type] ??= level.level_number;
  }
}

const expectedFirstAppearance = {
  color_exit: 1,
  irregular_block: 2,
  frozen_exit: 6,
  numeric_ice: 10,
  single_shell: 15,
  shutter: 20,
  generator: 35,
  elevator: 50,
  conveyor: 70,
  star_block: 91,
  star_gate: 91,
};
for (const [type, expected] of Object.entries(expectedFirstAppearance)) {
  if (proposedFirstAppearance[type] !== expected) {
    throw new Error(`${type} first appears at ${proposedFirstAppearance[type]}, expected ${expected}`);
  }
}

for (const level of levels) {
  const totalOpeningShapes = level.composition_target.opening_shape_mix.reduce((sum, shape) => sum + shape.count, 0);
  const totalHiddenShapes = level.composition_target.hidden_shape_mix.reduce((sum, shape) => sum + shape.count, 0);
  if (totalOpeningShapes !== level.composition_target.opening_block_count) throw new Error(`Level ${level.level_number} opening shape count mismatch`);
  if (totalHiddenShapes !== level.composition_target.hidden_block_count) throw new Error(`Level ${level.level_number} hidden shape count mismatch`);
  if (level.composition_target.max_extra_shell_layers_per_block !== 1) throw new Error(`Level ${level.level_number} shell limit mismatch`);
  if (level.composition_target.opening_occupied_cell_count > level.board.playable_cell_count) throw new Error(`Level ${level.level_number} overfills its board`);
}

const competitorFirstAppearance = [
  { type: "color_exit", name: "方向/颜色出口", first_level: 1, evidence: "新版连续Lv1–20视频" },
  { type: "irregular_block", name: "异形色块", first_level: 2, evidence: "新版连续Lv1–20视频" },
  { type: "numbered_edge_gate", name: "数字边栏/冰封出口", first_level: 6, evidence: "新版连续Lv1–20视频" },
  { type: "numbered_ice_block", name: "数字方块/数字冰块", first_level: 10, evidence: "新版连续Lv1–20视频" },
  { type: "ice_frame", name: "大面积冰框表现", first_level: 14, evidence: "新版连续Lv1–20视频", note: "视为数字冰块的面积表现变体，不新增我方独立规则" },
  { type: "nested_shell_block", name: "外壳/Layer Blocks", first_level: 15, evidence: "新版连续Lv1–20视频及Lv14结束解锁弹窗" },
  { type: "countdown_cover", name: "倒计时遮挡仓", first_level: 20, evidence: "新版连续Lv1–20视频" },
  { type: "side_generator", name: "侧边生成/计数装置", first_level: 35, evidence: "2026-06新版Lv1–100逐关截图", note: "静态图只证明装置外观，动态生成规则仍需视频确认" },
  { type: "arrow_block", name: "双向箭头色块", first_level: 50, evidence: "2026-06新版Lv1–100逐关截图", note: "不能直接证明等同于我方移动升降台" },
  { type: "pattern_block", name: "图案色块", first_level: 60, evidence: "2026-06新版Lv1–100逐关截图", note: "Lv50存在分类歧义；Lv60为明确图案阵列" },
  { type: "key_lock", name: "钥匙与锁", first_level: 80, evidence: "2026-06新版Lv1–100逐关截图", note: "我方当前未采用" },
];

const competitorVideoLv1To20 = {
  scope: "本轮两段新版连续视频Lv1–20",
  total_block_count_by_level: [3, 8, 9, 18, 20, 21, 16, 25, 10, 25, 22, 12, 16, 18, 10, 20, 26, 16, 27, 14],
  visible_color_count_by_level: [3, 5, 5, 8, 3, 4, 3, 4, 5, 6, 5, 4, 6, 4, 5, 5, 5, 5, 6, 5],
  shape_rhythm: [
    "稀疏大块教学",
    "异形块与长条混排",
    "2×2同形阵列",
    "三格条＋大量1×1",
    "三格条＋大量1×1",
    "骨牌＋大量1×1",
    "2×2与骨牌混排",
    "大量1×1＋单个3×3",
    "2×2同形阵列回落",
    "小块、三格条、2×2综合",
    "1×1与三格条混排",
    "三格条同形阵列",
    "三格条同形阵列",
    "1×1、骨牌、三格条、3×3混排",
    "2×2同形阵列＋外壳首现",
    "阶梯盘上的1×1与三格条",
    "1×1、骨牌、2×2、三格条综合",
    "骨牌、三格条、3×3混排",
    "1×1、骨牌、2×2综合",
    "横条与竖条混排＋遮挡阶段",
  ],
  transferable_rule: "块数与颜色数不线性上涨；同形阵列和多形混排交替，新机制首现时通过规整盘或降低开局负载隔离认知成本。",
};

const proposedCadence = [
  { ours: "颜色出口", first_level: 1, competitor_reference: "Lv1", relation: "同节奏" },
  { ours: "异形色块", first_level: 2, competitor_reference: "Lv2", relation: "同节奏；后续关卡按竞品当关形状证据决定，不按编号禁用异形" },
  { ours: "冰门", first_level: 6, competitor_reference: "Lv6", relation: "同节奏" },
  { ours: "数字冰块", first_level: 10, competitor_reference: "Lv10", relation: "同节奏；Lv14只做大冰框表现变体" },
  { ours: "单层外壳", first_level: 15, competitor_reference: "Lv15", relation: "同节奏；每块最多额外1层" },
  { ours: "卷帘", first_level: 20, competitor_reference: "Lv20", relation: "同节奏" },
  { ours: "生成器", first_level: 35, competitor_reference: "Lv35侧边装置", relation: "排期参考；具体规则采用我方实现" },
  { ours: "移动升降台", first_level: 50, competitor_reference: "Lv50双向箭头块", relation: "原创适配，不宣称机制等同" },
  { ours: "传送带", first_level: 70, competitor_reference: null, relation: "我方原创排期；竞品Lv1–100无可靠对应" },
  { ours: "星标块与星门", first_level: 91, competitor_reference: null, relation: "我方原创排期；竞品Lv1–100无可靠对应" },
];

const shapeTotals = {};
for (const level of levels) {
  for (const shape of [...level.composition_target.opening_shape_mix, ...level.composition_target.hidden_shape_mix]) {
    shapeTotals[shape.shape] = (shapeTotals[shape.shape] ?? 0) + shape.count;
  }
}

const blueprint = {
  dataset: "Block Out 原创 Lv1–100 竞品规律参考生成蓝图 v2",
  version: "2026-09-09-competitor-informed-composition-v2",
  status: "proposal_only_awaiting_user_confirmation",
  applied_to_game: false,
  scope: "只定义棋盘、色块形状配比、色块数量、颜色数量、机制排期与验证门槛；不含坐标、出口位置、实际解法或运行时关卡写入。",
  source_separation: {
    primary_video_scope: "用户本轮两段新版连续视频，覆盖Lv1–20；用于强证据首现和前期形状/颜色/块数节奏。",
    later_scope: "2026-06新版Lv1–100逐关截图与人工复核表；用于Lv21–100静态外观与装置首见参考。",
    excluded_source: "另一旧版Lv1–20视频（Lv6箭头、Lv10冰门、Lv15冰块）未混入本蓝图。",
  },
  sources: {
    boards: boardSourceRelative,
    retained_difficulty_targets: baselineRelative,
    competitor_records: competitorRelative,
  },
  counting_rules: {
    opening_block_count: "开局棋盘上可见的独立色块总数；数字冰块也算1块。",
    opening_draggable_count: "开局色块数减去尚未解冻的数字冰块数。",
    hidden_block_count: "卷帘或生成器后暂不可见的独立色块，单列且不与开局块重复。",
    total_block_count: "开局块数＋隐藏块数；外壳不另算独立色块。",
    clear_unit_count: "总色块数＋单层外壳数量；数字倒计时、冰门数字不重复计为色块。",
  },
  competitor_video_l1_20_observed: competitorVideoLv1To20,
  competitor_observed_first_appearance: competitorFirstAppearance,
  proposed_mechanism_cadence: proposedCadence,
  hard_constraints: [
    "沿用已整理的100套原创棋盘掩码；本表不改变棋盘坐标。",
    "普通色块逐关参考竞品当关形状族，不按关卡编号限制为方形或长方形；带数字冰冻的色块仍须使用实心条形或矩形。",
    "每个色块最多额外一层外壳。",
    "普通关单一尺寸目标占比不超过45%；每10关最多1个同形主题关，主题关后恢复混排。",
    "Lv10后1×1通常不超过35%；3×3每关最多1个，窄颈与多分区棋盘禁用3×3。",
    "所有数值均为生成目标，不代表已完成摆放或求解。",
    "Lv1–10正式生成后，必须逐关匹配竞品的可玩格总数、形状直方图、色块总数、颜色种类数与机制节奏，并通过精确求解和真实Pointer回放；不再套用旧版‘Lv5–10必要腾挪≥10’约束。",
  ],
  summary: {
    level_count: levels.length,
    opening_block_total: levels.reduce((sum, level) => sum + level.composition_target.opening_block_count, 0),
    hidden_block_total: levels.reduce((sum, level) => sum + level.composition_target.hidden_block_count, 0),
    total_block_total: levels.reduce((sum, level) => sum + level.composition_target.total_block_count, 0),
    clear_unit_total: levels.reduce((sum, level) => sum + level.composition_target.clear_unit_count, 0),
    opening_block_range: {
      min: Math.min(...levels.map((level) => level.composition_target.opening_block_count)),
      max: Math.max(...levels.map((level) => level.composition_target.opening_block_count)),
      average: Number((levels.reduce((sum, level) => sum + level.composition_target.opening_block_count, 0) / levels.length).toFixed(2)),
    },
    color_count_distribution: Object.fromEntries([...new Set(levels.map((level) => level.composition_target.opening_color_count))].sort((a, b) => a - b).map((count) => [count, levels.filter((level) => level.composition_target.opening_color_count === count).length])),
    proposed_first_appearance: proposedFirstAppearance,
    shape_totals: shapeTotals,
    runtime_level_files_changed: false,
  },
  levels,
};

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\r\n]/u.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function compactShapes(shapes) {
  return shapes.map((shape) => `${shape.shape}×${shape.count}`).join("＋") || "无";
}

const csvHeader = [
  "level", "board", "playable_cells", "board_shape", "difficulty_target", "difficulty_band", "profile",
  "opening_shapes", "hidden_shapes", "opening_blocks", "opening_draggable", "hidden_blocks", "total_blocks",
  "colors", "color_palette", "opening_occupied_cells", "opening_occupied_ratio", "shell_blocks", "clear_units", "mechanisms",
  "reposition_overhead_min", "status",
];
const csvRows = levels.map((level) => [
  level.level_number,
  `${level.board.cols}×${level.board.rows}`,
  level.board.playable_cell_count,
  level.board.shape_name,
  level.retained_difficulty_target.calibrated_score,
  level.retained_difficulty_target.band,
  level.composition_target.profile_name,
  compactShapes(level.composition_target.opening_shape_mix),
  compactShapes(level.composition_target.hidden_shape_mix),
  level.composition_target.opening_block_count,
  level.composition_target.opening_draggable_count,
  level.composition_target.hidden_block_count,
  level.composition_target.total_block_count,
  level.composition_target.opening_color_count,
  level.composition_target.opening_colors.join("/"),
  level.composition_target.opening_occupied_cell_count,
  level.composition_target.opening_occupied_cell_ratio,
  level.composition_target.shell_block_count,
  level.composition_target.clear_unit_count,
  level.composition_target.mechanism_plan_text,
  level.validation_required.minimum_reposition_overhead,
  level.status,
]);
const csv = [csvHeader, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n") + "\n";

const markdown = [];
markdown.push("# Block Out 原创 Lv1–100 竞品规律参考生成蓝图 v2", "");
markdown.push("> 状态：仅供确认的生成前数据；未写入实际关卡，未运行摆放器或求解器。", "");
markdown.push("## 机制首现排期", "");
markdown.push("| 我方机制 | 拟首现 | 竞品参考 | 关系 |", "|---|---:|---:|---|");
for (const row of proposedCadence) markdown.push(`| ${row.ours} | Lv${row.first_level} | ${row.competitor_reference ?? "无可靠对应"} | ${row.relation} |`);
markdown.push("", "## 计数口径", "");
for (const [key, value] of Object.entries(blueprint.counting_rules)) markdown.push(`- \`${key}\`：${value}`);
markdown.push("");
for (let start = 1; start <= 100; start += 10) {
  markdown.push(`## Lv${start}–${start + 9}`, "");
  markdown.push("| 关卡 | 棋盘/格数 | 开局形状配比 | 块数（开局/隐藏/总） | 色数 | 机制计划 | 难度目标 |", "|---:|---|---|---:|---:|---|---:|");
  for (const level of levels.slice(start - 1, start + 9)) {
    const hidden = compactShapes(level.composition_target.hidden_shape_mix);
    const shapeText = `${compactShapes(level.composition_target.opening_shape_mix)}${hidden === "无" ? "" : `；隐藏：${hidden}`}`;
    markdown.push(`| ${level.level_number} | ${level.board.cols}×${level.board.rows} / ${level.board.playable_cell_count} | ${shapeText} | ${level.composition_target.opening_block_count}/${level.composition_target.hidden_block_count}/${level.composition_target.total_block_count} | ${level.composition_target.opening_color_count}（${level.composition_target.opening_colors.join("/")}） | ${level.composition_target.mechanism_plan_text} | ${level.retained_difficulty_target.calibrated_score} |`);
  }
  markdown.push("");
}
markdown.push("## 生成前后门槛", "");
for (const rule of blueprint.hard_constraints) markdown.push(`- ${rule}`);
markdown.push("");

await mkdir(outputDir, { recursive: true });
await Promise.all([
  writeFile(resolve(outputDir, `${outputBase}.json`), `${JSON.stringify(blueprint, null, 2)}\n`, "utf8"),
  writeFile(resolve(outputDir, `${outputBase}.csv`), csv, "utf8"),
  writeFile(resolve(outputDir, `${outputBase}.md`), `${markdown.join("\n")}\n`, "utf8"),
]);

console.log(JSON.stringify({
  files: [`${outputBase}.json`, `${outputBase}.csv`, `${outputBase}.md`],
  summary: blueprint.summary,
}, null, 2));
