import { describe, expect, it } from "vitest";
import { calibratedBlockOutDifficulty, scoreBlockOutLevel } from "../src/core/blockOutDifficulty";
import { LEVELS } from "../src/core/levels";

const EXPECTED = [
  { id: 1, score: 30.87, parMoves: 3, routeOverhead: 0, certifiedFloor: null },
  { id: 2, score: 54.74, parMoves: 10, routeOverhead: 1, certifiedFloor: 2 },
  { id: 3, score: 48.7, parMoves: 9, routeOverhead: 1, certifiedFloor: 1 },
  { id: 4, score: 56.34, parMoves: 33, routeOverhead: 15, certifiedFloor: 5 },
  { id: 5, score: 60.61, parMoves: 29, routeOverhead: 9, certifiedFloor: 5 },
  { id: 6, score: 62.28, parMoves: 27, routeOverhead: 6, certifiedFloor: 5 },
  { id: 7, score: 60.07, parMoves: 28, routeOverhead: 12, certifiedFloor: 6 },
  { id: 8, score: 62.17, parMoves: 56, routeOverhead: 31, certifiedFloor: 7 },
  { id: 9, score: 57.91, parMoves: 20, routeOverhead: 10, certifiedFloor: 8 },
  { id: 10, score: 60.7, parMoves: 52, routeOverhead: 27, certifiedFloor: 10 },
] as const;

describe("chapter-one competitor-composition difficulty", () => {
  it("keeps Lv1 as a three-color onboarding level", () => {
    const tutorial = LEVELS[0];
    expect(tutorial).toMatchObject({ id: 1, name: "新手教程", width: 5, height: 5, parMoves: 3 });
    expect(tutorial.playable).toHaveLength(25);
    expect(tutorial.blocks).toHaveLength(3);
    expect(tutorial.gates).toHaveLength(3);
    expect(new Set(tutorial.blocks.map((block) => block.color)).size).toBe(3);
    expect(tutorial.onboardingHint).toEqual({
      blockId: "cc-001-b1-01",
      path: [[1, 0], [2, 0], [3, 0]],
    });
    expect(tutorial.shutters).toBeUndefined();
    expect(tutorial.blocks.every((block) => !block.layers && !block.frozen)).toBe(true);
    expect(tutorial.gates.every((gate) => !gate.frozen)).toBe(true);
  });

  it("locks current D1 values, accepted par routes, and certified setup floors for Lv1–10", () => {
    for (const expected of EXPECTED) {
      const level = LEVELS[expected.id - 1];
      const score = calibratedBlockOutDifficulty(scoreBlockOutLevel(level).score);
      const clearLoad = level.blocks.reduce((sum, block) => sum + (block.layers?.length ?? 1), 0);
      expect(score, `Lv${level.id} calibrated score`).toBe(expected.score);
      expect(level.parMoves, `Lv${level.id} accepted route par`).toBe(expected.parMoves);
      expect(level.parMoves! - clearLoad, `Lv${level.id} accepted route overhead`).toBe(expected.routeOverhead);
      expect(level.designTargets?.minimumRepositionOverhead, `Lv${level.id} certified floor target`).toBe(expected.certifiedFloor);
    }
  });

  it("keeps Lv1–3 at introductory pacing and Lv4–10 at hard pacing", () => {
    for (const level of LEVELS.slice(0, 3)) {
      expect(level.difficulty, `Lv${level.id} difficulty tag`).toBe("normal");
      expect(level.timeSeconds, `Lv${level.id} timer`).toBe(180);
    }
    for (const level of LEVELS.slice(3, 10)) {
      expect(level.difficulty, `Lv${level.id} difficulty tag`).toBe("hard");
      expect(level.timeSeconds, `Lv${level.id} timer`).toBe(150);
    }
  });
});
