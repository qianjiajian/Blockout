// @ts-expect-error Node fixture IO is outside the browser tsconfig.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LEVELS, LEVELS_BEFORE_LEVEL15_ORIGINAL_REMAKE, LEVELS_BEFORE_LEVEL16_ORIGINAL_REMAKE } from "../src/core/levels";
import { applyLevel15OriginalRemake } from "../src/core/level15OriginalRemake";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import { replayRevisedRoute, type RevisedSearchDrag } from "../src/core/revisedLevelSearch";
import { evaluateLevelStars, levelStarTargets } from "../src/core/levelStarConditions";
import { matchFormalBlockShape } from "../src/game/formalBlockShapes";
import type { LevelSpec } from "../src/core/types";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/level15-original-v183.json", import.meta.url), "utf8")) as {
  ruleVersion: string; level: LevelSpec; drags: RevisedSearchDrag[];
};
const before = LEVELS_BEFORE_LEVEL15_ORIGINAL_REMAKE[14]!;
const level = LEVELS[14]!;

describe("Lv15 original hammer and single-shell first teaching", () => {
  it("adopts the exact independently certified candidate and only changes Lv15", () => {
    expect(fixture.ruleVersion).toBe("1.83.0");
    expect(JSON.parse(JSON.stringify(level))).toEqual(fixture.level);
    expect(LEVELS).toHaveLength(200);
    for (const [i, old] of LEVELS_BEFORE_LEVEL15_ORIGINAL_REMAKE.entries()) {
      if (old.id !== 15) expect(LEVELS_BEFORE_LEVEL16_ORIGINAL_REMAKE[i]).toBe(old);
    }
    const frozen = JSON.stringify(before);
    expect(JSON.parse(JSON.stringify(applyLevel15OriginalRemake(before)))).toEqual(fixture.level);
    expect(JSON.stringify(before)).toBe(frozen);
  });

  it("really changes the H-shaped board into a symmetric 40-cell hammer", () => {
    expect(() => validateLevel(level)).not.toThrow();
    expect([before.width, before.height]).toEqual([6, 8]);
    expect([level.width, level.height]).toEqual([8, 8]);
    const cells = new Set(level.playable!.map(p => p.join(",")));
    expect(Array.from({ length: 8 }, (_, y) => Array.from({ length: 8 }, (_, x) =>
      cells.has([x, y].join(",")) ? "#" : ".").join("")))
      .toEqual(["..####..", "..####..", "########", "########", "..####..", "..####..", "..####..", "..####.."]);
    expect(level.playable!.every(([x, y]) => cells.has([7 - x, y].join(",")))).toBe(true);
    const occupied = level.blocks.flatMap(b => b.shape.map(([dx, dy]) => [b.x + dx, b.y + dy].join(",")));
    expect(occupied).toHaveLength(40);
    expect(new Set(occupied)).toEqual(cells);
    expect(level.blocked).toEqual([]);
    expect(level.seams).toEqual([]);
  });

  it("keeps all native SQ2 source colors, five shell pairs and four gate ice values", () => {
    expect(level.blocks).toHaveLength(10);
    const owners = new Map<string, LevelSpec["blocks"][number]>();
    for (const b of level.blocks) {
      expect(b.shape).toEqual([[0, 0], [1, 0], [0, 1], [1, 1]]);
      expect(matchFormalBlockShape(b.shape, "native-only")?.quarterTurns).toBe(0);
      expect(b.frozen ?? 0).toBe(0);
      for (const [dx, dy] of b.shape) owners.set([b.x + dx, b.y + dy].join(","), b);
    }
    expect(level.blocks.filter(b => b.layers).map(b => b.layers!.join(">")).sort())
      .toEqual(["blue>pink", "blue>red", "green>blue", "pink>blue", "red>yellow"]);
    expect(level.blocks.filter(b => !b.layers).map(b => b.color).sort())
      .toEqual(["green", "pink", "red", "yellow", "yellow"]);
    expect(level.gates.map(g => [g.color, g.frozen ?? 0, g.size])).toEqual([
      ["yellow", 0, 2], ["blue", 6, 2], ["pink", 2, 2], ["red", 5, 2], ["green", 3, 2],
    ]);
    for (const [key, b] of owners) {
      const [x, y] = key.split(",").map(Number);
      for (const p of [[x! + 1, y!], [x!, y! + 1]]) {
        const other = owners.get(p.join(","));
        if (other && other.id !== b.id) expect(other.color).not.toBe(b.color);
      }
    }
    for (const key of ["shutters", "generators", "flipDoors", "coloredGrids", "elevators", "conveyors"] as const)
      expect(level[key] ?? []).toEqual([]);
  });

  it("completes in 21 drags with six SQ2 repositions and fifteen clear/peel events", () => {
    expect(replayRevisedRoute(level, fixture.drags)).toMatchObject({
      valid: true, complete: true, effectiveDrags: 21, nonClearingDrags: 6, clearEvents: 15,
    });
    const setup = fixture.drags.filter(d => !d.exitSide);
    expect(setup).toHaveLength(6);
    expect(setup.every(d => level.blocks.find(b => b.id === d.blockId)!.shape.length === 4)).toBe(true);
  });

  it("keeps each peeled body and advances gate thaw exactly once per shell or body", () => {
    const model = new PuzzleModel(level);
    model.startCountdown();
    let peels = 0, removals = 0;
    for (const drag of fixture.drags) {
      const prior = model.snapshot();
      const body = prior.blocks.find(b => b.id === drag.blockId)!;
      model.beginAction();
      for (const [x, y] of drag.path) expect(model.moveBlockStep(drag.blockId, x, y)).toBe(true);
      if (drag.exitSide) {
        const result = model.tryExit(drag.blockId, drag.exitSide);
        expect(result.ok).toBe(true);
        if (body.layers.length > 1) {
          peels++;
          expect(result.layerRemoved).toBe(true);
          expect(model.snapshot().blocks.find(b => b.id === body.id)!.layers).toEqual(body.layers.slice(1));
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
    expect([peels, removals]).toEqual([5, 10]);
    expect(model.snapshot().complete).toBe(true);
  });

  it("applies the simple first-teach rule without changing actual star targets or intro", () => {
    expect([level.name, level.difficulty, level.timeSeconds, level.reward, level.parMoves])
      .toEqual([before.name, "easy", 120, 60, 536]);
    expect(level.featureIntro).toEqual(before.featureIntro);
    expect(level.featureIntro?.kind).toBe("layer");
    expect(level.mechanismRules).toBe("revised-2026-09-23-v1.4");
    expect(level.designTargets).toBeUndefined();
    expect(levelStarTargets(before)).toEqual({ moveTarget: 34, timeTargetSeconds: 86 });
    expect(levelStarTargets(level)).toEqual(levelStarTargets(before));
    expect(evaluateLevelStars(level, { moves: 21, elapsedSeconds: 86 }).earnedStars).toBe(3);
    expect(evaluateLevelStars(level, { moves: 35, elapsedSeconds: 86 }).earnedStars).toBe(2);
    expect(evaluateLevelStars(level, { moves: 21, elapsedSeconds: 86.01 }).earnedStars).toBe(2);
  });
});
