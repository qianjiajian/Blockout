import { describe, expect, it } from "vitest";
import type { BlockState, GateState, ShutterState } from "../src/core/types";
import { gateReadiness, gateReadinessMap } from "../src/game/gateReadiness";

const gate = (overrides: Partial<GateState> = {}): GateState => ({
  id: "blue-top",
  side: "top",
  offset: 0,
  size: 2,
  color: "blue",
  frozen: 0,
  ...overrides,
});

const block = (overrides: Partial<BlockState> = {}): BlockState => ({
  id: "blue-block",
  x: 0,
  y: 0,
  shape: [[0, 0]],
  color: "blue",
  layers: ["blue"],
  frozen: 0,
  ...overrides,
});

const shutter = (overrides: Partial<ShutterState> = {}): ShutterState => ({
  id: "cargo-door",
  x: 0,
  y: 0,
  width: 1,
  height: 1,
  count: 1,
  ...overrides,
});

describe("gate readiness", () => {
  it("marks an open gate actionable only when a matching active layer exists", () => {
    expect(gateReadiness(gate(), [block()], [])).toBe("actionable");
    expect(gateReadiness(gate(), [block({ color: "red", layers: ["red", "blue"] })], [])).toBe("latent");
  });

  it("keeps frozen gates distinct even when a matching block exists", () => {
    expect(gateReadiness(gate({ frozen: 2 }), [block()], [])).toBe("frozen");
  });

  it("ignores frozen and shutter-hidden matching blocks until they activate", () => {
    expect(gateReadiness(gate(), [block({ frozen: 1 })], [])).toBe("latent");
    const hidden = block({ shutterId: "cargo-door" });
    expect(gateReadiness(gate(), [hidden], [shutter()])).toBe("latent");
    expect(gateReadiness(gate(), [hidden], [shutter({ count: 0 })])).toBe("actionable");
  });

  it("respects the star-only exit rule", () => {
    expect(gateReadiness(gate(), [block({ star: true })], [])).toBe("latent");
    expect(gateReadiness(gate({ star: true }), [block({ star: true })], [])).toBe("actionable");
  });

  it("classifies a full gate set with one shared shutter snapshot", () => {
    const readiness = gateReadinessMap(
      [gate(), gate({ id: "red-right", side: "right", color: "red" }), gate({ id: "green-frozen", color: "green", frozen: 2 })],
      [block()],
      [],
    );
    expect(Object.fromEntries(readiness)).toEqual({
      "blue-top": "actionable",
      "red-right": "latent",
      "green-frozen": "frozen",
    });
  });
});
