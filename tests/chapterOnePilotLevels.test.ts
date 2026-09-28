import { describe, expect, it } from "vitest";
import { calibratedBlockOutDifficulty, scoreBlockOutLevel } from "../src/core/blockOutDifficulty";
import { validateLevel } from "../src/core/PuzzleModel";
import {
  CHAPTER_ONE_PILOT_BOARD_SOURCE_SHA256,
  CHAPTER_ONE_PILOT_LEVELS,
  CHAPTER_ONE_PILOT_SOURCE_ORDER,
  CHAPTER_ONE_PILOT_TARGET_DIFFICULTY,
} from "../src/core/chapterOnePilotLevels";
import { EXPANDED_DENSITY_CAMPAIGN_LEVELS } from "../src/core/expandedDensityCampaign";
import { LEVELS } from "../src/core/levels";

const EXPECTED = [
  { id: 1, size: [5, 5], cells: 25, blocks: 3, stages: 3, colors: 3, par: 3, frozenBlocks: 0, frozenGates: 0, shells: 0, shutters: 0 },
  { id: 2, size: [6, 6], cells: 36, blocks: 9, stages: 9, colors: 5, par: 10, frozenBlocks: 0, frozenGates: 0, shells: 0, shutters: 0 },
  { id: 3, size: [5, 7], cells: 35, blocks: 8, stages: 8, colors: 5, par: 9, frozenBlocks: 0, frozenGates: 0, shells: 0, shutters: 0 },
  { id: 4, size: [5, 6], cells: 30, blocks: 18, stages: 18, colors: 8, par: 33, frozenBlocks: 0, frozenGates: 0, shells: 0, shutters: 0 },
  { id: 5, size: [4, 6], cells: 24, blocks: 20, stages: 20, colors: 3, par: 29, frozenBlocks: 0, frozenGates: 0, shells: 0, shutters: 0 },
  { id: 6, size: [5, 5], cells: 25, blocks: 21, stages: 21, colors: 4, par: 27, frozenBlocks: 0, frozenGates: 1, shells: 0, shutters: 0 },
  { id: 7, size: [5, 8], cells: 40, blocks: 16, stages: 16, colors: 3, par: 28, frozenBlocks: 0, frozenGates: 0, shells: 0, shutters: 0 },
  { id: 8, size: [6, 8], cells: 33, blocks: 25, stages: 25, colors: 4, par: 56, frozenBlocks: 0, frozenGates: 0, shells: 0, shutters: 0 },
  { id: 9, size: [6, 8], cells: 40, blocks: 10, stages: 10, colors: 5, par: 20, frozenBlocks: 0, frozenGates: 0, shells: 0, shutters: 0 },
  { id: 10, size: [6, 8], cells: 48, blocks: 25, stages: 25, colors: 6, par: 52, frozenBlocks: 1, frozenGates: 0, shells: 0, shutters: 0 },
] as const;

describe("chapter one pilot levels", () => {
  it("locks the authoritative competitor composition and runtime-safe silhouettes", () => {
    expect(CHAPTER_ONE_PILOT_BOARD_SOURCE_SHA256).toBe("6A464F0FBCBAE72EB82BA63070687CAD606BE27E428D4B50B152A5F504A31B9C");
    expect(CHAPTER_ONE_PILOT_SOURCE_ORDER).toEqual([1, 3, 2, 4, 5, 6, 7, 8, 9, 10]);
    expect(CHAPTER_ONE_PILOT_LEVELS).toHaveLength(10);

    for (const expected of EXPECTED) {
      const level = CHAPTER_ONE_PILOT_LEVELS[expected.id - 1];
      expect(level.id).toBe(expected.id);
      expect([level.width, level.height]).toEqual(expected.size);
      expect(level.playable).toHaveLength(expected.cells);
      expect(level.blocks).toHaveLength(expected.blocks);
      expect(level.blocks.reduce((sum, block) => sum + (block.layers?.length ?? 1), 0)).toBe(expected.stages);
      expect(new Set(level.blocks.flatMap((block) => block.layers ?? [block.color])).size).toBe(expected.colors);
      expect(level.parMoves).toBe(expected.par);
      expect(level.blocks.filter((block) => (block.frozen ?? 0) > 0)).toHaveLength(expected.frozenBlocks);
      expect(level.gates.filter((gate) => (gate.frozen ?? 0) > 0)).toHaveLength(expected.frozenGates);
      expect(level.blocks.filter((block) => (block.layers?.length ?? 1) > 1)).toHaveLength(expected.shells);
      expect(level.shutters ?? []).toHaveLength(expected.shutters);
      expect(() => validateLevel(level)).not.toThrow();
    }

    expect(Object.values(CHAPTER_ONE_PILOT_TARGET_DIFFICULTY)).toEqual([35.29, 57.1, 50.54, 70, 76, 70, 72, 74, 75.5, 77]);
    expect(CHAPTER_ONE_PILOT_LEVELS.map((level) => (
      calibratedBlockOutDifficulty(scoreBlockOutLevel(level).score)
    ))).toEqual([30.87, 54.74, 48.7, 56.34, 60.61, 62.28, 60.07, 62.17, 57.91, 60.7]);
    for (const level of CHAPTER_ONE_PILOT_LEVELS) {
      expect(level.designTargets?.calibratedDifficulty).toBe(
        CHAPTER_ONE_PILOT_TARGET_DIFFICULTY[level.id as keyof typeof CHAPTER_ONE_PILOT_TARGET_DIFFICULTY],
      );
    }
  });

  it("matches the competitor's early frozen-mechanic cadence", () => {
    expect(CHAPTER_ONE_PILOT_LEVELS.filter((level) => level.featureIntro).map((level) => (
      [level.id, level.featureIntro?.kind]
    ))).toEqual([
      [6, "ice-door"],
      [10, "ice-block"],
    ]);
  });

  it("does not introduce shells or shutters in competitor Lv1–10", () => {
    for (const level of CHAPTER_ONE_PILOT_LEVELS) {
      expect(level.blocks.every((block) => !block.layers)).toBe(true);
      expect(level.shutters ?? []).toEqual([]);
      expect(level.gates.some((gate) => (gate.frozen ?? 0) === 0)).toBe(true);
    }
  });

  it("is the exact runtime replacement for Lv1–10", () => {
    expect(LEVELS.slice(0, 10)).toEqual(CHAPTER_ONE_PILOT_LEVELS);
    expect(LEVELS.slice(10, 30)).toEqual(EXPANDED_DENSITY_CAMPAIGN_LEVELS.slice(0, 20));
    expect(LEVELS.slice(40)).toEqual(EXPANDED_DENSITY_CAMPAIGN_LEVELS.slice(30));
  });
});
