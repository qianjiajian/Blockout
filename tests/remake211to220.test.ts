import { describe, expect, it } from "vitest";
import { evaluateLevelStars, levelClearLoad, timeTargetForLevel } from "../src/core/levelStarConditions";
import { PuzzleModel } from "../src/core/PuzzleModel";
import { replayRevisedRoute, type RevisedSearchDrag } from "../src/core/revisedLevelSearch";
import {
  ACTIVE_REMAKE211TO220_VARIANT,
  BASE_REMADE_211_220_LEVELS,
  MAX_REGENERATION_ATTEMPTS_211_220,
  REMADE_211_220_LEVELS,
  REMAKE211TO220_VARIANT_SEQUENCE,
} from "../src/core/rejected211to220Rim";
import type { LevelSpec, Point, Side } from "../src/core/types";

const bands = {
  easy: [5, 10], normal: [11, 15], hard: [16, 20], super: [21, 30],
} as const;

const edge = (level: LevelSpec, suffix: string, exitSide: Side): RevisedSearchDrag => ({
  blockId: `l${level.id}-${suffix}`, path: [], exitSide,
});

const inner = (block: LevelSpec["blocks"][number]): RevisedSearchDrag => ({
  blockId: block.id,
  path: Array.from({ length: block.x }, (_, index) => [block.x - index - 1, block.y] as Point),
  exitSide: "left",
});

const routeFor = (level: LevelSpec): RevisedSearchDrag[] => {
  const drags: RevisedSearchDrag[] = [
    edge(level, "edge-2", "right"), edge(level, "edge-3", "right"),
    edge(level, "edge-6", "left"), edge(level, "edge-7", "left"),
    edge(level, "hidden-red", "top"), edge(level, "hidden-purple", "bottom"),
    edge(level, "hidden-orange", "bottom"), edge(level, "hidden-pink", "left"),
  ];
  for (let row = 1; row <= 5; row += 1) {
    drags.push(...level.blocks
      .filter((block) => block.id.startsWith(`l${level.id}-inner-`) && block.y === row)
      .sort((left, right) => left.x - right.x)
      .map(inner));
    if (row === 1) {
      drags.push(edge(level, "edge-0", "top"), edge(level, "edge-1", "top"));
    }
  }
  drags.push(edge(level, "edge-4", "bottom"), edge(level, "edge-5", "bottom"));
  return drags;
};

const openingCoverage = (level: LevelSpec): { covered: number; overlaps: number; uncovered: number } => {
  const model = new PuzzleModel(level);
  const snapshot = model.snapshot();
  const occupied = new Map<string, string>();
  let overlaps = 0;
  const add = (x: number, y: number, owner: string): void => {
    const key = `${x},${y}`;
    if (occupied.has(key)) overlaps += 1;
    else occupied.set(key, owner);
  };
  const shutters = new Map(snapshot.shutters.map((shutter) => [shutter.id, shutter]));
  for (const block of snapshot.blocks) {
    const shutter = block.shutterId ? shutters.get(block.shutterId) : undefined;
    if (shutter && shutter.revealed !== true) continue;
    for (const [dx, dy] of block.shape) add(block.x + dx, block.y + dy, block.id);
  }
  for (const shutter of snapshot.shutters) {
    if (shutter.revealed === true) continue;
    for (let y = shutter.y; y < shutter.y + shutter.height; y += 1) {
      for (let x = shutter.x; x < shutter.x + shutter.width; x += 1) add(x, y, shutter.id);
    }
  }
  const playable = new Set(snapshot.playable.map(([x, y]) => `${x},${y}`));
  const uncovered = [...playable].filter((cell) => !occupied.has(cell)).length;
  return { covered: [...occupied.keys()].filter((cell) => playable.has(cell)).length, overlaps, uncovered };
};

describe("rejected rim layouts: structural checks do not certify difficulty", () => {
  it("uses a finite color/shape regeneration policy after bound failure", () => {
    expect(REMAKE211TO220_VARIANT_SEQUENCE).toEqual(["base", "palette-shape-v2", "palette-shape-v3"]);
    expect(MAX_REGENERATION_ATTEMPTS_211_220).toBe(3);
    expect(ACTIVE_REMAKE211TO220_VARIANT).toBe("palette-shape-v3");
    const base = BASE_REMADE_211_220_LEVELS[1];
    const regenerated = REMADE_211_220_LEVELS[1];
    expect(regenerated.blocks.map((block) => block.color)).not.toEqual(base.blocks.map((block) => block.color));
    expect(regenerated.blocks.filter((block) => block.id.includes("inner-")).every((block) => block.movementAxis === "horizontal")).toBe(true);
    expect(regenerated.mechanismAdaptation?.change).toContain("有限重生成=palette-shape-v3");
  });

  it("uses the latest ten-level difficulty wave and independent star targets", () => {
    expect(REMADE_211_220_LEVELS.map((level) => level.id)).toEqual([211, 212, 213, 214, 215, 216, 217, 218, 219, 220]);
    expect(REMADE_211_220_LEVELS.map((level) => level.difficulty)).toEqual([
      "easy", "normal", "normal", "hard", "easy", "normal", "hard", "easy", "normal", "super",
    ]);
    expect(REMADE_211_220_LEVELS.map((level) => level.designTargets?.minimumRepositionOverhead)).toEqual(
      [5, 11, 12, 16, 6, 13, 17, 7, 14, 21],
    );
    expect(REMADE_211_220_LEVELS.map((level) => level.preservedMoveTarget)).toEqual(
      [32, 34, 36, 42, 45, 48, 52, 58, 62, 68],
    );
    for (const level of REMADE_211_220_LEVELS) {
      const [min, max] = bands[level.difficulty as keyof typeof bands];
      expect(level.mechanismRules).toBe("revised-2026-09-27-v1.5");
      expect(level.designTargets?.minimumRepositionOverhead).toBeGreaterThanOrEqual(min);
      expect(level.designTargets?.minimumRepositionOverhead).toBeLessThanOrEqual(max);
      expect(level.preservedMoveTarget).toBeGreaterThan(levelClearLoad(level));
    }
  });

  it.each(REMADE_211_220_LEVELS.map((level) => [level] as const))(
    "fills the opening and hidden rim cohorts for Lv%i",
    (level) => {
      const coverage = openingCoverage(level);
      expect(coverage).toEqual({ covered: 49, overlaps: 0, uncovered: 0 });
      expect(level.shutters).toHaveLength(4);
      for (const shutter of level.shutters ?? []) {
        const hidden = level.blocks.filter((block) => block.shutterId === shutter.id);
        expect(hidden).toHaveLength(1);
        const cells = hidden.flatMap((block) => block.shape.map(([x, y]) => [block.x + x, block.y + y].join(",")));
        const region = Array.from({ length: shutter.height }, (_, dy) => Array.from({ length: shutter.width }, (_, dx) => `${shutter.x + dx},${shutter.y + dy}`)).flat();
        expect(new Set(cells)).toEqual(new Set(region));
      }
    },
  );

  it.each(REMADE_211_220_LEVELS.map((level) => [level] as const))(
    "constructively disproves the required difficulty for rejected Lv%i",
    (level) => {
      const replay = replayRevisedRoute(level, routeFor(level));
      expect(replay.valid).toBe(true);
      expect(replay.complete).toBe(true);
      expect(replay.nonClearingDrags).toBe(0);
      expect(replay.nonClearingDrags).toBeLessThan(bands[level.difficulty as keyof typeof bands][0]);
      expect(replay.clearEvents).toBe(level.blocks.length);
    },
  );

  it.each(REMADE_211_220_LEVELS.map((level) => [level] as const))(
    "settles the authored three-star move boundary for Lv%i",
    (level) => {
      const target = level.preservedMoveTarget!;
      const timeTarget = timeTargetForLevel(level);
      expect(evaluateLevelStars(level, { moves: target, elapsedSeconds: timeTarget }).earnedStars).toBe(3);
      expect(evaluateLevelStars(level, { moves: target + 1, elapsedSeconds: timeTarget }).moveAchieved).toBe(false);
    },
  );
});

