import { describe, expect, it } from "vitest";
import { EXPANSION_RECIPES } from "../src/core/campaignExpansion";
import { BOARD_SHAPE_FAMILY_BY_LEVEL, RAW_BOARD_SHAPE_ROWS } from "../src/core/boardShapes";
import { enclosedBoardVoids } from "../src/core/boardTopology";
import { LEVELS, getLevelStrict } from "../src/core/levels";
import { PuzzleModel } from "../src/core/PuzzleModel";

const layoutSignature = (level: (typeof LEVELS)[number]): string => JSON.stringify({
  width: level.width,
  height: level.height,
  playable: level.playable ?? [],
  blocked: level.blocked ?? [],
  gates: level.gates.map((gate) => [gate.side, gate.offset, gate.size, gate.frozen ?? 0]),
  blocks: level.blocks.map((block) => [block.x, block.y, block.shape, block.layers?.length ?? 1, block.frozen ?? 0, block.shutterId ?? ""]),
  shutters: level.shutters ?? [],
});

describe("100-level campaign", () => {
  it("contains exactly 100 newly authored, sequential, unique levels", () => {
    expect(LEVELS).toHaveLength(100);
    expect(LEVELS.map((level) => level.id)).toEqual(Array.from({ length: 100 }, (_, index) => index + 1));
    expect(new Set(LEVELS.map((level) => level.name)).size).toBe(100);
    expect(new Set(LEVELS.map(layoutSignature)).size).toBe(100);
  });

  it("ships a full tutorial tray and 99 distinct strategic silhouettes across thirteen shape families", () => {
    const voidCounts: number[] = [];
    const silhouettes = LEVELS.map((level) => {
      expect(level.playable, `level ${level.id} playable mask`).toBeDefined();
      const cells = new Set((level.playable ?? []).map(([x, y]) => `${x},${y}`));
      const rows = Array.from({ length: level.height }, (_, y) => (
        Array.from({ length: level.width }, (_, x) => cells.has(`${x},${y}`) ? "#" : ".").join("")
      ));
      const voids = level.width * level.height - cells.size;
      voidCounts.push(voids);
      return `${level.width}x${level.height}:${rows.join("/")}`;
    });
    const idsBySilhouette = new Map<string, number[]>();
    silhouettes.forEach((signature, index) => idsBySilhouette.set(signature, [...(idsBySilhouette.get(signature) ?? []), index + 1]));
    const duplicates = [...idsBySilhouette.values()].filter((ids) => ids.length > 1);
    expect(new Set(silhouettes).size, `duplicate silhouettes: ${JSON.stringify(duplicates)}`).toBe(100);
    expect(voidCounts.filter((count) => count > 0).length).toBeGreaterThanOrEqual(90);
    expect(RAW_BOARD_SHAPE_ROWS[1]).toEqual(Array.from({ length: 5 }, () => "#####"));
    expect(BOARD_SHAPE_FAMILY_BY_LEVEL[1]).toBe("tutorial-rectangle");
    expect(new Set(Object.values(BOARD_SHAPE_FAMILY_BY_LEVEL)).size).toBe(13);
  });

  it("keeps every visible tray interior fully movable", () => {
    for (const level of LEVELS) {
      expect(level.blocked ?? [], `level ${level.id} static walls`).toEqual([]);
      const rows = Array.from({ length: level.height }, (_, y) => {
        const playable = new Set((level.playable ?? []).map(([x, cellY]) => `${x},${cellY}`));
        return Array.from({ length: level.width }, (_, x) => playable.has(`${x},${y}`) ? "#" : ".").join("");
      });
      expect(enclosedBoardVoids(rows, level.width, level.height), `level ${level.id} enclosed voids`).toEqual([]);
    }
  });

  it("keeps level 63's visible lower lane open for a long left drag", () => {
    const model = new PuzzleModel(getLevelStrict(63));
    const blockId = "composition-63-5";
    for (const x of [4, 3, 2, 1, 0]) expect(model.moveBlockStep(blockId, x, 6), `left step to x=${x}`).toBe(true);
    expect(model.getBlock(blockId)).toMatchObject({ x: 0, y: 6 });

    const generator = model.snapshot().shutters.find((shutter) => shutter.id === "shutter-a");
    expect(generator).toMatchObject({ x: 0, y: 2, width: 4, height: 4 });
  });

  it("rejects invalid campaign ids instead of wrapping into another level", () => {
    expect(() => getLevelStrict(0)).toThrow(RangeError);
    expect(() => getLevelStrict(101)).toThrow(RangeError);
    expect(() => getLevelStrict(1.5)).toThrow(RangeError);
  });

  it("stages mechanic explanations while preserving the approved early hard ramp", () => {
    expect(LEVELS.filter((level) => level.featureIntro).map((level) => [level.id, level.featureIntro?.kind])).toEqual([
      [6, "ice-block"],
      [7, "ice-door"],
      [8, "layer"],
      [35, "generator"],
      [50, "elevator"],
      [70, "conveyor"],
      [91, "star"],
    ]);
    for (const level of LEVELS.filter((candidate) => candidate.featureIntro)) {
      const expectedDifficulty = level.id <= 8 ? "hard" : "normal";
      expect(level.difficulty).toBe(expectedDifficulty);
      expect(level.timeSeconds).toBe(expectedDifficulty === "hard" ? 150 : 180);
    }
  });

  it("uses a pressure-recovery wave in every ten-level chapter", () => {
    for (let chapter = 0; chapter < 9; chapter += 1) {
      const levels = LEVELS.slice(chapter * 10, chapter * 10 + 10);
      expect(levels[4].difficulty, `chapter ${chapter + 1} recovery`).toBe("normal");
      if (levels[9].featureIntro) expect(levels[9].difficulty, `chapter ${chapter + 1} mechanic lesson`).toBe("normal");
      else expect(levels[9].difficulty, `chapter ${chapter + 1} boss`).not.toBe("normal");
    }
    expect(LEVELS[94]).toMatchObject({ id: 95, difficulty: "hard", timeSeconds: 150 });
    expect(LEVELS[99]).toMatchObject({ id: 100, difficulty: "super", timeSeconds: 120 });
  });

  it("raises the real planning floor instead of only changing timers and labels", () => {
    const clearLoad = (level: (typeof LEVELS)[number]): number => level.blocks
      .reduce((sum, block) => sum + (block.layers?.length ?? 1), 0);
    const overhead = (level: (typeof LEVELS)[number]): number => (level.parMoves ?? 0) - clearLoad(level);
    const dependencies = (level: (typeof LEVELS)[number]): number => (
      level.blocks.filter((block) => (
        (block.frozen ?? 0) > 0 || (block.layers?.length ?? 1) > 1 || Boolean(block.shutterId)
      )).length
      + level.gates.filter((gate) => (gate.frozen ?? 0) > 0).length
      + (level.shutters?.length ?? 0)
      + (level.elevators?.length ?? 0)
      + (level.conveyors?.length ?? 0)
    );
    expect(LEVELS.filter((level) => overhead(level) < 3).map((level) => level.id)).toEqual([1]);
    expect(LEVELS[0]).toMatchObject({ id: 1, name: "新手教程", parMoves: 2 });
    for (const level of LEVELS.filter((candidate) => candidate.difficulty === "super")) {
      expect(overhead(level) >= 2 || dependencies(level) >= 2, `level ${level.id} super planning`).toBe(true);
      expect(dependencies(level), `level ${level.id} super dependencies`).toBeGreaterThanOrEqual(2);
    }

    const chapterMedianLoads = Array.from({ length: 10 }, (_, chapter) => {
      const values = LEVELS.slice(chapter * 10, chapter * 10 + 10).map(clearLoad).sort((a, b) => a - b);
      return (values[4] + values[5]) / 2;
    });
    expect(chapterMedianLoads).toEqual([9.5, 9, 9, 10, 11, 13.5, 13, 15, 15.5, 19]);

    const strategicBosses = LEVELS.filter((level) => level.id >= 20 && level.id % 10 === 0);
    expect(strategicBosses.every((level) => overhead(level) + dependencies(level) >= 2)).toBe(true);
  });

  it("keeps chapter recovery beats varied instead of recycling one easy template", () => {
    const recoveryLevels = LEVELS.filter((level) => level.id % 10 === 5 && level.id < 95);
    const recoveryRecipes = EXPANSION_RECIPES.filter((recipe) => recipe.id % 10 === 5 && recipe.id < 95);
    const mechanicProfile = (level: (typeof LEVELS)[number]): string => JSON.stringify({
      board: [level.width, level.height, level.playable],
      blocks: level.blocks.length,
      clearLoad: level.blocks.reduce((sum, block) => sum + (block.layers?.length ?? 1), 0),
      frozenBlocks: level.blocks.map((block) => block.frozen ?? 0).sort((a, b) => a - b),
      gates: level.gates.length,
      frozenGates: level.gates.map((gate) => gate.frozen ?? 0).sort((a, b) => a - b),
      shutters: (level.shutters ?? []).map((shutter) => shutter.count).sort((a, b) => a - b),
    });

    expect(recoveryLevels).toHaveLength(9);
    expect(recoveryLevels.every((level) => level.difficulty === "normal" && level.timeSeconds === 180)).toBe(true);
    expect(new Set(recoveryRecipes.map((recipe) => recipe.sourceId)).size).toBe(9);
    expect(new Set(recoveryLevels.map(mechanicProfile)).size).toBeGreaterThanOrEqual(8);
  });

});
