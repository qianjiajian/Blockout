import { BOARD_SHAPE_FAMILY_BY_LEVEL } from "./boardShapes";
import { enclosedBoardVoids } from "./boardTopology";
import {
  BLOCK_OUT_DIFFICULTY_BANDS,
  blockOutDifficultyBand,
  calibratedBlockOutDifficulty,
  scoreBlockOutLevel,
  type BlockOutDifficultyBand,
} from "./blockOutDifficulty";
import type { LevelSpec } from "./types";

type DifficultyBandId = BlockOutDifficultyBand["id"] | "tutorial";

export interface LevelDesignEntry {
  id: number;
  name: string;
  difficulty: LevelSpec["difficulty"];
  timeSeconds: number;
  width: number;
  height: number;
  visibleBlocks: number;
  clearLoad: number;
  gates: number;
  parMoves: number;
  calibratedDifficulty: number;
  difficultyBand: DifficultyBandId;
  mechanics: string[];
}

export interface LevelDesignSummary {
  schemaVersion: 3;
  levelCount: number;
  chapterNames: string[][];
  chapterDifficultyWaves: string[];
  chapterMedianClearLoads: number[];
  difficultyCounts: Record<LevelSpec["difficulty"], number>;
  difficultyBandCounts: Record<DifficultyBandId, number>;
  calibratedDifficultyRange: [number, number];
  introductions: Array<{ id: number; kind: string; title: string }>;
  recoveryLevels: Array<{ id: number; name: string }>;
  uniqueNames: number;
  uniqueSilhouettes: number;
  nonRectangularSilhouettes: number;
  shapeFamilies: number;
  permanentBlockedCells: number;
  enclosedVoidLevels: number[];
  visibleBlockRange: [number, number];
  clearLoadRange: [number, number];
  parMoveRange: [number, number];
  levels: LevelDesignEntry[];
}

export interface PointerCampaignEvidence {
  levelsPassed: number;
  pointerGestures: number;
  pointerGridSteps: number;
  maxLevelTestWallClockDurationMs: number;
  level68RemainingSeconds: number;
}

const difficultyShort = (difficulty: LevelSpec["difficulty"]): string => (
  difficulty === "normal" ? "普" : difficulty === "hard" ? "难" : "超"
);

const difficultyLabel = (difficulty: LevelSpec["difficulty"]): string => (
  difficulty === "normal" ? "普通" : difficulty === "hard" ? "困难" : "超级困难"
);

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

const mechanicLabels = (level: LevelSpec): string[] => {
  const labels = new Set<string>();
  if (level.onboardingHint) labels.add("拖动教学");
  if (level.gates.some((gate) => (gate.frozen ?? 0) > 0)) labels.add("冰封出口");
  if (level.blocks.some((block) => (block.frozen ?? 0) > 0)) labels.add("数字冰块");
  if (level.blocks.some((block) => (block.layers?.length ?? 1) > 1)) labels.add("单层外壳");
  if (level.shutters?.some((shutter) => shutter.skin === "generator")) labels.add("生成器");
  if (level.shutters?.some((shutter) => shutter.skin !== "generator")) labels.add("卷帘");
  if (level.elevators?.length) labels.add("升降台");
  if (level.conveyors?.length) labels.add("传送带");
  if (level.blocks.some((block) => block.star) || level.gates.some((gate) => gate.star)) labels.add("星标");
  return labels.size ? [...labels] : ["基础调度"];
};

export const buildLevelDesignSummary = (levels: LevelSpec[]): LevelDesignSummary => {
  if (levels.length !== 100 || levels.some((level, index) => level.id !== index + 1)) {
    throw new Error("Level design summary requires sequential shipping levels 1-100");
  }
  const entries: LevelDesignEntry[] = levels.map((level) => {
    const calibratedDifficulty = calibratedBlockOutDifficulty(scoreBlockOutLevel(level).score);
    const band = blockOutDifficultyBand(calibratedDifficulty);
    const difficultyBand: DifficultyBandId = band?.id
      ?? (level.id === 1 && level.onboardingHint ? "tutorial" : (() => {
        throw new Error(`Level ${level.id} falls outside the shipping difficulty bands`);
      })());
    return {
      id: level.id,
      name: level.name,
      difficulty: level.difficulty,
      timeSeconds: level.timeSeconds,
      width: level.width,
      height: level.height,
      visibleBlocks: level.blocks.filter((block) => !block.shutterId).length,
      clearLoad: level.blocks.reduce((sum, block) => sum + (block.layers?.length ?? 1), 0),
      gates: level.gates.length,
      parMoves: level.parMoves ?? 0,
      calibratedDifficulty,
      difficultyBand,
      mechanics: mechanicLabels(level),
    };
  });
  const silhouettes = levels.map((level) => JSON.stringify({
    width: level.width,
    height: level.height,
    playable: level.playable ?? [],
  }));
  const enclosed = levels.filter((level) => {
    const playable = new Set((level.playable ?? []).map(([x, y]) => `${x},${y}`));
    const rows = Array.from({ length: level.height }, (_, y) => (
      Array.from({ length: level.width }, (__, x) => playable.has(`${x},${y}`) ? "#" : ".").join("")
    ));
    return enclosedBoardVoids(rows, level.width, level.height).length > 0;
  }).map((level) => level.id);
  const visibleCounts = entries.map((entry) => entry.visibleBlocks);
  const clearLoads = entries.map((entry) => entry.clearLoad);
  const parMoves = entries.map((entry) => entry.parMoves);
  const calibratedDifficulties = entries.map((entry) => entry.calibratedDifficulty);
  const chapterEntries = Array.from({ length: 10 }, (_, chapter) => entries.slice(chapter * 10, chapter * 10 + 10));
  const difficultyBandCounts = Object.fromEntries([
    ["tutorial", entries.filter((entry) => entry.difficultyBand === "tutorial").length],
    ...BLOCK_OUT_DIFFICULTY_BANDS.map((band) => [
      band.id,
      entries.filter((entry) => entry.difficultyBand === band.id).length,
    ]),
  ]) as Record<DifficultyBandId, number>;
  return {
    schemaVersion: 3,
    levelCount: levels.length,
    chapterNames: chapterEntries.map((chapter) => chapter.map((entry) => entry.name)),
    chapterDifficultyWaves: chapterEntries.map((chapter) => chapter.map((entry) => difficultyShort(entry.difficulty)).join("→")),
    chapterMedianClearLoads: chapterEntries.map((chapter) => median(chapter.map((entry) => entry.clearLoad))),
    difficultyCounts: {
      normal: entries.filter((entry) => entry.difficulty === "normal").length,
      hard: entries.filter((entry) => entry.difficulty === "hard").length,
      super: entries.filter((entry) => entry.difficulty === "super").length,
    },
    difficultyBandCounts,
    calibratedDifficultyRange: [Math.min(...calibratedDifficulties), Math.max(...calibratedDifficulties)],
    introductions: levels.filter((level) => level.featureIntro).map((level) => ({
      id: level.id,
      kind: level.featureIntro!.kind,
      title: level.featureIntro!.title,
    })),
    recoveryLevels: entries
      .filter((entry) => entry.id % 10 === 5 && entry.difficulty === "normal")
      .map((entry) => ({ id: entry.id, name: entry.name })),
    uniqueNames: new Set(levels.map((level) => level.name)).size,
    uniqueSilhouettes: new Set(silhouettes).size,
    nonRectangularSilhouettes: levels.filter((level) => (level.playable?.length ?? 0) < level.width * level.height).length,
    shapeFamilies: new Set(levels.map((level) => BOARD_SHAPE_FAMILY_BY_LEVEL[level.id])).size,
    permanentBlockedCells: levels.reduce((sum, level) => sum + (level.blocked?.length ?? 0), 0),
    enclosedVoidLevels: enclosed,
    visibleBlockRange: [Math.min(...visibleCounts), Math.max(...visibleCounts)],
    clearLoadRange: [Math.min(...clearLoads), Math.max(...clearLoads)],
    parMoveRange: [Math.min(...parMoves), Math.max(...parMoves)],
    levels: entries,
  };
};

export const buildPointerCampaignEvidence = (input: unknown, levels: LevelSpec[]): PointerCampaignEvidence => {
  if (!input || typeof input !== "object") throw new Error("Latest pointer report is missing or invalid");
  const report = input as Record<string, unknown>;
  const reportLevels = Array.isArray(report.levels) ? report.levels as Array<Record<string, unknown>> : [];
  if (report.levelsPassed !== levels.length || reportLevels.length !== levels.length) {
    throw new Error("Latest pointer report does not cover all current levels");
  }
  reportLevels.forEach((entry, index) => {
    const level = levels[index];
    if (entry.levelId !== level.id || entry.name !== level.name || entry.difficulty !== level.difficulty || entry.parMoves !== level.parMoves) {
      throw new Error(`Latest pointer report drifted at level ${level.id}; rerun the full browser campaign`);
    }
  });
  const level68 = reportLevels[67];
  return {
    levelsPassed: Number(report.levelsPassed),
    pointerGestures: Number(report.pointerGestures),
    pointerGridSteps: Number(report.pointerGridSteps),
    maxLevelTestWallClockDurationMs: Number(report.maxLevelTestWallClockDurationMs),
    level68RemainingSeconds: Number(level68.remainingSeconds),
  };
};

export const renderLevelDesignGeneratedMarkdown = (
  summary: LevelDesignSummary,
  pointer: PointerCampaignEvidence,
): string => {
  const chapterRows = summary.chapterNames.map((names, index) => (
    `| ${index + 1} | ${index * 10 + 1}–${index * 10 + 10} | ${summary.chapterDifficultyWaves[index]} | ${summary.chapterMedianClearLoads[index]} | ${names.join("、")} |`
  ));
  const introRows = summary.introductions.map((intro) => (
    `| ${intro.id} | ${intro.title.replace(/！$/, "")} | \`${intro.kind}\` | 普通 / 180 秒 |`
  ));
  const levelRows = summary.levels.map((level) => {
    const bandLabel = level.difficultyBand === "tutorial"
      ? "教学"
      : BLOCK_OUT_DIFFICULTY_BANDS.find((band) => band.id === level.difficultyBand)?.label;
    return `| ${level.id} | ${level.name} | ${difficultyLabel(level.difficulty)} | ${level.calibratedDifficulty.toFixed(2)} / ${bandLabel} | ${level.timeSeconds} | ${level.width}×${level.height} | ${level.visibleBlocks} / ${level.clearLoad} | ${level.gates} | ${level.parMoves} | ${level.mechanics.join("＋")} |`;
  });
  return [
    "### 当前赛季数据摘要",
    "",
    "| 指标 | 当前值 |",
    "|---|---:|",
    `| 正式关卡 / 唯一名称 / 唯一轮廓 | ${summary.levelCount} / ${summary.uniqueNames} / ${summary.uniqueSilhouettes} |`,
    `| 非矩形轮廓 / 轮廓族 | ${summary.nonRectangularSilhouettes} / ${summary.shapeFamilies} |`,
    `| 普通 / 困难 / 超级困难 | ${summary.difficultyCounts.normal} / ${summary.difficultyCounts.hard} / ${summary.difficultyCounts.super} |`,
    `| 教学例外 / D1 五档（入门 / 普通 / 进阶 / 困难 / 极难） | ${summary.difficultyBandCounts.tutorial} / ${summary.difficultyBandCounts.entry} / ${summary.difficultyBandCounts.normal} / ${summary.difficultyBandCounts.advanced} / ${summary.difficultyBandCounts.hard} / ${summary.difficultyBandCounts.extreme} |`,
    `| D1 校准分范围（含教程） | ${summary.calibratedDifficultyRange[0].toFixed(2)}–${summary.calibratedDifficultyRange[1].toFixed(2)} |`,
    `| 开局可见块范围 / 总清除层范围 | ${summary.visibleBlockRange[0]}–${summary.visibleBlockRange[1]} / ${summary.clearLoadRange[0]}–${summary.clearLoadRange[1]} |`,
    `| 三星步数范围 | ${summary.parMoveRange[0]}–${summary.parMoveRange[1]} |`,
    `| 永久内部障碍格 / 封闭死区关卡 | ${summary.permanentBlockedCells} / ${summary.enclosedVoidLevels.length} |`,
    `| 最新真实 Pointer 通关 | ${pointer.levelsPassed}/100；${pointer.pointerGestures} 次拖拽；${pointer.pointerGridSteps} 个网格步 |`,
    `| 当前时间压力峰值 | Lv68 通关剩余 ${pointer.level68RemainingSeconds.toFixed(2)} 秒 |`,
    "",
    "### 十章名称与实际波形",
    "",
    "“普/难/超”是玩家界面的章节节奏标签；D1 是离线复算的五档难度标尺，两者口径不同。Lv1 按玩家指定参考图保留为五档之外的教学例外；Lv2–100 使用正式五档。清除负载是所有方块层数之和，不等于开局可见块数。",
    "",
    "| 章 | 关卡 | 难度波形 | 清除负载中位数 | 当前正式名称 |",
    "|---:|---:|---|---:|---|",
    ...chapterRows,
    "",
    "### 机制首见",
    "",
    "| 关卡 | 玩家标题 | 数据类型 | 首见压力 |",
    "|---:|---|---|---|",
    ...introRows,
    "",
    `前九章恢复位为：${summary.recoveryLevels.map((level) => `Lv${level.id} ${level.name}`).join("、")}；终章不再插入伪恢复关。`,
    "",
    "### 100 关逐关索引",
    "",
    "“可见/清除”分别表示开局可见方块数与包含外壳、隐藏货物在内的总清除层数。",
    "",
    "| 关卡 | 名称 | 界面难度 | D1 分数/分档 | 秒 | 棋盘 | 可见/清除 | 出口 | 三星步数 | 当前机制 |",
    "|---:|---|---|---:|---:|---:|---:|---:|---:|---|",
    ...levelRows,
  ].join("\n");
};
