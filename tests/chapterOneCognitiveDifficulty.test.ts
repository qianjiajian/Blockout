import { describe, expect, it } from "vitest";
import { calibratedBlockOutDifficulty, scoreBlockOutLevel } from "../src/core/blockOutDifficulty";
import { LEVELS } from "../src/core/levels";

const EXPECTED = [
  { id: 5, score: 60.61, clearLoad: 20, parMoves: 29, setupDrags: 9, frozenGates: [] },
  { id: 6, score: 62.28, clearLoad: 21, parMoves: 27, setupDrags: 6, frozenGates: [1] },
  { id: 7, score: 60.07, clearLoad: 16, parMoves: 28, setupDrags: 12, frozenGates: [] },
  { id: 8, score: 62.17, clearLoad: 25, parMoves: 56, setupDrags: 31, frozenGates: [] },
  { id: 9, score: 57.91, clearLoad: 10, parMoves: 20, setupDrags: 10, frozenGates: [] },
  { id: 10, score: 60.7, clearLoad: 25, parMoves: 52, setupDrags: 27, frozenGates: [] },
] as const;

describe("chapter-one competitor cognitive profile", () => {
  it("locks the measured score and accepted route burden", () => {
    for (const expected of EXPECTED) {
      const level = LEVELS[expected.id - 1];
      const clearLoad = level.blocks.reduce((sum, block) => sum + (block.layers?.length ?? 1), 0);
      const score = calibratedBlockOutDifficulty(scoreBlockOutLevel(level).score);
      const setupDrags = (level.parMoves ?? 0) - clearLoad;

      expect(score, `Lv${level.id} D1`).toBe(expected.score);
      expect(clearLoad, `Lv${level.id} clear load`).toBe(expected.clearLoad);
      expect(level.parMoves, `Lv${level.id} accepted route par`).toBe(expected.parMoves);
      expect(setupDrags, `Lv${level.id} necessary setup drags`).toBe(expected.setupDrags);
    }
  });

  it("matches the competitor frozen dependencies without shells or shutters", () => {
    for (const expected of EXPECTED) {
      const level = LEVELS[expected.id - 1];
      expect(level.blocks.every((block) => !block.layers), `Lv${level.id} shells`).toBe(true);
      expect(level.shutters ?? [], `Lv${level.id} shutters`).toEqual([]);
      expect(
        level.gates.filter((gate) => (gate.frozen ?? 0) > 0).map((gate) => gate.frozen).sort((a, b) => a! - b!),
        `Lv${level.id} frozen gate cadence`,
      ).toEqual(expected.frozenGates);
    }

    expect(LEVELS[9].blocks.filter((block) => (block.frozen ?? 0) > 0).map((block) => block.frozen).sort((a, b) => a! - b!))
      .toEqual([1]);
  });
});
