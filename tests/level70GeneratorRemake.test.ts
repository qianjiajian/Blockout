// @ts-expect-error Node fixture IO is outside the browser tsconfig.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LEVELS_BEFORE_151_160_REMAKE as LEVELS, LEVELS_BEFORE_LEVEL70_GENERATOR_REMAKE } from "../src/core/levels";
import { applyLevel70GeneratorRemake } from "../src/core/level70GeneratorRemake";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import { replayRevisedRoute, type RevisedSearchDrag } from "../src/core/revisedLevelSearch";
import { evaluateLevelStars, levelStarTargets } from "../src/core/levelStarConditions";
import { matchFormalBlockShape } from "../src/game/formalBlockShapes";
import type { LevelSpec } from "../src/core/types";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/level70-dual-generator-v193.json", import.meta.url), "utf8")) as {
  level: LevelSpec; drags: RevisedSearchDrag[];
};
const level = LEVELS[69]!, before = LEVELS_BEFORE_LEVEL70_GENERATOR_REMAKE[69]!;
const cargo = new Set(level.generators!.flatMap(g => g.queueBlockIds));

describe("Lv70 dual FIFO generators with required frozen-gate staging", () => {
  it("adopts only the accepted Lv70 and leaves the other 199 objects untouched", () => {
    expect(JSON.parse(JSON.stringify(level))).toEqual(fixture.level);
    expect(LEVELS).toHaveLength(200);
    for (const [i, old] of LEVELS_BEFORE_LEVEL70_GENERATOR_REMAKE.entries())
      if (old.id !== 70) expect(LEVELS[i]).toBe(old);
    const original = JSON.stringify(before);
    expect(JSON.parse(JSON.stringify(applyLevel70GeneratorRemake(before)))).toEqual(fixture.level);
    expect(JSON.stringify(before)).toBe(original);
  });

  it("preserves the entire source inventory, board and original texture orientations", () => {
    expect(() => validateLevel(level)).not.toThrow();
    for (const k of ["width", "height", "playable", "blocked", "seams"] as const)
      expect(level[k]).toEqual(before[k]);
    expect(level.blocks).toHaveLength(36);
    expect(cargo.size).toBe(17);
    expect([...cargo].sort()).toEqual(before.generators![0]!.queueBlockIds.slice().sort());
    for (const b of level.blocks) {
      const old = before.blocks.find(x => x.id === b.id)!;
      expect([b.shape, b.color]).toEqual([old.shape, old.color]);
      expect(matchFormalBlockShape(b.shape, "native-only")?.quarterTurns).toBe(0);
    }
    const opening = new PuzzleModel(level).snapshot();
    expect(opening.blocks).toHaveLength(19);
    expect(opening.queuedBlocks).toHaveLength(17);
    const owners = new Map<string, string>();
    for (const b of opening.blocks) for (const [dx, dy] of b.shape) {
      const key = `${b.x + dx},${b.y + dy}`;
      expect(owners.has(key)).toBe(false); owners.set(key, b.id);
    }
    expect(new Set(owners.keys())).toEqual(new Set(level.playable!.map(p => p.join(","))));
    for (const [key, id] of owners) {
      const [x, y] = key.split(",").map(Number);
      for (const p of [[x! + 1, y!], [x!, y! + 1]]) {
        const other = owners.get(p.join(","));
        if (other && other !== id)
          expect(level.blocks.find(b => b.id === other)!.color).not.toBe(level.blocks.find(b => b.id === id)!.color);
      }
    }
  });

  it("retains two complete, fixed, adjacent-different queues and the authored ice chain", () => {
    expect(level.generators).toHaveLength(2);
    expect(level.generators!.map(g => g.queueBlockIds.length)).toEqual([9, 8]);
    expect(Object.fromEntries(level.gates.map(g => [g.color, g.frozen ?? 0])))
      .toEqual({ blue: 0, pink: 1, green: 9, yellow: 17 });
    for (const g of level.generators!) {
      expect(g.rimSpan).toBe(3);
      for (const [i, id] of g.queueBlockIds.entries()) {
        const b = level.blocks.find(b => b.id === id)!;
        expect([b.x, b.y]).toEqual(g.spawn);
        if (i) expect(b.color).not.toBe(level.blocks.find(b => b.id === g.queueBlockIds[i - 1])!.color);
      }
    }
  });

  it("finishes 36 bodies in 51 drags with fifteen multi-cell, not single-cell, repositions", () => {
    expect(replayRevisedRoute(level, fixture.drags)).toMatchObject({
      valid: true, complete: true, effectiveDrags: 51, clearEvents: 36, nonClearingDrags: 15,
    });
    const parks = fixture.drags.filter(d => !d.exitSide);
    expect(parks).toHaveLength(15);
    expect(parks.every(d => level.blocks.find(b => b.id === d.blockId)!.shape.length > 1)).toBe(true);
    expect(parks.filter(d => cargo.has(d.blockId))).toHaveLength(1);
  });

  it("cannot unlock yellow using only opening bodies and queue prefixes before a yellow V2", () => {
    const openingCapacity = level.blocks.filter(b => !cargo.has(b.id) && b.color !== "yellow").length;
    let queueCapacity = 0;
    for (const g of level.generators!) {
      const prefix = g.queueBlockIds.map(id => level.blocks.find(b => b.id === id)!);
      const barrier = prefix.findIndex(b => b.color === "yellow");
      expect(barrier).toBeGreaterThanOrEqual(0);
      expect(prefix[barrier]!.shape).toEqual([[0, 0], [0, 1]]);
      queueCapacity += barrier;
    }
    expect([openingCapacity, queueCapacity]).toEqual([15, 1]);
    expect(openingCapacity + queueCapacity).toBeLessThan(level.gates.find(g => g.color === "yellow")!.frozen!);
    // Fixed FIFO, no shells or other clear-event sources: a closed yellow V2
    // must be moved off its spawn before further cargo can supply clear 17.
    expect(level.blocks.every(b => (b.layers?.length ?? 1) === 1)).toBe(true);
    expect(level.shutters ?? []).toEqual([]);
  });

  it("uses both machines before the opening is empty and counts real cargo towards yellow thaw", () => {
    const model = new PuzzleModel(level); model.startCountdown();
    const arrivals = new Map<string, number>(); let cargoBeforeThaw = 0, yellowWasFrozenAtParking = false;
    for (const d of fixture.drags) {
      const prior = model.snapshot(); model.beginAction();
      for (const [x, y] of d.path) expect(model.moveBlockStep(d.blockId, x, y)).toBe(true);
      if (d.exitSide) expect(model.tryExit(d.blockId, d.exitSide).ok).toBe(true);
      expect(model.commitAction()).toBe(true);
      const after = model.snapshot();
      for (const g of after.generators) if (g.head > 0 && !arrivals.has(g.id))
        arrivals.set(g.id, after.blocks.filter(b => !cargo.has(b.id)).length);
      const frozen = prior.gates.find(g => g.color === "yellow")!.frozen!;
      if (cargo.has(d.blockId) && frozen > 0) {
        if (d.exitSide) cargoBeforeThaw++;
        else if (level.blocks.find(b => b.id === d.blockId)!.shape.length === 2) yellowWasFrozenAtParking = true;
      }
      for (const g of after.gates)
        expect(g.frozen ?? 0).toBe(Math.max(0, (level.gates.find(x => x.id === g.id)!.frozen ?? 0) - after.cleared));
    }
    expect(arrivals.size).toBe(2);
    expect([...arrivals.values()].every(n => n >= 10)).toBe(true);
    expect(yellowWasFrozenAtParking).toBe(true);
    expect(cargoBeforeThaw).toBeGreaterThanOrEqual(2);
    expect(model.snapshot().complete).toBe(true);
  });

  it("keeps timing/rewards and synchronizes only the actual move star to 51", () => {
    for (const k of ["name", "difficulty", "timeSeconds", "reward", "parMoves", "featureIntro"] as const)
      expect(level[k]).toEqual(before[k]);
    expect(level.timeSeconds).toBe(180);
    expect(level.designTargets).toBeUndefined();
    expect(level.mechanismRules).toBe("revised-2026-09-27-v1.5");
    expect(levelStarTargets(level)).toEqual({ moveTarget: 51, timeTargetSeconds: 129 });
    expect(evaluateLevelStars(level, { moves: 51, elapsedSeconds: 129 }).earnedStars).toBe(3);
    expect(evaluateLevelStars(level, { moves: 52, elapsedSeconds: 129 }).earnedStars).toBe(2);
    expect(evaluateLevelStars(level, { moves: 51, elapsedSeconds: 129.01 }).earnedStars).toBe(2);
  });
});
