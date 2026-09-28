// @ts-expect-error Node fixture IO is outside the browser tsconfig.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LEVELS, LEVELS_BEFORE_LEVEL9_ORIGINAL_REMAKE, LEVELS_BEFORE_LEVEL11_ORIGINAL_REMAKE } from "../src/core/levels";
import { applyLevel9OriginalRemake } from "../src/core/level9OriginalRemake";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import { replayRevisedRoute, type RevisedSearchDrag } from "../src/core/revisedLevelSearch";
import { evaluateLevelStars, levelStarTargets } from "../src/core/levelStarConditions";
import { matchFormalBlockShape } from "../src/game/formalBlockShapes";
import type { LevelSpec } from "../src/core/types";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/level9-original-v177.json", import.meta.url), "utf8")) as {
  ruleVersion: string; level: LevelSpec; drags: RevisedSearchDrag[];
};
const before = LEVELS_BEFORE_LEVEL9_ORIGINAL_REMAKE[8]!;
const level = LEVELS[8]!;

describe("Lv9 original silhouette / source ice doors", () => {
  it("adopts the exact independently verified candidate and changes no other final object", () => {
    expect(fixture.ruleVersion).toBe("1.77.0");
    expect(level).toEqual(fixture.level);
    expect(LEVELS).toHaveLength(200);
    for (const [index, old] of LEVELS_BEFORE_LEVEL9_ORIGINAL_REMAKE.entries()) {
      // Verify this repair's own historical boundary, before the authorized Lv11 remake.
      if (old.id !== 9) expect(LEVELS_BEFORE_LEVEL11_ORIGINAL_REMAKE[index]).toBe(old);
    }
    expect(LEVELS[4]).toBe(LEVELS_BEFORE_LEVEL9_ORIGINAL_REMAKE[4]);
    const original = JSON.stringify(before);
    expect(applyLevel9OriginalRemake(before)).toEqual(fixture.level);
    expect(JSON.stringify(before)).toBe(original);
  });

  it("uses a real symmetric, fully covered 8x6 wide-base outline instead of the H board", () => {
    expect(() => validateLevel(level)).not.toThrow();
    expect([level.width, level.height]).toEqual([8, 6]);
    const cells = new Set(level.playable!.map((p) => p.join(",")));
    expect(Array.from({ length: 6 }, (_, y) => Array.from({ length: 8 }, (_, x) => cells.has(`${x},${y}`) ? "#" : ".").join("")))
      .toEqual(["..####..", "..####..", "########", "########", "########", "########"]);
    expect(level.playable!.every(([x, y]) => cells.has(`${7 - x},${y}`))).toBe(true);
    const occupied = level.blocks.flatMap((b) => b.shape.map(([x, y]) => `${b.x + x},${b.y + y}`));
    expect(occupied).toHaveLength(40);
    expect(new Set(occupied)).toEqual(cells);
    expect(level.blocked).toEqual([]);
    expect(level.seams).toEqual([]);
  });

  it("retains ten native squares and source color/ice pairing without adjacent equal colors", () => {
    expect(level.blocks).toHaveLength(10);
    const owners = new Map<string, LevelSpec["blocks"][number]>();
    for (const b of level.blocks) {
      expect(b.shape).toEqual([[0, 0], [1, 0], [0, 1], [1, 1]]);
      expect(matchFormalBlockShape(b.shape, "native-only")?.quarterTurns).toBe(0);
      for (const [dx, dy] of b.shape) owners.set(`${b.x + dx},${b.y + dy}`, b);
    }
    for (const color of ["yellow", "pink", "green", "red", "blue"]) expect(level.blocks.filter((b) => b.color === color)).toHaveLength(2);
    expect(level.gates.map((g) => [g.color, g.frozen ?? 0, g.size])).toEqual([
      ["yellow", 0, 2], ["pink", 2, 2], ["green", 4, 2], ["red", 6, 2], ["blue", 8, 2],
    ]);
    for (const [key, b] of owners) {
      const [x, y] = key.split(",").map(Number);
      for (const neighbor of [`${x! + 1},${y}`, `${x},${y! + 1}`]) {
        const other = owners.get(neighbor);
        if (other && other.id !== b.id) expect(other.color).not.toBe(b.color);
      }
    }
    for (const field of ["shutters", "generators", "flipDoors", "coloredGrids", "elevators", "conveyors"] as const) expect(level[field] ?? []).toEqual([]);
  });

  it("completes the new map in 26 real model drags, all 16 setup moves on multi-cell blocks", () => {
    expect(replayRevisedRoute(level, fixture.drags)).toMatchObject({ valid: true, complete: true, effectiveDrags: 26, nonClearingDrags: 16, clearEvents: 10 });
    const model = new PuzzleModel(level);
    model.startCountdown();
    const clearColors: string[] = [];
    for (const drag of fixture.drags) {
      const color = model.snapshot().blocks.find((b) => b.id === drag.blockId)!.layers[0]!;
      const clearedBefore = model.snapshot().cleared;
      model.beginAction();
      for (const [x, y] of drag.path) expect(model.moveBlockStep(drag.blockId, x, y)).toBe(true);
      if (drag.exitSide) expect(model.tryExit(drag.blockId, drag.exitSide).ok).toBe(true);
      expect(model.commitAction()).toBe(true);
      if (model.snapshot().cleared > clearedBefore) clearColors.push(color);
    }
    expect(clearColors).toEqual(["yellow", "yellow", "pink", "pink", "green", "green", "red", "red", "blue", "blue"]);
    expect(model.snapshot().complete).toBe(true);
  });

  it("changes only the approved star move target and preserves the time and historical reward", () => {
    expect([level.name, level.difficulty, level.timeSeconds, level.reward, level.parMoves])
      .toEqual([before.name, before.difficulty, 105, 60, before.parMoves]);
    expect(level.mechanismRules).toBe("revised-2026-09-23-v1.4");
    expect(level.designTargets).toBeUndefined();
    expect(levelStarTargets(level)).toEqual({ moveTarget: 26, timeTargetSeconds: 75 });
    expect(evaluateLevelStars(level, { moves: 26, elapsedSeconds: 75 }).earnedStars).toBe(3);
    expect(evaluateLevelStars(level, { moves: 27, elapsedSeconds: 75 }).earnedStars).toBe(2);
    expect(evaluateLevelStars(level, { moves: 26, elapsedSeconds: 75.01 }).earnedStars).toBe(2);
  });
});
