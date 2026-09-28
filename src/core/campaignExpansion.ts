import { COLORS, MAX_BLOCK_LAYERS, type BlockColor, type GatePortalSpec, type GateSpec, type LevelSpec, type Point, type Side } from "./types";
import { boardParForLevel, boardShapeForLevel } from "./boardShapes";
import { fillEnclosedBoardVoids } from "./boardTopology";
import { applyCompetitiveComposition } from "./campaignComposition";
import { applyStrategyLayoutOverride } from "./campaignStrategyLayouts";
import { applyDifficultyBandOverride } from "./campaignDifficultyOverrides";
import { assertFrozenBlockShapes, normalizeFrozenBlockShapes } from "./blockShape";
import { gateCoversExitFrontier } from "./blockExitFrontier";
import {
  gatePortalMouthCells,
  mirrorGatePortalHorizontally,
  mirrorGatePortalVertically,
  portalTangentOffset,
  rotateGatePortalClockwise,
} from "./gatePortals";

type TransformKind = "identity" | "mirror-x" | "mirror-y" | "rotate-180" | "rotate-90" | "rotate-270" | "transpose";

interface ExpansionRecipe {
  id: number;
  name: string;
  sourceId: number;
  transform: TransformKind;
  colorShift: number;
  difficulty: LevelSpec["difficulty"];
  timeSeconds: number;
  reward: number;
}

const CHAPTER_NAMES = [
  ["新手教程", "转角校准", "四色罗盘", "双向分流", "轻装复盘", "冰块初试", "冰门换轨", "外壳侧泊", "双线预判", "冰块初醒"],
  ["冻域排序", "窄道融霜", "四门冰链", "暖舱缓冲", "外壳回顾", "双色接力", "冰层换向", "棱镜岔路", "换色预判", "换色考核"],
  ["外壳复习", "壳后接力", "双门调度", "隐藏航道", "中段整备", "多向穿梭", "冰路并行", "双区分流", "深舱迷阵", "联合考核"],
  ["外环试航", "交错航线", "狭道换向", "冰门突围", "生成器初启", "补给接力", "棱镜接力", "高压舱室", "环线封锁", "航道核心"],
  ["冻域初巡", "融冰岔路", "霜门序列", "寒潮高墙", "暖舱整备", "双冰接力", "冻层折返", "冰层夹击", "极寒回路", "升降台初见"],
  ["棱镜热身", "双色折线", "双层转运", "换色禁区", "光谱休整", "多层接力", "棱镜冰锁", "三向换色", "棱镜迷舱", "光谱核心"],
  ["工坊巡检", "单舱调度", "生成分流", "暗舱开启", "机械休整", "生成接力", "隐藏冰块", "双室倒计", "多层迷城", "传送带初启"],
  ["熔芯试航", "热区折返", "冰火次序", "熔芯封锁", "冷却窗口", "多门联动", "换色熔炉", "双帘热浪", "核心回转", "熔芯中枢"],
  ["量子校准", "镜像航道", "错位出口", "量子高墙", "稳定窗口", "多层跃迁", "冻结矩阵", "双帘叠态", "迷阵收束", "量子核心"],
  ["终局热身", "百门前哨", "全色调度", "极限冻层", "决战调度", "双层总线", "双层总控", "全域封锁", "最终回路", "星标总控"],
] as const;

const SOURCE_LEVELS = [
  // Chapter 1 begins with five movement/routing boards. Lv6–10 reuse these
  // silhouettes as the approved solver-verified hard ramp.
  [1, 2, 116, 124, 125, 5, 126, 127, 128, 8],
  // New mechanics get one quiet teaching board, but ordinary stages no longer
  // fall back to zero-decision direct clearing.
  [105, 129, 127, 128, 10, 104, 130, 127, 107, 108],
  [103, 106, 122, 108, 104, 107, 107, 108, 103, 108],
  [104, 122, 107, 108, 106, 107, 108, 107, 108, 107],
  [122, 107, 108, 107, 101, 107, 108, 107, 108, 107],
  [107, 122, 108, 107, 105, 108, 107, 108, 107, 111],
  [122, 107, 108, 107, 123, 108, 107, 108, 107, 112],
  [107, 122, 108, 107, 122, 108, 107, 108, 107, 113],
  [122, 107, 108, 107, 121, 108, 107, 108, 107, 114],
  [107, 122, 108, 107, 119, 108, 107, 108, 107, 115],
] as const;

const TRANSFORMS: TransformKind[] = [
  "identity",
  "mirror-x",
  "rotate-90",
  "mirror-y",
  "transpose",
  "rotate-180",
  "rotate-270",
];

const DIFFICULTY_WAVE: LevelSpec["difficulty"][] = [
  "normal", "hard", "hard", "super", "normal", "hard", "hard", "super", "super", "super",
];

const OPENING_WAVES: LevelSpec["difficulty"][][] = [
  ["normal", "normal", "normal", "normal", "normal", "normal", "normal", "normal", "normal", "normal"],
  ["normal", "hard", "hard", "hard", "normal", "hard", "hard", "hard", "super", "hard"],
  ["normal", "hard", "hard", "super", "normal", "hard", "hard", "super", "super", "super"],
];

const TIME_BY_DIFFICULTY: Record<LevelSpec["difficulty"], number> = {
  easy: 180,
  normal: 180,
  hard: 150,
  super: 120,
};

// Per-level think-time exceptions preserve the authored board and difficulty
// while correcting a measured interaction-duration outlier. Lv68's validated
// route leaves only ~33 seconds at 120s; 150s restores the 40–45s player buffer
// without changing its blocks, devices, solution, or three-star target.
export const LEVEL_TIME_OVERRIDES: Partial<Record<number, number>> = {
  68: 150,
};

// These are display/timer calibrations applied only after board construction.
// Keeping them out of the recipe preserves the validated blocks, layer load,
// devices and solution while making the promise to the player truthful.
export const LEVEL_DIFFICULTY_OVERRIDES: Partial<Record<number, LevelSpec["difficulty"]>> = {
  6: "hard",
  7: "hard",
  8: "hard",
  9: "hard",
  10: "hard",
  86: "super",
  95: "hard",
};

const SIGNATURE_PAD_LEVELS = new Set([
  4, 5, 6, 8, 13, 14, 18, 21, 26, 30, 34, 37, 39, 40, 41, 43, 44, 45, 46, 64, 66,
  67, 71, 73, 75, 77, 83, 84, 87, 88, 91, 93, 96, 97, 98, 99,
]);
const SIGNATURE_TALL_LEVELS = new Set([66]);
const ELEVATOR_LEVELS = new Set([50, 54, 58, 60, 64, 68, 72, 76, 80, 85, 90, 95, 100]);
const CONVEYOR_LEVELS = new Set([70, 74, 78, 80, 84, 88, 90, 94, 98, 100]);
export const STRATEGY_FOCUS_LEVELS: Readonly<Record<number, Readonly<{ blockId: string; afterMoves: number }>>> = {
  60: { blockId: "yellow-load", afterMoves: 8 },
  70: { blockId: "yellow-load", afterMoves: 4 },
  78: { blockId: "green-open", afterMoves: 8 },
  80: { blockId: "blue-load", afterMoves: 8 },
  88: { blockId: "composition-88-6", afterMoves: 8 },
  90: { blockId: "green-load", afterMoves: 8 },
  98: { blockId: "composition-98-4", afterMoves: 6 },
};
export const STRATEGY_RESCUE_NUDGES: Readonly<Record<number, Readonly<{ blockId: string; from: readonly [number, number]; path: readonly (readonly [number, number])[]; afterMoves: number }>>> = {
  60: { blockId: "yellow-load", from: [4, 0], path: [[5, 0]], afterMoves: 10 },
  70: { blockId: "yellow-load", from: [0, 1], path: [[0, 2]], afterMoves: 6 },
  78: { blockId: "green-open", from: [6, 2], path: [[6, 1], [6, 0], [7, 0], [8, 0]], afterMoves: 10 },
  80: { blockId: "blue-load", from: [8, 0], path: [[8, 1], [8, 2]], afterMoves: 10 },
  88: { blockId: "composition-88-6", from: [1, 6], path: [[0, 6]], afterMoves: 10 },
  90: { blockId: "green-load", from: [6, 0], path: [[5, 0]], afterMoves: 10 },
  98: { blockId: "composition-98-4", from: [0, 5], path: [[0, 6]], afterMoves: 8 },
};
const LOW_PRESSURE_MECHANIC_INTROS = new Set([35, 50, 70]);
const CHAPTER_CLEAR_LOAD_FLOORS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
const TWO_ROUTE_SUPER_LEVELS = new Set([38, 40, 44, 48, 54, 59, 64, 69, 74, 79, 84, 89, 94, 99]);

// These coordinates were authored from reversible one-cell in-board scrambles.
// Keeping the result as data avoids shipping a layout search in the game boot.
const BOTTLENECK_POSITION_OVERRIDES: Record<number, Record<string, readonly [number, number]>> = {
  10: { "yellow-a": [3, 0], "red-ice": [0, 4], "blue-ice": [3, 2], "green-ice": [3, 4] },
  37: { "green-open": [3, 1] },
  39: { "cyan-open": [4, 0], "green-open": [4, 2], "pink-open": [6, 2], "red-target": [8, 2] },
  43: { "cyan-open": [3, 6] },
  47: { "cyan-open": [6, 5], "green-open": [3, 6] },
  49: { "cyan-open": [4, 3], "green-open": [2, 4], "pink-open": [2, 2], "red-target": [0, 1] },
  53: { "cyan-open": [1, 2], "green-open": [4, 2] },
  56: { "green-open": [6, 5] },
  58: { "cyan-open": [6, 4], "green-open": [6, 2], "pink-open": [8, 4], "red-target": [7, 0] },
  63: { "cyan-open": [6, 5] },
  66: { "cyan-open": [2, 5], "pink-open": [3, 7] },
  68: { "cyan-open": [6, 4], "green-open": [6, 6], "pink-open": [8, 5], "red-target": [8, 8] },
  73: { "green-open": [2, 5] },
  76: { "green-open": [5, 1] },
  78: { "cyan-open": [4, 5], "green-open": [6, 2], "pink-open": [4, 3], "red-target": [8, 2] },
  83: { "cyan-open": [6, 1], "green-open": [3, 2], "pink-open": [6, 3] },
  86: { "cyan-open": [6, 5] },
  88: { "cyan-open": [8, 8], "green-open": [6, 8], "pink-open": [6, 6], "red-target": [6, 4] },
  93: { "green-open": [3, 7] },
  96: { "green-open": [2, 5] },
  98: { "cyan-open": [2, 2], "green-open": [4, 3], "pink-open": [2, 4], "red-target": [0, 3] },
};

// Generator art is rendered without distortion, so an elongated logical cover
// would leave transparent-looking cells that still collide. Level 63 exposed
// that mismatch directly beside its opening L piece. Keep the generator and
// its hidden cargo inside the same visible 4 x 4 chamber so every uncovered
// grid cell behaves like floor.
const GENERATOR_FOOTPRINT_OVERRIDES: Record<number, {
  shutter: { id: string; x: number; y: number; width: number; height: number };
  cargo: Record<string, readonly [number, number]>;
}> = {
  63: {
    shutter: { id: "shutter-a", x: 0, y: 2, width: 4, height: 4 },
    cargo: {
      "blue-load": [0, 2],
      "red-target": [2, 2],
      "yellow-load": [0, 4],
      "orange-target": [2, 4],
    },
  },
};

const sourceVariantCounts = new Map<number, number>();

const withoutShutterLink = (block: LevelSpec["blocks"][number]): LevelSpec["blocks"][number] => {
  const { shutterId: _shutterId, ...rest } = block;
  return rest;
};

const blockFootprint = (block: LevelSpec["blocks"][number]): { width: number; height: number } => ({
  width: Math.max(...block.shape.map(([x]) => x)) + 1,
  height: Math.max(...block.shape.map(([, y]) => y)) + 1,
});

const placementFitsGate = (
  level: LevelSpec,
  block: LevelSpec["blocks"][number],
  gate: LevelSpec["gates"][number],
  x: number,
  y: number,
): boolean => {
  const cells = block.shape.map(([dx, dy]) => [x + dx, y + dy] as const);
  return gateCoversExitFrontier(level, cells, gate);
};

const reachableGateColorsForBlock = (level: LevelSpec, block: LevelSpec["blocks"][number]): BlockColor[] => {
  const playable = new Set((level.playable ?? []).map(([x, y]) => `${x},${y}`));
  const canPlace = (x: number, y: number): boolean => block.shape.every(([dx, dy]) => playable.has(`${x + dx},${y + dy}`));
  if (!canPlace(block.x, block.y)) return [];
  const queue: Point[] = [[block.x, block.y]];
  const visited = new Set([`${block.x},${block.y}`]);
  const colors = new Set<BlockColor>();
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const [x, y] = queue[cursor];
    for (const gate of level.gates) {
      if (placementFitsGate(level, block, gate, x, y)) colors.add(gate.color);
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nextX = x + dx;
      const nextY = y + dy;
      const key = `${nextX},${nextY}`;
      if (visited.has(key) || !canPlace(nextX, nextY)) continue;
      visited.add(key);
      queue.push([nextX, nextY]);
    }
  }
  return [...colors];
};

const clearLoad = (level: LevelSpec): number => level.blocks
  .reduce((sum, block) => sum + (block.layers?.length ?? 1), 0);

const progressiveClearLoadTarget = (input: LevelSpec): number | undefined => {
  if (input.id < 21) return undefined;
  const chapter = Math.floor((input.id - 1) / 10);
  const currentLoad = clearLoad(input);
  let targetLoad = CHAPTER_CLEAR_LOAD_FLOORS[chapter] + (input.difficulty === "super" ? 1 : 0);
  if (input.id % 10 === 5) targetLoad -= 1;
  if (LOW_PRESSURE_MECHANIC_INTROS.has(input.id)) targetLoad = Math.min(targetLoad, currentLoad + 1);
  if (input.id === 100) targetLoad = 13;
  return targetLoad;
};

const applyProgressiveClearLoad = (
  input: LevelSpec,
  requestedTargetLoad = progressiveClearLoadTarget(input),
  adjustPar = true,
): LevelSpec => {
  if (requestedTargetLoad === undefined) return input;
  const currentLoad = clearLoad(input);
  const targetLoad = requestedTargetLoad;
  if (currentLoad >= targetLoad) return input;

  const level: LevelSpec = {
    ...input,
    blocks: input.blocks.map((block) => ({ ...block, layers: [...(block.layers ?? [block.color])] })),
  };
  const reachableColors = level.blocks.map((block) => reachableGateColorsForBlock(level, block));
  const order = level.blocks.map((_, index) => index);
  const rotation = level.id % Math.max(1, order.length);
  order.push(...order.splice(0, rotation));
  let addedLayers = 0;
  let stalledPasses = 0;
  let cursor = 0;
  while (clearLoad(level) < targetLoad && stalledPasses < order.length) {
    const blockIndex = order[cursor % order.length];
    const block = level.blocks[blockIndex];
    const layers = block.layers ?? [block.color];
    const candidates = reachableColors[blockIndex].filter((color) => color !== layers.at(-1));
    if (layers.length < MAX_BLOCK_LAYERS && candidates.length) {
      const color = candidates[(level.id + blockIndex + layers.length) % candidates.length];
      level.blocks[blockIndex] = { ...block, layers: [...layers, color] };
      addedLayers += 1;
      stalledPasses = 0;
    } else {
      stalledPasses += 1;
    }
    cursor += 1;
  }
  if (adjustPar && addedLayers > 0) level.parMoves = (level.parMoves ?? currentLoad) + addedLayers;
  return level;
};

const deviceLaneFor = (level: LevelSpec, excluded = new Set<string>()): { blockId: string; fromX: number; fromY: number; toX: number; toY: number; width: number; height: number; direction: Side } | undefined => {
  const playable = new Set((level.playable ?? []).map(([x, y]) => `${x},${y}`));
  const occupied = new Set(level.blocks.flatMap((block) => block.shape.map(([dx, dy]) => `${block.x + dx},${block.y + dy}`)));
  const candidates: Array<readonly [number, number, Side]> = [[1, 0, "right"], [-1, 0, "left"], [0, 1, "bottom"], [0, -1, "top"]];
  for (const block of level.blocks) {
    if (excluded.has(block.id) || block.shutterId || (block.frozen ?? 0) > 0) continue;
    const { width, height } = blockFootprint(block);
    const ownCells = new Set(block.shape.map(([sx, sy]) => `${block.x + sx},${block.y + sy}`));
    for (const [dx, dy, direction] of candidates) {
      const toX = block.x + dx;
      const toY = block.y + dy;
      const destinationClear = block.shape.every(([sx, sy]) => {
        const key = `${toX + sx},${toY + sy}`;
        return playable.has(key) && (ownCells.has(key) || !occupied.has(key));
      });
      if (destinationClear) return { blockId: block.id, fromX: block.x, fromY: block.y, toX, toY, width, height, direction };
    }
  }
  return undefined;
};

const blockTouchesMatchingGateMouth = (level: LevelSpec, block: LevelSpec["blocks"][number], x = block.x, y = block.y): boolean => {
  const color = block.layers?.[0] ?? block.color;
  return level.gates.some((gate) => {
    if (gate.color !== color || (block.star && !gate.star)) return false;
    return block.shape.some(([dx, dy]) => {
      const cellX = x + dx;
      const cellY = y + dy;
      if (gate.side === "top") return cellY === 0 && cellX >= gate.offset && cellX < gate.offset + gate.size;
      if (gate.side === "bottom") return cellY === level.height - 1 && cellX >= gate.offset && cellX < gate.offset + gate.size;
      if (gate.side === "left") return cellX === 0 && cellY >= gate.offset && cellY < gate.offset + gate.size;
      return cellX === level.width - 1 && cellY >= gate.offset && cellY < gate.offset + gate.size;
    });
  });
};

const surfaceCounterCargo = (input: LevelSpec): LevelSpec => {
  const generatorIds = new Set((input.shutters ?? [])
    .filter((shutter) => shutter.id !== "belt-shutter" && shutter.count > 0)
    .map((shutter) => shutter.id));
  if (!generatorIds.size) return input;
  const targetVisible = input.difficulty === "super" ? 4 : 3;
  const level: LevelSpec = { ...input, blocks: input.blocks.map((block) => ({ ...block })) };
  const visible = (): LevelSpec["blocks"] => level.blocks.filter((block) => !block.shutterId);
  const hidden = (): LevelSpec["blocks"] => level.blocks.filter((block) => block.shutterId && generatorIds.has(block.shutterId));

  while (visible().length < targetVisible && hidden().length > 2) {
    const cargo = hidden().find((block) => (block.frozen ?? 0) === 0) ?? hidden()[0];
    const occupied = new Set(visible().flatMap((block) => block.shape.map(([dx, dy]) => `${block.x + dx},${block.y + dy}`)));
    const closedCells = new Set<string>();
    for (const shutter of level.shutters ?? []) {
      if (shutter.count <= 0) continue;
      for (let y = shutter.y; y < shutter.y + shutter.height; y += 1) {
        for (let x = shutter.x; x < shutter.x + shutter.width; x += 1) closedCells.add(`${x},${y}`);
      }
    }
    const playable = new Set((level.playable ?? []).map(([x, y]) => `${x},${y}`));
    const destinations: Array<{ x: number; y: number; score: number }> = [];
    for (let y = 0; y < level.height; y += 1) {
      for (let x = 0; x < level.width; x += 1) {
        const cells = cargo.shape.map(([dx, dy]) => [x + dx, y + dy] as const);
        if (!cells.every(([cellX, cellY]) => {
          const key = `${cellX},${cellY}`;
          return playable.has(key) && !occupied.has(key) && !closedCells.has(key);
        })) continue;
        if (blockTouchesMatchingGateMouth(level, cargo, x, y)) continue;
        let contact = 0;
        for (const [cellX, cellY] of cells) {
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            if (occupied.has(`${cellX + dx},${cellY + dy}`)) contact += 1;
          }
        }
        const { width, height } = blockFootprint(cargo);
        const centerDistance = Math.abs(x + width / 2 - level.width / 2) + Math.abs(y + height / 2 - level.height / 2);
        destinations.push({ x, y, score: contact * 30 - centerDistance * 3 + ((x * 7 + y * 11 + level.id) % 9) });
      }
    }
    destinations.sort((a, b) => b.score - a.score || a.y - b.y || a.x - b.x);
    const destination = destinations[0];
    if (!destination) break;
    level.blocks = level.blocks.map((block) => block.id === cargo.id
      ? { ...withoutShutterLink(block), x: destination.x, y: destination.y }
      : block);
  }
  return level;
};

const exposeSecondOpeningRoute = (input: LevelSpec): LevelSpec => {
  if (!TWO_ROUTE_SUPER_LEVELS.has(input.id)) return input;
  const closed = new Set((input.shutters ?? []).filter((shutter) => shutter.count > 0).map((shutter) => shutter.id));
  const activeBlocks = input.blocks
    .filter((block) => (!block.shutterId || !closed.has(block.shutterId)) && (block.frozen ?? 0) === 0)
  const openColors = new Set(input.gates.filter((gate) => (gate.frozen ?? 0) === 0).map((gate) => gate.color));
  const actionable = activeBlocks.filter((block) => openColors.has(block.layers?.[0] ?? block.color)).length;
  if (actionable >= 2) return input;
  const activeColors = new Set(activeBlocks.map((block) => block.layers?.[0] ?? block.color));
  const candidate = input.gates
    .filter((gate) => (gate.frozen ?? 0) > 0 && activeColors.has(gate.color))
    .sort((a, b) => (a.frozen ?? 0) - (b.frozen ?? 0) || a.id.localeCompare(b.id))[0];
  if (!candidate) return input;
  return {
    ...input,
    gates: input.gates.map((gate) => gate.id === candidate.id ? { ...gate, frozen: undefined } : gate),
  };
};

const scrambleMatchingGateStarts = (input: LevelSpec): LevelSpec => {
  if (input.id <= 2) return input;
  const level: LevelSpec = { ...input, blocks: input.blocks.map((block) => ({ ...block, shape: [...block.shape] })) };
  const playable = new Set((level.playable ?? []).map(([x, y]) => `${x},${y}`));
  const shutterCells = new Set<string>();
  for (const shutter of level.shutters ?? []) {
    if (shutter.count <= 0) continue;
    for (let y = shutter.y; y < shutter.y + shutter.height; y += 1) {
      for (let x = shutter.x; x < shutter.x + shutter.width; x += 1) shutterCells.add(`${x},${y}`);
    }
  }

  for (let blockIndex = 0; blockIndex < level.blocks.length; blockIndex += 1) {
    const block = level.blocks[blockIndex];
    if (block.shutterId || !blockTouchesMatchingGateMouth(level, block)) continue;
    const occupied = new Set<string>();
    for (const other of level.blocks) {
      if (other.id === block.id || other.shutterId) continue;
      for (const [dx, dy] of other.shape) occupied.add(`${other.x + dx},${other.y + dy}`);
    }
    const canPlace = (x: number, y: number): boolean => block.shape.every(([dx, dy]) => {
      const key = `${x + dx},${y + dy}`;
      return playable.has(key) && !occupied.has(key) && !shutterCells.has(key);
    });
    const queue: Array<{ x: number; y: number; distance: number }> = [{ x: block.x, y: block.y, distance: 0 }];
    const visited = new Set([`${block.x},${block.y}`]);
    const destinations: Array<{ x: number; y: number; score: number; distance: number }> = [];
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const current = queue[cursor];
      if (!blockTouchesMatchingGateMouth(level, block, current.x, current.y) && current.distance >= 1) {
        const placedCells = new Set(block.shape.map(([dx, dy]) => `${current.x + dx},${current.y + dy}`));
        let contact = 0;
        for (const key of placedCells) {
          const [cellX, cellY] = key.split(",").map(Number);
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            if (occupied.has(`${cellX + dx},${cellY + dy}`)) contact += 1;
          }
        }
        const { width, height } = blockFootprint(block);
        const edgeDepth = Math.min(current.x, current.y, level.width - current.x - width, level.height - current.y - height);
        const gateDistance = Math.min(...level.gates
          .filter((gate) => gate.color === (block.layers?.[0] ?? block.color))
          .map((gate) => gate.side === "top" ? current.y
            : gate.side === "bottom" ? level.height - current.y - height
              : gate.side === "left" ? current.x
                : level.width - current.x - width));
        destinations.push({
          x: current.x,
          y: current.y,
          distance: current.distance,
          score: gateDistance * 20 + contact * 7 + edgeDepth * 4 + Math.min(current.distance, 5),
        });
      }
      if (current.distance >= 6) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const x = current.x + dx;
        const y = current.y + dy;
        const key = `${x},${y}`;
        if (visited.has(key) || !canPlace(x, y)) continue;
        visited.add(key);
        queue.push({ x, y, distance: current.distance + 1 });
      }
    }
    destinations.sort((a, b) => b.score - a.score || b.distance - a.distance || a.y - b.y || a.x - b.x);
    const destination = destinations[0];
    if (destination) level.blocks[blockIndex] = { ...block, x: destination.x, y: destination.y };
  }
  return level;
};

const applyAuthoredBottleneckPositions = (input: LevelSpec): LevelSpec => {
  const positions = BOTTLENECK_POSITION_OVERRIDES[input.id];
  if (!positions) return input;
  return {
    ...input,
    blocks: input.blocks.map((block) => {
      const position = positions[block.id];
      return position ? { ...block, x: position[0], y: position[1] } : block;
    }),
  };
};

const applyGeneratorFootprintOverrides = (input: LevelSpec): LevelSpec => {
  const override = GENERATOR_FOOTPRINT_OVERRIDES[input.id];
  if (!override) return input;
  return {
    ...input,
    shutters: input.shutters?.map((shutter) => shutter.id === override.shutter.id
      ? { ...shutter, ...override.shutter }
      : shutter),
    blocks: input.blocks.map((block) => {
      const position = override.cargo[block.id];
      return position ? { ...block, x: position[0], y: position[1] } : block;
    }),
  };
};

const applyDocumentProgression = (input: LevelSpec): LevelSpec => {
  let level: LevelSpec = {
    ...input,
    gates: input.gates.map((gate) => ({ ...gate })),
    blocks: input.blocks.map((block) => ({ ...block, shape: [...block.shape], layers: block.layers ? [...block.layers] : undefined })),
    shutters: input.shutters?.map((shutter) => ({ ...shutter })),
    featureIntro: undefined,
  };

  // The authored source stays mechanics-free through Lv9; the final
  // solver-verified Lv6–10 ramp adds only its explicitly approved mechanisms.
  if (level.id < 10) {
    level.gates = level.gates.map((gate) => ({ ...gate, frozen: undefined }));
    level.blocks = level.blocks.map((block) => ({ ...withoutShutterLink(block), frozen: undefined, layers: undefined }));
    level.shutters = undefined;
  } else if (level.id < 15) {
    level.blocks = level.blocks.map((block) => ({ ...withoutShutterLink(block), layers: undefined }));
    level.shutters = undefined;
  } else if (level.id < 35) {
    level.blocks = level.blocks.map(withoutShutterLink);
    level.shutters = undefined;
  }

  // From level 35 onward, the same reveal-counter logic uses the generator art
  // until the document's shutter/conveyor beat arrives at level 70.
  if (level.id >= 35 && level.id < 70 && level.shutters?.length) {
    level.shutters = level.shutters.map((shutter) => ({ ...shutter, skin: "generator" }));
  }

  const progressiveTargetLoad = progressiveClearLoadTarget(level);
  level = applyProgressiveClearLoad(level, progressiveTargetLoad);
  const progressiveLoadDeficit = progressiveTargetLoad === undefined
    ? 0
    : Math.max(0, progressiveTargetLoad - clearLoad(level));
  level = surfaceCounterCargo(level);
  level = exposeSecondOpeningRoute(level);
  level = scrambleMatchingGateStarts(level);
  level = applyAuthoredBottleneckPositions(level);
  level = applyCompetitiveComposition(level);
  // Some source boards do not have enough separate pieces to carry their
  // authored clear-load target under the one-extra-shell rule. Once ordinary
  // composition cargo exists, distribute only that unresolved load across it.
  if (progressiveLoadDeficit > 0) {
    level = applyProgressiveClearLoad(level, clearLoad(level) + progressiveLoadDeficit, false);
  }
  level = applyGeneratorFootprintOverrides(level);

  // The first-session hand must follow the current authored puzzle rather than
  // a legacy screen coordinate. This is the first drag of a verified route.
  if (level.id === 1) {
    level.onboardingHint = {
      blockId: "red-a",
      path: [[0, 2], [0, 1], [0, 0]],
    };
  }

  if (ELEVATOR_LEVELS.has(level.id)) {
    const lane = deviceLaneFor(level);
    if (lane) {
      level.elevators = [{
        id: "elevator-intro",
        blockId: lane.blockId,
        fromX: lane.fromX,
        fromY: lane.fromY,
        toX: lane.toX,
        toY: lane.toY,
        width: lane.width,
        height: lane.height,
        periodSeconds: 1.65,
      }];
    }
  }

  if (CONVEYOR_LEVELS.has(level.id)) {
    const elevatorBlockIds = new Set((level.elevators ?? []).map((elevator) => elevator.blockId));
    const lane = deviceLaneFor(level, elevatorBlockIds);
    if (lane) {
      if (level.id === 70) {
        level.blocks = level.blocks.map((block) => block.id === lane.blockId ? { ...block, shutterId: "belt-shutter" } : block);
        level.shutters = [
          ...(level.shutters ?? []),
          { id: "belt-shutter", x: lane.fromX, y: lane.fromY, width: lane.width, height: lane.height, count: 2, skin: "shutter" },
        ];
      }
      level.conveyors = [{
        id: "conveyor-intro",
        blockId: lane.blockId,
        x: Math.min(lane.fromX, lane.toX),
        y: Math.min(lane.fromY, lane.toY),
        width: lane.width + Math.abs(lane.toX - lane.fromX),
        height: lane.height + Math.abs(lane.toY - lane.fromY),
        direction: lane.direction,
      }];
    }
  }

  if (level.id === 91 || level.id === 100) {
    const starBlock = level.blocks.find((block) => (
      (block.layers?.length ?? 1) === 1
      && level.gates.some((gate) => gate.color === (block.layers?.[0] ?? block.color))
    )) ?? level.blocks.find((block) => level.gates.some((gate) => gate.color === (block.layers?.[0] ?? block.color)));
    if (starBlock) {
      level.blocks = level.blocks.map((block) => block.id === starBlock.id ? { ...block, star: true } : block);
      const requiredStarColors = new Set(starBlock.layers ?? [starBlock.color]);
      const markedColors = new Set<BlockColor>();
      level.gates = level.gates.map((gate) => {
        if (requiredStarColors.has(gate.color) && !markedColors.has(gate.color)) {
          markedColors.add(gate.color);
          return { ...gate, star: true };
        }
        return gate;
      });
    }
  }

  // Apply the authored opening scramble after device assignment. The offline
  // search never moves device-carried blocks, so this keeps elevator,
  // conveyor and generator coordinates identical to the verified source state.
  level = applyStrategyLayoutOverride(level);

  // Lv8 already has a two-drag first breakthrough, but first-play evidence
  // shows that its blocker relation is easy to miss. This exposes only the
  // first parking action after three no-clear moves; it does not reveal the
  // following exit or alter the board, blocks, gates, route or par.
  if (level.id === 8) {
    level.strategyNudge = {
      blockId: "blue-load",
      from: [2, 0],
      path: [[3, 0]],
      afterMoves: 3,
    };
  }

  const strategyFocus = STRATEGY_FOCUS_LEVELS[level.id];
  if (strategyFocus) level.strategyFocus = { ...strategyFocus };
  const strategyRescue = STRATEGY_RESCUE_NUDGES[level.id];
  if (strategyRescue) {
    level.strategyNudge = {
      blockId: strategyRescue.blockId,
      from: [...strategyRescue.from],
      path: strategyRescue.path.map(([x, y]) => [x, y]),
      afterMoves: strategyRescue.afterMoves,
    };
  }

  const intros: Partial<Record<number, NonNullable<LevelSpec["featureIntro"]>>> = {
    6: { title: "数字冰块！", description: "数字方块或出口归零前不可用；每次有效清除都会让数字减一。带外壳的方块先送出外壳色。", kind: "ice-block" },
    7: { title: "冰封出口！", description: "每清除一块，所有冰封出口数字减一；归零后对应出口才会开放。", kind: "ice-door" },
    8: { title: "单层外壳！", description: "每个方块最多带一层额外外壳；先匹配外壳色，再按本体颜色送出。", kind: "layer" },
    35: { title: "方块生成器！", description: "每清除一块或剥去一层，生成器数字减一；归零后释放舱内隐藏方块。", kind: "generator" },
    50: { title: "移动升降台！", description: "操作开始后平台按节拍逐格往返；指定载荷对准平台才会随行，拖离即脱离。", kind: "elevator" },
    70: { title: "传送带与卷帘！", description: "每清除一块或剥去一层，带上的指定载荷若无阻便沿箭头推进一格；先让卷帘归零。", kind: "conveyor" },
    91: { title: "星标方块！", description: "带星方块只能从同色星标出口离开；普通同色方块仍可使用星标出口。", kind: "star" },
  };
  level.featureIntro = intros[level.id];
  if (level.featureIntro) {
    level.difficulty = "normal";
    level.timeSeconds = 180;
  }
  return level;
};

export const EXPANSION_RECIPES: ExpansionRecipe[] = CHAPTER_NAMES.flatMap((names, chapter) => (
  names.map((name, beat) => {
    const difficulty = OPENING_WAVES[chapter]?.[beat] ?? DIFFICULTY_WAVE[beat];
    const id = 1 + chapter * 10 + beat;
    const sourceId = SOURCE_LEVELS[chapter][beat];
    const sourceVariant = sourceVariantCounts.get(sourceId) ?? 0;
    sourceVariantCounts.set(sourceId, sourceVariant + 1);
    return {
      id,
      name,
      sourceId,
      // A source may underpin several beats, but each appearance gets a distinct
      // geometry/color pairing. Color shift deliberately never stays at zero so
      // none of the shipping stages is the untouched prototype layout.
      transform: TRANSFORMS[sourceVariant % TRANSFORMS.length],
      colorShift: Math.floor(sourceVariant / TRANSFORMS.length) % (COLORS.length - 1) + 1,
      difficulty,
      timeSeconds: LEVEL_TIME_OVERRIDES[id] ?? TIME_BY_DIFFICULTY[difficulty],
      reward: id === 100 ? 500 : 20 + chapter * 20 + beat * 5,
    };
  })
));

const transformedDimensions = (width: number, height: number, transform: TransformKind): [number, number] => (
  transform === "rotate-90" || transform === "rotate-270" || transform === "transpose"
    ? [height, width]
    : [width, height]
);

const transformPoint = (x: number, y: number, width: number, height: number, transform: TransformKind): Point => {
  if (transform === "mirror-x") return [width - 1 - x, y];
  if (transform === "mirror-y") return [x, height - 1 - y];
  if (transform === "rotate-180") return [width - 1 - x, height - 1 - y];
  if (transform === "rotate-90") return [height - 1 - y, x];
  if (transform === "rotate-270") return [y, width - 1 - x];
  if (transform === "transpose") return [y, x];
  return [x, y];
};

const transformSide = (side: Side, transform: TransformKind): Side => {
  const maps: Record<TransformKind, Record<Side, Side>> = {
    identity: { top: "top", right: "right", bottom: "bottom", left: "left" },
    "mirror-x": { top: "top", right: "left", bottom: "bottom", left: "right" },
    "mirror-y": { top: "bottom", right: "right", bottom: "top", left: "left" },
    "rotate-180": { top: "bottom", right: "left", bottom: "top", left: "right" },
    "rotate-90": { top: "right", right: "bottom", bottom: "left", left: "top" },
    "rotate-270": { top: "left", right: "top", bottom: "right", left: "bottom" },
    transpose: { top: "left", right: "bottom", bottom: "right", left: "top" },
  };
  return maps[transform][side];
};

/**
 * Keep authored local portals attached to their real exposed rails whenever a
 * reusable campaign layout is transformed.  Legacy gates intentionally stay
 * legacy: their derived outer portal still follows the old side/offset path.
 */
const transformPortal = (
  portal: GatePortalSpec,
  width: number,
  height: number,
  transform: TransformKind,
): GatePortalSpec => {
  if (transform === "identity") return { ...portal, origin: [...portal.origin] as Point };
  if (transform === "mirror-x") return mirrorGatePortalHorizontally(portal, width);
  if (transform === "mirror-y") return mirrorGatePortalVertically(portal, height);
  if (transform === "rotate-180") {
    return mirrorGatePortalHorizontally(mirrorGatePortalVertically(portal, height), width);
  }
  if (transform === "rotate-90") return rotateGatePortalClockwise(portal, height);
  if (transform === "rotate-270") {
    return rotateGatePortalClockwise(
      rotateGatePortalClockwise(rotateGatePortalClockwise(portal, height), width),
      height,
    );
  }
  // Transpose is a clockwise quarter turn followed by a horizontal mirror on
  // the rotated board: (x, y) -> (y, x).
  return mirrorGatePortalHorizontally(rotateGatePortalClockwise(portal, height), height);
};

const transformGateGeometry = <T extends GateSpec>(
  gate: T,
  width: number,
  height: number,
  transform: TransformKind,
): T => {
  if (!gate.portals?.length) {
    const side = transformSide(gate.side, transform);
    const cells = gatePortalMouthCells({ width, height }, gate)
      .map(([x, y]) => transformPoint(x, y, width, height, transform));
    const offset = side === "top" || side === "bottom"
      ? Math.min(...cells.map(([x]) => x))
      : Math.min(...cells.map(([, y]) => y));
    return { ...gate, side, offset };
  }
  const portals = gate.portals.map((portal) => transformPortal(portal, width, height, transform));
  const first = portals[0]!;
  return {
    ...gate,
    side: first.side,
    offset: portalTangentOffset(first),
    size: first.size,
    portals,
  };
};

const rotateColor = (color: BlockColor, shift: number): BlockColor => {
  const index = COLORS.indexOf(color);
  return COLORS[(index + shift) % COLORS.length];
};

const transformPlacement = (
  x: number,
  y: number,
  shape: Point[],
  width: number,
  height: number,
  transform: TransformKind,
): { x: number; y: number; shape: Point[] } => {
  const cells = shape.map(([dx, dy]) => transformPoint(x + dx, y + dy, width, height, transform));
  const minX = Math.min(...cells.map(([cellX]) => cellX));
  const minY = Math.min(...cells.map(([, cellY]) => cellY));
  return {
    x: minX,
    y: minY,
    shape: cells.map(([cellX, cellY]) => [cellX - minX, cellY - minY] as const),
  };
};

const campaignPlayable = (
  levelId: number,
  width: number,
  height: number,
  gates: LevelSpec["gates"],
  flipDoors: NonNullable<LevelSpec["flipDoors"]>,
  blocks: LevelSpec["blocks"],
  shutters: NonNullable<LevelSpec["shutters"]>,
): Point[] => {
  const floor = new Set((boardShapeForLevel(levelId, width, height) ?? [])
    .filter(([x, y]) => x >= 0 && y >= 0 && x < width && y < height)
    .map(([x, y]) => `${x},${y}`));
  const add = (x: number, y: number): void => { if (x >= 0 && y >= 0 && x < width && y < height) floor.add(`${x},${y}`); };

  // Initial pieces and the physical gate mouths are guaranteed floor. The
  // checked-in silhouette was generated around a formally solved route, so we
  // preserve the authored necks and chambers instead of filling an entire row
  // or column for every gate.
  for (const block of blocks) for (const [dx, dy] of block.shape) add(block.x + dx, block.y + dy);
  for (const gate of [...gates, ...flipDoors]) {
    for (const [x, y] of gatePortalMouthCells({ width, height }, gate)) add(x, y);
  }
  for (const shutter of shutters) {
    for (let y = shutter.y; y < shutter.y + shutter.height; y += 1) {
      for (let x = shutter.x; x < shutter.x + shutter.width; x += 1) add(x, y);
    }
  }
  const rows = fillEnclosedBoardVoids(
    Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => floor.has(`${x},${y}`) ? "#" : ".").join("")),
    width,
    height,
  );
  const playable: Point[] = [];
  rows.forEach((row, y) => [...row].forEach((cell, x) => { if (cell === "#") playable.push([x, y]); }));
  return playable;
};

export const transformLevel = (source: LevelSpec, recipe: ExpansionRecipe): LevelSpec => {
  const [transformedWidth, transformedHeight] = transformedDimensions(source.width, source.height, recipe.transform);
  const width = transformedWidth + (SIGNATURE_PAD_LEVELS.has(recipe.id) ? 1 : 0);
  const height = transformedHeight + (SIGNATURE_TALL_LEVELS.has(recipe.id) ? 1 : 0);
  const gates = source.gates.map((gate) => ({
    ...transformGateGeometry(gate, source.width, source.height, recipe.transform),
    color: rotateColor(gate.color, recipe.colorShift),
  }));
  const flipDoors = source.flipDoors?.map((door) => ({
    ...transformGateGeometry(door, source.width, source.height, recipe.transform),
    color: rotateColor(door.color, recipe.colorShift),
  }));
  const transformedBlocks = source.blocks.map((block) => {
    const placement = transformPlacement(block.x, block.y, block.shape, source.width, source.height, recipe.transform);
    return {
      ...block,
      ...placement,
      color: rotateColor(block.color, recipe.colorShift),
      layers: block.layers?.map((color) => rotateColor(color, recipe.colorShift)),
    };
  });
  const shutters = source.shutters?.map((shutter) => {
    const corners = [
      transformPoint(shutter.x, shutter.y, source.width, source.height, recipe.transform),
      transformPoint(shutter.x + shutter.width - 1, shutter.y, source.width, source.height, recipe.transform),
      transformPoint(shutter.x, shutter.y + shutter.height - 1, source.width, source.height, recipe.transform),
      transformPoint(shutter.x + shutter.width - 1, shutter.y + shutter.height - 1, source.width, source.height, recipe.transform),
    ];
    const minX = Math.min(...corners.map(([x]) => x));
    const maxX = Math.max(...corners.map(([x]) => x));
    const minY = Math.min(...corners.map(([, y]) => y));
    const maxY = Math.max(...corners.map(([, y]) => y));
    return { ...shutter, x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
  });
  const blocks = transformedBlocks;
  const authoredPar = boardParForLevel(recipe.id) ?? source.parMoves;
  const authored = applyDocumentProgression({
    ...source,
    id: recipe.id,
    name: recipe.name,
    difficulty: recipe.difficulty,
    timeSeconds: recipe.timeSeconds,
    reward: recipe.reward,
    parMoves: authoredPar,
    width,
    height,
    playable: campaignPlayable(recipe.id, width, height, gates, flipDoors ?? [], blocks, shutters ?? []),
    // Static interior wall cells conflict with the tray language: every cell
    // inside the visible board must accept movement. Difficulty comes from the
    // outer silhouette, blocks, exits, and temporary mechanic layers instead.
    blocked: [],
    gates,
    flipDoors,
    blocks,
    shutters,
    featureIntro: undefined,
  });
  const difficultyAdjusted = applyDifficultyBandOverride(authored);
  const invalidLayers = difficultyAdjusted.blocks.find((block) => (
    block.layers !== undefined && (block.layers.length < 1 || block.layers.length > MAX_BLOCK_LAYERS)
  ));
  if (invalidLayers) {
    throw new Error(
      `Lv${recipe.id} block ${invalidLayers.id} must have 1-${MAX_BLOCK_LAYERS} clear stages (at most one extra shell)`,
    );
  }
  const frozenShapeAdjusted = normalizeFrozenBlockShapes(difficultyAdjusted);
  assertFrozenBlockShapes(frozenShapeAdjusted);
  const difficulty = LEVEL_DIFFICULTY_OVERRIDES[recipe.id] ?? frozenShapeAdjusted.difficulty;
  return {
    ...frozenShapeAdjusted,
    difficulty,
    timeSeconds: LEVEL_TIME_OVERRIDES[recipe.id] ?? TIME_BY_DIFFICULTY[difficulty],
  };
};

export const buildExtendedLevels = (baseLevels: LevelSpec[]): LevelSpec[] => EXPANSION_RECIPES.map((recipe) => {
  const source = baseLevels.find((level) => level.id === recipe.sourceId);
  if (!source) throw new Error(`Missing expansion source level ${recipe.sourceId}`);
  return transformLevel(source, recipe);
});
