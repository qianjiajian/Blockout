import { describe, expect, it } from "vitest";
import {
  FROZEN_GATE_ART_METRICS,
  frozenGateCounterCenter,
} from "../src/game/frozenGateCounterGeometry";
import type { Side } from "../src/core/types";

describe("frozen gate counter geometry", () => {
  const rect = { x: 40, y: 80, width: 285, height: 58 };

  it("centers bottom, left, and right counters on the gate rectangle", () => {
    for (const side of ["right", "bottom", "left"] satisfies Side[]) {
      expect(frozenGateCounterCenter(side, rect, 95, 67)).toEqual({
        x: 182.5,
        y: 109,
      });
    }
  });

  it("excludes the top strip's trailing shadow from the visible face center", () => {
    expect(frozenGateCounterCenter("top", rect, 95, 67)).toEqual({
      x: 182.5,
      y: 100,
    });
  });

  it("scales the top correction with the board cell", () => {
    expect(frozenGateCounterCenter("top", rect, 47.5, 67)).toEqual({
      x: 182.5,
      y: 104.5,
    });
  });

  it("falls back to the geometric center before formal ice art is available", () => {
    expect(frozenGateCounterCenter("top", rect, 95)).toEqual({
      x: 182.5,
      y: 109,
    });
  });

  it("never shifts for a sprite without a trailing shadow", () => {
    expect(frozenGateCounterCenter(
      "top",
      rect,
      95,
      FROZEN_GATE_ART_METRICS.faceThickness,
    )).toEqual({ x: 182.5, y: 109 });
  });
});
