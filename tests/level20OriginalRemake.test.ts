// @ts-expect-error Node fixture IO is outside the browser tsconfig.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LEVELS_BEFORE_FROZEN_FLIP as LEVELS, LEVELS_BEFORE_LEVEL20_ORIGINAL_REMAKE } from "../src/core/levels";
import { applyLevel20OriginalRemake } from "../src/core/level20OriginalRemake";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import { replayRevisedRoute, type RevisedSearchDrag } from "../src/core/revisedLevelSearch";
import { evaluateLevelStars, levelStarTargets } from "../src/core/levelStarConditions";
import { matchFormalBlockShape } from "../src/game/formalBlockShapes";
import type { LevelSpec } from "../src/core/types";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/level20-original-v187.json", import.meta.url), "utf8")) as {
  ruleVersion: string; level: LevelSpec; drags: RevisedSearchDrag[];
};
const before = LEVELS_BEFORE_LEVEL20_ORIGINAL_REMAKE[19]!;
const level = LEVELS[19]!;

describe("Lv20 original rectangle with minimally recolored unique gates", () => {
  it("adopts the independently accepted candidate and only replaces Lv20", () => {
    expect(fixture.ruleVersion).toBe("1.87.0");
    expect(JSON.parse(JSON.stringify(level))).toEqual(fixture.level);
    expect(LEVELS).toHaveLength(200);
    for (const [i, old] of LEVELS_BEFORE_LEVEL20_ORIGINAL_REMAKE.entries())
      if (old.id !== 20) expect(LEVELS[i]).toBe(old);
    const saved = JSON.stringify(before);
    expect(JSON.parse(JSON.stringify(applyLevel20OriginalRemake(before)))).toEqual(fixture.level);
    expect(JSON.stringify(before)).toBe(saved);
  });

  it("fully tiles an original 5×6 rectangle, including the whole hidden region", () => {
    expect(() => validateLevel(level)).not.toThrow();
    expect([level.width, level.height]).toEqual([5, 6]);
    expect(level.playable).toHaveLength(30);
    expect(before.playable).toHaveLength(32); // Not any rotation/reflection of the old dogbone.
    expect(new Set(level.playable!.map(p => p.join(","))).size).toBe(30);
    expect(level.blocked).toEqual([]);
    expect(level.seams).toEqual([]);
    const occupied = level.blocks.flatMap(b => b.shape.map(([dx, dy]) => [b.x + dx, b.y + dy].join(",")));
    expect(occupied).toHaveLength(30);
    expect(new Set(occupied)).toEqual(new Set(level.playable!.map(p => p.join(","))));
    expect(level.shutters).toEqual([{ id: "lv20-cover", x: 0, y: 0, width: 5, height: 3, count: 6, skin: "shutter" }]);
    const hidden = level.blocks.filter(b => b.shutterId);
    expect(new Set(hidden.flatMap(b => b.shape.map(([dx, dy]) => [b.x + dx, b.y + dy].join(",")))))
      .toEqual(new Set(level.playable!.filter(([, y]) => y < 3).map(p => p.join(","))));
  });

  it("keeps both batches of source shapes and only recolors the three approved hidden bodies", () => {
    expect(level.blocks).toHaveLength(14);
    for (const hidden of [false, true]) {
      const bodies = level.blocks.filter(b => !!b.shutterId === hidden);
      expect(bodies).toHaveLength(7);
      expect(bodies.filter(b => JSON.stringify(b.shape) === "[[0,0],[1,0]]")).toHaveLength(6);
      expect(bodies.filter(b => JSON.stringify(b.shape) === "[[0,0],[0,1],[0,2]]")).toHaveLength(1);
    }
    expect(Object.fromEntries(level.blocks.map(b => [b.id.replace("lv20-", ""), b.color]))).toEqual({
      "b1-01": "red", "b1-02": "yellow", "b1-03": "blue", "b1-04": "red",
      "b1-05": "pink", "b1-06": "yellow", "b1-07": "green", "b2-01": "blue",
      "b2-02": "orange", "b2-03": "red", "b2-04": "cyan", "b2-05": "green",
      "b2-06": "purple", "b2-07": "yellow",
    });
    const owners = new Map<string, LevelSpec["blocks"][number]>();
    for (const b of level.blocks) {
      expect(matchFormalBlockShape(b.shape, "native-only")?.quarterTurns).toBe(0);
      expect(Object.keys(b).every(k => ["id", "color", "shape", "x", "y", "shutterId"].includes(k))).toBe(true);
      for (const [dx, dy] of b.shape) owners.set([b.x + dx, b.y + dy].join(","), b);
    }
    for (const [key, b] of owners) {
      const [x, y] = key.split(",").map(Number);
      for (const p of [[x! + 1, y!], [x!, y! + 1]]) {
        const other = owners.get(p.join(","));
        if (other && other.id !== b.id) expect(other.color).not.toBe(b.color);
      }
    }
    expect(Object.fromEntries(level.gates.map(g => [g.color, g.frozen ?? 0])))
      .toEqual({ yellow: 0, pink: 1, blue: 2, red: 3, orange: 6, purple: 7, green: 8, cyan: 10 });
    expect(level.gates).toHaveLength(8);
    expect(level.gates.every(g => g.size <= 3)).toBe(true);
    for (const key of ["generators", "flipDoors", "coloredGrids", "elevators", "conveyors"] as const)
      expect(level[key] ?? []).toEqual([]);
  });

  it("finishes with 19 real drags, including five multi-cell repositions", () => {
    expect(replayRevisedRoute(level, fixture.drags)).toMatchObject({
      valid: true, complete: true, effectiveDrags: 19, clearEvents: 14, nonClearingDrags: 5,
    });
    const repositions = fixture.drags.filter(d => !d.exitSide);
    expect(repositions).toHaveLength(5);
    expect(repositions.every(d => level.blocks.find(b => b.id === d.blockId)!.shape.length === 2)).toBe(true);
  });

  it("reveals seven real hidden bodies at clear six and follows every frozen gate counter", () => {
    const model = new PuzzleModel(level);
    model.startCountdown();
    let revealStep = 0;
    for (const [index, drag] of fixture.drags.entries()) {
      const prior = model.snapshot();
      model.beginAction();
      for (const [x, y] of drag.path) expect(model.moveBlockStep(drag.blockId, x, y)).toBe(true);
      if (drag.exitSide) expect(model.tryExit(drag.blockId, drag.exitSide).ok).toBe(true);
      expect(model.commitAction()).toBe(true);
      const after = model.snapshot();
      expect(after.cleared - prior.cleared).toBe(drag.exitSide ? 1 : 0);
      expect(after.shutters[0]!.count).toBe(Math.max(0, 6 - after.cleared));
      expect(after.shutters[0]!.revealed).toBe(after.cleared >= 6);
      if (prior.cleared < 6 && after.cleared === 6) {
        revealStep = index + 1;
        expect(after.blocks.filter(b => b.shutterId)).toHaveLength(7);
      }
      for (const gate of after.gates)
        expect(gate.frozen ?? 0).toBe(Math.max(0, (level.gates.find(g => g.id === gate.id)!.frozen ?? 0) - after.cleared));
    }
    expect(revealStep).toBe(9);
    expect(model.snapshot().complete).toBe(true);
    expect(model.snapshot().blocks).toHaveLength(0);
  });

  it("preserves the original introduction, 75-second limit and actual 24-drag/54-second stars", () => {
    expect([level.name, level.difficulty, level.timeSeconds, level.reward, level.parMoves])
      .toEqual([before.name, "easy", 75, 85, 24]);
    expect(level.featureIntro).toEqual(before.featureIntro);
    expect(level.featureIntro?.kind).toBe("shutter");
    expect(level.mechanismRules).toBe("revised-2026-09-23-v1.4");
    expect(level.designTargets).toBeUndefined();
    expect(levelStarTargets(level)).toEqual(levelStarTargets(before));
    expect(levelStarTargets(level)).toEqual({ moveTarget: 24, timeTargetSeconds: 54 });
    expect(evaluateLevelStars(level, { moves: 24, elapsedSeconds: 54 }).earnedStars).toBe(3);
    expect(evaluateLevelStars(level, { moves: 25, elapsedSeconds: 54 }).earnedStars).toBe(2);
    expect(evaluateLevelStars(level, { moves: 19, elapsedSeconds: 54.01 }).earnedStars).toBe(2);
  });
});
