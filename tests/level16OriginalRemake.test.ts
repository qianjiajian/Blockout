// @ts-expect-error Node fixture IO is outside the browser tsconfig.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LEVELS_BEFORE_LEVEL20_ORIGINAL_REMAKE as LEVELS, LEVELS_BEFORE_LEVEL16_ORIGINAL_REMAKE } from "../src/core/levels";
import { applyLevel16OriginalRemake } from "../src/core/level16OriginalRemake";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import { replayRevisedRoute, type RevisedSearchDrag } from "../src/core/revisedLevelSearch";
import { evaluateLevelStars, levelStarTargets } from "../src/core/levelStarConditions";
import { matchFormalBlockShape } from "../src/game/formalBlockShapes";
import type { LevelSpec } from "../src/core/types";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/level16-original-v184.json", import.meta.url), "utf8")) as {
  ruleVersion: string; level: LevelSpec; drags: RevisedSearchDrag[];
};
const before = LEVELS_BEFORE_LEVEL16_ORIGINAL_REMAKE[15]!;
const level = LEVELS[15]!;

describe("Lv16 original board and verified pre-first-clear inventory", () => {
  it("adopts the certified candidate and changes only Lv16", () => {
    expect(fixture.ruleVersion).toBe("1.84.0");
    expect(JSON.parse(JSON.stringify(level))).toEqual(fixture.level);
    expect(LEVELS).toHaveLength(200);
    for (const [i, old] of LEVELS_BEFORE_LEVEL16_ORIGINAL_REMAKE.entries())
      if (old.id !== 16) expect(LEVELS[i]).toBe(old);
    const saved = JSON.stringify(before);
    expect(JSON.parse(JSON.stringify(applyLevel16OriginalRemake(before)))).toEqual(fixture.level);
    expect(JSON.stringify(before)).toBe(saved);
  });

  it("uses a truly different symmetric, fully occupied 27-cell board", () => {
    expect(() => validateLevel(level)).not.toThrow();
    const points = level.playable!;
    const cells = new Set(points.map(p => p.join(",")));
    expect(points).toHaveLength(27);
    expect(cells.size).toBe(27);
    const occupied = level.blocks.flatMap(b => b.shape.map(([dx, dy]) => [b.x + dx, b.y + dy].join(",")));
    expect(occupied).toHaveLength(27);
    expect(new Set(occupied)).toEqual(cells);
    const mirrorX = points.every(([x, y]) => cells.has([level.width - 1 - x, y].join(",")));
    const mirrorY = points.every(([x, y]) => cells.has([x, level.height - 1 - y].join(",")));
    expect(mirrorX || mirrorY).toBe(true);
    const canon = (ps: readonly (readonly number[])[]) => {
      const x0 = Math.min(...ps.map(p => p[0]!)), y0 = Math.min(...ps.map(p => p[1]!));
      return ps.map(([x, y]) => [x! - x0, y! - y0].join(",")).sort().join("|");
    };
    for (const flip of [-1, 1]) for (let turns = 0; turns < 4; turns++) {
      const transformed = before.playable!.map(([x, y]) => {
        x *= flip;
        for (let t = 0; t < turns; t++) [x, y] = [-y, x];
        return [x, y];
      });
      expect(canon(points)).not.toBe(canon(transformed));
    }
    expect(level.blocked).toEqual([]);
    expect(level.seams).toEqual([]);
  });

  it("restores the omitted opening blue block and retains all source shapes and layers", () => {
    expect(before.blocks).toHaveLength(20);
    expect(level.blocks).toHaveLength(21);
    expect(level.blocks.filter(b => b.shape.length === 1).map(b => b.color).sort())
      .toEqual([...Array(3).fill("blue"), ...Array(5).fill("cyan"), ...Array(7).fill("purple"), ...Array(3).fill("yellow")].sort());
    const longs = level.blocks.filter(b => b.shape.length === 3);
    expect(longs).toHaveLength(3);
    expect(longs.every(b => JSON.stringify(b.shape) === JSON.stringify([[0, 0], [0, 1], [0, 2]]))).toBe(true);
    expect(longs.filter(b => !b.layers).map(b => b.color)).toEqual(["red", "red"]);
    expect(level.blocks.filter(b => b.layers).map(b => b.layers)).toEqual([["yellow", "red"]]);
    const owners = new Map<string, LevelSpec["blocks"][number]>();
    for (const b of level.blocks) {
      expect(matchFormalBlockShape(b.shape, "native-only")?.quarterTurns).toBe(0);
      expect(b.frozen ?? 0).toBe(0);
      for (const [dx, dy] of b.shape) owners.set([b.x + dx, b.y + dy].join(","), b);
    }
    for (const [key, b] of owners) {
      const [x, y] = key.split(",").map(Number);
      for (const p of [[x! + 1, y!], [x!, y! + 1]]) {
        const other = owners.get(p.join(","));
        if (other && other.id !== b.id) expect(other.color).not.toBe(b.color);
      }
    }
    expect(level.gates).toHaveLength(5);
    expect(Object.fromEntries(level.gates.map(g => [g.color, g.frozen ?? 0])))
      .toEqual({ blue: 0, cyan: 3, yellow: 8, red: 12, purple: 15 });
    for (const key of ["shutters", "generators", "flipDoors", "coloredGrids", "elevators", "conveyors"] as const)
      expect(level[key] ?? []).toEqual([]);
  });

  it("has a complete unassisted route within the ordinary 11–15 band", () => {
    const replay = replayRevisedRoute(level, fixture.drags);
    expect(replay).toMatchObject({ valid: true, complete: true, effectiveDrags: fixture.drags.length, clearEvents: 22 });
    expect(replay.nonClearingDrags).toBe(fixture.drags.length - 22);
    expect(replay.nonClearingDrags).toBeGreaterThanOrEqual(11);
    expect(replay.nonClearingDrags).toBeLessThanOrEqual(15);
    expect(fixture.drags.some(d => !d.exitSide && level.blocks.find(b => b.id === d.blockId)!.shape.length === 3)).toBe(true);
  });

  it("honors all source gate stages and preserves the red core after peeling", () => {
    const model = new PuzzleModel(level);
    model.startCountdown();
    const clearColors: string[] = [];
    let peels = 0, removals = 0;
    for (const drag of fixture.drags) {
      const prior = model.snapshot(), body = prior.blocks.find(b => b.id === drag.blockId)!;
      model.beginAction();
      for (const [x, y] of drag.path) expect(model.moveBlockStep(drag.blockId, x, y)).toBe(true);
      if (drag.exitSide) {
        const result = model.tryExit(drag.blockId, drag.exitSide);
        expect(result.ok).toBe(true);
        clearColors.push(body.layers[0]!);
        if (body.layers.length > 1) {
          peels++;
          expect(result.layerRemoved).toBe(true);
          expect(model.snapshot().blocks.find(b => b.id === body.id)!.layers).toEqual(["red"]);
        } else {
          removals++;
          expect(model.snapshot().blocks.some(b => b.id === body.id)).toBe(false);
        }
      }
      expect(model.commitAction()).toBe(true);
      const after = model.snapshot();
      expect(after.cleared - prior.cleared).toBe(drag.exitSide ? 1 : 0);
      for (const gate of after.gates)
        expect(gate.frozen ?? 0).toBe(Math.max(0, (level.gates.find(g => g.id === gate.id)!.frozen ?? 0) - after.cleared));
    }
    expect(clearColors).toEqual([
      ...Array(3).fill("blue"), ...Array(5).fill("cyan"), ...Array(4).fill("yellow"),
      ...Array(3).fill("red"), ...Array(7).fill("purple"),
    ]);
    expect([peels, removals]).toEqual([1, 21]);
    expect(model.snapshot().complete).toBe(true);
  });

  it("keeps the old time and actual star targets without adding a new introduction", () => {
    expect([level.name, level.difficulty, level.timeSeconds, level.reward, level.parMoves])
      .toEqual([before.name, "normal", 180, 65, 50]);
    expect(level.featureIntro).toEqual(before.featureIntro);
    expect(level.featureIntro).toBeUndefined();
    expect(level.mechanismRules).toBe("revised-2026-09-23-v1.4");
    expect(level.designTargets).toBeUndefined();
    expect(levelStarTargets(before)).toEqual({ moveTarget: 50, timeTargetSeconds: 129 });
    expect(levelStarTargets(level)).toEqual(levelStarTargets(before));
    expect(evaluateLevelStars(level, { moves: fixture.drags.length, elapsedSeconds: 129 }).earnedStars).toBe(3);
    expect(evaluateLevelStars(level, { moves: 51, elapsedSeconds: 129 }).earnedStars).toBe(2);
    expect(evaluateLevelStars(level, { moves: fixture.drags.length, elapsedSeconds: 129.01 }).earnedStars).toBe(2);
  });
});
