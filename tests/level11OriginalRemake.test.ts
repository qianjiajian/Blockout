// @ts-expect-error Node fixture IO is outside the browser tsconfig.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LEVELS, LEVELS_BEFORE_LEVEL11_ORIGINAL_REMAKE, LEVELS_BEFORE_LEVEL12_ORIGINAL_REMAKE } from "../src/core/levels";
import { applyLevel11OriginalRemake } from "../src/core/level11OriginalRemake";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import { replayRevisedRoute, type RevisedSearchDrag } from "../src/core/revisedLevelSearch";
import { evaluateLevelStars, levelStarTargets } from "../src/core/levelStarConditions";
import { matchFormalBlockShape } from "../src/game/formalBlockShapes";
import type { LevelSpec } from "../src/core/types";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/level11-original-v180.json", import.meta.url), "utf8")) as {
  ruleVersion: string; level: LevelSpec; drags: RevisedSearchDrag[];
};
const before = LEVELS_BEFORE_LEVEL11_ORIGINAL_REMAKE[10]!;
const level = LEVELS[10]!;
const inventory = (blocks: LevelSpec["blocks"]) => blocks.map(b =>
  JSON.stringify([b.color, b.shape, b.frozen ?? 0]),
).sort();

describe("Lv11 original outline with the user-approved 12-drag exception", () => {
  it("adopts the verified candidate while preserving the other 199 levels", () => {
    expect(fixture.ruleVersion).toBe("1.80.0");
    expect(JSON.parse(JSON.stringify(level))).toEqual(fixture.level);
    expect(LEVELS).toHaveLength(200);
    for (const [index, old] of LEVELS_BEFORE_LEVEL11_ORIGINAL_REMAKE.entries()) {
      // Keep the Lv11 repair scoped to its boundary before the authorized Lv12 remake.
      if (old.id !== 11) expect(LEVELS_BEFORE_LEVEL12_ORIGINAL_REMAKE[index]).toBe(old);
    }
    const original = JSON.stringify(before);
    expect(JSON.parse(JSON.stringify(applyLevel11OriginalRemake(before)))).toEqual(fixture.level);
    expect(JSON.stringify(before)).toBe(original);
  });

  it("uses a real symmetric 42-cell side-bulge instead of the old rectangle", () => {
    expect(() => validateLevel(level)).not.toThrow();
    expect([level.width, level.height]).toEqual([6, 8]);
    const cells = new Set(level.playable!.map(p => p.join(",")));
    expect(Array.from({ length: 8 }, (_, y) => Array.from({ length: 6 }, (_, x) =>
      cells.has(`${x},${y}`) ? "#" : ".").join("")))
      .toEqual(["###...", "######", "######", "######", "######", "######", "######", "###..."]);
    expect(level.playable!.every(([x, y]) => cells.has(`${x},${7 - y}`))).toBe(true);
    const occupied = level.blocks.flatMap(b => b.shape.map(([dx, dy]) => `${b.x + dx},${b.y + dy}`));
    expect(occupied).toHaveLength(42);
    expect(new Set(occupied)).toEqual(cells);
    expect(level.blocked).toEqual([]);
    expect(level.seams).toEqual([]);
  });

  it("retains all source shapes, colors and ice counts with native unrotated assets", () => {
    expect(inventory(level.blocks)).toEqual(inventory(before.blocks));
    expect(level.blocks).toHaveLength(22);
    expect(level.blocks.filter(b => b.shape.length === 3)).toHaveLength(10);
    expect(level.blocks.filter(b => b.shape.length === 1)).toHaveLength(12);
    expect(level.blocks.filter(b => b.frozen).map(b => b.frozen!).sort((a, b) => a - b))
      .toEqual([13, 14, 15, 16, 17, 17, 17]);
    expect(level.gates.map(g => [g.color, g.frozen ?? 0, g.size])).toEqual([
      ["green", 0, 3], ["cyan", 0, 1], ["pink", 6, 1], ["purple", 7, 1], ["red", 13, 1],
    ]);
    const owners = new Map<string, LevelSpec["blocks"][number]>();
    for (const b of level.blocks) {
      expect(matchFormalBlockShape(b.shape, "native-only")?.quarterTurns).toBe(0);
      for (const [dx, dy] of b.shape) owners.set(`${b.x + dx},${b.y + dy}`, b);
    }
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

  it("completes in 34 real drags with 12 setup drags and 22 clear events", () => {
    expect(replayRevisedRoute(level, fixture.drags)).toMatchObject({
      valid: true, complete: true, effectiveDrags: 34, nonClearingDrags: 12, clearEvents: 22,
    });
    const setup = fixture.drags.filter(d => !d.exitSide);
    expect(setup.filter(d => level.blocks.find(b => b.id === d.blockId)!.shape.length === 3)).toHaveLength(4);
    expect(setup.filter(d => level.blocks.find(b => b.id === d.blockId)!.shape.length === 1)).toHaveLength(8);
  });

  it("waits for actual clears to reduce each source numeric ice threshold", () => {
    const model = new PuzzleModel(level);
    model.startCountdown();
    for (const drag of fixture.drags) {
      model.beginAction();
      for (const [x, y] of drag.path) expect(model.moveBlockStep(drag.blockId, x, y)).toBe(true);
      if (drag.exitSide) expect(model.tryExit(drag.blockId, drag.exitSide).ok).toBe(true);
      expect(model.commitAction()).toBe(true);
      const state = model.snapshot();
      for (const b of state.blocks) {
        const initial = level.blocks.find(old => old.id === b.id)!;
        expect(b.frozen).toBe(Math.max(0, (initial.frozen ?? 0) - state.cleared));
      }
    }
    expect(model.snapshot().complete).toBe(true);
  });

  it("preserves the old hard label, 120 seconds and achievable 36/86 star targets", () => {
    expect([level.name, level.difficulty, level.timeSeconds, level.reward, level.parMoves])
      .toEqual([before.name, "hard", 120, 40, 36]);
    expect(level.mechanismRules).toBe("revised-2026-09-23-v1.4");
    expect(level.designTargets).toBeUndefined();
    expect(levelStarTargets(level)).toEqual(levelStarTargets(before));
    expect(levelStarTargets(level)).toEqual({ moveTarget: 36, timeTargetSeconds: 86 });
    expect(evaluateLevelStars(level, { moves: 34, elapsedSeconds: 86 }).earnedStars).toBe(3);
    expect(evaluateLevelStars(level, { moves: 36, elapsedSeconds: 86 }).earnedStars).toBe(3);
    expect(evaluateLevelStars(level, { moves: 37, elapsedSeconds: 86 }).earnedStars).toBe(2);
    expect(evaluateLevelStars(level, { moves: 34, elapsedSeconds: 86.01 }).earnedStars).toBe(2);
  });
});
