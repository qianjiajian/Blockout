// @ts-expect-error Node fixture IO is outside the browser tsconfig.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LEVELS, LEVELS_BEFORE_LEVEL12_ORIGINAL_REMAKE, LEVELS_BEFORE_LEVEL15_ORIGINAL_REMAKE } from "../src/core/levels";
import { applyLevel12OriginalRemake } from "../src/core/level12OriginalRemake";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import { replayRevisedRoute, type RevisedSearchDrag } from "../src/core/revisedLevelSearch";
import { evaluateLevelStars, levelStarTargets } from "../src/core/levelStarConditions";
import { matchFormalBlockShape } from "../src/game/formalBlockShapes";
import type { LevelSpec } from "../src/core/types";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/level12-original-v182.json", import.meta.url), "utf8")) as {
  ruleVersion: string; level: LevelSpec; drags: RevisedSearchDrag[];
};
const before = LEVELS_BEFORE_LEVEL12_ORIGINAL_REMAKE[11]!;
const level = LEVELS[11]!;

describe("Lv12 original stepped tower and source numeric-ice gates", () => {
  it("adopts the exact certified candidate and changes only Lv12", () => {
    expect(fixture.ruleVersion).toBe("1.82.0");
    expect(JSON.parse(JSON.stringify(level))).toEqual(fixture.level);
    expect(LEVELS).toHaveLength(200);
    for (const [index, old] of LEVELS_BEFORE_LEVEL12_ORIGINAL_REMAKE.entries()) {
      if (old.id !== 12) expect(LEVELS_BEFORE_LEVEL15_ORIGINAL_REMAKE[index]).toBe(old);
    }
    const original = JSON.stringify(before);
    expect(JSON.parse(JSON.stringify(applyLevel12OriginalRemake(before)))).toEqual(fixture.level);
    expect(JSON.stringify(before)).toBe(original);
  });

  it("uses a real 36-cell symmetric tower instead of the 42-cell I-shaped board", () => {
    expect(() => validateLevel(level)).not.toThrow();
    expect([level.width, level.height]).toEqual([6, 9]);
    const cells = new Set(level.playable!.map(p => p.join(",")));
    expect(Array.from({ length: 9 }, (_, y) => Array.from({ length: 6 }, (_, x) =>
      cells.has(`${x},${y}`) ? "#" : ".").join("")))
      .toEqual(["..##..", "..##..", "..##..", ".####.", ".####.", ".####.", "######", "######", "######"]);
    expect(level.playable!.every(([x, y]) => cells.has(`${5 - x},${y}`))).toBe(true);
    const occupied = level.blocks.flatMap(b => b.shape.map(([dx, dy]) => `${b.x + dx},${b.y + dy}`));
    expect(occupied).toHaveLength(36);
    expect(new Set(occupied)).toEqual(cells);
    expect(level.playable).toHaveLength(36);
    expect(before.playable).toHaveLength(42);
    expect(level.blocked).toEqual([]);
    expect(level.seams).toEqual([]);
  });

  it("preserves the verified source colors and ice attachments on native V3 artwork", () => {
    expect(level.blocks).toHaveLength(12);
    const owners = new Map<string, LevelSpec["blocks"][number]>();
    for (const b of level.blocks) {
      expect(b.shape).toEqual([[0, 0], [0, 1], [0, 2]]);
      expect(matchFormalBlockShape(b.shape, "native-only")?.quarterTurns).toBe(0);
      for (const [dx, dy] of b.shape) owners.set(`${b.x + dx},${b.y + dy}`, b);
    }
    expect(Object.fromEntries(["red", "yellow", "blue", "green"].map(color =>
      [color, level.blocks.filter(b => b.color === color).length])))
      .toEqual({ red: 4, yellow: 4, blue: 3, green: 1 });
    expect(level.blocks.filter(b => b.frozen).map(b => `${b.color}:${b.frozen}`).sort())
      .toEqual(["blue:1", "blue:2", "green:1", "yellow:2"]);
    expect(level.gates.map(g => [g.color, g.frozen ?? 0, g.size])).toEqual([
      ["red", 0, 1], ["blue", 3, 1], ["yellow", 5, 1], ["green", 5, 3],
    ]);
    for (const [key, b] of owners) {
      const [x, y] = key.split(",").map(Number);
      for (const p of [`${x! + 1},${y}`, `${x},${y! + 1}`]) {
        const other = owners.get(p);
        if (other && other.id !== b.id) expect(other.color).not.toBe(b.color);
      }
    }
    for (const field of ["shutters", "generators", "flipDoors", "coloredGrids", "elevators", "conveyors"] as const)
      expect(level[field] ?? []).toEqual([]);
  });

  it("completes in 28 actual drags with all 16 setup moves on three-cell blocks", () => {
    expect(replayRevisedRoute(level, fixture.drags)).toMatchObject({
      valid: true, complete: true, effectiveDrags: 28, nonClearingDrags: 16, clearEvents: 12,
    });
    const setup = fixture.drags.filter(d => !d.exitSide);
    expect(setup).toHaveLength(16);
    expect(setup.every(d => level.blocks.find(b => b.id === d.blockId)!.shape.length === 3)).toBe(true);
  });

  it("obeys the real source thaw thresholds and first-three-red opening sequence", () => {
    const model = new PuzzleModel(level);
    model.startCountdown();
    const clearColors: string[] = [];
    for (const drag of fixture.drags) {
      const b = model.snapshot().blocks.find(b => b.id === drag.blockId)!;
      const clearedBefore = model.snapshot().cleared;
      model.beginAction();
      for (const [x, y] of drag.path) expect(model.moveBlockStep(drag.blockId, x, y)).toBe(true);
      if (drag.exitSide) expect(model.tryExit(drag.blockId, drag.exitSide).ok).toBe(true);
      expect(model.commitAction()).toBe(true);
      const state = model.snapshot();
      if (state.cleared > clearedBefore) clearColors.push(b.layers[0]!);
      for (const body of state.blocks) {
        const initial = level.blocks.find(old => old.id === body.id)!;
        expect(body.frozen).toBe(Math.max(0, (initial.frozen ?? 0) - state.cleared));
      }
    }
    expect(clearColors.slice(0, 3)).toEqual(["red", "red", "red"]);
    expect(model.snapshot().complete).toBe(true);
  });

  it("applies only the approved actual move target while retaining time and historical reward", () => {
    expect([level.name, level.difficulty, level.timeSeconds, level.reward, level.parMoves])
      .toEqual([before.name, "hard", 120, 45, 21]);
    expect(level.mechanismRules).toBe("revised-2026-09-23-v1.4");
    expect(level.designTargets).toBeUndefined();
    expect(levelStarTargets(before)).toEqual({ moveTarget: 21, timeTargetSeconds: 86 });
    expect(levelStarTargets(level)).toEqual({ moveTarget: 28, timeTargetSeconds: 86 });
    expect(evaluateLevelStars(level, { moves: 28, elapsedSeconds: 86 }).earnedStars).toBe(3);
    expect(evaluateLevelStars(level, { moves: 29, elapsedSeconds: 86 }).earnedStars).toBe(2);
    expect(evaluateLevelStars(level, { moves: 28, elapsedSeconds: 86.01 }).earnedStars).toBe(2);
  });
});
